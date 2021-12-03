////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR                               //
//      and may be used under the terms of the MIT license. See the LICENSE file for details.     //
//                        Copyright: (c) 2019 German Aerospace Center (DLR)                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

#include "NonMovableMark.hpp"

namespace csp::vestec {

////////////////////////////////////////////////////////////////////////////////////////////////////

NonMovableMark::NonMovableMark(std::shared_ptr<cs::core::InputManager> const& pInputManager,
    std::shared_ptr<cs::core::SolarSystem> const& pSolarSystem, std::shared_ptr<cs::core::Settings> const& settings,
    std::shared_ptr<cs::core::TimeControl> const& pTimeControl, std::string const& sCenter,
    std::string const& sFrame)
    : Mark(pInputManager, pSolarSystem, settings, pTimeControl, sCenter, sFrame) {

  mInputManager->unregisterSelectable(mParent);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

NonMovableMark::~NonMovableMark() {
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void NonMovableMark::update() {
  Mark::update();
  if (mButtonsConnection != -1) {

    mInputManager->pButtons[0].disconnect(mButtonsConnection);
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

} // namespace csp::vestec
