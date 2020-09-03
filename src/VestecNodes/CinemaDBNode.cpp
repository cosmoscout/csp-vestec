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

#include <vtkHttpDataSetWriter.h>

#include <ttkCinemaProductReader.h>
#include <ttkCinemaQuery.h>
#include <ttkCinemaReader.h>
#include <vtkGeometryFilter.h>
#include <vtkIntArray.h>
#include <vtkStringArray.h>
#include <vtkTable.h>

#include <json.hpp>
#include <limits>
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
  csp::vestec::logger().debug("[" + GetName() + "] Init");

  const std::string node =
      cs::utils::filesystem::loadToString("../share/resources/gui/js/csp-vestec-cinemadb-node.js");
  pEditor->GetGuiItem()->executeJavascript(node);

  // Example callback for communication from JavaScript to C++
  pEditor->GetGuiItem()->registerCallback<double, std::string>("readCaseNames",
      "Returns available case names", std::function([pEditor](double id, std::string params) {
        pEditor->GetNode<CinemaDBNode>(id)->ReadCaseNames(id);
      }));

  pEditor->GetGuiItem()->registerCallback<double, std::string>("getTimeSteps",
      "Returns time steps for a case", std::function([pEditor](double id, std::string params) {
        pEditor->GetNode<CinemaDBNode>(id)->GetTimeSteps(id);
      }));

  pEditor->GetGuiItem()->registerCallback<std::string, std::string>("convertFile",
      "Converts a .vtu file to .json",
      std::function([](const std::string caseName, std::string timeStep) {
        CinemaDBNode::ConvertFile(caseName, timeStep);
      }));
}

void CinemaDBNode::ConvertFile(const std::string& caseName, const std::string& timeStep) {
  auto reader = vtkSmartPointer<ttkCinemaReader>::New();
  reader->SetDatabasePath(csp::vestec::Plugin::dataDir);
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

  auto polyFilter = vtkSmartPointer<vtkGeometryFilter>::New();
  polyFilter->SetInputData(cinemaProduct->GetOutput()->GetBlock(0));
  polyFilter->Update();

  ///////////////// Dump to vtk js
  auto dumper = vtkHttpDataSetWriter::New();
  dumper->SetFileName(
      (csp::vestec::Plugin::dataDir + "/export/" + caseName + "_" + (timeStep)).c_str());
  dumper->SetInputConnection(polyFilter->GetOutputPort());
  dumper->Write();

  csp::vestec::logger().debug("[" + GetName() +
                              "::ConvertFile] JSON written to: " + csp::vestec::Plugin::dataDir +
                              "/export/" + caseName + "_" + (timeStep));
}

void CinemaDBNode::ReadCaseNames(int id) {
  json args;

  csp::vestec::logger().debug(
      "[" + GetName() +
      "::ReadCaseNames] Reading case names from cinema database: " + csp::vestec::Plugin::dataDir);

  ttk::globalDebugLevel_ = 3;
  auto reader            = vtkSmartPointer<ttkCinemaReader>::New();
  reader->SetDatabasePath(csp::vestec::Plugin::dataDir);
  reader->Update();

  auto table = vtkTable::SafeDownCast(reader->GetOutput());

  std::set<std::string> caseNames;
  auto caseNamesColumn = vtkStringArray::SafeDownCast(table->GetColumnByName("CaseName"));

  for (int x = 0; x < table->GetNumberOfRows(); ++x)
    caseNames.insert(caseNamesColumn->GetValue(x));
  for (auto entry : caseNames) {
    args.push_back(entry);
  }

  m_pItem->callJavascript("CinemaDBNode.fillCaseNames", id, args.dump());
}

void CinemaDBNode::GetTimeSteps(int id) {
  json args;

  csp::vestec::logger().debug(
      "[" + GetName() +
      "::GetTimeSteps] Reading time info from cinema database: " + csp::vestec::Plugin::dataDir);

  ttk::globalDebugLevel_ = 3;
  auto reader            = vtkSmartPointer<ttkCinemaReader>::New();
  reader->SetDatabasePath(csp::vestec::Plugin::dataDir);
  reader->Update();

  auto          table = vtkTable::SafeDownCast(reader->GetOutput());
  std::set<int> caseNames;
  auto          timeColumn = vtkIntArray::SafeDownCast(table->GetColumnByName("TimeStep"));

  int min = std::numeric_limits<int>::max();
  int max = std::numeric_limits<int>::min();

  for (int x = 0; x < table->GetNumberOfRows(); ++x) {
    caseNames.insert(timeColumn->GetValue(x));
    min = std::min(min, timeColumn->GetValue(x));
    max = std::max(max, timeColumn->GetValue(x));
  }
  args.push_back(min); // min
  args.push_back(max); // max

  for (auto entry : caseNames)
    args.push_back(entry);

  m_pItem->callJavascript("CinemaDBNode.createSlider", id, args.dump());
}
