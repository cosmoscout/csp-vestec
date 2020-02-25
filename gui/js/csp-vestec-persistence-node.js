/* global D3NE, nodeEditor, vtk, Selection */

/**
 * Node drawing a persistence diagram for a given vtk file
 * VTK File containing an array of points
 */
class PersistenceNode {
    /**
     * Node Editor Component builder
     * Creates the canvas control element
     * Adds CINEMA_DB Input
     * Adds FILTER Output
     * @param node {{data: {}, addControl: Function, addOutput: Function, addInput: Function}}
     * @returns {*}
     * @private
     */
    _builder(node) {
        const renderer = new D3NE.Control(`<div id="render_control_${node.id}"></div>`, (element, control) => {
            const color = 'rgb(221, 221, 255)';

            const renderer = new PersistenceRenderer(element, node.id, {
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
                selectionStopPropagation: true
            });

            const canvas = renderer.renderer.getCanvas();
            canvas.classList.add('hidden');

            control.putData('renderer', renderer);
            control.putData('canvas', canvas);
        });

        node.addControl(renderer);

        const minimizeButton = new D3NE.Control('<button data-minimized="false" class="hidden"><i class="material-icons minimize">picture_in_picture</i></button>', (element, control) => {
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
                    console.log(element.dataset.minimized, 'ismini');
                    canvas.classList.remove('hidden');
                    element.dataset.minimized = 'false';
                } else {
                    console.log(element.dataset.minimized, 'isnot');
                    canvas.classList.add('hidden');
                    element.dataset.minimized = 'true';
                }
            });

            control.putData('button', element);
        });

        node.addControl(minimizeButton);

        node.data.activeFile = null;

        const input = new D3NE.Input('CinemaDB', nodeEditor.sockets.CINEMA_DB);

        node.addInput(input);

        const output = new D3NE.Output('Points', nodeEditor.sockets.POINT_ARRAY);

        node.addOutput(output);

        return node;
    }

    /**
     * Node Editor Worker function
     * Loads the vtk file from input and draws the canvas
     * @param node {{id: number, data: {canvas: HTMLCanvasElement, context: CanvasRenderingContext2D}}}
     * @param inputs {any[][]}
     * @param outputs {any[][]}
     * @private
     */
    _worker(node, inputs, outputs) {
        /** @type {PersistenceRenderer} */
        const renderer = node.data.renderer;

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

        const fileName = `${inputs[0][0].caseName}_${inputs[0][0].timeStep}`;

        if (node.data.activeFile === fileName) {
            return;
        }

        renderer.load(`/share/vestec/data/persistence/export/${fileName}`).then(() => {
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
            builder: this._builder.bind(this),
            worker: this._worker.bind(this),
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
}

(() => {
    const persistenceNode = new PersistenceNode();

    nodeEditor.nodes.PersistenceNode = persistenceNode.getComponent();
})();
