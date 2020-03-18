/* global D3NE, nodeEditor, vtk, Selection */

/**
 * Node for reading and selecting the wildfire simulation data 
 */
class WildFireSourceNode {
   
    /**
     * Node Editor Component builder
     * @param node {{data: {}, addControl: Function, addOutput: Function, addInput: Function}}
     * @returns {*}
     * @private
     */
    _builder(node) {
        //Combobox for simulation mode selection
        const simulation_mode = new D3NE.Control(`<select id="simulation_mode_${node.id}" class="combobox"><option>none</option></select>`, (element, control) => {
            const select = $(element);
            select.selectpicker();
            
            //Read the files for the given simulation mode and fill combobox when mode is changed
            select.on("change", function () {
                //Now, since simulation mode changed, read the files for that simulation mode
                window.call_native("readSimulationFileNames", node.id, $( this ).val());

                if (typeof nodeEditor.engine !== 'undefined') {
                    nodeEditor.engine.process(nodeEditor.editor.toJSON());
                }
            });

            //Initially fill the combobox with simulation mode values (read from C++)
            window.call_native("readSimulationModes", parseInt(node.id), "");
        });
       

        //Combobox for file selection
        const simulation_file = new D3NE.Control(`<select id="simulation_file_${node.id}" class="combobox"><option>none</option></select>`, (element, control) => {
            const select = $(element);
            select.selectpicker();

            select.on("change", function () {
                //Forward file to output
                control.putData('simulationFile', $( this ).val());

                if (typeof nodeEditor.engine !== 'undefined') {
                    nodeEditor.engine.process(nodeEditor.editor.toJSON());
                }
            });
          
        });

        //Add control elements
        node.addControl(simulation_mode); 
        node.addControl(simulation_file);  
         
        //Define the output type
        const output = new D3NE.Output('TEXTURE', nodeEditor.sockets.TEXTURE);
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
        /** @type {wildFireNode} */
        if(node.data.simulationFile != undefined)
        {
            outputs[0] = node.data.simulationFile;
        }         
    }

    /**
     * Node Editor Component
     * @returns {D3NE.Component}
     * @throws {Error}
     */
    getComponent() {
        this._checkD3NE();

        return new D3NE.Component('WildFireSourceNode', {
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

    //Fill the combobox with the different simulation modes read from disc in c++
    static fillSimulationModes(id, simModes) {
        var json = JSON.parse(simModes);
        var liModes = "";

        for (var i = 0; i < json.length; i++) {
            var obj = json[i];
            var fileName = obj.split("/").pop();
            liModes += "<option value='" + obj + "'>" + fileName + "</option>";
        }

        $("body").find("#simulation_mode_" + id).html(liModes);
        $("body").find("#simulation_mode_" + id).selectpicker('refresh');
        $("body").find("#simulation_mode_" + id).trigger('change');
    } 
    
    //Fill the combobox with the different simulation output files per mode
    static fillSimulationOutputs(id, simOutputs) {
        var json = JSON.parse(simOutputs);
        var liOutputs = "";

        for (var i = 0; i < json.length; i++) {
            var obj = json[i];
            var modeName = obj.split("/").pop();
            liOutputs += "<option value='" + obj + "'>" + modeName + "</option>";
        }

        $("body").find("#simulation_file_" + id).html(liOutputs);
        $("body").find("#simulation_file_" + id).selectpicker('refresh');
        $("body").find("#simulation_file_" + id).trigger('change');
   }
}

(() => {
    const wildFireNode = new WildFireSourceNode();
    nodeEditor.nodes.WildFireSourceNode = wildFireNode.getComponent();
})();