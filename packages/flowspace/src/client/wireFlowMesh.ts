import type { Box } from "./geometry.ts";

const VERTEX = `#version 300 es
in vec4 vertex;
in vec2 animation;
uniform vec4 area;
out vec2 arc;
flat out vec2 timing;
void main() {
  vec2 clip = 2.0 * (vertex.xy - area.xy) / area.zw - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  arc = vertex.zw;
  timing = animation;
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 arc;
flat in vec2 timing;
uniform float clock;
uniform vec4 bright;
uniform vec4 halo;
out vec4 pixel;
float dash(float phase, float radius, float span) {
  float start = arc.x - mod(arc.x + phase, 200.0);
  float near = 1000.0;
  for (int period = -1; period <= 1; ++period) {
    float begin = start + float(period) * 200.0;
    float left = max(0.0, begin);
    float right = min(timing.y, begin + span);
    if (left <= right) near = min(near, max(left - arc.x, arc.x - right));
  }
  float distanceToEdge = length(vec2(max(0.0, near), arc.y)) - radius;
  float aa = max(0.5 * fwidth(arc.y), 0.001);
  return 1.0 - smoothstep(-aa, aa, distanceToEdge);
}
void main() {
  float offset = 200.0 * (1.0 - fract(clock - timing.x));
  float glowAlpha = dash(offset + 10.0, 3.5, 46.0) * halo.a;
  float lightAlpha = dash(offset, 1.05, 26.0) * bright.a;
  pixel = vec4(bright.rgb * lightAlpha + halo.rgb * glowAlpha * (1.0 - lightAlpha),
    lightAlpha + glowAlpha * (1.0 - lightAlpha));
}`;

export interface WireFlowMesh {
  strip: Float32Array;
}

/** The same SVG arc length drives both renderers, including the phase around bends. */
export function wireMesh(path: SVGPathElement, phase: number): WireFlowMesh | undefined {
  const length = path.getTotalLength();
  if (!length) return;
  const margin = 8;
  const first = path.getPointAtLength(0);
  const points = [{ point: first, distance: 0 }];
  function split(a: DOMPoint, b: DOMPoint, start: number, end: number) {
    if (end - start > 2 && end - start - Math.hypot(b.x - a.x, b.y - a.y) > 0.025) {
      const middle = (start + end) / 2;
      const p = path.getPointAtLength(middle);
      split(a, p, start, middle);
      split(p, b, middle, end);
    } else {
      points.push({ point: b, distance: end });
    }
  }
  split(first, path.getPointAtLength(length), 0, length);
  const last = points.length - 1;
  const strip = new Float32Array((points.length + 2) * 12);
  for (let index = -1; index <= last + 1; index++) {
    const at = Math.max(0, Math.min(index, last));
    const before = points[Math.max(0, at - 1)].point, after = points[Math.min(last, at + 1)].point;
    const magnitude = Math.hypot(after.x - before.x, after.y - before.y) || 1;
    const dx = (after.x - before.x) / magnitude, dy = (after.y - before.y) / magnitude;
    const cap = index < 0 ? -margin : index > last ? margin : 0;
    const { point, distance } = points[at];
    const x = point.x + dx * cap, y = point.y + dy * cap;
    const arc = distance + cap;
    strip.set([
      x - dy * margin, y + dx * margin, arc, margin, phase, length,
      x + dy * margin, y - dx * margin, arc, -margin, phase, length,
    ], (index + 1) * 12);
  }
  return { strip };
}

export function wireFlowProgram(gl: WebGL2RenderingContext) {
  const program = gl.createProgram()!;
  for (const [kind, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
    const shader = gl.createShader(kind)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    throw new Error("The wire flow shaders could not be linked.");
  }
  const vertex = gl.getAttribLocation(program, "vertex");
  const animation = gl.getAttribLocation(program, "animation");
  const area = gl.getUniformLocation(program, "area");
  const clock = gl.getUniformLocation(program, "clock");
  const bright = gl.getUniformLocation(program, "bright");
  const halo = gl.getUniformLocation(program, "halo");
  gl.useProgram(program);
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(vertex);
  gl.vertexAttribPointer(vertex, 4, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(animation);
  gl.vertexAttribPointer(animation, 2, gl.FLOAT, false, 24, 16);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  let count = 0;
  return {
    upload(meshes: WireFlowMesh[]) {
      // Degenerate vertices connect the strips without drawing between wires.
      const content = new Float32Array(meshes.reduce((size, { strip }) => size + strip.length + 12, 0));
      let at = 0;
      for (const { strip } of meshes) {
        if (at) content.set(content.subarray(at - 6, at), at);
        else content.set(strip.subarray(0, 6), at);
        content.set(strip.subarray(0, 6), at + 6);
        content.set(strip, at + 12);
        at += strip.length + 12;
      }
      gl.bufferData(gl.ARRAY_BUFFER, content, gl.STATIC_DRAW);
      count = content.length / 6;
    },
    clear(width: number, height: number, box: Box, lightColor: number[], glowColor: number[]) {
      gl.viewport(0, 0, width, height);
      gl.uniform4f(area, box.x, box.y, box.w, box.h);
      gl.uniform4fv(bright, lightColor);
      gl.uniform4fv(halo, glowColor);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    draw(phase: number) {
      gl.uniform1f(clock, phase);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, count);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
