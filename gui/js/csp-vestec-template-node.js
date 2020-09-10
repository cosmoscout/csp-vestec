/* global CosmoScout, $, D3NE */

/**
 * Template Node definition
 *
 * @typedef {Object} Node
 * @property {(number|string)} id
 * @property {{
 *   exampleKey: string,
 *   secondDataKey: string|null,
 *   dataFunction: Function
 * }} data
 * @property {Function} addOutput
 * @property {Function} addInput
 * @property {Function} addControl
 */

/**
 * Example node
 * Use this file as a template for new nodes
 *
 * Prefix unused arguments with '_', e.g. if you don't use the inputs argument in the worker method rename it to '_inputs'
 * Write control html ids as 'class_name_type_node_id', e.g. for an input element: 'template_node_text_input_ID'
 * Each node should have a corresponding C++ file located at 'src/VestecNodes'
 * Write variable names in camelCase
 * Use constants where possible
 * Prefer let over var
 * Use single quotes where possible
 */
class TemplateNode {
  /**
   * Node creation method
   * Gets called once on creation
   *
   * @param {Node} node
   * @returns {Node} D3NE Node
   */
  builder(node) {
    // Socket types get registered in Plugin::init()
    // E.g.: m_pNodeEditor->RegisterSocketType("TEMPLATE");
    const input = new D3NE.Input('Template', CosmoScout.vestecNE.sockets.TEMPLATE);

    const output = new D3NE.Output('Template', CosmoScout.vestecNE.sockets.TEMPLATE);

    const exampleControl = new D3NE.Control(
      // Write IDs as class_name_type_node_id
      `<select id="template_node_select_${node.id}" class="combobox hidden"><option>Template 1</option></select>`,
      (element, control) => {
        // Element is the HTML object representation of the html string argument
        // In this case element = HTMLSelectElement
        element.classList.remove('hidden');

        // Control is a data store in the node
        // Data can be added through 'putData'
        control.putData('select', element);
      },
    );

    node.addInput(input);
    node.addOutput(output);

    node.addControl(exampleControl);

    return node;
  }

  /**
   * Worker method, gets called on every editor update
   *
   * @param {Node} node
   * @param {Array} inputs - Array if inputs defined in builder
   * @param {Array} outputs - Array of outputs defined in builder
   */
  worker(node, inputs, outputs) {
    // HTMLSelect element from builder
    const selectedValue = node.data.select.value;

    if (typeof inputs[0] !== 'undefined') {
      // This would pass the input data directly into the first output
      outputs[0] = inputs[0];
    }
  }

  /**
   * Component accessor
   *
   * @returns {D3NE.Component}
   * @throws {Error}
   */
  getComponent() {
    this._checkD3NE();

    return new D3NE.Component('TemplateNode', {
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
  const templateNode = new TemplateNode();

  CosmoScout.vestecNE.addNode('TemplateNode', templateNode.getComponent());
})();
