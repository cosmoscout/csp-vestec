/* global CosmoScout, $, D3NE */

/**
 * Texture Upload Node definition
 *
 * @typedef {Object} Node
 * @property {(number|string)} id
 * @property {{
 *   button: HTMLButtonElement,
 *
 *   inputTextures: Array,
 *   uploadedTextures: Array,
 * }} data
 */

class TextureUploadNode {

  /**
   * Builder method creating incident and dataset select
   *
   * @param {Node} node
   * @returns {Node}
   */
  builder(node) {
    const uploadWrap =
        (event) => {
          if (event.target.classList.contains('disabled') === false) {
            this._upload(node);
          }
        }

    const uploadButtonControl = new D3NE.Control(
        `<button type="submit" class="btn glass disabled" id="texture_upload_node_upload_button_${
            node.id}" disabled>Upload Texture</button>`,
        (element, control) => {
          element.addEventListener('click', uploadWrap);
          element.parentElement.classList.add('hidden');

          control.putData('button', element);
        },
    );

    node.addControl(uploadButtonControl);

    const incidentInput =
        new D3NE.Input('Incident', CosmoScout.vestecNE.sockets.INCIDENT);
    const textureInput =
        new D3NE.Input('Texture', CosmoScout.vestecNE.sockets.TEXTURES);

    node.addInput(incidentInput);
    node.addInput(textureInput);

    node.data.inputTextures = [];
    node.data.uploadedTextures = [];

    return node;
  }

  /**
   * @param {Node} node
   * @param {Array} inputs - Texture / Incident
   * @param {Array} _outputs - Unused
   */
  async worker(node, inputs, _outputs) {
    if (typeof inputs[0] === 'undefined' || typeof inputs[1] === 'undefined' ||
        inputs[0].length === 0 || inputs[1].length === 0) {
      return;
    }

    node.data.activeIncident = inputs[0];
    node.data.inputTextures = inputs[1];

    node.data.button.removeAttribute('disabled');
    node.data.button.classList.remove('disabled');
    node.data.button.parentElement.classList.remove('hidden');
  }

  /**
   * Component accessor
   *
   * @returns {D3NE.Component}
   * @throws {Error}
   */
  getComponent() {
    this._checkD3NE();

    return new D3NE.Component('TextureUploadNode', {
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
   *
   * @param {TextureUploadNode} node
   * @returns {Promise<void>}
   * @private
   */
  async _upload(node) {
    node.data.inputTextures.flat().forEach(texturePath => {
      if (node.data.uploadedTextures.includes(texturePath)) {
        CosmoScout.notifications.print('Skipping Upload',
                                       'Texture already uploaded', 'info');
        return;
      }

      window.callNative('TextureUploadNode.uploadDataSet', texturePath,
                        node.data.activeIncident[0], node.id);
    })
  }

  /**
   * Uploads a dataset to the vestec system
   * Filetype is hardcoded to 'TEXTURE'
   *
   * @param {String} base64Data
   * @param {String} filePath
   * @param {String} incidentUUID
   * @param {Number} nodeId
   * @returns {Promise<void>}
   */
  static async doUpload(base64Data, filePath, incidentUUID, nodeId) {
    // Splits a string by / and \ and returns the last entry (the filename)
    const filename = filePath.split('/').flatMap(part => part.split('\\')).pop()

    const response =
        await CosmoScout.vestec.api
            .uploadDataset('add_data_simple', incidentUUID, {
              filename,
              filetype : 'TEXTURE',
              filecomment : 'CosmoScout VR Upload',
              payload : `data:application/octet-stream;base64,${base64Data}`,
            })
            .catch(() => {
              CosmoScout.notifications.print(
                  'Upload failed', 'Is the incident active?', 'error');
            });

    if (typeof response !== 'undefined' && response.status <= 500) {
      const node = CosmoScout.vestecNE.editor.nodes.find(
          (editorNode) => editorNode.id === nodeId);

      if (typeof node !== 'undefined') {
        // TODO Add texture to list of uploaded ones
      }

      CosmoScout.notifications.print(
          'Dataset uploaded',
          'Successfully uploaded dataset.',
          'done',
      );
    }
  }
}

(() => {
  const textureUploadNode = new TextureUploadNode();

  CosmoScout.vestecNE.addNode('TextureUploadNode',
                              textureUploadNode.getComponent());
})();
