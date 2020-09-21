/* global D3NE, $, CosmoScout */

/**
 * Diseases Sensor Input Node definition
 *
 * @typedef {Object} Node
 * @property {(number|string)} id
 * @property {{
 *   sensorFile: string,
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
      `<select id="sensor_file_${node.id}" class="combobox"><option>none</option></select>`,
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

        select.on('change', function () {
          // Forward file to output
          control.putData('sensorFile', $(this).val());

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
        return;
      }

      if (node.data.sensorFile === null) {
        window.callNative('DiseasesSensorInputNode.readSensorFileNames', parseInt(node.id, 10), inputs[0][0]);
      }
    }

    node.data.sensorFileSelectParent.classList.remove('hidden');

    /** @type {DiseasesSensorInputNode} */
    if (node.data.sensorFile !== null && node.data.sensorFile !== 'none') {
      const files = [];
      files.push(node.data.sensorFile);
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
    DiseasesSensorInputNode.path = `${path}/input`;
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
   * Fill the combobox with the different sensor source files
   *
   * @param {number|string} id - #sensor_file_ID
   * @param simOutputs
   */
  static fillWithSensorFiles(id, simOutputs) {
    const json = JSON.parse(simOutputs);
    let liOutputs = '';

    for (let i = 0; i < json.length; i++) {
      const obj = json[i];
      const modeName = obj.split('/').pop();
      liOutputs += `<option value='${obj}'>${modeName}</option>`;
    }

    const body = $('body');

    body.find(`#sensor_file_${id}`).html(liOutputs);
    body.find(`#sensor_file_${id}`).selectpicker('refresh');
    body.find(`#sensor_file_${id}`).trigger('change');

    const node = CosmoScout.vestecNE.editor.nodes.find((editorNode) => editorNode.id === id);

    if (typeof node !== 'undefined') {
      node.data.sensorFile = body.find(`#sensor_file_${id}`).val();
    } else {
      console.error(`Node with id ${id} not found.`);
    }
  }
}

(() => {
  const diseasesInput = new DiseasesSensorInputNode();
  CosmoScout.vestecNE.addNode('DiseasesSensorInput', diseasesInput.getComponent());
})();
