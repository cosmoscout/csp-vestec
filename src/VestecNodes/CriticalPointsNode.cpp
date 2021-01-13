
#include "CriticalPointsNode.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"
#include "../Rendering/TextureOverlayRenderer.hpp"

#include <VistaKernel/GraphicsManager/VistaGraphicsManager.h>
#include <VistaKernel/GraphicsManager/VistaSceneGraph.h>
#include <VistaKernel/VistaSystem.h>
#include <VistaKernelOpenSGExt/VistaOpenSGMaterialTools.h>

#include <limits>
#include <set>

// for convenience
using json = nlohmann::json;

// Define PI
#define M_PI 3.14159265358979323846 /* pi */

CriticalPointsNode::CriticalPointsNode(csp::vestec::Plugin::Settings const& config,
    cs::gui::GuiItem* pItem, int id, cs::core::SolarSystem* pSolarSystem,
    cs::scene::CelestialAnchorNode* pAnchor, cs::core::GraphicsEngine* pEngine)
    : VNE::Node(pItem, id, 2, 0)
    , m_pAnchor(pAnchor) {
  // Store config data for later usage
  mPluginConfig = config;

  m_pRenderer = new CriticalPointsRenderer(pSolarSystem);

  // Add a TextureOverlayRenderer to the VISTA scene graph
  VistaSceneGraph* pSG = GetVistaSystem()->GetGraphicsManager()->GetSceneGraph();
  m_pNode.reset(pSG->NewOpenGLNode(m_pAnchor, m_pRenderer));

  // Render after planets which are rendered at cs::utils::DrawOrder::ePlanets
  VistaOpenSGMaterialTools::SetSortKeyOnSubtree(
      m_pNode.get(), static_cast<int>(cs::utils::DrawOrder::eOpaqueItems));
}

CriticalPointsNode::~CriticalPointsNode() {
  m_pAnchor->DisconnectChild(m_pNode.get());
  delete m_pRenderer;
}

std::string CriticalPointsNode::GetName() {
  return "CriticalPointsNode";
}

void CriticalPointsNode::Init(VNE::NodeEditor* pEditor) {
  csp::vestec::logger().debug("[{}] Init", GetName());
  // Load JavaScipt content from file which defines the node
  // in the node editor
  std::string code =
      cs::utils::filesystem::loadToString("../share/resources/gui/js/csp-vestec-cp-render-node.js");
  pEditor->GetGuiItem()->executeJavascript(code);

  // Callback which reads simulation data (path+x is given from JavaScript)
  pEditor->GetGuiItem()->registerCallback<double, std::string>(
      "setPoints", "Reads simulation data", std::function([pEditor](double id, std::string params) {
        pEditor->GetNode<CriticalPointsNode>(std::lround(id))->SetPoints(params);
      }));

  // Callback to adjust the opacity of the rendering
  pEditor->GetGuiItem()->registerCallback<double, double>("setOpacity",
      "Adjust the opacity of the rendering", std::function([pEditor](double id, double val) {
        pEditor->GetNode<CriticalPointsNode>(std::lround(id))->SetOpacity((float)val);
      }));

  // Callback to set a transfer function for the rendering
  pEditor->GetGuiItem()->registerCallback<double, std::string>(
      "CriticalPointsNode.setTransferFunction", "Sets the transfer function for rendering",
      std::function([pEditor](double id, std::string val) {
        pEditor->GetNode<CriticalPointsNode>(id)->SetTransferFunction(val);
      }));

  // Callback to set the visualization mode
  pEditor->GetGuiItem()->registerCallback<double, double>("setCriticalPointsVisualizationMode",
      "Sets the visualization mode", std::function([pEditor](double id, double val) {
        CriticalPointsRenderer::RenderMode renderMode = CriticalPointsRenderer::RenderMode::ALL;
        csp::vestec::logger().debug("[{}] Switching cp vis to {}", GetName(), std::to_string(val));

        switch (static_cast<int>(val)) {
        case 0:
          renderMode = CriticalPointsRenderer::RenderMode::MINIMA;
          break;
        case 1:
          renderMode = CriticalPointsRenderer::RenderMode::ONE_SADDLE;
          break;
        case 2:
          renderMode = CriticalPointsRenderer::RenderMode::TWO_SADDLE;
          break;
        case 3:
          renderMode = CriticalPointsRenderer::RenderMode::MAXIMA;
          break;
        case 4:
          renderMode = CriticalPointsRenderer::RenderMode::ALL;
          break;
        }
        pEditor->GetNode<CriticalPointsNode>(std::lround(id))
            ->GetRenderNode()
            ->SetVisualizationMode(renderMode);
      }));

  // Callback to adjust the height of the rendering
  pEditor->GetGuiItem()->registerCallback<double, double>("setCriticalPointsHeightScale",
      "Changes the scale of the critical points height",
      std::function([pEditor](double id, double val) {
        pEditor->GetNode<CriticalPointsNode>(std::lround(id))
            ->GetRenderNode()
            ->SetHeightScale(static_cast<float>(val));
      }));

  // Callback to adjust the width of the rendering
  pEditor->GetGuiItem()->registerCallback<double, double>("setCriticalPointsWidthScale",
      "Changes the scale of the critical points width",
      std::function([pEditor](double id, double val) {
        pEditor->GetNode<CriticalPointsNode>(std::lround(id))
            ->GetRenderNode()
            ->SetWidthScale(static_cast<float>(val));
      }));
}

CriticalPointsRenderer* CriticalPointsNode::GetRenderNode() {
  return m_pRenderer;
}

void CriticalPointsNode::SetOpacity(float val) {
  m_pRenderer->SetOpacity(val);
}

void CriticalPointsNode::SetTransferFunction(std::string json) {
  m_pRenderer->SetTransferFunction(json);
}

void CriticalPointsNode::SetPoints(const std::string& jsonObj) {
  // Forward to OGL renderer
  json args = json::parse(jsonObj);

  // Point store
  std::vector<CriticalPointsRenderer::CriticalPoint> vecPoints;

  float minPersistence = std::numeric_limits<float>::max();
  float maxPersistence = std::numeric_limits<float>::min();

  // range-based for over persistence pairs
  for (auto& element : args) {
    CriticalPointsRenderer::CriticalPoint upper{};
    CriticalPointsRenderer::CriticalPoint lower{};

    // Get the world coordinates for the critical point pair
    glm::dvec3 posU(element["coordinates"]["upper"]["x"], element["coordinates"]["upper"]["y"],
        element["coordinates"]["upper"]["z"]);
    glm::dvec3 posL(element["coordinates"]["lower"]["x"], element["coordinates"]["lower"]["y"],
        element["coordinates"]["lower"]["z"]);

    // Deg to rad
    glm::dvec3 lnglathU = (posU * M_PI) / glm::dvec3(180);
    glm::dvec3 lnglathL = (posL * M_PI) / glm::dvec3(180);

    // get the persistence value
    float persistence = -1;
    persistence       = element["persistence"];

    minPersistence = std::min(minPersistence, persistence);
    maxPersistence = std::max(maxPersistence, persistence);

    // Prepare the critical points
    upper.lnglatheight = lnglathU;
    upper.persistence  = persistence;
    upper.type         = element["criticalType"]["upper"];

    lower.lnglatheight = lnglathL;
    lower.persistence  = persistence;
    lower.type         = element["criticalType"]["lower"];

    vecPoints.push_back(upper);
    vecPoints.push_back(lower);
  }

  // Pass min max persistence values to the end of the vector
  CriticalPointsRenderer::CriticalPoint minP{};
  CriticalPointsRenderer::CriticalPoint maxP{};
  minP.persistence = minPersistence;
  maxP.persistence = maxPersistence;
  vecPoints.push_back(minP);
  vecPoints.push_back(maxP);

  m_pRenderer->SetPoints(vecPoints);
  csp::vestec::logger().debug("[{}::SetPoints] Got points from JavaScript", GetName());
}
