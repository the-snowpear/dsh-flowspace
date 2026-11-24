import { sampleWirePath } from "./sceneWires.ts";

const VERTEX = `#version 300 es
in vec4 vertex;
in vec3 animation;
in vec4 lightColor;
in vec4 glowColor;
uniform vec4 camera;
uniform vec2 viewport;
out vec2 arc;
flat out vec3 timing;
flat out vec4 bright;
flat out vec4 halo;
void main() {
  vec2 screen = (vertex.xy * camera.z + camera.xy) * camera.w;
  vec2 clip = screen / (viewport * camera.w) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  arc = vertex.zw;
  timing = animation;
  bright = lightColor;
  halo = glowColor;
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 arc;
flat in vec3 timing;
flat in vec4 bright;
flat in vec4 halo;
uniform float clock;
out vec4 pixel;
float dash(float phase, float radius, float span, float period) {
  float start = arc.x - mod(arc.x + phase, period);
  float near = 1000.0;
  for (int i = -1; i <= 1; ++i) {
    float begin = start + float(i) * period;
    float left = max(0.0, begin);
    float right = min(timing.y, begin + span);
    if (left <= right) near = min(near, max(left - arc.x, arc.x - right));
  }
  float distanceToEdge = length(vec2(max(0.0, near), arc.y)) - radius;
  float aa = max(0.5 * fwidth(arc.y), 0.001);
  return 1.0 - smoothstep(-aa, aa, distanceToEdge);
}
void main() {
  float t = clock - timing.x;
  float lightAlpha = 0.0;
  float glowAlpha = 0.0;
  if (timing.z < 0.5) {
    float offset = -t * (200.0 / 1.5);
    glowAlpha = dash(offset + 10.0, 3.5, 46.0, 200.0) * halo.a;
    lightAlpha = dash(offset, 1.05, 26.0, 200.0) * bright.a;
  } else if (timing.z < 2.5) {
    float period = timing.z < 1.5 ? 14.0 : 22.0;
    float speed = timing.z < 1.5 ? 28.0 / 1.1 : 44.0 / 2.4;
    lightAlpha = dash(-t * speed, 1.2, 0.01, period) * bright.a;
  } else if (timing.z < 3.5) {
    float cap = max(-arc.x, arc.x - timing.y);
    float distanceToEdge = length(vec2(max(0.0, cap), arc.y)) - 3.0;
    float aa = max(0.5 * fwidth(arc.y), 0.001);
    float glow = 1.0 - smoothstep(-aa, aa, distanceToEdge);
    glowAlpha = glow * halo.a * (0.7 + 0.3 * cos(t * 6.283185 / 2.6));
  } else {
    float lifetime = timing.z < 4.5 ? 1.8 : 1.4;
    float direction = timing.z < 4.5 ? 1.0 : -1.0;
    float fade = smoothstep(0.0, 0.12, t / lifetime) * (1.0 - smoothstep(0.88, 1.0, t / lifetime));
    lightAlpha = dash(direction * t * 200.0 / lifetime, 0.8, 26.0, 200.0) * bright.a * fade;
  }
  pixel = vec4(bright.rgb * lightAlpha + halo.rgb * glowAlpha * (1.0 - lightAlpha),
    lightAlpha + glowAlpha * (1.0 - lightAlpha));
}`;

export interface WireFlowMesh {
  /** x, y, arc distance, signed width, phase, total length, style kind. */
  strip: Float32Array;
}

export interface ColoredWireMesh {
  mesh: WireFlowMesh;
  light: number[];
  glow: number[];
}

/** World-space geometry is independent of both the DOM and the viewport camera. */
export function wireMeshFromPath(path: string, phase: number, styleKind: number): WireFlowMesh | undefined {
  const points = sampleWirePath(path);
  const length = points.at(-1)?.distance ?? 0;
  if (!Number.isFinite(length) || length <= 0 || points.length < 2) return;
  const margin = 8;
  const last = points.length - 1;
  const strip = new Float32Array((points.length + 2) * 14);
  for (let index = -1; index <= last + 1; index++) {
    const at = Math.max(0, Math.min(index, last));
    const current = points[at].point;
    let dx = 0, dy = 0;
    let inX = 0, inY = 0;
    if (at > 0) {
      const prev = points[at - 1].point;
      const len = Math.hypot(current.x - prev.x, current.y - prev.y);
      if (len > 0) { inX = (current.x - prev.x) / len; inY = (current.y - prev.y) / len; dx += inX; dy += inY; }
    }
    if (at < last) {
      const next = points[at + 1].point;
      const len = Math.hypot(next.x - current.x, next.y - current.y);
      if (len > 0) { dx += (next.x - current.x) / len; dy += (next.y - current.y) / len; }
    }
    const magnitude = Math.hypot(dx, dy);
    if (magnitude > 1e-6) { dx /= magnitude; dy /= magnitude; }
    else if (inX || inY) { dx = inX; dy = inY; }
    else { dx = 1; dy = 0; }
    const cap = index < 0 ? -margin : index > last ? margin : 0;
    const { point, distance } = points[at];
    const x = point.x + dx * cap, y = point.y + dy * cap;
    const arc = distance + cap;
    strip.set([
      x - dy * margin, y + dx * margin, arc, margin, phase, length, styleKind,
      x + dy * margin, y - dx * margin, arc, -margin, phase, length, styleKind,
    ], (index + 1) * 14);
  }
  return { strip };
}

export function wireFlowProgram(gl: WebGL2RenderingContext) {
  if (gl.isContextLost()) throw new Error("The WebGL2 context is lost.");
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to allocate wire shader program.");
  for (const [kind, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
    const shader = gl.createShader(kind);
    if (!shader) {
      gl.deleteProgram(program);
      throw new Error("Unable to allocate wire shader.");
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`The wire shaders could not be linked. ${message}`);
  }
  const camera = gl.getUniformLocation(program, "camera");
  const viewport = gl.getUniformLocation(program, "viewport");
  const clock = gl.getUniformLocation(program, "clock");
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  if (!buffer) {
    gl.deleteProgram(program);
    throw new Error("Unable to allocate wire vertex buffer.");
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  for (const [name, size, offset] of [["vertex", 4, 0], ["animation", 3, 16], ["lightColor", 4, 28], ["glowColor", 4, 44]] as const) {
    const location = gl.getAttribLocation(program, name);
    if (location < 0) continue;
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 60, offset);
  }
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  let count = 0;
  return {
    upload(meshes: ColoredWireMesh[]) {
      // Degenerate vertices join strips into a single draw call.
      const content = new Float32Array(meshes.reduce((size, { mesh }) => size + (mesh.strip.length / 7 + 2) * 15, 0));
      let at = 0;
      for (const { mesh: { strip }, light, glow } of meshes) {
        const start = at;
        at += 30;
        for (let i = 0; i < strip.length; i += 7) {
          content.set(strip.subarray(i, i + 7), at);
          content.set(light, at + 7);
          content.set(glow, at + 11);
          at += 15;
        }
        content.set(content.subarray(start ? start - 15 : start + 30, start ? start : start + 45), start);
        content.set(content.subarray(start + 30, start + 45), start + 15);
      }
      gl.bufferData(gl.ARRAY_BUFFER, content, gl.STATIC_DRAW);
      count = content.length / 15;
    },
    clear(width: number, height: number, view: { x: number; y: number; zoom: number }, dpr: number) {
      gl.viewport(0, 0, Math.round(width * dpr), Math.round(height * dpr));
      gl.uniform4f(camera, view.x, view.y, view.zoom, dpr);
      gl.uniform2f(viewport, width, height);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    draw(seconds: number) {
      gl.uniform1f(clock, seconds);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, count);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
