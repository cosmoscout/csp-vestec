
#ifndef TRANSFER_FUNCTION_SOURCE_NODE_HPP_
#define TRANSFER_FUNCTION_SOURCE_NODE_HPP_

#include "../NodeEditor/Node.hpp"
#include "../Plugin.hpp"

namespace VNE {
class NodeEditor;
}

/**
 * The Transfer Function Source Node allows to add transfer functions to texture
 * render nodes
 *
 * Texture visibility is modified based on set function parameters
 *
 * Min- and max-ranges of the transfer function are limited to the values found
 * in the connected texture
 */
class TransferFunctionSourceNode : public VNE::Node {
 public:
  TransferFunctionSourceNode(
      csp::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem, int id);
  virtual ~TransferFunctionSourceNode();

  /**
   * These static functions are required and needs to be implemented
   */
  static void Init(VNE::NodeEditor* pEditor);

  /**
   * Returns the unique identifier for the node as string
   */
  static std::string GetName();

 private:
  csp::vestec::Plugin::Settings mPluginConfig;
};

#endif /* TRANSFER_FUNCTION_SOURCE_NODE_HPP_ */
