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
#include "../../../../src/cs-utils/FrameTimings.hpp"

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
#include <vector>

#define _SILENCE_CXX17_OLD_ALLOCATOR_MEMBERS_DEPRECATION_WARNING
using json = nlohmann::json;

UncertaintyOverlayRenderer::UncertaintyOverlayRenderer(cs::core::SolarSystem* pSolarSystem)
    : mSolarSystem(pSolarSystem) {
  csp::vestec::logger().debug("[UncertaintyOverlayRenderer] Compiling shader");

  m_pSurfaceShader = nullptr;
  m_pSurfaceShader = new VistaGLSLShader();
  m_pSurfaceShader->InitVertexShaderFromString(SURFACE_VERT);
  m_pSurfaceShader->InitFragmentShaderFromString(SURFACE_FRAG);
  m_pSurfaceShader->InitGeometryShaderFromString(SURFACE_GEOM);
  m_pSurfaceShader->Link();

  m_pComputeShader = nullptr;
  m_pComputeShader = new VistaGLSLShader();
  m_pComputeShader->InitShaderFromString(GL_COMPUTE_SHADER, COMPUTE);
  m_pComputeShader->Link();

  // Initialize SSBO
  m_pBufferSSBO = new VistaBufferObject();

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
    bufferData.mColorBuffer->SetMinFilter(GL_NEAREST);
    bufferData.mColorBuffer->SetMagFilter(GL_NEAREST);
    bufferData.mColorBuffer->Unbind();

    mGBufferData[viewport.second] = bufferData;
  }
  csp::vestec::logger().debug("[UncertaintyOverlayRenderer] Compiling shader done");
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
  mLockTextureAccess.lock();
  mvecTextures.clear();
  mvecTextures    = std::move(vecTextures);
  mUpdateTextures = true;
  mLockTextureAccess.unlock();
}

bool UncertaintyOverlayRenderer::Do() {
  mLockTextureAccess.lock();
  int numTextures = mvecTextures.size();

  if (numTextures == 0) {
    mLockTextureAccess.unlock();
    return false;
  }
  // Get viewport information required to get previous depth buffer
  auto        viewport = GetVistaSystem()->GetDisplayManager()->GetCurrentRenderInfo()->m_pViewport;
  auto const& data     = mGBufferData[viewport];
  {
    // get active planet
    if (mSolarSystem->pActiveBody.get() == nullptr ||
        mSolarSystem->pActiveBody.get()->getCenterName() != "Earth") {
      csp::vestec::logger().info("[UncertaintyOverlayRenderer::Do] No active planet set");

      mLockTextureAccess.unlock();
      return false;
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

    data.mDepthBuffer->Bind();
    glCopyTexImage2D(GL_TEXTURE_RECTANGLE, 0, GL_DEPTH_COMPONENT, iViewport[0], iViewport[1],
        iViewport[2], iViewport[3], 0);
    data.mDepthBuffer->Unbind();
    //################################## Upload textures ###################################
    if (mUpdateTextures) {
      this->UploadTextures();
    }
    //################################## Compute Shader ###################################
    std::vector<float> result;
    {
      cs::utils::FrameTimings::ScopedTimer timer("UncertaintyOverlayRenderer::Compute");
      m_pComputeShader->Bind();

      // Provide access to simulations results (2D TEXTURE ARRAY)
      data.mColorBuffer->Bind(GL_TEXTURE0);
      m_pComputeShader->SetUniform(m_pComputeShader->GetUniformLocation("uSimBuffer"), 0);

      // Provide texture sizes for correct lookups
      m_pComputeShader->SetUniform(
          m_pComputeShader->GetUniformLocation("uSizeTexX"), (int)mvecTextures[0].x);

      m_pComputeShader->SetUniform(
          m_pComputeShader->GetUniformLocation("uSizeTexY"), (int)mvecTextures[0].y);

      m_pComputeShader->SetUniform(
          m_pComputeShader->GetUniformLocation("uSizeTexZ"), (int)mvecTextures.size());

      // Provide access to write the output into a SSBO
      int group_size_x = (mvecTextures[0].x / 16) + 1;
      int group_size_y = (mvecTextures[0].y / 16) + 1;

      // Provide access to SSBO to write result data
      m_pBufferSSBO->BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1);

      // Execute shader
      glDispatchComputeGroupSizeARB(group_size_x, group_size_y, 1, group_size_x, group_size_y, 1);

      // Barrier to wait for SSBO results
      glMemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);

      // Release SSBO
      glBindBufferBase(GL_SHADER_STORAGE_BUFFER, 0, 0);

      // Copy ssbo back to host memory
      // m_pBufferSSBO->Bind(GL_SHADER_STORAGE_BUFFER);
      // float* ptr = (float*)m_pBufferSSBO->MapBuffer(GL_READ_ONLY);

      // result.push_back(ptr[0]);
      // result.push_back(ptr[1]);
      // result.push_back(ptr[2]);
      // result.push_back(ptr[3]);
      // result.push_back(ptr[4]);
      // result.push_back(ptr[5]);
      // result.push_back(ptr[6]);
      // result.push_back(ptr[7]);

      // std::cout << "Min Scalar " << ptr[0] << std::endl;
      // std::cout << "Max Scalar " << ptr[1] << std::endl;
      // std::cout << "Avg Scalar " << ptr[2] << std::endl;
      // std::cout << "Avg scalar min per Pixel " << ptr[3] << std::endl;
      // std::cout << "Avg scalar max per Pixel " << ptr[4] << std::endl;
      // std::cout << "Avg Diff " << ptr[5] << std::endl;
      // std::cout << "Difference min per pixel " << ptr[6] << std::endl;
      // std::cout << "Difference max per pixel " << ptr[7] << std::endl;
      // std::cout << "#######################" << std::endl;
      // m_pBufferSSBO->UnmapBuffer();
      // m_pBufferSSBO->Release();

      data.mColorBuffer->Unbind(GL_TEXTURE0);
      m_pComputeShader->Release();
    }
    //################################## Compute Shader done ###################################

    cs::utils::FrameTimings::ScopedTimer timer("UncertaintyOverlayRenderer::Rendering");
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

    // Bind shader before actual rendering
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
    m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uOpacity"), (float)mOpacity);
    m_pSurfaceShader->SetUniform(
        m_pSurfaceShader->GetUniformLocation("uVisMode"), (int)mRenderMode);

    auto sunDirection =
        glm::normalize(glm::inverse(matWorldTransform) *
                       (mSolarSystem->getSun()->getWorldTransform()[3] - matWorldTransform[3]));
    m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uSunDirection"),
        sunDirection[0], sunDirection[1], sunDirection[2]);

    //provide radii to shader
    auto mRadii = cs::core::SolarSystem::getRadii(mSolarSystem->pActiveBody.get()->getCenterName());
    m_pSurfaceShader->SetUniform(m_pSurfaceShader->GetUniformLocation("uRadii"), static_cast<float>(mRadii[0]),
      static_cast<float>(mRadii[1]), static_cast<float>(mRadii[2]));


    // Provide SSBO with min, max average values on location 3
    m_pBufferSSBO->BindBufferBase(GL_SHADER_STORAGE_BUFFER, 3);

    // Dummy draw
    glDrawArrays(GL_POINTS, 0, 1);

    // Release SSBO
    glBindBufferBase(GL_SHADER_STORAGE_BUFFER, 0, 0);
    m_pBufferSSBO->Release();

    data.mDepthBuffer->Unbind(GL_TEXTURE0);
    data.mColorBuffer->Unbind(GL_TEXTURE1);
    // Release shader
    m_pSurfaceShader->Release();

    glEnable(GL_DEPTH_TEST);
    glDepthMask(GL_TRUE);
    glPopAttrib();
  }
  mLockTextureAccess.unlock();
  return true;
}

void UncertaintyOverlayRenderer::getGLError(std::string name) {
  int error = glGetError();
  if (error != 0) {
    csp::vestec::logger().error(
        "[UncertaintyOverlayRenderer]  Error in" + name + " Error code: " + std::to_string(error));
  }
}

void UncertaintyOverlayRenderer::UploadTextures() {
  auto        viewport = GetVistaSystem()->GetDisplayManager()->GetCurrentRenderInfo()->m_pViewport;
  auto const& data     = mGBufferData[viewport];

  // Get the first texture
  GDALReader::GreyScaleTexture texture0 = mvecTextures[0];

  // Allocate memory for the SSBO
  int group_size_x = (mvecTextures[0].x / 16) + 1;
  int group_size_y = (mvecTextures[0].y / 16) + 1;

  m_pBufferSSBO->Bind(GL_SHADER_STORAGE_BUFFER);
  m_pBufferSSBO->BufferData(
      8 * group_size_x * group_size_y * sizeof(float), nullptr, GL_DYNAMIC_COPY);
  m_pBufferSSBO->Release();

  // Allocate texture array
  data.mColorBuffer->Bind();
  if (lBufferSize != texture0.x * texture0.y * mvecTextures.size()) {
    glTexStorage3D(GL_TEXTURE_2D_ARRAY, 1, GL_R32F, texture0.x, texture0.y, mvecTextures.size());
    lBufferSize = texture0.x * texture0.y * mvecTextures.size();
  }

  int layerCount = 0;
  for (auto texture : mvecTextures) {
    glTexSubImage3D(GL_TEXTURE_2D_ARRAY, 0, 0, 0, layerCount, texture.x, texture.y, 1, GL_RED,
        GL_FLOAT, texture.buffer);
    layerCount++;
  }
  mUpdateTextures = false;
  data.mColorBuffer->Unbind();
}

void UncertaintyOverlayRenderer::SetVisualizationMode(RenderMode mode) {
  mRenderMode = mode;
}

bool UncertaintyOverlayRenderer::GetBoundingBox(VistaBoundingBox& oBoundingBox) {
  float fMin[3] = {-6371000.0f, -6371000.0f, -6371000.0f};
  float fMax[3] = {6371000.0f, 6371000.0f, 6371000.0f};

  oBoundingBox.SetBounds(fMin, fMax);

  return true;
}