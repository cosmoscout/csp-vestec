
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
layout (triangle_strip, max_vertices = 16) out;

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

vec3 toCartesian(vec2 lonLat) {
  vec3 n = geodeticSurfaceNormal(lonLat);
  vec3 k = n * uRadii * uRadii;
  float gamma = sqrt(dot(k, n));
  return k / gamma;
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

// Maps the point persistence to a pre-defined range
float map(float value, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - uMinPersistence) / (uMaxPersistence - uMinPersistence);
}

void main()
{
    const int sides = 4;

    float widthScale = map((gs_in_vs[0].persistence * uWidthScale), 0.00000125, 0.000015);
    float heightScale = map((gs_in_vs[0].persistence * uHeightScale), 1, 1.00015);

    // Total number of sides + center position
    vec4[sides + 1] positions;

    // Earth Center
    // Last position = pyramid head (earth center)
    positions[sides] = vec4(0, 0, 0, 1);

    // First create needed vertex positions
    for (int i = 0; i < sides; i++) {
        float ang = (PI * 2.0 / sides * i) - PI / 4;

        vec4 offset = vec4(cos(ang) * widthScale, -sin(ang) * widthScale, 0.0, 0.0);
        vec4 inPos = gl_in[0].gl_Position + offset;

        vec3 posV = toCartesian(inPos.xy);

        vec3 scaledPos = posV * heightScale;

        positions[i] = vec4(scaledPos.xyz, 1);
    }

    // Emit as triangle
    for (int i = 0; i < sides; i++) {
        outputVertex(positions[sides], i, sides, positions);
        outputVertex(positions[(i+1)%sides], i, sides, positions);
        outputVertex(positions[i], i, sides, positions);
        EndPrimitive();
    }

    // Top billboard
    outputVertex(positions[2], 1, 0, positions);
    outputVertex(positions[3], 1, 0, positions);
    outputVertex(positions[1], 1, 0, positions);
    outputVertex(positions[0], 1, 0, positions);
    EndPrimitive();
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

out vec4  FragColor;

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

    float ambientStrength = 0.2;
    vec3 lightColor = vec3(1.0, 1.0, 1.0);

    float diff = max(dot(fs_in.normal, -uSunDirection), 0.0);
    vec3 diffuse = diff * lightColor;
    vec3 ambient = ambientStrength * lightColor;

    vec3 result = (ambient + diffuse) * color.rgb;

    FragColor = vec4(result.rgb, color.a);

    gl_FragDepth = length(vec3(fs_in.vPos.xyz)) / uFarClip;
}
)";
