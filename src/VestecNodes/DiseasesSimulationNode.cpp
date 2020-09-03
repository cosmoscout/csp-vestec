
#include "DiseasesSimulationNode.hpp"

#include "../../../../src/cs-utils/filesystem.hpp"

#include <json.hpp>
#include <set>

// for convenience
using json = nlohmann::json;

DiseasesSimulation::DiseasesSimulation(
    csp::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem, int id)
    : VNE::Node(pItem, id) {
  mPluginConfig = config;
}

DiseasesSimulation::~DiseasesSimulation() {
}

std::string DiseasesSimulation::GetName() {
  return "DiseasesSimulation";
}

void DiseasesSimulation::Init(VNE::NodeEditor* pEditor) {
  // Load JavaScipt content from file
  std::string code = cs::utils::filesystem::loadToString(
      "../share/resources/gui/js/csp-vestec-disaeses-simulation-source-node.js");

  pEditor->GetGuiItem()->executeJavascript(code);

  // Example callback for communication from JavaScript to C++
  pEditor->GetGuiItem()->registerCallback<double, std::string, double>("getFilesForTimeStep",
      "Returns files for a time step",
      std::function([pEditor](double id, std::string mode, double t) {
        pEditor->GetNode<DiseasesSimulation>(id)->GetFileNamesForTimeStep(id, mode, t);
      }));

  pEditor->GetGuiItem()->registerCallback<double, std::string>("setNumberOfEnsembleMembers",
      "Sets the number of ensemble members", std::function([pEditor](double id, std::string path) {
        pEditor->GetNode<DiseasesSimulation>(id)->SetNumberOfEnsembleMembers(id, path);
      }));

  pEditor->GetGuiItem()->registerCallback<double>("readDiseasesSimulationModes",
      "Returns available diseases simulation modes", std::function([pEditor](double id) {
        pEditor->GetNode<DiseasesSimulation>(id)->SetSimulationModes(id);
      }));
}

void DiseasesSimulation::GetFileNamesForTimeStep(int id, std::string mode, double t) {
  std::set<std::string> lDirs(cs::utils::filesystem::listDirs(mode));

  std::set<std::string> listOfFiles;
  // Get the file for the timestep in every member
  for (auto dir : lDirs) {
    std::set<std::string> lFiles(cs::utils::filesystem::listFiles(dir));
    for (auto file : lFiles) {
      std::stringstream number;
      number << t;
      std::string search = "day_" + number.str() + ".nc";
      if (file.find(search) != std::string::npos) {
        listOfFiles.insert(file);
      }
    }
  }

  json args(listOfFiles);
  m_pItem->callJavascript("DiseasesSimulation.setFileListForTimeStep", id, args.dump());
}

void DiseasesSimulation::SetNumberOfEnsembleMembers(int id, std::string path) {
  std::set<std::string> lDirs(cs::utils::filesystem::listDirs(path));
  m_pItem->callJavascript("DiseasesSimulation.setNumberOfEnsembleMembers", id, lDirs.size());
}

void DiseasesSimulation::SetSimulationModes(int id) {
  std::set<std::string> lDirs(
      cs::utils::filesystem::listDirs(mPluginConfig.mDiseasesDir + "/output/"));
  json args(lDirs);
  m_pItem->callJavascript("DiseasesSimulation.fillSimModes", id, args.dump());
}
