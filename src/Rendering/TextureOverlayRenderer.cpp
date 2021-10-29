// Plugin Includes
#include "TextureOverlayRenderer.hpp"
#include "../../../../src/cs-utils/FrameTimings.hpp"
#include "../../../../src/cs-utils/convert.hpp"

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
#include <VistaOGLExt/VistaTexture.h>

// Standard includes
#include <functional>
#include <glm/gtc/type_ptr.hpp>

#include <cmath>

TextureOverlayRenderer::TextureOverlayRenderer(
    cs::core::SolarSystem *pSolarSystem)
    : mTransferFunction(
          std::make_unique<cs::graphics::ColorMap>(boost::filesystem::path(
              "../share/resources/transferfunctions/BlackBody.json"))),
      mSolarSystem(pSolarSystem) {
  csp::vestec::logger().debug(
      "[TextureOverlayRenderer] Compiling computeShader");

  m_pSurfaceShader = nullptr;
  m_pSurfaceShader = new VistaGLSLShader();
  m_pSurfaceShader->InitVertexShaderFromString(SURFACE_VERT);
  m_pSurfaceShader->InitFragmentShaderFromString(SURFACE_FRAG);
  m_pSurfaceShader->InitGeometryShaderFromString(SURFACE_GEOM);
  m_pSurfaceShader->Link();

  auto computeShader = glCreateShader(GL_COMPUTE_SHADER);
  const char *pSource = COMPUTE.c_str();
  glShaderSource(computeShader, 1, &pSource, nullptr);
  glCompileShader(computeShader);

  GLint success = 0;
  glGetShaderiv(computeShader, GL_COMPILE_STATUS, &success);

  m_pComputeShader = glCreateProgram();
  glAttachShader(m_pComputeShader, computeShader);
  glLinkProgram(m_pComputeShader);
  glDeleteShader(computeShader);

  // create textures ---------------------------------------------------------
  for (auto const &viewport :
       GetVistaSystem()->GetDisplayManager()->GetViewports()) {
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
    bufferData.mColorBuffer = new VistaTexture(GL_TEXTURE_2D);
    bufferData.mColorBuffer->Bind();
    bufferData.mColorBuffer->SetWrapS(GL_CLAMP);
    bufferData.mColorBuffer->SetWrapT(GL_CLAMP);
    bufferData.mColorBuffer->SetMinFilter(GL_NEAREST);
    bufferData.mColorBuffer->SetMagFilter(GL_NEAREST);
    bufferData.mColorBuffer->Unbind();

    mGBufferData[viewport.second] = bufferData;
  }
  csp::vestec::logger().debug(
      "[TextureOverlayRenderer] Compiling computeShader done");
}

////////////////////////////////////////////////////////////////////////////////////////////////////

TextureOverlayRenderer::~TextureOverlayRenderer() {
  for (auto data : mGBufferData) {
    delete data.second.mDepthBuffer;
    delete data.second.mColorBuffer;
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureOverlayRenderer::SetOpacity(float val) { mOpacity = val; }

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureOverlayRenderer::EnableManualMipMaps(bool val) {
  mManualMipMaps = val;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureOverlayRenderer::SetMipMapLevel(double val) { mMipMapLevel = val; }

int TextureOverlayRenderer::GetMipMapLevels() { return mMipMapLevels; }

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureOverlayRenderer::SetMipMapMode(int mode) {
  mMipMapReduceMode = mode;
  if (mTexture.buffer) {
    mUpdateTexture = true;
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureOverlayRenderer::SetTransferFunction(std::string json) {
  mTransferFunction = std::make_unique<cs::graphics::ColorMap>(json);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureOverlayRenderer::SetTime(float val) { mTime = val; }

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureOverlayRenderer::SetUseTime(bool use) { mUseTime = use; }

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureOverlayRenderer::SetOverlayTexture(
    GDALReader::GreyScaleTexture &texture) {
  mTexture = texture;
  mUpdateTexture = true;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void TextureOverlayRenderer::UnloadTexture() { mTexture.buffer = nullptr; }

////////////////////////////////////////////////////////////////////////////////////////////////////

bool TextureOverlayRenderer::Do() {
  cs::utils::FrameTimings::ScopedTimer timer("Render Texture");

  // get active planet
  if (mSolarSystem->pActiveBody.get() == nullptr ||
      mSolarSystem->pActiveBody.get()->getCenterName() != "Earth") {
    csp::vestec::logger().info(
        "[TextureOverlayRenderer::Do] No active planet set");

    return false;
  }

  if (!mTexture.buffer) {
    return false;
  }

  // save current lighting and material state of the OpenGL state machine
  glPushAttrib(GL_POLYGON_BIT | GL_ENABLE_BIT);
  glEnable(GL_TEXTURE_2D);
  glDisable(GL_CULL_FACE);
  glDisable(GL_DEPTH_TEST);
  glDepthMask(GL_FALSE);
  glEnable(GL_BLEND);

  double nearClip = NAN;
  double farClip = NAN;
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

  auto *viewport = GetVistaSystem()
                       ->GetDisplayManager()
                       ->GetCurrentRenderInfo()
                       ->m_pViewport;
  auto &data = mGBufferData[viewport];

  data.mDepthBuffer->Bind();
  glCopyTexImage2D(GL_TEXTURE_RECTANGLE, 0, GL_DEPTH_COMPONENT, iViewport[0],
                   iViewport[1], iViewport[2], iViewport[3], 0);

  if (mUpdateTexture) {
    csp::vestec::logger().debug("[TextureOverlayRenderer] Update texture");
    cs::utils::FrameTimings::ScopedTimer timer("Compute LOD");

    delete data.mColorBuffer;
    data.mColorBuffer = new VistaTexture(GL_TEXTURE_2D);
    data.mColorBuffer->Bind();
    data.mColorBuffer->SetWrapS(GL_CLAMP);
    data.mColorBuffer->SetWrapT(GL_CLAMP);
    data.mColorBuffer->SetMinFilter(GL_NEAREST);
    data.mColorBuffer->SetMagFilter(GL_NEAREST);
    data.mColorBuffer->Unbind();

    data.mColorBuffer->Bind();

    mMipMapLevels = static_cast<int>(std::max(
        1.0, std::floor(std::log2(std::max(mTexture.x, mTexture.y))) + 1));
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER,
                    GL_NEAREST_MIPMAP_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);

    glTexStorage2D(GL_TEXTURE_2D, mMipMapLevels, GL_R32F, mTexture.x,
                   mTexture.y);
    // Hacky, update error can occur when mode changes, catch this here so
    // nothing gets displayed
    int error = glGetError();
    if (error != 0) {
      csp::vestec::logger().debug(
          "[TextureOverlayRenderer] Error after texture change: {}",
          std::to_string(error));
    }
    glTexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, mTexture.x, mTexture.y, GL_RED,
                    GL_FLOAT, mTexture.buffer);

    glUseProgram(m_pComputeShader);
    glBindImageTexture(0, data.mColorBuffer->GetId(), 0, GL_FALSE, 0,
                       GL_READ_ONLY, GL_R32F);

    for (int i(1); i < mMipMapLevels; ++i) {
      // Calculates the width and height for the current MipMap Level
      // This also sets the number of dispatched compute groups
      int width = static_cast<int>(std::max(
          1.0, std::floor(static_cast<double>(static_cast<int>(mTexture.x)) /
                          std::pow(2, i))));
      int height = static_cast<int>(std::max(
          1.0, std::floor(static_cast<double>(static_cast<int>(mTexture.y)) /
                          std::pow(2, i))));
      glUniform1i(glGetUniformLocation(m_pComputeShader, "uLevel"), i);
      glUniform1i(glGetUniformLocation(m_pComputeShader, "uMipMapReduceMode"),
                  mMipMapReduceMode);
      glBindImageTexture(2, data.mColorBuffer->GetId(), i, GL_FALSE, 0,
                         GL_WRITE_ONLY, GL_R32F);

      if (i > 0) {
        glBindImageTexture(1, data.mColorBuffer->GetId(), i - 1, GL_FALSE, 0,
                           GL_READ_ONLY, GL_R32F);
      }

      // Make sure writing has finished.
      glMemoryBarrier(GL_SHADER_IMAGE_ACCESS_BARRIER_BIT);
      glDispatchCompute(static_cast<uint32_t>(std::ceil(1.0 * width / 16)),
                        static_cast<uint32_t>(std::ceil(1.0 * height / 16)), 1);
    }

    mUpdateTexture = false;
  }

  // get matrices and related values -----------------------------------------
  GLfloat glMatP[16];
  GLfloat glMatMV[16];
  glGetFloatv(GL_PROJECTION_MATRIX, &glMatP[0]);
  glGetFloatv(GL_MODELVIEW_MATRIX, &glMatMV[0]);

  std::string closestPlanet = mSolarSystem->pActiveBody.get()->getCenterName();
  auto activeBody = mSolarSystem->pActiveBody.get();
  glm::dmat4 matWorldTransform = activeBody->getWorldTransform();

  VistaTransformMatrix matM(glm::value_ptr(matWorldTransform), true);
  VistaTransformMatrix matMV(matM);
  VistaTransformMatrix matInvMV(matMV.GetInverted());
  VistaTransformMatrix matInvP(
      VistaTransformMatrix(glMatP, true).GetInverted());
  VistaTransformMatrix matInvMVP(matInvMV * matInvP);
  // get matrices and related values -----------------------------------------

  // Bind shader before draw
  m_pSurfaceShader->Bind();

  data.mDepthBuffer->Bind(GL_TEXTURE0);
  data.mColorBuffer->Bind(GL_TEXTURE1);

  mTransferFunction->bind(GL_TEXTURE2);

  m_pSurfaceShader->SetUniform(
      m_pSurfaceShader->GetUniformLocation("uDepthBuffer"), 0);
  m_pSurfaceShader->SetUniform(
      m_pSurfaceShader->GetUniformLocation("uSimBuffer"), 1);

  m_pSurfaceShader->SetUniform(
      m_pSurfaceShader->GetUniformLocation("uTransferFunction"), 2);

  // Why is there no set uniform for matrices??? //TODO: There is one
  glm::dmat4 InverseWorldTransform = glm::inverse(matWorldTransform);
  GLint loc = m_pSurfaceShader->GetUniformLocation("uMatInvMV");
  // glUniformMatrix4fv(loc, 1, GL_FALSE, matInvMV.GetData());
  glUniformMatrix4dv(loc, 1, GL_FALSE, glm::value_ptr(InverseWorldTransform));
  loc = m_pSurfaceShader->GetUniformLocation("uMatInvMVP");
  glUniformMatrix4fv(loc, 1, GL_FALSE, matInvMVP.GetData());
  loc = m_pSurfaceShader->GetUniformLocation("uMatInvP");
  glUniformMatrix4fv(loc, 1, GL_FALSE, matInvP.GetData());
  loc = m_pSurfaceShader->GetUniformLocation("uMatMV");
  glUniformMatrix4fv(loc, 1, GL_FALSE, matMV.GetData());

  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uFarClip"),
                               static_cast<float>(farClip));

  // m_pSurfaceShader->SetUniform(
  //    m_pSurfaceShader->GetUniformLocation("uBounds"), 4, 1,
  //    mTexture.lnglatBounds.data());
  // Double precision bounds
  loc = m_pSurfaceShader->GetUniformLocation("uBounds");
  glUniform4dv(loc, 1, mTexture.lnglatBounds.data());
  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uRange"),
                               static_cast<float>(mTexture.dataRange[0]),
                               static_cast<float>(mTexture.dataRange[1]));
  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uOpacity"),
                               mOpacity);
  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uTime"),
                               mTime);
  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uUseTime"),
                               mUseTime);

  // From Application.cpp
  auto *pSG = GetVistaSystem()->GetGraphicsManager()->GetSceneGraph();
  VistaTransformNode *pTrans =
      dynamic_cast<VistaTransformNode *>(pSG->GetNode("Platform-User-Node"));

  auto vWorldPos = glm::vec4(1);
  pTrans->GetWorldPosition(vWorldPos.x, vWorldPos.y, vWorldPos.z);

  auto polar = cs::utils::convert::cartesianToLngLatHeight(
      (glm::inverse(mSolarSystem->pActiveBody.get()->getWorldTransform()) *
       vWorldPos)
          .xyz(),
      mSolarSystem->pActiveBody.get()->getRadii());

  double observerHeight =
      polar.z / 1 - mSolarSystem->pActiveBody.get()->getHeight(polar.xy());
  int lod;
  if (!mManualMipMaps) {
    int heightMipMapLevel0 = 1500;
    int heightMipMapLevelMax = 80000;
    if (observerHeight <= heightMipMapLevel0) {
      lod = 0;
    } else if (observerHeight > heightMipMapLevelMax) {
      lod = mMipMapLevels;
    } else {
      lod = static_cast<int>(floor(
          1 + (mMipMapLevels - 1) *
                  ((std::log(observerHeight) - std::log(heightMipMapLevel0)) /
                   (std::log(heightMipMapLevelMax) -
                    std::log(heightMipMapLevel0)))));
    }
  } else {
    lod = static_cast<int>(fmin(mMipMapLevel, mMipMapLevels));
  }

  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uTexLod"),
                               static_cast<int>(lod));

  auto sunDirection = glm::normalize(
      glm::inverse(matWorldTransform) *
      (mSolarSystem->getSun()->getWorldTransform()[3] - matWorldTransform[3]));
  m_pSurfaceShader->SetUniform(
      m_pSurfaceShader->GetUniformLocation("uSunDirection"),
      (float)sunDirection[0], (float)sunDirection[1], (float)sunDirection[2]);

  // provide radii to shader
  auto mRadii = cs::core::SolarSystem::getRadii(
      mSolarSystem->pActiveBody.get()->getCenterName());
  m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uRadii"),
                               static_cast<float>(mRadii[0]),
                               static_cast<float>(mRadii[1]),
                               static_cast<float>(mRadii[2]));

  int depthBits = 0;
  glGetIntegerv(GL_DEPTH_BITS, &depthBits);

  // Dummy draw
  glDrawArrays(GL_POINTS, 0, 1);

  data.mDepthBuffer->Unbind(GL_TEXTURE0);
  data.mColorBuffer->Unbind(GL_TEXTURE1);

  mTransferFunction->unbind(GL_TEXTURE2);

  // Release shader
  m_pSurfaceShader->Release();

  glEnable(GL_DEPTH_TEST);
  glDepthMask(GL_TRUE);
  glPopAttrib();
  return true;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

bool TextureOverlayRenderer::GetBoundingBox(VistaBoundingBox &oBoundingBox) {
  float fMin[3] = {-6371000.0f, -6371000.0f, -6371000.0f};
  float fMax[3] = {6371000.0f, 6371000.0f, 6371000.0f};

  oBoundingBox.SetBounds(fMin, fMax);

  return true;
}
