//Namespace
var CinemaDBNode = {};

//Fill the case names (different simulation runs)
CinemaDBNode.fillCaseNames = function (id, caseNames) {
    console.log(caseNames);
    var json = JSON.parse(caseNames);
    var liSimulations = "";

    for (var i = 0; i < json.length; i++) {
        var obj = json[i];
        liSimulations += "<option>" + obj + "</option>";
    }

    $("body").find("#case_names_" + id).html(liSimulations);
    $("body").find("#case_names_" + id).selectpicker('refresh');

    console.log("Element" + $("#body").find("#case_names_" + id).text());
}

CinemaDBNode.createSlider = function (id, args) {
    var json = JSON.parse(args);

    var rangers = {}
    var min = json[0];
    var max = json[1];
    rangers['min'] = [min];
    for (i = 2; i < json.length; ++i) {
        var prozent = (json[i] - min) / (max - min) * 100;
        if (i < json.length - 1) { rangers[prozent + '%'] = [json[i], json[i + 1] - json[i]] }
    }
    rangers['max'] = [max];

    //Initialize slider
    var query = "#time_slider_" + id;
    const slider = document.body.querySelector(query);
    console.log("Object qith query:" + query + " : " + slider);
    console.log("Array:" + rangers.toString());
    noUiSlider.create(slider, {
        start: 10,
        snap: true,
        animate: false,
        range: rangers
    });
}

//Now define the node itself
nodeEditor.nodes.CinemaDBNode = new D3NE.Component('CinemaDBNode', {
    builder(node) {
        var out1 = new D3NE.Output("CINEMA_DB", nodeEditor.sockets.CINEMA_DB);

        var htmlText = '\
        <div>\
        <select id="case_names_'+ node.id + '" class="combobox"><option>none</option></select>\
        <div id="time_slider_'+ node.id + '" class="slider"></div>\
        </div>';

        var numControl = new D3NE.Control(htmlText,
            (el, control) => {
                //Initialize combobox
                $("body").find("#case_names_" + node.id).selectpicker();

                window.call_native("readCaseNames", node.id, "");

                window.call_native("getTimeSteps", node.id, "");

                function upd() {
                    console.log("Combo value " + $(el).val());
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