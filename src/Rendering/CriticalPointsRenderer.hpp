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
  enum RenderMode {
    MINIMA     = 0, //! Render only points with type minima
    ONE_SADDLE = 1, //! Render only points with type 1-sadlle
    TWO_SADDLE = 2, //! Render only points with type 2-sadlle
    MAXIMA     = 3, //! Render only points with type maxima
    ALL        = 4, //! Render all points
  };

  /**
   * Structs to store point information
   */
  struct CriticalPoint {
    glm::vec3 lnglatheight;
    float     persistence;
    int       type; //! E.g. minima, maxima, saddle
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

  /**
   * Set the visualization mode. Render only minima, maxima, sadlles or all
   * Default: all
   */
  void SetVisualizationMode(RenderMode mode);

  /**
   * Set the height scale of rendered points
   * Default: 1 (100%)
   */
  void SetHeightScale(float scale);

  /**
   * Set the width scale of rendered points
   * Default: 1 (100%)
   */
  void SetWidthScale(float scale);

  // ---------------------------------------
  // INTERFACE IMPLEMENTATION OF IVistaOpenGLDraw
  // ---------------------------------------
  virtual bool Do();
  virtual bool GetBoundingBox(VistaBoundingBox& bb);

 private:
  float      mOpacity        = 1; //! Opacity value used in shader to adjust the overlay
  float      mMinPersistence = 0; //! Persistance range min
  float      mMaxPersistence = 1; //! Persistance range max
  RenderMode mRenderMode     = RenderMode::ALL; //! Render all points
  float      mHeightScale    = 1;
  float      mWidthScale     = 1;

  VistaGLSLShader* m_pSurfaceShader = nullptr; //! Vista GLSL shader object used for rendering

  static const std::string SURFACE_VERT; //! Code for the vertex shader
  static const std::string SURFACE_GEOM; //! Code for the geometry shader
  static const std::string SURFACE_FRAG; //! Code for the fragment shader

  cs::core::SolarSystem*
      mSolarSystem; //! Pointer to the CosmoScout solar system used to retriev matrices

  std::vector<CriticalPoint> m_vecPoints;

  VistaVertexArrayObject* m_VAO;
  VistaBufferObject*      m_VBO;
};

#endif // TEXTURE_OVERLAY_RENDERER
