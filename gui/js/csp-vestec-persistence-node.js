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
        const control = new D3NE.Control('<div></div>', (element, control) => {
            const renderer = new PersistenceRenderer(element, node.id, {
                strokeStyle: 'rgb(221, 221, 255)'
            });

            element.addEventListener('slidercreated', () => {
                console.log('slidercreated');
            });
            element.addEventListener('persistenceboundsupdating', (e) => {
                console.log('persistenceboundsupdating', e);
            });
            element.addEventListener('persistenceboundsset', (e) => {
                console.log('persistenceboundsset', e);
            });
            element.addEventListener('pointscleared', (e) => {
                console.log('pointscleared');
            });
            element.addEventListener('pointsdrawn', (e) => {
                console.log('pointsdrawn');
            });
            element.addEventListener('filteredpointsdrawn', (e) => {
                console.log('filteredpointsdrawn');
            });

            control.putData('renderer', renderer);
        });

        node.addControl(control);

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

            return;
        }

        if (inputs[0][0] === null) {
            console.warn(`[Persistence Node #${node.id}] Case name or time step undefined.`);
            return;
        }

        const fileName = `${inputs[0][0].caseName}_${inputs[0][0].timeStep}`;

        if (node.data.activeFile === fileName) {
            return;
        }

        renderer.loadVtkData(`/share/vestec/data/export/${fileName}`).then((data) => {
            renderer.render(data.pointChunks).then(() => {
                node.data.activeFile = fileName;
            });
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
