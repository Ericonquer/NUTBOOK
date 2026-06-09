var Fc = (t) => {
  throw TypeError(t);
};
var $c = (t, e, n) => e.has(t) || Fc("Cannot " + n);
var M = (t, e, n) => ($c(t, e, "read from private field"), n ? n.call(t) : e.get(t)), j = (t, e, n) => e.has(t) ? Fc("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, n), z = (t, e, n, r) => ($c(t, e, "write to private field"), r ? r.call(t, n) : e.set(t, n), n);
var vt = /* @__PURE__ */ function(t) {
  return t.docTypeError = "docTypeError", t.contextNotFound = "contextNotFound", t.timerNotFound = "timerNotFound", t.ctxCallOutOfScope = "ctxCallOutOfScope", t.createNodeInParserFail = "createNodeInParserFail", t.stackOverFlow = "stackOverFlow", t.parserMatchError = "parserMatchError", t.serializerMatchError = "serializerMatchError", t.getAtomFromSchemaFail = "getAtomFromSchemaFail", t.expectDomTypeError = "expectDomTypeError", t.callCommandBeforeEditorView = "callCommandBeforeEditorView", t.missingRootElement = "missingRootElement", t.missingNodeInSchema = "missingNodeInSchema", t.missingMarkInSchema = "missingMarkInSchema", t.ctxNotBind = "ctxNotBind", t.missingYjsDoc = "missingYjsDoc", t.aiProviderError = "aiProviderError", t.aiBuildContextError = "aiBuildContextError", t;
}({}), It = class extends Error {
  constructor(t, e, n) {
    super(e, n), this.name = "MilkdownError", this.code = t, (n == null ? void 0 : n.cause) !== void 0 && (this.cause = n.cause);
  }
}, dy = (t, e) => typeof e == "function" ? "[Function]" : e, Ps = (t) => JSON.stringify(t, dy);
function py(t) {
  return new It(vt.docTypeError, `Doc type error, unsupported type: ${Ps(t)}`);
}
function my(t) {
  return new It(vt.contextNotFound, `Context "${t}" not found, do you forget to inject it?`);
}
function gy(t) {
  return new It(vt.timerNotFound, `Timer "${t}" not found, do you forget to record it?`);
}
function Bs() {
  return new It(vt.ctxCallOutOfScope, "Should not call a context out of the plugin.");
}
function yy(t, e, n) {
  const r = `Cannot create node for ${"name" in t ? t.name : t}`, i = (s) => {
    if (s == null) return "null";
    if (Array.isArray(s)) return `[${s.map(i).join(", ")}]`;
    if (typeof s == "object")
      return "toJSON" in s && typeof s.toJSON == "function" ? JSON.stringify(s.toJSON()) : "spec" in s ? JSON.stringify(s.spec) : JSON.stringify(s);
    if (typeof s == "string" || typeof s == "number" || typeof s == "boolean") return JSON.stringify(s);
    if (typeof s == "function") return `[Function: ${s.name || "anonymous"}]`;
    try {
      return String(s);
    } catch {
      return "[Unserializable]";
    }
  }, o = [
    ["[Description]", r],
    ["[Attributes]", e],
    ["[Content]", (n ?? []).map((s) => s ? typeof s == "object" && "type" in s ? `${s}` : i(s) : "null")]
  ].reduce((s, [l, a]) => {
    const u = `${l}: ${i(a)}.`;
    return s.concat(u);
  }, []);
  return new It(vt.createNodeInParserFail, o.join(`
`));
}
function Qh() {
  return new It(vt.stackOverFlow, "Stack over flow, cannot pop on an empty stack.");
}
function ky(t) {
  return new It(vt.parserMatchError, `Cannot match target parser for node: ${Ps(t)}.`);
}
function by(t) {
  return new It(vt.serializerMatchError, `Cannot match target serializer for node: ${Ps(t)}.`);
}
function qt(t) {
  return new It(vt.expectDomTypeError, `Expect to be a dom, but get: ${Ps(t)}.`);
}
function sl() {
  return new It(vt.callCommandBeforeEditorView, "You're trying to call a command before editor view initialized, make sure to get commandManager from ctx after editor view has been initialized");
}
function wy(t) {
  return new It(vt.missingNodeInSchema, `Missing node in schema, milkdown cannot find "${t}" in schema.`);
}
function xy(t) {
  return new It(vt.missingMarkInSchema, `Missing mark in schema, milkdown cannot find "${t}" in schema.`);
}
var Xh = class {
  constructor() {
    this.sliceMap = /* @__PURE__ */ new Map(), this.get = (t) => {
      const e = typeof t == "string" ? [...this.sliceMap.values()].find((n) => n.type.name === t) : this.sliceMap.get(t.id);
      if (!e) throw my(typeof t == "string" ? t : t.name);
      return e;
    }, this.remove = (t) => {
      const e = typeof t == "string" ? [...this.sliceMap.values()].find((n) => n.type.name === t) : this.sliceMap.get(t.id);
      e && this.sliceMap.delete(e.type.id);
    }, this.has = (t) => typeof t == "string" ? [...this.sliceMap.values()].some((e) => e.type.name === t) : this.sliceMap.has(t.id);
  }
}, Et, tn, $r, Kh, Cy = (Kh = class {
  constructor(e, n, r) {
    j(this, Et);
    j(this, tn);
    j(this, $r);
    z(this, Et, []), z(this, $r, () => {
      M(this, Et).forEach((i) => i(M(this, tn)));
    }), this.set = (i) => {
      z(this, tn, i), M(this, $r).call(this);
    }, this.get = () => M(this, tn), this.update = (i) => {
      z(this, tn, i(M(this, tn))), M(this, $r).call(this);
    }, this.type = r, z(this, tn, n), e.set(r.id, this);
  }
  on(e) {
    return M(this, Et).push(e), () => {
      z(this, Et, M(this, Et).filter((n) => n !== e));
    };
  }
  once(e) {
    const n = this.on((r) => {
      e(r), n();
    });
    return n;
  }
  off(e) {
    z(this, Et, M(this, Et).filter((n) => n !== e));
  }
  offAll() {
    z(this, Et, []);
  }
}, Et = new WeakMap(), tn = new WeakMap(), $r = new WeakMap(), Kh), Sy = class {
  constructor(t, e) {
    this.id = Symbol(`Context-${e}`), this.name = e, this._defaultValue = t, this._typeInfo = () => {
      throw Bs();
    };
  }
  create(t, e = this._defaultValue) {
    return new Cy(t, e, this);
  }
}, oe = (t, e) => new Sy(t, e), io, oo, so, Xn, _r, An, Vr, Hr, jr, Uh, My = (Uh = class {
  constructor(t, e, n) {
    j(this, io);
    j(this, oo);
    j(this, so);
    j(this, Xn);
    j(this, _r);
    j(this, An);
    j(this, Vr);
    j(this, Hr);
    j(this, jr);
    z(this, Xn, /* @__PURE__ */ new Set()), z(this, _r, /* @__PURE__ */ new Set()), z(this, An, /* @__PURE__ */ new Map()), z(this, Vr, /* @__PURE__ */ new Map()), this.read = () => ({
      metadata: M(this, io),
      injectedSlices: [...M(this, Xn)].map((r) => ({
        name: typeof r == "string" ? r : r.name,
        value: M(this, Hr).call(this, r)
      })),
      consumedSlices: [...M(this, _r)].map((r) => ({
        name: typeof r == "string" ? r : r.name,
        value: M(this, Hr).call(this, r)
      })),
      recordedTimers: [...M(this, An)].map(([r, { duration: i }]) => ({
        name: r.name,
        duration: i,
        status: M(this, jr).call(this, r)
      })),
      waitTimers: [...M(this, Vr)].map(([r, { duration: i }]) => ({
        name: r.name,
        duration: i,
        status: M(this, jr).call(this, r)
      }))
    }), this.onRecord = (r) => {
      M(this, An).set(r, {
        start: Date.now(),
        duration: 0
      });
    }, this.onClear = (r) => {
      M(this, An).delete(r);
    }, this.onDone = (r) => {
      const i = M(this, An).get(r);
      i && (i.duration = Date.now() - i.start);
    }, this.onWait = (r, i) => {
      const o = Date.now();
      i.finally(() => {
        M(this, Vr).set(r, { duration: Date.now() - o });
      }).catch(console.error);
    }, this.onInject = (r) => {
      M(this, Xn).add(r);
    }, this.onRemove = (r) => {
      M(this, Xn).delete(r);
    }, this.onUse = (r) => {
      M(this, _r).add(r);
    }, z(this, Hr, (r) => M(this, oo).get(r).get()), z(this, jr, (r) => M(this, so).get(r).status), z(this, oo, t), z(this, so, e), z(this, io, n);
  }
}, io = new WeakMap(), oo = new WeakMap(), so = new WeakMap(), Xn = new WeakMap(), _r = new WeakMap(), An = new WeakMap(), Vr = new WeakMap(), Hr = new WeakMap(), jr = new WeakMap(), Uh), nn, rn, lo, wt, qr, Ny = (qr = class {
  constructor(e, n, r) {
    j(this, nn);
    j(this, rn);
    j(this, lo);
    j(this, wt);
    this.produce = (i) => i && Object.keys(i).length ? new qr(M(this, nn), M(this, rn), { ...i }) : this, this.inject = (i, o) => {
      var l;
      const s = i.create(M(this, nn).sliceMap);
      return o != null && s.set(o), (l = M(this, wt)) == null || l.onInject(i), this;
    }, this.remove = (i) => {
      var o;
      return M(this, nn).remove(i), (o = M(this, wt)) == null || o.onRemove(i), this;
    }, this.record = (i) => {
      var o;
      return i.create(M(this, rn).store), (o = M(this, wt)) == null || o.onRecord(i), this;
    }, this.clearTimer = (i) => {
      var o;
      return M(this, rn).remove(i), (o = M(this, wt)) == null || o.onClear(i), this;
    }, this.isInjected = (i) => M(this, nn).has(i), this.isRecorded = (i) => M(this, rn).has(i), this.use = (i) => {
      var o;
      return (o = M(this, wt)) == null || o.onUse(i), M(this, nn).get(i);
    }, this.get = (i) => this.use(i).get(), this.set = (i, o) => this.use(i).set(o), this.update = (i, o) => this.use(i).update(o), this.timer = (i) => M(this, rn).get(i), this.done = (i) => {
      var o;
      this.timer(i).done(), (o = M(this, wt)) == null || o.onDone(i);
    }, this.wait = (i) => {
      var s;
      const o = this.timer(i).start();
      return (s = M(this, wt)) == null || s.onWait(i, o), o;
    }, this.waitTimers = async (i) => {
      await Promise.all(this.get(i).map((o) => this.wait(o)));
    }, z(this, nn, e), z(this, rn, n), z(this, lo, r), r && z(this, wt, new My(e, n, r));
  }
  get meta() {
    return M(this, lo);
  }
  get inspector() {
    return M(this, wt);
  }
}, nn = new WeakMap(), rn = new WeakMap(), lo = new WeakMap(), wt = new WeakMap(), qr), Ty = class {
  constructor() {
    this.store = /* @__PURE__ */ new Map(), this.get = (t) => {
      const e = this.store.get(t.id);
      if (!e) throw gy(t.name);
      return e;
    }, this.remove = (t) => {
      this.store.delete(t.id);
    }, this.has = (t) => this.store.has(t.id);
  }
}, Wr, On, Kr, on, Ur, ao, Jh, vy = (Jh = class {
  constructor(t, e) {
    j(this, Wr);
    j(this, On);
    j(this, Kr);
    j(this, on);
    j(this, Ur);
    j(this, ao);
    z(this, Wr, null), z(this, On, null), z(this, on, "pending"), this.start = () => (M(this, Wr) ?? z(this, Wr, new Promise((n, r) => {
      z(this, On, (i) => {
        i instanceof CustomEvent && i.detail.id === M(this, Kr) && (z(this, on, "resolved"), M(this, Ur).call(this), i.stopImmediatePropagation(), n());
      }), M(this, ao).call(this, () => {
        M(this, on) === "pending" && z(this, on, "rejected"), M(this, Ur).call(this), r(/* @__PURE__ */ new Error(`Timing ${this.type.name} timeout.`));
      }), z(this, on, "pending"), addEventListener(this.type.name, M(this, On));
    })), M(this, Wr)), this.done = () => {
      const n = new CustomEvent(this.type.name, { detail: { id: M(this, Kr) } });
      dispatchEvent(n);
    }, z(this, Ur, () => {
      M(this, On) && removeEventListener(this.type.name, M(this, On));
    }), z(this, ao, (n) => {
      setTimeout(() => {
        n();
      }, this.type.timeout);
    }), z(this, Kr, Symbol(e.name)), this.type = e, t.set(e.id, this);
  }
  get status() {
    return M(this, on);
  }
}, Wr = new WeakMap(), On = new WeakMap(), Kr = new WeakMap(), on = new WeakMap(), Ur = new WeakMap(), ao = new WeakMap(), Jh), Iy = class {
  constructor(t, e = 3e3) {
    this.create = (n) => new vy(n, this), this.id = Symbol(`Timer-${t}`), this.name = t, this.timeout = e;
  }
}, Wt = (t, e = 3e3) => new Iy(t, e);
const Ey = {};
function Wa(t, e) {
  const n = Ey, r = typeof n.includeImageAlt == "boolean" ? n.includeImageAlt : !0, i = typeof n.includeHtml == "boolean" ? n.includeHtml : !0;
  return Zh(t, r, i);
}
function Zh(t, e, n) {
  if (Ay(t)) {
    if ("value" in t)
      return t.type === "html" && !n ? "" : t.value;
    if (e && "alt" in t && t.alt)
      return t.alt;
    if ("children" in t)
      return _c(t.children, e, n);
  }
  return Array.isArray(t) ? _c(t, e, n) : "";
}
function _c(t, e, n) {
  const r = [];
  let i = -1;
  for (; ++i < t.length; )
    r[i] = Zh(t[i], e, n);
  return r.join("");
}
function Ay(t) {
  return !!(t && typeof t == "object");
}
const Vc = document.createElement("i");
function Ka(t) {
  const e = "&" + t + ";";
  Vc.innerHTML = e;
  const n = Vc.textContent;
  return n.charCodeAt(n.length - 1) === 59 && t !== "semi" || n === e ? !1 : n;
}
function dt(t, e, n, r) {
  const i = t.length;
  let o = 0, s;
  if (e < 0 ? e = -e > i ? 0 : i + e : e = e > i ? i : e, n = n > 0 ? n : 0, r.length < 1e4)
    s = Array.from(r), s.unshift(e, n), t.splice(...s);
  else
    for (n && t.splice(e, n); o < r.length; )
      s = r.slice(o, o + 1e4), s.unshift(e, 0), t.splice(...s), o += 1e4, e += 1e4;
}
function St(t, e) {
  return t.length > 0 ? (dt(t, t.length, 0, e), t) : e;
}
const Hc = {}.hasOwnProperty;
function ed(t) {
  const e = {};
  let n = -1;
  for (; ++n < t.length; )
    Oy(e, t[n]);
  return e;
}
function Oy(t, e) {
  let n;
  for (n in e) {
    const i = (Hc.call(t, n) ? t[n] : void 0) || (t[n] = {}), o = e[n];
    let s;
    if (o)
      for (s in o) {
        Hc.call(i, s) || (i[s] = []);
        const l = o[s];
        Dy(
          // @ts-expect-error Looks like a list.
          i[s],
          Array.isArray(l) ? l : l ? [l] : []
        );
      }
  }
}
function Dy(t, e) {
  let n = -1;
  const r = [];
  for (; ++n < e.length; )
    (e[n].add === "after" ? t : r).push(e[n]);
  dt(t, 0, 0, r);
}
function td(t, e) {
  const n = Number.parseInt(t, e);
  return (
    // C0 except for HT, LF, FF, CR, space.
    n < 9 || n === 11 || n > 13 && n < 32 || // Control character (DEL) of C0, and C1 controls.
    n > 126 && n < 160 || // Lone high surrogates and low surrogates.
    n > 55295 && n < 57344 || // Noncharacters.
    n > 64975 && n < 65008 || /* eslint-disable no-bitwise */
    (n & 65535) === 65535 || (n & 65535) === 65534 || /* eslint-enable no-bitwise */
    // Out of range
    n > 1114111 ? "�" : String.fromCodePoint(n)
  );
}
function Dt(t) {
  return t.replace(/[\t\n\r ]+/g, " ").replace(/^ | $/g, "").toLowerCase().toUpperCase();
}
const We = qn(/[A-Za-z]/), rt = qn(/[\dA-Za-z]/), Ry = qn(/[#-'*+\--9=?A-Z^-~]/);
function ks(t) {
  return (
    // Special whitespace codes (which have negative values), C0 and Control
    // character DEL
    t !== null && (t < 32 || t === 127)
  );
}
const ra = qn(/\d/), Ly = qn(/[\dA-Fa-f]/), zy = qn(/[!-/:-@[-`{-~]/);
function J(t) {
  return t !== null && t < -2;
}
function pe(t) {
  return t !== null && (t < 0 || t === 32);
}
function re(t) {
  return t === -2 || t === -1 || t === 32;
}
const Fs = qn(new RegExp("[\\u0021-\\u002F\\u003A-\\u0040\\u005B-\\u0060\\u007B-\\u007E]")), gr = qn(/\s/);
function qn(t) {
  return e;
  function e(n) {
    return n !== null && n > -1 && t.test(String.fromCharCode(n));
  }
}
function ae(t, e, n, r) {
  const i = r ? r - 1 : Number.POSITIVE_INFINITY;
  let o = 0;
  return s;
  function s(a) {
    return re(a) ? (t.enter(n), l(a)) : e(a);
  }
  function l(a) {
    return re(a) && o++ < i ? (t.consume(a), l) : (t.exit(n), e(a));
  }
}
const Py = {
  tokenize: By
};
function By(t) {
  const e = t.attempt(this.parser.constructs.contentInitial, r, i);
  let n;
  return e;
  function r(l) {
    if (l === null) {
      t.consume(l);
      return;
    }
    return t.enter("lineEnding"), t.consume(l), t.exit("lineEnding"), ae(t, e, "linePrefix");
  }
  function i(l) {
    return t.enter("paragraph"), o(l);
  }
  function o(l) {
    const a = t.enter("chunkText", {
      contentType: "text",
      previous: n
    });
    return n && (n.next = a), n = a, s(l);
  }
  function s(l) {
    if (l === null) {
      t.exit("chunkText"), t.exit("paragraph"), t.consume(l);
      return;
    }
    return J(l) ? (t.consume(l), t.exit("chunkText"), o) : (t.consume(l), s);
  }
}
const Fy = {
  tokenize: $y
}, jc = {
  tokenize: _y
};
function $y(t) {
  const e = this, n = [];
  let r = 0, i, o, s;
  return l;
  function l(T) {
    if (r < n.length) {
      const V = n[r];
      return e.containerState = V[1], t.attempt(V[0].continuation, a, u)(T);
    }
    return u(T);
  }
  function a(T) {
    if (r++, e.containerState._closeFlow) {
      e.containerState._closeFlow = void 0, i && O();
      const V = e.events.length;
      let _ = V, S;
      for (; _--; )
        if (e.events[_][0] === "exit" && e.events[_][1].type === "chunkFlow") {
          S = e.events[_][1].end;
          break;
        }
      y(r);
      let R = V;
      for (; R < e.events.length; )
        e.events[R][1].end = {
          ...S
        }, R++;
      return dt(e.events, _ + 1, 0, e.events.slice(V)), e.events.length = R, u(T);
    }
    return l(T);
  }
  function u(T) {
    if (r === n.length) {
      if (!i)
        return h(T);
      if (i.currentConstruct && i.currentConstruct.concrete)
        return p(T);
      e.interrupt = !!(i.currentConstruct && !i._gfmTableDynamicInterruptHack);
    }
    return e.containerState = {}, t.check(jc, c, f)(T);
  }
  function c(T) {
    return i && O(), y(r), h(T);
  }
  function f(T) {
    return e.parser.lazy[e.now().line] = r !== n.length, s = e.now().offset, p(T);
  }
  function h(T) {
    return e.containerState = {}, t.attempt(jc, d, p)(T);
  }
  function d(T) {
    return r++, n.push([e.currentConstruct, e.containerState]), h(T);
  }
  function p(T) {
    if (T === null) {
      i && O(), y(0), t.consume(T);
      return;
    }
    return i = i || e.parser.flow(e.now()), t.enter("chunkFlow", {
      _tokenizer: i,
      contentType: "flow",
      previous: o
    }), m(T);
  }
  function m(T) {
    if (T === null) {
      k(t.exit("chunkFlow"), !0), y(0), t.consume(T);
      return;
    }
    return J(T) ? (t.consume(T), k(t.exit("chunkFlow")), r = 0, e.interrupt = void 0, l) : (t.consume(T), m);
  }
  function k(T, V) {
    const _ = e.sliceStream(T);
    if (V && _.push(null), T.previous = o, o && (o.next = T), o = T, i.defineSkip(T.start), i.write(_), e.parser.lazy[T.start.line]) {
      let S = i.events.length;
      for (; S--; )
        if (
          // The token starts before the line ending…
          i.events[S][1].start.offset < s && // …and either is not ended yet…
          (!i.events[S][1].end || // …or ends after it.
          i.events[S][1].end.offset > s)
        )
          return;
      const R = e.events.length;
      let q = R, U, N;
      for (; q--; )
        if (e.events[q][0] === "exit" && e.events[q][1].type === "chunkFlow") {
          if (U) {
            N = e.events[q][1].end;
            break;
          }
          U = !0;
        }
      for (y(r), S = R; S < e.events.length; )
        e.events[S][1].end = {
          ...N
        }, S++;
      dt(e.events, q + 1, 0, e.events.slice(R)), e.events.length = S;
    }
  }
  function y(T) {
    let V = n.length;
    for (; V-- > T; ) {
      const _ = n[V];
      e.containerState = _[1], _[0].exit.call(e, t);
    }
    n.length = T;
  }
  function O() {
    i.write([null]), o = void 0, i = void 0, e.containerState._closeFlow = void 0;
  }
}
function _y(t, e, n) {
  return ae(t, t.attempt(this.parser.constructs.document, e, n), "linePrefix", this.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4);
}
function oi(t) {
  if (t === null || pe(t) || gr(t))
    return 1;
  if (Fs(t))
    return 2;
}
function $s(t, e, n) {
  const r = [];
  let i = -1;
  for (; ++i < t.length; ) {
    const o = t[i].resolveAll;
    o && !r.includes(o) && (e = o(e, n), r.push(o));
  }
  return e;
}
const ia = {
  name: "attention",
  resolveAll: Vy,
  tokenize: Hy
};
function Vy(t, e) {
  let n = -1, r, i, o, s, l, a, u, c;
  for (; ++n < t.length; )
    if (t[n][0] === "enter" && t[n][1].type === "attentionSequence" && t[n][1]._close) {
      for (r = n; r--; )
        if (t[r][0] === "exit" && t[r][1].type === "attentionSequence" && t[r][1]._open && // If the markers are the same:
        e.sliceSerialize(t[r][1]).charCodeAt(0) === e.sliceSerialize(t[n][1]).charCodeAt(0)) {
          if ((t[r][1]._close || t[n][1]._open) && (t[n][1].end.offset - t[n][1].start.offset) % 3 && !((t[r][1].end.offset - t[r][1].start.offset + t[n][1].end.offset - t[n][1].start.offset) % 3))
            continue;
          a = t[r][1].end.offset - t[r][1].start.offset > 1 && t[n][1].end.offset - t[n][1].start.offset > 1 ? 2 : 1;
          const f = {
            ...t[r][1].end
          }, h = {
            ...t[n][1].start
          };
          qc(f, -a), qc(h, a), s = {
            type: a > 1 ? "strongSequence" : "emphasisSequence",
            start: f,
            end: {
              ...t[r][1].end
            }
          }, l = {
            type: a > 1 ? "strongSequence" : "emphasisSequence",
            start: {
              ...t[n][1].start
            },
            end: h
          }, o = {
            type: a > 1 ? "strongText" : "emphasisText",
            start: {
              ...t[r][1].end
            },
            end: {
              ...t[n][1].start
            }
          }, i = {
            type: a > 1 ? "strong" : "emphasis",
            start: {
              ...s.start
            },
            end: {
              ...l.end
            }
          }, t[r][1].end = {
            ...s.start
          }, t[n][1].start = {
            ...l.end
          }, u = [], t[r][1].end.offset - t[r][1].start.offset && (u = St(u, [["enter", t[r][1], e], ["exit", t[r][1], e]])), u = St(u, [["enter", i, e], ["enter", s, e], ["exit", s, e], ["enter", o, e]]), u = St(u, $s(e.parser.constructs.insideSpan.null, t.slice(r + 1, n), e)), u = St(u, [["exit", o, e], ["enter", l, e], ["exit", l, e], ["exit", i, e]]), t[n][1].end.offset - t[n][1].start.offset ? (c = 2, u = St(u, [["enter", t[n][1], e], ["exit", t[n][1], e]])) : c = 0, dt(t, r - 1, n - r + 3, u), n = r + u.length - c - 2;
          break;
        }
    }
  for (n = -1; ++n < t.length; )
    t[n][1].type === "attentionSequence" && (t[n][1].type = "data");
  return t;
}
function Hy(t, e) {
  const n = this.parser.constructs.attentionMarkers.null, r = this.previous, i = oi(r);
  let o;
  return s;
  function s(a) {
    return o = a, t.enter("attentionSequence"), l(a);
  }
  function l(a) {
    if (a === o)
      return t.consume(a), l;
    const u = t.exit("attentionSequence"), c = oi(a), f = !c || c === 2 && i || n.includes(a), h = !i || i === 2 && c || n.includes(r);
    return u._open = !!(o === 42 ? f : f && (i || !h)), u._close = !!(o === 42 ? h : h && (c || !f)), e(a);
  }
}
function qc(t, e) {
  t.column += e, t.offset += e, t._bufferIndex += e;
}
const jy = {
  name: "autolink",
  tokenize: qy
};
function qy(t, e, n) {
  let r = 0;
  return i;
  function i(d) {
    return t.enter("autolink"), t.enter("autolinkMarker"), t.consume(d), t.exit("autolinkMarker"), t.enter("autolinkProtocol"), o;
  }
  function o(d) {
    return We(d) ? (t.consume(d), s) : d === 64 ? n(d) : u(d);
  }
  function s(d) {
    return d === 43 || d === 45 || d === 46 || rt(d) ? (r = 1, l(d)) : u(d);
  }
  function l(d) {
    return d === 58 ? (t.consume(d), r = 0, a) : (d === 43 || d === 45 || d === 46 || rt(d)) && r++ < 32 ? (t.consume(d), l) : (r = 0, u(d));
  }
  function a(d) {
    return d === 62 ? (t.exit("autolinkProtocol"), t.enter("autolinkMarker"), t.consume(d), t.exit("autolinkMarker"), t.exit("autolink"), e) : d === null || d === 32 || d === 60 || ks(d) ? n(d) : (t.consume(d), a);
  }
  function u(d) {
    return d === 64 ? (t.consume(d), c) : Ry(d) ? (t.consume(d), u) : n(d);
  }
  function c(d) {
    return rt(d) ? f(d) : n(d);
  }
  function f(d) {
    return d === 46 ? (t.consume(d), r = 0, c) : d === 62 ? (t.exit("autolinkProtocol").type = "autolinkEmail", t.enter("autolinkMarker"), t.consume(d), t.exit("autolinkMarker"), t.exit("autolink"), e) : h(d);
  }
  function h(d) {
    if ((d === 45 || rt(d)) && r++ < 63) {
      const p = d === 45 ? h : f;
      return t.consume(d), p;
    }
    return n(d);
  }
}
const So = {
  partial: !0,
  tokenize: Wy
};
function Wy(t, e, n) {
  return r;
  function r(o) {
    return re(o) ? ae(t, i, "linePrefix")(o) : i(o);
  }
  function i(o) {
    return o === null || J(o) ? e(o) : n(o);
  }
}
const nd = {
  continuation: {
    tokenize: Uy
  },
  exit: Jy,
  name: "blockQuote",
  tokenize: Ky
};
function Ky(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    if (s === 62) {
      const l = r.containerState;
      return l.open || (t.enter("blockQuote", {
        _container: !0
      }), l.open = !0), t.enter("blockQuotePrefix"), t.enter("blockQuoteMarker"), t.consume(s), t.exit("blockQuoteMarker"), o;
    }
    return n(s);
  }
  function o(s) {
    return re(s) ? (t.enter("blockQuotePrefixWhitespace"), t.consume(s), t.exit("blockQuotePrefixWhitespace"), t.exit("blockQuotePrefix"), e) : (t.exit("blockQuotePrefix"), e(s));
  }
}
function Uy(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return re(s) ? ae(t, o, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(s) : o(s);
  }
  function o(s) {
    return t.attempt(nd, e, n)(s);
  }
}
function Jy(t) {
  t.exit("blockQuote");
}
const rd = {
  name: "characterEscape",
  tokenize: Gy
};
function Gy(t, e, n) {
  return r;
  function r(o) {
    return t.enter("characterEscape"), t.enter("escapeMarker"), t.consume(o), t.exit("escapeMarker"), i;
  }
  function i(o) {
    return zy(o) ? (t.enter("characterEscapeValue"), t.consume(o), t.exit("characterEscapeValue"), t.exit("characterEscape"), e) : n(o);
  }
}
const id = {
  name: "characterReference",
  tokenize: Yy
};
function Yy(t, e, n) {
  const r = this;
  let i = 0, o, s;
  return l;
  function l(f) {
    return t.enter("characterReference"), t.enter("characterReferenceMarker"), t.consume(f), t.exit("characterReferenceMarker"), a;
  }
  function a(f) {
    return f === 35 ? (t.enter("characterReferenceMarkerNumeric"), t.consume(f), t.exit("characterReferenceMarkerNumeric"), u) : (t.enter("characterReferenceValue"), o = 31, s = rt, c(f));
  }
  function u(f) {
    return f === 88 || f === 120 ? (t.enter("characterReferenceMarkerHexadecimal"), t.consume(f), t.exit("characterReferenceMarkerHexadecimal"), t.enter("characterReferenceValue"), o = 6, s = Ly, c) : (t.enter("characterReferenceValue"), o = 7, s = ra, c(f));
  }
  function c(f) {
    if (f === 59 && i) {
      const h = t.exit("characterReferenceValue");
      return s === rt && !Ka(r.sliceSerialize(h)) ? n(f) : (t.enter("characterReferenceMarker"), t.consume(f), t.exit("characterReferenceMarker"), t.exit("characterReference"), e);
    }
    return s(f) && i++ < o ? (t.consume(f), c) : n(f);
  }
}
const Wc = {
  partial: !0,
  tokenize: Xy
}, Kc = {
  concrete: !0,
  name: "codeFenced",
  tokenize: Qy
};
function Qy(t, e, n) {
  const r = this, i = {
    partial: !0,
    tokenize: _
  };
  let o = 0, s = 0, l;
  return a;
  function a(S) {
    return u(S);
  }
  function u(S) {
    const R = r.events[r.events.length - 1];
    return o = R && R[1].type === "linePrefix" ? R[2].sliceSerialize(R[1], !0).length : 0, l = S, t.enter("codeFenced"), t.enter("codeFencedFence"), t.enter("codeFencedFenceSequence"), c(S);
  }
  function c(S) {
    return S === l ? (s++, t.consume(S), c) : s < 3 ? n(S) : (t.exit("codeFencedFenceSequence"), re(S) ? ae(t, f, "whitespace")(S) : f(S));
  }
  function f(S) {
    return S === null || J(S) ? (t.exit("codeFencedFence"), r.interrupt ? e(S) : t.check(Wc, m, V)(S)) : (t.enter("codeFencedFenceInfo"), t.enter("chunkString", {
      contentType: "string"
    }), h(S));
  }
  function h(S) {
    return S === null || J(S) ? (t.exit("chunkString"), t.exit("codeFencedFenceInfo"), f(S)) : re(S) ? (t.exit("chunkString"), t.exit("codeFencedFenceInfo"), ae(t, d, "whitespace")(S)) : S === 96 && S === l ? n(S) : (t.consume(S), h);
  }
  function d(S) {
    return S === null || J(S) ? f(S) : (t.enter("codeFencedFenceMeta"), t.enter("chunkString", {
      contentType: "string"
    }), p(S));
  }
  function p(S) {
    return S === null || J(S) ? (t.exit("chunkString"), t.exit("codeFencedFenceMeta"), f(S)) : S === 96 && S === l ? n(S) : (t.consume(S), p);
  }
  function m(S) {
    return t.attempt(i, V, k)(S);
  }
  function k(S) {
    return t.enter("lineEnding"), t.consume(S), t.exit("lineEnding"), y;
  }
  function y(S) {
    return o > 0 && re(S) ? ae(t, O, "linePrefix", o + 1)(S) : O(S);
  }
  function O(S) {
    return S === null || J(S) ? t.check(Wc, m, V)(S) : (t.enter("codeFlowValue"), T(S));
  }
  function T(S) {
    return S === null || J(S) ? (t.exit("codeFlowValue"), O(S)) : (t.consume(S), T);
  }
  function V(S) {
    return t.exit("codeFenced"), e(S);
  }
  function _(S, R, q) {
    let U = 0;
    return N;
    function N(te) {
      return S.enter("lineEnding"), S.consume(te), S.exit("lineEnding"), P;
    }
    function P(te) {
      return S.enter("codeFencedFence"), re(te) ? ae(S, H, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(te) : H(te);
    }
    function H(te) {
      return te === l ? (S.enter("codeFencedFenceSequence"), W(te)) : q(te);
    }
    function W(te) {
      return te === l ? (U++, S.consume(te), W) : U >= s ? (S.exit("codeFencedFenceSequence"), re(te) ? ae(S, se, "whitespace")(te) : se(te)) : q(te);
    }
    function se(te) {
      return te === null || J(te) ? (S.exit("codeFencedFence"), R(te)) : q(te);
    }
  }
}
function Xy(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return s === null ? n(s) : (t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), o);
  }
  function o(s) {
    return r.parser.lazy[r.now().line] ? n(s) : e(s);
  }
}
const ll = {
  name: "codeIndented",
  tokenize: ek
}, Zy = {
  partial: !0,
  tokenize: tk
};
function ek(t, e, n) {
  const r = this;
  return i;
  function i(u) {
    return t.enter("codeIndented"), ae(t, o, "linePrefix", 5)(u);
  }
  function o(u) {
    const c = r.events[r.events.length - 1];
    return c && c[1].type === "linePrefix" && c[2].sliceSerialize(c[1], !0).length >= 4 ? s(u) : n(u);
  }
  function s(u) {
    return u === null ? a(u) : J(u) ? t.attempt(Zy, s, a)(u) : (t.enter("codeFlowValue"), l(u));
  }
  function l(u) {
    return u === null || J(u) ? (t.exit("codeFlowValue"), s(u)) : (t.consume(u), l);
  }
  function a(u) {
    return t.exit("codeIndented"), e(u);
  }
}
function tk(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return r.parser.lazy[r.now().line] ? n(s) : J(s) ? (t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), i) : ae(t, o, "linePrefix", 5)(s);
  }
  function o(s) {
    const l = r.events[r.events.length - 1];
    return l && l[1].type === "linePrefix" && l[2].sliceSerialize(l[1], !0).length >= 4 ? e(s) : J(s) ? i(s) : n(s);
  }
}
const nk = {
  name: "codeText",
  previous: ik,
  resolve: rk,
  tokenize: ok
};
function rk(t) {
  let e = t.length - 4, n = 3, r, i;
  if ((t[n][1].type === "lineEnding" || t[n][1].type === "space") && (t[e][1].type === "lineEnding" || t[e][1].type === "space")) {
    for (r = n; ++r < e; )
      if (t[r][1].type === "codeTextData") {
        t[n][1].type = "codeTextPadding", t[e][1].type = "codeTextPadding", n += 2, e -= 2;
        break;
      }
  }
  for (r = n - 1, e++; ++r <= e; )
    i === void 0 ? r !== e && t[r][1].type !== "lineEnding" && (i = r) : (r === e || t[r][1].type === "lineEnding") && (t[i][1].type = "codeTextData", r !== i + 2 && (t[i][1].end = t[r - 1][1].end, t.splice(i + 2, r - i - 2), e -= r - i - 2, r = i + 2), i = void 0);
  return t;
}
function ik(t) {
  return t !== 96 || this.events[this.events.length - 1][1].type === "characterEscape";
}
function ok(t, e, n) {
  let r = 0, i, o;
  return s;
  function s(f) {
    return t.enter("codeText"), t.enter("codeTextSequence"), l(f);
  }
  function l(f) {
    return f === 96 ? (t.consume(f), r++, l) : (t.exit("codeTextSequence"), a(f));
  }
  function a(f) {
    return f === null ? n(f) : f === 32 ? (t.enter("space"), t.consume(f), t.exit("space"), a) : f === 96 ? (o = t.enter("codeTextSequence"), i = 0, c(f)) : J(f) ? (t.enter("lineEnding"), t.consume(f), t.exit("lineEnding"), a) : (t.enter("codeTextData"), u(f));
  }
  function u(f) {
    return f === null || f === 32 || f === 96 || J(f) ? (t.exit("codeTextData"), a(f)) : (t.consume(f), u);
  }
  function c(f) {
    return f === 96 ? (t.consume(f), i++, c) : i === r ? (t.exit("codeTextSequence"), t.exit("codeText"), e(f)) : (o.type = "codeTextData", u(f));
  }
}
class sk {
  /**
   * @param {ReadonlyArray<T> | null | undefined} [initial]
   *   Initial items (optional).
   * @returns
   *   Splice buffer.
   */
  constructor(e) {
    this.left = e ? [...e] : [], this.right = [];
  }
  /**
   * Array access;
   * does not move the cursor.
   *
   * @param {number} index
   *   Index.
   * @return {T}
   *   Item.
   */
  get(e) {
    if (e < 0 || e >= this.left.length + this.right.length)
      throw new RangeError("Cannot access index `" + e + "` in a splice buffer of size `" + (this.left.length + this.right.length) + "`");
    return e < this.left.length ? this.left[e] : this.right[this.right.length - e + this.left.length - 1];
  }
  /**
   * The length of the splice buffer, one greater than the largest index in the
   * array.
   */
  get length() {
    return this.left.length + this.right.length;
  }
  /**
   * Remove and return `list[0]`;
   * moves the cursor to `0`.
   *
   * @returns {T | undefined}
   *   Item, optional.
   */
  shift() {
    return this.setCursor(0), this.right.pop();
  }
  /**
   * Slice the buffer to get an array;
   * does not move the cursor.
   *
   * @param {number} start
   *   Start.
   * @param {number | null | undefined} [end]
   *   End (optional).
   * @returns {Array<T>}
   *   Array of items.
   */
  slice(e, n) {
    const r = n ?? Number.POSITIVE_INFINITY;
    return r < this.left.length ? this.left.slice(e, r) : e > this.left.length ? this.right.slice(this.right.length - r + this.left.length, this.right.length - e + this.left.length).reverse() : this.left.slice(e).concat(this.right.slice(this.right.length - r + this.left.length).reverse());
  }
  /**
   * Mimics the behavior of Array.prototype.splice() except for the change of
   * interface necessary to avoid segfaults when patching in very large arrays.
   *
   * This operation moves cursor is moved to `start` and results in the cursor
   * placed after any inserted items.
   *
   * @param {number} start
   *   Start;
   *   zero-based index at which to start changing the array;
   *   negative numbers count backwards from the end of the array and values
   *   that are out-of bounds are clamped to the appropriate end of the array.
   * @param {number | null | undefined} [deleteCount=0]
   *   Delete count (default: `0`);
   *   maximum number of elements to delete, starting from start.
   * @param {Array<T> | null | undefined} [items=[]]
   *   Items to include in place of the deleted items (default: `[]`).
   * @return {Array<T>}
   *   Any removed items.
   */
  splice(e, n, r) {
    const i = n || 0;
    this.setCursor(Math.trunc(e));
    const o = this.right.splice(this.right.length - i, Number.POSITIVE_INFINITY);
    return r && Ti(this.left, r), o.reverse();
  }
  /**
   * Remove and return the highest-numbered item in the array, so
   * `list[list.length - 1]`;
   * Moves the cursor to `length`.
   *
   * @returns {T | undefined}
   *   Item, optional.
   */
  pop() {
    return this.setCursor(Number.POSITIVE_INFINITY), this.left.pop();
  }
  /**
   * Inserts a single item to the high-numbered side of the array;
   * moves the cursor to `length`.
   *
   * @param {T} item
   *   Item.
   * @returns {undefined}
   *   Nothing.
   */
  push(e) {
    this.setCursor(Number.POSITIVE_INFINITY), this.left.push(e);
  }
  /**
   * Inserts many items to the high-numbered side of the array.
   * Moves the cursor to `length`.
   *
   * @param {Array<T>} items
   *   Items.
   * @returns {undefined}
   *   Nothing.
   */
  pushMany(e) {
    this.setCursor(Number.POSITIVE_INFINITY), Ti(this.left, e);
  }
  /**
   * Inserts a single item to the low-numbered side of the array;
   * Moves the cursor to `0`.
   *
   * @param {T} item
   *   Item.
   * @returns {undefined}
   *   Nothing.
   */
  unshift(e) {
    this.setCursor(0), this.right.push(e);
  }
  /**
   * Inserts many items to the low-numbered side of the array;
   * moves the cursor to `0`.
   *
   * @param {Array<T>} items
   *   Items.
   * @returns {undefined}
   *   Nothing.
   */
  unshiftMany(e) {
    this.setCursor(0), Ti(this.right, e.reverse());
  }
  /**
   * Move the cursor to a specific position in the array. Requires
   * time proportional to the distance moved.
   *
   * If `n < 0`, the cursor will end up at the beginning.
   * If `n > length`, the cursor will end up at the end.
   *
   * @param {number} n
   *   Position.
   * @return {undefined}
   *   Nothing.
   */
  setCursor(e) {
    if (!(e === this.left.length || e > this.left.length && this.right.length === 0 || e < 0 && this.left.length === 0))
      if (e < this.left.length) {
        const n = this.left.splice(e, Number.POSITIVE_INFINITY);
        Ti(this.right, n.reverse());
      } else {
        const n = this.right.splice(this.left.length + this.right.length - e, Number.POSITIVE_INFINITY);
        Ti(this.left, n.reverse());
      }
  }
}
function Ti(t, e) {
  let n = 0;
  if (e.length < 1e4)
    t.push(...e);
  else
    for (; n < e.length; )
      t.push(...e.slice(n, n + 1e4)), n += 1e4;
}
function od(t) {
  const e = {};
  let n = -1, r, i, o, s, l, a, u;
  const c = new sk(t);
  for (; ++n < c.length; ) {
    for (; n in e; )
      n = e[n];
    if (r = c.get(n), n && r[1].type === "chunkFlow" && c.get(n - 1)[1].type === "listItemPrefix" && (a = r[1]._tokenizer.events, o = 0, o < a.length && a[o][1].type === "lineEndingBlank" && (o += 2), o < a.length && a[o][1].type === "content"))
      for (; ++o < a.length && a[o][1].type !== "content"; )
        a[o][1].type === "chunkText" && (a[o][1]._isInFirstContentOfListItem = !0, o++);
    if (r[0] === "enter")
      r[1].contentType && (Object.assign(e, lk(c, n)), n = e[n], u = !0);
    else if (r[1]._container) {
      for (o = n, i = void 0; o--; )
        if (s = c.get(o), s[1].type === "lineEnding" || s[1].type === "lineEndingBlank")
          s[0] === "enter" && (i && (c.get(i)[1].type = "lineEndingBlank"), s[1].type = "lineEnding", i = o);
        else if (!(s[1].type === "linePrefix" || s[1].type === "listItemIndent")) break;
      i && (r[1].end = {
        ...c.get(i)[1].start
      }, l = c.slice(i, n), l.unshift(r), c.splice(i, n - i + 1, l));
    }
  }
  return dt(t, 0, Number.POSITIVE_INFINITY, c.slice(0)), !u;
}
function lk(t, e) {
  const n = t.get(e)[1], r = t.get(e)[2];
  let i = e - 1;
  const o = [];
  let s = n._tokenizer;
  s || (s = r.parser[n.contentType](n.start), n._contentTypeTextTrailing && (s._contentTypeTextTrailing = !0));
  const l = s.events, a = [], u = {};
  let c, f, h = -1, d = n, p = 0, m = 0;
  const k = [m];
  for (; d; ) {
    for (; t.get(++i)[1] !== d; )
      ;
    o.push(i), d._tokenizer || (c = r.sliceStream(d), d.next || c.push(null), f && s.defineSkip(d.start), d._isInFirstContentOfListItem && (s._gfmTasklistFirstContentOfListItem = !0), s.write(c), d._isInFirstContentOfListItem && (s._gfmTasklistFirstContentOfListItem = void 0)), f = d, d = d.next;
  }
  for (d = n; ++h < l.length; )
    // Find a void token that includes a break.
    l[h][0] === "exit" && l[h - 1][0] === "enter" && l[h][1].type === l[h - 1][1].type && l[h][1].start.line !== l[h][1].end.line && (m = h + 1, k.push(m), d._tokenizer = void 0, d.previous = void 0, d = d.next);
  for (s.events = [], d ? (d._tokenizer = void 0, d.previous = void 0) : k.pop(), h = k.length; h--; ) {
    const y = l.slice(k[h], k[h + 1]), O = o.pop();
    a.push([O, O + y.length - 1]), t.splice(O, 2, y);
  }
  for (a.reverse(), h = -1; ++h < a.length; )
    u[p + a[h][0]] = p + a[h][1], p += a[h][1] - a[h][0] - 1;
  return u;
}
const ak = {
  resolve: ck,
  tokenize: fk
}, uk = {
  partial: !0,
  tokenize: hk
};
function ck(t) {
  return od(t), t;
}
function fk(t, e) {
  let n;
  return r;
  function r(l) {
    return t.enter("content"), n = t.enter("chunkContent", {
      contentType: "content"
    }), i(l);
  }
  function i(l) {
    return l === null ? o(l) : J(l) ? t.check(uk, s, o)(l) : (t.consume(l), i);
  }
  function o(l) {
    return t.exit("chunkContent"), t.exit("content"), e(l);
  }
  function s(l) {
    return t.consume(l), t.exit("chunkContent"), n.next = t.enter("chunkContent", {
      contentType: "content",
      previous: n
    }), n = n.next, i;
  }
}
function hk(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return t.exit("chunkContent"), t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), ae(t, o, "linePrefix");
  }
  function o(s) {
    if (s === null || J(s))
      return n(s);
    const l = r.events[r.events.length - 1];
    return !r.parser.constructs.disable.null.includes("codeIndented") && l && l[1].type === "linePrefix" && l[2].sliceSerialize(l[1], !0).length >= 4 ? e(s) : t.interrupt(r.parser.constructs.flow, n, e)(s);
  }
}
function sd(t, e, n, r, i, o, s, l, a) {
  const u = a || Number.POSITIVE_INFINITY;
  let c = 0;
  return f;
  function f(y) {
    return y === 60 ? (t.enter(r), t.enter(i), t.enter(o), t.consume(y), t.exit(o), h) : y === null || y === 32 || y === 41 || ks(y) ? n(y) : (t.enter(r), t.enter(s), t.enter(l), t.enter("chunkString", {
      contentType: "string"
    }), m(y));
  }
  function h(y) {
    return y === 62 ? (t.enter(o), t.consume(y), t.exit(o), t.exit(i), t.exit(r), e) : (t.enter(l), t.enter("chunkString", {
      contentType: "string"
    }), d(y));
  }
  function d(y) {
    return y === 62 ? (t.exit("chunkString"), t.exit(l), h(y)) : y === null || y === 60 || J(y) ? n(y) : (t.consume(y), y === 92 ? p : d);
  }
  function p(y) {
    return y === 60 || y === 62 || y === 92 ? (t.consume(y), d) : d(y);
  }
  function m(y) {
    return !c && (y === null || y === 41 || pe(y)) ? (t.exit("chunkString"), t.exit(l), t.exit(s), t.exit(r), e(y)) : c < u && y === 40 ? (t.consume(y), c++, m) : y === 41 ? (t.consume(y), c--, m) : y === null || y === 32 || y === 40 || ks(y) ? n(y) : (t.consume(y), y === 92 ? k : m);
  }
  function k(y) {
    return y === 40 || y === 41 || y === 92 ? (t.consume(y), m) : m(y);
  }
}
function ld(t, e, n, r, i, o) {
  const s = this;
  let l = 0, a;
  return u;
  function u(d) {
    return t.enter(r), t.enter(i), t.consume(d), t.exit(i), t.enter(o), c;
  }
  function c(d) {
    return l > 999 || d === null || d === 91 || d === 93 && !a || // To do: remove in the future once we’ve switched from
    // `micromark-extension-footnote` to `micromark-extension-gfm-footnote`,
    // which doesn’t need this.
    // Hidden footnotes hook.
    /* c8 ignore next 3 */
    d === 94 && !l && "_hiddenFootnoteSupport" in s.parser.constructs ? n(d) : d === 93 ? (t.exit(o), t.enter(i), t.consume(d), t.exit(i), t.exit(r), e) : J(d) ? (t.enter("lineEnding"), t.consume(d), t.exit("lineEnding"), c) : (t.enter("chunkString", {
      contentType: "string"
    }), f(d));
  }
  function f(d) {
    return d === null || d === 91 || d === 93 || J(d) || l++ > 999 ? (t.exit("chunkString"), c(d)) : (t.consume(d), a || (a = !re(d)), d === 92 ? h : f);
  }
  function h(d) {
    return d === 91 || d === 92 || d === 93 ? (t.consume(d), l++, f) : f(d);
  }
}
function ad(t, e, n, r, i, o) {
  let s;
  return l;
  function l(h) {
    return h === 34 || h === 39 || h === 40 ? (t.enter(r), t.enter(i), t.consume(h), t.exit(i), s = h === 40 ? 41 : h, a) : n(h);
  }
  function a(h) {
    return h === s ? (t.enter(i), t.consume(h), t.exit(i), t.exit(r), e) : (t.enter(o), u(h));
  }
  function u(h) {
    return h === s ? (t.exit(o), a(s)) : h === null ? n(h) : J(h) ? (t.enter("lineEnding"), t.consume(h), t.exit("lineEnding"), ae(t, u, "linePrefix")) : (t.enter("chunkString", {
      contentType: "string"
    }), c(h));
  }
  function c(h) {
    return h === s || h === null || J(h) ? (t.exit("chunkString"), u(h)) : (t.consume(h), h === 92 ? f : c);
  }
  function f(h) {
    return h === s || h === 92 ? (t.consume(h), c) : c(h);
  }
}
function Ri(t, e) {
  let n;
  return r;
  function r(i) {
    return J(i) ? (t.enter("lineEnding"), t.consume(i), t.exit("lineEnding"), n = !0, r) : re(i) ? ae(t, r, n ? "linePrefix" : "lineSuffix")(i) : e(i);
  }
}
const dk = {
  name: "definition",
  tokenize: mk
}, pk = {
  partial: !0,
  tokenize: gk
};
function mk(t, e, n) {
  const r = this;
  let i;
  return o;
  function o(d) {
    return t.enter("definition"), s(d);
  }
  function s(d) {
    return ld.call(
      r,
      t,
      l,
      // Note: we don’t need to reset the way `markdown-rs` does.
      n,
      "definitionLabel",
      "definitionLabelMarker",
      "definitionLabelString"
    )(d);
  }
  function l(d) {
    return i = Dt(r.sliceSerialize(r.events[r.events.length - 1][1]).slice(1, -1)), d === 58 ? (t.enter("definitionMarker"), t.consume(d), t.exit("definitionMarker"), a) : n(d);
  }
  function a(d) {
    return pe(d) ? Ri(t, u)(d) : u(d);
  }
  function u(d) {
    return sd(
      t,
      c,
      // Note: we don’t need to reset the way `markdown-rs` does.
      n,
      "definitionDestination",
      "definitionDestinationLiteral",
      "definitionDestinationLiteralMarker",
      "definitionDestinationRaw",
      "definitionDestinationString"
    )(d);
  }
  function c(d) {
    return t.attempt(pk, f, f)(d);
  }
  function f(d) {
    return re(d) ? ae(t, h, "whitespace")(d) : h(d);
  }
  function h(d) {
    return d === null || J(d) ? (t.exit("definition"), r.parser.defined.push(i), e(d)) : n(d);
  }
}
function gk(t, e, n) {
  return r;
  function r(l) {
    return pe(l) ? Ri(t, i)(l) : n(l);
  }
  function i(l) {
    return ad(t, o, n, "definitionTitle", "definitionTitleMarker", "definitionTitleString")(l);
  }
  function o(l) {
    return re(l) ? ae(t, s, "whitespace")(l) : s(l);
  }
  function s(l) {
    return l === null || J(l) ? e(l) : n(l);
  }
}
const yk = {
  name: "hardBreakEscape",
  tokenize: kk
};
function kk(t, e, n) {
  return r;
  function r(o) {
    return t.enter("hardBreakEscape"), t.consume(o), i;
  }
  function i(o) {
    return J(o) ? (t.exit("hardBreakEscape"), e(o)) : n(o);
  }
}
const bk = {
  name: "headingAtx",
  resolve: wk,
  tokenize: xk
};
function wk(t, e) {
  let n = t.length - 2, r = 3, i, o;
  return t[r][1].type === "whitespace" && (r += 2), n - 2 > r && t[n][1].type === "whitespace" && (n -= 2), t[n][1].type === "atxHeadingSequence" && (r === n - 1 || n - 4 > r && t[n - 2][1].type === "whitespace") && (n -= r + 1 === n ? 2 : 4), n > r && (i = {
    type: "atxHeadingText",
    start: t[r][1].start,
    end: t[n][1].end
  }, o = {
    type: "chunkText",
    start: t[r][1].start,
    end: t[n][1].end,
    contentType: "text"
  }, dt(t, r, n - r + 1, [["enter", i, e], ["enter", o, e], ["exit", o, e], ["exit", i, e]])), t;
}
function xk(t, e, n) {
  let r = 0;
  return i;
  function i(c) {
    return t.enter("atxHeading"), o(c);
  }
  function o(c) {
    return t.enter("atxHeadingSequence"), s(c);
  }
  function s(c) {
    return c === 35 && r++ < 6 ? (t.consume(c), s) : c === null || pe(c) ? (t.exit("atxHeadingSequence"), l(c)) : n(c);
  }
  function l(c) {
    return c === 35 ? (t.enter("atxHeadingSequence"), a(c)) : c === null || J(c) ? (t.exit("atxHeading"), e(c)) : re(c) ? ae(t, l, "whitespace")(c) : (t.enter("atxHeadingText"), u(c));
  }
  function a(c) {
    return c === 35 ? (t.consume(c), a) : (t.exit("atxHeadingSequence"), l(c));
  }
  function u(c) {
    return c === null || c === 35 || pe(c) ? (t.exit("atxHeadingText"), l(c)) : (t.consume(c), u);
  }
}
const Ck = [
  "address",
  "article",
  "aside",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul"
], Uc = ["pre", "script", "style", "textarea"], Sk = {
  concrete: !0,
  name: "htmlFlow",
  resolveTo: Tk,
  tokenize: vk
}, Mk = {
  partial: !0,
  tokenize: Ek
}, Nk = {
  partial: !0,
  tokenize: Ik
};
function Tk(t) {
  let e = t.length;
  for (; e-- && !(t[e][0] === "enter" && t[e][1].type === "htmlFlow"); )
    ;
  return e > 1 && t[e - 2][1].type === "linePrefix" && (t[e][1].start = t[e - 2][1].start, t[e + 1][1].start = t[e - 2][1].start, t.splice(e - 2, 2)), t;
}
function vk(t, e, n) {
  const r = this;
  let i, o, s, l, a;
  return u;
  function u(x) {
    return c(x);
  }
  function c(x) {
    return t.enter("htmlFlow"), t.enter("htmlFlowData"), t.consume(x), f;
  }
  function f(x) {
    return x === 33 ? (t.consume(x), h) : x === 47 ? (t.consume(x), o = !0, m) : x === 63 ? (t.consume(x), i = 3, r.interrupt ? e : w) : We(x) ? (t.consume(x), s = String.fromCharCode(x), k) : n(x);
  }
  function h(x) {
    return x === 45 ? (t.consume(x), i = 2, d) : x === 91 ? (t.consume(x), i = 5, l = 0, p) : We(x) ? (t.consume(x), i = 4, r.interrupt ? e : w) : n(x);
  }
  function d(x) {
    return x === 45 ? (t.consume(x), r.interrupt ? e : w) : n(x);
  }
  function p(x) {
    const Ye = "CDATA[";
    return x === Ye.charCodeAt(l++) ? (t.consume(x), l === Ye.length ? r.interrupt ? e : H : p) : n(x);
  }
  function m(x) {
    return We(x) ? (t.consume(x), s = String.fromCharCode(x), k) : n(x);
  }
  function k(x) {
    if (x === null || x === 47 || x === 62 || pe(x)) {
      const Ye = x === 47, ie = s.toLowerCase();
      return !Ye && !o && Uc.includes(ie) ? (i = 1, r.interrupt ? e(x) : H(x)) : Ck.includes(s.toLowerCase()) ? (i = 6, Ye ? (t.consume(x), y) : r.interrupt ? e(x) : H(x)) : (i = 7, r.interrupt && !r.parser.lazy[r.now().line] ? n(x) : o ? O(x) : T(x));
    }
    return x === 45 || rt(x) ? (t.consume(x), s += String.fromCharCode(x), k) : n(x);
  }
  function y(x) {
    return x === 62 ? (t.consume(x), r.interrupt ? e : H) : n(x);
  }
  function O(x) {
    return re(x) ? (t.consume(x), O) : N(x);
  }
  function T(x) {
    return x === 47 ? (t.consume(x), N) : x === 58 || x === 95 || We(x) ? (t.consume(x), V) : re(x) ? (t.consume(x), T) : N(x);
  }
  function V(x) {
    return x === 45 || x === 46 || x === 58 || x === 95 || rt(x) ? (t.consume(x), V) : _(x);
  }
  function _(x) {
    return x === 61 ? (t.consume(x), S) : re(x) ? (t.consume(x), _) : T(x);
  }
  function S(x) {
    return x === null || x === 60 || x === 61 || x === 62 || x === 96 ? n(x) : x === 34 || x === 39 ? (t.consume(x), a = x, R) : re(x) ? (t.consume(x), S) : q(x);
  }
  function R(x) {
    return x === a ? (t.consume(x), a = null, U) : x === null || J(x) ? n(x) : (t.consume(x), R);
  }
  function q(x) {
    return x === null || x === 34 || x === 39 || x === 47 || x === 60 || x === 61 || x === 62 || x === 96 || pe(x) ? _(x) : (t.consume(x), q);
  }
  function U(x) {
    return x === 47 || x === 62 || re(x) ? T(x) : n(x);
  }
  function N(x) {
    return x === 62 ? (t.consume(x), P) : n(x);
  }
  function P(x) {
    return x === null || J(x) ? H(x) : re(x) ? (t.consume(x), P) : n(x);
  }
  function H(x) {
    return x === 45 && i === 2 ? (t.consume(x), de) : x === 60 && i === 1 ? (t.consume(x), ye) : x === 62 && i === 4 ? (t.consume(x), Ge) : x === 63 && i === 3 ? (t.consume(x), w) : x === 93 && i === 5 ? (t.consume(x), be) : J(x) && (i === 6 || i === 7) ? (t.exit("htmlFlowData"), t.check(Mk, Te, W)(x)) : x === null || J(x) ? (t.exit("htmlFlowData"), W(x)) : (t.consume(x), H);
  }
  function W(x) {
    return t.check(Nk, se, Te)(x);
  }
  function se(x) {
    return t.enter("lineEnding"), t.consume(x), t.exit("lineEnding"), te;
  }
  function te(x) {
    return x === null || J(x) ? W(x) : (t.enter("htmlFlowData"), H(x));
  }
  function de(x) {
    return x === 45 ? (t.consume(x), w) : H(x);
  }
  function ye(x) {
    return x === 47 ? (t.consume(x), s = "", Ne) : H(x);
  }
  function Ne(x) {
    if (x === 62) {
      const Ye = s.toLowerCase();
      return Uc.includes(Ye) ? (t.consume(x), Ge) : H(x);
    }
    return We(x) && s.length < 8 ? (t.consume(x), s += String.fromCharCode(x), Ne) : H(x);
  }
  function be(x) {
    return x === 93 ? (t.consume(x), w) : H(x);
  }
  function w(x) {
    return x === 62 ? (t.consume(x), Ge) : x === 45 && i === 2 ? (t.consume(x), w) : H(x);
  }
  function Ge(x) {
    return x === null || J(x) ? (t.exit("htmlFlowData"), Te(x)) : (t.consume(x), Ge);
  }
  function Te(x) {
    return t.exit("htmlFlow"), e(x);
  }
}
function Ik(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return J(s) ? (t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), o) : n(s);
  }
  function o(s) {
    return r.parser.lazy[r.now().line] ? n(s) : e(s);
  }
}
function Ek(t, e, n) {
  return r;
  function r(i) {
    return t.enter("lineEnding"), t.consume(i), t.exit("lineEnding"), t.attempt(So, e, n);
  }
}
const Ak = {
  name: "htmlText",
  tokenize: Ok
};
function Ok(t, e, n) {
  const r = this;
  let i, o, s;
  return l;
  function l(w) {
    return t.enter("htmlText"), t.enter("htmlTextData"), t.consume(w), a;
  }
  function a(w) {
    return w === 33 ? (t.consume(w), u) : w === 47 ? (t.consume(w), _) : w === 63 ? (t.consume(w), T) : We(w) ? (t.consume(w), q) : n(w);
  }
  function u(w) {
    return w === 45 ? (t.consume(w), c) : w === 91 ? (t.consume(w), o = 0, p) : We(w) ? (t.consume(w), O) : n(w);
  }
  function c(w) {
    return w === 45 ? (t.consume(w), d) : n(w);
  }
  function f(w) {
    return w === null ? n(w) : w === 45 ? (t.consume(w), h) : J(w) ? (s = f, ye(w)) : (t.consume(w), f);
  }
  function h(w) {
    return w === 45 ? (t.consume(w), d) : f(w);
  }
  function d(w) {
    return w === 62 ? de(w) : w === 45 ? h(w) : f(w);
  }
  function p(w) {
    const Ge = "CDATA[";
    return w === Ge.charCodeAt(o++) ? (t.consume(w), o === Ge.length ? m : p) : n(w);
  }
  function m(w) {
    return w === null ? n(w) : w === 93 ? (t.consume(w), k) : J(w) ? (s = m, ye(w)) : (t.consume(w), m);
  }
  function k(w) {
    return w === 93 ? (t.consume(w), y) : m(w);
  }
  function y(w) {
    return w === 62 ? de(w) : w === 93 ? (t.consume(w), y) : m(w);
  }
  function O(w) {
    return w === null || w === 62 ? de(w) : J(w) ? (s = O, ye(w)) : (t.consume(w), O);
  }
  function T(w) {
    return w === null ? n(w) : w === 63 ? (t.consume(w), V) : J(w) ? (s = T, ye(w)) : (t.consume(w), T);
  }
  function V(w) {
    return w === 62 ? de(w) : T(w);
  }
  function _(w) {
    return We(w) ? (t.consume(w), S) : n(w);
  }
  function S(w) {
    return w === 45 || rt(w) ? (t.consume(w), S) : R(w);
  }
  function R(w) {
    return J(w) ? (s = R, ye(w)) : re(w) ? (t.consume(w), R) : de(w);
  }
  function q(w) {
    return w === 45 || rt(w) ? (t.consume(w), q) : w === 47 || w === 62 || pe(w) ? U(w) : n(w);
  }
  function U(w) {
    return w === 47 ? (t.consume(w), de) : w === 58 || w === 95 || We(w) ? (t.consume(w), N) : J(w) ? (s = U, ye(w)) : re(w) ? (t.consume(w), U) : de(w);
  }
  function N(w) {
    return w === 45 || w === 46 || w === 58 || w === 95 || rt(w) ? (t.consume(w), N) : P(w);
  }
  function P(w) {
    return w === 61 ? (t.consume(w), H) : J(w) ? (s = P, ye(w)) : re(w) ? (t.consume(w), P) : U(w);
  }
  function H(w) {
    return w === null || w === 60 || w === 61 || w === 62 || w === 96 ? n(w) : w === 34 || w === 39 ? (t.consume(w), i = w, W) : J(w) ? (s = H, ye(w)) : re(w) ? (t.consume(w), H) : (t.consume(w), se);
  }
  function W(w) {
    return w === i ? (t.consume(w), i = void 0, te) : w === null ? n(w) : J(w) ? (s = W, ye(w)) : (t.consume(w), W);
  }
  function se(w) {
    return w === null || w === 34 || w === 39 || w === 60 || w === 61 || w === 96 ? n(w) : w === 47 || w === 62 || pe(w) ? U(w) : (t.consume(w), se);
  }
  function te(w) {
    return w === 47 || w === 62 || pe(w) ? U(w) : n(w);
  }
  function de(w) {
    return w === 62 ? (t.consume(w), t.exit("htmlTextData"), t.exit("htmlText"), e) : n(w);
  }
  function ye(w) {
    return t.exit("htmlTextData"), t.enter("lineEnding"), t.consume(w), t.exit("lineEnding"), Ne;
  }
  function Ne(w) {
    return re(w) ? ae(t, be, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(w) : be(w);
  }
  function be(w) {
    return t.enter("htmlTextData"), s(w);
  }
}
const Ua = {
  name: "labelEnd",
  resolveAll: zk,
  resolveTo: Pk,
  tokenize: Bk
}, Dk = {
  tokenize: Fk
}, Rk = {
  tokenize: $k
}, Lk = {
  tokenize: _k
};
function zk(t) {
  let e = -1;
  const n = [];
  for (; ++e < t.length; ) {
    const r = t[e][1];
    if (n.push(t[e]), r.type === "labelImage" || r.type === "labelLink" || r.type === "labelEnd") {
      const i = r.type === "labelImage" ? 4 : 2;
      r.type = "data", e += i;
    }
  }
  return t.length !== n.length && dt(t, 0, t.length, n), t;
}
function Pk(t, e) {
  let n = t.length, r = 0, i, o, s, l;
  for (; n--; )
    if (i = t[n][1], o) {
      if (i.type === "link" || i.type === "labelLink" && i._inactive)
        break;
      t[n][0] === "enter" && i.type === "labelLink" && (i._inactive = !0);
    } else if (s) {
      if (t[n][0] === "enter" && (i.type === "labelImage" || i.type === "labelLink") && !i._balanced && (o = n, i.type !== "labelLink")) {
        r = 2;
        break;
      }
    } else i.type === "labelEnd" && (s = n);
  const a = {
    type: t[o][1].type === "labelLink" ? "link" : "image",
    start: {
      ...t[o][1].start
    },
    end: {
      ...t[t.length - 1][1].end
    }
  }, u = {
    type: "label",
    start: {
      ...t[o][1].start
    },
    end: {
      ...t[s][1].end
    }
  }, c = {
    type: "labelText",
    start: {
      ...t[o + r + 2][1].end
    },
    end: {
      ...t[s - 2][1].start
    }
  };
  return l = [["enter", a, e], ["enter", u, e]], l = St(l, t.slice(o + 1, o + r + 3)), l = St(l, [["enter", c, e]]), l = St(l, $s(e.parser.constructs.insideSpan.null, t.slice(o + r + 4, s - 3), e)), l = St(l, [["exit", c, e], t[s - 2], t[s - 1], ["exit", u, e]]), l = St(l, t.slice(s + 1)), l = St(l, [["exit", a, e]]), dt(t, o, t.length, l), t;
}
function Bk(t, e, n) {
  const r = this;
  let i = r.events.length, o, s;
  for (; i--; )
    if ((r.events[i][1].type === "labelImage" || r.events[i][1].type === "labelLink") && !r.events[i][1]._balanced) {
      o = r.events[i][1];
      break;
    }
  return l;
  function l(h) {
    return o ? o._inactive ? f(h) : (s = r.parser.defined.includes(Dt(r.sliceSerialize({
      start: o.end,
      end: r.now()
    }))), t.enter("labelEnd"), t.enter("labelMarker"), t.consume(h), t.exit("labelMarker"), t.exit("labelEnd"), a) : n(h);
  }
  function a(h) {
    return h === 40 ? t.attempt(Dk, c, s ? c : f)(h) : h === 91 ? t.attempt(Rk, c, s ? u : f)(h) : s ? c(h) : f(h);
  }
  function u(h) {
    return t.attempt(Lk, c, f)(h);
  }
  function c(h) {
    return e(h);
  }
  function f(h) {
    return o._balanced = !0, n(h);
  }
}
function Fk(t, e, n) {
  return r;
  function r(f) {
    return t.enter("resource"), t.enter("resourceMarker"), t.consume(f), t.exit("resourceMarker"), i;
  }
  function i(f) {
    return pe(f) ? Ri(t, o)(f) : o(f);
  }
  function o(f) {
    return f === 41 ? c(f) : sd(t, s, l, "resourceDestination", "resourceDestinationLiteral", "resourceDestinationLiteralMarker", "resourceDestinationRaw", "resourceDestinationString", 32)(f);
  }
  function s(f) {
    return pe(f) ? Ri(t, a)(f) : c(f);
  }
  function l(f) {
    return n(f);
  }
  function a(f) {
    return f === 34 || f === 39 || f === 40 ? ad(t, u, n, "resourceTitle", "resourceTitleMarker", "resourceTitleString")(f) : c(f);
  }
  function u(f) {
    return pe(f) ? Ri(t, c)(f) : c(f);
  }
  function c(f) {
    return f === 41 ? (t.enter("resourceMarker"), t.consume(f), t.exit("resourceMarker"), t.exit("resource"), e) : n(f);
  }
}
function $k(t, e, n) {
  const r = this;
  return i;
  function i(l) {
    return ld.call(r, t, o, s, "reference", "referenceMarker", "referenceString")(l);
  }
  function o(l) {
    return r.parser.defined.includes(Dt(r.sliceSerialize(r.events[r.events.length - 1][1]).slice(1, -1))) ? e(l) : n(l);
  }
  function s(l) {
    return n(l);
  }
}
function _k(t, e, n) {
  return r;
  function r(o) {
    return t.enter("reference"), t.enter("referenceMarker"), t.consume(o), t.exit("referenceMarker"), i;
  }
  function i(o) {
    return o === 93 ? (t.enter("referenceMarker"), t.consume(o), t.exit("referenceMarker"), t.exit("reference"), e) : n(o);
  }
}
const Vk = {
  name: "labelStartImage",
  resolveAll: Ua.resolveAll,
  tokenize: Hk
};
function Hk(t, e, n) {
  const r = this;
  return i;
  function i(l) {
    return t.enter("labelImage"), t.enter("labelImageMarker"), t.consume(l), t.exit("labelImageMarker"), o;
  }
  function o(l) {
    return l === 91 ? (t.enter("labelMarker"), t.consume(l), t.exit("labelMarker"), t.exit("labelImage"), s) : n(l);
  }
  function s(l) {
    return l === 94 && "_hiddenFootnoteSupport" in r.parser.constructs ? n(l) : e(l);
  }
}
const jk = {
  name: "labelStartLink",
  resolveAll: Ua.resolveAll,
  tokenize: qk
};
function qk(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return t.enter("labelLink"), t.enter("labelMarker"), t.consume(s), t.exit("labelMarker"), t.exit("labelLink"), o;
  }
  function o(s) {
    return s === 94 && "_hiddenFootnoteSupport" in r.parser.constructs ? n(s) : e(s);
  }
}
const al = {
  name: "lineEnding",
  tokenize: Wk
};
function Wk(t, e) {
  return n;
  function n(r) {
    return t.enter("lineEnding"), t.consume(r), t.exit("lineEnding"), ae(t, e, "linePrefix");
  }
}
const ns = {
  name: "thematicBreak",
  tokenize: Kk
};
function Kk(t, e, n) {
  let r = 0, i;
  return o;
  function o(u) {
    return t.enter("thematicBreak"), s(u);
  }
  function s(u) {
    return i = u, l(u);
  }
  function l(u) {
    return u === i ? (t.enter("thematicBreakSequence"), a(u)) : r >= 3 && (u === null || J(u)) ? (t.exit("thematicBreak"), e(u)) : n(u);
  }
  function a(u) {
    return u === i ? (t.consume(u), r++, a) : (t.exit("thematicBreakSequence"), re(u) ? ae(t, l, "whitespace")(u) : l(u));
  }
}
const Ze = {
  continuation: {
    tokenize: Yk
  },
  exit: Xk,
  name: "list",
  tokenize: Gk
}, Uk = {
  partial: !0,
  tokenize: Zk
}, Jk = {
  partial: !0,
  tokenize: Qk
};
function Gk(t, e, n) {
  const r = this, i = r.events[r.events.length - 1];
  let o = i && i[1].type === "linePrefix" ? i[2].sliceSerialize(i[1], !0).length : 0, s = 0;
  return l;
  function l(d) {
    const p = r.containerState.type || (d === 42 || d === 43 || d === 45 ? "listUnordered" : "listOrdered");
    if (p === "listUnordered" ? !r.containerState.marker || d === r.containerState.marker : ra(d)) {
      if (r.containerState.type || (r.containerState.type = p, t.enter(p, {
        _container: !0
      })), p === "listUnordered")
        return t.enter("listItemPrefix"), d === 42 || d === 45 ? t.check(ns, n, u)(d) : u(d);
      if (!r.interrupt || d === 49)
        return t.enter("listItemPrefix"), t.enter("listItemValue"), a(d);
    }
    return n(d);
  }
  function a(d) {
    return ra(d) && ++s < 10 ? (t.consume(d), a) : (!r.interrupt || s < 2) && (r.containerState.marker ? d === r.containerState.marker : d === 41 || d === 46) ? (t.exit("listItemValue"), u(d)) : n(d);
  }
  function u(d) {
    return t.enter("listItemMarker"), t.consume(d), t.exit("listItemMarker"), r.containerState.marker = r.containerState.marker || d, t.check(
      So,
      // Can’t be empty when interrupting.
      r.interrupt ? n : c,
      t.attempt(Uk, h, f)
    );
  }
  function c(d) {
    return r.containerState.initialBlankLine = !0, o++, h(d);
  }
  function f(d) {
    return re(d) ? (t.enter("listItemPrefixWhitespace"), t.consume(d), t.exit("listItemPrefixWhitespace"), h) : n(d);
  }
  function h(d) {
    return r.containerState.size = o + r.sliceSerialize(t.exit("listItemPrefix"), !0).length, e(d);
  }
}
function Yk(t, e, n) {
  const r = this;
  return r.containerState._closeFlow = void 0, t.check(So, i, o);
  function i(l) {
    return r.containerState.furtherBlankLines = r.containerState.furtherBlankLines || r.containerState.initialBlankLine, ae(t, e, "listItemIndent", r.containerState.size + 1)(l);
  }
  function o(l) {
    return r.containerState.furtherBlankLines || !re(l) ? (r.containerState.furtherBlankLines = void 0, r.containerState.initialBlankLine = void 0, s(l)) : (r.containerState.furtherBlankLines = void 0, r.containerState.initialBlankLine = void 0, t.attempt(Jk, e, s)(l));
  }
  function s(l) {
    return r.containerState._closeFlow = !0, r.interrupt = void 0, ae(t, t.attempt(Ze, e, n), "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(l);
  }
}
function Qk(t, e, n) {
  const r = this;
  return ae(t, i, "listItemIndent", r.containerState.size + 1);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return s && s[1].type === "listItemIndent" && s[2].sliceSerialize(s[1], !0).length === r.containerState.size ? e(o) : n(o);
  }
}
function Xk(t) {
  t.exit(this.containerState.type);
}
function Zk(t, e, n) {
  const r = this;
  return ae(t, i, "listItemPrefixWhitespace", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 5);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return !re(o) && s && s[1].type === "listItemPrefixWhitespace" ? e(o) : n(o);
  }
}
const Jc = {
  name: "setextUnderline",
  resolveTo: e1,
  tokenize: t1
};
function e1(t, e) {
  let n = t.length, r, i, o;
  for (; n--; )
    if (t[n][0] === "enter") {
      if (t[n][1].type === "content") {
        r = n;
        break;
      }
      t[n][1].type === "paragraph" && (i = n);
    } else
      t[n][1].type === "content" && t.splice(n, 1), !o && t[n][1].type === "definition" && (o = n);
  const s = {
    type: "setextHeading",
    start: {
      ...t[r][1].start
    },
    end: {
      ...t[t.length - 1][1].end
    }
  };
  return t[i][1].type = "setextHeadingText", o ? (t.splice(i, 0, ["enter", s, e]), t.splice(o + 1, 0, ["exit", t[r][1], e]), t[r][1].end = {
    ...t[o][1].end
  }) : t[r][1] = s, t.push(["exit", s, e]), t;
}
function t1(t, e, n) {
  const r = this;
  let i;
  return o;
  function o(u) {
    let c = r.events.length, f;
    for (; c--; )
      if (r.events[c][1].type !== "lineEnding" && r.events[c][1].type !== "linePrefix" && r.events[c][1].type !== "content") {
        f = r.events[c][1].type === "paragraph";
        break;
      }
    return !r.parser.lazy[r.now().line] && (r.interrupt || f) ? (t.enter("setextHeadingLine"), i = u, s(u)) : n(u);
  }
  function s(u) {
    return t.enter("setextHeadingLineSequence"), l(u);
  }
  function l(u) {
    return u === i ? (t.consume(u), l) : (t.exit("setextHeadingLineSequence"), re(u) ? ae(t, a, "lineSuffix")(u) : a(u));
  }
  function a(u) {
    return u === null || J(u) ? (t.exit("setextHeadingLine"), e(u)) : n(u);
  }
}
const n1 = {
  tokenize: r1
};
function r1(t) {
  const e = this, n = t.attempt(
    // Try to parse a blank line.
    So,
    r,
    // Try to parse initial flow (essentially, only code).
    t.attempt(this.parser.constructs.flowInitial, i, ae(t, t.attempt(this.parser.constructs.flow, i, t.attempt(ak, i)), "linePrefix"))
  );
  return n;
  function r(o) {
    if (o === null) {
      t.consume(o);
      return;
    }
    return t.enter("lineEndingBlank"), t.consume(o), t.exit("lineEndingBlank"), e.currentConstruct = void 0, n;
  }
  function i(o) {
    if (o === null) {
      t.consume(o);
      return;
    }
    return t.enter("lineEnding"), t.consume(o), t.exit("lineEnding"), e.currentConstruct = void 0, n;
  }
}
const i1 = {
  resolveAll: cd()
}, o1 = ud("string"), s1 = ud("text");
function ud(t) {
  return {
    resolveAll: cd(t === "text" ? l1 : void 0),
    tokenize: e
  };
  function e(n) {
    const r = this, i = this.parser.constructs[t], o = n.attempt(i, s, l);
    return s;
    function s(c) {
      return u(c) ? o(c) : l(c);
    }
    function l(c) {
      if (c === null) {
        n.consume(c);
        return;
      }
      return n.enter("data"), n.consume(c), a;
    }
    function a(c) {
      return u(c) ? (n.exit("data"), o(c)) : (n.consume(c), a);
    }
    function u(c) {
      if (c === null)
        return !0;
      const f = i[c];
      let h = -1;
      if (f)
        for (; ++h < f.length; ) {
          const d = f[h];
          if (!d.previous || d.previous.call(r, r.previous))
            return !0;
        }
      return !1;
    }
  }
}
function cd(t) {
  return e;
  function e(n, r) {
    let i = -1, o;
    for (; ++i <= n.length; )
      o === void 0 ? n[i] && n[i][1].type === "data" && (o = i, i++) : (!n[i] || n[i][1].type !== "data") && (i !== o + 2 && (n[o][1].end = n[i - 1][1].end, n.splice(o + 2, i - o - 2), i = o + 2), o = void 0);
    return t ? t(n, r) : n;
  }
}
function l1(t, e) {
  let n = 0;
  for (; ++n <= t.length; )
    if ((n === t.length || t[n][1].type === "lineEnding") && t[n - 1][1].type === "data") {
      const r = t[n - 1][1], i = e.sliceStream(r);
      let o = i.length, s = -1, l = 0, a;
      for (; o--; ) {
        const u = i[o];
        if (typeof u == "string") {
          for (s = u.length; u.charCodeAt(s - 1) === 32; )
            l++, s--;
          if (s) break;
          s = -1;
        } else if (u === -2)
          a = !0, l++;
        else if (u !== -1) {
          o++;
          break;
        }
      }
      if (e._contentTypeTextTrailing && n === t.length && (l = 0), l) {
        const u = {
          type: n === t.length || a || l < 2 ? "lineSuffix" : "hardBreakTrailing",
          start: {
            _bufferIndex: o ? s : r.start._bufferIndex + s,
            _index: r.start._index + o,
            line: r.end.line,
            column: r.end.column - l,
            offset: r.end.offset - l
          },
          end: {
            ...r.end
          }
        };
        r.end = {
          ...u.start
        }, r.start.offset === r.end.offset ? Object.assign(r, u) : (t.splice(n, 0, ["enter", u, e], ["exit", u, e]), n += 2);
      }
      n++;
    }
  return t;
}
const a1 = {
  42: Ze,
  43: Ze,
  45: Ze,
  48: Ze,
  49: Ze,
  50: Ze,
  51: Ze,
  52: Ze,
  53: Ze,
  54: Ze,
  55: Ze,
  56: Ze,
  57: Ze,
  62: nd
}, u1 = {
  91: dk
}, c1 = {
  [-2]: ll,
  [-1]: ll,
  32: ll
}, f1 = {
  35: bk,
  42: ns,
  45: [Jc, ns],
  60: Sk,
  61: Jc,
  95: ns,
  96: Kc,
  126: Kc
}, h1 = {
  38: id,
  92: rd
}, d1 = {
  [-5]: al,
  [-4]: al,
  [-3]: al,
  33: Vk,
  38: id,
  42: ia,
  60: [jy, Ak],
  91: jk,
  92: [yk, rd],
  93: Ua,
  95: ia,
  96: nk
}, p1 = {
  null: [ia, i1]
}, m1 = {
  null: [42, 95]
}, g1 = {
  null: []
}, y1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  attentionMarkers: m1,
  contentInitial: u1,
  disable: g1,
  document: a1,
  flow: f1,
  flowInitial: c1,
  insideSpan: p1,
  string: h1,
  text: d1
}, Symbol.toStringTag, { value: "Module" }));
function k1(t, e, n) {
  let r = {
    _bufferIndex: -1,
    _index: 0,
    line: n && n.line || 1,
    column: n && n.column || 1,
    offset: n && n.offset || 0
  };
  const i = {}, o = [];
  let s = [], l = [];
  const a = {
    attempt: R(_),
    check: R(S),
    consume: O,
    enter: T,
    exit: V,
    interrupt: R(S, {
      interrupt: !0
    })
  }, u = {
    code: null,
    containerState: {},
    defineSkip: m,
    events: [],
    now: p,
    parser: t,
    previous: null,
    sliceSerialize: h,
    sliceStream: d,
    write: f
  };
  let c = e.tokenize.call(u, a);
  return e.resolveAll && o.push(e), u;
  function f(P) {
    return s = St(s, P), k(), s[s.length - 1] !== null ? [] : (q(e, 0), u.events = $s(o, u.events, u), u.events);
  }
  function h(P, H) {
    return w1(d(P), H);
  }
  function d(P) {
    return b1(s, P);
  }
  function p() {
    const {
      _bufferIndex: P,
      _index: H,
      line: W,
      column: se,
      offset: te
    } = r;
    return {
      _bufferIndex: P,
      _index: H,
      line: W,
      column: se,
      offset: te
    };
  }
  function m(P) {
    i[P.line] = P.column, N();
  }
  function k() {
    let P;
    for (; r._index < s.length; ) {
      const H = s[r._index];
      if (typeof H == "string")
        for (P = r._index, r._bufferIndex < 0 && (r._bufferIndex = 0); r._index === P && r._bufferIndex < H.length; )
          y(H.charCodeAt(r._bufferIndex));
      else
        y(H);
    }
  }
  function y(P) {
    c = c(P);
  }
  function O(P) {
    J(P) ? (r.line++, r.column = 1, r.offset += P === -3 ? 2 : 1, N()) : P !== -1 && (r.column++, r.offset++), r._bufferIndex < 0 ? r._index++ : (r._bufferIndex++, r._bufferIndex === // Points w/ non-negative `_bufferIndex` reference
    // strings.
    /** @type {string} */
    s[r._index].length && (r._bufferIndex = -1, r._index++)), u.previous = P;
  }
  function T(P, H) {
    const W = H || {};
    return W.type = P, W.start = p(), u.events.push(["enter", W, u]), l.push(W), W;
  }
  function V(P) {
    const H = l.pop();
    return H.end = p(), u.events.push(["exit", H, u]), H;
  }
  function _(P, H) {
    q(P, H.from);
  }
  function S(P, H) {
    H.restore();
  }
  function R(P, H) {
    return W;
    function W(se, te, de) {
      let ye, Ne, be, w;
      return Array.isArray(se) ? (
        /* c8 ignore next 1 */
        Te(se)
      ) : "tokenize" in se ? (
        // Looks like a construct.
        Te([
          /** @type {Construct} */
          se
        ])
      ) : Ge(se);
      function Ge(Ce) {
        return bn;
        function bn(Lt) {
          const gt = Lt !== null && Ce[Lt], He = Lt !== null && Ce.null, Mr = [
            // To do: add more extension tests.
            /* c8 ignore next 2 */
            ...Array.isArray(gt) ? gt : gt ? [gt] : [],
            ...Array.isArray(He) ? He : He ? [He] : []
          ];
          return Te(Mr)(Lt);
        }
      }
      function Te(Ce) {
        return ye = Ce, Ne = 0, Ce.length === 0 ? de : x(Ce[Ne]);
      }
      function x(Ce) {
        return bn;
        function bn(Lt) {
          return w = U(), be = Ce, Ce.partial || (u.currentConstruct = Ce), Ce.name && u.parser.constructs.disable.null.includes(Ce.name) ? ie() : Ce.tokenize.call(
            // If we do have fields, create an object w/ `context` as its
            // prototype.
            // This allows a “live binding”, which is needed for `interrupt`.
            H ? Object.assign(Object.create(u), H) : u,
            a,
            Ye,
            ie
          )(Lt);
        }
      }
      function Ye(Ce) {
        return P(be, w), te;
      }
      function ie(Ce) {
        return w.restore(), ++Ne < ye.length ? x(ye[Ne]) : de;
      }
    }
  }
  function q(P, H) {
    P.resolveAll && !o.includes(P) && o.push(P), P.resolve && dt(u.events, H, u.events.length - H, P.resolve(u.events.slice(H), u)), P.resolveTo && (u.events = P.resolveTo(u.events, u));
  }
  function U() {
    const P = p(), H = u.previous, W = u.currentConstruct, se = u.events.length, te = Array.from(l);
    return {
      from: se,
      restore: de
    };
    function de() {
      r = P, u.previous = H, u.currentConstruct = W, u.events.length = se, l = te, N();
    }
  }
  function N() {
    r.line in i && r.column < 2 && (r.column = i[r.line], r.offset += i[r.line] - 1);
  }
}
function b1(t, e) {
  const n = e.start._index, r = e.start._bufferIndex, i = e.end._index, o = e.end._bufferIndex;
  let s;
  if (n === i)
    s = [t[n].slice(r, o)];
  else {
    if (s = t.slice(n, i), r > -1) {
      const l = s[0];
      typeof l == "string" ? s[0] = l.slice(r) : s.shift();
    }
    o > 0 && s.push(t[i].slice(0, o));
  }
  return s;
}
function w1(t, e) {
  let n = -1;
  const r = [];
  let i;
  for (; ++n < t.length; ) {
    const o = t[n];
    let s;
    if (typeof o == "string")
      s = o;
    else switch (o) {
      case -5: {
        s = "\r";
        break;
      }
      case -4: {
        s = `
`;
        break;
      }
      case -3: {
        s = `\r
`;
        break;
      }
      case -2: {
        s = e ? " " : "	";
        break;
      }
      case -1: {
        if (!e && i) continue;
        s = " ";
        break;
      }
      default:
        s = String.fromCharCode(o);
    }
    i = o === -2, r.push(s);
  }
  return r.join("");
}
function x1(t) {
  const r = {
    constructs: (
      /** @type {FullNormalizedExtension} */
      ed([y1, ...(t || {}).extensions || []])
    ),
    content: i(Py),
    defined: [],
    document: i(Fy),
    flow: i(n1),
    lazy: {},
    string: i(o1),
    text: i(s1)
  };
  return r;
  function i(o) {
    return s;
    function s(l) {
      return k1(r, o, l);
    }
  }
}
function C1(t) {
  for (; !od(t); )
    ;
  return t;
}
const Gc = /[\0\t\n\r]/g;
function S1() {
  let t = 1, e = "", n = !0, r;
  return i;
  function i(o, s, l) {
    const a = [];
    let u, c, f, h, d;
    for (o = e + (typeof o == "string" ? o.toString() : new TextDecoder(s || void 0).decode(o)), f = 0, e = "", n && (o.charCodeAt(0) === 65279 && f++, n = void 0); f < o.length; ) {
      if (Gc.lastIndex = f, u = Gc.exec(o), h = u && u.index !== void 0 ? u.index : o.length, d = o.charCodeAt(h), !u) {
        e = o.slice(f);
        break;
      }
      if (d === 10 && f === h && r)
        a.push(-3), r = void 0;
      else
        switch (r && (a.push(-5), r = void 0), f < h && (a.push(o.slice(f, h)), t += h - f), d) {
          case 0: {
            a.push(65533), t++;
            break;
          }
          case 9: {
            for (c = Math.ceil(t / 4) * 4, a.push(-2); t++ < c; ) a.push(-1);
            break;
          }
          case 10: {
            a.push(-4), t = 1;
            break;
          }
          default:
            r = !0, t = 1;
        }
      f = h + 1;
    }
    return l && (r && a.push(-5), e && a.push(e), a.push(null)), a;
  }
}
const M1 = /\\([!-/:-@[-`{-~])|&(#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});/gi;
function fd(t) {
  return t.replace(M1, N1);
}
function N1(t, e, n) {
  if (e)
    return e;
  if (n.charCodeAt(0) === 35) {
    const i = n.charCodeAt(1), o = i === 120 || i === 88;
    return td(n.slice(o ? 2 : 1), o ? 16 : 10);
  }
  return Ka(n) || t;
}
function Li(t) {
  return !t || typeof t != "object" ? "" : "position" in t || "type" in t ? Yc(t.position) : "start" in t || "end" in t ? Yc(t) : "line" in t || "column" in t ? oa(t) : "";
}
function oa(t) {
  return Qc(t && t.line) + ":" + Qc(t && t.column);
}
function Yc(t) {
  return oa(t && t.start) + "-" + oa(t && t.end);
}
function Qc(t) {
  return t && typeof t == "number" ? t : 1;
}
const hd = {}.hasOwnProperty;
function T1(t, e, n) {
  return e && typeof e == "object" && (n = e, e = void 0), v1(n)(C1(x1(n).document().write(S1()(t, e, !0))));
}
function v1(t) {
  const e = {
    transforms: [],
    canContainEols: ["emphasis", "fragment", "heading", "paragraph", "strong"],
    enter: {
      autolink: o(jo),
      autolinkProtocol: U,
      autolinkEmail: U,
      atxHeading: o(_o),
      blockQuote: o(He),
      characterEscape: U,
      characterReference: U,
      codeFenced: o(Mr),
      codeFencedFenceInfo: s,
      codeFencedFenceMeta: s,
      codeIndented: o(Mr, s),
      codeText: o(Nr, s),
      codeTextData: U,
      data: U,
      codeFlowValue: U,
      definition: o(Si),
      definitionDestinationString: s,
      definitionLabelString: s,
      definitionTitleString: s,
      emphasis: o(Tr),
      hardBreakEscape: o(Vo),
      hardBreakTrailing: o(Vo),
      htmlFlow: o(Ho, s),
      htmlFlowData: U,
      htmlText: o(Ho, s),
      htmlTextData: U,
      image: o(Zs),
      label: s,
      link: o(jo),
      listItem: o(el),
      listItemValue: h,
      listOrdered: o(qo, f),
      listUnordered: o(qo),
      paragraph: o(tl),
      reference: x,
      referenceString: s,
      resourceDestinationString: s,
      resourceTitleString: s,
      setextHeading: o(_o),
      strong: o(nl),
      thematicBreak: o(il)
    },
    exit: {
      atxHeading: a(),
      atxHeadingSequence: _,
      autolink: a(),
      autolinkEmail: gt,
      autolinkProtocol: Lt,
      blockQuote: a(),
      characterEscapeValue: N,
      characterReferenceMarkerHexadecimal: ie,
      characterReferenceMarkerNumeric: ie,
      characterReferenceValue: Ce,
      characterReference: bn,
      codeFenced: a(k),
      codeFencedFence: m,
      codeFencedFenceInfo: d,
      codeFencedFenceMeta: p,
      codeFlowValue: N,
      codeIndented: a(y),
      codeText: a(te),
      codeTextData: N,
      data: N,
      definition: a(),
      definitionDestinationString: V,
      definitionLabelString: O,
      definitionTitleString: T,
      emphasis: a(),
      hardBreakEscape: a(H),
      hardBreakTrailing: a(H),
      htmlFlow: a(W),
      htmlFlowData: N,
      htmlText: a(se),
      htmlTextData: N,
      image: a(ye),
      label: be,
      labelText: Ne,
      lineEnding: P,
      link: a(de),
      listItem: a(),
      listOrdered: a(),
      listUnordered: a(),
      paragraph: a(),
      referenceString: Ye,
      resourceDestinationString: w,
      resourceTitleString: Ge,
      resource: Te,
      setextHeading: a(q),
      setextHeadingLineSequence: R,
      setextHeadingText: S,
      strong: a(),
      thematicBreak: a()
    }
  };
  dd(e, (t || {}).mdastExtensions || []);
  const n = {};
  return r;
  function r(I) {
    let B = {
      type: "root",
      children: []
    };
    const K = {
      stack: [B],
      tokenStack: [],
      config: e,
      enter: l,
      exit: u,
      buffer: s,
      resume: c,
      data: n
    }, ne = [];
    let he = -1;
    for (; ++he < I.length; )
      if (I[he][1].type === "listOrdered" || I[he][1].type === "listUnordered")
        if (I[he][0] === "enter")
          ne.push(he);
        else {
          const Qe = ne.pop();
          he = i(I, Qe, he);
        }
    for (he = -1; ++he < I.length; ) {
      const Qe = e[I[he][0]];
      hd.call(Qe, I[he][1].type) && Qe[I[he][1].type].call(Object.assign({
        sliceSerialize: I[he][2].sliceSerialize
      }, K), I[he][1]);
    }
    if (K.tokenStack.length > 0) {
      const Qe = K.tokenStack[K.tokenStack.length - 1];
      (Qe[1] || Xc).call(K, void 0, Qe[0]);
    }
    for (B.position = {
      start: Sn(I.length > 0 ? I[0][1].start : {
        line: 1,
        column: 1,
        offset: 0
      }),
      end: Sn(I.length > 0 ? I[I.length - 2][1].end : {
        line: 1,
        column: 1,
        offset: 0
      })
    }, he = -1; ++he < e.transforms.length; )
      B = e.transforms[he](B) || B;
    return B;
  }
  function i(I, B, K) {
    let ne = B - 1, he = -1, Qe = !1, zt, ut, Xe, wn;
    for (; ++ne <= K; ) {
      const je = I[ne];
      switch (je[1].type) {
        case "listUnordered":
        case "listOrdered":
        case "blockQuote": {
          je[0] === "enter" ? he++ : he--, wn = void 0;
          break;
        }
        case "lineEndingBlank": {
          je[0] === "enter" && (zt && !wn && !he && !Xe && (Xe = ne), wn = void 0);
          break;
        }
        case "linePrefix":
        case "listItemValue":
        case "listItemMarker":
        case "listItemPrefix":
        case "listItemPrefixWhitespace":
          break;
        default:
          wn = void 0;
      }
      if (!he && je[0] === "enter" && je[1].type === "listItemPrefix" || he === -1 && je[0] === "exit" && (je[1].type === "listUnordered" || je[1].type === "listOrdered")) {
        if (zt) {
          let ke = ne;
          for (ut = void 0; ke--; ) {
            const yt = I[ke];
            if (yt[1].type === "lineEnding" || yt[1].type === "lineEndingBlank") {
              if (yt[0] === "exit") continue;
              ut && (I[ut][1].type = "lineEndingBlank", Qe = !0), yt[1].type = "lineEnding", ut = ke;
            } else if (!(yt[1].type === "linePrefix" || yt[1].type === "blockQuotePrefix" || yt[1].type === "blockQuotePrefixWhitespace" || yt[1].type === "blockQuoteMarker" || yt[1].type === "listItemIndent")) break;
          }
          Xe && (!ut || Xe < ut) && (zt._spread = !0), zt.end = Object.assign({}, ut ? I[ut][1].start : je[1].end), I.splice(ut || ne, 0, ["exit", zt, je[2]]), ne++, K++;
        }
        if (je[1].type === "listItemPrefix") {
          const ke = {
            type: "listItem",
            _spread: !1,
            start: Object.assign({}, je[1].start),
            // @ts-expect-error: we’ll add `end` in a second.
            end: void 0
          };
          zt = ke, I.splice(ne, 0, ["enter", ke, je[2]]), ne++, K++, Xe = void 0, wn = !0;
        }
      }
    }
    return I[B][1]._spread = Qe, K;
  }
  function o(I, B) {
    return K;
    function K(ne) {
      l.call(this, I(ne), ne), B && B.call(this, ne);
    }
  }
  function s() {
    this.stack.push({
      type: "fragment",
      children: []
    });
  }
  function l(I, B, K) {
    this.stack[this.stack.length - 1].children.push(I), this.stack.push(I), this.tokenStack.push([B, K || void 0]), I.position = {
      start: Sn(B.start),
      // @ts-expect-error: `end` will be patched later.
      end: void 0
    };
  }
  function a(I) {
    return B;
    function B(K) {
      I && I.call(this, K), u.call(this, K);
    }
  }
  function u(I, B) {
    const K = this.stack.pop(), ne = this.tokenStack.pop();
    if (ne)
      ne[0].type !== I.type && (B ? B.call(this, I, ne[0]) : (ne[1] || Xc).call(this, I, ne[0]));
    else throw new Error("Cannot close `" + I.type + "` (" + Li({
      start: I.start,
      end: I.end
    }) + "): it’s not open");
    K.position.end = Sn(I.end);
  }
  function c() {
    return Wa(this.stack.pop());
  }
  function f() {
    this.data.expectingFirstListItemValue = !0;
  }
  function h(I) {
    if (this.data.expectingFirstListItemValue) {
      const B = this.stack[this.stack.length - 2];
      B.start = Number.parseInt(this.sliceSerialize(I), 10), this.data.expectingFirstListItemValue = void 0;
    }
  }
  function d() {
    const I = this.resume(), B = this.stack[this.stack.length - 1];
    B.lang = I;
  }
  function p() {
    const I = this.resume(), B = this.stack[this.stack.length - 1];
    B.meta = I;
  }
  function m() {
    this.data.flowCodeInside || (this.buffer(), this.data.flowCodeInside = !0);
  }
  function k() {
    const I = this.resume(), B = this.stack[this.stack.length - 1];
    B.value = I.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, ""), this.data.flowCodeInside = void 0;
  }
  function y() {
    const I = this.resume(), B = this.stack[this.stack.length - 1];
    B.value = I.replace(/(\r?\n|\r)$/g, "");
  }
  function O(I) {
    const B = this.resume(), K = this.stack[this.stack.length - 1];
    K.label = B, K.identifier = Dt(this.sliceSerialize(I)).toLowerCase();
  }
  function T() {
    const I = this.resume(), B = this.stack[this.stack.length - 1];
    B.title = I;
  }
  function V() {
    const I = this.resume(), B = this.stack[this.stack.length - 1];
    B.url = I;
  }
  function _(I) {
    const B = this.stack[this.stack.length - 1];
    if (!B.depth) {
      const K = this.sliceSerialize(I).length;
      B.depth = K;
    }
  }
  function S() {
    this.data.setextHeadingSlurpLineEnding = !0;
  }
  function R(I) {
    const B = this.stack[this.stack.length - 1];
    B.depth = this.sliceSerialize(I).codePointAt(0) === 61 ? 1 : 2;
  }
  function q() {
    this.data.setextHeadingSlurpLineEnding = void 0;
  }
  function U(I) {
    const K = this.stack[this.stack.length - 1].children;
    let ne = K[K.length - 1];
    (!ne || ne.type !== "text") && (ne = rl(), ne.position = {
      start: Sn(I.start),
      // @ts-expect-error: we’ll add `end` later.
      end: void 0
    }, K.push(ne)), this.stack.push(ne);
  }
  function N(I) {
    const B = this.stack.pop();
    B.value += this.sliceSerialize(I), B.position.end = Sn(I.end);
  }
  function P(I) {
    const B = this.stack[this.stack.length - 1];
    if (this.data.atHardBreak) {
      const K = B.children[B.children.length - 1];
      K.position.end = Sn(I.end), this.data.atHardBreak = void 0;
      return;
    }
    !this.data.setextHeadingSlurpLineEnding && e.canContainEols.includes(B.type) && (U.call(this, I), N.call(this, I));
  }
  function H() {
    this.data.atHardBreak = !0;
  }
  function W() {
    const I = this.resume(), B = this.stack[this.stack.length - 1];
    B.value = I;
  }
  function se() {
    const I = this.resume(), B = this.stack[this.stack.length - 1];
    B.value = I;
  }
  function te() {
    const I = this.resume(), B = this.stack[this.stack.length - 1];
    B.value = I;
  }
  function de() {
    const I = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const B = this.data.referenceType || "shortcut";
      I.type += "Reference", I.referenceType = B, delete I.url, delete I.title;
    } else
      delete I.identifier, delete I.label;
    this.data.referenceType = void 0;
  }
  function ye() {
    const I = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const B = this.data.referenceType || "shortcut";
      I.type += "Reference", I.referenceType = B, delete I.url, delete I.title;
    } else
      delete I.identifier, delete I.label;
    this.data.referenceType = void 0;
  }
  function Ne(I) {
    const B = this.sliceSerialize(I), K = this.stack[this.stack.length - 2];
    K.label = fd(B), K.identifier = Dt(B).toLowerCase();
  }
  function be() {
    const I = this.stack[this.stack.length - 1], B = this.resume(), K = this.stack[this.stack.length - 1];
    if (this.data.inReference = !0, K.type === "link") {
      const ne = I.children;
      K.children = ne;
    } else
      K.alt = B;
  }
  function w() {
    const I = this.resume(), B = this.stack[this.stack.length - 1];
    B.url = I;
  }
  function Ge() {
    const I = this.resume(), B = this.stack[this.stack.length - 1];
    B.title = I;
  }
  function Te() {
    this.data.inReference = void 0;
  }
  function x() {
    this.data.referenceType = "collapsed";
  }
  function Ye(I) {
    const B = this.resume(), K = this.stack[this.stack.length - 1];
    K.label = B, K.identifier = Dt(this.sliceSerialize(I)).toLowerCase(), this.data.referenceType = "full";
  }
  function ie(I) {
    this.data.characterReferenceType = I.type;
  }
  function Ce(I) {
    const B = this.sliceSerialize(I), K = this.data.characterReferenceType;
    let ne;
    K ? (ne = td(B, K === "characterReferenceMarkerNumeric" ? 10 : 16), this.data.characterReferenceType = void 0) : ne = Ka(B);
    const he = this.stack[this.stack.length - 1];
    he.value += ne;
  }
  function bn(I) {
    const B = this.stack.pop();
    B.position.end = Sn(I.end);
  }
  function Lt(I) {
    N.call(this, I);
    const B = this.stack[this.stack.length - 1];
    B.url = this.sliceSerialize(I);
  }
  function gt(I) {
    N.call(this, I);
    const B = this.stack[this.stack.length - 1];
    B.url = "mailto:" + this.sliceSerialize(I);
  }
  function He() {
    return {
      type: "blockquote",
      children: []
    };
  }
  function Mr() {
    return {
      type: "code",
      lang: null,
      meta: null,
      value: ""
    };
  }
  function Nr() {
    return {
      type: "inlineCode",
      value: ""
    };
  }
  function Si() {
    return {
      type: "definition",
      identifier: "",
      label: null,
      title: null,
      url: ""
    };
  }
  function Tr() {
    return {
      type: "emphasis",
      children: []
    };
  }
  function _o() {
    return {
      type: "heading",
      // @ts-expect-error `depth` will be set later.
      depth: 0,
      children: []
    };
  }
  function Vo() {
    return {
      type: "break"
    };
  }
  function Ho() {
    return {
      type: "html",
      value: ""
    };
  }
  function Zs() {
    return {
      type: "image",
      title: null,
      url: "",
      alt: null
    };
  }
  function jo() {
    return {
      type: "link",
      title: null,
      url: "",
      children: []
    };
  }
  function qo(I) {
    return {
      type: "list",
      ordered: I.type === "listOrdered",
      start: null,
      spread: I._spread,
      children: []
    };
  }
  function el(I) {
    return {
      type: "listItem",
      spread: I._spread,
      checked: null,
      children: []
    };
  }
  function tl() {
    return {
      type: "paragraph",
      children: []
    };
  }
  function nl() {
    return {
      type: "strong",
      children: []
    };
  }
  function rl() {
    return {
      type: "text",
      value: ""
    };
  }
  function il() {
    return {
      type: "thematicBreak"
    };
  }
}
function Sn(t) {
  return {
    line: t.line,
    column: t.column,
    offset: t.offset
  };
}
function dd(t, e) {
  let n = -1;
  for (; ++n < e.length; ) {
    const r = e[n];
    Array.isArray(r) ? dd(t, r) : I1(t, r);
  }
}
function I1(t, e) {
  let n;
  for (n in e)
    if (hd.call(e, n))
      switch (n) {
        case "canContainEols": {
          const r = e[n];
          r && t[n].push(...r);
          break;
        }
        case "transforms": {
          const r = e[n];
          r && t[n].push(...r);
          break;
        }
        case "enter":
        case "exit": {
          const r = e[n];
          r && Object.assign(t[n], r);
          break;
        }
      }
}
function Xc(t, e) {
  throw t ? new Error("Cannot close `" + t.type + "` (" + Li({
    start: t.start,
    end: t.end
  }) + "): a different token (`" + e.type + "`, " + Li({
    start: e.start,
    end: e.end
  }) + ") is open") : new Error("Cannot close document, a token (`" + e.type + "`, " + Li({
    start: e.start,
    end: e.end
  }) + ") is still open");
}
function sa(t) {
  const e = this;
  e.parser = n;
  function n(r) {
    return T1(r, {
      ...e.data("settings"),
      ...t,
      // Note: these options are not in the readme.
      // The goal is for them to be set by plugins on `data` instead of being
      // passed by users.
      extensions: e.data("micromarkExtensions") || [],
      mdastExtensions: e.data("fromMarkdownExtensions") || []
    });
  }
}
const Zc = {}.hasOwnProperty;
function E1(t, e) {
  const n = e || {};
  function r(i, ...o) {
    let s = r.invalid;
    const l = r.handlers;
    if (i && Zc.call(i, t)) {
      const a = String(i[t]);
      s = Zc.call(l, a) ? l[a] : r.unknown;
    }
    if (s)
      return s.call(this, i, ...o);
  }
  return r.handlers = n.handlers || {}, r.invalid = n.invalid, r.unknown = n.unknown, r;
}
const A1 = {}.hasOwnProperty;
function pd(t, e) {
  let n = -1, r;
  if (e.extensions)
    for (; ++n < e.extensions.length; )
      pd(t, e.extensions[n]);
  for (r in e)
    if (A1.call(e, r))
      switch (r) {
        case "extensions":
          break;
        case "unsafe": {
          ef(t[r], e[r]);
          break;
        }
        case "join": {
          ef(t[r], e[r]);
          break;
        }
        case "handlers": {
          O1(t[r], e[r]);
          break;
        }
        default:
          t.options[r] = e[r];
      }
  return t;
}
function ef(t, e) {
  e && t.push(...e);
}
function O1(t, e) {
  e && Object.assign(t, e);
}
function D1(t, e, n, r) {
  const i = n.enter("blockquote"), o = n.createTracker(r);
  o.move("> "), o.shift(2);
  const s = n.indentLines(
    n.containerFlow(t, o.current()),
    R1
  );
  return i(), s;
}
function R1(t, e, n) {
  return ">" + (n ? "" : " ") + t;
}
function md(t, e) {
  return tf(t, e.inConstruct, !0) && !tf(t, e.notInConstruct, !1);
}
function tf(t, e, n) {
  if (typeof e == "string" && (e = [e]), !e || e.length === 0)
    return n;
  let r = -1;
  for (; ++r < e.length; )
    if (t.includes(e[r]))
      return !0;
  return !1;
}
function nf(t, e, n, r) {
  let i = -1;
  for (; ++i < n.unsafe.length; )
    if (n.unsafe[i].character === `
` && md(n.stack, n.unsafe[i]))
      return /[ \t]/.test(r.before) ? "" : " ";
  return `\\
`;
}
function L1(t, e) {
  const n = String(t);
  let r = n.indexOf(e), i = r, o = 0, s = 0;
  if (typeof e != "string")
    throw new TypeError("Expected substring");
  for (; r !== -1; )
    r === i ? ++o > s && (s = o) : o = 1, i = r + e.length, r = n.indexOf(e, i);
  return s;
}
function la(t, e) {
  return !!(e.options.fences === !1 && t.value && // If there’s no info…
  !t.lang && // And there’s a non-whitespace character…
  /[^ \r\n]/.test(t.value) && // And the value doesn’t start or end in a blank…
  !/^[\t ]*(?:[\r\n]|$)|(?:^|[\r\n])[\t ]*$/.test(t.value));
}
function z1(t) {
  const e = t.options.fence || "`";
  if (e !== "`" && e !== "~")
    throw new Error(
      "Cannot serialize code with `" + e + "` for `options.fence`, expected `` ` `` or `~`"
    );
  return e;
}
function P1(t, e, n, r) {
  const i = z1(n), o = t.value || "", s = i === "`" ? "GraveAccent" : "Tilde";
  if (la(t, n)) {
    const f = n.enter("codeIndented"), h = n.indentLines(o, B1);
    return f(), h;
  }
  const l = n.createTracker(r), a = i.repeat(Math.max(L1(o, i) + 1, 3)), u = n.enter("codeFenced");
  let c = l.move(a);
  if (t.lang) {
    const f = n.enter(`codeFencedLang${s}`);
    c += l.move(
      n.safe(t.lang, {
        before: c,
        after: " ",
        encode: ["`"],
        ...l.current()
      })
    ), f();
  }
  if (t.lang && t.meta) {
    const f = n.enter(`codeFencedMeta${s}`);
    c += l.move(" "), c += l.move(
      n.safe(t.meta, {
        before: c,
        after: `
`,
        encode: ["`"],
        ...l.current()
      })
    ), f();
  }
  return c += l.move(`
`), o && (c += l.move(o + `
`)), c += l.move(a), u(), c;
}
function B1(t, e, n) {
  return (n ? "" : "    ") + t;
}
function Ja(t) {
  const e = t.options.quote || '"';
  if (e !== '"' && e !== "'")
    throw new Error(
      "Cannot serialize title with `" + e + "` for `options.quote`, expected `\"`, or `'`"
    );
  return e;
}
function F1(t, e, n, r) {
  const i = Ja(n), o = i === '"' ? "Quote" : "Apostrophe", s = n.enter("definition");
  let l = n.enter("label");
  const a = n.createTracker(r);
  let u = a.move("[");
  return u += a.move(
    n.safe(n.associationId(t), {
      before: u,
      after: "]",
      ...a.current()
    })
  ), u += a.move("]: "), l(), // If there’s no url, or…
  !t.url || // If there are control characters or whitespace.
  /[\0- \u007F]/.test(t.url) ? (l = n.enter("destinationLiteral"), u += a.move("<"), u += a.move(
    n.safe(t.url, { before: u, after: ">", ...a.current() })
  ), u += a.move(">")) : (l = n.enter("destinationRaw"), u += a.move(
    n.safe(t.url, {
      before: u,
      after: t.title ? " " : `
`,
      ...a.current()
    })
  )), l(), t.title && (l = n.enter(`title${o}`), u += a.move(" " + i), u += a.move(
    n.safe(t.title, {
      before: u,
      after: i,
      ...a.current()
    })
  ), u += a.move(i), l()), s(), u;
}
function $1(t) {
  const e = t.options.emphasis || "*";
  if (e !== "*" && e !== "_")
    throw new Error(
      "Cannot serialize emphasis with `" + e + "` for `options.emphasis`, expected `*`, or `_`"
    );
  return e;
}
function Vn(t) {
  return "&#x" + t.toString(16).toUpperCase() + ";";
}
function bs(t, e, n) {
  const r = oi(t), i = oi(e);
  return r === void 0 ? i === void 0 ? (
    // Letter inside:
    // we have to encode *both* letters for `_` as it is looser.
    // it already forms for `*` (and GFMs `~`).
    n === "_" ? { inside: !0, outside: !0 } : { inside: !1, outside: !1 }
  ) : i === 1 ? (
    // Whitespace inside: encode both (letter, whitespace).
    { inside: !0, outside: !0 }
  ) : (
    // Punctuation inside: encode outer (letter)
    { inside: !1, outside: !0 }
  ) : r === 1 ? i === void 0 ? (
    // Letter inside: already forms.
    { inside: !1, outside: !1 }
  ) : i === 1 ? (
    // Whitespace inside: encode both (whitespace).
    { inside: !0, outside: !0 }
  ) : (
    // Punctuation inside: already forms.
    { inside: !1, outside: !1 }
  ) : i === void 0 ? (
    // Letter inside: already forms.
    { inside: !1, outside: !1 }
  ) : i === 1 ? (
    // Whitespace inside: encode inner (whitespace).
    { inside: !0, outside: !1 }
  ) : (
    // Punctuation inside: already forms.
    { inside: !1, outside: !1 }
  );
}
gd.peek = _1;
function gd(t, e, n, r) {
  const i = $1(n), o = n.enter("emphasis"), s = n.createTracker(r), l = s.move(i);
  let a = s.move(
    n.containerPhrasing(t, {
      after: i,
      before: l,
      ...s.current()
    })
  );
  const u = a.charCodeAt(0), c = bs(
    r.before.charCodeAt(r.before.length - 1),
    u,
    i
  );
  c.inside && (a = Vn(u) + a.slice(1));
  const f = a.charCodeAt(a.length - 1), h = bs(r.after.charCodeAt(0), f, i);
  h.inside && (a = a.slice(0, -1) + Vn(f));
  const d = s.move(i);
  return o(), n.attentionEncodeSurroundingInfo = {
    after: h.outside,
    before: c.outside
  }, l + a + d;
}
function _1(t, e, n) {
  return n.options.emphasis || "*";
}
const _s = (
  // Note: overloads in JSDoc can’t yet use different `@template`s.
  /**
   * @type {(
   *   (<Condition extends string>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & {type: Condition}) &
   *   (<Condition extends Props>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & Condition) &
   *   (<Condition extends TestFunction>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & Predicate<Condition, Node>) &
   *   ((test?: null | undefined) => (node?: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node) &
   *   ((test?: Test) => Check)
   * )}
   */
  /**
   * @param {Test} [test]
   * @returns {Check}
   */
  function(t) {
    if (t == null)
      return q1;
    if (typeof t == "function")
      return Vs(t);
    if (typeof t == "object")
      return Array.isArray(t) ? V1(t) : (
        // Cast because `ReadonlyArray` goes into the above but `isArray`
        // narrows to `Array`.
        H1(
          /** @type {Props} */
          t
        )
      );
    if (typeof t == "string")
      return j1(t);
    throw new Error("Expected function, string, or object as test");
  }
);
function V1(t) {
  const e = [];
  let n = -1;
  for (; ++n < t.length; )
    e[n] = _s(t[n]);
  return Vs(r);
  function r(...i) {
    let o = -1;
    for (; ++o < e.length; )
      if (e[o].apply(this, i)) return !0;
    return !1;
  }
}
function H1(t) {
  const e = (
    /** @type {Record<string, unknown>} */
    t
  );
  return Vs(n);
  function n(r) {
    const i = (
      /** @type {Record<string, unknown>} */
      /** @type {unknown} */
      r
    );
    let o;
    for (o in t)
      if (i[o] !== e[o]) return !1;
    return !0;
  }
}
function j1(t) {
  return Vs(e);
  function e(n) {
    return n && n.type === t;
  }
}
function Vs(t) {
  return e;
  function e(n, r, i) {
    return !!(W1(n) && t.call(
      this,
      n,
      typeof r == "number" ? r : void 0,
      i || void 0
    ));
  }
}
function q1() {
  return !0;
}
function W1(t) {
  return t !== null && typeof t == "object" && "type" in t;
}
const yd = [], K1 = !0, aa = !1, ua = "skip";
function Ga(t, e, n, r) {
  let i;
  typeof e == "function" && typeof n != "function" ? (r = n, n = e) : i = e;
  const o = _s(i), s = r ? -1 : 1;
  l(t, void 0, [])();
  function l(a, u, c) {
    const f = (
      /** @type {Record<string, unknown>} */
      a && typeof a == "object" ? a : {}
    );
    if (typeof f.type == "string") {
      const d = (
        // `hast`
        typeof f.tagName == "string" ? f.tagName : (
          // `xast`
          typeof f.name == "string" ? f.name : void 0
        )
      );
      Object.defineProperty(h, "name", {
        value: "node (" + (a.type + (d ? "<" + d + ">" : "")) + ")"
      });
    }
    return h;
    function h() {
      let d = yd, p, m, k;
      if ((!e || o(a, u, c[c.length - 1] || void 0)) && (d = U1(n(a, c)), d[0] === aa))
        return d;
      if ("children" in a && a.children) {
        const y = (
          /** @type {UnistParent} */
          a
        );
        if (y.children && d[0] !== ua)
          for (m = (r ? y.children.length : -1) + s, k = c.concat(y); m > -1 && m < y.children.length; ) {
            const O = y.children[m];
            if (p = l(O, m, k)(), p[0] === aa)
              return p;
            m = typeof p[1] == "number" ? p[1] : m + s;
          }
      }
      return d;
    }
  }
}
function U1(t) {
  return Array.isArray(t) ? t : typeof t == "number" ? [K1, t] : t == null ? yd : [t];
}
function di(t, e, n, r) {
  let i, o, s;
  typeof e == "function" && typeof n != "function" ? (o = void 0, s = e, i = n) : (o = e, s = n, i = r), Ga(t, o, l, i);
  function l(a, u) {
    const c = u[u.length - 1], f = c ? c.children.indexOf(a) : void 0;
    return s(a, f, c);
  }
}
function kd(t, e) {
  let n = !1;
  return di(t, function(r) {
    if ("value" in r && /\r?\n|\r/.test(r.value) || r.type === "break")
      return n = !0, aa;
  }), !!((!t.depth || t.depth < 3) && Wa(t) && (e.options.setext || n));
}
function J1(t, e, n, r) {
  const i = Math.max(Math.min(6, t.depth || 1), 1), o = n.createTracker(r);
  if (kd(t, n)) {
    const c = n.enter("headingSetext"), f = n.enter("phrasing"), h = n.containerPhrasing(t, {
      ...o.current(),
      before: `
`,
      after: `
`
    });
    return f(), c(), h + `
` + (i === 1 ? "=" : "-").repeat(
      // The whole size…
      h.length - // Minus the position of the character after the last EOL (or
      // 0 if there is none)…
      (Math.max(h.lastIndexOf("\r"), h.lastIndexOf(`
`)) + 1)
    );
  }
  const s = "#".repeat(i), l = n.enter("headingAtx"), a = n.enter("phrasing");
  o.move(s + " ");
  let u = n.containerPhrasing(t, {
    before: "# ",
    after: `
`,
    ...o.current()
  });
  return /^[\t ]/.test(u) && (u = Vn(u.charCodeAt(0)) + u.slice(1)), u = u ? s + " " + u : s, n.options.closeAtx && (u += " " + s), a(), l(), u;
}
bd.peek = G1;
function bd(t) {
  return t.value || "";
}
function G1() {
  return "<";
}
wd.peek = Y1;
function wd(t, e, n, r) {
  const i = Ja(n), o = i === '"' ? "Quote" : "Apostrophe", s = n.enter("image");
  let l = n.enter("label");
  const a = n.createTracker(r);
  let u = a.move("![");
  return u += a.move(
    n.safe(t.alt, { before: u, after: "]", ...a.current() })
  ), u += a.move("]("), l(), // If there’s no url but there is a title…
  !t.url && t.title || // If there are control characters or whitespace.
  /[\0- \u007F]/.test(t.url) ? (l = n.enter("destinationLiteral"), u += a.move("<"), u += a.move(
    n.safe(t.url, { before: u, after: ">", ...a.current() })
  ), u += a.move(">")) : (l = n.enter("destinationRaw"), u += a.move(
    n.safe(t.url, {
      before: u,
      after: t.title ? " " : ")",
      ...a.current()
    })
  )), l(), t.title && (l = n.enter(`title${o}`), u += a.move(" " + i), u += a.move(
    n.safe(t.title, {
      before: u,
      after: i,
      ...a.current()
    })
  ), u += a.move(i), l()), u += a.move(")"), s(), u;
}
function Y1() {
  return "!";
}
xd.peek = Q1;
function xd(t, e, n, r) {
  const i = t.referenceType, o = n.enter("imageReference");
  let s = n.enter("label");
  const l = n.createTracker(r);
  let a = l.move("![");
  const u = n.safe(t.alt, {
    before: a,
    after: "]",
    ...l.current()
  });
  a += l.move(u + "]["), s();
  const c = n.stack;
  n.stack = [], s = n.enter("reference");
  const f = n.safe(n.associationId(t), {
    before: a,
    after: "]",
    ...l.current()
  });
  return s(), n.stack = c, o(), i === "full" || !u || u !== f ? a += l.move(f + "]") : i === "shortcut" ? a = a.slice(0, -1) : a += l.move("]"), a;
}
function Q1() {
  return "!";
}
Cd.peek = X1;
function Cd(t, e, n) {
  let r = t.value || "", i = "`", o = -1;
  for (; new RegExp("(^|[^`])" + i + "([^`]|$)").test(r); )
    i += "`";
  for (/[^ \r\n]/.test(r) && (/^[ \r\n]/.test(r) && /[ \r\n]$/.test(r) || /^`|`$/.test(r)) && (r = " " + r + " "); ++o < n.unsafe.length; ) {
    const s = n.unsafe[o], l = n.compilePattern(s);
    let a;
    if (s.atBreak)
      for (; a = l.exec(r); ) {
        let u = a.index;
        r.charCodeAt(u) === 10 && r.charCodeAt(u - 1) === 13 && u--, r = r.slice(0, u) + " " + r.slice(a.index + 1);
      }
  }
  return i + r + i;
}
function X1() {
  return "`";
}
function Sd(t, e) {
  const n = Wa(t);
  return !!(!e.options.resourceLink && // If there’s a url…
  t.url && // And there’s a no title…
  !t.title && // And the content of `node` is a single text node…
  t.children && t.children.length === 1 && t.children[0].type === "text" && // And if the url is the same as the content…
  (n === t.url || "mailto:" + n === t.url) && // And that starts w/ a protocol…
  /^[a-z][a-z+.-]+:/i.test(t.url) && // And that doesn’t contain ASCII control codes (character escapes and
  // references don’t work), space, or angle brackets…
  !/[\0- <>\u007F]/.test(t.url));
}
Md.peek = Z1;
function Md(t, e, n, r) {
  const i = Ja(n), o = i === '"' ? "Quote" : "Apostrophe", s = n.createTracker(r);
  let l, a;
  if (Sd(t, n)) {
    const c = n.stack;
    n.stack = [], l = n.enter("autolink");
    let f = s.move("<");
    return f += s.move(
      n.containerPhrasing(t, {
        before: f,
        after: ">",
        ...s.current()
      })
    ), f += s.move(">"), l(), n.stack = c, f;
  }
  l = n.enter("link"), a = n.enter("label");
  let u = s.move("[");
  return u += s.move(
    n.containerPhrasing(t, {
      before: u,
      after: "](",
      ...s.current()
    })
  ), u += s.move("]("), a(), // If there’s no url but there is a title…
  !t.url && t.title || // If there are control characters or whitespace.
  /[\0- \u007F]/.test(t.url) ? (a = n.enter("destinationLiteral"), u += s.move("<"), u += s.move(
    n.safe(t.url, { before: u, after: ">", ...s.current() })
  ), u += s.move(">")) : (a = n.enter("destinationRaw"), u += s.move(
    n.safe(t.url, {
      before: u,
      after: t.title ? " " : ")",
      ...s.current()
    })
  )), a(), t.title && (a = n.enter(`title${o}`), u += s.move(" " + i), u += s.move(
    n.safe(t.title, {
      before: u,
      after: i,
      ...s.current()
    })
  ), u += s.move(i), a()), u += s.move(")"), l(), u;
}
function Z1(t, e, n) {
  return Sd(t, n) ? "<" : "[";
}
Nd.peek = eb;
function Nd(t, e, n, r) {
  const i = t.referenceType, o = n.enter("linkReference");
  let s = n.enter("label");
  const l = n.createTracker(r);
  let a = l.move("[");
  const u = n.containerPhrasing(t, {
    before: a,
    after: "]",
    ...l.current()
  });
  a += l.move(u + "]["), s();
  const c = n.stack;
  n.stack = [], s = n.enter("reference");
  const f = n.safe(n.associationId(t), {
    before: a,
    after: "]",
    ...l.current()
  });
  return s(), n.stack = c, o(), i === "full" || !u || u !== f ? a += l.move(f + "]") : i === "shortcut" ? a = a.slice(0, -1) : a += l.move("]"), a;
}
function eb() {
  return "[";
}
function Ya(t) {
  const e = t.options.bullet || "*";
  if (e !== "*" && e !== "+" && e !== "-")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.bullet`, expected `*`, `+`, or `-`"
    );
  return e;
}
function tb(t) {
  const e = Ya(t), n = t.options.bulletOther;
  if (!n)
    return e === "*" ? "-" : "*";
  if (n !== "*" && n !== "+" && n !== "-")
    throw new Error(
      "Cannot serialize items with `" + n + "` for `options.bulletOther`, expected `*`, `+`, or `-`"
    );
  if (n === e)
    throw new Error(
      "Expected `bullet` (`" + e + "`) and `bulletOther` (`" + n + "`) to be different"
    );
  return n;
}
function nb(t) {
  const e = t.options.bulletOrdered || ".";
  if (e !== "." && e !== ")")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.bulletOrdered`, expected `.` or `)`"
    );
  return e;
}
function Td(t) {
  const e = t.options.rule || "*";
  if (e !== "*" && e !== "-" && e !== "_")
    throw new Error(
      "Cannot serialize rules with `" + e + "` for `options.rule`, expected `*`, `-`, or `_`"
    );
  return e;
}
function rb(t, e, n, r) {
  const i = n.enter("list"), o = n.bulletCurrent;
  let s = t.ordered ? nb(n) : Ya(n);
  const l = t.ordered ? s === "." ? ")" : "." : tb(n);
  let a = e && n.bulletLastUsed ? s === n.bulletLastUsed : !1;
  if (!t.ordered) {
    const c = t.children ? t.children[0] : void 0;
    if (
      // Bullet could be used as a thematic break marker:
      (s === "*" || s === "-") && // Empty first list item:
      c && (!c.children || !c.children[0]) && // Directly in two other list items:
      n.stack[n.stack.length - 1] === "list" && n.stack[n.stack.length - 2] === "listItem" && n.stack[n.stack.length - 3] === "list" && n.stack[n.stack.length - 4] === "listItem" && // That are each the first child.
      n.indexStack[n.indexStack.length - 1] === 0 && n.indexStack[n.indexStack.length - 2] === 0 && n.indexStack[n.indexStack.length - 3] === 0 && (a = !0), Td(n) === s && c
    ) {
      let f = -1;
      for (; ++f < t.children.length; ) {
        const h = t.children[f];
        if (h && h.type === "listItem" && h.children && h.children[0] && h.children[0].type === "thematicBreak") {
          a = !0;
          break;
        }
      }
    }
  }
  a && (s = l), n.bulletCurrent = s;
  const u = n.containerFlow(t, r);
  return n.bulletLastUsed = s, n.bulletCurrent = o, i(), u;
}
function ib(t) {
  const e = t.options.listItemIndent || "one";
  if (e !== "tab" && e !== "one" && e !== "mixed")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.listItemIndent`, expected `tab`, `one`, or `mixed`"
    );
  return e;
}
function ob(t, e, n, r) {
  const i = ib(n);
  let o = n.bulletCurrent || Ya(n);
  e && e.type === "list" && e.ordered && (o = (typeof e.start == "number" && e.start > -1 ? e.start : 1) + (n.options.incrementListMarker === !1 ? 0 : e.children.indexOf(t)) + o);
  let s = o.length + 1;
  (i === "tab" || i === "mixed" && (e && e.type === "list" && e.spread || t.spread)) && (s = Math.ceil(s / 4) * 4);
  const l = n.createTracker(r);
  l.move(o + " ".repeat(s - o.length)), l.shift(s);
  const a = n.enter("listItem"), u = n.indentLines(
    n.containerFlow(t, l.current()),
    c
  );
  return a(), u;
  function c(f, h, d) {
    return h ? (d ? "" : " ".repeat(s)) + f : (d ? o : o + " ".repeat(s - o.length)) + f;
  }
}
function sb(t, e, n, r) {
  const i = n.enter("paragraph"), o = n.enter("phrasing"), s = n.containerPhrasing(t, r);
  return o(), i(), s;
}
const lb = (
  /** @type {(node?: unknown) => node is Exclude<PhrasingContent, Html>} */
  _s([
    "break",
    "delete",
    "emphasis",
    // To do: next major: removed since footnotes were added to GFM.
    "footnote",
    "footnoteReference",
    "image",
    "imageReference",
    "inlineCode",
    // Enabled by `mdast-util-math`:
    "inlineMath",
    "link",
    "linkReference",
    // Enabled by `mdast-util-mdx`:
    "mdxJsxTextElement",
    // Enabled by `mdast-util-mdx`:
    "mdxTextExpression",
    "strong",
    "text",
    // Enabled by `mdast-util-directive`:
    "textDirective"
  ])
);
function ab(t, e, n, r) {
  return (t.children.some(function(s) {
    return lb(s);
  }) ? n.containerPhrasing : n.containerFlow).call(n, t, r);
}
function ub(t) {
  const e = t.options.strong || "*";
  if (e !== "*" && e !== "_")
    throw new Error(
      "Cannot serialize strong with `" + e + "` for `options.strong`, expected `*`, or `_`"
    );
  return e;
}
vd.peek = cb;
function vd(t, e, n, r) {
  const i = ub(n), o = n.enter("strong"), s = n.createTracker(r), l = s.move(i + i);
  let a = s.move(
    n.containerPhrasing(t, {
      after: i,
      before: l,
      ...s.current()
    })
  );
  const u = a.charCodeAt(0), c = bs(
    r.before.charCodeAt(r.before.length - 1),
    u,
    i
  );
  c.inside && (a = Vn(u) + a.slice(1));
  const f = a.charCodeAt(a.length - 1), h = bs(r.after.charCodeAt(0), f, i);
  h.inside && (a = a.slice(0, -1) + Vn(f));
  const d = s.move(i + i);
  return o(), n.attentionEncodeSurroundingInfo = {
    after: h.outside,
    before: c.outside
  }, l + a + d;
}
function cb(t, e, n) {
  return n.options.strong || "*";
}
function fb(t, e, n, r) {
  return n.safe(t.value, r);
}
function hb(t) {
  const e = t.options.ruleRepetition || 3;
  if (e < 3)
    throw new Error(
      "Cannot serialize rules with repetition `" + e + "` for `options.ruleRepetition`, expected `3` or more"
    );
  return e;
}
function db(t, e, n) {
  const r = (Td(n) + (n.options.ruleSpaces ? " " : "")).repeat(hb(n));
  return n.options.ruleSpaces ? r.slice(0, -1) : r;
}
const Qa = {
  blockquote: D1,
  break: nf,
  code: P1,
  definition: F1,
  emphasis: gd,
  hardBreak: nf,
  heading: J1,
  html: bd,
  image: wd,
  imageReference: xd,
  inlineCode: Cd,
  link: Md,
  linkReference: Nd,
  list: rb,
  listItem: ob,
  paragraph: sb,
  root: ab,
  strong: vd,
  text: fb,
  thematicBreak: db
}, pb = [mb];
function mb(t, e, n, r) {
  if (e.type === "code" && la(e, r) && (t.type === "list" || t.type === e.type && la(t, r)))
    return !1;
  if ("spread" in n && typeof n.spread == "boolean")
    return t.type === "paragraph" && // Two paragraphs.
    (t.type === e.type || e.type === "definition" || // Paragraph followed by a setext heading.
    e.type === "heading" && kd(e, r)) ? void 0 : n.spread ? 1 : 0;
}
const Un = [
  "autolink",
  "destinationLiteral",
  "destinationRaw",
  "reference",
  "titleQuote",
  "titleApostrophe"
], gb = [
  { character: "	", after: "[\\r\\n]", inConstruct: "phrasing" },
  { character: "	", before: "[\\r\\n]", inConstruct: "phrasing" },
  {
    character: "	",
    inConstruct: ["codeFencedLangGraveAccent", "codeFencedLangTilde"]
  },
  {
    character: "\r",
    inConstruct: [
      "codeFencedLangGraveAccent",
      "codeFencedLangTilde",
      "codeFencedMetaGraveAccent",
      "codeFencedMetaTilde",
      "destinationLiteral",
      "headingAtx"
    ]
  },
  {
    character: `
`,
    inConstruct: [
      "codeFencedLangGraveAccent",
      "codeFencedLangTilde",
      "codeFencedMetaGraveAccent",
      "codeFencedMetaTilde",
      "destinationLiteral",
      "headingAtx"
    ]
  },
  { character: " ", after: "[\\r\\n]", inConstruct: "phrasing" },
  { character: " ", before: "[\\r\\n]", inConstruct: "phrasing" },
  {
    character: " ",
    inConstruct: ["codeFencedLangGraveAccent", "codeFencedLangTilde"]
  },
  // An exclamation mark can start an image, if it is followed by a link or
  // a link reference.
  {
    character: "!",
    after: "\\[",
    inConstruct: "phrasing",
    notInConstruct: Un
  },
  // A quote can break out of a title.
  { character: '"', inConstruct: "titleQuote" },
  // A number sign could start an ATX heading if it starts a line.
  { atBreak: !0, character: "#" },
  { character: "#", inConstruct: "headingAtx", after: `(?:[\r
]|$)` },
  // Dollar sign and percentage are not used in markdown.
  // An ampersand could start a character reference.
  { character: "&", after: "[#A-Za-z]", inConstruct: "phrasing" },
  // An apostrophe can break out of a title.
  { character: "'", inConstruct: "titleApostrophe" },
  // A left paren could break out of a destination raw.
  { character: "(", inConstruct: "destinationRaw" },
  // A left paren followed by `]` could make something into a link or image.
  {
    before: "\\]",
    character: "(",
    inConstruct: "phrasing",
    notInConstruct: Un
  },
  // A right paren could start a list item or break out of a destination
  // raw.
  { atBreak: !0, before: "\\d+", character: ")" },
  { character: ")", inConstruct: "destinationRaw" },
  // An asterisk can start thematic breaks, list items, emphasis, strong.
  { atBreak: !0, character: "*", after: `(?:[ 	\r
*])` },
  { character: "*", inConstruct: "phrasing", notInConstruct: Un },
  // A plus sign could start a list item.
  { atBreak: !0, character: "+", after: `(?:[ 	\r
])` },
  // A dash can start thematic breaks, list items, and setext heading
  // underlines.
  { atBreak: !0, character: "-", after: `(?:[ 	\r
-])` },
  // A dot could start a list item.
  { atBreak: !0, before: "\\d+", character: ".", after: `(?:[ 	\r
]|$)` },
  // Slash, colon, and semicolon are not used in markdown for constructs.
  // A less than can start html (flow or text) or an autolink.
  // HTML could start with an exclamation mark (declaration, cdata, comment),
  // slash (closing tag), question mark (instruction), or a letter (tag).
  // An autolink also starts with a letter.
  // Finally, it could break out of a destination literal.
  { atBreak: !0, character: "<", after: "[!/?A-Za-z]" },
  {
    character: "<",
    after: "[!/?A-Za-z]",
    inConstruct: "phrasing",
    notInConstruct: Un
  },
  { character: "<", inConstruct: "destinationLiteral" },
  // An equals to can start setext heading underlines.
  { atBreak: !0, character: "=" },
  // A greater than can start block quotes and it can break out of a
  // destination literal.
  { atBreak: !0, character: ">" },
  { character: ">", inConstruct: "destinationLiteral" },
  // Question mark and at sign are not used in markdown for constructs.
  // A left bracket can start definitions, references, labels,
  { atBreak: !0, character: "[" },
  { character: "[", inConstruct: "phrasing", notInConstruct: Un },
  { character: "[", inConstruct: ["label", "reference"] },
  // A backslash can start an escape (when followed by punctuation) or a
  // hard break (when followed by an eol).
  // Note: typical escapes are handled in `safe`!
  { character: "\\", after: "[\\r\\n]", inConstruct: "phrasing" },
  // A right bracket can exit labels.
  { character: "]", inConstruct: ["label", "reference"] },
  // Caret is not used in markdown for constructs.
  // An underscore can start emphasis, strong, or a thematic break.
  { atBreak: !0, character: "_" },
  { character: "_", inConstruct: "phrasing", notInConstruct: Un },
  // A grave accent can start code (fenced or text), or it can break out of
  // a grave accent code fence.
  { atBreak: !0, character: "`" },
  {
    character: "`",
    inConstruct: ["codeFencedLangGraveAccent", "codeFencedMetaGraveAccent"]
  },
  { character: "`", inConstruct: "phrasing", notInConstruct: Un },
  // Left brace, vertical bar, right brace are not used in markdown for
  // constructs.
  // A tilde can start code (fenced).
  { atBreak: !0, character: "~" }
];
function yb(t) {
  return t.label || !t.identifier ? t.label || "" : fd(t.identifier);
}
function kb(t) {
  if (!t._compiled) {
    const e = (t.atBreak ? "[\\r\\n][\\t ]*" : "") + (t.before ? "(?:" + t.before + ")" : "");
    t._compiled = new RegExp(
      (e ? "(" + e + ")" : "") + (/[|\\{}()[\]^$+*?.-]/.test(t.character) ? "\\" : "") + t.character + (t.after ? "(?:" + t.after + ")" : ""),
      "g"
    );
  }
  return t._compiled;
}
function bb(t, e, n) {
  const r = e.indexStack, i = t.children || [], o = [];
  let s = -1, l = n.before, a;
  r.push(-1);
  let u = e.createTracker(n);
  for (; ++s < i.length; ) {
    const c = i[s];
    let f;
    if (r[r.length - 1] = s, s + 1 < i.length) {
      let p = e.handle.handlers[i[s + 1].type];
      p && p.peek && (p = p.peek), f = p ? p(i[s + 1], t, e, {
        before: "",
        after: "",
        ...u.current()
      }).charAt(0) : "";
    } else
      f = n.after;
    o.length > 0 && (l === "\r" || l === `
`) && c.type === "html" && (o[o.length - 1] = o[o.length - 1].replace(
      /(\r?\n|\r)$/,
      " "
    ), l = " ", u = e.createTracker(n), u.move(o.join("")));
    let h = e.handle(c, t, e, {
      ...u.current(),
      after: f,
      before: l
    });
    a && a === h.slice(0, 1) && (h = Vn(a.charCodeAt(0)) + h.slice(1));
    const d = e.attentionEncodeSurroundingInfo;
    e.attentionEncodeSurroundingInfo = void 0, a = void 0, d && (o.length > 0 && d.before && l === o[o.length - 1].slice(-1) && (o[o.length - 1] = o[o.length - 1].slice(0, -1) + Vn(l.charCodeAt(0))), d.after && (a = f)), u.move(h), o.push(h), l = h.slice(-1);
  }
  return r.pop(), o.join("");
}
function wb(t, e, n) {
  const r = e.indexStack, i = t.children || [], o = e.createTracker(n), s = [];
  let l = -1;
  for (r.push(-1); ++l < i.length; ) {
    const a = i[l];
    r[r.length - 1] = l, s.push(
      o.move(
        e.handle(a, t, e, {
          before: `
`,
          after: `
`,
          ...o.current()
        })
      )
    ), a.type !== "list" && (e.bulletLastUsed = void 0), l < i.length - 1 && s.push(
      o.move(xb(a, i[l + 1], t, e))
    );
  }
  return r.pop(), s.join("");
}
function xb(t, e, n, r) {
  let i = r.join.length;
  for (; i--; ) {
    const o = r.join[i](t, e, n, r);
    if (o === !0 || o === 1)
      break;
    if (typeof o == "number")
      return `
`.repeat(1 + o);
    if (o === !1)
      return `

<!---->

`;
  }
  return `

`;
}
const Cb = /\r?\n|\r/g;
function Sb(t, e) {
  const n = [];
  let r = 0, i = 0, o;
  for (; o = Cb.exec(t); )
    s(t.slice(r, o.index)), n.push(o[0]), r = o.index + o[0].length, i++;
  return s(t.slice(r)), n.join("");
  function s(l) {
    n.push(e(l, i, !l));
  }
}
function Mb(t, e, n) {
  const r = (n.before || "") + (e || "") + (n.after || ""), i = [], o = [], s = {};
  let l = -1;
  for (; ++l < t.unsafe.length; ) {
    const c = t.unsafe[l];
    if (!md(t.stack, c))
      continue;
    const f = t.compilePattern(c);
    let h;
    for (; h = f.exec(r); ) {
      const d = "before" in c || !!c.atBreak, p = "after" in c, m = h.index + (d ? h[1].length : 0);
      i.includes(m) ? (s[m].before && !d && (s[m].before = !1), s[m].after && !p && (s[m].after = !1)) : (i.push(m), s[m] = { before: d, after: p });
    }
  }
  i.sort(Nb);
  let a = n.before ? n.before.length : 0;
  const u = r.length - (n.after ? n.after.length : 0);
  for (l = -1; ++l < i.length; ) {
    const c = i[l];
    c < a || c >= u || c + 1 < u && i[l + 1] === c + 1 && s[c].after && !s[c + 1].before && !s[c + 1].after || i[l - 1] === c - 1 && s[c].before && !s[c - 1].before && !s[c - 1].after || (a !== c && o.push(rf(r.slice(a, c), "\\")), a = c, /[!-/:-@[-`{-~]/.test(r.charAt(c)) && (!n.encode || !n.encode.includes(r.charAt(c))) ? o.push("\\") : (o.push(Vn(r.charCodeAt(c))), a++));
  }
  return o.push(rf(r.slice(a, u), n.after)), o.join("");
}
function Nb(t, e) {
  return t - e;
}
function rf(t, e) {
  const n = /\\(?=[!-/:-@[-`{-~])/g, r = [], i = [], o = t + e;
  let s = -1, l = 0, a;
  for (; a = n.exec(o); )
    r.push(a.index);
  for (; ++s < r.length; )
    l !== r[s] && i.push(t.slice(l, r[s])), i.push("\\"), l = r[s];
  return i.push(t.slice(l)), i.join("");
}
function Tb(t) {
  const e = t || {}, n = e.now || {};
  let r = e.lineShift || 0, i = n.line || 1, o = n.column || 1;
  return { move: a, current: s, shift: l };
  function s() {
    return { now: { line: i, column: o }, lineShift: r };
  }
  function l(u) {
    r += u;
  }
  function a(u) {
    const c = u || "", f = c.split(/\r?\n|\r/g), h = f[f.length - 1];
    return i += f.length - 1, o = f.length === 1 ? o + h.length : 1 + h.length + r, c;
  }
}
function vb(t, e) {
  const n = e || {}, r = {
    associationId: yb,
    containerPhrasing: Ob,
    containerFlow: Db,
    createTracker: Tb,
    compilePattern: kb,
    enter: o,
    // @ts-expect-error: GFM / frontmatter are typed in `mdast` but not defined
    // here.
    handlers: { ...Qa },
    // @ts-expect-error: add `handle` in a second.
    handle: void 0,
    indentLines: Sb,
    indexStack: [],
    join: [...pb],
    options: {},
    safe: Rb,
    stack: [],
    unsafe: [...gb]
  };
  pd(r, n), r.options.tightDefinitions && r.join.push(Ab), r.handle = E1("type", {
    invalid: Ib,
    unknown: Eb,
    handlers: r.handlers
  });
  let i = r.handle(t, void 0, r, {
    before: `
`,
    after: `
`,
    now: { line: 1, column: 1 },
    lineShift: 0
  });
  return i && i.charCodeAt(i.length - 1) !== 10 && i.charCodeAt(i.length - 1) !== 13 && (i += `
`), i;
  function o(s) {
    return r.stack.push(s), l;
    function l() {
      r.stack.pop();
    }
  }
}
function Ib(t) {
  throw new Error("Cannot handle value `" + t + "`, expected node");
}
function Eb(t) {
  const e = (
    /** @type {Nodes} */
    t
  );
  throw new Error("Cannot handle unknown node `" + e.type + "`");
}
function Ab(t, e) {
  if (t.type === "definition" && t.type === e.type)
    return 0;
}
function Ob(t, e) {
  return bb(t, this, e);
}
function Db(t, e) {
  return wb(t, this, e);
}
function Rb(t, e) {
  return Mb(this, t, e);
}
function ca(t) {
  const e = this;
  e.compiler = n;
  function n(r) {
    return vb(r, {
      ...e.data("settings"),
      ...t,
      // Note: this option is not in the readme.
      // The goal is for it to be set by plugins on `data` instead of being
      // passed by users.
      extensions: e.data("toMarkdownExtensions") || []
    });
  }
}
function of(t) {
  if (t)
    throw t;
}
function Lb(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var rs = Object.prototype.hasOwnProperty, Id = Object.prototype.toString, sf = Object.defineProperty, lf = Object.getOwnPropertyDescriptor, af = function(e) {
  return typeof Array.isArray == "function" ? Array.isArray(e) : Id.call(e) === "[object Array]";
}, uf = function(e) {
  if (!e || Id.call(e) !== "[object Object]")
    return !1;
  var n = rs.call(e, "constructor"), r = e.constructor && e.constructor.prototype && rs.call(e.constructor.prototype, "isPrototypeOf");
  if (e.constructor && !n && !r)
    return !1;
  var i;
  for (i in e)
    ;
  return typeof i > "u" || rs.call(e, i);
}, cf = function(e, n) {
  sf && n.name === "__proto__" ? sf(e, n.name, {
    enumerable: !0,
    configurable: !0,
    value: n.newValue,
    writable: !0
  }) : e[n.name] = n.newValue;
}, ff = function(e, n) {
  if (n === "__proto__")
    if (rs.call(e, n)) {
      if (lf)
        return lf(e, n).value;
    } else return;
  return e[n];
}, zb = function t() {
  var e, n, r, i, o, s, l = arguments[0], a = 1, u = arguments.length, c = !1;
  for (typeof l == "boolean" && (c = l, l = arguments[1] || {}, a = 2), (l == null || typeof l != "object" && typeof l != "function") && (l = {}); a < u; ++a)
    if (e = arguments[a], e != null)
      for (n in e)
        r = ff(l, n), i = ff(e, n), l !== i && (c && i && (uf(i) || (o = af(i))) ? (o ? (o = !1, s = r && af(r) ? r : []) : s = r && uf(r) ? r : {}, cf(l, { name: n, newValue: t(c, s, i) })) : typeof i < "u" && cf(l, { name: n, newValue: i }));
  return l;
};
const ul = /* @__PURE__ */ Lb(zb);
function fa(t) {
  if (typeof t != "object" || t === null)
    return !1;
  const e = Object.getPrototypeOf(t);
  return (e === null || e === Object.prototype || Object.getPrototypeOf(e) === null) && !(Symbol.toStringTag in t) && !(Symbol.iterator in t);
}
function Pb() {
  const t = [], e = { run: n, use: r };
  return e;
  function n(...i) {
    let o = -1;
    const s = i.pop();
    if (typeof s != "function")
      throw new TypeError("Expected function as last argument, not " + s);
    l(null, ...i);
    function l(a, ...u) {
      const c = t[++o];
      let f = -1;
      if (a) {
        s(a);
        return;
      }
      for (; ++f < i.length; )
        (u[f] === null || u[f] === void 0) && (u[f] = i[f]);
      i = u, c ? Bb(c, l)(...u) : s(null, ...u);
    }
  }
  function r(i) {
    if (typeof i != "function")
      throw new TypeError(
        "Expected `middelware` to be a function, not " + i
      );
    return t.push(i), e;
  }
}
function Bb(t, e) {
  let n;
  return r;
  function r(...s) {
    const l = t.length > s.length;
    let a;
    l && s.push(i);
    try {
      a = t.apply(this, s);
    } catch (u) {
      const c = (
        /** @type {Error} */
        u
      );
      if (l && n)
        throw c;
      return i(c);
    }
    l || (a && a.then && typeof a.then == "function" ? a.then(o, i) : a instanceof Error ? i(a) : o(a));
  }
  function i(s, ...l) {
    n || (n = !0, e(s, ...l));
  }
  function o(s) {
    i(null, s);
  }
}
class st extends Error {
  /**
   * Create a message for `reason`.
   *
   * > 🪦 **Note**: also has obsolete signatures.
   *
   * @overload
   * @param {string} reason
   * @param {Options | null | undefined} [options]
   * @returns
   *
   * @overload
   * @param {string} reason
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {string} reason
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {string} reason
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @param {Error | VFileMessage | string} causeOrReason
   *   Reason for message, should use markdown.
   * @param {Node | NodeLike | Options | Point | Position | string | null | undefined} [optionsOrParentOrPlace]
   *   Configuration (optional).
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns
   *   Instance of `VFileMessage`.
   */
  // eslint-disable-next-line complexity
  constructor(e, n, r) {
    super(), typeof n == "string" && (r = n, n = void 0);
    let i = "", o = {}, s = !1;
    if (n && ("line" in n && "column" in n ? o = { place: n } : "start" in n && "end" in n ? o = { place: n } : "type" in n ? o = {
      ancestors: [n],
      place: n.position
    } : o = { ...n }), typeof e == "string" ? i = e : !o.cause && e && (s = !0, i = e.message, o.cause = e), !o.ruleId && !o.source && typeof r == "string") {
      const a = r.indexOf(":");
      a === -1 ? o.ruleId = r : (o.source = r.slice(0, a), o.ruleId = r.slice(a + 1));
    }
    if (!o.place && o.ancestors && o.ancestors) {
      const a = o.ancestors[o.ancestors.length - 1];
      a && (o.place = a.position);
    }
    const l = o.place && "start" in o.place ? o.place.start : o.place;
    this.ancestors = o.ancestors || void 0, this.cause = o.cause || void 0, this.column = l ? l.column : void 0, this.fatal = void 0, this.file = "", this.message = i, this.line = l ? l.line : void 0, this.name = Li(o.place) || "1:1", this.place = o.place || void 0, this.reason = this.message, this.ruleId = o.ruleId || void 0, this.source = o.source || void 0, this.stack = s && o.cause && typeof o.cause.stack == "string" ? o.cause.stack : "", this.actual = void 0, this.expected = void 0, this.note = void 0, this.url = void 0;
  }
}
st.prototype.file = "";
st.prototype.name = "";
st.prototype.reason = "";
st.prototype.message = "";
st.prototype.stack = "";
st.prototype.column = void 0;
st.prototype.line = void 0;
st.prototype.ancestors = void 0;
st.prototype.cause = void 0;
st.prototype.fatal = void 0;
st.prototype.place = void 0;
st.prototype.ruleId = void 0;
st.prototype.source = void 0;
const Bt = { basename: Fb, dirname: $b, extname: _b, join: Vb, sep: "/" };
function Fb(t, e) {
  if (e !== void 0 && typeof e != "string")
    throw new TypeError('"ext" argument must be a string');
  Mo(t);
  let n = 0, r = -1, i = t.length, o;
  if (e === void 0 || e.length === 0 || e.length > t.length) {
    for (; i--; )
      if (t.codePointAt(i) === 47) {
        if (o) {
          n = i + 1;
          break;
        }
      } else r < 0 && (o = !0, r = i + 1);
    return r < 0 ? "" : t.slice(n, r);
  }
  if (e === t)
    return "";
  let s = -1, l = e.length - 1;
  for (; i--; )
    if (t.codePointAt(i) === 47) {
      if (o) {
        n = i + 1;
        break;
      }
    } else
      s < 0 && (o = !0, s = i + 1), l > -1 && (t.codePointAt(i) === e.codePointAt(l--) ? l < 0 && (r = i) : (l = -1, r = s));
  return n === r ? r = s : r < 0 && (r = t.length), t.slice(n, r);
}
function $b(t) {
  if (Mo(t), t.length === 0)
    return ".";
  let e = -1, n = t.length, r;
  for (; --n; )
    if (t.codePointAt(n) === 47) {
      if (r) {
        e = n;
        break;
      }
    } else r || (r = !0);
  return e < 0 ? t.codePointAt(0) === 47 ? "/" : "." : e === 1 && t.codePointAt(0) === 47 ? "//" : t.slice(0, e);
}
function _b(t) {
  Mo(t);
  let e = t.length, n = -1, r = 0, i = -1, o = 0, s;
  for (; e--; ) {
    const l = t.codePointAt(e);
    if (l === 47) {
      if (s) {
        r = e + 1;
        break;
      }
      continue;
    }
    n < 0 && (s = !0, n = e + 1), l === 46 ? i < 0 ? i = e : o !== 1 && (o = 1) : i > -1 && (o = -1);
  }
  return i < 0 || n < 0 || // We saw a non-dot character immediately before the dot.
  o === 0 || // The (right-most) trimmed path component is exactly `..`.
  o === 1 && i === n - 1 && i === r + 1 ? "" : t.slice(i, n);
}
function Vb(...t) {
  let e = -1, n;
  for (; ++e < t.length; )
    Mo(t[e]), t[e] && (n = n === void 0 ? t[e] : n + "/" + t[e]);
  return n === void 0 ? "." : Hb(n);
}
function Hb(t) {
  Mo(t);
  const e = t.codePointAt(0) === 47;
  let n = jb(t, !e);
  return n.length === 0 && !e && (n = "."), n.length > 0 && t.codePointAt(t.length - 1) === 47 && (n += "/"), e ? "/" + n : n;
}
function jb(t, e) {
  let n = "", r = 0, i = -1, o = 0, s = -1, l, a;
  for (; ++s <= t.length; ) {
    if (s < t.length)
      l = t.codePointAt(s);
    else {
      if (l === 47)
        break;
      l = 47;
    }
    if (l === 47) {
      if (!(i === s - 1 || o === 1)) if (i !== s - 1 && o === 2) {
        if (n.length < 2 || r !== 2 || n.codePointAt(n.length - 1) !== 46 || n.codePointAt(n.length - 2) !== 46) {
          if (n.length > 2) {
            if (a = n.lastIndexOf("/"), a !== n.length - 1) {
              a < 0 ? (n = "", r = 0) : (n = n.slice(0, a), r = n.length - 1 - n.lastIndexOf("/")), i = s, o = 0;
              continue;
            }
          } else if (n.length > 0) {
            n = "", r = 0, i = s, o = 0;
            continue;
          }
        }
        e && (n = n.length > 0 ? n + "/.." : "..", r = 2);
      } else
        n.length > 0 ? n += "/" + t.slice(i + 1, s) : n = t.slice(i + 1, s), r = s - i - 1;
      i = s, o = 0;
    } else l === 46 && o > -1 ? o++ : o = -1;
  }
  return n;
}
function Mo(t) {
  if (typeof t != "string")
    throw new TypeError(
      "Path must be a string. Received " + JSON.stringify(t)
    );
}
const qb = { cwd: Wb };
function Wb() {
  return "/";
}
function ha(t) {
  return !!(t !== null && typeof t == "object" && "href" in t && t.href && "protocol" in t && t.protocol && // @ts-expect-error: indexing is fine.
  t.auth === void 0);
}
function Kb(t) {
  if (typeof t == "string")
    t = new URL(t);
  else if (!ha(t)) {
    const e = new TypeError(
      'The "path" argument must be of type string or an instance of URL. Received `' + t + "`"
    );
    throw e.code = "ERR_INVALID_ARG_TYPE", e;
  }
  if (t.protocol !== "file:") {
    const e = new TypeError("The URL must be of scheme file");
    throw e.code = "ERR_INVALID_URL_SCHEME", e;
  }
  return Ub(t);
}
function Ub(t) {
  if (t.hostname !== "") {
    const r = new TypeError(
      'File URL host must be "localhost" or empty on darwin'
    );
    throw r.code = "ERR_INVALID_FILE_URL_HOST", r;
  }
  const e = t.pathname;
  let n = -1;
  for (; ++n < e.length; )
    if (e.codePointAt(n) === 37 && e.codePointAt(n + 1) === 50) {
      const r = e.codePointAt(n + 2);
      if (r === 70 || r === 102) {
        const i = new TypeError(
          "File URL path must not include encoded / characters"
        );
        throw i.code = "ERR_INVALID_FILE_URL_PATH", i;
      }
    }
  return decodeURIComponent(e);
}
const cl = (
  /** @type {const} */
  [
    "history",
    "path",
    "basename",
    "stem",
    "extname",
    "dirname"
  ]
);
class Jb {
  /**
   * Create a new virtual file.
   *
   * `options` is treated as:
   *
   * *   `string` or `Uint8Array` — `{value: options}`
   * *   `URL` — `{path: options}`
   * *   `VFile` — shallow copies its data over to the new file
   * *   `object` — all fields are shallow copied over to the new file
   *
   * Path related fields are set in the following order (least specific to
   * most specific): `history`, `path`, `basename`, `stem`, `extname`,
   * `dirname`.
   *
   * You cannot set `dirname` or `extname` without setting either `history`,
   * `path`, `basename`, or `stem` too.
   *
   * @param {Compatible | null | undefined} [value]
   *   File value.
   * @returns
   *   New instance.
   */
  constructor(e) {
    let n;
    e ? ha(e) ? n = { path: e } : typeof e == "string" || Gb(e) ? n = { value: e } : n = e : n = {}, this.cwd = "cwd" in n ? "" : qb.cwd(), this.data = {}, this.history = [], this.messages = [], this.value, this.map, this.result, this.stored;
    let r = -1;
    for (; ++r < cl.length; ) {
      const o = cl[r];
      o in n && n[o] !== void 0 && n[o] !== null && (this[o] = o === "history" ? [...n[o]] : n[o]);
    }
    let i;
    for (i in n)
      cl.includes(i) || (this[i] = n[i]);
  }
  /**
   * Get the basename (including extname) (example: `'index.min.js'`).
   *
   * @returns {string | undefined}
   *   Basename.
   */
  get basename() {
    return typeof this.path == "string" ? Bt.basename(this.path) : void 0;
  }
  /**
   * Set basename (including extname) (`'index.min.js'`).
   *
   * Cannot contain path separators (`'/'` on unix, macOS, and browsers, `'\'`
   * on windows).
   * Cannot be nullified (use `file.path = file.dirname` instead).
   *
   * @param {string} basename
   *   Basename.
   * @returns {undefined}
   *   Nothing.
   */
  set basename(e) {
    hl(e, "basename"), fl(e, "basename"), this.path = Bt.join(this.dirname || "", e);
  }
  /**
   * Get the parent path (example: `'~'`).
   *
   * @returns {string | undefined}
   *   Dirname.
   */
  get dirname() {
    return typeof this.path == "string" ? Bt.dirname(this.path) : void 0;
  }
  /**
   * Set the parent path (example: `'~'`).
   *
   * Cannot be set if there’s no `path` yet.
   *
   * @param {string | undefined} dirname
   *   Dirname.
   * @returns {undefined}
   *   Nothing.
   */
  set dirname(e) {
    hf(this.basename, "dirname"), this.path = Bt.join(e || "", this.basename);
  }
  /**
   * Get the extname (including dot) (example: `'.js'`).
   *
   * @returns {string | undefined}
   *   Extname.
   */
  get extname() {
    return typeof this.path == "string" ? Bt.extname(this.path) : void 0;
  }
  /**
   * Set the extname (including dot) (example: `'.js'`).
   *
   * Cannot contain path separators (`'/'` on unix, macOS, and browsers, `'\'`
   * on windows).
   * Cannot be set if there’s no `path` yet.
   *
   * @param {string | undefined} extname
   *   Extname.
   * @returns {undefined}
   *   Nothing.
   */
  set extname(e) {
    if (fl(e, "extname"), hf(this.dirname, "extname"), e) {
      if (e.codePointAt(0) !== 46)
        throw new Error("`extname` must start with `.`");
      if (e.includes(".", 1))
        throw new Error("`extname` cannot contain multiple dots");
    }
    this.path = Bt.join(this.dirname, this.stem + (e || ""));
  }
  /**
   * Get the full path (example: `'~/index.min.js'`).
   *
   * @returns {string}
   *   Path.
   */
  get path() {
    return this.history[this.history.length - 1];
  }
  /**
   * Set the full path (example: `'~/index.min.js'`).
   *
   * Cannot be nullified.
   * You can set a file URL (a `URL` object with a `file:` protocol) which will
   * be turned into a path with `url.fileURLToPath`.
   *
   * @param {URL | string} path
   *   Path.
   * @returns {undefined}
   *   Nothing.
   */
  set path(e) {
    ha(e) && (e = Kb(e)), hl(e, "path"), this.path !== e && this.history.push(e);
  }
  /**
   * Get the stem (basename w/o extname) (example: `'index.min'`).
   *
   * @returns {string | undefined}
   *   Stem.
   */
  get stem() {
    return typeof this.path == "string" ? Bt.basename(this.path, this.extname) : void 0;
  }
  /**
   * Set the stem (basename w/o extname) (example: `'index.min'`).
   *
   * Cannot contain path separators (`'/'` on unix, macOS, and browsers, `'\'`
   * on windows).
   * Cannot be nullified (use `file.path = file.dirname` instead).
   *
   * @param {string} stem
   *   Stem.
   * @returns {undefined}
   *   Nothing.
   */
  set stem(e) {
    hl(e, "stem"), fl(e, "stem"), this.path = Bt.join(this.dirname || "", e + (this.extname || ""));
  }
  // Normal prototypal methods.
  /**
   * Create a fatal message for `reason` associated with the file.
   *
   * The `fatal` field of the message is set to `true` (error; file not usable)
   * and the `file` field is set to the current file path.
   * The message is added to the `messages` field on `file`.
   *
   * > 🪦 **Note**: also has obsolete signatures.
   *
   * @overload
   * @param {string} reason
   * @param {MessageOptions | null | undefined} [options]
   * @returns {never}
   *
   * @overload
   * @param {string} reason
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {string} reason
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {string} reason
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @param {Error | VFileMessage | string} causeOrReason
   *   Reason for message, should use markdown.
   * @param {Node | NodeLike | MessageOptions | Point | Position | string | null | undefined} [optionsOrParentOrPlace]
   *   Configuration (optional).
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns {never}
   *   Never.
   * @throws {VFileMessage}
   *   Message.
   */
  fail(e, n, r) {
    const i = this.message(e, n, r);
    throw i.fatal = !0, i;
  }
  /**
   * Create an info message for `reason` associated with the file.
   *
   * The `fatal` field of the message is set to `undefined` (info; change
   * likely not needed) and the `file` field is set to the current file path.
   * The message is added to the `messages` field on `file`.
   *
   * > 🪦 **Note**: also has obsolete signatures.
   *
   * @overload
   * @param {string} reason
   * @param {MessageOptions | null | undefined} [options]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @param {Error | VFileMessage | string} causeOrReason
   *   Reason for message, should use markdown.
   * @param {Node | NodeLike | MessageOptions | Point | Position | string | null | undefined} [optionsOrParentOrPlace]
   *   Configuration (optional).
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns {VFileMessage}
   *   Message.
   */
  info(e, n, r) {
    const i = this.message(e, n, r);
    return i.fatal = void 0, i;
  }
  /**
   * Create a message for `reason` associated with the file.
   *
   * The `fatal` field of the message is set to `false` (warning; change may be
   * needed) and the `file` field is set to the current file path.
   * The message is added to the `messages` field on `file`.
   *
   * > 🪦 **Note**: also has obsolete signatures.
   *
   * @overload
   * @param {string} reason
   * @param {MessageOptions | null | undefined} [options]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @param {Error | VFileMessage | string} causeOrReason
   *   Reason for message, should use markdown.
   * @param {Node | NodeLike | MessageOptions | Point | Position | string | null | undefined} [optionsOrParentOrPlace]
   *   Configuration (optional).
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns {VFileMessage}
   *   Message.
   */
  message(e, n, r) {
    const i = new st(
      // @ts-expect-error: the overloads are fine.
      e,
      n,
      r
    );
    return this.path && (i.name = this.path + ":" + i.name, i.file = this.path), i.fatal = !1, this.messages.push(i), i;
  }
  /**
   * Serialize the file.
   *
   * > **Note**: which encodings are supported depends on the engine.
   * > For info on Node.js, see:
   * > <https://nodejs.org/api/util.html#whatwg-supported-encodings>.
   *
   * @param {string | null | undefined} [encoding='utf8']
   *   Character encoding to understand `value` as when it’s a `Uint8Array`
   *   (default: `'utf-8'`).
   * @returns {string}
   *   Serialized file.
   */
  toString(e) {
    return this.value === void 0 ? "" : typeof this.value == "string" ? this.value : new TextDecoder(e || void 0).decode(this.value);
  }
}
function fl(t, e) {
  if (t && t.includes(Bt.sep))
    throw new Error(
      "`" + e + "` cannot be a path: did not expect `" + Bt.sep + "`"
    );
}
function hl(t, e) {
  if (!t)
    throw new Error("`" + e + "` cannot be empty");
}
function hf(t, e) {
  if (!t)
    throw new Error("Setting `" + e + "` requires `path` to be set too");
}
function Gb(t) {
  return !!(t && typeof t == "object" && "byteLength" in t && "byteOffset" in t);
}
const Yb = (
  /**
   * @type {new <Parameters extends Array<unknown>, Result>(property: string | symbol) => (...parameters: Parameters) => Result}
   */
  /** @type {unknown} */
  /**
   * @this {Function}
   * @param {string | symbol} property
   * @returns {(...parameters: Array<unknown>) => unknown}
   */
  function(t) {
    const r = (
      /** @type {Record<string | symbol, Function>} */
      // Prototypes do exist.
      // type-coverage:ignore-next-line
      this.constructor.prototype
    ), i = r[t], o = function() {
      return i.apply(o, arguments);
    };
    return Object.setPrototypeOf(o, r), o;
  }
), Qb = {}.hasOwnProperty;
class Xa extends Yb {
  /**
   * Create a processor.
   */
  constructor() {
    super("copy"), this.Compiler = void 0, this.Parser = void 0, this.attachers = [], this.compiler = void 0, this.freezeIndex = -1, this.frozen = void 0, this.namespace = {}, this.parser = void 0, this.transformers = Pb();
  }
  /**
   * Copy a processor.
   *
   * @deprecated
   *   This is a private internal method and should not be used.
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *   New *unfrozen* processor ({@linkcode Processor}) that is
   *   configured to work the same as its ancestor.
   *   When the descendant processor is configured in the future it does not
   *   affect the ancestral processor.
   */
  copy() {
    const e = (
      /** @type {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>} */
      new Xa()
    );
    let n = -1;
    for (; ++n < this.attachers.length; ) {
      const r = this.attachers[n];
      e.use(...r);
    }
    return e.data(ul(!0, {}, this.namespace)), e;
  }
  /**
   * Configure the processor with info available to all plugins.
   * Information is stored in an object.
   *
   * Typically, options can be given to a specific plugin, but sometimes it
   * makes sense to have information shared with several plugins.
   * For example, a list of HTML elements that are self-closing, which is
   * needed during all phases.
   *
   * > **Note**: setting information cannot occur on *frozen* processors.
   * > Call the processor first to create a new unfrozen processor.
   *
   * > **Note**: to register custom data in TypeScript, augment the
   * > {@linkcode Data} interface.
   *
   * @example
   *   This example show how to get and set info:
   *
   *   ```js
   *   import {unified} from 'unified'
   *
   *   const processor = unified().data('alpha', 'bravo')
   *
   *   processor.data('alpha') // => 'bravo'
   *
   *   processor.data() // => {alpha: 'bravo'}
   *
   *   processor.data({charlie: 'delta'})
   *
   *   processor.data() // => {charlie: 'delta'}
   *   ```
   *
   * @template {keyof Data} Key
   *
   * @overload
   * @returns {Data}
   *
   * @overload
   * @param {Data} dataset
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *
   * @overload
   * @param {Key} key
   * @returns {Data[Key]}
   *
   * @overload
   * @param {Key} key
   * @param {Data[Key]} value
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *
   * @param {Data | Key} [key]
   *   Key to get or set, or entire dataset to set, or nothing to get the
   *   entire dataset (optional).
   * @param {Data[Key]} [value]
   *   Value to set (optional).
   * @returns {unknown}
   *   The current processor when setting, the value at `key` when getting, or
   *   the entire dataset when getting without key.
   */
  data(e, n) {
    return typeof e == "string" ? arguments.length === 2 ? (ml("data", this.frozen), this.namespace[e] = n, this) : Qb.call(this.namespace, e) && this.namespace[e] || void 0 : e ? (ml("data", this.frozen), this.namespace = e, this) : this.namespace;
  }
  /**
   * Freeze a processor.
   *
   * Frozen processors are meant to be extended and not to be configured
   * directly.
   *
   * When a processor is frozen it cannot be unfrozen.
   * New processors working the same way can be created by calling the
   * processor.
   *
   * It’s possible to freeze processors explicitly by calling `.freeze()`.
   * Processors freeze automatically when `.parse()`, `.run()`, `.runSync()`,
   * `.stringify()`, `.process()`, or `.processSync()` are called.
   *
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *   The current processor.
   */
  freeze() {
    if (this.frozen)
      return this;
    const e = (
      /** @type {Processor} */
      /** @type {unknown} */
      this
    );
    for (; ++this.freezeIndex < this.attachers.length; ) {
      const [n, ...r] = this.attachers[this.freezeIndex];
      if (r[0] === !1)
        continue;
      r[0] === !0 && (r[0] = void 0);
      const i = n.call(e, ...r);
      typeof i == "function" && this.transformers.use(i);
    }
    return this.frozen = !0, this.freezeIndex = Number.POSITIVE_INFINITY, this;
  }
  /**
   * Parse text to a syntax tree.
   *
   * > **Note**: `parse` freezes the processor if not already *frozen*.
   *
   * > **Note**: `parse` performs the parse phase, not the run phase or other
   * > phases.
   *
   * @param {Compatible | undefined} [file]
   *   file to parse (optional); typically `string` or `VFile`; any value
   *   accepted as `x` in `new VFile(x)`.
   * @returns {ParseTree extends undefined ? Node : ParseTree}
   *   Syntax tree representing `file`.
   */
  parse(e) {
    this.freeze();
    const n = Uo(e), r = this.parser || this.Parser;
    return dl("parse", r), r(String(n), n);
  }
  /**
   * Process the given file as configured on the processor.
   *
   * > **Note**: `process` freezes the processor if not already *frozen*.
   *
   * > **Note**: `process` performs the parse, run, and stringify phases.
   *
   * @overload
   * @param {Compatible | undefined} file
   * @param {ProcessCallback<VFileWithOutput<CompileResult>>} done
   * @returns {undefined}
   *
   * @overload
   * @param {Compatible | undefined} [file]
   * @returns {Promise<VFileWithOutput<CompileResult>>}
   *
   * @param {Compatible | undefined} [file]
   *   File (optional); typically `string` or `VFile`]; any value accepted as
   *   `x` in `new VFile(x)`.
   * @param {ProcessCallback<VFileWithOutput<CompileResult>> | undefined} [done]
   *   Callback (optional).
   * @returns {Promise<VFile> | undefined}
   *   Nothing if `done` is given.
   *   Otherwise a promise, rejected with a fatal error or resolved with the
   *   processed file.
   *
   *   The parsed, transformed, and compiled value is available at
   *   `file.value` (see note).
   *
   *   > **Note**: unified typically compiles by serializing: most
   *   > compilers return `string` (or `Uint8Array`).
   *   > Some compilers, such as the one configured with
   *   > [`rehype-react`][rehype-react], return other values (in this case, a
   *   > React tree).
   *   > If you’re using a compiler that doesn’t serialize, expect different
   *   > result values.
   *   >
   *   > To register custom results in TypeScript, add them to
   *   > {@linkcode CompileResultMap}.
   *
   *   [rehype-react]: https://github.com/rehypejs/rehype-react
   */
  process(e, n) {
    const r = this;
    return this.freeze(), dl("process", this.parser || this.Parser), pl("process", this.compiler || this.Compiler), n ? i(void 0, n) : new Promise(i);
    function i(o, s) {
      const l = Uo(e), a = (
        /** @type {HeadTree extends undefined ? Node : HeadTree} */
        /** @type {unknown} */
        r.parse(l)
      );
      r.run(a, l, function(c, f, h) {
        if (c || !f || !h)
          return u(c);
        const d = (
          /** @type {CompileTree extends undefined ? Node : CompileTree} */
          /** @type {unknown} */
          f
        ), p = r.stringify(d, h);
        Zb(p) ? h.value = p : h.result = p, u(
          c,
          /** @type {VFileWithOutput<CompileResult>} */
          h
        );
      });
      function u(c, f) {
        c || !f ? s(c) : o ? o(f) : n(void 0, f);
      }
    }
  }
  /**
   * Process the given file as configured on the processor.
   *
   * An error is thrown if asynchronous transforms are configured.
   *
   * > **Note**: `processSync` freezes the processor if not already *frozen*.
   *
   * > **Note**: `processSync` performs the parse, run, and stringify phases.
   *
   * @param {Compatible | undefined} [file]
   *   File (optional); typically `string` or `VFile`; any value accepted as
   *   `x` in `new VFile(x)`.
   * @returns {VFileWithOutput<CompileResult>}
   *   The processed file.
   *
   *   The parsed, transformed, and compiled value is available at
   *   `file.value` (see note).
   *
   *   > **Note**: unified typically compiles by serializing: most
   *   > compilers return `string` (or `Uint8Array`).
   *   > Some compilers, such as the one configured with
   *   > [`rehype-react`][rehype-react], return other values (in this case, a
   *   > React tree).
   *   > If you’re using a compiler that doesn’t serialize, expect different
   *   > result values.
   *   >
   *   > To register custom results in TypeScript, add them to
   *   > {@linkcode CompileResultMap}.
   *
   *   [rehype-react]: https://github.com/rehypejs/rehype-react
   */
  processSync(e) {
    let n = !1, r;
    return this.freeze(), dl("processSync", this.parser || this.Parser), pl("processSync", this.compiler || this.Compiler), this.process(e, i), pf("processSync", "process", n), r;
    function i(o, s) {
      n = !0, of(o), r = s;
    }
  }
  /**
   * Run *transformers* on a syntax tree.
   *
   * > **Note**: `run` freezes the processor if not already *frozen*.
   *
   * > **Note**: `run` performs the run phase, not other phases.
   *
   * @overload
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   * @param {RunCallback<TailTree extends undefined ? Node : TailTree>} done
   * @returns {undefined}
   *
   * @overload
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   * @param {Compatible | undefined} file
   * @param {RunCallback<TailTree extends undefined ? Node : TailTree>} done
   * @returns {undefined}
   *
   * @overload
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   * @param {Compatible | undefined} [file]
   * @returns {Promise<TailTree extends undefined ? Node : TailTree>}
   *
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   *   Tree to transform and inspect.
   * @param {(
   *   RunCallback<TailTree extends undefined ? Node : TailTree> |
   *   Compatible
   * )} [file]
   *   File associated with `node` (optional); any value accepted as `x` in
   *   `new VFile(x)`.
   * @param {RunCallback<TailTree extends undefined ? Node : TailTree>} [done]
   *   Callback (optional).
   * @returns {Promise<TailTree extends undefined ? Node : TailTree> | undefined}
   *   Nothing if `done` is given.
   *   Otherwise, a promise rejected with a fatal error or resolved with the
   *   transformed tree.
   */
  run(e, n, r) {
    df(e), this.freeze();
    const i = this.transformers;
    return !r && typeof n == "function" && (r = n, n = void 0), r ? o(void 0, r) : new Promise(o);
    function o(s, l) {
      const a = Uo(n);
      i.run(e, a, u);
      function u(c, f, h) {
        const d = (
          /** @type {TailTree extends undefined ? Node : TailTree} */
          f || e
        );
        c ? l(c) : s ? s(d) : r(void 0, d, h);
      }
    }
  }
  /**
   * Run *transformers* on a syntax tree.
   *
   * An error is thrown if asynchronous transforms are configured.
   *
   * > **Note**: `runSync` freezes the processor if not already *frozen*.
   *
   * > **Note**: `runSync` performs the run phase, not other phases.
   *
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   *   Tree to transform and inspect.
   * @param {Compatible | undefined} [file]
   *   File associated with `node` (optional); any value accepted as `x` in
   *   `new VFile(x)`.
   * @returns {TailTree extends undefined ? Node : TailTree}
   *   Transformed tree.
   */
  runSync(e, n) {
    let r = !1, i;
    return this.run(e, n, o), pf("runSync", "run", r), i;
    function o(s, l) {
      of(s), i = l, r = !0;
    }
  }
  /**
   * Compile a syntax tree.
   *
   * > **Note**: `stringify` freezes the processor if not already *frozen*.
   *
   * > **Note**: `stringify` performs the stringify phase, not the run phase
   * > or other phases.
   *
   * @param {CompileTree extends undefined ? Node : CompileTree} tree
   *   Tree to compile.
   * @param {Compatible | undefined} [file]
   *   File associated with `node` (optional); any value accepted as `x` in
   *   `new VFile(x)`.
   * @returns {CompileResult extends undefined ? Value : CompileResult}
   *   Textual representation of the tree (see note).
   *
   *   > **Note**: unified typically compiles by serializing: most compilers
   *   > return `string` (or `Uint8Array`).
   *   > Some compilers, such as the one configured with
   *   > [`rehype-react`][rehype-react], return other values (in this case, a
   *   > React tree).
   *   > If you’re using a compiler that doesn’t serialize, expect different
   *   > result values.
   *   >
   *   > To register custom results in TypeScript, add them to
   *   > {@linkcode CompileResultMap}.
   *
   *   [rehype-react]: https://github.com/rehypejs/rehype-react
   */
  stringify(e, n) {
    this.freeze();
    const r = Uo(n), i = this.compiler || this.Compiler;
    return pl("stringify", i), df(e), i(e, r);
  }
  /**
   * Configure the processor to use a plugin, a list of usable values, or a
   * preset.
   *
   * If the processor is already using a plugin, the previous plugin
   * configuration is changed based on the options that are passed in.
   * In other words, the plugin is not added a second time.
   *
   * > **Note**: `use` cannot be called on *frozen* processors.
   * > Call the processor first to create a new unfrozen processor.
   *
   * @example
   *   There are many ways to pass plugins to `.use()`.
   *   This example gives an overview:
   *
   *   ```js
   *   import {unified} from 'unified'
   *
   *   unified()
   *     // Plugin with options:
   *     .use(pluginA, {x: true, y: true})
   *     // Passing the same plugin again merges configuration (to `{x: true, y: false, z: true}`):
   *     .use(pluginA, {y: false, z: true})
   *     // Plugins:
   *     .use([pluginB, pluginC])
   *     // Two plugins, the second with options:
   *     .use([pluginD, [pluginE, {}]])
   *     // Preset with plugins and settings:
   *     .use({plugins: [pluginF, [pluginG, {}]], settings: {position: false}})
   *     // Settings only:
   *     .use({settings: {position: false}})
   *   ```
   *
   * @template {Array<unknown>} [Parameters=[]]
   * @template {Node | string | undefined} [Input=undefined]
   * @template [Output=Input]
   *
   * @overload
   * @param {Preset | null | undefined} [preset]
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *
   * @overload
   * @param {PluggableList} list
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *
   * @overload
   * @param {Plugin<Parameters, Input, Output>} plugin
   * @param {...(Parameters | [boolean])} parameters
   * @returns {UsePlugin<ParseTree, HeadTree, TailTree, CompileTree, CompileResult, Input, Output>}
   *
   * @param {PluggableList | Plugin | Preset | null | undefined} value
   *   Usable value.
   * @param {...unknown} parameters
   *   Parameters, when a plugin is given as a usable value.
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *   Current processor.
   */
  use(e, ...n) {
    const r = this.attachers, i = this.namespace;
    if (ml("use", this.frozen), e != null) if (typeof e == "function")
      a(e, n);
    else if (typeof e == "object")
      Array.isArray(e) ? l(e) : s(e);
    else
      throw new TypeError("Expected usable value, not `" + e + "`");
    return this;
    function o(u) {
      if (typeof u == "function")
        a(u, []);
      else if (typeof u == "object")
        if (Array.isArray(u)) {
          const [c, ...f] = (
            /** @type {PluginTuple<Array<unknown>>} */
            u
          );
          a(c, f);
        } else
          s(u);
      else
        throw new TypeError("Expected usable value, not `" + u + "`");
    }
    function s(u) {
      if (!("plugins" in u) && !("settings" in u))
        throw new Error(
          "Expected usable value but received an empty preset, which is probably a mistake: presets typically come with `plugins` and sometimes with `settings`, but this has neither"
        );
      l(u.plugins), u.settings && (i.settings = ul(!0, i.settings, u.settings));
    }
    function l(u) {
      let c = -1;
      if (u != null) if (Array.isArray(u))
        for (; ++c < u.length; ) {
          const f = u[c];
          o(f);
        }
      else
        throw new TypeError("Expected a list of plugins, not `" + u + "`");
    }
    function a(u, c) {
      let f = -1, h = -1;
      for (; ++f < r.length; )
        if (r[f][0] === u) {
          h = f;
          break;
        }
      if (h === -1)
        r.push([u, ...c]);
      else if (c.length > 0) {
        let [d, ...p] = c;
        const m = r[h][1];
        fa(m) && fa(d) && (d = ul(!0, m, d)), r[h] = [u, d, ...p];
      }
    }
  }
}
const da = new Xa().freeze();
function dl(t, e) {
  if (typeof e != "function")
    throw new TypeError("Cannot `" + t + "` without `parser`");
}
function pl(t, e) {
  if (typeof e != "function")
    throw new TypeError("Cannot `" + t + "` without `compiler`");
}
function ml(t, e) {
  if (e)
    throw new Error(
      "Cannot call `" + t + "` on a frozen processor.\nCreate a new processor first, by calling it: use `processor()` instead of `processor`."
    );
}
function df(t) {
  if (!fa(t) || typeof t.type != "string")
    throw new TypeError("Expected node, got `" + t + "`");
}
function pf(t, e, n) {
  if (!n)
    throw new Error(
      "`" + t + "` finished async. Use `" + e + "` instead"
    );
}
function Uo(t) {
  return Xb(t) ? t : new Jb(t);
}
function Xb(t) {
  return !!(t && typeof t == "object" && "message" in t && "messages" in t);
}
function Zb(t) {
  return typeof t == "string" || e0(t);
}
function e0(t) {
  return !!(t && typeof t == "object" && "byteLength" in t && "byteOffset" in t);
}
function Oe(t) {
  this.content = t;
}
Oe.prototype = {
  constructor: Oe,
  find: function(t) {
    for (var e = 0; e < this.content.length; e += 2)
      if (this.content[e] === t) return e;
    return -1;
  },
  // :: (string) → ?any
  // Retrieve the value stored under `key`, or return undefined when
  // no such key exists.
  get: function(t) {
    var e = this.find(t);
    return e == -1 ? void 0 : this.content[e + 1];
  },
  // :: (string, any, ?string) → OrderedMap
  // Create a new map by replacing the value of `key` with a new
  // value, or adding a binding to the end of the map. If `newKey` is
  // given, the key of the binding will be replaced with that key.
  update: function(t, e, n) {
    var r = n && n != t ? this.remove(n) : this, i = r.find(t), o = r.content.slice();
    return i == -1 ? o.push(n || t, e) : (o[i + 1] = e, n && (o[i] = n)), new Oe(o);
  },
  // :: (string) → OrderedMap
  // Return a map with the given key removed, if it existed.
  remove: function(t) {
    var e = this.find(t);
    if (e == -1) return this;
    var n = this.content.slice();
    return n.splice(e, 2), new Oe(n);
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the start of the map.
  addToStart: function(t, e) {
    return new Oe([t, e].concat(this.remove(t).content));
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the end of the map.
  addToEnd: function(t, e) {
    var n = this.remove(t).content.slice();
    return n.push(t, e), new Oe(n);
  },
  // :: (string, string, any) → OrderedMap
  // Add a key after the given key. If `place` is not found, the new
  // key is added to the end.
  addBefore: function(t, e, n) {
    var r = this.remove(e), i = r.content.slice(), o = r.find(t);
    return i.splice(o == -1 ? i.length : o, 0, e, n), new Oe(i);
  },
  // :: ((key: string, value: any))
  // Call the given function for each key/value pair in the map, in
  // order.
  forEach: function(t) {
    for (var e = 0; e < this.content.length; e += 2)
      t(this.content[e], this.content[e + 1]);
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a new map by prepending the keys in this map that don't
  // appear in `map` before the keys in `map`.
  prepend: function(t) {
    return t = Oe.from(t), t.size ? new Oe(t.content.concat(this.subtract(t).content)) : this;
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a new map by appending the keys in this map that don't
  // appear in `map` after the keys in `map`.
  append: function(t) {
    return t = Oe.from(t), t.size ? new Oe(this.subtract(t).content.concat(t.content)) : this;
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a map containing all the keys in this map that don't
  // appear in `map`.
  subtract: function(t) {
    var e = this;
    t = Oe.from(t);
    for (var n = 0; n < t.content.length; n += 2)
      e = e.remove(t.content[n]);
    return e;
  },
  // :: () → Object
  // Turn ordered map into a plain object.
  toObject: function() {
    var t = {};
    return this.forEach(function(e, n) {
      t[e] = n;
    }), t;
  },
  // :: number
  // The amount of keys in this map.
  get size() {
    return this.content.length >> 1;
  }
};
Oe.from = function(t) {
  if (t instanceof Oe) return t;
  var e = [];
  if (t) for (var n in t) e.push(n, t[n]);
  return new Oe(e);
};
function Ed(t, e, n) {
  for (let r = 0; ; r++) {
    if (r == t.childCount || r == e.childCount)
      return t.childCount == e.childCount ? null : n;
    let i = t.child(r), o = e.child(r);
    if (i == o) {
      n += i.nodeSize;
      continue;
    }
    if (!i.sameMarkup(o))
      return n;
    if (i.isText && i.text != o.text) {
      for (let s = 0; i.text[s] == o.text[s]; s++)
        n++;
      return n;
    }
    if (i.content.size || o.content.size) {
      let s = Ed(i.content, o.content, n + 1);
      if (s != null)
        return s;
    }
    n += i.nodeSize;
  }
}
function Ad(t, e, n, r) {
  for (let i = t.childCount, o = e.childCount; ; ) {
    if (i == 0 || o == 0)
      return i == o ? null : { a: n, b: r };
    let s = t.child(--i), l = e.child(--o), a = s.nodeSize;
    if (s == l) {
      n -= a, r -= a;
      continue;
    }
    if (!s.sameMarkup(l))
      return { a: n, b: r };
    if (s.isText && s.text != l.text) {
      let u = 0, c = Math.min(s.text.length, l.text.length);
      for (; u < c && s.text[s.text.length - u - 1] == l.text[l.text.length - u - 1]; )
        u++, n--, r--;
      return { a: n, b: r };
    }
    if (s.content.size || l.content.size) {
      let u = Ad(s.content, l.content, n - 1, r - 1);
      if (u)
        return u;
    }
    n -= a, r -= a;
  }
}
class A {
  /**
  @internal
  */
  constructor(e, n) {
    if (this.content = e, this.size = n || 0, n == null)
      for (let r = 0; r < e.length; r++)
        this.size += e[r].nodeSize;
  }
  /**
  Invoke a callback for all descendant nodes between the given two
  positions (relative to start of this fragment). Doesn't descend
  into a node when the callback returns `false`.
  */
  nodesBetween(e, n, r, i = 0, o) {
    for (let s = 0, l = 0; l < n; s++) {
      let a = this.content[s], u = l + a.nodeSize;
      if (u > e && r(a, i + l, o || null, s) !== !1 && a.content.size) {
        let c = l + 1;
        a.nodesBetween(Math.max(0, e - c), Math.min(a.content.size, n - c), r, i + c);
      }
      l = u;
    }
  }
  /**
  Call the given callback for every descendant node. `pos` will be
  relative to the start of the fragment. The callback may return
  `false` to prevent traversal of a given node's children.
  */
  descendants(e) {
    this.nodesBetween(0, this.size, e);
  }
  /**
  Extract the text between `from` and `to`. See the same method on
  [`Node`](https://prosemirror.net/docs/ref/#model.Node.textBetween).
  */
  textBetween(e, n, r, i) {
    let o = "", s = !0;
    return this.nodesBetween(e, n, (l, a) => {
      let u = l.isText ? l.text.slice(Math.max(e, a) - a, n - a) : l.isLeaf ? i ? typeof i == "function" ? i(l) : i : l.type.spec.leafText ? l.type.spec.leafText(l) : "" : "";
      l.isBlock && (l.isLeaf && u || l.isTextblock) && r && (s ? s = !1 : o += r), o += u;
    }, 0), o;
  }
  /**
  Create a new fragment containing the combined content of this
  fragment and the other.
  */
  append(e) {
    if (!e.size)
      return this;
    if (!this.size)
      return e;
    let n = this.lastChild, r = e.firstChild, i = this.content.slice(), o = 0;
    for (n.isText && n.sameMarkup(r) && (i[i.length - 1] = n.withText(n.text + r.text), o = 1); o < e.content.length; o++)
      i.push(e.content[o]);
    return new A(i, this.size + e.size);
  }
  /**
  Cut out the sub-fragment between the two given positions.
  */
  cut(e, n = this.size) {
    if (e == 0 && n == this.size)
      return this;
    let r = [], i = 0;
    if (n > e)
      for (let o = 0, s = 0; s < n; o++) {
        let l = this.content[o], a = s + l.nodeSize;
        a > e && ((s < e || a > n) && (l.isText ? l = l.cut(Math.max(0, e - s), Math.min(l.text.length, n - s)) : l = l.cut(Math.max(0, e - s - 1), Math.min(l.content.size, n - s - 1))), r.push(l), i += l.nodeSize), s = a;
      }
    return new A(r, i);
  }
  /**
  @internal
  */
  cutByIndex(e, n) {
    return e == n ? A.empty : e == 0 && n == this.content.length ? this : new A(this.content.slice(e, n));
  }
  /**
  Create a new fragment in which the node at the given index is
  replaced by the given node.
  */
  replaceChild(e, n) {
    let r = this.content[e];
    if (r == n)
      return this;
    let i = this.content.slice(), o = this.size + n.nodeSize - r.nodeSize;
    return i[e] = n, new A(i, o);
  }
  /**
  Create a new fragment by prepending the given node to this
  fragment.
  */
  addToStart(e) {
    return new A([e].concat(this.content), this.size + e.nodeSize);
  }
  /**
  Create a new fragment by appending the given node to this
  fragment.
  */
  addToEnd(e) {
    return new A(this.content.concat(e), this.size + e.nodeSize);
  }
  /**
  Compare this fragment to another one.
  */
  eq(e) {
    if (this.content.length != e.content.length)
      return !1;
    for (let n = 0; n < this.content.length; n++)
      if (!this.content[n].eq(e.content[n]))
        return !1;
    return !0;
  }
  /**
  The first child of the fragment, or `null` if it is empty.
  */
  get firstChild() {
    return this.content.length ? this.content[0] : null;
  }
  /**
  The last child of the fragment, or `null` if it is empty.
  */
  get lastChild() {
    return this.content.length ? this.content[this.content.length - 1] : null;
  }
  /**
  The number of child nodes in this fragment.
  */
  get childCount() {
    return this.content.length;
  }
  /**
  Get the child node at the given index. Raise an error when the
  index is out of range.
  */
  child(e) {
    let n = this.content[e];
    if (!n)
      throw new RangeError("Index " + e + " out of range for " + this);
    return n;
  }
  /**
  Get the child node at the given index, if it exists.
  */
  maybeChild(e) {
    return this.content[e] || null;
  }
  /**
  Call `f` for every child node, passing the node, its offset
  into this parent node, and its index.
  */
  forEach(e) {
    for (let n = 0, r = 0; n < this.content.length; n++) {
      let i = this.content[n];
      e(i, r, n), r += i.nodeSize;
    }
  }
  /**
  Find the first position at which this fragment and another
  fragment differ, or `null` if they are the same.
  */
  findDiffStart(e, n = 0) {
    return Ed(this, e, n);
  }
  /**
  Find the first position, searching from the end, at which this
  fragment and the given fragment differ, or `null` if they are
  the same. Since this position will not be the same in both
  nodes, an object with two separate positions is returned.
  */
  findDiffEnd(e, n = this.size, r = e.size) {
    return Ad(this, e, n, r);
  }
  /**
  Find the index and inner offset corresponding to a given relative
  position in this fragment. The result object will be reused
  (overwritten) the next time the function is called. @internal
  */
  findIndex(e) {
    if (e == 0)
      return Jo(0, e);
    if (e == this.size)
      return Jo(this.content.length, e);
    if (e > this.size || e < 0)
      throw new RangeError(`Position ${e} outside of fragment (${this})`);
    for (let n = 0, r = 0; ; n++) {
      let i = this.child(n), o = r + i.nodeSize;
      if (o >= e)
        return o == e ? Jo(n + 1, o) : Jo(n, r);
      r = o;
    }
  }
  /**
  Return a debugging string that describes this fragment.
  */
  toString() {
    return "<" + this.toStringInner() + ">";
  }
  /**
  @internal
  */
  toStringInner() {
    return this.content.join(", ");
  }
  /**
  Create a JSON-serializeable representation of this fragment.
  */
  toJSON() {
    return this.content.length ? this.content.map((e) => e.toJSON()) : null;
  }
  /**
  Deserialize a fragment from its JSON representation.
  */
  static fromJSON(e, n) {
    if (!n)
      return A.empty;
    if (!Array.isArray(n))
      throw new RangeError("Invalid input for Fragment.fromJSON");
    return new A(n.map(e.nodeFromJSON));
  }
  /**
  Build a fragment from an array of nodes. Ensures that adjacent
  text nodes with the same marks are joined together.
  */
  static fromArray(e) {
    if (!e.length)
      return A.empty;
    let n, r = 0;
    for (let i = 0; i < e.length; i++) {
      let o = e[i];
      r += o.nodeSize, i && o.isText && e[i - 1].sameMarkup(o) ? (n || (n = e.slice(0, i)), n[n.length - 1] = o.withText(n[n.length - 1].text + o.text)) : n && n.push(o);
    }
    return new A(n || e, r);
  }
  /**
  Create a fragment from something that can be interpreted as a
  set of nodes. For `null`, it returns the empty fragment. For a
  fragment, the fragment itself. For a node or array of nodes, a
  fragment containing those nodes.
  */
  static from(e) {
    if (!e)
      return A.empty;
    if (e instanceof A)
      return e;
    if (Array.isArray(e))
      return this.fromArray(e);
    if (e.attrs)
      return new A([e], e.nodeSize);
    throw new RangeError("Can not convert " + e + " to a Fragment" + (e.nodesBetween ? " (looks like multiple versions of prosemirror-model were loaded)" : ""));
  }
}
A.empty = new A([], 0);
const gl = { index: 0, offset: 0 };
function Jo(t, e) {
  return gl.index = t, gl.offset = e, gl;
}
function ws(t, e) {
  if (t === e)
    return !0;
  if (!(t && typeof t == "object") || !(e && typeof e == "object"))
    return !1;
  let n = Array.isArray(t);
  if (Array.isArray(e) != n)
    return !1;
  if (n) {
    if (t.length != e.length)
      return !1;
    for (let r = 0; r < t.length; r++)
      if (!ws(t[r], e[r]))
        return !1;
  } else {
    for (let r in t)
      if (!(r in e) || !ws(t[r], e[r]))
        return !1;
    for (let r in e)
      if (!(r in t))
        return !1;
  }
  return !0;
}
class ue {
  /**
  @internal
  */
  constructor(e, n) {
    this.type = e, this.attrs = n;
  }
  /**
  Given a set of marks, create a new set which contains this one as
  well, in the right position. If this mark is already in the set,
  the set itself is returned. If any marks that are set to be
  [exclusive](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) with this mark are present,
  those are replaced by this one.
  */
  addToSet(e) {
    let n, r = !1;
    for (let i = 0; i < e.length; i++) {
      let o = e[i];
      if (this.eq(o))
        return e;
      if (this.type.excludes(o.type))
        n || (n = e.slice(0, i));
      else {
        if (o.type.excludes(this.type))
          return e;
        !r && o.type.rank > this.type.rank && (n || (n = e.slice(0, i)), n.push(this), r = !0), n && n.push(o);
      }
    }
    return n || (n = e.slice()), r || n.push(this), n;
  }
  /**
  Remove this mark from the given set, returning a new set. If this
  mark is not in the set, the set itself is returned.
  */
  removeFromSet(e) {
    for (let n = 0; n < e.length; n++)
      if (this.eq(e[n]))
        return e.slice(0, n).concat(e.slice(n + 1));
    return e;
  }
  /**
  Test whether this mark is in the given set of marks.
  */
  isInSet(e) {
    for (let n = 0; n < e.length; n++)
      if (this.eq(e[n]))
        return !0;
    return !1;
  }
  /**
  Test whether this mark has the same type and attributes as
  another mark.
  */
  eq(e) {
    return this == e || this.type == e.type && ws(this.attrs, e.attrs);
  }
  /**
  Convert this mark to a JSON-serializeable representation.
  */
  toJSON() {
    let e = { type: this.type.name };
    for (let n in this.attrs) {
      e.attrs = this.attrs;
      break;
    }
    return e;
  }
  /**
  Deserialize a mark from JSON.
  */
  static fromJSON(e, n) {
    if (!n)
      throw new RangeError("Invalid input for Mark.fromJSON");
    let r = e.marks[n.type];
    if (!r)
      throw new RangeError(`There is no mark type ${n.type} in this schema`);
    let i = r.create(n.attrs);
    return r.checkAttrs(i.attrs), i;
  }
  /**
  Test whether two sets of marks are identical.
  */
  static sameSet(e, n) {
    if (e == n)
      return !0;
    if (e.length != n.length)
      return !1;
    for (let r = 0; r < e.length; r++)
      if (!e[r].eq(n[r]))
        return !1;
    return !0;
  }
  /**
  Create a properly sorted mark set from null, a single mark, or an
  unsorted array of marks.
  */
  static setFrom(e) {
    if (!e || Array.isArray(e) && e.length == 0)
      return ue.none;
    if (e instanceof ue)
      return [e];
    let n = e.slice();
    return n.sort((r, i) => r.type.rank - i.type.rank), n;
  }
}
ue.none = [];
class xs extends Error {
}
class F {
  /**
  Create a slice. When specifying a non-zero open depth, you must
  make sure that there are nodes of at least that depth at the
  appropriate side of the fragment—i.e. if the fragment is an
  empty paragraph node, `openStart` and `openEnd` can't be greater
  than 1.
  
  It is not necessary for the content of open nodes to conform to
  the schema's content constraints, though it should be a valid
  start/end/middle for such a node, depending on which sides are
  open.
  */
  constructor(e, n, r) {
    this.content = e, this.openStart = n, this.openEnd = r;
  }
  /**
  The size this slice would add when inserted into a document.
  */
  get size() {
    return this.content.size - this.openStart - this.openEnd;
  }
  /**
  @internal
  */
  insertAt(e, n) {
    let r = Dd(this.content, e + this.openStart, n);
    return r && new F(r, this.openStart, this.openEnd);
  }
  /**
  @internal
  */
  removeBetween(e, n) {
    return new F(Od(this.content, e + this.openStart, n + this.openStart), this.openStart, this.openEnd);
  }
  /**
  Tests whether this slice is equal to another slice.
  */
  eq(e) {
    return this.content.eq(e.content) && this.openStart == e.openStart && this.openEnd == e.openEnd;
  }
  /**
  @internal
  */
  toString() {
    return this.content + "(" + this.openStart + "," + this.openEnd + ")";
  }
  /**
  Convert a slice to a JSON-serializable representation.
  */
  toJSON() {
    if (!this.content.size)
      return null;
    let e = { content: this.content.toJSON() };
    return this.openStart > 0 && (e.openStart = this.openStart), this.openEnd > 0 && (e.openEnd = this.openEnd), e;
  }
  /**
  Deserialize a slice from its JSON representation.
  */
  static fromJSON(e, n) {
    if (!n)
      return F.empty;
    let r = n.openStart || 0, i = n.openEnd || 0;
    if (typeof r != "number" || typeof i != "number")
      throw new RangeError("Invalid input for Slice.fromJSON");
    return new F(A.fromJSON(e, n.content), r, i);
  }
  /**
  Create a slice from a fragment by taking the maximum possible
  open value on both side of the fragment.
  */
  static maxOpen(e, n = !0) {
    let r = 0, i = 0;
    for (let o = e.firstChild; o && !o.isLeaf && (n || !o.type.spec.isolating); o = o.firstChild)
      r++;
    for (let o = e.lastChild; o && !o.isLeaf && (n || !o.type.spec.isolating); o = o.lastChild)
      i++;
    return new F(e, r, i);
  }
}
F.empty = new F(A.empty, 0, 0);
function Od(t, e, n) {
  let { index: r, offset: i } = t.findIndex(e), o = t.maybeChild(r), { index: s, offset: l } = t.findIndex(n);
  if (i == e || o.isText) {
    if (l != n && !t.child(s).isText)
      throw new RangeError("Removing non-flat range");
    return t.cut(0, e).append(t.cut(n));
  }
  if (r != s)
    throw new RangeError("Removing non-flat range");
  return t.replaceChild(r, o.copy(Od(o.content, e - i - 1, n - i - 1)));
}
function Dd(t, e, n, r) {
  let { index: i, offset: o } = t.findIndex(e), s = t.maybeChild(i);
  if (o == e || s.isText)
    return r && !r.canReplace(i, i, n) ? null : t.cut(0, e).append(n).append(t.cut(e));
  let l = Dd(s.content, e - o - 1, n, s);
  return l && t.replaceChild(i, s.copy(l));
}
function t0(t, e, n) {
  if (n.openStart > t.depth)
    throw new xs("Inserted content deeper than insertion position");
  if (t.depth - n.openStart != e.depth - n.openEnd)
    throw new xs("Inconsistent open depths");
  return Rd(t, e, n, 0);
}
function Rd(t, e, n, r) {
  let i = t.index(r), o = t.node(r);
  if (i == e.index(r) && r < t.depth - n.openStart) {
    let s = Rd(t, e, n, r + 1);
    return o.copy(o.content.replaceChild(i, s));
  } else if (n.content.size)
    if (!n.openStart && !n.openEnd && t.depth == r && e.depth == r) {
      let s = t.parent, l = s.content;
      return sr(s, l.cut(0, t.parentOffset).append(n.content).append(l.cut(e.parentOffset)));
    } else {
      let { start: s, end: l } = n0(n, t);
      return sr(o, zd(t, s, l, e, r));
    }
  else return sr(o, Cs(t, e, r));
}
function Ld(t, e) {
  if (!e.type.compatibleContent(t.type))
    throw new xs("Cannot join " + e.type.name + " onto " + t.type.name);
}
function pa(t, e, n) {
  let r = t.node(n);
  return Ld(r, e.node(n)), r;
}
function or(t, e) {
  let n = e.length - 1;
  n >= 0 && t.isText && t.sameMarkup(e[n]) ? e[n] = t.withText(e[n].text + t.text) : e.push(t);
}
function zi(t, e, n, r) {
  let i = (e || t).node(n), o = 0, s = e ? e.index(n) : i.childCount;
  t && (o = t.index(n), t.depth > n ? o++ : t.textOffset && (or(t.nodeAfter, r), o++));
  for (let l = o; l < s; l++)
    or(i.child(l), r);
  e && e.depth == n && e.textOffset && or(e.nodeBefore, r);
}
function sr(t, e) {
  return t.type.checkContent(e), t.copy(e);
}
function zd(t, e, n, r, i) {
  let o = t.depth > i && pa(t, e, i + 1), s = r.depth > i && pa(n, r, i + 1), l = [];
  return zi(null, t, i, l), o && s && e.index(i) == n.index(i) ? (Ld(o, s), or(sr(o, zd(t, e, n, r, i + 1)), l)) : (o && or(sr(o, Cs(t, e, i + 1)), l), zi(e, n, i, l), s && or(sr(s, Cs(n, r, i + 1)), l)), zi(r, null, i, l), new A(l);
}
function Cs(t, e, n) {
  let r = [];
  if (zi(null, t, n, r), t.depth > n) {
    let i = pa(t, e, n + 1);
    or(sr(i, Cs(t, e, n + 1)), r);
  }
  return zi(e, null, n, r), new A(r);
}
function n0(t, e) {
  let n = e.depth - t.openStart, i = e.node(n).copy(t.content);
  for (let o = n - 1; o >= 0; o--)
    i = e.node(o).copy(A.from(i));
  return {
    start: i.resolveNoCache(t.openStart + n),
    end: i.resolveNoCache(i.content.size - t.openEnd - n)
  };
}
class Ji {
  /**
  @internal
  */
  constructor(e, n, r) {
    this.pos = e, this.path = n, this.parentOffset = r, this.depth = n.length / 3 - 1;
  }
  /**
  @internal
  */
  resolveDepth(e) {
    return e == null ? this.depth : e < 0 ? this.depth + e : e;
  }
  /**
  The parent node that the position points into. Note that even if
  a position points into a text node, that node is not considered
  the parent—text nodes are ‘flat’ in this model, and have no content.
  */
  get parent() {
    return this.node(this.depth);
  }
  /**
  The root node in which the position was resolved.
  */
  get doc() {
    return this.node(0);
  }
  /**
  The ancestor node at the given level. `p.node(p.depth)` is the
  same as `p.parent`.
  */
  node(e) {
    return this.path[this.resolveDepth(e) * 3];
  }
  /**
  The index into the ancestor at the given level. If this points
  at the 3rd node in the 2nd paragraph on the top level, for
  example, `p.index(0)` is 1 and `p.index(1)` is 2.
  */
  index(e) {
    return this.path[this.resolveDepth(e) * 3 + 1];
  }
  /**
  The index pointing after this position into the ancestor at the
  given level.
  */
  indexAfter(e) {
    return e = this.resolveDepth(e), this.index(e) + (e == this.depth && !this.textOffset ? 0 : 1);
  }
  /**
  The (absolute) position at the start of the node at the given
  level.
  */
  start(e) {
    return e = this.resolveDepth(e), e == 0 ? 0 : this.path[e * 3 - 1] + 1;
  }
  /**
  The (absolute) position at the end of the node at the given
  level.
  */
  end(e) {
    return e = this.resolveDepth(e), this.start(e) + this.node(e).content.size;
  }
  /**
  The (absolute) position directly before the wrapping node at the
  given level, or, when `depth` is `this.depth + 1`, the original
  position.
  */
  before(e) {
    if (e = this.resolveDepth(e), !e)
      throw new RangeError("There is no position before the top-level node");
    return e == this.depth + 1 ? this.pos : this.path[e * 3 - 1];
  }
  /**
  The (absolute) position directly after the wrapping node at the
  given level, or the original position when `depth` is `this.depth + 1`.
  */
  after(e) {
    if (e = this.resolveDepth(e), !e)
      throw new RangeError("There is no position after the top-level node");
    return e == this.depth + 1 ? this.pos : this.path[e * 3 - 1] + this.path[e * 3].nodeSize;
  }
  /**
  When this position points into a text node, this returns the
  distance between the position and the start of the text node.
  Will be zero for positions that point between nodes.
  */
  get textOffset() {
    return this.pos - this.path[this.path.length - 1];
  }
  /**
  Get the node directly after the position, if any. If the position
  points into a text node, only the part of that node after the
  position is returned.
  */
  get nodeAfter() {
    let e = this.parent, n = this.index(this.depth);
    if (n == e.childCount)
      return null;
    let r = this.pos - this.path[this.path.length - 1], i = e.child(n);
    return r ? e.child(n).cut(r) : i;
  }
  /**
  Get the node directly before the position, if any. If the
  position points into a text node, only the part of that node
  before the position is returned.
  */
  get nodeBefore() {
    let e = this.index(this.depth), n = this.pos - this.path[this.path.length - 1];
    return n ? this.parent.child(e).cut(0, n) : e == 0 ? null : this.parent.child(e - 1);
  }
  /**
  Get the position at the given index in the parent node at the
  given depth (which defaults to `this.depth`).
  */
  posAtIndex(e, n) {
    n = this.resolveDepth(n);
    let r = this.path[n * 3], i = n == 0 ? 0 : this.path[n * 3 - 1] + 1;
    for (let o = 0; o < e; o++)
      i += r.child(o).nodeSize;
    return i;
  }
  /**
  Get the marks at this position, factoring in the surrounding
  marks' [`inclusive`](https://prosemirror.net/docs/ref/#model.MarkSpec.inclusive) property. If the
  position is at the start of a non-empty node, the marks of the
  node after it (if any) are returned.
  */
  marks() {
    let e = this.parent, n = this.index();
    if (e.content.size == 0)
      return ue.none;
    if (this.textOffset)
      return e.child(n).marks;
    let r = e.maybeChild(n - 1), i = e.maybeChild(n);
    if (!r) {
      let l = r;
      r = i, i = l;
    }
    let o = r.marks;
    for (var s = 0; s < o.length; s++)
      o[s].type.spec.inclusive === !1 && (!i || !o[s].isInSet(i.marks)) && (o = o[s--].removeFromSet(o));
    return o;
  }
  /**
  Get the marks after the current position, if any, except those
  that are non-inclusive and not present at position `$end`. This
  is mostly useful for getting the set of marks to preserve after a
  deletion. Will return `null` if this position is at the end of
  its parent node or its parent node isn't a textblock (in which
  case no marks should be preserved).
  */
  marksAcross(e) {
    let n = this.parent.maybeChild(this.index());
    if (!n || !n.isInline)
      return null;
    let r = n.marks, i = e.parent.maybeChild(e.index());
    for (var o = 0; o < r.length; o++)
      r[o].type.spec.inclusive === !1 && (!i || !r[o].isInSet(i.marks)) && (r = r[o--].removeFromSet(r));
    return r;
  }
  /**
  The depth up to which this position and the given (non-resolved)
  position share the same parent nodes.
  */
  sharedDepth(e) {
    for (let n = this.depth; n > 0; n--)
      if (this.start(n) <= e && this.end(n) >= e)
        return n;
    return 0;
  }
  /**
  Returns a range based on the place where this position and the
  given position diverge around block content. If both point into
  the same textblock, for example, a range around that textblock
  will be returned. If they point into different blocks, the range
  around those blocks in their shared ancestor is returned. You can
  pass in an optional predicate that will be called with a parent
  node to see if a range into that parent is acceptable.
  */
  blockRange(e = this, n) {
    if (e.pos < this.pos)
      return e.blockRange(this);
    for (let r = this.depth - (this.parent.inlineContent || this.pos == e.pos ? 1 : 0); r >= 0; r--)
      if (e.pos <= this.end(r) && (!n || n(this.node(r))))
        return new Pd(this, e, r);
    return null;
  }
  /**
  Query whether the given position shares the same parent node.
  */
  sameParent(e) {
    return this.pos - this.parentOffset == e.pos - e.parentOffset;
  }
  /**
  Return the greater of this and the given position.
  */
  max(e) {
    return e.pos > this.pos ? e : this;
  }
  /**
  Return the smaller of this and the given position.
  */
  min(e) {
    return e.pos < this.pos ? e : this;
  }
  /**
  @internal
  */
  toString() {
    let e = "";
    for (let n = 1; n <= this.depth; n++)
      e += (e ? "/" : "") + this.node(n).type.name + "_" + this.index(n - 1);
    return e + ":" + this.parentOffset;
  }
  /**
  @internal
  */
  static resolve(e, n) {
    if (!(n >= 0 && n <= e.content.size))
      throw new RangeError("Position " + n + " out of range");
    let r = [], i = 0, o = n;
    for (let s = e; ; ) {
      let { index: l, offset: a } = s.content.findIndex(o), u = o - a;
      if (r.push(s, l, i + a), !u || (s = s.child(l), s.isText))
        break;
      o = u - 1, i += a + 1;
    }
    return new Ji(n, r, o);
  }
  /**
  @internal
  */
  static resolveCached(e, n) {
    let r = mf.get(e);
    if (r)
      for (let o = 0; o < r.elts.length; o++) {
        let s = r.elts[o];
        if (s.pos == n)
          return s;
      }
    else
      mf.set(e, r = new r0());
    let i = r.elts[r.i] = Ji.resolve(e, n);
    return r.i = (r.i + 1) % i0, i;
  }
}
class r0 {
  constructor() {
    this.elts = [], this.i = 0;
  }
}
const i0 = 12, mf = /* @__PURE__ */ new WeakMap();
class Pd {
  /**
  Construct a node range. `$from` and `$to` should point into the
  same node until at least the given `depth`, since a node range
  denotes an adjacent set of nodes in a single parent node.
  */
  constructor(e, n, r) {
    this.$from = e, this.$to = n, this.depth = r;
  }
  /**
  The position at the start of the range.
  */
  get start() {
    return this.$from.before(this.depth + 1);
  }
  /**
  The position at the end of the range.
  */
  get end() {
    return this.$to.after(this.depth + 1);
  }
  /**
  The parent node that the range points into.
  */
  get parent() {
    return this.$from.node(this.depth);
  }
  /**
  The start index of the range in the parent node.
  */
  get startIndex() {
    return this.$from.index(this.depth);
  }
  /**
  The end index of the range in the parent node.
  */
  get endIndex() {
    return this.$to.indexAfter(this.depth);
  }
}
const o0 = /* @__PURE__ */ Object.create(null);
let fn = class ma {
  /**
  @internal
  */
  constructor(e, n, r, i = ue.none) {
    this.type = e, this.attrs = n, this.marks = i, this.content = r || A.empty;
  }
  /**
  The array of this node's child nodes.
  */
  get children() {
    return this.content.content;
  }
  /**
  The size of this node, as defined by the integer-based [indexing
  scheme](https://prosemirror.net/docs/guide/#doc.indexing). For text nodes, this is the
  amount of characters. For other leaf nodes, it is one. For
  non-leaf nodes, it is the size of the content plus two (the
  start and end token).
  */
  get nodeSize() {
    return this.isLeaf ? 1 : 2 + this.content.size;
  }
  /**
  The number of children that the node has.
  */
  get childCount() {
    return this.content.childCount;
  }
  /**
  Get the child node at the given index. Raises an error when the
  index is out of range.
  */
  child(e) {
    return this.content.child(e);
  }
  /**
  Get the child node at the given index, if it exists.
  */
  maybeChild(e) {
    return this.content.maybeChild(e);
  }
  /**
  Call `f` for every child node, passing the node, its offset
  into this parent node, and its index.
  */
  forEach(e) {
    this.content.forEach(e);
  }
  /**
  Invoke a callback for all descendant nodes recursively between
  the given two positions that are relative to start of this
  node's content. The callback is invoked with the node, its
  position relative to the original node (method receiver),
  its parent node, and its child index. When the callback returns
  false for a given node, that node's children will not be
  recursed over. The last parameter can be used to specify a
  starting position to count from.
  */
  nodesBetween(e, n, r, i = 0) {
    this.content.nodesBetween(e, n, r, i, this);
  }
  /**
  Call the given callback for every descendant node. Doesn't
  descend into a node when the callback returns `false`.
  */
  descendants(e) {
    this.nodesBetween(0, this.content.size, e);
  }
  /**
  Concatenates all the text nodes found in this fragment and its
  children.
  */
  get textContent() {
    return this.isLeaf && this.type.spec.leafText ? this.type.spec.leafText(this) : this.textBetween(0, this.content.size, "");
  }
  /**
  Get all text between positions `from` and `to`. When
  `blockSeparator` is given, it will be inserted to separate text
  from different block nodes. If `leafText` is given, it'll be
  inserted for every non-text leaf node encountered, otherwise
  [`leafText`](https://prosemirror.net/docs/ref/#model.NodeSpec.leafText) will be used.
  */
  textBetween(e, n, r, i) {
    return this.content.textBetween(e, n, r, i);
  }
  /**
  Returns this node's first child, or `null` if there are no
  children.
  */
  get firstChild() {
    return this.content.firstChild;
  }
  /**
  Returns this node's last child, or `null` if there are no
  children.
  */
  get lastChild() {
    return this.content.lastChild;
  }
  /**
  Test whether two nodes represent the same piece of document.
  */
  eq(e) {
    return this == e || this.sameMarkup(e) && this.content.eq(e.content);
  }
  /**
  Compare the markup (type, attributes, and marks) of this node to
  those of another. Returns `true` if both have the same markup.
  */
  sameMarkup(e) {
    return this.hasMarkup(e.type, e.attrs, e.marks);
  }
  /**
  Check whether this node's markup correspond to the given type,
  attributes, and marks.
  */
  hasMarkup(e, n, r) {
    return this.type == e && ws(this.attrs, n || e.defaultAttrs || o0) && ue.sameSet(this.marks, r || ue.none);
  }
  /**
  Create a new node with the same markup as this node, containing
  the given content (or empty, if no content is given).
  */
  copy(e = null) {
    return e == this.content ? this : new ma(this.type, this.attrs, e, this.marks);
  }
  /**
  Create a copy of this node, with the given set of marks instead
  of the node's own marks.
  */
  mark(e) {
    return e == this.marks ? this : new ma(this.type, this.attrs, this.content, e);
  }
  /**
  Create a copy of this node with only the content between the
  given positions. If `to` is not given, it defaults to the end of
  the node.
  */
  cut(e, n = this.content.size) {
    return e == 0 && n == this.content.size ? this : this.copy(this.content.cut(e, n));
  }
  /**
  Cut out the part of the document between the given positions, and
  return it as a `Slice` object.
  */
  slice(e, n = this.content.size, r = !1) {
    if (e == n)
      return F.empty;
    let i = this.resolve(e), o = this.resolve(n), s = r ? 0 : i.sharedDepth(n), l = i.start(s), u = i.node(s).content.cut(i.pos - l, o.pos - l);
    return new F(u, i.depth - s, o.depth - s);
  }
  /**
  Replace the part of the document between the given positions with
  the given slice. The slice must 'fit', meaning its open sides
  must be able to connect to the surrounding content, and its
  content nodes must be valid children for the node they are placed
  into. If any of this is violated, an error of type
  [`ReplaceError`](https://prosemirror.net/docs/ref/#model.ReplaceError) is thrown.
  */
  replace(e, n, r) {
    return t0(this.resolve(e), this.resolve(n), r);
  }
  /**
  Find the node directly after the given position.
  */
  nodeAt(e) {
    for (let n = this; ; ) {
      let { index: r, offset: i } = n.content.findIndex(e);
      if (n = n.maybeChild(r), !n)
        return null;
      if (i == e || n.isText)
        return n;
      e -= i + 1;
    }
  }
  /**
  Find the (direct) child node after the given offset, if any,
  and return it along with its index and offset relative to this
  node.
  */
  childAfter(e) {
    let { index: n, offset: r } = this.content.findIndex(e);
    return { node: this.content.maybeChild(n), index: n, offset: r };
  }
  /**
  Find the (direct) child node before the given offset, if any,
  and return it along with its index and offset relative to this
  node.
  */
  childBefore(e) {
    if (e == 0)
      return { node: null, index: 0, offset: 0 };
    let { index: n, offset: r } = this.content.findIndex(e);
    if (r < e)
      return { node: this.content.child(n), index: n, offset: r };
    let i = this.content.child(n - 1);
    return { node: i, index: n - 1, offset: r - i.nodeSize };
  }
  /**
  Resolve the given position in the document, returning an
  [object](https://prosemirror.net/docs/ref/#model.ResolvedPos) with information about its context.
  */
  resolve(e) {
    return Ji.resolveCached(this, e);
  }
  /**
  @internal
  */
  resolveNoCache(e) {
    return Ji.resolve(this, e);
  }
  /**
  Test whether a given mark or mark type occurs in this document
  between the two given positions.
  */
  rangeHasMark(e, n, r) {
    let i = !1;
    return n > e && this.nodesBetween(e, n, (o) => (r.isInSet(o.marks) && (i = !0), !i)), i;
  }
  /**
  True when this is a block (non-inline node)
  */
  get isBlock() {
    return this.type.isBlock;
  }
  /**
  True when this is a textblock node, a block node with inline
  content.
  */
  get isTextblock() {
    return this.type.isTextblock;
  }
  /**
  True when this node allows inline content.
  */
  get inlineContent() {
    return this.type.inlineContent;
  }
  /**
  True when this is an inline node (a text node or a node that can
  appear among text).
  */
  get isInline() {
    return this.type.isInline;
  }
  /**
  True when this is a text node.
  */
  get isText() {
    return this.type.isText;
  }
  /**
  True when this is a leaf node.
  */
  get isLeaf() {
    return this.type.isLeaf;
  }
  /**
  True when this is an atom, i.e. when it does not have directly
  editable content. This is usually the same as `isLeaf`, but can
  be configured with the [`atom` property](https://prosemirror.net/docs/ref/#model.NodeSpec.atom)
  on a node's spec (typically used when the node is displayed as
  an uneditable [node view](https://prosemirror.net/docs/ref/#view.NodeView)).
  */
  get isAtom() {
    return this.type.isAtom;
  }
  /**
  Return a string representation of this node for debugging
  purposes.
  */
  toString() {
    if (this.type.spec.toDebugString)
      return this.type.spec.toDebugString(this);
    let e = this.type.name;
    return this.content.size && (e += "(" + this.content.toStringInner() + ")"), Bd(this.marks, e);
  }
  /**
  Get the content match in this node at the given index.
  */
  contentMatchAt(e) {
    let n = this.type.contentMatch.matchFragment(this.content, 0, e);
    if (!n)
      throw new Error("Called contentMatchAt on a node with invalid content");
    return n;
  }
  /**
  Test whether replacing the range between `from` and `to` (by
  child index) with the given replacement fragment (which defaults
  to the empty fragment) would leave the node's content valid. You
  can optionally pass `start` and `end` indices into the
  replacement fragment.
  */
  canReplace(e, n, r = A.empty, i = 0, o = r.childCount) {
    let s = this.contentMatchAt(e).matchFragment(r, i, o), l = s && s.matchFragment(this.content, n);
    if (!l || !l.validEnd)
      return !1;
    for (let a = i; a < o; a++)
      if (!this.type.allowsMarks(r.child(a).marks))
        return !1;
    return !0;
  }
  /**
  Test whether replacing the range `from` to `to` (by index) with
  a node of the given type would leave the node's content valid.
  */
  canReplaceWith(e, n, r, i) {
    if (i && !this.type.allowsMarks(i))
      return !1;
    let o = this.contentMatchAt(e).matchType(r), s = o && o.matchFragment(this.content, n);
    return s ? s.validEnd : !1;
  }
  /**
  Test whether the given node's content could be appended to this
  node. If that node is empty, this will only return true if there
  is at least one node type that can appear in both nodes (to avoid
  merging completely incompatible nodes).
  */
  canAppend(e) {
    return e.content.size ? this.canReplace(this.childCount, this.childCount, e.content) : this.type.compatibleContent(e.type);
  }
  /**
  Check whether this node and its descendants conform to the
  schema, and raise an exception when they do not.
  */
  check() {
    this.type.checkContent(this.content), this.type.checkAttrs(this.attrs);
    let e = ue.none;
    for (let n = 0; n < this.marks.length; n++) {
      let r = this.marks[n];
      r.type.checkAttrs(r.attrs), e = r.addToSet(e);
    }
    if (!ue.sameSet(e, this.marks))
      throw new RangeError(`Invalid collection of marks for node ${this.type.name}: ${this.marks.map((n) => n.type.name)}`);
    this.content.forEach((n) => n.check());
  }
  /**
  Return a JSON-serializeable representation of this node.
  */
  toJSON() {
    let e = { type: this.type.name };
    for (let n in this.attrs) {
      e.attrs = this.attrs;
      break;
    }
    return this.content.size && (e.content = this.content.toJSON()), this.marks.length && (e.marks = this.marks.map((n) => n.toJSON())), e;
  }
  /**
  Deserialize a node from its JSON representation.
  */
  static fromJSON(e, n) {
    if (!n)
      throw new RangeError("Invalid input for Node.fromJSON");
    let r;
    if (n.marks) {
      if (!Array.isArray(n.marks))
        throw new RangeError("Invalid mark data for Node.fromJSON");
      r = n.marks.map(e.markFromJSON);
    }
    if (n.type == "text") {
      if (typeof n.text != "string")
        throw new RangeError("Invalid text node in JSON");
      return e.text(n.text, r);
    }
    let i = A.fromJSON(e, n.content), o = e.nodeType(n.type).create(n.attrs, i, r);
    return o.type.checkAttrs(o.attrs), o;
  }
};
fn.prototype.text = void 0;
class Ss extends fn {
  /**
  @internal
  */
  constructor(e, n, r, i) {
    if (super(e, n, null, i), !r)
      throw new RangeError("Empty text nodes are not allowed");
    this.text = r;
  }
  toString() {
    return this.type.spec.toDebugString ? this.type.spec.toDebugString(this) : Bd(this.marks, JSON.stringify(this.text));
  }
  get textContent() {
    return this.text;
  }
  textBetween(e, n) {
    return this.text.slice(e, n);
  }
  get nodeSize() {
    return this.text.length;
  }
  mark(e) {
    return e == this.marks ? this : new Ss(this.type, this.attrs, this.text, e);
  }
  withText(e) {
    return e == this.text ? this : new Ss(this.type, this.attrs, e, this.marks);
  }
  cut(e = 0, n = this.text.length) {
    return e == 0 && n == this.text.length ? this : this.withText(this.text.slice(e, n));
  }
  eq(e) {
    return this.sameMarkup(e) && this.text == e.text;
  }
  toJSON() {
    let e = super.toJSON();
    return e.text = this.text, e;
  }
}
function Bd(t, e) {
  for (let n = t.length - 1; n >= 0; n--)
    e = t[n].type.name + "(" + e + ")";
  return e;
}
class yr {
  /**
  @internal
  */
  constructor(e) {
    this.validEnd = e, this.next = [], this.wrapCache = [];
  }
  /**
  @internal
  */
  static parse(e, n) {
    let r = new s0(e, n);
    if (r.next == null)
      return yr.empty;
    let i = Fd(r);
    r.next && r.err("Unexpected trailing text");
    let o = d0(h0(i));
    return p0(o, r), o;
  }
  /**
  Match a node type, returning a match after that node if
  successful.
  */
  matchType(e) {
    for (let n = 0; n < this.next.length; n++)
      if (this.next[n].type == e)
        return this.next[n].next;
    return null;
  }
  /**
  Try to match a fragment. Returns the resulting match when
  successful.
  */
  matchFragment(e, n = 0, r = e.childCount) {
    let i = this;
    for (let o = n; i && o < r; o++)
      i = i.matchType(e.child(o).type);
    return i;
  }
  /**
  @internal
  */
  get inlineContent() {
    return this.next.length != 0 && this.next[0].type.isInline;
  }
  /**
  Get the first matching node type at this match position that can
  be generated.
  */
  get defaultType() {
    for (let e = 0; e < this.next.length; e++) {
      let { type: n } = this.next[e];
      if (!(n.isText || n.hasRequiredAttrs()))
        return n;
    }
    return null;
  }
  /**
  @internal
  */
  compatible(e) {
    for (let n = 0; n < this.next.length; n++)
      for (let r = 0; r < e.next.length; r++)
        if (this.next[n].type == e.next[r].type)
          return !0;
    return !1;
  }
  /**
  Try to match the given fragment, and if that fails, see if it can
  be made to match by inserting nodes in front of it. When
  successful, return a fragment of inserted nodes (which may be
  empty if nothing had to be inserted). When `toEnd` is true, only
  return a fragment if the resulting match goes to the end of the
  content expression.
  */
  fillBefore(e, n = !1, r = 0) {
    let i = [this];
    function o(s, l) {
      let a = s.matchFragment(e, r);
      if (a && (!n || a.validEnd))
        return A.from(l.map((u) => u.createAndFill()));
      for (let u = 0; u < s.next.length; u++) {
        let { type: c, next: f } = s.next[u];
        if (!(c.isText || c.hasRequiredAttrs()) && i.indexOf(f) == -1) {
          i.push(f);
          let h = o(f, l.concat(c));
          if (h)
            return h;
        }
      }
      return null;
    }
    return o(this, []);
  }
  /**
  Find a set of wrapping node types that would allow a node of the
  given type to appear at this position. The result may be empty
  (when it fits directly) and will be null when no such wrapping
  exists.
  */
  findWrapping(e) {
    for (let r = 0; r < this.wrapCache.length; r += 2)
      if (this.wrapCache[r] == e)
        return this.wrapCache[r + 1];
    let n = this.computeWrapping(e);
    return this.wrapCache.push(e, n), n;
  }
  /**
  @internal
  */
  computeWrapping(e) {
    let n = /* @__PURE__ */ Object.create(null), r = [{ match: this, type: null, via: null }];
    for (; r.length; ) {
      let i = r.shift(), o = i.match;
      if (o.matchType(e)) {
        let s = [];
        for (let l = i; l.type; l = l.via)
          s.push(l.type);
        return s.reverse();
      }
      for (let s = 0; s < o.next.length; s++) {
        let { type: l, next: a } = o.next[s];
        !l.isLeaf && !l.hasRequiredAttrs() && !(l.name in n) && (!i.type || a.validEnd) && (r.push({ match: l.contentMatch, type: l, via: i }), n[l.name] = !0);
      }
    }
    return null;
  }
  /**
  The number of outgoing edges this node has in the finite
  automaton that describes the content expression.
  */
  get edgeCount() {
    return this.next.length;
  }
  /**
  Get the _n_​th outgoing edge from this node in the finite
  automaton that describes the content expression.
  */
  edge(e) {
    if (e >= this.next.length)
      throw new RangeError(`There's no ${e}th edge in this content match`);
    return this.next[e];
  }
  /**
  @internal
  */
  toString() {
    let e = [];
    function n(r) {
      e.push(r);
      for (let i = 0; i < r.next.length; i++)
        e.indexOf(r.next[i].next) == -1 && n(r.next[i].next);
    }
    return n(this), e.map((r, i) => {
      let o = i + (r.validEnd ? "*" : " ") + " ";
      for (let s = 0; s < r.next.length; s++)
        o += (s ? ", " : "") + r.next[s].type.name + "->" + e.indexOf(r.next[s].next);
      return o;
    }).join(`
`);
  }
}
yr.empty = new yr(!0);
class s0 {
  constructor(e, n) {
    this.string = e, this.nodeTypes = n, this.inline = null, this.pos = 0, this.tokens = e.split(/\s*(?=\b|\W|$)/), this.tokens[this.tokens.length - 1] == "" && this.tokens.pop(), this.tokens[0] == "" && this.tokens.shift();
  }
  get next() {
    return this.tokens[this.pos];
  }
  eat(e) {
    return this.next == e && (this.pos++ || !0);
  }
  err(e) {
    throw new SyntaxError(e + " (in content expression '" + this.string + "')");
  }
}
function Fd(t) {
  let e = [];
  do
    e.push(l0(t));
  while (t.eat("|"));
  return e.length == 1 ? e[0] : { type: "choice", exprs: e };
}
function l0(t) {
  let e = [];
  do
    e.push(a0(t));
  while (t.next && t.next != ")" && t.next != "|");
  return e.length == 1 ? e[0] : { type: "seq", exprs: e };
}
function a0(t) {
  let e = f0(t);
  for (; ; )
    if (t.eat("+"))
      e = { type: "plus", expr: e };
    else if (t.eat("*"))
      e = { type: "star", expr: e };
    else if (t.eat("?"))
      e = { type: "opt", expr: e };
    else if (t.eat("{"))
      e = u0(t, e);
    else
      break;
  return e;
}
function gf(t) {
  /\D/.test(t.next) && t.err("Expected number, got '" + t.next + "'");
  let e = Number(t.next);
  return t.pos++, e;
}
function u0(t, e) {
  let n = gf(t), r = n;
  return t.eat(",") && (t.next != "}" ? r = gf(t) : r = -1), t.eat("}") || t.err("Unclosed braced range"), { type: "range", min: n, max: r, expr: e };
}
function c0(t, e) {
  let n = t.nodeTypes, r = n[e];
  if (r)
    return [r];
  let i = [];
  for (let o in n) {
    let s = n[o];
    s.isInGroup(e) && i.push(s);
  }
  return i.length == 0 && t.err("No node type or group '" + e + "' found"), i;
}
function f0(t) {
  if (t.eat("(")) {
    let e = Fd(t);
    return t.eat(")") || t.err("Missing closing paren"), e;
  } else if (/\W/.test(t.next))
    t.err("Unexpected token '" + t.next + "'");
  else {
    let e = c0(t, t.next).map((n) => (t.inline == null ? t.inline = n.isInline : t.inline != n.isInline && t.err("Mixing inline and block content"), { type: "name", value: n }));
    return t.pos++, e.length == 1 ? e[0] : { type: "choice", exprs: e };
  }
}
function h0(t) {
  let e = [[]];
  return i(o(t, 0), n()), e;
  function n() {
    return e.push([]) - 1;
  }
  function r(s, l, a) {
    let u = { term: a, to: l };
    return e[s].push(u), u;
  }
  function i(s, l) {
    s.forEach((a) => a.to = l);
  }
  function o(s, l) {
    if (s.type == "choice")
      return s.exprs.reduce((a, u) => a.concat(o(u, l)), []);
    if (s.type == "seq")
      for (let a = 0; ; a++) {
        let u = o(s.exprs[a], l);
        if (a == s.exprs.length - 1)
          return u;
        i(u, l = n());
      }
    else if (s.type == "star") {
      let a = n();
      return r(l, a), i(o(s.expr, a), a), [r(a)];
    } else if (s.type == "plus") {
      let a = n();
      return i(o(s.expr, l), a), i(o(s.expr, a), a), [r(a)];
    } else {
      if (s.type == "opt")
        return [r(l)].concat(o(s.expr, l));
      if (s.type == "range") {
        let a = l;
        for (let u = 0; u < s.min; u++) {
          let c = n();
          i(o(s.expr, a), c), a = c;
        }
        if (s.max == -1)
          i(o(s.expr, a), a);
        else
          for (let u = s.min; u < s.max; u++) {
            let c = n();
            r(a, c), i(o(s.expr, a), c), a = c;
          }
        return [r(a)];
      } else {
        if (s.type == "name")
          return [r(l, void 0, s.value)];
        throw new Error("Unknown expr type");
      }
    }
  }
}
function $d(t, e) {
  return e - t;
}
function yf(t, e) {
  let n = [];
  return r(e), n.sort($d);
  function r(i) {
    let o = t[i];
    if (o.length == 1 && !o[0].term)
      return r(o[0].to);
    n.push(i);
    for (let s = 0; s < o.length; s++) {
      let { term: l, to: a } = o[s];
      !l && n.indexOf(a) == -1 && r(a);
    }
  }
}
function d0(t) {
  let e = /* @__PURE__ */ Object.create(null);
  return n(yf(t, 0));
  function n(r) {
    let i = [];
    r.forEach((s) => {
      t[s].forEach(({ term: l, to: a }) => {
        if (!l)
          return;
        let u;
        for (let c = 0; c < i.length; c++)
          i[c][0] == l && (u = i[c][1]);
        yf(t, a).forEach((c) => {
          u || i.push([l, u = []]), u.indexOf(c) == -1 && u.push(c);
        });
      });
    });
    let o = e[r.join(",")] = new yr(r.indexOf(t.length - 1) > -1);
    for (let s = 0; s < i.length; s++) {
      let l = i[s][1].sort($d);
      o.next.push({ type: i[s][0], next: e[l.join(",")] || n(l) });
    }
    return o;
  }
}
function p0(t, e) {
  for (let n = 0, r = [t]; n < r.length; n++) {
    let i = r[n], o = !i.validEnd, s = [];
    for (let l = 0; l < i.next.length; l++) {
      let { type: a, next: u } = i.next[l];
      s.push(a.name), o && !(a.isText || a.hasRequiredAttrs()) && (o = !1), r.indexOf(u) == -1 && r.push(u);
    }
    o && e.err("Only non-generatable nodes (" + s.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
  }
}
function _d(t) {
  let e = /* @__PURE__ */ Object.create(null);
  for (let n in t) {
    let r = t[n];
    if (!r.hasDefault)
      return null;
    e[n] = r.default;
  }
  return e;
}
function Vd(t, e) {
  let n = /* @__PURE__ */ Object.create(null);
  for (let r in t) {
    let i = e && e[r];
    if (i === void 0) {
      let o = t[r];
      if (o.hasDefault)
        i = o.default;
      else
        throw new RangeError("No value supplied for attribute " + r);
    }
    n[r] = i;
  }
  return n;
}
function Hd(t, e, n, r) {
  for (let i in e)
    if (!(i in t))
      throw new RangeError(`Unsupported attribute ${i} for ${n} of type ${i}`);
  for (let i in t) {
    let o = t[i];
    o.validate && o.validate(e[i]);
  }
}
function jd(t, e) {
  let n = /* @__PURE__ */ Object.create(null);
  if (e)
    for (let r in e)
      n[r] = new g0(t, r, e[r]);
  return n;
}
let kf = class qd {
  /**
  @internal
  */
  constructor(e, n, r) {
    this.name = e, this.schema = n, this.spec = r, this.markSet = null, this.groups = r.group ? r.group.split(" ") : [], this.attrs = jd(e, r.attrs), this.defaultAttrs = _d(this.attrs), this.contentMatch = null, this.inlineContent = null, this.isBlock = !(r.inline || e == "text"), this.isText = e == "text";
  }
  /**
  True if this is an inline type.
  */
  get isInline() {
    return !this.isBlock;
  }
  /**
  True if this is a textblock type, a block that contains inline
  content.
  */
  get isTextblock() {
    return this.isBlock && this.inlineContent;
  }
  /**
  True for node types that allow no content.
  */
  get isLeaf() {
    return this.contentMatch == yr.empty;
  }
  /**
  True when this node is an atom, i.e. when it does not have
  directly editable content.
  */
  get isAtom() {
    return this.isLeaf || !!this.spec.atom;
  }
  /**
  Return true when this node type is part of the given
  [group](https://prosemirror.net/docs/ref/#model.NodeSpec.group).
  */
  isInGroup(e) {
    return this.groups.indexOf(e) > -1;
  }
  /**
  The node type's [whitespace](https://prosemirror.net/docs/ref/#model.NodeSpec.whitespace) option.
  */
  get whitespace() {
    return this.spec.whitespace || (this.spec.code ? "pre" : "normal");
  }
  /**
  Tells you whether this node type has any required attributes.
  */
  hasRequiredAttrs() {
    for (let e in this.attrs)
      if (this.attrs[e].isRequired)
        return !0;
    return !1;
  }
  /**
  Indicates whether this node allows some of the same content as
  the given node type.
  */
  compatibleContent(e) {
    return this == e || this.contentMatch.compatible(e.contentMatch);
  }
  /**
  @internal
  */
  computeAttrs(e) {
    return !e && this.defaultAttrs ? this.defaultAttrs : Vd(this.attrs, e);
  }
  /**
  Create a `Node` of this type. The given attributes are
  checked and defaulted (you can pass `null` to use the type's
  defaults entirely, if no required attributes exist). `content`
  may be a `Fragment`, a node, an array of nodes, or
  `null`. Similarly `marks` may be `null` to default to the empty
  set of marks.
  */
  create(e = null, n, r) {
    if (this.isText)
      throw new Error("NodeType.create can't construct text nodes");
    return new fn(this, this.computeAttrs(e), A.from(n), ue.setFrom(r));
  }
  /**
  Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but check the given content
  against the node type's content restrictions, and throw an error
  if it doesn't match.
  */
  createChecked(e = null, n, r) {
    return n = A.from(n), this.checkContent(n), new fn(this, this.computeAttrs(e), n, ue.setFrom(r));
  }
  /**
  Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but see if it is
  necessary to add nodes to the start or end of the given fragment
  to make it fit the node. If no fitting wrapping can be found,
  return null. Note that, due to the fact that required nodes can
  always be created, this will always succeed if you pass null or
  `Fragment.empty` as content.
  */
  createAndFill(e = null, n, r) {
    if (e = this.computeAttrs(e), n = A.from(n), n.size) {
      let s = this.contentMatch.fillBefore(n);
      if (!s)
        return null;
      n = s.append(n);
    }
    let i = this.contentMatch.matchFragment(n), o = i && i.fillBefore(A.empty, !0);
    return o ? new fn(this, e, n.append(o), ue.setFrom(r)) : null;
  }
  /**
  Returns true if the given fragment is valid content for this node
  type.
  */
  validContent(e) {
    let n = this.contentMatch.matchFragment(e);
    if (!n || !n.validEnd)
      return !1;
    for (let r = 0; r < e.childCount; r++)
      if (!this.allowsMarks(e.child(r).marks))
        return !1;
    return !0;
  }
  /**
  Throws a RangeError if the given fragment is not valid content for this
  node type.
  @internal
  */
  checkContent(e) {
    if (!this.validContent(e))
      throw new RangeError(`Invalid content for node ${this.name}: ${e.toString().slice(0, 50)}`);
  }
  /**
  @internal
  */
  checkAttrs(e) {
    Hd(this.attrs, e, "node", this.name);
  }
  /**
  Check whether the given mark type is allowed in this node.
  */
  allowsMarkType(e) {
    return this.markSet == null || this.markSet.indexOf(e) > -1;
  }
  /**
  Test whether the given set of marks are allowed in this node.
  */
  allowsMarks(e) {
    if (this.markSet == null)
      return !0;
    for (let n = 0; n < e.length; n++)
      if (!this.allowsMarkType(e[n].type))
        return !1;
    return !0;
  }
  /**
  Removes the marks that are not allowed in this node from the given set.
  */
  allowedMarks(e) {
    if (this.markSet == null)
      return e;
    let n;
    for (let r = 0; r < e.length; r++)
      this.allowsMarkType(e[r].type) ? n && n.push(e[r]) : n || (n = e.slice(0, r));
    return n ? n.length ? n : ue.none : e;
  }
  /**
  @internal
  */
  static compile(e, n) {
    let r = /* @__PURE__ */ Object.create(null);
    e.forEach((o, s) => r[o] = new qd(o, n, s));
    let i = n.spec.topNode || "doc";
    if (!r[i])
      throw new RangeError("Schema is missing its top node type ('" + i + "')");
    if (!r.text)
      throw new RangeError("Every schema needs a 'text' type");
    for (let o in r.text.attrs)
      throw new RangeError("The text node type should not have attributes");
    return r;
  }
};
function m0(t, e, n) {
  let r = n.split("|");
  return (i) => {
    let o = i === null ? "null" : typeof i;
    if (r.indexOf(o) < 0)
      throw new RangeError(`Expected value of type ${r} for attribute ${e} on type ${t}, got ${o}`);
  };
}
class g0 {
  constructor(e, n, r) {
    this.hasDefault = Object.prototype.hasOwnProperty.call(r, "default"), this.default = r.default, this.validate = typeof r.validate == "string" ? m0(e, n, r.validate) : r.validate;
  }
  get isRequired() {
    return !this.hasDefault;
  }
}
class Hs {
  /**
  @internal
  */
  constructor(e, n, r, i) {
    this.name = e, this.rank = n, this.schema = r, this.spec = i, this.attrs = jd(e, i.attrs), this.excluded = null;
    let o = _d(this.attrs);
    this.instance = o ? new ue(this, o) : null;
  }
  /**
  Create a mark of this type. `attrs` may be `null` or an object
  containing only some of the mark's attributes. The others, if
  they have defaults, will be added.
  */
  create(e = null) {
    return !e && this.instance ? this.instance : new ue(this, Vd(this.attrs, e));
  }
  /**
  @internal
  */
  static compile(e, n) {
    let r = /* @__PURE__ */ Object.create(null), i = 0;
    return e.forEach((o, s) => r[o] = new Hs(o, i++, n, s)), r;
  }
  /**
  When there is a mark of this type in the given set, a new set
  without it is returned. Otherwise, the input set is returned.
  */
  removeFromSet(e) {
    for (var n = 0; n < e.length; n++)
      e[n].type == this && (e = e.slice(0, n).concat(e.slice(n + 1)), n--);
    return e;
  }
  /**
  Tests whether there is a mark of this type in the given set.
  */
  isInSet(e) {
    for (let n = 0; n < e.length; n++)
      if (e[n].type == this)
        return e[n];
  }
  /**
  @internal
  */
  checkAttrs(e) {
    Hd(this.attrs, e, "mark", this.name);
  }
  /**
  Queries whether a given mark type is
  [excluded](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) by this one.
  */
  excludes(e) {
    return this.excluded.indexOf(e) > -1;
  }
}
class y0 {
  /**
  Construct a schema from a schema [specification](https://prosemirror.net/docs/ref/#model.SchemaSpec).
  */
  constructor(e) {
    this.linebreakReplacement = null, this.cached = /* @__PURE__ */ Object.create(null);
    let n = this.spec = {};
    for (let i in e)
      n[i] = e[i];
    n.nodes = Oe.from(e.nodes), n.marks = Oe.from(e.marks || {}), this.nodes = kf.compile(this.spec.nodes, this), this.marks = Hs.compile(this.spec.marks, this);
    let r = /* @__PURE__ */ Object.create(null);
    for (let i in this.nodes) {
      if (i in this.marks)
        throw new RangeError(i + " can not be both a node and a mark");
      let o = this.nodes[i], s = o.spec.content || "", l = o.spec.marks;
      if (o.contentMatch = r[s] || (r[s] = yr.parse(s, this.nodes)), o.inlineContent = o.contentMatch.inlineContent, o.spec.linebreakReplacement) {
        if (this.linebreakReplacement)
          throw new RangeError("Multiple linebreak nodes defined");
        if (!o.isInline || !o.isLeaf)
          throw new RangeError("Linebreak replacement nodes must be inline leaf nodes");
        this.linebreakReplacement = o;
      }
      o.markSet = l == "_" ? null : l ? bf(this, l.split(" ")) : l == "" || !o.inlineContent ? [] : null;
    }
    for (let i in this.marks) {
      let o = this.marks[i], s = o.spec.excludes;
      o.excluded = s == null ? [o] : s == "" ? [] : bf(this, s.split(" "));
    }
    this.nodeFromJSON = (i) => fn.fromJSON(this, i), this.markFromJSON = (i) => ue.fromJSON(this, i), this.topNodeType = this.nodes[this.spec.topNode || "doc"], this.cached.wrappings = /* @__PURE__ */ Object.create(null);
  }
  /**
  Create a node in this schema. The `type` may be a string or a
  `NodeType` instance. Attributes will be extended with defaults,
  `content` may be a `Fragment`, `null`, a `Node`, or an array of
  nodes.
  */
  node(e, n = null, r, i) {
    if (typeof e == "string")
      e = this.nodeType(e);
    else if (e instanceof kf) {
      if (e.schema != this)
        throw new RangeError("Node type from different schema used (" + e.name + ")");
    } else throw new RangeError("Invalid node type: " + e);
    return e.createChecked(n, r, i);
  }
  /**
  Create a text node in the schema. Empty text nodes are not
  allowed.
  */
  text(e, n) {
    let r = this.nodes.text;
    return new Ss(r, r.defaultAttrs, e, ue.setFrom(n));
  }
  /**
  Create a mark with the given type and attributes.
  */
  mark(e, n) {
    return typeof e == "string" && (e = this.marks[e]), e.create(n);
  }
  /**
  @internal
  */
  nodeType(e) {
    let n = this.nodes[e];
    if (!n)
      throw new RangeError("Unknown node type: " + e);
    return n;
  }
}
function bf(t, e) {
  let n = [];
  for (let r = 0; r < e.length; r++) {
    let i = e[r], o = t.marks[i], s = o;
    if (o)
      n.push(o);
    else
      for (let l in t.marks) {
        let a = t.marks[l];
        (i == "_" || a.spec.group && a.spec.group.split(" ").indexOf(i) > -1) && n.push(s = a);
      }
    if (!s)
      throw new SyntaxError("Unknown mark type: '" + e[r] + "'");
  }
  return n;
}
function k0(t) {
  return t.tag != null;
}
function b0(t) {
  return t.style != null;
}
class si {
  /**
  Create a parser that targets the given schema, using the given
  parsing rules.
  */
  constructor(e, n) {
    this.schema = e, this.rules = n, this.tags = [], this.styles = [];
    let r = this.matchedStyles = [];
    n.forEach((i) => {
      if (k0(i))
        this.tags.push(i);
      else if (b0(i)) {
        let o = /[^=]*/.exec(i.style)[0];
        r.indexOf(o) < 0 && r.push(o), this.styles.push(i);
      }
    }), this.normalizeLists = !this.tags.some((i) => {
      if (!/^(ul|ol)\b/.test(i.tag) || !i.node)
        return !1;
      let o = e.nodes[i.node];
      return o.contentMatch.matchType(o);
    });
  }
  /**
  Parse a document from the content of a DOM node.
  */
  parse(e, n = {}) {
    let r = new xf(this, n, !1);
    return r.addAll(e, ue.none, n.from, n.to), r.finish();
  }
  /**
  Parses the content of the given DOM node, like
  [`parse`](https://prosemirror.net/docs/ref/#model.DOMParser.parse), and takes the same set of
  options. But unlike that method, which produces a whole node,
  this one returns a slice that is open at the sides, meaning that
  the schema constraints aren't applied to the start of nodes to
  the left of the input and the end of nodes at the end.
  */
  parseSlice(e, n = {}) {
    let r = new xf(this, n, !0);
    return r.addAll(e, ue.none, n.from, n.to), F.maxOpen(r.finish());
  }
  /**
  @internal
  */
  matchTag(e, n, r) {
    for (let i = r ? this.tags.indexOf(r) + 1 : 0; i < this.tags.length; i++) {
      let o = this.tags[i];
      if (C0(e, o.tag) && (o.namespace === void 0 || e.namespaceURI == o.namespace) && (!o.context || n.matchesContext(o.context))) {
        if (o.getAttrs) {
          let s = o.getAttrs(e);
          if (s === !1)
            continue;
          o.attrs = s || void 0;
        }
        return o;
      }
    }
  }
  /**
  @internal
  */
  matchStyle(e, n, r, i) {
    for (let o = i ? this.styles.indexOf(i) + 1 : 0; o < this.styles.length; o++) {
      let s = this.styles[o], l = s.style;
      if (!(l.indexOf(e) != 0 || s.context && !r.matchesContext(s.context) || // Test that the style string either precisely matches the prop,
      // or has an '=' sign after the prop, followed by the given
      // value.
      l.length > e.length && (l.charCodeAt(e.length) != 61 || l.slice(e.length + 1) != n))) {
        if (s.getAttrs) {
          let a = s.getAttrs(n);
          if (a === !1)
            continue;
          s.attrs = a || void 0;
        }
        return s;
      }
    }
  }
  /**
  @internal
  */
  static schemaRules(e) {
    let n = [];
    function r(i) {
      let o = i.priority == null ? 50 : i.priority, s = 0;
      for (; s < n.length; s++) {
        let l = n[s];
        if ((l.priority == null ? 50 : l.priority) < o)
          break;
      }
      n.splice(s, 0, i);
    }
    for (let i in e.marks) {
      let o = e.marks[i].spec.parseDOM;
      o && o.forEach((s) => {
        r(s = Cf(s)), s.mark || s.ignore || s.clearMark || (s.mark = i);
      });
    }
    for (let i in e.nodes) {
      let o = e.nodes[i].spec.parseDOM;
      o && o.forEach((s) => {
        r(s = Cf(s)), s.node || s.ignore || s.mark || (s.node = i);
      });
    }
    return n;
  }
  /**
  Construct a DOM parser using the parsing rules listed in a
  schema's [node specs](https://prosemirror.net/docs/ref/#model.NodeSpec.parseDOM), reordered by
  [priority](https://prosemirror.net/docs/ref/#model.GenericParseRule.priority).
  */
  static fromSchema(e) {
    return e.cached.domParser || (e.cached.domParser = new si(e, si.schemaRules(e)));
  }
}
const Wd = {
  address: !0,
  article: !0,
  aside: !0,
  blockquote: !0,
  canvas: !0,
  dd: !0,
  div: !0,
  dl: !0,
  fieldset: !0,
  figcaption: !0,
  figure: !0,
  footer: !0,
  form: !0,
  h1: !0,
  h2: !0,
  h3: !0,
  h4: !0,
  h5: !0,
  h6: !0,
  header: !0,
  hgroup: !0,
  hr: !0,
  li: !0,
  noscript: !0,
  ol: !0,
  output: !0,
  p: !0,
  pre: !0,
  section: !0,
  table: !0,
  tfoot: !0,
  ul: !0
}, w0 = {
  head: !0,
  noscript: !0,
  object: !0,
  script: !0,
  style: !0,
  title: !0
}, Kd = { ol: !0, ul: !0 }, Gi = 1, ga = 2, Pi = 4;
function wf(t, e, n) {
  return e != null ? (e ? Gi : 0) | (e === "full" ? ga : 0) : t && t.whitespace == "pre" ? Gi | ga : n & ~Pi;
}
class Go {
  constructor(e, n, r, i, o, s) {
    this.type = e, this.attrs = n, this.marks = r, this.solid = i, this.options = s, this.content = [], this.activeMarks = ue.none, this.match = o || (s & Pi ? null : e.contentMatch);
  }
  findWrapping(e) {
    if (!this.match) {
      if (!this.type)
        return [];
      let n = this.type.contentMatch.fillBefore(A.from(e));
      if (n)
        this.match = this.type.contentMatch.matchFragment(n);
      else {
        let r = this.type.contentMatch, i;
        return (i = r.findWrapping(e.type)) ? (this.match = r, i) : null;
      }
    }
    return this.match.findWrapping(e.type);
  }
  finish(e) {
    if (!(this.options & Gi)) {
      let r = this.content[this.content.length - 1], i;
      if (r && r.isText && (i = /[ \t\r\n\u000c]+$/.exec(r.text))) {
        let o = r;
        r.text.length == i[0].length ? this.content.pop() : this.content[this.content.length - 1] = o.withText(o.text.slice(0, o.text.length - i[0].length));
      }
    }
    let n = A.from(this.content);
    return !e && this.match && (n = n.append(this.match.fillBefore(A.empty, !0))), this.type ? this.type.create(this.attrs, n, this.marks) : n;
  }
  inlineContext(e) {
    return this.type ? this.type.inlineContent : this.content.length ? this.content[0].isInline : e.parentNode && !Wd.hasOwnProperty(e.parentNode.nodeName.toLowerCase());
  }
}
class xf {
  constructor(e, n, r) {
    this.parser = e, this.options = n, this.isOpen = r, this.open = 0, this.localPreserveWS = !1;
    let i = n.topNode, o, s = wf(null, n.preserveWhitespace, 0) | (r ? Pi : 0);
    i ? o = new Go(i.type, i.attrs, ue.none, !0, n.topMatch || i.type.contentMatch, s) : r ? o = new Go(null, null, ue.none, !0, null, s) : o = new Go(e.schema.topNodeType, null, ue.none, !0, null, s), this.nodes = [o], this.find = n.findPositions, this.needsBlock = !1;
  }
  get top() {
    return this.nodes[this.open];
  }
  // Add a DOM node to the content. Text is inserted as text node,
  // otherwise, the node is passed to `addElement` or, if it has a
  // `style` attribute, `addElementWithStyles`.
  addDOM(e, n) {
    e.nodeType == 3 ? this.addTextNode(e, n) : e.nodeType == 1 && this.addElement(e, n);
  }
  addTextNode(e, n) {
    let r = e.nodeValue, i = this.top, o = i.options & ga ? "full" : this.localPreserveWS || (i.options & Gi) > 0, { schema: s } = this.parser;
    if (o === "full" || i.inlineContext(e) || /[^ \t\r\n\u000c]/.test(r)) {
      if (o)
        if (o === "full")
          r = r.replace(/\r\n?/g, `
`);
        else if (s.linebreakReplacement && /[\r\n]/.test(r) && this.top.findWrapping(s.linebreakReplacement.create())) {
          let l = r.split(/\r?\n|\r/);
          for (let a = 0; a < l.length; a++)
            a && this.insertNode(s.linebreakReplacement.create(), n, !0), l[a] && this.insertNode(s.text(l[a]), n, !/\S/.test(l[a]));
          r = "";
        } else
          r = r.replace(/\r?\n|\r/g, " ");
      else if (r = r.replace(/[ \t\r\n\u000c]+/g, " "), /^[ \t\r\n\u000c]/.test(r) && this.open == this.nodes.length - 1) {
        let l = i.content[i.content.length - 1], a = e.previousSibling;
        (!l || a && a.nodeName == "BR" || l.isText && /[ \t\r\n\u000c]$/.test(l.text)) && (r = r.slice(1));
      }
      r && this.insertNode(s.text(r), n, !/\S/.test(r)), this.findInText(e);
    } else
      this.findInside(e);
  }
  // Try to find a handler for the given tag and use that to parse. If
  // none is found, the element's content nodes are added directly.
  addElement(e, n, r) {
    let i = this.localPreserveWS, o = this.top;
    (e.tagName == "PRE" || /pre/.test(e.style && e.style.whiteSpace)) && (this.localPreserveWS = !0);
    let s = e.nodeName.toLowerCase(), l;
    Kd.hasOwnProperty(s) && this.parser.normalizeLists && x0(e);
    let a = this.options.ruleFromNode && this.options.ruleFromNode(e) || (l = this.parser.matchTag(e, this, r));
    e: if (a ? a.ignore : w0.hasOwnProperty(s))
      this.findInside(e), this.ignoreFallback(e, n);
    else if (!a || a.skip || a.closeParent) {
      a && a.closeParent ? this.open = Math.max(0, this.open - 1) : a && a.skip.nodeType && (e = a.skip);
      let u, c = this.needsBlock;
      if (Wd.hasOwnProperty(s))
        o.content.length && o.content[0].isInline && this.open && (this.open--, o = this.top), u = !0, o.type || (this.needsBlock = !0);
      else if (!e.firstChild) {
        this.leafFallback(e, n);
        break e;
      }
      let f = a && a.skip ? n : this.readStyles(e, n);
      f && this.addAll(e, f), u && this.sync(o), this.needsBlock = c;
    } else {
      let u = this.readStyles(e, n);
      u && this.addElementByRule(e, a, u, a.consuming === !1 ? l : void 0);
    }
    this.localPreserveWS = i;
  }
  // Called for leaf DOM nodes that would otherwise be ignored
  leafFallback(e, n) {
    e.nodeName == "BR" && this.top.type && this.top.type.inlineContent && this.addTextNode(e.ownerDocument.createTextNode(`
`), n);
  }
  // Called for ignored nodes
  ignoreFallback(e, n) {
    e.nodeName == "BR" && (!this.top.type || !this.top.type.inlineContent) && this.findPlace(this.parser.schema.text("-"), n, !0);
  }
  // Run any style parser associated with the node's styles. Either
  // return an updated array of marks, or null to indicate some of the
  // styles had a rule with `ignore` set.
  readStyles(e, n) {
    let r = e.style;
    if (r && r.length)
      for (let i = 0; i < this.parser.matchedStyles.length; i++) {
        let o = this.parser.matchedStyles[i], s = r.getPropertyValue(o);
        if (s)
          for (let l = void 0; ; ) {
            let a = this.parser.matchStyle(o, s, this, l);
            if (!a)
              break;
            if (a.ignore)
              return null;
            if (a.clearMark ? n = n.filter((u) => !a.clearMark(u)) : n = n.concat(this.parser.schema.marks[a.mark].create(a.attrs)), a.consuming === !1)
              l = a;
            else
              break;
          }
      }
    return n;
  }
  // Look up a handler for the given node. If none are found, return
  // false. Otherwise, apply it, use its return value to drive the way
  // the node's content is wrapped, and return true.
  addElementByRule(e, n, r, i) {
    let o, s;
    if (n.node)
      if (s = this.parser.schema.nodes[n.node], s.isLeaf)
        this.insertNode(s.create(n.attrs), r, e.nodeName == "BR") || this.leafFallback(e, r);
      else {
        let a = this.enter(s, n.attrs || null, r, n.preserveWhitespace);
        a && (o = !0, r = a);
      }
    else {
      let a = this.parser.schema.marks[n.mark];
      r = r.concat(a.create(n.attrs));
    }
    let l = this.top;
    if (s && s.isLeaf)
      this.findInside(e);
    else if (i)
      this.addElement(e, r, i);
    else if (n.getContent)
      this.findInside(e), n.getContent(e, this.parser.schema).forEach((a) => this.insertNode(a, r, !1));
    else {
      let a = e;
      typeof n.contentElement == "string" ? a = e.querySelector(n.contentElement) : typeof n.contentElement == "function" ? a = n.contentElement(e) : n.contentElement && (a = n.contentElement), this.findAround(e, a, !0), this.addAll(a, r), this.findAround(e, a, !1);
    }
    o && this.sync(l) && this.open--;
  }
  // Add all child nodes between `startIndex` and `endIndex` (or the
  // whole node, if not given). If `sync` is passed, use it to
  // synchronize after every block element.
  addAll(e, n, r, i) {
    let o = r || 0;
    for (let s = r ? e.childNodes[r] : e.firstChild, l = i == null ? null : e.childNodes[i]; s != l; s = s.nextSibling, ++o)
      this.findAtPoint(e, o), this.addDOM(s, n);
    this.findAtPoint(e, o);
  }
  // Try to find a way to fit the given node type into the current
  // context. May add intermediate wrappers and/or leave non-solid
  // nodes that we're in.
  findPlace(e, n, r) {
    let i, o;
    for (let s = this.open, l = 0; s >= 0; s--) {
      let a = this.nodes[s], u = a.findWrapping(e);
      if (u && (!i || i.length > u.length + l) && (i = u, o = a, !u.length))
        break;
      if (a.solid) {
        if (r)
          break;
        l += 2;
      }
    }
    if (!i)
      return null;
    this.sync(o);
    for (let s = 0; s < i.length; s++)
      n = this.enterInner(i[s], null, n, !1);
    return n;
  }
  // Try to insert the given node, adjusting the context when needed.
  insertNode(e, n, r) {
    if (e.isInline && this.needsBlock && !this.top.type) {
      let o = this.textblockFromContext();
      o && (n = this.enterInner(o, null, n));
    }
    let i = this.findPlace(e, n, r);
    if (i) {
      this.closeExtra();
      let o = this.top;
      o.match && (o.match = o.match.matchType(e.type));
      let s = ue.none;
      for (let l of i.concat(e.marks))
        (o.type ? o.type.allowsMarkType(l.type) : Sf(l.type, e.type)) && (s = l.addToSet(s));
      return o.content.push(e.mark(s)), !0;
    }
    return !1;
  }
  // Try to start a node of the given type, adjusting the context when
  // necessary.
  enter(e, n, r, i) {
    let o = this.findPlace(e.create(n), r, !1);
    return o && (o = this.enterInner(e, n, r, !0, i)), o;
  }
  // Open a node of the given type
  enterInner(e, n, r, i = !1, o) {
    this.closeExtra();
    let s = this.top;
    s.match = s.match && s.match.matchType(e);
    let l = wf(e, o, s.options);
    s.options & Pi && s.content.length == 0 && (l |= Pi);
    let a = ue.none;
    return r = r.filter((u) => (s.type ? s.type.allowsMarkType(u.type) : Sf(u.type, e)) ? (a = u.addToSet(a), !1) : !0), this.nodes.push(new Go(e, n, a, i, null, l)), this.open++, r;
  }
  // Make sure all nodes above this.open are finished and added to
  // their parents
  closeExtra(e = !1) {
    let n = this.nodes.length - 1;
    if (n > this.open) {
      for (; n > this.open; n--)
        this.nodes[n - 1].content.push(this.nodes[n].finish(e));
      this.nodes.length = this.open + 1;
    }
  }
  finish() {
    return this.open = 0, this.closeExtra(this.isOpen), this.nodes[0].finish(!!(this.isOpen || this.options.topOpen));
  }
  sync(e) {
    for (let n = this.open; n >= 0; n--) {
      if (this.nodes[n] == e)
        return this.open = n, !0;
      this.localPreserveWS && (this.nodes[n].options |= Gi);
    }
    return !1;
  }
  get currentPos() {
    this.closeExtra();
    let e = 0;
    for (let n = this.open; n >= 0; n--) {
      let r = this.nodes[n].content;
      for (let i = r.length - 1; i >= 0; i--)
        e += r[i].nodeSize;
      n && e++;
    }
    return e;
  }
  findAtPoint(e, n) {
    if (this.find)
      for (let r = 0; r < this.find.length; r++)
        this.find[r].node == e && this.find[r].offset == n && (this.find[r].pos = this.currentPos);
  }
  findInside(e) {
    if (this.find)
      for (let n = 0; n < this.find.length; n++)
        this.find[n].pos == null && e.nodeType == 1 && e.contains(this.find[n].node) && (this.find[n].pos = this.currentPos);
  }
  findAround(e, n, r) {
    if (e != n && this.find)
      for (let i = 0; i < this.find.length; i++)
        this.find[i].pos == null && e.nodeType == 1 && e.contains(this.find[i].node) && n.compareDocumentPosition(this.find[i].node) & (r ? 2 : 4) && (this.find[i].pos = this.currentPos);
  }
  findInText(e) {
    if (this.find)
      for (let n = 0; n < this.find.length; n++)
        this.find[n].node == e && (this.find[n].pos = this.currentPos - (e.nodeValue.length - this.find[n].offset));
  }
  // Determines whether the given context string matches this context.
  matchesContext(e) {
    if (e.indexOf("|") > -1)
      return e.split(/\s*\|\s*/).some(this.matchesContext, this);
    let n = e.split("/"), r = this.options.context, i = !this.isOpen && (!r || r.parent.type == this.nodes[0].type), o = -(r ? r.depth + 1 : 0) + (i ? 0 : 1), s = (l, a) => {
      for (; l >= 0; l--) {
        let u = n[l];
        if (u == "") {
          if (l == n.length - 1 || l == 0)
            continue;
          for (; a >= o; a--)
            if (s(l - 1, a))
              return !0;
          return !1;
        } else {
          let c = a > 0 || a == 0 && i ? this.nodes[a].type : r && a >= o ? r.node(a - o).type : null;
          if (!c || c.name != u && !c.isInGroup(u))
            return !1;
          a--;
        }
      }
      return !0;
    };
    return s(n.length - 1, this.open);
  }
  textblockFromContext() {
    let e = this.options.context;
    if (e)
      for (let n = e.depth; n >= 0; n--) {
        let r = e.node(n).contentMatchAt(e.indexAfter(n)).defaultType;
        if (r && r.isTextblock && r.defaultAttrs)
          return r;
      }
    for (let n in this.parser.schema.nodes) {
      let r = this.parser.schema.nodes[n];
      if (r.isTextblock && r.defaultAttrs)
        return r;
    }
  }
}
function x0(t) {
  for (let e = t.firstChild, n = null; e; e = e.nextSibling) {
    let r = e.nodeType == 1 ? e.nodeName.toLowerCase() : null;
    r && Kd.hasOwnProperty(r) && n ? (n.appendChild(e), e = n) : r == "li" ? n = e : r && (n = null);
  }
}
function C0(t, e) {
  return (t.matches || t.msMatchesSelector || t.webkitMatchesSelector || t.mozMatchesSelector).call(t, e);
}
function Cf(t) {
  let e = {};
  for (let n in t)
    e[n] = t[n];
  return e;
}
function Sf(t, e) {
  let n = e.schema.nodes;
  for (let r in n) {
    let i = n[r];
    if (!i.allowsMarkType(t))
      continue;
    let o = [], s = (l) => {
      o.push(l);
      for (let a = 0; a < l.edgeCount; a++) {
        let { type: u, next: c } = l.edge(a);
        if (u == e || o.indexOf(c) < 0 && s(c))
          return !0;
      }
    };
    if (s(i.contentMatch))
      return !0;
  }
}
class pi {
  /**
  Create a serializer. `nodes` should map node names to functions
  that take a node and return a description of the corresponding
  DOM. `marks` does the same for mark names, but also gets an
  argument that tells it whether the mark's content is block or
  inline content (for typical use, it'll always be inline). A mark
  serializer may be `null` to indicate that marks of that type
  should not be serialized.
  */
  constructor(e, n) {
    this.nodes = e, this.marks = n;
  }
  /**
  Serialize the content of this fragment to a DOM fragment. When
  not in the browser, the `document` option, containing a DOM
  document, should be passed so that the serializer can create
  nodes.
  */
  serializeFragment(e, n = {}, r) {
    r || (r = yl(n).createDocumentFragment());
    let i = r, o = [];
    return e.forEach((s) => {
      if (o.length || s.marks.length) {
        let l = 0, a = 0;
        for (; l < o.length && a < s.marks.length; ) {
          let u = s.marks[a];
          if (!this.marks[u.type.name]) {
            a++;
            continue;
          }
          if (!u.eq(o[l][0]) || u.type.spec.spanning === !1)
            break;
          l++, a++;
        }
        for (; l < o.length; )
          i = o.pop()[1];
        for (; a < s.marks.length; ) {
          let u = s.marks[a++], c = this.serializeMark(u, s.isInline, n);
          c && (o.push([u, i]), i.appendChild(c.dom), i = c.contentDOM || c.dom);
        }
      }
      i.appendChild(this.serializeNodeInner(s, n));
    }), r;
  }
  /**
  @internal
  */
  serializeNodeInner(e, n) {
    let { dom: r, contentDOM: i } = is(yl(n), this.nodes[e.type.name](e), null, e.attrs);
    if (i) {
      if (e.isLeaf)
        throw new RangeError("Content hole not allowed in a leaf node spec");
      this.serializeFragment(e.content, n, i);
    }
    return r;
  }
  /**
  Serialize this node to a DOM node. This can be useful when you
  need to serialize a part of a document, as opposed to the whole
  document. To serialize a whole document, use
  [`serializeFragment`](https://prosemirror.net/docs/ref/#model.DOMSerializer.serializeFragment) on
  its [content](https://prosemirror.net/docs/ref/#model.Node.content).
  */
  serializeNode(e, n = {}) {
    let r = this.serializeNodeInner(e, n);
    for (let i = e.marks.length - 1; i >= 0; i--) {
      let o = this.serializeMark(e.marks[i], e.isInline, n);
      o && ((o.contentDOM || o.dom).appendChild(r), r = o.dom);
    }
    return r;
  }
  /**
  @internal
  */
  serializeMark(e, n, r = {}) {
    let i = this.marks[e.type.name];
    return i && is(yl(r), i(e, n), null, e.attrs);
  }
  static renderSpec(e, n, r = null, i) {
    return is(e, n, r, i);
  }
  /**
  Build a serializer using the [`toDOM`](https://prosemirror.net/docs/ref/#model.NodeSpec.toDOM)
  properties in a schema's node and mark specs.
  */
  static fromSchema(e) {
    return e.cached.domSerializer || (e.cached.domSerializer = new pi(this.nodesFromSchema(e), this.marksFromSchema(e)));
  }
  /**
  Gather the serializers in a schema's node specs into an object.
  This can be useful as a base to build a custom serializer from.
  */
  static nodesFromSchema(e) {
    let n = Mf(e.nodes);
    return n.text || (n.text = (r) => r.text), n;
  }
  /**
  Gather the serializers in a schema's mark specs into an object.
  */
  static marksFromSchema(e) {
    return Mf(e.marks);
  }
}
function Mf(t) {
  let e = {};
  for (let n in t) {
    let r = t[n].spec.toDOM;
    r && (e[n] = r);
  }
  return e;
}
function yl(t) {
  return t.document || window.document;
}
const Nf = /* @__PURE__ */ new WeakMap();
function S0(t) {
  let e = Nf.get(t);
  return e === void 0 && Nf.set(t, e = M0(t)), e;
}
function M0(t) {
  let e = null;
  function n(r) {
    if (r && typeof r == "object")
      if (Array.isArray(r))
        if (typeof r[0] == "string")
          e || (e = []), e.push(r);
        else
          for (let i = 0; i < r.length; i++)
            n(r[i]);
      else
        for (let i in r)
          n(r[i]);
  }
  return n(t), e;
}
function is(t, e, n, r) {
  if (typeof e == "string")
    return { dom: t.createTextNode(e) };
  if (e.nodeType != null)
    return { dom: e };
  if (e.dom && e.dom.nodeType != null)
    return e;
  let i = e[0], o;
  if (typeof i != "string")
    throw new RangeError("Invalid array passed to renderSpec");
  if (r && (o = S0(r)) && o.indexOf(e) > -1)
    throw new RangeError("Using an array from an attribute object as a DOM spec. This may be an attempted cross site scripting attack.");
  let s = i.indexOf(" ");
  s > 0 && (n = i.slice(0, s), i = i.slice(s + 1));
  let l, a = n ? t.createElementNS(n, i) : t.createElement(i), u = e[1], c = 1;
  if (u && typeof u == "object" && u.nodeType == null && !Array.isArray(u)) {
    c = 2;
    for (let f in u)
      if (u[f] != null) {
        let h = f.indexOf(" ");
        h > 0 ? a.setAttributeNS(f.slice(0, h), f.slice(h + 1), u[f]) : f == "style" && a.style ? a.style.cssText = u[f] : a.setAttribute(f, u[f]);
      }
  }
  for (let f = c; f < e.length; f++) {
    let h = e[f];
    if (h === 0) {
      if (f < e.length - 1 || f > c)
        throw new RangeError("Content hole must be the only child of its parent node");
      return { dom: a, contentDOM: a };
    } else {
      let { dom: d, contentDOM: p } = is(t, h, n, r);
      if (a.appendChild(d), p) {
        if (l)
          throw new RangeError("Multiple content holes");
        l = p;
      }
    }
  }
  return { dom: a, contentDOM: l };
}
const Ud = 65535, Jd = Math.pow(2, 16);
function N0(t, e) {
  return t + e * Jd;
}
function Tf(t) {
  return t & Ud;
}
function T0(t) {
  return (t - (t & Ud)) / Jd;
}
const Gd = 1, Yd = 2, ss = 4, Qd = 8;
class ya {
  /**
  @internal
  */
  constructor(e, n, r) {
    this.pos = e, this.delInfo = n, this.recover = r;
  }
  /**
  Tells you whether the position was deleted, that is, whether the
  step removed the token on the side queried (via the `assoc`)
  argument from the document.
  */
  get deleted() {
    return (this.delInfo & Qd) > 0;
  }
  /**
  Tells you whether the token before the mapped position was deleted.
  */
  get deletedBefore() {
    return (this.delInfo & (Gd | ss)) > 0;
  }
  /**
  True when the token after the mapped position was deleted.
  */
  get deletedAfter() {
    return (this.delInfo & (Yd | ss)) > 0;
  }
  /**
  Tells whether any of the steps mapped through deletes across the
  position (including both the token before and after the
  position).
  */
  get deletedAcross() {
    return (this.delInfo & ss) > 0;
  }
}
class ft {
  /**
  Create a position map. The modifications to the document are
  represented as an array of numbers, in which each group of three
  represents a modified chunk as `[start, oldSize, newSize]`.
  */
  constructor(e, n = !1) {
    if (this.ranges = e, this.inverted = n, !e.length && ft.empty)
      return ft.empty;
  }
  /**
  @internal
  */
  recover(e) {
    let n = 0, r = Tf(e);
    if (!this.inverted)
      for (let i = 0; i < r; i++)
        n += this.ranges[i * 3 + 2] - this.ranges[i * 3 + 1];
    return this.ranges[r * 3] + n + T0(e);
  }
  mapResult(e, n = 1) {
    return this._map(e, n, !1);
  }
  map(e, n = 1) {
    return this._map(e, n, !0);
  }
  /**
  @internal
  */
  _map(e, n, r) {
    let i = 0, o = this.inverted ? 2 : 1, s = this.inverted ? 1 : 2;
    for (let l = 0; l < this.ranges.length; l += 3) {
      let a = this.ranges[l] - (this.inverted ? i : 0);
      if (a > e)
        break;
      let u = this.ranges[l + o], c = this.ranges[l + s], f = a + u;
      if (e <= f) {
        let h = u ? e == a ? -1 : e == f ? 1 : n : n, d = a + i + (h < 0 ? 0 : c);
        if (r)
          return d;
        let p = e == (n < 0 ? a : f) ? null : N0(l / 3, e - a), m = e == a ? Yd : e == f ? Gd : ss;
        return (n < 0 ? e != a : e != f) && (m |= Qd), new ya(d, m, p);
      }
      i += c - u;
    }
    return r ? e + i : new ya(e + i, 0, null);
  }
  /**
  @internal
  */
  touches(e, n) {
    let r = 0, i = Tf(n), o = this.inverted ? 2 : 1, s = this.inverted ? 1 : 2;
    for (let l = 0; l < this.ranges.length; l += 3) {
      let a = this.ranges[l] - (this.inverted ? r : 0);
      if (a > e)
        break;
      let u = this.ranges[l + o], c = a + u;
      if (e <= c && l == i * 3)
        return !0;
      r += this.ranges[l + s] - u;
    }
    return !1;
  }
  /**
  Calls the given function on each of the changed ranges included in
  this map.
  */
  forEach(e) {
    let n = this.inverted ? 2 : 1, r = this.inverted ? 1 : 2;
    for (let i = 0, o = 0; i < this.ranges.length; i += 3) {
      let s = this.ranges[i], l = s - (this.inverted ? o : 0), a = s + (this.inverted ? 0 : o), u = this.ranges[i + n], c = this.ranges[i + r];
      e(l, l + u, a, a + c), o += c - u;
    }
  }
  /**
  Create an inverted version of this map. The result can be used to
  map positions in the post-step document to the pre-step document.
  */
  invert() {
    return new ft(this.ranges, !this.inverted);
  }
  /**
  @internal
  */
  toString() {
    return (this.inverted ? "-" : "") + JSON.stringify(this.ranges);
  }
  /**
  Create a map that moves all positions by offset `n` (which may be
  negative). This can be useful when applying steps meant for a
  sub-document to a larger document, or vice-versa.
  */
  static offset(e) {
    return e == 0 ? ft.empty : new ft(e < 0 ? [0, -e, 0] : [0, 0, e]);
  }
}
ft.empty = new ft([]);
class Yi {
  /**
  Create a new mapping with the given position maps.
  */
  constructor(e, n, r = 0, i = e ? e.length : 0) {
    this.mirror = n, this.from = r, this.to = i, this._maps = e || [], this.ownData = !(e || n);
  }
  /**
  The step maps in this mapping.
  */
  get maps() {
    return this._maps;
  }
  /**
  Create a mapping that maps only through a part of this one.
  */
  slice(e = 0, n = this.maps.length) {
    return new Yi(this._maps, this.mirror, e, n);
  }
  /**
  Add a step map to the end of this mapping. If `mirrors` is
  given, it should be the index of the step map that is the mirror
  image of this one.
  */
  appendMap(e, n) {
    this.ownData || (this._maps = this._maps.slice(), this.mirror = this.mirror && this.mirror.slice(), this.ownData = !0), this.to = this._maps.push(e), n != null && this.setMirror(this._maps.length - 1, n);
  }
  /**
  Add all the step maps in a given mapping to this one (preserving
  mirroring information).
  */
  appendMapping(e) {
    for (let n = 0, r = this._maps.length; n < e._maps.length; n++) {
      let i = e.getMirror(n);
      this.appendMap(e._maps[n], i != null && i < n ? r + i : void 0);
    }
  }
  /**
  Finds the offset of the step map that mirrors the map at the
  given offset, in this mapping (as per the second argument to
  `appendMap`).
  */
  getMirror(e) {
    if (this.mirror) {
      for (let n = 0; n < this.mirror.length; n++)
        if (this.mirror[n] == e)
          return this.mirror[n + (n % 2 ? -1 : 1)];
    }
  }
  /**
  @internal
  */
  setMirror(e, n) {
    this.mirror || (this.mirror = []), this.mirror.push(e, n);
  }
  /**
  Append the inverse of the given mapping to this one.
  */
  appendMappingInverted(e) {
    for (let n = e.maps.length - 1, r = this._maps.length + e._maps.length; n >= 0; n--) {
      let i = e.getMirror(n);
      this.appendMap(e._maps[n].invert(), i != null && i > n ? r - i - 1 : void 0);
    }
  }
  /**
  Create an inverted version of this mapping.
  */
  invert() {
    let e = new Yi();
    return e.appendMappingInverted(this), e;
  }
  /**
  Map a position through this mapping.
  */
  map(e, n = 1) {
    if (this.mirror)
      return this._map(e, n, !0);
    for (let r = this.from; r < this.to; r++)
      e = this._maps[r].map(e, n);
    return e;
  }
  /**
  Map a position through this mapping, returning a mapping
  result.
  */
  mapResult(e, n = 1) {
    return this._map(e, n, !1);
  }
  /**
  @internal
  */
  _map(e, n, r) {
    let i = 0;
    for (let o = this.from; o < this.to; o++) {
      let s = this._maps[o], l = s.mapResult(e, n);
      if (l.recover != null) {
        let a = this.getMirror(o);
        if (a != null && a > o && a < this.to) {
          o = a, e = this._maps[a].recover(l.recover);
          continue;
        }
      }
      i |= l.delInfo, e = l.pos;
    }
    return r ? e : new ya(e, i, null);
  }
}
const kl = /* @__PURE__ */ Object.create(null);
class _e {
  /**
  Get the step map that represents the changes made by this step,
  and which can be used to transform between positions in the old
  and the new document.
  */
  getMap() {
    return ft.empty;
  }
  /**
  Try to merge this step with another one, to be applied directly
  after it. Returns the merged step when possible, null if the
  steps can't be merged.
  */
  merge(e) {
    return null;
  }
  /**
  Deserialize a step from its JSON representation. Will call
  through to the step class' own implementation of this method.
  */
  static fromJSON(e, n) {
    if (!n || !n.stepType)
      throw new RangeError("Invalid input for Step.fromJSON");
    let r = kl[n.stepType];
    if (!r)
      throw new RangeError(`No step type ${n.stepType} defined`);
    return r.fromJSON(e, n);
  }
  /**
  To be able to serialize steps to JSON, each step needs a string
  ID to attach to its JSON representation. Use this method to
  register an ID for your step classes. Try to pick something
  that's unlikely to clash with steps from other modules.
  */
  static jsonID(e, n) {
    if (e in kl)
      throw new RangeError("Duplicate use of step JSON ID " + e);
    return kl[e] = n, n.prototype.jsonID = e, n;
  }
}
class xe {
  /**
  @internal
  */
  constructor(e, n) {
    this.doc = e, this.failed = n;
  }
  /**
  Create a successful step result.
  */
  static ok(e) {
    return new xe(e, null);
  }
  /**
  Create a failed step result.
  */
  static fail(e) {
    return new xe(null, e);
  }
  /**
  Call [`Node.replace`](https://prosemirror.net/docs/ref/#model.Node.replace) with the given
  arguments. Create a successful result if it succeeds, and a
  failed one if it throws a `ReplaceError`.
  */
  static fromReplace(e, n, r, i) {
    try {
      return xe.ok(e.replace(n, r, i));
    } catch (o) {
      if (o instanceof xs)
        return xe.fail(o.message);
      throw o;
    }
  }
}
function Za(t, e, n) {
  let r = [];
  for (let i = 0; i < t.childCount; i++) {
    let o = t.child(i);
    o.content.size && (o = o.copy(Za(o.content, e, o))), o.isInline && (o = e(o, n, i)), r.push(o);
  }
  return A.fromArray(r);
}
class an extends _e {
  /**
  Create a mark step.
  */
  constructor(e, n, r) {
    super(), this.from = e, this.to = n, this.mark = r;
  }
  apply(e) {
    let n = e.slice(this.from, this.to), r = e.resolve(this.from), i = r.node(r.sharedDepth(this.to)), o = new F(Za(n.content, (s, l) => !s.isAtom || !l.type.allowsMarkType(this.mark.type) ? s : s.mark(this.mark.addToSet(s.marks)), i), n.openStart, n.openEnd);
    return xe.fromReplace(e, this.from, this.to, o);
  }
  invert() {
    return new _t(this.from, this.to, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
    return n.deleted && r.deleted || n.pos >= r.pos ? null : new an(n.pos, r.pos, this.mark);
  }
  merge(e) {
    return e instanceof an && e.mark.eq(this.mark) && this.from <= e.to && this.to >= e.from ? new an(Math.min(this.from, e.from), Math.max(this.to, e.to), this.mark) : null;
  }
  toJSON() {
    return {
      stepType: "addMark",
      mark: this.mark.toJSON(),
      from: this.from,
      to: this.to
    };
  }
  /**
  @internal
  */
  static fromJSON(e, n) {
    if (typeof n.from != "number" || typeof n.to != "number")
      throw new RangeError("Invalid input for AddMarkStep.fromJSON");
    return new an(n.from, n.to, e.markFromJSON(n.mark));
  }
}
_e.jsonID("addMark", an);
class _t extends _e {
  /**
  Create a mark-removing step.
  */
  constructor(e, n, r) {
    super(), this.from = e, this.to = n, this.mark = r;
  }
  apply(e) {
    let n = e.slice(this.from, this.to), r = new F(Za(n.content, (i) => i.mark(this.mark.removeFromSet(i.marks)), e), n.openStart, n.openEnd);
    return xe.fromReplace(e, this.from, this.to, r);
  }
  invert() {
    return new an(this.from, this.to, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
    return n.deleted && r.deleted || n.pos >= r.pos ? null : new _t(n.pos, r.pos, this.mark);
  }
  merge(e) {
    return e instanceof _t && e.mark.eq(this.mark) && this.from <= e.to && this.to >= e.from ? new _t(Math.min(this.from, e.from), Math.max(this.to, e.to), this.mark) : null;
  }
  toJSON() {
    return {
      stepType: "removeMark",
      mark: this.mark.toJSON(),
      from: this.from,
      to: this.to
    };
  }
  /**
  @internal
  */
  static fromJSON(e, n) {
    if (typeof n.from != "number" || typeof n.to != "number")
      throw new RangeError("Invalid input for RemoveMarkStep.fromJSON");
    return new _t(n.from, n.to, e.markFromJSON(n.mark));
  }
}
_e.jsonID("removeMark", _t);
class Ln extends _e {
  /**
  Create a node mark step.
  */
  constructor(e, n) {
    super(), this.pos = e, this.mark = n;
  }
  apply(e) {
    let n = e.nodeAt(this.pos);
    if (!n)
      return xe.fail("No node at mark step's position");
    let r = n.type.create(n.attrs, null, this.mark.addToSet(n.marks));
    return xe.fromReplace(e, this.pos, this.pos + 1, new F(A.from(r), 0, n.isLeaf ? 0 : 1));
  }
  invert(e) {
    let n = e.nodeAt(this.pos);
    if (n) {
      let r = this.mark.addToSet(n.marks);
      if (r.length == n.marks.length) {
        for (let i = 0; i < n.marks.length; i++)
          if (!n.marks[i].isInSet(r))
            return new Ln(this.pos, n.marks[i]);
        return new Ln(this.pos, this.mark);
      }
    }
    return new kr(this.pos, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.pos, 1);
    return n.deletedAfter ? null : new Ln(n.pos, this.mark);
  }
  toJSON() {
    return { stepType: "addNodeMark", pos: this.pos, mark: this.mark.toJSON() };
  }
  /**
  @internal
  */
  static fromJSON(e, n) {
    if (typeof n.pos != "number")
      throw new RangeError("Invalid input for AddNodeMarkStep.fromJSON");
    return new Ln(n.pos, e.markFromJSON(n.mark));
  }
}
_e.jsonID("addNodeMark", Ln);
class kr extends _e {
  /**
  Create a mark-removing step.
  */
  constructor(e, n) {
    super(), this.pos = e, this.mark = n;
  }
  apply(e) {
    let n = e.nodeAt(this.pos);
    if (!n)
      return xe.fail("No node at mark step's position");
    let r = n.type.create(n.attrs, null, this.mark.removeFromSet(n.marks));
    return xe.fromReplace(e, this.pos, this.pos + 1, new F(A.from(r), 0, n.isLeaf ? 0 : 1));
  }
  invert(e) {
    let n = e.nodeAt(this.pos);
    return !n || !this.mark.isInSet(n.marks) ? this : new Ln(this.pos, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.pos, 1);
    return n.deletedAfter ? null : new kr(n.pos, this.mark);
  }
  toJSON() {
    return { stepType: "removeNodeMark", pos: this.pos, mark: this.mark.toJSON() };
  }
  /**
  @internal
  */
  static fromJSON(e, n) {
    if (typeof n.pos != "number")
      throw new RangeError("Invalid input for RemoveNodeMarkStep.fromJSON");
    return new kr(n.pos, e.markFromJSON(n.mark));
  }
}
_e.jsonID("removeNodeMark", kr);
class we extends _e {
  /**
  The given `slice` should fit the 'gap' between `from` and
  `to`—the depths must line up, and the surrounding nodes must be
  able to be joined with the open sides of the slice. When
  `structure` is true, the step will fail if the content between
  from and to is not just a sequence of closing and then opening
  tokens (this is to guard against rebased replace steps
  overwriting something they weren't supposed to).
  */
  constructor(e, n, r, i = !1) {
    super(), this.from = e, this.to = n, this.slice = r, this.structure = i;
  }
  apply(e) {
    return this.structure && ka(e, this.from, this.to) ? xe.fail("Structure replace would overwrite content") : xe.fromReplace(e, this.from, this.to, this.slice);
  }
  getMap() {
    return new ft([this.from, this.to - this.from, this.slice.size]);
  }
  invert(e) {
    return new we(this.from, this.from + this.slice.size, e.slice(this.from, this.to));
  }
  map(e) {
    let n = e.mapResult(this.to, -1), r = this.from == this.to && we.MAP_BIAS < 0 ? n : e.mapResult(this.from, 1);
    return r.deletedAcross && n.deletedAcross ? null : new we(r.pos, Math.max(r.pos, n.pos), this.slice, this.structure);
  }
  merge(e) {
    if (!(e instanceof we) || e.structure || this.structure)
      return null;
    if (this.from + this.slice.size == e.from && !this.slice.openEnd && !e.slice.openStart) {
      let n = this.slice.size + e.slice.size == 0 ? F.empty : new F(this.slice.content.append(e.slice.content), this.slice.openStart, e.slice.openEnd);
      return new we(this.from, this.to + (e.to - e.from), n, this.structure);
    } else if (e.to == this.from && !this.slice.openStart && !e.slice.openEnd) {
      let n = this.slice.size + e.slice.size == 0 ? F.empty : new F(e.slice.content.append(this.slice.content), e.slice.openStart, this.slice.openEnd);
      return new we(e.from, this.to, n, this.structure);
    } else
      return null;
  }
  toJSON() {
    let e = { stepType: "replace", from: this.from, to: this.to };
    return this.slice.size && (e.slice = this.slice.toJSON()), this.structure && (e.structure = !0), e;
  }
  /**
  @internal
  */
  static fromJSON(e, n) {
    if (typeof n.from != "number" || typeof n.to != "number")
      throw new RangeError("Invalid input for ReplaceStep.fromJSON");
    return new we(n.from, n.to, F.fromJSON(e, n.slice), !!n.structure);
  }
}
we.MAP_BIAS = 1;
_e.jsonID("replace", we);
class Fe extends _e {
  /**
  Create a replace-around step with the given range and gap.
  `insert` should be the point in the slice into which the content
  of the gap should be moved. `structure` has the same meaning as
  it has in the [`ReplaceStep`](https://prosemirror.net/docs/ref/#transform.ReplaceStep) class.
  */
  constructor(e, n, r, i, o, s, l = !1) {
    super(), this.from = e, this.to = n, this.gapFrom = r, this.gapTo = i, this.slice = o, this.insert = s, this.structure = l;
  }
  apply(e) {
    if (this.structure && (ka(e, this.from, this.gapFrom) || ka(e, this.gapTo, this.to)))
      return xe.fail("Structure gap-replace would overwrite content");
    let n = e.slice(this.gapFrom, this.gapTo);
    if (n.openStart || n.openEnd)
      return xe.fail("Gap is not a flat range");
    let r = this.slice.insertAt(this.insert, n.content);
    return r ? xe.fromReplace(e, this.from, this.to, r) : xe.fail("Content does not fit in gap");
  }
  getMap() {
    return new ft([
      this.from,
      this.gapFrom - this.from,
      this.insert,
      this.gapTo,
      this.to - this.gapTo,
      this.slice.size - this.insert
    ]);
  }
  invert(e) {
    let n = this.gapTo - this.gapFrom;
    return new Fe(this.from, this.from + this.slice.size + n, this.from + this.insert, this.from + this.insert + n, e.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
  }
  map(e) {
    let n = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1), i = this.from == this.gapFrom ? n.pos : e.map(this.gapFrom, -1), o = this.to == this.gapTo ? r.pos : e.map(this.gapTo, 1);
    return n.deletedAcross && r.deletedAcross || i < n.pos || o > r.pos ? null : new Fe(n.pos, r.pos, i, o, this.slice, this.insert, this.structure);
  }
  toJSON() {
    let e = {
      stepType: "replaceAround",
      from: this.from,
      to: this.to,
      gapFrom: this.gapFrom,
      gapTo: this.gapTo,
      insert: this.insert
    };
    return this.slice.size && (e.slice = this.slice.toJSON()), this.structure && (e.structure = !0), e;
  }
  /**
  @internal
  */
  static fromJSON(e, n) {
    if (typeof n.from != "number" || typeof n.to != "number" || typeof n.gapFrom != "number" || typeof n.gapTo != "number" || typeof n.insert != "number")
      throw new RangeError("Invalid input for ReplaceAroundStep.fromJSON");
    return new Fe(n.from, n.to, n.gapFrom, n.gapTo, F.fromJSON(e, n.slice), n.insert, !!n.structure);
  }
}
_e.jsonID("replaceAround", Fe);
function ka(t, e, n) {
  let r = t.resolve(e), i = n - e, o = r.depth;
  for (; i > 0 && o > 0 && r.indexAfter(o) == r.node(o).childCount; )
    o--, i--;
  if (i > 0) {
    let s = r.node(o).maybeChild(r.indexAfter(o));
    for (; i > 0; ) {
      if (!s || s.isLeaf)
        return !0;
      s = s.firstChild, i--;
    }
  }
  return !1;
}
function v0(t, e, n, r) {
  let i = [], o = [], s, l;
  t.doc.nodesBetween(e, n, (a, u, c) => {
    if (!a.isInline)
      return;
    let f = a.marks;
    if (!r.isInSet(f) && c.type.allowsMarkType(r.type)) {
      let h = Math.max(u, e), d = Math.min(u + a.nodeSize, n), p = r.addToSet(f);
      for (let m = 0; m < f.length; m++)
        f[m].isInSet(p) || (s && s.to == h && s.mark.eq(f[m]) ? s.to = d : i.push(s = new _t(h, d, f[m])));
      l && l.to == h ? l.to = d : o.push(l = new an(h, d, r));
    }
  }), i.forEach((a) => t.step(a)), o.forEach((a) => t.step(a));
}
function I0(t, e, n, r) {
  let i = [], o = 0;
  t.doc.nodesBetween(e, n, (s, l) => {
    if (!s.isInline)
      return;
    o++;
    let a = null;
    if (r instanceof Hs) {
      let u = s.marks, c;
      for (; c = r.isInSet(u); )
        (a || (a = [])).push(c), u = c.removeFromSet(u);
    } else r ? r.isInSet(s.marks) && (a = [r]) : a = s.marks;
    if (a && a.length) {
      let u = Math.min(l + s.nodeSize, n);
      for (let c = 0; c < a.length; c++) {
        let f = a[c], h;
        for (let d = 0; d < i.length; d++) {
          let p = i[d];
          p.step == o - 1 && f.eq(i[d].style) && (h = p);
        }
        h ? (h.to = u, h.step = o) : i.push({ style: f, from: Math.max(l, e), to: u, step: o });
      }
    }
  }), i.forEach((s) => t.step(new _t(s.from, s.to, s.style)));
}
function eu(t, e, n, r = n.contentMatch, i = !0) {
  let o = t.doc.nodeAt(e), s = [], l = e + 1;
  for (let a = 0; a < o.childCount; a++) {
    let u = o.child(a), c = l + u.nodeSize, f = r.matchType(u.type);
    if (!f)
      s.push(new we(l, c, F.empty));
    else {
      r = f;
      for (let h = 0; h < u.marks.length; h++)
        n.allowsMarkType(u.marks[h].type) || t.step(new _t(l, c, u.marks[h]));
      if (i && u.isText && n.whitespace != "pre") {
        let h, d = /\r?\n|\r/g, p;
        for (; h = d.exec(u.text); )
          p || (p = new F(A.from(n.schema.text(" ", n.allowedMarks(u.marks))), 0, 0)), s.push(new we(l + h.index, l + h.index + h[0].length, p));
      }
    }
    l = c;
  }
  if (!r.validEnd) {
    let a = r.fillBefore(A.empty, !0);
    t.replace(l, l, new F(a, 0, 0));
  }
  for (let a = s.length - 1; a >= 0; a--)
    t.step(s[a]);
}
function E0(t, e, n) {
  return (e == 0 || t.canReplace(e, t.childCount)) && (n == t.childCount || t.canReplace(0, n));
}
function js(t) {
  let n = t.parent.content.cutByIndex(t.startIndex, t.endIndex);
  for (let r = t.depth, i = 0, o = 0; ; --r) {
    let s = t.$from.node(r), l = t.$from.index(r) + i, a = t.$to.indexAfter(r) - o;
    if (r < t.depth && s.canReplace(l, a, n))
      return r;
    if (r == 0 || s.type.spec.isolating || !E0(s, l, a))
      break;
    l && (i = 1), a < s.childCount && (o = 1);
  }
  return null;
}
function A0(t, e, n) {
  let { $from: r, $to: i, depth: o } = e, s = r.before(o + 1), l = i.after(o + 1), a = s, u = l, c = A.empty, f = 0;
  for (let p = o, m = !1; p > n; p--)
    m || r.index(p) > 0 ? (m = !0, c = A.from(r.node(p).copy(c)), f++) : a--;
  let h = A.empty, d = 0;
  for (let p = o, m = !1; p > n; p--)
    m || i.after(p + 1) < i.end(p) ? (m = !0, h = A.from(i.node(p).copy(h)), d++) : u++;
  t.step(new Fe(a, u, s, l, new F(c.append(h), f, d), c.size - f, !0));
}
function tu(t, e, n = null, r = t) {
  let i = O0(t, e), o = i && D0(r, e);
  return o ? i.map(vf).concat({ type: e, attrs: n }).concat(o.map(vf)) : null;
}
function vf(t) {
  return { type: t, attrs: null };
}
function O0(t, e) {
  let { parent: n, startIndex: r, endIndex: i } = t, o = n.contentMatchAt(r).findWrapping(e);
  if (!o)
    return null;
  let s = o.length ? o[0] : e;
  return n.canReplaceWith(r, i, s) ? o : null;
}
function D0(t, e) {
  let { parent: n, startIndex: r, endIndex: i } = t, o = n.child(r), s = e.contentMatch.findWrapping(o.type);
  if (!s)
    return null;
  let a = (s.length ? s[s.length - 1] : e).contentMatch;
  for (let u = r; a && u < i; u++)
    a = a.matchType(n.child(u).type);
  return !a || !a.validEnd ? null : s;
}
function R0(t, e, n) {
  let r = A.empty;
  for (let s = n.length - 1; s >= 0; s--) {
    if (r.size) {
      let l = n[s].type.contentMatch.matchFragment(r);
      if (!l || !l.validEnd)
        throw new RangeError("Wrapper type given to Transform.wrap does not form valid content of its parent wrapper");
    }
    r = A.from(n[s].type.create(n[s].attrs, r));
  }
  let i = e.start, o = e.end;
  t.step(new Fe(i, o, i, o, new F(r, 0, 0), n.length, !0));
}
function L0(t, e, n, r, i) {
  if (!r.isTextblock)
    throw new RangeError("Type given to setBlockType should be a textblock");
  let o = t.steps.length;
  t.doc.nodesBetween(e, n, (s, l) => {
    let a = typeof i == "function" ? i(s) : i;
    if (s.isTextblock && !s.hasMarkup(r, a) && z0(t.doc, t.mapping.slice(o).map(l), r)) {
      let u = null;
      if (r.schema.linebreakReplacement) {
        let d = r.whitespace == "pre", p = !!r.contentMatch.matchType(r.schema.linebreakReplacement);
        d && !p ? u = !1 : !d && p && (u = !0);
      }
      u === !1 && Zd(t, s, l, o), eu(t, t.mapping.slice(o).map(l, 1), r, void 0, u === null);
      let c = t.mapping.slice(o), f = c.map(l, 1), h = c.map(l + s.nodeSize, 1);
      return t.step(new Fe(f, h, f + 1, h - 1, new F(A.from(r.create(a, null, s.marks)), 0, 0), 1, !0)), u === !0 && Xd(t, s, l, o), !1;
    }
  });
}
function Xd(t, e, n, r) {
  e.forEach((i, o) => {
    if (i.isText) {
      let s, l = /\r?\n|\r/g;
      for (; s = l.exec(i.text); ) {
        let a = t.mapping.slice(r).map(n + 1 + o + s.index);
        t.replaceWith(a, a + 1, e.type.schema.linebreakReplacement.create());
      }
    }
  });
}
function Zd(t, e, n, r) {
  e.forEach((i, o) => {
    if (i.type == i.type.schema.linebreakReplacement) {
      let s = t.mapping.slice(r).map(n + 1 + o);
      t.replaceWith(s, s + 1, e.type.schema.text(`
`));
    }
  });
}
function z0(t, e, n) {
  let r = t.resolve(e), i = r.index();
  return r.parent.canReplaceWith(i, i + 1, n);
}
function P0(t, e, n, r, i) {
  let o = t.doc.nodeAt(e);
  if (!o)
    throw new RangeError("No node at given position");
  n || (n = o.type);
  let s = n.create(r, null, i || o.marks);
  if (o.isLeaf)
    return t.replaceWith(e, e + o.nodeSize, s);
  if (!n.validContent(o.content))
    throw new RangeError("Invalid content for node type " + n.name);
  t.step(new Fe(e, e + o.nodeSize, e + 1, e + o.nodeSize - 1, new F(A.from(s), 0, 0), 1, !0));
}
function Bi(t, e, n = 1, r) {
  let i = t.resolve(e), o = i.depth - n, s = r && r[r.length - 1] || i.parent;
  if (o < 0 || i.parent.type.spec.isolating || !i.parent.canReplace(i.index(), i.parent.childCount) || !s.type.validContent(i.parent.content.cutByIndex(i.index(), i.parent.childCount)))
    return !1;
  for (let u = i.depth - 1, c = n - 2; u > o; u--, c--) {
    let f = i.node(u), h = i.index(u);
    if (f.type.spec.isolating)
      return !1;
    let d = f.content.cutByIndex(h, f.childCount), p = r && r[c + 1];
    p && (d = d.replaceChild(0, p.type.create(p.attrs)));
    let m = r && r[c] || f;
    if (!f.canReplace(h + 1, f.childCount) || !m.type.validContent(d))
      return !1;
  }
  let l = i.indexAfter(o), a = r && r[0];
  return i.node(o).canReplaceWith(l, l, a ? a.type : i.node(o + 1).type);
}
function B0(t, e, n = 1, r) {
  let i = t.doc.resolve(e), o = A.empty, s = A.empty;
  for (let l = i.depth, a = i.depth - n, u = n - 1; l > a; l--, u--) {
    o = A.from(i.node(l).copy(o));
    let c = r && r[u];
    s = A.from(c ? c.type.create(c.attrs, s) : i.node(l).copy(s));
  }
  t.step(new we(e, e, new F(o.append(s), n, n), !0));
}
function qs(t, e) {
  let n = t.resolve(e), r = n.index();
  return $0(n.nodeBefore, n.nodeAfter) && n.parent.canReplace(r, r + 1);
}
function F0(t, e) {
  e.content.size || t.type.compatibleContent(e.type);
  let n = t.contentMatchAt(t.childCount), { linebreakReplacement: r } = t.type.schema;
  for (let i = 0; i < e.childCount; i++) {
    let o = e.child(i), s = o.type == r ? t.type.schema.nodes.text : o.type;
    if (n = n.matchType(s), !n || !t.type.allowsMarks(o.marks))
      return !1;
  }
  return n.validEnd;
}
function $0(t, e) {
  return !!(t && e && !t.isLeaf && F0(t, e));
}
function _0(t, e, n) {
  let r = null, { linebreakReplacement: i } = t.doc.type.schema, o = t.doc.resolve(e - n), s = o.node().type;
  if (i && s.inlineContent) {
    let c = s.whitespace == "pre", f = !!s.contentMatch.matchType(i);
    c && !f ? r = !1 : !c && f && (r = !0);
  }
  let l = t.steps.length;
  if (r === !1) {
    let c = t.doc.resolve(e + n);
    Zd(t, c.node(), c.before(), l);
  }
  s.inlineContent && eu(t, e + n - 1, s, o.node().contentMatchAt(o.index()), r == null);
  let a = t.mapping.slice(l), u = a.map(e - n);
  if (t.step(new we(u, a.map(e + n, -1), F.empty, !0)), r === !0) {
    let c = t.doc.resolve(u);
    Xd(t, c.node(), c.before(), t.steps.length);
  }
  return t;
}
function V0(t, e, n) {
  let r = t.resolve(e);
  if (r.parent.canReplaceWith(r.index(), r.index(), n))
    return e;
  if (r.parentOffset == 0)
    for (let i = r.depth - 1; i >= 0; i--) {
      let o = r.index(i);
      if (r.node(i).canReplaceWith(o, o, n))
        return r.before(i + 1);
      if (o > 0)
        return null;
    }
  if (r.parentOffset == r.parent.content.size)
    for (let i = r.depth - 1; i >= 0; i--) {
      let o = r.indexAfter(i);
      if (r.node(i).canReplaceWith(o, o, n))
        return r.after(i + 1);
      if (o < r.node(i).childCount)
        return null;
    }
  return null;
}
function H0(t, e, n) {
  let r = t.resolve(e);
  if (!n.content.size)
    return e;
  let i = n.content;
  for (let o = 0; o < n.openStart; o++)
    i = i.firstChild.content;
  for (let o = 1; o <= (n.openStart == 0 && n.size ? 2 : 1); o++)
    for (let s = r.depth; s >= 0; s--) {
      let l = s == r.depth ? 0 : r.pos <= (r.start(s + 1) + r.end(s + 1)) / 2 ? -1 : 1, a = r.index(s) + (l > 0 ? 1 : 0), u = r.node(s), c = !1;
      if (o == 1)
        c = u.canReplace(a, a, i);
      else {
        let f = u.contentMatchAt(a).findWrapping(i.firstChild.type);
        c = f && u.canReplaceWith(a, a, f[0]);
      }
      if (c)
        return l == 0 ? r.pos : l < 0 ? r.before(s + 1) : r.after(s + 1);
    }
  return null;
}
function Ws(t, e, n = e, r = F.empty) {
  if (e == n && !r.size)
    return null;
  let i = t.resolve(e), o = t.resolve(n);
  return ep(i, o, r) ? new we(e, n, r) : new j0(i, o, r).fit();
}
function ep(t, e, n) {
  return !n.openStart && !n.openEnd && t.start() == e.start() && t.parent.canReplace(t.index(), e.index(), n.content);
}
class j0 {
  constructor(e, n, r) {
    this.$from = e, this.$to = n, this.unplaced = r, this.frontier = [], this.placed = A.empty;
    for (let i = 0; i <= e.depth; i++) {
      let o = e.node(i);
      this.frontier.push({
        type: o.type,
        match: o.contentMatchAt(e.indexAfter(i))
      });
    }
    for (let i = e.depth; i > 0; i--)
      this.placed = A.from(e.node(i).copy(this.placed));
  }
  get depth() {
    return this.frontier.length - 1;
  }
  fit() {
    for (; this.unplaced.size; ) {
      let u = this.findFittable();
      u ? this.placeNodes(u) : this.openMore() || this.dropNode();
    }
    let e = this.mustMoveInline(), n = this.placed.size - this.depth - this.$from.depth, r = this.$from, i = this.close(e < 0 ? this.$to : r.doc.resolve(e));
    if (!i)
      return null;
    let o = this.placed, s = r.depth, l = i.depth;
    for (; s && l && o.childCount == 1; )
      o = o.firstChild.content, s--, l--;
    let a = new F(o, s, l);
    return e > -1 ? new Fe(r.pos, e, this.$to.pos, this.$to.end(), a, n) : a.size || r.pos != this.$to.pos ? new we(r.pos, i.pos, a) : null;
  }
  // Find a position on the start spine of `this.unplaced` that has
  // content that can be moved somewhere on the frontier. Returns two
  // depths, one for the slice and one for the frontier.
  findFittable() {
    let e = this.unplaced.openStart;
    for (let n = this.unplaced.content, r = 0, i = this.unplaced.openEnd; r < e; r++) {
      let o = n.firstChild;
      if (n.childCount > 1 && (i = 0), o.type.spec.isolating && i <= r) {
        e = r;
        break;
      }
      n = o.content;
    }
    for (let n = 1; n <= 2; n++)
      for (let r = n == 1 ? e : this.unplaced.openStart; r >= 0; r--) {
        let i, o = null;
        r ? (o = bl(this.unplaced.content, r - 1).firstChild, i = o.content) : i = this.unplaced.content;
        let s = i.firstChild;
        for (let l = this.depth; l >= 0; l--) {
          let { type: a, match: u } = this.frontier[l], c, f = null;
          if (n == 1 && (s ? u.matchType(s.type) || (f = u.fillBefore(A.from(s), !1)) : o && a.compatibleContent(o.type)))
            return { sliceDepth: r, frontierDepth: l, parent: o, inject: f };
          if (n == 2 && s && (c = u.findWrapping(s.type)))
            return { sliceDepth: r, frontierDepth: l, parent: o, wrap: c };
          if (o && u.matchType(o.type))
            break;
        }
      }
  }
  openMore() {
    let { content: e, openStart: n, openEnd: r } = this.unplaced, i = bl(e, n);
    return !i.childCount || i.firstChild.isLeaf ? !1 : (this.unplaced = new F(e, n + 1, Math.max(r, i.size + n >= e.size - r ? n + 1 : 0)), !0);
  }
  dropNode() {
    let { content: e, openStart: n, openEnd: r } = this.unplaced, i = bl(e, n);
    if (i.childCount <= 1 && n > 0) {
      let o = e.size - n <= n + i.size;
      this.unplaced = new F(Ei(e, n - 1, 1), n - 1, o ? n - 1 : r);
    } else
      this.unplaced = new F(Ei(e, n, 1), n, r);
  }
  // Move content from the unplaced slice at `sliceDepth` to the
  // frontier node at `frontierDepth`. Close that frontier node when
  // applicable.
  placeNodes({ sliceDepth: e, frontierDepth: n, parent: r, inject: i, wrap: o }) {
    for (; this.depth > n; )
      this.closeFrontierNode();
    if (o)
      for (let m = 0; m < o.length; m++)
        this.openFrontierNode(o[m]);
    let s = this.unplaced, l = r ? r.content : s.content, a = s.openStart - e, u = 0, c = [], { match: f, type: h } = this.frontier[n];
    if (i) {
      for (let m = 0; m < i.childCount; m++)
        c.push(i.child(m));
      f = f.matchFragment(i);
    }
    let d = l.size + e - (s.content.size - s.openEnd);
    for (; u < l.childCount; ) {
      let m = l.child(u), k = f.matchType(m.type);
      if (!k)
        break;
      u++, (u > 1 || a == 0 || m.content.size) && (f = k, c.push(tp(m.mark(h.allowedMarks(m.marks)), u == 1 ? a : 0, u == l.childCount ? d : -1)));
    }
    let p = u == l.childCount;
    p || (d = -1), this.placed = Ai(this.placed, n, A.from(c)), this.frontier[n].match = f, p && d < 0 && r && r.type == this.frontier[this.depth].type && this.frontier.length > 1 && this.closeFrontierNode();
    for (let m = 0, k = l; m < d; m++) {
      let y = k.lastChild;
      this.frontier.push({ type: y.type, match: y.contentMatchAt(y.childCount) }), k = y.content;
    }
    this.unplaced = p ? e == 0 ? F.empty : new F(Ei(s.content, e - 1, 1), e - 1, d < 0 ? s.openEnd : e - 1) : new F(Ei(s.content, e, u), s.openStart, s.openEnd);
  }
  mustMoveInline() {
    if (!this.$to.parent.isTextblock)
      return -1;
    let e = this.frontier[this.depth], n;
    if (!e.type.isTextblock || !wl(this.$to, this.$to.depth, e.type, e.match, !1) || this.$to.depth == this.depth && (n = this.findCloseLevel(this.$to)) && n.depth == this.depth)
      return -1;
    let { depth: r } = this.$to, i = this.$to.after(r);
    for (; r > 1 && i == this.$to.end(--r); )
      ++i;
    return i;
  }
  findCloseLevel(e) {
    e: for (let n = Math.min(this.depth, e.depth); n >= 0; n--) {
      let { match: r, type: i } = this.frontier[n], o = n < e.depth && e.end(n + 1) == e.pos + (e.depth - (n + 1)), s = wl(e, n, i, r, o);
      if (s) {
        for (let l = n - 1; l >= 0; l--) {
          let { match: a, type: u } = this.frontier[l], c = wl(e, l, u, a, !0);
          if (!c || c.childCount)
            continue e;
        }
        return { depth: n, fit: s, move: o ? e.doc.resolve(e.after(n + 1)) : e };
      }
    }
  }
  close(e) {
    let n = this.findCloseLevel(e);
    if (!n)
      return null;
    for (; this.depth > n.depth; )
      this.closeFrontierNode();
    n.fit.childCount && (this.placed = Ai(this.placed, n.depth, n.fit)), e = n.move;
    for (let r = n.depth + 1; r <= e.depth; r++) {
      let i = e.node(r), o = i.type.contentMatch.fillBefore(i.content, !0, e.index(r));
      this.openFrontierNode(i.type, i.attrs, o);
    }
    return e;
  }
  openFrontierNode(e, n = null, r) {
    let i = this.frontier[this.depth];
    i.match = i.match.matchType(e), this.placed = Ai(this.placed, this.depth, A.from(e.create(n, r))), this.frontier.push({ type: e, match: e.contentMatch });
  }
  closeFrontierNode() {
    let n = this.frontier.pop().match.fillBefore(A.empty, !0);
    n.childCount && (this.placed = Ai(this.placed, this.frontier.length, n));
  }
}
function Ei(t, e, n) {
  return e == 0 ? t.cutByIndex(n, t.childCount) : t.replaceChild(0, t.firstChild.copy(Ei(t.firstChild.content, e - 1, n)));
}
function Ai(t, e, n) {
  return e == 0 ? t.append(n) : t.replaceChild(t.childCount - 1, t.lastChild.copy(Ai(t.lastChild.content, e - 1, n)));
}
function bl(t, e) {
  for (let n = 0; n < e; n++)
    t = t.firstChild.content;
  return t;
}
function tp(t, e, n) {
  if (e <= 0)
    return t;
  let r = t.content;
  return e > 1 && (r = r.replaceChild(0, tp(r.firstChild, e - 1, r.childCount == 1 ? n - 1 : 0))), e > 0 && (r = t.type.contentMatch.fillBefore(r).append(r), n <= 0 && (r = r.append(t.type.contentMatch.matchFragment(r).fillBefore(A.empty, !0)))), t.copy(r);
}
function wl(t, e, n, r, i) {
  let o = t.node(e), s = i ? t.indexAfter(e) : t.index(e);
  if (s == o.childCount && !n.compatibleContent(o.type))
    return null;
  let l = r.fillBefore(o.content, !0, s);
  return l && !q0(n, o.content, s) ? l : null;
}
function q0(t, e, n) {
  for (let r = n; r < e.childCount; r++)
    if (!t.allowsMarks(e.child(r).marks))
      return !0;
  return !1;
}
function W0(t) {
  return t.spec.defining || t.spec.definingForContent;
}
function K0(t, e, n, r) {
  if (!r.size)
    return t.deleteRange(e, n);
  let i = t.doc.resolve(e), o = t.doc.resolve(n);
  if (ep(i, o, r))
    return t.step(new we(e, n, r));
  let s = rp(i, o);
  s[s.length - 1] == 0 && s.pop();
  let l = -(i.depth + 1);
  s.unshift(l);
  for (let h = i.depth, d = i.pos - 1; h > 0; h--, d--) {
    let p = i.node(h).type.spec;
    if (p.defining || p.definingAsContext || p.isolating)
      break;
    s.indexOf(h) > -1 ? l = h : i.before(h) == d && s.splice(1, 0, -h);
  }
  let a = s.indexOf(l), u = [], c = r.openStart;
  for (let h = r.content, d = 0; ; d++) {
    let p = h.firstChild;
    if (u.push(p), d == r.openStart)
      break;
    h = p.content;
  }
  for (let h = c - 1; h >= 0; h--) {
    let d = u[h], p = W0(d.type);
    if (p && !d.sameMarkup(i.node(Math.abs(l) - 1)))
      c = h;
    else if (p || !d.type.isTextblock)
      break;
  }
  for (let h = r.openStart; h >= 0; h--) {
    let d = (h + c + 1) % (r.openStart + 1), p = u[d];
    if (p)
      for (let m = 0; m < s.length; m++) {
        let k = s[(m + a) % s.length], y = !0;
        k < 0 && (y = !1, k = -k);
        let O = i.node(k - 1), T = i.index(k - 1);
        if (O.canReplaceWith(T, T, p.type, p.marks))
          return t.replace(i.before(k), y ? o.after(k) : n, new F(np(r.content, 0, r.openStart, d), d, r.openEnd));
      }
  }
  let f = t.steps.length;
  for (let h = s.length - 1; h >= 0 && (t.replace(e, n, r), !(t.steps.length > f)); h--) {
    let d = s[h];
    d < 0 || (e = i.before(d), n = o.after(d));
  }
}
function np(t, e, n, r, i) {
  if (e < n) {
    let o = t.firstChild;
    t = t.replaceChild(0, o.copy(np(o.content, e + 1, n, r, o)));
  }
  if (e > r) {
    let o = i.contentMatchAt(0), s = o.fillBefore(t).append(t);
    t = s.append(o.matchFragment(s).fillBefore(A.empty, !0));
  }
  return t;
}
function U0(t, e, n, r) {
  if (!r.isInline && e == n && t.doc.resolve(e).parent.content.size) {
    let i = V0(t.doc, e, r.type);
    i != null && (e = n = i);
  }
  t.replaceRange(e, n, new F(A.from(r), 0, 0));
}
function J0(t, e, n) {
  let r = t.doc.resolve(e), i = t.doc.resolve(n);
  if (r.parent.isTextblock && i.parent.isTextblock && r.start() != i.start() && r.parentOffset == 0 && i.parentOffset == 0) {
    let s = r.sharedDepth(n), l = !1;
    for (let a = r.depth; a > s; a--)
      r.node(a).type.spec.isolating && (l = !0);
    for (let a = i.depth; a > s; a--)
      i.node(a).type.spec.isolating && (l = !0);
    if (!l) {
      for (let a = r.depth; a > 0 && e == r.start(a); a--)
        e = r.before(a);
      for (let a = i.depth; a > 0 && n == i.start(a); a--)
        n = i.before(a);
      r = t.doc.resolve(e), i = t.doc.resolve(n);
    }
  }
  let o = rp(r, i);
  for (let s = 0; s < o.length; s++) {
    let l = o[s], a = s == o.length - 1;
    if (a && l == 0 || r.node(l).type.contentMatch.validEnd)
      return t.delete(r.start(l), i.end(l));
    if (l > 0 && (a || r.node(l - 1).canReplace(r.index(l - 1), i.indexAfter(l - 1))))
      return t.delete(r.before(l), i.after(l));
  }
  for (let s = 1; s <= r.depth && s <= i.depth; s++)
    if (e - r.start(s) == r.depth - s && n > r.end(s) && i.end(s) - n != i.depth - s && r.start(s - 1) == i.start(s - 1) && r.node(s - 1).canReplace(r.index(s - 1), i.index(s - 1)))
      return t.delete(r.before(s), n);
  t.delete(e, n);
}
function rp(t, e) {
  let n = [], r = Math.min(t.depth, e.depth);
  for (let i = r; i >= 0; i--) {
    let o = t.start(i);
    if (o < t.pos - (t.depth - i) || e.end(i) > e.pos + (e.depth - i) || t.node(i).type.spec.isolating || e.node(i).type.spec.isolating)
      break;
    (o == e.start(i) || i == t.depth && i == e.depth && t.parent.inlineContent && e.parent.inlineContent && i && e.start(i - 1) == o - 1) && n.push(i);
  }
  return n;
}
class Pr extends _e {
  /**
  Construct an attribute step.
  */
  constructor(e, n, r) {
    super(), this.pos = e, this.attr = n, this.value = r;
  }
  apply(e) {
    let n = e.nodeAt(this.pos);
    if (!n)
      return xe.fail("No node at attribute step's position");
    let r = /* @__PURE__ */ Object.create(null);
    for (let o in n.attrs)
      r[o] = n.attrs[o];
    r[this.attr] = this.value;
    let i = n.type.create(r, null, n.marks);
    return xe.fromReplace(e, this.pos, this.pos + 1, new F(A.from(i), 0, n.isLeaf ? 0 : 1));
  }
  getMap() {
    return ft.empty;
  }
  invert(e) {
    return new Pr(this.pos, this.attr, e.nodeAt(this.pos).attrs[this.attr]);
  }
  map(e) {
    let n = e.mapResult(this.pos, 1);
    return n.deletedAfter ? null : new Pr(n.pos, this.attr, this.value);
  }
  toJSON() {
    return { stepType: "attr", pos: this.pos, attr: this.attr, value: this.value };
  }
  static fromJSON(e, n) {
    if (typeof n.pos != "number" || typeof n.attr != "string")
      throw new RangeError("Invalid input for AttrStep.fromJSON");
    return new Pr(n.pos, n.attr, n.value);
  }
}
_e.jsonID("attr", Pr);
class Qi extends _e {
  /**
  Construct an attribute step.
  */
  constructor(e, n) {
    super(), this.attr = e, this.value = n;
  }
  apply(e) {
    let n = /* @__PURE__ */ Object.create(null);
    for (let i in e.attrs)
      n[i] = e.attrs[i];
    n[this.attr] = this.value;
    let r = e.type.create(n, e.content, e.marks);
    return xe.ok(r);
  }
  getMap() {
    return ft.empty;
  }
  invert(e) {
    return new Qi(this.attr, e.attrs[this.attr]);
  }
  map(e) {
    return this;
  }
  toJSON() {
    return { stepType: "docAttr", attr: this.attr, value: this.value };
  }
  static fromJSON(e, n) {
    if (typeof n.attr != "string")
      throw new RangeError("Invalid input for DocAttrStep.fromJSON");
    return new Qi(n.attr, n.value);
  }
}
_e.jsonID("docAttr", Qi);
let li = class extends Error {
};
li = function t(e) {
  let n = Error.call(this, e);
  return n.__proto__ = t.prototype, n;
};
li.prototype = Object.create(Error.prototype);
li.prototype.constructor = li;
li.prototype.name = "TransformError";
class ip {
  /**
  Create a transform that starts with the given document.
  */
  constructor(e) {
    this.doc = e, this.steps = [], this.docs = [], this.mapping = new Yi();
  }
  /**
  The starting document.
  */
  get before() {
    return this.docs.length ? this.docs[0] : this.doc;
  }
  /**
  Apply a new step in this transform, saving the result. Throws an
  error when the step fails.
  */
  step(e) {
    let n = this.maybeStep(e);
    if (n.failed)
      throw new li(n.failed);
    return this;
  }
  /**
  Try to apply a step in this transformation, ignoring it if it
  fails. Returns the step result.
  */
  maybeStep(e) {
    let n = e.apply(this.doc);
    return n.failed || this.addStep(e, n.doc), n;
  }
  /**
  True when the document has been changed (when there are any
  steps).
  */
  get docChanged() {
    return this.steps.length > 0;
  }
  /**
  Return a single range, in post-transform document positions,
  that covers all content changed by this transform. Returns null
  if no replacements are made. Note that this will ignore changes
  that add/remove marks without replacing the underlying content.
  */
  changedRange() {
    let e = 1e9, n = -1e9;
    for (let r = 0; r < this.mapping.maps.length; r++) {
      let i = this.mapping.maps[r];
      r && (e = i.map(e, 1), n = i.map(n, -1)), i.forEach((o, s, l, a) => {
        e = Math.min(e, l), n = Math.max(n, a);
      });
    }
    return e == 1e9 ? null : { from: e, to: n };
  }
  /**
  @internal
  */
  addStep(e, n) {
    this.docs.push(this.doc), this.steps.push(e), this.mapping.appendMap(e.getMap()), this.doc = n;
  }
  /**
  Replace the part of the document between `from` and `to` with the
  given `slice`.
  */
  replace(e, n = e, r = F.empty) {
    let i = Ws(this.doc, e, n, r);
    return i && this.step(i), this;
  }
  /**
  Replace the given range with the given content, which may be a
  fragment, node, or array of nodes.
  */
  replaceWith(e, n, r) {
    return this.replace(e, n, new F(A.from(r), 0, 0));
  }
  /**
  Delete the content between the given positions.
  */
  delete(e, n) {
    return this.replace(e, n, F.empty);
  }
  /**
  Insert the given content at the given position.
  */
  insert(e, n) {
    return this.replaceWith(e, e, n);
  }
  /**
  Replace a range of the document with a given slice, using
  `from`, `to`, and the slice's
  [`openStart`](https://prosemirror.net/docs/ref/#model.Slice.openStart) property as hints, rather
  than fixed start and end points. This method may grow the
  replaced area or close open nodes in the slice in order to get a
  fit that is more in line with WYSIWYG expectations, by dropping
  fully covered parent nodes of the replaced region when they are
  marked [non-defining as
  context](https://prosemirror.net/docs/ref/#model.NodeSpec.definingAsContext), or including an
  open parent node from the slice that _is_ marked as [defining
  its content](https://prosemirror.net/docs/ref/#model.NodeSpec.definingForContent).
  
  This is the method, for example, to handle paste. The similar
  [`replace`](https://prosemirror.net/docs/ref/#transform.Transform.replace) method is a more
  primitive tool which will _not_ move the start and end of its given
  range, and is useful in situations where you need more precise
  control over what happens.
  */
  replaceRange(e, n, r) {
    return K0(this, e, n, r), this;
  }
  /**
  Replace the given range with a node, but use `from` and `to` as
  hints, rather than precise positions. When from and to are the same
  and are at the start or end of a parent node in which the given
  node doesn't fit, this method may _move_ them out towards a parent
  that does allow the given node to be placed. When the given range
  completely covers a parent node, this method may completely replace
  that parent node.
  */
  replaceRangeWith(e, n, r) {
    return U0(this, e, n, r), this;
  }
  /**
  Delete the given range, expanding it to cover fully covered
  parent nodes until a valid replace is found.
  */
  deleteRange(e, n) {
    return J0(this, e, n), this;
  }
  /**
  Split the content in the given range off from its parent, if there
  is sibling content before or after it, and move it up the tree to
  the depth specified by `target`. You'll probably want to use
  [`liftTarget`](https://prosemirror.net/docs/ref/#transform.liftTarget) to compute `target`, to make
  sure the lift is valid.
  */
  lift(e, n) {
    return A0(this, e, n), this;
  }
  /**
  Join the blocks around the given position. If depth is 2, their
  last and first siblings are also joined, and so on.
  */
  join(e, n = 1) {
    return _0(this, e, n), this;
  }
  /**
  Wrap the given [range](https://prosemirror.net/docs/ref/#model.NodeRange) in the given set of wrappers.
  The wrappers are assumed to be valid in this position, and should
  probably be computed with [`findWrapping`](https://prosemirror.net/docs/ref/#transform.findWrapping).
  */
  wrap(e, n) {
    return R0(this, e, n), this;
  }
  /**
  Set the type of all textblocks (partly) between `from` and `to` to
  the given node type with the given attributes.
  */
  setBlockType(e, n = e, r, i = null) {
    return L0(this, e, n, r, i), this;
  }
  /**
  Change the type, attributes, and/or marks of the node at `pos`.
  When `type` isn't given, the existing node type is preserved,
  */
  setNodeMarkup(e, n, r = null, i) {
    return P0(this, e, n, r, i), this;
  }
  /**
  Set a single attribute on a given node to a new value.
  The `pos` addresses the document content. Use `setDocAttribute`
  to set attributes on the document itself.
  */
  setNodeAttribute(e, n, r) {
    return this.step(new Pr(e, n, r)), this;
  }
  /**
  Set a single attribute on the document to a new value.
  */
  setDocAttribute(e, n) {
    return this.step(new Qi(e, n)), this;
  }
  /**
  Add a mark to the node at position `pos`.
  */
  addNodeMark(e, n) {
    return this.step(new Ln(e, n)), this;
  }
  /**
  Remove a mark (or all marks of the given type) from the node at
  position `pos`.
  */
  removeNodeMark(e, n) {
    let r = this.doc.nodeAt(e);
    if (!r)
      throw new RangeError("No node at position " + e);
    if (n instanceof ue)
      n.isInSet(r.marks) && this.step(new kr(e, n));
    else {
      let i = r.marks, o, s = [];
      for (; o = n.isInSet(i); )
        s.push(new kr(e, o)), i = o.removeFromSet(i);
      for (let l = s.length - 1; l >= 0; l--)
        this.step(s[l]);
    }
    return this;
  }
  /**
  Split the node at the given position, and optionally, if `depth` is
  greater than one, any number of nodes above that. By default, the
  parts split off will inherit the node type of the original node.
  This can be changed by passing an array of types and attributes to
  use after the split (with the outermost nodes coming first).
  */
  split(e, n = 1, r) {
    return B0(this, e, n, r), this;
  }
  /**
  Add the given mark to the inline content between `from` and `to`.
  */
  addMark(e, n, r) {
    return v0(this, e, n, r), this;
  }
  /**
  Remove marks from inline nodes between `from` and `to`. When
  `mark` is a single mark, remove precisely that mark. When it is
  a mark type, remove all marks of that type. When it is null,
  remove all marks of any type.
  */
  removeMark(e, n, r) {
    return I0(this, e, n, r), this;
  }
  /**
  Removes all marks and nodes from the content of the node at
  `pos` that don't match the given new parent node type. Accepts
  an optional starting [content match](https://prosemirror.net/docs/ref/#model.ContentMatch) as
  third argument.
  */
  clearIncompatible(e, n, r) {
    return eu(this, e, n, r), this;
  }
}
const xl = /* @__PURE__ */ Object.create(null);
class ee {
  /**
  Initialize a selection with the head and anchor and ranges. If no
  ranges are given, constructs a single range across `$anchor` and
  `$head`.
  */
  constructor(e, n, r) {
    this.$anchor = e, this.$head = n, this.ranges = r || [new op(e.min(n), e.max(n))];
  }
  /**
  The selection's anchor, as an unresolved position.
  */
  get anchor() {
    return this.$anchor.pos;
  }
  /**
  The selection's head.
  */
  get head() {
    return this.$head.pos;
  }
  /**
  The lower bound of the selection's main range.
  */
  get from() {
    return this.$from.pos;
  }
  /**
  The upper bound of the selection's main range.
  */
  get to() {
    return this.$to.pos;
  }
  /**
  The resolved lower  bound of the selection's main range.
  */
  get $from() {
    return this.ranges[0].$from;
  }
  /**
  The resolved upper bound of the selection's main range.
  */
  get $to() {
    return this.ranges[0].$to;
  }
  /**
  Indicates whether the selection contains any content.
  */
  get empty() {
    let e = this.ranges;
    for (let n = 0; n < e.length; n++)
      if (e[n].$from.pos != e[n].$to.pos)
        return !1;
    return !0;
  }
  /**
  Get the content of this selection as a slice.
  */
  content() {
    return this.$from.doc.slice(this.from, this.to, !0);
  }
  /**
  Replace the selection with a slice or, if no slice is given,
  delete the selection. Will append to the given transaction.
  */
  replace(e, n = F.empty) {
    let r = n.content.lastChild, i = null;
    for (let l = 0; l < n.openEnd; l++)
      i = r, r = r.lastChild;
    let o = e.steps.length, s = this.ranges;
    for (let l = 0; l < s.length; l++) {
      let { $from: a, $to: u } = s[l], c = e.mapping.slice(o);
      e.replaceRange(c.map(a.pos), c.map(u.pos), l ? F.empty : n), l == 0 && Af(e, o, (r ? r.isInline : i && i.isTextblock) ? -1 : 1);
    }
  }
  /**
  Replace the selection with the given node, appending the changes
  to the given transaction.
  */
  replaceWith(e, n) {
    let r = e.steps.length, i = this.ranges;
    for (let o = 0; o < i.length; o++) {
      let { $from: s, $to: l } = i[o], a = e.mapping.slice(r), u = a.map(s.pos), c = a.map(l.pos);
      o ? e.deleteRange(u, c) : (e.replaceRangeWith(u, c, n), Af(e, r, n.isInline ? -1 : 1));
    }
  }
  /**
  Find a valid cursor or leaf node selection starting at the given
  position and searching back if `dir` is negative, and forward if
  positive. When `textOnly` is true, only consider cursor
  selections. Will return null when no valid selection position is
  found.
  */
  static findFrom(e, n, r = !1) {
    let i = e.parent.inlineContent ? new Z(e) : Er(e.node(0), e.parent, e.pos, e.index(), n, r);
    if (i)
      return i;
    for (let o = e.depth - 1; o >= 0; o--) {
      let s = n < 0 ? Er(e.node(0), e.node(o), e.before(o + 1), e.index(o), n, r) : Er(e.node(0), e.node(o), e.after(o + 1), e.index(o) + 1, n, r);
      if (s)
        return s;
    }
    return null;
  }
  /**
  Find a valid cursor or leaf node selection near the given
  position. Searches forward first by default, but if `bias` is
  negative, it will search backwards first.
  */
  static near(e, n = 1) {
    return this.findFrom(e, n) || this.findFrom(e, -n) || new pt(e.node(0));
  }
  /**
  Find the cursor or leaf node selection closest to the start of
  the given document. Will return an
  [`AllSelection`](https://prosemirror.net/docs/ref/#state.AllSelection) if no valid position
  exists.
  */
  static atStart(e) {
    return Er(e, e, 0, 0, 1) || new pt(e);
  }
  /**
  Find the cursor or leaf node selection closest to the end of the
  given document.
  */
  static atEnd(e) {
    return Er(e, e, e.content.size, e.childCount, -1) || new pt(e);
  }
  /**
  Deserialize the JSON representation of a selection. Must be
  implemented for custom classes (as a static class method).
  */
  static fromJSON(e, n) {
    if (!n || !n.type)
      throw new RangeError("Invalid input for Selection.fromJSON");
    let r = xl[n.type];
    if (!r)
      throw new RangeError(`No selection type ${n.type} defined`);
    return r.fromJSON(e, n);
  }
  /**
  To be able to deserialize selections from JSON, custom selection
  classes must register themselves with an ID string, so that they
  can be disambiguated. Try to pick something that's unlikely to
  clash with classes from other modules.
  */
  static jsonID(e, n) {
    if (e in xl)
      throw new RangeError("Duplicate use of selection JSON ID " + e);
    return xl[e] = n, n.prototype.jsonID = e, n;
  }
  /**
  Get a [bookmark](https://prosemirror.net/docs/ref/#state.SelectionBookmark) for this selection,
  which is a value that can be mapped without having access to a
  current document, and later resolved to a real selection for a
  given document again. (This is used mostly by the history to
  track and restore old selections.) The default implementation of
  this method just converts the selection to a text selection and
  returns the bookmark for that.
  */
  getBookmark() {
    return Z.between(this.$anchor, this.$head).getBookmark();
  }
}
ee.prototype.visible = !0;
class op {
  /**
  Create a range.
  */
  constructor(e, n) {
    this.$from = e, this.$to = n;
  }
}
let If = !1;
function Ef(t) {
  !If && !t.parent.inlineContent && (If = !0, console.warn("TextSelection endpoint not pointing into a node with inline content (" + t.parent.type.name + ")"));
}
class Z extends ee {
  /**
  Construct a text selection between the given points.
  */
  constructor(e, n = e) {
    Ef(e), Ef(n), super(e, n);
  }
  /**
  Returns a resolved position if this is a cursor selection (an
  empty text selection), and null otherwise.
  */
  get $cursor() {
    return this.$anchor.pos == this.$head.pos ? this.$head : null;
  }
  map(e, n) {
    let r = e.resolve(n.map(this.head));
    if (!r.parent.inlineContent)
      return ee.near(r);
    let i = e.resolve(n.map(this.anchor));
    return new Z(i.parent.inlineContent ? i : r, r);
  }
  replace(e, n = F.empty) {
    if (super.replace(e, n), n == F.empty) {
      let r = this.$from.marksAcross(this.$to);
      r && e.ensureMarks(r);
    }
  }
  eq(e) {
    return e instanceof Z && e.anchor == this.anchor && e.head == this.head;
  }
  getBookmark() {
    return new Ks(this.anchor, this.head);
  }
  toJSON() {
    return { type: "text", anchor: this.anchor, head: this.head };
  }
  /**
  @internal
  */
  static fromJSON(e, n) {
    if (typeof n.anchor != "number" || typeof n.head != "number")
      throw new RangeError("Invalid input for TextSelection.fromJSON");
    return new Z(e.resolve(n.anchor), e.resolve(n.head));
  }
  /**
  Create a text selection from non-resolved positions.
  */
  static create(e, n, r = n) {
    let i = e.resolve(n);
    return new this(i, r == n ? i : e.resolve(r));
  }
  /**
  Return a text selection that spans the given positions or, if
  they aren't text positions, find a text selection near them.
  `bias` determines whether the method searches forward (default)
  or backwards (negative number) first. Will fall back to calling
  [`Selection.near`](https://prosemirror.net/docs/ref/#state.Selection^near) when the document
  doesn't contain a valid text position.
  */
  static between(e, n, r) {
    let i = e.pos - n.pos;
    if ((!r || i) && (r = i >= 0 ? 1 : -1), !n.parent.inlineContent) {
      let o = ee.findFrom(n, r, !0) || ee.findFrom(n, -r, !0);
      if (o)
        n = o.$head;
      else
        return ee.near(n, r);
    }
    return e.parent.inlineContent || (i == 0 ? e = n : (e = (ee.findFrom(e, -r, !0) || ee.findFrom(e, r, !0)).$anchor, e.pos < n.pos != i < 0 && (e = n))), new Z(e, n);
  }
}
ee.jsonID("text", Z);
class Ks {
  constructor(e, n) {
    this.anchor = e, this.head = n;
  }
  map(e) {
    return new Ks(e.map(this.anchor), e.map(this.head));
  }
  resolve(e) {
    return Z.between(e.resolve(this.anchor), e.resolve(this.head));
  }
}
class Q extends ee {
  /**
  Create a node selection. Does not verify the validity of its
  argument.
  */
  constructor(e) {
    let n = e.nodeAfter, r = e.node(0).resolve(e.pos + n.nodeSize);
    super(e, r), this.node = n;
  }
  map(e, n) {
    let { deleted: r, pos: i } = n.mapResult(this.anchor), o = e.resolve(i);
    return r ? ee.near(o) : new Q(o);
  }
  content() {
    return new F(A.from(this.node), 0, 0);
  }
  eq(e) {
    return e instanceof Q && e.anchor == this.anchor;
  }
  toJSON() {
    return { type: "node", anchor: this.anchor };
  }
  getBookmark() {
    return new nu(this.anchor);
  }
  /**
  @internal
  */
  static fromJSON(e, n) {
    if (typeof n.anchor != "number")
      throw new RangeError("Invalid input for NodeSelection.fromJSON");
    return new Q(e.resolve(n.anchor));
  }
  /**
  Create a node selection from non-resolved positions.
  */
  static create(e, n) {
    return new Q(e.resolve(n));
  }
  /**
  Determines whether the given node may be selected as a node
  selection.
  */
  static isSelectable(e) {
    return !e.isText && e.type.spec.selectable !== !1;
  }
}
Q.prototype.visible = !1;
ee.jsonID("node", Q);
class nu {
  constructor(e) {
    this.anchor = e;
  }
  map(e) {
    let { deleted: n, pos: r } = e.mapResult(this.anchor);
    return n ? new Ks(r, r) : new nu(r);
  }
  resolve(e) {
    let n = e.resolve(this.anchor), r = n.nodeAfter;
    return r && Q.isSelectable(r) ? new Q(n) : ee.near(n);
  }
}
class pt extends ee {
  /**
  Create an all-selection over the given document.
  */
  constructor(e) {
    super(e.resolve(0), e.resolve(e.content.size));
  }
  replace(e, n = F.empty) {
    if (n == F.empty) {
      e.delete(0, e.doc.content.size);
      let r = ee.atStart(e.doc);
      r.eq(e.selection) || e.setSelection(r);
    } else
      super.replace(e, n);
  }
  toJSON() {
    return { type: "all" };
  }
  /**
  @internal
  */
  static fromJSON(e) {
    return new pt(e);
  }
  map(e) {
    return new pt(e);
  }
  eq(e) {
    return e instanceof pt;
  }
  getBookmark() {
    return G0;
  }
}
ee.jsonID("all", pt);
const G0 = {
  map() {
    return this;
  },
  resolve(t) {
    return new pt(t);
  }
};
function Er(t, e, n, r, i, o = !1) {
  if (e.inlineContent)
    return Z.create(t, n);
  for (let s = r - (i > 0 ? 0 : 1); i > 0 ? s < e.childCount : s >= 0; s += i) {
    let l = e.child(s);
    if (l.isAtom) {
      if (!o && Q.isSelectable(l))
        return Q.create(t, n - (i < 0 ? l.nodeSize : 0));
    } else {
      let a = Er(t, l, n + i, i < 0 ? l.childCount : 0, i, o);
      if (a)
        return a;
    }
    n += l.nodeSize * i;
  }
  return null;
}
function Af(t, e, n) {
  let r = t.steps.length - 1;
  if (r < e)
    return;
  let i = t.steps[r];
  if (!(i instanceof we || i instanceof Fe))
    return;
  let o = t.mapping.maps[r], s;
  o.forEach((l, a, u, c) => {
    s == null && (s = c);
  }), t.setSelection(ee.near(t.doc.resolve(s), n));
}
const Of = 1, Yo = 2, Df = 4;
class Y0 extends ip {
  /**
  @internal
  */
  constructor(e) {
    super(e.doc), this.curSelectionFor = 0, this.updated = 0, this.meta = /* @__PURE__ */ Object.create(null), this.time = Date.now(), this.curSelection = e.selection, this.storedMarks = e.storedMarks;
  }
  /**
  The transaction's current selection. This defaults to the editor
  selection [mapped](https://prosemirror.net/docs/ref/#state.Selection.map) through the steps in the
  transaction, but can be overwritten with
  [`setSelection`](https://prosemirror.net/docs/ref/#state.Transaction.setSelection).
  */
  get selection() {
    return this.curSelectionFor < this.steps.length && (this.curSelection = this.curSelection.map(this.doc, this.mapping.slice(this.curSelectionFor)), this.curSelectionFor = this.steps.length), this.curSelection;
  }
  /**
  Update the transaction's current selection. Will determine the
  selection that the editor gets when the transaction is applied.
  */
  setSelection(e) {
    if (e.$from.doc != this.doc)
      throw new RangeError("Selection passed to setSelection must point at the current document");
    return this.curSelection = e, this.curSelectionFor = this.steps.length, this.updated = (this.updated | Of) & ~Yo, this.storedMarks = null, this;
  }
  /**
  Whether the selection was explicitly updated by this transaction.
  */
  get selectionSet() {
    return (this.updated & Of) > 0;
  }
  /**
  Set the current stored marks.
  */
  setStoredMarks(e) {
    return this.storedMarks = e, this.updated |= Yo, this;
  }
  /**
  Make sure the current stored marks or, if that is null, the marks
  at the selection, match the given set of marks. Does nothing if
  this is already the case.
  */
  ensureMarks(e) {
    return ue.sameSet(this.storedMarks || this.selection.$from.marks(), e) || this.setStoredMarks(e), this;
  }
  /**
  Add a mark to the set of stored marks.
  */
  addStoredMark(e) {
    return this.ensureMarks(e.addToSet(this.storedMarks || this.selection.$head.marks()));
  }
  /**
  Remove a mark or mark type from the set of stored marks.
  */
  removeStoredMark(e) {
    return this.ensureMarks(e.removeFromSet(this.storedMarks || this.selection.$head.marks()));
  }
  /**
  Whether the stored marks were explicitly set for this transaction.
  */
  get storedMarksSet() {
    return (this.updated & Yo) > 0;
  }
  /**
  @internal
  */
  addStep(e, n) {
    super.addStep(e, n), this.updated = this.updated & ~Yo, this.storedMarks = null;
  }
  /**
  Update the timestamp for the transaction.
  */
  setTime(e) {
    return this.time = e, this;
  }
  /**
  Replace the current selection with the given slice.
  */
  replaceSelection(e) {
    return this.selection.replace(this, e), this;
  }
  /**
  Replace the selection with the given node. When `inheritMarks` is
  true and the content is inline, it inherits the marks from the
  place where it is inserted.
  */
  replaceSelectionWith(e, n = !0) {
    let r = this.selection;
    return n && (e = e.mark(this.storedMarks || (r.empty ? r.$from.marks() : r.$from.marksAcross(r.$to) || ue.none))), r.replaceWith(this, e), this;
  }
  /**
  Delete the selection.
  */
  deleteSelection() {
    return this.selection.replace(this), this;
  }
  /**
  Replace the given range, or the selection if no range is given,
  with a text node containing the given string.
  */
  insertText(e, n, r) {
    let i = this.doc.type.schema;
    if (n == null)
      return e ? this.replaceSelectionWith(i.text(e), !0) : this.deleteSelection();
    {
      if (r == null && (r = n), !e)
        return this.deleteRange(n, r);
      let o = this.storedMarks;
      if (!o) {
        let s = this.doc.resolve(n);
        o = r == n ? s.marks() : s.marksAcross(this.doc.resolve(r));
      }
      return this.replaceRangeWith(n, r, i.text(e, o)), !this.selection.empty && this.selection.to == n + e.length && this.setSelection(ee.near(this.selection.$to)), this;
    }
  }
  /**
  Store a metadata property in this transaction, keyed either by
  name or by plugin.
  */
  setMeta(e, n) {
    return this.meta[typeof e == "string" ? e : e.key] = n, this;
  }
  /**
  Retrieve a metadata property for a given name or plugin.
  */
  getMeta(e) {
    return this.meta[typeof e == "string" ? e : e.key];
  }
  /**
  Returns true if this transaction doesn't contain any metadata,
  and can thus safely be extended.
  */
  get isGeneric() {
    for (let e in this.meta)
      return !1;
    return !0;
  }
  /**
  Indicate that the editor should scroll the selection into view
  when updated to the state produced by this transaction.
  */
  scrollIntoView() {
    return this.updated |= Df, this;
  }
  /**
  True when this transaction has had `scrollIntoView` called on it.
  */
  get scrolledIntoView() {
    return (this.updated & Df) > 0;
  }
}
function Rf(t, e) {
  return !e || !t ? t : t.bind(e);
}
class Oi {
  constructor(e, n, r) {
    this.name = e, this.init = Rf(n.init, r), this.apply = Rf(n.apply, r);
  }
}
const Q0 = [
  new Oi("doc", {
    init(t) {
      return t.doc || t.schema.topNodeType.createAndFill();
    },
    apply(t) {
      return t.doc;
    }
  }),
  new Oi("selection", {
    init(t, e) {
      return t.selection || ee.atStart(e.doc);
    },
    apply(t) {
      return t.selection;
    }
  }),
  new Oi("storedMarks", {
    init(t) {
      return t.storedMarks || null;
    },
    apply(t, e, n, r) {
      return r.selection.$cursor ? t.storedMarks : null;
    }
  }),
  new Oi("scrollToSelection", {
    init() {
      return 0;
    },
    apply(t, e) {
      return t.scrolledIntoView ? e + 1 : e;
    }
  })
];
class Cl {
  constructor(e, n) {
    this.schema = e, this.plugins = [], this.pluginsByKey = /* @__PURE__ */ Object.create(null), this.fields = Q0.slice(), n && n.forEach((r) => {
      if (this.pluginsByKey[r.key])
        throw new RangeError("Adding different instances of a keyed plugin (" + r.key + ")");
      this.plugins.push(r), this.pluginsByKey[r.key] = r, r.spec.state && this.fields.push(new Oi(r.key, r.spec.state, r));
    });
  }
}
class Lr {
  /**
  @internal
  */
  constructor(e) {
    this.config = e;
  }
  /**
  The schema of the state's document.
  */
  get schema() {
    return this.config.schema;
  }
  /**
  The plugins that are active in this state.
  */
  get plugins() {
    return this.config.plugins;
  }
  /**
  Apply the given transaction to produce a new state.
  */
  apply(e) {
    return this.applyTransaction(e).state;
  }
  /**
  @internal
  */
  filterTransaction(e, n = -1) {
    for (let r = 0; r < this.config.plugins.length; r++)
      if (r != n) {
        let i = this.config.plugins[r];
        if (i.spec.filterTransaction && !i.spec.filterTransaction.call(i, e, this))
          return !1;
      }
    return !0;
  }
  /**
  Verbose variant of [`apply`](https://prosemirror.net/docs/ref/#state.EditorState.apply) that
  returns the precise transactions that were applied (which might
  be influenced by the [transaction
  hooks](https://prosemirror.net/docs/ref/#state.PluginSpec.filterTransaction) of
  plugins) along with the new state.
  */
  applyTransaction(e) {
    if (!this.filterTransaction(e))
      return { state: this, transactions: [] };
    let n = [e], r = this.applyInner(e), i = null;
    for (; ; ) {
      let o = !1;
      for (let s = 0; s < this.config.plugins.length; s++) {
        let l = this.config.plugins[s];
        if (l.spec.appendTransaction) {
          let a = i ? i[s].n : 0, u = i ? i[s].state : this, c = a < n.length && l.spec.appendTransaction.call(l, a ? n.slice(a) : n, u, r);
          if (c && r.filterTransaction(c, s)) {
            if (c.setMeta("appendedTransaction", e), !i) {
              i = [];
              for (let f = 0; f < this.config.plugins.length; f++)
                i.push(f < s ? { state: r, n: n.length } : { state: this, n: 0 });
            }
            n.push(c), r = r.applyInner(c), o = !0;
          }
          i && (i[s] = { state: r, n: n.length });
        }
      }
      if (!o)
        return { state: r, transactions: n };
    }
  }
  /**
  @internal
  */
  applyInner(e) {
    if (!e.before.eq(this.doc))
      throw new RangeError("Applying a mismatched transaction");
    let n = new Lr(this.config), r = this.config.fields;
    for (let i = 0; i < r.length; i++) {
      let o = r[i];
      n[o.name] = o.apply(e, this[o.name], this, n);
    }
    return n;
  }
  /**
  Accessor that constructs and returns a new [transaction](https://prosemirror.net/docs/ref/#state.Transaction) from this state.
  */
  get tr() {
    return new Y0(this);
  }
  /**
  Create a new state.
  */
  static create(e) {
    let n = new Cl(e.doc ? e.doc.type.schema : e.schema, e.plugins), r = new Lr(n);
    for (let i = 0; i < n.fields.length; i++)
      r[n.fields[i].name] = n.fields[i].init(e, r);
    return r;
  }
  /**
  Create a new state based on this one, but with an adjusted set
  of active plugins. State fields that exist in both sets of
  plugins are kept unchanged. Those that no longer exist are
  dropped, and those that are new are initialized using their
  [`init`](https://prosemirror.net/docs/ref/#state.StateField.init) method, passing in the new
  configuration object..
  */
  reconfigure(e) {
    let n = new Cl(this.schema, e.plugins), r = n.fields, i = new Lr(n);
    for (let o = 0; o < r.length; o++) {
      let s = r[o].name;
      i[s] = this.hasOwnProperty(s) ? this[s] : r[o].init(e, i);
    }
    return i;
  }
  /**
  Serialize this state to JSON. If you want to serialize the state
  of plugins, pass an object mapping property names to use in the
  resulting JSON object to plugin objects. The argument may also be
  a string or number, in which case it is ignored, to support the
  way `JSON.stringify` calls `toString` methods.
  */
  toJSON(e) {
    let n = { doc: this.doc.toJSON(), selection: this.selection.toJSON() };
    if (this.storedMarks && (n.storedMarks = this.storedMarks.map((r) => r.toJSON())), e && typeof e == "object")
      for (let r in e) {
        if (r == "doc" || r == "selection")
          throw new RangeError("The JSON fields `doc` and `selection` are reserved");
        let i = e[r], o = i.spec.state;
        o && o.toJSON && (n[r] = o.toJSON.call(i, this[i.key]));
      }
    return n;
  }
  /**
  Deserialize a JSON representation of a state. `config` should
  have at least a `schema` field, and should contain array of
  plugins to initialize the state with. `pluginFields` can be used
  to deserialize the state of plugins, by associating plugin
  instances with the property names they use in the JSON object.
  */
  static fromJSON(e, n, r) {
    if (!n)
      throw new RangeError("Invalid input for EditorState.fromJSON");
    if (!e.schema)
      throw new RangeError("Required config field 'schema' missing");
    let i = new Cl(e.schema, e.plugins), o = new Lr(i);
    return i.fields.forEach((s) => {
      if (s.name == "doc")
        o.doc = fn.fromJSON(e.schema, n.doc);
      else if (s.name == "selection")
        o.selection = ee.fromJSON(o.doc, n.selection);
      else if (s.name == "storedMarks")
        n.storedMarks && (o.storedMarks = n.storedMarks.map(e.schema.markFromJSON));
      else {
        if (r)
          for (let l in r) {
            let a = r[l], u = a.spec.state;
            if (a.key == s.name && u && u.fromJSON && Object.prototype.hasOwnProperty.call(n, l)) {
              o[s.name] = u.fromJSON.call(a, e, n[l], o);
              return;
            }
          }
        o[s.name] = s.init(e, o);
      }
    }), o;
  }
}
function sp(t, e, n) {
  for (let r in t) {
    let i = t[r];
    i instanceof Function ? i = i.bind(e) : r == "handleDOMEvents" && (i = sp(i, e, {})), n[r] = i;
  }
  return n;
}
class Ee {
  /**
  Create a plugin.
  */
  constructor(e) {
    this.spec = e, this.props = {}, e.props && sp(e.props, this, this.props), this.key = e.key ? e.key.key : lp("plugin");
  }
  /**
  Extract the plugin's state field from an editor state.
  */
  getState(e) {
    return e[this.key];
  }
}
const Sl = /* @__PURE__ */ Object.create(null);
function lp(t) {
  return t in Sl ? t + "$" + ++Sl[t] : (Sl[t] = 0, t + "$");
}
class Ve {
  /**
  Create a plugin key.
  */
  constructor(e = "key") {
    this.key = lp(e);
  }
  /**
  Get the active plugin with this key, if any, from an editor
  state.
  */
  get(e) {
    return e.config.pluginsByKey[this.key];
  }
  /**
  Get the plugin's state from an editor state.
  */
  getState(e) {
    return e[this.key];
  }
}
const ru = (t, e) => t.selection.empty ? !1 : (e && e(t.tr.deleteSelection().scrollIntoView()), !0);
function ap(t, e) {
  let { $cursor: n } = t.selection;
  return !n || (e ? !e.endOfTextblock("backward", t) : n.parentOffset > 0) ? null : n;
}
const up = (t, e, n) => {
  let r = ap(t, n);
  if (!r)
    return !1;
  let i = iu(r);
  if (!i) {
    let s = r.blockRange(), l = s && js(s);
    return l == null ? !1 : (e && e(t.tr.lift(s, l).scrollIntoView()), !0);
  }
  let o = i.nodeBefore;
  if (hp(t, i, e, -1))
    return !0;
  if (r.parent.content.size == 0 && (ai(o, "end") || Q.isSelectable(o)))
    for (let s = r.depth; ; s--) {
      let l = Ws(t.doc, r.before(s), r.after(s), F.empty);
      if (l && l.slice.size < l.to - l.from) {
        if (e) {
          let a = t.tr.step(l);
          a.setSelection(ai(o, "end") ? ee.findFrom(a.doc.resolve(a.mapping.map(i.pos, -1)), -1) : Q.create(a.doc, i.pos - o.nodeSize)), e(a.scrollIntoView());
        }
        return !0;
      }
      if (s == 1 || r.node(s - 1).childCount > 1)
        break;
    }
  return o.isAtom && i.depth == r.depth - 1 ? (e && e(t.tr.delete(i.pos - o.nodeSize, i.pos).scrollIntoView()), !0) : !1;
}, X0 = (t, e, n) => {
  let r = ap(t, n);
  if (!r)
    return !1;
  let i = iu(r);
  return i ? Z0(t, i, e) : !1;
};
function Z0(t, e, n) {
  let r = e.nodeBefore, i = r, o = e.pos - 1;
  for (; !i.isTextblock; o--) {
    if (i.type.spec.isolating)
      return !1;
    let c = i.lastChild;
    if (!c)
      return !1;
    i = c;
  }
  let s = e.nodeAfter, l = s, a = e.pos + 1;
  for (; !l.isTextblock; a++) {
    if (l.type.spec.isolating)
      return !1;
    let c = l.firstChild;
    if (!c)
      return !1;
    l = c;
  }
  let u = Ws(t.doc, o, a, F.empty);
  if (!u || u.from != o || u instanceof we && u.slice.size >= a - o)
    return !1;
  if (n) {
    let c = t.tr.step(u);
    c.setSelection(Z.create(c.doc, o)), n(c.scrollIntoView());
  }
  return !0;
}
function ai(t, e, n = !1) {
  for (let r = t; r; r = e == "start" ? r.firstChild : r.lastChild) {
    if (r.isTextblock)
      return !0;
    if (n && r.childCount != 1)
      return !1;
  }
  return !1;
}
const cp = (t, e, n) => {
  let { $head: r, empty: i } = t.selection, o = r;
  if (!i)
    return !1;
  if (r.parent.isTextblock) {
    if (n ? !n.endOfTextblock("backward", t) : r.parentOffset > 0)
      return !1;
    o = iu(r);
  }
  let s = o && o.nodeBefore;
  return !s || !Q.isSelectable(s) ? !1 : (e && e(t.tr.setSelection(Q.create(t.doc, o.pos - s.nodeSize)).scrollIntoView()), !0);
};
function iu(t) {
  if (!t.parent.type.spec.isolating)
    for (let e = t.depth - 1; e >= 0; e--) {
      if (t.index(e) > 0)
        return t.doc.resolve(t.before(e + 1));
      if (t.node(e).type.spec.isolating)
        break;
    }
  return null;
}
function ew(t, e) {
  let { $cursor: n } = t.selection;
  return !n || (e ? !e.endOfTextblock("forward", t) : n.parentOffset < n.parent.content.size) ? null : n;
}
const tw = (t, e, n) => {
  let r = ew(t, n);
  if (!r)
    return !1;
  let i = fp(r);
  if (!i)
    return !1;
  let o = i.nodeAfter;
  if (hp(t, i, e, 1))
    return !0;
  if (r.parent.content.size == 0 && (ai(o, "start") || Q.isSelectable(o))) {
    let s = Ws(t.doc, r.before(), r.after(), F.empty);
    if (s && s.slice.size < s.to - s.from) {
      if (e) {
        let l = t.tr.step(s);
        l.setSelection(ai(o, "start") ? ee.findFrom(l.doc.resolve(l.mapping.map(i.pos)), 1) : Q.create(l.doc, l.mapping.map(i.pos))), e(l.scrollIntoView());
      }
      return !0;
    }
  }
  return o.isAtom && i.depth == r.depth - 1 ? (e && e(t.tr.delete(i.pos, i.pos + o.nodeSize).scrollIntoView()), !0) : !1;
}, nw = (t, e, n) => {
  let { $head: r, empty: i } = t.selection, o = r;
  if (!i)
    return !1;
  if (r.parent.isTextblock) {
    if (n ? !n.endOfTextblock("forward", t) : r.parentOffset < r.parent.content.size)
      return !1;
    o = fp(r);
  }
  let s = o && o.nodeAfter;
  return !s || !Q.isSelectable(s) ? !1 : (e && e(t.tr.setSelection(Q.create(t.doc, o.pos)).scrollIntoView()), !0);
};
function fp(t) {
  if (!t.parent.type.spec.isolating)
    for (let e = t.depth - 1; e >= 0; e--) {
      let n = t.node(e);
      if (t.index(e) + 1 < n.childCount)
        return t.doc.resolve(t.after(e + 1));
      if (n.type.spec.isolating)
        break;
    }
  return null;
}
const rw = (t, e) => {
  let { $head: n, $anchor: r } = t.selection;
  return !n.parent.type.spec.code || !n.sameParent(r) ? !1 : (e && e(t.tr.insertText(`
`).scrollIntoView()), !0);
};
function ou(t) {
  for (let e = 0; e < t.edgeCount; e++) {
    let { type: n } = t.edge(e);
    if (n.isTextblock && !n.hasRequiredAttrs())
      return n;
  }
  return null;
}
const iw = (t, e) => {
  let { $head: n, $anchor: r } = t.selection;
  if (!n.parent.type.spec.code || !n.sameParent(r))
    return !1;
  let i = n.node(-1), o = n.indexAfter(-1), s = ou(i.contentMatchAt(o));
  if (!s || !i.canReplaceWith(o, o, s))
    return !1;
  if (e) {
    let l = n.after(), a = t.tr.replaceWith(l, l, s.createAndFill());
    a.setSelection(ee.near(a.doc.resolve(l), 1)), e(a.scrollIntoView());
  }
  return !0;
}, ow = (t, e) => {
  let n = t.selection, { $from: r, $to: i } = n;
  if (n instanceof pt || r.parent.inlineContent || i.parent.inlineContent)
    return !1;
  let o = ou(i.parent.contentMatchAt(i.indexAfter()));
  if (!o || !o.isTextblock)
    return !1;
  if (e) {
    let s = (!r.parentOffset && i.index() < i.parent.childCount ? r : i).pos, l = t.tr.insert(s, o.createAndFill());
    l.setSelection(Z.create(l.doc, s + 1)), e(l.scrollIntoView());
  }
  return !0;
}, sw = (t, e) => {
  let { $cursor: n } = t.selection;
  if (!n || n.parent.content.size)
    return !1;
  if (n.depth > 1 && n.after() != n.end(-1)) {
    let o = n.before();
    if (Bi(t.doc, o))
      return e && e(t.tr.split(o).scrollIntoView()), !0;
  }
  let r = n.blockRange(), i = r && js(r);
  return i == null ? !1 : (e && e(t.tr.lift(r, i).scrollIntoView()), !0);
};
function lw(t) {
  return (e, n) => {
    let { $from: r, $to: i } = e.selection;
    if (e.selection instanceof Q && e.selection.node.isBlock)
      return !r.parentOffset || !Bi(e.doc, r.pos) ? !1 : (n && n(e.tr.split(r.pos).scrollIntoView()), !0);
    if (!r.depth)
      return !1;
    let o = [], s, l, a = !1, u = !1;
    for (let d = r.depth; ; d--)
      if (r.node(d).isBlock) {
        a = r.end(d) == r.pos + (r.depth - d), u = r.start(d) == r.pos - (r.depth - d), l = ou(r.node(d - 1).contentMatchAt(r.indexAfter(d - 1))), o.unshift(a && l ? { type: l } : null), s = d;
        break;
      } else {
        if (d == 1)
          return !1;
        o.unshift(null);
      }
    let c = e.tr;
    (e.selection instanceof Z || e.selection instanceof pt) && c.deleteSelection();
    let f = c.mapping.map(r.pos), h = Bi(c.doc, f, o.length, o);
    if (h || (o[0] = l ? { type: l } : null, h = Bi(c.doc, f, o.length, o)), !h)
      return !1;
    if (c.split(f, o.length, o), !a && u && r.node(s).type != l) {
      let d = c.mapping.map(r.before(s)), p = c.doc.resolve(d);
      l && r.node(s - 1).canReplaceWith(p.index(), p.index() + 1, l) && c.setNodeMarkup(c.mapping.map(r.before(s)), l);
    }
    return n && n(c.scrollIntoView()), !0;
  };
}
const aw = lw(), uw = (t, e) => (e && e(t.tr.setSelection(new pt(t.doc))), !0);
function cw(t, e, n) {
  let r = e.nodeBefore, i = e.nodeAfter, o = e.index();
  return !r || !i || !r.type.compatibleContent(i.type) ? !1 : !r.content.size && e.parent.canReplace(o - 1, o) ? (n && n(t.tr.delete(e.pos - r.nodeSize, e.pos).scrollIntoView()), !0) : !e.parent.canReplace(o, o + 1) || !(i.isTextblock || qs(t.doc, e.pos)) ? !1 : (n && n(t.tr.join(e.pos).scrollIntoView()), !0);
}
function hp(t, e, n, r) {
  let i = e.nodeBefore, o = e.nodeAfter, s, l, a = i.type.spec.isolating || o.type.spec.isolating;
  if (!a && cw(t, e, n))
    return !0;
  let u = !a && e.parent.canReplace(e.index(), e.index() + 1);
  if (u && (s = (l = i.contentMatchAt(i.childCount)).findWrapping(o.type)) && l.matchType(s[0] || o.type).validEnd) {
    if (n) {
      let d = e.pos + o.nodeSize, p = A.empty;
      for (let y = s.length - 1; y >= 0; y--)
        p = A.from(s[y].create(null, p));
      p = A.from(i.copy(p));
      let m = t.tr.step(new Fe(e.pos - 1, d, e.pos, d, new F(p, 1, 0), s.length, !0)), k = m.doc.resolve(d + 2 * s.length);
      k.nodeAfter && k.nodeAfter.type == i.type && qs(m.doc, k.pos) && m.join(k.pos), n(m.scrollIntoView());
    }
    return !0;
  }
  let c = o.type.spec.isolating || r > 0 && a ? null : ee.findFrom(e, 1), f = c && c.$from.blockRange(c.$to), h = f && js(f);
  if (h != null && h >= e.depth)
    return n && n(t.tr.lift(f, h).scrollIntoView()), !0;
  if (u && ai(o, "start", !0) && ai(i, "end")) {
    let d = i, p = [];
    for (; p.push(d), !d.isTextblock; )
      d = d.lastChild;
    let m = o, k = 1;
    for (; !m.isTextblock; m = m.firstChild)
      k++;
    if (d.canReplace(d.childCount, d.childCount, m.content)) {
      if (n) {
        let y = A.empty;
        for (let T = p.length - 1; T >= 0; T--)
          y = A.from(p[T].copy(y));
        let O = t.tr.step(new Fe(e.pos - p.length, e.pos + o.nodeSize, e.pos + k, e.pos + o.nodeSize - k, new F(y, p.length, 0), 0, !0));
        n(O.scrollIntoView());
      }
      return !0;
    }
  }
  return !1;
}
function dp(t) {
  return function(e, n) {
    let r = e.selection, i = t < 0 ? r.$from : r.$to, o = i.depth;
    for (; i.node(o).isInline; ) {
      if (!o)
        return !1;
      o--;
    }
    return i.node(o).isTextblock ? (n && n(e.tr.setSelection(Z.create(e.doc, t < 0 ? i.start(o) : i.end(o)))), !0) : !1;
  };
}
const fw = dp(-1), hw = dp(1);
function su(t, e = null) {
  return function(n, r) {
    let { $from: i, $to: o } = n.selection, s = i.blockRange(o), l = s && tu(s, t, e);
    return l ? (r && r(n.tr.wrap(s, l).scrollIntoView()), !0) : !1;
  };
}
function un(t, e = null) {
  return function(n, r) {
    let i = !1;
    for (let o = 0; o < n.selection.ranges.length && !i; o++) {
      let { $from: { pos: s }, $to: { pos: l } } = n.selection.ranges[o];
      n.doc.nodesBetween(s, l, (a, u) => {
        if (i)
          return !1;
        if (!(!a.isTextblock || a.hasMarkup(t, e)))
          if (a.type == t)
            i = !0;
          else {
            let c = n.doc.resolve(u), f = c.index();
            i = c.parent.canReplaceWith(f, f + 1, t);
          }
      });
    }
    if (!i)
      return !1;
    if (r) {
      let o = n.tr;
      for (let s = 0; s < n.selection.ranges.length; s++) {
        let { $from: { pos: l }, $to: { pos: a } } = n.selection.ranges[s];
        o.setBlockType(l, a, t, e);
      }
      r(o.scrollIntoView());
    }
    return !0;
  };
}
function dw(t, e, n, r) {
  for (let i = 0; i < e.length; i++) {
    let { $from: o, $to: s } = e[i], l = o.depth == 0 ? t.inlineContent && t.type.allowsMarkType(n) : !1;
    if (t.nodesBetween(o.pos, s.pos, (a, u) => {
      if (l)
        return !1;
      l = a.inlineContent && a.type.allowsMarkType(n);
    }), l)
      return !0;
  }
  return !1;
}
function No(t, e = null, n) {
  return function(r, i) {
    let { empty: o, $cursor: s, ranges: l } = r.selection;
    if (o && !s || !dw(r.doc, l, t))
      return !1;
    if (i)
      if (s)
        t.isInSet(r.storedMarks || s.marks()) ? i(r.tr.removeStoredMark(t)) : i(r.tr.addStoredMark(t.create(e)));
      else {
        let a, u = r.tr;
        a = !l.some((c) => r.doc.rangeHasMark(c.$from.pos, c.$to.pos, t));
        for (let c = 0; c < l.length; c++) {
          let { $from: f, $to: h } = l[c];
          if (!a)
            u.removeMark(f.pos, h.pos, t);
          else {
            let d = f.pos, p = h.pos, m = f.nodeAfter, k = h.nodeBefore, y = m && m.isText ? /^\s*/.exec(m.text)[0].length : 0, O = k && k.isText ? /\s*$/.exec(k.text)[0].length : 0;
            d + y < p && (d += y, p -= O), u.addMark(d, p, t.create(e));
          }
        }
        i(u.scrollIntoView());
      }
    return !0;
  };
}
function mi(...t) {
  return function(e, n, r) {
    for (let i = 0; i < t.length; i++)
      if (t[i](e, n, r))
        return !0;
    return !1;
  };
}
let Ml = mi(ru, up, cp), Lf = mi(ru, tw, nw);
const en = {
  Enter: mi(rw, ow, sw, aw),
  "Mod-Enter": iw,
  Backspace: Ml,
  "Mod-Backspace": Ml,
  "Shift-Backspace": Ml,
  Delete: Lf,
  "Mod-Delete": Lf,
  "Mod-a": uw
}, pp = {
  "Ctrl-h": en.Backspace,
  "Alt-Backspace": en["Mod-Backspace"],
  "Ctrl-d": en.Delete,
  "Ctrl-Alt-Backspace": en["Mod-Delete"],
  "Alt-Delete": en["Mod-Delete"],
  "Alt-d": en["Mod-Delete"],
  "Ctrl-a": fw,
  "Ctrl-e": hw
};
for (let t in en)
  pp[t] = en[t];
const pw = typeof navigator < "u" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : typeof os < "u" && os.platform ? os.platform() == "darwin" : !1, mw = pw ? pp : en;
class mt {
  /**
  Create an input rule. The rule applies when the user typed
  something and the text directly in front of the cursor matches
  `match`, which should end with `$`.
  
  The `handler` can be a string, in which case the matched text, or
  the first matched group in the regexp, is replaced by that
  string.
  
  Or a it can be a function, which will be called with the match
  array produced by
  [`RegExp.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec),
  as well as the start and end of the matched range, and which can
  return a [transaction](https://prosemirror.net/docs/ref/#state.Transaction) that describes the
  rule's effect, or null to indicate the input was not handled.
  */
  constructor(e, n, r = {}) {
    this.match = e, this.match = e, this.handler = typeof n == "string" ? gw(n) : n, this.undoable = r.undoable !== !1, this.inCode = r.inCode || !1, this.inCodeMark = r.inCodeMark !== !1;
  }
}
function gw(t) {
  return function(e, n, r, i) {
    let o = t;
    if (n[1]) {
      let s = n[0].lastIndexOf(n[1]);
      o += n[0].slice(s + n[1].length), r += s;
      let l = r - i;
      l > 0 && (o = n[0].slice(s - l, s) + o, r = i);
    }
    return e.tr.insertText(o, r, i);
  };
}
const yw = (t, e) => {
  let n = t.plugins;
  for (let r = 0; r < n.length; r++) {
    let i = n[r], o;
    if (i.spec.isInputRules && (o = i.getState(t))) {
      if (e) {
        let s = t.tr, l = o.transform;
        for (let a = l.steps.length - 1; a >= 0; a--)
          s.step(l.steps[a].invert(l.docs[a]));
        if (o.text) {
          let a = s.doc.resolve(o.from).marks();
          s.replaceWith(o.from, o.to, t.schema.text(o.text, a));
        } else
          s.delete(o.from, o.to);
        e(s);
      }
      return !0;
    }
  }
  return !1;
};
new mt(/--$/, "—", { inCodeMark: !1 });
new mt(/\.\.\.$/, "…", { inCodeMark: !1 });
new mt(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(")$/, "“", { inCodeMark: !1 });
new mt(/"$/, "”", { inCodeMark: !1 });
new mt(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(')$/, "‘", { inCodeMark: !1 });
new mt(/'$/, "’", { inCodeMark: !1 });
function lu(t, e, n = null, r) {
  return new mt(t, (i, o, s, l) => {
    let a = n instanceof Function ? n(o) : n, u = i.tr.delete(s, l), c = u.doc.resolve(s), f = c.blockRange(), h = f && tu(f, e, a);
    if (!h)
      return null;
    u.wrap(f, h);
    let d = u.doc.resolve(s - 1).nodeBefore;
    return d && d.type == e && qs(u.doc, s - 1) && (!r || r(o, d)) && u.join(s - 1), u;
  });
}
function mp(t, e, n = null) {
  return new mt(t, (r, i, o, s) => {
    let l = r.doc.resolve(o), a = n instanceof Function ? n(i) : n;
    return l.node(-1).canReplaceWith(l.index(-1), l.indexAfter(-1), e) ? r.tr.delete(o, s).setBlockType(o, o, e, a) : null;
  });
}
const Hn = typeof navigator < "u" ? navigator : null, zf = typeof document < "u" ? document : null, Wn = Hn && Hn.userAgent || "", ba = /Edge\/(\d+)/.exec(Wn), gp = /MSIE \d/.exec(Wn), wa = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(Wn), au = !!(gp || wa || ba);
gp ? document.documentMode : wa ? +wa[1] : ba && +ba[1];
const kw = !au && /gecko\/(\d+)/i.test(Wn);
kw && +(/Firefox\/(\d+)/.exec(Wn) || [0, 0])[1];
const xa = !au && /Chrome\/(\d+)/.exec(Wn), bw = !!xa;
xa && +xa[1];
const ww = !au && !!Hn && /Apple Computer/.test(Hn.vendor), xw = ww && (/Mobile\/\w+/.test(Wn) || !!Hn && Hn.maxTouchPoints > 2);
xw || Hn && /Mac/.test(Hn.platform);
const Cw = /Android \d/.test(Wn), Sw = !!zf && "webkitFontSmoothing" in zf.documentElement.style;
Sw && +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1];
function Nl(t, e, n, r, i, o) {
  if (t.composing) return !1;
  const s = t.state, l = s.doc.resolve(e);
  if (l.parent.type.spec.code) return !1;
  const a = l.parent.textBetween(
    Math.max(0, l.parentOffset - 500),
    l.parentOffset,
    void 0,
    "￼"
  ) + r;
  for (let u of i) {
    const c = u, f = c.match.exec(a), h = f && f[0] && c.handler(s, f, e - (f[0].length - r.length), n);
    if (h)
      return c.undoable !== !1 && h.setMeta(o, { transform: h, from: e, to: n, text: r }), t.dispatch(h), !0;
  }
  return !1;
}
const Mw = new Ve("MILKDOWN_CUSTOM_INPUTRULES");
function Nw({ rules: t }) {
  const e = new Ee({
    key: Mw,
    isInputRules: !0,
    state: {
      init() {
        return null;
      },
      apply(n, r) {
        const i = n.getMeta(this);
        return i || (n.selectionSet || n.docChanged ? null : r);
      }
    },
    props: {
      handleTextInput(n, r, i, o) {
        return Nl(n, r, i, o, t, e);
      },
      handleDOMEvents: {
        compositionend: (n) => (setTimeout(() => {
          const { $cursor: r } = n.state.selection;
          r && Nl(n, r.pos, r.pos, "", t, e);
        }), !1),
        keydown: (n, r) => !(Cw && bw && r.key === "Enter") || n.composing ? !1 : n.someProp(
          "handleKeyDown",
          (i) => i(n, r)
        ) ? (r.preventDefault(), !0) : !1
      },
      handleKeyDown(n, r) {
        if (r.key !== "Enter") return !1;
        const { $cursor: i } = n.state.selection;
        return i ? Nl(n, i.pos, i.pos, `
`, t, e) : !1;
      }
    }
  });
  return e;
}
function To(t, e, n = {}) {
  return new mt(t, (r, i, o, s) => {
    var l, a, u, c;
    const { tr: f } = r, h = i.length;
    let d = i[h - 1], p = i[0], m = [], k;
    const y = {
      group: d,
      fullMatch: p,
      start: o,
      end: s
    }, O = (l = n.updateCaptured) == null ? void 0 : l.call(n, y);
    if (Object.assign(y, O), { group: d, fullMatch: p, start: o, end: s } = y, p === null || (d == null ? void 0 : d.trim()) === "") return null;
    if (d) {
      const T = p.search(/\S/), V = o + p.indexOf(d), _ = V + d.length;
      m = (a = f.storedMarks) != null ? a : [], _ < s && f.delete(_, s), V > o && f.delete(o + T, V), k = o + T + d.length;
      const S = (u = n.getAttr) == null ? void 0 : u.call(n, i);
      f.addMark(o, k, e.create(S)), f.setStoredMarks(m), (c = n.beforeDispatch) == null || c.call(n, { match: i, start: o, end: s, tr: f });
    }
    return f;
  });
}
function yp(t) {
  return Object.assign(Object.create(t), t).setTime(Date.now());
}
function Tw(t, e) {
  return Array.isArray(t) && t.includes(e.type) || e.type === t;
}
function vw(t) {
  return (e) => {
    for (let n = e.depth; n > 0; n -= 1) {
      const r = e.node(n);
      if (t(r)) {
        const i = e.before(n), o = e.after(n);
        return {
          from: i,
          to: o,
          node: r
        };
      }
    }
  };
}
function Iw(t, e) {
  return vw((n) => n.type === e)(t);
}
function Ew(t) {
  return (e) => {
    for (let n = e.depth; n > 0; n--) {
      const r = e.node(n);
      if (t(r))
        return {
          pos: e.before(n),
          start: e.start(n),
          depth: n,
          node: r
        };
    }
  };
}
function Aw(t, e) {
  if (!(t instanceof Q)) return;
  const { node: n, $from: r } = t;
  if (Tw(e, n))
    return {
      node: n,
      pos: r.pos,
      start: r.start(r.depth),
      depth: r.depth
    };
}
const Ow = (t, e) => {
  const { selection: n, doc: r } = t;
  if (n instanceof Q)
    return {
      hasNode: n.node.type === e,
      pos: n.from,
      target: n.node
    };
  const { from: i, to: o } = n;
  let s = !1, l = -1, a = null;
  return r.nodesBetween(i, o, (u, c) => a ? !1 : u.type === e ? (s = !0, l = c, a = u, !1) : !0), {
    hasNode: s,
    pos: l,
    target: a
  };
};
var jn = {
  8: "Backspace",
  9: "Tab",
  10: "Enter",
  12: "NumLock",
  13: "Enter",
  16: "Shift",
  17: "Control",
  18: "Alt",
  20: "CapsLock",
  27: "Escape",
  32: " ",
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  44: "PrintScreen",
  45: "Insert",
  46: "Delete",
  59: ";",
  61: "=",
  91: "Meta",
  92: "Meta",
  106: "*",
  107: "+",
  108: ",",
  109: "-",
  110: ".",
  111: "/",
  144: "NumLock",
  145: "ScrollLock",
  160: "Shift",
  161: "Shift",
  162: "Control",
  163: "Control",
  164: "Alt",
  165: "Alt",
  173: "-",
  186: ";",
  187: "=",
  188: ",",
  189: "-",
  190: ".",
  191: "/",
  192: "`",
  219: "[",
  220: "\\",
  221: "]",
  222: "'"
}, Ms = {
  48: ")",
  49: "!",
  50: "@",
  51: "#",
  52: "$",
  53: "%",
  54: "^",
  55: "&",
  56: "*",
  57: "(",
  59: ":",
  61: "+",
  173: "_",
  186: ":",
  187: "+",
  188: "<",
  189: "_",
  190: ">",
  191: "?",
  192: "~",
  219: "{",
  220: "|",
  221: "}",
  222: '"'
}, Dw = typeof navigator < "u" && /Mac/.test(navigator.platform), Rw = typeof navigator < "u" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
for (var De = 0; De < 10; De++) jn[48 + De] = jn[96 + De] = String(De);
for (var De = 1; De <= 24; De++) jn[De + 111] = "F" + De;
for (var De = 65; De <= 90; De++)
  jn[De] = String.fromCharCode(De + 32), Ms[De] = String.fromCharCode(De);
for (var Tl in jn) Ms.hasOwnProperty(Tl) || (Ms[Tl] = jn[Tl]);
function Lw(t) {
  var e = Dw && t.metaKey && t.shiftKey && !t.ctrlKey && !t.altKey || Rw && t.shiftKey && t.key && t.key.length == 1 || t.key == "Unidentified", n = !e && t.key || (t.shiftKey ? Ms : jn)[t.keyCode] || t.key || "Unidentified";
  return n == "Esc" && (n = "Escape"), n == "Del" && (n = "Delete"), n == "Left" && (n = "ArrowLeft"), n == "Up" && (n = "ArrowUp"), n == "Right" && (n = "ArrowRight"), n == "Down" && (n = "ArrowDown"), n;
}
const zw = typeof navigator < "u" && /Mac|iP(hone|[oa]d)/.test(navigator.platform), Pw = typeof navigator < "u" && /Win/.test(navigator.platform);
function Bw(t) {
  let e = t.split(/-(?!$)/), n = e[e.length - 1];
  n == "Space" && (n = " ");
  let r, i, o, s;
  for (let l = 0; l < e.length - 1; l++) {
    let a = e[l];
    if (/^(cmd|meta|m)$/i.test(a))
      s = !0;
    else if (/^a(lt)?$/i.test(a))
      r = !0;
    else if (/^(c|ctrl|control)$/i.test(a))
      i = !0;
    else if (/^s(hift)?$/i.test(a))
      o = !0;
    else if (/^mod$/i.test(a))
      zw ? s = !0 : i = !0;
    else
      throw new Error("Unrecognized modifier name: " + a);
  }
  return r && (n = "Alt-" + n), i && (n = "Ctrl-" + n), s && (n = "Meta-" + n), o && (n = "Shift-" + n), n;
}
function Fw(t) {
  let e = /* @__PURE__ */ Object.create(null);
  for (let n in t)
    e[Bw(n)] = t[n];
  return e;
}
function vl(t, e, n = !0) {
  return e.altKey && (t = "Alt-" + t), e.ctrlKey && (t = "Ctrl-" + t), e.metaKey && (t = "Meta-" + t), n && e.shiftKey && (t = "Shift-" + t), t;
}
function kp(t) {
  return new Ee({ props: { handleKeyDown: bp(t) } });
}
function bp(t) {
  let e = Fw(t);
  return function(n, r) {
    let i = Lw(r), o, s = e[vl(i, r)];
    if (s && s(n.state, n.dispatch, n))
      return !0;
    if (i.length == 1 && i != " ") {
      if (r.shiftKey) {
        let l = e[vl(i, r, !1)];
        if (l && l(n.state, n.dispatch, n))
          return !0;
      }
      if ((r.altKey || r.metaKey || r.ctrlKey) && // Ctrl-Alt may be used for AltGr on Windows
      !(Pw && r.ctrlKey && r.altKey) && (o = jn[r.keyCode]) && o != i) {
        let l = e[vl(o, r)];
        if (l && l(n.state, n.dispatch, n))
          return !0;
      }
    }
    return !1;
  };
}
var wp = class {
}, xp = class {
  constructor() {
    this.elements = [], this.size = () => this.elements.length, this.top = () => this.elements.at(-1), this.push = (t) => {
      var e;
      (e = this.top()) == null || e.push(t);
    }, this.open = (t) => {
      this.elements.push(t);
    }, this.close = () => {
      const t = this.elements.pop();
      if (!t) throw Qh();
      return t;
    };
  }
}, $w = class Cp extends wp {
  constructor(e, n, r) {
    super(), this.type = e, this.content = n, this.attrs = r;
  }
  push(e, ...n) {
    this.content.push(e, ...n);
  }
  pop() {
    return this.content.pop();
  }
  static create(e, n, r) {
    return new Cp(e, n, r);
  }
}, At, Jr, uo, co, fo, Gr, Yr, dr, _w = (dr = class extends xp {
  constructor(n) {
    super();
    j(this, At);
    j(this, Jr);
    j(this, uo);
    j(this, co);
    j(this, fo);
    j(this, Gr);
    j(this, Yr);
    z(this, At, ue.none), z(this, Jr, (r) => r.isText), z(this, uo, (r, i) => {
      if (M(this, Jr).call(this, r) && M(this, Jr).call(this, i) && ue.sameSet(r.marks, i.marks)) return this.schema.text(r.text + i.text, r.marks);
    }), z(this, co, (r) => {
      const i = Object.values({
        ...this.schema.nodes,
        ...this.schema.marks
      }).find((o) => o.spec.parseMarkdown.match(r));
      if (!i) throw ky(r);
      return i;
    }), z(this, fo, (r) => {
      const i = M(this, co).call(this, r);
      i.spec.parseMarkdown.runner(this, r, i);
    }), this.injectRoot = (r, i, o) => (this.openNode(i, o), this.next(r.children), this), this.openNode = (r, i) => (this.open($w.create(r, [], i)), this), z(this, Gr, () => {
      z(this, At, ue.none);
      const r = this.close();
      return M(this, Yr).call(this, r.type, r.attrs, r.content);
    }), this.closeNode = () => {
      try {
        M(this, Gr).call(this);
      } catch (r) {
        console.error(r);
      }
      return this;
    }, z(this, Yr, (r, i, o) => {
      const s = r.createAndFill(i, o, M(this, At));
      if (!s) throw yy(r, i, o);
      return this.push(s), s;
    }), this.addNode = (r, i, o) => {
      try {
        M(this, Yr).call(this, r, i, o);
      } catch (s) {
        console.error(s);
      }
      return this;
    }, this.openMark = (r, i) => {
      const o = r.create(i);
      return z(this, At, o.addToSet(M(this, At))), this;
    }, this.closeMark = (r) => (z(this, At, r.removeFromSet(M(this, At))), this), this.addText = (r) => {
      try {
        const i = this.top();
        if (!i) throw Qh();
        const o = i.pop(), s = this.schema.text(r, M(this, At));
        if (!o)
          return i.push(s), this;
        const l = M(this, uo).call(this, o, s);
        return l ? (i.push(l), this) : (i.push(o, s), this);
      } catch (i) {
        return console.error(i), this;
      }
    }, this.build = () => {
      let r;
      do
        r = M(this, Gr).call(this);
      while (this.size());
      return r;
    }, this.next = (r = []) => ([r].flat().forEach((i) => M(this, fo).call(this, i)), this), this.toDoc = () => this.build(), this.run = (r, i) => {
      const o = r.runSync(r.parse(i), i);
      return this.next(o), this;
    }, this.schema = n;
  }
}, At = new WeakMap(), Jr = new WeakMap(), uo = new WeakMap(), co = new WeakMap(), fo = new WeakMap(), Gr = new WeakMap(), Yr = new WeakMap(), dr.create = (n, r) => {
  const i = new dr(n);
  return (o) => (i.run(r, o), i.toDoc());
}, dr), pr, Pf = (pr = class extends wp {
  constructor(e, n, r, i = {}) {
    super(), this.type = e, this.children = n, this.value = r, this.props = i, this.push = (o, ...s) => {
      this.children || (this.children = []), this.children.push(o, ...s);
    }, this.pop = () => {
      var o;
      return (o = this.children) == null ? void 0 : o.pop();
    };
  }
}, pr.create = (e, n, r, i = {}) => new pr(e, n, r, i), pr), Vw = (t) => Object.prototype.hasOwnProperty.call(t, "size"), $t, Qr, ho, po, Xr, mo, Zr, go, yo, Zn, Dn, ko, ei, mr, Hw = (mr = class extends xp {
  constructor(n) {
    super();
    j(this, $t);
    j(this, Qr);
    j(this, ho);
    j(this, po);
    j(this, Xr);
    j(this, mo);
    j(this, Zr);
    j(this, go);
    j(this, yo);
    j(this, Zn);
    j(this, Dn);
    j(this, ko);
    j(this, ei);
    z(this, $t, ue.none), z(this, Qr, (r) => {
      const i = Object.values({
        ...this.schema.nodes,
        ...this.schema.marks
      }).find((o) => o.spec.toMarkdown.match(r));
      if (!i) throw by(r.type);
      return i;
    }), z(this, ho, (r) => M(this, Qr).call(this, r).spec.toMarkdown.runner(this, r)), z(this, po, (r, i) => M(this, Qr).call(this, r).spec.toMarkdown.runner(this, r, i)), z(this, Xr, (r) => {
      const { marks: i } = r, o = (s) => s.type.spec.priority ?? 50;
      [...i].sort((s, l) => o(s) - o(l)).every((s) => !M(this, po).call(this, s, r)) && M(this, ho).call(this, r), i.forEach((s) => M(this, ei).call(this, s));
    }), z(this, mo, (r, i) => {
      var u;
      if (r.type === i || ((u = r.children) == null ? void 0 : u.length) !== 1) return r;
      const o = (c) => {
        var h;
        if (c.type === i) return c.value != null ? null : c;
        if (((h = c.children) == null ? void 0 : h.length) !== 1) return null;
        const [f] = c.children;
        return f ? o(f) : null;
      }, s = o(r);
      if (!s) return r;
      const l = s.children ? [...s.children] : void 0, a = {
        ...r,
        children: l
      };
      return a.children = l, s.children = [a], s;
    }), z(this, Zr, (r) => {
      const { children: i } = r;
      return i && (r.children = i.reduce((o, s, l) => {
        if (l === 0) return [s];
        const a = o.at(-1);
        if (a && a.isMark && s.isMark) {
          s = M(this, mo).call(this, s, a.type);
          const { children: u, ...c } = s, { children: f, ...h } = a;
          if (s.type === a.type && u && f && JSON.stringify(c) === JSON.stringify(h)) {
            const d = {
              ...h,
              children: [...f, ...u]
            };
            return o.slice(0, -1).concat(M(this, Zr).call(this, d));
          }
        }
        return o.concat(s);
      }, [])), r;
    }), z(this, go, (r) => {
      const i = {
        ...r.props,
        type: r.type
      };
      return r.children && (i.children = r.children), r.value && (i.value = r.value), i;
    }), this.openNode = (r, i, o) => (this.open(Pf.create(r, void 0, i, o)), this), z(this, yo, (r, i) => {
      let o = "", s = "";
      const l = r.children;
      let a = -1, u = -1;
      const c = (h) => {
        h && h.forEach((d, p) => {
          d.type === "text" && d.value && (a < 0 && (a = p), u = p);
        });
      };
      if (l) {
        c(l);
        const h = l == null ? void 0 : l[u], d = l == null ? void 0 : l[a];
        if (h && h.value.endsWith(" ")) {
          const p = h.value, m = p.trimEnd();
          s = p.slice(m.length), h.value = m;
        }
        if (d && d.value.startsWith(" ")) {
          const p = d.value, m = p.trimStart();
          o = p.slice(0, p.length - m.length), d.value = m;
        }
      }
      o.length && M(this, Dn).call(this, "text", void 0, o);
      const f = i();
      return s.length && M(this, Dn).call(this, "text", void 0, s), f;
    }), z(this, Zn, (r = !1) => {
      const i = this.close(), o = () => M(this, Dn).call(this, i.type, i.children, i.value, i.props);
      return r ? M(this, yo).call(this, i, o) : o();
    }), this.closeNode = () => (M(this, Zn).call(this), this), z(this, Dn, (r, i, o, s) => {
      const l = Pf.create(r, i, o, s), a = M(this, Zr).call(this, M(this, go).call(this, l));
      return this.push(a), a;
    }), this.addNode = (r, i, o, s) => (M(this, Dn).call(this, r, i, o, s), this), z(this, ko, (r, i, o, s) => r.isInSet(M(this, $t)) ? this : (z(this, $t, r.addToSet(M(this, $t))), this.openNode(i, o, {
      ...s,
      isMark: !0
    }))), z(this, ei, (r) => {
      r.isInSet(M(this, $t)) && (z(this, $t, r.type.removeFromSet(M(this, $t))), M(this, Zn).call(this, !0));
    }), this.withMark = (r, i, o, s) => (M(this, ko).call(this, r, i, o, s), this), this.closeMark = (r) => (M(this, ei).call(this, r), this), this.build = () => {
      let r = null;
      do
        r = M(this, Zn).call(this);
      while (this.size());
      return r;
    }, this.next = (r) => Vw(r) ? (r.forEach((i) => {
      M(this, Xr).call(this, i);
    }), this) : (M(this, Xr).call(this, r), this), this.toString = (r) => r.stringify(this.build()), this.run = (r) => (this.next(r), this), this.schema = n;
  }
}, $t = new WeakMap(), Qr = new WeakMap(), ho = new WeakMap(), po = new WeakMap(), Xr = new WeakMap(), mo = new WeakMap(), Zr = new WeakMap(), go = new WeakMap(), yo = new WeakMap(), Zn = new WeakMap(), Dn = new WeakMap(), ko = new WeakMap(), ei = new WeakMap(), mr.create = (n, r) => {
  const i = new mr(n);
  return (o) => (i.run(o), i.toString(r));
}, mr);
const Re = function(t) {
  for (var e = 0; ; e++)
    if (t = t.previousSibling, !t)
      return e;
}, ui = function(t) {
  let e = t.assignedSlot || t.parentNode;
  return e && e.nodeType == 11 ? e.host : e;
};
let Ca = null;
const Zt = function(t, e, n) {
  let r = Ca || (Ca = document.createRange());
  return r.setEnd(t, n ?? t.nodeValue.length), r.setStart(t, e || 0), r;
}, jw = function() {
  Ca = null;
}, br = function(t, e, n, r) {
  return n && (Bf(t, e, n, r, -1) || Bf(t, e, n, r, 1));
}, qw = /^(img|br|input|textarea|hr)$/i;
function Bf(t, e, n, r, i) {
  for (var o; ; ) {
    if (t == n && e == r)
      return !0;
    if (e == (i < 0 ? 0 : Mt(t))) {
      let s = t.parentNode;
      if (!s || s.nodeType != 1 || vo(t) || qw.test(t.nodeName) || t.contentEditable == "false")
        return !1;
      e = Re(t) + (i < 0 ? 0 : 1), t = s;
    } else if (t.nodeType == 1) {
      let s = t.childNodes[e + (i < 0 ? -1 : 0)];
      if (s.nodeType == 1 && s.contentEditable == "false")
        if (!((o = s.pmViewDesc) === null || o === void 0) && o.ignoreForSelection)
          e += i;
        else
          return !1;
      else
        t = s, e = i < 0 ? Mt(t) : 0;
    } else
      return !1;
  }
}
function Mt(t) {
  return t.nodeType == 3 ? t.nodeValue.length : t.childNodes.length;
}
function Ww(t, e) {
  for (; ; ) {
    if (t.nodeType == 3 && e)
      return t;
    if (t.nodeType == 1 && e > 0) {
      if (t.contentEditable == "false")
        return null;
      t = t.childNodes[e - 1], e = Mt(t);
    } else if (t.parentNode && !vo(t))
      e = Re(t), t = t.parentNode;
    else
      return null;
  }
}
function Kw(t, e) {
  for (; ; ) {
    if (t.nodeType == 3 && e < t.nodeValue.length)
      return t;
    if (t.nodeType == 1 && e < t.childNodes.length) {
      if (t.contentEditable == "false")
        return null;
      t = t.childNodes[e], e = 0;
    } else if (t.parentNode && !vo(t))
      e = Re(t) + 1, t = t.parentNode;
    else
      return null;
  }
}
function Uw(t, e, n) {
  for (let r = e == 0, i = e == Mt(t); r || i; ) {
    if (t == n)
      return !0;
    let o = Re(t);
    if (t = t.parentNode, !t)
      return !1;
    r = r && o == 0, i = i && o == Mt(t);
  }
}
function vo(t) {
  let e;
  for (let n = t; n && !(e = n.pmViewDesc); n = n.parentNode)
    ;
  return e && e.node && e.node.isBlock && (e.dom == t || e.contentDOM == t);
}
const Us = function(t) {
  return t.focusNode && br(t.focusNode, t.focusOffset, t.anchorNode, t.anchorOffset);
};
function Gn(t, e) {
  let n = document.createEvent("Event");
  return n.initEvent("keydown", !0, !0), n.keyCode = t, n.key = n.code = e, n;
}
function Jw(t) {
  let e = t.activeElement;
  for (; e && e.shadowRoot; )
    e = e.shadowRoot.activeElement;
  return e;
}
function Gw(t, e, n) {
  if (t.caretPositionFromPoint)
    try {
      let r = t.caretPositionFromPoint(e, n);
      if (r)
        return { node: r.offsetNode, offset: Math.min(Mt(r.offsetNode), r.offset) };
    } catch {
    }
  if (t.caretRangeFromPoint) {
    let r = t.caretRangeFromPoint(e, n);
    if (r)
      return { node: r.startContainer, offset: Math.min(Mt(r.startContainer), r.startOffset) };
  }
}
const Vt = typeof navigator < "u" ? navigator : null, Ff = typeof document < "u" ? document : null, Kn = Vt && Vt.userAgent || "", Sa = /Edge\/(\d+)/.exec(Kn), Sp = /MSIE \d/.exec(Kn), Ma = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(Kn), it = !!(Sp || Ma || Sa), Bn = Sp ? document.documentMode : Ma ? +Ma[1] : Sa ? +Sa[1] : 0, Nt = !it && /gecko\/(\d+)/i.test(Kn);
Nt && +(/Firefox\/(\d+)/.exec(Kn) || [0, 0])[1];
const Na = !it && /Chrome\/(\d+)/.exec(Kn), Le = !!Na, Mp = Na ? +Na[1] : 0, $e = !it && !!Vt && /Apple Computer/.test(Vt.vendor), ci = $e && (/Mobile\/\w+/.test(Kn) || !!Vt && Vt.maxTouchPoints > 2), Ct = ci || (Vt ? /Mac/.test(Vt.platform) : !1), Np = Vt ? /Win/.test(Vt.platform) : !1, cn = /Android \d/.test(Kn), Io = !!Ff && "webkitFontSmoothing" in Ff.documentElement.style, Yw = Io ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0;
function Qw(t) {
  let e = t.defaultView && t.defaultView.visualViewport;
  return e ? {
    left: 0,
    right: e.width,
    top: 0,
    bottom: e.height
  } : {
    left: 0,
    right: t.documentElement.clientWidth,
    top: 0,
    bottom: t.documentElement.clientHeight
  };
}
function Yt(t, e) {
  return typeof t == "number" ? t : t[e];
}
function Xw(t) {
  let e = t.getBoundingClientRect(), n = e.width / t.offsetWidth || 1, r = e.height / t.offsetHeight || 1;
  return {
    left: e.left,
    right: e.left + t.clientWidth * n,
    top: e.top,
    bottom: e.top + t.clientHeight * r
  };
}
function $f(t, e, n) {
  let r = t.someProp("scrollThreshold") || 0, i = t.someProp("scrollMargin") || 5, o = t.dom.ownerDocument;
  for (let s = n || t.dom; s; ) {
    if (s.nodeType != 1) {
      s = ui(s);
      continue;
    }
    let l = s, a = l == o.body, u = a ? Qw(o) : Xw(l), c = 0, f = 0;
    if (e.top < u.top + Yt(r, "top") ? f = -(u.top - e.top + Yt(i, "top")) : e.bottom > u.bottom - Yt(r, "bottom") && (f = e.bottom - e.top > u.bottom - u.top ? e.top + Yt(i, "top") - u.top : e.bottom - u.bottom + Yt(i, "bottom")), e.left < u.left + Yt(r, "left") ? c = -(u.left - e.left + Yt(i, "left")) : e.right > u.right - Yt(r, "right") && (c = e.right - u.right + Yt(i, "right")), c || f)
      if (a)
        o.defaultView.scrollBy(c, f);
      else {
        let d = l.scrollLeft, p = l.scrollTop;
        f && (l.scrollTop += f), c && (l.scrollLeft += c);
        let m = l.scrollLeft - d, k = l.scrollTop - p;
        e = { left: e.left - m, top: e.top - k, right: e.right - m, bottom: e.bottom - k };
      }
    let h = a ? "fixed" : getComputedStyle(s).position;
    if (/^(fixed|sticky)$/.test(h))
      break;
    s = h == "absolute" ? s.offsetParent : ui(s);
  }
}
function Zw(t) {
  let e = t.dom.getBoundingClientRect(), n = Math.max(0, e.top), r, i;
  for (let o = (e.left + e.right) / 2, s = n + 1; s < Math.min(innerHeight, e.bottom); s += 5) {
    let l = t.root.elementFromPoint(o, s);
    if (!l || l == t.dom || !t.dom.contains(l))
      continue;
    let a = l.getBoundingClientRect();
    if (a.top >= n - 20) {
      r = l, i = a.top;
      break;
    }
  }
  return { refDOM: r, refTop: i, stack: Tp(t.dom) };
}
function Tp(t) {
  let e = [], n = t.ownerDocument;
  for (let r = t; r && (e.push({ dom: r, top: r.scrollTop, left: r.scrollLeft }), t != n); r = ui(r))
    ;
  return e;
}
function ex({ refDOM: t, refTop: e, stack: n }) {
  let r = t ? t.getBoundingClientRect().top : 0;
  vp(n, r == 0 ? 0 : r - e);
}
function vp(t, e) {
  for (let n = 0; n < t.length; n++) {
    let { dom: r, top: i, left: o } = t[n];
    r.scrollTop != i + e && (r.scrollTop = i + e), r.scrollLeft != o && (r.scrollLeft = o);
  }
}
let vr = null;
function tx(t) {
  if (t.setActive)
    return t.setActive();
  if (vr)
    return t.focus(vr);
  let e = Tp(t);
  t.focus(vr == null ? {
    get preventScroll() {
      return vr = { preventScroll: !0 }, !0;
    }
  } : void 0), vr || (vr = !1, vp(e, 0));
}
function Ip(t, e) {
  let n, r = 2e8, i, o = 0, s = e.top, l = e.top, a, u;
  for (let c = t.firstChild, f = 0; c; c = c.nextSibling, f++) {
    let h;
    if (c.nodeType == 1)
      h = c.getClientRects();
    else if (c.nodeType == 3)
      h = Zt(c).getClientRects();
    else
      continue;
    for (let d = 0; d < h.length; d++) {
      let p = h[d];
      if (p.top <= s && p.bottom >= l) {
        s = Math.max(p.bottom, s), l = Math.min(p.top, l);
        let m = p.left > e.left ? p.left - e.left : p.right < e.left ? e.left - p.right : 0;
        if (m < r) {
          n = c, r = m, i = m && n.nodeType == 3 ? {
            left: p.right < e.left ? p.right : p.left,
            top: e.top
          } : e, c.nodeType == 1 && m && (o = f + (e.left >= (p.left + p.right) / 2 ? 1 : 0));
          continue;
        }
      } else p.top > e.top && !a && p.left <= e.left && p.right >= e.left && (a = c, u = { left: Math.max(p.left, Math.min(p.right, e.left)), top: p.top });
      !n && (e.left >= p.right && e.top >= p.top || e.left >= p.left && e.top >= p.bottom) && (o = f + 1);
    }
  }
  return !n && a && (n = a, i = u, r = 0), n && n.nodeType == 3 ? nx(n, i) : !n || r && n.nodeType == 1 ? { node: t, offset: o } : Ip(n, i);
}
function nx(t, e) {
  let n = t.nodeValue.length, r = document.createRange(), i;
  for (let o = 0; o < n; o++) {
    r.setEnd(t, o + 1), r.setStart(t, o);
    let s = Mn(r, 1);
    if (s.top != s.bottom && uu(e, s)) {
      i = { node: t, offset: o + (e.left >= (s.left + s.right) / 2 ? 1 : 0) };
      break;
    }
  }
  return r.detach(), i || { node: t, offset: 0 };
}
function uu(t, e) {
  return t.left >= e.left - 1 && t.left <= e.right + 1 && t.top >= e.top - 1 && t.top <= e.bottom + 1;
}
function rx(t, e) {
  let n = t.parentNode;
  return n && /^li$/i.test(n.nodeName) && e.left < t.getBoundingClientRect().left ? n : t;
}
function ix(t, e, n) {
  let { node: r, offset: i } = Ip(e, n), o = -1;
  if (r.nodeType == 1 && !r.firstChild) {
    let s = r.getBoundingClientRect();
    o = s.left != s.right && n.left > (s.left + s.right) / 2 ? 1 : -1;
  }
  return t.docView.posFromDOM(r, i, o);
}
function ox(t, e, n, r) {
  let i = -1;
  for (let o = e, s = !1; o != t.dom; ) {
    let l = t.docView.nearestDesc(o, !0), a;
    if (!l)
      return null;
    if (l.dom.nodeType == 1 && (l.node.isBlock && l.parent || !l.contentDOM) && // Ignore elements with zero-size bounding rectangles
    ((a = l.dom.getBoundingClientRect()).width || a.height) && (l.node.isBlock && l.parent && !/^T(R|BODY|HEAD|FOOT)$/.test(l.dom.nodeName) && (!s && a.left > r.left || a.top > r.top ? i = l.posBefore : (!s && a.right < r.left || a.bottom < r.top) && (i = l.posAfter), s = !0), !l.contentDOM && i < 0 && !l.node.isText))
      return (l.node.isBlock ? r.top < (a.top + a.bottom) / 2 : r.left < (a.left + a.right) / 2) ? l.posBefore : l.posAfter;
    o = l.dom.parentNode;
  }
  return i > -1 ? i : t.docView.posFromDOM(e, n, -1);
}
function Ep(t, e, n) {
  let r = t.childNodes.length;
  if (r && n.top < n.bottom)
    for (let i = Math.max(0, Math.min(r - 1, Math.floor(r * (e.top - n.top) / (n.bottom - n.top)) - 2)), o = i; ; ) {
      let s = t.childNodes[o];
      if (s.nodeType == 1) {
        let l = s.getClientRects();
        for (let a = 0; a < l.length; a++) {
          let u = l[a];
          if (uu(e, u))
            return Ep(s, e, u);
        }
      }
      if ((o = (o + 1) % r) == i)
        break;
    }
  return t;
}
function sx(t, e) {
  let n = t.dom.ownerDocument, r, i = 0, o = Gw(n, e.left, e.top);
  o && ({ node: r, offset: i } = o);
  let s = (t.root.elementFromPoint ? t.root : n).elementFromPoint(e.left, e.top), l;
  if (!s || !t.dom.contains(s.nodeType != 1 ? s.parentNode : s)) {
    let u = t.dom.getBoundingClientRect();
    if (!uu(e, u) || (s = Ep(t.dom, e, u), !s))
      return null;
  }
  if ($e)
    for (let u = s; r && u; u = ui(u))
      u.draggable && (r = void 0);
  if (s = rx(s, e), r) {
    if (Nt && r.nodeType == 1 && (i = Math.min(i, r.childNodes.length), i < r.childNodes.length)) {
      let c = r.childNodes[i], f;
      c.nodeName == "IMG" && (f = c.getBoundingClientRect()).right <= e.left && f.bottom > e.top && i++;
    }
    let u;
    Io && i && r.nodeType == 1 && (u = r.childNodes[i - 1]).nodeType == 1 && u.contentEditable == "false" && u.getBoundingClientRect().top >= e.top && i--, r == t.dom && i == r.childNodes.length - 1 && r.lastChild.nodeType == 1 && e.top > r.lastChild.getBoundingClientRect().bottom ? l = t.state.doc.content.size : (i == 0 || r.nodeType != 1 || r.childNodes[i - 1].nodeName != "BR") && (l = ox(t, r, i, e));
  }
  l == null && (l = ix(t, s, e));
  let a = t.docView.nearestDesc(s, !0);
  return { pos: l, inside: a ? a.posAtStart - a.border : -1 };
}
function _f(t) {
  return t.top < t.bottom || t.left < t.right;
}
function Mn(t, e) {
  let n = t.getClientRects();
  if (n.length) {
    let r = n[e < 0 ? 0 : n.length - 1];
    if (_f(r))
      return r;
  }
  return Array.prototype.find.call(n, _f) || t.getBoundingClientRect();
}
const lx = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
function Ap(t, e, n) {
  let { node: r, offset: i, atom: o } = t.docView.domFromPos(e, n < 0 ? -1 : 1), s = Io || Nt;
  if (r.nodeType == 3)
    if (s && (lx.test(r.nodeValue) || (n < 0 ? !i : i == r.nodeValue.length))) {
      let a = Mn(Zt(r, i, i), n);
      if (Nt && i && /\s/.test(r.nodeValue[i - 1]) && i < r.nodeValue.length) {
        let u = Mn(Zt(r, i - 1, i - 1), -1);
        if (u.top == a.top) {
          let c = Mn(Zt(r, i, i + 1), -1);
          if (c.top != a.top)
            return vi(c, c.left < u.left);
        }
      }
      return a;
    } else {
      let a = i, u = i, c = n < 0 ? 1 : -1;
      return n < 0 && !i ? (u++, c = -1) : n >= 0 && i == r.nodeValue.length ? (a--, c = 1) : n < 0 ? a-- : u++, vi(Mn(Zt(r, a, u), c), c < 0);
    }
  if (!t.state.doc.resolve(e - (o || 0)).parent.inlineContent) {
    if (o == null && i && (n < 0 || i == Mt(r))) {
      let a = r.childNodes[i - 1];
      if (a.nodeType == 1)
        return Il(a.getBoundingClientRect(), !1);
    }
    if (o == null && i < Mt(r)) {
      let a = r.childNodes[i];
      if (a.nodeType == 1)
        return Il(a.getBoundingClientRect(), !0);
    }
    return Il(r.getBoundingClientRect(), n >= 0);
  }
  if (o == null && i && (n < 0 || i == Mt(r))) {
    let a = r.childNodes[i - 1], u = a.nodeType == 3 ? Zt(a, Mt(a) - (s ? 0 : 1)) : a.nodeType == 1 && (a.nodeName != "BR" || !a.nextSibling) ? a : null;
    if (u)
      return vi(Mn(u, 1), !1);
  }
  if (o == null && i < Mt(r)) {
    let a = r.childNodes[i];
    for (; a.pmViewDesc && a.pmViewDesc.ignoreForCoords; )
      a = a.nextSibling;
    let u = a ? a.nodeType == 3 ? Zt(a, 0, s ? 0 : 1) : a.nodeType == 1 ? a : null : null;
    if (u)
      return vi(Mn(u, -1), !0);
  }
  return vi(Mn(r.nodeType == 3 ? Zt(r) : r, -n), n >= 0);
}
function vi(t, e) {
  if (t.width == 0)
    return t;
  let n = e ? t.left : t.right;
  return { top: t.top, bottom: t.bottom, left: n, right: n };
}
function Il(t, e) {
  if (t.height == 0)
    return t;
  let n = e ? t.top : t.bottom;
  return { top: n, bottom: n, left: t.left, right: t.right };
}
function Op(t, e, n) {
  let r = t.state, i = t.root.activeElement;
  r != e && t.updateState(e), i != t.dom && t.focus();
  try {
    return n();
  } finally {
    r != e && t.updateState(r), i != t.dom && i && i.focus();
  }
}
function ax(t, e, n) {
  let r = e.selection, i = n == "up" ? r.$from : r.$to;
  return Op(t, e, () => {
    let { node: o } = t.docView.domFromPos(i.pos, n == "up" ? -1 : 1);
    for (; ; ) {
      let l = t.docView.nearestDesc(o, !0);
      if (!l)
        break;
      if (l.node.isBlock) {
        o = l.contentDOM || l.dom;
        break;
      }
      o = l.dom.parentNode;
    }
    let s = Ap(t, i.pos, 1);
    for (let l = o.firstChild; l; l = l.nextSibling) {
      let a;
      if (l.nodeType == 1)
        a = l.getClientRects();
      else if (l.nodeType == 3)
        a = Zt(l, 0, l.nodeValue.length).getClientRects();
      else
        continue;
      for (let u = 0; u < a.length; u++) {
        let c = a[u];
        if (c.bottom > c.top + 1 && (n == "up" ? s.top - c.top > (c.bottom - s.top) * 2 : c.bottom - s.bottom > (s.bottom - c.top) * 2))
          return !1;
      }
    }
    return !0;
  });
}
const ux = /[\u0590-\u08ac]/;
function cx(t, e, n) {
  let { $head: r } = e.selection;
  if (!r.parent.isTextblock)
    return !1;
  let i = r.parentOffset, o = !i, s = i == r.parent.content.size, l = t.domSelection();
  return l ? !ux.test(r.parent.textContent) || !l.modify ? n == "left" || n == "backward" ? o : s : Op(t, e, () => {
    let { focusNode: a, focusOffset: u, anchorNode: c, anchorOffset: f } = t.domSelectionRange(), h = l.caretBidiLevel;
    l.modify("move", n, "character");
    let d = r.depth ? t.docView.domAfterPos(r.before()) : t.dom, { focusNode: p, focusOffset: m } = t.domSelectionRange(), k = p && !d.contains(p.nodeType == 1 ? p : p.parentNode) || a == p && u == m;
    try {
      l.collapse(c, f), a && (a != c || u != f) && l.extend && l.extend(a, u);
    } catch {
    }
    return h != null && (l.caretBidiLevel = h), k;
  }) : r.pos == r.start() || r.pos == r.end();
}
let Vf = null, Hf = null, jf = !1;
function fx(t, e, n) {
  return Vf == e && Hf == n ? jf : (Vf = e, Hf = n, jf = n == "up" || n == "down" ? ax(t, e, n) : cx(t, e, n));
}
const Tt = 0, qf = 1, Yn = 2, Ht = 3;
class Eo {
  constructor(e, n, r, i) {
    this.parent = e, this.children = n, this.dom = r, this.contentDOM = i, this.dirty = Tt, r.pmViewDesc = this;
  }
  // Used to check whether a given description corresponds to a
  // widget/mark/node.
  matchesWidget(e) {
    return !1;
  }
  matchesMark(e) {
    return !1;
  }
  matchesNode(e, n, r) {
    return !1;
  }
  matchesHack(e) {
    return !1;
  }
  // When parsing in-editor content (in domchange.js), we allow
  // descriptions to determine the parse rules that should be used to
  // parse them.
  parseRule() {
    return null;
  }
  // Used by the editor's event handler to ignore events that come
  // from certain descs.
  stopEvent(e) {
    return !1;
  }
  // The size of the content represented by this desc.
  get size() {
    let e = 0;
    for (let n = 0; n < this.children.length; n++)
      e += this.children[n].size;
    return e;
  }
  // For block nodes, this represents the space taken up by their
  // start/end tokens.
  get border() {
    return 0;
  }
  destroy() {
    this.parent = void 0, this.dom.pmViewDesc == this && (this.dom.pmViewDesc = void 0);
    for (let e = 0; e < this.children.length; e++)
      this.children[e].destroy();
  }
  posBeforeChild(e) {
    for (let n = 0, r = this.posAtStart; ; n++) {
      let i = this.children[n];
      if (i == e)
        return r;
      r += i.size;
    }
  }
  get posBefore() {
    return this.parent.posBeforeChild(this);
  }
  get posAtStart() {
    return this.parent ? this.parent.posBeforeChild(this) + this.border : 0;
  }
  get posAfter() {
    return this.posBefore + this.size;
  }
  get posAtEnd() {
    return this.posAtStart + this.size - 2 * this.border;
  }
  localPosFromDOM(e, n, r) {
    if (this.contentDOM && this.contentDOM.contains(e.nodeType == 1 ? e : e.parentNode))
      if (r < 0) {
        let o, s;
        if (e == this.contentDOM)
          o = e.childNodes[n - 1];
        else {
          for (; e.parentNode != this.contentDOM; )
            e = e.parentNode;
          o = e.previousSibling;
        }
        for (; o && !((s = o.pmViewDesc) && s.parent == this); )
          o = o.previousSibling;
        return o ? this.posBeforeChild(s) + s.size : this.posAtStart;
      } else {
        let o, s;
        if (e == this.contentDOM)
          o = e.childNodes[n];
        else {
          for (; e.parentNode != this.contentDOM; )
            e = e.parentNode;
          o = e.nextSibling;
        }
        for (; o && !((s = o.pmViewDesc) && s.parent == this); )
          o = o.nextSibling;
        return o ? this.posBeforeChild(s) : this.posAtEnd;
      }
    let i;
    if (e == this.dom && this.contentDOM)
      i = n > Re(this.contentDOM);
    else if (this.contentDOM && this.contentDOM != this.dom && this.dom.contains(this.contentDOM))
      i = e.compareDocumentPosition(this.contentDOM) & 2;
    else if (this.dom.firstChild) {
      if (n == 0)
        for (let o = e; ; o = o.parentNode) {
          if (o == this.dom) {
            i = !1;
            break;
          }
          if (o.previousSibling)
            break;
        }
      if (i == null && n == e.childNodes.length)
        for (let o = e; ; o = o.parentNode) {
          if (o == this.dom) {
            i = !0;
            break;
          }
          if (o.nextSibling)
            break;
        }
    }
    return i ?? r > 0 ? this.posAtEnd : this.posAtStart;
  }
  nearestDesc(e, n = !1) {
    for (let r = !0, i = e; i; i = i.parentNode) {
      let o = this.getDesc(i), s;
      if (o && (!n || o.node))
        if (r && (s = o.nodeDOM) && !(s.nodeType == 1 ? s.contains(e.nodeType == 1 ? e : e.parentNode) : s == e))
          r = !1;
        else
          return o;
    }
  }
  getDesc(e) {
    let n = e.pmViewDesc;
    for (let r = n; r; r = r.parent)
      if (r == this)
        return n;
  }
  posFromDOM(e, n, r) {
    for (let i = e; i; i = i.parentNode) {
      let o = this.getDesc(i);
      if (o)
        return o.localPosFromDOM(e, n, r);
    }
    return -1;
  }
  // Find the desc for the node after the given pos, if any. (When a
  // parent node overrode rendering, there might not be one.)
  descAt(e) {
    for (let n = 0, r = 0; n < this.children.length; n++) {
      let i = this.children[n], o = r + i.size;
      if (r == e && o != r) {
        for (; !i.border && i.children.length; )
          for (let s = 0; s < i.children.length; s++) {
            let l = i.children[s];
            if (l.size) {
              i = l;
              break;
            }
          }
        return i;
      }
      if (e < o)
        return i.descAt(e - r - i.border);
      r = o;
    }
  }
  domFromPos(e, n) {
    if (!this.contentDOM)
      return { node: this.dom, offset: 0, atom: e + 1 };
    let r = 0, i = 0;
    for (let o = 0; r < this.children.length; r++) {
      let s = this.children[r], l = o + s.size;
      if (l > e || s instanceof Rp) {
        i = e - o;
        break;
      }
      o = l;
    }
    if (i)
      return this.children[r].domFromPos(i - this.children[r].border, n);
    for (let o; r && !(o = this.children[r - 1]).size && o instanceof Dp && o.side >= 0; r--)
      ;
    if (n <= 0) {
      let o, s = !0;
      for (; o = r ? this.children[r - 1] : null, !(!o || o.dom.parentNode == this.contentDOM); r--, s = !1)
        ;
      return o && n && s && !o.border && !o.domAtom ? o.domFromPos(o.size, n) : { node: this.contentDOM, offset: o ? Re(o.dom) + 1 : 0 };
    } else {
      let o, s = !0;
      for (; o = r < this.children.length ? this.children[r] : null, !(!o || o.dom.parentNode == this.contentDOM); r++, s = !1)
        ;
      return o && s && !o.border && !o.domAtom ? o.domFromPos(0, n) : { node: this.contentDOM, offset: o ? Re(o.dom) : this.contentDOM.childNodes.length };
    }
  }
  // Used to find a DOM range in a single parent for a given changed
  // range.
  parseRange(e, n, r = 0) {
    if (this.children.length == 0)
      return { node: this.contentDOM, from: e, to: n, fromOffset: 0, toOffset: this.contentDOM.childNodes.length };
    let i = -1, o = -1;
    for (let s = r, l = 0; ; l++) {
      let a = this.children[l], u = s + a.size;
      if (i == -1 && e <= u) {
        let c = s + a.border;
        if (e >= c && n <= u - a.border && a.node && a.contentDOM && this.contentDOM.contains(a.contentDOM))
          return a.parseRange(e, n, c);
        e = s;
        for (let f = l; f > 0; f--) {
          let h = this.children[f - 1];
          if (h.size && h.dom.parentNode == this.contentDOM && !h.emptyChildAt(1)) {
            i = Re(h.dom) + 1;
            break;
          }
          e -= h.size;
        }
        i == -1 && (i = 0);
      }
      if (i > -1 && (u > n || l == this.children.length - 1)) {
        n = u;
        for (let c = l + 1; c < this.children.length; c++) {
          let f = this.children[c];
          if (f.size && f.dom.parentNode == this.contentDOM && !f.emptyChildAt(-1)) {
            o = Re(f.dom);
            break;
          }
          n += f.size;
        }
        o == -1 && (o = this.contentDOM.childNodes.length);
        break;
      }
      s = u;
    }
    return { node: this.contentDOM, from: e, to: n, fromOffset: i, toOffset: o };
  }
  emptyChildAt(e) {
    if (this.border || !this.contentDOM || !this.children.length)
      return !1;
    let n = this.children[e < 0 ? 0 : this.children.length - 1];
    return n.size == 0 || n.emptyChildAt(e);
  }
  domAfterPos(e) {
    let { node: n, offset: r } = this.domFromPos(e, 0);
    if (n.nodeType != 1 || r == n.childNodes.length)
      throw new RangeError("No node after pos " + e);
    return n.childNodes[r];
  }
  // View descs are responsible for setting any selection that falls
  // entirely inside of them, so that custom implementations can do
  // custom things with the selection. Note that this falls apart when
  // a selection starts in such a node and ends in another, in which
  // case we just use whatever domFromPos produces as a best effort.
  setSelection(e, n, r, i = !1) {
    let o = Math.min(e, n), s = Math.max(e, n);
    for (let d = 0, p = 0; d < this.children.length; d++) {
      let m = this.children[d], k = p + m.size;
      if (o > p && s < k)
        return m.setSelection(e - p - m.border, n - p - m.border, r, i);
      p = k;
    }
    let l = this.domFromPos(e, e ? -1 : 1), a = n == e ? l : this.domFromPos(n, n ? -1 : 1), u = r.root.getSelection(), c = r.domSelectionRange(), f = !1;
    if ((Nt || $e) && e == n) {
      let { node: d, offset: p } = l;
      if (d.nodeType == 3) {
        if (f = !!(p && d.nodeValue[p - 1] == `
`), f && p == d.nodeValue.length)
          for (let m = d, k; m; m = m.parentNode) {
            if (k = m.nextSibling) {
              k.nodeName == "BR" && (l = a = { node: k.parentNode, offset: Re(k) + 1 });
              break;
            }
            let y = m.pmViewDesc;
            if (y && y.node && y.node.isBlock)
              break;
          }
      } else {
        let m = d.childNodes[p - 1];
        f = m && (m.nodeName == "BR" || m.contentEditable == "false");
      }
    }
    if (Nt && c.focusNode && c.focusNode != a.node && c.focusNode.nodeType == 1) {
      let d = c.focusNode.childNodes[c.focusOffset];
      d && d.contentEditable == "false" && (i = !0);
    }
    if (!(i || f && $e) && br(l.node, l.offset, c.anchorNode, c.anchorOffset) && br(a.node, a.offset, c.focusNode, c.focusOffset))
      return;
    let h = !1;
    if ((u.extend || e == n) && !(f && Nt)) {
      u.collapse(l.node, l.offset);
      try {
        e != n && u.extend(a.node, a.offset), h = !0;
      } catch {
      }
    }
    if (!h) {
      if (e > n) {
        let p = l;
        l = a, a = p;
      }
      let d = document.createRange();
      d.setEnd(a.node, a.offset), d.setStart(l.node, l.offset), u.removeAllRanges(), u.addRange(d);
    }
  }
  ignoreMutation(e) {
    return !this.contentDOM && e.type != "selection";
  }
  get contentLost() {
    return this.contentDOM && this.contentDOM != this.dom && !this.dom.contains(this.contentDOM);
  }
  // Remove a subtree of the element tree that has been touched
  // by a DOM change, so that the next update will redraw it.
  markDirty(e, n) {
    for (let r = 0, i = 0; i < this.children.length; i++) {
      let o = this.children[i], s = r + o.size;
      if (r == s ? e <= s && n >= r : e < s && n > r) {
        let l = r + o.border, a = s - o.border;
        if (e >= l && n <= a) {
          this.dirty = e == r || n == s ? Yn : qf, e == l && n == a && (o.contentLost || o.dom.parentNode != this.contentDOM) ? o.dirty = Ht : o.markDirty(e - l, n - l);
          return;
        } else
          o.dirty = o.dom == o.contentDOM && o.dom.parentNode == this.contentDOM && !o.children.length ? Yn : Ht;
      }
      r = s;
    }
    this.dirty = Yn;
  }
  markParentsDirty() {
    let e = 1;
    for (let n = this.parent; n; n = n.parent, e++) {
      let r = e == 1 ? Yn : qf;
      n.dirty < r && (n.dirty = r);
    }
  }
  get domAtom() {
    return !1;
  }
  get ignoreForCoords() {
    return !1;
  }
  get ignoreForSelection() {
    return !1;
  }
  isText(e) {
    return !1;
  }
}
class Dp extends Eo {
  constructor(e, n, r, i) {
    let o, s = n.type.toDOM;
    if (typeof s == "function" && (s = s(r, () => {
      if (!o)
        return i;
      if (o.parent)
        return o.parent.posBeforeChild(o);
    })), !n.type.spec.raw) {
      if (s.nodeType != 1) {
        let l = document.createElement("span");
        l.appendChild(s), s = l;
      }
      s.contentEditable = "false", s.classList.add("ProseMirror-widget");
    }
    super(e, [], s, null), this.widget = n, this.widget = n, o = this;
  }
  matchesWidget(e) {
    return this.dirty == Tt && e.type.eq(this.widget.type);
  }
  parseRule() {
    return { ignore: !0 };
  }
  stopEvent(e) {
    let n = this.widget.spec.stopEvent;
    return n ? n(e) : !1;
  }
  ignoreMutation(e) {
    return e.type != "selection" || this.widget.spec.ignoreSelection;
  }
  destroy() {
    this.widget.type.destroy(this.dom), super.destroy();
  }
  get domAtom() {
    return !0;
  }
  get ignoreForSelection() {
    return !!this.widget.type.spec.relaxedSide;
  }
  get side() {
    return this.widget.type.side;
  }
}
class hx extends Eo {
  constructor(e, n, r, i) {
    super(e, [], n, null), this.textDOM = r, this.text = i;
  }
  get size() {
    return this.text.length;
  }
  localPosFromDOM(e, n) {
    return e != this.textDOM ? this.posAtStart + (n ? this.size : 0) : this.posAtStart + n;
  }
  domFromPos(e) {
    return { node: this.textDOM, offset: e };
  }
  ignoreMutation(e) {
    return e.type === "characterData" && e.target.nodeValue == e.oldValue;
  }
}
class wr extends Eo {
  constructor(e, n, r, i, o) {
    super(e, [], r, i), this.mark = n, this.spec = o;
  }
  static create(e, n, r, i) {
    let o = i.nodeViews[n.type.name], s = o && o(n, i, r);
    return (!s || !s.dom) && (s = pi.renderSpec(document, n.type.spec.toDOM(n, r), null, n.attrs)), new wr(e, n, s.dom, s.contentDOM || s.dom, s);
  }
  parseRule() {
    return this.dirty & Ht || this.mark.type.spec.reparseInView ? null : { mark: this.mark.type.name, attrs: this.mark.attrs, contentElement: this.contentDOM };
  }
  matchesMark(e) {
    return this.dirty != Ht && this.mark.eq(e);
  }
  markDirty(e, n) {
    if (super.markDirty(e, n), this.dirty != Tt) {
      let r = this.parent;
      for (; !r.node; )
        r = r.parent;
      r.dirty < this.dirty && (r.dirty = this.dirty), this.dirty = Tt;
    }
  }
  slice(e, n, r) {
    let i = wr.create(this.parent, this.mark, !0, r), o = this.children, s = this.size;
    n < s && (o = va(o, n, s, r)), e > 0 && (o = va(o, 0, e, r));
    for (let l = 0; l < o.length; l++)
      o[l].parent = i;
    return i.children = o, i;
  }
  ignoreMutation(e) {
    return this.spec.ignoreMutation ? this.spec.ignoreMutation(e) : super.ignoreMutation(e);
  }
  destroy() {
    this.spec.destroy && this.spec.destroy(), super.destroy();
  }
}
class Fn extends Eo {
  constructor(e, n, r, i, o, s, l, a, u) {
    super(e, [], o, s), this.node = n, this.outerDeco = r, this.innerDeco = i, this.nodeDOM = l;
  }
  // By default, a node is rendered using the `toDOM` method from the
  // node type spec. But client code can use the `nodeViews` spec to
  // supply a custom node view, which can influence various aspects of
  // the way the node works.
  //
  // (Using subclassing for this was intentionally decided against,
  // since it'd require exposing a whole slew of finicky
  // implementation details to the user code that they probably will
  // never need.)
  static create(e, n, r, i, o, s) {
    let l = o.nodeViews[n.type.name], a, u = l && l(n, o, () => {
      if (!a)
        return s;
      if (a.parent)
        return a.parent.posBeforeChild(a);
    }, r, i), c = u && u.dom, f = u && u.contentDOM;
    if (n.isText) {
      if (!c)
        c = document.createTextNode(n.text);
      else if (c.nodeType != 3)
        throw new RangeError("Text must be rendered as a DOM text node");
    } else c || ({ dom: c, contentDOM: f } = pi.renderSpec(document, n.type.spec.toDOM(n), null, n.attrs));
    !f && !n.isText && c.nodeName != "BR" && (c.hasAttribute("contenteditable") || (c.contentEditable = "false"), n.type.spec.draggable && (c.draggable = !0));
    let h = c;
    return c = Pp(c, r, n), u ? a = new dx(e, n, r, i, c, f || null, h, u, o, s + 1) : n.isText ? new Js(e, n, r, i, c, h, o) : new Fn(e, n, r, i, c, f || null, h, o, s + 1);
  }
  parseRule() {
    if (this.node.type.spec.reparseInView)
      return null;
    let e = { node: this.node.type.name, attrs: this.node.attrs };
    if (this.node.type.whitespace == "pre" && (e.preserveWhitespace = "full"), !this.contentDOM)
      e.getContent = () => this.node.content;
    else if (!this.contentLost)
      e.contentElement = this.contentDOM;
    else {
      for (let n = this.children.length - 1; n >= 0; n--) {
        let r = this.children[n];
        if (this.dom.contains(r.dom.parentNode)) {
          e.contentElement = r.dom.parentNode;
          break;
        }
      }
      e.contentElement || (e.getContent = () => A.empty);
    }
    return e;
  }
  matchesNode(e, n, r) {
    return this.dirty == Tt && e.eq(this.node) && Ns(n, this.outerDeco) && r.eq(this.innerDeco);
  }
  get size() {
    return this.node.nodeSize;
  }
  get border() {
    return this.node.isLeaf ? 0 : 1;
  }
  // Syncs `this.children` to match `this.node.content` and the local
  // decorations, possibly introducing nesting for marks. Then, in a
  // separate step, syncs the DOM inside `this.contentDOM` to
  // `this.children`.
  updateChildren(e, n) {
    let r = this.node.inlineContent, i = n, o = e.composing ? this.localCompositionInfo(e, n) : null, s = o && o.pos > -1 ? o : null, l = o && o.pos < 0, a = new mx(this, s && s.node, e);
    kx(this.node, this.innerDeco, (u, c, f) => {
      u.spec.marks ? a.syncToMarks(u.spec.marks, r, e, c) : u.type.side >= 0 && !f && a.syncToMarks(c == this.node.childCount ? ue.none : this.node.child(c).marks, r, e, c), a.placeWidget(u, e, i);
    }, (u, c, f, h) => {
      a.syncToMarks(u.marks, r, e, h);
      let d;
      a.findNodeMatch(u, c, f, h) || l && e.state.selection.from > i && e.state.selection.to < i + u.nodeSize && (d = a.findIndexWithChild(o.node)) > -1 && a.updateNodeAt(u, c, f, d, e) || a.updateNextNode(u, c, f, e, h, i) || a.addNode(u, c, f, e, i), i += u.nodeSize;
    }), a.syncToMarks([], r, e, 0), this.node.isTextblock && a.addTextblockHacks(), a.destroyRest(), (a.changed || this.dirty == Yn) && (s && this.protectLocalComposition(e, s), Lp(this.contentDOM, this.children, e), ci && bx(this.dom));
  }
  localCompositionInfo(e, n) {
    let { from: r, to: i } = e.state.selection;
    if (!(e.state.selection instanceof Z) || r < n || i > n + this.node.content.size)
      return null;
    let o = e.input.compositionNode;
    if (!o || !this.dom.contains(o.parentNode))
      return null;
    if (this.node.inlineContent) {
      let s = o.nodeValue, l = wx(this.node.content, s, r - n, i - n);
      return l < 0 ? null : { node: o, pos: l, text: s };
    } else
      return { node: o, pos: -1, text: "" };
  }
  protectLocalComposition(e, { node: n, pos: r, text: i }) {
    if (this.getDesc(n))
      return;
    let o = n;
    for (; o.parentNode != this.contentDOM; o = o.parentNode) {
      for (; o.previousSibling; )
        o.parentNode.removeChild(o.previousSibling);
      for (; o.nextSibling; )
        o.parentNode.removeChild(o.nextSibling);
      o.pmViewDesc && (o.pmViewDesc = void 0);
    }
    let s = new hx(this, o, n, i);
    e.input.compositionNodes.push(s), this.children = va(this.children, r, r + i.length, e, s);
  }
  // If this desc must be updated to match the given node decoration,
  // do so and return true.
  update(e, n, r, i) {
    return this.dirty == Ht || !e.sameMarkup(this.node) ? !1 : (this.updateInner(e, n, r, i), !0);
  }
  updateInner(e, n, r, i) {
    this.updateOuterDeco(n), this.node = e, this.innerDeco = r, this.contentDOM && this.updateChildren(i, this.posAtStart), this.dirty = Tt;
  }
  updateOuterDeco(e) {
    if (Ns(e, this.outerDeco))
      return;
    let n = this.nodeDOM.nodeType != 1, r = this.dom;
    this.dom = zp(this.dom, this.nodeDOM, Ta(this.outerDeco, this.node, n), Ta(e, this.node, n)), this.dom != r && (r.pmViewDesc = void 0, this.dom.pmViewDesc = this), this.outerDeco = e;
  }
  // Mark this node as being the selected node.
  selectNode() {
    this.nodeDOM.nodeType == 1 && (this.nodeDOM.classList.add("ProseMirror-selectednode"), (this.contentDOM || !this.node.type.spec.draggable) && (this.nodeDOM.draggable = !0));
  }
  // Remove selected node marking from this node.
  deselectNode() {
    this.nodeDOM.nodeType == 1 && (this.nodeDOM.classList.remove("ProseMirror-selectednode"), (this.contentDOM || !this.node.type.spec.draggable) && this.nodeDOM.removeAttribute("draggable"));
  }
  get domAtom() {
    return this.node.isAtom;
  }
}
function Wf(t, e, n, r, i) {
  Pp(r, e, t);
  let o = new Fn(void 0, t, e, n, r, r, r, i, 0);
  return o.contentDOM && o.updateChildren(i, 0), o;
}
class Js extends Fn {
  constructor(e, n, r, i, o, s, l) {
    super(e, n, r, i, o, null, s, l, 0);
  }
  parseRule() {
    let e = this.nodeDOM.parentNode;
    for (; e && e != this.dom && !e.pmIsDeco; )
      e = e.parentNode;
    return { skip: e || !0 };
  }
  update(e, n, r, i) {
    return this.dirty == Ht || this.dirty != Tt && !this.inParent() || !e.sameMarkup(this.node) ? !1 : (this.updateOuterDeco(n), (this.dirty != Tt || e.text != this.node.text) && e.text != this.nodeDOM.nodeValue && (this.nodeDOM.nodeValue = e.text, i.trackWrites == this.nodeDOM && (i.trackWrites = null)), this.node = e, this.dirty = Tt, !0);
  }
  inParent() {
    let e = this.parent.contentDOM;
    for (let n = this.nodeDOM; n; n = n.parentNode)
      if (n == e)
        return !0;
    return !1;
  }
  domFromPos(e) {
    return { node: this.nodeDOM, offset: e };
  }
  localPosFromDOM(e, n, r) {
    return e == this.nodeDOM ? this.posAtStart + Math.min(n, this.node.text.length) : super.localPosFromDOM(e, n, r);
  }
  ignoreMutation(e) {
    return e.type != "characterData" && e.type != "selection";
  }
  slice(e, n, r) {
    let i = this.node.cut(e, n), o = document.createTextNode(i.text);
    return new Js(this.parent, i, this.outerDeco, this.innerDeco, o, o, r);
  }
  markDirty(e, n) {
    super.markDirty(e, n), this.dom != this.nodeDOM && (e == 0 || n == this.nodeDOM.nodeValue.length) && (this.dirty = Ht);
  }
  get domAtom() {
    return !1;
  }
  isText(e) {
    return this.node.text == e;
  }
}
class Rp extends Eo {
  parseRule() {
    return { ignore: !0 };
  }
  matchesHack(e) {
    return this.dirty == Tt && this.dom.nodeName == e;
  }
  get domAtom() {
    return !0;
  }
  get ignoreForCoords() {
    return this.dom.nodeName == "IMG";
  }
}
class dx extends Fn {
  constructor(e, n, r, i, o, s, l, a, u, c) {
    super(e, n, r, i, o, s, l, u, c), this.spec = a;
  }
  // A custom `update` method gets to decide whether the update goes
  // through. If it does, and there's a `contentDOM` node, our logic
  // updates the children.
  update(e, n, r, i) {
    if (this.dirty == Ht)
      return !1;
    if (this.spec.update && (this.node.type == e.type || this.spec.multiType)) {
      let o = this.spec.update(e, n, r);
      return o && this.updateInner(e, n, r, i), o;
    } else return !this.contentDOM && !e.isLeaf ? !1 : super.update(e, n, r, i);
  }
  selectNode() {
    this.spec.selectNode ? this.spec.selectNode() : super.selectNode();
  }
  deselectNode() {
    this.spec.deselectNode ? this.spec.deselectNode() : super.deselectNode();
  }
  setSelection(e, n, r, i) {
    this.spec.setSelection ? this.spec.setSelection(e, n, r.root) : super.setSelection(e, n, r, i);
  }
  destroy() {
    this.spec.destroy && this.spec.destroy(), super.destroy();
  }
  stopEvent(e) {
    return this.spec.stopEvent ? this.spec.stopEvent(e) : !1;
  }
  ignoreMutation(e) {
    return this.spec.ignoreMutation ? this.spec.ignoreMutation(e) : super.ignoreMutation(e);
  }
}
function Lp(t, e, n) {
  let r = t.firstChild, i = !1;
  for (let o = 0; o < e.length; o++) {
    let s = e[o], l = s.dom;
    if (l.parentNode == t) {
      for (; l != r; )
        r = Kf(r), i = !0;
      r = r.nextSibling;
    } else
      i = !0, t.insertBefore(l, r);
    if (s instanceof wr) {
      let a = r ? r.previousSibling : t.lastChild;
      Lp(s.contentDOM, s.children, n), r = a ? a.nextSibling : t.firstChild;
    }
  }
  for (; r; )
    r = Kf(r), i = !0;
  i && n.trackWrites == t && (n.trackWrites = null);
}
const Fi = function(t) {
  t && (this.nodeName = t);
};
Fi.prototype = /* @__PURE__ */ Object.create(null);
const Qn = [new Fi()];
function Ta(t, e, n) {
  if (t.length == 0)
    return Qn;
  let r = n ? Qn[0] : new Fi(), i = [r];
  for (let o = 0; o < t.length; o++) {
    let s = t[o].type.attrs;
    if (s) {
      s.nodeName && i.push(r = new Fi(s.nodeName));
      for (let l in s) {
        let a = s[l];
        a != null && (n && i.length == 1 && i.push(r = new Fi(e.isInline ? "span" : "div")), l == "class" ? r.class = (r.class ? r.class + " " : "") + a : l == "style" ? r.style = (r.style ? r.style + ";" : "") + a : l != "nodeName" && (r[l] = a));
      }
    }
  }
  return i;
}
function zp(t, e, n, r) {
  if (n == Qn && r == Qn)
    return e;
  let i = e;
  for (let o = 0; o < r.length; o++) {
    let s = r[o], l = n[o];
    if (o) {
      let a;
      l && l.nodeName == s.nodeName && i != t && (a = i.parentNode) && a.nodeName.toLowerCase() == s.nodeName || (a = document.createElement(s.nodeName), a.pmIsDeco = !0, a.appendChild(i), l = Qn[0]), i = a;
    }
    px(i, l || Qn[0], s);
  }
  return i;
}
function px(t, e, n) {
  for (let r in e)
    r != "class" && r != "style" && r != "nodeName" && !(r in n) && t.removeAttribute(r);
  for (let r in n)
    r != "class" && r != "style" && r != "nodeName" && n[r] != e[r] && t.setAttribute(r, n[r]);
  if (e.class != n.class) {
    let r = e.class ? e.class.split(" ").filter(Boolean) : [], i = n.class ? n.class.split(" ").filter(Boolean) : [];
    for (let o = 0; o < r.length; o++)
      i.indexOf(r[o]) == -1 && t.classList.remove(r[o]);
    for (let o = 0; o < i.length; o++)
      r.indexOf(i[o]) == -1 && t.classList.add(i[o]);
    t.classList.length == 0 && t.removeAttribute("class");
  }
  if (e.style != n.style) {
    if (e.style) {
      let r = /\s*([\w\-\xa1-\uffff]+)\s*:(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\(.*?\)|[^;])*/g, i;
      for (; i = r.exec(e.style); )
        t.style.removeProperty(i[1]);
    }
    n.style && (t.style.cssText += n.style);
  }
}
function Pp(t, e, n) {
  return zp(t, t, Qn, Ta(e, n, t.nodeType != 1));
}
function Ns(t, e) {
  if (t.length != e.length)
    return !1;
  for (let n = 0; n < t.length; n++)
    if (!t[n].type.eq(e[n].type))
      return !1;
  return !0;
}
function Kf(t) {
  let e = t.nextSibling;
  return t.parentNode.removeChild(t), e;
}
class mx {
  constructor(e, n, r) {
    this.lock = n, this.view = r, this.index = 0, this.stack = [], this.changed = !1, this.top = e, this.preMatch = gx(e.node.content, e);
  }
  // Destroy and remove the children between the given indices in
  // `this.top`.
  destroyBetween(e, n) {
    if (e != n) {
      for (let r = e; r < n; r++)
        this.top.children[r].destroy();
      this.top.children.splice(e, n - e), this.changed = !0;
    }
  }
  // Destroy all remaining children in `this.top`.
  destroyRest() {
    this.destroyBetween(this.index, this.top.children.length);
  }
  // Sync the current stack of mark descs with the given array of
  // marks, reusing existing mark descs when possible.
  syncToMarks(e, n, r, i) {
    let o = 0, s = this.stack.length >> 1, l = Math.min(s, e.length);
    for (; o < l && (o == s - 1 ? this.top : this.stack[o + 1 << 1]).matchesMark(e[o]) && e[o].type.spec.spanning !== !1; )
      o++;
    for (; o < s; )
      this.destroyRest(), this.top.dirty = Tt, this.index = this.stack.pop(), this.top = this.stack.pop(), s--;
    for (; s < e.length; ) {
      this.stack.push(this.top, this.index + 1);
      let a = -1, u = this.top.children.length;
      i < this.preMatch.index && (u = Math.min(this.index + 3, u));
      for (let c = this.index; c < u; c++) {
        let f = this.top.children[c];
        if (f.matchesMark(e[s]) && !this.isLocked(f.dom)) {
          a = c;
          break;
        }
      }
      if (a > -1)
        a > this.index && (this.changed = !0, this.destroyBetween(this.index, a)), this.top = this.top.children[this.index];
      else {
        let c = wr.create(this.top, e[s], n, r);
        this.top.children.splice(this.index, 0, c), this.top = c, this.changed = !0;
      }
      this.index = 0, s++;
    }
  }
  // Try to find a node desc matching the given data. Skip over it and
  // return true when successful.
  findNodeMatch(e, n, r, i) {
    let o = -1, s;
    if (i >= this.preMatch.index && (s = this.preMatch.matches[i - this.preMatch.index]).parent == this.top && s.matchesNode(e, n, r))
      o = this.top.children.indexOf(s, this.index);
    else
      for (let l = this.index, a = Math.min(this.top.children.length, l + 5); l < a; l++) {
        let u = this.top.children[l];
        if (u.matchesNode(e, n, r) && !this.preMatch.matched.has(u)) {
          o = l;
          break;
        }
      }
    return o < 0 ? !1 : (this.destroyBetween(this.index, o), this.index++, !0);
  }
  updateNodeAt(e, n, r, i, o) {
    let s = this.top.children[i];
    return s.dirty == Ht && s.dom == s.contentDOM && (s.dirty = Yn), s.update(e, n, r, o) ? (this.destroyBetween(this.index, i), this.index++, !0) : !1;
  }
  findIndexWithChild(e) {
    for (; ; ) {
      let n = e.parentNode;
      if (!n)
        return -1;
      if (n == this.top.contentDOM) {
        let r = e.pmViewDesc;
        if (r) {
          for (let i = this.index; i < this.top.children.length; i++)
            if (this.top.children[i] == r)
              return i;
        }
        return -1;
      }
      e = n;
    }
  }
  // Try to update the next node, if any, to the given data. Checks
  // pre-matches to avoid overwriting nodes that could still be used.
  updateNextNode(e, n, r, i, o, s) {
    for (let l = this.index; l < this.top.children.length; l++) {
      let a = this.top.children[l];
      if (a instanceof Fn) {
        let u = this.preMatch.matched.get(a);
        if (u != null && u != o)
          return !1;
        let c = a.dom, f, h = this.isLocked(c) && !(e.isText && a.node && a.node.isText && a.nodeDOM.nodeValue == e.text && a.dirty != Ht && Ns(n, a.outerDeco));
        if (!h && a.update(e, n, r, i))
          return this.destroyBetween(this.index, l), a.dom != c && (this.changed = !0), this.index++, !0;
        if (!h && (f = this.recreateWrapper(a, e, n, r, i, s)))
          return this.destroyBetween(this.index, l), this.top.children[this.index] = f, f.contentDOM && (f.dirty = Yn, f.updateChildren(i, s + 1), f.dirty = Tt), this.changed = !0, this.index++, !0;
        break;
      }
    }
    return !1;
  }
  // When a node with content is replaced by a different node with
  // identical content, move over its children.
  recreateWrapper(e, n, r, i, o, s) {
    if (e.dirty || n.isAtom || !e.children.length || !e.node.content.eq(n.content) || !Ns(r, e.outerDeco) || !i.eq(e.innerDeco))
      return null;
    let l = Fn.create(this.top, n, r, i, o, s);
    if (l.contentDOM) {
      l.children = e.children, e.children = [];
      for (let a of l.children)
        a.parent = l;
    }
    return e.destroy(), l;
  }
  // Insert the node as a newly created node desc.
  addNode(e, n, r, i, o) {
    let s = Fn.create(this.top, e, n, r, i, o);
    s.contentDOM && s.updateChildren(i, o + 1), this.top.children.splice(this.index++, 0, s), this.changed = !0;
  }
  placeWidget(e, n, r) {
    let i = this.index < this.top.children.length ? this.top.children[this.index] : null;
    if (i && i.matchesWidget(e) && (e == i.widget || !i.widget.type.toDOM.parentNode))
      this.index++;
    else {
      let o = new Dp(this.top, e, n, r);
      this.top.children.splice(this.index++, 0, o), this.changed = !0;
    }
  }
  // Make sure a textblock looks and behaves correctly in
  // contentEditable.
  addTextblockHacks() {
    let e = this.top.children[this.index - 1], n = this.top;
    for (; e instanceof wr; )
      n = e, e = n.children[n.children.length - 1];
    (!e || // Empty textblock
    !(e instanceof Js) || /\n$/.test(e.node.text) || this.view.requiresGeckoHackNode && /\s$/.test(e.node.text)) && (($e || Le) && e && e.dom.contentEditable == "false" && this.addHackNode("IMG", n), this.addHackNode("BR", this.top));
  }
  addHackNode(e, n) {
    if (n == this.top && this.index < n.children.length && n.children[this.index].matchesHack(e))
      this.index++;
    else {
      let r = document.createElement(e);
      e == "IMG" && (r.className = "ProseMirror-separator", r.alt = ""), e == "BR" && (r.className = "ProseMirror-trailingBreak");
      let i = new Rp(this.top, [], r, null);
      n != this.top ? n.children.push(i) : n.children.splice(this.index++, 0, i), this.changed = !0;
    }
  }
  isLocked(e) {
    return this.lock && (e == this.lock || e.nodeType == 1 && e.contains(this.lock.parentNode));
  }
}
function gx(t, e) {
  let n = e, r = n.children.length, i = t.childCount, o = /* @__PURE__ */ new Map(), s = [];
  e: for (; i > 0; ) {
    let l;
    for (; ; )
      if (r) {
        let u = n.children[r - 1];
        if (u instanceof wr)
          n = u, r = u.children.length;
        else {
          l = u, r--;
          break;
        }
      } else {
        if (n == e)
          break e;
        r = n.parent.children.indexOf(n), n = n.parent;
      }
    let a = l.node;
    if (a) {
      if (a != t.child(i - 1))
        break;
      --i, o.set(l, i), s.push(l);
    }
  }
  return { index: i, matched: o, matches: s.reverse() };
}
function yx(t, e) {
  return t.type.side - e.type.side;
}
function kx(t, e, n, r) {
  let i = e.locals(t), o = 0;
  if (i.length == 0) {
    for (let u = 0; u < t.childCount; u++) {
      let c = t.child(u);
      r(c, i, e.forChild(o, c), u), o += c.nodeSize;
    }
    return;
  }
  let s = 0, l = [], a = null;
  for (let u = 0; ; ) {
    let c, f;
    for (; s < i.length && i[s].to == o; ) {
      let k = i[s++];
      k.widget && (c ? (f || (f = [c])).push(k) : c = k);
    }
    if (c)
      if (f) {
        f.sort(yx);
        for (let k = 0; k < f.length; k++)
          n(f[k], u, !!a);
      } else
        n(c, u, !!a);
    let h, d;
    if (a)
      d = -1, h = a, a = null;
    else if (u < t.childCount)
      d = u, h = t.child(u++);
    else
      break;
    for (let k = 0; k < l.length; k++)
      l[k].to <= o && l.splice(k--, 1);
    for (; s < i.length && i[s].from <= o && i[s].to > o; )
      l.push(i[s++]);
    let p = o + h.nodeSize;
    if (h.isText) {
      let k = p;
      s < i.length && i[s].from < k && (k = i[s].from);
      for (let y = 0; y < l.length; y++)
        l[y].to < k && (k = l[y].to);
      k < p && (a = h.cut(k - o), h = h.cut(0, k - o), p = k, d = -1);
    } else
      for (; s < i.length && i[s].to < p; )
        s++;
    let m = h.isInline && !h.isLeaf ? l.filter((k) => !k.inline) : l.slice();
    r(h, m, e.forChild(o, h), d), o = p;
  }
}
function bx(t) {
  if (t.nodeName == "UL" || t.nodeName == "OL") {
    let e = t.style.cssText;
    t.style.cssText = e + "; list-style: square !important", window.getComputedStyle(t).listStyle, t.style.cssText = e;
  }
}
function wx(t, e, n, r) {
  for (let i = 0, o = 0; i < t.childCount && o <= r; ) {
    let s = t.child(i++), l = o;
    if (o += s.nodeSize, !s.isText)
      continue;
    let a = s.text;
    for (; i < t.childCount; ) {
      let u = t.child(i++);
      if (o += u.nodeSize, !u.isText)
        break;
      a += u.text;
    }
    if (o >= n) {
      if (o >= r && a.slice(r - e.length - l, r - l) == e)
        return r - e.length;
      let u = l < r ? a.lastIndexOf(e, r - l - 1) : -1;
      if (u >= 0 && u + e.length + l >= n)
        return l + u;
      if (n == r && a.length >= r + e.length - l && a.slice(r - l, r - l + e.length) == e)
        return r;
    }
  }
  return -1;
}
function va(t, e, n, r, i) {
  let o = [];
  for (let s = 0, l = 0; s < t.length; s++) {
    let a = t[s], u = l, c = l += a.size;
    u >= n || c <= e ? o.push(a) : (u < e && o.push(a.slice(0, e - u, r)), i && (o.push(i), i = void 0), c > n && o.push(a.slice(n - u, a.size, r)));
  }
  return o;
}
function cu(t, e = null) {
  let n = t.domSelectionRange(), r = t.state.doc;
  if (!n.focusNode)
    return null;
  let i = t.docView.nearestDesc(n.focusNode), o = i && i.size == 0, s = t.docView.posFromDOM(n.focusNode, n.focusOffset, 1);
  if (s < 0)
    return null;
  let l = r.resolve(s), a, u;
  if (Us(n)) {
    for (a = s; i && !i.node; )
      i = i.parent;
    let f = i.node;
    if (i && f.isAtom && Q.isSelectable(f) && i.parent && !(f.isInline && Uw(n.focusNode, n.focusOffset, i.dom))) {
      let h = i.posBefore;
      u = new Q(s == h ? l : r.resolve(h));
    }
  } else {
    if (n instanceof t.dom.ownerDocument.defaultView.Selection && n.rangeCount > 1) {
      let f = s, h = s;
      for (let d = 0; d < n.rangeCount; d++) {
        let p = n.getRangeAt(d);
        f = Math.min(f, t.docView.posFromDOM(p.startContainer, p.startOffset, 1)), h = Math.max(h, t.docView.posFromDOM(p.endContainer, p.endOffset, -1));
      }
      if (f < 0)
        return null;
      [a, s] = h == t.state.selection.anchor ? [h, f] : [f, h], l = r.resolve(s);
    } else
      a = t.docView.posFromDOM(n.anchorNode, n.anchorOffset, 1);
    if (a < 0)
      return null;
  }
  let c = r.resolve(a);
  if (!u) {
    let f = e == "pointer" || t.state.selection.head < l.pos && !o ? 1 : -1;
    u = fu(t, c, l, f);
  }
  return u;
}
function Bp(t) {
  return t.editable ? t.hasFocus() : $p(t) && document.activeElement && document.activeElement.contains(t.dom);
}
function hn(t, e = !1) {
  let n = t.state.selection;
  if (Fp(t, n), !!Bp(t)) {
    if (!e && t.input.mouseDown && t.input.mouseDown.allowDefault && Le) {
      let r = t.domSelectionRange(), i = t.domObserver.currentSelection;
      if (r.anchorNode && i.anchorNode && br(r.anchorNode, r.anchorOffset, i.anchorNode, i.anchorOffset)) {
        t.input.mouseDown.delayedSelectionSync = !0, t.domObserver.setCurSelection();
        return;
      }
    }
    if (t.domObserver.disconnectSelection(), t.cursorWrapper)
      Cx(t);
    else {
      let { anchor: r, head: i } = n, o, s;
      Uf && !(n instanceof Z) && (n.$from.parent.inlineContent || (o = Jf(t, n.from)), !n.empty && !n.$from.parent.inlineContent && (s = Jf(t, n.to))), t.docView.setSelection(r, i, t, e), Uf && (o && Gf(o), s && Gf(s)), n.visible ? t.dom.classList.remove("ProseMirror-hideselection") : (t.dom.classList.add("ProseMirror-hideselection"), "onselectionchange" in document && xx(t));
    }
    t.domObserver.setCurSelection(), t.domObserver.connectSelection();
  }
}
const Uf = $e || Le && Mp < 63;
function Jf(t, e) {
  let { node: n, offset: r } = t.docView.domFromPos(e, 0), i = r < n.childNodes.length ? n.childNodes[r] : null, o = r ? n.childNodes[r - 1] : null;
  if ($e && i && i.contentEditable == "false")
    return El(i);
  if ((!i || i.contentEditable == "false") && (!o || o.contentEditable == "false")) {
    if (i)
      return El(i);
    if (o)
      return El(o);
  }
}
function El(t) {
  return t.contentEditable = "true", $e && t.draggable && (t.draggable = !1, t.wasDraggable = !0), t;
}
function Gf(t) {
  t.contentEditable = "false", t.wasDraggable && (t.draggable = !0, t.wasDraggable = null);
}
function xx(t) {
  let e = t.dom.ownerDocument;
  e.removeEventListener("selectionchange", t.input.hideSelectionGuard);
  let n = t.domSelectionRange(), r = n.anchorNode, i = n.anchorOffset;
  e.addEventListener("selectionchange", t.input.hideSelectionGuard = () => {
    (n.anchorNode != r || n.anchorOffset != i) && (e.removeEventListener("selectionchange", t.input.hideSelectionGuard), setTimeout(() => {
      (!Bp(t) || t.state.selection.visible) && t.dom.classList.remove("ProseMirror-hideselection");
    }, 20));
  });
}
function Cx(t) {
  let e = t.domSelection();
  if (!e)
    return;
  let n = t.cursorWrapper.dom, r = n.nodeName == "IMG";
  r ? e.collapse(n.parentNode, Re(n) + 1) : e.collapse(n, 0), !r && !t.state.selection.visible && it && Bn <= 11 && (n.disabled = !0, n.disabled = !1);
}
function Fp(t, e) {
  if (e instanceof Q) {
    let n = t.docView.descAt(e.from);
    n != t.lastSelectedViewDesc && (Yf(t), n && n.selectNode(), t.lastSelectedViewDesc = n);
  } else
    Yf(t);
}
function Yf(t) {
  t.lastSelectedViewDesc && (t.lastSelectedViewDesc.parent && t.lastSelectedViewDesc.deselectNode(), t.lastSelectedViewDesc = void 0);
}
function fu(t, e, n, r) {
  return t.someProp("createSelectionBetween", (i) => i(t, e, n)) || Z.between(e, n, r);
}
function Qf(t) {
  return t.editable && !t.hasFocus() ? !1 : $p(t);
}
function $p(t) {
  let e = t.domSelectionRange();
  if (!e.anchorNode)
    return !1;
  try {
    return t.dom.contains(e.anchorNode.nodeType == 3 ? e.anchorNode.parentNode : e.anchorNode) && (t.editable || t.dom.contains(e.focusNode.nodeType == 3 ? e.focusNode.parentNode : e.focusNode));
  } catch {
    return !1;
  }
}
function Sx(t) {
  let e = t.docView.domFromPos(t.state.selection.anchor, 0), n = t.domSelectionRange();
  return br(e.node, e.offset, n.anchorNode, n.anchorOffset);
}
function Ia(t, e) {
  let { $anchor: n, $head: r } = t.selection, i = e > 0 ? n.max(r) : n.min(r), o = i.parent.inlineContent ? i.depth ? t.doc.resolve(e > 0 ? i.after() : i.before()) : null : i;
  return o && ee.findFrom(o, e);
}
function Nn(t, e) {
  return t.dispatch(t.state.tr.setSelection(e).scrollIntoView()), !0;
}
function Xf(t, e, n) {
  let r = t.state.selection;
  if (r instanceof Z)
    if (n.indexOf("s") > -1) {
      let { $head: i } = r, o = i.textOffset ? null : e < 0 ? i.nodeBefore : i.nodeAfter;
      if (!o || o.isText || !o.isLeaf)
        return !1;
      let s = t.state.doc.resolve(i.pos + o.nodeSize * (e < 0 ? -1 : 1));
      return Nn(t, new Z(r.$anchor, s));
    } else if (r.empty) {
      if (t.endOfTextblock(e > 0 ? "forward" : "backward")) {
        let i = Ia(t.state, e);
        return i && i instanceof Q ? Nn(t, i) : !1;
      } else if (!(Ct && n.indexOf("m") > -1)) {
        let i = r.$head, o = i.textOffset ? null : e < 0 ? i.nodeBefore : i.nodeAfter, s;
        if (!o || o.isText)
          return !1;
        let l = e < 0 ? i.pos - o.nodeSize : i.pos;
        return o.isAtom || (s = t.docView.descAt(l)) && !s.contentDOM ? Q.isSelectable(o) ? Nn(t, new Q(e < 0 ? t.state.doc.resolve(i.pos - o.nodeSize) : i)) : Io ? Nn(t, new Z(t.state.doc.resolve(e < 0 ? l : l + o.nodeSize))) : !1 : !1;
      }
    } else return !1;
  else {
    if (r instanceof Q && r.node.isInline)
      return Nn(t, new Z(e > 0 ? r.$to : r.$from));
    {
      let i = Ia(t.state, e);
      return i ? Nn(t, i) : !1;
    }
  }
}
function Ts(t) {
  return t.nodeType == 3 ? t.nodeValue.length : t.childNodes.length;
}
function $i(t, e) {
  let n = t.pmViewDesc;
  return n && n.size == 0 && (e < 0 || t.nextSibling || t.nodeName != "BR");
}
function Ir(t, e) {
  return e < 0 ? Mx(t) : Nx(t);
}
function Mx(t) {
  let e = t.domSelectionRange(), n = e.focusNode, r = e.focusOffset;
  if (!n)
    return;
  let i, o, s = !1;
  for (Nt && n.nodeType == 1 && r < Ts(n) && $i(n.childNodes[r], -1) && (s = !0); ; )
    if (r > 0) {
      if (n.nodeType != 1)
        break;
      {
        let l = n.childNodes[r - 1];
        if ($i(l, -1))
          i = n, o = --r;
        else if (l.nodeType == 3)
          n = l, r = n.nodeValue.length;
        else
          break;
      }
    } else {
      if (_p(n))
        break;
      {
        let l = n.previousSibling;
        for (; l && $i(l, -1); )
          i = n.parentNode, o = Re(l), l = l.previousSibling;
        if (l)
          n = l, r = Ts(n);
        else {
          if (n = n.parentNode, n == t.dom)
            break;
          r = 0;
        }
      }
    }
  s ? Ea(t, n, r) : i && Ea(t, i, o);
}
function Nx(t) {
  let e = t.domSelectionRange(), n = e.focusNode, r = e.focusOffset;
  if (!n)
    return;
  let i = Ts(n), o, s;
  for (; ; )
    if (r < i) {
      if (n.nodeType != 1)
        break;
      let l = n.childNodes[r];
      if ($i(l, 1))
        o = n, s = ++r;
      else
        break;
    } else {
      if (_p(n))
        break;
      {
        let l = n.nextSibling;
        for (; l && $i(l, 1); )
          o = l.parentNode, s = Re(l) + 1, l = l.nextSibling;
        if (l)
          n = l, r = 0, i = Ts(n);
        else {
          if (n = n.parentNode, n == t.dom)
            break;
          r = i = 0;
        }
      }
    }
  o && Ea(t, o, s);
}
function _p(t) {
  let e = t.pmViewDesc;
  return e && e.node && e.node.isBlock;
}
function Tx(t, e) {
  for (; t && e == t.childNodes.length && !vo(t); )
    e = Re(t) + 1, t = t.parentNode;
  for (; t && e < t.childNodes.length; ) {
    let n = t.childNodes[e];
    if (n.nodeType == 3)
      return n;
    if (n.nodeType == 1 && n.contentEditable == "false")
      break;
    t = n, e = 0;
  }
}
function vx(t, e) {
  for (; t && !e && !vo(t); )
    e = Re(t), t = t.parentNode;
  for (; t && e; ) {
    let n = t.childNodes[e - 1];
    if (n.nodeType == 3)
      return n;
    if (n.nodeType == 1 && n.contentEditable == "false")
      break;
    t = n, e = t.childNodes.length;
  }
}
function Ea(t, e, n) {
  if (e.nodeType != 3) {
    let o, s;
    (s = Tx(e, n)) ? (e = s, n = 0) : (o = vx(e, n)) && (e = o, n = o.nodeValue.length);
  }
  let r = t.domSelection();
  if (!r)
    return;
  if (Us(r)) {
    let o = document.createRange();
    o.setEnd(e, n), o.setStart(e, n), r.removeAllRanges(), r.addRange(o);
  } else r.extend && r.extend(e, n);
  t.domObserver.setCurSelection();
  let { state: i } = t;
  setTimeout(() => {
    t.state == i && hn(t);
  }, 50);
}
function Zf(t, e) {
  let n = t.state.doc.resolve(e);
  if (!(Le || Np) && n.parent.inlineContent) {
    let i = t.coordsAtPos(e);
    if (e > n.start()) {
      let o = t.coordsAtPos(e - 1), s = (o.top + o.bottom) / 2;
      if (s > i.top && s < i.bottom && Math.abs(o.left - i.left) > 1)
        return o.left < i.left ? "ltr" : "rtl";
    }
    if (e < n.end()) {
      let o = t.coordsAtPos(e + 1), s = (o.top + o.bottom) / 2;
      if (s > i.top && s < i.bottom && Math.abs(o.left - i.left) > 1)
        return o.left > i.left ? "ltr" : "rtl";
    }
  }
  return getComputedStyle(t.dom).direction == "rtl" ? "rtl" : "ltr";
}
function eh(t, e, n) {
  let r = t.state.selection;
  if (r instanceof Z && !r.empty || n.indexOf("s") > -1 || Ct && n.indexOf("m") > -1)
    return !1;
  let { $from: i, $to: o } = r;
  if (!i.parent.inlineContent || t.endOfTextblock(e < 0 ? "up" : "down")) {
    let s = Ia(t.state, e);
    if (s && s instanceof Q)
      return Nn(t, s);
  }
  if (!i.parent.inlineContent) {
    let s = e < 0 ? i : o, l = r instanceof pt ? ee.near(s, e) : ee.findFrom(s, e);
    return l ? Nn(t, l) : !1;
  }
  return !1;
}
function th(t, e) {
  if (!(t.state.selection instanceof Z))
    return !0;
  let { $head: n, $anchor: r, empty: i } = t.state.selection;
  if (!n.sameParent(r))
    return !0;
  if (!i)
    return !1;
  if (t.endOfTextblock(e > 0 ? "forward" : "backward"))
    return !0;
  let o = !n.textOffset && (e < 0 ? n.nodeBefore : n.nodeAfter);
  if (o && !o.isText) {
    let s = t.state.tr;
    return e < 0 ? s.delete(n.pos - o.nodeSize, n.pos) : s.delete(n.pos, n.pos + o.nodeSize), t.dispatch(s), !0;
  }
  return !1;
}
function nh(t, e, n) {
  t.domObserver.stop(), e.contentEditable = n, t.domObserver.start();
}
function Ix(t) {
  if (!$e || t.state.selection.$head.parentOffset > 0)
    return !1;
  let { focusNode: e, focusOffset: n } = t.domSelectionRange();
  if (e && e.nodeType == 1 && n == 0 && e.firstChild && e.firstChild.contentEditable == "false") {
    let r = e.firstChild;
    nh(t, r, "true"), setTimeout(() => nh(t, r, "false"), 20);
  }
  return !1;
}
function Ex(t) {
  let e = "";
  return t.ctrlKey && (e += "c"), t.metaKey && (e += "m"), t.altKey && (e += "a"), t.shiftKey && (e += "s"), e;
}
function Ax(t, e) {
  let n = e.keyCode, r = Ex(e);
  if (n == 8 || Ct && n == 72 && r == "c")
    return th(t, -1) || Ir(t, -1);
  if (n == 46 && !e.shiftKey || Ct && n == 68 && r == "c")
    return th(t, 1) || Ir(t, 1);
  if (n == 13 || n == 27)
    return !0;
  if (n == 37 || Ct && n == 66 && r == "c") {
    let i = n == 37 ? Zf(t, t.state.selection.from) == "ltr" ? -1 : 1 : -1;
    return Xf(t, i, r) || Ir(t, i);
  } else if (n == 39 || Ct && n == 70 && r == "c") {
    let i = n == 39 ? Zf(t, t.state.selection.from) == "ltr" ? 1 : -1 : 1;
    return Xf(t, i, r) || Ir(t, i);
  } else {
    if (n == 38 || Ct && n == 80 && r == "c")
      return eh(t, -1, r) || Ir(t, -1);
    if (n == 40 || Ct && n == 78 && r == "c")
      return Ix(t) || eh(t, 1, r) || Ir(t, 1);
    if (r == (Ct ? "m" : "c") && (n == 66 || n == 73 || n == 89 || n == 90))
      return !0;
  }
  return !1;
}
function hu(t, e) {
  t.someProp("transformCopied", (d) => {
    e = d(e, t);
  });
  let n = [], { content: r, openStart: i, openEnd: o } = e;
  for (; i > 1 && o > 1 && r.childCount == 1 && r.firstChild.childCount == 1; ) {
    i--, o--;
    let d = r.firstChild;
    n.push(d.type.name, d.attrs != d.type.defaultAttrs ? d.attrs : null), r = d.content;
  }
  let s = t.someProp("clipboardSerializer") || pi.fromSchema(t.state.schema), l = Kp(), a = l.createElement("div");
  a.appendChild(s.serializeFragment(r, { document: l }));
  let u = a.firstChild, c, f = 0;
  for (; u && u.nodeType == 1 && (c = Wp[u.nodeName.toLowerCase()]); ) {
    for (let d = c.length - 1; d >= 0; d--) {
      let p = l.createElement(c[d]);
      for (; a.firstChild; )
        p.appendChild(a.firstChild);
      a.appendChild(p), f++;
    }
    u = a.firstChild;
  }
  u && u.nodeType == 1 && u.setAttribute("data-pm-slice", `${i} ${o}${f ? ` -${f}` : ""} ${JSON.stringify(n)}`);
  let h = t.someProp("clipboardTextSerializer", (d) => d(e, t)) || e.content.textBetween(0, e.content.size, `

`);
  return { dom: a, text: h, slice: e };
}
function Vp(t, e, n, r, i) {
  let o = i.parent.type.spec.code, s, l;
  if (!n && !e)
    return null;
  let a = !!e && (r || o || !n);
  if (a) {
    if (t.someProp("transformPastedText", (h) => {
      e = h(e, o || r, t);
    }), o)
      return l = new F(A.from(t.state.schema.text(e.replace(/\r\n?/g, `
`))), 0, 0), t.someProp("transformPasted", (h) => {
        l = h(l, t, !0);
      }), l;
    let f = t.someProp("clipboardTextParser", (h) => h(e, i, r, t));
    if (f)
      l = f;
    else {
      let h = i.marks(), { schema: d } = t.state, p = pi.fromSchema(d);
      s = document.createElement("div"), e.split(/(?:\r\n?|\n)+/).forEach((m) => {
        let k = s.appendChild(document.createElement("p"));
        m && k.appendChild(p.serializeNode(d.text(m, h)));
      });
    }
  } else
    t.someProp("transformPastedHTML", (f) => {
      n = f(n, t);
    }), s = Lx(n), Io && zx(s);
  let u = s && s.querySelector("[data-pm-slice]"), c = u && /^(\d+) (\d+)(?: -(\d+))? (.*)/.exec(u.getAttribute("data-pm-slice") || "");
  if (c && c[3])
    for (let f = +c[3]; f > 0; f--) {
      let h = s.firstChild;
      for (; h && h.nodeType != 1; )
        h = h.nextSibling;
      if (!h)
        break;
      s = h;
    }
  if (l || (l = (t.someProp("clipboardParser") || t.someProp("domParser") || si.fromSchema(t.state.schema)).parseSlice(s, {
    preserveWhitespace: !!(a || c),
    context: i,
    ruleFromNode(h) {
      return h.nodeName == "BR" && !h.nextSibling && h.parentNode && !Ox.test(h.parentNode.nodeName) ? { ignore: !0 } : null;
    }
  })), c)
    l = Px(rh(l, +c[1], +c[2]), c[4]);
  else if (l = F.maxOpen(Dx(l.content, i), !0), l.openStart || l.openEnd) {
    let f = 0, h = 0;
    for (let d = l.content.firstChild; f < l.openStart && !d.type.spec.isolating; f++, d = d.firstChild)
      ;
    for (let d = l.content.lastChild; h < l.openEnd && !d.type.spec.isolating; h++, d = d.lastChild)
      ;
    l = rh(l, f, h);
  }
  return t.someProp("transformPasted", (f) => {
    l = f(l, t, a);
  }), l;
}
const Ox = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var)$/i;
function Dx(t, e) {
  if (t.childCount < 2)
    return t;
  for (let n = e.depth; n >= 0; n--) {
    let i = e.node(n).contentMatchAt(e.index(n)), o, s = [];
    if (t.forEach((l) => {
      if (!s)
        return;
      let a = i.findWrapping(l.type), u;
      if (!a)
        return s = null;
      if (u = s.length && o.length && jp(a, o, l, s[s.length - 1], 0))
        s[s.length - 1] = u;
      else {
        s.length && (s[s.length - 1] = qp(s[s.length - 1], o.length));
        let c = Hp(l, a);
        s.push(c), i = i.matchType(c.type), o = a;
      }
    }), s)
      return A.from(s);
  }
  return t;
}
function Hp(t, e, n = 0) {
  for (let r = e.length - 1; r >= n; r--)
    t = e[r].create(null, A.from(t));
  return t;
}
function jp(t, e, n, r, i) {
  if (i < t.length && i < e.length && t[i] == e[i]) {
    let o = jp(t, e, n, r.lastChild, i + 1);
    if (o)
      return r.copy(r.content.replaceChild(r.childCount - 1, o));
    if (r.contentMatchAt(r.childCount).matchType(i == t.length - 1 ? n.type : t[i + 1]))
      return r.copy(r.content.append(A.from(Hp(n, t, i + 1))));
  }
}
function qp(t, e) {
  if (e == 0)
    return t;
  let n = t.content.replaceChild(t.childCount - 1, qp(t.lastChild, e - 1)), r = t.contentMatchAt(t.childCount).fillBefore(A.empty, !0);
  return t.copy(n.append(r));
}
function Aa(t, e, n, r, i, o) {
  let s = e < 0 ? t.firstChild : t.lastChild, l = s.content;
  return t.childCount > 1 && (o = 0), i < r - 1 && (l = Aa(l, e, n, r, i + 1, o)), i >= n && (l = e < 0 ? s.contentMatchAt(0).fillBefore(l, o <= i).append(l) : l.append(s.contentMatchAt(s.childCount).fillBefore(A.empty, !0))), t.replaceChild(e < 0 ? 0 : t.childCount - 1, s.copy(l));
}
function rh(t, e, n) {
  return e < t.openStart && (t = new F(Aa(t.content, -1, e, t.openStart, 0, t.openEnd), e, t.openEnd)), n < t.openEnd && (t = new F(Aa(t.content, 1, n, t.openEnd, 0, 0), t.openStart, n)), t;
}
const Wp = {
  thead: ["table"],
  tbody: ["table"],
  tfoot: ["table"],
  caption: ["table"],
  colgroup: ["table"],
  col: ["table", "colgroup"],
  tr: ["table", "tbody"],
  td: ["table", "tbody", "tr"],
  th: ["table", "tbody", "tr"]
};
let ih = null;
function Kp() {
  return ih || (ih = document.implementation.createHTMLDocument("title"));
}
let Al = null;
function Rx(t) {
  let e = window.trustedTypes;
  return e ? (Al || (Al = e.defaultPolicy || e.createPolicy("ProseMirrorClipboard", { createHTML: (n) => n })), Al.createHTML(t)) : t;
}
function Lx(t) {
  let e = /^(\s*<meta [^>]*>)*/.exec(t);
  e && (t = t.slice(e[0].length));
  let n = Kp().createElement("div"), r = /<([a-z][^>\s]+)/i.exec(t), i;
  if ((i = r && Wp[r[1].toLowerCase()]) && (t = i.map((o) => "<" + o + ">").join("") + t + i.map((o) => "</" + o + ">").reverse().join("")), n.innerHTML = Rx(t), i)
    for (let o = 0; o < i.length; o++)
      n = n.querySelector(i[o]) || n;
  return n;
}
function zx(t) {
  let e = t.querySelectorAll(Le ? "span:not([class]):not([style])" : "span.Apple-converted-space");
  for (let n = 0; n < e.length; n++) {
    let r = e[n];
    r.childNodes.length == 1 && r.textContent == " " && r.parentNode && r.parentNode.replaceChild(t.ownerDocument.createTextNode(" "), r);
  }
}
function Px(t, e) {
  if (!t.size)
    return t;
  let n = t.content.firstChild.type.schema, r;
  try {
    r = JSON.parse(e);
  } catch {
    return t;
  }
  let { content: i, openStart: o, openEnd: s } = t;
  for (let l = r.length - 2; l >= 0; l -= 2) {
    let a = n.nodes[r[l]];
    if (!a || a.hasRequiredAttrs())
      break;
    i = A.from(a.create(r[l + 1], i)), o++, s++;
  }
  return new F(i, o, s);
}
const Ke = {}, Ue = {}, Bx = { touchstart: !0, touchmove: !0 };
class Fx {
  constructor() {
    this.shiftKey = !1, this.mouseDown = null, this.lastKeyCode = null, this.lastKeyCodeTime = 0, this.lastClick = { time: 0, x: 0, y: 0, type: "", button: 0 }, this.lastSelectionOrigin = null, this.lastSelectionTime = 0, this.lastIOSEnter = 0, this.lastIOSEnterFallbackTimeout = -1, this.lastFocus = 0, this.lastTouch = 0, this.lastChromeDelete = 0, this.composing = !1, this.compositionNode = null, this.composingTimeout = -1, this.compositionNodes = [], this.compositionEndedAt = -2e8, this.compositionID = 1, this.badSafariComposition = !1, this.compositionPendingChanges = 0, this.domChangeCount = 0, this.eventHandlers = /* @__PURE__ */ Object.create(null), this.hideSelectionGuard = null;
  }
}
function $x(t) {
  for (let e in Ke) {
    let n = Ke[e];
    t.dom.addEventListener(e, t.input.eventHandlers[e] = (r) => {
      Vx(t, r) && !du(t, r) && (t.editable || !(r.type in Ue)) && n(t, r);
    }, Bx[e] ? { passive: !0 } : void 0);
  }
  $e && t.dom.addEventListener("input", () => null), Oa(t);
}
function zn(t, e) {
  t.input.lastSelectionOrigin = e, t.input.lastSelectionTime = Date.now();
}
function _x(t) {
  t.domObserver.stop();
  for (let e in t.input.eventHandlers)
    t.dom.removeEventListener(e, t.input.eventHandlers[e]);
  clearTimeout(t.input.composingTimeout), clearTimeout(t.input.lastIOSEnterFallbackTimeout);
}
function Oa(t) {
  t.someProp("handleDOMEvents", (e) => {
    for (let n in e)
      t.input.eventHandlers[n] || t.dom.addEventListener(n, t.input.eventHandlers[n] = (r) => du(t, r));
  });
}
function du(t, e) {
  return t.someProp("handleDOMEvents", (n) => {
    let r = n[e.type];
    return r ? r(t, e) || e.defaultPrevented : !1;
  });
}
function Vx(t, e) {
  if (!e.bubbles)
    return !0;
  if (e.defaultPrevented)
    return !1;
  for (let n = e.target; n != t.dom; n = n.parentNode)
    if (!n || n.nodeType == 11 || n.pmViewDesc && n.pmViewDesc.stopEvent(e))
      return !1;
  return !0;
}
function Hx(t, e) {
  !du(t, e) && Ke[e.type] && (t.editable || !(e.type in Ue)) && Ke[e.type](t, e);
}
Ue.keydown = (t, e) => {
  let n = e;
  if (t.input.shiftKey = n.keyCode == 16 || n.shiftKey, !Jp(t, n) && (t.input.lastKeyCode = n.keyCode, t.input.lastKeyCodeTime = Date.now(), !(cn && Le && n.keyCode == 13)))
    if (n.keyCode != 229 && t.domObserver.forceFlush(), ci && n.keyCode == 13 && !n.ctrlKey && !n.altKey && !n.metaKey) {
      let r = Date.now();
      t.input.lastIOSEnter = r, t.input.lastIOSEnterFallbackTimeout = setTimeout(() => {
        t.input.lastIOSEnter == r && (t.someProp("handleKeyDown", (i) => i(t, Gn(13, "Enter"))), t.input.lastIOSEnter = 0);
      }, 200);
    } else t.someProp("handleKeyDown", (r) => r(t, n)) || Ax(t, n) ? n.preventDefault() : zn(t, "key");
};
Ue.keyup = (t, e) => {
  e.keyCode == 16 && (t.input.shiftKey = !1);
};
Ue.keypress = (t, e) => {
  let n = e;
  if (Jp(t, n) || !n.charCode || n.ctrlKey && !n.altKey || Ct && n.metaKey)
    return;
  if (t.someProp("handleKeyPress", (i) => i(t, n))) {
    n.preventDefault();
    return;
  }
  let r = t.state.selection;
  if (!(r instanceof Z) || !r.$from.sameParent(r.$to)) {
    let i = String.fromCharCode(n.charCode), o = () => t.state.tr.insertText(i).scrollIntoView();
    !/[\r\n]/.test(i) && !t.someProp("handleTextInput", (s) => s(t, r.$from.pos, r.$to.pos, i, o)) && t.dispatch(o()), n.preventDefault();
  }
};
function Gs(t) {
  return { left: t.clientX, top: t.clientY };
}
function jx(t, e) {
  let n = e.x - t.clientX, r = e.y - t.clientY;
  return n * n + r * r < 100;
}
function pu(t, e, n, r, i) {
  if (r == -1)
    return !1;
  let o = t.state.doc.resolve(r);
  for (let s = o.depth + 1; s > 0; s--)
    if (t.someProp(e, (l) => s > o.depth ? l(t, n, o.nodeAfter, o.before(s), i, !0) : l(t, n, o.node(s), o.before(s), i, !1)))
      return !0;
  return !1;
}
function Br(t, e, n) {
  if (t.focused || t.focus(), t.state.selection.eq(e))
    return;
  let r = t.state.tr.setSelection(e);
  r.setMeta("pointer", !0), t.dispatch(r);
}
function qx(t, e) {
  if (e == -1)
    return !1;
  let n = t.state.doc.resolve(e), r = n.nodeAfter;
  return r && r.isAtom && Q.isSelectable(r) ? (Br(t, new Q(n)), !0) : !1;
}
function Wx(t, e) {
  if (e == -1)
    return !1;
  let n = t.state.selection, r, i;
  n instanceof Q && (r = n.node);
  let o = t.state.doc.resolve(e);
  for (let s = o.depth + 1; s > 0; s--) {
    let l = s > o.depth ? o.nodeAfter : o.node(s);
    if (Q.isSelectable(l)) {
      r && n.$from.depth > 0 && s >= n.$from.depth && o.before(n.$from.depth + 1) == n.$from.pos ? i = o.before(n.$from.depth) : i = o.before(s);
      break;
    }
  }
  return i != null ? (Br(t, Q.create(t.state.doc, i)), !0) : !1;
}
function Kx(t, e, n, r, i) {
  return pu(t, "handleClickOn", e, n, r) || t.someProp("handleClick", (o) => o(t, e, r)) || (i ? Wx(t, n) : qx(t, n));
}
function Ux(t, e, n, r) {
  return pu(t, "handleDoubleClickOn", e, n, r) || t.someProp("handleDoubleClick", (i) => i(t, e, r));
}
function Jx(t, e, n, r) {
  return pu(t, "handleTripleClickOn", e, n, r) || t.someProp("handleTripleClick", (i) => i(t, e, r)) || Gx(t, n, r);
}
function Gx(t, e, n) {
  if (n.button != 0)
    return !1;
  let r = t.state.doc;
  if (e == -1)
    return r.inlineContent ? (Br(t, Z.create(r, 0, r.content.size)), !0) : !1;
  let i = r.resolve(e);
  for (let o = i.depth + 1; o > 0; o--) {
    let s = o > i.depth ? i.nodeAfter : i.node(o), l = i.before(o);
    if (s.inlineContent)
      Br(t, Z.create(r, l + 1, l + 1 + s.content.size));
    else if (Q.isSelectable(s))
      Br(t, Q.create(r, l));
    else
      continue;
    return !0;
  }
}
function mu(t) {
  return vs(t);
}
const Up = Ct ? "metaKey" : "ctrlKey";
Ke.mousedown = (t, e) => {
  let n = e;
  t.input.shiftKey = n.shiftKey;
  let r = mu(t), i = Date.now(), o = "singleClick";
  i - t.input.lastClick.time < 500 && jx(n, t.input.lastClick) && !n[Up] && t.input.lastClick.button == n.button && (t.input.lastClick.type == "singleClick" ? o = "doubleClick" : t.input.lastClick.type == "doubleClick" && (o = "tripleClick")), t.input.lastClick = { time: i, x: n.clientX, y: n.clientY, type: o, button: n.button };
  let s = t.posAtCoords(Gs(n));
  s && (o == "singleClick" ? (t.input.mouseDown && t.input.mouseDown.done(), t.input.mouseDown = new Yx(t, s, n, !!r)) : (o == "doubleClick" ? Ux : Jx)(t, s.pos, s.inside, n) ? n.preventDefault() : zn(t, "pointer"));
};
class Yx {
  constructor(e, n, r, i) {
    this.view = e, this.pos = n, this.event = r, this.flushed = i, this.delayedSelectionSync = !1, this.mightDrag = null, this.startDoc = e.state.doc, this.selectNode = !!r[Up], this.allowDefault = r.shiftKey;
    let o, s;
    if (n.inside > -1)
      o = e.state.doc.nodeAt(n.inside), s = n.inside;
    else {
      let c = e.state.doc.resolve(n.pos);
      o = c.parent, s = c.depth ? c.before() : 0;
    }
    const l = i ? null : r.target, a = l ? e.docView.nearestDesc(l, !0) : null;
    this.target = a && a.nodeDOM.nodeType == 1 ? a.nodeDOM : null;
    let { selection: u } = e.state;
    r.button == 0 && (o.type.spec.draggable && o.type.spec.selectable !== !1 || u instanceof Q && u.from <= s && u.to > s) && (this.mightDrag = {
      node: o,
      pos: s,
      addAttr: !!(this.target && !this.target.draggable),
      setUneditable: !!(this.target && Nt && !this.target.hasAttribute("contentEditable"))
    }), this.target && this.mightDrag && (this.mightDrag.addAttr || this.mightDrag.setUneditable) && (this.view.domObserver.stop(), this.mightDrag.addAttr && (this.target.draggable = !0), this.mightDrag.setUneditable && setTimeout(() => {
      this.view.input.mouseDown == this && this.target.setAttribute("contentEditable", "false");
    }, 20), this.view.domObserver.start()), e.root.addEventListener("mouseup", this.up = this.up.bind(this)), e.root.addEventListener("mousemove", this.move = this.move.bind(this)), zn(e, "pointer");
  }
  done() {
    this.view.root.removeEventListener("mouseup", this.up), this.view.root.removeEventListener("mousemove", this.move), this.mightDrag && this.target && (this.view.domObserver.stop(), this.mightDrag.addAttr && this.target.removeAttribute("draggable"), this.mightDrag.setUneditable && this.target.removeAttribute("contentEditable"), this.view.domObserver.start()), this.delayedSelectionSync && setTimeout(() => hn(this.view)), this.view.input.mouseDown = null;
  }
  up(e) {
    if (this.done(), !this.view.dom.contains(e.target))
      return;
    let n = this.pos;
    this.view.state.doc != this.startDoc && (n = this.view.posAtCoords(Gs(e))), this.updateAllowDefault(e), this.allowDefault || !n ? zn(this.view, "pointer") : Kx(this.view, n.pos, n.inside, e, this.selectNode) ? e.preventDefault() : e.button == 0 && (this.flushed || // Safari ignores clicks on draggable elements
    $e && this.mightDrag && !this.mightDrag.node.isAtom || // Chrome will sometimes treat a node selection as a
    // cursor, but still report that the node is selected
    // when asked through getSelection. You'll then get a
    // situation where clicking at the point where that
    // (hidden) cursor is doesn't change the selection, and
    // thus doesn't get a reaction from ProseMirror. This
    // works around that.
    Le && !this.view.state.selection.visible && Math.min(Math.abs(n.pos - this.view.state.selection.from), Math.abs(n.pos - this.view.state.selection.to)) <= 2) ? (Br(this.view, ee.near(this.view.state.doc.resolve(n.pos))), e.preventDefault()) : zn(this.view, "pointer");
  }
  move(e) {
    this.updateAllowDefault(e), zn(this.view, "pointer"), e.buttons == 0 && this.done();
  }
  updateAllowDefault(e) {
    !this.allowDefault && (Math.abs(this.event.x - e.clientX) > 4 || Math.abs(this.event.y - e.clientY) > 4) && (this.allowDefault = !0);
  }
}
Ke.touchstart = (t) => {
  t.input.lastTouch = Date.now(), mu(t), zn(t, "pointer");
};
Ke.touchmove = (t) => {
  t.input.lastTouch = Date.now(), zn(t, "pointer");
};
Ke.contextmenu = (t) => mu(t);
function Jp(t, e) {
  return t.composing ? !0 : $e && Math.abs(e.timeStamp - t.input.compositionEndedAt) < 500 ? (t.input.compositionEndedAt = -2e8, !0) : !1;
}
const Qx = cn ? 5e3 : -1;
Ue.compositionstart = Ue.compositionupdate = (t) => {
  if (!t.composing) {
    t.domObserver.flush();
    let { state: e } = t, n = e.selection.$to;
    if (e.selection instanceof Z && (e.storedMarks || !n.textOffset && n.parentOffset && n.nodeBefore.marks.some((r) => r.type.spec.inclusive === !1) || Le && Np && Xx(t)))
      t.markCursor = t.state.storedMarks || n.marks(), vs(t, !0), t.markCursor = null;
    else if (vs(t, !e.selection.empty), Nt && e.selection.empty && n.parentOffset && !n.textOffset && n.nodeBefore.marks.length) {
      let r = t.domSelectionRange();
      for (let i = r.focusNode, o = r.focusOffset; i && i.nodeType == 1 && o != 0; ) {
        let s = o < 0 ? i.lastChild : i.childNodes[o - 1];
        if (!s)
          break;
        if (s.nodeType == 3) {
          let l = t.domSelection();
          l && l.collapse(s, s.nodeValue.length);
          break;
        } else
          i = s, o = -1;
      }
    }
    t.input.composing = !0;
  }
  Gp(t, Qx);
};
function Xx(t) {
  let { focusNode: e, focusOffset: n } = t.domSelectionRange();
  if (!e || e.nodeType != 1 || n >= e.childNodes.length)
    return !1;
  let r = e.childNodes[n];
  return r.nodeType == 1 && r.contentEditable == "false";
}
Ue.compositionend = (t, e) => {
  t.composing && (t.input.composing = !1, t.input.compositionEndedAt = e.timeStamp, t.input.compositionPendingChanges = t.domObserver.pendingRecords().length ? t.input.compositionID : 0, t.input.compositionNode = null, t.input.badSafariComposition ? t.domObserver.forceFlush() : t.input.compositionPendingChanges && Promise.resolve().then(() => t.domObserver.flush()), t.input.compositionID++, Gp(t, 20));
};
function Gp(t, e) {
  clearTimeout(t.input.composingTimeout), e > -1 && (t.input.composingTimeout = setTimeout(() => vs(t), e));
}
function Yp(t) {
  for (t.composing && (t.input.composing = !1, t.input.compositionEndedAt = eC()); t.input.compositionNodes.length > 0; )
    t.input.compositionNodes.pop().markParentsDirty();
}
function Zx(t) {
  let e = t.domSelectionRange();
  if (!e.focusNode)
    return null;
  let n = Ww(e.focusNode, e.focusOffset), r = Kw(e.focusNode, e.focusOffset);
  if (n && r && n != r) {
    let i = r.pmViewDesc, o = t.domObserver.lastChangedTextNode;
    if (n == o || r == o)
      return o;
    if (!i || !i.isText(r.nodeValue))
      return r;
    if (t.input.compositionNode == r) {
      let s = n.pmViewDesc;
      if (!(!s || !s.isText(n.nodeValue)))
        return r;
    }
  }
  return n || r;
}
function eC() {
  let t = document.createEvent("Event");
  return t.initEvent("event", !0, !0), t.timeStamp;
}
function vs(t, e = !1) {
  if (!(cn && t.domObserver.flushingSoon >= 0)) {
    if (t.domObserver.forceFlush(), Yp(t), e || t.docView && t.docView.dirty) {
      let n = cu(t), r = t.state.selection;
      return n && !n.eq(r) ? t.dispatch(t.state.tr.setSelection(n)) : (t.markCursor || e) && !r.$from.node(r.$from.sharedDepth(r.to)).inlineContent ? t.dispatch(t.state.tr.deleteSelection()) : t.updateState(t.state), !0;
    }
    return !1;
  }
}
function tC(t, e) {
  if (!t.dom.parentNode)
    return;
  let n = t.dom.parentNode.appendChild(document.createElement("div"));
  n.appendChild(e), n.style.cssText = "position: fixed; left: -10000px; top: 10px";
  let r = getSelection(), i = document.createRange();
  i.selectNodeContents(e), t.dom.blur(), r.removeAllRanges(), r.addRange(i), setTimeout(() => {
    n.parentNode && n.parentNode.removeChild(n), t.focus();
  }, 50);
}
const Xi = it && Bn < 15 || ci && Yw < 604;
Ke.copy = Ue.cut = (t, e) => {
  let n = e, r = t.state.selection, i = n.type == "cut";
  if (r.empty)
    return;
  let o = Xi ? null : n.clipboardData, s = r.content(), { dom: l, text: a } = hu(t, s);
  o ? (n.preventDefault(), o.clearData(), o.setData("text/html", l.innerHTML), o.setData("text/plain", a)) : tC(t, l), i && t.dispatch(t.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
};
function nC(t) {
  return t.openStart == 0 && t.openEnd == 0 && t.content.childCount == 1 ? t.content.firstChild : null;
}
function rC(t, e) {
  if (!t.dom.parentNode)
    return;
  let n = t.input.shiftKey || t.state.selection.$from.parent.type.spec.code, r = t.dom.parentNode.appendChild(document.createElement(n ? "textarea" : "div"));
  n || (r.contentEditable = "true"), r.style.cssText = "position: fixed; left: -10000px; top: 10px", r.focus();
  let i = t.input.shiftKey && t.input.lastKeyCode != 45;
  setTimeout(() => {
    t.focus(), r.parentNode && r.parentNode.removeChild(r), n ? Zi(t, r.value, null, i, e) : Zi(t, r.textContent, r.innerHTML, i, e);
  }, 50);
}
function Zi(t, e, n, r, i) {
  let o = Vp(t, e, n, r, t.state.selection.$from);
  if (t.someProp("handlePaste", (a) => a(t, i, o || F.empty)))
    return !0;
  if (!o)
    return !1;
  let s = nC(o), l = s ? t.state.tr.replaceSelectionWith(s, r) : t.state.tr.replaceSelection(o);
  return t.dispatch(l.scrollIntoView().setMeta("paste", !0).setMeta("uiEvent", "paste")), !0;
}
function Qp(t) {
  let e = t.getData("text/plain") || t.getData("Text");
  if (e)
    return e;
  let n = t.getData("text/uri-list");
  return n ? n.replace(/\r?\n/g, " ") : "";
}
Ue.paste = (t, e) => {
  let n = e;
  if (t.composing && !cn)
    return;
  let r = Xi ? null : n.clipboardData, i = t.input.shiftKey && t.input.lastKeyCode != 45;
  r && Zi(t, Qp(r), r.getData("text/html"), i, n) ? n.preventDefault() : rC(t, n);
};
class Xp {
  constructor(e, n, r) {
    this.slice = e, this.move = n, this.node = r;
  }
}
const iC = Ct ? "altKey" : "ctrlKey";
function Zp(t, e) {
  let n;
  return t.someProp("dragCopies", (r) => {
    n = n || r(e);
  }), n != null ? !n : !e[iC];
}
Ke.dragstart = (t, e) => {
  let n = e, r = t.input.mouseDown;
  if (r && r.done(), !n.dataTransfer)
    return;
  let i = t.state.selection, o = i.empty ? null : t.posAtCoords(Gs(n)), s;
  if (!(o && o.pos >= i.from && o.pos <= (i instanceof Q ? i.to - 1 : i.to))) {
    if (r && r.mightDrag)
      s = Q.create(t.state.doc, r.mightDrag.pos);
    else if (n.target && n.target.nodeType == 1) {
      let f = t.docView.nearestDesc(n.target, !0);
      f && f.node.type.spec.draggable && f != t.docView && (s = Q.create(t.state.doc, f.posBefore));
    }
  }
  let l = (s || t.state.selection).content(), { dom: a, text: u, slice: c } = hu(t, l);
  (!n.dataTransfer.files.length || !Le || Mp > 120) && n.dataTransfer.clearData(), n.dataTransfer.setData(Xi ? "Text" : "text/html", a.innerHTML), n.dataTransfer.effectAllowed = "copyMove", Xi || n.dataTransfer.setData("text/plain", u), t.dragging = new Xp(c, Zp(t, n), s);
};
Ke.dragend = (t) => {
  let e = t.dragging;
  window.setTimeout(() => {
    t.dragging == e && (t.dragging = null);
  }, 50);
};
Ue.dragover = Ue.dragenter = (t, e) => e.preventDefault();
Ue.drop = (t, e) => {
  try {
    oC(t, e, t.dragging);
  } finally {
    t.dragging = null;
  }
};
function oC(t, e, n) {
  if (!e.dataTransfer)
    return;
  let r = t.posAtCoords(Gs(e));
  if (!r)
    return;
  let i = t.state.doc.resolve(r.pos), o = n && n.slice;
  o ? t.someProp("transformPasted", (d) => {
    o = d(o, t, !1);
  }) : o = Vp(t, Qp(e.dataTransfer), Xi ? null : e.dataTransfer.getData("text/html"), !1, i);
  let s = !!(n && Zp(t, e));
  if (t.someProp("handleDrop", (d) => d(t, e, o || F.empty, s))) {
    e.preventDefault();
    return;
  }
  if (!o)
    return;
  e.preventDefault();
  let l = o ? H0(t.state.doc, i.pos, o) : i.pos;
  l == null && (l = i.pos);
  let a = t.state.tr;
  if (s) {
    let { node: d } = n;
    d ? d.replace(a) : a.deleteSelection();
  }
  let u = a.mapping.map(l), c = o.openStart == 0 && o.openEnd == 0 && o.content.childCount == 1, f = a.doc;
  if (c ? a.replaceRangeWith(u, u, o.content.firstChild) : a.replaceRange(u, u, o), a.doc.eq(f))
    return;
  let h = a.doc.resolve(u);
  if (c && Q.isSelectable(o.content.firstChild) && h.nodeAfter && h.nodeAfter.sameMarkup(o.content.firstChild))
    a.setSelection(new Q(h));
  else {
    let d = a.mapping.map(l);
    a.mapping.maps[a.mapping.maps.length - 1].forEach((p, m, k, y) => d = y), a.setSelection(fu(t, h, a.doc.resolve(d)));
  }
  t.focus(), t.dispatch(a.setMeta("uiEvent", "drop"));
}
Ke.focus = (t) => {
  t.input.lastFocus = Date.now(), t.focused || (t.domObserver.stop(), t.dom.classList.add("ProseMirror-focused"), t.domObserver.start(), t.focused = !0, setTimeout(() => {
    t.docView && t.hasFocus() && !t.domObserver.currentSelection.eq(t.domSelectionRange()) && hn(t);
  }, 20));
};
Ke.blur = (t, e) => {
  let n = e;
  t.focused && (t.domObserver.stop(), t.dom.classList.remove("ProseMirror-focused"), t.domObserver.start(), n.relatedTarget && t.dom.contains(n.relatedTarget) && t.domObserver.currentSelection.clear(), t.focused = !1);
};
Ke.beforeinput = (t, e) => {
  if (Le && cn && e.inputType == "deleteContentBackward") {
    t.domObserver.flushSoon();
    let { domChangeCount: r } = t.input;
    setTimeout(() => {
      if (t.input.domChangeCount != r || (t.dom.blur(), t.focus(), t.someProp("handleKeyDown", (o) => o(t, Gn(8, "Backspace")))))
        return;
      let { $cursor: i } = t.state.selection;
      i && i.pos > 0 && t.dispatch(t.state.tr.delete(i.pos - 1, i.pos).scrollIntoView());
    }, 50);
  }
};
for (let t in Ue)
  Ke[t] = Ue[t];
function eo(t, e) {
  if (t == e)
    return !0;
  for (let n in t)
    if (t[n] !== e[n])
      return !1;
  for (let n in e)
    if (!(n in t))
      return !1;
  return !0;
}
class Is {
  constructor(e, n) {
    this.toDOM = e, this.spec = n || lr, this.side = this.spec.side || 0;
  }
  map(e, n, r, i) {
    let { pos: o, deleted: s } = e.mapResult(n.from + i, this.side < 0 ? -1 : 1);
    return s ? null : new ze(o - r, o - r, this);
  }
  valid() {
    return !0;
  }
  eq(e) {
    return this == e || e instanceof Is && (this.spec.key && this.spec.key == e.spec.key || this.toDOM == e.toDOM && eo(this.spec, e.spec));
  }
  destroy(e) {
    this.spec.destroy && this.spec.destroy(e);
  }
}
class $n {
  constructor(e, n) {
    this.attrs = e, this.spec = n || lr;
  }
  map(e, n, r, i) {
    let o = e.map(n.from + i, this.spec.inclusiveStart ? -1 : 1) - r, s = e.map(n.to + i, this.spec.inclusiveEnd ? 1 : -1) - r;
    return o >= s ? null : new ze(o, s, this);
  }
  valid(e, n) {
    return n.from < n.to;
  }
  eq(e) {
    return this == e || e instanceof $n && eo(this.attrs, e.attrs) && eo(this.spec, e.spec);
  }
  static is(e) {
    return e.type instanceof $n;
  }
  destroy() {
  }
}
class gu {
  constructor(e, n) {
    this.attrs = e, this.spec = n || lr;
  }
  map(e, n, r, i) {
    let o = e.mapResult(n.from + i, 1);
    if (o.deleted)
      return null;
    let s = e.mapResult(n.to + i, -1);
    return s.deleted || s.pos <= o.pos ? null : new ze(o.pos - r, s.pos - r, this);
  }
  valid(e, n) {
    let { index: r, offset: i } = e.content.findIndex(n.from), o;
    return i == n.from && !(o = e.child(r)).isText && i + o.nodeSize == n.to;
  }
  eq(e) {
    return this == e || e instanceof gu && eo(this.attrs, e.attrs) && eo(this.spec, e.spec);
  }
  destroy() {
  }
}
class ze {
  /**
  @internal
  */
  constructor(e, n, r) {
    this.from = e, this.to = n, this.type = r;
  }
  /**
  @internal
  */
  copy(e, n) {
    return new ze(e, n, this.type);
  }
  /**
  @internal
  */
  eq(e, n = 0) {
    return this.type.eq(e.type) && this.from + n == e.from && this.to + n == e.to;
  }
  /**
  @internal
  */
  map(e, n, r) {
    return this.type.map(e, this, n, r);
  }
  /**
  Creates a widget decoration, which is a DOM node that's shown in
  the document at the given position. It is recommended that you
  delay rendering the widget by passing a function that will be
  called when the widget is actually drawn in a view, but you can
  also directly pass a DOM node. `getPos` can be used to find the
  widget's current document position.
  */
  static widget(e, n, r) {
    return new ze(e, e, new Is(n, r));
  }
  /**
  Creates an inline decoration, which adds the given attributes to
  each inline node between `from` and `to`.
  */
  static inline(e, n, r, i) {
    return new ze(e, n, new $n(r, i));
  }
  /**
  Creates a node decoration. `from` and `to` should point precisely
  before and after a node in the document. That node, and only that
  node, will receive the given attributes.
  */
  static node(e, n, r, i) {
    return new ze(e, n, new gu(r, i));
  }
  /**
  The spec provided when creating this decoration. Can be useful
  if you've stored extra information in that object.
  */
  get spec() {
    return this.type.spec;
  }
  /**
  @internal
  */
  get inline() {
    return this.type instanceof $n;
  }
  /**
  @internal
  */
  get widget() {
    return this.type instanceof Is;
  }
}
const Ar = [], lr = {};
class ge {
  /**
  @internal
  */
  constructor(e, n) {
    this.local = e.length ? e : Ar, this.children = n.length ? n : Ar;
  }
  /**
  Create a set of decorations, using the structure of the given
  document. This will consume (modify) the `decorations` array, so
  you must make a copy if you want need to preserve that.
  */
  static create(e, n) {
    return n.length ? Es(n, e, 0, lr) : Be;
  }
  /**
  Find all decorations in this set which touch the given range
  (including decorations that start or end directly at the
  boundaries) and match the given predicate on their spec. When
  `start` and `end` are omitted, all decorations in the set are
  considered. When `predicate` isn't given, all decorations are
  assumed to match.
  */
  find(e, n, r) {
    let i = [];
    return this.findInner(e ?? 0, n ?? 1e9, i, 0, r), i;
  }
  findInner(e, n, r, i, o) {
    for (let s = 0; s < this.local.length; s++) {
      let l = this.local[s];
      l.from <= n && l.to >= e && (!o || o(l.spec)) && r.push(l.copy(l.from + i, l.to + i));
    }
    for (let s = 0; s < this.children.length; s += 3)
      if (this.children[s] < n && this.children[s + 1] > e) {
        let l = this.children[s] + 1;
        this.children[s + 2].findInner(e - l, n - l, r, i + l, o);
      }
  }
  /**
  Map the set of decorations in response to a change in the
  document.
  */
  map(e, n, r) {
    return this == Be || e.maps.length == 0 ? this : this.mapInner(e, n, 0, 0, r || lr);
  }
  /**
  @internal
  */
  mapInner(e, n, r, i, o) {
    let s;
    for (let l = 0; l < this.local.length; l++) {
      let a = this.local[l].map(e, r, i);
      a && a.type.valid(n, a) ? (s || (s = [])).push(a) : o.onRemove && o.onRemove(this.local[l].spec);
    }
    return this.children.length ? sC(this.children, s || [], e, n, r, i, o) : s ? new ge(s.sort(ar), Ar) : Be;
  }
  /**
  Add the given array of decorations to the ones in the set,
  producing a new set. Consumes the `decorations` array. Needs
  access to the current document to create the appropriate tree
  structure.
  */
  add(e, n) {
    return n.length ? this == Be ? ge.create(e, n) : this.addInner(e, n, 0) : this;
  }
  addInner(e, n, r) {
    let i, o = 0;
    e.forEach((l, a) => {
      let u = a + r, c;
      if (c = tm(n, l, u)) {
        for (i || (i = this.children.slice()); o < i.length && i[o] < a; )
          o += 3;
        i[o] == a ? i[o + 2] = i[o + 2].addInner(l, c, u + 1) : i.splice(o, 0, a, a + l.nodeSize, Es(c, l, u + 1, lr)), o += 3;
      }
    });
    let s = em(o ? nm(n) : n, -r);
    for (let l = 0; l < s.length; l++)
      s[l].type.valid(e, s[l]) || s.splice(l--, 1);
    return new ge(s.length ? this.local.concat(s).sort(ar) : this.local, i || this.children);
  }
  /**
  Create a new set that contains the decorations in this set, minus
  the ones in the given array.
  */
  remove(e) {
    return e.length == 0 || this == Be ? this : this.removeInner(e, 0);
  }
  removeInner(e, n) {
    let r = this.children, i = this.local;
    for (let o = 0; o < r.length; o += 3) {
      let s, l = r[o] + n, a = r[o + 1] + n;
      for (let c = 0, f; c < e.length; c++)
        (f = e[c]) && f.from > l && f.to < a && (e[c] = null, (s || (s = [])).push(f));
      if (!s)
        continue;
      r == this.children && (r = this.children.slice());
      let u = r[o + 2].removeInner(s, l + 1);
      u != Be ? r[o + 2] = u : (r.splice(o, 3), o -= 3);
    }
    if (i.length) {
      for (let o = 0, s; o < e.length; o++)
        if (s = e[o])
          for (let l = 0; l < i.length; l++)
            i[l].eq(s, n) && (i == this.local && (i = this.local.slice()), i.splice(l--, 1));
    }
    return r == this.children && i == this.local ? this : i.length || r.length ? new ge(i, r) : Be;
  }
  forChild(e, n) {
    if (this == Be)
      return this;
    if (n.isLeaf)
      return ge.empty;
    let r, i;
    for (let l = 0; l < this.children.length; l += 3)
      if (this.children[l] >= e) {
        this.children[l] == e && (r = this.children[l + 2]);
        break;
      }
    let o = e + 1, s = o + n.content.size;
    for (let l = 0; l < this.local.length; l++) {
      let a = this.local[l];
      if (a.from < s && a.to > o && a.type instanceof $n) {
        let u = Math.max(o, a.from) - o, c = Math.min(s, a.to) - o;
        u < c && (i || (i = [])).push(a.copy(u, c));
      }
    }
    if (i) {
      let l = new ge(i.sort(ar), Ar);
      return r ? new In([l, r]) : l;
    }
    return r || Be;
  }
  /**
  @internal
  */
  eq(e) {
    if (this == e)
      return !0;
    if (!(e instanceof ge) || this.local.length != e.local.length || this.children.length != e.children.length)
      return !1;
    for (let n = 0; n < this.local.length; n++)
      if (!this.local[n].eq(e.local[n]))
        return !1;
    for (let n = 0; n < this.children.length; n += 3)
      if (this.children[n] != e.children[n] || this.children[n + 1] != e.children[n + 1] || !this.children[n + 2].eq(e.children[n + 2]))
        return !1;
    return !0;
  }
  /**
  @internal
  */
  locals(e) {
    return yu(this.localsInner(e));
  }
  /**
  @internal
  */
  localsInner(e) {
    if (this == Be)
      return Ar;
    if (e.inlineContent || !this.local.some($n.is))
      return this.local;
    let n = [];
    for (let r = 0; r < this.local.length; r++)
      this.local[r].type instanceof $n || n.push(this.local[r]);
    return n;
  }
  forEachSet(e) {
    e(this);
  }
}
ge.empty = new ge([], []);
ge.removeOverlap = yu;
const Be = ge.empty;
class In {
  constructor(e) {
    this.members = e;
  }
  map(e, n) {
    const r = this.members.map((i) => i.map(e, n, lr));
    return In.from(r);
  }
  forChild(e, n) {
    if (n.isLeaf)
      return ge.empty;
    let r = [];
    for (let i = 0; i < this.members.length; i++) {
      let o = this.members[i].forChild(e, n);
      o != Be && (o instanceof In ? r = r.concat(o.members) : r.push(o));
    }
    return In.from(r);
  }
  eq(e) {
    if (!(e instanceof In) || e.members.length != this.members.length)
      return !1;
    for (let n = 0; n < this.members.length; n++)
      if (!this.members[n].eq(e.members[n]))
        return !1;
    return !0;
  }
  locals(e) {
    let n, r = !0;
    for (let i = 0; i < this.members.length; i++) {
      let o = this.members[i].localsInner(e);
      if (o.length)
        if (!n)
          n = o;
        else {
          r && (n = n.slice(), r = !1);
          for (let s = 0; s < o.length; s++)
            n.push(o[s]);
        }
    }
    return n ? yu(r ? n : n.sort(ar)) : Ar;
  }
  // Create a group for the given array of decoration sets, or return
  // a single set when possible.
  static from(e) {
    switch (e.length) {
      case 0:
        return Be;
      case 1:
        return e[0];
      default:
        return new In(e.every((n) => n instanceof ge) ? e : e.reduce((n, r) => n.concat(r instanceof ge ? r : r.members), []));
    }
  }
  forEachSet(e) {
    for (let n = 0; n < this.members.length; n++)
      this.members[n].forEachSet(e);
  }
}
function sC(t, e, n, r, i, o, s) {
  let l = t.slice();
  for (let u = 0, c = o; u < n.maps.length; u++) {
    let f = 0;
    n.maps[u].forEach((h, d, p, m) => {
      let k = m - p - (d - h);
      for (let y = 0; y < l.length; y += 3) {
        let O = l[y + 1];
        if (O < 0 || h > O + c - f)
          continue;
        let T = l[y] + c - f;
        d >= T ? l[y + 1] = h <= T ? -2 : -1 : h >= c && k && (l[y] += k, l[y + 1] += k);
      }
      f += k;
    }), c = n.maps[u].map(c, -1);
  }
  let a = !1;
  for (let u = 0; u < l.length; u += 3)
    if (l[u + 1] < 0) {
      if (l[u + 1] == -2) {
        a = !0, l[u + 1] = -1;
        continue;
      }
      let c = n.map(t[u] + o), f = c - i;
      if (f < 0 || f >= r.content.size) {
        a = !0;
        continue;
      }
      let h = n.map(t[u + 1] + o, -1), d = h - i, { index: p, offset: m } = r.content.findIndex(f), k = r.maybeChild(p);
      if (k && m == f && m + k.nodeSize == d) {
        let y = l[u + 2].mapInner(n, k, c + 1, t[u] + o + 1, s);
        y != Be ? (l[u] = f, l[u + 1] = d, l[u + 2] = y) : (l[u + 1] = -2, a = !0);
      } else
        a = !0;
    }
  if (a) {
    let u = lC(l, t, e, n, i, o, s), c = Es(u, r, 0, s);
    e = c.local;
    for (let f = 0; f < l.length; f += 3)
      l[f + 1] < 0 && (l.splice(f, 3), f -= 3);
    for (let f = 0, h = 0; f < c.children.length; f += 3) {
      let d = c.children[f];
      for (; h < l.length && l[h] < d; )
        h += 3;
      l.splice(h, 0, c.children[f], c.children[f + 1], c.children[f + 2]);
    }
  }
  return new ge(e.sort(ar), l);
}
function em(t, e) {
  if (!e || !t.length)
    return t;
  let n = [];
  for (let r = 0; r < t.length; r++) {
    let i = t[r];
    n.push(new ze(i.from + e, i.to + e, i.type));
  }
  return n;
}
function lC(t, e, n, r, i, o, s) {
  function l(a, u) {
    for (let c = 0; c < a.local.length; c++) {
      let f = a.local[c].map(r, i, u);
      f ? n.push(f) : s.onRemove && s.onRemove(a.local[c].spec);
    }
    for (let c = 0; c < a.children.length; c += 3)
      l(a.children[c + 2], a.children[c] + u + 1);
  }
  for (let a = 0; a < t.length; a += 3)
    t[a + 1] == -1 && l(t[a + 2], e[a] + o + 1);
  return n;
}
function tm(t, e, n) {
  if (e.isLeaf)
    return null;
  let r = n + e.nodeSize, i = null;
  for (let o = 0, s; o < t.length; o++)
    (s = t[o]) && s.from > n && s.to < r && ((i || (i = [])).push(s), t[o] = null);
  return i;
}
function nm(t) {
  let e = [];
  for (let n = 0; n < t.length; n++)
    t[n] != null && e.push(t[n]);
  return e;
}
function Es(t, e, n, r) {
  let i = [], o = !1;
  e.forEach((l, a) => {
    let u = tm(t, l, a + n);
    if (u) {
      o = !0;
      let c = Es(u, l, n + a + 1, r);
      c != Be && i.push(a, a + l.nodeSize, c);
    }
  });
  let s = em(o ? nm(t) : t, -n).sort(ar);
  for (let l = 0; l < s.length; l++)
    s[l].type.valid(e, s[l]) || (r.onRemove && r.onRemove(s[l].spec), s.splice(l--, 1));
  return s.length || i.length ? new ge(s, i) : Be;
}
function ar(t, e) {
  return t.from - e.from || t.to - e.to;
}
function yu(t) {
  let e = t;
  for (let n = 0; n < e.length - 1; n++) {
    let r = e[n];
    if (r.from != r.to)
      for (let i = n + 1; i < e.length; i++) {
        let o = e[i];
        if (o.from == r.from) {
          o.to != r.to && (e == t && (e = t.slice()), e[i] = o.copy(o.from, r.to), oh(e, i + 1, o.copy(r.to, o.to)));
          continue;
        } else {
          o.from < r.to && (e == t && (e = t.slice()), e[n] = r.copy(r.from, o.from), oh(e, i, r.copy(o.from, r.to)));
          break;
        }
      }
  }
  return e;
}
function oh(t, e, n) {
  for (; e < t.length && ar(n, t[e]) > 0; )
    e++;
  t.splice(e, 0, n);
}
function Ol(t) {
  let e = [];
  return t.someProp("decorations", (n) => {
    let r = n(t.state);
    r && r != Be && e.push(r);
  }), t.cursorWrapper && e.push(ge.create(t.state.doc, [t.cursorWrapper.deco])), In.from(e);
}
const aC = {
  childList: !0,
  characterData: !0,
  characterDataOldValue: !0,
  attributes: !0,
  attributeOldValue: !0,
  subtree: !0
}, uC = it && Bn <= 11;
class cC {
  constructor() {
    this.anchorNode = null, this.anchorOffset = 0, this.focusNode = null, this.focusOffset = 0;
  }
  set(e) {
    this.anchorNode = e.anchorNode, this.anchorOffset = e.anchorOffset, this.focusNode = e.focusNode, this.focusOffset = e.focusOffset;
  }
  clear() {
    this.anchorNode = this.focusNode = null;
  }
  eq(e) {
    return e.anchorNode == this.anchorNode && e.anchorOffset == this.anchorOffset && e.focusNode == this.focusNode && e.focusOffset == this.focusOffset;
  }
}
class fC {
  constructor(e, n) {
    this.view = e, this.handleDOMChange = n, this.queue = [], this.flushingSoon = -1, this.observer = null, this.currentSelection = new cC(), this.onCharData = null, this.suppressingSelectionUpdates = !1, this.lastChangedTextNode = null, this.observer = window.MutationObserver && new window.MutationObserver((r) => {
      for (let i = 0; i < r.length; i++)
        this.queue.push(r[i]);
      it && Bn <= 11 && r.some((i) => i.type == "childList" && i.removedNodes.length || i.type == "characterData" && i.oldValue.length > i.target.nodeValue.length) ? this.flushSoon() : $e && e.composing && r.some((i) => i.type == "childList" && i.target.nodeName == "TR") ? (e.input.badSafariComposition = !0, this.flushSoon()) : this.flush();
    }), uC && (this.onCharData = (r) => {
      this.queue.push({ target: r.target, type: "characterData", oldValue: r.prevValue }), this.flushSoon();
    }), this.onSelectionChange = this.onSelectionChange.bind(this);
  }
  flushSoon() {
    this.flushingSoon < 0 && (this.flushingSoon = window.setTimeout(() => {
      this.flushingSoon = -1, this.flush();
    }, 20));
  }
  forceFlush() {
    this.flushingSoon > -1 && (window.clearTimeout(this.flushingSoon), this.flushingSoon = -1, this.flush());
  }
  start() {
    this.observer && (this.observer.takeRecords(), this.observer.observe(this.view.dom, aC)), this.onCharData && this.view.dom.addEventListener("DOMCharacterDataModified", this.onCharData), this.connectSelection();
  }
  stop() {
    if (this.observer) {
      let e = this.observer.takeRecords();
      if (e.length) {
        for (let n = 0; n < e.length; n++)
          this.queue.push(e[n]);
        window.setTimeout(() => this.flush(), 20);
      }
      this.observer.disconnect();
    }
    this.onCharData && this.view.dom.removeEventListener("DOMCharacterDataModified", this.onCharData), this.disconnectSelection();
  }
  connectSelection() {
    this.view.dom.ownerDocument.addEventListener("selectionchange", this.onSelectionChange);
  }
  disconnectSelection() {
    this.view.dom.ownerDocument.removeEventListener("selectionchange", this.onSelectionChange);
  }
  suppressSelectionUpdates() {
    this.suppressingSelectionUpdates = !0, setTimeout(() => this.suppressingSelectionUpdates = !1, 50);
  }
  onSelectionChange() {
    if (Qf(this.view)) {
      if (this.suppressingSelectionUpdates)
        return hn(this.view);
      if (it && Bn <= 11 && !this.view.state.selection.empty) {
        let e = this.view.domSelectionRange();
        if (e.focusNode && br(e.focusNode, e.focusOffset, e.anchorNode, e.anchorOffset))
          return this.flushSoon();
      }
      this.flush();
    }
  }
  setCurSelection() {
    this.currentSelection.set(this.view.domSelectionRange());
  }
  ignoreSelectionChange(e) {
    if (!e.focusNode)
      return !0;
    let n = /* @__PURE__ */ new Set(), r;
    for (let o = e.focusNode; o; o = ui(o))
      n.add(o);
    for (let o = e.anchorNode; o; o = ui(o))
      if (n.has(o)) {
        r = o;
        break;
      }
    let i = r && this.view.docView.nearestDesc(r);
    if (i && i.ignoreMutation({
      type: "selection",
      target: r.nodeType == 3 ? r.parentNode : r
    }))
      return this.setCurSelection(), !0;
  }
  pendingRecords() {
    if (this.observer)
      for (let e of this.observer.takeRecords())
        this.queue.push(e);
    return this.queue;
  }
  flush() {
    let { view: e } = this;
    if (!e.docView || this.flushingSoon > -1)
      return;
    let n = this.pendingRecords();
    n.length && (this.queue = []);
    let r = e.domSelectionRange(), i = !this.suppressingSelectionUpdates && !this.currentSelection.eq(r) && Qf(e) && !this.ignoreSelectionChange(r), o = -1, s = -1, l = !1, a = [];
    if (e.editable)
      for (let c = 0; c < n.length; c++) {
        let f = this.registerMutation(n[c], a);
        f && (o = o < 0 ? f.from : Math.min(f.from, o), s = s < 0 ? f.to : Math.max(f.to, s), f.typeOver && (l = !0));
      }
    if (a.some((c) => c.nodeName == "BR") && (e.input.lastKeyCode == 8 || e.input.lastKeyCode == 46)) {
      for (let c of a)
        if (c.nodeName == "BR" && c.parentNode) {
          let f = c.nextSibling;
          for (; f && f.nodeType == 1; ) {
            if (f.contentEditable == "false") {
              c.parentNode.removeChild(c);
              break;
            }
            f = f.firstChild;
          }
        }
    } else if (Nt && a.length) {
      let c = a.filter((f) => f.nodeName == "BR");
      if (c.length == 2) {
        let [f, h] = c;
        f.parentNode && f.parentNode.parentNode == h.parentNode ? h.remove() : f.remove();
      } else {
        let { focusNode: f } = this.currentSelection;
        for (let h of c) {
          let d = h.parentNode;
          d && d.nodeName == "LI" && (!f || pC(e, f) != d) && h.remove();
        }
      }
    }
    let u = null;
    o < 0 && i && e.input.lastFocus > Date.now() - 200 && Math.max(e.input.lastTouch, e.input.lastClick.time) < Date.now() - 300 && Us(r) && (u = cu(e)) && u.eq(ee.near(e.state.doc.resolve(0), 1)) ? (e.input.lastFocus = 0, hn(e), this.currentSelection.set(r), e.scrollToSelection()) : (o > -1 || i) && (o > -1 && (e.docView.markDirty(o, s), hC(e)), e.input.badSafariComposition && (e.input.badSafariComposition = !1, mC(e, a)), this.handleDOMChange(o, s, l, a), e.docView && e.docView.dirty ? e.updateState(e.state) : this.currentSelection.eq(r) || hn(e), this.currentSelection.set(r));
  }
  registerMutation(e, n) {
    if (n.indexOf(e.target) > -1)
      return null;
    let r = this.view.docView.nearestDesc(e.target);
    if (e.type == "attributes" && (r == this.view.docView || e.attributeName == "contenteditable" || // Firefox sometimes fires spurious events for null/empty styles
    e.attributeName == "style" && !e.oldValue && !e.target.getAttribute("style")) || !r || r.ignoreMutation(e))
      return null;
    if (e.type == "childList") {
      for (let c = 0; c < e.addedNodes.length; c++) {
        let f = e.addedNodes[c];
        n.push(f), f.nodeType == 3 && (this.lastChangedTextNode = f);
      }
      if (r.contentDOM && r.contentDOM != r.dom && !r.contentDOM.contains(e.target))
        return { from: r.posBefore, to: r.posAfter };
      let i = e.previousSibling, o = e.nextSibling;
      if (it && Bn <= 11 && e.addedNodes.length)
        for (let c = 0; c < e.addedNodes.length; c++) {
          let { previousSibling: f, nextSibling: h } = e.addedNodes[c];
          (!f || Array.prototype.indexOf.call(e.addedNodes, f) < 0) && (i = f), (!h || Array.prototype.indexOf.call(e.addedNodes, h) < 0) && (o = h);
        }
      let s = i && i.parentNode == e.target ? Re(i) + 1 : 0, l = r.localPosFromDOM(e.target, s, -1), a = o && o.parentNode == e.target ? Re(o) : e.target.childNodes.length, u = r.localPosFromDOM(e.target, a, 1);
      return { from: l, to: u };
    } else return e.type == "attributes" ? { from: r.posAtStart - r.border, to: r.posAtEnd + r.border } : (this.lastChangedTextNode = e.target, {
      from: r.posAtStart,
      to: r.posAtEnd,
      // An event was generated for a text change that didn't change
      // any text. Mark the dom change to fall back to assuming the
      // selection was typed over with an identical value if it can't
      // find another change.
      typeOver: e.target.nodeValue == e.oldValue
    });
  }
}
let sh = /* @__PURE__ */ new WeakMap(), lh = !1;
function hC(t) {
  if (!sh.has(t) && (sh.set(t, null), ["normal", "nowrap", "pre-line"].indexOf(getComputedStyle(t.dom).whiteSpace) !== -1)) {
    if (t.requiresGeckoHackNode = Nt, lh)
      return;
    console.warn("ProseMirror expects the CSS white-space property to be set, preferably to 'pre-wrap'. It is recommended to load style/prosemirror.css from the prosemirror-view package."), lh = !0;
  }
}
function ah(t, e) {
  let n = e.startContainer, r = e.startOffset, i = e.endContainer, o = e.endOffset, s = t.domAtPos(t.state.selection.anchor);
  return br(s.node, s.offset, i, o) && ([n, r, i, o] = [i, o, n, r]), { anchorNode: n, anchorOffset: r, focusNode: i, focusOffset: o };
}
function dC(t, e) {
  if (e.getComposedRanges) {
    let i = e.getComposedRanges(t.root)[0];
    if (i)
      return ah(t, i);
  }
  let n;
  function r(i) {
    i.preventDefault(), i.stopImmediatePropagation(), n = i.getTargetRanges()[0];
  }
  return t.dom.addEventListener("beforeinput", r, !0), document.execCommand("indent"), t.dom.removeEventListener("beforeinput", r, !0), n ? ah(t, n) : null;
}
function pC(t, e) {
  for (let n = e.parentNode; n && n != t.dom; n = n.parentNode) {
    let r = t.docView.nearestDesc(n, !0);
    if (r && r.node.isBlock)
      return n;
  }
  return null;
}
function mC(t, e) {
  var n;
  let { focusNode: r, focusOffset: i } = t.domSelectionRange();
  for (let o of e)
    if (((n = o.parentNode) === null || n === void 0 ? void 0 : n.nodeName) == "TR") {
      let s = o.nextSibling;
      for (; s && s.nodeName != "TD" && s.nodeName != "TH"; )
        s = s.nextSibling;
      if (s) {
        let l = s;
        for (; ; ) {
          let a = l.firstChild;
          if (!a || a.nodeType != 1 || a.contentEditable == "false" || /^(BR|IMG)$/.test(a.nodeName))
            break;
          l = a;
        }
        l.insertBefore(o, l.firstChild), r == o && t.domSelection().collapse(o, i);
      } else
        o.parentNode.removeChild(o);
    }
}
function gC(t, e, n) {
  let { node: r, fromOffset: i, toOffset: o, from: s, to: l } = t.docView.parseRange(e, n), a = t.domSelectionRange(), u, c = a.anchorNode;
  if (c && t.dom.contains(c.nodeType == 1 ? c : c.parentNode) && (u = [{ node: c, offset: a.anchorOffset }], Us(a) || u.push({ node: a.focusNode, offset: a.focusOffset })), Le && t.input.lastKeyCode === 8)
    for (let k = o; k > i; k--) {
      let y = r.childNodes[k - 1], O = y.pmViewDesc;
      if (y.nodeName == "BR" && !O) {
        o = k;
        break;
      }
      if (!O || O.size)
        break;
    }
  let f = t.state.doc, h = t.someProp("domParser") || si.fromSchema(t.state.schema), d = f.resolve(s), p = null, m = h.parse(r, {
    topNode: d.parent,
    topMatch: d.parent.contentMatchAt(d.index()),
    topOpen: !0,
    from: i,
    to: o,
    preserveWhitespace: d.parent.type.whitespace == "pre" ? "full" : !0,
    findPositions: u,
    ruleFromNode: yC,
    context: d
  });
  if (u && u[0].pos != null) {
    let k = u[0].pos, y = u[1] && u[1].pos;
    y == null && (y = k), p = { anchor: k + s, head: y + s };
  }
  return { doc: m, sel: p, from: s, to: l };
}
function yC(t) {
  let e = t.pmViewDesc;
  if (e)
    return e.parseRule();
  if (t.nodeName == "BR" && t.parentNode) {
    if ($e && /^(ul|ol)$/i.test(t.parentNode.nodeName)) {
      let n = document.createElement("div");
      return n.appendChild(document.createElement("li")), { skip: n };
    } else if (t.parentNode.lastChild == t || $e && /^(tr|table)$/i.test(t.parentNode.nodeName))
      return { ignore: !0 };
  } else if (t.nodeName == "IMG" && t.getAttribute("mark-placeholder"))
    return { ignore: !0 };
  return null;
}
const kC = /^(a|abbr|acronym|b|bd[io]|big|br|button|cite|code|data(list)?|del|dfn|em|i|img|ins|kbd|label|map|mark|meter|output|q|ruby|s|samp|small|span|strong|su[bp]|time|u|tt|var)$/i;
function bC(t, e, n, r, i) {
  let o = t.input.compositionPendingChanges || (t.composing ? t.input.compositionID : 0);
  if (t.input.compositionPendingChanges = 0, e < 0) {
    let R = t.input.lastSelectionTime > Date.now() - 50 ? t.input.lastSelectionOrigin : null, q = cu(t, R);
    if (q && !t.state.selection.eq(q)) {
      if (Le && cn && t.input.lastKeyCode === 13 && Date.now() - 100 < t.input.lastKeyCodeTime && t.someProp("handleKeyDown", (N) => N(t, Gn(13, "Enter"))))
        return;
      let U = t.state.tr.setSelection(q);
      R == "pointer" ? U.setMeta("pointer", !0) : R == "key" && U.scrollIntoView(), o && U.setMeta("composition", o), t.dispatch(U);
    }
    return;
  }
  let s = t.state.doc.resolve(e), l = s.sharedDepth(n);
  e = s.before(l + 1), n = t.state.doc.resolve(n).after(l + 1);
  let a = t.state.selection, u = gC(t, e, n), c = t.state.doc, f = c.slice(u.from, u.to), h, d;
  t.input.lastKeyCode === 8 && Date.now() - 100 < t.input.lastKeyCodeTime ? (h = t.state.selection.to, d = "end") : (h = t.state.selection.from, d = "start"), t.input.lastKeyCode = null;
  let p = CC(f.content, u.doc.content, u.from, h, d);
  if (p && t.input.domChangeCount++, (ci && t.input.lastIOSEnter > Date.now() - 225 || cn) && i.some((R) => R.nodeType == 1 && !kC.test(R.nodeName)) && (!p || p.endA >= p.endB) && t.someProp("handleKeyDown", (R) => R(t, Gn(13, "Enter")))) {
    t.input.lastIOSEnter = 0;
    return;
  }
  if (!p)
    if (r && a instanceof Z && !a.empty && a.$head.sameParent(a.$anchor) && !t.composing && !(u.sel && u.sel.anchor != u.sel.head))
      p = { start: a.from, endA: a.to, endB: a.to };
    else {
      if (u.sel) {
        let R = uh(t, t.state.doc, u.sel);
        if (R && !R.eq(t.state.selection)) {
          let q = t.state.tr.setSelection(R);
          o && q.setMeta("composition", o), t.dispatch(q);
        }
      }
      return;
    }
  t.state.selection.from < t.state.selection.to && p.start == p.endB && t.state.selection instanceof Z && (p.start > t.state.selection.from && p.start <= t.state.selection.from + 2 && t.state.selection.from >= u.from ? p.start = t.state.selection.from : p.endA < t.state.selection.to && p.endA >= t.state.selection.to - 2 && t.state.selection.to <= u.to && (p.endB += t.state.selection.to - p.endA, p.endA = t.state.selection.to)), it && Bn <= 11 && p.endB == p.start + 1 && p.endA == p.start && p.start > u.from && u.doc.textBetween(p.start - u.from - 1, p.start - u.from + 1) == "  " && (p.start--, p.endA--, p.endB--);
  let m = u.doc.resolveNoCache(p.start - u.from), k = u.doc.resolveNoCache(p.endB - u.from), y = c.resolve(p.start), O = m.sameParent(k) && m.parent.inlineContent && y.end() >= p.endA;
  if ((ci && t.input.lastIOSEnter > Date.now() - 225 && (!O || i.some((R) => R.nodeName == "DIV" || R.nodeName == "P")) || !O && m.pos < u.doc.content.size && (!m.sameParent(k) || !m.parent.inlineContent) && m.pos < k.pos && !/\S/.test(u.doc.textBetween(m.pos, k.pos, "", ""))) && t.someProp("handleKeyDown", (R) => R(t, Gn(13, "Enter")))) {
    t.input.lastIOSEnter = 0;
    return;
  }
  if (t.state.selection.anchor > p.start && xC(c, p.start, p.endA, m, k) && t.someProp("handleKeyDown", (R) => R(t, Gn(8, "Backspace")))) {
    cn && Le && t.domObserver.suppressSelectionUpdates();
    return;
  }
  Le && p.endB == p.start && (t.input.lastChromeDelete = Date.now()), cn && !O && m.start() != k.start() && k.parentOffset == 0 && m.depth == k.depth && u.sel && u.sel.anchor == u.sel.head && u.sel.head == p.endA && (p.endB -= 2, k = u.doc.resolveNoCache(p.endB - u.from), setTimeout(() => {
    t.someProp("handleKeyDown", function(R) {
      return R(t, Gn(13, "Enter"));
    });
  }, 20));
  let T = p.start, V = p.endA, _ = (R) => {
    let q = R || t.state.tr.replace(T, V, u.doc.slice(p.start - u.from, p.endB - u.from));
    if (u.sel) {
      let U = uh(t, q.doc, u.sel);
      U && !(Le && t.composing && U.empty && (p.start != p.endB || t.input.lastChromeDelete < Date.now() - 100) && (U.head == T || U.head == q.mapping.map(V) - 1) || it && U.empty && U.head == T) && q.setSelection(U);
    }
    return o && q.setMeta("composition", o), q.scrollIntoView();
  }, S;
  if (O)
    if (m.pos == k.pos) {
      it && Bn <= 11 && m.parentOffset == 0 && (t.domObserver.suppressSelectionUpdates(), setTimeout(() => hn(t), 20));
      let R = _(t.state.tr.delete(T, V)), q = c.resolve(p.start).marksAcross(c.resolve(p.endA));
      q && R.ensureMarks(q), t.dispatch(R);
    } else if (
      // Adding or removing a mark
      p.endA == p.endB && (S = wC(m.parent.content.cut(m.parentOffset, k.parentOffset), y.parent.content.cut(y.parentOffset, p.endA - y.start())))
    ) {
      let R = _(t.state.tr);
      S.type == "add" ? R.addMark(T, V, S.mark) : R.removeMark(T, V, S.mark), t.dispatch(R);
    } else if (m.parent.child(m.index()).isText && m.index() == k.index() - (k.textOffset ? 0 : 1)) {
      let R = m.parent.textBetween(m.parentOffset, k.parentOffset), q = () => _(t.state.tr.insertText(R, T, V));
      t.someProp("handleTextInput", (U) => U(t, T, V, R, q)) || t.dispatch(q());
    } else
      t.dispatch(_());
  else
    t.dispatch(_());
}
function uh(t, e, n) {
  return Math.max(n.anchor, n.head) > e.content.size ? null : fu(t, e.resolve(n.anchor), e.resolve(n.head));
}
function wC(t, e) {
  let n = t.firstChild.marks, r = e.firstChild.marks, i = n, o = r, s, l, a;
  for (let c = 0; c < r.length; c++)
    i = r[c].removeFromSet(i);
  for (let c = 0; c < n.length; c++)
    o = n[c].removeFromSet(o);
  if (i.length == 1 && o.length == 0)
    l = i[0], s = "add", a = (c) => c.mark(l.addToSet(c.marks));
  else if (i.length == 0 && o.length == 1)
    l = o[0], s = "remove", a = (c) => c.mark(l.removeFromSet(c.marks));
  else
    return null;
  let u = [];
  for (let c = 0; c < e.childCount; c++)
    u.push(a(e.child(c)));
  if (A.from(u).eq(t))
    return { mark: l, type: s };
}
function xC(t, e, n, r, i) {
  if (
    // The content must have shrunk
    n - e <= i.pos - r.pos || // newEnd must point directly at or after the end of the block that newStart points into
    Dl(r, !0, !1) < i.pos
  )
    return !1;
  let o = t.resolve(e);
  if (!r.parent.isTextblock) {
    let l = o.nodeAfter;
    return l != null && n == e + l.nodeSize;
  }
  if (o.parentOffset < o.parent.content.size || !o.parent.isTextblock)
    return !1;
  let s = t.resolve(Dl(o, !0, !0));
  return !s.parent.isTextblock || s.pos > n || Dl(s, !0, !1) < n ? !1 : r.parent.content.cut(r.parentOffset).eq(s.parent.content);
}
function Dl(t, e, n) {
  let r = t.depth, i = e ? t.end() : t.pos;
  for (; r > 0 && (e || t.indexAfter(r) == t.node(r).childCount); )
    r--, i++, e = !1;
  if (n) {
    let o = t.node(r).maybeChild(t.indexAfter(r));
    for (; o && !o.isLeaf; )
      o = o.firstChild, i++;
  }
  return i;
}
function CC(t, e, n, r, i) {
  let o = t.findDiffStart(e, n);
  if (o == null)
    return null;
  let { a: s, b: l } = t.findDiffEnd(e, n + t.size, n + e.size);
  if (i == "end") {
    let a = Math.max(0, o - Math.min(s, l));
    r -= s + a - o;
  }
  if (s < o && t.size < e.size) {
    let a = r <= o && r >= s ? o - r : 0;
    o -= a, o && o < e.size && ch(e.textBetween(o - 1, o + 1)) && (o += a ? 1 : -1), l = o + (l - s), s = o;
  } else if (l < o) {
    let a = r <= o && r >= l ? o - r : 0;
    o -= a, o && o < t.size && ch(t.textBetween(o - 1, o + 1)) && (o += a ? 1 : -1), s = o + (s - l), l = o;
  }
  return { start: o, endA: s, endB: l };
}
function ch(t) {
  if (t.length != 2)
    return !1;
  let e = t.charCodeAt(0), n = t.charCodeAt(1);
  return e >= 56320 && e <= 57343 && n >= 55296 && n <= 56319;
}
class rm {
  /**
  Create a view. `place` may be a DOM node that the editor should
  be appended to, a function that will place it into the document,
  or an object whose `mount` property holds the node to use as the
  document container. If it is `null`, the editor will not be
  added to the document.
  */
  constructor(e, n) {
    this._root = null, this.focused = !1, this.trackWrites = null, this.mounted = !1, this.markCursor = null, this.cursorWrapper = null, this.lastSelectedViewDesc = void 0, this.input = new Fx(), this.prevDirectPlugins = [], this.pluginViews = [], this.requiresGeckoHackNode = !1, this.dragging = null, this._props = n, this.state = n.state, this.directPlugins = n.plugins || [], this.directPlugins.forEach(mh), this.dispatch = this.dispatch.bind(this), this.dom = e && e.mount || document.createElement("div"), e && (e.appendChild ? e.appendChild(this.dom) : typeof e == "function" ? e(this.dom) : e.mount && (this.mounted = !0)), this.editable = dh(this), hh(this), this.nodeViews = ph(this), this.docView = Wf(this.state.doc, fh(this), Ol(this), this.dom, this), this.domObserver = new fC(this, (r, i, o, s) => bC(this, r, i, o, s)), this.domObserver.start(), $x(this), this.updatePluginViews();
  }
  /**
  Holds `true` when a
  [composition](https://w3c.github.io/uievents/#events-compositionevents)
  is active.
  */
  get composing() {
    return this.input.composing;
  }
  /**
  The view's current [props](https://prosemirror.net/docs/ref/#view.EditorProps).
  */
  get props() {
    if (this._props.state != this.state) {
      let e = this._props;
      this._props = {};
      for (let n in e)
        this._props[n] = e[n];
      this._props.state = this.state;
    }
    return this._props;
  }
  /**
  Update the view's props. Will immediately cause an update to
  the DOM.
  */
  update(e) {
    e.handleDOMEvents != this._props.handleDOMEvents && Oa(this);
    let n = this._props;
    this._props = e, e.plugins && (e.plugins.forEach(mh), this.directPlugins = e.plugins), this.updateStateInner(e.state, n);
  }
  /**
  Update the view by updating existing props object with the object
  given as argument. Equivalent to `view.update(Object.assign({},
  view.props, props))`.
  */
  setProps(e) {
    let n = {};
    for (let r in this._props)
      n[r] = this._props[r];
    n.state = this.state;
    for (let r in e)
      n[r] = e[r];
    this.update(n);
  }
  /**
  Update the editor's `state` prop, without touching any of the
  other props.
  */
  updateState(e) {
    this.updateStateInner(e, this._props);
  }
  updateStateInner(e, n) {
    var r;
    let i = this.state, o = !1, s = !1;
    e.storedMarks && this.composing && (Yp(this), s = !0), this.state = e;
    let l = i.plugins != e.plugins || this._props.plugins != n.plugins;
    if (l || this._props.plugins != n.plugins || this._props.nodeViews != n.nodeViews) {
      let d = ph(this);
      MC(d, this.nodeViews) && (this.nodeViews = d, o = !0);
    }
    (l || n.handleDOMEvents != this._props.handleDOMEvents) && Oa(this), this.editable = dh(this), hh(this);
    let a = Ol(this), u = fh(this), c = i.plugins != e.plugins && !i.doc.eq(e.doc) ? "reset" : e.scrollToSelection > i.scrollToSelection ? "to selection" : "preserve", f = o || !this.docView.matchesNode(e.doc, u, a);
    (f || !e.selection.eq(i.selection)) && (s = !0);
    let h = c == "preserve" && s && this.dom.style.overflowAnchor == null && Zw(this);
    if (s) {
      this.domObserver.stop();
      let d = f && (it || Le) && !this.composing && !i.selection.empty && !e.selection.empty && SC(i.selection, e.selection);
      if (f) {
        let p = Le ? this.trackWrites = this.domSelectionRange().focusNode : null;
        this.composing && (this.input.compositionNode = Zx(this)), (o || !this.docView.update(e.doc, u, a, this)) && (this.docView.updateOuterDeco(u), this.docView.destroy(), this.docView = Wf(e.doc, u, a, this.dom, this)), p && (!this.trackWrites || !this.dom.contains(this.trackWrites)) && (d = !0);
      }
      d || !(this.input.mouseDown && this.domObserver.currentSelection.eq(this.domSelectionRange()) && Sx(this)) ? hn(this, d) : (Fp(this, e.selection), this.domObserver.setCurSelection()), this.domObserver.start();
    }
    this.updatePluginViews(i), !((r = this.dragging) === null || r === void 0) && r.node && !i.doc.eq(e.doc) && this.updateDraggedNode(this.dragging, i), c == "reset" ? this.dom.scrollTop = 0 : c == "to selection" ? this.scrollToSelection() : h && ex(h);
  }
  /**
  @internal
  */
  scrollToSelection() {
    let e = this.domSelectionRange().focusNode;
    if (!(!e || !this.dom.contains(e.nodeType == 1 ? e : e.parentNode))) {
      if (!this.someProp("handleScrollToSelection", (n) => n(this))) if (this.state.selection instanceof Q) {
        let n = this.docView.domAfterPos(this.state.selection.from);
        n.nodeType == 1 && $f(this, n.getBoundingClientRect(), e);
      } else
        $f(this, this.coordsAtPos(this.state.selection.head, 1), e);
    }
  }
  destroyPluginViews() {
    let e;
    for (; e = this.pluginViews.pop(); )
      e.destroy && e.destroy();
  }
  updatePluginViews(e) {
    if (!e || e.plugins != this.state.plugins || this.directPlugins != this.prevDirectPlugins) {
      this.prevDirectPlugins = this.directPlugins, this.destroyPluginViews();
      for (let n = 0; n < this.directPlugins.length; n++) {
        let r = this.directPlugins[n];
        r.spec.view && this.pluginViews.push(r.spec.view(this));
      }
      for (let n = 0; n < this.state.plugins.length; n++) {
        let r = this.state.plugins[n];
        r.spec.view && this.pluginViews.push(r.spec.view(this));
      }
    } else
      for (let n = 0; n < this.pluginViews.length; n++) {
        let r = this.pluginViews[n];
        r.update && r.update(this, e);
      }
  }
  updateDraggedNode(e, n) {
    let r = e.node, i = -1;
    if (r.from < this.state.doc.content.size && this.state.doc.nodeAt(r.from) == r.node)
      i = r.from;
    else {
      let o = r.from + (this.state.doc.content.size - n.doc.content.size);
      (o > 0 && o < this.state.doc.content.size && this.state.doc.nodeAt(o)) == r.node && (i = o);
    }
    this.dragging = new Xp(e.slice, e.move, i < 0 ? void 0 : Q.create(this.state.doc, i));
  }
  someProp(e, n) {
    let r = this._props && this._props[e], i;
    if (r != null && (i = n ? n(r) : r))
      return i;
    for (let s = 0; s < this.directPlugins.length; s++) {
      let l = this.directPlugins[s].props[e];
      if (l != null && (i = n ? n(l) : l))
        return i;
    }
    let o = this.state.plugins;
    if (o)
      for (let s = 0; s < o.length; s++) {
        let l = o[s].props[e];
        if (l != null && (i = n ? n(l) : l))
          return i;
      }
  }
  /**
  Query whether the view has focus.
  */
  hasFocus() {
    if (it) {
      let e = this.root.activeElement;
      if (e == this.dom)
        return !0;
      if (!e || !this.dom.contains(e))
        return !1;
      for (; e && this.dom != e && this.dom.contains(e); ) {
        if (e.contentEditable == "false")
          return !1;
        e = e.parentElement;
      }
      return !0;
    }
    return this.root.activeElement == this.dom;
  }
  /**
  Focus the editor.
  */
  focus() {
    this.domObserver.stop(), this.editable && tx(this.dom), hn(this), this.domObserver.start();
  }
  /**
  Get the document root in which the editor exists. This will
  usually be the top-level `document`, but might be a [shadow
  DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Shadow_DOM)
  root if the editor is inside one.
  */
  get root() {
    let e = this._root;
    if (e == null) {
      for (let n = this.dom.parentNode; n; n = n.parentNode)
        if (n.nodeType == 9 || n.nodeType == 11 && n.host)
          return n.getSelection || (Object.getPrototypeOf(n).getSelection = () => n.ownerDocument.getSelection()), this._root = n;
    }
    return e || document;
  }
  /**
  When an existing editor view is moved to a new document or
  shadow tree, call this to make it recompute its root.
  */
  updateRoot() {
    this._root = null;
  }
  /**
  Given a pair of viewport coordinates, return the document
  position that corresponds to them. May return null if the given
  coordinates aren't inside of the editor. When an object is
  returned, its `pos` property is the position nearest to the
  coordinates, and its `inside` property holds the position of the
  inner node that the position falls inside of, or -1 if it is at
  the top level, not in any node.
  */
  posAtCoords(e) {
    return sx(this, e);
  }
  /**
  Returns the viewport rectangle at a given document position.
  `left` and `right` will be the same number, as this returns a
  flat cursor-ish rectangle. If the position is between two things
  that aren't directly adjacent, `side` determines which element
  is used. When < 0, the element before the position is used,
  otherwise the element after.
  */
  coordsAtPos(e, n = 1) {
    return Ap(this, e, n);
  }
  /**
  Find the DOM position that corresponds to the given document
  position. When `side` is negative, find the position as close as
  possible to the content before the position. When positive,
  prefer positions close to the content after the position. When
  zero, prefer as shallow a position as possible.
  
  Note that you should **not** mutate the editor's internal DOM,
  only inspect it (and even that is usually not necessary).
  */
  domAtPos(e, n = 0) {
    return this.docView.domFromPos(e, n);
  }
  /**
  Find the DOM node that represents the document node after the
  given position. May return `null` when the position doesn't point
  in front of a node or if the node is inside an opaque node view.
  
  This is intended to be able to call things like
  `getBoundingClientRect` on that DOM node. Do **not** mutate the
  editor DOM directly, or add styling this way, since that will be
  immediately overriden by the editor as it redraws the node.
  */
  nodeDOM(e) {
    let n = this.docView.descAt(e);
    return n ? n.nodeDOM : null;
  }
  /**
  Find the document position that corresponds to a given DOM
  position. (Whenever possible, it is preferable to inspect the
  document structure directly, rather than poking around in the
  DOM, but sometimes—for example when interpreting an event
  target—you don't have a choice.)
  
  The `bias` parameter can be used to influence which side of a DOM
  node to use when the position is inside a leaf node.
  */
  posAtDOM(e, n, r = -1) {
    let i = this.docView.posFromDOM(e, n, r);
    if (i == null)
      throw new RangeError("DOM position not inside the editor");
    return i;
  }
  /**
  Find out whether the selection is at the end of a textblock when
  moving in a given direction. When, for example, given `"left"`,
  it will return true if moving left from the current cursor
  position would leave that position's parent textblock. Will apply
  to the view's current state by default, but it is possible to
  pass a different state.
  */
  endOfTextblock(e, n) {
    return fx(this, n || this.state, e);
  }
  /**
  Run the editor's paste logic with the given HTML string. The
  `event`, if given, will be passed to the
  [`handlePaste`](https://prosemirror.net/docs/ref/#view.EditorProps.handlePaste) hook.
  */
  pasteHTML(e, n) {
    return Zi(this, "", e, !1, n || new ClipboardEvent("paste"));
  }
  /**
  Run the editor's paste logic with the given plain-text input.
  */
  pasteText(e, n) {
    return Zi(this, e, null, !0, n || new ClipboardEvent("paste"));
  }
  /**
  Serialize the given slice as it would be if it was copied from
  this editor. Returns a DOM element that contains a
  representation of the slice as its children, a textual
  representation, and the transformed slice (which can be
  different from the given input due to hooks like
  [`transformCopied`](https://prosemirror.net/docs/ref/#view.EditorProps.transformCopied)).
  */
  serializeForClipboard(e) {
    return hu(this, e);
  }
  /**
  Removes the editor from the DOM and destroys all [node
  views](https://prosemirror.net/docs/ref/#view.NodeView).
  */
  destroy() {
    this.docView && (_x(this), this.destroyPluginViews(), this.mounted ? (this.docView.update(this.state.doc, [], Ol(this), this), this.dom.textContent = "") : this.dom.parentNode && this.dom.parentNode.removeChild(this.dom), this.docView.destroy(), this.docView = null, jw());
  }
  /**
  This is true when the view has been
  [destroyed](https://prosemirror.net/docs/ref/#view.EditorView.destroy) (and thus should not be
  used anymore).
  */
  get isDestroyed() {
    return this.docView == null;
  }
  /**
  Used for testing.
  */
  dispatchEvent(e) {
    return Hx(this, e);
  }
  /**
  @internal
  */
  domSelectionRange() {
    let e = this.domSelection();
    return e ? $e && this.root.nodeType === 11 && Jw(this.dom.ownerDocument) == this.dom && dC(this, e) || e : { focusNode: null, focusOffset: 0, anchorNode: null, anchorOffset: 0 };
  }
  /**
  @internal
  */
  domSelection() {
    return this.root.getSelection();
  }
}
rm.prototype.dispatch = function(t) {
  let e = this._props.dispatchTransaction;
  e ? e.call(this, t) : this.updateState(this.state.apply(t));
};
function fh(t) {
  let e = /* @__PURE__ */ Object.create(null);
  return e.class = "ProseMirror", e.contenteditable = String(t.editable), t.someProp("attributes", (n) => {
    if (typeof n == "function" && (n = n(t.state)), n)
      for (let r in n)
        r == "class" ? e.class += " " + n[r] : r == "style" ? e.style = (e.style ? e.style + ";" : "") + n[r] : !e[r] && r != "contenteditable" && r != "nodeName" && (e[r] = String(n[r]));
  }), e.translate || (e.translate = "no"), [ze.node(0, t.state.doc.content.size, e)];
}
function hh(t) {
  if (t.markCursor) {
    let e = document.createElement("img");
    e.className = "ProseMirror-separator", e.setAttribute("mark-placeholder", "true"), e.setAttribute("alt", ""), t.cursorWrapper = { dom: e, deco: ze.widget(t.state.selection.from, e, { raw: !0, marks: t.markCursor }) };
  } else
    t.cursorWrapper = null;
}
function dh(t) {
  return !t.someProp("editable", (e) => e(t.state) === !1);
}
function SC(t, e) {
  let n = Math.min(t.$anchor.sharedDepth(t.head), e.$anchor.sharedDepth(e.head));
  return t.$anchor.start(n) != e.$anchor.start(n);
}
function ph(t) {
  let e = /* @__PURE__ */ Object.create(null);
  function n(r) {
    for (let i in r)
      Object.prototype.hasOwnProperty.call(e, i) || (e[i] = r[i]);
  }
  return t.someProp("nodeViews", n), t.someProp("markViews", n), e;
}
function MC(t, e) {
  let n = 0, r = 0;
  for (let i in t) {
    if (t[i] != e[i])
      return !0;
    n++;
  }
  for (let i in e)
    r++;
  return n != r;
}
function mh(t) {
  if (t.spec.state || t.spec.filterTransaction || t.spec.appendTransaction)
    throw new RangeError("Plugins passed directly to the view must not have a state component");
}
function mn(t, e) {
  return t.meta = {
    package: "@milkdown/core",
    group: "System",
    ...e
  }, t;
}
var im = {
  text: (t, e, n, r) => {
    const i = t.value;
    return /^[^*_\\]*\s+$/.test(i) ? i : n.safe(i, {
      ...r,
      encode: []
    });
  },
  strong: (t, e, n, r) => {
    const i = t.marker || n.options.strong || "*", o = n.enter("strong"), s = n.createTracker(r);
    let l = s.move(i + i);
    return l += s.move(n.containerPhrasing(t, {
      before: l,
      after: i,
      ...s.current()
    })), l += s.move(i + i), o(), l;
  },
  emphasis: (t, e, n, r) => {
    const i = t.marker || n.options.emphasis || "*", o = n.enter("emphasis"), s = n.createTracker(r);
    let l = s.move(i);
    return l += s.move(n.containerPhrasing(t, {
      before: l,
      after: i,
      ...s.current()
    })), l += s.move(i), o(), l;
  }
}, nt = oe({}, "editorView"), Di = oe({}, "editorState"), Rl = oe([], "initTimer"), gh = oe({}, "editor"), to = oe([], "inputRules"), pn = oe([], "prosePlugins"), no = oe([], "remarkPlugins"), Da = oe([], "nodeView"), Ra = oe([], "markView"), ur = oe(da().use(sa).use(ca), "remark"), _i = oe({
  handlers: im,
  encode: []
}, "remarkStringifyOptions"), ls = Wt("ConfigReady");
function NC(t) {
  const e = (n) => (n.record(ls), async () => (await t(n), n.done(ls), () => {
    n.clearTimer(ls);
  }));
  return mn(e, { displayName: "Config" }), e;
}
var cr = Wt("InitReady");
function TC(t) {
  const e = (n) => (n.inject(gh, t).inject(pn, []).inject(no, []).inject(to, []).inject(Da, []).inject(Ra, []).inject(_i, {
    handlers: im,
    encode: []
  }).inject(ur, da().use(sa).use(ca)).inject(Rl, [ls]).record(cr), async () => {
    await n.waitTimers(Rl);
    const r = n.get(_i);
    return n.set(ur, da().use(sa).use(ca, r)), n.done(cr), () => {
      n.remove(gh).remove(pn).remove(no).remove(to).remove(Da).remove(Ra).remove(_i).remove(ur).remove(Rl).clearTimer(cr);
    };
  });
  return mn(e, { displayName: "Init" }), e;
}
var ot = Wt("SchemaReady"), Ll = oe([], "schemaTimer"), _n = oe({}, "schema"), Vi = oe([], "nodes"), Hi = oe([], "marks");
function yh(t) {
  var e;
  return {
    ...t,
    parseDOM: (e = t.parseDOM) == null ? void 0 : e.map((n) => ({
      priority: t.priority,
      ...n
    }))
  };
}
var om = (t) => (t.inject(_n, {}).inject(Vi, []).inject(Hi, []).inject(Ll, [cr]).record(ot), async () => {
  await t.waitTimers(Ll);
  const e = t.get(ur), n = t.get(no).reduce((i, o) => i.use(o.plugin, o.options), e);
  t.set(ur, n);
  const r = new y0({
    nodes: Object.fromEntries(t.get(Vi).map(([i, o]) => [i, yh(o)])),
    marks: Object.fromEntries(t.get(Hi).map(([i, o]) => [i, yh(o)]))
  });
  return t.set(_n, r), t.done(ot), () => {
    t.remove(_n).remove(Vi).remove(Hi).remove(Ll).clearTimer(ot);
  };
});
mn(om, { displayName: "Schema" });
var er, xt, Gh, sm = (Gh = class {
  constructor() {
    j(this, er);
    j(this, xt);
    z(this, er, new Xh()), z(this, xt, null), this.setCtx = (t) => {
      z(this, xt, t);
    }, this.chain = () => {
      if (M(this, xt) == null) throw sl();
      const t = M(this, xt), e = [], n = this.get.bind(this), r = {
        run: () => {
          const o = mi(...e), s = t.get(nt);
          return o(s.state, s.dispatch, s);
        },
        inline: (o) => (e.push(o), r),
        pipe: i.bind(this)
      };
      function i(o, s) {
        const l = n(o);
        return e.push(l(s)), r;
      }
      return r;
    };
  }
  get ctx() {
    return M(this, xt);
  }
  create(t, e) {
    const n = t.create(M(this, er).sliceMap);
    return n.set(e), n;
  }
  get(t) {
    return M(this, er).get(t).get();
  }
  remove(t) {
    return M(this, er).remove(t);
  }
  call(t, e) {
    if (M(this, xt) == null) throw sl();
    const n = this.get(t)(e), r = M(this, xt).get(nt);
    return n(r.state, r.dispatch, r);
  }
  inline(t) {
    if (M(this, xt) == null) throw sl();
    const e = M(this, xt).get(nt);
    return t(e.state, e.dispatch, e);
  }
}, er = new WeakMap(), xt = new WeakMap(), Gh);
function vC(t = "cmdKey") {
  return oe(() => () => !1, t);
}
var ce = oe(new sm(), "commands"), zl = oe([ot], "commandsTimer"), ji = Wt("CommandsReady"), lm = (t) => {
  const e = new sm();
  return e.setCtx(t), t.inject(ce, e).inject(zl, [ot]).record(ji), async () => (await t.waitTimers(zl), t.done(ji), () => {
    t.remove(ce).remove(zl).clearTimer(ji);
  });
};
mn(lm, { displayName: "Commands" });
function IC(t) {
  return t.Backspace = mi(yw, ru, X0, cp), t;
}
var tr, et, Yh, am = (Yh = class {
  constructor() {
    j(this, tr);
    j(this, et);
    z(this, tr, null), z(this, et, []), this.setCtx = (t) => {
      z(this, tr, t);
    }, this.add = (t) => (M(this, et).push(t), () => {
      z(this, et, M(this, et).filter((e) => e !== t));
    }), this.addObjectKeymap = (t) => {
      const e = [];
      return Object.entries(t).forEach(([n, r]) => {
        if (typeof r == "function") {
          const i = {
            key: n,
            onRun: () => r
          };
          M(this, et).push(i), e.push(() => {
            z(this, et, M(this, et).filter((o) => o !== i));
          });
        } else
          M(this, et).push(r), e.push(() => {
            z(this, et, M(this, et).filter((i) => i !== r));
          });
      }), () => {
        e.forEach((n) => n());
      };
    }, this.addBaseKeymap = () => {
      const t = IC(mw);
      return this.addObjectKeymap(t);
    }, this.build = () => {
      const t = {};
      return M(this, et).forEach((e) => {
        t[e.key] = [...t[e.key] || [], e];
      }), Object.fromEntries(Object.entries(t).map(([e, n]) => {
        const r = n.sort((o, s) => (s.priority ?? 50) - (o.priority ?? 50));
        return [e, (o, s, l) => {
          const a = M(this, tr);
          if (a == null) throw Bs();
          return mi(...r.map((u) => u.onRun(a)))(o, s, l);
        }];
      }));
    };
  }
  get ctx() {
    return M(this, tr);
  }
}, tr = new WeakMap(), et = new WeakMap(), Yh), As = oe(new am(), "keymap"), Pl = oe([ot], "keymapTimer"), qi = Wt("KeymapReady"), EC = (t) => {
  const e = new am();
  return e.setCtx(t), t.inject(As, e).inject(Pl, [ot]).record(qi), async () => (await t.waitTimers(Pl), t.done(qi), () => {
    t.remove(As).remove(Pl).clearTimer(qi);
  });
}, as = Wt("ParserReady"), um = () => {
  throw Bs();
}, us = oe(um, "parser"), Bl = oe([], "parserTimer"), cm = (t) => (t.inject(us, um).inject(Bl, [ot]).record(as), async () => {
  await t.waitTimers(Bl);
  const e = t.get(ur), n = t.get(_n);
  return t.set(us, _w.create(n, e)), t.done(as), () => {
    t.remove(us).remove(Bl).clearTimer(as);
  };
});
mn(cm, { displayName: "Parser" });
var Wi = Wt("SerializerReady"), Fl = oe([], "serializerTimer"), fm = () => {
  throw Bs();
}, Ki = oe(fm, "serializer"), hm = (t) => (t.inject(Ki, fm).inject(Fl, [ot]).record(Wi), async () => {
  await t.waitTimers(Fl);
  const e = t.get(ur), n = t.get(_n);
  return t.set(Ki, Hw.create(n, e)), t.done(Wi), () => {
    t.remove(Ki).remove(Fl).clearTimer(Wi);
  };
});
mn(hm, { displayName: "Serializer" });
var cs = oe("", "defaultValue"), $l = oe((t) => t, "stateOptions"), _l = oe([], "editorStateTimer"), fs = Wt("EditorStateReady");
function AC(t, e, n) {
  if (typeof t == "string") return e(t);
  if (t.type === "html") return si.fromSchema(n).parse(t.dom);
  if (t.type === "json") return fn.fromJSON(n, t.value);
  throw py(t);
}
var OC = new Ve("MILKDOWN_STATE_TRACKER"), dm = (t) => (t.inject(cs, "").inject(Di, {}).inject($l, (e) => e).inject(_l, [
  as,
  Wi,
  ji,
  qi
]).record(fs), async () => {
  await t.waitTimers(_l);
  const e = t.get(_n), n = t.get(us), r = t.get(to), i = t.get($l), o = t.get(pn), s = AC(t.get(cs), n, e), l = t.get(As), a = l.addBaseKeymap(), u = [
    ...o,
    new Ee({
      key: OC,
      state: {
        init: () => {
        },
        apply: (h, d, p, m) => {
          t.set(Di, m);
        }
      }
    }),
    Nw({ rules: r }),
    kp(l.build())
  ];
  t.set(pn, u);
  const c = i({
    schema: e,
    doc: s,
    plugins: u
  }), f = Lr.create(c);
  return t.set(Di, f), t.done(fs), () => {
    a(), t.remove(cs).remove(Di).remove($l).remove(_l).clearTimer(fs);
  };
});
mn(dm, { displayName: "EditorState" });
var ro = oe([], "pasteRule"), Vl = oe([ot], "pasteRuleTimer"), hs = Wt("PasteRuleReady"), pm = (t) => (t.inject(ro, []).inject(Vl, [ot]).record(hs), async () => (await t.waitTimers(Vl), t.done(hs), () => {
  t.remove(ro).remove(Vl).clearTimer(hs);
}));
mn(pm, { displayName: "PasteRule" });
var ds = Wt("EditorViewReady"), Hl = oe([], "editorViewTimer"), jl = oe({}, "editorViewOptions"), ps = oe(null, "root"), La = oe(null, "rootDOM"), za = oe({}, "rootAttrs");
function DC(t, e) {
  const n = document.createElement("div");
  n.className = "milkdown", t.appendChild(n), e.set(La, n);
  const r = e.get(za);
  return Object.entries(r).forEach(([i, o]) => n.setAttribute(i, o)), n;
}
function RC(t) {
  t.classList.add("editor"), t.setAttribute("role", "textbox");
}
var LC = new Ve("MILKDOWN_VIEW_CLEAR"), mm = (t) => (t.inject(ps, document.body).inject(nt, {}).inject(jl, {}).inject(La, null).inject(za, {}).inject(Hl, [fs, hs]).record(ds), async () => {
  await t.wait(cr);
  const e = t.get(ps) || document.body, n = typeof e == "string" ? document.querySelector(e) : e;
  t.update(pn, (s) => [new Ee({
    key: LC,
    view: (l) => {
      const a = n ? DC(n, t) : void 0;
      return (() => {
        if (a && n) {
          const c = l.dom;
          n.replaceChild(a, c), a.appendChild(c);
        }
      })(), { destroy: () => {
        a != null && a.parentNode && (a == null || a.parentNode.replaceChild(l.dom, a)), a == null || a.remove();
      } };
    }
  }), ...s]), await t.waitTimers(Hl);
  const r = t.get(Di), i = t.get(jl), o = new rm(n, {
    state: r,
    nodeViews: Object.fromEntries(t.get(Da)),
    markViews: Object.fromEntries(t.get(Ra)),
    transformPasted: (s, l, a) => (t.get(ro).sort((u, c) => (c.priority ?? 50) - (u.priority ?? 50)).map((u) => u.run).forEach((u) => {
      s = u(s, l, a);
    }), s),
    ...i
  });
  return RC(o.dom), t.set(nt, o), t.done(ds), () => {
    o == null || o.destroy(), t.remove(ps).remove(nt).remove(jl).remove(La).remove(za).remove(Hl).clearTimer(ds);
  };
});
mn(mm, { displayName: "EditorView" });
var bt = /* @__PURE__ */ function(t) {
  return t.Idle = "Idle", t.OnCreate = "OnCreate", t.Created = "Created", t.OnDestroy = "OnDestroy", t.Destroyed = "Destroyed", t;
}({}), nr, ct, sn, ti, bo, wo, tt, ln, rr, xo, ir, ni, Co, Rn, ri, ii, zC = (ii = class {
  constructor() {
    j(this, nr);
    j(this, ct);
    j(this, sn);
    j(this, ti);
    j(this, bo);
    j(this, wo);
    j(this, tt);
    j(this, ln);
    j(this, rr);
    j(this, xo);
    j(this, ir);
    j(this, ni);
    j(this, Co);
    j(this, Rn);
    j(this, ri);
    z(this, nr, !1), z(this, ct, bt.Idle), z(this, sn, []), z(this, ti, () => {
    }), z(this, bo, new Xh()), z(this, wo, new Ty()), z(this, tt, /* @__PURE__ */ new Map()), z(this, ln, /* @__PURE__ */ new Map()), z(this, rr, new Ny(M(this, bo), M(this, wo))), z(this, xo, () => {
      const e = NC(async (r) => {
        await Promise.all(M(this, sn).map((i) => Promise.resolve(i(r))));
      }), n = [
        om,
        cm,
        hm,
        lm,
        EC,
        pm,
        dm,
        mm,
        TC(this),
        e
      ];
      M(this, ir).call(this, n, M(this, ln));
    }), z(this, ir, (e, n) => {
      e.forEach((r) => {
        const i = M(this, rr).produce(M(this, nr) ? r.meta : void 0), o = r(i);
        n.set(r, {
          ctx: i,
          handler: o,
          cleanup: void 0
        });
      });
    }), z(this, ni, (e, n = !1) => Promise.all([e].flat().map(async (r) => {
      var o;
      const i = (o = M(this, tt).get(r)) == null ? void 0 : o.cleanup;
      return n ? M(this, tt).delete(r) : M(this, tt).set(r, {
        ctx: void 0,
        handler: void 0,
        cleanup: void 0
      }), typeof i == "function" ? i() : i;
    }))), z(this, Co, async () => {
      await Promise.all([...M(this, ln).entries()].map(async ([e, { cleanup: n }]) => typeof n == "function" ? n() : n)), M(this, ln).clear();
    }), z(this, Rn, (e) => {
      z(this, ct, e), M(this, ti).call(this, e);
    }), z(this, ri, (e) => [...e.entries()].map(async ([n, r]) => {
      const { ctx: i, handler: o } = r;
      if (!o) return;
      const s = await o();
      e.set(n, {
        ctx: i,
        handler: o,
        cleanup: s
      });
    })), this.enableInspector = (e = !0) => (z(this, nr, e), this), this.onStatusChange = (e) => (z(this, ti, e), this), this.config = (e) => (M(this, sn).push(e), this), this.removeConfig = (e) => (z(this, sn, M(this, sn).filter((n) => n !== e)), this), this.use = (e) => {
      const n = [e].flat();
      return n.flat().forEach((r) => {
        M(this, tt).set(r, {
          ctx: void 0,
          handler: void 0,
          cleanup: void 0
        });
      }), M(this, ct) === bt.Created && M(this, ir).call(this, n, M(this, tt)), this;
    }, this.remove = async (e) => M(this, ct) === bt.OnCreate ? (console.warn("[Milkdown]: You are trying to remove plugins when the editor is creating, this is not recommended, please check your code."), new Promise((n) => {
      setTimeout(() => {
        n(this.remove(e));
      }, 50);
    })) : (await M(this, ni).call(this, [e].flat(), !0), this), this.create = async () => M(this, ct) === bt.OnCreate ? this : (M(this, ct) === bt.Created && await this.destroy(), M(this, Rn).call(this, bt.OnCreate), M(this, xo).call(this), M(this, ir).call(this, [...M(this, tt).keys()], M(this, tt)), await Promise.all([M(this, ri).call(this, M(this, ln)), M(this, ri).call(this, M(this, tt))].flat()), M(this, Rn).call(this, bt.Created), this), this.destroy = async (e = !1) => M(this, ct) === bt.Destroyed || M(this, ct) === bt.OnDestroy ? this : M(this, ct) === bt.OnCreate ? new Promise((n) => {
      setTimeout(() => {
        n(this.destroy(e));
      }, 50);
    }) : (e && z(this, sn, []), M(this, Rn).call(this, bt.OnDestroy), await M(this, ni).call(this, [...M(this, tt).keys()], e), await M(this, Co).call(this), M(this, Rn).call(this, bt.Destroyed), this), this.action = (e) => e(M(this, rr)), this.inspect = () => M(this, nr) ? [...M(this, ln).values(), ...M(this, tt).values()].map(({ ctx: e }) => {
      var n;
      return (n = e == null ? void 0 : e.inspector) == null ? void 0 : n.read();
    }).filter((e) => !!e) : (console.warn("[Milkdown]: You are trying to collect inspection when inspector is disabled, please enable inspector by `editor.enableInspector()` first."), []);
  }
  static make() {
    return new ii();
  }
  get ctx() {
    return M(this, rr);
  }
  get status() {
    return M(this, ct);
  }
}, nr = new WeakMap(), ct = new WeakMap(), sn = new WeakMap(), ti = new WeakMap(), bo = new WeakMap(), wo = new WeakMap(), tt = new WeakMap(), ln = new WeakMap(), rr = new WeakMap(), xo = new WeakMap(), ir = new WeakMap(), ni = new WeakMap(), Co = new WeakMap(), Rn = new WeakMap(), ri = new WeakMap(), ii);
function X(t, e) {
  const n = vC(t), r = (i) => async () => {
    r.key = n, await i.wait(ji);
    const o = e(i);
    return i.get(ce).create(n, o), r.run = (s) => i.get(ce).call(t, s), () => {
      i.get(ce).remove(n);
    };
  };
  return r;
}
function lt(t) {
  const e = (n) => async () => {
    await n.wait(ot);
    const r = t(n);
    return n.update(to, (i) => [...i, r]), e.inputRule = r, () => {
      n.update(to, (i) => i.filter((o) => o !== r));
    };
  };
  return e;
}
function PC(t) {
  const e = (n) => async () => {
    await n.wait(ot);
    const r = t(n);
    return n.update(ro, (i) => [...i, r]), e.pasteRule = r, () => {
      n.update(ro, (i) => i.filter((o) => o !== r));
    };
  };
  return e;
}
function BC(t, e) {
  const n = (r) => async () => {
    const i = e(r);
    return r.update(Hi, (o) => [...o.filter((s) => s[0] !== t), [t, i]]), n.id = t, n.schema = i, () => {
      r.update(Hi, (o) => o.filter(([s]) => s !== t));
    };
  };
  return n.type = (r) => {
    const i = r.get(_n).marks[t];
    if (!i) throw xy(t);
    return i;
  }, n;
}
function ku(t, e) {
  const n = (r) => async () => {
    const i = e(r);
    return r.update(Vi, (o) => [...o.filter((s) => s[0] !== t), [t, i]]), n.id = t, n.schema = i, () => {
      r.update(Vi, (o) => o.filter(([s]) => s !== t));
    };
  };
  return n.type = (r) => {
    const i = r.get(_n).nodes[t];
    if (!i) throw wy(t);
    return i;
  }, n;
}
function Kt(t) {
  let e;
  const n = (r) => async () => (await r.wait(ot), e = t(r), r.update(pn, (i) => [...i, e]), () => {
    r.update(pn, (i) => i.filter((o) => o !== e));
  });
  return n.plugin = () => e, n.key = () => e.spec.key, n;
}
function FC(t) {
  const e = (n) => async () => {
    await n.wait(qi);
    const r = n.get(As), i = t(n), o = r.addObjectKeymap(i);
    return e.keymap = i, () => {
      o();
    };
  };
  return e;
}
function gn(t, e) {
  const n = oe(t, e), r = (i) => (i.inject(n), () => () => {
    i.remove(n);
  });
  return r.key = n, r;
}
function Me(t, e) {
  const n = gn(e, t), r = ku(t, (o) => o.get(n.key)(o)), i = [n, r];
  return i.id = r.id, i.node = r, i.type = (o) => r.type(o), i.ctx = n, i.key = n.key, i.extendSchema = (o) => Me(t, o(e)), i;
}
function gi(t, e) {
  const n = gn(e, t), r = BC(t, (o) => o.get(n.key)(o)), i = [n, r];
  return i.id = r.id, i.mark = r, i.type = (o) => r.type(o), i.ctx = n, i.key = n.key, i.extendSchema = (o) => gi(t, o(e)), i;
}
function at(t, e) {
  const n = gn(Object.fromEntries(Object.entries(e).map(([o, { shortcuts: s, priority: l }]) => [o, {
    shortcuts: s,
    priority: l
  }])), `${t}Keymap`), r = FC((o) => {
    const s = o.get(n.key), l = Object.entries(e).flatMap(([a, { command: u }]) => {
      const c = s[a], f = [c.shortcuts].flat(), h = c.priority;
      return f.map((d) => [d, {
        key: d,
        onRun: u,
        priority: h
      }]);
    });
    return Object.fromEntries(l);
  }), i = [n, r];
  return i.ctx = n, i.shortcuts = r, i.key = n.key, i.keymap = r.keymap, i;
}
var Rt = (t, e = () => ({})) => gn(e, `${t}Attr`), Ao = (t, e = () => ({})) => gn(e, `${t}Attr`);
function Cr(t, e, n) {
  const r = gn({}, t), i = (s) => async () => {
    await s.wait(cr);
    const l = {
      plugin: e(s),
      options: s.get(r.key)
    };
    return s.update(no, (a) => [...a, l]), () => {
      s.update(no, (a) => a.filter((u) => u !== l));
    };
  }, o = [r, i];
  return o.id = t, o.plugin = i, o.options = r, o;
}
function $C(t, e) {
  return function(n, r) {
    let { $from: i, $to: o, node: s } = n.selection;
    if (s && s.isBlock || i.depth < 2 || !i.sameParent(o))
      return !1;
    let l = i.node(-1);
    if (l.type != t)
      return !1;
    if (i.parent.content.size == 0 && i.node(-1).childCount == i.indexAfter(-1)) {
      if (i.depth == 3 || i.node(-3).type != t || i.index(-2) != i.node(-2).childCount - 1)
        return !1;
      if (r) {
        let f = A.empty, h = i.index(-1) ? 1 : i.index(-2) ? 2 : 3;
        for (let y = i.depth - h; y >= i.depth - 3; y--)
          f = A.from(i.node(y).copy(f));
        let d = i.indexAfter(-1) < i.node(-2).childCount ? 1 : i.indexAfter(-2) < i.node(-3).childCount ? 2 : 3;
        f = f.append(A.from(t.createAndFill()));
        let p = i.before(i.depth - (h - 1)), m = n.tr.replace(p, i.after(-d), new F(f, 4 - h, 0)), k = -1;
        m.doc.nodesBetween(p, m.doc.content.size, (y, O) => {
          if (k > -1)
            return !1;
          y.isTextblock && y.content.size == 0 && (k = O + 1);
        }), k > -1 && m.setSelection(ee.near(m.doc.resolve(k))), r(m.scrollIntoView());
      }
      return !0;
    }
    let a = o.pos == i.end() ? l.contentMatchAt(0).defaultType : null, u = n.tr.delete(i.pos, o.pos), c = a ? [null, { type: a }] : void 0;
    return Bi(u.doc, i.pos, 2, c) ? (r && r(u.split(i.pos, 2, c).scrollIntoView()), !0) : !1;
  };
}
function gm(t) {
  return function(e, n) {
    let { $from: r, $to: i } = e.selection, o = r.blockRange(i, (s) => s.childCount > 0 && s.firstChild.type == t);
    return o ? n ? r.node(o.depth - 1).type == t ? _C(e, n, t, o) : VC(e, n, o) : !0 : !1;
  };
}
function _C(t, e, n, r) {
  let i = t.tr, o = r.end, s = r.$to.end(r.depth);
  o < s && (i.step(new Fe(o - 1, s, o, s, new F(A.from(n.create(null, r.parent.copy())), 1, 0), 1, !0)), r = new Pd(i.doc.resolve(r.$from.pos), i.doc.resolve(s), r.depth));
  const l = js(r);
  if (l == null)
    return !1;
  i.lift(r, l);
  let a = i.doc.resolve(i.mapping.map(o, -1) - 1);
  return qs(i.doc, a.pos) && a.nodeBefore.type == a.nodeAfter.type && i.join(a.pos), e(i.scrollIntoView()), !0;
}
function VC(t, e, n) {
  let r = t.tr, i = n.parent;
  for (let d = n.end, p = n.endIndex - 1, m = n.startIndex; p > m; p--)
    d -= i.child(p).nodeSize, r.delete(d - 1, d + 1);
  let o = r.doc.resolve(n.start), s = o.nodeAfter;
  if (r.mapping.map(n.end) != n.start + o.nodeAfter.nodeSize)
    return !1;
  let l = n.startIndex == 0, a = n.endIndex == i.childCount, u = o.node(-1), c = o.index(-1);
  if (!u.canReplace(c + (l ? 0 : 1), c + 1, s.content.append(a ? A.empty : A.from(i))))
    return !1;
  let f = o.pos, h = f + s.nodeSize;
  return r.step(new Fe(f - (l ? 1 : 0), h + (a ? 1 : 0), f + 1, h - 1, new F((l ? A.empty : A.from(i.copy(A.empty))).append(a ? A.empty : A.from(i.copy(A.empty))), l ? 0 : 1, a ? 0 : 1), l ? 0 : 1)), e(r.scrollIntoView()), !0;
}
function HC(t) {
  return function(e, n) {
    let { $from: r, $to: i } = e.selection, o = r.blockRange(i, (u) => u.childCount > 0 && u.firstChild.type == t);
    if (!o)
      return !1;
    let s = o.startIndex;
    if (s == 0)
      return !1;
    let l = o.parent, a = l.child(s - 1);
    if (a.type != t)
      return !1;
    if (n) {
      let u = a.lastChild && a.lastChild.type == l.type, c = A.from(u ? t.create() : null), f = new F(A.from(t.create(null, A.from(l.type.create(null, c)))), u ? 3 : 1, 0), h = o.start, d = o.end;
      n(e.tr.step(new Fe(h - (u ? 3 : 1), d, h, d, f, 1, !0)).scrollIntoView());
    }
    return !0;
  };
}
function jC(t) {
  const e = /* @__PURE__ */ new Map();
  if (!t || !t.type)
    throw new Error("mdast-util-definitions expected node");
  return di(t, "definition", function(r) {
    const i = kh(r.identifier);
    i && !e.get(i) && e.set(i, r);
  }), n;
  function n(r) {
    const i = kh(r);
    return e.get(i);
  }
}
function kh(t) {
  return String(t || "").toUpperCase();
}
function qC() {
  return function(t) {
    const e = jC(t);
    di(t, function(n, r, i) {
      if (n.type === "definition" && i !== void 0 && typeof r == "number")
        return i.children.splice(r, 1), [ua, r];
      if (n.type === "imageReference" || n.type === "linkReference") {
        const o = e(n.identifier);
        if (o && i && typeof r == "number")
          return i.children[r] = n.type === "imageReference" ? { type: "image", url: o.url, title: o.title, alt: n.alt } : {
            type: "link",
            url: o.url,
            title: o.title,
            children: n.children
          }, [ua, r];
      }
    });
  };
}
function ym(t, e) {
  var r;
  if (!(e.childCount >= 1 && ((r = e.lastChild) == null ? void 0 : r.type.name) === "hardbreak")) {
    t.next(e.content);
    return;
  }
  const n = [];
  e.content.forEach((i, o, s) => {
    s !== e.childCount - 1 && n.push(i);
  }), t.next(A.fromArray(n));
}
function E(t, e) {
  return Object.assign(t, { meta: {
    package: "@milkdown/preset-commonmark",
    ...e
  } }), t;
}
var bu = Ao("emphasis");
E(bu, {
  displayName: "Attr<emphasis>",
  group: "Emphasis"
});
var yi = gi("emphasis", (t) => ({
  attrs: { marker: {
    default: t.get(_i).emphasis || "*",
    validate: "string"
  } },
  parseDOM: [
    { tag: "i" },
    { tag: "em" },
    {
      style: "font-style",
      getAttrs: (e) => e === "italic"
    }
  ],
  toDOM: (e) => ["em", t.get(bu.key)(e)],
  parseMarkdown: {
    match: (e) => e.type === "emphasis",
    runner: (e, n, r) => {
      e.openMark(r, { marker: n.marker }), e.next(n.children), e.closeMark(r);
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "emphasis",
    runner: (e, n) => {
      e.withMark(n, "emphasis", void 0, { marker: n.attrs.marker });
    }
  }
}));
E(yi.mark, {
  displayName: "MarkSchema<emphasis>",
  group: "Emphasis"
});
E(yi.ctx, {
  displayName: "MarkSchemaCtx<emphasis>",
  group: "Emphasis"
});
var wu = X("ToggleEmphasis", (t) => () => No(yi.type(t)));
E(wu, {
  displayName: "Command<toggleEmphasisCommand>",
  group: "Emphasis"
});
var km = lt((t) => To(/(?:^|[^*])\*([^*]+)\*$/, yi.type(t), {
  getAttr: () => ({ marker: "*" }),
  updateCaptured: ({ fullMatch: e, start: n }) => e.startsWith("*") ? {} : {
    fullMatch: e.slice(1),
    start: n + 1
  }
}));
E(km, {
  displayName: "InputRule<emphasis>|Star",
  group: "Emphasis"
});
var bm = lt((t) => To(/\b_(?![_\s])(.*?[^_\s])_\b/, yi.type(t), {
  getAttr: () => ({ marker: "_" }),
  updateCaptured: ({ fullMatch: e, start: n }) => e.startsWith("_") ? {} : {
    fullMatch: e.slice(1),
    start: n + 1
  }
}));
E(bm, {
  displayName: "InputRule<emphasis>|Underscore",
  group: "Emphasis"
});
var xu = at("emphasisKeymap", { ToggleEmphasis: {
  shortcuts: "Mod-i",
  command: (t) => {
    const e = t.get(ce);
    return () => e.call(wu.key);
  }
} });
E(xu.ctx, {
  displayName: "KeymapCtx<emphasis>",
  group: "Emphasis"
});
E(xu.shortcuts, {
  displayName: "Keymap<emphasis>",
  group: "Emphasis"
});
var Cu = Ao("strong");
E(Cu, {
  displayName: "Attr<strong>",
  group: "Strong"
});
var Oo = gi("strong", (t) => ({
  attrs: { marker: {
    default: t.get(_i).strong || "*",
    validate: "string"
  } },
  parseDOM: [
    {
      tag: "b",
      getAttrs: (e) => e.style.fontWeight != "normal" && null
    },
    { tag: "strong" },
    {
      style: "font-style",
      getAttrs: (e) => e === "bold"
    },
    {
      style: "font-weight=400",
      clearMark: (e) => e.type.name == "strong"
    },
    {
      style: "font-weight",
      getAttrs: (e) => /^(bold(er)?|[5-9]\d{2,})$/.test(e) && null
    }
  ],
  toDOM: (e) => ["strong", t.get(Cu.key)(e)],
  parseMarkdown: {
    match: (e) => e.type === "strong",
    runner: (e, n, r) => {
      e.openMark(r, { marker: n.marker }), e.next(n.children), e.closeMark(r);
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "strong",
    runner: (e, n) => {
      e.withMark(n, "strong", void 0, { marker: n.attrs.marker });
    }
  }
}));
E(Oo.mark, {
  displayName: "MarkSchema<strong>",
  group: "Strong"
});
E(Oo.ctx, {
  displayName: "MarkSchemaCtx<strong>",
  group: "Strong"
});
var Su = X("ToggleStrong", (t) => () => No(Oo.type(t)));
E(Su, {
  displayName: "Command<toggleStrongCommand>",
  group: "Strong"
});
var wm = lt((t) => To(new RegExp("(?:^|[^\\\\w:/])(?:\\\\*\\\\*|__)([^*_]+?)(?:\\\\*\\\\*|__)(?![\\\\w/])$"), Oo.type(t), { updateCaptured: (e) => e.fullMatch.startsWith("**") || e.fullMatch.startsWith("__") ? e : { start: e.start + 1, fullMatch: e.fullMatch.slice(1) }, getAttr: (e) => ({ marker: (e[0].startsWith("**") || e[0].startsWith("__") ? e[0] : e[0].slice(1)).startsWith("*") ? "*" : "_" }) }));
E(wm, {
  displayName: "InputRule<strong>",
  group: "Strong"
});
var Mu = at("strongKeymap", { ToggleBold: {
  shortcuts: ["Mod-b"],
  command: (t) => {
    const e = t.get(ce);
    return () => e.call(Su.key);
  }
} });
E(Mu.ctx, {
  displayName: "KeymapCtx<strong>",
  group: "Strong"
});
E(Mu.shortcuts, {
  displayName: "Keymap<strong>",
  group: "Strong"
});
var Nu = Ao("inlineCode");
E(Nu, {
  displayName: "Attr<inlineCode>",
  group: "InlineCode"
});
var Pn = gi("inlineCode", (t) => ({
  priority: 100,
  code: !0,
  parseDOM: [{ tag: "code" }],
  toDOM: (e) => ["code", t.get(Nu.key)(e)],
  parseMarkdown: {
    match: (e) => e.type === "inlineCode",
    runner: (e, n, r) => {
      e.openMark(r), e.addText(n.value), e.closeMark(r);
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "inlineCode",
    runner: (e, n, r) => (e.withMark(n, "inlineCode", r.text || ""), !0)
  }
}));
E(Pn.mark, {
  displayName: "MarkSchema<inlineCode>",
  group: "InlineCode"
});
E(Pn.ctx, {
  displayName: "MarkSchemaCtx<inlineCode>",
  group: "InlineCode"
});
var Tu = X("ToggleInlineCode", (t) => () => (e, n) => {
  const { selection: r, tr: i } = e;
  if (r.empty) return !1;
  const { from: o, to: s } = r;
  return e.doc.rangeHasMark(o, s, Pn.type(t)) ? (n == null || n(i.removeMark(o, s, Pn.type(t))), !0) : (Object.keys(e.schema.marks).filter((l) => l !== Pn.type.name).map((l) => e.schema.marks[l]).forEach((l) => {
    i.removeMark(o, s, l);
  }), n == null || n(i.addMark(o, s, Pn.type(t).create())), !0);
});
E(Tu, {
  displayName: "Command<toggleInlineCodeCommand>",
  group: "InlineCode"
});
var xm = lt((t) => To(/(?:`)([^`]+)(?:`)$/, Pn.type(t)));
E(xm, {
  displayName: "InputRule<inlineCodeInputRule>",
  group: "InlineCode"
});
var vu = at("inlineCodeKeymap", { ToggleInlineCode: {
  shortcuts: "Mod-e",
  command: (t) => {
    const e = t.get(ce);
    return () => e.call(Tu.key);
  }
} });
E(vu.ctx, {
  displayName: "KeymapCtx<inlineCode>",
  group: "InlineCode"
});
E(vu.shortcuts, {
  displayName: "Keymap<inlineCode>",
  group: "InlineCode"
});
var Iu = Ao("link");
E(Iu, {
  displayName: "Attr<link>",
  group: "Link"
});
var Fr = gi("link", (t) => ({
  attrs: {
    href: { validate: "string" },
    title: {
      default: null,
      validate: "string|null"
    }
  },
  parseDOM: [{
    tag: "a[href]",
    getAttrs: (e) => {
      if (!(e instanceof HTMLElement)) throw qt(e);
      return {
        href: e.getAttribute("href"),
        title: e.getAttribute("title")
      };
    }
  }],
  toDOM: (e) => ["a", {
    ...t.get(Iu.key)(e),
    ...e.attrs
  }],
  parseMarkdown: {
    match: (e) => e.type === "link",
    runner: (e, n, r) => {
      const i = n.url, o = n.title;
      e.openMark(r, {
        href: i,
        title: o
      }), e.next(n.children), e.closeMark(r);
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "link",
    runner: (e, n) => {
      e.withMark(n, "link", void 0, {
        title: n.attrs.title,
        url: n.attrs.href
      });
    }
  }
}));
E(Fr.mark, {
  displayName: "MarkSchema<link>",
  group: "Link"
});
var Cm = X("ToggleLink", (t) => (e = {}) => No(Fr.type(t), e));
E(Cm, {
  displayName: "Command<toggleLinkCommand>",
  group: "Link"
});
var Sm = X("UpdateLink", (t) => (e = {}) => (n, r) => {
  if (!r) return !1;
  let i, o = -1;
  const { selection: s } = n, { from: l, to: a } = s;
  if (n.doc.nodesBetween(l, l === a ? a + 1 : a, (p, m) => {
    if (Fr.type(t).isInSet(p.marks))
      return i = p, o = m, !1;
  }), !i) return !1;
  const u = i.marks.find(({ type: p }) => p === Fr.type(t));
  if (!u) return !1;
  const c = o, f = o + i.nodeSize, { tr: h } = n, d = Fr.type(t).create({
    ...u.attrs,
    ...e
  });
  return d ? (r(h.removeMark(c, f, u).addMark(c, f, d).setSelection(new Z(h.selection.$anchor)).scrollIntoView()), !0) : !1;
});
E(Sm, {
  displayName: "Command<updateLinkCommand>",
  group: "Link"
});
var Mm = ku("doc", () => ({
  content: "block+",
  parseMarkdown: {
    match: ({ type: t }) => t === "root",
    runner: (t, e, n) => {
      t.injectRoot(e, n);
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === "doc",
    runner: (t, e) => {
      t.openNode("root"), t.next(e.content);
    }
  }
}));
E(Mm, {
  displayName: "NodeSchema<doc>",
  group: "Doc"
});
function WC(t) {
  return Ga(t, (e) => {
    var n;
    return e.type === "html" && [
      "<br />",
      "<br>",
      "<br >",
      "<br/>"
    ].includes((n = e.value) == null ? void 0 : n.trim());
  }, (e, n) => {
    if (!n.length) return;
    const r = n[n.length - 1];
    if (!r) return;
    const i = r.children.indexOf(e);
    i !== -1 && r.children.splice(i, 1);
  }, !0);
}
var Ys = Cr("remark-preserve-empty-line", () => () => WC);
E(Ys.plugin, {
  displayName: "Remark<remarkPreserveEmptyLine>",
  group: "Remark"
});
E(Ys.options, {
  displayName: "RemarkConfig<remarkPreserveEmptyLine>",
  group: "Remark"
});
var Eu = Rt("paragraph");
E(Eu, {
  displayName: "Attr<paragraph>",
  group: "Paragraph"
});
var jt = Me("paragraph", (t) => ({
  content: "inline*",
  group: "block",
  parseDOM: [{ tag: "p" }],
  toDOM: (e) => [
    "p",
    t.get(Eu.key)(e),
    0
  ],
  parseMarkdown: {
    match: (e) => e.type === "paragraph",
    runner: (e, n, r) => {
      e.openNode(r), n.children ? e.next(n.children) : e.addText(n.value || ""), e.closeNode();
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "paragraph",
    runner: (e, n) => {
      var i;
      const r = (i = t.get(nt).state) == null ? void 0 : i.doc.lastChild;
      e.openNode("paragraph"), (!n.content || n.content.size === 0) && n !== r && KC(t) ? e.addNode("html", void 0, "<br />") : ym(e, n), e.closeNode();
    }
  }
}));
function KC(t) {
  let e = !1;
  try {
    t.get(Ys.id), e = !0;
  } catch {
    e = !1;
  }
  return e;
}
E(jt.node, {
  displayName: "NodeSchema<paragraph>",
  group: "Paragraph"
});
E(jt.ctx, {
  displayName: "NodeSchemaCtx<paragraph>",
  group: "Paragraph"
});
var Au = X("TurnIntoText", (t) => () => un(jt.type(t)));
E(Au, {
  displayName: "Command<turnIntoTextCommand>",
  group: "Paragraph"
});
var Ou = at("paragraphKeymap", { TurnIntoText: {
  shortcuts: "Mod-Alt-0",
  command: (t) => {
    const e = t.get(ce);
    return () => e.call(Au.key);
  }
} });
E(Ou.ctx, {
  displayName: "KeymapCtx<paragraph>",
  group: "Paragraph"
});
E(Ou.shortcuts, {
  displayName: "Keymap<paragraph>",
  group: "Paragraph"
});
var UC = Array(6).fill(0).map((t, e) => e + 1);
function JC(t) {
  return t.textContent.toLowerCase().trim().replace(/\s+/g, "-");
}
var Qs = gn(JC, "headingIdGenerator");
E(Qs, {
  displayName: "Ctx<HeadingIdGenerator>",
  group: "Heading"
});
var Du = Rt("heading");
E(Du, {
  displayName: "Attr<heading>",
  group: "Heading"
});
var Sr = Me("heading", (t) => {
  const e = t.get(Qs.key);
  return {
    content: "inline*",
    group: "block",
    defining: !0,
    attrs: {
      id: {
        default: "",
        validate: "string"
      },
      level: {
        default: 1,
        validate: "number"
      }
    },
    parseDOM: UC.map((n) => ({
      tag: `h${n}`,
      getAttrs: (r) => {
        if (!(r instanceof HTMLElement)) throw qt(r);
        return {
          level: n,
          id: r.id
        };
      }
    })),
    toDOM: (n) => [
      `h${n.attrs.level}`,
      {
        ...t.get(Du.key)(n),
        id: n.attrs.id || e(n)
      },
      0
    ],
    parseMarkdown: {
      match: ({ type: n }) => n === "heading",
      runner: (n, r, i) => {
        const o = r.depth;
        n.openNode(i, { level: o }), n.next(r.children), n.closeNode();
      }
    },
    toMarkdown: {
      match: (n) => n.type.name === "heading",
      runner: (n, r) => {
        n.openNode("heading", void 0, { depth: r.attrs.level }), ym(n, r), n.closeNode();
      }
    }
  };
});
E(Sr.node, {
  displayName: "NodeSchema<heading>",
  group: "Heading"
});
E(Sr.ctx, {
  displayName: "NodeSchemaCtx<heading>",
  group: "Heading"
});
var Nm = lt((t) => mp(/^(#+)\s$/, Sr.type(t), (e) => {
  var o, s;
  const n = (e[1] || "").length || 0, { $from: r } = t.get(nt).state.selection, i = r.node();
  if (i.type.name === "heading") {
    let l = Number(i.attrs.level) + Number(n);
    return l > 6 && (l = 6), { level: l };
  }
  return { level: n };
}));
E(Nm, {
  displayName: "InputRule<wrapInHeadingInputRule>",
  group: "Heading"
});
var Tn = X("WrapInHeading", (t) => (e) => (e ?? (e = 1), e < 1 ? un(jt.type(t)) : un(Sr.type(t), { level: e })));
E(Tn, {
  displayName: "Command<wrapInHeadingCommand>",
  group: "Heading"
});
var Ru = X("DowngradeHeading", (t) => () => (e, n, r) => {
  const { $from: i } = e.selection, o = i.node();
  if (o.type !== Sr.type(t) || !e.selection.empty || i.parentOffset !== 0) return !1;
  const s = o.attrs.level - 1;
  return s ? (n == null || n(e.tr.setNodeMarkup(e.selection.$from.before(), void 0, {
    ...o.attrs,
    level: s
  })), !0) : un(jt.type(t))(e, n, r);
});
E(Ru, {
  displayName: "Command<downgradeHeadingCommand>",
  group: "Heading"
});
var Lu = at("headingKeymap", {
  TurnIntoH1: {
    shortcuts: "Mod-Alt-1",
    command: (t) => {
      const e = t.get(ce);
      return () => e.call(Tn.key, 1);
    }
  },
  TurnIntoH2: {
    shortcuts: "Mod-Alt-2",
    command: (t) => {
      const e = t.get(ce);
      return () => e.call(Tn.key, 2);
    }
  },
  TurnIntoH3: {
    shortcuts: "Mod-Alt-3",
    command: (t) => {
      const e = t.get(ce);
      return () => e.call(Tn.key, 3);
    }
  },
  TurnIntoH4: {
    shortcuts: "Mod-Alt-4",
    command: (t) => {
      const e = t.get(ce);
      return () => e.call(Tn.key, 4);
    }
  },
  TurnIntoH5: {
    shortcuts: "Mod-Alt-5",
    command: (t) => {
      const e = t.get(ce);
      return () => e.call(Tn.key, 5);
    }
  },
  TurnIntoH6: {
    shortcuts: "Mod-Alt-6",
    command: (t) => {
      const e = t.get(ce);
      return () => e.call(Tn.key, 6);
    }
  },
  DowngradeHeading: {
    shortcuts: ["Delete", "Backspace"],
    command: (t) => {
      const e = t.get(ce);
      return () => e.call(Ru.key);
    }
  }
});
E(Lu.ctx, {
  displayName: "KeymapCtx<heading>",
  group: "Heading"
});
E(Lu.shortcuts, {
  displayName: "Keymap<heading>",
  group: "Heading"
});
var zu = Rt("blockquote");
E(zu, {
  displayName: "Attr<blockquote>",
  group: "Blockquote"
});
var Do = Me("blockquote", (t) => ({
  content: "block+",
  group: "block",
  defining: !0,
  parseDOM: [{ tag: "blockquote" }],
  toDOM: (e) => [
    "blockquote",
    t.get(zu.key)(e),
    0
  ],
  parseMarkdown: {
    match: ({ type: e }) => e === "blockquote",
    runner: (e, n, r) => {
      e.openNode(r).next(n.children).closeNode();
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "blockquote",
    runner: (e, n) => {
      e.openNode("blockquote").next(n.content).closeNode();
    }
  }
}));
E(Do.node, {
  displayName: "NodeSchema<blockquote>",
  group: "Blockquote"
});
E(Do.ctx, {
  displayName: "NodeSchemaCtx<blockquote>",
  group: "Blockquote"
});
var Tm = lt((t) => lu(/^\s*>\s$/, Do.type(t)));
E(Tm, {
  displayName: "InputRule<wrapInBlockquoteInputRule>",
  group: "Blockquote"
});
var Pu = X("WrapInBlockquote", (t) => () => su(Do.type(t)));
E(Pu, {
  displayName: "Command<wrapInBlockquoteCommand>",
  group: "Blockquote"
});
var Bu = at("blockquoteKeymap", { WrapInBlockquote: {
  shortcuts: "Mod-Shift-b",
  command: (t) => {
    const e = t.get(ce);
    return () => e.call(Pu.key);
  }
} });
E(Bu.ctx, {
  displayName: "KeymapCtx<blockquote>",
  group: "Blockquote"
});
E(Bu.shortcuts, {
  displayName: "Keymap<blockquote>",
  group: "Blockquote"
});
var Fu = Rt("codeBlock", () => ({
  pre: {},
  code: {}
}));
E(Fu, {
  displayName: "Attr<codeBlock>",
  group: "CodeBlock"
});
var Ro = Me("code_block", (t) => ({
  content: "text*",
  group: "block",
  marks: "",
  defining: !0,
  code: !0,
  attrs: { language: {
    default: "",
    validate: "string"
  } },
  parseDOM: [{
    tag: "pre",
    preserveWhitespace: "full",
    getAttrs: (e) => {
      if (!(e instanceof HTMLElement)) throw qt(e);
      return { language: e.dataset.language };
    }
  }],
  toDOM: (e) => {
    const n = t.get(Fu.key)(e), r = e.attrs.language, i = r && r.length > 0 ? { "data-language": r } : void 0;
    return [
      "pre",
      {
        ...n.pre,
        ...i
      },
      [
        "code",
        n.code,
        0
      ]
    ];
  },
  parseMarkdown: {
    match: ({ type: e }) => e === "code",
    runner: (e, n, r) => {
      const i = n.lang ?? "", o = n.value;
      e.openNode(r, { language: i }), o && e.addText(o), e.closeNode();
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "code_block",
    runner: (e, n) => {
      var r;
      e.addNode("code", void 0, ((r = n.content.firstChild) == null ? void 0 : r.text) || "", { lang: n.attrs.language });
    }
  }
}));
E(Ro.node, {
  displayName: "NodeSchema<codeBlock>",
  group: "CodeBlock"
});
E(Ro.ctx, {
  displayName: "NodeSchemaCtx<codeBlock>",
  group: "CodeBlock"
});
var vm = lt((t) => mp(/^```([a-z]*)?[\s\n]$/, Ro.type(t), (e) => {
  var n;
  return { language: e[1] ?? "" };
}));
E(vm, {
  displayName: "InputRule<createCodeBlockInputRule>",
  group: "CodeBlock"
});
var $u = X("CreateCodeBlock", (t) => (e = "") => un(Ro.type(t), { language: e }));
E($u, {
  displayName: "Command<createCodeBlockCommand>",
  group: "CodeBlock"
});
var GC = X("UpdateCodeBlockLanguage", () => ({ pos: t, language: e } = {
  pos: -1,
  language: ""
}) => (n, r) => t >= 0 ? (r == null || r(n.tr.setNodeAttribute(t, "language", e)), !0) : !1);
E(GC, {
  displayName: "Command<updateCodeBlockLanguageCommand>",
  group: "CodeBlock"
});
var _u = at("codeBlockKeymap", { CreateCodeBlock: {
  shortcuts: "Mod-Alt-c",
  command: (t) => {
    const e = t.get(ce);
    return () => e.call($u.key);
  }
} });
E(_u.ctx, {
  displayName: "KeymapCtx<codeBlock>",
  group: "CodeBlock"
});
E(_u.shortcuts, {
  displayName: "Keymap<codeBlock>",
  group: "CodeBlock"
});
var Vu = Rt("image");
E(Vu, {
  displayName: "Attr<image>",
  group: "Image"
});
var ki = Me("image", (t) => ({
  inline: !0,
  group: "inline",
  selectable: !0,
  draggable: !0,
  marks: "",
  atom: !0,
  defining: !0,
  isolating: !0,
  attrs: {
    src: {
      default: "",
      validate: "string"
    },
    alt: {
      default: "",
      validate: "string"
    },
    title: {
      default: "",
      validate: "string"
    }
  },
  parseDOM: [{
    tag: "img[src]",
    getAttrs: (e) => {
      if (!(e instanceof HTMLElement)) throw qt(e);
      return {
        src: e.getAttribute("src") || "",
        alt: e.getAttribute("alt") || "",
        title: e.getAttribute("title") || e.getAttribute("alt") || ""
      };
    }
  }],
  toDOM: (e) => ["img", {
    ...t.get(Vu.key)(e),
    ...e.attrs
  }],
  parseMarkdown: {
    match: ({ type: e }) => e === "image",
    runner: (e, n, r) => {
      const i = n.url, o = n.alt, s = n.title;
      e.addNode(r, {
        src: i,
        alt: o,
        title: s
      });
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "image",
    runner: (e, n) => {
      e.addNode("image", void 0, void 0, {
        title: n.attrs.title,
        url: n.attrs.src,
        alt: n.attrs.alt
      });
    }
  }
}));
E(ki.node, {
  displayName: "NodeSchema<image>",
  group: "Image"
});
E(ki.ctx, {
  displayName: "NodeSchemaCtx<image>",
  group: "Image"
});
var Im = X("InsertImage", (t) => (e = {}) => (n, r) => {
  if (!r) return !0;
  const { src: i = "", alt: o = "", title: s = "" } = e, l = ki.type(t).create({
    src: i,
    alt: o,
    title: s
  });
  return l && r(n.tr.replaceSelectionWith(l).scrollIntoView()), !0;
});
E(Im, {
  displayName: "Command<insertImageCommand>",
  group: "Image"
});
var Em = X("UpdateImage", (t) => (e = {}) => (n, r) => {
  const i = Aw(n.selection, ki.type(t));
  if (!i) return !1;
  const { node: o, pos: s } = i, l = { ...o.attrs }, { src: a, alt: u, title: c } = e;
  return a !== void 0 && (l.src = a), u !== void 0 && (l.alt = u), c !== void 0 && (l.title = c), r == null || r(n.tr.setNodeMarkup(s, void 0, l).scrollIntoView()), !0;
});
E(Em, {
  displayName: "Command<updateImageCommand>",
  group: "Image"
});
var YC = lt((t) => new mt(/!\[(.*?)]\((.*?)\s*(?="|\))"?([^"]+)?"?\)/, (e, n, r, i) => {
  const [o, s, l = "", a] = n;
  return o ? e.tr.replaceWith(r, i, ki.type(t).create({
    src: l,
    alt: s,
    title: a
  })) : null;
}));
E(YC, {
  displayName: "InputRule<insertImageInputRule>",
  group: "Image"
});
var Os = Rt("hardbreak", (t) => ({
  "data-type": "hardbreak",
  "data-is-inline": t.attrs.isInline
}));
E(Os, {
  displayName: "Attr<hardbreak>",
  group: "Hardbreak"
});
var fr = Me("hardbreak", (t) => ({
  inline: !0,
  group: "inline",
  attrs: { isInline: {
    default: !1,
    validate: "boolean"
  } },
  selectable: !1,
  parseDOM: [{ tag: "br" }, {
    tag: 'span[data-type="hardbreak"]',
    getAttrs: () => ({ isInline: !0 })
  }],
  toDOM: (e) => e.attrs.isInline ? [
    "span",
    t.get(Os.key)(e),
    " "
  ] : ["br", t.get(Os.key)(e)],
  parseMarkdown: {
    match: ({ type: e }) => e === "break",
    runner: (e, n, r) => {
      var i;
      e.addNode(r, { isInline: !!((i = n.data) != null && i.isInline) });
    }
  },
  leafText: () => `
`,
  toMarkdown: {
    match: (e) => e.type.name === "hardbreak",
    runner: (e, n) => {
      n.attrs.isInline ? e.addNode("text", void 0, `
`) : e.addNode("break");
    }
  }
}));
E(fr.node, {
  displayName: "NodeSchema<hardbreak>",
  group: "Hardbreak"
});
E(fr.ctx, {
  displayName: "NodeSchemaCtx<hardbreak>",
  group: "Hardbreak"
});
var Hu = X("InsertHardbreak", (t) => () => (e, n) => {
  var o;
  const { selection: r, tr: i } = e;
  if (!(r instanceof Z)) return !1;
  if (r.empty) {
    const s = r.$from.node();
    if (s.childCount > 0 && ((o = s.lastChild) == null ? void 0 : o.type.name) === "hardbreak")
      return n == null || n(i.replaceRangeWith(r.to - 1, r.to, e.schema.node("paragraph")).setSelection(ee.near(i.doc.resolve(r.to))).scrollIntoView()), !0;
  }
  return n == null || n(i.setMeta("hardbreak", !0).replaceSelectionWith(fr.type(t).create()).scrollIntoView()), !0;
});
E(Hu, {
  displayName: "Command<insertHardbreakCommand>",
  group: "Hardbreak"
});
var ju = at("hardbreakKeymap", { InsertHardbreak: {
  shortcuts: "Shift-Enter",
  command: (t) => {
    const e = t.get(ce);
    return () => e.call(Hu.key);
  }
} });
E(ju.ctx, {
  displayName: "KeymapCtx<hardbreak>",
  group: "Hardbreak"
});
E(ju.shortcuts, {
  displayName: "Keymap<hardbreak>",
  group: "Hardbreak"
});
var qu = Rt("hr");
E(qu, {
  displayName: "Attr<hr>",
  group: "Hr"
});
var Lo = Me("hr", (t) => ({
  group: "block",
  parseDOM: [{ tag: "hr" }],
  toDOM: (e) => ["hr", t.get(qu.key)(e)],
  parseMarkdown: {
    match: ({ type: e }) => e === "thematicBreak",
    runner: (e, n, r) => {
      e.addNode(r);
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "hr",
    runner: (e) => {
      e.addNode("thematicBreak");
    }
  }
}));
E(Lo.node, {
  displayName: "NodeSchema<hr>",
  group: "Hr"
});
E(Lo.ctx, {
  displayName: "NodeSchemaCtx<hr>",
  group: "Hr"
});
var Am = lt((t) => new mt(/^(?:---|___\s|\*\*\*\s)$/, (e, n, r, i) => {
  const { tr: o } = e;
  return n[0] && o.replaceWith(r - 1, i, Lo.type(t).create()), o;
}));
E(Am, {
  displayName: "InputRule<insertHrInputRule>",
  group: "Hr"
});
var Om = X("InsertHr", (t) => () => (e, n) => {
  if (!n) return !0;
  const r = jt.node.type(t).create(), { tr: i, selection: o } = e, { from: s } = o, l = Lo.type(t).create();
  if (!l) return !0;
  const a = i.replaceSelectionWith(l).insert(s, r), u = ee.findFrom(a.doc.resolve(s), 1, !0);
  return u && n(a.setSelection(u).scrollIntoView()), !0;
});
E(Om, {
  displayName: "Command<insertHrCommand>",
  group: "Hr"
});
var Wu = Rt("bulletList");
E(Wu, {
  displayName: "Attr<bulletList>",
  group: "BulletList"
});
var bi = Me("bullet_list", (t) => ({
  content: "listItem+",
  group: "block",
  attrs: { spread: {
    default: !1,
    validate: "boolean"
  } },
  parseDOM: [{
    tag: "ul",
    getAttrs: (e) => {
      if (!(e instanceof HTMLElement)) throw qt(e);
      return { spread: e.dataset.spread === "true" };
    }
  }],
  toDOM: (e) => [
    "ul",
    {
      ...t.get(Wu.key)(e),
      "data-spread": e.attrs.spread
    },
    0
  ],
  parseMarkdown: {
    match: ({ type: e, ordered: n }) => e === "list" && !n,
    runner: (e, n, r) => {
      const i = n.spread != null ? `${n.spread}` : "false";
      e.openNode(r, { spread: i }).next(n.children).closeNode();
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "bullet_list",
    runner: (e, n) => {
      e.openNode("list", void 0, {
        ordered: !1,
        spread: n.attrs.spread
      }).next(n.content).closeNode();
    }
  }
}));
E(bi.node, {
  displayName: "NodeSchema<bulletList>",
  group: "BulletList"
});
E(bi.ctx, {
  displayName: "NodeSchemaCtx<bulletList>",
  group: "BulletList"
});
var Dm = lt((t) => lu(/^\s*([-+*])\s$/, bi.type(t)));
E(Dm, {
  displayName: "InputRule<wrapInBulletListInputRule>",
  group: "BulletList"
});
var Ku = X("WrapInBulletList", (t) => () => su(bi.type(t)));
E(Ku, {
  displayName: "Command<wrapInBulletListCommand>",
  group: "BulletList"
});
var Uu = at("bulletListKeymap", { WrapInBulletList: {
  shortcuts: "Mod-Alt-8",
  command: (t) => {
    const e = t.get(ce);
    return () => e.call(Ku.key);
  }
} });
E(Uu.ctx, {
  displayName: "KeymapCtx<bulletListKeymap>",
  group: "BulletList"
});
E(Uu.shortcuts, {
  displayName: "Keymap<bulletListKeymap>",
  group: "BulletList"
});
var Ju = Rt("orderedList");
E(Ju, {
  displayName: "Attr<orderedList>",
  group: "OrderedList"
});
var wi = Me("ordered_list", (t) => ({
  content: "listItem+",
  group: "block",
  attrs: {
    order: {
      default: 1,
      validate: "number"
    },
    spread: {
      default: !1,
      validate: "boolean"
    }
  },
  parseDOM: [{
    tag: "ol",
    getAttrs: (e) => {
      if (!(e instanceof HTMLElement)) throw qt(e);
      return {
        spread: e.dataset.spread,
        order: e.hasAttribute("start") ? Number(e.getAttribute("start")) : 1
      };
    }
  }],
  toDOM: (e) => [
    "ol",
    {
      ...t.get(Ju.key)(e),
      ...e.attrs.order === 1 ? {} : { start: e.attrs.order },
      "data-spread": e.attrs.spread
    },
    0
  ],
  parseMarkdown: {
    match: ({ type: e, ordered: n }) => e === "list" && !!n,
    runner: (e, n, r) => {
      const i = n.spread != null ? `${n.spread}` : "true";
      e.openNode(r, {
        spread: i,
        order: n.start ?? 1
      }).next(n.children).closeNode();
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "ordered_list",
    runner: (e, n) => {
      e.openNode("list", void 0, {
        ordered: !0,
        start: n.attrs.order ?? 1,
        spread: n.attrs.spread === "true"
      }), e.next(n.content), e.closeNode();
    }
  }
}));
E(wi.node, {
  displayName: "NodeSchema<orderedList>",
  group: "OrderedList"
});
E(wi.ctx, {
  displayName: "NodeSchemaCtx<orderedList>",
  group: "OrderedList"
});
var Rm = lt((t) => lu(/^\s*(\d+)\.\s$/, wi.type(t), (e) => ({ order: Number(e[1]) }), (e, n) => n.childCount + n.attrs.order === Number(e[1])));
E(Rm, {
  displayName: "InputRule<wrapInOrderedListInputRule>",
  group: "OrderedList"
});
var Gu = X("WrapInOrderedList", (t) => () => su(wi.type(t)));
E(Gu, {
  displayName: "Command<wrapInOrderedListCommand>",
  group: "OrderedList"
});
var Yu = at("orderedListKeymap", { WrapInOrderedList: {
  shortcuts: "Mod-Alt-7",
  command: (t) => {
    const e = t.get(ce);
    return () => e.call(Gu.key);
  }
} });
E(Yu.ctx, {
  displayName: "KeymapCtx<orderedList>",
  group: "OrderedList"
});
E(Yu.shortcuts, {
  displayName: "Keymap<orderedList>",
  group: "OrderedList"
});
var Qu = Rt("listItem");
E(Qu, {
  displayName: "Attr<listItem>",
  group: "ListItem"
});
var yn = Me("list_item", (t) => ({
  group: "listItem",
  content: "paragraph block*",
  attrs: {
    label: {
      default: "•",
      validate: "string"
    },
    listType: {
      default: "bullet",
      validate: "string"
    },
    spread: {
      default: !0,
      validate: "boolean"
    }
  },
  defining: !0,
  parseDOM: [{
    tag: "li",
    getAttrs: (e) => {
      if (!(e instanceof HTMLElement)) throw qt(e);
      return {
        label: e.dataset.label,
        listType: e.dataset.listType,
        spread: e.dataset.spread === "true"
      };
    }
  }],
  toDOM: (e) => [
    "li",
    {
      ...t.get(Qu.key)(e),
      "data-label": e.attrs.label,
      "data-list-type": e.attrs.listType,
      "data-spread": e.attrs.spread
    },
    0
  ],
  parseMarkdown: {
    match: ({ type: e }) => e === "listItem",
    runner: (e, n, r) => {
      const i = n.label != null ? `${n.label}.` : "•", o = n.label != null ? "ordered" : "bullet", s = n.spread != null ? `${n.spread}` : "true";
      e.openNode(r, {
        label: i,
        listType: o,
        spread: s
      }), e.next(n.children), e.closeNode();
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "list_item",
    runner: (e, n) => {
      e.openNode("listItem", void 0, { spread: n.attrs.spread }), e.next(n.content), e.closeNode();
    }
  }
}));
E(yn.node, {
  displayName: "NodeSchema<listItem>",
  group: "ListItem"
});
E(yn.ctx, {
  displayName: "NodeSchemaCtx<listItem>",
  group: "ListItem"
});
var Xu = X("SinkListItem", (t) => () => HC(yn.type(t)));
E(Xu, {
  displayName: "Command<sinkListItemCommand>",
  group: "ListItem"
});
var Zu = X("LiftListItem", (t) => () => gm(yn.type(t)));
E(Zu, {
  displayName: "Command<liftListItemCommand>",
  group: "ListItem"
});
var ec = X("SplitListItem", (t) => () => $C(yn.type(t)));
E(ec, {
  displayName: "Command<splitListItemCommand>",
  group: "ListItem"
});
function QC(t) {
  return (e, n, r) => {
    const { selection: i } = e;
    if (!(i instanceof Z)) return !1;
    const { empty: o, $from: s } = i;
    return !o || s.parentOffset !== 0 || s.node(-1).type !== yn.type(t) ? !1 : up(e, n, r);
  };
}
var tc = X("LiftFirstListItem", (t) => () => QC(t));
E(tc, {
  displayName: "Command<liftFirstListItemCommand>",
  group: "ListItem"
});
var nc = at("listItemKeymap", {
  NextListItem: {
    shortcuts: "Enter",
    command: (t) => {
      const e = t.get(ce);
      return () => e.call(ec.key);
    }
  },
  SinkListItem: {
    shortcuts: ["Tab", "Mod-]"],
    command: (t) => {
      const e = t.get(ce);
      return () => e.call(Xu.key);
    }
  },
  LiftListItem: {
    shortcuts: ["Shift-Tab", "Mod-["],
    command: (t) => {
      const e = t.get(ce);
      return () => e.call(Zu.key);
    }
  },
  LiftFirstListItem: {
    shortcuts: ["Backspace", "Delete"],
    command: (t) => {
      const e = t.get(ce);
      return () => e.call(tc.key);
    }
  }
});
E(nc.ctx, {
  displayName: "KeymapCtx<listItem>",
  group: "ListItem"
});
E(nc.shortcuts, {
  displayName: "Keymap<listItem>",
  group: "ListItem"
});
var Lm = ku("text", () => ({
  group: "inline",
  parseMarkdown: {
    match: ({ type: t }) => t === "text",
    runner: (t, e) => {
      t.addText(e.value);
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === "text",
    runner: (t, e) => {
      t.addNode("text", void 0, e.text);
    }
  }
}));
E(Lm, {
  displayName: "NodeSchema<text>",
  group: "Text"
});
var rc = Rt("html");
E(rc, {
  displayName: "Attr<html>",
  group: "Html"
});
var ic = Me("html", (t) => ({
  atom: !0,
  group: "inline",
  inline: !0,
  attrs: { value: {
    default: "",
    validate: "string"
  } },
  toDOM: (e) => {
    const n = document.createElement("span"), r = {
      ...t.get(rc.key)(e),
      "data-value": e.attrs.value,
      "data-type": "html"
    };
    return n.textContent = e.attrs.value, [
      "span",
      r,
      e.attrs.value
    ];
  },
  parseDOM: [{
    tag: 'span[data-type="html"]',
    getAttrs: (e) => ({ value: e.dataset.value ?? "" })
  }],
  parseMarkdown: {
    match: ({ type: e }) => e === "html",
    runner: (e, n, r) => {
      e.addNode(r, { value: n.value });
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "html",
    runner: (e, n) => {
      e.addNode("html", void 0, n.attrs.value);
    }
  }
}));
E(ic.node, {
  displayName: "NodeSchema<html>",
  group: "Html"
});
E(ic.ctx, {
  displayName: "NodeSchemaCtx<html>",
  group: "Html"
});
var XC = [
  Mm,
  Eu,
  jt,
  Qs,
  Du,
  Sr,
  Os,
  fr,
  zu,
  Do,
  Fu,
  Ro,
  qu,
  Lo,
  Vu,
  ki,
  Wu,
  bi,
  Ju,
  wi,
  Qu,
  yn,
  bu,
  yi,
  Cu,
  Oo,
  Nu,
  Pn,
  Iu,
  Fr,
  rc,
  ic,
  Lm
].flat(), ZC = [
  Tm,
  Dm,
  Rm,
  vm,
  Am,
  Nm
].flat(), eS = [], tS = X("IsMarkSelected", () => (t) => (e) => {
  if (!t) return !1;
  const { doc: n, selection: r } = e;
  return n.rangeHasMark(r.from, r.to, t);
}), nS = X("IsNoteSelected", () => (t) => (e) => t ? Ow(e, t).hasNode : !1), rS = X("ClearTextInCurrentBlock", () => () => (t, e) => {
  let n = t.tr;
  const { $from: r, $to: i } = n.selection, { pos: o } = r, { pos: s } = i, l = o - r.node().content.size;
  return l < 0 ? !1 : (n = n.deleteRange(l, s), e == null || e(n), !0);
}), iS = X("SetBlockType", () => (t) => (e, n) => {
  const { nodeType: r, attrs: i = null } = t ?? {};
  if (!r) return !1;
  const o = e.tr, { from: s, to: l } = o.selection;
  try {
    o.setBlockType(s, l, r, i);
  } catch {
    return !1;
  }
  return n == null || n(o), !0;
}), oS = X("WrapInBlockType", () => (t) => (e, n) => {
  const { nodeType: r, attrs: i = null } = t ?? {};
  if (!r) return !1;
  let o = e.tr;
  try {
    const { $from: s, $to: l } = o.selection, a = s.blockRange(l), u = a && tu(a, r, i);
    if (!u) return !1;
    o = o.wrap(a, u);
  } catch {
    return !1;
  }
  return n == null || n(o), !0;
}), sS = X("AddBlockType", () => (t) => (e, n) => {
  const { nodeType: r, attrs: i = null } = t ?? {};
  if (!r) return !1;
  const o = e.tr;
  try {
    const s = r instanceof fn ? r : r.createAndFill(i);
    if (!s) return !1;
    o.replaceSelectionWith(s);
  } catch {
    return !1;
  }
  return n == null || n(o), !0;
}), lS = X("SelectTextNearPos", () => (t) => (e, n) => {
  const { pos: r } = t ?? {};
  if (r == null) return !1;
  const i = (s, l, a) => Math.min(Math.max(s, l), a), o = e.tr;
  try {
    const s = e.doc.resolve(i(r, 0, e.doc.content.size));
    o.setSelection(Z.near(s));
  } catch {
    return !1;
  }
  return n == null || n(o.scrollIntoView()), !0;
}), aS = [
  Au,
  Pu,
  Tn,
  Ru,
  $u,
  Hu,
  Om,
  Im,
  Em,
  Gu,
  Ku,
  Xu,
  ec,
  Zu,
  tc,
  wu,
  Tu,
  Su,
  Cm,
  Sm,
  tS,
  nS,
  rS,
  iS,
  oS,
  sS,
  lS
], uS = [
  Bu,
  _u,
  ju,
  Lu,
  nc,
  Yu,
  Uu,
  Ou,
  xu,
  vu,
  Mu
].flat(), oc = Cr("remarkAddOrderInList", () => () => (t) => {
  di(t, "list", (e) => {
    if (e.ordered) {
      const n = e.start ?? 1;
      e.children.forEach((r, i) => {
        r.label = i + n;
      });
    }
  });
});
E(oc.plugin, {
  displayName: "Remark<remarkAddOrderInListPlugin>",
  group: "Remark"
});
E(oc.options, {
  displayName: "RemarkConfig<remarkAddOrderInListPlugin>",
  group: "Remark"
});
var sc = Cr("remarkLineBreak", () => () => (t) => {
  const e = /[\t ]*(?:\r?\n|\r)/g;
  di(t, "text", (n, r, i) => {
    if (!n.value || typeof n.value != "string") return;
    const o = [];
    let s = 0;
    e.lastIndex = 0;
    let l = e.exec(n.value);
    for (; l; ) {
      const a = l.index;
      s !== a && o.push({
        type: "text",
        value: n.value.slice(s, a)
      }), o.push({
        type: "break",
        data: { isInline: !0 }
      }), s = a + l[0].length, l = e.exec(n.value);
    }
    if (o.length > 0 && i && typeof r == "number")
      return s < n.value.length && o.push({
        type: "text",
        value: n.value.slice(s)
      }), i.children.splice(r, 1, ...o), r + o.length;
  });
});
E(sc.plugin, {
  displayName: "Remark<remarkLineBreak>",
  group: "Remark"
});
E(sc.options, {
  displayName: "RemarkConfig<remarkLineBreak>",
  group: "Remark"
});
var lc = Cr("remarkInlineLink", () => qC);
E(lc.plugin, {
  displayName: "Remark<remarkInlineLinkPlugin>",
  group: "Remark"
});
E(lc.options, {
  displayName: "RemarkConfig<remarkInlineLinkPlugin>",
  group: "Remark"
});
var cS = (t) => !!t.children, fS = (t) => t.type === "html";
function hS(t, e) {
  return n(t, 0, null)[0];
  function n(r, i, o) {
    if (cS(r)) {
      const s = [];
      for (let l = 0, a = r.children.length; l < a; l++) {
        const u = r.children[l];
        if (u) {
          const c = n(u, l, r);
          if (c) for (let f = 0, h = c.length; f < h; f++) {
            const d = c[f];
            d && s.push(d);
          }
        }
      }
      r.children = s;
    }
    return e(r, i, o);
  }
}
var dS = [
  "root",
  "blockquote",
  "listItem"
], ac = Cr("remarkHTMLTransformer", () => () => (t) => {
  hS(t, (e, n, r) => fS(e) ? (r && dS.includes(r.type) && (e.children = [{ ...e }], delete e.value, e.type = "paragraph"), [e]) : [e]);
});
E(ac.plugin, {
  displayName: "Remark<remarkHtmlTransformer>",
  group: "Remark"
});
E(ac.options, {
  displayName: "RemarkConfig<remarkHtmlTransformer>",
  group: "Remark"
});
var uc = Cr("remarkMarker", () => () => (t, e) => {
  const n = (r) => e.value.charAt(r.position.start.offset);
  di(t, (r) => ["strong", "emphasis"].includes(r.type), (r) => {
    r.marker = n(r);
  });
});
E(uc.plugin, {
  displayName: "Remark<remarkMarker>",
  group: "Remark"
});
E(uc.options, {
  displayName: "RemarkConfig<remarkMarker>",
  group: "Remark"
});
var zm = Kt(() => {
  let t = !1;
  const e = new Ee({
    key: new Ve("MILKDOWN_INLINE_NODES_CURSOR"),
    state: {
      init() {
        return !1;
      },
      apply(n) {
        if (!n.selection.empty) return !1;
        const r = n.selection.$from, i = r.nodeBefore, o = r.nodeAfter;
        return !!(i && o && i.isInline && !i.isText && o.isInline && !o.isText);
      }
    },
    props: {
      handleDOMEvents: {
        compositionend: (n, r) => t ? (t = !1, requestAnimationFrame(() => {
          if (e.getState(n.state)) {
            const i = n.state.selection.from;
            r.preventDefault(), n.dispatch(n.state.tr.insertText(r.data || "", i));
          }
        }), !0) : !1,
        compositionstart: (n) => (e.getState(n.state) && (t = !0), !1),
        beforeinput: (n, r) => {
          if (e.getState(n.state) && r instanceof InputEvent && r.data && !t) {
            const i = n.state.selection.from;
            return r.preventDefault(), n.dispatch(n.state.tr.insertText(r.data || "", i)), !0;
          }
          return !1;
        }
      },
      decorations(n) {
        if (e.getState(n)) {
          const r = n.selection.$from.pos, i = document.createElement("span"), o = ze.widget(r, i, { side: -1 }), s = document.createElement("span"), l = ze.widget(r, s);
          return setTimeout(() => {
            i.contentEditable = "true", s.contentEditable = "true";
          }), ge.create(n.doc, [o, l]);
        }
        return ge.empty;
      }
    }
  });
  return e;
});
E(zm, {
  displayName: "Prose<inlineNodesCursorPlugin>",
  group: "Prose"
});
var Pm = Kt((t) => new Ee({
  key: new Ve("MILKDOWN_HARDBREAK_MARKS"),
  appendTransaction: (e, n, r) => {
    if (!e.length) return;
    const [i] = e;
    if (!i) return;
    const [o] = i.steps;
    if (i.getMeta("hardbreak")) {
      if (!(o instanceof we)) return;
      const { from: s } = o;
      return r.tr.setNodeMarkup(s, fr.type(t), void 0, []);
    }
    if (o instanceof an) {
      let s = r.tr;
      const { from: l, to: a } = o;
      return r.doc.nodesBetween(l, a, (u, c) => {
        u.type === fr.type(t) && (s = s.setNodeMarkup(c, fr.type(t), void 0, []));
      }), s;
    }
  }
}));
E(Pm, {
  displayName: "Prose<hardbreakClearMarkPlugin>",
  group: "Prose"
});
var cc = gn(["table", "code_block"], "hardbreakFilterNodes");
E(cc, {
  displayName: "Ctx<hardbreakFilterNodes>",
  group: "Prose"
});
var Bm = Kt((t) => {
  const e = t.get(cc.key);
  return new Ee({
    key: new Ve("MILKDOWN_HARDBREAK_FILTER"),
    filterTransaction: (n, r) => {
      const i = n.getMeta("hardbreak"), [o] = n.steps;
      if (i && o) {
        const { from: s } = o, l = r.doc.resolve(s);
        let a = l.depth, u = !0;
        for (; a > 0; )
          e.includes(l.node(a).type.name) && (u = !1), a--;
        return u;
      }
      return !0;
    }
  });
});
E(Bm, {
  displayName: "Prose<hardbreakFilterPlugin>",
  group: "Prose"
});
var Fm = Kt((t) => {
  const e = new Ve("MILKDOWN_HEADING_ID"), n = (r) => {
    if (r.composing) return;
    const i = t.get(Qs.key), o = r.state.tr.setMeta("addToHistory", !1);
    let s = !1;
    const l = {};
    r.state.doc.descendants((a, u) => {
      if (a.type === Sr.type(t)) {
        if (a.textContent.trim().length === 0) return;
        const c = a.attrs;
        let f = i(a);
        l[f] ? (l[f] += 1, f += `-#${l[f]}`) : l[f] = 1, c.id !== f && (s = !0, o.setMeta(e, !0).setNodeMarkup(u, void 0, {
          ...c,
          id: f
        }));
      }
    }), s && r.dispatch(o);
  };
  return new Ee({
    key: e,
    view: (r) => (n(r), { update: (i, o) => {
      i.state.doc.eq(o.doc) || n(i);
    } })
  });
});
E(Fm, {
  displayName: "Prose<syncHeadingIdPlugin>",
  group: "Prose"
});
var $m = Kt((t) => {
  const e = (n, r, i) => {
    if (!i.selection || n.some((f) => f.getMeta("addToHistory") === !1 || !f.isGeneric)) return null;
    const o = wi.type(t), s = bi.type(t), l = yn.type(t), a = (f, h, d = 1) => {
      let p = !1;
      const m = `${h + d}.`;
      return f.label !== m && (f.label = m, p = !0), p;
    };
    let u = i.tr, c = !1;
    return i.doc.descendants((f, h, d, p) => {
      if (f.type === s) {
        const m = f.maybeChild(0);
        (m == null ? void 0 : m.type) === l && m.attrs.listType === "ordered" && (c = !0, u.setNodeMarkup(h, o, { spread: "true" }), f.descendants((k, y, O, T) => {
          if (k.type === l) {
            const V = { ...k.attrs };
            a(V, T) && (u = u.setNodeMarkup(y, void 0, V));
          }
          return !1;
        }));
      } else if (f.type === l && (d == null ? void 0 : d.type) === o) {
        const m = { ...f.attrs };
        let k = !1;
        m.listType !== "ordered" && (m.listType = "ordered", k = !0), d != null && d.maybeChild(0) && (k = a(m, p, (d == null ? void 0 : d.attrs.order) ?? 1)), k && (u = u.setNodeMarkup(h, void 0, m), c = !0);
      }
    }), c ? u.setMeta("addToHistory", !1) : null;
  };
  return new Ee({
    key: new Ve("MILKDOWN_KEEP_LIST_ORDER"),
    appendTransaction: e
  });
});
E($m, {
  displayName: "Prose<syncListOrderPlugin>",
  group: "Prose"
});
var pS = [
  Pm,
  cc,
  Bm,
  zm,
  oc,
  lc,
  sc,
  ac,
  uc,
  Ys,
  Fm,
  $m
].flat(), mS = [
  XC,
  ZC,
  eS,
  aS,
  uS,
  pS
].flat();
let Pa, Ba;
if (typeof WeakMap < "u") {
  let t = /* @__PURE__ */ new WeakMap();
  Pa = (e) => t.get(e), Ba = (e, n) => (t.set(e, n), n);
} else {
  const t = [];
  let n = 0;
  Pa = (r) => {
    for (let i = 0; i < t.length; i += 2) if (t[i] == r) return t[i + 1];
  }, Ba = (r, i) => (n == 10 && (n = 0), t[n++] = r, t[n++] = i);
}
var fe = class {
  constructor(t, e, n, r) {
    this.width = t, this.height = e, this.map = n, this.problems = r;
  }
  findCell(t) {
    for (let e = 0; e < this.map.length; e++) {
      const n = this.map[e];
      if (n != t) continue;
      const r = e % this.width, i = e / this.width | 0;
      let o = r + 1, s = i + 1;
      for (let l = 1; o < this.width && this.map[e + l] == n; l++) o++;
      for (let l = 1; s < this.height && this.map[e + this.width * l] == n; l++) s++;
      return {
        left: r,
        top: i,
        right: o,
        bottom: s
      };
    }
    throw new RangeError(`No cell with offset ${t} found`);
  }
  colCount(t) {
    for (let e = 0; e < this.map.length; e++) if (this.map[e] == t) return e % this.width;
    throw new RangeError(`No cell with offset ${t} found`);
  }
  nextCell(t, e, n) {
    const { left: r, right: i, top: o, bottom: s } = this.findCell(t);
    return e == "horiz" ? (n < 0 ? r == 0 : i == this.width) ? null : this.map[o * this.width + (n < 0 ? r - 1 : i)] : (n < 0 ? o == 0 : s == this.height) ? null : this.map[r + this.width * (n < 0 ? o - 1 : s)];
  }
  rectBetween(t, e) {
    const { left: n, right: r, top: i, bottom: o } = this.findCell(t), { left: s, right: l, top: a, bottom: u } = this.findCell(e);
    return {
      left: Math.min(n, s),
      top: Math.min(i, a),
      right: Math.max(r, l),
      bottom: Math.max(o, u)
    };
  }
  cellsInRect(t) {
    const e = [], n = {};
    for (let r = t.top; r < t.bottom; r++) for (let i = t.left; i < t.right; i++) {
      const o = r * this.width + i, s = this.map[o];
      n[s] || (n[s] = !0, !(i == t.left && i && this.map[o - 1] == s || r == t.top && r && this.map[o - this.width] == s) && e.push(s));
    }
    return e;
  }
  positionAt(t, e, n) {
    for (let r = 0, i = 0; ; r++) {
      const o = i + n.child(r).nodeSize;
      if (r == t) {
        let s = e + t * this.width;
        const l = (t + 1) * this.width;
        for (; s < l && this.map[s] < i; ) s++;
        return s == l ? o - 1 : this.map[s];
      }
      i = o;
    }
  }
  static get(t) {
    return Pa(t) || Ba(t, gS(t));
  }
};
function gS(t) {
  if (t.type.spec.tableRole != "table") throw new RangeError("Not a table node: " + t.type.name);
  const e = yS(t), n = t.childCount, r = [];
  let i = 0, o = null;
  const s = [];
  for (let u = 0, c = e * n; u < c; u++) r[u] = 0;
  for (let u = 0, c = 0; u < n; u++) {
    const f = t.child(u);
    c++;
    for (let p = 0; ; p++) {
      for (; i < r.length && r[i] != 0; ) i++;
      if (p == f.childCount) break;
      const m = f.child(p), { colspan: k, rowspan: y, colwidth: O } = m.attrs;
      for (let T = 0; T < y; T++) {
        if (T + u >= n) {
          (o || (o = [])).push({
            type: "overlong_rowspan",
            pos: c,
            n: y - T
          });
          break;
        }
        const V = i + T * e;
        for (let _ = 0; _ < k; _++) {
          r[V + _] == 0 ? r[V + _] = c : (o || (o = [])).push({
            type: "collision",
            row: u,
            pos: c,
            n: k - _
          });
          const S = O && O[_];
          if (S) {
            const R = (V + _) % e * 2, q = s[R];
            q == null || q != S && s[R + 1] == 1 ? (s[R] = S, s[R + 1] = 1) : q == S && s[R + 1]++;
          }
        }
      }
      i += k, c += m.nodeSize;
    }
    const h = (u + 1) * e;
    let d = 0;
    for (; i < h; ) r[i++] == 0 && d++;
    d && (o || (o = [])).push({
      type: "missing",
      row: u,
      n: d
    }), c++;
  }
  (e === 0 || n === 0) && (o || (o = [])).push({ type: "zero_sized" });
  const l = new fe(e, n, r, o);
  let a = !1;
  for (let u = 0; !a && u < s.length; u += 2) s[u] != null && s[u + 1] < n && (a = !0);
  return a && kS(l, s, t), l;
}
function yS(t) {
  let e = -1, n = !1;
  for (let r = 0; r < t.childCount; r++) {
    const i = t.child(r);
    let o = 0;
    if (n) for (let s = 0; s < r; s++) {
      const l = t.child(s);
      for (let a = 0; a < l.childCount; a++) {
        const u = l.child(a);
        s + u.attrs.rowspan > r && (o += u.attrs.colspan);
      }
    }
    for (let s = 0; s < i.childCount; s++) {
      const l = i.child(s);
      o += l.attrs.colspan, l.attrs.rowspan > 1 && (n = !0);
    }
    e == -1 ? e = o : e != o && (e = Math.max(e, o));
  }
  return e;
}
function kS(t, e, n) {
  t.problems || (t.problems = []);
  const r = {};
  for (let i = 0; i < t.map.length; i++) {
    const o = t.map[i];
    if (r[o]) continue;
    r[o] = !0;
    const s = n.nodeAt(o);
    if (!s) throw new RangeError(`No cell with offset ${o} found`);
    let l = null;
    const a = s.attrs;
    for (let u = 0; u < a.colspan; u++) {
      const c = e[(i + u) % t.width * 2];
      c != null && (!a.colwidth || a.colwidth[u] != c) && ((l || (l = bS(a)))[u] = c);
    }
    l && t.problems.unshift({
      type: "colwidth mismatch",
      pos: o,
      colwidth: l
    });
  }
}
function bS(t) {
  if (t.colwidth) return t.colwidth.slice();
  const e = [];
  for (let n = 0; n < t.colspan; n++) e.push(0);
  return e;
}
function bh(t, e) {
  if (typeof t == "string") return {};
  const n = t.getAttribute("data-colwidth"), r = n && /^\d+(,\d+)*$/.test(n) ? n.split(",").map((s) => Number(s)) : null, i = Number(t.getAttribute("colspan") || 1), o = {
    colspan: i,
    rowspan: Number(t.getAttribute("rowspan") || 1),
    colwidth: r && r.length == i ? r : null
  };
  for (const s in e) {
    const l = e[s].getFromDOM, a = l && l(t);
    a != null && (o[s] = a);
  }
  return o;
}
function wh(t, e) {
  const n = {};
  t.attrs.colspan != 1 && (n.colspan = t.attrs.colspan), t.attrs.rowspan != 1 && (n.rowspan = t.attrs.rowspan), t.attrs.colwidth && (n["data-colwidth"] = t.attrs.colwidth.join(","));
  for (const r in e) {
    const i = e[r].setDOMAttr;
    i && i(t.attrs[r], n);
  }
  return n;
}
function wS(t) {
  if (t !== null) {
    if (!Array.isArray(t)) throw new TypeError("colwidth must be null or an array");
    for (const e of t) if (typeof e != "number") throw new TypeError("colwidth must be null or an array of numbers");
  }
}
function xS(t) {
  const e = t.cellAttributes || {}, n = {
    colspan: {
      default: 1,
      validate: "number"
    },
    rowspan: {
      default: 1,
      validate: "number"
    },
    colwidth: {
      default: null,
      validate: wS
    }
  };
  for (const r in e) n[r] = {
    default: e[r].default,
    validate: e[r].validate
  };
  return {
    table: {
      content: "table_row+",
      tableRole: "table",
      isolating: !0,
      group: t.tableGroup,
      parseDOM: [{ tag: "table" }],
      toDOM() {
        return ["table", ["tbody", 0]];
      }
    },
    table_row: {
      content: "(table_cell | table_header)*",
      tableRole: "row",
      parseDOM: [{ tag: "tr" }],
      toDOM() {
        return ["tr", 0];
      }
    },
    table_cell: {
      content: t.cellContent,
      attrs: n,
      tableRole: "cell",
      isolating: !0,
      parseDOM: [{
        tag: "td",
        getAttrs: (r) => bh(r, e)
      }],
      toDOM(r) {
        return [
          "td",
          wh(r, e),
          0
        ];
      }
    },
    table_header: {
      content: t.cellContent,
      attrs: n,
      tableRole: "header_cell",
      isolating: !0,
      parseDOM: [{
        tag: "th",
        getAttrs: (r) => bh(r, e)
      }],
      toDOM(r) {
        return [
          "th",
          wh(r, e),
          0
        ];
      }
    }
  };
}
function Je(t) {
  let e = t.cached.tableNodeTypes;
  if (!e) {
    e = t.cached.tableNodeTypes = {};
    for (const n in t.nodes) {
      const r = t.nodes[n], i = r.spec.tableRole;
      i && (e[i] = r);
    }
  }
  return e;
}
const En = new Ve("selectingCells");
function fi(t) {
  for (let e = t.depth - 1; e > 0; e--) if (t.node(e).type.spec.tableRole == "row") return t.node(0).resolve(t.before(e + 1));
  return null;
}
function ve(t) {
  const e = t.selection.$head;
  for (let n = e.depth; n > 0; n--) if (e.node(n).type.spec.tableRole == "row") return !0;
  return !1;
}
function Xs(t) {
  const e = t.selection;
  if ("$anchorCell" in e && e.$anchorCell) return e.$anchorCell.pos > e.$headCell.pos ? e.$anchorCell : e.$headCell;
  if ("node" in e && e.node && e.node.type.spec.tableRole == "cell") return e.$anchor;
  const n = fi(e.$head) || CS(e.$head);
  if (n) return n;
  throw new RangeError(`No cell found around position ${e.head}`);
}
function CS(t) {
  for (let e = t.nodeAfter, n = t.pos; e; e = e.firstChild, n++) {
    const r = e.type.spec.tableRole;
    if (r == "cell" || r == "header_cell") return t.doc.resolve(n);
  }
  for (let e = t.nodeBefore, n = t.pos; e; e = e.lastChild, n--) {
    const r = e.type.spec.tableRole;
    if (r == "cell" || r == "header_cell") return t.doc.resolve(n - e.nodeSize);
  }
}
function Fa(t) {
  return t.parent.type.spec.tableRole == "row" && !!t.nodeAfter;
}
function SS(t) {
  return t.node(0).resolve(t.pos + t.nodeAfter.nodeSize);
}
function fc(t, e) {
  return t.depth == e.depth && t.pos >= e.start(-1) && t.pos <= e.end(-1);
}
function _m(t, e, n) {
  const r = t.node(-1), i = fe.get(r), o = t.start(-1), s = i.nextCell(t.pos - o, e, n);
  return s == null ? null : t.node(0).resolve(o + s);
}
function xr(t, e, n = 1) {
  const r = {
    ...t,
    colspan: t.colspan - n
  };
  return r.colwidth && (r.colwidth = r.colwidth.slice(), r.colwidth.splice(e, n), r.colwidth.some((i) => i > 0) || (r.colwidth = null)), r;
}
function MS(t, e, n = 1) {
  const r = {
    ...t,
    colspan: t.colspan + n
  };
  if (r.colwidth) {
    r.colwidth = r.colwidth.slice();
    for (let i = 0; i < n; i++) r.colwidth.splice(e, 0, 0);
  }
  return r;
}
function NS(t, e, n) {
  const r = Je(e.type.schema).header_cell;
  for (let i = 0; i < t.height; i++) if (e.nodeAt(t.map[n + i * t.width]).type != r) return !1;
  return !0;
}
var me = class Xt extends ee {
  constructor(e, n = e) {
    const r = e.node(-1), i = fe.get(r), o = e.start(-1), s = i.rectBetween(e.pos - o, n.pos - o), l = e.node(0), a = i.cellsInRect(s).filter((c) => c != n.pos - o);
    a.unshift(n.pos - o);
    const u = a.map((c) => {
      const f = r.nodeAt(c);
      if (!f) throw new RangeError(`No cell with offset ${c} found`);
      const h = o + c + 1;
      return new op(l.resolve(h), l.resolve(h + f.content.size));
    });
    super(u[0].$from, u[0].$to, u), this.$anchorCell = e, this.$headCell = n;
  }
  map(e, n) {
    const r = e.resolve(n.map(this.$anchorCell.pos)), i = e.resolve(n.map(this.$headCell.pos));
    if (Fa(r) && Fa(i) && fc(r, i)) {
      const o = this.$anchorCell.node(-1) != r.node(-1);
      return o && this.isRowSelection() ? Xt.rowSelection(r, i) : o && this.isColSelection() ? Xt.colSelection(r, i) : new Xt(r, i);
    }
    return Z.between(r, i);
  }
  content() {
    const e = this.$anchorCell.node(-1), n = fe.get(e), r = this.$anchorCell.start(-1), i = n.rectBetween(this.$anchorCell.pos - r, this.$headCell.pos - r), o = {}, s = [];
    for (let a = i.top; a < i.bottom; a++) {
      const u = [];
      for (let c = a * n.width + i.left, f = i.left; f < i.right; f++, c++) {
        const h = n.map[c];
        if (o[h]) continue;
        o[h] = !0;
        const d = n.findCell(h);
        let p = e.nodeAt(h);
        if (!p) throw new RangeError(`No cell with offset ${h} found`);
        const m = i.left - d.left, k = d.right - i.right;
        if (m > 0 || k > 0) {
          let y = p.attrs;
          if (m > 0 && (y = xr(y, 0, m)), k > 0 && (y = xr(y, y.colspan - k, k)), d.left < i.left) {
            if (p = p.type.createAndFill(y), !p) throw new RangeError(`Could not create cell with attrs ${JSON.stringify(y)}`);
          } else p = p.type.create(y, p.content);
        }
        if (d.top < i.top || d.bottom > i.bottom) {
          const y = {
            ...p.attrs,
            rowspan: Math.min(d.bottom, i.bottom) - Math.max(d.top, i.top)
          };
          d.top < i.top ? p = p.type.createAndFill(y) : p = p.type.create(y, p.content);
        }
        u.push(p);
      }
      s.push(e.child(a).copy(A.from(u)));
    }
    const l = this.isColSelection() && this.isRowSelection() ? e : s;
    return new F(A.from(l), 1, 1);
  }
  replace(e, n = F.empty) {
    const r = e.steps.length, i = this.ranges;
    for (let s = 0; s < i.length; s++) {
      const { $from: l, $to: a } = i[s], u = e.mapping.slice(r);
      e.replace(u.map(l.pos), u.map(a.pos), s ? F.empty : n);
    }
    const o = ee.findFrom(e.doc.resolve(e.mapping.slice(r).map(this.to)), -1);
    o && e.setSelection(o);
  }
  replaceWith(e, n) {
    this.replace(e, new F(A.from(n), 0, 0));
  }
  forEachCell(e) {
    const n = this.$anchorCell.node(-1), r = fe.get(n), i = this.$anchorCell.start(-1), o = r.cellsInRect(r.rectBetween(this.$anchorCell.pos - i, this.$headCell.pos - i));
    for (let s = 0; s < o.length; s++) e(n.nodeAt(o[s]), i + o[s]);
  }
  isColSelection() {
    const e = this.$anchorCell.index(-1), n = this.$headCell.index(-1);
    if (Math.min(e, n) > 0) return !1;
    const r = e + this.$anchorCell.nodeAfter.attrs.rowspan, i = n + this.$headCell.nodeAfter.attrs.rowspan;
    return Math.max(r, i) == this.$headCell.node(-1).childCount;
  }
  static colSelection(e, n = e) {
    const r = e.node(-1), i = fe.get(r), o = e.start(-1), s = i.findCell(e.pos - o), l = i.findCell(n.pos - o), a = e.node(0);
    return s.top <= l.top ? (s.top > 0 && (e = a.resolve(o + i.map[s.left])), l.bottom < i.height && (n = a.resolve(o + i.map[i.width * (i.height - 1) + l.right - 1]))) : (l.top > 0 && (n = a.resolve(o + i.map[l.left])), s.bottom < i.height && (e = a.resolve(o + i.map[i.width * (i.height - 1) + s.right - 1]))), new Xt(e, n);
  }
  isRowSelection() {
    const e = this.$anchorCell.node(-1), n = fe.get(e), r = this.$anchorCell.start(-1), i = n.colCount(this.$anchorCell.pos - r), o = n.colCount(this.$headCell.pos - r);
    if (Math.min(i, o) > 0) return !1;
    const s = i + this.$anchorCell.nodeAfter.attrs.colspan, l = o + this.$headCell.nodeAfter.attrs.colspan;
    return Math.max(s, l) == n.width;
  }
  eq(e) {
    return e instanceof Xt && e.$anchorCell.pos == this.$anchorCell.pos && e.$headCell.pos == this.$headCell.pos;
  }
  static rowSelection(e, n = e) {
    const r = e.node(-1), i = fe.get(r), o = e.start(-1), s = i.findCell(e.pos - o), l = i.findCell(n.pos - o), a = e.node(0);
    return s.left <= l.left ? (s.left > 0 && (e = a.resolve(o + i.map[s.top * i.width])), l.right < i.width && (n = a.resolve(o + i.map[i.width * (l.top + 1) - 1]))) : (l.left > 0 && (n = a.resolve(o + i.map[l.top * i.width])), s.right < i.width && (e = a.resolve(o + i.map[i.width * (s.top + 1) - 1]))), new Xt(e, n);
  }
  toJSON() {
    return {
      type: "cell",
      anchor: this.$anchorCell.pos,
      head: this.$headCell.pos
    };
  }
  static fromJSON(e, n) {
    return new Xt(e.resolve(n.anchor), e.resolve(n.head));
  }
  static create(e, n, r = n) {
    return new Xt(e.resolve(n), e.resolve(r));
  }
  getBookmark() {
    return new TS(this.$anchorCell.pos, this.$headCell.pos);
  }
};
me.prototype.visible = !1;
ee.jsonID("cell", me);
var TS = class Vm {
  constructor(e, n) {
    this.anchor = e, this.head = n;
  }
  map(e) {
    return new Vm(e.map(this.anchor), e.map(this.head));
  }
  resolve(e) {
    const n = e.resolve(this.anchor), r = e.resolve(this.head);
    return n.parent.type.spec.tableRole == "row" && r.parent.type.spec.tableRole == "row" && n.index() < n.parent.childCount && r.index() < r.parent.childCount && fc(n, r) ? new me(n, r) : ee.near(r, 1);
  }
};
function vS(t) {
  if (!(t.selection instanceof me)) return null;
  const e = [];
  return t.selection.forEachCell((n, r) => {
    e.push(ze.node(r, r + n.nodeSize, { class: "selectedCell" }));
  }), ge.create(t.doc, e);
}
function IS({ $from: t, $to: e }) {
  if (t.pos == e.pos || t.pos < e.pos - 6) return !1;
  let n = t.pos, r = e.pos, i = t.depth;
  for (; i >= 0 && !(t.after(i + 1) < t.end(i)); i--, n++) ;
  for (let o = e.depth; o >= 0 && !(e.before(o + 1) > e.start(o)); o--, r--) ;
  return n == r && /row|table/.test(t.node(i).type.spec.tableRole);
}
function ES({ $from: t, $to: e }) {
  let n, r;
  for (let i = t.depth; i > 0; i--) {
    const o = t.node(i);
    if (o.type.spec.tableRole === "cell" || o.type.spec.tableRole === "header_cell") {
      n = o;
      break;
    }
  }
  for (let i = e.depth; i > 0; i--) {
    const o = e.node(i);
    if (o.type.spec.tableRole === "cell" || o.type.spec.tableRole === "header_cell") {
      r = o;
      break;
    }
  }
  return n !== r && e.parentOffset === 0;
}
function AS(t, e, n) {
  const r = (e || t).selection, i = (e || t).doc;
  let o, s;
  if (r instanceof Q && (s = r.node.type.spec.tableRole)) {
    if (s == "cell" || s == "header_cell") o = me.create(i, r.from);
    else if (s == "row") {
      const l = i.resolve(r.from + 1);
      o = me.rowSelection(l, l);
    } else if (!n) {
      const l = fe.get(r.node), a = r.from + 1, u = a + l.map[l.width * l.height - 1];
      o = me.create(i, a + 1, u);
    }
  } else r instanceof Z && IS(r) ? o = Z.create(i, r.from) : r instanceof Z && ES(r) && (o = Z.create(i, r.$from.start(), r.$from.end()));
  return o && (e || (e = t.tr)).setSelection(o), e;
}
const OS = new Ve("fix-tables");
function Hm(t, e, n, r) {
  const i = t.childCount, o = e.childCount;
  e: for (let s = 0, l = 0; s < o; s++) {
    const a = e.child(s);
    for (let u = l, c = Math.min(i, s + 3); u < c; u++) if (t.child(u) == a) {
      l = u + 1, n += a.nodeSize;
      continue e;
    }
    r(a, n), l < i && t.child(l).sameMarkup(a) ? Hm(t.child(l), a, n + 1, r) : a.nodesBetween(0, a.content.size, r, n + 1), n += a.nodeSize;
  }
}
function DS(t, e) {
  let n;
  const r = (i, o) => {
    i.type.spec.tableRole == "table" && (n = RS(t, i, o, n));
  };
  return e ? e.doc != t.doc && Hm(e.doc, t.doc, 0, r) : t.doc.descendants(r), n;
}
function RS(t, e, n, r) {
  const i = fe.get(e);
  if (!i.problems) return r;
  r || (r = t.tr);
  const o = [];
  for (let a = 0; a < i.height; a++) o.push(0);
  for (let a = 0; a < i.problems.length; a++) {
    const u = i.problems[a];
    if (u.type == "collision") {
      const c = e.nodeAt(u.pos);
      if (!c) continue;
      const f = c.attrs;
      for (let h = 0; h < f.rowspan; h++) o[u.row + h] += u.n;
      r.setNodeMarkup(r.mapping.map(n + 1 + u.pos), null, xr(f, f.colspan - u.n, u.n));
    } else if (u.type == "missing") o[u.row] += u.n;
    else if (u.type == "overlong_rowspan") {
      const c = e.nodeAt(u.pos);
      if (!c) continue;
      r.setNodeMarkup(r.mapping.map(n + 1 + u.pos), null, {
        ...c.attrs,
        rowspan: c.attrs.rowspan - u.n
      });
    } else if (u.type == "colwidth mismatch") {
      const c = e.nodeAt(u.pos);
      if (!c) continue;
      r.setNodeMarkup(r.mapping.map(n + 1 + u.pos), null, {
        ...c.attrs,
        colwidth: u.colwidth
      });
    } else if (u.type == "zero_sized") {
      const c = r.mapping.map(n);
      r.delete(c, c + e.nodeSize);
    }
  }
  let s, l;
  for (let a = 0; a < o.length; a++) o[a] && (s == null && (s = a), l = a);
  for (let a = 0, u = n + 1; a < i.height; a++) {
    const c = e.child(a), f = u + c.nodeSize, h = o[a];
    if (h > 0) {
      let d = "cell";
      c.firstChild && (d = c.firstChild.type.spec.tableRole);
      const p = [];
      for (let k = 0; k < h; k++) {
        const y = Je(t.schema)[d].createAndFill();
        y && p.push(y);
      }
      const m = (a == 0 || s == a - 1) && l == a ? u + 1 : f - 1;
      r.insert(r.mapping.map(m), p);
    }
    u = f;
  }
  return r.setMeta(OS, { fixTables: !0 });
}
function jm(t) {
  const e = fe.get(t), n = [], r = e.height, i = e.width;
  for (let o = 0; o < r; o++) {
    const s = [];
    for (let l = 0; l < i; l++) {
      const a = o * i + l, u = e.map[a];
      if (o > 0) {
        const c = a - i;
        if (u === e.map[c]) {
          s.push(null);
          continue;
        }
      }
      if (l > 0) {
        const c = a - 1;
        if (u === e.map[c]) {
          s.push(null);
          continue;
        }
      }
      s.push(t.nodeAt(u));
    }
    n.push(s);
  }
  return n;
}
function qm(t, e) {
  const n = [], r = fe.get(t), i = r.height, o = r.width;
  for (let s = 0; s < i; s++) {
    const l = t.child(s), a = [];
    for (let c = 0; c < o; c++) {
      const f = e[s][c];
      if (!f) continue;
      const h = r.map[s * r.width + c], d = t.nodeAt(h);
      if (!d) continue;
      const p = d.type.createChecked(f.attrs, f.content, f.marks);
      a.push(p);
    }
    const u = l.type.createChecked(l.attrs, a, l.marks);
    n.push(u);
  }
  return t.type.createChecked(t.attrs, n, t.marks);
}
function Wm(t, e, n, r) {
  const i = e[0] > n[0] ? -1 : 1, o = t.splice(e[0], e.length), s = o.length % 2 === 0 ? 1 : 0;
  let l;
  return l = i === -1 ? n[0] : n[n.length - 1] - s, t.splice(l, 0, ...o), t;
}
function zo(t) {
  return LS((e) => e.type.spec.tableRole === "table", t);
}
function LS(t, e) {
  for (let n = e.depth; n >= 0; n -= 1) {
    const r = e.node(n);
    if (t(r)) return {
      node: r,
      pos: n === 0 ? 0 : e.before(n),
      start: e.start(n),
      depth: n
    };
  }
  return null;
}
function Or(t, e) {
  const n = zo(e.$from);
  if (!n) return;
  const r = fe.get(n.node);
  if (!(t < 0 || t > r.width - 1))
    return r.cellsInRect({
      left: t,
      right: t + 1,
      top: 0,
      bottom: r.height
    }).map((i) => {
      const o = n.node.nodeAt(i), s = i + n.start;
      return {
        pos: s,
        start: s + 1,
        node: o,
        depth: n.depth + 2
      };
    });
}
function Dr(t, e) {
  const n = zo(e.$from);
  if (!n) return;
  const r = fe.get(n.node);
  if (!(t < 0 || t > r.height - 1))
    return r.cellsInRect({
      left: 0,
      right: r.width,
      top: t,
      bottom: t + 1
    }).map((i) => {
      const o = n.node.nodeAt(i), s = i + n.start;
      return {
        pos: s,
        start: s + 1,
        node: o,
        depth: n.depth + 2
      };
    });
}
function xh(t, e, n = e) {
  let r = e, i = n;
  for (let c = e; c >= 0; c--) {
    const f = Or(c, t.selection);
    f && f.forEach((h) => {
      const d = h.node.attrs.colspan + c - 1;
      d >= r && (r = c), d > i && (i = d);
    });
  }
  for (let c = e; c <= i; c++) {
    const f = Or(c, t.selection);
    f && f.forEach((h) => {
      const d = h.node.attrs.colspan + c - 1;
      h.node.attrs.colspan > 1 && d > i && (i = d);
    });
  }
  const o = [];
  for (let c = r; c <= i; c++) {
    const f = Or(c, t.selection);
    f && f.length > 0 && o.push(c);
  }
  r = o[0], i = o[o.length - 1];
  const s = Or(r, t.selection), l = Dr(0, t.selection);
  if (!s || !l) return;
  const a = t.doc.resolve(s[s.length - 1].pos);
  let u;
  for (let c = i; c >= r; c--) {
    const f = Or(c, t.selection);
    if (f && f.length > 0) {
      for (let h = l.length - 1; h >= 0; h--) if (l[h].pos === f[0].pos) {
        u = f[0];
        break;
      }
      if (u) break;
    }
  }
  if (u)
    return {
      $anchor: a,
      $head: t.doc.resolve(u.pos),
      indexes: o
    };
}
function Ch(t, e, n = e) {
  let r = e, i = n;
  for (let c = e; c >= 0; c--) {
    const f = Dr(c, t.selection);
    f && f.forEach((h) => {
      const d = h.node.attrs.rowspan + c - 1;
      d >= r && (r = c), d > i && (i = d);
    });
  }
  for (let c = e; c <= i; c++) {
    const f = Dr(c, t.selection);
    f && f.forEach((h) => {
      const d = h.node.attrs.rowspan + c - 1;
      h.node.attrs.rowspan > 1 && d > i && (i = d);
    });
  }
  const o = [];
  for (let c = r; c <= i; c++) {
    const f = Dr(c, t.selection);
    f && f.length > 0 && o.push(c);
  }
  r = o[0], i = o[o.length - 1];
  const s = Dr(r, t.selection), l = Or(0, t.selection);
  if (!s || !l) return;
  const a = t.doc.resolve(s[s.length - 1].pos);
  let u;
  for (let c = i; c >= r; c--) {
    const f = Dr(c, t.selection);
    if (f && f.length > 0) {
      for (let h = l.length - 1; h >= 0; h--) if (l[h].pos === f[0].pos) {
        u = f[0];
        break;
      }
      if (u) break;
    }
  }
  if (u)
    return {
      $anchor: a,
      $head: t.doc.resolve(u.pos),
      indexes: o
    };
}
function Sh(t) {
  return t[0].map((e, n) => t.map((r) => r[n]));
}
function zS(t) {
  var e, n;
  const { tr: r, originIndex: i, targetIndex: o, select: s, pos: l } = t, a = zo(r.doc.resolve(l));
  if (!a) return !1;
  const u = (e = xh(r, i)) === null || e === void 0 ? void 0 : e.indexes, c = (n = xh(r, o)) === null || n === void 0 ? void 0 : n.indexes;
  if (!u || !c || u.includes(o)) return !1;
  const f = PS(a.node, u, c);
  if (r.replaceWith(a.pos, a.pos + a.node.nodeSize, f), !s) return !0;
  const h = fe.get(f), d = a.start, p = o, m = h.positionAt(h.height - 1, p, f), k = r.doc.resolve(d + m), y = h.positionAt(0, p, f), O = r.doc.resolve(d + y);
  return r.setSelection(me.colSelection(k, O)), !0;
}
function PS(t, e, n, r) {
  let i = Sh(jm(t));
  return i = Wm(i, e, n), i = Sh(i), qm(t, i);
}
function BS(t) {
  var e, n;
  const { tr: r, originIndex: i, targetIndex: o, select: s, pos: l } = t, a = zo(r.doc.resolve(l));
  if (!a) return !1;
  const u = (e = Ch(r, i)) === null || e === void 0 ? void 0 : e.indexes, c = (n = Ch(r, o)) === null || n === void 0 ? void 0 : n.indexes;
  if (!u || !c || u.includes(o)) return !1;
  const f = FS(a.node, u, c);
  if (r.replaceWith(a.pos, a.pos + a.node.nodeSize, f), !s) return !0;
  const h = fe.get(f), d = a.start, p = o, m = h.positionAt(p, h.width - 1, f), k = r.doc.resolve(d + m), y = h.positionAt(p, 0, f), O = r.doc.resolve(d + y);
  return r.setSelection(me.rowSelection(k, O)), !0;
}
function FS(t, e, n, r) {
  let i = jm(t);
  return i = Wm(i, e, n), qm(t, i);
}
function Ut(t) {
  const e = t.selection, n = Xs(t), r = n.node(-1), i = n.start(-1), o = fe.get(r);
  return {
    ...e instanceof me ? o.rectBetween(e.$anchorCell.pos - i, e.$headCell.pos - i) : o.findCell(n.pos - i),
    tableStart: i,
    map: o,
    table: r
  };
}
function Km(t, { map: e, tableStart: n, table: r }, i) {
  let o = i > 0 ? -1 : 0;
  NS(e, r, i + o) && (o = i == 0 || i == e.width ? null : 0);
  for (let s = 0; s < e.height; s++) {
    const l = s * e.width + i;
    if (i > 0 && i < e.width && e.map[l - 1] == e.map[l]) {
      const a = e.map[l], u = r.nodeAt(a);
      t.setNodeMarkup(t.mapping.map(n + a), null, MS(u.attrs, i - e.colCount(a))), s += u.attrs.rowspan - 1;
    } else {
      const a = o == null ? Je(r.type.schema).cell : r.nodeAt(e.map[l + o]).type, u = e.positionAt(s, i, r);
      t.insert(t.mapping.map(n + u), a.createAndFill());
    }
  }
  return t;
}
function Um(t, e) {
  if (!ve(t)) return !1;
  if (e) {
    const n = Ut(t);
    e(Km(t.tr, n, n.left));
  }
  return !0;
}
function Jm(t, e) {
  if (!ve(t)) return !1;
  if (e) {
    const n = Ut(t);
    e(Km(t.tr, n, n.right));
  }
  return !0;
}
function $S(t, { map: e, table: n, tableStart: r }, i) {
  const o = t.mapping.maps.length;
  for (let s = 0; s < e.height; ) {
    const l = s * e.width + i, a = e.map[l], u = n.nodeAt(a), c = u.attrs;
    if (i > 0 && e.map[l - 1] == a || i < e.width - 1 && e.map[l + 1] == a) t.setNodeMarkup(t.mapping.slice(o).map(r + a), null, xr(c, i - e.colCount(a)));
    else {
      const f = t.mapping.slice(o).map(r + a);
      t.delete(f, f + u.nodeSize);
    }
    s += c.rowspan;
  }
}
function Gm(t, e) {
  if (!ve(t)) return !1;
  if (e) {
    const n = Ut(t), r = t.tr;
    if (n.left == 0 && n.right == n.map.width) return !1;
    for (let i = n.right - 1; $S(r, n, i), i != n.left; i--) {
      const o = n.tableStart ? r.doc.nodeAt(n.tableStart - 1) : r.doc;
      if (!o) throw new RangeError("No table found");
      n.table = o, n.map = fe.get(o);
    }
    e(r);
  }
  return !0;
}
function _S(t, e, n) {
  var r;
  const i = Je(e.type.schema).header_cell;
  for (let o = 0; o < t.width; o++) if (((r = e.nodeAt(t.map[o + n * t.width])) === null || r === void 0 ? void 0 : r.type) != i) return !1;
  return !0;
}
function Ym(t, { map: e, tableStart: n, table: r }, i) {
  let o = n;
  for (let u = 0; u < i; u++) o += r.child(u).nodeSize;
  const s = [];
  let l = i > 0 ? -1 : 0;
  _S(e, r, i + l) && (l = i == 0 || i == e.height ? null : 0);
  for (let u = 0, c = e.width * i; u < e.width; u++, c++) if (i > 0 && i < e.height && e.map[c] == e.map[c - e.width]) {
    const f = e.map[c], h = r.nodeAt(f).attrs;
    t.setNodeMarkup(n + f, null, {
      ...h,
      rowspan: h.rowspan + 1
    }), u += h.colspan - 1;
  } else {
    var a;
    const f = l == null ? Je(r.type.schema).cell : (a = r.nodeAt(e.map[c + l * e.width])) === null || a === void 0 ? void 0 : a.type, h = f == null ? void 0 : f.createAndFill();
    h && s.push(h);
  }
  return t.insert(o, Je(r.type.schema).row.create(null, s)), t;
}
function VS(t, e) {
  if (!ve(t)) return !1;
  if (e) {
    const n = Ut(t);
    e(Ym(t.tr, n, n.top));
  }
  return !0;
}
function HS(t, e) {
  if (!ve(t)) return !1;
  if (e) {
    const n = Ut(t);
    e(Ym(t.tr, n, n.bottom));
  }
  return !0;
}
function jS(t, { map: e, table: n, tableStart: r }, i) {
  let o = 0;
  for (let u = 0; u < i; u++) o += n.child(u).nodeSize;
  const s = o + n.child(i).nodeSize, l = t.mapping.maps.length;
  t.delete(o + r, s + r);
  const a = /* @__PURE__ */ new Set();
  for (let u = 0, c = i * e.width; u < e.width; u++, c++) {
    const f = e.map[c];
    if (!a.has(f)) {
      if (a.add(f), i > 0 && f == e.map[c - e.width]) {
        const h = n.nodeAt(f).attrs;
        t.setNodeMarkup(t.mapping.slice(l).map(f + r), null, {
          ...h,
          rowspan: h.rowspan - 1
        }), u += h.colspan - 1;
      } else if (i < e.height && f == e.map[c + e.width]) {
        const h = n.nodeAt(f), d = h.attrs, p = h.type.create({
          ...d,
          rowspan: h.attrs.rowspan - 1
        }, h.content), m = e.positionAt(i + 1, u, n);
        t.insert(t.mapping.slice(l).map(r + m), p), u += d.colspan - 1;
      }
    }
  }
}
function Qm(t, e) {
  if (!ve(t)) return !1;
  if (e) {
    const n = Ut(t), r = t.tr;
    if (n.top == 0 && n.bottom == n.map.height) return !1;
    for (let i = n.bottom - 1; jS(r, n, i), i != n.top; i--) {
      const o = n.tableStart ? r.doc.nodeAt(n.tableStart - 1) : r.doc;
      if (!o) throw new RangeError("No table found");
      n.table = o, n.map = fe.get(n.table);
    }
    e(r);
  }
  return !0;
}
function qS(t, e) {
  return function(n, r) {
    if (!ve(n)) return !1;
    const i = Xs(n);
    if (i.nodeAfter.attrs[t] === e) return !1;
    if (r) {
      const o = n.tr;
      n.selection instanceof me ? n.selection.forEachCell((s, l) => {
        s.attrs[t] !== e && o.setNodeMarkup(l, null, {
          ...s.attrs,
          [t]: e
        });
      }) : o.setNodeMarkup(i.pos, null, {
        ...i.nodeAfter.attrs,
        [t]: e
      }), r(o);
    }
    return !0;
  };
}
function WS(t) {
  return function(e, n) {
    if (!ve(e)) return !1;
    if (n) {
      const r = Je(e.schema), i = Ut(e), o = e.tr, s = i.map.cellsInRect(t == "column" ? {
        left: i.left,
        top: 0,
        right: i.right,
        bottom: i.map.height
      } : t == "row" ? {
        left: 0,
        top: i.top,
        right: i.map.width,
        bottom: i.bottom
      } : i), l = s.map((a) => i.table.nodeAt(a));
      for (let a = 0; a < s.length; a++) l[a].type == r.header_cell && o.setNodeMarkup(i.tableStart + s[a], r.cell, l[a].attrs);
      if (o.steps.length === 0) for (let a = 0; a < s.length; a++) o.setNodeMarkup(i.tableStart + s[a], r.header_cell, l[a].attrs);
      n(o);
    }
    return !0;
  };
}
function Mh(t, e, n) {
  const r = e.map.cellsInRect({
    left: 0,
    top: 0,
    right: t == "row" ? e.map.width : 1,
    bottom: t == "column" ? e.map.height : 1
  });
  for (let i = 0; i < r.length; i++) {
    const o = e.table.nodeAt(r[i]);
    if (o && o.type !== n.header_cell) return !1;
  }
  return !0;
}
function hc(t, e) {
  return e = e || { useDeprecatedLogic: !1 }, e.useDeprecatedLogic ? WS(t) : function(n, r) {
    if (!ve(n)) return !1;
    if (r) {
      const i = Je(n.schema), o = Ut(n), s = n.tr, l = Mh("row", o, i), a = Mh("column", o, i), u = (t === "column" ? l : t === "row" && a) ? 1 : 0, c = t == "column" ? {
        left: 0,
        top: u,
        right: 1,
        bottom: o.map.height
      } : t == "row" ? {
        left: u,
        top: 0,
        right: o.map.width,
        bottom: 1
      } : o, f = t == "column" ? a ? i.cell : i.header_cell : t == "row" ? l ? i.cell : i.header_cell : i.cell;
      o.map.cellsInRect(c).forEach((h) => {
        const d = h + o.tableStart, p = s.doc.nodeAt(d);
        p && s.setNodeMarkup(d, f, p.attrs);
      }), r(s);
    }
    return !0;
  };
}
hc("row", { useDeprecatedLogic: !0 });
hc("column", { useDeprecatedLogic: !0 });
hc("cell", { useDeprecatedLogic: !0 });
function KS(t, e) {
  if (e < 0) {
    const n = t.nodeBefore;
    if (n) return t.pos - n.nodeSize;
    for (let r = t.index(-1) - 1, i = t.before(); r >= 0; r--) {
      const o = t.node(-1).child(r), s = o.lastChild;
      if (s) return i - 1 - s.nodeSize;
      i -= o.nodeSize;
    }
  } else {
    if (t.index() < t.parent.childCount - 1) return t.pos + t.nodeAfter.nodeSize;
    const n = t.node(-1);
    for (let r = t.indexAfter(-1), i = t.after(); r < n.childCount; r++) {
      const o = n.child(r);
      if (o.childCount) return i + 1;
      i += o.nodeSize;
    }
  }
  return null;
}
function Xm(t) {
  return function(e, n) {
    if (!ve(e)) return !1;
    const r = KS(Xs(e), t);
    if (r == null) return !1;
    if (n) {
      const i = e.doc.resolve(r);
      n(e.tr.setSelection(Z.between(i, SS(i))).scrollIntoView());
    }
    return !0;
  };
}
function US(t, e) {
  const n = t.selection.$anchor;
  for (let r = n.depth; r > 0; r--) if (n.node(r).type.spec.tableRole == "table")
    return e && e(t.tr.delete(n.before(r), n.after(r)).scrollIntoView()), !0;
  return !1;
}
function Qo(t, e) {
  const n = t.selection;
  if (!(n instanceof me)) return !1;
  if (e) {
    const r = t.tr, i = Je(t.schema).cell.createAndFill().content;
    n.forEachCell((o, s) => {
      o.content.eq(i) || r.replace(r.mapping.map(s + 1), r.mapping.map(s + o.nodeSize - 1), new F(i, 0, 0));
    }), r.docChanged && e(r);
  }
  return !0;
}
function JS(t) {
  return (e, n) => {
    const { from: r, to: i, select: o = !0, pos: s = e.selection.from } = t, l = e.tr;
    return BS({
      tr: l,
      originIndex: r,
      targetIndex: i,
      select: o,
      pos: s
    }) ? (n == null || n(l), !0) : !1;
  };
}
function GS(t) {
  return (e, n) => {
    const { from: r, to: i, select: o = !0, pos: s = e.selection.from } = t, l = e.tr;
    return zS({
      tr: l,
      originIndex: r,
      targetIndex: i,
      select: o,
      pos: s
    }) ? (n == null || n(l), !0) : !1;
  };
}
function YS(t) {
  if (t.size === 0) return null;
  let { content: e, openStart: n, openEnd: r } = t;
  for (; e.childCount == 1 && (n > 0 && r > 0 || e.child(0).type.spec.tableRole == "table"); )
    n--, r--, e = e.child(0).content;
  const i = e.child(0), o = i.type.spec.tableRole, s = i.type.schema, l = [];
  if (o == "row") for (let a = 0; a < e.childCount; a++) {
    let u = e.child(a).content;
    const c = a ? 0 : Math.max(0, n - 1), f = a < e.childCount - 1 ? 0 : Math.max(0, r - 1);
    (c || f) && (u = $a(Je(s).row, new F(u, c, f)).content), l.push(u);
  }
  else if (o == "cell" || o == "header_cell") l.push(n || r ? $a(Je(s).row, new F(e, n, r)).content : e);
  else return null;
  return QS(s, l);
}
function QS(t, e) {
  const n = [];
  for (let i = 0; i < e.length; i++) {
    const o = e[i];
    for (let s = o.childCount - 1; s >= 0; s--) {
      const { rowspan: l, colspan: a } = o.child(s).attrs;
      for (let u = i; u < i + l; u++) n[u] = (n[u] || 0) + a;
    }
  }
  let r = 0;
  for (let i = 0; i < n.length; i++) r = Math.max(r, n[i]);
  for (let i = 0; i < n.length; i++)
    if (i >= e.length && e.push(A.empty), n[i] < r) {
      const o = Je(t).cell.createAndFill(), s = [];
      for (let l = n[i]; l < r; l++) s.push(o);
      e[i] = e[i].append(A.from(s));
    }
  return {
    height: e.length,
    width: r,
    rows: e
  };
}
function $a(t, e) {
  const n = t.createAndFill();
  return new ip(n).replace(0, n.content.size, e).doc;
}
function XS({ width: t, height: e, rows: n }, r, i) {
  if (t != r) {
    const o = [], s = [];
    for (let l = 0; l < n.length; l++) {
      const a = n[l], u = [];
      for (let c = o[l] || 0, f = 0; c < r; f++) {
        let h = a.child(f % a.childCount);
        c + h.attrs.colspan > r && (h = h.type.createChecked(xr(h.attrs, h.attrs.colspan, c + h.attrs.colspan - r), h.content)), u.push(h), c += h.attrs.colspan;
        for (let d = 1; d < h.attrs.rowspan; d++) o[l + d] = (o[l + d] || 0) + h.attrs.colspan;
      }
      s.push(A.from(u));
    }
    n = s, t = r;
  }
  if (e != i) {
    const o = [];
    for (let s = 0, l = 0; s < i; s++, l++) {
      const a = [], u = n[l % e];
      for (let c = 0; c < u.childCount; c++) {
        let f = u.child(c);
        s + f.attrs.rowspan > i && (f = f.type.create({
          ...f.attrs,
          rowspan: Math.max(1, i - f.attrs.rowspan)
        }, f.content)), a.push(f);
      }
      o.push(A.from(a));
    }
    n = o, e = i;
  }
  return {
    width: t,
    height: e,
    rows: n
  };
}
function ZS(t, e, n, r, i, o, s) {
  const l = t.doc.type.schema, a = Je(l);
  let u, c;
  if (i > e.width) for (let f = 0, h = 0; f < e.height; f++) {
    const d = n.child(f);
    h += d.nodeSize;
    const p = [];
    let m;
    d.lastChild == null || d.lastChild.type == a.cell ? m = u || (u = a.cell.createAndFill()) : m = c || (c = a.header_cell.createAndFill());
    for (let k = e.width; k < i; k++) p.push(m);
    t.insert(t.mapping.slice(s).map(h - 1 + r), p);
  }
  if (o > e.height) {
    const f = [];
    for (let p = 0, m = (e.height - 1) * e.width; p < Math.max(e.width, i); p++) {
      const k = p >= e.width ? !1 : n.nodeAt(e.map[m + p]).type == a.header_cell;
      f.push(k ? c || (c = a.header_cell.createAndFill()) : u || (u = a.cell.createAndFill()));
    }
    const h = a.row.create(null, A.from(f)), d = [];
    for (let p = e.height; p < o; p++) d.push(h);
    t.insert(t.mapping.slice(s).map(r + n.nodeSize - 2), d);
  }
  return !!(u || c);
}
function Nh(t, e, n, r, i, o, s, l) {
  if (s == 0 || s == e.height) return !1;
  let a = !1;
  for (let u = i; u < o; u++) {
    const c = s * e.width + u, f = e.map[c];
    if (e.map[c - e.width] == f) {
      a = !0;
      const h = n.nodeAt(f), { top: d, left: p } = e.findCell(f);
      t.setNodeMarkup(t.mapping.slice(l).map(f + r), null, {
        ...h.attrs,
        rowspan: s - d
      }), t.insert(t.mapping.slice(l).map(e.positionAt(s, p, n)), h.type.createAndFill({
        ...h.attrs,
        rowspan: d + h.attrs.rowspan - s
      })), u += h.attrs.colspan - 1;
    }
  }
  return a;
}
function Th(t, e, n, r, i, o, s, l) {
  if (s == 0 || s == e.width) return !1;
  let a = !1;
  for (let u = i; u < o; u++) {
    const c = u * e.width + s, f = e.map[c];
    if (e.map[c - 1] == f) {
      a = !0;
      const h = n.nodeAt(f), d = e.colCount(f), p = t.mapping.slice(l).map(f + r);
      t.setNodeMarkup(p, null, xr(h.attrs, s - d, h.attrs.colspan - (s - d))), t.insert(p + h.nodeSize, h.type.createAndFill(xr(h.attrs, 0, s - d))), u += h.attrs.rowspan - 1;
    }
  }
  return a;
}
function vh(t, e, n, r, i) {
  let o = n ? t.doc.nodeAt(n - 1) : t.doc;
  if (!o) throw new Error("No table found");
  let s = fe.get(o);
  const { top: l, left: a } = r, u = a + i.width, c = l + i.height, f = t.tr;
  let h = 0;
  function d() {
    if (o = n ? f.doc.nodeAt(n - 1) : f.doc, !o) throw new Error("No table found");
    s = fe.get(o), h = f.mapping.maps.length;
  }
  ZS(f, s, o, n, u, c, h) && d(), Nh(f, s, o, n, a, u, l, h) && d(), Nh(f, s, o, n, a, u, c, h) && d(), Th(f, s, o, n, l, c, a, h) && d(), Th(f, s, o, n, l, c, u, h) && d();
  for (let p = l; p < c; p++) {
    const m = s.positionAt(p, a, o), k = s.positionAt(p, u, o);
    f.replace(f.mapping.slice(h).map(m + n), f.mapping.slice(h).map(k + n), new F(i.rows[p - l], 0, 0));
  }
  d(), f.setSelection(new me(f.doc.resolve(n + s.positionAt(l, a, o)), f.doc.resolve(n + s.positionAt(c - 1, u - 1, o)))), e(f);
}
const eM = bp({
  ArrowLeft: Xo("horiz", -1),
  ArrowRight: Xo("horiz", 1),
  ArrowUp: Xo("vert", -1),
  ArrowDown: Xo("vert", 1),
  "Shift-ArrowLeft": Zo("horiz", -1),
  "Shift-ArrowRight": Zo("horiz", 1),
  "Shift-ArrowUp": Zo("vert", -1),
  "Shift-ArrowDown": Zo("vert", 1),
  Backspace: Qo,
  "Mod-Backspace": Qo,
  Delete: Qo,
  "Mod-Delete": Qo
});
function ms(t, e, n) {
  return n.eq(t.selection) ? !1 : (e && e(t.tr.setSelection(n).scrollIntoView()), !0);
}
function Xo(t, e) {
  return (n, r, i) => {
    if (!i) return !1;
    const o = n.selection;
    if (o instanceof me) return ms(n, r, ee.near(o.$headCell, e));
    if (t != "horiz" && !o.empty) return !1;
    const s = Zm(i, t, e);
    if (s == null) return !1;
    if (t == "horiz") return ms(n, r, ee.near(n.doc.resolve(o.head + e), e));
    {
      const l = n.doc.resolve(s), a = _m(l, t, e);
      let u;
      return a ? u = ee.near(a, 1) : e < 0 ? u = ee.near(n.doc.resolve(l.before(-1)), -1) : u = ee.near(n.doc.resolve(l.after(-1)), 1), ms(n, r, u);
    }
  };
}
function Zo(t, e) {
  return (n, r, i) => {
    if (!i) return !1;
    const o = n.selection;
    let s;
    if (o instanceof me) s = o;
    else {
      const a = Zm(i, t, e);
      if (a == null) return !1;
      s = new me(n.doc.resolve(a));
    }
    const l = _m(s.$headCell, t, e);
    return l ? ms(n, r, new me(s.$anchorCell, l)) : !1;
  };
}
function tM(t, e) {
  const n = t.state.doc, r = fi(n.resolve(e));
  return r ? (t.dispatch(t.state.tr.setSelection(new me(r))), !0) : !1;
}
function nM(t, e, n) {
  if (!ve(t.state)) return !1;
  let r = YS(n);
  const i = t.state.selection;
  if (i instanceof me) {
    r || (r = {
      width: 1,
      height: 1,
      rows: [A.from($a(Je(t.state.schema).cell, n))]
    });
    const o = i.$anchorCell.node(-1), s = i.$anchorCell.start(-1), l = fe.get(o).rectBetween(i.$anchorCell.pos - s, i.$headCell.pos - s);
    return r = XS(r, l.right - l.left, l.bottom - l.top), vh(t.state, t.dispatch, s, l, r), !0;
  } else if (r) {
    const o = Xs(t.state), s = o.start(-1);
    return vh(t.state, t.dispatch, s, fe.get(o.node(-1)).findCell(o.pos - s), r), !0;
  } else return !1;
}
function rM(t, e) {
  var n;
  if (e.button != 0 || e.ctrlKey || e.metaKey) return;
  const r = Ih(t, e.target);
  let i;
  if (e.shiftKey && t.state.selection instanceof me)
    o(t.state.selection.$anchorCell, e), e.preventDefault();
  else if (e.shiftKey && r && (i = fi(t.state.selection.$anchor)) != null && ((n = ql(t, e)) === null || n === void 0 ? void 0 : n.pos) != i.pos)
    o(i, e), e.preventDefault();
  else if (!r) return;
  function o(a, u) {
    let c = ql(t, u);
    const f = En.getState(t.state) == null;
    if (!c || !fc(a, c)) if (f) c = a;
    else return;
    const h = new me(a, c);
    if (f || !t.state.selection.eq(h)) {
      const d = t.state.tr.setSelection(h);
      f && d.setMeta(En, a.pos), t.dispatch(d);
    }
  }
  function s() {
    t.root.removeEventListener("mouseup", s), t.root.removeEventListener("dragstart", s), t.root.removeEventListener("mousemove", l), En.getState(t.state) != null && t.dispatch(t.state.tr.setMeta(En, -1));
  }
  function l(a) {
    const u = a, c = En.getState(t.state);
    let f;
    if (c != null) f = t.state.doc.resolve(c);
    else if (Ih(t, u.target) != r && (f = ql(t, e), !f))
      return s();
    f && o(f, u);
  }
  t.root.addEventListener("mouseup", s), t.root.addEventListener("dragstart", s), t.root.addEventListener("mousemove", l);
}
function Zm(t, e, n) {
  if (!(t.state.selection instanceof Z)) return null;
  const { $head: r } = t.state.selection;
  for (let i = r.depth - 1; i >= 0; i--) {
    const o = r.node(i);
    if ((n < 0 ? r.index(i) : r.indexAfter(i)) != (n < 0 ? 0 : o.childCount)) return null;
    if (o.type.spec.tableRole == "cell" || o.type.spec.tableRole == "header_cell") {
      const s = r.before(i), l = e == "vert" ? n > 0 ? "down" : "up" : n > 0 ? "right" : "left";
      return t.endOfTextblock(l) ? s : null;
    }
  }
  return null;
}
function Ih(t, e) {
  for (; e && e != t.dom; e = e.parentNode) if (e.nodeName == "TD" || e.nodeName == "TH") return e;
  return null;
}
function ql(t, e) {
  const n = t.posAtCoords({
    left: e.clientX,
    top: e.clientY
  });
  if (!n) return null;
  let { inside: r, pos: i } = n;
  return r >= 0 && fi(t.state.doc.resolve(r)) || fi(t.state.doc.resolve(i));
}
var iM = class {
  constructor(t, e) {
    this.node = t, this.defaultCellMinWidth = e, this.dom = document.createElement("div"), this.dom.className = "tableWrapper", this.table = this.dom.appendChild(document.createElement("table")), this.table.style.setProperty("--default-cell-min-width", `${e}px`), this.colgroup = this.table.appendChild(document.createElement("colgroup")), _a(t, this.colgroup, this.table, e), this.contentDOM = this.table.appendChild(document.createElement("tbody"));
  }
  update(t) {
    return t.type != this.node.type ? !1 : (this.node = t, _a(t, this.colgroup, this.table, this.defaultCellMinWidth), !0);
  }
  ignoreMutation(t) {
    return t.type == "attributes" && (t.target == this.table || this.colgroup.contains(t.target));
  }
};
function _a(t, e, n, r, i, o) {
  let s = 0, l = !0, a = e.firstChild;
  const u = t.firstChild;
  if (u) {
    for (let f = 0, h = 0; f < u.childCount; f++) {
      const { colspan: d, colwidth: p } = u.child(f).attrs;
      for (let m = 0; m < d; m++, h++) {
        const k = i == h ? o : p && p[m], y = k ? k + "px" : "";
        if (s += k || r, k || (l = !1), a)
          a.style.width != y && (a.style.width = y), a = a.nextSibling;
        else {
          const O = document.createElement("col");
          O.style.width = y, e.appendChild(O);
        }
      }
    }
    for (; a; ) {
      var c;
      const f = a.nextSibling;
      (c = a.parentNode) === null || c === void 0 || c.removeChild(a), a = f;
    }
    l ? (n.style.width = s + "px", n.style.minWidth = "") : (n.style.width = "", n.style.minWidth = s + "px");
  }
}
const ht = new Ve("tableColumnResizing");
function oM({ handleWidth: t = 5, cellMinWidth: e = 25, defaultCellMinWidth: n = 100, View: r = iM, lastColumnResizable: i = !0 } = {}) {
  const o = new Ee({
    key: ht,
    state: {
      init(s, l) {
        var a;
        const u = (a = o.spec) === null || a === void 0 || (a = a.props) === null || a === void 0 ? void 0 : a.nodeViews, c = Je(l.schema).table.name;
        return r && u && (u[c] = (f, h) => new r(f, n, h)), new sM(-1, !1);
      },
      apply(s, l) {
        return l.apply(s);
      }
    },
    props: {
      attributes: (s) => {
        const l = ht.getState(s);
        return l && l.activeHandle > -1 ? { class: "resize-cursor" } : {};
      },
      handleDOMEvents: {
        mousemove: (s, l) => {
          lM(s, l, t, i);
        },
        mouseleave: (s) => {
          aM(s);
        },
        mousedown: (s, l) => {
          uM(s, l, e, n);
        }
      },
      decorations: (s) => {
        const l = ht.getState(s);
        if (l && l.activeHandle > -1) return pM(s, l.activeHandle);
      },
      nodeViews: {}
    }
  });
  return o;
}
var sM = class gs {
  constructor(e, n) {
    this.activeHandle = e, this.dragging = n;
  }
  apply(e) {
    const n = this, r = e.getMeta(ht);
    if (r && r.setHandle != null) return new gs(r.setHandle, !1);
    if (r && r.setDragging !== void 0) return new gs(n.activeHandle, r.setDragging);
    if (n.activeHandle > -1 && e.docChanged) {
      let i = e.mapping.map(n.activeHandle, -1);
      return Fa(e.doc.resolve(i)) || (i = -1), new gs(i, n.dragging);
    }
    return n;
  }
};
function lM(t, e, n, r) {
  if (!t.editable) return;
  const i = ht.getState(t.state);
  if (i && !i.dragging) {
    const o = fM(e.target);
    let s = -1;
    if (o) {
      const { left: l, right: a } = o.getBoundingClientRect();
      e.clientX - l <= n ? s = Eh(t, e, "left", n) : a - e.clientX <= n && (s = Eh(t, e, "right", n));
    }
    if (s != i.activeHandle) {
      if (!r && s !== -1) {
        const l = t.state.doc.resolve(s), a = l.node(-1), u = fe.get(a), c = l.start(-1);
        if (u.colCount(l.pos - c) + l.nodeAfter.attrs.colspan - 1 == u.width - 1) return;
      }
      eg(t, s);
    }
  }
}
function aM(t) {
  if (!t.editable) return;
  const e = ht.getState(t.state);
  e && e.activeHandle > -1 && !e.dragging && eg(t, -1);
}
function uM(t, e, n, r) {
  var i;
  if (!t.editable) return !1;
  const o = (i = t.dom.ownerDocument.defaultView) !== null && i !== void 0 ? i : window, s = ht.getState(t.state);
  if (!s || s.activeHandle == -1 || s.dragging) return !1;
  const l = t.state.doc.nodeAt(s.activeHandle), a = cM(t, s.activeHandle, l.attrs);
  t.dispatch(t.state.tr.setMeta(ht, { setDragging: {
    startX: e.clientX,
    startWidth: a
  } }));
  function u(f) {
    o.removeEventListener("mouseup", u), o.removeEventListener("mousemove", c);
    const h = ht.getState(t.state);
    h != null && h.dragging && (hM(t, h.activeHandle, Ah(h.dragging, f, n)), t.dispatch(t.state.tr.setMeta(ht, { setDragging: null })));
  }
  function c(f) {
    if (!f.which) return u(f);
    const h = ht.getState(t.state);
    if (h && h.dragging) {
      const d = Ah(h.dragging, f, n);
      Oh(t, h.activeHandle, d, r);
    }
  }
  return Oh(t, s.activeHandle, a, r), o.addEventListener("mouseup", u), o.addEventListener("mousemove", c), e.preventDefault(), !0;
}
function cM(t, e, { colspan: n, colwidth: r }) {
  const i = r && r[r.length - 1];
  if (i) return i;
  const o = t.domAtPos(e);
  let s = o.node.childNodes[o.offset].offsetWidth, l = n;
  if (r)
    for (let a = 0; a < n; a++) r[a] && (s -= r[a], l--);
  return s / l;
}
function fM(t) {
  for (; t && t.nodeName != "TD" && t.nodeName != "TH"; ) t = t.classList && t.classList.contains("ProseMirror") ? null : t.parentNode;
  return t;
}
function Eh(t, e, n, r) {
  const i = n == "right" ? -r : r, o = t.posAtCoords({
    left: e.clientX + i,
    top: e.clientY
  });
  if (!o) return -1;
  const { pos: s } = o, l = fi(t.state.doc.resolve(s));
  if (!l) return -1;
  if (n == "right") return l.pos;
  const a = fe.get(l.node(-1)), u = l.start(-1), c = a.map.indexOf(l.pos - u);
  return c % a.width == 0 ? -1 : u + a.map[c - 1];
}
function Ah(t, e, n) {
  const r = e.clientX - t.startX;
  return Math.max(n, t.startWidth + r);
}
function eg(t, e) {
  t.dispatch(t.state.tr.setMeta(ht, { setHandle: e }));
}
function hM(t, e, n) {
  const r = t.state.doc.resolve(e), i = r.node(-1), o = fe.get(i), s = r.start(-1), l = o.colCount(r.pos - s) + r.nodeAfter.attrs.colspan - 1, a = t.state.tr;
  for (let u = 0; u < o.height; u++) {
    const c = u * o.width + l;
    if (u && o.map[c] == o.map[c - o.width]) continue;
    const f = o.map[c], h = i.nodeAt(f).attrs, d = h.colspan == 1 ? 0 : l - o.colCount(f);
    if (h.colwidth && h.colwidth[d] == n) continue;
    const p = h.colwidth ? h.colwidth.slice() : dM(h.colspan);
    p[d] = n, a.setNodeMarkup(s + f, null, {
      ...h,
      colwidth: p
    });
  }
  a.docChanged && t.dispatch(a);
}
function Oh(t, e, n, r) {
  const i = t.state.doc.resolve(e), o = i.node(-1), s = i.start(-1), l = fe.get(o).colCount(i.pos - s) + i.nodeAfter.attrs.colspan - 1;
  let a = t.domAtPos(i.start(-1)).node;
  for (; a && a.nodeName != "TABLE"; ) a = a.parentNode;
  a && _a(o, a.firstChild, a, r, l, n);
}
function dM(t) {
  return Array(t).fill(0);
}
function pM(t, e) {
  const n = [], r = t.doc.resolve(e), i = r.node(-1);
  if (!i) return ge.empty;
  const o = fe.get(i), s = r.start(-1), l = o.colCount(r.pos - s) + r.nodeAfter.attrs.colspan - 1;
  for (let u = 0; u < o.height; u++) {
    const c = l + u * o.width;
    if ((l == o.width - 1 || o.map[c] != o.map[c + 1]) && (u == 0 || o.map[c] != o.map[c - o.width])) {
      var a;
      const f = o.map[c], h = s + f + i.nodeAt(f).nodeSize - 1, d = document.createElement("div");
      d.className = "column-resize-handle", !((a = ht.getState(t)) === null || a === void 0) && a.dragging && n.push(ze.node(s + f, s + f + i.nodeAt(f).nodeSize, { class: "column-resize-dragging" })), n.push(ze.widget(h, d));
    }
  }
  return ge.create(t.doc, n);
}
function mM({ allowTableNodeSelection: t = !1 } = {}) {
  return new Ee({
    key: En,
    state: {
      init() {
        return null;
      },
      apply(e, n) {
        const r = e.getMeta(En);
        if (r != null) return r == -1 ? null : r;
        if (n == null || !e.docChanged) return n;
        const { deleted: i, pos: o } = e.mapping.mapResult(n);
        return i ? null : o;
      }
    },
    props: {
      decorations: vS,
      handleDOMEvents: { mousedown: rM },
      createSelectionBetween(e) {
        return En.getState(e.state) != null ? e.state.selection : null;
      },
      handleTripleClick: tM,
      handleKeyDown: eM,
      handlePaste: nM
    },
    appendTransaction(e, n, r) {
      return AS(r, DS(r, n), t);
    }
  });
}
var Ds = typeof navigator < "u" ? navigator : null, dc = Ds && Ds.userAgent || "", gM = /Edge\/(\d+)/.exec(dc), yM = /MSIE \d/.exec(dc), kM = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(dc), bM = !!(yM || kM || gM), wM = !bM && !!Ds && /Apple Computer/.test(Ds.vendor), tg = new Ve("safari-ime-span"), Va = !1, xM = {
  key: tg,
  props: {
    decorations: CM,
    handleDOMEvents: {
      compositionstart: () => {
        Va = !0;
      },
      compositionend: () => {
        Va = !1;
      }
    }
  }
};
function CM(t) {
  const { $from: e, $to: n, to: r } = t.selection;
  if (Va && e.sameParent(n)) {
    const i = ze.widget(r, SM, {
      ignoreSelection: !0,
      key: "safari-ime-span"
    });
    return ge.create(t.doc, [i]);
  }
}
function SM(t) {
  const e = t.dom.ownerDocument.createElement("span");
  return e.className = "ProseMirror-safari-ime-span", e;
}
var MM = new Ee(wM ? xM : { key: tg });
function Dh(t, e) {
  const n = String(t);
  if (typeof e != "string")
    throw new TypeError("Expected character");
  let r = 0, i = n.indexOf(e);
  for (; i !== -1; )
    r++, i = n.indexOf(e, i + e.length);
  return r;
}
function NM(t) {
  if (typeof t != "string")
    throw new TypeError("Expected a string");
  return t.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}
function TM(t, e, n) {
  const i = _s((n || {}).ignore || []), o = vM(e);
  let s = -1;
  for (; ++s < o.length; )
    Ga(t, "text", l);
  function l(u, c) {
    let f = -1, h;
    for (; ++f < c.length; ) {
      const d = c[f], p = h ? h.children : void 0;
      if (i(
        d,
        p ? p.indexOf(d) : void 0,
        h
      ))
        return;
      h = d;
    }
    if (h)
      return a(u, c);
  }
  function a(u, c) {
    const f = c[c.length - 1], h = o[s][0], d = o[s][1];
    let p = 0;
    const k = f.children.indexOf(u);
    let y = !1, O = [];
    h.lastIndex = 0;
    let T = h.exec(u.value);
    for (; T; ) {
      const V = T.index, _ = {
        index: T.index,
        input: T.input,
        stack: [...c, u]
      };
      let S = d(...T, _);
      if (typeof S == "string" && (S = S.length > 0 ? { type: "text", value: S } : void 0), S === !1 ? h.lastIndex = V + 1 : (p !== V && O.push({
        type: "text",
        value: u.value.slice(p, V)
      }), Array.isArray(S) ? O.push(...S) : S && O.push(S), p = V + T[0].length, y = !0), !h.global)
        break;
      T = h.exec(u.value);
    }
    return y ? (p < u.value.length && O.push({ type: "text", value: u.value.slice(p) }), f.children.splice(k, 1, ...O)) : O = [u], k + O.length;
  }
}
function vM(t) {
  const e = [];
  if (!Array.isArray(t))
    throw new TypeError("Expected find and replace tuple or list of tuples");
  const n = !t[0] || Array.isArray(t[0]) ? t : [t];
  let r = -1;
  for (; ++r < n.length; ) {
    const i = n[r];
    e.push([IM(i[0]), EM(i[1])]);
  }
  return e;
}
function IM(t) {
  return typeof t == "string" ? new RegExp(NM(t), "g") : t;
}
function EM(t) {
  return typeof t == "function" ? t : function() {
    return t;
  };
}
const Wl = "phrasing", Kl = ["autolink", "link", "image", "label"];
function AM() {
  return {
    transforms: [BM],
    enter: {
      literalAutolink: DM,
      literalAutolinkEmail: Ul,
      literalAutolinkHttp: Ul,
      literalAutolinkWww: Ul
    },
    exit: {
      literalAutolink: PM,
      literalAutolinkEmail: zM,
      literalAutolinkHttp: RM,
      literalAutolinkWww: LM
    }
  };
}
function OM() {
  return {
    unsafe: [
      {
        character: "@",
        before: "[+\\-.\\w]",
        after: "[\\-.\\w]",
        inConstruct: Wl,
        notInConstruct: Kl
      },
      {
        character: ".",
        before: "[Ww]",
        after: "[\\-.\\w]",
        inConstruct: Wl,
        notInConstruct: Kl
      },
      {
        character: ":",
        before: "[ps]",
        after: "\\/",
        inConstruct: Wl,
        notInConstruct: Kl
      }
    ]
  };
}
function DM(t) {
  this.enter({ type: "link", title: null, url: "", children: [] }, t);
}
function Ul(t) {
  this.config.enter.autolinkProtocol.call(this, t);
}
function RM(t) {
  this.config.exit.autolinkProtocol.call(this, t);
}
function LM(t) {
  this.config.exit.data.call(this, t);
  const e = this.stack[this.stack.length - 1];
  e.type, e.url = "http://" + this.sliceSerialize(t);
}
function zM(t) {
  this.config.exit.autolinkEmail.call(this, t);
}
function PM(t) {
  this.exit(t);
}
function BM(t) {
  TM(
    t,
    [
      [/(https?:\/\/|www(?=\.))([-.\w]+)([^ \t\r\n]*)/gi, FM],
      [new RegExp("(^|\\\\s|[\\\\u0021-\\\\u002F\\\\u003A-\\\\u0040\\\\u005B-\\\\u0060\\\\u007B-\\\\u007E])([-.\\\\w+]+)@([-\\\\w]+(?:\\\\.[-\\\\w]+)+)", "gu"), $M]
    ],
    { ignore: ["link", "linkReference"] }
  );
}
function FM(t, e, n, r, i) {
  let o = "";
  if (!ng(i) || (/^w/i.test(e) && (n = e + n, e = "", o = "http://"), !_M(n)))
    return !1;
  const s = VM(n + r);
  if (!s[0]) return !1;
  const l = {
    type: "link",
    title: null,
    url: o + e + s[0],
    children: [{ type: "text", value: e + s[0] }]
  };
  return s[1] ? [l, { type: "text", value: s[1] }] : l;
}
function $M(t, e, n, r) {
  return (
    // Not an expected previous character.
    !ng(r, !0) || // Label ends in not allowed character.
    /[-\d_]$/.test(n) ? !1 : {
      type: "link",
      title: null,
      url: "mailto:" + e + "@" + n,
      children: [{ type: "text", value: e + "@" + n }]
    }
  );
}
function _M(t) {
  const e = t.split(".");
  return !(e.length < 2 || e[e.length - 1] && (/_/.test(e[e.length - 1]) || !/[a-zA-Z\d]/.test(e[e.length - 1])) || e[e.length - 2] && (/_/.test(e[e.length - 2]) || !/[a-zA-Z\d]/.test(e[e.length - 2])));
}
function VM(t) {
  const e = /[!"&'),.:;<>?\]}]+$/.exec(t);
  if (!e)
    return [t, void 0];
  t = t.slice(0, e.index);
  let n = e[0], r = n.indexOf(")");
  const i = Dh(t, "(");
  let o = Dh(t, ")");
  for (; r !== -1 && i > o; )
    t += n.slice(0, r + 1), n = n.slice(r + 1), r = n.indexOf(")"), o++;
  return [t, n];
}
function ng(t, e) {
  const n = t.input.charCodeAt(t.index - 1);
  return (t.index === 0 || gr(n) || Fs(n)) && // If it’s an email, the previous character should not be a slash.
  (!e || n !== 47);
}
rg.peek = YM;
function HM() {
  this.buffer();
}
function jM(t) {
  this.enter({ type: "footnoteReference", identifier: "", label: "" }, t);
}
function qM() {
  this.buffer();
}
function WM(t) {
  this.enter(
    { type: "footnoteDefinition", identifier: "", label: "", children: [] },
    t
  );
}
function KM(t) {
  const e = this.resume(), n = this.stack[this.stack.length - 1];
  n.type, n.identifier = Dt(
    this.sliceSerialize(t)
  ).toLowerCase(), n.label = e;
}
function UM(t) {
  this.exit(t);
}
function JM(t) {
  const e = this.resume(), n = this.stack[this.stack.length - 1];
  n.type, n.identifier = Dt(
    this.sliceSerialize(t)
  ).toLowerCase(), n.label = e;
}
function GM(t) {
  this.exit(t);
}
function YM() {
  return "[";
}
function rg(t, e, n, r) {
  const i = n.createTracker(r);
  let o = i.move("[^");
  const s = n.enter("footnoteReference"), l = n.enter("reference");
  return o += i.move(
    n.safe(n.associationId(t), { after: "]", before: o })
  ), l(), s(), o += i.move("]"), o;
}
function QM() {
  return {
    enter: {
      gfmFootnoteCallString: HM,
      gfmFootnoteCall: jM,
      gfmFootnoteDefinitionLabelString: qM,
      gfmFootnoteDefinition: WM
    },
    exit: {
      gfmFootnoteCallString: KM,
      gfmFootnoteCall: UM,
      gfmFootnoteDefinitionLabelString: JM,
      gfmFootnoteDefinition: GM
    }
  };
}
function XM(t) {
  let e = !1;
  return t && t.firstLineBlank && (e = !0), {
    handlers: { footnoteDefinition: n, footnoteReference: rg },
    // This is on by default already.
    unsafe: [{ character: "[", inConstruct: ["label", "phrasing", "reference"] }]
  };
  function n(r, i, o, s) {
    const l = o.createTracker(s);
    let a = l.move("[^");
    const u = o.enter("footnoteDefinition"), c = o.enter("label");
    return a += l.move(
      o.safe(o.associationId(r), { before: a, after: "]" })
    ), c(), a += l.move("]:"), r.children && r.children.length > 0 && (l.shift(4), a += l.move(
      (e ? `
` : " ") + o.indentLines(
        o.containerFlow(r, l.current()),
        e ? ig : ZM
      )
    )), u(), a;
  }
}
function ZM(t, e, n) {
  return e === 0 ? t : ig(t, e, n);
}
function ig(t, e, n) {
  return (n ? "" : "    ") + t;
}
const eN = [
  "autolink",
  "destinationLiteral",
  "destinationRaw",
  "reference",
  "titleQuote",
  "titleApostrophe"
];
og.peek = oN;
function tN() {
  return {
    canContainEols: ["delete"],
    enter: { strikethrough: rN },
    exit: { strikethrough: iN }
  };
}
function nN() {
  return {
    unsafe: [
      {
        character: "~",
        inConstruct: "phrasing",
        notInConstruct: eN
      }
    ],
    handlers: { delete: og }
  };
}
function rN(t) {
  this.enter({ type: "delete", children: [] }, t);
}
function iN(t) {
  this.exit(t);
}
function og(t, e, n, r) {
  const i = n.createTracker(r), o = n.enter("strikethrough");
  let s = i.move("~~");
  return s += n.containerPhrasing(t, {
    ...i.current(),
    before: s,
    after: "~"
  }), s += i.move("~~"), o(), s;
}
function oN() {
  return "~";
}
function sN(t) {
  return t.length;
}
function lN(t, e) {
  const n = e || {}, r = (n.align || []).concat(), i = n.stringLength || sN, o = [], s = [], l = [], a = [];
  let u = 0, c = -1;
  for (; ++c < t.length; ) {
    const m = [], k = [];
    let y = -1;
    for (t[c].length > u && (u = t[c].length); ++y < t[c].length; ) {
      const O = aN(t[c][y]);
      if (n.alignDelimiters !== !1) {
        const T = i(O);
        k[y] = T, (a[y] === void 0 || T > a[y]) && (a[y] = T);
      }
      m.push(O);
    }
    s[c] = m, l[c] = k;
  }
  let f = -1;
  if (typeof r == "object" && "length" in r)
    for (; ++f < u; )
      o[f] = Rh(r[f]);
  else {
    const m = Rh(r);
    for (; ++f < u; )
      o[f] = m;
  }
  f = -1;
  const h = [], d = [];
  for (; ++f < u; ) {
    const m = o[f];
    let k = "", y = "";
    m === 99 ? (k = ":", y = ":") : m === 108 ? k = ":" : m === 114 && (y = ":");
    let O = n.alignDelimiters === !1 ? 1 : Math.max(
      1,
      a[f] - k.length - y.length
    );
    const T = k + "-".repeat(O) + y;
    n.alignDelimiters !== !1 && (O = k.length + O + y.length, O > a[f] && (a[f] = O), d[f] = O), h[f] = T;
  }
  s.splice(1, 0, h), l.splice(1, 0, d), c = -1;
  const p = [];
  for (; ++c < s.length; ) {
    const m = s[c], k = l[c];
    f = -1;
    const y = [];
    for (; ++f < u; ) {
      const O = m[f] || "";
      let T = "", V = "";
      if (n.alignDelimiters !== !1) {
        const _ = a[f] - (k[f] || 0), S = o[f];
        S === 114 ? T = " ".repeat(_) : S === 99 ? _ % 2 ? (T = " ".repeat(_ / 2 + 0.5), V = " ".repeat(_ / 2 - 0.5)) : (T = " ".repeat(_ / 2), V = T) : V = " ".repeat(_);
      }
      n.delimiterStart !== !1 && !f && y.push("|"), n.padding !== !1 && // Don’t add the opening space if we’re not aligning and the cell is
      // empty: there will be a closing space.
      !(n.alignDelimiters === !1 && O === "") && (n.delimiterStart !== !1 || f) && y.push(" "), n.alignDelimiters !== !1 && y.push(T), y.push(O), n.alignDelimiters !== !1 && y.push(V), n.padding !== !1 && y.push(" "), (n.delimiterEnd !== !1 || f !== u - 1) && y.push("|");
    }
    p.push(
      n.delimiterEnd === !1 ? y.join("").replace(/ +$/, "") : y.join("")
    );
  }
  return p.join(`
`);
}
function aN(t) {
  return t == null ? "" : String(t);
}
function Rh(t) {
  const e = typeof t == "string" ? t.codePointAt(0) : 0;
  return e === 67 || e === 99 ? 99 : e === 76 || e === 108 ? 108 : e === 82 || e === 114 ? 114 : 0;
}
function uN() {
  return {
    enter: {
      table: cN,
      tableData: Lh,
      tableHeader: Lh,
      tableRow: hN
    },
    exit: {
      codeText: dN,
      table: fN,
      tableData: Jl,
      tableHeader: Jl,
      tableRow: Jl
    }
  };
}
function cN(t) {
  const e = t._align;
  this.enter(
    {
      type: "table",
      align: e.map(function(n) {
        return n === "none" ? null : n;
      }),
      children: []
    },
    t
  ), this.data.inTable = !0;
}
function fN(t) {
  this.exit(t), this.data.inTable = void 0;
}
function hN(t) {
  this.enter({ type: "tableRow", children: [] }, t);
}
function Jl(t) {
  this.exit(t);
}
function Lh(t) {
  this.enter({ type: "tableCell", children: [] }, t);
}
function dN(t) {
  let e = this.resume();
  this.data.inTable && (e = e.replace(/\\([\\|])/g, pN));
  const n = this.stack[this.stack.length - 1];
  n.type, n.value = e, this.exit(t);
}
function pN(t, e) {
  return e === "|" ? e : t;
}
function mN(t) {
  const e = t || {}, n = e.tableCellPadding, r = e.tablePipeAlign, i = e.stringLength, o = n ? " " : "|";
  return {
    unsafe: [
      { character: "\r", inConstruct: "tableCell" },
      { character: `
`, inConstruct: "tableCell" },
      // A pipe, when followed by a tab or space (padding), or a dash or colon
      // (unpadded delimiter row), could result in a table.
      { atBreak: !0, character: "|", after: "[	 :-]" },
      // A pipe in a cell must be encoded.
      { character: "|", inConstruct: "tableCell" },
      // A colon must be followed by a dash, in which case it could start a
      // delimiter row.
      { atBreak: !0, character: ":", after: "-" },
      // A delimiter row can also start with a dash, when followed by more
      // dashes, a colon, or a pipe.
      // This is a stricter version than the built in check for lists, thematic
      // breaks, and setex heading underlines though:
      // <https://github.com/syntax-tree/mdast-util-to-markdown/blob/51a2038/lib/unsafe.js#L57>
      { atBreak: !0, character: "-", after: "[:|-]" }
    ],
    handlers: {
      inlineCode: h,
      table: s,
      tableCell: a,
      tableRow: l
    }
  };
  function s(d, p, m, k) {
    return u(c(d, m, k), d.align);
  }
  function l(d, p, m, k) {
    const y = f(d, m, k), O = u([y]);
    return O.slice(0, O.indexOf(`
`));
  }
  function a(d, p, m, k) {
    const y = m.enter("tableCell"), O = m.enter("phrasing"), T = m.containerPhrasing(d, {
      ...k,
      before: o,
      after: o
    });
    return O(), y(), T;
  }
  function u(d, p) {
    return lN(d, {
      align: p,
      // @ts-expect-error: `markdown-table` types should support `null`.
      alignDelimiters: r,
      // @ts-expect-error: `markdown-table` types should support `null`.
      padding: n,
      // @ts-expect-error: `markdown-table` types should support `null`.
      stringLength: i
    });
  }
  function c(d, p, m) {
    const k = d.children;
    let y = -1;
    const O = [], T = p.enter("table");
    for (; ++y < k.length; )
      O[y] = f(k[y], p, m);
    return T(), O;
  }
  function f(d, p, m) {
    const k = d.children;
    let y = -1;
    const O = [], T = p.enter("tableRow");
    for (; ++y < k.length; )
      O[y] = a(k[y], d, p, m);
    return T(), O;
  }
  function h(d, p, m) {
    let k = Qa.inlineCode(d, p, m);
    return m.stack.includes("tableCell") && (k = k.replace(/\|/g, "\\$&")), k;
  }
}
function gN() {
  return {
    exit: {
      taskListCheckValueChecked: zh,
      taskListCheckValueUnchecked: zh,
      paragraph: kN
    }
  };
}
function yN() {
  return {
    unsafe: [{ atBreak: !0, character: "-", after: "[:|-]" }],
    handlers: { listItem: bN }
  };
}
function zh(t) {
  const e = this.stack[this.stack.length - 2];
  e.type, e.checked = t.type === "taskListCheckValueChecked";
}
function kN(t) {
  const e = this.stack[this.stack.length - 2];
  if (e && e.type === "listItem" && typeof e.checked == "boolean") {
    const n = this.stack[this.stack.length - 1];
    n.type;
    const r = n.children[0];
    if (r && r.type === "text") {
      const i = e.children;
      let o = -1, s;
      for (; ++o < i.length; ) {
        const l = i[o];
        if (l.type === "paragraph") {
          s = l;
          break;
        }
      }
      s === n && (r.value = r.value.slice(1), r.value.length === 0 ? n.children.shift() : n.position && r.position && typeof r.position.start.offset == "number" && (r.position.start.column++, r.position.start.offset++, n.position.start = Object.assign({}, r.position.start)));
    }
  }
  this.exit(t);
}
function bN(t, e, n, r) {
  const i = t.children[0], o = typeof t.checked == "boolean" && i && i.type === "paragraph", s = "[" + (t.checked ? "x" : " ") + "] ", l = n.createTracker(r);
  o && l.move(s);
  let a = Qa.listItem(t, e, n, {
    ...r,
    ...l.current()
  });
  return o && (a = a.replace(/^(?:[*+-]|\d+\.)([\r\n]| {1,3})/, u)), a;
  function u(c) {
    return c + s;
  }
}
function wN() {
  return [
    AM(),
    QM(),
    tN(),
    uN(),
    gN()
  ];
}
function xN(t) {
  return {
    extensions: [
      OM(),
      XM(t),
      nN(),
      mN(t),
      yN()
    ]
  };
}
const CN = {
  tokenize: IN,
  partial: !0
}, sg = {
  tokenize: EN,
  partial: !0
}, lg = {
  tokenize: AN,
  partial: !0
}, ag = {
  tokenize: ON,
  partial: !0
}, SN = {
  tokenize: DN,
  partial: !0
}, ug = {
  name: "wwwAutolink",
  tokenize: TN,
  previous: fg
}, cg = {
  name: "protocolAutolink",
  tokenize: vN,
  previous: hg
}, kn = {
  name: "emailAutolink",
  tokenize: NN,
  previous: dg
}, Jt = {};
function MN() {
  return {
    text: Jt
  };
}
let Jn = 48;
for (; Jn < 123; )
  Jt[Jn] = kn, Jn++, Jn === 58 ? Jn = 65 : Jn === 91 && (Jn = 97);
Jt[43] = kn;
Jt[45] = kn;
Jt[46] = kn;
Jt[95] = kn;
Jt[72] = [kn, cg];
Jt[104] = [kn, cg];
Jt[87] = [kn, ug];
Jt[119] = [kn, ug];
function NN(t, e, n) {
  const r = this;
  let i, o;
  return s;
  function s(f) {
    return !Ha(f) || !dg.call(r, r.previous) || pc(r.events) ? n(f) : (t.enter("literalAutolink"), t.enter("literalAutolinkEmail"), l(f));
  }
  function l(f) {
    return Ha(f) ? (t.consume(f), l) : f === 64 ? (t.consume(f), a) : n(f);
  }
  function a(f) {
    return f === 46 ? t.check(SN, c, u)(f) : f === 45 || f === 95 || rt(f) ? (o = !0, t.consume(f), a) : c(f);
  }
  function u(f) {
    return t.consume(f), i = !0, a;
  }
  function c(f) {
    return o && i && We(r.previous) ? (t.exit("literalAutolinkEmail"), t.exit("literalAutolink"), e(f)) : n(f);
  }
}
function TN(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return s !== 87 && s !== 119 || !fg.call(r, r.previous) || pc(r.events) ? n(s) : (t.enter("literalAutolink"), t.enter("literalAutolinkWww"), t.check(CN, t.attempt(sg, t.attempt(lg, o), n), n)(s));
  }
  function o(s) {
    return t.exit("literalAutolinkWww"), t.exit("literalAutolink"), e(s);
  }
}
function vN(t, e, n) {
  const r = this;
  let i = "", o = !1;
  return s;
  function s(f) {
    return (f === 72 || f === 104) && hg.call(r, r.previous) && !pc(r.events) ? (t.enter("literalAutolink"), t.enter("literalAutolinkHttp"), i += String.fromCodePoint(f), t.consume(f), l) : n(f);
  }
  function l(f) {
    if (We(f) && i.length < 5)
      return i += String.fromCodePoint(f), t.consume(f), l;
    if (f === 58) {
      const h = i.toLowerCase();
      if (h === "http" || h === "https")
        return t.consume(f), a;
    }
    return n(f);
  }
  function a(f) {
    return f === 47 ? (t.consume(f), o ? u : (o = !0, a)) : n(f);
  }
  function u(f) {
    return f === null || ks(f) || pe(f) || gr(f) || Fs(f) ? n(f) : t.attempt(sg, t.attempt(lg, c), n)(f);
  }
  function c(f) {
    return t.exit("literalAutolinkHttp"), t.exit("literalAutolink"), e(f);
  }
}
function IN(t, e, n) {
  let r = 0;
  return i;
  function i(s) {
    return (s === 87 || s === 119) && r < 3 ? (r++, t.consume(s), i) : s === 46 && r === 3 ? (t.consume(s), o) : n(s);
  }
  function o(s) {
    return s === null ? n(s) : e(s);
  }
}
function EN(t, e, n) {
  let r, i, o;
  return s;
  function s(u) {
    return u === 46 || u === 95 ? t.check(ag, a, l)(u) : u === null || pe(u) || gr(u) || u !== 45 && Fs(u) ? a(u) : (o = !0, t.consume(u), s);
  }
  function l(u) {
    return u === 95 ? r = !0 : (i = r, r = void 0), t.consume(u), s;
  }
  function a(u) {
    return i || r || !o ? n(u) : e(u);
  }
}
function AN(t, e) {
  let n = 0, r = 0;
  return i;
  function i(s) {
    return s === 40 ? (n++, t.consume(s), i) : s === 41 && r < n ? o(s) : s === 33 || s === 34 || s === 38 || s === 39 || s === 41 || s === 42 || s === 44 || s === 46 || s === 58 || s === 59 || s === 60 || s === 63 || s === 93 || s === 95 || s === 126 ? t.check(ag, e, o)(s) : s === null || pe(s) || gr(s) ? e(s) : (t.consume(s), i);
  }
  function o(s) {
    return s === 41 && r++, t.consume(s), i;
  }
}
function ON(t, e, n) {
  return r;
  function r(l) {
    return l === 33 || l === 34 || l === 39 || l === 41 || l === 42 || l === 44 || l === 46 || l === 58 || l === 59 || l === 63 || l === 95 || l === 126 ? (t.consume(l), r) : l === 38 ? (t.consume(l), o) : l === 93 ? (t.consume(l), i) : (
      // `<` is an end.
      l === 60 || // So is whitespace.
      l === null || pe(l) || gr(l) ? e(l) : n(l)
    );
  }
  function i(l) {
    return l === null || l === 40 || l === 91 || pe(l) || gr(l) ? e(l) : r(l);
  }
  function o(l) {
    return We(l) ? s(l) : n(l);
  }
  function s(l) {
    return l === 59 ? (t.consume(l), r) : We(l) ? (t.consume(l), s) : n(l);
  }
}
function DN(t, e, n) {
  return r;
  function r(o) {
    return t.consume(o), i;
  }
  function i(o) {
    return rt(o) ? n(o) : e(o);
  }
}
function fg(t) {
  return t === null || t === 40 || t === 42 || t === 95 || t === 91 || t === 93 || t === 126 || pe(t);
}
function hg(t) {
  return !We(t);
}
function dg(t) {
  return !(t === 47 || Ha(t));
}
function Ha(t) {
  return t === 43 || t === 45 || t === 46 || t === 95 || rt(t);
}
function pc(t) {
  let e = t.length, n = !1;
  for (; e--; ) {
    const r = t[e][1];
    if ((r.type === "labelLink" || r.type === "labelImage") && !r._balanced) {
      n = !0;
      break;
    }
    if (r._gfmAutolinkLiteralWalkedInto) {
      n = !1;
      break;
    }
  }
  return t.length > 0 && !n && (t[t.length - 1][1]._gfmAutolinkLiteralWalkedInto = !0), n;
}
const RN = {
  tokenize: VN,
  partial: !0
};
function LN() {
  return {
    document: {
      91: {
        name: "gfmFootnoteDefinition",
        tokenize: FN,
        continuation: {
          tokenize: $N
        },
        exit: _N
      }
    },
    text: {
      91: {
        name: "gfmFootnoteCall",
        tokenize: BN
      },
      93: {
        name: "gfmPotentialFootnoteCall",
        add: "after",
        tokenize: zN,
        resolveTo: PN
      }
    }
  };
}
function zN(t, e, n) {
  const r = this;
  let i = r.events.length;
  const o = r.parser.gfmFootnotes || (r.parser.gfmFootnotes = []);
  let s;
  for (; i--; ) {
    const a = r.events[i][1];
    if (a.type === "labelImage") {
      s = a;
      break;
    }
    if (a.type === "gfmFootnoteCall" || a.type === "labelLink" || a.type === "label" || a.type === "image" || a.type === "link")
      break;
  }
  return l;
  function l(a) {
    if (!s || !s._balanced)
      return n(a);
    const u = Dt(r.sliceSerialize({
      start: s.end,
      end: r.now()
    }));
    return u.codePointAt(0) !== 94 || !o.includes(u.slice(1)) ? n(a) : (t.enter("gfmFootnoteCallLabelMarker"), t.consume(a), t.exit("gfmFootnoteCallLabelMarker"), e(a));
  }
}
function PN(t, e) {
  let n = t.length;
  for (; n--; )
    if (t[n][1].type === "labelImage" && t[n][0] === "enter") {
      t[n][1];
      break;
    }
  t[n + 1][1].type = "data", t[n + 3][1].type = "gfmFootnoteCallLabelMarker";
  const r = {
    type: "gfmFootnoteCall",
    start: Object.assign({}, t[n + 3][1].start),
    end: Object.assign({}, t[t.length - 1][1].end)
  }, i = {
    type: "gfmFootnoteCallMarker",
    start: Object.assign({}, t[n + 3][1].end),
    end: Object.assign({}, t[n + 3][1].end)
  };
  i.end.column++, i.end.offset++, i.end._bufferIndex++;
  const o = {
    type: "gfmFootnoteCallString",
    start: Object.assign({}, i.end),
    end: Object.assign({}, t[t.length - 1][1].start)
  }, s = {
    type: "chunkString",
    contentType: "string",
    start: Object.assign({}, o.start),
    end: Object.assign({}, o.end)
  }, l = [
    // Take the `labelImageMarker` (now `data`, the `!`)
    t[n + 1],
    t[n + 2],
    ["enter", r, e],
    // The `[`
    t[n + 3],
    t[n + 4],
    // The `^`.
    ["enter", i, e],
    ["exit", i, e],
    // Everything in between.
    ["enter", o, e],
    ["enter", s, e],
    ["exit", s, e],
    ["exit", o, e],
    // The ending (`]`, properly parsed and labelled).
    t[t.length - 2],
    t[t.length - 1],
    ["exit", r, e]
  ];
  return t.splice(n, t.length - n + 1, ...l), t;
}
function BN(t, e, n) {
  const r = this, i = r.parser.gfmFootnotes || (r.parser.gfmFootnotes = []);
  let o = 0, s;
  return l;
  function l(f) {
    return t.enter("gfmFootnoteCall"), t.enter("gfmFootnoteCallLabelMarker"), t.consume(f), t.exit("gfmFootnoteCallLabelMarker"), a;
  }
  function a(f) {
    return f !== 94 ? n(f) : (t.enter("gfmFootnoteCallMarker"), t.consume(f), t.exit("gfmFootnoteCallMarker"), t.enter("gfmFootnoteCallString"), t.enter("chunkString").contentType = "string", u);
  }
  function u(f) {
    if (
      // Too long.
      o > 999 || // Closing brace with nothing.
      f === 93 && !s || // Space or tab is not supported by GFM for some reason.
      // `\n` and `[` not being supported makes sense.
      f === null || f === 91 || pe(f)
    )
      return n(f);
    if (f === 93) {
      t.exit("chunkString");
      const h = t.exit("gfmFootnoteCallString");
      return i.includes(Dt(r.sliceSerialize(h))) ? (t.enter("gfmFootnoteCallLabelMarker"), t.consume(f), t.exit("gfmFootnoteCallLabelMarker"), t.exit("gfmFootnoteCall"), e) : n(f);
    }
    return pe(f) || (s = !0), o++, t.consume(f), f === 92 ? c : u;
  }
  function c(f) {
    return f === 91 || f === 92 || f === 93 ? (t.consume(f), o++, u) : u(f);
  }
}
function FN(t, e, n) {
  const r = this, i = r.parser.gfmFootnotes || (r.parser.gfmFootnotes = []);
  let o, s = 0, l;
  return a;
  function a(p) {
    return t.enter("gfmFootnoteDefinition")._container = !0, t.enter("gfmFootnoteDefinitionLabel"), t.enter("gfmFootnoteDefinitionLabelMarker"), t.consume(p), t.exit("gfmFootnoteDefinitionLabelMarker"), u;
  }
  function u(p) {
    return p === 94 ? (t.enter("gfmFootnoteDefinitionMarker"), t.consume(p), t.exit("gfmFootnoteDefinitionMarker"), t.enter("gfmFootnoteDefinitionLabelString"), t.enter("chunkString").contentType = "string", c) : n(p);
  }
  function c(p) {
    if (
      // Too long.
      s > 999 || // Closing brace with nothing.
      p === 93 && !l || // Space or tab is not supported by GFM for some reason.
      // `\n` and `[` not being supported makes sense.
      p === null || p === 91 || pe(p)
    )
      return n(p);
    if (p === 93) {
      t.exit("chunkString");
      const m = t.exit("gfmFootnoteDefinitionLabelString");
      return o = Dt(r.sliceSerialize(m)), t.enter("gfmFootnoteDefinitionLabelMarker"), t.consume(p), t.exit("gfmFootnoteDefinitionLabelMarker"), t.exit("gfmFootnoteDefinitionLabel"), h;
    }
    return pe(p) || (l = !0), s++, t.consume(p), p === 92 ? f : c;
  }
  function f(p) {
    return p === 91 || p === 92 || p === 93 ? (t.consume(p), s++, c) : c(p);
  }
  function h(p) {
    return p === 58 ? (t.enter("definitionMarker"), t.consume(p), t.exit("definitionMarker"), i.includes(o) || i.push(o), ae(t, d, "gfmFootnoteDefinitionWhitespace")) : n(p);
  }
  function d(p) {
    return e(p);
  }
}
function $N(t, e, n) {
  return t.check(So, e, t.attempt(RN, e, n));
}
function _N(t) {
  t.exit("gfmFootnoteDefinition");
}
function VN(t, e, n) {
  const r = this;
  return ae(t, i, "gfmFootnoteDefinitionIndent", 5);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return s && s[1].type === "gfmFootnoteDefinitionIndent" && s[2].sliceSerialize(s[1], !0).length === 4 ? e(o) : n(o);
  }
}
function HN(t) {
  let n = (t || {}).singleTilde;
  const r = {
    name: "strikethrough",
    tokenize: o,
    resolveAll: i
  };
  return n == null && (n = !0), {
    text: {
      126: r
    },
    insideSpan: {
      null: [r]
    },
    attentionMarkers: {
      null: [126]
    }
  };
  function i(s, l) {
    let a = -1;
    for (; ++a < s.length; )
      if (s[a][0] === "enter" && s[a][1].type === "strikethroughSequenceTemporary" && s[a][1]._close) {
        let u = a;
        for (; u--; )
          if (s[u][0] === "exit" && s[u][1].type === "strikethroughSequenceTemporary" && s[u][1]._open && // If the sizes are the same:
          s[a][1].end.offset - s[a][1].start.offset === s[u][1].end.offset - s[u][1].start.offset) {
            s[a][1].type = "strikethroughSequence", s[u][1].type = "strikethroughSequence";
            const c = {
              type: "strikethrough",
              start: Object.assign({}, s[u][1].start),
              end: Object.assign({}, s[a][1].end)
            }, f = {
              type: "strikethroughText",
              start: Object.assign({}, s[u][1].end),
              end: Object.assign({}, s[a][1].start)
            }, h = [["enter", c, l], ["enter", s[u][1], l], ["exit", s[u][1], l], ["enter", f, l]], d = l.parser.constructs.insideSpan.null;
            d && dt(h, h.length, 0, $s(d, s.slice(u + 1, a), l)), dt(h, h.length, 0, [["exit", f, l], ["enter", s[a][1], l], ["exit", s[a][1], l], ["exit", c, l]]), dt(s, u - 1, a - u + 3, h), a = u + h.length - 2;
            break;
          }
      }
    for (a = -1; ++a < s.length; )
      s[a][1].type === "strikethroughSequenceTemporary" && (s[a][1].type = "data");
    return s;
  }
  function o(s, l, a) {
    const u = this.previous, c = this.events;
    let f = 0;
    return h;
    function h(p) {
      return u === 126 && c[c.length - 1][1].type !== "characterEscape" ? a(p) : (s.enter("strikethroughSequenceTemporary"), d(p));
    }
    function d(p) {
      const m = oi(u);
      if (p === 126)
        return f > 1 ? a(p) : (s.consume(p), f++, d);
      if (f < 2 && !n) return a(p);
      const k = s.exit("strikethroughSequenceTemporary"), y = oi(p);
      return k._open = !y || y === 2 && !!m, k._close = !m || m === 2 && !!y, l(p);
    }
  }
}
class jN {
  /**
   * Create a new edit map.
   */
  constructor() {
    this.map = [];
  }
  /**
   * Create an edit: a remove and/or add at a certain place.
   *
   * @param {number} index
   * @param {number} remove
   * @param {Array<Event>} add
   * @returns {undefined}
   */
  add(e, n, r) {
    qN(this, e, n, r);
  }
  // To do: add this when moving to `micromark`.
  // /**
  //  * Create an edit: but insert `add` before existing additions.
  //  *
  //  * @param {number} index
  //  * @param {number} remove
  //  * @param {Array<Event>} add
  //  * @returns {undefined}
  //  */
  // addBefore(index, remove, add) {
  //   addImplementation(this, index, remove, add, true)
  // }
  /**
   * Done, change the events.
   *
   * @param {Array<Event>} events
   * @returns {undefined}
   */
  consume(e) {
    if (this.map.sort(function(o, s) {
      return o[0] - s[0];
    }), this.map.length === 0)
      return;
    let n = this.map.length;
    const r = [];
    for (; n > 0; )
      n -= 1, r.push(e.slice(this.map[n][0] + this.map[n][1]), this.map[n][2]), e.length = this.map[n][0];
    r.push(e.slice()), e.length = 0;
    let i = r.pop();
    for (; i; ) {
      for (const o of i)
        e.push(o);
      i = r.pop();
    }
    this.map.length = 0;
  }
}
function qN(t, e, n, r) {
  let i = 0;
  if (!(n === 0 && r.length === 0)) {
    for (; i < t.map.length; ) {
      if (t.map[i][0] === e) {
        t.map[i][1] += n, t.map[i][2].push(...r);
        return;
      }
      i += 1;
    }
    t.map.push([e, n, r]);
  }
}
function WN(t, e) {
  let n = !1;
  const r = [];
  for (; e < t.length; ) {
    const i = t[e];
    if (n) {
      if (i[0] === "enter")
        i[1].type === "tableContent" && r.push(t[e + 1][1].type === "tableDelimiterMarker" ? "left" : "none");
      else if (i[1].type === "tableContent") {
        if (t[e - 1][1].type === "tableDelimiterMarker") {
          const o = r.length - 1;
          r[o] = r[o] === "left" ? "center" : "right";
        }
      } else if (i[1].type === "tableDelimiterRow")
        break;
    } else i[0] === "enter" && i[1].type === "tableDelimiterRow" && (n = !0);
    e += 1;
  }
  return r;
}
function KN() {
  return {
    flow: {
      null: {
        name: "table",
        tokenize: UN,
        resolveAll: JN
      }
    }
  };
}
function UN(t, e, n) {
  const r = this;
  let i = 0, o = 0, s;
  return l;
  function l(N) {
    let P = r.events.length - 1;
    for (; P > -1; ) {
      const se = r.events[P][1].type;
      if (se === "lineEnding" || // Note: markdown-rs uses `whitespace` instead of `linePrefix`
      se === "linePrefix") P--;
      else break;
    }
    const H = P > -1 ? r.events[P][1].type : null, W = H === "tableHead" || H === "tableRow" ? S : a;
    return W === S && r.parser.lazy[r.now().line] ? n(N) : W(N);
  }
  function a(N) {
    return t.enter("tableHead"), t.enter("tableRow"), u(N);
  }
  function u(N) {
    return N === 124 || (s = !0, o += 1), c(N);
  }
  function c(N) {
    return N === null ? n(N) : J(N) ? o > 1 ? (o = 0, r.interrupt = !0, t.exit("tableRow"), t.enter("lineEnding"), t.consume(N), t.exit("lineEnding"), d) : n(N) : re(N) ? ae(t, c, "whitespace")(N) : (o += 1, s && (s = !1, i += 1), N === 124 ? (t.enter("tableCellDivider"), t.consume(N), t.exit("tableCellDivider"), s = !0, c) : (t.enter("data"), f(N)));
  }
  function f(N) {
    return N === null || N === 124 || pe(N) ? (t.exit("data"), c(N)) : (t.consume(N), N === 92 ? h : f);
  }
  function h(N) {
    return N === 92 || N === 124 ? (t.consume(N), f) : f(N);
  }
  function d(N) {
    return r.interrupt = !1, r.parser.lazy[r.now().line] ? n(N) : (t.enter("tableDelimiterRow"), s = !1, re(N) ? ae(t, p, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(N) : p(N));
  }
  function p(N) {
    return N === 45 || N === 58 ? k(N) : N === 124 ? (s = !0, t.enter("tableCellDivider"), t.consume(N), t.exit("tableCellDivider"), m) : _(N);
  }
  function m(N) {
    return re(N) ? ae(t, k, "whitespace")(N) : k(N);
  }
  function k(N) {
    return N === 58 ? (o += 1, s = !0, t.enter("tableDelimiterMarker"), t.consume(N), t.exit("tableDelimiterMarker"), y) : N === 45 ? (o += 1, y(N)) : N === null || J(N) ? V(N) : _(N);
  }
  function y(N) {
    return N === 45 ? (t.enter("tableDelimiterFiller"), O(N)) : _(N);
  }
  function O(N) {
    return N === 45 ? (t.consume(N), O) : N === 58 ? (s = !0, t.exit("tableDelimiterFiller"), t.enter("tableDelimiterMarker"), t.consume(N), t.exit("tableDelimiterMarker"), T) : (t.exit("tableDelimiterFiller"), T(N));
  }
  function T(N) {
    return re(N) ? ae(t, V, "whitespace")(N) : V(N);
  }
  function V(N) {
    return N === 124 ? p(N) : N === null || J(N) ? !s || i !== o ? _(N) : (t.exit("tableDelimiterRow"), t.exit("tableHead"), e(N)) : _(N);
  }
  function _(N) {
    return n(N);
  }
  function S(N) {
    return t.enter("tableRow"), R(N);
  }
  function R(N) {
    return N === 124 ? (t.enter("tableCellDivider"), t.consume(N), t.exit("tableCellDivider"), R) : N === null || J(N) ? (t.exit("tableRow"), e(N)) : re(N) ? ae(t, R, "whitespace")(N) : (t.enter("data"), q(N));
  }
  function q(N) {
    return N === null || N === 124 || pe(N) ? (t.exit("data"), R(N)) : (t.consume(N), N === 92 ? U : q);
  }
  function U(N) {
    return N === 92 || N === 124 ? (t.consume(N), q) : q(N);
  }
}
function JN(t, e) {
  let n = -1, r = !0, i = 0, o = [0, 0, 0, 0], s = [0, 0, 0, 0], l = !1, a = 0, u, c, f;
  const h = new jN();
  for (; ++n < t.length; ) {
    const d = t[n], p = d[1];
    d[0] === "enter" ? p.type === "tableHead" ? (l = !1, a !== 0 && (Ph(h, e, a, u, c), c = void 0, a = 0), u = {
      type: "table",
      start: Object.assign({}, p.start),
      // Note: correct end is set later.
      end: Object.assign({}, p.end)
    }, h.add(n, 0, [["enter", u, e]])) : p.type === "tableRow" || p.type === "tableDelimiterRow" ? (r = !0, f = void 0, o = [0, 0, 0, 0], s = [0, n + 1, 0, 0], l && (l = !1, c = {
      type: "tableBody",
      start: Object.assign({}, p.start),
      // Note: correct end is set later.
      end: Object.assign({}, p.end)
    }, h.add(n, 0, [["enter", c, e]])), i = p.type === "tableDelimiterRow" ? 2 : c ? 3 : 1) : i && (p.type === "data" || p.type === "tableDelimiterMarker" || p.type === "tableDelimiterFiller") ? (r = !1, s[2] === 0 && (o[1] !== 0 && (s[0] = s[1], f = es(h, e, o, i, void 0, f), o = [0, 0, 0, 0]), s[2] = n)) : p.type === "tableCellDivider" && (r ? r = !1 : (o[1] !== 0 && (s[0] = s[1], f = es(h, e, o, i, void 0, f)), o = s, s = [o[1], n, 0, 0])) : p.type === "tableHead" ? (l = !0, a = n) : p.type === "tableRow" || p.type === "tableDelimiterRow" ? (a = n, o[1] !== 0 ? (s[0] = s[1], f = es(h, e, o, i, n, f)) : s[1] !== 0 && (f = es(h, e, s, i, n, f)), i = 0) : i && (p.type === "data" || p.type === "tableDelimiterMarker" || p.type === "tableDelimiterFiller") && (s[3] = n);
  }
  for (a !== 0 && Ph(h, e, a, u, c), h.consume(e.events), n = -1; ++n < e.events.length; ) {
    const d = e.events[n];
    d[0] === "enter" && d[1].type === "table" && (d[1]._align = WN(e.events, n));
  }
  return t;
}
function es(t, e, n, r, i, o) {
  const s = r === 1 ? "tableHeader" : r === 2 ? "tableDelimiter" : "tableData", l = "tableContent";
  n[0] !== 0 && (o.end = Object.assign({}, Rr(e.events, n[0])), t.add(n[0], 0, [["exit", o, e]]));
  const a = Rr(e.events, n[1]);
  if (o = {
    type: s,
    start: Object.assign({}, a),
    // Note: correct end is set later.
    end: Object.assign({}, a)
  }, t.add(n[1], 0, [["enter", o, e]]), n[2] !== 0) {
    const u = Rr(e.events, n[2]), c = Rr(e.events, n[3]), f = {
      type: l,
      start: Object.assign({}, u),
      end: Object.assign({}, c)
    };
    if (t.add(n[2], 0, [["enter", f, e]]), r !== 2) {
      const h = e.events[n[2]], d = e.events[n[3]];
      if (h[1].end = Object.assign({}, d[1].end), h[1].type = "chunkText", h[1].contentType = "text", n[3] > n[2] + 1) {
        const p = n[2] + 1, m = n[3] - n[2] - 1;
        t.add(p, m, []);
      }
    }
    t.add(n[3] + 1, 0, [["exit", f, e]]);
  }
  return i !== void 0 && (o.end = Object.assign({}, Rr(e.events, i)), t.add(i, 0, [["exit", o, e]]), o = void 0), o;
}
function Ph(t, e, n, r, i) {
  const o = [], s = Rr(e.events, n);
  i && (i.end = Object.assign({}, s), o.push(["exit", i, e])), r.end = Object.assign({}, s), o.push(["exit", r, e]), t.add(n + 1, 0, o);
}
function Rr(t, e) {
  const n = t[e], r = n[0] === "enter" ? "start" : "end";
  return n[1][r];
}
const GN = {
  name: "tasklistCheck",
  tokenize: QN
};
function YN() {
  return {
    text: {
      91: GN
    }
  };
}
function QN(t, e, n) {
  const r = this;
  return i;
  function i(a) {
    return (
      // Exit if there’s stuff before.
      r.previous !== null || // Exit if not in the first content that is the first child of a list
      // item.
      !r._gfmTasklistFirstContentOfListItem ? n(a) : (t.enter("taskListCheck"), t.enter("taskListCheckMarker"), t.consume(a), t.exit("taskListCheckMarker"), o)
    );
  }
  function o(a) {
    return pe(a) ? (t.enter("taskListCheckValueUnchecked"), t.consume(a), t.exit("taskListCheckValueUnchecked"), s) : a === 88 || a === 120 ? (t.enter("taskListCheckValueChecked"), t.consume(a), t.exit("taskListCheckValueChecked"), s) : n(a);
  }
  function s(a) {
    return a === 93 ? (t.enter("taskListCheckMarker"), t.consume(a), t.exit("taskListCheckMarker"), t.exit("taskListCheck"), l) : n(a);
  }
  function l(a) {
    return J(a) ? e(a) : re(a) ? t.check({
      tokenize: XN
    }, e, n)(a) : n(a);
  }
}
function XN(t, e, n) {
  return ae(t, r, "whitespace");
  function r(i) {
    return i === null ? n(i) : e(i);
  }
}
function ZN(t) {
  return ed([
    MN(),
    LN(),
    HN(t),
    KN(),
    YN()
  ]);
}
const eT = {};
function tT(t) {
  const e = (
    /** @type {Processor<Root>} */
    this
  ), n = t || eT, r = e.data(), i = r.micromarkExtensions || (r.micromarkExtensions = []), o = r.fromMarkdownExtensions || (r.fromMarkdownExtensions = []), s = r.toMarkdownExtensions || (r.toMarkdownExtensions = []);
  i.push(ZN(n)), o.push(wN()), s.push(xN(n));
}
function G(t, e) {
  return Object.assign(t, { meta: {
    package: "@milkdown/preset-gfm",
    ...e
  } }), t;
}
var mc = Ao("strike_through");
G(mc, {
  displayName: "Attr<strikethrough>",
  group: "Strikethrough"
});
var Po = gi("strike_through", (t) => ({
  parseDOM: [{ tag: "del" }, {
    style: "text-decoration",
    getAttrs: (e) => e === "line-through"
  }],
  toDOM: (e) => ["del", t.get(mc.key)(e)],
  parseMarkdown: {
    match: (e) => e.type === "delete",
    runner: (e, n, r) => {
      e.openMark(r), e.next(n.children), e.closeMark(r);
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "strike_through",
    runner: (e, n) => {
      e.withMark(n, "delete");
    }
  }
}));
G(Po.mark, {
  displayName: "MarkSchema<strikethrough>",
  group: "Strikethrough"
});
G(Po.ctx, {
  displayName: "MarkSchemaCtx<strikethrough>",
  group: "Strikethrough"
});
var gc = X("ToggleStrikeThrough", (t) => () => No(Po.type(t)));
G(gc, {
  displayName: "Command<ToggleStrikethrough>",
  group: "Strikethrough"
});
var pg = lt((t) => To(new RegExp("(?:^|[^\\\\w:/])(~{1,2})(.+?)\\\\1(?!\\\\w|\\\\/)"), Po.type(t), { updateCaptured: (e) => e.fullMatch.startsWith("~") ? e : { start: e.start + 1, fullMatch: e.fullMatch.slice(1) } }));
G(pg, {
  displayName: "InputRule<strikethrough>",
  group: "Strikethrough"
});
var yc = at("strikeThroughKeymap", { ToggleStrikethrough: {
  shortcuts: "Mod-Alt-x",
  command: (t) => {
    const e = t.get(ce);
    return () => e.call(gc.key);
  }
} });
G(yc.ctx, {
  displayName: "KeymapCtx<strikethrough>",
  group: "Strikethrough"
});
G(yc.shortcuts, {
  displayName: "Keymap<strikethrough>",
  group: "Strikethrough"
});
var Bo = xS({
  tableGroup: "block",
  cellContent: "paragraph",
  cellAttributes: { alignment: {
    default: "left",
    getFromDOM: (t) => t.style.textAlign || "left",
    setDOMAttr: (t, e) => {
      e.style = `text-align: ${t || "left"}`;
    }
  } }
}), dn = Me("table", () => ({
  ...Bo.table,
  content: "table_header_row table_row+",
  disableDropCursor: !0,
  parseMarkdown: {
    match: (t) => t.type === "table",
    runner: (t, e, n) => {
      const r = e.align, i = e.children.map((o, s) => ({
        ...o,
        align: r,
        isHeader: s === 0
      }));
      t.openNode(n), t.next(i), t.closeNode();
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === "table",
    runner: (t, e) => {
      var i;
      const n = (i = e.content.firstChild) == null ? void 0 : i.content;
      if (!n) return;
      const r = [];
      n.forEach((o) => {
        r.push(o.attrs.alignment);
      }), t.openNode("table", void 0, { align: r }), t.next(e.content), t.closeNode();
    }
  }
}));
G(dn.node, {
  displayName: "NodeSchema<table>",
  group: "Table"
});
G(dn.ctx, {
  displayName: "NodeSchemaCtx<table>",
  group: "Table"
});
var Fo = Me("table_header_row", () => ({
  ...Bo.table_row,
  disableDropCursor: !0,
  content: "(table_header)*",
  parseDOM: [{ tag: "tr[data-is-header]" }, {
    tag: "tr",
    getAttrs: (t) => t instanceof HTMLElement && t.querySelector("th") ? {} : !1
  }],
  toDOM() {
    return [
      "tr",
      { "data-is-header": !0 },
      0
    ];
  },
  parseMarkdown: {
    match: (t) => !!(t.type === "tableRow" && t.isHeader),
    runner: (t, e, n) => {
      const r = e.align, i = e.children.map((o, s) => ({
        ...o,
        align: r[s],
        isHeader: e.isHeader
      }));
      t.openNode(n), t.next(i), t.closeNode();
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === "table_header_row",
    runner: (t, e) => {
      e.content.size !== 0 && (t.openNode("tableRow", void 0, { isHeader: !0 }), t.next(e.content), t.closeNode());
    }
  }
}));
G(Fo.node, {
  displayName: "NodeSchema<tableHeaderRow>",
  group: "Table"
});
G(Fo.ctx, {
  displayName: "NodeSchemaCtx<tableHeaderRow>",
  group: "Table"
});
var xi = Me("table_row", () => ({
  ...Bo.table_row,
  disableDropCursor: !0,
  content: "(table_cell)*",
  parseMarkdown: {
    match: (t) => t.type === "tableRow",
    runner: (t, e, n) => {
      const r = e.align, i = e.children.map((o, s) => ({
        ...o,
        align: r[s]
      }));
      t.openNode(n), t.next(i), t.closeNode();
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === "table_row",
    runner: (t, e) => {
      e.content.size !== 0 && (t.openNode("tableRow"), t.next(e.content), t.closeNode());
    }
  }
}));
G(xi.node, {
  displayName: "NodeSchema<tableRow>",
  group: "Table"
});
G(xi.ctx, {
  displayName: "NodeSchemaCtx<tableRow>",
  group: "Table"
});
var $o = Me("table_cell", () => ({
  ...Bo.table_cell,
  disableDropCursor: !0,
  parseMarkdown: {
    match: (t) => t.type === "tableCell" && !t.isHeader,
    runner: (t, e, n) => {
      const r = e.align;
      t.openNode(n, { alignment: r }).openNode(t.schema.nodes.paragraph).next(e.children).closeNode().closeNode();
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === "table_cell",
    runner: (t, e) => {
      t.openNode("tableCell").next(e.content).closeNode();
    }
  }
}));
G($o.node, {
  displayName: "NodeSchema<tableCell>",
  group: "Table"
});
G($o.ctx, {
  displayName: "NodeSchemaCtx<tableCell>",
  group: "Table"
});
var hi = Me("table_header", () => ({
  ...Bo.table_header,
  disableDropCursor: !0,
  parseMarkdown: {
    match: (t) => t.type === "tableCell" && !!t.isHeader,
    runner: (t, e, n) => {
      const r = e.align;
      t.openNode(n, { alignment: r }), t.openNode(t.schema.nodes.paragraph), t.next(e.children), t.closeNode(), t.closeNode();
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === "table_header",
    runner: (t, e) => {
      t.openNode("tableCell"), t.next(e.content), t.closeNode();
    }
  }
}));
G(hi.node, {
  displayName: "NodeSchema<tableHeader>",
  group: "Table"
});
G(hi.ctx, {
  displayName: "NodeSchemaCtx<tableHeader>",
  group: "Table"
});
function mg(t, e = 3, n = 3) {
  const r = Array(n).fill(0).map(() => $o.type(t).createAndFill()), i = Array(n).fill(0).map(() => hi.type(t).createAndFill()), o = Array(e).fill(0).map((s, l) => l === 0 ? Fo.type(t).create(null, i) : xi.type(t).create(null, r));
  return dn.type(t).create(null, o);
}
function gg(t) {
  return (e, n) => (r) => {
    n = n ?? r.selection.from;
    const i = r.doc.resolve(n), o = Ew((a) => a.type.name === "table")(i), s = o ? {
      node: o.node,
      from: o.start
    } : void 0, l = t === "row";
    if (s) {
      const a = fe.get(s.node);
      if (e >= 0 && e < (l ? a.height : a.width)) {
        const u = a.positionAt(l ? e : a.height - 1, l ? a.width - 1 : e, s.node), c = r.doc.resolve(s.from + u), f = l ? me.rowSelection : me.colSelection, h = a.positionAt(l ? e : 0, l ? 0 : e, s.node), d = r.doc.resolve(s.from + h);
        return yp(r.setSelection(f(c, d)));
      }
    }
    return r;
  };
}
var nT = gg("row"), rT = gg("col");
function yg(t, e, { map: n, tableStart: r, table: i }, o) {
  const s = Array(o).fill(0).reduce((a, u, c) => a + i.child(c).nodeSize, r), l = Array(n.width).fill(0).map((a, u) => {
    const c = i.nodeAt(n.map[u]);
    return $o.type(t).createAndFill({ alignment: c == null ? void 0 : c.attrs.alignment });
  });
  return e.insert(s, xi.type(t).create(null, l)), e;
}
function iT(t) {
  const e = zo(t.$from);
  if (!e) return;
  const n = fe.get(e.node);
  return n.cellsInRect({
    left: 0,
    right: n.width,
    top: 0,
    bottom: n.height
  }).map((r) => {
    const i = e.node.nodeAt(r), o = r + e.start;
    return {
      pos: o,
      start: o + 1,
      node: i
    };
  });
}
function oT(t) {
  const e = iT(t.selection);
  if (e && e[0]) {
    const n = t.doc.resolve(e[0].pos), r = e[e.length - 1];
    if (r) {
      const i = t.doc.resolve(r.pos);
      return yp(t.setSelection(new me(i, n)));
    }
  }
  return t;
}
var kc = X("GoToPrevTableCell", () => () => Xm(-1));
G(kc, {
  displayName: "Command<goToPrevTableCellCommand>",
  group: "Table"
});
var bc = X("GoToNextTableCell", () => () => Xm(1));
G(bc, {
  displayName: "Command<goToNextTableCellCommand>",
  group: "Table"
});
var wc = X("ExitTable", (t) => () => (e, n) => {
  if (!ve(e)) return !1;
  const { $head: r } = e.selection, i = Iw(r, dn.type(t));
  if (!i) return !1;
  const { to: o } = i, s = e.tr.replaceWith(o, o, jt.type(t).createAndFill());
  return s.setSelection(ee.near(s.doc.resolve(o), 1)).scrollIntoView(), n == null || n(s), !0;
});
G(wc, {
  displayName: "Command<breakTableCommand>",
  group: "Table"
});
var kg = X("InsertTable", (t) => ({ row: e, col: n } = {}) => (r, i) => {
  const { selection: o, tr: s } = r, { from: l } = o, a = mg(t, e, n), u = s.replaceSelectionWith(a), c = ee.findFrom(u.doc.resolve(l), 1, !0);
  return c && u.setSelection(c), i == null || i(u), !0;
});
G(kg, {
  displayName: "Command<insertTableCommand>",
  group: "Table"
});
var bg = X("MoveRow", () => ({ from: t, to: e, pos: n } = {}) => JS({
  from: t ?? 0,
  to: e ?? 0,
  pos: n
}));
G(bg, {
  displayName: "Command<moveRowCommand>",
  group: "Table"
});
var wg = X("MoveCol", () => ({ from: t, to: e, pos: n } = {}) => GS({
  from: t ?? 0,
  to: e ?? 0,
  pos: n
}));
G(wg, {
  displayName: "Command<moveColCommand>",
  group: "Table"
});
var xg = X("SelectRow", () => (t = { index: 0 }) => (e, n) => {
  const { tr: r } = e;
  return !!(n == null ? void 0 : n(nT(t.index, t.pos)(r)));
});
G(xg, {
  displayName: "Command<selectRowCommand>",
  group: "Table"
});
var Cg = X("SelectCol", () => (t = { index: 0 }) => (e, n) => {
  const { tr: r } = e;
  return !!(n == null ? void 0 : n(rT(t.index, t.pos)(r)));
});
G(Cg, {
  displayName: "Command<selectColCommand>",
  group: "Table"
});
var Sg = X("SelectTable", () => () => (t, e) => {
  const { tr: n } = t;
  return !!(e == null ? void 0 : e(oT(n)));
});
G(Sg, {
  displayName: "Command<selectTableCommand>",
  group: "Table"
});
var Mg = X("DeleteSelectedCells", () => () => (t, e) => {
  const { selection: n } = t;
  if (!(n instanceof me)) return !1;
  const r = n.isRowSelection(), i = n.isColSelection();
  return r && i ? US(t, e) : i ? Gm(t, e) : Qm(t, e);
});
G(Mg, {
  displayName: "Command<deleteSelectedCellsCommand>",
  group: "Table"
});
var Ng = X("AddColBefore", () => () => Um);
G(Ng, {
  displayName: "Command<addColBeforeCommand>",
  group: "Table"
});
var Tg = X("AddColAfter", () => () => Jm);
G(Tg, {
  displayName: "Command<addColAfterCommand>",
  group: "Table"
});
var vg = X("AddRowBefore", (t) => () => (e, n) => {
  if (!ve(e)) return !1;
  if (n) {
    const r = Ut(e);
    n(yg(t, e.tr, r, r.top));
  }
  return !0;
});
G(vg, {
  displayName: "Command<addRowBeforeCommand>",
  group: "Table"
});
var Ig = X("AddRowAfter", (t) => () => (e, n) => {
  if (!ve(e)) return !1;
  if (n) {
    const r = Ut(e);
    n(yg(t, e.tr, r, r.bottom));
  }
  return !0;
});
G(Ig, {
  displayName: "Command<addRowAfterCommand>",
  group: "Table"
});
var Eg = X("SetAlign", () => (t = "left") => qS("alignment", t));
G(Eg, {
  displayName: "Command<setAlignCommand>",
  group: "Table"
});
var Ag = lt((t) => new mt(/^\|(\d+)[xX](\d+)\|\s$/, (e, n, r, i) => {
  var a, u;
  const o = e.doc.resolve(r);
  if (!o.node(-1).canReplaceWith(o.index(-1), o.indexAfter(-1), dn.type(t))) return null;
  const s = mg(t, Math.max(Number(((a = n.groups) == null ? void 0 : a.row) ?? 0), 2), Number((u = n.groups) == null ? void 0 : u.col)), l = e.tr.replaceRangeWith(r, i, s);
  return l.setSelection(Z.create(l.doc, r + 3)).scrollIntoView();
}));
G(Ag, {
  displayName: "InputRule<insertTableInputRule>",
  group: "Table"
});
var Og = PC((t) => ({ run: (e, n, r) => {
  if (r) return e;
  function i(u) {
    var k;
    const c = u.childCount, f = ((k = u.lastChild) == null ? void 0 : k.childCount) ?? 0;
    if (c === 0 || f === 0) return jt.type(t).create();
    const h = u.firstChild;
    if (!(f > 0 && h && h.childCount === 0)) return u;
    if (c >= 3) {
      const y = u.child(1), O = [];
      for (let _ = 0; _ < y.childCount; _++) {
        const S = y.child(_);
        O.push(hi.type(t).create(S.attrs, S.content, S.marks));
      }
      const T = h.type.create(h.attrs, O), V = [];
      for (let _ = 2; _ < c; _++) V.push(u.child(_));
      return u.type.create(u.attrs, [T, ...V]);
    }
    const d = Array(f).fill(0).map(() => hi.type(t).createAndFill()), p = new F(A.from(d), 0, 0), m = h.replace(0, 0, p);
    return u.replace(0, h.nodeSize, new F(A.from(m), 0, 0));
  }
  function o(u) {
    const c = xi.type(t), f = [];
    let h = [], d = !1;
    function p() {
      if (h.length === 0) return;
      const m = Fo.type(t).createAndFill(), k = dn.type(t).create(null, [m, ...h]);
      f.push(i(k)), h = [];
    }
    return u.forEach((m) => {
      m.type === c ? (d = !0, h.push(m)) : (p(), f.push(m));
    }), p(), d ? A.from(f) : u;
  }
  function s(u) {
    let c = o(u), f = c !== u;
    const h = [];
    return c.forEach((d) => {
      if (d.type === dn.type(t)) {
        const p = i(d);
        p !== d && (f = !0), h.push(p);
      } else if (d.childCount > 0) {
        const p = s(d.content);
        p !== d.content ? (f = !0, h.push(d.copy(p))) : h.push(d);
      } else h.push(d);
    }), f ? A.from(h) : u;
  }
  function l(u) {
    const c = [], f = [];
    u.forEach((h) => f.push(h));
    for (let h = 0; h < f.length; h++) {
      const d = f[h], p = f[h + 1];
      d.type === jt.type(t) && d.content.size === 0 && p && p.type === dn.type(t) || c.push(d);
    }
    return c.length < f.length ? A.from(c) : u;
  }
  let a = s(e.content);
  return a = l(a), new F(A.from(a), e.openStart, e.openEnd);
} }));
G(Og, {
  displayName: "PasteRule<table>",
  group: "Table"
});
var xc = at("tableKeymap", {
  NextCell: {
    priority: 100,
    shortcuts: ["Mod-]", "Tab"],
    command: (t) => {
      const e = t.get(ce);
      return () => e.call(bc.key);
    }
  },
  PrevCell: {
    shortcuts: ["Mod-[", "Shift-Tab"],
    command: (t) => {
      const e = t.get(ce);
      return () => e.call(kc.key);
    }
  },
  ExitTable: {
    shortcuts: ["Mod-Enter", "Enter"],
    command: (t) => {
      const e = t.get(ce);
      return () => e.call(wc.key);
    }
  }
});
G(xc.ctx, {
  displayName: "KeymapCtx<table>",
  group: "Table"
});
G(xc.shortcuts, {
  displayName: "Keymap<table>",
  group: "Table"
});
var Gl = "footnote_definition", Bh = "footnoteDefinition", Cc = Me("footnote_definition", () => ({
  group: "block",
  content: "block+",
  defining: !0,
  attrs: { label: {
    default: "",
    validate: "string"
  } },
  parseDOM: [{
    tag: `dl[data-type="${Gl}"]`,
    getAttrs: (t) => {
      if (!(t instanceof HTMLElement)) throw qt(t);
      return { label: t.dataset.label };
    },
    contentElement: "dd"
  }],
  toDOM: (t) => {
    const e = t.attrs.label;
    return [
      "dl",
      {
        "data-label": e,
        "data-type": Gl
      },
      ["dt", e],
      ["dd", 0]
    ];
  },
  parseMarkdown: {
    match: ({ type: t }) => t === Bh,
    runner: (t, e, n) => {
      t.openNode(n, { label: e.label }).next(e.children).closeNode();
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === Gl,
    runner: (t, e) => {
      t.openNode(Bh, void 0, {
        label: e.attrs.label,
        identifier: e.attrs.label
      }).next(e.content).closeNode();
    }
  }
}));
G(Cc.ctx, {
  displayName: "NodeSchemaCtx<footnodeDef>",
  group: "footnote"
});
G(Cc.node, {
  displayName: "NodeSchema<footnodeDef>",
  group: "footnote"
});
var Yl = "footnote_reference", Sc = Me("footnote_reference", () => ({
  group: "inline",
  inline: !0,
  atom: !0,
  attrs: { label: {
    default: "",
    validate: "string"
  } },
  parseDOM: [{
    tag: `sup[data-type="${Yl}"]`,
    getAttrs: (t) => {
      if (!(t instanceof HTMLElement)) throw qt(t);
      return { label: t.dataset.label };
    }
  }],
  toDOM: (t) => {
    const e = t.attrs.label;
    return [
      "sup",
      {
        "data-label": e,
        "data-type": Yl
      },
      e
    ];
  },
  parseMarkdown: {
    match: ({ type: t }) => t === "footnoteReference",
    runner: (t, e, n) => {
      t.addNode(n, { label: e.label });
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === Yl,
    runner: (t, e) => {
      t.addNode("footnoteReference", void 0, void 0, {
        label: e.attrs.label,
        identifier: e.attrs.label
      });
    }
  }
}));
G(Sc.ctx, {
  displayName: "NodeSchemaCtx<footnodeRef>",
  group: "footnote"
});
G(Sc.node, {
  displayName: "NodeSchema<footnodeRef>",
  group: "footnote"
});
var Mc = yn.extendSchema((t) => (e) => {
  const n = t(e);
  return {
    ...n,
    attrs: {
      ...n.attrs,
      checked: {
        default: null,
        validate: "boolean|null"
      }
    },
    parseDOM: [{
      tag: 'li[data-item-type="task"]',
      getAttrs: (r) => {
        if (!(r instanceof HTMLElement)) throw qt(r);
        return {
          label: r.dataset.label,
          listType: r.dataset.listType,
          spread: r.dataset.spread,
          checked: r.dataset.checked ? r.dataset.checked === "true" : null
        };
      }
    }, ...(n == null ? void 0 : n.parseDOM) || []],
    toDOM: (r) => n.toDOM && r.attrs.checked == null ? n.toDOM(r) : [
      "li",
      {
        "data-item-type": "task",
        "data-label": r.attrs.label,
        "data-list-type": r.attrs.listType,
        "data-spread": r.attrs.spread,
        "data-checked": r.attrs.checked
      },
      0
    ],
    parseMarkdown: {
      match: ({ type: r }) => r === "listItem",
      runner: (r, i, o) => {
        if (i.checked == null) {
          n.parseMarkdown.runner(r, i, o);
          return;
        }
        const s = i.label != null ? `${i.label}.` : "•", l = i.checked != null ? !!i.checked : null, a = i.label != null ? "ordered" : "bullet", u = i.spread != null ? `${i.spread}` : "true";
        r.openNode(o, {
          label: s,
          listType: a,
          spread: u,
          checked: l
        }), r.next(i.children), r.closeNode();
      }
    },
    toMarkdown: {
      match: (r) => r.type.name === "list_item",
      runner: (r, i) => {
        if (i.attrs.checked == null) {
          n.toMarkdown.runner(r, i);
          return;
        }
        const o = i.attrs.label, s = i.attrs.listType, l = i.attrs.spread === "true", a = i.attrs.checked;
        r.openNode("listItem", void 0, {
          label: o,
          listType: s,
          spread: l,
          checked: a
        }), r.next(i.content), r.closeNode();
      }
    }
  };
});
G(Mc.node, {
  displayName: "NodeSchema<taskListItem>",
  group: "ListItem"
});
G(Mc.ctx, {
  displayName: "NodeSchemaCtx<taskListItem>",
  group: "ListItem"
});
var Dg = lt(() => new mt(/^\[(\s|x)\]\s$/, (t, e, n, r) => {
  var c;
  const i = t.doc.resolve(n);
  let o = 0, s = i.node(o);
  for (; s && s.type.name !== "list_item"; )
    o--, s = i.node(o);
  if (!s || s.attrs.checked != null) return null;
  const l = ((c = e.groups) == null ? void 0 : c.checked) === "x", a = i.before(o), u = t.tr;
  return u.deleteRange(n, r).setNodeMarkup(a, void 0, {
    ...s.attrs,
    checked: l
  }), u;
}));
G(Dg, {
  displayName: "InputRule<wrapInTaskListInputRule>",
  group: "ListItem"
});
var sT = [yc, xc].flat(), lT = [Ag, Dg], aT = [pg], uT = [Og], Rg = Kt(() => MM);
G(Rg, {
  displayName: "Prose<autoInsertSpanPlugin>",
  group: "Prose"
});
var cT = Kt(() => oM({}));
G(cT, {
  displayName: "Prose<columnResizingPlugin>",
  group: "Prose"
});
var Lg = Kt(() => mM({ allowTableNodeSelection: !0 }));
G(Lg, {
  displayName: "Prose<tableEditingPlugin>",
  group: "Prose"
});
var Nc = Cr("remarkGFM", () => tT);
G(Nc.plugin, {
  displayName: "Remark<remarkGFMPlugin>",
  group: "Remark"
});
G(Nc.options, {
  displayName: "RemarkConfig<remarkGFMPlugin>",
  group: "Remark"
});
var fT = new Ve("MILKDOWN_KEEP_TABLE_ALIGN_PLUGIN");
function hT(t, e) {
  let n = 0;
  return e.forEach((r, i, o) => {
    r === t && (n = o);
  }), n;
}
var zg = Kt(() => new Ee({
  key: fT,
  appendTransaction: (t, e, n) => {
    let r;
    const i = (o, s) => {
      if (r || (r = n.tr), o.type.name !== "table_cell") return;
      const l = n.doc.resolve(s), a = l.node(l.depth), u = l.node(l.depth - 1).firstChild;
      if (!u) return;
      const c = hT(o, a), f = u.maybeChild(c);
      if (!f) return;
      const h = f.attrs.alignment;
      h !== o.attrs.alignment && r.setNodeMarkup(s, void 0, {
        ...o.attrs,
        alignment: h
      });
    };
    return e.doc !== n.doc && n.doc.descendants(i), r;
  }
}));
G(zg, {
  displayName: "Prose<keepTableAlignPlugin>",
  group: "Prose"
});
var dT = [
  zg,
  Rg,
  Nc,
  Lg
].flat(), pT = [
  Mc,
  dn,
  Fo,
  xi,
  hi,
  $o,
  Cc,
  Sc,
  mc,
  Po
].flat(), mT = [
  bc,
  kc,
  wc,
  kg,
  bg,
  wg,
  xg,
  Cg,
  Sg,
  Mg,
  vg,
  Ig,
  Ng,
  Tg,
  Eg,
  gc
], gT = [
  pT,
  lT,
  uT,
  aT,
  sT,
  mT,
  dT
].flat(), Rs = 200, Ie = function() {
};
Ie.prototype.append = function(e) {
  return e.length ? (e = Ie.from(e), !this.length && e || e.length < Rs && this.leafAppend(e) || this.length < Rs && e.leafPrepend(this) || this.appendInner(e)) : this;
};
Ie.prototype.prepend = function(e) {
  return e.length ? Ie.from(e).append(this) : this;
};
Ie.prototype.appendInner = function(e) {
  return new yT(this, e);
};
Ie.prototype.slice = function(e, n) {
  return e === void 0 && (e = 0), n === void 0 && (n = this.length), e >= n ? Ie.empty : this.sliceInner(Math.max(0, e), Math.min(this.length, n));
};
Ie.prototype.get = function(e) {
  if (!(e < 0 || e >= this.length))
    return this.getInner(e);
};
Ie.prototype.forEach = function(e, n, r) {
  n === void 0 && (n = 0), r === void 0 && (r = this.length), n <= r ? this.forEachInner(e, n, r, 0) : this.forEachInvertedInner(e, n, r, 0);
};
Ie.prototype.map = function(e, n, r) {
  n === void 0 && (n = 0), r === void 0 && (r = this.length);
  var i = [];
  return this.forEach(function(o, s) {
    return i.push(e(o, s));
  }, n, r), i;
};
Ie.from = function(e) {
  return e instanceof Ie ? e : e && e.length ? new Pg(e) : Ie.empty;
};
var Pg = /* @__PURE__ */ function(t) {
  function e(r) {
    t.call(this), this.values = r;
  }
  t && (e.__proto__ = t), e.prototype = Object.create(t && t.prototype), e.prototype.constructor = e;
  var n = { length: { configurable: !0 }, depth: { configurable: !0 } };
  return e.prototype.flatten = function() {
    return this.values;
  }, e.prototype.sliceInner = function(i, o) {
    return i == 0 && o == this.length ? this : new e(this.values.slice(i, o));
  }, e.prototype.getInner = function(i) {
    return this.values[i];
  }, e.prototype.forEachInner = function(i, o, s, l) {
    for (var a = o; a < s; a++)
      if (i(this.values[a], l + a) === !1)
        return !1;
  }, e.prototype.forEachInvertedInner = function(i, o, s, l) {
    for (var a = o - 1; a >= s; a--)
      if (i(this.values[a], l + a) === !1)
        return !1;
  }, e.prototype.leafAppend = function(i) {
    if (this.length + i.length <= Rs)
      return new e(this.values.concat(i.flatten()));
  }, e.prototype.leafPrepend = function(i) {
    if (this.length + i.length <= Rs)
      return new e(i.flatten().concat(this.values));
  }, n.length.get = function() {
    return this.values.length;
  }, n.depth.get = function() {
    return 0;
  }, Object.defineProperties(e.prototype, n), e;
}(Ie);
Ie.empty = new Pg([]);
var yT = /* @__PURE__ */ function(t) {
  function e(n, r) {
    t.call(this), this.left = n, this.right = r, this.length = n.length + r.length, this.depth = Math.max(n.depth, r.depth) + 1;
  }
  return t && (e.__proto__ = t), e.prototype = Object.create(t && t.prototype), e.prototype.constructor = e, e.prototype.flatten = function() {
    return this.left.flatten().concat(this.right.flatten());
  }, e.prototype.getInner = function(r) {
    return r < this.left.length ? this.left.get(r) : this.right.get(r - this.left.length);
  }, e.prototype.forEachInner = function(r, i, o, s) {
    var l = this.left.length;
    if (i < l && this.left.forEachInner(r, i, Math.min(o, l), s) === !1 || o > l && this.right.forEachInner(r, Math.max(i - l, 0), Math.min(this.length, o) - l, s + l) === !1)
      return !1;
  }, e.prototype.forEachInvertedInner = function(r, i, o, s) {
    var l = this.left.length;
    if (i > l && this.right.forEachInvertedInner(r, i - l, Math.max(o, l) - l, s + l) === !1 || o < l && this.left.forEachInvertedInner(r, Math.min(i, l), o, s) === !1)
      return !1;
  }, e.prototype.sliceInner = function(r, i) {
    if (r == 0 && i == this.length)
      return this;
    var o = this.left.length;
    return i <= o ? this.left.slice(r, i) : r >= o ? this.right.slice(r - o, i - o) : this.left.slice(r, o).append(this.right.slice(0, i - o));
  }, e.prototype.leafAppend = function(r) {
    var i = this.right.leafAppend(r);
    if (i)
      return new e(this.left, i);
  }, e.prototype.leafPrepend = function(r) {
    var i = this.left.leafPrepend(r);
    if (i)
      return new e(i, this.right);
  }, e.prototype.appendInner = function(r) {
    return this.left.depth >= Math.max(this.right.depth, r.depth) + 1 ? new e(this.left, new e(this.right, r)) : new e(this, r);
  }, e;
}(Ie);
const kT = 500;
class Ot {
  constructor(e, n) {
    this.items = e, this.eventCount = n;
  }
  // Pop the latest event off the branch's history and apply it
  // to a document transform.
  popEvent(e, n) {
    if (this.eventCount == 0)
      return null;
    let r = this.items.length;
    for (; ; r--)
      if (this.items.get(r - 1).selection) {
        --r;
        break;
      }
    let i, o;
    n && (i = this.remapping(r, this.items.length), o = i.maps.length);
    let s = e.tr, l, a, u = [], c = [];
    return this.items.forEach((f, h) => {
      if (!f.step) {
        i || (i = this.remapping(r, h + 1), o = i.maps.length), o--, c.push(f);
        return;
      }
      if (i) {
        c.push(new Ft(f.map));
        let d = f.step.map(i.slice(o)), p;
        d && s.maybeStep(d).doc && (p = s.mapping.maps[s.mapping.maps.length - 1], u.push(new Ft(p, void 0, void 0, u.length + c.length))), o--, p && i.appendMap(p, o);
      } else
        s.maybeStep(f.step);
      if (f.selection)
        return l = i ? f.selection.map(i.slice(o)) : f.selection, a = new Ot(this.items.slice(0, r).append(c.reverse().concat(u)), this.eventCount - 1), !1;
    }, this.items.length, 0), { remaining: a, transform: s, selection: l };
  }
  // Create a new branch with the given transform added.
  addTransform(e, n, r, i) {
    let o = [], s = this.eventCount, l = this.items, a = !i && l.length ? l.get(l.length - 1) : null;
    for (let c = 0; c < e.steps.length; c++) {
      let f = e.steps[c].invert(e.docs[c]), h = new Ft(e.mapping.maps[c], f, n), d;
      (d = a && a.merge(h)) && (h = d, c ? o.pop() : l = l.slice(0, l.length - 1)), o.push(h), n && (s++, n = void 0), i || (a = h);
    }
    let u = s - r.depth;
    return u > wT && (l = bT(l, u), s -= u), new Ot(l.append(o), s);
  }
  remapping(e, n) {
    let r = new Yi();
    return this.items.forEach((i, o) => {
      let s = i.mirrorOffset != null && o - i.mirrorOffset >= e ? r.maps.length - i.mirrorOffset : void 0;
      r.appendMap(i.map, s);
    }, e, n), r;
  }
  addMaps(e) {
    return this.eventCount == 0 ? this : new Ot(this.items.append(e.map((n) => new Ft(n))), this.eventCount);
  }
  // When the collab module receives remote changes, the history has
  // to know about those, so that it can adjust the steps that were
  // rebased on top of the remote changes, and include the position
  // maps for the remote changes in its array of items.
  rebased(e, n) {
    if (!this.eventCount)
      return this;
    let r = [], i = Math.max(0, this.items.length - n), o = e.mapping, s = e.steps.length, l = this.eventCount;
    this.items.forEach((h) => {
      h.selection && l--;
    }, i);
    let a = n;
    this.items.forEach((h) => {
      let d = o.getMirror(--a);
      if (d == null)
        return;
      s = Math.min(s, d);
      let p = o.maps[d];
      if (h.step) {
        let m = e.steps[d].invert(e.docs[d]), k = h.selection && h.selection.map(o.slice(a + 1, d));
        k && l++, r.push(new Ft(p, m, k));
      } else
        r.push(new Ft(p));
    }, i);
    let u = [];
    for (let h = n; h < s; h++)
      u.push(new Ft(o.maps[h]));
    let c = this.items.slice(0, i).append(u).append(r), f = new Ot(c, l);
    return f.emptyItemCount() > kT && (f = f.compress(this.items.length - r.length)), f;
  }
  emptyItemCount() {
    let e = 0;
    return this.items.forEach((n) => {
      n.step || e++;
    }), e;
  }
  // Compressing a branch means rewriting it to push the air (map-only
  // items) out. During collaboration, these naturally accumulate
  // because each remote change adds one. The `upto` argument is used
  // to ensure that only the items below a given level are compressed,
  // because `rebased` relies on a clean, untouched set of items in
  // order to associate old items with rebased steps.
  compress(e = this.items.length) {
    let n = this.remapping(0, e), r = n.maps.length, i = [], o = 0;
    return this.items.forEach((s, l) => {
      if (l >= e)
        i.push(s), s.selection && o++;
      else if (s.step) {
        let a = s.step.map(n.slice(r)), u = a && a.getMap();
        if (r--, u && n.appendMap(u, r), a) {
          let c = s.selection && s.selection.map(n.slice(r));
          c && o++;
          let f = new Ft(u.invert(), a, c), h, d = i.length - 1;
          (h = i.length && i[d].merge(f)) ? i[d] = h : i.push(f);
        }
      } else s.map && r--;
    }, this.items.length, 0), new Ot(Ie.from(i.reverse()), o);
  }
}
Ot.empty = new Ot(Ie.empty, 0);
function bT(t, e) {
  let n;
  return t.forEach((r, i) => {
    if (r.selection && e-- == 0)
      return n = i, !1;
  }), t.slice(n);
}
class Ft {
  constructor(e, n, r, i) {
    this.map = e, this.step = n, this.selection = r, this.mirrorOffset = i;
  }
  merge(e) {
    if (this.step && e.step && !e.selection) {
      let n = e.step.merge(this.step);
      if (n)
        return new Ft(n.getMap().invert(), n, this.selection);
    }
  }
}
class vn {
  constructor(e, n, r, i, o) {
    this.done = e, this.undone = n, this.prevRanges = r, this.prevTime = i, this.prevComposition = o;
  }
}
const wT = 20;
function xT(t, e, n, r) {
  let i = n.getMeta(hr), o;
  if (i)
    return i.historyState;
  n.getMeta(MT) && (t = new vn(t.done, t.undone, null, 0, -1));
  let s = n.getMeta("appendedTransaction");
  if (n.steps.length == 0)
    return t;
  if (s && s.getMeta(hr))
    return s.getMeta(hr).redo ? new vn(t.done.addTransform(n, void 0, r, ys(e)), t.undone, Fh(n.mapping.maps), t.prevTime, t.prevComposition) : new vn(t.done, t.undone.addTransform(n, void 0, r, ys(e)), null, t.prevTime, t.prevComposition);
  if (n.getMeta("addToHistory") !== !1 && !(s && s.getMeta("addToHistory") === !1)) {
    let l = n.getMeta("composition"), a = t.prevTime == 0 || !s && t.prevComposition != l && (t.prevTime < (n.time || 0) - r.newGroupDelay || !CT(n, t.prevRanges)), u = s ? Ql(t.prevRanges, n.mapping) : Fh(n.mapping.maps);
    return new vn(t.done.addTransform(n, a ? e.selection.getBookmark() : void 0, r, ys(e)), Ot.empty, u, n.time, l ?? t.prevComposition);
  } else return (o = n.getMeta("rebased")) ? new vn(t.done.rebased(n, o), t.undone.rebased(n, o), Ql(t.prevRanges, n.mapping), t.prevTime, t.prevComposition) : new vn(t.done.addMaps(n.mapping.maps), t.undone.addMaps(n.mapping.maps), Ql(t.prevRanges, n.mapping), t.prevTime, t.prevComposition);
}
function CT(t, e) {
  if (!e)
    return !1;
  if (!t.docChanged)
    return !0;
  let n = !1;
  return t.mapping.maps[0].forEach((r, i) => {
    for (let o = 0; o < e.length; o += 2)
      r <= e[o + 1] && i >= e[o] && (n = !0);
  }), n;
}
function Fh(t) {
  let e = [];
  for (let n = t.length - 1; n >= 0 && e.length == 0; n--)
    t[n].forEach((r, i, o, s) => e.push(o, s));
  return e;
}
function Ql(t, e) {
  if (!t)
    return null;
  let n = [];
  for (let r = 0; r < t.length; r += 2) {
    let i = e.map(t[r], 1), o = e.map(t[r + 1], -1);
    i <= o && n.push(i, o);
  }
  return n;
}
function ST(t, e, n) {
  let r = ys(e), i = hr.get(e).spec.config, o = (n ? t.undone : t.done).popEvent(e, r);
  if (!o)
    return null;
  let s = o.selection.resolve(o.transform.doc), l = (n ? t.done : t.undone).addTransform(o.transform, e.selection.getBookmark(), i, r), a = new vn(n ? l : o.remaining, n ? o.remaining : l, null, 0, -1);
  return o.transform.setSelection(s).setMeta(hr, { redo: n, historyState: a });
}
let Xl = !1, $h = null;
function ys(t) {
  let e = t.plugins;
  if ($h != e) {
    Xl = !1, $h = e;
    for (let n = 0; n < e.length; n++)
      if (e[n].spec.historyPreserveItems) {
        Xl = !0;
        break;
      }
  }
  return Xl;
}
const hr = new Ve("history"), MT = new Ve("closeHistory");
function NT(t = {}) {
  return t = {
    depth: t.depth || 100,
    newGroupDelay: t.newGroupDelay || 500
  }, new Ee({
    key: hr,
    state: {
      init() {
        return new vn(Ot.empty, Ot.empty, null, 0, -1);
      },
      apply(e, n, r) {
        return xT(n, r, e, t);
      }
    },
    config: t,
    props: {
      handleDOMEvents: {
        beforeinput(e, n) {
          let r = n.inputType, i = r == "historyUndo" ? Ui : r == "historyRedo" ? zr : null;
          return !i || !e.editable ? !1 : (n.preventDefault(), i(e.state, e.dispatch));
        }
      }
    }
  });
}
function Bg(t, e) {
  return (n, r) => {
    let i = hr.getState(n);
    if (!i || (t ? i.undone : i.done).eventCount == 0)
      return !1;
    if (r) {
      let o = ST(i, n, t);
      o && r(e ? o.scrollIntoView() : o);
    }
    return !0;
  };
}
const Ui = Bg(!1, !0), zr = Bg(!0, !0);
function Ci(t, e) {
  return Object.assign(t, { meta: {
    package: "@milkdown/plugin-history",
    ...e
  } }), t;
}
var Tc = X("Undo", () => () => Ui);
Ci(Tc, { displayName: "Command<undo>" });
var vc = X("Redo", () => () => zr);
Ci(vc, { displayName: "Command<redo>" });
var Ic = gn({}, "historyProviderConfig");
Ci(Ic, { displayName: "Ctx<historyProviderConfig>" });
var Fg = Kt((t) => NT(t.get(Ic.key)));
Ci(Fg, { displayName: "Ctx<historyProviderPlugin>" });
var Ec = at("historyKeymap", {
  Undo: {
    shortcuts: "Mod-z",
    command: (t) => {
      const e = t.get(ce);
      return () => e.call(Tc.key);
    }
  },
  Redo: {
    shortcuts: ["Mod-y", "Shift-Mod-z"],
    command: (t) => {
      const e = t.get(ce);
      return () => e.call(vc.key);
    }
  }
});
Ci(Ec.ctx, { displayName: "KeymapCtx<history>" });
Ci(Ec.shortcuts, { displayName: "Keymap<history>" });
var TT = [
  Ic,
  Fg,
  Ec,
  Tc,
  vc
].flat(), vT = typeof global == "object" && global && global.Object === Object && global, IT = typeof self == "object" && self && self.Object === Object && self, $g = vT || IT || Function("return this")(), Ls = $g.Symbol, _g = Object.prototype, ET = _g.hasOwnProperty, AT = _g.toString, Ii = Ls ? Ls.toStringTag : void 0;
function OT(t) {
  var e = ET.call(t, Ii), n = t[Ii];
  try {
    t[Ii] = void 0;
    var r = !0;
  } catch {
  }
  var i = AT.call(t);
  return r && (e ? t[Ii] = n : delete t[Ii]), i;
}
var DT = Object.prototype, RT = DT.toString;
function LT(t) {
  return RT.call(t);
}
var zT = "[object Null]", PT = "[object Undefined]", _h = Ls ? Ls.toStringTag : void 0;
function BT(t) {
  return t == null ? t === void 0 ? PT : zT : _h && _h in Object(t) ? OT(t) : LT(t);
}
function FT(t) {
  return t != null && typeof t == "object";
}
var $T = "[object Symbol]";
function _T(t) {
  return typeof t == "symbol" || FT(t) && BT(t) == $T;
}
var VT = /\s/;
function HT(t) {
  for (var e = t.length; e-- && VT.test(t.charAt(e)); )
    ;
  return e;
}
var jT = /^\s+/;
function qT(t) {
  return t && t.slice(0, HT(t) + 1).replace(jT, "");
}
function ja(t) {
  var e = typeof t;
  return t != null && (e == "object" || e == "function");
}
var Vh = NaN, WT = /^[-+]0x[0-9a-f]+$/i, KT = /^0b[01]+$/i, UT = /^0o[0-7]+$/i, JT = parseInt;
function Hh(t) {
  if (typeof t == "number")
    return t;
  if (_T(t))
    return Vh;
  if (ja(t)) {
    var e = typeof t.valueOf == "function" ? t.valueOf() : t;
    t = ja(e) ? e + "" : e;
  }
  if (typeof t != "string")
    return t === 0 ? t : +t;
  t = qT(t);
  var n = KT.test(t);
  return n || UT.test(t) ? JT(t.slice(2), n ? 2 : 8) : WT.test(t) ? Vh : +t;
}
var Zl = function() {
  return $g.Date.now();
}, GT = "Expected a function", YT = Math.max, QT = Math.min;
function XT(t, e, n) {
  var r, i, o, s, l, a, u = 0, c = !1, f = !1, h = !0;
  if (typeof t != "function")
    throw new TypeError(GT);
  e = Hh(e) || 0, ja(n) && (c = !!n.leading, f = "maxWait" in n, o = f ? YT(Hh(n.maxWait) || 0, e) : o, h = "trailing" in n ? !!n.trailing : h);
  function d(S) {
    var R = r, q = i;
    return r = i = void 0, u = S, s = t.apply(q, R), s;
  }
  function p(S) {
    return u = S, l = setTimeout(y, e), c ? d(S) : s;
  }
  function m(S) {
    var R = S - a, q = S - u, U = e - R;
    return f ? QT(U, o - q) : U;
  }
  function k(S) {
    var R = S - a, q = S - u;
    return a === void 0 || R >= e || R < 0 || f && q >= o;
  }
  function y() {
    var S = Zl();
    if (k(S))
      return O(S);
    l = setTimeout(y, m(S));
  }
  function O(S) {
    return l = void 0, h && r ? d(S) : (r = i = void 0, s);
  }
  function T() {
    l !== void 0 && clearTimeout(l), u = 0, r = a = i = l = void 0;
  }
  function V() {
    return l === void 0 ? s : O(Zl());
  }
  function _() {
    var S = Zl(), R = k(S);
    if (r = arguments, i = this, a = S, R) {
      if (l === void 0)
        return p(a);
      if (f)
        return clearTimeout(l), l = setTimeout(y, e), d(a);
    }
    return l === void 0 && (l = setTimeout(y, e)), s;
  }
  return _.cancel = T, _.flush = V, _;
}
var Vg = class {
  constructor() {
    this.beforeMountedListeners = [], this.mountedListeners = [], this.updatedListeners = [], this.selectionUpdatedListeners = [], this.markdownUpdatedListeners = [], this.blurListeners = [], this.focusListeners = [], this.destroyListeners = [], this.beforeMount = (t) => (this.beforeMountedListeners.push(t), this), this.mounted = (t) => (this.mountedListeners.push(t), this), this.updated = (t) => (this.updatedListeners.push(t), this);
  }
  get listeners() {
    return {
      beforeMount: this.beforeMountedListeners,
      mounted: this.mountedListeners,
      updated: this.updatedListeners,
      markdownUpdated: this.markdownUpdatedListeners,
      blur: this.blurListeners,
      focus: this.focusListeners,
      destroy: this.destroyListeners,
      selectionUpdated: this.selectionUpdatedListeners
    };
  }
  markdownUpdated(t) {
    return this.markdownUpdatedListeners.push(t), this;
  }
  blur(t) {
    return this.blurListeners.push(t), this;
  }
  focus(t) {
    return this.focusListeners.push(t), this;
  }
  destroy(t) {
    return this.destroyListeners.push(t), this;
  }
  selectionUpdated(t) {
    return this.selectionUpdatedListeners.push(t), this;
  }
}, qa = oe(new Vg(), "listener"), ZT = new Ve("MILKDOWN_LISTENER"), Hg = (t) => (t.inject(qa, new Vg()), async () => {
  await t.wait(cr);
  const { listeners: e } = t.get(qa);
  e.beforeMount.forEach((u) => u(t)), await t.wait(Wi);
  const n = t.get(Ki);
  let r = null, i = null, o = null, s = null;
  const l = XT(() => {
    if (!s) return;
    const { doc: u } = s;
    if (e.updated.length > 0 && r && !r.eq(u) && e.updated.forEach((c) => {
      c(t, u, r);
    }), e.markdownUpdated.length > 0 && r && !r.eq(u)) {
      const c = n(u);
      e.markdownUpdated.forEach((f) => {
        f(t, c, i);
      }), i = c;
    }
    r = u, s = null;
  }, 200), a = new Ee({
    key: ZT,
    view: () => ({ destroy: () => {
      e.destroy.forEach((u) => u(t));
    } }),
    props: { handleDOMEvents: {
      focus: () => (e.focus.forEach((u) => u(t)), !1),
      blur: () => (e.blur.forEach((u) => u(t)), !1)
    } },
    state: {
      init: (u, c) => {
        r = c.doc, i = n(c.doc);
      },
      apply: (u) => {
        const c = u.selection;
        (!o && c || o && !c.eq(o)) && (e.selectionUpdated.forEach((f) => {
          f(t, c, o);
        }), o = c), !(!(u.docChanged || u.storedMarksSet) || u.getMeta("addToHistory") === !1) && (s = u, l());
      }
    }
  });
  t.update(pn, (u) => u.concat(a)), await t.wait(ds), e.mounted.forEach((u) => u(t));
});
Hg.meta = {
  package: "@milkdown/plugin-listener",
  displayName: "Listener"
};
const zs = /* @__PURE__ */ new WeakMap(), ea = [
  { value: "", label: "Plain Text" },
  { value: "markdown", label: "Markdown" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "js", label: "JavaScript" },
  { value: "ts", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "shell", label: "Shell" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "sql", label: "SQL" }
];
function ts(t) {
  return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function jh(t = "") {
  const e = String(t || "").trim(), n = ea.some((r) => r.value === e);
  return !e || n ? ea : [
    ...ea,
    { value: e, label: e }
  ];
}
const Qt = {
  image: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 5.2h11a1.3 1.3 0 0 1 1.3 1.3v8a1.3 1.3 0 0 1-1.3 1.3h-11a1.3 1.3 0 0 1-1.3-1.3v-8a1.3 1.3 0 0 1 1.3-1.3Z" fill="none" stroke="currentColor" stroke-width="1.45"/><path d="m4 13.8 3.2-3.2 2.4 2.2 2.7-3.1 3.7 4.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/><circle cx="13.4" cy="7.8" r="1.1" fill="currentColor"/></svg>',
  h1: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14.7 15V8.2l-1.7.9" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  h2: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13.1 9.1c.4-.7 1-1 1.9-1 1.1 0 1.9.7 1.9 1.7 0 .8-.5 1.4-1.4 2.1l-2.3 2.1h3.8" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  h3: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13.2 8.7c.4-.4 1-.6 1.7-.6 1.1 0 1.9.6 1.9 1.5 0 .8-.6 1.3-1.4 1.4.9.1 1.6.7 1.6 1.6 0 1-.9 1.8-2.1 1.8-.8 0-1.5-.2-2-.7" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  h4: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16.2 14.5V8.2l-3.5 4.3h4.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  list: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 6h8M8 10h8M8 14h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="4.8" cy="6" r="1" fill="currentColor"/><circle cx="4.8" cy="10" r="1" fill="currentColor"/><circle cx="4.8" cy="14" r="1" fill="currentColor"/></svg>',
  orderedList: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 6h8M8 10h8M8 14h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4.3 7V4.5l-.8.4M3.5 9.2c.2-.3.6-.5 1-.5.7 0 1.1.4 1.1 1 0 .4-.3.8-.8 1.2l-1.2.9h2M3.6 13.2c.2-.2.5-.3.9-.3.7 0 1.1.3 1.1.8 0 .4-.3.7-.8.8.6.1 1 .4 1 .9 0 .6-.5 1-1.3 1-.4 0-.8-.1-1.1-.3" fill="none" stroke="currentColor" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  table: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 5h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM3.5 8.5h13M8 5v10M12.5 5v10" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/></svg>',
  code: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.4 6.6-3.2 3.4 3.2 3.4M12.6 6.6l3.2 3.4-3.2 3.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
}, ta = {
  left: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M4 8h8.5M4 11.5h12M4 15h8.5" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>',
  center: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M6.2 8h7.6M4 11.5h12M6.2 15h7.6" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>',
  right: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M7.5 8H16M4 11.5h12M7.5 15H16" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>'
}, na = {
  small: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6.2" y="6.2" width="7.6" height="7.6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.55"/><path d="M8 11.8 9.5 10l1.1 1.2 1.2-1.5 1.5 2.1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  medium: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4.8" y="4.8" width="10.4" height="10.4" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.55"/><path d="M6.8 12.8 9 10.5l1.4 1.5 1.7-2 2 2.8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  large: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="3.5" width="13" height="13" rx="1.7" fill="none" stroke="currentColor" stroke-width="1.55"/><path d="M5.8 13.7 8.7 11l1.8 1.8 2.2-2.6 2.5 3.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
}, jg = /(?:^|\s)nutbook-align=(left|center|right)(?=\s|$)/i, qg = /(?:^|\s)nutbook-size=(small|medium|large)(?=\s|$)/i;
function Ac(t = "") {
  var n;
  const e = String(t || "").match(jg);
  return ((n = e == null ? void 0 : e[1]) == null ? void 0 : n.toLowerCase()) || "";
}
function Oc(t = "") {
  var n;
  const e = String(t || "").match(qg);
  return ((n = e == null ? void 0 : e[1]) == null ? void 0 : n.toLowerCase()) || "large";
}
function Wg(t = "") {
  return String(t || "").replace(jg, " ").replace(qg, " ").replace(/\s+/g, " ").trim();
}
function ev(t = "", e = "") {
  const n = Wg(t), r = Oc(t), i = r !== "large" ? `nutbook-size=${r}` : "";
  return e ? [n, `nutbook-align=${e}`, i].filter(Boolean).join(" ") : n;
}
function tv(t = "", e = "large") {
  const n = Wg(t), r = Ac(t), i = e && e !== "large" ? `nutbook-size=${e}` : "";
  return [n, r ? `nutbook-align=${r}` : "", i].filter(Boolean).join(" ");
}
function nv(t) {
  if (!t) return "";
  const e = Ac(t.getAttribute("title") || ""), n = Oc(t.getAttribute("title") || "");
  return ["left", "center", "right"].forEach((r) => {
    t.classList.toggle(`nutbook-image-align-${r}`, e === r);
  }), ["small", "medium", "large"].forEach((r) => {
    t.classList.toggle(`nutbook-image-size-${r}`, n === r);
  }), t.dataset.nutbookImageAlign = e, t.dataset.nutbookImageSize = n, e;
}
function Kg(t) {
  const e = zs.get(t);
  e && (e.destroy(), zs.delete(t));
}
function qh(t) {
  return String(t || "").replace(/\s+/g, " ").trim();
}
function Dc(t) {
  var n, r;
  const e = t == null ? void 0 : t.$from;
  if (!e) return !1;
  for (let i = e.depth; i > 0; i -= 1) {
    const o = (r = (n = e.node(i)) == null ? void 0 : n.type) == null ? void 0 : r.name;
    if (o === "list_item" || o === "listItem") return !0;
  }
  return !1;
}
function rv(t) {
  var r;
  const { selection: e } = t;
  if (!(e != null && e.empty)) return !1;
  const { $from: n } = e;
  return !((r = n.parent) != null && r.isTextblock) || n.parentOffset !== 0 ? !1 : Dc(e);
}
function iv(t, e, n) {
  if (!rv(t)) return !1;
  const r = t.schema.nodes.list_item || t.schema.nodes.listItem;
  return r ? gm(r)(t, e, n) : !1;
}
function ov() {
  return new Ee({
    props: {
      handlePaste(t, e) {
        var o, s;
        const n = (o = e.clipboardData) == null ? void 0 : o.getData("text/plain"), r = ((s = e.clipboardData) == null ? void 0 : s.getData("text/html")) || "";
        return !n || !r || Dc(t.state.selection) || !(/<(ol|ul|li)\b/i.test(r) || /data-list-type=/i.test(r)) ? !1 : (e.preventDefault(), t.dispatch(t.state.tr.insertText(n).scrollIntoView()), !0);
      }
    }
  });
}
function Wh(t) {
  var n;
  const e = /* @__PURE__ */ new Set();
  return (n = t == null ? void 0 : t.descendants) == null || n.call(t, (r) => {
    var i, o;
    return ((i = r.type) == null ? void 0 : i.name) === "image" && ((o = r.attrs) != null && o.src) && e.add(String(r.attrs.src)), !0;
  }), e;
}
function sv(t) {
  return typeof t != "function" ? null : new Ee({
    view(e) {
      let n = Wh(e.state.doc), r = null;
      const i = () => {
        r = null;
        const s = Wh(e.state.doc);
        n.forEach((l) => {
          s.has(l) || queueMicrotask(() => t(l));
        }), n = s;
      }, o = () => {
        r && clearTimeout(r), r = window.setTimeout(i, 360);
      };
      return {
        update(s, l) {
          l.doc.eq(s.state.doc) || (e = s, o());
        },
        destroy() {
          r && (clearTimeout(r), r = null);
        }
      };
    }
  });
}
function lv(t) {
  const e = (r) => {
    const i = r.dataset.nutbookOriginalSrc || r.getAttribute("src") || "";
    if (typeof t == "function") {
      const o = t(i);
      o && o !== r.getAttribute("src") && (r.dataset.nutbookOriginalSrc = i, r.setAttribute("src", o));
    }
    nv(r);
  }, n = (r) => {
    r.querySelectorAll("img[src]").forEach(e);
  };
  return new Ee({
    view(r) {
      const i = new MutationObserver((s) => {
        s.forEach((l) => {
          l.addedNodes.forEach((a) => {
            var u, c;
            a.nodeType === Node.ELEMENT_NODE && ((u = a.matches) != null && u.call(a, "img[src]") && e(a), (c = a.querySelectorAll) == null || c.call(a, "img[src]").forEach(e));
          });
        });
      });
      i.observe(r.dom, { childList: !0, subtree: !0 });
      const o = requestAnimationFrame(() => n(r.dom));
      return {
        destroy() {
          i.disconnect(), cancelAnimationFrame(o);
        }
      };
    }
  });
}
async function av({ root: t, markdown: e = "", language: n = null, onChange: r = null, onEdit: i = null, tableToolsEnabled: o = !0, resolveImageSrc: s = null, onInsertImageAsset: l = null, onRemoveImageAsset: a = null }) {
  if (!t)
    throw new Error("Milkdown root is required");
  const u = window.NutbookI18n, c = (g) => {
    var b, C;
    return ((C = u == null ? void 0 : u.lookup) == null ? void 0 : C.call(u, g, n || ((b = u.currentLanguage) == null ? void 0 : b.call(u)))) ?? g;
  };
  Kg(t), t.innerHTML = "";
  let f = e, h = !1, d = !1, p = !1, m = null, k = null, y = !1, O = null, T = null, V = null, _ = !1, S = null, R = null, q = !1, U = !1, N = null, P = null, H = null, W = null, se = null, te = null, de = null, ye = e;
  const Ne = /* @__PURE__ */ new Map(), be = () => {
    h || i == null || i(), h = !0, q && Xe();
  }, w = [], Ge = (g) => {
    if (!(g.metaKey || g.ctrlKey) || g.altKey || g.key.toLowerCase() !== "z") return;
    const b = ie();
    !b || !(g.shiftKey ? zr : Ui)(b.state, b.dispatch, b) || (g.preventDefault(), g.stopPropagation(), b.focus(), Pe(), qe(), ke(), K());
  };
  t.addEventListener("keydown", Ge, !0);
  const Te = await zC.make().config((g) => {
    g.set(ps, t), g.set(cs, e), g.update(pn, (b) => [
      kp({
        "Mod-z": Ui,
        "Shift-Mod-z": zr,
        "Mod-y": zr,
        Backspace: iv
      }),
      ov(),
      sv(a),
      lv(s),
      ...b
    ].filter(Boolean)), g.update(qa, (b) => b.updated(() => {
      p && (d = !0, bn());
    }));
  }).use(mS).use(gT).use(TT).use(Hg).create(), x = () => Te.action((g) => {
    const b = g.get(nt);
    return f = g.get(Ki)(b.state.doc), f;
  }), Ye = x();
  ye = Ye, queueMicrotask(() => {
    p = !0, oy(), cy(), he(), Yg(), I(), Pe(), qe(), ke(), K();
  });
  function ie() {
    return Te.action((g) => g.get(nt));
  }
  function Ce() {
    if (de = null, !p) return;
    const g = ie();
    if (g != null && g.composing) {
      bn(180);
      return;
    }
    const b = x();
    h || (i == null || i(), h = !0), b !== ye && (ye = b, r == null || r(b));
  }
  function bn(g = 260) {
    p && (de && clearTimeout(de), de = window.setTimeout(Ce, g));
  }
  function Lt(g) {
    var D, L, $;
    if (!g || !ve(g.state)) return null;
    const { from: b } = g.state.selection, C = g.domAtPos(b), v = ((D = C.node) == null ? void 0 : D.nodeType) === Node.ELEMENT_NODE ? C.node : (L = C.node) == null ? void 0 : L.parentElement;
    return (($ = v == null ? void 0 : v.closest) == null ? void 0 : $.call(v, "table")) || null;
  }
  function gt(g) {
    const b = ie();
    if (!b) return !1;
    const C = g(b.state, b.dispatch, b);
    return C && (be(), b.focus(), Pe(), qe(), ke()), C;
  }
  function He(g) {
    var v, D, L;
    const b = g == null ? void 0 : g.state.selection;
    if (!g || !(b != null && b.empty) || ve(g.state) || Dc(b)) return null;
    const { $from: C } = b;
    return !((v = C.parent) != null && v.isTextblock) || ((D = C.parent.type) == null ? void 0 : D.name) !== "paragraph" || ((L = C.parent.content) == null ? void 0 : L.size) > 0 || C.parent.textContent.trim() ? null : {
      from: b.from,
      blockStart: C.before(C.depth),
      blockEnd: C.after(C.depth)
    };
  }
  function Mr(g) {
    var C, v, D, L;
    const b = He(g);
    if (!g || !b) return null;
    try {
      const $ = g.nodeDOM(b.blockStart);
      if (($ == null ? void 0 : $.nodeType) === Node.ELEMENT_NODE && ((C = $.matches) != null && C.call($, "p")))
        return $;
      const Y = g.domAtPos(b.from), le = ((v = Y.node) == null ? void 0 : v.nodeType) === Node.ELEMENT_NODE ? Y.node : (D = Y.node) == null ? void 0 : D.parentElement;
      return ((L = le == null ? void 0 : le.closest) == null ? void 0 : L.call(le, "p")) || null;
    } catch {
      return null;
    }
  }
  function Nr(g) {
    if (!g || !N) return !1;
    const b = Math.max(1, Math.min(N.from, g.state.doc.content.size));
    try {
      return g.dispatch(g.state.tr.setSelection(Z.create(g.state.doc, b))), !0;
    } catch {
      return !1;
    }
  }
  function Si(g, b = null) {
    const C = ie();
    if (!C) return !1;
    Nr(C);
    const v = He(C);
    if (!v) return !1;
    const D = C.state.tr.replaceWith(v.blockStart, v.blockEnd, g), L = Number.isFinite(b) ? v.blockStart + b : v.blockStart + g.nodeSize, $ = Math.max(1, Math.min(L, D.doc.content.size));
    return D.setSelection(Z.near(D.doc.resolve($), Number.isFinite(b) ? 1 : -1)), C.dispatch(D.scrollIntoView()), be(), C.focus(), Xe(), Pe(), qe(), K(), !0;
  }
  function Tr(g) {
    const b = ie();
    if (!b) return !1;
    Nr(b);
    const C = b.state.schema.nodes.heading;
    return !C || !He(b) ? !1 : (Xe(), gt(un(C, { level: g })));
  }
  function _o() {
    const g = ie();
    if (!g) return !1;
    Nr(g);
    const b = g.state.schema.nodes.code_block;
    return !b || !He(g) ? !1 : (Xe(), gt(un(b, { language: "" })));
  }
  function Vo() {
    const g = ie(), b = g == null ? void 0 : g.state.schema.nodes, C = (b == null ? void 0 : b.bullet_list) || (b == null ? void 0 : b.bulletList), v = (b == null ? void 0 : b.list_item) || (b == null ? void 0 : b.listItem), D = b == null ? void 0 : b.paragraph;
    if (!g || !C || !v || !D) return !1;
    const L = C.create(null, [
      v.create(null, D.create())
    ]);
    return Si(L, 3);
  }
  function Ho() {
    const g = ie(), b = g == null ? void 0 : g.state.schema.nodes, C = (b == null ? void 0 : b.ordered_list) || (b == null ? void 0 : b.orderedList), v = (b == null ? void 0 : b.list_item) || (b == null ? void 0 : b.listItem), D = b == null ? void 0 : b.paragraph;
    if (!g || !C || !v || !D) return !1;
    const L = C.create({ order: 1 }, [
      v.create(null, D.create())
    ]);
    return Si(L, 3);
  }
  function Zs() {
    const g = ie(), b = g == null ? void 0 : g.state.schema.nodes, C = b == null ? void 0 : b.table, v = (b == null ? void 0 : b.table_row) || (b == null ? void 0 : b.tableRow), D = (b == null ? void 0 : b.table_cell) || (b == null ? void 0 : b.tableCell), L = (b == null ? void 0 : b.table_header_row) || (b == null ? void 0 : b.tableHeaderRow), $ = (b == null ? void 0 : b.table_header) || (b == null ? void 0 : b.tableHeader);
    if (!g || !C || !v || !D || !L || !$) return !1;
    Nr(g);
    const Y = He(g);
    if (!Y) return !1;
    const le = (Pt) => {
      var Gt;
      return ((Gt = Pt.createAndFill) == null ? void 0 : Gt.call(Pt)) || Pt.create();
    }, Se = (Pt) => [0, 1, 2].map(() => le(Pt)), kt = C.create(null, [
      L.create(null, Se($)),
      v.create(null, Se(D)),
      v.create(null, Se(D))
    ]), Ae = g.state.tr.replaceWith(Y.blockStart, Y.blockEnd, kt), Cn = ee.findFrom(Ae.doc.resolve(Y.blockStart), 1, !0);
    return Cn && Ae.setSelection(Cn), g.dispatch(Ae.scrollIntoView()), be(), g.focus(), Xe(), Pe(), qe(), K(), !0;
  }
  function jo(g = "") {
    return (String(g || "").split(/[\\/]/).pop() || "image").replace(/\.[^.]+$/, "") || "image";
  }
  function qo(g, b = "") {
    const C = ie(), v = C == null ? void 0 : C.state.schema.nodes.image, D = C == null ? void 0 : C.state.schema.nodes.paragraph;
    if (!C || !v || !D || !g) return !1;
    const L = v.create({
      src: g,
      alt: jo(b || g),
      title: ""
    });
    return Si(D.create(null, [L]));
  }
  async function el() {
    if (typeof l != "function") return !1;
    const g = ie();
    if (!g || !He(g)) return !1;
    N = { from: g.state.selection.from }, ut({ preserveSelection: !0 });
    let b = null;
    try {
      b = await l();
    } catch (C) {
      console.warn("Markdown image insert failed", C);
    }
    return b != null && b.relativePath ? qo(b.relativePath, b.fileName) : (N = null, ke(), !1);
  }
  function tl(g) {
    return g === "image" ? (el(), !0) : g === "h1" ? Tr(1) : g === "h2" ? Tr(2) : g === "h3" ? Tr(3) : g === "h4" ? Tr(4) : g === "bullet-list" ? Vo() : g === "ordered-list" ? Ho() : g === "table" ? Zs() : g === "code-block" ? _o() : !1;
  }
  function nl(g) {
    if (!g) return [];
    const b = [];
    return g.state.doc.descendants((C, v) => {
      var D;
      return ((D = C.type) == null ? void 0 : D.name) === "code_block" && b.push({ node: C, pos: v }), !0;
    }), b;
  }
  function rl(g, b) {
    var $;
    const C = ie();
    if (!C) return !1;
    const v = C.state.doc.nodeAt(g);
    if (!v || (($ = v.type) == null ? void 0 : $.name) !== "code_block") return !1;
    const D = String(b || "").trim(), L = C.state.tr.setNodeAttribute(g, "language", D);
    return C.dispatch(L), be(), C.focus(), K(), !0;
  }
  function il(g, b) {
    var D;
    const C = document.createElement("select");
    C.className = "markdown-code-language-select", C.setAttribute("aria-label", c("markdown.codeLanguage"));
    const v = ((D = b.node.attrs) == null ? void 0 : D.language) || "";
    return C.innerHTML = jh(v).map((L) => `<option value="${ts(L.value)}">${ts(L.label)}</option>`).join(""), C.value = v, C.addEventListener("mousedown", (L) => {
      L.stopPropagation();
    }), C.addEventListener("click", (L) => {
      L.stopPropagation();
    }), C.addEventListener("change", (L) => {
      L.preventDefault(), L.stopPropagation(), rl(Number(C.dataset.codeBlockPos), L.target.value);
    }), se.appendChild(C), Ne.set(g, C), C;
  }
  function I() {
    se || (se = document.createElement("div"), se.className = "markdown-code-language-layer", t.appendChild(se), ["keyup", "mouseup", "focusin", "pointerup"].forEach((g) => {
      t.addEventListener(g, K, !0);
    }), window.addEventListener("scroll", K, !0), window.addEventListener("resize", K));
  }
  function B() {
    if (te = null, !se || !p) return;
    const g = ie(), b = t.querySelector(".ProseMirror");
    if (!g || !b) return;
    const C = t.getBoundingClientRect(), v = Array.from(b.querySelectorAll("pre")), D = nl(g);
    Ne.forEach((L, $) => {
      v.includes($) || (L.remove(), Ne.delete($));
    }), v.forEach((L, $) => {
      var Gt;
      const Y = D[$];
      if (!Y) return;
      const le = Ne.get(L) || il(L, Y);
      le.dataset.codeBlockPos = String(Y.pos);
      const Se = ((Gt = Y.node.attrs) == null ? void 0 : Gt.language) || "";
      [...le.options].some((Ni) => Ni.value === Se) || (le.innerHTML = jh(Se).map((Ni) => `<option value="${ts(Ni.value)}">${ts(Ni.label)}</option>`).join("")), le.value = Se;
      const kt = L.getBoundingClientRect(), Ae = kt.bottom > C.top && kt.top < C.bottom && L.offsetParent !== null;
      if (le.style.display = Ae ? "inline-flex" : "none", !Ae) return;
      const Cn = Math.max(8, kt.left - C.left + 16), Pt = Math.max(8, kt.top - C.top + 10);
      le.style.left = `${Math.round(Cn)}px`, le.style.top = `${Math.round(Pt)}px`;
    });
  }
  function K() {
    se && (te && cancelAnimationFrame(te), te = requestAnimationFrame(B));
  }
  function ne() {
    var C;
    const g = document.createElement("div");
    g.className = "markdown-insert-menu", g.setAttribute("aria-label", c("markdown.insertMenu"));
    const b = [
      { command: "image", icon: Qt.image, label: c("markdown.insertImage") },
      { command: "h1", icon: Qt.h1, label: c("markdown.insertHeading1") },
      { command: "h2", icon: Qt.h2, label: c("markdown.insertHeading2") },
      { command: "h3", icon: Qt.h3, label: c("markdown.insertHeading3") },
      { command: "h4", icon: Qt.h4, label: c("markdown.insertHeading4") },
      { command: "bullet-list", icon: Qt.list, label: c("markdown.insertBulletList") },
      { command: "ordered-list", icon: Qt.orderedList, label: c("markdown.insertOrderedList") },
      { command: "table", icon: Qt.table, label: c("markdown.insertTable") },
      { command: "code-block", icon: Qt.code, label: c("markdown.insertCodeBlock") }
    ];
    return g.innerHTML = `
      <button class="markdown-insert-trigger" type="button" aria-label="${c("markdown.openInsertMenu")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.5v11M4.5 10h11" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
      </button>
      <div class="markdown-insert-popover" role="menu" aria-hidden="true">
        ${b.map((v) => `
          <button type="button" role="menuitem" data-insert-command="${v.command}" aria-label="${v.label}">
            ${v.icon}
            <span class="markdown-insert-tooltip">${v.label}</span>
          </button>
        `).join("")}
      </div>
    `, g.addEventListener("pointerdown", (v) => {
      v.preventDefault(), v.stopPropagation();
    }), (C = g.querySelector(".markdown-insert-trigger")) == null || C.addEventListener("pointerdown", (v) => {
      var L;
      v.preventDefault(), v.stopPropagation();
      const D = ie();
      !D || !He(D) || (N = { from: D.state.selection.from }, U = !U, g.classList.toggle("open", U), (L = g.querySelector(".markdown-insert-popover")) == null || L.setAttribute("aria-hidden", U ? "false" : "true"), ke());
    }), g.addEventListener("pointerdown", (v) => {
      const D = v.target.closest("button[data-insert-command]");
      D && (v.preventDefault(), v.stopPropagation(), tl(D.dataset.insertCommand));
    }), g;
  }
  function he() {
    S || (S = ne(), t.appendChild(S), ["keyup", "mouseup", "focusin", "pointerup"].forEach((g) => {
      t.addEventListener(g, ke, !0);
    }), t.addEventListener("keydown", Qe, !0), t.addEventListener("pointerdown", zt, !0), window.addEventListener("scroll", ke, !0), window.addEventListener("resize", ke), t.addEventListener("focusout", wn, !0));
  }
  function Qe(g) {
    g.key !== "Enter" || g.isComposing || (window.setTimeout(ke, 0), window.setTimeout(ke, 80));
  }
  function zt(g) {
    !U || S != null && S.contains(g.target) || ut();
  }
  function ut({ preserveSelection: g = !1 } = {}) {
    var b;
    U = !1, g || (N = null), S == null || S.classList.remove("open"), (b = S == null ? void 0 : S.querySelector(".markdown-insert-popover")) == null || b.setAttribute("aria-hidden", "true");
  }
  function Xe() {
    S && (ut(), S.classList.remove("visible"), q = !1);
  }
  function wn() {
    window.setTimeout(() => {
      const g = document.activeElement;
      !t.contains(g) && !(S != null && S.contains(g)) && Xe();
    }, 0);
  }
  function je() {
    var le;
    if (R = null, !S || !p) return;
    const g = ie(), b = He(g);
    if (!g || !b || !t.contains(g.dom)) {
      Xe();
      return;
    }
    let C = null;
    try {
      C = g.coordsAtPos(g.state.selection.from);
    } catch {
      Xe();
      return;
    }
    const v = t.getBoundingClientRect(), D = (le = Mr(g)) == null ? void 0 : le.getBoundingClientRect(), $ = ((D == null ? void 0 : D.left) ?? C.left) - v.left - 34, Y = Math.max(4, C.top - v.top + (C.bottom - C.top) / 2 - 13);
    S.style.left = `${Math.round($)}px`, S.style.top = `${Math.round(Y)}px`, q || (S.classList.add("visible"), q = !0);
  }
  function ke() {
    S && (R && cancelAnimationFrame(R), R = requestAnimationFrame(je));
  }
  function yt(g, b = ie()) {
    if (!g || !b) return null;
    let C = null;
    return b.state.doc.descendants((v, D) => {
      var $, Y;
      if (C || (($ = v.type) == null ? void 0 : $.name) !== "image") return !C;
      const L = b.nodeDOM(D);
      return L === g || (Y = L == null ? void 0 : L.contains) != null && Y.call(L, g) ? (C = { element: g, node: v, pos: D }, !1) : !0;
    }), C;
  }
  function Ug(g) {
    var L, $;
    const b = ie();
    if (!b || !W) return !1;
    const C = b.state.doc.nodeAt(W.pos);
    if (!C || ((L = C.type) == null ? void 0 : L.name) !== "image") return !1;
    const v = {
      ...C.attrs,
      title: ev((($ = C.attrs) == null ? void 0 : $.title) || "", g)
    }, D = b.state.tr.setNodeMarkup(W.pos, null, v);
    return b.dispatch(D.scrollIntoView()), be(), W.node = b.state.doc.nodeAt(W.pos), b.focus(), xn(), !0;
  }
  function Jg(g) {
    var L, $;
    const b = ie();
    if (!b || !W) return !1;
    const C = b.state.doc.nodeAt(W.pos);
    if (!C || ((L = C.type) == null ? void 0 : L.name) !== "image") return !1;
    const v = {
      ...C.attrs,
      title: tv((($ = C.attrs) == null ? void 0 : $.title) || "", g)
    }, D = b.state.tr.setNodeMarkup(W.pos, null, v);
    return b.dispatch(D.scrollIntoView()), be(), W.node = b.state.doc.nodeAt(W.pos), b.focus(), xn(), !0;
  }
  function Gg() {
    const g = document.createElement("div");
    g.className = "markdown-image-align-toolbar", g.setAttribute("aria-label", c("markdown.imageAlignTools"));
    const b = [
      { type: "align", value: "left", icon: ta.left, label: c("markdown.alignLeft") },
      { type: "align", value: "center", icon: ta.center, label: c("markdown.alignCenter") },
      { type: "align", value: "right", icon: ta.right, label: c("markdown.alignRight") },
      { type: "size", value: "small", icon: na.small, label: c("markdown.imageSizeSmall") },
      { type: "size", value: "medium", icon: na.medium, label: c("markdown.imageSizeMedium") },
      { type: "size", value: "large", icon: na.large, label: c("markdown.imageSizeLarge") }
    ];
    return g.innerHTML = b.map((C) => `
      <button type="button" data-image-${C.type}="${C.value}" aria-label="${C.label}">
        ${C.icon}
        <span class="markdown-image-align-tooltip">${C.label}</span>
      </button>
    `).join(""), g.addEventListener("pointerdown", (C) => {
      const v = C.target.closest("button[data-image-align], button[data-image-size]");
      v && (C.preventDefault(), C.stopPropagation(), v.dataset.imageAlign ? Ug(v.dataset.imageAlign) : Jg(v.dataset.imageSize || "large"));
    }), g.addEventListener("pointerenter", () => {
      xn();
    }), g.addEventListener("pointerleave", () => {
      window.setTimeout(() => {
        var C, v;
        !(P != null && P.matches(":hover")) && !((v = (C = W == null ? void 0 : W.element) == null ? void 0 : C.matches) != null && v.call(C, ":hover")) && Wo();
      }, 120);
    }), g;
  }
  function Yg() {
    P || (P = Gg(), t.appendChild(P), t.addEventListener("pointerover", Rc, !0), t.addEventListener("pointerout", Lc, !0), window.addEventListener("scroll", xn, !0), window.addEventListener("resize", xn));
  }
  function Rc(g) {
    var v, D;
    const b = (D = (v = g.target) == null ? void 0 : v.closest) == null ? void 0 : D.call(v, ".milkdown-editor-root .ProseMirror img");
    if (!b || !t.contains(b)) return;
    const C = yt(b);
    C && (W = C, xn());
  }
  function Lc(g) {
    if (!(W != null && W.element)) return;
    const b = g.relatedTarget;
    b && (W.element.contains(b) || P != null && P.contains(b)) || window.setTimeout(() => {
      var C, v;
      !(P != null && P.matches(":hover")) && !((v = (C = W == null ? void 0 : W.element) == null ? void 0 : C.matches) != null && v.call(C, ":hover")) && Wo();
    }, 120);
  }
  function Wo() {
    P && (P.classList.remove("visible"), W = null);
  }
  function Qg() {
    var kt;
    if (H = null, !P || !(W != null && W.element) || !t.contains(W.element)) {
      Wo();
      return;
    }
    const g = ie(), b = yt(W.element, g);
    if (!b) {
      Wo();
      return;
    }
    W = b;
    const C = ((kt = W.node.attrs) == null ? void 0 : kt.title) || "", v = Ac(C), D = Oc(C);
    P.querySelectorAll("button[data-image-align]").forEach((Ae) => {
      Ae.classList.toggle("active", Ae.dataset.imageAlign === v);
    }), P.querySelectorAll("button[data-image-size]").forEach((Ae) => {
      Ae.classList.toggle("active", Ae.dataset.imageSize === D);
    });
    const L = t.getBoundingClientRect(), $ = W.element.getBoundingClientRect(), Y = P.offsetWidth || 108, le = Math.max(8, Math.min($.left - L.left + $.width / 2 - Y / 2, L.width - Y - 8)), Se = Math.max(4, $.top - L.top + 8);
    P.style.left = `${Math.round(le)}px`, P.style.top = `${Math.round(Se)}px`, P.classList.add("visible");
  }
  function xn() {
    P && (H && cancelAnimationFrame(H), H = requestAnimationFrame(Qg));
  }
  function Xg(g) {
    const b = ie(), C = b == null ? void 0 : b.state.schema.marks[g];
    return C ? gt(No(C)) : !1;
  }
  function Ko() {
    var g;
    m && ((g = m.querySelector(".markdown-format-link-popover")) == null || g.classList.remove("open"), O = null);
  }
  function Zg() {
    const g = ie(), b = g == null ? void 0 : g.state.selection;
    if (!m || !g || !b || b.empty) return !1;
    O = { from: b.from, to: b.to };
    const C = m.querySelector(".markdown-format-link-popover"), v = m.querySelector("[data-format-link-input]");
    return !C || !v ? !1 : (C.classList.add("open"), v.value = "", window.setTimeout(() => v.focus(), 0), !0);
  }
  function zc(g) {
    const b = String(g || "").trim();
    if (!b) return !1;
    const C = ie(), v = C == null ? void 0 : C.state.schema.marks.link;
    if (!C || !v || !O) return !1;
    const D = Math.max(0, Math.min(O.from, C.state.doc.content.size)), L = Math.max(D, Math.min(O.to, C.state.doc.content.size)), $ = C.state.tr.setSelection(Z.create(C.state.doc, D, L)).addMark(D, L, v.create({ href: b }));
    return C.dispatch($.scrollIntoView()), be(), C.focus(), Ko(), Pe(), qe(), !0;
  }
  function ey() {
    const g = ie(), b = g == null ? void 0 : g.state.schema.marks.link, C = g == null ? void 0 : g.state.selection;
    if (!g || !b || !C || C.empty) return !1;
    const v = g.state.tr.removeMark(C.from, C.to, b);
    return g.dispatch(v.scrollIntoView()), be(), g.focus(), Ko(), Pe(), qe(), !0;
  }
  function ty(g) {
    const b = ie();
    if (!b) return !1;
    const { nodes: C } = b.state.schema;
    if (g === "paragraph")
      return C.paragraph ? gt(un(C.paragraph)) : !1;
    const v = Number(String(g || "").replace("h", ""));
    return !C.heading || !Number.isFinite(v) ? !1 : gt(un(C.heading, { level: v }));
  }
  function ny(g, b) {
    const C = g == null ? void 0 : g.state.schema.marks[b];
    if (!g || !C) return !1;
    const { from: v, to: D, empty: L, $from: $ } = g.state.selection;
    return L ? !!C.isInSet(g.state.storedMarks || $.marks()) : g.state.doc.rangeHasMark(v, D, C);
  }
  function ry(g) {
    var C;
    if (!g) return "paragraph";
    const { $from: b } = g.state.selection;
    for (let v = b.depth; v > 0; v -= 1) {
      const D = b.node(v);
      if (D.type.name === "heading")
        return `h${((C = D.attrs) == null ? void 0 : C.level) || 1}`;
      if (D.type.name === "paragraph")
        return "paragraph";
    }
    return "paragraph";
  }
  function iy() {
    var v, D, L;
    const g = document.createElement("div");
    g.className = "markdown-format-toolbar", g.setAttribute("aria-label", c("markdown.formatTools")), g.innerHTML = `
      <label class="markdown-format-heading-wrap">
        <select class="markdown-format-heading" aria-label="${c("markdown.headingLevel")}">
          <option value="paragraph">正文</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
          <option value="h4">H4</option>
        </select>
        <svg class="markdown-format-heading-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.2 4.5 6 7.3l2.8-2.8" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </label>
      <button type="button" data-format-command="bold" aria-label="${c("markdown.bold")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4h4.3c2 0 3.2 1 3.2 2.6 0 1.1-.6 1.9-1.5 2.2 1.3.3 2.1 1.3 2.1 2.7 0 1.9-1.4 3.2-3.6 3.2H6V4Zm2.2 4h1.9c.8 0 1.2-.4 1.2-1.1 0-.7-.5-1.1-1.3-1.1H8.2V8Zm0 5h2.1c.9 0 1.5-.5 1.5-1.3 0-.9-.6-1.3-1.6-1.3h-2V13Z" fill="currentColor"/></svg>
        <span class="markdown-format-tooltip">⌘B</span>
      </button>
      <button type="button" data-format-command="italic" aria-label="${c("markdown.italic")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M9.1 4h6l-.3 1.7h-1.9l-1.8 8.6H13L12.7 16h-6l.3-1.7h1.9l1.8-8.6H8.8L9.1 4Z" fill="currentColor"/></svg>
        <span class="markdown-format-tooltip">⌘I</span>
      </button>
      <button type="button" data-format-command="code" aria-label="${c("markdown.inlineCode")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.2 6.4-3.3 3.5 3.3 3.5M12.8 6.4l3.3 3.5-3.3 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="markdown-format-tooltip">⌘E</span>
      </button>
      <button type="button" data-format-command="strike" aria-label="${c("markdown.strike")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10M7.1 13.3c.6 1 1.7 1.6 3.1 1.6 1.8 0 3-.9 3-2.2 0-1.1-.7-1.8-2.3-2.2l-1.8-.5C7.5 9.6 6.7 8.8 6.7 7.5c0-1.6 1.4-2.7 3.3-2.7 1.5 0 2.6.6 3.2 1.7" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>
        <span class="markdown-format-tooltip">⌥⌘X</span>
      </button>
      <button type="button" data-format-command="link" aria-label="${c("markdown.addLink")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.2 6.7 9.4 5.5a3.3 3.3 0 0 1 4.7 4.7l-1.6 1.6a3.3 3.3 0 0 1-4.5.2M11.8 13.3l-1.2 1.2a3.3 3.3 0 0 1-4.7-4.7l1.6-1.6a3.3 3.3 0 0 1 4.5-.2" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="markdown-format-tooltip">${c("markdown.linkTooltip")}</span>
      </button>
      <div class="markdown-format-link-popover" aria-hidden="true">
        <input data-format-link-input type="text" placeholder="粘贴链接或文件路径" />
        <button type="button" data-format-link-apply>确认</button>
      </div>
    `;
    const b = {
      bold: "strong",
      italic: "emphasis",
      code: "inlineCode",
      strike: "strike_through"
    };
    g.addEventListener("mousedown", ($) => {
      $.target.closest("select") || $.target.closest("input") || $.preventDefault();
    }), g.addEventListener("click", ($) => {
      const Y = $.target.closest("button[data-format-command]");
      if (!(!Y || Y.getAttribute("aria-disabled") === "true")) {
        if ($.preventDefault(), $.stopPropagation(), Y.dataset.formatCommand === "link") {
          if (Y.classList.contains("active")) {
            ey();
            return;
          }
          Zg();
          return;
        }
        Xg(b[Y.dataset.formatCommand]);
      }
    }), (v = g.querySelector("[data-format-link-apply]")) == null || v.addEventListener("click", ($) => {
      $.preventDefault(), $.stopPropagation();
      const Y = g.querySelector("[data-format-link-input]");
      zc(Y == null ? void 0 : Y.value);
    }), (D = g.querySelector("[data-format-link-input]")) == null || D.addEventListener("keydown", ($) => {
      var Y;
      $.key === "Enter" && ($.preventDefault(), $.stopPropagation(), zc($.currentTarget.value)), $.key === "Escape" && ($.preventDefault(), $.stopPropagation(), Ko(), (Y = ie()) == null || Y.focus());
    });
    const C = g.querySelector("[data-format-link-input]");
    return [
      "beforeinput",
      "input",
      "paste",
      "copy",
      "cut",
      "compositionstart",
      "compositionupdate",
      "compositionend",
      "keyup",
      "pointerdown",
      "mousedown",
      "mouseup",
      "click"
    ].forEach(($) => {
      C == null || C.addEventListener($, (Y) => Y.stopPropagation());
    }), (L = g.querySelector("select")) == null || L.addEventListener("change", ($) => {
      ty($.target.value);
    }), g;
  }
  function oy() {
    m || (m = iy(), t.appendChild(m), ["keyup", "mouseup", "focusin", "pointerup"].forEach((g) => {
      t.addEventListener(g, Pe, !0);
    }), document.addEventListener("selectionchange", Pe), window.addEventListener("scroll", Pe, !0), window.addEventListener("resize", Pe), t.addEventListener("focusout", Pc, !0));
  }
  function Mi() {
    m && (Ko(), m.classList.remove("visible"), y = !1);
  }
  function Pc() {
    window.setTimeout(() => {
      const g = document.activeElement;
      !t.contains(g) && !(m != null && m.contains(g)) && Mi();
    }, 0);
  }
  function sy(g) {
    if (!m || !g) return;
    Object.entries({
      bold: "strong",
      italic: "emphasis",
      code: "inlineCode",
      strike: "strike_through",
      link: "link"
    }).forEach(([$, Y]) => {
      const le = m.querySelector(`[data-format-command="${$}"]`);
      if (!le) return;
      const Se = !!g.state.schema.marks[Y];
      le.classList.toggle("active", Se && ny(g, Y)), le.setAttribute("aria-disabled", Se ? "false" : "true");
    });
    const C = m.querySelector('[data-format-command="link"]'), v = C == null ? void 0 : C.querySelector(".markdown-format-tooltip"), D = !!(C != null && C.classList.contains("active"));
    C == null || C.setAttribute("aria-label", c(D ? "markdown.removeLink" : "markdown.addLink")), v && (v.textContent = c(D ? "actions.remove" : "markdown.linkTooltip"));
    const L = m.querySelector("select");
    L && (L.value = ry(g));
  }
  function ly() {
    if (k = null, !m || !p) return;
    const g = ie(), b = g == null ? void 0 : g.state.selection;
    if (!g || !b || b.empty || !t.contains(g.dom)) {
      Mi();
      return;
    }
    if (ve(g.state)) {
      Mi();
      return;
    }
    if (!g.state.doc.textBetween(b.from, b.to, " ").trim()) {
      Mi();
      return;
    }
    sy(g);
    const v = t.getBoundingClientRect();
    let D = null, L = null;
    try {
      D = g.coordsAtPos(b.from), L = g.coordsAtPos(b.to);
    } catch {
      Mi();
      return;
    }
    const $ = m.offsetWidth || 248, Y = m.offsetHeight || 38, le = Math.min(D.left, L.left), Se = Math.max(D.right || D.left, L.right || L.left), kt = Math.min(D.top, L.top), Ae = Math.max(D.bottom || D.top, L.bottom || L.top), Cn = (le + Se) / 2, Pt = Math.max(8, Math.min(Cn - v.left - $ / 2, v.width - $ - 8));
    let Gt = kt - v.top - Y - 10;
    Gt < 8 && (Gt = Ae - v.top + 10), m.style.left = `${Math.round(Pt)}px`, m.style.top = `${Math.round(Gt)}px`, y || (m.classList.add("visible"), y = !0);
  }
  function Pe() {
    m && (k && cancelAnimationFrame(k), k = requestAnimationFrame(ly));
  }
  function ay(g) {
    if (!o) return !1;
    const b = ie();
    if (!b || !ve(b.state)) return !1;
    const C = g(b.state, b.dispatch, b);
    return C && (be(), b.focus(), qe()), C;
  }
  function uy() {
    const g = document.createElement("div");
    g.className = "markdown-table-toolbar", g.setAttribute("aria-label", c("markdown.tableTools"));
    const b = {
      "row-before": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5h12M4 9.5h12M4 13.5h12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M10 2.8v4.1M7.9 4.8 10 2.7l2.1 2.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "row-after": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5h12M4 9.5h12M4 13.5h12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M10 17.2v-4.1M7.9 15.2l2.1 2.1 2.1-2.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "column-before": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 4v12M9.5 4v12M13.5 4v12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M2.8 10h4.1M4.8 7.9 2.7 10l2.1 2.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "column-after": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 4v12M9.5 4v12M13.5 4v12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M17.2 10h-4.1M15.2 7.9l2.1 2.1-2.1 2.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "delete-row": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M4 10h12M4 14h12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="m7.7 7.7 4.6 4.6m0-4.6-4.6 4.6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>',
      "delete-column": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4v12M10 4v12M14 4v12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="m7.7 7.7 4.6 4.6m0-4.6-4.6 4.6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>'
    }, C = {
      "row-before": "上方插行",
      "row-after": "下方插行",
      "column-before": "左侧插列",
      "column-after": "右侧插列",
      "delete-row": "删除行",
      "delete-column": "删除列"
    };
    g.innerHTML = `
      ${Object.keys(C).map((D) => `
        <button type="button" data-table-command="${D}" aria-label="${C[D]}">
          ${b[D]}
          <span class="markdown-table-tooltip">${C[D]}</span>
        </button>
      `).join("")}
    `;
    const v = {
      "row-before": VS,
      "row-after": HS,
      "column-before": Um,
      "column-after": Jm,
      "delete-row": Qm,
      "delete-column": Gm
    };
    return g.addEventListener("mousedown", (D) => {
      D.preventDefault();
    }), g.addEventListener("click", (D) => {
      const L = D.target.closest("button[data-table-command]");
      L && (D.preventDefault(), D.stopPropagation(), ay(v[L.dataset.tableCommand]));
    }), g;
  }
  function cy() {
    !o || T || (T = uy(), t.appendChild(T), ["keyup", "mouseup", "focusin", "pointerup"].forEach((g) => {
      t.addEventListener(g, qe, !0);
    }), window.addEventListener("scroll", qe, !0), window.addEventListener("resize", qe));
  }
  function fy() {
    T && (T.classList.remove("visible"), _ = !1);
  }
  function hy() {
    if (V = null, !T || !o || !p) return;
    const g = ie(), b = Lt(g);
    if (!b) {
      fy();
      return;
    }
    const C = t.getBoundingClientRect();
    let v = null;
    try {
      v = g.coordsAtPos(g.state.selection.from);
    } catch {
      v = b.getBoundingClientRect();
    }
    const D = T.offsetWidth || 224, L = T.offsetHeight || 38, $ = ((v.left || 0) + (v.right || v.left || 0)) / 2, Y = Math.max(6, Math.min($ - C.left - D / 2, C.width - D - 6));
    let le = (v.top || 0) - C.top - L - 10;
    le < 6 && (le = (v.bottom || v.top || 0) - C.top + 10), T.style.left = `${Math.round(Y)}px`, T.style.top = `${Math.round(le)}px`, _ || (T.classList.add("visible"), _ = !0);
  }
  function qe() {
    !o || !T || (V && cancelAnimationFrame(V), V = requestAnimationFrame(hy));
  }
  function Bc(g) {
    return Te.action((b) => {
      const C = b.get(nt), v = g(C.state, C.dispatch, C);
      return v && (C.focus(), Pe(), qe(), ke(), K()), v;
    });
  }
  const ol = {
    editor: Te,
    getMarkdown() {
      return de && (clearTimeout(de), de = null), x();
    },
    getBaselineMarkdown() {
      return Ye;
    },
    hasChanges() {
      return d || h;
    },
    undo() {
      return Bc(Ui);
    },
    redo() {
      return Bc(zr);
    },
    focus() {
      Te.action((g) => {
        g.get(nt).focus();
      });
    },
    blur() {
      Te.action((g) => {
        g.get(nt).dom.blur();
      });
    },
    focusAtText(g, b = 0) {
      const C = qh(g);
      return C ? Te.action((v) => {
        const D = v.get(nt);
        let L = null;
        return D.state.doc.descendants(($, Y) => {
          if (!$.isText || L !== null) return !1;
          const le = $.text || "", Se = qh(le);
          if (Se.indexOf(C) < 0 && !C.includes(Se)) return !0;
          const Ae = le.indexOf(g), Cn = Ae >= 0 ? Ae : 0;
          return L = Math.max(Y + 1, Math.min(Y + le.length, Y + 1 + Cn + Math.max(0, b))), !1;
        }), L === null ? (D.focus(), !1) : (D.dispatch(D.state.tr.setSelection(Z.create(D.state.doc, L)).scrollIntoView()), D.focus(), !0);
      }) : (ol.focus(), !1);
    },
    destroy() {
      de && (clearTimeout(de), de = null), k && (cancelAnimationFrame(k), k = null), m && (["keyup", "mouseup", "focusin", "pointerup"].forEach((g) => {
        t.removeEventListener(g, Pe, !0);
      }), document.removeEventListener("selectionchange", Pe), window.removeEventListener("scroll", Pe, !0), window.removeEventListener("resize", Pe), t.removeEventListener("focusout", Pc, !0), m.remove(), m = null), te && (cancelAnimationFrame(te), te = null), se && (["keyup", "mouseup", "focusin", "pointerup"].forEach((g) => {
        t.removeEventListener(g, K, !0);
      }), window.removeEventListener("scroll", K, !0), window.removeEventListener("resize", K), Ne.forEach((g) => g.remove()), Ne.clear(), se.remove(), se = null), V && (cancelAnimationFrame(V), V = null), T && (["keyup", "mouseup", "focusin", "pointerup"].forEach((g) => {
        t.removeEventListener(g, qe, !0);
      }), window.removeEventListener("scroll", qe, !0), window.removeEventListener("resize", qe), T.remove(), T = null), R && (cancelAnimationFrame(R), R = null), S && (["keyup", "mouseup", "focusin", "pointerup"].forEach((g) => {
        t.removeEventListener(g, ke, !0);
      }), t.removeEventListener("keydown", Qe, !0), t.removeEventListener("pointerdown", zt, !0), window.removeEventListener("scroll", ke, !0), window.removeEventListener("resize", ke), t.removeEventListener("focusout", wn, !0), S.remove(), S = null), H && (cancelAnimationFrame(H), H = null), P && (t.removeEventListener("pointerover", Rc, !0), t.removeEventListener("pointerout", Lc, !0), window.removeEventListener("scroll", xn, !0), window.removeEventListener("resize", xn), P.remove(), P = null, W = null);
      for (const g of w)
        t.removeEventListener(g, be, !0);
      t.removeEventListener("keydown", Ge, !0), Te.destroy(), t.innerHTML = "", zs.delete(t);
    }
  };
  return zs.set(t, ol), ol;
}
window.NutbookMarkdownEditor = {
  create: av,
  destroy(t) {
    Kg(t);
  }
};
