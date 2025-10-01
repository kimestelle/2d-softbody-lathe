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

function rotateY(point: [number, number, number], angle: number): [number, number, number] {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const [x, y, z] = point;
  return [
    x * cosA - z * sinA,
    y,
    x * sinA + z * cosA
  ];
}

function makeHemisphere(radius: number, latSegments: number, lonSegments: number, offsetZ = 0) {
  const vertices: number[] = [];
  const depths: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let lat = 0; lat <= latSegments; lat++) {
    const theta = (lat / latSegments) * (Math.PI / 2);
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

  // const irisOffsetZ = eyeballRadius - irisRadius * 0.6;
  // const iris = makeHemisphere(irisRadius, Math.floor(latSegments / 2), Math.floor(lonSegments / 2), irisOffsetZ);

  // merge iris into eyeball
  // const vertexOffset = eyeball.vertices.length / 3;
  // const vertices = [...eyeball.vertices, ...iris.vertices];
  // const depths = [...eyeball.depths, ...iris.depths];
  // const normals = [...eyeball.normals, ...iris.normals];
  // const uvs = [...eyeball.uvs, ...iris.uvs];
  // const indices = [...eyeball.indices, ...iris.indices.map(i => i + vertexOffset)];

  //no iris
  const vertices = eyeball.vertices;
  const depths = eyeball.depths;
  const normals = eyeball.normals;
  const uvs = eyeball.uvs;
  const indices = eyeball.indices;

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

function createNoseTexture(gl: WebGLRenderingContext, size = 32) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "green";
  ctx.fillRect(0, 0, size, size);

  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return tex;
}

export function makeNose(
  gl: WebGLRenderingContext,
  anchorIndex: number,
  offset: [number, number, number] = [0, 0, 0],
  radius = 6,
  height = 8,
  radialSegments = 16,
  heightSegments = 4
): Attachment {
  const cone = makeHemisphere(radius, heightSegments, radialSegments, height - radius);
  const texture = createNoseTexture(gl);

  return {
    vertices: new Float32Array(cone.vertices),
    depths: new Float32Array(cone.depths),
    indices: new Uint16Array(cone.indices),
    normals: new Float32Array(cone.normals),
    uvs: new Float32Array(cone.uvs),
    texture,
    anchorIndex,
    offset
  };
}

function makeHalfTorus(outerRadius: number, tubeRadius: number, radialSegments: number, tubularSegments: number) {
  const vertices: number[] = [];
  const depths: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= radialSegments; j++) {
    const v = (j / radialSegments) * Math.PI * 2;
    const cosV = Math.cos(v);
    const sinV = Math.sin(v);

    for (let i = 0; i <= tubularSegments; i++) {
      const u = (i / tubularSegments) * Math.PI;
      const cosU = Math.cos(u);
      const sinU = Math.sin(u);

      // torus parametric surface
      const x = (outerRadius + tubeRadius * cosV) * cosU;
      const y = (outerRadius + tubeRadius * cosV) * sinU * 0.8;
      const z = tubeRadius * sinV;

      const r = rotateY([x, y, z], Math.PI / 4);

      vertices.push(r[0], r[1]);
      depths.push(r[2]);

      // normal
      const nx = cosU * cosV;
      const ny = sinU * cosV;
      const nz = sinV;
      normals.push(nx, ny, nz);

      uvs.push(i / tubularSegments, j / radialSegments);
    }
  }

  for (let j = 0; j < radialSegments; j++) {
    for (let i = 0; i < tubularSegments; i++) {
      const a = j * (tubularSegments + 1) + i;
      const b = a + tubularSegments + 1;

      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  return { vertices, normals, depths, uvs, indices };
}

function createMouthTexture(gl: WebGLRenderingContext, size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "red";
  ctx.fillRect(0, 0, size, size);

  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return tex;
}

export function makeMouth(
  gl: WebGLRenderingContext,
  anchorIndex: number,
  offset: [number, number, number] = [0, 0, 0],
  outerRadius = 15,
  tubeRadius = 4,
  radialSegments = 16,
  tubularSegments = 32
): Attachment {
  const torus = makeHalfTorus(outerRadius, tubeRadius, radialSegments, tubularSegments);
  const texture = createMouthTexture(gl);

  return {
    vertices: new Float32Array(torus.vertices),
    depths: new Float32Array(torus.depths),
    indices: new Uint16Array(torus.indices),
    normals: new Float32Array(torus.normals),
    uvs: new Float32Array(torus.uvs),
    texture,
    anchorIndex,
    offset
  };
}

