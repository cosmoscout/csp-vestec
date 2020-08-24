/* global CosmoScout, CosmoScout.vestec, $, D3NE */

class IncidentNode {
  /**
   * @param node
   * @returns {*}
   */
  builder(node) {
    const output = new D3NE.Output('Incident', CosmoScout.vestecNE.sockets.INCIDENT);

    const incidentControl = new D3NE.Control(
      `<select id="incident_node_select_${node.id}" class="combobox"><option>none</option></select>`,
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
      `<select id="incident_dataset_node_select_${node.id}" class="combobox"><option>none</option></select>`,
      (element, control) => {
        $(element).selectpicker();
        control.putData('incidentDatasetSelect', element);

        $(element).selectpicker();

        element.parentElement.parentElement.classList.add('hidden');
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

    node.addControl(loginMessageControl);
    node.addControl(incidentControl);
    node.addControl(incidentDatasetControl);

    node.addOutput(output);

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
      node.data.incidentDatasetLoaded = IncidentNode.loadIncidentDatasets(
        node.data.incidentDatasetSelect,
        node.data.incidentSelect.value,
      );
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
   * @returns {D3NE.Component}
   */
  getComponent() {
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
}

(() => {
  const incidentNode = new IncidentNode();

  CosmoScout.vestecNE.addNode('IncidentNode', incidentNode.getComponent());
})();
