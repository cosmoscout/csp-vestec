/* global D3NE, nodeEditor, CosmoScout, $ */

/**
 * Wildfire Source Node definition
 *
 * @typedef {Object} Node
 * @property {(number|string)} id
 * @property {{
 *   activeTexture: string|null,
 *   textures: array,
 * }} data
 * @property {Function} addOutput
 * @property {Function} addInput
 * @property {Function} addControl
 */

/**
 * Node for reading and selecting the wildfire simulation data
 */
class TextureLoaderNode {
  /**
   * Node Editor Component builder
   *
   * @param {Node} node
   * @returns {Node} D3NE Node
   */
  builder(node) {
    // Combobox for file selection
    const texture = new D3NE.Control(
        `<select id="texture_loader_node_${
            node.id}_texture_select" class="combobox"><option>none</option></select>`,
        (element, control) => {
          const select = $(element);
          select.selectpicker();

          select.on('change', function() {
            // Forward file to output
            control.putData('activeTexture', $(this).val());

            CosmoScout.vestecNE.updateEditor();
          });
        },
    );

    // Add control elements
    node.addControl(texture);

    // Define the output type
    const output =
        new D3NE.Output('Texture', CosmoScout.vestecNE.sockets.TEXTURES);
    node.addOutput(output);
    return node;
  }

  /**
   * Node Editor Worker function
   * Loads the vtk file from input and draws the canvas
   *
   * @param {Node} node
   * @param {Array} _inputs - unused
   * @param {Array} outputs - Texture
   */
  worker(node, _inputs, outputs) {
    if (typeof node.data.textures === 'undefined') {
      window.callNative('TextureLoaderNode.readFileNames', node.id);
    }

    if (typeof node.data.activeTexture !== 'undefined') {
      const files = [];
      files.push(node.data.activeTexture);
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

    return new D3NE.Component('TextureLoaderNode', {
      builder : this.builder.bind(this),
      worker : this.worker.bind(this),
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
   * Adds content to the case name dropdown
   *
   * @param textures
   * @param {Number} id
   *
   * @returns void
   */
  static fillTextureSelect(textures, id) {
    const node = CosmoScout.vestecNE.editor.nodes.find(
        (eNode) => {return eNode.id === id});

    if (typeof node === 'undefined') {
      return;
    }

    textures = JSON.parse(textures);

    node.data.textures = textures;
    const element = document.getElementById(
        `texture_loader_node_${node.id}_texture_select`);

    $(element).selectpicker('destroy');
    CosmoScout.gui.clearHtml(element);

    textures.forEach((texture) => {
      const option = document.createElement('option');
      option.value = texture;
      option.text = texture.split('/').pop().toString();

      element.appendChild(option);
    });

    $(element).selectpicker();

    element.addEventListener(
        'change', (event) => { node.data.activeTexture = event.target.value; });

    node.data.activeTexture = $(element).val();
    node.data.activeFileSet = textures;
  }
}

(() => {
  const textureLoaderNode = new TextureLoaderNode();
  CosmoScout.vestecNE.addNode('TextureLoaderNode',
                              textureLoaderNode.getComponent());
})();
