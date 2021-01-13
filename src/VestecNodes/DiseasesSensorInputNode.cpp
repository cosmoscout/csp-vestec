
#include "DiseasesSensorInputNode.hpp"

#include "../../../../src/cs-utils/filesystem.hpp"

#include <json.hpp>
#include <set>

// for convenience
using json = nlohmann::json;

DiseasesSensorInputNode::DiseasesSensorInputNode(
    csp::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem, int id)
    : VNE::Node(pItem, id, 1, 1) {
  mPluginConfig = config;
}

DiseasesSensorInputNode::~DiseasesSensorInputNode() {
}

std::string DiseasesSensorInputNode::GetName() {
  return "DiseasesSensorInput";
}

void DiseasesSensorInputNode::Init(VNE::NodeEditor* pEditor) {
  csp::vestec::logger().debug("[{}] Init", GetName());

  // Load JavaScipt content from file
  std::string code = cs::utils::filesystem::loadToString(
      "../share/resources/gui/js/csp-vestec-diseases-sensor-source-node.js");

  pEditor->GetGuiItem()->executeJavascript(code);

  if (!csp::vestec::Plugin::vestecDiseasesDir.empty()) {
    // Todo use dedicated member
    pEditor->GetGuiItem()->callJavascript(
        "DiseasesSensorInputNode.setPath", csp::vestec::Plugin::vestecDiseasesDir);
  }

  // Example callback for communication from JavaScript to C++
  pEditor->GetGuiItem()->registerCallback("DiseasesSensorInputNode.readSensorFileNames",
      "Reads sensor file names", std::function([pEditor](double id, std::string path) {
        pEditor->GetNode<DiseasesSensorInputNode>(std::lround(id))
            ->ReadSensorFileNames(std::lround(id), path);
      }));
}

void DiseasesSensorInputNode::ReadSensorFileNames(int id, const std::string& path) {
  std::set<std::string> lFiles(cs::utils::filesystem::listFiles(path));
  json                  args(lFiles);
  m_pItem->callJavascript("DiseasesSensorInputNode.fillWithSensorFiles", id, args.dump());
}
