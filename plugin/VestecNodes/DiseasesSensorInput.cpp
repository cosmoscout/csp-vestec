
#include "DiseasesSensorInput.hpp"
#include "../NodeEditor/NodeEditor.hpp"

#include "../../../../src/cs-utils/filesystem.hpp"

#include <json.hpp>
#include <set>
// for convenience
using json = nlohmann::json;

DiseasesSensorInput::DiseasesSensorInput(
    cs::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem, int id)
    : VNE::Node(pItem, id) {
  mPluginConfig = config;
}

DiseasesSensorInput::~DiseasesSensorInput() {
}

std::string DiseasesSensorInput::GetName() {
  return "DiseasesSensorInput";
}

void DiseasesSensorInput::Init(VNE::NodeEditor* pEditor) {
  // Load JavaScipt content from file
  std::string code = cs::utils::filesystem::loadToString("../share/resources/gui/js/csp-vestec-disaeses-sensor-source-node.js");

  pEditor->GetGuiItem()->executeJavascript(code);

  // Example callback for communication from JavaScript to C++
  pEditor->GetGuiItem()->registerCallback<double>(
      "readSensorFileNames", ([pEditor](double id) {
        pEditor->GetNode<DiseasesSensorInput>(id)->ReadSensorFileNames(id);
      }));
}

void DiseasesSensorInput::ReadSensorFileNames(int id) {
  std::set<std::string> lFiles(cs::utils::filesystem::listFiles(mPluginConfig.mDiseasesDir+"/input"));
  json                  args(lFiles);
  m_pItem->callJavascript("DiseasesSensorInput.fillWithSensorFiles", id, args.dump());
}
