#include "TextureOverlayRenderer.hpp"

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
#include <VistaOGLExt/VistaVertexArrayObject.h>

#include <GL/gl.h>

#include <algorithm>
#include <fstream>
#include <functional>
#include <json.hpp>
#include <sstream>
#include <unordered_set>

#define _SILENCE_CXX17_OLD_ALLOCATOR_MEMBERS_DEPRECATION_WARNING
using json = nlohmann::json;

TextureOverlayRenderer::TextureOverlayRenderer() {
  std::cout << "Compile shader for TextureOverlayRenderer " << std::endl;
  m_pSurfaceShader = nullptr;

  m_pSurfaceShader = new VistaGLSLShader();
  m_pSurfaceShader->InitVertexShaderFromString(SURFACE_VERT);
  m_pSurfaceShader->InitFragmentShaderFromString(SURFACE_FRAG);
  m_pSurfaceShader->InitGeometryShaderFromString(SURFACE_GEOM);

  if (m_pSurfaceShader->Link()) {
    //auto loc  = m_pSurfaceShader->GetUniformLocation("uHeightScale");
  }
  std::cout << "Compile shader for TextureOverlayRenderer done " << std::endl;
}

TextureOverlayRenderer::~TextureOverlayRenderer() {
}

void TextureOverlayRenderer::AddOverlayTexture(TextureOverlayRenderer::GreyScaleTexture texture) {
  vecTextures.clear();

  std::cout << "[TextureOverlayRenderer::AddOverlayTexture] Uploading texture " << std::endl;

  // Create and upload GL Texture
  unsigned int glTextureID;
  glGenTextures(1, &glTextureID);
  glBindTexture(GL_TEXTURE_2D, glTextureID);
  // set the texture wrapping/filtering options (on the currently bound texture object)
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
  glTexImage2D(GL_TEXTURE_2D, 0, GL_R32F, texture.x, texture.y, 0, GL_RED,
      GL_FLOAT, texture.buffer);

  //Store texture id
  texture.GL_ID = glTextureID;
  std::cout << "[TextureOverlayRenderer::AddOverlayTexture] Uploading texture done " << std::endl;

  vecTextures.push_back(texture);
}

bool TextureOverlayRenderer::Do() {
  if(vecTextures.size() == 0)
    return false;
  // std::cout << "[TextureOverlayRenderer::Do] Rendering in Do()" << std::endl;
  // save current lighting and meterial state of the OpenGL state machine
  glPushAttrib(GL_POLYGON_BIT | GL_ENABLE_BIT);
  glEnable(GL_BLEND);
  glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
  glDisable(GL_CULL_FACE);

  double nearClip, farClip;
  GetVistaSystem()
      ->GetDisplayManager()
      ->GetCurrentRenderInfo()
      ->m_pViewport->GetProjection()
      ->GetProjectionProperties()
      ->GetClippingRange(nearClip, farClip);

  glDisable(GL_DEPTH_TEST);

  // Bind shader before draw
  m_pSurfaceShader->Bind();
  //m_pSurfaceShader->SetUniform(m_uFarClipLoc, (float)farClip);  
  
  glActiveTexture(GL_TEXTURE0);
  glBindTexture(GL_TEXTURE_2D, vecTextures[0].GL_ID);

  //Dummy draw
  glDrawArrays(GL_POINTS, 0, 1);

  glBindTexture(GL_TEXTURE_2D, 0);  

  //Release shader
  m_pSurfaceShader->Release();
  

  glPopAttrib();
  return true;
}

bool TextureOverlayRenderer::GetBoundingBox(VistaBoundingBox& oBoundingBox) {
  float fMin[3] = {-6371000.0f, -6371000.0f, -6371000.0f};
  float fMax[3] = {6371000.0f, 6371000.0f, 6371000.0f};

  oBoundingBox.SetBounds(fMin, fMax);

  return true;
}