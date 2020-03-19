#ifndef CRITICAL_POINTS_RENDERER
#define CRITICAL_POINTS_RENDERER

#include <VistaKernel/GraphicsManager/VistaOpenGLDraw.h>
#include <VistaMath/VistaBoundingBox.h>

#include "../../../../src/cs-core/SolarSystem.hpp"

#include <vector>

// FORWARD DEFINITIONS
class VistaGLSLShader;
class VistaViewport;
class VistaTexture;
class VistaBufferObject;
class VistaVertexArrayObject;

/**
 * TODO
 */
class CriticalPointsRenderer : public IVistaOpenGLDraw {
 public:
  /**
   * Structs to store point information
   */
  struct CriticalPoint {
    glm::vec3 lnglatheight;
    float persistence;
  };

  /**
   * Constructor requires the SolarSystem to get the current active planet
   * to get the model matrix
   */
  CriticalPointsRenderer(cs::core::SolarSystem* pSolarSystem);
  virtual ~CriticalPointsRenderer();

  /**
   * Set the opacity of the overlay
   */
  void SetOpacity(double val);

  /**
   * SetPoints
   */
  void SetPoints(std::vector<CriticalPoint>& vecPoints);

  // ---------------------------------------
  // INTERFACE IMPLEMENTATION OF IVistaOpenGLDraw
  // ---------------------------------------
  virtual bool Do();
  virtual bool GetBoundingBox(VistaBoundingBox& bb);

 private:
  float mOpacity       = 1;     //! Opacity value used in shader to adjust the overlay
  float mMinPersistence       = 0;     //! Persistance range min
  float mMaxPersistence       = 1;     //! Persistance range max

  VistaGLSLShader* m_pSurfaceShader = nullptr; //! Vista GLSL shader object used for rendering

  static const std::string SURFACE_VERT; //! Code for the vertex shader
  static const std::string SURFACE_FRAG; //! Code for the fragment shader

  cs::core::SolarSystem*
      mSolarSystem; //! Pointer to the CosmoScout solar system used to retriev matrices

  std::vector<CriticalPoint> m_vecPoints;

  VistaVertexArrayObject* m_VAO;
  VistaBufferObject* m_VBO;
};

#endif // TEXTURE_OVERLAY_RENDERER
