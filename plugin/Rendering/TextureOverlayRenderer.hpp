#ifndef TEXTURE_OVERLAY_RENDERER
#define TEXTURE_OVERLAY_RENDERER

#include <VistaKernel/GraphicsManager/VistaOpenGLDraw.h>
#include <VistaMath/VistaBoundingBox.h>

#include <functional>
#include <map>
#include <vector>
#include <array>

//FORWARD DEFINITIONS
class VistaGLSLShader;

class TextureOverlayRenderer : public IVistaOpenGLDraw {
 public:
  struct GreyScaleTexture
  {
    int x;
    int y;
    std::array<double, 4> lnglatBounds;
    std::array<double, 2> dataRange;
    int buffersize;
    float* buffer;
    int GL_ID;
  };

  TextureOverlayRenderer();
  virtual ~TextureOverlayRenderer();

  /**
   * Adding a texture used for overlay rendering
   */
  void AddOverlayTexture(GreyScaleTexture texture);

  // ---------------------------------------
  // INTERFACE IMPLEMENTATION OF IVistaOpenGLDraw
  // ---------------------------------------
  virtual bool Do();
  virtual bool GetBoundingBox(VistaBoundingBox& bb);

 private:
  VistaGLSLShader*  m_pSurfaceShader = nullptr;
  
  static const std::string SURFACE_GEOM;
  static const std::string SURFACE_VERT;
  static const std::string SURFACE_FRAG;

  std::vector<GreyScaleTexture> vecTextures;
};

#endif // TEXTURE_OVERLAY_RENDERER
