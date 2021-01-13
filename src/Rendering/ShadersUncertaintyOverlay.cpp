
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
    shared float sumDifference[512];

    shared uint counterNumPixels = 0;
    
    //Define layout to for computation
    //layout (local_size_x = SIZEX, local_size_y = SIZEY, local_size_z = SIZEZ) in;
    layout( local_size_variable ) in;

    void main() {
        //Some variables and indexes
        uint sizeOfGroup = gl_NumWorkGroups.x * gl_NumWorkGroups.y;
        uint groupIdx = gl_WorkGroupID.x + gl_WorkGroupID.y * gl_NumWorkGroups.x;

        //Initialze shared memory variables (only one invocation is allowed to do that)
        if(gl_LocalInvocationIndex == 0 && groupIdx == 0)
        {
            counterNumPixels = 0;
        }
        memoryBarrierShared(); 
    
        //Each thread loops over a pixel line (y and z do not change) and calculate the min,max and avergae per line
        //in the 3D domain and stores it into a shared memory buffer
        maxValue[gl_LocalInvocationIndex]       = -1;
        minValue[gl_LocalInvocationIndex]       =  1;
        average[gl_LocalInvocationIndex]        =  0;
        sumDifference[gl_LocalInvocationIndex]  =  0;
        uint  counterPerPixel                   =  0; 
        
        for (uint texelZIndex = 0; texelZIndex < uSizeTexZ; texelZIndex++)
        {
            float texValue = texelFetch(uSimBuffer, ivec3(gl_GlobalInvocationID.x, gl_GlobalInvocationID.y,texelZIndex ),0).r;
            
            //Difference per pixel line
            if(texelZIndex > 0)
            {
                float prevValue = texelFetch(uSimBuffer, ivec3(gl_GlobalInvocationID.x, gl_GlobalInvocationID.y,texelZIndex - 1),0).r;
                sumDifference[gl_LocalInvocationIndex] += abs(prevValue - texValue);
            }

            //Ignore emty pixels (noData)
            if(texValue > 0)
            {
                //Max value per line
                maxValue[gl_LocalInvocationIndex] = max(texValue, maxValue[gl_LocalInvocationIndex]);
                
                //Min value per line
                minValue[gl_LocalInvocationIndex] = min(texValue, minValue[gl_LocalInvocationIndex]);

                //Avg value per line
                average[gl_LocalInvocationIndex] += texValue;
                
                //Store how many texels contribute to the avg
                counterPerPixel++;
            }
        }
        //Compute local per pixel avg
        if(counterPerPixel > 0)
        {
            average[gl_LocalInvocationIndex] /= counterPerPixel;
            atomicAdd(counterNumPixels, 1);
        }

        //Wait for shared memory writes to finish
        groupMemoryBarrier();

        //Now compute the min, maximum and average values per group (so only one thread per group)
        if(gl_LocalInvocationIndex == 0)
        {
            int lineMaxID    = 0;
            int lineMinID    = 0;
            int lineAvgMaxID = 0;
            int lineAvgMinID = 0;
            float avgValue          = average[gl_LocalInvocationIndex];
            float avgDiffValue      = sumDifference[gl_LocalInvocationIndex];
            int lineDiffMaxID       = 0;
            int lineDiffMinID       = 0;

            for (int idInShared = 1; idInShared < sizeOfGroup; idInShared++) 
            { 
                if(maxValue[idInShared] > maxValue[lineMaxID]) 
                    lineMaxID = idInShared;
                if(minValue[idInShared] < minValue[lineMinID])
                    lineMinID = idInShared;
                if(average[idInShared] > average[lineAvgMaxID]) 
                    lineAvgMaxID = idInShared;
                if(average[idInShared] < average[lineAvgMinID])
                    lineAvgMinID = idInShared;
                if(sumDifference[idInShared] > sumDifference[lineDiffMaxID]) 
                    lineDiffMaxID = idInShared;
                if(sumDifference[idInShared] < sumDifference[lineDiffMinID])
                    lineDiffMinID = idInShared;
                
                //Avg's per group
                avgValue += average[idInShared];
                avgDiffValue += sumDifference[idInShared];
            }
            position[groupIdx] = maxValue[lineMaxID];
            position[sizeOfGroup + groupIdx] = minValue[lineMinID];
            position[2 * sizeOfGroup + groupIdx] = avgValue / counterNumPixels;
            position[3 * sizeOfGroup + groupIdx] = average[lineAvgMinID];
            position[4 * sizeOfGroup + groupIdx] = average[lineAvgMaxID];
            position[5 * sizeOfGroup + groupIdx] = avgDiffValue / sizeOfGroup;
            position[6 * sizeOfGroup + groupIdx] = sumDifference[lineDiffMinID];
            position[7 * sizeOfGroup + groupIdx] = sumDifference[lineDiffMaxID];
        }

        //Now the global results (only one thread)
        if(gl_LocalInvocationIndex == 0 && groupIdx == 0)
        {
            float reducedMax     = -10000;
            float reducedMin     = 10000;
            float reducedAvg     = 0;
            float reducedAvgMin  = 10000;
            float reducedAvgMax  = -10000;
            float reducedDiff    = 0;
            float reducedDiffMin =  10000;
            float reducedDiffMax = -10000;
            
            uint  counterGrp    = 0; 
            for (int x = 0; x < sizeOfGroup; x++) 
            {
                reducedMax = max(reducedMax, position[x]);
                reducedMin = min(reducedMin, position[sizeOfGroup + x]);

                float tmp = position[2 * sizeOfGroup + x];
                if(tmp > 0)
                {
                    reducedAvg += position[2 * sizeOfGroup + x];
                    counterGrp++;
                }

                reducedAvgMin = min(reducedAvgMin, position[3 * sizeOfGroup + x]);
                reducedAvgMax = max(reducedAvgMax, position[4 * sizeOfGroup + x]);
                
                reducedDiff += position[5 * sizeOfGroup + x];    
                reducedDiffMin = min(reducedDiffMin, position[6 * sizeOfGroup + x]);
                reducedDiffMax = max(reducedDiffMax, position[7 * sizeOfGroup + x]); 
            }
            position[0] = reducedMin;
            position[1] = reducedMax;
            position[2] = reducedAvg / counterGrp;
            position[3] = reducedAvgMin;
            position[4] = reducedAvgMax;
            position[5] = reducedDiff / sizeOfGroup;
            position[6] = reducedDiffMin;
            position[7] = reducedDiffMax;
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

    uniform sampler1D           uTransferFunction;
    uniform sampler1D           uTransferFunctionUncertainty;

    //Input SSBO
    layout(std430, binding=3) coherent buffer Pos{
        float position[];
    };

    uniform mat4          uMatInvMVP;
    uniform dmat4         uMatInvMV;
    uniform mat4          uMatInvP;
    uniform mat4          uMatMV;

    uniform float         uFarClip;
    uniform float         uOpacity = 1;
    uniform dvec4         uBounds;
    uniform int           uNumTextures;
    uniform int           uVisMode = 1;
    uniform vec3          uSunDirection;
    uniform vec3          uRadii;

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
        double s     = 0.0;
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

                float average         = 0;
                float variance        = 0;
                float absDifference   = 0;

                for(int layer = 0; layer < uNumTextures; ++layer)
                {
                    float texValue = texture(uSimBuffer, vec3(newCoords, layer)).r;
                    average += texValue;

                    if(layer > 0)
                    {
                        float prevValue = texture(uSimBuffer, vec3(newCoords, layer - 1)).r;
                        absDifference += abs(prevValue - texValue);
                    }
                }
                average         /= uNumTextures;

                for(int layer = 1; layer < uNumTextures; ++layer)
                {
                    float texValue = texture(uSimBuffer, vec3(newCoords, layer)).r;
                    variance      += pow(texValue - average, 2); 
                }

                float stdDev = sqrt(variance / (uNumTextures - 1));

                if(average < 0)
                    discard;

                //Normalize scalar and difference
                float normSimValue      = (average  - position[3]) / (position[4] - position[3]);
                float normDiffValue     = (absDifference  - position[6]) / (position[7] - position[6]);
                
                vec4 colorScalar = texture(uTransferFunction, normSimValue);
                vec4 colorDifference = texture(uTransferFunctionUncertainty, normDiffValue);
                vec4 colorVariance = texture(uTransferFunctionUncertainty, 2*stdDev);
                
                vec4 color;
                switch (uVisMode) {
                    case 1: color = colorScalar; break;
                    case 2: color = colorVariance; break;
                    case 3: color = colorDifference; break;
                    case 4: color = colorScalar * colorVariance; break;
                    case 5: color = colorScalar * colorDifference; break;
                }

                color.a *= uOpacity;
      
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
                vec4 result = color;
               
                FragColor          = result;
            }
            else
                discard;
        }
    }
)";
