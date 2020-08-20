/* global CosmoScout, CosmoScout.vestec, $, D3NE */

class IncidentNode {
  /**
   * Builder function
   * Creates the case name dropdown
   * Creates the timestep slider
   * Puts input content under node.data.caseName and node.data.timeStep
   * Adds output with data {caseName: string, timeStep: string}
   * @param node
   * @returns {*}
   */
  builder(node) {
    //   const output = new D3NE.Output("CINEMA_DB", CosmoScout.vestecNE.sockets.CINEMA_DB);

    const incidentControl = new D3NE.Control(
      `<select id="incidents_${node.id}" class="combobox"><option>none</option></select>`,
      (element, control) => {
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

        /*
          control.putData('caseName', 'none');
          control.putData('converted', null);

          element.addEventListener('change', (event) => {
            control.putData('caseName', event.target.value);

            CosmoScout.vestecNE.updateEditor();
          }); */
      },
    );


    node.addControl(incidentControl);

    //    node.addOutput(output);

    return node;
  }

  /**
   * Worker function
   * Calls window.convertFile for current case name + time step combination -> CS writes JS vtk file
   *
   * @param node
   * @param _inputs
   * @param outputs
   */
  worker(node, _inputs, outputs) {
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
}

(() => {
  const incidentNode = new IncidentNode();

  CosmoScout.vestecNE.addNode('IncidentNode', incidentNode.getComponent());
  CosmoScout.vestecNE.addComponent('IncidentNode');
  CosmoScout.vestecNE.addContextMenuCategory('Test');
  CosmoScout.vestecNE.addContextMenuContent('Test', 'IncidentNode');
  CosmoScout.vestecNE.initContextMenu();
})();
