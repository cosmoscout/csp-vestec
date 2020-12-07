#ifndef UNCERTAINTY_OVERLAY_RENDERER
#define UNCERTAINTY_OVERLAY_RENDERER

#include "../common/GDALReader.hpp"
#include <VistaKernel/GraphicsManager/VistaOpenGLDraw.h>
#include <VistaMath/VistaBoundingBox.h>

#include "../../../../src/cs-core/SolarSystem.hpp"
#include "../../../../src/cs-graphics/ColorMap.hpp"
#include "../logger.hpp"

#include <array>
#include <functional>
#include <map>
#include <mutex>
#include <unordered_map>
#include <vector>

// FORWARD DEFINITIONS
class VistaGLSLShader;
class VistaViewport;
class VistaTexture;
class VistaBufferObject;

/**
 * TODO
 */
class UncertaintyOverlayRenderer : public IVistaOpenGLDraw {
 public:
  enum RenderMode {
    Average          = 1, //! Color by average scalar value per pixel (in z direction)
    Variance         = 2, //! Color by the variance value per pixel (in z direction)
    Difference       = 3, //! Color by absolute summed difference per pixel (in z direction)
    Mixed_Variance   = 4, //! Color by Average * Variance
    Mixed_Difference = 5  //! Color by Average * Variance
  };

  /**
   * Constructor requires the SolarSystem to get the current active planet
   * to get the model matrix
   */
  UncertaintyOverlayRenderer(cs::core::SolarSystem* pSolarSystem);
  virtual ~UncertaintyOverlayRenderer();

  /**
   * Set the opacity of the overlay
   */
  void SetOpacity(double val);

  void SetTransferFunction(std::string json);

  /**
   * Adding a texture used for overlay rendering
   */
  void SetOverlayTextures(std::vector<GDALReader::GreyScaleTexture>& vecTextures);

  /**
   * Define the style of visualization
   */
  void SetVisualizationMode(RenderMode mode);

  // ---------------------------------------
  // INTERFACE IMPLEMENTATION OF IVistaOpenGLDraw
  // ---------------------------------------
  virtual bool Do();
  virtual bool GetBoundingBox(VistaBoundingBox& bb);

 private:
  /**
   * Uploads the textures in mvecTextures to the texture array in opengl
   */
  void UploadTextures();

  /**
   * Prints the strinng if an openGL error occured
   */
  void getGLError(std::string name);

 private:
  bool       mUpdateTextures = false; //! Flag if a texture upload is required
  float      mOpacity        = 1;     //! Opacity value used in shader to adjust the overlay
  long long  lBufferSize     = 0;     //! Store size of the texture array
  RenderMode mRenderMode     = RenderMode::Average; //! Specifies the render mode used in the shader

  VistaGLSLShader* m_pSurfaceShader = nullptr; //! Vista GLSL shader object used for rendering
  VistaGLSLShader* m_pComputeShader = nullptr; //! Vista GLSL shader object used for rendering

  static const std::string SURFACE_GEOM; //! Code for the geometry shader
  static const std::string SURFACE_VERT; //! Code for the vertex shader
  static const std::string SURFACE_FRAG; //! Code for the fragment shader
  static const std::string COMPUTE;      //! Code for the compute shader

  VistaBufferObject* m_pBufferSSBO; //! SSBO used by the compute shader to write results

  /**
   * Struct which stores the depth buffer and color buffer from the previous rendering (order)
   * on the GPU and pass it to the shaders for inverse transformations based on depth and screen
   * coordinates. Used to calculate texture coordinates for the overlay
   */
  struct GBufferData {
    VistaTexture* mDepthBuffer = nullptr;
    VistaTexture* mColorBuffer = nullptr;
  };

  std::unordered_map<VistaViewport*, GBufferData> mGBufferData; //! Store one buffer per viewport

  std::mutex mLockTextureAccess; //! Mutex to lock texture access
  std::vector<GDALReader::GreyScaleTexture>
      mvecTextures; //! The textured passed from outside via SetOverlayTexture

  std::unique_ptr<cs::graphics::ColorMap> mTransferFunction; //! Transfer function used in shader

  cs::core::SolarSystem*
      mSolarSystem; //! Pointer to the CosmoScout solar system used to retriev matrices
};

#endif // UNCERTAINTY_OVERLAY_RENDERER
