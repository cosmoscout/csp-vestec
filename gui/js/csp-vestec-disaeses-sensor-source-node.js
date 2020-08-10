/* global D3NE, vtk, Selection */

/**
 * Node for reading and selecting the wildfire simulation data
 */
class DiseasesSensorInput {

  /**
   * Node Editor Component builder
   * @param node {{data: {}, addControl: Function, addOutput: Function, addInput: Function}}
   * @returns {*}
   * @private
   */
  _builder(node) {
    // Combobox for file selection
    const simulation_file = new D3NE.Control(
        `<select id="sensor_file_${node.id}" class="combobox"><option>none</option></select>`,
        (element, control) => {
          const select = $(element);
          select.selectpicker();

          select.on("change", function() {
            // Forward file to output
            control.putData('sensorFile', $(this).val());

            CosmoScout.vestecNE.updateEditor();
          });

          // Now, since simulation mode changed, read the files for that simulation mode
          window.callNative("readSensorFileNames", parseInt(node.id));
        });

    // Add control elements
    node.addControl(simulation_file);

    // Define the output type
    const output = new D3NE.Output('TEXTURE', CosmoScout.vestecNE.sockets.TEXTURES);
    node.addOutput(output);
    return node;
  }

  /**
   * Node Editor Worker function
   * Loads the vtk file from input and draws the canvas
   * @param node {{id: number, data: {canvas: HTMLCanvasElement, context:
   * CanvasRenderingContext2D}}}
   * @param inputs {any[][]}
   * @param outputs {any[][]}
   * @private
   */
  _worker(node, inputs, outputs) {
    /** @type {DiseasesSensorInput} */
    if (node.data.sensorFile != undefined) {
      const files = [];
      files.push(node.data.sensorFile);
      outputs[0] = files;
    }
  }

  /**
   * Node Editor Component
   * @returns {D3NE.Component}
   * @throws {Error}
   */
  getComponent() {
    this._checkD3NE();

    return new D3NE.Component('DiseasesSensorInput', {
      builder: this._builder.bind(this),
      worker: this._worker.bind(this),
    });
  }

  /**
   * Check if D3NE is available
   * @throws {Error}
   * @private
   */
  _checkD3NE() {
    if (typeof D3NE === 'undefined') {
      throw new Error('D3NE is not defined.');
    }
  }

  // Fill the combobox with the different sensor source files
  static fillWithSensorFiles(id, simOutputs) {
    console.log(simOutputs);
    var json      = JSON.parse(simOutputs);
    var liOutputs = "";

    for (var i = 0; i < json.length; i++) {
      var obj      = json[i];
      var modeName = obj.split("/").pop();
      liOutputs += "<option value='" + obj + "'>" + modeName + "</option>";
    }

    $("body").find("#sensor_file_" + id).html(liOutputs);
    $("body").find("#sensor_file_" + id).selectpicker('refresh');
    $("body").find("#sensor_file_" + id).trigger('change');
  }
}

(() => {
  const diseasesInput = new DiseasesSensorInput();
  CosmoScout.vestecNE.addNode('DiseasesSensorInput', diseasesInput.getComponent());
})();
