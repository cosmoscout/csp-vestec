# ------------------------------------------------------------------------------------------------ #
#                                This file is part of CosmoScout VR                                #
#       and may be used under the terms of the MIT license. See the LICENSE file for details.      #
#                         Copyright: (c) 2019 German Aerospace Center (DLR)                        #
# ------------------------------------------------------------------------------------------------ #

# ------------------------------------- build plugin ------------------------------------------------------
cmake_minimum_required(VERSION 3.12)

add_subdirectory(src)

# ------------------------------------- INSTALL FILES REQUIRED BY THE PLUGIN ------------------------------
install(DIRECTORY "gui"                DESTINATION "share/resources")
install(DIRECTORY "data"               DESTINATION "share/vestec")