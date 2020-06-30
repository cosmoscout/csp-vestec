////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR                               //
//      and may be used under the terms of the MIT license. See the LICENSE file for details.     //
//                        Copyright: (c) 2019 German Aerospace Center (DLR)                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

#ifndef CSP_VESTEC_PLUGIN_HPP
#define CSP_VESTEC_PLUGIN_HPP

#include "../../../src/cs-core/PluginBase.hpp"
#include "../../../src/cs-gui/GuiItem.hpp"
#include "../../../src/cs-scene/CelestialAnchorNode.hpp"
#include "../../../src/cs-utils/Property.hpp"
#include "Singleton.hpp"
#include <VistaKernel/GraphicsManager/VistaOpenGLNode.h>

#include "NodeEditor/NodeEditor.hpp"

#include <optional>
#include <string>
#include <vector>

namespace csp::vestec {

class Plugin : public cs::core::PluginBase, Singleton<Plugin> {
 public:
  static std::string dataDir; ///< Directory where simulation data is stored

  struct Properties {
    cs::utils::Property<bool> mEnabled = true;
  };

  struct Settings {
    std::string mVestecDataDir; ///< Directory where cinemaDB is stored
    std::string mFireDir;       ///< Directory where the fire simulation output is stored
    std::string mDiseasesDir; ///< Directory where the diseases simulation and sensor data is stored
  };

  Plugin();

  void init() override;
  void deInit() override;
  void update() override;

  /**
   * Initialize and attach UI to CosmoScout VR
   */
  void InitGUI();

  /**
   * Register callbacks etc,
   */
  void Initialize();

  /**
   * Access class as singleton
   */
  friend class Singleton<Plugin>;

 private:
  Settings                                        mPluginSettings;
  std::shared_ptr<cs::scene::CelestialAnchorNode> mVestecTransform;
  VistaOpenGLNode*                                mVestecNode;
  std::shared_ptr<Properties>                     mProperties;

  // The node editor is used to create a vestec html side
  cs::gui::GuiItem* m_pVESTEC_UI = nullptr;

  // Node editor for VESTEC
  VNE::NodeEditor* m_pNodeEditor;
};

} // namespace csp::vestec

#endif //
