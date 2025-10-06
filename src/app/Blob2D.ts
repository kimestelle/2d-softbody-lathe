import { Particle } from "./types";
import { vertexShaderSrc, fragmentShaderSrc } from "./shaders";
import { Attachment, makeEye, makeNose, makeMouth } from "./features";

export class Blob2D {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  particles: Particle[] = [];
  restPositions: { x: number; y: number }[] = [];
  indices: number[] = [];
  mouseX = 0;
  mouseY = 0;
  isDown = false;

  attachments: Attachment[] = [];

  texture: WebGLTexture | null = null;

  program: WebGLProgram | null = null;
  a_pos: number = -1;
  a_depth: number = -1;
  a_nor: number = -1;
  u_resolution: WebGLUniformLocation | null = null;
  u_lightPos: WebGLUniformLocation | null = null;
  u_viewPos: WebGLUniformLocation | null = null;
  u_wireframeMode: number = 0;
  u_opacity: number = 0.0;
  u_offset: WebGLUniformLocation | null = null;
  u_isAttachment: number = -1;

  constructor(canvas: HTMLCanvasElement, pathData: string) {
    if (!canvas) throw new Error("Canvas element is required");
    this.canvas = canvas;
    const gl = canvas.getContext("webgl");
    if (!gl) throw new Error("WebGL not supported");
    this.gl = gl;

    this.initShaders();
    this.initParticles(pathData);
    console.log("initial particles:", this.particles.length);
    this.attachments.push(makeEye(this.gl, 1925, [-15, -10, 0]));
    this.attachments.push(makeEye(this.gl, 1932, [15, -10, 0]));
    this.attachments.push(makeNose(this.gl, 2035, [0, 0, -5]));
    this.attachments.push(makeMouth(this.gl, 2051, [0, 20, -10]));

    this.initMouse();
    this.initTouch();
    this.renderLoop();
  }

  private createShader(type: number, source: string) {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error("Shader compile failed: " + this.gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  private initShaders() {
    const gl = this.gl;
    const vs = this.createShader(gl.VERTEX_SHADER, vertexShaderSrc);
    const fs = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error("Program link failed: " + gl.getProgramInfoLog(program));
    }

    this.program = program;
    this.a_pos = gl.getAttribLocation(program, "a_pos");
    this.a_nor = gl.getAttribLocation(program, "a_nor");
    this.u_resolution = gl.getUniformLocation(program, "u_resolution")!;
    this.a_depth = gl.getAttribLocation(program, "a_depth");
  }


  updatePath(pathData: string) {
    console.log("updating path");
    this.initParticles(pathData);
  }

  private initParticles(pathData: string) { 
    const svgNS = "http://www.w3.org/2000/svg"; 
    const path = document.createElementNS(svgNS, "path"); 
    path.setAttribute("d", pathData); 
    const length = path.getTotalLength(); 
    const n = 100; const segments = 60; 
    this.particles = []; 
    this.restPositions = []; 
    const cx = this.canvas.width / 2; 

    for (let i = 0; i <= n; i++) { 
      const pt = path.getPointAtLength((i / n) * length); 
      const baseX = pt.x; 
      const baseY = pt.y; 

      const r = baseX - cx;
      let slope = 0;

      if (i > 0 && i < n) {
        const prev = path.getPointAtLength(((i - 1) / n) * length);
        const next = path.getPointAtLength(((i + 1) / n) * length);
        const rPrev = prev.x - cx;
        const rNext = next.x - cx;
        const dy = (next.y - prev.y) || 1.0;
        slope = (rNext - rPrev) / dy;
      }
      
      for (let j = 0; j <= segments; j++) { 
        const theta = (j / segments) * Math.PI * 2; 
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        const x = cx + r * cosTheta; 
        const y = baseY;
        const z = r * Math.sin(theta);

        const u = j / segments;
        const v = i / n; 

        this.particles.push({
          x, y: y, z,
          vx: 0, vy: 0, vz: 0,
          u, v,
          cosTheta, sinTheta, slope
        });

        this.restPositions.push({ x, y }); } } // regenerate indices with (segments+1) per row 
        this.indices = []; 
        for (let i = 0; i < n; i++) { 
          for (let j = 0; j < segments; j++) { 
            // note: < segments, not <= 
            const rowLen = segments + 1; 
            const p0 = i * rowLen + j; 
            const p1 = (i + 1) * rowLen + j; 
            const p2 = i * rowLen + (j + 1); 
            const p3 = (i + 1) * rowLen + (j + 1); 
            this.indices.push(p0, p1, p2); this.indices.push(p1, p3, p2); 
          } 
        } 
      }
  
  private computeNormals(): Float32Array {
    const nVerts = this.particles.length;
    const normals = new Float32Array(nVerts * 3);

    const idx = this.indices;
    for (let t = 0; t < idx.length; t += 3) {
      const i0 = idx[t], i1 = idx[t+1], i2 = idx[t+2];

      const p0 = this.particles[i0];
      const p1 = this.particles[i1];
      const p2 = this.particles[i2];

      const ux = p1.x - p0.x;
      const uy = p1.y - p0.y;
      const uz = p1.z - p0.z;

      const vx = p2.x - p0.x;
      const vy = p2.y - p0.y;
      const vz = p2.z - p0.z;
      // cross product
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;

      normals[i0*3 + 0] += nx;
      normals[i0*3 + 1] += ny;
      normals[i0*3 + 2] += nz;

      normals[i1*3 + 0] += nx;
      normals[i1*3 + 1] += ny;
      normals[i1*3 + 2] += nz;

      normals[i2*3 + 0] += nx;
      normals[i2*3 + 1] += ny;
      normals[i2*3 + 2] += nz;
    }

    for (let i = 0; i < nVerts; i++) {
      const ix = i*3;
      const nx = normals[ix+0], ny = normals[ix+1], nz = normals[ix+2];
      const len = Math.hypot(nx, ny, nz) || 1e-6;
      normals[ix+0] = nx / len;
      normals[ix+1] = ny / len;
      normals[ix+2] = nz / len;
    }

    return normals;
  }


  initTexture(canvas: HTMLCanvasElement) {
    const gl = this.gl;
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  updateTexture(canvas: HTMLCanvasElement) {
    if (!this.texture) this.initTexture(canvas);
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  }

  updateOpacity(value: number) {
    this.u_opacity = value;
  }

  updateWireframeMode(enabled: boolean) {
    this.u_wireframeMode = enabled ? 1 : 0;
  }

  private initMouse() {
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;
    });

    this.canvas.addEventListener("mousedown", () => (this.isDown = true));
    this.canvas.addEventListener("mouseup", () => (this.isDown = false));
  }

  private initTouch() {
    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const touch = e.touches[0];
      this.mouseX = (touch.clientX - rect.left) * scaleX;
      this.mouseY = (touch.clientY - rect.top) * scaleY;
    }, { passive: false });

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.isDown = true;
    }, { passive: false });

    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.isDown = false;
    }, { passive: false });
  }

  //update particles with physics and wall collisions
  private UpdateParticlesWithCollisions() {
    const springK = 0.05;
    const damping = 0.9;
    const interactionForce = 200;
    const radius = 150;
    const gravity = 1.2;
    const bounds = { xMin: 0, xMax: this.canvas.width, yMin: 0, yMax: this.canvas.height };

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const rest = this.restPositions[i];

      const dx = p.x - this.mouseX;
      const dy = p.y - this.mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        const force = (1 - dist / radius) * interactionForce;
        const dirX = dx / (dist || 1);
        const dirY = dy / (dist || 1);
        if (this.isDown) {
          p.vx += dirX * force * 0.01;
          p.vy += dirY * force * 0.01;
        }
      }

      p.vx += (rest.x - p.x) * springK;
      p.vy += (rest.y - p.y) * springK;
      p.vx *= damping;
      p.vy *= damping; // add gravity
      p.x += p.vx;
      p.y += p.vy;
      p.vy += gravity;

      // wall collisions
      if (p.x < bounds.xMin) {
        p.x = bounds.xMin;
        p.vx *= -0.5;
      } else if (p.x > bounds.xMax) {
        p.x = bounds.xMax;
        p.vx *= -0.5;
      }
      if (p.y < bounds.yMin) {
        p.y = bounds.yMin;
        p.vy *= -0.5;
      } else if (p.y > bounds.yMax) {
        p.y = bounds.yMax;
        p.vy *= -0.5;
      }
    }
  }

  private renderLoop = () => {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.UpdateParticlesWithCollisions();

    gl.useProgram(this.program);

    //position buffer
    const positions = this.particles.flatMap(p => [p.x, p.y]);
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(this.a_pos);
    gl.vertexAttribPointer(this.a_pos, 2, gl.FLOAT, false, 0, 0);

    //normals buffer
    const normals = this.computeNormals();
    const norBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, norBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.a_nor);
    gl.vertexAttribPointer(this.a_nor, 3, gl.FLOAT, false, 0, 0);

    //depth buffer
    const depths = this.particles.map(p => p.z);
    const depthBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, depthBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(depths), gl.STATIC_DRAW);

    const a_depth = gl.getAttribLocation(this.program!, "a_depth");
    gl.enableVertexAttribArray(a_depth);
    gl.vertexAttribPointer(a_depth, 1, gl.FLOAT, false, 0, 0);

    // uv buffer
    const uvs = this.particles.flatMap(p => [p.u, p.v]);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
    const a_uv = gl.getAttribLocation(this.program!, "a_uv");
    gl.enableVertexAttribArray(a_uv);
    gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, 0, 0);

    // texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(gl.getUniformLocation(this.program!, "u_texture"), 0);

    gl.uniform2f(this.u_resolution, this.canvas.width, this.canvas.height);

    const indices = new Uint16Array(this.indices);
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    //light position
    gl.uniform3f(this.u_lightPos, 1.2, 1.0, 1.0);

    // view position
    gl.uniform3f(this.u_viewPos, 0.0, 0.0, 20.0);

    //blending
    gl.enable(gl.BLEND);
    //transparency
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    //wireframe mode: render points and mesh edges
    gl.uniform1i(gl.getUniformLocation(this.program!, "u_wireframeMode"), this.u_wireframeMode);

    //opacity
    gl.uniform1f(gl.getUniformLocation(this.program!, "u_opacity"), this.u_opacity);

          // attachment
    gl.uniform1i(gl.getUniformLocation(this.program!, "u_isAttachment"), 0);


    if (this.u_wireframeMode) {
      // draw points
      gl.drawArrays(gl.POINTS, 0, this.particles.length);
      // draw mesh
      gl.drawElements(gl.LINES, indices.length, gl.UNSIGNED_SHORT, 0);
    } else {
      // draw filled triangles
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    }

    // render anchored attachments
    for (const attachment of this.attachments) {
      const attParticles = attachment.vertices.length / 2; // XY only
      const a_uv = gl.getAttribLocation(this.program!, "a_uv");
      const a_depth = gl.getAttribLocation(this.program!, "a_depth");

      // world space pos
      const worldVertices = new Float32Array(attachment.vertices.length);
      const worldDepths = new Float32Array(attachment.depths.length);

      const anchor = this.particles[attachment.anchorIndex];

      for (let i = 0; i < attParticles; i++) {
        // xy
        worldVertices[i * 2 + 0] = attachment.vertices[i * 2 + 0] + anchor.x + attachment.offset[0];
        worldVertices[i * 2 + 1] = attachment.vertices[i * 2 + 1] + anchor.y + attachment.offset[1];
        // z
        worldDepths[i] = attachment.depths[i] + anchor.z + attachment.offset[2];
      }

      // pos bugger
      const attBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, attBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, worldVertices, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(this.a_pos);
      gl.vertexAttribPointer(this.a_pos, 2, gl.FLOAT, false, 0, 0);

      // depth buffer
      const attDepthBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, attDepthBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, worldDepths, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(a_depth);
      gl.vertexAttribPointer(a_depth, 1, gl.FLOAT, false, 0, 0);

      // uv buffer
      const attUvBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, attUvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, attachment.uvs, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(a_uv);
      gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, 0, 0);

      // normal buffer
      const attNorBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, attNorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, attachment.normals, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(this.a_nor);
      gl.vertexAttribPointer(this.a_nor, 3, gl.FLOAT, false, 0, 0);

      // index buffer
      const attIndexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, attIndexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, attachment.indices, gl.STATIC_DRAW);

      // tecture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, attachment.texture);
      gl.uniform1i(gl.getUniformLocation(this.program!, "u_texture"), 0);

      // attachment
      gl.uniform1i(gl.getUniformLocation(this.program!, "u_isAttachment"), 1);

      gl.drawElements(gl.TRIANGLES, attachment.indices.length, gl.UNSIGNED_SHORT, 0);
    }

    requestAnimationFrame(this.renderLoop);
  };
}


  // private updateParticles() {
  //   const springK = 0.05;
  //   const damping = 0.9;
  //   const interactionForce = 200;
  //   const radius = 80;

  //   for (let i = 0; i < this.particles.length; i++) {
  //     const p = this.particles[i];
  //     const rest = this.restPositions[i];

  //     const dx = p.x - this.mouseX;
  //     const dy = p.y - this.mouseY;
  //     const dist = Math.sqrt(dx * dx + dy * dy);
  //     if (dist < radius) {
  //       const force = (1 - dist / radius) * interactionForce;
  //       const dirX = dx / (dist || 1);
  //       const dirY = dy / (dist || 1);
  //       if (this.isDown) {
  //         p.vx += dirX * force * 0.01;
  //         p.vy += dirY * force * 0.01;
  //       }
  //     }

  //     p.vx += (rest.x - p.x) * springK;
  //     p.vy += (rest.y - p.y) * springK;
  //     p.vx *= damping;
  //     p.vy *= damping;
  //     p.x += p.vx;
  //     p.y += p.vy;
  //   }
  // }
