
#include "DiseasesSensorInputNode.hpp"

#include "../../../../src/cs-utils/filesystem.hpp"

#include <json.hpp>
#include <set>

// for convenience
using json = nlohmann::json;

DiseasesSensorInputNode::DiseasesSensorInputNode(
    csp::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem, int id)
    : VNE::Node(pItem, id, 0, 1) {
  mPluginConfig = config;
}

DiseasesSensorInputNode::~DiseasesSensorInputNode() {
}

std::string DiseasesSensorInputNode::GetName() {
  return "DiseasesSensorInput";
}

void DiseasesSensorInputNode::Init(VNE::NodeEditor* pEditor) {
  csp::vestec::logger().debug("[" + GetName() + "] Init");

  // Load JavaScipt content from file
  std::string code = cs::utils::filesystem::loadToString(
      "../share/resources/gui/js/csp-vestec-diseases-sensor-source-node.js");

  pEditor->GetGuiItem()->executeJavascript(code);

  // Example callback for communication from JavaScript to C++
  pEditor->GetGuiItem()->registerCallback<double>(
      "readSensorFileNames", "Reads sensor file names", std::function([pEditor](double id) {
        pEditor->GetNode<DiseasesSensorInputNode>(id)->ReadSensorFileNames(id);
      }));
}

void DiseasesSensorInputNode::ReadSensorFileNames(int id) {
  std::set<std::string> lFiles(
      cs::utils::filesystem::listFiles(mPluginConfig.mDiseasesDir + "/input"));
  json args(lFiles);
  m_pItem->callJavascript("DiseasesSensorInput.fillWithSensorFiles", id, args.dump());
}
