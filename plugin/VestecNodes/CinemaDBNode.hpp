/*
 * CinemaDBNode.h
 *
 *  Created on: 21.06.2018
 *      Author: flat_ma
 */

#ifndef CINEMADB_SOURCE_NODE_HPP_
#define CINEMADB_SOURCE_NODE_HPP_

#include "../NodeEditor/Node.hpp"

namespace VNE {
class NodeEditor;
}

class CinemaDBNode : public VNE::Node {
 public:
  CinemaDBNode(cs::gui::GuiItem* pItem, int id);
  virtual ~CinemaDBNode();

  /**
   * These static functions are required and needs to be implemented
   */
  static void Init(VNE::NodeEditor* pEditor);

  /**
   * Returns the unique identifier for the node as string
   */
  static std::string GetName();

 private:
  /**
   * Read the use case names from the Cinema data base and fill the combobox
   */
  void ReadCaseNames(int id);

  /**
   * Read the time steps from the Cinema data base and initialize the silder
   */
  void GetTimeSteps(int id);

  void static ConvertFile(const std::string& caseName, const std::string &timeStep);
};

#endif /* CINEMADB_SOURCE_NODE_HPP_ */
