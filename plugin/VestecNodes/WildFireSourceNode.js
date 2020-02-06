//Namespace
var WildFireSourceNode = {};

//Fill the combobox with the different simulation modes
WildFireSourceNode.fillSimulationModes = function (id, simModes) {
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

//Fill the combobox with the different simulation outputs per mode
WildFireSourceNode.fillSimulationOutputs = function (id, simOutputs) {
    var json = JSON.parse(simOutputs);
    var liOutputs = "";

    for (var i = 0; i < json.length; i++) {
        var obj = json[i];
        var modeName = obj.split("/").pop();
        liOutputs += "<option value='" + obj + "'>" + modeName + "</option>";
    }

    $("body").find("#simulation_output_" + id).html(liOutputs);
    $("body").find("#simulation_output_" + id).selectpicker('refresh');
    $("body").find("#simulation_output_" + id).trigger('change');
}

//Now define the node itself
nodeEditor.nodes.WildFireSourceNode = new D3NE.Component('WildFireSourceNode', {
    builder(node) {
        var out1 = new D3NE.Output("TEXTURE", nodeEditor.sockets.TEXTURE);

        var htmlText = '\
            <div>\
            <select id="simulation_mode_'+ node.id + '" class="combobox"><option>none</option></select>\
            <select id="simulation_output_'+ node.id + '" class="combobox"><option>none</option></select>\
            </div>';

        var numControl = new D3NE.Control(htmlText,
            (el, control) => {
                //Initialize comboboxes
                $(el).find("#simulation_mode_" + node.id).selectpicker();
                $(el).find("#simulation_output_" + node.id).selectpicker();

                //Read the files for the given simulation mode and fill combobox when mode is changed
                $(el).find("#simulation_mode_" + node.id).on("change", function () {
                    window.call_native("readSimulationFileNames", node.id, $(this).val());
                });

                //Fill the comboboxes with simulation mode values (read from C++)
                window.call_native("readSimulationModes", node.id, "");

                //Update the output when combobox changes
                $(el).find("#simulation_output_" + node.id).on("change", function () { upd(); });

                //forward data to output
                function upd() {
                    var fileName = $(el).find("#simulation_output_" + node.id).val();
                    control.putData("data", fileName);
                    if (nodeEditor.engine) nodeEditor.engine.process(nodeEditor.editor.toJSON()); 
                }
            }
        );

        return node.addControl(numControl).addOutput(out1);
    },
    worker(node, inputs, outputs) {
        outputs[0] = node.data.data;
    }
});