//
// Created by krus_he on 03.02.20.
//

#include "PersistenceNode.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"
#include "../NodeEditor/NodeEditor.hpp"
#include "../Plugin.hpp"

PersistenceNode::PersistenceNode(cs::gui::GuiItem* pItem, int id)
    : VNE::Node(pItem, id) {
}

PersistenceNode::~PersistenceNode() {
}

std::string PersistenceNode::GetName() {
  return "PersistenceNode";
}

void PersistenceNode::Init(VNE::NodeEditor* pEditor) {
  const std::string node = cs::utils::filesystem::loadToString(
      "../share/resources/gui/js/csp-vestec-persistence-node.js");
  pEditor->GetGuiItem()->executeJavascript(node);
}
