var Pf = (t) => {
  throw TypeError(t);
};
var zf = (t, e, n) => e.has(t) || Pf("Cannot " + n);
var v = (t, e, n) => (zf(t, e, "read from private field"), n ? n.call(t) : e.get(t)), K = (t, e, n) => e.has(t) ? Pf("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, n), B = (t, e, n, r) => (zf(t, e, "write to private field"), r ? r.call(t, n) : e.set(t, n), n);
var _t = /* @__PURE__ */ function(t) {
  return t.docTypeError = "docTypeError", t.contextNotFound = "contextNotFound", t.timerNotFound = "timerNotFound", t.ctxCallOutOfScope = "ctxCallOutOfScope", t.createNodeInParserFail = "createNodeInParserFail", t.stackOverFlow = "stackOverFlow", t.parserMatchError = "parserMatchError", t.serializerMatchError = "serializerMatchError", t.getAtomFromSchemaFail = "getAtomFromSchemaFail", t.expectDomTypeError = "expectDomTypeError", t.callCommandBeforeEditorView = "callCommandBeforeEditorView", t.missingRootElement = "missingRootElement", t.missingNodeInSchema = "missingNodeInSchema", t.missingMarkInSchema = "missingMarkInSchema", t.ctxNotBind = "ctxNotBind", t.missingYjsDoc = "missingYjsDoc", t.aiProviderError = "aiProviderError", t.aiBuildContextError = "aiBuildContextError", t;
}({}), Vt = class extends Error {
  constructor(t, e, n) {
    super(e, n), this.name = "MilkdownError", this.code = t, (n == null ? void 0 : n.cause) !== void 0 && (this.cause = n.cause);
  }
}, Gk = (t, e) => typeof e == "function" ? "[Function]" : e, yl = (t) => JSON.stringify(t, Gk);
function Yk(t) {
  return new Vt(_t.docTypeError, `Doc type error, unsupported type: ${yl(t)}`);
}
function Qk(t) {
  return new Vt(_t.contextNotFound, `Context "${t}" not found, do you forget to inject it?`);
}
function Xk(t) {
  return new Vt(_t.timerNotFound, `Timer "${t}" not found, do you forget to record it?`);
}
function kl() {
  return new Vt(_t.ctxCallOutOfScope, "Should not call a context out of the plugin.");
}
function Zk(t, e, n) {
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
  return new Vt(_t.createNodeInParserFail, o.join(`
`));
}
function fp() {
  return new Vt(_t.stackOverFlow, "Stack over flow, cannot pop on an empty stack.");
}
function e1(t) {
  return new Vt(_t.parserMatchError, `Cannot match target parser for node: ${yl(t)}.`);
}
function t1(t) {
  return new Vt(_t.serializerMatchError, `Cannot match target serializer for node: ${yl(t)}.`);
}
function rn(t) {
  return new Vt(_t.expectDomTypeError, `Expect to be a dom, but get: ${yl(t)}.`);
}
function Fl() {
  return new Vt(_t.callCommandBeforeEditorView, "You're trying to call a command before editor view initialized, make sure to get commandManager from ctx after editor view has been initialized");
}
function n1(t) {
  return new Vt(_t.missingNodeInSchema, `Missing node in schema, milkdown cannot find "${t}" in schema.`);
}
function r1(t) {
  return new Vt(_t.missingMarkInSchema, `Missing mark in schema, milkdown cannot find "${t}" in schema.`);
}
var dp = class {
  constructor() {
    this.sliceMap = /* @__PURE__ */ new Map(), this.get = (t) => {
      const e = typeof t == "string" ? [...this.sliceMap.values()].find((n) => n.type.name === t) : this.sliceMap.get(t.id);
      if (!e) throw Qk(typeof t == "string" ? t : t.name);
      return e;
    }, this.remove = (t) => {
      const e = typeof t == "string" ? [...this.sliceMap.values()].find((n) => n.type.name === t) : this.sliceMap.get(t.id);
      e && this.sliceMap.delete(e.type.id);
    }, this.has = (t) => typeof t == "string" ? [...this.sliceMap.values()].some((e) => e.type.name === t) : this.sliceMap.has(t.id);
  }
}, jt, gn, fi, sp, i1 = (sp = class {
  constructor(e, n, r) {
    K(this, jt);
    K(this, gn);
    K(this, fi);
    B(this, jt, []), B(this, fi, () => {
      v(this, jt).forEach((i) => i(v(this, gn)));
    }), this.set = (i) => {
      B(this, gn, i), v(this, fi).call(this);
    }, this.get = () => v(this, gn), this.update = (i) => {
      B(this, gn, i(v(this, gn))), v(this, fi).call(this);
    }, this.type = r, B(this, gn, n), e.set(r.id, this);
  }
  on(e) {
    return v(this, jt).push(e), () => {
      B(this, jt, v(this, jt).filter((n) => n !== e));
    };
  }
  once(e) {
    const n = this.on((r) => {
      e(r), n();
    });
    return n;
  }
  off(e) {
    B(this, jt, v(this, jt).filter((n) => n !== e));
  }
  offAll() {
    B(this, jt, []);
  }
}, jt = new WeakMap(), gn = new WeakMap(), fi = new WeakMap(), sp), o1 = class {
  constructor(t, e) {
    this.id = Symbol(`Context-${e}`), this.name = e, this._defaultValue = t, this._typeInfo = () => {
      throw kl();
    };
  }
  create(t, e = this._defaultValue) {
    return new i1(t, e, this);
  }
}, fe = (t, e) => new o1(t, e), Bo, Fo, $o, br, di, Wn, hi, pi, mi, lp, s1 = (lp = class {
  constructor(t, e, n) {
    K(this, Bo);
    K(this, Fo);
    K(this, $o);
    K(this, br);
    K(this, di);
    K(this, Wn);
    K(this, hi);
    K(this, pi);
    K(this, mi);
    B(this, br, /* @__PURE__ */ new Set()), B(this, di, /* @__PURE__ */ new Set()), B(this, Wn, /* @__PURE__ */ new Map()), B(this, hi, /* @__PURE__ */ new Map()), this.read = () => ({
      metadata: v(this, Bo),
      injectedSlices: [...v(this, br)].map((r) => ({
        name: typeof r == "string" ? r : r.name,
        value: v(this, pi).call(this, r)
      })),
      consumedSlices: [...v(this, di)].map((r) => ({
        name: typeof r == "string" ? r : r.name,
        value: v(this, pi).call(this, r)
      })),
      recordedTimers: [...v(this, Wn)].map(([r, { duration: i }]) => ({
        name: r.name,
        duration: i,
        status: v(this, mi).call(this, r)
      })),
      waitTimers: [...v(this, hi)].map(([r, { duration: i }]) => ({
        name: r.name,
        duration: i,
        status: v(this, mi).call(this, r)
      }))
    }), this.onRecord = (r) => {
      v(this, Wn).set(r, {
        start: Date.now(),
        duration: 0
      });
    }, this.onClear = (r) => {
      v(this, Wn).delete(r);
    }, this.onDone = (r) => {
      const i = v(this, Wn).get(r);
      i && (i.duration = Date.now() - i.start);
    }, this.onWait = (r, i) => {
      const o = Date.now();
      i.finally(() => {
        v(this, hi).set(r, { duration: Date.now() - o });
      }).catch(console.error);
    }, this.onInject = (r) => {
      v(this, br).add(r);
    }, this.onRemove = (r) => {
      v(this, br).delete(r);
    }, this.onUse = (r) => {
      v(this, di).add(r);
    }, B(this, pi, (r) => v(this, Fo).get(r).get()), B(this, mi, (r) => v(this, $o).get(r).status), B(this, Fo, t), B(this, $o, e), B(this, Bo, n);
  }
}, Bo = new WeakMap(), Fo = new WeakMap(), $o = new WeakMap(), br = new WeakMap(), di = new WeakMap(), Wn = new WeakMap(), hi = new WeakMap(), pi = new WeakMap(), mi = new WeakMap(), lp), yn, kn, _o, Rt, gi, l1 = (gi = class {
  constructor(e, n, r) {
    K(this, yn);
    K(this, kn);
    K(this, _o);
    K(this, Rt);
    this.produce = (i) => i && Object.keys(i).length ? new gi(v(this, yn), v(this, kn), { ...i }) : this, this.inject = (i, o) => {
      var l;
      const s = i.create(v(this, yn).sliceMap);
      return o != null && s.set(o), (l = v(this, Rt)) == null || l.onInject(i), this;
    }, this.remove = (i) => {
      var o;
      return v(this, yn).remove(i), (o = v(this, Rt)) == null || o.onRemove(i), this;
    }, this.record = (i) => {
      var o;
      return i.create(v(this, kn).store), (o = v(this, Rt)) == null || o.onRecord(i), this;
    }, this.clearTimer = (i) => {
      var o;
      return v(this, kn).remove(i), (o = v(this, Rt)) == null || o.onClear(i), this;
    }, this.isInjected = (i) => v(this, yn).has(i), this.isRecorded = (i) => v(this, kn).has(i), this.use = (i) => {
      var o;
      return (o = v(this, Rt)) == null || o.onUse(i), v(this, yn).get(i);
    }, this.get = (i) => this.use(i).get(), this.set = (i, o) => this.use(i).set(o), this.update = (i, o) => this.use(i).update(o), this.timer = (i) => v(this, kn).get(i), this.done = (i) => {
      var o;
      this.timer(i).done(), (o = v(this, Rt)) == null || o.onDone(i);
    }, this.wait = (i) => {
      var s;
      const o = this.timer(i).start();
      return (s = v(this, Rt)) == null || s.onWait(i, o), o;
    }, this.waitTimers = async (i) => {
      await Promise.all(this.get(i).map((o) => this.wait(o)));
    }, B(this, yn, e), B(this, kn, n), B(this, _o, r), r && B(this, Rt, new s1(e, n, r));
  }
  get meta() {
    return v(this, _o);
  }
  get inspector() {
    return v(this, Rt);
  }
}, yn = new WeakMap(), kn = new WeakMap(), _o = new WeakMap(), Rt = new WeakMap(), gi), a1 = class {
  constructor() {
    this.store = /* @__PURE__ */ new Map(), this.get = (t) => {
      const e = this.store.get(t.id);
      if (!e) throw Xk(t.name);
      return e;
    }, this.remove = (t) => {
      this.store.delete(t.id);
    }, this.has = (t) => this.store.has(t.id);
  }
}, yi, qn, ki, bn, bi, Vo, ap, u1 = (ap = class {
  constructor(t, e) {
    K(this, yi);
    K(this, qn);
    K(this, ki);
    K(this, bn);
    K(this, bi);
    K(this, Vo);
    B(this, yi, null), B(this, qn, null), B(this, bn, "pending"), this.start = () => (v(this, yi) ?? B(this, yi, new Promise((n, r) => {
      B(this, qn, (i) => {
        i instanceof CustomEvent && i.detail.id === v(this, ki) && (B(this, bn, "resolved"), v(this, bi).call(this), i.stopImmediatePropagation(), n());
      }), v(this, Vo).call(this, () => {
        v(this, bn) === "pending" && B(this, bn, "rejected"), v(this, bi).call(this), r(/* @__PURE__ */ new Error(`Timing ${this.type.name} timeout.`));
      }), B(this, bn, "pending"), addEventListener(this.type.name, v(this, qn));
    })), v(this, yi)), this.done = () => {
      const n = new CustomEvent(this.type.name, { detail: { id: v(this, ki) } });
      dispatchEvent(n);
    }, B(this, bi, () => {
      v(this, qn) && removeEventListener(this.type.name, v(this, qn));
    }), B(this, Vo, (n) => {
      setTimeout(() => {
        n();
      }, this.type.timeout);
    }), B(this, ki, Symbol(e.name)), this.type = e, t.set(e.id, this);
  }
  get status() {
    return v(this, bn);
  }
}, yi = new WeakMap(), qn = new WeakMap(), ki = new WeakMap(), bn = new WeakMap(), bi = new WeakMap(), Vo = new WeakMap(), ap), c1 = class {
  constructor(t, e = 3e3) {
    this.create = (n) => new u1(n, this), this.id = Symbol(`Timer-${t}`), this.name = t, this.timeout = e;
  }
}, on = (t, e = 3e3) => new c1(t, e);
const f1 = {};
function Au(t, e) {
  const n = f1, r = typeof n.includeImageAlt == "boolean" ? n.includeImageAlt : !0, i = typeof n.includeHtml == "boolean" ? n.includeHtml : !0;
  return hp(t, r, i);
}
function hp(t, e, n) {
  if (d1(t)) {
    if ("value" in t)
      return t.type === "html" && !n ? "" : t.value;
    if (e && "alt" in t && t.alt)
      return t.alt;
    if ("children" in t)
      return Bf(t.children, e, n);
  }
  return Array.isArray(t) ? Bf(t, e, n) : "";
}
function Bf(t, e, n) {
  const r = [];
  let i = -1;
  for (; ++i < t.length; )
    r[i] = hp(t[i], e, n);
  return r.join("");
}
function d1(t) {
  return !!(t && typeof t == "object");
}
const Ff = document.createElement("i");
function Eu(t) {
  const e = "&" + t + ";";
  Ff.innerHTML = e;
  const n = Ff.textContent;
  return n.charCodeAt(n.length - 1) === 59 && t !== "semi" || n === e ? !1 : n;
}
function Nt(t, e, n, r) {
  const i = t.length;
  let o = 0, s;
  if (e < 0 ? e = -e > i ? 0 : i + e : e = e > i ? i : e, n = n > 0 ? n : 0, r.length < 1e4)
    s = Array.from(r), s.unshift(e, n), t.splice(...s);
  else
    for (n && t.splice(e, n); o < r.length; )
      s = r.slice(o, o + 1e4), s.unshift(e, 0), t.splice(...s), o += 1e4, e += 1e4;
}
function zt(t, e) {
  return t.length > 0 ? (Nt(t, t.length, 0, e), t) : e;
}
const $f = {}.hasOwnProperty;
function pp(t) {
  const e = {};
  let n = -1;
  for (; ++n < t.length; )
    h1(e, t[n]);
  return e;
}
function h1(t, e) {
  let n;
  for (n in e) {
    const i = ($f.call(t, n) ? t[n] : void 0) || (t[n] = {}), o = e[n];
    let s;
    if (o)
      for (s in o) {
        $f.call(i, s) || (i[s] = []);
        const l = o[s];
        p1(
          // @ts-expect-error Looks like a list.
          i[s],
          Array.isArray(l) ? l : l ? [l] : []
        );
      }
  }
}
function p1(t, e) {
  let n = -1;
  const r = [];
  for (; ++n < e.length; )
    (e[n].add === "after" ? t : r).push(e[n]);
  Nt(t, 0, 0, r);
}
function mp(t, e) {
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
function Kt(t) {
  return t.replace(/[\t\n\r ]+/g, " ").replace(/^ | $/g, "").toLowerCase().toUpperCase();
}
const st = ir(/[A-Za-z]/), gt = ir(/[\dA-Za-z]/), m1 = ir(/[#-'*+\--9=?A-Z^-~]/);
function Xs(t) {
  return (
    // Special whitespace codes (which have negative values), C0 and Control
    // character DEL
    t !== null && (t < 32 || t === 127)
  );
}
const za = ir(/\d/), g1 = ir(/[\dA-Fa-f]/), y1 = ir(/[!-/:-@[-`{-~]/);
function Y(t) {
  return t !== null && t < -2;
}
function Ce(t) {
  return t !== null && (t < 0 || t === 32);
}
function ce(t) {
  return t === -2 || t === -1 || t === 32;
}
const bl = ir(new RegExp("[\\u0021-\\u002F\\u003A-\\u0040\\u005B-\\u0060\\u007B-\\u007E]")), Fr = ir(/\s/);
function ir(t) {
  return e;
  function e(n) {
    return n !== null && n > -1 && t.test(String.fromCharCode(n));
  }
}
function he(t, e, n, r) {
  const i = r ? r - 1 : Number.POSITIVE_INFINITY;
  let o = 0;
  return s;
  function s(a) {
    return ce(a) ? (t.enter(n), l(a)) : e(a);
  }
  function l(a) {
    return ce(a) && o++ < i ? (t.consume(a), l) : (t.exit(n), e(a));
  }
}
const k1 = {
  tokenize: b1
};
function b1(t) {
  const e = t.attempt(this.parser.constructs.contentInitial, r, i);
  let n;
  return e;
  function r(l) {
    if (l === null) {
      t.consume(l);
      return;
    }
    return t.enter("lineEnding"), t.consume(l), t.exit("lineEnding"), he(t, e, "linePrefix");
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
    return Y(l) ? (t.consume(l), t.exit("chunkText"), o) : (t.consume(l), s);
  }
}
const w1 = {
  tokenize: x1
}, _f = {
  tokenize: C1
};
function x1(t) {
  const e = this, n = [];
  let r = 0, i, o, s;
  return l;
  function l(E) {
    if (r < n.length) {
      const j = n[r];
      return e.containerState = j[1], t.attempt(j[0].continuation, a, u)(E);
    }
    return u(E);
  }
  function a(E) {
    if (r++, e.containerState._closeFlow) {
      e.containerState._closeFlow = void 0, i && L();
      const j = e.events.length;
      let H = j, T;
      for (; H--; )
        if (e.events[H][0] === "exit" && e.events[H][1].type === "chunkFlow") {
          T = e.events[H][1].end;
          break;
        }
      b(r);
      let z = j;
      for (; z < e.events.length; )
        e.events[z][1].end = {
          ...T
        }, z++;
      return Nt(e.events, H + 1, 0, e.events.slice(j)), e.events.length = z, u(E);
    }
    return l(E);
  }
  function u(E) {
    if (r === n.length) {
      if (!i)
        return d(E);
      if (i.currentConstruct && i.currentConstruct.concrete)
        return p(E);
      e.interrupt = !!(i.currentConstruct && !i._gfmTableDynamicInterruptHack);
    }
    return e.containerState = {}, t.check(_f, c, f)(E);
  }
  function c(E) {
    return i && L(), b(r), d(E);
  }
  function f(E) {
    return e.parser.lazy[e.now().line] = r !== n.length, s = e.now().offset, p(E);
  }
  function d(E) {
    return e.containerState = {}, t.attempt(_f, h, p)(E);
  }
  function h(E) {
    return r++, n.push([e.currentConstruct, e.containerState]), d(E);
  }
  function p(E) {
    if (E === null) {
      i && L(), b(0), t.consume(E);
      return;
    }
    return i = i || e.parser.flow(e.now()), t.enter("chunkFlow", {
      _tokenizer: i,
      contentType: "flow",
      previous: o
    }), k(E);
  }
  function k(E) {
    if (E === null) {
      w(t.exit("chunkFlow"), !0), b(0), t.consume(E);
      return;
    }
    return Y(E) ? (t.consume(E), w(t.exit("chunkFlow")), r = 0, e.interrupt = void 0, l) : (t.consume(E), k);
  }
  function w(E, j) {
    const H = e.sliceStream(E);
    if (j && H.push(null), E.previous = o, o && (o.next = E), o = E, i.defineSkip(E.start), i.write(H), e.parser.lazy[E.start.line]) {
      let T = i.events.length;
      for (; T--; )
        if (
          // The token starts before the line ending…
          i.events[T][1].start.offset < s && // …and either is not ended yet…
          (!i.events[T][1].end || // …or ends after it.
          i.events[T][1].end.offset > s)
        )
          return;
      const z = e.events.length;
      let U = z, G, A;
      for (; U--; )
        if (e.events[U][0] === "exit" && e.events[U][1].type === "chunkFlow") {
          if (G) {
            A = e.events[U][1].end;
            break;
          }
          G = !0;
        }
      for (b(r), T = z; T < e.events.length; )
        e.events[T][1].end = {
          ...A
        }, T++;
      Nt(e.events, U + 1, 0, e.events.slice(z)), e.events.length = T;
    }
  }
  function b(E) {
    let j = n.length;
    for (; j-- > E; ) {
      const H = n[j];
      e.containerState = H[1], H[0].exit.call(e, t);
    }
    n.length = E;
  }
  function L() {
    i.write([null]), o = void 0, i = void 0, e.containerState._closeFlow = void 0;
  }
}
function C1(t, e, n) {
  return he(t, t.attempt(this.parser.constructs.document, e, n), "linePrefix", this.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4);
}
function Oi(t) {
  if (t === null || Ce(t) || Fr(t))
    return 1;
  if (bl(t))
    return 2;
}
function wl(t, e, n) {
  const r = [];
  let i = -1;
  for (; ++i < t.length; ) {
    const o = t[i].resolveAll;
    o && !r.includes(o) && (e = o(e, n), r.push(o));
  }
  return e;
}
const Ba = {
  name: "attention",
  resolveAll: S1,
  tokenize: M1
};
function S1(t, e) {
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
          }, d = {
            ...t[n][1].start
          };
          Vf(f, -a), Vf(d, a), s = {
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
            end: d
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
          }, u = [], t[r][1].end.offset - t[r][1].start.offset && (u = zt(u, [["enter", t[r][1], e], ["exit", t[r][1], e]])), u = zt(u, [["enter", i, e], ["enter", s, e], ["exit", s, e], ["enter", o, e]]), u = zt(u, wl(e.parser.constructs.insideSpan.null, t.slice(r + 1, n), e)), u = zt(u, [["exit", o, e], ["enter", l, e], ["exit", l, e], ["exit", i, e]]), t[n][1].end.offset - t[n][1].start.offset ? (c = 2, u = zt(u, [["enter", t[n][1], e], ["exit", t[n][1], e]])) : c = 0, Nt(t, r - 1, n - r + 3, u), n = r + u.length - c - 2;
          break;
        }
    }
  for (n = -1; ++n < t.length; )
    t[n][1].type === "attentionSequence" && (t[n][1].type = "data");
  return t;
}
function M1(t, e) {
  const n = this.parser.constructs.attentionMarkers.null, r = this.previous, i = Oi(r);
  let o;
  return s;
  function s(a) {
    return o = a, t.enter("attentionSequence"), l(a);
  }
  function l(a) {
    if (a === o)
      return t.consume(a), l;
    const u = t.exit("attentionSequence"), c = Oi(a), f = !c || c === 2 && i || n.includes(a), d = !i || i === 2 && c || n.includes(r);
    return u._open = !!(o === 42 ? f : f && (i || !d)), u._close = !!(o === 42 ? d : d && (c || !f)), e(a);
  }
}
function Vf(t, e) {
  t.column += e, t.offset += e, t._bufferIndex += e;
}
const v1 = {
  name: "autolink",
  tokenize: T1
};
function T1(t, e, n) {
  let r = 0;
  return i;
  function i(h) {
    return t.enter("autolink"), t.enter("autolinkMarker"), t.consume(h), t.exit("autolinkMarker"), t.enter("autolinkProtocol"), o;
  }
  function o(h) {
    return st(h) ? (t.consume(h), s) : h === 64 ? n(h) : u(h);
  }
  function s(h) {
    return h === 43 || h === 45 || h === 46 || gt(h) ? (r = 1, l(h)) : u(h);
  }
  function l(h) {
    return h === 58 ? (t.consume(h), r = 0, a) : (h === 43 || h === 45 || h === 46 || gt(h)) && r++ < 32 ? (t.consume(h), l) : (r = 0, u(h));
  }
  function a(h) {
    return h === 62 ? (t.exit("autolinkProtocol"), t.enter("autolinkMarker"), t.consume(h), t.exit("autolinkMarker"), t.exit("autolink"), e) : h === null || h === 32 || h === 60 || Xs(h) ? n(h) : (t.consume(h), a);
  }
  function u(h) {
    return h === 64 ? (t.consume(h), c) : m1(h) ? (t.consume(h), u) : n(h);
  }
  function c(h) {
    return gt(h) ? f(h) : n(h);
  }
  function f(h) {
    return h === 46 ? (t.consume(h), r = 0, c) : h === 62 ? (t.exit("autolinkProtocol").type = "autolinkEmail", t.enter("autolinkMarker"), t.consume(h), t.exit("autolinkMarker"), t.exit("autolink"), e) : d(h);
  }
  function d(h) {
    if ((h === 45 || gt(h)) && r++ < 63) {
      const p = h === 45 ? d : f;
      return t.consume(h), p;
    }
    return n(h);
  }
}
const ts = {
  partial: !0,
  tokenize: N1
};
function N1(t, e, n) {
  return r;
  function r(o) {
    return ce(o) ? he(t, i, "linePrefix")(o) : i(o);
  }
  function i(o) {
    return o === null || Y(o) ? e(o) : n(o);
  }
}
const gp = {
  continuation: {
    tokenize: A1
  },
  exit: E1,
  name: "blockQuote",
  tokenize: I1
};
function I1(t, e, n) {
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
    return ce(s) ? (t.enter("blockQuotePrefixWhitespace"), t.consume(s), t.exit("blockQuotePrefixWhitespace"), t.exit("blockQuotePrefix"), e) : (t.exit("blockQuotePrefix"), e(s));
  }
}
function A1(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return ce(s) ? he(t, o, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(s) : o(s);
  }
  function o(s) {
    return t.attempt(gp, e, n)(s);
  }
}
function E1(t) {
  t.exit("blockQuote");
}
const yp = {
  name: "characterEscape",
  tokenize: O1
};
function O1(t, e, n) {
  return r;
  function r(o) {
    return t.enter("characterEscape"), t.enter("escapeMarker"), t.consume(o), t.exit("escapeMarker"), i;
  }
  function i(o) {
    return y1(o) ? (t.enter("characterEscapeValue"), t.consume(o), t.exit("characterEscapeValue"), t.exit("characterEscape"), e) : n(o);
  }
}
const kp = {
  name: "characterReference",
  tokenize: D1
};
function D1(t, e, n) {
  const r = this;
  let i = 0, o, s;
  return l;
  function l(f) {
    return t.enter("characterReference"), t.enter("characterReferenceMarker"), t.consume(f), t.exit("characterReferenceMarker"), a;
  }
  function a(f) {
    return f === 35 ? (t.enter("characterReferenceMarkerNumeric"), t.consume(f), t.exit("characterReferenceMarkerNumeric"), u) : (t.enter("characterReferenceValue"), o = 31, s = gt, c(f));
  }
  function u(f) {
    return f === 88 || f === 120 ? (t.enter("characterReferenceMarkerHexadecimal"), t.consume(f), t.exit("characterReferenceMarkerHexadecimal"), t.enter("characterReferenceValue"), o = 6, s = g1, c) : (t.enter("characterReferenceValue"), o = 7, s = za, c(f));
  }
  function c(f) {
    if (f === 59 && i) {
      const d = t.exit("characterReferenceValue");
      return s === gt && !Eu(r.sliceSerialize(d)) ? n(f) : (t.enter("characterReferenceMarker"), t.consume(f), t.exit("characterReferenceMarker"), t.exit("characterReference"), e);
    }
    return s(f) && i++ < o ? (t.consume(f), c) : n(f);
  }
}
const Hf = {
  partial: !0,
  tokenize: L1
}, jf = {
  concrete: !0,
  name: "codeFenced",
  tokenize: R1
};
function R1(t, e, n) {
  const r = this, i = {
    partial: !0,
    tokenize: H
  };
  let o = 0, s = 0, l;
  return a;
  function a(T) {
    return u(T);
  }
  function u(T) {
    const z = r.events[r.events.length - 1];
    return o = z && z[1].type === "linePrefix" ? z[2].sliceSerialize(z[1], !0).length : 0, l = T, t.enter("codeFenced"), t.enter("codeFencedFence"), t.enter("codeFencedFenceSequence"), c(T);
  }
  function c(T) {
    return T === l ? (s++, t.consume(T), c) : s < 3 ? n(T) : (t.exit("codeFencedFenceSequence"), ce(T) ? he(t, f, "whitespace")(T) : f(T));
  }
  function f(T) {
    return T === null || Y(T) ? (t.exit("codeFencedFence"), r.interrupt ? e(T) : t.check(Hf, k, j)(T)) : (t.enter("codeFencedFenceInfo"), t.enter("chunkString", {
      contentType: "string"
    }), d(T));
  }
  function d(T) {
    return T === null || Y(T) ? (t.exit("chunkString"), t.exit("codeFencedFenceInfo"), f(T)) : ce(T) ? (t.exit("chunkString"), t.exit("codeFencedFenceInfo"), he(t, h, "whitespace")(T)) : T === 96 && T === l ? n(T) : (t.consume(T), d);
  }
  function h(T) {
    return T === null || Y(T) ? f(T) : (t.enter("codeFencedFenceMeta"), t.enter("chunkString", {
      contentType: "string"
    }), p(T));
  }
  function p(T) {
    return T === null || Y(T) ? (t.exit("chunkString"), t.exit("codeFencedFenceMeta"), f(T)) : T === 96 && T === l ? n(T) : (t.consume(T), p);
  }
  function k(T) {
    return t.attempt(i, j, w)(T);
  }
  function w(T) {
    return t.enter("lineEnding"), t.consume(T), t.exit("lineEnding"), b;
  }
  function b(T) {
    return o > 0 && ce(T) ? he(t, L, "linePrefix", o + 1)(T) : L(T);
  }
  function L(T) {
    return T === null || Y(T) ? t.check(Hf, k, j)(T) : (t.enter("codeFlowValue"), E(T));
  }
  function E(T) {
    return T === null || Y(T) ? (t.exit("codeFlowValue"), L(T)) : (t.consume(T), E);
  }
  function j(T) {
    return t.exit("codeFenced"), e(T);
  }
  function H(T, z, U) {
    let G = 0;
    return A;
    function A(le) {
      return T.enter("lineEnding"), T.consume(le), T.exit("lineEnding"), V;
    }
    function V(le) {
      return T.enter("codeFencedFence"), ce(le) ? he(T, q, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(le) : q(le);
    }
    function q(le) {
      return le === l ? (T.enter("codeFencedFenceSequence"), J(le)) : U(le);
    }
    function J(le) {
      return le === l ? (G++, T.consume(le), J) : G >= s ? (T.exit("codeFencedFenceSequence"), ce(le) ? he(T, me, "whitespace")(le) : me(le)) : U(le);
    }
    function me(le) {
      return le === null || Y(le) ? (T.exit("codeFencedFence"), z(le)) : U(le);
    }
  }
}
function L1(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return s === null ? n(s) : (t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), o);
  }
  function o(s) {
    return r.parser.lazy[r.now().line] ? n(s) : e(s);
  }
}
const $l = {
  name: "codeIndented",
  tokenize: z1
}, P1 = {
  partial: !0,
  tokenize: B1
};
function z1(t, e, n) {
  const r = this;
  return i;
  function i(u) {
    return t.enter("codeIndented"), he(t, o, "linePrefix", 5)(u);
  }
  function o(u) {
    const c = r.events[r.events.length - 1];
    return c && c[1].type === "linePrefix" && c[2].sliceSerialize(c[1], !0).length >= 4 ? s(u) : n(u);
  }
  function s(u) {
    return u === null ? a(u) : Y(u) ? t.attempt(P1, s, a)(u) : (t.enter("codeFlowValue"), l(u));
  }
  function l(u) {
    return u === null || Y(u) ? (t.exit("codeFlowValue"), s(u)) : (t.consume(u), l);
  }
  function a(u) {
    return t.exit("codeIndented"), e(u);
  }
}
function B1(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return r.parser.lazy[r.now().line] ? n(s) : Y(s) ? (t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), i) : he(t, o, "linePrefix", 5)(s);
  }
  function o(s) {
    const l = r.events[r.events.length - 1];
    return l && l[1].type === "linePrefix" && l[2].sliceSerialize(l[1], !0).length >= 4 ? e(s) : Y(s) ? i(s) : n(s);
  }
}
const F1 = {
  name: "codeText",
  previous: _1,
  resolve: $1,
  tokenize: V1
};
function $1(t) {
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
function _1(t) {
  return t !== 96 || this.events[this.events.length - 1][1].type === "characterEscape";
}
function V1(t, e, n) {
  let r = 0, i, o;
  return s;
  function s(f) {
    return t.enter("codeText"), t.enter("codeTextSequence"), l(f);
  }
  function l(f) {
    return f === 96 ? (t.consume(f), r++, l) : (t.exit("codeTextSequence"), a(f));
  }
  function a(f) {
    return f === null ? n(f) : f === 32 ? (t.enter("space"), t.consume(f), t.exit("space"), a) : f === 96 ? (o = t.enter("codeTextSequence"), i = 0, c(f)) : Y(f) ? (t.enter("lineEnding"), t.consume(f), t.exit("lineEnding"), a) : (t.enter("codeTextData"), u(f));
  }
  function u(f) {
    return f === null || f === 32 || f === 96 || Y(f) ? (t.exit("codeTextData"), a(f)) : (t.consume(f), u);
  }
  function c(f) {
    return f === 96 ? (t.consume(f), i++, c) : i === r ? (t.exit("codeTextSequence"), t.exit("codeText"), e(f)) : (o.type = "codeTextData", u(f));
  }
}
class H1 {
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
    return r && to(this.left, r), o.reverse();
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
    this.setCursor(Number.POSITIVE_INFINITY), to(this.left, e);
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
    this.setCursor(0), to(this.right, e.reverse());
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
        to(this.right, n.reverse());
      } else {
        const n = this.right.splice(this.left.length + this.right.length - e, Number.POSITIVE_INFINITY);
        to(this.left, n.reverse());
      }
  }
}
function to(t, e) {
  let n = 0;
  if (e.length < 1e4)
    t.push(...e);
  else
    for (; n < e.length; )
      t.push(...e.slice(n, n + 1e4)), n += 1e4;
}
function bp(t) {
  const e = {};
  let n = -1, r, i, o, s, l, a, u;
  const c = new H1(t);
  for (; ++n < c.length; ) {
    for (; n in e; )
      n = e[n];
    if (r = c.get(n), n && r[1].type === "chunkFlow" && c.get(n - 1)[1].type === "listItemPrefix" && (a = r[1]._tokenizer.events, o = 0, o < a.length && a[o][1].type === "lineEndingBlank" && (o += 2), o < a.length && a[o][1].type === "content"))
      for (; ++o < a.length && a[o][1].type !== "content"; )
        a[o][1].type === "chunkText" && (a[o][1]._isInFirstContentOfListItem = !0, o++);
    if (r[0] === "enter")
      r[1].contentType && (Object.assign(e, j1(c, n)), n = e[n], u = !0);
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
  return Nt(t, 0, Number.POSITIVE_INFINITY, c.slice(0)), !u;
}
function j1(t, e) {
  const n = t.get(e)[1], r = t.get(e)[2];
  let i = e - 1;
  const o = [];
  let s = n._tokenizer;
  s || (s = r.parser[n.contentType](n.start), n._contentTypeTextTrailing && (s._contentTypeTextTrailing = !0));
  const l = s.events, a = [], u = {};
  let c, f, d = -1, h = n, p = 0, k = 0;
  const w = [k];
  for (; h; ) {
    for (; t.get(++i)[1] !== h; )
      ;
    o.push(i), h._tokenizer || (c = r.sliceStream(h), h.next || c.push(null), f && s.defineSkip(h.start), h._isInFirstContentOfListItem && (s._gfmTasklistFirstContentOfListItem = !0), s.write(c), h._isInFirstContentOfListItem && (s._gfmTasklistFirstContentOfListItem = void 0)), f = h, h = h.next;
  }
  for (h = n; ++d < l.length; )
    // Find a void token that includes a break.
    l[d][0] === "exit" && l[d - 1][0] === "enter" && l[d][1].type === l[d - 1][1].type && l[d][1].start.line !== l[d][1].end.line && (k = d + 1, w.push(k), h._tokenizer = void 0, h.previous = void 0, h = h.next);
  for (s.events = [], h ? (h._tokenizer = void 0, h.previous = void 0) : w.pop(), d = w.length; d--; ) {
    const b = l.slice(w[d], w[d + 1]), L = o.pop();
    a.push([L, L + b.length - 1]), t.splice(L, 2, b);
  }
  for (a.reverse(), d = -1; ++d < a.length; )
    u[p + a[d][0]] = p + a[d][1], p += a[d][1] - a[d][0] - 1;
  return u;
}
const W1 = {
  resolve: K1,
  tokenize: U1
}, q1 = {
  partial: !0,
  tokenize: J1
};
function K1(t) {
  return bp(t), t;
}
function U1(t, e) {
  let n;
  return r;
  function r(l) {
    return t.enter("content"), n = t.enter("chunkContent", {
      contentType: "content"
    }), i(l);
  }
  function i(l) {
    return l === null ? o(l) : Y(l) ? t.check(q1, s, o)(l) : (t.consume(l), i);
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
function J1(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return t.exit("chunkContent"), t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), he(t, o, "linePrefix");
  }
  function o(s) {
    if (s === null || Y(s))
      return n(s);
    const l = r.events[r.events.length - 1];
    return !r.parser.constructs.disable.null.includes("codeIndented") && l && l[1].type === "linePrefix" && l[2].sliceSerialize(l[1], !0).length >= 4 ? e(s) : t.interrupt(r.parser.constructs.flow, n, e)(s);
  }
}
function wp(t, e, n, r, i, o, s, l, a) {
  const u = a || Number.POSITIVE_INFINITY;
  let c = 0;
  return f;
  function f(b) {
    return b === 60 ? (t.enter(r), t.enter(i), t.enter(o), t.consume(b), t.exit(o), d) : b === null || b === 32 || b === 41 || Xs(b) ? n(b) : (t.enter(r), t.enter(s), t.enter(l), t.enter("chunkString", {
      contentType: "string"
    }), k(b));
  }
  function d(b) {
    return b === 62 ? (t.enter(o), t.consume(b), t.exit(o), t.exit(i), t.exit(r), e) : (t.enter(l), t.enter("chunkString", {
      contentType: "string"
    }), h(b));
  }
  function h(b) {
    return b === 62 ? (t.exit("chunkString"), t.exit(l), d(b)) : b === null || b === 60 || Y(b) ? n(b) : (t.consume(b), b === 92 ? p : h);
  }
  function p(b) {
    return b === 60 || b === 62 || b === 92 ? (t.consume(b), h) : h(b);
  }
  function k(b) {
    return !c && (b === null || b === 41 || Ce(b)) ? (t.exit("chunkString"), t.exit(l), t.exit(s), t.exit(r), e(b)) : c < u && b === 40 ? (t.consume(b), c++, k) : b === 41 ? (t.consume(b), c--, k) : b === null || b === 32 || b === 40 || Xs(b) ? n(b) : (t.consume(b), b === 92 ? w : k);
  }
  function w(b) {
    return b === 40 || b === 41 || b === 92 ? (t.consume(b), k) : k(b);
  }
}
function xp(t, e, n, r, i, o) {
  const s = this;
  let l = 0, a;
  return u;
  function u(h) {
    return t.enter(r), t.enter(i), t.consume(h), t.exit(i), t.enter(o), c;
  }
  function c(h) {
    return l > 999 || h === null || h === 91 || h === 93 && !a || // To do: remove in the future once we’ve switched from
    // `micromark-extension-footnote` to `micromark-extension-gfm-footnote`,
    // which doesn’t need this.
    // Hidden footnotes hook.
    /* c8 ignore next 3 */
    h === 94 && !l && "_hiddenFootnoteSupport" in s.parser.constructs ? n(h) : h === 93 ? (t.exit(o), t.enter(i), t.consume(h), t.exit(i), t.exit(r), e) : Y(h) ? (t.enter("lineEnding"), t.consume(h), t.exit("lineEnding"), c) : (t.enter("chunkString", {
      contentType: "string"
    }), f(h));
  }
  function f(h) {
    return h === null || h === 91 || h === 93 || Y(h) || l++ > 999 ? (t.exit("chunkString"), c(h)) : (t.consume(h), a || (a = !ce(h)), h === 92 ? d : f);
  }
  function d(h) {
    return h === 91 || h === 92 || h === 93 ? (t.consume(h), l++, f) : f(h);
  }
}
function Cp(t, e, n, r, i, o) {
  let s;
  return l;
  function l(d) {
    return d === 34 || d === 39 || d === 40 ? (t.enter(r), t.enter(i), t.consume(d), t.exit(i), s = d === 40 ? 41 : d, a) : n(d);
  }
  function a(d) {
    return d === s ? (t.enter(i), t.consume(d), t.exit(i), t.exit(r), e) : (t.enter(o), u(d));
  }
  function u(d) {
    return d === s ? (t.exit(o), a(s)) : d === null ? n(d) : Y(d) ? (t.enter("lineEnding"), t.consume(d), t.exit("lineEnding"), he(t, u, "linePrefix")) : (t.enter("chunkString", {
      contentType: "string"
    }), c(d));
  }
  function c(d) {
    return d === s || d === null || Y(d) ? (t.exit("chunkString"), u(d)) : (t.consume(d), d === 92 ? f : c);
  }
  function f(d) {
    return d === s || d === 92 ? (t.consume(d), c) : c(d);
  }
}
function co(t, e) {
  let n;
  return r;
  function r(i) {
    return Y(i) ? (t.enter("lineEnding"), t.consume(i), t.exit("lineEnding"), n = !0, r) : ce(i) ? he(t, r, n ? "linePrefix" : "lineSuffix")(i) : e(i);
  }
}
const G1 = {
  name: "definition",
  tokenize: Q1
}, Y1 = {
  partial: !0,
  tokenize: X1
};
function Q1(t, e, n) {
  const r = this;
  let i;
  return o;
  function o(h) {
    return t.enter("definition"), s(h);
  }
  function s(h) {
    return xp.call(
      r,
      t,
      l,
      // Note: we don’t need to reset the way `markdown-rs` does.
      n,
      "definitionLabel",
      "definitionLabelMarker",
      "definitionLabelString"
    )(h);
  }
  function l(h) {
    return i = Kt(r.sliceSerialize(r.events[r.events.length - 1][1]).slice(1, -1)), h === 58 ? (t.enter("definitionMarker"), t.consume(h), t.exit("definitionMarker"), a) : n(h);
  }
  function a(h) {
    return Ce(h) ? co(t, u)(h) : u(h);
  }
  function u(h) {
    return wp(
      t,
      c,
      // Note: we don’t need to reset the way `markdown-rs` does.
      n,
      "definitionDestination",
      "definitionDestinationLiteral",
      "definitionDestinationLiteralMarker",
      "definitionDestinationRaw",
      "definitionDestinationString"
    )(h);
  }
  function c(h) {
    return t.attempt(Y1, f, f)(h);
  }
  function f(h) {
    return ce(h) ? he(t, d, "whitespace")(h) : d(h);
  }
  function d(h) {
    return h === null || Y(h) ? (t.exit("definition"), r.parser.defined.push(i), e(h)) : n(h);
  }
}
function X1(t, e, n) {
  return r;
  function r(l) {
    return Ce(l) ? co(t, i)(l) : n(l);
  }
  function i(l) {
    return Cp(t, o, n, "definitionTitle", "definitionTitleMarker", "definitionTitleString")(l);
  }
  function o(l) {
    return ce(l) ? he(t, s, "whitespace")(l) : s(l);
  }
  function s(l) {
    return l === null || Y(l) ? e(l) : n(l);
  }
}
const Z1 = {
  name: "hardBreakEscape",
  tokenize: eb
};
function eb(t, e, n) {
  return r;
  function r(o) {
    return t.enter("hardBreakEscape"), t.consume(o), i;
  }
  function i(o) {
    return Y(o) ? (t.exit("hardBreakEscape"), e(o)) : n(o);
  }
}
const tb = {
  name: "headingAtx",
  resolve: nb,
  tokenize: rb
};
function nb(t, e) {
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
  }, Nt(t, r, n - r + 1, [["enter", i, e], ["enter", o, e], ["exit", o, e], ["exit", i, e]])), t;
}
function rb(t, e, n) {
  let r = 0;
  return i;
  function i(c) {
    return t.enter("atxHeading"), o(c);
  }
  function o(c) {
    return t.enter("atxHeadingSequence"), s(c);
  }
  function s(c) {
    return c === 35 && r++ < 6 ? (t.consume(c), s) : c === null || Ce(c) ? (t.exit("atxHeadingSequence"), l(c)) : n(c);
  }
  function l(c) {
    return c === 35 ? (t.enter("atxHeadingSequence"), a(c)) : c === null || Y(c) ? (t.exit("atxHeading"), e(c)) : ce(c) ? he(t, l, "whitespace")(c) : (t.enter("atxHeadingText"), u(c));
  }
  function a(c) {
    return c === 35 ? (t.consume(c), a) : (t.exit("atxHeadingSequence"), l(c));
  }
  function u(c) {
    return c === null || c === 35 || Ce(c) ? (t.exit("atxHeadingText"), l(c)) : (t.consume(c), u);
  }
}
const ib = [
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
], Wf = ["pre", "script", "style", "textarea"], ob = {
  concrete: !0,
  name: "htmlFlow",
  resolveTo: ab,
  tokenize: ub
}, sb = {
  partial: !0,
  tokenize: fb
}, lb = {
  partial: !0,
  tokenize: cb
};
function ab(t) {
  let e = t.length;
  for (; e-- && !(t[e][0] === "enter" && t[e][1].type === "htmlFlow"); )
    ;
  return e > 1 && t[e - 2][1].type === "linePrefix" && (t[e][1].start = t[e - 2][1].start, t[e + 1][1].start = t[e - 2][1].start, t.splice(e - 2, 2)), t;
}
function ub(t, e, n) {
  const r = this;
  let i, o, s, l, a;
  return u;
  function u(S) {
    return c(S);
  }
  function c(S) {
    return t.enter("htmlFlow"), t.enter("htmlFlowData"), t.consume(S), f;
  }
  function f(S) {
    return S === 33 ? (t.consume(S), d) : S === 47 ? (t.consume(S), o = !0, k) : S === 63 ? (t.consume(S), i = 3, r.interrupt ? e : C) : st(S) ? (t.consume(S), s = String.fromCharCode(S), w) : n(S);
  }
  function d(S) {
    return S === 45 ? (t.consume(S), i = 2, h) : S === 91 ? (t.consume(S), i = 5, l = 0, p) : st(S) ? (t.consume(S), i = 4, r.interrupt ? e : C) : n(S);
  }
  function h(S) {
    return S === 45 ? (t.consume(S), r.interrupt ? e : C) : n(S);
  }
  function p(S) {
    const Fe = "CDATA[";
    return S === Fe.charCodeAt(l++) ? (t.consume(S), l === Fe.length ? r.interrupt ? e : q : p) : n(S);
  }
  function k(S) {
    return st(S) ? (t.consume(S), s = String.fromCharCode(S), w) : n(S);
  }
  function w(S) {
    if (S === null || S === 47 || S === 62 || Ce(S)) {
      const Fe = S === 47, Xe = s.toLowerCase();
      return !Fe && !o && Wf.includes(Xe) ? (i = 1, r.interrupt ? e(S) : q(S)) : ib.includes(s.toLowerCase()) ? (i = 6, Fe ? (t.consume(S), b) : r.interrupt ? e(S) : q(S)) : (i = 7, r.interrupt && !r.parser.lazy[r.now().line] ? n(S) : o ? L(S) : E(S));
    }
    return S === 45 || gt(S) ? (t.consume(S), s += String.fromCharCode(S), w) : n(S);
  }
  function b(S) {
    return S === 62 ? (t.consume(S), r.interrupt ? e : q) : n(S);
  }
  function L(S) {
    return ce(S) ? (t.consume(S), L) : A(S);
  }
  function E(S) {
    return S === 47 ? (t.consume(S), A) : S === 58 || S === 95 || st(S) ? (t.consume(S), j) : ce(S) ? (t.consume(S), E) : A(S);
  }
  function j(S) {
    return S === 45 || S === 46 || S === 58 || S === 95 || gt(S) ? (t.consume(S), j) : H(S);
  }
  function H(S) {
    return S === 61 ? (t.consume(S), T) : ce(S) ? (t.consume(S), H) : E(S);
  }
  function T(S) {
    return S === null || S === 60 || S === 61 || S === 62 || S === 96 ? n(S) : S === 34 || S === 39 ? (t.consume(S), a = S, z) : ce(S) ? (t.consume(S), T) : U(S);
  }
  function z(S) {
    return S === a ? (t.consume(S), a = null, G) : S === null || Y(S) ? n(S) : (t.consume(S), z);
  }
  function U(S) {
    return S === null || S === 34 || S === 39 || S === 47 || S === 60 || S === 61 || S === 62 || S === 96 || Ce(S) ? H(S) : (t.consume(S), U);
  }
  function G(S) {
    return S === 47 || S === 62 || ce(S) ? E(S) : n(S);
  }
  function A(S) {
    return S === 62 ? (t.consume(S), V) : n(S);
  }
  function V(S) {
    return S === null || Y(S) ? q(S) : ce(S) ? (t.consume(S), V) : n(S);
  }
  function q(S) {
    return S === 45 && i === 2 ? (t.consume(S), Ae) : S === 60 && i === 1 ? (t.consume(S), Ne) : S === 62 && i === 4 ? (t.consume(S), ae) : S === 63 && i === 3 ? (t.consume(S), C) : S === 93 && i === 5 ? (t.consume(S), je) : Y(S) && (i === 6 || i === 7) ? (t.exit("htmlFlowData"), t.check(sb, We, J)(S)) : S === null || Y(S) ? (t.exit("htmlFlowData"), J(S)) : (t.consume(S), q);
  }
  function J(S) {
    return t.check(lb, me, We)(S);
  }
  function me(S) {
    return t.enter("lineEnding"), t.consume(S), t.exit("lineEnding"), le;
  }
  function le(S) {
    return S === null || Y(S) ? J(S) : (t.enter("htmlFlowData"), q(S));
  }
  function Ae(S) {
    return S === 45 ? (t.consume(S), C) : q(S);
  }
  function Ne(S) {
    return S === 47 ? (t.consume(S), s = "", xe) : q(S);
  }
  function xe(S) {
    if (S === 62) {
      const Fe = s.toLowerCase();
      return Wf.includes(Fe) ? (t.consume(S), ae) : q(S);
    }
    return st(S) && s.length < 8 ? (t.consume(S), s += String.fromCharCode(S), xe) : q(S);
  }
  function je(S) {
    return S === 93 ? (t.consume(S), C) : q(S);
  }
  function C(S) {
    return S === 62 ? (t.consume(S), ae) : S === 45 && i === 2 ? (t.consume(S), C) : q(S);
  }
  function ae(S) {
    return S === null || Y(S) ? (t.exit("htmlFlowData"), We(S)) : (t.consume(S), ae);
  }
  function We(S) {
    return t.exit("htmlFlow"), e(S);
  }
}
function cb(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return Y(s) ? (t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), o) : n(s);
  }
  function o(s) {
    return r.parser.lazy[r.now().line] ? n(s) : e(s);
  }
}
function fb(t, e, n) {
  return r;
  function r(i) {
    return t.enter("lineEnding"), t.consume(i), t.exit("lineEnding"), t.attempt(ts, e, n);
  }
}
const db = {
  name: "htmlText",
  tokenize: hb
};
function hb(t, e, n) {
  const r = this;
  let i, o, s;
  return l;
  function l(C) {
    return t.enter("htmlText"), t.enter("htmlTextData"), t.consume(C), a;
  }
  function a(C) {
    return C === 33 ? (t.consume(C), u) : C === 47 ? (t.consume(C), H) : C === 63 ? (t.consume(C), E) : st(C) ? (t.consume(C), U) : n(C);
  }
  function u(C) {
    return C === 45 ? (t.consume(C), c) : C === 91 ? (t.consume(C), o = 0, p) : st(C) ? (t.consume(C), L) : n(C);
  }
  function c(C) {
    return C === 45 ? (t.consume(C), h) : n(C);
  }
  function f(C) {
    return C === null ? n(C) : C === 45 ? (t.consume(C), d) : Y(C) ? (s = f, Ne(C)) : (t.consume(C), f);
  }
  function d(C) {
    return C === 45 ? (t.consume(C), h) : f(C);
  }
  function h(C) {
    return C === 62 ? Ae(C) : C === 45 ? d(C) : f(C);
  }
  function p(C) {
    const ae = "CDATA[";
    return C === ae.charCodeAt(o++) ? (t.consume(C), o === ae.length ? k : p) : n(C);
  }
  function k(C) {
    return C === null ? n(C) : C === 93 ? (t.consume(C), w) : Y(C) ? (s = k, Ne(C)) : (t.consume(C), k);
  }
  function w(C) {
    return C === 93 ? (t.consume(C), b) : k(C);
  }
  function b(C) {
    return C === 62 ? Ae(C) : C === 93 ? (t.consume(C), b) : k(C);
  }
  function L(C) {
    return C === null || C === 62 ? Ae(C) : Y(C) ? (s = L, Ne(C)) : (t.consume(C), L);
  }
  function E(C) {
    return C === null ? n(C) : C === 63 ? (t.consume(C), j) : Y(C) ? (s = E, Ne(C)) : (t.consume(C), E);
  }
  function j(C) {
    return C === 62 ? Ae(C) : E(C);
  }
  function H(C) {
    return st(C) ? (t.consume(C), T) : n(C);
  }
  function T(C) {
    return C === 45 || gt(C) ? (t.consume(C), T) : z(C);
  }
  function z(C) {
    return Y(C) ? (s = z, Ne(C)) : ce(C) ? (t.consume(C), z) : Ae(C);
  }
  function U(C) {
    return C === 45 || gt(C) ? (t.consume(C), U) : C === 47 || C === 62 || Ce(C) ? G(C) : n(C);
  }
  function G(C) {
    return C === 47 ? (t.consume(C), Ae) : C === 58 || C === 95 || st(C) ? (t.consume(C), A) : Y(C) ? (s = G, Ne(C)) : ce(C) ? (t.consume(C), G) : Ae(C);
  }
  function A(C) {
    return C === 45 || C === 46 || C === 58 || C === 95 || gt(C) ? (t.consume(C), A) : V(C);
  }
  function V(C) {
    return C === 61 ? (t.consume(C), q) : Y(C) ? (s = V, Ne(C)) : ce(C) ? (t.consume(C), V) : G(C);
  }
  function q(C) {
    return C === null || C === 60 || C === 61 || C === 62 || C === 96 ? n(C) : C === 34 || C === 39 ? (t.consume(C), i = C, J) : Y(C) ? (s = q, Ne(C)) : ce(C) ? (t.consume(C), q) : (t.consume(C), me);
  }
  function J(C) {
    return C === i ? (t.consume(C), i = void 0, le) : C === null ? n(C) : Y(C) ? (s = J, Ne(C)) : (t.consume(C), J);
  }
  function me(C) {
    return C === null || C === 34 || C === 39 || C === 60 || C === 61 || C === 96 ? n(C) : C === 47 || C === 62 || Ce(C) ? G(C) : (t.consume(C), me);
  }
  function le(C) {
    return C === 47 || C === 62 || Ce(C) ? G(C) : n(C);
  }
  function Ae(C) {
    return C === 62 ? (t.consume(C), t.exit("htmlTextData"), t.exit("htmlText"), e) : n(C);
  }
  function Ne(C) {
    return t.exit("htmlTextData"), t.enter("lineEnding"), t.consume(C), t.exit("lineEnding"), xe;
  }
  function xe(C) {
    return ce(C) ? he(t, je, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(C) : je(C);
  }
  function je(C) {
    return t.enter("htmlTextData"), s(C);
  }
}
const Ou = {
  name: "labelEnd",
  resolveAll: yb,
  resolveTo: kb,
  tokenize: bb
}, pb = {
  tokenize: wb
}, mb = {
  tokenize: xb
}, gb = {
  tokenize: Cb
};
function yb(t) {
  let e = -1;
  const n = [];
  for (; ++e < t.length; ) {
    const r = t[e][1];
    if (n.push(t[e]), r.type === "labelImage" || r.type === "labelLink" || r.type === "labelEnd") {
      const i = r.type === "labelImage" ? 4 : 2;
      r.type = "data", e += i;
    }
  }
  return t.length !== n.length && Nt(t, 0, t.length, n), t;
}
function kb(t, e) {
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
  return l = [["enter", a, e], ["enter", u, e]], l = zt(l, t.slice(o + 1, o + r + 3)), l = zt(l, [["enter", c, e]]), l = zt(l, wl(e.parser.constructs.insideSpan.null, t.slice(o + r + 4, s - 3), e)), l = zt(l, [["exit", c, e], t[s - 2], t[s - 1], ["exit", u, e]]), l = zt(l, t.slice(s + 1)), l = zt(l, [["exit", a, e]]), Nt(t, o, t.length, l), t;
}
function bb(t, e, n) {
  const r = this;
  let i = r.events.length, o, s;
  for (; i--; )
    if ((r.events[i][1].type === "labelImage" || r.events[i][1].type === "labelLink") && !r.events[i][1]._balanced) {
      o = r.events[i][1];
      break;
    }
  return l;
  function l(d) {
    return o ? o._inactive ? f(d) : (s = r.parser.defined.includes(Kt(r.sliceSerialize({
      start: o.end,
      end: r.now()
    }))), t.enter("labelEnd"), t.enter("labelMarker"), t.consume(d), t.exit("labelMarker"), t.exit("labelEnd"), a) : n(d);
  }
  function a(d) {
    return d === 40 ? t.attempt(pb, c, s ? c : f)(d) : d === 91 ? t.attempt(mb, c, s ? u : f)(d) : s ? c(d) : f(d);
  }
  function u(d) {
    return t.attempt(gb, c, f)(d);
  }
  function c(d) {
    return e(d);
  }
  function f(d) {
    return o._balanced = !0, n(d);
  }
}
function wb(t, e, n) {
  return r;
  function r(f) {
    return t.enter("resource"), t.enter("resourceMarker"), t.consume(f), t.exit("resourceMarker"), i;
  }
  function i(f) {
    return Ce(f) ? co(t, o)(f) : o(f);
  }
  function o(f) {
    return f === 41 ? c(f) : wp(t, s, l, "resourceDestination", "resourceDestinationLiteral", "resourceDestinationLiteralMarker", "resourceDestinationRaw", "resourceDestinationString", 32)(f);
  }
  function s(f) {
    return Ce(f) ? co(t, a)(f) : c(f);
  }
  function l(f) {
    return n(f);
  }
  function a(f) {
    return f === 34 || f === 39 || f === 40 ? Cp(t, u, n, "resourceTitle", "resourceTitleMarker", "resourceTitleString")(f) : c(f);
  }
  function u(f) {
    return Ce(f) ? co(t, c)(f) : c(f);
  }
  function c(f) {
    return f === 41 ? (t.enter("resourceMarker"), t.consume(f), t.exit("resourceMarker"), t.exit("resource"), e) : n(f);
  }
}
function xb(t, e, n) {
  const r = this;
  return i;
  function i(l) {
    return xp.call(r, t, o, s, "reference", "referenceMarker", "referenceString")(l);
  }
  function o(l) {
    return r.parser.defined.includes(Kt(r.sliceSerialize(r.events[r.events.length - 1][1]).slice(1, -1))) ? e(l) : n(l);
  }
  function s(l) {
    return n(l);
  }
}
function Cb(t, e, n) {
  return r;
  function r(o) {
    return t.enter("reference"), t.enter("referenceMarker"), t.consume(o), t.exit("referenceMarker"), i;
  }
  function i(o) {
    return o === 93 ? (t.enter("referenceMarker"), t.consume(o), t.exit("referenceMarker"), t.exit("reference"), e) : n(o);
  }
}
const Sb = {
  name: "labelStartImage",
  resolveAll: Ou.resolveAll,
  tokenize: Mb
};
function Mb(t, e, n) {
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
const vb = {
  name: "labelStartLink",
  resolveAll: Ou.resolveAll,
  tokenize: Tb
};
function Tb(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return t.enter("labelLink"), t.enter("labelMarker"), t.consume(s), t.exit("labelMarker"), t.exit("labelLink"), o;
  }
  function o(s) {
    return s === 94 && "_hiddenFootnoteSupport" in r.parser.constructs ? n(s) : e(s);
  }
}
const _l = {
  name: "lineEnding",
  tokenize: Nb
};
function Nb(t, e) {
  return n;
  function n(r) {
    return t.enter("lineEnding"), t.consume(r), t.exit("lineEnding"), he(t, e, "linePrefix");
  }
}
const zs = {
  name: "thematicBreak",
  tokenize: Ib
};
function Ib(t, e, n) {
  let r = 0, i;
  return o;
  function o(u) {
    return t.enter("thematicBreak"), s(u);
  }
  function s(u) {
    return i = u, l(u);
  }
  function l(u) {
    return u === i ? (t.enter("thematicBreakSequence"), a(u)) : r >= 3 && (u === null || Y(u)) ? (t.exit("thematicBreak"), e(u)) : n(u);
  }
  function a(u) {
    return u === i ? (t.consume(u), r++, a) : (t.exit("thematicBreakSequence"), ce(u) ? he(t, l, "whitespace")(u) : l(u));
  }
}
const dt = {
  continuation: {
    tokenize: Db
  },
  exit: Lb,
  name: "list",
  tokenize: Ob
}, Ab = {
  partial: !0,
  tokenize: Pb
}, Eb = {
  partial: !0,
  tokenize: Rb
};
function Ob(t, e, n) {
  const r = this, i = r.events[r.events.length - 1];
  let o = i && i[1].type === "linePrefix" ? i[2].sliceSerialize(i[1], !0).length : 0, s = 0;
  return l;
  function l(h) {
    const p = r.containerState.type || (h === 42 || h === 43 || h === 45 ? "listUnordered" : "listOrdered");
    if (p === "listUnordered" ? !r.containerState.marker || h === r.containerState.marker : za(h)) {
      if (r.containerState.type || (r.containerState.type = p, t.enter(p, {
        _container: !0
      })), p === "listUnordered")
        return t.enter("listItemPrefix"), h === 42 || h === 45 ? t.check(zs, n, u)(h) : u(h);
      if (!r.interrupt || h === 49)
        return t.enter("listItemPrefix"), t.enter("listItemValue"), a(h);
    }
    return n(h);
  }
  function a(h) {
    return za(h) && ++s < 10 ? (t.consume(h), a) : (!r.interrupt || s < 2) && (r.containerState.marker ? h === r.containerState.marker : h === 41 || h === 46) ? (t.exit("listItemValue"), u(h)) : n(h);
  }
  function u(h) {
    return t.enter("listItemMarker"), t.consume(h), t.exit("listItemMarker"), r.containerState.marker = r.containerState.marker || h, t.check(
      ts,
      // Can’t be empty when interrupting.
      r.interrupt ? n : c,
      t.attempt(Ab, d, f)
    );
  }
  function c(h) {
    return r.containerState.initialBlankLine = !0, o++, d(h);
  }
  function f(h) {
    return ce(h) ? (t.enter("listItemPrefixWhitespace"), t.consume(h), t.exit("listItemPrefixWhitespace"), d) : n(h);
  }
  function d(h) {
    return r.containerState.size = o + r.sliceSerialize(t.exit("listItemPrefix"), !0).length, e(h);
  }
}
function Db(t, e, n) {
  const r = this;
  return r.containerState._closeFlow = void 0, t.check(ts, i, o);
  function i(l) {
    return r.containerState.furtherBlankLines = r.containerState.furtherBlankLines || r.containerState.initialBlankLine, he(t, e, "listItemIndent", r.containerState.size + 1)(l);
  }
  function o(l) {
    return r.containerState.furtherBlankLines || !ce(l) ? (r.containerState.furtherBlankLines = void 0, r.containerState.initialBlankLine = void 0, s(l)) : (r.containerState.furtherBlankLines = void 0, r.containerState.initialBlankLine = void 0, t.attempt(Eb, e, s)(l));
  }
  function s(l) {
    return r.containerState._closeFlow = !0, r.interrupt = void 0, he(t, t.attempt(dt, e, n), "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(l);
  }
}
function Rb(t, e, n) {
  const r = this;
  return he(t, i, "listItemIndent", r.containerState.size + 1);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return s && s[1].type === "listItemIndent" && s[2].sliceSerialize(s[1], !0).length === r.containerState.size ? e(o) : n(o);
  }
}
function Lb(t) {
  t.exit(this.containerState.type);
}
function Pb(t, e, n) {
  const r = this;
  return he(t, i, "listItemPrefixWhitespace", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 5);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return !ce(o) && s && s[1].type === "listItemPrefixWhitespace" ? e(o) : n(o);
  }
}
const qf = {
  name: "setextUnderline",
  resolveTo: zb,
  tokenize: Bb
};
function zb(t, e) {
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
function Bb(t, e, n) {
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
    return u === i ? (t.consume(u), l) : (t.exit("setextHeadingLineSequence"), ce(u) ? he(t, a, "lineSuffix")(u) : a(u));
  }
  function a(u) {
    return u === null || Y(u) ? (t.exit("setextHeadingLine"), e(u)) : n(u);
  }
}
const Fb = {
  tokenize: $b
};
function $b(t) {
  const e = this, n = t.attempt(
    // Try to parse a blank line.
    ts,
    r,
    // Try to parse initial flow (essentially, only code).
    t.attempt(this.parser.constructs.flowInitial, i, he(t, t.attempt(this.parser.constructs.flow, i, t.attempt(W1, i)), "linePrefix"))
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
const _b = {
  resolveAll: Mp()
}, Vb = Sp("string"), Hb = Sp("text");
function Sp(t) {
  return {
    resolveAll: Mp(t === "text" ? jb : void 0),
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
      let d = -1;
      if (f)
        for (; ++d < f.length; ) {
          const h = f[d];
          if (!h.previous || h.previous.call(r, r.previous))
            return !0;
        }
      return !1;
    }
  }
}
function Mp(t) {
  return e;
  function e(n, r) {
    let i = -1, o;
    for (; ++i <= n.length; )
      o === void 0 ? n[i] && n[i][1].type === "data" && (o = i, i++) : (!n[i] || n[i][1].type !== "data") && (i !== o + 2 && (n[o][1].end = n[i - 1][1].end, n.splice(o + 2, i - o - 2), i = o + 2), o = void 0);
    return t ? t(n, r) : n;
  }
}
function jb(t, e) {
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
const Wb = {
  42: dt,
  43: dt,
  45: dt,
  48: dt,
  49: dt,
  50: dt,
  51: dt,
  52: dt,
  53: dt,
  54: dt,
  55: dt,
  56: dt,
  57: dt,
  62: gp
}, qb = {
  91: G1
}, Kb = {
  [-2]: $l,
  [-1]: $l,
  32: $l
}, Ub = {
  35: tb,
  42: zs,
  45: [qf, zs],
  60: ob,
  61: qf,
  95: zs,
  96: jf,
  126: jf
}, Jb = {
  38: kp,
  92: yp
}, Gb = {
  [-5]: _l,
  [-4]: _l,
  [-3]: _l,
  33: Sb,
  38: kp,
  42: Ba,
  60: [v1, db],
  91: vb,
  92: [Z1, yp],
  93: Ou,
  95: Ba,
  96: F1
}, Yb = {
  null: [Ba, _b]
}, Qb = {
  null: [42, 95]
}, Xb = {
  null: []
}, Zb = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  attentionMarkers: Qb,
  contentInitial: qb,
  disable: Xb,
  document: Wb,
  flow: Ub,
  flowInitial: Kb,
  insideSpan: Yb,
  string: Jb,
  text: Gb
}, Symbol.toStringTag, { value: "Module" }));
function ew(t, e, n) {
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
    attempt: z(H),
    check: z(T),
    consume: L,
    enter: E,
    exit: j,
    interrupt: z(T, {
      interrupt: !0
    })
  }, u = {
    code: null,
    containerState: {},
    defineSkip: k,
    events: [],
    now: p,
    parser: t,
    previous: null,
    sliceSerialize: d,
    sliceStream: h,
    write: f
  };
  let c = e.tokenize.call(u, a);
  return e.resolveAll && o.push(e), u;
  function f(V) {
    return s = zt(s, V), w(), s[s.length - 1] !== null ? [] : (U(e, 0), u.events = wl(o, u.events, u), u.events);
  }
  function d(V, q) {
    return nw(h(V), q);
  }
  function h(V) {
    return tw(s, V);
  }
  function p() {
    const {
      _bufferIndex: V,
      _index: q,
      line: J,
      column: me,
      offset: le
    } = r;
    return {
      _bufferIndex: V,
      _index: q,
      line: J,
      column: me,
      offset: le
    };
  }
  function k(V) {
    i[V.line] = V.column, A();
  }
  function w() {
    let V;
    for (; r._index < s.length; ) {
      const q = s[r._index];
      if (typeof q == "string")
        for (V = r._index, r._bufferIndex < 0 && (r._bufferIndex = 0); r._index === V && r._bufferIndex < q.length; )
          b(q.charCodeAt(r._bufferIndex));
      else
        b(q);
    }
  }
  function b(V) {
    c = c(V);
  }
  function L(V) {
    Y(V) ? (r.line++, r.column = 1, r.offset += V === -3 ? 2 : 1, A()) : V !== -1 && (r.column++, r.offset++), r._bufferIndex < 0 ? r._index++ : (r._bufferIndex++, r._bufferIndex === // Points w/ non-negative `_bufferIndex` reference
    // strings.
    /** @type {string} */
    s[r._index].length && (r._bufferIndex = -1, r._index++)), u.previous = V;
  }
  function E(V, q) {
    const J = q || {};
    return J.type = V, J.start = p(), u.events.push(["enter", J, u]), l.push(J), J;
  }
  function j(V) {
    const q = l.pop();
    return q.end = p(), u.events.push(["exit", q, u]), q;
  }
  function H(V, q) {
    U(V, q.from);
  }
  function T(V, q) {
    q.restore();
  }
  function z(V, q) {
    return J;
    function J(me, le, Ae) {
      let Ne, xe, je, C;
      return Array.isArray(me) ? (
        /* c8 ignore next 1 */
        We(me)
      ) : "tokenize" in me ? (
        // Looks like a construct.
        We([
          /** @type {Construct} */
          me
        ])
      ) : ae(me);
      function ae(te) {
        return Ct;
        function Ct(se) {
          const qe = se !== null && te[se], ct = se !== null && te.null, $e = [
            // To do: add more extension tests.
            /* c8 ignore next 2 */
            ...Array.isArray(qe) ? qe : qe ? [qe] : [],
            ...Array.isArray(ct) ? ct : ct ? [ct] : []
          ];
          return We($e)(se);
        }
      }
      function We(te) {
        return Ne = te, xe = 0, te.length === 0 ? Ae : S(te[xe]);
      }
      function S(te) {
        return Ct;
        function Ct(se) {
          return C = G(), je = te, te.partial || (u.currentConstruct = te), te.name && u.parser.constructs.disable.null.includes(te.name) ? Xe() : te.tokenize.call(
            // If we do have fields, create an object w/ `context` as its
            // prototype.
            // This allows a “live binding”, which is needed for `interrupt`.
            q ? Object.assign(Object.create(u), q) : u,
            a,
            Fe,
            Xe
          )(se);
        }
      }
      function Fe(te) {
        return V(je, C), le;
      }
      function Xe(te) {
        return C.restore(), ++xe < Ne.length ? S(Ne[xe]) : Ae;
      }
    }
  }
  function U(V, q) {
    V.resolveAll && !o.includes(V) && o.push(V), V.resolve && Nt(u.events, q, u.events.length - q, V.resolve(u.events.slice(q), u)), V.resolveTo && (u.events = V.resolveTo(u.events, u));
  }
  function G() {
    const V = p(), q = u.previous, J = u.currentConstruct, me = u.events.length, le = Array.from(l);
    return {
      from: me,
      restore: Ae
    };
    function Ae() {
      r = V, u.previous = q, u.currentConstruct = J, u.events.length = me, l = le, A();
    }
  }
  function A() {
    r.line in i && r.column < 2 && (r.column = i[r.line], r.offset += i[r.line] - 1);
  }
}
function tw(t, e) {
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
function nw(t, e) {
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
function rw(t) {
  const r = {
    constructs: (
      /** @type {FullNormalizedExtension} */
      pp([Zb, ...(t || {}).extensions || []])
    ),
    content: i(k1),
    defined: [],
    document: i(w1),
    flow: i(Fb),
    lazy: {},
    string: i(Vb),
    text: i(Hb)
  };
  return r;
  function i(o) {
    return s;
    function s(l) {
      return ew(r, o, l);
    }
  }
}
function iw(t) {
  for (; !bp(t); )
    ;
  return t;
}
const Kf = /[\0\t\n\r]/g;
function ow() {
  let t = 1, e = "", n = !0, r;
  return i;
  function i(o, s, l) {
    const a = [];
    let u, c, f, d, h;
    for (o = e + (typeof o == "string" ? o.toString() : new TextDecoder(s || void 0).decode(o)), f = 0, e = "", n && (o.charCodeAt(0) === 65279 && f++, n = void 0); f < o.length; ) {
      if (Kf.lastIndex = f, u = Kf.exec(o), d = u && u.index !== void 0 ? u.index : o.length, h = o.charCodeAt(d), !u) {
        e = o.slice(f);
        break;
      }
      if (h === 10 && f === d && r)
        a.push(-3), r = void 0;
      else
        switch (r && (a.push(-5), r = void 0), f < d && (a.push(o.slice(f, d)), t += d - f), h) {
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
      f = d + 1;
    }
    return l && (r && a.push(-5), e && a.push(e), a.push(null)), a;
  }
}
const sw = /\\([!-/:-@[-`{-~])|&(#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});/gi;
function vp(t) {
  return t.replace(sw, lw);
}
function lw(t, e, n) {
  if (e)
    return e;
  if (n.charCodeAt(0) === 35) {
    const i = n.charCodeAt(1), o = i === 120 || i === 88;
    return mp(n.slice(o ? 2 : 1), o ? 16 : 10);
  }
  return Eu(n) || t;
}
function fo(t) {
  return !t || typeof t != "object" ? "" : "position" in t || "type" in t ? Uf(t.position) : "start" in t || "end" in t ? Uf(t) : "line" in t || "column" in t ? Fa(t) : "";
}
function Fa(t) {
  return Jf(t && t.line) + ":" + Jf(t && t.column);
}
function Uf(t) {
  return Fa(t && t.start) + "-" + Fa(t && t.end);
}
function Jf(t) {
  return t && typeof t == "number" ? t : 1;
}
const Tp = {}.hasOwnProperty;
function Du(t, e, n) {
  return e && typeof e == "object" && (n = e, e = void 0), aw(n)(iw(rw(n).document().write(ow()(t, e, !0))));
}
function aw(t) {
  const e = {
    transforms: [],
    canContainEols: ["emphasis", "fragment", "heading", "paragraph", "strong"],
    enter: {
      autolink: o(Gi),
      autolinkProtocol: G,
      autolinkEmail: G,
      atxHeading: o(cn),
      blockQuote: o(ct),
      characterEscape: G,
      characterReference: G,
      codeFenced: o($e),
      codeFencedFenceInfo: s,
      codeFencedFenceMeta: s,
      codeIndented: o($e, s),
      codeText: o(Ur, s),
      codeTextData: G,
      data: G,
      codeFlowValue: G,
      definition: o(Dn),
      definitionDestinationString: s,
      definitionLabelString: s,
      definitionTitleString: s,
      emphasis: o(Ll),
      hardBreakEscape: o(Re),
      hardBreakTrailing: o(Re),
      htmlFlow: o(bs, s),
      htmlFlowData: G,
      htmlText: o(bs, s),
      htmlTextData: G,
      image: o(ws),
      label: s,
      link: o(Gi),
      listItem: o(Yi),
      listItemValue: d,
      listOrdered: o(Ke, f),
      listUnordered: o(Ke),
      paragraph: o(xs),
      reference: S,
      referenceString: s,
      resourceDestinationString: s,
      resourceTitleString: s,
      setextHeading: o(cn),
      strong: o(ue),
      thematicBreak: o(Cs)
    },
    exit: {
      atxHeading: a(),
      atxHeadingSequence: H,
      autolink: a(),
      autolinkEmail: qe,
      autolinkProtocol: se,
      blockQuote: a(),
      characterEscapeValue: A,
      characterReferenceMarkerHexadecimal: Xe,
      characterReferenceMarkerNumeric: Xe,
      characterReferenceValue: te,
      characterReference: Ct,
      codeFenced: a(w),
      codeFencedFence: k,
      codeFencedFenceInfo: h,
      codeFencedFenceMeta: p,
      codeFlowValue: A,
      codeIndented: a(b),
      codeText: a(le),
      codeTextData: A,
      data: A,
      definition: a(),
      definitionDestinationString: j,
      definitionLabelString: L,
      definitionTitleString: E,
      emphasis: a(),
      hardBreakEscape: a(q),
      hardBreakTrailing: a(q),
      htmlFlow: a(J),
      htmlFlowData: A,
      htmlText: a(me),
      htmlTextData: A,
      image: a(Ne),
      label: je,
      labelText: xe,
      lineEnding: V,
      link: a(Ae),
      listItem: a(),
      listOrdered: a(),
      listUnordered: a(),
      paragraph: a(),
      referenceString: Fe,
      resourceDestinationString: C,
      resourceTitleString: ae,
      resource: We,
      setextHeading: a(U),
      setextHeadingLineSequence: z,
      setextHeadingText: T,
      strong: a(),
      thematicBreak: a()
    }
  };
  Np(e, (t || {}).mdastExtensions || []);
  const n = {};
  return r;
  function r(O) {
    let $ = {
      type: "root",
      children: []
    };
    const Q = {
      stack: [$],
      tokenStack: [],
      config: e,
      enter: l,
      exit: u,
      buffer: s,
      resume: c,
      data: n
    }, ne = [];
    let we = -1;
    for (; ++we < O.length; )
      if (O[we][1].type === "listOrdered" || O[we][1].type === "listUnordered")
        if (O[we][0] === "enter")
          ne.push(we);
        else {
          const Ue = ne.pop();
          we = i(O, Ue, we);
        }
    for (we = -1; ++we < O.length; ) {
      const Ue = e[O[we][0]];
      Tp.call(Ue, O[we][1].type) && Ue[O[we][1].type].call(Object.assign({
        sliceSerialize: O[we][2].sliceSerialize
      }, Q), O[we][1]);
    }
    if (Q.tokenStack.length > 0) {
      const Ue = Q.tokenStack[Q.tokenStack.length - 1];
      (Ue[1] || Gf).call(Q, void 0, Ue[0]);
    }
    for ($.position = {
      start: zn(O.length > 0 ? O[0][1].start : {
        line: 1,
        column: 1,
        offset: 0
      }),
      end: zn(O.length > 0 ? O[O.length - 2][1].end : {
        line: 1,
        column: 1,
        offset: 0
      })
    }, we = -1; ++we < e.transforms.length; )
      $ = e.transforms[we]($) || $;
    return $;
  }
  function i(O, $, Q) {
    let ne = $ - 1, we = -1, Ue = !1, Ht, ft, ar, ur;
    for (; ++ne <= Q; ) {
      const it = O[ne];
      switch (it[1].type) {
        case "listUnordered":
        case "listOrdered":
        case "blockQuote": {
          it[0] === "enter" ? we++ : we--, ur = void 0;
          break;
        }
        case "lineEndingBlank": {
          it[0] === "enter" && (Ht && !ur && !we && !ar && (ar = ne), ur = void 0);
          break;
        }
        case "linePrefix":
        case "listItemValue":
        case "listItemMarker":
        case "listItemPrefix":
        case "listItemPrefixWhitespace":
          break;
        default:
          ur = void 0;
      }
      if (!we && it[0] === "enter" && it[1].type === "listItemPrefix" || we === -1 && it[0] === "exit" && (it[1].type === "listUnordered" || it[1].type === "listOrdered")) {
        if (Ht) {
          let Rn = ne;
          for (ft = void 0; Rn--; ) {
            const Et = O[Rn];
            if (Et[1].type === "lineEnding" || Et[1].type === "lineEndingBlank") {
              if (Et[0] === "exit") continue;
              ft && (O[ft][1].type = "lineEndingBlank", Ue = !0), Et[1].type = "lineEnding", ft = Rn;
            } else if (!(Et[1].type === "linePrefix" || Et[1].type === "blockQuotePrefix" || Et[1].type === "blockQuotePrefixWhitespace" || Et[1].type === "blockQuoteMarker" || Et[1].type === "listItemIndent")) break;
          }
          ar && (!ft || ar < ft) && (Ht._spread = !0), Ht.end = Object.assign({}, ft ? O[ft][1].start : it[1].end), O.splice(ft || ne, 0, ["exit", Ht, it[2]]), ne++, Q++;
        }
        if (it[1].type === "listItemPrefix") {
          const Rn = {
            type: "listItem",
            _spread: !1,
            start: Object.assign({}, it[1].start),
            // @ts-expect-error: we’ll add `end` in a second.
            end: void 0
          };
          Ht = Rn, O.splice(ne, 0, ["enter", Rn, it[2]]), ne++, Q++, ar = void 0, ur = !0;
        }
      }
    }
    return O[$][1]._spread = Ue, Q;
  }
  function o(O, $) {
    return Q;
    function Q(ne) {
      l.call(this, O(ne), ne), $ && $.call(this, ne);
    }
  }
  function s() {
    this.stack.push({
      type: "fragment",
      children: []
    });
  }
  function l(O, $, Q) {
    this.stack[this.stack.length - 1].children.push(O), this.stack.push(O), this.tokenStack.push([$, Q || void 0]), O.position = {
      start: zn($.start),
      // @ts-expect-error: `end` will be patched later.
      end: void 0
    };
  }
  function a(O) {
    return $;
    function $(Q) {
      O && O.call(this, Q), u.call(this, Q);
    }
  }
  function u(O, $) {
    const Q = this.stack.pop(), ne = this.tokenStack.pop();
    if (ne)
      ne[0].type !== O.type && ($ ? $.call(this, O, ne[0]) : (ne[1] || Gf).call(this, O, ne[0]));
    else throw new Error("Cannot close `" + O.type + "` (" + fo({
      start: O.start,
      end: O.end
    }) + "): it’s not open");
    Q.position.end = zn(O.end);
  }
  function c() {
    return Au(this.stack.pop());
  }
  function f() {
    this.data.expectingFirstListItemValue = !0;
  }
  function d(O) {
    if (this.data.expectingFirstListItemValue) {
      const $ = this.stack[this.stack.length - 2];
      $.start = Number.parseInt(this.sliceSerialize(O), 10), this.data.expectingFirstListItemValue = void 0;
    }
  }
  function h() {
    const O = this.resume(), $ = this.stack[this.stack.length - 1];
    $.lang = O;
  }
  function p() {
    const O = this.resume(), $ = this.stack[this.stack.length - 1];
    $.meta = O;
  }
  function k() {
    this.data.flowCodeInside || (this.buffer(), this.data.flowCodeInside = !0);
  }
  function w() {
    const O = this.resume(), $ = this.stack[this.stack.length - 1];
    $.value = O.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, ""), this.data.flowCodeInside = void 0;
  }
  function b() {
    const O = this.resume(), $ = this.stack[this.stack.length - 1];
    $.value = O.replace(/(\r?\n|\r)$/g, "");
  }
  function L(O) {
    const $ = this.resume(), Q = this.stack[this.stack.length - 1];
    Q.label = $, Q.identifier = Kt(this.sliceSerialize(O)).toLowerCase();
  }
  function E() {
    const O = this.resume(), $ = this.stack[this.stack.length - 1];
    $.title = O;
  }
  function j() {
    const O = this.resume(), $ = this.stack[this.stack.length - 1];
    $.url = O;
  }
  function H(O) {
    const $ = this.stack[this.stack.length - 1];
    if (!$.depth) {
      const Q = this.sliceSerialize(O).length;
      $.depth = Q;
    }
  }
  function T() {
    this.data.setextHeadingSlurpLineEnding = !0;
  }
  function z(O) {
    const $ = this.stack[this.stack.length - 1];
    $.depth = this.sliceSerialize(O).codePointAt(0) === 61 ? 1 : 2;
  }
  function U() {
    this.data.setextHeadingSlurpLineEnding = void 0;
  }
  function G(O) {
    const Q = this.stack[this.stack.length - 1].children;
    let ne = Q[Q.length - 1];
    (!ne || ne.type !== "text") && (ne = lr(), ne.position = {
      start: zn(O.start),
      // @ts-expect-error: we’ll add `end` later.
      end: void 0
    }, Q.push(ne)), this.stack.push(ne);
  }
  function A(O) {
    const $ = this.stack.pop();
    $.value += this.sliceSerialize(O), $.position.end = zn(O.end);
  }
  function V(O) {
    const $ = this.stack[this.stack.length - 1];
    if (this.data.atHardBreak) {
      const Q = $.children[$.children.length - 1];
      Q.position.end = zn(O.end), this.data.atHardBreak = void 0;
      return;
    }
    !this.data.setextHeadingSlurpLineEnding && e.canContainEols.includes($.type) && (G.call(this, O), A.call(this, O));
  }
  function q() {
    this.data.atHardBreak = !0;
  }
  function J() {
    const O = this.resume(), $ = this.stack[this.stack.length - 1];
    $.value = O;
  }
  function me() {
    const O = this.resume(), $ = this.stack[this.stack.length - 1];
    $.value = O;
  }
  function le() {
    const O = this.resume(), $ = this.stack[this.stack.length - 1];
    $.value = O;
  }
  function Ae() {
    const O = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const $ = this.data.referenceType || "shortcut";
      O.type += "Reference", O.referenceType = $, delete O.url, delete O.title;
    } else
      delete O.identifier, delete O.label;
    this.data.referenceType = void 0;
  }
  function Ne() {
    const O = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const $ = this.data.referenceType || "shortcut";
      O.type += "Reference", O.referenceType = $, delete O.url, delete O.title;
    } else
      delete O.identifier, delete O.label;
    this.data.referenceType = void 0;
  }
  function xe(O) {
    const $ = this.sliceSerialize(O), Q = this.stack[this.stack.length - 2];
    Q.label = vp($), Q.identifier = Kt($).toLowerCase();
  }
  function je() {
    const O = this.stack[this.stack.length - 1], $ = this.resume(), Q = this.stack[this.stack.length - 1];
    if (this.data.inReference = !0, Q.type === "link") {
      const ne = O.children;
      Q.children = ne;
    } else
      Q.alt = $;
  }
  function C() {
    const O = this.resume(), $ = this.stack[this.stack.length - 1];
    $.url = O;
  }
  function ae() {
    const O = this.resume(), $ = this.stack[this.stack.length - 1];
    $.title = O;
  }
  function We() {
    this.data.inReference = void 0;
  }
  function S() {
    this.data.referenceType = "collapsed";
  }
  function Fe(O) {
    const $ = this.resume(), Q = this.stack[this.stack.length - 1];
    Q.label = $, Q.identifier = Kt(this.sliceSerialize(O)).toLowerCase(), this.data.referenceType = "full";
  }
  function Xe(O) {
    this.data.characterReferenceType = O.type;
  }
  function te(O) {
    const $ = this.sliceSerialize(O), Q = this.data.characterReferenceType;
    let ne;
    Q ? (ne = mp($, Q === "characterReferenceMarkerNumeric" ? 10 : 16), this.data.characterReferenceType = void 0) : ne = Eu($);
    const we = this.stack[this.stack.length - 1];
    we.value += ne;
  }
  function Ct(O) {
    const $ = this.stack.pop();
    $.position.end = zn(O.end);
  }
  function se(O) {
    A.call(this, O);
    const $ = this.stack[this.stack.length - 1];
    $.url = this.sliceSerialize(O);
  }
  function qe(O) {
    A.call(this, O);
    const $ = this.stack[this.stack.length - 1];
    $.url = "mailto:" + this.sliceSerialize(O);
  }
  function ct() {
    return {
      type: "blockquote",
      children: []
    };
  }
  function $e() {
    return {
      type: "code",
      lang: null,
      meta: null,
      value: ""
    };
  }
  function Ur() {
    return {
      type: "inlineCode",
      value: ""
    };
  }
  function Dn() {
    return {
      type: "definition",
      identifier: "",
      label: null,
      title: null,
      url: ""
    };
  }
  function Ll() {
    return {
      type: "emphasis",
      children: []
    };
  }
  function cn() {
    return {
      type: "heading",
      // @ts-expect-error `depth` will be set later.
      depth: 0,
      children: []
    };
  }
  function Re() {
    return {
      type: "break"
    };
  }
  function bs() {
    return {
      type: "html",
      value: ""
    };
  }
  function ws() {
    return {
      type: "image",
      title: null,
      url: "",
      alt: null
    };
  }
  function Gi() {
    return {
      type: "link",
      title: null,
      url: "",
      children: []
    };
  }
  function Ke(O) {
    return {
      type: "list",
      ordered: O.type === "listOrdered",
      start: null,
      spread: O._spread,
      children: []
    };
  }
  function Yi(O) {
    return {
      type: "listItem",
      spread: O._spread,
      checked: null,
      children: []
    };
  }
  function xs() {
    return {
      type: "paragraph",
      children: []
    };
  }
  function ue() {
    return {
      type: "strong",
      children: []
    };
  }
  function lr() {
    return {
      type: "text",
      value: ""
    };
  }
  function Cs() {
    return {
      type: "thematicBreak"
    };
  }
}
function zn(t) {
  return {
    line: t.line,
    column: t.column,
    offset: t.offset
  };
}
function Np(t, e) {
  let n = -1;
  for (; ++n < e.length; ) {
    const r = e[n];
    Array.isArray(r) ? Np(t, r) : uw(t, r);
  }
}
function uw(t, e) {
  let n;
  for (n in e)
    if (Tp.call(e, n))
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
function Gf(t, e) {
  throw t ? new Error("Cannot close `" + t.type + "` (" + fo({
    start: t.start,
    end: t.end
  }) + "): a different token (`" + e.type + "`, " + fo({
    start: e.start,
    end: e.end
  }) + ") is open") : new Error("Cannot close document, a token (`" + e.type + "`, " + fo({
    start: e.start,
    end: e.end
  }) + ") is still open");
}
function $a(t) {
  const e = this;
  e.parser = n;
  function n(r) {
    return Du(r, {
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
const Yf = {}.hasOwnProperty;
function cw(t, e) {
  const n = e || {};
  function r(i, ...o) {
    let s = r.invalid;
    const l = r.handlers;
    if (i && Yf.call(i, t)) {
      const a = String(i[t]);
      s = Yf.call(l, a) ? l[a] : r.unknown;
    }
    if (s)
      return s.call(this, i, ...o);
  }
  return r.handlers = n.handlers || {}, r.invalid = n.invalid, r.unknown = n.unknown, r;
}
const fw = {}.hasOwnProperty;
function Ip(t, e) {
  let n = -1, r;
  if (e.extensions)
    for (; ++n < e.extensions.length; )
      Ip(t, e.extensions[n]);
  for (r in e)
    if (fw.call(e, r))
      switch (r) {
        case "extensions":
          break;
        case "unsafe": {
          Qf(t[r], e[r]);
          break;
        }
        case "join": {
          Qf(t[r], e[r]);
          break;
        }
        case "handlers": {
          dw(t[r], e[r]);
          break;
        }
        default:
          t.options[r] = e[r];
      }
  return t;
}
function Qf(t, e) {
  e && t.push(...e);
}
function dw(t, e) {
  e && Object.assign(t, e);
}
function hw(t, e, n, r) {
  const i = n.enter("blockquote"), o = n.createTracker(r);
  o.move("> "), o.shift(2);
  const s = n.indentLines(
    n.containerFlow(t, o.current()),
    pw
  );
  return i(), s;
}
function pw(t, e, n) {
  return ">" + (n ? "" : " ") + t;
}
function Ap(t, e) {
  return Xf(t, e.inConstruct, !0) && !Xf(t, e.notInConstruct, !1);
}
function Xf(t, e, n) {
  if (typeof e == "string" && (e = [e]), !e || e.length === 0)
    return n;
  let r = -1;
  for (; ++r < e.length; )
    if (t.includes(e[r]))
      return !0;
  return !1;
}
function Zf(t, e, n, r) {
  let i = -1;
  for (; ++i < n.unsafe.length; )
    if (n.unsafe[i].character === `
` && Ap(n.stack, n.unsafe[i]))
      return /[ \t]/.test(r.before) ? "" : " ";
  return `\\
`;
}
function mw(t, e) {
  const n = String(t);
  let r = n.indexOf(e), i = r, o = 0, s = 0;
  if (typeof e != "string")
    throw new TypeError("Expected substring");
  for (; r !== -1; )
    r === i ? ++o > s && (s = o) : o = 1, i = r + e.length, r = n.indexOf(e, i);
  return s;
}
function _a(t, e) {
  return !!(e.options.fences === !1 && t.value && // If there’s no info…
  !t.lang && // And there’s a non-whitespace character…
  /[^ \r\n]/.test(t.value) && // And the value doesn’t start or end in a blank…
  !/^[\t ]*(?:[\r\n]|$)|(?:^|[\r\n])[\t ]*$/.test(t.value));
}
function gw(t) {
  const e = t.options.fence || "`";
  if (e !== "`" && e !== "~")
    throw new Error(
      "Cannot serialize code with `" + e + "` for `options.fence`, expected `` ` `` or `~`"
    );
  return e;
}
function yw(t, e, n, r) {
  const i = gw(n), o = t.value || "", s = i === "`" ? "GraveAccent" : "Tilde";
  if (_a(t, n)) {
    const f = n.enter("codeIndented"), d = n.indentLines(o, kw);
    return f(), d;
  }
  const l = n.createTracker(r), a = i.repeat(Math.max(mw(o, i) + 1, 3)), u = n.enter("codeFenced");
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
function kw(t, e, n) {
  return (n ? "" : "    ") + t;
}
function Ru(t) {
  const e = t.options.quote || '"';
  if (e !== '"' && e !== "'")
    throw new Error(
      "Cannot serialize title with `" + e + "` for `options.quote`, expected `\"`, or `'`"
    );
  return e;
}
function bw(t, e, n, r) {
  const i = Ru(n), o = i === '"' ? "Quote" : "Apostrophe", s = n.enter("definition");
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
function ww(t) {
  const e = t.options.emphasis || "*";
  if (e !== "*" && e !== "_")
    throw new Error(
      "Cannot serialize emphasis with `" + e + "` for `options.emphasis`, expected `*`, or `_`"
    );
  return e;
}
function tr(t) {
  return "&#x" + t.toString(16).toUpperCase() + ";";
}
function Zs(t, e, n) {
  const r = Oi(t), i = Oi(e);
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
Ep.peek = xw;
function Ep(t, e, n, r) {
  const i = ww(n), o = n.enter("emphasis"), s = n.createTracker(r), l = s.move(i);
  let a = s.move(
    n.containerPhrasing(t, {
      after: i,
      before: l,
      ...s.current()
    })
  );
  const u = a.charCodeAt(0), c = Zs(
    r.before.charCodeAt(r.before.length - 1),
    u,
    i
  );
  c.inside && (a = tr(u) + a.slice(1));
  const f = a.charCodeAt(a.length - 1), d = Zs(r.after.charCodeAt(0), f, i);
  d.inside && (a = a.slice(0, -1) + tr(f));
  const h = s.move(i);
  return o(), n.attentionEncodeSurroundingInfo = {
    after: d.outside,
    before: c.outside
  }, l + a + h;
}
function xw(t, e, n) {
  return n.options.emphasis || "*";
}
const xl = (
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
      return vw;
    if (typeof t == "function")
      return Cl(t);
    if (typeof t == "object")
      return Array.isArray(t) ? Cw(t) : (
        // Cast because `ReadonlyArray` goes into the above but `isArray`
        // narrows to `Array`.
        Sw(
          /** @type {Props} */
          t
        )
      );
    if (typeof t == "string")
      return Mw(t);
    throw new Error("Expected function, string, or object as test");
  }
);
function Cw(t) {
  const e = [];
  let n = -1;
  for (; ++n < t.length; )
    e[n] = xl(t[n]);
  return Cl(r);
  function r(...i) {
    let o = -1;
    for (; ++o < e.length; )
      if (e[o].apply(this, i)) return !0;
    return !1;
  }
}
function Sw(t) {
  const e = (
    /** @type {Record<string, unknown>} */
    t
  );
  return Cl(n);
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
function Mw(t) {
  return Cl(e);
  function e(n) {
    return n && n.type === t;
  }
}
function Cl(t) {
  return e;
  function e(n, r, i) {
    return !!(Tw(n) && t.call(
      this,
      n,
      typeof r == "number" ? r : void 0,
      i || void 0
    ));
  }
}
function vw() {
  return !0;
}
function Tw(t) {
  return t !== null && typeof t == "object" && "type" in t;
}
const Op = [], Nw = !0, Va = !1, Ha = "skip";
function Lu(t, e, n, r) {
  let i;
  typeof e == "function" && typeof n != "function" ? (r = n, n = e) : i = e;
  const o = xl(i), s = r ? -1 : 1;
  l(t, void 0, [])();
  function l(a, u, c) {
    const f = (
      /** @type {Record<string, unknown>} */
      a && typeof a == "object" ? a : {}
    );
    if (typeof f.type == "string") {
      const h = (
        // `hast`
        typeof f.tagName == "string" ? f.tagName : (
          // `xast`
          typeof f.name == "string" ? f.name : void 0
        )
      );
      Object.defineProperty(d, "name", {
        value: "node (" + (a.type + (h ? "<" + h + ">" : "")) + ")"
      });
    }
    return d;
    function d() {
      let h = Op, p, k, w;
      if ((!e || o(a, u, c[c.length - 1] || void 0)) && (h = Iw(n(a, c)), h[0] === Va))
        return h;
      if ("children" in a && a.children) {
        const b = (
          /** @type {UnistParent} */
          a
        );
        if (b.children && h[0] !== Ha)
          for (k = (r ? b.children.length : -1) + s, w = c.concat(b); k > -1 && k < b.children.length; ) {
            const L = b.children[k];
            if (p = l(L, k, w)(), p[0] === Va)
              return p;
            k = typeof p[1] == "number" ? p[1] : k + s;
          }
      }
      return h;
    }
  }
}
function Iw(t) {
  return Array.isArray(t) ? t : typeof t == "number" ? [Nw, t] : t == null ? Op : [t];
}
function $i(t, e, n, r) {
  let i, o, s;
  typeof e == "function" && typeof n != "function" ? (o = void 0, s = e, i = n) : (o = e, s = n, i = r), Lu(t, o, l, i);
  function l(a, u) {
    const c = u[u.length - 1], f = c ? c.children.indexOf(a) : void 0;
    return s(a, f, c);
  }
}
function Dp(t, e) {
  let n = !1;
  return $i(t, function(r) {
    if ("value" in r && /\r?\n|\r/.test(r.value) || r.type === "break")
      return n = !0, Va;
  }), !!((!t.depth || t.depth < 3) && Au(t) && (e.options.setext || n));
}
function Aw(t, e, n, r) {
  const i = Math.max(Math.min(6, t.depth || 1), 1), o = n.createTracker(r);
  if (Dp(t, n)) {
    const c = n.enter("headingSetext"), f = n.enter("phrasing"), d = n.containerPhrasing(t, {
      ...o.current(),
      before: `
`,
      after: `
`
    });
    return f(), c(), d + `
` + (i === 1 ? "=" : "-").repeat(
      // The whole size…
      d.length - // Minus the position of the character after the last EOL (or
      // 0 if there is none)…
      (Math.max(d.lastIndexOf("\r"), d.lastIndexOf(`
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
  return /^[\t ]/.test(u) && (u = tr(u.charCodeAt(0)) + u.slice(1)), u = u ? s + " " + u : s, n.options.closeAtx && (u += " " + s), a(), l(), u;
}
Rp.peek = Ew;
function Rp(t) {
  return t.value || "";
}
function Ew() {
  return "<";
}
Lp.peek = Ow;
function Lp(t, e, n, r) {
  const i = Ru(n), o = i === '"' ? "Quote" : "Apostrophe", s = n.enter("image");
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
function Ow() {
  return "!";
}
Pp.peek = Dw;
function Pp(t, e, n, r) {
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
function Dw() {
  return "!";
}
zp.peek = Rw;
function zp(t, e, n) {
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
function Rw() {
  return "`";
}
function Bp(t, e) {
  const n = Au(t);
  return !!(!e.options.resourceLink && // If there’s a url…
  t.url && // And there’s a no title…
  !t.title && // And the content of `node` is a single text node…
  t.children && t.children.length === 1 && t.children[0].type === "text" && // And if the url is the same as the content…
  (n === t.url || "mailto:" + n === t.url) && // And that starts w/ a protocol…
  /^[a-z][a-z+.-]+:/i.test(t.url) && // And that doesn’t contain ASCII control codes (character escapes and
  // references don’t work), space, or angle brackets…
  !/[\0- <>\u007F]/.test(t.url));
}
Fp.peek = Lw;
function Fp(t, e, n, r) {
  const i = Ru(n), o = i === '"' ? "Quote" : "Apostrophe", s = n.createTracker(r);
  let l, a;
  if (Bp(t, n)) {
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
function Lw(t, e, n) {
  return Bp(t, n) ? "<" : "[";
}
$p.peek = Pw;
function $p(t, e, n, r) {
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
function Pw() {
  return "[";
}
function Pu(t) {
  const e = t.options.bullet || "*";
  if (e !== "*" && e !== "+" && e !== "-")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.bullet`, expected `*`, `+`, or `-`"
    );
  return e;
}
function zw(t) {
  const e = Pu(t), n = t.options.bulletOther;
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
function Bw(t) {
  const e = t.options.bulletOrdered || ".";
  if (e !== "." && e !== ")")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.bulletOrdered`, expected `.` or `)`"
    );
  return e;
}
function _p(t) {
  const e = t.options.rule || "*";
  if (e !== "*" && e !== "-" && e !== "_")
    throw new Error(
      "Cannot serialize rules with `" + e + "` for `options.rule`, expected `*`, `-`, or `_`"
    );
  return e;
}
function Fw(t, e, n, r) {
  const i = n.enter("list"), o = n.bulletCurrent;
  let s = t.ordered ? Bw(n) : Pu(n);
  const l = t.ordered ? s === "." ? ")" : "." : zw(n);
  let a = e && n.bulletLastUsed ? s === n.bulletLastUsed : !1;
  if (!t.ordered) {
    const c = t.children ? t.children[0] : void 0;
    if (
      // Bullet could be used as a thematic break marker:
      (s === "*" || s === "-") && // Empty first list item:
      c && (!c.children || !c.children[0]) && // Directly in two other list items:
      n.stack[n.stack.length - 1] === "list" && n.stack[n.stack.length - 2] === "listItem" && n.stack[n.stack.length - 3] === "list" && n.stack[n.stack.length - 4] === "listItem" && // That are each the first child.
      n.indexStack[n.indexStack.length - 1] === 0 && n.indexStack[n.indexStack.length - 2] === 0 && n.indexStack[n.indexStack.length - 3] === 0 && (a = !0), _p(n) === s && c
    ) {
      let f = -1;
      for (; ++f < t.children.length; ) {
        const d = t.children[f];
        if (d && d.type === "listItem" && d.children && d.children[0] && d.children[0].type === "thematicBreak") {
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
function $w(t) {
  const e = t.options.listItemIndent || "one";
  if (e !== "tab" && e !== "one" && e !== "mixed")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.listItemIndent`, expected `tab`, `one`, or `mixed`"
    );
  return e;
}
function _w(t, e, n, r) {
  const i = $w(n);
  let o = n.bulletCurrent || Pu(n);
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
  function c(f, d, h) {
    return d ? (h ? "" : " ".repeat(s)) + f : (h ? o : o + " ".repeat(s - o.length)) + f;
  }
}
function Vw(t, e, n, r) {
  const i = n.enter("paragraph"), o = n.enter("phrasing"), s = n.containerPhrasing(t, r);
  return o(), i(), s;
}
const Hw = (
  /** @type {(node?: unknown) => node is Exclude<PhrasingContent, Html>} */
  xl([
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
function jw(t, e, n, r) {
  return (t.children.some(function(s) {
    return Hw(s);
  }) ? n.containerPhrasing : n.containerFlow).call(n, t, r);
}
function Ww(t) {
  const e = t.options.strong || "*";
  if (e !== "*" && e !== "_")
    throw new Error(
      "Cannot serialize strong with `" + e + "` for `options.strong`, expected `*`, or `_`"
    );
  return e;
}
Vp.peek = qw;
function Vp(t, e, n, r) {
  const i = Ww(n), o = n.enter("strong"), s = n.createTracker(r), l = s.move(i + i);
  let a = s.move(
    n.containerPhrasing(t, {
      after: i,
      before: l,
      ...s.current()
    })
  );
  const u = a.charCodeAt(0), c = Zs(
    r.before.charCodeAt(r.before.length - 1),
    u,
    i
  );
  c.inside && (a = tr(u) + a.slice(1));
  const f = a.charCodeAt(a.length - 1), d = Zs(r.after.charCodeAt(0), f, i);
  d.inside && (a = a.slice(0, -1) + tr(f));
  const h = s.move(i + i);
  return o(), n.attentionEncodeSurroundingInfo = {
    after: d.outside,
    before: c.outside
  }, l + a + h;
}
function qw(t, e, n) {
  return n.options.strong || "*";
}
function Kw(t, e, n, r) {
  return n.safe(t.value, r);
}
function Uw(t) {
  const e = t.options.ruleRepetition || 3;
  if (e < 3)
    throw new Error(
      "Cannot serialize rules with repetition `" + e + "` for `options.ruleRepetition`, expected `3` or more"
    );
  return e;
}
function Jw(t, e, n) {
  const r = (_p(n) + (n.options.ruleSpaces ? " " : "")).repeat(Uw(n));
  return n.options.ruleSpaces ? r.slice(0, -1) : r;
}
const zu = {
  blockquote: hw,
  break: Zf,
  code: yw,
  definition: bw,
  emphasis: Ep,
  hardBreak: Zf,
  heading: Aw,
  html: Rp,
  image: Lp,
  imageReference: Pp,
  inlineCode: zp,
  link: Fp,
  linkReference: $p,
  list: Fw,
  listItem: _w,
  paragraph: Vw,
  root: jw,
  strong: Vp,
  text: Kw,
  thematicBreak: Jw
}, Gw = [Yw];
function Yw(t, e, n, r) {
  if (e.type === "code" && _a(e, r) && (t.type === "list" || t.type === e.type && _a(t, r)))
    return !1;
  if ("spread" in n && typeof n.spread == "boolean")
    return t.type === "paragraph" && // Two paragraphs.
    (t.type === e.type || e.type === "definition" || // Paragraph followed by a setext heading.
    e.type === "heading" && Dp(e, r)) ? void 0 : n.spread ? 1 : 0;
}
const fr = [
  "autolink",
  "destinationLiteral",
  "destinationRaw",
  "reference",
  "titleQuote",
  "titleApostrophe"
], Qw = [
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
    notInConstruct: fr
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
    notInConstruct: fr
  },
  // A right paren could start a list item or break out of a destination
  // raw.
  { atBreak: !0, before: "\\d+", character: ")" },
  { character: ")", inConstruct: "destinationRaw" },
  // An asterisk can start thematic breaks, list items, emphasis, strong.
  { atBreak: !0, character: "*", after: `(?:[ 	\r
*])` },
  { character: "*", inConstruct: "phrasing", notInConstruct: fr },
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
    notInConstruct: fr
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
  { character: "[", inConstruct: "phrasing", notInConstruct: fr },
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
  { character: "_", inConstruct: "phrasing", notInConstruct: fr },
  // A grave accent can start code (fenced or text), or it can break out of
  // a grave accent code fence.
  { atBreak: !0, character: "`" },
  {
    character: "`",
    inConstruct: ["codeFencedLangGraveAccent", "codeFencedMetaGraveAccent"]
  },
  { character: "`", inConstruct: "phrasing", notInConstruct: fr },
  // Left brace, vertical bar, right brace are not used in markdown for
  // constructs.
  // A tilde can start code (fenced).
  { atBreak: !0, character: "~" }
];
function Xw(t) {
  return t.label || !t.identifier ? t.label || "" : vp(t.identifier);
}
function Zw(t) {
  if (!t._compiled) {
    const e = (t.atBreak ? "[\\r\\n][\\t ]*" : "") + (t.before ? "(?:" + t.before + ")" : "");
    t._compiled = new RegExp(
      (e ? "(" + e + ")" : "") + (/[|\\{}()[\]^$+*?.-]/.test(t.character) ? "\\" : "") + t.character + (t.after ? "(?:" + t.after + ")" : ""),
      "g"
    );
  }
  return t._compiled;
}
function e0(t, e, n) {
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
    let d = e.handle(c, t, e, {
      ...u.current(),
      after: f,
      before: l
    });
    a && a === d.slice(0, 1) && (d = tr(a.charCodeAt(0)) + d.slice(1));
    const h = e.attentionEncodeSurroundingInfo;
    e.attentionEncodeSurroundingInfo = void 0, a = void 0, h && (o.length > 0 && h.before && l === o[o.length - 1].slice(-1) && (o[o.length - 1] = o[o.length - 1].slice(0, -1) + tr(l.charCodeAt(0))), h.after && (a = f)), u.move(d), o.push(d), l = d.slice(-1);
  }
  return r.pop(), o.join("");
}
function t0(t, e, n) {
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
      o.move(n0(a, i[l + 1], t, e))
    );
  }
  return r.pop(), s.join("");
}
function n0(t, e, n, r) {
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
const r0 = /\r?\n|\r/g;
function i0(t, e) {
  const n = [];
  let r = 0, i = 0, o;
  for (; o = r0.exec(t); )
    s(t.slice(r, o.index)), n.push(o[0]), r = o.index + o[0].length, i++;
  return s(t.slice(r)), n.join("");
  function s(l) {
    n.push(e(l, i, !l));
  }
}
function o0(t, e, n) {
  const r = (n.before || "") + (e || "") + (n.after || ""), i = [], o = [], s = {};
  let l = -1;
  for (; ++l < t.unsafe.length; ) {
    const c = t.unsafe[l];
    if (!Ap(t.stack, c))
      continue;
    const f = t.compilePattern(c);
    let d;
    for (; d = f.exec(r); ) {
      const h = "before" in c || !!c.atBreak, p = "after" in c, k = d.index + (h ? d[1].length : 0);
      i.includes(k) ? (s[k].before && !h && (s[k].before = !1), s[k].after && !p && (s[k].after = !1)) : (i.push(k), s[k] = { before: h, after: p });
    }
  }
  i.sort(s0);
  let a = n.before ? n.before.length : 0;
  const u = r.length - (n.after ? n.after.length : 0);
  for (l = -1; ++l < i.length; ) {
    const c = i[l];
    c < a || c >= u || c + 1 < u && i[l + 1] === c + 1 && s[c].after && !s[c + 1].before && !s[c + 1].after || i[l - 1] === c - 1 && s[c].before && !s[c - 1].before && !s[c - 1].after || (a !== c && o.push(ed(r.slice(a, c), "\\")), a = c, /[!-/:-@[-`{-~]/.test(r.charAt(c)) && (!n.encode || !n.encode.includes(r.charAt(c))) ? o.push("\\") : (o.push(tr(r.charCodeAt(c))), a++));
  }
  return o.push(ed(r.slice(a, u), n.after)), o.join("");
}
function s0(t, e) {
  return t - e;
}
function ed(t, e) {
  const n = /\\(?=[!-/:-@[-`{-~])/g, r = [], i = [], o = t + e;
  let s = -1, l = 0, a;
  for (; a = n.exec(o); )
    r.push(a.index);
  for (; ++s < r.length; )
    l !== r[s] && i.push(t.slice(l, r[s])), i.push("\\"), l = r[s];
  return i.push(t.slice(l)), i.join("");
}
function l0(t) {
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
    const c = u || "", f = c.split(/\r?\n|\r/g), d = f[f.length - 1];
    return i += f.length - 1, o = f.length === 1 ? o + d.length : 1 + d.length + r, c;
  }
}
function a0(t, e) {
  const n = e || {}, r = {
    associationId: Xw,
    containerPhrasing: d0,
    containerFlow: h0,
    createTracker: l0,
    compilePattern: Zw,
    enter: o,
    // @ts-expect-error: GFM / frontmatter are typed in `mdast` but not defined
    // here.
    handlers: { ...zu },
    // @ts-expect-error: add `handle` in a second.
    handle: void 0,
    indentLines: i0,
    indexStack: [],
    join: [...Gw],
    options: {},
    safe: p0,
    stack: [],
    unsafe: [...Qw]
  };
  Ip(r, n), r.options.tightDefinitions && r.join.push(f0), r.handle = cw("type", {
    invalid: u0,
    unknown: c0,
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
function u0(t) {
  throw new Error("Cannot handle value `" + t + "`, expected node");
}
function c0(t) {
  const e = (
    /** @type {Nodes} */
    t
  );
  throw new Error("Cannot handle unknown node `" + e.type + "`");
}
function f0(t, e) {
  if (t.type === "definition" && t.type === e.type)
    return 0;
}
function d0(t, e) {
  return e0(t, this, e);
}
function h0(t, e) {
  return t0(t, this, e);
}
function p0(t, e) {
  return o0(this, t, e);
}
function ja(t) {
  const e = this;
  e.compiler = n;
  function n(r) {
    return a0(r, {
      ...e.data("settings"),
      ...t,
      // Note: this option is not in the readme.
      // The goal is for it to be set by plugins on `data` instead of being
      // passed by users.
      extensions: e.data("toMarkdownExtensions") || []
    });
  }
}
function td(t) {
  if (t)
    throw t;
}
function m0(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var Bs = Object.prototype.hasOwnProperty, Hp = Object.prototype.toString, nd = Object.defineProperty, rd = Object.getOwnPropertyDescriptor, id = function(e) {
  return typeof Array.isArray == "function" ? Array.isArray(e) : Hp.call(e) === "[object Array]";
}, od = function(e) {
  if (!e || Hp.call(e) !== "[object Object]")
    return !1;
  var n = Bs.call(e, "constructor"), r = e.constructor && e.constructor.prototype && Bs.call(e.constructor.prototype, "isPrototypeOf");
  if (e.constructor && !n && !r)
    return !1;
  var i;
  for (i in e)
    ;
  return typeof i > "u" || Bs.call(e, i);
}, sd = function(e, n) {
  nd && n.name === "__proto__" ? nd(e, n.name, {
    enumerable: !0,
    configurable: !0,
    value: n.newValue,
    writable: !0
  }) : e[n.name] = n.newValue;
}, ld = function(e, n) {
  if (n === "__proto__")
    if (Bs.call(e, n)) {
      if (rd)
        return rd(e, n).value;
    } else return;
  return e[n];
}, g0 = function t() {
  var e, n, r, i, o, s, l = arguments[0], a = 1, u = arguments.length, c = !1;
  for (typeof l == "boolean" && (c = l, l = arguments[1] || {}, a = 2), (l == null || typeof l != "object" && typeof l != "function") && (l = {}); a < u; ++a)
    if (e = arguments[a], e != null)
      for (n in e)
        r = ld(l, n), i = ld(e, n), l !== i && (c && i && (od(i) || (o = id(i))) ? (o ? (o = !1, s = r && id(r) ? r : []) : s = r && od(r) ? r : {}, sd(l, { name: n, newValue: t(c, s, i) })) : typeof i < "u" && sd(l, { name: n, newValue: i }));
  return l;
};
const Vl = /* @__PURE__ */ m0(g0);
function Wa(t) {
  if (typeof t != "object" || t === null)
    return !1;
  const e = Object.getPrototypeOf(t);
  return (e === null || e === Object.prototype || Object.getPrototypeOf(e) === null) && !(Symbol.toStringTag in t) && !(Symbol.iterator in t);
}
function y0() {
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
      i = u, c ? k0(c, l)(...u) : s(null, ...u);
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
function k0(t, e) {
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
class bt extends Error {
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
    this.ancestors = o.ancestors || void 0, this.cause = o.cause || void 0, this.column = l ? l.column : void 0, this.fatal = void 0, this.file = "", this.message = i, this.line = l ? l.line : void 0, this.name = fo(o.place) || "1:1", this.place = o.place || void 0, this.reason = this.message, this.ruleId = o.ruleId || void 0, this.source = o.source || void 0, this.stack = s && o.cause && typeof o.cause.stack == "string" ? o.cause.stack : "", this.actual = void 0, this.expected = void 0, this.note = void 0, this.url = void 0;
  }
}
bt.prototype.file = "";
bt.prototype.name = "";
bt.prototype.reason = "";
bt.prototype.message = "";
bt.prototype.stack = "";
bt.prototype.column = void 0;
bt.prototype.line = void 0;
bt.prototype.ancestors = void 0;
bt.prototype.cause = void 0;
bt.prototype.fatal = void 0;
bt.prototype.place = void 0;
bt.prototype.ruleId = void 0;
bt.prototype.source = void 0;
const Gt = { basename: b0, dirname: w0, extname: x0, join: C0, sep: "/" };
function b0(t, e) {
  if (e !== void 0 && typeof e != "string")
    throw new TypeError('"ext" argument must be a string');
  ns(t);
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
function w0(t) {
  if (ns(t), t.length === 0)
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
function x0(t) {
  ns(t);
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
function C0(...t) {
  let e = -1, n;
  for (; ++e < t.length; )
    ns(t[e]), t[e] && (n = n === void 0 ? t[e] : n + "/" + t[e]);
  return n === void 0 ? "." : S0(n);
}
function S0(t) {
  ns(t);
  const e = t.codePointAt(0) === 47;
  let n = M0(t, !e);
  return n.length === 0 && !e && (n = "."), n.length > 0 && t.codePointAt(t.length - 1) === 47 && (n += "/"), e ? "/" + n : n;
}
function M0(t, e) {
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
function ns(t) {
  if (typeof t != "string")
    throw new TypeError(
      "Path must be a string. Received " + JSON.stringify(t)
    );
}
const v0 = { cwd: T0 };
function T0() {
  return "/";
}
function qa(t) {
  return !!(t !== null && typeof t == "object" && "href" in t && t.href && "protocol" in t && t.protocol && // @ts-expect-error: indexing is fine.
  t.auth === void 0);
}
function N0(t) {
  if (typeof t == "string")
    t = new URL(t);
  else if (!qa(t)) {
    const e = new TypeError(
      'The "path" argument must be of type string or an instance of URL. Received `' + t + "`"
    );
    throw e.code = "ERR_INVALID_ARG_TYPE", e;
  }
  if (t.protocol !== "file:") {
    const e = new TypeError("The URL must be of scheme file");
    throw e.code = "ERR_INVALID_URL_SCHEME", e;
  }
  return I0(t);
}
function I0(t) {
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
const Hl = (
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
class A0 {
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
    e ? qa(e) ? n = { path: e } : typeof e == "string" || E0(e) ? n = { value: e } : n = e : n = {}, this.cwd = "cwd" in n ? "" : v0.cwd(), this.data = {}, this.history = [], this.messages = [], this.value, this.map, this.result, this.stored;
    let r = -1;
    for (; ++r < Hl.length; ) {
      const o = Hl[r];
      o in n && n[o] !== void 0 && n[o] !== null && (this[o] = o === "history" ? [...n[o]] : n[o]);
    }
    let i;
    for (i in n)
      Hl.includes(i) || (this[i] = n[i]);
  }
  /**
   * Get the basename (including extname) (example: `'index.min.js'`).
   *
   * @returns {string | undefined}
   *   Basename.
   */
  get basename() {
    return typeof this.path == "string" ? Gt.basename(this.path) : void 0;
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
    Wl(e, "basename"), jl(e, "basename"), this.path = Gt.join(this.dirname || "", e);
  }
  /**
   * Get the parent path (example: `'~'`).
   *
   * @returns {string | undefined}
   *   Dirname.
   */
  get dirname() {
    return typeof this.path == "string" ? Gt.dirname(this.path) : void 0;
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
    ad(this.basename, "dirname"), this.path = Gt.join(e || "", this.basename);
  }
  /**
   * Get the extname (including dot) (example: `'.js'`).
   *
   * @returns {string | undefined}
   *   Extname.
   */
  get extname() {
    return typeof this.path == "string" ? Gt.extname(this.path) : void 0;
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
    if (jl(e, "extname"), ad(this.dirname, "extname"), e) {
      if (e.codePointAt(0) !== 46)
        throw new Error("`extname` must start with `.`");
      if (e.includes(".", 1))
        throw new Error("`extname` cannot contain multiple dots");
    }
    this.path = Gt.join(this.dirname, this.stem + (e || ""));
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
    qa(e) && (e = N0(e)), Wl(e, "path"), this.path !== e && this.history.push(e);
  }
  /**
   * Get the stem (basename w/o extname) (example: `'index.min'`).
   *
   * @returns {string | undefined}
   *   Stem.
   */
  get stem() {
    return typeof this.path == "string" ? Gt.basename(this.path, this.extname) : void 0;
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
    Wl(e, "stem"), jl(e, "stem"), this.path = Gt.join(this.dirname || "", e + (this.extname || ""));
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
    const i = new bt(
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
function jl(t, e) {
  if (t && t.includes(Gt.sep))
    throw new Error(
      "`" + e + "` cannot be a path: did not expect `" + Gt.sep + "`"
    );
}
function Wl(t, e) {
  if (!t)
    throw new Error("`" + e + "` cannot be empty");
}
function ad(t, e) {
  if (!t)
    throw new Error("Setting `" + e + "` requires `path` to be set too");
}
function E0(t) {
  return !!(t && typeof t == "object" && "byteLength" in t && "byteOffset" in t);
}
const O0 = (
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
), D0 = {}.hasOwnProperty;
class Bu extends O0 {
  /**
   * Create a processor.
   */
  constructor() {
    super("copy"), this.Compiler = void 0, this.Parser = void 0, this.attachers = [], this.compiler = void 0, this.freezeIndex = -1, this.frozen = void 0, this.namespace = {}, this.parser = void 0, this.transformers = y0();
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
      new Bu()
    );
    let n = -1;
    for (; ++n < this.attachers.length; ) {
      const r = this.attachers[n];
      e.use(...r);
    }
    return e.data(Vl(!0, {}, this.namespace)), e;
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
    return typeof e == "string" ? arguments.length === 2 ? (Ul("data", this.frozen), this.namespace[e] = n, this) : D0.call(this.namespace, e) && this.namespace[e] || void 0 : e ? (Ul("data", this.frozen), this.namespace = e, this) : this.namespace;
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
    const n = Ns(e), r = this.parser || this.Parser;
    return ql("parse", r), r(String(n), n);
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
    return this.freeze(), ql("process", this.parser || this.Parser), Kl("process", this.compiler || this.Compiler), n ? i(void 0, n) : new Promise(i);
    function i(o, s) {
      const l = Ns(e), a = (
        /** @type {HeadTree extends undefined ? Node : HeadTree} */
        /** @type {unknown} */
        r.parse(l)
      );
      r.run(a, l, function(c, f, d) {
        if (c || !f || !d)
          return u(c);
        const h = (
          /** @type {CompileTree extends undefined ? Node : CompileTree} */
          /** @type {unknown} */
          f
        ), p = r.stringify(h, d);
        L0(p) ? d.value = p : d.result = p, u(
          c,
          /** @type {VFileWithOutput<CompileResult>} */
          d
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
    return this.freeze(), ql("processSync", this.parser || this.Parser), Kl("processSync", this.compiler || this.Compiler), this.process(e, i), cd("processSync", "process", n), r;
    function i(o, s) {
      n = !0, td(o), r = s;
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
    ud(e), this.freeze();
    const i = this.transformers;
    return !r && typeof n == "function" && (r = n, n = void 0), r ? o(void 0, r) : new Promise(o);
    function o(s, l) {
      const a = Ns(n);
      i.run(e, a, u);
      function u(c, f, d) {
        const h = (
          /** @type {TailTree extends undefined ? Node : TailTree} */
          f || e
        );
        c ? l(c) : s ? s(h) : r(void 0, h, d);
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
    return this.run(e, n, o), cd("runSync", "run", r), i;
    function o(s, l) {
      td(s), i = l, r = !0;
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
    const r = Ns(n), i = this.compiler || this.Compiler;
    return Kl("stringify", i), ud(e), i(e, r);
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
    if (Ul("use", this.frozen), e != null) if (typeof e == "function")
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
      l(u.plugins), u.settings && (i.settings = Vl(!0, i.settings, u.settings));
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
      let f = -1, d = -1;
      for (; ++f < r.length; )
        if (r[f][0] === u) {
          d = f;
          break;
        }
      if (d === -1)
        r.push([u, ...c]);
      else if (c.length > 0) {
        let [h, ...p] = c;
        const k = r[d][1];
        Wa(k) && Wa(h) && (h = Vl(!0, k, h)), r[d] = [u, h, ...p];
      }
    }
  }
}
const Ka = new Bu().freeze();
function ql(t, e) {
  if (typeof e != "function")
    throw new TypeError("Cannot `" + t + "` without `parser`");
}
function Kl(t, e) {
  if (typeof e != "function")
    throw new TypeError("Cannot `" + t + "` without `compiler`");
}
function Ul(t, e) {
  if (e)
    throw new Error(
      "Cannot call `" + t + "` on a frozen processor.\nCreate a new processor first, by calling it: use `processor()` instead of `processor`."
    );
}
function ud(t) {
  if (!Wa(t) || typeof t.type != "string")
    throw new TypeError("Expected node, got `" + t + "`");
}
function cd(t, e, n) {
  if (!n)
    throw new Error(
      "`" + t + "` finished async. Use `" + e + "` instead"
    );
}
function Ns(t) {
  return R0(t) ? t : new A0(t);
}
function R0(t) {
  return !!(t && typeof t == "object" && "message" in t && "messages" in t);
}
function L0(t) {
  return typeof t == "string" || P0(t);
}
function P0(t) {
  return !!(t && typeof t == "object" && "byteLength" in t && "byteOffset" in t);
}
function Je(t) {
  this.content = t;
}
Je.prototype = {
  constructor: Je,
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
    return i == -1 ? o.push(n || t, e) : (o[i + 1] = e, n && (o[i] = n)), new Je(o);
  },
  // :: (string) → OrderedMap
  // Return a map with the given key removed, if it existed.
  remove: function(t) {
    var e = this.find(t);
    if (e == -1) return this;
    var n = this.content.slice();
    return n.splice(e, 2), new Je(n);
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the start of the map.
  addToStart: function(t, e) {
    return new Je([t, e].concat(this.remove(t).content));
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the end of the map.
  addToEnd: function(t, e) {
    var n = this.remove(t).content.slice();
    return n.push(t, e), new Je(n);
  },
  // :: (string, string, any) → OrderedMap
  // Add a key after the given key. If `place` is not found, the new
  // key is added to the end.
  addBefore: function(t, e, n) {
    var r = this.remove(e), i = r.content.slice(), o = r.find(t);
    return i.splice(o == -1 ? i.length : o, 0, e, n), new Je(i);
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
    return t = Je.from(t), t.size ? new Je(t.content.concat(this.subtract(t).content)) : this;
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a new map by appending the keys in this map that don't
  // appear in `map` after the keys in `map`.
  append: function(t) {
    return t = Je.from(t), t.size ? new Je(this.subtract(t).content.concat(t.content)) : this;
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a map containing all the keys in this map that don't
  // appear in `map`.
  subtract: function(t) {
    var e = this;
    t = Je.from(t);
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
Je.from = function(t) {
  if (t instanceof Je) return t;
  var e = [];
  if (t) for (var n in t) e.push(n, t[n]);
  return new Je(e);
};
function jp(t, e, n) {
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
      let s = jp(i.content, o.content, n + 1);
      if (s != null)
        return s;
    }
    n += i.nodeSize;
  }
}
function Wp(t, e, n, r) {
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
      let u = Wp(s.content, l.content, n - 1, r - 1);
      if (u)
        return u;
    }
    n -= a, r -= a;
  }
}
class R {
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
    return new R(i, this.size + e.size);
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
    return new R(r, i);
  }
  /**
  @internal
  */
  cutByIndex(e, n) {
    return e == n ? R.empty : e == 0 && n == this.content.length ? this : new R(this.content.slice(e, n));
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
    return i[e] = n, new R(i, o);
  }
  /**
  Create a new fragment by prepending the given node to this
  fragment.
  */
  addToStart(e) {
    return new R([e].concat(this.content), this.size + e.nodeSize);
  }
  /**
  Create a new fragment by appending the given node to this
  fragment.
  */
  addToEnd(e) {
    return new R(this.content.concat(e), this.size + e.nodeSize);
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
    return jp(this, e, n);
  }
  /**
  Find the first position, searching from the end, at which this
  fragment and the given fragment differ, or `null` if they are
  the same. Since this position will not be the same in both
  nodes, an object with two separate positions is returned.
  */
  findDiffEnd(e, n = this.size, r = e.size) {
    return Wp(this, e, n, r);
  }
  /**
  Find the index and inner offset corresponding to a given relative
  position in this fragment. The result object will be reused
  (overwritten) the next time the function is called. @internal
  */
  findIndex(e) {
    if (e == 0)
      return Is(0, e);
    if (e == this.size)
      return Is(this.content.length, e);
    if (e > this.size || e < 0)
      throw new RangeError(`Position ${e} outside of fragment (${this})`);
    for (let n = 0, r = 0; ; n++) {
      let i = this.child(n), o = r + i.nodeSize;
      if (o >= e)
        return o == e ? Is(n + 1, o) : Is(n, r);
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
      return R.empty;
    if (!Array.isArray(n))
      throw new RangeError("Invalid input for Fragment.fromJSON");
    return new R(n.map(e.nodeFromJSON));
  }
  /**
  Build a fragment from an array of nodes. Ensures that adjacent
  text nodes with the same marks are joined together.
  */
  static fromArray(e) {
    if (!e.length)
      return R.empty;
    let n, r = 0;
    for (let i = 0; i < e.length; i++) {
      let o = e[i];
      r += o.nodeSize, i && o.isText && e[i - 1].sameMarkup(o) ? (n || (n = e.slice(0, i)), n[n.length - 1] = o.withText(n[n.length - 1].text + o.text)) : n && n.push(o);
    }
    return new R(n || e, r);
  }
  /**
  Create a fragment from something that can be interpreted as a
  set of nodes. For `null`, it returns the empty fragment. For a
  fragment, the fragment itself. For a node or array of nodes, a
  fragment containing those nodes.
  */
  static from(e) {
    if (!e)
      return R.empty;
    if (e instanceof R)
      return e;
    if (Array.isArray(e))
      return this.fromArray(e);
    if (e.attrs)
      return new R([e], e.nodeSize);
    throw new RangeError("Can not convert " + e + " to a Fragment" + (e.nodesBetween ? " (looks like multiple versions of prosemirror-model were loaded)" : ""));
  }
}
R.empty = new R([], 0);
const Jl = { index: 0, offset: 0 };
function Is(t, e) {
  return Jl.index = t, Jl.offset = e, Jl;
}
function el(t, e) {
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
      if (!el(t[r], e[r]))
        return !1;
  } else {
    for (let r in t)
      if (!(r in e) || !el(t[r], e[r]))
        return !1;
    for (let r in e)
      if (!(r in t))
        return !1;
  }
  return !0;
}
class pe {
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
    return this == e || this.type == e.type && el(this.attrs, e.attrs);
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
      return pe.none;
    if (e instanceof pe)
      return [e];
    let n = e.slice();
    return n.sort((r, i) => r.type.rank - i.type.rank), n;
  }
}
pe.none = [];
class tl extends Error {
}
class _ {
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
    let r = Kp(this.content, e + this.openStart, n);
    return r && new _(r, this.openStart, this.openEnd);
  }
  /**
  @internal
  */
  removeBetween(e, n) {
    return new _(qp(this.content, e + this.openStart, n + this.openStart), this.openStart, this.openEnd);
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
      return _.empty;
    let r = n.openStart || 0, i = n.openEnd || 0;
    if (typeof r != "number" || typeof i != "number")
      throw new RangeError("Invalid input for Slice.fromJSON");
    return new _(R.fromJSON(e, n.content), r, i);
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
    return new _(e, r, i);
  }
}
_.empty = new _(R.empty, 0, 0);
function qp(t, e, n) {
  let { index: r, offset: i } = t.findIndex(e), o = t.maybeChild(r), { index: s, offset: l } = t.findIndex(n);
  if (i == e || o.isText) {
    if (l != n && !t.child(s).isText)
      throw new RangeError("Removing non-flat range");
    return t.cut(0, e).append(t.cut(n));
  }
  if (r != s)
    throw new RangeError("Removing non-flat range");
  return t.replaceChild(r, o.copy(qp(o.content, e - i - 1, n - i - 1)));
}
function Kp(t, e, n, r) {
  let { index: i, offset: o } = t.findIndex(e), s = t.maybeChild(i);
  if (o == e || s.isText)
    return r && !r.canReplace(i, i, n) ? null : t.cut(0, e).append(n).append(t.cut(e));
  let l = Kp(s.content, e - o - 1, n, s);
  return l && t.replaceChild(i, s.copy(l));
}
function z0(t, e, n) {
  if (n.openStart > t.depth)
    throw new tl("Inserted content deeper than insertion position");
  if (t.depth - n.openStart != e.depth - n.openEnd)
    throw new tl("Inconsistent open depths");
  return Up(t, e, n, 0);
}
function Up(t, e, n, r) {
  let i = t.index(r), o = t.node(r);
  if (i == e.index(r) && r < t.depth - n.openStart) {
    let s = Up(t, e, n, r + 1);
    return o.copy(o.content.replaceChild(i, s));
  } else if (n.content.size)
    if (!n.openStart && !n.openEnd && t.depth == r && e.depth == r) {
      let s = t.parent, l = s.content;
      return Nr(s, l.cut(0, t.parentOffset).append(n.content).append(l.cut(e.parentOffset)));
    } else {
      let { start: s, end: l } = B0(n, t);
      return Nr(o, Gp(t, s, l, e, r));
    }
  else return Nr(o, nl(t, e, r));
}
function Jp(t, e) {
  if (!e.type.compatibleContent(t.type))
    throw new tl("Cannot join " + e.type.name + " onto " + t.type.name);
}
function Ua(t, e, n) {
  let r = t.node(n);
  return Jp(r, e.node(n)), r;
}
function Tr(t, e) {
  let n = e.length - 1;
  n >= 0 && t.isText && t.sameMarkup(e[n]) ? e[n] = t.withText(e[n].text + t.text) : e.push(t);
}
function ho(t, e, n, r) {
  let i = (e || t).node(n), o = 0, s = e ? e.index(n) : i.childCount;
  t && (o = t.index(n), t.depth > n ? o++ : t.textOffset && (Tr(t.nodeAfter, r), o++));
  for (let l = o; l < s; l++)
    Tr(i.child(l), r);
  e && e.depth == n && e.textOffset && Tr(e.nodeBefore, r);
}
function Nr(t, e) {
  return t.type.checkContent(e), t.copy(e);
}
function Gp(t, e, n, r, i) {
  let o = t.depth > i && Ua(t, e, i + 1), s = r.depth > i && Ua(n, r, i + 1), l = [];
  return ho(null, t, i, l), o && s && e.index(i) == n.index(i) ? (Jp(o, s), Tr(Nr(o, Gp(t, e, n, r, i + 1)), l)) : (o && Tr(Nr(o, nl(t, e, i + 1)), l), ho(e, n, i, l), s && Tr(Nr(s, nl(n, r, i + 1)), l)), ho(r, null, i, l), new R(l);
}
function nl(t, e, n) {
  let r = [];
  if (ho(null, t, n, r), t.depth > n) {
    let i = Ua(t, e, n + 1);
    Tr(Nr(i, nl(t, e, n + 1)), r);
  }
  return ho(e, null, n, r), new R(r);
}
function B0(t, e) {
  let n = e.depth - t.openStart, i = e.node(n).copy(t.content);
  for (let o = n - 1; o >= 0; o--)
    i = e.node(o).copy(R.from(i));
  return {
    start: i.resolveNoCache(t.openStart + n),
    end: i.resolveNoCache(i.content.size - t.openEnd - n)
  };
}
class No {
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
      return pe.none;
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
        return new Yp(this, e, r);
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
    return new No(n, r, o);
  }
  /**
  @internal
  */
  static resolveCached(e, n) {
    let r = fd.get(e);
    if (r)
      for (let o = 0; o < r.elts.length; o++) {
        let s = r.elts[o];
        if (s.pos == n)
          return s;
      }
    else
      fd.set(e, r = new F0());
    let i = r.elts[r.i] = No.resolve(e, n);
    return r.i = (r.i + 1) % $0, i;
  }
}
class F0 {
  constructor() {
    this.elts = [], this.i = 0;
  }
}
const $0 = 12, fd = /* @__PURE__ */ new WeakMap();
class Yp {
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
const _0 = /* @__PURE__ */ Object.create(null);
let vn = class Ja {
  /**
  @internal
  */
  constructor(e, n, r, i = pe.none) {
    this.type = e, this.attrs = n, this.marks = i, this.content = r || R.empty;
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
    return this.type == e && el(this.attrs, n || e.defaultAttrs || _0) && pe.sameSet(this.marks, r || pe.none);
  }
  /**
  Create a new node with the same markup as this node, containing
  the given content (or empty, if no content is given).
  */
  copy(e = null) {
    return e == this.content ? this : new Ja(this.type, this.attrs, e, this.marks);
  }
  /**
  Create a copy of this node, with the given set of marks instead
  of the node's own marks.
  */
  mark(e) {
    return e == this.marks ? this : new Ja(this.type, this.attrs, this.content, e);
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
      return _.empty;
    let i = this.resolve(e), o = this.resolve(n), s = r ? 0 : i.sharedDepth(n), l = i.start(s), u = i.node(s).content.cut(i.pos - l, o.pos - l);
    return new _(u, i.depth - s, o.depth - s);
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
    return z0(this.resolve(e), this.resolve(n), r);
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
    return No.resolveCached(this, e);
  }
  /**
  @internal
  */
  resolveNoCache(e) {
    return No.resolve(this, e);
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
    return this.content.size && (e += "(" + this.content.toStringInner() + ")"), Qp(this.marks, e);
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
  canReplace(e, n, r = R.empty, i = 0, o = r.childCount) {
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
    let e = pe.none;
    for (let n = 0; n < this.marks.length; n++) {
      let r = this.marks[n];
      r.type.checkAttrs(r.attrs), e = r.addToSet(e);
    }
    if (!pe.sameSet(e, this.marks))
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
    let i = R.fromJSON(e, n.content), o = e.nodeType(n.type).create(n.attrs, i, r);
    return o.type.checkAttrs(o.attrs), o;
  }
};
vn.prototype.text = void 0;
class rl extends vn {
  /**
  @internal
  */
  constructor(e, n, r, i) {
    if (super(e, n, null, i), !r)
      throw new RangeError("Empty text nodes are not allowed");
    this.text = r;
  }
  toString() {
    return this.type.spec.toDebugString ? this.type.spec.toDebugString(this) : Qp(this.marks, JSON.stringify(this.text));
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
    return e == this.marks ? this : new rl(this.type, this.attrs, this.text, e);
  }
  withText(e) {
    return e == this.text ? this : new rl(this.type, this.attrs, e, this.marks);
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
function Qp(t, e) {
  for (let n = t.length - 1; n >= 0; n--)
    e = t[n].type.name + "(" + e + ")";
  return e;
}
class $r {
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
    let r = new V0(e, n);
    if (r.next == null)
      return $r.empty;
    let i = Xp(r);
    r.next && r.err("Unexpected trailing text");
    let o = J0(U0(i));
    return G0(o, r), o;
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
        return R.from(l.map((u) => u.createAndFill()));
      for (let u = 0; u < s.next.length; u++) {
        let { type: c, next: f } = s.next[u];
        if (!(c.isText || c.hasRequiredAttrs()) && i.indexOf(f) == -1) {
          i.push(f);
          let d = o(f, l.concat(c));
          if (d)
            return d;
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
$r.empty = new $r(!0);
class V0 {
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
function Xp(t) {
  let e = [];
  do
    e.push(H0(t));
  while (t.eat("|"));
  return e.length == 1 ? e[0] : { type: "choice", exprs: e };
}
function H0(t) {
  let e = [];
  do
    e.push(j0(t));
  while (t.next && t.next != ")" && t.next != "|");
  return e.length == 1 ? e[0] : { type: "seq", exprs: e };
}
function j0(t) {
  let e = K0(t);
  for (; ; )
    if (t.eat("+"))
      e = { type: "plus", expr: e };
    else if (t.eat("*"))
      e = { type: "star", expr: e };
    else if (t.eat("?"))
      e = { type: "opt", expr: e };
    else if (t.eat("{"))
      e = W0(t, e);
    else
      break;
  return e;
}
function dd(t) {
  /\D/.test(t.next) && t.err("Expected number, got '" + t.next + "'");
  let e = Number(t.next);
  return t.pos++, e;
}
function W0(t, e) {
  let n = dd(t), r = n;
  return t.eat(",") && (t.next != "}" ? r = dd(t) : r = -1), t.eat("}") || t.err("Unclosed braced range"), { type: "range", min: n, max: r, expr: e };
}
function q0(t, e) {
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
function K0(t) {
  if (t.eat("(")) {
    let e = Xp(t);
    return t.eat(")") || t.err("Missing closing paren"), e;
  } else if (/\W/.test(t.next))
    t.err("Unexpected token '" + t.next + "'");
  else {
    let e = q0(t, t.next).map((n) => (t.inline == null ? t.inline = n.isInline : t.inline != n.isInline && t.err("Mixing inline and block content"), { type: "name", value: n }));
    return t.pos++, e.length == 1 ? e[0] : { type: "choice", exprs: e };
  }
}
function U0(t) {
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
function Zp(t, e) {
  return e - t;
}
function hd(t, e) {
  let n = [];
  return r(e), n.sort(Zp);
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
function J0(t) {
  let e = /* @__PURE__ */ Object.create(null);
  return n(hd(t, 0));
  function n(r) {
    let i = [];
    r.forEach((s) => {
      t[s].forEach(({ term: l, to: a }) => {
        if (!l)
          return;
        let u;
        for (let c = 0; c < i.length; c++)
          i[c][0] == l && (u = i[c][1]);
        hd(t, a).forEach((c) => {
          u || i.push([l, u = []]), u.indexOf(c) == -1 && u.push(c);
        });
      });
    });
    let o = e[r.join(",")] = new $r(r.indexOf(t.length - 1) > -1);
    for (let s = 0; s < i.length; s++) {
      let l = i[s][1].sort(Zp);
      o.next.push({ type: i[s][0], next: e[l.join(",")] || n(l) });
    }
    return o;
  }
}
function G0(t, e) {
  for (let n = 0, r = [t]; n < r.length; n++) {
    let i = r[n], o = !i.validEnd, s = [];
    for (let l = 0; l < i.next.length; l++) {
      let { type: a, next: u } = i.next[l];
      s.push(a.name), o && !(a.isText || a.hasRequiredAttrs()) && (o = !1), r.indexOf(u) == -1 && r.push(u);
    }
    o && e.err("Only non-generatable nodes (" + s.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
  }
}
function em(t) {
  let e = /* @__PURE__ */ Object.create(null);
  for (let n in t) {
    let r = t[n];
    if (!r.hasDefault)
      return null;
    e[n] = r.default;
  }
  return e;
}
function tm(t, e) {
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
function nm(t, e, n, r) {
  for (let i in e)
    if (!(i in t))
      throw new RangeError(`Unsupported attribute ${i} for ${n} of type ${i}`);
  for (let i in t) {
    let o = t[i];
    o.validate && o.validate(e[i]);
  }
}
function rm(t, e) {
  let n = /* @__PURE__ */ Object.create(null);
  if (e)
    for (let r in e)
      n[r] = new Q0(t, r, e[r]);
  return n;
}
let pd = class im {
  /**
  @internal
  */
  constructor(e, n, r) {
    this.name = e, this.schema = n, this.spec = r, this.markSet = null, this.groups = r.group ? r.group.split(" ") : [], this.attrs = rm(e, r.attrs), this.defaultAttrs = em(this.attrs), this.contentMatch = null, this.inlineContent = null, this.isBlock = !(r.inline || e == "text"), this.isText = e == "text";
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
    return this.contentMatch == $r.empty;
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
    return !e && this.defaultAttrs ? this.defaultAttrs : tm(this.attrs, e);
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
    return new vn(this, this.computeAttrs(e), R.from(n), pe.setFrom(r));
  }
  /**
  Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but check the given content
  against the node type's content restrictions, and throw an error
  if it doesn't match.
  */
  createChecked(e = null, n, r) {
    return n = R.from(n), this.checkContent(n), new vn(this, this.computeAttrs(e), n, pe.setFrom(r));
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
    if (e = this.computeAttrs(e), n = R.from(n), n.size) {
      let s = this.contentMatch.fillBefore(n);
      if (!s)
        return null;
      n = s.append(n);
    }
    let i = this.contentMatch.matchFragment(n), o = i && i.fillBefore(R.empty, !0);
    return o ? new vn(this, e, n.append(o), pe.setFrom(r)) : null;
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
    nm(this.attrs, e, "node", this.name);
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
    return n ? n.length ? n : pe.none : e;
  }
  /**
  @internal
  */
  static compile(e, n) {
    let r = /* @__PURE__ */ Object.create(null);
    e.forEach((o, s) => r[o] = new im(o, n, s));
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
function Y0(t, e, n) {
  let r = n.split("|");
  return (i) => {
    let o = i === null ? "null" : typeof i;
    if (r.indexOf(o) < 0)
      throw new RangeError(`Expected value of type ${r} for attribute ${e} on type ${t}, got ${o}`);
  };
}
class Q0 {
  constructor(e, n, r) {
    this.hasDefault = Object.prototype.hasOwnProperty.call(r, "default"), this.default = r.default, this.validate = typeof r.validate == "string" ? Y0(e, n, r.validate) : r.validate;
  }
  get isRequired() {
    return !this.hasDefault;
  }
}
class Sl {
  /**
  @internal
  */
  constructor(e, n, r, i) {
    this.name = e, this.rank = n, this.schema = r, this.spec = i, this.attrs = rm(e, i.attrs), this.excluded = null;
    let o = em(this.attrs);
    this.instance = o ? new pe(this, o) : null;
  }
  /**
  Create a mark of this type. `attrs` may be `null` or an object
  containing only some of the mark's attributes. The others, if
  they have defaults, will be added.
  */
  create(e = null) {
    return !e && this.instance ? this.instance : new pe(this, tm(this.attrs, e));
  }
  /**
  @internal
  */
  static compile(e, n) {
    let r = /* @__PURE__ */ Object.create(null), i = 0;
    return e.forEach((o, s) => r[o] = new Sl(o, i++, n, s)), r;
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
    nm(this.attrs, e, "mark", this.name);
  }
  /**
  Queries whether a given mark type is
  [excluded](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) by this one.
  */
  excludes(e) {
    return this.excluded.indexOf(e) > -1;
  }
}
class X0 {
  /**
  Construct a schema from a schema [specification](https://prosemirror.net/docs/ref/#model.SchemaSpec).
  */
  constructor(e) {
    this.linebreakReplacement = null, this.cached = /* @__PURE__ */ Object.create(null);
    let n = this.spec = {};
    for (let i in e)
      n[i] = e[i];
    n.nodes = Je.from(e.nodes), n.marks = Je.from(e.marks || {}), this.nodes = pd.compile(this.spec.nodes, this), this.marks = Sl.compile(this.spec.marks, this);
    let r = /* @__PURE__ */ Object.create(null);
    for (let i in this.nodes) {
      if (i in this.marks)
        throw new RangeError(i + " can not be both a node and a mark");
      let o = this.nodes[i], s = o.spec.content || "", l = o.spec.marks;
      if (o.contentMatch = r[s] || (r[s] = $r.parse(s, this.nodes)), o.inlineContent = o.contentMatch.inlineContent, o.spec.linebreakReplacement) {
        if (this.linebreakReplacement)
          throw new RangeError("Multiple linebreak nodes defined");
        if (!o.isInline || !o.isLeaf)
          throw new RangeError("Linebreak replacement nodes must be inline leaf nodes");
        this.linebreakReplacement = o;
      }
      o.markSet = l == "_" ? null : l ? md(this, l.split(" ")) : l == "" || !o.inlineContent ? [] : null;
    }
    for (let i in this.marks) {
      let o = this.marks[i], s = o.spec.excludes;
      o.excluded = s == null ? [o] : s == "" ? [] : md(this, s.split(" "));
    }
    this.nodeFromJSON = (i) => vn.fromJSON(this, i), this.markFromJSON = (i) => pe.fromJSON(this, i), this.topNodeType = this.nodes[this.spec.topNode || "doc"], this.cached.wrappings = /* @__PURE__ */ Object.create(null);
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
    else if (e instanceof pd) {
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
    return new rl(r, r.defaultAttrs, e, pe.setFrom(n));
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
function md(t, e) {
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
function Z0(t) {
  return t.tag != null;
}
function ex(t) {
  return t.style != null;
}
let Fu = class Ga {
  /**
  Create a parser that targets the given schema, using the given
  parsing rules.
  */
  constructor(e, n) {
    this.schema = e, this.rules = n, this.tags = [], this.styles = [];
    let r = this.matchedStyles = [];
    n.forEach((i) => {
      if (Z0(i))
        this.tags.push(i);
      else if (ex(i)) {
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
    let r = new yd(this, n, !1);
    return r.addAll(e, pe.none, n.from, n.to), r.finish();
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
    let r = new yd(this, n, !0);
    return r.addAll(e, pe.none, n.from, n.to), _.maxOpen(r.finish());
  }
  /**
  @internal
  */
  matchTag(e, n, r) {
    for (let i = r ? this.tags.indexOf(r) + 1 : 0; i < this.tags.length; i++) {
      let o = this.tags[i];
      if (rx(e, o.tag) && (o.namespace === void 0 || e.namespaceURI == o.namespace) && (!o.context || n.matchesContext(o.context))) {
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
        r(s = kd(s)), s.mark || s.ignore || s.clearMark || (s.mark = i);
      });
    }
    for (let i in e.nodes) {
      let o = e.nodes[i].spec.parseDOM;
      o && o.forEach((s) => {
        r(s = kd(s)), s.node || s.ignore || s.mark || (s.node = i);
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
    return e.cached.domParser || (e.cached.domParser = new Ga(e, Ga.schemaRules(e)));
  }
};
const om = {
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
}, tx = {
  head: !0,
  noscript: !0,
  object: !0,
  script: !0,
  style: !0,
  title: !0
}, sm = { ol: !0, ul: !0 }, Io = 1, Ya = 2, po = 4;
function gd(t, e, n) {
  return e != null ? (e ? Io : 0) | (e === "full" ? Ya : 0) : t && t.whitespace == "pre" ? Io | Ya : n & ~po;
}
class As {
  constructor(e, n, r, i, o, s) {
    this.type = e, this.attrs = n, this.marks = r, this.solid = i, this.options = s, this.content = [], this.activeMarks = pe.none, this.match = o || (s & po ? null : e.contentMatch);
  }
  findWrapping(e) {
    if (!this.match) {
      if (!this.type)
        return [];
      let n = this.type.contentMatch.fillBefore(R.from(e));
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
    if (!(this.options & Io)) {
      let r = this.content[this.content.length - 1], i;
      if (r && r.isText && (i = /[ \t\r\n\u000c]+$/.exec(r.text))) {
        let o = r;
        r.text.length == i[0].length ? this.content.pop() : this.content[this.content.length - 1] = o.withText(o.text.slice(0, o.text.length - i[0].length));
      }
    }
    let n = R.from(this.content);
    return !e && this.match && (n = n.append(this.match.fillBefore(R.empty, !0))), this.type ? this.type.create(this.attrs, n, this.marks) : n;
  }
  inlineContext(e) {
    return this.type ? this.type.inlineContent : this.content.length ? this.content[0].isInline : e.parentNode && !om.hasOwnProperty(e.parentNode.nodeName.toLowerCase());
  }
}
class yd {
  constructor(e, n, r) {
    this.parser = e, this.options = n, this.isOpen = r, this.open = 0, this.localPreserveWS = !1;
    let i = n.topNode, o, s = gd(null, n.preserveWhitespace, 0) | (r ? po : 0);
    i ? o = new As(i.type, i.attrs, pe.none, !0, n.topMatch || i.type.contentMatch, s) : r ? o = new As(null, null, pe.none, !0, null, s) : o = new As(e.schema.topNodeType, null, pe.none, !0, null, s), this.nodes = [o], this.find = n.findPositions, this.needsBlock = !1;
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
    let r = e.nodeValue, i = this.top, o = i.options & Ya ? "full" : this.localPreserveWS || (i.options & Io) > 0, { schema: s } = this.parser;
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
    sm.hasOwnProperty(s) && this.parser.normalizeLists && nx(e);
    let a = this.options.ruleFromNode && this.options.ruleFromNode(e) || (l = this.parser.matchTag(e, this, r));
    e: if (a ? a.ignore : tx.hasOwnProperty(s))
      this.findInside(e), this.ignoreFallback(e, n);
    else if (!a || a.skip || a.closeParent) {
      a && a.closeParent ? this.open = Math.max(0, this.open - 1) : a && a.skip.nodeType && (e = a.skip);
      let u, c = this.needsBlock;
      if (om.hasOwnProperty(s))
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
      let s = pe.none;
      for (let l of i.concat(e.marks))
        (o.type ? o.type.allowsMarkType(l.type) : bd(l.type, e.type)) && (s = l.addToSet(s));
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
    let l = gd(e, o, s.options);
    s.options & po && s.content.length == 0 && (l |= po);
    let a = pe.none;
    return r = r.filter((u) => (s.type ? s.type.allowsMarkType(u.type) : bd(u.type, e)) ? (a = u.addToSet(a), !1) : !0), this.nodes.push(new As(e, n, a, i, null, l)), this.open++, r;
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
      this.localPreserveWS && (this.nodes[n].options |= Io);
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
function nx(t) {
  for (let e = t.firstChild, n = null; e; e = e.nextSibling) {
    let r = e.nodeType == 1 ? e.nodeName.toLowerCase() : null;
    r && sm.hasOwnProperty(r) && n ? (n.appendChild(e), e = n) : r == "li" ? n = e : r && (n = null);
  }
}
function rx(t, e) {
  return (t.matches || t.msMatchesSelector || t.webkitMatchesSelector || t.mozMatchesSelector).call(t, e);
}
function kd(t) {
  let e = {};
  for (let n in t)
    e[n] = t[n];
  return e;
}
function bd(t, e) {
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
class _i {
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
    r || (r = Gl(n).createDocumentFragment());
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
    let { dom: r, contentDOM: i } = Fs(Gl(n), this.nodes[e.type.name](e), null, e.attrs);
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
    return i && Fs(Gl(r), i(e, n), null, e.attrs);
  }
  static renderSpec(e, n, r = null, i) {
    return Fs(e, n, r, i);
  }
  /**
  Build a serializer using the [`toDOM`](https://prosemirror.net/docs/ref/#model.NodeSpec.toDOM)
  properties in a schema's node and mark specs.
  */
  static fromSchema(e) {
    return e.cached.domSerializer || (e.cached.domSerializer = new _i(this.nodesFromSchema(e), this.marksFromSchema(e)));
  }
  /**
  Gather the serializers in a schema's node specs into an object.
  This can be useful as a base to build a custom serializer from.
  */
  static nodesFromSchema(e) {
    let n = wd(e.nodes);
    return n.text || (n.text = (r) => r.text), n;
  }
  /**
  Gather the serializers in a schema's mark specs into an object.
  */
  static marksFromSchema(e) {
    return wd(e.marks);
  }
}
function wd(t) {
  let e = {};
  for (let n in t) {
    let r = t[n].spec.toDOM;
    r && (e[n] = r);
  }
  return e;
}
function Gl(t) {
  return t.document || window.document;
}
const xd = /* @__PURE__ */ new WeakMap();
function ix(t) {
  let e = xd.get(t);
  return e === void 0 && xd.set(t, e = ox(t)), e;
}
function ox(t) {
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
function Fs(t, e, n, r) {
  if (typeof e == "string")
    return { dom: t.createTextNode(e) };
  if (e.nodeType != null)
    return { dom: e };
  if (e.dom && e.dom.nodeType != null)
    return e;
  let i = e[0], o;
  if (typeof i != "string")
    throw new RangeError("Invalid array passed to renderSpec");
  if (r && (o = ix(r)) && o.indexOf(e) > -1)
    throw new RangeError("Using an array from an attribute object as a DOM spec. This may be an attempted cross site scripting attack.");
  let s = i.indexOf(" ");
  s > 0 && (n = i.slice(0, s), i = i.slice(s + 1));
  let l, a = n ? t.createElementNS(n, i) : t.createElement(i), u = e[1], c = 1;
  if (u && typeof u == "object" && u.nodeType == null && !Array.isArray(u)) {
    c = 2;
    for (let f in u)
      if (u[f] != null) {
        let d = f.indexOf(" ");
        d > 0 ? a.setAttributeNS(f.slice(0, d), f.slice(d + 1), u[f]) : f == "style" && a.style ? a.style.cssText = u[f] : a.setAttribute(f, u[f]);
      }
  }
  for (let f = c; f < e.length; f++) {
    let d = e[f];
    if (d === 0) {
      if (f < e.length - 1 || f > c)
        throw new RangeError("Content hole must be the only child of its parent node");
      return { dom: a, contentDOM: a };
    } else {
      let { dom: h, contentDOM: p } = Fs(t, d, n, r);
      if (a.appendChild(h), p) {
        if (l)
          throw new RangeError("Multiple content holes");
        l = p;
      }
    }
  }
  return { dom: a, contentDOM: l };
}
const lm = 65535, am = Math.pow(2, 16);
function sx(t, e) {
  return t + e * am;
}
function Cd(t) {
  return t & lm;
}
function lx(t) {
  return (t - (t & lm)) / am;
}
const um = 1, cm = 2, $s = 4, fm = 8;
class Qa {
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
    return (this.delInfo & fm) > 0;
  }
  /**
  Tells you whether the token before the mapped position was deleted.
  */
  get deletedBefore() {
    return (this.delInfo & (um | $s)) > 0;
  }
  /**
  True when the token after the mapped position was deleted.
  */
  get deletedAfter() {
    return (this.delInfo & (cm | $s)) > 0;
  }
  /**
  Tells whether any of the steps mapped through deletes across the
  position (including both the token before and after the
  position).
  */
  get deletedAcross() {
    return (this.delInfo & $s) > 0;
  }
}
class vt {
  /**
  Create a position map. The modifications to the document are
  represented as an array of numbers, in which each group of three
  represents a modified chunk as `[start, oldSize, newSize]`.
  */
  constructor(e, n = !1) {
    if (this.ranges = e, this.inverted = n, !e.length && vt.empty)
      return vt.empty;
  }
  /**
  @internal
  */
  recover(e) {
    let n = 0, r = Cd(e);
    if (!this.inverted)
      for (let i = 0; i < r; i++)
        n += this.ranges[i * 3 + 2] - this.ranges[i * 3 + 1];
    return this.ranges[r * 3] + n + lx(e);
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
        let d = u ? e == a ? -1 : e == f ? 1 : n : n, h = a + i + (d < 0 ? 0 : c);
        if (r)
          return h;
        let p = e == (n < 0 ? a : f) ? null : sx(l / 3, e - a), k = e == a ? cm : e == f ? um : $s;
        return (n < 0 ? e != a : e != f) && (k |= fm), new Qa(h, k, p);
      }
      i += c - u;
    }
    return r ? e + i : new Qa(e + i, 0, null);
  }
  /**
  @internal
  */
  touches(e, n) {
    let r = 0, i = Cd(n), o = this.inverted ? 2 : 1, s = this.inverted ? 1 : 2;
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
    return new vt(this.ranges, !this.inverted);
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
    return e == 0 ? vt.empty : new vt(e < 0 ? [0, -e, 0] : [0, 0, e]);
  }
}
vt.empty = new vt([]);
class Ao {
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
    return new Ao(this._maps, this.mirror, e, n);
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
    let e = new Ao();
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
    return r ? e : new Qa(e, i, null);
  }
}
const Yl = /* @__PURE__ */ Object.create(null);
class nt {
  /**
  Get the step map that represents the changes made by this step,
  and which can be used to transform between positions in the old
  and the new document.
  */
  getMap() {
    return vt.empty;
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
    let r = Yl[n.stepType];
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
    if (e in Yl)
      throw new RangeError("Duplicate use of step JSON ID " + e);
    return Yl[e] = n, n.prototype.jsonID = e, n;
  }
}
class De {
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
    return new De(e, null);
  }
  /**
  Create a failed step result.
  */
  static fail(e) {
    return new De(null, e);
  }
  /**
  Call [`Node.replace`](https://prosemirror.net/docs/ref/#model.Node.replace) with the given
  arguments. Create a successful result if it succeeds, and a
  failed one if it throws a `ReplaceError`.
  */
  static fromReplace(e, n, r, i) {
    try {
      return De.ok(e.replace(n, r, i));
    } catch (o) {
      if (o instanceof tl)
        return De.fail(o.message);
      throw o;
    }
  }
}
function $u(t, e, n) {
  let r = [];
  for (let i = 0; i < t.childCount; i++) {
    let o = t.child(i);
    o.content.size && (o = o.copy($u(o.content, e, o))), o.isInline && (o = e(o, n, i)), r.push(o);
  }
  return R.fromArray(r);
}
class Cn extends nt {
  /**
  Create a mark step.
  */
  constructor(e, n, r) {
    super(), this.from = e, this.to = n, this.mark = r;
  }
  apply(e) {
    let n = e.slice(this.from, this.to), r = e.resolve(this.from), i = r.node(r.sharedDepth(this.to)), o = new _($u(n.content, (s, l) => !s.isAtom || !l.type.allowsMarkType(this.mark.type) ? s : s.mark(this.mark.addToSet(s.marks)), i), n.openStart, n.openEnd);
    return De.fromReplace(e, this.from, this.to, o);
  }
  invert() {
    return new Xt(this.from, this.to, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
    return n.deleted && r.deleted || n.pos >= r.pos ? null : new Cn(n.pos, r.pos, this.mark);
  }
  merge(e) {
    return e instanceof Cn && e.mark.eq(this.mark) && this.from <= e.to && this.to >= e.from ? new Cn(Math.min(this.from, e.from), Math.max(this.to, e.to), this.mark) : null;
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
    return new Cn(n.from, n.to, e.markFromJSON(n.mark));
  }
}
nt.jsonID("addMark", Cn);
class Xt extends nt {
  /**
  Create a mark-removing step.
  */
  constructor(e, n, r) {
    super(), this.from = e, this.to = n, this.mark = r;
  }
  apply(e) {
    let n = e.slice(this.from, this.to), r = new _($u(n.content, (i) => i.mark(this.mark.removeFromSet(i.marks)), e), n.openStart, n.openEnd);
    return De.fromReplace(e, this.from, this.to, r);
  }
  invert() {
    return new Cn(this.from, this.to, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
    return n.deleted && r.deleted || n.pos >= r.pos ? null : new Xt(n.pos, r.pos, this.mark);
  }
  merge(e) {
    return e instanceof Xt && e.mark.eq(this.mark) && this.from <= e.to && this.to >= e.from ? new Xt(Math.min(this.from, e.from), Math.max(this.to, e.to), this.mark) : null;
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
    return new Xt(n.from, n.to, e.markFromJSON(n.mark));
  }
}
nt.jsonID("removeMark", Xt);
class Jn extends nt {
  /**
  Create a node mark step.
  */
  constructor(e, n) {
    super(), this.pos = e, this.mark = n;
  }
  apply(e) {
    let n = e.nodeAt(this.pos);
    if (!n)
      return De.fail("No node at mark step's position");
    let r = n.type.create(n.attrs, null, this.mark.addToSet(n.marks));
    return De.fromReplace(e, this.pos, this.pos + 1, new _(R.from(r), 0, n.isLeaf ? 0 : 1));
  }
  invert(e) {
    let n = e.nodeAt(this.pos);
    if (n) {
      let r = this.mark.addToSet(n.marks);
      if (r.length == n.marks.length) {
        for (let i = 0; i < n.marks.length; i++)
          if (!n.marks[i].isInSet(r))
            return new Jn(this.pos, n.marks[i]);
        return new Jn(this.pos, this.mark);
      }
    }
    return new _r(this.pos, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.pos, 1);
    return n.deletedAfter ? null : new Jn(n.pos, this.mark);
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
    return new Jn(n.pos, e.markFromJSON(n.mark));
  }
}
nt.jsonID("addNodeMark", Jn);
class _r extends nt {
  /**
  Create a mark-removing step.
  */
  constructor(e, n) {
    super(), this.pos = e, this.mark = n;
  }
  apply(e) {
    let n = e.nodeAt(this.pos);
    if (!n)
      return De.fail("No node at mark step's position");
    let r = n.type.create(n.attrs, null, this.mark.removeFromSet(n.marks));
    return De.fromReplace(e, this.pos, this.pos + 1, new _(R.from(r), 0, n.isLeaf ? 0 : 1));
  }
  invert(e) {
    let n = e.nodeAt(this.pos);
    return !n || !this.mark.isInSet(n.marks) ? this : new Jn(this.pos, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.pos, 1);
    return n.deletedAfter ? null : new _r(n.pos, this.mark);
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
    return new _r(n.pos, e.markFromJSON(n.mark));
  }
}
nt.jsonID("removeNodeMark", _r);
class Oe extends nt {
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
    return this.structure && Xa(e, this.from, this.to) ? De.fail("Structure replace would overwrite content") : De.fromReplace(e, this.from, this.to, this.slice);
  }
  getMap() {
    return new vt([this.from, this.to - this.from, this.slice.size]);
  }
  invert(e) {
    return new Oe(this.from, this.from + this.slice.size, e.slice(this.from, this.to));
  }
  map(e) {
    let n = e.mapResult(this.to, -1), r = this.from == this.to && Oe.MAP_BIAS < 0 ? n : e.mapResult(this.from, 1);
    return r.deletedAcross && n.deletedAcross ? null : new Oe(r.pos, Math.max(r.pos, n.pos), this.slice, this.structure);
  }
  merge(e) {
    if (!(e instanceof Oe) || e.structure || this.structure)
      return null;
    if (this.from + this.slice.size == e.from && !this.slice.openEnd && !e.slice.openStart) {
      let n = this.slice.size + e.slice.size == 0 ? _.empty : new _(this.slice.content.append(e.slice.content), this.slice.openStart, e.slice.openEnd);
      return new Oe(this.from, this.to + (e.to - e.from), n, this.structure);
    } else if (e.to == this.from && !this.slice.openStart && !e.slice.openEnd) {
      let n = this.slice.size + e.slice.size == 0 ? _.empty : new _(e.slice.content.append(this.slice.content), e.slice.openStart, this.slice.openEnd);
      return new Oe(e.from, this.to, n, this.structure);
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
    return new Oe(n.from, n.to, _.fromJSON(e, n.slice), !!n.structure);
  }
}
Oe.MAP_BIAS = 1;
nt.jsonID("replace", Oe);
class et extends nt {
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
    if (this.structure && (Xa(e, this.from, this.gapFrom) || Xa(e, this.gapTo, this.to)))
      return De.fail("Structure gap-replace would overwrite content");
    let n = e.slice(this.gapFrom, this.gapTo);
    if (n.openStart || n.openEnd)
      return De.fail("Gap is not a flat range");
    let r = this.slice.insertAt(this.insert, n.content);
    return r ? De.fromReplace(e, this.from, this.to, r) : De.fail("Content does not fit in gap");
  }
  getMap() {
    return new vt([
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
    return new et(this.from, this.from + this.slice.size + n, this.from + this.insert, this.from + this.insert + n, e.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
  }
  map(e) {
    let n = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1), i = this.from == this.gapFrom ? n.pos : e.map(this.gapFrom, -1), o = this.to == this.gapTo ? r.pos : e.map(this.gapTo, 1);
    return n.deletedAcross && r.deletedAcross || i < n.pos || o > r.pos ? null : new et(n.pos, r.pos, i, o, this.slice, this.insert, this.structure);
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
    return new et(n.from, n.to, n.gapFrom, n.gapTo, _.fromJSON(e, n.slice), n.insert, !!n.structure);
  }
}
nt.jsonID("replaceAround", et);
function Xa(t, e, n) {
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
function ax(t, e, n, r) {
  let i = [], o = [], s, l;
  t.doc.nodesBetween(e, n, (a, u, c) => {
    if (!a.isInline)
      return;
    let f = a.marks;
    if (!r.isInSet(f) && c.type.allowsMarkType(r.type)) {
      let d = Math.max(u, e), h = Math.min(u + a.nodeSize, n), p = r.addToSet(f);
      for (let k = 0; k < f.length; k++)
        f[k].isInSet(p) || (s && s.to == d && s.mark.eq(f[k]) ? s.to = h : i.push(s = new Xt(d, h, f[k])));
      l && l.to == d ? l.to = h : o.push(l = new Cn(d, h, r));
    }
  }), i.forEach((a) => t.step(a)), o.forEach((a) => t.step(a));
}
function ux(t, e, n, r) {
  let i = [], o = 0;
  t.doc.nodesBetween(e, n, (s, l) => {
    if (!s.isInline)
      return;
    o++;
    let a = null;
    if (r instanceof Sl) {
      let u = s.marks, c;
      for (; c = r.isInSet(u); )
        (a || (a = [])).push(c), u = c.removeFromSet(u);
    } else r ? r.isInSet(s.marks) && (a = [r]) : a = s.marks;
    if (a && a.length) {
      let u = Math.min(l + s.nodeSize, n);
      for (let c = 0; c < a.length; c++) {
        let f = a[c], d;
        for (let h = 0; h < i.length; h++) {
          let p = i[h];
          p.step == o - 1 && f.eq(i[h].style) && (d = p);
        }
        d ? (d.to = u, d.step = o) : i.push({ style: f, from: Math.max(l, e), to: u, step: o });
      }
    }
  }), i.forEach((s) => t.step(new Xt(s.from, s.to, s.style)));
}
function _u(t, e, n, r = n.contentMatch, i = !0) {
  let o = t.doc.nodeAt(e), s = [], l = e + 1;
  for (let a = 0; a < o.childCount; a++) {
    let u = o.child(a), c = l + u.nodeSize, f = r.matchType(u.type);
    if (!f)
      s.push(new Oe(l, c, _.empty));
    else {
      r = f;
      for (let d = 0; d < u.marks.length; d++)
        n.allowsMarkType(u.marks[d].type) || t.step(new Xt(l, c, u.marks[d]));
      if (i && u.isText && n.whitespace != "pre") {
        let d, h = /\r?\n|\r/g, p;
        for (; d = h.exec(u.text); )
          p || (p = new _(R.from(n.schema.text(" ", n.allowedMarks(u.marks))), 0, 0)), s.push(new Oe(l + d.index, l + d.index + d[0].length, p));
      }
    }
    l = c;
  }
  if (!r.validEnd) {
    let a = r.fillBefore(R.empty, !0);
    t.replace(l, l, new _(a, 0, 0));
  }
  for (let a = s.length - 1; a >= 0; a--)
    t.step(s[a]);
}
function cx(t, e, n) {
  return (e == 0 || t.canReplace(e, t.childCount)) && (n == t.childCount || t.canReplace(0, n));
}
function Ml(t) {
  let n = t.parent.content.cutByIndex(t.startIndex, t.endIndex);
  for (let r = t.depth, i = 0, o = 0; ; --r) {
    let s = t.$from.node(r), l = t.$from.index(r) + i, a = t.$to.indexAfter(r) - o;
    if (r < t.depth && s.canReplace(l, a, n))
      return r;
    if (r == 0 || s.type.spec.isolating || !cx(s, l, a))
      break;
    l && (i = 1), a < s.childCount && (o = 1);
  }
  return null;
}
function fx(t, e, n) {
  let { $from: r, $to: i, depth: o } = e, s = r.before(o + 1), l = i.after(o + 1), a = s, u = l, c = R.empty, f = 0;
  for (let p = o, k = !1; p > n; p--)
    k || r.index(p) > 0 ? (k = !0, c = R.from(r.node(p).copy(c)), f++) : a--;
  let d = R.empty, h = 0;
  for (let p = o, k = !1; p > n; p--)
    k || i.after(p + 1) < i.end(p) ? (k = !0, d = R.from(i.node(p).copy(d)), h++) : u++;
  t.step(new et(a, u, s, l, new _(c.append(d), f, h), c.size - f, !0));
}
function Vu(t, e, n = null, r = t) {
  let i = dx(t, e), o = i && hx(r, e);
  return o ? i.map(Sd).concat({ type: e, attrs: n }).concat(o.map(Sd)) : null;
}
function Sd(t) {
  return { type: t, attrs: null };
}
function dx(t, e) {
  let { parent: n, startIndex: r, endIndex: i } = t, o = n.contentMatchAt(r).findWrapping(e);
  if (!o)
    return null;
  let s = o.length ? o[0] : e;
  return n.canReplaceWith(r, i, s) ? o : null;
}
function hx(t, e) {
  let { parent: n, startIndex: r, endIndex: i } = t, o = n.child(r), s = e.contentMatch.findWrapping(o.type);
  if (!s)
    return null;
  let a = (s.length ? s[s.length - 1] : e).contentMatch;
  for (let u = r; a && u < i; u++)
    a = a.matchType(n.child(u).type);
  return !a || !a.validEnd ? null : s;
}
function px(t, e, n) {
  let r = R.empty;
  for (let s = n.length - 1; s >= 0; s--) {
    if (r.size) {
      let l = n[s].type.contentMatch.matchFragment(r);
      if (!l || !l.validEnd)
        throw new RangeError("Wrapper type given to Transform.wrap does not form valid content of its parent wrapper");
    }
    r = R.from(n[s].type.create(n[s].attrs, r));
  }
  let i = e.start, o = e.end;
  t.step(new et(i, o, i, o, new _(r, 0, 0), n.length, !0));
}
function mx(t, e, n, r, i) {
  if (!r.isTextblock)
    throw new RangeError("Type given to setBlockType should be a textblock");
  let o = t.steps.length;
  t.doc.nodesBetween(e, n, (s, l) => {
    let a = typeof i == "function" ? i(s) : i;
    if (s.isTextblock && !s.hasMarkup(r, a) && gx(t.doc, t.mapping.slice(o).map(l), r)) {
      let u = null;
      if (r.schema.linebreakReplacement) {
        let h = r.whitespace == "pre", p = !!r.contentMatch.matchType(r.schema.linebreakReplacement);
        h && !p ? u = !1 : !h && p && (u = !0);
      }
      u === !1 && hm(t, s, l, o), _u(t, t.mapping.slice(o).map(l, 1), r, void 0, u === null);
      let c = t.mapping.slice(o), f = c.map(l, 1), d = c.map(l + s.nodeSize, 1);
      return t.step(new et(f, d, f + 1, d - 1, new _(R.from(r.create(a, null, s.marks)), 0, 0), 1, !0)), u === !0 && dm(t, s, l, o), !1;
    }
  });
}
function dm(t, e, n, r) {
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
function hm(t, e, n, r) {
  e.forEach((i, o) => {
    if (i.type == i.type.schema.linebreakReplacement) {
      let s = t.mapping.slice(r).map(n + 1 + o);
      t.replaceWith(s, s + 1, e.type.schema.text(`
`));
    }
  });
}
function gx(t, e, n) {
  let r = t.resolve(e), i = r.index();
  return r.parent.canReplaceWith(i, i + 1, n);
}
function yx(t, e, n, r, i) {
  let o = t.doc.nodeAt(e);
  if (!o)
    throw new RangeError("No node at given position");
  n || (n = o.type);
  let s = n.create(r, null, i || o.marks);
  if (o.isLeaf)
    return t.replaceWith(e, e + o.nodeSize, s);
  if (!n.validContent(o.content))
    throw new RangeError("Invalid content for node type " + n.name);
  t.step(new et(e, e + o.nodeSize, e + 1, e + o.nodeSize - 1, new _(R.from(s), 0, 0), 1, !0));
}
function mo(t, e, n = 1, r) {
  let i = t.resolve(e), o = i.depth - n, s = r && r[r.length - 1] || i.parent;
  if (o < 0 || i.parent.type.spec.isolating || !i.parent.canReplace(i.index(), i.parent.childCount) || !s.type.validContent(i.parent.content.cutByIndex(i.index(), i.parent.childCount)))
    return !1;
  for (let u = i.depth - 1, c = n - 2; u > o; u--, c--) {
    let f = i.node(u), d = i.index(u);
    if (f.type.spec.isolating)
      return !1;
    let h = f.content.cutByIndex(d, f.childCount), p = r && r[c + 1];
    p && (h = h.replaceChild(0, p.type.create(p.attrs)));
    let k = r && r[c] || f;
    if (!f.canReplace(d + 1, f.childCount) || !k.type.validContent(h))
      return !1;
  }
  let l = i.indexAfter(o), a = r && r[0];
  return i.node(o).canReplaceWith(l, l, a ? a.type : i.node(o + 1).type);
}
function kx(t, e, n = 1, r) {
  let i = t.doc.resolve(e), o = R.empty, s = R.empty;
  for (let l = i.depth, a = i.depth - n, u = n - 1; l > a; l--, u--) {
    o = R.from(i.node(l).copy(o));
    let c = r && r[u];
    s = R.from(c ? c.type.create(c.attrs, s) : i.node(l).copy(s));
  }
  t.step(new Oe(e, e, new _(o.append(s), n, n), !0));
}
function vl(t, e) {
  let n = t.resolve(e), r = n.index();
  return wx(n.nodeBefore, n.nodeAfter) && n.parent.canReplace(r, r + 1);
}
function bx(t, e) {
  e.content.size || t.type.compatibleContent(e.type);
  let n = t.contentMatchAt(t.childCount), { linebreakReplacement: r } = t.type.schema;
  for (let i = 0; i < e.childCount; i++) {
    let o = e.child(i), s = o.type == r ? t.type.schema.nodes.text : o.type;
    if (n = n.matchType(s), !n || !t.type.allowsMarks(o.marks))
      return !1;
  }
  return n.validEnd;
}
function wx(t, e) {
  return !!(t && e && !t.isLeaf && bx(t, e));
}
function xx(t, e, n) {
  let r = null, { linebreakReplacement: i } = t.doc.type.schema, o = t.doc.resolve(e - n), s = o.node().type;
  if (i && s.inlineContent) {
    let c = s.whitespace == "pre", f = !!s.contentMatch.matchType(i);
    c && !f ? r = !1 : !c && f && (r = !0);
  }
  let l = t.steps.length;
  if (r === !1) {
    let c = t.doc.resolve(e + n);
    hm(t, c.node(), c.before(), l);
  }
  s.inlineContent && _u(t, e + n - 1, s, o.node().contentMatchAt(o.index()), r == null);
  let a = t.mapping.slice(l), u = a.map(e - n);
  if (t.step(new Oe(u, a.map(e + n, -1), _.empty, !0)), r === !0) {
    let c = t.doc.resolve(u);
    dm(t, c.node(), c.before(), t.steps.length);
  }
  return t;
}
function Cx(t, e, n) {
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
function Sx(t, e, n) {
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
function Tl(t, e, n = e, r = _.empty) {
  if (e == n && !r.size)
    return null;
  let i = t.resolve(e), o = t.resolve(n);
  return pm(i, o, r) ? new Oe(e, n, r) : new Mx(i, o, r).fit();
}
function pm(t, e, n) {
  return !n.openStart && !n.openEnd && t.start() == e.start() && t.parent.canReplace(t.index(), e.index(), n.content);
}
class Mx {
  constructor(e, n, r) {
    this.$from = e, this.$to = n, this.unplaced = r, this.frontier = [], this.placed = R.empty;
    for (let i = 0; i <= e.depth; i++) {
      let o = e.node(i);
      this.frontier.push({
        type: o.type,
        match: o.contentMatchAt(e.indexAfter(i))
      });
    }
    for (let i = e.depth; i > 0; i--)
      this.placed = R.from(e.node(i).copy(this.placed));
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
    let a = new _(o, s, l);
    return e > -1 ? new et(r.pos, e, this.$to.pos, this.$to.end(), a, n) : a.size || r.pos != this.$to.pos ? new Oe(r.pos, i.pos, a) : null;
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
        r ? (o = Ql(this.unplaced.content, r - 1).firstChild, i = o.content) : i = this.unplaced.content;
        let s = i.firstChild;
        for (let l = this.depth; l >= 0; l--) {
          let { type: a, match: u } = this.frontier[l], c, f = null;
          if (n == 1 && (s ? u.matchType(s.type) || (f = u.fillBefore(R.from(s), !1)) : o && a.compatibleContent(o.type)))
            return { sliceDepth: r, frontierDepth: l, parent: o, inject: f };
          if (n == 2 && s && (c = u.findWrapping(s.type)))
            return { sliceDepth: r, frontierDepth: l, parent: o, wrap: c };
          if (o && u.matchType(o.type))
            break;
        }
      }
  }
  openMore() {
    let { content: e, openStart: n, openEnd: r } = this.unplaced, i = Ql(e, n);
    return !i.childCount || i.firstChild.isLeaf ? !1 : (this.unplaced = new _(e, n + 1, Math.max(r, i.size + n >= e.size - r ? n + 1 : 0)), !0);
  }
  dropNode() {
    let { content: e, openStart: n, openEnd: r } = this.unplaced, i = Ql(e, n);
    if (i.childCount <= 1 && n > 0) {
      let o = e.size - n <= n + i.size;
      this.unplaced = new _(so(e, n - 1, 1), n - 1, o ? n - 1 : r);
    } else
      this.unplaced = new _(so(e, n, 1), n, r);
  }
  // Move content from the unplaced slice at `sliceDepth` to the
  // frontier node at `frontierDepth`. Close that frontier node when
  // applicable.
  placeNodes({ sliceDepth: e, frontierDepth: n, parent: r, inject: i, wrap: o }) {
    for (; this.depth > n; )
      this.closeFrontierNode();
    if (o)
      for (let k = 0; k < o.length; k++)
        this.openFrontierNode(o[k]);
    let s = this.unplaced, l = r ? r.content : s.content, a = s.openStart - e, u = 0, c = [], { match: f, type: d } = this.frontier[n];
    if (i) {
      for (let k = 0; k < i.childCount; k++)
        c.push(i.child(k));
      f = f.matchFragment(i);
    }
    let h = l.size + e - (s.content.size - s.openEnd);
    for (; u < l.childCount; ) {
      let k = l.child(u), w = f.matchType(k.type);
      if (!w)
        break;
      u++, (u > 1 || a == 0 || k.content.size) && (f = w, c.push(mm(k.mark(d.allowedMarks(k.marks)), u == 1 ? a : 0, u == l.childCount ? h : -1)));
    }
    let p = u == l.childCount;
    p || (h = -1), this.placed = lo(this.placed, n, R.from(c)), this.frontier[n].match = f, p && h < 0 && r && r.type == this.frontier[this.depth].type && this.frontier.length > 1 && this.closeFrontierNode();
    for (let k = 0, w = l; k < h; k++) {
      let b = w.lastChild;
      this.frontier.push({ type: b.type, match: b.contentMatchAt(b.childCount) }), w = b.content;
    }
    this.unplaced = p ? e == 0 ? _.empty : new _(so(s.content, e - 1, 1), e - 1, h < 0 ? s.openEnd : e - 1) : new _(so(s.content, e, u), s.openStart, s.openEnd);
  }
  mustMoveInline() {
    if (!this.$to.parent.isTextblock)
      return -1;
    let e = this.frontier[this.depth], n;
    if (!e.type.isTextblock || !Xl(this.$to, this.$to.depth, e.type, e.match, !1) || this.$to.depth == this.depth && (n = this.findCloseLevel(this.$to)) && n.depth == this.depth)
      return -1;
    let { depth: r } = this.$to, i = this.$to.after(r);
    for (; r > 1 && i == this.$to.end(--r); )
      ++i;
    return i;
  }
  findCloseLevel(e) {
    e: for (let n = Math.min(this.depth, e.depth); n >= 0; n--) {
      let { match: r, type: i } = this.frontier[n], o = n < e.depth && e.end(n + 1) == e.pos + (e.depth - (n + 1)), s = Xl(e, n, i, r, o);
      if (s) {
        for (let l = n - 1; l >= 0; l--) {
          let { match: a, type: u } = this.frontier[l], c = Xl(e, l, u, a, !0);
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
    n.fit.childCount && (this.placed = lo(this.placed, n.depth, n.fit)), e = n.move;
    for (let r = n.depth + 1; r <= e.depth; r++) {
      let i = e.node(r), o = i.type.contentMatch.fillBefore(i.content, !0, e.index(r));
      this.openFrontierNode(i.type, i.attrs, o);
    }
    return e;
  }
  openFrontierNode(e, n = null, r) {
    let i = this.frontier[this.depth];
    i.match = i.match.matchType(e), this.placed = lo(this.placed, this.depth, R.from(e.create(n, r))), this.frontier.push({ type: e, match: e.contentMatch });
  }
  closeFrontierNode() {
    let n = this.frontier.pop().match.fillBefore(R.empty, !0);
    n.childCount && (this.placed = lo(this.placed, this.frontier.length, n));
  }
}
function so(t, e, n) {
  return e == 0 ? t.cutByIndex(n, t.childCount) : t.replaceChild(0, t.firstChild.copy(so(t.firstChild.content, e - 1, n)));
}
function lo(t, e, n) {
  return e == 0 ? t.append(n) : t.replaceChild(t.childCount - 1, t.lastChild.copy(lo(t.lastChild.content, e - 1, n)));
}
function Ql(t, e) {
  for (let n = 0; n < e; n++)
    t = t.firstChild.content;
  return t;
}
function mm(t, e, n) {
  if (e <= 0)
    return t;
  let r = t.content;
  return e > 1 && (r = r.replaceChild(0, mm(r.firstChild, e - 1, r.childCount == 1 ? n - 1 : 0))), e > 0 && (r = t.type.contentMatch.fillBefore(r).append(r), n <= 0 && (r = r.append(t.type.contentMatch.matchFragment(r).fillBefore(R.empty, !0)))), t.copy(r);
}
function Xl(t, e, n, r, i) {
  let o = t.node(e), s = i ? t.indexAfter(e) : t.index(e);
  if (s == o.childCount && !n.compatibleContent(o.type))
    return null;
  let l = r.fillBefore(o.content, !0, s);
  return l && !vx(n, o.content, s) ? l : null;
}
function vx(t, e, n) {
  for (let r = n; r < e.childCount; r++)
    if (!t.allowsMarks(e.child(r).marks))
      return !0;
  return !1;
}
function Tx(t) {
  return t.spec.defining || t.spec.definingForContent;
}
function Nx(t, e, n, r) {
  if (!r.size)
    return t.deleteRange(e, n);
  let i = t.doc.resolve(e), o = t.doc.resolve(n);
  if (pm(i, o, r))
    return t.step(new Oe(e, n, r));
  let s = ym(i, o);
  s[s.length - 1] == 0 && s.pop();
  let l = -(i.depth + 1);
  s.unshift(l);
  for (let d = i.depth, h = i.pos - 1; d > 0; d--, h--) {
    let p = i.node(d).type.spec;
    if (p.defining || p.definingAsContext || p.isolating)
      break;
    s.indexOf(d) > -1 ? l = d : i.before(d) == h && s.splice(1, 0, -d);
  }
  let a = s.indexOf(l), u = [], c = r.openStart;
  for (let d = r.content, h = 0; ; h++) {
    let p = d.firstChild;
    if (u.push(p), h == r.openStart)
      break;
    d = p.content;
  }
  for (let d = c - 1; d >= 0; d--) {
    let h = u[d], p = Tx(h.type);
    if (p && !h.sameMarkup(i.node(Math.abs(l) - 1)))
      c = d;
    else if (p || !h.type.isTextblock)
      break;
  }
  for (let d = r.openStart; d >= 0; d--) {
    let h = (d + c + 1) % (r.openStart + 1), p = u[h];
    if (p)
      for (let k = 0; k < s.length; k++) {
        let w = s[(k + a) % s.length], b = !0;
        w < 0 && (b = !1, w = -w);
        let L = i.node(w - 1), E = i.index(w - 1);
        if (L.canReplaceWith(E, E, p.type, p.marks))
          return t.replace(i.before(w), b ? o.after(w) : n, new _(gm(r.content, 0, r.openStart, h), h, r.openEnd));
      }
  }
  let f = t.steps.length;
  for (let d = s.length - 1; d >= 0 && (t.replace(e, n, r), !(t.steps.length > f)); d--) {
    let h = s[d];
    h < 0 || (e = i.before(h), n = o.after(h));
  }
}
function gm(t, e, n, r, i) {
  if (e < n) {
    let o = t.firstChild;
    t = t.replaceChild(0, o.copy(gm(o.content, e + 1, n, r, o)));
  }
  if (e > r) {
    let o = i.contentMatchAt(0), s = o.fillBefore(t).append(t);
    t = s.append(o.matchFragment(s).fillBefore(R.empty, !0));
  }
  return t;
}
function Ix(t, e, n, r) {
  if (!r.isInline && e == n && t.doc.resolve(e).parent.content.size) {
    let i = Cx(t.doc, e, r.type);
    i != null && (e = n = i);
  }
  t.replaceRange(e, n, new _(R.from(r), 0, 0));
}
function Ax(t, e, n) {
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
  let o = ym(r, i);
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
function ym(t, e) {
  let n = [], r = Math.min(t.depth, e.depth);
  for (let i = r; i >= 0; i--) {
    let o = t.start(i);
    if (o < t.pos - (t.depth - i) || e.end(i) > e.pos + (e.depth - i) || t.node(i).type.spec.isolating || e.node(i).type.spec.isolating)
      break;
    (o == e.start(i) || i == t.depth && i == e.depth && t.parent.inlineContent && e.parent.inlineContent && i && e.start(i - 1) == o - 1) && n.push(i);
  }
  return n;
}
class ai extends nt {
  /**
  Construct an attribute step.
  */
  constructor(e, n, r) {
    super(), this.pos = e, this.attr = n, this.value = r;
  }
  apply(e) {
    let n = e.nodeAt(this.pos);
    if (!n)
      return De.fail("No node at attribute step's position");
    let r = /* @__PURE__ */ Object.create(null);
    for (let o in n.attrs)
      r[o] = n.attrs[o];
    r[this.attr] = this.value;
    let i = n.type.create(r, null, n.marks);
    return De.fromReplace(e, this.pos, this.pos + 1, new _(R.from(i), 0, n.isLeaf ? 0 : 1));
  }
  getMap() {
    return vt.empty;
  }
  invert(e) {
    return new ai(this.pos, this.attr, e.nodeAt(this.pos).attrs[this.attr]);
  }
  map(e) {
    let n = e.mapResult(this.pos, 1);
    return n.deletedAfter ? null : new ai(n.pos, this.attr, this.value);
  }
  toJSON() {
    return { stepType: "attr", pos: this.pos, attr: this.attr, value: this.value };
  }
  static fromJSON(e, n) {
    if (typeof n.pos != "number" || typeof n.attr != "string")
      throw new RangeError("Invalid input for AttrStep.fromJSON");
    return new ai(n.pos, n.attr, n.value);
  }
}
nt.jsonID("attr", ai);
class Eo extends nt {
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
    return De.ok(r);
  }
  getMap() {
    return vt.empty;
  }
  invert(e) {
    return new Eo(this.attr, e.attrs[this.attr]);
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
    return new Eo(n.attr, n.value);
  }
}
nt.jsonID("docAttr", Eo);
let Di = class extends Error {
};
Di = function t(e) {
  let n = Error.call(this, e);
  return n.__proto__ = t.prototype, n;
};
Di.prototype = Object.create(Error.prototype);
Di.prototype.constructor = Di;
Di.prototype.name = "TransformError";
class km {
  /**
  Create a transform that starts with the given document.
  */
  constructor(e) {
    this.doc = e, this.steps = [], this.docs = [], this.mapping = new Ao();
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
      throw new Di(n.failed);
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
  replace(e, n = e, r = _.empty) {
    let i = Tl(this.doc, e, n, r);
    return i && this.step(i), this;
  }
  /**
  Replace the given range with the given content, which may be a
  fragment, node, or array of nodes.
  */
  replaceWith(e, n, r) {
    return this.replace(e, n, new _(R.from(r), 0, 0));
  }
  /**
  Delete the content between the given positions.
  */
  delete(e, n) {
    return this.replace(e, n, _.empty);
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
    return Nx(this, e, n, r), this;
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
    return Ix(this, e, n, r), this;
  }
  /**
  Delete the given range, expanding it to cover fully covered
  parent nodes until a valid replace is found.
  */
  deleteRange(e, n) {
    return Ax(this, e, n), this;
  }
  /**
  Split the content in the given range off from its parent, if there
  is sibling content before or after it, and move it up the tree to
  the depth specified by `target`. You'll probably want to use
  [`liftTarget`](https://prosemirror.net/docs/ref/#transform.liftTarget) to compute `target`, to make
  sure the lift is valid.
  */
  lift(e, n) {
    return fx(this, e, n), this;
  }
  /**
  Join the blocks around the given position. If depth is 2, their
  last and first siblings are also joined, and so on.
  */
  join(e, n = 1) {
    return xx(this, e, n), this;
  }
  /**
  Wrap the given [range](https://prosemirror.net/docs/ref/#model.NodeRange) in the given set of wrappers.
  The wrappers are assumed to be valid in this position, and should
  probably be computed with [`findWrapping`](https://prosemirror.net/docs/ref/#transform.findWrapping).
  */
  wrap(e, n) {
    return px(this, e, n), this;
  }
  /**
  Set the type of all textblocks (partly) between `from` and `to` to
  the given node type with the given attributes.
  */
  setBlockType(e, n = e, r, i = null) {
    return mx(this, e, n, r, i), this;
  }
  /**
  Change the type, attributes, and/or marks of the node at `pos`.
  When `type` isn't given, the existing node type is preserved,
  */
  setNodeMarkup(e, n, r = null, i) {
    return yx(this, e, n, r, i), this;
  }
  /**
  Set a single attribute on a given node to a new value.
  The `pos` addresses the document content. Use `setDocAttribute`
  to set attributes on the document itself.
  */
  setNodeAttribute(e, n, r) {
    return this.step(new ai(e, n, r)), this;
  }
  /**
  Set a single attribute on the document to a new value.
  */
  setDocAttribute(e, n) {
    return this.step(new Eo(e, n)), this;
  }
  /**
  Add a mark to the node at position `pos`.
  */
  addNodeMark(e, n) {
    return this.step(new Jn(e, n)), this;
  }
  /**
  Remove a mark (or all marks of the given type) from the node at
  position `pos`.
  */
  removeNodeMark(e, n) {
    let r = this.doc.nodeAt(e);
    if (!r)
      throw new RangeError("No node at position " + e);
    if (n instanceof pe)
      n.isInSet(r.marks) && this.step(new _r(e, n));
    else {
      let i = r.marks, o, s = [];
      for (; o = n.isInSet(i); )
        s.push(new _r(e, o)), i = o.removeFromSet(i);
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
    return kx(this, e, n, r), this;
  }
  /**
  Add the given mark to the inline content between `from` and `to`.
  */
  addMark(e, n, r) {
    return ax(this, e, n, r), this;
  }
  /**
  Remove marks from inline nodes between `from` and `to`. When
  `mark` is a single mark, remove precisely that mark. When it is
  a mark type, remove all marks of that type. When it is null,
  remove all marks of any type.
  */
  removeMark(e, n, r) {
    return ux(this, e, n, r), this;
  }
  /**
  Removes all marks and nodes from the content of the node at
  `pos` that don't match the given new parent node type. Accepts
  an optional starting [content match](https://prosemirror.net/docs/ref/#model.ContentMatch) as
  third argument.
  */
  clearIncompatible(e, n, r) {
    return _u(this, e, n, r), this;
  }
}
const Zl = /* @__PURE__ */ Object.create(null);
class oe {
  /**
  Initialize a selection with the head and anchor and ranges. If no
  ranges are given, constructs a single range across `$anchor` and
  `$head`.
  */
  constructor(e, n, r) {
    this.$anchor = e, this.$head = n, this.ranges = r || [new bm(e.min(n), e.max(n))];
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
  replace(e, n = _.empty) {
    let r = n.content.lastChild, i = null;
    for (let l = 0; l < n.openEnd; l++)
      i = r, r = r.lastChild;
    let o = e.steps.length, s = this.ranges;
    for (let l = 0; l < s.length; l++) {
      let { $from: a, $to: u } = s[l], c = e.mapping.slice(o);
      e.replaceRange(c.map(a.pos), c.map(u.pos), l ? _.empty : n), l == 0 && Td(e, o, (r ? r.isInline : i && i.isTextblock) ? -1 : 1);
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
      o ? e.deleteRange(u, c) : (e.replaceRangeWith(u, c, n), Td(e, r, n.isInline ? -1 : 1));
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
    let i = e.parent.inlineContent ? new Z(e) : ei(e.node(0), e.parent, e.pos, e.index(), n, r);
    if (i)
      return i;
    for (let o = e.depth - 1; o >= 0; o--) {
      let s = n < 0 ? ei(e.node(0), e.node(o), e.before(o + 1), e.index(o), n, r) : ei(e.node(0), e.node(o), e.after(o + 1), e.index(o) + 1, n, r);
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
    return this.findFrom(e, n) || this.findFrom(e, -n) || new It(e.node(0));
  }
  /**
  Find the cursor or leaf node selection closest to the start of
  the given document. Will return an
  [`AllSelection`](https://prosemirror.net/docs/ref/#state.AllSelection) if no valid position
  exists.
  */
  static atStart(e) {
    return ei(e, e, 0, 0, 1) || new It(e);
  }
  /**
  Find the cursor or leaf node selection closest to the end of the
  given document.
  */
  static atEnd(e) {
    return ei(e, e, e.content.size, e.childCount, -1) || new It(e);
  }
  /**
  Deserialize the JSON representation of a selection. Must be
  implemented for custom classes (as a static class method).
  */
  static fromJSON(e, n) {
    if (!n || !n.type)
      throw new RangeError("Invalid input for Selection.fromJSON");
    let r = Zl[n.type];
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
    if (e in Zl)
      throw new RangeError("Duplicate use of selection JSON ID " + e);
    return Zl[e] = n, n.prototype.jsonID = e, n;
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
oe.prototype.visible = !0;
class bm {
  /**
  Create a range.
  */
  constructor(e, n) {
    this.$from = e, this.$to = n;
  }
}
let Md = !1;
function vd(t) {
  !Md && !t.parent.inlineContent && (Md = !0, console.warn("TextSelection endpoint not pointing into a node with inline content (" + t.parent.type.name + ")"));
}
class Z extends oe {
  /**
  Construct a text selection between the given points.
  */
  constructor(e, n = e) {
    vd(e), vd(n), super(e, n);
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
      return oe.near(r);
    let i = e.resolve(n.map(this.anchor));
    return new Z(i.parent.inlineContent ? i : r, r);
  }
  replace(e, n = _.empty) {
    if (super.replace(e, n), n == _.empty) {
      let r = this.$from.marksAcross(this.$to);
      r && e.ensureMarks(r);
    }
  }
  eq(e) {
    return e instanceof Z && e.anchor == this.anchor && e.head == this.head;
  }
  getBookmark() {
    return new Nl(this.anchor, this.head);
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
      let o = oe.findFrom(n, r, !0) || oe.findFrom(n, -r, !0);
      if (o)
        n = o.$head;
      else
        return oe.near(n, r);
    }
    return e.parent.inlineContent || (i == 0 ? e = n : (e = (oe.findFrom(e, -r, !0) || oe.findFrom(e, r, !0)).$anchor, e.pos < n.pos != i < 0 && (e = n))), new Z(e, n);
  }
}
oe.jsonID("text", Z);
class Nl {
  constructor(e, n) {
    this.anchor = e, this.head = n;
  }
  map(e) {
    return new Nl(e.map(this.anchor), e.map(this.head));
  }
  resolve(e) {
    return Z.between(e.resolve(this.anchor), e.resolve(this.head));
  }
}
class re extends oe {
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
    return r ? oe.near(o) : new re(o);
  }
  content() {
    return new _(R.from(this.node), 0, 0);
  }
  eq(e) {
    return e instanceof re && e.anchor == this.anchor;
  }
  toJSON() {
    return { type: "node", anchor: this.anchor };
  }
  getBookmark() {
    return new Hu(this.anchor);
  }
  /**
  @internal
  */
  static fromJSON(e, n) {
    if (typeof n.anchor != "number")
      throw new RangeError("Invalid input for NodeSelection.fromJSON");
    return new re(e.resolve(n.anchor));
  }
  /**
  Create a node selection from non-resolved positions.
  */
  static create(e, n) {
    return new re(e.resolve(n));
  }
  /**
  Determines whether the given node may be selected as a node
  selection.
  */
  static isSelectable(e) {
    return !e.isText && e.type.spec.selectable !== !1;
  }
}
re.prototype.visible = !1;
oe.jsonID("node", re);
class Hu {
  constructor(e) {
    this.anchor = e;
  }
  map(e) {
    let { deleted: n, pos: r } = e.mapResult(this.anchor);
    return n ? new Nl(r, r) : new Hu(r);
  }
  resolve(e) {
    let n = e.resolve(this.anchor), r = n.nodeAfter;
    return r && re.isSelectable(r) ? new re(n) : oe.near(n);
  }
}
class It extends oe {
  /**
  Create an all-selection over the given document.
  */
  constructor(e) {
    super(e.resolve(0), e.resolve(e.content.size));
  }
  replace(e, n = _.empty) {
    if (n == _.empty) {
      e.delete(0, e.doc.content.size);
      let r = oe.atStart(e.doc);
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
    return new It(e);
  }
  map(e) {
    return new It(e);
  }
  eq(e) {
    return e instanceof It;
  }
  getBookmark() {
    return Ex;
  }
}
oe.jsonID("all", It);
const Ex = {
  map() {
    return this;
  },
  resolve(t) {
    return new It(t);
  }
};
function ei(t, e, n, r, i, o = !1) {
  if (e.inlineContent)
    return Z.create(t, n);
  for (let s = r - (i > 0 ? 0 : 1); i > 0 ? s < e.childCount : s >= 0; s += i) {
    let l = e.child(s);
    if (l.isAtom) {
      if (!o && re.isSelectable(l))
        return re.create(t, n - (i < 0 ? l.nodeSize : 0));
    } else {
      let a = ei(t, l, n + i, i < 0 ? l.childCount : 0, i, o);
      if (a)
        return a;
    }
    n += l.nodeSize * i;
  }
  return null;
}
function Td(t, e, n) {
  let r = t.steps.length - 1;
  if (r < e)
    return;
  let i = t.steps[r];
  if (!(i instanceof Oe || i instanceof et))
    return;
  let o = t.mapping.maps[r], s;
  o.forEach((l, a, u, c) => {
    s == null && (s = c);
  }), t.setSelection(oe.near(t.doc.resolve(s), n));
}
const Nd = 1, Es = 2, Id = 4;
class Ox extends km {
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
    return this.curSelection = e, this.curSelectionFor = this.steps.length, this.updated = (this.updated | Nd) & ~Es, this.storedMarks = null, this;
  }
  /**
  Whether the selection was explicitly updated by this transaction.
  */
  get selectionSet() {
    return (this.updated & Nd) > 0;
  }
  /**
  Set the current stored marks.
  */
  setStoredMarks(e) {
    return this.storedMarks = e, this.updated |= Es, this;
  }
  /**
  Make sure the current stored marks or, if that is null, the marks
  at the selection, match the given set of marks. Does nothing if
  this is already the case.
  */
  ensureMarks(e) {
    return pe.sameSet(this.storedMarks || this.selection.$from.marks(), e) || this.setStoredMarks(e), this;
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
    return (this.updated & Es) > 0;
  }
  /**
  @internal
  */
  addStep(e, n) {
    super.addStep(e, n), this.updated = this.updated & ~Es, this.storedMarks = null;
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
    return n && (e = e.mark(this.storedMarks || (r.empty ? r.$from.marks() : r.$from.marksAcross(r.$to) || pe.none))), r.replaceWith(this, e), this;
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
      return this.replaceRangeWith(n, r, i.text(e, o)), !this.selection.empty && this.selection.to == n + e.length && this.setSelection(oe.near(this.selection.$to)), this;
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
    return this.updated |= Id, this;
  }
  /**
  True when this transaction has had `scrollIntoView` called on it.
  */
  get scrolledIntoView() {
    return (this.updated & Id) > 0;
  }
}
function Ad(t, e) {
  return !e || !t ? t : t.bind(e);
}
class ao {
  constructor(e, n, r) {
    this.name = e, this.init = Ad(n.init, r), this.apply = Ad(n.apply, r);
  }
}
const Dx = [
  new ao("doc", {
    init(t) {
      return t.doc || t.schema.topNodeType.createAndFill();
    },
    apply(t) {
      return t.doc;
    }
  }),
  new ao("selection", {
    init(t, e) {
      return t.selection || oe.atStart(e.doc);
    },
    apply(t) {
      return t.selection;
    }
  }),
  new ao("storedMarks", {
    init(t) {
      return t.storedMarks || null;
    },
    apply(t, e, n, r) {
      return r.selection.$cursor ? t.storedMarks : null;
    }
  }),
  new ao("scrollToSelection", {
    init() {
      return 0;
    },
    apply(t, e) {
      return t.scrolledIntoView ? e + 1 : e;
    }
  })
];
class ea {
  constructor(e, n) {
    this.schema = e, this.plugins = [], this.pluginsByKey = /* @__PURE__ */ Object.create(null), this.fields = Dx.slice(), n && n.forEach((r) => {
      if (this.pluginsByKey[r.key])
        throw new RangeError("Adding different instances of a keyed plugin (" + r.key + ")");
      this.plugins.push(r), this.pluginsByKey[r.key] = r, r.spec.state && this.fields.push(new ao(r.key, r.spec.state, r));
    });
  }
}
class oi {
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
    let n = new oi(this.config), r = this.config.fields;
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
    return new Ox(this);
  }
  /**
  Create a new state.
  */
  static create(e) {
    let n = new ea(e.doc ? e.doc.type.schema : e.schema, e.plugins), r = new oi(n);
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
    let n = new ea(this.schema, e.plugins), r = n.fields, i = new oi(n);
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
    let i = new ea(e.schema, e.plugins), o = new oi(i);
    return i.fields.forEach((s) => {
      if (s.name == "doc")
        o.doc = vn.fromJSON(e.schema, n.doc);
      else if (s.name == "selection")
        o.selection = oe.fromJSON(o.doc, n.selection);
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
function wm(t, e, n) {
  for (let r in t) {
    let i = t[r];
    i instanceof Function ? i = i.bind(e) : r == "handleDOMEvents" && (i = wm(i, e, {})), n[r] = i;
  }
  return n;
}
class Be {
  /**
  Create a plugin.
  */
  constructor(e) {
    this.spec = e, this.props = {}, e.props && wm(e.props, this, this.props), this.key = e.key ? e.key.key : xm("plugin");
  }
  /**
  Extract the plugin's state field from an editor state.
  */
  getState(e) {
    return e[this.key];
  }
}
const ta = /* @__PURE__ */ Object.create(null);
function xm(t) {
  return t in ta ? t + "$" + ++ta[t] : (ta[t] = 0, t + "$");
}
class rt {
  /**
  Create a plugin key.
  */
  constructor(e = "key") {
    this.key = xm(e);
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
const ju = (t, e) => t.selection.empty ? !1 : (e && e(t.tr.deleteSelection().scrollIntoView()), !0);
function Cm(t, e) {
  let { $cursor: n } = t.selection;
  return !n || (e ? !e.endOfTextblock("backward", t) : n.parentOffset > 0) ? null : n;
}
const Sm = (t, e, n) => {
  let r = Cm(t, n);
  if (!r)
    return !1;
  let i = Wu(r);
  if (!i) {
    let s = r.blockRange(), l = s && Ml(s);
    return l == null ? !1 : (e && e(t.tr.lift(s, l).scrollIntoView()), !0);
  }
  let o = i.nodeBefore;
  if (Tm(t, i, e, -1))
    return !0;
  if (r.parent.content.size == 0 && (Ri(o, "end") || re.isSelectable(o)))
    for (let s = r.depth; ; s--) {
      let l = Tl(t.doc, r.before(s), r.after(s), _.empty);
      if (l && l.slice.size < l.to - l.from) {
        if (e) {
          let a = t.tr.step(l);
          a.setSelection(Ri(o, "end") ? oe.findFrom(a.doc.resolve(a.mapping.map(i.pos, -1)), -1) : re.create(a.doc, i.pos - o.nodeSize)), e(a.scrollIntoView());
        }
        return !0;
      }
      if (s == 1 || r.node(s - 1).childCount > 1)
        break;
    }
  return o.isAtom && i.depth == r.depth - 1 ? (e && e(t.tr.delete(i.pos - o.nodeSize, i.pos).scrollIntoView()), !0) : !1;
}, Rx = (t, e, n) => {
  let r = Cm(t, n);
  if (!r)
    return !1;
  let i = Wu(r);
  return i ? Lx(t, i, e) : !1;
};
function Lx(t, e, n) {
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
  let u = Tl(t.doc, o, a, _.empty);
  if (!u || u.from != o || u instanceof Oe && u.slice.size >= a - o)
    return !1;
  if (n) {
    let c = t.tr.step(u);
    c.setSelection(Z.create(c.doc, o)), n(c.scrollIntoView());
  }
  return !0;
}
function Ri(t, e, n = !1) {
  for (let r = t; r; r = e == "start" ? r.firstChild : r.lastChild) {
    if (r.isTextblock)
      return !0;
    if (n && r.childCount != 1)
      return !1;
  }
  return !1;
}
const Mm = (t, e, n) => {
  let { $head: r, empty: i } = t.selection, o = r;
  if (!i)
    return !1;
  if (r.parent.isTextblock) {
    if (n ? !n.endOfTextblock("backward", t) : r.parentOffset > 0)
      return !1;
    o = Wu(r);
  }
  let s = o && o.nodeBefore;
  return !s || !re.isSelectable(s) ? !1 : (e && e(t.tr.setSelection(re.create(t.doc, o.pos - s.nodeSize)).scrollIntoView()), !0);
};
function Wu(t) {
  if (!t.parent.type.spec.isolating)
    for (let e = t.depth - 1; e >= 0; e--) {
      if (t.index(e) > 0)
        return t.doc.resolve(t.before(e + 1));
      if (t.node(e).type.spec.isolating)
        break;
    }
  return null;
}
function Px(t, e) {
  let { $cursor: n } = t.selection;
  return !n || (e ? !e.endOfTextblock("forward", t) : n.parentOffset < n.parent.content.size) ? null : n;
}
const zx = (t, e, n) => {
  let r = Px(t, n);
  if (!r)
    return !1;
  let i = vm(r);
  if (!i)
    return !1;
  let o = i.nodeAfter;
  if (Tm(t, i, e, 1))
    return !0;
  if (r.parent.content.size == 0 && (Ri(o, "start") || re.isSelectable(o))) {
    let s = Tl(t.doc, r.before(), r.after(), _.empty);
    if (s && s.slice.size < s.to - s.from) {
      if (e) {
        let l = t.tr.step(s);
        l.setSelection(Ri(o, "start") ? oe.findFrom(l.doc.resolve(l.mapping.map(i.pos)), 1) : re.create(l.doc, l.mapping.map(i.pos))), e(l.scrollIntoView());
      }
      return !0;
    }
  }
  return o.isAtom && i.depth == r.depth - 1 ? (e && e(t.tr.delete(i.pos, i.pos + o.nodeSize).scrollIntoView()), !0) : !1;
}, Bx = (t, e, n) => {
  let { $head: r, empty: i } = t.selection, o = r;
  if (!i)
    return !1;
  if (r.parent.isTextblock) {
    if (n ? !n.endOfTextblock("forward", t) : r.parentOffset < r.parent.content.size)
      return !1;
    o = vm(r);
  }
  let s = o && o.nodeAfter;
  return !s || !re.isSelectable(s) ? !1 : (e && e(t.tr.setSelection(re.create(t.doc, o.pos)).scrollIntoView()), !0);
};
function vm(t) {
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
const Fx = (t, e) => {
  let { $head: n, $anchor: r } = t.selection;
  return !n.parent.type.spec.code || !n.sameParent(r) ? !1 : (e && e(t.tr.insertText(`
`).scrollIntoView()), !0);
};
function qu(t) {
  for (let e = 0; e < t.edgeCount; e++) {
    let { type: n } = t.edge(e);
    if (n.isTextblock && !n.hasRequiredAttrs())
      return n;
  }
  return null;
}
const $x = (t, e) => {
  let { $head: n, $anchor: r } = t.selection;
  if (!n.parent.type.spec.code || !n.sameParent(r))
    return !1;
  let i = n.node(-1), o = n.indexAfter(-1), s = qu(i.contentMatchAt(o));
  if (!s || !i.canReplaceWith(o, o, s))
    return !1;
  if (e) {
    let l = n.after(), a = t.tr.replaceWith(l, l, s.createAndFill());
    a.setSelection(oe.near(a.doc.resolve(l), 1)), e(a.scrollIntoView());
  }
  return !0;
}, _x = (t, e) => {
  let n = t.selection, { $from: r, $to: i } = n;
  if (n instanceof It || r.parent.inlineContent || i.parent.inlineContent)
    return !1;
  let o = qu(i.parent.contentMatchAt(i.indexAfter()));
  if (!o || !o.isTextblock)
    return !1;
  if (e) {
    let s = (!r.parentOffset && i.index() < i.parent.childCount ? r : i).pos, l = t.tr.insert(s, o.createAndFill());
    l.setSelection(Z.create(l.doc, s + 1)), e(l.scrollIntoView());
  }
  return !0;
}, Vx = (t, e) => {
  let { $cursor: n } = t.selection;
  if (!n || n.parent.content.size)
    return !1;
  if (n.depth > 1 && n.after() != n.end(-1)) {
    let o = n.before();
    if (mo(t.doc, o))
      return e && e(t.tr.split(o).scrollIntoView()), !0;
  }
  let r = n.blockRange(), i = r && Ml(r);
  return i == null ? !1 : (e && e(t.tr.lift(r, i).scrollIntoView()), !0);
};
function Hx(t) {
  return (e, n) => {
    let { $from: r, $to: i } = e.selection;
    if (e.selection instanceof re && e.selection.node.isBlock)
      return !r.parentOffset || !mo(e.doc, r.pos) ? !1 : (n && n(e.tr.split(r.pos).scrollIntoView()), !0);
    if (!r.depth)
      return !1;
    let o = [], s, l, a = !1, u = !1;
    for (let h = r.depth; ; h--)
      if (r.node(h).isBlock) {
        a = r.end(h) == r.pos + (r.depth - h), u = r.start(h) == r.pos - (r.depth - h), l = qu(r.node(h - 1).contentMatchAt(r.indexAfter(h - 1))), o.unshift(a && l ? { type: l } : null), s = h;
        break;
      } else {
        if (h == 1)
          return !1;
        o.unshift(null);
      }
    let c = e.tr;
    (e.selection instanceof Z || e.selection instanceof It) && c.deleteSelection();
    let f = c.mapping.map(r.pos), d = mo(c.doc, f, o.length, o);
    if (d || (o[0] = l ? { type: l } : null, d = mo(c.doc, f, o.length, o)), !d)
      return !1;
    if (c.split(f, o.length, o), !a && u && r.node(s).type != l) {
      let h = c.mapping.map(r.before(s)), p = c.doc.resolve(h);
      l && r.node(s - 1).canReplaceWith(p.index(), p.index() + 1, l) && c.setNodeMarkup(c.mapping.map(r.before(s)), l);
    }
    return n && n(c.scrollIntoView()), !0;
  };
}
const jx = Hx(), Wx = (t, e) => (e && e(t.tr.setSelection(new It(t.doc))), !0);
function qx(t, e, n) {
  let r = e.nodeBefore, i = e.nodeAfter, o = e.index();
  return !r || !i || !r.type.compatibleContent(i.type) ? !1 : !r.content.size && e.parent.canReplace(o - 1, o) ? (n && n(t.tr.delete(e.pos - r.nodeSize, e.pos).scrollIntoView()), !0) : !e.parent.canReplace(o, o + 1) || !(i.isTextblock || vl(t.doc, e.pos)) ? !1 : (n && n(t.tr.join(e.pos).scrollIntoView()), !0);
}
function Tm(t, e, n, r) {
  let i = e.nodeBefore, o = e.nodeAfter, s, l, a = i.type.spec.isolating || o.type.spec.isolating;
  if (!a && qx(t, e, n))
    return !0;
  let u = !a && e.parent.canReplace(e.index(), e.index() + 1);
  if (u && (s = (l = i.contentMatchAt(i.childCount)).findWrapping(o.type)) && l.matchType(s[0] || o.type).validEnd) {
    if (n) {
      let h = e.pos + o.nodeSize, p = R.empty;
      for (let b = s.length - 1; b >= 0; b--)
        p = R.from(s[b].create(null, p));
      p = R.from(i.copy(p));
      let k = t.tr.step(new et(e.pos - 1, h, e.pos, h, new _(p, 1, 0), s.length, !0)), w = k.doc.resolve(h + 2 * s.length);
      w.nodeAfter && w.nodeAfter.type == i.type && vl(k.doc, w.pos) && k.join(w.pos), n(k.scrollIntoView());
    }
    return !0;
  }
  let c = o.type.spec.isolating || r > 0 && a ? null : oe.findFrom(e, 1), f = c && c.$from.blockRange(c.$to), d = f && Ml(f);
  if (d != null && d >= e.depth)
    return n && n(t.tr.lift(f, d).scrollIntoView()), !0;
  if (u && Ri(o, "start", !0) && Ri(i, "end")) {
    let h = i, p = [];
    for (; p.push(h), !h.isTextblock; )
      h = h.lastChild;
    let k = o, w = 1;
    for (; !k.isTextblock; k = k.firstChild)
      w++;
    if (h.canReplace(h.childCount, h.childCount, k.content)) {
      if (n) {
        let b = R.empty;
        for (let E = p.length - 1; E >= 0; E--)
          b = R.from(p[E].copy(b));
        let L = t.tr.step(new et(e.pos - p.length, e.pos + o.nodeSize, e.pos + w, e.pos + o.nodeSize - w, new _(b, p.length, 0), 0, !0));
        n(L.scrollIntoView());
      }
      return !0;
    }
  }
  return !1;
}
function Nm(t) {
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
const Kx = Nm(-1), Ux = Nm(1);
function Ku(t, e = null) {
  return function(n, r) {
    let { $from: i, $to: o } = n.selection, s = i.blockRange(o), l = s && Vu(s, t, e);
    return l ? (r && r(n.tr.wrap(s, l).scrollIntoView()), !0) : !1;
  };
}
function Sn(t, e = null) {
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
function Jx(t, e, n, r) {
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
function rs(t, e = null, n) {
  return function(r, i) {
    let { empty: o, $cursor: s, ranges: l } = r.selection;
    if (o && !s || !Jx(r.doc, l, t))
      return !1;
    if (i)
      if (s)
        t.isInSet(r.storedMarks || s.marks()) ? i(r.tr.removeStoredMark(t)) : i(r.tr.addStoredMark(t.create(e)));
      else {
        let a, u = r.tr;
        a = !l.some((c) => r.doc.rangeHasMark(c.$from.pos, c.$to.pos, t));
        for (let c = 0; c < l.length; c++) {
          let { $from: f, $to: d } = l[c];
          if (!a)
            u.removeMark(f.pos, d.pos, t);
          else {
            let h = f.pos, p = d.pos, k = f.nodeAfter, w = d.nodeBefore, b = k && k.isText ? /^\s*/.exec(k.text)[0].length : 0, L = w && w.isText ? /\s*$/.exec(w.text)[0].length : 0;
            h + b < p && (h += b, p -= L), u.addMark(h, p, t.create(e));
          }
        }
        i(u.scrollIntoView());
      }
    return !0;
  };
}
function Vi(...t) {
  return function(e, n, r) {
    for (let i = 0; i < t.length; i++)
      if (t[i](e, n, r))
        return !0;
    return !1;
  };
}
let na = Vi(ju, Sm, Mm), Ed = Vi(ju, zx, Bx);
const mn = {
  Enter: Vi(Fx, _x, Vx, jx),
  "Mod-Enter": $x,
  Backspace: na,
  "Mod-Backspace": na,
  "Shift-Backspace": na,
  Delete: Ed,
  "Mod-Delete": Ed,
  "Mod-a": Wx
}, Im = {
  "Ctrl-h": mn.Backspace,
  "Alt-Backspace": mn["Mod-Backspace"],
  "Ctrl-d": mn.Delete,
  "Ctrl-Alt-Backspace": mn["Mod-Delete"],
  "Alt-Delete": mn["Mod-Delete"],
  "Alt-d": mn["Mod-Delete"],
  "Ctrl-a": Kx,
  "Ctrl-e": Ux
};
for (let t in mn)
  Im[t] = mn[t];
const Gx = typeof navigator < "u" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : typeof os < "u" && os.platform ? os.platform() == "darwin" : !1, Yx = Gx ? Im : mn;
class At {
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
    this.match = e, this.match = e, this.handler = typeof n == "string" ? Qx(n) : n, this.undoable = r.undoable !== !1, this.inCode = r.inCode || !1, this.inCodeMark = r.inCodeMark !== !1;
  }
}
function Qx(t) {
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
const Xx = (t, e) => {
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
new At(/--$/, "—", { inCodeMark: !1 });
new At(/\.\.\.$/, "…", { inCodeMark: !1 });
new At(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(")$/, "“", { inCodeMark: !1 });
new At(/"$/, "”", { inCodeMark: !1 });
new At(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(')$/, "‘", { inCodeMark: !1 });
new At(/'$/, "’", { inCodeMark: !1 });
function Uu(t, e, n = null, r) {
  return new At(t, (i, o, s, l) => {
    let a = n instanceof Function ? n(o) : n, u = i.tr.delete(s, l), c = u.doc.resolve(s), f = c.blockRange(), d = f && Vu(f, e, a);
    if (!d)
      return null;
    u.wrap(f, d);
    let h = u.doc.resolve(s - 1).nodeBefore;
    return h && h.type == e && vl(u.doc, s - 1) && (!r || r(o, h)) && u.join(s - 1), u;
  });
}
function Am(t, e, n = null) {
  return new At(t, (r, i, o, s) => {
    let l = r.doc.resolve(o), a = n instanceof Function ? n(i) : n;
    return l.node(-1).canReplaceWith(l.index(-1), l.indexAfter(-1), e) ? r.tr.delete(o, s).setBlockType(o, o, e, a) : null;
  });
}
const nr = typeof navigator < "u" ? navigator : null, Od = typeof document < "u" ? document : null, or = nr && nr.userAgent || "", Za = /Edge\/(\d+)/.exec(or), Em = /MSIE \d/.exec(or), eu = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(or), Ju = !!(Em || eu || Za);
Em ? document.documentMode : eu ? +eu[1] : Za && +Za[1];
const Zx = !Ju && /gecko\/(\d+)/i.test(or);
Zx && +(/Firefox\/(\d+)/.exec(or) || [0, 0])[1];
const tu = !Ju && /Chrome\/(\d+)/.exec(or), eC = !!tu;
tu && +tu[1];
const tC = !Ju && !!nr && /Apple Computer/.test(nr.vendor), nC = tC && (/Mobile\/\w+/.test(or) || !!nr && nr.maxTouchPoints > 2);
nC || nr && /Mac/.test(nr.platform);
const rC = /Android \d/.test(or), iC = !!Od && "webkitFontSmoothing" in Od.documentElement.style;
iC && +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1];
function ra(t, e, n, r, i, o) {
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
    const c = u, f = c.match.exec(a), d = f && f[0] && c.handler(s, f, e - (f[0].length - r.length), n);
    if (d)
      return c.undoable !== !1 && d.setMeta(o, { transform: d, from: e, to: n, text: r }), t.dispatch(d), !0;
  }
  return !1;
}
const oC = new rt("MILKDOWN_CUSTOM_INPUTRULES");
function sC({ rules: t }) {
  const e = new Be({
    key: oC,
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
        return ra(n, r, i, o, t, e);
      },
      handleDOMEvents: {
        compositionend: (n) => (setTimeout(() => {
          const { $cursor: r } = n.state.selection;
          r && ra(n, r.pos, r.pos, "", t, e);
        }), !1),
        keydown: (n, r) => !(rC && eC && r.key === "Enter") || n.composing ? !1 : n.someProp(
          "handleKeyDown",
          (i) => i(n, r)
        ) ? (r.preventDefault(), !0) : !1
      },
      handleKeyDown(n, r) {
        if (r.key !== "Enter") return !1;
        const { $cursor: i } = n.state.selection;
        return i ? ra(n, i.pos, i.pos, `
`, t, e) : !1;
      }
    }
  });
  return e;
}
function is(t, e, n = {}) {
  return new At(t, (r, i, o, s) => {
    var l, a, u, c;
    const { tr: f } = r, d = i.length;
    let h = i[d - 1], p = i[0], k = [], w;
    const b = {
      group: h,
      fullMatch: p,
      start: o,
      end: s
    }, L = (l = n.updateCaptured) == null ? void 0 : l.call(n, b);
    if (Object.assign(b, L), { group: h, fullMatch: p, start: o, end: s } = b, p === null || (h == null ? void 0 : h.trim()) === "") return null;
    if (h) {
      const E = p.search(/\S/), j = o + p.indexOf(h), H = j + h.length;
      k = (a = f.storedMarks) != null ? a : [], H < s && f.delete(H, s), j > o && f.delete(o + E, j), w = o + E + h.length;
      const T = (u = n.getAttr) == null ? void 0 : u.call(n, i);
      f.addMark(o, w, e.create(T)), f.setStoredMarks(k), (c = n.beforeDispatch) == null || c.call(n, { match: i, start: o, end: s, tr: f });
    }
    return f;
  });
}
function Om(t) {
  return Object.assign(Object.create(t), t).setTime(Date.now());
}
function lC(t, e) {
  return Array.isArray(t) && t.includes(e.type) || e.type === t;
}
function aC(t) {
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
function uC(t, e) {
  return aC((n) => n.type === e)(t);
}
function cC(t) {
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
function fC(t, e) {
  if (!(t instanceof re)) return;
  const { node: n, $from: r } = t;
  if (lC(e, n))
    return {
      node: n,
      pos: r.pos,
      start: r.start(r.depth),
      depth: r.depth
    };
}
const dC = (t, e) => {
  const { selection: n, doc: r } = t;
  if (n instanceof re)
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
var rr = {
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
}, il = {
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
}, hC = typeof navigator < "u" && /Mac/.test(navigator.platform), pC = typeof navigator < "u" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
for (var Ge = 0; Ge < 10; Ge++) rr[48 + Ge] = rr[96 + Ge] = String(Ge);
for (var Ge = 1; Ge <= 24; Ge++) rr[Ge + 111] = "F" + Ge;
for (var Ge = 65; Ge <= 90; Ge++)
  rr[Ge] = String.fromCharCode(Ge + 32), il[Ge] = String.fromCharCode(Ge);
for (var ia in rr) il.hasOwnProperty(ia) || (il[ia] = rr[ia]);
function mC(t) {
  var e = hC && t.metaKey && t.shiftKey && !t.ctrlKey && !t.altKey || pC && t.shiftKey && t.key && t.key.length == 1 || t.key == "Unidentified", n = !e && t.key || (t.shiftKey ? il : rr)[t.keyCode] || t.key || "Unidentified";
  return n == "Esc" && (n = "Escape"), n == "Del" && (n = "Delete"), n == "Left" && (n = "ArrowLeft"), n == "Up" && (n = "ArrowUp"), n == "Right" && (n = "ArrowRight"), n == "Down" && (n = "ArrowDown"), n;
}
const gC = typeof navigator < "u" && /Mac|iP(hone|[oa]d)/.test(navigator.platform), yC = typeof navigator < "u" && /Win/.test(navigator.platform);
function kC(t) {
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
      gC ? s = !0 : i = !0;
    else
      throw new Error("Unrecognized modifier name: " + a);
  }
  return r && (n = "Alt-" + n), i && (n = "Ctrl-" + n), s && (n = "Meta-" + n), o && (n = "Shift-" + n), n;
}
function bC(t) {
  let e = /* @__PURE__ */ Object.create(null);
  for (let n in t)
    e[kC(n)] = t[n];
  return e;
}
function oa(t, e, n = !0) {
  return e.altKey && (t = "Alt-" + t), e.ctrlKey && (t = "Ctrl-" + t), e.metaKey && (t = "Meta-" + t), n && e.shiftKey && (t = "Shift-" + t), t;
}
function Dm(t) {
  return new Be({ props: { handleKeyDown: Rm(t) } });
}
function Rm(t) {
  let e = bC(t);
  return function(n, r) {
    let i = mC(r), o, s = e[oa(i, r)];
    if (s && s(n.state, n.dispatch, n))
      return !0;
    if (i.length == 1 && i != " ") {
      if (r.shiftKey) {
        let l = e[oa(i, r, !1)];
        if (l && l(n.state, n.dispatch, n))
          return !0;
      }
      if ((r.altKey || r.metaKey || r.ctrlKey) && // Ctrl-Alt may be used for AltGr on Windows
      !(yC && r.ctrlKey && r.altKey) && (o = rr[r.keyCode]) && o != i) {
        let l = e[oa(o, r)];
        if (l && l(n.state, n.dispatch, n))
          return !0;
      }
    }
    return !1;
  };
}
var Lm = class {
}, Pm = class {
  constructor() {
    this.elements = [], this.size = () => this.elements.length, this.top = () => this.elements.at(-1), this.push = (t) => {
      var e;
      (e = this.top()) == null || e.push(t);
    }, this.open = (t) => {
      this.elements.push(t);
    }, this.close = () => {
      const t = this.elements.pop();
      if (!t) throw fp();
      return t;
    };
  }
}, wC = class zm extends Lm {
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
    return new zm(e, n, r);
  }
}, Wt, wi, Ho, jo, Wo, xi, Ci, Pr, xC = (Pr = class extends Pm {
  constructor(n) {
    super();
    K(this, Wt);
    K(this, wi);
    K(this, Ho);
    K(this, jo);
    K(this, Wo);
    K(this, xi);
    K(this, Ci);
    B(this, Wt, pe.none), B(this, wi, (r) => r.isText), B(this, Ho, (r, i) => {
      if (v(this, wi).call(this, r) && v(this, wi).call(this, i) && pe.sameSet(r.marks, i.marks)) return this.schema.text(r.text + i.text, r.marks);
    }), B(this, jo, (r) => {
      const i = Object.values({
        ...this.schema.nodes,
        ...this.schema.marks
      }).find((o) => o.spec.parseMarkdown.match(r));
      if (!i) throw e1(r);
      return i;
    }), B(this, Wo, (r) => {
      const i = v(this, jo).call(this, r);
      i.spec.parseMarkdown.runner(this, r, i);
    }), this.injectRoot = (r, i, o) => (this.openNode(i, o), this.next(r.children), this), this.openNode = (r, i) => (this.open(wC.create(r, [], i)), this), B(this, xi, () => {
      B(this, Wt, pe.none);
      const r = this.close();
      return v(this, Ci).call(this, r.type, r.attrs, r.content);
    }), this.closeNode = () => {
      try {
        v(this, xi).call(this);
      } catch (r) {
        console.error(r);
      }
      return this;
    }, B(this, Ci, (r, i, o) => {
      const s = r.createAndFill(i, o, v(this, Wt));
      if (!s) throw Zk(r, i, o);
      return this.push(s), s;
    }), this.addNode = (r, i, o) => {
      try {
        v(this, Ci).call(this, r, i, o);
      } catch (s) {
        console.error(s);
      }
      return this;
    }, this.openMark = (r, i) => {
      const o = r.create(i);
      return B(this, Wt, o.addToSet(v(this, Wt))), this;
    }, this.closeMark = (r) => (B(this, Wt, r.removeFromSet(v(this, Wt))), this), this.addText = (r) => {
      try {
        const i = this.top();
        if (!i) throw fp();
        const o = i.pop(), s = this.schema.text(r, v(this, Wt));
        if (!o)
          return i.push(s), this;
        const l = v(this, Ho).call(this, o, s);
        return l ? (i.push(l), this) : (i.push(o, s), this);
      } catch (i) {
        return console.error(i), this;
      }
    }, this.build = () => {
      let r;
      do
        r = v(this, xi).call(this);
      while (this.size());
      return r;
    }, this.next = (r = []) => ([r].flat().forEach((i) => v(this, Wo).call(this, i)), this), this.toDoc = () => this.build(), this.run = (r, i) => {
      const o = r.runSync(r.parse(i), i);
      return this.next(o), this;
    }, this.schema = n;
  }
}, Wt = new WeakMap(), wi = new WeakMap(), Ho = new WeakMap(), jo = new WeakMap(), Wo = new WeakMap(), xi = new WeakMap(), Ci = new WeakMap(), Pr.create = (n, r) => {
  const i = new Pr(n);
  return (o) => (i.run(r, o), i.toDoc());
}, Pr), zr, Dd = (zr = class extends Lm {
  constructor(e, n, r, i = {}) {
    super(), this.type = e, this.children = n, this.value = r, this.props = i, this.push = (o, ...s) => {
      this.children || (this.children = []), this.children.push(o, ...s);
    }, this.pop = () => {
      var o;
      return (o = this.children) == null ? void 0 : o.pop();
    };
  }
}, zr.create = (e, n, r, i = {}) => new zr(e, n, r, i), zr), CC = (t) => Object.prototype.hasOwnProperty.call(t, "size"), Qt, Si, qo, Ko, Mi, Uo, vi, Jo, Go, wr, Kn, Yo, Ti, Br, SC = (Br = class extends Pm {
  constructor(n) {
    super();
    K(this, Qt);
    K(this, Si);
    K(this, qo);
    K(this, Ko);
    K(this, Mi);
    K(this, Uo);
    K(this, vi);
    K(this, Jo);
    K(this, Go);
    K(this, wr);
    K(this, Kn);
    K(this, Yo);
    K(this, Ti);
    B(this, Qt, pe.none), B(this, Si, (r) => {
      const i = Object.values({
        ...this.schema.nodes,
        ...this.schema.marks
      }).find((o) => o.spec.toMarkdown.match(r));
      if (!i) throw t1(r.type);
      return i;
    }), B(this, qo, (r) => v(this, Si).call(this, r).spec.toMarkdown.runner(this, r)), B(this, Ko, (r, i) => v(this, Si).call(this, r).spec.toMarkdown.runner(this, r, i)), B(this, Mi, (r) => {
      const { marks: i } = r, o = (s) => s.type.spec.priority ?? 50;
      [...i].sort((s, l) => o(s) - o(l)).every((s) => !v(this, Ko).call(this, s, r)) && v(this, qo).call(this, r), i.forEach((s) => v(this, Ti).call(this, s));
    }), B(this, Uo, (r, i) => {
      var u;
      if (r.type === i || ((u = r.children) == null ? void 0 : u.length) !== 1) return r;
      const o = (c) => {
        var d;
        if (c.type === i) return c.value != null ? null : c;
        if (((d = c.children) == null ? void 0 : d.length) !== 1) return null;
        const [f] = c.children;
        return f ? o(f) : null;
      }, s = o(r);
      if (!s) return r;
      const l = s.children ? [...s.children] : void 0, a = {
        ...r,
        children: l
      };
      return a.children = l, s.children = [a], s;
    }), B(this, vi, (r) => {
      const { children: i } = r;
      return i && (r.children = i.reduce((o, s, l) => {
        if (l === 0) return [s];
        const a = o.at(-1);
        if (a && a.isMark && s.isMark) {
          s = v(this, Uo).call(this, s, a.type);
          const { children: u, ...c } = s, { children: f, ...d } = a;
          if (s.type === a.type && u && f && JSON.stringify(c) === JSON.stringify(d)) {
            const h = {
              ...d,
              children: [...f, ...u]
            };
            return o.slice(0, -1).concat(v(this, vi).call(this, h));
          }
        }
        return o.concat(s);
      }, [])), r;
    }), B(this, Jo, (r) => {
      const i = {
        ...r.props,
        type: r.type
      };
      return r.children && (i.children = r.children), r.value && (i.value = r.value), i;
    }), this.openNode = (r, i, o) => (this.open(Dd.create(r, void 0, i, o)), this), B(this, Go, (r, i) => {
      let o = "", s = "";
      const l = r.children;
      let a = -1, u = -1;
      const c = (d) => {
        d && d.forEach((h, p) => {
          h.type === "text" && h.value && (a < 0 && (a = p), u = p);
        });
      };
      if (l) {
        c(l);
        const d = l == null ? void 0 : l[u], h = l == null ? void 0 : l[a];
        if (d && d.value.endsWith(" ")) {
          const p = d.value, k = p.trimEnd();
          s = p.slice(k.length), d.value = k;
        }
        if (h && h.value.startsWith(" ")) {
          const p = h.value, k = p.trimStart();
          o = p.slice(0, p.length - k.length), h.value = k;
        }
      }
      o.length && v(this, Kn).call(this, "text", void 0, o);
      const f = i();
      return s.length && v(this, Kn).call(this, "text", void 0, s), f;
    }), B(this, wr, (r = !1) => {
      const i = this.close(), o = () => v(this, Kn).call(this, i.type, i.children, i.value, i.props);
      return r ? v(this, Go).call(this, i, o) : o();
    }), this.closeNode = () => (v(this, wr).call(this), this), B(this, Kn, (r, i, o, s) => {
      const l = Dd.create(r, i, o, s), a = v(this, vi).call(this, v(this, Jo).call(this, l));
      return this.push(a), a;
    }), this.addNode = (r, i, o, s) => (v(this, Kn).call(this, r, i, o, s), this), B(this, Yo, (r, i, o, s) => r.isInSet(v(this, Qt)) ? this : (B(this, Qt, r.addToSet(v(this, Qt))), this.openNode(i, o, {
      ...s,
      isMark: !0
    }))), B(this, Ti, (r) => {
      r.isInSet(v(this, Qt)) && (B(this, Qt, r.type.removeFromSet(v(this, Qt))), v(this, wr).call(this, !0));
    }), this.withMark = (r, i, o, s) => (v(this, Yo).call(this, r, i, o, s), this), this.closeMark = (r) => (v(this, Ti).call(this, r), this), this.build = () => {
      let r = null;
      do
        r = v(this, wr).call(this);
      while (this.size());
      return r;
    }, this.next = (r) => CC(r) ? (r.forEach((i) => {
      v(this, Mi).call(this, i);
    }), this) : (v(this, Mi).call(this, r), this), this.toString = (r) => r.stringify(this.build()), this.run = (r) => (this.next(r), this), this.schema = n;
  }
}, Qt = new WeakMap(), Si = new WeakMap(), qo = new WeakMap(), Ko = new WeakMap(), Mi = new WeakMap(), Uo = new WeakMap(), vi = new WeakMap(), Jo = new WeakMap(), Go = new WeakMap(), wr = new WeakMap(), Kn = new WeakMap(), Yo = new WeakMap(), Ti = new WeakMap(), Br.create = (n, r) => {
  const i = new Br(n);
  return (o) => (i.run(o), i.toString(r));
}, Br);
const Ye = function(t) {
  for (var e = 0; ; e++)
    if (t = t.previousSibling, !t)
      return e;
}, Li = function(t) {
  let e = t.assignedSlot || t.parentNode;
  return e && e.nodeType == 11 ? e.host : e;
};
let nu = null;
const pn = function(t, e, n) {
  let r = nu || (nu = document.createRange());
  return r.setEnd(t, n ?? t.nodeValue.length), r.setStart(t, e || 0), r;
}, MC = function() {
  nu = null;
}, Vr = function(t, e, n, r) {
  return n && (Rd(t, e, n, r, -1) || Rd(t, e, n, r, 1));
}, vC = /^(img|br|input|textarea|hr)$/i;
function Rd(t, e, n, r, i) {
  for (var o; ; ) {
    if (t == n && e == r)
      return !0;
    if (e == (i < 0 ? 0 : Bt(t))) {
      let s = t.parentNode;
      if (!s || s.nodeType != 1 || ss(t) || vC.test(t.nodeName) || t.contentEditable == "false")
        return !1;
      e = Ye(t) + (i < 0 ? 0 : 1), t = s;
    } else if (t.nodeType == 1) {
      let s = t.childNodes[e + (i < 0 ? -1 : 0)];
      if (s.nodeType == 1 && s.contentEditable == "false")
        if (!((o = s.pmViewDesc) === null || o === void 0) && o.ignoreForSelection)
          e += i;
        else
          return !1;
      else
        t = s, e = i < 0 ? Bt(t) : 0;
    } else
      return !1;
  }
}
function Bt(t) {
  return t.nodeType == 3 ? t.nodeValue.length : t.childNodes.length;
}
function TC(t, e) {
  for (; ; ) {
    if (t.nodeType == 3 && e)
      return t;
    if (t.nodeType == 1 && e > 0) {
      if (t.contentEditable == "false")
        return null;
      t = t.childNodes[e - 1], e = Bt(t);
    } else if (t.parentNode && !ss(t))
      e = Ye(t), t = t.parentNode;
    else
      return null;
  }
}
function NC(t, e) {
  for (; ; ) {
    if (t.nodeType == 3 && e < t.nodeValue.length)
      return t;
    if (t.nodeType == 1 && e < t.childNodes.length) {
      if (t.contentEditable == "false")
        return null;
      t = t.childNodes[e], e = 0;
    } else if (t.parentNode && !ss(t))
      e = Ye(t) + 1, t = t.parentNode;
    else
      return null;
  }
}
function IC(t, e, n) {
  for (let r = e == 0, i = e == Bt(t); r || i; ) {
    if (t == n)
      return !0;
    let o = Ye(t);
    if (t = t.parentNode, !t)
      return !1;
    r = r && o == 0, i = i && o == Bt(t);
  }
}
function ss(t) {
  let e;
  for (let n = t; n && !(e = n.pmViewDesc); n = n.parentNode)
    ;
  return e && e.node && e.node.isBlock && (e.dom == t || e.contentDOM == t);
}
const Il = function(t) {
  return t.focusNode && Vr(t.focusNode, t.focusOffset, t.anchorNode, t.anchorOffset);
};
function pr(t, e) {
  let n = document.createEvent("Event");
  return n.initEvent("keydown", !0, !0), n.keyCode = t, n.key = n.code = e, n;
}
function AC(t) {
  let e = t.activeElement;
  for (; e && e.shadowRoot; )
    e = e.shadowRoot.activeElement;
  return e;
}
function EC(t, e, n) {
  if (t.caretPositionFromPoint)
    try {
      let r = t.caretPositionFromPoint(e, n);
      if (r)
        return { node: r.offsetNode, offset: Math.min(Bt(r.offsetNode), r.offset) };
    } catch {
    }
  if (t.caretRangeFromPoint) {
    let r = t.caretRangeFromPoint(e, n);
    if (r)
      return { node: r.startContainer, offset: Math.min(Bt(r.startContainer), r.startOffset) };
  }
}
const Zt = typeof navigator < "u" ? navigator : null, Ld = typeof document < "u" ? document : null, sr = Zt && Zt.userAgent || "", ru = /Edge\/(\d+)/.exec(sr), Bm = /MSIE \d/.exec(sr), iu = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(sr), yt = !!(Bm || iu || ru), Qn = Bm ? document.documentMode : iu ? +iu[1] : ru ? +ru[1] : 0, Ft = !yt && /gecko\/(\d+)/i.test(sr);
Ft && +(/Firefox\/(\d+)/.exec(sr) || [0, 0])[1];
const ou = !yt && /Chrome\/(\d+)/.exec(sr), Qe = !!ou, Fm = ou ? +ou[1] : 0, tt = !yt && !!Zt && /Apple Computer/.test(Zt.vendor), Pi = tt && (/Mobile\/\w+/.test(sr) || !!Zt && Zt.maxTouchPoints > 2), Pt = Pi || (Zt ? /Mac/.test(Zt.platform) : !1), $m = Zt ? /Win/.test(Zt.platform) : !1, Mn = /Android \d/.test(sr), ls = !!Ld && "webkitFontSmoothing" in Ld.documentElement.style, OC = ls ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0;
function DC(t) {
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
function dn(t, e) {
  return typeof t == "number" ? t : t[e];
}
function RC(t) {
  let e = t.getBoundingClientRect(), n = e.width / t.offsetWidth || 1, r = e.height / t.offsetHeight || 1;
  return {
    left: e.left,
    right: e.left + t.clientWidth * n,
    top: e.top,
    bottom: e.top + t.clientHeight * r
  };
}
function Pd(t, e, n) {
  let r = t.someProp("scrollThreshold") || 0, i = t.someProp("scrollMargin") || 5, o = t.dom.ownerDocument;
  for (let s = n || t.dom; s; ) {
    if (s.nodeType != 1) {
      s = Li(s);
      continue;
    }
    let l = s, a = l == o.body, u = a ? DC(o) : RC(l), c = 0, f = 0;
    if (e.top < u.top + dn(r, "top") ? f = -(u.top - e.top + dn(i, "top")) : e.bottom > u.bottom - dn(r, "bottom") && (f = e.bottom - e.top > u.bottom - u.top ? e.top + dn(i, "top") - u.top : e.bottom - u.bottom + dn(i, "bottom")), e.left < u.left + dn(r, "left") ? c = -(u.left - e.left + dn(i, "left")) : e.right > u.right - dn(r, "right") && (c = e.right - u.right + dn(i, "right")), c || f)
      if (a)
        o.defaultView.scrollBy(c, f);
      else {
        let h = l.scrollLeft, p = l.scrollTop;
        f && (l.scrollTop += f), c && (l.scrollLeft += c);
        let k = l.scrollLeft - h, w = l.scrollTop - p;
        e = { left: e.left - k, top: e.top - w, right: e.right - k, bottom: e.bottom - w };
      }
    let d = a ? "fixed" : getComputedStyle(s).position;
    if (/^(fixed|sticky)$/.test(d))
      break;
    s = d == "absolute" ? s.offsetParent : Li(s);
  }
}
function LC(t) {
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
  return { refDOM: r, refTop: i, stack: _m(t.dom) };
}
function _m(t) {
  let e = [], n = t.ownerDocument;
  for (let r = t; r && (e.push({ dom: r, top: r.scrollTop, left: r.scrollLeft }), t != n); r = Li(r))
    ;
  return e;
}
function PC({ refDOM: t, refTop: e, stack: n }) {
  let r = t ? t.getBoundingClientRect().top : 0;
  Vm(n, r == 0 ? 0 : r - e);
}
function Vm(t, e) {
  for (let n = 0; n < t.length; n++) {
    let { dom: r, top: i, left: o } = t[n];
    r.scrollTop != i + e && (r.scrollTop = i + e), r.scrollLeft != o && (r.scrollLeft = o);
  }
}
let Qr = null;
function zC(t) {
  if (t.setActive)
    return t.setActive();
  if (Qr)
    return t.focus(Qr);
  let e = _m(t);
  t.focus(Qr == null ? {
    get preventScroll() {
      return Qr = { preventScroll: !0 }, !0;
    }
  } : void 0), Qr || (Qr = !1, Vm(e, 0));
}
function Hm(t, e) {
  let n, r = 2e8, i, o = 0, s = e.top, l = e.top, a, u;
  for (let c = t.firstChild, f = 0; c; c = c.nextSibling, f++) {
    let d;
    if (c.nodeType == 1)
      d = c.getClientRects();
    else if (c.nodeType == 3)
      d = pn(c).getClientRects();
    else
      continue;
    for (let h = 0; h < d.length; h++) {
      let p = d[h];
      if (p.top <= s && p.bottom >= l) {
        s = Math.max(p.bottom, s), l = Math.min(p.top, l);
        let k = p.left > e.left ? p.left - e.left : p.right < e.left ? e.left - p.right : 0;
        if (k < r) {
          n = c, r = k, i = k && n.nodeType == 3 ? {
            left: p.right < e.left ? p.right : p.left,
            top: e.top
          } : e, c.nodeType == 1 && k && (o = f + (e.left >= (p.left + p.right) / 2 ? 1 : 0));
          continue;
        }
      } else p.top > e.top && !a && p.left <= e.left && p.right >= e.left && (a = c, u = { left: Math.max(p.left, Math.min(p.right, e.left)), top: p.top });
      !n && (e.left >= p.right && e.top >= p.top || e.left >= p.left && e.top >= p.bottom) && (o = f + 1);
    }
  }
  return !n && a && (n = a, i = u, r = 0), n && n.nodeType == 3 ? BC(n, i) : !n || r && n.nodeType == 1 ? { node: t, offset: o } : Hm(n, i);
}
function BC(t, e) {
  let n = t.nodeValue.length, r = document.createRange(), i;
  for (let o = 0; o < n; o++) {
    r.setEnd(t, o + 1), r.setStart(t, o);
    let s = Fn(r, 1);
    if (s.top != s.bottom && Gu(e, s)) {
      i = { node: t, offset: o + (e.left >= (s.left + s.right) / 2 ? 1 : 0) };
      break;
    }
  }
  return r.detach(), i || { node: t, offset: 0 };
}
function Gu(t, e) {
  return t.left >= e.left - 1 && t.left <= e.right + 1 && t.top >= e.top - 1 && t.top <= e.bottom + 1;
}
function FC(t, e) {
  let n = t.parentNode;
  return n && /^li$/i.test(n.nodeName) && e.left < t.getBoundingClientRect().left ? n : t;
}
function $C(t, e, n) {
  let { node: r, offset: i } = Hm(e, n), o = -1;
  if (r.nodeType == 1 && !r.firstChild) {
    let s = r.getBoundingClientRect();
    o = s.left != s.right && n.left > (s.left + s.right) / 2 ? 1 : -1;
  }
  return t.docView.posFromDOM(r, i, o);
}
function _C(t, e, n, r) {
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
function jm(t, e, n) {
  let r = t.childNodes.length;
  if (r && n.top < n.bottom)
    for (let i = Math.max(0, Math.min(r - 1, Math.floor(r * (e.top - n.top) / (n.bottom - n.top)) - 2)), o = i; ; ) {
      let s = t.childNodes[o];
      if (s.nodeType == 1) {
        let l = s.getClientRects();
        for (let a = 0; a < l.length; a++) {
          let u = l[a];
          if (Gu(e, u))
            return jm(s, e, u);
        }
      }
      if ((o = (o + 1) % r) == i)
        break;
    }
  return t;
}
function VC(t, e) {
  let n = t.dom.ownerDocument, r, i = 0, o = EC(n, e.left, e.top);
  o && ({ node: r, offset: i } = o);
  let s = (t.root.elementFromPoint ? t.root : n).elementFromPoint(e.left, e.top), l;
  if (!s || !t.dom.contains(s.nodeType != 1 ? s.parentNode : s)) {
    let u = t.dom.getBoundingClientRect();
    if (!Gu(e, u) || (s = jm(t.dom, e, u), !s))
      return null;
  }
  if (tt)
    for (let u = s; r && u; u = Li(u))
      u.draggable && (r = void 0);
  if (s = FC(s, e), r) {
    if (Ft && r.nodeType == 1 && (i = Math.min(i, r.childNodes.length), i < r.childNodes.length)) {
      let c = r.childNodes[i], f;
      c.nodeName == "IMG" && (f = c.getBoundingClientRect()).right <= e.left && f.bottom > e.top && i++;
    }
    let u;
    ls && i && r.nodeType == 1 && (u = r.childNodes[i - 1]).nodeType == 1 && u.contentEditable == "false" && u.getBoundingClientRect().top >= e.top && i--, r == t.dom && i == r.childNodes.length - 1 && r.lastChild.nodeType == 1 && e.top > r.lastChild.getBoundingClientRect().bottom ? l = t.state.doc.content.size : (i == 0 || r.nodeType != 1 || r.childNodes[i - 1].nodeName != "BR") && (l = _C(t, r, i, e));
  }
  l == null && (l = $C(t, s, e));
  let a = t.docView.nearestDesc(s, !0);
  return { pos: l, inside: a ? a.posAtStart - a.border : -1 };
}
function zd(t) {
  return t.top < t.bottom || t.left < t.right;
}
function Fn(t, e) {
  let n = t.getClientRects();
  if (n.length) {
    let r = n[e < 0 ? 0 : n.length - 1];
    if (zd(r))
      return r;
  }
  return Array.prototype.find.call(n, zd) || t.getBoundingClientRect();
}
const HC = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
function Wm(t, e, n) {
  let { node: r, offset: i, atom: o } = t.docView.domFromPos(e, n < 0 ? -1 : 1), s = ls || Ft;
  if (r.nodeType == 3)
    if (s && (HC.test(r.nodeValue) || (n < 0 ? !i : i == r.nodeValue.length))) {
      let a = Fn(pn(r, i, i), n);
      if (Ft && i && /\s/.test(r.nodeValue[i - 1]) && i < r.nodeValue.length) {
        let u = Fn(pn(r, i - 1, i - 1), -1);
        if (u.top == a.top) {
          let c = Fn(pn(r, i, i + 1), -1);
          if (c.top != a.top)
            return no(c, c.left < u.left);
        }
      }
      return a;
    } else {
      let a = i, u = i, c = n < 0 ? 1 : -1;
      return n < 0 && !i ? (u++, c = -1) : n >= 0 && i == r.nodeValue.length ? (a--, c = 1) : n < 0 ? a-- : u++, no(Fn(pn(r, a, u), c), c < 0);
    }
  if (!t.state.doc.resolve(e - (o || 0)).parent.inlineContent) {
    if (o == null && i && (n < 0 || i == Bt(r))) {
      let a = r.childNodes[i - 1];
      if (a.nodeType == 1)
        return sa(a.getBoundingClientRect(), !1);
    }
    if (o == null && i < Bt(r)) {
      let a = r.childNodes[i];
      if (a.nodeType == 1)
        return sa(a.getBoundingClientRect(), !0);
    }
    return sa(r.getBoundingClientRect(), n >= 0);
  }
  if (o == null && i && (n < 0 || i == Bt(r))) {
    let a = r.childNodes[i - 1], u = a.nodeType == 3 ? pn(a, Bt(a) - (s ? 0 : 1)) : a.nodeType == 1 && (a.nodeName != "BR" || !a.nextSibling) ? a : null;
    if (u)
      return no(Fn(u, 1), !1);
  }
  if (o == null && i < Bt(r)) {
    let a = r.childNodes[i];
    for (; a.pmViewDesc && a.pmViewDesc.ignoreForCoords; )
      a = a.nextSibling;
    let u = a ? a.nodeType == 3 ? pn(a, 0, s ? 0 : 1) : a.nodeType == 1 ? a : null : null;
    if (u)
      return no(Fn(u, -1), !0);
  }
  return no(Fn(r.nodeType == 3 ? pn(r) : r, -n), n >= 0);
}
function no(t, e) {
  if (t.width == 0)
    return t;
  let n = e ? t.left : t.right;
  return { top: t.top, bottom: t.bottom, left: n, right: n };
}
function sa(t, e) {
  if (t.height == 0)
    return t;
  let n = e ? t.top : t.bottom;
  return { top: n, bottom: n, left: t.left, right: t.right };
}
function qm(t, e, n) {
  let r = t.state, i = t.root.activeElement;
  r != e && t.updateState(e), i != t.dom && t.focus();
  try {
    return n();
  } finally {
    r != e && t.updateState(r), i != t.dom && i && i.focus();
  }
}
function jC(t, e, n) {
  let r = e.selection, i = n == "up" ? r.$from : r.$to;
  return qm(t, e, () => {
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
    let s = Wm(t, i.pos, 1);
    for (let l = o.firstChild; l; l = l.nextSibling) {
      let a;
      if (l.nodeType == 1)
        a = l.getClientRects();
      else if (l.nodeType == 3)
        a = pn(l, 0, l.nodeValue.length).getClientRects();
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
const WC = /[\u0590-\u08ac]/;
function qC(t, e, n) {
  let { $head: r } = e.selection;
  if (!r.parent.isTextblock)
    return !1;
  let i = r.parentOffset, o = !i, s = i == r.parent.content.size, l = t.domSelection();
  return l ? !WC.test(r.parent.textContent) || !l.modify ? n == "left" || n == "backward" ? o : s : qm(t, e, () => {
    let { focusNode: a, focusOffset: u, anchorNode: c, anchorOffset: f } = t.domSelectionRange(), d = l.caretBidiLevel;
    l.modify("move", n, "character");
    let h = r.depth ? t.docView.domAfterPos(r.before()) : t.dom, { focusNode: p, focusOffset: k } = t.domSelectionRange(), w = p && !h.contains(p.nodeType == 1 ? p : p.parentNode) || a == p && u == k;
    try {
      l.collapse(c, f), a && (a != c || u != f) && l.extend && l.extend(a, u);
    } catch {
    }
    return d != null && (l.caretBidiLevel = d), w;
  }) : r.pos == r.start() || r.pos == r.end();
}
let Bd = null, Fd = null, $d = !1;
function KC(t, e, n) {
  return Bd == e && Fd == n ? $d : (Bd = e, Fd = n, $d = n == "up" || n == "down" ? jC(t, e, n) : qC(t, e, n));
}
const $t = 0, _d = 1, mr = 2, en = 3;
class as {
  constructor(e, n, r, i) {
    this.parent = e, this.children = n, this.dom = r, this.contentDOM = i, this.dirty = $t, r.pmViewDesc = this;
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
      i = n > Ye(this.contentDOM);
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
      if (l > e || s instanceof Um) {
        i = e - o;
        break;
      }
      o = l;
    }
    if (i)
      return this.children[r].domFromPos(i - this.children[r].border, n);
    for (let o; r && !(o = this.children[r - 1]).size && o instanceof Km && o.side >= 0; r--)
      ;
    if (n <= 0) {
      let o, s = !0;
      for (; o = r ? this.children[r - 1] : null, !(!o || o.dom.parentNode == this.contentDOM); r--, s = !1)
        ;
      return o && n && s && !o.border && !o.domAtom ? o.domFromPos(o.size, n) : { node: this.contentDOM, offset: o ? Ye(o.dom) + 1 : 0 };
    } else {
      let o, s = !0;
      for (; o = r < this.children.length ? this.children[r] : null, !(!o || o.dom.parentNode == this.contentDOM); r++, s = !1)
        ;
      return o && s && !o.border && !o.domAtom ? o.domFromPos(0, n) : { node: this.contentDOM, offset: o ? Ye(o.dom) : this.contentDOM.childNodes.length };
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
          let d = this.children[f - 1];
          if (d.size && d.dom.parentNode == this.contentDOM && !d.emptyChildAt(1)) {
            i = Ye(d.dom) + 1;
            break;
          }
          e -= d.size;
        }
        i == -1 && (i = 0);
      }
      if (i > -1 && (u > n || l == this.children.length - 1)) {
        n = u;
        for (let c = l + 1; c < this.children.length; c++) {
          let f = this.children[c];
          if (f.size && f.dom.parentNode == this.contentDOM && !f.emptyChildAt(-1)) {
            o = Ye(f.dom);
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
    for (let h = 0, p = 0; h < this.children.length; h++) {
      let k = this.children[h], w = p + k.size;
      if (o > p && s < w)
        return k.setSelection(e - p - k.border, n - p - k.border, r, i);
      p = w;
    }
    let l = this.domFromPos(e, e ? -1 : 1), a = n == e ? l : this.domFromPos(n, n ? -1 : 1), u = r.root.getSelection(), c = r.domSelectionRange(), f = !1;
    if ((Ft || tt) && e == n) {
      let { node: h, offset: p } = l;
      if (h.nodeType == 3) {
        if (f = !!(p && h.nodeValue[p - 1] == `
`), f && p == h.nodeValue.length)
          for (let k = h, w; k; k = k.parentNode) {
            if (w = k.nextSibling) {
              w.nodeName == "BR" && (l = a = { node: w.parentNode, offset: Ye(w) + 1 });
              break;
            }
            let b = k.pmViewDesc;
            if (b && b.node && b.node.isBlock)
              break;
          }
      } else {
        let k = h.childNodes[p - 1];
        f = k && (k.nodeName == "BR" || k.contentEditable == "false");
      }
    }
    if (Ft && c.focusNode && c.focusNode != a.node && c.focusNode.nodeType == 1) {
      let h = c.focusNode.childNodes[c.focusOffset];
      h && h.contentEditable == "false" && (i = !0);
    }
    if (!(i || f && tt) && Vr(l.node, l.offset, c.anchorNode, c.anchorOffset) && Vr(a.node, a.offset, c.focusNode, c.focusOffset))
      return;
    let d = !1;
    if ((u.extend || e == n) && !(f && Ft)) {
      u.collapse(l.node, l.offset);
      try {
        e != n && u.extend(a.node, a.offset), d = !0;
      } catch {
      }
    }
    if (!d) {
      if (e > n) {
        let p = l;
        l = a, a = p;
      }
      let h = document.createRange();
      h.setEnd(a.node, a.offset), h.setStart(l.node, l.offset), u.removeAllRanges(), u.addRange(h);
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
          this.dirty = e == r || n == s ? mr : _d, e == l && n == a && (o.contentLost || o.dom.parentNode != this.contentDOM) ? o.dirty = en : o.markDirty(e - l, n - l);
          return;
        } else
          o.dirty = o.dom == o.contentDOM && o.dom.parentNode == this.contentDOM && !o.children.length ? mr : en;
      }
      r = s;
    }
    this.dirty = mr;
  }
  markParentsDirty() {
    let e = 1;
    for (let n = this.parent; n; n = n.parent, e++) {
      let r = e == 1 ? mr : _d;
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
class Km extends as {
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
    return this.dirty == $t && e.type.eq(this.widget.type);
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
class UC extends as {
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
class Hr extends as {
  constructor(e, n, r, i, o) {
    super(e, [], r, i), this.mark = n, this.spec = o;
  }
  static create(e, n, r, i) {
    let o = i.nodeViews[n.type.name], s = o && o(n, i, r);
    return (!s || !s.dom) && (s = _i.renderSpec(document, n.type.spec.toDOM(n, r), null, n.attrs)), new Hr(e, n, s.dom, s.contentDOM || s.dom, s);
  }
  parseRule() {
    return this.dirty & en || this.mark.type.spec.reparseInView ? null : { mark: this.mark.type.name, attrs: this.mark.attrs, contentElement: this.contentDOM };
  }
  matchesMark(e) {
    return this.dirty != en && this.mark.eq(e);
  }
  markDirty(e, n) {
    if (super.markDirty(e, n), this.dirty != $t) {
      let r = this.parent;
      for (; !r.node; )
        r = r.parent;
      r.dirty < this.dirty && (r.dirty = this.dirty), this.dirty = $t;
    }
  }
  slice(e, n, r) {
    let i = Hr.create(this.parent, this.mark, !0, r), o = this.children, s = this.size;
    n < s && (o = lu(o, n, s, r)), e > 0 && (o = lu(o, 0, e, r));
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
class Xn extends as {
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
    } else c || ({ dom: c, contentDOM: f } = _i.renderSpec(document, n.type.spec.toDOM(n), null, n.attrs));
    !f && !n.isText && c.nodeName != "BR" && (c.hasAttribute("contenteditable") || (c.contentEditable = "false"), n.type.spec.draggable && (c.draggable = !0));
    let d = c;
    return c = Ym(c, r, n), u ? a = new JC(e, n, r, i, c, f || null, d, u, o, s + 1) : n.isText ? new Al(e, n, r, i, c, d, o) : new Xn(e, n, r, i, c, f || null, d, o, s + 1);
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
      e.contentElement || (e.getContent = () => R.empty);
    }
    return e;
  }
  matchesNode(e, n, r) {
    return this.dirty == $t && e.eq(this.node) && ol(n, this.outerDeco) && r.eq(this.innerDeco);
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
    let r = this.node.inlineContent, i = n, o = e.composing ? this.localCompositionInfo(e, n) : null, s = o && o.pos > -1 ? o : null, l = o && o.pos < 0, a = new YC(this, s && s.node, e);
    ZC(this.node, this.innerDeco, (u, c, f) => {
      u.spec.marks ? a.syncToMarks(u.spec.marks, r, e, c) : u.type.side >= 0 && !f && a.syncToMarks(c == this.node.childCount ? pe.none : this.node.child(c).marks, r, e, c), a.placeWidget(u, e, i);
    }, (u, c, f, d) => {
      a.syncToMarks(u.marks, r, e, d);
      let h;
      a.findNodeMatch(u, c, f, d) || l && e.state.selection.from > i && e.state.selection.to < i + u.nodeSize && (h = a.findIndexWithChild(o.node)) > -1 && a.updateNodeAt(u, c, f, h, e) || a.updateNextNode(u, c, f, e, d, i) || a.addNode(u, c, f, e, i), i += u.nodeSize;
    }), a.syncToMarks([], r, e, 0), this.node.isTextblock && a.addTextblockHacks(), a.destroyRest(), (a.changed || this.dirty == mr) && (s && this.protectLocalComposition(e, s), Jm(this.contentDOM, this.children, e), Pi && eS(this.dom));
  }
  localCompositionInfo(e, n) {
    let { from: r, to: i } = e.state.selection;
    if (!(e.state.selection instanceof Z) || r < n || i > n + this.node.content.size)
      return null;
    let o = e.input.compositionNode;
    if (!o || !this.dom.contains(o.parentNode))
      return null;
    if (this.node.inlineContent) {
      let s = o.nodeValue, l = tS(this.node.content, s, r - n, i - n);
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
    let s = new UC(this, o, n, i);
    e.input.compositionNodes.push(s), this.children = lu(this.children, r, r + i.length, e, s);
  }
  // If this desc must be updated to match the given node decoration,
  // do so and return true.
  update(e, n, r, i) {
    return this.dirty == en || !e.sameMarkup(this.node) ? !1 : (this.updateInner(e, n, r, i), !0);
  }
  updateInner(e, n, r, i) {
    this.updateOuterDeco(n), this.node = e, this.innerDeco = r, this.contentDOM && this.updateChildren(i, this.posAtStart), this.dirty = $t;
  }
  updateOuterDeco(e) {
    if (ol(e, this.outerDeco))
      return;
    let n = this.nodeDOM.nodeType != 1, r = this.dom;
    this.dom = Gm(this.dom, this.nodeDOM, su(this.outerDeco, this.node, n), su(e, this.node, n)), this.dom != r && (r.pmViewDesc = void 0, this.dom.pmViewDesc = this), this.outerDeco = e;
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
function Vd(t, e, n, r, i) {
  Ym(r, e, t);
  let o = new Xn(void 0, t, e, n, r, r, r, i, 0);
  return o.contentDOM && o.updateChildren(i, 0), o;
}
class Al extends Xn {
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
    return this.dirty == en || this.dirty != $t && !this.inParent() || !e.sameMarkup(this.node) ? !1 : (this.updateOuterDeco(n), (this.dirty != $t || e.text != this.node.text) && e.text != this.nodeDOM.nodeValue && (this.nodeDOM.nodeValue = e.text, i.trackWrites == this.nodeDOM && (i.trackWrites = null)), this.node = e, this.dirty = $t, !0);
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
    return new Al(this.parent, i, this.outerDeco, this.innerDeco, o, o, r);
  }
  markDirty(e, n) {
    super.markDirty(e, n), this.dom != this.nodeDOM && (e == 0 || n == this.nodeDOM.nodeValue.length) && (this.dirty = en);
  }
  get domAtom() {
    return !1;
  }
  isText(e) {
    return this.node.text == e;
  }
}
class Um extends as {
  parseRule() {
    return { ignore: !0 };
  }
  matchesHack(e) {
    return this.dirty == $t && this.dom.nodeName == e;
  }
  get domAtom() {
    return !0;
  }
  get ignoreForCoords() {
    return this.dom.nodeName == "IMG";
  }
}
class JC extends Xn {
  constructor(e, n, r, i, o, s, l, a, u, c) {
    super(e, n, r, i, o, s, l, u, c), this.spec = a;
  }
  // A custom `update` method gets to decide whether the update goes
  // through. If it does, and there's a `contentDOM` node, our logic
  // updates the children.
  update(e, n, r, i) {
    if (this.dirty == en)
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
function Jm(t, e, n) {
  let r = t.firstChild, i = !1;
  for (let o = 0; o < e.length; o++) {
    let s = e[o], l = s.dom;
    if (l.parentNode == t) {
      for (; l != r; )
        r = Hd(r), i = !0;
      r = r.nextSibling;
    } else
      i = !0, t.insertBefore(l, r);
    if (s instanceof Hr) {
      let a = r ? r.previousSibling : t.lastChild;
      Jm(s.contentDOM, s.children, n), r = a ? a.nextSibling : t.firstChild;
    }
  }
  for (; r; )
    r = Hd(r), i = !0;
  i && n.trackWrites == t && (n.trackWrites = null);
}
const go = function(t) {
  t && (this.nodeName = t);
};
go.prototype = /* @__PURE__ */ Object.create(null);
const gr = [new go()];
function su(t, e, n) {
  if (t.length == 0)
    return gr;
  let r = n ? gr[0] : new go(), i = [r];
  for (let o = 0; o < t.length; o++) {
    let s = t[o].type.attrs;
    if (s) {
      s.nodeName && i.push(r = new go(s.nodeName));
      for (let l in s) {
        let a = s[l];
        a != null && (n && i.length == 1 && i.push(r = new go(e.isInline ? "span" : "div")), l == "class" ? r.class = (r.class ? r.class + " " : "") + a : l == "style" ? r.style = (r.style ? r.style + ";" : "") + a : l != "nodeName" && (r[l] = a));
      }
    }
  }
  return i;
}
function Gm(t, e, n, r) {
  if (n == gr && r == gr)
    return e;
  let i = e;
  for (let o = 0; o < r.length; o++) {
    let s = r[o], l = n[o];
    if (o) {
      let a;
      l && l.nodeName == s.nodeName && i != t && (a = i.parentNode) && a.nodeName.toLowerCase() == s.nodeName || (a = document.createElement(s.nodeName), a.pmIsDeco = !0, a.appendChild(i), l = gr[0]), i = a;
    }
    GC(i, l || gr[0], s);
  }
  return i;
}
function GC(t, e, n) {
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
function Ym(t, e, n) {
  return Gm(t, t, gr, su(e, n, t.nodeType != 1));
}
function ol(t, e) {
  if (t.length != e.length)
    return !1;
  for (let n = 0; n < t.length; n++)
    if (!t[n].type.eq(e[n].type))
      return !1;
  return !0;
}
function Hd(t) {
  let e = t.nextSibling;
  return t.parentNode.removeChild(t), e;
}
class YC {
  constructor(e, n, r) {
    this.lock = n, this.view = r, this.index = 0, this.stack = [], this.changed = !1, this.top = e, this.preMatch = QC(e.node.content, e);
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
      this.destroyRest(), this.top.dirty = $t, this.index = this.stack.pop(), this.top = this.stack.pop(), s--;
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
        let c = Hr.create(this.top, e[s], n, r);
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
    return s.dirty == en && s.dom == s.contentDOM && (s.dirty = mr), s.update(e, n, r, o) ? (this.destroyBetween(this.index, i), this.index++, !0) : !1;
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
      if (a instanceof Xn) {
        let u = this.preMatch.matched.get(a);
        if (u != null && u != o)
          return !1;
        let c = a.dom, f, d = this.isLocked(c) && !(e.isText && a.node && a.node.isText && a.nodeDOM.nodeValue == e.text && a.dirty != en && ol(n, a.outerDeco));
        if (!d && a.update(e, n, r, i))
          return this.destroyBetween(this.index, l), a.dom != c && (this.changed = !0), this.index++, !0;
        if (!d && (f = this.recreateWrapper(a, e, n, r, i, s)))
          return this.destroyBetween(this.index, l), this.top.children[this.index] = f, f.contentDOM && (f.dirty = mr, f.updateChildren(i, s + 1), f.dirty = $t), this.changed = !0, this.index++, !0;
        break;
      }
    }
    return !1;
  }
  // When a node with content is replaced by a different node with
  // identical content, move over its children.
  recreateWrapper(e, n, r, i, o, s) {
    if (e.dirty || n.isAtom || !e.children.length || !e.node.content.eq(n.content) || !ol(r, e.outerDeco) || !i.eq(e.innerDeco))
      return null;
    let l = Xn.create(this.top, n, r, i, o, s);
    if (l.contentDOM) {
      l.children = e.children, e.children = [];
      for (let a of l.children)
        a.parent = l;
    }
    return e.destroy(), l;
  }
  // Insert the node as a newly created node desc.
  addNode(e, n, r, i, o) {
    let s = Xn.create(this.top, e, n, r, i, o);
    s.contentDOM && s.updateChildren(i, o + 1), this.top.children.splice(this.index++, 0, s), this.changed = !0;
  }
  placeWidget(e, n, r) {
    let i = this.index < this.top.children.length ? this.top.children[this.index] : null;
    if (i && i.matchesWidget(e) && (e == i.widget || !i.widget.type.toDOM.parentNode))
      this.index++;
    else {
      let o = new Km(this.top, e, n, r);
      this.top.children.splice(this.index++, 0, o), this.changed = !0;
    }
  }
  // Make sure a textblock looks and behaves correctly in
  // contentEditable.
  addTextblockHacks() {
    let e = this.top.children[this.index - 1], n = this.top;
    for (; e instanceof Hr; )
      n = e, e = n.children[n.children.length - 1];
    (!e || // Empty textblock
    !(e instanceof Al) || /\n$/.test(e.node.text) || this.view.requiresGeckoHackNode && /\s$/.test(e.node.text)) && ((tt || Qe) && e && e.dom.contentEditable == "false" && this.addHackNode("IMG", n), this.addHackNode("BR", this.top));
  }
  addHackNode(e, n) {
    if (n == this.top && this.index < n.children.length && n.children[this.index].matchesHack(e))
      this.index++;
    else {
      let r = document.createElement(e);
      e == "IMG" && (r.className = "ProseMirror-separator", r.alt = ""), e == "BR" && (r.className = "ProseMirror-trailingBreak");
      let i = new Um(this.top, [], r, null);
      n != this.top ? n.children.push(i) : n.children.splice(this.index++, 0, i), this.changed = !0;
    }
  }
  isLocked(e) {
    return this.lock && (e == this.lock || e.nodeType == 1 && e.contains(this.lock.parentNode));
  }
}
function QC(t, e) {
  let n = e, r = n.children.length, i = t.childCount, o = /* @__PURE__ */ new Map(), s = [];
  e: for (; i > 0; ) {
    let l;
    for (; ; )
      if (r) {
        let u = n.children[r - 1];
        if (u instanceof Hr)
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
function XC(t, e) {
  return t.type.side - e.type.side;
}
function ZC(t, e, n, r) {
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
      let w = i[s++];
      w.widget && (c ? (f || (f = [c])).push(w) : c = w);
    }
    if (c)
      if (f) {
        f.sort(XC);
        for (let w = 0; w < f.length; w++)
          n(f[w], u, !!a);
      } else
        n(c, u, !!a);
    let d, h;
    if (a)
      h = -1, d = a, a = null;
    else if (u < t.childCount)
      h = u, d = t.child(u++);
    else
      break;
    for (let w = 0; w < l.length; w++)
      l[w].to <= o && l.splice(w--, 1);
    for (; s < i.length && i[s].from <= o && i[s].to > o; )
      l.push(i[s++]);
    let p = o + d.nodeSize;
    if (d.isText) {
      let w = p;
      s < i.length && i[s].from < w && (w = i[s].from);
      for (let b = 0; b < l.length; b++)
        l[b].to < w && (w = l[b].to);
      w < p && (a = d.cut(w - o), d = d.cut(0, w - o), p = w, h = -1);
    } else
      for (; s < i.length && i[s].to < p; )
        s++;
    let k = d.isInline && !d.isLeaf ? l.filter((w) => !w.inline) : l.slice();
    r(d, k, e.forChild(o, d), h), o = p;
  }
}
function eS(t) {
  if (t.nodeName == "UL" || t.nodeName == "OL") {
    let e = t.style.cssText;
    t.style.cssText = e + "; list-style: square !important", window.getComputedStyle(t).listStyle, t.style.cssText = e;
  }
}
function tS(t, e, n, r) {
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
function lu(t, e, n, r, i) {
  let o = [];
  for (let s = 0, l = 0; s < t.length; s++) {
    let a = t[s], u = l, c = l += a.size;
    u >= n || c <= e ? o.push(a) : (u < e && o.push(a.slice(0, e - u, r)), i && (o.push(i), i = void 0), c > n && o.push(a.slice(n - u, a.size, r)));
  }
  return o;
}
function Yu(t, e = null) {
  let n = t.domSelectionRange(), r = t.state.doc;
  if (!n.focusNode)
    return null;
  let i = t.docView.nearestDesc(n.focusNode), o = i && i.size == 0, s = t.docView.posFromDOM(n.focusNode, n.focusOffset, 1);
  if (s < 0)
    return null;
  let l = r.resolve(s), a, u;
  if (Il(n)) {
    for (a = s; i && !i.node; )
      i = i.parent;
    let f = i.node;
    if (i && f.isAtom && re.isSelectable(f) && i.parent && !(f.isInline && IC(n.focusNode, n.focusOffset, i.dom))) {
      let d = i.posBefore;
      u = new re(s == d ? l : r.resolve(d));
    }
  } else {
    if (n instanceof t.dom.ownerDocument.defaultView.Selection && n.rangeCount > 1) {
      let f = s, d = s;
      for (let h = 0; h < n.rangeCount; h++) {
        let p = n.getRangeAt(h);
        f = Math.min(f, t.docView.posFromDOM(p.startContainer, p.startOffset, 1)), d = Math.max(d, t.docView.posFromDOM(p.endContainer, p.endOffset, -1));
      }
      if (f < 0)
        return null;
      [a, s] = d == t.state.selection.anchor ? [d, f] : [f, d], l = r.resolve(s);
    } else
      a = t.docView.posFromDOM(n.anchorNode, n.anchorOffset, 1);
    if (a < 0)
      return null;
  }
  let c = r.resolve(a);
  if (!u) {
    let f = e == "pointer" || t.state.selection.head < l.pos && !o ? 1 : -1;
    u = Qu(t, c, l, f);
  }
  return u;
}
function Qm(t) {
  return t.editable ? t.hasFocus() : Zm(t) && document.activeElement && document.activeElement.contains(t.dom);
}
function Tn(t, e = !1) {
  let n = t.state.selection;
  if (Xm(t, n), !!Qm(t)) {
    if (!e && t.input.mouseDown && t.input.mouseDown.allowDefault && Qe) {
      let r = t.domSelectionRange(), i = t.domObserver.currentSelection;
      if (r.anchorNode && i.anchorNode && Vr(r.anchorNode, r.anchorOffset, i.anchorNode, i.anchorOffset)) {
        t.input.mouseDown.delayedSelectionSync = !0, t.domObserver.setCurSelection();
        return;
      }
    }
    if (t.domObserver.disconnectSelection(), t.cursorWrapper)
      rS(t);
    else {
      let { anchor: r, head: i } = n, o, s;
      jd && !(n instanceof Z) && (n.$from.parent.inlineContent || (o = Wd(t, n.from)), !n.empty && !n.$from.parent.inlineContent && (s = Wd(t, n.to))), t.docView.setSelection(r, i, t, e), jd && (o && qd(o), s && qd(s)), n.visible ? t.dom.classList.remove("ProseMirror-hideselection") : (t.dom.classList.add("ProseMirror-hideselection"), "onselectionchange" in document && nS(t));
    }
    t.domObserver.setCurSelection(), t.domObserver.connectSelection();
  }
}
const jd = tt || Qe && Fm < 63;
function Wd(t, e) {
  let { node: n, offset: r } = t.docView.domFromPos(e, 0), i = r < n.childNodes.length ? n.childNodes[r] : null, o = r ? n.childNodes[r - 1] : null;
  if (tt && i && i.contentEditable == "false")
    return la(i);
  if ((!i || i.contentEditable == "false") && (!o || o.contentEditable == "false")) {
    if (i)
      return la(i);
    if (o)
      return la(o);
  }
}
function la(t) {
  return t.contentEditable = "true", tt && t.draggable && (t.draggable = !1, t.wasDraggable = !0), t;
}
function qd(t) {
  t.contentEditable = "false", t.wasDraggable && (t.draggable = !0, t.wasDraggable = null);
}
function nS(t) {
  let e = t.dom.ownerDocument;
  e.removeEventListener("selectionchange", t.input.hideSelectionGuard);
  let n = t.domSelectionRange(), r = n.anchorNode, i = n.anchorOffset;
  e.addEventListener("selectionchange", t.input.hideSelectionGuard = () => {
    (n.anchorNode != r || n.anchorOffset != i) && (e.removeEventListener("selectionchange", t.input.hideSelectionGuard), setTimeout(() => {
      (!Qm(t) || t.state.selection.visible) && t.dom.classList.remove("ProseMirror-hideselection");
    }, 20));
  });
}
function rS(t) {
  let e = t.domSelection();
  if (!e)
    return;
  let n = t.cursorWrapper.dom, r = n.nodeName == "IMG";
  r ? e.collapse(n.parentNode, Ye(n) + 1) : e.collapse(n, 0), !r && !t.state.selection.visible && yt && Qn <= 11 && (n.disabled = !0, n.disabled = !1);
}
function Xm(t, e) {
  if (e instanceof re) {
    let n = t.docView.descAt(e.from);
    n != t.lastSelectedViewDesc && (Kd(t), n && n.selectNode(), t.lastSelectedViewDesc = n);
  } else
    Kd(t);
}
function Kd(t) {
  t.lastSelectedViewDesc && (t.lastSelectedViewDesc.parent && t.lastSelectedViewDesc.deselectNode(), t.lastSelectedViewDesc = void 0);
}
function Qu(t, e, n, r) {
  return t.someProp("createSelectionBetween", (i) => i(t, e, n)) || Z.between(e, n, r);
}
function Ud(t) {
  return t.editable && !t.hasFocus() ? !1 : Zm(t);
}
function Zm(t) {
  let e = t.domSelectionRange();
  if (!e.anchorNode)
    return !1;
  try {
    return t.dom.contains(e.anchorNode.nodeType == 3 ? e.anchorNode.parentNode : e.anchorNode) && (t.editable || t.dom.contains(e.focusNode.nodeType == 3 ? e.focusNode.parentNode : e.focusNode));
  } catch {
    return !1;
  }
}
function iS(t) {
  let e = t.docView.domFromPos(t.state.selection.anchor, 0), n = t.domSelectionRange();
  return Vr(e.node, e.offset, n.anchorNode, n.anchorOffset);
}
function au(t, e) {
  let { $anchor: n, $head: r } = t.selection, i = e > 0 ? n.max(r) : n.min(r), o = i.parent.inlineContent ? i.depth ? t.doc.resolve(e > 0 ? i.after() : i.before()) : null : i;
  return o && oe.findFrom(o, e);
}
function $n(t, e) {
  return t.dispatch(t.state.tr.setSelection(e).scrollIntoView()), !0;
}
function Jd(t, e, n) {
  let r = t.state.selection;
  if (r instanceof Z)
    if (n.indexOf("s") > -1) {
      let { $head: i } = r, o = i.textOffset ? null : e < 0 ? i.nodeBefore : i.nodeAfter;
      if (!o || o.isText || !o.isLeaf)
        return !1;
      let s = t.state.doc.resolve(i.pos + o.nodeSize * (e < 0 ? -1 : 1));
      return $n(t, new Z(r.$anchor, s));
    } else if (r.empty) {
      if (t.endOfTextblock(e > 0 ? "forward" : "backward")) {
        let i = au(t.state, e);
        return i && i instanceof re ? $n(t, i) : !1;
      } else if (!(Pt && n.indexOf("m") > -1)) {
        let i = r.$head, o = i.textOffset ? null : e < 0 ? i.nodeBefore : i.nodeAfter, s;
        if (!o || o.isText)
          return !1;
        let l = e < 0 ? i.pos - o.nodeSize : i.pos;
        return o.isAtom || (s = t.docView.descAt(l)) && !s.contentDOM ? re.isSelectable(o) ? $n(t, new re(e < 0 ? t.state.doc.resolve(i.pos - o.nodeSize) : i)) : ls ? $n(t, new Z(t.state.doc.resolve(e < 0 ? l : l + o.nodeSize))) : !1 : !1;
      }
    } else return !1;
  else {
    if (r instanceof re && r.node.isInline)
      return $n(t, new Z(e > 0 ? r.$to : r.$from));
    {
      let i = au(t.state, e);
      return i ? $n(t, i) : !1;
    }
  }
}
function sl(t) {
  return t.nodeType == 3 ? t.nodeValue.length : t.childNodes.length;
}
function yo(t, e) {
  let n = t.pmViewDesc;
  return n && n.size == 0 && (e < 0 || t.nextSibling || t.nodeName != "BR");
}
function Xr(t, e) {
  return e < 0 ? oS(t) : sS(t);
}
function oS(t) {
  let e = t.domSelectionRange(), n = e.focusNode, r = e.focusOffset;
  if (!n)
    return;
  let i, o, s = !1;
  for (Ft && n.nodeType == 1 && r < sl(n) && yo(n.childNodes[r], -1) && (s = !0); ; )
    if (r > 0) {
      if (n.nodeType != 1)
        break;
      {
        let l = n.childNodes[r - 1];
        if (yo(l, -1))
          i = n, o = --r;
        else if (l.nodeType == 3)
          n = l, r = n.nodeValue.length;
        else
          break;
      }
    } else {
      if (eg(n))
        break;
      {
        let l = n.previousSibling;
        for (; l && yo(l, -1); )
          i = n.parentNode, o = Ye(l), l = l.previousSibling;
        if (l)
          n = l, r = sl(n);
        else {
          if (n = n.parentNode, n == t.dom)
            break;
          r = 0;
        }
      }
    }
  s ? uu(t, n, r) : i && uu(t, i, o);
}
function sS(t) {
  let e = t.domSelectionRange(), n = e.focusNode, r = e.focusOffset;
  if (!n)
    return;
  let i = sl(n), o, s;
  for (; ; )
    if (r < i) {
      if (n.nodeType != 1)
        break;
      let l = n.childNodes[r];
      if (yo(l, 1))
        o = n, s = ++r;
      else
        break;
    } else {
      if (eg(n))
        break;
      {
        let l = n.nextSibling;
        for (; l && yo(l, 1); )
          o = l.parentNode, s = Ye(l) + 1, l = l.nextSibling;
        if (l)
          n = l, r = 0, i = sl(n);
        else {
          if (n = n.parentNode, n == t.dom)
            break;
          r = i = 0;
        }
      }
    }
  o && uu(t, o, s);
}
function eg(t) {
  let e = t.pmViewDesc;
  return e && e.node && e.node.isBlock;
}
function lS(t, e) {
  for (; t && e == t.childNodes.length && !ss(t); )
    e = Ye(t) + 1, t = t.parentNode;
  for (; t && e < t.childNodes.length; ) {
    let n = t.childNodes[e];
    if (n.nodeType == 3)
      return n;
    if (n.nodeType == 1 && n.contentEditable == "false")
      break;
    t = n, e = 0;
  }
}
function aS(t, e) {
  for (; t && !e && !ss(t); )
    e = Ye(t), t = t.parentNode;
  for (; t && e; ) {
    let n = t.childNodes[e - 1];
    if (n.nodeType == 3)
      return n;
    if (n.nodeType == 1 && n.contentEditable == "false")
      break;
    t = n, e = t.childNodes.length;
  }
}
function uu(t, e, n) {
  if (e.nodeType != 3) {
    let o, s;
    (s = lS(e, n)) ? (e = s, n = 0) : (o = aS(e, n)) && (e = o, n = o.nodeValue.length);
  }
  let r = t.domSelection();
  if (!r)
    return;
  if (Il(r)) {
    let o = document.createRange();
    o.setEnd(e, n), o.setStart(e, n), r.removeAllRanges(), r.addRange(o);
  } else r.extend && r.extend(e, n);
  t.domObserver.setCurSelection();
  let { state: i } = t;
  setTimeout(() => {
    t.state == i && Tn(t);
  }, 50);
}
function Gd(t, e) {
  let n = t.state.doc.resolve(e);
  if (!(Qe || $m) && n.parent.inlineContent) {
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
function Yd(t, e, n) {
  let r = t.state.selection;
  if (r instanceof Z && !r.empty || n.indexOf("s") > -1 || Pt && n.indexOf("m") > -1)
    return !1;
  let { $from: i, $to: o } = r;
  if (!i.parent.inlineContent || t.endOfTextblock(e < 0 ? "up" : "down")) {
    let s = au(t.state, e);
    if (s && s instanceof re)
      return $n(t, s);
  }
  if (!i.parent.inlineContent) {
    let s = e < 0 ? i : o, l = r instanceof It ? oe.near(s, e) : oe.findFrom(s, e);
    return l ? $n(t, l) : !1;
  }
  return !1;
}
function Qd(t, e) {
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
function Xd(t, e, n) {
  t.domObserver.stop(), e.contentEditable = n, t.domObserver.start();
}
function uS(t) {
  if (!tt || t.state.selection.$head.parentOffset > 0)
    return !1;
  let { focusNode: e, focusOffset: n } = t.domSelectionRange();
  if (e && e.nodeType == 1 && n == 0 && e.firstChild && e.firstChild.contentEditable == "false") {
    let r = e.firstChild;
    Xd(t, r, "true"), setTimeout(() => Xd(t, r, "false"), 20);
  }
  return !1;
}
function cS(t) {
  let e = "";
  return t.ctrlKey && (e += "c"), t.metaKey && (e += "m"), t.altKey && (e += "a"), t.shiftKey && (e += "s"), e;
}
function fS(t, e) {
  let n = e.keyCode, r = cS(e);
  if (n == 8 || Pt && n == 72 && r == "c")
    return Qd(t, -1) || Xr(t, -1);
  if (n == 46 && !e.shiftKey || Pt && n == 68 && r == "c")
    return Qd(t, 1) || Xr(t, 1);
  if (n == 13 || n == 27)
    return !0;
  if (n == 37 || Pt && n == 66 && r == "c") {
    let i = n == 37 ? Gd(t, t.state.selection.from) == "ltr" ? -1 : 1 : -1;
    return Jd(t, i, r) || Xr(t, i);
  } else if (n == 39 || Pt && n == 70 && r == "c") {
    let i = n == 39 ? Gd(t, t.state.selection.from) == "ltr" ? 1 : -1 : 1;
    return Jd(t, i, r) || Xr(t, i);
  } else {
    if (n == 38 || Pt && n == 80 && r == "c")
      return Yd(t, -1, r) || Xr(t, -1);
    if (n == 40 || Pt && n == 78 && r == "c")
      return uS(t) || Yd(t, 1, r) || Xr(t, 1);
    if (r == (Pt ? "m" : "c") && (n == 66 || n == 73 || n == 89 || n == 90))
      return !0;
  }
  return !1;
}
function Xu(t, e) {
  t.someProp("transformCopied", (h) => {
    e = h(e, t);
  });
  let n = [], { content: r, openStart: i, openEnd: o } = e;
  for (; i > 1 && o > 1 && r.childCount == 1 && r.firstChild.childCount == 1; ) {
    i--, o--;
    let h = r.firstChild;
    n.push(h.type.name, h.attrs != h.type.defaultAttrs ? h.attrs : null), r = h.content;
  }
  let s = t.someProp("clipboardSerializer") || _i.fromSchema(t.state.schema), l = sg(), a = l.createElement("div");
  a.appendChild(s.serializeFragment(r, { document: l }));
  let u = a.firstChild, c, f = 0;
  for (; u && u.nodeType == 1 && (c = og[u.nodeName.toLowerCase()]); ) {
    for (let h = c.length - 1; h >= 0; h--) {
      let p = l.createElement(c[h]);
      for (; a.firstChild; )
        p.appendChild(a.firstChild);
      a.appendChild(p), f++;
    }
    u = a.firstChild;
  }
  u && u.nodeType == 1 && u.setAttribute("data-pm-slice", `${i} ${o}${f ? ` -${f}` : ""} ${JSON.stringify(n)}`);
  let d = t.someProp("clipboardTextSerializer", (h) => h(e, t)) || e.content.textBetween(0, e.content.size, `

`);
  return { dom: a, text: d, slice: e };
}
function tg(t, e, n, r, i) {
  let o = i.parent.type.spec.code, s, l;
  if (!n && !e)
    return null;
  let a = !!e && (r || o || !n);
  if (a) {
    if (t.someProp("transformPastedText", (d) => {
      e = d(e, o || r, t);
    }), o)
      return l = new _(R.from(t.state.schema.text(e.replace(/\r\n?/g, `
`))), 0, 0), t.someProp("transformPasted", (d) => {
        l = d(l, t, !0);
      }), l;
    let f = t.someProp("clipboardTextParser", (d) => d(e, i, r, t));
    if (f)
      l = f;
    else {
      let d = i.marks(), { schema: h } = t.state, p = _i.fromSchema(h);
      s = document.createElement("div"), e.split(/(?:\r\n?|\n)+/).forEach((k) => {
        let w = s.appendChild(document.createElement("p"));
        k && w.appendChild(p.serializeNode(h.text(k, d)));
      });
    }
  } else
    t.someProp("transformPastedHTML", (f) => {
      n = f(n, t);
    }), s = mS(n), ls && gS(s);
  let u = s && s.querySelector("[data-pm-slice]"), c = u && /^(\d+) (\d+)(?: -(\d+))? (.*)/.exec(u.getAttribute("data-pm-slice") || "");
  if (c && c[3])
    for (let f = +c[3]; f > 0; f--) {
      let d = s.firstChild;
      for (; d && d.nodeType != 1; )
        d = d.nextSibling;
      if (!d)
        break;
      s = d;
    }
  if (l || (l = (t.someProp("clipboardParser") || t.someProp("domParser") || Fu.fromSchema(t.state.schema)).parseSlice(s, {
    preserveWhitespace: !!(a || c),
    context: i,
    ruleFromNode(d) {
      return d.nodeName == "BR" && !d.nextSibling && d.parentNode && !dS.test(d.parentNode.nodeName) ? { ignore: !0 } : null;
    }
  })), c)
    l = yS(Zd(l, +c[1], +c[2]), c[4]);
  else if (l = _.maxOpen(hS(l.content, i), !0), l.openStart || l.openEnd) {
    let f = 0, d = 0;
    for (let h = l.content.firstChild; f < l.openStart && !h.type.spec.isolating; f++, h = h.firstChild)
      ;
    for (let h = l.content.lastChild; d < l.openEnd && !h.type.spec.isolating; d++, h = h.lastChild)
      ;
    l = Zd(l, f, d);
  }
  return t.someProp("transformPasted", (f) => {
    l = f(l, t, a);
  }), l;
}
const dS = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var)$/i;
function hS(t, e) {
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
      if (u = s.length && o.length && rg(a, o, l, s[s.length - 1], 0))
        s[s.length - 1] = u;
      else {
        s.length && (s[s.length - 1] = ig(s[s.length - 1], o.length));
        let c = ng(l, a);
        s.push(c), i = i.matchType(c.type), o = a;
      }
    }), s)
      return R.from(s);
  }
  return t;
}
function ng(t, e, n = 0) {
  for (let r = e.length - 1; r >= n; r--)
    t = e[r].create(null, R.from(t));
  return t;
}
function rg(t, e, n, r, i) {
  if (i < t.length && i < e.length && t[i] == e[i]) {
    let o = rg(t, e, n, r.lastChild, i + 1);
    if (o)
      return r.copy(r.content.replaceChild(r.childCount - 1, o));
    if (r.contentMatchAt(r.childCount).matchType(i == t.length - 1 ? n.type : t[i + 1]))
      return r.copy(r.content.append(R.from(ng(n, t, i + 1))));
  }
}
function ig(t, e) {
  if (e == 0)
    return t;
  let n = t.content.replaceChild(t.childCount - 1, ig(t.lastChild, e - 1)), r = t.contentMatchAt(t.childCount).fillBefore(R.empty, !0);
  return t.copy(n.append(r));
}
function cu(t, e, n, r, i, o) {
  let s = e < 0 ? t.firstChild : t.lastChild, l = s.content;
  return t.childCount > 1 && (o = 0), i < r - 1 && (l = cu(l, e, n, r, i + 1, o)), i >= n && (l = e < 0 ? s.contentMatchAt(0).fillBefore(l, o <= i).append(l) : l.append(s.contentMatchAt(s.childCount).fillBefore(R.empty, !0))), t.replaceChild(e < 0 ? 0 : t.childCount - 1, s.copy(l));
}
function Zd(t, e, n) {
  return e < t.openStart && (t = new _(cu(t.content, -1, e, t.openStart, 0, t.openEnd), e, t.openEnd)), n < t.openEnd && (t = new _(cu(t.content, 1, n, t.openEnd, 0, 0), t.openStart, n)), t;
}
const og = {
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
let eh = null;
function sg() {
  return eh || (eh = document.implementation.createHTMLDocument("title"));
}
let aa = null;
function pS(t) {
  let e = window.trustedTypes;
  return e ? (aa || (aa = e.defaultPolicy || e.createPolicy("ProseMirrorClipboard", { createHTML: (n) => n })), aa.createHTML(t)) : t;
}
function mS(t) {
  let e = /^(\s*<meta [^>]*>)*/.exec(t);
  e && (t = t.slice(e[0].length));
  let n = sg().createElement("div"), r = /<([a-z][^>\s]+)/i.exec(t), i;
  if ((i = r && og[r[1].toLowerCase()]) && (t = i.map((o) => "<" + o + ">").join("") + t + i.map((o) => "</" + o + ">").reverse().join("")), n.innerHTML = pS(t), i)
    for (let o = 0; o < i.length; o++)
      n = n.querySelector(i[o]) || n;
  return n;
}
function gS(t) {
  let e = t.querySelectorAll(Qe ? "span:not([class]):not([style])" : "span.Apple-converted-space");
  for (let n = 0; n < e.length; n++) {
    let r = e[n];
    r.childNodes.length == 1 && r.textContent == " " && r.parentNode && r.parentNode.replaceChild(t.ownerDocument.createTextNode(" "), r);
  }
}
function yS(t, e) {
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
    i = R.from(a.create(r[l + 1], i)), o++, s++;
  }
  return new _(i, o, s);
}
const lt = {}, at = {}, kS = { touchstart: !0, touchmove: !0 };
class bS {
  constructor() {
    this.shiftKey = !1, this.mouseDown = null, this.lastKeyCode = null, this.lastKeyCodeTime = 0, this.lastClick = { time: 0, x: 0, y: 0, type: "", button: 0 }, this.lastSelectionOrigin = null, this.lastSelectionTime = 0, this.lastIOSEnter = 0, this.lastIOSEnterFallbackTimeout = -1, this.lastFocus = 0, this.lastTouch = 0, this.lastChromeDelete = 0, this.composing = !1, this.compositionNode = null, this.composingTimeout = -1, this.compositionNodes = [], this.compositionEndedAt = -2e8, this.compositionID = 1, this.badSafariComposition = !1, this.compositionPendingChanges = 0, this.domChangeCount = 0, this.eventHandlers = /* @__PURE__ */ Object.create(null), this.hideSelectionGuard = null;
  }
}
function wS(t) {
  for (let e in lt) {
    let n = lt[e];
    t.dom.addEventListener(e, t.input.eventHandlers[e] = (r) => {
      CS(t, r) && !Zu(t, r) && (t.editable || !(r.type in at)) && n(t, r);
    }, kS[e] ? { passive: !0 } : void 0);
  }
  tt && t.dom.addEventListener("input", () => null), fu(t);
}
function Gn(t, e) {
  t.input.lastSelectionOrigin = e, t.input.lastSelectionTime = Date.now();
}
function xS(t) {
  t.domObserver.stop();
  for (let e in t.input.eventHandlers)
    t.dom.removeEventListener(e, t.input.eventHandlers[e]);
  clearTimeout(t.input.composingTimeout), clearTimeout(t.input.lastIOSEnterFallbackTimeout);
}
function fu(t) {
  t.someProp("handleDOMEvents", (e) => {
    for (let n in e)
      t.input.eventHandlers[n] || t.dom.addEventListener(n, t.input.eventHandlers[n] = (r) => Zu(t, r));
  });
}
function Zu(t, e) {
  return t.someProp("handleDOMEvents", (n) => {
    let r = n[e.type];
    return r ? r(t, e) || e.defaultPrevented : !1;
  });
}
function CS(t, e) {
  if (!e.bubbles)
    return !0;
  if (e.defaultPrevented)
    return !1;
  for (let n = e.target; n != t.dom; n = n.parentNode)
    if (!n || n.nodeType == 11 || n.pmViewDesc && n.pmViewDesc.stopEvent(e))
      return !1;
  return !0;
}
function SS(t, e) {
  !Zu(t, e) && lt[e.type] && (t.editable || !(e.type in at)) && lt[e.type](t, e);
}
at.keydown = (t, e) => {
  let n = e;
  if (t.input.shiftKey = n.keyCode == 16 || n.shiftKey, !ag(t, n) && (t.input.lastKeyCode = n.keyCode, t.input.lastKeyCodeTime = Date.now(), !(Mn && Qe && n.keyCode == 13)))
    if (n.keyCode != 229 && t.domObserver.forceFlush(), Pi && n.keyCode == 13 && !n.ctrlKey && !n.altKey && !n.metaKey) {
      let r = Date.now();
      t.input.lastIOSEnter = r, t.input.lastIOSEnterFallbackTimeout = setTimeout(() => {
        t.input.lastIOSEnter == r && (t.someProp("handleKeyDown", (i) => i(t, pr(13, "Enter"))), t.input.lastIOSEnter = 0);
      }, 200);
    } else t.someProp("handleKeyDown", (r) => r(t, n)) || fS(t, n) ? n.preventDefault() : Gn(t, "key");
};
at.keyup = (t, e) => {
  e.keyCode == 16 && (t.input.shiftKey = !1);
};
at.keypress = (t, e) => {
  let n = e;
  if (ag(t, n) || !n.charCode || n.ctrlKey && !n.altKey || Pt && n.metaKey)
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
function El(t) {
  return { left: t.clientX, top: t.clientY };
}
function MS(t, e) {
  let n = e.x - t.clientX, r = e.y - t.clientY;
  return n * n + r * r < 100;
}
function ec(t, e, n, r, i) {
  if (r == -1)
    return !1;
  let o = t.state.doc.resolve(r);
  for (let s = o.depth + 1; s > 0; s--)
    if (t.someProp(e, (l) => s > o.depth ? l(t, n, o.nodeAfter, o.before(s), i, !0) : l(t, n, o.node(s), o.before(s), i, !1)))
      return !0;
  return !1;
}
function ui(t, e, n) {
  if (t.focused || t.focus(), t.state.selection.eq(e))
    return;
  let r = t.state.tr.setSelection(e);
  r.setMeta("pointer", !0), t.dispatch(r);
}
function vS(t, e) {
  if (e == -1)
    return !1;
  let n = t.state.doc.resolve(e), r = n.nodeAfter;
  return r && r.isAtom && re.isSelectable(r) ? (ui(t, new re(n)), !0) : !1;
}
function TS(t, e) {
  if (e == -1)
    return !1;
  let n = t.state.selection, r, i;
  n instanceof re && (r = n.node);
  let o = t.state.doc.resolve(e);
  for (let s = o.depth + 1; s > 0; s--) {
    let l = s > o.depth ? o.nodeAfter : o.node(s);
    if (re.isSelectable(l)) {
      r && n.$from.depth > 0 && s >= n.$from.depth && o.before(n.$from.depth + 1) == n.$from.pos ? i = o.before(n.$from.depth) : i = o.before(s);
      break;
    }
  }
  return i != null ? (ui(t, re.create(t.state.doc, i)), !0) : !1;
}
function NS(t, e, n, r, i) {
  return ec(t, "handleClickOn", e, n, r) || t.someProp("handleClick", (o) => o(t, e, r)) || (i ? TS(t, n) : vS(t, n));
}
function IS(t, e, n, r) {
  return ec(t, "handleDoubleClickOn", e, n, r) || t.someProp("handleDoubleClick", (i) => i(t, e, r));
}
function AS(t, e, n, r) {
  return ec(t, "handleTripleClickOn", e, n, r) || t.someProp("handleTripleClick", (i) => i(t, e, r)) || ES(t, n, r);
}
function ES(t, e, n) {
  if (n.button != 0)
    return !1;
  let r = t.state.doc;
  if (e == -1)
    return r.inlineContent ? (ui(t, Z.create(r, 0, r.content.size)), !0) : !1;
  let i = r.resolve(e);
  for (let o = i.depth + 1; o > 0; o--) {
    let s = o > i.depth ? i.nodeAfter : i.node(o), l = i.before(o);
    if (s.inlineContent)
      ui(t, Z.create(r, l + 1, l + 1 + s.content.size));
    else if (re.isSelectable(s))
      ui(t, re.create(r, l));
    else
      continue;
    return !0;
  }
}
function tc(t) {
  return ll(t);
}
const lg = Pt ? "metaKey" : "ctrlKey";
lt.mousedown = (t, e) => {
  let n = e;
  t.input.shiftKey = n.shiftKey;
  let r = tc(t), i = Date.now(), o = "singleClick";
  i - t.input.lastClick.time < 500 && MS(n, t.input.lastClick) && !n[lg] && t.input.lastClick.button == n.button && (t.input.lastClick.type == "singleClick" ? o = "doubleClick" : t.input.lastClick.type == "doubleClick" && (o = "tripleClick")), t.input.lastClick = { time: i, x: n.clientX, y: n.clientY, type: o, button: n.button };
  let s = t.posAtCoords(El(n));
  s && (o == "singleClick" ? (t.input.mouseDown && t.input.mouseDown.done(), t.input.mouseDown = new OS(t, s, n, !!r)) : (o == "doubleClick" ? IS : AS)(t, s.pos, s.inside, n) ? n.preventDefault() : Gn(t, "pointer"));
};
class OS {
  constructor(e, n, r, i) {
    this.view = e, this.pos = n, this.event = r, this.flushed = i, this.delayedSelectionSync = !1, this.mightDrag = null, this.startDoc = e.state.doc, this.selectNode = !!r[lg], this.allowDefault = r.shiftKey;
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
    r.button == 0 && (o.type.spec.draggable && o.type.spec.selectable !== !1 || u instanceof re && u.from <= s && u.to > s) && (this.mightDrag = {
      node: o,
      pos: s,
      addAttr: !!(this.target && !this.target.draggable),
      setUneditable: !!(this.target && Ft && !this.target.hasAttribute("contentEditable"))
    }), this.target && this.mightDrag && (this.mightDrag.addAttr || this.mightDrag.setUneditable) && (this.view.domObserver.stop(), this.mightDrag.addAttr && (this.target.draggable = !0), this.mightDrag.setUneditable && setTimeout(() => {
      this.view.input.mouseDown == this && this.target.setAttribute("contentEditable", "false");
    }, 20), this.view.domObserver.start()), e.root.addEventListener("mouseup", this.up = this.up.bind(this)), e.root.addEventListener("mousemove", this.move = this.move.bind(this)), Gn(e, "pointer");
  }
  done() {
    this.view.root.removeEventListener("mouseup", this.up), this.view.root.removeEventListener("mousemove", this.move), this.mightDrag && this.target && (this.view.domObserver.stop(), this.mightDrag.addAttr && this.target.removeAttribute("draggable"), this.mightDrag.setUneditable && this.target.removeAttribute("contentEditable"), this.view.domObserver.start()), this.delayedSelectionSync && setTimeout(() => Tn(this.view)), this.view.input.mouseDown = null;
  }
  up(e) {
    if (this.done(), !this.view.dom.contains(e.target))
      return;
    let n = this.pos;
    this.view.state.doc != this.startDoc && (n = this.view.posAtCoords(El(e))), this.updateAllowDefault(e), this.allowDefault || !n ? Gn(this.view, "pointer") : NS(this.view, n.pos, n.inside, e, this.selectNode) ? e.preventDefault() : e.button == 0 && (this.flushed || // Safari ignores clicks on draggable elements
    tt && this.mightDrag && !this.mightDrag.node.isAtom || // Chrome will sometimes treat a node selection as a
    // cursor, but still report that the node is selected
    // when asked through getSelection. You'll then get a
    // situation where clicking at the point where that
    // (hidden) cursor is doesn't change the selection, and
    // thus doesn't get a reaction from ProseMirror. This
    // works around that.
    Qe && !this.view.state.selection.visible && Math.min(Math.abs(n.pos - this.view.state.selection.from), Math.abs(n.pos - this.view.state.selection.to)) <= 2) ? (ui(this.view, oe.near(this.view.state.doc.resolve(n.pos))), e.preventDefault()) : Gn(this.view, "pointer");
  }
  move(e) {
    this.updateAllowDefault(e), Gn(this.view, "pointer"), e.buttons == 0 && this.done();
  }
  updateAllowDefault(e) {
    !this.allowDefault && (Math.abs(this.event.x - e.clientX) > 4 || Math.abs(this.event.y - e.clientY) > 4) && (this.allowDefault = !0);
  }
}
lt.touchstart = (t) => {
  t.input.lastTouch = Date.now(), tc(t), Gn(t, "pointer");
};
lt.touchmove = (t) => {
  t.input.lastTouch = Date.now(), Gn(t, "pointer");
};
lt.contextmenu = (t) => tc(t);
function ag(t, e) {
  return t.composing ? !0 : tt && Math.abs(e.timeStamp - t.input.compositionEndedAt) < 500 ? (t.input.compositionEndedAt = -2e8, !0) : !1;
}
const DS = Mn ? 5e3 : -1;
at.compositionstart = at.compositionupdate = (t) => {
  if (!t.composing) {
    t.domObserver.flush();
    let { state: e } = t, n = e.selection.$to;
    if (e.selection instanceof Z && (e.storedMarks || !n.textOffset && n.parentOffset && n.nodeBefore.marks.some((r) => r.type.spec.inclusive === !1) || Qe && $m && RS(t)))
      t.markCursor = t.state.storedMarks || n.marks(), ll(t, !0), t.markCursor = null;
    else if (ll(t, !e.selection.empty), Ft && e.selection.empty && n.parentOffset && !n.textOffset && n.nodeBefore.marks.length) {
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
  ug(t, DS);
};
function RS(t) {
  let { focusNode: e, focusOffset: n } = t.domSelectionRange();
  if (!e || e.nodeType != 1 || n >= e.childNodes.length)
    return !1;
  let r = e.childNodes[n];
  return r.nodeType == 1 && r.contentEditable == "false";
}
at.compositionend = (t, e) => {
  t.composing && (t.input.composing = !1, t.input.compositionEndedAt = e.timeStamp, t.input.compositionPendingChanges = t.domObserver.pendingRecords().length ? t.input.compositionID : 0, t.input.compositionNode = null, t.input.badSafariComposition ? t.domObserver.forceFlush() : t.input.compositionPendingChanges && Promise.resolve().then(() => t.domObserver.flush()), t.input.compositionID++, ug(t, 20));
};
function ug(t, e) {
  clearTimeout(t.input.composingTimeout), e > -1 && (t.input.composingTimeout = setTimeout(() => ll(t), e));
}
function cg(t) {
  for (t.composing && (t.input.composing = !1, t.input.compositionEndedAt = PS()); t.input.compositionNodes.length > 0; )
    t.input.compositionNodes.pop().markParentsDirty();
}
function LS(t) {
  let e = t.domSelectionRange();
  if (!e.focusNode)
    return null;
  let n = TC(e.focusNode, e.focusOffset), r = NC(e.focusNode, e.focusOffset);
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
function PS() {
  let t = document.createEvent("Event");
  return t.initEvent("event", !0, !0), t.timeStamp;
}
function ll(t, e = !1) {
  if (!(Mn && t.domObserver.flushingSoon >= 0)) {
    if (t.domObserver.forceFlush(), cg(t), e || t.docView && t.docView.dirty) {
      let n = Yu(t), r = t.state.selection;
      return n && !n.eq(r) ? t.dispatch(t.state.tr.setSelection(n)) : (t.markCursor || e) && !r.$from.node(r.$from.sharedDepth(r.to)).inlineContent ? t.dispatch(t.state.tr.deleteSelection()) : t.updateState(t.state), !0;
    }
    return !1;
  }
}
function zS(t, e) {
  if (!t.dom.parentNode)
    return;
  let n = t.dom.parentNode.appendChild(document.createElement("div"));
  n.appendChild(e), n.style.cssText = "position: fixed; left: -10000px; top: 10px";
  let r = getSelection(), i = document.createRange();
  i.selectNodeContents(e), t.dom.blur(), r.removeAllRanges(), r.addRange(i), setTimeout(() => {
    n.parentNode && n.parentNode.removeChild(n), t.focus();
  }, 50);
}
const Oo = yt && Qn < 15 || Pi && OC < 604;
lt.copy = at.cut = (t, e) => {
  let n = e, r = t.state.selection, i = n.type == "cut";
  if (r.empty)
    return;
  let o = Oo ? null : n.clipboardData, s = r.content(), { dom: l, text: a } = Xu(t, s);
  o ? (n.preventDefault(), o.clearData(), o.setData("text/html", l.innerHTML), o.setData("text/plain", a)) : zS(t, l), i && t.dispatch(t.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
};
function BS(t) {
  return t.openStart == 0 && t.openEnd == 0 && t.content.childCount == 1 ? t.content.firstChild : null;
}
function FS(t, e) {
  if (!t.dom.parentNode)
    return;
  let n = t.input.shiftKey || t.state.selection.$from.parent.type.spec.code, r = t.dom.parentNode.appendChild(document.createElement(n ? "textarea" : "div"));
  n || (r.contentEditable = "true"), r.style.cssText = "position: fixed; left: -10000px; top: 10px", r.focus();
  let i = t.input.shiftKey && t.input.lastKeyCode != 45;
  setTimeout(() => {
    t.focus(), r.parentNode && r.parentNode.removeChild(r), n ? Do(t, r.value, null, i, e) : Do(t, r.textContent, r.innerHTML, i, e);
  }, 50);
}
function Do(t, e, n, r, i) {
  let o = tg(t, e, n, r, t.state.selection.$from);
  if (t.someProp("handlePaste", (a) => a(t, i, o || _.empty)))
    return !0;
  if (!o)
    return !1;
  let s = BS(o), l = s ? t.state.tr.replaceSelectionWith(s, r) : t.state.tr.replaceSelection(o);
  return t.dispatch(l.scrollIntoView().setMeta("paste", !0).setMeta("uiEvent", "paste")), !0;
}
function fg(t) {
  let e = t.getData("text/plain") || t.getData("Text");
  if (e)
    return e;
  let n = t.getData("text/uri-list");
  return n ? n.replace(/\r?\n/g, " ") : "";
}
at.paste = (t, e) => {
  let n = e;
  if (t.composing && !Mn)
    return;
  let r = Oo ? null : n.clipboardData, i = t.input.shiftKey && t.input.lastKeyCode != 45;
  r && Do(t, fg(r), r.getData("text/html"), i, n) ? n.preventDefault() : FS(t, n);
};
class dg {
  constructor(e, n, r) {
    this.slice = e, this.move = n, this.node = r;
  }
}
const $S = Pt ? "altKey" : "ctrlKey";
function hg(t, e) {
  let n;
  return t.someProp("dragCopies", (r) => {
    n = n || r(e);
  }), n != null ? !n : !e[$S];
}
lt.dragstart = (t, e) => {
  let n = e, r = t.input.mouseDown;
  if (r && r.done(), !n.dataTransfer)
    return;
  let i = t.state.selection, o = i.empty ? null : t.posAtCoords(El(n)), s;
  if (!(o && o.pos >= i.from && o.pos <= (i instanceof re ? i.to - 1 : i.to))) {
    if (r && r.mightDrag)
      s = re.create(t.state.doc, r.mightDrag.pos);
    else if (n.target && n.target.nodeType == 1) {
      let f = t.docView.nearestDesc(n.target, !0);
      f && f.node.type.spec.draggable && f != t.docView && (s = re.create(t.state.doc, f.posBefore));
    }
  }
  let l = (s || t.state.selection).content(), { dom: a, text: u, slice: c } = Xu(t, l);
  (!n.dataTransfer.files.length || !Qe || Fm > 120) && n.dataTransfer.clearData(), n.dataTransfer.setData(Oo ? "Text" : "text/html", a.innerHTML), n.dataTransfer.effectAllowed = "copyMove", Oo || n.dataTransfer.setData("text/plain", u), t.dragging = new dg(c, hg(t, n), s);
};
lt.dragend = (t) => {
  let e = t.dragging;
  window.setTimeout(() => {
    t.dragging == e && (t.dragging = null);
  }, 50);
};
at.dragover = at.dragenter = (t, e) => e.preventDefault();
at.drop = (t, e) => {
  try {
    _S(t, e, t.dragging);
  } finally {
    t.dragging = null;
  }
};
function _S(t, e, n) {
  if (!e.dataTransfer)
    return;
  let r = t.posAtCoords(El(e));
  if (!r)
    return;
  let i = t.state.doc.resolve(r.pos), o = n && n.slice;
  o ? t.someProp("transformPasted", (h) => {
    o = h(o, t, !1);
  }) : o = tg(t, fg(e.dataTransfer), Oo ? null : e.dataTransfer.getData("text/html"), !1, i);
  let s = !!(n && hg(t, e));
  if (t.someProp("handleDrop", (h) => h(t, e, o || _.empty, s))) {
    e.preventDefault();
    return;
  }
  if (!o)
    return;
  e.preventDefault();
  let l = o ? Sx(t.state.doc, i.pos, o) : i.pos;
  l == null && (l = i.pos);
  let a = t.state.tr;
  if (s) {
    let { node: h } = n;
    h ? h.replace(a) : a.deleteSelection();
  }
  let u = a.mapping.map(l), c = o.openStart == 0 && o.openEnd == 0 && o.content.childCount == 1, f = a.doc;
  if (c ? a.replaceRangeWith(u, u, o.content.firstChild) : a.replaceRange(u, u, o), a.doc.eq(f))
    return;
  let d = a.doc.resolve(u);
  if (c && re.isSelectable(o.content.firstChild) && d.nodeAfter && d.nodeAfter.sameMarkup(o.content.firstChild))
    a.setSelection(new re(d));
  else {
    let h = a.mapping.map(l);
    a.mapping.maps[a.mapping.maps.length - 1].forEach((p, k, w, b) => h = b), a.setSelection(Qu(t, d, a.doc.resolve(h)));
  }
  t.focus(), t.dispatch(a.setMeta("uiEvent", "drop"));
}
lt.focus = (t) => {
  t.input.lastFocus = Date.now(), t.focused || (t.domObserver.stop(), t.dom.classList.add("ProseMirror-focused"), t.domObserver.start(), t.focused = !0, setTimeout(() => {
    t.docView && t.hasFocus() && !t.domObserver.currentSelection.eq(t.domSelectionRange()) && Tn(t);
  }, 20));
};
lt.blur = (t, e) => {
  let n = e;
  t.focused && (t.domObserver.stop(), t.dom.classList.remove("ProseMirror-focused"), t.domObserver.start(), n.relatedTarget && t.dom.contains(n.relatedTarget) && t.domObserver.currentSelection.clear(), t.focused = !1);
};
lt.beforeinput = (t, e) => {
  if (Qe && Mn && e.inputType == "deleteContentBackward") {
    t.domObserver.flushSoon();
    let { domChangeCount: r } = t.input;
    setTimeout(() => {
      if (t.input.domChangeCount != r || (t.dom.blur(), t.focus(), t.someProp("handleKeyDown", (o) => o(t, pr(8, "Backspace")))))
        return;
      let { $cursor: i } = t.state.selection;
      i && i.pos > 0 && t.dispatch(t.state.tr.delete(i.pos - 1, i.pos).scrollIntoView());
    }, 50);
  }
};
for (let t in at)
  lt[t] = at[t];
function Ro(t, e) {
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
class al {
  constructor(e, n) {
    this.toDOM = e, this.spec = n || Ir, this.side = this.spec.side || 0;
  }
  map(e, n, r, i) {
    let { pos: o, deleted: s } = e.mapResult(n.from + i, this.side < 0 ? -1 : 1);
    return s ? null : new ze(o - r, o - r, this);
  }
  valid() {
    return !0;
  }
  eq(e) {
    return this == e || e instanceof al && (this.spec.key && this.spec.key == e.spec.key || this.toDOM == e.toDOM && Ro(this.spec, e.spec));
  }
  destroy(e) {
    this.spec.destroy && this.spec.destroy(e);
  }
}
class Zn {
  constructor(e, n) {
    this.attrs = e, this.spec = n || Ir;
  }
  map(e, n, r, i) {
    let o = e.map(n.from + i, this.spec.inclusiveStart ? -1 : 1) - r, s = e.map(n.to + i, this.spec.inclusiveEnd ? 1 : -1) - r;
    return o >= s ? null : new ze(o, s, this);
  }
  valid(e, n) {
    return n.from < n.to;
  }
  eq(e) {
    return this == e || e instanceof Zn && Ro(this.attrs, e.attrs) && Ro(this.spec, e.spec);
  }
  static is(e) {
    return e.type instanceof Zn;
  }
  destroy() {
  }
}
class nc {
  constructor(e, n) {
    this.attrs = e, this.spec = n || Ir;
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
    return this == e || e instanceof nc && Ro(this.attrs, e.attrs) && Ro(this.spec, e.spec);
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
    return new ze(e, e, new al(n, r));
  }
  /**
  Creates an inline decoration, which adds the given attributes to
  each inline node between `from` and `to`.
  */
  static inline(e, n, r, i) {
    return new ze(e, n, new Zn(r, i));
  }
  /**
  Creates a node decoration. `from` and `to` should point precisely
  before and after a node in the document. That node, and only that
  node, will receive the given attributes.
  */
  static node(e, n, r, i) {
    return new ze(e, n, new nc(r, i));
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
    return this.type instanceof Zn;
  }
  /**
  @internal
  */
  get widget() {
    return this.type instanceof al;
  }
}
const ti = [], Ir = {};
class Me {
  /**
  @internal
  */
  constructor(e, n) {
    this.local = e.length ? e : ti, this.children = n.length ? n : ti;
  }
  /**
  Create a set of decorations, using the structure of the given
  document. This will consume (modify) the `decorations` array, so
  you must make a copy if you want need to preserve that.
  */
  static create(e, n) {
    return n.length ? ul(n, e, 0, Ir) : Ze;
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
    return this == Ze || e.maps.length == 0 ? this : this.mapInner(e, n, 0, 0, r || Ir);
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
    return this.children.length ? VS(this.children, s || [], e, n, r, i, o) : s ? new Me(s.sort(Ar), ti) : Ze;
  }
  /**
  Add the given array of decorations to the ones in the set,
  producing a new set. Consumes the `decorations` array. Needs
  access to the current document to create the appropriate tree
  structure.
  */
  add(e, n) {
    return n.length ? this == Ze ? Me.create(e, n) : this.addInner(e, n, 0) : this;
  }
  addInner(e, n, r) {
    let i, o = 0;
    e.forEach((l, a) => {
      let u = a + r, c;
      if (c = mg(n, l, u)) {
        for (i || (i = this.children.slice()); o < i.length && i[o] < a; )
          o += 3;
        i[o] == a ? i[o + 2] = i[o + 2].addInner(l, c, u + 1) : i.splice(o, 0, a, a + l.nodeSize, ul(c, l, u + 1, Ir)), o += 3;
      }
    });
    let s = pg(o ? gg(n) : n, -r);
    for (let l = 0; l < s.length; l++)
      s[l].type.valid(e, s[l]) || s.splice(l--, 1);
    return new Me(s.length ? this.local.concat(s).sort(Ar) : this.local, i || this.children);
  }
  /**
  Create a new set that contains the decorations in this set, minus
  the ones in the given array.
  */
  remove(e) {
    return e.length == 0 || this == Ze ? this : this.removeInner(e, 0);
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
      u != Ze ? r[o + 2] = u : (r.splice(o, 3), o -= 3);
    }
    if (i.length) {
      for (let o = 0, s; o < e.length; o++)
        if (s = e[o])
          for (let l = 0; l < i.length; l++)
            i[l].eq(s, n) && (i == this.local && (i = this.local.slice()), i.splice(l--, 1));
    }
    return r == this.children && i == this.local ? this : i.length || r.length ? new Me(i, r) : Ze;
  }
  forChild(e, n) {
    if (this == Ze)
      return this;
    if (n.isLeaf)
      return Me.empty;
    let r, i;
    for (let l = 0; l < this.children.length; l += 3)
      if (this.children[l] >= e) {
        this.children[l] == e && (r = this.children[l + 2]);
        break;
      }
    let o = e + 1, s = o + n.content.size;
    for (let l = 0; l < this.local.length; l++) {
      let a = this.local[l];
      if (a.from < s && a.to > o && a.type instanceof Zn) {
        let u = Math.max(o, a.from) - o, c = Math.min(s, a.to) - o;
        u < c && (i || (i = [])).push(a.copy(u, c));
      }
    }
    if (i) {
      let l = new Me(i.sort(Ar), ti);
      return r ? new Hn([l, r]) : l;
    }
    return r || Ze;
  }
  /**
  @internal
  */
  eq(e) {
    if (this == e)
      return !0;
    if (!(e instanceof Me) || this.local.length != e.local.length || this.children.length != e.children.length)
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
    return rc(this.localsInner(e));
  }
  /**
  @internal
  */
  localsInner(e) {
    if (this == Ze)
      return ti;
    if (e.inlineContent || !this.local.some(Zn.is))
      return this.local;
    let n = [];
    for (let r = 0; r < this.local.length; r++)
      this.local[r].type instanceof Zn || n.push(this.local[r]);
    return n;
  }
  forEachSet(e) {
    e(this);
  }
}
Me.empty = new Me([], []);
Me.removeOverlap = rc;
const Ze = Me.empty;
class Hn {
  constructor(e) {
    this.members = e;
  }
  map(e, n) {
    const r = this.members.map((i) => i.map(e, n, Ir));
    return Hn.from(r);
  }
  forChild(e, n) {
    if (n.isLeaf)
      return Me.empty;
    let r = [];
    for (let i = 0; i < this.members.length; i++) {
      let o = this.members[i].forChild(e, n);
      o != Ze && (o instanceof Hn ? r = r.concat(o.members) : r.push(o));
    }
    return Hn.from(r);
  }
  eq(e) {
    if (!(e instanceof Hn) || e.members.length != this.members.length)
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
    return n ? rc(r ? n : n.sort(Ar)) : ti;
  }
  // Create a group for the given array of decoration sets, or return
  // a single set when possible.
  static from(e) {
    switch (e.length) {
      case 0:
        return Ze;
      case 1:
        return e[0];
      default:
        return new Hn(e.every((n) => n instanceof Me) ? e : e.reduce((n, r) => n.concat(r instanceof Me ? r : r.members), []));
    }
  }
  forEachSet(e) {
    for (let n = 0; n < this.members.length; n++)
      this.members[n].forEachSet(e);
  }
}
function VS(t, e, n, r, i, o, s) {
  let l = t.slice();
  for (let u = 0, c = o; u < n.maps.length; u++) {
    let f = 0;
    n.maps[u].forEach((d, h, p, k) => {
      let w = k - p - (h - d);
      for (let b = 0; b < l.length; b += 3) {
        let L = l[b + 1];
        if (L < 0 || d > L + c - f)
          continue;
        let E = l[b] + c - f;
        h >= E ? l[b + 1] = d <= E ? -2 : -1 : d >= c && w && (l[b] += w, l[b + 1] += w);
      }
      f += w;
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
      let d = n.map(t[u + 1] + o, -1), h = d - i, { index: p, offset: k } = r.content.findIndex(f), w = r.maybeChild(p);
      if (w && k == f && k + w.nodeSize == h) {
        let b = l[u + 2].mapInner(n, w, c + 1, t[u] + o + 1, s);
        b != Ze ? (l[u] = f, l[u + 1] = h, l[u + 2] = b) : (l[u + 1] = -2, a = !0);
      } else
        a = !0;
    }
  if (a) {
    let u = HS(l, t, e, n, i, o, s), c = ul(u, r, 0, s);
    e = c.local;
    for (let f = 0; f < l.length; f += 3)
      l[f + 1] < 0 && (l.splice(f, 3), f -= 3);
    for (let f = 0, d = 0; f < c.children.length; f += 3) {
      let h = c.children[f];
      for (; d < l.length && l[d] < h; )
        d += 3;
      l.splice(d, 0, c.children[f], c.children[f + 1], c.children[f + 2]);
    }
  }
  return new Me(e.sort(Ar), l);
}
function pg(t, e) {
  if (!e || !t.length)
    return t;
  let n = [];
  for (let r = 0; r < t.length; r++) {
    let i = t[r];
    n.push(new ze(i.from + e, i.to + e, i.type));
  }
  return n;
}
function HS(t, e, n, r, i, o, s) {
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
function mg(t, e, n) {
  if (e.isLeaf)
    return null;
  let r = n + e.nodeSize, i = null;
  for (let o = 0, s; o < t.length; o++)
    (s = t[o]) && s.from > n && s.to < r && ((i || (i = [])).push(s), t[o] = null);
  return i;
}
function gg(t) {
  let e = [];
  for (let n = 0; n < t.length; n++)
    t[n] != null && e.push(t[n]);
  return e;
}
function ul(t, e, n, r) {
  let i = [], o = !1;
  e.forEach((l, a) => {
    let u = mg(t, l, a + n);
    if (u) {
      o = !0;
      let c = ul(u, l, n + a + 1, r);
      c != Ze && i.push(a, a + l.nodeSize, c);
    }
  });
  let s = pg(o ? gg(t) : t, -n).sort(Ar);
  for (let l = 0; l < s.length; l++)
    s[l].type.valid(e, s[l]) || (r.onRemove && r.onRemove(s[l].spec), s.splice(l--, 1));
  return s.length || i.length ? new Me(s, i) : Ze;
}
function Ar(t, e) {
  return t.from - e.from || t.to - e.to;
}
function rc(t) {
  let e = t;
  for (let n = 0; n < e.length - 1; n++) {
    let r = e[n];
    if (r.from != r.to)
      for (let i = n + 1; i < e.length; i++) {
        let o = e[i];
        if (o.from == r.from) {
          o.to != r.to && (e == t && (e = t.slice()), e[i] = o.copy(o.from, r.to), th(e, i + 1, o.copy(r.to, o.to)));
          continue;
        } else {
          o.from < r.to && (e == t && (e = t.slice()), e[n] = r.copy(r.from, o.from), th(e, i, r.copy(o.from, r.to)));
          break;
        }
      }
  }
  return e;
}
function th(t, e, n) {
  for (; e < t.length && Ar(n, t[e]) > 0; )
    e++;
  t.splice(e, 0, n);
}
function ua(t) {
  let e = [];
  return t.someProp("decorations", (n) => {
    let r = n(t.state);
    r && r != Ze && e.push(r);
  }), t.cursorWrapper && e.push(Me.create(t.state.doc, [t.cursorWrapper.deco])), Hn.from(e);
}
const jS = {
  childList: !0,
  characterData: !0,
  characterDataOldValue: !0,
  attributes: !0,
  attributeOldValue: !0,
  subtree: !0
}, WS = yt && Qn <= 11;
class qS {
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
class KS {
  constructor(e, n) {
    this.view = e, this.handleDOMChange = n, this.queue = [], this.flushingSoon = -1, this.observer = null, this.currentSelection = new qS(), this.onCharData = null, this.suppressingSelectionUpdates = !1, this.lastChangedTextNode = null, this.observer = window.MutationObserver && new window.MutationObserver((r) => {
      for (let i = 0; i < r.length; i++)
        this.queue.push(r[i]);
      yt && Qn <= 11 && r.some((i) => i.type == "childList" && i.removedNodes.length || i.type == "characterData" && i.oldValue.length > i.target.nodeValue.length) ? this.flushSoon() : tt && e.composing && r.some((i) => i.type == "childList" && i.target.nodeName == "TR") ? (e.input.badSafariComposition = !0, this.flushSoon()) : this.flush();
    }), WS && (this.onCharData = (r) => {
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
    this.observer && (this.observer.takeRecords(), this.observer.observe(this.view.dom, jS)), this.onCharData && this.view.dom.addEventListener("DOMCharacterDataModified", this.onCharData), this.connectSelection();
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
    if (Ud(this.view)) {
      if (this.suppressingSelectionUpdates)
        return Tn(this.view);
      if (yt && Qn <= 11 && !this.view.state.selection.empty) {
        let e = this.view.domSelectionRange();
        if (e.focusNode && Vr(e.focusNode, e.focusOffset, e.anchorNode, e.anchorOffset))
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
    for (let o = e.focusNode; o; o = Li(o))
      n.add(o);
    for (let o = e.anchorNode; o; o = Li(o))
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
    let r = e.domSelectionRange(), i = !this.suppressingSelectionUpdates && !this.currentSelection.eq(r) && Ud(e) && !this.ignoreSelectionChange(r), o = -1, s = -1, l = !1, a = [];
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
    } else if (Ft && a.length) {
      let c = a.filter((f) => f.nodeName == "BR");
      if (c.length == 2) {
        let [f, d] = c;
        f.parentNode && f.parentNode.parentNode == d.parentNode ? d.remove() : f.remove();
      } else {
        let { focusNode: f } = this.currentSelection;
        for (let d of c) {
          let h = d.parentNode;
          h && h.nodeName == "LI" && (!f || GS(e, f) != h) && d.remove();
        }
      }
    }
    let u = null;
    o < 0 && i && e.input.lastFocus > Date.now() - 200 && Math.max(e.input.lastTouch, e.input.lastClick.time) < Date.now() - 300 && Il(r) && (u = Yu(e)) && u.eq(oe.near(e.state.doc.resolve(0), 1)) ? (e.input.lastFocus = 0, Tn(e), this.currentSelection.set(r), e.scrollToSelection()) : (o > -1 || i) && (o > -1 && (e.docView.markDirty(o, s), US(e)), e.input.badSafariComposition && (e.input.badSafariComposition = !1, YS(e, a)), this.handleDOMChange(o, s, l, a), e.docView && e.docView.dirty ? e.updateState(e.state) : this.currentSelection.eq(r) || Tn(e), this.currentSelection.set(r));
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
      if (yt && Qn <= 11 && e.addedNodes.length)
        for (let c = 0; c < e.addedNodes.length; c++) {
          let { previousSibling: f, nextSibling: d } = e.addedNodes[c];
          (!f || Array.prototype.indexOf.call(e.addedNodes, f) < 0) && (i = f), (!d || Array.prototype.indexOf.call(e.addedNodes, d) < 0) && (o = d);
        }
      let s = i && i.parentNode == e.target ? Ye(i) + 1 : 0, l = r.localPosFromDOM(e.target, s, -1), a = o && o.parentNode == e.target ? Ye(o) : e.target.childNodes.length, u = r.localPosFromDOM(e.target, a, 1);
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
let nh = /* @__PURE__ */ new WeakMap(), rh = !1;
function US(t) {
  if (!nh.has(t) && (nh.set(t, null), ["normal", "nowrap", "pre-line"].indexOf(getComputedStyle(t.dom).whiteSpace) !== -1)) {
    if (t.requiresGeckoHackNode = Ft, rh)
      return;
    console.warn("ProseMirror expects the CSS white-space property to be set, preferably to 'pre-wrap'. It is recommended to load style/prosemirror.css from the prosemirror-view package."), rh = !0;
  }
}
function ih(t, e) {
  let n = e.startContainer, r = e.startOffset, i = e.endContainer, o = e.endOffset, s = t.domAtPos(t.state.selection.anchor);
  return Vr(s.node, s.offset, i, o) && ([n, r, i, o] = [i, o, n, r]), { anchorNode: n, anchorOffset: r, focusNode: i, focusOffset: o };
}
function JS(t, e) {
  if (e.getComposedRanges) {
    let i = e.getComposedRanges(t.root)[0];
    if (i)
      return ih(t, i);
  }
  let n;
  function r(i) {
    i.preventDefault(), i.stopImmediatePropagation(), n = i.getTargetRanges()[0];
  }
  return t.dom.addEventListener("beforeinput", r, !0), document.execCommand("indent"), t.dom.removeEventListener("beforeinput", r, !0), n ? ih(t, n) : null;
}
function GS(t, e) {
  for (let n = e.parentNode; n && n != t.dom; n = n.parentNode) {
    let r = t.docView.nearestDesc(n, !0);
    if (r && r.node.isBlock)
      return n;
  }
  return null;
}
function YS(t, e) {
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
function QS(t, e, n) {
  let { node: r, fromOffset: i, toOffset: o, from: s, to: l } = t.docView.parseRange(e, n), a = t.domSelectionRange(), u, c = a.anchorNode;
  if (c && t.dom.contains(c.nodeType == 1 ? c : c.parentNode) && (u = [{ node: c, offset: a.anchorOffset }], Il(a) || u.push({ node: a.focusNode, offset: a.focusOffset })), Qe && t.input.lastKeyCode === 8)
    for (let w = o; w > i; w--) {
      let b = r.childNodes[w - 1], L = b.pmViewDesc;
      if (b.nodeName == "BR" && !L) {
        o = w;
        break;
      }
      if (!L || L.size)
        break;
    }
  let f = t.state.doc, d = t.someProp("domParser") || Fu.fromSchema(t.state.schema), h = f.resolve(s), p = null, k = d.parse(r, {
    topNode: h.parent,
    topMatch: h.parent.contentMatchAt(h.index()),
    topOpen: !0,
    from: i,
    to: o,
    preserveWhitespace: h.parent.type.whitespace == "pre" ? "full" : !0,
    findPositions: u,
    ruleFromNode: XS,
    context: h
  });
  if (u && u[0].pos != null) {
    let w = u[0].pos, b = u[1] && u[1].pos;
    b == null && (b = w), p = { anchor: w + s, head: b + s };
  }
  return { doc: k, sel: p, from: s, to: l };
}
function XS(t) {
  let e = t.pmViewDesc;
  if (e)
    return e.parseRule();
  if (t.nodeName == "BR" && t.parentNode) {
    if (tt && /^(ul|ol)$/i.test(t.parentNode.nodeName)) {
      let n = document.createElement("div");
      return n.appendChild(document.createElement("li")), { skip: n };
    } else if (t.parentNode.lastChild == t || tt && /^(tr|table)$/i.test(t.parentNode.nodeName))
      return { ignore: !0 };
  } else if (t.nodeName == "IMG" && t.getAttribute("mark-placeholder"))
    return { ignore: !0 };
  return null;
}
const ZS = /^(a|abbr|acronym|b|bd[io]|big|br|button|cite|code|data(list)?|del|dfn|em|i|img|ins|kbd|label|map|mark|meter|output|q|ruby|s|samp|small|span|strong|su[bp]|time|u|tt|var)$/i;
function eM(t, e, n, r, i) {
  let o = t.input.compositionPendingChanges || (t.composing ? t.input.compositionID : 0);
  if (t.input.compositionPendingChanges = 0, e < 0) {
    let z = t.input.lastSelectionTime > Date.now() - 50 ? t.input.lastSelectionOrigin : null, U = Yu(t, z);
    if (U && !t.state.selection.eq(U)) {
      if (Qe && Mn && t.input.lastKeyCode === 13 && Date.now() - 100 < t.input.lastKeyCodeTime && t.someProp("handleKeyDown", (A) => A(t, pr(13, "Enter"))))
        return;
      let G = t.state.tr.setSelection(U);
      z == "pointer" ? G.setMeta("pointer", !0) : z == "key" && G.scrollIntoView(), o && G.setMeta("composition", o), t.dispatch(G);
    }
    return;
  }
  let s = t.state.doc.resolve(e), l = s.sharedDepth(n);
  e = s.before(l + 1), n = t.state.doc.resolve(n).after(l + 1);
  let a = t.state.selection, u = QS(t, e, n), c = t.state.doc, f = c.slice(u.from, u.to), d, h;
  t.input.lastKeyCode === 8 && Date.now() - 100 < t.input.lastKeyCodeTime ? (d = t.state.selection.to, h = "end") : (d = t.state.selection.from, h = "start"), t.input.lastKeyCode = null;
  let p = rM(f.content, u.doc.content, u.from, d, h);
  if (p && t.input.domChangeCount++, (Pi && t.input.lastIOSEnter > Date.now() - 225 || Mn) && i.some((z) => z.nodeType == 1 && !ZS.test(z.nodeName)) && (!p || p.endA >= p.endB) && t.someProp("handleKeyDown", (z) => z(t, pr(13, "Enter")))) {
    t.input.lastIOSEnter = 0;
    return;
  }
  if (!p)
    if (r && a instanceof Z && !a.empty && a.$head.sameParent(a.$anchor) && !t.composing && !(u.sel && u.sel.anchor != u.sel.head))
      p = { start: a.from, endA: a.to, endB: a.to };
    else {
      if (u.sel) {
        let z = oh(t, t.state.doc, u.sel);
        if (z && !z.eq(t.state.selection)) {
          let U = t.state.tr.setSelection(z);
          o && U.setMeta("composition", o), t.dispatch(U);
        }
      }
      return;
    }
  t.state.selection.from < t.state.selection.to && p.start == p.endB && t.state.selection instanceof Z && (p.start > t.state.selection.from && p.start <= t.state.selection.from + 2 && t.state.selection.from >= u.from ? p.start = t.state.selection.from : p.endA < t.state.selection.to && p.endA >= t.state.selection.to - 2 && t.state.selection.to <= u.to && (p.endB += t.state.selection.to - p.endA, p.endA = t.state.selection.to)), yt && Qn <= 11 && p.endB == p.start + 1 && p.endA == p.start && p.start > u.from && u.doc.textBetween(p.start - u.from - 1, p.start - u.from + 1) == "  " && (p.start--, p.endA--, p.endB--);
  let k = u.doc.resolveNoCache(p.start - u.from), w = u.doc.resolveNoCache(p.endB - u.from), b = c.resolve(p.start), L = k.sameParent(w) && k.parent.inlineContent && b.end() >= p.endA;
  if ((Pi && t.input.lastIOSEnter > Date.now() - 225 && (!L || i.some((z) => z.nodeName == "DIV" || z.nodeName == "P")) || !L && k.pos < u.doc.content.size && (!k.sameParent(w) || !k.parent.inlineContent) && k.pos < w.pos && !/\S/.test(u.doc.textBetween(k.pos, w.pos, "", ""))) && t.someProp("handleKeyDown", (z) => z(t, pr(13, "Enter")))) {
    t.input.lastIOSEnter = 0;
    return;
  }
  if (t.state.selection.anchor > p.start && nM(c, p.start, p.endA, k, w) && t.someProp("handleKeyDown", (z) => z(t, pr(8, "Backspace")))) {
    Mn && Qe && t.domObserver.suppressSelectionUpdates();
    return;
  }
  Qe && p.endB == p.start && (t.input.lastChromeDelete = Date.now()), Mn && !L && k.start() != w.start() && w.parentOffset == 0 && k.depth == w.depth && u.sel && u.sel.anchor == u.sel.head && u.sel.head == p.endA && (p.endB -= 2, w = u.doc.resolveNoCache(p.endB - u.from), setTimeout(() => {
    t.someProp("handleKeyDown", function(z) {
      return z(t, pr(13, "Enter"));
    });
  }, 20));
  let E = p.start, j = p.endA, H = (z) => {
    let U = z || t.state.tr.replace(E, j, u.doc.slice(p.start - u.from, p.endB - u.from));
    if (u.sel) {
      let G = oh(t, U.doc, u.sel);
      G && !(Qe && t.composing && G.empty && (p.start != p.endB || t.input.lastChromeDelete < Date.now() - 100) && (G.head == E || G.head == U.mapping.map(j) - 1) || yt && G.empty && G.head == E) && U.setSelection(G);
    }
    return o && U.setMeta("composition", o), U.scrollIntoView();
  }, T;
  if (L)
    if (k.pos == w.pos) {
      yt && Qn <= 11 && k.parentOffset == 0 && (t.domObserver.suppressSelectionUpdates(), setTimeout(() => Tn(t), 20));
      let z = H(t.state.tr.delete(E, j)), U = c.resolve(p.start).marksAcross(c.resolve(p.endA));
      U && z.ensureMarks(U), t.dispatch(z);
    } else if (
      // Adding or removing a mark
      p.endA == p.endB && (T = tM(k.parent.content.cut(k.parentOffset, w.parentOffset), b.parent.content.cut(b.parentOffset, p.endA - b.start())))
    ) {
      let z = H(t.state.tr);
      T.type == "add" ? z.addMark(E, j, T.mark) : z.removeMark(E, j, T.mark), t.dispatch(z);
    } else if (k.parent.child(k.index()).isText && k.index() == w.index() - (w.textOffset ? 0 : 1)) {
      let z = k.parent.textBetween(k.parentOffset, w.parentOffset), U = () => H(t.state.tr.insertText(z, E, j));
      t.someProp("handleTextInput", (G) => G(t, E, j, z, U)) || t.dispatch(U());
    } else
      t.dispatch(H());
  else
    t.dispatch(H());
}
function oh(t, e, n) {
  return Math.max(n.anchor, n.head) > e.content.size ? null : Qu(t, e.resolve(n.anchor), e.resolve(n.head));
}
function tM(t, e) {
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
  if (R.from(u).eq(t))
    return { mark: l, type: s };
}
function nM(t, e, n, r, i) {
  if (
    // The content must have shrunk
    n - e <= i.pos - r.pos || // newEnd must point directly at or after the end of the block that newStart points into
    ca(r, !0, !1) < i.pos
  )
    return !1;
  let o = t.resolve(e);
  if (!r.parent.isTextblock) {
    let l = o.nodeAfter;
    return l != null && n == e + l.nodeSize;
  }
  if (o.parentOffset < o.parent.content.size || !o.parent.isTextblock)
    return !1;
  let s = t.resolve(ca(o, !0, !0));
  return !s.parent.isTextblock || s.pos > n || ca(s, !0, !1) < n ? !1 : r.parent.content.cut(r.parentOffset).eq(s.parent.content);
}
function ca(t, e, n) {
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
function rM(t, e, n, r, i) {
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
    o -= a, o && o < e.size && sh(e.textBetween(o - 1, o + 1)) && (o += a ? 1 : -1), l = o + (l - s), s = o;
  } else if (l < o) {
    let a = r <= o && r >= l ? o - r : 0;
    o -= a, o && o < t.size && sh(t.textBetween(o - 1, o + 1)) && (o += a ? 1 : -1), s = o + (s - l), l = o;
  }
  return { start: o, endA: s, endB: l };
}
function sh(t) {
  if (t.length != 2)
    return !1;
  let e = t.charCodeAt(0), n = t.charCodeAt(1);
  return e >= 56320 && e <= 57343 && n >= 55296 && n <= 56319;
}
class yg {
  /**
  Create a view. `place` may be a DOM node that the editor should
  be appended to, a function that will place it into the document,
  or an object whose `mount` property holds the node to use as the
  document container. If it is `null`, the editor will not be
  added to the document.
  */
  constructor(e, n) {
    this._root = null, this.focused = !1, this.trackWrites = null, this.mounted = !1, this.markCursor = null, this.cursorWrapper = null, this.lastSelectedViewDesc = void 0, this.input = new bS(), this.prevDirectPlugins = [], this.pluginViews = [], this.requiresGeckoHackNode = !1, this.dragging = null, this._props = n, this.state = n.state, this.directPlugins = n.plugins || [], this.directPlugins.forEach(fh), this.dispatch = this.dispatch.bind(this), this.dom = e && e.mount || document.createElement("div"), e && (e.appendChild ? e.appendChild(this.dom) : typeof e == "function" ? e(this.dom) : e.mount && (this.mounted = !0)), this.editable = uh(this), ah(this), this.nodeViews = ch(this), this.docView = Vd(this.state.doc, lh(this), ua(this), this.dom, this), this.domObserver = new KS(this, (r, i, o, s) => eM(this, r, i, o, s)), this.domObserver.start(), wS(this), this.updatePluginViews();
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
    e.handleDOMEvents != this._props.handleDOMEvents && fu(this);
    let n = this._props;
    this._props = e, e.plugins && (e.plugins.forEach(fh), this.directPlugins = e.plugins), this.updateStateInner(e.state, n);
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
    e.storedMarks && this.composing && (cg(this), s = !0), this.state = e;
    let l = i.plugins != e.plugins || this._props.plugins != n.plugins;
    if (l || this._props.plugins != n.plugins || this._props.nodeViews != n.nodeViews) {
      let h = ch(this);
      oM(h, this.nodeViews) && (this.nodeViews = h, o = !0);
    }
    (l || n.handleDOMEvents != this._props.handleDOMEvents) && fu(this), this.editable = uh(this), ah(this);
    let a = ua(this), u = lh(this), c = i.plugins != e.plugins && !i.doc.eq(e.doc) ? "reset" : e.scrollToSelection > i.scrollToSelection ? "to selection" : "preserve", f = o || !this.docView.matchesNode(e.doc, u, a);
    (f || !e.selection.eq(i.selection)) && (s = !0);
    let d = c == "preserve" && s && this.dom.style.overflowAnchor == null && LC(this);
    if (s) {
      this.domObserver.stop();
      let h = f && (yt || Qe) && !this.composing && !i.selection.empty && !e.selection.empty && iM(i.selection, e.selection);
      if (f) {
        let p = Qe ? this.trackWrites = this.domSelectionRange().focusNode : null;
        this.composing && (this.input.compositionNode = LS(this)), (o || !this.docView.update(e.doc, u, a, this)) && (this.docView.updateOuterDeco(u), this.docView.destroy(), this.docView = Vd(e.doc, u, a, this.dom, this)), p && (!this.trackWrites || !this.dom.contains(this.trackWrites)) && (h = !0);
      }
      h || !(this.input.mouseDown && this.domObserver.currentSelection.eq(this.domSelectionRange()) && iS(this)) ? Tn(this, h) : (Xm(this, e.selection), this.domObserver.setCurSelection()), this.domObserver.start();
    }
    this.updatePluginViews(i), !((r = this.dragging) === null || r === void 0) && r.node && !i.doc.eq(e.doc) && this.updateDraggedNode(this.dragging, i), c == "reset" ? this.dom.scrollTop = 0 : c == "to selection" ? this.scrollToSelection() : d && PC(d);
  }
  /**
  @internal
  */
  scrollToSelection() {
    let e = this.domSelectionRange().focusNode;
    if (!(!e || !this.dom.contains(e.nodeType == 1 ? e : e.parentNode))) {
      if (!this.someProp("handleScrollToSelection", (n) => n(this))) if (this.state.selection instanceof re) {
        let n = this.docView.domAfterPos(this.state.selection.from);
        n.nodeType == 1 && Pd(this, n.getBoundingClientRect(), e);
      } else
        Pd(this, this.coordsAtPos(this.state.selection.head, 1), e);
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
    this.dragging = new dg(e.slice, e.move, i < 0 ? void 0 : re.create(this.state.doc, i));
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
    if (yt) {
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
    this.domObserver.stop(), this.editable && zC(this.dom), Tn(this), this.domObserver.start();
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
    return VC(this, e);
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
    return Wm(this, e, n);
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
    return KC(this, n || this.state, e);
  }
  /**
  Run the editor's paste logic with the given HTML string. The
  `event`, if given, will be passed to the
  [`handlePaste`](https://prosemirror.net/docs/ref/#view.EditorProps.handlePaste) hook.
  */
  pasteHTML(e, n) {
    return Do(this, "", e, !1, n || new ClipboardEvent("paste"));
  }
  /**
  Run the editor's paste logic with the given plain-text input.
  */
  pasteText(e, n) {
    return Do(this, e, null, !0, n || new ClipboardEvent("paste"));
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
    return Xu(this, e);
  }
  /**
  Removes the editor from the DOM and destroys all [node
  views](https://prosemirror.net/docs/ref/#view.NodeView).
  */
  destroy() {
    this.docView && (xS(this), this.destroyPluginViews(), this.mounted ? (this.docView.update(this.state.doc, [], ua(this), this), this.dom.textContent = "") : this.dom.parentNode && this.dom.parentNode.removeChild(this.dom), this.docView.destroy(), this.docView = null, MC());
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
    return SS(this, e);
  }
  /**
  @internal
  */
  domSelectionRange() {
    let e = this.domSelection();
    return e ? tt && this.root.nodeType === 11 && AC(this.dom.ownerDocument) == this.dom && JS(this, e) || e : { focusNode: null, focusOffset: 0, anchorNode: null, anchorOffset: 0 };
  }
  /**
  @internal
  */
  domSelection() {
    return this.root.getSelection();
  }
}
yg.prototype.dispatch = function(t) {
  let e = this._props.dispatchTransaction;
  e ? e.call(this, t) : this.updateState(this.state.apply(t));
};
function lh(t) {
  let e = /* @__PURE__ */ Object.create(null);
  return e.class = "ProseMirror", e.contenteditable = String(t.editable), t.someProp("attributes", (n) => {
    if (typeof n == "function" && (n = n(t.state)), n)
      for (let r in n)
        r == "class" ? e.class += " " + n[r] : r == "style" ? e.style = (e.style ? e.style + ";" : "") + n[r] : !e[r] && r != "contenteditable" && r != "nodeName" && (e[r] = String(n[r]));
  }), e.translate || (e.translate = "no"), [ze.node(0, t.state.doc.content.size, e)];
}
function ah(t) {
  if (t.markCursor) {
    let e = document.createElement("img");
    e.className = "ProseMirror-separator", e.setAttribute("mark-placeholder", "true"), e.setAttribute("alt", ""), t.cursorWrapper = { dom: e, deco: ze.widget(t.state.selection.from, e, { raw: !0, marks: t.markCursor }) };
  } else
    t.cursorWrapper = null;
}
function uh(t) {
  return !t.someProp("editable", (e) => e(t.state) === !1);
}
function iM(t, e) {
  let n = Math.min(t.$anchor.sharedDepth(t.head), e.$anchor.sharedDepth(e.head));
  return t.$anchor.start(n) != e.$anchor.start(n);
}
function ch(t) {
  let e = /* @__PURE__ */ Object.create(null);
  function n(r) {
    for (let i in r)
      Object.prototype.hasOwnProperty.call(e, i) || (e[i] = r[i]);
  }
  return t.someProp("nodeViews", n), t.someProp("markViews", n), e;
}
function oM(t, e) {
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
function fh(t) {
  if (t.spec.state || t.spec.filterTransaction || t.spec.appendTransaction)
    throw new RangeError("Plugins passed directly to the view must not have a state component");
}
function In(t, e) {
  return t.meta = {
    package: "@milkdown/core",
    group: "System",
    ...e
  }, t;
}
var kg = {
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
}, Ee = fe({}, "editorView"), uo = fe({}, "editorState"), fa = fe([], "initTimer"), dh = fe({}, "editor"), Lo = fe([], "inputRules"), tn = fe([], "prosePlugins"), Po = fe([], "remarkPlugins"), du = fe([], "nodeView"), hu = fe([], "markView"), Er = fe(Ka().use($a).use(ja), "remark"), ko = fe({
  handlers: kg,
  encode: []
}, "remarkStringifyOptions"), _s = on("ConfigReady");
function sM(t) {
  const e = (n) => (n.record(_s), async () => (await t(n), n.done(_s), () => {
    n.clearTimer(_s);
  }));
  return In(e, { displayName: "Config" }), e;
}
var Or = on("InitReady");
function lM(t) {
  const e = (n) => (n.inject(dh, t).inject(tn, []).inject(Po, []).inject(Lo, []).inject(du, []).inject(hu, []).inject(ko, {
    handlers: kg,
    encode: []
  }).inject(Er, Ka().use($a).use(ja)).inject(fa, [_s]).record(Or), async () => {
    await n.waitTimers(fa);
    const r = n.get(ko);
    return n.set(Er, Ka().use($a).use(ja, r)), n.done(Or), () => {
      n.remove(dh).remove(tn).remove(Po).remove(Lo).remove(du).remove(hu).remove(ko).remove(Er).remove(fa).clearTimer(Or);
    };
  });
  return In(e, { displayName: "Init" }), e;
}
var kt = on("SchemaReady"), da = fe([], "schemaTimer"), er = fe({}, "schema"), bo = fe([], "nodes"), wo = fe([], "marks");
function hh(t) {
  var e;
  return {
    ...t,
    parseDOM: (e = t.parseDOM) == null ? void 0 : e.map((n) => ({
      priority: t.priority,
      ...n
    }))
  };
}
var bg = (t) => (t.inject(er, {}).inject(bo, []).inject(wo, []).inject(da, [Or]).record(kt), async () => {
  await t.waitTimers(da);
  const e = t.get(Er), n = t.get(Po).reduce((i, o) => i.use(o.plugin, o.options), e);
  t.set(Er, n);
  const r = new X0({
    nodes: Object.fromEntries(t.get(bo).map(([i, o]) => [i, hh(o)])),
    marks: Object.fromEntries(t.get(wo).map(([i, o]) => [i, hh(o)]))
  });
  return t.set(er, r), t.done(kt), () => {
    t.remove(er).remove(bo).remove(wo).remove(da).clearTimer(kt);
  };
});
In(bg, { displayName: "Schema" });
var xr, Lt, up, wg = (up = class {
  constructor() {
    K(this, xr);
    K(this, Lt);
    B(this, xr, new dp()), B(this, Lt, null), this.setCtx = (t) => {
      B(this, Lt, t);
    }, this.chain = () => {
      if (v(this, Lt) == null) throw Fl();
      const t = v(this, Lt), e = [], n = this.get.bind(this), r = {
        run: () => {
          const o = Vi(...e), s = t.get(Ee);
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
    return v(this, Lt);
  }
  create(t, e) {
    const n = t.create(v(this, xr).sliceMap);
    return n.set(e), n;
  }
  get(t) {
    return v(this, xr).get(t).get();
  }
  remove(t) {
    return v(this, xr).remove(t);
  }
  call(t, e) {
    if (v(this, Lt) == null) throw Fl();
    const n = this.get(t)(e), r = v(this, Lt).get(Ee);
    return n(r.state, r.dispatch, r);
  }
  inline(t) {
    if (v(this, Lt) == null) throw Fl();
    const e = v(this, Lt).get(Ee);
    return t(e.state, e.dispatch, e);
  }
}, xr = new WeakMap(), Lt = new WeakMap(), up);
function aM(t = "cmdKey") {
  return fe(() => () => !1, t);
}
var ye = fe(new wg(), "commands"), ha = fe([kt], "commandsTimer"), xo = on("CommandsReady"), xg = (t) => {
  const e = new wg();
  return e.setCtx(t), t.inject(ye, e).inject(ha, [kt]).record(xo), async () => (await t.waitTimers(ha), t.done(xo), () => {
    t.remove(ye).remove(ha).clearTimer(xo);
  });
};
In(xg, { displayName: "Commands" });
function uM(t) {
  return t.Backspace = Vi(Xx, ju, Rx, Mm), t;
}
var Cr, ht, cp, Cg = (cp = class {
  constructor() {
    K(this, Cr);
    K(this, ht);
    B(this, Cr, null), B(this, ht, []), this.setCtx = (t) => {
      B(this, Cr, t);
    }, this.add = (t) => (v(this, ht).push(t), () => {
      B(this, ht, v(this, ht).filter((e) => e !== t));
    }), this.addObjectKeymap = (t) => {
      const e = [];
      return Object.entries(t).forEach(([n, r]) => {
        if (typeof r == "function") {
          const i = {
            key: n,
            onRun: () => r
          };
          v(this, ht).push(i), e.push(() => {
            B(this, ht, v(this, ht).filter((o) => o !== i));
          });
        } else
          v(this, ht).push(r), e.push(() => {
            B(this, ht, v(this, ht).filter((i) => i !== r));
          });
      }), () => {
        e.forEach((n) => n());
      };
    }, this.addBaseKeymap = () => {
      const t = uM(Yx);
      return this.addObjectKeymap(t);
    }, this.build = () => {
      const t = {};
      return v(this, ht).forEach((e) => {
        t[e.key] = [...t[e.key] || [], e];
      }), Object.fromEntries(Object.entries(t).map(([e, n]) => {
        const r = n.sort((o, s) => (s.priority ?? 50) - (o.priority ?? 50));
        return [e, (o, s, l) => {
          const a = v(this, Cr);
          if (a == null) throw kl();
          return Vi(...r.map((u) => u.onRun(a)))(o, s, l);
        }];
      }));
    };
  }
  get ctx() {
    return v(this, Cr);
  }
}, Cr = new WeakMap(), ht = new WeakMap(), cp), cl = fe(new Cg(), "keymap"), pa = fe([kt], "keymapTimer"), Co = on("KeymapReady"), cM = (t) => {
  const e = new Cg();
  return e.setCtx(t), t.inject(cl, e).inject(pa, [kt]).record(Co), async () => (await t.waitTimers(pa), t.done(Co), () => {
    t.remove(cl).remove(pa).clearTimer(Co);
  });
}, Vs = on("ParserReady"), Sg = () => {
  throw kl();
}, Hs = fe(Sg, "parser"), ma = fe([], "parserTimer"), Mg = (t) => (t.inject(Hs, Sg).inject(ma, [kt]).record(Vs), async () => {
  await t.waitTimers(ma);
  const e = t.get(Er), n = t.get(er);
  return t.set(Hs, xC.create(n, e)), t.done(Vs), () => {
    t.remove(Hs).remove(ma).clearTimer(Vs);
  };
});
In(Mg, { displayName: "Parser" });
var So = on("SerializerReady"), ga = fe([], "serializerTimer"), vg = () => {
  throw kl();
}, Mo = fe(vg, "serializer"), Tg = (t) => (t.inject(Mo, vg).inject(ga, [kt]).record(So), async () => {
  await t.waitTimers(ga);
  const e = t.get(Er), n = t.get(er);
  return t.set(Mo, SC.create(n, e)), t.done(So), () => {
    t.remove(Mo).remove(ga).clearTimer(So);
  };
});
In(Tg, { displayName: "Serializer" });
var js = fe("", "defaultValue"), ya = fe((t) => t, "stateOptions"), ka = fe([], "editorStateTimer"), Ws = on("EditorStateReady");
function fM(t, e, n) {
  if (typeof t == "string") return e(t);
  if (t.type === "html") return Fu.fromSchema(n).parse(t.dom);
  if (t.type === "json") return vn.fromJSON(n, t.value);
  throw Yk(t);
}
var dM = new rt("MILKDOWN_STATE_TRACKER"), Ng = (t) => (t.inject(js, "").inject(uo, {}).inject(ya, (e) => e).inject(ka, [
  Vs,
  So,
  xo,
  Co
]).record(Ws), async () => {
  await t.waitTimers(ka);
  const e = t.get(er), n = t.get(Hs), r = t.get(Lo), i = t.get(ya), o = t.get(tn), s = fM(t.get(js), n, e), l = t.get(cl), a = l.addBaseKeymap(), u = [
    ...o,
    new Be({
      key: dM,
      state: {
        init: () => {
        },
        apply: (d, h, p, k) => {
          t.set(uo, k);
        }
      }
    }),
    sC({ rules: r }),
    Dm(l.build())
  ];
  t.set(tn, u);
  const c = i({
    schema: e,
    doc: s,
    plugins: u
  }), f = oi.create(c);
  return t.set(uo, f), t.done(Ws), () => {
    a(), t.remove(js).remove(uo).remove(ya).remove(ka).clearTimer(Ws);
  };
});
In(Ng, { displayName: "EditorState" });
var zo = fe([], "pasteRule"), ba = fe([kt], "pasteRuleTimer"), qs = on("PasteRuleReady"), Ig = (t) => (t.inject(zo, []).inject(ba, [kt]).record(qs), async () => (await t.waitTimers(ba), t.done(qs), () => {
  t.remove(zo).remove(ba).clearTimer(qs);
}));
In(Ig, { displayName: "PasteRule" });
var Ks = on("EditorViewReady"), wa = fe([], "editorViewTimer"), Us = fe({}, "editorViewOptions"), Js = fe(null, "root"), pu = fe(null, "rootDOM"), mu = fe({}, "rootAttrs");
function hM(t, e) {
  const n = document.createElement("div");
  n.className = "milkdown", t.appendChild(n), e.set(pu, n);
  const r = e.get(mu);
  return Object.entries(r).forEach(([i, o]) => n.setAttribute(i, o)), n;
}
function pM(t) {
  t.classList.add("editor"), t.setAttribute("role", "textbox");
}
var mM = new rt("MILKDOWN_VIEW_CLEAR"), Ag = (t) => (t.inject(Js, document.body).inject(Ee, {}).inject(Us, {}).inject(pu, null).inject(mu, {}).inject(wa, [Ws, qs]).record(Ks), async () => {
  await t.wait(Or);
  const e = t.get(Js) || document.body, n = typeof e == "string" ? document.querySelector(e) : e;
  t.update(tn, (s) => [new Be({
    key: mM,
    view: (l) => {
      const a = n ? hM(n, t) : void 0;
      return (() => {
        if (a && n) {
          const c = l.dom;
          n.replaceChild(a, c), a.appendChild(c);
        }
      })(), { destroy: () => {
        a != null && a.parentNode && (a == null || a.parentNode.replaceChild(l.dom, a)), a == null || a.remove();
      } };
    }
  }), ...s]), await t.waitTimers(wa);
  const r = t.get(uo), i = t.get(Us), o = new yg(n, {
    state: r,
    nodeViews: Object.fromEntries(t.get(du)),
    markViews: Object.fromEntries(t.get(hu)),
    transformPasted: (s, l, a) => (t.get(zo).sort((u, c) => (c.priority ?? 50) - (u.priority ?? 50)).map((u) => u.run).forEach((u) => {
      s = u(s, l, a);
    }), s),
    ...i
  });
  return pM(o.dom), t.set(Ee, o), t.done(Ks), () => {
    o == null || o.destroy(), t.remove(Js).remove(Ee).remove(Us).remove(pu).remove(mu).remove(wa).clearTimer(Ks);
  };
});
In(Ag, { displayName: "EditorView" });
var Dt = /* @__PURE__ */ function(t) {
  return t.Idle = "Idle", t.OnCreate = "OnCreate", t.Created = "Created", t.OnDestroy = "OnDestroy", t.Destroyed = "Destroyed", t;
}({}), Sr, Mt, wn, Ni, Qo, Xo, pt, xn, Mr, Zo, vr, Ii, es, Un, Ai, Ei, gM = (Ei = class {
  constructor() {
    K(this, Sr);
    K(this, Mt);
    K(this, wn);
    K(this, Ni);
    K(this, Qo);
    K(this, Xo);
    K(this, pt);
    K(this, xn);
    K(this, Mr);
    K(this, Zo);
    K(this, vr);
    K(this, Ii);
    K(this, es);
    K(this, Un);
    K(this, Ai);
    B(this, Sr, !1), B(this, Mt, Dt.Idle), B(this, wn, []), B(this, Ni, () => {
    }), B(this, Qo, new dp()), B(this, Xo, new a1()), B(this, pt, /* @__PURE__ */ new Map()), B(this, xn, /* @__PURE__ */ new Map()), B(this, Mr, new l1(v(this, Qo), v(this, Xo))), B(this, Zo, () => {
      const e = sM(async (r) => {
        await Promise.all(v(this, wn).map((i) => Promise.resolve(i(r))));
      }), n = [
        bg,
        Mg,
        Tg,
        xg,
        cM,
        Ig,
        Ng,
        Ag,
        lM(this),
        e
      ];
      v(this, vr).call(this, n, v(this, xn));
    }), B(this, vr, (e, n) => {
      e.forEach((r) => {
        const i = v(this, Mr).produce(v(this, Sr) ? r.meta : void 0), o = r(i);
        n.set(r, {
          ctx: i,
          handler: o,
          cleanup: void 0
        });
      });
    }), B(this, Ii, (e, n = !1) => Promise.all([e].flat().map(async (r) => {
      var o;
      const i = (o = v(this, pt).get(r)) == null ? void 0 : o.cleanup;
      return n ? v(this, pt).delete(r) : v(this, pt).set(r, {
        ctx: void 0,
        handler: void 0,
        cleanup: void 0
      }), typeof i == "function" ? i() : i;
    }))), B(this, es, async () => {
      await Promise.all([...v(this, xn).entries()].map(async ([e, { cleanup: n }]) => typeof n == "function" ? n() : n)), v(this, xn).clear();
    }), B(this, Un, (e) => {
      B(this, Mt, e), v(this, Ni).call(this, e);
    }), B(this, Ai, (e) => [...e.entries()].map(async ([n, r]) => {
      const { ctx: i, handler: o } = r;
      if (!o) return;
      const s = await o();
      e.set(n, {
        ctx: i,
        handler: o,
        cleanup: s
      });
    })), this.enableInspector = (e = !0) => (B(this, Sr, e), this), this.onStatusChange = (e) => (B(this, Ni, e), this), this.config = (e) => (v(this, wn).push(e), this), this.removeConfig = (e) => (B(this, wn, v(this, wn).filter((n) => n !== e)), this), this.use = (e) => {
      const n = [e].flat();
      return n.flat().forEach((r) => {
        v(this, pt).set(r, {
          ctx: void 0,
          handler: void 0,
          cleanup: void 0
        });
      }), v(this, Mt) === Dt.Created && v(this, vr).call(this, n, v(this, pt)), this;
    }, this.remove = async (e) => v(this, Mt) === Dt.OnCreate ? (console.warn("[Milkdown]: You are trying to remove plugins when the editor is creating, this is not recommended, please check your code."), new Promise((n) => {
      setTimeout(() => {
        n(this.remove(e));
      }, 50);
    })) : (await v(this, Ii).call(this, [e].flat(), !0), this), this.create = async () => v(this, Mt) === Dt.OnCreate ? this : (v(this, Mt) === Dt.Created && await this.destroy(), v(this, Un).call(this, Dt.OnCreate), v(this, Zo).call(this), v(this, vr).call(this, [...v(this, pt).keys()], v(this, pt)), await Promise.all([v(this, Ai).call(this, v(this, xn)), v(this, Ai).call(this, v(this, pt))].flat()), v(this, Un).call(this, Dt.Created), this), this.destroy = async (e = !1) => v(this, Mt) === Dt.Destroyed || v(this, Mt) === Dt.OnDestroy ? this : v(this, Mt) === Dt.OnCreate ? new Promise((n) => {
      setTimeout(() => {
        n(this.destroy(e));
      }, 50);
    }) : (e && B(this, wn, []), v(this, Un).call(this, Dt.OnDestroy), await v(this, Ii).call(this, [...v(this, pt).keys()], e), await v(this, es).call(this), v(this, Un).call(this, Dt.Destroyed), this), this.action = (e) => e(v(this, Mr)), this.inspect = () => v(this, Sr) ? [...v(this, xn).values(), ...v(this, pt).values()].map(({ ctx: e }) => {
      var n;
      return (n = e == null ? void 0 : e.inspector) == null ? void 0 : n.read();
    }).filter((e) => !!e) : (console.warn("[Milkdown]: You are trying to collect inspection when inspector is disabled, please enable inspector by `editor.enableInspector()` first."), []);
  }
  static make() {
    return new Ei();
  }
  get ctx() {
    return v(this, Mr);
  }
  get status() {
    return v(this, Mt);
  }
}, Sr = new WeakMap(), Mt = new WeakMap(), wn = new WeakMap(), Ni = new WeakMap(), Qo = new WeakMap(), Xo = new WeakMap(), pt = new WeakMap(), xn = new WeakMap(), Mr = new WeakMap(), Zo = new WeakMap(), vr = new WeakMap(), Ii = new WeakMap(), es = new WeakMap(), Un = new WeakMap(), Ai = new WeakMap(), Ei);
function ie(t, e) {
  const n = aM(t), r = (i) => async () => {
    r.key = n, await i.wait(xo);
    const o = e(i);
    return i.get(ye).create(n, o), r.run = (s) => i.get(ye).call(t, s), () => {
      i.get(ye).remove(n);
    };
  };
  return r;
}
function wt(t) {
  const e = (n) => async () => {
    await n.wait(kt);
    const r = t(n);
    return n.update(Lo, (i) => [...i, r]), e.inputRule = r, () => {
      n.update(Lo, (i) => i.filter((o) => o !== r));
    };
  };
  return e;
}
function yM(t) {
  const e = (n) => async () => {
    await n.wait(kt);
    const r = t(n);
    return n.update(zo, (i) => [...i, r]), e.pasteRule = r, () => {
      n.update(zo, (i) => i.filter((o) => o !== r));
    };
  };
  return e;
}
function kM(t, e) {
  const n = (r) => async () => {
    const i = e(r);
    return r.update(wo, (o) => [...o.filter((s) => s[0] !== t), [t, i]]), n.id = t, n.schema = i, () => {
      r.update(wo, (o) => o.filter(([s]) => s !== t));
    };
  };
  return n.type = (r) => {
    const i = r.get(er).marks[t];
    if (!i) throw r1(t);
    return i;
  }, n;
}
function ic(t, e) {
  const n = (r) => async () => {
    const i = e(r);
    return r.update(bo, (o) => [...o.filter((s) => s[0] !== t), [t, i]]), n.id = t, n.schema = i, () => {
      r.update(bo, (o) => o.filter(([s]) => s !== t));
    };
  };
  return n.type = (r) => {
    const i = r.get(er).nodes[t];
    if (!i) throw n1(t);
    return i;
  }, n;
}
function sn(t) {
  let e;
  const n = (r) => async () => (await r.wait(kt), e = t(r), r.update(tn, (i) => [...i, e]), () => {
    r.update(tn, (i) => i.filter((o) => o !== e));
  });
  return n.plugin = () => e, n.key = () => e.spec.key, n;
}
function bM(t) {
  const e = (n) => async () => {
    await n.wait(Co);
    const r = n.get(cl), i = t(n), o = r.addObjectKeymap(i);
    return e.keymap = i, () => {
      o();
    };
  };
  return e;
}
function An(t, e) {
  const n = fe(t, e), r = (i) => (i.inject(n), () => () => {
    i.remove(n);
  });
  return r.key = n, r;
}
function Ie(t, e) {
  const n = An(e, t), r = ic(t, (o) => o.get(n.key)(o)), i = [n, r];
  return i.id = r.id, i.node = r, i.type = (o) => r.type(o), i.ctx = n, i.key = n.key, i.extendSchema = (o) => Ie(t, o(e)), i;
}
function Hi(t, e) {
  const n = An(e, t), r = kM(t, (o) => o.get(n.key)(o)), i = [n, r];
  return i.id = r.id, i.mark = r, i.type = (o) => r.type(o), i.ctx = n, i.key = n.key, i.extendSchema = (o) => Hi(t, o(e)), i;
}
function xt(t, e) {
  const n = An(Object.fromEntries(Object.entries(e).map(([o, { shortcuts: s, priority: l }]) => [o, {
    shortcuts: s,
    priority: l
  }])), `${t}Keymap`), r = bM((o) => {
    const s = o.get(n.key), l = Object.entries(e).flatMap(([a, { command: u }]) => {
      const c = s[a], f = [c.shortcuts].flat(), d = c.priority;
      return f.map((h) => [h, {
        key: h,
        onRun: u,
        priority: d
      }]);
    });
    return Object.fromEntries(l);
  }), i = [n, r];
  return i.ctx = n, i.shortcuts = r, i.key = n.key, i.keymap = r.keymap, i;
}
var Ut = (t, e = () => ({})) => An(e, `${t}Attr`), us = (t, e = () => ({})) => An(e, `${t}Attr`);
function ln(t, e, n) {
  const r = An({}, t), i = (s) => async () => {
    await s.wait(Or);
    const l = {
      plugin: e(s),
      options: s.get(r.key)
    };
    return s.update(Po, (a) => [...a, l]), () => {
      s.update(Po, (a) => a.filter((u) => u !== l));
    };
  }, o = [r, i];
  return o.id = t, o.plugin = i, o.options = r, o;
}
function wM(t, e) {
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
        let f = R.empty, d = i.index(-1) ? 1 : i.index(-2) ? 2 : 3;
        for (let b = i.depth - d; b >= i.depth - 3; b--)
          f = R.from(i.node(b).copy(f));
        let h = i.indexAfter(-1) < i.node(-2).childCount ? 1 : i.indexAfter(-2) < i.node(-3).childCount ? 2 : 3;
        f = f.append(R.from(t.createAndFill()));
        let p = i.before(i.depth - (d - 1)), k = n.tr.replace(p, i.after(-h), new _(f, 4 - d, 0)), w = -1;
        k.doc.nodesBetween(p, k.doc.content.size, (b, L) => {
          if (w > -1)
            return !1;
          b.isTextblock && b.content.size == 0 && (w = L + 1);
        }), w > -1 && k.setSelection(oe.near(k.doc.resolve(w))), r(k.scrollIntoView());
      }
      return !0;
    }
    let a = o.pos == i.end() ? l.contentMatchAt(0).defaultType : null, u = n.tr.delete(i.pos, o.pos), c = a ? [null, { type: a }] : void 0;
    return mo(u.doc, i.pos, 2, c) ? (r && r(u.split(i.pos, 2, c).scrollIntoView()), !0) : !1;
  };
}
function Eg(t) {
  return function(e, n) {
    let { $from: r, $to: i } = e.selection, o = r.blockRange(i, (s) => s.childCount > 0 && s.firstChild.type == t);
    return o ? n ? r.node(o.depth - 1).type == t ? xM(e, n, t, o) : CM(e, n, o) : !0 : !1;
  };
}
function xM(t, e, n, r) {
  let i = t.tr, o = r.end, s = r.$to.end(r.depth);
  o < s && (i.step(new et(o - 1, s, o, s, new _(R.from(n.create(null, r.parent.copy())), 1, 0), 1, !0)), r = new Yp(i.doc.resolve(r.$from.pos), i.doc.resolve(s), r.depth));
  const l = Ml(r);
  if (l == null)
    return !1;
  i.lift(r, l);
  let a = i.doc.resolve(i.mapping.map(o, -1) - 1);
  return vl(i.doc, a.pos) && a.nodeBefore.type == a.nodeAfter.type && i.join(a.pos), e(i.scrollIntoView()), !0;
}
function CM(t, e, n) {
  let r = t.tr, i = n.parent;
  for (let h = n.end, p = n.endIndex - 1, k = n.startIndex; p > k; p--)
    h -= i.child(p).nodeSize, r.delete(h - 1, h + 1);
  let o = r.doc.resolve(n.start), s = o.nodeAfter;
  if (r.mapping.map(n.end) != n.start + o.nodeAfter.nodeSize)
    return !1;
  let l = n.startIndex == 0, a = n.endIndex == i.childCount, u = o.node(-1), c = o.index(-1);
  if (!u.canReplace(c + (l ? 0 : 1), c + 1, s.content.append(a ? R.empty : R.from(i))))
    return !1;
  let f = o.pos, d = f + s.nodeSize;
  return r.step(new et(f - (l ? 1 : 0), d + (a ? 1 : 0), f + 1, d - 1, new _((l ? R.empty : R.from(i.copy(R.empty))).append(a ? R.empty : R.from(i.copy(R.empty))), l ? 0 : 1, a ? 0 : 1), l ? 0 : 1)), e(r.scrollIntoView()), !0;
}
function SM(t) {
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
      let u = a.lastChild && a.lastChild.type == l.type, c = R.from(u ? t.create() : null), f = new _(R.from(t.create(null, R.from(l.type.create(null, c)))), u ? 3 : 1, 0), d = o.start, h = o.end;
      n(e.tr.step(new et(d - (u ? 3 : 1), h, d, h, f, 1, !0)).scrollIntoView());
    }
    return !0;
  };
}
function MM(t) {
  const e = /* @__PURE__ */ new Map();
  if (!t || !t.type)
    throw new Error("mdast-util-definitions expected node");
  return $i(t, "definition", function(r) {
    const i = ph(r.identifier);
    i && !e.get(i) && e.set(i, r);
  }), n;
  function n(r) {
    const i = ph(r);
    return e.get(i);
  }
}
function ph(t) {
  return String(t || "").toUpperCase();
}
function vM() {
  return function(t) {
    const e = MM(t);
    $i(t, function(n, r, i) {
      if (n.type === "definition" && i !== void 0 && typeof r == "number")
        return i.children.splice(r, 1), [Ha, r];
      if (n.type === "imageReference" || n.type === "linkReference") {
        const o = e(n.identifier);
        if (o && i && typeof r == "number")
          return i.children[r] = n.type === "imageReference" ? { type: "image", url: o.url, title: o.title, alt: n.alt } : {
            type: "link",
            url: o.url,
            title: o.title,
            children: n.children
          }, [Ha, r];
      }
    });
  };
}
function Og(t, e) {
  var r;
  if (!(e.childCount >= 1 && ((r = e.lastChild) == null ? void 0 : r.type.name) === "hardbreak")) {
    t.next(e.content);
    return;
  }
  const n = [];
  e.content.forEach((i, o, s) => {
    s !== e.childCount - 1 && n.push(i);
  }), t.next(R.fromArray(n));
}
function D(t, e) {
  return Object.assign(t, { meta: {
    package: "@milkdown/preset-commonmark",
    ...e
  } }), t;
}
var oc = us("emphasis");
D(oc, {
  displayName: "Attr<emphasis>",
  group: "Emphasis"
});
var ji = Hi("emphasis", (t) => ({
  attrs: { marker: {
    default: t.get(ko).emphasis || "*",
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
  toDOM: (e) => ["em", t.get(oc.key)(e)],
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
D(ji.mark, {
  displayName: "MarkSchema<emphasis>",
  group: "Emphasis"
});
D(ji.ctx, {
  displayName: "MarkSchemaCtx<emphasis>",
  group: "Emphasis"
});
var sc = ie("ToggleEmphasis", (t) => () => rs(ji.type(t)));
D(sc, {
  displayName: "Command<toggleEmphasisCommand>",
  group: "Emphasis"
});
var Dg = wt((t) => is(/(?:^|[^*])\*([^*]+)\*$/, ji.type(t), {
  getAttr: () => ({ marker: "*" }),
  updateCaptured: ({ fullMatch: e, start: n }) => e.startsWith("*") ? {} : {
    fullMatch: e.slice(1),
    start: n + 1
  }
}));
D(Dg, {
  displayName: "InputRule<emphasis>|Star",
  group: "Emphasis"
});
var Rg = wt((t) => is(/\b_(?![_\s])(.*?[^_\s])_\b/, ji.type(t), {
  getAttr: () => ({ marker: "_" }),
  updateCaptured: ({ fullMatch: e, start: n }) => e.startsWith("_") ? {} : {
    fullMatch: e.slice(1),
    start: n + 1
  }
}));
D(Rg, {
  displayName: "InputRule<emphasis>|Underscore",
  group: "Emphasis"
});
var lc = xt("emphasisKeymap", { ToggleEmphasis: {
  shortcuts: "Mod-i",
  command: (t) => {
    const e = t.get(ye);
    return () => e.call(sc.key);
  }
} });
D(lc.ctx, {
  displayName: "KeymapCtx<emphasis>",
  group: "Emphasis"
});
D(lc.shortcuts, {
  displayName: "Keymap<emphasis>",
  group: "Emphasis"
});
var ac = us("strong");
D(ac, {
  displayName: "Attr<strong>",
  group: "Strong"
});
var cs = Hi("strong", (t) => ({
  attrs: { marker: {
    default: t.get(ko).strong || "*",
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
  toDOM: (e) => ["strong", t.get(ac.key)(e)],
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
D(cs.mark, {
  displayName: "MarkSchema<strong>",
  group: "Strong"
});
D(cs.ctx, {
  displayName: "MarkSchemaCtx<strong>",
  group: "Strong"
});
var uc = ie("ToggleStrong", (t) => () => rs(cs.type(t)));
D(uc, {
  displayName: "Command<toggleStrongCommand>",
  group: "Strong"
});
var Lg = wt((t) => is(new RegExp("(?:^|[^\\\\w:/])(?:\\\\*\\\\*|__)([^*_]+?)(?:\\\\*\\\\*|__)(?![\\\\w/])$"), cs.type(t), { updateCaptured: (e) => e.fullMatch.startsWith("**") || e.fullMatch.startsWith("__") ? e : { start: e.start + 1, fullMatch: e.fullMatch.slice(1) }, getAttr: (e) => ({ marker: (e[0].startsWith("**") || e[0].startsWith("__") ? e[0] : e[0].slice(1)).startsWith("*") ? "*" : "_" }) }));
D(Lg, {
  displayName: "InputRule<strong>",
  group: "Strong"
});
var cc = xt("strongKeymap", { ToggleBold: {
  shortcuts: ["Mod-b"],
  command: (t) => {
    const e = t.get(ye);
    return () => e.call(uc.key);
  }
} });
D(cc.ctx, {
  displayName: "KeymapCtx<strong>",
  group: "Strong"
});
D(cc.shortcuts, {
  displayName: "Keymap<strong>",
  group: "Strong"
});
var fc = us("inlineCode");
D(fc, {
  displayName: "Attr<inlineCode>",
  group: "InlineCode"
});
var Yn = Hi("inlineCode", (t) => ({
  priority: 100,
  code: !0,
  parseDOM: [{ tag: "code" }],
  toDOM: (e) => ["code", t.get(fc.key)(e)],
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
D(Yn.mark, {
  displayName: "MarkSchema<inlineCode>",
  group: "InlineCode"
});
D(Yn.ctx, {
  displayName: "MarkSchemaCtx<inlineCode>",
  group: "InlineCode"
});
var dc = ie("ToggleInlineCode", (t) => () => (e, n) => {
  const { selection: r, tr: i } = e;
  if (r.empty) return !1;
  const { from: o, to: s } = r;
  return e.doc.rangeHasMark(o, s, Yn.type(t)) ? (n == null || n(i.removeMark(o, s, Yn.type(t))), !0) : (Object.keys(e.schema.marks).filter((l) => l !== Yn.type.name).map((l) => e.schema.marks[l]).forEach((l) => {
    i.removeMark(o, s, l);
  }), n == null || n(i.addMark(o, s, Yn.type(t).create())), !0);
});
D(dc, {
  displayName: "Command<toggleInlineCodeCommand>",
  group: "InlineCode"
});
var Pg = wt((t) => is(/(?:`)([^`]+)(?:`)$/, Yn.type(t)));
D(Pg, {
  displayName: "InputRule<inlineCodeInputRule>",
  group: "InlineCode"
});
var hc = xt("inlineCodeKeymap", { ToggleInlineCode: {
  shortcuts: "Mod-e",
  command: (t) => {
    const e = t.get(ye);
    return () => e.call(dc.key);
  }
} });
D(hc.ctx, {
  displayName: "KeymapCtx<inlineCode>",
  group: "InlineCode"
});
D(hc.shortcuts, {
  displayName: "Keymap<inlineCode>",
  group: "InlineCode"
});
var pc = us("link");
D(pc, {
  displayName: "Attr<link>",
  group: "Link"
});
var ci = Hi("link", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw rn(e);
      return {
        href: e.getAttribute("href"),
        title: e.getAttribute("title")
      };
    }
  }],
  toDOM: (e) => ["a", {
    ...t.get(pc.key)(e),
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
D(ci.mark, {
  displayName: "MarkSchema<link>",
  group: "Link"
});
var zg = ie("ToggleLink", (t) => (e = {}) => rs(ci.type(t), e));
D(zg, {
  displayName: "Command<toggleLinkCommand>",
  group: "Link"
});
var Bg = ie("UpdateLink", (t) => (e = {}) => (n, r) => {
  if (!r) return !1;
  let i, o = -1;
  const { selection: s } = n, { from: l, to: a } = s;
  if (n.doc.nodesBetween(l, l === a ? a + 1 : a, (p, k) => {
    if (ci.type(t).isInSet(p.marks))
      return i = p, o = k, !1;
  }), !i) return !1;
  const u = i.marks.find(({ type: p }) => p === ci.type(t));
  if (!u) return !1;
  const c = o, f = o + i.nodeSize, { tr: d } = n, h = ci.type(t).create({
    ...u.attrs,
    ...e
  });
  return h ? (r(d.removeMark(c, f, u).addMark(c, f, h).setSelection(new Z(d.selection.$anchor)).scrollIntoView()), !0) : !1;
});
D(Bg, {
  displayName: "Command<updateLinkCommand>",
  group: "Link"
});
var Fg = ic("doc", () => ({
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
D(Fg, {
  displayName: "NodeSchema<doc>",
  group: "Doc"
});
function TM(t) {
  return Lu(t, (e) => {
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
var Ol = ln("remark-preserve-empty-line", () => () => TM);
D(Ol.plugin, {
  displayName: "Remark<remarkPreserveEmptyLine>",
  group: "Remark"
});
D(Ol.options, {
  displayName: "RemarkConfig<remarkPreserveEmptyLine>",
  group: "Remark"
});
var mc = Ut("paragraph");
D(mc, {
  displayName: "Attr<paragraph>",
  group: "Paragraph"
});
var nn = Ie("paragraph", (t) => ({
  content: "inline*",
  group: "block",
  parseDOM: [{ tag: "p" }],
  toDOM: (e) => [
    "p",
    t.get(mc.key)(e),
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
      const r = (i = t.get(Ee).state) == null ? void 0 : i.doc.lastChild;
      e.openNode("paragraph"), (!n.content || n.content.size === 0) && n !== r && NM(t) ? e.addNode("html", void 0, "<br />") : Og(e, n), e.closeNode();
    }
  }
}));
function NM(t) {
  let e = !1;
  try {
    t.get(Ol.id), e = !0;
  } catch {
    e = !1;
  }
  return e;
}
D(nn.node, {
  displayName: "NodeSchema<paragraph>",
  group: "Paragraph"
});
D(nn.ctx, {
  displayName: "NodeSchemaCtx<paragraph>",
  group: "Paragraph"
});
var gc = ie("TurnIntoText", (t) => () => Sn(nn.type(t)));
D(gc, {
  displayName: "Command<turnIntoTextCommand>",
  group: "Paragraph"
});
var yc = xt("paragraphKeymap", { TurnIntoText: {
  shortcuts: "Mod-Alt-0",
  command: (t) => {
    const e = t.get(ye);
    return () => e.call(gc.key);
  }
} });
D(yc.ctx, {
  displayName: "KeymapCtx<paragraph>",
  group: "Paragraph"
});
D(yc.shortcuts, {
  displayName: "Keymap<paragraph>",
  group: "Paragraph"
});
var IM = Array(6).fill(0).map((t, e) => e + 1);
function AM(t) {
  return t.textContent.toLowerCase().trim().replace(/\s+/g, "-");
}
var Dl = An(AM, "headingIdGenerator");
D(Dl, {
  displayName: "Ctx<HeadingIdGenerator>",
  group: "Heading"
});
var kc = Ut("heading");
D(kc, {
  displayName: "Attr<heading>",
  group: "Heading"
});
var Kr = Ie("heading", (t) => {
  const e = t.get(Dl.key);
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
    parseDOM: IM.map((n) => ({
      tag: `h${n}`,
      getAttrs: (r) => {
        if (!(r instanceof HTMLElement)) throw rn(r);
        return {
          level: n,
          id: r.id
        };
      }
    })),
    toDOM: (n) => [
      `h${n.attrs.level}`,
      {
        ...t.get(kc.key)(n),
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
        n.openNode("heading", void 0, { depth: r.attrs.level }), Og(n, r), n.closeNode();
      }
    }
  };
});
D(Kr.node, {
  displayName: "NodeSchema<heading>",
  group: "Heading"
});
D(Kr.ctx, {
  displayName: "NodeSchemaCtx<heading>",
  group: "Heading"
});
var $g = wt((t) => Am(/^(#+)\s$/, Kr.type(t), (e) => {
  var o, s;
  const n = (e[1] || "").length || 0, { $from: r } = t.get(Ee).state.selection, i = r.node();
  if (i.type.name === "heading") {
    let l = Number(i.attrs.level) + Number(n);
    return l > 6 && (l = 6), { level: l };
  }
  return { level: n };
}));
D($g, {
  displayName: "InputRule<wrapInHeadingInputRule>",
  group: "Heading"
});
var _n = ie("WrapInHeading", (t) => (e) => (e ?? (e = 1), e < 1 ? Sn(nn.type(t)) : Sn(Kr.type(t), { level: e })));
D(_n, {
  displayName: "Command<wrapInHeadingCommand>",
  group: "Heading"
});
var bc = ie("DowngradeHeading", (t) => () => (e, n, r) => {
  const { $from: i } = e.selection, o = i.node();
  if (o.type !== Kr.type(t) || !e.selection.empty || i.parentOffset !== 0) return !1;
  const s = o.attrs.level - 1;
  return s ? (n == null || n(e.tr.setNodeMarkup(e.selection.$from.before(), void 0, {
    ...o.attrs,
    level: s
  })), !0) : Sn(nn.type(t))(e, n, r);
});
D(bc, {
  displayName: "Command<downgradeHeadingCommand>",
  group: "Heading"
});
var wc = xt("headingKeymap", {
  TurnIntoH1: {
    shortcuts: "Mod-Alt-1",
    command: (t) => {
      const e = t.get(ye);
      return () => e.call(_n.key, 1);
    }
  },
  TurnIntoH2: {
    shortcuts: "Mod-Alt-2",
    command: (t) => {
      const e = t.get(ye);
      return () => e.call(_n.key, 2);
    }
  },
  TurnIntoH3: {
    shortcuts: "Mod-Alt-3",
    command: (t) => {
      const e = t.get(ye);
      return () => e.call(_n.key, 3);
    }
  },
  TurnIntoH4: {
    shortcuts: "Mod-Alt-4",
    command: (t) => {
      const e = t.get(ye);
      return () => e.call(_n.key, 4);
    }
  },
  TurnIntoH5: {
    shortcuts: "Mod-Alt-5",
    command: (t) => {
      const e = t.get(ye);
      return () => e.call(_n.key, 5);
    }
  },
  TurnIntoH6: {
    shortcuts: "Mod-Alt-6",
    command: (t) => {
      const e = t.get(ye);
      return () => e.call(_n.key, 6);
    }
  },
  DowngradeHeading: {
    shortcuts: ["Delete", "Backspace"],
    command: (t) => {
      const e = t.get(ye);
      return () => e.call(bc.key);
    }
  }
});
D(wc.ctx, {
  displayName: "KeymapCtx<heading>",
  group: "Heading"
});
D(wc.shortcuts, {
  displayName: "Keymap<heading>",
  group: "Heading"
});
var xc = Ut("blockquote");
D(xc, {
  displayName: "Attr<blockquote>",
  group: "Blockquote"
});
var fs = Ie("blockquote", (t) => ({
  content: "block+",
  group: "block",
  defining: !0,
  parseDOM: [{ tag: "blockquote" }],
  toDOM: (e) => [
    "blockquote",
    t.get(xc.key)(e),
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
D(fs.node, {
  displayName: "NodeSchema<blockquote>",
  group: "Blockquote"
});
D(fs.ctx, {
  displayName: "NodeSchemaCtx<blockquote>",
  group: "Blockquote"
});
var _g = wt((t) => Uu(/^\s*>\s$/, fs.type(t)));
D(_g, {
  displayName: "InputRule<wrapInBlockquoteInputRule>",
  group: "Blockquote"
});
var Cc = ie("WrapInBlockquote", (t) => () => Ku(fs.type(t)));
D(Cc, {
  displayName: "Command<wrapInBlockquoteCommand>",
  group: "Blockquote"
});
var Sc = xt("blockquoteKeymap", { WrapInBlockquote: {
  shortcuts: "Mod-Shift-b",
  command: (t) => {
    const e = t.get(ye);
    return () => e.call(Cc.key);
  }
} });
D(Sc.ctx, {
  displayName: "KeymapCtx<blockquote>",
  group: "Blockquote"
});
D(Sc.shortcuts, {
  displayName: "Keymap<blockquote>",
  group: "Blockquote"
});
var Mc = Ut("codeBlock", () => ({
  pre: {},
  code: {}
}));
D(Mc, {
  displayName: "Attr<codeBlock>",
  group: "CodeBlock"
});
var ds = Ie("code_block", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw rn(e);
      return { language: e.dataset.language };
    }
  }],
  toDOM: (e) => {
    const n = t.get(Mc.key)(e), r = e.attrs.language, i = r && r.length > 0 ? { "data-language": r } : void 0;
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
D(ds.node, {
  displayName: "NodeSchema<codeBlock>",
  group: "CodeBlock"
});
D(ds.ctx, {
  displayName: "NodeSchemaCtx<codeBlock>",
  group: "CodeBlock"
});
var Vg = wt((t) => Am(/^```([a-z]*)?[\s\n]$/, ds.type(t), (e) => {
  var n;
  return { language: e[1] ?? "" };
}));
D(Vg, {
  displayName: "InputRule<createCodeBlockInputRule>",
  group: "CodeBlock"
});
var vc = ie("CreateCodeBlock", (t) => (e = "") => Sn(ds.type(t), { language: e }));
D(vc, {
  displayName: "Command<createCodeBlockCommand>",
  group: "CodeBlock"
});
var EM = ie("UpdateCodeBlockLanguage", () => ({ pos: t, language: e } = {
  pos: -1,
  language: ""
}) => (n, r) => t >= 0 ? (r == null || r(n.tr.setNodeAttribute(t, "language", e)), !0) : !1);
D(EM, {
  displayName: "Command<updateCodeBlockLanguageCommand>",
  group: "CodeBlock"
});
var Tc = xt("codeBlockKeymap", { CreateCodeBlock: {
  shortcuts: "Mod-Alt-c",
  command: (t) => {
    const e = t.get(ye);
    return () => e.call(vc.key);
  }
} });
D(Tc.ctx, {
  displayName: "KeymapCtx<codeBlock>",
  group: "CodeBlock"
});
D(Tc.shortcuts, {
  displayName: "Keymap<codeBlock>",
  group: "CodeBlock"
});
var Nc = Ut("image");
D(Nc, {
  displayName: "Attr<image>",
  group: "Image"
});
var Wi = Ie("image", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw rn(e);
      return {
        src: e.getAttribute("src") || "",
        alt: e.getAttribute("alt") || "",
        title: e.getAttribute("title") || e.getAttribute("alt") || ""
      };
    }
  }],
  toDOM: (e) => ["img", {
    ...t.get(Nc.key)(e),
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
D(Wi.node, {
  displayName: "NodeSchema<image>",
  group: "Image"
});
D(Wi.ctx, {
  displayName: "NodeSchemaCtx<image>",
  group: "Image"
});
var Hg = ie("InsertImage", (t) => (e = {}) => (n, r) => {
  if (!r) return !0;
  const { src: i = "", alt: o = "", title: s = "" } = e, l = Wi.type(t).create({
    src: i,
    alt: o,
    title: s
  });
  return l && r(n.tr.replaceSelectionWith(l).scrollIntoView()), !0;
});
D(Hg, {
  displayName: "Command<insertImageCommand>",
  group: "Image"
});
var jg = ie("UpdateImage", (t) => (e = {}) => (n, r) => {
  const i = fC(n.selection, Wi.type(t));
  if (!i) return !1;
  const { node: o, pos: s } = i, l = { ...o.attrs }, { src: a, alt: u, title: c } = e;
  return a !== void 0 && (l.src = a), u !== void 0 && (l.alt = u), c !== void 0 && (l.title = c), r == null || r(n.tr.setNodeMarkup(s, void 0, l).scrollIntoView()), !0;
});
D(jg, {
  displayName: "Command<updateImageCommand>",
  group: "Image"
});
var OM = wt((t) => new At(/!\[(.*?)]\((.*?)\s*(?="|\))"?([^"]+)?"?\)/, (e, n, r, i) => {
  const [o, s, l = "", a] = n;
  return o ? e.tr.replaceWith(r, i, Wi.type(t).create({
    src: l,
    alt: s,
    title: a
  })) : null;
}));
D(OM, {
  displayName: "InputRule<insertImageInputRule>",
  group: "Image"
});
var fl = Ut("hardbreak", (t) => ({
  "data-type": "hardbreak",
  "data-is-inline": t.attrs.isInline
}));
D(fl, {
  displayName: "Attr<hardbreak>",
  group: "Hardbreak"
});
var Dr = Ie("hardbreak", (t) => ({
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
    t.get(fl.key)(e),
    " "
  ] : ["br", t.get(fl.key)(e)],
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
D(Dr.node, {
  displayName: "NodeSchema<hardbreak>",
  group: "Hardbreak"
});
D(Dr.ctx, {
  displayName: "NodeSchemaCtx<hardbreak>",
  group: "Hardbreak"
});
var Ic = ie("InsertHardbreak", (t) => () => (e, n) => {
  var o;
  const { selection: r, tr: i } = e;
  if (!(r instanceof Z)) return !1;
  if (r.empty) {
    const s = r.$from.node();
    if (s.childCount > 0 && ((o = s.lastChild) == null ? void 0 : o.type.name) === "hardbreak")
      return n == null || n(i.replaceRangeWith(r.to - 1, r.to, e.schema.node("paragraph")).setSelection(oe.near(i.doc.resolve(r.to))).scrollIntoView()), !0;
  }
  return n == null || n(i.setMeta("hardbreak", !0).replaceSelectionWith(Dr.type(t).create()).scrollIntoView()), !0;
});
D(Ic, {
  displayName: "Command<insertHardbreakCommand>",
  group: "Hardbreak"
});
var Ac = xt("hardbreakKeymap", { InsertHardbreak: {
  shortcuts: "Shift-Enter",
  command: (t) => {
    const e = t.get(ye);
    return () => e.call(Ic.key);
  }
} });
D(Ac.ctx, {
  displayName: "KeymapCtx<hardbreak>",
  group: "Hardbreak"
});
D(Ac.shortcuts, {
  displayName: "Keymap<hardbreak>",
  group: "Hardbreak"
});
var Ec = Ut("hr");
D(Ec, {
  displayName: "Attr<hr>",
  group: "Hr"
});
var hs = Ie("hr", (t) => ({
  group: "block",
  parseDOM: [{ tag: "hr" }],
  toDOM: (e) => ["hr", t.get(Ec.key)(e)],
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
D(hs.node, {
  displayName: "NodeSchema<hr>",
  group: "Hr"
});
D(hs.ctx, {
  displayName: "NodeSchemaCtx<hr>",
  group: "Hr"
});
var Wg = wt((t) => new At(/^(?:---|___\s|\*\*\*\s)$/, (e, n, r, i) => {
  const { tr: o } = e;
  return n[0] && o.replaceWith(r - 1, i, hs.type(t).create()), o;
}));
D(Wg, {
  displayName: "InputRule<insertHrInputRule>",
  group: "Hr"
});
var qg = ie("InsertHr", (t) => () => (e, n) => {
  if (!n) return !0;
  const r = nn.node.type(t).create(), { tr: i, selection: o } = e, { from: s } = o, l = hs.type(t).create();
  if (!l) return !0;
  const a = i.replaceSelectionWith(l).insert(s, r), u = oe.findFrom(a.doc.resolve(s), 1, !0);
  return u && n(a.setSelection(u).scrollIntoView()), !0;
});
D(qg, {
  displayName: "Command<insertHrCommand>",
  group: "Hr"
});
var Oc = Ut("bulletList");
D(Oc, {
  displayName: "Attr<bulletList>",
  group: "BulletList"
});
var qi = Ie("bullet_list", (t) => ({
  content: "listItem+",
  group: "block",
  attrs: { spread: {
    default: !1,
    validate: "boolean"
  } },
  parseDOM: [{
    tag: "ul",
    getAttrs: (e) => {
      if (!(e instanceof HTMLElement)) throw rn(e);
      return { spread: e.dataset.spread === "true" };
    }
  }],
  toDOM: (e) => [
    "ul",
    {
      ...t.get(Oc.key)(e),
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
D(qi.node, {
  displayName: "NodeSchema<bulletList>",
  group: "BulletList"
});
D(qi.ctx, {
  displayName: "NodeSchemaCtx<bulletList>",
  group: "BulletList"
});
var Kg = wt((t) => Uu(/^\s*([-+*])\s$/, qi.type(t)));
D(Kg, {
  displayName: "InputRule<wrapInBulletListInputRule>",
  group: "BulletList"
});
var Dc = ie("WrapInBulletList", (t) => () => Ku(qi.type(t)));
D(Dc, {
  displayName: "Command<wrapInBulletListCommand>",
  group: "BulletList"
});
var Rc = xt("bulletListKeymap", { WrapInBulletList: {
  shortcuts: "Mod-Alt-8",
  command: (t) => {
    const e = t.get(ye);
    return () => e.call(Dc.key);
  }
} });
D(Rc.ctx, {
  displayName: "KeymapCtx<bulletListKeymap>",
  group: "BulletList"
});
D(Rc.shortcuts, {
  displayName: "Keymap<bulletListKeymap>",
  group: "BulletList"
});
var Lc = Ut("orderedList");
D(Lc, {
  displayName: "Attr<orderedList>",
  group: "OrderedList"
});
var Ki = Ie("ordered_list", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw rn(e);
      return {
        spread: e.dataset.spread,
        order: e.hasAttribute("start") ? Number(e.getAttribute("start")) : 1
      };
    }
  }],
  toDOM: (e) => [
    "ol",
    {
      ...t.get(Lc.key)(e),
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
D(Ki.node, {
  displayName: "NodeSchema<orderedList>",
  group: "OrderedList"
});
D(Ki.ctx, {
  displayName: "NodeSchemaCtx<orderedList>",
  group: "OrderedList"
});
var Ug = wt((t) => Uu(/^\s*(\d+)\.\s$/, Ki.type(t), (e) => ({ order: Number(e[1]) }), (e, n) => n.childCount + n.attrs.order === Number(e[1])));
D(Ug, {
  displayName: "InputRule<wrapInOrderedListInputRule>",
  group: "OrderedList"
});
var Pc = ie("WrapInOrderedList", (t) => () => Ku(Ki.type(t)));
D(Pc, {
  displayName: "Command<wrapInOrderedListCommand>",
  group: "OrderedList"
});
var zc = xt("orderedListKeymap", { WrapInOrderedList: {
  shortcuts: "Mod-Alt-7",
  command: (t) => {
    const e = t.get(ye);
    return () => e.call(Pc.key);
  }
} });
D(zc.ctx, {
  displayName: "KeymapCtx<orderedList>",
  group: "OrderedList"
});
D(zc.shortcuts, {
  displayName: "Keymap<orderedList>",
  group: "OrderedList"
});
var Bc = Ut("listItem");
D(Bc, {
  displayName: "Attr<listItem>",
  group: "ListItem"
});
var En = Ie("list_item", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw rn(e);
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
      ...t.get(Bc.key)(e),
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
D(En.node, {
  displayName: "NodeSchema<listItem>",
  group: "ListItem"
});
D(En.ctx, {
  displayName: "NodeSchemaCtx<listItem>",
  group: "ListItem"
});
var Fc = ie("SinkListItem", (t) => () => SM(En.type(t)));
D(Fc, {
  displayName: "Command<sinkListItemCommand>",
  group: "ListItem"
});
var $c = ie("LiftListItem", (t) => () => Eg(En.type(t)));
D($c, {
  displayName: "Command<liftListItemCommand>",
  group: "ListItem"
});
var _c = ie("SplitListItem", (t) => () => wM(En.type(t)));
D(_c, {
  displayName: "Command<splitListItemCommand>",
  group: "ListItem"
});
function DM(t) {
  return (e, n, r) => {
    const { selection: i } = e;
    if (!(i instanceof Z)) return !1;
    const { empty: o, $from: s } = i;
    return !o || s.parentOffset !== 0 || s.node(-1).type !== En.type(t) ? !1 : Sm(e, n, r);
  };
}
var Vc = ie("LiftFirstListItem", (t) => () => DM(t));
D(Vc, {
  displayName: "Command<liftFirstListItemCommand>",
  group: "ListItem"
});
var Hc = xt("listItemKeymap", {
  NextListItem: {
    shortcuts: "Enter",
    command: (t) => {
      const e = t.get(ye);
      return () => e.call(_c.key);
    }
  },
  SinkListItem: {
    shortcuts: ["Tab", "Mod-]"],
    command: (t) => {
      const e = t.get(ye);
      return () => e.call(Fc.key);
    }
  },
  LiftListItem: {
    shortcuts: ["Shift-Tab", "Mod-["],
    command: (t) => {
      const e = t.get(ye);
      return () => e.call($c.key);
    }
  },
  LiftFirstListItem: {
    shortcuts: ["Backspace", "Delete"],
    command: (t) => {
      const e = t.get(ye);
      return () => e.call(Vc.key);
    }
  }
});
D(Hc.ctx, {
  displayName: "KeymapCtx<listItem>",
  group: "ListItem"
});
D(Hc.shortcuts, {
  displayName: "Keymap<listItem>",
  group: "ListItem"
});
var Jg = ic("text", () => ({
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
D(Jg, {
  displayName: "NodeSchema<text>",
  group: "Text"
});
var jc = Ut("html");
D(jc, {
  displayName: "Attr<html>",
  group: "Html"
});
var Wc = Ie("html", (t) => ({
  atom: !0,
  group: "inline",
  inline: !0,
  attrs: { value: {
    default: "",
    validate: "string"
  } },
  toDOM: (e) => {
    const n = document.createElement("span"), r = {
      ...t.get(jc.key)(e),
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
D(Wc.node, {
  displayName: "NodeSchema<html>",
  group: "Html"
});
D(Wc.ctx, {
  displayName: "NodeSchemaCtx<html>",
  group: "Html"
});
var RM = [
  Fg,
  mc,
  nn,
  Dl,
  kc,
  Kr,
  fl,
  Dr,
  xc,
  fs,
  Mc,
  ds,
  Ec,
  hs,
  Nc,
  Wi,
  Oc,
  qi,
  Lc,
  Ki,
  Bc,
  En,
  oc,
  ji,
  ac,
  cs,
  fc,
  Yn,
  pc,
  ci,
  jc,
  Wc,
  Jg
].flat(), LM = [
  _g,
  Kg,
  Ug,
  Vg,
  Wg,
  $g
].flat(), PM = [], zM = ie("IsMarkSelected", () => (t) => (e) => {
  if (!t) return !1;
  const { doc: n, selection: r } = e;
  return n.rangeHasMark(r.from, r.to, t);
}), BM = ie("IsNoteSelected", () => (t) => (e) => t ? dC(e, t).hasNode : !1), FM = ie("ClearTextInCurrentBlock", () => () => (t, e) => {
  let n = t.tr;
  const { $from: r, $to: i } = n.selection, { pos: o } = r, { pos: s } = i, l = o - r.node().content.size;
  return l < 0 ? !1 : (n = n.deleteRange(l, s), e == null || e(n), !0);
}), $M = ie("SetBlockType", () => (t) => (e, n) => {
  const { nodeType: r, attrs: i = null } = t ?? {};
  if (!r) return !1;
  const o = e.tr, { from: s, to: l } = o.selection;
  try {
    o.setBlockType(s, l, r, i);
  } catch {
    return !1;
  }
  return n == null || n(o), !0;
}), _M = ie("WrapInBlockType", () => (t) => (e, n) => {
  const { nodeType: r, attrs: i = null } = t ?? {};
  if (!r) return !1;
  let o = e.tr;
  try {
    const { $from: s, $to: l } = o.selection, a = s.blockRange(l), u = a && Vu(a, r, i);
    if (!u) return !1;
    o = o.wrap(a, u);
  } catch {
    return !1;
  }
  return n == null || n(o), !0;
}), VM = ie("AddBlockType", () => (t) => (e, n) => {
  const { nodeType: r, attrs: i = null } = t ?? {};
  if (!r) return !1;
  const o = e.tr;
  try {
    const s = r instanceof vn ? r : r.createAndFill(i);
    if (!s) return !1;
    o.replaceSelectionWith(s);
  } catch {
    return !1;
  }
  return n == null || n(o), !0;
}), HM = ie("SelectTextNearPos", () => (t) => (e, n) => {
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
}), jM = [
  gc,
  Cc,
  _n,
  bc,
  vc,
  Ic,
  qg,
  Hg,
  jg,
  Pc,
  Dc,
  Fc,
  _c,
  $c,
  Vc,
  sc,
  dc,
  uc,
  zg,
  Bg,
  zM,
  BM,
  FM,
  $M,
  _M,
  VM,
  HM
], WM = [
  Sc,
  Tc,
  Ac,
  wc,
  Hc,
  zc,
  Rc,
  yc,
  lc,
  hc,
  cc
].flat(), qc = ln("remarkAddOrderInList", () => () => (t) => {
  $i(t, "list", (e) => {
    if (e.ordered) {
      const n = e.start ?? 1;
      e.children.forEach((r, i) => {
        r.label = i + n;
      });
    }
  });
});
D(qc.plugin, {
  displayName: "Remark<remarkAddOrderInListPlugin>",
  group: "Remark"
});
D(qc.options, {
  displayName: "RemarkConfig<remarkAddOrderInListPlugin>",
  group: "Remark"
});
var Kc = ln("remarkLineBreak", () => () => (t) => {
  const e = /[\t ]*(?:\r?\n|\r)/g;
  $i(t, "text", (n, r, i) => {
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
D(Kc.plugin, {
  displayName: "Remark<remarkLineBreak>",
  group: "Remark"
});
D(Kc.options, {
  displayName: "RemarkConfig<remarkLineBreak>",
  group: "Remark"
});
var Uc = ln("remarkInlineLink", () => vM);
D(Uc.plugin, {
  displayName: "Remark<remarkInlineLinkPlugin>",
  group: "Remark"
});
D(Uc.options, {
  displayName: "RemarkConfig<remarkInlineLinkPlugin>",
  group: "Remark"
});
var qM = (t) => !!t.children, KM = (t) => t.type === "html";
function UM(t, e) {
  return n(t, 0, null)[0];
  function n(r, i, o) {
    if (qM(r)) {
      const s = [];
      for (let l = 0, a = r.children.length; l < a; l++) {
        const u = r.children[l];
        if (u) {
          const c = n(u, l, r);
          if (c) for (let f = 0, d = c.length; f < d; f++) {
            const h = c[f];
            h && s.push(h);
          }
        }
      }
      r.children = s;
    }
    return e(r, i, o);
  }
}
var JM = [
  "root",
  "blockquote",
  "listItem"
], Jc = ln("remarkHTMLTransformer", () => () => (t) => {
  UM(t, (e, n, r) => KM(e) ? (r && JM.includes(r.type) && (e.children = [{ ...e }], delete e.value, e.type = "paragraph"), [e]) : [e]);
});
D(Jc.plugin, {
  displayName: "Remark<remarkHtmlTransformer>",
  group: "Remark"
});
D(Jc.options, {
  displayName: "RemarkConfig<remarkHtmlTransformer>",
  group: "Remark"
});
var Gc = ln("remarkMarker", () => () => (t, e) => {
  const n = (r) => e.value.charAt(r.position.start.offset);
  $i(t, (r) => ["strong", "emphasis"].includes(r.type), (r) => {
    r.marker = n(r);
  });
});
D(Gc.plugin, {
  displayName: "Remark<remarkMarker>",
  group: "Remark"
});
D(Gc.options, {
  displayName: "RemarkConfig<remarkMarker>",
  group: "Remark"
});
var Gg = sn(() => {
  let t = !1;
  const e = new Be({
    key: new rt("MILKDOWN_INLINE_NODES_CURSOR"),
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
          }), Me.create(n.doc, [o, l]);
        }
        return Me.empty;
      }
    }
  });
  return e;
});
D(Gg, {
  displayName: "Prose<inlineNodesCursorPlugin>",
  group: "Prose"
});
var Yg = sn((t) => new Be({
  key: new rt("MILKDOWN_HARDBREAK_MARKS"),
  appendTransaction: (e, n, r) => {
    if (!e.length) return;
    const [i] = e;
    if (!i) return;
    const [o] = i.steps;
    if (i.getMeta("hardbreak")) {
      if (!(o instanceof Oe)) return;
      const { from: s } = o;
      return r.tr.setNodeMarkup(s, Dr.type(t), void 0, []);
    }
    if (o instanceof Cn) {
      let s = r.tr;
      const { from: l, to: a } = o;
      return r.doc.nodesBetween(l, a, (u, c) => {
        u.type === Dr.type(t) && (s = s.setNodeMarkup(c, Dr.type(t), void 0, []));
      }), s;
    }
  }
}));
D(Yg, {
  displayName: "Prose<hardbreakClearMarkPlugin>",
  group: "Prose"
});
var Yc = An(["table", "code_block"], "hardbreakFilterNodes");
D(Yc, {
  displayName: "Ctx<hardbreakFilterNodes>",
  group: "Prose"
});
var Qg = sn((t) => {
  const e = t.get(Yc.key);
  return new Be({
    key: new rt("MILKDOWN_HARDBREAK_FILTER"),
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
D(Qg, {
  displayName: "Prose<hardbreakFilterPlugin>",
  group: "Prose"
});
var Xg = sn((t) => {
  const e = new rt("MILKDOWN_HEADING_ID"), n = (r) => {
    if (r.composing) return;
    const i = t.get(Dl.key), o = r.state.tr.setMeta("addToHistory", !1);
    let s = !1;
    const l = {};
    r.state.doc.descendants((a, u) => {
      if (a.type === Kr.type(t)) {
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
  return new Be({
    key: e,
    view: (r) => (n(r), { update: (i, o) => {
      i.state.doc.eq(o.doc) || n(i);
    } })
  });
});
D(Xg, {
  displayName: "Prose<syncHeadingIdPlugin>",
  group: "Prose"
});
var Zg = sn((t) => {
  const e = (n, r, i) => {
    if (!i.selection || n.some((f) => f.getMeta("addToHistory") === !1 || !f.isGeneric)) return null;
    const o = Ki.type(t), s = qi.type(t), l = En.type(t), a = (f, d, h = 1) => {
      let p = !1;
      const k = `${d + h}.`;
      return f.label !== k && (f.label = k, p = !0), p;
    };
    let u = i.tr, c = !1;
    return i.doc.descendants((f, d, h, p) => {
      if (f.type === s) {
        const k = f.maybeChild(0);
        (k == null ? void 0 : k.type) === l && k.attrs.listType === "ordered" && (c = !0, u.setNodeMarkup(d, o, { spread: "true" }), f.descendants((w, b, L, E) => {
          if (w.type === l) {
            const j = { ...w.attrs };
            a(j, E) && (u = u.setNodeMarkup(b, void 0, j));
          }
          return !1;
        }));
      } else if (f.type === l && (h == null ? void 0 : h.type) === o) {
        const k = { ...f.attrs };
        let w = !1;
        k.listType !== "ordered" && (k.listType = "ordered", w = !0), h != null && h.maybeChild(0) && (w = a(k, p, (h == null ? void 0 : h.attrs.order) ?? 1)), w && (u = u.setNodeMarkup(d, void 0, k), c = !0);
      }
    }), c ? u.setMeta("addToHistory", !1) : null;
  };
  return new Be({
    key: new rt("MILKDOWN_KEEP_LIST_ORDER"),
    appendTransaction: e
  });
});
D(Zg, {
  displayName: "Prose<syncListOrderPlugin>",
  group: "Prose"
});
var GM = [
  Yg,
  Yc,
  Qg,
  Gg,
  qc,
  Uc,
  Kc,
  Jc,
  Gc,
  Ol,
  Xg,
  Zg
].flat(), YM = [
  RM,
  LM,
  PM,
  jM,
  WM,
  GM
].flat();
let gu, yu;
if (typeof WeakMap < "u") {
  let t = /* @__PURE__ */ new WeakMap();
  gu = (e) => t.get(e), yu = (e, n) => (t.set(e, n), n);
} else {
  const t = [];
  let n = 0;
  gu = (r) => {
    for (let i = 0; i < t.length; i += 2) if (t[i] == r) return t[i + 1];
  }, yu = (r, i) => (n == 10 && (n = 0), t[n++] = r, t[n++] = i);
}
var be = class {
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
    return gu(t) || yu(t, QM(t));
  }
};
function QM(t) {
  if (t.type.spec.tableRole != "table") throw new RangeError("Not a table node: " + t.type.name);
  const e = XM(t), n = t.childCount, r = [];
  let i = 0, o = null;
  const s = [];
  for (let u = 0, c = e * n; u < c; u++) r[u] = 0;
  for (let u = 0, c = 0; u < n; u++) {
    const f = t.child(u);
    c++;
    for (let p = 0; ; p++) {
      for (; i < r.length && r[i] != 0; ) i++;
      if (p == f.childCount) break;
      const k = f.child(p), { colspan: w, rowspan: b, colwidth: L } = k.attrs;
      for (let E = 0; E < b; E++) {
        if (E + u >= n) {
          (o || (o = [])).push({
            type: "overlong_rowspan",
            pos: c,
            n: b - E
          });
          break;
        }
        const j = i + E * e;
        for (let H = 0; H < w; H++) {
          r[j + H] == 0 ? r[j + H] = c : (o || (o = [])).push({
            type: "collision",
            row: u,
            pos: c,
            n: w - H
          });
          const T = L && L[H];
          if (T) {
            const z = (j + H) % e * 2, U = s[z];
            U == null || U != T && s[z + 1] == 1 ? (s[z] = T, s[z + 1] = 1) : U == T && s[z + 1]++;
          }
        }
      }
      i += w, c += k.nodeSize;
    }
    const d = (u + 1) * e;
    let h = 0;
    for (; i < d; ) r[i++] == 0 && h++;
    h && (o || (o = [])).push({
      type: "missing",
      row: u,
      n: h
    }), c++;
  }
  (e === 0 || n === 0) && (o || (o = [])).push({ type: "zero_sized" });
  const l = new be(e, n, r, o);
  let a = !1;
  for (let u = 0; !a && u < s.length; u += 2) s[u] != null && s[u + 1] < n && (a = !0);
  return a && ZM(l, s, t), l;
}
function XM(t) {
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
function ZM(t, e, n) {
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
      c != null && (!a.colwidth || a.colwidth[u] != c) && ((l || (l = ev(a)))[u] = c);
    }
    l && t.problems.unshift({
      type: "colwidth mismatch",
      pos: o,
      colwidth: l
    });
  }
}
function ev(t) {
  if (t.colwidth) return t.colwidth.slice();
  const e = [];
  for (let n = 0; n < t.colspan; n++) e.push(0);
  return e;
}
function mh(t, e) {
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
function gh(t, e) {
  const n = {};
  t.attrs.colspan != 1 && (n.colspan = t.attrs.colspan), t.attrs.rowspan != 1 && (n.rowspan = t.attrs.rowspan), t.attrs.colwidth && (n["data-colwidth"] = t.attrs.colwidth.join(","));
  for (const r in e) {
    const i = e[r].setDOMAttr;
    i && i(t.attrs[r], n);
  }
  return n;
}
function tv(t) {
  if (t !== null) {
    if (!Array.isArray(t)) throw new TypeError("colwidth must be null or an array");
    for (const e of t) if (typeof e != "number") throw new TypeError("colwidth must be null or an array of numbers");
  }
}
function nv(t) {
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
      validate: tv
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
        getAttrs: (r) => mh(r, e)
      }],
      toDOM(r) {
        return [
          "td",
          gh(r, e),
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
        getAttrs: (r) => mh(r, e)
      }],
      toDOM(r) {
        return [
          "th",
          gh(r, e),
          0
        ];
      }
    }
  };
}
function ut(t) {
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
const jn = new rt("selectingCells");
function zi(t) {
  for (let e = t.depth - 1; e > 0; e--) if (t.node(e).type.spec.tableRole == "row") return t.node(0).resolve(t.before(e + 1));
  return null;
}
function Ve(t) {
  const e = t.selection.$head;
  for (let n = e.depth; n > 0; n--) if (e.node(n).type.spec.tableRole == "row") return !0;
  return !1;
}
function Rl(t) {
  const e = t.selection;
  if ("$anchorCell" in e && e.$anchorCell) return e.$anchorCell.pos > e.$headCell.pos ? e.$anchorCell : e.$headCell;
  if ("node" in e && e.node && e.node.type.spec.tableRole == "cell") return e.$anchor;
  const n = zi(e.$head) || rv(e.$head);
  if (n) return n;
  throw new RangeError(`No cell found around position ${e.head}`);
}
function rv(t) {
  for (let e = t.nodeAfter, n = t.pos; e; e = e.firstChild, n++) {
    const r = e.type.spec.tableRole;
    if (r == "cell" || r == "header_cell") return t.doc.resolve(n);
  }
  for (let e = t.nodeBefore, n = t.pos; e; e = e.lastChild, n--) {
    const r = e.type.spec.tableRole;
    if (r == "cell" || r == "header_cell") return t.doc.resolve(n - e.nodeSize);
  }
}
function ku(t) {
  return t.parent.type.spec.tableRole == "row" && !!t.nodeAfter;
}
function iv(t) {
  return t.node(0).resolve(t.pos + t.nodeAfter.nodeSize);
}
function Qc(t, e) {
  return t.depth == e.depth && t.pos >= e.start(-1) && t.pos <= e.end(-1);
}
function ey(t, e, n) {
  const r = t.node(-1), i = be.get(r), o = t.start(-1), s = i.nextCell(t.pos - o, e, n);
  return s == null ? null : t.node(0).resolve(o + s);
}
function jr(t, e, n = 1) {
  const r = {
    ...t,
    colspan: t.colspan - n
  };
  return r.colwidth && (r.colwidth = r.colwidth.slice(), r.colwidth.splice(e, n), r.colwidth.some((i) => i > 0) || (r.colwidth = null)), r;
}
function ov(t, e, n = 1) {
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
function sv(t, e, n) {
  const r = ut(e.type.schema).header_cell;
  for (let i = 0; i < t.height; i++) if (e.nodeAt(t.map[n + i * t.width]).type != r) return !1;
  return !0;
}
var ve = class hn extends oe {
  constructor(e, n = e) {
    const r = e.node(-1), i = be.get(r), o = e.start(-1), s = i.rectBetween(e.pos - o, n.pos - o), l = e.node(0), a = i.cellsInRect(s).filter((c) => c != n.pos - o);
    a.unshift(n.pos - o);
    const u = a.map((c) => {
      const f = r.nodeAt(c);
      if (!f) throw new RangeError(`No cell with offset ${c} found`);
      const d = o + c + 1;
      return new bm(l.resolve(d), l.resolve(d + f.content.size));
    });
    super(u[0].$from, u[0].$to, u), this.$anchorCell = e, this.$headCell = n;
  }
  map(e, n) {
    const r = e.resolve(n.map(this.$anchorCell.pos)), i = e.resolve(n.map(this.$headCell.pos));
    if (ku(r) && ku(i) && Qc(r, i)) {
      const o = this.$anchorCell.node(-1) != r.node(-1);
      return o && this.isRowSelection() ? hn.rowSelection(r, i) : o && this.isColSelection() ? hn.colSelection(r, i) : new hn(r, i);
    }
    return Z.between(r, i);
  }
  content() {
    const e = this.$anchorCell.node(-1), n = be.get(e), r = this.$anchorCell.start(-1), i = n.rectBetween(this.$anchorCell.pos - r, this.$headCell.pos - r), o = {}, s = [];
    for (let a = i.top; a < i.bottom; a++) {
      const u = [];
      for (let c = a * n.width + i.left, f = i.left; f < i.right; f++, c++) {
        const d = n.map[c];
        if (o[d]) continue;
        o[d] = !0;
        const h = n.findCell(d);
        let p = e.nodeAt(d);
        if (!p) throw new RangeError(`No cell with offset ${d} found`);
        const k = i.left - h.left, w = h.right - i.right;
        if (k > 0 || w > 0) {
          let b = p.attrs;
          if (k > 0 && (b = jr(b, 0, k)), w > 0 && (b = jr(b, b.colspan - w, w)), h.left < i.left) {
            if (p = p.type.createAndFill(b), !p) throw new RangeError(`Could not create cell with attrs ${JSON.stringify(b)}`);
          } else p = p.type.create(b, p.content);
        }
        if (h.top < i.top || h.bottom > i.bottom) {
          const b = {
            ...p.attrs,
            rowspan: Math.min(h.bottom, i.bottom) - Math.max(h.top, i.top)
          };
          h.top < i.top ? p = p.type.createAndFill(b) : p = p.type.create(b, p.content);
        }
        u.push(p);
      }
      s.push(e.child(a).copy(R.from(u)));
    }
    const l = this.isColSelection() && this.isRowSelection() ? e : s;
    return new _(R.from(l), 1, 1);
  }
  replace(e, n = _.empty) {
    const r = e.steps.length, i = this.ranges;
    for (let s = 0; s < i.length; s++) {
      const { $from: l, $to: a } = i[s], u = e.mapping.slice(r);
      e.replace(u.map(l.pos), u.map(a.pos), s ? _.empty : n);
    }
    const o = oe.findFrom(e.doc.resolve(e.mapping.slice(r).map(this.to)), -1);
    o && e.setSelection(o);
  }
  replaceWith(e, n) {
    this.replace(e, new _(R.from(n), 0, 0));
  }
  forEachCell(e) {
    const n = this.$anchorCell.node(-1), r = be.get(n), i = this.$anchorCell.start(-1), o = r.cellsInRect(r.rectBetween(this.$anchorCell.pos - i, this.$headCell.pos - i));
    for (let s = 0; s < o.length; s++) e(n.nodeAt(o[s]), i + o[s]);
  }
  isColSelection() {
    const e = this.$anchorCell.index(-1), n = this.$headCell.index(-1);
    if (Math.min(e, n) > 0) return !1;
    const r = e + this.$anchorCell.nodeAfter.attrs.rowspan, i = n + this.$headCell.nodeAfter.attrs.rowspan;
    return Math.max(r, i) == this.$headCell.node(-1).childCount;
  }
  static colSelection(e, n = e) {
    const r = e.node(-1), i = be.get(r), o = e.start(-1), s = i.findCell(e.pos - o), l = i.findCell(n.pos - o), a = e.node(0);
    return s.top <= l.top ? (s.top > 0 && (e = a.resolve(o + i.map[s.left])), l.bottom < i.height && (n = a.resolve(o + i.map[i.width * (i.height - 1) + l.right - 1]))) : (l.top > 0 && (n = a.resolve(o + i.map[l.left])), s.bottom < i.height && (e = a.resolve(o + i.map[i.width * (i.height - 1) + s.right - 1]))), new hn(e, n);
  }
  isRowSelection() {
    const e = this.$anchorCell.node(-1), n = be.get(e), r = this.$anchorCell.start(-1), i = n.colCount(this.$anchorCell.pos - r), o = n.colCount(this.$headCell.pos - r);
    if (Math.min(i, o) > 0) return !1;
    const s = i + this.$anchorCell.nodeAfter.attrs.colspan, l = o + this.$headCell.nodeAfter.attrs.colspan;
    return Math.max(s, l) == n.width;
  }
  eq(e) {
    return e instanceof hn && e.$anchorCell.pos == this.$anchorCell.pos && e.$headCell.pos == this.$headCell.pos;
  }
  static rowSelection(e, n = e) {
    const r = e.node(-1), i = be.get(r), o = e.start(-1), s = i.findCell(e.pos - o), l = i.findCell(n.pos - o), a = e.node(0);
    return s.left <= l.left ? (s.left > 0 && (e = a.resolve(o + i.map[s.top * i.width])), l.right < i.width && (n = a.resolve(o + i.map[i.width * (l.top + 1) - 1]))) : (l.left > 0 && (n = a.resolve(o + i.map[l.top * i.width])), s.right < i.width && (e = a.resolve(o + i.map[i.width * (s.top + 1) - 1]))), new hn(e, n);
  }
  toJSON() {
    return {
      type: "cell",
      anchor: this.$anchorCell.pos,
      head: this.$headCell.pos
    };
  }
  static fromJSON(e, n) {
    return new hn(e.resolve(n.anchor), e.resolve(n.head));
  }
  static create(e, n, r = n) {
    return new hn(e.resolve(n), e.resolve(r));
  }
  getBookmark() {
    return new lv(this.$anchorCell.pos, this.$headCell.pos);
  }
};
ve.prototype.visible = !1;
oe.jsonID("cell", ve);
var lv = class ty {
  constructor(e, n) {
    this.anchor = e, this.head = n;
  }
  map(e) {
    return new ty(e.map(this.anchor), e.map(this.head));
  }
  resolve(e) {
    const n = e.resolve(this.anchor), r = e.resolve(this.head);
    return n.parent.type.spec.tableRole == "row" && r.parent.type.spec.tableRole == "row" && n.index() < n.parent.childCount && r.index() < r.parent.childCount && Qc(n, r) ? new ve(n, r) : oe.near(r, 1);
  }
};
function av(t) {
  if (!(t.selection instanceof ve)) return null;
  const e = [];
  return t.selection.forEachCell((n, r) => {
    e.push(ze.node(r, r + n.nodeSize, { class: "selectedCell" }));
  }), Me.create(t.doc, e);
}
function uv({ $from: t, $to: e }) {
  if (t.pos == e.pos || t.pos < e.pos - 6) return !1;
  let n = t.pos, r = e.pos, i = t.depth;
  for (; i >= 0 && !(t.after(i + 1) < t.end(i)); i--, n++) ;
  for (let o = e.depth; o >= 0 && !(e.before(o + 1) > e.start(o)); o--, r--) ;
  return n == r && /row|table/.test(t.node(i).type.spec.tableRole);
}
function cv({ $from: t, $to: e }) {
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
function fv(t, e, n) {
  const r = (e || t).selection, i = (e || t).doc;
  let o, s;
  if (r instanceof re && (s = r.node.type.spec.tableRole)) {
    if (s == "cell" || s == "header_cell") o = ve.create(i, r.from);
    else if (s == "row") {
      const l = i.resolve(r.from + 1);
      o = ve.rowSelection(l, l);
    } else if (!n) {
      const l = be.get(r.node), a = r.from + 1, u = a + l.map[l.width * l.height - 1];
      o = ve.create(i, a + 1, u);
    }
  } else r instanceof Z && uv(r) ? o = Z.create(i, r.from) : r instanceof Z && cv(r) && (o = Z.create(i, r.$from.start(), r.$from.end()));
  return o && (e || (e = t.tr)).setSelection(o), e;
}
const dv = new rt("fix-tables");
function ny(t, e, n, r) {
  const i = t.childCount, o = e.childCount;
  e: for (let s = 0, l = 0; s < o; s++) {
    const a = e.child(s);
    for (let u = l, c = Math.min(i, s + 3); u < c; u++) if (t.child(u) == a) {
      l = u + 1, n += a.nodeSize;
      continue e;
    }
    r(a, n), l < i && t.child(l).sameMarkup(a) ? ny(t.child(l), a, n + 1, r) : a.nodesBetween(0, a.content.size, r, n + 1), n += a.nodeSize;
  }
}
function hv(t, e) {
  let n;
  const r = (i, o) => {
    i.type.spec.tableRole == "table" && (n = pv(t, i, o, n));
  };
  return e ? e.doc != t.doc && ny(e.doc, t.doc, 0, r) : t.doc.descendants(r), n;
}
function pv(t, e, n, r) {
  const i = be.get(e);
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
      for (let d = 0; d < f.rowspan; d++) o[u.row + d] += u.n;
      r.setNodeMarkup(r.mapping.map(n + 1 + u.pos), null, jr(f, f.colspan - u.n, u.n));
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
    const c = e.child(a), f = u + c.nodeSize, d = o[a];
    if (d > 0) {
      let h = "cell";
      c.firstChild && (h = c.firstChild.type.spec.tableRole);
      const p = [];
      for (let w = 0; w < d; w++) {
        const b = ut(t.schema)[h].createAndFill();
        b && p.push(b);
      }
      const k = (a == 0 || s == a - 1) && l == a ? u + 1 : f - 1;
      r.insert(r.mapping.map(k), p);
    }
    u = f;
  }
  return r.setMeta(dv, { fixTables: !0 });
}
function ry(t) {
  const e = be.get(t), n = [], r = e.height, i = e.width;
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
function iy(t, e) {
  const n = [], r = be.get(t), i = r.height, o = r.width;
  for (let s = 0; s < i; s++) {
    const l = t.child(s), a = [];
    for (let c = 0; c < o; c++) {
      const f = e[s][c];
      if (!f) continue;
      const d = r.map[s * r.width + c], h = t.nodeAt(d);
      if (!h) continue;
      const p = h.type.createChecked(f.attrs, f.content, f.marks);
      a.push(p);
    }
    const u = l.type.createChecked(l.attrs, a, l.marks);
    n.push(u);
  }
  return t.type.createChecked(t.attrs, n, t.marks);
}
function oy(t, e, n, r) {
  const i = e[0] > n[0] ? -1 : 1, o = t.splice(e[0], e.length), s = o.length % 2 === 0 ? 1 : 0;
  let l;
  return l = i === -1 ? n[0] : n[n.length - 1] - s, t.splice(l, 0, ...o), t;
}
function ps(t) {
  return mv((e) => e.type.spec.tableRole === "table", t);
}
function mv(t, e) {
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
function ni(t, e) {
  const n = ps(e.$from);
  if (!n) return;
  const r = be.get(n.node);
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
function ri(t, e) {
  const n = ps(e.$from);
  if (!n) return;
  const r = be.get(n.node);
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
function yh(t, e, n = e) {
  let r = e, i = n;
  for (let c = e; c >= 0; c--) {
    const f = ni(c, t.selection);
    f && f.forEach((d) => {
      const h = d.node.attrs.colspan + c - 1;
      h >= r && (r = c), h > i && (i = h);
    });
  }
  for (let c = e; c <= i; c++) {
    const f = ni(c, t.selection);
    f && f.forEach((d) => {
      const h = d.node.attrs.colspan + c - 1;
      d.node.attrs.colspan > 1 && h > i && (i = h);
    });
  }
  const o = [];
  for (let c = r; c <= i; c++) {
    const f = ni(c, t.selection);
    f && f.length > 0 && o.push(c);
  }
  r = o[0], i = o[o.length - 1];
  const s = ni(r, t.selection), l = ri(0, t.selection);
  if (!s || !l) return;
  const a = t.doc.resolve(s[s.length - 1].pos);
  let u;
  for (let c = i; c >= r; c--) {
    const f = ni(c, t.selection);
    if (f && f.length > 0) {
      for (let d = l.length - 1; d >= 0; d--) if (l[d].pos === f[0].pos) {
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
function kh(t, e, n = e) {
  let r = e, i = n;
  for (let c = e; c >= 0; c--) {
    const f = ri(c, t.selection);
    f && f.forEach((d) => {
      const h = d.node.attrs.rowspan + c - 1;
      h >= r && (r = c), h > i && (i = h);
    });
  }
  for (let c = e; c <= i; c++) {
    const f = ri(c, t.selection);
    f && f.forEach((d) => {
      const h = d.node.attrs.rowspan + c - 1;
      d.node.attrs.rowspan > 1 && h > i && (i = h);
    });
  }
  const o = [];
  for (let c = r; c <= i; c++) {
    const f = ri(c, t.selection);
    f && f.length > 0 && o.push(c);
  }
  r = o[0], i = o[o.length - 1];
  const s = ri(r, t.selection), l = ni(0, t.selection);
  if (!s || !l) return;
  const a = t.doc.resolve(s[s.length - 1].pos);
  let u;
  for (let c = i; c >= r; c--) {
    const f = ri(c, t.selection);
    if (f && f.length > 0) {
      for (let d = l.length - 1; d >= 0; d--) if (l[d].pos === f[0].pos) {
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
function bh(t) {
  return t[0].map((e, n) => t.map((r) => r[n]));
}
function gv(t) {
  var e, n;
  const { tr: r, originIndex: i, targetIndex: o, select: s, pos: l } = t, a = ps(r.doc.resolve(l));
  if (!a) return !1;
  const u = (e = yh(r, i)) === null || e === void 0 ? void 0 : e.indexes, c = (n = yh(r, o)) === null || n === void 0 ? void 0 : n.indexes;
  if (!u || !c || u.includes(o)) return !1;
  const f = yv(a.node, u, c);
  if (r.replaceWith(a.pos, a.pos + a.node.nodeSize, f), !s) return !0;
  const d = be.get(f), h = a.start, p = o, k = d.positionAt(d.height - 1, p, f), w = r.doc.resolve(h + k), b = d.positionAt(0, p, f), L = r.doc.resolve(h + b);
  return r.setSelection(ve.colSelection(w, L)), !0;
}
function yv(t, e, n, r) {
  let i = bh(ry(t));
  return i = oy(i, e, n), i = bh(i), iy(t, i);
}
function kv(t) {
  var e, n;
  const { tr: r, originIndex: i, targetIndex: o, select: s, pos: l } = t, a = ps(r.doc.resolve(l));
  if (!a) return !1;
  const u = (e = kh(r, i)) === null || e === void 0 ? void 0 : e.indexes, c = (n = kh(r, o)) === null || n === void 0 ? void 0 : n.indexes;
  if (!u || !c || u.includes(o)) return !1;
  const f = bv(a.node, u, c);
  if (r.replaceWith(a.pos, a.pos + a.node.nodeSize, f), !s) return !0;
  const d = be.get(f), h = a.start, p = o, k = d.positionAt(p, d.width - 1, f), w = r.doc.resolve(h + k), b = d.positionAt(p, 0, f), L = r.doc.resolve(h + b);
  return r.setSelection(ve.rowSelection(w, L)), !0;
}
function bv(t, e, n, r) {
  let i = ry(t);
  return i = oy(i, e, n), iy(t, i);
}
function an(t) {
  const e = t.selection, n = Rl(t), r = n.node(-1), i = n.start(-1), o = be.get(r);
  return {
    ...e instanceof ve ? o.rectBetween(e.$anchorCell.pos - i, e.$headCell.pos - i) : o.findCell(n.pos - i),
    tableStart: i,
    map: o,
    table: r
  };
}
function sy(t, { map: e, tableStart: n, table: r }, i) {
  let o = i > 0 ? -1 : 0;
  sv(e, r, i + o) && (o = i == 0 || i == e.width ? null : 0);
  for (let s = 0; s < e.height; s++) {
    const l = s * e.width + i;
    if (i > 0 && i < e.width && e.map[l - 1] == e.map[l]) {
      const a = e.map[l], u = r.nodeAt(a);
      t.setNodeMarkup(t.mapping.map(n + a), null, ov(u.attrs, i - e.colCount(a))), s += u.attrs.rowspan - 1;
    } else {
      const a = o == null ? ut(r.type.schema).cell : r.nodeAt(e.map[l + o]).type, u = e.positionAt(s, i, r);
      t.insert(t.mapping.map(n + u), a.createAndFill());
    }
  }
  return t;
}
function ly(t, e) {
  if (!Ve(t)) return !1;
  if (e) {
    const n = an(t);
    e(sy(t.tr, n, n.left));
  }
  return !0;
}
function ay(t, e) {
  if (!Ve(t)) return !1;
  if (e) {
    const n = an(t);
    e(sy(t.tr, n, n.right));
  }
  return !0;
}
function wv(t, { map: e, table: n, tableStart: r }, i) {
  const o = t.mapping.maps.length;
  for (let s = 0; s < e.height; ) {
    const l = s * e.width + i, a = e.map[l], u = n.nodeAt(a), c = u.attrs;
    if (i > 0 && e.map[l - 1] == a || i < e.width - 1 && e.map[l + 1] == a) t.setNodeMarkup(t.mapping.slice(o).map(r + a), null, jr(c, i - e.colCount(a)));
    else {
      const f = t.mapping.slice(o).map(r + a);
      t.delete(f, f + u.nodeSize);
    }
    s += c.rowspan;
  }
}
function uy(t, e) {
  if (!Ve(t)) return !1;
  if (e) {
    const n = an(t), r = t.tr;
    if (n.left == 0 && n.right == n.map.width) return !1;
    for (let i = n.right - 1; wv(r, n, i), i != n.left; i--) {
      const o = n.tableStart ? r.doc.nodeAt(n.tableStart - 1) : r.doc;
      if (!o) throw new RangeError("No table found");
      n.table = o, n.map = be.get(o);
    }
    e(r);
  }
  return !0;
}
function xv(t, e, n) {
  var r;
  const i = ut(e.type.schema).header_cell;
  for (let o = 0; o < t.width; o++) if (((r = e.nodeAt(t.map[o + n * t.width])) === null || r === void 0 ? void 0 : r.type) != i) return !1;
  return !0;
}
function cy(t, { map: e, tableStart: n, table: r }, i) {
  let o = n;
  for (let u = 0; u < i; u++) o += r.child(u).nodeSize;
  const s = [];
  let l = i > 0 ? -1 : 0;
  xv(e, r, i + l) && (l = i == 0 || i == e.height ? null : 0);
  for (let u = 0, c = e.width * i; u < e.width; u++, c++) if (i > 0 && i < e.height && e.map[c] == e.map[c - e.width]) {
    const f = e.map[c], d = r.nodeAt(f).attrs;
    t.setNodeMarkup(n + f, null, {
      ...d,
      rowspan: d.rowspan + 1
    }), u += d.colspan - 1;
  } else {
    var a;
    const f = l == null ? ut(r.type.schema).cell : (a = r.nodeAt(e.map[c + l * e.width])) === null || a === void 0 ? void 0 : a.type, d = f == null ? void 0 : f.createAndFill();
    d && s.push(d);
  }
  return t.insert(o, ut(r.type.schema).row.create(null, s)), t;
}
function Cv(t, e) {
  if (!Ve(t)) return !1;
  if (e) {
    const n = an(t);
    e(cy(t.tr, n, n.top));
  }
  return !0;
}
function Sv(t, e) {
  if (!Ve(t)) return !1;
  if (e) {
    const n = an(t);
    e(cy(t.tr, n, n.bottom));
  }
  return !0;
}
function Mv(t, { map: e, table: n, tableStart: r }, i) {
  let o = 0;
  for (let u = 0; u < i; u++) o += n.child(u).nodeSize;
  const s = o + n.child(i).nodeSize, l = t.mapping.maps.length;
  t.delete(o + r, s + r);
  const a = /* @__PURE__ */ new Set();
  for (let u = 0, c = i * e.width; u < e.width; u++, c++) {
    const f = e.map[c];
    if (!a.has(f)) {
      if (a.add(f), i > 0 && f == e.map[c - e.width]) {
        const d = n.nodeAt(f).attrs;
        t.setNodeMarkup(t.mapping.slice(l).map(f + r), null, {
          ...d,
          rowspan: d.rowspan - 1
        }), u += d.colspan - 1;
      } else if (i < e.height && f == e.map[c + e.width]) {
        const d = n.nodeAt(f), h = d.attrs, p = d.type.create({
          ...h,
          rowspan: d.attrs.rowspan - 1
        }, d.content), k = e.positionAt(i + 1, u, n);
        t.insert(t.mapping.slice(l).map(r + k), p), u += h.colspan - 1;
      }
    }
  }
}
function fy(t, e) {
  if (!Ve(t)) return !1;
  if (e) {
    const n = an(t), r = t.tr;
    if (n.top == 0 && n.bottom == n.map.height) return !1;
    for (let i = n.bottom - 1; Mv(r, n, i), i != n.top; i--) {
      const o = n.tableStart ? r.doc.nodeAt(n.tableStart - 1) : r.doc;
      if (!o) throw new RangeError("No table found");
      n.table = o, n.map = be.get(n.table);
    }
    e(r);
  }
  return !0;
}
function vv(t, e) {
  return function(n, r) {
    if (!Ve(n)) return !1;
    const i = Rl(n);
    if (i.nodeAfter.attrs[t] === e) return !1;
    if (r) {
      const o = n.tr;
      n.selection instanceof ve ? n.selection.forEachCell((s, l) => {
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
function Tv(t) {
  return function(e, n) {
    if (!Ve(e)) return !1;
    if (n) {
      const r = ut(e.schema), i = an(e), o = e.tr, s = i.map.cellsInRect(t == "column" ? {
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
function wh(t, e, n) {
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
function Xc(t, e) {
  return e = e || { useDeprecatedLogic: !1 }, e.useDeprecatedLogic ? Tv(t) : function(n, r) {
    if (!Ve(n)) return !1;
    if (r) {
      const i = ut(n.schema), o = an(n), s = n.tr, l = wh("row", o, i), a = wh("column", o, i), u = (t === "column" ? l : t === "row" && a) ? 1 : 0, c = t == "column" ? {
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
      o.map.cellsInRect(c).forEach((d) => {
        const h = d + o.tableStart, p = s.doc.nodeAt(h);
        p && s.setNodeMarkup(h, f, p.attrs);
      }), r(s);
    }
    return !0;
  };
}
Xc("row", { useDeprecatedLogic: !0 });
Xc("column", { useDeprecatedLogic: !0 });
Xc("cell", { useDeprecatedLogic: !0 });
function Nv(t, e) {
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
function dy(t) {
  return function(e, n) {
    if (!Ve(e)) return !1;
    const r = Nv(Rl(e), t);
    if (r == null) return !1;
    if (n) {
      const i = e.doc.resolve(r);
      n(e.tr.setSelection(Z.between(i, iv(i))).scrollIntoView());
    }
    return !0;
  };
}
function Iv(t, e) {
  const n = t.selection.$anchor;
  for (let r = n.depth; r > 0; r--) if (n.node(r).type.spec.tableRole == "table")
    return e && e(t.tr.delete(n.before(r), n.after(r)).scrollIntoView()), !0;
  return !1;
}
function Os(t, e) {
  const n = t.selection;
  if (!(n instanceof ve)) return !1;
  if (e) {
    const r = t.tr, i = ut(t.schema).cell.createAndFill().content;
    n.forEachCell((o, s) => {
      o.content.eq(i) || r.replace(r.mapping.map(s + 1), r.mapping.map(s + o.nodeSize - 1), new _(i, 0, 0));
    }), r.docChanged && e(r);
  }
  return !0;
}
function Av(t) {
  return (e, n) => {
    const { from: r, to: i, select: o = !0, pos: s = e.selection.from } = t, l = e.tr;
    return kv({
      tr: l,
      originIndex: r,
      targetIndex: i,
      select: o,
      pos: s
    }) ? (n == null || n(l), !0) : !1;
  };
}
function Ev(t) {
  return (e, n) => {
    const { from: r, to: i, select: o = !0, pos: s = e.selection.from } = t, l = e.tr;
    return gv({
      tr: l,
      originIndex: r,
      targetIndex: i,
      select: o,
      pos: s
    }) ? (n == null || n(l), !0) : !1;
  };
}
function Ov(t) {
  if (t.size === 0) return null;
  let { content: e, openStart: n, openEnd: r } = t;
  for (; e.childCount == 1 && (n > 0 && r > 0 || e.child(0).type.spec.tableRole == "table"); )
    n--, r--, e = e.child(0).content;
  const i = e.child(0), o = i.type.spec.tableRole, s = i.type.schema, l = [];
  if (o == "row") for (let a = 0; a < e.childCount; a++) {
    let u = e.child(a).content;
    const c = a ? 0 : Math.max(0, n - 1), f = a < e.childCount - 1 ? 0 : Math.max(0, r - 1);
    (c || f) && (u = bu(ut(s).row, new _(u, c, f)).content), l.push(u);
  }
  else if (o == "cell" || o == "header_cell") l.push(n || r ? bu(ut(s).row, new _(e, n, r)).content : e);
  else return null;
  return Dv(s, l);
}
function Dv(t, e) {
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
    if (i >= e.length && e.push(R.empty), n[i] < r) {
      const o = ut(t).cell.createAndFill(), s = [];
      for (let l = n[i]; l < r; l++) s.push(o);
      e[i] = e[i].append(R.from(s));
    }
  return {
    height: e.length,
    width: r,
    rows: e
  };
}
function bu(t, e) {
  const n = t.createAndFill();
  return new km(n).replace(0, n.content.size, e).doc;
}
function Rv({ width: t, height: e, rows: n }, r, i) {
  if (t != r) {
    const o = [], s = [];
    for (let l = 0; l < n.length; l++) {
      const a = n[l], u = [];
      for (let c = o[l] || 0, f = 0; c < r; f++) {
        let d = a.child(f % a.childCount);
        c + d.attrs.colspan > r && (d = d.type.createChecked(jr(d.attrs, d.attrs.colspan, c + d.attrs.colspan - r), d.content)), u.push(d), c += d.attrs.colspan;
        for (let h = 1; h < d.attrs.rowspan; h++) o[l + h] = (o[l + h] || 0) + d.attrs.colspan;
      }
      s.push(R.from(u));
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
      o.push(R.from(a));
    }
    n = o, e = i;
  }
  return {
    width: t,
    height: e,
    rows: n
  };
}
function Lv(t, e, n, r, i, o, s) {
  const l = t.doc.type.schema, a = ut(l);
  let u, c;
  if (i > e.width) for (let f = 0, d = 0; f < e.height; f++) {
    const h = n.child(f);
    d += h.nodeSize;
    const p = [];
    let k;
    h.lastChild == null || h.lastChild.type == a.cell ? k = u || (u = a.cell.createAndFill()) : k = c || (c = a.header_cell.createAndFill());
    for (let w = e.width; w < i; w++) p.push(k);
    t.insert(t.mapping.slice(s).map(d - 1 + r), p);
  }
  if (o > e.height) {
    const f = [];
    for (let p = 0, k = (e.height - 1) * e.width; p < Math.max(e.width, i); p++) {
      const w = p >= e.width ? !1 : n.nodeAt(e.map[k + p]).type == a.header_cell;
      f.push(w ? c || (c = a.header_cell.createAndFill()) : u || (u = a.cell.createAndFill()));
    }
    const d = a.row.create(null, R.from(f)), h = [];
    for (let p = e.height; p < o; p++) h.push(d);
    t.insert(t.mapping.slice(s).map(r + n.nodeSize - 2), h);
  }
  return !!(u || c);
}
function xh(t, e, n, r, i, o, s, l) {
  if (s == 0 || s == e.height) return !1;
  let a = !1;
  for (let u = i; u < o; u++) {
    const c = s * e.width + u, f = e.map[c];
    if (e.map[c - e.width] == f) {
      a = !0;
      const d = n.nodeAt(f), { top: h, left: p } = e.findCell(f);
      t.setNodeMarkup(t.mapping.slice(l).map(f + r), null, {
        ...d.attrs,
        rowspan: s - h
      }), t.insert(t.mapping.slice(l).map(e.positionAt(s, p, n)), d.type.createAndFill({
        ...d.attrs,
        rowspan: h + d.attrs.rowspan - s
      })), u += d.attrs.colspan - 1;
    }
  }
  return a;
}
function Ch(t, e, n, r, i, o, s, l) {
  if (s == 0 || s == e.width) return !1;
  let a = !1;
  for (let u = i; u < o; u++) {
    const c = u * e.width + s, f = e.map[c];
    if (e.map[c - 1] == f) {
      a = !0;
      const d = n.nodeAt(f), h = e.colCount(f), p = t.mapping.slice(l).map(f + r);
      t.setNodeMarkup(p, null, jr(d.attrs, s - h, d.attrs.colspan - (s - h))), t.insert(p + d.nodeSize, d.type.createAndFill(jr(d.attrs, 0, s - h))), u += d.attrs.rowspan - 1;
    }
  }
  return a;
}
function Sh(t, e, n, r, i) {
  let o = n ? t.doc.nodeAt(n - 1) : t.doc;
  if (!o) throw new Error("No table found");
  let s = be.get(o);
  const { top: l, left: a } = r, u = a + i.width, c = l + i.height, f = t.tr;
  let d = 0;
  function h() {
    if (o = n ? f.doc.nodeAt(n - 1) : f.doc, !o) throw new Error("No table found");
    s = be.get(o), d = f.mapping.maps.length;
  }
  Lv(f, s, o, n, u, c, d) && h(), xh(f, s, o, n, a, u, l, d) && h(), xh(f, s, o, n, a, u, c, d) && h(), Ch(f, s, o, n, l, c, a, d) && h(), Ch(f, s, o, n, l, c, u, d) && h();
  for (let p = l; p < c; p++) {
    const k = s.positionAt(p, a, o), w = s.positionAt(p, u, o);
    f.replace(f.mapping.slice(d).map(k + n), f.mapping.slice(d).map(w + n), new _(i.rows[p - l], 0, 0));
  }
  h(), f.setSelection(new ve(f.doc.resolve(n + s.positionAt(l, a, o)), f.doc.resolve(n + s.positionAt(c - 1, u - 1, o)))), e(f);
}
const Pv = Rm({
  ArrowLeft: Ds("horiz", -1),
  ArrowRight: Ds("horiz", 1),
  ArrowUp: Ds("vert", -1),
  ArrowDown: Ds("vert", 1),
  "Shift-ArrowLeft": Rs("horiz", -1),
  "Shift-ArrowRight": Rs("horiz", 1),
  "Shift-ArrowUp": Rs("vert", -1),
  "Shift-ArrowDown": Rs("vert", 1),
  Backspace: Os,
  "Mod-Backspace": Os,
  Delete: Os,
  "Mod-Delete": Os
});
function Gs(t, e, n) {
  return n.eq(t.selection) ? !1 : (e && e(t.tr.setSelection(n).scrollIntoView()), !0);
}
function Ds(t, e) {
  return (n, r, i) => {
    if (!i) return !1;
    const o = n.selection;
    if (o instanceof ve) return Gs(n, r, oe.near(o.$headCell, e));
    if (t != "horiz" && !o.empty) return !1;
    const s = hy(i, t, e);
    if (s == null) return !1;
    if (t == "horiz") return Gs(n, r, oe.near(n.doc.resolve(o.head + e), e));
    {
      const l = n.doc.resolve(s), a = ey(l, t, e);
      let u;
      return a ? u = oe.near(a, 1) : e < 0 ? u = oe.near(n.doc.resolve(l.before(-1)), -1) : u = oe.near(n.doc.resolve(l.after(-1)), 1), Gs(n, r, u);
    }
  };
}
function Rs(t, e) {
  return (n, r, i) => {
    if (!i) return !1;
    const o = n.selection;
    let s;
    if (o instanceof ve) s = o;
    else {
      const a = hy(i, t, e);
      if (a == null) return !1;
      s = new ve(n.doc.resolve(a));
    }
    const l = ey(s.$headCell, t, e);
    return l ? Gs(n, r, new ve(s.$anchorCell, l)) : !1;
  };
}
function zv(t, e) {
  const n = t.state.doc, r = zi(n.resolve(e));
  return r ? (t.dispatch(t.state.tr.setSelection(new ve(r))), !0) : !1;
}
function Bv(t, e, n) {
  if (!Ve(t.state)) return !1;
  let r = Ov(n);
  const i = t.state.selection;
  if (i instanceof ve) {
    r || (r = {
      width: 1,
      height: 1,
      rows: [R.from(bu(ut(t.state.schema).cell, n))]
    });
    const o = i.$anchorCell.node(-1), s = i.$anchorCell.start(-1), l = be.get(o).rectBetween(i.$anchorCell.pos - s, i.$headCell.pos - s);
    return r = Rv(r, l.right - l.left, l.bottom - l.top), Sh(t.state, t.dispatch, s, l, r), !0;
  } else if (r) {
    const o = Rl(t.state), s = o.start(-1);
    return Sh(t.state, t.dispatch, s, be.get(o.node(-1)).findCell(o.pos - s), r), !0;
  } else return !1;
}
function Fv(t, e) {
  var n;
  if (e.button != 0 || e.ctrlKey || e.metaKey) return;
  const r = Mh(t, e.target);
  let i;
  if (e.shiftKey && t.state.selection instanceof ve)
    o(t.state.selection.$anchorCell, e), e.preventDefault();
  else if (e.shiftKey && r && (i = zi(t.state.selection.$anchor)) != null && ((n = xa(t, e)) === null || n === void 0 ? void 0 : n.pos) != i.pos)
    o(i, e), e.preventDefault();
  else if (!r) return;
  function o(a, u) {
    let c = xa(t, u);
    const f = jn.getState(t.state) == null;
    if (!c || !Qc(a, c)) if (f) c = a;
    else return;
    const d = new ve(a, c);
    if (f || !t.state.selection.eq(d)) {
      const h = t.state.tr.setSelection(d);
      f && h.setMeta(jn, a.pos), t.dispatch(h);
    }
  }
  function s() {
    t.root.removeEventListener("mouseup", s), t.root.removeEventListener("dragstart", s), t.root.removeEventListener("mousemove", l), jn.getState(t.state) != null && t.dispatch(t.state.tr.setMeta(jn, -1));
  }
  function l(a) {
    const u = a, c = jn.getState(t.state);
    let f;
    if (c != null) f = t.state.doc.resolve(c);
    else if (Mh(t, u.target) != r && (f = xa(t, e), !f))
      return s();
    f && o(f, u);
  }
  t.root.addEventListener("mouseup", s), t.root.addEventListener("dragstart", s), t.root.addEventListener("mousemove", l);
}
function hy(t, e, n) {
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
function Mh(t, e) {
  for (; e && e != t.dom; e = e.parentNode) if (e.nodeName == "TD" || e.nodeName == "TH") return e;
  return null;
}
function xa(t, e) {
  const n = t.posAtCoords({
    left: e.clientX,
    top: e.clientY
  });
  if (!n) return null;
  let { inside: r, pos: i } = n;
  return r >= 0 && zi(t.state.doc.resolve(r)) || zi(t.state.doc.resolve(i));
}
var $v = class {
  constructor(t, e) {
    this.node = t, this.defaultCellMinWidth = e, this.dom = document.createElement("div"), this.dom.className = "tableWrapper", this.table = this.dom.appendChild(document.createElement("table")), this.table.style.setProperty("--default-cell-min-width", `${e}px`), this.colgroup = this.table.appendChild(document.createElement("colgroup")), wu(t, this.colgroup, this.table, e), this.contentDOM = this.table.appendChild(document.createElement("tbody"));
  }
  update(t) {
    return t.type != this.node.type ? !1 : (this.node = t, wu(t, this.colgroup, this.table, this.defaultCellMinWidth), !0);
  }
  ignoreMutation(t) {
    return t.type == "attributes" && (t.target == this.table || this.colgroup.contains(t.target));
  }
};
function wu(t, e, n, r, i, o) {
  let s = 0, l = !0, a = e.firstChild;
  const u = t.firstChild;
  if (u) {
    for (let f = 0, d = 0; f < u.childCount; f++) {
      const { colspan: h, colwidth: p } = u.child(f).attrs;
      for (let k = 0; k < h; k++, d++) {
        const w = i == d ? o : p && p[k], b = w ? w + "px" : "";
        if (s += w || r, w || (l = !1), a)
          a.style.width != b && (a.style.width = b), a = a.nextSibling;
        else {
          const L = document.createElement("col");
          L.style.width = b, e.appendChild(L);
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
const Tt = new rt("tableColumnResizing");
function _v({ handleWidth: t = 5, cellMinWidth: e = 25, defaultCellMinWidth: n = 100, View: r = $v, lastColumnResizable: i = !0 } = {}) {
  const o = new Be({
    key: Tt,
    state: {
      init(s, l) {
        var a;
        const u = (a = o.spec) === null || a === void 0 || (a = a.props) === null || a === void 0 ? void 0 : a.nodeViews, c = ut(l.schema).table.name;
        return r && u && (u[c] = (f, d) => new r(f, n, d)), new Vv(-1, !1);
      },
      apply(s, l) {
        return l.apply(s);
      }
    },
    props: {
      attributes: (s) => {
        const l = Tt.getState(s);
        return l && l.activeHandle > -1 ? { class: "resize-cursor" } : {};
      },
      handleDOMEvents: {
        mousemove: (s, l) => {
          Hv(s, l, t, i);
        },
        mouseleave: (s) => {
          jv(s);
        },
        mousedown: (s, l) => {
          Wv(s, l, e, n);
        }
      },
      decorations: (s) => {
        const l = Tt.getState(s);
        if (l && l.activeHandle > -1) return Gv(s, l.activeHandle);
      },
      nodeViews: {}
    }
  });
  return o;
}
var Vv = class Ys {
  constructor(e, n) {
    this.activeHandle = e, this.dragging = n;
  }
  apply(e) {
    const n = this, r = e.getMeta(Tt);
    if (r && r.setHandle != null) return new Ys(r.setHandle, !1);
    if (r && r.setDragging !== void 0) return new Ys(n.activeHandle, r.setDragging);
    if (n.activeHandle > -1 && e.docChanged) {
      let i = e.mapping.map(n.activeHandle, -1);
      return ku(e.doc.resolve(i)) || (i = -1), new Ys(i, n.dragging);
    }
    return n;
  }
};
function Hv(t, e, n, r) {
  if (!t.editable) return;
  const i = Tt.getState(t.state);
  if (i && !i.dragging) {
    const o = Kv(e.target);
    let s = -1;
    if (o) {
      const { left: l, right: a } = o.getBoundingClientRect();
      e.clientX - l <= n ? s = vh(t, e, "left", n) : a - e.clientX <= n && (s = vh(t, e, "right", n));
    }
    if (s != i.activeHandle) {
      if (!r && s !== -1) {
        const l = t.state.doc.resolve(s), a = l.node(-1), u = be.get(a), c = l.start(-1);
        if (u.colCount(l.pos - c) + l.nodeAfter.attrs.colspan - 1 == u.width - 1) return;
      }
      py(t, s);
    }
  }
}
function jv(t) {
  if (!t.editable) return;
  const e = Tt.getState(t.state);
  e && e.activeHandle > -1 && !e.dragging && py(t, -1);
}
function Wv(t, e, n, r) {
  var i;
  if (!t.editable) return !1;
  const o = (i = t.dom.ownerDocument.defaultView) !== null && i !== void 0 ? i : window, s = Tt.getState(t.state);
  if (!s || s.activeHandle == -1 || s.dragging) return !1;
  const l = t.state.doc.nodeAt(s.activeHandle), a = qv(t, s.activeHandle, l.attrs);
  t.dispatch(t.state.tr.setMeta(Tt, { setDragging: {
    startX: e.clientX,
    startWidth: a
  } }));
  function u(f) {
    o.removeEventListener("mouseup", u), o.removeEventListener("mousemove", c);
    const d = Tt.getState(t.state);
    d != null && d.dragging && (Uv(t, d.activeHandle, Th(d.dragging, f, n)), t.dispatch(t.state.tr.setMeta(Tt, { setDragging: null })));
  }
  function c(f) {
    if (!f.which) return u(f);
    const d = Tt.getState(t.state);
    if (d && d.dragging) {
      const h = Th(d.dragging, f, n);
      Nh(t, d.activeHandle, h, r);
    }
  }
  return Nh(t, s.activeHandle, a, r), o.addEventListener("mouseup", u), o.addEventListener("mousemove", c), e.preventDefault(), !0;
}
function qv(t, e, { colspan: n, colwidth: r }) {
  const i = r && r[r.length - 1];
  if (i) return i;
  const o = t.domAtPos(e);
  let s = o.node.childNodes[o.offset].offsetWidth, l = n;
  if (r)
    for (let a = 0; a < n; a++) r[a] && (s -= r[a], l--);
  return s / l;
}
function Kv(t) {
  for (; t && t.nodeName != "TD" && t.nodeName != "TH"; ) t = t.classList && t.classList.contains("ProseMirror") ? null : t.parentNode;
  return t;
}
function vh(t, e, n, r) {
  const i = n == "right" ? -r : r, o = t.posAtCoords({
    left: e.clientX + i,
    top: e.clientY
  });
  if (!o) return -1;
  const { pos: s } = o, l = zi(t.state.doc.resolve(s));
  if (!l) return -1;
  if (n == "right") return l.pos;
  const a = be.get(l.node(-1)), u = l.start(-1), c = a.map.indexOf(l.pos - u);
  return c % a.width == 0 ? -1 : u + a.map[c - 1];
}
function Th(t, e, n) {
  const r = e.clientX - t.startX;
  return Math.max(n, t.startWidth + r);
}
function py(t, e) {
  t.dispatch(t.state.tr.setMeta(Tt, { setHandle: e }));
}
function Uv(t, e, n) {
  const r = t.state.doc.resolve(e), i = r.node(-1), o = be.get(i), s = r.start(-1), l = o.colCount(r.pos - s) + r.nodeAfter.attrs.colspan - 1, a = t.state.tr;
  for (let u = 0; u < o.height; u++) {
    const c = u * o.width + l;
    if (u && o.map[c] == o.map[c - o.width]) continue;
    const f = o.map[c], d = i.nodeAt(f).attrs, h = d.colspan == 1 ? 0 : l - o.colCount(f);
    if (d.colwidth && d.colwidth[h] == n) continue;
    const p = d.colwidth ? d.colwidth.slice() : Jv(d.colspan);
    p[h] = n, a.setNodeMarkup(s + f, null, {
      ...d,
      colwidth: p
    });
  }
  a.docChanged && t.dispatch(a);
}
function Nh(t, e, n, r) {
  const i = t.state.doc.resolve(e), o = i.node(-1), s = i.start(-1), l = be.get(o).colCount(i.pos - s) + i.nodeAfter.attrs.colspan - 1;
  let a = t.domAtPos(i.start(-1)).node;
  for (; a && a.nodeName != "TABLE"; ) a = a.parentNode;
  a && wu(o, a.firstChild, a, r, l, n);
}
function Jv(t) {
  return Array(t).fill(0);
}
function Gv(t, e) {
  const n = [], r = t.doc.resolve(e), i = r.node(-1);
  if (!i) return Me.empty;
  const o = be.get(i), s = r.start(-1), l = o.colCount(r.pos - s) + r.nodeAfter.attrs.colspan - 1;
  for (let u = 0; u < o.height; u++) {
    const c = l + u * o.width;
    if ((l == o.width - 1 || o.map[c] != o.map[c + 1]) && (u == 0 || o.map[c] != o.map[c - o.width])) {
      var a;
      const f = o.map[c], d = s + f + i.nodeAt(f).nodeSize - 1, h = document.createElement("div");
      h.className = "column-resize-handle", !((a = Tt.getState(t)) === null || a === void 0) && a.dragging && n.push(ze.node(s + f, s + f + i.nodeAt(f).nodeSize, { class: "column-resize-dragging" })), n.push(ze.widget(d, h));
    }
  }
  return Me.create(t.doc, n);
}
function Yv({ allowTableNodeSelection: t = !1 } = {}) {
  return new Be({
    key: jn,
    state: {
      init() {
        return null;
      },
      apply(e, n) {
        const r = e.getMeta(jn);
        if (r != null) return r == -1 ? null : r;
        if (n == null || !e.docChanged) return n;
        const { deleted: i, pos: o } = e.mapping.mapResult(n);
        return i ? null : o;
      }
    },
    props: {
      decorations: av,
      handleDOMEvents: { mousedown: Fv },
      createSelectionBetween(e) {
        return jn.getState(e.state) != null ? e.state.selection : null;
      },
      handleTripleClick: zv,
      handleKeyDown: Pv,
      handlePaste: Bv
    },
    appendTransaction(e, n, r) {
      return fv(r, hv(r, n), t);
    }
  });
}
var dl = typeof navigator < "u" ? navigator : null, Zc = dl && dl.userAgent || "", Qv = /Edge\/(\d+)/.exec(Zc), Xv = /MSIE \d/.exec(Zc), Zv = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(Zc), eT = !!(Xv || Zv || Qv), tT = !eT && !!dl && /Apple Computer/.test(dl.vendor), my = new rt("safari-ime-span"), xu = !1, nT = {
  key: my,
  props: {
    decorations: rT,
    handleDOMEvents: {
      compositionstart: () => {
        xu = !0;
      },
      compositionend: () => {
        xu = !1;
      }
    }
  }
};
function rT(t) {
  const { $from: e, $to: n, to: r } = t.selection;
  if (xu && e.sameParent(n)) {
    const i = ze.widget(r, iT, {
      ignoreSelection: !0,
      key: "safari-ime-span"
    });
    return Me.create(t.doc, [i]);
  }
}
function iT(t) {
  const e = t.dom.ownerDocument.createElement("span");
  return e.className = "ProseMirror-safari-ime-span", e;
}
var oT = new Be(tT ? nT : { key: my });
function Ih(t, e) {
  const n = String(t);
  if (typeof e != "string")
    throw new TypeError("Expected character");
  let r = 0, i = n.indexOf(e);
  for (; i !== -1; )
    r++, i = n.indexOf(e, i + e.length);
  return r;
}
function sT(t) {
  if (typeof t != "string")
    throw new TypeError("Expected a string");
  return t.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}
function lT(t, e, n) {
  const i = xl((n || {}).ignore || []), o = aT(e);
  let s = -1;
  for (; ++s < o.length; )
    Lu(t, "text", l);
  function l(u, c) {
    let f = -1, d;
    for (; ++f < c.length; ) {
      const h = c[f], p = d ? d.children : void 0;
      if (i(
        h,
        p ? p.indexOf(h) : void 0,
        d
      ))
        return;
      d = h;
    }
    if (d)
      return a(u, c);
  }
  function a(u, c) {
    const f = c[c.length - 1], d = o[s][0], h = o[s][1];
    let p = 0;
    const w = f.children.indexOf(u);
    let b = !1, L = [];
    d.lastIndex = 0;
    let E = d.exec(u.value);
    for (; E; ) {
      const j = E.index, H = {
        index: E.index,
        input: E.input,
        stack: [...c, u]
      };
      let T = h(...E, H);
      if (typeof T == "string" && (T = T.length > 0 ? { type: "text", value: T } : void 0), T === !1 ? d.lastIndex = j + 1 : (p !== j && L.push({
        type: "text",
        value: u.value.slice(p, j)
      }), Array.isArray(T) ? L.push(...T) : T && L.push(T), p = j + E[0].length, b = !0), !d.global)
        break;
      E = d.exec(u.value);
    }
    return b ? (p < u.value.length && L.push({ type: "text", value: u.value.slice(p) }), f.children.splice(w, 1, ...L)) : L = [u], w + L.length;
  }
}
function aT(t) {
  const e = [];
  if (!Array.isArray(t))
    throw new TypeError("Expected find and replace tuple or list of tuples");
  const n = !t[0] || Array.isArray(t[0]) ? t : [t];
  let r = -1;
  for (; ++r < n.length; ) {
    const i = n[r];
    e.push([uT(i[0]), cT(i[1])]);
  }
  return e;
}
function uT(t) {
  return typeof t == "string" ? new RegExp(sT(t), "g") : t;
}
function cT(t) {
  return typeof t == "function" ? t : function() {
    return t;
  };
}
const Ca = "phrasing", Sa = ["autolink", "link", "image", "label"];
function fT() {
  return {
    transforms: [kT],
    enter: {
      literalAutolink: hT,
      literalAutolinkEmail: Ma,
      literalAutolinkHttp: Ma,
      literalAutolinkWww: Ma
    },
    exit: {
      literalAutolink: yT,
      literalAutolinkEmail: gT,
      literalAutolinkHttp: pT,
      literalAutolinkWww: mT
    }
  };
}
function dT() {
  return {
    unsafe: [
      {
        character: "@",
        before: "[+\\-.\\w]",
        after: "[\\-.\\w]",
        inConstruct: Ca,
        notInConstruct: Sa
      },
      {
        character: ".",
        before: "[Ww]",
        after: "[\\-.\\w]",
        inConstruct: Ca,
        notInConstruct: Sa
      },
      {
        character: ":",
        before: "[ps]",
        after: "\\/",
        inConstruct: Ca,
        notInConstruct: Sa
      }
    ]
  };
}
function hT(t) {
  this.enter({ type: "link", title: null, url: "", children: [] }, t);
}
function Ma(t) {
  this.config.enter.autolinkProtocol.call(this, t);
}
function pT(t) {
  this.config.exit.autolinkProtocol.call(this, t);
}
function mT(t) {
  this.config.exit.data.call(this, t);
  const e = this.stack[this.stack.length - 1];
  e.type, e.url = "http://" + this.sliceSerialize(t);
}
function gT(t) {
  this.config.exit.autolinkEmail.call(this, t);
}
function yT(t) {
  this.exit(t);
}
function kT(t) {
  lT(
    t,
    [
      [/(https?:\/\/|www(?=\.))([-.\w]+)([^ \t\r\n]*)/gi, bT],
      [new RegExp("(^|\\\\s|[\\\\u0021-\\\\u002F\\\\u003A-\\\\u0040\\\\u005B-\\\\u0060\\\\u007B-\\\\u007E])([-.\\\\w+]+)@([-\\\\w]+(?:\\\\.[-\\\\w]+)+)", "gu"), wT]
    ],
    { ignore: ["link", "linkReference"] }
  );
}
function bT(t, e, n, r, i) {
  let o = "";
  if (!gy(i) || (/^w/i.test(e) && (n = e + n, e = "", o = "http://"), !xT(n)))
    return !1;
  const s = CT(n + r);
  if (!s[0]) return !1;
  const l = {
    type: "link",
    title: null,
    url: o + e + s[0],
    children: [{ type: "text", value: e + s[0] }]
  };
  return s[1] ? [l, { type: "text", value: s[1] }] : l;
}
function wT(t, e, n, r) {
  return (
    // Not an expected previous character.
    !gy(r, !0) || // Label ends in not allowed character.
    /[-\d_]$/.test(n) ? !1 : {
      type: "link",
      title: null,
      url: "mailto:" + e + "@" + n,
      children: [{ type: "text", value: e + "@" + n }]
    }
  );
}
function xT(t) {
  const e = t.split(".");
  return !(e.length < 2 || e[e.length - 1] && (/_/.test(e[e.length - 1]) || !/[a-zA-Z\d]/.test(e[e.length - 1])) || e[e.length - 2] && (/_/.test(e[e.length - 2]) || !/[a-zA-Z\d]/.test(e[e.length - 2])));
}
function CT(t) {
  const e = /[!"&'),.:;<>?\]}]+$/.exec(t);
  if (!e)
    return [t, void 0];
  t = t.slice(0, e.index);
  let n = e[0], r = n.indexOf(")");
  const i = Ih(t, "(");
  let o = Ih(t, ")");
  for (; r !== -1 && i > o; )
    t += n.slice(0, r + 1), n = n.slice(r + 1), r = n.indexOf(")"), o++;
  return [t, n];
}
function gy(t, e) {
  const n = t.input.charCodeAt(t.index - 1);
  return (t.index === 0 || Fr(n) || bl(n)) && // If it’s an email, the previous character should not be a slash.
  (!e || n !== 47);
}
yy.peek = OT;
function ST() {
  this.buffer();
}
function MT(t) {
  this.enter({ type: "footnoteReference", identifier: "", label: "" }, t);
}
function vT() {
  this.buffer();
}
function TT(t) {
  this.enter(
    { type: "footnoteDefinition", identifier: "", label: "", children: [] },
    t
  );
}
function NT(t) {
  const e = this.resume(), n = this.stack[this.stack.length - 1];
  n.type, n.identifier = Kt(
    this.sliceSerialize(t)
  ).toLowerCase(), n.label = e;
}
function IT(t) {
  this.exit(t);
}
function AT(t) {
  const e = this.resume(), n = this.stack[this.stack.length - 1];
  n.type, n.identifier = Kt(
    this.sliceSerialize(t)
  ).toLowerCase(), n.label = e;
}
function ET(t) {
  this.exit(t);
}
function OT() {
  return "[";
}
function yy(t, e, n, r) {
  const i = n.createTracker(r);
  let o = i.move("[^");
  const s = n.enter("footnoteReference"), l = n.enter("reference");
  return o += i.move(
    n.safe(n.associationId(t), { after: "]", before: o })
  ), l(), s(), o += i.move("]"), o;
}
function DT() {
  return {
    enter: {
      gfmFootnoteCallString: ST,
      gfmFootnoteCall: MT,
      gfmFootnoteDefinitionLabelString: vT,
      gfmFootnoteDefinition: TT
    },
    exit: {
      gfmFootnoteCallString: NT,
      gfmFootnoteCall: IT,
      gfmFootnoteDefinitionLabelString: AT,
      gfmFootnoteDefinition: ET
    }
  };
}
function RT(t) {
  let e = !1;
  return t && t.firstLineBlank && (e = !0), {
    handlers: { footnoteDefinition: n, footnoteReference: yy },
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
        e ? ky : LT
      )
    )), u(), a;
  }
}
function LT(t, e, n) {
  return e === 0 ? t : ky(t, e, n);
}
function ky(t, e, n) {
  return (n ? "" : "    ") + t;
}
const PT = [
  "autolink",
  "destinationLiteral",
  "destinationRaw",
  "reference",
  "titleQuote",
  "titleApostrophe"
];
wy.peek = $T;
function by() {
  return {
    canContainEols: ["delete"],
    enter: { strikethrough: BT },
    exit: { strikethrough: FT }
  };
}
function zT() {
  return {
    unsafe: [
      {
        character: "~",
        inConstruct: "phrasing",
        notInConstruct: PT
      }
    ],
    handlers: { delete: wy }
  };
}
function BT(t) {
  this.enter({ type: "delete", children: [] }, t);
}
function FT(t) {
  this.exit(t);
}
function wy(t, e, n, r) {
  const i = n.createTracker(r), o = n.enter("strikethrough");
  let s = i.move("~~");
  return s += n.containerPhrasing(t, {
    ...i.current(),
    before: s,
    after: "~"
  }), s += i.move("~~"), o(), s;
}
function $T() {
  return "~";
}
function _T(t) {
  return t.length;
}
function VT(t, e) {
  const n = e || {}, r = (n.align || []).concat(), i = n.stringLength || _T, o = [], s = [], l = [], a = [];
  let u = 0, c = -1;
  for (; ++c < t.length; ) {
    const k = [], w = [];
    let b = -1;
    for (t[c].length > u && (u = t[c].length); ++b < t[c].length; ) {
      const L = HT(t[c][b]);
      if (n.alignDelimiters !== !1) {
        const E = i(L);
        w[b] = E, (a[b] === void 0 || E > a[b]) && (a[b] = E);
      }
      k.push(L);
    }
    s[c] = k, l[c] = w;
  }
  let f = -1;
  if (typeof r == "object" && "length" in r)
    for (; ++f < u; )
      o[f] = Ah(r[f]);
  else {
    const k = Ah(r);
    for (; ++f < u; )
      o[f] = k;
  }
  f = -1;
  const d = [], h = [];
  for (; ++f < u; ) {
    const k = o[f];
    let w = "", b = "";
    k === 99 ? (w = ":", b = ":") : k === 108 ? w = ":" : k === 114 && (b = ":");
    let L = n.alignDelimiters === !1 ? 1 : Math.max(
      1,
      a[f] - w.length - b.length
    );
    const E = w + "-".repeat(L) + b;
    n.alignDelimiters !== !1 && (L = w.length + L + b.length, L > a[f] && (a[f] = L), h[f] = L), d[f] = E;
  }
  s.splice(1, 0, d), l.splice(1, 0, h), c = -1;
  const p = [];
  for (; ++c < s.length; ) {
    const k = s[c], w = l[c];
    f = -1;
    const b = [];
    for (; ++f < u; ) {
      const L = k[f] || "";
      let E = "", j = "";
      if (n.alignDelimiters !== !1) {
        const H = a[f] - (w[f] || 0), T = o[f];
        T === 114 ? E = " ".repeat(H) : T === 99 ? H % 2 ? (E = " ".repeat(H / 2 + 0.5), j = " ".repeat(H / 2 - 0.5)) : (E = " ".repeat(H / 2), j = E) : j = " ".repeat(H);
      }
      n.delimiterStart !== !1 && !f && b.push("|"), n.padding !== !1 && // Don’t add the opening space if we’re not aligning and the cell is
      // empty: there will be a closing space.
      !(n.alignDelimiters === !1 && L === "") && (n.delimiterStart !== !1 || f) && b.push(" "), n.alignDelimiters !== !1 && b.push(E), b.push(L), n.alignDelimiters !== !1 && b.push(j), n.padding !== !1 && b.push(" "), (n.delimiterEnd !== !1 || f !== u - 1) && b.push("|");
    }
    p.push(
      n.delimiterEnd === !1 ? b.join("").replace(/ +$/, "") : b.join("")
    );
  }
  return p.join(`
`);
}
function HT(t) {
  return t == null ? "" : String(t);
}
function Ah(t) {
  const e = typeof t == "string" ? t.codePointAt(0) : 0;
  return e === 67 || e === 99 ? 99 : e === 76 || e === 108 ? 108 : e === 82 || e === 114 ? 114 : 0;
}
function jT() {
  return {
    enter: {
      table: WT,
      tableData: Eh,
      tableHeader: Eh,
      tableRow: KT
    },
    exit: {
      codeText: UT,
      table: qT,
      tableData: va,
      tableHeader: va,
      tableRow: va
    }
  };
}
function WT(t) {
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
function qT(t) {
  this.exit(t), this.data.inTable = void 0;
}
function KT(t) {
  this.enter({ type: "tableRow", children: [] }, t);
}
function va(t) {
  this.exit(t);
}
function Eh(t) {
  this.enter({ type: "tableCell", children: [] }, t);
}
function UT(t) {
  let e = this.resume();
  this.data.inTable && (e = e.replace(/\\([\\|])/g, JT));
  const n = this.stack[this.stack.length - 1];
  n.type, n.value = e, this.exit(t);
}
function JT(t, e) {
  return e === "|" ? e : t;
}
function GT(t) {
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
      inlineCode: d,
      table: s,
      tableCell: a,
      tableRow: l
    }
  };
  function s(h, p, k, w) {
    return u(c(h, k, w), h.align);
  }
  function l(h, p, k, w) {
    const b = f(h, k, w), L = u([b]);
    return L.slice(0, L.indexOf(`
`));
  }
  function a(h, p, k, w) {
    const b = k.enter("tableCell"), L = k.enter("phrasing"), E = k.containerPhrasing(h, {
      ...w,
      before: o,
      after: o
    });
    return L(), b(), E;
  }
  function u(h, p) {
    return VT(h, {
      align: p,
      // @ts-expect-error: `markdown-table` types should support `null`.
      alignDelimiters: r,
      // @ts-expect-error: `markdown-table` types should support `null`.
      padding: n,
      // @ts-expect-error: `markdown-table` types should support `null`.
      stringLength: i
    });
  }
  function c(h, p, k) {
    const w = h.children;
    let b = -1;
    const L = [], E = p.enter("table");
    for (; ++b < w.length; )
      L[b] = f(w[b], p, k);
    return E(), L;
  }
  function f(h, p, k) {
    const w = h.children;
    let b = -1;
    const L = [], E = p.enter("tableRow");
    for (; ++b < w.length; )
      L[b] = a(w[b], h, p, k);
    return E(), L;
  }
  function d(h, p, k) {
    let w = zu.inlineCode(h, p, k);
    return k.stack.includes("tableCell") && (w = w.replace(/\|/g, "\\$&")), w;
  }
}
function YT() {
  return {
    exit: {
      taskListCheckValueChecked: Oh,
      taskListCheckValueUnchecked: Oh,
      paragraph: XT
    }
  };
}
function QT() {
  return {
    unsafe: [{ atBreak: !0, character: "-", after: "[:|-]" }],
    handlers: { listItem: ZT }
  };
}
function Oh(t) {
  const e = this.stack[this.stack.length - 2];
  e.type, e.checked = t.type === "taskListCheckValueChecked";
}
function XT(t) {
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
function ZT(t, e, n, r) {
  const i = t.children[0], o = typeof t.checked == "boolean" && i && i.type === "paragraph", s = "[" + (t.checked ? "x" : " ") + "] ", l = n.createTracker(r);
  o && l.move(s);
  let a = zu.listItem(t, e, n, {
    ...r,
    ...l.current()
  });
  return o && (a = a.replace(/^(?:[*+-]|\d+\.)([\r\n]| {1,3})/, u)), a;
  function u(c) {
    return c + s;
  }
}
function eN() {
  return [
    fT(),
    DT(),
    by(),
    jT(),
    YT()
  ];
}
function tN(t) {
  return {
    extensions: [
      dT(),
      RT(t),
      zT(),
      GT(t),
      QT()
    ]
  };
}
const nN = {
  tokenize: aN,
  partial: !0
}, xy = {
  tokenize: uN,
  partial: !0
}, Cy = {
  tokenize: cN,
  partial: !0
}, Sy = {
  tokenize: fN,
  partial: !0
}, rN = {
  tokenize: dN,
  partial: !0
}, My = {
  name: "wwwAutolink",
  tokenize: sN,
  previous: Ty
}, vy = {
  name: "protocolAutolink",
  tokenize: lN,
  previous: Ny
}, On = {
  name: "emailAutolink",
  tokenize: oN,
  previous: Iy
}, un = {};
function iN() {
  return {
    text: un
  };
}
let dr = 48;
for (; dr < 123; )
  un[dr] = On, dr++, dr === 58 ? dr = 65 : dr === 91 && (dr = 97);
un[43] = On;
un[45] = On;
un[46] = On;
un[95] = On;
un[72] = [On, vy];
un[104] = [On, vy];
un[87] = [On, My];
un[119] = [On, My];
function oN(t, e, n) {
  const r = this;
  let i, o;
  return s;
  function s(f) {
    return !Cu(f) || !Iy.call(r, r.previous) || ef(r.events) ? n(f) : (t.enter("literalAutolink"), t.enter("literalAutolinkEmail"), l(f));
  }
  function l(f) {
    return Cu(f) ? (t.consume(f), l) : f === 64 ? (t.consume(f), a) : n(f);
  }
  function a(f) {
    return f === 46 ? t.check(rN, c, u)(f) : f === 45 || f === 95 || gt(f) ? (o = !0, t.consume(f), a) : c(f);
  }
  function u(f) {
    return t.consume(f), i = !0, a;
  }
  function c(f) {
    return o && i && st(r.previous) ? (t.exit("literalAutolinkEmail"), t.exit("literalAutolink"), e(f)) : n(f);
  }
}
function sN(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return s !== 87 && s !== 119 || !Ty.call(r, r.previous) || ef(r.events) ? n(s) : (t.enter("literalAutolink"), t.enter("literalAutolinkWww"), t.check(nN, t.attempt(xy, t.attempt(Cy, o), n), n)(s));
  }
  function o(s) {
    return t.exit("literalAutolinkWww"), t.exit("literalAutolink"), e(s);
  }
}
function lN(t, e, n) {
  const r = this;
  let i = "", o = !1;
  return s;
  function s(f) {
    return (f === 72 || f === 104) && Ny.call(r, r.previous) && !ef(r.events) ? (t.enter("literalAutolink"), t.enter("literalAutolinkHttp"), i += String.fromCodePoint(f), t.consume(f), l) : n(f);
  }
  function l(f) {
    if (st(f) && i.length < 5)
      return i += String.fromCodePoint(f), t.consume(f), l;
    if (f === 58) {
      const d = i.toLowerCase();
      if (d === "http" || d === "https")
        return t.consume(f), a;
    }
    return n(f);
  }
  function a(f) {
    return f === 47 ? (t.consume(f), o ? u : (o = !0, a)) : n(f);
  }
  function u(f) {
    return f === null || Xs(f) || Ce(f) || Fr(f) || bl(f) ? n(f) : t.attempt(xy, t.attempt(Cy, c), n)(f);
  }
  function c(f) {
    return t.exit("literalAutolinkHttp"), t.exit("literalAutolink"), e(f);
  }
}
function aN(t, e, n) {
  let r = 0;
  return i;
  function i(s) {
    return (s === 87 || s === 119) && r < 3 ? (r++, t.consume(s), i) : s === 46 && r === 3 ? (t.consume(s), o) : n(s);
  }
  function o(s) {
    return s === null ? n(s) : e(s);
  }
}
function uN(t, e, n) {
  let r, i, o;
  return s;
  function s(u) {
    return u === 46 || u === 95 ? t.check(Sy, a, l)(u) : u === null || Ce(u) || Fr(u) || u !== 45 && bl(u) ? a(u) : (o = !0, t.consume(u), s);
  }
  function l(u) {
    return u === 95 ? r = !0 : (i = r, r = void 0), t.consume(u), s;
  }
  function a(u) {
    return i || r || !o ? n(u) : e(u);
  }
}
function cN(t, e) {
  let n = 0, r = 0;
  return i;
  function i(s) {
    return s === 40 ? (n++, t.consume(s), i) : s === 41 && r < n ? o(s) : s === 33 || s === 34 || s === 38 || s === 39 || s === 41 || s === 42 || s === 44 || s === 46 || s === 58 || s === 59 || s === 60 || s === 63 || s === 93 || s === 95 || s === 126 ? t.check(Sy, e, o)(s) : s === null || Ce(s) || Fr(s) ? e(s) : (t.consume(s), i);
  }
  function o(s) {
    return s === 41 && r++, t.consume(s), i;
  }
}
function fN(t, e, n) {
  return r;
  function r(l) {
    return l === 33 || l === 34 || l === 39 || l === 41 || l === 42 || l === 44 || l === 46 || l === 58 || l === 59 || l === 63 || l === 95 || l === 126 ? (t.consume(l), r) : l === 38 ? (t.consume(l), o) : l === 93 ? (t.consume(l), i) : (
      // `<` is an end.
      l === 60 || // So is whitespace.
      l === null || Ce(l) || Fr(l) ? e(l) : n(l)
    );
  }
  function i(l) {
    return l === null || l === 40 || l === 91 || Ce(l) || Fr(l) ? e(l) : r(l);
  }
  function o(l) {
    return st(l) ? s(l) : n(l);
  }
  function s(l) {
    return l === 59 ? (t.consume(l), r) : st(l) ? (t.consume(l), s) : n(l);
  }
}
function dN(t, e, n) {
  return r;
  function r(o) {
    return t.consume(o), i;
  }
  function i(o) {
    return gt(o) ? n(o) : e(o);
  }
}
function Ty(t) {
  return t === null || t === 40 || t === 42 || t === 95 || t === 91 || t === 93 || t === 126 || Ce(t);
}
function Ny(t) {
  return !st(t);
}
function Iy(t) {
  return !(t === 47 || Cu(t));
}
function Cu(t) {
  return t === 43 || t === 45 || t === 46 || t === 95 || gt(t);
}
function ef(t) {
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
const hN = {
  tokenize: xN,
  partial: !0
};
function pN() {
  return {
    document: {
      91: {
        name: "gfmFootnoteDefinition",
        tokenize: kN,
        continuation: {
          tokenize: bN
        },
        exit: wN
      }
    },
    text: {
      91: {
        name: "gfmFootnoteCall",
        tokenize: yN
      },
      93: {
        name: "gfmPotentialFootnoteCall",
        add: "after",
        tokenize: mN,
        resolveTo: gN
      }
    }
  };
}
function mN(t, e, n) {
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
    const u = Kt(r.sliceSerialize({
      start: s.end,
      end: r.now()
    }));
    return u.codePointAt(0) !== 94 || !o.includes(u.slice(1)) ? n(a) : (t.enter("gfmFootnoteCallLabelMarker"), t.consume(a), t.exit("gfmFootnoteCallLabelMarker"), e(a));
  }
}
function gN(t, e) {
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
function yN(t, e, n) {
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
      f === null || f === 91 || Ce(f)
    )
      return n(f);
    if (f === 93) {
      t.exit("chunkString");
      const d = t.exit("gfmFootnoteCallString");
      return i.includes(Kt(r.sliceSerialize(d))) ? (t.enter("gfmFootnoteCallLabelMarker"), t.consume(f), t.exit("gfmFootnoteCallLabelMarker"), t.exit("gfmFootnoteCall"), e) : n(f);
    }
    return Ce(f) || (s = !0), o++, t.consume(f), f === 92 ? c : u;
  }
  function c(f) {
    return f === 91 || f === 92 || f === 93 ? (t.consume(f), o++, u) : u(f);
  }
}
function kN(t, e, n) {
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
      p === null || p === 91 || Ce(p)
    )
      return n(p);
    if (p === 93) {
      t.exit("chunkString");
      const k = t.exit("gfmFootnoteDefinitionLabelString");
      return o = Kt(r.sliceSerialize(k)), t.enter("gfmFootnoteDefinitionLabelMarker"), t.consume(p), t.exit("gfmFootnoteDefinitionLabelMarker"), t.exit("gfmFootnoteDefinitionLabel"), d;
    }
    return Ce(p) || (l = !0), s++, t.consume(p), p === 92 ? f : c;
  }
  function f(p) {
    return p === 91 || p === 92 || p === 93 ? (t.consume(p), s++, c) : c(p);
  }
  function d(p) {
    return p === 58 ? (t.enter("definitionMarker"), t.consume(p), t.exit("definitionMarker"), i.includes(o) || i.push(o), he(t, h, "gfmFootnoteDefinitionWhitespace")) : n(p);
  }
  function h(p) {
    return e(p);
  }
}
function bN(t, e, n) {
  return t.check(ts, e, t.attempt(hN, e, n));
}
function wN(t) {
  t.exit("gfmFootnoteDefinition");
}
function xN(t, e, n) {
  const r = this;
  return he(t, i, "gfmFootnoteDefinitionIndent", 5);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return s && s[1].type === "gfmFootnoteDefinitionIndent" && s[2].sliceSerialize(s[1], !0).length === 4 ? e(o) : n(o);
  }
}
function Ay(t) {
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
            }, d = [["enter", c, l], ["enter", s[u][1], l], ["exit", s[u][1], l], ["enter", f, l]], h = l.parser.constructs.insideSpan.null;
            h && Nt(d, d.length, 0, wl(h, s.slice(u + 1, a), l)), Nt(d, d.length, 0, [["exit", f, l], ["enter", s[a][1], l], ["exit", s[a][1], l], ["exit", c, l]]), Nt(s, u - 1, a - u + 3, d), a = u + d.length - 2;
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
    return d;
    function d(p) {
      return u === 126 && c[c.length - 1][1].type !== "characterEscape" ? a(p) : (s.enter("strikethroughSequenceTemporary"), h(p));
    }
    function h(p) {
      const k = Oi(u);
      if (p === 126)
        return f > 1 ? a(p) : (s.consume(p), f++, h);
      if (f < 2 && !n) return a(p);
      const w = s.exit("strikethroughSequenceTemporary"), b = Oi(p);
      return w._open = !b || b === 2 && !!k, w._close = !k || k === 2 && !!b, l(p);
    }
  }
}
class CN {
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
    SN(this, e, n, r);
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
function SN(t, e, n, r) {
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
function MN(t, e) {
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
function vN() {
  return {
    flow: {
      null: {
        name: "table",
        tokenize: TN,
        resolveAll: NN
      }
    }
  };
}
function TN(t, e, n) {
  const r = this;
  let i = 0, o = 0, s;
  return l;
  function l(A) {
    let V = r.events.length - 1;
    for (; V > -1; ) {
      const me = r.events[V][1].type;
      if (me === "lineEnding" || // Note: markdown-rs uses `whitespace` instead of `linePrefix`
      me === "linePrefix") V--;
      else break;
    }
    const q = V > -1 ? r.events[V][1].type : null, J = q === "tableHead" || q === "tableRow" ? T : a;
    return J === T && r.parser.lazy[r.now().line] ? n(A) : J(A);
  }
  function a(A) {
    return t.enter("tableHead"), t.enter("tableRow"), u(A);
  }
  function u(A) {
    return A === 124 || (s = !0, o += 1), c(A);
  }
  function c(A) {
    return A === null ? n(A) : Y(A) ? o > 1 ? (o = 0, r.interrupt = !0, t.exit("tableRow"), t.enter("lineEnding"), t.consume(A), t.exit("lineEnding"), h) : n(A) : ce(A) ? he(t, c, "whitespace")(A) : (o += 1, s && (s = !1, i += 1), A === 124 ? (t.enter("tableCellDivider"), t.consume(A), t.exit("tableCellDivider"), s = !0, c) : (t.enter("data"), f(A)));
  }
  function f(A) {
    return A === null || A === 124 || Ce(A) ? (t.exit("data"), c(A)) : (t.consume(A), A === 92 ? d : f);
  }
  function d(A) {
    return A === 92 || A === 124 ? (t.consume(A), f) : f(A);
  }
  function h(A) {
    return r.interrupt = !1, r.parser.lazy[r.now().line] ? n(A) : (t.enter("tableDelimiterRow"), s = !1, ce(A) ? he(t, p, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(A) : p(A));
  }
  function p(A) {
    return A === 45 || A === 58 ? w(A) : A === 124 ? (s = !0, t.enter("tableCellDivider"), t.consume(A), t.exit("tableCellDivider"), k) : H(A);
  }
  function k(A) {
    return ce(A) ? he(t, w, "whitespace")(A) : w(A);
  }
  function w(A) {
    return A === 58 ? (o += 1, s = !0, t.enter("tableDelimiterMarker"), t.consume(A), t.exit("tableDelimiterMarker"), b) : A === 45 ? (o += 1, b(A)) : A === null || Y(A) ? j(A) : H(A);
  }
  function b(A) {
    return A === 45 ? (t.enter("tableDelimiterFiller"), L(A)) : H(A);
  }
  function L(A) {
    return A === 45 ? (t.consume(A), L) : A === 58 ? (s = !0, t.exit("tableDelimiterFiller"), t.enter("tableDelimiterMarker"), t.consume(A), t.exit("tableDelimiterMarker"), E) : (t.exit("tableDelimiterFiller"), E(A));
  }
  function E(A) {
    return ce(A) ? he(t, j, "whitespace")(A) : j(A);
  }
  function j(A) {
    return A === 124 ? p(A) : A === null || Y(A) ? !s || i !== o ? H(A) : (t.exit("tableDelimiterRow"), t.exit("tableHead"), e(A)) : H(A);
  }
  function H(A) {
    return n(A);
  }
  function T(A) {
    return t.enter("tableRow"), z(A);
  }
  function z(A) {
    return A === 124 ? (t.enter("tableCellDivider"), t.consume(A), t.exit("tableCellDivider"), z) : A === null || Y(A) ? (t.exit("tableRow"), e(A)) : ce(A) ? he(t, z, "whitespace")(A) : (t.enter("data"), U(A));
  }
  function U(A) {
    return A === null || A === 124 || Ce(A) ? (t.exit("data"), z(A)) : (t.consume(A), A === 92 ? G : U);
  }
  function G(A) {
    return A === 92 || A === 124 ? (t.consume(A), U) : U(A);
  }
}
function NN(t, e) {
  let n = -1, r = !0, i = 0, o = [0, 0, 0, 0], s = [0, 0, 0, 0], l = !1, a = 0, u, c, f;
  const d = new CN();
  for (; ++n < t.length; ) {
    const h = t[n], p = h[1];
    h[0] === "enter" ? p.type === "tableHead" ? (l = !1, a !== 0 && (Dh(d, e, a, u, c), c = void 0, a = 0), u = {
      type: "table",
      start: Object.assign({}, p.start),
      // Note: correct end is set later.
      end: Object.assign({}, p.end)
    }, d.add(n, 0, [["enter", u, e]])) : p.type === "tableRow" || p.type === "tableDelimiterRow" ? (r = !0, f = void 0, o = [0, 0, 0, 0], s = [0, n + 1, 0, 0], l && (l = !1, c = {
      type: "tableBody",
      start: Object.assign({}, p.start),
      // Note: correct end is set later.
      end: Object.assign({}, p.end)
    }, d.add(n, 0, [["enter", c, e]])), i = p.type === "tableDelimiterRow" ? 2 : c ? 3 : 1) : i && (p.type === "data" || p.type === "tableDelimiterMarker" || p.type === "tableDelimiterFiller") ? (r = !1, s[2] === 0 && (o[1] !== 0 && (s[0] = s[1], f = Ls(d, e, o, i, void 0, f), o = [0, 0, 0, 0]), s[2] = n)) : p.type === "tableCellDivider" && (r ? r = !1 : (o[1] !== 0 && (s[0] = s[1], f = Ls(d, e, o, i, void 0, f)), o = s, s = [o[1], n, 0, 0])) : p.type === "tableHead" ? (l = !0, a = n) : p.type === "tableRow" || p.type === "tableDelimiterRow" ? (a = n, o[1] !== 0 ? (s[0] = s[1], f = Ls(d, e, o, i, n, f)) : s[1] !== 0 && (f = Ls(d, e, s, i, n, f)), i = 0) : i && (p.type === "data" || p.type === "tableDelimiterMarker" || p.type === "tableDelimiterFiller") && (s[3] = n);
  }
  for (a !== 0 && Dh(d, e, a, u, c), d.consume(e.events), n = -1; ++n < e.events.length; ) {
    const h = e.events[n];
    h[0] === "enter" && h[1].type === "table" && (h[1]._align = MN(e.events, n));
  }
  return t;
}
function Ls(t, e, n, r, i, o) {
  const s = r === 1 ? "tableHeader" : r === 2 ? "tableDelimiter" : "tableData", l = "tableContent";
  n[0] !== 0 && (o.end = Object.assign({}, ii(e.events, n[0])), t.add(n[0], 0, [["exit", o, e]]));
  const a = ii(e.events, n[1]);
  if (o = {
    type: s,
    start: Object.assign({}, a),
    // Note: correct end is set later.
    end: Object.assign({}, a)
  }, t.add(n[1], 0, [["enter", o, e]]), n[2] !== 0) {
    const u = ii(e.events, n[2]), c = ii(e.events, n[3]), f = {
      type: l,
      start: Object.assign({}, u),
      end: Object.assign({}, c)
    };
    if (t.add(n[2], 0, [["enter", f, e]]), r !== 2) {
      const d = e.events[n[2]], h = e.events[n[3]];
      if (d[1].end = Object.assign({}, h[1].end), d[1].type = "chunkText", d[1].contentType = "text", n[3] > n[2] + 1) {
        const p = n[2] + 1, k = n[3] - n[2] - 1;
        t.add(p, k, []);
      }
    }
    t.add(n[3] + 1, 0, [["exit", f, e]]);
  }
  return i !== void 0 && (o.end = Object.assign({}, ii(e.events, i)), t.add(i, 0, [["exit", o, e]]), o = void 0), o;
}
function Dh(t, e, n, r, i) {
  const o = [], s = ii(e.events, n);
  i && (i.end = Object.assign({}, s), o.push(["exit", i, e])), r.end = Object.assign({}, s), o.push(["exit", r, e]), t.add(n + 1, 0, o);
}
function ii(t, e) {
  const n = t[e], r = n[0] === "enter" ? "start" : "end";
  return n[1][r];
}
const IN = {
  name: "tasklistCheck",
  tokenize: EN
};
function AN() {
  return {
    text: {
      91: IN
    }
  };
}
function EN(t, e, n) {
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
    return Ce(a) ? (t.enter("taskListCheckValueUnchecked"), t.consume(a), t.exit("taskListCheckValueUnchecked"), s) : a === 88 || a === 120 ? (t.enter("taskListCheckValueChecked"), t.consume(a), t.exit("taskListCheckValueChecked"), s) : n(a);
  }
  function s(a) {
    return a === 93 ? (t.enter("taskListCheckMarker"), t.consume(a), t.exit("taskListCheckMarker"), t.exit("taskListCheck"), l) : n(a);
  }
  function l(a) {
    return Y(a) ? e(a) : ce(a) ? t.check({
      tokenize: ON
    }, e, n)(a) : n(a);
  }
}
function ON(t, e, n) {
  return he(t, r, "whitespace");
  function r(i) {
    return i === null ? n(i) : e(i);
  }
}
function DN(t) {
  return pp([
    iN(),
    pN(),
    Ay(t),
    vN(),
    AN()
  ]);
}
const RN = {};
function LN(t) {
  const e = (
    /** @type {Processor<Root>} */
    this
  ), n = t || RN, r = e.data(), i = r.micromarkExtensions || (r.micromarkExtensions = []), o = r.fromMarkdownExtensions || (r.fromMarkdownExtensions = []), s = r.toMarkdownExtensions || (r.toMarkdownExtensions = []);
  i.push(DN(n)), o.push(eN()), s.push(tN(n));
}
function X(t, e) {
  return Object.assign(t, { meta: {
    package: "@milkdown/preset-gfm",
    ...e
  } }), t;
}
var tf = us("strike_through");
X(tf, {
  displayName: "Attr<strikethrough>",
  group: "Strikethrough"
});
var ms = Hi("strike_through", (t) => ({
  parseDOM: [{ tag: "del" }, {
    style: "text-decoration",
    getAttrs: (e) => e === "line-through"
  }],
  toDOM: (e) => ["del", t.get(tf.key)(e)],
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
X(ms.mark, {
  displayName: "MarkSchema<strikethrough>",
  group: "Strikethrough"
});
X(ms.ctx, {
  displayName: "MarkSchemaCtx<strikethrough>",
  group: "Strikethrough"
});
var nf = ie("ToggleStrikeThrough", (t) => () => rs(ms.type(t)));
X(nf, {
  displayName: "Command<ToggleStrikethrough>",
  group: "Strikethrough"
});
var Ey = wt((t) => is(new RegExp("(?:^|[^\\\\w:/])(~{1,2})(.+?)\\\\1(?!\\\\w|\\\\/)"), ms.type(t), { updateCaptured: (e) => e.fullMatch.startsWith("~") ? e : { start: e.start + 1, fullMatch: e.fullMatch.slice(1) } }));
X(Ey, {
  displayName: "InputRule<strikethrough>",
  group: "Strikethrough"
});
var rf = xt("strikeThroughKeymap", { ToggleStrikethrough: {
  shortcuts: "Mod-Alt-x",
  command: (t) => {
    const e = t.get(ye);
    return () => e.call(nf.key);
  }
} });
X(rf.ctx, {
  displayName: "KeymapCtx<strikethrough>",
  group: "Strikethrough"
});
X(rf.shortcuts, {
  displayName: "Keymap<strikethrough>",
  group: "Strikethrough"
});
var gs = nv({
  tableGroup: "block",
  cellContent: "paragraph",
  cellAttributes: { alignment: {
    default: "left",
    getFromDOM: (t) => t.style.textAlign || "left",
    setDOMAttr: (t, e) => {
      e.style = `text-align: ${t || "left"}`;
    }
  } }
}), Nn = Ie("table", () => ({
  ...gs.table,
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
X(Nn.node, {
  displayName: "NodeSchema<table>",
  group: "Table"
});
X(Nn.ctx, {
  displayName: "NodeSchemaCtx<table>",
  group: "Table"
});
var ys = Ie("table_header_row", () => ({
  ...gs.table_row,
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
X(ys.node, {
  displayName: "NodeSchema<tableHeaderRow>",
  group: "Table"
});
X(ys.ctx, {
  displayName: "NodeSchemaCtx<tableHeaderRow>",
  group: "Table"
});
var Ui = Ie("table_row", () => ({
  ...gs.table_row,
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
X(Ui.node, {
  displayName: "NodeSchema<tableRow>",
  group: "Table"
});
X(Ui.ctx, {
  displayName: "NodeSchemaCtx<tableRow>",
  group: "Table"
});
var ks = Ie("table_cell", () => ({
  ...gs.table_cell,
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
X(ks.node, {
  displayName: "NodeSchema<tableCell>",
  group: "Table"
});
X(ks.ctx, {
  displayName: "NodeSchemaCtx<tableCell>",
  group: "Table"
});
var Bi = Ie("table_header", () => ({
  ...gs.table_header,
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
X(Bi.node, {
  displayName: "NodeSchema<tableHeader>",
  group: "Table"
});
X(Bi.ctx, {
  displayName: "NodeSchemaCtx<tableHeader>",
  group: "Table"
});
function Oy(t, e = 3, n = 3) {
  const r = Array(n).fill(0).map(() => ks.type(t).createAndFill()), i = Array(n).fill(0).map(() => Bi.type(t).createAndFill()), o = Array(e).fill(0).map((s, l) => l === 0 ? ys.type(t).create(null, i) : Ui.type(t).create(null, r));
  return Nn.type(t).create(null, o);
}
function Dy(t) {
  return (e, n) => (r) => {
    n = n ?? r.selection.from;
    const i = r.doc.resolve(n), o = cC((a) => a.type.name === "table")(i), s = o ? {
      node: o.node,
      from: o.start
    } : void 0, l = t === "row";
    if (s) {
      const a = be.get(s.node);
      if (e >= 0 && e < (l ? a.height : a.width)) {
        const u = a.positionAt(l ? e : a.height - 1, l ? a.width - 1 : e, s.node), c = r.doc.resolve(s.from + u), f = l ? ve.rowSelection : ve.colSelection, d = a.positionAt(l ? e : 0, l ? 0 : e, s.node), h = r.doc.resolve(s.from + d);
        return Om(r.setSelection(f(c, h)));
      }
    }
    return r;
  };
}
var PN = Dy("row"), zN = Dy("col");
function Ry(t, e, { map: n, tableStart: r, table: i }, o) {
  const s = Array(o).fill(0).reduce((a, u, c) => a + i.child(c).nodeSize, r), l = Array(n.width).fill(0).map((a, u) => {
    const c = i.nodeAt(n.map[u]);
    return ks.type(t).createAndFill({ alignment: c == null ? void 0 : c.attrs.alignment });
  });
  return e.insert(s, Ui.type(t).create(null, l)), e;
}
function BN(t) {
  const e = ps(t.$from);
  if (!e) return;
  const n = be.get(e.node);
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
function FN(t) {
  const e = BN(t.selection);
  if (e && e[0]) {
    const n = t.doc.resolve(e[0].pos), r = e[e.length - 1];
    if (r) {
      const i = t.doc.resolve(r.pos);
      return Om(t.setSelection(new ve(i, n)));
    }
  }
  return t;
}
var of = ie("GoToPrevTableCell", () => () => dy(-1));
X(of, {
  displayName: "Command<goToPrevTableCellCommand>",
  group: "Table"
});
var sf = ie("GoToNextTableCell", () => () => dy(1));
X(sf, {
  displayName: "Command<goToNextTableCellCommand>",
  group: "Table"
});
var lf = ie("ExitTable", (t) => () => (e, n) => {
  if (!Ve(e)) return !1;
  const { $head: r } = e.selection, i = uC(r, Nn.type(t));
  if (!i) return !1;
  const { to: o } = i, s = e.tr.replaceWith(o, o, nn.type(t).createAndFill());
  return s.setSelection(oe.near(s.doc.resolve(o), 1)).scrollIntoView(), n == null || n(s), !0;
});
X(lf, {
  displayName: "Command<breakTableCommand>",
  group: "Table"
});
var Ly = ie("InsertTable", (t) => ({ row: e, col: n } = {}) => (r, i) => {
  const { selection: o, tr: s } = r, { from: l } = o, a = Oy(t, e, n), u = s.replaceSelectionWith(a), c = oe.findFrom(u.doc.resolve(l), 1, !0);
  return c && u.setSelection(c), i == null || i(u), !0;
});
X(Ly, {
  displayName: "Command<insertTableCommand>",
  group: "Table"
});
var Py = ie("MoveRow", () => ({ from: t, to: e, pos: n } = {}) => Av({
  from: t ?? 0,
  to: e ?? 0,
  pos: n
}));
X(Py, {
  displayName: "Command<moveRowCommand>",
  group: "Table"
});
var zy = ie("MoveCol", () => ({ from: t, to: e, pos: n } = {}) => Ev({
  from: t ?? 0,
  to: e ?? 0,
  pos: n
}));
X(zy, {
  displayName: "Command<moveColCommand>",
  group: "Table"
});
var By = ie("SelectRow", () => (t = { index: 0 }) => (e, n) => {
  const { tr: r } = e;
  return !!(n == null ? void 0 : n(PN(t.index, t.pos)(r)));
});
X(By, {
  displayName: "Command<selectRowCommand>",
  group: "Table"
});
var Fy = ie("SelectCol", () => (t = { index: 0 }) => (e, n) => {
  const { tr: r } = e;
  return !!(n == null ? void 0 : n(zN(t.index, t.pos)(r)));
});
X(Fy, {
  displayName: "Command<selectColCommand>",
  group: "Table"
});
var $y = ie("SelectTable", () => () => (t, e) => {
  const { tr: n } = t;
  return !!(e == null ? void 0 : e(FN(n)));
});
X($y, {
  displayName: "Command<selectTableCommand>",
  group: "Table"
});
var _y = ie("DeleteSelectedCells", () => () => (t, e) => {
  const { selection: n } = t;
  if (!(n instanceof ve)) return !1;
  const r = n.isRowSelection(), i = n.isColSelection();
  return r && i ? Iv(t, e) : i ? uy(t, e) : fy(t, e);
});
X(_y, {
  displayName: "Command<deleteSelectedCellsCommand>",
  group: "Table"
});
var Vy = ie("AddColBefore", () => () => ly);
X(Vy, {
  displayName: "Command<addColBeforeCommand>",
  group: "Table"
});
var Hy = ie("AddColAfter", () => () => ay);
X(Hy, {
  displayName: "Command<addColAfterCommand>",
  group: "Table"
});
var jy = ie("AddRowBefore", (t) => () => (e, n) => {
  if (!Ve(e)) return !1;
  if (n) {
    const r = an(e);
    n(Ry(t, e.tr, r, r.top));
  }
  return !0;
});
X(jy, {
  displayName: "Command<addRowBeforeCommand>",
  group: "Table"
});
var Wy = ie("AddRowAfter", (t) => () => (e, n) => {
  if (!Ve(e)) return !1;
  if (n) {
    const r = an(e);
    n(Ry(t, e.tr, r, r.bottom));
  }
  return !0;
});
X(Wy, {
  displayName: "Command<addRowAfterCommand>",
  group: "Table"
});
var qy = ie("SetAlign", () => (t = "left") => vv("alignment", t));
X(qy, {
  displayName: "Command<setAlignCommand>",
  group: "Table"
});
var Ky = wt((t) => new At(/^\|(\d+)[xX](\d+)\|\s$/, (e, n, r, i) => {
  var a, u;
  const o = e.doc.resolve(r);
  if (!o.node(-1).canReplaceWith(o.index(-1), o.indexAfter(-1), Nn.type(t))) return null;
  const s = Oy(t, Math.max(Number(((a = n.groups) == null ? void 0 : a.row) ?? 0), 2), Number((u = n.groups) == null ? void 0 : u.col)), l = e.tr.replaceRangeWith(r, i, s);
  return l.setSelection(Z.create(l.doc, r + 3)).scrollIntoView();
}));
X(Ky, {
  displayName: "InputRule<insertTableInputRule>",
  group: "Table"
});
var Uy = yM((t) => ({ run: (e, n, r) => {
  if (r) return e;
  function i(u) {
    var w;
    const c = u.childCount, f = ((w = u.lastChild) == null ? void 0 : w.childCount) ?? 0;
    if (c === 0 || f === 0) return nn.type(t).create();
    const d = u.firstChild;
    if (!(f > 0 && d && d.childCount === 0)) return u;
    if (c >= 3) {
      const b = u.child(1), L = [];
      for (let H = 0; H < b.childCount; H++) {
        const T = b.child(H);
        L.push(Bi.type(t).create(T.attrs, T.content, T.marks));
      }
      const E = d.type.create(d.attrs, L), j = [];
      for (let H = 2; H < c; H++) j.push(u.child(H));
      return u.type.create(u.attrs, [E, ...j]);
    }
    const h = Array(f).fill(0).map(() => Bi.type(t).createAndFill()), p = new _(R.from(h), 0, 0), k = d.replace(0, 0, p);
    return u.replace(0, d.nodeSize, new _(R.from(k), 0, 0));
  }
  function o(u) {
    const c = Ui.type(t), f = [];
    let d = [], h = !1;
    function p() {
      if (d.length === 0) return;
      const k = ys.type(t).createAndFill(), w = Nn.type(t).create(null, [k, ...d]);
      f.push(i(w)), d = [];
    }
    return u.forEach((k) => {
      k.type === c ? (h = !0, d.push(k)) : (p(), f.push(k));
    }), p(), h ? R.from(f) : u;
  }
  function s(u) {
    let c = o(u), f = c !== u;
    const d = [];
    return c.forEach((h) => {
      if (h.type === Nn.type(t)) {
        const p = i(h);
        p !== h && (f = !0), d.push(p);
      } else if (h.childCount > 0) {
        const p = s(h.content);
        p !== h.content ? (f = !0, d.push(h.copy(p))) : d.push(h);
      } else d.push(h);
    }), f ? R.from(d) : u;
  }
  function l(u) {
    const c = [], f = [];
    u.forEach((d) => f.push(d));
    for (let d = 0; d < f.length; d++) {
      const h = f[d], p = f[d + 1];
      h.type === nn.type(t) && h.content.size === 0 && p && p.type === Nn.type(t) || c.push(h);
    }
    return c.length < f.length ? R.from(c) : u;
  }
  let a = s(e.content);
  return a = l(a), new _(R.from(a), e.openStart, e.openEnd);
} }));
X(Uy, {
  displayName: "PasteRule<table>",
  group: "Table"
});
var af = xt("tableKeymap", {
  NextCell: {
    priority: 100,
    shortcuts: ["Mod-]", "Tab"],
    command: (t) => {
      const e = t.get(ye);
      return () => e.call(sf.key);
    }
  },
  PrevCell: {
    shortcuts: ["Mod-[", "Shift-Tab"],
    command: (t) => {
      const e = t.get(ye);
      return () => e.call(of.key);
    }
  },
  ExitTable: {
    shortcuts: ["Mod-Enter", "Enter"],
    command: (t) => {
      const e = t.get(ye);
      return () => e.call(lf.key);
    }
  }
});
X(af.ctx, {
  displayName: "KeymapCtx<table>",
  group: "Table"
});
X(af.shortcuts, {
  displayName: "Keymap<table>",
  group: "Table"
});
var Ta = "footnote_definition", Rh = "footnoteDefinition", uf = Ie("footnote_definition", () => ({
  group: "block",
  content: "block+",
  defining: !0,
  attrs: { label: {
    default: "",
    validate: "string"
  } },
  parseDOM: [{
    tag: `dl[data-type="${Ta}"]`,
    getAttrs: (t) => {
      if (!(t instanceof HTMLElement)) throw rn(t);
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
        "data-type": Ta
      },
      ["dt", e],
      ["dd", 0]
    ];
  },
  parseMarkdown: {
    match: ({ type: t }) => t === Rh,
    runner: (t, e, n) => {
      t.openNode(n, { label: e.label }).next(e.children).closeNode();
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === Ta,
    runner: (t, e) => {
      t.openNode(Rh, void 0, {
        label: e.attrs.label,
        identifier: e.attrs.label
      }).next(e.content).closeNode();
    }
  }
}));
X(uf.ctx, {
  displayName: "NodeSchemaCtx<footnodeDef>",
  group: "footnote"
});
X(uf.node, {
  displayName: "NodeSchema<footnodeDef>",
  group: "footnote"
});
var Na = "footnote_reference", cf = Ie("footnote_reference", () => ({
  group: "inline",
  inline: !0,
  atom: !0,
  attrs: { label: {
    default: "",
    validate: "string"
  } },
  parseDOM: [{
    tag: `sup[data-type="${Na}"]`,
    getAttrs: (t) => {
      if (!(t instanceof HTMLElement)) throw rn(t);
      return { label: t.dataset.label };
    }
  }],
  toDOM: (t) => {
    const e = t.attrs.label;
    return [
      "sup",
      {
        "data-label": e,
        "data-type": Na
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
    match: (t) => t.type.name === Na,
    runner: (t, e) => {
      t.addNode("footnoteReference", void 0, void 0, {
        label: e.attrs.label,
        identifier: e.attrs.label
      });
    }
  }
}));
X(cf.ctx, {
  displayName: "NodeSchemaCtx<footnodeRef>",
  group: "footnote"
});
X(cf.node, {
  displayName: "NodeSchema<footnodeRef>",
  group: "footnote"
});
var ff = En.extendSchema((t) => (e) => {
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
        if (!(r instanceof HTMLElement)) throw rn(r);
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
X(ff.node, {
  displayName: "NodeSchema<taskListItem>",
  group: "ListItem"
});
X(ff.ctx, {
  displayName: "NodeSchemaCtx<taskListItem>",
  group: "ListItem"
});
var Jy = wt(() => new At(/^\[(\s|x)\]\s$/, (t, e, n, r) => {
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
X(Jy, {
  displayName: "InputRule<wrapInTaskListInputRule>",
  group: "ListItem"
});
var $N = [rf, af].flat(), _N = [Ky, Jy], VN = [Ey], HN = [Uy], Gy = sn(() => oT);
X(Gy, {
  displayName: "Prose<autoInsertSpanPlugin>",
  group: "Prose"
});
var jN = sn(() => _v({}));
X(jN, {
  displayName: "Prose<columnResizingPlugin>",
  group: "Prose"
});
var Yy = sn(() => Yv({ allowTableNodeSelection: !0 }));
X(Yy, {
  displayName: "Prose<tableEditingPlugin>",
  group: "Prose"
});
var df = ln("remarkGFM", () => LN);
X(df.plugin, {
  displayName: "Remark<remarkGFMPlugin>",
  group: "Remark"
});
X(df.options, {
  displayName: "RemarkConfig<remarkGFMPlugin>",
  group: "Remark"
});
var WN = new rt("MILKDOWN_KEEP_TABLE_ALIGN_PLUGIN");
function qN(t, e) {
  let n = 0;
  return e.forEach((r, i, o) => {
    r === t && (n = o);
  }), n;
}
var Qy = sn(() => new Be({
  key: WN,
  appendTransaction: (t, e, n) => {
    let r;
    const i = (o, s) => {
      if (r || (r = n.tr), o.type.name !== "table_cell") return;
      const l = n.doc.resolve(s), a = l.node(l.depth), u = l.node(l.depth - 1).firstChild;
      if (!u) return;
      const c = qN(o, a), f = u.maybeChild(c);
      if (!f) return;
      const d = f.attrs.alignment;
      d !== o.attrs.alignment && r.setNodeMarkup(s, void 0, {
        ...o.attrs,
        alignment: d
      });
    };
    return e.doc !== n.doc && n.doc.descendants(i), r;
  }
}));
X(Qy, {
  displayName: "Prose<keepTableAlignPlugin>",
  group: "Prose"
});
var KN = [
  Qy,
  Gy,
  df,
  Yy
].flat(), UN = [
  ff,
  Nn,
  ys,
  Ui,
  Bi,
  ks,
  uf,
  cf,
  tf,
  ms
].flat(), JN = [
  sf,
  of,
  lf,
  Ly,
  Py,
  zy,
  By,
  Fy,
  $y,
  _y,
  jy,
  Wy,
  Vy,
  Hy,
  qy,
  nf
], GN = [
  UN,
  _N,
  HN,
  VN,
  $N,
  JN,
  KN
].flat(), hl = 200, He = function() {
};
He.prototype.append = function(e) {
  return e.length ? (e = He.from(e), !this.length && e || e.length < hl && this.leafAppend(e) || this.length < hl && e.leafPrepend(this) || this.appendInner(e)) : this;
};
He.prototype.prepend = function(e) {
  return e.length ? He.from(e).append(this) : this;
};
He.prototype.appendInner = function(e) {
  return new YN(this, e);
};
He.prototype.slice = function(e, n) {
  return e === void 0 && (e = 0), n === void 0 && (n = this.length), e >= n ? He.empty : this.sliceInner(Math.max(0, e), Math.min(this.length, n));
};
He.prototype.get = function(e) {
  if (!(e < 0 || e >= this.length))
    return this.getInner(e);
};
He.prototype.forEach = function(e, n, r) {
  n === void 0 && (n = 0), r === void 0 && (r = this.length), n <= r ? this.forEachInner(e, n, r, 0) : this.forEachInvertedInner(e, n, r, 0);
};
He.prototype.map = function(e, n, r) {
  n === void 0 && (n = 0), r === void 0 && (r = this.length);
  var i = [];
  return this.forEach(function(o, s) {
    return i.push(e(o, s));
  }, n, r), i;
};
He.from = function(e) {
  return e instanceof He ? e : e && e.length ? new Xy(e) : He.empty;
};
var Xy = /* @__PURE__ */ function(t) {
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
    if (this.length + i.length <= hl)
      return new e(this.values.concat(i.flatten()));
  }, e.prototype.leafPrepend = function(i) {
    if (this.length + i.length <= hl)
      return new e(i.flatten().concat(this.values));
  }, n.length.get = function() {
    return this.values.length;
  }, n.depth.get = function() {
    return 0;
  }, Object.defineProperties(e.prototype, n), e;
}(He);
He.empty = new Xy([]);
var YN = /* @__PURE__ */ function(t) {
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
}(He);
const QN = 500;
class qt {
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
    return this.items.forEach((f, d) => {
      if (!f.step) {
        i || (i = this.remapping(r, d + 1), o = i.maps.length), o--, c.push(f);
        return;
      }
      if (i) {
        c.push(new Yt(f.map));
        let h = f.step.map(i.slice(o)), p;
        h && s.maybeStep(h).doc && (p = s.mapping.maps[s.mapping.maps.length - 1], u.push(new Yt(p, void 0, void 0, u.length + c.length))), o--, p && i.appendMap(p, o);
      } else
        s.maybeStep(f.step);
      if (f.selection)
        return l = i ? f.selection.map(i.slice(o)) : f.selection, a = new qt(this.items.slice(0, r).append(c.reverse().concat(u)), this.eventCount - 1), !1;
    }, this.items.length, 0), { remaining: a, transform: s, selection: l };
  }
  // Create a new branch with the given transform added.
  addTransform(e, n, r, i) {
    let o = [], s = this.eventCount, l = this.items, a = !i && l.length ? l.get(l.length - 1) : null;
    for (let c = 0; c < e.steps.length; c++) {
      let f = e.steps[c].invert(e.docs[c]), d = new Yt(e.mapping.maps[c], f, n), h;
      (h = a && a.merge(d)) && (d = h, c ? o.pop() : l = l.slice(0, l.length - 1)), o.push(d), n && (s++, n = void 0), i || (a = d);
    }
    let u = s - r.depth;
    return u > ZN && (l = XN(l, u), s -= u), new qt(l.append(o), s);
  }
  remapping(e, n) {
    let r = new Ao();
    return this.items.forEach((i, o) => {
      let s = i.mirrorOffset != null && o - i.mirrorOffset >= e ? r.maps.length - i.mirrorOffset : void 0;
      r.appendMap(i.map, s);
    }, e, n), r;
  }
  addMaps(e) {
    return this.eventCount == 0 ? this : new qt(this.items.append(e.map((n) => new Yt(n))), this.eventCount);
  }
  // When the collab module receives remote changes, the history has
  // to know about those, so that it can adjust the steps that were
  // rebased on top of the remote changes, and include the position
  // maps for the remote changes in its array of items.
  rebased(e, n) {
    if (!this.eventCount)
      return this;
    let r = [], i = Math.max(0, this.items.length - n), o = e.mapping, s = e.steps.length, l = this.eventCount;
    this.items.forEach((d) => {
      d.selection && l--;
    }, i);
    let a = n;
    this.items.forEach((d) => {
      let h = o.getMirror(--a);
      if (h == null)
        return;
      s = Math.min(s, h);
      let p = o.maps[h];
      if (d.step) {
        let k = e.steps[h].invert(e.docs[h]), w = d.selection && d.selection.map(o.slice(a + 1, h));
        w && l++, r.push(new Yt(p, k, w));
      } else
        r.push(new Yt(p));
    }, i);
    let u = [];
    for (let d = n; d < s; d++)
      u.push(new Yt(o.maps[d]));
    let c = this.items.slice(0, i).append(u).append(r), f = new qt(c, l);
    return f.emptyItemCount() > QN && (f = f.compress(this.items.length - r.length)), f;
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
          let f = new Yt(u.invert(), a, c), d, h = i.length - 1;
          (d = i.length && i[h].merge(f)) ? i[h] = d : i.push(f);
        }
      } else s.map && r--;
    }, this.items.length, 0), new qt(He.from(i.reverse()), o);
  }
}
qt.empty = new qt(He.empty, 0);
function XN(t, e) {
  let n;
  return t.forEach((r, i) => {
    if (r.selection && e-- == 0)
      return n = i, !1;
  }), t.slice(n);
}
class Yt {
  constructor(e, n, r, i) {
    this.map = e, this.step = n, this.selection = r, this.mirrorOffset = i;
  }
  merge(e) {
    if (this.step && e.step && !e.selection) {
      let n = e.step.merge(this.step);
      if (n)
        return new Yt(n.getMap().invert(), n, this.selection);
    }
  }
}
class Vn {
  constructor(e, n, r, i, o) {
    this.done = e, this.undone = n, this.prevRanges = r, this.prevTime = i, this.prevComposition = o;
  }
}
const ZN = 20;
function eI(t, e, n, r) {
  let i = n.getMeta(Rr), o;
  if (i)
    return i.historyState;
  n.getMeta(Zy) && (t = new Vn(t.done, t.undone, null, 0, -1));
  let s = n.getMeta("appendedTransaction");
  if (n.steps.length == 0)
    return t;
  if (s && s.getMeta(Rr))
    return s.getMeta(Rr).redo ? new Vn(t.done.addTransform(n, void 0, r, Qs(e)), t.undone, Lh(n.mapping.maps), t.prevTime, t.prevComposition) : new Vn(t.done, t.undone.addTransform(n, void 0, r, Qs(e)), null, t.prevTime, t.prevComposition);
  if (n.getMeta("addToHistory") !== !1 && !(s && s.getMeta("addToHistory") === !1)) {
    let l = n.getMeta("composition"), a = t.prevTime == 0 || !s && t.prevComposition != l && (t.prevTime < (n.time || 0) - r.newGroupDelay || !tI(n, t.prevRanges)), u = s ? Ia(t.prevRanges, n.mapping) : Lh(n.mapping.maps);
    return new Vn(t.done.addTransform(n, a ? e.selection.getBookmark() : void 0, r, Qs(e)), qt.empty, u, n.time, l ?? t.prevComposition);
  } else return (o = n.getMeta("rebased")) ? new Vn(t.done.rebased(n, o), t.undone.rebased(n, o), Ia(t.prevRanges, n.mapping), t.prevTime, t.prevComposition) : new Vn(t.done.addMaps(n.mapping.maps), t.undone.addMaps(n.mapping.maps), Ia(t.prevRanges, n.mapping), t.prevTime, t.prevComposition);
}
function tI(t, e) {
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
function Lh(t) {
  let e = [];
  for (let n = t.length - 1; n >= 0 && e.length == 0; n--)
    t[n].forEach((r, i, o, s) => e.push(o, s));
  return e;
}
function Ia(t, e) {
  if (!t)
    return null;
  let n = [];
  for (let r = 0; r < t.length; r += 2) {
    let i = e.map(t[r], 1), o = e.map(t[r + 1], -1);
    i <= o && n.push(i, o);
  }
  return n;
}
function nI(t, e, n) {
  let r = Qs(e), i = Rr.get(e).spec.config, o = (n ? t.undone : t.done).popEvent(e, r);
  if (!o)
    return null;
  let s = o.selection.resolve(o.transform.doc), l = (n ? t.done : t.undone).addTransform(o.transform, e.selection.getBookmark(), i, r), a = new Vn(n ? l : o.remaining, n ? o.remaining : l, null, 0, -1);
  return o.transform.setSelection(s).setMeta(Rr, { redo: n, historyState: a });
}
let Aa = !1, Ph = null;
function Qs(t) {
  let e = t.plugins;
  if (Ph != e) {
    Aa = !1, Ph = e;
    for (let n = 0; n < e.length; n++)
      if (e[n].spec.historyPreserveItems) {
        Aa = !0;
        break;
      }
  }
  return Aa;
}
function Zr(t) {
  return t.setMeta(Zy, !0);
}
const Rr = new rt("history"), Zy = new rt("closeHistory");
function rI(t = {}) {
  return t = {
    depth: t.depth || 100,
    newGroupDelay: t.newGroupDelay || 500
  }, new Be({
    key: Rr,
    state: {
      init() {
        return new Vn(qt.empty, qt.empty, null, 0, -1);
      },
      apply(e, n, r) {
        return eI(n, r, e, t);
      }
    },
    config: t,
    props: {
      handleDOMEvents: {
        beforeinput(e, n) {
          let r = n.inputType, i = r == "historyUndo" ? vo : r == "historyRedo" ? si : null;
          return !i || !e.editable ? !1 : (n.preventDefault(), i(e.state, e.dispatch));
        }
      }
    }
  });
}
function ek(t, e) {
  return (n, r) => {
    let i = Rr.getState(n);
    if (!i || (t ? i.undone : i.done).eventCount == 0)
      return !1;
    if (r) {
      let o = nI(i, n, t);
      o && r(e ? o.scrollIntoView() : o);
    }
    return !0;
  };
}
const vo = ek(!1, !0), si = ek(!0, !0);
function Ji(t, e) {
  return Object.assign(t, { meta: {
    package: "@milkdown/plugin-history",
    ...e
  } }), t;
}
var hf = ie("Undo", () => () => vo);
Ji(hf, { displayName: "Command<undo>" });
var pf = ie("Redo", () => () => si);
Ji(pf, { displayName: "Command<redo>" });
var mf = An({}, "historyProviderConfig");
Ji(mf, { displayName: "Ctx<historyProviderConfig>" });
var tk = sn((t) => rI(t.get(mf.key)));
Ji(tk, { displayName: "Ctx<historyProviderPlugin>" });
var gf = xt("historyKeymap", {
  Undo: {
    shortcuts: "Mod-z",
    command: (t) => {
      const e = t.get(ye);
      return () => e.call(hf.key);
    }
  },
  Redo: {
    shortcuts: ["Mod-y", "Shift-Mod-z"],
    command: (t) => {
      const e = t.get(ye);
      return () => e.call(pf.key);
    }
  }
});
Ji(gf.ctx, { displayName: "KeymapCtx<history>" });
Ji(gf.shortcuts, { displayName: "Keymap<history>" });
var iI = [
  mf,
  tk,
  gf,
  hf,
  pf
].flat(), oI = typeof global == "object" && global && global.Object === Object && global, sI = typeof self == "object" && self && self.Object === Object && self, nk = oI || sI || Function("return this")(), pl = nk.Symbol, rk = Object.prototype, lI = rk.hasOwnProperty, aI = rk.toString, ro = pl ? pl.toStringTag : void 0;
function uI(t) {
  var e = lI.call(t, ro), n = t[ro];
  try {
    t[ro] = void 0;
    var r = !0;
  } catch {
  }
  var i = aI.call(t);
  return r && (e ? t[ro] = n : delete t[ro]), i;
}
var cI = Object.prototype, fI = cI.toString;
function dI(t) {
  return fI.call(t);
}
var hI = "[object Null]", pI = "[object Undefined]", zh = pl ? pl.toStringTag : void 0;
function mI(t) {
  return t == null ? t === void 0 ? pI : hI : zh && zh in Object(t) ? uI(t) : dI(t);
}
function gI(t) {
  return t != null && typeof t == "object";
}
var yI = "[object Symbol]";
function kI(t) {
  return typeof t == "symbol" || gI(t) && mI(t) == yI;
}
var bI = /\s/;
function wI(t) {
  for (var e = t.length; e-- && bI.test(t.charAt(e)); )
    ;
  return e;
}
var xI = /^\s+/;
function CI(t) {
  return t && t.slice(0, wI(t) + 1).replace(xI, "");
}
function Su(t) {
  var e = typeof t;
  return t != null && (e == "object" || e == "function");
}
var Bh = NaN, SI = /^[-+]0x[0-9a-f]+$/i, MI = /^0b[01]+$/i, vI = /^0o[0-7]+$/i, TI = parseInt;
function Fh(t) {
  if (typeof t == "number")
    return t;
  if (kI(t))
    return Bh;
  if (Su(t)) {
    var e = typeof t.valueOf == "function" ? t.valueOf() : t;
    t = Su(e) ? e + "" : e;
  }
  if (typeof t != "string")
    return t === 0 ? t : +t;
  t = CI(t);
  var n = MI.test(t);
  return n || vI.test(t) ? TI(t.slice(2), n ? 2 : 8) : SI.test(t) ? Bh : +t;
}
var Ea = function() {
  return nk.Date.now();
}, NI = "Expected a function", II = Math.max, AI = Math.min;
function EI(t, e, n) {
  var r, i, o, s, l, a, u = 0, c = !1, f = !1, d = !0;
  if (typeof t != "function")
    throw new TypeError(NI);
  e = Fh(e) || 0, Su(n) && (c = !!n.leading, f = "maxWait" in n, o = f ? II(Fh(n.maxWait) || 0, e) : o, d = "trailing" in n ? !!n.trailing : d);
  function h(T) {
    var z = r, U = i;
    return r = i = void 0, u = T, s = t.apply(U, z), s;
  }
  function p(T) {
    return u = T, l = setTimeout(b, e), c ? h(T) : s;
  }
  function k(T) {
    var z = T - a, U = T - u, G = e - z;
    return f ? AI(G, o - U) : G;
  }
  function w(T) {
    var z = T - a, U = T - u;
    return a === void 0 || z >= e || z < 0 || f && U >= o;
  }
  function b() {
    var T = Ea();
    if (w(T))
      return L(T);
    l = setTimeout(b, k(T));
  }
  function L(T) {
    return l = void 0, d && r ? h(T) : (r = i = void 0, s);
  }
  function E() {
    l !== void 0 && clearTimeout(l), u = 0, r = a = i = l = void 0;
  }
  function j() {
    return l === void 0 ? s : L(Ea());
  }
  function H() {
    var T = Ea(), z = w(T);
    if (r = arguments, i = this, a = T, z) {
      if (l === void 0)
        return p(a);
      if (f)
        return clearTimeout(l), l = setTimeout(b, e), h(a);
    }
    return l === void 0 && (l = setTimeout(b, e)), s;
  }
  return H.cancel = E, H.flush = j, H;
}
var ik = class {
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
}, Mu = fe(new ik(), "listener"), OI = new rt("MILKDOWN_LISTENER"), vu = (t) => (t.inject(Mu, new ik()), async () => {
  await t.wait(Or);
  const { listeners: e } = t.get(Mu);
  e.beforeMount.forEach((u) => u(t)), await t.wait(So);
  const n = t.get(Mo);
  let r = null, i = null, o = null, s = null;
  const l = EI(() => {
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
  }, 200), a = new Be({
    key: OI,
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
  t.update(tn, (u) => u.concat(a)), await t.wait(Ks), e.mounted.forEach((u) => u(t));
});
vu.meta = {
  package: "@milkdown/plugin-listener",
  displayName: "Listener"
};
const DI = [Ay()], RI = [by()];
function ok(t, e = "Markdown") {
  const n = String(t || ""), { body: r, frontmatterLines: i } = sk(n), s = Du(r, { extensions: DI, mdastExtensions: RI }).children || [];
  for (let l = 0; l < s.length; l += 1) {
    const a = s[l];
    if (a.type !== "heading" || a.depth !== 1) continue;
    const u = Tu(a.children);
    if (!u) continue;
    const c = s[l - 1], f = s[l + 1];
    if (c && f && c.type === "html" && PI(c.value) && f.type === "html" && zI(f.value))
      return {
        displayText: u,
        source: "aligned-h1",
        isFileNameFallback: !1,
        locator: {
          kind: "aligned-lines",
          startLine: Oa(c.position, i),
          endLine: $h(f.position, i),
          titleLine: Oa(a.position, i)
        }
      };
    const d = Oa(a.position, i), h = $h(a.position, i);
    return d === h ? {
      displayText: u,
      source: "atx-h1",
      isFileNameFallback: !1,
      locator: { kind: "atx-line", startLine: d, endLine: h, titleLine: d }
    } : {
      displayText: u,
      source: "setext-h1",
      isFileNameFallback: !1,
      locator: { kind: "setext-lines", startLine: d, endLine: h, titleLine: d }
    };
  }
  return {
    displayText: String(e || "Markdown"),
    source: "file-name",
    isFileNameFallback: !0,
    locator: null
  };
}
function LI(t, e, n = {}) {
  const r = String(e || "").trim();
  if (!r)
    return String(t || "");
  const i = String(t || ""), o = n.newline || (i.includes(`\r
`) ? `\r
` : `
`), s = i.split(/\r?\n/), l = ok(i, "");
  if (l.locator) {
    const { kind: u, titleLine: c } = l.locator;
    return u === "setext-lines" ? s[c] = r : s[c] = `# ${r}`, s.join(o);
  }
  const { frontmatterLines: a } = sk(i);
  if (a > 0) {
    const u = s.slice(0, a), c = s.slice(a);
    let f = 0;
    for (; f < c.length && c[f].trim() === ""; )
      f += 1;
    const d = c.slice(f);
    return [...u, "", `# ${r}`, "", ...d].join(o);
  }
  return i.trim() ? [`# ${r}`, "", ...s].join(o) : `# ${r}${o}`;
}
function Tu(t) {
  let e = "";
  for (const n of t || [])
    switch (n.type) {
      case "text":
        e += n.value;
        break;
      case "inlineCode":
        e += n.value;
        break;
      case "link":
      case "linkReference":
        e += Tu(n.children);
        break;
      case "image":
        e += n.alt || "";
        break;
      case "emphasis":
      case "strong":
      case "delete":
        e += Tu(n.children);
        break;
      case "break":
        e += " ";
        break;
    }
  return e.trim();
}
function sk(t) {
  const e = t.split(/\r?\n/);
  if ((e[0] || "").trim() !== "---")
    return { body: t, frontmatterLines: 0 };
  for (let n = 1; n < e.length; n += 1)
    if (e[n].trim() === "---")
      return { body: e.slice(n + 1).join(`
`), frontmatterLines: n + 1 };
  return { body: t, frontmatterLines: 0 };
}
function Oa(t, e) {
  return (t && t.start ? t.start.line : 1) - 1 + e;
}
function $h(t, e) {
  return (t && t.end ? t.end.line : 1) - 1 + e;
}
function PI(t) {
  const e = String(t || "").trim().toLowerCase();
  return e === '<div align="center">' || e === '<div align="right">';
}
function zI(t) {
  return String(t || "").trim().toLowerCase() === "</div>";
}
const ml = /* @__PURE__ */ new WeakMap(), _h = ["name", "description", "trigger_keywords"], Da = [
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
function yr(t) {
  return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function BI(t = "") {
  const e = String(t || ""), n = e.match(/^---[ \t]*(?:\r?\n)([\s\S]*?)(?:\r?\n)---[ \t]*(?:\r?\n|$)/);
  return n ? {
    raw: n[0],
    body: e.slice(n[0].length),
    fields: HI(n[1] || "")
  } : null;
}
function FI(t = "") {
  return (String(t || "").split(/[\\/]/).pop() || "").toLowerCase() === "skill.md";
}
function gl(t = "") {
  return String(t || "").trim().replace(/^['"]|['"]$/g, "").trim();
}
function $I(t = "") {
  const e = String(t || "").trim();
  if (e.startsWith("[") && e.endsWith("]"))
    return e.slice(1, -1).split(",").map(gl).filter(Boolean);
  const n = gl(e);
  return n ? [n] : [];
}
function _I(t = "") {
  const e = String(t || "").match(/(?:^|\s)Triggers:\s*([\s\S]+)$/i);
  return e ? e[1].split(",").map((n) => gl(n.replace(/\.$/, ""))).filter(Boolean) : [];
}
function VI(t = "") {
  return String(t || "").replace(/\s*Triggers:\s*[\s\S]+$/i, "").trim();
}
function HI(t = "") {
  const e = [];
  let n = -1, r = -1, i = !1;
  return String(t || "").split(/\r?\n/).forEach((o) => {
    const s = o.trim();
    if (!s) return;
    if (s.startsWith("- ")) {
      if (n >= 0) {
        const c = gl(s.slice(2));
        c && e[n].values.push(c);
      }
      return;
    }
    if (/^\s/.test(o) && r >= 0) {
      const c = s;
      if (!c) return;
      const f = e[r].values;
      f[0] = [f[0], c].filter(Boolean).join(i ? " " : `
`);
      return;
    }
    const l = s.indexOf(":");
    if (l < 0) {
      n = -1, r = -1;
      return;
    }
    const a = s.slice(0, l).trim(), u = s.slice(l + 1).trim();
    if (a) {
      if (n = e.length, u === ">" || u === "|") {
        e.push({ key: a, values: [""] }), r = n, i = u === ">";
        return;
      }
      e.push({ key: a, values: $I(u) }), r = -1;
    }
  }), e;
}
function Vh(t, e) {
  return ((t == null ? void 0 : t.fields) || []).find((n) => n.key === e) || null;
}
function To(t, e) {
  var r, i;
  const n = Vh(t, e);
  if (n && e === "description")
    return (n.values || []).map(VI).filter(Boolean);
  if (n) return n.values || [];
  if (e === "trigger_keywords") {
    const o = ((i = (r = Vh(t, "description")) == null ? void 0 : r.values) == null ? void 0 : i[0]) || "";
    return _I(o);
  }
  return [];
}
function jI(t, e, n) {
  if (!t) return;
  const r = n.map((o) => String(o || "").trim()).filter(Boolean), i = t.fields.find((o) => o.key === e);
  i ? i.values = r : t.fields.push({ key: e, values: r });
}
function WI(t = "") {
  return String(t || "").replace(/^---[ \t]*(?:\r?\n)?/, "").replace(/(?:\r?\n)?---[ \t]*(?:\r?\n)?$/, "").split(/\r?\n/);
}
function qI(t = "") {
  const e = [];
  let n = null;
  return WI(t).forEach((r) => {
    const i = r.trim();
    if (i && !/^\s/.test(r) && i.includes(":")) {
      n = {
        key: i.slice(0, i.indexOf(":")).trim(),
        lines: [r]
      }, e.push(n);
      return;
    }
    n ? n.lines.push(r) : e.push({ key: "", lines: [r] });
  }), e;
}
function Hh(t, e = []) {
  const n = e.map((i) => String(i || "").trim()).filter(Boolean);
  if (t === "trigger_keywords")
    return n.length ? [`${t}:`, ...n.map((i) => `  - ${i}`)] : [];
  if (t === "description") {
    const i = n[0] || "";
    return i ? i.includes(`
`) ? [`${t}: >`, ...i.split(/\r?\n/).map((o) => `  ${o.trim()}`)] : [`${t}: ${i}`] : [];
  }
  const r = n[0] || "";
  return r ? [`${t}: ${r}`] : [];
}
function KI(t) {
  if (!t) return "";
  const e = /* @__PURE__ */ new Set(), n = [];
  return qI(t.raw).forEach((r) => {
    if (_h.includes(r.key)) {
      e.add(r.key), n.push(...Hh(r.key, To(t, r.key)));
      return;
    }
    n.push(...r.lines);
  }), _h.forEach((r) => {
    e.has(r) || n.push(...Hh(r, To(t, r)));
  }), `---
${n.filter((r, i, o) => {
    var s;
    return r.trim() || ((s = o[i - 1]) == null ? void 0 : s.trim());
  }).join(`
`).trim()}
---
`;
}
function UI(t) {
  if (!t) return null;
  const e = document.createElement("section");
  e.className = "markdown-frontmatter skill-frontmatter", e.setAttribute("contenteditable", "false");
  const n = To(t, "name")[0] || "", r = To(t, "description")[0] || "", i = To(t, "trigger_keywords").join(`
`);
  return e.innerHTML = `
    <div class="markdown-frontmatter-label">SKILL 元信息</div>
    <label class="markdown-frontmatter-row">
      <span class="markdown-frontmatter-key">name</span>
      <input class="markdown-frontmatter-input" data-frontmatter-field="name" value="${yr(n)}" spellcheck="false" />
    </label>
    <label class="markdown-frontmatter-row">
      <span class="markdown-frontmatter-key">description</span>
      <textarea class="markdown-frontmatter-input markdown-frontmatter-textarea" data-frontmatter-field="description" rows="3">${yr(r)}</textarea>
    </label>
    <label class="markdown-frontmatter-row">
      <span class="markdown-frontmatter-key">trigger_keywords</span>
      <textarea class="markdown-frontmatter-input markdown-frontmatter-textarea" data-frontmatter-field="trigger_keywords" rows="2" placeholder="每行一个关键词，也可以用逗号分隔">${yr(i)}</textarea>
    </label>
  `, e;
}
function JI(t, e, n) {
  !t || !e || t.querySelectorAll("[data-frontmatter-field]").forEach((r) => {
    r.addEventListener("input", () => {
      const i = r.dataset.frontmatterField, o = r.value || "", s = i === "trigger_keywords" ? o.split(/[,\n]/).map((l) => l.trim()).filter(Boolean) : [o.trim()];
      jI(e, i, s), n == null || n();
    });
  });
}
function jh(t = "") {
  const e = String(t || "").trim(), n = Da.some((r) => r.value === e);
  return !e || n ? Da : [
    ...Da,
    { value: e, label: e }
  ];
}
const Jt = {
  image: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 5.2h11a1.3 1.3 0 0 1 1.3 1.3v8a1.3 1.3 0 0 1-1.3 1.3h-11a1.3 1.3 0 0 1-1.3-1.3v-8a1.3 1.3 0 0 1 1.3-1.3Z" fill="none" stroke="currentColor" stroke-width="1.45"/><path d="m4 13.8 3.2-3.2 2.4 2.2 2.7-3.1 3.7 4.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/><circle cx="13.4" cy="7.8" r="1.1" fill="currentColor"/></svg>',
  h1: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14.7 15V8.2l-1.7.9" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  h2: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13.1 9.1c.4-.7 1-1 1.9-1 1.1 0 1.9.7 1.9 1.7 0 .8-.5 1.4-1.4 2.1l-2.3 2.1h3.8" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  h3: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13.2 8.7c.4-.4 1-.6 1.7-.6 1.1 0 1.9.6 1.9 1.5 0 .8-.6 1.3-1.4 1.4.9.1 1.6.7 1.6 1.6 0 1-.9 1.8-2.1 1.8-.8 0-1.5-.2-2-.7" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  h4: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16.2 14.5V8.2l-3.5 4.3h4.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  list: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 6h8M8 10h8M8 14h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="4.8" cy="6" r="1" fill="currentColor"/><circle cx="4.8" cy="10" r="1" fill="currentColor"/><circle cx="4.8" cy="14" r="1" fill="currentColor"/></svg>',
  orderedList: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 6h8M8 10h8M8 14h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4.3 7V4.5l-.8.4M3.5 9.2c.2-.3.6-.5 1-.5.7 0 1.1.4 1.1 1 0 .4-.3.8-.8 1.2l-1.2.9h2M3.6 13.2c.2-.2.5-.3.9-.3.7 0 1.1.3 1.1.8 0 .4-.3.7-.8.8.6.1 1 .4 1 .9 0 .6-.5 1-1.3 1-.4 0-.8-.1-1.1-.3" fill="none" stroke="currentColor" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  table: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 5h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM3.5 8.5h13M8 5v10M12.5 5v10" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/></svg>',
  code: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.4 6.6-3.2 3.4 3.2 3.4M12.6 6.6l3.2 3.4-3.2 3.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cover: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 5.2h11a1.3 1.3 0 0 1 1.3 1.3v8a1.3 1.3 0 0 1-1.3 1.3h-11a1.3 1.3 0 0 1-1.3-1.3v-8a1.3 1.3 0 0 1 1.3-1.3Z" fill="none" stroke="currentColor" stroke-width="1.45"/><path d="M4.3 13.4 7 10.7l2.2 2 2.9-3.4 3.6 4.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.4 7.6h3.4M14.1 5.9v3.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
}, Bn = {
  left: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M4 8h8.5M4 11.5h12M4 15h8.5" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>',
  center: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M6.2 8h7.6M4 11.5h12M6.2 15h7.6" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>',
  right: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M7.5 8H16M4 11.5h12M7.5 15H16" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>',
  coverSet: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 5.2h11a1.3 1.3 0 0 1 1.3 1.3v8a1.3 1.3 0 0 1-1.3 1.3h-11a1.3 1.3 0 0 1-1.3-1.3v-8a1.3 1.3 0 0 1 1.3-1.3Z" fill="none" stroke="currentColor" stroke-width="1.45"/><path d="M4.3 13.4 7 10.7l2.2 2 2.9-3.4 3.6 4.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.4 7.6h3.4M14.1 5.9v3.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
  coverRemove: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 5.2h11a1.3 1.3 0 0 1 1.3 1.3v8a1.3 1.3 0 0 1-1.3 1.3h-11a1.3 1.3 0 0 1-1.3-1.3v-8a1.3 1.3 0 0 1 1.3-1.3Z" fill="none" stroke="currentColor" stroke-width="1.45"/><path d="m7 9.3 6 6M13 9.3l-6 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
}, Ra = {
  small: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6.2" y="6.2" width="7.6" height="7.6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.55"/><path d="M8 11.8 9.5 10l1.1 1.2 1.2-1.5 1.5 2.1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  medium: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4.8" y="4.8" width="10.4" height="10.4" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.55"/><path d="M6.8 12.8 9 10.5l1.4 1.5 1.7-2 2 2.8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  large: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="3.5" width="13" height="13" rx="1.7" fill="none" stroke="currentColor" stroke-width="1.55"/><path d="M5.8 13.7 8.7 11l1.8 1.8 2.2-2.6 2.5 3.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
}, lk = /(?:^|\s)nutbook-align=(left|center|right)(?=\s|$)/i, ak = /(?:^|\s)nutbook-size=(small|medium|large)(?=\s|$)/i, ot = "portable_image", GI = Object.freeze({ small: 160, medium: 480 }), kr = "<!-- nutbook-cover -->", mt = "markdown_cover_image", Wr = "aligned_text_block", Lr = Object.freeze(["center", "right"]);
function Wh(t, e) {
  const n = e.nodes.heading;
  if (!n)
    return null;
  let r = null;
  return t.descendants((i, o, s) => r ? !1 : s === t ? i.type === n && i.attrs.level === 1 && i.textContent.trim() ? (r = { pos: o, node: i }, !1) : i.type.name === Wr : (s.type.name === Wr && i.type === n && i.attrs.level === 1 && i.textContent.trim() && (r = { pos: o, node: i }), !1)), r;
}
function li(t) {
  return Array.from((t == null ? void 0 : t.childNodes) || []).filter((e) => e.nodeType !== Node.TEXT_NODE || String(e.textContent || "").trim() !== "");
}
function La(t, e) {
  const n = new Set(e);
  return t.getAttributeNames().every((r) => n.has(r.toLowerCase()));
}
function qh(t, e = "src") {
  var i, o;
  const n = String(t || "").trim();
  if (!n || /[\u0000-\u001f\u007f]/.test(n) || n.startsWith("//")) return !1;
  const r = ((o = (i = n.match(/^([a-z][a-z0-9+.-]*):/i)) == null ? void 0 : i[1]) == null ? void 0 : o.toLowerCase()) || "";
  return !r || r === "http" || r === "https" ? !0 : e === "href" && r === "mailto";
}
function Fi(t) {
  if (t == null || t === "" || !/^\d+$/.test(String(t))) return null;
  const e = Number(t);
  return Number.isInteger(e) && e >= 1 && e <= 8192 ? e : null;
}
function YI(t = "") {
  const e = String(t || "");
  if (!e.trim() || typeof DOMParser != "function") return null;
  const n = new DOMParser().parseFromString(`<!doctype html><body>${e}</body>`, "text/html"), r = li(n.body);
  if (r.length !== 1 || r[0].nodeType !== Node.ELEMENT_NODE) return null;
  let i = r[0], o = "";
  if (i.tagName === "P") {
    if (!La(i, ["align"]) || (o = String(i.getAttribute("align") || "").toLowerCase(), !["left", "center", "right"].includes(o))) return null;
    const f = li(i);
    if (f.length !== 1 || f[0].nodeType !== Node.ELEMENT_NODE) return null;
    i = f[0];
  }
  let s = "", l = "";
  if (i.tagName === "A") {
    if (!La(i, ["href", "title"]) || (s = String(i.getAttribute("href") || "").trim(), l = String(i.getAttribute("title") || ""), !qh(s, "href"))) return null;
    const f = li(i);
    if (f.length !== 1 || f[0].nodeType !== Node.ELEMENT_NODE) return null;
    i = f[0];
  }
  if (i.tagName !== "IMG" || !La(i, ["src", "alt", "title", "width"]) || li(i).length > 0) return null;
  const a = String(i.getAttribute("src") || "").trim();
  if (!qh(a, "src")) return null;
  const u = i.getAttribute("width"), c = Fi(u);
  return u != null && c == null ? null : {
    src: a,
    alt: String(i.getAttribute("alt") || ""),
    title: String(i.getAttribute("title") || ""),
    alignment: o,
    displayWidthPx: c,
    linkHref: s,
    linkTitle: l,
    sourceSyntax: "github-html",
    rawSource: e,
    presentationDirty: !1
  };
}
function hr(t) {
  return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function uk(t = {}) {
  const e = [
    `src="${hr(t.src)}"`,
    `alt="${hr(t.alt)}"`
  ];
  t.title && e.push(`title="${hr(t.title)}"`);
  const n = Fi(t.displayWidthPx);
  n != null && e.push(`width="${n}"`);
  const r = `<img ${e.join(" ")}>`, i = t.linkHref ? `<a href="${hr(t.linkHref)}"${t.linkTitle ? ` title="${hr(t.linkTitle)}"` : ""}>
    ${r}
  </a>` : r, o = ["left", "center", "right"].includes(t.alignment) ? t.alignment : "";
  return o ? `<p align="${o}">
  ${i}
</p>` : t.linkHref ? `<a href="${hr(t.linkHref)}"${t.linkTitle ? ` title="${hr(t.linkTitle)}"` : ""}>
  ${r}
</a>` : r;
}
function yf(t) {
  if (!t || typeof t != "object" || (Array.isArray(t.children) && t.children.forEach(yf), t.type !== "html" || typeof t.value != "string")) return;
  const e = YI(t.value);
  e && (Object.keys(t).forEach((n) => {
    n !== "position" && delete t[n];
  }), Object.assign(t, { type: "portableImage", ...e }));
}
const QI = ln("portableImageRemark", () => () => (t) => {
  yf(t);
});
function XI(t = "") {
  const e = String(t || "").trim();
  if (!e || typeof DOMParser != "function" || !/^<div(?:\s|>)/i.test(e)) return null;
  const n = new DOMParser().parseFromString(`<!doctype html><body>${e}</div></body>`, "text/html"), r = li(n.body);
  if (r.length !== 1 || r[0].nodeType !== Node.ELEMENT_NODE) return null;
  const i = r[0];
  if (i.tagName !== "DIV" || li(i).length > 0) return null;
  const o = i.getAttributeNames();
  if (o.length !== 1 || o[0].toLowerCase() !== "align") return null;
  const s = String(i.getAttribute("align") || "").toLowerCase();
  return Lr.includes(s) ? s : null;
}
function ZI(t = "") {
  return /^<\/div\s*>$/i.test(String(t || "").trim());
}
function ck(t) {
  return !t || typeof t != "object" ? !1 : ["html", "image", "portableImage", "alignedTextBlock"].includes(t.type) ? !0 : Array.isArray(t.children) && t.children.some(ck);
}
function eA(t) {
  if (!Array.isArray(t == null ? void 0 : t.children)) return;
  const e = t.children;
  for (let n = 0; n <= e.length - 3; n += 1) {
    const r = e[n], i = e[n + 1], o = e[n + 2];
    if ((r == null ? void 0 : r.type) !== "html" || (o == null ? void 0 : o.type) !== "html" || !i || !["paragraph", "heading"].includes(i.type)) continue;
    const s = XI(r.value);
    !s || !ZI(o.value) || ck(i) || e.splice(n, 3, {
      type: "alignedTextBlock",
      alignment: s,
      sourceSyntax: "github-div-align",
      children: [i]
    });
  }
}
const tA = ln("alignedTextRemark", () => () => (t) => {
  eA(t);
}), nA = Ie(Wr, () => ({
  group: "block",
  content: "paragraph | heading",
  defining: !0,
  attrs: {
    alignment: { default: "center", validate: "string" },
    sourceSyntax: { default: "github-div-align", validate: "string" }
  },
  parseDOM: [{
    tag: 'div[data-type="aligned-text-block"]',
    getAttrs: (t) => {
      const e = String(t.dataset.nutbookTextAlignment || "").toLowerCase();
      return Lr.includes(e) ? { alignment: e, sourceSyntax: "github-div-align" } : !1;
    }
  }],
  toDOM: (t) => {
    const e = Lr.includes(t.attrs.alignment) ? t.attrs.alignment : "center";
    return ["div", {
      class: `nutbook-aligned-text-block nutbook-text-align-${e}`,
      "data-type": "aligned-text-block",
      "data-nutbook-text-alignment": e
    }, 0];
  },
  parseMarkdown: {
    match: (t) => t.type === "alignedTextBlock",
    runner: (t, e, n) => {
      t.openNode(n, {
        alignment: e.alignment,
        sourceSyntax: "github-div-align"
      }).next(e.children).closeNode();
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === Wr,
    runner: (t, e) => {
      const n = String(e.attrs.alignment || "").toLowerCase();
      if (!Lr.includes(n) || e.childCount !== 1)
        throw new Error("Invalid aligned text block");
      t.addNode("html", void 0, `<div align="${n}">`).next(e.content).addNode("html", void 0, "</div>");
    }
  }
})), rA = Ie(ot, () => ({
  group: "block",
  atom: !0,
  selectable: !0,
  draggable: !0,
  defining: !0,
  isolating: !0,
  attrs: {
    src: { default: "", validate: "string" },
    alt: { default: "", validate: "string" },
    title: { default: "", validate: "string" },
    alignment: { default: "", validate: "string" },
    displayWidthPx: { default: null, validate: "number|null" },
    linkHref: { default: "", validate: "string" },
    linkTitle: { default: "", validate: "string" },
    sourceSyntax: { default: "github-html", validate: "string" },
    rawSource: { default: "", validate: "string" },
    presentationDirty: { default: !1, validate: "boolean" }
  },
  parseDOM: [{
    tag: 'div[data-type="portable-image"]',
    getAttrs: (t) => {
      const e = t.querySelector("img[src]"), n = e == null ? void 0 : e.closest("a[href]");
      return {
        src: (e == null ? void 0 : e.dataset.nutbookOriginalSrc) || (e == null ? void 0 : e.getAttribute("src")) || "",
        alt: (e == null ? void 0 : e.getAttribute("alt")) || "",
        title: (e == null ? void 0 : e.getAttribute("title")) || "",
        alignment: t.dataset.nutbookImageAlign || "",
        displayWidthPx: Fi(t.dataset.nutbookDisplayWidth),
        linkHref: (n == null ? void 0 : n.getAttribute("href")) || "",
        linkTitle: (n == null ? void 0 : n.getAttribute("title")) || "",
        sourceSyntax: "github-html",
        rawSource: t.dataset.nutbookRawSource || "",
        presentationDirty: t.dataset.nutbookPresentationDirty === "true"
      };
    }
  }],
  toDOM: (t) => {
    const e = ["left", "center", "right"].includes(t.attrs.alignment) ? t.attrs.alignment : "", n = Fi(t.attrs.displayWidthPx), r = {
      src: t.attrs.src,
      alt: t.attrs.alt,
      title: t.attrs.title || null,
      class: "nutbook-portable-image",
      "data-nutbook-portable-image": "true",
      "data-nutbook-image-align": e,
      "data-nutbook-display-width": n == null ? "" : String(n)
    };
    n != null && (r.style = `width:auto;height:auto;max-width:min(${n}px, 100%)`);
    const i = ["img", r], o = t.attrs.linkHref ? ["a", { href: t.attrs.linkHref, title: t.attrs.linkTitle || null }, i] : i;
    return ["div", {
      class: `portable-image-block${e ? ` nutbook-image-align-${e}` : ""}`,
      "data-type": "portable-image",
      "data-nutbook-image-align": e,
      "data-nutbook-display-width": n == null ? "" : String(n),
      "data-nutbook-presentation-dirty": t.attrs.presentationDirty ? "true" : "false"
    }, o];
  },
  parseMarkdown: {
    match: (t) => t.type === "portableImage",
    runner: (t, e, n) => {
      t.addNode(n, {
        src: e.src || "",
        alt: e.alt || "",
        title: e.title || "",
        alignment: e.alignment || "",
        displayWidthPx: e.displayWidthPx ?? null,
        linkHref: e.linkHref || "",
        linkTitle: e.linkTitle || "",
        sourceSyntax: "github-html",
        rawSource: e.rawSource || "",
        presentationDirty: !1
      });
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === ot,
    runner: (t, e) => {
      const n = !e.attrs.presentationDirty && e.attrs.rawSource ? e.attrs.rawSource : uk(e.attrs);
      t.addNode("html", void 0, n);
    }
  }
}));
function iA(t) {
  return (t == null ? void 0 : t.type) === "html" && String((t == null ? void 0 : t.value) || "").trim() === kr;
}
function Pa(t, e) {
  var i, o, s, l;
  const n = (o = (i = e == null ? void 0 : e.position) == null ? void 0 : i.start) == null ? void 0 : o.offset, r = (l = (s = e == null ? void 0 : e.position) == null ? void 0 : s.end) == null ? void 0 : l.offset;
  return t && Number.isInteger(n) && Number.isInteger(r) && r > n && r <= t.length ? t.slice(n, r) : null;
}
function oA(t, e) {
  var r;
  if (!t || typeof t != "object") return null;
  if (t.type === "portableImage")
    return {
      nodeKind: "portable-image",
      src: t.src || "",
      alt: t.alt || "",
      title: t.title || "",
      alignment: t.alignment || "",
      displayWidthPx: t.displayWidthPx ?? null,
      linkHref: t.linkHref || "",
      linkTitle: t.linkTitle || "",
      rawSource: Pa(e, t) || t.rawSource || ""
    };
  if (t.type !== "paragraph" || !Array.isArray(t.children) || t.children.length !== 1) return null;
  const n = t.children[0];
  if ((n == null ? void 0 : n.type) === "image")
    return {
      nodeKind: "image",
      src: n.url || "",
      alt: n.alt || "",
      title: n.title || "",
      alignment: qr(n.title || ""),
      displayWidthPx: null,
      linkHref: "",
      linkTitle: "",
      rawSource: Pa(e, t) || ""
    };
  if ((n == null ? void 0 : n.type) === "link" && Array.isArray(n.children) && n.children.length === 1 && ((r = n.children[0]) == null ? void 0 : r.type) === "image") {
    const i = n.children[0];
    return {
      nodeKind: "linked-image",
      src: i.url || "",
      alt: i.alt || "",
      title: i.title || "",
      alignment: qr(i.title || ""),
      displayWidthPx: null,
      linkHref: n.url || "",
      linkTitle: n.title || "",
      rawSource: Pa(e, t) || ""
    };
  }
  return null;
}
function fk(t, e) {
  const n = t == null ? void 0 : t.children;
  if (!Array.isArray(n)) return [];
  const r = [];
  for (let i = 0; i < n.length; i += 1) {
    const o = n[i];
    if (!iA(o)) continue;
    const s = oA(n[i + 1], e);
    s && r.push({ markerIndex: i, blockIndex: i + 1, block: s });
  }
  return r;
}
function sA(t, e) {
  const n = [];
  if (!Array.isArray(t == null ? void 0 : t.children)) return n;
  const r = fk(t, e);
  if (r.length > 1)
    return n.push({ kind: "duplicate", count: r.length }), n;
  if (r.length !== 1) return n;
  const { markerIndex: i, blockIndex: o, block: s } = r[0];
  return t.children.splice(i, 2, {
    type: "markdownCoverImage",
    ...s,
    markerRaw: kr,
    presentationDirty: !1
  }), n;
}
function lA(t) {
  const e = Du(String(t || ""));
  yf(e);
  const n = fk(e, null).length;
  return { count: n, duplicate: n > 1 };
}
function aA(t) {
  return String(t || "").replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\n/g, " ");
}
function Kh(t) {
  return `"${String(t || "").replace(/"/g, '\\"')}"`;
}
function Uh(t) {
  const e = String(t || "");
  return e && (/[\s<>]/.test(e) ? `<${e.replace(/</g, "\\<").replace(/>/g, "\\>").replace(/\n/g, " ")}>` : e.replace(/[()]/g, (n) => `\\${n}`));
}
function uA(t = {}) {
  if (t.nodeKind === "portable-image") return uk(t);
  const e = ["left", "center", "right"].includes(t.alignment) ? `nutbook-align=${t.alignment}` : "", n = [t.title, e].filter(Boolean), r = n.length ? ` ${Kh(n.join(" "))}` : "", i = `![${aA(t.alt)}](${Uh(t.src)}${r})`;
  if (t.nodeKind === "linked-image") {
    const o = t.linkTitle ? ` ${Kh(t.linkTitle)}` : "";
    return `[${i}](${Uh(t.linkHref)}${o})`;
  }
  return i;
}
const cA = Ie(mt, () => ({
  group: "block",
  atom: !0,
  selectable: !0,
  draggable: !0,
  defining: !0,
  isolating: !0,
  attrs: {
    nodeKind: { default: "image", validate: "string" },
    src: { default: "", validate: "string" },
    alt: { default: "", validate: "string" },
    title: { default: "", validate: "string" },
    alignment: { default: "", validate: "string" },
    displayWidthPx: { default: null, validate: "number|null" },
    linkHref: { default: "", validate: "string" },
    linkTitle: { default: "", validate: "string" },
    rawSource: { default: "", validate: "string" },
    markerRaw: { default: kr, validate: "string" },
    presentationDirty: { default: !1, validate: "boolean" }
  },
  parseDOM: [{
    tag: 'div[data-type="markdown-cover-image"]',
    getAttrs: (t) => {
      const e = t.querySelector("img[src]"), n = e == null ? void 0 : e.closest("a[href]");
      return {
        nodeKind: t.dataset.nutbookNodeKind || "image",
        src: (e == null ? void 0 : e.dataset.nutbookOriginalSrc) || (e == null ? void 0 : e.getAttribute("src")) || "",
        alt: (e == null ? void 0 : e.getAttribute("alt")) || "",
        title: (e == null ? void 0 : e.getAttribute("title")) || "",
        alignment: t.dataset.nutbookImageAlign || "",
        displayWidthPx: Fi(t.dataset.nutbookDisplayWidth),
        linkHref: (n == null ? void 0 : n.getAttribute("href")) || "",
        linkTitle: (n == null ? void 0 : n.getAttribute("title")) || "",
        rawSource: t.dataset.nutbookRawSource || "",
        markerRaw: kr,
        presentationDirty: t.dataset.nutbookPresentationDirty === "true"
      };
    }
  }],
  toDOM: (t) => {
    const e = t.attrs, n = ["left", "center", "right"].includes(e.alignment) ? e.alignment : "", r = Fi(e.displayWidthPx), i = {
      src: e.src,
      alt: e.alt,
      title: e.title || null,
      class: "nutbook-cover-image",
      "data-nutbook-cover-image": "true",
      "data-nutbook-node-kind": e.nodeKind,
      "data-nutbook-image-align": n,
      "data-nutbook-display-width": r == null ? "" : String(r)
    };
    r != null && (i.style = `width:auto;height:auto;max-width:min(${r}px, 100%)`);
    const o = ["img", i], s = e.linkHref ? ["a", { href: e.linkHref, title: e.linkTitle || null }, o] : o, l = { class: "markdown-cover-media", "data-cover-badge": fA() };
    return r != null && (l.style = `max-width:min(${r}px, 100%)`), ["div", {
      class: `markdown-cover-image-block${n ? ` nutbook-image-align-${n}` : ""}`,
      "data-type": "markdown-cover-image",
      "data-nutbook-cover": "true",
      "data-nutbook-node-kind": e.nodeKind,
      "data-nutbook-image-align": n,
      "data-nutbook-display-width": r == null ? "" : String(r)
    }, ["div", l, s]];
  },
  parseMarkdown: {
    match: (t) => t.type === "markdownCoverImage",
    runner: (t, e, n) => {
      t.addNode(n, {
        nodeKind: e.nodeKind || "image",
        src: e.src || "",
        alt: e.alt || "",
        title: e.title || "",
        alignment: e.alignment || "",
        displayWidthPx: e.displayWidthPx ?? null,
        linkHref: e.linkHref || "",
        linkTitle: e.linkTitle || "",
        rawSource: e.rawSource || "",
        markerRaw: kr,
        presentationDirty: !1
      });
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === mt,
    runner: (t, e) => {
      const n = e.attrs, r = !n.presentationDirty && n.rawSource ? n.rawSource : uA(n);
      t.addNode("html", void 0, `${kr}
${r}`);
    }
  }
}));
function fA() {
  var e, n;
  const t = typeof window < "u" ? window.NutbookI18n : null;
  return ((n = t == null ? void 0 : t.lookup) == null ? void 0 : n.call(t, "markdown.coverBadge", (e = t.currentLanguage) == null ? void 0 : e.call(t))) || "封面";
}
function io(t) {
  var n, r;
  let e = null;
  return (r = (n = t == null ? void 0 : t.doc) == null ? void 0 : n.descendants) == null || r.call(n, (i, o) => i.type.name === mt ? (e = { node: i, pos: o }, !1) : !0), e;
}
function Jh(t, e) {
  var s;
  const n = (s = t == null ? void 0 : t.nodeDOM) == null ? void 0 : s.call(t, e), r = n instanceof Element ? n.matches("img") ? n : n.querySelector("img") : null;
  if (!r) return null;
  let i = r.parentElement;
  for (; i; ) {
    const a = getComputedStyle(i).overflowY;
    if ((a === "auto" || a === "scroll" || a === "overlay") && i.scrollHeight > i.clientHeight)
      break;
    i = i.parentElement;
  }
  const o = r.getBoundingClientRect();
  return {
    top: o.top,
    left: o.left,
    scrollParent: i,
    windowX: window.scrollX,
    windowY: window.scrollY
  };
}
function Gh(t, e, n) {
  var a, u;
  if (!e) return;
  const r = (a = t == null ? void 0 : t.nodeDOM) == null ? void 0 : a.call(t, n), i = r instanceof Element ? r.matches("img") ? r : r.querySelector("img") : null;
  if (!i) return;
  const o = i.getBoundingClientRect(), s = o.left - e.left, l = o.top - e.top;
  if ((u = e.scrollParent) != null && u.isConnected) {
    Math.abs(s) > 0.5 && (e.scrollParent.scrollLeft += s), Math.abs(l) > 0.5 && (e.scrollParent.scrollTop += l);
    return;
  }
  (Math.abs(s) > 0.5 || Math.abs(l) > 0.5) && window.scrollTo(e.windowX + s, e.windowY + l);
}
function Yh(t) {
  return {
    nodeKind: "portable-image",
    src: t.attrs.src || "",
    alt: t.attrs.alt || "",
    title: t.attrs.title || "",
    alignment: t.attrs.alignment || "",
    displayWidthPx: t.attrs.displayWidthPx ?? null,
    linkHref: t.attrs.linkHref || "",
    linkTitle: t.attrs.linkTitle || "",
    rawSource: t.attrs.rawSource || "",
    presentationDirty: t.attrs.presentationDirty || !1
  };
}
function Qh(t) {
  const e = t.attrs.title || "";
  return {
    nodeKind: "image",
    src: t.attrs.src || "",
    alt: t.attrs.alt || "",
    title: e,
    alignment: qr(e),
    displayWidthPx: null,
    linkHref: "",
    linkTitle: "",
    rawSource: ""
  };
}
function Nu(t) {
  if (!(t != null && t.marks)) return null;
  for (let e = 0; e < t.marks.length; e += 1)
    if (t.marks[e].type.name === "link") return t.marks[e];
  return null;
}
function Xh(t, e) {
  const n = t.attrs.title || "";
  return {
    nodeKind: "linked-image",
    src: t.attrs.src || "",
    alt: t.attrs.alt || "",
    title: n,
    alignment: qr(n),
    displayWidthPx: null,
    linkHref: (e == null ? void 0 : e.attrs.href) || "",
    linkTitle: (e == null ? void 0 : e.attrs.title) || "",
    rawSource: ""
  };
}
function Ps(t, e) {
  return t.nodes[mt].create({
    ...e,
    markerRaw: kr,
    presentationDirty: e.presentationDirty ?? !1
  });
}
function oo(t, e) {
  const n = t.nodes.image, r = t.nodes.paragraph;
  if (e.nodeKind === "portable-image")
    return t.nodes[ot].create({ ...e, presentationDirty: !1 });
  const i = n.create({ src: e.src, alt: e.alt, title: e.title || null });
  if (e.nodeKind === "linked-image") {
    const o = t.marks.link;
    if (o)
      return r.create(null, i.mark([o.create({ href: e.linkHref, title: e.linkTitle || null })]));
  }
  return r.create(null, i);
}
function dA(t, e) {
  const n = t.schema, r = n.nodes.image, i = n.nodes[ot], o = n.nodes.paragraph;
  if (!r || !o || !i) return null;
  const s = Math.max(0, Math.min(Number(e) || 0, t.doc.content.size)), l = t.doc.nodeAt(s);
  if (l) {
    if (l.type === i)
      return { blockStart: s, blockEnd: s + l.nodeSize, attrs: Yh(l) };
    if (l.type === o && l.childCount === 1) {
      const u = l.firstChild;
      if (u.type === r) {
        const c = Nu(u);
        return {
          blockStart: s,
          blockEnd: s + l.nodeSize,
          attrs: c ? Xh(u, c) : Qh(u)
        };
      }
    }
  }
  let a = t.doc.resolve(s);
  for (let u = a.depth; u >= 1; u -= 1) {
    const c = a.node(u);
    if (c.type === i)
      return {
        blockStart: a.before(u),
        blockEnd: a.after(u),
        attrs: Yh(c)
      };
    if (c.type === o && c.childCount === 1) {
      const f = c.firstChild;
      if (f.type === r) {
        const d = Nu(f);
        return {
          blockStart: a.before(u),
          blockEnd: a.after(u),
          attrs: d ? Xh(f, d) : Qh(f)
        };
      }
      return null;
    }
  }
  return null;
}
function qr(t = "") {
  var n;
  const e = String(t || "").match(lk);
  return ((n = e == null ? void 0 : e[1]) == null ? void 0 : n.toLowerCase()) || "";
}
function Iu(t = "") {
  var n;
  const e = String(t || "").match(ak);
  return ((n = e == null ? void 0 : e[1]) == null ? void 0 : n.toLowerCase()) || "large";
}
function hA(t = "") {
  return String(t || "").replace(lk, " ").replace(ak, " ").replace(/\s+/g, " ").trim();
}
function pA(t) {
  if (!t) return "";
  if (t.dataset.nutbookPortableImage === "true")
    return t.dataset.nutbookImageAlign || "";
  const e = qr(t.getAttribute("title") || ""), n = Iu(t.getAttribute("title") || "");
  return ["left", "center", "right"].forEach((r) => {
    t.classList.toggle(`nutbook-image-align-${r}`, e === r);
  }), ["small", "medium", "large"].forEach((r) => {
    t.classList.toggle(`nutbook-image-size-${r}`, n === r);
  }), t.dataset.nutbookImageAlign = e, t.dataset.nutbookImageSize = n, e;
}
function dk(t) {
  const e = ml.get(t);
  e && (e.destroy(), ml.delete(t));
}
function Zh(t) {
  return String(t || "").replace(/\s+/g, " ").trim();
}
function kf(t) {
  var n, r;
  const e = t == null ? void 0 : t.$from;
  if (!e) return !1;
  for (let i = e.depth; i > 0; i -= 1) {
    const o = (r = (n = e.node(i)) == null ? void 0 : n.type) == null ? void 0 : r.name;
    if (o === "list_item" || o === "listItem") return !0;
  }
  return !1;
}
function mA(t) {
  var r;
  const { selection: e } = t;
  if (!(e != null && e.empty)) return !1;
  const { $from: n } = e;
  return !((r = n.parent) != null && r.isTextblock) || n.parentOffset !== 0 ? !1 : kf(e);
}
function gA(t, e, n) {
  if (!mA(t)) return !1;
  const r = t.schema.nodes.list_item || t.schema.nodes.listItem;
  return r ? Eg(r)(t, e, n) : !1;
}
function yA() {
  return new Be({
    props: {
      handlePaste(t, e) {
        var o, s;
        const n = (o = e.clipboardData) == null ? void 0 : o.getData("text/plain"), r = ((s = e.clipboardData) == null ? void 0 : s.getData("text/html")) || "";
        return !n || !r || kf(t.state.selection) || !(/<(ol|ul|li)\b/i.test(r) || /data-list-type=/i.test(r)) ? !1 : (e.preventDefault(), t.dispatch(t.state.tr.insertText(n).scrollIntoView()), !0);
      }
    }
  });
}
function ep(t) {
  var n;
  const e = /* @__PURE__ */ new Set();
  return (n = t == null ? void 0 : t.descendants) == null || n.call(t, (r) => {
    var i, o, s, l;
    return ["image", ot].includes((i = r.type) == null ? void 0 : i.name) && ((o = r.attrs) != null && o.src) && e.add(String(r.attrs.src)), ((s = r.type) == null ? void 0 : s.name) === mt && ((l = r.attrs) != null && l.src) && e.add(String(r.attrs.src)), !0;
  }), e;
}
function kA(t) {
  return typeof t != "function" ? null : new Be({
    view(e) {
      let n = ep(e.state.doc), r = null;
      const i = () => {
        r = null;
        const s = ep(e.state.doc);
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
function tp(t) {
  const e = (r) => {
    const i = r.dataset.nutbookOriginalSrc || r.getAttribute("src") || "";
    if (typeof t == "function") {
      const o = t(i);
      o && o !== r.getAttribute("src") && (r.dataset.nutbookOriginalSrc = i, r.setAttribute("src", o));
    }
    pA(r);
  }, n = (r) => {
    r.querySelectorAll("img[src]").forEach(e);
  };
  return new Be({
    view(r) {
      const i = new MutationObserver((l) => {
        l.forEach((a) => {
          a.addedNodes.forEach((u) => {
            var c, f;
            u.nodeType === Node.ELEMENT_NODE && ((c = u.matches) != null && c.call(u, "img[src]") && e(u), (f = u.querySelectorAll) == null || f.call(u, "img[src]").forEach(e));
          });
        });
      });
      i.observe(r.dom, { childList: !0, subtree: !0 });
      const o = requestAnimationFrame(() => n(r.dom)), s = () => n(r.dom);
      return r.dom.addEventListener("nutbook:normalize-local-images", s), {
        destroy() {
          i.disconnect(), cancelAnimationFrame(o), r.dom.removeEventListener("nutbook:normalize-local-images", s);
        }
      };
    }
  });
}
function np(t) {
  const e = [];
  let n = !1, r = 0;
  const i = (o, s, l) => {
    o.forEach((a, u) => {
      const c = s + u + 1, f = l || a.type.name === Wr;
      if (a.type.name === "heading") {
        const d = c + a.nodeSize;
        Number(a.attrs.level) === 1 && !n ? (n = !0, f || e.push(ze.node(c, d, { class: "markdown-document-title-source" }))) : (e.push(ze.node(c, d, { "data-markdown-outline-index": String(r) })), r += 1);
        return;
      }
      a.childCount && i(a, c, f);
    });
  };
  return i(t, -1, !1), e;
}
function rp() {
  return new Be({
    state: {
      init: (t, e) => Me.create(e.doc, np(e.doc)),
      apply: (t, e) => t.docChanged ? Me.create(t.doc, np(t.doc)) : e
    },
    props: {
      decorations(t) {
        return this.getState(t);
      }
    }
  });
}
function ip(t) {
  var n, r;
  if (!t) return !1;
  if (["image", ot].includes((n = t.type) == null ? void 0 : n.name)) return !0;
  let e = !1;
  return (r = t.descendants) == null || r.call(t, (i) => {
    var o;
    return ["image", ot].includes((o = i.type) == null ? void 0 : o.name) ? (e = !0, !1) : !e;
  }), e;
}
function op(t, e = t == null ? void 0 : t.selection) {
  if (!t || !e || e.empty || e.from >= e.to)
    return { supported: !1, targets: [], alignment: "" };
  const n = t.schema.nodes.paragraph, r = t.schema.nodes.heading, i = t.schema.nodes[Wr];
  if (!n || !r || !i)
    return { supported: !1, targets: [], alignment: "" };
  const o = [];
  let s = !1;
  if (t.doc.forEach((u, c) => {
    const f = c + (u.type === i ? 2 : 1);
    if (!(e.from >= c + u.nodeSize || e.to <= f)) {
      if (u.type === n || u.type === r) {
        if (ip(u)) {
          s = !0;
          return;
        }
        o.push({ pos: c, node: u, alignment: "left" });
        return;
      }
      if (u.type === i) {
        const d = u.childCount === 1 ? u.child(0) : null;
        if (!d || ![n, r].includes(d.type) || ip(d)) {
          s = !0;
          return;
        }
        const h = Lr.includes(u.attrs.alignment) ? u.attrs.alignment : "";
        if (!h) {
          s = !0;
          return;
        }
        o.push({ pos: c, node: u, alignment: h });
        return;
      }
      s = !0;
    }
  }), s || !o.length)
    return { supported: !1, targets: [], alignment: "" };
  const l = o[0].alignment, a = o.every((u) => u.alignment === l) ? l : "";
  return { supported: !0, targets: o, alignment: a };
}
async function bA({ root: t, markdown: e = "", fileName: n = "", language: r = null, onChange: i = null, onEdit: o = null, tableToolsEnabled: s = !0, resolveImageSrc: l = null, onInsertImageAsset: a = null, onInsertCoverAsset: u = null, onReleaseCoverAsset: c = null, onValidateCoverAsset: f = null, onRemoveImageAsset: d = null, onImageSizeError: h = null, onCoverChange: p = null, readOnly: k = !1 }) {
  if (!t)
    throw new Error("Milkdown root is required");
  const w = window.NutbookI18n, b = (m) => {
    var g, y;
    return ((y = w == null ? void 0 : w.lookup) == null ? void 0 : y.call(w, m, r || ((g = w.currentLanguage) == null ? void 0 : g.call(w)))) ?? m;
  };
  dk(t), t.innerHTML = "";
  const L = BI(e), E = FI(n) ? L : null, j = L ? L.body : e, H = lA(j);
  if (H.duplicate)
    throw new Error(
      `document declares ${H.count} valid \`<!-- nutbook-cover -->\` markers; only one cover identity is allowed — repair the source before editing`
    );
  const T = document.createElement("div");
  T.className = "milkdown-editor-body";
  const z = UI(E);
  z && (t.appendChild(z), k && z.querySelectorAll("input,textarea").forEach((m) => {
    m.disabled = !0, m.tabIndex = -1;
  })), t.appendChild(T), k && (T.setAttribute("contenteditable", "false"), T.setAttribute("spellcheck", "false"));
  let U = e, G = !1, A = !1, V = !1, q = !1, J = null, me = null, le = !1, Ae = null, Ne = null, xe = null, je = null, C = !1, ae = null, We = null, S = !1, Fe = !1, Xe = null, te = null, Ct = null, se = null, qe = null, ct = null, $e = null, Ur = e, Dn = [];
  const Ll = ln("coverImageRemark", () => () => (m) => {
    Dn = sA(m, j);
  }), cn = /* @__PURE__ */ new Map(), Re = () => {
    G || o == null || o(), G = !0, S && fn();
  };
  k || JI(z, E, () => {
    Re(), A = !0, O(80);
  });
  const bs = [], ws = (m) => {
    m.isComposing || m.key === "Process" || !(m.metaKey || m.ctrlKey) || m.altKey || m.key.toLowerCase() !== "z" || !ue() || !Bl(m.shiftKey ? si : vo) || (m.preventDefault(), m.stopPropagation());
  };
  k || t.addEventListener("keydown", ws, !0);
  const Gi = gM.make().config((m) => {
    m.set(Js, T), m.set(js, j), k ? (m.update(Us, (g) => ({
      ...g,
      editable: () => !1
    })), m.update(tn, () => [
      tp(l),
      rp()
    ].filter(Boolean))) : (m.update(tn, (g) => [
      Dm({
        "Mod-z": vo,
        "Shift-Mod-z": si,
        "Mod-y": si,
        Backspace: gA
      }),
      yA(),
      kA(d),
      tp(l),
      rp(),
      ...g
    ].filter(Boolean)), m.update(Mu, (g) => g.updated(() => {
      q && (A = !0, O());
    })));
  }).use(tA).use(QI).use(Ll).use(YM).use(GN).use(nA).use(rA).use(cA), Ke = await (k ? Gi.use(vu) : Gi.use(iI).use(vu)).create(), Yi = () => V ? U : Ke.action((m) => {
    const g = m.get(Ee), x = m.get(Mo)(g.state.doc), M = E ? KI(E) : (L == null ? void 0 : L.raw) || "";
    return U = L ? `${M}${x}` : x, U;
  }), xs = Yi();
  Ur = xs, queueMicrotask(() => {
    V || (q = !0, !k && (Hk(), Of(), Mk(), Rk(), xk(), Le(), Pe(), _e(), Ot()));
  });
  function ue() {
    return V ? null : Ke.action((m) => m.get(Ee));
  }
  function lr() {
    var m;
    return !!((m = ue()) != null && m.composing);
  }
  function Cs() {
    if ($e = null, V || !q) return;
    const m = ue();
    if (m != null && m.composing) {
      O(180);
      return;
    }
    const g = Yi();
    G || (o == null || o(), G = !0), g !== Ur && (Ur = g, i == null || i(g));
  }
  function O(m = 260) {
    q && ($e && clearTimeout($e), $e = window.setTimeout(Cs, m));
  }
  function $(m) {
    var M, I, N;
    if (!m || !Ve(m.state)) return null;
    const { from: g } = m.state.selection, y = m.domAtPos(g), x = ((M = y.node) == null ? void 0 : M.nodeType) === Node.ELEMENT_NODE ? y.node : (I = y.node) == null ? void 0 : I.parentElement;
    return ((N = x == null ? void 0 : x.closest) == null ? void 0 : N.call(x, "table")) || null;
  }
  function Q(m) {
    const g = ue();
    if (!g) return !1;
    const y = m(g.state, g.dispatch, g);
    return y && (Re(), g.focus(), Le(), Pe(), _e()), y;
  }
  function ne(m) {
    var x, M, I;
    const g = m == null ? void 0 : m.state.selection;
    if (!m || !(g != null && g.empty) || Ve(m.state) || kf(g)) return null;
    const { $from: y } = g;
    return !((x = y.parent) != null && x.isTextblock) || ((M = y.parent.type) == null ? void 0 : M.name) !== "paragraph" || ((I = y.parent.content) == null ? void 0 : I.size) > 0 || y.parent.textContent.trim() ? null : {
      from: g.from,
      blockStart: y.before(y.depth),
      blockEnd: y.after(y.depth)
    };
  }
  function we(m) {
    var y, x, M, I;
    const g = ne(m);
    if (!m || !g) return null;
    try {
      const N = m.nodeDOM(g.blockStart);
      if ((N == null ? void 0 : N.nodeType) === Node.ELEMENT_NODE && ((y = N.matches) != null && y.call(N, "p")))
        return N;
      const P = m.domAtPos(g.from), F = ((x = P.node) == null ? void 0 : x.nodeType) === Node.ELEMENT_NODE ? P.node : (M = P.node) == null ? void 0 : M.parentElement;
      return ((I = F == null ? void 0 : F.closest) == null ? void 0 : I.call(F, "p")) || null;
    } catch {
      return null;
    }
  }
  function Ue(m) {
    if (!m || !Xe) return !1;
    const g = Math.max(1, Math.min(Xe.from, m.state.doc.content.size));
    try {
      return m.dispatch(m.state.tr.setSelection(Z.create(m.state.doc, g))), !0;
    } catch {
      return !1;
    }
  }
  function Ht(m, g = null) {
    const y = ue();
    if (!y) return !1;
    Ue(y);
    const x = ne(y);
    if (!x) return !1;
    const M = y.state.tr.replaceWith(x.blockStart, x.blockEnd, m), I = Number.isFinite(g) ? x.blockStart + g : x.blockStart + m.nodeSize, N = Math.max(1, Math.min(I, M.doc.content.size));
    return M.setSelection(Z.near(M.doc.resolve(N), Number.isFinite(g) ? 1 : -1)), y.dispatch(M.scrollIntoView()), Re(), y.focus(), fn(), Le(), Pe(), Ot(), !0;
  }
  function ft(m) {
    const g = ue();
    if (!g) return !1;
    Ue(g);
    const y = g.state.schema.nodes.heading;
    return !y || !ne(g) ? !1 : (fn(), Q(Sn(y, { level: m })));
  }
  function ar() {
    const m = ue();
    if (!m) return !1;
    Ue(m);
    const g = m.state.schema.nodes.code_block;
    return !g || !ne(m) ? !1 : (fn(), Q(Sn(g, { language: "" })));
  }
  function ur() {
    const m = ue(), g = m == null ? void 0 : m.state.schema.nodes, y = (g == null ? void 0 : g.bullet_list) || (g == null ? void 0 : g.bulletList), x = (g == null ? void 0 : g.list_item) || (g == null ? void 0 : g.listItem), M = g == null ? void 0 : g.paragraph;
    if (!m || !y || !x || !M) return !1;
    const I = y.create(null, [
      x.create(null, M.create())
    ]);
    return Ht(I, 3);
  }
  function it() {
    const m = ue(), g = m == null ? void 0 : m.state.schema.nodes, y = (g == null ? void 0 : g.ordered_list) || (g == null ? void 0 : g.orderedList), x = (g == null ? void 0 : g.list_item) || (g == null ? void 0 : g.listItem), M = g == null ? void 0 : g.paragraph;
    if (!m || !y || !x || !M) return !1;
    const I = y.create({ order: 1 }, [
      x.create(null, M.create())
    ]);
    return Ht(I, 3);
  }
  function Rn() {
    const m = ue(), g = m == null ? void 0 : m.state.schema.nodes, y = g == null ? void 0 : g.table, x = (g == null ? void 0 : g.table_row) || (g == null ? void 0 : g.tableRow), M = (g == null ? void 0 : g.table_cell) || (g == null ? void 0 : g.tableCell), I = (g == null ? void 0 : g.table_header_row) || (g == null ? void 0 : g.tableHeaderRow), N = (g == null ? void 0 : g.table_header) || (g == null ? void 0 : g.tableHeader);
    if (!m || !y || !x || !M || !I || !N) return !1;
    Ue(m);
    const P = ne(m);
    if (!P) return !1;
    const F = (Se) => {
      var ke;
      return ((ke = Se.createAndFill) == null ? void 0 : ke.call(Se)) || Se.create();
    }, W = (Se) => [0, 1, 2].map(() => F(Se)), ee = y.create(null, [
      I.create(null, W(N)),
      x.create(null, W(M)),
      x.create(null, W(M))
    ]), de = m.state.tr.replaceWith(P.blockStart, P.blockEnd, ee), ge = oe.findFrom(de.doc.resolve(P.blockStart), 1, !0);
    return ge && de.setSelection(ge), m.dispatch(de.scrollIntoView()), Re(), m.focus(), fn(), Le(), Pe(), Ot(), !0;
  }
  function Et(m = "") {
    return (String(m || "").split(/[\\/]/).pop() || "image").replace(/\.[^.]+$/, "") || "image";
  }
  function hk(m, g = "") {
    const y = ue(), x = y == null ? void 0 : y.state.schema.nodes.image, M = y == null ? void 0 : y.state.schema.nodes.paragraph;
    if (!y || !x || !M || !m) return !1;
    const I = x.create({
      src: m,
      alt: Et(g || m),
      title: ""
    });
    return Ht(M.create(null, [I]));
  }
  async function pk() {
    if (typeof a != "function") return !1;
    const m = ue();
    if (!m || !ne(m)) return !1;
    Xe = { from: m.state.selection.from }, Ss({ preserveSelection: !0 });
    let g = null;
    try {
      g = await a();
    } catch (y) {
      console.warn("Markdown image insert failed", y);
    }
    return g != null && g.relativePath ? hk(g.relativePath, g.fileName) : (Xe = null, _e(), !1);
  }
  async function mk() {
    if (typeof u != "function") return !1;
    const m = ue();
    if (!m || !ne(m)) return !1;
    Xe = { from: m.state.selection.from }, Ss({ preserveSelection: !0 });
    let g = null;
    try {
      g = await u();
    } catch (x) {
      console.warn("Markdown cover insert failed", x);
    }
    if (!(g != null && g.relativePath) || V || lr())
      return g != null && g.stagedAssetId && typeof c == "function" && await c(g), Xe = null, _e(), !1;
    const y = gk(g);
    return !y && g.stagedAssetId && typeof c == "function" && await c(g), y;
  }
  function gk(m) {
    const g = ue();
    if (!g || g.composing || Dn.some((ge) => ge.kind === "duplicate")) return !1;
    Ue(g);
    const y = ne(g);
    if (!y) return !1;
    const x = g.state.schema;
    if (!x.nodes[mt]) return !1;
    const I = Ps(x, {
      nodeKind: "image",
      src: m.relativePath,
      alt: Et(m.fileName || m.relativePath),
      title: "",
      alignment: "center",
      displayWidthPx: null,
      linkHref: "",
      linkTitle: "",
      rawSource: ""
    }), N = io(g.state), P = (N == null ? void 0 : N.pos) ?? null, F = N ? N.pos + N.node.nodeSize : null;
    let W = g.state.tr, ee;
    if (N && P < y.blockStart) {
      W = W.replaceWith(y.blockStart, y.blockEnd, I);
      const ge = y.blockStart + I.nodeSize;
      W = W.replaceWith(P, F, oo(x, N.node.attrs)), ee = W.mapping.map(ge);
    } else
      N && (W = W.replaceWith(P, F, oo(x, N.node.attrs))), W = W.replaceWith(y.blockStart, y.blockEnd, I), ee = W.mapping.map(y.blockStart + I.nodeSize);
    const de = Math.max(1, Math.min(ee, W.doc.content.size));
    return W.setSelection(Z.near(W.doc.resolve(de), -1)), g.dispatch(Zr(W.scrollIntoView())), Re(), g.focus(), fn(), Le(), Pe(), _e(), !0;
  }
  function yk(m) {
    return m === "image" ? (pk(), !0) : m === "cover-image" ? (mk(), !0) : m === "h1" ? ft(1) : m === "h2" ? ft(2) : m === "h3" ? ft(3) : m === "h4" ? ft(4) : m === "bullet-list" ? ur() : m === "ordered-list" ? it() : m === "table" ? Rn() : m === "code-block" ? ar() : !1;
  }
  function kk(m) {
    if (!m) return [];
    const g = [];
    return m.state.doc.descendants((y, x) => {
      var M;
      return ((M = y.type) == null ? void 0 : M.name) === "code_block" && g.push({ node: y, pos: x }), !0;
    }), g;
  }
  function bk(m, g) {
    var N;
    const y = ue();
    if (!y) return !1;
    const x = y.state.doc.nodeAt(m);
    if (!x || ((N = x.type) == null ? void 0 : N.name) !== "code_block") return !1;
    const M = String(g || "").trim(), I = y.state.tr.setNodeAttribute(m, "language", M);
    return y.dispatch(I), Re(), y.focus(), Ot(), !0;
  }
  function wk(m, g) {
    var M;
    const y = document.createElement("select");
    y.className = "markdown-code-language-select", y.setAttribute("aria-label", b("markdown.codeLanguage"));
    const x = ((M = g.node.attrs) == null ? void 0 : M.language) || "";
    return y.innerHTML = jh(x).map((I) => `<option value="${yr(I.value)}">${yr(I.label)}</option>`).join(""), y.value = x, y.addEventListener("mousedown", (I) => {
      I.stopPropagation();
    }), y.addEventListener("click", (I) => {
      I.stopPropagation();
    }), y.addEventListener("change", (I) => {
      I.preventDefault(), I.stopPropagation(), bk(Number(y.dataset.codeBlockPos), I.target.value);
    }), qe.appendChild(y), cn.set(m, y), y;
  }
  function xk() {
    qe || (qe = document.createElement("div"), qe.className = "markdown-code-language-layer", t.appendChild(qe), ["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
      t.addEventListener(m, Ot, !0);
    }), window.addEventListener("scroll", Ot, !0), window.addEventListener("resize", Ot));
  }
  function Ck() {
    if (ct = null, !qe || !q || lr()) return;
    const m = ue(), g = t.querySelector(".ProseMirror");
    if (!m || !g) return;
    const y = t.getBoundingClientRect(), x = Array.from(g.querySelectorAll("pre")), M = kk(m);
    cn.forEach((I, N) => {
      x.includes(N) || (I.remove(), cn.delete(N));
    }), x.forEach((I, N) => {
      var ke;
      const P = M[N];
      if (!P) return;
      const F = cn.get(I) || wk(I, P);
      F.dataset.codeBlockPos = String(P.pos);
      const W = ((ke = P.node.attrs) == null ? void 0 : ke.language) || "";
      [...F.options].some((Te) => Te.value === W) || (F.innerHTML = jh(W).map((Te) => `<option value="${yr(Te.value)}">${yr(Te.label)}</option>`).join("")), F.value = W;
      const ee = I.getBoundingClientRect(), de = ee.bottom > y.top && ee.top < y.bottom && I.offsetParent !== null;
      if (F.style.display = de ? "inline-flex" : "none", !de) return;
      const ge = Math.max(8, ee.left - y.left + 16), Se = Math.max(8, ee.top - y.top + 10);
      F.style.left = `${Math.round(ge)}px`, F.style.top = `${Math.round(Se)}px`;
    });
  }
  function Ot() {
    qe && (ct && cancelAnimationFrame(ct), ct = requestAnimationFrame(Ck));
  }
  function Sk() {
    var y;
    const m = document.createElement("div");
    m.className = "markdown-insert-menu", m.setAttribute("aria-label", b("markdown.insertMenu"));
    const g = [
      { command: "image", icon: Jt.image, label: b("markdown.insertImage") },
      // PR C / C2：「封面图」必须紧邻普通「图片」。
      { command: "cover-image", icon: Jt.cover, label: b("markdown.insertCoverImage") },
      { command: "h1", icon: Jt.h1, label: b("markdown.insertHeading1") },
      { command: "h2", icon: Jt.h2, label: b("markdown.insertHeading2") },
      { command: "h3", icon: Jt.h3, label: b("markdown.insertHeading3") },
      { command: "h4", icon: Jt.h4, label: b("markdown.insertHeading4") },
      { command: "bullet-list", icon: Jt.list, label: b("markdown.insertBulletList") },
      { command: "ordered-list", icon: Jt.orderedList, label: b("markdown.insertOrderedList") },
      { command: "table", icon: Jt.table, label: b("markdown.insertTable") },
      { command: "code-block", icon: Jt.code, label: b("markdown.insertCodeBlock") }
    ];
    return m.innerHTML = `
      <button class="markdown-insert-trigger" type="button" aria-label="${b("markdown.openInsertMenu")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.5v11M4.5 10h11" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
      </button>
      <div class="markdown-insert-popover" role="menu" aria-hidden="true">
        ${g.map((x) => `
          <button type="button" role="menuitem" data-insert-command="${x.command}" aria-label="${x.label}">
            ${x.icon}
            <span class="markdown-insert-tooltip">${x.label}</span>
          </button>
        `).join("")}
      </div>
    `, m.addEventListener("pointerdown", (x) => {
      x.preventDefault(), x.stopPropagation();
    }), (y = m.querySelector(".markdown-insert-trigger")) == null || y.addEventListener("pointerdown", (x) => {
      var I;
      x.preventDefault(), x.stopPropagation();
      const M = ue();
      !M || !ne(M) || (Xe = { from: M.state.selection.from }, Fe = !Fe, m.classList.toggle("open", Fe), (I = m.querySelector(".markdown-insert-popover")) == null || I.setAttribute("aria-hidden", Fe ? "false" : "true"), _e());
    }), m.addEventListener("pointerdown", (x) => {
      const M = x.target.closest("button[data-insert-command]");
      M && (x.preventDefault(), x.stopPropagation(), yk(M.dataset.insertCommand));
    }), m;
  }
  function Mk() {
    ae || (ae = Sk(), t.appendChild(ae), ["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
      t.addEventListener(m, _e, !0);
    }), t.addEventListener("keydown", bf, !0), t.addEventListener("pointerdown", wf, !0), window.addEventListener("scroll", _e, !0), window.addEventListener("resize", _e), t.addEventListener("focusout", xf, !0));
  }
  function bf(m) {
    m.key !== "Enter" || m.isComposing || (window.setTimeout(_e, 0), window.setTimeout(_e, 80));
  }
  function wf(m) {
    !Fe || ae != null && ae.contains(m.target) || Ss();
  }
  function Ss({ preserveSelection: m = !1 } = {}) {
    var g;
    Fe = !1, m || (Xe = null), ae == null || ae.classList.remove("open"), (g = ae == null ? void 0 : ae.querySelector(".markdown-insert-popover")) == null || g.setAttribute("aria-hidden", "true");
  }
  function fn() {
    ae && (Ss(), ae.classList.remove("visible"), S = !1);
  }
  function xf() {
    window.setTimeout(() => {
      const m = document.activeElement;
      !t.contains(m) && !(ae != null && ae.contains(m)) && fn();
    }, 0);
  }
  function vk() {
    var F;
    if (We = null, !ae || !q || lr()) return;
    const m = ue(), g = ne(m);
    if (!m || !g || !t.contains(m.dom)) {
      fn();
      return;
    }
    let y = null;
    try {
      y = m.coordsAtPos(m.state.selection.from);
    } catch {
      fn();
      return;
    }
    const x = t.getBoundingClientRect(), M = (F = we(m)) == null ? void 0 : F.getBoundingClientRect(), N = ((M == null ? void 0 : M.left) ?? y.left) - x.left - 34, P = Math.max(4, y.top - x.top + (y.bottom - y.top) / 2 - 13);
    ae.style.left = `${Math.round(N)}px`, ae.style.top = `${Math.round(P)}px`, S || (ae.classList.add("visible"), S = !0);
  }
  function _e() {
    ae && (We && cancelAnimationFrame(We), We = requestAnimationFrame(vk));
  }
  function Qi(m, g = ue()) {
    if (!m || !g) return null;
    let y = null;
    return g.state.doc.descendants((x, M) => {
      var N, P, F, W, ee, de;
      if (y || !["image", ot, mt].includes((N = x.type) == null ? void 0 : N.name)) return !y;
      const I = g.nodeDOM(M);
      if (I === m || (P = I == null ? void 0 : I.contains) != null && P.call(I, m)) {
        const ge = g.state.doc.resolve(M), Se = ((F = x.type) == null ? void 0 : F.name) === mt, ke = ((W = x.type) == null ? void 0 : W.name) === ot, Te = Se || ke || ((de = (ee = ge.parent) == null ? void 0 : ee.type) == null ? void 0 : de.name) === "paragraph" && ge.parent.childCount === 1;
        return y = { element: m, node: x, pos: M, isPortable: ke, isCover: Se, isStandalone: Te }, !1;
      }
      return !0;
    }), y;
  }
  function Cf(m, g = {}) {
    var x, M, I, N, P;
    const y = m == null ? void 0 : m.node;
    return y ? ((x = y.type) == null ? void 0 : x.name) === ot ? {
      ...y.attrs,
      ...g,
      sourceSyntax: "github-html",
      presentationDirty: !0
    } : {
      src: ((M = y.attrs) == null ? void 0 : M.src) || "",
      alt: ((I = y.attrs) == null ? void 0 : I.alt) || "",
      title: hA(((N = y.attrs) == null ? void 0 : N.title) || ""),
      alignment: qr(((P = y.attrs) == null ? void 0 : P.title) || ""),
      displayWidthPx: null,
      linkHref: "",
      linkTitle: "",
      sourceSyntax: "github-html",
      rawSource: "",
      presentationDirty: !0,
      ...g
    } : null;
  }
  function Sf(m, g, y) {
    var I;
    if (!m || !g || !y) return !1;
    const x = m.state.schema.nodes[ot];
    if (!x) return !1;
    let M = m.state.tr;
    if (((I = g.node.type) == null ? void 0 : I.name) === ot)
      M = M.setNodeMarkup(g.pos, x, y);
    else {
      if (!g.isStandalone) return !1;
      const N = m.state.doc.resolve(g.pos), P = N.parent, F = N.before(N.depth);
      M = M.replaceWith(F, F + P.nodeSize, x.create(y));
    }
    return m.dispatch(M.scrollIntoView()), Re(), Xi(), m.focus(), !0;
  }
  function Tk(m) {
    const g = Number((m == null ? void 0 : m.naturalWidth) || 0);
    return g > 0 ? Promise.resolve(g) : m ? new Promise((y, x) => {
      let M = !1;
      const I = (W, ee = null) => {
        M || (M = !0, window.clearTimeout(F), m.removeEventListener("load", N), m.removeEventListener("error", P), ee ? x(ee) : y(W));
      }, N = () => {
        const W = Number(m.naturalWidth || 0);
        W > 0 ? I(W) : I(0, new Error("IMAGE_DIMENSIONS_UNAVAILABLE"));
      }, P = () => I(0, new Error("IMAGE_LOAD_FAILED")), F = window.setTimeout(() => I(0, new Error("IMAGE_DIMENSIONS_TIMEOUT")), 4e3);
      m.addEventListener("load", N, { once: !0 }), m.addEventListener("error", P, { once: !0 }), m.complete && N();
    }) : Promise.reject(new Error("IMAGE_NOT_AVAILABLE"));
  }
  async function Pl(m, g) {
    if (g === "large") return null;
    const y = GI[g];
    if (!y) return null;
    const x = await Tk(m == null ? void 0 : m.element);
    return Math.min(y, x);
  }
  function Jr(m) {
    typeof h == "function" && h(m);
  }
  function Mf(m, g, { alignment: y, displayWidthPx: x }) {
    var N;
    const M = m.state.doc.nodeAt(g.pos);
    if (!M || ((N = M.type) == null ? void 0 : N.name) !== mt) return !1;
    const I = m.state.tr.setNodeAttribute(g.pos, "presentationDirty", !0);
    return I.setNodeAttribute(g.pos, "nodeKind", "portable-image"), I.setNodeAttribute(g.pos, "alignment", y || ""), I.setNodeAttribute(g.pos, "displayWidthPx", x ?? null), m.dispatch(Zr(I.scrollIntoView())), Re(), m.focus(), cr(), !0;
  }
  async function Nk(m) {
    var M, I, N, P, F, W, ee, de;
    const g = ue();
    if (!g || !se) return !1;
    let y = { ...se, node: g.state.doc.nodeAt(se.pos) };
    if (!y.node || !y.isStandalone) return !1;
    if (((M = y.node.type) == null ? void 0 : M.name) === mt) {
      const ge = ((I = y.node.attrs) == null ? void 0 : I.displayWidthPx) ?? null;
      return Mf(g, y, { alignment: m, displayWidthPx: ge });
    }
    let x = ((N = y.node.type) == null ? void 0 : N.name) === ot ? ((P = y.node.attrs) == null ? void 0 : P.displayWidthPx) ?? null : null;
    if (((F = y.node.type) == null ? void 0 : F.name) === "image") {
      const ge = Iu(((W = y.node.attrs) == null ? void 0 : W.title) || "");
      if (ge !== "large") {
        try {
          x = await Pl(y, ge);
        } catch (ke) {
          return Jr(ke), !1;
        }
        const Se = Qi(y.element, g);
        if (!Se || ((ee = Se.node.attrs) == null ? void 0 : ee.src) !== ((de = y.node.attrs) == null ? void 0 : de.src)) return !1;
        y = Se;
      }
    }
    return Sf(g, y, Cf(y, { alignment: m, displayWidthPx: x }));
  }
  async function Ik(m) {
    var x, M, I, N;
    const g = ue();
    if (!g || !se) return !1;
    let y = { ...se, node: g.state.doc.nodeAt(se.pos) };
    if (!y.node || !y.isStandalone) return !1;
    if (((x = y.node.type) == null ? void 0 : x.name) === mt)
      try {
        const P = await Pl(y, m);
        return Mf(g, y, {
          alignment: ((M = y.node.attrs) == null ? void 0 : M.alignment) || "",
          displayWidthPx: P
        });
      } catch (P) {
        return Jr(P), !1;
      }
    try {
      const P = await Pl(y, m), F = Qi(y.element, g);
      return !F || ((I = F.node.attrs) == null ? void 0 : I.src) !== ((N = y.node.attrs) == null ? void 0 : N.src) ? !1 : (y = F, Sf(g, y, Cf(y, { displayWidthPx: P })));
    } catch (P) {
      return Jr(P), !1;
    }
  }
  function zl(m) {
    typeof p == "function" && p(m);
  }
  async function Ak() {
    var P, F;
    const m = ue();
    if (!m || !se) return !1;
    let g = { ...se, node: m.state.doc.nodeAt(se.pos) };
    if (!g.node || !g.isStandalone || ((P = g.node.type) == null ? void 0 : P.name) === mt) return !1;
    const y = String(((F = g.node.attrs) == null ? void 0 : F.src) || "");
    if (typeof f == "function" && !/^https?:\/\//i.test(y.trim()) && !await f(y))
      return zl({ kind: "set", ok: !1, reason: "validation" }), !1;
    if (Ln.getCoverState().duplicate) return !1;
    const M = ue();
    if (!M || M.composing) return !1;
    const I = Qi(g.element, M);
    if (!I) return !1;
    const N = Ln.setCoverImage(I.pos);
    return zl({ kind: "set", ok: N }), N;
  }
  function Ek() {
    if (Ln.getCoverState().duplicate) return !1;
    const m = Ln.removeCover();
    return zl({ kind: "remove", ok: m }), m;
  }
  function Ok() {
    var M;
    const m = ue();
    if (!((M = m == null ? void 0 : m.dom) != null && M.isConnected)) return;
    const g = [];
    for (let I = m.dom.parentElement; I; I = I.parentElement)
      g.push({ element: I, left: I.scrollLeft, top: I.scrollTop });
    const y = window.scrollX, x = window.scrollY;
    try {
      m.dom.focus({ preventScroll: !0 });
    } catch {
      m.dom.focus();
    }
    g.forEach(({ element: I, left: N, top: P }) => {
      I.scrollLeft !== N && (I.scrollLeft = N), I.scrollTop !== P && (I.scrollTop = P);
    }), (window.scrollX !== y || window.scrollY !== x) && window.scrollTo(y, x);
  }
  function Dk() {
    const m = document.createElement("div");
    m.className = "markdown-image-align-toolbar", m.setAttribute("aria-label", b("markdown.imageAlignTools"));
    const g = [
      { type: "align", value: "left", icon: Bn.left, label: b("markdown.alignLeft") },
      { type: "align", value: "center", icon: Bn.center, label: b("markdown.alignCenter") },
      { type: "align", value: "right", icon: Bn.right, label: b("markdown.alignRight") },
      { type: "size", value: "small", icon: Ra.small, label: b("markdown.imageSizeSmall") },
      { type: "size", value: "medium", icon: Ra.medium, label: b("markdown.imageSizeMedium") },
      { type: "size", value: "large", icon: Ra.large, label: b("markdown.imageSizeLarge") },
      // PR C / C2：封面二态工具。合格非封面图片只显示「设为封面」；
      // 当前封面只显示「取消封面」；不提供替换当前封面的第三态入口。
      { type: "cover", value: "set", icon: Bn.coverSet, label: b("markdown.setAsCover") },
      { type: "cover", value: "remove", icon: Bn.coverRemove, label: b("markdown.removeCover") }
    ];
    m.innerHTML = g.map((x) => `
      <button type="button" data-image-${x.type}="${x.value}" aria-label="${x.label}">
        ${x.icon}
        <span class="markdown-image-align-tooltip">${x.label}</span>
      </button>
    `).join("");
    const y = (x) => !x || x.disabled || x.hidden ? !1 : x.dataset.imageCover === "set" ? Ak().catch((M) => (Jr(M), !1)) : x.dataset.imageCover === "remove" ? Ek() : x.dataset.imageAlign ? Nk(x.dataset.imageAlign).catch((M) => (Jr(M), !1)) : Ik(x.dataset.imageSize || "large").catch((M) => (Jr(M), !1));
    return m.addEventListener("pointerdown", (x) => {
      const M = x.target.closest("button[data-image-align], button[data-image-size], button[data-image-cover]");
      M && (x.preventDefault(), x.stopPropagation(), y(M));
    }), m.addEventListener("keydown", (x) => {
      if (x.key !== "Enter" && x.key !== " ") return;
      const M = x.target.closest("button[data-image-align], button[data-image-size], button[data-image-cover]");
      M && (x.preventDefault(), x.stopPropagation(), Promise.resolve(y(M)).finally(() => {
        Ok();
      }));
    }), m.addEventListener("pointerenter", () => {
      cr();
    }), m.addEventListener("pointerleave", () => {
      window.setTimeout(() => {
        var x, M;
        !(te != null && te.matches(":hover")) && !((M = (x = se == null ? void 0 : se.element) == null ? void 0 : x.matches) != null && M.call(x, ":hover")) && Xi();
      }, 120);
    }), m;
  }
  function Rk() {
    te || (te = Dk(), t.appendChild(te), t.addEventListener("pointerover", vf, !0), t.addEventListener("pointerout", Tf, !0), window.addEventListener("scroll", cr, !0), window.addEventListener("resize", cr));
  }
  function vf(m) {
    var x, M;
    const g = (M = (x = m.target) == null ? void 0 : x.closest) == null ? void 0 : M.call(x, ".ProseMirror img");
    if (!g || !t.contains(g)) return;
    const y = Qi(g);
    y && (se = y, cr());
  }
  function Tf(m) {
    if (!(se != null && se.element)) return;
    const g = m.relatedTarget;
    g && (se.element.contains(g) || te != null && te.contains(g)) || window.setTimeout(() => {
      var y, x;
      !(te != null && te.matches(":hover")) && !((x = (y = se == null ? void 0 : se.element) == null ? void 0 : y.matches) != null && x.call(y, ":hover")) && Xi();
    }, 120);
  }
  function Xi() {
    te && (te.classList.remove("visible"), se = null);
  }
  function Lk() {
    var vs, Ts, eo, Pn, Rf;
    if (Ct = null, !te || !(se != null && se.element) || !t.contains(se.element)) {
      Xi();
      return;
    }
    const m = ue(), g = Qi(se.element, m);
    if (!g) {
      Xi();
      return;
    }
    se = g;
    const y = se.node, x = ((vs = y.type) == null ? void 0 : vs.name) === mt, M = x || ((Ts = y.type) == null ? void 0 : Ts.name) === ot, I = ((eo = y.attrs) == null ? void 0 : eo.title) || "", N = M ? ((Pn = y.attrs) == null ? void 0 : Pn.alignment) || "" : qr(I), P = M ? ((Rf = y.attrs) == null ? void 0 : Rf.displayWidthPx) == null ? "large" : "custom" : Iu(I), F = se.isStandalone;
    te.querySelectorAll("button[data-image-align], button[data-image-size]").forEach((St) => {
      St.disabled = !F;
      const Lf = St.querySelector(".markdown-image-align-tooltip");
      Lf && (Lf.textContent = F ? St.getAttribute("aria-label") || "" : b("markdown.imageBlockOnly"));
    }), te.querySelectorAll("button[data-image-align]").forEach((St) => {
      St.classList.toggle("active", St.dataset.imageAlign === N);
    }), te.querySelectorAll("button[data-image-size]").forEach((St) => {
      St.classList.toggle("active", St.dataset.imageSize === P);
    });
    const W = te.querySelector('button[data-image-cover="set"]'), ee = te.querySelector('button[data-image-cover="remove"]'), de = x, ge = Ln.getCoverState();
    if (W) {
      W.disabled = !F;
      const St = F && !de && !ge.duplicate;
      W.hidden = !St;
    }
    if (ee) {
      ee.disabled = !F;
      const St = F && de && !ge.duplicate;
      ee.hidden = !St;
    }
    const Se = t.getBoundingClientRect(), ke = se.element.getBoundingClientRect(), Te = te.offsetWidth || 108, Gr = Math.max(8, Math.min(ke.left - Se.left + ke.width / 2 - Te / 2, Se.width - Te - 8)), Yr = Math.max(4, ke.top - Se.top + 8);
    te.style.left = `${Math.round(Gr)}px`, te.style.top = `${Math.round(Yr)}px`, te.classList.add("visible");
  }
  function cr() {
    te && (Ct && cancelAnimationFrame(Ct), Ct = requestAnimationFrame(Lk));
  }
  function Nf(m, g = Ae) {
    if (!m || !g) return (m == null ? void 0 : m.state.selection) || null;
    const y = m.state.doc.content.size, x = Math.max(0, Math.min(Number(g.anchor), y)), M = Math.max(0, Math.min(Number(g.head), y));
    return Z.between(m.state.doc.resolve(x), m.state.doc.resolve(M));
  }
  function If(m) {
    const g = ue();
    if (!g || !["left", ...Lr].includes(m)) return !1;
    const y = Nf(g), x = op(g.state, y);
    if (!x.supported) return !1;
    const M = Lr.includes(m) && x.alignment === m ? "left" : m, I = g.state.schema.nodes[Wr];
    let N = g.state.tr, P = !1, F = y.anchor, W = y.head;
    const ee = (ke, Te, Gr, Yr) => {
      const vs = ke + Te, Ts = Gr - Te, eo = (Pn) => Pn <= ke ? Pn : Pn >= vs ? Pn + Ts : Pn + Yr;
      F = eo(F), W = eo(W);
    };
    if ([...x.targets].reverse().forEach((ke) => {
      const Te = N.doc.nodeAt(ke.pos);
      if (!Te) return;
      if (Te.type === I) {
        if (M === "left") {
          if (Te.childCount !== 1) return;
          const Yr = Te.child(0);
          ee(ke.pos, Te.nodeSize, Yr.nodeSize, -1), N = N.replaceWith(ke.pos, ke.pos + Te.nodeSize, Yr), P = !0;
          return;
        }
        if (Te.attrs.alignment === M) return;
        N = N.setNodeMarkup(ke.pos, I, {
          alignment: M,
          sourceSyntax: "github-div-align"
        }), P = !0;
        return;
      }
      if (M === "left") return;
      const Gr = I.create({
        alignment: M,
        sourceSyntax: "github-div-align"
      }, Te);
      ee(ke.pos, Te.nodeSize, Gr.nodeSize, 1), N = N.replaceWith(ke.pos, ke.pos + Te.nodeSize, Gr), P = !0;
    }), !P) return !1;
    const de = N.doc.content.size, ge = Math.max(0, Math.min(F, de)), Se = Math.max(0, Math.min(W, de));
    return N = N.setSelection(Z.between(
      N.doc.resolve(ge),
      N.doc.resolve(Se)
    )), N = Zr(N), g.dispatch(N.scrollIntoView()), Re(), g.focus(), Le(), Pe(), _e(), Ot(), !0;
  }
  function Pk(m) {
    const g = ue(), y = g == null ? void 0 : g.state.schema.marks[m];
    return y ? Q(rs(y)) : !1;
  }
  function Ms() {
    var m;
    J && ((m = J.querySelector(".markdown-format-link-popover")) == null || m.classList.remove("open"), Ne = null);
  }
  function zk() {
    const m = ue(), g = m == null ? void 0 : m.state.selection;
    if (!J || !m || !g || g.empty) return !1;
    Ne = { from: g.from, to: g.to };
    const y = J.querySelector(".markdown-format-link-popover"), x = J.querySelector("[data-format-link-input]");
    return !y || !x ? !1 : (y.classList.add("open"), x.value = "", window.setTimeout(() => x.focus(), 0), !0);
  }
  function Af(m) {
    const g = String(m || "").trim();
    if (!g) return !1;
    const y = ue(), x = y == null ? void 0 : y.state.schema.marks.link;
    if (!y || !x || !Ne) return !1;
    const M = Math.max(0, Math.min(Ne.from, y.state.doc.content.size)), I = Math.max(M, Math.min(Ne.to, y.state.doc.content.size)), N = y.state.tr.setSelection(Z.create(y.state.doc, M, I)).addMark(M, I, x.create({ href: g }));
    return y.dispatch(N.scrollIntoView()), Re(), y.focus(), Ms(), Le(), Pe(), !0;
  }
  function Bk() {
    const m = ue(), g = m == null ? void 0 : m.state.schema.marks.link, y = m == null ? void 0 : m.state.selection;
    if (!m || !g || !y || y.empty) return !1;
    const x = m.state.tr.removeMark(y.from, y.to, g);
    return m.dispatch(x.scrollIntoView()), Re(), m.focus(), Ms(), Le(), Pe(), !0;
  }
  function Fk(m) {
    const g = ue();
    if (!g) return !1;
    const { nodes: y } = g.state.schema;
    if (m === "paragraph")
      return y.paragraph ? Q(Sn(y.paragraph)) : !1;
    const x = Number(String(m || "").replace("h", ""));
    return !y.heading || !Number.isFinite(x) ? !1 : Q(Sn(y.heading, { level: x }));
  }
  function $k(m, g) {
    const y = m == null ? void 0 : m.state.schema.marks[g];
    if (!m || !y) return !1;
    const { from: x, to: M, empty: I, $from: N } = m.state.selection;
    return I ? !!y.isInSet(m.state.storedMarks || N.marks()) : m.state.doc.rangeHasMark(x, M, y);
  }
  function _k(m) {
    var y;
    if (!m) return "paragraph";
    const { $from: g } = m.state.selection;
    for (let x = g.depth; x > 0; x -= 1) {
      const M = g.node(x);
      if (M.type.name === "heading")
        return `h${((y = M.attrs) == null ? void 0 : y.level) || 1}`;
      if (M.type.name === "paragraph")
        return "paragraph";
    }
    return "paragraph";
  }
  function Vk() {
    var x, M, I;
    const m = document.createElement("div");
    m.className = "markdown-format-toolbar", m.setAttribute("aria-label", b("markdown.formatTools")), m.innerHTML = `
      <label class="markdown-format-heading-wrap">
        <select class="markdown-format-heading" aria-label="${b("markdown.headingLevel")}">
          <option value="paragraph">正文</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
          <option value="h4">H4</option>
        </select>
        <svg class="markdown-format-heading-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.2 4.5 6 7.3l2.8-2.8" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </label>
      <button type="button" data-format-command="bold" aria-label="${b("markdown.bold")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4h4.3c2 0 3.2 1 3.2 2.6 0 1.1-.6 1.9-1.5 2.2 1.3.3 2.1 1.3 2.1 2.7 0 1.9-1.4 3.2-3.6 3.2H6V4Zm2.2 4h1.9c.8 0 1.2-.4 1.2-1.1 0-.7-.5-1.1-1.3-1.1H8.2V8Zm0 5h2.1c.9 0 1.5-.5 1.5-1.3 0-.9-.6-1.3-1.6-1.3h-2V13Z" fill="currentColor"/></svg>
        <span class="markdown-format-tooltip">⌘B</span>
      </button>
      <button type="button" data-format-command="italic" aria-label="${b("markdown.italic")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M9.1 4h6l-.3 1.7h-1.9l-1.8 8.6H13L12.7 16h-6l.3-1.7h1.9l1.8-8.6H8.8L9.1 4Z" fill="currentColor"/></svg>
        <span class="markdown-format-tooltip">⌘I</span>
      </button>
      <button type="button" data-format-command="code" aria-label="${b("markdown.inlineCode")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.2 6.4-3.3 3.5 3.3 3.5M12.8 6.4l3.3 3.5-3.3 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="markdown-format-tooltip">⌘E</span>
      </button>
      <button type="button" data-format-command="strike" aria-label="${b("markdown.strike")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10M7.1 13.3c.6 1 1.7 1.6 3.1 1.6 1.8 0 3-.9 3-2.2 0-1.1-.7-1.8-2.3-2.2l-1.8-.5C7.5 9.6 6.7 8.8 6.7 7.5c0-1.6 1.4-2.7 3.3-2.7 1.5 0 2.6.6 3.2 1.7" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>
        <span class="markdown-format-tooltip">⌥⌘X</span>
      </button>
      <button type="button" data-format-command="link" aria-label="${b("markdown.addLink")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.2 6.7 9.4 5.5a3.3 3.3 0 0 1 4.7 4.7l-1.6 1.6a3.3 3.3 0 0 1-4.5.2M11.8 13.3l-1.2 1.2a3.3 3.3 0 0 1-4.7-4.7l1.6-1.6a3.3 3.3 0 0 1 4.5-.2" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="markdown-format-tooltip">${b("markdown.linkTooltip")}</span>
      </button>
      <span class="markdown-format-divider" aria-hidden="true"></span>
      <button type="button" data-text-align="left" aria-label="${b("markdown.alignLeft")}">
        ${Bn.left}
        <span class="markdown-format-tooltip">${b("markdown.alignLeft")}</span>
      </button>
      <button type="button" data-text-align="center" aria-label="${b("markdown.alignCenter")}">
        ${Bn.center}
        <span class="markdown-format-tooltip">${b("markdown.alignCenter")}</span>
      </button>
      <button type="button" data-text-align="right" aria-label="${b("markdown.alignRight")}">
        ${Bn.right}
        <span class="markdown-format-tooltip">${b("markdown.alignRight")}</span>
      </button>
      <div class="markdown-format-link-popover" aria-hidden="true">
        <input data-format-link-input type="text" placeholder="粘贴链接或文件路径" />
        <button type="button" data-format-link-apply>确认</button>
      </div>
    `;
    const g = {
      bold: "strong",
      italic: "emphasis",
      code: "inlineCode",
      strike: "strike_through"
    };
    m.addEventListener("mousedown", (N) => {
      N.target.closest("select") || N.target.closest("input") || N.preventDefault();
    }), m.addEventListener("pointerdown", (N) => {
      const P = N.target.closest("button[data-text-align]");
      P && (N.preventDefault(), N.stopPropagation(), P.getAttribute("aria-disabled") !== "true" && If(P.dataset.textAlign || "left"));
    }), m.addEventListener("click", (N) => {
      const P = N.target.closest("button[data-text-align]");
      if (P) {
        N.preventDefault(), N.stopPropagation(), N.detail === 0 && P.getAttribute("aria-disabled") !== "true" && If(P.dataset.textAlign || "left");
        return;
      }
      const F = N.target.closest("button[data-format-command]");
      if (!(!F || F.getAttribute("aria-disabled") === "true")) {
        if (N.preventDefault(), N.stopPropagation(), F.dataset.formatCommand === "link") {
          if (F.classList.contains("active")) {
            Bk();
            return;
          }
          zk();
          return;
        }
        Pk(g[F.dataset.formatCommand]);
      }
    }), (x = m.querySelector("[data-format-link-apply]")) == null || x.addEventListener("click", (N) => {
      N.preventDefault(), N.stopPropagation();
      const P = m.querySelector("[data-format-link-input]");
      Af(P == null ? void 0 : P.value);
    }), (M = m.querySelector("[data-format-link-input]")) == null || M.addEventListener("keydown", (N) => {
      var P;
      N.key === "Enter" && (N.preventDefault(), N.stopPropagation(), Af(N.currentTarget.value)), N.key === "Escape" && (N.preventDefault(), N.stopPropagation(), Ms(), (P = ue()) == null || P.focus());
    });
    const y = m.querySelector("[data-format-link-input]");
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
    ].forEach((N) => {
      y == null || y.addEventListener(N, (P) => P.stopPropagation());
    }), (I = m.querySelector("select")) == null || I.addEventListener("change", (N) => {
      Fk(N.target.value);
    }), m;
  }
  function Hk() {
    J || (J = Vk(), t.appendChild(J), ["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
      t.addEventListener(m, Le, !0);
    }), document.addEventListener("selectionchange", Le), window.addEventListener("scroll", Le, !0), window.addEventListener("resize", Le), t.addEventListener("focusout", Ef, !0));
  }
  function Zi() {
    J && (Ms(), J.classList.remove("visible"), le = !1, Ae = null);
  }
  function Ef() {
    window.setTimeout(() => {
      const m = document.activeElement;
      !t.contains(m) && !(J != null && J.contains(m)) && Zi();
    }, 0);
  }
  function jk(m) {
    if (!J || !m) return;
    Object.entries({
      bold: "strong",
      italic: "emphasis",
      code: "inlineCode",
      strike: "strike_through",
      link: "link"
    }).forEach(([F, W]) => {
      const ee = J.querySelector(`[data-format-command="${F}"]`);
      if (!ee) return;
      const de = !!m.state.schema.marks[W];
      ee.classList.toggle("active", de && $k(m, W)), ee.setAttribute("aria-disabled", de ? "false" : "true");
    });
    const y = J.querySelector('[data-format-command="link"]'), x = y == null ? void 0 : y.querySelector(".markdown-format-tooltip"), M = !!(y != null && y.classList.contains("active"));
    y == null || y.setAttribute("aria-label", b(M ? "markdown.removeLink" : "markdown.addLink")), x && (x.textContent = b(M ? "actions.remove" : "markdown.linkTooltip"));
    const I = J.querySelector("select");
    I && (I.value = _k(m));
    const N = Nf(m), P = op(m.state, N);
    J.querySelectorAll("button[data-text-align]").forEach((F) => {
      const W = P.supported, ee = F.dataset.textAlign;
      F.classList.toggle("active", W && P.alignment === ee), F.setAttribute("aria-disabled", W ? "false" : "true");
      const de = F.querySelector(".markdown-format-tooltip");
      de && (de.textContent = W ? F.getAttribute("aria-label") || "" : b("markdown.textAlignBlockOnly"));
    });
  }
  function Wk() {
    if (me = null, !J || !q || lr()) return;
    const m = ue(), g = m == null ? void 0 : m.state.selection;
    if (!m || !g || g.empty || !t.contains(m.dom)) {
      Zi();
      return;
    }
    if (Ve(m.state)) {
      Zi();
      return;
    }
    if (!m.state.doc.textBetween(g.from, g.to, " ").trim()) {
      Zi();
      return;
    }
    Ae = {
      anchor: g.anchor,
      head: g.head
    }, jk(m);
    const x = t.getBoundingClientRect();
    let M = null, I = null;
    try {
      M = m.coordsAtPos(g.from), I = m.coordsAtPos(g.to);
    } catch {
      Zi();
      return;
    }
    const N = J.offsetWidth || 352, P = J.offsetHeight || 38, F = Math.min(M.left, I.left), W = Math.max(M.right || M.left, I.right || I.left), ee = Math.min(M.top, I.top), de = Math.max(M.bottom || M.top, I.bottom || I.top), ge = (F + W) / 2, Se = Math.max(8, Math.min(ge - x.left - N / 2, x.width - N - 8));
    let ke = ee - x.top - P - 10;
    ke < 8 && (ke = de - x.top + 10), J.style.left = `${Math.round(Se)}px`, J.style.top = `${Math.round(ke)}px`, le || (J.classList.add("visible"), le = !0);
  }
  function Le() {
    J && (me && cancelAnimationFrame(me), me = requestAnimationFrame(Wk));
  }
  function qk(m) {
    if (!s) return !1;
    const g = ue();
    if (!g || !Ve(g.state)) return !1;
    const y = m(g.state, g.dispatch, g);
    return y && (Re(), g.focus(), Pe()), y;
  }
  function Kk() {
    const m = document.createElement("div");
    m.className = "markdown-table-toolbar", m.setAttribute("aria-label", b("markdown.tableTools"));
    const g = {
      "row-before": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5h12M4 9.5h12M4 13.5h12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M10 2.8v4.1M7.9 4.8 10 2.7l2.1 2.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "row-after": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5h12M4 9.5h12M4 13.5h12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M10 17.2v-4.1M7.9 15.2l2.1 2.1 2.1-2.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "column-before": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 4v12M9.5 4v12M13.5 4v12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M2.8 10h4.1M4.8 7.9 2.7 10l2.1 2.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "column-after": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 4v12M9.5 4v12M13.5 4v12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M17.2 10h-4.1M15.2 7.9l2.1 2.1-2.1 2.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "delete-row": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M4 10h12M4 14h12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="m7.7 7.7 4.6 4.6m0-4.6-4.6 4.6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>',
      "delete-column": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4v12M10 4v12M14 4v12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="m7.7 7.7 4.6 4.6m0-4.6-4.6 4.6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>'
    }, y = {
      "row-before": "上方插行",
      "row-after": "下方插行",
      "column-before": "左侧插列",
      "column-after": "右侧插列",
      "delete-row": "删除行",
      "delete-column": "删除列"
    };
    m.innerHTML = `
      ${Object.keys(y).map((M) => `
        <button type="button" data-table-command="${M}" aria-label="${y[M]}">
          ${g[M]}
          <span class="markdown-table-tooltip">${y[M]}</span>
        </button>
      `).join("")}
    `;
    const x = {
      "row-before": Cv,
      "row-after": Sv,
      "column-before": ly,
      "column-after": ay,
      "delete-row": fy,
      "delete-column": uy
    };
    return m.addEventListener("mousedown", (M) => {
      M.preventDefault();
    }), m.addEventListener("click", (M) => {
      const I = M.target.closest("button[data-table-command]");
      I && (M.preventDefault(), M.stopPropagation(), qk(x[I.dataset.tableCommand]));
    }), m;
  }
  function Of() {
    !s || xe || (xe = Kk(), t.appendChild(xe), ["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
      t.addEventListener(m, Pe, !0);
    }), window.addEventListener("scroll", Pe, !0), window.addEventListener("resize", Pe));
  }
  function Df() {
    je && (cancelAnimationFrame(je), je = null), xe && (["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
      t.removeEventListener(m, Pe, !0);
    }), window.removeEventListener("scroll", Pe, !0), window.removeEventListener("resize", Pe), xe.remove(), xe = null, C = !1);
  }
  function Uk() {
    xe && (xe.classList.remove("visible"), C = !1);
  }
  function Jk() {
    if (je = null, !xe || !s || !q || lr()) return;
    const m = ue(), g = $(m);
    if (!g) {
      Uk();
      return;
    }
    const y = t.getBoundingClientRect();
    let x = null;
    try {
      x = m.coordsAtPos(m.state.selection.from);
    } catch {
      x = g.getBoundingClientRect();
    }
    const M = xe.offsetWidth || 224, I = xe.offsetHeight || 38, N = ((x.left || 0) + (x.right || x.left || 0)) / 2, P = Math.max(6, Math.min(N - y.left - M / 2, y.width - M - 6));
    let F = (x.top || 0) - y.top - I - 10;
    F < 6 && (F = (x.bottom || x.top || 0) - y.top + 10), xe.style.left = `${Math.round(P)}px`, xe.style.top = `${Math.round(F)}px`, C || (xe.classList.add("visible"), C = !0);
  }
  function Pe() {
    !s || !xe || (je && cancelAnimationFrame(je), je = requestAnimationFrame(Jk));
  }
  function Bl(m) {
    if (V) return !1;
    const g = Ke.action((y) => {
      const x = y.get(Ee), M = m(x.state, x.dispatch, x);
      return M && (x.focus(), Le(), Pe(), _e(), Ot()), M;
    });
    return g && ($e && (clearTimeout($e), $e = null), Cs()), g;
  }
  const Ln = {
    editor: Ke,
    getMarkdown() {
      $e && (clearTimeout($e), $e = null);
      const m = Yi();
      return Ur = m, m;
    },
    getBaselineMarkdown() {
      return xs;
    },
    /**
     * PR C / Task C1：封面身份 API（供 C2 的图片工具栏 / `+` 菜单直接调用）。
     *
     * - `setCoverImage(pos)`：把 pos 处的独立图片块包裹为封面；若当前已有封面
     *   A，则在同一个 transaction 内解包 A、包裹 B（A→B 身份转移）。
     * - `removeCover()`：仅移除 marker/wrapper，图片原地保留为普通正文。
     * - `getCoverState()`：读取当前封面身份与结构化诊断。
     *
     * 全部走一次 dispatch / 一个 ProseMirror history step；单次 undo/redo 完整
     * 恢复；不 remount、不重置 baseline、不破坏 selection；composition 期间
     * 拒绝执行；不触发图片删除或资源清理回调。
     */
    /**
     * 包裹 pos 处独立图片块为封面（或 A→B 身份转移）。
     * @param {number} targetPos 目标图片块内任一位置
     * @returns {boolean} 是否已提交
     */
    setCoverImage(m) {
      return V ? !1 : Ke.action((g) => {
        const y = g.get(Ee);
        if (!y || y.composing || Dn.some((ge) => ge.kind === "duplicate"))
          return !1;
        const x = y.state, M = dA(x, m);
        if (!M || !x.schema.nodes[mt]) return !1;
        const N = io(x), P = M.blockStart, F = M.blockEnd, W = Jh(y, P);
        let ee = x.tr;
        if (N) {
          const ge = N.pos, Se = N.pos + N.node.nodeSize;
          ge < P ? (ee = ee.replaceWith(P, F, Ps(x.schema, M.attrs)), ee = ee.replaceWith(ge, Se, oo(x.schema, N.node.attrs))) : (ee = ee.replaceWith(ge, Se, oo(x.schema, N.node.attrs)), ee = ee.replaceWith(P, F, Ps(x.schema, M.attrs)));
        } else
          ee = ee.replaceWith(P, F, Ps(x.schema, M.attrs));
        y.dispatch(Zr(ee)), y.dom.dispatchEvent(new Event("nutbook:normalize-local-images"));
        const de = io(y.state);
        return de && Gh(y, W, de.pos), Re(), Le(), Pe(), _e(), !0;
      });
    },
    /**
     * 取消当前封面：仅移除 marker/wrapper，图片原地保留为普通正文。
     * @returns {boolean} 是否已提交
     */
    removeCover() {
      return V ? !1 : Ke.action((m) => {
        const g = m.get(Ee);
        if (!g || g.composing || Dn.some((N) => N.kind === "duplicate"))
          return !1;
        const y = io(g.state);
        if (!y) return !1;
        const x = Jh(g, y.pos), M = oo(g.state.schema, y.node.attrs);
        let I = g.state.tr.replaceWith(
          y.pos,
          y.pos + y.node.nodeSize,
          M
        );
        return g.dispatch(Zr(I)), g.dom.dispatchEvent(new Event("nutbook:normalize-local-images")), Gh(g, x, y.pos), Re(), Le(), Pe(), _e(), !0;
      });
    },
    /**
     * 读取当前封面身份与结构化诊断。
     * @returns {{hasCover:boolean, valid:boolean, duplicate:boolean,
     *   diagnostics:Array<{kind:string,count?:number}>, nodeKind:string|null,
     *   pos:number|null, src:string|null}}
     */
    getCoverState() {
      return V ? { hasCover: !1, valid: !1, duplicate: !1, diagnostics: [], nodeKind: null, pos: null, src: null } : Ke.action((m) => {
        const g = m.get(Ee), y = io(g.state), x = Dn.some((M) => M.kind === "duplicate");
        return {
          hasCover: !!y,
          valid: !!y && !x,
          duplicate: x,
          diagnostics: Dn.map((M) => ({ ...M })),
          nodeKind: (y == null ? void 0 : y.node.attrs.nodeKind) ?? null,
          pos: (y == null ? void 0 : y.pos) ?? null,
          src: (y == null ? void 0 : y.node.attrs.src) ?? null
        };
      });
    },
    /**
     * 枚举文档中所有合格「独立图片块」候选（不含当前封面 wrapper）。
     *
     * C2 的「设为封面」/hover 身份判定需要枚举候选；返回块起始 pos，
     * 可直接传给 `setCoverImage(pos)`。
     * @returns {Array<{pos:number, nodeKind:string, src:string, alt:string}>}
     */
    getCoverableImageBlocks() {
      return V ? [] : Ke.action((m) => {
        const g = m.get(Ee), y = [];
        return g.state.doc.descendants((x, M) => {
          var I;
          if (x.type.name === ot && ((I = x.attrs) != null && I.src))
            return y.push({ pos: M, nodeKind: "portable-image", src: String(x.attrs.src), alt: String(x.attrs.alt || "") }), !0;
          if (x.type.name === "paragraph" && x.childCount === 1) {
            const N = x.firstChild;
            if (N.type.name === "image") {
              const P = Nu(N);
              y.push({
                pos: M,
                nodeKind: P ? "linked-image" : "image",
                src: String(N.attrs.src || ""),
                alt: String(N.attrs.alt || "")
              });
            }
          }
          return !0;
        }), y;
      });
    },
    /**
     * 通过一次 ProseMirror transaction 修改文档标题（B3）。
     *
     * - 已有有效顶层 H1（含 `aligned_text_block` 内部 H1）→ 替换该 heading 文本。
     * - 无有效 H1 → 在正文首部插入 H1（YAML frontmatter 已被拆分到编辑器
     *   外，因此正文首部即 frontmatter 之后）。
     * - 一次 dispatch 进入 history，成为一个可撤销步骤。
     * - 不销毁、不重建、不重新挂载编辑器；不重置 baseline。
     *
     * @param {string} nextTitle
     * @returns {boolean} 是否已提交（空标题或正在 composition 时返回 false）
     */
    setDocumentTitle(m) {
      if (V) return !1;
      const g = String(m || "").trim();
      return g ? Ke.action((y) => {
        const x = y.get(Ee);
        if (!x || x.composing)
          return !1;
        const M = x.state, { doc: I } = M, N = Wh(I, M.schema);
        if (N && N.node.textContent.trim() === g)
          return !1;
        let P = M.tr;
        if (N) {
          const F = M.schema.text(g), W = N.node.type.create(N.node.attrs, F);
          P = P.replaceWith(N.pos, N.pos + N.node.nodeSize, W);
        } else {
          const F = M.schema.nodes.heading.create({ level: 1 }, M.schema.text(g)), W = I.firstChild;
          W && W.type.name === "paragraph" && W.textContent.trim() === "" ? P = P.replaceWith(0, W.nodeSize, F) : P = P.insert(0, F);
        }
        return x.dispatch(Zr(P)), Re(), x.focus(), !0;
      }) : !1;
    },
    /**
     * 读取当前编辑器文档的权威标题（第一个有效顶层 H1 的纯文本）。
     * @returns {string|null} 无有效 H1 时返回 null
     */
    getDocumentTitle() {
      return V ? null : Ke.action((m) => {
        const g = m.get(Ee);
        if (!g)
          return null;
        const y = Wh(g.state.doc, g.state.schema);
        return y ? y.node.textContent.trim() : null;
      });
    },
    hasChanges() {
      return A || G;
    },
    setTableToolsEnabled(m) {
      V || (s = !!m, s ? (Of(), Pe()) : Df());
    },
    undo() {
      return Bl(vo);
    },
    redo() {
      return Bl(si);
    },
    focus() {
      V || Ke.action((m) => {
        m.get(Ee).focus();
      });
    },
    blur() {
      V || Ke.action((m) => {
        m.get(Ee).dom.blur();
      });
    },
    focusAtText(m, g = 0) {
      if (V) return !1;
      const y = Zh(m);
      return y ? Ke.action((x) => {
        const M = x.get(Ee);
        let I = null;
        return M.state.doc.descendants((N, P) => {
          if (I !== null) return !1;
          if (!N.isText) return !0;
          const F = N.text || "", W = Zh(F);
          if (W.indexOf(y) < 0 && !y.includes(W)) return !0;
          const de = F.indexOf(m), ge = de >= 0 ? de : 0;
          return I = Math.max(P + 1, Math.min(P + F.length, P + 1 + ge + Math.max(0, g))), !1;
        }), I === null ? (M.focus(), !1) : (M.dispatch(M.state.tr.setSelection(Z.create(M.state.doc, I)).scrollIntoView()), M.focus(), !0);
      }) : (Ln.focus(), !1);
    },
    destroy() {
      V = !0, $e && (clearTimeout($e), $e = null), me && (cancelAnimationFrame(me), me = null), J && (["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
        t.removeEventListener(m, Le, !0);
      }), document.removeEventListener("selectionchange", Le), window.removeEventListener("scroll", Le, !0), window.removeEventListener("resize", Le), t.removeEventListener("focusout", Ef, !0), J.remove(), J = null), ct && (cancelAnimationFrame(ct), ct = null), qe && (["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
        t.removeEventListener(m, Ot, !0);
      }), window.removeEventListener("scroll", Ot, !0), window.removeEventListener("resize", Ot), cn.forEach((m) => m.remove()), cn.clear(), qe.remove(), qe = null), Df(), We && (cancelAnimationFrame(We), We = null), ae && (["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
        t.removeEventListener(m, _e, !0);
      }), t.removeEventListener("keydown", bf, !0), t.removeEventListener("pointerdown", wf, !0), window.removeEventListener("scroll", _e, !0), window.removeEventListener("resize", _e), t.removeEventListener("focusout", xf, !0), ae.remove(), ae = null), Ct && (cancelAnimationFrame(Ct), Ct = null), te && (t.removeEventListener("pointerover", vf, !0), t.removeEventListener("pointerout", Tf, !0), window.removeEventListener("scroll", cr, !0), window.removeEventListener("resize", cr), te.remove(), te = null, se = null);
      for (const m of bs)
        t.removeEventListener(m, Re, !0);
      t.removeEventListener("keydown", ws, !0), Ke.destroy(), t.innerHTML = "", ml.delete(t);
    }
  };
  return ml.set(t, Ln), Ln;
}
window.NutbookMarkdownEditor = {
  create: bA,
  destroy(t) {
    dk(t);
  },
  // 权威标题语义的静态入口（与 dist/assets/markdown-document-title.js 同一实现）。
  parseDocumentTitle: ok,
  setDocumentTitleInSource: LI
};
