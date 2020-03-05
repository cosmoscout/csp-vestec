// entry point ------------------------------------------------
$(document).ready(function () {
	console.log("Init VESTEC plugin in javascript done");
	$('#vestec-system').attr('src', 'http://vestec.epcc.ed.ac.uk/');
	//$('#vestec-system').attr('src', 'https://www.nvidia.com/');
	var isMiniFlowEdit = false;
	var w_flowEdit = 0;
	var h_flowEdit = 0;
	$("#floweditor-resizeable" ).resizable({
		animate: true,
	  });
	$("#floweditor-resizeable" ).draggable({});

	$("#floweditor-resizeable" ).resize(function() {
		w_flowEdit = $("#floweditor-resizeable").width();
		h_flowEdit = $("#floweditor-resizeable").height();
		isMiniFlowEdit = false;
	});

	$("#minimize").click(function () {
		if (isMiniFlowEdit) {
			$("#floweditor-resizeable").animate({height: h_flowEdit},{ duration: 500, queue: false });
			$("#floweditor-resizeable").animate({width: w_flowEdit},{ duration: 500, queue: false });
			isMiniFlowEdit = false;
		}else{
			w_flowEdit = $("#floweditor-resizeable").width();
		    h_flowEdit = $("#floweditor-resizeable").height();
			$("#floweditor-resizeable").animate({height:'40px'},{ duration: 500, queue: false });
			$("#floweditor-resizeable").animate({width: '200px'},{ duration: 500, queue: false });
			isMiniFlowEdit = true;
		}
	});
});


function simpleGraph()
{
	var source          	= nodeEditor.nodes.CinemaDBNode.builder(nodeEditor.nodes.CinemaDBNode.newNode());
	var persistence        	= nodeEditor.nodes.PersistenceNode.builder(nodeEditor.nodes.PersistenceNode.newNode());
	//var criticalPoints      	= nodeEditor.nodes.CriticalPointsNode.builder(nodeEditor.nodes.CriticalPointsNode.newNode());
	
	source.position            = [0,  100];
	persistence.position       = [200, 100];
	//criticalPoints.position    = [600,  300];
	
	nodeEditor.editor.addNode(source);
	nodeEditor.editor.addNode(persistence);
	//nodeEditor.editor.addNode(criticalPoints);

	nodeEditor.editor.connect(source.outputs[0], persistence.inputs[0]);
	//nodeEditor.editor.connect(persistence.outputs[0], criticalPoints.inputs[0]);
}
