/* global D3NE, nodeEditor, vtk, Selection */

/**
 * Node for rendering texture input. Only takes the first file!
 */
class TextureRenderNode {
  constructor() {
    this.lastFile = "";
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
        <div class="row">\
            <div class="col-6 text">Opacity:</div>\
            <div class="col-6">\
                <div id="slider_opacity' +
                      node.id + '"></div>\
            </div>\
        </div>';

    // Slider to control the opcity of the overlay
    const opacity_control = new D3NE.Control(htmlOpacity, (element, control) => {
      // Initialize HTML elements
      var sliderQuery = "#slider_opacity" + node.id;
      const slider    = element.querySelector(sliderQuery);
      noUiSlider.create(slider, {start : 1, animate : false, range : {'min' : 0, 'max' : 1}});

      // Read the files for the given simulation mode and fill combobox when mode is changed
      slider.noUiSlider.on('slide', function(values, handle) {
        window.call_native("setOpacity", node.id, parseFloat(values[handle]))
      });
    });

    // Define HTML elements for the time handling
    var htmlTime = '\
            <div class="row">\
                    <div class="col-2">\
                        <label class="checklabel">\
                            <input type="checkbox" id="set_enable_time' +
                   node.id + '" />\
                            <i class="material-icons"></i>\
                        </label>\
                    </div>\
                    <div class="col-4 text">Time:</div>\
                    <div class="col-6">\
                        <div id="slider_time' +
                   node.id + '"></div>\
                    </div>\
            </div>';

    // Slider and checkbox to control time animation
    const time_control = new D3NE.Control(htmlTime, (element, control) => {
      // Initialize HTML elements
      var sliderQuery = "#slider_time" + node.id;
      const slider    = element.querySelector(sliderQuery);
      noUiSlider.create(slider, {start : 6, animate : false, range : {'min' : 0, 'max' : 6}});

      $(element).find("#set_enable_time" + node.id).on("click", function() {
        window.call_native("set_enable_time", node.id, $(this).is(":checked"));
      });

      // Set the time value for the renderer
      slider.noUiSlider.on('slide', function(values, handle) {
        window.call_native("setTime", node.id, parseFloat(values[handle]))
      });
    });

    // Add control elements
    node.addControl(opacity_control);
    node.addControl(time_control);

    // Define the input type
    const input = new D3NE.Input('TEXTURE(S)', nodeEditor.sockets.TEXTURES);
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
    /** @type {wildFireNode} */
    if (inputs[0] != undefined && inputs[0][0].toString() != this.lastFile) {
      window.call_native("readSimulationResults", node.id, inputs[0][0].toString());
      this.lastFile = inputs[0][0].toString();
    }
  }

  /**
   * Node Editor Component
   * @returns {D3NE.Component}
   * @throws {Error}
   */
  getComponent() {
    this._checkD3NE();

    return new D3NE.Component('TextureRenderNode', {
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
  const texRenderNode                = new TextureRenderNode();
  nodeEditor.nodes.TextureRenderNode = texRenderNode.getComponent();
})();
