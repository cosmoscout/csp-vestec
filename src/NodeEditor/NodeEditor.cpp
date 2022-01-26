/*
 * NodeEditor.cpp
 *
 *  Created on: 21.06.2018
 *      Author: flat_ma
 */

#include "NodeEditor.hpp"
#include <sstream>
namespace VNE {

NodeEditor::NodeEditor(cs::gui::GuiItem *pWebView) { m_pWebView = pWebView; }

////////////////////////////////////////////////////////////////////////////////////////////////////

NodeEditor::~NodeEditor() {
  // TODO Auto-generated destructor stub
}

////////////////////////////////////////////////////////////////////////////////////////////////////

cs::gui::GuiItem *NodeEditor::GetGuiItem() { return m_pWebView; }

////////////////////////////////////////////////////////////////////////////////////////////////////

size_t NodeEditor::GetNumberOfNodes() { return m_mapNodes.size(); }

////////////////////////////////////////////////////////////////////////////////////////////////////

int NodeEditor::GetMaxNodeID() {
  int maxID = 0;

  for (auto const &it : m_mapNodes) {
    if (it.first > maxID) {
      maxID = it.first;
    }
  }

  return maxID;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void NodeEditor::RegisterNodeType(
    const std::string &name, std::string category,
    std::function<Node *(cs::gui::GuiItem *, int id)> fFactory,
    std::function<void(NodeEditor *)> fInit) {
  m_mapCreatorFunctions[name] = fFactory;
  m_mapInitFunctions[name] = fInit;
  m_mapCategories[category].push_back(name);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void NodeEditor::RegisterSocketType(const std::string &name) {
  m_vecSockets.push_back(name);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void NodeEditor::AddNewNode(int id, const std::string &name) {
  auto it = m_mapCreatorFunctions.find(name);
  if (it != m_mapCreatorFunctions.end()) {
    csp::vestec::logger().info(
        "[NodeEditor::AddNewNode] New {} node added to editor! ID = {}", name,
        id);

    Node *pNode = m_mapCreatorFunctions[name](m_pWebView, id);
    m_mapNodes[id] = pNode;
  } else {
    csp::vestec::logger().info(
        "[NodeEditor::AddNewNode] No creator function found for {}", name);
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void NodeEditor::DeleteNode(int id) {
  auto it = m_mapNodes.find(id);
  if (it != m_mapNodes.end()) {
    delete it->second;
    m_mapNodes.erase(it);
    csp::vestec::logger().info(
        "[NodeEditor::DeleteNode] Delete node with id {}", id);
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void NodeEditor::AddConnection(int from, int to, int fromPort, int toPort) {
  auto it1 = m_mapNodes.find(from);
  auto it2 = m_mapNodes.find(to);

  if (it1 != m_mapNodes.end() && it2 != m_mapNodes.end()) {
    Node *node1 = it1->second;
    Node *node2 = it2->second;

    node1->AddOutportNode(to, node2, fromPort, toPort);
    node2->AddInportNode(from, node1, fromPort, toPort);
    csp::vestec::logger().info(
        "[NodeEditor::AddConnection] Add connection from node {} to node {}",
        from, to);

  } else {
    csp::vestec::logger().error("[NodeEditor::AddConnection] Error in node "
                                "editor! Nodes for connection are not found");
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void NodeEditor::DeleteConnection(int from, int to, int fromPort, int toPort) {
  auto it1 = m_mapNodes.find(from);
  auto it2 = m_mapNodes.find(to);

  if (it1 != m_mapNodes.end() && it2 != m_mapNodes.end()) {
    Node *node1 = it1->second;
    Node *node2 = it2->second;

    node2->RemoveInputNode(from, fromPort, toPort);
    node1->RemoveOutputNode(to, fromPort, toPort);
    csp::vestec::logger().info("[NodeEditor::DeleteConnection] Delete "
                               "connection from node {} to node {}",
                               from, to);
  } else if (it1 != m_mapNodes.end()) {
    Node *node = it1->second;
    node->RemoveOutputNode(to, fromPort, toPort);
    csp::vestec::logger().info(
        "[NodeEditor::DeleteConnection] Only removed output ports of node {}",
        from);

  } else if (it2 != m_mapNodes.end()) {
    Node *node = it2->second;
    node->RemoveInputNode(from, fromPort, toPort);
    csp::vestec::logger().info(
        "[NodeEditor::DeleteConnection] Only removed input ports of node {}",
        to);
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void NodeEditor::InitNodeEditor() {
  // Loop over sockets and add them to the editor
  for (auto const &name : m_vecSockets) {
    m_pWebView->callJavascript("CosmoScout.vestecNE.addSocket", name);
  }

  // Loop over registered node types and make them in javascript available
  for (auto const &nodeInitFunction : m_mapInitFunctions) {
    nodeInitFunction.second(this);
  }

  // Add node editor components
  for (auto const &name : m_mapInitFunctions) {
    m_pWebView->callJavascript("CosmoScout.vestecNE.addComponent", name.first);
  }

  // Build the context menu
  for (auto const &category : m_mapCategories) {
    m_pWebView->callJavascript("CosmoScout.vestecNE.addContextMenuCategory",
                               category.first);

    for (auto const &node : category.second) {
      m_pWebView->callJavascript("CosmoScout.vestecNE.addContextMenuContent",
                                 category.first, node);
    }
  }

  m_pWebView->callJavascript("CosmoScout.vestecNE.initContextMenu");
  m_pWebView->callJavascript("CosmoScout.vestecNE.initNodeEditor");

  m_pWebView->waitForFinishedLoading();
  // Register the required callbacks
  m_pWebView->registerCallback<double, std::string>(
      "AddNewNode", "Adds a new Node to the Node Editor",
      std::function([this](double filterID, std::string name) {
        this->AddNewNode(static_cast<int>(filterID), name);
      }));

  m_pWebView->registerCallback<double>(
      "DeleteNode", "Deletes a Node from the Node Editor",
      std::function([this](double filterID) {
        this->DeleteNode(static_cast<int>(filterID));
      }));

  m_pWebView->registerCallback<double, double, double, double>(
      "AddConnection", "Adds a new Node connection",
      std::function([this](double outputNode, double inputNode,
                           double outputPort, double inputPort) {
        this->AddConnection(
            static_cast<int>(outputNode), static_cast<int>(inputNode),
            static_cast<int>(outputPort), static_cast<int>(inputPort));
      }));

  m_pWebView->registerCallback<double, double, double, double>(
      "DeleteConnection", "Deletes a Node connection",
      std::function([this](double outputNode, double inputNode,
                           double outputPort, double inputPort) {
        this->DeleteConnection(
            static_cast<int>(outputNode), static_cast<int>(inputNode),
            static_cast<int>(outputPort), static_cast<int>(inputPort));
      }));
}
} // namespace VNE
