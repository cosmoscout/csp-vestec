
#ifndef CRITICALPOINTS_SOURCE_NODE_HPP_
#define CRITICALPOINTS_SOURCE_NODE_HPP_

#include "../NodeEditor/Node.hpp"
#include "../Plugin.hpp"
#include "../Rendering/CriticalPointsRenderer.hpp"

#include "../../../../src/cs-core/GraphicsEngine.hpp"
#include "../../../../src/cs-core/SolarSystem.hpp"
#include "../../../../src/cs-scene/CelestialAnchorNode.hpp"

namespace VNE {
class NodeEditor;
}

class CriticalPointsNode : public VNE::Node {
 public:
  CriticalPointsNode(cs::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem, int id,
      cs::core::SolarSystem* pSolarSystem, cs::scene::CelestialAnchorNode* pAnchor,
      cs::core::GraphicsEngine* pEngine);
  virtual ~CriticalPointsNode();

  /**
   * These static functions are required and needs to be implemented
   */
  static void Init(VNE::NodeEditor* pEditor);

  /**
   * Returns the unique identifier for the node as string
   */
  static std::string GetName();

  /**
   * Set the points to be renderer stored in the json object
   */
  void SetPoints(std::string jsonObj);

  /**
   * Sets the opacity of the rendering
   */
  void SetOpacity(double val);

  /**
   * Get the iunderlaying render node
   */
  CriticalPointsRenderer* GetRenderNode();

 private:
  cs::vestec::Plugin::Settings
                                  mPluginConfig; //! Needed to access a path defined in the Plugin::Settings
  cs::scene::CelestialAnchorNode* m_pAnchor =
      nullptr; //! Anchor on which the TextureOverlayRenderer is added (normally centered in earth)
  VistaOpenGLNode*        m_pParent = nullptr; //! The VISTA OpenGL node in the scene graph
  CriticalPointsRenderer* m_pRenderer =
      nullptr; //! The renderer to overlay a texture onto a previous renderer image (depthBuffer)
};

#endif /* CRITICALPOINTS_SOURCE_NODE_HPP_ */
