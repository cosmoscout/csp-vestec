
#include "DiseasesSimulationNode.hpp"

#include "../../../../src/cs-utils/filesystem.hpp"

#include <json.hpp>
#include <set>

// for convenience
using json = nlohmann::json;

DiseasesSimulation::DiseasesSimulation(
    csp::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem, int id)
    : VNE::Node(pItem, id, 1, 1) {
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
      "../share/resources/gui/js/csp-vestec-diseases-simulation-source-node.js");

  pEditor->GetGuiItem()->executeJavascript(code);

  if (!csp::vestec::Plugin::dataDir.empty()) {
    // Todo use dedicated member
    pEditor->GetGuiItem()->callJavascript("DiseasesSimulationNode.setPath", csp::vestec::Plugin::dataDir + "/../diseases");
  }

  // Example callback for communication from JavaScript to C++
  pEditor->GetGuiItem()->registerCallback("DiseasesSimulationNode.getFilesForTimeStep",
      "Returns files for a time step",
      std::function([pEditor](double id, std::string mode, double t) {
        pEditor->GetNode<DiseasesSimulation>(id)->GetFileNamesForTimeStep(id, mode, t);
      }));

  pEditor->GetGuiItem()->registerCallback("DiseasesSimulationNode.setNumberOfEnsembleMembers",
      "Sets the number of ensemble members", std::function([pEditor](double id, std::string path) {
        pEditor->GetNode<DiseasesSimulation>(id)->SetNumberOfEnsembleMembers(id, path);
      }));

  pEditor->GetGuiItem()->registerCallback("DiseasesSimulationNode.readDiseasesSimulationModes",
      "Returns available diseases simulation modes", std::function([pEditor](double id, std::string path) {
        //pEditor->GetNode<DiseasesSimulation>(id)->SetSimulationModes(id, path);

        std::set<std::string> lDirs(
            cs::utils::filesystem::listDirs(path));

        json args(lDirs);

        pEditor->GetGuiItem()->callJavascript("DiseasesSimulationNode.fillSimModes", id, args.dump());
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
  m_pItem->callJavascript("DiseasesSimulationNode.setFileListForTimeStep", id, args.dump());
}

void DiseasesSimulation::SetNumberOfEnsembleMembers(int id, std::string path) {
  std::set<std::string> lDirs(cs::utils::filesystem::listDirs(path));

  // TODO Awkward
  std::string a = *lDirs.begin();
  std::set<std::string> lFiles(cs::utils::filesystem::listFiles(a + "/"));

  m_pItem->callJavascript("DiseasesSimulationNode.setNumberOfEnsembleMembers", id, lDirs.size(), lFiles.size());
}

void DiseasesSimulation::SetSimulationModes(int id, const std::string& path) {
  std::set<std::string> lDirs(
      cs::utils::filesystem::listDirs(path));

  json args(lDirs);

  m_pItem->callJavascript("DiseasesSimulationNode.fillSimModes", id, args.dump());
}
