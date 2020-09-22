/* global D3NE, CosmoScout, noUiSlider, $ */

/**
 * Texture Render Node definition
 *
 * @typedef {Object} Node
 * @property {(number|string)} id
 * @property {{}} data
 * @property {Function} addOutput
 * @property {Function} addInput
 * @property {Function} addControl
 */

/**
 * Node for rendering texture input. Only takes the first file
 * from the array as input
 */
class TextureRenderNode {
  constructor() {
    this.lastFile = '';
  }

  /**
   * Node Editor Component builder
   *
   * @param {Node} node
   * @returns {Node} D3NE Node
   */
  builder(node) {
    // Define HTML elements for the opacity slider
    const htmlOpacity = `
        <div class="row">
            <div class="col-6 text">Opacity:</div>
            <div class="col-6">
                <div id="slider_opacity${node.id}"></div>
            </div>
        </div>`;

    // Slider to control the opcity of the overlay
    const opacityControl = new D3NE.Control(htmlOpacity, (element, control) => {
      // Initialize HTML elements
      const sliderQuery = `#slider_opacity${node.id}`;
      const slider = element.querySelector(sliderQuery);
      noUiSlider.create(slider, { start: 1, animate: false, range: { min: 0, max: 1 } });

      // Read the files for the given simulation mode and fill combobox when mode is changed
      slider.noUiSlider.on('slide', (values, handle) => {
        window.callNative('setOpacityTexture', node.id, parseFloat(values[handle]));
      });
    });

    // Define HTML elements for the time handling
    const htmlTime = `
            <div class="row">
                    <div class="col-2">
                        <label class="checklabel">
                            <input type="checkbox" id="set_enable_time${node.id}" />
                            <i class="material-icons"></i>
                        </label>
                    </div>
                    <div class="col-4 text">Time:</div>
                    <div class="col-6">
                        <div id="slider_time${node.id}"></div>
                    </div>
            </div>`;

    // Slider and checkbox to control time animation
    const timeControl = new D3NE.Control(htmlTime, (element, control) => {
      // Initialize HTML elements
      const sliderQuery = `#slider_time${node.id}`;
      const slider = element.querySelector(sliderQuery);
      noUiSlider.create(slider, { start: 6, animate: false, range: { min: 0, max: 6 } });

      $(element).find(`#set_enable_time${node.id}`).on('click', function () {
        window.callNative('set_enable_time', node.id, $(this).is(':checked'));
      });

      // Set the time value for the renderer
      slider.noUiSlider.on('slide', (values, handle) => {
        window.callNative('setTime', node.id, parseFloat(values[handle]));
      });
    });

    // Add control elements
    node.addControl(opacityControl);
    node.addControl(timeControl);

    // Define the input type
    const input = new D3NE.Input('TEXTURE(S)', CosmoScout.vestecNE.sockets.TEXTURES);
    node.addInput(input);

    return node;
  }

  /**
   * Node Editor Worker function
   *
   * @param {Node} node
   * @param {Array} inputs - Texture
   * @param {Array} _outputs - unused
   */
  worker(node, inputs, _outputs) {
    /** @type {TextureRenderNode} */
    // input[0] = first input port
    // input[0][0] = the first array on input port 0
    // input[0][0][0] = the first entry in the array (filename)
    if (inputs[0].length > 0
        && inputs[0][0] !== null
        && inputs[0][0].length > 0
        && inputs[0][0][0].toString() !== this.lastFile) {
      window.callNative('readSimulationResults', node.id, inputs[0][0][0].toString());
      this.lastFile = inputs[0][0][0].toString();
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

    return new D3NE.Component('TextureRenderNode', {
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
}

(() => {
  const texRenderNode = new TextureRenderNode();
  CosmoScout.vestecNE.addNode('TextureRenderNode', texRenderNode.getComponent());
})();
