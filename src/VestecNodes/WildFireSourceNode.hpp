
#ifndef WILDFIRE_SOURCE_NODE_HPP_
#define WILDFIRE_SOURCE_NODE_HPP_

#include "../NodeEditor/Node.hpp"
#include "../Plugin.hpp"

namespace VNE {
class NodeEditor;
}

/**
 * Read Wildfire textures to be displayed by the TextureRenderNode
 */
class WildFireSourceNode : public VNE::Node {
public:
  WildFireSourceNode(csp::vestec::Plugin::Settings const &config,
                     cs::gui::GuiItem *pItem, int id);
  virtual ~WildFireSourceNode();

  /**
   * These static functions are required and needs to be implemented
   */
  static void Init(VNE::NodeEditor *pEditor);

  /**
   * Returns the unique identifier for the node as string
   */
  static std::string GetName();

private:
  /**
   * Read available simulation modes and fill the combobox
   */
  void ReadSimulationModes(int id);

  /**
   * Read available tiff files from the simulation output and add to combobox
   */
  void ReadSimulationFileNames(int id, std::string simMode);

private:
  csp::vestec::Plugin::Settings mPluginConfig;
};

#endif /* WILDFIRE_SOURCE_NODE_HPP_ */
