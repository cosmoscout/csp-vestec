//
// Created by krus_he on 03.02.20.
//

#include "PersistenceNode.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"
#include "../NodeEditor/NodeEditor.hpp"
#include "../Plugin.hpp"

PersistenceNode::PersistenceNode(cs::gui::GuiItem* pItem, int id)
    : VNE::Node(pItem, id, 1, 1) {
}

////////////////////////////////////////////////////////////////////////////////////////////////////

PersistenceNode::~PersistenceNode() {
}

////////////////////////////////////////////////////////////////////////////////////////////////////

std::string PersistenceNode::GetName() {
  return "PersistenceNode";
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void PersistenceNode::Init(VNE::NodeEditor* pEditor) {
  csp::vestec::logger().debug("[{}] Init", GetName());

  const std::string vtkJs =
      cs::utils::filesystem::loadToString("../share/resources/gui/third-party/js/vtk_14.8.1.js");
  pEditor->GetGuiItem()->executeJavascript(vtkJs);

  const std::string renderer = cs::utils::filesystem::loadToString(
      "../share/resources/gui/third-party/js/PersistenceRenderer.js");
  pEditor->GetGuiItem()->executeJavascript(renderer);

  const std::string node = cs::utils::filesystem::loadToString(
      "../share/resources/gui/js/csp-vestec-persistence-node.js");
  pEditor->GetGuiItem()->executeJavascript(node);

  // Pass data dir for reading vtk js from the exporter
  pEditor->GetGuiItem()->callJavascript("PersistenceNode.setPath", csp::vestec::Plugin::dataDir);
}
