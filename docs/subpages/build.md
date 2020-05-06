[Main](../../README.md)
# CosmoScout VR - VESTEC Build
CosmoScout VR can be build under Linux and Windows and provides scripts
to build the software

External dependencies Windows:
* Visual Studio 2017  or greater
* CMake 3.12 or greater
* Curl
* Python 3.6 or greater

External dependencies Linux:
* GCC or clang compiler with C++17 support
* CMake 3.12 or greater
* Curl 
* Phyton 3.16 or greater
* GDAL
* 

Build steps Windows:
1. git clone https://github.com/cosmoscout/cosmoscout-vr.git src
2. cd src
3. git checkout feature/vestec
4. git submodule update --init
5. cd ..
6. src\make_externals.bat
7. src\make.bat

Build steps Linux:
1. git clone https://github.com/cosmoscout/cosmoscout-vr.git src
2. cd src
3. git checkout feature/vestec
4. git submodule update --init
5. cd ..
6. src\make_externals.sh
7. src\make.sh

If everything compiles successfully you will find a start.sh file under install linux-release/bin