/* global D3NE, CosmoScout, PersistenceRenderer */

/**
 * Node drawing a persistence diagram for a given vtk file
 * VTK File containing an array of points
 */
class PersistenceNode {
  static pathDIR = 'not defined yet';

  /**
   * Node Editor Component builder
   * Creates the canvas control element
   * Adds CINEMA_DB Input
   * Adds FILTER Output
   *
   * @param node {{data: {}, addControl: Function, addOutput: Function, addInput: Function, id: number|string}}
   * @returns {*}
   */
  builder(node) {
    const renderer = new D3NE.Control(`<div id="render_control_${node.id}"></div>`, (element, control) => {
      const color = 'rgb(221, 221, 255)';

      const persistenceRenderer = new PersistenceRenderer(element, node.id, {
        strokeStyle: color,
        axesTextColor: color,
        axesColor: color,
        axesTickColor: color,
        padding: {
          left: 40,
          top: 20,
          right: 20,
          bottom: 40,
        },
        waitTime: 1,
        enablePersistenceFilter: true,
        enableSelectionFilter: true,
        selectionStopPropagation: true,
      });

      // Update graph processing on selection changes
      persistenceRenderer.container.addEventListener('pointsdrawn', (event /* CustomEvent */) => {
        CosmoScout.vestecNE.updateEditor();
      });

      const canvas = persistenceRenderer.renderer.getCanvas();
      canvas.classList.add('hidden');

      control.putData('renderer', persistenceRenderer);
      control.putData('canvas', canvas);

      CosmoScout.vestecNE.updateEditor();
    });

    node.addControl(renderer);

    const minimizeButton = new D3NE.Control(
      '<button data-minimized="false" class="hidden"><i class="material-icons minimize">picture_in_picture</i></button>',
      (element, control) => {
        Object.assign(element.style, {
          border: 0,
          background: 'none',
          position: 'absolute',
          top: 0,
          right: 0,
          zIndex: 1,
        });

        Object.assign(element.parentNode.style, {
          padding: 0,
        });

        const canvas = control.getData('canvas');

        element.parentNode.addEventListener('click', (e) => {
          e.stopPropagation();

          if (element.dataset.minimized === 'true') {
            canvas.classList.remove('hidden');
            element.dataset.minimized = 'false';
          } else {
            canvas.classList.add('hidden');
            element.dataset.minimized = 'true';
          }
        });

        control.putData('button', element);
      },
    );

    node.addControl(minimizeButton);

    const resetSelection = new D3NE.Control(
      '<button class="btn light-glass" style="color: #ddf; padding: 0 0.5rem;">Reset Selection</button>',
      (element, control) => {
        element.classList.add('hidden');

        element.addEventListener('click', () => {
          node.data.renderer.setActiveSelectionBounds(undefined);
        });

        control.putData('resetBtn', element);
      },
    );

    node.addControl(resetSelection);

    node.data.activeFile = null;

    const input = new D3NE.Input('CinemaDB', CosmoScout.vestecNE.sockets.CINEMA_DB);

    node.addInput(input);

    const output = new D3NE.Output('Points', CosmoScout.vestecNE.sockets.POINT_ARRAY);

    node.addOutput(output);

    return node;
  }

  /**
   * Node Editor Worker function
   * Loads the vtk file from input and draws the canvas
   *
   * @param node {{id: number, data: {canvas: HTMLCanvasElement, context:
   * CanvasRenderingContext2D}}}
   * @param inputs {any[][]}
   * @param outputs {any[][]}
   */
  worker(node, inputs, outputs) {
    /** @type {PersistenceRenderer} */
    const { renderer } = node.data;

    if (inputs[0].length === 0) {
      console.debug(`[Persistence Node #${node.id}] Input Empty`);
      node.data.canvas.classList.add('hidden');
      return;
    }

    if (inputs[0][0] === null) {
      console.warn(`[Persistence Node #${node.id}] Case name or time step undefined.`);
      return;
    }

    if (node.data.button.dataset.minimized !== 'true') {
      node.data.canvas.classList.remove('hidden');
    }

    node.data.button.classList.remove('hidden');
    node.data.resetBtn.classList.remove('hidden');

    const fileName = `${inputs[0][0].caseName}_${inputs[0][0].timeStep}`;

    if (node.data.activeFile === fileName) {
      outputs[0] = renderer.filteredPoints();
      return;
    }

    const modPath = PersistenceNode.pathDIR.substr(3, PersistenceNode.pathDIR.length - 3);

    let path = `/${modPath}/export/${fileName}`;

    if (typeof inputs[0][0].uuid !== 'undefined') {
      path = `/${modPath}/../../extracted/${inputs[0][0].uuid}/${fileName}`;
    }

    renderer.load(path).then(() => {
      node.data.activeFile = fileName;
      renderer.update();
    });
  }

  /**
   * Node Editor Component
   * @returns {D3NE.Component}
   * @throws {Error}
   */
  getComponent() {
    this._checkD3NE();

    return new D3NE.Component('PersistenceNode', {
      builder: this.builder.bind(this),
      worker: this.worker.bind(this),
    });
  }

  /**
   * Check if D3NE is available
   * @throws {Error}
   * @private
   */
  _checkD3NE() {
    if (typeof D3NE === 'undefined') {
      throw new Error('D3NE is not defined.');
    }
  }

  /**
   * Set path to load data
   * @param {string} myPath Path to the exported persistence diagram in vtk js format
   */
  static setPath(myPath) {
    this.pathDIR = myPath.toString();
  }
}

(() => {
  const persistenceNode = new PersistenceNode();

  CosmoScout.vestecNE.addNode('PersistenceNode', persistenceNode.getComponent());
})();
