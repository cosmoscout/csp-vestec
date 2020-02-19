
#include "CriticalPointsRenderer.hpp"
#include <string>

const std::string CriticalPointsRenderer::SURFACE_VERT = R"(
    #version 330 core

    // inputs
    // ========================================================================
    layout(location = 0) in vec3  inPos;
    layout(location = 1) in float inPersistence;

    uniform mat4          uMatP;
    uniform mat4          uMatMV;

    out vec4 vPos;

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
        return vec3(c.y * s.x * radius.x,
                  s.y * radius.y,
                  c.y * c.x * radius.x);
    }

    void main()
    {
         vec3 posV = VP_toCartesian(inPos.xy, vec2(6381000, 6381000));
         vPos = uMatMV * vec4(posV, 1.0);
         gl_Position = uMatP * vec4(vPos.xyz, 1);
    }
)";

const std::string CriticalPointsRenderer::SURFACE_FRAG = R"(
    #version 430

    in  vec4 vPos;
    out vec4 FragColor;

    uniform mat4          uMatP;
    uniform mat4          uMatMV;

    uniform float         uFarClip;
    uniform float         uOpacity = 1;

    const float PI = 3.14159265359;
 
    void main()
    {     
        FragColor = vec4(1, 0, 0, 1);
         gl_FragDepth = length(vec3(vPos.xyz)) / uFarClip;
    }
)";
