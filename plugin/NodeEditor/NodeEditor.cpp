/*
 * NodeEditor.cpp
 *
 *  Created on: 21.06.2018
 *      Author: flat_ma
 */

#include "NodeEditor.hpp"
#include <sstream>
namespace VNE {

NodeEditor::NodeEditor(cs::gui::GuiItem* pWebView) {
  m_pWebView = pWebView;
}

NodeEditor::~NodeEditor() {
  // TODO Auto-generated destructor stub
}

cs::gui::GuiItem* NodeEditor::GetGuiItem() {
  return m_pWebView;
}

int NodeEditor::GetNumberOfNodes() {
  return m_mapNodes.size();
}

int NodeEditor::GetMaxNodeID() {
  int maxID = 0;

  for (auto const& it : m_mapNodes) {
    if (it.first > maxID)
      maxID = it.first;
  }

  return maxID;
}

void NodeEditor::RegisterNodeType(std::string name, std::string category,
    std::function<Node*(cs::gui::GuiItem*, int id)> fFactory,
    std::function<void(NodeEditor*)>                fInit) {
  m_mapCreatorFunctions[name] = fFactory;
  m_mapInitFunctions[name]    = fInit;
  m_mapCategories[category].push_back(name);
}

void NodeEditor::RegisterSocketType(std::string name) {
  m_vecSockets.push_back(name);
}

void NodeEditor::AddNewNode(int id, std::string name) {
  auto it = m_mapCreatorFunctions.find(name);
  if (it != m_mapCreatorFunctions.end()) {
    std::cout << "\t [NodeEditor::AddNewNode] New " << name << "node added to editor! ID = " << id
              << std::endl;
    Node* pNode    = m_mapCreatorFunctions[name](m_pWebView, id);
    m_mapNodes[id] = pNode;
  } else {
    std::cout << "\t[NodeEditor::AddNewNode] No creator function found for " << name << std::endl;
  }
}

void NodeEditor::DeleteNode(int id) {
  auto it = m_mapNodes.find(id);
  if (it != m_mapNodes.end()) {
    delete it->second;
    m_mapNodes.erase(it);
    std::cout << "\t[NodeEditor::DeleteNode] Delete node with id " << id << std::endl;
  }
}

void NodeEditor::AddConnection(int from, int to, int fromPort, int toPort) {
  auto it1 = m_mapNodes.find(from);
  auto it2 = m_mapNodes.find(to);

  if (it1 != m_mapNodes.end() && it2 != m_mapNodes.end()) {
    Node* node1 = it1->second;
    Node* node2 = it2->second;

    node1->AddOutportNode(to, node2, fromPort, toPort);
    node2->AddInportNode(from, node1, fromPort, toPort);
    std::cout << "\t[NodeEditor::AddConnection] Add connection from node " << from << " to node "
              << to << std::endl;
  } else {
    std::cout << "\t[NodeEditor::AddConnection] Error in node editor! Nodes "
                 "for connection are not found"
              << std::endl;
  }
}

void NodeEditor::DeleteConnection(int from, int to, int fromPort, int toPort) {
  auto it1 = m_mapNodes.find(from);
  auto it2 = m_mapNodes.find(to);

  if (it1 != m_mapNodes.end() && it2 != m_mapNodes.end()) {
    Node* node1 = it1->second;
    Node* node2 = it2->second;

    node2->RemoveInputNode(from, fromPort, toPort);
    node1->RemoveOutputNode(to, fromPort, toPort);
    std::cout << "\t[NodeEditor::DeleteConnection] Delete connection from node " << from
              << " to node " << to << std::endl;
  } else if (it1 != m_mapNodes.end()) {
    Node* node = it1->second;
    node->RemoveOutputNode(to, fromPort, toPort);
    std::cout << "\t[NodeEditor::DeleteConnection] Only removed output "
                 "ports of node "
              << from << std::endl;
  } else if (it2 != m_mapNodes.end()) {
    Node* node = it2->second;
    node->RemoveInputNode(from, fromPort, toPort);
    std::cout << "\t[NodeEditor::DeleteConnection] Only removed input ports "
                 "of node "
              << to << std::endl;
  }
}

void NodeEditor::InitNodeEditor() {
  m_pWebView->executeJavascript("var nodeEditor = {};");
  m_pWebView->executeJavascript("nodeEditor.sockets = {};");
  m_pWebView->executeJavascript("nodeEditor.nodes = {};");

  // Loop over sockets and create/insert javascript code
  for (auto const& name : m_vecSockets) {
    m_pWebView->executeJavascript(
        "nodeEditor.sockets." + name + " = new D3NE.Socket('data', '" + name + "', 'hint');");
  }

  // Loop over registered node types and make them in javascript available
  for (auto const& nodeInitFunction : m_mapInitFunctions) {
    nodeInitFunction.second(this);
  }

  // Initialize the node editor
  std::string strJavascriptIniCode = "nodeEditor.components = [";
  for (auto const& name : m_mapInitFunctions) {
    strJavascriptIniCode += "nodeEditor.nodes." + name.first + ",";
  }
  strJavascriptIniCode.back() = ']';
  strJavascriptIniCode += ";\n";

  // Create string for the menu
  strJavascriptIniCode += "nodeEditor.menu = new D3NE.ContextMenu({";
  for (auto const& category : m_mapCategories) {
    strJavascriptIniCode += "'" + category.first + "':{";
    for (auto const& node : category.second) {
      strJavascriptIniCode += "'" + node + "': nodeEditor.nodes." + node + ",";
    }
    strJavascriptIniCode.back() = '}';
    strJavascriptIniCode += ",";
  }
  strJavascriptIniCode.back() = '}';
  strJavascriptIniCode += ");\n";

  strJavascriptIniCode += R"(  
	nodeEditor.container = document.querySelector('#d3-node-editor');
	nodeEditor.editor = new D3NE.NodeEditor('demo@0.1.0', nodeEditor.container, nodeEditor.components, nodeEditor.menu);

    nodeEditor.editor.eventListener.on('nodecreate', (node, persistent) => { 
    try
    {
        window.call_native("AddNewNode", parseInt(node.id), node.title);
    }catch (e) {
        console.log(e);
    }
    });

    nodeEditor.editor.eventListener.on('noderemove', (node, persistent) => { 
    try
    {
        window.call_native("DeleteNode", parseInt(node.id), node.title);
    }catch (e) {
        console.log(e);
    }
    });

    nodeEditor.editor.eventListener.on('connectioncreate', (connection, persistent) => { 
    try
    {
         window.call_native("AddConnection", parseInt(connection.output.node.id),parseInt(connection.input.node.id),
            connection.output.node.outputs.findIndex(output => output == connection.output),
						connection.input.node.inputs.findIndex(input => input == connection.input));
    }catch (e) {
        console.log(e);
    }
    });

    nodeEditor.editor.eventListener.on('connectionremove', (connection, persistent) => { 
    try
    {
         window.call_native("DeleteConnection", parseInt(connection.output.node.id),parseInt(connection.input.node.id),
            connection.output.node.outputs.findIndex(output => output == connection.output),
						connection.input.node.inputs.findIndex(input => input == connection.input));
    }catch (e) {
        console.log(e);
    }

    });

    nodeEditor.engine = new D3NE.Engine("demo@0.1.0", nodeEditor.components);

    nodeEditor.editor.eventListener.on("change", async function() {
        await nodeEditor.engine.abort();
        await nodeEditor.engine.process(nodeEditor.editor.toJSON());
    });

    nodeEditor.editor.view.zoomAt(nodeEditor.editor.nodes);
    nodeEditor.engine.process(nodeEditor.editor.toJSON());
    nodeEditor.editor.view.resize();
)";

  m_pWebView->executeJavascript(strJavascriptIniCode);
  m_pWebView->waitForFinishedLoading();
  // Register the required callbacks
  m_pWebView->registerCallback<double, std::string>(
      "AddNewNode", ([this](double const& filterID, std::string name) {
        this->AddNewNode((int)filterID, name);
      }));

  m_pWebView->registerCallback<double>(
      "DeleteNode", ([this](double const& filterID) { this->DeleteNode((int)filterID); }));

  m_pWebView->registerCallback<double, double, double, double>(
      "AddConnection", ([this](double const& outputNode, double const& inputNode,
                            double const& outputPort, double const& inputPort) {
        this->AddConnection((int)outputNode, (int)inputNode, (int)outputPort, (int)inputPort);
      }));

  m_pWebView->registerCallback<double, double, double, double>(
      "DeleteConnection", ([this](double const& outputNode, double const& inputNode,
                               double const& outputPort, double const& inputPort) {
        this->DeleteConnection((int)outputNode, (int)inputNode, (int)outputPort, (int)inputPort);
      }));
}
} // namespace VNE
