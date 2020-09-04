/* global D3NE, $, CosmoScout */

/**
 * Node for reading and selecting the wildfire simulation data
 */
class DiseasesSensorInput {
  /**
   * Node Editor Component builder
   *
   * @param node {{data: {}, addControl: Function, addOutput: Function, addInput: Function, id: number|string}}
   * @returns {*}
   * @private
   */
  builder(node) {
    // Combobox for file selection
    const simulationFile = new D3NE.Control(
      `<select id="sensor_file_${node.id}" class="combobox"><option>none</option></select>`,
      (element, control) => {
        const select = $(element);
        select.selectpicker();

        select.on('change', function () {
          // Forward file to output
          control.putData('sensorFile', $(this).val());

          CosmoScout.vestecNE.updateEditor();
        });

        // Now, since simulation mode changed, read the files for that simulation mode
        window.callNative('readSensorFileNames', parseInt(node.id, 10));
      },
    );

    // Add control elements
    node.addControl(simulationFile);

    // Define the output type
    const output = new D3NE.Output('TEXTURE', CosmoScout.vestecNE.sockets.TEXTURES);
    node.addOutput(output);
    return node;
  }

  /**
   * Node Editor Worker function
   * Loads the vtk file from input and draws the canvas
   *
   * @param node {{data: {}, addControl: Function, addOutput: Function, addInput: Function, id: number|string}}
   * @param inputs {any[][]}
   * @param outputs {any[][]}
   * @private
   */
  worker(node, inputs, outputs) {
    /** @type {DiseasesSensorInput} */
    if (typeof node.data.sensorFile !== 'undefined') {
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
   * @param id {number|string} #sensor_file_ID
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
  }
}

(() => {
  const diseasesInput = new DiseasesSensorInput();
  CosmoScout.vestecNE.addNode('DiseasesSensorInput', diseasesInput.getComponent());
})();
