////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR //
//      and may be used under the terms of the MIT license. See the LICENSE file
//      for details.     //
//                        Copyright: (c) 2019 German Aerospace Center (DLR) //
////////////////////////////////////////////////////////////////////////////////////////////////////

#ifndef CSP_VESTEC_LOGGER_HPP
#define CSP_VESTEC_LOGGER_HPP

#include <spdlog/spdlog.h>

namespace csp::vestec {

/// This creates the default singleton logger for "csp-vestec" when called for
/// the first time and returns it. See cs-utils/logger.hpp for more logging
/// details.
spdlog::logger& logger();

} // namespace csp::vestec

#endif // CSP_VESTEC_LOGGER_HPP
