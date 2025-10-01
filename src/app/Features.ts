export interface Attachment {
  vertices: Float32Array;
  depths: Float32Array;
  indices: Uint16Array;
  uvs: Float32Array;
  normals: Float32Array;
  texture: WebGLTexture | null;
  anchorIndex: number; //corresponding vertex index in blob
  offset: [number, number, number];
}

function makeHemisphere(radius: number, latSegments: number, lonSegments: number, offsetZ = 0) {
  const vertices: number[] = [];
  const depths: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let lat = 0; lat <= latSegments; lat++) {
    const theta = (lat / latSegments) * (Math.PI / 2); // 0=top, PI/2=equator
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= lonSegments; lon++) {
      const phi = (lon / lonSegments) * Math.PI * 2;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = radius * sinTheta * cosPhi;
      const y = radius * sinTheta * sinPhi;
      const z = radius * cosTheta + offsetZ;

      vertices.push(x, y);
      depths.push(z);

      // normals relative to sphere center
      const nx = sinTheta * cosPhi;
      const ny = sinTheta * sinPhi;
      const nz = cosTheta;
      normals.push(nx, ny, nz);

      const u = 0.5 + 0.5 * sinTheta * cosPhi;
      const v = 0.5 + 0.5 * sinTheta * sinPhi;
      uvs.push(u, v);
    }
  }

  for (let lat = 0; lat < latSegments; lat++) {
    for (let lon = 0; lon < lonSegments; lon++) {
      const first = lat * (lonSegments + 1) + lon;
      const second = first + lonSegments + 1;
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return { vertices, normals, depths, uvs, indices };
}

function createEyeTexture(gl: WebGLRenderingContext, size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size;
  const cy = size;

  // eyeball
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(cx/2, cy/2, size, 0, Math.PI * 2);
  ctx.fill();

  // iris
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(cx/2 + 15, cy/2, size / 6, 0, Math.PI * 2);
  ctx.fill();

  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return tex;
}

export function makeEye(
  gl: WebGLRenderingContext,
  anchorIndex: number,
  offset: [number, number, number] = [0, 0, 0],
  eyeballRadius = 20,
  irisRadius = 6,
  latSegments = 16,
  lonSegments = 32
): Attachment {
  const eyeball = makeHemisphere(eyeballRadius, latSegments, lonSegments);

  const irisOffsetZ = eyeballRadius - irisRadius * 0.6;
  const iris = makeHemisphere(irisRadius, Math.floor(latSegments / 2), Math.floor(lonSegments / 2), irisOffsetZ);

  // merge iris into eyeball
  const vertexOffset = eyeball.vertices.length / 3;
  const vertices = [...eyeball.vertices, ...iris.vertices];
  const depths = [...eyeball.depths, ...iris.depths];
  const normals = [...eyeball.normals, ...iris.normals];
  const uvs = [...eyeball.uvs, ...iris.uvs];
  const indices = [...eyeball.indices, ...iris.indices.map(i => i + vertexOffset)];

  const texture = createEyeTexture(gl);

  return {
    vertices: new Float32Array(vertices),
    depths: new Float32Array(depths),
    indices: new Uint16Array(indices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    texture,
    anchorIndex,
    offset
  };
}
