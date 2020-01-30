#ifndef TEXTURE_OVERLAY_RENDERER
#define TEXTURE_OVERLAY_RENDERER

#include <VistaKernel/GraphicsManager/VistaOpenGLDraw.h>
#include <VistaMath/VistaBoundingBox.h>

#include <functional>
#include <map>
#include <vector>

//FORWARD DEFINITIONS
class VistaGLSLShader;

class TextureOverlayRenderer : public IVistaOpenGLDraw {
 public:
  TextureOverlayRenderer();
  virtual ~TextureOverlayRenderer();

  // ---------------------------------------
  // INTERFACE IMPLEMENTATION OF IVistaOpenGLDraw
  // ---------------------------------------
  virtual bool Do();
  virtual bool GetBoundingBox(VistaBoundingBox& bb);

 private:
  VistaGLSLShader*  m_pSurfaceShader = nullptr;
  
  static const std::string SURFACE_VERT;
  static const std::string SURFACE_FRAG;
};

#endif // TEXTURE_OVERLAY_RENDERER
