/* global D3NE */

/**
 * HTML code for the node editor and the Critical Point render node.
 * It gets points stored in a JSON object as input
 */
class CriticalPointsNode {

    _builder(node) {
        const control = new D3NE.Control('<div>CriticalPoints</div>', (element, control) => {
            const color = 'rgb(221, 221, 255)';
        });

        node.addControl(control);

        node.data.activeFile = null;

        const input = new D3NE.Input('Points', nodeEditor.sockets.POINT_ARRAY);

        node.addInput(input);

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
        if (inputs[0].length === 0) {
            console.debug(`[CriticalPointsNode #${node.id}] Input Empty`);
            return;
        }else{
            console.log(`[CriticalPointsNode #${node.id}] Got `+inputs[0][0].length+` critical points`);
             //Send points to C++ for rendering in OGL
             window.call_native("setPoints", node.id, JSON.stringify(inputs[0][0]));
        }

    }

    /**
     * Node Editor Component
     * @returns {D3NE.Component}
     * @throws {Error}
     */
    getComponent() {
        this._checkD3NE();

        return new D3NE.Component('CriticalPointsNode', {
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
    const CPnode = new CriticalPointsNode();

    nodeEditor.nodes.CriticalPointsNode = CPnode.getComponent();
})();
