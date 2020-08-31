/* global CosmoScout, $, D3NE */

class IncidentNode {
  /**
   * @param node {{data: {}, addControl: Function, addOutput: Function, addInput: Function, id: number|string}}
   * @returns {*}
   */
  builder(node) {
    const textureOutput = new D3NE.Output('Texture', CosmoScout.vestecNE.sockets.TEXTURES);
    const cinemaDBOutput = new D3NE.Output('Cinema DB', CosmoScout.vestecNE.sockets.CINEMA_DB);
    const pointsOutput = new D3NE.Output('Points', CosmoScout.vestecNE.sockets.POINT_ARRAY);

    const incidentControl = new D3NE.Control(
      `<select id="incident_node_select_${node.id}" class="combobox"></select>`,
      (element, control) => {
        $(element).selectpicker();
        const loaded = IncidentNode.loadIncidents(element);

        control.putData('incidentSelect', element);
        control.putData('incidentsLoaded', loaded);

        if (!loaded) {
          element.parentElement.parentElement.classList.add('hidden');
        }

        element.addEventListener('change', (event) => {
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
        control.putData('incidentDatasetSelect', element);

        if (node.data.incidentsLoaded) {
          node.data.incidentDatasetLoaded = IncidentNode.loadIncidentDatasets(
            element,
            node.data.incidentSelect.value,
          );
        } else {
          control.putData('incidentDatasetSelect', element);
          $(element).selectpicker();
          element.parentElement.parentElement.classList.add('hidden');
        }
      },
    );

    const loginMessageControl = new D3NE.Control(
      `<strong id="incident_node_message_${node.id}">Please login first</strong>`,
      (element, control) => {
        control.putData('info', element);

        if (node.data.incidentsLoaded) {
          element.parentElement.classList.add('hidden');
        }
      },
    );

    node.data.updateOutputs = (type) => {
      console.log(type);
    };

    node.addControl(loginMessageControl);
    node.addControl(incidentControl);
    node.addControl(incidentDatasetControl);

    node.addOutput(textureOutput);
    node.addOutput(cinemaDBOutput);
    node.addOutput(pointsOutput);

    return node;
  }

  /**
   * @param node
   * @param _inputs
   * @param outputs
   */
  worker(node, _inputs, outputs) {
    if (!CosmoScout.vestec.isAuthorized()) {
      node.data.incidentSelect.parentElement.parentElement.classList.add('hidden');
      node.data.incidentDatasetSelect.parentElement.parentElement.classList.add('hidden');
      node.data.info.parentElement.classList.remove('hidden');

      node.data.incidentsLoaded = false;
      node.data.incidentDatasetLoaded = false;

      outputs[0] = {
        incidentId: undefined,
        datasetId: undefined,
      };

      return;
    }

    node.data.incidentSelect.parentElement.parentElement.classList.remove('hidden');
    node.data.incidentDatasetSelect.parentElement.parentElement.classList.remove('hidden');
    node.data.info.parentElement.classList.add('hidden');

    if (!node.data.incidentsLoaded) {
      node.data.incidentsLoaded = IncidentNode.loadIncidents(node.data.incidentSelect);
    } else if (!node.data.incidentDatasetLoaded) {
      node.outputs.forEach((output) => {
        console.log(output.el);
        // output.el.classList.add('hidden');
      });

      node.data.incidentDatasetLoaded = IncidentNode.loadIncidentDatasets(
        node.data.incidentDatasetSelect,
        node.data.incidentSelect.value,
      );
    }

    if (node.data.incidentDatasetLoaded) {
      const incidentId = node.data.incidentSelect.value;
      const datasetId = node.data.incidentDatasetSelect.value;

      if (typeof incidentId === 'undefined'
          || typeof datasetId === 'undefined'
          || incidentId === null
          || datasetId === null
          || incidentId.length === 0
          || datasetId.length === 0
      ) {
        return;
      }

      CosmoScout.vestec.getIncidentDatasetMetadata(datasetId, incidentId).then((data) => {
        node.data.updateOutputs(data.type);
      });
    }

    if (typeof node.data.incidentSelect !== 'undefined') {
      outputs[0] = {
        incidentId: node.data.incidentSelect.value,
        datasetId: node.data.incidentDatasetSelect.value.length > 0
          ? node.data.incidentDatasetSelect.value
          : undefined,
      };
    }
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
  static loadIncidents(element) {
    if (!CosmoScout.vestec.isAuthorized()) {
      console.warn('User not authorized, aborting.');
      return false;
    }

    CosmoScout.vestec.getIncidents().then((incidents) => {
      $(element).selectpicker('destroy');
      CosmoScout.gui.clearHtml(element);

      incidents.forEach((incident) => {
        const option = document.createElement('option');
        option.text = incident.name;
        option.value = incident.uuid;

        element.appendChild(option);
      });

      $(element).selectpicker();
    });

    return true;
  }

  /**
   * Load vestec incidents into the select control
   *
   * @param element {HTMLSelectElement}
   * @param id {string} Unique incident UUID
   * @returns true on success
   */
  static loadIncidentDatasets(element, id) {
    if (!CosmoScout.vestec.isAuthorized()) {
      console.warn('User not authorized, aborting.');
      return false;
    }

    if (typeof id === 'undefined' || id.length === 0) {
      return false;
    }

    CosmoScout.vestec.getIncidentDatasets(id).then((dataSets) => {
      $(element).selectpicker('destroy');
      CosmoScout.gui.clearHtml(element);

      dataSets.forEach((dataset) => {
        const option = document.createElement('option');
        option.text = dataset.name;
        option.value = dataset.uuid;

        element.appendChild(option);
      });

      $(element).selectpicker();
    });

    return true;
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
