// Plugin Includes
#include "CriticalPointsRenderer.hpp"

// VISTA includes
#include <VistaInterProcComm/Connections/VistaByteBufferDeSerializer.h>
#include <VistaKernel/Cluster/VistaClusterMode.h>
#include <VistaKernel/DisplayManager/VistaDisplayManager.h>
#include <VistaKernel/DisplayManager/VistaProjection.h>
#include <VistaKernel/DisplayManager/VistaViewport.h>
#include <VistaKernel/GraphicsManager/VistaOpenGLNode.h>
#include <VistaKernel/GraphicsManager/VistaSceneGraph.h>
#include <VistaKernel/VistaSystem.h>
#include <VistaOGLExt/Rendering/ABuffer/VistaABufferOIT.h>
#include <VistaOGLExt/VistaBufferObject.h>
#include <VistaOGLExt/VistaGLSLShader.h>
#include <VistaOGLExt/VistaVertexArrayObject.h>

#include <glm/gtc/type_ptr.hpp>

#include <functional>
#include <json.hpp>
#include <sstream>

#define _SILENCE_CXX17_OLD_ALLOCATOR_MEMBERS_DEPRECATION_WARNING
using json = nlohmann::json;

CriticalPointsRenderer::CriticalPointsRenderer(cs::core::SolarSystem* pSolarSystem)
    : mSolarSystem(pSolarSystem)
    , mTransferFunction(std::make_unique<cs::graphics::ColorMap>(
          boost::filesystem::path("../share/resources/transferfunctions/BlackBody.json"))) {
  csp::vestec::logger().debug("[CriticalPointsRenderer] Compiling shader");
  m_pSurfaceShader = nullptr;

  m_pSurfaceShader = new VistaGLSLShader();
  m_pSurfaceShader->InitVertexShaderFromString(SURFACE_VERT);
  m_pSurfaceShader->InitGeometryShaderFromString(SURFACE_GEOM);
  m_pSurfaceShader->InitFragmentShaderFromString(SURFACE_FRAG);
  m_pSurfaceShader->Link();

  // create buffers ----------------------------------------------------------
  m_VBO = new VistaBufferObject();
  m_VAO = new VistaVertexArrayObject();

  csp::vestec::logger().debug("[CriticalPointsRenderer] Compiling shader done");
}

CriticalPointsRenderer::~CriticalPointsRenderer() {
  delete m_pSurfaceShader;
  delete m_VAO;
  delete m_VBO;
}

void CriticalPointsRenderer::SetOpacity(float val) {
  mOpacity = val;
}

void CriticalPointsRenderer::SetTransferFunction(std::string json) {
  mTransferFunction = std::make_unique<cs::graphics::ColorMap>(json);
}

void CriticalPointsRenderer::SetVisualizationMode(RenderMode mode) {
  mRenderMode = mode;
}

void CriticalPointsRenderer::SetHeightScale(float scale) {
  mHeightScale = scale;
}

void CriticalPointsRenderer::SetWidthScale(float scale) {
  mWidthScale = scale;
}

void CriticalPointsRenderer::SetPoints(std::vector<CriticalPoint>& vecPoints) {
  csp::vestec::logger().debug(
      "[CriticalPointsRenderer] Copy data to VBO: {}", std::to_string(vecPoints.size()));
  m_vecPoints.clear();

  // Get persistence range
  CriticalPoint max = vecPoints.back();
  vecPoints.pop_back();
  CriticalPoint min = vecPoints.back();
  vecPoints.pop_back();
  mMinPersistence = min.persistence;
  mMaxPersistence = max.persistence;

  // Copy data to VBO
  m_VBO->Bind(GL_ARRAY_BUFFER);
  m_VBO->BufferData(vecPoints.size() * sizeof(CriticalPoint), &(vecPoints[0]), GL_STATIC_DRAW);
  m_VBO->Release();
  csp::vestec::logger().debug("[CriticalPointsRenderer] Copy data to VBO done");

  // Configure vertex positions
  m_VAO->EnableAttributeArray(0);
  m_VAO->SpecifyAttributeArrayFloat(0, 3, GL_FLOAT, GL_FALSE, sizeof(CriticalPoint), 0, m_VBO);

  // Configure scalar attribute for persistence
  m_VAO->EnableAttributeArray(1);
  m_VAO->SpecifyAttributeArrayFloat(
      1, 1, GL_FLOAT, GL_FALSE, sizeof(CriticalPoint), 3 * sizeof(float), m_VBO);

  // Configure scalar attribute for critical type
  m_VAO->EnableAttributeArray(2);
  m_VAO->SpecifyAttributeArrayInteger(
      2, 1, GL_INT, sizeof(CriticalPoint), 4 * sizeof(float), m_VBO);

  m_vecPoints = vecPoints;
  csp::vestec::logger().debug("[CriticalPointsRenderer] Configure VAO done");
}

bool CriticalPointsRenderer::Do() {
  if (m_vecPoints.empty()) {
    return false;
  }

  // get active planet
  if (mSolarSystem->pActiveBody.get() == nullptr ||
      mSolarSystem->pActiveBody.get()->getCenterName() != "Earth") {
    csp::vestec::logger().info("[CriticalPointsRenderer::Do] No active planet set");
    return false;
  }

  // save current lighting and meterial state of the OpenGL state machine
  glPushAttrib(GL_POLYGON_BIT | GL_ENABLE_BIT);
  // glDisable(GL_CULL_FACE);
  // glDisable(GL_DEPTH_TEST);
  // glEnable(GL_BLEND);
  glEnable(GL_PROGRAM_POINT_SIZE);

  double nearClip;
  double farClip;

  GetVistaSystem()
      ->GetDisplayManager()
      ->GetCurrentRenderInfo()
      ->m_pViewport->GetProjection()
      ->GetProjectionProperties()
      ->GetClippingRange(nearClip, farClip);

  // get matrices and related values -----------------------------------------
  GLfloat glMat[16];

  glGetFloatv(GL_PROJECTION_MATRIX, &glMat[0]);
  VistaTransformMatrix matProjection(glMat, true);

  auto       activeBody        = mSolarSystem->pActiveBody.get();
  glm::dmat4 matWorldTransform = activeBody->getWorldTransform();

  VistaTransformMatrix matM(glm::value_ptr(matWorldTransform), true);
  VistaTransformMatrix matModelView(matM);
  // get matrices and related values -----------------------------------------

  // Bind shader before draw
  m_VAO->Bind();
  m_pSurfaceShader->Bind();

  mTransferFunction->bind(GL_TEXTURE0);

  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uTransferFunction"), 0);

  int loc = m_pSurfaceShader->GetUniformLocation("uMatP");
  glUniformMatrix4fv(loc, 1, GL_FALSE, matProjection.GetData());
  loc = m_pSurfaceShader->GetUniformLocation("uMatMV");
  glUniformMatrix4fv(loc, 1, GL_FALSE, matModelView.GetData());

  m_pSurfaceShader->SetUniform(
      m_pSurfaceShader->GetUniformLocation("uFarClip"), static_cast<float>(farClip));
  m_pSurfaceShader->SetUniform(
      m_pSurfaceShader->GetUniformLocation("uMaxPersistence"), mMaxPersistence);
  m_pSurfaceShader->SetUniform(
      m_pSurfaceShader->GetUniformLocation("uMinPersistence"), mMinPersistence);
  m_pSurfaceShader->SetUniform(
      m_pSurfaceShader->GetUniformLocation("uVisualizationMode"), static_cast<int>(mRenderMode));
  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uHeightScale"), mHeightScale);
  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uWidthScale"), mWidthScale);

  // provide radii to shader
  auto mRadii = cs::core::SolarSystem::getRadii(mSolarSystem->pActiveBody.get()->getCenterName());
  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uRadii"),
      static_cast<float>(mRadii[0]), static_cast<float>(mRadii[1]), static_cast<float>(mRadii[2]));

  // provide sun direction
  auto sunDirection =
      glm::normalize(glm::inverse(matWorldTransform) *
                     (mSolarSystem->getSun()->getWorldTransform()[3] - matWorldTransform[3]));
  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uSunDirection"),
      (float)sunDirection[0], (float)sunDirection[1], (float)sunDirection[2]);

  // Draw points
  glDrawArrays(GL_POINTS, 0, static_cast<GLsizei>(m_vecPoints.size()));

  mTransferFunction->unbind(GL_TEXTURE0);

  // Release shader
  m_pSurfaceShader->Release();
  m_VAO->Release();

  glDisable(GL_PROGRAM_POINT_SIZE);
  glPopAttrib();
  return true;
}

bool CriticalPointsRenderer::GetBoundingBox(VistaBoundingBox& oBoundingBox) {
  float fMin[3] = {-6371000.0f, -6371000.0f, -6371000.0f};
  float fMax[3] = {6371000.0f, 6371000.0f, 6371000.0f};

  oBoundingBox.SetBounds(fMin, fMax);

  return true;
}
