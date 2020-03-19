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
#include <VistaOGLExt/VistaOGLUtils.h>
#include <VistaOGLExt/VistaShaderRegistry.h>
#include <VistaOGLExt/VistaTexture.h>
#include <VistaOGLExt/VistaVertexArrayObject.h>

// CosmoScout includes
#include "../../../../src/cs-core/SolarSystem.hpp"
#include "../../../../src/cs-scene/CelestialAnchor.hpp"
#include "../../../../src/cs-scene/CelestialBody.hpp"

// Standard includes
#include <GL/gl.h>
#include <glm/gtc/type_ptr.hpp>

#include <algorithm>
#include <fstream>
#include <functional>
#include <json.hpp>
#include <sstream>
#include <unordered_set>

#define _SILENCE_CXX17_OLD_ALLOCATOR_MEMBERS_DEPRECATION_WARNING
using json = nlohmann::json;

CriticalPointsRenderer::CriticalPointsRenderer(cs::core::SolarSystem* pSolarSystem)
    : mSolarSystem(pSolarSystem) {
  std::cout << "Compile shader for CriticalPointsRenderer " << std::endl;
  m_pSurfaceShader = nullptr;

  m_pSurfaceShader = new VistaGLSLShader();
  m_pSurfaceShader->InitVertexShaderFromString(SURFACE_VERT);
  m_pSurfaceShader->InitFragmentShaderFromString(SURFACE_FRAG);
  m_pSurfaceShader->Link();

  // create buffers ----------------------------------------------------------
  m_VBO = new VistaBufferObject();
  m_VAO = new VistaVertexArrayObject();

  std::cout << "Compile shader for CriticalPointsRenderer done " << std::endl;
}

CriticalPointsRenderer::~CriticalPointsRenderer() {
  delete m_VAO;
  delete m_VBO;
}

void CriticalPointsRenderer::SetOpacity(double val) {
  mOpacity = val;
}

void CriticalPointsRenderer::SetPoints(std::vector<CriticalPoint>& vecPoints) {
  std::cout << "Copy data to VBO: "<< vecPoints.size() << std::endl;
  m_vecPoints.clear();
 
  //Get persistence range
  CriticalPoint max = vecPoints.back();
  vecPoints.pop_back();
  CriticalPoint min = vecPoints.back();
  vecPoints.pop_back();
  mMinPersistence = min.persistence;
  mMaxPersistence = max.persistence;

  //Copy data to VBO
  m_VBO->Bind(GL_ARRAY_BUFFER);
  m_VBO->BufferData(vecPoints.size() * sizeof(CriticalPoint), &(vecPoints[0]), GL_STATIC_DRAW);
  m_VBO->Release();
  std::cout << "Copy data to VBO done" << std::endl;

  //Configure vertex positions
  m_VAO->EnableAttributeArray(0);
  m_VAO->SpecifyAttributeArrayFloat(
      0, 3, GL_FLOAT, GL_FALSE, sizeof(CriticalPoint), 0, m_VBO);

  //Configure scalar attribute
  m_VAO->EnableAttributeArray(1);
  m_VAO->SpecifyAttributeArrayFloat(
      1, 1, GL_FLOAT, GL_FALSE, sizeof(CriticalPoint),  3 * sizeof(float) , m_VBO);

  m_vecPoints = vecPoints;
  std::cout << "Configure VAO done" << std::endl;
}

bool CriticalPointsRenderer::Do() {
  if(m_vecPoints.size() < 1)
    return 0;

  // get active planet
  if (mSolarSystem->pActiveBody.get() == nullptr ||
      mSolarSystem->pActiveBody.get()->getCenterName() != "Earth") {
    std::cout << "[CriticalPointsRenderer::Do] No active planet set " << std::endl;
    return 0;
  }
  
  // save current lighting and meterial state of the OpenGL state machine
  glPushAttrib(GL_POLYGON_BIT | GL_ENABLE_BIT);
  //glDisable(GL_CULL_FACE);
  //glDisable(GL_DEPTH_TEST);
 // glEnable(GL_BLEND);
  glEnable(GL_PROGRAM_POINT_SIZE);

  double nearClip, farClip;
  GetVistaSystem()
      ->GetDisplayManager()
      ->GetCurrentRenderInfo()
      ->m_pViewport->GetProjection()
      ->GetProjectionProperties()
      ->GetClippingRange(nearClip, farClip);

  // get matrices and related values -----------------------------------------
  GLfloat glMat[16];
  glGetFloatv(GL_MODELVIEW_MATRIX, &glMat[0]);
  VistaTransformMatrix matModelView(glMat, true);

  glGetFloatv(GL_PROJECTION_MATRIX, &glMat[0]);
  VistaTransformMatrix matProjection(glMat, true);
  // get matrices and related values -----------------------------------------

  // Bind shader before draw
  m_VAO->Bind();
  m_pSurfaceShader->Bind();
 
  int loc = m_pSurfaceShader->GetUniformLocation("uMatP");
  glUniformMatrix4fv(loc, 1, GL_FALSE, matProjection.GetData());
  loc = m_pSurfaceShader->GetUniformLocation("uMatMV");
  glUniformMatrix4fv(loc, 1, GL_FALSE, matModelView.GetData());

  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uFarClip"), (float) farClip);
  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uMaxPersistence"), mMaxPersistence);
  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uMinPersistence"), mMinPersistence);
  
  // Draw points
  //std::cout << "Draw Points: " << m_vecPoints.size() << std::endl;
  glDrawArrays(GL_POINTS, 0, (GLsizei)m_vecPoints.size());

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