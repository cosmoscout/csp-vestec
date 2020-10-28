/* global IApi, CosmoScout, D3NE */

(() => {
  class VestecNodeEditorApi extends IApi {
    /**
     * @inheritDoc
     */
    name = 'vestecNE';

    /**
     * Container element holding the node editor
     *
     * @type {HTMLElement}
     */
    container;

    /**
     * The node editor instance
     *
     * @type {D3NE.NodeEditor}
     */
    editor;

    /**
     * The node editor engine
     *
     * @type {D3NE.Engine}
     */
    engine;

    /**
     * Object of available sockets
     * Add new sockets by calling 'addSocket'
     *
     * @see {addSocket}
     * @type {{}}
     */
    sockets = {};

    /**
     * Object of available nodes
     * Add new nodes by calling 'addNode'
     *
     * @see {addNode}
     * @type {{}}
     */
    nodes = {};

    /**
     * Array of available components
     *
     * @see {addComponent}
     * @type {*[]}
     */
    components = [];

    /**
     * Editor context menu
     *
     * Buildable through:
     * @see {addContextMenuCategory}
     * @see {addContextMenuContent}
     * @type {{}}
     */
    menu = {};

    _contextMenuData = {};

    _version = '@0.0.1';

    /**
     * @inheritDoc
     */
    init() {
    }

    /**
     * Initializes the d3 node editor
     */
    initNodeEditor() {
      this.container = document.getElementById('d3-node-editor');

      this.editor = new D3NE.NodeEditor(
        `${this.name}NodeEditor${this._version}`,
        this.container,
        this.components,
        this.menu,
      );

      this.engine = new D3NE.Engine(`${this.name}NodeEditor${this._version}`, this.components);

      this.engine.onError = (msg, obj) => {
        console.error(`Node Editor Error: ${msg}`, obj);
      };

      this._addEventListener();

      this.editor.view.zoomAt(this.editor.nodes);
      this.engine.process(this.editor.toJSON());
      this.editor.view.resize();
    }

    /**
     * Initializes the node editor context menu with 'contextMenuData'
     */
    initContextMenu() {
      this.menu = new D3NE.ContextMenu(this._contextMenuData);
    }

    /**
     * Calls engine.process with the current editor content if engine was initialized
     */
    updateEditor() {
      if (typeof this.engine !== 'undefined') {
        this.engine.process(this.editor.toJSON());
      }
    }

    /**
     * Adds a new node to the node editor
     *
     * @param {string} name - Node name
     * @param {D3NE.Component} component - D3NE.Component
     */
    addNode(name, component) {
      this.nodes[name] = component;
    }

    /**
     * Adds a new socket type to the node editor
     *
     * @param {string} name - Name of the socket
     * @param {string} hint - Hint, defaults to ''
     * @param {string} type - Socket type, defaults to 'data'
     */
    addSocket(name, hint, type) {
      this.sockets[name] = new D3NE.Socket(type ?? 'data', name, hint ?? '');
    }

    /**
     * Adds a new component to the components array
     *
     * @param {string} component - Node name
     */
    addComponent(component) {
      if (this._nodeExists(component)) {
        this.components.push(this.nodes[component]);
      }
    }

    /**
     * Adds a category to the context menu if it does not exist
     *
     * @param {string} categoryName - The category name
     */
    addContextMenuCategory(categoryName) {
      if (!Object.prototype.hasOwnProperty.call(this._contextMenuData, categoryName)) {
        this._contextMenuData[categoryName] = {};
      }
    }

    /**
     * Adds a menu entry to a given category
     *
     * @param {string} categoryName - The category to place the new entry into
     * @param {string} node - The node name
     */
    addContextMenuContent(categoryName, node) {
      if (!Object.prototype.hasOwnProperty.call(this._contextMenuData, categoryName)) {
        console.error(`Context menu does not contain a category named ${
          categoryName}, call 'addContextMenuCategory' first.`);
        return;
      }

      if (this._nodeExists(node)) {
        this._contextMenuData[categoryName][node] = this.nodes[node];
      }
    }

    /**
     * Removes all connections for a given node
     *
     * @param {Node} node
     */
    removeConnections(node) {
      if (typeof node.id === 'undefined') {
        console.error('Node has no ID property');
        return;
      }

      this.editor.paths.forEach((path) => {
        if (typeof path.connection.output.node !== 'undefined' && path.connection.output.node.id === node.id) {
          this.editor.removeConnection(path.connection);
        }
      });
    }

    /**
     * Node editor event listener
     *
     * @private
     */
    _addEventListener() {
      this.editor.eventListener.on('nodecreate', (node, persistent) => {
        try {
          window.callNative('AddNewNode', parseInt(node.id, 10), node.title);
        } catch (e) { console.error(`Error: AddNewNode #${node.id} (${node.title})`, e); }
      });

      this.editor.eventListener.on('noderemove', (node, persistent) => {
        try {
          window.callNative('DeleteNode', parseInt(node.id, 10), node.title);
        } catch (e) { console.error(`Error: DeleteNode #${node.id} (${node.title})`, e); }
      });

      this.editor.eventListener.on('connectioncreate', (connection, persistent) => {
        try {
          window.callNative(
            'AddConnection',
            parseInt(connection.output.node.id, 10),
            parseInt(connection.input.node.id, 10),
            connection.output.node.outputs.findIndex((output) => output === connection.output),
            connection.input.node.inputs.findIndex((input) => input === connection.input),
          );
        } catch (e) {
          console.error(`Error: AddConnection In #${connection.input.node.id} Out #${
            connection.output.node.id}`,
          e);
        }
      });

      this.editor.eventListener.on('connectionremove', (connection, persistent) => {
        try {
          window.callNative(
            'DeleteConnection',
            parseInt(connection.output.node.id, 10),
            parseInt(connection.input.node.id, 10),
            connection.output.node.outputs.findIndex((output) => output === connection.output),
            connection.input.node.inputs.findIndex((input) => input === connection.input),
          );
        } catch (e) {
          console.error(`Error: DeleteConnection In #${connection.input.node.id} Out #${
            connection.output.node.id}`,
          e);
        }
      });

      this.editor.eventListener.on('change', async () => {
        await this.engine.abort();
        await this.engine.process(this.editor.toJSON());
      });
    }

    /**
     * Checks if a node is registered on the nodes object
     *
     * @param {string} node - The node to check
     * @returns {boolean}
     * @private
     */
    _nodeExists(node) {
      if (!Object.prototype.hasOwnProperty.call(this.nodes, node)) {
        console.error(
          `No node with name ${node} is registered on the node editor. Call 'addNode' first.`,
        );
        return false;
      }

      return true;
    }
  }

  CosmoScout.init(VestecNodeEditorApi);
})();
