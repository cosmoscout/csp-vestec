/* global D3NE, CosmoScout.vestec.nodeEditor, vtk, Selection */

/**
 * Node for rendering texture input. Only takes the first file!
 */
class UncertaintyRenderNode {
  constructor() {
    this.lastFiles = "";
  }
  /**
   * Node Editor Component builder
   * @param node {{data: {}, addControl: Function, addInput: Function}}
   * @returns {*}
   * @private
   */
  _builder(node) {

    // Define HTML elements for the opacity slider
    var htmlOpacity = '\
    <div>\
      <div class="row">\
            <div class="col-5 text">Opacity:</div>\
            <div class="col-7">\
                <div id="slider_opacity' +
                      node.id + '"></div>\
            </div>\
        </div>\
      <div class="row">\
        <div class="col-5 text">Mode:</div>\
        <select id="vis_mode_' +
                      node.id + '" class="combobox col-7">\
          <option value="1">Average</option>\
          <option value="2">Variance</option>\
          <option value="3">Difference</option>\
          <option value="4">Average*Variance</option>\
          <option value="5">Average*Difference</option>\
        </select>\
      </div>\
    </div>';

    // Slider to control the opcity of the overlay
    const opacity_control = new D3NE.Control(htmlOpacity, (element, control) => {
      // Initialize HTML elements
      var sliderQuery = "#slider_opacity" + node.id;
      const slider    = element.querySelector(sliderQuery);
      noUiSlider.create(slider, {start: 1, animate: false, range: {'min': 0, 'max': 1}});

      // Read the files for the given simulation mode and fill combobox when mode is changed
      slider.noUiSlider.on('slide', function(values, handle) {
        window.callNative("setOpacityUncertainty", node.id, parseFloat(values[handle]))
      });

      // Initialize combobox for the visualization mode
      const select = $(element).find("#vis_mode_" + node.id);
      select.selectpicker();
      select.on("change", function() {
        window.callNative(
            "setUncertaintyVisualizationMode", parseInt(node.id), parseInt($(this).val()));
      });
    });

    // Add control elements
    node.addControl(opacity_control);

    // Define the input type
    const input = new D3NE.Input('TEXTURE(S)', CosmoScout.vestec.sockets.TEXTURES);
    node.addInput(input);
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
    /** @type {UncertaintyRenderNode} */
    if (inputs[0].length > 0 && JSON.stringify(inputs[0][0]) != this.lastFiles) {
      window.callNative("setTextureFiles", node.id, JSON.stringify(inputs[0][0]));
      this.lastFiles = JSON.stringify(inputs[0][0]);
    }
  }

  /**
   * Node Editor Component
   * @returns {D3NE.Component}
   * @throws {Error}
   */
  getComponent() {
    this._checkD3NE();

    return new D3NE.Component('UncertaintyRenderNode', {
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
}

(() => {
  const renderNode = new UncertaintyRenderNode();
  CosmoScout.vestec.addNode('UncertaintyRenderNode', renderNode.getComponent());
})();
