/*
 * Node.cpp
 *
 *  Created on: 21.06.2018
 *      Author: flat_ma
 */

#include "Node.hpp"

namespace VNE {

Node::Node(cs::gui::GuiItem* pItem) {
  m_pItem = pItem;
  m_vecInportNodes.resize(1);
  m_vecOutportNodes.resize(1);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

Node::Node(cs::gui::GuiItem* pItem, int id) {
  m_pItem = pItem;
  m_iID   = id;
  m_vecInportNodes.resize(1);
  m_vecOutportNodes.resize(1);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

Node::Node(cs::gui::GuiItem* pItem, int id, int inportCount, int outportCount) {
  m_pItem = pItem;
  m_iID   = id;
  m_vecInportNodes.resize(inportCount);
  m_vecOutportNodes.resize(outportCount);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

Node::~Node() {
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void Node::SetID(int ID) {
  m_iID = ID;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

int Node::GetID() {
  return m_iID;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void Node::AddInportNode(int id, Node* pNode, int outport, int inport) {
  m_vecInportNodes[inport].insert({{id, outport}, pNode});
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void Node::RemoveInputNode(int id, int outport, int inport) {
  auto it = m_vecInportNodes[inport].find({id, outport});
  if (it != m_vecInportNodes[inport].end()) {
    m_vecInportNodes[inport].erase({id, outport});
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void Node::AddOutportNode(int id, Node* pNode, int outport, int inport) {
  m_vecOutportNodes[outport].insert({{id, inport}, pNode});
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void Node::RemoveOutputNode(int id, int outport, int inport) {
  auto it = m_vecOutportNodes[outport].find({id, inport});
  if (it != m_vecOutportNodes[outport].end()) {
    m_vecOutportNodes[outport].erase({id, inport});
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

std::vector<std::map<std::pair<int, int>, Node*>>& Node::GetInputPorts() {
  return m_vecInportNodes;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

std::vector<std::map<std::pair<int, int>, Node*>>& Node::GetOutputPorts() {
  return m_vecOutportNodes;
}

} // namespace VNE
