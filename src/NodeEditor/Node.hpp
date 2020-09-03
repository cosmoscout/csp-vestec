
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

  void SetID(int ID);
  int  GetID();

  void AddInportNode(int id, Node* pNode, int outport, int inport);
  void RemoveInputNode(int id, int outport, int inport);

  void AddOutportNode(int id, Node* pNode, int outport, int inport);
  void RemoveOutputNode(int id, int outport, int inport);

  std::vector<std::map<std::pair<int, int>, Node*>>& GetInputPorts();
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
