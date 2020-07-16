
#include "TextureRenderNode.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"

#include <VistaKernel/GraphicsManager/VistaGraphicsManager.h>
#include <VistaKernel/GraphicsManager/VistaSceneGraph.h>
#include <VistaKernel/VistaSystem.h>
#include <VistaKernelOpenSGExt/VistaOpenSGMaterialTools.h>

#define STB_IMAGE_IMPLEMENTATION
#define STB_IMAGE_WRITE_IMPLEMENTATION

#include <vector>

// for convenience
using json = nlohmann::json;

// Define PI
#define M_PI 3.14159265358979323846 /* pi */

TextureRenderNode::TextureRenderNode(csp::vestec::Plugin::Settings const& config,
    cs::gui::GuiItem* pItem, int id, cs::core::SolarSystem* pSolarSystem,
    cs::scene::CelestialAnchorNode* pAnchor, cs::core::GraphicsEngine* pEngine)
    : VNE::Node(pItem, id)
    , m_pAnchor(pAnchor) {
  // Store config data for later usage
  mPluginConfig = config;

  m_pRenderer = new TextureOverlayRenderer(pSolarSystem);

  // Add a TextureOverlayRenderer to the VISTA scene graph
  VistaSceneGraph* pSG = GetVistaSystem()->GetGraphicsManager()->GetSceneGraph();
  m_pNode.reset(pSG->NewOpenGLNode(m_pAnchor, m_pRenderer));

  // Render after planets which are rendered at cs::utils::DrawOrder::ePlanets
  VistaOpenSGMaterialTools::SetSortKeyOnSubtree(m_pNode.get(), static_cast<int>(cs::utils::DrawOrder::eOpaqueItems) - 50);

  // Initialize GDAL only once
  GDALReader::InitGDAL();
}

TextureRenderNode::~TextureRenderNode() {
  m_pAnchor->DisconnectChild(m_pNode.get());
  delete m_pRenderer;
}

std::string TextureRenderNode::GetName() {
  return "TextureRenderNode";
}

void TextureRenderNode::Init(VNE::NodeEditor* pEditor) {
  // Load JavaScipt content from file which defines the node
  // in the node editor
  std::string code = cs::utils::filesystem::loadToString(
      "../share/resources/gui/js/csp-vestec-texture-renderer.js");
  pEditor->GetGuiItem()->executeJavascript(code);

  // Callback which reads simulation data (path+x is given from JavaScript)
  pEditor->GetGuiItem()->registerCallback<double, std::string>(
      "readSimulationResults", "Reads simulation data", std::function([pEditor](double id, std::string params) {
        pEditor->GetNode<TextureRenderNode>(id)->ReadSimulationResult(params);
      }));

  // Callback to adjust the opacity of the rendering
  pEditor->GetGuiItem()->registerCallback<double, double>(
      "setOpacityTexture", "Adjusts the opacity of the rendering", std::function([pEditor](double id, double val) {
        pEditor->GetNode<TextureRenderNode>(id)->SetOpacity(val);
      }));

  // Callback to adjust the simulation time used to discard pixels
  pEditor->GetGuiItem()->registerCallback<double, double>(
      "setTime", "Adjusts the simulation time used to discard pixels", std::function([pEditor](double id, double val) {
        pEditor->GetNode<TextureRenderNode>(id)->SetTime(val);
      }));

  pEditor->GetGuiItem()->registerCallback<double, bool>(
      "set_enable_time", "Enables the simulation time", std::function([pEditor](double id, bool val) {
        pEditor->GetNode<TextureRenderNode>(id)->SetUseTime(val);
      }));
}

void TextureRenderNode::SetOpacity(double val) {
  m_pRenderer->SetOpacity(val);
}

void TextureRenderNode::SetTime(double val) {
  m_pRenderer->SetTime(val);
}

void TextureRenderNode::SetUseTime(bool use) {
  m_pRenderer->SetUseTime(use);
}

void TextureRenderNode::ReadSimulationResult(std::string filename) {
  // Read the GDAL texture (grayscale only 1 float channel)
  GDALReader::GreyScaleTexture texture;
  GDALReader::ReadGrayScaleTexture(texture, filename);

  // Add the new texture for rendering
  m_pRenderer->SetOverlayTexture(texture);
}