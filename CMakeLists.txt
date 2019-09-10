# ------------------------------------------------------------------------------------------------ #
#                                This file is part of CosmoScout VR                                #
#       and may be used under the terms of the MIT license. See the LICENSE file for details.      #
#                         Copyright: (c) 2019 German Aerospace Center (DLR)                        #
# ------------------------------------------------------------------------------------------------ #

# ----------------------------------------------------------------- build plugin
cmake_minimum_required(VERSION 3.12)

set(CS_FLOWEDITOR_ENABLE_BACKEND false BOOL "Enable the build of escimo backend application")
if (CS_FLOWEDITOR_ENABLE_BACKEND)
	add_subdirectory(backend)
endif()

set(CS_FLOWEDITOR_ENABLE_METAGENERATOR true BOOL "Enable the build of the escimo meta data generator")
if (CS_FLOWEDITOR_ENABLE_METAGENERATOR)
	add_subdirectory(metagenerator)
endif()

add_subdirectory(plugin)
add_subdirectory(scripts)
add_subdirectory(data)

install(DIRECTORY "gui"               DESTINATION "share/resources")
install(DIRECTORY "transferfunctions" DESTINATION "share/resources")