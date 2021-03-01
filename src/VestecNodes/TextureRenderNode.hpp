
#ifndef SIMPLE_TEXTURE_RENDER_NODE_HPP_
#define SIMPLE_TEXTURE_RENDER_NODE_HPP_

#include "../NodeEditor/Node.hpp"
#include "../Plugin.hpp"
#include "../Rendering/TextureOverlayRenderer.hpp"

#include "../../../../src/cs-core/GraphicsEngine.hpp"
#include "../../../../src/cs-core/SolarSystem.hpp"
#include "../../../../src/cs-scene/CelestialAnchorNode.hpp"

namespace VNE {
class NodeEditor;
}

class TextureRenderNode : public VNE::Node {
 public:
  TextureRenderNode(csp::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem, int id,
      cs::core::SolarSystem* pSolarSystem, cs::scene::CelestialAnchorNode* pAnchor,
      cs::core::GraphicsEngine* pEngine);
  virtual ~TextureRenderNode();

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
  void SetOpacity(float val);

  /*
   * Sets the transfer function for the rendering
   */
  void SetTransferFunction(std::string json);

  /**
   * Set the time value
   */
  void SetTime(float val);

  /**
   * Set if timing information should be used by the shader
   */
  void SetUseTime(bool use);

 private:
  csp::vestec::Plugin::Settings
                                  mPluginConfig; //! Needed to access a path defined in the Plugin::Settings
  cs::scene::CelestialAnchorNode* m_pAnchor =
      nullptr; //! Anchor on which the TextureOverlayRenderer is added (normally centered in earth)
  TextureOverlayRenderer* m_pRenderer =
      nullptr; //! The renderer to overlay a texture onto a previous renderer image (depthBuffer)

};

#endif /* SIMPLE_TEXTURE_RENDER_NODE_HPP_ */
