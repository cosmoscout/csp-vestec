// entry point ------------------------------------------------
$(document).ready(function () {
	console.log("Init VESTEC plugin in javascript done");
	//$('#vestec-system').attr('src', 'http://vestec.epcc.ed.ac.uk/');
	$('#vestec-system').attr('src', 'https://www.nvidia.com/');
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
