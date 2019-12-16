// entry point ------------------------------------------------
$(document).ready(function () {
	console.log("Init VESTEC plugin in javascript done");

	var isMini = false;
	var w = 0;
	var h = 0;
	$("#vestec-resizeable" ).resizable({
		animate: true,
	  });
	$("#vestec-resizeable" ).draggable({});

	$("#vestec-resizeable" ).resize(function() {
		w = $("#vestec-resizeable").width();
		h = $("#vestec-resizeable").height();
		isMini = false;
	});

	$("#vestec-editor-body").dblclick(function () {
		if (isMini) {
			$("#vestec-resizeable").animate({height: h},{ duration: 500, queue: false });
			$("#vestec-resizeable").animate({width: w},{ duration: 500, queue: false });
			isMini = false;
		}else{
			w = $("#vestec-resizeable").width();
		    h = $("#vestec-resizeable").height();
			$("#vestec-resizeable").animate({height:'40px'},{ duration: 500, queue: false });
			$("#vestec-resizeable").animate({width: '120px'},{ duration: 500, queue: false });
			isMini = true;
		}
	});
	$('#vestec-system').attr('src', 'http://vestec.epcc.ed.ac.uk/');

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
			$("#floweditor-resizeable").animate({height:'35px'},{ duration: 500, queue: false });
			$("#floweditor-resizeable").animate({width: '200px'},{ duration: 500, queue: false });
			isMiniFlowEdit = true;
		}
	});
});
