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
 *
 *   activeIncident: string,
 *   activeIncidentDatasets: string[],
 *
 *   datasets: Array,
 *   incidentDatasets: Array,
 *
 *   incidentButtonContainer: HTMLDivElement
 *
 *   info: HTMLDivElement,
 *
 *   incidentStartButton: HTMLButtonElement,
 *   incidentDeleteButton: HTMLButtonElement,
 *   incidentTestStageButton: HTMLButtonElement,
 *   incidentTestStageStatusText: HTMLSpanElement,
 *
 *   loadedDataHashes: string[],
 *   currentMetadata: Object[],
 *   activeOutputTypes: string[],
 *
 *   testStageConfig: Object,
 *
 *   fn: {
 *       addOutputs: Function,
 *       clearOutputs: Function,
 *       getOutputs: Function,
 *   }
 * }} data
 * @property {Function} addOutput
 * @property {Function} addInput
 * @property {Function} addControl
 * @property {Array} outputs
 */

class IncidentNode {
  /**
   * Supported output types
   *
   * Key = Port type registered on the node editor
   * Value = name: Displayed name in the node
   *         mappings: Vestec dataset 'type' parameter from dataset metadata
   *         root: Object key for easier access
   *         index: Output Index
   */
  static outputTypes = {
    'INCIDENT': {
      name: 'Incident',
      root: 'INCIDENT',
      mappings: [],
      index: 0,
    },
    'TEXTURES': {
      name: 'Texture(s)',
      root: 'TEXTURES',
      mappings:
          [
            'TEXTURE',
            'DISEASES_TEXTURE',
            '2D_FIRE',
            'MOSQUITO MOSAIC OUTPUT',
            'MOSQUITO CONVERT OUTPUT',
          ],
      index: 1,
    },
    'CINEMA_DB': {
      name: 'Cinema DB',
      root: 'CINEMA_DB',
      mappings:
          [
            'CINEMA_DB_JSON',
          ],
      index: 2,
    },
    'PATH': {
      name: 'File Path',
      root: 'PATH',
      mappings:
          [
            'CINEMA_DB_PATH',
            'MOSQUITO TOPOLOGICAL OUTPUT',
          ],
      index: 3,
    },
    'POINT_ARRAY': {
      name: 'Point Array',
      root: 'POINT_ARRAY',
      mappings: [],
      index: 4,
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

          element.parentElement.style.maxWidth = '220px';

          control.putData('incidentSelect', element);
          control.putData('incidentSelectContainer', element.parentElement.parentElement);
          control.putData('incidentsLoaded', false);

          element.parentElement.parentElement.classList.add('hidden');

          element.addEventListener('change', async (event) => {
            if (node.data.activeIncident === event.target.value) {
              return;
            }

            clearInterval(node.data.simulationUpdateInterval);

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
        `<div><select id="incident_dataset_node_select_${
            node.id}" class="combobox" multiple></select></div>`,
        (element, control) => {
          const select = element.querySelector(`#incident_dataset_node_select_${node.id}`);
          $(select).selectpicker();

          const container          = element.parentElement;
          container.style.maxWidth = '220px';

          control.putData('incidentDatasetSelect', select);
          control.putData('incidentDatasetSelectContainer', container);
          control.putData('incidentDatasetLoaded', false);

          container.classList.add('hidden');

          element.addEventListener('change', (event) => {
            const selectedEntries =
                Array.from(event.target.selectedOptions).map(option => option.value);

            // oof.
            if (JSON.stringify(node.data.activeIncidentDatasets) ===
                JSON.stringify(selectedEntries)) {
              return;
            }

            node.data.activeIncidentDatasets = selectedEntries;

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
                await CosmoScout.vestec.api.testIncident(node.data.activeIncident, node.data?.testStageConfig[0] ?? {}).catch(() => {
          CosmoScout.notifications.print('Test failed', 'Could not run Test Stage', 'error');
                });

            if (testStageResponse.status !== 200) {
              CosmoScout.notifications.print('Test failed', 'Could not run Test Stage', 'error');
            } else {
              clearInterval(node.data.simulationUpdateInterval);
              node.data.simulationUpdateInterval =
                  setInterval(this._checkSimulationStatus, 5000, node)

              CosmoScout.notifications.print(
                  'Test started',
                  'Successfully started test stage.',
                  'done',
              );
            }
          });
        });

    // Test Stage Status text
    const incidentTestStageStatusControl = new D3NE.Control(
        `<span id="incident_node_${node.id}_test_stage_status" class="text"></span>`,
        (element, control) => {
          control.putData('incidentTestStageStatusText', element);
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
    node.addControl(incidentDatasetControl);
    node.addControl(incidentButtonControl);
    node.addControl(incidentTestStageStatusControl);

    node.addInput(configInput);
    IncidentNode.addOutputs(node);
    // Initialize variables
    IncidentNode.unsetNodeValues(node);

    node.data.firstWorkerRound         = true;
    node.data['INCIDENT_CONFIG']       = configInput;
    node.data.updateIntervalId         = setInterval(this._updateNode, 5000, node);
    node.data.simulationUpdateInterval = null;

    node.data.fn = {};

    /**
     *
     * @param metadata
     */
    node.data.fn.addOutputs = metadata => {
      const added = node.outputs.filter(output => typeof output.hash !== 'undefined')
                        .map(output => output.hash);

      metadata.filter(dataset => !added.includes(dataset.hash)).forEach(dataset => {
        const definition = IncidentNode.getOutputDefinitionForType(dataset.type);

        const output = new D3NE.Output(
            `${dataset.name} - ${definition.name}`,
            CosmoScout.vestecNE.sockets[definition.root],
        );
        output.hash = dataset.hash;

        node.addOutput(output);
      });
    };

    /**
     * Removes unused outputs
     *
     * @param {String[]|undefined} activeHashes
     * @returns {boolean} True if outputs where removed
     */
    node.data.fn.clearOutputs = activeHashes => {
      if (typeof activeHashes === 'undefined') {
        activeHashes = [];
      }

      let outputsToRemove = [];
      node.outputs.forEach((output, idx) => {
        if (typeof output.hash !== 'undefined' && !activeHashes.includes(output.hash)) {
          outputsToRemove.push(idx);
        }
      });

      outputsToRemove      = outputsToRemove.sort();
      const outputsRemoved = outputsToRemove.length > 0;

      while (outputsToRemove.length) {
        const output = node.outputs.splice(outputsToRemove.pop(), 1);

        output.pop().connections.forEach(connection => {
          CosmoScout.vestecNE.editor.removeConnection(connection);
        });
      }

      // -> True = Outputs cleared
      return outputsRemoved;
    };

    /**
     *
     * @returns {Array}
     */
    node.data.fn.getOutputs = () => {
      return node.outputs;
    };

    CosmoScout.vestecNE.updateEditor();

    // Listens to node removals, to clear the update interval
    CosmoScout.vestecNE.editor.eventListener.on('noderemove', (node, _) => {
      if (typeof node.data.updateIntervalId !== 'undefined' && node.title === 'IncidentNode') {
        clearInterval(node.data.updateIntervalId);
      }
    });

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

    // Hide all controls if the user isn't authorized
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
      node.data.testStageConfig = inputs[0];
    } else {
      delete node.data.testStageConfig;
    }

    if (!node.data.incidentsLoaded || !node.data.incidentDatasetLoaded) {
      return;
    }

    const datasetIds = node.data.activeIncidentDatasets ?? [];

    // Clear output data
    outputs.forEach((_, index) => {
      delete outputs[index];
    });

    // 0 = Incident output
    outputs[0] = node.data.activeIncident;

    if (incidentId.length === 0) {
      return;
    }

    let output;

    try {
      output = await this._makeOutputData(node, datasetIds, incidentId);

      const activeDatasets =
          Object.values(node.data.currentMetadata)
              .filter(dataset => node.data.activeIncidentDatasets.includes(dataset.uuid));

      IncidentNode.showOutputType(node, activeDatasets);
    } catch (e) {
      console.error(`Error loading metadata for dataset '${
          JSON.stringify(datasetIds)}'. Incident: '${incidentId}. Message: ${e}`);
      console.error(e);
      return;
    }

    node.data.fn.getOutputs().forEach((out, idx) => {
      if (typeof out.hash !== 'undefined' && typeof output[out.hash] !== 'undefined') {
        outputs[idx] = output[out.hash];
      }
    });
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
                node.data.activeIncident,
                node,
                )
            .then(datasetsLoaded => {
              node.data.incidentDatasetLoaded = datasetsLoaded;
            });
      }
    });
  }

  /**
   * This runs on a 5 second interval after the "Start Test Stage" button was clicked
   * Checks the status of the latest simulation process
   *
   * @param {Node} node
   * @private
   */
  async _checkSimulationStatus(node) {
    if (!CosmoScout.vestec.isAuthorized()) {
      return;
    }

    // Only check simulations from the last 15 minutes
    const includeMinutes = 60;
    const includeDate    = new Date(Date.now() - (1000 * 60 * includeMinutes));

    const activeIncident = await CosmoScout.vestec.getIncident(node.data.activeIncident);

    // Because dates are fun...
    const parseDate =
        (date) => {
          let datePart, timePart;

          [datePart, timePart] = date.split(', ');
          const dateParts      = datePart.split('/');

          // Creates a ISO8601 Date Time String
          const parsedDate =
              new Date(Date.parse(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T${timePart}`));

          // GMT+2
          parsedDate.setHours(parsedDate.getHours() + 2);

          return parsedDate;
        }

    const currentSimulations = activeIncident.simulations
                                   .filter(simulation => {
                                     return (parseDate(simulation.created) - includeDate) >= 0;
                                   })
                                   .sort((a, b) => {
                                     // So the latest timestamp is first
                                     return parseDate(b.created) - parseDate(a.created);
                                   });

    if (currentSimulations.length > 0) {
      const statusText = document.createTextNode(`Test Stage: ${currentSimulations[0].status}`);
      node.data.incidentTestStageStatusText.parentElement.classList.remove('hidden');

      const spinner = document.createElement('i');
      spinner.classList.add('material-icons');
      spinner.innerText = 'autorenew';

      CosmoScout.gui.clearHtml(node.data.incidentTestStageStatusText);
      node.data.incidentTestStageStatusText.appendChild(statusText)
      node.data.incidentTestStageStatusText.appendChild(spinner)

      if (currentSimulations[0].status !== 'COMPLETED') {
        console.log(statusText);
      }
    } else {
      node.data.incidentTestStageStatusText.parentElement.classList.add('hidden');
      node.data.incidentTestStageStatusText.innerText = '';
      clearInterval(node.data.simulationUpdateInterval);
    }
  }

  /**
   * Creates the output objects based on the active datasets
   * Also downloads / extracts datasets through CosmoScout
   *
   * @param node
   * @param datasetIds {String[]}
   * @param incidentId
   * @returns {Promise<{}|undefined>}
   * @throws {}
   * @private
   */
  async _makeOutputData(node, datasetIds, incidentId) {
    let output          = {};
    let datasetMetadata = {};
    let activeHashes    = [];

    for (const id of datasetIds) {
      const {metadata, hash} = await IncidentNode.loadIncidentDatasetMetadata(node, id, incidentId);
      let                            datasetOutput;

      metadata.hash = hash;
      activeHashes.push(metadata);
      datasetMetadata[hash] = metadata;

      datasetOutput = `${CosmoScout.vestec.downloadDir}/${id}`;

      if (metadata.name.includes('.zip')) {
        // TODO: The TTK Reader requires that the db folder ends with .cdb, this hard code should be
        // removed
        const addCDB = metadata.type === 'MOSQUITO TOPOLOGICAL OUTPUT';

        window.callNative('incidentNode.downloadAndExtractDataSet', metadata.uuid,
            CosmoScout.vestec.getToken(), addCDB);
      } else {
        window.callNative(
            'incidentNode.downloadDataSet', metadata.uuid, CosmoScout.vestec.getToken());
      }

      switch (metadata.type) {
      case 'CINEMA_DB_JSON': {
        const [caseName, timeStep] = metadata.name.replace('.zip', '').split('_');

        datasetOutput = {
          caseName,
          timeStep,
          uuid: id,
        };
        break;
      }

      case 'PATH':
      case 'CINEMA_DB':
        datasetOutput =
            `${CosmoScout.vestec.downloadDir}/extracted/${id}/${metadata.name.replace('.zip', '')}`;
        break;

      case 'MOSQUITO TOPOLOGICAL OUTPUT':
        datasetOutput = `${CosmoScout.vestec.downloadDir}/extracted/${id}.cdb`;
        break;

      default:
        break;
      }

      // Use the index specified on IncidentNode.outputTypes
      // Used later to determine on which port to write the data to
      // const outputDefinition = IncidentNode.getOutputDefinitionForType(metadata.type);

      // output[outputDefinition.index] = datasetOutput;
      output[hash] = datasetOutput;
    }

    node.data.currentMetadata  = datasetMetadata;
    node.data.loadedDataHashes = activeHashes;

    return output;
  }

  /**
   * Adds all defined outputTypes as outputs to the argument node
   * Output types need to be defined on the vestecNE instance
   *
   * @see {IncidentNode.outputTypes}
   * @see {CosmoScout.vestecNE.sockets}
   * @param {Node} node - The node to add outputs to
   */
  static addOutputs(node) {
    const incidentOut = new D3NE.Output('Incident', CosmoScout.vestecNE.sockets['INCIDENT']);
    node.addOutput(incidentOut);

    node.data['INCIDENT'] = incidentOut;

    return;

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
    if (typeof IncidentNode.outputTypes[to.toUpperCase()] === 'undefined') {
      console.error(`Output type ${to} does not exist on CosmoScout.vestecNE.sockets.`);
      return;
    }

    IncidentNode.outputTypes[to.toUpperCase()].mappings.push(from.toUpperCase());
  }

  /**
   * Shows all relevant controls if user is authorized / logged in
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
   * Hides all controls if user is unauthorized / not logged in
   *
   * @param {Node} node
   */
  static handleUnauthorized(node) {
    node.data.incidentSelectContainer.classList.add('hidden');
    node.data.incidentDatasetSelectContainer.classList.add('hidden');

    node.data.incidentButtonContainer.classList.add('hidden');
    node.data.incidentTestStageStatusText.parentElement.classList.add('hidden');

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
   * @return {Promise<T|{metadata: {type: null|string, name: string|null, uuid: string|null}, hash:
   *     string}|undefined|null>}
   */
  static async loadIncidentDatasetMetadata(node, datasetId, incidentId) {
    if (incidentId === null || datasetId === null || incidentId.length === 0 ||
        datasetId.length === 0) {
      throw Error('Required ids missing');
    }

    // Metadata already loaded
    if (node.data.loadedDataHashes.includes(datasetId + incidentId)) {
      return {
        metadata: node.data.currentMetadata[datasetId + incidentId],
        hash: datasetId + incidentId,
      };
    }

    const metadata =
        await CosmoScout.vestec.getIncidentDatasetMetadata(datasetId, incidentId).catch(() => ({
          type: null,
          name: null,
          uuid: null,
        }));

    if (typeof metadata.type !== 'undefined' && metadata.type !== null) {
      // Normalize the type
      metadata.type = metadata.type.toUpperCase();

      return {
        metadata,
        hash: datasetId + incidentId,
      };
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

    const incidents      = await CosmoScout.vestec.getIncidents();
    const activeIncident = element.value;

    if (incidents.length === 0) {
      return false;
    }

    // Don't clear dropdown if incident count didn't change
    const oldLen        = node.data.incidents.length;
    node.data.incidents = incidents;

    if (oldLen !== incidents.length) {
      $(element).selectpicker('destroy');
    }

    node.data.activeIncident = incidents[0].uuid;

    CosmoScout.gui.clearHtml(element);

    const sorted = {};

    incidents.forEach(incident => {
      if (typeof sorted[incident.kind] === 'undefined') {
        sorted[incident.kind] = [];
      }

      sorted[incident.kind].push(incident);
    });

    Object.entries(sorted).forEach(entry => {
      const [type, incidents] = entry;
      const group             = document.createElement('optgroup');
      group.label             = `${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()}`

      incidents
          .sort((a, b) => {
            return a.status.localeCompare(b.status);
          })
          .forEach(incident => {
            const option = document.createElement('option');
            option.text  = `${incident.name} - ${incident.status.charAt(0).toUpperCase()}${
                incident.status.slice(1).toLowerCase()}`;
            option.value = incident.uuid;

            if (incident.uuid === activeIncident) {
              node.data.activeIncident = activeIncident;
              option.selected          = true;
            }

            group.appendChild(option);
          });

      element.appendChild(group);
    });

    if (oldLen !== incidents.length) {
      $(element).selectpicker();
      $(element).selectpicker('val', node.data.activeIncident);
      IncidentNode.updateControlVisibility(node);
    } else {

      $(element).selectpicker('refresh');
    }

    return true;
  }

  /**
   * Load vestec incident datasets into the select control
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

    const datasets      = await CosmoScout.vestec.getIncidentDatasets(id) ?? [];
    const activeDataset = Array.from(element.selectedOptions).map(option => option.value);

    if (datasets.length === 0) {
      return false;
    }

    // Don't load if incidents are the same
    const oldLen               = node.data.incidentDatasets.length;
    node.data.incidentDatasets = datasets;

    if (oldLen === datasets.length) {
      return true;
    }

    node.data.activeIncidentDatasets = [datasets[0].uuid];

    $(element).selectpicker('destroy');
    CosmoScout.gui.clearHtml(element);

    datasets.forEach((dataset) => {
      const option = document.createElement('option');
      option.text  = `${dataset.name.replace('.zip', '')} - ${dataset.date_created}`;
      option.value = dataset.uuid;

      if (activeDataset.includes(dataset.uuid)) {
        option.selected                  = true;
        node.data.activeIncidentDatasets = activeDataset;
      }

      element.appendChild(option);
    });

    $(element).selectpicker();
    $(element).selectpicker('val', node.data.activeIncidentDatasets);

    return true;
  }

  /**
   * Hides all outputs but the relevant one(s) on the given node
   * If removeConnections is set to true all connections from this node to others are removed
   *
   * @see {outputTypes}
   *
   * @param {Node} node - The node to operate on
   * @param {string|string[]|null} activeDatasets - Type of output, either outputTypes key or value
   *     from mappings
   * @param {boolean} removeConnections - True to remove all active connections from/to this node
   */
  static showOutputType(node, activeDatasets, removeConnections = true) {
    if (activeDatasets === 'none') {
      CosmoScout.vestecNE.removeConnections(node);
      return;
    }

    node.data.fn.clearOutputs(activeDatasets.map(dataset => dataset.hash));
    node.data.fn.addOutputs(activeDatasets);
  }

  static showOutputType2(node, outputTypes, removeConnections = true) {
    // If arg is an array, get the correct mapping from IncidentNode.outputTypes
    if (Array.isArray(outputTypes)) {
      outputTypes = outputTypes
          .map(type => IncidentNode.getOutputDefinitionForType(type))
          .map(definition => definition?.root ?? null)
                        .filter(definition => definition !== null);

      // Fallback to non if nothing was selected
      if (outputTypes.length === 0) {
        outputTypes = 'none';
      }
    }

    // If no mapping was found, OR currently active outputs are the same, then skip
    if (typeof outputTypes === 'undefined' ||
        (Array.isArray(outputTypes) &&
            outputTypes.every(type => node.data.activeOutputTypes.includes(type)) &&
            outputTypes.length === node.data.activeOutputTypes.length)) {
      return;
    }

    // The filter function running on the entries of outputTypes
    // Idx 0 = Key, Idx 1 = object containing name, mappings
    let filter;

    if (outputTypes === 'none') {
      filter = () => true;
    } else {
      // We are dealing with an array
      filter = (type) => !outputTypes.includes(type);
    }

    // Hides all outputs, walks through all outputs, applies the previous filter and skips the
    // INCIDENT output
    Object.keys(IncidentNode.outputTypes)
        .filter(filter)
        .filter(outputType => outputType !== 'INCIDENT')
        .forEach(outputType => {
          node.data[outputType].el.parentElement.classList.add('hidden');
        });

    if (removeConnections) {
      CosmoScout.vestecNE.removeConnections(node);
    }

    if (Array.isArray(outputTypes)) {
      // Sanity check, remove hidden classes for active outputs
      outputTypes.forEach(outputType => {
        node.data[outputType].el.parentElement.classList.remove('hidden');
      });

      node.data.activeOutputTypes = outputTypes.filter(type => type !== 'INCIDENT');
    } else if (outputTypes !== 'none') {
      console.error(`Output type ${outputTypes} not recognized.`);
    }
  }

  /**
   * Returns the correct output definition for a specific metadata type
   *
   * @param {String} type Metadata type to check
   * @returns {{name: String, root: String, mappings: Array, index: Number}|null}
   */
  static getOutputDefinitionForType(type) {
    const outputType = Object.entries(IncidentNode.outputTypes).find(outputDefinition => {
            return type === outputDefinition[0] || (outputDefinition[1].mappings ?? []).includes(type);
    });

    if (typeof outputType !== 'undefined') {
      return outputType[1];
    }

    return null;
  }

  /**
   * Unsets data that is used to cache the current state
   *
   * @param {Node} node
   */
  static unsetNodeValues(node) {
    node.data.activeOutputTypes      = [];
    node.data.loadedDataHashes       = [];
    node.data.currentMetadata        = [];
    node.data.activeIncident         = '';
    node.data.activeIncidentDatasets = [];
    node.data.incidents              = [];
    node.data.incidentDatasets       = [];
    node.data.incidentDatasetLoaded  = false;

    if (typeof node.data.incidentDatasetSelect === 'object') {
      $(node.data.incidentDatasetSelect).selectpicker('destroy');
      CosmoScout.gui.clearHtml(node.data.incidentDatasetSelect);
      $(node.data.incidentDatasetSelect).selectpicker();
    }
  }

  /**
   * Shows / Hides the status text and Activate / Delete buttons
   *
   * @param {Node} node
   */
  static updateControlVisibility(node) {
    if (node.data.incidents.length === 0) {
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

    switch (activeIncident.status) {
    case 'ACTIVE':
      node.data.incidentButtonContainer.classList.remove('hidden');

      node.data.incidentStartButton.classList.add('hidden');
      node.data.incidentDeleteButton.classList.remove('hidden');
      break;

    case 'PENDING':
      node.data.incidentButtonContainer.classList.remove('hidden');

      node.data.incidentStartButton.classList.remove('hidden');
      node.data.incidentDeleteButton.classList.remove('hidden');
      node.data.incidentTestStageButton.classList.add('hidden');
      break;

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
