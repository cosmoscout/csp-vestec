
#include "RenderNode2D.hpp"
#include "../NodeEditor/NodeEditor.hpp"

#include "../../../../src/cs-utils/filesystem.hpp"

#include <json.hpp>
#include <set>
// for convenience
using json = nlohmann::json;

RenderNode2D::RenderNode2D(
    cs::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem, int id)
    : VNE::Node(pItem, id) 
{
  mPluginConfig = config;
}

RenderNode2D::~RenderNode2D() {
}

std::string RenderNode2D::GetName() {
  return "RenderNode2D";
}

void RenderNode2D::Init(VNE::NodeEditor* pEditor) {
  // Load JavaScipt content from file
  std::string code = cs::utils::filesystem::loadToString("js/RenderNode2D.js");

  pEditor->GetGuiItem()->executeJavascript(code);

}
