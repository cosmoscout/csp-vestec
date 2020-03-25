
#include "UncertaintyRenderer.hpp"
#include <string>

const std::string UncertaintyOverlayRenderer::COMPUTE = R"(
    #version 450
    #extension GL_ARB_compute_variable_group_size : enable

    //Input texture data (read only)
    uniform  sampler2DArray    uSimBuffer;
    //layout (binding=3, r32f) uniform image2DArray uSimBuffer;
    uniform int                uSizeTexX;
    uniform int                uSizeTexY;
    uniform int                uSizeTexZ;

    //Output SSBO
    layout(std430, binding=1) coherent buffer Pos{
        float position[];
    };

    //Used shared memory for local averages
    shared float average[512];
    shared float maxValue[512];
    shared float minValue[512];
    
    //Define layout to for computation
    //layout (local_size_x = SIZEX, local_size_y = SIZEY, local_size_z = SIZEZ) in;
    layout( local_size_variable ) in;

    void main() {
        uint sizeOfGroup = gl_NumWorkGroups.x * gl_NumWorkGroups.y;
        uint groupIdx = gl_WorkGroupID.x + gl_WorkGroupID.y * gl_NumWorkGroups.x;
       
        //Each thread loops over a pixel line (y and z do not change) and calculate the min,max and avergae per line
        //in the 3D domain and stores it into a shared memory buffer
        maxValue[gl_LocalInvocationIndex] = -1;
        minValue[gl_LocalInvocationIndex] =  1;
        average[gl_LocalInvocationIndex] =  0;
        for (uint texelZIndex = 0; texelZIndex < uSizeTexZ; texelZIndex++)
        {
            float texValue = texelFetch(uSimBuffer, ivec3(gl_GlobalInvocationID.x, gl_GlobalInvocationID.y,texelZIndex ),0).r;
            
            //Ignore emty pixels (noData)
            if(texValue > 0)
            {
                maxValue[gl_LocalInvocationIndex] = max(texValue, maxValue[gl_LocalInvocationIndex]);
                minValue[gl_LocalInvocationIndex] = min(texValue, minValue[gl_LocalInvocationIndex]);
            }
        }

        //Wait for shared memory writes to finish
        groupMemoryBarrier();

        //Now compute the min, maximum and average values per group (so only one thread per group)
        if(gl_LocalInvocationIndex == 0)
        {
            int lineMaxID = 0;
            int lineMinID = 0;
            for (int idInShared = 1; idInShared < sizeOfGroup; idInShared++) 
            { 
                if(maxValue[idInShared] > maxValue[lineMaxID]) 
                    lineMaxID = idInShared;
                if(minValue[idInShared] < minValue[lineMinID])
                    lineMinID = idInShared;
            }
            position[groupIdx] = maxValue[lineMaxID];
            position[sizeOfGroup + groupIdx] = minValue[lineMinID];
        }

        //Now the global results (only one thread)
        if(gl_LocalInvocationIndex == 0 && groupIdx == 0)
        {
            float reducedMax = -10000;
            float reducedMin = 10000;
            for (int x = 0; x < sizeOfGroup; x++) 
            {
                reducedMax = max(reducedMax, position[x]);
                reducedMin = min(reducedMin, position[sizeOfGroup + x]);
            }
            position[0] = reducedMin;
            position[1] = reducedMax;
        }
        
    }
    
)";

const std::string UncertaintyOverlayRenderer::SURFACE_GEOM = R"(
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

const std::string UncertaintyOverlayRenderer::SURFACE_VERT = R"(
    #version 330 core

    void main()
    {
    }
)";

const std::string UncertaintyOverlayRenderer::SURFACE_FRAG = R"(
    #version 450
    out vec4 FragColor;

    uniform sampler2DRect       uDepthBuffer;
    uniform sampler2DArray      uSimBuffer;

    uniform mat4          uMatInvMVP;
    uniform dmat4         uMatInvMV;
    uniform mat4          uMatInvP;
    uniform mat4          uMatMV;

    uniform float         uFarClip;
    uniform float         uOpacity = 1;
    uniform dvec4         uBounds;
    uniform vec2          uRange;
    uniform int           uNumTextures;

    uniform vec3          uSunDirection;

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
    vec3 heat(float v) {
        float value = 1.0-v;
        return (0.5+0.5*smoothstep(0.0, 0.1, value))*vec3(smoothstep(0.5, 0.3, value), value < 0.3 ?
         smoothstep(0.0, 0.3, value) :
         smoothstep(1.0, 0.6, value),
         smoothstep(0.4, 0.6, value)
        );
    }

    //Calculate the color for the uncertainty
    vec3 heatUncertainty(float v) {
        float value = 1.0-v;
        vec3 colorWhite = vec3(1,1,1);
        return (colorWhite * value);
    }


    void main()
    {     
        float fDepth = GetDepth();
        if (fDepth == 1000000.0) 
        {
            discard;
        }else{
            dvec3 worldPos  = GetPosition();
            dvec2 lnglat    = GetLngLat(worldPos);

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

                float average = 0;
                float minV = 1000;
                float maxV = -9999;

                for(int layer = 0; layer < uNumTextures; ++layer)
                {
                    float texValue = texture(uSimBuffer, vec3(newCoords, layer)).r;
                    minV = min(minV, texValue);
                    maxV = max(maxV, texValue);
                    average += texValue;
                }
                average /= uNumTextures;


    
                //Texture lookup and color mapping
                //float normSimValue  = (average - minV) / (maxV - minV);
                float normSimValue  = (average  - uRange.x) / (uRange.y - uRange.x);
                
                vec4 color = vec4(heat(normSimValue), uOpacity);
                
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
               
                FragColor          = vec4(result, uOpacity);
            }
            else
                discard;
        }
    }
)";
