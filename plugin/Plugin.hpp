////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR                               //
//      and may be used under the terms of the MIT license. See the LICENSE file for details.     //
//                        Copyright: (c) 2019 German Aerospace Center (DLR)                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

#ifndef CSP_VESTEC_PLUGIN_HPP
#define CSP_VESTEC_PLUGIN_HPP

#include "../../../src/cs-core/PluginBase.hpp"
#include "../../../src/cs-utils/Property.hpp"
#include "../../../src/cs-scene/CelestialAnchorNode.hpp"
#include "../../../src/cs-gui/GuiItem.hpp"
#include <VistaKernel/GraphicsManager/VistaOpenGLNode.h>

#include <optional>
#include <string>
#include <vector>

namespace cs::vestec {

class Plugin : public cs::core::PluginBase {
 public:
  struct Properties {
    cs::utils::Property<bool> mEnabled = true;
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
  cs::gui::GuiItem*		m_pVESTEC_UI = nullptr;
};

} // namespace cs::vestec

#endif //
