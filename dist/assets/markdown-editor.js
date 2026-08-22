var Tf = (t) => {
  throw TypeError(t);
};
var Nf = (t, e, n) => e.has(t) || Tf("Cannot " + n);
var v = (t, e, n) => (Nf(t, e, "read from private field"), n ? n.call(t) : e.get(t)), q = (t, e, n) => e.has(t) ? Tf("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, n), z = (t, e, n, r) => (Nf(t, e, "write to private field"), r ? r.call(t, n) : e.set(t, n), n);
var Lt = /* @__PURE__ */ function(t) {
  return t.docTypeError = "docTypeError", t.contextNotFound = "contextNotFound", t.timerNotFound = "timerNotFound", t.ctxCallOutOfScope = "ctxCallOutOfScope", t.createNodeInParserFail = "createNodeInParserFail", t.stackOverFlow = "stackOverFlow", t.parserMatchError = "parserMatchError", t.serializerMatchError = "serializerMatchError", t.getAtomFromSchemaFail = "getAtomFromSchemaFail", t.expectDomTypeError = "expectDomTypeError", t.callCommandBeforeEditorView = "callCommandBeforeEditorView", t.missingRootElement = "missingRootElement", t.missingNodeInSchema = "missingNodeInSchema", t.missingMarkInSchema = "missingMarkInSchema", t.ctxNotBind = "ctxNotBind", t.missingYjsDoc = "missingYjsDoc", t.aiProviderError = "aiProviderError", t.aiBuildContextError = "aiBuildContextError", t;
}({}), Pt = class extends Error {
  constructor(t, e, n) {
    super(e, n), this.name = "MilkdownError", this.code = t, (n == null ? void 0 : n.cause) !== void 0 && (this.cause = n.cause);
  }
}, vk = (t, e) => typeof e == "function" ? "[Function]" : e, ol = (t) => JSON.stringify(t, vk);
function Tk(t) {
  return new Pt(Lt.docTypeError, `Doc type error, unsupported type: ${ol(t)}`);
}
function Nk(t) {
  return new Pt(Lt.contextNotFound, `Context "${t}" not found, do you forget to inject it?`);
}
function Ik(t) {
  return new Pt(Lt.timerNotFound, `Timer "${t}" not found, do you forget to record it?`);
}
function sl() {
  return new Pt(Lt.ctxCallOutOfScope, "Should not call a context out of the plugin.");
}
function Ak(t, e, n) {
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
  return new Pt(Lt.createNodeInParserFail, o.join(`
`));
}
function Jd() {
  return new Pt(Lt.stackOverFlow, "Stack over flow, cannot pop on an empty stack.");
}
function Ek(t) {
  return new Pt(Lt.parserMatchError, `Cannot match target parser for node: ${ol(t)}.`);
}
function Ok(t) {
  return new Pt(Lt.serializerMatchError, `Cannot match target serializer for node: ${ol(t)}.`);
}
function Xt(t) {
  return new Pt(Lt.expectDomTypeError, `Expect to be a dom, but get: ${ol(t)}.`);
}
function Il() {
  return new Pt(Lt.callCommandBeforeEditorView, "You're trying to call a command before editor view initialized, make sure to get commandManager from ctx after editor view has been initialized");
}
function Dk(t) {
  return new Pt(Lt.missingNodeInSchema, `Missing node in schema, milkdown cannot find "${t}" in schema.`);
}
function Rk(t) {
  return new Pt(Lt.missingMarkInSchema, `Missing mark in schema, milkdown cannot find "${t}" in schema.`);
}
var Gd = class {
  constructor() {
    this.sliceMap = /* @__PURE__ */ new Map(), this.get = (t) => {
      const e = typeof t == "string" ? [...this.sliceMap.values()].find((n) => n.type.name === t) : this.sliceMap.get(t.id);
      if (!e) throw Nk(typeof t == "string" ? t : t.name);
      return e;
    }, this.remove = (t) => {
      const e = typeof t == "string" ? [...this.sliceMap.values()].find((n) => n.type.name === t) : this.sliceMap.get(t.id);
      e && this.sliceMap.delete(e.type.id);
    }, this.has = (t) => typeof t == "string" ? [...this.sliceMap.values()].some((e) => e.type.name === t) : this.sliceMap.has(t.id);
  }
}, Ft, fn, oi, jd, Lk = (jd = class {
  constructor(e, n, r) {
    q(this, Ft);
    q(this, fn);
    q(this, oi);
    z(this, Ft, []), z(this, oi, () => {
      v(this, Ft).forEach((i) => i(v(this, fn)));
    }), this.set = (i) => {
      z(this, fn, i), v(this, oi).call(this);
    }, this.get = () => v(this, fn), this.update = (i) => {
      z(this, fn, i(v(this, fn))), v(this, oi).call(this);
    }, this.type = r, z(this, fn, n), e.set(r.id, this);
  }
  on(e) {
    return v(this, Ft).push(e), () => {
      z(this, Ft, v(this, Ft).filter((n) => n !== e));
    };
  }
  once(e) {
    const n = this.on((r) => {
      e(r), n();
    });
    return n;
  }
  off(e) {
    z(this, Ft, v(this, Ft).filter((n) => n !== e));
  }
  offAll() {
    z(this, Ft, []);
  }
}, Ft = new WeakMap(), fn = new WeakMap(), oi = new WeakMap(), jd), Pk = class {
  constructor(t, e) {
    this.id = Symbol(`Context-${e}`), this.name = e, this._defaultValue = t, this._typeInfo = () => {
      throw sl();
    };
  }
  create(t, e = this._defaultValue) {
    return new Lk(t, e, this);
  }
}, ae = (t, e) => new Pk(t, e), Eo, Oo, Do, dr, si, Fn, li, ai, ui, Wd, zk = (Wd = class {
  constructor(t, e, n) {
    q(this, Eo);
    q(this, Oo);
    q(this, Do);
    q(this, dr);
    q(this, si);
    q(this, Fn);
    q(this, li);
    q(this, ai);
    q(this, ui);
    z(this, dr, /* @__PURE__ */ new Set()), z(this, si, /* @__PURE__ */ new Set()), z(this, Fn, /* @__PURE__ */ new Map()), z(this, li, /* @__PURE__ */ new Map()), this.read = () => ({
      metadata: v(this, Eo),
      injectedSlices: [...v(this, dr)].map((r) => ({
        name: typeof r == "string" ? r : r.name,
        value: v(this, ai).call(this, r)
      })),
      consumedSlices: [...v(this, si)].map((r) => ({
        name: typeof r == "string" ? r : r.name,
        value: v(this, ai).call(this, r)
      })),
      recordedTimers: [...v(this, Fn)].map(([r, { duration: i }]) => ({
        name: r.name,
        duration: i,
        status: v(this, ui).call(this, r)
      })),
      waitTimers: [...v(this, li)].map(([r, { duration: i }]) => ({
        name: r.name,
        duration: i,
        status: v(this, ui).call(this, r)
      }))
    }), this.onRecord = (r) => {
      v(this, Fn).set(r, {
        start: Date.now(),
        duration: 0
      });
    }, this.onClear = (r) => {
      v(this, Fn).delete(r);
    }, this.onDone = (r) => {
      const i = v(this, Fn).get(r);
      i && (i.duration = Date.now() - i.start);
    }, this.onWait = (r, i) => {
      const o = Date.now();
      i.finally(() => {
        v(this, li).set(r, { duration: Date.now() - o });
      }).catch(console.error);
    }, this.onInject = (r) => {
      v(this, dr).add(r);
    }, this.onRemove = (r) => {
      v(this, dr).delete(r);
    }, this.onUse = (r) => {
      v(this, si).add(r);
    }, z(this, ai, (r) => v(this, Oo).get(r).get()), z(this, ui, (r) => v(this, Do).get(r).status), z(this, Oo, t), z(this, Do, e), z(this, Eo, n);
  }
}, Eo = new WeakMap(), Oo = new WeakMap(), Do = new WeakMap(), dr = new WeakMap(), si = new WeakMap(), Fn = new WeakMap(), li = new WeakMap(), ai = new WeakMap(), ui = new WeakMap(), Wd), hn, dn, Ro, Nt, ci, Bk = (ci = class {
  constructor(e, n, r) {
    q(this, hn);
    q(this, dn);
    q(this, Ro);
    q(this, Nt);
    this.produce = (i) => i && Object.keys(i).length ? new ci(v(this, hn), v(this, dn), { ...i }) : this, this.inject = (i, o) => {
      var l;
      const s = i.create(v(this, hn).sliceMap);
      return o != null && s.set(o), (l = v(this, Nt)) == null || l.onInject(i), this;
    }, this.remove = (i) => {
      var o;
      return v(this, hn).remove(i), (o = v(this, Nt)) == null || o.onRemove(i), this;
    }, this.record = (i) => {
      var o;
      return i.create(v(this, dn).store), (o = v(this, Nt)) == null || o.onRecord(i), this;
    }, this.clearTimer = (i) => {
      var o;
      return v(this, dn).remove(i), (o = v(this, Nt)) == null || o.onClear(i), this;
    }, this.isInjected = (i) => v(this, hn).has(i), this.isRecorded = (i) => v(this, dn).has(i), this.use = (i) => {
      var o;
      return (o = v(this, Nt)) == null || o.onUse(i), v(this, hn).get(i);
    }, this.get = (i) => this.use(i).get(), this.set = (i, o) => this.use(i).set(o), this.update = (i, o) => this.use(i).update(o), this.timer = (i) => v(this, dn).get(i), this.done = (i) => {
      var o;
      this.timer(i).done(), (o = v(this, Nt)) == null || o.onDone(i);
    }, this.wait = (i) => {
      var s;
      const o = this.timer(i).start();
      return (s = v(this, Nt)) == null || s.onWait(i, o), o;
    }, this.waitTimers = async (i) => {
      await Promise.all(this.get(i).map((o) => this.wait(o)));
    }, z(this, hn, e), z(this, dn, n), z(this, Ro, r), r && z(this, Nt, new zk(e, n, r));
  }
  get meta() {
    return v(this, Ro);
  }
  get inspector() {
    return v(this, Nt);
  }
}, hn = new WeakMap(), dn = new WeakMap(), Ro = new WeakMap(), Nt = new WeakMap(), ci), Fk = class {
  constructor() {
    this.store = /* @__PURE__ */ new Map(), this.get = (t) => {
      const e = this.store.get(t.id);
      if (!e) throw Ik(t.name);
      return e;
    }, this.remove = (t) => {
      this.store.delete(t.id);
    }, this.has = (t) => this.store.has(t.id);
  }
}, fi, $n, hi, pn, di, Lo, qd, $k = (qd = class {
  constructor(t, e) {
    q(this, fi);
    q(this, $n);
    q(this, hi);
    q(this, pn);
    q(this, di);
    q(this, Lo);
    z(this, fi, null), z(this, $n, null), z(this, pn, "pending"), this.start = () => (v(this, fi) ?? z(this, fi, new Promise((n, r) => {
      z(this, $n, (i) => {
        i instanceof CustomEvent && i.detail.id === v(this, hi) && (z(this, pn, "resolved"), v(this, di).call(this), i.stopImmediatePropagation(), n());
      }), v(this, Lo).call(this, () => {
        v(this, pn) === "pending" && z(this, pn, "rejected"), v(this, di).call(this), r(/* @__PURE__ */ new Error(`Timing ${this.type.name} timeout.`));
      }), z(this, pn, "pending"), addEventListener(this.type.name, v(this, $n));
    })), v(this, fi)), this.done = () => {
      const n = new CustomEvent(this.type.name, { detail: { id: v(this, hi) } });
      dispatchEvent(n);
    }, z(this, di, () => {
      v(this, $n) && removeEventListener(this.type.name, v(this, $n));
    }), z(this, Lo, (n) => {
      setTimeout(() => {
        n();
      }, this.type.timeout);
    }), z(this, hi, Symbol(e.name)), this.type = e, t.set(e.id, this);
  }
  get status() {
    return v(this, pn);
  }
}, fi = new WeakMap(), $n = new WeakMap(), hi = new WeakMap(), pn = new WeakMap(), di = new WeakMap(), Lo = new WeakMap(), qd), _k = class {
  constructor(t, e = 3e3) {
    this.create = (n) => new $k(n, this), this.id = Symbol(`Timer-${t}`), this.name = t, this.timeout = e;
  }
}, Zt = (t, e = 3e3) => new _k(t, e);
const Vk = {};
function xu(t, e) {
  const n = Vk, r = typeof n.includeImageAlt == "boolean" ? n.includeImageAlt : !0, i = typeof n.includeHtml == "boolean" ? n.includeHtml : !0;
  return Yd(t, r, i);
}
function Yd(t, e, n) {
  if (Hk(t)) {
    if ("value" in t)
      return t.type === "html" && !n ? "" : t.value;
    if (e && "alt" in t && t.alt)
      return t.alt;
    if ("children" in t)
      return If(t.children, e, n);
  }
  return Array.isArray(t) ? If(t, e, n) : "";
}
function If(t, e, n) {
  const r = [];
  let i = -1;
  for (; ++i < t.length; )
    r[i] = Yd(t[i], e, n);
  return r.join("");
}
function Hk(t) {
  return !!(t && typeof t == "object");
}
const Af = document.createElement("i");
function Cu(t) {
  const e = "&" + t + ";";
  Af.innerHTML = e;
  const n = Af.textContent;
  return n.charCodeAt(n.length - 1) === 59 && t !== "semi" || n === e ? !1 : n;
}
function Ct(t, e, n, r) {
  const i = t.length;
  let o = 0, s;
  if (e < 0 ? e = -e > i ? 0 : i + e : e = e > i ? i : e, n = n > 0 ? n : 0, r.length < 1e4)
    s = Array.from(r), s.unshift(e, n), t.splice(...s);
  else
    for (n && t.splice(e, n); o < r.length; )
      s = r.slice(o, o + 1e4), s.unshift(e, 0), t.splice(...s), o += 1e4, e += 1e4;
}
function Et(t, e) {
  return t.length > 0 ? (Ct(t, t.length, 0, e), t) : e;
}
const Ef = {}.hasOwnProperty;
function Qd(t) {
  const e = {};
  let n = -1;
  for (; ++n < t.length; )
    jk(e, t[n]);
  return e;
}
function jk(t, e) {
  let n;
  for (n in e) {
    const i = (Ef.call(t, n) ? t[n] : void 0) || (t[n] = {}), o = e[n];
    let s;
    if (o)
      for (s in o) {
        Ef.call(i, s) || (i[s] = []);
        const l = o[s];
        Wk(
          // @ts-expect-error Looks like a list.
          i[s],
          Array.isArray(l) ? l : l ? [l] : []
        );
      }
  }
}
function Wk(t, e) {
  let n = -1;
  const r = [];
  for (; ++n < e.length; )
    (e[n].add === "after" ? t : r).push(e[n]);
  Ct(t, 0, 0, r);
}
function Xd(t, e) {
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
function Vt(t) {
  return t.replace(/[\t\n\r ]+/g, " ").replace(/^ | $/g, "").toLowerCase().toUpperCase();
}
const nt = Xn(/[A-Za-z]/), ft = Xn(/[\dA-Za-z]/), qk = Xn(/[#-'*+\--9=?A-Z^-~]/);
function _s(t) {
  return (
    // Special whitespace codes (which have negative values), C0 and Control
    // character DEL
    t !== null && (t < 32 || t === 127)
  );
}
const Ea = Xn(/\d/), Kk = Xn(/[\dA-Fa-f]/), Uk = Xn(/[!-/:-@[-`{-~]/);
function G(t) {
  return t !== null && t < -2;
}
function be(t) {
  return t !== null && (t < 0 || t === 32);
}
function le(t) {
  return t === -2 || t === -1 || t === 32;
}
const ll = Xn(new RegExp("[\\u0021-\\u002F\\u003A-\\u0040\\u005B-\\u0060\\u007B-\\u007E]")), Dr = Xn(/\s/);
function Xn(t) {
  return e;
  function e(n) {
    return n !== null && n > -1 && t.test(String.fromCharCode(n));
  }
}
function ue(t, e, n, r) {
  const i = r ? r - 1 : Number.POSITIVE_INFINITY;
  let o = 0;
  return s;
  function s(a) {
    return le(a) ? (t.enter(n), l(a)) : e(a);
  }
  function l(a) {
    return le(a) && o++ < i ? (t.consume(a), l) : (t.exit(n), e(a));
  }
}
const Jk = {
  tokenize: Gk
};
function Gk(t) {
  const e = t.attempt(this.parser.constructs.contentInitial, r, i);
  let n;
  return e;
  function r(l) {
    if (l === null) {
      t.consume(l);
      return;
    }
    return t.enter("lineEnding"), t.consume(l), t.exit("lineEnding"), ue(t, e, "linePrefix");
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
    return G(l) ? (t.consume(l), t.exit("chunkText"), o) : (t.consume(l), s);
  }
}
const Yk = {
  tokenize: Qk
}, Of = {
  tokenize: Xk
};
function Qk(t) {
  const e = this, n = [];
  let r = 0, i, o, s;
  return l;
  function l(A) {
    if (r < n.length) {
      const j = n[r];
      return e.containerState = j[1], t.attempt(j[0].continuation, a, u)(A);
    }
    return u(A);
  }
  function a(A) {
    if (r++, e.containerState._closeFlow) {
      e.containerState._closeFlow = void 0, i && L();
      const j = e.events.length;
      let H = j, M;
      for (; H--; )
        if (e.events[H][0] === "exit" && e.events[H][1].type === "chunkFlow") {
          M = e.events[H][1].end;
          break;
        }
      w(r);
      let P = j;
      for (; P < e.events.length; )
        e.events[P][1].end = {
          ...M
        }, P++;
      return Ct(e.events, H + 1, 0, e.events.slice(j)), e.events.length = P, u(A);
    }
    return l(A);
  }
  function u(A) {
    if (r === n.length) {
      if (!i)
        return h(A);
      if (i.currentConstruct && i.currentConstruct.concrete)
        return p(A);
      e.interrupt = !!(i.currentConstruct && !i._gfmTableDynamicInterruptHack);
    }
    return e.containerState = {}, t.check(Of, c, f)(A);
  }
  function c(A) {
    return i && L(), w(r), h(A);
  }
  function f(A) {
    return e.parser.lazy[e.now().line] = r !== n.length, s = e.now().offset, p(A);
  }
  function h(A) {
    return e.containerState = {}, t.attempt(Of, d, p)(A);
  }
  function d(A) {
    return r++, n.push([e.currentConstruct, e.containerState]), h(A);
  }
  function p(A) {
    if (A === null) {
      i && L(), w(0), t.consume(A);
      return;
    }
    return i = i || e.parser.flow(e.now()), t.enter("chunkFlow", {
      _tokenizer: i,
      contentType: "flow",
      previous: o
    }), g(A);
  }
  function g(A) {
    if (A === null) {
      x(t.exit("chunkFlow"), !0), w(0), t.consume(A);
      return;
    }
    return G(A) ? (t.consume(A), x(t.exit("chunkFlow")), r = 0, e.interrupt = void 0, l) : (t.consume(A), g);
  }
  function x(A, j) {
    const H = e.sliceStream(A);
    if (j && H.push(null), A.previous = o, o && (o.next = A), o = A, i.defineSkip(A.start), i.write(H), e.parser.lazy[A.start.line]) {
      let M = i.events.length;
      for (; M--; )
        if (
          // The token starts before the line ending…
          i.events[M][1].start.offset < s && // …and either is not ended yet…
          (!i.events[M][1].end || // …or ends after it.
          i.events[M][1].end.offset > s)
        )
          return;
      const P = e.events.length;
      let F = P, J, N;
      for (; F--; )
        if (e.events[F][0] === "exit" && e.events[F][1].type === "chunkFlow") {
          if (J) {
            N = e.events[F][1].end;
            break;
          }
          J = !0;
        }
      for (w(r), M = P; M < e.events.length; )
        e.events[M][1].end = {
          ...N
        }, M++;
      Ct(e.events, F + 1, 0, e.events.slice(P)), e.events.length = M;
    }
  }
  function w(A) {
    let j = n.length;
    for (; j-- > A; ) {
      const H = n[j];
      e.containerState = H[1], H[0].exit.call(e, t);
    }
    n.length = A;
  }
  function L() {
    i.write([null]), o = void 0, i = void 0, e.containerState._closeFlow = void 0;
  }
}
function Xk(t, e, n) {
  return ue(t, t.attempt(this.parser.constructs.document, e, n), "linePrefix", this.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4);
}
function vi(t) {
  if (t === null || be(t) || Dr(t))
    return 1;
  if (ll(t))
    return 2;
}
function al(t, e, n) {
  const r = [];
  let i = -1;
  for (; ++i < t.length; ) {
    const o = t[i].resolveAll;
    o && !r.includes(o) && (e = o(e, n), r.push(o));
  }
  return e;
}
const Oa = {
  name: "attention",
  resolveAll: Zk,
  tokenize: eb
};
function Zk(t, e) {
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
          Df(f, -a), Df(h, a), s = {
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
          }, u = [], t[r][1].end.offset - t[r][1].start.offset && (u = Et(u, [["enter", t[r][1], e], ["exit", t[r][1], e]])), u = Et(u, [["enter", i, e], ["enter", s, e], ["exit", s, e], ["enter", o, e]]), u = Et(u, al(e.parser.constructs.insideSpan.null, t.slice(r + 1, n), e)), u = Et(u, [["exit", o, e], ["enter", l, e], ["exit", l, e], ["exit", i, e]]), t[n][1].end.offset - t[n][1].start.offset ? (c = 2, u = Et(u, [["enter", t[n][1], e], ["exit", t[n][1], e]])) : c = 0, Ct(t, r - 1, n - r + 3, u), n = r + u.length - c - 2;
          break;
        }
    }
  for (n = -1; ++n < t.length; )
    t[n][1].type === "attentionSequence" && (t[n][1].type = "data");
  return t;
}
function eb(t, e) {
  const n = this.parser.constructs.attentionMarkers.null, r = this.previous, i = vi(r);
  let o;
  return s;
  function s(a) {
    return o = a, t.enter("attentionSequence"), l(a);
  }
  function l(a) {
    if (a === o)
      return t.consume(a), l;
    const u = t.exit("attentionSequence"), c = vi(a), f = !c || c === 2 && i || n.includes(a), h = !i || i === 2 && c || n.includes(r);
    return u._open = !!(o === 42 ? f : f && (i || !h)), u._close = !!(o === 42 ? h : h && (c || !f)), e(a);
  }
}
function Df(t, e) {
  t.column += e, t.offset += e, t._bufferIndex += e;
}
const tb = {
  name: "autolink",
  tokenize: nb
};
function nb(t, e, n) {
  let r = 0;
  return i;
  function i(d) {
    return t.enter("autolink"), t.enter("autolinkMarker"), t.consume(d), t.exit("autolinkMarker"), t.enter("autolinkProtocol"), o;
  }
  function o(d) {
    return nt(d) ? (t.consume(d), s) : d === 64 ? n(d) : u(d);
  }
  function s(d) {
    return d === 43 || d === 45 || d === 46 || ft(d) ? (r = 1, l(d)) : u(d);
  }
  function l(d) {
    return d === 58 ? (t.consume(d), r = 0, a) : (d === 43 || d === 45 || d === 46 || ft(d)) && r++ < 32 ? (t.consume(d), l) : (r = 0, u(d));
  }
  function a(d) {
    return d === 62 ? (t.exit("autolinkProtocol"), t.enter("autolinkMarker"), t.consume(d), t.exit("autolinkMarker"), t.exit("autolink"), e) : d === null || d === 32 || d === 60 || _s(d) ? n(d) : (t.consume(d), a);
  }
  function u(d) {
    return d === 64 ? (t.consume(d), c) : qk(d) ? (t.consume(d), u) : n(d);
  }
  function c(d) {
    return ft(d) ? f(d) : n(d);
  }
  function f(d) {
    return d === 46 ? (t.consume(d), r = 0, c) : d === 62 ? (t.exit("autolinkProtocol").type = "autolinkEmail", t.enter("autolinkMarker"), t.consume(d), t.exit("autolinkMarker"), t.exit("autolink"), e) : h(d);
  }
  function h(d) {
    if ((d === 45 || ft(d)) && r++ < 63) {
      const p = d === 45 ? h : f;
      return t.consume(d), p;
    }
    return n(d);
  }
}
const Jo = {
  partial: !0,
  tokenize: rb
};
function rb(t, e, n) {
  return r;
  function r(o) {
    return le(o) ? ue(t, i, "linePrefix")(o) : i(o);
  }
  function i(o) {
    return o === null || G(o) ? e(o) : n(o);
  }
}
const Zd = {
  continuation: {
    tokenize: ob
  },
  exit: sb,
  name: "blockQuote",
  tokenize: ib
};
function ib(t, e, n) {
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
    return le(s) ? (t.enter("blockQuotePrefixWhitespace"), t.consume(s), t.exit("blockQuotePrefixWhitespace"), t.exit("blockQuotePrefix"), e) : (t.exit("blockQuotePrefix"), e(s));
  }
}
function ob(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return le(s) ? ue(t, o, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(s) : o(s);
  }
  function o(s) {
    return t.attempt(Zd, e, n)(s);
  }
}
function sb(t) {
  t.exit("blockQuote");
}
const ep = {
  name: "characterEscape",
  tokenize: lb
};
function lb(t, e, n) {
  return r;
  function r(o) {
    return t.enter("characterEscape"), t.enter("escapeMarker"), t.consume(o), t.exit("escapeMarker"), i;
  }
  function i(o) {
    return Uk(o) ? (t.enter("characterEscapeValue"), t.consume(o), t.exit("characterEscapeValue"), t.exit("characterEscape"), e) : n(o);
  }
}
const tp = {
  name: "characterReference",
  tokenize: ab
};
function ab(t, e, n) {
  const r = this;
  let i = 0, o, s;
  return l;
  function l(f) {
    return t.enter("characterReference"), t.enter("characterReferenceMarker"), t.consume(f), t.exit("characterReferenceMarker"), a;
  }
  function a(f) {
    return f === 35 ? (t.enter("characterReferenceMarkerNumeric"), t.consume(f), t.exit("characterReferenceMarkerNumeric"), u) : (t.enter("characterReferenceValue"), o = 31, s = ft, c(f));
  }
  function u(f) {
    return f === 88 || f === 120 ? (t.enter("characterReferenceMarkerHexadecimal"), t.consume(f), t.exit("characterReferenceMarkerHexadecimal"), t.enter("characterReferenceValue"), o = 6, s = Kk, c) : (t.enter("characterReferenceValue"), o = 7, s = Ea, c(f));
  }
  function c(f) {
    if (f === 59 && i) {
      const h = t.exit("characterReferenceValue");
      return s === ft && !Cu(r.sliceSerialize(h)) ? n(f) : (t.enter("characterReferenceMarker"), t.consume(f), t.exit("characterReferenceMarker"), t.exit("characterReference"), e);
    }
    return s(f) && i++ < o ? (t.consume(f), c) : n(f);
  }
}
const Rf = {
  partial: !0,
  tokenize: cb
}, Lf = {
  concrete: !0,
  name: "codeFenced",
  tokenize: ub
};
function ub(t, e, n) {
  const r = this, i = {
    partial: !0,
    tokenize: H
  };
  let o = 0, s = 0, l;
  return a;
  function a(M) {
    return u(M);
  }
  function u(M) {
    const P = r.events[r.events.length - 1];
    return o = P && P[1].type === "linePrefix" ? P[2].sliceSerialize(P[1], !0).length : 0, l = M, t.enter("codeFenced"), t.enter("codeFencedFence"), t.enter("codeFencedFenceSequence"), c(M);
  }
  function c(M) {
    return M === l ? (s++, t.consume(M), c) : s < 3 ? n(M) : (t.exit("codeFencedFenceSequence"), le(M) ? ue(t, f, "whitespace")(M) : f(M));
  }
  function f(M) {
    return M === null || G(M) ? (t.exit("codeFencedFence"), r.interrupt ? e(M) : t.check(Rf, g, j)(M)) : (t.enter("codeFencedFenceInfo"), t.enter("chunkString", {
      contentType: "string"
    }), h(M));
  }
  function h(M) {
    return M === null || G(M) ? (t.exit("chunkString"), t.exit("codeFencedFenceInfo"), f(M)) : le(M) ? (t.exit("chunkString"), t.exit("codeFencedFenceInfo"), ue(t, d, "whitespace")(M)) : M === 96 && M === l ? n(M) : (t.consume(M), h);
  }
  function d(M) {
    return M === null || G(M) ? f(M) : (t.enter("codeFencedFenceMeta"), t.enter("chunkString", {
      contentType: "string"
    }), p(M));
  }
  function p(M) {
    return M === null || G(M) ? (t.exit("chunkString"), t.exit("codeFencedFenceMeta"), f(M)) : M === 96 && M === l ? n(M) : (t.consume(M), p);
  }
  function g(M) {
    return t.attempt(i, j, x)(M);
  }
  function x(M) {
    return t.enter("lineEnding"), t.consume(M), t.exit("lineEnding"), w;
  }
  function w(M) {
    return o > 0 && le(M) ? ue(t, L, "linePrefix", o + 1)(M) : L(M);
  }
  function L(M) {
    return M === null || G(M) ? t.check(Rf, g, j)(M) : (t.enter("codeFlowValue"), A(M));
  }
  function A(M) {
    return M === null || G(M) ? (t.exit("codeFlowValue"), L(M)) : (t.consume(M), A);
  }
  function j(M) {
    return t.exit("codeFenced"), e(M);
  }
  function H(M, P, F) {
    let J = 0;
    return N;
    function N(ie) {
      return M.enter("lineEnding"), M.consume(ie), M.exit("lineEnding"), U;
    }
    function U(ie) {
      return M.enter("codeFencedFence"), le(ie) ? ue(M, K, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(ie) : K(ie);
    }
    function K(ie) {
      return ie === l ? (M.enter("codeFencedFenceSequence"), ne(ie)) : F(ie);
    }
    function ne(ie) {
      return ie === l ? (J++, M.consume(ie), ne) : J >= s ? (M.exit("codeFencedFenceSequence"), le(ie) ? ue(M, de, "whitespace")(ie) : de(ie)) : F(ie);
    }
    function de(ie) {
      return ie === null || G(ie) ? (M.exit("codeFencedFence"), P(ie)) : F(ie);
    }
  }
}
function cb(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return s === null ? n(s) : (t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), o);
  }
  function o(s) {
    return r.parser.lazy[r.now().line] ? n(s) : e(s);
  }
}
const Al = {
  name: "codeIndented",
  tokenize: hb
}, fb = {
  partial: !0,
  tokenize: db
};
function hb(t, e, n) {
  const r = this;
  return i;
  function i(u) {
    return t.enter("codeIndented"), ue(t, o, "linePrefix", 5)(u);
  }
  function o(u) {
    const c = r.events[r.events.length - 1];
    return c && c[1].type === "linePrefix" && c[2].sliceSerialize(c[1], !0).length >= 4 ? s(u) : n(u);
  }
  function s(u) {
    return u === null ? a(u) : G(u) ? t.attempt(fb, s, a)(u) : (t.enter("codeFlowValue"), l(u));
  }
  function l(u) {
    return u === null || G(u) ? (t.exit("codeFlowValue"), s(u)) : (t.consume(u), l);
  }
  function a(u) {
    return t.exit("codeIndented"), e(u);
  }
}
function db(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return r.parser.lazy[r.now().line] ? n(s) : G(s) ? (t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), i) : ue(t, o, "linePrefix", 5)(s);
  }
  function o(s) {
    const l = r.events[r.events.length - 1];
    return l && l[1].type === "linePrefix" && l[2].sliceSerialize(l[1], !0).length >= 4 ? e(s) : G(s) ? i(s) : n(s);
  }
}
const pb = {
  name: "codeText",
  previous: gb,
  resolve: mb,
  tokenize: yb
};
function mb(t) {
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
function gb(t) {
  return t !== 96 || this.events[this.events.length - 1][1].type === "characterEscape";
}
function yb(t, e, n) {
  let r = 0, i, o;
  return s;
  function s(f) {
    return t.enter("codeText"), t.enter("codeTextSequence"), l(f);
  }
  function l(f) {
    return f === 96 ? (t.consume(f), r++, l) : (t.exit("codeTextSequence"), a(f));
  }
  function a(f) {
    return f === null ? n(f) : f === 32 ? (t.enter("space"), t.consume(f), t.exit("space"), a) : f === 96 ? (o = t.enter("codeTextSequence"), i = 0, c(f)) : G(f) ? (t.enter("lineEnding"), t.consume(f), t.exit("lineEnding"), a) : (t.enter("codeTextData"), u(f));
  }
  function u(f) {
    return f === null || f === 32 || f === 96 || G(f) ? (t.exit("codeTextData"), a(f)) : (t.consume(f), u);
  }
  function c(f) {
    return f === 96 ? (t.consume(f), i++, c) : i === r ? (t.exit("codeTextSequence"), t.exit("codeText"), e(f)) : (o.type = "codeTextData", u(f));
  }
}
class kb {
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
    return r && Yi(this.left, r), o.reverse();
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
    this.setCursor(Number.POSITIVE_INFINITY), Yi(this.left, e);
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
    this.setCursor(0), Yi(this.right, e.reverse());
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
        Yi(this.right, n.reverse());
      } else {
        const n = this.right.splice(this.left.length + this.right.length - e, Number.POSITIVE_INFINITY);
        Yi(this.left, n.reverse());
      }
  }
}
function Yi(t, e) {
  let n = 0;
  if (e.length < 1e4)
    t.push(...e);
  else
    for (; n < e.length; )
      t.push(...e.slice(n, n + 1e4)), n += 1e4;
}
function np(t) {
  const e = {};
  let n = -1, r, i, o, s, l, a, u;
  const c = new kb(t);
  for (; ++n < c.length; ) {
    for (; n in e; )
      n = e[n];
    if (r = c.get(n), n && r[1].type === "chunkFlow" && c.get(n - 1)[1].type === "listItemPrefix" && (a = r[1]._tokenizer.events, o = 0, o < a.length && a[o][1].type === "lineEndingBlank" && (o += 2), o < a.length && a[o][1].type === "content"))
      for (; ++o < a.length && a[o][1].type !== "content"; )
        a[o][1].type === "chunkText" && (a[o][1]._isInFirstContentOfListItem = !0, o++);
    if (r[0] === "enter")
      r[1].contentType && (Object.assign(e, bb(c, n)), n = e[n], u = !0);
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
  return Ct(t, 0, Number.POSITIVE_INFINITY, c.slice(0)), !u;
}
function bb(t, e) {
  const n = t.get(e)[1], r = t.get(e)[2];
  let i = e - 1;
  const o = [];
  let s = n._tokenizer;
  s || (s = r.parser[n.contentType](n.start), n._contentTypeTextTrailing && (s._contentTypeTextTrailing = !0));
  const l = s.events, a = [], u = {};
  let c, f, h = -1, d = n, p = 0, g = 0;
  const x = [g];
  for (; d; ) {
    for (; t.get(++i)[1] !== d; )
      ;
    o.push(i), d._tokenizer || (c = r.sliceStream(d), d.next || c.push(null), f && s.defineSkip(d.start), d._isInFirstContentOfListItem && (s._gfmTasklistFirstContentOfListItem = !0), s.write(c), d._isInFirstContentOfListItem && (s._gfmTasklistFirstContentOfListItem = void 0)), f = d, d = d.next;
  }
  for (d = n; ++h < l.length; )
    // Find a void token that includes a break.
    l[h][0] === "exit" && l[h - 1][0] === "enter" && l[h][1].type === l[h - 1][1].type && l[h][1].start.line !== l[h][1].end.line && (g = h + 1, x.push(g), d._tokenizer = void 0, d.previous = void 0, d = d.next);
  for (s.events = [], d ? (d._tokenizer = void 0, d.previous = void 0) : x.pop(), h = x.length; h--; ) {
    const w = l.slice(x[h], x[h + 1]), L = o.pop();
    a.push([L, L + w.length - 1]), t.splice(L, 2, w);
  }
  for (a.reverse(), h = -1; ++h < a.length; )
    u[p + a[h][0]] = p + a[h][1], p += a[h][1] - a[h][0] - 1;
  return u;
}
const wb = {
  resolve: Cb,
  tokenize: Sb
}, xb = {
  partial: !0,
  tokenize: Mb
};
function Cb(t) {
  return np(t), t;
}
function Sb(t, e) {
  let n;
  return r;
  function r(l) {
    return t.enter("content"), n = t.enter("chunkContent", {
      contentType: "content"
    }), i(l);
  }
  function i(l) {
    return l === null ? o(l) : G(l) ? t.check(xb, s, o)(l) : (t.consume(l), i);
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
function Mb(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return t.exit("chunkContent"), t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), ue(t, o, "linePrefix");
  }
  function o(s) {
    if (s === null || G(s))
      return n(s);
    const l = r.events[r.events.length - 1];
    return !r.parser.constructs.disable.null.includes("codeIndented") && l && l[1].type === "linePrefix" && l[2].sliceSerialize(l[1], !0).length >= 4 ? e(s) : t.interrupt(r.parser.constructs.flow, n, e)(s);
  }
}
function rp(t, e, n, r, i, o, s, l, a) {
  const u = a || Number.POSITIVE_INFINITY;
  let c = 0;
  return f;
  function f(w) {
    return w === 60 ? (t.enter(r), t.enter(i), t.enter(o), t.consume(w), t.exit(o), h) : w === null || w === 32 || w === 41 || _s(w) ? n(w) : (t.enter(r), t.enter(s), t.enter(l), t.enter("chunkString", {
      contentType: "string"
    }), g(w));
  }
  function h(w) {
    return w === 62 ? (t.enter(o), t.consume(w), t.exit(o), t.exit(i), t.exit(r), e) : (t.enter(l), t.enter("chunkString", {
      contentType: "string"
    }), d(w));
  }
  function d(w) {
    return w === 62 ? (t.exit("chunkString"), t.exit(l), h(w)) : w === null || w === 60 || G(w) ? n(w) : (t.consume(w), w === 92 ? p : d);
  }
  function p(w) {
    return w === 60 || w === 62 || w === 92 ? (t.consume(w), d) : d(w);
  }
  function g(w) {
    return !c && (w === null || w === 41 || be(w)) ? (t.exit("chunkString"), t.exit(l), t.exit(s), t.exit(r), e(w)) : c < u && w === 40 ? (t.consume(w), c++, g) : w === 41 ? (t.consume(w), c--, g) : w === null || w === 32 || w === 40 || _s(w) ? n(w) : (t.consume(w), w === 92 ? x : g);
  }
  function x(w) {
    return w === 40 || w === 41 || w === 92 ? (t.consume(w), g) : g(w);
  }
}
function ip(t, e, n, r, i, o) {
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
    d === 94 && !l && "_hiddenFootnoteSupport" in s.parser.constructs ? n(d) : d === 93 ? (t.exit(o), t.enter(i), t.consume(d), t.exit(i), t.exit(r), e) : G(d) ? (t.enter("lineEnding"), t.consume(d), t.exit("lineEnding"), c) : (t.enter("chunkString", {
      contentType: "string"
    }), f(d));
  }
  function f(d) {
    return d === null || d === 91 || d === 93 || G(d) || l++ > 999 ? (t.exit("chunkString"), c(d)) : (t.consume(d), a || (a = !le(d)), d === 92 ? h : f);
  }
  function h(d) {
    return d === 91 || d === 92 || d === 93 ? (t.consume(d), l++, f) : f(d);
  }
}
function op(t, e, n, r, i, o) {
  let s;
  return l;
  function l(h) {
    return h === 34 || h === 39 || h === 40 ? (t.enter(r), t.enter(i), t.consume(h), t.exit(i), s = h === 40 ? 41 : h, a) : n(h);
  }
  function a(h) {
    return h === s ? (t.enter(i), t.consume(h), t.exit(i), t.exit(r), e) : (t.enter(o), u(h));
  }
  function u(h) {
    return h === s ? (t.exit(o), a(s)) : h === null ? n(h) : G(h) ? (t.enter("lineEnding"), t.consume(h), t.exit("lineEnding"), ue(t, u, "linePrefix")) : (t.enter("chunkString", {
      contentType: "string"
    }), c(h));
  }
  function c(h) {
    return h === s || h === null || G(h) ? (t.exit("chunkString"), u(h)) : (t.consume(h), h === 92 ? f : c);
  }
  function f(h) {
    return h === s || h === 92 ? (t.consume(h), c) : c(h);
  }
}
function ro(t, e) {
  let n;
  return r;
  function r(i) {
    return G(i) ? (t.enter("lineEnding"), t.consume(i), t.exit("lineEnding"), n = !0, r) : le(i) ? ue(t, r, n ? "linePrefix" : "lineSuffix")(i) : e(i);
  }
}
const vb = {
  name: "definition",
  tokenize: Nb
}, Tb = {
  partial: !0,
  tokenize: Ib
};
function Nb(t, e, n) {
  const r = this;
  let i;
  return o;
  function o(d) {
    return t.enter("definition"), s(d);
  }
  function s(d) {
    return ip.call(
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
    return i = Vt(r.sliceSerialize(r.events[r.events.length - 1][1]).slice(1, -1)), d === 58 ? (t.enter("definitionMarker"), t.consume(d), t.exit("definitionMarker"), a) : n(d);
  }
  function a(d) {
    return be(d) ? ro(t, u)(d) : u(d);
  }
  function u(d) {
    return rp(
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
    return t.attempt(Tb, f, f)(d);
  }
  function f(d) {
    return le(d) ? ue(t, h, "whitespace")(d) : h(d);
  }
  function h(d) {
    return d === null || G(d) ? (t.exit("definition"), r.parser.defined.push(i), e(d)) : n(d);
  }
}
function Ib(t, e, n) {
  return r;
  function r(l) {
    return be(l) ? ro(t, i)(l) : n(l);
  }
  function i(l) {
    return op(t, o, n, "definitionTitle", "definitionTitleMarker", "definitionTitleString")(l);
  }
  function o(l) {
    return le(l) ? ue(t, s, "whitespace")(l) : s(l);
  }
  function s(l) {
    return l === null || G(l) ? e(l) : n(l);
  }
}
const Ab = {
  name: "hardBreakEscape",
  tokenize: Eb
};
function Eb(t, e, n) {
  return r;
  function r(o) {
    return t.enter("hardBreakEscape"), t.consume(o), i;
  }
  function i(o) {
    return G(o) ? (t.exit("hardBreakEscape"), e(o)) : n(o);
  }
}
const Ob = {
  name: "headingAtx",
  resolve: Db,
  tokenize: Rb
};
function Db(t, e) {
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
  }, Ct(t, r, n - r + 1, [["enter", i, e], ["enter", o, e], ["exit", o, e], ["exit", i, e]])), t;
}
function Rb(t, e, n) {
  let r = 0;
  return i;
  function i(c) {
    return t.enter("atxHeading"), o(c);
  }
  function o(c) {
    return t.enter("atxHeadingSequence"), s(c);
  }
  function s(c) {
    return c === 35 && r++ < 6 ? (t.consume(c), s) : c === null || be(c) ? (t.exit("atxHeadingSequence"), l(c)) : n(c);
  }
  function l(c) {
    return c === 35 ? (t.enter("atxHeadingSequence"), a(c)) : c === null || G(c) ? (t.exit("atxHeading"), e(c)) : le(c) ? ue(t, l, "whitespace")(c) : (t.enter("atxHeadingText"), u(c));
  }
  function a(c) {
    return c === 35 ? (t.consume(c), a) : (t.exit("atxHeadingSequence"), l(c));
  }
  function u(c) {
    return c === null || c === 35 || be(c) ? (t.exit("atxHeadingText"), l(c)) : (t.consume(c), u);
  }
}
const Lb = [
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
], Pf = ["pre", "script", "style", "textarea"], Pb = {
  concrete: !0,
  name: "htmlFlow",
  resolveTo: Fb,
  tokenize: $b
}, zb = {
  partial: !0,
  tokenize: Vb
}, Bb = {
  partial: !0,
  tokenize: _b
};
function Fb(t) {
  let e = t.length;
  for (; e-- && !(t[e][0] === "enter" && t[e][1].type === "htmlFlow"); )
    ;
  return e > 1 && t[e - 2][1].type === "linePrefix" && (t[e][1].start = t[e - 2][1].start, t[e + 1][1].start = t[e - 2][1].start, t.splice(e - 2, 2)), t;
}
function $b(t, e, n) {
  const r = this;
  let i, o, s, l, a;
  return u;
  function u(b) {
    return c(b);
  }
  function c(b) {
    return t.enter("htmlFlow"), t.enter("htmlFlowData"), t.consume(b), f;
  }
  function f(b) {
    return b === 33 ? (t.consume(b), h) : b === 47 ? (t.consume(b), o = !0, g) : b === 63 ? (t.consume(b), i = 3, r.interrupt ? e : C) : nt(b) ? (t.consume(b), s = String.fromCharCode(b), x) : n(b);
  }
  function h(b) {
    return b === 45 ? (t.consume(b), i = 2, d) : b === 91 ? (t.consume(b), i = 5, l = 0, p) : nt(b) ? (t.consume(b), i = 4, r.interrupt ? e : C) : n(b);
  }
  function d(b) {
    return b === 45 ? (t.consume(b), r.interrupt ? e : C) : n(b);
  }
  function p(b) {
    const ve = "CDATA[";
    return b === ve.charCodeAt(l++) ? (t.consume(b), l === ve.length ? r.interrupt ? e : K : p) : n(b);
  }
  function g(b) {
    return nt(b) ? (t.consume(b), s = String.fromCharCode(b), x) : n(b);
  }
  function x(b) {
    if (b === null || b === 47 || b === 62 || be(b)) {
      const ve = b === 47, Ze = s.toLowerCase();
      return !ve && !o && Pf.includes(Ze) ? (i = 1, r.interrupt ? e(b) : K(b)) : Lb.includes(s.toLowerCase()) ? (i = 6, ve ? (t.consume(b), w) : r.interrupt ? e(b) : K(b)) : (i = 7, r.interrupt && !r.parser.lazy[r.now().line] ? n(b) : o ? L(b) : A(b));
    }
    return b === 45 || ft(b) ? (t.consume(b), s += String.fromCharCode(b), x) : n(b);
  }
  function w(b) {
    return b === 62 ? (t.consume(b), r.interrupt ? e : K) : n(b);
  }
  function L(b) {
    return le(b) ? (t.consume(b), L) : N(b);
  }
  function A(b) {
    return b === 47 ? (t.consume(b), N) : b === 58 || b === 95 || nt(b) ? (t.consume(b), j) : le(b) ? (t.consume(b), A) : N(b);
  }
  function j(b) {
    return b === 45 || b === 46 || b === 58 || b === 95 || ft(b) ? (t.consume(b), j) : H(b);
  }
  function H(b) {
    return b === 61 ? (t.consume(b), M) : le(b) ? (t.consume(b), H) : A(b);
  }
  function M(b) {
    return b === null || b === 60 || b === 61 || b === 62 || b === 96 ? n(b) : b === 34 || b === 39 ? (t.consume(b), a = b, P) : le(b) ? (t.consume(b), M) : F(b);
  }
  function P(b) {
    return b === a ? (t.consume(b), a = null, J) : b === null || G(b) ? n(b) : (t.consume(b), P);
  }
  function F(b) {
    return b === null || b === 34 || b === 39 || b === 47 || b === 60 || b === 61 || b === 62 || b === 96 || be(b) ? H(b) : (t.consume(b), F);
  }
  function J(b) {
    return b === 47 || b === 62 || le(b) ? A(b) : n(b);
  }
  function N(b) {
    return b === 62 ? (t.consume(b), U) : n(b);
  }
  function U(b) {
    return b === null || G(b) ? K(b) : le(b) ? (t.consume(b), U) : n(b);
  }
  function K(b) {
    return b === 45 && i === 2 ? (t.consume(b), re) : b === 60 && i === 1 ? (t.consume(b), we) : b === 62 && i === 4 ? (t.consume(b), oe) : b === 63 && i === 3 ? (t.consume(b), C) : b === 93 && i === 5 ? (t.consume(b), qe) : G(b) && (i === 6 || i === 7) ? (t.exit("htmlFlowData"), t.check(zb, Fe, ne)(b)) : b === null || G(b) ? (t.exit("htmlFlowData"), ne(b)) : (t.consume(b), K);
  }
  function ne(b) {
    return t.check(Bb, de, Fe)(b);
  }
  function de(b) {
    return t.enter("lineEnding"), t.consume(b), t.exit("lineEnding"), ie;
  }
  function ie(b) {
    return b === null || G(b) ? ne(b) : (t.enter("htmlFlowData"), K(b));
  }
  function re(b) {
    return b === 45 ? (t.consume(b), C) : K(b);
  }
  function we(b) {
    return b === 47 ? (t.consume(b), s = "", We) : K(b);
  }
  function We(b) {
    if (b === 62) {
      const ve = s.toLowerCase();
      return Pf.includes(ve) ? (t.consume(b), oe) : K(b);
    }
    return nt(b) && s.length < 8 ? (t.consume(b), s += String.fromCharCode(b), We) : K(b);
  }
  function qe(b) {
    return b === 93 ? (t.consume(b), C) : K(b);
  }
  function C(b) {
    return b === 62 ? (t.consume(b), oe) : b === 45 && i === 2 ? (t.consume(b), C) : K(b);
  }
  function oe(b) {
    return b === null || G(b) ? (t.exit("htmlFlowData"), Fe(b)) : (t.consume(b), oe);
  }
  function Fe(b) {
    return t.exit("htmlFlow"), e(b);
  }
}
function _b(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return G(s) ? (t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), o) : n(s);
  }
  function o(s) {
    return r.parser.lazy[r.now().line] ? n(s) : e(s);
  }
}
function Vb(t, e, n) {
  return r;
  function r(i) {
    return t.enter("lineEnding"), t.consume(i), t.exit("lineEnding"), t.attempt(Jo, e, n);
  }
}
const Hb = {
  name: "htmlText",
  tokenize: jb
};
function jb(t, e, n) {
  const r = this;
  let i, o, s;
  return l;
  function l(C) {
    return t.enter("htmlText"), t.enter("htmlTextData"), t.consume(C), a;
  }
  function a(C) {
    return C === 33 ? (t.consume(C), u) : C === 47 ? (t.consume(C), H) : C === 63 ? (t.consume(C), A) : nt(C) ? (t.consume(C), F) : n(C);
  }
  function u(C) {
    return C === 45 ? (t.consume(C), c) : C === 91 ? (t.consume(C), o = 0, p) : nt(C) ? (t.consume(C), L) : n(C);
  }
  function c(C) {
    return C === 45 ? (t.consume(C), d) : n(C);
  }
  function f(C) {
    return C === null ? n(C) : C === 45 ? (t.consume(C), h) : G(C) ? (s = f, we(C)) : (t.consume(C), f);
  }
  function h(C) {
    return C === 45 ? (t.consume(C), d) : f(C);
  }
  function d(C) {
    return C === 62 ? re(C) : C === 45 ? h(C) : f(C);
  }
  function p(C) {
    const oe = "CDATA[";
    return C === oe.charCodeAt(o++) ? (t.consume(C), o === oe.length ? g : p) : n(C);
  }
  function g(C) {
    return C === null ? n(C) : C === 93 ? (t.consume(C), x) : G(C) ? (s = g, we(C)) : (t.consume(C), g);
  }
  function x(C) {
    return C === 93 ? (t.consume(C), w) : g(C);
  }
  function w(C) {
    return C === 62 ? re(C) : C === 93 ? (t.consume(C), w) : g(C);
  }
  function L(C) {
    return C === null || C === 62 ? re(C) : G(C) ? (s = L, we(C)) : (t.consume(C), L);
  }
  function A(C) {
    return C === null ? n(C) : C === 63 ? (t.consume(C), j) : G(C) ? (s = A, we(C)) : (t.consume(C), A);
  }
  function j(C) {
    return C === 62 ? re(C) : A(C);
  }
  function H(C) {
    return nt(C) ? (t.consume(C), M) : n(C);
  }
  function M(C) {
    return C === 45 || ft(C) ? (t.consume(C), M) : P(C);
  }
  function P(C) {
    return G(C) ? (s = P, we(C)) : le(C) ? (t.consume(C), P) : re(C);
  }
  function F(C) {
    return C === 45 || ft(C) ? (t.consume(C), F) : C === 47 || C === 62 || be(C) ? J(C) : n(C);
  }
  function J(C) {
    return C === 47 ? (t.consume(C), re) : C === 58 || C === 95 || nt(C) ? (t.consume(C), N) : G(C) ? (s = J, we(C)) : le(C) ? (t.consume(C), J) : re(C);
  }
  function N(C) {
    return C === 45 || C === 46 || C === 58 || C === 95 || ft(C) ? (t.consume(C), N) : U(C);
  }
  function U(C) {
    return C === 61 ? (t.consume(C), K) : G(C) ? (s = U, we(C)) : le(C) ? (t.consume(C), U) : J(C);
  }
  function K(C) {
    return C === null || C === 60 || C === 61 || C === 62 || C === 96 ? n(C) : C === 34 || C === 39 ? (t.consume(C), i = C, ne) : G(C) ? (s = K, we(C)) : le(C) ? (t.consume(C), K) : (t.consume(C), de);
  }
  function ne(C) {
    return C === i ? (t.consume(C), i = void 0, ie) : C === null ? n(C) : G(C) ? (s = ne, we(C)) : (t.consume(C), ne);
  }
  function de(C) {
    return C === null || C === 34 || C === 39 || C === 60 || C === 61 || C === 96 ? n(C) : C === 47 || C === 62 || be(C) ? J(C) : (t.consume(C), de);
  }
  function ie(C) {
    return C === 47 || C === 62 || be(C) ? J(C) : n(C);
  }
  function re(C) {
    return C === 62 ? (t.consume(C), t.exit("htmlTextData"), t.exit("htmlText"), e) : n(C);
  }
  function we(C) {
    return t.exit("htmlTextData"), t.enter("lineEnding"), t.consume(C), t.exit("lineEnding"), We;
  }
  function We(C) {
    return le(C) ? ue(t, qe, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(C) : qe(C);
  }
  function qe(C) {
    return t.enter("htmlTextData"), s(C);
  }
}
const Su = {
  name: "labelEnd",
  resolveAll: Ub,
  resolveTo: Jb,
  tokenize: Gb
}, Wb = {
  tokenize: Yb
}, qb = {
  tokenize: Qb
}, Kb = {
  tokenize: Xb
};
function Ub(t) {
  let e = -1;
  const n = [];
  for (; ++e < t.length; ) {
    const r = t[e][1];
    if (n.push(t[e]), r.type === "labelImage" || r.type === "labelLink" || r.type === "labelEnd") {
      const i = r.type === "labelImage" ? 4 : 2;
      r.type = "data", e += i;
    }
  }
  return t.length !== n.length && Ct(t, 0, t.length, n), t;
}
function Jb(t, e) {
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
  return l = [["enter", a, e], ["enter", u, e]], l = Et(l, t.slice(o + 1, o + r + 3)), l = Et(l, [["enter", c, e]]), l = Et(l, al(e.parser.constructs.insideSpan.null, t.slice(o + r + 4, s - 3), e)), l = Et(l, [["exit", c, e], t[s - 2], t[s - 1], ["exit", u, e]]), l = Et(l, t.slice(s + 1)), l = Et(l, [["exit", a, e]]), Ct(t, o, t.length, l), t;
}
function Gb(t, e, n) {
  const r = this;
  let i = r.events.length, o, s;
  for (; i--; )
    if ((r.events[i][1].type === "labelImage" || r.events[i][1].type === "labelLink") && !r.events[i][1]._balanced) {
      o = r.events[i][1];
      break;
    }
  return l;
  function l(h) {
    return o ? o._inactive ? f(h) : (s = r.parser.defined.includes(Vt(r.sliceSerialize({
      start: o.end,
      end: r.now()
    }))), t.enter("labelEnd"), t.enter("labelMarker"), t.consume(h), t.exit("labelMarker"), t.exit("labelEnd"), a) : n(h);
  }
  function a(h) {
    return h === 40 ? t.attempt(Wb, c, s ? c : f)(h) : h === 91 ? t.attempt(qb, c, s ? u : f)(h) : s ? c(h) : f(h);
  }
  function u(h) {
    return t.attempt(Kb, c, f)(h);
  }
  function c(h) {
    return e(h);
  }
  function f(h) {
    return o._balanced = !0, n(h);
  }
}
function Yb(t, e, n) {
  return r;
  function r(f) {
    return t.enter("resource"), t.enter("resourceMarker"), t.consume(f), t.exit("resourceMarker"), i;
  }
  function i(f) {
    return be(f) ? ro(t, o)(f) : o(f);
  }
  function o(f) {
    return f === 41 ? c(f) : rp(t, s, l, "resourceDestination", "resourceDestinationLiteral", "resourceDestinationLiteralMarker", "resourceDestinationRaw", "resourceDestinationString", 32)(f);
  }
  function s(f) {
    return be(f) ? ro(t, a)(f) : c(f);
  }
  function l(f) {
    return n(f);
  }
  function a(f) {
    return f === 34 || f === 39 || f === 40 ? op(t, u, n, "resourceTitle", "resourceTitleMarker", "resourceTitleString")(f) : c(f);
  }
  function u(f) {
    return be(f) ? ro(t, c)(f) : c(f);
  }
  function c(f) {
    return f === 41 ? (t.enter("resourceMarker"), t.consume(f), t.exit("resourceMarker"), t.exit("resource"), e) : n(f);
  }
}
function Qb(t, e, n) {
  const r = this;
  return i;
  function i(l) {
    return ip.call(r, t, o, s, "reference", "referenceMarker", "referenceString")(l);
  }
  function o(l) {
    return r.parser.defined.includes(Vt(r.sliceSerialize(r.events[r.events.length - 1][1]).slice(1, -1))) ? e(l) : n(l);
  }
  function s(l) {
    return n(l);
  }
}
function Xb(t, e, n) {
  return r;
  function r(o) {
    return t.enter("reference"), t.enter("referenceMarker"), t.consume(o), t.exit("referenceMarker"), i;
  }
  function i(o) {
    return o === 93 ? (t.enter("referenceMarker"), t.consume(o), t.exit("referenceMarker"), t.exit("reference"), e) : n(o);
  }
}
const Zb = {
  name: "labelStartImage",
  resolveAll: Su.resolveAll,
  tokenize: e1
};
function e1(t, e, n) {
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
const t1 = {
  name: "labelStartLink",
  resolveAll: Su.resolveAll,
  tokenize: n1
};
function n1(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return t.enter("labelLink"), t.enter("labelMarker"), t.consume(s), t.exit("labelMarker"), t.exit("labelLink"), o;
  }
  function o(s) {
    return s === 94 && "_hiddenFootnoteSupport" in r.parser.constructs ? n(s) : e(s);
  }
}
const El = {
  name: "lineEnding",
  tokenize: r1
};
function r1(t, e) {
  return n;
  function n(r) {
    return t.enter("lineEnding"), t.consume(r), t.exit("lineEnding"), ue(t, e, "linePrefix");
  }
}
const vs = {
  name: "thematicBreak",
  tokenize: i1
};
function i1(t, e, n) {
  let r = 0, i;
  return o;
  function o(u) {
    return t.enter("thematicBreak"), s(u);
  }
  function s(u) {
    return i = u, l(u);
  }
  function l(u) {
    return u === i ? (t.enter("thematicBreakSequence"), a(u)) : r >= 3 && (u === null || G(u)) ? (t.exit("thematicBreak"), e(u)) : n(u);
  }
  function a(u) {
    return u === i ? (t.consume(u), r++, a) : (t.exit("thematicBreakSequence"), le(u) ? ue(t, l, "whitespace")(u) : l(u));
  }
}
const at = {
  continuation: {
    tokenize: a1
  },
  exit: c1,
  name: "list",
  tokenize: l1
}, o1 = {
  partial: !0,
  tokenize: f1
}, s1 = {
  partial: !0,
  tokenize: u1
};
function l1(t, e, n) {
  const r = this, i = r.events[r.events.length - 1];
  let o = i && i[1].type === "linePrefix" ? i[2].sliceSerialize(i[1], !0).length : 0, s = 0;
  return l;
  function l(d) {
    const p = r.containerState.type || (d === 42 || d === 43 || d === 45 ? "listUnordered" : "listOrdered");
    if (p === "listUnordered" ? !r.containerState.marker || d === r.containerState.marker : Ea(d)) {
      if (r.containerState.type || (r.containerState.type = p, t.enter(p, {
        _container: !0
      })), p === "listUnordered")
        return t.enter("listItemPrefix"), d === 42 || d === 45 ? t.check(vs, n, u)(d) : u(d);
      if (!r.interrupt || d === 49)
        return t.enter("listItemPrefix"), t.enter("listItemValue"), a(d);
    }
    return n(d);
  }
  function a(d) {
    return Ea(d) && ++s < 10 ? (t.consume(d), a) : (!r.interrupt || s < 2) && (r.containerState.marker ? d === r.containerState.marker : d === 41 || d === 46) ? (t.exit("listItemValue"), u(d)) : n(d);
  }
  function u(d) {
    return t.enter("listItemMarker"), t.consume(d), t.exit("listItemMarker"), r.containerState.marker = r.containerState.marker || d, t.check(
      Jo,
      // Can’t be empty when interrupting.
      r.interrupt ? n : c,
      t.attempt(o1, h, f)
    );
  }
  function c(d) {
    return r.containerState.initialBlankLine = !0, o++, h(d);
  }
  function f(d) {
    return le(d) ? (t.enter("listItemPrefixWhitespace"), t.consume(d), t.exit("listItemPrefixWhitespace"), h) : n(d);
  }
  function h(d) {
    return r.containerState.size = o + r.sliceSerialize(t.exit("listItemPrefix"), !0).length, e(d);
  }
}
function a1(t, e, n) {
  const r = this;
  return r.containerState._closeFlow = void 0, t.check(Jo, i, o);
  function i(l) {
    return r.containerState.furtherBlankLines = r.containerState.furtherBlankLines || r.containerState.initialBlankLine, ue(t, e, "listItemIndent", r.containerState.size + 1)(l);
  }
  function o(l) {
    return r.containerState.furtherBlankLines || !le(l) ? (r.containerState.furtherBlankLines = void 0, r.containerState.initialBlankLine = void 0, s(l)) : (r.containerState.furtherBlankLines = void 0, r.containerState.initialBlankLine = void 0, t.attempt(s1, e, s)(l));
  }
  function s(l) {
    return r.containerState._closeFlow = !0, r.interrupt = void 0, ue(t, t.attempt(at, e, n), "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(l);
  }
}
function u1(t, e, n) {
  const r = this;
  return ue(t, i, "listItemIndent", r.containerState.size + 1);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return s && s[1].type === "listItemIndent" && s[2].sliceSerialize(s[1], !0).length === r.containerState.size ? e(o) : n(o);
  }
}
function c1(t) {
  t.exit(this.containerState.type);
}
function f1(t, e, n) {
  const r = this;
  return ue(t, i, "listItemPrefixWhitespace", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 5);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return !le(o) && s && s[1].type === "listItemPrefixWhitespace" ? e(o) : n(o);
  }
}
const zf = {
  name: "setextUnderline",
  resolveTo: h1,
  tokenize: d1
};
function h1(t, e) {
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
function d1(t, e, n) {
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
    return u === i ? (t.consume(u), l) : (t.exit("setextHeadingLineSequence"), le(u) ? ue(t, a, "lineSuffix")(u) : a(u));
  }
  function a(u) {
    return u === null || G(u) ? (t.exit("setextHeadingLine"), e(u)) : n(u);
  }
}
const p1 = {
  tokenize: m1
};
function m1(t) {
  const e = this, n = t.attempt(
    // Try to parse a blank line.
    Jo,
    r,
    // Try to parse initial flow (essentially, only code).
    t.attempt(this.parser.constructs.flowInitial, i, ue(t, t.attempt(this.parser.constructs.flow, i, t.attempt(wb, i)), "linePrefix"))
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
const g1 = {
  resolveAll: lp()
}, y1 = sp("string"), k1 = sp("text");
function sp(t) {
  return {
    resolveAll: lp(t === "text" ? b1 : void 0),
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
function lp(t) {
  return e;
  function e(n, r) {
    let i = -1, o;
    for (; ++i <= n.length; )
      o === void 0 ? n[i] && n[i][1].type === "data" && (o = i, i++) : (!n[i] || n[i][1].type !== "data") && (i !== o + 2 && (n[o][1].end = n[i - 1][1].end, n.splice(o + 2, i - o - 2), i = o + 2), o = void 0);
    return t ? t(n, r) : n;
  }
}
function b1(t, e) {
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
const w1 = {
  42: at,
  43: at,
  45: at,
  48: at,
  49: at,
  50: at,
  51: at,
  52: at,
  53: at,
  54: at,
  55: at,
  56: at,
  57: at,
  62: Zd
}, x1 = {
  91: vb
}, C1 = {
  [-2]: Al,
  [-1]: Al,
  32: Al
}, S1 = {
  35: Ob,
  42: vs,
  45: [zf, vs],
  60: Pb,
  61: zf,
  95: vs,
  96: Lf,
  126: Lf
}, M1 = {
  38: tp,
  92: ep
}, v1 = {
  [-5]: El,
  [-4]: El,
  [-3]: El,
  33: Zb,
  38: tp,
  42: Oa,
  60: [tb, Hb],
  91: t1,
  92: [Ab, ep],
  93: Su,
  95: Oa,
  96: pb
}, T1 = {
  null: [Oa, g1]
}, N1 = {
  null: [42, 95]
}, I1 = {
  null: []
}, A1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  attentionMarkers: N1,
  contentInitial: x1,
  disable: I1,
  document: w1,
  flow: S1,
  flowInitial: C1,
  insideSpan: T1,
  string: M1,
  text: v1
}, Symbol.toStringTag, { value: "Module" }));
function E1(t, e, n) {
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
    attempt: P(H),
    check: P(M),
    consume: L,
    enter: A,
    exit: j,
    interrupt: P(M, {
      interrupt: !0
    })
  }, u = {
    code: null,
    containerState: {},
    defineSkip: g,
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
  function f(U) {
    return s = Et(s, U), x(), s[s.length - 1] !== null ? [] : (F(e, 0), u.events = al(o, u.events, u), u.events);
  }
  function h(U, K) {
    return D1(d(U), K);
  }
  function d(U) {
    return O1(s, U);
  }
  function p() {
    const {
      _bufferIndex: U,
      _index: K,
      line: ne,
      column: de,
      offset: ie
    } = r;
    return {
      _bufferIndex: U,
      _index: K,
      line: ne,
      column: de,
      offset: ie
    };
  }
  function g(U) {
    i[U.line] = U.column, N();
  }
  function x() {
    let U;
    for (; r._index < s.length; ) {
      const K = s[r._index];
      if (typeof K == "string")
        for (U = r._index, r._bufferIndex < 0 && (r._bufferIndex = 0); r._index === U && r._bufferIndex < K.length; )
          w(K.charCodeAt(r._bufferIndex));
      else
        w(K);
    }
  }
  function w(U) {
    c = c(U);
  }
  function L(U) {
    G(U) ? (r.line++, r.column = 1, r.offset += U === -3 ? 2 : 1, N()) : U !== -1 && (r.column++, r.offset++), r._bufferIndex < 0 ? r._index++ : (r._bufferIndex++, r._bufferIndex === // Points w/ non-negative `_bufferIndex` reference
    // strings.
    /** @type {string} */
    s[r._index].length && (r._bufferIndex = -1, r._index++)), u.previous = U;
  }
  function A(U, K) {
    const ne = K || {};
    return ne.type = U, ne.start = p(), u.events.push(["enter", ne, u]), l.push(ne), ne;
  }
  function j(U) {
    const K = l.pop();
    return K.end = p(), u.events.push(["exit", K, u]), K;
  }
  function H(U, K) {
    F(U, K.from);
  }
  function M(U, K) {
    K.restore();
  }
  function P(U, K) {
    return ne;
    function ne(de, ie, re) {
      let we, We, qe, C;
      return Array.isArray(de) ? (
        /* c8 ignore next 1 */
        Fe(de)
      ) : "tokenize" in de ? (
        // Looks like a construct.
        Fe([
          /** @type {Construct} */
          de
        ])
      ) : oe(de);
      function oe(pe) {
        return jt;
        function jt(st) {
          const In = st !== null && pe[st], yt = st !== null && pe.null, De = [
            // To do: add more extension tests.
            /* c8 ignore next 2 */
            ...Array.isArray(In) ? In : In ? [In] : [],
            ...Array.isArray(yt) ? yt : yt ? [yt] : []
          ];
          return Fe(De)(st);
        }
      }
      function Fe(pe) {
        return we = pe, We = 0, pe.length === 0 ? re : b(pe[We]);
      }
      function b(pe) {
        return jt;
        function jt(st) {
          return C = J(), qe = pe, pe.partial || (u.currentConstruct = pe), pe.name && u.parser.constructs.disable.null.includes(pe.name) ? Ze() : pe.tokenize.call(
            // If we do have fields, create an object w/ `context` as its
            // prototype.
            // This allows a “live binding”, which is needed for `interrupt`.
            K ? Object.assign(Object.create(u), K) : u,
            a,
            ve,
            Ze
          )(st);
        }
      }
      function ve(pe) {
        return U(qe, C), ie;
      }
      function Ze(pe) {
        return C.restore(), ++We < we.length ? b(we[We]) : re;
      }
    }
  }
  function F(U, K) {
    U.resolveAll && !o.includes(U) && o.push(U), U.resolve && Ct(u.events, K, u.events.length - K, U.resolve(u.events.slice(K), u)), U.resolveTo && (u.events = U.resolveTo(u.events, u));
  }
  function J() {
    const U = p(), K = u.previous, ne = u.currentConstruct, de = u.events.length, ie = Array.from(l);
    return {
      from: de,
      restore: re
    };
    function re() {
      r = U, u.previous = K, u.currentConstruct = ne, u.events.length = de, l = ie, N();
    }
  }
  function N() {
    r.line in i && r.column < 2 && (r.column = i[r.line], r.offset += i[r.line] - 1);
  }
}
function O1(t, e) {
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
function D1(t, e) {
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
function R1(t) {
  const r = {
    constructs: (
      /** @type {FullNormalizedExtension} */
      Qd([A1, ...(t || {}).extensions || []])
    ),
    content: i(Jk),
    defined: [],
    document: i(Yk),
    flow: i(p1),
    lazy: {},
    string: i(y1),
    text: i(k1)
  };
  return r;
  function i(o) {
    return s;
    function s(l) {
      return E1(r, o, l);
    }
  }
}
function L1(t) {
  for (; !np(t); )
    ;
  return t;
}
const Bf = /[\0\t\n\r]/g;
function P1() {
  let t = 1, e = "", n = !0, r;
  return i;
  function i(o, s, l) {
    const a = [];
    let u, c, f, h, d;
    for (o = e + (typeof o == "string" ? o.toString() : new TextDecoder(s || void 0).decode(o)), f = 0, e = "", n && (o.charCodeAt(0) === 65279 && f++, n = void 0); f < o.length; ) {
      if (Bf.lastIndex = f, u = Bf.exec(o), h = u && u.index !== void 0 ? u.index : o.length, d = o.charCodeAt(h), !u) {
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
const z1 = /\\([!-/:-@[-`{-~])|&(#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});/gi;
function ap(t) {
  return t.replace(z1, B1);
}
function B1(t, e, n) {
  if (e)
    return e;
  if (n.charCodeAt(0) === 35) {
    const i = n.charCodeAt(1), o = i === 120 || i === 88;
    return Xd(n.slice(o ? 2 : 1), o ? 16 : 10);
  }
  return Cu(n) || t;
}
function io(t) {
  return !t || typeof t != "object" ? "" : "position" in t || "type" in t ? Ff(t.position) : "start" in t || "end" in t ? Ff(t) : "line" in t || "column" in t ? Da(t) : "";
}
function Da(t) {
  return $f(t && t.line) + ":" + $f(t && t.column);
}
function Ff(t) {
  return Da(t && t.start) + "-" + Da(t && t.end);
}
function $f(t) {
  return t && typeof t == "number" ? t : 1;
}
const up = {}.hasOwnProperty;
function Mu(t, e, n) {
  return e && typeof e == "object" && (n = e, e = void 0), F1(n)(L1(R1(n).document().write(P1()(t, e, !0))));
}
function F1(t) {
  const e = {
    transforms: [],
    canContainEols: ["emphasis", "fragment", "heading", "paragraph", "strong"],
    enter: {
      autolink: o(Ki),
      autolinkProtocol: J,
      autolinkEmail: J,
      atxHeading: o(_r),
      blockQuote: o(yt),
      characterEscape: J,
      characterReference: J,
      codeFenced: o(De),
      codeFencedFenceInfo: s,
      codeFencedFenceMeta: s,
      codeIndented: o(De, s),
      codeText: o(Cl, s),
      codeTextData: J,
      data: J,
      codeFlowValue: J,
      definition: o(hs),
      definitionDestinationString: s,
      definitionLabelString: s,
      definitionTitleString: s,
      emphasis: o(Ke),
      hardBreakEscape: o(qi),
      hardBreakTrailing: o(qi),
      htmlFlow: o(fe, s),
      htmlFlowData: J,
      htmlText: o(fe, s),
      htmlTextData: J,
      image: o(Vr),
      label: s,
      link: o(Ki),
      listItem: o(Sl),
      listItemValue: h,
      listOrdered: o(Hr, f),
      listUnordered: o(Hr),
      paragraph: o(tr),
      reference: b,
      referenceString: s,
      resourceDestinationString: s,
      resourceTitleString: s,
      setextHeading: o(_r),
      strong: o(Wt),
      thematicBreak: o(jr)
    },
    exit: {
      atxHeading: a(),
      atxHeadingSequence: H,
      autolink: a(),
      autolinkEmail: In,
      autolinkProtocol: st,
      blockQuote: a(),
      characterEscapeValue: N,
      characterReferenceMarkerHexadecimal: Ze,
      characterReferenceMarkerNumeric: Ze,
      characterReferenceValue: pe,
      characterReference: jt,
      codeFenced: a(x),
      codeFencedFence: g,
      codeFencedFenceInfo: d,
      codeFencedFenceMeta: p,
      codeFlowValue: N,
      codeIndented: a(w),
      codeText: a(ie),
      codeTextData: N,
      data: N,
      definition: a(),
      definitionDestinationString: j,
      definitionLabelString: L,
      definitionTitleString: A,
      emphasis: a(),
      hardBreakEscape: a(K),
      hardBreakTrailing: a(K),
      htmlFlow: a(ne),
      htmlFlowData: N,
      htmlText: a(de),
      htmlTextData: N,
      image: a(we),
      label: qe,
      labelText: We,
      lineEnding: U,
      link: a(re),
      listItem: a(),
      listOrdered: a(),
      listUnordered: a(),
      paragraph: a(),
      referenceString: ve,
      resourceDestinationString: C,
      resourceTitleString: oe,
      resource: Fe,
      setextHeading: a(F),
      setextHeadingLineSequence: P,
      setextHeadingText: M,
      strong: a(),
      thematicBreak: a()
    }
  };
  cp(e, (t || {}).mdastExtensions || []);
  const n = {};
  return r;
  function r(E) {
    let B = {
      type: "root",
      children: []
    };
    const ee = {
      stack: [B],
      tokenStack: [],
      config: e,
      enter: l,
      exit: u,
      buffer: s,
      resume: c,
      data: n
    }, se = [];
    let ke = -1;
    for (; ++ke < E.length; )
      if (E[ke][1].type === "listOrdered" || E[ke][1].type === "listUnordered")
        if (E[ke][0] === "enter")
          se.push(ke);
        else {
          const kt = se.pop();
          ke = i(E, kt, ke);
        }
    for (ke = -1; ++ke < E.length; ) {
      const kt = e[E[ke][0]];
      up.call(kt, E[ke][1].type) && kt[E[ke][1].type].call(Object.assign({
        sliceSerialize: E[ke][2].sliceSerialize
      }, ee), E[ke][1]);
    }
    if (ee.tokenStack.length > 0) {
      const kt = ee.tokenStack[ee.tokenStack.length - 1];
      (kt[1] || _f).call(ee, void 0, kt[0]);
    }
    for (B.position = {
      start: On(E.length > 0 ? E[0][1].start : {
        line: 1,
        column: 1,
        offset: 0
      }),
      end: On(E.length > 0 ? E[E.length - 2][1].end : {
        line: 1,
        column: 1,
        offset: 0
      })
    }, ke = -1; ++ke < e.transforms.length; )
      B = e.transforms[ke](B) || B;
    return B;
  }
  function i(E, B, ee) {
    let se = B - 1, ke = -1, kt = !1, on, zt, nr, rr;
    for (; ++se <= ee; ) {
      const et = E[se];
      switch (et[1].type) {
        case "listUnordered":
        case "listOrdered":
        case "blockQuote": {
          et[0] === "enter" ? ke++ : ke--, rr = void 0;
          break;
        }
        case "lineEndingBlank": {
          et[0] === "enter" && (on && !rr && !ke && !nr && (nr = se), rr = void 0);
          break;
        }
        case "linePrefix":
        case "listItemValue":
        case "listItemMarker":
        case "listItemPrefix":
        case "listItemPrefixWhitespace":
          break;
        default:
          rr = void 0;
      }
      if (!ke && et[0] === "enter" && et[1].type === "listItemPrefix" || ke === -1 && et[0] === "exit" && (et[1].type === "listUnordered" || et[1].type === "listOrdered")) {
        if (on) {
          let An = se;
          for (zt = void 0; An--; ) {
            const Bt = E[An];
            if (Bt[1].type === "lineEnding" || Bt[1].type === "lineEndingBlank") {
              if (Bt[0] === "exit") continue;
              zt && (E[zt][1].type = "lineEndingBlank", kt = !0), Bt[1].type = "lineEnding", zt = An;
            } else if (!(Bt[1].type === "linePrefix" || Bt[1].type === "blockQuotePrefix" || Bt[1].type === "blockQuotePrefixWhitespace" || Bt[1].type === "blockQuoteMarker" || Bt[1].type === "listItemIndent")) break;
          }
          nr && (!zt || nr < zt) && (on._spread = !0), on.end = Object.assign({}, zt ? E[zt][1].start : et[1].end), E.splice(zt || se, 0, ["exit", on, et[2]]), se++, ee++;
        }
        if (et[1].type === "listItemPrefix") {
          const An = {
            type: "listItem",
            _spread: !1,
            start: Object.assign({}, et[1].start),
            // @ts-expect-error: we’ll add `end` in a second.
            end: void 0
          };
          on = An, E.splice(se, 0, ["enter", An, et[2]]), se++, ee++, nr = void 0, rr = !0;
        }
      }
    }
    return E[B][1]._spread = kt, ee;
  }
  function o(E, B) {
    return ee;
    function ee(se) {
      l.call(this, E(se), se), B && B.call(this, se);
    }
  }
  function s() {
    this.stack.push({
      type: "fragment",
      children: []
    });
  }
  function l(E, B, ee) {
    this.stack[this.stack.length - 1].children.push(E), this.stack.push(E), this.tokenStack.push([B, ee || void 0]), E.position = {
      start: On(B.start),
      // @ts-expect-error: `end` will be patched later.
      end: void 0
    };
  }
  function a(E) {
    return B;
    function B(ee) {
      E && E.call(this, ee), u.call(this, ee);
    }
  }
  function u(E, B) {
    const ee = this.stack.pop(), se = this.tokenStack.pop();
    if (se)
      se[0].type !== E.type && (B ? B.call(this, E, se[0]) : (se[1] || _f).call(this, E, se[0]));
    else throw new Error("Cannot close `" + E.type + "` (" + io({
      start: E.start,
      end: E.end
    }) + "): it’s not open");
    ee.position.end = On(E.end);
  }
  function c() {
    return xu(this.stack.pop());
  }
  function f() {
    this.data.expectingFirstListItemValue = !0;
  }
  function h(E) {
    if (this.data.expectingFirstListItemValue) {
      const B = this.stack[this.stack.length - 2];
      B.start = Number.parseInt(this.sliceSerialize(E), 10), this.data.expectingFirstListItemValue = void 0;
    }
  }
  function d() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.lang = E;
  }
  function p() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.meta = E;
  }
  function g() {
    this.data.flowCodeInside || (this.buffer(), this.data.flowCodeInside = !0);
  }
  function x() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.value = E.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, ""), this.data.flowCodeInside = void 0;
  }
  function w() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.value = E.replace(/(\r?\n|\r)$/g, "");
  }
  function L(E) {
    const B = this.resume(), ee = this.stack[this.stack.length - 1];
    ee.label = B, ee.identifier = Vt(this.sliceSerialize(E)).toLowerCase();
  }
  function A() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.title = E;
  }
  function j() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.url = E;
  }
  function H(E) {
    const B = this.stack[this.stack.length - 1];
    if (!B.depth) {
      const ee = this.sliceSerialize(E).length;
      B.depth = ee;
    }
  }
  function M() {
    this.data.setextHeadingSlurpLineEnding = !0;
  }
  function P(E) {
    const B = this.stack[this.stack.length - 1];
    B.depth = this.sliceSerialize(E).codePointAt(0) === 61 ? 1 : 2;
  }
  function F() {
    this.data.setextHeadingSlurpLineEnding = void 0;
  }
  function J(E) {
    const ee = this.stack[this.stack.length - 1].children;
    let se = ee[ee.length - 1];
    (!se || se.type !== "text") && (se = Ml(), se.position = {
      start: On(E.start),
      // @ts-expect-error: we’ll add `end` later.
      end: void 0
    }, ee.push(se)), this.stack.push(se);
  }
  function N(E) {
    const B = this.stack.pop();
    B.value += this.sliceSerialize(E), B.position.end = On(E.end);
  }
  function U(E) {
    const B = this.stack[this.stack.length - 1];
    if (this.data.atHardBreak) {
      const ee = B.children[B.children.length - 1];
      ee.position.end = On(E.end), this.data.atHardBreak = void 0;
      return;
    }
    !this.data.setextHeadingSlurpLineEnding && e.canContainEols.includes(B.type) && (J.call(this, E), N.call(this, E));
  }
  function K() {
    this.data.atHardBreak = !0;
  }
  function ne() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.value = E;
  }
  function de() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.value = E;
  }
  function ie() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.value = E;
  }
  function re() {
    const E = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const B = this.data.referenceType || "shortcut";
      E.type += "Reference", E.referenceType = B, delete E.url, delete E.title;
    } else
      delete E.identifier, delete E.label;
    this.data.referenceType = void 0;
  }
  function we() {
    const E = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const B = this.data.referenceType || "shortcut";
      E.type += "Reference", E.referenceType = B, delete E.url, delete E.title;
    } else
      delete E.identifier, delete E.label;
    this.data.referenceType = void 0;
  }
  function We(E) {
    const B = this.sliceSerialize(E), ee = this.stack[this.stack.length - 2];
    ee.label = ap(B), ee.identifier = Vt(B).toLowerCase();
  }
  function qe() {
    const E = this.stack[this.stack.length - 1], B = this.resume(), ee = this.stack[this.stack.length - 1];
    if (this.data.inReference = !0, ee.type === "link") {
      const se = E.children;
      ee.children = se;
    } else
      ee.alt = B;
  }
  function C() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.url = E;
  }
  function oe() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.title = E;
  }
  function Fe() {
    this.data.inReference = void 0;
  }
  function b() {
    this.data.referenceType = "collapsed";
  }
  function ve(E) {
    const B = this.resume(), ee = this.stack[this.stack.length - 1];
    ee.label = B, ee.identifier = Vt(this.sliceSerialize(E)).toLowerCase(), this.data.referenceType = "full";
  }
  function Ze(E) {
    this.data.characterReferenceType = E.type;
  }
  function pe(E) {
    const B = this.sliceSerialize(E), ee = this.data.characterReferenceType;
    let se;
    ee ? (se = Xd(B, ee === "characterReferenceMarkerNumeric" ? 10 : 16), this.data.characterReferenceType = void 0) : se = Cu(B);
    const ke = this.stack[this.stack.length - 1];
    ke.value += se;
  }
  function jt(E) {
    const B = this.stack.pop();
    B.position.end = On(E.end);
  }
  function st(E) {
    N.call(this, E);
    const B = this.stack[this.stack.length - 1];
    B.url = this.sliceSerialize(E);
  }
  function In(E) {
    N.call(this, E);
    const B = this.stack[this.stack.length - 1];
    B.url = "mailto:" + this.sliceSerialize(E);
  }
  function yt() {
    return {
      type: "blockquote",
      children: []
    };
  }
  function De() {
    return {
      type: "code",
      lang: null,
      meta: null,
      value: ""
    };
  }
  function Cl() {
    return {
      type: "inlineCode",
      value: ""
    };
  }
  function hs() {
    return {
      type: "definition",
      identifier: "",
      label: null,
      title: null,
      url: ""
    };
  }
  function Ke() {
    return {
      type: "emphasis",
      children: []
    };
  }
  function _r() {
    return {
      type: "heading",
      // @ts-expect-error `depth` will be set later.
      depth: 0,
      children: []
    };
  }
  function qi() {
    return {
      type: "break"
    };
  }
  function fe() {
    return {
      type: "html",
      value: ""
    };
  }
  function Vr() {
    return {
      type: "image",
      title: null,
      url: "",
      alt: null
    };
  }
  function Ki() {
    return {
      type: "link",
      title: null,
      url: "",
      children: []
    };
  }
  function Hr(E) {
    return {
      type: "list",
      ordered: E.type === "listOrdered",
      start: null,
      spread: E._spread,
      children: []
    };
  }
  function Sl(E) {
    return {
      type: "listItem",
      spread: E._spread,
      checked: null,
      children: []
    };
  }
  function tr() {
    return {
      type: "paragraph",
      children: []
    };
  }
  function Wt() {
    return {
      type: "strong",
      children: []
    };
  }
  function Ml() {
    return {
      type: "text",
      value: ""
    };
  }
  function jr() {
    return {
      type: "thematicBreak"
    };
  }
}
function On(t) {
  return {
    line: t.line,
    column: t.column,
    offset: t.offset
  };
}
function cp(t, e) {
  let n = -1;
  for (; ++n < e.length; ) {
    const r = e[n];
    Array.isArray(r) ? cp(t, r) : $1(t, r);
  }
}
function $1(t, e) {
  let n;
  for (n in e)
    if (up.call(e, n))
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
function _f(t, e) {
  throw t ? new Error("Cannot close `" + t.type + "` (" + io({
    start: t.start,
    end: t.end
  }) + "): a different token (`" + e.type + "`, " + io({
    start: e.start,
    end: e.end
  }) + ") is open") : new Error("Cannot close document, a token (`" + e.type + "`, " + io({
    start: e.start,
    end: e.end
  }) + ") is still open");
}
function Ra(t) {
  const e = this;
  e.parser = n;
  function n(r) {
    return Mu(r, {
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
const Vf = {}.hasOwnProperty;
function _1(t, e) {
  const n = e || {};
  function r(i, ...o) {
    let s = r.invalid;
    const l = r.handlers;
    if (i && Vf.call(i, t)) {
      const a = String(i[t]);
      s = Vf.call(l, a) ? l[a] : r.unknown;
    }
    if (s)
      return s.call(this, i, ...o);
  }
  return r.handlers = n.handlers || {}, r.invalid = n.invalid, r.unknown = n.unknown, r;
}
const V1 = {}.hasOwnProperty;
function fp(t, e) {
  let n = -1, r;
  if (e.extensions)
    for (; ++n < e.extensions.length; )
      fp(t, e.extensions[n]);
  for (r in e)
    if (V1.call(e, r))
      switch (r) {
        case "extensions":
          break;
        case "unsafe": {
          Hf(t[r], e[r]);
          break;
        }
        case "join": {
          Hf(t[r], e[r]);
          break;
        }
        case "handlers": {
          H1(t[r], e[r]);
          break;
        }
        default:
          t.options[r] = e[r];
      }
  return t;
}
function Hf(t, e) {
  e && t.push(...e);
}
function H1(t, e) {
  e && Object.assign(t, e);
}
function j1(t, e, n, r) {
  const i = n.enter("blockquote"), o = n.createTracker(r);
  o.move("> "), o.shift(2);
  const s = n.indentLines(
    n.containerFlow(t, o.current()),
    W1
  );
  return i(), s;
}
function W1(t, e, n) {
  return ">" + (n ? "" : " ") + t;
}
function hp(t, e) {
  return jf(t, e.inConstruct, !0) && !jf(t, e.notInConstruct, !1);
}
function jf(t, e, n) {
  if (typeof e == "string" && (e = [e]), !e || e.length === 0)
    return n;
  let r = -1;
  for (; ++r < e.length; )
    if (t.includes(e[r]))
      return !0;
  return !1;
}
function Wf(t, e, n, r) {
  let i = -1;
  for (; ++i < n.unsafe.length; )
    if (n.unsafe[i].character === `
` && hp(n.stack, n.unsafe[i]))
      return /[ \t]/.test(r.before) ? "" : " ";
  return `\\
`;
}
function q1(t, e) {
  const n = String(t);
  let r = n.indexOf(e), i = r, o = 0, s = 0;
  if (typeof e != "string")
    throw new TypeError("Expected substring");
  for (; r !== -1; )
    r === i ? ++o > s && (s = o) : o = 1, i = r + e.length, r = n.indexOf(e, i);
  return s;
}
function La(t, e) {
  return !!(e.options.fences === !1 && t.value && // If there’s no info…
  !t.lang && // And there’s a non-whitespace character…
  /[^ \r\n]/.test(t.value) && // And the value doesn’t start or end in a blank…
  !/^[\t ]*(?:[\r\n]|$)|(?:^|[\r\n])[\t ]*$/.test(t.value));
}
function K1(t) {
  const e = t.options.fence || "`";
  if (e !== "`" && e !== "~")
    throw new Error(
      "Cannot serialize code with `" + e + "` for `options.fence`, expected `` ` `` or `~`"
    );
  return e;
}
function U1(t, e, n, r) {
  const i = K1(n), o = t.value || "", s = i === "`" ? "GraveAccent" : "Tilde";
  if (La(t, n)) {
    const f = n.enter("codeIndented"), h = n.indentLines(o, J1);
    return f(), h;
  }
  const l = n.createTracker(r), a = i.repeat(Math.max(q1(o, i) + 1, 3)), u = n.enter("codeFenced");
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
function J1(t, e, n) {
  return (n ? "" : "    ") + t;
}
function vu(t) {
  const e = t.options.quote || '"';
  if (e !== '"' && e !== "'")
    throw new Error(
      "Cannot serialize title with `" + e + "` for `options.quote`, expected `\"`, or `'`"
    );
  return e;
}
function G1(t, e, n, r) {
  const i = vu(n), o = i === '"' ? "Quote" : "Apostrophe", s = n.enter("definition");
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
function Y1(t) {
  const e = t.options.emphasis || "*";
  if (e !== "*" && e !== "_")
    throw new Error(
      "Cannot serialize emphasis with `" + e + "` for `options.emphasis`, expected `*`, or `_`"
    );
  return e;
}
function Gn(t) {
  return "&#x" + t.toString(16).toUpperCase() + ";";
}
function Vs(t, e, n) {
  const r = vi(t), i = vi(e);
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
dp.peek = Q1;
function dp(t, e, n, r) {
  const i = Y1(n), o = n.enter("emphasis"), s = n.createTracker(r), l = s.move(i);
  let a = s.move(
    n.containerPhrasing(t, {
      after: i,
      before: l,
      ...s.current()
    })
  );
  const u = a.charCodeAt(0), c = Vs(
    r.before.charCodeAt(r.before.length - 1),
    u,
    i
  );
  c.inside && (a = Gn(u) + a.slice(1));
  const f = a.charCodeAt(a.length - 1), h = Vs(r.after.charCodeAt(0), f, i);
  h.inside && (a = a.slice(0, -1) + Gn(f));
  const d = s.move(i);
  return o(), n.attentionEncodeSurroundingInfo = {
    after: h.outside,
    before: c.outside
  }, l + a + d;
}
function Q1(t, e, n) {
  return n.options.emphasis || "*";
}
const ul = (
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
      return t0;
    if (typeof t == "function")
      return cl(t);
    if (typeof t == "object")
      return Array.isArray(t) ? X1(t) : (
        // Cast because `ReadonlyArray` goes into the above but `isArray`
        // narrows to `Array`.
        Z1(
          /** @type {Props} */
          t
        )
      );
    if (typeof t == "string")
      return e0(t);
    throw new Error("Expected function, string, or object as test");
  }
);
function X1(t) {
  const e = [];
  let n = -1;
  for (; ++n < t.length; )
    e[n] = ul(t[n]);
  return cl(r);
  function r(...i) {
    let o = -1;
    for (; ++o < e.length; )
      if (e[o].apply(this, i)) return !0;
    return !1;
  }
}
function Z1(t) {
  const e = (
    /** @type {Record<string, unknown>} */
    t
  );
  return cl(n);
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
function e0(t) {
  return cl(e);
  function e(n) {
    return n && n.type === t;
  }
}
function cl(t) {
  return e;
  function e(n, r, i) {
    return !!(n0(n) && t.call(
      this,
      n,
      typeof r == "number" ? r : void 0,
      i || void 0
    ));
  }
}
function t0() {
  return !0;
}
function n0(t) {
  return t !== null && typeof t == "object" && "type" in t;
}
const pp = [], r0 = !0, Pa = !1, za = "skip";
function Tu(t, e, n, r) {
  let i;
  typeof e == "function" && typeof n != "function" ? (r = n, n = e) : i = e;
  const o = ul(i), s = r ? -1 : 1;
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
      let d = pp, p, g, x;
      if ((!e || o(a, u, c[c.length - 1] || void 0)) && (d = i0(n(a, c)), d[0] === Pa))
        return d;
      if ("children" in a && a.children) {
        const w = (
          /** @type {UnistParent} */
          a
        );
        if (w.children && d[0] !== za)
          for (g = (r ? w.children.length : -1) + s, x = c.concat(w); g > -1 && g < w.children.length; ) {
            const L = w.children[g];
            if (p = l(L, g, x)(), p[0] === Pa)
              return p;
            g = typeof p[1] == "number" ? p[1] : g + s;
          }
      }
      return d;
    }
  }
}
function i0(t) {
  return Array.isArray(t) ? t : typeof t == "number" ? [r0, t] : t == null ? pp : [t];
}
function Pi(t, e, n, r) {
  let i, o, s;
  typeof e == "function" && typeof n != "function" ? (o = void 0, s = e, i = n) : (o = e, s = n, i = r), Tu(t, o, l, i);
  function l(a, u) {
    const c = u[u.length - 1], f = c ? c.children.indexOf(a) : void 0;
    return s(a, f, c);
  }
}
function mp(t, e) {
  let n = !1;
  return Pi(t, function(r) {
    if ("value" in r && /\r?\n|\r/.test(r.value) || r.type === "break")
      return n = !0, Pa;
  }), !!((!t.depth || t.depth < 3) && xu(t) && (e.options.setext || n));
}
function o0(t, e, n, r) {
  const i = Math.max(Math.min(6, t.depth || 1), 1), o = n.createTracker(r);
  if (mp(t, n)) {
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
  return /^[\t ]/.test(u) && (u = Gn(u.charCodeAt(0)) + u.slice(1)), u = u ? s + " " + u : s, n.options.closeAtx && (u += " " + s), a(), l(), u;
}
gp.peek = s0;
function gp(t) {
  return t.value || "";
}
function s0() {
  return "<";
}
yp.peek = l0;
function yp(t, e, n, r) {
  const i = vu(n), o = i === '"' ? "Quote" : "Apostrophe", s = n.enter("image");
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
function l0() {
  return "!";
}
kp.peek = a0;
function kp(t, e, n, r) {
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
function a0() {
  return "!";
}
bp.peek = u0;
function bp(t, e, n) {
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
function u0() {
  return "`";
}
function wp(t, e) {
  const n = xu(t);
  return !!(!e.options.resourceLink && // If there’s a url…
  t.url && // And there’s a no title…
  !t.title && // And the content of `node` is a single text node…
  t.children && t.children.length === 1 && t.children[0].type === "text" && // And if the url is the same as the content…
  (n === t.url || "mailto:" + n === t.url) && // And that starts w/ a protocol…
  /^[a-z][a-z+.-]+:/i.test(t.url) && // And that doesn’t contain ASCII control codes (character escapes and
  // references don’t work), space, or angle brackets…
  !/[\0- <>\u007F]/.test(t.url));
}
xp.peek = c0;
function xp(t, e, n, r) {
  const i = vu(n), o = i === '"' ? "Quote" : "Apostrophe", s = n.createTracker(r);
  let l, a;
  if (wp(t, n)) {
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
function c0(t, e, n) {
  return wp(t, n) ? "<" : "[";
}
Cp.peek = f0;
function Cp(t, e, n, r) {
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
function f0() {
  return "[";
}
function Nu(t) {
  const e = t.options.bullet || "*";
  if (e !== "*" && e !== "+" && e !== "-")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.bullet`, expected `*`, `+`, or `-`"
    );
  return e;
}
function h0(t) {
  const e = Nu(t), n = t.options.bulletOther;
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
function d0(t) {
  const e = t.options.bulletOrdered || ".";
  if (e !== "." && e !== ")")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.bulletOrdered`, expected `.` or `)`"
    );
  return e;
}
function Sp(t) {
  const e = t.options.rule || "*";
  if (e !== "*" && e !== "-" && e !== "_")
    throw new Error(
      "Cannot serialize rules with `" + e + "` for `options.rule`, expected `*`, `-`, or `_`"
    );
  return e;
}
function p0(t, e, n, r) {
  const i = n.enter("list"), o = n.bulletCurrent;
  let s = t.ordered ? d0(n) : Nu(n);
  const l = t.ordered ? s === "." ? ")" : "." : h0(n);
  let a = e && n.bulletLastUsed ? s === n.bulletLastUsed : !1;
  if (!t.ordered) {
    const c = t.children ? t.children[0] : void 0;
    if (
      // Bullet could be used as a thematic break marker:
      (s === "*" || s === "-") && // Empty first list item:
      c && (!c.children || !c.children[0]) && // Directly in two other list items:
      n.stack[n.stack.length - 1] === "list" && n.stack[n.stack.length - 2] === "listItem" && n.stack[n.stack.length - 3] === "list" && n.stack[n.stack.length - 4] === "listItem" && // That are each the first child.
      n.indexStack[n.indexStack.length - 1] === 0 && n.indexStack[n.indexStack.length - 2] === 0 && n.indexStack[n.indexStack.length - 3] === 0 && (a = !0), Sp(n) === s && c
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
function m0(t) {
  const e = t.options.listItemIndent || "one";
  if (e !== "tab" && e !== "one" && e !== "mixed")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.listItemIndent`, expected `tab`, `one`, or `mixed`"
    );
  return e;
}
function g0(t, e, n, r) {
  const i = m0(n);
  let o = n.bulletCurrent || Nu(n);
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
function y0(t, e, n, r) {
  const i = n.enter("paragraph"), o = n.enter("phrasing"), s = n.containerPhrasing(t, r);
  return o(), i(), s;
}
const k0 = (
  /** @type {(node?: unknown) => node is Exclude<PhrasingContent, Html>} */
  ul([
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
function b0(t, e, n, r) {
  return (t.children.some(function(s) {
    return k0(s);
  }) ? n.containerPhrasing : n.containerFlow).call(n, t, r);
}
function w0(t) {
  const e = t.options.strong || "*";
  if (e !== "*" && e !== "_")
    throw new Error(
      "Cannot serialize strong with `" + e + "` for `options.strong`, expected `*`, or `_`"
    );
  return e;
}
Mp.peek = x0;
function Mp(t, e, n, r) {
  const i = w0(n), o = n.enter("strong"), s = n.createTracker(r), l = s.move(i + i);
  let a = s.move(
    n.containerPhrasing(t, {
      after: i,
      before: l,
      ...s.current()
    })
  );
  const u = a.charCodeAt(0), c = Vs(
    r.before.charCodeAt(r.before.length - 1),
    u,
    i
  );
  c.inside && (a = Gn(u) + a.slice(1));
  const f = a.charCodeAt(a.length - 1), h = Vs(r.after.charCodeAt(0), f, i);
  h.inside && (a = a.slice(0, -1) + Gn(f));
  const d = s.move(i + i);
  return o(), n.attentionEncodeSurroundingInfo = {
    after: h.outside,
    before: c.outside
  }, l + a + d;
}
function x0(t, e, n) {
  return n.options.strong || "*";
}
function C0(t, e, n, r) {
  return n.safe(t.value, r);
}
function S0(t) {
  const e = t.options.ruleRepetition || 3;
  if (e < 3)
    throw new Error(
      "Cannot serialize rules with repetition `" + e + "` for `options.ruleRepetition`, expected `3` or more"
    );
  return e;
}
function M0(t, e, n) {
  const r = (Sp(n) + (n.options.ruleSpaces ? " " : "")).repeat(S0(n));
  return n.options.ruleSpaces ? r.slice(0, -1) : r;
}
const Iu = {
  blockquote: j1,
  break: Wf,
  code: U1,
  definition: G1,
  emphasis: dp,
  hardBreak: Wf,
  heading: o0,
  html: gp,
  image: yp,
  imageReference: kp,
  inlineCode: bp,
  link: xp,
  linkReference: Cp,
  list: p0,
  listItem: g0,
  paragraph: y0,
  root: b0,
  strong: Mp,
  text: C0,
  thematicBreak: M0
}, v0 = [T0];
function T0(t, e, n, r) {
  if (e.type === "code" && La(e, r) && (t.type === "list" || t.type === e.type && La(t, r)))
    return !1;
  if ("spread" in n && typeof n.spread == "boolean")
    return t.type === "paragraph" && // Two paragraphs.
    (t.type === e.type || e.type === "definition" || // Paragraph followed by a setext heading.
    e.type === "heading" && mp(e, r)) ? void 0 : n.spread ? 1 : 0;
}
const or = [
  "autolink",
  "destinationLiteral",
  "destinationRaw",
  "reference",
  "titleQuote",
  "titleApostrophe"
], N0 = [
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
    notInConstruct: or
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
    notInConstruct: or
  },
  // A right paren could start a list item or break out of a destination
  // raw.
  { atBreak: !0, before: "\\d+", character: ")" },
  { character: ")", inConstruct: "destinationRaw" },
  // An asterisk can start thematic breaks, list items, emphasis, strong.
  { atBreak: !0, character: "*", after: `(?:[ 	\r
*])` },
  { character: "*", inConstruct: "phrasing", notInConstruct: or },
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
    notInConstruct: or
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
  { character: "[", inConstruct: "phrasing", notInConstruct: or },
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
  { character: "_", inConstruct: "phrasing", notInConstruct: or },
  // A grave accent can start code (fenced or text), or it can break out of
  // a grave accent code fence.
  { atBreak: !0, character: "`" },
  {
    character: "`",
    inConstruct: ["codeFencedLangGraveAccent", "codeFencedMetaGraveAccent"]
  },
  { character: "`", inConstruct: "phrasing", notInConstruct: or },
  // Left brace, vertical bar, right brace are not used in markdown for
  // constructs.
  // A tilde can start code (fenced).
  { atBreak: !0, character: "~" }
];
function I0(t) {
  return t.label || !t.identifier ? t.label || "" : ap(t.identifier);
}
function A0(t) {
  if (!t._compiled) {
    const e = (t.atBreak ? "[\\r\\n][\\t ]*" : "") + (t.before ? "(?:" + t.before + ")" : "");
    t._compiled = new RegExp(
      (e ? "(" + e + ")" : "") + (/[|\\{}()[\]^$+*?.-]/.test(t.character) ? "\\" : "") + t.character + (t.after ? "(?:" + t.after + ")" : ""),
      "g"
    );
  }
  return t._compiled;
}
function E0(t, e, n) {
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
    a && a === h.slice(0, 1) && (h = Gn(a.charCodeAt(0)) + h.slice(1));
    const d = e.attentionEncodeSurroundingInfo;
    e.attentionEncodeSurroundingInfo = void 0, a = void 0, d && (o.length > 0 && d.before && l === o[o.length - 1].slice(-1) && (o[o.length - 1] = o[o.length - 1].slice(0, -1) + Gn(l.charCodeAt(0))), d.after && (a = f)), u.move(h), o.push(h), l = h.slice(-1);
  }
  return r.pop(), o.join("");
}
function O0(t, e, n) {
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
      o.move(D0(a, i[l + 1], t, e))
    );
  }
  return r.pop(), s.join("");
}
function D0(t, e, n, r) {
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
const R0 = /\r?\n|\r/g;
function L0(t, e) {
  const n = [];
  let r = 0, i = 0, o;
  for (; o = R0.exec(t); )
    s(t.slice(r, o.index)), n.push(o[0]), r = o.index + o[0].length, i++;
  return s(t.slice(r)), n.join("");
  function s(l) {
    n.push(e(l, i, !l));
  }
}
function P0(t, e, n) {
  const r = (n.before || "") + (e || "") + (n.after || ""), i = [], o = [], s = {};
  let l = -1;
  for (; ++l < t.unsafe.length; ) {
    const c = t.unsafe[l];
    if (!hp(t.stack, c))
      continue;
    const f = t.compilePattern(c);
    let h;
    for (; h = f.exec(r); ) {
      const d = "before" in c || !!c.atBreak, p = "after" in c, g = h.index + (d ? h[1].length : 0);
      i.includes(g) ? (s[g].before && !d && (s[g].before = !1), s[g].after && !p && (s[g].after = !1)) : (i.push(g), s[g] = { before: d, after: p });
    }
  }
  i.sort(z0);
  let a = n.before ? n.before.length : 0;
  const u = r.length - (n.after ? n.after.length : 0);
  for (l = -1; ++l < i.length; ) {
    const c = i[l];
    c < a || c >= u || c + 1 < u && i[l + 1] === c + 1 && s[c].after && !s[c + 1].before && !s[c + 1].after || i[l - 1] === c - 1 && s[c].before && !s[c - 1].before && !s[c - 1].after || (a !== c && o.push(qf(r.slice(a, c), "\\")), a = c, /[!-/:-@[-`{-~]/.test(r.charAt(c)) && (!n.encode || !n.encode.includes(r.charAt(c))) ? o.push("\\") : (o.push(Gn(r.charCodeAt(c))), a++));
  }
  return o.push(qf(r.slice(a, u), n.after)), o.join("");
}
function z0(t, e) {
  return t - e;
}
function qf(t, e) {
  const n = /\\(?=[!-/:-@[-`{-~])/g, r = [], i = [], o = t + e;
  let s = -1, l = 0, a;
  for (; a = n.exec(o); )
    r.push(a.index);
  for (; ++s < r.length; )
    l !== r[s] && i.push(t.slice(l, r[s])), i.push("\\"), l = r[s];
  return i.push(t.slice(l)), i.join("");
}
function B0(t) {
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
function F0(t, e) {
  const n = e || {}, r = {
    associationId: I0,
    containerPhrasing: H0,
    containerFlow: j0,
    createTracker: B0,
    compilePattern: A0,
    enter: o,
    // @ts-expect-error: GFM / frontmatter are typed in `mdast` but not defined
    // here.
    handlers: { ...Iu },
    // @ts-expect-error: add `handle` in a second.
    handle: void 0,
    indentLines: L0,
    indexStack: [],
    join: [...v0],
    options: {},
    safe: W0,
    stack: [],
    unsafe: [...N0]
  };
  fp(r, n), r.options.tightDefinitions && r.join.push(V0), r.handle = _1("type", {
    invalid: $0,
    unknown: _0,
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
function $0(t) {
  throw new Error("Cannot handle value `" + t + "`, expected node");
}
function _0(t) {
  const e = (
    /** @type {Nodes} */
    t
  );
  throw new Error("Cannot handle unknown node `" + e.type + "`");
}
function V0(t, e) {
  if (t.type === "definition" && t.type === e.type)
    return 0;
}
function H0(t, e) {
  return E0(t, this, e);
}
function j0(t, e) {
  return O0(t, this, e);
}
function W0(t, e) {
  return P0(this, t, e);
}
function Ba(t) {
  const e = this;
  e.compiler = n;
  function n(r) {
    return F0(r, {
      ...e.data("settings"),
      ...t,
      // Note: this option is not in the readme.
      // The goal is for it to be set by plugins on `data` instead of being
      // passed by users.
      extensions: e.data("toMarkdownExtensions") || []
    });
  }
}
function Kf(t) {
  if (t)
    throw t;
}
function q0(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var Ts = Object.prototype.hasOwnProperty, vp = Object.prototype.toString, Uf = Object.defineProperty, Jf = Object.getOwnPropertyDescriptor, Gf = function(e) {
  return typeof Array.isArray == "function" ? Array.isArray(e) : vp.call(e) === "[object Array]";
}, Yf = function(e) {
  if (!e || vp.call(e) !== "[object Object]")
    return !1;
  var n = Ts.call(e, "constructor"), r = e.constructor && e.constructor.prototype && Ts.call(e.constructor.prototype, "isPrototypeOf");
  if (e.constructor && !n && !r)
    return !1;
  var i;
  for (i in e)
    ;
  return typeof i > "u" || Ts.call(e, i);
}, Qf = function(e, n) {
  Uf && n.name === "__proto__" ? Uf(e, n.name, {
    enumerable: !0,
    configurable: !0,
    value: n.newValue,
    writable: !0
  }) : e[n.name] = n.newValue;
}, Xf = function(e, n) {
  if (n === "__proto__")
    if (Ts.call(e, n)) {
      if (Jf)
        return Jf(e, n).value;
    } else return;
  return e[n];
}, K0 = function t() {
  var e, n, r, i, o, s, l = arguments[0], a = 1, u = arguments.length, c = !1;
  for (typeof l == "boolean" && (c = l, l = arguments[1] || {}, a = 2), (l == null || typeof l != "object" && typeof l != "function") && (l = {}); a < u; ++a)
    if (e = arguments[a], e != null)
      for (n in e)
        r = Xf(l, n), i = Xf(e, n), l !== i && (c && i && (Yf(i) || (o = Gf(i))) ? (o ? (o = !1, s = r && Gf(r) ? r : []) : s = r && Yf(r) ? r : {}, Qf(l, { name: n, newValue: t(c, s, i) })) : typeof i < "u" && Qf(l, { name: n, newValue: i }));
  return l;
};
const Ol = /* @__PURE__ */ q0(K0);
function Fa(t) {
  if (typeof t != "object" || t === null)
    return !1;
  const e = Object.getPrototypeOf(t);
  return (e === null || e === Object.prototype || Object.getPrototypeOf(e) === null) && !(Symbol.toStringTag in t) && !(Symbol.iterator in t);
}
function U0() {
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
      i = u, c ? J0(c, l)(...u) : s(null, ...u);
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
function J0(t, e) {
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
class pt extends Error {
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
    this.ancestors = o.ancestors || void 0, this.cause = o.cause || void 0, this.column = l ? l.column : void 0, this.fatal = void 0, this.file = "", this.message = i, this.line = l ? l.line : void 0, this.name = io(o.place) || "1:1", this.place = o.place || void 0, this.reason = this.message, this.ruleId = o.ruleId || void 0, this.source = o.source || void 0, this.stack = s && o.cause && typeof o.cause.stack == "string" ? o.cause.stack : "", this.actual = void 0, this.expected = void 0, this.note = void 0, this.url = void 0;
  }
}
pt.prototype.file = "";
pt.prototype.name = "";
pt.prototype.reason = "";
pt.prototype.message = "";
pt.prototype.stack = "";
pt.prototype.column = void 0;
pt.prototype.line = void 0;
pt.prototype.ancestors = void 0;
pt.prototype.cause = void 0;
pt.prototype.fatal = void 0;
pt.prototype.place = void 0;
pt.prototype.ruleId = void 0;
pt.prototype.source = void 0;
const qt = { basename: G0, dirname: Y0, extname: Q0, join: X0, sep: "/" };
function G0(t, e) {
  if (e !== void 0 && typeof e != "string")
    throw new TypeError('"ext" argument must be a string');
  Go(t);
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
function Y0(t) {
  if (Go(t), t.length === 0)
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
function Q0(t) {
  Go(t);
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
function X0(...t) {
  let e = -1, n;
  for (; ++e < t.length; )
    Go(t[e]), t[e] && (n = n === void 0 ? t[e] : n + "/" + t[e]);
  return n === void 0 ? "." : Z0(n);
}
function Z0(t) {
  Go(t);
  const e = t.codePointAt(0) === 47;
  let n = ew(t, !e);
  return n.length === 0 && !e && (n = "."), n.length > 0 && t.codePointAt(t.length - 1) === 47 && (n += "/"), e ? "/" + n : n;
}
function ew(t, e) {
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
function Go(t) {
  if (typeof t != "string")
    throw new TypeError(
      "Path must be a string. Received " + JSON.stringify(t)
    );
}
const tw = { cwd: nw };
function nw() {
  return "/";
}
function $a(t) {
  return !!(t !== null && typeof t == "object" && "href" in t && t.href && "protocol" in t && t.protocol && // @ts-expect-error: indexing is fine.
  t.auth === void 0);
}
function rw(t) {
  if (typeof t == "string")
    t = new URL(t);
  else if (!$a(t)) {
    const e = new TypeError(
      'The "path" argument must be of type string or an instance of URL. Received `' + t + "`"
    );
    throw e.code = "ERR_INVALID_ARG_TYPE", e;
  }
  if (t.protocol !== "file:") {
    const e = new TypeError("The URL must be of scheme file");
    throw e.code = "ERR_INVALID_URL_SCHEME", e;
  }
  return iw(t);
}
function iw(t) {
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
const Dl = (
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
class ow {
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
    e ? $a(e) ? n = { path: e } : typeof e == "string" || sw(e) ? n = { value: e } : n = e : n = {}, this.cwd = "cwd" in n ? "" : tw.cwd(), this.data = {}, this.history = [], this.messages = [], this.value, this.map, this.result, this.stored;
    let r = -1;
    for (; ++r < Dl.length; ) {
      const o = Dl[r];
      o in n && n[o] !== void 0 && n[o] !== null && (this[o] = o === "history" ? [...n[o]] : n[o]);
    }
    let i;
    for (i in n)
      Dl.includes(i) || (this[i] = n[i]);
  }
  /**
   * Get the basename (including extname) (example: `'index.min.js'`).
   *
   * @returns {string | undefined}
   *   Basename.
   */
  get basename() {
    return typeof this.path == "string" ? qt.basename(this.path) : void 0;
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
    Ll(e, "basename"), Rl(e, "basename"), this.path = qt.join(this.dirname || "", e);
  }
  /**
   * Get the parent path (example: `'~'`).
   *
   * @returns {string | undefined}
   *   Dirname.
   */
  get dirname() {
    return typeof this.path == "string" ? qt.dirname(this.path) : void 0;
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
    Zf(this.basename, "dirname"), this.path = qt.join(e || "", this.basename);
  }
  /**
   * Get the extname (including dot) (example: `'.js'`).
   *
   * @returns {string | undefined}
   *   Extname.
   */
  get extname() {
    return typeof this.path == "string" ? qt.extname(this.path) : void 0;
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
    if (Rl(e, "extname"), Zf(this.dirname, "extname"), e) {
      if (e.codePointAt(0) !== 46)
        throw new Error("`extname` must start with `.`");
      if (e.includes(".", 1))
        throw new Error("`extname` cannot contain multiple dots");
    }
    this.path = qt.join(this.dirname, this.stem + (e || ""));
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
    $a(e) && (e = rw(e)), Ll(e, "path"), this.path !== e && this.history.push(e);
  }
  /**
   * Get the stem (basename w/o extname) (example: `'index.min'`).
   *
   * @returns {string | undefined}
   *   Stem.
   */
  get stem() {
    return typeof this.path == "string" ? qt.basename(this.path, this.extname) : void 0;
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
    Ll(e, "stem"), Rl(e, "stem"), this.path = qt.join(this.dirname || "", e + (this.extname || ""));
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
    const i = new pt(
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
function Rl(t, e) {
  if (t && t.includes(qt.sep))
    throw new Error(
      "`" + e + "` cannot be a path: did not expect `" + qt.sep + "`"
    );
}
function Ll(t, e) {
  if (!t)
    throw new Error("`" + e + "` cannot be empty");
}
function Zf(t, e) {
  if (!t)
    throw new Error("Setting `" + e + "` requires `path` to be set too");
}
function sw(t) {
  return !!(t && typeof t == "object" && "byteLength" in t && "byteOffset" in t);
}
const lw = (
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
), aw = {}.hasOwnProperty;
class Au extends lw {
  /**
   * Create a processor.
   */
  constructor() {
    super("copy"), this.Compiler = void 0, this.Parser = void 0, this.attachers = [], this.compiler = void 0, this.freezeIndex = -1, this.frozen = void 0, this.namespace = {}, this.parser = void 0, this.transformers = U0();
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
      new Au()
    );
    let n = -1;
    for (; ++n < this.attachers.length; ) {
      const r = this.attachers[n];
      e.use(...r);
    }
    return e.data(Ol(!0, {}, this.namespace)), e;
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
    return typeof e == "string" ? arguments.length === 2 ? (Bl("data", this.frozen), this.namespace[e] = n, this) : aw.call(this.namespace, e) && this.namespace[e] || void 0 : e ? (Bl("data", this.frozen), this.namespace = e, this) : this.namespace;
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
    const n = gs(e), r = this.parser || this.Parser;
    return Pl("parse", r), r(String(n), n);
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
    return this.freeze(), Pl("process", this.parser || this.Parser), zl("process", this.compiler || this.Compiler), n ? i(void 0, n) : new Promise(i);
    function i(o, s) {
      const l = gs(e), a = (
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
        cw(p) ? h.value = p : h.result = p, u(
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
    return this.freeze(), Pl("processSync", this.parser || this.Parser), zl("processSync", this.compiler || this.Compiler), this.process(e, i), th("processSync", "process", n), r;
    function i(o, s) {
      n = !0, Kf(o), r = s;
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
    eh(e), this.freeze();
    const i = this.transformers;
    return !r && typeof n == "function" && (r = n, n = void 0), r ? o(void 0, r) : new Promise(o);
    function o(s, l) {
      const a = gs(n);
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
    return this.run(e, n, o), th("runSync", "run", r), i;
    function o(s, l) {
      Kf(s), i = l, r = !0;
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
    const r = gs(n), i = this.compiler || this.Compiler;
    return zl("stringify", i), eh(e), i(e, r);
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
    if (Bl("use", this.frozen), e != null) if (typeof e == "function")
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
      l(u.plugins), u.settings && (i.settings = Ol(!0, i.settings, u.settings));
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
        const g = r[h][1];
        Fa(g) && Fa(d) && (d = Ol(!0, g, d)), r[h] = [u, d, ...p];
      }
    }
  }
}
const _a = new Au().freeze();
function Pl(t, e) {
  if (typeof e != "function")
    throw new TypeError("Cannot `" + t + "` without `parser`");
}
function zl(t, e) {
  if (typeof e != "function")
    throw new TypeError("Cannot `" + t + "` without `compiler`");
}
function Bl(t, e) {
  if (e)
    throw new Error(
      "Cannot call `" + t + "` on a frozen processor.\nCreate a new processor first, by calling it: use `processor()` instead of `processor`."
    );
}
function eh(t) {
  if (!Fa(t) || typeof t.type != "string")
    throw new TypeError("Expected node, got `" + t + "`");
}
function th(t, e, n) {
  if (!n)
    throw new Error(
      "`" + t + "` finished async. Use `" + e + "` instead"
    );
}
function gs(t) {
  return uw(t) ? t : new ow(t);
}
function uw(t) {
  return !!(t && typeof t == "object" && "message" in t && "messages" in t);
}
function cw(t) {
  return typeof t == "string" || fw(t);
}
function fw(t) {
  return !!(t && typeof t == "object" && "byteLength" in t && "byteOffset" in t);
}
function $e(t) {
  this.content = t;
}
$e.prototype = {
  constructor: $e,
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
    return i == -1 ? o.push(n || t, e) : (o[i + 1] = e, n && (o[i] = n)), new $e(o);
  },
  // :: (string) → OrderedMap
  // Return a map with the given key removed, if it existed.
  remove: function(t) {
    var e = this.find(t);
    if (e == -1) return this;
    var n = this.content.slice();
    return n.splice(e, 2), new $e(n);
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the start of the map.
  addToStart: function(t, e) {
    return new $e([t, e].concat(this.remove(t).content));
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the end of the map.
  addToEnd: function(t, e) {
    var n = this.remove(t).content.slice();
    return n.push(t, e), new $e(n);
  },
  // :: (string, string, any) → OrderedMap
  // Add a key after the given key. If `place` is not found, the new
  // key is added to the end.
  addBefore: function(t, e, n) {
    var r = this.remove(e), i = r.content.slice(), o = r.find(t);
    return i.splice(o == -1 ? i.length : o, 0, e, n), new $e(i);
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
    return t = $e.from(t), t.size ? new $e(t.content.concat(this.subtract(t).content)) : this;
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a new map by appending the keys in this map that don't
  // appear in `map` after the keys in `map`.
  append: function(t) {
    return t = $e.from(t), t.size ? new $e(this.subtract(t).content.concat(t.content)) : this;
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a map containing all the keys in this map that don't
  // appear in `map`.
  subtract: function(t) {
    var e = this;
    t = $e.from(t);
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
$e.from = function(t) {
  if (t instanceof $e) return t;
  var e = [];
  if (t) for (var n in t) e.push(n, t[n]);
  return new $e(e);
};
function Tp(t, e, n) {
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
      let s = Tp(i.content, o.content, n + 1);
      if (s != null)
        return s;
    }
    n += i.nodeSize;
  }
}
function Np(t, e, n, r) {
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
      let u = Np(s.content, l.content, n - 1, r - 1);
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
    return Tp(this, e, n);
  }
  /**
  Find the first position, searching from the end, at which this
  fragment and the given fragment differ, or `null` if they are
  the same. Since this position will not be the same in both
  nodes, an object with two separate positions is returned.
  */
  findDiffEnd(e, n = this.size, r = e.size) {
    return Np(this, e, n, r);
  }
  /**
  Find the index and inner offset corresponding to a given relative
  position in this fragment. The result object will be reused
  (overwritten) the next time the function is called. @internal
  */
  findIndex(e) {
    if (e == 0)
      return ys(0, e);
    if (e == this.size)
      return ys(this.content.length, e);
    if (e > this.size || e < 0)
      throw new RangeError(`Position ${e} outside of fragment (${this})`);
    for (let n = 0, r = 0; ; n++) {
      let i = this.child(n), o = r + i.nodeSize;
      if (o >= e)
        return o == e ? ys(n + 1, o) : ys(n, r);
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
const Fl = { index: 0, offset: 0 };
function ys(t, e) {
  return Fl.index = t, Fl.offset = e, Fl;
}
function Hs(t, e) {
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
      if (!Hs(t[r], e[r]))
        return !1;
  } else {
    for (let r in t)
      if (!(r in e) || !Hs(t[r], e[r]))
        return !1;
    for (let r in e)
      if (!(r in t))
        return !1;
  }
  return !0;
}
class ce {
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
    return this == e || this.type == e.type && Hs(this.attrs, e.attrs);
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
      return ce.none;
    if (e instanceof ce)
      return [e];
    let n = e.slice();
    return n.sort((r, i) => r.type.rank - i.type.rank), n;
  }
}
ce.none = [];
class js extends Error {
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
    let r = Ap(this.content, e + this.openStart, n);
    return r && new _(r, this.openStart, this.openEnd);
  }
  /**
  @internal
  */
  removeBetween(e, n) {
    return new _(Ip(this.content, e + this.openStart, n + this.openStart), this.openStart, this.openEnd);
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
function Ip(t, e, n) {
  let { index: r, offset: i } = t.findIndex(e), o = t.maybeChild(r), { index: s, offset: l } = t.findIndex(n);
  if (i == e || o.isText) {
    if (l != n && !t.child(s).isText)
      throw new RangeError("Removing non-flat range");
    return t.cut(0, e).append(t.cut(n));
  }
  if (r != s)
    throw new RangeError("Removing non-flat range");
  return t.replaceChild(r, o.copy(Ip(o.content, e - i - 1, n - i - 1)));
}
function Ap(t, e, n, r) {
  let { index: i, offset: o } = t.findIndex(e), s = t.maybeChild(i);
  if (o == e || s.isText)
    return r && !r.canReplace(i, i, n) ? null : t.cut(0, e).append(n).append(t.cut(e));
  let l = Ap(s.content, e - o - 1, n, s);
  return l && t.replaceChild(i, s.copy(l));
}
function hw(t, e, n) {
  if (n.openStart > t.depth)
    throw new js("Inserted content deeper than insertion position");
  if (t.depth - n.openStart != e.depth - n.openEnd)
    throw new js("Inconsistent open depths");
  return Ep(t, e, n, 0);
}
function Ep(t, e, n, r) {
  let i = t.index(r), o = t.node(r);
  if (i == e.index(r) && r < t.depth - n.openStart) {
    let s = Ep(t, e, n, r + 1);
    return o.copy(o.content.replaceChild(i, s));
  } else if (n.content.size)
    if (!n.openStart && !n.openEnd && t.depth == r && e.depth == r) {
      let s = t.parent, l = s.content;
      return xr(s, l.cut(0, t.parentOffset).append(n.content).append(l.cut(e.parentOffset)));
    } else {
      let { start: s, end: l } = dw(n, t);
      return xr(o, Dp(t, s, l, e, r));
    }
  else return xr(o, Ws(t, e, r));
}
function Op(t, e) {
  if (!e.type.compatibleContent(t.type))
    throw new js("Cannot join " + e.type.name + " onto " + t.type.name);
}
function Va(t, e, n) {
  let r = t.node(n);
  return Op(r, e.node(n)), r;
}
function wr(t, e) {
  let n = e.length - 1;
  n >= 0 && t.isText && t.sameMarkup(e[n]) ? e[n] = t.withText(e[n].text + t.text) : e.push(t);
}
function oo(t, e, n, r) {
  let i = (e || t).node(n), o = 0, s = e ? e.index(n) : i.childCount;
  t && (o = t.index(n), t.depth > n ? o++ : t.textOffset && (wr(t.nodeAfter, r), o++));
  for (let l = o; l < s; l++)
    wr(i.child(l), r);
  e && e.depth == n && e.textOffset && wr(e.nodeBefore, r);
}
function xr(t, e) {
  return t.type.checkContent(e), t.copy(e);
}
function Dp(t, e, n, r, i) {
  let o = t.depth > i && Va(t, e, i + 1), s = r.depth > i && Va(n, r, i + 1), l = [];
  return oo(null, t, i, l), o && s && e.index(i) == n.index(i) ? (Op(o, s), wr(xr(o, Dp(t, e, n, r, i + 1)), l)) : (o && wr(xr(o, Ws(t, e, i + 1)), l), oo(e, n, i, l), s && wr(xr(s, Ws(n, r, i + 1)), l)), oo(r, null, i, l), new R(l);
}
function Ws(t, e, n) {
  let r = [];
  if (oo(null, t, n, r), t.depth > n) {
    let i = Va(t, e, n + 1);
    wr(xr(i, Ws(t, e, n + 1)), r);
  }
  return oo(e, null, n, r), new R(r);
}
function dw(t, e) {
  let n = e.depth - t.openStart, i = e.node(n).copy(t.content);
  for (let o = n - 1; o >= 0; o--)
    i = e.node(o).copy(R.from(i));
  return {
    start: i.resolveNoCache(t.openStart + n),
    end: i.resolveNoCache(i.content.size - t.openEnd - n)
  };
}
class wo {
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
      return ce.none;
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
        return new Rp(this, e, r);
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
    return new wo(n, r, o);
  }
  /**
  @internal
  */
  static resolveCached(e, n) {
    let r = nh.get(e);
    if (r)
      for (let o = 0; o < r.elts.length; o++) {
        let s = r.elts[o];
        if (s.pos == n)
          return s;
      }
    else
      nh.set(e, r = new pw());
    let i = r.elts[r.i] = wo.resolve(e, n);
    return r.i = (r.i + 1) % mw, i;
  }
}
class pw {
  constructor() {
    this.elts = [], this.i = 0;
  }
}
const mw = 12, nh = /* @__PURE__ */ new WeakMap();
class Rp {
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
const gw = /* @__PURE__ */ Object.create(null);
let wn = class Ha {
  /**
  @internal
  */
  constructor(e, n, r, i = ce.none) {
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
    return this.type == e && Hs(this.attrs, n || e.defaultAttrs || gw) && ce.sameSet(this.marks, r || ce.none);
  }
  /**
  Create a new node with the same markup as this node, containing
  the given content (or empty, if no content is given).
  */
  copy(e = null) {
    return e == this.content ? this : new Ha(this.type, this.attrs, e, this.marks);
  }
  /**
  Create a copy of this node, with the given set of marks instead
  of the node's own marks.
  */
  mark(e) {
    return e == this.marks ? this : new Ha(this.type, this.attrs, this.content, e);
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
    return hw(this.resolve(e), this.resolve(n), r);
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
    return wo.resolveCached(this, e);
  }
  /**
  @internal
  */
  resolveNoCache(e) {
    return wo.resolve(this, e);
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
    return this.content.size && (e += "(" + this.content.toStringInner() + ")"), Lp(this.marks, e);
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
    let e = ce.none;
    for (let n = 0; n < this.marks.length; n++) {
      let r = this.marks[n];
      r.type.checkAttrs(r.attrs), e = r.addToSet(e);
    }
    if (!ce.sameSet(e, this.marks))
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
wn.prototype.text = void 0;
class qs extends wn {
  /**
  @internal
  */
  constructor(e, n, r, i) {
    if (super(e, n, null, i), !r)
      throw new RangeError("Empty text nodes are not allowed");
    this.text = r;
  }
  toString() {
    return this.type.spec.toDebugString ? this.type.spec.toDebugString(this) : Lp(this.marks, JSON.stringify(this.text));
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
    return e == this.marks ? this : new qs(this.type, this.attrs, this.text, e);
  }
  withText(e) {
    return e == this.text ? this : new qs(this.type, this.attrs, e, this.marks);
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
function Lp(t, e) {
  for (let n = t.length - 1; n >= 0; n--)
    e = t[n].type.name + "(" + e + ")";
  return e;
}
class Rr {
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
    let r = new yw(e, n);
    if (r.next == null)
      return Rr.empty;
    let i = Pp(r);
    r.next && r.err("Unexpected trailing text");
    let o = Mw(Sw(i));
    return vw(o, r), o;
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
Rr.empty = new Rr(!0);
class yw {
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
function Pp(t) {
  let e = [];
  do
    e.push(kw(t));
  while (t.eat("|"));
  return e.length == 1 ? e[0] : { type: "choice", exprs: e };
}
function kw(t) {
  let e = [];
  do
    e.push(bw(t));
  while (t.next && t.next != ")" && t.next != "|");
  return e.length == 1 ? e[0] : { type: "seq", exprs: e };
}
function bw(t) {
  let e = Cw(t);
  for (; ; )
    if (t.eat("+"))
      e = { type: "plus", expr: e };
    else if (t.eat("*"))
      e = { type: "star", expr: e };
    else if (t.eat("?"))
      e = { type: "opt", expr: e };
    else if (t.eat("{"))
      e = ww(t, e);
    else
      break;
  return e;
}
function rh(t) {
  /\D/.test(t.next) && t.err("Expected number, got '" + t.next + "'");
  let e = Number(t.next);
  return t.pos++, e;
}
function ww(t, e) {
  let n = rh(t), r = n;
  return t.eat(",") && (t.next != "}" ? r = rh(t) : r = -1), t.eat("}") || t.err("Unclosed braced range"), { type: "range", min: n, max: r, expr: e };
}
function xw(t, e) {
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
function Cw(t) {
  if (t.eat("(")) {
    let e = Pp(t);
    return t.eat(")") || t.err("Missing closing paren"), e;
  } else if (/\W/.test(t.next))
    t.err("Unexpected token '" + t.next + "'");
  else {
    let e = xw(t, t.next).map((n) => (t.inline == null ? t.inline = n.isInline : t.inline != n.isInline && t.err("Mixing inline and block content"), { type: "name", value: n }));
    return t.pos++, e.length == 1 ? e[0] : { type: "choice", exprs: e };
  }
}
function Sw(t) {
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
function zp(t, e) {
  return e - t;
}
function ih(t, e) {
  let n = [];
  return r(e), n.sort(zp);
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
function Mw(t) {
  let e = /* @__PURE__ */ Object.create(null);
  return n(ih(t, 0));
  function n(r) {
    let i = [];
    r.forEach((s) => {
      t[s].forEach(({ term: l, to: a }) => {
        if (!l)
          return;
        let u;
        for (let c = 0; c < i.length; c++)
          i[c][0] == l && (u = i[c][1]);
        ih(t, a).forEach((c) => {
          u || i.push([l, u = []]), u.indexOf(c) == -1 && u.push(c);
        });
      });
    });
    let o = e[r.join(",")] = new Rr(r.indexOf(t.length - 1) > -1);
    for (let s = 0; s < i.length; s++) {
      let l = i[s][1].sort(zp);
      o.next.push({ type: i[s][0], next: e[l.join(",")] || n(l) });
    }
    return o;
  }
}
function vw(t, e) {
  for (let n = 0, r = [t]; n < r.length; n++) {
    let i = r[n], o = !i.validEnd, s = [];
    for (let l = 0; l < i.next.length; l++) {
      let { type: a, next: u } = i.next[l];
      s.push(a.name), o && !(a.isText || a.hasRequiredAttrs()) && (o = !1), r.indexOf(u) == -1 && r.push(u);
    }
    o && e.err("Only non-generatable nodes (" + s.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
  }
}
function Bp(t) {
  let e = /* @__PURE__ */ Object.create(null);
  for (let n in t) {
    let r = t[n];
    if (!r.hasDefault)
      return null;
    e[n] = r.default;
  }
  return e;
}
function Fp(t, e) {
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
function $p(t, e, n, r) {
  for (let i in e)
    if (!(i in t))
      throw new RangeError(`Unsupported attribute ${i} for ${n} of type ${i}`);
  for (let i in t) {
    let o = t[i];
    o.validate && o.validate(e[i]);
  }
}
function _p(t, e) {
  let n = /* @__PURE__ */ Object.create(null);
  if (e)
    for (let r in e)
      n[r] = new Nw(t, r, e[r]);
  return n;
}
let oh = class Vp {
  /**
  @internal
  */
  constructor(e, n, r) {
    this.name = e, this.schema = n, this.spec = r, this.markSet = null, this.groups = r.group ? r.group.split(" ") : [], this.attrs = _p(e, r.attrs), this.defaultAttrs = Bp(this.attrs), this.contentMatch = null, this.inlineContent = null, this.isBlock = !(r.inline || e == "text"), this.isText = e == "text";
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
    return this.contentMatch == Rr.empty;
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
    return !e && this.defaultAttrs ? this.defaultAttrs : Fp(this.attrs, e);
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
    return new wn(this, this.computeAttrs(e), R.from(n), ce.setFrom(r));
  }
  /**
  Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but check the given content
  against the node type's content restrictions, and throw an error
  if it doesn't match.
  */
  createChecked(e = null, n, r) {
    return n = R.from(n), this.checkContent(n), new wn(this, this.computeAttrs(e), n, ce.setFrom(r));
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
    return o ? new wn(this, e, n.append(o), ce.setFrom(r)) : null;
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
    $p(this.attrs, e, "node", this.name);
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
    return n ? n.length ? n : ce.none : e;
  }
  /**
  @internal
  */
  static compile(e, n) {
    let r = /* @__PURE__ */ Object.create(null);
    e.forEach((o, s) => r[o] = new Vp(o, n, s));
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
function Tw(t, e, n) {
  let r = n.split("|");
  return (i) => {
    let o = i === null ? "null" : typeof i;
    if (r.indexOf(o) < 0)
      throw new RangeError(`Expected value of type ${r} for attribute ${e} on type ${t}, got ${o}`);
  };
}
class Nw {
  constructor(e, n, r) {
    this.hasDefault = Object.prototype.hasOwnProperty.call(r, "default"), this.default = r.default, this.validate = typeof r.validate == "string" ? Tw(e, n, r.validate) : r.validate;
  }
  get isRequired() {
    return !this.hasDefault;
  }
}
class fl {
  /**
  @internal
  */
  constructor(e, n, r, i) {
    this.name = e, this.rank = n, this.schema = r, this.spec = i, this.attrs = _p(e, i.attrs), this.excluded = null;
    let o = Bp(this.attrs);
    this.instance = o ? new ce(this, o) : null;
  }
  /**
  Create a mark of this type. `attrs` may be `null` or an object
  containing only some of the mark's attributes. The others, if
  they have defaults, will be added.
  */
  create(e = null) {
    return !e && this.instance ? this.instance : new ce(this, Fp(this.attrs, e));
  }
  /**
  @internal
  */
  static compile(e, n) {
    let r = /* @__PURE__ */ Object.create(null), i = 0;
    return e.forEach((o, s) => r[o] = new fl(o, i++, n, s)), r;
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
    $p(this.attrs, e, "mark", this.name);
  }
  /**
  Queries whether a given mark type is
  [excluded](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) by this one.
  */
  excludes(e) {
    return this.excluded.indexOf(e) > -1;
  }
}
class Iw {
  /**
  Construct a schema from a schema [specification](https://prosemirror.net/docs/ref/#model.SchemaSpec).
  */
  constructor(e) {
    this.linebreakReplacement = null, this.cached = /* @__PURE__ */ Object.create(null);
    let n = this.spec = {};
    for (let i in e)
      n[i] = e[i];
    n.nodes = $e.from(e.nodes), n.marks = $e.from(e.marks || {}), this.nodes = oh.compile(this.spec.nodes, this), this.marks = fl.compile(this.spec.marks, this);
    let r = /* @__PURE__ */ Object.create(null);
    for (let i in this.nodes) {
      if (i in this.marks)
        throw new RangeError(i + " can not be both a node and a mark");
      let o = this.nodes[i], s = o.spec.content || "", l = o.spec.marks;
      if (o.contentMatch = r[s] || (r[s] = Rr.parse(s, this.nodes)), o.inlineContent = o.contentMatch.inlineContent, o.spec.linebreakReplacement) {
        if (this.linebreakReplacement)
          throw new RangeError("Multiple linebreak nodes defined");
        if (!o.isInline || !o.isLeaf)
          throw new RangeError("Linebreak replacement nodes must be inline leaf nodes");
        this.linebreakReplacement = o;
      }
      o.markSet = l == "_" ? null : l ? sh(this, l.split(" ")) : l == "" || !o.inlineContent ? [] : null;
    }
    for (let i in this.marks) {
      let o = this.marks[i], s = o.spec.excludes;
      o.excluded = s == null ? [o] : s == "" ? [] : sh(this, s.split(" "));
    }
    this.nodeFromJSON = (i) => wn.fromJSON(this, i), this.markFromJSON = (i) => ce.fromJSON(this, i), this.topNodeType = this.nodes[this.spec.topNode || "doc"], this.cached.wrappings = /* @__PURE__ */ Object.create(null);
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
    else if (e instanceof oh) {
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
    return new qs(r, r.defaultAttrs, e, ce.setFrom(n));
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
function sh(t, e) {
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
function Aw(t) {
  return t.tag != null;
}
function Ew(t) {
  return t.style != null;
}
let Eu = class ja {
  /**
  Create a parser that targets the given schema, using the given
  parsing rules.
  */
  constructor(e, n) {
    this.schema = e, this.rules = n, this.tags = [], this.styles = [];
    let r = this.matchedStyles = [];
    n.forEach((i) => {
      if (Aw(i))
        this.tags.push(i);
      else if (Ew(i)) {
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
    let r = new ah(this, n, !1);
    return r.addAll(e, ce.none, n.from, n.to), r.finish();
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
    let r = new ah(this, n, !0);
    return r.addAll(e, ce.none, n.from, n.to), _.maxOpen(r.finish());
  }
  /**
  @internal
  */
  matchTag(e, n, r) {
    for (let i = r ? this.tags.indexOf(r) + 1 : 0; i < this.tags.length; i++) {
      let o = this.tags[i];
      if (Rw(e, o.tag) && (o.namespace === void 0 || e.namespaceURI == o.namespace) && (!o.context || n.matchesContext(o.context))) {
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
        r(s = uh(s)), s.mark || s.ignore || s.clearMark || (s.mark = i);
      });
    }
    for (let i in e.nodes) {
      let o = e.nodes[i].spec.parseDOM;
      o && o.forEach((s) => {
        r(s = uh(s)), s.node || s.ignore || s.mark || (s.node = i);
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
    return e.cached.domParser || (e.cached.domParser = new ja(e, ja.schemaRules(e)));
  }
};
const Hp = {
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
}, Ow = {
  head: !0,
  noscript: !0,
  object: !0,
  script: !0,
  style: !0,
  title: !0
}, jp = { ol: !0, ul: !0 }, xo = 1, Wa = 2, so = 4;
function lh(t, e, n) {
  return e != null ? (e ? xo : 0) | (e === "full" ? Wa : 0) : t && t.whitespace == "pre" ? xo | Wa : n & ~so;
}
class ks {
  constructor(e, n, r, i, o, s) {
    this.type = e, this.attrs = n, this.marks = r, this.solid = i, this.options = s, this.content = [], this.activeMarks = ce.none, this.match = o || (s & so ? null : e.contentMatch);
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
    if (!(this.options & xo)) {
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
    return this.type ? this.type.inlineContent : this.content.length ? this.content[0].isInline : e.parentNode && !Hp.hasOwnProperty(e.parentNode.nodeName.toLowerCase());
  }
}
class ah {
  constructor(e, n, r) {
    this.parser = e, this.options = n, this.isOpen = r, this.open = 0, this.localPreserveWS = !1;
    let i = n.topNode, o, s = lh(null, n.preserveWhitespace, 0) | (r ? so : 0);
    i ? o = new ks(i.type, i.attrs, ce.none, !0, n.topMatch || i.type.contentMatch, s) : r ? o = new ks(null, null, ce.none, !0, null, s) : o = new ks(e.schema.topNodeType, null, ce.none, !0, null, s), this.nodes = [o], this.find = n.findPositions, this.needsBlock = !1;
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
    let r = e.nodeValue, i = this.top, o = i.options & Wa ? "full" : this.localPreserveWS || (i.options & xo) > 0, { schema: s } = this.parser;
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
    jp.hasOwnProperty(s) && this.parser.normalizeLists && Dw(e);
    let a = this.options.ruleFromNode && this.options.ruleFromNode(e) || (l = this.parser.matchTag(e, this, r));
    e: if (a ? a.ignore : Ow.hasOwnProperty(s))
      this.findInside(e), this.ignoreFallback(e, n);
    else if (!a || a.skip || a.closeParent) {
      a && a.closeParent ? this.open = Math.max(0, this.open - 1) : a && a.skip.nodeType && (e = a.skip);
      let u, c = this.needsBlock;
      if (Hp.hasOwnProperty(s))
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
      let s = ce.none;
      for (let l of i.concat(e.marks))
        (o.type ? o.type.allowsMarkType(l.type) : ch(l.type, e.type)) && (s = l.addToSet(s));
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
    let l = lh(e, o, s.options);
    s.options & so && s.content.length == 0 && (l |= so);
    let a = ce.none;
    return r = r.filter((u) => (s.type ? s.type.allowsMarkType(u.type) : ch(u.type, e)) ? (a = u.addToSet(a), !1) : !0), this.nodes.push(new ks(e, n, a, i, null, l)), this.open++, r;
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
      this.localPreserveWS && (this.nodes[n].options |= xo);
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
function Dw(t) {
  for (let e = t.firstChild, n = null; e; e = e.nextSibling) {
    let r = e.nodeType == 1 ? e.nodeName.toLowerCase() : null;
    r && jp.hasOwnProperty(r) && n ? (n.appendChild(e), e = n) : r == "li" ? n = e : r && (n = null);
  }
}
function Rw(t, e) {
  return (t.matches || t.msMatchesSelector || t.webkitMatchesSelector || t.mozMatchesSelector).call(t, e);
}
function uh(t) {
  let e = {};
  for (let n in t)
    e[n] = t[n];
  return e;
}
function ch(t, e) {
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
class zi {
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
    r || (r = $l(n).createDocumentFragment());
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
    let { dom: r, contentDOM: i } = Ns($l(n), this.nodes[e.type.name](e), null, e.attrs);
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
    return i && Ns($l(r), i(e, n), null, e.attrs);
  }
  static renderSpec(e, n, r = null, i) {
    return Ns(e, n, r, i);
  }
  /**
  Build a serializer using the [`toDOM`](https://prosemirror.net/docs/ref/#model.NodeSpec.toDOM)
  properties in a schema's node and mark specs.
  */
  static fromSchema(e) {
    return e.cached.domSerializer || (e.cached.domSerializer = new zi(this.nodesFromSchema(e), this.marksFromSchema(e)));
  }
  /**
  Gather the serializers in a schema's node specs into an object.
  This can be useful as a base to build a custom serializer from.
  */
  static nodesFromSchema(e) {
    let n = fh(e.nodes);
    return n.text || (n.text = (r) => r.text), n;
  }
  /**
  Gather the serializers in a schema's mark specs into an object.
  */
  static marksFromSchema(e) {
    return fh(e.marks);
  }
}
function fh(t) {
  let e = {};
  for (let n in t) {
    let r = t[n].spec.toDOM;
    r && (e[n] = r);
  }
  return e;
}
function $l(t) {
  return t.document || window.document;
}
const hh = /* @__PURE__ */ new WeakMap();
function Lw(t) {
  let e = hh.get(t);
  return e === void 0 && hh.set(t, e = Pw(t)), e;
}
function Pw(t) {
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
function Ns(t, e, n, r) {
  if (typeof e == "string")
    return { dom: t.createTextNode(e) };
  if (e.nodeType != null)
    return { dom: e };
  if (e.dom && e.dom.nodeType != null)
    return e;
  let i = e[0], o;
  if (typeof i != "string")
    throw new RangeError("Invalid array passed to renderSpec");
  if (r && (o = Lw(r)) && o.indexOf(e) > -1)
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
      let { dom: d, contentDOM: p } = Ns(t, h, n, r);
      if (a.appendChild(d), p) {
        if (l)
          throw new RangeError("Multiple content holes");
        l = p;
      }
    }
  }
  return { dom: a, contentDOM: l };
}
const Wp = 65535, qp = Math.pow(2, 16);
function zw(t, e) {
  return t + e * qp;
}
function dh(t) {
  return t & Wp;
}
function Bw(t) {
  return (t - (t & Wp)) / qp;
}
const Kp = 1, Up = 2, Is = 4, Jp = 8;
class qa {
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
    return (this.delInfo & Jp) > 0;
  }
  /**
  Tells you whether the token before the mapped position was deleted.
  */
  get deletedBefore() {
    return (this.delInfo & (Kp | Is)) > 0;
  }
  /**
  True when the token after the mapped position was deleted.
  */
  get deletedAfter() {
    return (this.delInfo & (Up | Is)) > 0;
  }
  /**
  Tells whether any of the steps mapped through deletes across the
  position (including both the token before and after the
  position).
  */
  get deletedAcross() {
    return (this.delInfo & Is) > 0;
  }
}
class wt {
  /**
  Create a position map. The modifications to the document are
  represented as an array of numbers, in which each group of three
  represents a modified chunk as `[start, oldSize, newSize]`.
  */
  constructor(e, n = !1) {
    if (this.ranges = e, this.inverted = n, !e.length && wt.empty)
      return wt.empty;
  }
  /**
  @internal
  */
  recover(e) {
    let n = 0, r = dh(e);
    if (!this.inverted)
      for (let i = 0; i < r; i++)
        n += this.ranges[i * 3 + 2] - this.ranges[i * 3 + 1];
    return this.ranges[r * 3] + n + Bw(e);
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
        let p = e == (n < 0 ? a : f) ? null : zw(l / 3, e - a), g = e == a ? Up : e == f ? Kp : Is;
        return (n < 0 ? e != a : e != f) && (g |= Jp), new qa(d, g, p);
      }
      i += c - u;
    }
    return r ? e + i : new qa(e + i, 0, null);
  }
  /**
  @internal
  */
  touches(e, n) {
    let r = 0, i = dh(n), o = this.inverted ? 2 : 1, s = this.inverted ? 1 : 2;
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
    return new wt(this.ranges, !this.inverted);
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
    return e == 0 ? wt.empty : new wt(e < 0 ? [0, -e, 0] : [0, 0, e]);
  }
}
wt.empty = new wt([]);
class Co {
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
    return new Co(this._maps, this.mirror, e, n);
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
    let e = new Co();
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
    return r ? e : new qa(e, i, null);
  }
}
const _l = /* @__PURE__ */ Object.create(null);
class Qe {
  /**
  Get the step map that represents the changes made by this step,
  and which can be used to transform between positions in the old
  and the new document.
  */
  getMap() {
    return wt.empty;
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
    let r = _l[n.stepType];
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
    if (e in _l)
      throw new RangeError("Duplicate use of step JSON ID " + e);
    return _l[e] = n, n.prototype.jsonID = e, n;
  }
}
class Oe {
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
    return new Oe(e, null);
  }
  /**
  Create a failed step result.
  */
  static fail(e) {
    return new Oe(null, e);
  }
  /**
  Call [`Node.replace`](https://prosemirror.net/docs/ref/#model.Node.replace) with the given
  arguments. Create a successful result if it succeeds, and a
  failed one if it throws a `ReplaceError`.
  */
  static fromReplace(e, n, r, i) {
    try {
      return Oe.ok(e.replace(n, r, i));
    } catch (o) {
      if (o instanceof js)
        return Oe.fail(o.message);
      throw o;
    }
  }
}
function Ou(t, e, n) {
  let r = [];
  for (let i = 0; i < t.childCount; i++) {
    let o = t.child(i);
    o.content.size && (o = o.copy(Ou(o.content, e, o))), o.isInline && (o = e(o, n, i)), r.push(o);
  }
  return R.fromArray(r);
}
class yn extends Qe {
  /**
  Create a mark step.
  */
  constructor(e, n, r) {
    super(), this.from = e, this.to = n, this.mark = r;
  }
  apply(e) {
    let n = e.slice(this.from, this.to), r = e.resolve(this.from), i = r.node(r.sharedDepth(this.to)), o = new _(Ou(n.content, (s, l) => !s.isAtom || !l.type.allowsMarkType(this.mark.type) ? s : s.mark(this.mark.addToSet(s.marks)), i), n.openStart, n.openEnd);
    return Oe.fromReplace(e, this.from, this.to, o);
  }
  invert() {
    return new Jt(this.from, this.to, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
    return n.deleted && r.deleted || n.pos >= r.pos ? null : new yn(n.pos, r.pos, this.mark);
  }
  merge(e) {
    return e instanceof yn && e.mark.eq(this.mark) && this.from <= e.to && this.to >= e.from ? new yn(Math.min(this.from, e.from), Math.max(this.to, e.to), this.mark) : null;
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
    return new yn(n.from, n.to, e.markFromJSON(n.mark));
  }
}
Qe.jsonID("addMark", yn);
class Jt extends Qe {
  /**
  Create a mark-removing step.
  */
  constructor(e, n, r) {
    super(), this.from = e, this.to = n, this.mark = r;
  }
  apply(e) {
    let n = e.slice(this.from, this.to), r = new _(Ou(n.content, (i) => i.mark(this.mark.removeFromSet(i.marks)), e), n.openStart, n.openEnd);
    return Oe.fromReplace(e, this.from, this.to, r);
  }
  invert() {
    return new yn(this.from, this.to, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
    return n.deleted && r.deleted || n.pos >= r.pos ? null : new Jt(n.pos, r.pos, this.mark);
  }
  merge(e) {
    return e instanceof Jt && e.mark.eq(this.mark) && this.from <= e.to && this.to >= e.from ? new Jt(Math.min(this.from, e.from), Math.max(this.to, e.to), this.mark) : null;
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
    return new Jt(n.from, n.to, e.markFromJSON(n.mark));
  }
}
Qe.jsonID("removeMark", Jt);
class Hn extends Qe {
  /**
  Create a node mark step.
  */
  constructor(e, n) {
    super(), this.pos = e, this.mark = n;
  }
  apply(e) {
    let n = e.nodeAt(this.pos);
    if (!n)
      return Oe.fail("No node at mark step's position");
    let r = n.type.create(n.attrs, null, this.mark.addToSet(n.marks));
    return Oe.fromReplace(e, this.pos, this.pos + 1, new _(R.from(r), 0, n.isLeaf ? 0 : 1));
  }
  invert(e) {
    let n = e.nodeAt(this.pos);
    if (n) {
      let r = this.mark.addToSet(n.marks);
      if (r.length == n.marks.length) {
        for (let i = 0; i < n.marks.length; i++)
          if (!n.marks[i].isInSet(r))
            return new Hn(this.pos, n.marks[i]);
        return new Hn(this.pos, this.mark);
      }
    }
    return new Lr(this.pos, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.pos, 1);
    return n.deletedAfter ? null : new Hn(n.pos, this.mark);
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
    return new Hn(n.pos, e.markFromJSON(n.mark));
  }
}
Qe.jsonID("addNodeMark", Hn);
class Lr extends Qe {
  /**
  Create a mark-removing step.
  */
  constructor(e, n) {
    super(), this.pos = e, this.mark = n;
  }
  apply(e) {
    let n = e.nodeAt(this.pos);
    if (!n)
      return Oe.fail("No node at mark step's position");
    let r = n.type.create(n.attrs, null, this.mark.removeFromSet(n.marks));
    return Oe.fromReplace(e, this.pos, this.pos + 1, new _(R.from(r), 0, n.isLeaf ? 0 : 1));
  }
  invert(e) {
    let n = e.nodeAt(this.pos);
    return !n || !this.mark.isInSet(n.marks) ? this : new Hn(this.pos, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.pos, 1);
    return n.deletedAfter ? null : new Lr(n.pos, this.mark);
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
    return new Lr(n.pos, e.markFromJSON(n.mark));
  }
}
Qe.jsonID("removeNodeMark", Lr);
class Ee extends Qe {
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
    return this.structure && Ka(e, this.from, this.to) ? Oe.fail("Structure replace would overwrite content") : Oe.fromReplace(e, this.from, this.to, this.slice);
  }
  getMap() {
    return new wt([this.from, this.to - this.from, this.slice.size]);
  }
  invert(e) {
    return new Ee(this.from, this.from + this.slice.size, e.slice(this.from, this.to));
  }
  map(e) {
    let n = e.mapResult(this.to, -1), r = this.from == this.to && Ee.MAP_BIAS < 0 ? n : e.mapResult(this.from, 1);
    return r.deletedAcross && n.deletedAcross ? null : new Ee(r.pos, Math.max(r.pos, n.pos), this.slice, this.structure);
  }
  merge(e) {
    if (!(e instanceof Ee) || e.structure || this.structure)
      return null;
    if (this.from + this.slice.size == e.from && !this.slice.openEnd && !e.slice.openStart) {
      let n = this.slice.size + e.slice.size == 0 ? _.empty : new _(this.slice.content.append(e.slice.content), this.slice.openStart, e.slice.openEnd);
      return new Ee(this.from, this.to + (e.to - e.from), n, this.structure);
    } else if (e.to == this.from && !this.slice.openStart && !e.slice.openEnd) {
      let n = this.slice.size + e.slice.size == 0 ? _.empty : new _(e.slice.content.append(this.slice.content), e.slice.openStart, this.slice.openEnd);
      return new Ee(e.from, this.to, n, this.structure);
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
    return new Ee(n.from, n.to, _.fromJSON(e, n.slice), !!n.structure);
  }
}
Ee.MAP_BIAS = 1;
Qe.jsonID("replace", Ee);
class Ge extends Qe {
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
    if (this.structure && (Ka(e, this.from, this.gapFrom) || Ka(e, this.gapTo, this.to)))
      return Oe.fail("Structure gap-replace would overwrite content");
    let n = e.slice(this.gapFrom, this.gapTo);
    if (n.openStart || n.openEnd)
      return Oe.fail("Gap is not a flat range");
    let r = this.slice.insertAt(this.insert, n.content);
    return r ? Oe.fromReplace(e, this.from, this.to, r) : Oe.fail("Content does not fit in gap");
  }
  getMap() {
    return new wt([
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
    return new Ge(this.from, this.from + this.slice.size + n, this.from + this.insert, this.from + this.insert + n, e.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
  }
  map(e) {
    let n = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1), i = this.from == this.gapFrom ? n.pos : e.map(this.gapFrom, -1), o = this.to == this.gapTo ? r.pos : e.map(this.gapTo, 1);
    return n.deletedAcross && r.deletedAcross || i < n.pos || o > r.pos ? null : new Ge(n.pos, r.pos, i, o, this.slice, this.insert, this.structure);
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
    return new Ge(n.from, n.to, n.gapFrom, n.gapTo, _.fromJSON(e, n.slice), n.insert, !!n.structure);
  }
}
Qe.jsonID("replaceAround", Ge);
function Ka(t, e, n) {
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
function Fw(t, e, n, r) {
  let i = [], o = [], s, l;
  t.doc.nodesBetween(e, n, (a, u, c) => {
    if (!a.isInline)
      return;
    let f = a.marks;
    if (!r.isInSet(f) && c.type.allowsMarkType(r.type)) {
      let h = Math.max(u, e), d = Math.min(u + a.nodeSize, n), p = r.addToSet(f);
      for (let g = 0; g < f.length; g++)
        f[g].isInSet(p) || (s && s.to == h && s.mark.eq(f[g]) ? s.to = d : i.push(s = new Jt(h, d, f[g])));
      l && l.to == h ? l.to = d : o.push(l = new yn(h, d, r));
    }
  }), i.forEach((a) => t.step(a)), o.forEach((a) => t.step(a));
}
function $w(t, e, n, r) {
  let i = [], o = 0;
  t.doc.nodesBetween(e, n, (s, l) => {
    if (!s.isInline)
      return;
    o++;
    let a = null;
    if (r instanceof fl) {
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
  }), i.forEach((s) => t.step(new Jt(s.from, s.to, s.style)));
}
function Du(t, e, n, r = n.contentMatch, i = !0) {
  let o = t.doc.nodeAt(e), s = [], l = e + 1;
  for (let a = 0; a < o.childCount; a++) {
    let u = o.child(a), c = l + u.nodeSize, f = r.matchType(u.type);
    if (!f)
      s.push(new Ee(l, c, _.empty));
    else {
      r = f;
      for (let h = 0; h < u.marks.length; h++)
        n.allowsMarkType(u.marks[h].type) || t.step(new Jt(l, c, u.marks[h]));
      if (i && u.isText && n.whitespace != "pre") {
        let h, d = /\r?\n|\r/g, p;
        for (; h = d.exec(u.text); )
          p || (p = new _(R.from(n.schema.text(" ", n.allowedMarks(u.marks))), 0, 0)), s.push(new Ee(l + h.index, l + h.index + h[0].length, p));
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
function _w(t, e, n) {
  return (e == 0 || t.canReplace(e, t.childCount)) && (n == t.childCount || t.canReplace(0, n));
}
function hl(t) {
  let n = t.parent.content.cutByIndex(t.startIndex, t.endIndex);
  for (let r = t.depth, i = 0, o = 0; ; --r) {
    let s = t.$from.node(r), l = t.$from.index(r) + i, a = t.$to.indexAfter(r) - o;
    if (r < t.depth && s.canReplace(l, a, n))
      return r;
    if (r == 0 || s.type.spec.isolating || !_w(s, l, a))
      break;
    l && (i = 1), a < s.childCount && (o = 1);
  }
  return null;
}
function Vw(t, e, n) {
  let { $from: r, $to: i, depth: o } = e, s = r.before(o + 1), l = i.after(o + 1), a = s, u = l, c = R.empty, f = 0;
  for (let p = o, g = !1; p > n; p--)
    g || r.index(p) > 0 ? (g = !0, c = R.from(r.node(p).copy(c)), f++) : a--;
  let h = R.empty, d = 0;
  for (let p = o, g = !1; p > n; p--)
    g || i.after(p + 1) < i.end(p) ? (g = !0, h = R.from(i.node(p).copy(h)), d++) : u++;
  t.step(new Ge(a, u, s, l, new _(c.append(h), f, d), c.size - f, !0));
}
function Ru(t, e, n = null, r = t) {
  let i = Hw(t, e), o = i && jw(r, e);
  return o ? i.map(ph).concat({ type: e, attrs: n }).concat(o.map(ph)) : null;
}
function ph(t) {
  return { type: t, attrs: null };
}
function Hw(t, e) {
  let { parent: n, startIndex: r, endIndex: i } = t, o = n.contentMatchAt(r).findWrapping(e);
  if (!o)
    return null;
  let s = o.length ? o[0] : e;
  return n.canReplaceWith(r, i, s) ? o : null;
}
function jw(t, e) {
  let { parent: n, startIndex: r, endIndex: i } = t, o = n.child(r), s = e.contentMatch.findWrapping(o.type);
  if (!s)
    return null;
  let a = (s.length ? s[s.length - 1] : e).contentMatch;
  for (let u = r; a && u < i; u++)
    a = a.matchType(n.child(u).type);
  return !a || !a.validEnd ? null : s;
}
function Ww(t, e, n) {
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
  t.step(new Ge(i, o, i, o, new _(r, 0, 0), n.length, !0));
}
function qw(t, e, n, r, i) {
  if (!r.isTextblock)
    throw new RangeError("Type given to setBlockType should be a textblock");
  let o = t.steps.length;
  t.doc.nodesBetween(e, n, (s, l) => {
    let a = typeof i == "function" ? i(s) : i;
    if (s.isTextblock && !s.hasMarkup(r, a) && Kw(t.doc, t.mapping.slice(o).map(l), r)) {
      let u = null;
      if (r.schema.linebreakReplacement) {
        let d = r.whitespace == "pre", p = !!r.contentMatch.matchType(r.schema.linebreakReplacement);
        d && !p ? u = !1 : !d && p && (u = !0);
      }
      u === !1 && Yp(t, s, l, o), Du(t, t.mapping.slice(o).map(l, 1), r, void 0, u === null);
      let c = t.mapping.slice(o), f = c.map(l, 1), h = c.map(l + s.nodeSize, 1);
      return t.step(new Ge(f, h, f + 1, h - 1, new _(R.from(r.create(a, null, s.marks)), 0, 0), 1, !0)), u === !0 && Gp(t, s, l, o), !1;
    }
  });
}
function Gp(t, e, n, r) {
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
function Yp(t, e, n, r) {
  e.forEach((i, o) => {
    if (i.type == i.type.schema.linebreakReplacement) {
      let s = t.mapping.slice(r).map(n + 1 + o);
      t.replaceWith(s, s + 1, e.type.schema.text(`
`));
    }
  });
}
function Kw(t, e, n) {
  let r = t.resolve(e), i = r.index();
  return r.parent.canReplaceWith(i, i + 1, n);
}
function Uw(t, e, n, r, i) {
  let o = t.doc.nodeAt(e);
  if (!o)
    throw new RangeError("No node at given position");
  n || (n = o.type);
  let s = n.create(r, null, i || o.marks);
  if (o.isLeaf)
    return t.replaceWith(e, e + o.nodeSize, s);
  if (!n.validContent(o.content))
    throw new RangeError("Invalid content for node type " + n.name);
  t.step(new Ge(e, e + o.nodeSize, e + 1, e + o.nodeSize - 1, new _(R.from(s), 0, 0), 1, !0));
}
function lo(t, e, n = 1, r) {
  let i = t.resolve(e), o = i.depth - n, s = r && r[r.length - 1] || i.parent;
  if (o < 0 || i.parent.type.spec.isolating || !i.parent.canReplace(i.index(), i.parent.childCount) || !s.type.validContent(i.parent.content.cutByIndex(i.index(), i.parent.childCount)))
    return !1;
  for (let u = i.depth - 1, c = n - 2; u > o; u--, c--) {
    let f = i.node(u), h = i.index(u);
    if (f.type.spec.isolating)
      return !1;
    let d = f.content.cutByIndex(h, f.childCount), p = r && r[c + 1];
    p && (d = d.replaceChild(0, p.type.create(p.attrs)));
    let g = r && r[c] || f;
    if (!f.canReplace(h + 1, f.childCount) || !g.type.validContent(d))
      return !1;
  }
  let l = i.indexAfter(o), a = r && r[0];
  return i.node(o).canReplaceWith(l, l, a ? a.type : i.node(o + 1).type);
}
function Jw(t, e, n = 1, r) {
  let i = t.doc.resolve(e), o = R.empty, s = R.empty;
  for (let l = i.depth, a = i.depth - n, u = n - 1; l > a; l--, u--) {
    o = R.from(i.node(l).copy(o));
    let c = r && r[u];
    s = R.from(c ? c.type.create(c.attrs, s) : i.node(l).copy(s));
  }
  t.step(new Ee(e, e, new _(o.append(s), n, n), !0));
}
function dl(t, e) {
  let n = t.resolve(e), r = n.index();
  return Yw(n.nodeBefore, n.nodeAfter) && n.parent.canReplace(r, r + 1);
}
function Gw(t, e) {
  e.content.size || t.type.compatibleContent(e.type);
  let n = t.contentMatchAt(t.childCount), { linebreakReplacement: r } = t.type.schema;
  for (let i = 0; i < e.childCount; i++) {
    let o = e.child(i), s = o.type == r ? t.type.schema.nodes.text : o.type;
    if (n = n.matchType(s), !n || !t.type.allowsMarks(o.marks))
      return !1;
  }
  return n.validEnd;
}
function Yw(t, e) {
  return !!(t && e && !t.isLeaf && Gw(t, e));
}
function Qw(t, e, n) {
  let r = null, { linebreakReplacement: i } = t.doc.type.schema, o = t.doc.resolve(e - n), s = o.node().type;
  if (i && s.inlineContent) {
    let c = s.whitespace == "pre", f = !!s.contentMatch.matchType(i);
    c && !f ? r = !1 : !c && f && (r = !0);
  }
  let l = t.steps.length;
  if (r === !1) {
    let c = t.doc.resolve(e + n);
    Yp(t, c.node(), c.before(), l);
  }
  s.inlineContent && Du(t, e + n - 1, s, o.node().contentMatchAt(o.index()), r == null);
  let a = t.mapping.slice(l), u = a.map(e - n);
  if (t.step(new Ee(u, a.map(e + n, -1), _.empty, !0)), r === !0) {
    let c = t.doc.resolve(u);
    Gp(t, c.node(), c.before(), t.steps.length);
  }
  return t;
}
function Xw(t, e, n) {
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
function Zw(t, e, n) {
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
function pl(t, e, n = e, r = _.empty) {
  if (e == n && !r.size)
    return null;
  let i = t.resolve(e), o = t.resolve(n);
  return Qp(i, o, r) ? new Ee(e, n, r) : new ex(i, o, r).fit();
}
function Qp(t, e, n) {
  return !n.openStart && !n.openEnd && t.start() == e.start() && t.parent.canReplace(t.index(), e.index(), n.content);
}
class ex {
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
    return e > -1 ? new Ge(r.pos, e, this.$to.pos, this.$to.end(), a, n) : a.size || r.pos != this.$to.pos ? new Ee(r.pos, i.pos, a) : null;
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
        r ? (o = Vl(this.unplaced.content, r - 1).firstChild, i = o.content) : i = this.unplaced.content;
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
    let { content: e, openStart: n, openEnd: r } = this.unplaced, i = Vl(e, n);
    return !i.childCount || i.firstChild.isLeaf ? !1 : (this.unplaced = new _(e, n + 1, Math.max(r, i.size + n >= e.size - r ? n + 1 : 0)), !0);
  }
  dropNode() {
    let { content: e, openStart: n, openEnd: r } = this.unplaced, i = Vl(e, n);
    if (i.childCount <= 1 && n > 0) {
      let o = e.size - n <= n + i.size;
      this.unplaced = new _(Zi(e, n - 1, 1), n - 1, o ? n - 1 : r);
    } else
      this.unplaced = new _(Zi(e, n, 1), n, r);
  }
  // Move content from the unplaced slice at `sliceDepth` to the
  // frontier node at `frontierDepth`. Close that frontier node when
  // applicable.
  placeNodes({ sliceDepth: e, frontierDepth: n, parent: r, inject: i, wrap: o }) {
    for (; this.depth > n; )
      this.closeFrontierNode();
    if (o)
      for (let g = 0; g < o.length; g++)
        this.openFrontierNode(o[g]);
    let s = this.unplaced, l = r ? r.content : s.content, a = s.openStart - e, u = 0, c = [], { match: f, type: h } = this.frontier[n];
    if (i) {
      for (let g = 0; g < i.childCount; g++)
        c.push(i.child(g));
      f = f.matchFragment(i);
    }
    let d = l.size + e - (s.content.size - s.openEnd);
    for (; u < l.childCount; ) {
      let g = l.child(u), x = f.matchType(g.type);
      if (!x)
        break;
      u++, (u > 1 || a == 0 || g.content.size) && (f = x, c.push(Xp(g.mark(h.allowedMarks(g.marks)), u == 1 ? a : 0, u == l.childCount ? d : -1)));
    }
    let p = u == l.childCount;
    p || (d = -1), this.placed = eo(this.placed, n, R.from(c)), this.frontier[n].match = f, p && d < 0 && r && r.type == this.frontier[this.depth].type && this.frontier.length > 1 && this.closeFrontierNode();
    for (let g = 0, x = l; g < d; g++) {
      let w = x.lastChild;
      this.frontier.push({ type: w.type, match: w.contentMatchAt(w.childCount) }), x = w.content;
    }
    this.unplaced = p ? e == 0 ? _.empty : new _(Zi(s.content, e - 1, 1), e - 1, d < 0 ? s.openEnd : e - 1) : new _(Zi(s.content, e, u), s.openStart, s.openEnd);
  }
  mustMoveInline() {
    if (!this.$to.parent.isTextblock)
      return -1;
    let e = this.frontier[this.depth], n;
    if (!e.type.isTextblock || !Hl(this.$to, this.$to.depth, e.type, e.match, !1) || this.$to.depth == this.depth && (n = this.findCloseLevel(this.$to)) && n.depth == this.depth)
      return -1;
    let { depth: r } = this.$to, i = this.$to.after(r);
    for (; r > 1 && i == this.$to.end(--r); )
      ++i;
    return i;
  }
  findCloseLevel(e) {
    e: for (let n = Math.min(this.depth, e.depth); n >= 0; n--) {
      let { match: r, type: i } = this.frontier[n], o = n < e.depth && e.end(n + 1) == e.pos + (e.depth - (n + 1)), s = Hl(e, n, i, r, o);
      if (s) {
        for (let l = n - 1; l >= 0; l--) {
          let { match: a, type: u } = this.frontier[l], c = Hl(e, l, u, a, !0);
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
    n.fit.childCount && (this.placed = eo(this.placed, n.depth, n.fit)), e = n.move;
    for (let r = n.depth + 1; r <= e.depth; r++) {
      let i = e.node(r), o = i.type.contentMatch.fillBefore(i.content, !0, e.index(r));
      this.openFrontierNode(i.type, i.attrs, o);
    }
    return e;
  }
  openFrontierNode(e, n = null, r) {
    let i = this.frontier[this.depth];
    i.match = i.match.matchType(e), this.placed = eo(this.placed, this.depth, R.from(e.create(n, r))), this.frontier.push({ type: e, match: e.contentMatch });
  }
  closeFrontierNode() {
    let n = this.frontier.pop().match.fillBefore(R.empty, !0);
    n.childCount && (this.placed = eo(this.placed, this.frontier.length, n));
  }
}
function Zi(t, e, n) {
  return e == 0 ? t.cutByIndex(n, t.childCount) : t.replaceChild(0, t.firstChild.copy(Zi(t.firstChild.content, e - 1, n)));
}
function eo(t, e, n) {
  return e == 0 ? t.append(n) : t.replaceChild(t.childCount - 1, t.lastChild.copy(eo(t.lastChild.content, e - 1, n)));
}
function Vl(t, e) {
  for (let n = 0; n < e; n++)
    t = t.firstChild.content;
  return t;
}
function Xp(t, e, n) {
  if (e <= 0)
    return t;
  let r = t.content;
  return e > 1 && (r = r.replaceChild(0, Xp(r.firstChild, e - 1, r.childCount == 1 ? n - 1 : 0))), e > 0 && (r = t.type.contentMatch.fillBefore(r).append(r), n <= 0 && (r = r.append(t.type.contentMatch.matchFragment(r).fillBefore(R.empty, !0)))), t.copy(r);
}
function Hl(t, e, n, r, i) {
  let o = t.node(e), s = i ? t.indexAfter(e) : t.index(e);
  if (s == o.childCount && !n.compatibleContent(o.type))
    return null;
  let l = r.fillBefore(o.content, !0, s);
  return l && !tx(n, o.content, s) ? l : null;
}
function tx(t, e, n) {
  for (let r = n; r < e.childCount; r++)
    if (!t.allowsMarks(e.child(r).marks))
      return !0;
  return !1;
}
function nx(t) {
  return t.spec.defining || t.spec.definingForContent;
}
function rx(t, e, n, r) {
  if (!r.size)
    return t.deleteRange(e, n);
  let i = t.doc.resolve(e), o = t.doc.resolve(n);
  if (Qp(i, o, r))
    return t.step(new Ee(e, n, r));
  let s = em(i, o);
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
    let d = u[h], p = nx(d.type);
    if (p && !d.sameMarkup(i.node(Math.abs(l) - 1)))
      c = h;
    else if (p || !d.type.isTextblock)
      break;
  }
  for (let h = r.openStart; h >= 0; h--) {
    let d = (h + c + 1) % (r.openStart + 1), p = u[d];
    if (p)
      for (let g = 0; g < s.length; g++) {
        let x = s[(g + a) % s.length], w = !0;
        x < 0 && (w = !1, x = -x);
        let L = i.node(x - 1), A = i.index(x - 1);
        if (L.canReplaceWith(A, A, p.type, p.marks))
          return t.replace(i.before(x), w ? o.after(x) : n, new _(Zp(r.content, 0, r.openStart, d), d, r.openEnd));
      }
  }
  let f = t.steps.length;
  for (let h = s.length - 1; h >= 0 && (t.replace(e, n, r), !(t.steps.length > f)); h--) {
    let d = s[h];
    d < 0 || (e = i.before(d), n = o.after(d));
  }
}
function Zp(t, e, n, r, i) {
  if (e < n) {
    let o = t.firstChild;
    t = t.replaceChild(0, o.copy(Zp(o.content, e + 1, n, r, o)));
  }
  if (e > r) {
    let o = i.contentMatchAt(0), s = o.fillBefore(t).append(t);
    t = s.append(o.matchFragment(s).fillBefore(R.empty, !0));
  }
  return t;
}
function ix(t, e, n, r) {
  if (!r.isInline && e == n && t.doc.resolve(e).parent.content.size) {
    let i = Xw(t.doc, e, r.type);
    i != null && (e = n = i);
  }
  t.replaceRange(e, n, new _(R.from(r), 0, 0));
}
function ox(t, e, n) {
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
  let o = em(r, i);
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
function em(t, e) {
  let n = [], r = Math.min(t.depth, e.depth);
  for (let i = r; i >= 0; i--) {
    let o = t.start(i);
    if (o < t.pos - (t.depth - i) || e.end(i) > e.pos + (e.depth - i) || t.node(i).type.spec.isolating || e.node(i).type.spec.isolating)
      break;
    (o == e.start(i) || i == t.depth && i == e.depth && t.parent.inlineContent && e.parent.inlineContent && i && e.start(i - 1) == o - 1) && n.push(i);
  }
  return n;
}
class ni extends Qe {
  /**
  Construct an attribute step.
  */
  constructor(e, n, r) {
    super(), this.pos = e, this.attr = n, this.value = r;
  }
  apply(e) {
    let n = e.nodeAt(this.pos);
    if (!n)
      return Oe.fail("No node at attribute step's position");
    let r = /* @__PURE__ */ Object.create(null);
    for (let o in n.attrs)
      r[o] = n.attrs[o];
    r[this.attr] = this.value;
    let i = n.type.create(r, null, n.marks);
    return Oe.fromReplace(e, this.pos, this.pos + 1, new _(R.from(i), 0, n.isLeaf ? 0 : 1));
  }
  getMap() {
    return wt.empty;
  }
  invert(e) {
    return new ni(this.pos, this.attr, e.nodeAt(this.pos).attrs[this.attr]);
  }
  map(e) {
    let n = e.mapResult(this.pos, 1);
    return n.deletedAfter ? null : new ni(n.pos, this.attr, this.value);
  }
  toJSON() {
    return { stepType: "attr", pos: this.pos, attr: this.attr, value: this.value };
  }
  static fromJSON(e, n) {
    if (typeof n.pos != "number" || typeof n.attr != "string")
      throw new RangeError("Invalid input for AttrStep.fromJSON");
    return new ni(n.pos, n.attr, n.value);
  }
}
Qe.jsonID("attr", ni);
class So extends Qe {
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
    return Oe.ok(r);
  }
  getMap() {
    return wt.empty;
  }
  invert(e) {
    return new So(this.attr, e.attrs[this.attr]);
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
    return new So(n.attr, n.value);
  }
}
Qe.jsonID("docAttr", So);
let Ti = class extends Error {
};
Ti = function t(e) {
  let n = Error.call(this, e);
  return n.__proto__ = t.prototype, n;
};
Ti.prototype = Object.create(Error.prototype);
Ti.prototype.constructor = Ti;
Ti.prototype.name = "TransformError";
class tm {
  /**
  Create a transform that starts with the given document.
  */
  constructor(e) {
    this.doc = e, this.steps = [], this.docs = [], this.mapping = new Co();
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
      throw new Ti(n.failed);
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
    let i = pl(this.doc, e, n, r);
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
    return rx(this, e, n, r), this;
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
    return ix(this, e, n, r), this;
  }
  /**
  Delete the given range, expanding it to cover fully covered
  parent nodes until a valid replace is found.
  */
  deleteRange(e, n) {
    return ox(this, e, n), this;
  }
  /**
  Split the content in the given range off from its parent, if there
  is sibling content before or after it, and move it up the tree to
  the depth specified by `target`. You'll probably want to use
  [`liftTarget`](https://prosemirror.net/docs/ref/#transform.liftTarget) to compute `target`, to make
  sure the lift is valid.
  */
  lift(e, n) {
    return Vw(this, e, n), this;
  }
  /**
  Join the blocks around the given position. If depth is 2, their
  last and first siblings are also joined, and so on.
  */
  join(e, n = 1) {
    return Qw(this, e, n), this;
  }
  /**
  Wrap the given [range](https://prosemirror.net/docs/ref/#model.NodeRange) in the given set of wrappers.
  The wrappers are assumed to be valid in this position, and should
  probably be computed with [`findWrapping`](https://prosemirror.net/docs/ref/#transform.findWrapping).
  */
  wrap(e, n) {
    return Ww(this, e, n), this;
  }
  /**
  Set the type of all textblocks (partly) between `from` and `to` to
  the given node type with the given attributes.
  */
  setBlockType(e, n = e, r, i = null) {
    return qw(this, e, n, r, i), this;
  }
  /**
  Change the type, attributes, and/or marks of the node at `pos`.
  When `type` isn't given, the existing node type is preserved,
  */
  setNodeMarkup(e, n, r = null, i) {
    return Uw(this, e, n, r, i), this;
  }
  /**
  Set a single attribute on a given node to a new value.
  The `pos` addresses the document content. Use `setDocAttribute`
  to set attributes on the document itself.
  */
  setNodeAttribute(e, n, r) {
    return this.step(new ni(e, n, r)), this;
  }
  /**
  Set a single attribute on the document to a new value.
  */
  setDocAttribute(e, n) {
    return this.step(new So(e, n)), this;
  }
  /**
  Add a mark to the node at position `pos`.
  */
  addNodeMark(e, n) {
    return this.step(new Hn(e, n)), this;
  }
  /**
  Remove a mark (or all marks of the given type) from the node at
  position `pos`.
  */
  removeNodeMark(e, n) {
    let r = this.doc.nodeAt(e);
    if (!r)
      throw new RangeError("No node at position " + e);
    if (n instanceof ce)
      n.isInSet(r.marks) && this.step(new Lr(e, n));
    else {
      let i = r.marks, o, s = [];
      for (; o = n.isInSet(i); )
        s.push(new Lr(e, o)), i = o.removeFromSet(i);
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
    return Jw(this, e, n, r), this;
  }
  /**
  Add the given mark to the inline content between `from` and `to`.
  */
  addMark(e, n, r) {
    return Fw(this, e, n, r), this;
  }
  /**
  Remove marks from inline nodes between `from` and `to`. When
  `mark` is a single mark, remove precisely that mark. When it is
  a mark type, remove all marks of that type. When it is null,
  remove all marks of any type.
  */
  removeMark(e, n, r) {
    return $w(this, e, n, r), this;
  }
  /**
  Removes all marks and nodes from the content of the node at
  `pos` that don't match the given new parent node type. Accepts
  an optional starting [content match](https://prosemirror.net/docs/ref/#model.ContentMatch) as
  third argument.
  */
  clearIncompatible(e, n, r) {
    return Du(this, e, n, r), this;
  }
}
const jl = /* @__PURE__ */ Object.create(null);
class te {
  /**
  Initialize a selection with the head and anchor and ranges. If no
  ranges are given, constructs a single range across `$anchor` and
  `$head`.
  */
  constructor(e, n, r) {
    this.$anchor = e, this.$head = n, this.ranges = r || [new nm(e.min(n), e.max(n))];
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
      e.replaceRange(c.map(a.pos), c.map(u.pos), l ? _.empty : n), l == 0 && yh(e, o, (r ? r.isInline : i && i.isTextblock) ? -1 : 1);
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
      o ? e.deleteRange(u, c) : (e.replaceRangeWith(u, c, n), yh(e, r, n.isInline ? -1 : 1));
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
    let i = e.parent.inlineContent ? new Y(e) : Jr(e.node(0), e.parent, e.pos, e.index(), n, r);
    if (i)
      return i;
    for (let o = e.depth - 1; o >= 0; o--) {
      let s = n < 0 ? Jr(e.node(0), e.node(o), e.before(o + 1), e.index(o), n, r) : Jr(e.node(0), e.node(o), e.after(o + 1), e.index(o) + 1, n, r);
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
    return this.findFrom(e, n) || this.findFrom(e, -n) || new St(e.node(0));
  }
  /**
  Find the cursor or leaf node selection closest to the start of
  the given document. Will return an
  [`AllSelection`](https://prosemirror.net/docs/ref/#state.AllSelection) if no valid position
  exists.
  */
  static atStart(e) {
    return Jr(e, e, 0, 0, 1) || new St(e);
  }
  /**
  Find the cursor or leaf node selection closest to the end of the
  given document.
  */
  static atEnd(e) {
    return Jr(e, e, e.content.size, e.childCount, -1) || new St(e);
  }
  /**
  Deserialize the JSON representation of a selection. Must be
  implemented for custom classes (as a static class method).
  */
  static fromJSON(e, n) {
    if (!n || !n.type)
      throw new RangeError("Invalid input for Selection.fromJSON");
    let r = jl[n.type];
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
    if (e in jl)
      throw new RangeError("Duplicate use of selection JSON ID " + e);
    return jl[e] = n, n.prototype.jsonID = e, n;
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
    return Y.between(this.$anchor, this.$head).getBookmark();
  }
}
te.prototype.visible = !0;
class nm {
  /**
  Create a range.
  */
  constructor(e, n) {
    this.$from = e, this.$to = n;
  }
}
let mh = !1;
function gh(t) {
  !mh && !t.parent.inlineContent && (mh = !0, console.warn("TextSelection endpoint not pointing into a node with inline content (" + t.parent.type.name + ")"));
}
class Y extends te {
  /**
  Construct a text selection between the given points.
  */
  constructor(e, n = e) {
    gh(e), gh(n), super(e, n);
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
      return te.near(r);
    let i = e.resolve(n.map(this.anchor));
    return new Y(i.parent.inlineContent ? i : r, r);
  }
  replace(e, n = _.empty) {
    if (super.replace(e, n), n == _.empty) {
      let r = this.$from.marksAcross(this.$to);
      r && e.ensureMarks(r);
    }
  }
  eq(e) {
    return e instanceof Y && e.anchor == this.anchor && e.head == this.head;
  }
  getBookmark() {
    return new ml(this.anchor, this.head);
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
    return new Y(e.resolve(n.anchor), e.resolve(n.head));
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
      let o = te.findFrom(n, r, !0) || te.findFrom(n, -r, !0);
      if (o)
        n = o.$head;
      else
        return te.near(n, r);
    }
    return e.parent.inlineContent || (i == 0 ? e = n : (e = (te.findFrom(e, -r, !0) || te.findFrom(e, r, !0)).$anchor, e.pos < n.pos != i < 0 && (e = n))), new Y(e, n);
  }
}
te.jsonID("text", Y);
class ml {
  constructor(e, n) {
    this.anchor = e, this.head = n;
  }
  map(e) {
    return new ml(e.map(this.anchor), e.map(this.head));
  }
  resolve(e) {
    return Y.between(e.resolve(this.anchor), e.resolve(this.head));
  }
}
class X extends te {
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
    return r ? te.near(o) : new X(o);
  }
  content() {
    return new _(R.from(this.node), 0, 0);
  }
  eq(e) {
    return e instanceof X && e.anchor == this.anchor;
  }
  toJSON() {
    return { type: "node", anchor: this.anchor };
  }
  getBookmark() {
    return new Lu(this.anchor);
  }
  /**
  @internal
  */
  static fromJSON(e, n) {
    if (typeof n.anchor != "number")
      throw new RangeError("Invalid input for NodeSelection.fromJSON");
    return new X(e.resolve(n.anchor));
  }
  /**
  Create a node selection from non-resolved positions.
  */
  static create(e, n) {
    return new X(e.resolve(n));
  }
  /**
  Determines whether the given node may be selected as a node
  selection.
  */
  static isSelectable(e) {
    return !e.isText && e.type.spec.selectable !== !1;
  }
}
X.prototype.visible = !1;
te.jsonID("node", X);
class Lu {
  constructor(e) {
    this.anchor = e;
  }
  map(e) {
    let { deleted: n, pos: r } = e.mapResult(this.anchor);
    return n ? new ml(r, r) : new Lu(r);
  }
  resolve(e) {
    let n = e.resolve(this.anchor), r = n.nodeAfter;
    return r && X.isSelectable(r) ? new X(n) : te.near(n);
  }
}
class St extends te {
  /**
  Create an all-selection over the given document.
  */
  constructor(e) {
    super(e.resolve(0), e.resolve(e.content.size));
  }
  replace(e, n = _.empty) {
    if (n == _.empty) {
      e.delete(0, e.doc.content.size);
      let r = te.atStart(e.doc);
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
    return new St(e);
  }
  map(e) {
    return new St(e);
  }
  eq(e) {
    return e instanceof St;
  }
  getBookmark() {
    return sx;
  }
}
te.jsonID("all", St);
const sx = {
  map() {
    return this;
  },
  resolve(t) {
    return new St(t);
  }
};
function Jr(t, e, n, r, i, o = !1) {
  if (e.inlineContent)
    return Y.create(t, n);
  for (let s = r - (i > 0 ? 0 : 1); i > 0 ? s < e.childCount : s >= 0; s += i) {
    let l = e.child(s);
    if (l.isAtom) {
      if (!o && X.isSelectable(l))
        return X.create(t, n - (i < 0 ? l.nodeSize : 0));
    } else {
      let a = Jr(t, l, n + i, i < 0 ? l.childCount : 0, i, o);
      if (a)
        return a;
    }
    n += l.nodeSize * i;
  }
  return null;
}
function yh(t, e, n) {
  let r = t.steps.length - 1;
  if (r < e)
    return;
  let i = t.steps[r];
  if (!(i instanceof Ee || i instanceof Ge))
    return;
  let o = t.mapping.maps[r], s;
  o.forEach((l, a, u, c) => {
    s == null && (s = c);
  }), t.setSelection(te.near(t.doc.resolve(s), n));
}
const kh = 1, bs = 2, bh = 4;
class lx extends tm {
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
    return this.curSelection = e, this.curSelectionFor = this.steps.length, this.updated = (this.updated | kh) & ~bs, this.storedMarks = null, this;
  }
  /**
  Whether the selection was explicitly updated by this transaction.
  */
  get selectionSet() {
    return (this.updated & kh) > 0;
  }
  /**
  Set the current stored marks.
  */
  setStoredMarks(e) {
    return this.storedMarks = e, this.updated |= bs, this;
  }
  /**
  Make sure the current stored marks or, if that is null, the marks
  at the selection, match the given set of marks. Does nothing if
  this is already the case.
  */
  ensureMarks(e) {
    return ce.sameSet(this.storedMarks || this.selection.$from.marks(), e) || this.setStoredMarks(e), this;
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
    return (this.updated & bs) > 0;
  }
  /**
  @internal
  */
  addStep(e, n) {
    super.addStep(e, n), this.updated = this.updated & ~bs, this.storedMarks = null;
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
    return n && (e = e.mark(this.storedMarks || (r.empty ? r.$from.marks() : r.$from.marksAcross(r.$to) || ce.none))), r.replaceWith(this, e), this;
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
      return this.replaceRangeWith(n, r, i.text(e, o)), !this.selection.empty && this.selection.to == n + e.length && this.setSelection(te.near(this.selection.$to)), this;
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
    return this.updated |= bh, this;
  }
  /**
  True when this transaction has had `scrollIntoView` called on it.
  */
  get scrolledIntoView() {
    return (this.updated & bh) > 0;
  }
}
function wh(t, e) {
  return !e || !t ? t : t.bind(e);
}
class to {
  constructor(e, n, r) {
    this.name = e, this.init = wh(n.init, r), this.apply = wh(n.apply, r);
  }
}
const ax = [
  new to("doc", {
    init(t) {
      return t.doc || t.schema.topNodeType.createAndFill();
    },
    apply(t) {
      return t.doc;
    }
  }),
  new to("selection", {
    init(t, e) {
      return t.selection || te.atStart(e.doc);
    },
    apply(t) {
      return t.selection;
    }
  }),
  new to("storedMarks", {
    init(t) {
      return t.storedMarks || null;
    },
    apply(t, e, n, r) {
      return r.selection.$cursor ? t.storedMarks : null;
    }
  }),
  new to("scrollToSelection", {
    init() {
      return 0;
    },
    apply(t, e) {
      return t.scrolledIntoView ? e + 1 : e;
    }
  })
];
class Wl {
  constructor(e, n) {
    this.schema = e, this.plugins = [], this.pluginsByKey = /* @__PURE__ */ Object.create(null), this.fields = ax.slice(), n && n.forEach((r) => {
      if (this.pluginsByKey[r.key])
        throw new RangeError("Adding different instances of a keyed plugin (" + r.key + ")");
      this.plugins.push(r), this.pluginsByKey[r.key] = r, r.spec.state && this.fields.push(new to(r.key, r.spec.state, r));
    });
  }
}
class Zr {
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
    let n = new Zr(this.config), r = this.config.fields;
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
    return new lx(this);
  }
  /**
  Create a new state.
  */
  static create(e) {
    let n = new Wl(e.doc ? e.doc.type.schema : e.schema, e.plugins), r = new Zr(n);
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
    let n = new Wl(this.schema, e.plugins), r = n.fields, i = new Zr(n);
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
    let i = new Wl(e.schema, e.plugins), o = new Zr(i);
    return i.fields.forEach((s) => {
      if (s.name == "doc")
        o.doc = wn.fromJSON(e.schema, n.doc);
      else if (s.name == "selection")
        o.selection = te.fromJSON(o.doc, n.selection);
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
function rm(t, e, n) {
  for (let r in t) {
    let i = t[r];
    i instanceof Function ? i = i.bind(e) : r == "handleDOMEvents" && (i = rm(i, e, {})), n[r] = i;
  }
  return n;
}
class Be {
  /**
  Create a plugin.
  */
  constructor(e) {
    this.spec = e, this.props = {}, e.props && rm(e.props, this, this.props), this.key = e.key ? e.key.key : im("plugin");
  }
  /**
  Extract the plugin's state field from an editor state.
  */
  getState(e) {
    return e[this.key];
  }
}
const ql = /* @__PURE__ */ Object.create(null);
function im(t) {
  return t in ql ? t + "$" + ++ql[t] : (ql[t] = 0, t + "$");
}
class Xe {
  /**
  Create a plugin key.
  */
  constructor(e = "key") {
    this.key = im(e);
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
const Pu = (t, e) => t.selection.empty ? !1 : (e && e(t.tr.deleteSelection().scrollIntoView()), !0);
function om(t, e) {
  let { $cursor: n } = t.selection;
  return !n || (e ? !e.endOfTextblock("backward", t) : n.parentOffset > 0) ? null : n;
}
const sm = (t, e, n) => {
  let r = om(t, n);
  if (!r)
    return !1;
  let i = zu(r);
  if (!i) {
    let s = r.blockRange(), l = s && hl(s);
    return l == null ? !1 : (e && e(t.tr.lift(s, l).scrollIntoView()), !0);
  }
  let o = i.nodeBefore;
  if (um(t, i, e, -1))
    return !0;
  if (r.parent.content.size == 0 && (Ni(o, "end") || X.isSelectable(o)))
    for (let s = r.depth; ; s--) {
      let l = pl(t.doc, r.before(s), r.after(s), _.empty);
      if (l && l.slice.size < l.to - l.from) {
        if (e) {
          let a = t.tr.step(l);
          a.setSelection(Ni(o, "end") ? te.findFrom(a.doc.resolve(a.mapping.map(i.pos, -1)), -1) : X.create(a.doc, i.pos - o.nodeSize)), e(a.scrollIntoView());
        }
        return !0;
      }
      if (s == 1 || r.node(s - 1).childCount > 1)
        break;
    }
  return o.isAtom && i.depth == r.depth - 1 ? (e && e(t.tr.delete(i.pos - o.nodeSize, i.pos).scrollIntoView()), !0) : !1;
}, ux = (t, e, n) => {
  let r = om(t, n);
  if (!r)
    return !1;
  let i = zu(r);
  return i ? cx(t, i, e) : !1;
};
function cx(t, e, n) {
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
  let u = pl(t.doc, o, a, _.empty);
  if (!u || u.from != o || u instanceof Ee && u.slice.size >= a - o)
    return !1;
  if (n) {
    let c = t.tr.step(u);
    c.setSelection(Y.create(c.doc, o)), n(c.scrollIntoView());
  }
  return !0;
}
function Ni(t, e, n = !1) {
  for (let r = t; r; r = e == "start" ? r.firstChild : r.lastChild) {
    if (r.isTextblock)
      return !0;
    if (n && r.childCount != 1)
      return !1;
  }
  return !1;
}
const lm = (t, e, n) => {
  let { $head: r, empty: i } = t.selection, o = r;
  if (!i)
    return !1;
  if (r.parent.isTextblock) {
    if (n ? !n.endOfTextblock("backward", t) : r.parentOffset > 0)
      return !1;
    o = zu(r);
  }
  let s = o && o.nodeBefore;
  return !s || !X.isSelectable(s) ? !1 : (e && e(t.tr.setSelection(X.create(t.doc, o.pos - s.nodeSize)).scrollIntoView()), !0);
};
function zu(t) {
  if (!t.parent.type.spec.isolating)
    for (let e = t.depth - 1; e >= 0; e--) {
      if (t.index(e) > 0)
        return t.doc.resolve(t.before(e + 1));
      if (t.node(e).type.spec.isolating)
        break;
    }
  return null;
}
function fx(t, e) {
  let { $cursor: n } = t.selection;
  return !n || (e ? !e.endOfTextblock("forward", t) : n.parentOffset < n.parent.content.size) ? null : n;
}
const hx = (t, e, n) => {
  let r = fx(t, n);
  if (!r)
    return !1;
  let i = am(r);
  if (!i)
    return !1;
  let o = i.nodeAfter;
  if (um(t, i, e, 1))
    return !0;
  if (r.parent.content.size == 0 && (Ni(o, "start") || X.isSelectable(o))) {
    let s = pl(t.doc, r.before(), r.after(), _.empty);
    if (s && s.slice.size < s.to - s.from) {
      if (e) {
        let l = t.tr.step(s);
        l.setSelection(Ni(o, "start") ? te.findFrom(l.doc.resolve(l.mapping.map(i.pos)), 1) : X.create(l.doc, l.mapping.map(i.pos))), e(l.scrollIntoView());
      }
      return !0;
    }
  }
  return o.isAtom && i.depth == r.depth - 1 ? (e && e(t.tr.delete(i.pos, i.pos + o.nodeSize).scrollIntoView()), !0) : !1;
}, dx = (t, e, n) => {
  let { $head: r, empty: i } = t.selection, o = r;
  if (!i)
    return !1;
  if (r.parent.isTextblock) {
    if (n ? !n.endOfTextblock("forward", t) : r.parentOffset < r.parent.content.size)
      return !1;
    o = am(r);
  }
  let s = o && o.nodeAfter;
  return !s || !X.isSelectable(s) ? !1 : (e && e(t.tr.setSelection(X.create(t.doc, o.pos)).scrollIntoView()), !0);
};
function am(t) {
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
const px = (t, e) => {
  let { $head: n, $anchor: r } = t.selection;
  return !n.parent.type.spec.code || !n.sameParent(r) ? !1 : (e && e(t.tr.insertText(`
`).scrollIntoView()), !0);
};
function Bu(t) {
  for (let e = 0; e < t.edgeCount; e++) {
    let { type: n } = t.edge(e);
    if (n.isTextblock && !n.hasRequiredAttrs())
      return n;
  }
  return null;
}
const mx = (t, e) => {
  let { $head: n, $anchor: r } = t.selection;
  if (!n.parent.type.spec.code || !n.sameParent(r))
    return !1;
  let i = n.node(-1), o = n.indexAfter(-1), s = Bu(i.contentMatchAt(o));
  if (!s || !i.canReplaceWith(o, o, s))
    return !1;
  if (e) {
    let l = n.after(), a = t.tr.replaceWith(l, l, s.createAndFill());
    a.setSelection(te.near(a.doc.resolve(l), 1)), e(a.scrollIntoView());
  }
  return !0;
}, gx = (t, e) => {
  let n = t.selection, { $from: r, $to: i } = n;
  if (n instanceof St || r.parent.inlineContent || i.parent.inlineContent)
    return !1;
  let o = Bu(i.parent.contentMatchAt(i.indexAfter()));
  if (!o || !o.isTextblock)
    return !1;
  if (e) {
    let s = (!r.parentOffset && i.index() < i.parent.childCount ? r : i).pos, l = t.tr.insert(s, o.createAndFill());
    l.setSelection(Y.create(l.doc, s + 1)), e(l.scrollIntoView());
  }
  return !0;
}, yx = (t, e) => {
  let { $cursor: n } = t.selection;
  if (!n || n.parent.content.size)
    return !1;
  if (n.depth > 1 && n.after() != n.end(-1)) {
    let o = n.before();
    if (lo(t.doc, o))
      return e && e(t.tr.split(o).scrollIntoView()), !0;
  }
  let r = n.blockRange(), i = r && hl(r);
  return i == null ? !1 : (e && e(t.tr.lift(r, i).scrollIntoView()), !0);
};
function kx(t) {
  return (e, n) => {
    let { $from: r, $to: i } = e.selection;
    if (e.selection instanceof X && e.selection.node.isBlock)
      return !r.parentOffset || !lo(e.doc, r.pos) ? !1 : (n && n(e.tr.split(r.pos).scrollIntoView()), !0);
    if (!r.depth)
      return !1;
    let o = [], s, l, a = !1, u = !1;
    for (let d = r.depth; ; d--)
      if (r.node(d).isBlock) {
        a = r.end(d) == r.pos + (r.depth - d), u = r.start(d) == r.pos - (r.depth - d), l = Bu(r.node(d - 1).contentMatchAt(r.indexAfter(d - 1))), o.unshift(a && l ? { type: l } : null), s = d;
        break;
      } else {
        if (d == 1)
          return !1;
        o.unshift(null);
      }
    let c = e.tr;
    (e.selection instanceof Y || e.selection instanceof St) && c.deleteSelection();
    let f = c.mapping.map(r.pos), h = lo(c.doc, f, o.length, o);
    if (h || (o[0] = l ? { type: l } : null, h = lo(c.doc, f, o.length, o)), !h)
      return !1;
    if (c.split(f, o.length, o), !a && u && r.node(s).type != l) {
      let d = c.mapping.map(r.before(s)), p = c.doc.resolve(d);
      l && r.node(s - 1).canReplaceWith(p.index(), p.index() + 1, l) && c.setNodeMarkup(c.mapping.map(r.before(s)), l);
    }
    return n && n(c.scrollIntoView()), !0;
  };
}
const bx = kx(), wx = (t, e) => (e && e(t.tr.setSelection(new St(t.doc))), !0);
function xx(t, e, n) {
  let r = e.nodeBefore, i = e.nodeAfter, o = e.index();
  return !r || !i || !r.type.compatibleContent(i.type) ? !1 : !r.content.size && e.parent.canReplace(o - 1, o) ? (n && n(t.tr.delete(e.pos - r.nodeSize, e.pos).scrollIntoView()), !0) : !e.parent.canReplace(o, o + 1) || !(i.isTextblock || dl(t.doc, e.pos)) ? !1 : (n && n(t.tr.join(e.pos).scrollIntoView()), !0);
}
function um(t, e, n, r) {
  let i = e.nodeBefore, o = e.nodeAfter, s, l, a = i.type.spec.isolating || o.type.spec.isolating;
  if (!a && xx(t, e, n))
    return !0;
  let u = !a && e.parent.canReplace(e.index(), e.index() + 1);
  if (u && (s = (l = i.contentMatchAt(i.childCount)).findWrapping(o.type)) && l.matchType(s[0] || o.type).validEnd) {
    if (n) {
      let d = e.pos + o.nodeSize, p = R.empty;
      for (let w = s.length - 1; w >= 0; w--)
        p = R.from(s[w].create(null, p));
      p = R.from(i.copy(p));
      let g = t.tr.step(new Ge(e.pos - 1, d, e.pos, d, new _(p, 1, 0), s.length, !0)), x = g.doc.resolve(d + 2 * s.length);
      x.nodeAfter && x.nodeAfter.type == i.type && dl(g.doc, x.pos) && g.join(x.pos), n(g.scrollIntoView());
    }
    return !0;
  }
  let c = o.type.spec.isolating || r > 0 && a ? null : te.findFrom(e, 1), f = c && c.$from.blockRange(c.$to), h = f && hl(f);
  if (h != null && h >= e.depth)
    return n && n(t.tr.lift(f, h).scrollIntoView()), !0;
  if (u && Ni(o, "start", !0) && Ni(i, "end")) {
    let d = i, p = [];
    for (; p.push(d), !d.isTextblock; )
      d = d.lastChild;
    let g = o, x = 1;
    for (; !g.isTextblock; g = g.firstChild)
      x++;
    if (d.canReplace(d.childCount, d.childCount, g.content)) {
      if (n) {
        let w = R.empty;
        for (let A = p.length - 1; A >= 0; A--)
          w = R.from(p[A].copy(w));
        let L = t.tr.step(new Ge(e.pos - p.length, e.pos + o.nodeSize, e.pos + x, e.pos + o.nodeSize - x, new _(w, p.length, 0), 0, !0));
        n(L.scrollIntoView());
      }
      return !0;
    }
  }
  return !1;
}
function cm(t) {
  return function(e, n) {
    let r = e.selection, i = t < 0 ? r.$from : r.$to, o = i.depth;
    for (; i.node(o).isInline; ) {
      if (!o)
        return !1;
      o--;
    }
    return i.node(o).isTextblock ? (n && n(e.tr.setSelection(Y.create(e.doc, t < 0 ? i.start(o) : i.end(o)))), !0) : !1;
  };
}
const Cx = cm(-1), Sx = cm(1);
function Fu(t, e = null) {
  return function(n, r) {
    let { $from: i, $to: o } = n.selection, s = i.blockRange(o), l = s && Ru(s, t, e);
    return l ? (r && r(n.tr.wrap(s, l).scrollIntoView()), !0) : !1;
  };
}
function kn(t, e = null) {
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
function Mx(t, e, n, r) {
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
function Yo(t, e = null, n) {
  return function(r, i) {
    let { empty: o, $cursor: s, ranges: l } = r.selection;
    if (o && !s || !Mx(r.doc, l, t))
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
            let d = f.pos, p = h.pos, g = f.nodeAfter, x = h.nodeBefore, w = g && g.isText ? /^\s*/.exec(g.text)[0].length : 0, L = x && x.isText ? /\s*$/.exec(x.text)[0].length : 0;
            d + w < p && (d += w, p -= L), u.addMark(d, p, t.create(e));
          }
        }
        i(u.scrollIntoView());
      }
    return !0;
  };
}
function Bi(...t) {
  return function(e, n, r) {
    for (let i = 0; i < t.length; i++)
      if (t[i](e, n, r))
        return !0;
    return !1;
  };
}
let Kl = Bi(Pu, sm, lm), xh = Bi(Pu, hx, dx);
const cn = {
  Enter: Bi(px, gx, yx, bx),
  "Mod-Enter": mx,
  Backspace: Kl,
  "Mod-Backspace": Kl,
  "Shift-Backspace": Kl,
  Delete: xh,
  "Mod-Delete": xh,
  "Mod-a": wx
}, fm = {
  "Ctrl-h": cn.Backspace,
  "Alt-Backspace": cn["Mod-Backspace"],
  "Ctrl-d": cn.Delete,
  "Ctrl-Alt-Backspace": cn["Mod-Delete"],
  "Alt-Delete": cn["Mod-Delete"],
  "Alt-d": cn["Mod-Delete"],
  "Ctrl-a": Cx,
  "Ctrl-e": Sx
};
for (let t in cn)
  fm[t] = cn[t];
const vx = typeof navigator < "u" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : typeof os < "u" && os.platform ? os.platform() == "darwin" : !1, Tx = vx ? fm : cn;
class Mt {
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
    this.match = e, this.match = e, this.handler = typeof n == "string" ? Nx(n) : n, this.undoable = r.undoable !== !1, this.inCode = r.inCode || !1, this.inCodeMark = r.inCodeMark !== !1;
  }
}
function Nx(t) {
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
const Ix = (t, e) => {
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
new Mt(/--$/, "—", { inCodeMark: !1 });
new Mt(/\.\.\.$/, "…", { inCodeMark: !1 });
new Mt(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(")$/, "“", { inCodeMark: !1 });
new Mt(/"$/, "”", { inCodeMark: !1 });
new Mt(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(')$/, "‘", { inCodeMark: !1 });
new Mt(/'$/, "’", { inCodeMark: !1 });
function $u(t, e, n = null, r) {
  return new Mt(t, (i, o, s, l) => {
    let a = n instanceof Function ? n(o) : n, u = i.tr.delete(s, l), c = u.doc.resolve(s), f = c.blockRange(), h = f && Ru(f, e, a);
    if (!h)
      return null;
    u.wrap(f, h);
    let d = u.doc.resolve(s - 1).nodeBefore;
    return d && d.type == e && dl(u.doc, s - 1) && (!r || r(o, d)) && u.join(s - 1), u;
  });
}
function hm(t, e, n = null) {
  return new Mt(t, (r, i, o, s) => {
    let l = r.doc.resolve(o), a = n instanceof Function ? n(i) : n;
    return l.node(-1).canReplaceWith(l.index(-1), l.indexAfter(-1), e) ? r.tr.delete(o, s).setBlockType(o, o, e, a) : null;
  });
}
const Yn = typeof navigator < "u" ? navigator : null, Ch = typeof document < "u" ? document : null, Zn = Yn && Yn.userAgent || "", Ua = /Edge\/(\d+)/.exec(Zn), dm = /MSIE \d/.exec(Zn), Ja = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(Zn), _u = !!(dm || Ja || Ua);
dm ? document.documentMode : Ja ? +Ja[1] : Ua && +Ua[1];
const Ax = !_u && /gecko\/(\d+)/i.test(Zn);
Ax && +(/Firefox\/(\d+)/.exec(Zn) || [0, 0])[1];
const Ga = !_u && /Chrome\/(\d+)/.exec(Zn), Ex = !!Ga;
Ga && +Ga[1];
const Ox = !_u && !!Yn && /Apple Computer/.test(Yn.vendor), Dx = Ox && (/Mobile\/\w+/.test(Zn) || !!Yn && Yn.maxTouchPoints > 2);
Dx || Yn && /Mac/.test(Yn.platform);
const Rx = /Android \d/.test(Zn), Lx = !!Ch && "webkitFontSmoothing" in Ch.documentElement.style;
Lx && +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1];
function Ul(t, e, n, r, i, o) {
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
const Px = new Xe("MILKDOWN_CUSTOM_INPUTRULES");
function zx({ rules: t }) {
  const e = new Be({
    key: Px,
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
        return Ul(n, r, i, o, t, e);
      },
      handleDOMEvents: {
        compositionend: (n) => (setTimeout(() => {
          const { $cursor: r } = n.state.selection;
          r && Ul(n, r.pos, r.pos, "", t, e);
        }), !1),
        keydown: (n, r) => !(Rx && Ex && r.key === "Enter") || n.composing ? !1 : n.someProp(
          "handleKeyDown",
          (i) => i(n, r)
        ) ? (r.preventDefault(), !0) : !1
      },
      handleKeyDown(n, r) {
        if (r.key !== "Enter") return !1;
        const { $cursor: i } = n.state.selection;
        return i ? Ul(n, i.pos, i.pos, `
`, t, e) : !1;
      }
    }
  });
  return e;
}
function Qo(t, e, n = {}) {
  return new Mt(t, (r, i, o, s) => {
    var l, a, u, c;
    const { tr: f } = r, h = i.length;
    let d = i[h - 1], p = i[0], g = [], x;
    const w = {
      group: d,
      fullMatch: p,
      start: o,
      end: s
    }, L = (l = n.updateCaptured) == null ? void 0 : l.call(n, w);
    if (Object.assign(w, L), { group: d, fullMatch: p, start: o, end: s } = w, p === null || (d == null ? void 0 : d.trim()) === "") return null;
    if (d) {
      const A = p.search(/\S/), j = o + p.indexOf(d), H = j + d.length;
      g = (a = f.storedMarks) != null ? a : [], H < s && f.delete(H, s), j > o && f.delete(o + A, j), x = o + A + d.length;
      const M = (u = n.getAttr) == null ? void 0 : u.call(n, i);
      f.addMark(o, x, e.create(M)), f.setStoredMarks(g), (c = n.beforeDispatch) == null || c.call(n, { match: i, start: o, end: s, tr: f });
    }
    return f;
  });
}
function pm(t) {
  return Object.assign(Object.create(t), t).setTime(Date.now());
}
function Bx(t, e) {
  return Array.isArray(t) && t.includes(e.type) || e.type === t;
}
function Fx(t) {
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
function $x(t, e) {
  return Fx((n) => n.type === e)(t);
}
function _x(t) {
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
function Vx(t, e) {
  if (!(t instanceof X)) return;
  const { node: n, $from: r } = t;
  if (Bx(e, n))
    return {
      node: n,
      pos: r.pos,
      start: r.start(r.depth),
      depth: r.depth
    };
}
const Hx = (t, e) => {
  const { selection: n, doc: r } = t;
  if (n instanceof X)
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
var Qn = {
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
}, Ks = {
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
}, jx = typeof navigator < "u" && /Mac/.test(navigator.platform), Wx = typeof navigator < "u" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
for (var _e = 0; _e < 10; _e++) Qn[48 + _e] = Qn[96 + _e] = String(_e);
for (var _e = 1; _e <= 24; _e++) Qn[_e + 111] = "F" + _e;
for (var _e = 65; _e <= 90; _e++)
  Qn[_e] = String.fromCharCode(_e + 32), Ks[_e] = String.fromCharCode(_e);
for (var Jl in Qn) Ks.hasOwnProperty(Jl) || (Ks[Jl] = Qn[Jl]);
function qx(t) {
  var e = jx && t.metaKey && t.shiftKey && !t.ctrlKey && !t.altKey || Wx && t.shiftKey && t.key && t.key.length == 1 || t.key == "Unidentified", n = !e && t.key || (t.shiftKey ? Ks : Qn)[t.keyCode] || t.key || "Unidentified";
  return n == "Esc" && (n = "Escape"), n == "Del" && (n = "Delete"), n == "Left" && (n = "ArrowLeft"), n == "Up" && (n = "ArrowUp"), n == "Right" && (n = "ArrowRight"), n == "Down" && (n = "ArrowDown"), n;
}
const Kx = typeof navigator < "u" && /Mac|iP(hone|[oa]d)/.test(navigator.platform), Ux = typeof navigator < "u" && /Win/.test(navigator.platform);
function Jx(t) {
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
      Kx ? s = !0 : i = !0;
    else
      throw new Error("Unrecognized modifier name: " + a);
  }
  return r && (n = "Alt-" + n), i && (n = "Ctrl-" + n), s && (n = "Meta-" + n), o && (n = "Shift-" + n), n;
}
function Gx(t) {
  let e = /* @__PURE__ */ Object.create(null);
  for (let n in t)
    e[Jx(n)] = t[n];
  return e;
}
function Gl(t, e, n = !0) {
  return e.altKey && (t = "Alt-" + t), e.ctrlKey && (t = "Ctrl-" + t), e.metaKey && (t = "Meta-" + t), n && e.shiftKey && (t = "Shift-" + t), t;
}
function mm(t) {
  return new Be({ props: { handleKeyDown: gm(t) } });
}
function gm(t) {
  let e = Gx(t);
  return function(n, r) {
    let i = qx(r), o, s = e[Gl(i, r)];
    if (s && s(n.state, n.dispatch, n))
      return !0;
    if (i.length == 1 && i != " ") {
      if (r.shiftKey) {
        let l = e[Gl(i, r, !1)];
        if (l && l(n.state, n.dispatch, n))
          return !0;
      }
      if ((r.altKey || r.metaKey || r.ctrlKey) && // Ctrl-Alt may be used for AltGr on Windows
      !(Ux && r.ctrlKey && r.altKey) && (o = Qn[r.keyCode]) && o != i) {
        let l = e[Gl(o, r)];
        if (l && l(n.state, n.dispatch, n))
          return !0;
      }
    }
    return !1;
  };
}
var ym = class {
}, km = class {
  constructor() {
    this.elements = [], this.size = () => this.elements.length, this.top = () => this.elements.at(-1), this.push = (t) => {
      var e;
      (e = this.top()) == null || e.push(t);
    }, this.open = (t) => {
      this.elements.push(t);
    }, this.close = () => {
      const t = this.elements.pop();
      if (!t) throw Jd();
      return t;
    };
  }
}, Yx = class bm extends ym {
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
    return new bm(e, n, r);
  }
}, $t, pi, Po, zo, Bo, mi, gi, Ar, Qx = (Ar = class extends km {
  constructor(n) {
    super();
    q(this, $t);
    q(this, pi);
    q(this, Po);
    q(this, zo);
    q(this, Bo);
    q(this, mi);
    q(this, gi);
    z(this, $t, ce.none), z(this, pi, (r) => r.isText), z(this, Po, (r, i) => {
      if (v(this, pi).call(this, r) && v(this, pi).call(this, i) && ce.sameSet(r.marks, i.marks)) return this.schema.text(r.text + i.text, r.marks);
    }), z(this, zo, (r) => {
      const i = Object.values({
        ...this.schema.nodes,
        ...this.schema.marks
      }).find((o) => o.spec.parseMarkdown.match(r));
      if (!i) throw Ek(r);
      return i;
    }), z(this, Bo, (r) => {
      const i = v(this, zo).call(this, r);
      i.spec.parseMarkdown.runner(this, r, i);
    }), this.injectRoot = (r, i, o) => (this.openNode(i, o), this.next(r.children), this), this.openNode = (r, i) => (this.open(Yx.create(r, [], i)), this), z(this, mi, () => {
      z(this, $t, ce.none);
      const r = this.close();
      return v(this, gi).call(this, r.type, r.attrs, r.content);
    }), this.closeNode = () => {
      try {
        v(this, mi).call(this);
      } catch (r) {
        console.error(r);
      }
      return this;
    }, z(this, gi, (r, i, o) => {
      const s = r.createAndFill(i, o, v(this, $t));
      if (!s) throw Ak(r, i, o);
      return this.push(s), s;
    }), this.addNode = (r, i, o) => {
      try {
        v(this, gi).call(this, r, i, o);
      } catch (s) {
        console.error(s);
      }
      return this;
    }, this.openMark = (r, i) => {
      const o = r.create(i);
      return z(this, $t, o.addToSet(v(this, $t))), this;
    }, this.closeMark = (r) => (z(this, $t, r.removeFromSet(v(this, $t))), this), this.addText = (r) => {
      try {
        const i = this.top();
        if (!i) throw Jd();
        const o = i.pop(), s = this.schema.text(r, v(this, $t));
        if (!o)
          return i.push(s), this;
        const l = v(this, Po).call(this, o, s);
        return l ? (i.push(l), this) : (i.push(o, s), this);
      } catch (i) {
        return console.error(i), this;
      }
    }, this.build = () => {
      let r;
      do
        r = v(this, mi).call(this);
      while (this.size());
      return r;
    }, this.next = (r = []) => ([r].flat().forEach((i) => v(this, Bo).call(this, i)), this), this.toDoc = () => this.build(), this.run = (r, i) => {
      const o = r.runSync(r.parse(i), i);
      return this.next(o), this;
    }, this.schema = n;
  }
}, $t = new WeakMap(), pi = new WeakMap(), Po = new WeakMap(), zo = new WeakMap(), Bo = new WeakMap(), mi = new WeakMap(), gi = new WeakMap(), Ar.create = (n, r) => {
  const i = new Ar(n);
  return (o) => (i.run(r, o), i.toDoc());
}, Ar), Er, Sh = (Er = class extends ym {
  constructor(e, n, r, i = {}) {
    super(), this.type = e, this.children = n, this.value = r, this.props = i, this.push = (o, ...s) => {
      this.children || (this.children = []), this.children.push(o, ...s);
    }, this.pop = () => {
      var o;
      return (o = this.children) == null ? void 0 : o.pop();
    };
  }
}, Er.create = (e, n, r, i = {}) => new Er(e, n, r, i), Er), Xx = (t) => Object.prototype.hasOwnProperty.call(t, "size"), Ut, yi, Fo, $o, ki, _o, bi, Vo, Ho, pr, _n, jo, wi, Or, Zx = (Or = class extends km {
  constructor(n) {
    super();
    q(this, Ut);
    q(this, yi);
    q(this, Fo);
    q(this, $o);
    q(this, ki);
    q(this, _o);
    q(this, bi);
    q(this, Vo);
    q(this, Ho);
    q(this, pr);
    q(this, _n);
    q(this, jo);
    q(this, wi);
    z(this, Ut, ce.none), z(this, yi, (r) => {
      const i = Object.values({
        ...this.schema.nodes,
        ...this.schema.marks
      }).find((o) => o.spec.toMarkdown.match(r));
      if (!i) throw Ok(r.type);
      return i;
    }), z(this, Fo, (r) => v(this, yi).call(this, r).spec.toMarkdown.runner(this, r)), z(this, $o, (r, i) => v(this, yi).call(this, r).spec.toMarkdown.runner(this, r, i)), z(this, ki, (r) => {
      const { marks: i } = r, o = (s) => s.type.spec.priority ?? 50;
      [...i].sort((s, l) => o(s) - o(l)).every((s) => !v(this, $o).call(this, s, r)) && v(this, Fo).call(this, r), i.forEach((s) => v(this, wi).call(this, s));
    }), z(this, _o, (r, i) => {
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
    }), z(this, bi, (r) => {
      const { children: i } = r;
      return i && (r.children = i.reduce((o, s, l) => {
        if (l === 0) return [s];
        const a = o.at(-1);
        if (a && a.isMark && s.isMark) {
          s = v(this, _o).call(this, s, a.type);
          const { children: u, ...c } = s, { children: f, ...h } = a;
          if (s.type === a.type && u && f && JSON.stringify(c) === JSON.stringify(h)) {
            const d = {
              ...h,
              children: [...f, ...u]
            };
            return o.slice(0, -1).concat(v(this, bi).call(this, d));
          }
        }
        return o.concat(s);
      }, [])), r;
    }), z(this, Vo, (r) => {
      const i = {
        ...r.props,
        type: r.type
      };
      return r.children && (i.children = r.children), r.value && (i.value = r.value), i;
    }), this.openNode = (r, i, o) => (this.open(Sh.create(r, void 0, i, o)), this), z(this, Ho, (r, i) => {
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
          const p = h.value, g = p.trimEnd();
          s = p.slice(g.length), h.value = g;
        }
        if (d && d.value.startsWith(" ")) {
          const p = d.value, g = p.trimStart();
          o = p.slice(0, p.length - g.length), d.value = g;
        }
      }
      o.length && v(this, _n).call(this, "text", void 0, o);
      const f = i();
      return s.length && v(this, _n).call(this, "text", void 0, s), f;
    }), z(this, pr, (r = !1) => {
      const i = this.close(), o = () => v(this, _n).call(this, i.type, i.children, i.value, i.props);
      return r ? v(this, Ho).call(this, i, o) : o();
    }), this.closeNode = () => (v(this, pr).call(this), this), z(this, _n, (r, i, o, s) => {
      const l = Sh.create(r, i, o, s), a = v(this, bi).call(this, v(this, Vo).call(this, l));
      return this.push(a), a;
    }), this.addNode = (r, i, o, s) => (v(this, _n).call(this, r, i, o, s), this), z(this, jo, (r, i, o, s) => r.isInSet(v(this, Ut)) ? this : (z(this, Ut, r.addToSet(v(this, Ut))), this.openNode(i, o, {
      ...s,
      isMark: !0
    }))), z(this, wi, (r) => {
      r.isInSet(v(this, Ut)) && (z(this, Ut, r.type.removeFromSet(v(this, Ut))), v(this, pr).call(this, !0));
    }), this.withMark = (r, i, o, s) => (v(this, jo).call(this, r, i, o, s), this), this.closeMark = (r) => (v(this, wi).call(this, r), this), this.build = () => {
      let r = null;
      do
        r = v(this, pr).call(this);
      while (this.size());
      return r;
    }, this.next = (r) => Xx(r) ? (r.forEach((i) => {
      v(this, ki).call(this, i);
    }), this) : (v(this, ki).call(this, r), this), this.toString = (r) => r.stringify(this.build()), this.run = (r) => (this.next(r), this), this.schema = n;
  }
}, Ut = new WeakMap(), yi = new WeakMap(), Fo = new WeakMap(), $o = new WeakMap(), ki = new WeakMap(), _o = new WeakMap(), bi = new WeakMap(), Vo = new WeakMap(), Ho = new WeakMap(), pr = new WeakMap(), _n = new WeakMap(), jo = new WeakMap(), wi = new WeakMap(), Or.create = (n, r) => {
  const i = new Or(n);
  return (o) => (i.run(o), i.toString(r));
}, Or);
const Ve = function(t) {
  for (var e = 0; ; e++)
    if (t = t.previousSibling, !t)
      return e;
}, Ii = function(t) {
  let e = t.assignedSlot || t.parentNode;
  return e && e.nodeType == 11 ? e.host : e;
};
let Ya = null;
const un = function(t, e, n) {
  let r = Ya || (Ya = document.createRange());
  return r.setEnd(t, n ?? t.nodeValue.length), r.setStart(t, e || 0), r;
}, eC = function() {
  Ya = null;
}, Pr = function(t, e, n, r) {
  return n && (Mh(t, e, n, r, -1) || Mh(t, e, n, r, 1));
}, tC = /^(img|br|input|textarea|hr)$/i;
function Mh(t, e, n, r, i) {
  for (var o; ; ) {
    if (t == n && e == r)
      return !0;
    if (e == (i < 0 ? 0 : Ot(t))) {
      let s = t.parentNode;
      if (!s || s.nodeType != 1 || Xo(t) || tC.test(t.nodeName) || t.contentEditable == "false")
        return !1;
      e = Ve(t) + (i < 0 ? 0 : 1), t = s;
    } else if (t.nodeType == 1) {
      let s = t.childNodes[e + (i < 0 ? -1 : 0)];
      if (s.nodeType == 1 && s.contentEditable == "false")
        if (!((o = s.pmViewDesc) === null || o === void 0) && o.ignoreForSelection)
          e += i;
        else
          return !1;
      else
        t = s, e = i < 0 ? Ot(t) : 0;
    } else
      return !1;
  }
}
function Ot(t) {
  return t.nodeType == 3 ? t.nodeValue.length : t.childNodes.length;
}
function nC(t, e) {
  for (; ; ) {
    if (t.nodeType == 3 && e)
      return t;
    if (t.nodeType == 1 && e > 0) {
      if (t.contentEditable == "false")
        return null;
      t = t.childNodes[e - 1], e = Ot(t);
    } else if (t.parentNode && !Xo(t))
      e = Ve(t), t = t.parentNode;
    else
      return null;
  }
}
function rC(t, e) {
  for (; ; ) {
    if (t.nodeType == 3 && e < t.nodeValue.length)
      return t;
    if (t.nodeType == 1 && e < t.childNodes.length) {
      if (t.contentEditable == "false")
        return null;
      t = t.childNodes[e], e = 0;
    } else if (t.parentNode && !Xo(t))
      e = Ve(t) + 1, t = t.parentNode;
    else
      return null;
  }
}
function iC(t, e, n) {
  for (let r = e == 0, i = e == Ot(t); r || i; ) {
    if (t == n)
      return !0;
    let o = Ve(t);
    if (t = t.parentNode, !t)
      return !1;
    r = r && o == 0, i = i && o == Ot(t);
  }
}
function Xo(t) {
  let e;
  for (let n = t; n && !(e = n.pmViewDesc); n = n.parentNode)
    ;
  return e && e.node && e.node.isBlock && (e.dom == t || e.contentDOM == t);
}
const gl = function(t) {
  return t.focusNode && Pr(t.focusNode, t.focusOffset, t.anchorNode, t.anchorOffset);
};
function ar(t, e) {
  let n = document.createEvent("Event");
  return n.initEvent("keydown", !0, !0), n.keyCode = t, n.key = n.code = e, n;
}
function oC(t) {
  let e = t.activeElement;
  for (; e && e.shadowRoot; )
    e = e.shadowRoot.activeElement;
  return e;
}
function sC(t, e, n) {
  if (t.caretPositionFromPoint)
    try {
      let r = t.caretPositionFromPoint(e, n);
      if (r)
        return { node: r.offsetNode, offset: Math.min(Ot(r.offsetNode), r.offset) };
    } catch {
    }
  if (t.caretRangeFromPoint) {
    let r = t.caretRangeFromPoint(e, n);
    if (r)
      return { node: r.startContainer, offset: Math.min(Ot(r.startContainer), r.startOffset) };
  }
}
const Gt = typeof navigator < "u" ? navigator : null, vh = typeof document < "u" ? document : null, er = Gt && Gt.userAgent || "", Qa = /Edge\/(\d+)/.exec(er), wm = /MSIE \d/.exec(er), Xa = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(er), ht = !!(wm || Xa || Qa), qn = wm ? document.documentMode : Xa ? +Xa[1] : Qa ? +Qa[1] : 0, Dt = !ht && /gecko\/(\d+)/i.test(er);
Dt && +(/Firefox\/(\d+)/.exec(er) || [0, 0])[1];
const Za = !ht && /Chrome\/(\d+)/.exec(er), He = !!Za, xm = Za ? +Za[1] : 0, Ye = !ht && !!Gt && /Apple Computer/.test(Gt.vendor), Ai = Ye && (/Mobile\/\w+/.test(er) || !!Gt && Gt.maxTouchPoints > 2), At = Ai || (Gt ? /Mac/.test(Gt.platform) : !1), Cm = Gt ? /Win/.test(Gt.platform) : !1, bn = /Android \d/.test(er), Zo = !!vh && "webkitFontSmoothing" in vh.documentElement.style, lC = Zo ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0;
function aC(t) {
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
function sn(t, e) {
  return typeof t == "number" ? t : t[e];
}
function uC(t) {
  let e = t.getBoundingClientRect(), n = e.width / t.offsetWidth || 1, r = e.height / t.offsetHeight || 1;
  return {
    left: e.left,
    right: e.left + t.clientWidth * n,
    top: e.top,
    bottom: e.top + t.clientHeight * r
  };
}
function Th(t, e, n) {
  let r = t.someProp("scrollThreshold") || 0, i = t.someProp("scrollMargin") || 5, o = t.dom.ownerDocument;
  for (let s = n || t.dom; s; ) {
    if (s.nodeType != 1) {
      s = Ii(s);
      continue;
    }
    let l = s, a = l == o.body, u = a ? aC(o) : uC(l), c = 0, f = 0;
    if (e.top < u.top + sn(r, "top") ? f = -(u.top - e.top + sn(i, "top")) : e.bottom > u.bottom - sn(r, "bottom") && (f = e.bottom - e.top > u.bottom - u.top ? e.top + sn(i, "top") - u.top : e.bottom - u.bottom + sn(i, "bottom")), e.left < u.left + sn(r, "left") ? c = -(u.left - e.left + sn(i, "left")) : e.right > u.right - sn(r, "right") && (c = e.right - u.right + sn(i, "right")), c || f)
      if (a)
        o.defaultView.scrollBy(c, f);
      else {
        let d = l.scrollLeft, p = l.scrollTop;
        f && (l.scrollTop += f), c && (l.scrollLeft += c);
        let g = l.scrollLeft - d, x = l.scrollTop - p;
        e = { left: e.left - g, top: e.top - x, right: e.right - g, bottom: e.bottom - x };
      }
    let h = a ? "fixed" : getComputedStyle(s).position;
    if (/^(fixed|sticky)$/.test(h))
      break;
    s = h == "absolute" ? s.offsetParent : Ii(s);
  }
}
function cC(t) {
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
  return { refDOM: r, refTop: i, stack: Sm(t.dom) };
}
function Sm(t) {
  let e = [], n = t.ownerDocument;
  for (let r = t; r && (e.push({ dom: r, top: r.scrollTop, left: r.scrollLeft }), t != n); r = Ii(r))
    ;
  return e;
}
function fC({ refDOM: t, refTop: e, stack: n }) {
  let r = t ? t.getBoundingClientRect().top : 0;
  Mm(n, r == 0 ? 0 : r - e);
}
function Mm(t, e) {
  for (let n = 0; n < t.length; n++) {
    let { dom: r, top: i, left: o } = t[n];
    r.scrollTop != i + e && (r.scrollTop = i + e), r.scrollLeft != o && (r.scrollLeft = o);
  }
}
let qr = null;
function hC(t) {
  if (t.setActive)
    return t.setActive();
  if (qr)
    return t.focus(qr);
  let e = Sm(t);
  t.focus(qr == null ? {
    get preventScroll() {
      return qr = { preventScroll: !0 }, !0;
    }
  } : void 0), qr || (qr = !1, Mm(e, 0));
}
function vm(t, e) {
  let n, r = 2e8, i, o = 0, s = e.top, l = e.top, a, u;
  for (let c = t.firstChild, f = 0; c; c = c.nextSibling, f++) {
    let h;
    if (c.nodeType == 1)
      h = c.getClientRects();
    else if (c.nodeType == 3)
      h = un(c).getClientRects();
    else
      continue;
    for (let d = 0; d < h.length; d++) {
      let p = h[d];
      if (p.top <= s && p.bottom >= l) {
        s = Math.max(p.bottom, s), l = Math.min(p.top, l);
        let g = p.left > e.left ? p.left - e.left : p.right < e.left ? e.left - p.right : 0;
        if (g < r) {
          n = c, r = g, i = g && n.nodeType == 3 ? {
            left: p.right < e.left ? p.right : p.left,
            top: e.top
          } : e, c.nodeType == 1 && g && (o = f + (e.left >= (p.left + p.right) / 2 ? 1 : 0));
          continue;
        }
      } else p.top > e.top && !a && p.left <= e.left && p.right >= e.left && (a = c, u = { left: Math.max(p.left, Math.min(p.right, e.left)), top: p.top });
      !n && (e.left >= p.right && e.top >= p.top || e.left >= p.left && e.top >= p.bottom) && (o = f + 1);
    }
  }
  return !n && a && (n = a, i = u, r = 0), n && n.nodeType == 3 ? dC(n, i) : !n || r && n.nodeType == 1 ? { node: t, offset: o } : vm(n, i);
}
function dC(t, e) {
  let n = t.nodeValue.length, r = document.createRange(), i;
  for (let o = 0; o < n; o++) {
    r.setEnd(t, o + 1), r.setStart(t, o);
    let s = Dn(r, 1);
    if (s.top != s.bottom && Vu(e, s)) {
      i = { node: t, offset: o + (e.left >= (s.left + s.right) / 2 ? 1 : 0) };
      break;
    }
  }
  return r.detach(), i || { node: t, offset: 0 };
}
function Vu(t, e) {
  return t.left >= e.left - 1 && t.left <= e.right + 1 && t.top >= e.top - 1 && t.top <= e.bottom + 1;
}
function pC(t, e) {
  let n = t.parentNode;
  return n && /^li$/i.test(n.nodeName) && e.left < t.getBoundingClientRect().left ? n : t;
}
function mC(t, e, n) {
  let { node: r, offset: i } = vm(e, n), o = -1;
  if (r.nodeType == 1 && !r.firstChild) {
    let s = r.getBoundingClientRect();
    o = s.left != s.right && n.left > (s.left + s.right) / 2 ? 1 : -1;
  }
  return t.docView.posFromDOM(r, i, o);
}
function gC(t, e, n, r) {
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
function Tm(t, e, n) {
  let r = t.childNodes.length;
  if (r && n.top < n.bottom)
    for (let i = Math.max(0, Math.min(r - 1, Math.floor(r * (e.top - n.top) / (n.bottom - n.top)) - 2)), o = i; ; ) {
      let s = t.childNodes[o];
      if (s.nodeType == 1) {
        let l = s.getClientRects();
        for (let a = 0; a < l.length; a++) {
          let u = l[a];
          if (Vu(e, u))
            return Tm(s, e, u);
        }
      }
      if ((o = (o + 1) % r) == i)
        break;
    }
  return t;
}
function yC(t, e) {
  let n = t.dom.ownerDocument, r, i = 0, o = sC(n, e.left, e.top);
  o && ({ node: r, offset: i } = o);
  let s = (t.root.elementFromPoint ? t.root : n).elementFromPoint(e.left, e.top), l;
  if (!s || !t.dom.contains(s.nodeType != 1 ? s.parentNode : s)) {
    let u = t.dom.getBoundingClientRect();
    if (!Vu(e, u) || (s = Tm(t.dom, e, u), !s))
      return null;
  }
  if (Ye)
    for (let u = s; r && u; u = Ii(u))
      u.draggable && (r = void 0);
  if (s = pC(s, e), r) {
    if (Dt && r.nodeType == 1 && (i = Math.min(i, r.childNodes.length), i < r.childNodes.length)) {
      let c = r.childNodes[i], f;
      c.nodeName == "IMG" && (f = c.getBoundingClientRect()).right <= e.left && f.bottom > e.top && i++;
    }
    let u;
    Zo && i && r.nodeType == 1 && (u = r.childNodes[i - 1]).nodeType == 1 && u.contentEditable == "false" && u.getBoundingClientRect().top >= e.top && i--, r == t.dom && i == r.childNodes.length - 1 && r.lastChild.nodeType == 1 && e.top > r.lastChild.getBoundingClientRect().bottom ? l = t.state.doc.content.size : (i == 0 || r.nodeType != 1 || r.childNodes[i - 1].nodeName != "BR") && (l = gC(t, r, i, e));
  }
  l == null && (l = mC(t, s, e));
  let a = t.docView.nearestDesc(s, !0);
  return { pos: l, inside: a ? a.posAtStart - a.border : -1 };
}
function Nh(t) {
  return t.top < t.bottom || t.left < t.right;
}
function Dn(t, e) {
  let n = t.getClientRects();
  if (n.length) {
    let r = n[e < 0 ? 0 : n.length - 1];
    if (Nh(r))
      return r;
  }
  return Array.prototype.find.call(n, Nh) || t.getBoundingClientRect();
}
const kC = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
function Nm(t, e, n) {
  let { node: r, offset: i, atom: o } = t.docView.domFromPos(e, n < 0 ? -1 : 1), s = Zo || Dt;
  if (r.nodeType == 3)
    if (s && (kC.test(r.nodeValue) || (n < 0 ? !i : i == r.nodeValue.length))) {
      let a = Dn(un(r, i, i), n);
      if (Dt && i && /\s/.test(r.nodeValue[i - 1]) && i < r.nodeValue.length) {
        let u = Dn(un(r, i - 1, i - 1), -1);
        if (u.top == a.top) {
          let c = Dn(un(r, i, i + 1), -1);
          if (c.top != a.top)
            return Qi(c, c.left < u.left);
        }
      }
      return a;
    } else {
      let a = i, u = i, c = n < 0 ? 1 : -1;
      return n < 0 && !i ? (u++, c = -1) : n >= 0 && i == r.nodeValue.length ? (a--, c = 1) : n < 0 ? a-- : u++, Qi(Dn(un(r, a, u), c), c < 0);
    }
  if (!t.state.doc.resolve(e - (o || 0)).parent.inlineContent) {
    if (o == null && i && (n < 0 || i == Ot(r))) {
      let a = r.childNodes[i - 1];
      if (a.nodeType == 1)
        return Yl(a.getBoundingClientRect(), !1);
    }
    if (o == null && i < Ot(r)) {
      let a = r.childNodes[i];
      if (a.nodeType == 1)
        return Yl(a.getBoundingClientRect(), !0);
    }
    return Yl(r.getBoundingClientRect(), n >= 0);
  }
  if (o == null && i && (n < 0 || i == Ot(r))) {
    let a = r.childNodes[i - 1], u = a.nodeType == 3 ? un(a, Ot(a) - (s ? 0 : 1)) : a.nodeType == 1 && (a.nodeName != "BR" || !a.nextSibling) ? a : null;
    if (u)
      return Qi(Dn(u, 1), !1);
  }
  if (o == null && i < Ot(r)) {
    let a = r.childNodes[i];
    for (; a.pmViewDesc && a.pmViewDesc.ignoreForCoords; )
      a = a.nextSibling;
    let u = a ? a.nodeType == 3 ? un(a, 0, s ? 0 : 1) : a.nodeType == 1 ? a : null : null;
    if (u)
      return Qi(Dn(u, -1), !0);
  }
  return Qi(Dn(r.nodeType == 3 ? un(r) : r, -n), n >= 0);
}
function Qi(t, e) {
  if (t.width == 0)
    return t;
  let n = e ? t.left : t.right;
  return { top: t.top, bottom: t.bottom, left: n, right: n };
}
function Yl(t, e) {
  if (t.height == 0)
    return t;
  let n = e ? t.top : t.bottom;
  return { top: n, bottom: n, left: t.left, right: t.right };
}
function Im(t, e, n) {
  let r = t.state, i = t.root.activeElement;
  r != e && t.updateState(e), i != t.dom && t.focus();
  try {
    return n();
  } finally {
    r != e && t.updateState(r), i != t.dom && i && i.focus();
  }
}
function bC(t, e, n) {
  let r = e.selection, i = n == "up" ? r.$from : r.$to;
  return Im(t, e, () => {
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
    let s = Nm(t, i.pos, 1);
    for (let l = o.firstChild; l; l = l.nextSibling) {
      let a;
      if (l.nodeType == 1)
        a = l.getClientRects();
      else if (l.nodeType == 3)
        a = un(l, 0, l.nodeValue.length).getClientRects();
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
const wC = /[\u0590-\u08ac]/;
function xC(t, e, n) {
  let { $head: r } = e.selection;
  if (!r.parent.isTextblock)
    return !1;
  let i = r.parentOffset, o = !i, s = i == r.parent.content.size, l = t.domSelection();
  return l ? !wC.test(r.parent.textContent) || !l.modify ? n == "left" || n == "backward" ? o : s : Im(t, e, () => {
    let { focusNode: a, focusOffset: u, anchorNode: c, anchorOffset: f } = t.domSelectionRange(), h = l.caretBidiLevel;
    l.modify("move", n, "character");
    let d = r.depth ? t.docView.domAfterPos(r.before()) : t.dom, { focusNode: p, focusOffset: g } = t.domSelectionRange(), x = p && !d.contains(p.nodeType == 1 ? p : p.parentNode) || a == p && u == g;
    try {
      l.collapse(c, f), a && (a != c || u != f) && l.extend && l.extend(a, u);
    } catch {
    }
    return h != null && (l.caretBidiLevel = h), x;
  }) : r.pos == r.start() || r.pos == r.end();
}
let Ih = null, Ah = null, Eh = !1;
function CC(t, e, n) {
  return Ih == e && Ah == n ? Eh : (Ih = e, Ah = n, Eh = n == "up" || n == "down" ? bC(t, e, n) : xC(t, e, n));
}
const Rt = 0, Oh = 1, ur = 2, Yt = 3;
class es {
  constructor(e, n, r, i) {
    this.parent = e, this.children = n, this.dom = r, this.contentDOM = i, this.dirty = Rt, r.pmViewDesc = this;
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
      i = n > Ve(this.contentDOM);
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
      if (l > e || s instanceof Em) {
        i = e - o;
        break;
      }
      o = l;
    }
    if (i)
      return this.children[r].domFromPos(i - this.children[r].border, n);
    for (let o; r && !(o = this.children[r - 1]).size && o instanceof Am && o.side >= 0; r--)
      ;
    if (n <= 0) {
      let o, s = !0;
      for (; o = r ? this.children[r - 1] : null, !(!o || o.dom.parentNode == this.contentDOM); r--, s = !1)
        ;
      return o && n && s && !o.border && !o.domAtom ? o.domFromPos(o.size, n) : { node: this.contentDOM, offset: o ? Ve(o.dom) + 1 : 0 };
    } else {
      let o, s = !0;
      for (; o = r < this.children.length ? this.children[r] : null, !(!o || o.dom.parentNode == this.contentDOM); r++, s = !1)
        ;
      return o && s && !o.border && !o.domAtom ? o.domFromPos(0, n) : { node: this.contentDOM, offset: o ? Ve(o.dom) : this.contentDOM.childNodes.length };
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
            i = Ve(h.dom) + 1;
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
            o = Ve(f.dom);
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
      let g = this.children[d], x = p + g.size;
      if (o > p && s < x)
        return g.setSelection(e - p - g.border, n - p - g.border, r, i);
      p = x;
    }
    let l = this.domFromPos(e, e ? -1 : 1), a = n == e ? l : this.domFromPos(n, n ? -1 : 1), u = r.root.getSelection(), c = r.domSelectionRange(), f = !1;
    if ((Dt || Ye) && e == n) {
      let { node: d, offset: p } = l;
      if (d.nodeType == 3) {
        if (f = !!(p && d.nodeValue[p - 1] == `
`), f && p == d.nodeValue.length)
          for (let g = d, x; g; g = g.parentNode) {
            if (x = g.nextSibling) {
              x.nodeName == "BR" && (l = a = { node: x.parentNode, offset: Ve(x) + 1 });
              break;
            }
            let w = g.pmViewDesc;
            if (w && w.node && w.node.isBlock)
              break;
          }
      } else {
        let g = d.childNodes[p - 1];
        f = g && (g.nodeName == "BR" || g.contentEditable == "false");
      }
    }
    if (Dt && c.focusNode && c.focusNode != a.node && c.focusNode.nodeType == 1) {
      let d = c.focusNode.childNodes[c.focusOffset];
      d && d.contentEditable == "false" && (i = !0);
    }
    if (!(i || f && Ye) && Pr(l.node, l.offset, c.anchorNode, c.anchorOffset) && Pr(a.node, a.offset, c.focusNode, c.focusOffset))
      return;
    let h = !1;
    if ((u.extend || e == n) && !(f && Dt)) {
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
          this.dirty = e == r || n == s ? ur : Oh, e == l && n == a && (o.contentLost || o.dom.parentNode != this.contentDOM) ? o.dirty = Yt : o.markDirty(e - l, n - l);
          return;
        } else
          o.dirty = o.dom == o.contentDOM && o.dom.parentNode == this.contentDOM && !o.children.length ? ur : Yt;
      }
      r = s;
    }
    this.dirty = ur;
  }
  markParentsDirty() {
    let e = 1;
    for (let n = this.parent; n; n = n.parent, e++) {
      let r = e == 1 ? ur : Oh;
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
class Am extends es {
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
    return this.dirty == Rt && e.type.eq(this.widget.type);
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
class SC extends es {
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
class zr extends es {
  constructor(e, n, r, i, o) {
    super(e, [], r, i), this.mark = n, this.spec = o;
  }
  static create(e, n, r, i) {
    let o = i.nodeViews[n.type.name], s = o && o(n, i, r);
    return (!s || !s.dom) && (s = zi.renderSpec(document, n.type.spec.toDOM(n, r), null, n.attrs)), new zr(e, n, s.dom, s.contentDOM || s.dom, s);
  }
  parseRule() {
    return this.dirty & Yt || this.mark.type.spec.reparseInView ? null : { mark: this.mark.type.name, attrs: this.mark.attrs, contentElement: this.contentDOM };
  }
  matchesMark(e) {
    return this.dirty != Yt && this.mark.eq(e);
  }
  markDirty(e, n) {
    if (super.markDirty(e, n), this.dirty != Rt) {
      let r = this.parent;
      for (; !r.node; )
        r = r.parent;
      r.dirty < this.dirty && (r.dirty = this.dirty), this.dirty = Rt;
    }
  }
  slice(e, n, r) {
    let i = zr.create(this.parent, this.mark, !0, r), o = this.children, s = this.size;
    n < s && (o = tu(o, n, s, r)), e > 0 && (o = tu(o, 0, e, r));
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
class Kn extends es {
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
    } else c || ({ dom: c, contentDOM: f } = zi.renderSpec(document, n.type.spec.toDOM(n), null, n.attrs));
    !f && !n.isText && c.nodeName != "BR" && (c.hasAttribute("contenteditable") || (c.contentEditable = "false"), n.type.spec.draggable && (c.draggable = !0));
    let h = c;
    return c = Rm(c, r, n), u ? a = new MC(e, n, r, i, c, f || null, h, u, o, s + 1) : n.isText ? new yl(e, n, r, i, c, h, o) : new Kn(e, n, r, i, c, f || null, h, o, s + 1);
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
    return this.dirty == Rt && e.eq(this.node) && Us(n, this.outerDeco) && r.eq(this.innerDeco);
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
    let r = this.node.inlineContent, i = n, o = e.composing ? this.localCompositionInfo(e, n) : null, s = o && o.pos > -1 ? o : null, l = o && o.pos < 0, a = new TC(this, s && s.node, e);
    AC(this.node, this.innerDeco, (u, c, f) => {
      u.spec.marks ? a.syncToMarks(u.spec.marks, r, e, c) : u.type.side >= 0 && !f && a.syncToMarks(c == this.node.childCount ? ce.none : this.node.child(c).marks, r, e, c), a.placeWidget(u, e, i);
    }, (u, c, f, h) => {
      a.syncToMarks(u.marks, r, e, h);
      let d;
      a.findNodeMatch(u, c, f, h) || l && e.state.selection.from > i && e.state.selection.to < i + u.nodeSize && (d = a.findIndexWithChild(o.node)) > -1 && a.updateNodeAt(u, c, f, d, e) || a.updateNextNode(u, c, f, e, h, i) || a.addNode(u, c, f, e, i), i += u.nodeSize;
    }), a.syncToMarks([], r, e, 0), this.node.isTextblock && a.addTextblockHacks(), a.destroyRest(), (a.changed || this.dirty == ur) && (s && this.protectLocalComposition(e, s), Om(this.contentDOM, this.children, e), Ai && EC(this.dom));
  }
  localCompositionInfo(e, n) {
    let { from: r, to: i } = e.state.selection;
    if (!(e.state.selection instanceof Y) || r < n || i > n + this.node.content.size)
      return null;
    let o = e.input.compositionNode;
    if (!o || !this.dom.contains(o.parentNode))
      return null;
    if (this.node.inlineContent) {
      let s = o.nodeValue, l = OC(this.node.content, s, r - n, i - n);
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
    let s = new SC(this, o, n, i);
    e.input.compositionNodes.push(s), this.children = tu(this.children, r, r + i.length, e, s);
  }
  // If this desc must be updated to match the given node decoration,
  // do so and return true.
  update(e, n, r, i) {
    return this.dirty == Yt || !e.sameMarkup(this.node) ? !1 : (this.updateInner(e, n, r, i), !0);
  }
  updateInner(e, n, r, i) {
    this.updateOuterDeco(n), this.node = e, this.innerDeco = r, this.contentDOM && this.updateChildren(i, this.posAtStart), this.dirty = Rt;
  }
  updateOuterDeco(e) {
    if (Us(e, this.outerDeco))
      return;
    let n = this.nodeDOM.nodeType != 1, r = this.dom;
    this.dom = Dm(this.dom, this.nodeDOM, eu(this.outerDeco, this.node, n), eu(e, this.node, n)), this.dom != r && (r.pmViewDesc = void 0, this.dom.pmViewDesc = this), this.outerDeco = e;
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
function Dh(t, e, n, r, i) {
  Rm(r, e, t);
  let o = new Kn(void 0, t, e, n, r, r, r, i, 0);
  return o.contentDOM && o.updateChildren(i, 0), o;
}
class yl extends Kn {
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
    return this.dirty == Yt || this.dirty != Rt && !this.inParent() || !e.sameMarkup(this.node) ? !1 : (this.updateOuterDeco(n), (this.dirty != Rt || e.text != this.node.text) && e.text != this.nodeDOM.nodeValue && (this.nodeDOM.nodeValue = e.text, i.trackWrites == this.nodeDOM && (i.trackWrites = null)), this.node = e, this.dirty = Rt, !0);
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
    return new yl(this.parent, i, this.outerDeco, this.innerDeco, o, o, r);
  }
  markDirty(e, n) {
    super.markDirty(e, n), this.dom != this.nodeDOM && (e == 0 || n == this.nodeDOM.nodeValue.length) && (this.dirty = Yt);
  }
  get domAtom() {
    return !1;
  }
  isText(e) {
    return this.node.text == e;
  }
}
class Em extends es {
  parseRule() {
    return { ignore: !0 };
  }
  matchesHack(e) {
    return this.dirty == Rt && this.dom.nodeName == e;
  }
  get domAtom() {
    return !0;
  }
  get ignoreForCoords() {
    return this.dom.nodeName == "IMG";
  }
}
class MC extends Kn {
  constructor(e, n, r, i, o, s, l, a, u, c) {
    super(e, n, r, i, o, s, l, u, c), this.spec = a;
  }
  // A custom `update` method gets to decide whether the update goes
  // through. If it does, and there's a `contentDOM` node, our logic
  // updates the children.
  update(e, n, r, i) {
    if (this.dirty == Yt)
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
function Om(t, e, n) {
  let r = t.firstChild, i = !1;
  for (let o = 0; o < e.length; o++) {
    let s = e[o], l = s.dom;
    if (l.parentNode == t) {
      for (; l != r; )
        r = Rh(r), i = !0;
      r = r.nextSibling;
    } else
      i = !0, t.insertBefore(l, r);
    if (s instanceof zr) {
      let a = r ? r.previousSibling : t.lastChild;
      Om(s.contentDOM, s.children, n), r = a ? a.nextSibling : t.firstChild;
    }
  }
  for (; r; )
    r = Rh(r), i = !0;
  i && n.trackWrites == t && (n.trackWrites = null);
}
const ao = function(t) {
  t && (this.nodeName = t);
};
ao.prototype = /* @__PURE__ */ Object.create(null);
const cr = [new ao()];
function eu(t, e, n) {
  if (t.length == 0)
    return cr;
  let r = n ? cr[0] : new ao(), i = [r];
  for (let o = 0; o < t.length; o++) {
    let s = t[o].type.attrs;
    if (s) {
      s.nodeName && i.push(r = new ao(s.nodeName));
      for (let l in s) {
        let a = s[l];
        a != null && (n && i.length == 1 && i.push(r = new ao(e.isInline ? "span" : "div")), l == "class" ? r.class = (r.class ? r.class + " " : "") + a : l == "style" ? r.style = (r.style ? r.style + ";" : "") + a : l != "nodeName" && (r[l] = a));
      }
    }
  }
  return i;
}
function Dm(t, e, n, r) {
  if (n == cr && r == cr)
    return e;
  let i = e;
  for (let o = 0; o < r.length; o++) {
    let s = r[o], l = n[o];
    if (o) {
      let a;
      l && l.nodeName == s.nodeName && i != t && (a = i.parentNode) && a.nodeName.toLowerCase() == s.nodeName || (a = document.createElement(s.nodeName), a.pmIsDeco = !0, a.appendChild(i), l = cr[0]), i = a;
    }
    vC(i, l || cr[0], s);
  }
  return i;
}
function vC(t, e, n) {
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
function Rm(t, e, n) {
  return Dm(t, t, cr, eu(e, n, t.nodeType != 1));
}
function Us(t, e) {
  if (t.length != e.length)
    return !1;
  for (let n = 0; n < t.length; n++)
    if (!t[n].type.eq(e[n].type))
      return !1;
  return !0;
}
function Rh(t) {
  let e = t.nextSibling;
  return t.parentNode.removeChild(t), e;
}
class TC {
  constructor(e, n, r) {
    this.lock = n, this.view = r, this.index = 0, this.stack = [], this.changed = !1, this.top = e, this.preMatch = NC(e.node.content, e);
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
      this.destroyRest(), this.top.dirty = Rt, this.index = this.stack.pop(), this.top = this.stack.pop(), s--;
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
        let c = zr.create(this.top, e[s], n, r);
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
    return s.dirty == Yt && s.dom == s.contentDOM && (s.dirty = ur), s.update(e, n, r, o) ? (this.destroyBetween(this.index, i), this.index++, !0) : !1;
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
      if (a instanceof Kn) {
        let u = this.preMatch.matched.get(a);
        if (u != null && u != o)
          return !1;
        let c = a.dom, f, h = this.isLocked(c) && !(e.isText && a.node && a.node.isText && a.nodeDOM.nodeValue == e.text && a.dirty != Yt && Us(n, a.outerDeco));
        if (!h && a.update(e, n, r, i))
          return this.destroyBetween(this.index, l), a.dom != c && (this.changed = !0), this.index++, !0;
        if (!h && (f = this.recreateWrapper(a, e, n, r, i, s)))
          return this.destroyBetween(this.index, l), this.top.children[this.index] = f, f.contentDOM && (f.dirty = ur, f.updateChildren(i, s + 1), f.dirty = Rt), this.changed = !0, this.index++, !0;
        break;
      }
    }
    return !1;
  }
  // When a node with content is replaced by a different node with
  // identical content, move over its children.
  recreateWrapper(e, n, r, i, o, s) {
    if (e.dirty || n.isAtom || !e.children.length || !e.node.content.eq(n.content) || !Us(r, e.outerDeco) || !i.eq(e.innerDeco))
      return null;
    let l = Kn.create(this.top, n, r, i, o, s);
    if (l.contentDOM) {
      l.children = e.children, e.children = [];
      for (let a of l.children)
        a.parent = l;
    }
    return e.destroy(), l;
  }
  // Insert the node as a newly created node desc.
  addNode(e, n, r, i, o) {
    let s = Kn.create(this.top, e, n, r, i, o);
    s.contentDOM && s.updateChildren(i, o + 1), this.top.children.splice(this.index++, 0, s), this.changed = !0;
  }
  placeWidget(e, n, r) {
    let i = this.index < this.top.children.length ? this.top.children[this.index] : null;
    if (i && i.matchesWidget(e) && (e == i.widget || !i.widget.type.toDOM.parentNode))
      this.index++;
    else {
      let o = new Am(this.top, e, n, r);
      this.top.children.splice(this.index++, 0, o), this.changed = !0;
    }
  }
  // Make sure a textblock looks and behaves correctly in
  // contentEditable.
  addTextblockHacks() {
    let e = this.top.children[this.index - 1], n = this.top;
    for (; e instanceof zr; )
      n = e, e = n.children[n.children.length - 1];
    (!e || // Empty textblock
    !(e instanceof yl) || /\n$/.test(e.node.text) || this.view.requiresGeckoHackNode && /\s$/.test(e.node.text)) && ((Ye || He) && e && e.dom.contentEditable == "false" && this.addHackNode("IMG", n), this.addHackNode("BR", this.top));
  }
  addHackNode(e, n) {
    if (n == this.top && this.index < n.children.length && n.children[this.index].matchesHack(e))
      this.index++;
    else {
      let r = document.createElement(e);
      e == "IMG" && (r.className = "ProseMirror-separator", r.alt = ""), e == "BR" && (r.className = "ProseMirror-trailingBreak");
      let i = new Em(this.top, [], r, null);
      n != this.top ? n.children.push(i) : n.children.splice(this.index++, 0, i), this.changed = !0;
    }
  }
  isLocked(e) {
    return this.lock && (e == this.lock || e.nodeType == 1 && e.contains(this.lock.parentNode));
  }
}
function NC(t, e) {
  let n = e, r = n.children.length, i = t.childCount, o = /* @__PURE__ */ new Map(), s = [];
  e: for (; i > 0; ) {
    let l;
    for (; ; )
      if (r) {
        let u = n.children[r - 1];
        if (u instanceof zr)
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
function IC(t, e) {
  return t.type.side - e.type.side;
}
function AC(t, e, n, r) {
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
      let x = i[s++];
      x.widget && (c ? (f || (f = [c])).push(x) : c = x);
    }
    if (c)
      if (f) {
        f.sort(IC);
        for (let x = 0; x < f.length; x++)
          n(f[x], u, !!a);
      } else
        n(c, u, !!a);
    let h, d;
    if (a)
      d = -1, h = a, a = null;
    else if (u < t.childCount)
      d = u, h = t.child(u++);
    else
      break;
    for (let x = 0; x < l.length; x++)
      l[x].to <= o && l.splice(x--, 1);
    for (; s < i.length && i[s].from <= o && i[s].to > o; )
      l.push(i[s++]);
    let p = o + h.nodeSize;
    if (h.isText) {
      let x = p;
      s < i.length && i[s].from < x && (x = i[s].from);
      for (let w = 0; w < l.length; w++)
        l[w].to < x && (x = l[w].to);
      x < p && (a = h.cut(x - o), h = h.cut(0, x - o), p = x, d = -1);
    } else
      for (; s < i.length && i[s].to < p; )
        s++;
    let g = h.isInline && !h.isLeaf ? l.filter((x) => !x.inline) : l.slice();
    r(h, g, e.forChild(o, h), d), o = p;
  }
}
function EC(t) {
  if (t.nodeName == "UL" || t.nodeName == "OL") {
    let e = t.style.cssText;
    t.style.cssText = e + "; list-style: square !important", window.getComputedStyle(t).listStyle, t.style.cssText = e;
  }
}
function OC(t, e, n, r) {
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
function tu(t, e, n, r, i) {
  let o = [];
  for (let s = 0, l = 0; s < t.length; s++) {
    let a = t[s], u = l, c = l += a.size;
    u >= n || c <= e ? o.push(a) : (u < e && o.push(a.slice(0, e - u, r)), i && (o.push(i), i = void 0), c > n && o.push(a.slice(n - u, a.size, r)));
  }
  return o;
}
function Hu(t, e = null) {
  let n = t.domSelectionRange(), r = t.state.doc;
  if (!n.focusNode)
    return null;
  let i = t.docView.nearestDesc(n.focusNode), o = i && i.size == 0, s = t.docView.posFromDOM(n.focusNode, n.focusOffset, 1);
  if (s < 0)
    return null;
  let l = r.resolve(s), a, u;
  if (gl(n)) {
    for (a = s; i && !i.node; )
      i = i.parent;
    let f = i.node;
    if (i && f.isAtom && X.isSelectable(f) && i.parent && !(f.isInline && iC(n.focusNode, n.focusOffset, i.dom))) {
      let h = i.posBefore;
      u = new X(s == h ? l : r.resolve(h));
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
    u = ju(t, c, l, f);
  }
  return u;
}
function Lm(t) {
  return t.editable ? t.hasFocus() : zm(t) && document.activeElement && document.activeElement.contains(t.dom);
}
function xn(t, e = !1) {
  let n = t.state.selection;
  if (Pm(t, n), !!Lm(t)) {
    if (!e && t.input.mouseDown && t.input.mouseDown.allowDefault && He) {
      let r = t.domSelectionRange(), i = t.domObserver.currentSelection;
      if (r.anchorNode && i.anchorNode && Pr(r.anchorNode, r.anchorOffset, i.anchorNode, i.anchorOffset)) {
        t.input.mouseDown.delayedSelectionSync = !0, t.domObserver.setCurSelection();
        return;
      }
    }
    if (t.domObserver.disconnectSelection(), t.cursorWrapper)
      RC(t);
    else {
      let { anchor: r, head: i } = n, o, s;
      Lh && !(n instanceof Y) && (n.$from.parent.inlineContent || (o = Ph(t, n.from)), !n.empty && !n.$from.parent.inlineContent && (s = Ph(t, n.to))), t.docView.setSelection(r, i, t, e), Lh && (o && zh(o), s && zh(s)), n.visible ? t.dom.classList.remove("ProseMirror-hideselection") : (t.dom.classList.add("ProseMirror-hideselection"), "onselectionchange" in document && DC(t));
    }
    t.domObserver.setCurSelection(), t.domObserver.connectSelection();
  }
}
const Lh = Ye || He && xm < 63;
function Ph(t, e) {
  let { node: n, offset: r } = t.docView.domFromPos(e, 0), i = r < n.childNodes.length ? n.childNodes[r] : null, o = r ? n.childNodes[r - 1] : null;
  if (Ye && i && i.contentEditable == "false")
    return Ql(i);
  if ((!i || i.contentEditable == "false") && (!o || o.contentEditable == "false")) {
    if (i)
      return Ql(i);
    if (o)
      return Ql(o);
  }
}
function Ql(t) {
  return t.contentEditable = "true", Ye && t.draggable && (t.draggable = !1, t.wasDraggable = !0), t;
}
function zh(t) {
  t.contentEditable = "false", t.wasDraggable && (t.draggable = !0, t.wasDraggable = null);
}
function DC(t) {
  let e = t.dom.ownerDocument;
  e.removeEventListener("selectionchange", t.input.hideSelectionGuard);
  let n = t.domSelectionRange(), r = n.anchorNode, i = n.anchorOffset;
  e.addEventListener("selectionchange", t.input.hideSelectionGuard = () => {
    (n.anchorNode != r || n.anchorOffset != i) && (e.removeEventListener("selectionchange", t.input.hideSelectionGuard), setTimeout(() => {
      (!Lm(t) || t.state.selection.visible) && t.dom.classList.remove("ProseMirror-hideselection");
    }, 20));
  });
}
function RC(t) {
  let e = t.domSelection();
  if (!e)
    return;
  let n = t.cursorWrapper.dom, r = n.nodeName == "IMG";
  r ? e.collapse(n.parentNode, Ve(n) + 1) : e.collapse(n, 0), !r && !t.state.selection.visible && ht && qn <= 11 && (n.disabled = !0, n.disabled = !1);
}
function Pm(t, e) {
  if (e instanceof X) {
    let n = t.docView.descAt(e.from);
    n != t.lastSelectedViewDesc && (Bh(t), n && n.selectNode(), t.lastSelectedViewDesc = n);
  } else
    Bh(t);
}
function Bh(t) {
  t.lastSelectedViewDesc && (t.lastSelectedViewDesc.parent && t.lastSelectedViewDesc.deselectNode(), t.lastSelectedViewDesc = void 0);
}
function ju(t, e, n, r) {
  return t.someProp("createSelectionBetween", (i) => i(t, e, n)) || Y.between(e, n, r);
}
function Fh(t) {
  return t.editable && !t.hasFocus() ? !1 : zm(t);
}
function zm(t) {
  let e = t.domSelectionRange();
  if (!e.anchorNode)
    return !1;
  try {
    return t.dom.contains(e.anchorNode.nodeType == 3 ? e.anchorNode.parentNode : e.anchorNode) && (t.editable || t.dom.contains(e.focusNode.nodeType == 3 ? e.focusNode.parentNode : e.focusNode));
  } catch {
    return !1;
  }
}
function LC(t) {
  let e = t.docView.domFromPos(t.state.selection.anchor, 0), n = t.domSelectionRange();
  return Pr(e.node, e.offset, n.anchorNode, n.anchorOffset);
}
function nu(t, e) {
  let { $anchor: n, $head: r } = t.selection, i = e > 0 ? n.max(r) : n.min(r), o = i.parent.inlineContent ? i.depth ? t.doc.resolve(e > 0 ? i.after() : i.before()) : null : i;
  return o && te.findFrom(o, e);
}
function Rn(t, e) {
  return t.dispatch(t.state.tr.setSelection(e).scrollIntoView()), !0;
}
function $h(t, e, n) {
  let r = t.state.selection;
  if (r instanceof Y)
    if (n.indexOf("s") > -1) {
      let { $head: i } = r, o = i.textOffset ? null : e < 0 ? i.nodeBefore : i.nodeAfter;
      if (!o || o.isText || !o.isLeaf)
        return !1;
      let s = t.state.doc.resolve(i.pos + o.nodeSize * (e < 0 ? -1 : 1));
      return Rn(t, new Y(r.$anchor, s));
    } else if (r.empty) {
      if (t.endOfTextblock(e > 0 ? "forward" : "backward")) {
        let i = nu(t.state, e);
        return i && i instanceof X ? Rn(t, i) : !1;
      } else if (!(At && n.indexOf("m") > -1)) {
        let i = r.$head, o = i.textOffset ? null : e < 0 ? i.nodeBefore : i.nodeAfter, s;
        if (!o || o.isText)
          return !1;
        let l = e < 0 ? i.pos - o.nodeSize : i.pos;
        return o.isAtom || (s = t.docView.descAt(l)) && !s.contentDOM ? X.isSelectable(o) ? Rn(t, new X(e < 0 ? t.state.doc.resolve(i.pos - o.nodeSize) : i)) : Zo ? Rn(t, new Y(t.state.doc.resolve(e < 0 ? l : l + o.nodeSize))) : !1 : !1;
      }
    } else return !1;
  else {
    if (r instanceof X && r.node.isInline)
      return Rn(t, new Y(e > 0 ? r.$to : r.$from));
    {
      let i = nu(t.state, e);
      return i ? Rn(t, i) : !1;
    }
  }
}
function Js(t) {
  return t.nodeType == 3 ? t.nodeValue.length : t.childNodes.length;
}
function uo(t, e) {
  let n = t.pmViewDesc;
  return n && n.size == 0 && (e < 0 || t.nextSibling || t.nodeName != "BR");
}
function Kr(t, e) {
  return e < 0 ? PC(t) : zC(t);
}
function PC(t) {
  let e = t.domSelectionRange(), n = e.focusNode, r = e.focusOffset;
  if (!n)
    return;
  let i, o, s = !1;
  for (Dt && n.nodeType == 1 && r < Js(n) && uo(n.childNodes[r], -1) && (s = !0); ; )
    if (r > 0) {
      if (n.nodeType != 1)
        break;
      {
        let l = n.childNodes[r - 1];
        if (uo(l, -1))
          i = n, o = --r;
        else if (l.nodeType == 3)
          n = l, r = n.nodeValue.length;
        else
          break;
      }
    } else {
      if (Bm(n))
        break;
      {
        let l = n.previousSibling;
        for (; l && uo(l, -1); )
          i = n.parentNode, o = Ve(l), l = l.previousSibling;
        if (l)
          n = l, r = Js(n);
        else {
          if (n = n.parentNode, n == t.dom)
            break;
          r = 0;
        }
      }
    }
  s ? ru(t, n, r) : i && ru(t, i, o);
}
function zC(t) {
  let e = t.domSelectionRange(), n = e.focusNode, r = e.focusOffset;
  if (!n)
    return;
  let i = Js(n), o, s;
  for (; ; )
    if (r < i) {
      if (n.nodeType != 1)
        break;
      let l = n.childNodes[r];
      if (uo(l, 1))
        o = n, s = ++r;
      else
        break;
    } else {
      if (Bm(n))
        break;
      {
        let l = n.nextSibling;
        for (; l && uo(l, 1); )
          o = l.parentNode, s = Ve(l) + 1, l = l.nextSibling;
        if (l)
          n = l, r = 0, i = Js(n);
        else {
          if (n = n.parentNode, n == t.dom)
            break;
          r = i = 0;
        }
      }
    }
  o && ru(t, o, s);
}
function Bm(t) {
  let e = t.pmViewDesc;
  return e && e.node && e.node.isBlock;
}
function BC(t, e) {
  for (; t && e == t.childNodes.length && !Xo(t); )
    e = Ve(t) + 1, t = t.parentNode;
  for (; t && e < t.childNodes.length; ) {
    let n = t.childNodes[e];
    if (n.nodeType == 3)
      return n;
    if (n.nodeType == 1 && n.contentEditable == "false")
      break;
    t = n, e = 0;
  }
}
function FC(t, e) {
  for (; t && !e && !Xo(t); )
    e = Ve(t), t = t.parentNode;
  for (; t && e; ) {
    let n = t.childNodes[e - 1];
    if (n.nodeType == 3)
      return n;
    if (n.nodeType == 1 && n.contentEditable == "false")
      break;
    t = n, e = t.childNodes.length;
  }
}
function ru(t, e, n) {
  if (e.nodeType != 3) {
    let o, s;
    (s = BC(e, n)) ? (e = s, n = 0) : (o = FC(e, n)) && (e = o, n = o.nodeValue.length);
  }
  let r = t.domSelection();
  if (!r)
    return;
  if (gl(r)) {
    let o = document.createRange();
    o.setEnd(e, n), o.setStart(e, n), r.removeAllRanges(), r.addRange(o);
  } else r.extend && r.extend(e, n);
  t.domObserver.setCurSelection();
  let { state: i } = t;
  setTimeout(() => {
    t.state == i && xn(t);
  }, 50);
}
function _h(t, e) {
  let n = t.state.doc.resolve(e);
  if (!(He || Cm) && n.parent.inlineContent) {
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
function Vh(t, e, n) {
  let r = t.state.selection;
  if (r instanceof Y && !r.empty || n.indexOf("s") > -1 || At && n.indexOf("m") > -1)
    return !1;
  let { $from: i, $to: o } = r;
  if (!i.parent.inlineContent || t.endOfTextblock(e < 0 ? "up" : "down")) {
    let s = nu(t.state, e);
    if (s && s instanceof X)
      return Rn(t, s);
  }
  if (!i.parent.inlineContent) {
    let s = e < 0 ? i : o, l = r instanceof St ? te.near(s, e) : te.findFrom(s, e);
    return l ? Rn(t, l) : !1;
  }
  return !1;
}
function Hh(t, e) {
  if (!(t.state.selection instanceof Y))
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
function jh(t, e, n) {
  t.domObserver.stop(), e.contentEditable = n, t.domObserver.start();
}
function $C(t) {
  if (!Ye || t.state.selection.$head.parentOffset > 0)
    return !1;
  let { focusNode: e, focusOffset: n } = t.domSelectionRange();
  if (e && e.nodeType == 1 && n == 0 && e.firstChild && e.firstChild.contentEditable == "false") {
    let r = e.firstChild;
    jh(t, r, "true"), setTimeout(() => jh(t, r, "false"), 20);
  }
  return !1;
}
function _C(t) {
  let e = "";
  return t.ctrlKey && (e += "c"), t.metaKey && (e += "m"), t.altKey && (e += "a"), t.shiftKey && (e += "s"), e;
}
function VC(t, e) {
  let n = e.keyCode, r = _C(e);
  if (n == 8 || At && n == 72 && r == "c")
    return Hh(t, -1) || Kr(t, -1);
  if (n == 46 && !e.shiftKey || At && n == 68 && r == "c")
    return Hh(t, 1) || Kr(t, 1);
  if (n == 13 || n == 27)
    return !0;
  if (n == 37 || At && n == 66 && r == "c") {
    let i = n == 37 ? _h(t, t.state.selection.from) == "ltr" ? -1 : 1 : -1;
    return $h(t, i, r) || Kr(t, i);
  } else if (n == 39 || At && n == 70 && r == "c") {
    let i = n == 39 ? _h(t, t.state.selection.from) == "ltr" ? 1 : -1 : 1;
    return $h(t, i, r) || Kr(t, i);
  } else {
    if (n == 38 || At && n == 80 && r == "c")
      return Vh(t, -1, r) || Kr(t, -1);
    if (n == 40 || At && n == 78 && r == "c")
      return $C(t) || Vh(t, 1, r) || Kr(t, 1);
    if (r == (At ? "m" : "c") && (n == 66 || n == 73 || n == 89 || n == 90))
      return !0;
  }
  return !1;
}
function Wu(t, e) {
  t.someProp("transformCopied", (d) => {
    e = d(e, t);
  });
  let n = [], { content: r, openStart: i, openEnd: o } = e;
  for (; i > 1 && o > 1 && r.childCount == 1 && r.firstChild.childCount == 1; ) {
    i--, o--;
    let d = r.firstChild;
    n.push(d.type.name, d.attrs != d.type.defaultAttrs ? d.attrs : null), r = d.content;
  }
  let s = t.someProp("clipboardSerializer") || zi.fromSchema(t.state.schema), l = jm(), a = l.createElement("div");
  a.appendChild(s.serializeFragment(r, { document: l }));
  let u = a.firstChild, c, f = 0;
  for (; u && u.nodeType == 1 && (c = Hm[u.nodeName.toLowerCase()]); ) {
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
function Fm(t, e, n, r, i) {
  let o = i.parent.type.spec.code, s, l;
  if (!n && !e)
    return null;
  let a = !!e && (r || o || !n);
  if (a) {
    if (t.someProp("transformPastedText", (h) => {
      e = h(e, o || r, t);
    }), o)
      return l = new _(R.from(t.state.schema.text(e.replace(/\r\n?/g, `
`))), 0, 0), t.someProp("transformPasted", (h) => {
        l = h(l, t, !0);
      }), l;
    let f = t.someProp("clipboardTextParser", (h) => h(e, i, r, t));
    if (f)
      l = f;
    else {
      let h = i.marks(), { schema: d } = t.state, p = zi.fromSchema(d);
      s = document.createElement("div"), e.split(/(?:\r\n?|\n)+/).forEach((g) => {
        let x = s.appendChild(document.createElement("p"));
        g && x.appendChild(p.serializeNode(d.text(g, h)));
      });
    }
  } else
    t.someProp("transformPastedHTML", (f) => {
      n = f(n, t);
    }), s = qC(n), Zo && KC(s);
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
  if (l || (l = (t.someProp("clipboardParser") || t.someProp("domParser") || Eu.fromSchema(t.state.schema)).parseSlice(s, {
    preserveWhitespace: !!(a || c),
    context: i,
    ruleFromNode(h) {
      return h.nodeName == "BR" && !h.nextSibling && h.parentNode && !HC.test(h.parentNode.nodeName) ? { ignore: !0 } : null;
    }
  })), c)
    l = UC(Wh(l, +c[1], +c[2]), c[4]);
  else if (l = _.maxOpen(jC(l.content, i), !0), l.openStart || l.openEnd) {
    let f = 0, h = 0;
    for (let d = l.content.firstChild; f < l.openStart && !d.type.spec.isolating; f++, d = d.firstChild)
      ;
    for (let d = l.content.lastChild; h < l.openEnd && !d.type.spec.isolating; h++, d = d.lastChild)
      ;
    l = Wh(l, f, h);
  }
  return t.someProp("transformPasted", (f) => {
    l = f(l, t, a);
  }), l;
}
const HC = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var)$/i;
function jC(t, e) {
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
      if (u = s.length && o.length && _m(a, o, l, s[s.length - 1], 0))
        s[s.length - 1] = u;
      else {
        s.length && (s[s.length - 1] = Vm(s[s.length - 1], o.length));
        let c = $m(l, a);
        s.push(c), i = i.matchType(c.type), o = a;
      }
    }), s)
      return R.from(s);
  }
  return t;
}
function $m(t, e, n = 0) {
  for (let r = e.length - 1; r >= n; r--)
    t = e[r].create(null, R.from(t));
  return t;
}
function _m(t, e, n, r, i) {
  if (i < t.length && i < e.length && t[i] == e[i]) {
    let o = _m(t, e, n, r.lastChild, i + 1);
    if (o)
      return r.copy(r.content.replaceChild(r.childCount - 1, o));
    if (r.contentMatchAt(r.childCount).matchType(i == t.length - 1 ? n.type : t[i + 1]))
      return r.copy(r.content.append(R.from($m(n, t, i + 1))));
  }
}
function Vm(t, e) {
  if (e == 0)
    return t;
  let n = t.content.replaceChild(t.childCount - 1, Vm(t.lastChild, e - 1)), r = t.contentMatchAt(t.childCount).fillBefore(R.empty, !0);
  return t.copy(n.append(r));
}
function iu(t, e, n, r, i, o) {
  let s = e < 0 ? t.firstChild : t.lastChild, l = s.content;
  return t.childCount > 1 && (o = 0), i < r - 1 && (l = iu(l, e, n, r, i + 1, o)), i >= n && (l = e < 0 ? s.contentMatchAt(0).fillBefore(l, o <= i).append(l) : l.append(s.contentMatchAt(s.childCount).fillBefore(R.empty, !0))), t.replaceChild(e < 0 ? 0 : t.childCount - 1, s.copy(l));
}
function Wh(t, e, n) {
  return e < t.openStart && (t = new _(iu(t.content, -1, e, t.openStart, 0, t.openEnd), e, t.openEnd)), n < t.openEnd && (t = new _(iu(t.content, 1, n, t.openEnd, 0, 0), t.openStart, n)), t;
}
const Hm = {
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
let qh = null;
function jm() {
  return qh || (qh = document.implementation.createHTMLDocument("title"));
}
let Xl = null;
function WC(t) {
  let e = window.trustedTypes;
  return e ? (Xl || (Xl = e.defaultPolicy || e.createPolicy("ProseMirrorClipboard", { createHTML: (n) => n })), Xl.createHTML(t)) : t;
}
function qC(t) {
  let e = /^(\s*<meta [^>]*>)*/.exec(t);
  e && (t = t.slice(e[0].length));
  let n = jm().createElement("div"), r = /<([a-z][^>\s]+)/i.exec(t), i;
  if ((i = r && Hm[r[1].toLowerCase()]) && (t = i.map((o) => "<" + o + ">").join("") + t + i.map((o) => "</" + o + ">").reverse().join("")), n.innerHTML = WC(t), i)
    for (let o = 0; o < i.length; o++)
      n = n.querySelector(i[o]) || n;
  return n;
}
function KC(t) {
  let e = t.querySelectorAll(He ? "span:not([class]):not([style])" : "span.Apple-converted-space");
  for (let n = 0; n < e.length; n++) {
    let r = e[n];
    r.childNodes.length == 1 && r.textContent == " " && r.parentNode && r.parentNode.replaceChild(t.ownerDocument.createTextNode(" "), r);
  }
}
function UC(t, e) {
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
const rt = {}, it = {}, JC = { touchstart: !0, touchmove: !0 };
class GC {
  constructor() {
    this.shiftKey = !1, this.mouseDown = null, this.lastKeyCode = null, this.lastKeyCodeTime = 0, this.lastClick = { time: 0, x: 0, y: 0, type: "", button: 0 }, this.lastSelectionOrigin = null, this.lastSelectionTime = 0, this.lastIOSEnter = 0, this.lastIOSEnterFallbackTimeout = -1, this.lastFocus = 0, this.lastTouch = 0, this.lastChromeDelete = 0, this.composing = !1, this.compositionNode = null, this.composingTimeout = -1, this.compositionNodes = [], this.compositionEndedAt = -2e8, this.compositionID = 1, this.badSafariComposition = !1, this.compositionPendingChanges = 0, this.domChangeCount = 0, this.eventHandlers = /* @__PURE__ */ Object.create(null), this.hideSelectionGuard = null;
  }
}
function YC(t) {
  for (let e in rt) {
    let n = rt[e];
    t.dom.addEventListener(e, t.input.eventHandlers[e] = (r) => {
      XC(t, r) && !qu(t, r) && (t.editable || !(r.type in it)) && n(t, r);
    }, JC[e] ? { passive: !0 } : void 0);
  }
  Ye && t.dom.addEventListener("input", () => null), ou(t);
}
function jn(t, e) {
  t.input.lastSelectionOrigin = e, t.input.lastSelectionTime = Date.now();
}
function QC(t) {
  t.domObserver.stop();
  for (let e in t.input.eventHandlers)
    t.dom.removeEventListener(e, t.input.eventHandlers[e]);
  clearTimeout(t.input.composingTimeout), clearTimeout(t.input.lastIOSEnterFallbackTimeout);
}
function ou(t) {
  t.someProp("handleDOMEvents", (e) => {
    for (let n in e)
      t.input.eventHandlers[n] || t.dom.addEventListener(n, t.input.eventHandlers[n] = (r) => qu(t, r));
  });
}
function qu(t, e) {
  return t.someProp("handleDOMEvents", (n) => {
    let r = n[e.type];
    return r ? r(t, e) || e.defaultPrevented : !1;
  });
}
function XC(t, e) {
  if (!e.bubbles)
    return !0;
  if (e.defaultPrevented)
    return !1;
  for (let n = e.target; n != t.dom; n = n.parentNode)
    if (!n || n.nodeType == 11 || n.pmViewDesc && n.pmViewDesc.stopEvent(e))
      return !1;
  return !0;
}
function ZC(t, e) {
  !qu(t, e) && rt[e.type] && (t.editable || !(e.type in it)) && rt[e.type](t, e);
}
it.keydown = (t, e) => {
  let n = e;
  if (t.input.shiftKey = n.keyCode == 16 || n.shiftKey, !qm(t, n) && (t.input.lastKeyCode = n.keyCode, t.input.lastKeyCodeTime = Date.now(), !(bn && He && n.keyCode == 13)))
    if (n.keyCode != 229 && t.domObserver.forceFlush(), Ai && n.keyCode == 13 && !n.ctrlKey && !n.altKey && !n.metaKey) {
      let r = Date.now();
      t.input.lastIOSEnter = r, t.input.lastIOSEnterFallbackTimeout = setTimeout(() => {
        t.input.lastIOSEnter == r && (t.someProp("handleKeyDown", (i) => i(t, ar(13, "Enter"))), t.input.lastIOSEnter = 0);
      }, 200);
    } else t.someProp("handleKeyDown", (r) => r(t, n)) || VC(t, n) ? n.preventDefault() : jn(t, "key");
};
it.keyup = (t, e) => {
  e.keyCode == 16 && (t.input.shiftKey = !1);
};
it.keypress = (t, e) => {
  let n = e;
  if (qm(t, n) || !n.charCode || n.ctrlKey && !n.altKey || At && n.metaKey)
    return;
  if (t.someProp("handleKeyPress", (i) => i(t, n))) {
    n.preventDefault();
    return;
  }
  let r = t.state.selection;
  if (!(r instanceof Y) || !r.$from.sameParent(r.$to)) {
    let i = String.fromCharCode(n.charCode), o = () => t.state.tr.insertText(i).scrollIntoView();
    !/[\r\n]/.test(i) && !t.someProp("handleTextInput", (s) => s(t, r.$from.pos, r.$to.pos, i, o)) && t.dispatch(o()), n.preventDefault();
  }
};
function kl(t) {
  return { left: t.clientX, top: t.clientY };
}
function eS(t, e) {
  let n = e.x - t.clientX, r = e.y - t.clientY;
  return n * n + r * r < 100;
}
function Ku(t, e, n, r, i) {
  if (r == -1)
    return !1;
  let o = t.state.doc.resolve(r);
  for (let s = o.depth + 1; s > 0; s--)
    if (t.someProp(e, (l) => s > o.depth ? l(t, n, o.nodeAfter, o.before(s), i, !0) : l(t, n, o.node(s), o.before(s), i, !1)))
      return !0;
  return !1;
}
function ri(t, e, n) {
  if (t.focused || t.focus(), t.state.selection.eq(e))
    return;
  let r = t.state.tr.setSelection(e);
  r.setMeta("pointer", !0), t.dispatch(r);
}
function tS(t, e) {
  if (e == -1)
    return !1;
  let n = t.state.doc.resolve(e), r = n.nodeAfter;
  return r && r.isAtom && X.isSelectable(r) ? (ri(t, new X(n)), !0) : !1;
}
function nS(t, e) {
  if (e == -1)
    return !1;
  let n = t.state.selection, r, i;
  n instanceof X && (r = n.node);
  let o = t.state.doc.resolve(e);
  for (let s = o.depth + 1; s > 0; s--) {
    let l = s > o.depth ? o.nodeAfter : o.node(s);
    if (X.isSelectable(l)) {
      r && n.$from.depth > 0 && s >= n.$from.depth && o.before(n.$from.depth + 1) == n.$from.pos ? i = o.before(n.$from.depth) : i = o.before(s);
      break;
    }
  }
  return i != null ? (ri(t, X.create(t.state.doc, i)), !0) : !1;
}
function rS(t, e, n, r, i) {
  return Ku(t, "handleClickOn", e, n, r) || t.someProp("handleClick", (o) => o(t, e, r)) || (i ? nS(t, n) : tS(t, n));
}
function iS(t, e, n, r) {
  return Ku(t, "handleDoubleClickOn", e, n, r) || t.someProp("handleDoubleClick", (i) => i(t, e, r));
}
function oS(t, e, n, r) {
  return Ku(t, "handleTripleClickOn", e, n, r) || t.someProp("handleTripleClick", (i) => i(t, e, r)) || sS(t, n, r);
}
function sS(t, e, n) {
  if (n.button != 0)
    return !1;
  let r = t.state.doc;
  if (e == -1)
    return r.inlineContent ? (ri(t, Y.create(r, 0, r.content.size)), !0) : !1;
  let i = r.resolve(e);
  for (let o = i.depth + 1; o > 0; o--) {
    let s = o > i.depth ? i.nodeAfter : i.node(o), l = i.before(o);
    if (s.inlineContent)
      ri(t, Y.create(r, l + 1, l + 1 + s.content.size));
    else if (X.isSelectable(s))
      ri(t, X.create(r, l));
    else
      continue;
    return !0;
  }
}
function Uu(t) {
  return Gs(t);
}
const Wm = At ? "metaKey" : "ctrlKey";
rt.mousedown = (t, e) => {
  let n = e;
  t.input.shiftKey = n.shiftKey;
  let r = Uu(t), i = Date.now(), o = "singleClick";
  i - t.input.lastClick.time < 500 && eS(n, t.input.lastClick) && !n[Wm] && t.input.lastClick.button == n.button && (t.input.lastClick.type == "singleClick" ? o = "doubleClick" : t.input.lastClick.type == "doubleClick" && (o = "tripleClick")), t.input.lastClick = { time: i, x: n.clientX, y: n.clientY, type: o, button: n.button };
  let s = t.posAtCoords(kl(n));
  s && (o == "singleClick" ? (t.input.mouseDown && t.input.mouseDown.done(), t.input.mouseDown = new lS(t, s, n, !!r)) : (o == "doubleClick" ? iS : oS)(t, s.pos, s.inside, n) ? n.preventDefault() : jn(t, "pointer"));
};
class lS {
  constructor(e, n, r, i) {
    this.view = e, this.pos = n, this.event = r, this.flushed = i, this.delayedSelectionSync = !1, this.mightDrag = null, this.startDoc = e.state.doc, this.selectNode = !!r[Wm], this.allowDefault = r.shiftKey;
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
    r.button == 0 && (o.type.spec.draggable && o.type.spec.selectable !== !1 || u instanceof X && u.from <= s && u.to > s) && (this.mightDrag = {
      node: o,
      pos: s,
      addAttr: !!(this.target && !this.target.draggable),
      setUneditable: !!(this.target && Dt && !this.target.hasAttribute("contentEditable"))
    }), this.target && this.mightDrag && (this.mightDrag.addAttr || this.mightDrag.setUneditable) && (this.view.domObserver.stop(), this.mightDrag.addAttr && (this.target.draggable = !0), this.mightDrag.setUneditable && setTimeout(() => {
      this.view.input.mouseDown == this && this.target.setAttribute("contentEditable", "false");
    }, 20), this.view.domObserver.start()), e.root.addEventListener("mouseup", this.up = this.up.bind(this)), e.root.addEventListener("mousemove", this.move = this.move.bind(this)), jn(e, "pointer");
  }
  done() {
    this.view.root.removeEventListener("mouseup", this.up), this.view.root.removeEventListener("mousemove", this.move), this.mightDrag && this.target && (this.view.domObserver.stop(), this.mightDrag.addAttr && this.target.removeAttribute("draggable"), this.mightDrag.setUneditable && this.target.removeAttribute("contentEditable"), this.view.domObserver.start()), this.delayedSelectionSync && setTimeout(() => xn(this.view)), this.view.input.mouseDown = null;
  }
  up(e) {
    if (this.done(), !this.view.dom.contains(e.target))
      return;
    let n = this.pos;
    this.view.state.doc != this.startDoc && (n = this.view.posAtCoords(kl(e))), this.updateAllowDefault(e), this.allowDefault || !n ? jn(this.view, "pointer") : rS(this.view, n.pos, n.inside, e, this.selectNode) ? e.preventDefault() : e.button == 0 && (this.flushed || // Safari ignores clicks on draggable elements
    Ye && this.mightDrag && !this.mightDrag.node.isAtom || // Chrome will sometimes treat a node selection as a
    // cursor, but still report that the node is selected
    // when asked through getSelection. You'll then get a
    // situation where clicking at the point where that
    // (hidden) cursor is doesn't change the selection, and
    // thus doesn't get a reaction from ProseMirror. This
    // works around that.
    He && !this.view.state.selection.visible && Math.min(Math.abs(n.pos - this.view.state.selection.from), Math.abs(n.pos - this.view.state.selection.to)) <= 2) ? (ri(this.view, te.near(this.view.state.doc.resolve(n.pos))), e.preventDefault()) : jn(this.view, "pointer");
  }
  move(e) {
    this.updateAllowDefault(e), jn(this.view, "pointer"), e.buttons == 0 && this.done();
  }
  updateAllowDefault(e) {
    !this.allowDefault && (Math.abs(this.event.x - e.clientX) > 4 || Math.abs(this.event.y - e.clientY) > 4) && (this.allowDefault = !0);
  }
}
rt.touchstart = (t) => {
  t.input.lastTouch = Date.now(), Uu(t), jn(t, "pointer");
};
rt.touchmove = (t) => {
  t.input.lastTouch = Date.now(), jn(t, "pointer");
};
rt.contextmenu = (t) => Uu(t);
function qm(t, e) {
  return t.composing ? !0 : Ye && Math.abs(e.timeStamp - t.input.compositionEndedAt) < 500 ? (t.input.compositionEndedAt = -2e8, !0) : !1;
}
const aS = bn ? 5e3 : -1;
it.compositionstart = it.compositionupdate = (t) => {
  if (!t.composing) {
    t.domObserver.flush();
    let { state: e } = t, n = e.selection.$to;
    if (e.selection instanceof Y && (e.storedMarks || !n.textOffset && n.parentOffset && n.nodeBefore.marks.some((r) => r.type.spec.inclusive === !1) || He && Cm && uS(t)))
      t.markCursor = t.state.storedMarks || n.marks(), Gs(t, !0), t.markCursor = null;
    else if (Gs(t, !e.selection.empty), Dt && e.selection.empty && n.parentOffset && !n.textOffset && n.nodeBefore.marks.length) {
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
  Km(t, aS);
};
function uS(t) {
  let { focusNode: e, focusOffset: n } = t.domSelectionRange();
  if (!e || e.nodeType != 1 || n >= e.childNodes.length)
    return !1;
  let r = e.childNodes[n];
  return r.nodeType == 1 && r.contentEditable == "false";
}
it.compositionend = (t, e) => {
  t.composing && (t.input.composing = !1, t.input.compositionEndedAt = e.timeStamp, t.input.compositionPendingChanges = t.domObserver.pendingRecords().length ? t.input.compositionID : 0, t.input.compositionNode = null, t.input.badSafariComposition ? t.domObserver.forceFlush() : t.input.compositionPendingChanges && Promise.resolve().then(() => t.domObserver.flush()), t.input.compositionID++, Km(t, 20));
};
function Km(t, e) {
  clearTimeout(t.input.composingTimeout), e > -1 && (t.input.composingTimeout = setTimeout(() => Gs(t), e));
}
function Um(t) {
  for (t.composing && (t.input.composing = !1, t.input.compositionEndedAt = fS()); t.input.compositionNodes.length > 0; )
    t.input.compositionNodes.pop().markParentsDirty();
}
function cS(t) {
  let e = t.domSelectionRange();
  if (!e.focusNode)
    return null;
  let n = nC(e.focusNode, e.focusOffset), r = rC(e.focusNode, e.focusOffset);
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
function fS() {
  let t = document.createEvent("Event");
  return t.initEvent("event", !0, !0), t.timeStamp;
}
function Gs(t, e = !1) {
  if (!(bn && t.domObserver.flushingSoon >= 0)) {
    if (t.domObserver.forceFlush(), Um(t), e || t.docView && t.docView.dirty) {
      let n = Hu(t), r = t.state.selection;
      return n && !n.eq(r) ? t.dispatch(t.state.tr.setSelection(n)) : (t.markCursor || e) && !r.$from.node(r.$from.sharedDepth(r.to)).inlineContent ? t.dispatch(t.state.tr.deleteSelection()) : t.updateState(t.state), !0;
    }
    return !1;
  }
}
function hS(t, e) {
  if (!t.dom.parentNode)
    return;
  let n = t.dom.parentNode.appendChild(document.createElement("div"));
  n.appendChild(e), n.style.cssText = "position: fixed; left: -10000px; top: 10px";
  let r = getSelection(), i = document.createRange();
  i.selectNodeContents(e), t.dom.blur(), r.removeAllRanges(), r.addRange(i), setTimeout(() => {
    n.parentNode && n.parentNode.removeChild(n), t.focus();
  }, 50);
}
const Mo = ht && qn < 15 || Ai && lC < 604;
rt.copy = it.cut = (t, e) => {
  let n = e, r = t.state.selection, i = n.type == "cut";
  if (r.empty)
    return;
  let o = Mo ? null : n.clipboardData, s = r.content(), { dom: l, text: a } = Wu(t, s);
  o ? (n.preventDefault(), o.clearData(), o.setData("text/html", l.innerHTML), o.setData("text/plain", a)) : hS(t, l), i && t.dispatch(t.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
};
function dS(t) {
  return t.openStart == 0 && t.openEnd == 0 && t.content.childCount == 1 ? t.content.firstChild : null;
}
function pS(t, e) {
  if (!t.dom.parentNode)
    return;
  let n = t.input.shiftKey || t.state.selection.$from.parent.type.spec.code, r = t.dom.parentNode.appendChild(document.createElement(n ? "textarea" : "div"));
  n || (r.contentEditable = "true"), r.style.cssText = "position: fixed; left: -10000px; top: 10px", r.focus();
  let i = t.input.shiftKey && t.input.lastKeyCode != 45;
  setTimeout(() => {
    t.focus(), r.parentNode && r.parentNode.removeChild(r), n ? vo(t, r.value, null, i, e) : vo(t, r.textContent, r.innerHTML, i, e);
  }, 50);
}
function vo(t, e, n, r, i) {
  let o = Fm(t, e, n, r, t.state.selection.$from);
  if (t.someProp("handlePaste", (a) => a(t, i, o || _.empty)))
    return !0;
  if (!o)
    return !1;
  let s = dS(o), l = s ? t.state.tr.replaceSelectionWith(s, r) : t.state.tr.replaceSelection(o);
  return t.dispatch(l.scrollIntoView().setMeta("paste", !0).setMeta("uiEvent", "paste")), !0;
}
function Jm(t) {
  let e = t.getData("text/plain") || t.getData("Text");
  if (e)
    return e;
  let n = t.getData("text/uri-list");
  return n ? n.replace(/\r?\n/g, " ") : "";
}
it.paste = (t, e) => {
  let n = e;
  if (t.composing && !bn)
    return;
  let r = Mo ? null : n.clipboardData, i = t.input.shiftKey && t.input.lastKeyCode != 45;
  r && vo(t, Jm(r), r.getData("text/html"), i, n) ? n.preventDefault() : pS(t, n);
};
class Gm {
  constructor(e, n, r) {
    this.slice = e, this.move = n, this.node = r;
  }
}
const mS = At ? "altKey" : "ctrlKey";
function Ym(t, e) {
  let n;
  return t.someProp("dragCopies", (r) => {
    n = n || r(e);
  }), n != null ? !n : !e[mS];
}
rt.dragstart = (t, e) => {
  let n = e, r = t.input.mouseDown;
  if (r && r.done(), !n.dataTransfer)
    return;
  let i = t.state.selection, o = i.empty ? null : t.posAtCoords(kl(n)), s;
  if (!(o && o.pos >= i.from && o.pos <= (i instanceof X ? i.to - 1 : i.to))) {
    if (r && r.mightDrag)
      s = X.create(t.state.doc, r.mightDrag.pos);
    else if (n.target && n.target.nodeType == 1) {
      let f = t.docView.nearestDesc(n.target, !0);
      f && f.node.type.spec.draggable && f != t.docView && (s = X.create(t.state.doc, f.posBefore));
    }
  }
  let l = (s || t.state.selection).content(), { dom: a, text: u, slice: c } = Wu(t, l);
  (!n.dataTransfer.files.length || !He || xm > 120) && n.dataTransfer.clearData(), n.dataTransfer.setData(Mo ? "Text" : "text/html", a.innerHTML), n.dataTransfer.effectAllowed = "copyMove", Mo || n.dataTransfer.setData("text/plain", u), t.dragging = new Gm(c, Ym(t, n), s);
};
rt.dragend = (t) => {
  let e = t.dragging;
  window.setTimeout(() => {
    t.dragging == e && (t.dragging = null);
  }, 50);
};
it.dragover = it.dragenter = (t, e) => e.preventDefault();
it.drop = (t, e) => {
  try {
    gS(t, e, t.dragging);
  } finally {
    t.dragging = null;
  }
};
function gS(t, e, n) {
  if (!e.dataTransfer)
    return;
  let r = t.posAtCoords(kl(e));
  if (!r)
    return;
  let i = t.state.doc.resolve(r.pos), o = n && n.slice;
  o ? t.someProp("transformPasted", (d) => {
    o = d(o, t, !1);
  }) : o = Fm(t, Jm(e.dataTransfer), Mo ? null : e.dataTransfer.getData("text/html"), !1, i);
  let s = !!(n && Ym(t, e));
  if (t.someProp("handleDrop", (d) => d(t, e, o || _.empty, s))) {
    e.preventDefault();
    return;
  }
  if (!o)
    return;
  e.preventDefault();
  let l = o ? Zw(t.state.doc, i.pos, o) : i.pos;
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
  if (c && X.isSelectable(o.content.firstChild) && h.nodeAfter && h.nodeAfter.sameMarkup(o.content.firstChild))
    a.setSelection(new X(h));
  else {
    let d = a.mapping.map(l);
    a.mapping.maps[a.mapping.maps.length - 1].forEach((p, g, x, w) => d = w), a.setSelection(ju(t, h, a.doc.resolve(d)));
  }
  t.focus(), t.dispatch(a.setMeta("uiEvent", "drop"));
}
rt.focus = (t) => {
  t.input.lastFocus = Date.now(), t.focused || (t.domObserver.stop(), t.dom.classList.add("ProseMirror-focused"), t.domObserver.start(), t.focused = !0, setTimeout(() => {
    t.docView && t.hasFocus() && !t.domObserver.currentSelection.eq(t.domSelectionRange()) && xn(t);
  }, 20));
};
rt.blur = (t, e) => {
  let n = e;
  t.focused && (t.domObserver.stop(), t.dom.classList.remove("ProseMirror-focused"), t.domObserver.start(), n.relatedTarget && t.dom.contains(n.relatedTarget) && t.domObserver.currentSelection.clear(), t.focused = !1);
};
rt.beforeinput = (t, e) => {
  if (He && bn && e.inputType == "deleteContentBackward") {
    t.domObserver.flushSoon();
    let { domChangeCount: r } = t.input;
    setTimeout(() => {
      if (t.input.domChangeCount != r || (t.dom.blur(), t.focus(), t.someProp("handleKeyDown", (o) => o(t, ar(8, "Backspace")))))
        return;
      let { $cursor: i } = t.state.selection;
      i && i.pos > 0 && t.dispatch(t.state.tr.delete(i.pos - 1, i.pos).scrollIntoView());
    }, 50);
  }
};
for (let t in it)
  rt[t] = it[t];
function To(t, e) {
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
class Ys {
  constructor(e, n) {
    this.toDOM = e, this.spec = n || Cr, this.side = this.spec.side || 0;
  }
  map(e, n, r, i) {
    let { pos: o, deleted: s } = e.mapResult(n.from + i, this.side < 0 ? -1 : 1);
    return s ? null : new je(o - r, o - r, this);
  }
  valid() {
    return !0;
  }
  eq(e) {
    return this == e || e instanceof Ys && (this.spec.key && this.spec.key == e.spec.key || this.toDOM == e.toDOM && To(this.spec, e.spec));
  }
  destroy(e) {
    this.spec.destroy && this.spec.destroy(e);
  }
}
class Un {
  constructor(e, n) {
    this.attrs = e, this.spec = n || Cr;
  }
  map(e, n, r, i) {
    let o = e.map(n.from + i, this.spec.inclusiveStart ? -1 : 1) - r, s = e.map(n.to + i, this.spec.inclusiveEnd ? 1 : -1) - r;
    return o >= s ? null : new je(o, s, this);
  }
  valid(e, n) {
    return n.from < n.to;
  }
  eq(e) {
    return this == e || e instanceof Un && To(this.attrs, e.attrs) && To(this.spec, e.spec);
  }
  static is(e) {
    return e.type instanceof Un;
  }
  destroy() {
  }
}
class Ju {
  constructor(e, n) {
    this.attrs = e, this.spec = n || Cr;
  }
  map(e, n, r, i) {
    let o = e.mapResult(n.from + i, 1);
    if (o.deleted)
      return null;
    let s = e.mapResult(n.to + i, -1);
    return s.deleted || s.pos <= o.pos ? null : new je(o.pos - r, s.pos - r, this);
  }
  valid(e, n) {
    let { index: r, offset: i } = e.content.findIndex(n.from), o;
    return i == n.from && !(o = e.child(r)).isText && i + o.nodeSize == n.to;
  }
  eq(e) {
    return this == e || e instanceof Ju && To(this.attrs, e.attrs) && To(this.spec, e.spec);
  }
  destroy() {
  }
}
class je {
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
    return new je(e, n, this.type);
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
    return new je(e, e, new Ys(n, r));
  }
  /**
  Creates an inline decoration, which adds the given attributes to
  each inline node between `from` and `to`.
  */
  static inline(e, n, r, i) {
    return new je(e, n, new Un(r, i));
  }
  /**
  Creates a node decoration. `from` and `to` should point precisely
  before and after a node in the document. That node, and only that
  node, will receive the given attributes.
  */
  static node(e, n, r, i) {
    return new je(e, n, new Ju(r, i));
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
    return this.type instanceof Un;
  }
  /**
  @internal
  */
  get widget() {
    return this.type instanceof Ys;
  }
}
const Gr = [], Cr = {};
class Me {
  /**
  @internal
  */
  constructor(e, n) {
    this.local = e.length ? e : Gr, this.children = n.length ? n : Gr;
  }
  /**
  Create a set of decorations, using the structure of the given
  document. This will consume (modify) the `decorations` array, so
  you must make a copy if you want need to preserve that.
  */
  static create(e, n) {
    return n.length ? Qs(n, e, 0, Cr) : Je;
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
    return this == Je || e.maps.length == 0 ? this : this.mapInner(e, n, 0, 0, r || Cr);
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
    return this.children.length ? yS(this.children, s || [], e, n, r, i, o) : s ? new Me(s.sort(Sr), Gr) : Je;
  }
  /**
  Add the given array of decorations to the ones in the set,
  producing a new set. Consumes the `decorations` array. Needs
  access to the current document to create the appropriate tree
  structure.
  */
  add(e, n) {
    return n.length ? this == Je ? Me.create(e, n) : this.addInner(e, n, 0) : this;
  }
  addInner(e, n, r) {
    let i, o = 0;
    e.forEach((l, a) => {
      let u = a + r, c;
      if (c = Xm(n, l, u)) {
        for (i || (i = this.children.slice()); o < i.length && i[o] < a; )
          o += 3;
        i[o] == a ? i[o + 2] = i[o + 2].addInner(l, c, u + 1) : i.splice(o, 0, a, a + l.nodeSize, Qs(c, l, u + 1, Cr)), o += 3;
      }
    });
    let s = Qm(o ? Zm(n) : n, -r);
    for (let l = 0; l < s.length; l++)
      s[l].type.valid(e, s[l]) || s.splice(l--, 1);
    return new Me(s.length ? this.local.concat(s).sort(Sr) : this.local, i || this.children);
  }
  /**
  Create a new set that contains the decorations in this set, minus
  the ones in the given array.
  */
  remove(e) {
    return e.length == 0 || this == Je ? this : this.removeInner(e, 0);
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
      u != Je ? r[o + 2] = u : (r.splice(o, 3), o -= 3);
    }
    if (i.length) {
      for (let o = 0, s; o < e.length; o++)
        if (s = e[o])
          for (let l = 0; l < i.length; l++)
            i[l].eq(s, n) && (i == this.local && (i = this.local.slice()), i.splice(l--, 1));
    }
    return r == this.children && i == this.local ? this : i.length || r.length ? new Me(i, r) : Je;
  }
  forChild(e, n) {
    if (this == Je)
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
      if (a.from < s && a.to > o && a.type instanceof Un) {
        let u = Math.max(o, a.from) - o, c = Math.min(s, a.to) - o;
        u < c && (i || (i = [])).push(a.copy(u, c));
      }
    }
    if (i) {
      let l = new Me(i.sort(Sr), Gr);
      return r ? new zn([l, r]) : l;
    }
    return r || Je;
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
    return Gu(this.localsInner(e));
  }
  /**
  @internal
  */
  localsInner(e) {
    if (this == Je)
      return Gr;
    if (e.inlineContent || !this.local.some(Un.is))
      return this.local;
    let n = [];
    for (let r = 0; r < this.local.length; r++)
      this.local[r].type instanceof Un || n.push(this.local[r]);
    return n;
  }
  forEachSet(e) {
    e(this);
  }
}
Me.empty = new Me([], []);
Me.removeOverlap = Gu;
const Je = Me.empty;
class zn {
  constructor(e) {
    this.members = e;
  }
  map(e, n) {
    const r = this.members.map((i) => i.map(e, n, Cr));
    return zn.from(r);
  }
  forChild(e, n) {
    if (n.isLeaf)
      return Me.empty;
    let r = [];
    for (let i = 0; i < this.members.length; i++) {
      let o = this.members[i].forChild(e, n);
      o != Je && (o instanceof zn ? r = r.concat(o.members) : r.push(o));
    }
    return zn.from(r);
  }
  eq(e) {
    if (!(e instanceof zn) || e.members.length != this.members.length)
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
    return n ? Gu(r ? n : n.sort(Sr)) : Gr;
  }
  // Create a group for the given array of decoration sets, or return
  // a single set when possible.
  static from(e) {
    switch (e.length) {
      case 0:
        return Je;
      case 1:
        return e[0];
      default:
        return new zn(e.every((n) => n instanceof Me) ? e : e.reduce((n, r) => n.concat(r instanceof Me ? r : r.members), []));
    }
  }
  forEachSet(e) {
    for (let n = 0; n < this.members.length; n++)
      this.members[n].forEachSet(e);
  }
}
function yS(t, e, n, r, i, o, s) {
  let l = t.slice();
  for (let u = 0, c = o; u < n.maps.length; u++) {
    let f = 0;
    n.maps[u].forEach((h, d, p, g) => {
      let x = g - p - (d - h);
      for (let w = 0; w < l.length; w += 3) {
        let L = l[w + 1];
        if (L < 0 || h > L + c - f)
          continue;
        let A = l[w] + c - f;
        d >= A ? l[w + 1] = h <= A ? -2 : -1 : h >= c && x && (l[w] += x, l[w + 1] += x);
      }
      f += x;
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
      let h = n.map(t[u + 1] + o, -1), d = h - i, { index: p, offset: g } = r.content.findIndex(f), x = r.maybeChild(p);
      if (x && g == f && g + x.nodeSize == d) {
        let w = l[u + 2].mapInner(n, x, c + 1, t[u] + o + 1, s);
        w != Je ? (l[u] = f, l[u + 1] = d, l[u + 2] = w) : (l[u + 1] = -2, a = !0);
      } else
        a = !0;
    }
  if (a) {
    let u = kS(l, t, e, n, i, o, s), c = Qs(u, r, 0, s);
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
  return new Me(e.sort(Sr), l);
}
function Qm(t, e) {
  if (!e || !t.length)
    return t;
  let n = [];
  for (let r = 0; r < t.length; r++) {
    let i = t[r];
    n.push(new je(i.from + e, i.to + e, i.type));
  }
  return n;
}
function kS(t, e, n, r, i, o, s) {
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
function Xm(t, e, n) {
  if (e.isLeaf)
    return null;
  let r = n + e.nodeSize, i = null;
  for (let o = 0, s; o < t.length; o++)
    (s = t[o]) && s.from > n && s.to < r && ((i || (i = [])).push(s), t[o] = null);
  return i;
}
function Zm(t) {
  let e = [];
  for (let n = 0; n < t.length; n++)
    t[n] != null && e.push(t[n]);
  return e;
}
function Qs(t, e, n, r) {
  let i = [], o = !1;
  e.forEach((l, a) => {
    let u = Xm(t, l, a + n);
    if (u) {
      o = !0;
      let c = Qs(u, l, n + a + 1, r);
      c != Je && i.push(a, a + l.nodeSize, c);
    }
  });
  let s = Qm(o ? Zm(t) : t, -n).sort(Sr);
  for (let l = 0; l < s.length; l++)
    s[l].type.valid(e, s[l]) || (r.onRemove && r.onRemove(s[l].spec), s.splice(l--, 1));
  return s.length || i.length ? new Me(s, i) : Je;
}
function Sr(t, e) {
  return t.from - e.from || t.to - e.to;
}
function Gu(t) {
  let e = t;
  for (let n = 0; n < e.length - 1; n++) {
    let r = e[n];
    if (r.from != r.to)
      for (let i = n + 1; i < e.length; i++) {
        let o = e[i];
        if (o.from == r.from) {
          o.to != r.to && (e == t && (e = t.slice()), e[i] = o.copy(o.from, r.to), Kh(e, i + 1, o.copy(r.to, o.to)));
          continue;
        } else {
          o.from < r.to && (e == t && (e = t.slice()), e[n] = r.copy(r.from, o.from), Kh(e, i, r.copy(o.from, r.to)));
          break;
        }
      }
  }
  return e;
}
function Kh(t, e, n) {
  for (; e < t.length && Sr(n, t[e]) > 0; )
    e++;
  t.splice(e, 0, n);
}
function Zl(t) {
  let e = [];
  return t.someProp("decorations", (n) => {
    let r = n(t.state);
    r && r != Je && e.push(r);
  }), t.cursorWrapper && e.push(Me.create(t.state.doc, [t.cursorWrapper.deco])), zn.from(e);
}
const bS = {
  childList: !0,
  characterData: !0,
  characterDataOldValue: !0,
  attributes: !0,
  attributeOldValue: !0,
  subtree: !0
}, wS = ht && qn <= 11;
class xS {
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
class CS {
  constructor(e, n) {
    this.view = e, this.handleDOMChange = n, this.queue = [], this.flushingSoon = -1, this.observer = null, this.currentSelection = new xS(), this.onCharData = null, this.suppressingSelectionUpdates = !1, this.lastChangedTextNode = null, this.observer = window.MutationObserver && new window.MutationObserver((r) => {
      for (let i = 0; i < r.length; i++)
        this.queue.push(r[i]);
      ht && qn <= 11 && r.some((i) => i.type == "childList" && i.removedNodes.length || i.type == "characterData" && i.oldValue.length > i.target.nodeValue.length) ? this.flushSoon() : Ye && e.composing && r.some((i) => i.type == "childList" && i.target.nodeName == "TR") ? (e.input.badSafariComposition = !0, this.flushSoon()) : this.flush();
    }), wS && (this.onCharData = (r) => {
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
    this.observer && (this.observer.takeRecords(), this.observer.observe(this.view.dom, bS)), this.onCharData && this.view.dom.addEventListener("DOMCharacterDataModified", this.onCharData), this.connectSelection();
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
    if (Fh(this.view)) {
      if (this.suppressingSelectionUpdates)
        return xn(this.view);
      if (ht && qn <= 11 && !this.view.state.selection.empty) {
        let e = this.view.domSelectionRange();
        if (e.focusNode && Pr(e.focusNode, e.focusOffset, e.anchorNode, e.anchorOffset))
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
    for (let o = e.focusNode; o; o = Ii(o))
      n.add(o);
    for (let o = e.anchorNode; o; o = Ii(o))
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
    let r = e.domSelectionRange(), i = !this.suppressingSelectionUpdates && !this.currentSelection.eq(r) && Fh(e) && !this.ignoreSelectionChange(r), o = -1, s = -1, l = !1, a = [];
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
    } else if (Dt && a.length) {
      let c = a.filter((f) => f.nodeName == "BR");
      if (c.length == 2) {
        let [f, h] = c;
        f.parentNode && f.parentNode.parentNode == h.parentNode ? h.remove() : f.remove();
      } else {
        let { focusNode: f } = this.currentSelection;
        for (let h of c) {
          let d = h.parentNode;
          d && d.nodeName == "LI" && (!f || vS(e, f) != d) && h.remove();
        }
      }
    }
    let u = null;
    o < 0 && i && e.input.lastFocus > Date.now() - 200 && Math.max(e.input.lastTouch, e.input.lastClick.time) < Date.now() - 300 && gl(r) && (u = Hu(e)) && u.eq(te.near(e.state.doc.resolve(0), 1)) ? (e.input.lastFocus = 0, xn(e), this.currentSelection.set(r), e.scrollToSelection()) : (o > -1 || i) && (o > -1 && (e.docView.markDirty(o, s), SS(e)), e.input.badSafariComposition && (e.input.badSafariComposition = !1, TS(e, a)), this.handleDOMChange(o, s, l, a), e.docView && e.docView.dirty ? e.updateState(e.state) : this.currentSelection.eq(r) || xn(e), this.currentSelection.set(r));
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
      if (ht && qn <= 11 && e.addedNodes.length)
        for (let c = 0; c < e.addedNodes.length; c++) {
          let { previousSibling: f, nextSibling: h } = e.addedNodes[c];
          (!f || Array.prototype.indexOf.call(e.addedNodes, f) < 0) && (i = f), (!h || Array.prototype.indexOf.call(e.addedNodes, h) < 0) && (o = h);
        }
      let s = i && i.parentNode == e.target ? Ve(i) + 1 : 0, l = r.localPosFromDOM(e.target, s, -1), a = o && o.parentNode == e.target ? Ve(o) : e.target.childNodes.length, u = r.localPosFromDOM(e.target, a, 1);
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
let Uh = /* @__PURE__ */ new WeakMap(), Jh = !1;
function SS(t) {
  if (!Uh.has(t) && (Uh.set(t, null), ["normal", "nowrap", "pre-line"].indexOf(getComputedStyle(t.dom).whiteSpace) !== -1)) {
    if (t.requiresGeckoHackNode = Dt, Jh)
      return;
    console.warn("ProseMirror expects the CSS white-space property to be set, preferably to 'pre-wrap'. It is recommended to load style/prosemirror.css from the prosemirror-view package."), Jh = !0;
  }
}
function Gh(t, e) {
  let n = e.startContainer, r = e.startOffset, i = e.endContainer, o = e.endOffset, s = t.domAtPos(t.state.selection.anchor);
  return Pr(s.node, s.offset, i, o) && ([n, r, i, o] = [i, o, n, r]), { anchorNode: n, anchorOffset: r, focusNode: i, focusOffset: o };
}
function MS(t, e) {
  if (e.getComposedRanges) {
    let i = e.getComposedRanges(t.root)[0];
    if (i)
      return Gh(t, i);
  }
  let n;
  function r(i) {
    i.preventDefault(), i.stopImmediatePropagation(), n = i.getTargetRanges()[0];
  }
  return t.dom.addEventListener("beforeinput", r, !0), document.execCommand("indent"), t.dom.removeEventListener("beforeinput", r, !0), n ? Gh(t, n) : null;
}
function vS(t, e) {
  for (let n = e.parentNode; n && n != t.dom; n = n.parentNode) {
    let r = t.docView.nearestDesc(n, !0);
    if (r && r.node.isBlock)
      return n;
  }
  return null;
}
function TS(t, e) {
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
function NS(t, e, n) {
  let { node: r, fromOffset: i, toOffset: o, from: s, to: l } = t.docView.parseRange(e, n), a = t.domSelectionRange(), u, c = a.anchorNode;
  if (c && t.dom.contains(c.nodeType == 1 ? c : c.parentNode) && (u = [{ node: c, offset: a.anchorOffset }], gl(a) || u.push({ node: a.focusNode, offset: a.focusOffset })), He && t.input.lastKeyCode === 8)
    for (let x = o; x > i; x--) {
      let w = r.childNodes[x - 1], L = w.pmViewDesc;
      if (w.nodeName == "BR" && !L) {
        o = x;
        break;
      }
      if (!L || L.size)
        break;
    }
  let f = t.state.doc, h = t.someProp("domParser") || Eu.fromSchema(t.state.schema), d = f.resolve(s), p = null, g = h.parse(r, {
    topNode: d.parent,
    topMatch: d.parent.contentMatchAt(d.index()),
    topOpen: !0,
    from: i,
    to: o,
    preserveWhitespace: d.parent.type.whitespace == "pre" ? "full" : !0,
    findPositions: u,
    ruleFromNode: IS,
    context: d
  });
  if (u && u[0].pos != null) {
    let x = u[0].pos, w = u[1] && u[1].pos;
    w == null && (w = x), p = { anchor: x + s, head: w + s };
  }
  return { doc: g, sel: p, from: s, to: l };
}
function IS(t) {
  let e = t.pmViewDesc;
  if (e)
    return e.parseRule();
  if (t.nodeName == "BR" && t.parentNode) {
    if (Ye && /^(ul|ol)$/i.test(t.parentNode.nodeName)) {
      let n = document.createElement("div");
      return n.appendChild(document.createElement("li")), { skip: n };
    } else if (t.parentNode.lastChild == t || Ye && /^(tr|table)$/i.test(t.parentNode.nodeName))
      return { ignore: !0 };
  } else if (t.nodeName == "IMG" && t.getAttribute("mark-placeholder"))
    return { ignore: !0 };
  return null;
}
const AS = /^(a|abbr|acronym|b|bd[io]|big|br|button|cite|code|data(list)?|del|dfn|em|i|img|ins|kbd|label|map|mark|meter|output|q|ruby|s|samp|small|span|strong|su[bp]|time|u|tt|var)$/i;
function ES(t, e, n, r, i) {
  let o = t.input.compositionPendingChanges || (t.composing ? t.input.compositionID : 0);
  if (t.input.compositionPendingChanges = 0, e < 0) {
    let P = t.input.lastSelectionTime > Date.now() - 50 ? t.input.lastSelectionOrigin : null, F = Hu(t, P);
    if (F && !t.state.selection.eq(F)) {
      if (He && bn && t.input.lastKeyCode === 13 && Date.now() - 100 < t.input.lastKeyCodeTime && t.someProp("handleKeyDown", (N) => N(t, ar(13, "Enter"))))
        return;
      let J = t.state.tr.setSelection(F);
      P == "pointer" ? J.setMeta("pointer", !0) : P == "key" && J.scrollIntoView(), o && J.setMeta("composition", o), t.dispatch(J);
    }
    return;
  }
  let s = t.state.doc.resolve(e), l = s.sharedDepth(n);
  e = s.before(l + 1), n = t.state.doc.resolve(n).after(l + 1);
  let a = t.state.selection, u = NS(t, e, n), c = t.state.doc, f = c.slice(u.from, u.to), h, d;
  t.input.lastKeyCode === 8 && Date.now() - 100 < t.input.lastKeyCodeTime ? (h = t.state.selection.to, d = "end") : (h = t.state.selection.from, d = "start"), t.input.lastKeyCode = null;
  let p = RS(f.content, u.doc.content, u.from, h, d);
  if (p && t.input.domChangeCount++, (Ai && t.input.lastIOSEnter > Date.now() - 225 || bn) && i.some((P) => P.nodeType == 1 && !AS.test(P.nodeName)) && (!p || p.endA >= p.endB) && t.someProp("handleKeyDown", (P) => P(t, ar(13, "Enter")))) {
    t.input.lastIOSEnter = 0;
    return;
  }
  if (!p)
    if (r && a instanceof Y && !a.empty && a.$head.sameParent(a.$anchor) && !t.composing && !(u.sel && u.sel.anchor != u.sel.head))
      p = { start: a.from, endA: a.to, endB: a.to };
    else {
      if (u.sel) {
        let P = Yh(t, t.state.doc, u.sel);
        if (P && !P.eq(t.state.selection)) {
          let F = t.state.tr.setSelection(P);
          o && F.setMeta("composition", o), t.dispatch(F);
        }
      }
      return;
    }
  t.state.selection.from < t.state.selection.to && p.start == p.endB && t.state.selection instanceof Y && (p.start > t.state.selection.from && p.start <= t.state.selection.from + 2 && t.state.selection.from >= u.from ? p.start = t.state.selection.from : p.endA < t.state.selection.to && p.endA >= t.state.selection.to - 2 && t.state.selection.to <= u.to && (p.endB += t.state.selection.to - p.endA, p.endA = t.state.selection.to)), ht && qn <= 11 && p.endB == p.start + 1 && p.endA == p.start && p.start > u.from && u.doc.textBetween(p.start - u.from - 1, p.start - u.from + 1) == "  " && (p.start--, p.endA--, p.endB--);
  let g = u.doc.resolveNoCache(p.start - u.from), x = u.doc.resolveNoCache(p.endB - u.from), w = c.resolve(p.start), L = g.sameParent(x) && g.parent.inlineContent && w.end() >= p.endA;
  if ((Ai && t.input.lastIOSEnter > Date.now() - 225 && (!L || i.some((P) => P.nodeName == "DIV" || P.nodeName == "P")) || !L && g.pos < u.doc.content.size && (!g.sameParent(x) || !g.parent.inlineContent) && g.pos < x.pos && !/\S/.test(u.doc.textBetween(g.pos, x.pos, "", ""))) && t.someProp("handleKeyDown", (P) => P(t, ar(13, "Enter")))) {
    t.input.lastIOSEnter = 0;
    return;
  }
  if (t.state.selection.anchor > p.start && DS(c, p.start, p.endA, g, x) && t.someProp("handleKeyDown", (P) => P(t, ar(8, "Backspace")))) {
    bn && He && t.domObserver.suppressSelectionUpdates();
    return;
  }
  He && p.endB == p.start && (t.input.lastChromeDelete = Date.now()), bn && !L && g.start() != x.start() && x.parentOffset == 0 && g.depth == x.depth && u.sel && u.sel.anchor == u.sel.head && u.sel.head == p.endA && (p.endB -= 2, x = u.doc.resolveNoCache(p.endB - u.from), setTimeout(() => {
    t.someProp("handleKeyDown", function(P) {
      return P(t, ar(13, "Enter"));
    });
  }, 20));
  let A = p.start, j = p.endA, H = (P) => {
    let F = P || t.state.tr.replace(A, j, u.doc.slice(p.start - u.from, p.endB - u.from));
    if (u.sel) {
      let J = Yh(t, F.doc, u.sel);
      J && !(He && t.composing && J.empty && (p.start != p.endB || t.input.lastChromeDelete < Date.now() - 100) && (J.head == A || J.head == F.mapping.map(j) - 1) || ht && J.empty && J.head == A) && F.setSelection(J);
    }
    return o && F.setMeta("composition", o), F.scrollIntoView();
  }, M;
  if (L)
    if (g.pos == x.pos) {
      ht && qn <= 11 && g.parentOffset == 0 && (t.domObserver.suppressSelectionUpdates(), setTimeout(() => xn(t), 20));
      let P = H(t.state.tr.delete(A, j)), F = c.resolve(p.start).marksAcross(c.resolve(p.endA));
      F && P.ensureMarks(F), t.dispatch(P);
    } else if (
      // Adding or removing a mark
      p.endA == p.endB && (M = OS(g.parent.content.cut(g.parentOffset, x.parentOffset), w.parent.content.cut(w.parentOffset, p.endA - w.start())))
    ) {
      let P = H(t.state.tr);
      M.type == "add" ? P.addMark(A, j, M.mark) : P.removeMark(A, j, M.mark), t.dispatch(P);
    } else if (g.parent.child(g.index()).isText && g.index() == x.index() - (x.textOffset ? 0 : 1)) {
      let P = g.parent.textBetween(g.parentOffset, x.parentOffset), F = () => H(t.state.tr.insertText(P, A, j));
      t.someProp("handleTextInput", (J) => J(t, A, j, P, F)) || t.dispatch(F());
    } else
      t.dispatch(H());
  else
    t.dispatch(H());
}
function Yh(t, e, n) {
  return Math.max(n.anchor, n.head) > e.content.size ? null : ju(t, e.resolve(n.anchor), e.resolve(n.head));
}
function OS(t, e) {
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
function DS(t, e, n, r, i) {
  if (
    // The content must have shrunk
    n - e <= i.pos - r.pos || // newEnd must point directly at or after the end of the block that newStart points into
    ea(r, !0, !1) < i.pos
  )
    return !1;
  let o = t.resolve(e);
  if (!r.parent.isTextblock) {
    let l = o.nodeAfter;
    return l != null && n == e + l.nodeSize;
  }
  if (o.parentOffset < o.parent.content.size || !o.parent.isTextblock)
    return !1;
  let s = t.resolve(ea(o, !0, !0));
  return !s.parent.isTextblock || s.pos > n || ea(s, !0, !1) < n ? !1 : r.parent.content.cut(r.parentOffset).eq(s.parent.content);
}
function ea(t, e, n) {
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
function RS(t, e, n, r, i) {
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
    o -= a, o && o < e.size && Qh(e.textBetween(o - 1, o + 1)) && (o += a ? 1 : -1), l = o + (l - s), s = o;
  } else if (l < o) {
    let a = r <= o && r >= l ? o - r : 0;
    o -= a, o && o < t.size && Qh(t.textBetween(o - 1, o + 1)) && (o += a ? 1 : -1), s = o + (s - l), l = o;
  }
  return { start: o, endA: s, endB: l };
}
function Qh(t) {
  if (t.length != 2)
    return !1;
  let e = t.charCodeAt(0), n = t.charCodeAt(1);
  return e >= 56320 && e <= 57343 && n >= 55296 && n <= 56319;
}
class eg {
  /**
  Create a view. `place` may be a DOM node that the editor should
  be appended to, a function that will place it into the document,
  or an object whose `mount` property holds the node to use as the
  document container. If it is `null`, the editor will not be
  added to the document.
  */
  constructor(e, n) {
    this._root = null, this.focused = !1, this.trackWrites = null, this.mounted = !1, this.markCursor = null, this.cursorWrapper = null, this.lastSelectedViewDesc = void 0, this.input = new GC(), this.prevDirectPlugins = [], this.pluginViews = [], this.requiresGeckoHackNode = !1, this.dragging = null, this._props = n, this.state = n.state, this.directPlugins = n.plugins || [], this.directPlugins.forEach(nd), this.dispatch = this.dispatch.bind(this), this.dom = e && e.mount || document.createElement("div"), e && (e.appendChild ? e.appendChild(this.dom) : typeof e == "function" ? e(this.dom) : e.mount && (this.mounted = !0)), this.editable = ed(this), Zh(this), this.nodeViews = td(this), this.docView = Dh(this.state.doc, Xh(this), Zl(this), this.dom, this), this.domObserver = new CS(this, (r, i, o, s) => ES(this, r, i, o, s)), this.domObserver.start(), YC(this), this.updatePluginViews();
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
    e.handleDOMEvents != this._props.handleDOMEvents && ou(this);
    let n = this._props;
    this._props = e, e.plugins && (e.plugins.forEach(nd), this.directPlugins = e.plugins), this.updateStateInner(e.state, n);
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
    e.storedMarks && this.composing && (Um(this), s = !0), this.state = e;
    let l = i.plugins != e.plugins || this._props.plugins != n.plugins;
    if (l || this._props.plugins != n.plugins || this._props.nodeViews != n.nodeViews) {
      let d = td(this);
      PS(d, this.nodeViews) && (this.nodeViews = d, o = !0);
    }
    (l || n.handleDOMEvents != this._props.handleDOMEvents) && ou(this), this.editable = ed(this), Zh(this);
    let a = Zl(this), u = Xh(this), c = i.plugins != e.plugins && !i.doc.eq(e.doc) ? "reset" : e.scrollToSelection > i.scrollToSelection ? "to selection" : "preserve", f = o || !this.docView.matchesNode(e.doc, u, a);
    (f || !e.selection.eq(i.selection)) && (s = !0);
    let h = c == "preserve" && s && this.dom.style.overflowAnchor == null && cC(this);
    if (s) {
      this.domObserver.stop();
      let d = f && (ht || He) && !this.composing && !i.selection.empty && !e.selection.empty && LS(i.selection, e.selection);
      if (f) {
        let p = He ? this.trackWrites = this.domSelectionRange().focusNode : null;
        this.composing && (this.input.compositionNode = cS(this)), (o || !this.docView.update(e.doc, u, a, this)) && (this.docView.updateOuterDeco(u), this.docView.destroy(), this.docView = Dh(e.doc, u, a, this.dom, this)), p && (!this.trackWrites || !this.dom.contains(this.trackWrites)) && (d = !0);
      }
      d || !(this.input.mouseDown && this.domObserver.currentSelection.eq(this.domSelectionRange()) && LC(this)) ? xn(this, d) : (Pm(this, e.selection), this.domObserver.setCurSelection()), this.domObserver.start();
    }
    this.updatePluginViews(i), !((r = this.dragging) === null || r === void 0) && r.node && !i.doc.eq(e.doc) && this.updateDraggedNode(this.dragging, i), c == "reset" ? this.dom.scrollTop = 0 : c == "to selection" ? this.scrollToSelection() : h && fC(h);
  }
  /**
  @internal
  */
  scrollToSelection() {
    let e = this.domSelectionRange().focusNode;
    if (!(!e || !this.dom.contains(e.nodeType == 1 ? e : e.parentNode))) {
      if (!this.someProp("handleScrollToSelection", (n) => n(this))) if (this.state.selection instanceof X) {
        let n = this.docView.domAfterPos(this.state.selection.from);
        n.nodeType == 1 && Th(this, n.getBoundingClientRect(), e);
      } else
        Th(this, this.coordsAtPos(this.state.selection.head, 1), e);
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
    this.dragging = new Gm(e.slice, e.move, i < 0 ? void 0 : X.create(this.state.doc, i));
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
    if (ht) {
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
    this.domObserver.stop(), this.editable && hC(this.dom), xn(this), this.domObserver.start();
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
    return yC(this, e);
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
    return Nm(this, e, n);
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
    return CC(this, n || this.state, e);
  }
  /**
  Run the editor's paste logic with the given HTML string. The
  `event`, if given, will be passed to the
  [`handlePaste`](https://prosemirror.net/docs/ref/#view.EditorProps.handlePaste) hook.
  */
  pasteHTML(e, n) {
    return vo(this, "", e, !1, n || new ClipboardEvent("paste"));
  }
  /**
  Run the editor's paste logic with the given plain-text input.
  */
  pasteText(e, n) {
    return vo(this, e, null, !0, n || new ClipboardEvent("paste"));
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
    return Wu(this, e);
  }
  /**
  Removes the editor from the DOM and destroys all [node
  views](https://prosemirror.net/docs/ref/#view.NodeView).
  */
  destroy() {
    this.docView && (QC(this), this.destroyPluginViews(), this.mounted ? (this.docView.update(this.state.doc, [], Zl(this), this), this.dom.textContent = "") : this.dom.parentNode && this.dom.parentNode.removeChild(this.dom), this.docView.destroy(), this.docView = null, eC());
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
    return ZC(this, e);
  }
  /**
  @internal
  */
  domSelectionRange() {
    let e = this.domSelection();
    return e ? Ye && this.root.nodeType === 11 && oC(this.dom.ownerDocument) == this.dom && MS(this, e) || e : { focusNode: null, focusOffset: 0, anchorNode: null, anchorOffset: 0 };
  }
  /**
  @internal
  */
  domSelection() {
    return this.root.getSelection();
  }
}
eg.prototype.dispatch = function(t) {
  let e = this._props.dispatchTransaction;
  e ? e.call(this, t) : this.updateState(this.state.apply(t));
};
function Xh(t) {
  let e = /* @__PURE__ */ Object.create(null);
  return e.class = "ProseMirror", e.contenteditable = String(t.editable), t.someProp("attributes", (n) => {
    if (typeof n == "function" && (n = n(t.state)), n)
      for (let r in n)
        r == "class" ? e.class += " " + n[r] : r == "style" ? e.style = (e.style ? e.style + ";" : "") + n[r] : !e[r] && r != "contenteditable" && r != "nodeName" && (e[r] = String(n[r]));
  }), e.translate || (e.translate = "no"), [je.node(0, t.state.doc.content.size, e)];
}
function Zh(t) {
  if (t.markCursor) {
    let e = document.createElement("img");
    e.className = "ProseMirror-separator", e.setAttribute("mark-placeholder", "true"), e.setAttribute("alt", ""), t.cursorWrapper = { dom: e, deco: je.widget(t.state.selection.from, e, { raw: !0, marks: t.markCursor }) };
  } else
    t.cursorWrapper = null;
}
function ed(t) {
  return !t.someProp("editable", (e) => e(t.state) === !1);
}
function LS(t, e) {
  let n = Math.min(t.$anchor.sharedDepth(t.head), e.$anchor.sharedDepth(e.head));
  return t.$anchor.start(n) != e.$anchor.start(n);
}
function td(t) {
  let e = /* @__PURE__ */ Object.create(null);
  function n(r) {
    for (let i in r)
      Object.prototype.hasOwnProperty.call(e, i) || (e[i] = r[i]);
  }
  return t.someProp("nodeViews", n), t.someProp("markViews", n), e;
}
function PS(t, e) {
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
function nd(t) {
  if (t.spec.state || t.spec.filterTransaction || t.spec.appendTransaction)
    throw new RangeError("Plugins passed directly to the view must not have a state component");
}
function Mn(t, e) {
  return t.meta = {
    package: "@milkdown/core",
    group: "System",
    ...e
  }, t;
}
var tg = {
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
}, Ae = ae({}, "editorView"), no = ae({}, "editorState"), ta = ae([], "initTimer"), rd = ae({}, "editor"), No = ae([], "inputRules"), Sn = ae([], "prosePlugins"), Io = ae([], "remarkPlugins"), su = ae([], "nodeView"), lu = ae([], "markView"), Mr = ae(_a().use(Ra).use(Ba), "remark"), co = ae({
  handlers: tg,
  encode: []
}, "remarkStringifyOptions"), As = Zt("ConfigReady");
function zS(t) {
  const e = (n) => (n.record(As), async () => (await t(n), n.done(As), () => {
    n.clearTimer(As);
  }));
  return Mn(e, { displayName: "Config" }), e;
}
var vr = Zt("InitReady");
function BS(t) {
  const e = (n) => (n.inject(rd, t).inject(Sn, []).inject(Io, []).inject(No, []).inject(su, []).inject(lu, []).inject(co, {
    handlers: tg,
    encode: []
  }).inject(Mr, _a().use(Ra).use(Ba)).inject(ta, [As]).record(vr), async () => {
    await n.waitTimers(ta);
    const r = n.get(co);
    return n.set(Mr, _a().use(Ra).use(Ba, r)), n.done(vr), () => {
      n.remove(rd).remove(Sn).remove(Io).remove(No).remove(su).remove(lu).remove(co).remove(Mr).remove(ta).clearTimer(vr);
    };
  });
  return Mn(e, { displayName: "Init" }), e;
}
var dt = Zt("SchemaReady"), na = ae([], "schemaTimer"), Jn = ae({}, "schema"), fo = ae([], "nodes"), ho = ae([], "marks");
function id(t) {
  var e;
  return {
    ...t,
    parseDOM: (e = t.parseDOM) == null ? void 0 : e.map((n) => ({
      priority: t.priority,
      ...n
    }))
  };
}
var ng = (t) => (t.inject(Jn, {}).inject(fo, []).inject(ho, []).inject(na, [vr]).record(dt), async () => {
  await t.waitTimers(na);
  const e = t.get(Mr), n = t.get(Io).reduce((i, o) => i.use(o.plugin, o.options), e);
  t.set(Mr, n);
  const r = new Iw({
    nodes: Object.fromEntries(t.get(fo).map(([i, o]) => [i, id(o)])),
    marks: Object.fromEntries(t.get(ho).map(([i, o]) => [i, id(o)]))
  });
  return t.set(Jn, r), t.done(dt), () => {
    t.remove(Jn).remove(fo).remove(ho).remove(na).clearTimer(dt);
  };
});
Mn(ng, { displayName: "Schema" });
var mr, It, Kd, rg = (Kd = class {
  constructor() {
    q(this, mr);
    q(this, It);
    z(this, mr, new Gd()), z(this, It, null), this.setCtx = (t) => {
      z(this, It, t);
    }, this.chain = () => {
      if (v(this, It) == null) throw Il();
      const t = v(this, It), e = [], n = this.get.bind(this), r = {
        run: () => {
          const o = Bi(...e), s = t.get(Ae);
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
    return v(this, It);
  }
  create(t, e) {
    const n = t.create(v(this, mr).sliceMap);
    return n.set(e), n;
  }
  get(t) {
    return v(this, mr).get(t).get();
  }
  remove(t) {
    return v(this, mr).remove(t);
  }
  call(t, e) {
    if (v(this, It) == null) throw Il();
    const n = this.get(t)(e), r = v(this, It).get(Ae);
    return n(r.state, r.dispatch, r);
  }
  inline(t) {
    if (v(this, It) == null) throw Il();
    const e = v(this, It).get(Ae);
    return t(e.state, e.dispatch, e);
  }
}, mr = new WeakMap(), It = new WeakMap(), Kd);
function FS(t = "cmdKey") {
  return ae(() => () => !1, t);
}
var ge = ae(new rg(), "commands"), ra = ae([dt], "commandsTimer"), po = Zt("CommandsReady"), ig = (t) => {
  const e = new rg();
  return e.setCtx(t), t.inject(ge, e).inject(ra, [dt]).record(po), async () => (await t.waitTimers(ra), t.done(po), () => {
    t.remove(ge).remove(ra).clearTimer(po);
  });
};
Mn(ig, { displayName: "Commands" });
function $S(t) {
  return t.Backspace = Bi(Ix, Pu, ux, lm), t;
}
var gr, ut, Ud, og = (Ud = class {
  constructor() {
    q(this, gr);
    q(this, ut);
    z(this, gr, null), z(this, ut, []), this.setCtx = (t) => {
      z(this, gr, t);
    }, this.add = (t) => (v(this, ut).push(t), () => {
      z(this, ut, v(this, ut).filter((e) => e !== t));
    }), this.addObjectKeymap = (t) => {
      const e = [];
      return Object.entries(t).forEach(([n, r]) => {
        if (typeof r == "function") {
          const i = {
            key: n,
            onRun: () => r
          };
          v(this, ut).push(i), e.push(() => {
            z(this, ut, v(this, ut).filter((o) => o !== i));
          });
        } else
          v(this, ut).push(r), e.push(() => {
            z(this, ut, v(this, ut).filter((i) => i !== r));
          });
      }), () => {
        e.forEach((n) => n());
      };
    }, this.addBaseKeymap = () => {
      const t = $S(Tx);
      return this.addObjectKeymap(t);
    }, this.build = () => {
      const t = {};
      return v(this, ut).forEach((e) => {
        t[e.key] = [...t[e.key] || [], e];
      }), Object.fromEntries(Object.entries(t).map(([e, n]) => {
        const r = n.sort((o, s) => (s.priority ?? 50) - (o.priority ?? 50));
        return [e, (o, s, l) => {
          const a = v(this, gr);
          if (a == null) throw sl();
          return Bi(...r.map((u) => u.onRun(a)))(o, s, l);
        }];
      }));
    };
  }
  get ctx() {
    return v(this, gr);
  }
}, gr = new WeakMap(), ut = new WeakMap(), Ud), Xs = ae(new og(), "keymap"), ia = ae([dt], "keymapTimer"), mo = Zt("KeymapReady"), _S = (t) => {
  const e = new og();
  return e.setCtx(t), t.inject(Xs, e).inject(ia, [dt]).record(mo), async () => (await t.waitTimers(ia), t.done(mo), () => {
    t.remove(Xs).remove(ia).clearTimer(mo);
  });
}, Es = Zt("ParserReady"), sg = () => {
  throw sl();
}, Os = ae(sg, "parser"), oa = ae([], "parserTimer"), lg = (t) => (t.inject(Os, sg).inject(oa, [dt]).record(Es), async () => {
  await t.waitTimers(oa);
  const e = t.get(Mr), n = t.get(Jn);
  return t.set(Os, Qx.create(n, e)), t.done(Es), () => {
    t.remove(Os).remove(oa).clearTimer(Es);
  };
});
Mn(lg, { displayName: "Parser" });
var go = Zt("SerializerReady"), sa = ae([], "serializerTimer"), ag = () => {
  throw sl();
}, yo = ae(ag, "serializer"), ug = (t) => (t.inject(yo, ag).inject(sa, [dt]).record(go), async () => {
  await t.waitTimers(sa);
  const e = t.get(Mr), n = t.get(Jn);
  return t.set(yo, Zx.create(n, e)), t.done(go), () => {
    t.remove(yo).remove(sa).clearTimer(go);
  };
});
Mn(ug, { displayName: "Serializer" });
var Ds = ae("", "defaultValue"), la = ae((t) => t, "stateOptions"), aa = ae([], "editorStateTimer"), Rs = Zt("EditorStateReady");
function VS(t, e, n) {
  if (typeof t == "string") return e(t);
  if (t.type === "html") return Eu.fromSchema(n).parse(t.dom);
  if (t.type === "json") return wn.fromJSON(n, t.value);
  throw Tk(t);
}
var HS = new Xe("MILKDOWN_STATE_TRACKER"), cg = (t) => (t.inject(Ds, "").inject(no, {}).inject(la, (e) => e).inject(aa, [
  Es,
  go,
  po,
  mo
]).record(Rs), async () => {
  await t.waitTimers(aa);
  const e = t.get(Jn), n = t.get(Os), r = t.get(No), i = t.get(la), o = t.get(Sn), s = VS(t.get(Ds), n, e), l = t.get(Xs), a = l.addBaseKeymap(), u = [
    ...o,
    new Be({
      key: HS,
      state: {
        init: () => {
        },
        apply: (h, d, p, g) => {
          t.set(no, g);
        }
      }
    }),
    zx({ rules: r }),
    mm(l.build())
  ];
  t.set(Sn, u);
  const c = i({
    schema: e,
    doc: s,
    plugins: u
  }), f = Zr.create(c);
  return t.set(no, f), t.done(Rs), () => {
    a(), t.remove(Ds).remove(no).remove(la).remove(aa).clearTimer(Rs);
  };
});
Mn(cg, { displayName: "EditorState" });
var Ao = ae([], "pasteRule"), ua = ae([dt], "pasteRuleTimer"), Ls = Zt("PasteRuleReady"), fg = (t) => (t.inject(Ao, []).inject(ua, [dt]).record(Ls), async () => (await t.waitTimers(ua), t.done(Ls), () => {
  t.remove(Ao).remove(ua).clearTimer(Ls);
}));
Mn(fg, { displayName: "PasteRule" });
var Ps = Zt("EditorViewReady"), ca = ae([], "editorViewTimer"), fa = ae({}, "editorViewOptions"), zs = ae(null, "root"), au = ae(null, "rootDOM"), uu = ae({}, "rootAttrs");
function jS(t, e) {
  const n = document.createElement("div");
  n.className = "milkdown", t.appendChild(n), e.set(au, n);
  const r = e.get(uu);
  return Object.entries(r).forEach(([i, o]) => n.setAttribute(i, o)), n;
}
function WS(t) {
  t.classList.add("editor"), t.setAttribute("role", "textbox");
}
var qS = new Xe("MILKDOWN_VIEW_CLEAR"), hg = (t) => (t.inject(zs, document.body).inject(Ae, {}).inject(fa, {}).inject(au, null).inject(uu, {}).inject(ca, [Rs, Ls]).record(Ps), async () => {
  await t.wait(vr);
  const e = t.get(zs) || document.body, n = typeof e == "string" ? document.querySelector(e) : e;
  t.update(Sn, (s) => [new Be({
    key: qS,
    view: (l) => {
      const a = n ? jS(n, t) : void 0;
      return (() => {
        if (a && n) {
          const c = l.dom;
          n.replaceChild(a, c), a.appendChild(c);
        }
      })(), { destroy: () => {
        a != null && a.parentNode && (a == null || a.parentNode.replaceChild(l.dom, a)), a == null || a.remove();
      } };
    }
  }), ...s]), await t.waitTimers(ca);
  const r = t.get(no), i = t.get(fa), o = new eg(n, {
    state: r,
    nodeViews: Object.fromEntries(t.get(su)),
    markViews: Object.fromEntries(t.get(lu)),
    transformPasted: (s, l, a) => (t.get(Ao).sort((u, c) => (c.priority ?? 50) - (u.priority ?? 50)).map((u) => u.run).forEach((u) => {
      s = u(s, l, a);
    }), s),
    ...i
  });
  return WS(o.dom), t.set(Ae, o), t.done(Ps), () => {
    o == null || o.destroy(), t.remove(zs).remove(Ae).remove(fa).remove(au).remove(uu).remove(ca).clearTimer(Ps);
  };
});
Mn(hg, { displayName: "EditorView" });
var Tt = /* @__PURE__ */ function(t) {
  return t.Idle = "Idle", t.OnCreate = "OnCreate", t.Created = "Created", t.OnDestroy = "OnDestroy", t.Destroyed = "Destroyed", t;
}({}), yr, bt, mn, xi, Wo, qo, ct, gn, kr, Ko, br, Ci, Uo, Vn, Si, Mi, KS = (Mi = class {
  constructor() {
    q(this, yr);
    q(this, bt);
    q(this, mn);
    q(this, xi);
    q(this, Wo);
    q(this, qo);
    q(this, ct);
    q(this, gn);
    q(this, kr);
    q(this, Ko);
    q(this, br);
    q(this, Ci);
    q(this, Uo);
    q(this, Vn);
    q(this, Si);
    z(this, yr, !1), z(this, bt, Tt.Idle), z(this, mn, []), z(this, xi, () => {
    }), z(this, Wo, new Gd()), z(this, qo, new Fk()), z(this, ct, /* @__PURE__ */ new Map()), z(this, gn, /* @__PURE__ */ new Map()), z(this, kr, new Bk(v(this, Wo), v(this, qo))), z(this, Ko, () => {
      const e = zS(async (r) => {
        await Promise.all(v(this, mn).map((i) => Promise.resolve(i(r))));
      }), n = [
        ng,
        lg,
        ug,
        ig,
        _S,
        fg,
        cg,
        hg,
        BS(this),
        e
      ];
      v(this, br).call(this, n, v(this, gn));
    }), z(this, br, (e, n) => {
      e.forEach((r) => {
        const i = v(this, kr).produce(v(this, yr) ? r.meta : void 0), o = r(i);
        n.set(r, {
          ctx: i,
          handler: o,
          cleanup: void 0
        });
      });
    }), z(this, Ci, (e, n = !1) => Promise.all([e].flat().map(async (r) => {
      var o;
      const i = (o = v(this, ct).get(r)) == null ? void 0 : o.cleanup;
      return n ? v(this, ct).delete(r) : v(this, ct).set(r, {
        ctx: void 0,
        handler: void 0,
        cleanup: void 0
      }), typeof i == "function" ? i() : i;
    }))), z(this, Uo, async () => {
      await Promise.all([...v(this, gn).entries()].map(async ([e, { cleanup: n }]) => typeof n == "function" ? n() : n)), v(this, gn).clear();
    }), z(this, Vn, (e) => {
      z(this, bt, e), v(this, xi).call(this, e);
    }), z(this, Si, (e) => [...e.entries()].map(async ([n, r]) => {
      const { ctx: i, handler: o } = r;
      if (!o) return;
      const s = await o();
      e.set(n, {
        ctx: i,
        handler: o,
        cleanup: s
      });
    })), this.enableInspector = (e = !0) => (z(this, yr, e), this), this.onStatusChange = (e) => (z(this, xi, e), this), this.config = (e) => (v(this, mn).push(e), this), this.removeConfig = (e) => (z(this, mn, v(this, mn).filter((n) => n !== e)), this), this.use = (e) => {
      const n = [e].flat();
      return n.flat().forEach((r) => {
        v(this, ct).set(r, {
          ctx: void 0,
          handler: void 0,
          cleanup: void 0
        });
      }), v(this, bt) === Tt.Created && v(this, br).call(this, n, v(this, ct)), this;
    }, this.remove = async (e) => v(this, bt) === Tt.OnCreate ? (console.warn("[Milkdown]: You are trying to remove plugins when the editor is creating, this is not recommended, please check your code."), new Promise((n) => {
      setTimeout(() => {
        n(this.remove(e));
      }, 50);
    })) : (await v(this, Ci).call(this, [e].flat(), !0), this), this.create = async () => v(this, bt) === Tt.OnCreate ? this : (v(this, bt) === Tt.Created && await this.destroy(), v(this, Vn).call(this, Tt.OnCreate), v(this, Ko).call(this), v(this, br).call(this, [...v(this, ct).keys()], v(this, ct)), await Promise.all([v(this, Si).call(this, v(this, gn)), v(this, Si).call(this, v(this, ct))].flat()), v(this, Vn).call(this, Tt.Created), this), this.destroy = async (e = !1) => v(this, bt) === Tt.Destroyed || v(this, bt) === Tt.OnDestroy ? this : v(this, bt) === Tt.OnCreate ? new Promise((n) => {
      setTimeout(() => {
        n(this.destroy(e));
      }, 50);
    }) : (e && z(this, mn, []), v(this, Vn).call(this, Tt.OnDestroy), await v(this, Ci).call(this, [...v(this, ct).keys()], e), await v(this, Uo).call(this), v(this, Vn).call(this, Tt.Destroyed), this), this.action = (e) => e(v(this, kr)), this.inspect = () => v(this, yr) ? [...v(this, gn).values(), ...v(this, ct).values()].map(({ ctx: e }) => {
      var n;
      return (n = e == null ? void 0 : e.inspector) == null ? void 0 : n.read();
    }).filter((e) => !!e) : (console.warn("[Milkdown]: You are trying to collect inspection when inspector is disabled, please enable inspector by `editor.enableInspector()` first."), []);
  }
  static make() {
    return new Mi();
  }
  get ctx() {
    return v(this, kr);
  }
  get status() {
    return v(this, bt);
  }
}, yr = new WeakMap(), bt = new WeakMap(), mn = new WeakMap(), xi = new WeakMap(), Wo = new WeakMap(), qo = new WeakMap(), ct = new WeakMap(), gn = new WeakMap(), kr = new WeakMap(), Ko = new WeakMap(), br = new WeakMap(), Ci = new WeakMap(), Uo = new WeakMap(), Vn = new WeakMap(), Si = new WeakMap(), Mi);
function Z(t, e) {
  const n = FS(t), r = (i) => async () => {
    r.key = n, await i.wait(po);
    const o = e(i);
    return i.get(ge).create(n, o), r.run = (s) => i.get(ge).call(t, s), () => {
      i.get(ge).remove(n);
    };
  };
  return r;
}
function mt(t) {
  const e = (n) => async () => {
    await n.wait(dt);
    const r = t(n);
    return n.update(No, (i) => [...i, r]), e.inputRule = r, () => {
      n.update(No, (i) => i.filter((o) => o !== r));
    };
  };
  return e;
}
function US(t) {
  const e = (n) => async () => {
    await n.wait(dt);
    const r = t(n);
    return n.update(Ao, (i) => [...i, r]), e.pasteRule = r, () => {
      n.update(Ao, (i) => i.filter((o) => o !== r));
    };
  };
  return e;
}
function JS(t, e) {
  const n = (r) => async () => {
    const i = e(r);
    return r.update(ho, (o) => [...o.filter((s) => s[0] !== t), [t, i]]), n.id = t, n.schema = i, () => {
      r.update(ho, (o) => o.filter(([s]) => s !== t));
    };
  };
  return n.type = (r) => {
    const i = r.get(Jn).marks[t];
    if (!i) throw Rk(t);
    return i;
  }, n;
}
function Yu(t, e) {
  const n = (r) => async () => {
    const i = e(r);
    return r.update(fo, (o) => [...o.filter((s) => s[0] !== t), [t, i]]), n.id = t, n.schema = i, () => {
      r.update(fo, (o) => o.filter(([s]) => s !== t));
    };
  };
  return n.type = (r) => {
    const i = r.get(Jn).nodes[t];
    if (!i) throw Dk(t);
    return i;
  }, n;
}
function en(t) {
  let e;
  const n = (r) => async () => (await r.wait(dt), e = t(r), r.update(Sn, (i) => [...i, e]), () => {
    r.update(Sn, (i) => i.filter((o) => o !== e));
  });
  return n.plugin = () => e, n.key = () => e.spec.key, n;
}
function GS(t) {
  const e = (n) => async () => {
    await n.wait(mo);
    const r = n.get(Xs), i = t(n), o = r.addObjectKeymap(i);
    return e.keymap = i, () => {
      o();
    };
  };
  return e;
}
function vn(t, e) {
  const n = ae(t, e), r = (i) => (i.inject(n), () => () => {
    i.remove(n);
  });
  return r.key = n, r;
}
function Ne(t, e) {
  const n = vn(e, t), r = Yu(t, (o) => o.get(n.key)(o)), i = [n, r];
  return i.id = r.id, i.node = r, i.type = (o) => r.type(o), i.ctx = n, i.key = n.key, i.extendSchema = (o) => Ne(t, o(e)), i;
}
function Fi(t, e) {
  const n = vn(e, t), r = JS(t, (o) => o.get(n.key)(o)), i = [n, r];
  return i.id = r.id, i.mark = r, i.type = (o) => r.type(o), i.ctx = n, i.key = n.key, i.extendSchema = (o) => Fi(t, o(e)), i;
}
function gt(t, e) {
  const n = vn(Object.fromEntries(Object.entries(e).map(([o, { shortcuts: s, priority: l }]) => [o, {
    shortcuts: s,
    priority: l
  }])), `${t}Keymap`), r = GS((o) => {
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
var Ht = (t, e = () => ({})) => vn(e, `${t}Attr`), ts = (t, e = () => ({})) => vn(e, `${t}Attr`);
function tn(t, e, n) {
  const r = vn({}, t), i = (s) => async () => {
    await s.wait(vr);
    const l = {
      plugin: e(s),
      options: s.get(r.key)
    };
    return s.update(Io, (a) => [...a, l]), () => {
      s.update(Io, (a) => a.filter((u) => u !== l));
    };
  }, o = [r, i];
  return o.id = t, o.plugin = i, o.options = r, o;
}
function YS(t, e) {
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
        let f = R.empty, h = i.index(-1) ? 1 : i.index(-2) ? 2 : 3;
        for (let w = i.depth - h; w >= i.depth - 3; w--)
          f = R.from(i.node(w).copy(f));
        let d = i.indexAfter(-1) < i.node(-2).childCount ? 1 : i.indexAfter(-2) < i.node(-3).childCount ? 2 : 3;
        f = f.append(R.from(t.createAndFill()));
        let p = i.before(i.depth - (h - 1)), g = n.tr.replace(p, i.after(-d), new _(f, 4 - h, 0)), x = -1;
        g.doc.nodesBetween(p, g.doc.content.size, (w, L) => {
          if (x > -1)
            return !1;
          w.isTextblock && w.content.size == 0 && (x = L + 1);
        }), x > -1 && g.setSelection(te.near(g.doc.resolve(x))), r(g.scrollIntoView());
      }
      return !0;
    }
    let a = o.pos == i.end() ? l.contentMatchAt(0).defaultType : null, u = n.tr.delete(i.pos, o.pos), c = a ? [null, { type: a }] : void 0;
    return lo(u.doc, i.pos, 2, c) ? (r && r(u.split(i.pos, 2, c).scrollIntoView()), !0) : !1;
  };
}
function dg(t) {
  return function(e, n) {
    let { $from: r, $to: i } = e.selection, o = r.blockRange(i, (s) => s.childCount > 0 && s.firstChild.type == t);
    return o ? n ? r.node(o.depth - 1).type == t ? QS(e, n, t, o) : XS(e, n, o) : !0 : !1;
  };
}
function QS(t, e, n, r) {
  let i = t.tr, o = r.end, s = r.$to.end(r.depth);
  o < s && (i.step(new Ge(o - 1, s, o, s, new _(R.from(n.create(null, r.parent.copy())), 1, 0), 1, !0)), r = new Rp(i.doc.resolve(r.$from.pos), i.doc.resolve(s), r.depth));
  const l = hl(r);
  if (l == null)
    return !1;
  i.lift(r, l);
  let a = i.doc.resolve(i.mapping.map(o, -1) - 1);
  return dl(i.doc, a.pos) && a.nodeBefore.type == a.nodeAfter.type && i.join(a.pos), e(i.scrollIntoView()), !0;
}
function XS(t, e, n) {
  let r = t.tr, i = n.parent;
  for (let d = n.end, p = n.endIndex - 1, g = n.startIndex; p > g; p--)
    d -= i.child(p).nodeSize, r.delete(d - 1, d + 1);
  let o = r.doc.resolve(n.start), s = o.nodeAfter;
  if (r.mapping.map(n.end) != n.start + o.nodeAfter.nodeSize)
    return !1;
  let l = n.startIndex == 0, a = n.endIndex == i.childCount, u = o.node(-1), c = o.index(-1);
  if (!u.canReplace(c + (l ? 0 : 1), c + 1, s.content.append(a ? R.empty : R.from(i))))
    return !1;
  let f = o.pos, h = f + s.nodeSize;
  return r.step(new Ge(f - (l ? 1 : 0), h + (a ? 1 : 0), f + 1, h - 1, new _((l ? R.empty : R.from(i.copy(R.empty))).append(a ? R.empty : R.from(i.copy(R.empty))), l ? 0 : 1, a ? 0 : 1), l ? 0 : 1)), e(r.scrollIntoView()), !0;
}
function ZS(t) {
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
      let u = a.lastChild && a.lastChild.type == l.type, c = R.from(u ? t.create() : null), f = new _(R.from(t.create(null, R.from(l.type.create(null, c)))), u ? 3 : 1, 0), h = o.start, d = o.end;
      n(e.tr.step(new Ge(h - (u ? 3 : 1), d, h, d, f, 1, !0)).scrollIntoView());
    }
    return !0;
  };
}
function eM(t) {
  const e = /* @__PURE__ */ new Map();
  if (!t || !t.type)
    throw new Error("mdast-util-definitions expected node");
  return Pi(t, "definition", function(r) {
    const i = od(r.identifier);
    i && !e.get(i) && e.set(i, r);
  }), n;
  function n(r) {
    const i = od(r);
    return e.get(i);
  }
}
function od(t) {
  return String(t || "").toUpperCase();
}
function tM() {
  return function(t) {
    const e = eM(t);
    Pi(t, function(n, r, i) {
      if (n.type === "definition" && i !== void 0 && typeof r == "number")
        return i.children.splice(r, 1), [za, r];
      if (n.type === "imageReference" || n.type === "linkReference") {
        const o = e(n.identifier);
        if (o && i && typeof r == "number")
          return i.children[r] = n.type === "imageReference" ? { type: "image", url: o.url, title: o.title, alt: n.alt } : {
            type: "link",
            url: o.url,
            title: o.title,
            children: n.children
          }, [za, r];
      }
    });
  };
}
function pg(t, e) {
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
function O(t, e) {
  return Object.assign(t, { meta: {
    package: "@milkdown/preset-commonmark",
    ...e
  } }), t;
}
var Qu = ts("emphasis");
O(Qu, {
  displayName: "Attr<emphasis>",
  group: "Emphasis"
});
var $i = Fi("emphasis", (t) => ({
  attrs: { marker: {
    default: t.get(co).emphasis || "*",
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
  toDOM: (e) => ["em", t.get(Qu.key)(e)],
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
O($i.mark, {
  displayName: "MarkSchema<emphasis>",
  group: "Emphasis"
});
O($i.ctx, {
  displayName: "MarkSchemaCtx<emphasis>",
  group: "Emphasis"
});
var Xu = Z("ToggleEmphasis", (t) => () => Yo($i.type(t)));
O(Xu, {
  displayName: "Command<toggleEmphasisCommand>",
  group: "Emphasis"
});
var mg = mt((t) => Qo(/(?:^|[^*])\*([^*]+)\*$/, $i.type(t), {
  getAttr: () => ({ marker: "*" }),
  updateCaptured: ({ fullMatch: e, start: n }) => e.startsWith("*") ? {} : {
    fullMatch: e.slice(1),
    start: n + 1
  }
}));
O(mg, {
  displayName: "InputRule<emphasis>|Star",
  group: "Emphasis"
});
var gg = mt((t) => Qo(/\b_(?![_\s])(.*?[^_\s])_\b/, $i.type(t), {
  getAttr: () => ({ marker: "_" }),
  updateCaptured: ({ fullMatch: e, start: n }) => e.startsWith("_") ? {} : {
    fullMatch: e.slice(1),
    start: n + 1
  }
}));
O(gg, {
  displayName: "InputRule<emphasis>|Underscore",
  group: "Emphasis"
});
var Zu = gt("emphasisKeymap", { ToggleEmphasis: {
  shortcuts: "Mod-i",
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(Xu.key);
  }
} });
O(Zu.ctx, {
  displayName: "KeymapCtx<emphasis>",
  group: "Emphasis"
});
O(Zu.shortcuts, {
  displayName: "Keymap<emphasis>",
  group: "Emphasis"
});
var ec = ts("strong");
O(ec, {
  displayName: "Attr<strong>",
  group: "Strong"
});
var ns = Fi("strong", (t) => ({
  attrs: { marker: {
    default: t.get(co).strong || "*",
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
  toDOM: (e) => ["strong", t.get(ec.key)(e)],
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
O(ns.mark, {
  displayName: "MarkSchema<strong>",
  group: "Strong"
});
O(ns.ctx, {
  displayName: "MarkSchemaCtx<strong>",
  group: "Strong"
});
var tc = Z("ToggleStrong", (t) => () => Yo(ns.type(t)));
O(tc, {
  displayName: "Command<toggleStrongCommand>",
  group: "Strong"
});
var yg = mt((t) => Qo(new RegExp("(?:^|[^\\\\w:/])(?:\\\\*\\\\*|__)([^*_]+?)(?:\\\\*\\\\*|__)(?![\\\\w/])$"), ns.type(t), { updateCaptured: (e) => e.fullMatch.startsWith("**") || e.fullMatch.startsWith("__") ? e : { start: e.start + 1, fullMatch: e.fullMatch.slice(1) }, getAttr: (e) => ({ marker: (e[0].startsWith("**") || e[0].startsWith("__") ? e[0] : e[0].slice(1)).startsWith("*") ? "*" : "_" }) }));
O(yg, {
  displayName: "InputRule<strong>",
  group: "Strong"
});
var nc = gt("strongKeymap", { ToggleBold: {
  shortcuts: ["Mod-b"],
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(tc.key);
  }
} });
O(nc.ctx, {
  displayName: "KeymapCtx<strong>",
  group: "Strong"
});
O(nc.shortcuts, {
  displayName: "Keymap<strong>",
  group: "Strong"
});
var rc = ts("inlineCode");
O(rc, {
  displayName: "Attr<inlineCode>",
  group: "InlineCode"
});
var Wn = Fi("inlineCode", (t) => ({
  priority: 100,
  code: !0,
  parseDOM: [{ tag: "code" }],
  toDOM: (e) => ["code", t.get(rc.key)(e)],
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
O(Wn.mark, {
  displayName: "MarkSchema<inlineCode>",
  group: "InlineCode"
});
O(Wn.ctx, {
  displayName: "MarkSchemaCtx<inlineCode>",
  group: "InlineCode"
});
var ic = Z("ToggleInlineCode", (t) => () => (e, n) => {
  const { selection: r, tr: i } = e;
  if (r.empty) return !1;
  const { from: o, to: s } = r;
  return e.doc.rangeHasMark(o, s, Wn.type(t)) ? (n == null || n(i.removeMark(o, s, Wn.type(t))), !0) : (Object.keys(e.schema.marks).filter((l) => l !== Wn.type.name).map((l) => e.schema.marks[l]).forEach((l) => {
    i.removeMark(o, s, l);
  }), n == null || n(i.addMark(o, s, Wn.type(t).create())), !0);
});
O(ic, {
  displayName: "Command<toggleInlineCodeCommand>",
  group: "InlineCode"
});
var kg = mt((t) => Qo(/(?:`)([^`]+)(?:`)$/, Wn.type(t)));
O(kg, {
  displayName: "InputRule<inlineCodeInputRule>",
  group: "InlineCode"
});
var oc = gt("inlineCodeKeymap", { ToggleInlineCode: {
  shortcuts: "Mod-e",
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(ic.key);
  }
} });
O(oc.ctx, {
  displayName: "KeymapCtx<inlineCode>",
  group: "InlineCode"
});
O(oc.shortcuts, {
  displayName: "Keymap<inlineCode>",
  group: "InlineCode"
});
var sc = ts("link");
O(sc, {
  displayName: "Attr<link>",
  group: "Link"
});
var ii = Fi("link", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw Xt(e);
      return {
        href: e.getAttribute("href"),
        title: e.getAttribute("title")
      };
    }
  }],
  toDOM: (e) => ["a", {
    ...t.get(sc.key)(e),
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
O(ii.mark, {
  displayName: "MarkSchema<link>",
  group: "Link"
});
var bg = Z("ToggleLink", (t) => (e = {}) => Yo(ii.type(t), e));
O(bg, {
  displayName: "Command<toggleLinkCommand>",
  group: "Link"
});
var wg = Z("UpdateLink", (t) => (e = {}) => (n, r) => {
  if (!r) return !1;
  let i, o = -1;
  const { selection: s } = n, { from: l, to: a } = s;
  if (n.doc.nodesBetween(l, l === a ? a + 1 : a, (p, g) => {
    if (ii.type(t).isInSet(p.marks))
      return i = p, o = g, !1;
  }), !i) return !1;
  const u = i.marks.find(({ type: p }) => p === ii.type(t));
  if (!u) return !1;
  const c = o, f = o + i.nodeSize, { tr: h } = n, d = ii.type(t).create({
    ...u.attrs,
    ...e
  });
  return d ? (r(h.removeMark(c, f, u).addMark(c, f, d).setSelection(new Y(h.selection.$anchor)).scrollIntoView()), !0) : !1;
});
O(wg, {
  displayName: "Command<updateLinkCommand>",
  group: "Link"
});
var xg = Yu("doc", () => ({
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
O(xg, {
  displayName: "NodeSchema<doc>",
  group: "Doc"
});
function nM(t) {
  return Tu(t, (e) => {
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
var bl = tn("remark-preserve-empty-line", () => () => nM);
O(bl.plugin, {
  displayName: "Remark<remarkPreserveEmptyLine>",
  group: "Remark"
});
O(bl.options, {
  displayName: "RemarkConfig<remarkPreserveEmptyLine>",
  group: "Remark"
});
var lc = Ht("paragraph");
O(lc, {
  displayName: "Attr<paragraph>",
  group: "Paragraph"
});
var Qt = Ne("paragraph", (t) => ({
  content: "inline*",
  group: "block",
  parseDOM: [{ tag: "p" }],
  toDOM: (e) => [
    "p",
    t.get(lc.key)(e),
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
      const r = (i = t.get(Ae).state) == null ? void 0 : i.doc.lastChild;
      e.openNode("paragraph"), (!n.content || n.content.size === 0) && n !== r && rM(t) ? e.addNode("html", void 0, "<br />") : pg(e, n), e.closeNode();
    }
  }
}));
function rM(t) {
  let e = !1;
  try {
    t.get(bl.id), e = !0;
  } catch {
    e = !1;
  }
  return e;
}
O(Qt.node, {
  displayName: "NodeSchema<paragraph>",
  group: "Paragraph"
});
O(Qt.ctx, {
  displayName: "NodeSchemaCtx<paragraph>",
  group: "Paragraph"
});
var ac = Z("TurnIntoText", (t) => () => kn(Qt.type(t)));
O(ac, {
  displayName: "Command<turnIntoTextCommand>",
  group: "Paragraph"
});
var uc = gt("paragraphKeymap", { TurnIntoText: {
  shortcuts: "Mod-Alt-0",
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(ac.key);
  }
} });
O(uc.ctx, {
  displayName: "KeymapCtx<paragraph>",
  group: "Paragraph"
});
O(uc.shortcuts, {
  displayName: "Keymap<paragraph>",
  group: "Paragraph"
});
var iM = Array(6).fill(0).map((t, e) => e + 1);
function oM(t) {
  return t.textContent.toLowerCase().trim().replace(/\s+/g, "-");
}
var wl = vn(oM, "headingIdGenerator");
O(wl, {
  displayName: "Ctx<HeadingIdGenerator>",
  group: "Heading"
});
var cc = Ht("heading");
O(cc, {
  displayName: "Attr<heading>",
  group: "Heading"
});
var $r = Ne("heading", (t) => {
  const e = t.get(wl.key);
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
    parseDOM: iM.map((n) => ({
      tag: `h${n}`,
      getAttrs: (r) => {
        if (!(r instanceof HTMLElement)) throw Xt(r);
        return {
          level: n,
          id: r.id
        };
      }
    })),
    toDOM: (n) => [
      `h${n.attrs.level}`,
      {
        ...t.get(cc.key)(n),
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
        n.openNode("heading", void 0, { depth: r.attrs.level }), pg(n, r), n.closeNode();
      }
    }
  };
});
O($r.node, {
  displayName: "NodeSchema<heading>",
  group: "Heading"
});
O($r.ctx, {
  displayName: "NodeSchemaCtx<heading>",
  group: "Heading"
});
var Cg = mt((t) => hm(/^(#+)\s$/, $r.type(t), (e) => {
  var o, s;
  const n = (e[1] || "").length || 0, { $from: r } = t.get(Ae).state.selection, i = r.node();
  if (i.type.name === "heading") {
    let l = Number(i.attrs.level) + Number(n);
    return l > 6 && (l = 6), { level: l };
  }
  return { level: n };
}));
O(Cg, {
  displayName: "InputRule<wrapInHeadingInputRule>",
  group: "Heading"
});
var Ln = Z("WrapInHeading", (t) => (e) => (e ?? (e = 1), e < 1 ? kn(Qt.type(t)) : kn($r.type(t), { level: e })));
O(Ln, {
  displayName: "Command<wrapInHeadingCommand>",
  group: "Heading"
});
var fc = Z("DowngradeHeading", (t) => () => (e, n, r) => {
  const { $from: i } = e.selection, o = i.node();
  if (o.type !== $r.type(t) || !e.selection.empty || i.parentOffset !== 0) return !1;
  const s = o.attrs.level - 1;
  return s ? (n == null || n(e.tr.setNodeMarkup(e.selection.$from.before(), void 0, {
    ...o.attrs,
    level: s
  })), !0) : kn(Qt.type(t))(e, n, r);
});
O(fc, {
  displayName: "Command<downgradeHeadingCommand>",
  group: "Heading"
});
var hc = gt("headingKeymap", {
  TurnIntoH1: {
    shortcuts: "Mod-Alt-1",
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(Ln.key, 1);
    }
  },
  TurnIntoH2: {
    shortcuts: "Mod-Alt-2",
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(Ln.key, 2);
    }
  },
  TurnIntoH3: {
    shortcuts: "Mod-Alt-3",
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(Ln.key, 3);
    }
  },
  TurnIntoH4: {
    shortcuts: "Mod-Alt-4",
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(Ln.key, 4);
    }
  },
  TurnIntoH5: {
    shortcuts: "Mod-Alt-5",
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(Ln.key, 5);
    }
  },
  TurnIntoH6: {
    shortcuts: "Mod-Alt-6",
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(Ln.key, 6);
    }
  },
  DowngradeHeading: {
    shortcuts: ["Delete", "Backspace"],
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(fc.key);
    }
  }
});
O(hc.ctx, {
  displayName: "KeymapCtx<heading>",
  group: "Heading"
});
O(hc.shortcuts, {
  displayName: "Keymap<heading>",
  group: "Heading"
});
var dc = Ht("blockquote");
O(dc, {
  displayName: "Attr<blockquote>",
  group: "Blockquote"
});
var rs = Ne("blockquote", (t) => ({
  content: "block+",
  group: "block",
  defining: !0,
  parseDOM: [{ tag: "blockquote" }],
  toDOM: (e) => [
    "blockquote",
    t.get(dc.key)(e),
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
O(rs.node, {
  displayName: "NodeSchema<blockquote>",
  group: "Blockquote"
});
O(rs.ctx, {
  displayName: "NodeSchemaCtx<blockquote>",
  group: "Blockquote"
});
var Sg = mt((t) => $u(/^\s*>\s$/, rs.type(t)));
O(Sg, {
  displayName: "InputRule<wrapInBlockquoteInputRule>",
  group: "Blockquote"
});
var pc = Z("WrapInBlockquote", (t) => () => Fu(rs.type(t)));
O(pc, {
  displayName: "Command<wrapInBlockquoteCommand>",
  group: "Blockquote"
});
var mc = gt("blockquoteKeymap", { WrapInBlockquote: {
  shortcuts: "Mod-Shift-b",
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(pc.key);
  }
} });
O(mc.ctx, {
  displayName: "KeymapCtx<blockquote>",
  group: "Blockquote"
});
O(mc.shortcuts, {
  displayName: "Keymap<blockquote>",
  group: "Blockquote"
});
var gc = Ht("codeBlock", () => ({
  pre: {},
  code: {}
}));
O(gc, {
  displayName: "Attr<codeBlock>",
  group: "CodeBlock"
});
var is = Ne("code_block", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw Xt(e);
      return { language: e.dataset.language };
    }
  }],
  toDOM: (e) => {
    const n = t.get(gc.key)(e), r = e.attrs.language, i = r && r.length > 0 ? { "data-language": r } : void 0;
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
O(is.node, {
  displayName: "NodeSchema<codeBlock>",
  group: "CodeBlock"
});
O(is.ctx, {
  displayName: "NodeSchemaCtx<codeBlock>",
  group: "CodeBlock"
});
var Mg = mt((t) => hm(/^```([a-z]*)?[\s\n]$/, is.type(t), (e) => {
  var n;
  return { language: e[1] ?? "" };
}));
O(Mg, {
  displayName: "InputRule<createCodeBlockInputRule>",
  group: "CodeBlock"
});
var yc = Z("CreateCodeBlock", (t) => (e = "") => kn(is.type(t), { language: e }));
O(yc, {
  displayName: "Command<createCodeBlockCommand>",
  group: "CodeBlock"
});
var sM = Z("UpdateCodeBlockLanguage", () => ({ pos: t, language: e } = {
  pos: -1,
  language: ""
}) => (n, r) => t >= 0 ? (r == null || r(n.tr.setNodeAttribute(t, "language", e)), !0) : !1);
O(sM, {
  displayName: "Command<updateCodeBlockLanguageCommand>",
  group: "CodeBlock"
});
var kc = gt("codeBlockKeymap", { CreateCodeBlock: {
  shortcuts: "Mod-Alt-c",
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(yc.key);
  }
} });
O(kc.ctx, {
  displayName: "KeymapCtx<codeBlock>",
  group: "CodeBlock"
});
O(kc.shortcuts, {
  displayName: "Keymap<codeBlock>",
  group: "CodeBlock"
});
var bc = Ht("image");
O(bc, {
  displayName: "Attr<image>",
  group: "Image"
});
var _i = Ne("image", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw Xt(e);
      return {
        src: e.getAttribute("src") || "",
        alt: e.getAttribute("alt") || "",
        title: e.getAttribute("title") || e.getAttribute("alt") || ""
      };
    }
  }],
  toDOM: (e) => ["img", {
    ...t.get(bc.key)(e),
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
O(_i.node, {
  displayName: "NodeSchema<image>",
  group: "Image"
});
O(_i.ctx, {
  displayName: "NodeSchemaCtx<image>",
  group: "Image"
});
var vg = Z("InsertImage", (t) => (e = {}) => (n, r) => {
  if (!r) return !0;
  const { src: i = "", alt: o = "", title: s = "" } = e, l = _i.type(t).create({
    src: i,
    alt: o,
    title: s
  });
  return l && r(n.tr.replaceSelectionWith(l).scrollIntoView()), !0;
});
O(vg, {
  displayName: "Command<insertImageCommand>",
  group: "Image"
});
var Tg = Z("UpdateImage", (t) => (e = {}) => (n, r) => {
  const i = Vx(n.selection, _i.type(t));
  if (!i) return !1;
  const { node: o, pos: s } = i, l = { ...o.attrs }, { src: a, alt: u, title: c } = e;
  return a !== void 0 && (l.src = a), u !== void 0 && (l.alt = u), c !== void 0 && (l.title = c), r == null || r(n.tr.setNodeMarkup(s, void 0, l).scrollIntoView()), !0;
});
O(Tg, {
  displayName: "Command<updateImageCommand>",
  group: "Image"
});
var lM = mt((t) => new Mt(/!\[(.*?)]\((.*?)\s*(?="|\))"?([^"]+)?"?\)/, (e, n, r, i) => {
  const [o, s, l = "", a] = n;
  return o ? e.tr.replaceWith(r, i, _i.type(t).create({
    src: l,
    alt: s,
    title: a
  })) : null;
}));
O(lM, {
  displayName: "InputRule<insertImageInputRule>",
  group: "Image"
});
var Zs = Ht("hardbreak", (t) => ({
  "data-type": "hardbreak",
  "data-is-inline": t.attrs.isInline
}));
O(Zs, {
  displayName: "Attr<hardbreak>",
  group: "Hardbreak"
});
var Tr = Ne("hardbreak", (t) => ({
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
    t.get(Zs.key)(e),
    " "
  ] : ["br", t.get(Zs.key)(e)],
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
O(Tr.node, {
  displayName: "NodeSchema<hardbreak>",
  group: "Hardbreak"
});
O(Tr.ctx, {
  displayName: "NodeSchemaCtx<hardbreak>",
  group: "Hardbreak"
});
var wc = Z("InsertHardbreak", (t) => () => (e, n) => {
  var o;
  const { selection: r, tr: i } = e;
  if (!(r instanceof Y)) return !1;
  if (r.empty) {
    const s = r.$from.node();
    if (s.childCount > 0 && ((o = s.lastChild) == null ? void 0 : o.type.name) === "hardbreak")
      return n == null || n(i.replaceRangeWith(r.to - 1, r.to, e.schema.node("paragraph")).setSelection(te.near(i.doc.resolve(r.to))).scrollIntoView()), !0;
  }
  return n == null || n(i.setMeta("hardbreak", !0).replaceSelectionWith(Tr.type(t).create()).scrollIntoView()), !0;
});
O(wc, {
  displayName: "Command<insertHardbreakCommand>",
  group: "Hardbreak"
});
var xc = gt("hardbreakKeymap", { InsertHardbreak: {
  shortcuts: "Shift-Enter",
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(wc.key);
  }
} });
O(xc.ctx, {
  displayName: "KeymapCtx<hardbreak>",
  group: "Hardbreak"
});
O(xc.shortcuts, {
  displayName: "Keymap<hardbreak>",
  group: "Hardbreak"
});
var Cc = Ht("hr");
O(Cc, {
  displayName: "Attr<hr>",
  group: "Hr"
});
var ss = Ne("hr", (t) => ({
  group: "block",
  parseDOM: [{ tag: "hr" }],
  toDOM: (e) => ["hr", t.get(Cc.key)(e)],
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
O(ss.node, {
  displayName: "NodeSchema<hr>",
  group: "Hr"
});
O(ss.ctx, {
  displayName: "NodeSchemaCtx<hr>",
  group: "Hr"
});
var Ng = mt((t) => new Mt(/^(?:---|___\s|\*\*\*\s)$/, (e, n, r, i) => {
  const { tr: o } = e;
  return n[0] && o.replaceWith(r - 1, i, ss.type(t).create()), o;
}));
O(Ng, {
  displayName: "InputRule<insertHrInputRule>",
  group: "Hr"
});
var Ig = Z("InsertHr", (t) => () => (e, n) => {
  if (!n) return !0;
  const r = Qt.node.type(t).create(), { tr: i, selection: o } = e, { from: s } = o, l = ss.type(t).create();
  if (!l) return !0;
  const a = i.replaceSelectionWith(l).insert(s, r), u = te.findFrom(a.doc.resolve(s), 1, !0);
  return u && n(a.setSelection(u).scrollIntoView()), !0;
});
O(Ig, {
  displayName: "Command<insertHrCommand>",
  group: "Hr"
});
var Sc = Ht("bulletList");
O(Sc, {
  displayName: "Attr<bulletList>",
  group: "BulletList"
});
var Vi = Ne("bullet_list", (t) => ({
  content: "listItem+",
  group: "block",
  attrs: { spread: {
    default: !1,
    validate: "boolean"
  } },
  parseDOM: [{
    tag: "ul",
    getAttrs: (e) => {
      if (!(e instanceof HTMLElement)) throw Xt(e);
      return { spread: e.dataset.spread === "true" };
    }
  }],
  toDOM: (e) => [
    "ul",
    {
      ...t.get(Sc.key)(e),
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
O(Vi.node, {
  displayName: "NodeSchema<bulletList>",
  group: "BulletList"
});
O(Vi.ctx, {
  displayName: "NodeSchemaCtx<bulletList>",
  group: "BulletList"
});
var Ag = mt((t) => $u(/^\s*([-+*])\s$/, Vi.type(t)));
O(Ag, {
  displayName: "InputRule<wrapInBulletListInputRule>",
  group: "BulletList"
});
var Mc = Z("WrapInBulletList", (t) => () => Fu(Vi.type(t)));
O(Mc, {
  displayName: "Command<wrapInBulletListCommand>",
  group: "BulletList"
});
var vc = gt("bulletListKeymap", { WrapInBulletList: {
  shortcuts: "Mod-Alt-8",
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(Mc.key);
  }
} });
O(vc.ctx, {
  displayName: "KeymapCtx<bulletListKeymap>",
  group: "BulletList"
});
O(vc.shortcuts, {
  displayName: "Keymap<bulletListKeymap>",
  group: "BulletList"
});
var Tc = Ht("orderedList");
O(Tc, {
  displayName: "Attr<orderedList>",
  group: "OrderedList"
});
var Hi = Ne("ordered_list", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw Xt(e);
      return {
        spread: e.dataset.spread,
        order: e.hasAttribute("start") ? Number(e.getAttribute("start")) : 1
      };
    }
  }],
  toDOM: (e) => [
    "ol",
    {
      ...t.get(Tc.key)(e),
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
O(Hi.node, {
  displayName: "NodeSchema<orderedList>",
  group: "OrderedList"
});
O(Hi.ctx, {
  displayName: "NodeSchemaCtx<orderedList>",
  group: "OrderedList"
});
var Eg = mt((t) => $u(/^\s*(\d+)\.\s$/, Hi.type(t), (e) => ({ order: Number(e[1]) }), (e, n) => n.childCount + n.attrs.order === Number(e[1])));
O(Eg, {
  displayName: "InputRule<wrapInOrderedListInputRule>",
  group: "OrderedList"
});
var Nc = Z("WrapInOrderedList", (t) => () => Fu(Hi.type(t)));
O(Nc, {
  displayName: "Command<wrapInOrderedListCommand>",
  group: "OrderedList"
});
var Ic = gt("orderedListKeymap", { WrapInOrderedList: {
  shortcuts: "Mod-Alt-7",
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(Nc.key);
  }
} });
O(Ic.ctx, {
  displayName: "KeymapCtx<orderedList>",
  group: "OrderedList"
});
O(Ic.shortcuts, {
  displayName: "Keymap<orderedList>",
  group: "OrderedList"
});
var Ac = Ht("listItem");
O(Ac, {
  displayName: "Attr<listItem>",
  group: "ListItem"
});
var Tn = Ne("list_item", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw Xt(e);
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
      ...t.get(Ac.key)(e),
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
O(Tn.node, {
  displayName: "NodeSchema<listItem>",
  group: "ListItem"
});
O(Tn.ctx, {
  displayName: "NodeSchemaCtx<listItem>",
  group: "ListItem"
});
var Ec = Z("SinkListItem", (t) => () => ZS(Tn.type(t)));
O(Ec, {
  displayName: "Command<sinkListItemCommand>",
  group: "ListItem"
});
var Oc = Z("LiftListItem", (t) => () => dg(Tn.type(t)));
O(Oc, {
  displayName: "Command<liftListItemCommand>",
  group: "ListItem"
});
var Dc = Z("SplitListItem", (t) => () => YS(Tn.type(t)));
O(Dc, {
  displayName: "Command<splitListItemCommand>",
  group: "ListItem"
});
function aM(t) {
  return (e, n, r) => {
    const { selection: i } = e;
    if (!(i instanceof Y)) return !1;
    const { empty: o, $from: s } = i;
    return !o || s.parentOffset !== 0 || s.node(-1).type !== Tn.type(t) ? !1 : sm(e, n, r);
  };
}
var Rc = Z("LiftFirstListItem", (t) => () => aM(t));
O(Rc, {
  displayName: "Command<liftFirstListItemCommand>",
  group: "ListItem"
});
var Lc = gt("listItemKeymap", {
  NextListItem: {
    shortcuts: "Enter",
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(Dc.key);
    }
  },
  SinkListItem: {
    shortcuts: ["Tab", "Mod-]"],
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(Ec.key);
    }
  },
  LiftListItem: {
    shortcuts: ["Shift-Tab", "Mod-["],
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(Oc.key);
    }
  },
  LiftFirstListItem: {
    shortcuts: ["Backspace", "Delete"],
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(Rc.key);
    }
  }
});
O(Lc.ctx, {
  displayName: "KeymapCtx<listItem>",
  group: "ListItem"
});
O(Lc.shortcuts, {
  displayName: "Keymap<listItem>",
  group: "ListItem"
});
var Og = Yu("text", () => ({
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
O(Og, {
  displayName: "NodeSchema<text>",
  group: "Text"
});
var Pc = Ht("html");
O(Pc, {
  displayName: "Attr<html>",
  group: "Html"
});
var zc = Ne("html", (t) => ({
  atom: !0,
  group: "inline",
  inline: !0,
  attrs: { value: {
    default: "",
    validate: "string"
  } },
  toDOM: (e) => {
    const n = document.createElement("span"), r = {
      ...t.get(Pc.key)(e),
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
O(zc.node, {
  displayName: "NodeSchema<html>",
  group: "Html"
});
O(zc.ctx, {
  displayName: "NodeSchemaCtx<html>",
  group: "Html"
});
var uM = [
  xg,
  lc,
  Qt,
  wl,
  cc,
  $r,
  Zs,
  Tr,
  dc,
  rs,
  gc,
  is,
  Cc,
  ss,
  bc,
  _i,
  Sc,
  Vi,
  Tc,
  Hi,
  Ac,
  Tn,
  Qu,
  $i,
  ec,
  ns,
  rc,
  Wn,
  sc,
  ii,
  Pc,
  zc,
  Og
].flat(), cM = [
  Sg,
  Ag,
  Eg,
  Mg,
  Ng,
  Cg
].flat(), fM = [], hM = Z("IsMarkSelected", () => (t) => (e) => {
  if (!t) return !1;
  const { doc: n, selection: r } = e;
  return n.rangeHasMark(r.from, r.to, t);
}), dM = Z("IsNoteSelected", () => (t) => (e) => t ? Hx(e, t).hasNode : !1), pM = Z("ClearTextInCurrentBlock", () => () => (t, e) => {
  let n = t.tr;
  const { $from: r, $to: i } = n.selection, { pos: o } = r, { pos: s } = i, l = o - r.node().content.size;
  return l < 0 ? !1 : (n = n.deleteRange(l, s), e == null || e(n), !0);
}), mM = Z("SetBlockType", () => (t) => (e, n) => {
  const { nodeType: r, attrs: i = null } = t ?? {};
  if (!r) return !1;
  const o = e.tr, { from: s, to: l } = o.selection;
  try {
    o.setBlockType(s, l, r, i);
  } catch {
    return !1;
  }
  return n == null || n(o), !0;
}), gM = Z("WrapInBlockType", () => (t) => (e, n) => {
  const { nodeType: r, attrs: i = null } = t ?? {};
  if (!r) return !1;
  let o = e.tr;
  try {
    const { $from: s, $to: l } = o.selection, a = s.blockRange(l), u = a && Ru(a, r, i);
    if (!u) return !1;
    o = o.wrap(a, u);
  } catch {
    return !1;
  }
  return n == null || n(o), !0;
}), yM = Z("AddBlockType", () => (t) => (e, n) => {
  const { nodeType: r, attrs: i = null } = t ?? {};
  if (!r) return !1;
  const o = e.tr;
  try {
    const s = r instanceof wn ? r : r.createAndFill(i);
    if (!s) return !1;
    o.replaceSelectionWith(s);
  } catch {
    return !1;
  }
  return n == null || n(o), !0;
}), kM = Z("SelectTextNearPos", () => (t) => (e, n) => {
  const { pos: r } = t ?? {};
  if (r == null) return !1;
  const i = (s, l, a) => Math.min(Math.max(s, l), a), o = e.tr;
  try {
    const s = e.doc.resolve(i(r, 0, e.doc.content.size));
    o.setSelection(Y.near(s));
  } catch {
    return !1;
  }
  return n == null || n(o.scrollIntoView()), !0;
}), bM = [
  ac,
  pc,
  Ln,
  fc,
  yc,
  wc,
  Ig,
  vg,
  Tg,
  Nc,
  Mc,
  Ec,
  Dc,
  Oc,
  Rc,
  Xu,
  ic,
  tc,
  bg,
  wg,
  hM,
  dM,
  pM,
  mM,
  gM,
  yM,
  kM
], wM = [
  mc,
  kc,
  xc,
  hc,
  Lc,
  Ic,
  vc,
  uc,
  Zu,
  oc,
  nc
].flat(), Bc = tn("remarkAddOrderInList", () => () => (t) => {
  Pi(t, "list", (e) => {
    if (e.ordered) {
      const n = e.start ?? 1;
      e.children.forEach((r, i) => {
        r.label = i + n;
      });
    }
  });
});
O(Bc.plugin, {
  displayName: "Remark<remarkAddOrderInListPlugin>",
  group: "Remark"
});
O(Bc.options, {
  displayName: "RemarkConfig<remarkAddOrderInListPlugin>",
  group: "Remark"
});
var Fc = tn("remarkLineBreak", () => () => (t) => {
  const e = /[\t ]*(?:\r?\n|\r)/g;
  Pi(t, "text", (n, r, i) => {
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
O(Fc.plugin, {
  displayName: "Remark<remarkLineBreak>",
  group: "Remark"
});
O(Fc.options, {
  displayName: "RemarkConfig<remarkLineBreak>",
  group: "Remark"
});
var $c = tn("remarkInlineLink", () => tM);
O($c.plugin, {
  displayName: "Remark<remarkInlineLinkPlugin>",
  group: "Remark"
});
O($c.options, {
  displayName: "RemarkConfig<remarkInlineLinkPlugin>",
  group: "Remark"
});
var xM = (t) => !!t.children, CM = (t) => t.type === "html";
function SM(t, e) {
  return n(t, 0, null)[0];
  function n(r, i, o) {
    if (xM(r)) {
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
var MM = [
  "root",
  "blockquote",
  "listItem"
], _c = tn("remarkHTMLTransformer", () => () => (t) => {
  SM(t, (e, n, r) => CM(e) ? (r && MM.includes(r.type) && (e.children = [{ ...e }], delete e.value, e.type = "paragraph"), [e]) : [e]);
});
O(_c.plugin, {
  displayName: "Remark<remarkHtmlTransformer>",
  group: "Remark"
});
O(_c.options, {
  displayName: "RemarkConfig<remarkHtmlTransformer>",
  group: "Remark"
});
var Vc = tn("remarkMarker", () => () => (t, e) => {
  const n = (r) => e.value.charAt(r.position.start.offset);
  Pi(t, (r) => ["strong", "emphasis"].includes(r.type), (r) => {
    r.marker = n(r);
  });
});
O(Vc.plugin, {
  displayName: "Remark<remarkMarker>",
  group: "Remark"
});
O(Vc.options, {
  displayName: "RemarkConfig<remarkMarker>",
  group: "Remark"
});
var Dg = en(() => {
  let t = !1;
  const e = new Be({
    key: new Xe("MILKDOWN_INLINE_NODES_CURSOR"),
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
          const r = n.selection.$from.pos, i = document.createElement("span"), o = je.widget(r, i, { side: -1 }), s = document.createElement("span"), l = je.widget(r, s);
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
O(Dg, {
  displayName: "Prose<inlineNodesCursorPlugin>",
  group: "Prose"
});
var Rg = en((t) => new Be({
  key: new Xe("MILKDOWN_HARDBREAK_MARKS"),
  appendTransaction: (e, n, r) => {
    if (!e.length) return;
    const [i] = e;
    if (!i) return;
    const [o] = i.steps;
    if (i.getMeta("hardbreak")) {
      if (!(o instanceof Ee)) return;
      const { from: s } = o;
      return r.tr.setNodeMarkup(s, Tr.type(t), void 0, []);
    }
    if (o instanceof yn) {
      let s = r.tr;
      const { from: l, to: a } = o;
      return r.doc.nodesBetween(l, a, (u, c) => {
        u.type === Tr.type(t) && (s = s.setNodeMarkup(c, Tr.type(t), void 0, []));
      }), s;
    }
  }
}));
O(Rg, {
  displayName: "Prose<hardbreakClearMarkPlugin>",
  group: "Prose"
});
var Hc = vn(["table", "code_block"], "hardbreakFilterNodes");
O(Hc, {
  displayName: "Ctx<hardbreakFilterNodes>",
  group: "Prose"
});
var Lg = en((t) => {
  const e = t.get(Hc.key);
  return new Be({
    key: new Xe("MILKDOWN_HARDBREAK_FILTER"),
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
O(Lg, {
  displayName: "Prose<hardbreakFilterPlugin>",
  group: "Prose"
});
var Pg = en((t) => {
  const e = new Xe("MILKDOWN_HEADING_ID"), n = (r) => {
    if (r.composing) return;
    const i = t.get(wl.key), o = r.state.tr.setMeta("addToHistory", !1);
    let s = !1;
    const l = {};
    r.state.doc.descendants((a, u) => {
      if (a.type === $r.type(t)) {
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
O(Pg, {
  displayName: "Prose<syncHeadingIdPlugin>",
  group: "Prose"
});
var zg = en((t) => {
  const e = (n, r, i) => {
    if (!i.selection || n.some((f) => f.getMeta("addToHistory") === !1 || !f.isGeneric)) return null;
    const o = Hi.type(t), s = Vi.type(t), l = Tn.type(t), a = (f, h, d = 1) => {
      let p = !1;
      const g = `${h + d}.`;
      return f.label !== g && (f.label = g, p = !0), p;
    };
    let u = i.tr, c = !1;
    return i.doc.descendants((f, h, d, p) => {
      if (f.type === s) {
        const g = f.maybeChild(0);
        (g == null ? void 0 : g.type) === l && g.attrs.listType === "ordered" && (c = !0, u.setNodeMarkup(h, o, { spread: "true" }), f.descendants((x, w, L, A) => {
          if (x.type === l) {
            const j = { ...x.attrs };
            a(j, A) && (u = u.setNodeMarkup(w, void 0, j));
          }
          return !1;
        }));
      } else if (f.type === l && (d == null ? void 0 : d.type) === o) {
        const g = { ...f.attrs };
        let x = !1;
        g.listType !== "ordered" && (g.listType = "ordered", x = !0), d != null && d.maybeChild(0) && (x = a(g, p, (d == null ? void 0 : d.attrs.order) ?? 1)), x && (u = u.setNodeMarkup(h, void 0, g), c = !0);
      }
    }), c ? u.setMeta("addToHistory", !1) : null;
  };
  return new Be({
    key: new Xe("MILKDOWN_KEEP_LIST_ORDER"),
    appendTransaction: e
  });
});
O(zg, {
  displayName: "Prose<syncListOrderPlugin>",
  group: "Prose"
});
var vM = [
  Rg,
  Hc,
  Lg,
  Dg,
  Bc,
  $c,
  Fc,
  _c,
  Vc,
  bl,
  Pg,
  zg
].flat(), TM = [
  uM,
  cM,
  fM,
  bM,
  wM,
  vM
].flat();
let cu, fu;
if (typeof WeakMap < "u") {
  let t = /* @__PURE__ */ new WeakMap();
  cu = (e) => t.get(e), fu = (e, n) => (t.set(e, n), n);
} else {
  const t = [];
  let n = 0;
  cu = (r) => {
    for (let i = 0; i < t.length; i += 2) if (t[i] == r) return t[i + 1];
  }, fu = (r, i) => (n == 10 && (n = 0), t[n++] = r, t[n++] = i);
}
var ye = class {
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
    return cu(t) || fu(t, NM(t));
  }
};
function NM(t) {
  if (t.type.spec.tableRole != "table") throw new RangeError("Not a table node: " + t.type.name);
  const e = IM(t), n = t.childCount, r = [];
  let i = 0, o = null;
  const s = [];
  for (let u = 0, c = e * n; u < c; u++) r[u] = 0;
  for (let u = 0, c = 0; u < n; u++) {
    const f = t.child(u);
    c++;
    for (let p = 0; ; p++) {
      for (; i < r.length && r[i] != 0; ) i++;
      if (p == f.childCount) break;
      const g = f.child(p), { colspan: x, rowspan: w, colwidth: L } = g.attrs;
      for (let A = 0; A < w; A++) {
        if (A + u >= n) {
          (o || (o = [])).push({
            type: "overlong_rowspan",
            pos: c,
            n: w - A
          });
          break;
        }
        const j = i + A * e;
        for (let H = 0; H < x; H++) {
          r[j + H] == 0 ? r[j + H] = c : (o || (o = [])).push({
            type: "collision",
            row: u,
            pos: c,
            n: x - H
          });
          const M = L && L[H];
          if (M) {
            const P = (j + H) % e * 2, F = s[P];
            F == null || F != M && s[P + 1] == 1 ? (s[P] = M, s[P + 1] = 1) : F == M && s[P + 1]++;
          }
        }
      }
      i += x, c += g.nodeSize;
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
  const l = new ye(e, n, r, o);
  let a = !1;
  for (let u = 0; !a && u < s.length; u += 2) s[u] != null && s[u + 1] < n && (a = !0);
  return a && AM(l, s, t), l;
}
function IM(t) {
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
function AM(t, e, n) {
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
      c != null && (!a.colwidth || a.colwidth[u] != c) && ((l || (l = EM(a)))[u] = c);
    }
    l && t.problems.unshift({
      type: "colwidth mismatch",
      pos: o,
      colwidth: l
    });
  }
}
function EM(t) {
  if (t.colwidth) return t.colwidth.slice();
  const e = [];
  for (let n = 0; n < t.colspan; n++) e.push(0);
  return e;
}
function sd(t, e) {
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
function ld(t, e) {
  const n = {};
  t.attrs.colspan != 1 && (n.colspan = t.attrs.colspan), t.attrs.rowspan != 1 && (n.rowspan = t.attrs.rowspan), t.attrs.colwidth && (n["data-colwidth"] = t.attrs.colwidth.join(","));
  for (const r in e) {
    const i = e[r].setDOMAttr;
    i && i(t.attrs[r], n);
  }
  return n;
}
function OM(t) {
  if (t !== null) {
    if (!Array.isArray(t)) throw new TypeError("colwidth must be null or an array");
    for (const e of t) if (typeof e != "number") throw new TypeError("colwidth must be null or an array of numbers");
  }
}
function DM(t) {
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
      validate: OM
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
        getAttrs: (r) => sd(r, e)
      }],
      toDOM(r) {
        return [
          "td",
          ld(r, e),
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
        getAttrs: (r) => sd(r, e)
      }],
      toDOM(r) {
        return [
          "th",
          ld(r, e),
          0
        ];
      }
    }
  };
}
function ot(t) {
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
const Bn = new Xe("selectingCells");
function Ei(t) {
  for (let e = t.depth - 1; e > 0; e--) if (t.node(e).type.spec.tableRole == "row") return t.node(0).resolve(t.before(e + 1));
  return null;
}
function Pe(t) {
  const e = t.selection.$head;
  for (let n = e.depth; n > 0; n--) if (e.node(n).type.spec.tableRole == "row") return !0;
  return !1;
}
function xl(t) {
  const e = t.selection;
  if ("$anchorCell" in e && e.$anchorCell) return e.$anchorCell.pos > e.$headCell.pos ? e.$anchorCell : e.$headCell;
  if ("node" in e && e.node && e.node.type.spec.tableRole == "cell") return e.$anchor;
  const n = Ei(e.$head) || RM(e.$head);
  if (n) return n;
  throw new RangeError(`No cell found around position ${e.head}`);
}
function RM(t) {
  for (let e = t.nodeAfter, n = t.pos; e; e = e.firstChild, n++) {
    const r = e.type.spec.tableRole;
    if (r == "cell" || r == "header_cell") return t.doc.resolve(n);
  }
  for (let e = t.nodeBefore, n = t.pos; e; e = e.lastChild, n--) {
    const r = e.type.spec.tableRole;
    if (r == "cell" || r == "header_cell") return t.doc.resolve(n - e.nodeSize);
  }
}
function hu(t) {
  return t.parent.type.spec.tableRole == "row" && !!t.nodeAfter;
}
function LM(t) {
  return t.node(0).resolve(t.pos + t.nodeAfter.nodeSize);
}
function jc(t, e) {
  return t.depth == e.depth && t.pos >= e.start(-1) && t.pos <= e.end(-1);
}
function Bg(t, e, n) {
  const r = t.node(-1), i = ye.get(r), o = t.start(-1), s = i.nextCell(t.pos - o, e, n);
  return s == null ? null : t.node(0).resolve(o + s);
}
function Br(t, e, n = 1) {
  const r = {
    ...t,
    colspan: t.colspan - n
  };
  return r.colwidth && (r.colwidth = r.colwidth.slice(), r.colwidth.splice(e, n), r.colwidth.some((i) => i > 0) || (r.colwidth = null)), r;
}
function PM(t, e, n = 1) {
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
function zM(t, e, n) {
  const r = ot(e.type.schema).header_cell;
  for (let i = 0; i < t.height; i++) if (e.nodeAt(t.map[n + i * t.width]).type != r) return !1;
  return !0;
}
var xe = class an extends te {
  constructor(e, n = e) {
    const r = e.node(-1), i = ye.get(r), o = e.start(-1), s = i.rectBetween(e.pos - o, n.pos - o), l = e.node(0), a = i.cellsInRect(s).filter((c) => c != n.pos - o);
    a.unshift(n.pos - o);
    const u = a.map((c) => {
      const f = r.nodeAt(c);
      if (!f) throw new RangeError(`No cell with offset ${c} found`);
      const h = o + c + 1;
      return new nm(l.resolve(h), l.resolve(h + f.content.size));
    });
    super(u[0].$from, u[0].$to, u), this.$anchorCell = e, this.$headCell = n;
  }
  map(e, n) {
    const r = e.resolve(n.map(this.$anchorCell.pos)), i = e.resolve(n.map(this.$headCell.pos));
    if (hu(r) && hu(i) && jc(r, i)) {
      const o = this.$anchorCell.node(-1) != r.node(-1);
      return o && this.isRowSelection() ? an.rowSelection(r, i) : o && this.isColSelection() ? an.colSelection(r, i) : new an(r, i);
    }
    return Y.between(r, i);
  }
  content() {
    const e = this.$anchorCell.node(-1), n = ye.get(e), r = this.$anchorCell.start(-1), i = n.rectBetween(this.$anchorCell.pos - r, this.$headCell.pos - r), o = {}, s = [];
    for (let a = i.top; a < i.bottom; a++) {
      const u = [];
      for (let c = a * n.width + i.left, f = i.left; f < i.right; f++, c++) {
        const h = n.map[c];
        if (o[h]) continue;
        o[h] = !0;
        const d = n.findCell(h);
        let p = e.nodeAt(h);
        if (!p) throw new RangeError(`No cell with offset ${h} found`);
        const g = i.left - d.left, x = d.right - i.right;
        if (g > 0 || x > 0) {
          let w = p.attrs;
          if (g > 0 && (w = Br(w, 0, g)), x > 0 && (w = Br(w, w.colspan - x, x)), d.left < i.left) {
            if (p = p.type.createAndFill(w), !p) throw new RangeError(`Could not create cell with attrs ${JSON.stringify(w)}`);
          } else p = p.type.create(w, p.content);
        }
        if (d.top < i.top || d.bottom > i.bottom) {
          const w = {
            ...p.attrs,
            rowspan: Math.min(d.bottom, i.bottom) - Math.max(d.top, i.top)
          };
          d.top < i.top ? p = p.type.createAndFill(w) : p = p.type.create(w, p.content);
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
    const o = te.findFrom(e.doc.resolve(e.mapping.slice(r).map(this.to)), -1);
    o && e.setSelection(o);
  }
  replaceWith(e, n) {
    this.replace(e, new _(R.from(n), 0, 0));
  }
  forEachCell(e) {
    const n = this.$anchorCell.node(-1), r = ye.get(n), i = this.$anchorCell.start(-1), o = r.cellsInRect(r.rectBetween(this.$anchorCell.pos - i, this.$headCell.pos - i));
    for (let s = 0; s < o.length; s++) e(n.nodeAt(o[s]), i + o[s]);
  }
  isColSelection() {
    const e = this.$anchorCell.index(-1), n = this.$headCell.index(-1);
    if (Math.min(e, n) > 0) return !1;
    const r = e + this.$anchorCell.nodeAfter.attrs.rowspan, i = n + this.$headCell.nodeAfter.attrs.rowspan;
    return Math.max(r, i) == this.$headCell.node(-1).childCount;
  }
  static colSelection(e, n = e) {
    const r = e.node(-1), i = ye.get(r), o = e.start(-1), s = i.findCell(e.pos - o), l = i.findCell(n.pos - o), a = e.node(0);
    return s.top <= l.top ? (s.top > 0 && (e = a.resolve(o + i.map[s.left])), l.bottom < i.height && (n = a.resolve(o + i.map[i.width * (i.height - 1) + l.right - 1]))) : (l.top > 0 && (n = a.resolve(o + i.map[l.left])), s.bottom < i.height && (e = a.resolve(o + i.map[i.width * (i.height - 1) + s.right - 1]))), new an(e, n);
  }
  isRowSelection() {
    const e = this.$anchorCell.node(-1), n = ye.get(e), r = this.$anchorCell.start(-1), i = n.colCount(this.$anchorCell.pos - r), o = n.colCount(this.$headCell.pos - r);
    if (Math.min(i, o) > 0) return !1;
    const s = i + this.$anchorCell.nodeAfter.attrs.colspan, l = o + this.$headCell.nodeAfter.attrs.colspan;
    return Math.max(s, l) == n.width;
  }
  eq(e) {
    return e instanceof an && e.$anchorCell.pos == this.$anchorCell.pos && e.$headCell.pos == this.$headCell.pos;
  }
  static rowSelection(e, n = e) {
    const r = e.node(-1), i = ye.get(r), o = e.start(-1), s = i.findCell(e.pos - o), l = i.findCell(n.pos - o), a = e.node(0);
    return s.left <= l.left ? (s.left > 0 && (e = a.resolve(o + i.map[s.top * i.width])), l.right < i.width && (n = a.resolve(o + i.map[i.width * (l.top + 1) - 1]))) : (l.left > 0 && (n = a.resolve(o + i.map[l.top * i.width])), s.right < i.width && (e = a.resolve(o + i.map[i.width * (s.top + 1) - 1]))), new an(e, n);
  }
  toJSON() {
    return {
      type: "cell",
      anchor: this.$anchorCell.pos,
      head: this.$headCell.pos
    };
  }
  static fromJSON(e, n) {
    return new an(e.resolve(n.anchor), e.resolve(n.head));
  }
  static create(e, n, r = n) {
    return new an(e.resolve(n), e.resolve(r));
  }
  getBookmark() {
    return new BM(this.$anchorCell.pos, this.$headCell.pos);
  }
};
xe.prototype.visible = !1;
te.jsonID("cell", xe);
var BM = class Fg {
  constructor(e, n) {
    this.anchor = e, this.head = n;
  }
  map(e) {
    return new Fg(e.map(this.anchor), e.map(this.head));
  }
  resolve(e) {
    const n = e.resolve(this.anchor), r = e.resolve(this.head);
    return n.parent.type.spec.tableRole == "row" && r.parent.type.spec.tableRole == "row" && n.index() < n.parent.childCount && r.index() < r.parent.childCount && jc(n, r) ? new xe(n, r) : te.near(r, 1);
  }
};
function FM(t) {
  if (!(t.selection instanceof xe)) return null;
  const e = [];
  return t.selection.forEachCell((n, r) => {
    e.push(je.node(r, r + n.nodeSize, { class: "selectedCell" }));
  }), Me.create(t.doc, e);
}
function $M({ $from: t, $to: e }) {
  if (t.pos == e.pos || t.pos < e.pos - 6) return !1;
  let n = t.pos, r = e.pos, i = t.depth;
  for (; i >= 0 && !(t.after(i + 1) < t.end(i)); i--, n++) ;
  for (let o = e.depth; o >= 0 && !(e.before(o + 1) > e.start(o)); o--, r--) ;
  return n == r && /row|table/.test(t.node(i).type.spec.tableRole);
}
function _M({ $from: t, $to: e }) {
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
function VM(t, e, n) {
  const r = (e || t).selection, i = (e || t).doc;
  let o, s;
  if (r instanceof X && (s = r.node.type.spec.tableRole)) {
    if (s == "cell" || s == "header_cell") o = xe.create(i, r.from);
    else if (s == "row") {
      const l = i.resolve(r.from + 1);
      o = xe.rowSelection(l, l);
    } else if (!n) {
      const l = ye.get(r.node), a = r.from + 1, u = a + l.map[l.width * l.height - 1];
      o = xe.create(i, a + 1, u);
    }
  } else r instanceof Y && $M(r) ? o = Y.create(i, r.from) : r instanceof Y && _M(r) && (o = Y.create(i, r.$from.start(), r.$from.end()));
  return o && (e || (e = t.tr)).setSelection(o), e;
}
const HM = new Xe("fix-tables");
function $g(t, e, n, r) {
  const i = t.childCount, o = e.childCount;
  e: for (let s = 0, l = 0; s < o; s++) {
    const a = e.child(s);
    for (let u = l, c = Math.min(i, s + 3); u < c; u++) if (t.child(u) == a) {
      l = u + 1, n += a.nodeSize;
      continue e;
    }
    r(a, n), l < i && t.child(l).sameMarkup(a) ? $g(t.child(l), a, n + 1, r) : a.nodesBetween(0, a.content.size, r, n + 1), n += a.nodeSize;
  }
}
function jM(t, e) {
  let n;
  const r = (i, o) => {
    i.type.spec.tableRole == "table" && (n = WM(t, i, o, n));
  };
  return e ? e.doc != t.doc && $g(e.doc, t.doc, 0, r) : t.doc.descendants(r), n;
}
function WM(t, e, n, r) {
  const i = ye.get(e);
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
      r.setNodeMarkup(r.mapping.map(n + 1 + u.pos), null, Br(f, f.colspan - u.n, u.n));
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
      for (let x = 0; x < h; x++) {
        const w = ot(t.schema)[d].createAndFill();
        w && p.push(w);
      }
      const g = (a == 0 || s == a - 1) && l == a ? u + 1 : f - 1;
      r.insert(r.mapping.map(g), p);
    }
    u = f;
  }
  return r.setMeta(HM, { fixTables: !0 });
}
function _g(t) {
  const e = ye.get(t), n = [], r = e.height, i = e.width;
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
function Vg(t, e) {
  const n = [], r = ye.get(t), i = r.height, o = r.width;
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
function Hg(t, e, n, r) {
  const i = e[0] > n[0] ? -1 : 1, o = t.splice(e[0], e.length), s = o.length % 2 === 0 ? 1 : 0;
  let l;
  return l = i === -1 ? n[0] : n[n.length - 1] - s, t.splice(l, 0, ...o), t;
}
function ls(t) {
  return qM((e) => e.type.spec.tableRole === "table", t);
}
function qM(t, e) {
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
function Yr(t, e) {
  const n = ls(e.$from);
  if (!n) return;
  const r = ye.get(n.node);
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
function Qr(t, e) {
  const n = ls(e.$from);
  if (!n) return;
  const r = ye.get(n.node);
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
function ad(t, e, n = e) {
  let r = e, i = n;
  for (let c = e; c >= 0; c--) {
    const f = Yr(c, t.selection);
    f && f.forEach((h) => {
      const d = h.node.attrs.colspan + c - 1;
      d >= r && (r = c), d > i && (i = d);
    });
  }
  for (let c = e; c <= i; c++) {
    const f = Yr(c, t.selection);
    f && f.forEach((h) => {
      const d = h.node.attrs.colspan + c - 1;
      h.node.attrs.colspan > 1 && d > i && (i = d);
    });
  }
  const o = [];
  for (let c = r; c <= i; c++) {
    const f = Yr(c, t.selection);
    f && f.length > 0 && o.push(c);
  }
  r = o[0], i = o[o.length - 1];
  const s = Yr(r, t.selection), l = Qr(0, t.selection);
  if (!s || !l) return;
  const a = t.doc.resolve(s[s.length - 1].pos);
  let u;
  for (let c = i; c >= r; c--) {
    const f = Yr(c, t.selection);
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
function ud(t, e, n = e) {
  let r = e, i = n;
  for (let c = e; c >= 0; c--) {
    const f = Qr(c, t.selection);
    f && f.forEach((h) => {
      const d = h.node.attrs.rowspan + c - 1;
      d >= r && (r = c), d > i && (i = d);
    });
  }
  for (let c = e; c <= i; c++) {
    const f = Qr(c, t.selection);
    f && f.forEach((h) => {
      const d = h.node.attrs.rowspan + c - 1;
      h.node.attrs.rowspan > 1 && d > i && (i = d);
    });
  }
  const o = [];
  for (let c = r; c <= i; c++) {
    const f = Qr(c, t.selection);
    f && f.length > 0 && o.push(c);
  }
  r = o[0], i = o[o.length - 1];
  const s = Qr(r, t.selection), l = Yr(0, t.selection);
  if (!s || !l) return;
  const a = t.doc.resolve(s[s.length - 1].pos);
  let u;
  for (let c = i; c >= r; c--) {
    const f = Qr(c, t.selection);
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
function cd(t) {
  return t[0].map((e, n) => t.map((r) => r[n]));
}
function KM(t) {
  var e, n;
  const { tr: r, originIndex: i, targetIndex: o, select: s, pos: l } = t, a = ls(r.doc.resolve(l));
  if (!a) return !1;
  const u = (e = ad(r, i)) === null || e === void 0 ? void 0 : e.indexes, c = (n = ad(r, o)) === null || n === void 0 ? void 0 : n.indexes;
  if (!u || !c || u.includes(o)) return !1;
  const f = UM(a.node, u, c);
  if (r.replaceWith(a.pos, a.pos + a.node.nodeSize, f), !s) return !0;
  const h = ye.get(f), d = a.start, p = o, g = h.positionAt(h.height - 1, p, f), x = r.doc.resolve(d + g), w = h.positionAt(0, p, f), L = r.doc.resolve(d + w);
  return r.setSelection(xe.colSelection(x, L)), !0;
}
function UM(t, e, n, r) {
  let i = cd(_g(t));
  return i = Hg(i, e, n), i = cd(i), Vg(t, i);
}
function JM(t) {
  var e, n;
  const { tr: r, originIndex: i, targetIndex: o, select: s, pos: l } = t, a = ls(r.doc.resolve(l));
  if (!a) return !1;
  const u = (e = ud(r, i)) === null || e === void 0 ? void 0 : e.indexes, c = (n = ud(r, o)) === null || n === void 0 ? void 0 : n.indexes;
  if (!u || !c || u.includes(o)) return !1;
  const f = GM(a.node, u, c);
  if (r.replaceWith(a.pos, a.pos + a.node.nodeSize, f), !s) return !0;
  const h = ye.get(f), d = a.start, p = o, g = h.positionAt(p, h.width - 1, f), x = r.doc.resolve(d + g), w = h.positionAt(p, 0, f), L = r.doc.resolve(d + w);
  return r.setSelection(xe.rowSelection(x, L)), !0;
}
function GM(t, e, n, r) {
  let i = _g(t);
  return i = Hg(i, e, n), Vg(t, i);
}
function nn(t) {
  const e = t.selection, n = xl(t), r = n.node(-1), i = n.start(-1), o = ye.get(r);
  return {
    ...e instanceof xe ? o.rectBetween(e.$anchorCell.pos - i, e.$headCell.pos - i) : o.findCell(n.pos - i),
    tableStart: i,
    map: o,
    table: r
  };
}
function jg(t, { map: e, tableStart: n, table: r }, i) {
  let o = i > 0 ? -1 : 0;
  zM(e, r, i + o) && (o = i == 0 || i == e.width ? null : 0);
  for (let s = 0; s < e.height; s++) {
    const l = s * e.width + i;
    if (i > 0 && i < e.width && e.map[l - 1] == e.map[l]) {
      const a = e.map[l], u = r.nodeAt(a);
      t.setNodeMarkup(t.mapping.map(n + a), null, PM(u.attrs, i - e.colCount(a))), s += u.attrs.rowspan - 1;
    } else {
      const a = o == null ? ot(r.type.schema).cell : r.nodeAt(e.map[l + o]).type, u = e.positionAt(s, i, r);
      t.insert(t.mapping.map(n + u), a.createAndFill());
    }
  }
  return t;
}
function Wg(t, e) {
  if (!Pe(t)) return !1;
  if (e) {
    const n = nn(t);
    e(jg(t.tr, n, n.left));
  }
  return !0;
}
function qg(t, e) {
  if (!Pe(t)) return !1;
  if (e) {
    const n = nn(t);
    e(jg(t.tr, n, n.right));
  }
  return !0;
}
function YM(t, { map: e, table: n, tableStart: r }, i) {
  const o = t.mapping.maps.length;
  for (let s = 0; s < e.height; ) {
    const l = s * e.width + i, a = e.map[l], u = n.nodeAt(a), c = u.attrs;
    if (i > 0 && e.map[l - 1] == a || i < e.width - 1 && e.map[l + 1] == a) t.setNodeMarkup(t.mapping.slice(o).map(r + a), null, Br(c, i - e.colCount(a)));
    else {
      const f = t.mapping.slice(o).map(r + a);
      t.delete(f, f + u.nodeSize);
    }
    s += c.rowspan;
  }
}
function Kg(t, e) {
  if (!Pe(t)) return !1;
  if (e) {
    const n = nn(t), r = t.tr;
    if (n.left == 0 && n.right == n.map.width) return !1;
    for (let i = n.right - 1; YM(r, n, i), i != n.left; i--) {
      const o = n.tableStart ? r.doc.nodeAt(n.tableStart - 1) : r.doc;
      if (!o) throw new RangeError("No table found");
      n.table = o, n.map = ye.get(o);
    }
    e(r);
  }
  return !0;
}
function QM(t, e, n) {
  var r;
  const i = ot(e.type.schema).header_cell;
  for (let o = 0; o < t.width; o++) if (((r = e.nodeAt(t.map[o + n * t.width])) === null || r === void 0 ? void 0 : r.type) != i) return !1;
  return !0;
}
function Ug(t, { map: e, tableStart: n, table: r }, i) {
  let o = n;
  for (let u = 0; u < i; u++) o += r.child(u).nodeSize;
  const s = [];
  let l = i > 0 ? -1 : 0;
  QM(e, r, i + l) && (l = i == 0 || i == e.height ? null : 0);
  for (let u = 0, c = e.width * i; u < e.width; u++, c++) if (i > 0 && i < e.height && e.map[c] == e.map[c - e.width]) {
    const f = e.map[c], h = r.nodeAt(f).attrs;
    t.setNodeMarkup(n + f, null, {
      ...h,
      rowspan: h.rowspan + 1
    }), u += h.colspan - 1;
  } else {
    var a;
    const f = l == null ? ot(r.type.schema).cell : (a = r.nodeAt(e.map[c + l * e.width])) === null || a === void 0 ? void 0 : a.type, h = f == null ? void 0 : f.createAndFill();
    h && s.push(h);
  }
  return t.insert(o, ot(r.type.schema).row.create(null, s)), t;
}
function XM(t, e) {
  if (!Pe(t)) return !1;
  if (e) {
    const n = nn(t);
    e(Ug(t.tr, n, n.top));
  }
  return !0;
}
function ZM(t, e) {
  if (!Pe(t)) return !1;
  if (e) {
    const n = nn(t);
    e(Ug(t.tr, n, n.bottom));
  }
  return !0;
}
function ev(t, { map: e, table: n, tableStart: r }, i) {
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
        }, h.content), g = e.positionAt(i + 1, u, n);
        t.insert(t.mapping.slice(l).map(r + g), p), u += d.colspan - 1;
      }
    }
  }
}
function Jg(t, e) {
  if (!Pe(t)) return !1;
  if (e) {
    const n = nn(t), r = t.tr;
    if (n.top == 0 && n.bottom == n.map.height) return !1;
    for (let i = n.bottom - 1; ev(r, n, i), i != n.top; i--) {
      const o = n.tableStart ? r.doc.nodeAt(n.tableStart - 1) : r.doc;
      if (!o) throw new RangeError("No table found");
      n.table = o, n.map = ye.get(n.table);
    }
    e(r);
  }
  return !0;
}
function tv(t, e) {
  return function(n, r) {
    if (!Pe(n)) return !1;
    const i = xl(n);
    if (i.nodeAfter.attrs[t] === e) return !1;
    if (r) {
      const o = n.tr;
      n.selection instanceof xe ? n.selection.forEachCell((s, l) => {
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
function nv(t) {
  return function(e, n) {
    if (!Pe(e)) return !1;
    if (n) {
      const r = ot(e.schema), i = nn(e), o = e.tr, s = i.map.cellsInRect(t == "column" ? {
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
function fd(t, e, n) {
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
function Wc(t, e) {
  return e = e || { useDeprecatedLogic: !1 }, e.useDeprecatedLogic ? nv(t) : function(n, r) {
    if (!Pe(n)) return !1;
    if (r) {
      const i = ot(n.schema), o = nn(n), s = n.tr, l = fd("row", o, i), a = fd("column", o, i), u = (t === "column" ? l : t === "row" && a) ? 1 : 0, c = t == "column" ? {
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
Wc("row", { useDeprecatedLogic: !0 });
Wc("column", { useDeprecatedLogic: !0 });
Wc("cell", { useDeprecatedLogic: !0 });
function rv(t, e) {
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
function Gg(t) {
  return function(e, n) {
    if (!Pe(e)) return !1;
    const r = rv(xl(e), t);
    if (r == null) return !1;
    if (n) {
      const i = e.doc.resolve(r);
      n(e.tr.setSelection(Y.between(i, LM(i))).scrollIntoView());
    }
    return !0;
  };
}
function iv(t, e) {
  const n = t.selection.$anchor;
  for (let r = n.depth; r > 0; r--) if (n.node(r).type.spec.tableRole == "table")
    return e && e(t.tr.delete(n.before(r), n.after(r)).scrollIntoView()), !0;
  return !1;
}
function ws(t, e) {
  const n = t.selection;
  if (!(n instanceof xe)) return !1;
  if (e) {
    const r = t.tr, i = ot(t.schema).cell.createAndFill().content;
    n.forEachCell((o, s) => {
      o.content.eq(i) || r.replace(r.mapping.map(s + 1), r.mapping.map(s + o.nodeSize - 1), new _(i, 0, 0));
    }), r.docChanged && e(r);
  }
  return !0;
}
function ov(t) {
  return (e, n) => {
    const { from: r, to: i, select: o = !0, pos: s = e.selection.from } = t, l = e.tr;
    return JM({
      tr: l,
      originIndex: r,
      targetIndex: i,
      select: o,
      pos: s
    }) ? (n == null || n(l), !0) : !1;
  };
}
function sv(t) {
  return (e, n) => {
    const { from: r, to: i, select: o = !0, pos: s = e.selection.from } = t, l = e.tr;
    return KM({
      tr: l,
      originIndex: r,
      targetIndex: i,
      select: o,
      pos: s
    }) ? (n == null || n(l), !0) : !1;
  };
}
function lv(t) {
  if (t.size === 0) return null;
  let { content: e, openStart: n, openEnd: r } = t;
  for (; e.childCount == 1 && (n > 0 && r > 0 || e.child(0).type.spec.tableRole == "table"); )
    n--, r--, e = e.child(0).content;
  const i = e.child(0), o = i.type.spec.tableRole, s = i.type.schema, l = [];
  if (o == "row") for (let a = 0; a < e.childCount; a++) {
    let u = e.child(a).content;
    const c = a ? 0 : Math.max(0, n - 1), f = a < e.childCount - 1 ? 0 : Math.max(0, r - 1);
    (c || f) && (u = du(ot(s).row, new _(u, c, f)).content), l.push(u);
  }
  else if (o == "cell" || o == "header_cell") l.push(n || r ? du(ot(s).row, new _(e, n, r)).content : e);
  else return null;
  return av(s, l);
}
function av(t, e) {
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
      const o = ot(t).cell.createAndFill(), s = [];
      for (let l = n[i]; l < r; l++) s.push(o);
      e[i] = e[i].append(R.from(s));
    }
  return {
    height: e.length,
    width: r,
    rows: e
  };
}
function du(t, e) {
  const n = t.createAndFill();
  return new tm(n).replace(0, n.content.size, e).doc;
}
function uv({ width: t, height: e, rows: n }, r, i) {
  if (t != r) {
    const o = [], s = [];
    for (let l = 0; l < n.length; l++) {
      const a = n[l], u = [];
      for (let c = o[l] || 0, f = 0; c < r; f++) {
        let h = a.child(f % a.childCount);
        c + h.attrs.colspan > r && (h = h.type.createChecked(Br(h.attrs, h.attrs.colspan, c + h.attrs.colspan - r), h.content)), u.push(h), c += h.attrs.colspan;
        for (let d = 1; d < h.attrs.rowspan; d++) o[l + d] = (o[l + d] || 0) + h.attrs.colspan;
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
function cv(t, e, n, r, i, o, s) {
  const l = t.doc.type.schema, a = ot(l);
  let u, c;
  if (i > e.width) for (let f = 0, h = 0; f < e.height; f++) {
    const d = n.child(f);
    h += d.nodeSize;
    const p = [];
    let g;
    d.lastChild == null || d.lastChild.type == a.cell ? g = u || (u = a.cell.createAndFill()) : g = c || (c = a.header_cell.createAndFill());
    for (let x = e.width; x < i; x++) p.push(g);
    t.insert(t.mapping.slice(s).map(h - 1 + r), p);
  }
  if (o > e.height) {
    const f = [];
    for (let p = 0, g = (e.height - 1) * e.width; p < Math.max(e.width, i); p++) {
      const x = p >= e.width ? !1 : n.nodeAt(e.map[g + p]).type == a.header_cell;
      f.push(x ? c || (c = a.header_cell.createAndFill()) : u || (u = a.cell.createAndFill()));
    }
    const h = a.row.create(null, R.from(f)), d = [];
    for (let p = e.height; p < o; p++) d.push(h);
    t.insert(t.mapping.slice(s).map(r + n.nodeSize - 2), d);
  }
  return !!(u || c);
}
function hd(t, e, n, r, i, o, s, l) {
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
function dd(t, e, n, r, i, o, s, l) {
  if (s == 0 || s == e.width) return !1;
  let a = !1;
  for (let u = i; u < o; u++) {
    const c = u * e.width + s, f = e.map[c];
    if (e.map[c - 1] == f) {
      a = !0;
      const h = n.nodeAt(f), d = e.colCount(f), p = t.mapping.slice(l).map(f + r);
      t.setNodeMarkup(p, null, Br(h.attrs, s - d, h.attrs.colspan - (s - d))), t.insert(p + h.nodeSize, h.type.createAndFill(Br(h.attrs, 0, s - d))), u += h.attrs.rowspan - 1;
    }
  }
  return a;
}
function pd(t, e, n, r, i) {
  let o = n ? t.doc.nodeAt(n - 1) : t.doc;
  if (!o) throw new Error("No table found");
  let s = ye.get(o);
  const { top: l, left: a } = r, u = a + i.width, c = l + i.height, f = t.tr;
  let h = 0;
  function d() {
    if (o = n ? f.doc.nodeAt(n - 1) : f.doc, !o) throw new Error("No table found");
    s = ye.get(o), h = f.mapping.maps.length;
  }
  cv(f, s, o, n, u, c, h) && d(), hd(f, s, o, n, a, u, l, h) && d(), hd(f, s, o, n, a, u, c, h) && d(), dd(f, s, o, n, l, c, a, h) && d(), dd(f, s, o, n, l, c, u, h) && d();
  for (let p = l; p < c; p++) {
    const g = s.positionAt(p, a, o), x = s.positionAt(p, u, o);
    f.replace(f.mapping.slice(h).map(g + n), f.mapping.slice(h).map(x + n), new _(i.rows[p - l], 0, 0));
  }
  d(), f.setSelection(new xe(f.doc.resolve(n + s.positionAt(l, a, o)), f.doc.resolve(n + s.positionAt(c - 1, u - 1, o)))), e(f);
}
const fv = gm({
  ArrowLeft: xs("horiz", -1),
  ArrowRight: xs("horiz", 1),
  ArrowUp: xs("vert", -1),
  ArrowDown: xs("vert", 1),
  "Shift-ArrowLeft": Cs("horiz", -1),
  "Shift-ArrowRight": Cs("horiz", 1),
  "Shift-ArrowUp": Cs("vert", -1),
  "Shift-ArrowDown": Cs("vert", 1),
  Backspace: ws,
  "Mod-Backspace": ws,
  Delete: ws,
  "Mod-Delete": ws
});
function Bs(t, e, n) {
  return n.eq(t.selection) ? !1 : (e && e(t.tr.setSelection(n).scrollIntoView()), !0);
}
function xs(t, e) {
  return (n, r, i) => {
    if (!i) return !1;
    const o = n.selection;
    if (o instanceof xe) return Bs(n, r, te.near(o.$headCell, e));
    if (t != "horiz" && !o.empty) return !1;
    const s = Yg(i, t, e);
    if (s == null) return !1;
    if (t == "horiz") return Bs(n, r, te.near(n.doc.resolve(o.head + e), e));
    {
      const l = n.doc.resolve(s), a = Bg(l, t, e);
      let u;
      return a ? u = te.near(a, 1) : e < 0 ? u = te.near(n.doc.resolve(l.before(-1)), -1) : u = te.near(n.doc.resolve(l.after(-1)), 1), Bs(n, r, u);
    }
  };
}
function Cs(t, e) {
  return (n, r, i) => {
    if (!i) return !1;
    const o = n.selection;
    let s;
    if (o instanceof xe) s = o;
    else {
      const a = Yg(i, t, e);
      if (a == null) return !1;
      s = new xe(n.doc.resolve(a));
    }
    const l = Bg(s.$headCell, t, e);
    return l ? Bs(n, r, new xe(s.$anchorCell, l)) : !1;
  };
}
function hv(t, e) {
  const n = t.state.doc, r = Ei(n.resolve(e));
  return r ? (t.dispatch(t.state.tr.setSelection(new xe(r))), !0) : !1;
}
function dv(t, e, n) {
  if (!Pe(t.state)) return !1;
  let r = lv(n);
  const i = t.state.selection;
  if (i instanceof xe) {
    r || (r = {
      width: 1,
      height: 1,
      rows: [R.from(du(ot(t.state.schema).cell, n))]
    });
    const o = i.$anchorCell.node(-1), s = i.$anchorCell.start(-1), l = ye.get(o).rectBetween(i.$anchorCell.pos - s, i.$headCell.pos - s);
    return r = uv(r, l.right - l.left, l.bottom - l.top), pd(t.state, t.dispatch, s, l, r), !0;
  } else if (r) {
    const o = xl(t.state), s = o.start(-1);
    return pd(t.state, t.dispatch, s, ye.get(o.node(-1)).findCell(o.pos - s), r), !0;
  } else return !1;
}
function pv(t, e) {
  var n;
  if (e.button != 0 || e.ctrlKey || e.metaKey) return;
  const r = md(t, e.target);
  let i;
  if (e.shiftKey && t.state.selection instanceof xe)
    o(t.state.selection.$anchorCell, e), e.preventDefault();
  else if (e.shiftKey && r && (i = Ei(t.state.selection.$anchor)) != null && ((n = ha(t, e)) === null || n === void 0 ? void 0 : n.pos) != i.pos)
    o(i, e), e.preventDefault();
  else if (!r) return;
  function o(a, u) {
    let c = ha(t, u);
    const f = Bn.getState(t.state) == null;
    if (!c || !jc(a, c)) if (f) c = a;
    else return;
    const h = new xe(a, c);
    if (f || !t.state.selection.eq(h)) {
      const d = t.state.tr.setSelection(h);
      f && d.setMeta(Bn, a.pos), t.dispatch(d);
    }
  }
  function s() {
    t.root.removeEventListener("mouseup", s), t.root.removeEventListener("dragstart", s), t.root.removeEventListener("mousemove", l), Bn.getState(t.state) != null && t.dispatch(t.state.tr.setMeta(Bn, -1));
  }
  function l(a) {
    const u = a, c = Bn.getState(t.state);
    let f;
    if (c != null) f = t.state.doc.resolve(c);
    else if (md(t, u.target) != r && (f = ha(t, e), !f))
      return s();
    f && o(f, u);
  }
  t.root.addEventListener("mouseup", s), t.root.addEventListener("dragstart", s), t.root.addEventListener("mousemove", l);
}
function Yg(t, e, n) {
  if (!(t.state.selection instanceof Y)) return null;
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
function md(t, e) {
  for (; e && e != t.dom; e = e.parentNode) if (e.nodeName == "TD" || e.nodeName == "TH") return e;
  return null;
}
function ha(t, e) {
  const n = t.posAtCoords({
    left: e.clientX,
    top: e.clientY
  });
  if (!n) return null;
  let { inside: r, pos: i } = n;
  return r >= 0 && Ei(t.state.doc.resolve(r)) || Ei(t.state.doc.resolve(i));
}
var mv = class {
  constructor(t, e) {
    this.node = t, this.defaultCellMinWidth = e, this.dom = document.createElement("div"), this.dom.className = "tableWrapper", this.table = this.dom.appendChild(document.createElement("table")), this.table.style.setProperty("--default-cell-min-width", `${e}px`), this.colgroup = this.table.appendChild(document.createElement("colgroup")), pu(t, this.colgroup, this.table, e), this.contentDOM = this.table.appendChild(document.createElement("tbody"));
  }
  update(t) {
    return t.type != this.node.type ? !1 : (this.node = t, pu(t, this.colgroup, this.table, this.defaultCellMinWidth), !0);
  }
  ignoreMutation(t) {
    return t.type == "attributes" && (t.target == this.table || this.colgroup.contains(t.target));
  }
};
function pu(t, e, n, r, i, o) {
  let s = 0, l = !0, a = e.firstChild;
  const u = t.firstChild;
  if (u) {
    for (let f = 0, h = 0; f < u.childCount; f++) {
      const { colspan: d, colwidth: p } = u.child(f).attrs;
      for (let g = 0; g < d; g++, h++) {
        const x = i == h ? o : p && p[g], w = x ? x + "px" : "";
        if (s += x || r, x || (l = !1), a)
          a.style.width != w && (a.style.width = w), a = a.nextSibling;
        else {
          const L = document.createElement("col");
          L.style.width = w, e.appendChild(L);
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
const xt = new Xe("tableColumnResizing");
function gv({ handleWidth: t = 5, cellMinWidth: e = 25, defaultCellMinWidth: n = 100, View: r = mv, lastColumnResizable: i = !0 } = {}) {
  const o = new Be({
    key: xt,
    state: {
      init(s, l) {
        var a;
        const u = (a = o.spec) === null || a === void 0 || (a = a.props) === null || a === void 0 ? void 0 : a.nodeViews, c = ot(l.schema).table.name;
        return r && u && (u[c] = (f, h) => new r(f, n, h)), new yv(-1, !1);
      },
      apply(s, l) {
        return l.apply(s);
      }
    },
    props: {
      attributes: (s) => {
        const l = xt.getState(s);
        return l && l.activeHandle > -1 ? { class: "resize-cursor" } : {};
      },
      handleDOMEvents: {
        mousemove: (s, l) => {
          kv(s, l, t, i);
        },
        mouseleave: (s) => {
          bv(s);
        },
        mousedown: (s, l) => {
          wv(s, l, e, n);
        }
      },
      decorations: (s) => {
        const l = xt.getState(s);
        if (l && l.activeHandle > -1) return vv(s, l.activeHandle);
      },
      nodeViews: {}
    }
  });
  return o;
}
var yv = class Fs {
  constructor(e, n) {
    this.activeHandle = e, this.dragging = n;
  }
  apply(e) {
    const n = this, r = e.getMeta(xt);
    if (r && r.setHandle != null) return new Fs(r.setHandle, !1);
    if (r && r.setDragging !== void 0) return new Fs(n.activeHandle, r.setDragging);
    if (n.activeHandle > -1 && e.docChanged) {
      let i = e.mapping.map(n.activeHandle, -1);
      return hu(e.doc.resolve(i)) || (i = -1), new Fs(i, n.dragging);
    }
    return n;
  }
};
function kv(t, e, n, r) {
  if (!t.editable) return;
  const i = xt.getState(t.state);
  if (i && !i.dragging) {
    const o = Cv(e.target);
    let s = -1;
    if (o) {
      const { left: l, right: a } = o.getBoundingClientRect();
      e.clientX - l <= n ? s = gd(t, e, "left", n) : a - e.clientX <= n && (s = gd(t, e, "right", n));
    }
    if (s != i.activeHandle) {
      if (!r && s !== -1) {
        const l = t.state.doc.resolve(s), a = l.node(-1), u = ye.get(a), c = l.start(-1);
        if (u.colCount(l.pos - c) + l.nodeAfter.attrs.colspan - 1 == u.width - 1) return;
      }
      Qg(t, s);
    }
  }
}
function bv(t) {
  if (!t.editable) return;
  const e = xt.getState(t.state);
  e && e.activeHandle > -1 && !e.dragging && Qg(t, -1);
}
function wv(t, e, n, r) {
  var i;
  if (!t.editable) return !1;
  const o = (i = t.dom.ownerDocument.defaultView) !== null && i !== void 0 ? i : window, s = xt.getState(t.state);
  if (!s || s.activeHandle == -1 || s.dragging) return !1;
  const l = t.state.doc.nodeAt(s.activeHandle), a = xv(t, s.activeHandle, l.attrs);
  t.dispatch(t.state.tr.setMeta(xt, { setDragging: {
    startX: e.clientX,
    startWidth: a
  } }));
  function u(f) {
    o.removeEventListener("mouseup", u), o.removeEventListener("mousemove", c);
    const h = xt.getState(t.state);
    h != null && h.dragging && (Sv(t, h.activeHandle, yd(h.dragging, f, n)), t.dispatch(t.state.tr.setMeta(xt, { setDragging: null })));
  }
  function c(f) {
    if (!f.which) return u(f);
    const h = xt.getState(t.state);
    if (h && h.dragging) {
      const d = yd(h.dragging, f, n);
      kd(t, h.activeHandle, d, r);
    }
  }
  return kd(t, s.activeHandle, a, r), o.addEventListener("mouseup", u), o.addEventListener("mousemove", c), e.preventDefault(), !0;
}
function xv(t, e, { colspan: n, colwidth: r }) {
  const i = r && r[r.length - 1];
  if (i) return i;
  const o = t.domAtPos(e);
  let s = o.node.childNodes[o.offset].offsetWidth, l = n;
  if (r)
    for (let a = 0; a < n; a++) r[a] && (s -= r[a], l--);
  return s / l;
}
function Cv(t) {
  for (; t && t.nodeName != "TD" && t.nodeName != "TH"; ) t = t.classList && t.classList.contains("ProseMirror") ? null : t.parentNode;
  return t;
}
function gd(t, e, n, r) {
  const i = n == "right" ? -r : r, o = t.posAtCoords({
    left: e.clientX + i,
    top: e.clientY
  });
  if (!o) return -1;
  const { pos: s } = o, l = Ei(t.state.doc.resolve(s));
  if (!l) return -1;
  if (n == "right") return l.pos;
  const a = ye.get(l.node(-1)), u = l.start(-1), c = a.map.indexOf(l.pos - u);
  return c % a.width == 0 ? -1 : u + a.map[c - 1];
}
function yd(t, e, n) {
  const r = e.clientX - t.startX;
  return Math.max(n, t.startWidth + r);
}
function Qg(t, e) {
  t.dispatch(t.state.tr.setMeta(xt, { setHandle: e }));
}
function Sv(t, e, n) {
  const r = t.state.doc.resolve(e), i = r.node(-1), o = ye.get(i), s = r.start(-1), l = o.colCount(r.pos - s) + r.nodeAfter.attrs.colspan - 1, a = t.state.tr;
  for (let u = 0; u < o.height; u++) {
    const c = u * o.width + l;
    if (u && o.map[c] == o.map[c - o.width]) continue;
    const f = o.map[c], h = i.nodeAt(f).attrs, d = h.colspan == 1 ? 0 : l - o.colCount(f);
    if (h.colwidth && h.colwidth[d] == n) continue;
    const p = h.colwidth ? h.colwidth.slice() : Mv(h.colspan);
    p[d] = n, a.setNodeMarkup(s + f, null, {
      ...h,
      colwidth: p
    });
  }
  a.docChanged && t.dispatch(a);
}
function kd(t, e, n, r) {
  const i = t.state.doc.resolve(e), o = i.node(-1), s = i.start(-1), l = ye.get(o).colCount(i.pos - s) + i.nodeAfter.attrs.colspan - 1;
  let a = t.domAtPos(i.start(-1)).node;
  for (; a && a.nodeName != "TABLE"; ) a = a.parentNode;
  a && pu(o, a.firstChild, a, r, l, n);
}
function Mv(t) {
  return Array(t).fill(0);
}
function vv(t, e) {
  const n = [], r = t.doc.resolve(e), i = r.node(-1);
  if (!i) return Me.empty;
  const o = ye.get(i), s = r.start(-1), l = o.colCount(r.pos - s) + r.nodeAfter.attrs.colspan - 1;
  for (let u = 0; u < o.height; u++) {
    const c = l + u * o.width;
    if ((l == o.width - 1 || o.map[c] != o.map[c + 1]) && (u == 0 || o.map[c] != o.map[c - o.width])) {
      var a;
      const f = o.map[c], h = s + f + i.nodeAt(f).nodeSize - 1, d = document.createElement("div");
      d.className = "column-resize-handle", !((a = xt.getState(t)) === null || a === void 0) && a.dragging && n.push(je.node(s + f, s + f + i.nodeAt(f).nodeSize, { class: "column-resize-dragging" })), n.push(je.widget(h, d));
    }
  }
  return Me.create(t.doc, n);
}
function Tv({ allowTableNodeSelection: t = !1 } = {}) {
  return new Be({
    key: Bn,
    state: {
      init() {
        return null;
      },
      apply(e, n) {
        const r = e.getMeta(Bn);
        if (r != null) return r == -1 ? null : r;
        if (n == null || !e.docChanged) return n;
        const { deleted: i, pos: o } = e.mapping.mapResult(n);
        return i ? null : o;
      }
    },
    props: {
      decorations: FM,
      handleDOMEvents: { mousedown: pv },
      createSelectionBetween(e) {
        return Bn.getState(e.state) != null ? e.state.selection : null;
      },
      handleTripleClick: hv,
      handleKeyDown: fv,
      handlePaste: dv
    },
    appendTransaction(e, n, r) {
      return VM(r, jM(r, n), t);
    }
  });
}
var el = typeof navigator < "u" ? navigator : null, qc = el && el.userAgent || "", Nv = /Edge\/(\d+)/.exec(qc), Iv = /MSIE \d/.exec(qc), Av = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(qc), Ev = !!(Iv || Av || Nv), Ov = !Ev && !!el && /Apple Computer/.test(el.vendor), Xg = new Xe("safari-ime-span"), mu = !1, Dv = {
  key: Xg,
  props: {
    decorations: Rv,
    handleDOMEvents: {
      compositionstart: () => {
        mu = !0;
      },
      compositionend: () => {
        mu = !1;
      }
    }
  }
};
function Rv(t) {
  const { $from: e, $to: n, to: r } = t.selection;
  if (mu && e.sameParent(n)) {
    const i = je.widget(r, Lv, {
      ignoreSelection: !0,
      key: "safari-ime-span"
    });
    return Me.create(t.doc, [i]);
  }
}
function Lv(t) {
  const e = t.dom.ownerDocument.createElement("span");
  return e.className = "ProseMirror-safari-ime-span", e;
}
var Pv = new Be(Ov ? Dv : { key: Xg });
function bd(t, e) {
  const n = String(t);
  if (typeof e != "string")
    throw new TypeError("Expected character");
  let r = 0, i = n.indexOf(e);
  for (; i !== -1; )
    r++, i = n.indexOf(e, i + e.length);
  return r;
}
function zv(t) {
  if (typeof t != "string")
    throw new TypeError("Expected a string");
  return t.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}
function Bv(t, e, n) {
  const i = ul((n || {}).ignore || []), o = Fv(e);
  let s = -1;
  for (; ++s < o.length; )
    Tu(t, "text", l);
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
    const x = f.children.indexOf(u);
    let w = !1, L = [];
    h.lastIndex = 0;
    let A = h.exec(u.value);
    for (; A; ) {
      const j = A.index, H = {
        index: A.index,
        input: A.input,
        stack: [...c, u]
      };
      let M = d(...A, H);
      if (typeof M == "string" && (M = M.length > 0 ? { type: "text", value: M } : void 0), M === !1 ? h.lastIndex = j + 1 : (p !== j && L.push({
        type: "text",
        value: u.value.slice(p, j)
      }), Array.isArray(M) ? L.push(...M) : M && L.push(M), p = j + A[0].length, w = !0), !h.global)
        break;
      A = h.exec(u.value);
    }
    return w ? (p < u.value.length && L.push({ type: "text", value: u.value.slice(p) }), f.children.splice(x, 1, ...L)) : L = [u], x + L.length;
  }
}
function Fv(t) {
  const e = [];
  if (!Array.isArray(t))
    throw new TypeError("Expected find and replace tuple or list of tuples");
  const n = !t[0] || Array.isArray(t[0]) ? t : [t];
  let r = -1;
  for (; ++r < n.length; ) {
    const i = n[r];
    e.push([$v(i[0]), _v(i[1])]);
  }
  return e;
}
function $v(t) {
  return typeof t == "string" ? new RegExp(zv(t), "g") : t;
}
function _v(t) {
  return typeof t == "function" ? t : function() {
    return t;
  };
}
const da = "phrasing", pa = ["autolink", "link", "image", "label"];
function Vv() {
  return {
    transforms: [Jv],
    enter: {
      literalAutolink: jv,
      literalAutolinkEmail: ma,
      literalAutolinkHttp: ma,
      literalAutolinkWww: ma
    },
    exit: {
      literalAutolink: Uv,
      literalAutolinkEmail: Kv,
      literalAutolinkHttp: Wv,
      literalAutolinkWww: qv
    }
  };
}
function Hv() {
  return {
    unsafe: [
      {
        character: "@",
        before: "[+\\-.\\w]",
        after: "[\\-.\\w]",
        inConstruct: da,
        notInConstruct: pa
      },
      {
        character: ".",
        before: "[Ww]",
        after: "[\\-.\\w]",
        inConstruct: da,
        notInConstruct: pa
      },
      {
        character: ":",
        before: "[ps]",
        after: "\\/",
        inConstruct: da,
        notInConstruct: pa
      }
    ]
  };
}
function jv(t) {
  this.enter({ type: "link", title: null, url: "", children: [] }, t);
}
function ma(t) {
  this.config.enter.autolinkProtocol.call(this, t);
}
function Wv(t) {
  this.config.exit.autolinkProtocol.call(this, t);
}
function qv(t) {
  this.config.exit.data.call(this, t);
  const e = this.stack[this.stack.length - 1];
  e.type, e.url = "http://" + this.sliceSerialize(t);
}
function Kv(t) {
  this.config.exit.autolinkEmail.call(this, t);
}
function Uv(t) {
  this.exit(t);
}
function Jv(t) {
  Bv(
    t,
    [
      [/(https?:\/\/|www(?=\.))([-.\w]+)([^ \t\r\n]*)/gi, Gv],
      [new RegExp("(^|\\\\s|[\\\\u0021-\\\\u002F\\\\u003A-\\\\u0040\\\\u005B-\\\\u0060\\\\u007B-\\\\u007E])([-.\\\\w+]+)@([-\\\\w]+(?:\\\\.[-\\\\w]+)+)", "gu"), Yv]
    ],
    { ignore: ["link", "linkReference"] }
  );
}
function Gv(t, e, n, r, i) {
  let o = "";
  if (!Zg(i) || (/^w/i.test(e) && (n = e + n, e = "", o = "http://"), !Qv(n)))
    return !1;
  const s = Xv(n + r);
  if (!s[0]) return !1;
  const l = {
    type: "link",
    title: null,
    url: o + e + s[0],
    children: [{ type: "text", value: e + s[0] }]
  };
  return s[1] ? [l, { type: "text", value: s[1] }] : l;
}
function Yv(t, e, n, r) {
  return (
    // Not an expected previous character.
    !Zg(r, !0) || // Label ends in not allowed character.
    /[-\d_]$/.test(n) ? !1 : {
      type: "link",
      title: null,
      url: "mailto:" + e + "@" + n,
      children: [{ type: "text", value: e + "@" + n }]
    }
  );
}
function Qv(t) {
  const e = t.split(".");
  return !(e.length < 2 || e[e.length - 1] && (/_/.test(e[e.length - 1]) || !/[a-zA-Z\d]/.test(e[e.length - 1])) || e[e.length - 2] && (/_/.test(e[e.length - 2]) || !/[a-zA-Z\d]/.test(e[e.length - 2])));
}
function Xv(t) {
  const e = /[!"&'),.:;<>?\]}]+$/.exec(t);
  if (!e)
    return [t, void 0];
  t = t.slice(0, e.index);
  let n = e[0], r = n.indexOf(")");
  const i = bd(t, "(");
  let o = bd(t, ")");
  for (; r !== -1 && i > o; )
    t += n.slice(0, r + 1), n = n.slice(r + 1), r = n.indexOf(")"), o++;
  return [t, n];
}
function Zg(t, e) {
  const n = t.input.charCodeAt(t.index - 1);
  return (t.index === 0 || Dr(n) || ll(n)) && // If it’s an email, the previous character should not be a slash.
  (!e || n !== 47);
}
ey.peek = lT;
function Zv() {
  this.buffer();
}
function eT(t) {
  this.enter({ type: "footnoteReference", identifier: "", label: "" }, t);
}
function tT() {
  this.buffer();
}
function nT(t) {
  this.enter(
    { type: "footnoteDefinition", identifier: "", label: "", children: [] },
    t
  );
}
function rT(t) {
  const e = this.resume(), n = this.stack[this.stack.length - 1];
  n.type, n.identifier = Vt(
    this.sliceSerialize(t)
  ).toLowerCase(), n.label = e;
}
function iT(t) {
  this.exit(t);
}
function oT(t) {
  const e = this.resume(), n = this.stack[this.stack.length - 1];
  n.type, n.identifier = Vt(
    this.sliceSerialize(t)
  ).toLowerCase(), n.label = e;
}
function sT(t) {
  this.exit(t);
}
function lT() {
  return "[";
}
function ey(t, e, n, r) {
  const i = n.createTracker(r);
  let o = i.move("[^");
  const s = n.enter("footnoteReference"), l = n.enter("reference");
  return o += i.move(
    n.safe(n.associationId(t), { after: "]", before: o })
  ), l(), s(), o += i.move("]"), o;
}
function aT() {
  return {
    enter: {
      gfmFootnoteCallString: Zv,
      gfmFootnoteCall: eT,
      gfmFootnoteDefinitionLabelString: tT,
      gfmFootnoteDefinition: nT
    },
    exit: {
      gfmFootnoteCallString: rT,
      gfmFootnoteCall: iT,
      gfmFootnoteDefinitionLabelString: oT,
      gfmFootnoteDefinition: sT
    }
  };
}
function uT(t) {
  let e = !1;
  return t && t.firstLineBlank && (e = !0), {
    handlers: { footnoteDefinition: n, footnoteReference: ey },
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
        e ? ty : cT
      )
    )), u(), a;
  }
}
function cT(t, e, n) {
  return e === 0 ? t : ty(t, e, n);
}
function ty(t, e, n) {
  return (n ? "" : "    ") + t;
}
const fT = [
  "autolink",
  "destinationLiteral",
  "destinationRaw",
  "reference",
  "titleQuote",
  "titleApostrophe"
];
ry.peek = mT;
function ny() {
  return {
    canContainEols: ["delete"],
    enter: { strikethrough: dT },
    exit: { strikethrough: pT }
  };
}
function hT() {
  return {
    unsafe: [
      {
        character: "~",
        inConstruct: "phrasing",
        notInConstruct: fT
      }
    ],
    handlers: { delete: ry }
  };
}
function dT(t) {
  this.enter({ type: "delete", children: [] }, t);
}
function pT(t) {
  this.exit(t);
}
function ry(t, e, n, r) {
  const i = n.createTracker(r), o = n.enter("strikethrough");
  let s = i.move("~~");
  return s += n.containerPhrasing(t, {
    ...i.current(),
    before: s,
    after: "~"
  }), s += i.move("~~"), o(), s;
}
function mT() {
  return "~";
}
function gT(t) {
  return t.length;
}
function yT(t, e) {
  const n = e || {}, r = (n.align || []).concat(), i = n.stringLength || gT, o = [], s = [], l = [], a = [];
  let u = 0, c = -1;
  for (; ++c < t.length; ) {
    const g = [], x = [];
    let w = -1;
    for (t[c].length > u && (u = t[c].length); ++w < t[c].length; ) {
      const L = kT(t[c][w]);
      if (n.alignDelimiters !== !1) {
        const A = i(L);
        x[w] = A, (a[w] === void 0 || A > a[w]) && (a[w] = A);
      }
      g.push(L);
    }
    s[c] = g, l[c] = x;
  }
  let f = -1;
  if (typeof r == "object" && "length" in r)
    for (; ++f < u; )
      o[f] = wd(r[f]);
  else {
    const g = wd(r);
    for (; ++f < u; )
      o[f] = g;
  }
  f = -1;
  const h = [], d = [];
  for (; ++f < u; ) {
    const g = o[f];
    let x = "", w = "";
    g === 99 ? (x = ":", w = ":") : g === 108 ? x = ":" : g === 114 && (w = ":");
    let L = n.alignDelimiters === !1 ? 1 : Math.max(
      1,
      a[f] - x.length - w.length
    );
    const A = x + "-".repeat(L) + w;
    n.alignDelimiters !== !1 && (L = x.length + L + w.length, L > a[f] && (a[f] = L), d[f] = L), h[f] = A;
  }
  s.splice(1, 0, h), l.splice(1, 0, d), c = -1;
  const p = [];
  for (; ++c < s.length; ) {
    const g = s[c], x = l[c];
    f = -1;
    const w = [];
    for (; ++f < u; ) {
      const L = g[f] || "";
      let A = "", j = "";
      if (n.alignDelimiters !== !1) {
        const H = a[f] - (x[f] || 0), M = o[f];
        M === 114 ? A = " ".repeat(H) : M === 99 ? H % 2 ? (A = " ".repeat(H / 2 + 0.5), j = " ".repeat(H / 2 - 0.5)) : (A = " ".repeat(H / 2), j = A) : j = " ".repeat(H);
      }
      n.delimiterStart !== !1 && !f && w.push("|"), n.padding !== !1 && // Don’t add the opening space if we’re not aligning and the cell is
      // empty: there will be a closing space.
      !(n.alignDelimiters === !1 && L === "") && (n.delimiterStart !== !1 || f) && w.push(" "), n.alignDelimiters !== !1 && w.push(A), w.push(L), n.alignDelimiters !== !1 && w.push(j), n.padding !== !1 && w.push(" "), (n.delimiterEnd !== !1 || f !== u - 1) && w.push("|");
    }
    p.push(
      n.delimiterEnd === !1 ? w.join("").replace(/ +$/, "") : w.join("")
    );
  }
  return p.join(`
`);
}
function kT(t) {
  return t == null ? "" : String(t);
}
function wd(t) {
  const e = typeof t == "string" ? t.codePointAt(0) : 0;
  return e === 67 || e === 99 ? 99 : e === 76 || e === 108 ? 108 : e === 82 || e === 114 ? 114 : 0;
}
function bT() {
  return {
    enter: {
      table: wT,
      tableData: xd,
      tableHeader: xd,
      tableRow: CT
    },
    exit: {
      codeText: ST,
      table: xT,
      tableData: ga,
      tableHeader: ga,
      tableRow: ga
    }
  };
}
function wT(t) {
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
function xT(t) {
  this.exit(t), this.data.inTable = void 0;
}
function CT(t) {
  this.enter({ type: "tableRow", children: [] }, t);
}
function ga(t) {
  this.exit(t);
}
function xd(t) {
  this.enter({ type: "tableCell", children: [] }, t);
}
function ST(t) {
  let e = this.resume();
  this.data.inTable && (e = e.replace(/\\([\\|])/g, MT));
  const n = this.stack[this.stack.length - 1];
  n.type, n.value = e, this.exit(t);
}
function MT(t, e) {
  return e === "|" ? e : t;
}
function vT(t) {
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
  function s(d, p, g, x) {
    return u(c(d, g, x), d.align);
  }
  function l(d, p, g, x) {
    const w = f(d, g, x), L = u([w]);
    return L.slice(0, L.indexOf(`
`));
  }
  function a(d, p, g, x) {
    const w = g.enter("tableCell"), L = g.enter("phrasing"), A = g.containerPhrasing(d, {
      ...x,
      before: o,
      after: o
    });
    return L(), w(), A;
  }
  function u(d, p) {
    return yT(d, {
      align: p,
      // @ts-expect-error: `markdown-table` types should support `null`.
      alignDelimiters: r,
      // @ts-expect-error: `markdown-table` types should support `null`.
      padding: n,
      // @ts-expect-error: `markdown-table` types should support `null`.
      stringLength: i
    });
  }
  function c(d, p, g) {
    const x = d.children;
    let w = -1;
    const L = [], A = p.enter("table");
    for (; ++w < x.length; )
      L[w] = f(x[w], p, g);
    return A(), L;
  }
  function f(d, p, g) {
    const x = d.children;
    let w = -1;
    const L = [], A = p.enter("tableRow");
    for (; ++w < x.length; )
      L[w] = a(x[w], d, p, g);
    return A(), L;
  }
  function h(d, p, g) {
    let x = Iu.inlineCode(d, p, g);
    return g.stack.includes("tableCell") && (x = x.replace(/\|/g, "\\$&")), x;
  }
}
function TT() {
  return {
    exit: {
      taskListCheckValueChecked: Cd,
      taskListCheckValueUnchecked: Cd,
      paragraph: IT
    }
  };
}
function NT() {
  return {
    unsafe: [{ atBreak: !0, character: "-", after: "[:|-]" }],
    handlers: { listItem: AT }
  };
}
function Cd(t) {
  const e = this.stack[this.stack.length - 2];
  e.type, e.checked = t.type === "taskListCheckValueChecked";
}
function IT(t) {
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
function AT(t, e, n, r) {
  const i = t.children[0], o = typeof t.checked == "boolean" && i && i.type === "paragraph", s = "[" + (t.checked ? "x" : " ") + "] ", l = n.createTracker(r);
  o && l.move(s);
  let a = Iu.listItem(t, e, n, {
    ...r,
    ...l.current()
  });
  return o && (a = a.replace(/^(?:[*+-]|\d+\.)([\r\n]| {1,3})/, u)), a;
  function u(c) {
    return c + s;
  }
}
function ET() {
  return [
    Vv(),
    aT(),
    ny(),
    bT(),
    TT()
  ];
}
function OT(t) {
  return {
    extensions: [
      Hv(),
      uT(t),
      hT(),
      vT(t),
      NT()
    ]
  };
}
const DT = {
  tokenize: FT,
  partial: !0
}, iy = {
  tokenize: $T,
  partial: !0
}, oy = {
  tokenize: _T,
  partial: !0
}, sy = {
  tokenize: VT,
  partial: !0
}, RT = {
  tokenize: HT,
  partial: !0
}, ly = {
  name: "wwwAutolink",
  tokenize: zT,
  previous: uy
}, ay = {
  name: "protocolAutolink",
  tokenize: BT,
  previous: cy
}, Nn = {
  name: "emailAutolink",
  tokenize: PT,
  previous: fy
}, rn = {};
function LT() {
  return {
    text: rn
  };
}
let sr = 48;
for (; sr < 123; )
  rn[sr] = Nn, sr++, sr === 58 ? sr = 65 : sr === 91 && (sr = 97);
rn[43] = Nn;
rn[45] = Nn;
rn[46] = Nn;
rn[95] = Nn;
rn[72] = [Nn, ay];
rn[104] = [Nn, ay];
rn[87] = [Nn, ly];
rn[119] = [Nn, ly];
function PT(t, e, n) {
  const r = this;
  let i, o;
  return s;
  function s(f) {
    return !gu(f) || !fy.call(r, r.previous) || Kc(r.events) ? n(f) : (t.enter("literalAutolink"), t.enter("literalAutolinkEmail"), l(f));
  }
  function l(f) {
    return gu(f) ? (t.consume(f), l) : f === 64 ? (t.consume(f), a) : n(f);
  }
  function a(f) {
    return f === 46 ? t.check(RT, c, u)(f) : f === 45 || f === 95 || ft(f) ? (o = !0, t.consume(f), a) : c(f);
  }
  function u(f) {
    return t.consume(f), i = !0, a;
  }
  function c(f) {
    return o && i && nt(r.previous) ? (t.exit("literalAutolinkEmail"), t.exit("literalAutolink"), e(f)) : n(f);
  }
}
function zT(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return s !== 87 && s !== 119 || !uy.call(r, r.previous) || Kc(r.events) ? n(s) : (t.enter("literalAutolink"), t.enter("literalAutolinkWww"), t.check(DT, t.attempt(iy, t.attempt(oy, o), n), n)(s));
  }
  function o(s) {
    return t.exit("literalAutolinkWww"), t.exit("literalAutolink"), e(s);
  }
}
function BT(t, e, n) {
  const r = this;
  let i = "", o = !1;
  return s;
  function s(f) {
    return (f === 72 || f === 104) && cy.call(r, r.previous) && !Kc(r.events) ? (t.enter("literalAutolink"), t.enter("literalAutolinkHttp"), i += String.fromCodePoint(f), t.consume(f), l) : n(f);
  }
  function l(f) {
    if (nt(f) && i.length < 5)
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
    return f === null || _s(f) || be(f) || Dr(f) || ll(f) ? n(f) : t.attempt(iy, t.attempt(oy, c), n)(f);
  }
  function c(f) {
    return t.exit("literalAutolinkHttp"), t.exit("literalAutolink"), e(f);
  }
}
function FT(t, e, n) {
  let r = 0;
  return i;
  function i(s) {
    return (s === 87 || s === 119) && r < 3 ? (r++, t.consume(s), i) : s === 46 && r === 3 ? (t.consume(s), o) : n(s);
  }
  function o(s) {
    return s === null ? n(s) : e(s);
  }
}
function $T(t, e, n) {
  let r, i, o;
  return s;
  function s(u) {
    return u === 46 || u === 95 ? t.check(sy, a, l)(u) : u === null || be(u) || Dr(u) || u !== 45 && ll(u) ? a(u) : (o = !0, t.consume(u), s);
  }
  function l(u) {
    return u === 95 ? r = !0 : (i = r, r = void 0), t.consume(u), s;
  }
  function a(u) {
    return i || r || !o ? n(u) : e(u);
  }
}
function _T(t, e) {
  let n = 0, r = 0;
  return i;
  function i(s) {
    return s === 40 ? (n++, t.consume(s), i) : s === 41 && r < n ? o(s) : s === 33 || s === 34 || s === 38 || s === 39 || s === 41 || s === 42 || s === 44 || s === 46 || s === 58 || s === 59 || s === 60 || s === 63 || s === 93 || s === 95 || s === 126 ? t.check(sy, e, o)(s) : s === null || be(s) || Dr(s) ? e(s) : (t.consume(s), i);
  }
  function o(s) {
    return s === 41 && r++, t.consume(s), i;
  }
}
function VT(t, e, n) {
  return r;
  function r(l) {
    return l === 33 || l === 34 || l === 39 || l === 41 || l === 42 || l === 44 || l === 46 || l === 58 || l === 59 || l === 63 || l === 95 || l === 126 ? (t.consume(l), r) : l === 38 ? (t.consume(l), o) : l === 93 ? (t.consume(l), i) : (
      // `<` is an end.
      l === 60 || // So is whitespace.
      l === null || be(l) || Dr(l) ? e(l) : n(l)
    );
  }
  function i(l) {
    return l === null || l === 40 || l === 91 || be(l) || Dr(l) ? e(l) : r(l);
  }
  function o(l) {
    return nt(l) ? s(l) : n(l);
  }
  function s(l) {
    return l === 59 ? (t.consume(l), r) : nt(l) ? (t.consume(l), s) : n(l);
  }
}
function HT(t, e, n) {
  return r;
  function r(o) {
    return t.consume(o), i;
  }
  function i(o) {
    return ft(o) ? n(o) : e(o);
  }
}
function uy(t) {
  return t === null || t === 40 || t === 42 || t === 95 || t === 91 || t === 93 || t === 126 || be(t);
}
function cy(t) {
  return !nt(t);
}
function fy(t) {
  return !(t === 47 || gu(t));
}
function gu(t) {
  return t === 43 || t === 45 || t === 46 || t === 95 || ft(t);
}
function Kc(t) {
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
const jT = {
  tokenize: QT,
  partial: !0
};
function WT() {
  return {
    document: {
      91: {
        name: "gfmFootnoteDefinition",
        tokenize: JT,
        continuation: {
          tokenize: GT
        },
        exit: YT
      }
    },
    text: {
      91: {
        name: "gfmFootnoteCall",
        tokenize: UT
      },
      93: {
        name: "gfmPotentialFootnoteCall",
        add: "after",
        tokenize: qT,
        resolveTo: KT
      }
    }
  };
}
function qT(t, e, n) {
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
    const u = Vt(r.sliceSerialize({
      start: s.end,
      end: r.now()
    }));
    return u.codePointAt(0) !== 94 || !o.includes(u.slice(1)) ? n(a) : (t.enter("gfmFootnoteCallLabelMarker"), t.consume(a), t.exit("gfmFootnoteCallLabelMarker"), e(a));
  }
}
function KT(t, e) {
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
function UT(t, e, n) {
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
      f === null || f === 91 || be(f)
    )
      return n(f);
    if (f === 93) {
      t.exit("chunkString");
      const h = t.exit("gfmFootnoteCallString");
      return i.includes(Vt(r.sliceSerialize(h))) ? (t.enter("gfmFootnoteCallLabelMarker"), t.consume(f), t.exit("gfmFootnoteCallLabelMarker"), t.exit("gfmFootnoteCall"), e) : n(f);
    }
    return be(f) || (s = !0), o++, t.consume(f), f === 92 ? c : u;
  }
  function c(f) {
    return f === 91 || f === 92 || f === 93 ? (t.consume(f), o++, u) : u(f);
  }
}
function JT(t, e, n) {
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
      p === null || p === 91 || be(p)
    )
      return n(p);
    if (p === 93) {
      t.exit("chunkString");
      const g = t.exit("gfmFootnoteDefinitionLabelString");
      return o = Vt(r.sliceSerialize(g)), t.enter("gfmFootnoteDefinitionLabelMarker"), t.consume(p), t.exit("gfmFootnoteDefinitionLabelMarker"), t.exit("gfmFootnoteDefinitionLabel"), h;
    }
    return be(p) || (l = !0), s++, t.consume(p), p === 92 ? f : c;
  }
  function f(p) {
    return p === 91 || p === 92 || p === 93 ? (t.consume(p), s++, c) : c(p);
  }
  function h(p) {
    return p === 58 ? (t.enter("definitionMarker"), t.consume(p), t.exit("definitionMarker"), i.includes(o) || i.push(o), ue(t, d, "gfmFootnoteDefinitionWhitespace")) : n(p);
  }
  function d(p) {
    return e(p);
  }
}
function GT(t, e, n) {
  return t.check(Jo, e, t.attempt(jT, e, n));
}
function YT(t) {
  t.exit("gfmFootnoteDefinition");
}
function QT(t, e, n) {
  const r = this;
  return ue(t, i, "gfmFootnoteDefinitionIndent", 5);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return s && s[1].type === "gfmFootnoteDefinitionIndent" && s[2].sliceSerialize(s[1], !0).length === 4 ? e(o) : n(o);
  }
}
function hy(t) {
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
            d && Ct(h, h.length, 0, al(d, s.slice(u + 1, a), l)), Ct(h, h.length, 0, [["exit", f, l], ["enter", s[a][1], l], ["exit", s[a][1], l], ["exit", c, l]]), Ct(s, u - 1, a - u + 3, h), a = u + h.length - 2;
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
      const g = vi(u);
      if (p === 126)
        return f > 1 ? a(p) : (s.consume(p), f++, d);
      if (f < 2 && !n) return a(p);
      const x = s.exit("strikethroughSequenceTemporary"), w = vi(p);
      return x._open = !w || w === 2 && !!g, x._close = !g || g === 2 && !!w, l(p);
    }
  }
}
class XT {
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
    ZT(this, e, n, r);
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
function ZT(t, e, n, r) {
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
function eN(t, e) {
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
function tN() {
  return {
    flow: {
      null: {
        name: "table",
        tokenize: nN,
        resolveAll: rN
      }
    }
  };
}
function nN(t, e, n) {
  const r = this;
  let i = 0, o = 0, s;
  return l;
  function l(N) {
    let U = r.events.length - 1;
    for (; U > -1; ) {
      const de = r.events[U][1].type;
      if (de === "lineEnding" || // Note: markdown-rs uses `whitespace` instead of `linePrefix`
      de === "linePrefix") U--;
      else break;
    }
    const K = U > -1 ? r.events[U][1].type : null, ne = K === "tableHead" || K === "tableRow" ? M : a;
    return ne === M && r.parser.lazy[r.now().line] ? n(N) : ne(N);
  }
  function a(N) {
    return t.enter("tableHead"), t.enter("tableRow"), u(N);
  }
  function u(N) {
    return N === 124 || (s = !0, o += 1), c(N);
  }
  function c(N) {
    return N === null ? n(N) : G(N) ? o > 1 ? (o = 0, r.interrupt = !0, t.exit("tableRow"), t.enter("lineEnding"), t.consume(N), t.exit("lineEnding"), d) : n(N) : le(N) ? ue(t, c, "whitespace")(N) : (o += 1, s && (s = !1, i += 1), N === 124 ? (t.enter("tableCellDivider"), t.consume(N), t.exit("tableCellDivider"), s = !0, c) : (t.enter("data"), f(N)));
  }
  function f(N) {
    return N === null || N === 124 || be(N) ? (t.exit("data"), c(N)) : (t.consume(N), N === 92 ? h : f);
  }
  function h(N) {
    return N === 92 || N === 124 ? (t.consume(N), f) : f(N);
  }
  function d(N) {
    return r.interrupt = !1, r.parser.lazy[r.now().line] ? n(N) : (t.enter("tableDelimiterRow"), s = !1, le(N) ? ue(t, p, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(N) : p(N));
  }
  function p(N) {
    return N === 45 || N === 58 ? x(N) : N === 124 ? (s = !0, t.enter("tableCellDivider"), t.consume(N), t.exit("tableCellDivider"), g) : H(N);
  }
  function g(N) {
    return le(N) ? ue(t, x, "whitespace")(N) : x(N);
  }
  function x(N) {
    return N === 58 ? (o += 1, s = !0, t.enter("tableDelimiterMarker"), t.consume(N), t.exit("tableDelimiterMarker"), w) : N === 45 ? (o += 1, w(N)) : N === null || G(N) ? j(N) : H(N);
  }
  function w(N) {
    return N === 45 ? (t.enter("tableDelimiterFiller"), L(N)) : H(N);
  }
  function L(N) {
    return N === 45 ? (t.consume(N), L) : N === 58 ? (s = !0, t.exit("tableDelimiterFiller"), t.enter("tableDelimiterMarker"), t.consume(N), t.exit("tableDelimiterMarker"), A) : (t.exit("tableDelimiterFiller"), A(N));
  }
  function A(N) {
    return le(N) ? ue(t, j, "whitespace")(N) : j(N);
  }
  function j(N) {
    return N === 124 ? p(N) : N === null || G(N) ? !s || i !== o ? H(N) : (t.exit("tableDelimiterRow"), t.exit("tableHead"), e(N)) : H(N);
  }
  function H(N) {
    return n(N);
  }
  function M(N) {
    return t.enter("tableRow"), P(N);
  }
  function P(N) {
    return N === 124 ? (t.enter("tableCellDivider"), t.consume(N), t.exit("tableCellDivider"), P) : N === null || G(N) ? (t.exit("tableRow"), e(N)) : le(N) ? ue(t, P, "whitespace")(N) : (t.enter("data"), F(N));
  }
  function F(N) {
    return N === null || N === 124 || be(N) ? (t.exit("data"), P(N)) : (t.consume(N), N === 92 ? J : F);
  }
  function J(N) {
    return N === 92 || N === 124 ? (t.consume(N), F) : F(N);
  }
}
function rN(t, e) {
  let n = -1, r = !0, i = 0, o = [0, 0, 0, 0], s = [0, 0, 0, 0], l = !1, a = 0, u, c, f;
  const h = new XT();
  for (; ++n < t.length; ) {
    const d = t[n], p = d[1];
    d[0] === "enter" ? p.type === "tableHead" ? (l = !1, a !== 0 && (Sd(h, e, a, u, c), c = void 0, a = 0), u = {
      type: "table",
      start: Object.assign({}, p.start),
      // Note: correct end is set later.
      end: Object.assign({}, p.end)
    }, h.add(n, 0, [["enter", u, e]])) : p.type === "tableRow" || p.type === "tableDelimiterRow" ? (r = !0, f = void 0, o = [0, 0, 0, 0], s = [0, n + 1, 0, 0], l && (l = !1, c = {
      type: "tableBody",
      start: Object.assign({}, p.start),
      // Note: correct end is set later.
      end: Object.assign({}, p.end)
    }, h.add(n, 0, [["enter", c, e]])), i = p.type === "tableDelimiterRow" ? 2 : c ? 3 : 1) : i && (p.type === "data" || p.type === "tableDelimiterMarker" || p.type === "tableDelimiterFiller") ? (r = !1, s[2] === 0 && (o[1] !== 0 && (s[0] = s[1], f = Ss(h, e, o, i, void 0, f), o = [0, 0, 0, 0]), s[2] = n)) : p.type === "tableCellDivider" && (r ? r = !1 : (o[1] !== 0 && (s[0] = s[1], f = Ss(h, e, o, i, void 0, f)), o = s, s = [o[1], n, 0, 0])) : p.type === "tableHead" ? (l = !0, a = n) : p.type === "tableRow" || p.type === "tableDelimiterRow" ? (a = n, o[1] !== 0 ? (s[0] = s[1], f = Ss(h, e, o, i, n, f)) : s[1] !== 0 && (f = Ss(h, e, s, i, n, f)), i = 0) : i && (p.type === "data" || p.type === "tableDelimiterMarker" || p.type === "tableDelimiterFiller") && (s[3] = n);
  }
  for (a !== 0 && Sd(h, e, a, u, c), h.consume(e.events), n = -1; ++n < e.events.length; ) {
    const d = e.events[n];
    d[0] === "enter" && d[1].type === "table" && (d[1]._align = eN(e.events, n));
  }
  return t;
}
function Ss(t, e, n, r, i, o) {
  const s = r === 1 ? "tableHeader" : r === 2 ? "tableDelimiter" : "tableData", l = "tableContent";
  n[0] !== 0 && (o.end = Object.assign({}, Xr(e.events, n[0])), t.add(n[0], 0, [["exit", o, e]]));
  const a = Xr(e.events, n[1]);
  if (o = {
    type: s,
    start: Object.assign({}, a),
    // Note: correct end is set later.
    end: Object.assign({}, a)
  }, t.add(n[1], 0, [["enter", o, e]]), n[2] !== 0) {
    const u = Xr(e.events, n[2]), c = Xr(e.events, n[3]), f = {
      type: l,
      start: Object.assign({}, u),
      end: Object.assign({}, c)
    };
    if (t.add(n[2], 0, [["enter", f, e]]), r !== 2) {
      const h = e.events[n[2]], d = e.events[n[3]];
      if (h[1].end = Object.assign({}, d[1].end), h[1].type = "chunkText", h[1].contentType = "text", n[3] > n[2] + 1) {
        const p = n[2] + 1, g = n[3] - n[2] - 1;
        t.add(p, g, []);
      }
    }
    t.add(n[3] + 1, 0, [["exit", f, e]]);
  }
  return i !== void 0 && (o.end = Object.assign({}, Xr(e.events, i)), t.add(i, 0, [["exit", o, e]]), o = void 0), o;
}
function Sd(t, e, n, r, i) {
  const o = [], s = Xr(e.events, n);
  i && (i.end = Object.assign({}, s), o.push(["exit", i, e])), r.end = Object.assign({}, s), o.push(["exit", r, e]), t.add(n + 1, 0, o);
}
function Xr(t, e) {
  const n = t[e], r = n[0] === "enter" ? "start" : "end";
  return n[1][r];
}
const iN = {
  name: "tasklistCheck",
  tokenize: sN
};
function oN() {
  return {
    text: {
      91: iN
    }
  };
}
function sN(t, e, n) {
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
    return be(a) ? (t.enter("taskListCheckValueUnchecked"), t.consume(a), t.exit("taskListCheckValueUnchecked"), s) : a === 88 || a === 120 ? (t.enter("taskListCheckValueChecked"), t.consume(a), t.exit("taskListCheckValueChecked"), s) : n(a);
  }
  function s(a) {
    return a === 93 ? (t.enter("taskListCheckMarker"), t.consume(a), t.exit("taskListCheckMarker"), t.exit("taskListCheck"), l) : n(a);
  }
  function l(a) {
    return G(a) ? e(a) : le(a) ? t.check({
      tokenize: lN
    }, e, n)(a) : n(a);
  }
}
function lN(t, e, n) {
  return ue(t, r, "whitespace");
  function r(i) {
    return i === null ? n(i) : e(i);
  }
}
function aN(t) {
  return Qd([
    LT(),
    WT(),
    hy(t),
    tN(),
    oN()
  ]);
}
const uN = {};
function cN(t) {
  const e = (
    /** @type {Processor<Root>} */
    this
  ), n = t || uN, r = e.data(), i = r.micromarkExtensions || (r.micromarkExtensions = []), o = r.fromMarkdownExtensions || (r.fromMarkdownExtensions = []), s = r.toMarkdownExtensions || (r.toMarkdownExtensions = []);
  i.push(aN(n)), o.push(ET()), s.push(OT(n));
}
function Q(t, e) {
  return Object.assign(t, { meta: {
    package: "@milkdown/preset-gfm",
    ...e
  } }), t;
}
var Uc = ts("strike_through");
Q(Uc, {
  displayName: "Attr<strikethrough>",
  group: "Strikethrough"
});
var as = Fi("strike_through", (t) => ({
  parseDOM: [{ tag: "del" }, {
    style: "text-decoration",
    getAttrs: (e) => e === "line-through"
  }],
  toDOM: (e) => ["del", t.get(Uc.key)(e)],
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
Q(as.mark, {
  displayName: "MarkSchema<strikethrough>",
  group: "Strikethrough"
});
Q(as.ctx, {
  displayName: "MarkSchemaCtx<strikethrough>",
  group: "Strikethrough"
});
var Jc = Z("ToggleStrikeThrough", (t) => () => Yo(as.type(t)));
Q(Jc, {
  displayName: "Command<ToggleStrikethrough>",
  group: "Strikethrough"
});
var dy = mt((t) => Qo(new RegExp("(?:^|[^\\\\w:/])(~{1,2})(.+?)\\\\1(?!\\\\w|\\\\/)"), as.type(t), { updateCaptured: (e) => e.fullMatch.startsWith("~") ? e : { start: e.start + 1, fullMatch: e.fullMatch.slice(1) } }));
Q(dy, {
  displayName: "InputRule<strikethrough>",
  group: "Strikethrough"
});
var Gc = gt("strikeThroughKeymap", { ToggleStrikethrough: {
  shortcuts: "Mod-Alt-x",
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(Jc.key);
  }
} });
Q(Gc.ctx, {
  displayName: "KeymapCtx<strikethrough>",
  group: "Strikethrough"
});
Q(Gc.shortcuts, {
  displayName: "Keymap<strikethrough>",
  group: "Strikethrough"
});
var us = DM({
  tableGroup: "block",
  cellContent: "paragraph",
  cellAttributes: { alignment: {
    default: "left",
    getFromDOM: (t) => t.style.textAlign || "left",
    setDOMAttr: (t, e) => {
      e.style = `text-align: ${t || "left"}`;
    }
  } }
}), Cn = Ne("table", () => ({
  ...us.table,
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
Q(Cn.node, {
  displayName: "NodeSchema<table>",
  group: "Table"
});
Q(Cn.ctx, {
  displayName: "NodeSchemaCtx<table>",
  group: "Table"
});
var cs = Ne("table_header_row", () => ({
  ...us.table_row,
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
Q(cs.node, {
  displayName: "NodeSchema<tableHeaderRow>",
  group: "Table"
});
Q(cs.ctx, {
  displayName: "NodeSchemaCtx<tableHeaderRow>",
  group: "Table"
});
var ji = Ne("table_row", () => ({
  ...us.table_row,
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
Q(ji.node, {
  displayName: "NodeSchema<tableRow>",
  group: "Table"
});
Q(ji.ctx, {
  displayName: "NodeSchemaCtx<tableRow>",
  group: "Table"
});
var fs = Ne("table_cell", () => ({
  ...us.table_cell,
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
Q(fs.node, {
  displayName: "NodeSchema<tableCell>",
  group: "Table"
});
Q(fs.ctx, {
  displayName: "NodeSchemaCtx<tableCell>",
  group: "Table"
});
var Oi = Ne("table_header", () => ({
  ...us.table_header,
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
Q(Oi.node, {
  displayName: "NodeSchema<tableHeader>",
  group: "Table"
});
Q(Oi.ctx, {
  displayName: "NodeSchemaCtx<tableHeader>",
  group: "Table"
});
function py(t, e = 3, n = 3) {
  const r = Array(n).fill(0).map(() => fs.type(t).createAndFill()), i = Array(n).fill(0).map(() => Oi.type(t).createAndFill()), o = Array(e).fill(0).map((s, l) => l === 0 ? cs.type(t).create(null, i) : ji.type(t).create(null, r));
  return Cn.type(t).create(null, o);
}
function my(t) {
  return (e, n) => (r) => {
    n = n ?? r.selection.from;
    const i = r.doc.resolve(n), o = _x((a) => a.type.name === "table")(i), s = o ? {
      node: o.node,
      from: o.start
    } : void 0, l = t === "row";
    if (s) {
      const a = ye.get(s.node);
      if (e >= 0 && e < (l ? a.height : a.width)) {
        const u = a.positionAt(l ? e : a.height - 1, l ? a.width - 1 : e, s.node), c = r.doc.resolve(s.from + u), f = l ? xe.rowSelection : xe.colSelection, h = a.positionAt(l ? e : 0, l ? 0 : e, s.node), d = r.doc.resolve(s.from + h);
        return pm(r.setSelection(f(c, d)));
      }
    }
    return r;
  };
}
var fN = my("row"), hN = my("col");
function gy(t, e, { map: n, tableStart: r, table: i }, o) {
  const s = Array(o).fill(0).reduce((a, u, c) => a + i.child(c).nodeSize, r), l = Array(n.width).fill(0).map((a, u) => {
    const c = i.nodeAt(n.map[u]);
    return fs.type(t).createAndFill({ alignment: c == null ? void 0 : c.attrs.alignment });
  });
  return e.insert(s, ji.type(t).create(null, l)), e;
}
function dN(t) {
  const e = ls(t.$from);
  if (!e) return;
  const n = ye.get(e.node);
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
function pN(t) {
  const e = dN(t.selection);
  if (e && e[0]) {
    const n = t.doc.resolve(e[0].pos), r = e[e.length - 1];
    if (r) {
      const i = t.doc.resolve(r.pos);
      return pm(t.setSelection(new xe(i, n)));
    }
  }
  return t;
}
var Yc = Z("GoToPrevTableCell", () => () => Gg(-1));
Q(Yc, {
  displayName: "Command<goToPrevTableCellCommand>",
  group: "Table"
});
var Qc = Z("GoToNextTableCell", () => () => Gg(1));
Q(Qc, {
  displayName: "Command<goToNextTableCellCommand>",
  group: "Table"
});
var Xc = Z("ExitTable", (t) => () => (e, n) => {
  if (!Pe(e)) return !1;
  const { $head: r } = e.selection, i = $x(r, Cn.type(t));
  if (!i) return !1;
  const { to: o } = i, s = e.tr.replaceWith(o, o, Qt.type(t).createAndFill());
  return s.setSelection(te.near(s.doc.resolve(o), 1)).scrollIntoView(), n == null || n(s), !0;
});
Q(Xc, {
  displayName: "Command<breakTableCommand>",
  group: "Table"
});
var yy = Z("InsertTable", (t) => ({ row: e, col: n } = {}) => (r, i) => {
  const { selection: o, tr: s } = r, { from: l } = o, a = py(t, e, n), u = s.replaceSelectionWith(a), c = te.findFrom(u.doc.resolve(l), 1, !0);
  return c && u.setSelection(c), i == null || i(u), !0;
});
Q(yy, {
  displayName: "Command<insertTableCommand>",
  group: "Table"
});
var ky = Z("MoveRow", () => ({ from: t, to: e, pos: n } = {}) => ov({
  from: t ?? 0,
  to: e ?? 0,
  pos: n
}));
Q(ky, {
  displayName: "Command<moveRowCommand>",
  group: "Table"
});
var by = Z("MoveCol", () => ({ from: t, to: e, pos: n } = {}) => sv({
  from: t ?? 0,
  to: e ?? 0,
  pos: n
}));
Q(by, {
  displayName: "Command<moveColCommand>",
  group: "Table"
});
var wy = Z("SelectRow", () => (t = { index: 0 }) => (e, n) => {
  const { tr: r } = e;
  return !!(n == null ? void 0 : n(fN(t.index, t.pos)(r)));
});
Q(wy, {
  displayName: "Command<selectRowCommand>",
  group: "Table"
});
var xy = Z("SelectCol", () => (t = { index: 0 }) => (e, n) => {
  const { tr: r } = e;
  return !!(n == null ? void 0 : n(hN(t.index, t.pos)(r)));
});
Q(xy, {
  displayName: "Command<selectColCommand>",
  group: "Table"
});
var Cy = Z("SelectTable", () => () => (t, e) => {
  const { tr: n } = t;
  return !!(e == null ? void 0 : e(pN(n)));
});
Q(Cy, {
  displayName: "Command<selectTableCommand>",
  group: "Table"
});
var Sy = Z("DeleteSelectedCells", () => () => (t, e) => {
  const { selection: n } = t;
  if (!(n instanceof xe)) return !1;
  const r = n.isRowSelection(), i = n.isColSelection();
  return r && i ? iv(t, e) : i ? Kg(t, e) : Jg(t, e);
});
Q(Sy, {
  displayName: "Command<deleteSelectedCellsCommand>",
  group: "Table"
});
var My = Z("AddColBefore", () => () => Wg);
Q(My, {
  displayName: "Command<addColBeforeCommand>",
  group: "Table"
});
var vy = Z("AddColAfter", () => () => qg);
Q(vy, {
  displayName: "Command<addColAfterCommand>",
  group: "Table"
});
var Ty = Z("AddRowBefore", (t) => () => (e, n) => {
  if (!Pe(e)) return !1;
  if (n) {
    const r = nn(e);
    n(gy(t, e.tr, r, r.top));
  }
  return !0;
});
Q(Ty, {
  displayName: "Command<addRowBeforeCommand>",
  group: "Table"
});
var Ny = Z("AddRowAfter", (t) => () => (e, n) => {
  if (!Pe(e)) return !1;
  if (n) {
    const r = nn(e);
    n(gy(t, e.tr, r, r.bottom));
  }
  return !0;
});
Q(Ny, {
  displayName: "Command<addRowAfterCommand>",
  group: "Table"
});
var Iy = Z("SetAlign", () => (t = "left") => tv("alignment", t));
Q(Iy, {
  displayName: "Command<setAlignCommand>",
  group: "Table"
});
var Ay = mt((t) => new Mt(/^\|(\d+)[xX](\d+)\|\s$/, (e, n, r, i) => {
  var a, u;
  const o = e.doc.resolve(r);
  if (!o.node(-1).canReplaceWith(o.index(-1), o.indexAfter(-1), Cn.type(t))) return null;
  const s = py(t, Math.max(Number(((a = n.groups) == null ? void 0 : a.row) ?? 0), 2), Number((u = n.groups) == null ? void 0 : u.col)), l = e.tr.replaceRangeWith(r, i, s);
  return l.setSelection(Y.create(l.doc, r + 3)).scrollIntoView();
}));
Q(Ay, {
  displayName: "InputRule<insertTableInputRule>",
  group: "Table"
});
var Ey = US((t) => ({ run: (e, n, r) => {
  if (r) return e;
  function i(u) {
    var x;
    const c = u.childCount, f = ((x = u.lastChild) == null ? void 0 : x.childCount) ?? 0;
    if (c === 0 || f === 0) return Qt.type(t).create();
    const h = u.firstChild;
    if (!(f > 0 && h && h.childCount === 0)) return u;
    if (c >= 3) {
      const w = u.child(1), L = [];
      for (let H = 0; H < w.childCount; H++) {
        const M = w.child(H);
        L.push(Oi.type(t).create(M.attrs, M.content, M.marks));
      }
      const A = h.type.create(h.attrs, L), j = [];
      for (let H = 2; H < c; H++) j.push(u.child(H));
      return u.type.create(u.attrs, [A, ...j]);
    }
    const d = Array(f).fill(0).map(() => Oi.type(t).createAndFill()), p = new _(R.from(d), 0, 0), g = h.replace(0, 0, p);
    return u.replace(0, h.nodeSize, new _(R.from(g), 0, 0));
  }
  function o(u) {
    const c = ji.type(t), f = [];
    let h = [], d = !1;
    function p() {
      if (h.length === 0) return;
      const g = cs.type(t).createAndFill(), x = Cn.type(t).create(null, [g, ...h]);
      f.push(i(x)), h = [];
    }
    return u.forEach((g) => {
      g.type === c ? (d = !0, h.push(g)) : (p(), f.push(g));
    }), p(), d ? R.from(f) : u;
  }
  function s(u) {
    let c = o(u), f = c !== u;
    const h = [];
    return c.forEach((d) => {
      if (d.type === Cn.type(t)) {
        const p = i(d);
        p !== d && (f = !0), h.push(p);
      } else if (d.childCount > 0) {
        const p = s(d.content);
        p !== d.content ? (f = !0, h.push(d.copy(p))) : h.push(d);
      } else h.push(d);
    }), f ? R.from(h) : u;
  }
  function l(u) {
    const c = [], f = [];
    u.forEach((h) => f.push(h));
    for (let h = 0; h < f.length; h++) {
      const d = f[h], p = f[h + 1];
      d.type === Qt.type(t) && d.content.size === 0 && p && p.type === Cn.type(t) || c.push(d);
    }
    return c.length < f.length ? R.from(c) : u;
  }
  let a = s(e.content);
  return a = l(a), new _(R.from(a), e.openStart, e.openEnd);
} }));
Q(Ey, {
  displayName: "PasteRule<table>",
  group: "Table"
});
var Zc = gt("tableKeymap", {
  NextCell: {
    priority: 100,
    shortcuts: ["Mod-]", "Tab"],
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(Qc.key);
    }
  },
  PrevCell: {
    shortcuts: ["Mod-[", "Shift-Tab"],
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(Yc.key);
    }
  },
  ExitTable: {
    shortcuts: ["Mod-Enter", "Enter"],
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(Xc.key);
    }
  }
});
Q(Zc.ctx, {
  displayName: "KeymapCtx<table>",
  group: "Table"
});
Q(Zc.shortcuts, {
  displayName: "Keymap<table>",
  group: "Table"
});
var ya = "footnote_definition", Md = "footnoteDefinition", ef = Ne("footnote_definition", () => ({
  group: "block",
  content: "block+",
  defining: !0,
  attrs: { label: {
    default: "",
    validate: "string"
  } },
  parseDOM: [{
    tag: `dl[data-type="${ya}"]`,
    getAttrs: (t) => {
      if (!(t instanceof HTMLElement)) throw Xt(t);
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
        "data-type": ya
      },
      ["dt", e],
      ["dd", 0]
    ];
  },
  parseMarkdown: {
    match: ({ type: t }) => t === Md,
    runner: (t, e, n) => {
      t.openNode(n, { label: e.label }).next(e.children).closeNode();
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === ya,
    runner: (t, e) => {
      t.openNode(Md, void 0, {
        label: e.attrs.label,
        identifier: e.attrs.label
      }).next(e.content).closeNode();
    }
  }
}));
Q(ef.ctx, {
  displayName: "NodeSchemaCtx<footnodeDef>",
  group: "footnote"
});
Q(ef.node, {
  displayName: "NodeSchema<footnodeDef>",
  group: "footnote"
});
var ka = "footnote_reference", tf = Ne("footnote_reference", () => ({
  group: "inline",
  inline: !0,
  atom: !0,
  attrs: { label: {
    default: "",
    validate: "string"
  } },
  parseDOM: [{
    tag: `sup[data-type="${ka}"]`,
    getAttrs: (t) => {
      if (!(t instanceof HTMLElement)) throw Xt(t);
      return { label: t.dataset.label };
    }
  }],
  toDOM: (t) => {
    const e = t.attrs.label;
    return [
      "sup",
      {
        "data-label": e,
        "data-type": ka
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
    match: (t) => t.type.name === ka,
    runner: (t, e) => {
      t.addNode("footnoteReference", void 0, void 0, {
        label: e.attrs.label,
        identifier: e.attrs.label
      });
    }
  }
}));
Q(tf.ctx, {
  displayName: "NodeSchemaCtx<footnodeRef>",
  group: "footnote"
});
Q(tf.node, {
  displayName: "NodeSchema<footnodeRef>",
  group: "footnote"
});
var nf = Tn.extendSchema((t) => (e) => {
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
        if (!(r instanceof HTMLElement)) throw Xt(r);
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
Q(nf.node, {
  displayName: "NodeSchema<taskListItem>",
  group: "ListItem"
});
Q(nf.ctx, {
  displayName: "NodeSchemaCtx<taskListItem>",
  group: "ListItem"
});
var Oy = mt(() => new Mt(/^\[(\s|x)\]\s$/, (t, e, n, r) => {
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
Q(Oy, {
  displayName: "InputRule<wrapInTaskListInputRule>",
  group: "ListItem"
});
var mN = [Gc, Zc].flat(), gN = [Ay, Oy], yN = [dy], kN = [Ey], Dy = en(() => Pv);
Q(Dy, {
  displayName: "Prose<autoInsertSpanPlugin>",
  group: "Prose"
});
var bN = en(() => gv({}));
Q(bN, {
  displayName: "Prose<columnResizingPlugin>",
  group: "Prose"
});
var Ry = en(() => Tv({ allowTableNodeSelection: !0 }));
Q(Ry, {
  displayName: "Prose<tableEditingPlugin>",
  group: "Prose"
});
var rf = tn("remarkGFM", () => cN);
Q(rf.plugin, {
  displayName: "Remark<remarkGFMPlugin>",
  group: "Remark"
});
Q(rf.options, {
  displayName: "RemarkConfig<remarkGFMPlugin>",
  group: "Remark"
});
var wN = new Xe("MILKDOWN_KEEP_TABLE_ALIGN_PLUGIN");
function xN(t, e) {
  let n = 0;
  return e.forEach((r, i, o) => {
    r === t && (n = o);
  }), n;
}
var Ly = en(() => new Be({
  key: wN,
  appendTransaction: (t, e, n) => {
    let r;
    const i = (o, s) => {
      if (r || (r = n.tr), o.type.name !== "table_cell") return;
      const l = n.doc.resolve(s), a = l.node(l.depth), u = l.node(l.depth - 1).firstChild;
      if (!u) return;
      const c = xN(o, a), f = u.maybeChild(c);
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
Q(Ly, {
  displayName: "Prose<keepTableAlignPlugin>",
  group: "Prose"
});
var CN = [
  Ly,
  Dy,
  rf,
  Ry
].flat(), SN = [
  nf,
  Cn,
  cs,
  ji,
  Oi,
  fs,
  ef,
  tf,
  Uc,
  as
].flat(), MN = [
  Qc,
  Yc,
  Xc,
  yy,
  ky,
  by,
  wy,
  xy,
  Cy,
  Sy,
  Ty,
  Ny,
  My,
  vy,
  Iy,
  Jc
], vN = [
  SN,
  gN,
  kN,
  yN,
  mN,
  MN,
  CN
].flat(), tl = 200, ze = function() {
};
ze.prototype.append = function(e) {
  return e.length ? (e = ze.from(e), !this.length && e || e.length < tl && this.leafAppend(e) || this.length < tl && e.leafPrepend(this) || this.appendInner(e)) : this;
};
ze.prototype.prepend = function(e) {
  return e.length ? ze.from(e).append(this) : this;
};
ze.prototype.appendInner = function(e) {
  return new TN(this, e);
};
ze.prototype.slice = function(e, n) {
  return e === void 0 && (e = 0), n === void 0 && (n = this.length), e >= n ? ze.empty : this.sliceInner(Math.max(0, e), Math.min(this.length, n));
};
ze.prototype.get = function(e) {
  if (!(e < 0 || e >= this.length))
    return this.getInner(e);
};
ze.prototype.forEach = function(e, n, r) {
  n === void 0 && (n = 0), r === void 0 && (r = this.length), n <= r ? this.forEachInner(e, n, r, 0) : this.forEachInvertedInner(e, n, r, 0);
};
ze.prototype.map = function(e, n, r) {
  n === void 0 && (n = 0), r === void 0 && (r = this.length);
  var i = [];
  return this.forEach(function(o, s) {
    return i.push(e(o, s));
  }, n, r), i;
};
ze.from = function(e) {
  return e instanceof ze ? e : e && e.length ? new Py(e) : ze.empty;
};
var Py = /* @__PURE__ */ function(t) {
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
    if (this.length + i.length <= tl)
      return new e(this.values.concat(i.flatten()));
  }, e.prototype.leafPrepend = function(i) {
    if (this.length + i.length <= tl)
      return new e(i.flatten().concat(this.values));
  }, n.length.get = function() {
    return this.values.length;
  }, n.depth.get = function() {
    return 0;
  }, Object.defineProperties(e.prototype, n), e;
}(ze);
ze.empty = new Py([]);
var TN = /* @__PURE__ */ function(t) {
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
}(ze);
const NN = 500;
class _t {
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
        c.push(new Kt(f.map));
        let d = f.step.map(i.slice(o)), p;
        d && s.maybeStep(d).doc && (p = s.mapping.maps[s.mapping.maps.length - 1], u.push(new Kt(p, void 0, void 0, u.length + c.length))), o--, p && i.appendMap(p, o);
      } else
        s.maybeStep(f.step);
      if (f.selection)
        return l = i ? f.selection.map(i.slice(o)) : f.selection, a = new _t(this.items.slice(0, r).append(c.reverse().concat(u)), this.eventCount - 1), !1;
    }, this.items.length, 0), { remaining: a, transform: s, selection: l };
  }
  // Create a new branch with the given transform added.
  addTransform(e, n, r, i) {
    let o = [], s = this.eventCount, l = this.items, a = !i && l.length ? l.get(l.length - 1) : null;
    for (let c = 0; c < e.steps.length; c++) {
      let f = e.steps[c].invert(e.docs[c]), h = new Kt(e.mapping.maps[c], f, n), d;
      (d = a && a.merge(h)) && (h = d, c ? o.pop() : l = l.slice(0, l.length - 1)), o.push(h), n && (s++, n = void 0), i || (a = h);
    }
    let u = s - r.depth;
    return u > AN && (l = IN(l, u), s -= u), new _t(l.append(o), s);
  }
  remapping(e, n) {
    let r = new Co();
    return this.items.forEach((i, o) => {
      let s = i.mirrorOffset != null && o - i.mirrorOffset >= e ? r.maps.length - i.mirrorOffset : void 0;
      r.appendMap(i.map, s);
    }, e, n), r;
  }
  addMaps(e) {
    return this.eventCount == 0 ? this : new _t(this.items.append(e.map((n) => new Kt(n))), this.eventCount);
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
        let g = e.steps[d].invert(e.docs[d]), x = h.selection && h.selection.map(o.slice(a + 1, d));
        x && l++, r.push(new Kt(p, g, x));
      } else
        r.push(new Kt(p));
    }, i);
    let u = [];
    for (let h = n; h < s; h++)
      u.push(new Kt(o.maps[h]));
    let c = this.items.slice(0, i).append(u).append(r), f = new _t(c, l);
    return f.emptyItemCount() > NN && (f = f.compress(this.items.length - r.length)), f;
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
          let f = new Kt(u.invert(), a, c), h, d = i.length - 1;
          (h = i.length && i[d].merge(f)) ? i[d] = h : i.push(f);
        }
      } else s.map && r--;
    }, this.items.length, 0), new _t(ze.from(i.reverse()), o);
  }
}
_t.empty = new _t(ze.empty, 0);
function IN(t, e) {
  let n;
  return t.forEach((r, i) => {
    if (r.selection && e-- == 0)
      return n = i, !1;
  }), t.slice(n);
}
class Kt {
  constructor(e, n, r, i) {
    this.map = e, this.step = n, this.selection = r, this.mirrorOffset = i;
  }
  merge(e) {
    if (this.step && e.step && !e.selection) {
      let n = e.step.merge(this.step);
      if (n)
        return new Kt(n.getMap().invert(), n, this.selection);
    }
  }
}
class Pn {
  constructor(e, n, r, i, o) {
    this.done = e, this.undone = n, this.prevRanges = r, this.prevTime = i, this.prevComposition = o;
  }
}
const AN = 20;
function EN(t, e, n, r) {
  let i = n.getMeta(Nr), o;
  if (i)
    return i.historyState;
  n.getMeta(zy) && (t = new Pn(t.done, t.undone, null, 0, -1));
  let s = n.getMeta("appendedTransaction");
  if (n.steps.length == 0)
    return t;
  if (s && s.getMeta(Nr))
    return s.getMeta(Nr).redo ? new Pn(t.done.addTransform(n, void 0, r, $s(e)), t.undone, vd(n.mapping.maps), t.prevTime, t.prevComposition) : new Pn(t.done, t.undone.addTransform(n, void 0, r, $s(e)), null, t.prevTime, t.prevComposition);
  if (n.getMeta("addToHistory") !== !1 && !(s && s.getMeta("addToHistory") === !1)) {
    let l = n.getMeta("composition"), a = t.prevTime == 0 || !s && t.prevComposition != l && (t.prevTime < (n.time || 0) - r.newGroupDelay || !ON(n, t.prevRanges)), u = s ? ba(t.prevRanges, n.mapping) : vd(n.mapping.maps);
    return new Pn(t.done.addTransform(n, a ? e.selection.getBookmark() : void 0, r, $s(e)), _t.empty, u, n.time, l ?? t.prevComposition);
  } else return (o = n.getMeta("rebased")) ? new Pn(t.done.rebased(n, o), t.undone.rebased(n, o), ba(t.prevRanges, n.mapping), t.prevTime, t.prevComposition) : new Pn(t.done.addMaps(n.mapping.maps), t.undone.addMaps(n.mapping.maps), ba(t.prevRanges, n.mapping), t.prevTime, t.prevComposition);
}
function ON(t, e) {
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
function vd(t) {
  let e = [];
  for (let n = t.length - 1; n >= 0 && e.length == 0; n--)
    t[n].forEach((r, i, o, s) => e.push(o, s));
  return e;
}
function ba(t, e) {
  if (!t)
    return null;
  let n = [];
  for (let r = 0; r < t.length; r += 2) {
    let i = e.map(t[r], 1), o = e.map(t[r + 1], -1);
    i <= o && n.push(i, o);
  }
  return n;
}
function DN(t, e, n) {
  let r = $s(e), i = Nr.get(e).spec.config, o = (n ? t.undone : t.done).popEvent(e, r);
  if (!o)
    return null;
  let s = o.selection.resolve(o.transform.doc), l = (n ? t.done : t.undone).addTransform(o.transform, e.selection.getBookmark(), i, r), a = new Pn(n ? l : o.remaining, n ? o.remaining : l, null, 0, -1);
  return o.transform.setSelection(s).setMeta(Nr, { redo: n, historyState: a });
}
let wa = !1, Td = null;
function $s(t) {
  let e = t.plugins;
  if (Td != e) {
    wa = !1, Td = e;
    for (let n = 0; n < e.length; n++)
      if (e[n].spec.historyPreserveItems) {
        wa = !0;
        break;
      }
  }
  return wa;
}
function Ms(t) {
  return t.setMeta(zy, !0);
}
const Nr = new Xe("history"), zy = new Xe("closeHistory");
function RN(t = {}) {
  return t = {
    depth: t.depth || 100,
    newGroupDelay: t.newGroupDelay || 500
  }, new Be({
    key: Nr,
    state: {
      init() {
        return new Pn(_t.empty, _t.empty, null, 0, -1);
      },
      apply(e, n, r) {
        return EN(n, r, e, t);
      }
    },
    config: t,
    props: {
      handleDOMEvents: {
        beforeinput(e, n) {
          let r = n.inputType, i = r == "historyUndo" ? ko : r == "historyRedo" ? ei : null;
          return !i || !e.editable ? !1 : (n.preventDefault(), i(e.state, e.dispatch));
        }
      }
    }
  });
}
function By(t, e) {
  return (n, r) => {
    let i = Nr.getState(n);
    if (!i || (t ? i.undone : i.done).eventCount == 0)
      return !1;
    if (r) {
      let o = DN(i, n, t);
      o && r(e ? o.scrollIntoView() : o);
    }
    return !0;
  };
}
const ko = By(!1, !0), ei = By(!0, !0);
function Wi(t, e) {
  return Object.assign(t, { meta: {
    package: "@milkdown/plugin-history",
    ...e
  } }), t;
}
var of = Z("Undo", () => () => ko);
Wi(of, { displayName: "Command<undo>" });
var sf = Z("Redo", () => () => ei);
Wi(sf, { displayName: "Command<redo>" });
var lf = vn({}, "historyProviderConfig");
Wi(lf, { displayName: "Ctx<historyProviderConfig>" });
var Fy = en((t) => RN(t.get(lf.key)));
Wi(Fy, { displayName: "Ctx<historyProviderPlugin>" });
var af = gt("historyKeymap", {
  Undo: {
    shortcuts: "Mod-z",
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(of.key);
    }
  },
  Redo: {
    shortcuts: ["Mod-y", "Shift-Mod-z"],
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(sf.key);
    }
  }
});
Wi(af.ctx, { displayName: "KeymapCtx<history>" });
Wi(af.shortcuts, { displayName: "Keymap<history>" });
var LN = [
  lf,
  Fy,
  af,
  of,
  sf
].flat(), PN = typeof global == "object" && global && global.Object === Object && global, zN = typeof self == "object" && self && self.Object === Object && self, $y = PN || zN || Function("return this")(), nl = $y.Symbol, _y = Object.prototype, BN = _y.hasOwnProperty, FN = _y.toString, Xi = nl ? nl.toStringTag : void 0;
function $N(t) {
  var e = BN.call(t, Xi), n = t[Xi];
  try {
    t[Xi] = void 0;
    var r = !0;
  } catch {
  }
  var i = FN.call(t);
  return r && (e ? t[Xi] = n : delete t[Xi]), i;
}
var _N = Object.prototype, VN = _N.toString;
function HN(t) {
  return VN.call(t);
}
var jN = "[object Null]", WN = "[object Undefined]", Nd = nl ? nl.toStringTag : void 0;
function qN(t) {
  return t == null ? t === void 0 ? WN : jN : Nd && Nd in Object(t) ? $N(t) : HN(t);
}
function KN(t) {
  return t != null && typeof t == "object";
}
var UN = "[object Symbol]";
function JN(t) {
  return typeof t == "symbol" || KN(t) && qN(t) == UN;
}
var GN = /\s/;
function YN(t) {
  for (var e = t.length; e-- && GN.test(t.charAt(e)); )
    ;
  return e;
}
var QN = /^\s+/;
function XN(t) {
  return t && t.slice(0, YN(t) + 1).replace(QN, "");
}
function yu(t) {
  var e = typeof t;
  return t != null && (e == "object" || e == "function");
}
var Id = NaN, ZN = /^[-+]0x[0-9a-f]+$/i, eI = /^0b[01]+$/i, tI = /^0o[0-7]+$/i, nI = parseInt;
function Ad(t) {
  if (typeof t == "number")
    return t;
  if (JN(t))
    return Id;
  if (yu(t)) {
    var e = typeof t.valueOf == "function" ? t.valueOf() : t;
    t = yu(e) ? e + "" : e;
  }
  if (typeof t != "string")
    return t === 0 ? t : +t;
  t = XN(t);
  var n = eI.test(t);
  return n || tI.test(t) ? nI(t.slice(2), n ? 2 : 8) : ZN.test(t) ? Id : +t;
}
var xa = function() {
  return $y.Date.now();
}, rI = "Expected a function", iI = Math.max, oI = Math.min;
function sI(t, e, n) {
  var r, i, o, s, l, a, u = 0, c = !1, f = !1, h = !0;
  if (typeof t != "function")
    throw new TypeError(rI);
  e = Ad(e) || 0, yu(n) && (c = !!n.leading, f = "maxWait" in n, o = f ? iI(Ad(n.maxWait) || 0, e) : o, h = "trailing" in n ? !!n.trailing : h);
  function d(M) {
    var P = r, F = i;
    return r = i = void 0, u = M, s = t.apply(F, P), s;
  }
  function p(M) {
    return u = M, l = setTimeout(w, e), c ? d(M) : s;
  }
  function g(M) {
    var P = M - a, F = M - u, J = e - P;
    return f ? oI(J, o - F) : J;
  }
  function x(M) {
    var P = M - a, F = M - u;
    return a === void 0 || P >= e || P < 0 || f && F >= o;
  }
  function w() {
    var M = xa();
    if (x(M))
      return L(M);
    l = setTimeout(w, g(M));
  }
  function L(M) {
    return l = void 0, h && r ? d(M) : (r = i = void 0, s);
  }
  function A() {
    l !== void 0 && clearTimeout(l), u = 0, r = a = i = l = void 0;
  }
  function j() {
    return l === void 0 ? s : L(xa());
  }
  function H() {
    var M = xa(), P = x(M);
    if (r = arguments, i = this, a = M, P) {
      if (l === void 0)
        return p(a);
      if (f)
        return clearTimeout(l), l = setTimeout(w, e), d(a);
    }
    return l === void 0 && (l = setTimeout(w, e)), s;
  }
  return H.cancel = A, H.flush = j, H;
}
var Vy = class {
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
}, ku = ae(new Vy(), "listener"), lI = new Xe("MILKDOWN_LISTENER"), Hy = (t) => (t.inject(ku, new Vy()), async () => {
  await t.wait(vr);
  const { listeners: e } = t.get(ku);
  e.beforeMount.forEach((u) => u(t)), await t.wait(go);
  const n = t.get(yo);
  let r = null, i = null, o = null, s = null;
  const l = sI(() => {
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
    key: lI,
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
  t.update(Sn, (u) => u.concat(a)), await t.wait(Ps), e.mounted.forEach((u) => u(t));
});
Hy.meta = {
  package: "@milkdown/plugin-listener",
  displayName: "Listener"
};
const aI = [hy()], uI = [ny()];
function jy(t, e = "Markdown") {
  const n = String(t || ""), { body: r, frontmatterLines: i } = Wy(n), s = Mu(r, { extensions: aI, mdastExtensions: uI }).children || [];
  for (let l = 0; l < s.length; l += 1) {
    const a = s[l];
    if (a.type !== "heading" || a.depth !== 1) continue;
    const u = bu(a.children);
    if (!u) continue;
    const c = s[l - 1], f = s[l + 1];
    if (c && f && c.type === "html" && fI(c.value) && f.type === "html" && hI(f.value))
      return {
        displayText: u,
        source: "aligned-h1",
        isFileNameFallback: !1,
        locator: {
          kind: "aligned-lines",
          startLine: Ca(c.position, i),
          endLine: Ed(f.position, i),
          titleLine: Ca(a.position, i)
        }
      };
    const h = Ca(a.position, i), d = Ed(a.position, i);
    return h === d ? {
      displayText: u,
      source: "atx-h1",
      isFileNameFallback: !1,
      locator: { kind: "atx-line", startLine: h, endLine: d, titleLine: h }
    } : {
      displayText: u,
      source: "setext-h1",
      isFileNameFallback: !1,
      locator: { kind: "setext-lines", startLine: h, endLine: d, titleLine: h }
    };
  }
  return {
    displayText: String(e || "Markdown"),
    source: "file-name",
    isFileNameFallback: !0,
    locator: null
  };
}
function cI(t, e, n = {}) {
  const r = String(e || "").trim();
  if (!r)
    return String(t || "");
  const i = String(t || ""), o = n.newline || (i.includes(`\r
`) ? `\r
` : `
`), s = i.split(/\r?\n/), l = jy(i, "");
  if (l.locator) {
    const { kind: u, titleLine: c } = l.locator;
    return u === "setext-lines" ? s[c] = r : s[c] = `# ${r}`, s.join(o);
  }
  const { frontmatterLines: a } = Wy(i);
  if (a > 0) {
    const u = s.slice(0, a), c = s.slice(a);
    let f = 0;
    for (; f < c.length && c[f].trim() === ""; )
      f += 1;
    const h = c.slice(f);
    return [...u, "", `# ${r}`, "", ...h].join(o);
  }
  return i.trim() ? [`# ${r}`, "", ...s].join(o) : `# ${r}${o}`;
}
function bu(t) {
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
        e += bu(n.children);
        break;
      case "image":
        e += n.alt || "";
        break;
      case "emphasis":
      case "strong":
      case "delete":
        e += bu(n.children);
        break;
      case "break":
        e += " ";
        break;
    }
  return e.trim();
}
function Wy(t) {
  const e = t.split(/\r?\n/);
  if ((e[0] || "").trim() !== "---")
    return { body: t, frontmatterLines: 0 };
  for (let n = 1; n < e.length; n += 1)
    if (e[n].trim() === "---")
      return { body: e.slice(n + 1).join(`
`), frontmatterLines: n + 1 };
  return { body: t, frontmatterLines: 0 };
}
function Ca(t, e) {
  return (t && t.start ? t.start.line : 1) - 1 + e;
}
function Ed(t, e) {
  return (t && t.end ? t.end.line : 1) - 1 + e;
}
function fI(t) {
  const e = String(t || "").trim().toLowerCase();
  return e === '<div align="center">' || e === '<div align="right">';
}
function hI(t) {
  return String(t || "").trim().toLowerCase() === "</div>";
}
const rl = /* @__PURE__ */ new WeakMap(), Od = ["name", "description", "trigger_keywords"], Sa = [
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
function fr(t) {
  return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function dI(t = "") {
  const e = String(t || ""), n = e.match(/^---[ \t]*(?:\r?\n)([\s\S]*?)(?:\r?\n)---[ \t]*(?:\r?\n|$)/);
  return n ? {
    raw: n[0],
    body: e.slice(n[0].length),
    fields: kI(n[1] || "")
  } : null;
}
function pI(t = "") {
  return (String(t || "").split(/[\\/]/).pop() || "").toLowerCase() === "skill.md";
}
function il(t = "") {
  return String(t || "").trim().replace(/^['"]|['"]$/g, "").trim();
}
function mI(t = "") {
  const e = String(t || "").trim();
  if (e.startsWith("[") && e.endsWith("]"))
    return e.slice(1, -1).split(",").map(il).filter(Boolean);
  const n = il(e);
  return n ? [n] : [];
}
function gI(t = "") {
  const e = String(t || "").match(/(?:^|\s)Triggers:\s*([\s\S]+)$/i);
  return e ? e[1].split(",").map((n) => il(n.replace(/\.$/, ""))).filter(Boolean) : [];
}
function yI(t = "") {
  return String(t || "").replace(/\s*Triggers:\s*[\s\S]+$/i, "").trim();
}
function kI(t = "") {
  const e = [];
  let n = -1, r = -1, i = !1;
  return String(t || "").split(/\r?\n/).forEach((o) => {
    const s = o.trim();
    if (!s) return;
    if (s.startsWith("- ")) {
      if (n >= 0) {
        const c = il(s.slice(2));
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
      e.push({ key: a, values: mI(u) }), r = -1;
    }
  }), e;
}
function Dd(t, e) {
  return ((t == null ? void 0 : t.fields) || []).find((n) => n.key === e) || null;
}
function bo(t, e) {
  var r, i;
  const n = Dd(t, e);
  if (n && e === "description")
    return (n.values || []).map(yI).filter(Boolean);
  if (n) return n.values || [];
  if (e === "trigger_keywords") {
    const o = ((i = (r = Dd(t, "description")) == null ? void 0 : r.values) == null ? void 0 : i[0]) || "";
    return gI(o);
  }
  return [];
}
function bI(t, e, n) {
  if (!t) return;
  const r = n.map((o) => String(o || "").trim()).filter(Boolean), i = t.fields.find((o) => o.key === e);
  i ? i.values = r : t.fields.push({ key: e, values: r });
}
function wI(t = "") {
  return String(t || "").replace(/^---[ \t]*(?:\r?\n)?/, "").replace(/(?:\r?\n)?---[ \t]*(?:\r?\n)?$/, "").split(/\r?\n/);
}
function xI(t = "") {
  const e = [];
  let n = null;
  return wI(t).forEach((r) => {
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
function Rd(t, e = []) {
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
function CI(t) {
  if (!t) return "";
  const e = /* @__PURE__ */ new Set(), n = [];
  return xI(t.raw).forEach((r) => {
    if (Od.includes(r.key)) {
      e.add(r.key), n.push(...Rd(r.key, bo(t, r.key)));
      return;
    }
    n.push(...r.lines);
  }), Od.forEach((r) => {
    e.has(r) || n.push(...Rd(r, bo(t, r)));
  }), `---
${n.filter((r, i, o) => {
    var s;
    return r.trim() || ((s = o[i - 1]) == null ? void 0 : s.trim());
  }).join(`
`).trim()}
---
`;
}
function SI(t) {
  if (!t) return null;
  const e = document.createElement("section");
  e.className = "markdown-frontmatter skill-frontmatter", e.setAttribute("contenteditable", "false");
  const n = bo(t, "name")[0] || "", r = bo(t, "description")[0] || "", i = bo(t, "trigger_keywords").join(`
`);
  return e.innerHTML = `
    <div class="markdown-frontmatter-label">SKILL 元信息</div>
    <label class="markdown-frontmatter-row">
      <span class="markdown-frontmatter-key">name</span>
      <input class="markdown-frontmatter-input" data-frontmatter-field="name" value="${fr(n)}" spellcheck="false" />
    </label>
    <label class="markdown-frontmatter-row">
      <span class="markdown-frontmatter-key">description</span>
      <textarea class="markdown-frontmatter-input markdown-frontmatter-textarea" data-frontmatter-field="description" rows="3">${fr(r)}</textarea>
    </label>
    <label class="markdown-frontmatter-row">
      <span class="markdown-frontmatter-key">trigger_keywords</span>
      <textarea class="markdown-frontmatter-input markdown-frontmatter-textarea" data-frontmatter-field="trigger_keywords" rows="2" placeholder="每行一个关键词，也可以用逗号分隔">${fr(i)}</textarea>
    </label>
  `, e;
}
function MI(t, e, n) {
  !t || !e || t.querySelectorAll("[data-frontmatter-field]").forEach((r) => {
    r.addEventListener("input", () => {
      const i = r.dataset.frontmatterField, o = r.value || "", s = i === "trigger_keywords" ? o.split(/[,\n]/).map((l) => l.trim()).filter(Boolean) : [o.trim()];
      bI(e, i, s), n == null || n();
    });
  });
}
function Ld(t = "") {
  const e = String(t || "").trim(), n = Sa.some((r) => r.value === e);
  return !e || n ? Sa : [
    ...Sa,
    { value: e, label: e }
  ];
}
const ln = {
  image: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 5.2h11a1.3 1.3 0 0 1 1.3 1.3v8a1.3 1.3 0 0 1-1.3 1.3h-11a1.3 1.3 0 0 1-1.3-1.3v-8a1.3 1.3 0 0 1 1.3-1.3Z" fill="none" stroke="currentColor" stroke-width="1.45"/><path d="m4 13.8 3.2-3.2 2.4 2.2 2.7-3.1 3.7 4.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/><circle cx="13.4" cy="7.8" r="1.1" fill="currentColor"/></svg>',
  h1: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14.7 15V8.2l-1.7.9" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  h2: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13.1 9.1c.4-.7 1-1 1.9-1 1.1 0 1.9.7 1.9 1.7 0 .8-.5 1.4-1.4 2.1l-2.3 2.1h3.8" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  h3: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13.2 8.7c.4-.4 1-.6 1.7-.6 1.1 0 1.9.6 1.9 1.5 0 .8-.6 1.3-1.4 1.4.9.1 1.6.7 1.6 1.6 0 1-.9 1.8-2.1 1.8-.8 0-1.5-.2-2-.7" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  h4: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16.2 14.5V8.2l-3.5 4.3h4.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  list: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 6h8M8 10h8M8 14h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="4.8" cy="6" r="1" fill="currentColor"/><circle cx="4.8" cy="10" r="1" fill="currentColor"/><circle cx="4.8" cy="14" r="1" fill="currentColor"/></svg>',
  orderedList: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 6h8M8 10h8M8 14h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4.3 7V4.5l-.8.4M3.5 9.2c.2-.3.6-.5 1-.5.7 0 1.1.4 1.1 1 0 .4-.3.8-.8 1.2l-1.2.9h2M3.6 13.2c.2-.2.5-.3.9-.3.7 0 1.1.3 1.1.8 0 .4-.3.7-.8.8.6.1 1 .4 1 .9 0 .6-.5 1-1.3 1-.4 0-.8-.1-1.1-.3" fill="none" stroke="currentColor" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  table: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 5h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM3.5 8.5h13M8 5v10M12.5 5v10" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/></svg>',
  code: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.4 6.6-3.2 3.4 3.2 3.4M12.6 6.6l3.2 3.4-3.2 3.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
}, Ur = {
  left: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M4 8h8.5M4 11.5h12M4 15h8.5" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>',
  center: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M6.2 8h7.6M4 11.5h12M6.2 15h7.6" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>',
  right: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M7.5 8H16M4 11.5h12M7.5 15H16" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>'
}, Ma = {
  small: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6.2" y="6.2" width="7.6" height="7.6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.55"/><path d="M8 11.8 9.5 10l1.1 1.2 1.2-1.5 1.5 2.1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  medium: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4.8" y="4.8" width="10.4" height="10.4" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.55"/><path d="M6.8 12.8 9 10.5l1.4 1.5 1.7-2 2 2.8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  large: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="3.5" width="13" height="13" rx="1.7" fill="none" stroke="currentColor" stroke-width="1.55"/><path d="M5.8 13.7 8.7 11l1.8 1.8 2.2-2.6 2.5 3.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
}, qy = /(?:^|\s)nutbook-align=(left|center|right)(?=\s|$)/i, Ky = /(?:^|\s)nutbook-size=(small|medium|large)(?=\s|$)/i, tt = "portable_image", vI = Object.freeze({ small: 160, medium: 480 }), hr = "<!-- nutbook-cover -->", Di = "markdown_cover_image", Ri = "aligned_text_block", Ir = Object.freeze(["center", "right"]);
function Pd(t, e) {
  const n = e.nodes.heading;
  if (!n)
    return null;
  let r = null;
  return t.descendants((i, o, s) => r ? !1 : s === t ? i.type === n && i.attrs.level === 1 && i.textContent.trim() ? (r = { pos: o, node: i }, !1) : i.type.name === Ri : (s.type.name === Ri && i.type === n && i.attrs.level === 1 && i.textContent.trim() && (r = { pos: o, node: i }), !1)), r;
}
function ti(t) {
  return Array.from((t == null ? void 0 : t.childNodes) || []).filter((e) => e.nodeType !== Node.TEXT_NODE || String(e.textContent || "").trim() !== "");
}
function va(t, e) {
  const n = new Set(e);
  return t.getAttributeNames().every((r) => n.has(r.toLowerCase()));
}
function zd(t, e = "src") {
  var i, o;
  const n = String(t || "").trim();
  if (!n || /[\u0000-\u001f\u007f]/.test(n) || n.startsWith("//")) return !1;
  const r = ((o = (i = n.match(/^([a-z][a-z0-9+.-]*):/i)) == null ? void 0 : i[1]) == null ? void 0 : o.toLowerCase()) || "";
  return !r || r === "http" || r === "https" ? !0 : e === "href" && r === "mailto";
}
function Li(t) {
  if (t == null || t === "" || !/^\d+$/.test(String(t))) return null;
  const e = Number(t);
  return Number.isInteger(e) && e >= 1 && e <= 8192 ? e : null;
}
function TI(t = "") {
  const e = String(t || "");
  if (!e.trim() || typeof DOMParser != "function") return null;
  const n = new DOMParser().parseFromString(`<!doctype html><body>${e}</body>`, "text/html"), r = ti(n.body);
  if (r.length !== 1 || r[0].nodeType !== Node.ELEMENT_NODE) return null;
  let i = r[0], o = "";
  if (i.tagName === "P") {
    if (!va(i, ["align"]) || (o = String(i.getAttribute("align") || "").toLowerCase(), !["left", "center", "right"].includes(o))) return null;
    const f = ti(i);
    if (f.length !== 1 || f[0].nodeType !== Node.ELEMENT_NODE) return null;
    i = f[0];
  }
  let s = "", l = "";
  if (i.tagName === "A") {
    if (!va(i, ["href", "title"]) || (s = String(i.getAttribute("href") || "").trim(), l = String(i.getAttribute("title") || ""), !zd(s, "href"))) return null;
    const f = ti(i);
    if (f.length !== 1 || f[0].nodeType !== Node.ELEMENT_NODE) return null;
    i = f[0];
  }
  if (i.tagName !== "IMG" || !va(i, ["src", "alt", "title", "width"]) || ti(i).length > 0) return null;
  const a = String(i.getAttribute("src") || "").trim();
  if (!zd(a, "src")) return null;
  const u = i.getAttribute("width"), c = Li(u);
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
function lr(t) {
  return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function Uy(t = {}) {
  const e = [
    `src="${lr(t.src)}"`,
    `alt="${lr(t.alt)}"`
  ];
  t.title && e.push(`title="${lr(t.title)}"`);
  const n = Li(t.displayWidthPx);
  n != null && e.push(`width="${n}"`);
  const r = `<img ${e.join(" ")}>`, i = t.linkHref ? `<a href="${lr(t.linkHref)}"${t.linkTitle ? ` title="${lr(t.linkTitle)}"` : ""}>
    ${r}
  </a>` : r, o = ["left", "center", "right"].includes(t.alignment) ? t.alignment : "";
  return o ? `<p align="${o}">
  ${i}
</p>` : t.linkHref ? `<a href="${lr(t.linkHref)}"${t.linkTitle ? ` title="${lr(t.linkTitle)}"` : ""}>
  ${r}
</a>` : r;
}
function uf(t) {
  if (!t || typeof t != "object" || (Array.isArray(t.children) && t.children.forEach(uf), t.type !== "html" || typeof t.value != "string")) return;
  const e = TI(t.value);
  e && (Object.keys(t).forEach((n) => {
    n !== "position" && delete t[n];
  }), Object.assign(t, { type: "portableImage", ...e }));
}
const NI = tn("portableImageRemark", () => () => (t) => {
  uf(t);
});
function II(t = "") {
  const e = String(t || "").trim();
  if (!e || typeof DOMParser != "function" || !/^<div(?:\s|>)/i.test(e)) return null;
  const n = new DOMParser().parseFromString(`<!doctype html><body>${e}</div></body>`, "text/html"), r = ti(n.body);
  if (r.length !== 1 || r[0].nodeType !== Node.ELEMENT_NODE) return null;
  const i = r[0];
  if (i.tagName !== "DIV" || ti(i).length > 0) return null;
  const o = i.getAttributeNames();
  if (o.length !== 1 || o[0].toLowerCase() !== "align") return null;
  const s = String(i.getAttribute("align") || "").toLowerCase();
  return Ir.includes(s) ? s : null;
}
function AI(t = "") {
  return /^<\/div\s*>$/i.test(String(t || "").trim());
}
function Jy(t) {
  return !t || typeof t != "object" ? !1 : ["html", "image", "portableImage", "alignedTextBlock"].includes(t.type) ? !0 : Array.isArray(t.children) && t.children.some(Jy);
}
function EI(t) {
  if (!Array.isArray(t == null ? void 0 : t.children)) return;
  const e = t.children;
  for (let n = 0; n <= e.length - 3; n += 1) {
    const r = e[n], i = e[n + 1], o = e[n + 2];
    if ((r == null ? void 0 : r.type) !== "html" || (o == null ? void 0 : o.type) !== "html" || !i || !["paragraph", "heading"].includes(i.type)) continue;
    const s = II(r.value);
    !s || !AI(o.value) || Jy(i) || e.splice(n, 3, {
      type: "alignedTextBlock",
      alignment: s,
      sourceSyntax: "github-div-align",
      children: [i]
    });
  }
}
const OI = tn("alignedTextRemark", () => () => (t) => {
  EI(t);
}), DI = Ne(Ri, () => ({
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
      return Ir.includes(e) ? { alignment: e, sourceSyntax: "github-div-align" } : !1;
    }
  }],
  toDOM: (t) => {
    const e = Ir.includes(t.attrs.alignment) ? t.attrs.alignment : "center";
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
    match: (t) => t.type.name === Ri,
    runner: (t, e) => {
      const n = String(e.attrs.alignment || "").toLowerCase();
      if (!Ir.includes(n) || e.childCount !== 1)
        throw new Error("Invalid aligned text block");
      t.addNode("html", void 0, `<div align="${n}">`).next(e.content).addNode("html", void 0, "</div>");
    }
  }
})), RI = Ne(tt, () => ({
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
        displayWidthPx: Li(t.dataset.nutbookDisplayWidth),
        linkHref: (n == null ? void 0 : n.getAttribute("href")) || "",
        linkTitle: (n == null ? void 0 : n.getAttribute("title")) || "",
        sourceSyntax: "github-html",
        rawSource: t.dataset.nutbookRawSource || "",
        presentationDirty: t.dataset.nutbookPresentationDirty === "true"
      };
    }
  }],
  toDOM: (t) => {
    const e = ["left", "center", "right"].includes(t.attrs.alignment) ? t.attrs.alignment : "", n = Li(t.attrs.displayWidthPx), r = {
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
    match: (t) => t.type.name === tt,
    runner: (t, e) => {
      const n = !e.attrs.presentationDirty && e.attrs.rawSource ? e.attrs.rawSource : Uy(e.attrs);
      t.addNode("html", void 0, n);
    }
  }
}));
function LI(t) {
  return (t == null ? void 0 : t.type) === "html" && String((t == null ? void 0 : t.value) || "").trim() === hr;
}
function Ta(t, e) {
  var i, o, s, l;
  const n = (o = (i = e == null ? void 0 : e.position) == null ? void 0 : i.start) == null ? void 0 : o.offset, r = (l = (s = e == null ? void 0 : e.position) == null ? void 0 : s.end) == null ? void 0 : l.offset;
  return t && Number.isInteger(n) && Number.isInteger(r) && r > n && r <= t.length ? t.slice(n, r) : null;
}
function PI(t, e) {
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
      rawSource: Ta(e, t) || t.rawSource || ""
    };
  if (t.type !== "paragraph" || !Array.isArray(t.children) || t.children.length !== 1) return null;
  const n = t.children[0];
  if ((n == null ? void 0 : n.type) === "image")
    return {
      nodeKind: "image",
      src: n.url || "",
      alt: n.alt || "",
      title: n.title || "",
      alignment: Fr(n.title || ""),
      displayWidthPx: null,
      linkHref: "",
      linkTitle: "",
      rawSource: Ta(e, t) || ""
    };
  if ((n == null ? void 0 : n.type) === "link" && Array.isArray(n.children) && n.children.length === 1 && ((r = n.children[0]) == null ? void 0 : r.type) === "image") {
    const i = n.children[0];
    return {
      nodeKind: "linked-image",
      src: i.url || "",
      alt: i.alt || "",
      title: i.title || "",
      alignment: Fr(i.title || ""),
      displayWidthPx: null,
      linkHref: n.url || "",
      linkTitle: n.title || "",
      rawSource: Ta(e, t) || ""
    };
  }
  return null;
}
function Gy(t, e) {
  const n = t == null ? void 0 : t.children;
  if (!Array.isArray(n)) return [];
  const r = [];
  for (let i = 0; i < n.length; i += 1) {
    const o = n[i];
    if (!LI(o)) continue;
    const s = PI(n[i + 1], e);
    s && r.push({ markerIndex: i, blockIndex: i + 1, block: s });
  }
  return r;
}
function zI(t, e) {
  const n = [];
  if (!Array.isArray(t == null ? void 0 : t.children)) return n;
  const r = Gy(t, e);
  if (r.length > 1)
    return n.push({ kind: "duplicate", count: r.length }), n;
  if (r.length !== 1) return n;
  const { markerIndex: i, blockIndex: o, block: s } = r[0];
  return t.children.splice(i, 2, {
    type: "markdownCoverImage",
    ...s,
    markerRaw: hr,
    presentationDirty: !1
  }), n;
}
function BI(t) {
  const e = Mu(String(t || ""));
  uf(e);
  const n = Gy(e, null).length;
  return { count: n, duplicate: n > 1 };
}
function FI(t) {
  return String(t || "").replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\n/g, " ");
}
function Bd(t) {
  return `"${String(t || "").replace(/"/g, '\\"')}"`;
}
function Fd(t) {
  const e = String(t || "");
  return e && (/[\s<>]/.test(e) ? `<${e.replace(/</g, "\\<").replace(/>/g, "\\>").replace(/\n/g, " ")}>` : e.replace(/[()]/g, (n) => `\\${n}`));
}
function $I(t = {}) {
  if (t.nodeKind === "portable-image") return Uy(t);
  const e = t.title ? ` ${Bd(t.title)}` : "", n = `![${FI(t.alt)}](${Fd(t.src)}${e})`;
  if (t.nodeKind === "linked-image") {
    const r = t.linkTitle ? ` ${Bd(t.linkTitle)}` : "";
    return `[${n}](${Fd(t.linkHref)}${r})`;
  }
  return n;
}
const _I = Ne(Di, () => ({
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
    markerRaw: { default: hr, validate: "string" },
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
        displayWidthPx: Li(t.dataset.nutbookDisplayWidth),
        linkHref: (n == null ? void 0 : n.getAttribute("href")) || "",
        linkTitle: (n == null ? void 0 : n.getAttribute("title")) || "",
        rawSource: t.dataset.nutbookRawSource || "",
        markerRaw: hr,
        presentationDirty: t.dataset.nutbookPresentationDirty === "true"
      };
    }
  }],
  toDOM: (t) => {
    const e = t.attrs, n = ["left", "center", "right"].includes(e.alignment) ? e.alignment : "", r = Li(e.displayWidthPx), i = {
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
    const o = ["img", i], s = e.linkHref ? ["a", { href: e.linkHref, title: e.linkTitle || null }, o] : o;
    return ["div", {
      class: `markdown-cover-image-block${n ? ` nutbook-image-align-${n}` : ""}`,
      "data-type": "markdown-cover-image",
      "data-nutbook-cover": "true",
      "data-nutbook-node-kind": e.nodeKind,
      "data-nutbook-image-align": n,
      "data-nutbook-display-width": r == null ? "" : String(r)
    }, s];
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
        markerRaw: hr,
        presentationDirty: !1
      });
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === Di,
    runner: (t, e) => {
      const n = e.attrs, r = !n.presentationDirty && n.rawSource ? n.rawSource : $I(n);
      t.addNode("html", void 0, `${hr}
${r}`);
    }
  }
}));
function Na(t) {
  var n, r;
  let e = null;
  return (r = (n = t == null ? void 0 : t.doc) == null ? void 0 : n.descendants) == null || r.call(n, (i, o) => i.type.name === Di ? (e = { node: i, pos: o }, !1) : !0), e;
}
function VI(t) {
  return {
    nodeKind: "portable-image",
    src: t.attrs.src || "",
    alt: t.attrs.alt || "",
    title: t.attrs.title || "",
    alignment: t.attrs.alignment || "",
    displayWidthPx: t.attrs.displayWidthPx ?? null,
    linkHref: t.attrs.linkHref || "",
    linkTitle: t.attrs.linkTitle || "",
    rawSource: t.attrs.rawSource || ""
  };
}
function HI(t) {
  const e = t.attrs.title || "";
  return {
    nodeKind: "image",
    src: t.attrs.src || "",
    alt: t.attrs.alt || "",
    title: e,
    alignment: Fr(e),
    displayWidthPx: null,
    linkHref: "",
    linkTitle: "",
    rawSource: ""
  };
}
function Yy(t) {
  if (!(t != null && t.marks)) return null;
  for (let e = 0; e < t.marks.length; e += 1)
    if (t.marks[e].type.name === "link") return t.marks[e];
  return null;
}
function jI(t, e) {
  const n = t.attrs.title || "";
  return {
    nodeKind: "linked-image",
    src: t.attrs.src || "",
    alt: t.attrs.alt || "",
    title: n,
    alignment: Fr(n),
    displayWidthPx: null,
    linkHref: (e == null ? void 0 : e.attrs.href) || "",
    linkTitle: (e == null ? void 0 : e.attrs.title) || "",
    rawSource: ""
  };
}
function Ia(t, e) {
  return t.nodes[Di].create({
    ...e,
    markerRaw: hr,
    presentationDirty: !1
  });
}
function Aa(t, e) {
  const n = t.nodes.image, r = t.nodes.paragraph;
  if (e.nodeKind === "portable-image")
    return t.nodes[tt].create({ ...e, presentationDirty: !1 });
  const i = n.create({ src: e.src, alt: e.alt, title: e.title || null });
  if (e.nodeKind === "linked-image") {
    const o = t.marks.link;
    if (o)
      return r.create(null, i.mark([o.create({ href: e.linkHref, title: e.linkTitle || null })]));
  }
  return r.create(null, i);
}
function WI(t, e) {
  const n = t.schema, r = n.nodes.image, i = n.nodes[tt], o = n.nodes.paragraph;
  if (!r || !o || !i) return null;
  const s = Math.max(0, Math.min(Number(e) || 0, t.doc.content.size));
  let l = t.doc.resolve(s);
  l.depth === 0 && s < t.doc.content.size && (l = t.doc.resolve(Math.min(s + 1, t.doc.content.size)));
  for (let a = l.depth; a >= 1; a -= 1) {
    const u = l.node(a);
    if (u.type === i)
      return {
        blockStart: l.before(a),
        blockEnd: l.after(a),
        attrs: VI(u)
      };
    if (u.type === o && u.childCount === 1) {
      const c = u.firstChild;
      if (c.type === r) {
        const f = Yy(c);
        return {
          blockStart: l.before(a),
          blockEnd: l.after(a),
          attrs: f ? jI(c, f) : HI(c)
        };
      }
      return null;
    }
  }
  return null;
}
function Fr(t = "") {
  var n;
  const e = String(t || "").match(qy);
  return ((n = e == null ? void 0 : e[1]) == null ? void 0 : n.toLowerCase()) || "";
}
function wu(t = "") {
  var n;
  const e = String(t || "").match(Ky);
  return ((n = e == null ? void 0 : e[1]) == null ? void 0 : n.toLowerCase()) || "large";
}
function qI(t = "") {
  return String(t || "").replace(qy, " ").replace(Ky, " ").replace(/\s+/g, " ").trim();
}
function KI(t) {
  if (!t) return "";
  if (t.dataset.nutbookPortableImage === "true")
    return t.dataset.nutbookImageAlign || "";
  const e = Fr(t.getAttribute("title") || ""), n = wu(t.getAttribute("title") || "");
  return ["left", "center", "right"].forEach((r) => {
    t.classList.toggle(`nutbook-image-align-${r}`, e === r);
  }), ["small", "medium", "large"].forEach((r) => {
    t.classList.toggle(`nutbook-image-size-${r}`, n === r);
  }), t.dataset.nutbookImageAlign = e, t.dataset.nutbookImageSize = n, e;
}
function Qy(t) {
  const e = rl.get(t);
  e && (e.destroy(), rl.delete(t));
}
function $d(t) {
  return String(t || "").replace(/\s+/g, " ").trim();
}
function cf(t) {
  var n, r;
  const e = t == null ? void 0 : t.$from;
  if (!e) return !1;
  for (let i = e.depth; i > 0; i -= 1) {
    const o = (r = (n = e.node(i)) == null ? void 0 : n.type) == null ? void 0 : r.name;
    if (o === "list_item" || o === "listItem") return !0;
  }
  return !1;
}
function UI(t) {
  var r;
  const { selection: e } = t;
  if (!(e != null && e.empty)) return !1;
  const { $from: n } = e;
  return !((r = n.parent) != null && r.isTextblock) || n.parentOffset !== 0 ? !1 : cf(e);
}
function JI(t, e, n) {
  if (!UI(t)) return !1;
  const r = t.schema.nodes.list_item || t.schema.nodes.listItem;
  return r ? dg(r)(t, e, n) : !1;
}
function GI() {
  return new Be({
    props: {
      handlePaste(t, e) {
        var o, s;
        const n = (o = e.clipboardData) == null ? void 0 : o.getData("text/plain"), r = ((s = e.clipboardData) == null ? void 0 : s.getData("text/html")) || "";
        return !n || !r || cf(t.state.selection) || !(/<(ol|ul|li)\b/i.test(r) || /data-list-type=/i.test(r)) ? !1 : (e.preventDefault(), t.dispatch(t.state.tr.insertText(n).scrollIntoView()), !0);
      }
    }
  });
}
function _d(t) {
  var n;
  const e = /* @__PURE__ */ new Set();
  return (n = t == null ? void 0 : t.descendants) == null || n.call(t, (r) => {
    var i, o, s, l;
    return ["image", tt].includes((i = r.type) == null ? void 0 : i.name) && ((o = r.attrs) != null && o.src) && e.add(String(r.attrs.src)), ((s = r.type) == null ? void 0 : s.name) === Di && ((l = r.attrs) != null && l.src) && e.add(String(r.attrs.src)), !0;
  }), e;
}
function YI(t) {
  return typeof t != "function" ? null : new Be({
    view(e) {
      let n = _d(e.state.doc), r = null;
      const i = () => {
        r = null;
        const s = _d(e.state.doc);
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
function QI(t) {
  const e = (r) => {
    const i = r.dataset.nutbookOriginalSrc || r.getAttribute("src") || "";
    if (typeof t == "function") {
      const o = t(i);
      o && o !== r.getAttribute("src") && (r.dataset.nutbookOriginalSrc = i, r.setAttribute("src", o));
    }
    KI(r);
  }, n = (r) => {
    r.querySelectorAll("img[src]").forEach(e);
  };
  return new Be({
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
function Vd(t) {
  var n, r;
  if (!t) return !1;
  if (["image", tt].includes((n = t.type) == null ? void 0 : n.name)) return !0;
  let e = !1;
  return (r = t.descendants) == null || r.call(t, (i) => {
    var o;
    return ["image", tt].includes((o = i.type) == null ? void 0 : o.name) ? (e = !0, !1) : !e;
  }), e;
}
function Hd(t, e = t == null ? void 0 : t.selection) {
  if (!t || !e || e.empty || e.from >= e.to)
    return { supported: !1, targets: [], alignment: "" };
  const n = t.schema.nodes.paragraph, r = t.schema.nodes.heading, i = t.schema.nodes[Ri];
  if (!n || !r || !i)
    return { supported: !1, targets: [], alignment: "" };
  const o = [];
  let s = !1;
  if (t.doc.forEach((u, c) => {
    const f = c + (u.type === i ? 2 : 1);
    if (!(e.from >= c + u.nodeSize || e.to <= f)) {
      if (u.type === n || u.type === r) {
        if (Vd(u)) {
          s = !0;
          return;
        }
        o.push({ pos: c, node: u, alignment: "left" });
        return;
      }
      if (u.type === i) {
        const h = u.childCount === 1 ? u.child(0) : null;
        if (!h || ![n, r].includes(h.type) || Vd(h)) {
          s = !0;
          return;
        }
        const d = Ir.includes(u.attrs.alignment) ? u.attrs.alignment : "";
        if (!d) {
          s = !0;
          return;
        }
        o.push({ pos: c, node: u, alignment: d });
        return;
      }
      s = !0;
    }
  }), s || !o.length)
    return { supported: !1, targets: [], alignment: "" };
  const l = o[0].alignment, a = o.every((u) => u.alignment === l) ? l : "";
  return { supported: !0, targets: o, alignment: a };
}
async function XI({ root: t, markdown: e = "", fileName: n = "", language: r = null, onChange: i = null, onEdit: o = null, tableToolsEnabled: s = !0, resolveImageSrc: l = null, onInsertImageAsset: a = null, onRemoveImageAsset: u = null, onImageSizeError: c = null }) {
  if (!t)
    throw new Error("Milkdown root is required");
  const f = window.NutbookI18n, h = (m) => {
    var k, y;
    return ((y = f == null ? void 0 : f.lookup) == null ? void 0 : y.call(f, m, r || ((k = f.currentLanguage) == null ? void 0 : k.call(f)))) ?? m;
  };
  Qy(t), t.innerHTML = "";
  const d = dI(e), p = pI(n) ? d : null, g = d ? d.body : e, x = BI(g);
  if (x.duplicate)
    throw new Error(
      `document declares ${x.count} valid \`<!-- nutbook-cover -->\` markers; only one cover identity is allowed — repair the source before editing`
    );
  const w = document.createElement("div");
  w.className = "milkdown-editor-body";
  const L = SI(p);
  L && t.appendChild(L), t.appendChild(w);
  let A = e, j = !1, H = !1, M = !1, P = !1, F = null, J = null, N = !1, U = null, K = null, ne = null, de = null, ie = !1, re = null, we = null, We = !1, qe = !1, C = null, oe = null, Fe = null, b = null, ve = null, Ze = null, pe = null, jt = e, st = [];
  const In = tn("coverImageRemark", () => () => (m) => {
    st = zI(m, g);
  }), yt = /* @__PURE__ */ new Map(), De = () => {
    j || o == null || o(), j = !0, We && En();
  };
  MI(L, p, () => {
    De(), H = !0, Hr(80);
  });
  const Cl = [], hs = (m) => {
    m.isComposing || m.key === "Process" || !(m.metaKey || m.ctrlKey) || m.altKey || m.key.toLowerCase() !== "z" || !fe() || !Tl(m.shiftKey ? ei : ko) || (m.preventDefault(), m.stopPropagation());
  };
  t.addEventListener("keydown", hs, !0);
  const Ke = await KS.make().config((m) => {
    m.set(zs, w), m.set(Ds, g), m.update(Sn, (k) => [
      mm({
        "Mod-z": ko,
        "Shift-Mod-z": ei,
        "Mod-y": ei,
        Backspace: JI
      }),
      GI(),
      YI(u),
      QI(l),
      ...k
    ].filter(Boolean)), m.update(ku, (k) => k.updated(() => {
      P && (H = !0, Hr());
    }));
  }).use(OI).use(NI).use(In).use(TM).use(vN).use(DI).use(RI).use(_I).use(LN).use(Hy).create(), _r = () => M ? A : Ke.action((m) => {
    const k = m.get(Ae), S = m.get(yo)(k.state.doc), T = p ? CI(p) : (d == null ? void 0 : d.raw) || "";
    return A = d ? `${T}${S}` : S, A;
  }), qi = _r();
  jt = qi, queueMicrotask(() => {
    M || (P = !0, gk(), Sf(), tk(), lk(), Xy(), Re(), Le(), Ue(), vt());
  });
  function fe() {
    return M ? null : Ke.action((m) => m.get(Ae));
  }
  function Vr() {
    var m;
    return !!((m = fe()) != null && m.composing);
  }
  function Ki() {
    if (pe = null, M || !P) return;
    const m = fe();
    if (m != null && m.composing) {
      Hr(180);
      return;
    }
    const k = _r();
    j || (o == null || o(), j = !0), k !== jt && (jt = k, i == null || i(k));
  }
  function Hr(m = 260) {
    P && (pe && clearTimeout(pe), pe = window.setTimeout(Ki, m));
  }
  function Sl(m) {
    var T, D, I;
    if (!m || !Pe(m.state)) return null;
    const { from: k } = m.state.selection, y = m.domAtPos(k), S = ((T = y.node) == null ? void 0 : T.nodeType) === Node.ELEMENT_NODE ? y.node : (D = y.node) == null ? void 0 : D.parentElement;
    return ((I = S == null ? void 0 : S.closest) == null ? void 0 : I.call(S, "table")) || null;
  }
  function tr(m) {
    const k = fe();
    if (!k) return !1;
    const y = m(k.state, k.dispatch, k);
    return y && (De(), k.focus(), Re(), Le(), Ue()), y;
  }
  function Wt(m) {
    var S, T, D;
    const k = m == null ? void 0 : m.state.selection;
    if (!m || !(k != null && k.empty) || Pe(m.state) || cf(k)) return null;
    const { $from: y } = k;
    return !((S = y.parent) != null && S.isTextblock) || ((T = y.parent.type) == null ? void 0 : T.name) !== "paragraph" || ((D = y.parent.content) == null ? void 0 : D.size) > 0 || y.parent.textContent.trim() ? null : {
      from: k.from,
      blockStart: y.before(y.depth),
      blockEnd: y.after(y.depth)
    };
  }
  function Ml(m) {
    var y, S, T, D;
    const k = Wt(m);
    if (!m || !k) return null;
    try {
      const I = m.nodeDOM(k.blockStart);
      if ((I == null ? void 0 : I.nodeType) === Node.ELEMENT_NODE && ((y = I.matches) != null && y.call(I, "p")))
        return I;
      const $ = m.domAtPos(k.from), V = ((S = $.node) == null ? void 0 : S.nodeType) === Node.ELEMENT_NODE ? $.node : (T = $.node) == null ? void 0 : T.parentElement;
      return ((D = V == null ? void 0 : V.closest) == null ? void 0 : D.call(V, "p")) || null;
    } catch {
      return null;
    }
  }
  function jr(m) {
    if (!m || !C) return !1;
    const k = Math.max(1, Math.min(C.from, m.state.doc.content.size));
    try {
      return m.dispatch(m.state.tr.setSelection(Y.create(m.state.doc, k))), !0;
    } catch {
      return !1;
    }
  }
  function E(m, k = null) {
    const y = fe();
    if (!y) return !1;
    jr(y);
    const S = Wt(y);
    if (!S) return !1;
    const T = y.state.tr.replaceWith(S.blockStart, S.blockEnd, m), D = Number.isFinite(k) ? S.blockStart + k : S.blockStart + m.nodeSize, I = Math.max(1, Math.min(D, T.doc.content.size));
    return T.setSelection(Y.near(T.doc.resolve(I), Number.isFinite(k) ? 1 : -1)), y.dispatch(T.scrollIntoView()), De(), y.focus(), En(), Re(), Le(), vt(), !0;
  }
  function B(m) {
    const k = fe();
    if (!k) return !1;
    jr(k);
    const y = k.state.schema.nodes.heading;
    return !y || !Wt(k) ? !1 : (En(), tr(kn(y, { level: m })));
  }
  function ee() {
    const m = fe();
    if (!m) return !1;
    jr(m);
    const k = m.state.schema.nodes.code_block;
    return !k || !Wt(m) ? !1 : (En(), tr(kn(k, { language: "" })));
  }
  function se() {
    const m = fe(), k = m == null ? void 0 : m.state.schema.nodes, y = (k == null ? void 0 : k.bullet_list) || (k == null ? void 0 : k.bulletList), S = (k == null ? void 0 : k.list_item) || (k == null ? void 0 : k.listItem), T = k == null ? void 0 : k.paragraph;
    if (!m || !y || !S || !T) return !1;
    const D = y.create(null, [
      S.create(null, T.create())
    ]);
    return E(D, 3);
  }
  function ke() {
    const m = fe(), k = m == null ? void 0 : m.state.schema.nodes, y = (k == null ? void 0 : k.ordered_list) || (k == null ? void 0 : k.orderedList), S = (k == null ? void 0 : k.list_item) || (k == null ? void 0 : k.listItem), T = k == null ? void 0 : k.paragraph;
    if (!m || !y || !S || !T) return !1;
    const D = y.create({ order: 1 }, [
      S.create(null, T.create())
    ]);
    return E(D, 3);
  }
  function kt() {
    const m = fe(), k = m == null ? void 0 : m.state.schema.nodes, y = k == null ? void 0 : k.table, S = (k == null ? void 0 : k.table_row) || (k == null ? void 0 : k.tableRow), T = (k == null ? void 0 : k.table_cell) || (k == null ? void 0 : k.tableCell), D = (k == null ? void 0 : k.table_header_row) || (k == null ? void 0 : k.tableHeaderRow), I = (k == null ? void 0 : k.table_header) || (k == null ? void 0 : k.tableHeader);
    if (!m || !y || !S || !T || !D || !I) return !1;
    jr(m);
    const $ = Wt(m);
    if (!$) return !1;
    const V = (Ie) => {
      var Se;
      return ((Se = Ie.createAndFill) == null ? void 0 : Se.call(Ie)) || Ie.create();
    }, W = (Ie) => [0, 1, 2].map(() => V(Ie)), he = y.create(null, [
      D.create(null, W(I)),
      S.create(null, W(T)),
      S.create(null, W(T))
    ]), me = m.state.tr.replaceWith($.blockStart, $.blockEnd, he), Ce = te.findFrom(me.doc.resolve($.blockStart), 1, !0);
    return Ce && me.setSelection(Ce), m.dispatch(me.scrollIntoView()), De(), m.focus(), En(), Re(), Le(), vt(), !0;
  }
  function on(m = "") {
    return (String(m || "").split(/[\\/]/).pop() || "image").replace(/\.[^.]+$/, "") || "image";
  }
  function zt(m, k = "") {
    const y = fe(), S = y == null ? void 0 : y.state.schema.nodes.image, T = y == null ? void 0 : y.state.schema.nodes.paragraph;
    if (!y || !S || !T || !m) return !1;
    const D = S.create({
      src: m,
      alt: on(k || m),
      title: ""
    });
    return E(T.create(null, [D]));
  }
  async function nr() {
    if (typeof a != "function") return !1;
    const m = fe();
    if (!m || !Wt(m)) return !1;
    C = { from: m.state.selection.from }, vl({ preserveSelection: !0 });
    let k = null;
    try {
      k = await a();
    } catch (y) {
      console.warn("Markdown image insert failed", y);
    }
    return k != null && k.relativePath ? zt(k.relativePath, k.fileName) : (C = null, Ue(), !1);
  }
  function rr(m) {
    return m === "image" ? (nr(), !0) : m === "h1" ? B(1) : m === "h2" ? B(2) : m === "h3" ? B(3) : m === "h4" ? B(4) : m === "bullet-list" ? se() : m === "ordered-list" ? ke() : m === "table" ? kt() : m === "code-block" ? ee() : !1;
  }
  function et(m) {
    if (!m) return [];
    const k = [];
    return m.state.doc.descendants((y, S) => {
      var T;
      return ((T = y.type) == null ? void 0 : T.name) === "code_block" && k.push({ node: y, pos: S }), !0;
    }), k;
  }
  function An(m, k) {
    var I;
    const y = fe();
    if (!y) return !1;
    const S = y.state.doc.nodeAt(m);
    if (!S || ((I = S.type) == null ? void 0 : I.name) !== "code_block") return !1;
    const T = String(k || "").trim(), D = y.state.tr.setNodeAttribute(m, "language", T);
    return y.dispatch(D), De(), y.focus(), vt(), !0;
  }
  function Bt(m, k) {
    var T;
    const y = document.createElement("select");
    y.className = "markdown-code-language-select", y.setAttribute("aria-label", h("markdown.codeLanguage"));
    const S = ((T = k.node.attrs) == null ? void 0 : T.language) || "";
    return y.innerHTML = Ld(S).map((D) => `<option value="${fr(D.value)}">${fr(D.label)}</option>`).join(""), y.value = S, y.addEventListener("mousedown", (D) => {
      D.stopPropagation();
    }), y.addEventListener("click", (D) => {
      D.stopPropagation();
    }), y.addEventListener("change", (D) => {
      D.preventDefault(), D.stopPropagation(), An(Number(y.dataset.codeBlockPos), D.target.value);
    }), ve.appendChild(y), yt.set(m, y), y;
  }
  function Xy() {
    ve || (ve = document.createElement("div"), ve.className = "markdown-code-language-layer", t.appendChild(ve), ["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
      t.addEventListener(m, vt, !0);
    }), window.addEventListener("scroll", vt, !0), window.addEventListener("resize", vt));
  }
  function Zy() {
    if (Ze = null, !ve || !P || Vr()) return;
    const m = fe(), k = t.querySelector(".ProseMirror");
    if (!m || !k) return;
    const y = t.getBoundingClientRect(), S = Array.from(k.querySelectorAll("pre")), T = et(m);
    yt.forEach((D, I) => {
      S.includes(I) || (D.remove(), yt.delete(I));
    }), S.forEach((D, I) => {
      var Se;
      const $ = T[I];
      if (!$) return;
      const V = yt.get(D) || Bt(D, $);
      V.dataset.codeBlockPos = String($.pos);
      const W = ((Se = $.node.attrs) == null ? void 0 : Se.language) || "";
      [...V.options].some((Te) => Te.value === W) || (V.innerHTML = Ld(W).map((Te) => `<option value="${fr(Te.value)}">${fr(Te.label)}</option>`).join("")), V.value = W;
      const he = D.getBoundingClientRect(), me = he.bottom > y.top && he.top < y.bottom && D.offsetParent !== null;
      if (V.style.display = me ? "inline-flex" : "none", !me) return;
      const Ce = Math.max(8, he.left - y.left + 16), Ie = Math.max(8, he.top - y.top + 10);
      V.style.left = `${Math.round(Ce)}px`, V.style.top = `${Math.round(Ie)}px`;
    });
  }
  function vt() {
    ve && (Ze && cancelAnimationFrame(Ze), Ze = requestAnimationFrame(Zy));
  }
  function ek() {
    var y;
    const m = document.createElement("div");
    m.className = "markdown-insert-menu", m.setAttribute("aria-label", h("markdown.insertMenu"));
    const k = [
      { command: "image", icon: ln.image, label: h("markdown.insertImage") },
      { command: "h1", icon: ln.h1, label: h("markdown.insertHeading1") },
      { command: "h2", icon: ln.h2, label: h("markdown.insertHeading2") },
      { command: "h3", icon: ln.h3, label: h("markdown.insertHeading3") },
      { command: "h4", icon: ln.h4, label: h("markdown.insertHeading4") },
      { command: "bullet-list", icon: ln.list, label: h("markdown.insertBulletList") },
      { command: "ordered-list", icon: ln.orderedList, label: h("markdown.insertOrderedList") },
      { command: "table", icon: ln.table, label: h("markdown.insertTable") },
      { command: "code-block", icon: ln.code, label: h("markdown.insertCodeBlock") }
    ];
    return m.innerHTML = `
      <button class="markdown-insert-trigger" type="button" aria-label="${h("markdown.openInsertMenu")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.5v11M4.5 10h11" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
      </button>
      <div class="markdown-insert-popover" role="menu" aria-hidden="true">
        ${k.map((S) => `
          <button type="button" role="menuitem" data-insert-command="${S.command}" aria-label="${S.label}">
            ${S.icon}
            <span class="markdown-insert-tooltip">${S.label}</span>
          </button>
        `).join("")}
      </div>
    `, m.addEventListener("pointerdown", (S) => {
      S.preventDefault(), S.stopPropagation();
    }), (y = m.querySelector(".markdown-insert-trigger")) == null || y.addEventListener("pointerdown", (S) => {
      var D;
      S.preventDefault(), S.stopPropagation();
      const T = fe();
      !T || !Wt(T) || (C = { from: T.state.selection.from }, qe = !qe, m.classList.toggle("open", qe), (D = m.querySelector(".markdown-insert-popover")) == null || D.setAttribute("aria-hidden", qe ? "false" : "true"), Ue());
    }), m.addEventListener("pointerdown", (S) => {
      const T = S.target.closest("button[data-insert-command]");
      T && (S.preventDefault(), S.stopPropagation(), rr(T.dataset.insertCommand));
    }), m;
  }
  function tk() {
    re || (re = ek(), t.appendChild(re), ["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
      t.addEventListener(m, Ue, !0);
    }), t.addEventListener("keydown", ff, !0), t.addEventListener("pointerdown", hf, !0), window.addEventListener("scroll", Ue, !0), window.addEventListener("resize", Ue), t.addEventListener("focusout", df, !0));
  }
  function ff(m) {
    m.key !== "Enter" || m.isComposing || (window.setTimeout(Ue, 0), window.setTimeout(Ue, 80));
  }
  function hf(m) {
    !qe || re != null && re.contains(m.target) || vl();
  }
  function vl({ preserveSelection: m = !1 } = {}) {
    var k;
    qe = !1, m || (C = null), re == null || re.classList.remove("open"), (k = re == null ? void 0 : re.querySelector(".markdown-insert-popover")) == null || k.setAttribute("aria-hidden", "true");
  }
  function En() {
    re && (vl(), re.classList.remove("visible"), We = !1);
  }
  function df() {
    window.setTimeout(() => {
      const m = document.activeElement;
      !t.contains(m) && !(re != null && re.contains(m)) && En();
    }, 0);
  }
  function nk() {
    var V;
    if (we = null, !re || !P || Vr()) return;
    const m = fe(), k = Wt(m);
    if (!m || !k || !t.contains(m.dom)) {
      En();
      return;
    }
    let y = null;
    try {
      y = m.coordsAtPos(m.state.selection.from);
    } catch {
      En();
      return;
    }
    const S = t.getBoundingClientRect(), T = (V = Ml(m)) == null ? void 0 : V.getBoundingClientRect(), I = ((T == null ? void 0 : T.left) ?? y.left) - S.left - 34, $ = Math.max(4, y.top - S.top + (y.bottom - y.top) / 2 - 13);
    re.style.left = `${Math.round(I)}px`, re.style.top = `${Math.round($)}px`, We || (re.classList.add("visible"), We = !0);
  }
  function Ue() {
    re && (we && cancelAnimationFrame(we), we = requestAnimationFrame(nk));
  }
  function ds(m, k = fe()) {
    if (!m || !k) return null;
    let y = null;
    return k.state.doc.descendants((S, T) => {
      var I, $, V, W, he;
      if (y || !["image", tt].includes((I = S.type) == null ? void 0 : I.name)) return !y;
      const D = k.nodeDOM(T);
      if (D === m || ($ = D == null ? void 0 : D.contains) != null && $.call(D, m)) {
        const me = k.state.doc.resolve(T), Ce = ((V = S.type) == null ? void 0 : V.name) === tt, Ie = Ce || ((he = (W = me.parent) == null ? void 0 : W.type) == null ? void 0 : he.name) === "paragraph" && me.parent.childCount === 1;
        return y = { element: m, node: S, pos: T, isPortable: Ce, isStandalone: Ie }, !1;
      }
      return !0;
    }), y;
  }
  function pf(m, k = {}) {
    var S, T, D, I, $;
    const y = m == null ? void 0 : m.node;
    return y ? ((S = y.type) == null ? void 0 : S.name) === tt ? {
      ...y.attrs,
      ...k,
      sourceSyntax: "github-html",
      presentationDirty: !0
    } : {
      src: ((T = y.attrs) == null ? void 0 : T.src) || "",
      alt: ((D = y.attrs) == null ? void 0 : D.alt) || "",
      title: qI(((I = y.attrs) == null ? void 0 : I.title) || ""),
      alignment: Fr((($ = y.attrs) == null ? void 0 : $.title) || ""),
      displayWidthPx: null,
      linkHref: "",
      linkTitle: "",
      sourceSyntax: "github-html",
      rawSource: "",
      presentationDirty: !0,
      ...k
    } : null;
  }
  function mf(m, k, y) {
    var D;
    if (!m || !k || !y) return !1;
    const S = m.state.schema.nodes[tt];
    if (!S) return !1;
    let T = m.state.tr;
    if (((D = k.node.type) == null ? void 0 : D.name) === tt)
      T = T.setNodeMarkup(k.pos, S, y);
    else {
      if (!k.isStandalone) return !1;
      const I = m.state.doc.resolve(k.pos), $ = I.parent, V = I.before(I.depth);
      T = T.replaceWith(V, V + $.nodeSize, S.create(y));
    }
    return m.dispatch(T.scrollIntoView()), De(), Ui(), m.focus(), !0;
  }
  function rk(m) {
    const k = Number((m == null ? void 0 : m.naturalWidth) || 0);
    return k > 0 ? Promise.resolve(k) : m ? new Promise((y, S) => {
      let T = !1;
      const D = (W, he = null) => {
        T || (T = !0, window.clearTimeout(V), m.removeEventListener("load", I), m.removeEventListener("error", $), he ? S(he) : y(W));
      }, I = () => {
        const W = Number(m.naturalWidth || 0);
        W > 0 ? D(W) : D(0, new Error("IMAGE_DIMENSIONS_UNAVAILABLE"));
      }, $ = () => D(0, new Error("IMAGE_LOAD_FAILED")), V = window.setTimeout(() => D(0, new Error("IMAGE_DIMENSIONS_TIMEOUT")), 4e3);
      m.addEventListener("load", I, { once: !0 }), m.addEventListener("error", $, { once: !0 }), m.complete && I();
    }) : Promise.reject(new Error("IMAGE_NOT_AVAILABLE"));
  }
  async function gf(m, k) {
    if (k === "large") return null;
    const y = vI[k];
    if (!y) return null;
    const S = await rk(m == null ? void 0 : m.element);
    return Math.min(y, S);
  }
  function ps(m) {
    typeof c == "function" && c(m);
  }
  async function ik(m) {
    var T, D, I, $, V, W;
    const k = fe();
    if (!k || !b) return !1;
    let y = { ...b, node: k.state.doc.nodeAt(b.pos) };
    if (!y.node || !y.isStandalone) return !1;
    let S = ((T = y.node.type) == null ? void 0 : T.name) === tt ? ((D = y.node.attrs) == null ? void 0 : D.displayWidthPx) ?? null : null;
    if (((I = y.node.type) == null ? void 0 : I.name) === "image") {
      const he = wu((($ = y.node.attrs) == null ? void 0 : $.title) || "");
      if (he !== "large") {
        try {
          S = await gf(y, he);
        } catch (Ce) {
          return ps(Ce), !1;
        }
        const me = ds(y.element, k);
        if (!me || ((V = me.node.attrs) == null ? void 0 : V.src) !== ((W = y.node.attrs) == null ? void 0 : W.src)) return !1;
        y = me;
      }
    }
    return mf(k, y, pf(y, { alignment: m, displayWidthPx: S }));
  }
  async function ok(m) {
    var S, T;
    const k = fe();
    if (!k || !b) return !1;
    let y = { ...b, node: k.state.doc.nodeAt(b.pos) };
    if (!y.node || !y.isStandalone) return !1;
    try {
      const D = await gf(y, m), I = ds(y.element, k);
      return !I || ((S = I.node.attrs) == null ? void 0 : S.src) !== ((T = y.node.attrs) == null ? void 0 : T.src) ? !1 : (y = I, mf(k, y, pf(y, { displayWidthPx: D })));
    } catch (D) {
      return ps(D), !1;
    }
  }
  function sk() {
    const m = document.createElement("div");
    m.className = "markdown-image-align-toolbar", m.setAttribute("aria-label", h("markdown.imageAlignTools"));
    const k = [
      { type: "align", value: "left", icon: Ur.left, label: h("markdown.alignLeft") },
      { type: "align", value: "center", icon: Ur.center, label: h("markdown.alignCenter") },
      { type: "align", value: "right", icon: Ur.right, label: h("markdown.alignRight") },
      { type: "size", value: "small", icon: Ma.small, label: h("markdown.imageSizeSmall") },
      { type: "size", value: "medium", icon: Ma.medium, label: h("markdown.imageSizeMedium") },
      { type: "size", value: "large", icon: Ma.large, label: h("markdown.imageSizeLarge") }
    ];
    return m.innerHTML = k.map((y) => `
      <button type="button" data-image-${y.type}="${y.value}" aria-label="${y.label}">
        ${y.icon}
        <span class="markdown-image-align-tooltip">${y.label}</span>
      </button>
    `).join(""), m.addEventListener("pointerdown", (y) => {
      const S = y.target.closest("button[data-image-align], button[data-image-size]");
      S && (y.preventDefault(), y.stopPropagation(), S.dataset.imageAlign ? ik(S.dataset.imageAlign).catch(ps) : ok(S.dataset.imageSize || "large").catch(ps));
    }), m.addEventListener("pointerenter", () => {
      Wr();
    }), m.addEventListener("pointerleave", () => {
      window.setTimeout(() => {
        var y, S;
        !(oe != null && oe.matches(":hover")) && !((S = (y = b == null ? void 0 : b.element) == null ? void 0 : y.matches) != null && S.call(y, ":hover")) && Ui();
      }, 120);
    }), m;
  }
  function lk() {
    oe || (oe = sk(), t.appendChild(oe), t.addEventListener("pointerover", yf, !0), t.addEventListener("pointerout", kf, !0), window.addEventListener("scroll", Wr, !0), window.addEventListener("resize", Wr));
  }
  function yf(m) {
    var S, T;
    const k = (T = (S = m.target) == null ? void 0 : S.closest) == null ? void 0 : T.call(S, ".ProseMirror img");
    if (!k || !t.contains(k)) return;
    const y = ds(k);
    y && (b = y, Wr());
  }
  function kf(m) {
    if (!(b != null && b.element)) return;
    const k = m.relatedTarget;
    k && (b.element.contains(k) || oe != null && oe.contains(k)) || window.setTimeout(() => {
      var y, S;
      !(oe != null && oe.matches(":hover")) && !((S = (y = b == null ? void 0 : b.element) == null ? void 0 : y.matches) != null && S.call(y, ":hover")) && Ui();
    }, 120);
  }
  function Ui() {
    oe && (oe.classList.remove("visible"), b = null);
  }
  function ak() {
    var Ce, Ie, Se, Te;
    if (Fe = null, !oe || !(b != null && b.element) || !t.contains(b.element)) {
      Ui();
      return;
    }
    const m = fe(), k = ds(b.element, m);
    if (!k) {
      Ui();
      return;
    }
    b = k;
    const y = ((Ce = b.node.attrs) == null ? void 0 : Ce.title) || "", S = ((Ie = b.node.type) == null ? void 0 : Ie.name) === tt, T = S ? ((Se = b.node.attrs) == null ? void 0 : Se.alignment) || "" : Fr(y), D = S ? ((Te = b.node.attrs) == null ? void 0 : Te.displayWidthPx) == null ? "large" : "custom" : wu(y), I = b.isStandalone;
    oe.querySelectorAll("button[data-image-align], button[data-image-size]").forEach((lt) => {
      lt.disabled = !I;
      const ir = lt.querySelector(".markdown-image-align-tooltip");
      ir && (ir.textContent = I ? lt.getAttribute("aria-label") || "" : h("markdown.imageBlockOnly"));
    }), oe.querySelectorAll("button[data-image-align]").forEach((lt) => {
      lt.classList.toggle("active", lt.dataset.imageAlign === T);
    }), oe.querySelectorAll("button[data-image-size]").forEach((lt) => {
      lt.classList.toggle("active", lt.dataset.imageSize === D);
    });
    const $ = t.getBoundingClientRect(), V = b.element.getBoundingClientRect(), W = oe.offsetWidth || 108, he = Math.max(8, Math.min(V.left - $.left + V.width / 2 - W / 2, $.width - W - 8)), me = Math.max(4, V.top - $.top + 8);
    oe.style.left = `${Math.round(he)}px`, oe.style.top = `${Math.round(me)}px`, oe.classList.add("visible");
  }
  function Wr() {
    oe && (Fe && cancelAnimationFrame(Fe), Fe = requestAnimationFrame(ak));
  }
  function bf(m, k = U) {
    if (!m || !k) return (m == null ? void 0 : m.state.selection) || null;
    const y = m.state.doc.content.size, S = Math.max(0, Math.min(Number(k.anchor), y)), T = Math.max(0, Math.min(Number(k.head), y));
    return Y.between(m.state.doc.resolve(S), m.state.doc.resolve(T));
  }
  function wf(m) {
    const k = fe();
    if (!k || !["left", ...Ir].includes(m)) return !1;
    const y = bf(k), S = Hd(k.state, y);
    if (!S.supported) return !1;
    const T = Ir.includes(m) && S.alignment === m ? "left" : m, D = k.state.schema.nodes[Ri];
    let I = k.state.tr, $ = !1, V = y.anchor, W = y.head;
    const he = (Se, Te, lt, ir) => {
      const Sk = Se + Te, Mk = lt - Te, vf = (Gi) => Gi <= Se ? Gi : Gi >= Sk ? Gi + Mk : Gi + ir;
      V = vf(V), W = vf(W);
    };
    if ([...S.targets].reverse().forEach((Se) => {
      const Te = I.doc.nodeAt(Se.pos);
      if (!Te) return;
      if (Te.type === D) {
        if (T === "left") {
          if (Te.childCount !== 1) return;
          const ir = Te.child(0);
          he(Se.pos, Te.nodeSize, ir.nodeSize, -1), I = I.replaceWith(Se.pos, Se.pos + Te.nodeSize, ir), $ = !0;
          return;
        }
        if (Te.attrs.alignment === T) return;
        I = I.setNodeMarkup(Se.pos, D, {
          alignment: T,
          sourceSyntax: "github-div-align"
        }), $ = !0;
        return;
      }
      if (T === "left") return;
      const lt = D.create({
        alignment: T,
        sourceSyntax: "github-div-align"
      }, Te);
      he(Se.pos, Te.nodeSize, lt.nodeSize, 1), I = I.replaceWith(Se.pos, Se.pos + Te.nodeSize, lt), $ = !0;
    }), !$) return !1;
    const me = I.doc.content.size, Ce = Math.max(0, Math.min(V, me)), Ie = Math.max(0, Math.min(W, me));
    return I = I.setSelection(Y.between(
      I.doc.resolve(Ce),
      I.doc.resolve(Ie)
    )), I = Ms(I), k.dispatch(I.scrollIntoView()), De(), k.focus(), Re(), Le(), Ue(), vt(), !0;
  }
  function uk(m) {
    const k = fe(), y = k == null ? void 0 : k.state.schema.marks[m];
    return y ? tr(Yo(y)) : !1;
  }
  function ms() {
    var m;
    F && ((m = F.querySelector(".markdown-format-link-popover")) == null || m.classList.remove("open"), K = null);
  }
  function ck() {
    const m = fe(), k = m == null ? void 0 : m.state.selection;
    if (!F || !m || !k || k.empty) return !1;
    K = { from: k.from, to: k.to };
    const y = F.querySelector(".markdown-format-link-popover"), S = F.querySelector("[data-format-link-input]");
    return !y || !S ? !1 : (y.classList.add("open"), S.value = "", window.setTimeout(() => S.focus(), 0), !0);
  }
  function xf(m) {
    const k = String(m || "").trim();
    if (!k) return !1;
    const y = fe(), S = y == null ? void 0 : y.state.schema.marks.link;
    if (!y || !S || !K) return !1;
    const T = Math.max(0, Math.min(K.from, y.state.doc.content.size)), D = Math.max(T, Math.min(K.to, y.state.doc.content.size)), I = y.state.tr.setSelection(Y.create(y.state.doc, T, D)).addMark(T, D, S.create({ href: k }));
    return y.dispatch(I.scrollIntoView()), De(), y.focus(), ms(), Re(), Le(), !0;
  }
  function fk() {
    const m = fe(), k = m == null ? void 0 : m.state.schema.marks.link, y = m == null ? void 0 : m.state.selection;
    if (!m || !k || !y || y.empty) return !1;
    const S = m.state.tr.removeMark(y.from, y.to, k);
    return m.dispatch(S.scrollIntoView()), De(), m.focus(), ms(), Re(), Le(), !0;
  }
  function hk(m) {
    const k = fe();
    if (!k) return !1;
    const { nodes: y } = k.state.schema;
    if (m === "paragraph")
      return y.paragraph ? tr(kn(y.paragraph)) : !1;
    const S = Number(String(m || "").replace("h", ""));
    return !y.heading || !Number.isFinite(S) ? !1 : tr(kn(y.heading, { level: S }));
  }
  function dk(m, k) {
    const y = m == null ? void 0 : m.state.schema.marks[k];
    if (!m || !y) return !1;
    const { from: S, to: T, empty: D, $from: I } = m.state.selection;
    return D ? !!y.isInSet(m.state.storedMarks || I.marks()) : m.state.doc.rangeHasMark(S, T, y);
  }
  function pk(m) {
    var y;
    if (!m) return "paragraph";
    const { $from: k } = m.state.selection;
    for (let S = k.depth; S > 0; S -= 1) {
      const T = k.node(S);
      if (T.type.name === "heading")
        return `h${((y = T.attrs) == null ? void 0 : y.level) || 1}`;
      if (T.type.name === "paragraph")
        return "paragraph";
    }
    return "paragraph";
  }
  function mk() {
    var S, T, D;
    const m = document.createElement("div");
    m.className = "markdown-format-toolbar", m.setAttribute("aria-label", h("markdown.formatTools")), m.innerHTML = `
      <label class="markdown-format-heading-wrap">
        <select class="markdown-format-heading" aria-label="${h("markdown.headingLevel")}">
          <option value="paragraph">正文</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
          <option value="h4">H4</option>
        </select>
        <svg class="markdown-format-heading-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.2 4.5 6 7.3l2.8-2.8" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </label>
      <button type="button" data-format-command="bold" aria-label="${h("markdown.bold")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4h4.3c2 0 3.2 1 3.2 2.6 0 1.1-.6 1.9-1.5 2.2 1.3.3 2.1 1.3 2.1 2.7 0 1.9-1.4 3.2-3.6 3.2H6V4Zm2.2 4h1.9c.8 0 1.2-.4 1.2-1.1 0-.7-.5-1.1-1.3-1.1H8.2V8Zm0 5h2.1c.9 0 1.5-.5 1.5-1.3 0-.9-.6-1.3-1.6-1.3h-2V13Z" fill="currentColor"/></svg>
        <span class="markdown-format-tooltip">⌘B</span>
      </button>
      <button type="button" data-format-command="italic" aria-label="${h("markdown.italic")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M9.1 4h6l-.3 1.7h-1.9l-1.8 8.6H13L12.7 16h-6l.3-1.7h1.9l1.8-8.6H8.8L9.1 4Z" fill="currentColor"/></svg>
        <span class="markdown-format-tooltip">⌘I</span>
      </button>
      <button type="button" data-format-command="code" aria-label="${h("markdown.inlineCode")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.2 6.4-3.3 3.5 3.3 3.5M12.8 6.4l3.3 3.5-3.3 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="markdown-format-tooltip">⌘E</span>
      </button>
      <button type="button" data-format-command="strike" aria-label="${h("markdown.strike")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10M7.1 13.3c.6 1 1.7 1.6 3.1 1.6 1.8 0 3-.9 3-2.2 0-1.1-.7-1.8-2.3-2.2l-1.8-.5C7.5 9.6 6.7 8.8 6.7 7.5c0-1.6 1.4-2.7 3.3-2.7 1.5 0 2.6.6 3.2 1.7" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>
        <span class="markdown-format-tooltip">⌥⌘X</span>
      </button>
      <button type="button" data-format-command="link" aria-label="${h("markdown.addLink")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.2 6.7 9.4 5.5a3.3 3.3 0 0 1 4.7 4.7l-1.6 1.6a3.3 3.3 0 0 1-4.5.2M11.8 13.3l-1.2 1.2a3.3 3.3 0 0 1-4.7-4.7l1.6-1.6a3.3 3.3 0 0 1 4.5-.2" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="markdown-format-tooltip">${h("markdown.linkTooltip")}</span>
      </button>
      <span class="markdown-format-divider" aria-hidden="true"></span>
      <button type="button" data-text-align="left" aria-label="${h("markdown.alignLeft")}">
        ${Ur.left}
        <span class="markdown-format-tooltip">${h("markdown.alignLeft")}</span>
      </button>
      <button type="button" data-text-align="center" aria-label="${h("markdown.alignCenter")}">
        ${Ur.center}
        <span class="markdown-format-tooltip">${h("markdown.alignCenter")}</span>
      </button>
      <button type="button" data-text-align="right" aria-label="${h("markdown.alignRight")}">
        ${Ur.right}
        <span class="markdown-format-tooltip">${h("markdown.alignRight")}</span>
      </button>
      <div class="markdown-format-link-popover" aria-hidden="true">
        <input data-format-link-input type="text" placeholder="粘贴链接或文件路径" />
        <button type="button" data-format-link-apply>确认</button>
      </div>
    `;
    const k = {
      bold: "strong",
      italic: "emphasis",
      code: "inlineCode",
      strike: "strike_through"
    };
    m.addEventListener("mousedown", (I) => {
      I.target.closest("select") || I.target.closest("input") || I.preventDefault();
    }), m.addEventListener("pointerdown", (I) => {
      const $ = I.target.closest("button[data-text-align]");
      $ && (I.preventDefault(), I.stopPropagation(), $.getAttribute("aria-disabled") !== "true" && wf($.dataset.textAlign || "left"));
    }), m.addEventListener("click", (I) => {
      const $ = I.target.closest("button[data-text-align]");
      if ($) {
        I.preventDefault(), I.stopPropagation(), I.detail === 0 && $.getAttribute("aria-disabled") !== "true" && wf($.dataset.textAlign || "left");
        return;
      }
      const V = I.target.closest("button[data-format-command]");
      if (!(!V || V.getAttribute("aria-disabled") === "true")) {
        if (I.preventDefault(), I.stopPropagation(), V.dataset.formatCommand === "link") {
          if (V.classList.contains("active")) {
            fk();
            return;
          }
          ck();
          return;
        }
        uk(k[V.dataset.formatCommand]);
      }
    }), (S = m.querySelector("[data-format-link-apply]")) == null || S.addEventListener("click", (I) => {
      I.preventDefault(), I.stopPropagation();
      const $ = m.querySelector("[data-format-link-input]");
      xf($ == null ? void 0 : $.value);
    }), (T = m.querySelector("[data-format-link-input]")) == null || T.addEventListener("keydown", (I) => {
      var $;
      I.key === "Enter" && (I.preventDefault(), I.stopPropagation(), xf(I.currentTarget.value)), I.key === "Escape" && (I.preventDefault(), I.stopPropagation(), ms(), ($ = fe()) == null || $.focus());
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
    ].forEach((I) => {
      y == null || y.addEventListener(I, ($) => $.stopPropagation());
    }), (D = m.querySelector("select")) == null || D.addEventListener("change", (I) => {
      hk(I.target.value);
    }), m;
  }
  function gk() {
    F || (F = mk(), t.appendChild(F), ["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
      t.addEventListener(m, Re, !0);
    }), document.addEventListener("selectionchange", Re), window.addEventListener("scroll", Re, !0), window.addEventListener("resize", Re), t.addEventListener("focusout", Cf, !0));
  }
  function Ji() {
    F && (ms(), F.classList.remove("visible"), N = !1, U = null);
  }
  function Cf() {
    window.setTimeout(() => {
      const m = document.activeElement;
      !t.contains(m) && !(F != null && F.contains(m)) && Ji();
    }, 0);
  }
  function yk(m) {
    if (!F || !m) return;
    Object.entries({
      bold: "strong",
      italic: "emphasis",
      code: "inlineCode",
      strike: "strike_through",
      link: "link"
    }).forEach(([V, W]) => {
      const he = F.querySelector(`[data-format-command="${V}"]`);
      if (!he) return;
      const me = !!m.state.schema.marks[W];
      he.classList.toggle("active", me && dk(m, W)), he.setAttribute("aria-disabled", me ? "false" : "true");
    });
    const y = F.querySelector('[data-format-command="link"]'), S = y == null ? void 0 : y.querySelector(".markdown-format-tooltip"), T = !!(y != null && y.classList.contains("active"));
    y == null || y.setAttribute("aria-label", h(T ? "markdown.removeLink" : "markdown.addLink")), S && (S.textContent = h(T ? "actions.remove" : "markdown.linkTooltip"));
    const D = F.querySelector("select");
    D && (D.value = pk(m));
    const I = bf(m), $ = Hd(m.state, I);
    F.querySelectorAll("button[data-text-align]").forEach((V) => {
      const W = $.supported, he = V.dataset.textAlign;
      V.classList.toggle("active", W && $.alignment === he), V.setAttribute("aria-disabled", W ? "false" : "true");
      const me = V.querySelector(".markdown-format-tooltip");
      me && (me.textContent = W ? V.getAttribute("aria-label") || "" : h("markdown.textAlignBlockOnly"));
    });
  }
  function kk() {
    if (J = null, !F || !P || Vr()) return;
    const m = fe(), k = m == null ? void 0 : m.state.selection;
    if (!m || !k || k.empty || !t.contains(m.dom)) {
      Ji();
      return;
    }
    if (Pe(m.state)) {
      Ji();
      return;
    }
    if (!m.state.doc.textBetween(k.from, k.to, " ").trim()) {
      Ji();
      return;
    }
    U = {
      anchor: k.anchor,
      head: k.head
    }, yk(m);
    const S = t.getBoundingClientRect();
    let T = null, D = null;
    try {
      T = m.coordsAtPos(k.from), D = m.coordsAtPos(k.to);
    } catch {
      Ji();
      return;
    }
    const I = F.offsetWidth || 352, $ = F.offsetHeight || 38, V = Math.min(T.left, D.left), W = Math.max(T.right || T.left, D.right || D.left), he = Math.min(T.top, D.top), me = Math.max(T.bottom || T.top, D.bottom || D.top), Ce = (V + W) / 2, Ie = Math.max(8, Math.min(Ce - S.left - I / 2, S.width - I - 8));
    let Se = he - S.top - $ - 10;
    Se < 8 && (Se = me - S.top + 10), F.style.left = `${Math.round(Ie)}px`, F.style.top = `${Math.round(Se)}px`, N || (F.classList.add("visible"), N = !0);
  }
  function Re() {
    F && (J && cancelAnimationFrame(J), J = requestAnimationFrame(kk));
  }
  function bk(m) {
    if (!s) return !1;
    const k = fe();
    if (!k || !Pe(k.state)) return !1;
    const y = m(k.state, k.dispatch, k);
    return y && (De(), k.focus(), Le()), y;
  }
  function wk() {
    const m = document.createElement("div");
    m.className = "markdown-table-toolbar", m.setAttribute("aria-label", h("markdown.tableTools"));
    const k = {
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
      ${Object.keys(y).map((T) => `
        <button type="button" data-table-command="${T}" aria-label="${y[T]}">
          ${k[T]}
          <span class="markdown-table-tooltip">${y[T]}</span>
        </button>
      `).join("")}
    `;
    const S = {
      "row-before": XM,
      "row-after": ZM,
      "column-before": Wg,
      "column-after": qg,
      "delete-row": Jg,
      "delete-column": Kg
    };
    return m.addEventListener("mousedown", (T) => {
      T.preventDefault();
    }), m.addEventListener("click", (T) => {
      const D = T.target.closest("button[data-table-command]");
      D && (T.preventDefault(), T.stopPropagation(), bk(S[D.dataset.tableCommand]));
    }), m;
  }
  function Sf() {
    !s || ne || (ne = wk(), t.appendChild(ne), ["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
      t.addEventListener(m, Le, !0);
    }), window.addEventListener("scroll", Le, !0), window.addEventListener("resize", Le));
  }
  function Mf() {
    de && (cancelAnimationFrame(de), de = null), ne && (["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
      t.removeEventListener(m, Le, !0);
    }), window.removeEventListener("scroll", Le, !0), window.removeEventListener("resize", Le), ne.remove(), ne = null, ie = !1);
  }
  function xk() {
    ne && (ne.classList.remove("visible"), ie = !1);
  }
  function Ck() {
    if (de = null, !ne || !s || !P || Vr()) return;
    const m = fe(), k = Sl(m);
    if (!k) {
      xk();
      return;
    }
    const y = t.getBoundingClientRect();
    let S = null;
    try {
      S = m.coordsAtPos(m.state.selection.from);
    } catch {
      S = k.getBoundingClientRect();
    }
    const T = ne.offsetWidth || 224, D = ne.offsetHeight || 38, I = ((S.left || 0) + (S.right || S.left || 0)) / 2, $ = Math.max(6, Math.min(I - y.left - T / 2, y.width - T - 6));
    let V = (S.top || 0) - y.top - D - 10;
    V < 6 && (V = (S.bottom || S.top || 0) - y.top + 10), ne.style.left = `${Math.round($)}px`, ne.style.top = `${Math.round(V)}px`, ie || (ne.classList.add("visible"), ie = !0);
  }
  function Le() {
    !s || !ne || (de && cancelAnimationFrame(de), de = requestAnimationFrame(Ck));
  }
  function Tl(m) {
    if (M) return !1;
    const k = Ke.action((y) => {
      const S = y.get(Ae), T = m(S.state, S.dispatch, S);
      return T && (S.focus(), Re(), Le(), Ue(), vt()), T;
    });
    return k && (pe && (clearTimeout(pe), pe = null), Ki()), k;
  }
  const Nl = {
    editor: Ke,
    getMarkdown() {
      pe && (clearTimeout(pe), pe = null);
      const m = _r();
      return jt = m, m;
    },
    getBaselineMarkdown() {
      return qi;
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
      return M ? !1 : Ke.action((k) => {
        const y = k.get(Ae);
        if (!y || y.composing || st.some((Ce) => Ce.kind === "duplicate"))
          return !1;
        const S = y.state, T = WI(S, m);
        if (!T || !S.schema.nodes[Di]) return !1;
        const I = Na(S), $ = T.blockStart, V = T.blockEnd;
        let W = S.tr, he = V;
        if (I) {
          const Ce = I.pos, Ie = I.pos + I.node.nodeSize;
          Ce < $ ? (W = W.replaceWith($, V, Ia(S.schema, T.attrs)), W = W.replaceWith(Ce, Ie, Aa(S.schema, I.node.attrs))) : (W = W.replaceWith(Ce, Ie, Aa(S.schema, I.node.attrs)), W = W.replaceWith($, V, Ia(S.schema, T.attrs))), he = W.mapping.map(V);
        } else
          W = W.replaceWith($, V, Ia(S.schema, T.attrs));
        const me = Math.max(1, Math.min(he, W.doc.content.size));
        return W.setSelection(Y.near(W.doc.resolve(me), 1)), y.dispatch(Ms(W.scrollIntoView())), De(), y.focus(), Re(), Le(), Ue(), !0;
      });
    },
    /**
     * 取消当前封面：仅移除 marker/wrapper，图片原地保留为普通正文。
     * @returns {boolean} 是否已提交
     */
    removeCover() {
      return M ? !1 : Ke.action((m) => {
        const k = m.get(Ae);
        if (!k || k.composing || st.some((I) => I.kind === "duplicate"))
          return !1;
        const y = Na(k.state);
        if (!y) return !1;
        const S = Aa(k.state.schema, y.node.attrs);
        let T = k.state.tr.replaceWith(
          y.pos,
          y.pos + y.node.nodeSize,
          S
        );
        const D = Math.max(1, Math.min(y.pos + S.nodeSize, T.doc.content.size));
        return T.setSelection(Y.near(T.doc.resolve(D), 1)), k.dispatch(Ms(T.scrollIntoView())), De(), k.focus(), Re(), Le(), Ue(), !0;
      });
    },
    /**
     * 读取当前封面身份与结构化诊断。
     * @returns {{hasCover:boolean, valid:boolean, duplicate:boolean,
     *   diagnostics:Array<{kind:string,count?:number}>, nodeKind:string|null,
     *   pos:number|null, src:string|null}}
     */
    getCoverState() {
      return M ? { hasCover: !1, valid: !1, duplicate: !1, diagnostics: [], nodeKind: null, pos: null, src: null } : Ke.action((m) => {
        const k = m.get(Ae), y = Na(k.state), S = st.some((T) => T.kind === "duplicate");
        return {
          hasCover: !!y,
          valid: !!y && !S,
          duplicate: S,
          diagnostics: st.map((T) => ({ ...T })),
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
      return M ? [] : Ke.action((m) => {
        const k = m.get(Ae), y = [];
        return k.state.doc.descendants((S, T) => {
          var D;
          if (S.type.name === tt && ((D = S.attrs) != null && D.src))
            return y.push({ pos: T, nodeKind: "portable-image", src: String(S.attrs.src), alt: String(S.attrs.alt || "") }), !0;
          if (S.type.name === "paragraph" && S.childCount === 1) {
            const I = S.firstChild;
            if (I.type.name === "image") {
              const $ = Yy(I);
              y.push({
                pos: T,
                nodeKind: $ ? "linked-image" : "image",
                src: String(I.attrs.src || ""),
                alt: String(I.attrs.alt || "")
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
      if (M) return !1;
      const k = String(m || "").trim();
      return k ? Ke.action((y) => {
        const S = y.get(Ae);
        if (!S || S.composing)
          return !1;
        const T = S.state, { doc: D } = T, I = Pd(D, T.schema);
        if (I && I.node.textContent.trim() === k)
          return !1;
        let $ = T.tr;
        if (I) {
          const V = T.schema.text(k), W = I.node.type.create(I.node.attrs, V);
          $ = $.replaceWith(I.pos, I.pos + I.node.nodeSize, W);
        } else {
          const V = T.schema.nodes.heading.create({ level: 1 }, T.schema.text(k)), W = D.firstChild;
          W && W.type.name === "paragraph" && W.textContent.trim() === "" ? $ = $.replaceWith(0, W.nodeSize, V) : $ = $.insert(0, V);
        }
        return S.dispatch(Ms($)), De(), S.focus(), !0;
      }) : !1;
    },
    /**
     * 读取当前编辑器文档的权威标题（第一个有效顶层 H1 的纯文本）。
     * @returns {string|null} 无有效 H1 时返回 null
     */
    getDocumentTitle() {
      return M ? null : Ke.action((m) => {
        const k = m.get(Ae);
        if (!k)
          return null;
        const y = Pd(k.state.doc, k.state.schema);
        return y ? y.node.textContent.trim() : null;
      });
    },
    hasChanges() {
      return H || j;
    },
    setTableToolsEnabled(m) {
      M || (s = !!m, s ? (Sf(), Le()) : Mf());
    },
    undo() {
      return Tl(ko);
    },
    redo() {
      return Tl(ei);
    },
    focus() {
      M || Ke.action((m) => {
        m.get(Ae).focus();
      });
    },
    blur() {
      M || Ke.action((m) => {
        m.get(Ae).dom.blur();
      });
    },
    focusAtText(m, k = 0) {
      if (M) return !1;
      const y = $d(m);
      return y ? Ke.action((S) => {
        const T = S.get(Ae);
        let D = null;
        return T.state.doc.descendants((I, $) => {
          if (D !== null) return !1;
          if (!I.isText) return !0;
          const V = I.text || "", W = $d(V);
          if (W.indexOf(y) < 0 && !y.includes(W)) return !0;
          const me = V.indexOf(m), Ce = me >= 0 ? me : 0;
          return D = Math.max($ + 1, Math.min($ + V.length, $ + 1 + Ce + Math.max(0, k))), !1;
        }), D === null ? (T.focus(), !1) : (T.dispatch(T.state.tr.setSelection(Y.create(T.state.doc, D)).scrollIntoView()), T.focus(), !0);
      }) : (Nl.focus(), !1);
    },
    destroy() {
      M = !0, pe && (clearTimeout(pe), pe = null), J && (cancelAnimationFrame(J), J = null), F && (["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
        t.removeEventListener(m, Re, !0);
      }), document.removeEventListener("selectionchange", Re), window.removeEventListener("scroll", Re, !0), window.removeEventListener("resize", Re), t.removeEventListener("focusout", Cf, !0), F.remove(), F = null), Ze && (cancelAnimationFrame(Ze), Ze = null), ve && (["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
        t.removeEventListener(m, vt, !0);
      }), window.removeEventListener("scroll", vt, !0), window.removeEventListener("resize", vt), yt.forEach((m) => m.remove()), yt.clear(), ve.remove(), ve = null), Mf(), we && (cancelAnimationFrame(we), we = null), re && (["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
        t.removeEventListener(m, Ue, !0);
      }), t.removeEventListener("keydown", ff, !0), t.removeEventListener("pointerdown", hf, !0), window.removeEventListener("scroll", Ue, !0), window.removeEventListener("resize", Ue), t.removeEventListener("focusout", df, !0), re.remove(), re = null), Fe && (cancelAnimationFrame(Fe), Fe = null), oe && (t.removeEventListener("pointerover", yf, !0), t.removeEventListener("pointerout", kf, !0), window.removeEventListener("scroll", Wr, !0), window.removeEventListener("resize", Wr), oe.remove(), oe = null, b = null);
      for (const m of Cl)
        t.removeEventListener(m, De, !0);
      t.removeEventListener("keydown", hs, !0), Ke.destroy(), t.innerHTML = "", rl.delete(t);
    }
  };
  return rl.set(t, Nl), Nl;
}
window.NutbookMarkdownEditor = {
  create: XI,
  destroy(t) {
    Qy(t);
  },
  // 权威标题语义的静态入口（与 dist/assets/markdown-document-title.js 同一实现）。
  parseDocumentTitle: jy,
  setDocumentTitleInSource: cI
};
