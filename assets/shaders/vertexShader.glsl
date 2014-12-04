precision mediump float;

attribute vec3 a_pos;

uniform float u_time;
uniform float u_renderToCanvas;

varying vec3 v_pos;

void main(void) {
    v_pos = a_pos;

    if (u_renderToCanvas == 1.0) {
        gl_Position = vec4(a_pos, 1.0);
    } else {
        gl_PointSize = 50.0;
        gl_Position  = vec4(
            a_pos.x + 0.5 * sin(u_time),
            a_pos.y + 0.5 * cos(u_time),
            0.0,
            1.0
        );
    }
}