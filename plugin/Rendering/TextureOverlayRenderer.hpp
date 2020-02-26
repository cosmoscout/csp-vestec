#ifndef TEXTURE_OVERLAY_RENDERER
#define TEXTURE_OVERLAY_RENDERER

#include <VistaKernel/GraphicsManager/VistaOpenGLDraw.h>
#include <VistaMath/VistaBoundingBox.h>

#include "../../../../src/cs-core/SolarSystem.hpp"

#include <array>
#include <functional>
#include <map>
#include <unordered_map>
#include <vector>

// FORWARD DEFINITIONS
class VistaGLSLShader;
class VistaViewport;
class VistaTexture;

/**
 * Class which gets a geo-referenced texture and overlays if onto the previous rendered scene.
 * Therefore it copies the depth buffer first. Second, in the shader it does an inverse projection
 * to get the cartesian coordinates. This coordinates are transformed to latitude and longitude to
 * do the lookup in the geo-referenced texture. The value is then overlayed on that pixel position.
 */
class TextureOverlayRenderer : public IVistaOpenGLDraw {
 public:
  /**
   * Struct to store all required information for a float texture
   * e.g. sizes, data ranges, the buffer itself, and geo-referenced bounds
   */
  struct GreyScaleTexture {
    int                  x;
    int                  y;
    std::array<double, 4> lnglatBounds;
    std::array<float, 2>  dataRange;
    int                  buffersize;
    float*               buffer;
  };

  /**
   * Constructor requires the SolarSystem to get the current active planet
   * to get the model matrix
   */
  TextureOverlayRenderer(cs::core::SolarSystem* pSolarSystem);
  virtual ~TextureOverlayRenderer();

  /**
   * Set the opacity of the overlay
   */
  void SetOpacity(double val);

  /**
   * Set the time value passed to shader to discard
   */
  void SetTime(double val);

  /**
   * Set if timing information should be used by the shader
   */
  void SetUseTime(bool use);

  /**
   * Adding a texture used for overlay rendering
   */
  void SetOverlayTexture(GreyScaleTexture texture);

  // ---------------------------------------
  // INTERFACE IMPLEMENTATION OF IVistaOpenGLDraw
  // ---------------------------------------
  virtual bool Do();
  virtual bool GetBoundingBox(VistaBoundingBox& bb);

 private:
  bool  mUpdateTexture = false; //! Flag if a texture upload is required
  bool  mUseTime       = false; //!  Flag if sahder should use time information
  float mOpacity       = 1;     //! Opacity value used in shader to adjust the overlay
  float mTime          = 6;     //! Time value in hours. Used by shader to discard pixels

  VistaGLSLShader* m_pSurfaceShader = nullptr; //! Vista GLSL shader object used for rendering

  static const std::string SURFACE_GEOM; //! Code for the geometry shader
  static const std::string SURFACE_VERT; //! Code for the vertex shader
  static const std::string SURFACE_FRAG; //! Code for the fragment shader

  /**
   * Struct which stores the depth buffer and color buffer on the GPU
   */
  struct GBufferData {
    VistaTexture* mDepthBuffer = nullptr;
    VistaTexture* mColorBuffer = nullptr;
  };

  std::unordered_map<VistaViewport*, GBufferData> mGBufferData; //! Store one buffer per viewport
  GreyScaleTexture mTexture; //! The textured passed from outside via SetOverlayTexture

  cs::core::SolarSystem*
      mSolarSystem; //! Pointer to the CosmoScout solar system used to retriev matrices
};

#endif // TEXTURE_OVERLAY_RENDERER
