#include "GDALReader.hpp"

// GDAL c++ includes
#include "cpl_conv.h" // for CPLMalloc()
#include "gdal_priv.h"
#include "gdalwarper.h"
#include "ogr_spatialref.h"

#include <cstring>
#include <iostream>

std::map<std::string, GDALReader::GreyScaleTexture> GDALReader::TextureCache;
std::mutex                                          GDALReader::mMutex;
bool                                                GDALReader::mIsInitialized = false;

void GDALReader::InitGDAL() {
  GDALAllRegister();
  GDALReader::mIsInitialized = true;
}

void GDALReader::AddTextureToCache(const std::string& path, GreyScaleTexture& texture) {
  GDALReader::mMutex.lock();
  // Cache the texture
  TextureCache.insert(std::make_pair(path, texture));
  GDALReader::mMutex.unlock();
}

void GDALReader::ReadGrayScaleTexture(GreyScaleTexture& texture, std::string filename) {
  if (!GDALReader::mIsInitialized) {
    csp::vestec::logger().error(
        "[GDALReader] GDAL not initialized! Call GDALReader::InitGDAL() first");
    return;
  }

  csp::vestec::logger().debug("Reading filename {}", filename);

  // Check for texture in cache
  GDALReader::mMutex.lock();
  auto it = TextureCache.find(filename);
  if (it != TextureCache.end()) {
    texture = it->second;

    GDALReader::mMutex.unlock();
    csp::vestec::logger().debug("Found {} in gdal cache.", filename);

    return;
  }
  GDALReader::mMutex.unlock();

  // Read the source image into a GDAL dataset
  GDALDataset* poDatasetSrc = nullptr;

  // Meta data storage
  double                noDataValue = -100000;
  double                adfSrcGeoTransform[6];
  double                adfDstGeoTransform[6];
  std::array<double, 4> bounds{};
  std::array<double, 2> d_dataRange{};

  int resX = 0;
  int resY = 0;
  // Open the file. Needs to be supported by GDAL
  // TODO: There seems a multithreading issue in netCDF so we need to lock data reading
  GDALReader::mMutex.lock();
  poDatasetSrc = static_cast<GDALDataset*>(GDALOpen(filename.data(), GA_ReadOnly));
  GDALReader::mMutex.unlock();

  if (poDatasetSrc == nullptr) {
    csp::vestec::logger().error("[GDALReader::ReadGrayScaleTexture] Failed to load {}", filename);
    return;
  }

  if (poDatasetSrc->GetProjectionRef() == nullptr) {
    csp::vestec::logger().error(
        "[GDALReader::ReadGrayScaleTexture] No projection defined for {}", filename);
    return;
  }

  // Read geotransform from src image
  poDatasetSrc->GetGeoTransform(adfSrcGeoTransform);

  int   bGotMin  = 0;
  int   bGotMax  = 0; // like bool if it was successful
  auto* poBand   = poDatasetSrc->GetRasterBand(1);
  d_dataRange[0] = poBand->GetMinimum(&bGotMin);
  d_dataRange[1] = poBand->GetMaximum(&bGotMax);
  if (!(bGotMin && bGotMax)) {
    GDALComputeRasterMinMax(static_cast<GDALRasterBandH>(poBand), TRUE, d_dataRange.data());
  }

  /////////////////////// Reprojection /////////////////////
  char* pszDstWKT = nullptr;

  // Setup output coordinate system to WGS84 (latitude/longitude).
  OGRSpatialReference oSRS;
  oSRS.SetWellKnownGeogCS("WGS84");
  oSRS.exportToWkt(&pszDstWKT);

  // Create the transformation object handle
  auto* hTransformArg = GDALCreateGenImgProjTransformer(
      poDatasetSrc, poDatasetSrc->GetProjectionRef(), nullptr, pszDstWKT, FALSE, 0.0, 1);

  // Create output coordinate system and store transformation
  GDALSuggestedWarpOutput(
      poDatasetSrc, GDALGenImgProjTransform, hTransformArg, adfDstGeoTransform, &resX, &resY);

  // Calculate extents of the image
  bounds[0] =
      (adfDstGeoTransform[0] + 0 * adfDstGeoTransform[1] + 0 * adfDstGeoTransform[2]) * M_PI / 180;
  bounds[1] =
      (adfDstGeoTransform[3] + 0 * adfDstGeoTransform[4] + 0 * adfDstGeoTransform[5]) * M_PI / 180;
  bounds[2] =
      (adfDstGeoTransform[0] + resX * adfDstGeoTransform[1] + resY * adfDstGeoTransform[2]) * M_PI /
      180;
  bounds[3] =
      (adfDstGeoTransform[3] + resX * adfDstGeoTransform[4] + resY * adfDstGeoTransform[5]) * M_PI /
      180;

  // Store the data type of the raster band
  auto eDT = GDALGetRasterDataType(GDALGetRasterBand(poDatasetSrc, 1));

  // Setup the warping parameters
  GDALWarpOptions* psWarpOptions = GDALCreateWarpOptions();
  psWarpOptions->hSrcDS          = poDatasetSrc;
  psWarpOptions->hDstDS          = nullptr;
  psWarpOptions->nBandCount      = 1;
  psWarpOptions->panSrcBands =
      static_cast<int*>(CPLMalloc(sizeof(int) * psWarpOptions->nBandCount));
  psWarpOptions->panSrcBands[0] = 1;
  psWarpOptions->panDstBands =
      static_cast<int*>(CPLMalloc(sizeof(int) * psWarpOptions->nBandCount));
  psWarpOptions->panDstBands[0] = 1;
  psWarpOptions->pfnProgress    = GDALTermProgress;

  psWarpOptions->pTransformerArg = GDALCreateGenImgProjTransformer3(
      GDALGetProjectionRef(poDatasetSrc), adfSrcGeoTransform, pszDstWKT, adfDstGeoTransform);
  psWarpOptions->pfnTransformer = GDALGenImgProjTransform;

  // Allocate memory for the image pixels
  int bufferSize = sizeof(int) * psWarpOptions->nBandCount * resX * resY * sizeof(GDT_Float32);
  std::vector<float> bufferData(bufferSize, noDataValue);

  // execute warping from src to dst
  GDALWarpOperation oOperation;
  oOperation.Initialize(psWarpOptions);
  oOperation.WarpRegionToBuffer(0, 0, resX, resY, &bufferData[0], eDT);
  GDALDestroyGenImgProjTransformer(psWarpOptions->pTransformerArg);
  GDALDestroyWarpOptions(psWarpOptions);
  GDALClose(poDatasetSrc);

  /////////////////////// Reprojection End /////////////////
  texture.buffersize   = bufferSize;
  texture.buffer       = static_cast<float*>(CPLMalloc(bufferSize));
  texture.x            = resX;
  texture.y            = resY;
  texture.dataRange    = d_dataRange;
  texture.lnglatBounds = bounds;
  std::memcpy(texture.buffer, &bufferData[0], bufferSize);

  GDALReader::AddTextureToCache(filename, texture);
}

void GDALReader::ClearCache() {
  std::map<std::string, GreyScaleTexture>::iterator it;

  GDALReader::mMutex.lock();
  // Loop over textures and delete buffer
  for (it = TextureCache.begin(); it != TextureCache.end(); it++) {
    auto texture = it->second;
    delete texture.buffer;
  }
  TextureCache.clear();
  GDALReader::mMutex.unlock();
}