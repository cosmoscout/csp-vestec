
#include "TextureRenderNode.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"

#include <VistaKernel/GraphicsManager/VistaGraphicsManager.h>
#include <VistaKernel/GraphicsManager/VistaSceneGraph.h>
#include <VistaKernel/VistaSystem.h>
#include <VistaKernelOpenSGExt/VistaOpenSGMaterialTools.h>

#define STB_IMAGE_IMPLEMENTATION
#define STB_IMAGE_WRITE_IMPLEMENTATION

#include <thread>
#include <vector>

// Define PI
#define M_PI 3.14159265358979323846 /* pi */

TextureRenderNode::TextureRenderNode(csp::vestec::Plugin::Settings const& config,
    cs::gui::GuiItem* pItem, int id, cs::core::SolarSystem* pSolarSystem,
    cs::scene::CelestialAnchorNode* pAnchor, cs::core::GraphicsEngine* pEngine)
    : VNE::Node(pItem, id, 2, 0)
    , m_pAnchor(pAnchor) {
  // Store config data for later usage
  mPluginConfig = config;

  m_pRenderer = new TextureOverlayRenderer(pSolarSystem);

  // Add a TextureOverlayRenderer to the VISTA scene graph
  VistaSceneGraph* pSG = GetVistaSystem()->GetGraphicsManager()->GetSceneGraph();
  m_pNode.reset(pSG->NewOpenGLNode(m_pAnchor, m_pRenderer));

  // Render after planets which are rendered at cs::utils::DrawOrder::ePlanets
  VistaOpenSGMaterialTools::SetSortKeyOnSubtree(
      m_pNode.get(), static_cast<int>(cs::utils::DrawOrder::eOpaqueItems) - 50);

  // Initialize GDAL only once
  GDALReader::InitGDAL();
}

////////////////////////////////////////////////////////////////////////////////////////////////////

TextureRenderNode::~TextureRenderNode() {
  m_pAnchor->DisconnectChild(m_pNode.get());
  delete m_pRenderer;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

std::string TextureRenderNode::GetName() {
  return "TextureRenderNode";
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureRenderNode::Init(VNE::NodeEditor* pEditor) {
  // Load JavaScipt content from file which defines the node
  // in the node editor
  std::string code = cs::utils::filesystem::loadToString(
      "../share/resources/gui/js/csp-vestec-texture-renderer.js");
  pEditor->GetGuiItem()->executeJavascript(code);

  pEditor->GetGuiItem()->registerCallback("TextureRenderNode.getNumberOfTextureLayers",
      "Get the number of layers in the texture",
      std::function([pEditor](double id, std::string filePath) {
        pEditor->GetNode<TextureRenderNode>(std::lround(id))->GetNumberOfTextureLayers(filePath);
      }));

  pEditor->GetGuiItem()->registerCallback("TextureRenderNode.setTextureLayer",
      "Sets the texture layer to be visualized",
      std::function([pEditor](double id, double layerID) {
        pEditor->GetNode<TextureRenderNode>(std::lround(id))
            ->SetTextureLayerID(std::lround(layerID));
      }));

  pEditor->GetGuiItem()->registerCallback("TextureRenderNode.setMinMaxDataRange",
      "Sets the texture layer to be visualized",
      std::function([pEditor](double id, std::string filePath) {
        std::cout << "Filepath: " << filePath << "\n";
        pEditor->GetNode<TextureRenderNode>(std::lround(id))->SetMinMaxDataRange(filePath);
      }));

  // Callback which reads simulation data (path+x is given from JavaScript)
  pEditor->GetGuiItem()->registerCallback<double, std::string>(
      "TextureRenderNode.readSimulationResults", "Reads simulation data",
      std::function([pEditor](double id, std::string params) {
        pEditor->GetNode<TextureRenderNode>(std::lround(id))->ReadSimulationResult(params);
      }));

  // Callback to adjust the opacity of the rendering
  pEditor->GetGuiItem()->registerCallback<double, double>("TextureRenderNode.setOpacityTexture",
      "Adjusts the opacity of the rendering", std::function([pEditor](double id, double val) {
        pEditor->GetNode<TextureRenderNode>(std::lround(id))->SetOpacity((float)val);
      }));

  // Callback to set a transfer function for the rendering
  pEditor->GetGuiItem()->registerCallback<double, std::string>(
      "TextureRenderNode.setTransferFunction", "Sets the transfer function for rendering",
      std::function([pEditor](double id, std::string val) {
        pEditor->GetNode<TextureRenderNode>(std::lround(id))->SetTransferFunction(val);
      }));

  // Callback to adjust the simulation time used to discard pixels
  pEditor->GetGuiItem()->registerCallback<double, double>("TextureRenderNode.setTime",
      "Adjusts the simulation time used to discard pixels",
      std::function([pEditor](double id, double val) {
        pEditor->GetNode<TextureRenderNode>(std::lround(id))->SetTime((float)val);
      }));

  pEditor->GetGuiItem()->registerCallback<double, bool>("TextureRenderNode.setEnableTime",
      "Enables the simulation time", std::function([pEditor](double id, bool val) {
        pEditor->GetNode<TextureRenderNode>(std::lround(id))->SetUseTime(val);
      }));

  pEditor->GetGuiItem()->registerCallback<double, double>("TextureRenderNode.setMipMapLevel",
      "Sets the current displayed mip map level", std::function([pEditor](double id, double lod) {
        pEditor->GetNode<TextureRenderNode>(std::lround(id))->SetMipMapLevel(lod);
      }));

  pEditor->GetGuiItem()->registerCallback<double, bool>("TextureRenderNode.setEnableManualMipMap",
      "Enables setting the mip map level manually",
      std::function([pEditor](double id, bool enable) {
        pEditor->GetNode<TextureRenderNode>(std::lround(id))->EnableManualMipMaps(enable);
      }));

  pEditor->GetGuiItem()->registerCallback<double, double>("TextureRenderNode.setMipMapReduceMode",
      "Changes the mode used for creating the mip maps",
      std::function([pEditor](double id, double mode) {
        pEditor->GetNode<TextureRenderNode>(std::lround(id))
            ->SetMipMapReduceMode(static_cast<int>(mode));
      }));

  pEditor->GetGuiItem()->registerCallback<double>("TextureRenderNode.unloadTexture",
      "Unloads the currently active texture. Called by the texture node automatically",
      std::function([pEditor](double id) {
        pEditor->GetNode<TextureRenderNode>(std::lround(id))->UnloadTexture();
      }));
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureRenderNode::GetNumberOfTextureLayers(std::string filePath) {
  int bands = GDALReader::ReadNumberOfLayers(filePath);
  m_pItem->callJavascript("TextureRenderNode.setNumberOfTextureLayers", GetID(), bands);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureRenderNode::SetTextureLayerID(int layerID) {
  m_iLayerID = layerID;
  std::cout << "Changed layer ----------->" << layerID << std::endl;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureRenderNode::SetOpacity(float val) {
  m_pRenderer->SetOpacity(val);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureRenderNode::SetMipMapLevel(double val) {
  m_pRenderer->SetMipMapLevel(val);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureRenderNode::SetMipMapReduceMode(int mode) {
  m_pRenderer->SetMipMapMode(mode);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureRenderNode::EnableManualMipMaps(bool val) {
  m_pRenderer->EnableManualMipMaps(val);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureRenderNode::SetTransferFunction(std::string json) {
  m_pRenderer->SetTransferFunction(json);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureRenderNode::SetTime(float val) {
  m_pRenderer->SetTime(val);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureRenderNode::SetUseTime(bool use) {
  m_pRenderer->SetUseTime(use);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureRenderNode::SetMinMaxDataRange(std::string filePath) {
  std::thread(std::function([this, filePath]() {
    int    bands = GDALReader::ReadNumberOfLayers(filePath);
    double min   = INT_MAX;
    double max   = INT_MIN;

    GDALReader::GreyScaleTexture texture;
    for (int l = 1; l < bands + 1; ++l) {
      GDALReader::ReadGrayScaleTexture(texture, filePath, l);
      if (texture.dataRange[0] < min) {
        min = texture.dataRange[0];
      }

      if (texture.dataRange[1] > max) {
        max = texture.dataRange[1];
      }
    }

    m_pItem->callJavascript("TextureRenderNode.setRange", GetID(), min, max);
  })).detach();
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureRenderNode::UnloadTexture() {
  m_pRenderer->UnloadTexture();
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureRenderNode::ReadSimulationResult(std::string filename) {
  // Read the GDAL texture (grayscale only 1 float channel)
  GDALReader::GreyScaleTexture texture;
  GDALReader::ReadGrayScaleTexture(texture, std::move(filename), m_iLayerID);

  // Add the new texture for rendering
  m_pRenderer->SetOverlayTexture(texture);
  m_pItem->callJavascript(
      "TextureRenderNode.setMipMapLevels", GetID(), m_pRenderer->GetMipMapLevels());
}