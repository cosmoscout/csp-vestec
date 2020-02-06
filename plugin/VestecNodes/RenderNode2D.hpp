
#ifndef RENDERNODE2D_SOURCE_NODE_HPP_
#define RENDERNODE2D_SOURCE_NODE_HPP_

#include "../Rendering/TextureOverlayRenderer.hpp"
#include "../NodeEditor/Node.hpp"
#include "../Plugin.hpp"

#include "../../../../src/cs-core/GraphicsEngine.hpp"
#include "../../../../src/cs-core/SolarSystem.hpp"
#include "../../../../src/cs-scene/CelestialAnchorNode.hpp"

namespace VNE {
class NodeEditor;
}

class RenderNode2D : public VNE::Node {
 public:
  RenderNode2D(cs::vestec::Plugin::Settings const& config,
               cs::gui::GuiItem* pItem,
               int id,
               cs::core::SolarSystem* pSolarSystem,
               cs::scene::CelestialAnchorNode* pAnchor,
               cs::core::GraphicsEngine* pEngine);
  virtual ~RenderNode2D();

  /**
   * These static functions are required and needs to be implemented
   */
  static void Init(VNE::NodeEditor* pEditor);

  /**
   * Returns the unique identifier for the node as string
   */
  static std::string GetName();

  /**
   * Reads the simulation results from the file into a GL texture
   * which is used to draw an overlay over a planet
   */
  void ReadSimulationResult(std::string filename);

  /**
   * Set the opacity of the overlay
   */
  void SetOpacity(double val);

 private:
  cs::vestec::Plugin::Settings      mPluginConfig; //! Needed to access a path defined in the Plugin::Settings
  cs::scene::CelestialAnchorNode*   m_pAnchor = nullptr; //! Anchor on which the TextureOverlayRenderer is added (normally centered in earth)
  VistaOpenGLNode*                  m_pParent = nullptr; //! The VISTA OpenGL node in the scene graph
  TextureOverlayRenderer*           m_pRenderer = nullptr; //! The renderer to overlay a texture onto a previous renderer image (depthBuffer)
};

#endif /* RENDERNODE2D_SOURCE_NODE_HPP_ */
