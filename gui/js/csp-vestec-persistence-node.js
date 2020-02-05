/* global D3NE, nodeEditor, vtk */

/**
 * Node drawing a persistence diagram for a given vtk file
 * VTK File containing an array of points
 */
class PersistenceNode {
    /**
     * Chunk bucket size
     * @type {number}
     * @private
     */
    _chunks = 100;

    /**
     * Wait time in ms before drawing next chunk
     * @private
     * @type {number}
     */
    _waitTime = 150;

    /**
     * Canvas width in px
     * @type {number}
     * @private
     */
    _width = 500;

    /**
     * Canvas height in px
     * @type {number}
     * @private
     */
    _height = 500;

    /**
     * Margin in px of canvas
     * @type {number}
     * @private
     */
    _margin = 0;

    /**
     * Component builder
     * Creates the canvas control element
     * Adds CINEMA_DB Input
     * Adds FILTER Output
     * @param node
     * @returns {*}
     */
    builder(node) {
        const control = new D3NE.Control(`<canvas id="persistence_canvas_${node.id}" class="hidden"></canvas>`, (element, control) => {
            element.width = this._width + 2 * this._margin;
            element.height = this._height + 2 * this._margin;
            element.classList.add('hidden');

            element.style.border = '1px solid rgba(221,221,255,0.5)';
            element.style.marginTop = '8px';

            const context = element.getContext('2d');
            context.strokeStyle = 'rgb(221, 221, 255)';

            control.putData('canvas', element);
            control.putData('context', context);
            control.putData('loaded', null);

            // A rather hacky approach to reflow the canvas on node move
            const observer = new MutationObserver(function (mutations) {
                mutations.forEach(() => {
                    element.style.display = 'none';
                    void element.offsetHeight;
                    element.style.display = 'block';
                });
            });

            observer.observe(node.el, {attributes: true, attributeFilter: ['style']});
        });

        node.addControl(control);

        const input = new D3NE.Input('CinemaDB', nodeEditor.sockets.CINEMA_DB);

        node.addInput(input);

        return node;
    }

    /**
     * Worker function
     * Loads the vtk file from input and draws the canvas
     * @param node {{id: number, data:{canvas:HTMLCanvasElement, context:CanvasRenderingContext2D}}}
     * @param inputs {any[][]}
     * @param _outputs {any[][]}
     */
    worker(node, inputs, _outputs) {
        const canvas = node.data.canvas;

        if (inputs[0].length === 0) {
            console.debug(`[Persistence Node #${node.id}] Input Empty`);
            canvas.classList.add('hidden');
            return;
        }

        if (inputs[0][0] === null) {
            console.warn(`[Persistence Node #${node.id}] Case name or time step undefined.`);
            return;
        }

        const fileName = `${inputs[0][0].caseName}_${inputs[0][0].timeStep}`;

        canvas.classList.remove('hidden');

        if (node.data.loaded === fileName) {
            console.debug(`[Persistence Node #${node.id}] Canvas for file ${fileName} already active.`);

            return;
        }

        node.data.context.clearRect(0, 0, this._width, this._height);

        this._loadVtkData(fileName).then((data) => {
            node.data.bounds = data.bounds;
            node.data.points = data.points;
            node.data.pointChunks = data.pointChunks;

            this._drawLine(data.pointChunks, node.data.context, data.bounds);

            const promises = [];

            node.data.pointChunks.forEach((pointArray, i) => {
                console.debug(`[Persistence Node #${node.id}] Drawing point chunk ${i + 1} / ${node.data.pointChunks.length}`);
                promises.push(this._drawPoints(pointArray, node.data.context, node.data.bounds));
            });

            Promise.all(promises).then(() => {
                console.debug(`[Persistence Node #${node.id}] All points drawn.`);
                node.data.loaded = fileName;
            });
        });
    }

    /**
     * Component accessor
     * @returns {D3NE.Component}
     */
    getComponent() {
        return new D3NE.Component('PersistenceNode', {
            builder: this.builder.bind(this),
            worker: this.worker.bind(this),
        });
    }

    /**
     * Loads the provided vtk file
     * Chunks points
     * @param fileName
     * @returns {Promise<{points:{x1:number, y1:number, z1:number, x2:number, y2:number, z2:number}[], pointChunks:{x1:number, y1:number, z1:number, x2:number, y2:number, z2:number}[][], bounds:number[]}>}}
     * @private
     */
    _loadVtkData(fileName) {
        const reader = vtk.IO.Core.vtkHttpDataSetReader.newInstance({enableArray: true, fetchGzip: false});

        return new Promise((resolve, reject) => {
            reader.setUrl(`/share/vestec/data/export/${fileName}`).then((reader) => {
                reader.loadData().then(() => {
                    const rawData = reader.getOutputData().getPoints().getData();

                    if (rawData.length % 3 !== 0) {
                        throw new Error("Number of points not dividable by 3.");
                    }

                    let points = [];
                    for (let i = 0; i < rawData.length; i = i + 6) {
                        points.push({
                            x1: rawData[i],
                            y1: rawData[i + 1],
                            z1: rawData[i + 2],

                            x2: rawData[i + 3],
                            y2: rawData[i + 4],
                            z2: rawData[i + 5],
                        });
                    }

                    console.info(`VKT data for file ${fileName} loaded.`);

                    resolve({
                        points,
                        pointChunks: this._chunkPoints(points),
                        bounds: reader.getOutputData().getBounds()
                    });
                }).catch(() => {
                    reject();
                });
            }).catch(() => {
                reject();
            });
        });

    }

    /**
     * Chunks vtk points into buckets of size _chunks
     * @see {_chunks}
     * @param points
     * @returns {{x1:number, y1:number, z1:number, x2:number, y2:number, z2:number}[][]}
     * @private
     */
    _chunkPoints(points) {
        return points.reduce((resultArray, item, index) => {
            const chunkIndex = Math.floor(index / this._chunks);

            if (!resultArray[chunkIndex]) {
                resultArray[chunkIndex] = [] // start a new chunk
            }

            resultArray[chunkIndex].push(item);

            return resultArray;
        }, []);
    }

    _waitFor = () => new Promise(r => setTimeout(r, this._waitTime));

    /**
     * Asynchronously draws points on the context
     * @param points {{x1:number, y1:number, z1:number, x2:number, y2:number, z2:number}[]}
     * @param context {CanvasRenderingContext2D}
     * @param bounds {number[]}
     * @returns {Promise<void>}
     * @private
     */
    async _drawPoints(points, context, bounds) {
        await this._waitFor();

        points.forEach(point => {
            const p1 = {
                x: this.xPos(point.x1, bounds),
                y: this.yPos(point.y1, bounds)
            };
            const p2 = {
                x: this.xPos(point.x2, bounds),
                y: this.yPos(point.y2, bounds)
            };

            context.beginPath();
            context.moveTo(p1.x, p1.y);
            context.lineTo(p2.x, p2.y);
            context.stroke();
        });
    }

    /**
     * Draws the persistence line from min to max
     * @param points {{x1:number, y1:number, z1:number, x2:number, y2:number, z2:number}[][]}
     * @param context {CanvasRenderingContext2D}
     * @param bounds {number[]}
     * @returns void
     * @private
     */
    _drawLine(points, context, bounds) {
        const first = points[0][0];
        let last = points[points.length - 1];
        last = last[last.length - 1];

        context.beginPath();
        context.moveTo(
            this.xPos(first.x1, bounds),
            this.yPos(first.y1, bounds)
        );
        context.lineTo(
            this.xPos(last.x1, bounds),
            this.yPos(last.y1, bounds)
        );
        context.stroke();
    }

    /**
     * Axis x-range start
     * @returns {number}
     */
    get rangeXMin() {
        return this._margin;
    }

    /**
     * Axis x-range end
     * @returns {number}
     */
    get rangeXMax() {
        return this._width - this._margin;
    }

    /**
     * Axis y-range start
     * @returns {number}
     */
    get rangeYMin() {
        return this._height - this._margin;
    }

    /**
     * Axis y-range end
     * @returns {number}
     */
    get rangeYMax() {
        return this._margin;
    }

    /**
     * Bounds x-min
     * @param bounds {number[]}
     * @returns {number}
     */
    static xMin(bounds) {
        return bounds[0];
    }

    /**
     * Bounds x-max
     * @param bounds {number[]}
     * @returns {number}
     */
    static xMax(bounds) {
        return bounds[1];
    }

    /**
     * Bounds y-min
     * @param bounds {number[]}
     * @returns {number}
     */
    static yMin(bounds) {
        return bounds[2];
    }

    /**
     * Bounds y-max
     * @param bounds {number[]}
     * @returns {number}
     */
    static yMax(bounds) {
        return bounds[3];
    }

    /**
     * Maps a point x-position from 0-1 to canvas width
     * @param x {number} Point form 0 - 1
     * @param bounds {number[]}
     * @returns {number} Mapped point
     */
    xPos(x, bounds) {
        return (x - PersistenceNode.xMin(bounds)) / (PersistenceNode.xMax(bounds) - PersistenceNode.xMin(bounds)) * (this.rangeXMax - this.rangeXMin) + this.rangeXMin;
    }

    /**
     * Maps a point y-position from 0-1 to canvas height
     * @param y {number} Point form 0 - 1
     * @param bounds {number[]}
     * @returns {number} Mapped point
     */
    yPos(y, bounds) {
        // Y = (X-A)/(B-A) * (D-C) + C
        // ( (X-A)/(A-B) * (C-D) ) * -1 + D  - Inverse
        // A = Xmin B = Xmax
        // c = Range Min D = range max
        return (y - PersistenceNode.yMin(bounds)) / (PersistenceNode.yMax(bounds) - PersistenceNode.yMin(bounds)) * (this.rangeYMax - this.rangeYMin) + this.rangeYMin;
    }
}

(() => {
    const persistenceNode = new PersistenceNode();

    nodeEditor.nodes.PersistenceNode = persistenceNode.getComponent();
})();
