/*
 *  CinemaDBNode.cpp
 *
 *  Created on: 16.12.2019
 *  Author: flat_ma
 */

#include "CinemaDBNode.hpp"
#include "../NodeEditor/NodeEditor.hpp"
#include "../Plugin.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"

#include <ttkCinemaProductReader.h>
#include <ttkCinemaQuery.h>
#include <ttkCinemaReader.h>
#include <vtkGeometryFilter.h>
#include <vtkHttpDataSetWriter.h>
#include <vtkIntArray.h>
#include <vtkStringArray.h>
#include <vtkTable.h>

#include <json.hpp>
#include <set>
// for convenience
using json = nlohmann::json;

CinemaDBNode::CinemaDBNode(cs::gui::GuiItem* pItem, int id)
    : VNE::Node(pItem, id) {
}

CinemaDBNode::~CinemaDBNode() {
}

std::string CinemaDBNode::GetName() {
  return "CinemaDBNode";
}

void CinemaDBNode::Init(VNE::NodeEditor* pEditor) {
  std::string code = R"(
		//Namespace
		var CinemaDBNode = {};

		//Fill the case names (different simulation runs)
		CinemaDBNode.fillCaseNames = function (id, caseNames)
		{
            console.log(caseNames);
            var json = JSON.parse(caseNames);
			var liSimulations = "";
		
            for(var i = 0; i < json.length; i++) {
                var obj = json[i];
                liSimulations += "<option>"+obj+"</option>";
            }

            $("body").find("#case_names_"+id).html(liSimulations);
    	    $("body").find("#case_names_"+id).selectpicker('refresh');

            console.log("Element"+$("#body").find("#case_names_"+id).text());
		}

        CinemaDBNode.createSlider = function (id, args)
		{
            var json = JSON.parse(args);

            var rangers = {}
            var min = json[0];
            var max = json[1];
            rangers['min'] = [min];
            for (i = 2; i < json.length; ++i) {
                var prozent = (json[i] - min)/(max-min) * 100;
                if ( i < json.length-1 ) { rangers[prozent+'%'] = [ json[i],  json[i+1] - json[i] ] }
            }
            rangers['max'] = [max];

             //Initialize slider
            var query = "#time_slider_"+id;
            const slider = document.body.querySelector(query);
            console.log("Object qith query:" +query+" : "+slider);
            console.log("Array:" +rangers.toString());
            noUiSlider.create(slider, {
                start: 10,
                snap: true,
                animate: false,
                range: rangers
            });
        }

		//Now define the node itself
		nodeEditor.nodes.CinemaDBNode = new D3NE.Component('CinemaDBNode',{
        builder(node) {
			var out1 = new D3NE.Output("CINEMA_DB", nodeEditor.sockets.CINEMA_DB);

            var htmlText = '\
                <div>\
                <select id="case_names_'+node.id+'" class="combobox"><option>none</option></select>\
                <div id="time_slider_'+node.id+'" class="slider"></div>\
                </div>';

            var numControl = new D3NE.Control(htmlText,
            (el, control) => {
                //Initialize combobox
                $("body").find("#case_names_"+node.id).selectpicker();

                window.call_native("readCaseNames",node.id,"");

                window.call_native("getTimeSteps",node.id,"");

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
console.log('NODE DATA', node.data.data);
            outputs[0] = node.data.data;
        }
    });
    )"; // END OF JAVASCRIPT CODE
  //pEditor->GetGuiItem()->executeJavascript(code);

    const std::string node = cs::utils::filesystem::loadToString("../share/resources/gui/js/csp-vestec-cinemadb-node.js");
    pEditor->GetGuiItem()->executeJavascript(node);

  // Example callback for communication from JavaScript to C++
  pEditor->GetGuiItem()->registerCallback<double, std::string>(
      "readCaseNames", ([pEditor](double id, std::string params) {
        pEditor->GetNode<CinemaDBNode>(id)->ReadCaseNames(id);
      }));

  pEditor->GetGuiItem()->registerCallback<double, std::string>(
      "getTimeSteps", ([pEditor](double id, std::string params) {
        pEditor->GetNode<CinemaDBNode>(id)->GetTimeSteps(id);
      }));

  pEditor->GetGuiItem()->registerCallback<std::string, double, double>("convertFile", ([this](std::string caseName, double timeStep, double id){
      this->ConvertFile(caseName, timeStep, id);
  }));

}

void CinemaDBNode::ConvertFile(std::string caseName, double timeStep, double id) {
    auto reader            = vtkSmartPointer<ttkCinemaReader>::New();
    reader->SetDatabasePath(cs::vestec::Plugin::dataDir);
    reader->Update();

    auto table = vtkTable::SafeDownCast(reader->GetOutput());

    /////////////////
    auto cinemaQuery = vtkSmartPointer<ttkCinemaQuery>::New();
    cinemaQuery->SetInputConnection(reader->GetOutputPort());
    cinemaQuery->SetQueryString(
            "SELECT * FROM InputTable WHERE CaseName == '" + caseName + "' AND TimeStep == " + timeStep);
    cinemaQuery->Update();

    auto cinemaProduct = vtkSmartPointer<ttkCinemaProductReader>::New();
    cinemaProduct->SetInputConnection(cinemaQuery->GetOutputPort());
    cinemaProduct->SetFilepathColumnName(0, 0, 0, 0, "FILE");
    cinemaProduct->Update();
    cinemaProduct->GetOutput()->GetBlock(0)->Print(std::cout);

    auto polyFilter = vtkSmartPointer<vtkGeometryFilter>::New();
    polyFilter->SetInputData(cinemaProduct->GetOutput()->GetBlock(0));
    polyFilter->Update();
    polyFilter->GetOutput()->Print(std::cout);
    /////////////////

    std::cout << "PRINT\n";
    auto dumper = vtkHttpDataSetWriter::New();
    dumper->SetFileName(cs::vestec::Plugin::dataDir + "/export/" + caseName + "_" + timeStep);
    dumper->SetInputConnection(polyFilter->GetOutputPort());
    dumper->Write();
    std::cout << "PRINTAFTER\n";
}

void CinemaDBNode::ReadCaseNames(int id) {
  std::cout << "Reading use case names " << std::endl;
  std::cout << "Node id:  " << id << std::endl;
  // Example call from C++ to JavaScript
  json args;

  std::cout << "Reading cinema database from: " << cs::vestec::Plugin::dataDir << std::endl;
  ttk::globalDebugLevel_ = 3;
  auto reader            = vtkSmartPointer<ttkCinemaReader>::New();
  reader->SetDatabasePath(cs::vestec::Plugin::dataDir);
  reader->Update();

  auto table = vtkTable::SafeDownCast(reader->GetOutput());

  std::set<std::string> caseNames;
  auto caseNamesColumn = vtkStringArray::SafeDownCast(table->GetColumnByName("CaseName"));

  std::cout << "PRINTAFTER\n";

  for (int x = 0; x < table->GetNumberOfRows(); ++x)
    caseNames.insert(caseNamesColumn->GetValue(x));
  for (auto entry : caseNames) {
    std::cout << entry << "\n";
    args.push_back(entry);
  }

  m_pItem->callJavascript("CinemaDBNode.fillCaseNames", id, args.dump());
}

void CinemaDBNode::GetTimeSteps(int id) {
  std::cout << "Reading time values " << std::endl;
  std::cout << "Node id:  " << id << std::endl;
  // Example call from C++ to JavaScript
  json args;

  std::cout << "Reading cinema database from: " << cs::vestec::Plugin::dataDir << std::endl;
  ttk::globalDebugLevel_ = 3;
  auto reader            = vtkSmartPointer<ttkCinemaReader>::New();
  reader->SetDatabasePath(cs::vestec::Plugin::dataDir);
  reader->Update();

  auto table = vtkTable::SafeDownCast(reader->GetOutput());
  table->Print(std::cout);
  std::set<int> caseNames;
  // table->GetColumnByName("TimeValue")->Print(std::cout);
  auto timeColumn = vtkIntArray::SafeDownCast(table->GetColumnByName("TimeStep"));

  args.push_back(timeColumn->GetValue(0));                            // min
  args.push_back(timeColumn->GetValue(table->GetNumberOfRows() - 1)); // max

  for (int x = 0; x < table->GetNumberOfRows(); ++x)
    caseNames.insert(timeColumn->GetValue(x));
  for (auto entry : caseNames)
    args.push_back(entry);

  m_pItem->callJavascript("CinemaDBNode.createSlider", id, args.dump());
}
