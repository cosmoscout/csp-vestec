
#ifndef WILDFIRE_SOURCE_NODE_HPP_
#define WILDFIRE_SOURCE_NODE_HPP_

#include "../Plugin.hpp"
#include "../NodeEditor/Node.hpp"

namespace VNE {
class NodeEditor;
}

class WildFireSourceNode : public VNE::Node {
 public:
  WildFireSourceNode(cs::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem, int id);
  virtual ~WildFireSourceNode();

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
   * Read available simulation modes and fill the combobox
   */
  void ReadSimulationModes(int id);

  /**
   * Read available tiff files from the simulation output and add to combobox
   */
  void ReadSimulationFileNames(int id);

  private:
    cs::vestec::Plugin::Settings mPluginConfig; 
};

#endif /* WILDFIRE_SOURCE_NODE_HPP_ */
