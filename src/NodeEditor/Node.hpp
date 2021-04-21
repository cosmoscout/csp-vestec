
#ifndef NodeEditor_NODE_HPP_
#define NodeEditor_NODE_HPP_

#include "../../../../src/cs-gui/GuiItem.hpp"
#include "../logger.hpp"
#include <VistaKernel/GraphicsManager/VistaOpenGLNode.h>
#include <map>
#include <vector>

namespace VNE {

class Node {
 public:
  Node(cs::gui::GuiItem* pItem);
  Node(cs::gui::GuiItem* pItem, int id);
  Node(cs::gui::GuiItem* pItem, int id, int inportCount, int outportCount);
  virtual ~Node();

  /**
   * Set the ID of the Node
   */
  void SetID(int ID);

  /**
   * Get the Node ID
   */
  int GetID();

  /**
   * Add an input connection to the node
   */
  void AddInportNode(int id, Node* pNode, int outport, int inport);
  /**
   * Remove a specified input connection
   */
  void RemoveInputNode(int id, int outport, int inport);

  /**
   * Connect the node to another node
   */
  void AddOutportNode(int id, Node* pNode, int outport, int inport);
  /**
   * Remove an output connection
   */
  void RemoveOutputNode(int id, int outport, int inport);

  /**
   * Retrieve all input ports
   */
  std::vector<std::map<std::pair<int, int>, Node*>>& GetInputPorts();

  /**
   * Retrieve all output ports
   */
  std::vector<std::map<std::pair<int, int>, Node*>>& GetOutputPorts();

 protected:
  cs::gui::GuiItem*                m_pItem;
  std::unique_ptr<VistaOpenGLNode> m_pNode = nullptr; //! The VISTA OpenGL node in the scene graph

 private:
  int m_iID;
  /**
   * In and outport Nodes
   */
  std::vector<std::map<std::pair<int, int>, Node*>> m_vecInportNodes;
  std::vector<std::map<std::pair<int, int>, Node*>> m_vecOutportNodes;
};

} /* namespace VNE */

#endif /* SRC_NodeEditor_NODE_HPP_ */
