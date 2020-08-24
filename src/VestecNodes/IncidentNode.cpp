////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR                               //
//      and may be used under the terms of the MIT license. See the LICENSE file for details.     //
//                        Copyright: (c) 2019 German Aerospace Center (DLR)                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

#include "IncidentNode.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"
#include "../NodeEditor/NodeEditor.hpp"
#include "../Plugin.hpp"

IncidentNode::IncidentNode(cs::gui::GuiItem* pItem, int id)
    : VNE::Node(pItem, id) {
}

IncidentNode::~IncidentNode() {
}

std::string IncidentNode::GetName() {
  return "IncidentNode";
}

void IncidentNode::Init(VNE::NodeEditor* pEditor) {
  csp::vestec::logger().debug("[" + GetName() + "] Init");

  const std::string node =
      cs::utils::filesystem::loadToString("../share/resources/gui/js/csp-vestec-incident-node.js");
  pEditor->GetGuiItem()->executeJavascript(node);
}
