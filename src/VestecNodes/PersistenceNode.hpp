//
// Created by krus_he on 03.02.20.
//

#ifndef COSMOSCOUT_VR_PERSISTENCENODE_HPP
#define COSMOSCOUT_VR_PERSISTENCENODE_HPP

#include "../NodeEditor/Node.hpp"

namespace VNE {
class NodeEditor;
}

/**
 * The persistence node draws persistence data on a modifiable canvas
 * Inputs to the node are handled as paths to json files on the local filesystem
 *
 * @see https://github.com/octfx/PersistenceRenderer
 */
class PersistenceNode : public VNE::Node {
 public:
  PersistenceNode(cs::gui::GuiItem* pItem, int id);
  virtual ~PersistenceNode();

  /**
   * These static functions are required and needs to be implemented
   */
  static void Init(VNE::NodeEditor* pEditor);

  /**
   * Returns the unique identifier for the node as string
   */
  static std::string GetName();
};

#endif // COSMOSCOUT_VR_PERSISTENCENODE_HPP
