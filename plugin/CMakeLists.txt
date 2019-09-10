# ------------------------------------------------------------------------------------------------ #
#                                This file is part of CosmoScout VR                                #
#       and may be used under the terms of the MIT license. See the LICENSE file for details.      #
#                         Copyright: (c) 2019 German Aerospace Center (DLR)                        #
# ------------------------------------------------------------------------------------------------ #

# ----------------------------------------------------------------- build plugin

# Find dependencies

if (DEFINED ENV{VIRACOCHA_ROOT_DIR})
  SET(VIRACOCHA_ROOT_DIR "$ENV{VIRACOCHA_ROOT_DIR}")
else()
  SET(VIRACOCHA_ROOT_DIR ${COSMOSCOUT_EXTERNALS_DIR})
endif()

if (DEFINED ENV{ZMQ_CMAKE_CONFIG_DIR})
  SET(ZeroMQ_DIR "$ENV{ZMQ_CMAKE_CONFIG_DIR}")
else()
  if (UNIX)
    SET(ZeroMQ_DIR ${COSMOSCOUT_EXTERNALS_DIR}/share/cmake/ZeroMQ)
    message("-- ZeroMQ_DIR ............ " ${ZeroMQ_DIR})
  endif (UNIX)
  if (WIN32)
    SET(ZeroMQ_DIR ${COSMOSCOUT_EXTERNALS_DIR}/CMake)
    message("-- ZeroMQ_DIR ............ " ${ZeroMQ_DIR})
  endif (WIN32)
endif()

if (DEFINED ENV{VTK_CMAKE_CONFIG_DIR})
  SET(VTK_DIR "$ENV{VTK_CMAKE_CONFIG_DIR}")
else()
  SET(VTK_DIR ${COSMOSCOUT_EXTERNALS_DIR}/lib/cmake/vtk-8.1)
endif()

find_package(VIRACOCHA REQUIRED)
find_package(ZeroMQ REQUIRED)
find_package(VTK REQUIRED)
set(Boost_REALPATH ON)
set(Boost_USE_MULTITHREADED ON)
set(Boost_USE_STATIC_LIBS OFF)

find_package(Boost REQUIRED COMPONENTS filesystem program_options)

# The cosmoscout vr plugin project
file(GLOB SOURCE_FILES *.cpp)
file(GLOB HEADER_FILES *.hpp)
source_group(plugin FILES ${SOURCE_FILES} ${HEADER_FILES})

file(GLOB COMMON_SOURCE_FILES ../common/*.cpp)
file(GLOB COMMON_HEADER_FILES ../common/*.hpp)
source_group(common FILES ${COMMON_SOURCE_FILES} ${COMMON_HEADER_FILES})

# Rendering classes
file(GLOB RENDERING_SOURCE_FILES Rendering/*.cpp)
file(GLOB RENDERING_HEADER_FILES Rendering/*.hpp)
source_group(rendering FILES ${RENDERING_SOURCE_FILES} ${RENDERING_HEADER_FILES})

# Node Editor and interfaces
file(GLOB NODEEDITOR_SOURCE_FILES NodeEditor/*.cpp)
file(GLOB NODEEDITOR_HEADER_FILES NodeEditor/*.hpp)
source_group(nodeeditor FILES ${NODEEDITOR_SOURCE_FILES} ${NODEEDITOR_HEADER_FILES})

# Flow Editor files
file(GLOB FLOWEDITOR_SOURCE_FILES FlowEditor/*.cpp)
file(GLOB FLOWEDITOR_HEADER_FILES FlowEditor/*.hpp)
source_group(floweditor FILES ${FLOWEDITOR_SOURCE_FILES} ${FLOWEDITOR_HEADER_FILES})

# The cosmoscout vr plugin library loaded at runtime by cosmoscout vr
add_library(csp-floweditor SHARED
    ${SOURCE_FILES} ${HEADER_FILES} 
	${COMMON_SOURCE_FILES} ${COMMON_HEADER_FILES}
	${RENDERING_SOURCE_FILES} ${RENDERING_HEADER_FILES}
	${NODEEDITOR_SOURCE_FILES} ${NODEEDITOR_HEADER_FILES}
	${FLOWEDITOR_SOURCE_FILES} ${FLOWEDITOR_HEADER_FILES}
)

if (UNIX)
    target_compile_options(csp-floweditor PUBLIC -fopenmp -DLINUX)
endif(UNIX)

target_link_libraries(csp-floweditor
    PUBLIC
        cs-core
        cs-gui
		cs-scene
        viracocha::viracochabase
        viracocha::viracochafrontend
        libzmq
        Boost::program_options
		    ${VTK_LIBRARIES}
)

target_include_directories(csp-floweditor
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}>
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>/..
		${VTK_INCLUDE_DIRS}
)

# --------------------------------------------------------------- install plugin
install(
    TARGETS csp-floweditor
    DESTINATION "share/plugins"
)
