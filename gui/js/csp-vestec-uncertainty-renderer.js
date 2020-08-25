/* global D3NE, CosmoScout, noUiSlider, $ */

/**
 * Node for rendering texture input. Only takes the first file!
 */
class UncertaintyRenderNode {
  constructor() {
    this.lastFiles = '';
  }

  /**
   * Node Editor Component builder
   *
   * @param node {{data: {}, addControl: Function, addOutput: Function, addInput: Function, id: number|string}}
   * @returns {*}
   */
  builder(node) {
    // Define HTML elements for the opacity slider
    const htmlOpacity = `
    <div>
      <div class="row">
            <div class="col-5 text">Opacity:</div>
            <div class="col-7">
                <div id="slider_opacity${node.id}"></div>
            </div>
        </div>
      <div class="row">
        <div class="col-5 text">Mode:</div>
        <select id="vis_mode_${node.id}" class="combobox col-7">
          <option value="1">Average</option>
          <option value="2">Variance</option>
          <option value="3">Difference</option>
          <option value="4">Average*Variance</option>
          <option value="5">Average*Difference</option>
        </select>
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
        window.callNative('setOpacityUncertainty', node.id, parseFloat(values[handle]));
      });

      // Initialize combobox for the visualization mode
      const select = $(element).find(`#vis_mode_${node.id}`);
      select.selectpicker();
      select.on('change', function () {
        window.callNative(
          'setUncertaintyVisualizationMode', parseInt(node.id, 10), parseInt($(this).val(), 10),
        );
      });
    });

    // Add control elements
    node.addControl(opacityControl);

    // Define the input type
    const input = new D3NE.Input('TEXTURE(S)', CosmoScout.vestecNE.sockets.TEXTURES);
    node.addInput(input);
    return node;
  }

  /**
   * Node Editor Worker function
   * Loads the vtk file from input and draws the canvas
   *
   * @param node {{data: {}, addControl: Function, addOutput: Function, addInput: Function, id: number|string}}
   * @param inputs {any[][]}
   * @param _outputs {any[][]}
   */
  worker(node, inputs, _outputs) {
    /** @type {UncertaintyRenderNode} */
    if (inputs[0].length > 0 && JSON.stringify(inputs[0][0]) !== this.lastFiles) {
      window.callNative('setTextureFiles', node.id, JSON.stringify(inputs[0][0]));
      this.lastFiles = JSON.stringify(inputs[0][0]);
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

    return new D3NE.Component('UncertaintyRenderNode', {
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
  const renderNode = new UncertaintyRenderNode();
  CosmoScout.vestecNE.addNode('UncertaintyRenderNode', renderNode.getComponent());
})();
