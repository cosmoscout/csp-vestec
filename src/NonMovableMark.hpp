////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR                               //
//      and may be used under the terms of the MIT license. See the LICENSE file for details.     //
//                        Copyright: (c) 2019 German Aerospace Center (DLR)                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

#ifndef CSP_VESTEC_DELETABLE_MARK_HPP
#define CSP_VESTEC_DELETABLE_MARK_HPP

#include "../../src/cs-core/tools/Mark.hpp"

#include "../../src/cs-scene/CelestialAnchorNode.hpp"
#include "../../src/cs-utils/convert.hpp"
#include "../../src/cs-utils/utils.hpp"
#include "../../src/cs-core/GuiManager.hpp"
#include "../../src/cs-core/InputManager.hpp"
#include "../../src/cs-core/Settings.hpp"
#include "../../src/cs-core/SolarSystem.hpp"
#include "../../src/cs-core/TimeControl.hpp"

namespace csp::vestec {

/// A Mark with a delete symbol above when it is selected.
class NonMovableMark : public cs::core::tools::Mark {
 public:
  NonMovableMark(std::shared_ptr<cs::core::InputManager> const& pInputManager,
      std::shared_ptr<cs::core::SolarSystem> const& pSolarSystem, std::shared_ptr<cs::core::Settings> const& settings,
      std::shared_ptr<cs::core::TimeControl> const& pTimeControl, std::string const& sCenter,
      std::string const& sFrame);

  NonMovableMark(NonMovableMark const& other) = delete;
  NonMovableMark(NonMovableMark&& other)      = delete;

  NonMovableMark& operator=(NonMovableMark const& other) = delete;
  NonMovableMark& operator=(NonMovableMark&& other) = delete;

  ~NonMovableMark() override;

    /// Called from Tools class.
    void update() override;

 private:

  int mButtonsConnection = -1;
};

} // namespace csp::vestec

#endif // CSP_VESTEC_DELETABLE_MARK_HPP
