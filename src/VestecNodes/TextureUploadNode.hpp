////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR //
//      and may be used under the terms of the MIT license. See the LICENSE file
//      for details.     //
//                        Copyright: (c) 2021 German Aerospace Center (DLR) //
////////////////////////////////////////////////////////////////////////////////////////////////////

#ifndef COSMOSCOUT_VR_TEXTUREUPLOADNODE_HPP
#define COSMOSCOUT_VR_TEXTUREUPLOADNODE_HPP

#include "../NodeEditor/Node.hpp"

namespace VNE {
class NodeEditor;
}

/**
 * The Texture Upload Node allows to upload different textures into a vestec
 * instance
 */
class TextureUploadNode : public VNE::Node {
 public:
  TextureUploadNode(cs::gui::GuiItem* pItem, int id);
  virtual ~TextureUploadNode();

  /**
   * These static functions are required and needs to be implemented
   */
  static void Init(VNE::NodeEditor* filePath);

  /**
   * Returns the unique identifier for the node as string
   */
  static std::string GetName();
};

#endif // COSMOSCOUT_VR_TEXTUREUPLOADNODE_HPP
