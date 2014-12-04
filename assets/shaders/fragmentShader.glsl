precision mediump float;

uniform float u_renderToCanvas;
uniform sampler2D u_textures[4];

varying vec3 v_pos;

void main(void) {
    if (u_renderToCanvas == 1.0) {
        gl_FragColor = 
        (texture2D(u_textures[0], (v_pos.xy + 1.0) * 0.5) * 0.7) + 
        (texture2D(u_textures[1], (v_pos.xy + 1.0) * 0.5) * 0.2) + 
        (texture2D(u_textures[2], (v_pos.xy + 1.0) * 0.5) * 0.2) + 
        (texture2D(u_textures[3], (v_pos.xy + 1.0) * 0.5) * 0.2);
    } else {
        gl_FragColor = vec4(1.0);
    }
}