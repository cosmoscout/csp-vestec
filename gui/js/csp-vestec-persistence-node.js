/* global D3NE, nodeEditor, vtkHttpDataSetReader */

class PersistenceNode {
    _chunks = 100;
    waitTime = 150;

    width = 500;
    height = 500;
    margin = 5;

    builder(node) {
        const control = new D3NE.Control(`<canvas id="persistence_canvas_${node.id}" class="hidden"></canvas>`, (element, control) => {
            element.width = this.width + 2 * this.margin;
            element.height = this.height + 2 * this.margin;
            element.classList.add('hidden');

            const context = element.getContext('2d');
            context.strokeStyle = '#000';

            control.putData('canvas', element);
            control.putData('context', context);
            control.putData('loaded', false);

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

    worker(node, inputs, _outputs) {
        console.log('Worker Called', inputs);

        const canvas = node.data.canvas;

        if (inputs[0].length === 0) {
            console.log('Input Empty');
            canvas.classList.add('hidden');
            return;
        }

        canvas.classList.remove('hidden');

        if (node.data.loaded) {
            console.log('already loaded');

            return;
        }
return;
        this._loadVtkData().then((data) => {
            node.data.bounds = data.bounds;
            node.data.points = data.points;
            node.data.pointChunks = data.pointChunks;

            node.data.pointChunks.forEach((pointArray, i) => {
                this._drawPoints(pointArray, node.data.context, node.data.bounds).then(() => {
                    console.log(`Canvas: ${i}`);
                    node.data.loaded = true;
                });
            });
        });
    }

    getComponent() {
        return new D3NE.Component('PersistenceNode', {
            builder: this.builder.bind(this),
            worker: this.worker.bind(this),
        });
    }

    _loadVtkData() {
        const reader = vtkHttpDataSetReader.newInstance({enableArray: true, fetchGzip: false});

        return new Promise((resolve, reject) => {
            reader.setUrl('http://localhost:8080/bla.json').then((reader) => {
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

                    console.log('VKT loaded');


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

    _waitFor = () => new Promise(r => setTimeout(r, this.waitTime));

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

            /*            this.context.beginPath();
                        this.context.ellipse(p1.x, p1.y, 2, 2, 0, 0, 2*Math.PI);
                        this.context.stroke();
                        this.context.beginPath();
                        this.context.ellipse(p2.x, p2.y, 2, 2, 0, 0, 2*Math.PI);
                        this.context.stroke();*/
            context.beginPath();
            context.moveTo(p1.x, p1.y);
            context.lineTo(p2.x, p2.y);
            context.stroke();
        });
    }

    get rangeXMin() {
        return this.margin;
    }

    get rangeXMax() {
        return this.width - this.margin;
    }

    get rangeYMin() {
        return this.height - this.margin;
    }

    get rangeYMax() {
        return this.margin;
    }

    static xMin(bounds) {
        return bounds[0];
    }

    static xMax(bounds) {
        return bounds[1];
    }

    static yMin(bounds) {
        return bounds[2];
    }

    static yMax(bounds) {
        return bounds[3];
    }

    xPos(x, bounds) {
        return (x - PersistenceNode.xMin(bounds)) / (PersistenceNode.xMax(bounds) - PersistenceNode.xMin(bounds)) * (this.rangeXMax - this.rangeXMin) + this.rangeXMin;
    }

    yPos(y, bounds) {
        // Y = (X-A)/(B-A) * (D-C) + C
        // ( (X-A)/(A-B) * (C-D) ) * -1 + D  - Inverse
        // A = Xmin B = Xmax
        // c = Range Min D = range max
        return (y - PersistenceNode.yMin(bounds)) / (PersistenceNode.yMax(bounds) - PersistenceNode.yMin(bounds)) * (this.rangeYMax - this.rangeYMin) + this.rangeYMin;
    }
}

(()=>{
    const persistenceNode = new PersistenceNode();

    nodeEditor.nodes.PersistenceNode = persistenceNode.getComponent();
})();
