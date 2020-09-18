/* global D3NE */

/**
 * HTML code for the node editor and the Critical Point render node.
 * It gets points stored in a JSON object as input
 */
class CriticalPointsNode {
  lastInputString = "";

  _builder(node) {
    const renderModeHtml = `<div class="row">
                <div class="col-5 text">Mode:</div>
                <select id="vis_mode_${node.id}" class="combobox col-7">
                    <option value="4">All</option>
                    <option value="0">Minima</option>
                    <option value="1">1-Saddle</option>
                    <option value="2">2-Saddle</option>
                    <option value="3">Maxima</option>
                </select>
            </div>`;

    const renderModeControl = new D3NE.Control(renderModeHtml, (element, control) => {
      // Initialize combobox for the visualization mode
      const select = $(element).find("#vis_mode_" + node.id);
      select.selectpicker();
      select.on("change", function() {
        window.callNative(
            "setCriticalPointsVisualizationMode", parseInt(node.id), parseInt($(this).val()));
      });
    });

    const sliderOptions = {
      start: 1,
      step: 0.1,
      snap: false,
      animate: false,
      range: {
        'min': 1,
        'max': 10,
      },
    };

    const heightControlHTML = `<div class="row">
                <div class="col-12 text text-left">Height Scale:</div>
                <div class="col-12 my-2">
                    <div id="height_scale_${node.id}"></div>
                </div> 
            </div>`;

    const heightControl = new D3NE.Control(heightControlHTML, (element, control) => {
      const heightScale = element.querySelector(`#height_scale_${node.id}`);

      noUiSlider.create(heightScale, sliderOptions);

      heightScale.noUiSlider.on('update', (value) => {
        window.callNative("setCriticalPointsHeightScale", parseInt(node.id), parseFloat(value));
      });
    });

    const widthControlHTML = `<div class="row">
                <div class="col-12 text text-left">Width Scale:</div>
                <div class="col-12 my-2">
                    <div id="width_scale_${node.id}"></div>
                </div>
            </div>`;

    const widthControl = new D3NE.Control(widthControlHTML, (element, control) => {
      const widthScale = element.querySelector(`#width_scale_${node.id}`);

      noUiSlider.create(widthScale, sliderOptions);

      widthScale.noUiSlider.on('update', (value) => {
        window.callNative("setCriticalPointsWidthScale", parseInt(node.id), parseFloat(value));
      });
    });

    node.addControl(renderModeControl);
    node.addControl(heightControl);
    node.addControl(widthControl);

    node.data.activeFile = null;

    const input = new D3NE.Input('Points', CosmoScout.vestec.sockets.POINT_ARRAY);

    node.addInput(input);

    return node;
  }

  /**
   * Node Editor Worker function
   * Loads the vtk file from input and draws the canvas
   * @param node {{id: number, data: {canvas: HTMLCanvasElement, context:
   * CanvasRenderingContext2D}}}
   * @param inputs {any[][]}
   * @param outputs {any[][]}
   * @private
   */
  _worker(node, inputs, outputs) {
    if (inputs[0].length === 0) {
      console.debug(`[CriticalPointsNode #${node.id}] Input Empty`);
      return;
    }

    if (this.lastInputString !== JSON.stringify(inputs[0][0])) {
      // Send points to C++ for rendering in OGL
      window.callNative("setPoints", node.id, JSON.stringify(inputs[0][0]));
      this.lastInputString = JSON.stringify(inputs[0][0]);
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

  CosmoScout.vestec.addNode('CriticalPointsNode', CPnode.getComponent());
})();
