
#include "TextureOverlayRenderer.hpp"
#include <string>

const std::string TextureOverlayRenderer::SURFACE_GEOM = R"(
    #version 330 core

    layout(points) in;
    layout(triangle_strip, max_vertices = 4) out;

    out vec2 texcoord;

    void main() 
    {
        gl_Position = vec4( 1.0, 1.0, 0.5, 1.0 );
        texcoord = vec2( 1.0, 1.0 );
        EmitVertex();

        gl_Position = vec4(-1.0, 1.0, 0.5, 1.0 );
        texcoord = vec2( 0.0, 1.0 ); 
        EmitVertex();

        gl_Position = vec4( 1.0,-1.0, 0.5, 1.0 );
        texcoord = vec2( 1.0, 0.0 ); 
        EmitVertex();

        gl_Position = vec4(-1.0,-1.0, 0.5, 1.0 );
        texcoord = vec2( 0.0, 0.0 ); 
        EmitVertex();

        EndPrimitive(); 
    }
)";

const std::string TextureOverlayRenderer::SURFACE_VERT = R"(
    #version 330 core

    void main()
    {

    }
)";

const std::string TextureOverlayRenderer::SURFACE_FRAG = R"(
    #version 430
    out vec4 FragColor;

    uniform sampler2DRect uDepthBuffer;
    uniform sampler2D     uSimBuffer;

    uniform mat4          uMatInvMVP;
    uniform mat4          uMatInvMV;
    uniform mat4          uMatInvP;
    uniform mat4          uMatMV;

    uniform float         uFarClip;
    uniform float         uOpacity = 1;
    uniform float         uTime    = 6;
    uniform bool          uUseTime = false;
    uniform dvec4         uBounds;
    uniform vec2          uRange;

    in vec2 texcoord;

    const float PI = 3.14159265359;

    // ===========================================================================
    float GetDepth()
    {
        vec2  vTexcoords = texcoord*textureSize(uDepthBuffer);
        float fDepth     = texture(uDepthBuffer, vTexcoords).r;


        // We need to return a distance which is guaranteed to be larger
        // than the largest ray length possible. As the atmosphere has a
        // radius of 1.0, 1000000 is more than enough.
        if (fDepth == 1) return 1000000.0;

        float linearDepth = fDepth * uFarClip;
        vec4 posFarPlane = uMatInvP * vec4(2.0*texcoord-1, 1.0, 1.0);
        vec3 posVS = normalize(posFarPlane.xyz) * linearDepth;

        return length(uMatInvMV[3].xyz - (uMatInvMV * vec4(posVS, 1.0)).xyz);
    }

    // ===========================================================================
    double atan2(double y, double x)
    {
    const double atan_tbl[] = {
    -3.333333333333333333333333333303396520128e-1LF,
     1.999999117496509842004185053319506031014e-1LF,
    -1.428514132711481940637283859690014415584e-1LF,
     1.110012236849539584126568416131750076191e-1LF,
    -8.993611617787817334566922323958104463948e-2LF,
     7.212338962134411520637759523226823838487e-2LF,
    -5.205055255952184339031830383744136009889e-2LF,
     2.938542391751121307313459297120064977888e-2LF,
    -1.079891788348568421355096111489189625479e-2LF,
     1.858552116405489677124095112269935093498e-3LF
    };

    /* argument reduction: 
       arctan (-x) = -arctan(x); 
       arctan (1/x) = 1/2 * pi - arctan (x), when x > 0
    */

    double ax = abs(x);
    double ay = abs(y);
    double t0 = max(ax, ay);
    double t1 = min(ax, ay);
    
    double a = 1 / t0;
    a *= t1;

    double s = a * a;
    double p = atan_tbl[9];

    p = fma( fma( fma( fma( fma( fma( fma( fma( fma( fma(p, s,
        atan_tbl[8]), s,
        atan_tbl[7]), s, 
        atan_tbl[6]), s,
        atan_tbl[5]), s,
        atan_tbl[4]), s,
        atan_tbl[3]), s,
        atan_tbl[2]), s,
        atan_tbl[1]), s,
        atan_tbl[0]), s*a, a);

    double r = ay > ax ? (1.57079632679489661923LF - p) : p;

    r = x < 0 ?  3.14159265358979323846LF - r : r;
    r = y < 0 ? -r : r;

    return r;
    }

     // ===========================================================================
    dvec3 GetPosition()
    {
        vec2  vTexcoords = texcoord*textureSize(uDepthBuffer);
        float fDepth     = texture(uDepthBuffer, vTexcoords).r;

        float linearDepth = fDepth * uFarClip;
        vec4  posFar = uMatInvP * vec4(2.0 * texcoord - 1, 1.0 , 1.0);
        vec3  posVS = normalize(posFar.xyz) * linearDepth;
        dvec4  posWorld = uMatInvMV * vec4(posVS, 1.0);

        return posWorld.xyz;
    }

    // ===========================================================================
    dvec2 GetLngLat(dvec3 vPosition)
    {
        dvec2 result = dvec2(-2);

        if (vPosition.z != 0.0)
        {
            //result.x = atan2(vPosition.z, vPosition.x);
            result.x = atan(float(vPosition.x / vPosition.z));

            if (vPosition.z < 0 && vPosition.x < 0)
                result.x -= PI;
            if (vPosition.z < 0 && vPosition.x >= 0)
                result.x += PI;
        }
        else if (vPosition.x == 0)
            result.x = 0.0;
        else if (vPosition.x < 0)
            result.x = -PI * 0.5;
        else
            result.x = PI * 0.5;

        // geocentric latitude of the input point
        result.y = float(asin(float(vPosition.y / length(vPosition))));

        return result;
    }
    // ===========================================================================
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
        float fDepth     = GetDepth();
        if (fDepth == 1000000.0) 
        {
            discard;
        }else{
            dvec3 worldPos  = GetPosition();
            dvec2 lnglat   = GetLngLat(worldPos);

            FragColor = vec4(worldPos, 1.0);

            double min_long  = uBounds.x;
            double min_lat   = uBounds.w;
            double max_long  = uBounds.z;
            double max_lat   = uBounds.y;

            if(lnglat.x > min_long && lnglat.x < max_long &&
               lnglat.y > min_lat && lnglat.y < max_lat)
            {
                double norm_u = (lnglat.x - min_long) / (max_long - min_long);
                double norm_v = (lnglat.y - min_lat) / (max_lat - min_lat);
                vec2 newCoords = vec2(float(norm_u), float(1.0 - norm_v));

                float value         = texture(uSimBuffer, newCoords).r;
                
                if(value < 0)
                    discard;

                if(uUseTime && value > uTime)
                    discard;
                
                float normSimValue  = value / uRange.y;
                FragColor = vec4(heat(normSimValue), uOpacity);
            }
            else
                discard;
        }
    }
)";
