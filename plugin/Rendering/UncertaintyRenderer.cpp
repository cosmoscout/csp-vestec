// Plugin Includes
#include "UncertaintyRenderer.hpp"

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
#include <GL/freeglut.h>
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

UncertaintyOverlayRenderer::UncertaintyOverlayRenderer(cs::core::SolarSystem* pSolarSystem)
    : mSolarSystem(pSolarSystem) {
  std::cout << "Compile shader for UncertaintyOverlayRenderer " << std::endl;

  m_pSurfaceShader = nullptr;
  m_pSurfaceShader = new VistaGLSLShader();
  m_pSurfaceShader->InitVertexShaderFromString(SURFACE_VERT);
  m_pSurfaceShader->InitFragmentShaderFromString(SURFACE_FRAG);
  m_pSurfaceShader->InitGeometryShaderFromString(SURFACE_GEOM);
  m_pSurfaceShader->Link();

  // create textures ---------------------------------------------------------
  for (auto const& viewport : GetVistaSystem()->GetDisplayManager()->GetViewports()) {
    GBufferData bufferData;

    // Texture for previous renderer depth buffer
    bufferData.mDepthBuffer = new VistaTexture(GL_TEXTURE_RECTANGLE);
    bufferData.mDepthBuffer->Bind();
    bufferData.mDepthBuffer->SetWrapS(GL_CLAMP);
    bufferData.mDepthBuffer->SetWrapT(GL_CLAMP);
    bufferData.mDepthBuffer->SetMinFilter(GL_NEAREST);
    bufferData.mDepthBuffer->SetMagFilter(GL_NEAREST);
    bufferData.mDepthBuffer->Unbind();

    // Color texture to overlay
    bufferData.mColorBuffer = new VistaTexture(GL_TEXTURE_2D_ARRAY);
    bufferData.mColorBuffer->Bind();
    bufferData.mColorBuffer->SetWrapS(GL_CLAMP);
    bufferData.mColorBuffer->SetWrapT(GL_CLAMP);
    bufferData.mColorBuffer->SetMinFilter(GL_LINEAR);
    bufferData.mColorBuffer->SetMagFilter(GL_LINEAR);
    bufferData.mColorBuffer->Unbind();

    mGBufferData[viewport.second] = bufferData;
  }
  std::cout << "Compile shader for TextureOverlayRenderer done " << std::endl;
}

UncertaintyOverlayRenderer::~UncertaintyOverlayRenderer() {
  for (auto data : mGBufferData) {
    delete data.second.mDepthBuffer;
    delete data.second.mColorBuffer;
  }
}

void UncertaintyOverlayRenderer::SetOpacity(double val) {
  mOpacity = val;
}

void UncertaintyOverlayRenderer::SetOverlayTextures(
    std::vector<GDALReader::GreyScaleTexture>& vecTextures) {
  mvecTextures    = vecTextures;
  mUpdateTextures = true;
  std::cout << "SetOverlayTextures 1 " << mvecTextures.size() << std::endl;
  std::cout << "SetOverlayTextures 2 " << vecTextures.size() << std::endl;
}

bool UncertaintyOverlayRenderer::Do() {
  if (mvecTextures.size() == 0)
    return false;

  // get active planet
  if (mSolarSystem->pActiveBody.get() == nullptr ||
      mSolarSystem->pActiveBody.get()->getCenterName() != "Earth") {
    std::cout << "[TextureOverlayRenderer::Do] No active planet set " << std::endl;
    return 0;
  }
  // std::cout << "[TextureOverlayRenderer::Do] Rendering in Do()" << std::endl;
  // save current lighting and meterial state of the OpenGL state machine
  glPushAttrib(GL_POLYGON_BIT | GL_ENABLE_BIT);
  glEnable(GL_TEXTURE_2D);
  glDisable(GL_CULL_FACE);
  glDisable(GL_DEPTH_TEST);
  glDepthMask(GL_FALSE);
  glEnable(GL_BLEND);

  double nearClip, farClip;
  GetVistaSystem()
      ->GetDisplayManager()
      ->GetCurrentRenderInfo()
      ->m_pViewport->GetProjection()
      ->GetProjectionProperties()
      ->GetClippingRange(nearClip, farClip);

  // copy depth buffer from previous rendering
  // -------------------------------------------------------
  GLint iViewport[4];
  glGetIntegerv(GL_VIEWPORT, iViewport);

  auto        viewport = GetVistaSystem()->GetDisplayManager()->GetCurrentRenderInfo()->m_pViewport;
  auto const& data     = mGBufferData[viewport];

  data.mDepthBuffer->Bind();
  glCopyTexImage2D(GL_TEXTURE_RECTANGLE, 0, GL_DEPTH_COMPONENT, iViewport[0], iViewport[1],
      iViewport[2], iViewport[3], 0);

  if (mUpdateTextures) {
    this->UploadTextures();
  }

  // get matrices and related values -----------------------------------------
  GLfloat glMatP[16];
  GLfloat glMatMV[16];
  glGetFloatv(GL_PROJECTION_MATRIX, &glMatP[0]);
  glGetFloatv(GL_MODELVIEW_MATRIX, &glMatMV[0]);

  std::string closestPlanet     = mSolarSystem->pActiveBody.get()->getCenterName();
  auto        activeBody        = mSolarSystem->pActiveBody.get();
  glm::dmat4  matWorldTransform = activeBody->getWorldTransform();

  VistaTransformMatrix matM(glm::value_ptr(matWorldTransform), true);
  VistaTransformMatrix matMV(matM);
  VistaTransformMatrix matInvMV(matMV.GetInverted());
  VistaTransformMatrix matInvP(VistaTransformMatrix(glMatP, true).GetInverted());
  VistaTransformMatrix matInvMVP(matInvMV * matInvP);
  // get matrices and related values -----------------------------------------

  // Bind shader before draw
  m_pSurfaceShader->Bind();

  data.mDepthBuffer->Bind(GL_TEXTURE0);
  data.mColorBuffer->Bind(GL_TEXTURE1);

  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uDepthBuffer"), 0);
  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uSimBuffer"), 1);

  // Why is there no set uniform for matrices??? //TODO: There is one
  glm::dmat4 InverseWorldTransform = glm::inverse(matWorldTransform);
  GLint      loc                   = m_pSurfaceShader->GetUniformLocation("uMatInvMV");
  // glUniformMatrix4fv(loc, 1, GL_FALSE, matInvMV.GetData());
  glUniformMatrix4dv(loc, 1, GL_FALSE, glm::value_ptr(InverseWorldTransform));
  loc = m_pSurfaceShader->GetUniformLocation("uMatInvMVP");
  glUniformMatrix4fv(loc, 1, GL_FALSE, matInvMVP.GetData());
  loc = m_pSurfaceShader->GetUniformLocation("uMatInvP");
  glUniformMatrix4fv(loc, 1, GL_FALSE, matInvP.GetData());
  loc = m_pSurfaceShader->GetUniformLocation("uMatMV");
  glUniformMatrix4fv(loc, 1, GL_FALSE, matMV.GetData());

  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uFarClip"), (float)farClip);

  m_pSurfaceShader->SetUniform(
      m_pSurfaceShader->GetUniformLocation("uNumTextures"), (int)mvecTextures.size());
  loc = m_pSurfaceShader->GetUniformLocation("uBounds");
  glUniform4dv(loc, 1, mvecTextures[0].lnglatBounds.data());

  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uRange"),
      (float)mvecTextures[0].dataRange[0], (float)mvecTextures[0].dataRange[1]);
  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uOpacity"), (float)mOpacity);
  auto sunDirection =
      glm::normalize(glm::inverse(matWorldTransform) *
                     (mSolarSystem->getSun()->getWorldTransform()[3] - matWorldTransform[3]));
  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uSunDirection"),
      sunDirection[0], sunDirection[1], sunDirection[2]);

  int depthBits = 0;
  glGetIntegerv(GL_DEPTH_BITS, &depthBits);
  // std::cout << "Depth buffer bits : " << depthBits << std::endl;

  // Dummy draw
  glDrawArrays(GL_POINTS, 0, 1);

  data.mDepthBuffer->Unbind(GL_TEXTURE0);
  data.mColorBuffer->Unbind(GL_TEXTURE1);
  // Release shader
  m_pSurfaceShader->Release();

  glEnable(GL_DEPTH_TEST);
  glDepthMask(GL_TRUE);
  glPopAttrib();
  return true;
}

void UncertaintyOverlayRenderer::UploadTextures() {
  std::cout << "Uplading textures " << std::endl;
  auto        viewport = GetVistaSystem()->GetDisplayManager()->GetCurrentRenderInfo()->m_pViewport;
  auto const& data     = mGBufferData[viewport];

  data.mColorBuffer->Bind();

  // std::vector<GDALReader::GreyScaleTexture>
  GDALReader::GreyScaleTexture texture0 = mvecTextures[0];

  glTexStorage3D(GL_TEXTURE_2D_ARRAY, 1, GL_R32F, texture0.x, texture0.y, mvecTextures.size());

  int layerCount = 0;
  for (auto texture : mvecTextures) {
    std::cout << "Uplading textures to layer " << layerCount << std::endl;
    glTexSubImage3D(GL_TEXTURE_2D_ARRAY, 0, 0, 0, layerCount, texture.x, texture.y, 1, GL_RED,
        GL_FLOAT, texture.buffer);
    layerCount++;
  }
  mUpdateTextures = false;
  std::cout << "Uplading textures finished" << std::endl;
}

bool UncertaintyOverlayRenderer::GetBoundingBox(VistaBoundingBox& oBoundingBox) {
  float fMin[3] = {-6371000.0f, -6371000.0f, -6371000.0f};
  float fMax[3] = {6371000.0f, 6371000.0f, 6371000.0f};

  oBoundingBox.SetBounds(fMin, fMax);

  return true;
}