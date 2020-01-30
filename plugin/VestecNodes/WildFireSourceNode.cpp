
#include "WildFireSourceNode.hpp"
#include "../NodeEditor/NodeEditor.hpp"

#include "../../../../src/cs-utils/filesystem.hpp"

#include <json.hpp>
#include <set>
// for convenience
using json = nlohmann::json;

WildFireSourceNode::WildFireSourceNode(cs::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem, int id)
    : VNE::Node(pItem, id) {
      mPluginConfig = config; 
}

WildFireSourceNode::~WildFireSourceNode() {
}

std::string WildFireSourceNode::GetName() {
  return "WildFireSourceNode";
}

void WildFireSourceNode::Init(VNE::NodeEditor* pEditor) {
  //Load JavaScipt content from file
  std::string code = cs::utils::filesystem::loadToString("js/WildFireSourceNode.js");

  pEditor->GetGuiItem()->executeJavascript(code);

  // Example callback for communication from JavaScript to C++
  pEditor->GetGuiItem()->registerCallback<double, std::string>(
      "readSimulationModes", ([pEditor](double id, std::string params) {
        pEditor->GetNode<WildFireSourceNode>(id)->ReadSimulationModes(id);
      }));

  pEditor->GetGuiItem()->registerCallback<double, std::string>(
      "readSimulationFileNames", ([pEditor](double id, std::string params) {
        pEditor->GetNode<WildFireSourceNode>(id)->ReadSimulationFileNames(id);
      }));
}

void WildFireSourceNode::ReadSimulationModes(int id) {
  std::set<std::string> lFiles(cs::utils::filesystem::listFiles(mPluginConfig.mFireDir));
  json args(lFiles);
  m_pItem->callJavascript("WildFireSourceNode.fillSimulationModes", id, args.dump());
}

void WildFireSourceNode::ReadSimulationFileNames(int id) { 
  //std::set<std::string> lDirs(cs::utils::filesystem::listDirs(mPluginConfig.mFireDir));
  //json args(lFiles);
  //m_pItem->callJavascript("WildFireSourceNode.fillSimulationOutputs", id, args.dump());
}
