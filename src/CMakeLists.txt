# ------------------------------------------------------------------------------------------------ #
#                                This file is part of CosmoScout VR                                #
#       and may be used under the terms of the MIT license. See the LICENSE file for details.      #
#                         Copyright: (c) 2019 German Aerospace Center (DLR)                        #
# ------------------------------------------------------------------------------------------------ #

# ----------------------------------------------------------------- build plugin

if (DEFINED ENV{VTK_CMAKE_CONFIG_DIR})
  SET(VTK_DIR "$ENV{VTK_CMAKE_CONFIG_DIR}")
else()
  SET(VTK_DIR ${COSMOSCOUT_EXTERNALS_DIR}/lib/cmake/vtk-8.1)
endif()

if (DEFINED ENV{TTKVTK_DIR})
  SET(TTKVTK_DIR "$ENV{TTKVTK_DIR}")
else()
  SET(TTKVTK_DIR ${COSMOSCOUT_EXTERNALS_DIR}/lib/cmake/ttk)
endif()

if (DEFINED ENV{GDAL_DIR})
  SET(GDAL_DIR "$ENV{GDAL_DIR}")
else()
  SET(GDAL_DIR ${COSMOSCOUT_EXTERNALS_DIR}/gdal)
endif()

# Find third party dependencies
set(Boost_REALPATH ON)
set(Boost_USE_MULTITHREADED ON)
set(Boost_USE_STATIC_LIBS OFF)

find_package(Boost REQUIRED COMPONENTS filesystem program_options)
find_package(TTKVTK REQUIRED)
find_package(GDAL REQUIRED)
find_package(zipper REQUIRED)

# The cosmoscout vr vestec plugin project
file(GLOB SOURCE_FILES *.cpp)
file(GLOB HEADER_FILES *.hpp)
source_group(plugin FILES ${SOURCE_FILES} ${HEADER_FILES})

# Node Editor and interfaces
file(GLOB NODEEDITOR_SOURCE_FILES NodeEditor/*.cpp)
file(GLOB NODEEDITOR_HEADER_FILES NodeEditor/*.hpp)
source_group(nodeeditor FILES ${NODEEDITOR_SOURCE_FILES} ${NODEEDITOR_HEADER_FILES})

# VESTEC nodes for the floweditor
file(GLOB VESTEC_SOURCE_FILES VestecNodes/*.cpp)
file(GLOB VESTEC_HEADER_FILES VestecNodes/*.hpp)
source_group(vestecnodes FILES ${VESTEC_SOURCE_FILES} ${VESTEC_HEADER_FILES})

# VESTEC rendering in cosmoscout
file(GLOB VESTEC_RENDERING_SOURCE_FILES Rendering/*.cpp)
file(GLOB VESTEC_RENDERING_HEADER_FILES Rendering/*.hpp)
source_group(rendering FILES ${VESTEC_RENDERING_SOURCE_FILES} ${VESTEC_RENDERING_HEADER_FILES})

# VESTEC rendering in cosmoscout
file(GLOB VESTEC_COMMON_SOURCE_FILES common/*.cpp)
file(GLOB VESTEC_COMMON_HEADER_FILES common/*.hpp)
source_group(rendering FILES ${VESTEC_RENDERING_SOURCE_FILES} ${VESTEC_RENDERING_HEADER_FILES})

# VESTEC js files for the floweditor
file(GLOB VESTEC_JS_FILES VestecNodes/*.js)
source_group(vestecJS FILES ${VESTEC_JS_FILES})


# The cosmoscout vr plugin library loaded at runtime by cosmoscout vr
add_library(csp-vestec SHARED
  ${SOURCE_FILES} ${HEADER_FILES} 
  ${NODEEDITOR_SOURCE_FILES} ${NODEEDITOR_HEADER_FILES}
  ${VESTEC_SOURCE_FILES} ${VESTEC_HEADER_FILES}
  ${VESTEC_RENDERING_SOURCE_FILES} ${VESTEC_RENDERING_HEADER_FILES}
  ${VESTEC_COMMON_SOURCE_FILES} ${VESTEC_COMMON_HEADER_FILES}
)

# Enable OpenMP
if (UNIX)
    target_compile_options(csp-vestec PUBLIC -fopenmp)
endif(UNIX)


# Define link libraries
target_link_libraries(csp-vestec
    PUBLIC
        cs-core
        cs-gui
        cs-utils
		cs-scene
        Boost::program_options
        ttk::vtk::ttkAll
		GDAL::GDAL
        Zipper
)

# Define include direcories
target_include_directories(csp-vestec
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}>
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>/..
)

# --------------------------------------------------------------- install plugin 
install(
    TARGETS csp-vestec
    DESTINATION "share/plugins"
)
# --------------------------------------------------------------- install js files
install(FILES ${VESTEC_JS_FILES} DESTINATION "bin/js")
