/* global D3NE, CosmoScout, noUiSlider, $ */

/**
 * Uncertainty Render Node definition
 *
 * @typedef {Object} Node
 * @property {(number|string)} id
 * @property {{
 *     lastFiles: array
 * }} data
 * @property {Function} addOutput
 * @property {Function} addInput
 * @property {Function} addControl
 */

/**
 * Node for rendering texture input. Only takes the first file!
 */
class UncertaintyRenderNode {
  /**
   * Node Editor Component builder
   *
   * @param {Node} node
   * @returns {Node} D3NE Node
   */
  builder(node) {
    // Slider to control the opcity of the overlay
    const opacityControl = new D3NE.Control(
        `<div>
        <div class="row">
          <div class="col-5 text">Opacity:</div>
          <div class="col-7">
            <div id="uncertainty-node_${node.id}-slider_opacity"></div>
          </div>
        </div>
        <div class="row">
          <div class="col-5 text">Mode:</div>
          <select id="uncertainty-node_${node.id}-vis_mode" class="combobox col-7">
            <option value="1">Average</option>
            <option value="2">StdDeviation</option>
            <option value="3">AbsDifference</option>
            <option value="4">StdDeviation*Average</option>
            <option value="5">AbsDifference*Average</option>
          </select>
        </div>
      </div>`,
        (element, _control) => {
          const slider = element.querySelector(`#uncertainty-node_${node.id}-slider_opacity`);
          noUiSlider.create(slider, {start: 1, animate: false, range: {min: 0, max: 1}});

          // Read the files for the given simulation mode and fill combobox when mode is changed
          slider.noUiSlider.on('slide', (values, handle) => {
            window.callNative(
                'UncertaintyRenderNode.setOpacityUncertainty', node.id, parseFloat(values[handle]));
          });

          // Initialize combobox for the visualization mode
          const select = $(element).find(`#uncertainty-node_${node.id}-vis_mode`);
          select.selectpicker();
          select.on('change', (event) => {
            window.callNative(
                'UncertaintyRenderNode.setUncertaintyVisualizationMode',
                parseInt(node.id, 10),
                parseInt(event.target.value, 10),
            );
          });
        },
    );

    // Add control elements
    node.addControl(opacityControl);

    // Define the input type
    const input = new D3NE.Input('TEXTURE(S)', CosmoScout.vestecNE.sockets.TEXTURES);
    node.addInput(input);
    return node;
  }

  /**
   * @param {Node} node
   * @param {Array} inputs - Texture(s)
   * @param {Array} _outputs - unused
   */
  worker(node, inputs, _outputs) {
    if (typeof inputs[0][0] === 'undefined') {
      return;
    }

    let textures;

    if (typeof inputs[0][0] === 'object') {
      textures = JSON.stringify(inputs[0][0]);
    } else if (typeof inputs[0][0] === 'string') {
      // A single texture, wrap in array
      textures = [inputs[0][0]];
    }

    if (node.data.lastFiles === textures) {
      return;
    }

    window.callNative('UncertaintyRenderNode.setTextureFiles', node.id, textures);
    node.data.lastFiles = textures;
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
