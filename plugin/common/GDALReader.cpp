#include "GDALReader.hpp"

// GDAL c++ includes
#include "cpl_conv.h" // for CPLMalloc()
#include "gdal_priv.h"
#include "gdalwarper.h"
#include "ogr_spatialref.h"

#include <iostream>

std::map<std::string, GDALReader::GreyScaleTexture> GDALReader::TextureCache;

void GDALReader::ReadGrayScaleTexture(GreyScaleTexture& texture, std::string filename) {
  // Check for texture in cache
  std::map<std::string, GreyScaleTexture>::iterator it = TextureCache.find(filename);
  if (it != TextureCache.end()) {
    texture = it->second;
    return;
  }

  // Initialize GDAL
  GDALAllRegister();

  // Read the source image into a GDAL dataset
  GDALDataset* poDatasetSrc = nullptr;

  // Meta data storage
  double                noDataValue = -100000;
  double                adfSrcGeoTransform[6];
  double                adfDstGeoTransform[6];
  std::array<double, 4> bounds;
  std::array<double, 2> d_dataRange;

  int resX = 0, resY = 0;
  // Open the file. Needs to be supported by GDAL
  poDatasetSrc = (GDALDataset*)GDALOpen(filename.data(), GA_ReadOnly);

  if (poDatasetSrc == NULL) {
    std::cout << "[GDALReader::ReadGrayScaleTexture] Error: Failed to load " << filename
              << std::endl;
    return;
  }

  if (poDatasetSrc->GetProjectionRef() == NULL) {
    std::cout << "[GDALReader::ReadGrayScaleTexture] Error: No projection defined for " << filename
              << std::endl;
    return;
  }

  // Read geotransform from src image
  poDatasetSrc->GetGeoTransform(adfSrcGeoTransform);

  int  bGotMin, bGotMax; // like bool if it was successful
  auto poBand    = poDatasetSrc->GetRasterBand(1);
  d_dataRange[0] = poBand->GetMinimum(&bGotMin);
  d_dataRange[1] = poBand->GetMaximum(&bGotMax);
  if (!(bGotMin && bGotMax))
    GDALComputeRasterMinMax((GDALRasterBandH)poBand, TRUE, d_dataRange.data());

  /////////////////////// Reprojection /////////////////////
  char* pszDstWKT = nullptr;

  // Setup output coordinate system to WGS84 (latitude/longitude).
  OGRSpatialReference oSRS;
  oSRS.SetWellKnownGeogCS("WGS84");
  oSRS.exportToWkt(&pszDstWKT);

  // Create the transformation object handle
  auto hTransformArg = GDALCreateGenImgProjTransformer(
      poDatasetSrc, poDatasetSrc->GetProjectionRef(), NULL, pszDstWKT, FALSE, 0.0, 1);

  // Create output coordinate system and store transformation
  auto eErr = GDALSuggestedWarpOutput(
      poDatasetSrc, GDALGenImgProjTransform, hTransformArg, adfDstGeoTransform, &resX, &resY);
  CPLAssert(eErr == CE_None);

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
  psWarpOptions->panSrcBands     = (int*)CPLMalloc(sizeof(int) * psWarpOptions->nBandCount);
  psWarpOptions->panSrcBands[0]  = 1;
  psWarpOptions->panDstBands     = (int*)CPLMalloc(sizeof(int) * psWarpOptions->nBandCount);
  psWarpOptions->panDstBands[0]  = 1;
  psWarpOptions->pfnProgress     = GDALTermProgress;

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
  texture.buffer       = (float*)CPLMalloc(bufferSize);
  texture.x            = resX;
  texture.y            = resY;
  texture.dataRange    = d_dataRange;
  texture.lnglatBounds = bounds;
  std::memcpy(texture.buffer, &bufferData[0], bufferSize);

  // Cache the texture
  TextureCache.insert(std::make_pair(filename, texture));
}