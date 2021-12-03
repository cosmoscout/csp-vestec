////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR                               //
//      and may be used under the terms of the MIT license. See the LICENSE file for details.     //
//                        Copyright: (c) 2019 German Aerospace Center (DLR)                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

#ifndef CSP_MEASUREMENT_TOOLS_IncidentsBoundsTool_HPP
#define CSP_MEASUREMENT_TOOLS_IncidentsBoundsTool_HPP

#include "../../../src/cs-core/tools/DeletableMark.hpp"
#include "../../../src/cs-core/tools/Mark.hpp"
#include "../../../src/cs-core/tools/MultiPointTool.hpp"

#include <VistaKernel/GraphicsManager/VistaOpenGLDraw.h>

#include <glm/glm.hpp>
#include <vector>

namespace cs::scene {
class CelestialAnchorNode;
}


class VistaTransformNode;

namespace csp::vestec {

/// Measures the area and volume of an arbitrary polygon on surface with a Delaunay-mesh. It
/// displays the bounding box of the selected polygon, which can be copied for cache generator.
class IncidentsBoundsTool : public IVistaOpenGLDraw, public cs::core::tools::MultiPointTool {
 public:
  cs::utils::Property<glm::dvec2> pStartPosition = {};
  cs::utils::Property<glm::dvec2> pEndPosition = {};

  IncidentsBoundsTool(std::shared_ptr<cs::core::InputManager> const& pInputManager,
      std::shared_ptr<cs::core::SolarSystem> const&          pSolarSystem,
      std::shared_ptr<cs::core::Settings> const&             settings,
      std::shared_ptr<cs::core::TimeControl> const& pTimeControl, std::string const& sCenter,
      std::string const& sFrame);

  IncidentsBoundsTool(IncidentsBoundsTool const& other) = delete;
  IncidentsBoundsTool(IncidentsBoundsTool&& other)      = delete;

  IncidentsBoundsTool& operator=(IncidentsBoundsTool const& other) = delete;
  IncidentsBoundsTool& operator=(IncidentsBoundsTool&& other) = delete;

  ~IncidentsBoundsTool() override;


  /// A derived class may call this in order to add a new point at the given position. If no
  /// position is given, the current pointer position will be used.
  void addPoint(std::optional<glm::dvec2> const& lngLat = std::nullopt, bool movable = true);

  void addPoints(glm::dvec2 const& upperLeft);

  // Gets or sets the SPICE center name for all points.
  void setCenterName(std::string const& name) override;

  /// Gets or sets the SPICE frame name for all points.
  void setFrameName(std::string const& name) override;

  /// Called from Tools class
  void update() override;

  void reset();

  /// Inherited from IVistaOpenGLDraw
  bool Do() override;
  bool GetBoundingBox(VistaBoundingBox& bb) override;

 protected:
  std::list<std::shared_ptr<cs::core::tools::Mark>> mPoints;

 private:
  void updateLineVertices();

  /// Returns the interpolated position in cartesian coordinates. The fourth component is
  /// height above the surface
  glm::dvec4 getInterpolatedPosBetweenTwoMarks(cs::core::tools::Mark const& l0,
      cs::core::tools::Mark const& l1, double value);

  // Checks if point is inside of the polygon or not
  bool checkPoint(glm::dvec2 const& point);
  // These are called by the base class MultiPointTool
  void onPointMoved() override;
  void onPointAdded() override;
  void onPointRemoved(int index) override;

  std::unique_ptr<VistaOpenGLNode>                mParent;

  // For Lines
  VistaVertexArrayObject mVAO;
  VistaBufferObject      mVBO;
  VistaGLSLShader        mShader;

  struct {
    uint32_t modelViewMatrix  = 0;
    uint32_t projectionMatrix = 0;
    uint32_t color            = 0;
    uint32_t farClip          = 0;
  } mUniforms;

  std::vector<glm::dvec3> mSampledPositions;
  size_t                  mIndexCount    = 0;
  bool                    mVerticesDirty = false;

  int mScaleConnection = -1;

  // minLng,maxLng,minLat,maxLat
  glm::dvec4 mBoundingBox = glm::dvec4(0.0);


  static const int   NUM_SAMPLES;
  static const char* SHADER_VERT;
  static const char* SHADER_FRAG;
};

} // namespace csp::vestec

#endif // CSP_MEASUREMENT_TOOLS_IncidentsBoundsTool_HPP
