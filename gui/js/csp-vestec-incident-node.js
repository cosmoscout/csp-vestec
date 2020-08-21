/* global CosmoScout, CosmoScout.vestec, $, D3NE */

class IncidentNode {
  /**
   * @param node
   * @returns {*}
   */
  builder(node) {
    const output = new D3NE.Output('Incident', CosmoScout.vestecNE.sockets.CINEMA_DB);

    const incidentControl = new D3NE.Control(
      `<select id="incident_node_select_${node.id}" class="combobox"><option>none</option></select>`,
      (element, control) => {
        const loaded = IncidentNode.loadIncidents(element);

        control.putData('incidentsSelect', element);
        control.putData('incidentsLoaded', loaded);

        if (!loaded) {
          element.classList.add('hidden');
        }
      },
    );

    if (!node.data.incidentsLoaded) {
      node.addControl(new D3NE.Control(`<strong id="incident_node_message_${node.id}">Please login first</strong>`, (element, control) => {
        control.putData('info', element);
      }));
    }

    node.addControl(incidentControl);

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
      const loaded = IncidentNode.loadIncidents(node.data.incidentsSelect);
      node.data.incidentsLoaded = loaded;

      if (loaded) {
        node.data.info.parentElement.parentElement.removeChild(node.data.info.parentElement);
        node.data.incidentsSelect.classList.remove('hidden');
      }
    }
    /*    if (node.data.caseName === undefined || node.data.timeStep === undefined) {
      return;
    }

    const fileName = `${node.data.caseName}_${node.data.timeStep}`;

    if (node.data.converted !== fileName) {
      console.debug(`[CinemaDB Node #${node.id}] Converting ${fileName}.`);

      window.callNative('convertFile', node.data.caseName, node.data.timeStep);
      node.data.converted = fileName;
    }

    outputs[0] = {
      caseName: node.data.caseName,
      timeStep: node.data.timeStep,
    }; */
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
}

(() => {
  const incidentNode = new IncidentNode();

  CosmoScout.vestecNE.addNode('IncidentNode', incidentNode.getComponent());
  CosmoScout.vestecNE.addComponent('IncidentNode');
  CosmoScout.vestecNE.addContextMenuCategory('Test');
  CosmoScout.vestecNE.addContextMenuContent('Test', 'IncidentNode');
  CosmoScout.vestecNE.initContextMenu();
})();
