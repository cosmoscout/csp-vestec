////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR                               //
//      and may be used under the terms of the MIT license. See the LICENSE file for details.     //
//                        Copyright: (c) 2019 German Aerospace Center (DLR)                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

#include "../../../../src/cs-utils/filesystem.hpp"
#include "../NodeEditor/NodeEditor.hpp"
#include "../Plugin.hpp"
#include "TextureLoaderNode.hpp"
#include <nlohmann/json.hpp>

TextureLoaderNode::TextureLoaderNode(cs::gui::GuiItem* pItem, int id)
    : VNE::Node(pItem, id, 0, 1) {
}

////////////////////////////////////////////////////////////////////////////////////////////////////

TextureLoaderNode::~TextureLoaderNode() {
}

////////////////////////////////////////////////////////////////////////////////////////////////////

std::string TextureLoaderNode::GetName() {
  return "TextureLoaderNode";
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureLoaderNode::Init(VNE::NodeEditor* pEditor) {
  csp::vestec::logger().debug("[{}] Init", GetName());

  const std::string node =
      cs::utils::filesystem::loadToString("../share/resources/gui/js/csp-vestec-texture-loader-node.js");
  pEditor->GetGuiItem()->executeJavascript(node);

  pEditor->GetGuiItem()->registerCallback<double>("TextureLoaderNode.readFileNames",
                           "Reads file names", std::function([pEditor](double id) {
        pEditor->GetNode<TextureLoaderNode>(std::lround(id))
            ->ReadFileNames(std::lround(id));
      }));
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureLoaderNode::ReadFileNames(int id) {
  if (csp::vestec::Plugin::vestecTexturesDir.empty()) {
    return;
  }

  std::set<std::string> lFiles(cs::utils::filesystem::listFiles(csp::vestec::Plugin::vestecTexturesDir));
  nlohmann::json        args(lFiles);

  m_pItem->callJavascript("TextureLoaderNode.fillTextureSelect", args.dump(), id);
}