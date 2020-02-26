//Namespace
var RenderNode2D = {};


//Now define the node itself
nodeEditor.nodes.RenderNode2D = new D3NE.Component('RenderNode2D', {
    builder(node) {
        var inputConnection = new D3NE.Input("TEXTURE", nodeEditor.sockets.TEXTURE);

        var htmlText = '\
            <div class="row">\
                    <div class="col-6 text">Opacity:</div>\
                    <div class="col-6">\
                        <div id="slider_opacity'+node.id+'"></div>\
                    </div>\
                    <div class="col-2">\
                        <label class="checklabel">\
                            <input type="checkbox" id="set_enable_time'+node.id+'" />\
                            <i class="material-icons"></i>\
                        </label>\
                    </div>\
                    <div class="col-4 text">Time:</div>\
                    <div class="col-6">\
                        <div id="slider_time'+node.id+'"></div>\
                    </div>\
            </div>';

        var numControl = new D3NE.Control(htmlText,
            (el, control) => {
                //Initialize HTML elements
                var sliderQuery = "#slider_opacity" + node.id;
				const slider = el.querySelector(sliderQuery);
				noUiSlider.create(slider, {
					start: 1,
					animate: false,
					range: {'min': 0, 'max': 1}
                });

                var sliderTimeQ = "#slider_time" + node.id;
				const sliderTime = el.querySelector(sliderTimeQ);
				noUiSlider.create(sliderTime, {
					start: 6,
					animate: false,
					range: {'min': 0, 'max': 6}
                });

                $(el).find("#set_enable_time" + node.id).on("click", function () {
                    console.log("Value of "+ $(this).is(":checked"));
                    window.call_native("set_enable_time", node.id, $(this).is(":checked"));
                });

                slider.noUiSlider.on('slide', function (values, handle) { window.call_native("setOpacity", node.id, parseFloat(values[handle]))});
                sliderTime.noUiSlider.on('slide', function (values, handle) { window.call_native("setTime", node.id, parseFloat(values[handle]))});

                control.setValue = val => {
                    console.log("Input changed:" + val);
                    window.call_native("readSimulationResults", node.id, val.toString());
                };   
            }
        );

        return node.addControl(numControl).addInput(inputConnection);
    },
    worker(node, inputs, outputs) {
        if(inputs[0] != undefined && inputs[0] != "")
            nodeEditor.editor.nodes.find(n => n.id == node.id).controls[0].setValue(inputs[0]);
    }
});