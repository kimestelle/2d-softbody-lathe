export const vertexShaderSrc = `
attribute vec2 a_pos;      // pixel space
attribute vec3 a_nor;
attribute vec2 a_uv;
attribute float a_depth;

uniform vec2 u_resolution;
uniform float u_pointSize;

varying vec2 v_uv;
varying vec3 v_nor;
varying vec3 v_pos;

void main() {
  // normalize a_pos into [-1,1] object space
  vec2 normXY = (a_pos / u_resolution) * 2.0 - 1.0;
  vec3 objPos = vec3(normXY, a_depth);
  v_pos = objPos;

  // clip-space
  gl_Position = vec4(normXY * vec2(1.0, -1.0), 0.0, 1.0);
  gl_PointSize = u_pointSize;

  v_uv = vec2(a_uv.x, 1.0 - a_uv.y);
  v_nor = normalize(a_nor);
}

`;

export const fragmentShaderSrc = `
precision mediump float;

uniform vec3 u_lightPos;
uniform vec3 u_viewPos;
uniform float u_wireframeMode;

uniform sampler2D u_texture;

varying vec2 v_uv;
varying vec3 v_nor;
varying vec3 v_pos;

void main() {
    // vectors
    vec3 N = normalize(v_nor);
    vec3 L = normalize(u_lightPos - v_pos);
    vec3 V = normalize(u_viewPos - v_pos);
    vec3 R = reflect(-L, N);

    // albedo
    vec3 albedo = texture2D(u_texture, v_uv).rgb;

    float spec = pow(max(dot(R, V), 0.0), 32.0);
    vec3 specular = vec3(1.0) * spec * 0.4;

    // rim
    float rimAngle = (1.0 - dot(N, V)) * 0.5;
    rimAngle = smoothstep(1.0, 0.2, rimAngle); 

    vec3 rimColor = (vec3(0.7, 0.7, 0.7) + N) * rimAngle;

    vec3 finalColor = albedo + specular + rimColor + u_wireframeMode;

    float alpha = clamp(rimAngle * 0.4 + spec * 0.18, 0.05, 0.95);

    gl_FragColor = vec4(finalColor, max(alpha, u_wireframeMode));
}

`;
