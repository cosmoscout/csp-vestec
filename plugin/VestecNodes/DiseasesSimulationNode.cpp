
#include "DiseasesSimulationNode.hpp"
#include "../NodeEditor/NodeEditor.hpp"

#include "../../../../src/cs-utils/filesystem.hpp"

#include <json.hpp>
#include <set>
// for convenience
using json = nlohmann::json;

DiseasesSimulation::DiseasesSimulation(
    cs::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem, int id)
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
  pEditor->GetGuiItem()->registerCallback<double>("readSimFiles", ([pEditor](double id) {
    pEditor->GetNode<DiseasesSimulation>(id)->ReadSimulationFileNames(id);
  }));
}

void DiseasesSimulation::ReadSimulationFileNames(int id) {
  std::set<std::string> lFiles(
      cs::utils::filesystem::listFiles(mPluginConfig.mDiseasesDir + "/output"));
  json args(lFiles);
  m_pItem->callJavascript("DiseasesSimulation.fillWithTimesteps", id, args.dump());
}
