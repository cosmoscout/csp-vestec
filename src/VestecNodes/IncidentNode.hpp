////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR                               //
//      and may be used under the terms of the MIT license. See the LICENSE file for details.     //
//                        Copyright: (c) 2019 German Aerospace Center (DLR)                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

#ifndef COSMOSCOUT_VR_INCIDENTNODE_HPP
#define COSMOSCOUT_VR_INCIDENTNODE_HPP

#include "../NodeEditor/Node.hpp"

namespace VNE {
class NodeEditor;
}

/**
 * The Incident Node connects the Node Editor to a Vestec instance
 * Incidents registered on the vestec instance can be downloaded, converted and displayed
 * Different outputs are visible, based on the type of the incident
 *
 * @see https://github.com/cosmoscout/csp-vestec/wiki/Incident-Node
 */
class IncidentNode : public VNE::Node {
 public:
  IncidentNode(cs::gui::GuiItem* pItem, int id);
  virtual ~IncidentNode();

  /**
   * These static functions are required and needs to be implemented
   */
  static void Init(VNE::NodeEditor* pEditor);

  /**
   * Returns the unique identifier for the node as string
   */
  static std::string GetName();

 private:
  static bool        DownloadDataset(const std::string uuid, const std::string token);
  static bool        ExtractDataset(const std::string uuid, bool appendCDB);
};

#endif // COSMOSCOUT_VR_INCIDENTNODE_HPP
