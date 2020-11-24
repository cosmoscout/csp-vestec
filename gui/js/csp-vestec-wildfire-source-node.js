/* global D3NE, nodeEditor, CosmoScout, $ */

/**
 * Wildfire Source Node definition
 *
 * @typedef {Object} Node
 * @property {(number|string)} id
 * @property {{
 *   simulationFile: string|null,
 * }} data
 * @property {Function} addOutput
 * @property {Function} addInput
 * @property {Function} addControl
 */

/**
 * Node for reading and selecting the wildfire simulation data
 */
class WildFireSourceNode {
  /**
   * Node Editor Component builder
   *
   * @param {Node} node
   * @returns {Node} D3NE Node
   */
  builder(node) {
    // Combobox for simulation mode selection
    const simulationMode = new D3NE.Control(
      `<select id="simulation_mode_${node.id}" class="combobox"><option>none</option></select>`,
      (element, control) => {
        const select = $(element);
        select.selectpicker();

        // Read the files for the given simulation mode and fill combobox when mode is changed
        select.on('change', function () {
          // Now, since simulation mode changed, read the files for that simulation mode
          window.callNative('readSimulationFileNames', node.id, $(this).val());

          CosmoScout.vestecNE.updateEditor();
        });

        // Initially fill the combobox with simulation mode values (read from C++)
        window.callNative('readSimulationModes', parseInt(node.id, 10), '');
      },
    );

    // Combobox for file selection
    const simulationFile = new D3NE.Control(
      `<select id="simulation_file_${node.id}" class="combobox"><option>none</option></select>`,
      (element, control) => {
        const select = $(element);
        select.selectpicker();

        select.on('change', function () {
          // Forward file to output
          control.putData('simulationFile', $(this).val());

          CosmoScout.vestecNE.updateEditor();
        });
      },
    );

    // Add control elements
    node.addControl(simulationMode);
    node.addControl(simulationFile);

    // Define the output type
    const output = new D3NE.Output('TEXTURE(s)', CosmoScout.vestecNE.sockets.TEXTURES);
    node.addOutput(output);
    return node;
  }

  /**
   * Node Editor Worker function
   * Loads the vtk file from input and draws the canvas
   *
   * @param {Node} node
   * @param {Array} _inputs - unused
   * @param {Array} outputs - Texture
   */
  worker(node, _inputs, outputs) {
    if (typeof node.data.simulationFile !== 'undefined') {
      const files = [];
      files.push(node.data.simulationFile);
      outputs[0] = files;
    }
  }

  /**
   * Node Editor Component
   *
   * @returns {D3NE.Component}
   * @throws {Error}
   */
  getComponent() {
    this._checkD3NE();

    return new D3NE.Component('WildFireSourceNode', {
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

  // Fill the combobox with the different simulation modes read from disc in c++
  static fillSimulationModes(id, simModes) {
    const json = JSON.parse(simModes);
    let liModes = '';

    for (let i = 0; i < json.length; i++) {
      const obj = json[i];
      const fileName = obj.split('/').pop();
      liModes += `<option value='${obj}'>${fileName}</option>`;
    }

    const body = $('body');
    body.find(`#simulation_mode_${id}`).html(liModes);
    body.find(`#simulation_mode_${id}`).selectpicker('refresh');
    body.find(`#simulation_mode_${id}`).trigger('change');
  }

  // Fill the combobox with the different simulation output files per mode
  static fillSimulationOutputs(id, simOutputs) {
    const json = JSON.parse(simOutputs);
    let liOutputs = '';

    for (let i = 0; i < json.length; i++) {
      const obj = json[i];
      const modeName = obj.split('/').pop();
      liOutputs += `<option value='${obj}'>${modeName}</option>`;
    }

    const body = $('body');
    body.find(`#simulation_file_${id}`).html(liOutputs);
    body.find(`#simulation_file_${id}`).selectpicker('refresh');
    body.find(`#simulation_file_${id}`).trigger('change');
  }
}

(() => {
  const wildFireNode = new WildFireSourceNode();
  CosmoScout.vestecNE.addNode('WildFireSourceNode', wildFireNode.getComponent());
})();
