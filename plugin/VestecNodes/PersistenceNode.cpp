//
// Created by krus_he on 03.02.20.
//

#include "PersistenceNode.hpp"
#include "../NodeEditor/NodeEditor.hpp"
#include "../Plugin.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"


std::string PersistenceNode::GetName() {
    return "PersistenceNode";
}

void PersistenceNode::Init(VNE::NodeEditor *pEditor) {
    const std::string node = cs::utils::filesystem::loadToString("../share/resources/gui/js/csp-vestec-persistencenode.js");
    pEditor->GetGuiItem()->executeJavascript(node);
}
