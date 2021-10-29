////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR //
//      and may be used under the terms of the MIT license. See the LICENSE file
//      for details.     //
//                        Copyright: (c) 2021 German Aerospace Center (DLR) //
////////////////////////////////////////////////////////////////////////////////////////////////////

#include "IncidentConfigNode.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"
#include "../NodeEditor/NodeEditor.hpp"
#include "../Plugin.hpp"

IncidentConfigNode::IncidentConfigNode(cs::gui::GuiItem *pItem, int id)
    : VNE::Node(pItem, id, 0, 1) {}

////////////////////////////////////////////////////////////////////////////////////////////////////

IncidentConfigNode::~IncidentConfigNode() {}

////////////////////////////////////////////////////////////////////////////////////////////////////

std::string IncidentConfigNode::GetName() { return "IncidentConfigNode"; }

////////////////////////////////////////////////////////////////////////////////////////////////////

void IncidentConfigNode::Init(VNE::NodeEditor *pEditor) {
  csp::vestec::logger().debug("[{}] Init", GetName());

  const std::string node = cs::utils::filesystem::loadToString(
      "../share/resources/gui/js/csp-vestec-incident-config-node.js");
  pEditor->GetGuiItem()->executeJavascript(node);
}
