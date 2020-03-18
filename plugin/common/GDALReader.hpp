#ifndef VESTEC_GDAL_READER
#define VESTEC_GDAL_READER

#include <string>
#include <array>

class GDALReader {
 public:
   /**
   * Struct to store all required information for a float texture
   * e.g. sizes, data ranges, the buffer itself, and geo-referenced bounds
   */
    struct GreyScaleTexture {
        int                     x;
        int                     y;
        std::array<double, 4>   lnglatBounds;
        std::array<double, 2>   dataRange;
        int                     buffersize;
        float*                  buffer;
        int                     timeIndex = 0;
    };

    /**
     * Reads a GDAL supported gray scale image into the texture passed as reference
     */
    static void ReadGrayScaleTexture(GreyScaleTexture& texture, std::string filename);

};

#endif // VESTEC_GDAL_READER
