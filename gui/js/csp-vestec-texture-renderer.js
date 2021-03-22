/* global D3NE, CosmoScout, noUiSlider, $ */

/**
 * Texture Render Node definition
 *
 * @typedef {Object} Node
 * @property {(number|string)} id
 * @property {{
 *     textureSelectParent: HTMLDivElement,
 *     activeTexture: string
 * }} data
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
    this.lastFile             = '';
    this.lastTransferFunction = '';
  }

  /**
   * Node Editor Component builder
   *
   * @param {Node} node
   * @returns {Node} D3NE Node
   */
  builder(node) {
    // Slider to control the opacity of the overlay
    const opacityControl = new D3NE.Control(
        `<div class="row">
        <div class="col-6 text">Opacity:</div>
        <div class="col-6">
          <div id="texture-node_${node.id}-slider_opacity"></div>
        </div>
      </div>`,
        (element, _control) => {
          const slider = element.querySelector(`#texture-node_${node.id}-slider_opacity`);
          noUiSlider.create(slider, {start: 1, animate: false, range: {min: 0, max: 1}});

          // Read the files for the given simulation mode and fill combobox when mode is changed
          slider.noUiSlider.on('slide', (values, handle) => {
            window.callNative(
                'TextureRenderNode.setOpacityTexture', node.id, parseFloat(values[handle]));
          });
        },
    );

    // Slider and checkbox to control time animation
    const timeControl = new D3NE.Control(
        `<div class="row">
        <div class="col-2">
          <label class="checklabel">
            <input type="checkbox" id="texture-node_${node.id}-set_enable_time" />
            <i class="material-icons"></i>
          </label>
        </div>
        <div class="col-4 text">Time:</div>
        <div class="col-6">
          <div id="texture-node_${node.id}-slider_time"></div>
        </div>
      </div>`,
        (element, _control) => {
          const slider = element.querySelector(`#texture-node_${node.id}-slider_time`);
          noUiSlider.create(slider, {start: 6, animate: false, range: {min: 0, max: 6}});

          element.querySelector(`#texture-node_${node.id}-set_enable_time`)
              .addEventListener('click', (event) => {
                window.callNative(
                    'TextureRenderNode.setEnableTime', node.id, event.target.checked === true);
              });

          // Set the time value for the renderer
          slider.noUiSlider.on('slide', (values, handle) => {
            window.callNative('TextureRenderNode.setTime', node.id, parseFloat(values[handle]));
          });
        },
    );

    //
    const textureSelectControl = new D3NE.Control(
        `<select id="texture-node_${
            node.id}-texture-select" class="combobox"><option>none</option></select>`,
        (element, control) => {
          element.parentElement.classList.add('hidden');

          control.putData('textureSelectParent', element.parentElement);
        },
    );

    // Slider and checkbox to control mip map level
    const mipMapLevelControl = new D3NE.Control(
        `<div class="row">
        <div class="col-2">
          <label class="checklabel">
            <input type="checkbox" id="texture-node_${node.id}-set_enable_manual-mipmap" />
            <i class="material-icons"></i>
          </label>
        </div>
        <div class="col-10 text">MipMap Level:</div>
        <div class="col-10 offset-1">
          <div id="texture-node_${node.id}-slider_mipmap"></div>
        </div>
      </div>`,
        (element, _control) => {
          this._createMipMapSlider(node, element);
        },
    );

    // Slider and checkbox to control mip map level
    const mipMapReduceMode = new D3NE.Control(
        `<select id="texture-node_${node.id}-mipmap-mode-select" class="combobox">
          <option value="0" selected>Max</option>
          <option value="1">Min</option>
          <option value="2">Average</option>
        </select>`,
        (element, _control) => {
          $(element).selectpicker();
          element.addEventListener('change', event => {
            window.callNative('TextureRenderNode.setMipMapReduceMode', node.id,
                Number.parseInt(event.target.value));
          });
        },
    );

    // Add control elements
    node.addControl(opacityControl);
    node.addControl(timeControl);
    node.addControl(textureSelectControl);
    node.addControl(mipMapReduceMode);
    node.addControl(mipMapLevelControl);

    // Define the input types
    const inputTexture = new D3NE.Input('TEXTURE(S)', CosmoScout.vestecNE.sockets.TEXTURES);
    node.addInput(inputTexture);
    const inputTransferFunction =
        new D3NE.Input('TRANSFER FUNCTION', CosmoScout.vestecNE.sockets.TRANSFER_FUNCTION);
    node.addInput(inputTransferFunction);

    return node;
  }

  /**
   * Node Editor Worker function
   *
   * @param {Node} node
   * @param {Array} inputs - Texture
   * @param {Array} outputs - unused
   */
  worker(node, inputs, outputs) {
    this._checkTextureInput(node, inputs[0][0]);
    this._checkTransferFunctionInput(node, inputs[1][0]);

    CosmoScout.vestecNE.editor.nodes.forEach((eNode) => {
      if (eNode.id !== node.id) {
        return;
      }

      if (typeof node.data.range !== 'undefined' && eNode.inputs[1].connections.length > 0 &&
          typeof eNode.inputs[1].connections[0].output.node.data.fn !== 'undefined') {
        eNode.inputs[1].connections[0].output.node.data.fn.setData(node.data.range);
      }
    });

    if (typeof node.data.levels !== 'undefined' && node.data.levels > 0) {
      this._createMipMapSlider(node, document);
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

  /**
   * Check if the texture input is present and if it changed since the last time this function was
   * called. If it did change the new texture will be send to the renderer.
   *
   * @param {Node} node The node on which the check is run.
   * @param {any} textureInput The texture input of the node.
   */
  _checkTextureInput(node, textureInput) {
    if (typeof textureInput === 'undefined') {
      window.callNative('TextureRenderNode.unloadTexture', node.id);
      return;
    }

    let texture;

    if (typeof textureInput === 'string') {
      texture = textureInput;
    } else if (typeof textureInput === 'object') {
      if (typeof node.data.activeFileSet === 'undefined' ||
          node.data.activeFileSet !== textureInput) {
        this._fillTextureSelect(textureInput, node);
      }

      texture = node.data.activeTexture;
    } else {
      node.data.textureSelectParent.classList.add('hidden');
      delete node.data.activeTexture;
      delete this.lastFile;

      return;
    }

    if (this.lastFile === texture) {
      return;
    }

    this.lastFile = texture;

    window.callNative('TextureRenderNode.readSimulationResults', node.id, texture);
  }

  /**
   * Check if the transfer function input is present and if it changed since the last time this
   * function was called. If it did change the new transfer function will be send to the renderer.
   *
   * @param {Node} node The node on which the check is run.
   * @param {any} transferFunctionInput The transfer function input of the node.
   */
  _checkTransferFunctionInput(node, transferFunctionInput) {
    if (typeof transferFunctionInput === 'undefined') {
      return;
    }

    const transferFunction = transferFunctionInput;

    if (this.lastTransferFunction === transferFunction) {
      return;
    }

    this.lastTransferFunction = transferFunction;

    window.callNative('TextureRenderNode.setTransferFunction', node.id, transferFunction);
  }

  /**
   * Adds content to the case name dropdown
   *
   * @param textures
   * @param {Node} node
   *
   * @returns void
   */
  _fillTextureSelect(textures, node) {
    const element = document.getElementById(`texture-node_${node.id}-texture-select`);

    $(element).selectpicker('destroy');
    CosmoScout.gui.clearHtml(element);

    textures.forEach((texture) => {
      const option = document.createElement('option');
      option.value = texture;
      option.text  = texture.split('/').pop().toString();

      element.appendChild(option);
    });

    $(element).selectpicker();

    element.addEventListener('change', (event) => {
      node.data.activeTexture = event.target.value;
    });

    node.data.activeTexture = $(element).val();
    node.data.activeFileSet = textures;

    node.data.textureSelectParent.classList.remove('hidden');
  }

  /**
   * Creates the MipMapSlider
   * @param {Node} node Node
   * @param {HTMLElement|Document} parent
   * @private
   */
  _createMipMapSlider(node, parent) {
    if (typeof parent === 'undefined' || parent === null) {
      parent = document
    }

    const slider = parent.querySelector(`#texture-node_${node.id}-slider_mipmap`);

    if (slider === null) {
      return;
    }

    if (typeof node.data.levels === 'undefined' || node.data.levels === null) {
      node.data.levels = 10
    }

    if (typeof node.data.prevLevels !== 'undefined' && node.data.levels === node.data.prevLevels) {
      return;
    }

    node.data.prevLevels = node.data.levels;

    if (typeof slider.noUiSlider !== 'undefined') {
      slider.noUiSlider.destroy();
    } else {
      slider.setAttribute('disabled', true);
      slider.classList.add('unresponsive');
    }

    noUiSlider.create(
        slider, {start: 0, animate: false, range: {min: 0, max: node.data.levels}, step: 1});

    parent.querySelector(`#texture-node_${node.id}-set_enable_manual-mipmap`)
        .addEventListener('click', (event) => {
          event.target.checked === true
              ? (slider.removeAttribute('disabled'), slider.classList.remove('unresponsive'))
              : (slider.setAttribute('disabled', true), slider.classList.add('unresponsive'));

          window.callNative(
              'TextureRenderNode.setEnableManualMipMap', node.id, event.target.checked === true);
        });

    // Set the time value for the renderer
    slider.noUiSlider.on('slide', (values, handle) => {
      window.callNative('TextureRenderNode.setMipMapLevel', node.id, parseInt(values[handle]));
    });
  }

  // Fill the combobox with the different simulation modes read from disc in c++
  static setRange(id, min, max) {
    CosmoScout.vestecNE.editor.nodes.forEach((node) => {
      if (node.id == id) {
        node.data.range = [min, max];
      }
    });
  }

  // Fill the combobox with the different simulation modes read from disc in c++
  static setMipMapLevels(id, levels) {
    CosmoScout.vestecNE.editor.nodes.forEach((node) => {
      if (node.id == id) {
        node.data.levels = levels;
        CosmoScout.vestecNE.updateEditor();
      }
    });
  }
}

(() => {
  const texRenderNode = new TextureRenderNode();
  CosmoScout.vestecNE.addNode('TextureRenderNode', texRenderNode.getComponent());
})();
