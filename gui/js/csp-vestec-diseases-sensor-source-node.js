/* global D3NE, $, CosmoScout */

/**
 * Diseases Sensor Input Node definition
 *
 * @typedef {Object} Node
 * @property {(number|string)} id
 * @property {{
 *   sensorFile: string,
 *   sensorFilePath: string,
 * }} data
 * @property {Function} addOutput
 * @property {Function} addInput
 * @property {Function} addControl
 */

/**
 * Node for reading and selecting the wildfire simulation data
 */
class DiseasesSensorInputNode {
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
   * Node Editor Component builder
   *
   * @param {Node} node
   * @returns {Node} D3NE Node
   * @private
   */
  builder(node) {
    // Combobox for file selection
    const simulationFile = new D3NE.Control(
      `<select id="diseases-sensor-node_${node.id}-sensor-file-select" class="combobox"><option>none</option></select>`,
      (element, control) => {
        const select = $(element);
        select.selectpicker();

        control.putData('sensorFileSelectParent', element.parentElement);

        if (this._useVestec()) {
          element.parentElement.classList.add('hidden');
        } else {
          // Now, since simulation mode changed, read the files for that simulation mode
          window.callNative('DiseasesSensorInputNode.readSensorFileNames', parseInt(node.id, 10), DiseasesSensorInputNode.path);
        }

        select.on('change', (event) => {
          // Forward file to output
          control.putData('sensorFile', event.target.value);

          CosmoScout.vestecNE.updateEditor();
        });
      },
    );

    node.data.sensorFile = null;

    // Add control elements
    node.addControl(simulationFile);

    // Define the output type
    const output = new D3NE.Output('TEXTURE', CosmoScout.vestecNE.sockets.TEXTURES);
    node.addOutput(output);

    if (this._useVestec()) {
      const input = new D3NE.Input('PATH', CosmoScout.vestecNE.sockets.PATH);
      node.addInput(input);
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
      if (typeof inputs[0] === 'undefined' || typeof inputs[0][0] === 'undefined' || inputs[0].length === 0) {
        node.data.sensorFileSelectParent.classList.add('hidden');
        node.data.sensorFile = null;
        delete node.data.sensorFilePath;
        return;
      }

      if (node.data.sensorFile === null || node.data.sensorFilePath !== inputs[0][0]) {
        window.callNative('DiseasesSensorInputNode.readSensorFileNames', parseInt(node.id, 10), inputs[0][0]);
        node.data.sensorFilePath = inputs[0][0];
      }
    }

    node.data.sensorFileSelectParent.classList.remove('hidden');

    /** @type {DiseasesSensorInputNode} */
    if (node.data.sensorFile !== null && node.data.sensorFile !== 'none') {
      outputs[0] = node.data.sensorFile;
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

    return new D3NE.Component('DiseasesSensorInput', {
      builder: this.builder.bind(this),
      worker: this.worker.bind(this),
    });
  }

  /**
   *
   * @return {boolean}
   * @private
   */
  _useVestec() {
    return typeof DiseasesSensorInputNode.path === 'undefined';
  }

  /**
   * A path to load cinemadb data from
   *
   * @param {string} path
   */
  static setPath(path) {
    DiseasesSensorInputNode.path = `${path}/input/`;
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
   * Adds content to the case name dropdown
   *
   * @param {number|string} id - #sensor_file_ID
   * @param simOutputs
   *
   * @returns void
   */
  static fillWithSensorFiles(id, simOutputs) {
    const element = document.querySelector(`#diseases-sensor-node_${id}-sensor-file-select`);

    $(element).selectpicker('destroy');
    CosmoScout.gui.clearHtml(element);

    const sensorFiles = JSON.parse(simOutputs);

    sensorFiles.forEach((sensorFile) => {
      const option = document.createElement('option');
      option.value = sensorFile;
      option.text = sensorFile.split('/').pop().toString();

      element.appendChild(option);
    });

    $(element).selectpicker();

    const node = CosmoScout.vestecNE.editor.nodes.find((editorNode) => editorNode.id === id);

    if (typeof node !== 'undefined') {
      node.data.sensorFile = element.value;
    } else {
      console.error(`Node with id ${id} not found.`);
    }
  }
}

(() => {
  const diseasesInput = new DiseasesSensorInputNode();
  CosmoScout.vestecNE.addNode('DiseasesSensorInput', diseasesInput.getComponent());
})();
