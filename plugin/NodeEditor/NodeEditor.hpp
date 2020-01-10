
#ifndef NODEEDITOR_HPP_
#define NODEEDITOR_HPP_

#include "../../../../src/cs-gui/GuiItem.hpp"
#include "Node.hpp"
#include <functional>
#include <map>
#include <string>
#include <vector>

namespace VNE {

class NodeEditor {
 public:
  NodeEditor(cs::gui::GuiItem* pWebView);
  virtual ~NodeEditor();

  /**
   * Register a new node to the editor
   */
  void RegisterNodeType(std::string name, std::string category,
      std::function<Node*(cs::gui::GuiItem*, int id)> fFactory,
      std::function<void(NodeEditor*)>                fInit);

  /**
   * Register a new socket connection with own type
   */
  void RegisterSocketType(std::string name);

  /**
   * Initialize the D§-node editor. Inserts javascript code to the document
   */
  void InitNodeEditor();

  /**
   * Add a new node to the manager
   */
  void AddNewNode(int id, std::string name);

  /**
   * Delete an existing node
   */
  void DeleteNode(int id);

  /**
   * Add a new connection between to nodes
   */
  void AddConnection(int from, int to, int fromPort, int toPort);

  /**
   * Remove a connection between to nodes
   */
  void DeleteConnection(int from, int to, int fromPort, int toPort);

  int GetNumberOfNodes();

  int GetMaxNodeID();

  cs::gui::GuiItem* GetGuiItem();

  template <typename T>
  T* GetNode(int id) const {
    auto it = m_mapNodes.find(id);
    if (it == m_mapNodes.end())
      return nullptr;

    return dynamic_cast<T*>(it->second);
  }

 private:
  cs::gui::GuiItem* m_pWebView;

  std::map<int, Node*> m_mapNodes;

  std::vector<std::string>                                               m_vecSockets;
  std::map<std::string, std::function<Node*(cs::gui::GuiItem*, int id)>> m_mapCreatorFunctions;
  std::map<std::string, std::function<void(NodeEditor*)>>                m_mapInitFunctions;
  std::map<std::string, std::vector<std::string>>                        m_mapCategories;
};
} // namespace VNE

#endif /* SRC_NodeEditor_NodeEditor_HPP_ */
