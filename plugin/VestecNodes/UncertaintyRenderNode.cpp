
#include "UncertaintyRenderNode.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"
#include "../NodeEditor/NodeEditor.hpp"
#include "../Rendering/TextureOverlayRenderer.hpp"
#include "../common/GDALReader.hpp"

#include <VistaKernel/GraphicsManager/VistaGraphicsManager.h>
#include <VistaKernel/GraphicsManager/VistaOpenGLNode.h>
#include <VistaKernel/GraphicsManager/VistaSceneGraph.h>
#include <VistaKernel/VistaSystem.h>
#include <VistaKernelOpenSGExt/VistaOpenSGMaterialTools.h>

#include <json.hpp>

// GDAL c++ includes
#include "cpl_conv.h" // for CPLMalloc()
#include "gdal_priv.h"
#include "gdalwarper.h"
#include "ogr_spatialref.h"

#include <iomanip>
#include <vector>
// for convenience
using json = nlohmann::json;

// Define PI
#define M_PI 3.14159265358979323846 /* pi */

UncertaintyRenderNode::UncertaintyRenderNode(cs::vestec::Plugin::Settings const& config,
    cs::gui::GuiItem* pItem, int id, cs::core::SolarSystem* pSolarSystem,
    cs::scene::CelestialAnchorNode* pAnchor, cs::core::GraphicsEngine* pEngine)
    : VNE::Node(pItem, id)
    , m_pAnchor(pAnchor) {
  // Store config data for later usage
  mPluginConfig = config;

  // Add a TextureOverlayRenderer to the VISTA scene graph
  auto pSG    = GetVistaSystem()->GetGraphicsManager()->GetSceneGraph();
  m_pRenderer = new TextureOverlayRenderer(pSolarSystem);
  m_pParent   = pSG->NewOpenGLNode(m_pAnchor, m_pRenderer);

  // Render after planets which are rendered at 100
  VistaOpenSGMaterialTools::SetSortKeyOnSubtree(m_pAnchor, static_cast<int>(150));
}

UncertaintyRenderNode::~UncertaintyRenderNode() {
  delete m_pParent;
  delete m_pRenderer;
}

std::string UncertaintyRenderNode::GetName() {
  return "UncertaintyRenderNode";
}

void UncertaintyRenderNode::Init(VNE::NodeEditor* pEditor) {
  // Load JavaScipt content from file which defines the node
  // in the node editor
  std::string code = cs::utils::filesystem::loadToString(
      "../share/resources/gui/js/csp-vestec-uncertainty-renderer.js");
  pEditor->GetGuiItem()->executeJavascript(code);

  // Callback which reads simulation data (path+x is given from JavaScript)
  pEditor->GetGuiItem()->registerCallback<double, std::string>(
      "setTextureFiles", ([pEditor](double id, std::string params) {
        pEditor->GetNode<UncertaintyRenderNode>(id)->SetTextureFiles(params);
      }));

  // Callback to adjust the opacity of the rendering
  pEditor->GetGuiItem()->registerCallback<double, double>(
      "setOpacity", ([pEditor](double id, double val) {
        pEditor->GetNode<UncertaintyRenderNode>(id)->SetOpacity(val);
      }));
}

void UncertaintyRenderNode::SetOpacity(double val) {
  m_pRenderer->SetOpacity(val);
}

void UncertaintyRenderNode::SetTextureFiles(std::string jsonFilenames) {
  std::cout << "SetTextureFiles " << jsonFilenames << std::endl;

  // Forward to OGL renderer
  json args = json::parse(jsonFilenames);

  // Create textures
  std::vector<GDALReader::GreyScaleTexture> vecTextures;

  // range-based for over persistence pairs
  for (auto& filename : args) {
    // Read the GDAL texture (grayscale only 1 float channel)
    GDALReader::GreyScaleTexture texture;
    GDALReader::ReadGrayScaleTexture(texture, filename);
    std::cout << "Adding texture " << filename << std::endl;
  }
  // Add the new texture for rendering
  // m_pRenderer->SetOverlayTexture(texture);
}