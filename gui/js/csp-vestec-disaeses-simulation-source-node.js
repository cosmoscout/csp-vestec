/* global D3NE, nodeEditor, vtk, Selection */

/**
 * Node for reading and selecting the wildfire simulation data
 */
class DiseasesSimulation {

  /**
   * Node Editor Component builder
   * @param node {{data: {}, addControl: Function, addOutput: Function, addInput: Function}}
   * @returns {*}
   * @private
   */
  _builder(node) {
    // Define HTML elements for the opacity slider
    var htmlInfo = '\
    <div class="row">\
        <div class="col-6 text">Ensemble members:</div>\
        <div class="col-6">\
            <div id="ensemble_num_' +
                   node.id + '"></div>\
        </div>\
    </div>';
    // Info for the number of ensembles
    const ensemble_control = new D3NE.Control(htmlInfo);
    node.addControl(ensemble_control);

    var htmlSlider = '\
    <div class="row">\
        <div class="col-6 text">Day:</div>\
        <div class="col-6">\
            <div id="slider_day' +
                     node.id + '"></div>\
        </div>\
    </div>';

    // Slider to select the day of the simulation results
    const day_control = new D3NE.Control(htmlSlider, (element, control) => {
      // Initialize HTML elements
      var sliderQuery = "#slider_day" + node.id;
      const slider    = element.querySelector(sliderQuery);
      noUiSlider.create(slider, {start : 1, animate : false, range : {'min' : 1, 'max' : 365}});

      // Read the files for the given simulation mode and fill combobox when mode is changed
      slider.noUiSlider.on('slide', function(values, handle) {
        // window.call_native("setOpacity", node.id, parseFloat(values[handle]))
      });
    });
    node.addControl(day_control);

    // Define the output type
    const output = new D3NE.Output('TEXTURE(s)', nodeEditor.sockets.TEXTURES);
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
    /** @type {DiseasesSimulation} */
  }

  /**
   * Node Editor Component
   * @returns {D3NE.Component}
   * @throws {Error}
   */
  getComponent() {
    this._checkD3NE();

    return new D3NE.Component('DiseasesSimulation', {
      builder : this._builder.bind(this),
      worker : this._worker.bind(this),
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
}

(() => {
  const diseasesSim                   = new DiseasesSimulation();
  nodeEditor.nodes.DiseasesSimulation = diseasesSim.getComponent();
})();
