////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR //
//      and may be used under the terms of the MIT license. See the LICENSE file
//      for details.     //
//                        Copyright: (c) 2021 German Aerospace Center (DLR) //
////////////////////////////////////////////////////////////////////////////////////////////////////

#include "TextureUploadNode.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"
#include "../NodeEditor/NodeEditor.hpp"
#include "../Plugin.hpp"

// Base64
#include "../common/base64.hpp"

TextureUploadNode::TextureUploadNode(cs::gui::GuiItem* pItem, int id)
    : VNE::Node(pItem, id, 2, 0) {
}

////////////////////////////////////////////////////////////////////////////////////////////////////

TextureUploadNode::~TextureUploadNode() {
}

////////////////////////////////////////////////////////////////////////////////////////////////////

std::string TextureUploadNode::GetName() {
  return "TextureUploadNode";
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureUploadNode::Init(VNE::NodeEditor* pEditor) {
  csp::vestec::logger().debug("[{}] Init", GetName());

  const std::string node = cs::utils::filesystem::loadToString(
      "../share/resources/gui/js/csp-vestec-texture-upload-node.js");
  pEditor->GetGuiItem()->executeJavascript(node);

  pEditor->GetGuiItem()->registerCallback("TextureUploadNode.uploadDataSet",
      "Uploads a given Dataset to the vestec instance",
      std::function([pEditor](std::string filePath, std::string incidentUUID, double id) {
        // Retrieve Filename and convert to base64 -> put back to JS
        if (!boost::filesystem::exists(filePath)) {
          return;
        }

        std::ifstream in;

        in.open(filePath, std::ifstream::in | std::ifstream::binary);

        if (!in) {
          csp::vestec::logger().error("Failed to open texture '{}'.", filePath);
          return;
        }

        // get length of file:
        in.seekg(0, std::ifstream::end);
        int length = in.tellg();
        in.seekg(0, std::ifstream::beg);

        char* buffer = new char[length];

        in.read(buffer, length);

        std::string base64data = encode_base64(reinterpret_cast<unsigned char*>(buffer), length);

        delete[] buffer;
        in.close();

        pEditor->GetGuiItem()->callJavascript(
            "TextureUploadNode.doUpload", base64data, filePath, incidentUUID, id);
      }));
}
