
#include "WildFireSourceNode.hpp"

#include "../../../../src/cs-utils/filesystem.hpp"

#include <nlohmann/json.hpp>
#include <set>

WildFireSourceNode::WildFireSourceNode(
    csp::vestec::Plugin::Settings const &config, cs::gui::GuiItem *pItem,
    int id)
    : VNE::Node(pItem, id, 1, 1) {
  mPluginConfig = config;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

WildFireSourceNode::~WildFireSourceNode() {}

////////////////////////////////////////////////////////////////////////////////////////////////////

std::string WildFireSourceNode::GetName() { return "WildFireSourceNode"; }

////////////////////////////////////////////////////////////////////////////////////////////////////

void WildFireSourceNode::Init(VNE::NodeEditor *pEditor) {
  // Load JavaScript content from file
  std::string code = cs::utils::filesystem::loadToString(
      "../share/resources/gui/js/csp-vestec-wildfire-source-node.js");

  pEditor->GetGuiItem()->executeJavascript(code);

  // Example callback for communication from JavaScript to C++
  pEditor->GetGuiItem()->registerCallback<double, std::string>(
      "readSimulationModes", "Returns available simulation modes",
      std::function([pEditor](double id, std::string params) {
        pEditor->GetNode<WildFireSourceNode>(std::lround(id))
            ->ReadSimulationModes(std::lround(id));
      }));

  pEditor->GetGuiItem()->registerCallback<double, std::string>(
      "readSimulationFileNames", "Returns simulation file names",
      std::function([pEditor](double id, std::string params) {
        pEditor->GetNode<WildFireSourceNode>(std::lround(id))
            ->ReadSimulationFileNames(std::lround(id), params);
      }));
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void WildFireSourceNode::ReadSimulationModes(int id) {
  std::set<std::string> lDirs(
      cs::utils::filesystem::listDirs(mPluginConfig.mFireDir));
  nlohmann::json args(lDirs);
  m_pItem->callJavascript("WildFireSourceNode.fillSimulationModes", id,
                          args.dump());
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void WildFireSourceNode::ReadSimulationFileNames(int id, std::string simMode) {
  std::set<std::string> lFiles(cs::utils::filesystem::listFiles(simMode));
  nlohmann::json args(lFiles);
  m_pItem->callJavascript("WildFireSourceNode.fillSimulationOutputs", id,
                          args.dump());
}
