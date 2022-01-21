#ifndef VESTEC_GDAL_READER
#define VESTEC_GDAL_READER

#include <array>
#include <map>
#include <mutex>
#include <string>

#include "../logger.hpp"

class GDALReader {
 public:
  /**
   * Struct to store all required information for a float texture
   * e.g. sizes, data ranges, the buffer itself, and geo-referenced bounds
   */
  struct GreyScaleTexture {
    int                   x{};
    int                   y{};
    std::array<double, 4> lnglatBounds{};
    std::array<double, 2> dataRange{};
    int                   buffersize{};
    float*                buffer{};
    int                   timeIndex = 0;
  };

  /**
   * Load all reader DLLs
   */
  static void InitGDAL();

  /**
   * Reads a GDAL supported gray scale image into the texture passed as
   * reference
   */
  static void ReadGrayScaleTexture(GreyScaleTexture& texture, std::string filename, int layer = 1);

  /**
   * Get the number of layers in the texture
   */
  static int ReadNumberOfLayers(std::string filename);

  /**
   * Adds a texture with unique path to the cache
   */
  static void AddTextureToCache(const std::string& path, GreyScaleTexture& texture);

  /**
   * Clear cache
   */
  static void ClearCache();

 private:
  static std::map<std::string, GreyScaleTexture> TextureCache;
  static std::mutex                              mMutex;
  static bool                                    mIsInitialized;
};

#endif // VESTEC_GDAL_READER
