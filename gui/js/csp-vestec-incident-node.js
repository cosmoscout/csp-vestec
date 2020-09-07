/* global CosmoScout, $, D3NE */

/**
 * Incident Node definition
 *
 * @typedef {Object} Node
 * @property {(Number|String)} id
 * @property {{
 *   incidentsLoaded: Boolean,
 *   incidentDatasetLoaded: Boolean,
 *   incidentSelect: HTMLSelectElement,
 *   incidentDatasetSelect: HTMLSelectElement,
 *   incidentSelectContainer: HTMLDivElement,
 *   incidentDatasetSelectContainer: HTMLDivElement,
 *
 *   info: HTMLDivElement,
 *
 *   loadedDataHash: String|null,
 *   currentMetadata: Object,
 *   activeOutputType: String|null,
 * }} data
 * @property {Function} addOutput
 * @property {Function} addInput
 * @property {Function} addControl
 */

class IncidentNode {
  /**
   * Supported output types
   *
   * @type {[string, string, string]}
   */
  static outputTypes = [
    'TEXTURES',
    'CINEMA_DB',
    'POINT_ARRAY',
  ];

  /**
   * Output type mappings
   * Key: Vestec dataset 'type' parameter from dataset metadata
   * Value: Type of output
   *
   * @type {{CINEMA_DB: string, POINT_ARRAY: string, "2D_FIRE": string}}
   */
  static typeMappings = {
    '2D_FIRE': IncidentNode.outputTypes[0],
    CINEMA_DB: IncidentNode.outputTypes[1],
    POINT_ARRAY: IncidentNode.outputTypes[2],
  }

  /**
   * Freezes outputTypes and mappings
   */
  constructor() {
    // IncidentNode.outputTypes = CosmoScout.vestecNE.sockets;

    Object.freeze(IncidentNode.outputTypes);
    // Object.freeze(IncidentNode.typeMappings);
  }

  /**
   * Builder method creating incident and dataset select
   *
   * @param {Node} node
   * @returns {Node}
   */
  builder(node) {
    const incidentControl = new D3NE.Control(
      `<select id="incident_node_select_${node.id}" class="combobox"></select>`,
      (element, control) => {
        $(element).selectpicker();

        control.putData('incidentSelect', element);
        control.putData('incidentSelectContainer', element.parentElement.parentElement);
        control.putData('incidentsLoaded', false);

        element.parentElement.parentElement.classList.add('hidden');

        element.addEventListener('change', (event) => {
          IncidentNode.unsetNodeValues(node);
          IncidentNode.showOutputType(node, 'none', true);

          node.data.incidentDatasetLoaded = IncidentNode.loadIncidentDatasets(
            node.data.incidentDatasetSelect,
            event.target.value,
          );
        });
      },
    );

    const incidentDatasetControl = new D3NE.Control(
      `<select id="incident_dataset_node_select_${node.id}" class="combobox"></select>`,
      (element, control) => {
        $(element).selectpicker();

        control.putData('incidentDatasetSelect', element);
        control.putData('incidentDatasetSelectContainer', element.parentElement.parentElement);
        control.putData('incidentDatasetLoaded', false);

        element.parentElement.parentElement.classList.add('hidden');

        element.addEventListener('change', () => {
          // Calls the worker and updates the outputs
          CosmoScout.vestecNE.updateEditor();
        });
      },
    );

    const loginMessageControl = new D3NE.Control(
      `<strong id="incident_node_message_${node.id}">Please login first</strong>`,
      (element, control) => {
        control.putData('info', element.parentElement);

        element.parentElement.classList.add('hidden');
      },
    );

    node.addControl(loginMessageControl);
    node.addControl(incidentControl);
    node.addControl(incidentDatasetControl);

    IncidentNode.addOutputs(node);

    node.data.firstWorkerRound = true;
    CosmoScout.vestecNE.updateEditor();

    return node;
  }

  /**
   * @param {Node} node
   * @param {Array} _inputs - Unused
   * @param {Array} outputs
   */
  async worker(node, _inputs, outputs) {
    // First worker round = node was just created
    // Hide all outputs until the type is determined
    if (node.data.firstWorkerRound) {
      IncidentNode.showOutputType(node, 'none', false);
      node.data.firstWorkerRound = false;
    }

    if (!CosmoScout.vestec.isAuthorized()) {
      IncidentNode.handleUnauthorized(node);

      return;
    }

    IncidentNode.handleAuthorized(node);

    if (!node.data.incidentsLoaded) {
      node.data.incidentsLoaded = await IncidentNode.loadIncidents(node.data.incidentSelect);
    }

    if (node.data.incidentsLoaded && !node.data.incidentDatasetLoaded) {
      node.data.incidentDatasetLoaded = await IncidentNode.loadIncidentDatasets(
        node.data.incidentDatasetSelect,
        node.data.incidentSelect.value,
      );
    }

    if (!node.data.incidentsLoaded || !node.data.incidentDatasetLoaded) {
      return;
    }

    const incidentId = node.data.incidentSelect.value;
    const datasetId = node.data.incidentDatasetSelect.value;

    if (incidentId.length === 0 || datasetId.length === 0) {
      return;
    }

    try {
      const metadata = await IncidentNode.loadIncidentDatasetMetadata(node, datasetId, incidentId);
      window.callNative('downloadDataSet', metadata.uuid, CosmoScout.vestec.getToken());
    } catch (e) {
      console.error(`Error loading metadata for dataset '${datasetId}'. Incident: '${incidentId}. Message: ${e}`);
      return;
    }

    const outputIndex = IncidentNode.outputTypes.indexOf(node.data.activeOutputType);

    // outputs[outputIndex] = node.data.currentMetadata;
    outputs[outputIndex] = [`../share/vestec/download/${node.data.currentMetadata.uuid}`];
  }

  /**
   * Component accessor
   *
   * @returns {D3NE.Component}
   * @throws {Error}
   */
  getComponent() {
    this._checkD3NE();

    return new D3NE.Component('IncidentNode', {
      builder: this.builder.bind(this),
      worker: this.worker.bind(this),
    });
  }

  /**
   * Check if D3NE is available
   *
   * @throws {Error}
   * @private
   */
  _checkD3NE() {
    if (typeof D3NE === 'undefined') {
      throw new Error('D3NE is not defined.');
    }
  }

  /**
   * Adds all defined outputTypes as outputs to the argument node
   * Output types need to be defined on the vestecNE instance
   *
   * @see {outputTypes}
   * @see {CosmoScout.vestecNE.sockets}
   * @param {Node} node - The node to add outputs to
   */
  static addOutputs(node) {
    IncidentNode.outputTypes.forEach((outputType) => {
      if (typeof CosmoScout.vestecNE.sockets[outputType] === 'undefined') {
        console.error(`Output type ${outputType} not found in CosmoScout.vestecNE.sockets`);
        return;
      }

      const name = outputType.charAt(0).toUpperCase() + outputType.toLowerCase().slice(1);

      const output = new D3NE.Output(name, CosmoScout.vestecNE.sockets[outputType]);

      node.data[outputType] = output;

      node.addOutput(output);
    });
  }

  /**
   * Maps a vestec dataset 'type' parameter to an output socket type
   * Socket types are loaded from CosmoScout.vestecNE.sockets
   *
   * @param {string} from Dataset 'type' parameter
   * @param {string} to Target socket type
   */
  static addTypeMapping(from, to) {
    if (typeof IncidentNode.outputTypes[to] === 'undefined') {
      console.error(`Output type ${to} does not exist on CosmoScout.vestecNE.sockets.`);
      return;
    }

    IncidentNode.typeMappings[from] = to;
  }

  /**
   * Shows all relevant controls if user is authorized
   *
   * @param {Node} node
   */
  static handleAuthorized(node) {
    node.data.incidentSelectContainer.classList.remove('hidden');
    node.data.incidentDatasetSelectContainer.classList.remove('hidden');
    node.data.info.classList.add('hidden');
  }

  /**
   * Hides all controls if user is unauthorized
   *
   * @param {Node} node
   */
  static handleUnauthorized(node) {
    node.data.incidentSelectContainer.classList.add('hidden');
    node.data.incidentDatasetSelectContainer.classList.add('hidden');
    node.data.info.classList.remove('hidden');

    node.data.incidentsLoaded = false;
    node.data.incidentDatasetLoaded = false;
    IncidentNode.unsetNodeValues(node);
    IncidentNode.showOutputType(node, 'none', true);
  }

  /**
   * Loads metadata for a given incident / dataset combination
   *
   * The current dataset / incident id combination is cached to remove unnecessary loading
   * @see {node.data.currentMetadata}
   *
   * @param {Node} node - Shows the relevant output for the dataset
   * @param {string} datasetId
   * @param {string} incidentId
   * @see {CosmoScout.vestec.getIncidentDatasetMetadata}
   * @return {Promise<T|{type: null}|undefined|null>}
   */
  static async loadIncidentDatasetMetadata(node, datasetId, incidentId) {
    if (incidentId === null
        || datasetId === null
        || incidentId.length === 0
        || datasetId.length === 0
    ) {
      throw Error('Required ids missing');
    }

    if (node.data.loadedDataHash === datasetId + incidentId) {
      return node.data.currentMetadata;
    }

    const metadata = await CosmoScout.vestec
      .getIncidentDatasetMetadata(datasetId, incidentId)
      .catch(() => ({
        type: null,
      }));

    if (typeof metadata.type !== 'undefined' && metadata.type !== null) {
      IncidentNode.showOutputType(node, IncidentNode.typeMappings[metadata.type], true);

      node.data.loadedDataHash = datasetId + incidentId;
      node.data.currentMetadata = metadata;

      return metadata;
    }

    throw Error('Metadata null');
  }

  /**
   * Load vestec incidents into the select control
   *
   * @param {HTMLSelectElement} element
   * @returns true on success
   */
  static async loadIncidents(element) {
    if (!CosmoScout.vestec.isAuthorized()) {
      console.warn('User not authorized, aborting.');
      return false;
    }

    const incidents = await CosmoScout.vestec.getIncidents();

    $(element).selectpicker('destroy');
    CosmoScout.gui.clearHtml(element);

    incidents.forEach((incident) => {
      const option = document.createElement('option');
      option.text = incident.name;
      option.value = incident.uuid;

      element.appendChild(option);
    });

    $(element).selectpicker();

    return true;
  }

  /**
   * Load vestec incidents into the select control
   *
   * @param {HTMLSelectElement} element
   * @param {string} id - Unique incident UUID
   * @returns true on success
   */
  static async loadIncidentDatasets(element, id) {
    if (!CosmoScout.vestec.isAuthorized()) {
      console.warn('User not authorized, aborting.');
      return false;
    }

    if (typeof id === 'undefined' || id.length === 0) {
      return false;
    }

    const datasets = await CosmoScout.vestec.getIncidentDatasets(id);

    $(element).selectpicker('destroy');
    CosmoScout.gui.clearHtml(element);

    datasets.forEach((dataset) => {
      const option = document.createElement('option');
      option.text = dataset.name;
      option.value = dataset.uuid;

      element.appendChild(option);
    });

    $(element).selectpicker();

    return true;
  }

  /**
   * Hides all outputs but the relevant one on the given node
   * If removeConnections is set to true all connections from this node to others are removed
   *
   * @see {outputTypes}
   * @see {typeMappings}
   *
   * @param {Node} node - The node to operate on
   * @param {string} outputType - Type of output (value from typeMappings)
   * @param {boolean} removeConnections - True to remove all active connections from/to this node
   */
  static showOutputType(node, outputType, removeConnections = true) {
    if (node.data.activeOutputType === outputType) {
      return;
    }

    let filter;

    if (outputType === 'none') {
      filter = () => true;
    } else {
      filter = (type) => type !== outputType
          && typeof node.data[outputType] !== 'undefined';
    }

    IncidentNode.outputTypes
      .filter(filter)
      .forEach((type) => {
        node.data[type].el.parentElement.classList.add('hidden');
      });

    if (removeConnections) {
      CosmoScout.vestecNE.removeConnections(node);
    }

    if (typeof node.data[outputType] !== 'undefined') {
      node.data[outputType].el.parentElement.classList.remove('hidden');

      node.data.activeOutputType = outputType;
    } else if (outputType !== 'none') {
      console.error(`Output type ${outputType} not recognized.`);
    }
  }

  /**
   * Unsets data that is used to cache the current state
   *
   * @param {Node} node
   */
  static unsetNodeValues(node) {
    node.data.activeOutputType = null;
    node.data.loadedDataHash = null;
    node.data.currentMetadata = null;
  }
}

(() => {
  const incidentNode = new IncidentNode();

  CosmoScout.vestecNE.addNode('IncidentNode', incidentNode.getComponent());
})();
