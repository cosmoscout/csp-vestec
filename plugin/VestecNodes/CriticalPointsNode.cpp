
#include "CriticalPointsNode.hpp"
#include "../../../../src/cs-utils/convert.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"
#include "../NodeEditor/NodeEditor.hpp"
#include "../Rendering/TextureOverlayRenderer.hpp"

#include <VistaKernel/GraphicsManager/VistaGraphicsManager.h>
#include <VistaKernel/GraphicsManager/VistaOpenGLNode.h>
#include <VistaKernel/GraphicsManager/VistaSceneGraph.h>
#include <VistaKernel/VistaSystem.h>
#include <VistaKernelOpenSGExt/VistaOpenSGMaterialTools.h>

#include <iomanip>
#include <json.hpp>
#include <limits>
#include <set>
// for convenience
using json = nlohmann::json;

// Define PI
#define M_PI 3.14159265358979323846 /* pi */

CriticalPointsNode::CriticalPointsNode(cs::vestec::Plugin::Settings const& config,
    cs::gui::GuiItem* pItem, int id, cs::core::SolarSystem* pSolarSystem,
    cs::scene::CelestialAnchorNode* pAnchor, cs::core::GraphicsEngine* pEngine)
    : VNE::Node(pItem, id)
    , m_pAnchor(pAnchor) {
  // Store config data for later usage
  mPluginConfig = config;

  // Add a CriticalPointsRenderer to the VISTA scene graph
  auto pSG    = GetVistaSystem()->GetGraphicsManager()->GetSceneGraph();
  m_pRenderer = new CriticalPointsRenderer(pSolarSystem);
  m_pParent   = pSG->NewOpenGLNode(m_pAnchor, m_pRenderer);

  // Render after planets which are rendered at 100
  VistaOpenSGMaterialTools::SetSortKeyOnSubtree(m_pAnchor, static_cast<int>(200));
}

CriticalPointsNode::~CriticalPointsNode() {
  delete m_pRenderer;
}

std::string CriticalPointsNode::GetName() {
  return "CriticalPointsNode";
}

void CriticalPointsNode::Init(VNE::NodeEditor* pEditor) {
  // Load JavaScipt content from file which defines the node
  // in the node editor
  std::string code =
      cs::utils::filesystem::loadToString("../share/resources/gui/js/csp-vestec-cp-render-node.js");
  pEditor->GetGuiItem()->executeJavascript(code);

  // Callback which reads simulation data (path+x is given from JavaScript)
  pEditor->GetGuiItem()->registerCallback<double, std::string>(
      "setPoints", ([pEditor](double id, std::string params) {
        pEditor->GetNode<CriticalPointsNode>(id)->SetPoints(params);
      }));

  // Callback to adjust the opacity of the rendering
  pEditor->GetGuiItem()->registerCallback<double, double>(
      "setOpacity", ([pEditor](double id, double val) {
        pEditor->GetNode<CriticalPointsNode>(id)->SetOpacity(val);
      }));
}

void CriticalPointsNode::SetOpacity(double val) {
  m_pRenderer->SetOpacity(val);
}

void CriticalPointsNode::SetPoints(std::string jsonObj) {
  // Forward to OGL renderer
  json args = json::parse(jsonObj);

  // Point store
  std::vector<CriticalPointsRenderer::CriticalPoint> vecPoints;

  float minPersistence = std::numeric_limits<float>::max();
  float maxPersistence = std::numeric_limits<float>::min();

  // range-based for over persistence pairs
  for (auto& element : args) {
    CriticalPointsRenderer::CriticalPoint upper;
    CriticalPointsRenderer::CriticalPoint lower;

    // Get the world coordinates for the critical point pair
    glm::dvec3 posU(element["coordinates"]["upper"]["x"], element["coordinates"]["upper"]["y"],
        element["coordinates"]["upper"]["z"]);
    glm::dvec3 posL(element["coordinates"]["lower"]["x"], element["coordinates"]["lower"]["y"],
        element["coordinates"]["lower"]["z"]);

    // Deg to rad
    glm::dvec3 lnglathU = (posU * M_PI) / glm::dvec3(180);
    glm::dvec3 lnglathL = (posL * M_PI) / glm::dvec3(180);

    // get the peristence value
    float persistence = -1;
    persistence       = element["persistence"];

    minPersistence = std::min(minPersistence, persistence);
    maxPersistence = std::max(maxPersistence, persistence);

    // Prepare the critical points
    upper.lnglatheight = lnglathU;
    upper.persistence  = persistence;

    lower.lnglatheight = lnglathL;
    lower.persistence  = persistence;

    vecPoints.push_back(upper);
    vecPoints.push_back(lower);
  }

  // Pass min max peristence values to the end of the vector
  CriticalPointsRenderer::CriticalPoint minP;
  CriticalPointsRenderer::CriticalPoint maxP;
  minP.persistence = minPersistence;
  maxP.persistence = maxPersistence;
  vecPoints.push_back(minP);
  vecPoints.push_back(maxP);

  m_pRenderer->SetPoints(vecPoints);
  std::cout << "Got points from JavaScript" << std::endl;
}