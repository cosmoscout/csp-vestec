/*
 *  CinemaDBNode.cpp
 *
 *  Created on: 16.12.2019
 *  Author: flat_ma
 */

#include "CinemaDBNode.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"
#include "../NodeEditor/NodeEditor.hpp"
#include "../Plugin.hpp"

#include "../../../../src/cs-utils/filesystem.hpp"
#include "../vtkHttpDataSetWriter.h"

#include <ttkCinemaProductReader.h>
#include <ttkCinemaQuery.h>
#include <ttkCinemaReader.h>
#include <vtkGeometryFilter.h>
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
  const std::string node =
      cs::utils::filesystem::loadToString("../share/resources/gui/js/csp-vestec-cinemadb-node.js");
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

  pEditor->GetGuiItem()->registerCallback<std::string, std::string>(
      "convertFile", ([](const std::string& caseName, std::string timeStep) {
        CinemaDBNode::ConvertFile(caseName, timeStep);
      }));
}

void CinemaDBNode::ConvertFile(const std::string& caseName, const std::string& timeStep) {
  std::cout << "Convert Called for " << caseName << " with ts " << (timeStep) << std::endl;

  auto reader = vtkSmartPointer<ttkCinemaReader>::New();
  reader->SetDatabasePath(cs::vestec::Plugin::dataDir);
  reader->Update();

  /////////////////
  auto cinemaQuery = vtkSmartPointer<ttkCinemaQuery>::New();
  cinemaQuery->SetInputConnection(reader->GetOutputPort());
  cinemaQuery->SetQueryString("SELECT * FROM InputTable WHERE CaseName == '" + caseName +
                              "' AND TimeStep == " + (timeStep));
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

  std::cout << "PRINT " << (cs::vestec::Plugin::dataDir + "/export/" + caseName + "_" + (timeStep))
            << "\n";
  auto dumper = vtkHttpDataSetWriter::New();
  dumper->SetFileName(
      (cs::vestec::Plugin::dataDir + "/export/" + caseName + "_" + (timeStep)).c_str());
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
  // Example call from C++ to JavaScriptargs.push_back(timeColumn->GetValue(0));
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
