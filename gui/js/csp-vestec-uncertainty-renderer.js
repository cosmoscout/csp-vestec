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

          // Read the files for the given simulation mode and fill combobox when
          // mode is changed
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

    // Define the input types
    const inputTexture = new D3NE.Input('Texture(s)', CosmoScout.vestecNE.sockets.TEXTURES);
    node.addInput(inputTexture);
    const inputTransferFunction = new D3NE.Input(
        'Transfer Function (average)', CosmoScout.vestecNE.sockets.TRANSFER_FUNCTION);
    node.addInput(inputTransferFunction);
    const inputTransferFunctionUncertainty = new D3NE.Input(
        'Transfer Function (variance, difference)', CosmoScout.vestecNE.sockets.TRANSFER_FUNCTION);
    node.addInput(inputTransferFunctionUncertainty);
    return node;
  }

  /**
   * @param {Node} node
   * @param {Array} inputs - Texture(s)
   * @param {Array} _outputs - unused
   */
  worker(node, inputs, _outputs) {
    this._checkTextureInput(node, inputs[0][0]);
    this._checkTransferFunctionInput(
        node, inputs[1][0], "UncertaintyRenderNode.setTransferFunction");
    this._checkTransferFunctionInput(
        node, inputs[2][0], "UncertaintyRenderNode.setTransferFunctionUncertainty");

    CosmoScout.vestecNE.editor.nodes.forEach((eNode) => {
      if (eNode.id !== node.id) {
        return;
      }

      if (typeof node.data.range !== 'undefined' && eNode.inputs[1].connections.length > 0 &&
          typeof eNode.inputs[1].connections[0].output.node.data.fn !== 'undefined') {
        eNode.inputs[1].connections[0].output.node.data.fn.setData(node.data.range);
      }
    });
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

  /**
   * Check if the texture input is present and if it changed since the last time
   * this function was called. If it did change the new texture will be sent to
   * the renderer.
   *
   * @param {Node} node The node on which the check is run.
   * @param {any} textureInput The texture input of the node.
   */
  _checkTextureInput(node, textureInput) {
    if (typeof textureInput === 'undefined') {
      return;
    }

    let textures;

    if (typeof textureInput === 'object') {
      textures = JSON.stringify(textureInput);
    } else if (typeof textureInput === 'string') {
      // A single texture, wrap in array
      textures = [textureInput];
    }

    if (node.data.lastFiles === textures) {
      return;
    }

    window.callNative('UncertaintyRenderNode.setTextureFiles', node.id, textures);
    node.data.lastFiles = textures;
  }

  /**
   * Check if the transfer function input is present and if it changed since the
   * last time this function was called. If it did change the new transfer
   * function will be send to the renderer.
   *
   * @param {Node} node The node on which the check is run.
   * @param {any} transferFunctionInput The transfer function input of the node.
   * @param {string} callback The callback to call if the transfer function
   * changed
   */
  _checkTransferFunctionInput(node, transferFunctionInput, callback) {
    if (typeof transferFunctionInput === 'undefined') {
      return;
    }

    const transferFunction = transferFunctionInput;

    if (this.lastTransferFunction === transferFunction) {
      return;
    }

    this.lastTransferFunction = transferFunction;

    window.callNative(callback, node.id, transferFunction);
  }

  // Set the min and max range of the added textures
  static setRange(id, min, max) {
    CosmoScout.vestecNE.editor.nodes.forEach((node) => {
      if (node.id == id) {
        node.data.range = [min, max];
      }
    });
  }
}

(() => {
  const renderNode = new UncertaintyRenderNode();
  CosmoScout.vestecNE.addNode('UncertaintyRenderNode', renderNode.getComponent());
})();
