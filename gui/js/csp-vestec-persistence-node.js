/* global D3NE, nodeEditor, vtk, Selection */

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
    _margin = 10;

    /**
     * @param canvasWidth {number}[500] Canvas width in px
     * @param canvasHeight {number}[500] Canvas height in px
     * @param chunks {number}[100] Chunk bucket size for vtk points
     * @param waitTime {number}[150] Time in ms between each chunk draw
     * @param margin {number}[10] Inner margin of canvas
     */
    constructor(canvasWidth = 500, canvasHeight = 500, chunks = 100, waitTime = 150, margin = 10) {
        this._width = canvasWidth;
        this._height = canvasHeight;
        this._chunks = chunks;
        this._waitTime = waitTime;
        this._margin = margin;
    }

    /**
     * Component builder
     * Creates the canvas control element
     * Adds CINEMA_DB Input
     * Adds FILTER Output
     * @param node {{addControl: Function, addOutput: Function, addInput: Function}}
     * @returns {*}
     */
    builder(node) {
        const selection = this._createSelectionControl(node);
        const canvas = this._createCanvasControl(node);
        const slider = this._createPersistenceBoundsControl(node);

        node.addControl(selection);
        node.addControl(canvas);
        node.addControl(slider);

        const input = new D3NE.Input('CinemaDB', nodeEditor.sockets.CINEMA_DB);

        node.addInput(input);

        const output = new D3NE.Output('Points', nodeEditor.sockets.POINT_ARRAY);

        node.addOutput(output);

        return node;
    }

    /**
     * Worker function
     * Loads the vtk file from input and draws the canvas
     * @param node {{id: number, data:{canvas:HTMLCanvasElement, context:CanvasRenderingContext2D}}}
     * @param inputs {any[][]}
     * @param outputs {any[][]}
     */
    worker(node, inputs, outputs) {
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
            const {persistenceFilterBounds, lastPersistenceFilterBounds} = node.data;

            const filteredPoints = node.data.points.filter(point => {
                return point.persistence > persistenceFilterBounds.min && point.persistence < persistenceFilterBounds.max;
            });

            outputs[0] = this.filterSelection(node.data.selectionBounds, filteredPoints, node.data.bounds);

            if (typeof persistenceFilterBounds === 'undefined' || persistenceFilterBounds === lastPersistenceFilterBounds) {
                console.debug(`[Persistence Node #${node.id}] Canvas for file ${fileName} already active.`);
                return;
            }

            node.data.lastPersistenceFilterBounds = persistenceFilterBounds;

            Promise.all(this.draw(node.data.points, this._chunkPoints(filteredPoints), node.data.context, node.data.bounds)).then(() => {
                console.debug(`[Persistence Node #${node.id}] All filtered points drawn.`);
            });

            return;
        }

        node.data.hideSelection();

        this.loadVtkData(`/share/vestec/data/export/${fileName}`).then((data) => {
            node.data.bounds = data.bounds;
            node.data.points = data.points;
            node.data.pointChunks = data.pointChunks;

            outputs[0] = this.filterSelection(node.data.selectionBounds, data.points, data.bounds);

            Promise.all(this.draw(data.points, data.pointChunks, node.data.context, data.bounds)).then(() => {
                console.debug(`[Persistence Node #${node.id}] All points drawn.`);
                node.data.loaded = fileName;
                this._createPersistenceBoundsSlider(node, data.persistenceBounds);
            });
        });
    }

    /**
     *
     * @param selectionBounds {{start:number,end:number}}
     * @param points {{x1:number, y1:number, z1:number, x2:number, y2:number, z2:number, persistence: number}[]}
     * @param bounds {number[]}
     * @return {{x1:number, y1:number, z1:number, x2:number, y2:number, z2:number, persistence: number}[]}
     */
    filterSelection(selectionBounds, points, bounds) {
        if (typeof selectionBounds === 'undefined') {
            return points;
        }

        return points.filter(point => {
            return this.xPos(point.x1, bounds) >= selectionBounds.start && this.xPos(point.x1, bounds) <= selectionBounds.end;
        });
    }

    /**
     *
     * @param rawPoints {{x1:number, y1:number, z1:number, x2:number, y2:number, z2:number, persistence: number}[]}
     * @param pointChunks {{x1:number, y1:number, z1:number, x2:number, y2:number, z2:number, persistence: number}[][]}
     * @param context {CanvasRenderingContext2D}
     * @param bounds {number[]}
     * @return Promise[]
     * @private
     */
    draw(rawPoints, pointChunks, context, bounds) {
        context.clearRect(0, 0, this._width, this._height);

        this._drawLine(rawPoints, context, bounds);

        const promises = [];

        pointChunks.forEach((pointArray, i) => {
            console.debug(`Drawing point chunk ${i + 1} / ${pointChunks.length}`);
            promises.push(this._drawPoints(pointArray, context, bounds));
        });

        return promises;
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
     * @param fileName {string} Url
     * @returns {Promise<{
     * points:{x1:number, y1:number, z1:number, x2:number, y2:number, z2:number, persistence: number}[],
     * pointChunks:{x1:number, y1:number, z1:number, x2:number, y2:number, z2:number, persistence: number}[][],
     * bounds:number[],
     * outputData: {},
     * persistenceBounds: {min:number,max:number}
     * }>}
     * @private
     */
    loadVtkData(fileName) {
        const reader = vtk.IO.Core.vtkHttpDataSetReader.newInstance({enableArray: true, fetchGzip: false});

        return new Promise((resolve, reject) => {
            reader.setUrl(fileName).then((reader) => {
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

                            persistence: rawData[i + 4] - rawData[i + 1],
                        });
                    }

                    console.info(`VKT data for file ${fileName} loaded.`);

                    resolve({
                        points,
                        pointChunks: this._chunkPoints(points),
                        bounds: reader.getOutputData().getBounds(),
                        outputData: reader.getOutputData(),
                        persistenceBounds: points.reduce((acc, val) => {
                            acc.min = (acc.min === 0 || val.persistence < acc.min) ? val.persistence : acc.min;
                            acc.max = (acc.max === 0 || val.persistence > acc.max) ? val.persistence : acc.max;
                            return acc;
                        }, {min: 0, max: 0})
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
     * @returns {{x1:number, y1:number, z1:number, x2:number, y2:number, z2:number, persistence:number}[][]}
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
     * Creates a two-handled slider for computed persistence bounds
     * @param node {*} Node
     * @param persistenceBounds {{min:number, max:number}}
     * @private
     */
    _createPersistenceBoundsSlider(node, persistenceBounds) {
        const slider = document.getElementById(`bounds_slider_${node.id}`);

        if (slider !== null) {
            if (typeof slider.noUiSlider !== 'undefined') {
                slider.noUiSlider.destroy();
            }

            noUiSlider.create(slider, {
                start: [persistenceBounds.min, persistenceBounds.max],
                snap: false,
                animate: false,
                connect: true,
                range: persistenceBounds,
            });

            slider.noUiSlider.on('update', (values) => {
                if (typeof node !== 'undefined') {
                    node.data.persistenceFilterBounds = {
                        min: values[0],
                        max: values[1],
                    }
                } else {
                    console.error(`Node with id ${node.id} not found.`)
                }

            });

            slider.noUiSlider.on('set', () => {
                if (typeof nodeEditor.engine !== 'undefined') {
                    nodeEditor.engine.process(nodeEditor.editor.toJSON());
                }
            });
        }
    }

    /**
     * The selection rect
     *
     * @param node {*} Builder node
     * @return {D3NE.Control}
     * @private
     */
    _createSelectionControl(node) {
        return new D3NE.Control(`<div id="select_${node.id}"></div>`, (element, control) => {
            element.parentNode.style.padding = '0';

            Object.assign(element.style, {
                backgroundColor: 'rgba(221,221,225,0.8)',
                border: '1px solid #ddf',
                width: '0px',
                height: '0px',
                pointerEvents: 'none',
                mixBlendMode: 'difference',
                display: 'none',
                willChange: 'top, left, bottom, right, width, height',
                top: 0,
                left: 0,
                position: 'fixed'
            });

            control.putData('initSelection', (event, canvas) => {
                control.putData('selectionBounds', undefined);

                const x = (event.clientX - canvas.getBoundingClientRect().left) + canvas.offsetLeft;

                control.putData('startX', event.clientX);

                Object.assign(element.style, {
                    display: 'block',
                    width: '0px',
                    height: `${canvas.offsetHeight}px`,
                    top: `${canvas.offsetTop}px`,
                    left: `${x}px`
                });
            });

            control.putData('updateSelection', (event, canvas) => {
                if (event.buttons !== 1) {
                    return;
                }

                const startX = control.getData('startX');
                let style;

                if (event.clientX >= startX) {
                    element.style.removeProperty('right');
                    style = {
                        width: event.clientX - element.getBoundingClientRect().left + 'px',
                        left: `${(startX - canvas.getBoundingClientRect().left) + canvas.offsetLeft}px`
                    };
                } else {
                    element.style.removeProperty('left');
                    style = {
                        width: element.getBoundingClientRect().right - event.clientX + 'px',
                        right: `${(canvas.getBoundingClientRect().right - startX) + canvas.offsetLeft}px`
                    };
                }

                Object.assign(element.style, style);
            });

            control.putData('hideSelection', () => {
                Object.assign(element.style, {
                    display: 'none',
                });
            });

            control.putData('getSelection', (canvasRect) => {
                const start = Math.max(0, element.getBoundingClientRect().left - canvasRect.left - this._margin);
                const selection = {
                    start,
                    end: start + element.getBoundingClientRect().width,
                };

                control.putData('selectionBounds', selection);
            })
        });
    }

    /**
     * The canvas that contains the drawn points
     *
     * @param node {*} Builder node
     * @return {D3NE.Control}
     * @private
     */
    _createCanvasControl(node) {
        return new D3NE.Control(`<canvas id="persistence_canvas_${node.id}" class="hidden"></canvas>`, (element, control) => {
            element.width = this._width;
            element.height = this._height;
            element.classList.add('hidden');

            element.style.border = '1px solid rgba(221,221,255,0.5)';

            const context = element.getContext('2d');
            context.strokeStyle = 'rgb(221, 221, 255)';

            control.putData('canvas', element);
            control.putData('context', context);
            control.putData('loaded', null);

            element.addEventListener('mousedown', (e) => {
                e.stopPropagation();

                const initFn = control.getData('initSelection');
                initFn(e, element);
            });

            element.addEventListener('mouseup', () => {
                const selectFn = control.getData('getSelection');
                selectFn(element.getBoundingClientRect());

                if (typeof nodeEditor.engine !== 'undefined') {
                    nodeEditor.engine.process(nodeEditor.editor.toJSON());
                }
            });

            element.addEventListener('mousemove', (e) => {
                e.preventDefault();
                const updateFn = control.getData('updateSelection');
                updateFn(e, element);
            });

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
    }

    /**
     * Persistence Bounds control
     *
     * @see {_createPersistenceBoundsSlider}
     * @param node {*} Builder node
     * @return {D3NE.Control}
     * @private
     */
    _createPersistenceBoundsControl(node) {
        return new D3NE.Control(`<div id="bounds_slider_${node.id}" class="slider"></div>`, (_element, _control) => {
        });
    }

    /**
     * Draws the persistence line from min to max
     * @param points {{x1:number, y1:number, z1:number, x2:number, y2:number, z2:number}[]}
     * @param context {CanvasRenderingContext2D}
     * @param bounds {number[]}
     * @returns void
     * @private
     */
    _drawLine(points, context, bounds) {
        const first = points[0];
        let last = points[points.length - 1];

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
