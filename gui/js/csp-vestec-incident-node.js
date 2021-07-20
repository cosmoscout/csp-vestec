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
 *   incidentButtonContainer: HTMLDivElement
 *
 *   info: HTMLDivElement,
 *
 *   incidentStartButton: HTMLButtonElement,
 *   incidentDeleteButton: HTMLButtonElement,
 *   incidentTestStageButton: HTMLButtonElement,
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
   * Key = Port type registered on the node editor
   * Value = name: Displayed name in the node
   *         mappings: Vestec dataset 'type' parameter from dataset metadata
   */
  static outputTypes = {
    'INCIDENT': {
      name: 'Incident',
      mappings: [],
    },
    'TEXTURES': {
      name: 'Texture(s)',
      mappings:
          [
            'TEXTURE',
            'DISEASES_TEXTURE',
            '2D_FIRE',
            'MOSQUITO MOSAIC OUTPUT',
            'MOSQUITO CONVERT OUTPUT',
          ],
    },
    'CINEMA_DB': {
      name: 'Cinema DB',
      mappings:
          [
            'CINEMA_DB_JSON',
          ],
    },
    'PATH': {
      name: 'File Path',
      mappings:
          [
            'CINEMA_DB_PATH',
            'MOSQUITO TOPOLOGICAL OUTPUT',
          ],
    },
    'POINT_ARRAY': {
      name: 'Point Array',
      mappings: [],
    },
  };

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
        `<div class="row">
<div class="col-10" style="max-width: 200px;"><select id="incident_dataset_node_select_${
            node.id}" class="combobox"></select></div></div>
`,
        (element, control) => {
          $(element).selectpicker();

          const container = element.parentElement;

          control.putData('incidentDatasetSelect',
              element.querySelector(`#incident_dataset_node_select_${node.id}`));
          control.putData('incidentInfo',
              element.querySelector(`#incident_node_${node.id}_dataset_created_date`));
          control.putData('incidentDatasetSelectContainer', container);
          control.putData('incidentDatasetLoaded', false);

          container.classList.add('hidden');

          element.addEventListener('change', (event) => {
            node.data.incidentDatasetSelectValue = event.target.value;

            const activeDataset =
                node.data.incidentDatasets.find(dataset => dataset.uuid === event.target.value);

            if (typeof activeDataset.date_created !== 'undefined') {
              $(`#incident_node_${node.id}_dataset_created_date`)
                  .tooltip({placement: 'top'})
                  .attr('data-original-title', activeDataset.date_created);
            }

            // Calls the worker and updates the outputs
            CosmoScout.vestecNE.updateEditor();
          });
        },
    );

    const incidentButtonControl = new D3NE.Control(
        `<div class="btn-group" style="flex-direction: column">
<button id="incident_node_${
            node.id}_incident_start_button" class="btn glass">Start Incident</button>
<button id="incident_node_${
            node.id}_incident_delete_button" class="btn glass">Delete Incident</button>
<button id="incident_node_${
            node.id}_incident_test_stage_button" class="btn glass">Start Test Stage</button>
</div>`,
        (element, control) => {
          const incidentStartButton =
              element.querySelector(`#incident_node_${node.id}_incident_start_button`);
          const incidentDeleteButton =
              element.querySelector(`#incident_node_${node.id}_incident_delete_button`);
          const incidentTestStageButton =
              element.querySelector(`#incident_node_${node.id}_incident_test_stage_button`);

          control.putData('incidentButtonContainer', element.parentElement);
          control.putData('incidentStartButton', incidentStartButton);
          control.putData('incidentDeleteButton', incidentDeleteButton);
          control.putData('incidentTestStageButton', incidentTestStageButton);

          element.parentElement.classList.add('hidden');

          incidentStartButton.classList.add('hidden');
          incidentDeleteButton.classList.add('hidden');
          incidentTestStageButton.classList.add('hidden');

          incidentStartButton.addEventListener('click', async () => {
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

          incidentDeleteButton.addEventListener('click', async () => {
            const deletionResponse =
                await CosmoScout.vestec.api.deleteIncident(node.data.activeIncident).catch(() => {
                  CosmoScout.notifications.print(
                      'Deletion failed', 'Could not delete Incident', 'error');
                });

            if (typeof deletionResponse === 'undefined') {
              return;
            }

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

          incidentTestStageButton.addEventListener('click', async () => {
            const testStageResponse =
                await CosmoScout.vestec.api.testIncident(node.data.activeIncident, node.data?.inputConfig[0] ?? {}).catch(() => {
          CosmoScout.notifications.print('Test failed', 'Could not run Test Stage', 'error');
                });

            if (testStageResponse.status !== 200) {
              CosmoScout.notifications.print('Test failed', 'Could not run Test Stage', 'error');
            } else {
              CosmoScout.notifications.print(
                  'Test started',
                  'Successfully started test stage.',
                  'done',
              );
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

    const configInput =
        new D3NE.Input('Test Stage Config', CosmoScout.vestecNE.sockets.INCIDENT_CONFIG);

    node.addControl(loginMessageControl);

    node.addControl(incidentControl);
    node.addControl(incidentStatusControl);
    node.addControl(incidentDatasetControl);
    node.addControl(incidentButtonControl);

    node.addInput(configInput);
    IncidentNode.addOutputs(node);

    node.data.firstWorkerRound = true;

    node.data['INCIDENT_CONFIG'] = configInput;

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
   * @param {Array} inputs - Config input
   * @param {Array} outputs - Texture / CinemaDB / PointArray
   */
  async worker(node, inputs, outputs) {
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

    if (typeof inputs[0] !== 'undefined') {
      node.data.inputConfig = inputs[0];
    } else {
      delete node.data.inputConfig;
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
    outputs[0] = node.data.activeIncident;

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

    /** Download and Extract should probably be in one function */
    window.callNative('incidentNode.downloadDataSet', metadata.uuid, CosmoScout.vestec.getToken());

    output = `${CosmoScout.vestec.downloadDir}/${node.data.currentMetadata.uuid}`;

    if (metadata.name.includes('.zip')) {
      // TODO: The TTK Reader requires that the db folder ends with .cdb, this hard code should be
      // removed
      const addCDB = metadata.type === 'MOSQUITO TOPOLOGICAL OUTPUT';

      window.callNative('incidentNode.extractDataSet', metadata.uuid, addCDB);
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

    case 'MOSQUITO TOPOLOGICAL OUTPUT':
      output = `${CosmoScout.vestec.downloadDir}/extracted/${node.data.currentMetadata.uuid}.cdb`;
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
    Object.entries(IncidentNode.outputTypes)
        .filter(output => output.length === 2)
        .forEach(output => {
          if (typeof CosmoScout.vestecNE.sockets[output[0]] === 'undefined') {
            console.error(`Output type ${output[0]} not found in CosmoScout.vestecNE.sockets`);
            return;
          }

          const outputDefinition =
              new D3NE.Output(output[1].name, CosmoScout.vestecNE.sockets[output[0]]);

          node.data[output[0]] = outputDefinition;

          node.addOutput(outputDefinition);
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

    IncidentNode.outputTypes[from.toUpperCase()].mappings.push(to.toUpperCase());
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

    node.data.incidentButtonContainer.classList.add('hidden');
    node.data.incidentStatusText.parentElement.classList.add('hidden');

    node.data.info.classList.remove('hidden');

    node.data.incidentsLoaded       = false;
    node.data.incidentDatasetLoaded = false;
    IncidentNode.unsetNodeValues(node);
    IncidentNode.showOutputType(node, 'none', true);

    node.data['INCIDENT'].el.parentElement.classList.add('hidden');
    node.data['INCIDENT_CONFIG'].el.parentElement.classList.add('hidden');
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
      IncidentNode.showOutputType(node, metadata.type.toUpperCase(), true);

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
      option.text  = `${dataset.name} - ${dataset.date_created}`;
      option.value = dataset.uuid;

      element.appendChild(option);
    });

    $(element).selectpicker();

    node.data.incidentDatasets           = datasets;
    node.data.incidentDatasetSelectValue = datasets[0].uuid;

    if (typeof datasets[0].date_created !== 'undefined') {
      $(`#incident_node_${node.id}_dataset_created_date`)
          .tooltip({placement: 'top'})
          .attr('data-original-title', datasets[0].date_created);
    }

    return true;
  }

  /**
   * Hides all outputs but the relevant one on the given node
   * If removeConnections is set to true all connections from this node to others are removed
   *
   * @see {outputTypes}
   *
   * @param {Node} node - The node to operate on
   * @param {string} outputType - Type of output, either outputType key or value from mappings
   * @param {boolean} removeConnections - True to remove all active connections from/to this node
   */
  static showOutputType(node, outputType, removeConnections = true) {
    if (outputType !== 'none') {
      outputType = Object.entries(IncidentNode.outputTypes).find(outputDefinition => {
              return outputType === outputDefinition[0] || (outputDefinition[1].mappings ?? []).includes(outputType);
      });

      if (typeof outputType !== 'undefined') {
        outputType = outputType[0];
      }
    }

    if (typeof outputType === 'undefined' || node.data.activeOutputType === outputType) {
      return;
    }

    // The filter function running on the entries of outputTypes
    // Idx 0 = Key, Idx 1 = object containing name, mappings
    let filter;

    if (outputType === 'none' || typeof outputType === 'undefined') {
      filter = () => true;
    } else {
      filter = (type) => (type !== outputType && typeof node.data[outputType] !== 'undefined');
    }

    Object.keys(IncidentNode.outputTypes)
        .filter(filter)
        .filter(outputDefinition => outputDefinition !== 'INCIDENT')
        .forEach((outputDefinition) => {
          node.data[outputDefinition].el.parentElement.classList.add('hidden');
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

    if (typeof activeIncident.test_workflow !== 'undefined' &&
        activeIncident.test_workflow === true) {
      node.data.incidentButtonContainer.classList.remove('hidden');
      node.data.incidentTestStageButton.classList.remove('hidden');

      node.data['INCIDENT_CONFIG'].el.parentElement.classList.remove('hidden')
    } else {
      node.data.incidentTestStageButton.classList.add('hidden');
      node.data.incidentButtonContainer.classList.add('hidden');

      node.data['INCIDENT_CONFIG'].el.parentElement.classList.add('hidden')
    }

    node.data.incidentStatusText.parentElement.classList.remove('hidden');

    switch (activeIncident.status) {
    case 'ACTIVE':
      node.data.incidentStatusText.innerText = 'Incident Active';
      node.data.incidentButtonContainer.classList.remove('hidden');

      node.data.incidentStartButton.classList.add('hidden');
      node.data.incidentDeleteButton.classList.remove('hidden');
      break;

    case 'PENDING':
      node.data.incidentStatusText.innerText = 'Incident Pending';

      node.data.incidentButtonContainer.classList.remove('hidden');

      node.data.incidentStartButton.classList.remove('hidden');
      node.data.incidentDeleteButton.classList.remove('hidden');
      break;

    case 'COMPLETED':
      node.data.incidentStatusText.innerText = 'Incident Completed';
      // No break in order to fallthrough to default

    default:
      node.data.incidentButtonContainer.classList.add('hidden');

      node.data.incidentDeleteButton.classList.add('hidden');
      node.data.incidentStartButton.classList.add('hidden');
      break;
    }
  }
}

(() => {
  const incidentNode = new IncidentNode();

  CosmoScout.vestecNE.addNode('IncidentNode', incidentNode.getComponent());
})();
