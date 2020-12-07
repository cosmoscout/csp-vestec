
#ifndef UNCERTAINTY_RENDER_NODE_HPP_
#define UNCERTAINTY_RENDER_NODE_HPP_

#include "../NodeEditor/Node.hpp"
#include "../Plugin.hpp"
#include "../Rendering/UncertaintyRenderer.hpp"

#include "../../../../src/cs-core/GraphicsEngine.hpp"
#include "../../../../src/cs-core/SolarSystem.hpp"
#include "../../../../src/cs-scene/CelestialAnchorNode.hpp"

namespace VNE {
class NodeEditor;
}

class UncertaintyRenderNode : public VNE::Node {
 public:
  UncertaintyRenderNode(csp::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem,
      int id, cs::core::SolarSystem* pSolarSystem, cs::scene::CelestialAnchorNode* pAnchor,
      cs::core::GraphicsEngine* pEngine);
  virtual ~UncertaintyRenderNode();

  /**
   * These static functions are required and needs to be implemented
   */
  static void Init(VNE::NodeEditor* pEditor);

  /**
   * Returns the unique identifier for the node as string
   */
  static std::string GetName();

  /**
   * Reads the passed textures from JSON string into a GL texture
   * which is used to draw an overlay over a planet
   */
  void SetTextureFiles(std::string jsonFilenames);

  /**
   * Set the opacity of the overlay
   */
  void SetOpacity(double val);

  /*
   * Sets the transfer function for rendering scalar values
   */
  void SetTransferFunction(std::string json);

  /*
   * Sets the transfer function for rendering difference and variance values
   */
  void SetTransferFunctionUncertainty(std::string json);

  /**
   * Get the OpenGL uncertainty render node from ViSTA
   */
  UncertaintyOverlayRenderer* GetRenderNode();

 private:
  csp::vestec::Plugin::Settings
                                  mPluginConfig; //! Needed to access a path defined in the Plugin::Settings
  cs::scene::CelestialAnchorNode* m_pAnchor =
      nullptr; //! Anchor on which the TextureOverlayRenderer is added (normally centered in earth)
  UncertaintyOverlayRenderer* m_pRenderer =
      nullptr; //! The renderer to overlay a texture onto a previous renderer image (depthBuffer)
};

#endif /* SIMPLE_TEXTURE_RENDER_NODE_HPP_ */
