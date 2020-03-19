
#ifndef DISEASES_SIMULATION_NODE_HPP_
#define DISEASES_SIMULATION_NODE_HPP_

#include "../NodeEditor/Node.hpp"
#include "../Plugin.hpp"

namespace VNE {
class NodeEditor;
}

class DiseasesSimulation : public VNE::Node {
 public:
  DiseasesSimulation(cs::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem, int id);
  virtual ~DiseasesSimulation();

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
   * Read available textures and fill combo box
   */
  void ReadSimulationFileNames(int id);

 private:
  cs::vestec::Plugin::Settings mPluginConfig;
};

#endif /* DISEASES_SIMULATION_NODE_HPP_ */
