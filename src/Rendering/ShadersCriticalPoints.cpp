
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

float VP_toGeocentricLat(float geodeticLat, vec2 radius)
{
    float f = (radius.x - radius.y) / radius.x;
    return atan(pow(1.0 - f, 2.0) * tan(geodeticLat));
}

// Converts point @a lnglat from geodetic (lat,lng) to cartesian
// coordinates (x,y,z) for an ellipsoid with radii @a radius.
vec3 VP_toCartesian(vec2 lnglat, vec2 radius)
{
    lnglat.y = VP_toGeocentricLat(lnglat.y, radius);

    vec2  c   = cos(lnglat);
    vec2  s   = sin(lnglat);

    // point on ellipsoid surface
    return vec3(
    c.y * s.x * radius.x,
    s.y * radius.y,
    c.y * c.x * radius.x
    );
}

// Emits a vertex and sets gs_out values
void outputVertex(vec4 vPos)
{
    vec4 mvPos = uMatMV * vec4(vPos.xyz, 1);

    gs_out.vPos = vec4(mvPos.xyz, 1);
    gs_out.persistence = gs_in_vs[0].persistence;
    gs_out.criticalType = gs_in_vs[0].criticalType;

    gl_Position = uMatP * vec4(mvPos.xyz, 1.0);

    EmitVertex();
}

float map(float value, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - uMinPersistence) / (uMaxPersistence - uMinPersistence);
}

void main()
{
    const int sides = 4;

    float widthScale = map((gs_in_vs[0].persistence * uWidthScale), 0.0000125, 0.00015);
    float heightScale = map((gs_in_vs[0].persistence * uHeightScale), 1, 1.005);

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

        vec3 posV = VP_toCartesian(inPos.xy, vec2(6378500, 6378500));

        vec3 scaledPos = posV * heightScale;

        positions[i] = vec4(scaledPos.xyz, 1);
    }

    // Emit as triangle
    for (int i = 0; i < sides; i++) {
        outputVertex(positions[sides]);
        outputVertex(positions[(i+1)%sides]);
        outputVertex(positions[i]);

        vec3 x = positions[i].xyz - positions[sides].xyz;
        vec3 y = positions[(i+1)%sides].xyz - positions[sides].xyz;

        gs_out.normal = normalize(cross(x, y));

        EndPrimitive();
    }

    // Top billboard
    outputVertex(positions[2]);
    outputVertex(positions[3]);
    outputVertex(positions[1]);
    outputVertex(positions[0]);

    vec3 x = positions[1].xyz - positions[0].xyz;
    vec3 y = positions[2].xyz - positions[0].xyz;

    gs_out.normal = normalize(cross(x, y));
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

vec3 heat(float v) {
    float value = 1.0-v;

    return (0.5+0.5*smoothstep(0.0, 0.1, value))*vec3(smoothstep(0.5, 0.3, value), value < 0.3 ?
    smoothstep(0.0, 0.3, value) :
    smoothstep(1.0, 0.6, value),
    smoothstep(0.4, 0.6, value)
    );
}

void main()
{
    if (fs_in.criticalType != uVisualizationMode && uVisualizationMode!= 4) {
        discard;
    }

    float value = (fs_in.persistence - uMinPersistence) / (uMaxPersistence - uMinPersistence);
    vec4 color = vec4(heat(value), 1);

    float ambientStrength = 0.2;
    vec3 lightColor = vec3(1.0, 1.0, 1.0);

    float diff = max(dot(fs_in.normal, -uSunDirection), 0.0);
    vec3 diffuse = diff * lightColor;
    vec3 ambient = ambientStrength * lightColor;

    vec3 result = (ambient + diffuse) * color.rgb;

    FragColor = vec4(result, 1);

    gl_FragDepth = length(vec3(fs_in.vPos.xyz)) / uFarClip;
}
)";

