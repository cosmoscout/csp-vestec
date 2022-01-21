//
// Created by hakru on 17.11.2021.
//

#include "IncidentsBoundsTool.hpp"

#include "../../../src/cs-core/GuiManager.hpp"
#include "../../../src/cs-core/InputManager.hpp"
#include "../../../src/cs-core/SolarSystem.hpp"
#include "../../../src/cs-core/TimeControl.hpp"
#include "../../../src/cs-scene/CelestialAnchorNode.hpp"
#include "../../../src/cs-utils/convert.hpp"

#include "NonMovableMark.hpp"
#include "logger.hpp"

#include <VistaKernel/GraphicsManager/VistaOpenGLNode.h>
#include <VistaKernel/GraphicsManager/VistaSceneGraph.h>
#include <VistaKernel/VistaSystem.h>
#include <VistaKernelOpenSGExt/VistaOpenSGMaterialTools.h>

namespace csp::vestec {

////////////////////////////////////////////////////////////////////////////////////////////////////

const int IncidentsBoundsTool::NUM_SAMPLES = 256;

////////////////////////////////////////////////////////////////////////////////////////////////////

const char* IncidentsBoundsTool::SHADER_VERT = R"(
#version 330

layout(location=0) in vec3 iPosition;

out vec4 vPosition;

uniform mat4 uMatModelView;
uniform mat4 uMatProjection;

void main()
{
    vPosition   = uMatModelView * vec4(iPosition, 1.0);
    gl_Position = uMatProjection * vPosition;
}
)";

////////////////////////////////////////////////////////////////////////////////////////////////////

const char* IncidentsBoundsTool::SHADER_FRAG = R"(
#version 330

in vec4 vPosition;
//in vec2 vTexcoord;

uniform float uOpacity;
uniform float uFarClip;
uniform vec4 uColor;

layout(location = 0) out vec4 oColor;

void main()
{
    oColor = uColor;

    gl_FragDepth = length(vPosition.xyz) / uFarClip;
}
)";

////////////////////////////////////////////////////////////////////////////////////////////////////

IncidentsBoundsTool::IncidentsBoundsTool(
    std::shared_ptr<cs::core::InputManager> const& pInputManager,
    std::shared_ptr<cs::core::SolarSystem> const&  pSolarSystem,
    std::shared_ptr<cs::core::Settings> const&     settings,
    std::shared_ptr<cs::core::TimeControl> const& pTimeControl, std::string const& sCenter,
    std::string const& sFrame)
    : MultiPointTool(pInputManager, pSolarSystem, settings, pTimeControl, sCenter, sFrame) {

  // Create the shader
  mShader.InitVertexShaderFromString(SHADER_VERT);
  mShader.InitFragmentShaderFromString(SHADER_FRAG);
  mShader.Link();

  mUniforms.modelViewMatrix  = mShader.GetUniformLocation("uMatModelView");
  mUniforms.projectionMatrix = mShader.GetUniformLocation("uMatProjection");
  mUniforms.color            = mShader.GetUniformLocation("uColor");
  mUniforms.farClip          = mShader.GetUniformLocation("uFarClip");

  // Attach this as OpenGLNode to scenegraph's root (all line vertices
  // will be draw relative to the observer, therfore we do not want
  // any transformation)
  auto* pSG = GetVistaSystem()->GetGraphicsManager()->GetSceneGraph();
  mParent.reset(pSG->NewOpenGLNode(pSG->GetRoot(), this));

  // VistaOpenSGMaterialTools::SetSortKeyOnSubtree(mParent.get(),
  // static_cast<int>(cs::utils::DrawOrder::eOpaqueNonHDR));
  VistaOpenSGMaterialTools::SetSortKeyOnSubtree(
      mParent.get(), static_cast<int>(cs::utils::DrawOrder::eTransparentItems));

  // Whenever the height scale changes our vertex positions need to be updated
  mScaleConnection = mSettings->mGraphics.pHeightScale.connectAndTouch(
      [this](float /*h*/) { mVerticesDirty = true; });
}

////////////////////////////////////////////////////////////////////////////////////////////////////

IncidentsBoundsTool::~IncidentsBoundsTool() {
  mSettings->mGraphics.pHeightScale.disconnect(mScaleConnection);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void IncidentsBoundsTool::setCenterName(std::string const& name) {
  cs::core::tools::MultiPointTool::setCenterName(name);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void IncidentsBoundsTool::setFrameName(std::string const& name) {
  cs::core::tools::MultiPointTool::setFrameName(name);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

glm::dvec4 IncidentsBoundsTool::getInterpolatedPosBetweenTwoMarks(
    cs::core::tools::Mark const& l0, cs::core::tools::Mark const& l1, double value) {
  double     h_scale = mSettings->mGraphics.pHeightScale.get();
  auto       body    = mSolarSystem->getBody(getCenterName());
  glm::dvec3 radii   = body->getRadii();

  // Calculates the position for the new segment anchor
  double h0 = mSolarSystem->pActiveBody.get()->getHeight(l0.pLngLat.get()) * h_scale;
  double h1 = mSolarSystem->pActiveBody.get()->getHeight(l1.pLngLat.get()) * h_scale;

  // Gets cartesian coordinates for interpolation
  glm::dvec3 p0              = cs::utils::convert::toCartesian(l0.pLngLat.get(), radii, h0);
  glm::dvec3 p1              = cs::utils::convert::toCartesian(l1.pLngLat.get(), radii, h1);
  glm::dvec3 interpolatedPos = p0 + (value * (p1 - p0));

  // Calculates final position
  glm::dvec2 ll     = cs::utils::convert::cartesianToLngLat(interpolatedPos, radii);
  double     height = mSolarSystem->pActiveBody.get()->getHeight(ll) * h_scale;
  glm::dvec3 pos    = cs::utils::convert::toCartesian(ll, radii, height);
  return glm::dvec4(pos, height);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void IncidentsBoundsTool::onPointMoved() {
  // Return if point is not on planet
  for (auto const& mark : mPoints) {
    glm::dvec3 vec = mark->getAnchor()->getAnchorPosition();
    if ((glm::length(vec) == 0) || std::isnan(vec.x) || std::isnan(vec.y) || std::isnan(vec.z)) {
      return;
    }
  }

  mVerticesDirty = true;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void IncidentsBoundsTool::onPointAdded() {
  // Return if point is not on planet
  for (auto const& mark : mPoints) {
    glm::dvec3 vec = mark->getAnchor()->getAnchorPosition();
    if ((glm::length(vec) == 0) || std::isnan(vec.x) || std::isnan(vec.y) || std::isnan(vec.z)) {
      return;
    }
  }

  mVerticesDirty = true;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void IncidentsBoundsTool::onPointRemoved(int /*index*/) {
  mVerticesDirty = true;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void IncidentsBoundsTool::updateLineVertices() {
  if (mPoints.empty()) {
    return;
  }

  // Fills the vertex buffer with sampled data
  mSampledPositions.clear();

  // Middle point of csp::vestec::NonMovableMarks
  glm::dvec3 averagePosition(0.0);
  for (auto const& mark : mPoints) {
    averagePosition += mark->getAnchor()->getAnchorPosition() / static_cast<double>(mPoints.size());
  }

  // This seems to be the first time the tool is moved, so we have to store the
  // distance to the observer so that we can scale the tool later based on the
  // observer's position.
  if (pScaleDistance.get() < 0) {
    try {
      pScaleDistance = mSolarSystem->getObserver().getAnchorScale();
    } catch (std::exception const& e) {
      // Getting the relative transformation may fail due to insufficient SPICE
      // data.
      logger().warn("Failed to calculate scale distance of Polygon Tool: {}", e.what());
    }
  }

  auto lastMark = mPoints.begin();
  auto currMark = ++mPoints.begin();

  // minLng,maxLng,minLat,maxLat
  auto boundingBox = glm::dvec4(0.0);

  while (currMark != mPoints.end()) {
    // Generates X points for each line segment
    for (int vertex_id = 0; vertex_id < NUM_SAMPLES; vertex_id++) {
      glm::dvec4 pos = getInterpolatedPosBetweenTwoMarks(
          **lastMark, **currMark, (vertex_id / static_cast<double>(NUM_SAMPLES)));
      mSampledPositions.push_back(pos.xyz());
    }

    // Saves the point coordinates to vector (normalized by the radius)
    glm::dvec2 lngLat0 = (*lastMark)->pLngLat.get();
    glm::dvec2 lngLat1 = (*currMark)->pLngLat.get();

    // Creates BoundingBox
    if (boundingBox == glm::dvec4(0.0)) {
      boundingBox.x = std::min(lngLat0.x, lngLat1.x);
      boundingBox.y = std::max(lngLat0.x, lngLat1.x);
      boundingBox.z = std::min(lngLat0.y, lngLat1.y);
      boundingBox.w = std::max(lngLat0.y, lngLat1.y);
    } else {
      boundingBox.x = std::min(std::min(lngLat0.x, lngLat1.x), boundingBox.x);
      boundingBox.y = std::max(std::max(lngLat0.x, lngLat1.x), boundingBox.y);
      boundingBox.z = std::min(std::min(lngLat0.y, lngLat1.y), boundingBox.z);
      boundingBox.w = std::max(std::max(lngLat0.y, lngLat1.y), boundingBox.w);
    }

    lastMark = currMark;
    ++currMark;
  }

  mBoundingBox = boundingBox;

  // Last line to draw a polygon instead of a path
  currMark = mPoints.begin();
  for (int vertex_id = 0; vertex_id < NUM_SAMPLES; vertex_id++) {
    glm::dvec4 pos = getInterpolatedPosBetweenTwoMarks(
        **lastMark, **currMark, (vertex_id / static_cast<double>(NUM_SAMPLES)));
    mSampledPositions.push_back(pos.xyz());
  }

  mIndexCount = mSampledPositions.size();

  // Upload new data
  mVBO.Bind(GL_ARRAY_BUFFER);
  mVBO.BufferData(mSampledPositions.size() * sizeof(glm::vec3), nullptr, GL_DYNAMIC_DRAW);
  mVBO.Release();

  mVAO.EnableAttributeArray(0);
  mVAO.SpecifyAttributeArrayFloat(0, 3, GL_FLOAT, GL_FALSE, sizeof(glm::vec3), 0, &mVBO);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void IncidentsBoundsTool::update() {
  MultiPointTool::update();

  if (mVerticesDirty) {
    updateLineVertices();
    mVerticesDirty = false;
  }

  if (mPoints.size() == 4) {
    mPoints.front()->update();
    auto it = mPoints.begin();
    std::advance(it, 2);
    (*it)->update();
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

bool IncidentsBoundsTool::Do() {
  // Transforms all high precision sample points to observer centric low
  // precision coordinates
  std::vector<glm::vec3> vRelativePositions(mIndexCount);

  auto        time     = mTimeControl->pSimulationTime.get();
  auto const& observer = mSolarSystem->getObserver();

  cs::scene::CelestialAnchor centerAnchor(getCenterName(), getFrameName());
  auto                       mat = observer.getRelativeTransform(time, centerAnchor);

  for (uint32_t i(0); i < mIndexCount; ++i) {
    vRelativePositions[i] = (mat * glm::dvec4(mSampledPositions[i], 1.0)).xyz();
  }

  // Uploads the new points to the GPU
  mVBO.Bind(GL_ARRAY_BUFFER);
  mVBO.BufferSubData(0, vRelativePositions.size() * sizeof(glm::vec3), vRelativePositions.data());
  mVBO.Release();

  glPushAttrib(GL_ENABLE_BIT | GL_COLOR_BUFFER_BIT | GL_LINE_BIT);

  // Enables alpha blending
  glEnable(GL_BLEND);
  glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);

  // Enables and configures line rendering
  glEnable(GL_LINE_SMOOTH);
  glHint(GL_LINE_SMOOTH_HINT, GL_NICEST);
  glLineWidth(5);

  std::array<GLfloat, 16> glMatMV{};
  std::array<GLfloat, 16> glMatP{};
  glGetFloatv(GL_MODELVIEW_MATRIX, glMatMV.data());
  glGetFloatv(GL_PROJECTION_MATRIX, glMatP.data());

  mShader.Bind();
  mVAO.Bind();
  glUniformMatrix4fv(mUniforms.modelViewMatrix, 1, GL_FALSE, glMatMV.data());
  glUniformMatrix4fv(mUniforms.projectionMatrix, 1, GL_FALSE, glMatP.data());

  mShader.SetUniform(mUniforms.farClip, cs::utils::getCurrentFarClipDistance());

  mShader.SetUniform(mUniforms.color, pColor.get().r, pColor.get().g, pColor.get().b, 1.F);

  // Draws the linestrip
  glDrawArrays(GL_LINE_STRIP, 0, static_cast<int32_t>(mIndexCount));
  mVAO.Release();

  mShader.Release();

  glPopAttrib();
  return true;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

bool IncidentsBoundsTool::GetBoundingBox(VistaBoundingBox& bb) {
  std::array fMin{-0.1F, -0.1F, -0.1F};
  std::array fMax{0.1F, 0.1F, 0.1F};

  bb.SetBounds(fMin.data(), fMax.data());
  return true;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void IncidentsBoundsTool::addPoint(std::optional<glm::dvec2> const& lngLat, bool movable) {
  if (movable) {
    // Add the Mark to the list.
    mPoints.emplace_back(std::make_shared<cs::core::tools::Mark>(
        mInputManager, mSolarSystem, mSettings, mTimeControl, getCenterName(), getFrameName()));
  } else {
    // Add the Mark to the list.
    mPoints.emplace_back(std::make_shared<NonMovableMark>(
        mInputManager, mSolarSystem, mSettings, mTimeControl, getCenterName(), getFrameName()));
  }

  // if there is a planet intersection, move the point to the intersection
  // location
  if (lngLat) {
    mPoints.back()->pLngLat = lngLat.value();
  } else {
    auto intersection = mInputManager->pHoveredObject.get();
    if (intersection.mObject) {
      auto body = std::dynamic_pointer_cast<cs::scene::CelestialBody>(intersection.mObject);

      if (body) {
        auto       radii = body->getRadii();
        glm::dvec2 pos   = cs::utils::convert::cartesianToLngLat(intersection.mPosition, radii);
        mPoints.back()->pLngLat = pos;
      }
    }
  }

  // register callback to update line vertices when the landmark position has
  // been changed
  mPoints.back()->pLngLat.connect([this](glm::dvec2 const& /*unused*/) { onPointMoved(); });

  // Update the color.
  mPoints.back()->pColor.connectFrom(pColor);

  // Update scaling distance.
  mPoints.back()->pScaleDistance.connectFrom(pScaleDistance);

  // Call update once since new data is available.
  onPointAdded();
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void IncidentsBoundsTool::addPoints(glm::dvec2 const& upperLeft) {
  if (!mPoints.empty()) {
    reset();
    return;
  }

  // Top Left
  addPoint(upperLeft, true);
  // Top Right
  addPoint(glm::dvec2{upperLeft[0] + 0.1, upperLeft[1]}, false);

  // Bottom Right
  addPoint(glm::dvec2{upperLeft[0] + 0.1, upperLeft[1] - 0.1}, true);
  // Bottom Left
  addPoint(glm::dvec2{upperLeft[0], upperLeft[1] - 0.1}, false);

  auto it = mPoints.begin();
  std::advance(it, 1);
  auto topRight = *it;
  std::advance(it, 1);
  auto bottomRight = *it;

  pStartPosition.connectFrom(mPoints.begin()->get()->pLngLat);
  pEndPosition.connectFrom(bottomRight->pLngLat);

  // Move Top Left
  // Update Y for top right
  // Update X for bottom Left

  // Move Bottom Right
  // Update Y for Bottom Left
  // Update X for Top Right

  mPoints.front()->pLngLat.connect([this, topRight](glm::dvec2 pos) {
    auto posTopRight = topRight->pLngLat.get();
    topRight->pLngLat.setWithNoEmit(glm::dvec2{posTopRight[0], pos[1]});

    auto posBottomLeft = mPoints.back()->pLngLat.get();
    mPoints.back()->pLngLat.setWithNoEmit(glm::dvec2{pos[0], posBottomLeft[1]});
  });

  bottomRight->pLngLat.connect([this, topRight](glm::dvec2 pos) {
    auto posBottomLeft = mPoints.back()->pLngLat.get();
    mPoints.back()->pLngLat.setWithNoEmit(glm::dvec2{posBottomLeft[0], pos[1]});

    auto posTopRight = topRight->pLngLat.get();
    topRight->pLngLat.setWithNoEmit(glm::dvec2{pos[0], posTopRight[1]});
  });
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void IncidentsBoundsTool::reset() {
  int index = 0;
  for (auto mark = mPoints.begin(); mark != mPoints.end();) {
    onPointRemoved(index);
    mark = mPoints.erase(mark);
  }
  mSampledPositions.clear();
  mIndexCount    = 0;
  mVerticesDirty = true;

  pStartPosition.disconnectAll();
  pEndPosition.disconnectAll();
}

////////////////////////////////////////////////////////////////////////////////////////////////////

} // namespace csp::vestec