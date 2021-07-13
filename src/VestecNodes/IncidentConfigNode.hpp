////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR                               //
//      and may be used under the terms of the MIT license. See the LICENSE file for details.     //
//                        Copyright: (c) 2021 German Aerospace Center (DLR)                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

#ifndef COSMOSCOUT_VR_INCIDENTCONFIGNODE_HPP
#define COSMOSCOUT_VR_INCIDENTCONFIGNODE_HPP

#include "../NodeEditor/Node.hpp"

namespace VNE {
class NodeEditor;
}

/**
 *
 */
class IncidentConfigNode : public VNE::Node {
 public:
  IncidentConfigNode(cs::gui::GuiItem* pItem, int id);
  virtual ~IncidentConfigNode();

  /**
   * These static functions are required and needs to be implemented
   */
  static void Init(VNE::NodeEditor* filePath);

  /**
   * Returns the unique identifier for the node as string
   */
  static std::string GetName();
};

#endif // COSMOSCOUT_VR_INCIDENTCONFIGNODE_HPP
