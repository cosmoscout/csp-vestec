
#include "UncertaintyRenderNode.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"

#include <VistaKernel/GraphicsManager/VistaGraphicsManager.h>
#include <VistaKernel/GraphicsManager/VistaSceneGraph.h>
#include <VistaKernel/VistaSystem.h>
#include <VistaKernelOpenSGExt/VistaOpenSGMaterialTools.h>

#include <iomanip>
#include <thread>
#include <vector>

// Define PI
#define M_PI 3.14159265358979323846 /* pi */

UncertaintyRenderNode::UncertaintyRenderNode(csp::vestec::Plugin::Settings const& config,
    cs::gui::GuiItem* pItem, int id, cs::core::SolarSystem* pSolarSystem,
    cs::scene::CelestialAnchorNode* pAnchor, cs::core::GraphicsEngine* pEngine)
    : VNE::Node(pItem, id, 3, 0)
    , m_pAnchor(pAnchor) {
  // Store config data for later usage
  mPluginConfig = config;

  m_pRenderer = new UncertaintyOverlayRenderer(pSolarSystem);

  // Add a TextureOverlayRenderer to the VISTA scene graph
  VistaSceneGraph* pSG = GetVistaSystem()->GetGraphicsManager()->GetSceneGraph();
  m_pNode.reset(pSG->NewOpenGLNode(m_pAnchor, m_pRenderer));

  // Render after planets which are rendered at cs::utils::DrawOrder::ePlanets
  VistaOpenSGMaterialTools::SetSortKeyOnSubtree(
      m_pNode.get(), static_cast<int>(cs::utils::DrawOrder::eOpaqueItems) - 50);

  // Initialize GDAL only once
  GDALReader::InitGDAL();
}

////////////////////////////////////////////////////////////////////////////////////////////////////

UncertaintyRenderNode::~UncertaintyRenderNode() {
  m_pAnchor->DisconnectChild(m_pNode.get());
  delete m_pRenderer;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

std::string UncertaintyRenderNode::GetName() {
  return "UncertaintyRenderNode";
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void UncertaintyRenderNode::Init(VNE::NodeEditor* pEditor) {
  // Load JavaScipt content from file which defines the node
  // in the node editor
  std::string code = cs::utils::filesystem::loadToString(
      "../share/resources/gui/js/csp-vestec-uncertainty-renderer.js");
  pEditor->GetGuiItem()->executeJavascript(code);

  // Callback which reads simulation data (path+x is given from JavaScript)
  pEditor->GetGuiItem()->registerCallback("UncertaintyRenderNode.setTextureFiles",
      "Reads simulation data", std::function([pEditor](double id, std::string params) {
        pEditor->GetNode<UncertaintyRenderNode>(std::lround(id))->SetTextureFiles(params);
      }));

  // Callback to adjust the opacity of the rendering
  pEditor->GetGuiItem()->registerCallback("UncertaintyRenderNode.setOpacityUncertainty",
      "Adjusts the opacity of the rendering", std::function([pEditor](double id, double val) {
        pEditor->GetNode<UncertaintyRenderNode>(std::lround(id))->SetOpacity((float)val);
      }));

  // Callback to set a transfer function for the rendering
  pEditor->GetGuiItem()->registerCallback("UncertaintyRenderNode.setTransferFunction",
      "Sets the transfer function for rendering scalars",
      std::function([pEditor](double id, std::string val) {
        pEditor->GetNode<UncertaintyRenderNode>(std::lround(id))->SetTransferFunction(val);
      }));

  // Callback to set a transfer function for the rendering
  pEditor->GetGuiItem()->registerCallback("UncertaintyRenderNode.setTransferFunctionUncertainty",
      "Sets the transfer function for rendering difference and variance",
      std::function([pEditor](double id, std::string val) {
        pEditor->GetNode<UncertaintyRenderNode>(std::lround(id))
            ->SetTransferFunctionUncertainty(val);
      }));

  pEditor->GetGuiItem()->registerCallback("UncertaintyRenderNode.setUncertaintyVisualizationMode",
      "Sets the uncertainty visualization mode", std::function([pEditor](double id, double val) {
        UncertaintyOverlayRenderer::RenderMode renderMode;

        csp::vestec::logger().debug("[{}] Switching cp vis to {}", GetName(), std::to_string(val));

        switch ((int)val) {
        case 1:
          renderMode = UncertaintyOverlayRenderer::RenderMode::Average;
          break;
        case 2:
          renderMode = UncertaintyOverlayRenderer::RenderMode::Variance;
          break;
        case 3:
          renderMode = UncertaintyOverlayRenderer::RenderMode::Difference;
          break;
        case 4:
          renderMode = UncertaintyOverlayRenderer::RenderMode::Mixed_Variance;
          break;
        case 5:
          renderMode = UncertaintyOverlayRenderer::RenderMode::Mixed_Difference;
          break;
        default:
          renderMode = UncertaintyOverlayRenderer::RenderMode::Average;
          break;
        }
        pEditor->GetNode<UncertaintyRenderNode>(std::lround(id))
            ->GetRenderNode()
            ->SetVisualizationMode(renderMode);
      }));
}

////////////////////////////////////////////////////////////////////////////////////////////////////

UncertaintyOverlayRenderer* UncertaintyRenderNode::GetRenderNode() {
  return m_pRenderer;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void UncertaintyRenderNode::SetOpacity(float val) {
  m_pRenderer->SetOpacity(val);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void UncertaintyRenderNode::SetTransferFunction(std::string json) {
  m_pRenderer->SetTransferFunction(json);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void UncertaintyRenderNode::SetTransferFunctionUncertainty(std::string json) {
  m_pRenderer->SetTransferFunctionUncertainty(json);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void UncertaintyRenderNode::SetTextureFiles(std::string jsonFilenames) {
  double min = 100000;
  double max = 0;

  // Create a thead to load the data and do not block main thread
  std::thread threadLoad([=, &min, &max]() {
    // Forward to OGL renderer
    nlohmann::json args = nlohmann::json::parse(jsonFilenames);

    // Create textures
    std::vector<GDALReader::GreyScaleTexture> vecTextures;

    // range-based for over persistence pairs
    for (auto& filename : args) {
      // Read the GDAL texture (grayscale only 1 float channel)
      GDALReader::GreyScaleTexture texture;
      GDALReader::ReadGrayScaleTexture(texture, filename);
      vecTextures.push_back(texture);
      if (texture.dataRange[0] < min) {
        min = texture.dataRange[0];
      }

      if (texture.dataRange[1] > max) {
        max = texture.dataRange[1];
      }
    }
    // Add the new texture for rendering
    m_pRenderer->SetOverlayTextures(vecTextures);
  });
  threadLoad.detach();

  m_pItem->callJavascript("UncertaintyRenderNode.setRange", GetID(), min, max);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void UncertaintyRenderNode::UnloadTexture() {
  m_pRenderer->UnloadTexture();
}