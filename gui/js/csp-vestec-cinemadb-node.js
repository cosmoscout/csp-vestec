/* global CosmoScout, $, noUiSlider, D3NE */

/**
 * CinemaDB Node definition
 *
 * @typedef {Object} Node
 * @property {(number|string)} id
 * @property {{
 *   caseName: string,
 *   converted: string|null,
 *   timeStep: string|number,
 *   currentData: string|null
 * }} data
 * @property {Function} addOutput
 * @property {Function} addInput
 * @property {Function} addControl
 */

class CinemaDBNode {
  /**
   * Setting this disables loading data from the vestec system
   * And instead uses the local path configured in the vestec config
   * Set 'vestec-topo-dir'
   *
   * @type {string}
   * @private
   */
  static path;

  /**
   * Builder function
   * Creates the case name dropdown
   * Creates the timestep slider
   * Puts input content under node.data.caseName and node.data.timeStep
   * Adds output with data {caseName: string, timeStep: string}
   *
   * @param {Node} node
   * @returns {Node}
   */
  builder(node) {
    const caseNames = new D3NE.Control(
        `<select id="case_names_${
            node.id}" class="combobox"><option>none</option></select>`,
        (element, control) => {
          const select = $(`#case_names_${node.id}`);

          select.selectpicker();

          control.putData('caseName', 'none');
          control.putData('converted', null);
          control.putData('caseNameSelectParent', element.parentElement);

          if (this._useVestec()) {
            element.parentElement.classList.add('hidden');
          } else {
            window.callNative('CinemaDBNode.readCaseNames', node.id,
                              CinemaDBNode.path);
          }

          element.addEventListener('change', (event) => {
            control.putData('caseName', event.target.value);

            CosmoScout.vestecNE.updateEditor();
          });
        },
    );

    const timeSteps = new D3NE.Control(
        `<div id="time_slider_${node.id}" class="slider"></div>`,
        (element, control) => {
          control.putData('timeSliderParent', element.parentElement);

          if (this._useVestec()) {
            element.parentElement.classList.add('hidden');
          } else {
            window.callNative('CinemaDBNode.getTimeSteps', node.id,
                              CinemaDBNode.path);
          }
        },
    );

    node.data.currentData = null;

    node.addControl(caseNames);
    node.addControl(timeSteps);

    const output =
        new D3NE.Output('Cinema DB', CosmoScout.vestecNE.sockets.CINEMA_DB);

    node.addOutput(output);

    if (this._useVestec()) {
      const input =
          new D3NE.Input('File Path', CosmoScout.vestecNE.sockets.PATH);
      node.addInput(input);
    }

    return node;
  }

  /**
   * Worker function
   * Calls window.convertFile for current case name + time step combination ->
   * CS writes JS vtk file
   *
   * @param {Node} node
   * @param {Array} inputs -
   * @param {Array} outputs - CinemaDB
   */
  worker(node, inputs, outputs) {
    if (this._useVestec()) {
      if (typeof inputs[0] === 'undefined' ||
          typeof inputs[0][0] === 'undefined' || inputs[0].length === 0) {
        node.data.caseNameSelectParent.classList.add('hidden');
        node.data.timeSliderParent.classList.add('hidden');
        return;
      }

      if (node.data.currentData === null ||
          node.data.currentData !== inputs[0][0]) {
        window.callNative('CinemaDBNode.readCaseNames', node.id, inputs[0][0]);
        window.callNative('CinemaDBNode.getTimeSteps', node.id, inputs[0][0]);

        node.data.currentData = inputs[0][0];
      }
    }

    node.data.caseNameSelectParent.classList.remove('hidden');
    node.data.timeSliderParent.classList.remove('hidden');

    if (node.data.caseName === undefined || node.data.timeStep === undefined) {
      return;
    }

    const fileName = `${node.data.caseName}_${node.data.timeStep}`;

    let path;
    if (this._useVestec()) {
      path = inputs[0][0];
    } else {
      path = CinemaDBNode.path;
    }

    if (node.data.converted !== fileName) {
      console.debug(`[CinemaDB Node #${node.id}] Converting ${fileName}.`);

      window.callNative('CinemaDBNode.convertFile', node.data.caseName,
                        node.data.timeStep, path);
      node.data.converted = fileName;
    }

    outputs[0] = {
      caseName : node.data.caseName,
      timeStep : node.data.timeStep,
      path,
    };
  }

  /**
   * Component accessor
   *
   * @returns {D3NE.Component}
   * @throws {Error}
   */
  getComponent() {
    this._checkD3NE();

    return new D3NE.Component('CinemaDBNode', {
      builder : this.builder.bind(this),
      worker : this.worker.bind(this),
    });
  }

  /**
   *
   * @return {boolean}
   * @private
   */
  _useVestec() { return typeof CinemaDBNode.path === 'undefined'; }

  /**
   * Creates a noUiSlider for given time step args
   *
   * @param {string|number} id - Node id
   * @param {string} args - JSON args
   */
  static createSlider(id, args) {
    const json = JSON.parse(args);

    const min = json[0];
    const max = json[1];

    const rangers = {};

    rangers.min = [ min ];
    for (let i = 2; i < json.length; ++i) {
      const percent = ((json[i] - min) / (max - min)) * 100;

      if (i < json.length - 1) {
        rangers[`${percent}%`] = [ json[i], json[i + 1] - json[i] ];
      }
    }
    rangers.max = [ max ];

    // Initialize slider
    const slider = document.getElementById(`time_slider_${id}`);
    if (slider === null) {
      console.error(`[CinemaDB Node #${id}] Slider with id #time_slider_${
          id} not found.`);
      return;
    }

    if (typeof slider.noUiSlider !== 'undefined') {
      slider.noUiSlider.destroy();
    }

    noUiSlider.create(slider, {
      start : 10,
      snap : true,
      animate : false,
      range : rangers,
    });

    slider.noUiSlider.on('update', (values) => {
      const node = CosmoScout.vestecNE.editor.nodes.find(
          (editorNode) => editorNode.id === id);

      if (typeof node !== 'undefined') {
        node.data.timeStep = Number(values[0]).toFixed(0);
      } else {
        console.error(`Node with id ${id} not found.`);
      }
    });

    slider.noUiSlider.on('set', () => { CosmoScout.vestecNE.updateEditor(); });
  }

  /**
   * Adds content to the case name dropdown
   *
   * @param {string|number} id - Node id
   * @param {string} caseNames - JSON Array of case names
   *
   * @returns void
   */
  static fillCaseNames(id, caseNames) {
    const json = JSON.parse(caseNames);

    if (json === null || json.length === 0) {
      return;
    }

    const element = document.getElementById(`case_names_${id}`);

    $(element).selectpicker('destroy');
    CosmoScout.gui.clearHtml(element);

    json.forEach((simulation) => {
      const option = document.createElement('option');
      option.text = simulation;

      element.appendChild(option);
    });

    $(element).selectpicker();

    const node = CosmoScout.vestecNE.editor.nodes.find(
        (editorNode) => editorNode.id === id);

    if (typeof node !== 'undefined') {
      node.data.caseName = $(element).val();
    } else {
      console.error(`Node with id ${id} not found.`);
    }
  }

  /**
   * A path to load cinemadb data from
   *
   * @param {string} path
   */
  static setPath(path) { CinemaDBNode.path = path; }

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
  const cinemaDBNode = new CinemaDBNode();

  CosmoScout.vestecNE.addNode('CinemaDBNode', cinemaDBNode.getComponent());
})();
