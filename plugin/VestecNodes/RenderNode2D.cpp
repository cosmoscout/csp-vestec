
#include "RenderNode2D.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"
#include "../NodeEditor/NodeEditor.hpp"
#include "../Rendering/TextureOverlayRenderer.hpp"

#include <VistaKernel/GraphicsManager/VistaGraphicsManager.h>
#include <VistaKernel/GraphicsManager/VistaOpenGLNode.h>
#include <VistaKernel/GraphicsManager/VistaSceneGraph.h>
#include <VistaKernel/VistaSystem.h>
#include <VistaKernelOpenSGExt/VistaOpenSGMaterialTools.h>

#include <json.hpp>
#define STB_IMAGE_IMPLEMENTATION
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include <stb_image.h>
#include <tiffio.h>

// GDAL c++ includes
#include "cpl_conv.h" // for CPLMalloc()
#include "gdal_priv.h"
#include "gdalwarper.h"
#include "ogr_spatialref.h"

#include <iomanip>
#include <vector>
// for convenience
using json = nlohmann::json;

// Define PI
#define M_PI 3.14159265358979323846 /* pi */

RenderNode2D::RenderNode2D(cs::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem,
    int id, cs::core::SolarSystem* pSolarSystem, cs::scene::CelestialAnchorNode* pAnchor,
    cs::core::GraphicsEngine* pEngine)
    : VNE::Node(pItem, id)
    , m_pAnchor(pAnchor) {
  // Store config data for later usage
  mPluginConfig = config;

  // Add a TextureOverlayRenderer to the VISTA scene graph
  auto pSG    = GetVistaSystem()->GetGraphicsManager()->GetSceneGraph();
  m_pRenderer = new TextureOverlayRenderer(pSolarSystem);
  m_pParent   = pSG->NewOpenGLNode(m_pAnchor, m_pRenderer);

  // Render after planets which are rendered at 100
  VistaOpenSGMaterialTools::SetSortKeyOnSubtree(m_pAnchor, static_cast<int>(150));
}

RenderNode2D::~RenderNode2D() {
  delete m_pRenderer;
}

std::string RenderNode2D::GetName() {
  return "RenderNode2D";
}

void RenderNode2D::Init(VNE::NodeEditor* pEditor) {
  // Load JavaScipt content from file which defines the node
  // in the node editor
  std::string code = cs::utils::filesystem::loadToString("js/RenderNode2D.js");
  pEditor->GetGuiItem()->executeJavascript(code);

  // Callback which reads simulation data (path+x is given from JavaScript)
  pEditor->GetGuiItem()->registerCallback<double, std::string>(
      "readSimulationResults", ([pEditor](double id, std::string params) {
        pEditor->GetNode<RenderNode2D>(id)->ReadSimulationResult(params);
      }));

  // Callback to adjust the opacity of the rendering
  pEditor->GetGuiItem()->registerCallback<double, double>("setOpacity",
      ([pEditor](double id, double val) { pEditor->GetNode<RenderNode2D>(id)->SetOpacity(val); }));

  // Callback to adjust the simulation time used to discard pixels
  pEditor->GetGuiItem()->registerCallback<double, double>("setTime",
      ([pEditor](double id, double val) { pEditor->GetNode<RenderNode2D>(id)->SetTime(val); }));

  pEditor->GetGuiItem()->registerCallback<double, bool>("set_enable_time",
      ([pEditor](double id, bool val) { pEditor->GetNode<RenderNode2D>(id)->SetUseTime(val); }));
}

void RenderNode2D::SetOpacity(double val) {
  m_pRenderer->SetOpacity(val);
}

void RenderNode2D::SetTime(double val) {
  m_pRenderer->SetTime(val);
}

void RenderNode2D::SetUseTime(bool use) {
  m_pRenderer->SetUseTime(use);
}

void RenderNode2D::ReadSimulationResult(std::string filename) {
  if(strLastConvertedImageName==filename)
    return;
  strLastConvertedImageName = filename;

  //Initialize GDAL
  GDALAllRegister();

  // Read the source image into a GDAL dataset
  GDALDataset* poDatasetSrc = nullptr;

  // Meta data storage
  double noDataValue = -100000;
  double adfSrcGeoTransform[6];
  double adfDstGeoTransform[6];
  std::array<double, 4> bounds;
  std::array<double, 2> d_dataRange;
 
  int    resX = 0, resY = 0;
  // Open the file. Needs to be supported by GDAL
  poDatasetSrc = (GDALDataset*)GDALOpen(filename.data(), GA_ReadOnly);

  if (poDatasetSrc == NULL) {
    std::cout << "[RenderNode2D::ReadSimulationResult] Error: Failed to load " << filename << std::endl;
    return;
  }

  if (poDatasetSrc->GetProjectionRef() == NULL) {
    std::cout << "[RenderNode2D::ReadSimulationResult] Error: No projection defined for " << filename << std::endl;
    return;
  }

  //Read geotransform from src image
  poDatasetSrc->GetGeoTransform( adfSrcGeoTransform );

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
      (adfDstGeoTransform[0] + resX * adfDstGeoTransform[1] + resY * adfDstGeoTransform[2]) *
      M_PI / 180;
  bounds[3] =
      (adfDstGeoTransform[3] + resX * adfDstGeoTransform[4] + resY * adfDstGeoTransform[5]) *
      M_PI / 180;

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

  psWarpOptions->pTransformerArg = GDALCreateGenImgProjTransformer3(GDALGetProjectionRef(poDatasetSrc),adfSrcGeoTransform, pszDstWKT, adfDstGeoTransform);
  psWarpOptions->pfnTransformer  = GDALGenImgProjTransform;

  //Allocate memory for the image pixels
  int bufferSize = sizeof(int) * psWarpOptions->nBandCount * resX * resY * sizeof(GDT_Float32);
  std::vector<float> bufferData (bufferSize, noDataValue); 

  //execute warping from src to dst
  GDALWarpOperation oOperation;
  oOperation.Initialize(psWarpOptions);
  oOperation.WarpRegionToBuffer(0,0,resX,resY,&bufferData[0], eDT);
  GDALDestroyGenImgProjTransformer(psWarpOptions->pTransformerArg);
  GDALDestroyWarpOptions(psWarpOptions);
  
  /////////////////////// Reprojection End /////////////////

  TextureOverlayRenderer::GreyScaleTexture texture;
  texture.buffersize   = bufferSize;
  texture.buffer       = (float*)CPLMalloc(bufferSize);
  texture.x            = resX;
  texture.y            = resY;
  texture.dataRange    = d_dataRange;
  texture.lnglatBounds = bounds;

  //Copy reprojection result to output texture buffer
  std::memcpy(texture.buffer, &bufferData[0], bufferSize);

  // Add the new texture for rendering
  m_pRenderer->SetOverlayTexture(texture);
}