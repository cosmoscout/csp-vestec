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

TextureOverlayRenderer::TextureOverlayRenderer()
{
}

TextureOverlayRenderer::~TextureOverlayRenderer() {
}

bool TextureOverlayRenderer::Do() {
  //std::cout << "[TextureOverlayRenderer::Do] Rendering in Do()" << std::endl;
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

  //TODO Draw overlay

  glPopAttrib();
  return true;
}

bool TextureOverlayRenderer::GetBoundingBox(VistaBoundingBox& oBoundingBox) {
  float fMin[3] = {-6371000.0f, -6371000.0f, -6371000.0f};
  float fMax[3] = {6371000.0f, 6371000.0f, 6371000.0f};

  oBoundingBox.SetBounds(fMin, fMax);

  return true;
}