/* global CosmoScout, $, D3NE */

/**
 * Incident Node definition
 *
 * @typedef {Object} Node
 * @property {(number|string)} id
 * @property {{
 *   incidentSelect: HTMLSelectElement,
 *   incidentDatasetSelect: HTMLSelectElement,
 *   incidentSelectContainer: HTMLDivElement,
 *   incidentDatasetSelectContainer: HTMLDivElement,
 *   incidentButtonContainer: HTMLDivElement,
 *   info: HTMLDivElement,
 *
 *   incidentStartButton: HTMLButtonElement,
 *   incidentDeleteButton: HTMLButtonElement,
 *   incidentTestStageButton: HTMLButtonElement,
 *   incidentTestStageStatusText: HTMLSpanElement,
 *
 *   incidentsLoaded: boolean,
 *   incidentDatasetLoaded: boolean,
 *
 *   activeIncident: string,
 *   activeIncidentDatasets: string[],
 *
 *   datasets: Array,
 *   incidentDatasets: Array,
 *
 *   loadedDataHashes: string[],
 *   currentMetadata: Object,
 *   activeOutputTypes: string[],
 *
 *   INCIDENT_CONFIG: D3NE.Input,
 *   testStageConfig: Object,
 *
 *   updateIntervalId: Number,
 *   simulationUpdateIncidentUUID: string|null,
 *   simulationUpdateInterval: Number|null,
 *
 *   fn: {
 *       addOutputs: Function,
 *       clearOutputs: Function,
 *       getOutputs: Function,
 *   },
 *
 *   downloadStatus: Map,
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
        /**
         * @param {HTMLElement} element
         * @param {{putData: Function}} control
         */
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
            IncidentNode.showOutputType(node, 'none');
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
        `<div class="btn-group incident-button-control" style="flex-direction: column">
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
              node.data.simulationUpdateIncidentUUID = node.data.activeIncident;
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
    IncidentNode.addStaticOutputs(node);
    IncidentNode.extend(node);

    // Initialize variables
    IncidentNode.unsetNodeValues(node);

    node.data['INCIDENT_CONFIG']       = configInput;
    node.data.updateIntervalId         = setInterval(this._updateNode, 5000, node);
    node.data.simulationUpdateInterval = null;

    node.data.downloadStatus = new Map();

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
   * Requests all incidents, loads datasets for the active incident
   * Accepts test stage configs, dynamically adds outputs based on the selected datasets
   * If the user is unauthorized, all controls and in- outputs will be hidden
   *
   * @param {Node} node
   * @param {Array} inputs - Config input
   * @param {Array} outputs - Texture / CinemaDB / PointArray
   */
  async worker(node, inputs, outputs) {
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

    // Clear output data
    outputs.forEach((_, index) => {
      delete outputs[index];
    });

    // 0 = Incident output
    outputs[0] = node.data.activeIncident;

    if (!node.data.incidentsLoaded || !node.data.incidentDatasetLoaded) {
      return;
    }

    // Nullish coalescing operator breaks clang format...
    const datasetIds = (typeof node.data.activeIncidentDatasets !== 'undefined' &&
                           node.data.activeIncidentDatasets !== null)
                           ? node.data.activeIncidentDatasets
                           : [];

    if (incidentId.length === 0) {
      return;
    }

    let outputData;

    try {
      outputData = await this._makeOutputData(node, datasetIds, incidentId);

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

    node.data.fn.getOutputs().forEach((out, index) => {
      if (typeof out.hash !== 'undefined' && typeof outputData[out.hash] !== 'undefined' &&
          node.data.downloadStatus.get(out.uuid) === true) {
        outputs[index] = outputData[out.hash];
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
      clearInterval(node.data.simulationUpdateInterval);
      node.data.simulationUpdateIncidentUUID = null;
      return;
    }

    // Only check simulations from the last 15 minutes
    const includeMinutes = 60;
    const includeDate    = new Date(Date.now() - (1000 * 60 * includeMinutes));

    const activeIncident = await CosmoScout.vestec.getIncident(node.data.activeIncident);

    if (activeIncident !== node.data.simulationUpdateIncidentUUID) {
      clearInterval(node.data.simulationUpdateInterval);
      node.data.simulationUpdateIncidentUUID = null;
      return;
    }

    // Because dates are fun...
    // Parses the date returned by vestec (DD-MM-YYYY, HH:mm:ii) into a ISO8601 String
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
      const statusText = currentSimulations[0].status.charAt(0).toUpperCase() +
                         currentSimulations[0].status.slice(1).toLowerCase();
      const statusElement = document.createTextNode(`Test Stage: ${statusText}`);
      node.data.incidentTestStageStatusText.parentElement.classList.remove('hidden');

      const spinner = document.createElement('i');
      spinner.classList.add('material-icons');
      spinner.innerText        = 'autorenew';
      spinner.style.animation  = 'spin infinite 3s linear';
      spinner.style.marginLeft = '5px';

      CosmoScout.gui.clearHtml(node.data.incidentTestStageStatusText);
      node.data.incidentTestStageStatusText.appendChild(statusElement)

      if (currentSimulations[0].status !== 'COMPLETED') {
        node.data.incidentTestStageStatusText.appendChild(spinner)
        console.log(`Test Stage: ${statusText}`);
      }
      else {
        CosmoScout.notifications.print(
            'Simulation Step Done', `A simulation step was completed`, 'done');
      }
    } else {
      node.data.incidentTestStageStatusText.parentElement.classList.add('hidden');
      node.data.incidentTestStageStatusText.innerText = '';
      node.data.simulationUpdateIncidentUUID          = null;
      clearInterval(node.data.simulationUpdateInterval);
    }
  }

  /**
   * Creates the output objects based on the active datasets
   * Also downloads / extracts datasets through CosmoScout
   *
   * @param {Node} node
   * @param {String[]} datasetIds
   * @param {String} incidentId
   * @returns {Promise<{}|undefined>}
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

      // Status will be updated by CosmoScout, only calls download / extract once
      if (!node.data.downloadStatus.has(metadata.uuid)) {
        if (metadata.name.includes('.zip')) {
          // TODO: The TTK Reader requires that the db folder ends with .cdb, this hard code should
          // be removed
          const addCDB = metadata.type === 'MOSQUITO TOPOLOGICAL OUTPUT';

          window.callNative('incidentNode.downloadAndExtractDataSet', node.id, metadata.uuid,
              CosmoScout.vestec.getToken(), addCDB);
        } else {
          window.callNative(
              'incidentNode.downloadDataSet', node.id, metadata.uuid, CosmoScout.vestec.getToken());
        }

        node.data.downloadStatus.set(metadata.uuid, false);
      }

      // This creates the corresponding output object based on the metadata type
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

      output[hash] = datasetOutput;
    }

    node.data.currentMetadata  = datasetMetadata;
    node.data.loadedDataHashes = activeHashes;

    return output;
  }

  /**
   * Adds all static outputs to the argument node
   * Output types need to be defined on the vestecNE instance
   *
   * In this context, static outputs are present on the node regardless of incident datasets
   *
   * @see {IncidentNode.outputTypes}
   * @see {CosmoScout.vestecNE.sockets}
   * @param {Node} node - The node to add outputs to
   */
  static addStaticOutputs(node) {
    const incidentOut = new D3NE.Output('Incident', CosmoScout.vestecNE.sockets['INCIDENT']);
    node.addOutput(incidentOut);

    node.data['INCIDENT'] = incidentOut;
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
   * @param {string|null} datasetId
   * @param {string|null} incidentId
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
   * Groups the incidents by type
   *
   * @param {HTMLSelectElement} incidentSelect
   * @param {Node} node
   * @returns true on success
   */
  static async loadIncidents(incidentSelect, node) {
    if (!CosmoScout.vestec.isAuthorized()) {
      console.warn('User not authorized, aborting.');
      return false;
    }

    const incidents      = await CosmoScout.vestec.getIncidents();
    const activeIncident = incidentSelect.value;

    if (incidents.length === 0 && node.data.incidents.length === 0) {
      return false;
    }

    // Don't clear dropdown if incident count didn't change
    const oldLen        = node.data.incidents.length;
    node.data.incidents = incidents;

    if (oldLen !== incidents.length) {
      $(incidentSelect).selectpicker('destroy');

      const added = incidents.length - oldLen;
      if (added > 0) {
        CosmoScout.notifications.print(
            'New Incidents', `Added ${added} new incident(s)`, 'post_add');
      } else {
        CosmoScout.notifications.print(
            'Incidents removed', `${Math.abs(added)} incident(s) removed`, 'delete');
      }
    }

    node.data.activeIncident = incidents[0].uuid;

    CosmoScout.gui.clearHtml(incidentSelect);

    const sorted = {};

    incidents.forEach(incident => {
      if (typeof sorted[incident.kind] === 'undefined') {
        sorted[incident.kind] = [];
      }

      sorted[incident.kind].push(incident);
    });

    // Creates optgroups for each workflow kind. Incidents are further sorted by status (active,
    // completed, ...)
    Object.entries(sorted).sort((a, b) => a[0].localeCompare(b[0])).forEach(entry => {
      const [kind, incidents] = entry;
      const group             = document.createElement('optgroup');
      group.label             = `${kind.charAt(0).toUpperCase()}${kind.slice(1).toLowerCase()}`

      incidents
          .sort((a, b) => {
            return a.status.localeCompare(b.status);
          })
          .forEach((incident, index, incidents) => {
            // Add a divider if the previous incident has a different status than the current one
            const addDivider = typeof incidents[index - 1] !== 'undefined' &&
                               incident.status !== incidents[index - 1].status &&
                               incidents.length - 1 !== index;

            if (addDivider === true) {
              const divider           = document.createElement('option');
              divider.dataset.divider = true;
              group.appendChild(divider);
            }

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

      incidentSelect.appendChild(group);
    });

    // If new incidents are present - Re-create the selectpicker
    if (oldLen !== incidents.length) {
      $(incidentSelect).selectpicker();
      $(incidentSelect).selectpicker('val', node.data.activeIncident);
      IncidentNode.updateControlVisibility(node);
    } else {
      // Update the selectpicker (= updates incident status if they changed)
      $(incidentSelect).selectpicker('refresh');
    }

    return true;
  }

  /**
   * Load vestec incident datasets into the select control
   * Groups datasets by created date
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

    // Nullish coalescing operator breaks clang format...
    let datasets = await CosmoScout.vestec.getIncidentDatasets(id);
    if (typeof datasets === 'undefined' || datasets === null) {
      datasets = [];
    }

    const activeDataset = Array.from(element.selectedOptions).map(option => option.value);

    if (datasets.length === 0 && node.data.incidentDatasets.length === 0) {
      return false;
    }

    // Don't load if incidents are the same
    const oldLen               = node.data.incidentDatasets.length;
    node.data.incidentDatasets = datasets;

    if (oldLen === datasets.length) {
      return true;
    } else {
      const added = datasets.length - oldLen;
      if (added > 0) {
        CosmoScout.notifications.print('New Dataset', `Added ${added} new dataset(s)`, 'note_add');
      } else {
        CosmoScout.notifications.print(
            'Datasets removed', `${Math.abs(added)} were removed`, 'delete');
      }
    }

    node.data.activeIncidentDatasets = [datasets[0].uuid];

    $(element).selectpicker('destroy');
    CosmoScout.gui.clearHtml(element);

    datasets.forEach((dataset, index, datasets) => {
      // Insert a divider, if the day of the previous created date differs from the current one
      const addDivider =
          typeof datasets[index - 1] !== 'undefined' &&
          dataset.date_created.substr(0, 2) !== datasets[index - 1].date_created.substr(0, 2) &&
          datasets.length - 1 !== index;

      if (addDivider === true) {
        const divider           = document.createElement('option');
        divider.dataset.divider = true;
        element.appendChild(divider);
      }

      const option = document.createElement('option');
      option.text  = `${dataset.name.replaceAll('.zip', '')} - ${dataset.date_created}`;
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
   * Dynamically adds outputs to the node based on the passed metadata objects
   * If 'none' is passed, all dynamic outputs will be removed
   *
   * @see {outputTypes}
   *
   * @param {Node} node - The node to operate on
   * @param {string|Array[]} activeDatasets - Array of active dataset objects (metadata) or 'none'
   *     to remove all
   */
  static showOutputType(node, activeDatasets) {
    if (activeDatasets === 'none') {
      node.data.fn.clearOutputs();
      CosmoScout.vestecNE.removeConnections(node);
      return;
    }

    node.data.fn.clearOutputs(activeDatasets.map(dataset => dataset.hash));
    node.data.fn.addOutputs(activeDatasets);
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
    node.data.currentMetadata        = {};
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

  /**
   * Extends the data object with additional functions
   * Adds methods only present in builder to the data object
   *
   * This can ONLY be called from the BUILDER function!
   *
   * @see {builder}
   *
   * @param {Node} node
   */
  static extend(node) {
    node.data.fn = {};

    /**
     * Adds dynamic outputs based on the passed metadata
     *
     * @param {Array} metadata
     */
    node.data.fn.addOutputs = metadata => {
      const added = node.outputs.filter(output => typeof output.hash !== 'undefined')
                        .map(output => output.hash);

      metadata.filter(dataset => !added.includes(dataset.hash)).forEach(dataset => {
        const definition = IncidentNode.getOutputDefinitionForType(dataset.type);

        const output = new D3NE.Output(
            `${dataset.name.replaceAll('.zip', '')} - ${definition.name}`,
            CosmoScout.vestecNE.sockets[definition.root],
        );
        output.hash = dataset.hash;
        output.uuid = dataset.uuid;

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
     * Returns the outputs active on the node
     * This differs from the outputs passed in worker!
     *
     * @returns {Array}
     */
    node.data.fn.getOutputs = () => {
      return node.outputs;
    };
  }

  /**
   * Update the ready state of a dataset
   * Only if the dataset state is true, the output will be populated
   *
   * Called by CosmoScout
   *
   * @param {Number} nodeId
   * @param {String} datasetUuid
   * @param {boolean|number} ready
   */
  static setDatasetReady(nodeId, datasetUuid, ready = true) {
    const node = CosmoScout.vestecNE.editor.nodes.find((editorNode) => editorNode.id === nodeId);

    if (typeof node === 'undefined') {
      return;
    }

    ready = ready === 1 || ready === true;

    node.data.downloadStatus.set(datasetUuid, ready);

    if (ready === false) {
      // Clear so it can be called again
      node.data.downloadStatus.delete(datasetUuid);
    }
  }
}

(() => {
  const incidentNode = new IncidentNode();

  CosmoScout.vestecNE.addNode('IncidentNode', incidentNode.getComponent());
})();
