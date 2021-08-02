
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

/**
 * The Texture Render Node draws arbitrary textures that are readable by the GDALReader
 * For each texture mip maps are generated which are drawn based on the observer distance to
 * the currently active body
 *
 * MipMap levels can optionally be toggled through the node editor
 * An additional reduction mode (min / max / average) can also be set
 *
 * @see GDALReader
 */
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

  /**
   * Set the current mipmap level, only active if manual mipmaps are enabled
   */
  void SetMipMapLevel(double val);

  /**
   * Set the state for enabling or disabling manual mipmaps
   */
  void EnableManualMipMaps(bool val);

  /**
   * Set the mode for mipmap reduction
   */
  void SetMipMapReduceMode(int mode);

  /**
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

  /**
   * Sets the min and max data ranges from a texture with multiple layers
   */
  void SetMinMaxDataRange(std::string filePath);

  /**
   * Unloads the currently used texture
   */
  void UnloadTexture();

  /**
   * Read the number of layers in the texture
   */
  void GetNumberOfTextureLayers(std::string filePath);

  /**
   * Set the layer to be visualized from the texture
   */
  void SetTextureLayerID(int layerID);

 private:
  int                 m_iLayerID = 1;
  std::vector<double> minMaxRange;
  csp::vestec::Plugin::Settings
                                  mPluginConfig; //! Needed to access a path defined in the Plugin::Settings
  cs::scene::CelestialAnchorNode* m_pAnchor =
      nullptr; //! Anchor on which the TextureOverlayRenderer is added (normally centered in earth)
  TextureOverlayRenderer* m_pRenderer =
      nullptr; //! The renderer to overlay a texture onto a previous renderer image (depthBuffer)
};

#endif /* SIMPLE_TEXTURE_RENDER_NODE_HPP_ */
