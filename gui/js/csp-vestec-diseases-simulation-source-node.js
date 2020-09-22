/* global D3NE, CosmoScout, noUiSlider, $ */

/**
 * Template Node definition
 *
 * @typedef {Object} Node
 * @property {(number|string)} id
 * @property {{
 *   fileList: Array,
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

  /**
   *
   * @type {boolean}
   */
  animate = false;

    timeoutId;

    static startAnimation(self, slider, node) {
      if (typeof node.data.ensembleMembers === 'undefined') {
        return;
      }

      const timestep = slider.noUiSlider.get();

      if (parseInt(timestep, 10) < node.data.ensembleMembers - 1) {
        slider.noUiSlider.set(parseInt(timestep, 10) + 1);
      } else {
        slider.noUiSlider.set(0);
      }

      if (self.animate === true) {
        return setTimeout(() => {
          DiseasesSimulationNode.startAnimation(self, slider, node);
        }, 60);
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
          <div class="text" id="ensemble_num_${node.id}"></div>
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
            <select id="sim_mode_${node.id}" class="combobox col-9"><option>none</option></select>
          </div>
          <div class="row">
            <div class="col-3 text">Day:</div>
            <div class="col-9">
              <div id="slider_day${node.id}"></div>
            </div>
          </div>
          <div class="row">
            <button class="col-12" id="play_mode_${node.id}">Play</button>
          </div>
        </div>`,
        (element, control) => {
          control.putData('simControlParent', element.parentElement);

          if (this._useVestec()) {
            element.parentElement.classList.add('hidden');
          }

          const select = element.querySelector(`#sim_mode_${node.id}`);
          const slider = element.querySelector(`#slider_day${node.id}`);
          const playButton = element.querySelector(`#play_mode_${node.id}`);

          $(select).selectpicker();

          // When combo box changes update the files and number of ensemble info
          $(select).on('change', (event) => {
          // console.log('Change combo box');
            window.callNative('DiseasesSimulationNode.setNumberOfEnsembleMembers', parseInt(node.id, 10), event.target.value);

            // Get the files for the simulation mode and timestep
            const timestep = $(slider).val();
            const simPath = $(select).val();

            window.callNative(
              'DiseasesSimulationNode.getFilesForTimeStep',
              parseInt(node.id, 10), simPath.toString(), parseFloat(timestep),
            );
          });

          playButton.addEventListener('click', (event) => {
            if (this.animate === false) {
              event.target.innerText = 'Pause';
              this.animate = true;

              this.timeoutId = DiseasesSimulationNode.startAnimation(this, slider, node);
            } else {
              clearTimeout(this.timeoutId);
              event.target.innerText = 'Play';
              this.animate = false;
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
        window.callNative('DiseasesSimulationNode.readDiseasesSimulationModes', parseInt(node.id, 10), DiseasesSimulationNode.path);
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
      /*      console.log(inputs);
      console.log(node.data); */
      if (this._useVestec()) {
        if (typeof inputs[0] === 'undefined' || typeof inputs[0][0] === 'undefined' || inputs[0].length === 0) {
          node.data.ensembleControlParent.classList.add('hidden');
          node.data.simControlParent.classList.add('hidden');
          return;
        }

        if (!node.data.loaded) {
          window.callNative('DiseasesSimulationNode.readDiseasesSimulationModes', parseInt(node.id, 10), inputs[0][0]);
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
   *
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
      DiseasesSimulationNode.path = `${path}/Output`;
    }

    static setNumberOfEnsembleMembers(id, number) {
      document.querySelector(`#ensemble_num_${id}`).innerText = number;

      const node = CosmoScout.vestecNE.editor.nodes.find((editorNode) => editorNode.id === id);
      node.data.ensembleMembers = number;

      const slider = document.querySelector(`#slider_day${id}`);

      if (typeof slider.noUiSlider !== 'undefined') {
        slider.noUiSlider.destroy();
      }

      noUiSlider.create(slider, {
        start: 1, step: 1, animate: false, range: { min: 0, max: number - 1 },
      });

      // Event handling when slider changes
      slider.noUiSlider.on('set', (values, handle) => {
        const timestep = values[handle];

        const simPath = $(`#sim_mode_${node.id}`).val();

        window.callNative(
          'DiseasesSimulationNode.getFilesForTimeStep',
          parseInt(node.id, 10), simPath.toString(), parseFloat(timestep),
        );
      });
    }

    /**
   * Adds the simulation modes to `sim_mode_id' dropdown
   */
    static fillSimModes(id, modes) {
      const json = JSON.parse(modes);

      const element = document.querySelector(`#sim_mode_${id}`);
      $(element).selectpicker('destroy');

      CosmoScout.gui.clearHtml(element);

      json.forEach((mode) => {
        const option = document.createElement('option');

        option.text = mode.split('/').pop();
        option.value = mode;

        element.appendChild(option);
      });

      $(element).selectpicker();

      const node = CosmoScout.vestecNE.editor.nodes.find((editorNode) => editorNode.id === id);

      if (typeof node !== 'undefined') {
        node.data.simMode = $(element).val();
        console.log('Set ensemble');
        window.callNative('DiseasesSimulationNode.setNumberOfEnsembleMembers', parseInt(node.id, 10), node.data.simMode);
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
        const json = JSON.parse(fileList);
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
