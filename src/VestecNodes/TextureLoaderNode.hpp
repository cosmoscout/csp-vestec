
#ifndef TEXTURE_LOADER_NODE_HPP_
#define TEXTURE_LOADER_NODE_HPP_

#include "../NodeEditor/Node.hpp"
#include "../Plugin.hpp"

namespace VNE {
class NodeEditor;
}

/**
 * Read textures found in a configured folder
 */
class TextureLoaderNode : public VNE::Node {
 public:
  TextureLoaderNode(cs::gui::GuiItem* pItem, int id);
  virtual ~TextureLoaderNode();

  /**
   * These static functions are required and needs to be implemented
   */
  static void Init(VNE::NodeEditor* pEditor);

  /**
   * Returns the unique identifier for the node as string
   */
  static std::string GetName();

 private:
  /**
   * Read available tiff files from the simulation output and add to combobox
   */
  void ReadFileNames(int id);

 private:
  csp::vestec::Plugin::Settings mPluginConfig;
};

#endif /* TEXTURE_LOADER_NODE_HPP_ */
