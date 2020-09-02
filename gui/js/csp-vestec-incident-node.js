/* global CosmoScout, $, D3NE */

class IncidentNode {
  static outputTypes = [
    'TEXTURES',
    'CINEMA_DB',
    'POINT_ARRAY',
  ];

  static typeMappings = {
    '2D_FIRE': IncidentNode.outputTypes[0],
    CINEMA_DB: IncidentNode.outputTypes[1],
    POINT_ARRAY: IncidentNode.outputTypes[2],
  }

  constructor() {
    Object.freeze(IncidentNode.outputTypes);
    Object.freeze(IncidentNode.typeMappings);
  }

  /**
   * @param node {{data: {}, addControl: Function, addOutput: Function, addInput: Function, id: number|string}}
   * @returns {*}
   */
  builder(node) {
    const textureOutput = new D3NE.Output('Texture', CosmoScout.vestecNE.sockets.TEXTURES);
    const cinemaDBOutput = new D3NE.Output('Cinema DB', CosmoScout.vestecNE.sockets.CINEMA_DB);
    const pointsOutput = new D3NE.Output('Points', CosmoScout.vestecNE.sockets.POINT_ARRAY);

    node.data.TEXTURES = textureOutput;
    node.data.CINEMA_DB = cinemaDBOutput;
    node.data.POINT_ARRAY = pointsOutput;

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

    node.addOutput(textureOutput);
    node.addOutput(cinemaDBOutput);
    node.addOutput(pointsOutput);

    node.data.firstWorkerRound = true;
    CosmoScout.vestecNE.updateEditor();

    return node;
  }

  static handleUnauthorized(node) {
    node.data.incidentSelectContainer.classList.add('hidden');
    node.data.incidentDatasetSelectContainer.classList.add('hidden');
    node.data.info.classList.remove('hidden');

    node.data.incidentsLoaded = false;
    node.data.incidentDatasetLoaded = false;
    IncidentNode.unsetNodeValues(node);
  }

  static handleAuthorized(node) {
    node.data.incidentSelectContainer.classList.remove('hidden');
    node.data.incidentDatasetSelectContainer.classList.remove('hidden');
    node.data.info.classList.add('hidden');
  }

  /**
   * @param node
   * @param _inputs
   * @param outputs
   */
  async worker(node, _inputs, outputs) {
    if (node.data.firstWorkerRound) {
      node.data.firstWorkerRound = false;
      IncidentNode.showOutputType(node, 'none', false);
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

    if (node.data.incidentsLoaded && node.data.incidentDatasetLoaded) {
      const incidentId = node.data.incidentSelect.value;
      const datasetId = node.data.incidentDatasetSelect.value;

      if (incidentId.length === 0 || datasetId.length === 0) {
        return;
      }

      const metadata = await IncidentNode.loadIncidentDatasetMetadata(node, datasetId, incidentId);

      node.data.loadedDataHash = datasetId + incidentId;
      node.data.currentMetadata = metadata;
    }

    /*    if (typeof node.data.incidentSelect !== 'undefined') {
      outputs[0] = {
        incidentId: node.data.incidentSelect.value,
        datasetId: node.data.incidentDatasetSelect.value.length > 0
          ? node.data.incidentDatasetSelect.value
          : undefined,
      };
    } */
  }

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

      return metadata;
    }

    throw Error('Metadata null');
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
   * Load vestec incidents into the select control
   *
   * @param element {HTMLSelectElement}
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
   * @param element {HTMLSelectElement}
   * @param id {string} Unique incident UUID
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

    CosmoScout.vestecNE.updateEditor(); // Fucking hack

    return true;
  }

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

  static unsetNodeValues(node) {
    node.data.activeOutputType = null;
    node.data.loadedDataHash = null;
    node.data.currentMetadata = null;
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
}

(() => {
  const incidentNode = new IncidentNode();

  CosmoScout.vestecNE.addNode('IncidentNode', incidentNode.getComponent());
})();
