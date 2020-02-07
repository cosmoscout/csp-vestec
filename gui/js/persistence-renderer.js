/* global noUiSlider, vtk */

/**
 * Persistence Point Tuple
 */
class PersistencePointTuple {
    /**
     * @type {number}
     */
    persistence;

    /*
     * Lower Point Position
     */
    /**
     * @type {number}
     */
    x1;

    /**
     * @type {number}
     */
    y1;

    /**
     * @type {number}
     */
    z1;

    /*
     * Upper Point Position
     */
    /**
     * @type {number}
     */
    x2;

    /**
     * @type {number}
     */
    y2;

    /**
     * @type {number}
     */
    z2;

    /**
     * @param x1 {number} x-Position of Point 1
     * @param y1 {number} y-Position of Point 1
     * @param z1 {number} z-Position of Point 1
     * @param x2 {number} x-Position of Point 2
     * @param y2 {number} y-Position of Point 2
     * @param z2 {number} z-Position of Point 2
     */
    constructor(x1, y1, z1, x2, y2, z2) {
        this.x1 = x1;
        this.y1 = y1;
        this.z1 = z1;

        this.x2 = x2;
        this.y2 = y2;
        this.z2 = z2;

        this.persistence = y2 - y1;
    }
}


class PersistenceRenderer {
    /**
     * @type {Element}
     * @private
     */
    _container;

    /**
     * ID added to canvas, slider and selection rect
     * @type {string}
     * @private
     */
    _id;

    /**
     * padding: Inner canvas padding
     * canvasWidth: Width of Canvas in px
     * canvasHeight: Height of Canvas in px
     * strokeColor: Canvas stroke color
     * chunks: Chunk bucket size for vtk points
     * waitTime: Time in ms between chunk draws
     *
     * @type {{
     * padding: number,
     * canvasWidth: number,
     * canvasHeight: number
     * strokeStyle: string,
     * chunks: number,
     * waitTime: number,
     * }}
     * @private
     */
    _defaultSettings = {
        padding: 10,

        canvasWidth: 500,
        canvasHeight: 500,
        strokeStyle: '',

        chunks: 100,
        waitTime: 150,
    };

    /**
     * @see {_defaultSettings}
     * @private
     */
    _settings = {};

    /**
     * Events dispatched on _container
     * @see {_container}
     *
     * vtkdataloaded: VTK File has been fully loaded and processed
     *
     * selectionstart: Mouse down on canvas
     * selectionend: Mouse up on canvas
     *
     * sliderdestroyed: Persistence bounds slider has been destroyed (happens upon loading a new vtk file)
     * slidercreated: Slider has been created (after new vtk file load)
     *
     * persistenceboundsupdating: Slider handles are changing (event details field contains handle values)
     * persistenceboundsset: Slider values set (event details field contains handle values)
     *
     * pointsdrawn: All vtk points drawn
     * filteredpointsdrawn: Filtered points drawn
     * pointscleared: Canvas cleared before re-draw
     *
     * @type {{pointsCleared: string, selectionStart: string, persistenceBoundsSet: string, vtkDataLoaded: string, sliderDestroyed: string, persistenceBoundsUpdating: string, selectionEnd: string, pointsDrawn: string, filteredPointsDrawn: string, sliderCreated: string}}
     * @private
     */
    _events = {
        vtkDataLoaded: 'vtkdataloaded',

        selectionStart: 'selectionstart',
        selectionEnd: 'selectionend',

        sliderDestroyed: 'sliderdestroyed',
        sliderCreated: 'slidercreated',

        persistenceBoundsUpdating: 'persistenceboundsupdating',
        persistenceBoundsSet: 'persistenceboundsset',

        pointsDrawn: 'pointsdrawn',
        filteredPointsDrawn: 'filteredpointsdrawn',
        pointsCleared: 'pointscleared',
    };


    /* Point Data */
    /**
     * Processed vtk points
     * @type {PersistencePointTuple[]}
     * @private
     */
    _points;

    /**
     * Chunked _points
     * @see {_chunkPoints}
     * @type {PersistencePointTuple[][]}
     * @private
     */
    _pointChunks;

    /**
     * VTK point bounds
     * Index: 0 - xMin | 1 - xMax | 2 - yMin | 3 - yMax | 4 - zMin | 5 zMax
     * @type {number[]}
     * @private
     */
    _bounds;

    /* Canvas Control */
    /**
     * @type {HTMLCanvasElement}
     * @private
     */
    _canvas;

    /**
     * @type {CanvasRenderingContext2D}
     * @private
     */
    _context;

    /* Selection Control */
    /**
     * @type {HTMLElement}
     * @private
     */
    _selectionRect;

    /**
     * Bounds of selection rectangle relative to the canvas
     * @type {{min: number, max: number}}
     * @private
     */
    _selectionBounds;

    /**
     * Selection starting x-position on canvas
     * @type {number}
     * @private
     */
    _selectionStart;

    /* Persistence Filter Control */
    /**
     * @type {HTMLElement}
     * @private
     */
    _slider;

    /**
     * @type {{min: number, max: number}}
     * @private
     */
    _persistenceBounds;

    /**
     * @type {{min: number, max: number}}
     * @private
     */
    _selectedPersistenceBounds;

    /**
     * @param container {string|HTMLElement} Query selector string or HTMLElement to place everything into
     * @param id {string}
     * @param settings {{}}
     * @throws {Error} If dependencies are not loaded
     */
    constructor(container, id, settings) {
        this._checkDependencies();

        if (typeof container === 'string') {
            const element = document.querySelector(container);
            if (element === null) {
                throw new Error(`Element with query selector ${container} not found.`);
            }

            this._container = element;
        } else if (container instanceof HTMLElement) {
            this._container = container;
        } else {
            throw new Error('Container is neither a string nor an instance of HTMLElement.');
        }

        this._id = id;

        Object.assign(this._settings, this._defaultSettings, settings);

        this._createSelectionRect();
        this._createCanvas();
        this._createPersistenceSlider();

        this._container.appendChild(this._selectionRect);
        this._container.appendChild(this._canvas);
        this._container.appendChild(this._slider);
    }

    /**
     * Loads the provided vtk file
     * Chunks points
     * @param fileName {string} Url
     * @returns {Promise<{
     * points: PersistencePointTuple[],
     * pointChunks: PersistencePointTuple[][],
     * bounds: number[],
     * outputData: {},
     * persistenceBounds: {min: number, max: number}
     * }>}
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
                        points.push(new PersistencePointTuple(
                            rawData[i],
                            rawData[i + 1],
                            rawData[i + 2],

                            rawData[i + 3],
                            rawData[i + 4],
                            rawData[i + 5],
                        ));
                    }

                    console.info(`VKT data for file ${fileName} loaded.`);

                    this._points = points;
                    this._pointChunks = this._chunkPoints(points);
                    this._bounds = reader.getOutputData().getBounds();
                    this._persistenceBounds = points.reduce((acc, val) => {
                        acc.min = (acc.min === 0 || val.persistence < acc.min) ? val.persistence : acc.min;
                        acc.max = (acc.max === 0 || val.persistence > acc.max) ? val.persistence : acc.max;
                        return acc;
                    }, {min: 0, max: 0});

                    this._container.dispatchEvent(new CustomEvent(this._events.vtkDataLoaded, {
                        detail: {
                            outputData: reader.getOutputData()
                        }
                    }));

                    this._initSlider();

                    resolve({
                        points,
                        pointChunks: this._pointChunks,
                        bounds: this._bounds,
                        outputData: reader.getOutputData(),
                        persistenceBounds: this._persistenceBounds
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
     * Renders _pointChunks to canvas
     * @see {_pointChunks}
     * @return {Promise<void>}
     */
    render() {
        this._canvas.classList.remove('hidden');
        return this._draw(this._pointChunks);
    }

    /**
     * Filters points by persistence and selection
     * @return {PersistencePointTuple[]}
     */
    filteredPoints() {
        return this._filterPersistence(this._filterSelection(this._points));
    }


    /**
     * Returns filtered points in selection rect area
     * @param points {PersistencePointTuple[]}
     * @return {PersistencePointTuple[]}
     */
    _filterSelection(points) {
        if (typeof this._selectionBounds === 'undefined') {
            return points;
        }

        return points.filter(point => this.xPos(point.x1) >= this._selectionBounds.start && this.xPos(point.x1) <= this._selectionBounds.end);
    }

    /**
     * Returns filtered points with persistence >= slider values <=
     * @param points
     * @return {PersistencePointTuple[]}
     * @private
     */
    _filterPersistence(points) {
        if (typeof this._selectedPersistenceBounds === 'undefined') {
            return points;
        }

        return points.filter(point => {
            return point.persistence >= Number(this._selectedPersistenceBounds.min) && point.persistence <= Number(this._selectedPersistenceBounds.max);
        });
    }

    /**
     *
     * @param pointChunks {PersistencePointTuple[][]}
     * @return Promise<void>
     */
    _draw(pointChunks) {
        this._container.dispatchEvent(new Event(this._events.pointsCleared));
        this._context.clearRect(0, 0, this._settings.canvasWidth, this._settings.canvasHeight);

        this._drawLine();

        const promises = [];

        pointChunks.forEach((pointArray, i) => {
            console.debug(`Drawing point chunk ${i + 1} / ${pointChunks.length}`);
            promises.push(this._drawPoints(pointArray));
        });

        const promiseAll = Promise.all(promises);

        promiseAll.then(() => {
            this._container.dispatchEvent(new Event(this._events.pointsDrawn));
        });

        return promiseAll;
    }

    /**
     * Chunks vtk points into buckets of size _chunks
     * @see {_chunks}
     * @returns {PersistencePointTuple[][]}
     * @private
     */
    _chunkPoints(points) {
        return points.reduce((resultArray, item, index) => {
            const chunkIndex = Math.floor(index / this._settings.chunks);

            if (!resultArray[chunkIndex]) {
                resultArray[chunkIndex] = [] // start a new chunk
            }

            resultArray[chunkIndex].push(item);

            return resultArray;
        }, []);
    }

    _waitFor = () => new Promise(r => setTimeout(r, this._settings.waitTime));

    /**
     * Asynchronously draws points on the context
     * @param points {PersistencePointTuple[]}
     * @returns {Promise<void>}
     * @private
     */
    async _drawPoints(points) {
        await this._waitFor();

        points.forEach(point => {
            const p1 = {
                x: this.xPos(point.x1, this._bounds),
                y: this.yPos(point.y1, this._bounds)
            };
            const p2 = {
                x: this.xPos(point.x2, this._bounds),
                y: this.yPos(point.y2, this._bounds)
            };

            this._context.beginPath();
            this._context.moveTo(p1.x, p1.y);
            this._context.lineTo(p2.x, p2.y);
            this._context.stroke();
        });
    }

    /**
     * Creates a two-handled slider for computed persistence bounds
     * @private
     */
    _initSlider() {
        const {_slider} = this;

        if (typeof _slider.noUiSlider !== 'undefined') {
            _slider.noUiSlider.destroy();
            this._selectedPersistenceBounds = undefined;
            this._container.dispatchEvent(new Event(this._events.sliderDestroyed));
        }

        noUiSlider.create(_slider, {
            start: [this._persistenceBounds.min, this._persistenceBounds.max],
            snap: false,
            animate: false,
            connect: true,
            range: this._persistenceBounds,
        });
        this._container.dispatchEvent(new Event(this._events.sliderCreated));

        _slider.noUiSlider.on('update', (values) => {
            this._selectedPersistenceBounds = {
                min: values[0],
                max: values[1],
            };

            this._container.dispatchEvent(new CustomEvent(this._events.persistenceBoundsUpdating, {detail: this._selectedPersistenceBounds}))
        });

        _slider.noUiSlider.on('set', (values) => {
            this._container.dispatchEvent(new CustomEvent(this._events.persistenceBoundsSet, {
                detail: {
                    min: values[0],
                    max: values[1],
                }
            }));

            this._pointChunks = this._chunkPoints(this.filteredPoints());
            this.render().then(() => {
                this._container.dispatchEvent(new Event(this._events.filteredPointsDrawn));
            });
        });
    }

    /**
     * The canvas that contains the drawn points
     *
     * @return {void}
     * @private
     */
    _createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.id = `persistence_canvas_${this._id}`;

        canvas.classList.add('persistence_canvas', 'hidden');
        canvas.width = this._settings.canvasWidth;
        canvas.height = this._settings.canvasHeight;

        const context = canvas.getContext('2d');
        context.strokeStyle = this._settings.strokeStyle;

        this._canvas = canvas;
        this._context = context;
    }

    _createPersistenceSlider() {
        const slider = document.createElement('div');
        slider.id = `persistence_slider_${this._id}`;

        slider.classList.add('persistence_slider');

        this._slider = slider;
    }

    /**
     * Resizable rect for point selection
     *
     * @return {void}
     * @private
     */
    _createSelectionRect() {
        const selectionRect = document.createElement('div');
        selectionRect.id = `persistence_selection_${this._id}`;

        selectionRect.classList.add('persistence_selection');

        Object.assign(selectionRect.style, {
            backgroundColor: 'rgba(221,221,225,0.8)',
            border: '1px solid #ddf',
            width: '0px',
            height: '0px',
            mixBlendMode: 'difference',
            display: 'none',
            willChange: 'top, left, bottom, right, width, height',
            top: 0,
            left: 0,
            position: 'absolute',
            zIndex: 1,
        });

        selectionRect.addEventListener('click', () => {
            this.hideSelection();
        });

        this._selectionRect = selectionRect;
    }

    initSelection(event) {
        const x = (event.clientX - this._canvas.getBoundingClientRect().left) + this._canvas.offsetLeft;

        this._selectionStart = event.clientX;

        Object.assign(this._selectionRect.style, {
            display: 'block',
            width: '0px',
            height: `${this._canvas.offsetHeight}px`,
            top: `${this._canvas.offsetTop}px`,
            left: `${x}px`,
        });
    }

    updateSelection(event) {
        if (event.buttons !== 1) {
            return;
        }

        let style;

        if (event.clientX >= this._selectionStart) {
            this._selectionRect.style.removeProperty('right');
            style = {
                width: event.clientX - this._selectionRect.getBoundingClientRect().left + 'px',
                left: `${(this._selectionStart - this._canvas.getBoundingClientRect().left) + this._canvas.offsetLeft}px`,
            };
        } else {
            this._selectionRect.style.removeProperty('left');
            style = {
                width: this._selectionRect.getBoundingClientRect().right - event.clientX + 'px',
                right: `${(this._canvas.getBoundingClientRect().right - this._selectionStart) + this._canvas.offsetLeft}px`,
            };
        }

        Object.assign(this._selectionRect.style, style);
    }

    hideSelection() {
        Object.assign(this._selectionRect.style, {
            display: 'none',
            width: 0,
        });

        this._selectionBounds = undefined;
    }

    getSelectionBounds() {
        if (this._selectionRect.style.display === 'none') {
            this._selectionBounds = undefined;
            return;
        }

        const start = Math.max(0, this._selectionRect.getBoundingClientRect().left - this._canvas.getBoundingClientRect().left - this._settings.padding);
        this._selectionBounds = {
            start,
            end: start + this._selectionRect.getBoundingClientRect().width,
        };
    }


    /**
     * Draws the persistence line from min to max
     * @returns void
     * @private
     */
    _drawLine() {
        const first = this._points[0];
        let last = this._points[this._points.length - 1];

        this._context.beginPath();
        this._context.moveTo(
            this.xPos(first.x1, this._bounds),
            this.yPos(first.y1, this._bounds)
        );
        this._context.lineTo(
            this.xPos(last.x1, this._bounds),
            this.yPos(last.y1, this._bounds)
        );
        this._context.stroke();
    }

    /**
     * Axis x-range start
     * @returns {number}
     */
    get rangeXMin() {
        return this._settings.padding;
    }

    /**
     * Axis x-range end
     * @returns {number}
     */
    get rangeXMax() {
        return this._settings.canvasWidth - this._settings.padding;
    }

    /**
     * Axis y-range start
     * @returns {number}
     */
    get rangeYMin() {
        return this._settings.canvasHeight - this._settings.padding;
    }

    /**
     * Axis y-range end
     * @returns {number}
     */
    get rangeYMax() {
        return this._settings.padding;
    }

    /**
     * Bounds x-min
     * @returns {number}
     */
    xMin() {
        return this._bounds[0];
    }

    /**
     * Bounds x-max
     * @returns {number}
     */
    xMax() {
        return this._bounds[1];
    }

    /**
     * Bounds y-min
     * @returns {number}
     */
    yMin() {
        return this._bounds[2];
    }

    /**
     * Bounds y-max
     * @returns {number}
     */
    yMax() {
        return this._bounds[3];
    }

    /**
     * Maps a point x-position from 0-1 to canvas width
     * @param x {number} Point form 0 - 1
     * @returns {number} Mapped point
     */
    xPos(x) {
        return (x - this.xMin()) / (this.xMax() - this.xMin()) * (this.rangeXMax - this.rangeXMin) + this.rangeXMin;
    }

    /**
     * Maps a point y-position from 0-1 to canvas height
     * @param y {number} Point form 0 - 1
     * @returns {number} Mapped point
     */
    yPos(y) {
        // Y = (X-A)/(B-A) * (D-C) + C
        // ( (X-A)/(A-B) * (C-D) ) * -1 + D  - Inverse
        // A = Xmin B = Xmax
        // c = Range Min D = range max
        return (y - this.yMin()) / (this.yMax() - this.yMin()) * (this.rangeYMax - this.rangeYMin) + this.rangeYMin;
    }

    _checkDependencies() {
        if (typeof vtk === 'undefined') {
            throw new Error('VTK.js is required.');
        }

        if (typeof noUiSlider === 'undefined') {
            throw new Error('noUiSlider is required');
        }
    }
}