
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
#version 440
out vec4 FragColor;

uniform sampler2DRect uDepthBuffer;
uniform sampler2D     uSimBuffer;

uniform sampler1D     uTransferFunction;

uniform mat4          uMatInvMVP;
uniform dmat4         uMatInvMV;
uniform mat4          uMatInvP;
uniform mat4          uMatMV;

uniform float         uFarClip;
uniform float         uOpacity = 1;
uniform float         uTime    = 6;
uniform bool          uUseTime = false;
uniform dvec4         uBounds;
uniform vec2          uRange;
uniform vec3          uRadii;

uniform vec3          uSunDirection;

uniform int uTexLod;

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

    float distance = length(float(uMatInvMV[3].xyz - (uMatInvMV * vec4(posVS, 1.0)).xyz));
    return distance;
}

// ===========================================================================
dvec3 GetPosition()
{
    vec2  vTexcoords = texcoord*textureSize(uDepthBuffer);
    float fDepth     = texture(uDepthBuffer, vTexcoords).r;

    float  linearDepth = fDepth * uFarClip;
    dvec4  posFar = uMatInvP * dvec4(2.0 * texcoord - 1, 1.0 , 1.0);
    dvec3  posVS = normalize(posFar.xyz) * linearDepth;
    dvec4  posWorld = uMatInvMV * dvec4(posVS, 1.0);

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
vec3 scaleToGeodeticSurface(vec3 cartesian, vec3 radii) {
    vec3 radii2        = radii * radii;
    vec3 radii4        = radii2 * radii2;
    vec3 oneOverRadii2 = 1.0 / radii2;
    vec3 cartesian2    = cartesian * cartesian;

    float beta  = 1.0 / sqrt(dot(cartesian2, oneOverRadii2));
    float n     = length(beta * cartesian * oneOverRadii2);
    float alpha = (1.0 - beta) * (length(cartesian) / n);
    float s     = 0.0;
    float dSdA  = 1.0;

    vec3 d;

    do {
        alpha -= (s / dSdA);

        d    = vec3(1.0) + (alpha * oneOverRadii2);
        s    = dot(cartesian2, 1.0 / (radii2 * d * d)) - 1.0;
        dSdA = dot(cartesian2, 1.0 / (radii4 * d * d * d)) * -2.0;

    } while (abs(s) > 0.00000000001);

    return cartesian / d;
}
// ===========================================================================

////////////////////////////////////////////////////////////////////////////////////////////////////

vec3 surfaceToNormal(vec3 cartesian, vec3 radii) {
    vec3 radii2        = radii * radii;
    vec3 oneOverRadii2 = 1.0 / radii2;
    return normalize(cartesian * oneOverRadii2);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

vec2 surfaceToLngLat(vec3 cartesian, vec3 radii) {
    vec3 geodeticNormal = surfaceToNormal(cartesian, radii);
    return vec2(atan(geodeticNormal.x, geodeticNormal.z), asin(geodeticNormal.y));
}

// ===========================================================================

void main()
{
    float fDepth = GetDepth();
    if (fDepth == 1000000.0)
    {
        discard;
    }else{
        dvec3 worldPos  = GetPosition();
        //dvec2 lnglat    = GetLngLat(worldPos);
        vec2 lnglat    = surfaceToLngLat(vec3(worldPos.x, worldPos.y, worldPos.z), uRadii);

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

            //float value         = texture(uSimBuffer, newCoords).r;
            float value         = textureLod(uSimBuffer, newCoords, uTexLod).r;
            //float mipmapLevel = textureQueryLod(uSimBuffer, newCoords).x;
            //float value = textureLod(uSimBuffer, newCoords, mipmapLevel).r;
            //float mipmapLevel = textureQueryLod(uSimBuffer, newCoords).x;

            if(value < 0)
            discard;

            if(uUseTime && value > uTime)
            discard;

            //Texture lookup and color mapping
            float normSimValue  = value / uRange.y;
            vec4 color = texture(uTransferFunction, normSimValue);

            //Lighting using a normal calculated from partial derivative
            vec3  fPos    = vec3(worldPos); //cast from double to float
            vec3  dx      = dFdx( fPos );
            vec3  dy      = dFdy( fPos );

            vec3 N = normalize(cross(dx, dy));
            //N *= sign(N.z);
            float NdotL = dot(N, -uSunDirection);

            float ambientStrength = 0.2;
            vec3 lightColor = vec3(1.0, 1.0, 1.0);
            vec3 ambient = ambientStrength * lightColor;
            vec3 diffuse = lightColor * NdotL;
            //vec3 result = (ambient + diffuse) * color.rgb;
            vec3 result = color.rgb;

            FragColor = vec4(result, color.a * uOpacity);
        }
        else
        discard;
    }
}
)";

const std::string TextureOverlayRenderer::COMPUTE = R"(
#version 430
layout (local_size_x = 16, local_size_y = 16) in;

layout (r32f, binding = 0) readonly uniform image2D uInLevel0;

layout (r32f, binding = 1) readonly uniform image2D uInPrevLevel;
layout (r32f, binding = 2) writeonly uniform image2D uOut;

uniform int uLevel;
uniform int uMipMapReduceMode;

int sampleCounter = 0;

void sampleLevel0(inout float oOutputValue, ivec2 offset) {
    float val = imageLoad(uInLevel0, ivec2(gl_GlobalInvocationID.xy + offset)).r;
    oOutputValue = max(oOutputValue, val);
}

void samplePyramid(inout float oOutputValue, ivec2 offset) {
    float value = imageLoad(uInPrevLevel, ivec2(gl_GlobalInvocationID.xy * 2 + offset)).r;

    // Only use maximum
    if (uMipMapReduceMode == 0) {
        oOutputValue = max(oOutputValue, value);
    }

    // Only use minimum
    if (uMipMapReduceMode == 1) {
        if (value > 0) {
            oOutputValue = min(oOutputValue, value);
        }
    }

    // Add all values, they are averaged later
    if (uMipMapReduceMode == 2) {
        if (value > 0) {
            oOutputValue += value;
            sampleCounter += 1;
        }
    }
}

void main() {
    ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);
    ivec2 size     = imageSize(uOut);

    if (storePos.x >= size.x || storePos.y >= size.y) {
        return;
    }

    sampleCounter = 0;
    float oOutputValue = 0;

    if (uLevel == 0) {
        sampleLevel0(oOutputValue, ivec2(0, 0));
        sampleLevel0(oOutputValue, ivec2(0, 1));
        sampleLevel0(oOutputValue, ivec2(1, 0));
        sampleLevel0(oOutputValue, ivec2(1, 1));
    } else {
        samplePyramid(oOutputValue, ivec2(0, 0));
        samplePyramid(oOutputValue, ivec2(0, 1));
        samplePyramid(oOutputValue, ivec2(1, 0));
        samplePyramid(oOutputValue, ivec2(1, 1));

        // handle cases close to right and top edge
        ivec2 maxCoords = imageSize(uInPrevLevel) - ivec2(1);
        if (gl_GlobalInvocationID.x * 2 == maxCoords.x - 2) {
            samplePyramid(oOutputValue, ivec2(2, 0));
            samplePyramid(oOutputValue, ivec2(2, 1));
        }

        if (gl_GlobalInvocationID.y * 2 == maxCoords.y - 2) {
            samplePyramid(oOutputValue, ivec2(0, 2));
            samplePyramid(oOutputValue, ivec2(1, 2));

            if (gl_GlobalInvocationID.x * 2 == maxCoords.x - 2) {
                samplePyramid(oOutputValue, ivec2(2, 2));
            }
        }

        if (uMipMapReduceMode == 2) {
            oOutputValue /= sampleCounter;
        }

    }

    // We only use the red channel
    imageStore(uOut, storePos, vec4(oOutputValue, 0.0, 0.0, 0.0));
}
)";
