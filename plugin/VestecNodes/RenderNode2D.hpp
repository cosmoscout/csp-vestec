
#ifndef RENDERNODE2D_SOURCE_NODE_HPP_
#define RENDERNODE2D_SOURCE_NODE_HPP_

#include "../NodeEditor/Node.hpp"
#include "../Plugin.hpp"

namespace VNE {
class NodeEditor;
}

class RenderNode2D : public VNE::Node {
 public:
  RenderNode2D(cs::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem, int id);
  virtual ~RenderNode2D();

  /**
   * These static functions are required and needs to be implemented
   */
  static void Init(VNE::NodeEditor* pEditor);

  /**
   * Returns the unique identifier for the node as string
   */
  static std::string GetName();

 private:
  cs::vestec::Plugin::Settings mPluginConfig;
};

#endif /* RENDERNODE2D_SOURCE_NODE_HPP_ */
