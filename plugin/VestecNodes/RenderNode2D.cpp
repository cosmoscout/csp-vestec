
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

#include <set>
#include <iomanip>
// for convenience
using json = nlohmann::json;

RenderNode2D::RenderNode2D(cs::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem,
    int id, cs::core::SolarSystem* pSolarSystem, cs::scene::CelestialAnchorNode* pAnchor,
    cs::core::GraphicsEngine* pEngine)
    : VNE::Node(pItem, id)
    , m_pAnchor(pAnchor) {
  //Store config data for later usage
  mPluginConfig = config;

  //Add a TextureOverlayRenderer to the VISTA scene graph
  auto pSG    = GetVistaSystem()->GetGraphicsManager()->GetSceneGraph();
  m_pRenderer = new TextureOverlayRenderer(pSolarSystem);
  m_pParent   = pSG->NewOpenGLNode(m_pAnchor, m_pRenderer);

  //Render after planets which are rendered at 100
  VistaOpenSGMaterialTools::SetSortKeyOnSubtree(m_pAnchor, static_cast<int>(150));
}

RenderNode2D::~RenderNode2D() 
{
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

  //Callback which reads simulation data (path+x is given from JavaScript)
  pEditor->GetGuiItem()->registerCallback<double, std::string>(
      "readSimulationResults", ([pEditor](double id, std::string params) {
        pEditor->GetNode<RenderNode2D>(id)->ReadSimulationResult(params);
      }));

  //Callback to adjust the opacity of the rendering
  pEditor->GetGuiItem()->registerCallback<double, double>(
      "setOpacity", ([pEditor](double id, double val) {
        pEditor->GetNode<RenderNode2D>(id)->SetOpacity(val);
      }));
}

void RenderNode2D::SetOpacity(double val)
{
  m_pRenderer->SetOpacity(val);
}

void RenderNode2D::ReadSimulationResult(std::string filename) {
  // Read TIFF to texture
  GDALDataset* poDatasetSrc = nullptr;

  //Open the file. Needs to be supported by GDAL
  GDALAllRegister();
  poDatasetSrc = (GDALDataset*)GDALOpen(filename.data(), GA_ReadOnly);
  if (poDatasetSrc == NULL) {
    std::cout << "Failed to load " << filename << std::endl;
    return;
  }

  //Get image size
  double x     = poDatasetSrc->GetRasterXSize();
  double y     = poDatasetSrc->GetRasterYSize();
  double count = poDatasetSrc->GetRasterCount();
  std::cout << "Image size: " << x << " : " << y << " : " << count << std::endl;

  if (poDatasetSrc->GetProjectionRef() == NULL)
  {
    std::cout << "Error: No projection defined " << filename << std::endl;
    return;
  }
    
  //Get the bounding box (lat, lng) and scalar range
  std::array<float, 4> bounds;
  std::array<float, 2> dataRange;
  std::array<double, 2> d_dataRange;

  int  bGotMin, bGotMax; //like bool if it was successful
  auto poBand = poDatasetSrc->GetRasterBand(1);
  d_dataRange[0] = poBand->GetMinimum(&bGotMin);
  d_dataRange[1] = poBand->GetMaximum(&bGotMax);
  if (!(bGotMin && bGotMax))
    GDALComputeRasterMinMax((GDALRasterBandH) poBand, TRUE, d_dataRange.data());

  dataRange[0] = d_dataRange[0];
  dataRange[1] = d_dataRange[1];
  std::cout << "Data Range: " << dataRange[0] << " -> " << dataRange[1] << std::endl;
  /////////////////////// Reprojection /////////////////////
  // Setup output coordinate system that is WGS84 (latitude/longitude).
  char*       pszDstWKT = nullptr;

  // Setup dst coordinate system
  OGRSpatialReference oSRS;
  oSRS.SetWellKnownGeogCS("WGS84");
  oSRS.exportToWkt(&pszDstWKT);

  // Create the transformation object handle
  auto hTransformArg =
      GDALCreateGenImgProjTransformer(poDatasetSrc, poDatasetSrc->GetProjectionRef(), NULL, pszDstWKT, FALSE, 0, 1);

  //Create output coordinate system
  double adfDstGeoTransform[6];
  int    nPixels = 0, nLines = 0;
  CPLErr eErr;
  eErr = GDALSuggestedWarpOutput(poDatasetSrc, GDALGenImgProjTransform, hTransformArg, adfDstGeoTransform, &nPixels, &nLines);
  CPLAssert( eErr == CE_None );

  GDALDestroyGenImgProjTransformer( hTransformArg );
 
  //Calculate extents of the image
  bounds[0] = adfDstGeoTransform[0] + 0 * adfDstGeoTransform[1] + 0 * adfDstGeoTransform[2];
  bounds[1] = adfDstGeoTransform[3] + 0 * adfDstGeoTransform[4] + 0 * adfDstGeoTransform[5];
  bounds[2] = adfDstGeoTransform[0] + x * adfDstGeoTransform[1] + y * adfDstGeoTransform[2];
  bounds[3] = adfDstGeoTransform[3] + x * adfDstGeoTransform[4] + y * adfDstGeoTransform[5];
  std::cout << "Extents (lng, lat) " << std::setprecision(10) << bounds[0] << " " << bounds[1] << " " << bounds[2]
            << " " << bounds[3] << std::endl;
  /////////////////////// Reprojection End /////////////////

  float* pafScanline;
  int    nXSize     = poBand->GetXSize();
  int    nYSize     = poBand->GetYSize();
  int    bufferSize = sizeof(float) * nXSize * nYSize;

  TextureOverlayRenderer::GreyScaleTexture texture;
  texture.buffersize   = sizeof(float) * nXSize * nYSize;
  texture.buffer       = (float*)CPLMalloc(bufferSize);
  texture.x            = nXSize;
  texture.y            = nYSize;
  texture.dataRange    = dataRange;
  texture.lnglatBounds = bounds;

  //Read the real buffer from the image
  poBand->RasterIO(
      GF_Read, 0, 0, nXSize, nYSize, texture.buffer, nXSize, nYSize, GDT_Float32, 0, 0);

  //Add the new texture for rendering
  m_pRenderer->SetOverlayTexture(texture);
}