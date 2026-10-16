(() => {
  // src/motion/background-layer.mjs
  function createBackgroundLayer(element, { low = false, preview = false } = {}) {
    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) throw Error("Background page is not visible");
    const canvas = document.createElement("canvas"), style = document.createElement("style"), dpr = low ? 1 : Math.min(2, devicePixelRatio || 1);
    canvas.dataset[preview ? "nutbookTemplateBackground" : "nutbookMotionBackground"] = element.dataset.nutbookPageId;
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1";
    canvas.width = Math.ceil(rect.width * dpr);
    canvas.height = Math.ceil(rect.height * dpr);
    const position = getComputedStyle(element).position;
    style.dataset[preview ? "nutbookTemplateBackgroundStyle" : "nutbookMotionBackgroundStyle"] = "";
    style.textContent = `[data-nutbook-page-id="${element.dataset.nutbookPageId}"]{isolation:isolate!important;${position === "static" ? "position:relative!important;" : ""}}`;
    document.head.append(style);
    element.prepend(canvas);
    return { canvas, rect, dpr, ctx: canvas.getContext("2d"), dispose() {
      canvas.remove();
      style.remove();
      canvas.width = canvas.height = 0;
    } };
  }

  // src/motion/gpu-backgrounds.mjs
  var TAU = Math.PI * 2;
  var vertex = `#version 300 es
in vec2 point;void main(){gl_Position=vec4(point,0.,1.);}`;
  var common = `#version 300 es
precision highp float;
uniform vec2 resolution;uniform float cycle;uniform float richness;uniform float phase;uniform float lightMode;uniform vec3 lowColor;uniform vec3 midColor;uniform vec3 highColor;out vec4 pixel;
vec3 palette(float h){vec3 c=mix(lowColor,midColor,smoothstep(0.,.5,h));return mix(c,highColor,smoothstep(.5,1.,h));}
`;
  var contours = common + `
uniform vec4 controlA;uniform vec4 controlB;uniform vec4 controlC;uniform vec4 controlD;
float curve(float x,vec4 c){float a=x*6.2831853;return .5*dot(c,vec4(sin(a),cos(a),sin(2.*a),cos(2.*a)));}
void main(){vec2 uv=gl_FragCoord.xy/resolution;vec2 a=vec2(curve(uv.x,controlA),curve(uv.x,controlB));vec2 b=vec2(curve(uv.y,controlC),curve(uv.y,controlD));float elevation=length(a-b);float f=elevation*(.8+3.*richness);float edge=min(fract(f),1.-fract(f));float aa=max(fwidth(f),.00001);float core=1.-smoothstep(.012-aa,.012+aa,edge);float bloom=1.-smoothstep(.012,.012+.22+aa,edge);float glow=bloom;float cover=clamp(core+glow*.55,0.,1.);cover=pow(cover,3.);vec3 tint=palette(clamp(elevation/7.5,0.,1.));float alpha=cover*(lightMode>.5?.48:.7);pixel=vec4(tint,alpha);}
`;
  var waves = common + `
float heightAt(vec2 q,vec4 shift){float x=q.x+shift.x;x+=35.*sin((q.y+x)/20.+shift.y);float y=q.y-shift.z+20.*cos(q.x/23.+shift.w);vec2 frequency=vec2((.35+.5*richness)/7.,(.35+.5*richness)*.9/3.);return (sin(x*frequency.x)+sin(y*frequency.y))*(1.8+1.2*richness)+5.5;}
void main(){vec2 uv=gl_FragCoord.xy/resolution-.5;uv.x*=resolution.x/resolution.y;uv.y=-uv.y;float radius=length(uv),angle=radius*1.366;vec2 axis=radius>.00001?uv/radius:vec2(1.,0.);vec3 ray=vec3(-axis.y*sin(angle),-axis.x*sin(angle),-cos(angle));float c=cos(1.11),s=sin(1.11);ray=vec3(c*ray.x-s*ray.z,ray.y,s*ray.x+c*ray.z);vec3 origin=vec3(0.,0.,30.);vec4 shift=vec4(sin(cycle)*24.,sin(cycle)*3.+cos(cycle)*1.23,sin(cycle)*20.,sin(cycle)*3.5+cos(cycle)*1.41)+phase;float distance=0.;for(int i=0;i<24;i++){vec3 p=origin+ray*distance;float gap=p.z-heightAt(p.xy,shift);if(abs(gap)<.1)break;distance+=gap*.9;if(distance>120.||distance<0.){distance=120.;break;}}vec3 point=origin+ray*distance;float fog=clamp(15./max(distance,.001),0.,1.);float elevation=clamp((point.z-5.5)/(4.*(1.8+1.2*richness))+.5,0.,1.);vec3 surface=mix(lowColor,midColor,smoothstep(.12,.8,elevation));surface=mix(surface,highColor,pow(elevation,4.)*.8);vec3 tint=mix(lowColor,surface,fog);float top=1.-gl_FragCoord.y/resolution.y;float alpha=fog*(1.-smoothstep(90.,120.,distance))*.66*smoothstep(.35,.52,top);pixel=vec4(tint,alpha);}
`;
  function lightPage(element) {
    for (let node = element; node; node = node.parentElement) {
      const c = getComputedStyle(node).backgroundColor.match(/[\d.]+/g)?.map(Number);
      if (c && c.length >= 3 && (c[3] ?? 1) > 0.9) return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722 > 160;
    }
    return true;
  }
  function rgb(hue, L) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = `hsl(${hue} 90% ${L}%)`;
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((n) => n / 255);
  }
  function prepareGpuBackground(element, effect, options = {}) {
    const layer = createBackgroundLayer(element, options), { canvas, ctx, rect } = layer, surface2 = document.createElement("canvas");
    surface2.width = canvas.width;
    surface2.height = canvas.height;
    let gl, program, buffer;
    const shaders = [];
    function release() {
      if (gl) {
        for (const shader of shaders) gl.deleteShader(shader);
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
      surface2.width = surface2.height = 0;
      layer.dispose();
    }
    try {
      gl = surface2.getContext("webgl2", { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, depth: false, stencil: false });
      if (!gl) throw Error("\u6B64\u80CC\u666F\u9700\u8981 WebGL2\uFF0C\u8BF7\u68C0\u67E5\u56FE\u5F62\u52A0\u901F\u540E\u91CD\u8BD5");
      const compile = (type, source) => {
        const shader = gl.createShader(type);
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error("\u80CC\u666F\u7740\u8272\u5668\u7F16\u8BD1\u5931\u8D25\uFF1A" + gl.getShaderInfoLog(shader));
        return shader;
      };
      program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, effect.templateId === "background.topography" ? contours : waves));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error("\u80CC\u666F\u7740\u8272\u5668\u8FDE\u63A5\u5931\u8D25");
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.useProgram(program);
      const location = gl.getAttribLocation(program, "point");
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
      const names = ["resolution", "cycle", "richness", "phase", "lightMode", "lowColor", "midColor", "highColor", "controlA", "controlB", "controlC", "controlD"], uniform = Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)])), light = lightPage(element), p = effect.params, seed = effect.seed % 997 / 997 * TAU;
      gl.viewport(0, 0, surface2.width, surface2.height);
      gl.uniform2f(uniform.resolution, surface2.width, surface2.height);
      gl.uniform1f(uniform.richness, p.strength / 0.8);
      gl.uniform1f(uniform.phase, seed);
      gl.uniform1f(uniform.lightMode, light ? 1 : 0);
      gl.uniform3fv(uniform.lowColor, rgb(p.hue, light ? effect.templateId === "background.gradient-waves" ? 40 : 62 : 52));
      gl.uniform3fv(uniform.midColor, rgb((p.hue + 44) % 360, light ? effect.templateId === "background.gradient-waves" ? 65 : 74 : 80));
      gl.uniform3fv(uniform.highColor, light ? [0.98, 0.98, 1] : [1, 1, 1]);
      let disposed = false;
      return { canvas, renderer: "webgl2", render(time) {
        if (disposed) return;
        if (gl.isContextLost()) throw Error("\u80CC\u666F\u56FE\u5F62\u4E0A\u4E0B\u6587\u5DF2\u4E22\u5931\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8");
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (p.strength === 0) return;
        const t = p.motion === 0 ? 0 : Math.max(0, time) * p.speed % p.durationMs / p.durationMs * TAU;
        gl.uniform1f(uniform.cycle, t);
        for (const [group, indices] of [[0, [1, -2, 3, -4]], [1, [9, -8, 7, -6]], [2, [5, 2, 5, -5]], [3, [-1, -3, 8, 9]]]) gl.uniform4fv(uniform[["controlA", "controlB", "controlC", "controlD"][group]], indices.map((i) => 3 * Math.sin(i + Math.sin(t) * Math.sin(i * 0.05) * 2 + (1 - Math.cos(t)) * Math.cos(i * 0.1) * 0.4 + seed * 0.1)));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        ctx.drawImage(surface2, 0, 0, canvas.width, canvas.height);
      }, dispose() {
        if (disposed) return;
        disposed = true;
        release();
      } };
    } catch (error) {
      release();
      throw error;
    }
  }
  function prepareStaticGpuBackground(element, effect) {
    const layer = createBackgroundLayer(element, { low: true }), { canvas, ctx } = layer, p = effect.params, light = lightPage(element), seed = effect.seed % 997 / 997 * TAU;
    const width = Math.min(1280, canvas.width), height = Math.max(1, Math.round(canvas.height * width / canvas.width)), image = ctx.createImageData(width, height), richness = p.strength / 0.8;
    const colors = [rgb(p.hue, light ? effect.templateId === "background.gradient-waves" ? 40 : 62 : 52), rgb((p.hue + 44) % 360, light ? effect.templateId === "background.gradient-waves" ? 65 : 74 : 80), light ? [0.98, 0.98, 1] : [1, 1, 1]];
    const smooth2 = (a, b, x) => {
      const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    }, mix = (a, b, t) => a + (b - a) * t;
    const controls = [[1, -2, 3, -4], [9, -8, 7, -6], [5, 2, 5, -5], [-1, -3, 8, 9]].map((group) => group.map((i) => 3 * Math.sin(i + seed * 0.1)));
    const curve = (x, c) => {
      const a = x * TAU;
      return 0.5 * (c[0] * Math.sin(a) + c[1] * Math.cos(a) + c[2] * Math.sin(2 * a) + c[3] * Math.cos(2 * a));
    };
    const elevation = (x, y) => Math.hypot(curve(x, controls[0]) - curve(y, controls[2]), curve(x, controls[1]) - curve(y, controls[3]));
    const topography = effect.templateId === "background.topography";
    let raster = null;
    function heightAt(qx, qy) {
      const x = qx + seed + 35 * Math.sin((qy + qx + seed) / 20 + 1.23 + seed), y = qy - seed + 20 * Math.cos(qx / 23 + 1.41 + seed);
      return (Math.sin(x * (0.35 + 0.5 * richness) / 7) + Math.sin(y * (0.35 + 0.5 * richness) * 0.9 / 3)) * (1.8 + 1.2 * richness) + 5.5;
    }
    return { canvas, render() {
      if (p.strength === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const u = (x + 0.5) / width, v = 1 - (y + 0.5) / height;
        let color2, alpha;
        if (topography) {
          const e = elevation(u, v), f = e * (0.8 + 3 * richness), fraction = f - Math.floor(f), edge = Math.min(fraction, 1 - fraction), aa = Math.max(1e-5, (Math.abs(elevation(u + 1 / width, v) - e) + Math.abs(elevation(u, v + 1 / height) - e)) * (0.8 + 3 * richness));
          const core = 1 - smooth2(0.012 - aa, 0.012 + aa, edge), bloom = 1 - smooth2(0.012, 0.232 + aa, edge), cover = Math.pow(Math.min(1, core + bloom * 0.55), 3), h = Math.max(0, Math.min(1, e / 7.5));
          color2 = colors[0].map((c, i) => mix(mix(c, colors[1][i], smooth2(0, 0.5, h)), colors[2][i], smooth2(0.5, 1, h)));
          alpha = cover * (light ? 0.48 : 0.7);
        } else {
          const qx = (u - 0.5) * width / height, qy = -(v - 0.5), radius = Math.hypot(qx, qy), angle = radius * 1.366, ax = radius > 1e-5 ? qx / radius : 1, ay = radius > 1e-5 ? qy / radius : 0, rx = -ay * Math.sin(angle), ry = -ax * Math.sin(angle), rz = -Math.cos(angle), c = Math.cos(1.11), s = Math.sin(1.11), dx = c * rx - s * rz, dz = s * rx + c * rz;
          let distance = 0;
          for (let i = 0; i < 24; i++) {
            const gap = 30 + dz * distance - heightAt(dx * distance, ry * distance);
            if (Math.abs(gap) < 0.1) break;
            distance += gap * 0.9;
            if (distance > 120 || distance < 0) {
              distance = 120;
              break;
            }
          }
          const z = 30 + dz * distance, fog = Math.max(0, Math.min(1, 15 / Math.max(distance, 1e-3))), e = Math.max(0, Math.min(1, (z - 5.5) / (4 * (1.8 + 1.2 * richness)) + 0.5));
          color2 = colors[0].map((low, i) => mix(low, mix(mix(low, colors[1][i], smooth2(0.12, 0.8, e)), colors[2][i], Math.pow(e, 4) * 0.8), fog));
          alpha = fog * (1 - smooth2(90, 120, distance)) * 0.66 * smooth2(0.35, 0.52, 1 - v);
        }
        const at = (y * width + x) * 4;
        for (let i = 0; i < 3; i++) image.data[at + i] = Math.round(color2[i] * 255);
        image.data[at + 3] = Math.round(alpha * 255);
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (width === canvas.width && height === canvas.height) ctx.putImageData(image, 0, 0);
      else {
        raster = document.createElement("canvas");
        raster.width = width;
        raster.height = height;
        raster.getContext("2d").putImageData(image, 0, 0);
        ctx.drawImage(raster, 0, 0, canvas.width, canvas.height);
      }
    }, dispose() {
      layer.dispose();
      if (raster) raster.width = raster.height = 0;
    } };
  }

  // src/motion/quiet-backgrounds.mjs
  var TAU2 = Math.PI * 2;
  var clamp = (x) => Math.max(0, Math.min(1, x));
  var smooth = (x) => {
    x = clamp(x);
    return x * x * (3 - 2 * x);
  };
  function lightPage2(element) {
    for (let node = element; node; node = node.parentElement) {
      const c = getComputedStyle(node).backgroundColor.match(/[\d.]+/g)?.map(Number);
      if (c && c.length >= 3 && (c[3] ?? 1) > 0.9) return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722 > 160;
    }
    return true;
  }
  function distribution(x, y, position) {
    if (position === 1) return 1 - smooth((x - 0.12) / 0.65);
    if (position === 2) return smooth((x - 0.23) / 0.65);
    if (position === 3) return smooth((y - 0.25) / 0.65);
    return 1;
  }
  function color(hue, light, ray = false) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const ctx = c.getContext("2d");
    ctx.fillStyle = `hsl(${hue} ${ray ? 85 : light ? 42 : 48}% ${ray ? light ? 92 : 72 : light ? 32 : 74}%)`;
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
  }
  function materialField(kind, p, phase, light, low, aspect) {
    const w = low ? 96 : 160, h = Math.min(192, Math.max(64, Math.round(w / aspect))), canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d"), image = ctx.createImageData(w, h), rgb2 = color(p.hue, light, kind === "side-rays"), accent = color((p.hue + 168) % 360, light, true);
    return { canvas, render(t) {
      const st = Math.sin(t), ct = Math.cos(t);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const u = x / (w - 1), v = y / (h - 1), X = u * p.scale * (0.6 + 1.1 * p.density), Y = v * p.scale * (0.6 + 1.1 * p.density);
        let signal, tintMix = 0;
        if (kind === "silk") {
          const warp = 0.28 * Math.sin(X * 5 + Y * 3 + phase + 0.7 * st), fold = Math.sin((X + Y * 0.65 + warp) * 12 + 1.2 * Math.sin(t + phase) + 0.16 * Math.sin(Y * 15 + 0.8 * ct));
          signal = 0.12 + 0.38 * (fold * 0.5 + 0.5) + 0.32 * Math.pow(fold * 0.5 + 0.5, 7) * p.detail;
        } else if (kind === "dark-veil") {
          const bend = X + 0.3 * Math.sin(Y * 5 + phase + 0.9 * st), a = Math.sin(bend * 6 + Y * 2 + 1.1 * ct), b = Math.cos(X * 3 - Y * 4 + phase + 0.8 * st);
          signal = Math.pow(clamp(0.42 + 0.32 * a + 0.22 * b), 2.4) * (0.8 + 0.2 * p.detail);
        } else {
          const dx = (1.1 - u) * aspect, dy = v + 0.5, angle = Math.atan2(dy, dx), distance = Math.hypot(dx, dy), spread = 0.16 + 0.2 * p.density, a = -Math.cos(angle + (0.75 + spread)), b = -Math.cos(angle + (0.75 - spread)), pace = phase + st * 1.4;
          const first = clamp(0.45 + 0.15 * Math.sin(a * (24 + 12 * p.density) + pace) + 0.3 + 0.2 * Math.cos(-a * (14 + 8 * p.density) + ct)), second = clamp(0.45 + 0.15 * Math.sin(b * (18 + 8 * p.density) + pace * 0.7) + 0.3 + 0.2 * Math.cos(-b * (12 + 6 * p.density) - st));
          const warm = first * 0.25, cool = second * 0.75, total = warm + cool, blend = cool / Math.max(1e-3, total);
          signal = Math.pow(clamp((total - 0.38) / 0.56), 1.4) * Math.min(1, 0.9 / Math.pow(Math.max(0.5, distance), 1.2));
          tintMix = blend;
        }
        const alpha = clamp(signal * (kind === "side-rays" ? 1 : distribution(u, v, p.position))), i = (y * w + x) * 4;
        for (let k = 0; k < 3; k++) image.data[i + k] = rgb2[k] * (1 - tintMix) + accent[k] * tintMix;
        image.data[i + 3] = Math.round(alpha * 255);
      }
      ctx.putImageData(image, 0, 0);
    }, dispose() {
      canvas.width = canvas.height = 0;
    } };
  }
  var gradients = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.707, 0.707], [-0.707, 0.707], [0.707, -0.707], [-0.707, -0.707]];
  function flowNoise(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, fade = (v2) => v2 * v2 * v2 * (v2 * (v2 * 6 - 15) + 10), u = fade(fx), v = fade(fy), dot = (a2, b2, dx, dy) => {
      let hash = Math.imul(a2, 374761393) ^ Math.imul(b2, 668265263) ^ seed;
      hash = Math.imul(hash ^ hash >>> 13, 1274126177);
      const g = gradients[(hash ^ hash >>> 16) & 7];
      return g[0] * dx + g[1] * dy;
    }, a = dot(ix, iy, fx, fy), b = dot(ix + 1, iy, fx - 1, fy), c = dot(ix, iy + 1, fx, fy - 1), d = dot(ix + 1, iy + 1, fx - 1, fy - 1);
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
  }
  function threadPaths(ctx, w, h, p, t, phase, low) {
    const count = low ? Math.min(24, p.lines) : p.lines, center = p.position === 3 ? 0.72 : 0.5, seed = Math.round(phase * 1e4);
    ctx.lineCap = ctx.lineJoin = "round";
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(0.12, ctx.strokeStyle);
    gradient.addColorStop(0.85, ctx.strokeStyle);
    gradient.addColorStop(1, "transparent");
    ctx.strokeStyle = gradient;
    for (let line = 0; line < count; line++) {
      const f = line / Math.max(1, count - 1), points = [];
      for (let step = 0; step <= 100; step++) {
        const u = step / 100, x = u * w, coarse = flowNoise(u * 3 * p.scale + 0.55 * Math.cos(t) + phase, f * 1.2 + 0.55 * Math.sin(t), seed), fine = flowNoise(u * 6 * p.scale + 0.3 * Math.sin(t), f * 0.8 + 0.3 * Math.cos(t) + phase, seed + 17), y = center * h + (f - 0.5) * h * 0.25 + h * (coarse * 0.26 + fine * 0.055);
        points.push({ x, y });
      }
      const path = new Path2D();
      path.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        path.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      path.lineTo(points.at(-1).x, points.at(-1).y);
      ctx.globalAlpha = 0.06;
      ctx.lineWidth = 2.5;
      ctx.stroke(path);
      ctx.globalAlpha = 0.65 + 0.35 * Math.sin(Math.PI * f);
      ctx.lineWidth = 1.15;
      ctx.stroke(path);
    }
  }
  function prepareQuietBackground(element, effect, options = {}) {
    const layer = createBackgroundLayer(element, options), { canvas, ctx, rect, dpr } = layer, density = effect.params.strength / 0.8, p = { ...effect.params, density, lines: Math.min(64, Math.max(6, Math.round(effect.params.detail * (0.35 + 1.65 * density)))) }, kind = effect.templateId.slice("background.".length), phase = effect.seed % 997 / 997 * TAU2, light = lightPage2(element), material = ["silk", "dark-veil", "side-rays"].includes(kind), field = material ? materialField(kind, p, phase, light, options.low, rect.width / rect.height) : null, rgb2 = color(p.hue, light), mask = document.createElement("canvas");
    mask.width = 128;
    mask.height = 72;
    const mc = mask.getContext("2d"), data = mc.createImageData(128, 72);
    for (let y = 0; y < 72; y++) for (let x = 0; x < 128; x++) data.data[(y * 128 + x) * 4 + 3] = Math.round(255 * distribution(x / 127, y / 71, p.position));
    mc.putImageData(data, 0, 0);
    return { canvas, render(time) {
      const cycle = p.motion === 0 ? 0 : Math.max(0, time) * p.speed % p.durationMs / p.durationMs, t = cycle * TAU2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.globalCompositeOperation = "source-over";
      if (p.strength === 0) return;
      if (material) {
        field.render(t);
        ctx.globalAlpha = kind === "side-rays" ? 0.65 : 0.6;
        ctx.drawImage(field.canvas, 0, 0, rect.width, rect.height);
      } else {
        ctx.strokeStyle = `rgb(${rgb2.join(",")})`;
        threadPaths(ctx, rect.width, rect.height, p, t, phase, options.low);
        ctx.globalCompositeOperation = "destination-in";
        ctx.globalAlpha = 0.55;
        ctx.drawImage(mask, 0, 0, rect.width, rect.height);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }, dispose() {
      layer.dispose();
      field?.dispose();
      mask.width = mask.height = 0;
    } };
  }

  // src/motion/scene-backgrounds.mjs
  var tau = Math.PI * 2;
  var fract = (x) => x - Math.floor(x);
  function rng(seed) {
    let n = seed >>> 0;
    return () => {
      n = Math.imul(n, 1664525) + 1013904223 >>> 0;
      return n / 4294967296;
    };
  }
  function toLch(rgb2) {
    const [r, g, b] = rgb2.map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    }), l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), n = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b), a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * n, c = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * n;
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * n, Math.hypot(a, c), Math.atan2(c, a)];
  }
  function fromLch([L, C, H]) {
    const a = C * Math.cos(H), b = C * Math.sin(H), l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, n = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * n, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * n, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * n].map((v) => {
      v = Math.max(0, Math.min(1, v));
      return Math.round(255 * (v <= 31308e-7 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055));
    });
  }
  function ribbon(hue, hue2, phase, low) {
    const canvas = document.createElement("canvas"), w = low ? 384 : 768, h = low ? 96 : 192;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d"), colors = [hue, hue2].map((v, i) => {
      ctx.fillStyle = `hsl(${v} 100% ${i ? 70 : 58}%)`;
      ctx.fillRect(0, 0, 1, 1);
      return toLch([...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3));
    }), pixels = ctx.createImageData(w, h);
    let delta = colors[1][2] - colors[0][2];
    while (delta > Math.PI) delta -= tau;
    while (delta < -Math.PI) delta += tau;
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1), f = 1 - Math.abs(u * 2 - 1), blend = f * f * (3 - 2 * f), rgb2 = fromLch([colors[0][0] + (colors[1][0] - colors[0][0]) * blend, colors[0][1] + (colors[1][1] - colors[0][1]) * blend, colors[0][2] + delta * blend]), center = h * (0.5 + 0.16 * Math.sin(u * tau + phase) + 0.07 * Math.sin(u * 14 + phase)), edge = Math.pow(Math.sin(Math.PI * u), 0.3), sigma = h * 0.13;
      for (let y = 0; y < h; y++) {
        const i = (y * w + x) * 4, d = (y - center) / sigma, core = Math.exp(-d * d / 0.24) * 0.16;
        pixels.data[i] = rgb2[0] + (255 - rgb2[0]) * core;
        pixels.data[i + 1] = rgb2[1] + (255 - rgb2[1]) * core;
        pixels.data[i + 2] = rgb2[2] + (255 - rgb2[2]) * core;
        pixels.data[i + 3] = Math.round(255 * edge * Math.exp(-d * d / 2));
      }
    }
    ctx.putImageData(pixels, 0, 0);
    return canvas;
  }
  function particleSprite(hue, light) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 48;
    const ctx = canvas.getContext("2d"), gradient = ctx.createRadialGradient(24, 24, 0, 24, 24, 24);
    gradient.addColorStop(0, `hsla(${hue},45%,${light ? 35 : 78}%,.9)`);
    gradient.addColorStop(0.18, `hsla(${hue},40%,${light ? 40 : 68}%,.6)`);
    gradient.addColorStop(1, `hsla(${hue},40%,60%,0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 48, 48);
    return canvas;
  }
  function backgroundLight(element) {
    for (let node = element; node; node = node.parentElement) {
      const c = getComputedStyle(node).backgroundColor.match(/[\d.]+/g)?.map(Number);
      if (c && c.length >= 3 && (c[3] ?? 1) > 0.9) return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722 > 160;
    }
    return true;
  }
  function prepareSceneBackground(element, effect, options = {}) {
    const layer = createBackgroundLayer(element, options), { canvas, ctx, rect, dpr } = layer, p = effect.params, phase = effect.seed % 997 / 997 * tau, aurora = effect.templateId === "background.aurora", random = rng(effect.seed), textures = aurora ? Array.from({ length: p.layers }, (_, i) => ribbon(p.hue, p.hue2, phase + i, options.low)) : [particleSprite(p.hue, backgroundLight(element))];
    canvas.style.opacity = "1";
    const points = aurora ? [] : Array.from({ length: options.low ? Math.min(80, p.density) : p.density }, () => ({ x: random(), y: random(), z: random(), phase: random() * tau }));
    return { canvas, render(time) {
      const t = Math.max(0, time) * p.speed % p.durationMs / p.durationMs * tau;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      if (aurora) {
        for (const [i, texture] of textures.entries()) {
          ctx.save();
          ctx.globalAlpha = Math.min(0.92, p.strength * 1.65) / Math.pow(p.layers, 0.22);
          ctx.translate(rect.width * (0.5 + 0.16 * Math.sin(t + phase + i)), rect.height * (0.2 + i * 0.2 + 0.16 * Math.sin(t + phase + i * 1.9)));
          ctx.rotate(0.16 * Math.sin(t + phase + i * 0.8));
          ctx.transform(1, 0, 0.1 * Math.sin(t + phase + i), 1, 0, 0);
          const w = rect.width * 1.7, h = rect.height * p.bandWidth;
          ctx.drawImage(texture, -w / 2, -h / 2, w, h);
          ctx.restore();
        }
      } else for (const point of points) {
        const depth = 0.25 + point.z * 0.75, radius = p.size * (0.6 + depth * p.depth), margin = radius * 4, cycle = t / tau * (point.z > 0.65 ? 2 : 1), move = p.direction === 0 ? -cycle : p.direction === 1 ? cycle : 0, moveX = p.direction === 2 ? -cycle : p.direction === 3 ? cycle : 0, x = fract(point.x + moveX) * (rect.width + margin * 2) - margin + Math.sin(t + point.phase) * 8 * depth, y = fract(point.y + move) * (rect.height + margin * 2) - margin + Math.cos(t + point.phase) * 8 * depth;
        ctx.globalAlpha = p.strength * (0.25 + 0.65 * depth);
        ctx.drawImage(textures[0], x - radius, y - radius, radius * 2, radius * 2);
      }
      ctx.globalAlpha = 1;
    }, dispose() {
      layer.dispose();
      for (const texture of textures) texture.width = texture.height = 0;
    } };
  }

  // src/motion/background.mjs
  function prepareBackground(element, effect, options = {}) {
    return ["background.gradient-waves", "background.topography"].includes(effect.templateId) ? prepareGpuBackground(element, effect, options) : effect.templateId === "background.flowing-gradient" ? prepareFlowingGradient(element, effect, options) : ["background.silk", "background.dark-veil", "background.threads", "background.side-rays"].includes(effect.templateId) ? prepareQuietBackground(element, effect, options) : prepareSceneBackground(element, effect, options);
  }
  function prepareFlowingGradient(element, effect, { low = false, preview = false } = {}) {
    const layer = createBackgroundLayer(element, { low, preview }), { rect, canvas, dpr } = layer;
    const ctx = canvas.getContext("2d"), { durationMs, strength, hue, hue2, speed, scale } = effect.params, phase = effect.seed % 997 / 997 * Math.PI * 2;
    return { canvas, render(time) {
      const t = Math.max(0, time) * speed % durationMs / durationMs * Math.PI * 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      for (let i = 0; i < 3; i++) {
        const a = t + phase + i * Math.PI * 2 / 3, cx = rect.width * (0.5 + 0.35 * Math.sin(a)), cy = rect.height * (0.5 + 0.32 * Math.cos(t + phase + i * 1.7)), radius = Math.max(rect.width, rect.height) * (0.45 + 0.12 * i) * scale, gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        const color2 = i === 1 ? hue2 : hue;
        gradient.addColorStop(0, `hsla(${color2},75%,58%,${strength * (i === 2 ? 0.55 : 0.8)})`);
        gradient.addColorStop(1, `hsla(${color2},75%,58%,0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, rect.width, rect.height);
      }
    }, dispose() {
      layer.dispose();
    } };
  }

  // src/motion/registry.json
  var registry_default = {
    contract: "nutbook-motion/v1",
    templates: {
      "text.glyph-particles": {
        version: 1,
        category: "text",
        targets: [
          "text"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800
          },
          strength: {
            min: 0,
            max: 2,
            default: 1
          },
          density: {
            min: 12,
            max: 400,
            default: 180,
            integer: true
          },
          hue: {
            min: 0,
            max: 360,
            default: 210,
            optional: true
          },
          colorMode: {
            min: 0,
            max: 2,
            default: 0,
            integer: true,
            optional: true
          },
          lightness: {
            min: 0,
            max: 100,
            default: 0,
            optional: true
          }
        },
        label: "\u7C92\u5B50\u6210\u5B57"
      },
      "entrance.gravity-impact": {
        version: 1,
        label: "\u91CD\u529B\u649E\u51FB",
        category: "entrance",
        targets: [
          "text",
          "image"
        ],
        quality: "candidate",
        renderer: "dom-canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800
          },
          strength: {
            min: 0,
            max: 2,
            default: 1
          },
          dustSize: {
            min: 0,
            max: 3,
            default: 1,
            optional: true
          }
        }
      },
      "emphasis.spotlight": {
        version: 1,
        label: "\u805A\u5149\u5F3A\u8C03",
        category: "emphasis",
        targets: [
          "text",
          "image"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09"
          },
          strength: {
            min: 0,
            max: 2,
            default: 1,
            label: "\u4EAE\u5EA6"
          },
          radiusScale: {
            min: 0.6,
            max: 2,
            default: 1,
            optional: true,
            label: "\u5149\u5708\u5927\u5C0F"
          },
          direction: {
            min: 0,
            max: 3,
            default: 0,
            integer: true,
            optional: true,
            label: "\u5165\u5149\u65B9\u5411",
            options: [
              {
                value: 0,
                label: "\u5DE6\u4E0A"
              },
              {
                value: 1,
                label: "\u53F3\u4E0A"
              },
              {
                value: 2,
                label: "\u5DE6\u4E0B"
              },
              {
                value: 3,
                label: "\u53F3\u4E0B"
              }
            ]
          }
        }
      },
      "exit.particle-dissolve": {
        version: 1,
        label: "\u7C92\u5B50\u6D88\u6563",
        category: "exit",
        targets: [
          "text"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800
          },
          strength: {
            min: 0,
            max: 2,
            default: 0.8
          },
          density: {
            min: 100,
            max: 2400,
            default: 1200,
            integer: true
          },
          hue: {
            min: 0,
            max: 360,
            default: 210,
            optional: true
          },
          colorMode: {
            min: 0,
            max: 2,
            default: 0,
            integer: true,
            optional: true
          },
          lightness: {
            min: 0,
            max: 100,
            default: 0,
            optional: true
          }
        }
      },
      "background.flowing-gradient": {
        version: 1,
        label: "\u6D41\u52A8\u6E10\u53D8",
        category: "background",
        targets: [
          "page"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 6e3,
            max: 3e4,
            default: 12e3,
            label: "\u5468\u671F\uFF08\u6BEB\u79D2\uFF09",
            step: 1e3
          },
          strength: {
            min: 0,
            max: 0.65,
            default: 0.3,
            label: "\u4E0D\u900F\u660E\u5EA6",
            step: 0.01
          },
          hue: {
            min: 0,
            max: 360,
            default: 220,
            label: "\u4E3B\u8272\u76F8",
            step: 1
          },
          hue2: {
            min: 0,
            max: 360,
            default: 290,
            label: "\u8F85\u8272\u76F8",
            step: 1
          },
          speed: {
            min: 0.1,
            max: 2,
            default: 1,
            label: "\u901F\u5EA6",
            step: 0.05
          },
          scale: {
            min: 0.5,
            max: 2,
            default: 1,
            label: "\u5C3A\u5EA6",
            step: 0.05
          }
        },
        panelParams: [
          "hue",
          "hue2",
          "strength",
          "speed"
        ]
      },
      "transition.curtain-reveal": {
        version: 1,
        label: "\u906E\u5E55\u63ED\u9875",
        category: "transition",
        targets: [
          "page"
        ],
        quality: "candidate",
        renderer: "dom",
        requires: {
          supportsDomTransition: true,
          excludesVideo: true,
          excludesEmbeddedFrame: true
        },
        params: {
          durationMs: {
            min: 300,
            max: 2e3,
            default: 800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          direction: {
            min: 0,
            max: 3,
            default: 0,
            integer: true,
            label: "\u65B9\u5411",
            options: [
              {
                value: 0,
                label: "\u4ECE\u5DE6\u81F3\u53F3"
              },
              {
                value: 1,
                label: "\u4ECE\u53F3\u81F3\u5DE6"
              },
              {
                value: 2,
                label: "\u4ECE\u4E0A\u81F3\u4E0B"
              },
              {
                value: 3,
                label: "\u4ECE\u4E0B\u81F3\u4E0A"
              }
            ]
          },
          shape: {
            min: 0,
            max: 1,
            default: 0,
            integer: true,
            label: "\u5F62\u72B6",
            options: [
              {
                value: 0,
                label: "\u76F4\u7EBF"
              },
              {
                value: 1,
                label: "\u5706\u5F62"
              }
            ]
          },
          feather: {
            min: 0,
            max: 0.3,
            default: 0.08,
            label: "\u7FBD\u5316",
            step: 0.01
          }
        }
      },
      "text.character-stagger": {
        version: 1,
        label: "\u9519\u843D\u5165\u573A",
        category: "text",
        targets: [
          "text"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          strength: {
            min: 0,
            max: 2,
            default: 1,
            label: "\u5E45\u5EA6"
          },
          staggerMs: {
            min: 0,
            max: 300,
            default: 45,
            label: "\u5B57\u95F4\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09",
            integer: true,
            step: 5
          },
          order: {
            min: 0,
            max: 2,
            default: 0,
            label: "\u987A\u5E8F",
            integer: true,
            options: [
              {
                value: 0,
                label: "\u4ECE\u524D\u5230\u540E"
              },
              {
                value: 1,
                label: "\u4ECE\u540E\u5230\u524D"
              },
              {
                value: 2,
                label: "\u968F\u673A"
              }
            ]
          },
          preset: {
            min: 0,
            max: 1,
            default: 0,
            label: "\u64AD\u653E\u9884\u8BBE",
            integer: true,
            options: [
              {
                value: 0,
                label: "\u9519\u843D\u663E\u73B0"
              },
              {
                value: 1,
                label: "\u8F7B\u76C8\u6D6E\u5347"
              }
            ],
            optional: true
          }
        }
      },
      "text.decode-reveal": {
        version: 1,
        label: "\u89E3\u7801\u663E\u5B57",
        category: "text",
        targets: [
          "text"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          iterations: {
            min: 3,
            max: 30,
            default: 12,
            label: "\u89E3\u7801\u901F\u5EA6",
            integer: true
          },
          charset: {
            min: 0,
            max: 2,
            default: 0,
            label: "\u66FF\u4EE3\u5B57\u7B26",
            integer: true,
            options: [
              {
                value: 0,
                label: "\u5B57\u6BCD\u4E0E\u6570\u5B57"
              },
              {
                value: 1,
                label: "\u6C49\u5B57"
              },
              {
                value: 2,
                label: "\u4E8C\u8FDB\u5236"
              }
            ]
          },
          staggerMs: {
            min: 0,
            max: 300,
            default: 45,
            label: "\u5B57\u95F4\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09",
            integer: true,
            step: 5
          },
          order: {
            min: 0,
            max: 2,
            default: 0,
            label: "\u987A\u5E8F",
            integer: true,
            options: [
              {
                value: 0,
                label: "\u4ECE\u524D\u5230\u540E"
              },
              {
                value: 1,
                label: "\u4ECE\u540E\u5230\u524D"
              },
              {
                value: 2,
                label: "\u968F\u673A"
              }
            ]
          }
        }
      },
      "text.split-flip": {
        version: 1,
        label: "\u7FFB\u724C\u663E\u5B57",
        category: "text",
        targets: [
          "text"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          axis: {
            min: 0,
            max: 1,
            default: 0,
            label: "\u7FFB\u724C\u65B9\u5411",
            integer: true,
            options: [
              {
                value: 0,
                label: "\u5411\u4E0B\u7FFB\u724C"
              },
              {
                value: 1,
                label: "\u5411\u53F3\u7FFB\u724C"
              }
            ]
          },
          staggerMs: {
            min: 0,
            max: 300,
            default: 45,
            label: "\u5B57\u95F4\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09",
            integer: true,
            step: 5
          }
        }
      },
      "text.elastic-warp": {
        version: 1,
        label: "\u5F39\u6027\u626D\u66F2",
        category: "text",
        targets: [
          "text"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          strength: {
            min: 0,
            max: 2,
            default: 1,
            label: "\u5E45\u5EA6"
          },
          wavelength: {
            min: 20,
            max: 240,
            default: 90,
            label: "\u6CE2\u957F"
          },
          recovery: {
            min: 1,
            max: 6,
            default: 3,
            label: "\u56DE\u5F39\u6B21\u6570",
            integer: true
          }
        },
        catalog: false
      },
      "text.outline-write": {
        version: 1,
        label: "\u52FE\u52D2\u6210\u5B57",
        category: "text",
        targets: [
          "text"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          strokeWidth: {
            min: 0.5,
            max: 4,
            default: 1.5,
            label: "\u63CF\u8FB9\u5BBD\u5EA6"
          },
          fillAt: {
            min: 0.3,
            max: 0.85,
            default: 0.6,
            label: "\u586B\u5145\u8D77\u70B9"
          },
          staggerMs: {
            min: 0,
            max: 300,
            default: 45,
            label: "\u5B57\u95F4\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09",
            integer: true,
            step: 5
          }
        }
      },
      "text.depth-text": {
        version: 1,
        label: "\u6DF1\u5EA6\u6587\u5B57",
        category: "text",
        targets: [
          "text"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          strength: {
            min: 0,
            max: 2,
            default: 1,
            label: "\u5E45\u5EA6"
          },
          depth: {
            min: 4,
            max: 60,
            default: 24,
            label: "\u5C42\u6DF1"
          },
          layers: {
            min: 3,
            max: 16,
            default: 8,
            label: "\u5C42\u6570",
            integer: true
          },
          perspective: {
            min: 50,
            max: 400,
            default: 220,
            label: "\u900F\u89C6\u6DF1\u5EA6"
          },
          staggerMs: {
            min: 0,
            max: 300,
            default: 45,
            label: "\u5B57\u95F4\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09",
            integer: true,
            step: 5
          }
        },
        catalog: false
      },
      "text.fold-unfold": {
        version: 1,
        label: "\u6298\u9875\u663E\u5B57",
        category: "text",
        targets: [
          "text"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          panels: {
            min: 2,
            max: 6,
            default: 4,
            label: "\u9519\u843D\u5C42\u6B21",
            integer: true
          },
          foldAngle: {
            min: 20,
            max: 88,
            default: 78,
            label: "\u5C55\u5F00\u89D2\u5EA6"
          },
          staggerMs: {
            min: 0,
            max: 300,
            default: 45,
            label: "\u884C\u95F4\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09",
            integer: true,
            step: 5
          }
        }
      },
      "text.echo-trail": {
        version: 1,
        label: "\u53E0\u5F71\u5F52\u4F4D",
        category: "text",
        targets: [
          "text"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          strength: {
            min: 0,
            max: 2,
            default: 1,
            label: "\u5E45\u5EA6"
          },
          echoes: {
            min: 2,
            max: 8,
            default: 5,
            label: "\u53E0\u5F71\u5C42\u6570",
            integer: true
          },
          spacing: {
            min: 15,
            max: 150,
            default: 60,
            label: "\u53E0\u5F71\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09",
            integer: true
          },
          decay: {
            min: 0.2,
            max: 0.85,
            default: 0.6,
            label: "\u53E0\u5F71\u8870\u51CF"
          }
        }
      },
      "text.light-sweep": {
        version: 1,
        label: "\u63A0\u5149\u5F3A\u8C03",
        category: "emphasis",
        targets: [
          "text"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          bandWidth: {
            min: 12,
            max: 180,
            default: 65,
            label: "\u5149\u5E26\u5BBD\u5EA6"
          },
          brightness: {
            min: 0.2,
            max: 1,
            default: 0.85,
            label: "\u5149\u5E26\u4EAE\u5EA6"
          },
          angle: {
            min: -60,
            max: 60,
            default: 20,
            label: "\u5149\u5E26\u89D2\u5EA6"
          }
        }
      },
      "text.masked-heading": {
        version: 1,
        label: "\u6D41\u5F69\u663E\u5B57",
        category: "text",
        targets: [
          "text"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          hue: {
            min: 0,
            max: 360,
            default: 155,
            label: "\u8D77\u59CB\u8272\u76F8",
            integer: true
          },
          hue2: {
            min: 0,
            max: 360,
            default: 225,
            label: "\u7ED3\u675F\u8272\u76F8",
            integer: true
          },
          speed: {
            min: 0.2,
            max: 3,
            default: 1,
            label: "\u6D41\u52A8\u901F\u5EA6"
          },
          staggerMs: {
            min: 0,
            max: 300,
            default: 45,
            label: "\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09",
            integer: true,
            step: 5
          }
        }
      },
      "text.blur-reveal": {
        version: 1,
        label: "\u67D4\u7126\u663E\u73B0",
        category: "text",
        targets: [
          "text"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          blur: {
            min: 0,
            max: 24,
            default: 12,
            label: "\u8D77\u59CB\u6A21\u7CCA"
          },
          distance: {
            min: 0,
            max: 60,
            default: 18,
            label: "\u6D6E\u5347\u8DDD\u79BB"
          },
          staggerMs: {
            min: 0,
            max: 300,
            default: 45,
            label: "\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09",
            integer: true,
            step: 5
          },
          preset: {
            min: 0,
            max: 1,
            default: 0,
            label: "\u64AD\u653E\u9884\u8BBE",
            integer: true,
            options: [
              {
                value: 0,
                label: "\u9010\u5B57\u663E\u73B0"
              },
              {
                value: 1,
                label: "\u9010\u6BB5\u663E\u73B0"
              }
            ]
          }
        }
      },
      "text.typewriter": {
        version: 1,
        label: "\u9010\u5B57\u6253\u51FA",
        category: "text",
        targets: [
          "text"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          cursor: {
            min: 0,
            max: 1,
            default: 1,
            label: "\u6253\u5B57\u5149\u6807",
            integer: true,
            options: [
              {
                value: 0,
                label: "\u9690\u85CF"
              },
              {
                value: 1,
                label: "\u663E\u793A"
              }
            ]
          },
          cadence: {
            min: 0,
            max: 1,
            default: 0.35,
            label: "\u8282\u594F\u8D77\u4F0F"
          }
        }
      },
      "text.pressure": {
        version: 1,
        label: "\u5F39\u6027\u5B57\u5F62",
        category: "emphasis",
        targets: [
          "text"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          strength: {
            min: 0,
            max: 1,
            default: 0.35,
            label: "\u5F62\u53D8\u5E45\u5EA6"
          },
          width: {
            min: 0.08,
            max: 0.6,
            default: 0.25,
            label: "\u538B\u529B\u8303\u56F4"
          },
          direction: {
            min: 0,
            max: 1,
            default: 0,
            label: "\u626B\u8FC7\u65B9\u5411",
            integer: true,
            options: [
              {
                value: 0,
                label: "\u4ECE\u5DE6\u5230\u53F3"
              },
              {
                value: 1,
                label: "\u4ECE\u53F3\u5230\u5DE6"
              }
            ]
          }
        }
      },
      "text.gradient": {
        version: 1,
        label: "\u6D41\u5F69\u6587\u5B57",
        category: "emphasis",
        targets: [
          "text"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          hue: {
            min: 0,
            max: 360,
            default: 155,
            label: "\u8D77\u59CB\u8272\u76F8",
            integer: true
          },
          hue2: {
            min: 0,
            max: 360,
            default: 225,
            label: "\u7ED3\u675F\u8272\u76F8",
            integer: true
          },
          speed: {
            min: 0.2,
            max: 3,
            default: 1,
            label: "\u6D41\u52A8\u901F\u5EA6"
          },
          mode: {
            min: 0,
            max: 2,
            default: 0,
            label: "\u6D41\u5F69\u65B9\u5F0F",
            integer: true,
            options: [
              {
                value: 0,
                label: "\u6A2A\u5411\u6D41\u52A8"
              },
              {
                value: 1,
                label: "\u7F51\u72B6\u6D41\u52A8"
              },
              {
                value: 2,
                label: "\u65CB\u8F6C\u6D41\u52A8"
              }
            ]
          }
        }
      },
      "text.true-focus": {
        version: 1,
        label: "\u9010\u8BCD\u805A\u7126",
        category: "emphasis",
        targets: [
          "text"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          blur: {
            min: 0,
            max: 12,
            default: 5,
            label: "\u5468\u56F4\u6A21\u7CCA"
          },
          grouping: {
            min: 0,
            max: 1,
            default: 0,
            label: "\u805A\u7126\u5355\u4F4D",
            integer: true,
            options: [
              {
                value: 0,
                label: "\u8BCD\u7EC4"
              },
              {
                value: 1,
                label: "\u5355\u5B57"
              }
            ]
          },
          frame: {
            min: 0,
            max: 1,
            default: 1,
            label: "\u7126\u70B9\u6846",
            integer: true,
            options: [
              {
                value: 0,
                label: "\u9690\u85CF"
              },
              {
                value: 1,
                label: "\u663E\u793A"
              }
            ]
          },
          mode: {
            min: 0,
            max: 1,
            default: 0,
            label: "\u805A\u7126\u65B9\u5F0F",
            integer: true,
            optional: true,
            options: [
              {
                value: 0,
                label: "\u6307\u5B9A\u6587\u5B57"
              },
              {
                value: 1,
                label: "\u9F20\u6807\u60AC\u505C"
              }
            ]
          },
          focusIndex: {
            min: 0,
            max: 255,
            default: 0,
            label: "\u805A\u7126\u6587\u5B57",
            integer: true,
            optional: true,
            options: [
              {
                value: 0,
                label: "\u7B2C\u4E00\u9879"
              }
            ]
          },
          focusStart: {
            min: 0,
            max: 65535,
            default: 0,
            label: "\u9009\u533A\u8D77\u70B9",
            integer: true,
            optional: true
          },
          focusEnd: {
            min: 0,
            max: 65535,
            default: 0,
            label: "\u9009\u533A\u7EC8\u70B9",
            integer: true,
            optional: true
          }
        }
      },
      "text.count-up": {
        version: 1,
        label: "\u6570\u5B57\u9012\u589E",
        category: "text",
        targets: [
          "text"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          startRatio: {
            min: 0,
            max: 1,
            default: 0,
            label: "\u8D77\u59CB\u6BD4\u4F8B"
          },
          curve: {
            min: 0,
            max: 2,
            default: 1,
            label: "\u589E\u957F\u8282\u594F",
            integer: true,
            options: [
              {
                value: 0,
                label: "\u5300\u901F"
              },
              {
                value: 1,
                label: "\u5148\u5FEB\u540E\u6162"
              },
              {
                value: 2,
                label: "\u5148\u6162\u540E\u5FEB"
              }
            ]
          }
        }
      },
      "entrance.fragment-assemble": {
        version: 1,
        label: "\u788E\u7247\u62FC\u5408",
        category: "entrance",
        targets: [
          "text",
          "image"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1600,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09"
          },
          pieces: {
            min: 8,
            max: 160,
            default: 48,
            integer: true,
            label: "\u788E\u7247\u6570\u91CF"
          },
          strength: {
            min: 0.2,
            max: 2,
            default: 1,
            label: "\u5E45\u5EA6"
          }
        },
        catalog: false
      },
      "exit.fragment-fall": {
        version: 1,
        label: "\u73BB\u7483\u7834\u788E",
        category: "exit",
        targets: [
          "text",
          "image"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1600,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09"
          },
          pieces: {
            min: 8,
            max: 160,
            default: 48,
            integer: true,
            label: "\u788E\u7247\u6570\u91CF"
          },
          strength: {
            min: 0.2,
            max: 2,
            default: 1,
            label: "\u5E45\u5EA6"
          }
        }
      },
      "exit.fold-close": {
        version: 1,
        label: "\u6298\u9762\u6536\u62E2",
        category: "exit",
        targets: [
          "text",
          "image"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 6e3,
            default: 1400,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09"
          },
          axis: {
            min: 0,
            max: 1,
            default: 0,
            integer: true,
            label: "\u6536\u62E2\u65B9\u5411",
            options: [
              {
                value: 0,
                label: "\u5DE6\u53F3\u5BF9\u6298"
              },
              {
                value: 1,
                label: "\u4E0A\u4E0B\u5BF9\u6298"
              }
            ]
          },
          perspective: {
            min: 0.6,
            max: 3,
            default: 1.6,
            label: "\u900F\u89C6\u8DDD\u79BB"
          }
        }
      },
      "background.aurora": {
        version: 1,
        label: "\u6781\u5149\u5E55",
        category: "background",
        targets: [
          "page"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 6e3,
            max: 3e4,
            default: 12e3,
            label: "\u5468\u671F\uFF08\u6BEB\u79D2\uFF09",
            step: 1e3
          },
          strength: {
            min: 0,
            max: 0.7,
            default: 0.4,
            label: "\u4E0D\u900F\u660E\u5EA6",
            step: 0.01
          },
          hue: {
            min: 0,
            max: 360,
            default: 255,
            label: "\u4E3B\u8272\u76F8",
            step: 1
          },
          hue2: {
            min: 0,
            max: 360,
            default: 112,
            label: "\u8F85\u8272\u76F8",
            step: 1
          },
          speed: {
            min: 0.1,
            max: 2,
            default: 1,
            label: "\u901F\u5EA6",
            step: 0.05
          },
          bandWidth: {
            min: 0.35,
            max: 1.4,
            default: 0.9,
            label: "\u5149\u5E26\u5BBD\u5EA6",
            step: 0.05
          },
          layers: {
            min: 1,
            max: 5,
            default: 3,
            integer: true,
            label: "\u5149\u5E55\u5C42\u6570"
          }
        },
        panelParams: [
          "hue",
          "hue2",
          "strength",
          "speed"
        ]
      },
      "background.drifting-particles": {
        version: 1,
        label: "\u7C92\u5B50\u6F02\u6D6E",
        category: "background",
        targets: [
          "page"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 6e3,
            max: 3e4,
            default: 12e3,
            label: "\u5468\u671F\uFF08\u6BEB\u79D2\uFF09",
            step: 1e3
          },
          strength: {
            min: 0,
            max: 0.65,
            default: 0.35,
            label: "\u4E0D\u900F\u660E\u5EA6",
            step: 0.01
          },
          hue: {
            min: 0,
            max: 360,
            default: 175,
            label: "\u4E3B\u8272\u76F8",
            step: 1
          },
          speed: {
            min: 0.1,
            max: 2,
            default: 1,
            label: "\u6D41\u901F",
            step: 0.05
          },
          density: {
            min: 20,
            max: 240,
            default: 100,
            integer: true,
            label: "\u7C92\u5B50\u6570\u91CF"
          },
          size: {
            min: 1,
            max: 6,
            default: 3,
            label: "\u7C92\u5B50\u5927\u5C0F",
            step: 0.1
          },
          depth: {
            min: 0.2,
            max: 3,
            default: 1.4,
            label: "\u666F\u6DF1\u5C42\u6B21",
            step: 0.1
          },
          direction: {
            min: 0,
            max: 3,
            default: 0,
            integer: true,
            label: "\u6F02\u79FB\u65B9\u5411",
            options: [
              {
                value: 0,
                label: "\u5411\u4E0A"
              },
              {
                value: 1,
                label: "\u5411\u4E0B"
              },
              {
                value: 2,
                label: "\u5411\u5DE6"
              },
              {
                value: 3,
                label: "\u5411\u53F3"
              }
            ]
          }
        },
        catalog: false
      },
      "background.silk": {
        version: 1,
        label: "\u7EE2\u6D41",
        category: "background",
        targets: [
          "page"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          motion: {
            min: 0,
            max: 1,
            default: 1,
            integer: true,
            label: "\u72B6\u6001",
            options: [
              {
                value: 0,
                label: "\u9759\u6001"
              },
              {
                value: 1,
                label: "\u6D41\u52A8"
              }
            ]
          },
          position: {
            min: 0,
            max: 3,
            default: 0,
            integer: true,
            label: "\u5206\u5E03",
            options: [
              {
                value: 0,
                label: "\u5168\u5E45"
              },
              {
                value: 1,
                label: "\u5DE6\u4FA7"
              },
              {
                value: 2,
                label: "\u53F3\u4FA7"
              },
              {
                value: 3,
                label: "\u5E95\u90E8"
              }
            ]
          },
          hue: {
            min: 0,
            max: 360,
            default: 275,
            step: 1,
            label: "\u8272\u76F8"
          },
          speed: {
            min: 0.1,
            max: 2,
            default: 1,
            step: 0.05,
            label: "\u901F\u5EA6"
          },
          scale: {
            min: 0.5,
            max: 2,
            default: 1,
            step: 0.05,
            label: "\u5C3A\u5EA6"
          },
          strength: {
            min: 0,
            max: 0.8,
            default: 0.55,
            step: 0.01,
            label: "\u6D53\u5EA6"
          },
          durationMs: {
            min: 6e3,
            max: 3e4,
            default: 24e3,
            step: 1e3,
            label: "\u5468\u671F\uFF08\u6BEB\u79D2\uFF09"
          },
          detail: {
            min: 0,
            max: 1,
            default: 0.5,
            step: 0.05,
            label: "\u9AD8\u5149"
          }
        },
        panelParams: [
          "motion",
          "hue",
          "strength",
          "speed"
        ]
      },
      "background.dark-veil": {
        version: 1,
        label: "\u6697\u5E55\u6D41\u5149",
        category: "background",
        targets: [
          "page"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          motion: {
            min: 0,
            max: 1,
            default: 1,
            integer: true,
            label: "\u72B6\u6001",
            options: [
              {
                value: 0,
                label: "\u9759\u6001"
              },
              {
                value: 1,
                label: "\u6D41\u52A8"
              }
            ]
          },
          position: {
            min: 0,
            max: 3,
            default: 2,
            integer: true,
            label: "\u5206\u5E03",
            options: [
              {
                value: 0,
                label: "\u5168\u5E45"
              },
              {
                value: 1,
                label: "\u5DE6\u4FA7"
              },
              {
                value: 2,
                label: "\u53F3\u4FA7"
              },
              {
                value: 3,
                label: "\u5E95\u90E8"
              }
            ]
          },
          hue: {
            min: 0,
            max: 360,
            default: 265,
            step: 1,
            label: "\u8272\u76F8"
          },
          speed: {
            min: 0.1,
            max: 2,
            default: 1,
            step: 0.05,
            label: "\u901F\u5EA6"
          },
          scale: {
            min: 0.5,
            max: 2,
            default: 1,
            step: 0.05,
            label: "\u5C3A\u5EA6"
          },
          strength: {
            min: 0,
            max: 0.8,
            default: 0.55,
            step: 0.01,
            label: "\u6D53\u5EA6"
          },
          durationMs: {
            min: 6e3,
            max: 3e4,
            default: 24e3,
            step: 1e3,
            label: "\u5468\u671F\uFF08\u6BEB\u79D2\uFF09"
          },
          detail: {
            min: 0,
            max: 1,
            default: 0.6,
            step: 0.05,
            label: "\u5C42\u6B21"
          }
        },
        panelParams: [
          "motion",
          "hue",
          "strength",
          "speed"
        ]
      },
      "background.threads": {
        version: 1,
        label: "\u6E38\u4E1D",
        category: "background",
        targets: [
          "page"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          motion: {
            min: 0,
            max: 1,
            default: 1,
            integer: true,
            label: "\u72B6\u6001",
            options: [
              {
                value: 0,
                label: "\u9759\u6001"
              },
              {
                value: 1,
                label: "\u6D41\u52A8"
              }
            ]
          },
          position: {
            min: 0,
            max: 3,
            default: 3,
            integer: true,
            label: "\u5206\u5E03",
            options: [
              {
                value: 0,
                label: "\u5168\u5E45"
              },
              {
                value: 1,
                label: "\u5DE6\u4FA7"
              },
              {
                value: 2,
                label: "\u53F3\u4FA7"
              },
              {
                value: 3,
                label: "\u5E95\u90E8"
              }
            ]
          },
          hue: {
            min: 0,
            max: 360,
            default: 175,
            step: 1,
            label: "\u8272\u76F8"
          },
          speed: {
            min: 0.1,
            max: 2,
            default: 1,
            step: 0.05,
            label: "\u901F\u5EA6"
          },
          scale: {
            min: 0.5,
            max: 2,
            default: 1,
            step: 0.05,
            label: "\u5C3A\u5EA6"
          },
          strength: {
            min: 0,
            max: 0.8,
            default: 0.55,
            step: 0.01,
            label: "\u6D53\u5EA6"
          },
          durationMs: {
            min: 6e3,
            max: 3e4,
            default: 24e3,
            step: 1e3,
            label: "\u5468\u671F\uFF08\u6BEB\u79D2\uFF09"
          },
          detail: {
            min: 8,
            max: 64,
            default: 36,
            step: 1,
            label: "\u7EBF\u6761\u6570\u91CF",
            integer: true
          }
        },
        panelParams: [
          "motion",
          "hue",
          "strength",
          "speed"
        ]
      },
      "background.side-rays": {
        version: 1,
        label: "\u4FA7\u5149",
        category: "background",
        targets: [
          "page"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          motion: {
            min: 0,
            max: 1,
            default: 1,
            integer: true,
            label: "\u72B6\u6001",
            options: [
              {
                value: 0,
                label: "\u9759\u6001"
              },
              {
                value: 1,
                label: "\u6D41\u52A8"
              }
            ]
          },
          position: {
            min: 0,
            max: 3,
            default: 1,
            integer: true,
            label: "\u5206\u5E03",
            options: [
              {
                value: 0,
                label: "\u5168\u5E45"
              },
              {
                value: 1,
                label: "\u5DE6\u4FA7"
              },
              {
                value: 2,
                label: "\u53F3\u4FA7"
              },
              {
                value: 3,
                label: "\u5E95\u90E8"
              }
            ]
          },
          hue: {
            min: 0,
            max: 360,
            default: 42,
            step: 1,
            label: "\u8272\u76F8"
          },
          speed: {
            min: 0.1,
            max: 2,
            default: 1,
            step: 0.05,
            label: "\u901F\u5EA6"
          },
          scale: {
            min: 0.5,
            max: 2,
            default: 1,
            step: 0.05,
            label: "\u5C3A\u5EA6"
          },
          strength: {
            min: 0,
            max: 0.8,
            default: 0.55,
            step: 0.01,
            label: "\u6D53\u5EA6"
          },
          durationMs: {
            min: 6e3,
            max: 3e4,
            default: 24e3,
            step: 1e3,
            label: "\u5468\u671F\uFF08\u6BEB\u79D2\uFF09"
          },
          detail: {
            min: 0,
            max: 1,
            default: 0.6,
            step: 0.05,
            label: "\u5149\u675F\u758F\u5BC6"
          }
        },
        panelParams: [
          "motion",
          "hue",
          "strength",
          "speed"
        ]
      },
      "background.topography": {
        version: 1,
        label: "\u7B49\u9AD8\u7EBF",
        category: "background",
        targets: [
          "page"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          motion: {
            min: 0,
            max: 1,
            default: 1,
            integer: true,
            label: "\u72B6\u6001",
            options: [
              {
                value: 0,
                label: "\u9759\u6001"
              },
              {
                value: 1,
                label: "\u6D41\u52A8"
              }
            ]
          },
          position: {
            min: 0,
            max: 3,
            default: 0,
            integer: true,
            label: "\u5206\u5E03",
            options: [
              {
                value: 0,
                label: "\u5168\u5E45"
              },
              {
                value: 1,
                label: "\u5DE6\u4FA7"
              },
              {
                value: 2,
                label: "\u53F3\u4FA7"
              },
              {
                value: 3,
                label: "\u5E95\u90E8"
              }
            ]
          },
          hue: {
            min: 0,
            max: 360,
            default: 255,
            step: 1,
            label: "\u8272\u76F8"
          },
          speed: {
            min: 0.1,
            max: 2,
            default: 1,
            step: 0.05,
            label: "\u901F\u5EA6"
          },
          scale: {
            min: 0.5,
            max: 2,
            default: 1,
            step: 0.05,
            label: "\u5C3A\u5EA6"
          },
          strength: {
            min: 0,
            max: 0.8,
            default: 0.55,
            step: 0.01,
            label: "\u6D53\u5EA6"
          },
          durationMs: {
            min: 6e3,
            max: 3e4,
            default: 24e3,
            step: 1e3,
            label: "\u5468\u671F\uFF08\u6BEB\u79D2\uFF09"
          },
          detail: {
            min: 6,
            max: 24,
            default: 14,
            step: 1,
            label: "\u8F6E\u5ED3\u6570\u91CF",
            integer: true
          }
        },
        panelParams: [
          "motion",
          "hue",
          "strength",
          "speed"
        ]
      },
      "background.gradient-waves": {
        version: 1,
        label: "\u6E10\u5C42\u6CE2\u6F9C",
        category: "background",
        targets: [
          "page"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          motion: {
            min: 0,
            max: 1,
            default: 1,
            integer: true,
            label: "\u72B6\u6001",
            options: [
              {
                value: 0,
                label: "\u9759\u6001"
              },
              {
                value: 1,
                label: "\u6D41\u52A8"
              }
            ]
          },
          position: {
            min: 0,
            max: 3,
            default: 0,
            integer: true,
            label: "\u5206\u5E03",
            options: [
              {
                value: 0,
                label: "\u5168\u5E45"
              },
              {
                value: 1,
                label: "\u5DE6\u4FA7"
              },
              {
                value: 2,
                label: "\u53F3\u4FA7"
              },
              {
                value: 3,
                label: "\u5E95\u90E8"
              }
            ]
          },
          hue: {
            min: 0,
            max: 360,
            default: 255,
            step: 1,
            label: "\u8272\u76F8"
          },
          speed: {
            min: 0.1,
            max: 2,
            default: 1,
            step: 0.05,
            label: "\u901F\u5EA6"
          },
          scale: {
            min: 0.5,
            max: 2,
            default: 1,
            step: 0.05,
            label: "\u5C3A\u5EA6"
          },
          strength: {
            min: 0,
            max: 0.8,
            default: 0.55,
            step: 0.01,
            label: "\u6D53\u5EA6"
          },
          durationMs: {
            min: 6e3,
            max: 3e4,
            default: 24e3,
            step: 1e3,
            label: "\u5468\u671F\uFF08\u6BEB\u79D2\uFF09"
          },
          detail: {
            min: 0,
            max: 1,
            default: 0.5,
            step: 0.05,
            label: "\u6CE2\u9762\u5C42\u6B21"
          }
        },
        panelParams: [
          "motion",
          "hue",
          "strength",
          "speed"
        ]
      },
      "transition.parallax": {
        version: 1,
        label: "\u591A\u5C42\u89C6\u5DEE",
        category: "transition",
        targets: [
          "page"
        ],
        quality: "candidate",
        renderer: "dom",
        requires: {
          supportsDomTransition: true,
          excludesVideo: true,
          excludesEmbeddedFrame: true
        },
        params: {
          durationMs: {
            min: 300,
            max: 2e3,
            default: 800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          direction: {
            min: 0,
            max: 3,
            default: 0,
            integer: true,
            label: "\u65B9\u5411",
            options: [
              {
                value: 0,
                label: "\u5411\u5DE6"
              },
              {
                value: 1,
                label: "\u5411\u53F3"
              },
              {
                value: 2,
                label: "\u5411\u4E0A"
              },
              {
                value: 3,
                label: "\u5411\u4E0B"
              }
            ]
          },
          depth: {
            min: 0.15,
            max: 1,
            default: 0.55,
            step: 0.05,
            label: "\u5C42\u95F4\u8DDD\u79BB"
          }
        }
      },
      "transition.depth-travel": {
        version: 1,
        label: "\u666F\u6DF1\u7A7F\u8D8A",
        category: "transition",
        targets: [
          "page"
        ],
        quality: "candidate",
        renderer: "dom",
        requires: {
          supportsDomTransition: true,
          excludesVideo: true,
          excludesEmbeddedFrame: true,
          supportsFilterTransition: true
        },
        params: {
          durationMs: {
            min: 300,
            max: 2e3,
            default: 800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          direction: {
            min: 0,
            max: 1,
            default: 0,
            integer: true,
            label: "\u955C\u5934\u65B9\u5411",
            options: [
              {
                value: 0,
                label: "\u63A8\u8FD1"
              },
              {
                value: 1,
                label: "\u62C9\u8FDC"
              }
            ]
          },
          depth: {
            min: 0.1,
            max: 1,
            default: 0.45,
            step: 0.05,
            label: "\u63A8\u8FDB\u5E45\u5EA6"
          },
          blur: {
            min: 0,
            max: 24,
            default: 10,
            step: 1,
            label: "\u865A\u5316"
          }
        }
      },
      "transition.grain-dissolve": {
        version: 1,
        label: "\u9897\u7C92\u6EB6\u89E3",
        category: "transition",
        targets: [
          "page"
        ],
        quality: "candidate",
        renderer: "dom",
        requires: {
          supportsDomTransition: true,
          excludesVideo: true,
          excludesEmbeddedFrame: true
        },
        params: {
          durationMs: {
            min: 300,
            max: 2e3,
            default: 800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          direction: {
            min: 0,
            max: 3,
            default: 0,
            integer: true,
            label: "\u65B9\u5411",
            options: [
              {
                value: 0,
                label: "\u4ECE\u5DE6\u81F3\u53F3"
              },
              {
                value: 1,
                label: "\u4ECE\u53F3\u81F3\u5DE6"
              },
              {
                value: 2,
                label: "\u4ECE\u4E0A\u81F3\u4E0B"
              },
              {
                value: 3,
                label: "\u4ECE\u4E0B\u81F3\u4E0A"
              }
            ]
          },
          grain: {
            min: 16,
            max: 128,
            default: 80,
            integer: true,
            step: 1,
            label: "\u9897\u7C92\u5BC6\u5EA6"
          }
        }
      },
      "exit.blur-away": {
        version: 1,
        label: "\u67D4\u7126\u9690\u53BB",
        category: "exit",
        targets: [
          "text",
          "image"
        ],
        quality: "candidate",
        renderer: "dom",
        params: {
          durationMs: {
            min: 300,
            max: 4e3,
            default: 1e3,
            step: 100,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09"
          },
          blur: {
            min: 0,
            max: 30,
            default: 12,
            step: 1,
            label: "\u865A\u5316"
          }
        }
      },
      "exit.directional-wipe": {
        version: 1,
        label: "\u5B9A\u5411\u64E6\u9664",
        category: "exit",
        targets: [
          "text",
          "image"
        ],
        quality: "candidate",
        renderer: "dom",
        params: {
          durationMs: {
            min: 300,
            max: 4e3,
            default: 1e3,
            step: 100,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09"
          },
          direction: {
            min: 0,
            max: 3,
            default: 0,
            integer: true,
            label: "\u65B9\u5411",
            options: [
              {
                value: 0,
                label: "\u4ECE\u5DE6\u81F3\u53F3"
              },
              {
                value: 1,
                label: "\u4ECE\u53F3\u81F3\u5DE6"
              },
              {
                value: 2,
                label: "\u4ECE\u4E0A\u81F3\u4E0B"
              },
              {
                value: 3,
                label: "\u4ECE\u4E0B\u81F3\u4E0A"
              }
            ]
          }
        }
      },
      "exit.depth-away": {
        version: 1,
        label: "\u900F\u89C6\u9000\u8FDC",
        category: "exit",
        targets: [
          "text",
          "image"
        ],
        quality: "candidate",
        renderer: "dom",
        params: {
          durationMs: {
            min: 300,
            max: 4e3,
            default: 1e3,
            step: 100,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09"
          },
          depth: {
            min: 200,
            max: 3e3,
            default: 1200,
            step: 100,
            label: "\u9000\u8FDC\u8DDD\u79BB"
          }
        }
      },
      "exit.page-curl": {
        version: 1,
        label: "\u5377\u9875\u79BB\u573A",
        category: "exit",
        targets: [
          "image"
        ],
        quality: "candidate",
        renderer: "canvas2d",
        params: {
          durationMs: {
            min: 500,
            max: 4e3,
            default: 1600,
            step: 100,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09"
          },
          direction: {
            min: 0,
            max: 1,
            default: 0,
            integer: true,
            label: "\u5377\u8D77\u65B9\u5411",
            options: [
              {
                value: 0,
                label: "\u4ECE\u53F3\u4FA7\u5377\u8D77"
              },
              {
                value: 1,
                label: "\u4ECE\u5DE6\u4FA7\u5377\u8D77"
              }
            ]
          },
          curl: {
            min: 0.04,
            max: 0.2,
            default: 0.1,
            step: 0.01,
            label: "\u5377\u66F2\u534A\u5F84"
          }
        }
      },
      "transition.smooth-push": {
        version: 1,
        label: "\u5E73\u6ED1\u63A8\u9875",
        category: "transition",
        targets: [
          "page"
        ],
        quality: "candidate",
        renderer: "dom",
        requires: {
          supportsDomTransition: true,
          excludesVideo: true,
          excludesEmbeddedFrame: true
        },
        params: {
          durationMs: {
            min: 300,
            max: 2e3,
            default: 800,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          direction: {
            min: 0,
            max: 3,
            default: 0,
            integer: true,
            label: "\u65B9\u5411",
            options: [
              {
                value: 0,
                label: "\u5411\u5DE6"
              },
              {
                value: 1,
                label: "\u5411\u53F3"
              },
              {
                value: 2,
                label: "\u5411\u4E0A"
              },
              {
                value: 3,
                label: "\u5411\u4E0B"
              }
            ]
          }
        }
      },
      "transition.cube-rotate": {
        version: 1,
        label: "\u7ACB\u65B9\u65CB\u8F6C",
        category: "transition",
        targets: [
          "page"
        ],
        quality: "candidate",
        renderer: "dom",
        requires: {
          supportsDomTransition: true,
          excludesVideo: true,
          excludesEmbeddedFrame: true
        },
        params: {
          durationMs: {
            min: 300,
            max: 2e3,
            default: 1e3,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          direction: {
            min: 0,
            max: 3,
            default: 0,
            integer: true,
            label: "\u65B9\u5411",
            options: [
              {
                value: 0,
                label: "\u5411\u5DE6"
              },
              {
                value: 1,
                label: "\u5411\u53F3"
              },
              {
                value: 2,
                label: "\u5411\u4E0A"
              },
              {
                value: 3,
                label: "\u5411\u4E0B"
              }
            ]
          },
          perspective: {
            min: 1.2,
            max: 4,
            default: 2.4,
            step: 0.1,
            label: "\u900F\u89C6\u8DDD\u79BB"
          }
        }
      },
      "transition.page-flip": {
        version: 1,
        label: "\u6574\u9875\u7FFB\u8F6C",
        category: "transition",
        targets: [
          "page"
        ],
        quality: "candidate",
        renderer: "dom",
        requires: {
          supportsDomTransition: true,
          excludesVideo: true,
          excludesEmbeddedFrame: true
        },
        params: {
          durationMs: {
            min: 300,
            max: 2e3,
            default: 1e3,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          direction: {
            min: 0,
            max: 3,
            default: 0,
            integer: true,
            label: "\u65B9\u5411",
            options: [
              {
                value: 0,
                label: "\u5411\u5DE6"
              },
              {
                value: 1,
                label: "\u5411\u53F3"
              },
              {
                value: 2,
                label: "\u5411\u4E0A"
              },
              {
                value: 3,
                label: "\u5411\u4E0B"
              }
            ]
          },
          perspective: {
            min: 1.2,
            max: 4,
            default: 2.4,
            step: 0.1,
            label: "\u900F\u89C6\u8DDD\u79BB"
          }
        }
      },
      "transition.layered-slices": {
        version: 1,
        label: "\u9519\u5C42\u5207\u7247",
        category: "transition",
        targets: [
          "page"
        ],
        quality: "candidate",
        renderer: "dom",
        requires: {
          supportsDomTransition: true,
          excludesVideo: true,
          excludesEmbeddedFrame: true
        },
        params: {
          durationMs: {
            min: 600,
            max: 2400,
            default: 1400,
            label: "\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",
            step: 100
          },
          direction: {
            min: 0,
            max: 3,
            default: 0,
            integer: true,
            label: "\u65B9\u5411",
            options: [
              {
                value: 0,
                label: "\u5411\u5DE6"
              },
              {
                value: 1,
                label: "\u5411\u53F3"
              },
              {
                value: 2,
                label: "\u5411\u4E0A"
              },
              {
                value: 3,
                label: "\u5411\u4E0B"
              }
            ]
          },
          slices: {
            min: 3,
            max: 7,
            default: 5,
            integer: true,
            step: 1,
            label: "\u5C42\u6570"
          },
          stagger: {
            min: 0.04,
            max: 0.3,
            default: 0.18,
            step: 0.02,
            label: "\u9519\u5F00\u8282\u594F"
          },
          offset: {
            min: 0.03,
            max: 0.2,
            default: 0.08,
            step: 0.01,
            label: "\u9519\u4F4D\u8DDD\u79BB"
          },
          feather: {
            min: 0.01,
            max: 0.08,
            default: 0.025,
            step: 5e-3,
            label: "\u67D4\u8FB9"
          }
        }
      }
    }
  };

  // src/motion/contract.mjs
  var templateSlot = (template) => template.category === "text" ? "entrance" : template.category;
  var CONTRACT = "nutbook-motion/v1";
  var idPattern = /^[A-Za-z0-9_:-]{1,80}$/;
  var fail = (path) => {
    throw new TypeError(`Invalid motion contract: ${path}`);
  };
  function object(value, keys, path) {
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(path);
    if (Object.keys(value).some((key) => !keys.includes(key)) || keys.some((key) => !Object.hasOwn(value, key))) fail(path);
  }
  function id(value, path) {
    if (typeof value !== "string" || !idPattern.test(value)) fail(path);
  }
  function list(value, max, path) {
    if (!Array.isArray(value) || value.length > max) fail(path);
  }
  function uniqueIds(values, path) {
    const seen = /* @__PURE__ */ new Set();
    for (const value of values) {
      id(value, path);
      if (seen.has(value)) fail(path);
      seen.add(value);
    }
    return seen;
  }
  function validateConfig(config) {
    object(config, ["contract", "pages"], "root");
    if (config.contract !== CONTRACT) fail("version");
    list(config.pages, 128, "pages");
    if (!config.pages.length) fail("pages");
    uniqueIds(config.pages.map((page) => page.id), "page.id");
    const targets = /* @__PURE__ */ new Set(), actions = /* @__PURE__ */ new Set();
    for (const page of config.pages) {
      object(page, ["id", "capabilities", "targets", "actions", "background", "transition"], "page");
      const caps = page.capabilities;
      object(caps, ["containsVideo", "containsEmbeddedFrame", "supportsDomTransition", "supportsFilterTransition", "mediaTargetIds", "embeddedTargetIds"], "capabilities");
      for (const key of ["containsVideo", "containsEmbeddedFrame", "supportsDomTransition", "supportsFilterTransition"]) if (typeof caps[key] !== "boolean") fail(key);
      list(page.targets, 256, "targets");
      list(page.actions, 256, "actions");
      const localTargets = /* @__PURE__ */ new Map();
      for (const target of page.targets) {
        object(target, ["id", "kind"], "target");
        id(target.id, "target.id");
        if (!["text", "image", "group", "video", "embedded"].includes(target.kind) || targets.has(target.id)) fail("target");
        targets.add(target.id);
        localTargets.set(target.id, target.kind);
      }
      for (const [key, kind, flag] of [["mediaTargetIds", "video", "containsVideo"], ["embeddedTargetIds", "embedded", "containsEmbeddedFrame"]]) {
        list(caps[key], 256, key);
        const ids = uniqueIds(caps[key], key);
        for (const targetId of ids) if (localTargets.get(targetId) !== kind) fail(key);
        for (const [targetId, targetKind] of localTargets) if (targetKind === kind && !ids.has(targetId)) fail(key);
        if (caps[flag] !== ids.size > 0) fail(flag);
      }
      for (const slot of ["background", "transition"]) if (page[slot] !== null) {
        const effect = page[slot];
        object(effect, ["id", "templateId", "templateVersion", "params", "seed"], "background");
        id(effect.id, "background.id");
        if (actions.has(effect.id)) fail("duplicate effect");
        actions.add(effect.id);
        const template = registry_default.templates[effect.templateId];
        if (!template || template.category !== slot || effect.templateVersion !== template.version) fail("background template");
        if (!Number.isInteger(effect.seed) || effect.seed < 0 || effect.seed > 4294967295) fail("background seed");
        object(effect.params, Object.keys(template.params).filter((key) => !template.params[key].optional || Object.hasOwn(effect.params, key)), "background.params");
        for (const [key, rule] of Object.entries(template.params)) {
          const value = effect.params[key] ?? (rule.optional ? rule.default : void 0);
          if (!Number.isFinite(value) || value < rule.min || value > rule.max || rule.integer && !Number.isInteger(value)) fail(`background.params.${key}`);
        }
      }
      const slots = /* @__PURE__ */ new Set();
      for (const action of page.actions) {
        object(action, ["id", "targetId", "templateId", "templateVersion", "params", "seed", "trigger", "delayMs"], "action");
        id(action.id, "action.id");
        if (actions.has(action.id)) fail("duplicate action");
        actions.add(action.id);
        const template = registry_default.templates[action.templateId];
        if (!template || action.templateVersion !== template.version || !template.targets.includes(localTargets.get(action.targetId))) fail("template target");
        const slot = `${action.targetId}:${templateSlot(template)}`;
        if (slots.has(slot)) fail("duplicate slot");
        slots.add(slot);
        if (!["click", "withPrevious", "afterPrevious"].includes(action.trigger)) fail("trigger");
        if (!Number.isInteger(action.seed) || action.seed < 0 || action.seed > 4294967295) fail("seed");
        if (!Number.isFinite(action.delayMs) || action.delayMs < 0 || action.delayMs > 6e4) fail("delay");
        object(action.params, Object.keys(template.params).filter((key) => !template.params[key].optional || Object.hasOwn(action.params, key)), "params");
        for (const [key, rule] of Object.entries(template.params)) {
          const value = Object.hasOwn(action.params, key) ? action.params[key] : rule.optional ? rule.default : void 0;
          if (!Number.isFinite(value) || value < rule.min || value > rule.max || rule.integer && !Number.isInteger(value)) fail(`params.${key}`);
        }
      }
    }
    if (new TextEncoder().encode(stableJson(config)).byteLength > 262144) fail("size");
    return config;
  }
  function stableJson(value) {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
    if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
    return JSON.stringify(value);
  }

  // src/motion/static-capture.mjs
  function settleAuthorAnimations() {
    for (const animation of document.getAnimations()) {
      const target = animation.effect?.target;
      if (!(target instanceof Element)) continue;
      const timing = animation.effect.getComputedTiming();
      if (Number.isFinite(timing.endTime)) {
        try {
          animation.finish();
        } catch {
          animation.pause();
          animation.currentTime = timing.endTime;
        }
        if (Number(getComputedStyle(target).opacity) < 0.01) {
          const frames = animation.effect.getKeyframes(), visible = frames.filter((frame) => Number.isFinite(Number(frame.opacity))).sort((a, b) => Number(b.opacity) - Number(a.opacity))[0];
          if (visible && Number(visible.opacity) > 0) {
            animation.pause();
            animation.currentTime = Number(animation.effect.getTiming().delay || 0) + Number(timing.duration) * (visible.computedOffset ?? visible.offset ?? 0);
          }
        }
      } else {
        animation.pause();
        animation.currentTime = 0;
      }
    }
  }
  var surface = null;
  window.__NUTBOOK_STATIC_CAPTURE__ = { async render(pageId) {
    surface?.dispose();
    surface = null;
    const legacy = window.__NUTBOOK_MOTION__, contract = document.documentElement.dataset.nutbookMotionContract;
    if (contract === "nutbook-motion/experimental-v1") {
      legacy?.pause?.();
      if (legacy?.seek && Number.isFinite(legacy.duration)) legacy.seek(legacy.duration);
      settleAuthorAnimations();
      return { background: false, legacy: true };
    }
    legacy?.dispose?.();
    if (contract === "nutbook-motion/v1" && document.body.dataset.outputKind === "dynamic") {
      const style2 = document.createElement("style");
      style2.dataset.nutbookCaptureFragments = "";
      style2.textContent = 'body[data-output-kind="dynamic"] .fragment{opacity:1!important;transform:none!important;pointer-events:none!important}';
      if (!document.querySelector("[data-nutbook-capture-fragments]")) document.head.append(style2);
    }
    settleAuthorAnimations();
    const node = document.querySelector("script#nutbook-motion-config");
    if (!node) return { background: false };
    const config = validateConfig(JSON.parse(node.textContent));
    const id2 = pageId || window.__NUTBOOK_PRESENTATION__?.activePageId;
    const page = config.pages.find((page2) => page2.id === id2) || (!id2 ? config.pages.find((page2) => document.querySelector(`[data-nutbook-page-id="${CSS.escape(page2.id)}"]`)?.getBoundingClientRect().width > 0) : null);
    if (!page) throw Error("static background page unavailable");
    if (!page.background) return { background: false, pageId: page.id };
    await document.fonts.ready;
    const element = document.querySelector(`[data-nutbook-page-id="${CSS.escape(page.id)}"]`);
    surface = ["background.topography", "background.gradient-waves"].includes(page.background.templateId) ? prepareStaticGpuBackground(element, page.background) : prepareBackground(element, page.background, { low: false });
    surface.render(0);
    const canvas = surface.canvas, pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    let paintedPixels = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) paintedPixels++;
    if (page.background.params.strength > 0 && !paintedPixels) throw Error("static background frame is empty");
    const png = canvas.toDataURL("image/png"), image = new Image();
    image.src = png;
    await image.decode();
    const frozen = document.createElement("div");
    frozen.dataset.nutbookMotionBackground = page.id;
    frozen.style.cssText = canvas.style.cssText;
    frozen.style.backgroundImage = `url("${png}")`;
    frozen.style.backgroundSize = "100% 100%";
    frozen.setAttribute("aria-hidden", "true");
    const style = document.querySelector("[data-nutbook-motion-background-style]")?.cloneNode(true);
    surface.dispose();
    element.prepend(frozen);
    if (style) document.head.append(style);
    surface = { dispose() {
      frozen.remove();
      style?.remove();
    } };
    return { background: true, paintedPixels, pageId: page.id, templateId: page.background.templateId };
  } };
})();
