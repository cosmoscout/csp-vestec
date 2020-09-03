/* global IApi, CosmoScout, $ */

(() => {
  class VestecApi extends IApi {
    /**
     * @inheritDoc
     */
    name = 'vestec';

    /**
     * Container element holding the node editor
     */
    container;

    /**
     * The NodeEditor instance
     */
    editor;

    /**
     * The node editor engine
     */
    engine;

    /**
     * Object of available sockets
     * Add new sockets by calling 'addSocket'
     * @see {addSocket}
     * @type {{}}
     */
    sockets = {};

    /**
     * Object of available nodes
     * Add new nodes by calling 'addNode'
     * @see {addNode}
     * @type {{}}
     */
    nodes = {};

    /**
     * Array of available components
     * @see {addComponent}
     * @type {*[]}
     */
    components = [];

    /**
     * Editor context menu
     * Buildable through:
     * @see {addContextMenuCategory}
     * @see {addContextMenuContent}
     * @type {{}}
     */
    menu = {};

    _contextMenuData = {};
    _version         = '@0.0.1';

    /**
     * @inheritDoc
     */
    init() {
      console.log("Init VESTEC plugin in javascript done");
      document.getElementById('vestec-system').setAttribute('src', 'http://vestec.epcc.ed.ac.uk/');
    }

    /**
     * Initializes the d3 node editor
     */
    initNodeEditor() {
      this.container = document.getElementById('d3-node-editor');

      this.editor = new D3NE.NodeEditor(
          this.name + 'NodeEditor' + this._version, this.container, this.components, this.menu);

      this.engine = new D3NE.Engine(this.name + 'NodeEditor' + this._version, this.components);

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
     * @param name Node name
     * @param component D3NE.Component
     */
    addNode(name, component) {
      this.nodes[name] = component;
    }

    /**
     * Adds a new socket type to the node editor
     * @param name Name of the socket
     * @param hint Hint, defaults to ''
     * @param type Socket type, defaults to 'data'
     */
    addSocket(name, hint, type) {
        this.sockets[name] = new D3NE.Socket(type ?? 'data', name, hint ?? '');
    }

    /**
     * Adds a new component to the components array
     * @param component
     */
    addComponent(component) {
      if (this._nodeExists(component)) {
        this.components.push(this.nodes[component]);
      }
    }

    /**
     * Adds a category to the context menu if it does not exist
     * @param categoryName The category name
     */
    addContextMenuCategory(categoryName) {
      if (!this._contextMenuData.hasOwnProperty(categoryName)) {
        this._contextMenuData[categoryName] = {};
      }
    }

    /**
     * Adds a menu entry to a given category
     * @param categoryName The category to place the new entry into
     * @param node
     */
    addContextMenuContent(categoryName, node) {
      if (!this._contextMenuData.hasOwnProperty(categoryName)) {
        console.error(`Context menu does not contain a category named ${
            categoryName}, call 'addContextMenuCategory' first.`);
        return;
      }

      if (this._nodeExists(node)) {
        this._contextMenuData[categoryName][node] = this.nodes[node];
      }
    }

    /**
     * Node editor event listener
     * @private
     */
    _addEventListener() {
      this.editor.eventListener.on('nodecreate', (node, persistent) => {
        try {
          window.callNative("AddNewNode", parseInt(node.id), node.title);
        } catch (e) { console.error(`Error: AddNewNode #${node.id} (${node.title})`, e); }
      });

      this.editor.eventListener.on('noderemove', (node, persistent) => {
        try {
          window.callNative("DeleteNode", parseInt(node.id), node.title);
        } catch (e) { console.error(`Error: DeleteNode #${node.id} (${node.title})`, e); }
      });

      this.editor.eventListener.on('connectioncreate', (connection, persistent) => {
        try {
          window.callNative("AddConnection", parseInt(connection.output.node.id),
              parseInt(connection.input.node.id),
              connection.output.node.outputs.findIndex(output => output === connection.output),
              connection.input.node.inputs.findIndex(input => input === connection.input));
        } catch (e) {
          console.error(`Error: AddConnection In #${connection.input.node.id} Out #${
                            connection.output.node.id}`,
              e);
        }
      });

      this.editor.eventListener.on('connectionremove', (connection, persistent) => {
        try {
          window.callNative("DeleteConnection", parseInt(connection.output.node.id),
              parseInt(connection.input.node.id),
              connection.output.node.outputs.findIndex(output => output === connection.output),
              connection.input.node.inputs.findIndex(input => input === connection.input));
        } catch (e) {
          console.error(`Error: DeleteConnection In #${connection.input.node.id} Out #${
                            connection.output.node.id}`,
              e);
        }
      });

      this.editor.eventListener.on("change", async () => {
        await this.engine.abort();
        await this.engine.process(this.editor.toJSON());
      });
    }

    /**
     * Checks if a node is registered on the nodes object
     * @param node The node to check
     * @returns {boolean}
     * @private
     */
    _nodeExists(node) {
      if (!this.nodes.hasOwnProperty(node)) {
        console.error(
            `No node with name ${node} is registered on the node editor. Call 'addNode' first.`)
        return false;
      }

      return true;
    }
  }

  CosmoScout.init(VestecApi);
})();