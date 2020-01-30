//Namespace
var WildFireSourceNode = {};

//Fill the combobox with the different simulation modes
WildFireSourceNode.fillSimulationModes = function (id, simModes) {
    console.log("Adding simulation modes" + simModes);
    var json = JSON.parse(simModes);
    var liModes = "";

    for (var i = 0; i < json.length; i++) {
        var obj = json[i];
        var fileName = obj.split("/").pop();
        liModes += "<option value='"+obj+"'>" + fileName + "</option>";
    }

    $("body").find("#simulation_mode_" + id).html(liModes);
    $("body").find("#simulation_mode_" + id).selectpicker('refresh');
}

//Fill the combobox with the different simulation outputs per mode
WildFireSourceNode.fillSimulationOutputs = function (id, simOutputs) {
    console.log("Adding simulation outputs" + simOutputs);
    var json = JSON.parse(simOutputs);
    var liOutputs = "";

    for (var i = 0; i < json.length; i++) {
        var obj = json[i];
        var modeName = obj.split("/").pop();
        liOutputs += "<option value='"+obj+"'>" + modeName + "</option>";
    }

    $("body").find("#simulation_output_" + id).html(liOutputs);
    $("body").find("#simulation_output_" + id).selectpicker('refresh');
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
                $("body").find("#simulation_mode_" + node.id).selectpicker();
                $("body").find("#simulation_output_" + node.id).selectpicker();

                //Fill the comboboxes with values (read from C++)
                window.call_native("readSimulationModes", node.id, "");
                window.call_native("readSimulationFileNames", node.id, "");

                function upd() {
                    //console.log("Combo value "+$( el ).val());
                    //control.putData("data", JSON.stringify(strJSON["simulations"][i][$( el ).val()]));
                }

                //Forward the first simulation
                upd();
            }
        );

        return node.addControl(numControl).addOutput(out1);
    },
    worker(node, inputs, outputs) {
        outputs[0] = node.data.data;
    }
});