
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
    #version 330 core
    out vec4 FragColor;

    uniform sampler2DRect uDepthBuffer;
    uniform sampler2D     uSimBuffer;

    uniform mat4          uMatInvMVP;
    uniform mat4          uMatInvMV;
    uniform mat4          uMatInvP;
    uniform mat4          uMatMV;

    uniform float         uFarClip;
    uniform float         uOpacity = 1;
    uniform vec4          uBounds;
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
    vec3 GetPosition()
    {
        vec2  vTexcoords = texcoord*textureSize(uDepthBuffer);
        float fDepth     = texture(uDepthBuffer, vTexcoords).r;

        float linearDepth = fDepth * uFarClip;
        vec4  posFar = uMatInvP * vec4(2.0 * texcoord - 1, 1.0 , 1.0);
        vec3  posVS = normalize(posFar.xyz) * linearDepth;
        vec4  posWorld = uMatInvMV * vec4(posVS, 1.0);

        return posWorld.xyz;
    }

    // ===========================================================================
    vec2 GetLngLat(vec3 vPosition)
    {
        vec2 result = vec2(-2);

        if (vPosition.z != 0.0)
        {
            result.x = atan(vPosition.x / vPosition.z);

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
        result.y = asin(vPosition.y / length(vPosition));

        return result;
    }

    void main()
    {       
        float fDepth     = GetDepth();
        if (fDepth == 1000000.0) 
        {
            discard;
        }else{
            vec3 worldPos = GetPosition();
            vec2 lnglat   = GetLngLat(worldPos);

            FragColor = vec4(worldPos, 1.0);

            float min_long = radians(uBounds.x);
            float min_lat = radians(uBounds.w);
            float max_long = radians(uBounds.z);
            float max_lat = radians(uBounds.y);

            if(lnglat.x > min_long && lnglat.x < max_long &&
               lnglat.y > min_lat && lnglat.y < max_lat)
            {
                float norm_u = (lnglat.x - min_long) / (max_long - min_long);
                float norm_v = (lnglat.y - min_lat) / (max_lat - min_lat);
                vec2 newCoords = vec2(norm_u,norm_v);

                float value         = texture(uSimBuffer, newCoords).r;
                
                if(value < 0)
                    discard;
                
                float normSimValue  = value / uRange.y;
                FragColor = vec4(normSimValue, 0.0, 0.0, uOpacity);
            }
            else
                discard;
        }
    }
)";
