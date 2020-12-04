/* global D3NE, nodeEditor, CosmoScout, $ */

/**
 * Transfer Function Source Node definition
 *
 * @typedef {Object} Node
 * @property {(number|string)} id
 * @property {{
 * }} data
 * @property {Function} addOutput
 * @property {Function} addInput
 * @property {Function} addControl
 */

/**
 * Node for setting transfer functions
 */
class TransferFunctionSourceNode {
  /**
   * Node Editor Component builder
   *
   * @param {Node} node
   * @returns {Node} D3NE Node
   */
  builder(node) {
    // Transfer function editor
    const transferFunction = new D3NE.Control(
        `<div id="tf-editor-${node.id}" class="container-fluid"></div>`,
        (element, control) => {
          CosmoScout.transferFunctionEditor.create(element, (transferFunction) => {
            control.putData("transferFunction", transferFunction);
            CosmoScout.vestecNE.updateEditor();
          }, {width: 300, height: 120, defaultFunction: "BlackBody.json"});
        },
    );

    // Add control elements
    node.addControl(transferFunction);

    // Define the output type
    const output =
        new D3NE.Output('TRANSFER FUNCTION', CosmoScout.vestecNE.sockets.TRANSFER_FUNCTION);
    node.addOutput(output);
    return node;
  }

  /**
   * Node Editor Worker function
   *
   * @param {Node} node
   * @param {Array} _inputs - unused
   * @param {Array} outputs - Transfer Function
   */
  worker(node, _inputs, outputs) {
    if (typeof node.data.transferFunction !== 'undefined') {
      outputs[0] = node.data.transferFunction;
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

    return new D3NE.Component('TransferFunctionSourceNode', {
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
  const transferFunctionSourceNode = new TransferFunctionSourceNode();
  CosmoScout.vestecNE.addNode(
      'TransferFunctionSourceNode', transferFunctionSourceNode.getComponent());
})();
