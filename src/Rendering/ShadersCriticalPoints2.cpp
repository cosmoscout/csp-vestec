/*

#include "CriticalPointsRenderer.hpp"
#include <string>

const std::string CriticalPointsRenderer::SURFACE_VERT = R"(
#version 330 core

// inputs
// ========================================================================
layout(location = 0) in vec3  inPos;
layout(location = 1) in float inPersistence;
layout(location = 2) in int   inCriticalType;

uniform mat4          uMatP;
uniform mat4          uMatMV;
uniform float         uMinPersistence = 0;
uniform float         uMaxPersistence = 1;

out VS_OUT
{
    float persistence;
    flat int criticalType;
} vs_out;

void main()
{
    vs_out.persistence = inPersistence;
    vs_out.criticalType = inCriticalType;

    gl_Position = vec4(inPos.xy, 0.0, 0.0);
}
)";

const std::string CriticalPointsRenderer::SURFACE_GEOM = R"(
#version 430

layout (points) in;
layout (points) out;

uniform mat4          uMatP;
uniform mat4          uMatMV;
uniform float         uMinPersistence;
uniform float         uMaxPersistence;
uniform float         uHeightScale;
uniform float         uWidthScale;
uniform vec3          uRadii;

in VS_OUT
{
    float persistence;
    flat int criticalType;
} gs_in_vs[];

out GS_OUT
{
    vec4 vPos;
    float persistence;
    flat int criticalType;
    vec3 normal;
} gs_out;

const float PI = 3.14159265359;

vec3 geodeticSurfaceNormal(vec2 lngLat) {
  return vec3(cos(lngLat.y) * sin(lngLat.x), sin(lngLat.y),
      cos(lngLat.y) * cos(lngLat.x));
}

vec3 toCartesian(vec2 lonLat, float h) {
  vec3 n = geodeticSurfaceNormal(lonLat);
  vec3 k = n * (uRadii + h);
  return k;
}


// Emits a vertex and sets gs_out values
void outputVertex(vec4 vPos, int i, int sides, vec4[5] positions)
{
    vec4 mvPos = uMatMV * vec4(vPos.xyz, 1);

    gs_out.vPos = vec4(mvPos.xyz, 1);
    gs_out.persistence = gs_in_vs[0].persistence;
    gs_out.criticalType = gs_in_vs[0].criticalType;

    vec3 x = positions[i].xyz - positions[sides].xyz;
    vec3 y = positions[(i+1)%sides].xyz - positions[sides].xyz;

    gs_out.normal = normalize(cross(x, y));

    gl_Position = uMatP * vec4(mvPos.xyz, 1.0);

    EmitVertex();
}

void main()
{
    float normalizedPersistence = (gs_in_vs[0].persistence - uMinPersistence) / (uMaxPersistence - uMinPersistence);
    float widthScale = uWidthScale * 3.14 / 180; //in degree
    float heightScale = normalizedPersistence * uHeightScale * 1000; //m to km

    // Total number of sides + center position
    vec4 position;

    vec4 inPos = gl_in[0].gl_Position * widthScale;

    vec3 posV = toCartesian(inPos.xy, heightScale);

    vec3 scaledPos = posV;

    position = vec4(scaledPos.xyz, 1);


    vec4 mvPos = uMatMV * vec4(position.xyz, 1);

    gs_out.vPos = vec4(mvPos.xyz, 1);
    gs_out.persistence = gs_in_vs[0].persistence;
    gs_out.criticalType = gs_in_vs[0].criticalType;

    gs_out.normal = normalize(cross(position, position));

    gl_Position = uMatP * vec4(mvPos.xyz, 1.0);
}
)";

const std::string CriticalPointsRenderer::SURFACE_FRAG = R"(
#version 430

in GS_OUT
{
    vec4 vPos;
    float persistence;
    flat int criticalType;
    vec3 normal;
} fs_in;

out vec4  vFragColor;

uniform mat4          uMatP;
uniform mat4          uMatMV;

uniform float         uFarClip;
uniform float         uOpacity = 1;
uniform float         uMinPersistence = 0;
uniform float         uMaxPersistence = 1;
uniform int           uVisualizationMode = 4;

uniform vec3          uSunDirection;

uniform sampler1D     uTransferFunction;

void main()
{
    if (fs_in.criticalType != uVisualizationMode && uVisualizationMode!= 4) {
        discard;
    }

    float value = (fs_in.persistence - uMinPersistence) / (uMaxPersistence - uMinPersistence);
    vec4 color = texture(uTransferFunction, value);


    // calculate normal from texture coordinates
    vec3 N;
    N.xy = gl_PointCoord* 2.0 - vec2(1.0);
    float mag = dot(N.xy, N.xy);
    if (mag > 1.0) discard;   // kill pixels outside circle
    N.z = sqrt(1.0-mag);

    // calculate lighting
    float diffuse = max(0.0, dot(uSunDirection, N));

    vFragColor = vec4(color,1) * diffuse;

    gl_FragDepth = length(vec3(fs_in.vPos.xyz)) / uFarClip;
}
)";
*/
