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
        const loaded = IncidentNode.loadIncidents(element);

        control.putData('incidentSelect', element);
        control.putData('incidentsLoaded', loaded);

        if (!loaded) {
          element.classList.add('hidden');
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
        control.putData('incidentDatasetSelect', element);
        element.classList.add('hidden');
      },
    );

    if (!node.data.incidentsLoaded) {
      node.addControl(new D3NE.Control(`<strong id="incident_node_message_${node.id}">Please login first</strong>`, (element, control) => {
        control.putData('info', element);
      }));
    }

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
    if (!node.data.incidentsLoaded) {
      const loaded = IncidentNode.loadIncidents(node.data.incidentSelect);
      node.data.incidentsLoaded = loaded;

      if (loaded) {
        node.data.info.parentElement.classList.add('hidden');
        node.data.incidentSelect.classList.remove('hidden');
      }
    } else {
      node.data.info.parentElement.classList.add('hidden');

      if (!node.data.incidentDatasetLoaded) {
        node.data.incidentDatasetLoaded = IncidentNode.loadIncidentDatasets(
          node.data.incidentDatasetSelect,
          node.data.incidentSelect.value,
        );
      }
    }

    if (CosmoScout.vestec.isAuthorized()) {
      node.data.incidentSelect.parentElement.classList.remove('hidden');
      node.data.incidentDatasetSelect.parentElement.classList.remove('hidden');
      node.data.info.parentElement.classList.add('hidden');
    } else {
      node.data.incidentSelect.parentElement.classList.add('hidden');
      node.data.incidentDatasetSelect.parentElement.classList.add('hidden');
      node.data.info.parentElement.classList.remove('hidden');

      node.data.incidentsLoaded = false;
      node.data.incidentDatasetLoaded = false;

      outputs[0] = {};
    }

    if (typeof node.data.incidentSelect !== 'undefined') {
      outputs[0] = {
        incidentId: node.data.incidentSelect.value,
        datasetId: node.data.incidentDatasetSelect.value,
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
  CosmoScout.vestecNE.addComponent('IncidentNode');
  CosmoScout.vestecNE.addContextMenuContent('Sources', 'IncidentNode');
  CosmoScout.vestecNE.initContextMenu();
})();
