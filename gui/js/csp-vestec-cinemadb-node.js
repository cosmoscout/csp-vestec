/* global nodeEditor, $, noUiSlider */

class CinemaDBNode {
    builder(node) {
        const output = new D3NE.Output("CINEMA_DB", nodeEditor.sockets.CINEMA_DB);

        const nodeControls = new D3NE.Control(`<div id="cinema__controls_${node.id}">
<select id="case_names_${node.id}" class="combobox"><option>none</option></select>
<div id="time_slider_${node.id}" class="slider"></div>
</div>`, (element, control) => {
            window.call_native("getTimeSteps", node.id, "");
            window.call_native("readCaseNames", node.id, '');

            const select = $(`#case_names_${node.id}`);

            select.selectpicker();

            control.putData('caseName', 'none');

            document.getElementById(`case_names_${node.id}`).addEventListener('change', (event) => {
                control.putData('caseName', (event.target).value);
            });
        });

        node.addControl(nodeControls);
        node.addOutput(output);

        return node;
    }

    worker(node, _inputs, outputs) {
        if (node.data.caseName === 'none') {
            return;
        }

        const timeStep = document.getElementById(`time_slider_${node.id}`).noUiSlider.get();

        window.call_native('convertFile', node.data.caseName, timeStep, node.id);

        outputs[0] = [
            {
                caseName: node.data.caseName,
                timeStep: timeStep,
            }
        ];
    }

    getComponent() {
        return new D3NE.Component('CinemaDBNode', {
            builder: this.builder.bind(this),
            worker: this.worker.bind(this),
        });
    }

    static createSlider(id, args) {
        const json = JSON.parse(args);

        const min = json[0];
        const max = json[1];

        const rangers = {};

        rangers['min'] = [min];
        for (let i = 2; i < json.length; ++i) {
            const percent = (json[i] - min) / (max - min) * 100;

            if (i < json.length - 1) {
                rangers[percent + '%'] = [json[i], json[i + 1] - json[i]]
            }
        }
        rangers['max'] = [max];

        //Initialize slider
        const slider = document.getElementById(`time_slider_${id}`);
        if (slider === null) {
            console.error(`Slider with id #time_slider_${id} not found.`);
            return;
        }

        if (typeof slider.noUiSlider !== "undefined") {
            slider.noUiSlider.destroy();
        }

        noUiSlider.create(slider, {
            start: 10,
            snap: true,
            animate: false,
            range: rangers,
        });
    }

    static fillCaseNames(id, caseNames) {
        console.log(caseNames);
        const json = JSON.parse(caseNames);
        let liSimulations = "";

        for (let i = 0; i < json.length; i++) {
            liSimulations += `<option>${json[i]}</option>`;
        }

        $("body").find("#case_names_" + id).html(liSimulations);
        $("body").find("#case_names_" + id).selectpicker('refresh');
    }
}

(()=>{
    const cinemaDBNode = new CinemaDBNode();

    nodeEditor.nodes.CinemaDBNode = cinemaDBNode.getComponent();

})();
