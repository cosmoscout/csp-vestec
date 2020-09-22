
#ifndef DISEASES_SIMULATION_NODE_HPP_
#define DISEASES_SIMULATION_NODE_HPP_

#include "../NodeEditor/Node.hpp"
#include "../Plugin.hpp"

namespace VNE {
class NodeEditor;
}

class DiseasesSimulation : public VNE::Node {
 public:
  DiseasesSimulation(csp::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem, int id);
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
   * Read available filename for a given timestep. In each ensemble member there should be one
   */
  void GetFileNamesForTimeStep(int id, std::string mode, double t);

  /**
   * Set the number of ensemble members to the FlowEditor node
   */
  void SetNumberOfEnsembleMembers(int id, std::string path);

  /**
   * Set the simulation modes
   */
  void SetSimulationModes(int id, const std::string& path);

 private:
  csp::vestec::Plugin::Settings mPluginConfig;
};

#endif /* DISEASES_SIMULATION_NODE_HPP_ */
