# ------------------------------------------------------------------------------------------------ #
#                                This file is part of CosmoScout VR                                #
#       and may be used under the terms of the MIT license. See the LICENSE file for details.      #
#                         Copyright: (c) 2019 German Aerospace Center (DLR)                        #
# ------------------------------------------------------------------------------------------------ #

# ----------------------------------------------------------------- build plugin

# Find dependencies
set(Boost_REALPATH ON)
set(Boost_USE_MULTITHREADED ON)
set(Boost_USE_STATIC_LIBS OFF)

find_package(Boost REQUIRED COMPONENTS filesystem program_options)

# The cosmoscout vr vestec plugin project
file(GLOB SOURCE_FILES *.cpp)
file(GLOB HEADER_FILES *.hpp)
source_group(plugin FILES ${SOURCE_FILES} ${HEADER_FILES})

# The cosmoscout vr plugin library loaded at runtime by cosmoscout vr
add_library(csp-vestec SHARED
  ${SOURCE_FILES} ${HEADER_FILES} 
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
		    cs-scene
        Boost::program_options
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
