
#include "RenderNode2D.hpp"
#include "../NodeEditor/NodeEditor.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"

#include <VistaKernel/GraphicsManager/VistaGraphicsManager.h>
#include <VistaKernel/GraphicsManager/VistaOpenGLNode.h>
#include <VistaKernel/GraphicsManager/VistaSceneGraph.h>
#include <VistaKernel/VistaSystem.h>
#include <VistaKernelOpenSGExt/VistaOpenSGMaterialTools.h>

#include <json.hpp>
#include <set>
// for convenience
using json = nlohmann::json;

RenderNode2D::RenderNode2D(cs::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem,
    int id, cs::core::SolarSystem* pSolarSystem, cs::scene::CelestialAnchorNode* pAnchor,
    cs::core::GraphicsEngine* pEngine)
    : VNE::Node(pItem, id)
    ,m_pAnchor(pAnchor) {

  mPluginConfig = config;

  auto pSG      = GetVistaSystem()->GetGraphicsManager()->GetSceneGraph();
  m_pRenderer = new TextureOverlayRenderer();
  m_pParent = pSG->NewOpenGLNode(m_pAnchor, m_pRenderer);
  VistaOpenSGMaterialTools::SetSortKeyOnSubtree(m_pAnchor, static_cast<int>(650));
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
