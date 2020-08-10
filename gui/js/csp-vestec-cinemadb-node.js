/* global CosmoScout.vestec, $, noUiSlider */

class CinemaDBNode {
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
    const output = new D3NE.Output("CINEMA_DB", CosmoScout.vestecNE.sockets.CINEMA_DB);

    const caseNames = new D3NE.Control(
        `<select id="case_names_${node.id}" class="combobox"><option>none</option></select>`,
        (element, control) => {
          window.callNative('readCaseNames', node.id, '');
          const select = $(`#case_names_${node.id}`);

          select.selectpicker();

          control.putData('caseName', 'none');
          control.putData('converted', null);

          element.addEventListener('change', (event) => {
            control.putData('caseName', event.target.value);

            CosmoScout.vestecNE.updateEditor();
          });
        });

    const timeSteps = new D3NE.Control(
        `<div id="time_slider_${node.id}" class="slider"></div>`, (element, control) => {
          window.callNative('getTimeSteps', node.id, '');
        });

    node.addControl(caseNames);
    node.addControl(timeSteps);
    node.addOutput(output);

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
    if (node.data.caseName === undefined || node.data.timeStep === undefined) {
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
    };
  }

  /**
   * Component accessor
   * @returns {D3NE.Component}
   */
  getComponent() {
    return new D3NE.Component('CinemaDBNode', {
      builder: this.builder.bind(this),
      worker: this.worker.bind(this),
    });
  }

  /**
   * Creates a noUiSlider for given time step args
   * @param id {string|number} Node id
   * @param args {string} JSON args
   */
  static createSlider(id, args) {
    const json = JSON.parse(args);

    const min = json[0];
    const max = json[1];

    const rangers = {};

    rangers['min'] = [min];
    for (let i = 2; i < json.length; ++i) {
      const percent = (json[i] - min) / (max - min) * 100;

      if (i < json.length - 1) {
        rangers[percent + '%'] = [json[i], json[i + 1] - json[i]]
      }
    }
    rangers['max'] = [max];

    // Initialize slider
    const slider = document.getElementById(`time_slider_${id}`);
    if (slider === null) {
      console.error(`[CinemaDB Node #${id}] Slider with id #time_slider_${id} not found.`);
      return;
    }

    if (typeof slider.noUiSlider !== 'undefined') {
      slider.noUiSlider.destroy();
    }

    noUiSlider.create(slider, {
      start: 10,
      snap: true,
      animate: false,
      range: rangers,
    });

    slider.noUiSlider.on('update', (values) => {
      const node = CosmoScout.vestecNE.editor.nodes.find(node => node.id === id);

      if (typeof node !== 'undefined') {
        node.data.timeStep = Number(values[0]).toFixed(0)
      } else {
        console.error(`Node with id ${id} not found.`)
      }
    });

    slider.noUiSlider.on('set', (values) => {
      CosmoScout.vestecNE.updateEditor();
    });

    // Just do once after initialization
    CosmoScout.vestecNE.updateEditor();
  }

  /**
   * Adds content to the case name dropdown
   * @param id {string|number} Node id
   * @param caseNames {string} JSON Array of case names
   */
  static fillCaseNames(id, caseNames) {
    const json        = JSON.parse(caseNames);
    let liSimulations = "";

    for (let i = 0; i < json.length; i++) {
      liSimulations += `<option>${json[i]}</option>`;
    }

    const select = $(`#case_names_${id}`);

    select.html(liSimulations);
    select.selectpicker('refresh');

    const node = CosmoScout.vestecNE.editor.nodes.find(node => node.id === id);

    if (typeof node !== 'undefined') {
      node.data.caseName = select.val();
    } else {
      console.error(`Node with id ${id} not found.`)
    }
  }
}

(() => {
  const cinemaDBNode = new CinemaDBNode();

  CosmoScout.vestecNE.addNode('CinemaDBNode', cinemaDBNode.getComponent());
})();
