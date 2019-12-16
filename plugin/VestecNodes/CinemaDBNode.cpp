/*
 *  CinemaDBNode.cpp
 *
 *  Created on: 16.12.2019
 *  Author: flat_ma
 */

#include "../NodeEditor/NodeEditor.hpp"
#include "CinemaDBNode.hpp"

CinemaDBNode::CinemaDBNode(cs::gui::GuiItem *pItem, int id) : VNE::Node(pItem,id) 
{
}

CinemaDBNode::~CinemaDBNode() {}

std::string CinemaDBNode::GetName() { return "CinemaDBNode"; }

void CinemaDBNode::Init(VNE::NodeEditor *pEditor) {
  std::string code = R"(
		//Namespace
		var CinemaDBNode = {};

		//Helper functions
		CinemaDBNode.helpFunction = function (htmlElement)
		{
			var liSimulations = "";
		
			for(var i = 0; i < 10; i++)
			{
				liSimulations += "<option>File "+i+"</option>";
			}
			$( htmlElement ).html(liSimulations);
    	    $( htmlElement ).selectpicker();
		}

		//Now define the node itself
		nodeEditor.nodes.CinemaDBNode = new D3NE.Component('CinemaDBNode',{
        builder(node) {
			var out1 = new D3NE.Output("CINEMA_DB", nodeEditor.sockets.CINEMA_DB);
            var numControl = new D3NE.Control(
            '<select class="combobox"><option>none</option></select>',
            (el, control) => {
				$(el).on('change', upd);
      
                $(el).selectpicker();

                //Fill combobox with available simulations
                CinemaDBNode.helpFunction(el);

                function upd() {
                    console.log("Combo value "+$( el ).val());
                    //control.putData("data", JSON.stringify(strJSON["simulations"][i][$( el ).val()]));
                }
                
			    //Forward the first simulation
                upd();
            }
        );
    
        return node.addControl(numControl).addOutput(out1);
        },
        worker(node, inputs, outputs){
            outputs[0] = node.data.data;
        }
    });
    )"; // END OF JAVASCRIPT CODE
  	pEditor->GetGuiItem()->executeJavascript(code);
}
