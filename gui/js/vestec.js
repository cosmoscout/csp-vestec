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
});
