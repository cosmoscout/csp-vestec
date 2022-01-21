
#ifndef DISEASES_SENSOR_INPUT_NODE_HPP_
#define DISEASES_SENSOR_INPUT_NODE_HPP_

#include "../NodeEditor/Node.hpp"
#include "../Plugin.hpp"

namespace VNE {
class NodeEditor;
}

class DiseasesSensorInputNode : public VNE::Node {
 public:
  DiseasesSensorInputNode(
      csp::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem, int id);
  virtual ~DiseasesSensorInputNode();

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
  void ReadSensorFileNames(int id, const std::string& path);

 private:
  csp::vestec::Plugin::Settings mPluginConfig;
};

#endif /* DISEASES_SENSOR_SOURCE_NODE_HPP_ */
