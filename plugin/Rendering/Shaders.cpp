
#include <string>
#include "TextureOverlayRenderer.hpp"

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

    in vec2 texcoord;

    uniform sampler2D ourTexture;

    void main()
    {
        float value  = texture(ourTexture, texcoord).r;
        FragColor = vec4(value / 5, 0.0, 0.0, 1.0);
        //FragColor = vec4(texcoord.x, texcoord.y, 0.0, 1.0);
    }
)";
