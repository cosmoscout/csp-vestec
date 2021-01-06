/* global D3NE, CosmoScout, noUiSlider, $ */

/**
 * Template Node definition
 *
 * @typedef {Object} Node
 * @property {(number|string)} id
 * @property {{
 *   fileList: Array,
 *   animate: boolean,
 *   timeoutId: number
 * }} data
 * @property {Function} addOutput
 * @property {Function} addInput
 * @property {Function} addControl
 */

/**
 * Node for reading and selecting the wildfire simulation data
 */
class DiseasesSimulationNode {
  /**
   * Setting this disables loading data from the vestec system
   * And instead uses the local path configured in the vestec config
   * Set 'vestec-diseases-dir'
   *
   * @type {string}
   * @private
   */
  static path;

  static startAnimation(slider, node) {
    if (typeof node.data.ensembleMembers === 'undefined') {
      return;
    }

    const timestep = slider.noUiSlider.get();

    if (parseInt(timestep, 10) < node.data.ensembleMembers - 1) {
      slider.noUiSlider.set(parseInt(timestep, 10) + 1);
    } else {
      slider.noUiSlider.set(0);
    }

    if (node.data.animate === true) {
      let speed = 1;
      if (typeof node.data.playbackSpeed !== 'undefined') {
        speed = parseInt(node.data.playbackSpeed[0], 10);
      }

      return setTimeout(() => {
        DiseasesSimulationNode.startAnimation(slider, node);
      }, 60 / speed);
    }
  }

  /**
   * Builder function
   * Creates the simulation mode dropdown
   * Creates the info text for number of ensemble members
   * Create a slider to browse the days a year
   * Puts input content under node.data.fileList
   *
   * @param {Node} node
   * @returns {Node} D3NE Node
   */
  builder(node) {
    // Info for the number of ensembles
    const ensembleControl = new D3NE.Control(
        `<div class="row">
      <div class="col-10 text">Ensemble members:</div>
      <div class="col-2">
        <div class="text" id="diseases-simulation-node_${node.id}-ensemble_num"></div>
      </div>
    </div>`,
        (element, control) => {
          control.putData('ensembleControlParent', element.parentElement);

          if (this._useVestec()) {
            element.parentElement.classList.add('hidden');
          }
        },
    );

    const simControl = new D3NE.Control(
        `<div>
        <div class="row">
          <div class="col-3 text">Mode:</div>
          <select id="diseases-simulation-node_${
            node.id}-sim_mode" class="combobox col-9"><option>none</option></select>
        </div>
        <div class="row">
          <div class="col-3 text">Day:</div>
          <div class="col-9">
            <div id="diseases-simulation-node_${node.id}-slider_day"></div>
          </div>
        </div>
        <div class="row">
          <button class="col-12" id="diseases-simulation-node_${node.id}-play_mode">Play</button>
        </div>
        <div class="row">
          <div class="col-3 text">Speed:</div>
          <div class="col-9">
            <div id="diseases-simulation-node_${node.id}-playback_speed"></div>
          </div>
        </div>
      </div>`,
        (element, control) => {
          control.putData('simControlParent', element.parentElement);

          if (this._useVestec()) {
            element.parentElement.classList.add('hidden');
          }

          const select = element.querySelector(`#diseases-simulation-node_${node.id}-sim_mode`);
          const slider = element.querySelector(`#diseases-simulation-node_${node.id}-slider_day`);
          const playButton =
              element.querySelector(`#diseases-simulation-node_${node.id}-play_mode`);
          const playBackSpeed =
              element.querySelector(`#diseases-simulation-node_${node.id}-playback_speed`);

          $(select).selectpicker();

          // When combo box changes update the files and number of ensemble info
          select.addEventListener('change', (event) => {
            // console.log('Change combo box');
            window.callNative('DiseasesSimulationNode.setNumberOfEnsembleMembers',
                parseInt(node.id, 10), event.target.value);

            // Get the files for the simulation mode and timestep
            const timestep = $(slider).val();
            const simPath  = $(select).val();

            window.callNative(
                'DiseasesSimulationNode.getFilesForTimeStep',
                parseInt(node.id, 10),
                simPath.toString(),
                parseFloat(timestep),
            );
          });

          playButton.addEventListener('click', (event) => {
            if (node.data.animate === false) {
              event.target.innerText = 'Pause';
              node.data.animate      = true;

              node.data.timeoutId = DiseasesSimulationNode.startAnimation(slider, node);
            } else {
              clearTimeout(node.data.timeoutId);
              event.target.innerText = 'Play';
              node.data.animate      = false;
            }
          });

          noUiSlider.create(
              playBackSpeed,
              {
                start: 1,
                animate: false,
                range: {
                  min: 0.1,
                  max: 2,
                },
                step: 0.1,
              },
          );

          playBackSpeed.noUiSlider.on('set', (handles) => {
            node.data.playbackSpeed = handles;
            if (node.data.animate) {
              clearTimeout(node.data.timeoutId);
              node.data.timeoutId = DiseasesSimulationNode.startAnimation(slider, node);
            }
          });
        },
    );

    node.addControl(ensembleControl);
    node.addControl(simControl);

    // Define the output type
    const output = new D3NE.Output('TEXTURE(s)', CosmoScout.vestecNE.sockets.TEXTURES);
    node.addOutput(output);

    if (this._useVestec()) {
      const input = new D3NE.Input('PATH', CosmoScout.vestecNE.sockets.PATH);
      node.addInput(input);

      node.data.loaded = false;
    } else {
      window.callNative('DiseasesSimulationNode.readDiseasesSimulationModes', parseInt(node.id, 10),
          DiseasesSimulationNode.path);
    }

    return node;
  }

  /**
   * Node Editor Worker function
   * Loads the vtk file from input and draws the canvas
   *
   * @param {Node} node
   * @param {Array} inputs -
   * @param {Array} outputs - Texture
   */
  worker(node, inputs, outputs) {
    if (this._useVestec()) {
      if (typeof inputs[0] === 'undefined' || typeof inputs[0][0] === 'undefined' ||
          inputs[0].length === 0) {
        node.data.ensembleControlParent.classList.add('hidden');
        node.data.simControlParent.classList.add('hidden');

        delete node.data.fileList;
        node.data.loaded = false;
        return;
      }

      if (!node.data.loaded) {
        window.callNative('DiseasesSimulationNode.readDiseasesSimulationModes',
            parseInt(node.id, 10), inputs[0][0]);
        node.data.loaded = true;
      }
    }

    node.data.ensembleControlParent.classList.remove('hidden');
    node.data.simControlParent.classList.remove('hidden');

    outputs[0] = node.data.fileList;
  }

  /**
   * Node Editor Component
   *
   * @returns {D3NE.Component}
   * @throws {Error}
   */
  getComponent() {
    this._checkD3NE();

    return new D3NE.Component('DiseasesSimulation', {
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
   * @return {boolean}
   * @private
   */
  _useVestec() {
    return typeof DiseasesSimulationNode.path === 'undefined';
  }

  /**
   * A path to load cinemadb data from
   *
   * @param {string} path
   */
  static setPath(path) {
    DiseasesSimulationNode.path = `${path}/output/`;
  }

  static setNumberOfEnsembleMembers(id, number, files) {
    document.querySelector(`#diseases-simulation-node_${id}-ensemble_num`).innerText = number;

    const node = CosmoScout.vestecNE.editor.nodes.find((editorNode) => editorNode.id === id);
    node.data.ensembleMembers = files;

    const slider = document.querySelector(`#diseases-simulation-node_${id}-slider_day`);

    if (typeof slider.noUiSlider !== 'undefined') {
      slider.noUiSlider.destroy();
    }

    noUiSlider.create(slider, {
      start: 1,
      step: 1,
      animate: false,
      range: {min: 0, max: files - 1},
    });

    // Event handling when slider changes
    slider.noUiSlider.on('set', (values, handle) => {
      const timestep = values[handle];

      const simPath = $(`#diseases-simulation-node_${id}-sim_mode`).val();

      window.callNative(
          'DiseasesSimulationNode.getFilesForTimeStep',
          parseInt(node.id, 10),
          simPath.toString(),
          parseFloat(timestep),
      );
    });

    if (typeof DiseasesSimulationNode.path !== 'undefined') {
      window.callNative(
          'DiseasesSimulationNode.getFilesForTimeStep',
          parseInt(node.id, 10),
          $(`#diseases-simulation-node_${id}-sim_mode`).val().toString(),
          1,
      );
    }
  }

  /**
   * Adds the simulation modes to `sim_mode_id' dropdown
   */
  static fillSimModes(id, modes) {
    const json = JSON.parse(modes);

    const element = document.querySelector(`#diseases-simulation-node_${id}-sim_mode`);
    $(element).selectpicker('destroy');

    CosmoScout.gui.clearHtml(element);

    json.forEach((mode) => {
      const option = document.createElement('option');

      option.text  = mode.split('/').pop();
      option.value = mode;

      element.appendChild(option);
    });

    $(element).selectpicker();

    const node = CosmoScout.vestecNE.editor.nodes.find((editorNode) => editorNode.id === id);

    if (typeof node !== 'undefined') {
      node.data.simMode = $(element).val();
      console.log('Set ensemble');
      window.callNative('DiseasesSimulationNode.setNumberOfEnsembleMembers', parseInt(node.id, 10),
          node.data.simMode);
    } else {
      console.error(`Node with id ${id} not found.`);
    }
  }

  /**
   * Receive the filelist from c++
   */
  static setFileListForTimeStep(id, fileList) {
    const node = CosmoScout.vestecNE.editor.nodes.find((editorNode) => editorNode.id === id);
    if (typeof node !== 'undefined') {
      node.data.fileList = [];
      const json         = JSON.parse(fileList);
      for (let i = 0; i < json.length; i++) {
        node.data.fileList.push(json[i]);
      }
    }

    // Files have changed trigger a processing step
    CosmoScout.vestecNE.updateEditor();
  }
}

(() => {
  const diseasesSim = new DiseasesSimulationNode();
  CosmoScout.vestecNE.addNode('DiseasesSimulation', diseasesSim.getComponent());
})();
