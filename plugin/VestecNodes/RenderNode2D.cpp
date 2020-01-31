
#include "RenderNode2D.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"
#include "../NodeEditor/NodeEditor.hpp"

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

#include <set>
// for convenience
using json = nlohmann::json;

RenderNode2D::RenderNode2D(cs::vestec::Plugin::Settings const& config, cs::gui::GuiItem* pItem,
    int id, cs::core::SolarSystem* pSolarSystem, cs::scene::CelestialAnchorNode* pAnchor,
    cs::core::GraphicsEngine* pEngine)
    : VNE::Node(pItem, id)
    , m_pAnchor(pAnchor) {

  mPluginConfig = config;

  auto pSG    = GetVistaSystem()->GetGraphicsManager()->GetSceneGraph();
  m_pRenderer = new TextureOverlayRenderer();
  m_pParent   = pSG->NewOpenGLNode(m_pAnchor, m_pRenderer);
  VistaOpenSGMaterialTools::SetSortKeyOnSubtree(m_pAnchor, static_cast<int>(650));
}

RenderNode2D::~RenderNode2D() {
}

std::string RenderNode2D::GetName() {
  return "RenderNode2D";
}

void RenderNode2D::Init(VNE::NodeEditor* pEditor) {
  // Load JavaScipt content from file
  std::string code = cs::utils::filesystem::loadToString("js/RenderNode2D.js");
  pEditor->GetGuiItem()->executeJavascript(code);

  // Example callback for communication from JavaScript to C++
  pEditor->GetGuiItem()->registerCallback<double, std::string>(
      "readSimulationResults", ([pEditor](double id, std::string params) {
        pEditor->GetNode<RenderNode2D>(id)->ReadSimulationResult(params);
      }));
}

void RenderNode2D::ReadSimulationResult(std::string filename) {
  // Read TIFF to texture
  std::cout << "Need to read tiff " << filename << std::endl;
  TIFFSetWarningHandler(nullptr);
  auto tif = TIFFOpen(filename.data(), "r");
  if (!tif) {
    std::cout << "Failed to load " << filename << std::endl;
    return;
  }

  uint32 imageWidth, imageHeight, imageLength;
	uint32 tileWidth, tileLength;
	uint32 x, y;
	tdata_t buf;

	TIFFGetField(tif, TIFFTAG_IMAGEWIDTH, &imageWidth);
	TIFFGetField(tif, TIFFTAG_IMAGELENGTH, &imageLength);
	TIFFGetField(tif, TIFFTAG_TILEWIDTH, &tileWidth);
	TIFFGetField(tif, TIFFTAG_TILELENGTH, &tileLength);
	buf = _TIFFmalloc(TIFFTileSize(tif));
	for (y = 0; y < imageLength; y += tileLength)
	    for (x = 0; x < imageWidth; x += tileWidth)
		TIFFReadTile(tif, buf, x, y, 0, 0);
	_TIFFfree(buf);
	TIFFClose(tif);
  

  std::cout << "\t Image width: " << imageWidth << std::endl;
  std::cout << "\t Image height: " << imageLength << std::endl;
  std::cout << "\t Tile width: " << tileWidth << std::endl;
  std::cout << "\t Tile height: " << tileLength << std::endl;
}