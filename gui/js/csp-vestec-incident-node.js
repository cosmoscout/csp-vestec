/* global CosmoScout, $, D3NE */

/**
 * Incident Node definition
 *
 * @typedef {Object} Node
 * @property {(number|string)} id
 * @property {{
 *   incidentsLoaded: boolean,
 *   incidentDatasetLoaded: boolean,
 *   incidentSelect: HTMLSelectElement,
 *   incidentDatasetSelect: HTMLSelectElement,
 *   incidentSelectContainer: HTMLDivElement,
 *   incidentDatasetSelectContainer: HTMLDivElement,
 *   incidentDatasetSelectValue: string,
 *
 *   info: HTMLDivElement,
 *
 *   incidentStartButton: HTMLButtonElement,
 *   incidentDeleteButton: HTMLButtonElement,
 *   incidentStatusText: HTMLSpanElement,
 *
 *   loadedDataHash: string|null,
 *   currentMetadata: Object,
 *   activeOutputType: string|null,
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
    'INCIDENT',
    'TEXTURES',
    'CINEMA_DB',
    'PATH',
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
    TEXTURE: IncidentNode.outputTypes[1],
    '2D_FIRE': IncidentNode.outputTypes[1],
    DISEASES_TEXTURE: IncidentNode.outputTypes[1],
    CINEMA_DB: IncidentNode.outputTypes[2],
    CINEMA_DB_JSON: IncidentNode.outputTypes[2],
    CINEMA_DB_PATH: IncidentNode.outputTypes[3],
    PATH: IncidentNode.outputTypes[3],
    POINT_ARRAY: IncidentNode.outputTypes[4],
  }

  /**
   * Freezes outputTypes and mappings
   */
  constructor() {
    Object.freeze(IncidentNode.outputTypes);
  }

  /**
   * Builder method creating incident and dataset select
   *
   * @param {Node} node
   * @returns {Node}
   */
  builder(node) {
    // Dropdown for selecting different incidents
    const incidentControl = new D3NE.Control(
        `<select id="incident_node_select_${node.id}" class="combobox"></select>`,
        (element, control) => {
          $(element).selectpicker();

          control.putData('incidentSelect', element);
          control.putData('incidentSelectContainer', element.parentElement.parentElement);
          control.putData('incidentsLoaded', false);

          element.parentElement.parentElement.classList.add('hidden');

          element.addEventListener('change', async (event) => {
            IncidentNode.unsetNodeValues(node);
            IncidentNode.showOutputType(node, 'none', true);
            node.data.activeIncident = event.target.value;
            IncidentNode.updateControlVisibility(node);

            node.data.incidentDatasetLoaded = await IncidentNode.loadIncidentDatasets(
                node.data.incidentDatasetSelect,
                event.target.value,
                node,
            );

            // Displays output type
            CosmoScout.vestecNE.updateEditor();
          });
        },
    );

    // Dropdown for selecting different datasets on the active incident
    const incidentDatasetControl = new D3NE.Control(
        `<select id="incident_dataset_node_select_${node.id}" class="combobox"></select>`,
        (element, control) => {
          $(element).selectpicker();

          control.putData('incidentDatasetSelect', element);
          control.putData('incidentDatasetSelectContainer', element.parentElement.parentElement);
          control.putData('incidentDatasetLoaded', false);

          element.parentElement.parentElement.classList.add('hidden');

          element.addEventListener('change', (event) => {
            node.data.incidentDatasetSelectValue = event.target.value;
            // Calls the worker and updates the outputs
            CosmoScout.vestecNE.updateEditor();
          });
        },
    );

    // Button to activate an incident
    const startIncidentControl = new D3NE.Control(
        `<button id="incident_node_${
            node.id}_incident_start_button" class="btn glass">Start Incident</button>`,
        (element, control) => {
          control.putData('incidentStartButton', element);
          element.parentElement.classList.add('hidden');

          element.addEventListener('click', async () => {
            const activationResponse =
                await CosmoScout.vestec.api.activateIncident(node.data.activeIncident).catch(() => {
                  CosmoScout.notifications.print(
                      'Activation failed', 'Could not activate Incident', 'error');
                });

            if (activationResponse.status !== 200) {
              CosmoScout.notifications.print(
                  'Activation failed', 'Could not activate Incident', 'error');
            } else {
              CosmoScout.notifications.print(
                  'Incident activated',
                  'Successfully activated incident.',
                  'done',
              );

              node.data.incidents.find(incident => incident.uuid === node.data.activeIncident)
                  .status = 'ACTIVE';
              IncidentNode.updateControlVisibility(node);
            }
          });
        });

    // Button to delete an active incident
    const deleteIncidentControl = new D3NE.Control(
        `<button id="incident_node_${
            node.id}_incident_delete_button" class="btn glass">Delete Incident</button>`,
        (element, control) => {
          control.putData('incidentDeleteButton', element);
          element.parentElement.classList.add('hidden');

          element.addEventListener('click', async () => {
            const deletionResponse =
                await CosmoScout.vestec.api.deleteIncident(node.data.activeIncident).catch(() => {
                  CosmoScout.notifications.print(
                      'Deletion failed', 'Could not delete Incident', 'error');
                });

            if (typeof deletionResponse === 'undefined') {
              return;
            }

            // TODO as of 25.05.2021 deletion does not work, possible upstream bug
            if (deletionResponse.status !== 200) {
              CosmoScout.notifications.print(
                  'Deletion failed', 'Could not delete Incident', 'error');
            } else {
              CosmoScout.notifications.print(
                  'Incident deleted',
                  'Successfully deleted incident.',
                  'done',
              );

              IncidentNode.loadIncidents(node.data.incidentSelect, node);
            }
          });
        });

    // Status text displaying the incident state, e.g. active, pending, etc.
    const incidentStatusControl =
        new D3NE.Control(`<span id="incident_node_${node.id}_incident_status" class="text"></span>`,
            (element, control) => {
              control.putData('incidentStatusText', element);
              element.parentElement.classList.add('hidden');
            });

    // Element is shown if the user is not logged in
    const loginMessageControl = new D3NE.Control(
        `<strong class="btn glass" id="incident_node_message_${
            node.id}" style="cursor: pointer">Login to Vestec</strong>`,
        (element, control) => {
          control.putData('info', element.parentElement);

          element.parentElement.classList.add('hidden');

          element.addEventListener('click', () => {
            // Show Sidebar
            $('#collapse-sidebar-tab-VESTEC').collapse('show');
            document.getElementById('csp-vestec-username').focus();
          });
        },
    );

    node.addControl(loginMessageControl);

    node.addControl(incidentControl);
    node.addControl(incidentStatusControl);
    node.addControl(incidentDatasetControl);
    node.addControl(startIncidentControl);
    node.addControl(deleteIncidentControl);

    IncidentNode.addOutputs(node);

    node.data.firstWorkerRound = true;
    CosmoScout.vestecNE.updateEditor();

    // Listens to node removals, to clear the update interval
    CosmoScout.vestecNE.editor.eventListener.on('noderemove', (node, _) => {
      if (typeof node.data.updateIntervalId !== 'undefined' && node.title === 'IncidentNode') {
        clearInterval(node.data.updateIntervalId);
      }
    });

    node.data.updateIntervalId = setInterval(this._updateNode, 5000, node);

    return node;
  }

  /**
   * @param {Node} node
   * @param {Array} _inputs - Unused
   * @param {Array} outputs - Texture / CinemaDB / PointArray
   */
  async worker(node, _inputs, outputs) {
    // First worker round = node was just created
    // Hide all outputs until the type is determined
    if (node.data.firstWorkerRound) {
      IncidentNode.showOutputType(node, 'none', false);
      node.data.firstWorkerRound = false;
    }

    // Hide all controls if the user logs out
    if (!CosmoScout.vestec.isAuthorized()) {
      IncidentNode.handleUnauthorized(node);

      return;
    }

    IncidentNode.handleAuthorized(node);
    IncidentNode.updateControlVisibility(node);

    node.data.incidentsLoaded = await IncidentNode.loadIncidents(node.data.incidentSelect, node);

    const incidentId = node.data.incidentSelect.value;

    if (node.data.incidentsLoaded) {
      node.data.incidentDatasetLoaded = await IncidentNode.loadIncidentDatasets(
          node.data.incidentDatasetSelect,
          node.data.incidentSelect.value,
          node,
      );
    }

    if (!node.data.incidentsLoaded || !node.data.incidentDatasetLoaded) {
      return;
    }

    const datasetId = node.data.incidentDatasetSelectValue ?? null;

    // Clear data
    outputs.forEach((value, index) => {
      delete outputs[index];
    });

    // 0 = Incident output
    outputs[IncidentNode.outputTypes.indexOf('INCIDENT')] = node.data.activeIncident;

    if (incidentId.length === 0 || ( datasetId.length ?? '' ) === 0) {
      return;
    }

    let output;

    try {
      output = await this._makeOutputForMetadata(node, datasetId, incidentId);
    } catch (e) {
      console.error(`Error loading metadata for dataset '${datasetId}'. Incident: '${
          incidentId}. Message: ${e}`);
      return;
    }

    const outputIndex = IncidentNode.outputTypes.indexOf(node.data.activeOutputType);

    outputs[outputIndex] = output;
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
   * This runs on a 5 second interval
   * Checks for new Incidents and incident datasets
   *
   * @param {Node} node
   * @private
   */
  _updateNode(node) {
    if (!CosmoScout.vestec.isAuthorized()) {
      return;
    }

    IncidentNode.loadIncidents(node.data.incidentSelect, node).then(incidentsLoaded => {
      IncidentNode.updateControlVisibility(node);

      node.data.incidentsLoaded = incidentsLoaded;

      if (node.data.incidentSelect.value !== node.data.activeIncident) {
        IncidentNode
            .loadIncidentDatasets(
                node.data.incidentDatasetSelect,
                node.data.incidentSelect.value,
                node,
                )
            .then(datasetsLoaded => {
              node.data.incidentDatasetLoaded = datasetsLoaded;
            });
      }
    });
  }

  /**
   * Creates the output object based on the active dataset type
   *
   * @param node
   * @param datasetId
   * @param incidentId
   * @returns {Promise<{timeStep: *, caseName: *, uuid}|string|undefined>}
   * @throws {}
   * @private
   */
  async _makeOutputForMetadata(node, datasetId, incidentId) {
    let                    output;
    const metadata = await IncidentNode.loadIncidentDatasetMetadata(node, datasetId, incidentId);

    (async () => {
      window.callNative(
          'incidentNode.downloadDataSet', metadata.uuid, CosmoScout.vestec.getToken());
    })();

    output = `${CosmoScout.vestec.downloadDir}/${node.data.currentMetadata.uuid}`;

    if (metadata.name.includes('.zip')) {
      window.callNative('incidentNode.extractDataSet', metadata.uuid);
    }

    metadata.type = metadata.type.toUpperCase();

    switch (metadata.type) {
    case 'CINEMA_DB_JSON': {
      const [caseName, timeStep] = metadata.name.replace('.zip', '').split('_');

      output = {
        caseName,
        timeStep,
        uuid: datasetId,
      };
      break;
    }

    case 'PATH':
    case 'CINEMA_DB':
      output = `${CosmoScout.vestec.downloadDir}/extracted/${node.data.currentMetadata.uuid}/${
          metadata.name.replace('.zip', '')}`;
      break;

    default:
      break;
    }

    return output;
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

    node.data['INCIDENT'].el.parentElement.classList.remove('hidden');
  }

  /**
   * Hides all controls if user is unauthorized
   *
   * @param {Node} node
   */
  static handleUnauthorized(node) {
    node.data.incidentSelectContainer.classList.add('hidden');
    node.data.incidentDatasetSelectContainer.classList.add('hidden');
    node.data.incidentStartButton.classList.add('hidden');
    node.data.incidentDeleteButton.classList.add('hidden');
    node.data.incidentStatusText.classList.add('hidden');

    node.data.info.classList.remove('hidden');

    node.data.incidentsLoaded       = false;
    node.data.incidentDatasetLoaded = false;
    IncidentNode.unsetNodeValues(node);
    IncidentNode.showOutputType(node, 'none', true);

    node.data['INCIDENT'].el.parentElement.classList.add('hidden');
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
   * @return {Promise<T|{type: null|string}|undefined|null>}
   */
  static async loadIncidentDatasetMetadata(node, datasetId, incidentId) {
    if (incidentId === null || datasetId === null || incidentId.length === 0 ||
        datasetId.length === 0) {
      throw Error('Required ids missing');
    }

    if (node.data.loadedDataHash !== null && node.data.loadedDataHash === datasetId + incidentId) {
      return node.data.currentMetadata;
    }

    const metadata =
        await CosmoScout.vestec.getIncidentDatasetMetadata(datasetId, incidentId).catch(() => ({
          type: null,
        }));

    if (typeof metadata.type !== 'undefined' && metadata.type !== null) {
      IncidentNode.showOutputType(
          node, IncidentNode.typeMappings[metadata.type.toUpperCase()], true);

      node.data.loadedDataHash  = datasetId + incidentId;
      node.data.currentMetadata = metadata;

      return metadata;
    }

    throw Error('Metadata null');
  }

  /**
   * Load vestec incidents into the select control
   *
   * @param {HTMLSelectElement} element
   * @param {Node} node
   * @returns true on success
   */
  static async loadIncidents(element, node) {
    if (!CosmoScout.vestec.isAuthorized()) {
      console.warn('User not authorized, aborting.');
      return false;
    }

    const incidents = await CosmoScout.vestec.getIncidents();

    if (incidents.length === 0) {
      return false;
    }

    // Don't clear dropdown if incident count didn't change
    if (typeof node.data.incidents !== 'undefined') {
      const oldLen        = node.data.incidents.length;
      node.data.incidents = incidents;

      if (oldLen === incidents.length) {
        return true;
      }

      IncidentNode.unsetNodeValues(node);
    }

    node.data.incidents      = incidents;
    node.data.activeIncident = incidents[0].uuid;

    $(element).selectpicker('destroy');
    CosmoScout.gui.clearHtml(element);

    incidents.forEach((incident) => {
      const option = document.createElement('option');
      option.text  = incident.name;
      option.value = incident.uuid;

      element.appendChild(option);
    });

    $(element).selectpicker();

    IncidentNode.updateControlVisibility(node);

    return true;
  }

  /**
   * Load vestec incidents into the select control
   *
   * @param {HTMLSelectElement} element
   * @param {string} id - Unique incident UUID
   * @param {Node} node
   * @returns true on success
   */
  static async loadIncidentDatasets(element, id, node) {
    if (!CosmoScout.vestec.isAuthorized()) {
      console.warn('User not authorized, aborting.');
      return false;
    }

    if (typeof id === 'undefined' || id.length === 0) {
      return false;
    }

    const datasets = await CosmoScout.vestec.getIncidentDatasets(id);

    // Don't load if incidents are the same
    if (typeof node.data.incidentDatasets !== 'undefined' &&
        node.data.incidentDatasets.length === datasets.length) {
      return true;
    }

    IncidentNode.unsetNodeValues(node);

    $(element).selectpicker('destroy');
    CosmoScout.gui.clearHtml(element);

    datasets.forEach((dataset) => {
      const option = document.createElement('option');
      option.text  = dataset.name;
      option.value = dataset.uuid;

      element.appendChild(option);
    });

    $(element).selectpicker();

    node.data.incidentDatasets           = datasets;
    node.data.incidentDatasetSelectValue = datasets[0].uuid;

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

    if (outputType === 'none' || typeof outputType === 'undefined') {
      filter = () => true;
    } else {
      filter = (type) => (type !== outputType && typeof node.data[outputType] !== 'undefined');
    }

    IncidentNode.outputTypes.filter(filter).filter(type => type !== 'INCIDENT').forEach((type) => {
      node.data[type].el.parentElement.classList.add('hidden');
    });

    if (removeConnections) {
      CosmoScout.vestecNE.removeConnections(node);
    }

    if (typeof node.data[outputType] !== 'undefined') {
      node.data[outputType].el.parentElement.classList.remove('hidden');

      if (outputType !== 'INCIDENT') {
        node.data.activeOutputType = outputType;
      }
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
    node.data.activeOutputType           = null;
    node.data.loadedDataHash             = null;
    node.data.currentMetadata            = null;
    node.data.incidentDatasetSelectValue = '';
    node.data.incidentDatasets           = [];
    node.data.incidentDatasetLoaded      = false;

    $(node.data.incidentDatasetSelect).selectpicker('destroy');
    CosmoScout.gui.clearHtml(node.data.incidentDatasetSelect);
    $(node.data.incidentDatasetSelect).selectpicker();
  }

  /**
   * Shows / Hides the status text and Activate / Delete buttons
   *
   * @param {Node} node
   */
  static updateControlVisibility(node) {
    if (typeof node.data.incidents === 'undefined') {
      return;
    }

    const activeIncident =
        node.data.incidents.find(incident => incident.uuid === node.data.activeIncident);

    if (typeof activeIncident === 'undefined') {
      return;
    }

    node.data.incidentStatusText.parentElement.classList.remove('hidden');

    switch (activeIncident.status) {
    case 'ACTIVE':
      node.data.incidentStatusText.innerText = 'Incident Active';
      node.data.incidentStartButton.parentElement.classList.add('hidden');
      node.data.incidentDeleteButton.parentElement.classList.remove('hidden');
      break;

    case 'PENDING':
      node.data.incidentStatusText.innerText = 'Incident Pending';
      node.data.incidentStartButton.parentElement.classList.remove('hidden');
      break;

    case 'COMPLETED':
      node.data.incidentStatusText.innerText = 'Incident Completed';
      // No break in order to fallthrough to default

    default:
      node.data.incidentDeleteButton.parentElement.classList.add('hidden');
      node.data.incidentStartButton.parentElement.classList.add('hidden');
      break;
    }
  }
}

(() => {
  const incidentNode = new IncidentNode();

  CosmoScout.vestecNE.addNode('IncidentNode', incidentNode.getComponent());
})();
