/* global D3NE, vtk, Selection */

/**
 * Node for reading and selecting the wildfire simulation data
 */
class DiseasesSimulation {
  constructor() {
    this.animate = false;
  }

  static startAnimation(self, slider) {
    var timestep = slider.noUiSlider.get();
    if (parseInt(timestep) < 364) {
      slider.noUiSlider.set(parseInt(timestep) + 1);
    } else {
      slider.noUiSlider.set(0);
    }
    if (self.animate == true) {
      setTimeout(function() {
        DiseasesSimulation.startAnimation(self, slider)
      }, 60);
    }
  }

  /**
   * Builder function
   * Creates the simulation mode dropdown
   * Creates the info text for number of ensemble members
   * Create a slider to browse the days a year
   * Puts input content under node.data.fileNames
   */
  _builder(node) {

    // Define HTML elements
    var htmlInfo = '\
    <div class="row">\
        <div class="col-10 text">Ensemble members:</div>\
        <div class="col-2">\
            <div class="text" id="ensemble_num_' +
                   node.id + '"></div>\
        </div>\
    </div>';
    // Info for the number of ensembles
    const ensemble_control = new D3NE.Control(htmlInfo, (element, control) => {
      // Initialize data array to hold filenames
      control.putData('fileList', []);
    });
    node.addControl(ensemble_control);

    var htmlControl = '\
    <div>\
      <div class="row">\
        <div class="col-3 text">Mode:</div>\
        <select id="sim_mode_' +
                      node.id + '" class="combobox col-9"><option>none</option></select>\
      </div>\
      <div class="row">\
          <div class="col-3 text">Day:</div>\
            <div class="col-9">\
                <div id="slider_day' +
                      node.id + '">\
            </div>\
          </div>\
      </div>\
      <div class="row">\
        <button class="col-12" id="play_mode_' +
                      node.id + '">Play</button>\
      </div>\
    </div>';

    const simcontrol = new D3NE.Control(htmlControl, (element, control) => {
      // Initialize the combo box with the simulation modes
      const select = $(element).find("#sim_mode_" + node.id);
      select.selectpicker();

      // Initialize the slider
      const slider = element.querySelector("#slider_day" + node.id);
      noUiSlider.create(slider, {start: 1, step: 1, animate: false, range: {'min': 0, 'max': 364}});

      // When combo box changes update the files and number of ensemble info
      select.on("change", function() {
        console.log("Change combo box");
        // Updat the number of enseble members
        window.callNative("setNumberOfEnsembleMembers", parseInt(node.id), $(this).val());

        // Get the files for the simulation mode and timestep
        var timestep = $(element).find("#slider_day" + node.id).val();
        var simPath  = $(element).find("#sim_mode_" + node.id).val();
        window.callNative(
            "getFilesForTimeStep", parseInt(node.id), simPath.toString(), parseFloat(timestep));
      });

      // Event handling when slider changes
      slider.noUiSlider.on('set', function(values, handle) {
        var timestep = values[handle];
        var simPath  = $(element).find("#sim_mode_" + node.id).val();
        window.callNative(
            "getFilesForTimeStep", parseInt(node.id), simPath.toString(), parseFloat(timestep));
      });

      var self         = this;
      const playButton = $(element).find("#play_mode_" + node.id);
      console.log("Button: " + playButton);
      playButton.click(function() {
        if (self.animate == false) {
          $(element).find("#play_mode_" + node.id).text("Pause");
          self.animate = true;
          const slider = element.querySelector("#slider_day" + node.id);
          DiseasesSimulation.startAnimation(self, slider);
        } else {
          $(element).find("#play_mode_" + node.id).text("Play");
          self.animate = false;
        }
      });

      // Call once for initialization
      window.callNative('readDiseasesSimulationModes', parseInt(node.id));
    });
    node.addControl(simcontrol);

    // Define the output type
    const output = new D3NE.Output('TEXTURE(s)', CosmoScout.vestec.sockets.TEXTURES);
    node.addOutput(output);
    return node;
  }

  /**
   * Node Editor Worker function
   * Loads the vtk file from input and draws the canvas
   * @param node {{id: number, data: empty}}
   * @param inputs {any[][]}
   * @param outputs {any[][]}
   * @private
   */
  _worker(node, inputs, outputs) {
    /** @type {DiseasesSimulation} */
    outputs[0] = node.data.fileList;
  }

  /**
   * Node Editor Component
   * @returns {D3NE.Component}
   * @throws {Error}
   */
  getComponent() {
    this._checkD3NE();

    return new D3NE.Component('DiseasesSimulation', {
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

  static setNumberOfEnsembleMembers(id, number) {
    $("body").find("#ensemble_num_" + id).html(number);
  }

  /**
   *
   */
  static fillSimModes(id, modes) {
    const json  = JSON.parse(modes);
    let liModes = "";

    for (let i = 0; i < json.length; i++) {
      var obj      = json[i];
      var fileName = obj.split("/").pop();
      liModes += "<option value='" + obj + "'>" + fileName + "</option>";
    }

    $("body").find("#sim_mode_" + id).html(liModes);
    $("body").find("#sim_mode_" + id).selectpicker('refresh');
    $("body").find("#sim_mode_" + id).trigger('change');
  }

  /**
   * Receive the filelist from c++
   */
  static setFileListForTimeStep(id, fileList) {
    const node = CosmoScout.vestec.editor.nodes.find(node => node.id === id);
    if (typeof node !== 'undefined') {
      node.data.fileList = [];
      const json         = JSON.parse(fileList);
      for (let i = 0; i < json.length; i++) {
        node.data.fileList.push(json[i]);
      }
    }
    // Files have changed trigger a processing step
    CosmoScout.vestec.updateEditor();
  }
}

(() => {
  const diseasesSim = new DiseasesSimulation();
  CosmoScout.vestec.addNode('DiseasesSimulation', diseasesSim.getComponent());
})();
