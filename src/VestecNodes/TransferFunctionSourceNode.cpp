
#include "TransferFunctionSourceNode.hpp"

#include "../../../../src/cs-utils/filesystem.hpp"

TransferFunctionSourceNode::TransferFunctionSourceNode(
    csp::vestec::Plugin::Settings const &config, cs::gui::GuiItem *pItem,
    int id)
    : VNE::Node(pItem, id, 0, 1) {
  mPluginConfig = config;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

TransferFunctionSourceNode::~TransferFunctionSourceNode() {}

////////////////////////////////////////////////////////////////////////////////////////////////////

std::string TransferFunctionSourceNode::GetName() {
  return "TransferFunctionSourceNode";
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TransferFunctionSourceNode::Init(VNE::NodeEditor *pEditor) {
  // Load JavaScript content from file
  std::string code = cs::utils::filesystem::loadToString(
      "../share/resources/gui/js/csp-vestec-transfer-function-source-node.js");

  pEditor->GetGuiItem()->executeJavascript(code);
}
