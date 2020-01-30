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
                
                control.setValue = val => {
                    console.log("Input changed:" + val);
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