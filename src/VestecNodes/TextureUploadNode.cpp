////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR                               //
//      and may be used under the terms of the MIT license. See the LICENSE file for details.     //
//                        Copyright: (c) 2021 German Aerospace Center (DLR)                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

#include "TextureUploadNode.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"
#include "../NodeEditor/NodeEditor.hpp"
#include "../Plugin.hpp"

#include <curlpp/Easy.hpp>
#include <curlpp/Info.hpp>
#include <curlpp/Infos.hpp>
#include <curlpp/Options.hpp>

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

  const std::string node =
      cs::utils::filesystem::loadToString("../share/resources/gui/js/csp-vestec-texture-upload-node.js");
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
        in.seekg (0, std::ifstream::end);
        int length = in.tellg();
        in.seekg (0, std::ifstream::beg);

        char * buffer = new char [length];

        in.read (buffer,length);
        std::string base64data = TextureUploadNode::b64_encode(buffer, length);
        delete[] buffer;
        in.close();

        pEditor->GetGuiItem()->callJavascript("TextureUploadNode.doUpload", base64data, incidentUUID, id);
      }));
}
char* TextureUploadNode::b64_encode(const char *in, size_t len) {
  char   *out;
  size_t  elen;
  size_t  i;
  size_t  j;
  size_t  v;

  const char b64chars[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";


  if (in == NULL || len == 0)
    return NULL;

  elen = b64_encoded_size(len);
  out  = static_cast<char*>(malloc(elen + 1));
  out[elen] = '\0';

  for (i=0, j=0; i<len; i+=3, j+=4) {
    v = in[i];
    v = i+1 < len ? v << 8 | in[i+1] : v << 8;
    v = i+2 < len ? v << 8 | in[i+2] : v << 8;

    out[j]   = b64chars[(v >> 18) & 0x3F];
    out[j+1] = b64chars[(v >> 12) & 0x3F];
    if (i+1 < len) {
      out[j+2] = b64chars[(v >> 6) & 0x3F];
    } else {
      out[j+2] = '=';
    }
    if (i+2 < len) {
      out[j+3] = b64chars[v & 0x3F];
    } else {
      out[j+3] = '=';
    }
  }

  return out;
}

size_t  TextureUploadNode::b64_encoded_size(size_t inlen)
{
size_t ret;

ret = inlen;
if (inlen % 3 != 0)
ret += 3 - (inlen % 3);
ret /= 3;
ret *= 4;

return ret;
}

