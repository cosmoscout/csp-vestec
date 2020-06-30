
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

    out vec4 vPos;
    out float persistence;
    flat out int   criticalType;

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
         float value = (inPersistence - uMinPersistence) / (uMaxPersistence - uMinPersistence);
         gl_PointSize =  2 + 15 * value;
         vec3 posV = VP_toCartesian(inPos.xy, vec2(6378500, 6378500));
         vPos = uMatMV * vec4(posV, 1.0);
         gl_Position = uMatP * vec4(vPos.xyz, 1);
         persistence = inPersistence;
         criticalType = inCriticalType;
    }
)";

const std::string CriticalPointsRenderer::SURFACE_FRAG = R"(
    #version 430

    in  vec4  vPos;
    in  float persistence;
    flat in  int   criticalType;
    out vec4  FragColor;

    uniform mat4          uMatP;
    uniform mat4          uMatMV;

    uniform float         uFarClip;
    uniform float         uOpacity = 1;
    uniform float         uMinPersistence = 0;
    uniform float         uMaxPersistence = 1;
    uniform int           uVisualizationMode = 4;

    const float PI = 3.14159265359;

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
        if(criticalType != uVisualizationMode && uVisualizationMode!= 4)
            discard;

        float value = (persistence - uMinPersistence) / (uMaxPersistence - uMinPersistence);
        FragColor = vec4(heat(value), 1);
        
        gl_FragDepth = length(vec3(vPos.xyz)) / uFarClip;
    }
)";
