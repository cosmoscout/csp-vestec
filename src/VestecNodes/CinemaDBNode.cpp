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

#ifdef ERROR
#undef ERROR
#endif
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
    : VNE::Node(pItem, id, 1, 1) {
}

CinemaDBNode::~CinemaDBNode() {
}

std::string CinemaDBNode::GetName() {
  return "CinemaDBNode";
}

void CinemaDBNode::Init(VNE::NodeEditor* pEditor) {
  csp::vestec::logger().debug("[{}] Init", GetName());

  const std::string node =
      cs::utils::filesystem::loadToString("../share/resources/gui/js/csp-vestec-cinemadb-node.js");
  pEditor->GetGuiItem()->executeJavascript(node);

  if (!csp::vestec::Plugin::dataDir.empty()) {
    pEditor->GetGuiItem()->callJavascript("CinemaDBNode.setPath", csp::vestec::Plugin::dataDir);
  }

  // Example callback for communication from JavaScript to C++
  pEditor->GetGuiItem()->registerCallback("CinemaDBNode.readCaseNames",
      "Returns available case names", std::function([pEditor](double id, std::string path) {
        pEditor->GetNode<CinemaDBNode>(id)->ReadCaseNames(id, path);
      }));

  pEditor->GetGuiItem()->registerCallback("CinemaDBNode.getTimeSteps",
      "Returns time steps for a case", std::function([pEditor](double id, std::string path) {
        pEditor->GetNode<CinemaDBNode>(id)->GetTimeSteps(id, path);
      }));

  pEditor->GetGuiItem()->registerCallback("CinemaDBNode.convertFile",
      "Converts a .vtu file to .json",
      std::function([](const std::string caseName, std::string timeStep, std::string path) {
        CinemaDBNode::ConvertFile(caseName, timeStep, path);
      }));
}

void CinemaDBNode::ConvertFile(
    const std::string& caseName, const std::string& timeStep, const std::string& path) {
  auto reader = vtkSmartPointer<ttkCinemaReader>::New();
  reader->SetDatabasePath(path);
  reader->Update();

  /////////////////
  auto cinemaQuery = vtkSmartPointer<ttkCinemaQuery>::New();
  cinemaQuery->SetInputConnection(reader->GetOutputPort());
  cinemaQuery->SetSQLStatement("SELECT * FROM InputTable WHERE CaseName == '" + caseName +
                               "' AND TimeStep == " + (timeStep));
  cinemaQuery->Update();

  auto cinemaProduct = vtkSmartPointer<ttkCinemaProductReader>::New();
  cinemaProduct->SetInputConnection(cinemaQuery->GetOutputPort());
  cinemaProduct->SetFilepathColumnName("FILE");
  cinemaProduct->Update();

  auto polyFilter = vtkSmartPointer<vtkGeometryFilter>::New();
  polyFilter->SetInputConnection(cinemaProduct->GetOutputPort());
  polyFilter->Update();

  ///////////////// Dump to vtk js
  auto* dumper = vtkHttpDataSetWriter::New();
  dumper->SetFileName((path + "/converted/" + caseName + "_" + (timeStep)).c_str());
  dumper->SetInputConnection(polyFilter->GetOutputPort());
  dumper->Write();

  csp::vestec::logger().debug(
      "[{}::ConvertFile] JSON written to: {}/converted/{}_{}", GetName(), path, caseName, timeStep);
}

void CinemaDBNode::ReadCaseNames(int id, const std::string& path) {
  json args;

  csp::vestec::logger().debug(
      "[{}::ReadCaseNames] Reading case names from cinema database: {}", GetName(), path);

  ttk::globalDebugLevel_ = 3;
  auto reader            = vtkSmartPointer<ttkCinemaReader>::New();
  reader->SetDatabasePath(path);
  reader->Update();

  auto* table = vtkTable::SafeDownCast(reader->GetOutputDataObject(0));

  std::set<std::string> caseNames;
  auto* caseNamesColumn = vtkStringArray::SafeDownCast(table->GetColumnByName("CaseName"));

  for (int x = 0; x < table->GetNumberOfRows(); ++x) {
    caseNames.insert(caseNamesColumn->GetValue(x));
  }
  for (auto entry : caseNames) {
    args.push_back(entry);
  }

  m_pItem->callJavascript("CinemaDBNode.fillCaseNames", id, args.dump());
}

void CinemaDBNode::GetTimeSteps(int id, const std::string& path) {
  json args;

  csp::vestec::logger().debug(
      "[{}::GetTimeSteps] Reading time info from cinema database: {}", GetName(), path);

  ttk::globalDebugLevel_ = 3;
  auto reader            = vtkSmartPointer<ttkCinemaReader>::New();
  reader->SetDatabasePath(path);
  reader->Update();

  auto*         table = vtkTable::SafeDownCast(reader->GetOutputDataObject(0));
  std::set<int> caseNames;
  auto*         timeColumn = vtkIntArray::SafeDownCast(table->GetColumnByName("TimeStep"));

  int min = std::numeric_limits<int>::max();
  int max = std::numeric_limits<int>::min();

  for (int x = 0; x < table->GetNumberOfRows(); ++x) {
    caseNames.insert(timeColumn->GetValue(x));
    min = std::min(min, timeColumn->GetValue(x));
    max = std::max(max, timeColumn->GetValue(x));
  }
  args.push_back(min); // min
  args.push_back(max); // max

  for (auto entry : caseNames) {
    args.push_back(entry);
  }

  m_pItem->callJavascript("CinemaDBNode.createSlider", id, args.dump());
}
