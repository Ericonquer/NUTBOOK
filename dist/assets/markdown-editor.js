var Lf = (t) => {
  throw TypeError(t);
};
var Pf = (t, e, n) => e.has(t) || Lf("Cannot " + n);
var M = (t, e, n) => (Pf(t, e, "read from private field"), n ? n.call(t) : e.get(t)), K = (t, e, n) => e.has(t) ? Lf("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, n), B = (t, e, n, r) => (Pf(t, e, "write to private field"), r ? r.call(t, n) : e.set(t, n), n);
var Bt = /* @__PURE__ */ function(t) {
  return t.docTypeError = "docTypeError", t.contextNotFound = "contextNotFound", t.timerNotFound = "timerNotFound", t.ctxCallOutOfScope = "ctxCallOutOfScope", t.createNodeInParserFail = "createNodeInParserFail", t.stackOverFlow = "stackOverFlow", t.parserMatchError = "parserMatchError", t.serializerMatchError = "serializerMatchError", t.getAtomFromSchemaFail = "getAtomFromSchemaFail", t.expectDomTypeError = "expectDomTypeError", t.callCommandBeforeEditorView = "callCommandBeforeEditorView", t.missingRootElement = "missingRootElement", t.missingNodeInSchema = "missingNodeInSchema", t.missingMarkInSchema = "missingMarkInSchema", t.ctxNotBind = "ctxNotBind", t.missingYjsDoc = "missingYjsDoc", t.aiProviderError = "aiProviderError", t.aiBuildContextError = "aiBuildContextError", t;
}({}), Ft = class extends Error {
  constructor(t, e, n) {
    super(e, n), this.name = "MilkdownError", this.code = t, (n == null ? void 0 : n.cause) !== void 0 && (this.cause = n.cause);
  }
}, Vk = (t, e) => typeof e == "function" ? "[Function]" : e, ml = (t) => JSON.stringify(t, Vk);
function Hk(t) {
  return new Ft(Bt.docTypeError, `Doc type error, unsupported type: ${ml(t)}`);
}
function jk(t) {
  return new Ft(Bt.contextNotFound, `Context "${t}" not found, do you forget to inject it?`);
}
function Wk(t) {
  return new Ft(Bt.timerNotFound, `Timer "${t}" not found, do you forget to record it?`);
}
function gl() {
  return new Ft(Bt.ctxCallOutOfScope, "Should not call a context out of the plugin.");
}
function qk(t, e, n) {
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
  return new Ft(Bt.createNodeInParserFail, o.join(`
`));
}
function op() {
  return new Ft(Bt.stackOverFlow, "Stack over flow, cannot pop on an empty stack.");
}
function Kk(t) {
  return new Ft(Bt.parserMatchError, `Cannot match target parser for node: ${ml(t)}.`);
}
function Uk(t) {
  return new Ft(Bt.serializerMatchError, `Cannot match target serializer for node: ${ml(t)}.`);
}
function en(t) {
  return new Ft(Bt.expectDomTypeError, `Expect to be a dom, but get: ${ml(t)}.`);
}
function Bl() {
  return new Ft(Bt.callCommandBeforeEditorView, "You're trying to call a command before editor view initialized, make sure to get commandManager from ctx after editor view has been initialized");
}
function Jk(t) {
  return new Ft(Bt.missingNodeInSchema, `Missing node in schema, milkdown cannot find "${t}" in schema.`);
}
function Gk(t) {
  return new Ft(Bt.missingMarkInSchema, `Missing mark in schema, milkdown cannot find "${t}" in schema.`);
}
var sp = class {
  constructor() {
    this.sliceMap = /* @__PURE__ */ new Map(), this.get = (t) => {
      const e = typeof t == "string" ? [...this.sliceMap.values()].find((n) => n.type.name === t) : this.sliceMap.get(t.id);
      if (!e) throw jk(typeof t == "string" ? t : t.name);
      return e;
    }, this.remove = (t) => {
      const e = typeof t == "string" ? [...this.sliceMap.values()].find((n) => n.type.name === t) : this.sliceMap.get(t.id);
      e && this.sliceMap.delete(e.type.id);
    }, this.has = (t) => typeof t == "string" ? [...this.sliceMap.values()].some((e) => e.type.name === t) : this.sliceMap.has(t.id);
  }
}, Vt, pn, ci, ep, Yk = (ep = class {
  constructor(e, n, r) {
    K(this, Vt);
    K(this, pn);
    K(this, ci);
    B(this, Vt, []), B(this, ci, () => {
      M(this, Vt).forEach((i) => i(M(this, pn)));
    }), this.set = (i) => {
      B(this, pn, i), M(this, ci).call(this);
    }, this.get = () => M(this, pn), this.update = (i) => {
      B(this, pn, i(M(this, pn))), M(this, ci).call(this);
    }, this.type = r, B(this, pn, n), e.set(r.id, this);
  }
  on(e) {
    return M(this, Vt).push(e), () => {
      B(this, Vt, M(this, Vt).filter((n) => n !== e));
    };
  }
  once(e) {
    const n = this.on((r) => {
      e(r), n();
    });
    return n;
  }
  off(e) {
    B(this, Vt, M(this, Vt).filter((n) => n !== e));
  }
  offAll() {
    B(this, Vt, []);
  }
}, Vt = new WeakMap(), pn = new WeakMap(), ci = new WeakMap(), ep), Qk = class {
  constructor(t, e) {
    this.id = Symbol(`Context-${e}`), this.name = e, this._defaultValue = t, this._typeInfo = () => {
      throw gl();
    };
  }
  create(t, e = this._defaultValue) {
    return new Yk(t, e, this);
  }
}, ue = (t, e) => new Qk(t, e), Bo, Fo, $o, br, fi, Wn, di, hi, pi, tp, Xk = (tp = class {
  constructor(t, e, n) {
    K(this, Bo);
    K(this, Fo);
    K(this, $o);
    K(this, br);
    K(this, fi);
    K(this, Wn);
    K(this, di);
    K(this, hi);
    K(this, pi);
    B(this, br, /* @__PURE__ */ new Set()), B(this, fi, /* @__PURE__ */ new Set()), B(this, Wn, /* @__PURE__ */ new Map()), B(this, di, /* @__PURE__ */ new Map()), this.read = () => ({
      metadata: M(this, Bo),
      injectedSlices: [...M(this, br)].map((r) => ({
        name: typeof r == "string" ? r : r.name,
        value: M(this, hi).call(this, r)
      })),
      consumedSlices: [...M(this, fi)].map((r) => ({
        name: typeof r == "string" ? r : r.name,
        value: M(this, hi).call(this, r)
      })),
      recordedTimers: [...M(this, Wn)].map(([r, { duration: i }]) => ({
        name: r.name,
        duration: i,
        status: M(this, pi).call(this, r)
      })),
      waitTimers: [...M(this, di)].map(([r, { duration: i }]) => ({
        name: r.name,
        duration: i,
        status: M(this, pi).call(this, r)
      }))
    }), this.onRecord = (r) => {
      M(this, Wn).set(r, {
        start: Date.now(),
        duration: 0
      });
    }, this.onClear = (r) => {
      M(this, Wn).delete(r);
    }, this.onDone = (r) => {
      const i = M(this, Wn).get(r);
      i && (i.duration = Date.now() - i.start);
    }, this.onWait = (r, i) => {
      const o = Date.now();
      i.finally(() => {
        M(this, di).set(r, { duration: Date.now() - o });
      }).catch(console.error);
    }, this.onInject = (r) => {
      M(this, br).add(r);
    }, this.onRemove = (r) => {
      M(this, br).delete(r);
    }, this.onUse = (r) => {
      M(this, fi).add(r);
    }, B(this, hi, (r) => M(this, Fo).get(r).get()), B(this, pi, (r) => M(this, $o).get(r).status), B(this, Fo, t), B(this, $o, e), B(this, Bo, n);
  }
}, Bo = new WeakMap(), Fo = new WeakMap(), $o = new WeakMap(), br = new WeakMap(), fi = new WeakMap(), Wn = new WeakMap(), di = new WeakMap(), hi = new WeakMap(), pi = new WeakMap(), tp), mn, gn, _o, Et, mi, Zk = (mi = class {
  constructor(e, n, r) {
    K(this, mn);
    K(this, gn);
    K(this, _o);
    K(this, Et);
    this.produce = (i) => i && Object.keys(i).length ? new mi(M(this, mn), M(this, gn), { ...i }) : this, this.inject = (i, o) => {
      var l;
      const s = i.create(M(this, mn).sliceMap);
      return o != null && s.set(o), (l = M(this, Et)) == null || l.onInject(i), this;
    }, this.remove = (i) => {
      var o;
      return M(this, mn).remove(i), (o = M(this, Et)) == null || o.onRemove(i), this;
    }, this.record = (i) => {
      var o;
      return i.create(M(this, gn).store), (o = M(this, Et)) == null || o.onRecord(i), this;
    }, this.clearTimer = (i) => {
      var o;
      return M(this, gn).remove(i), (o = M(this, Et)) == null || o.onClear(i), this;
    }, this.isInjected = (i) => M(this, mn).has(i), this.isRecorded = (i) => M(this, gn).has(i), this.use = (i) => {
      var o;
      return (o = M(this, Et)) == null || o.onUse(i), M(this, mn).get(i);
    }, this.get = (i) => this.use(i).get(), this.set = (i, o) => this.use(i).set(o), this.update = (i, o) => this.use(i).update(o), this.timer = (i) => M(this, gn).get(i), this.done = (i) => {
      var o;
      this.timer(i).done(), (o = M(this, Et)) == null || o.onDone(i);
    }, this.wait = (i) => {
      var s;
      const o = this.timer(i).start();
      return (s = M(this, Et)) == null || s.onWait(i, o), o;
    }, this.waitTimers = async (i) => {
      await Promise.all(this.get(i).map((o) => this.wait(o)));
    }, B(this, mn, e), B(this, gn, n), B(this, _o, r), r && B(this, Et, new Xk(e, n, r));
  }
  get meta() {
    return M(this, _o);
  }
  get inspector() {
    return M(this, Et);
  }
}, mn = new WeakMap(), gn = new WeakMap(), _o = new WeakMap(), Et = new WeakMap(), mi), e1 = class {
  constructor() {
    this.store = /* @__PURE__ */ new Map(), this.get = (t) => {
      const e = this.store.get(t.id);
      if (!e) throw Wk(t.name);
      return e;
    }, this.remove = (t) => {
      this.store.delete(t.id);
    }, this.has = (t) => this.store.has(t.id);
  }
}, gi, qn, yi, yn, ki, Vo, np, t1 = (np = class {
  constructor(t, e) {
    K(this, gi);
    K(this, qn);
    K(this, yi);
    K(this, yn);
    K(this, ki);
    K(this, Vo);
    B(this, gi, null), B(this, qn, null), B(this, yn, "pending"), this.start = () => (M(this, gi) ?? B(this, gi, new Promise((n, r) => {
      B(this, qn, (i) => {
        i instanceof CustomEvent && i.detail.id === M(this, yi) && (B(this, yn, "resolved"), M(this, ki).call(this), i.stopImmediatePropagation(), n());
      }), M(this, Vo).call(this, () => {
        M(this, yn) === "pending" && B(this, yn, "rejected"), M(this, ki).call(this), r(/* @__PURE__ */ new Error(`Timing ${this.type.name} timeout.`));
      }), B(this, yn, "pending"), addEventListener(this.type.name, M(this, qn));
    })), M(this, gi)), this.done = () => {
      const n = new CustomEvent(this.type.name, { detail: { id: M(this, yi) } });
      dispatchEvent(n);
    }, B(this, ki, () => {
      M(this, qn) && removeEventListener(this.type.name, M(this, qn));
    }), B(this, Vo, (n) => {
      setTimeout(() => {
        n();
      }, this.type.timeout);
    }), B(this, yi, Symbol(e.name)), this.type = e, t.set(e.id, this);
  }
  get status() {
    return M(this, yn);
  }
}, gi = new WeakMap(), qn = new WeakMap(), yi = new WeakMap(), yn = new WeakMap(), ki = new WeakMap(), Vo = new WeakMap(), np), n1 = class {
  constructor(t, e = 3e3) {
    this.create = (n) => new t1(n, this), this.id = Symbol(`Timer-${t}`), this.name = t, this.timeout = e;
  }
}, tn = (t, e = 3e3) => new n1(t, e);
const r1 = {};
function Iu(t, e) {
  const n = r1, r = typeof n.includeImageAlt == "boolean" ? n.includeImageAlt : !0, i = typeof n.includeHtml == "boolean" ? n.includeHtml : !0;
  return lp(t, r, i);
}
function lp(t, e, n) {
  if (i1(t)) {
    if ("value" in t)
      return t.type === "html" && !n ? "" : t.value;
    if (e && "alt" in t && t.alt)
      return t.alt;
    if ("children" in t)
      return zf(t.children, e, n);
  }
  return Array.isArray(t) ? zf(t, e, n) : "";
}
function zf(t, e, n) {
  const r = [];
  let i = -1;
  for (; ++i < t.length; )
    r[i] = lp(t[i], e, n);
  return r.join("");
}
function i1(t) {
  return !!(t && typeof t == "object");
}
const Bf = document.createElement("i");
function Au(t) {
  const e = "&" + t + ";";
  Bf.innerHTML = e;
  const n = Bf.textContent;
  return n.charCodeAt(n.length - 1) === 59 && t !== "semi" || n === e ? !1 : n;
}
function Mt(t, e, n, r) {
  const i = t.length;
  let o = 0, s;
  if (e < 0 ? e = -e > i ? 0 : i + e : e = e > i ? i : e, n = n > 0 ? n : 0, r.length < 1e4)
    s = Array.from(r), s.unshift(e, n), t.splice(...s);
  else
    for (n && t.splice(e, n); o < r.length; )
      s = r.slice(o, o + 1e4), s.unshift(e, 0), t.splice(...s), o += 1e4, e += 1e4;
}
function Rt(t, e) {
  return t.length > 0 ? (Mt(t, t.length, 0, e), t) : e;
}
const Ff = {}.hasOwnProperty;
function ap(t) {
  const e = {};
  let n = -1;
  for (; ++n < t.length; )
    o1(e, t[n]);
  return e;
}
function o1(t, e) {
  let n;
  for (n in e) {
    const i = (Ff.call(t, n) ? t[n] : void 0) || (t[n] = {}), o = e[n];
    let s;
    if (o)
      for (s in o) {
        Ff.call(i, s) || (i[s] = []);
        const l = o[s];
        s1(
          // @ts-expect-error Looks like a list.
          i[s],
          Array.isArray(l) ? l : l ? [l] : []
        );
      }
  }
}
function s1(t, e) {
  let n = -1;
  const r = [];
  for (; ++n < e.length; )
    (e[n].add === "after" ? t : r).push(e[n]);
  Mt(t, 0, 0, r);
}
function up(t, e) {
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
function Wt(t) {
  return t.replace(/[\t\n\r ]+/g, " ").replace(/^ | $/g, "").toLowerCase().toUpperCase();
}
const it = ir(/[A-Za-z]/), mt = ir(/[\dA-Za-z]/), l1 = ir(/[#-'*+\--9=?A-Z^-~]/);
function Ys(t) {
  return (
    // Special whitespace codes (which have negative values), C0 and Control
    // character DEL
    t !== null && (t < 32 || t === 127)
  );
}
const za = ir(/\d/), a1 = ir(/[\dA-Fa-f]/), u1 = ir(/[!-/:-@[-`{-~]/);
function J(t) {
  return t !== null && t < -2;
}
function we(t) {
  return t !== null && (t < 0 || t === 32);
}
function se(t) {
  return t === -2 || t === -1 || t === 32;
}
const yl = ir(new RegExp("[\\u0021-\\u002F\\u003A-\\u0040\\u005B-\\u0060\\u007B-\\u007E]")), Fr = ir(/\s/);
function ir(t) {
  return e;
  function e(n) {
    return n !== null && n > -1 && t.test(String.fromCharCode(n));
  }
}
function de(t, e, n, r) {
  const i = r ? r - 1 : Number.POSITIVE_INFINITY;
  let o = 0;
  return s;
  function s(a) {
    return se(a) ? (t.enter(n), l(a)) : e(a);
  }
  function l(a) {
    return se(a) && o++ < i ? (t.consume(a), l) : (t.exit(n), e(a));
  }
}
const c1 = {
  tokenize: f1
};
function f1(t) {
  const e = t.attempt(this.parser.constructs.contentInitial, r, i);
  let n;
  return e;
  function r(l) {
    if (l === null) {
      t.consume(l);
      return;
    }
    return t.enter("lineEnding"), t.consume(l), t.exit("lineEnding"), de(t, e, "linePrefix");
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
const d1 = {
  tokenize: h1
}, $f = {
  tokenize: p1
};
function h1(t) {
  const e = this, n = [];
  let r = 0, i, o, s;
  return l;
  function l(O) {
    if (r < n.length) {
      const W = n[r];
      return e.containerState = W[1], t.attempt(W[0].continuation, a, u)(O);
    }
    return u(O);
  }
  function a(O) {
    if (r++, e.containerState._closeFlow) {
      e.containerState._closeFlow = void 0, i && L();
      const W = e.events.length;
      let j = W, T;
      for (; j--; )
        if (e.events[j][0] === "exit" && e.events[j][1].type === "chunkFlow") {
          T = e.events[j][1].end;
          break;
        }
      w(r);
      let F = W;
      for (; F < e.events.length; )
        e.events[F][1].end = {
          ...T
        }, F++;
      return Mt(e.events, j + 1, 0, e.events.slice(W)), e.events.length = F, u(O);
    }
    return l(O);
  }
  function u(O) {
    if (r === n.length) {
      if (!i)
        return d(O);
      if (i.currentConstruct && i.currentConstruct.concrete)
        return p(O);
      e.interrupt = !!(i.currentConstruct && !i._gfmTableDynamicInterruptHack);
    }
    return e.containerState = {}, t.check($f, c, f)(O);
  }
  function c(O) {
    return i && L(), w(r), d(O);
  }
  function f(O) {
    return e.parser.lazy[e.now().line] = r !== n.length, s = e.now().offset, p(O);
  }
  function d(O) {
    return e.containerState = {}, t.attempt($f, h, p)(O);
  }
  function h(O) {
    return r++, n.push([e.currentConstruct, e.containerState]), d(O);
  }
  function p(O) {
    if (O === null) {
      i && L(), w(0), t.consume(O);
      return;
    }
    return i = i || e.parser.flow(e.now()), t.enter("chunkFlow", {
      _tokenizer: i,
      contentType: "flow",
      previous: o
    }), k(O);
  }
  function k(O) {
    if (O === null) {
      b(t.exit("chunkFlow"), !0), w(0), t.consume(O);
      return;
    }
    return J(O) ? (t.consume(O), b(t.exit("chunkFlow")), r = 0, e.interrupt = void 0, l) : (t.consume(O), k);
  }
  function b(O, W) {
    const j = e.sliceStream(O);
    if (W && j.push(null), O.previous = o, o && (o.next = O), o = O, i.defineSkip(O.start), i.write(j), e.parser.lazy[O.start.line]) {
      let T = i.events.length;
      for (; T--; )
        if (
          // The token starts before the line ending…
          i.events[T][1].start.offset < s && // …and either is not ended yet…
          (!i.events[T][1].end || // …or ends after it.
          i.events[T][1].end.offset > s)
        )
          return;
      const F = e.events.length;
      let U = F, G, N;
      for (; U--; )
        if (e.events[U][0] === "exit" && e.events[U][1].type === "chunkFlow") {
          if (G) {
            N = e.events[U][1].end;
            break;
          }
          G = !0;
        }
      for (w(r), T = F; T < e.events.length; )
        e.events[T][1].end = {
          ...N
        }, T++;
      Mt(e.events, U + 1, 0, e.events.slice(F)), e.events.length = T;
    }
  }
  function w(O) {
    let W = n.length;
    for (; W-- > O; ) {
      const j = n[W];
      e.containerState = j[1], j[0].exit.call(e, t);
    }
    n.length = O;
  }
  function L() {
    i.write([null]), o = void 0, i = void 0, e.containerState._closeFlow = void 0;
  }
}
function p1(t, e, n) {
  return de(t, t.attempt(this.parser.constructs.document, e, n), "linePrefix", this.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4);
}
function Ei(t) {
  if (t === null || we(t) || Fr(t))
    return 1;
  if (yl(t))
    return 2;
}
function kl(t, e, n) {
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
  resolveAll: m1,
  tokenize: g1
};
function m1(t, e) {
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
          _f(f, -a), _f(d, a), s = {
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
          }, u = [], t[r][1].end.offset - t[r][1].start.offset && (u = Rt(u, [["enter", t[r][1], e], ["exit", t[r][1], e]])), u = Rt(u, [["enter", i, e], ["enter", s, e], ["exit", s, e], ["enter", o, e]]), u = Rt(u, kl(e.parser.constructs.insideSpan.null, t.slice(r + 1, n), e)), u = Rt(u, [["exit", o, e], ["enter", l, e], ["exit", l, e], ["exit", i, e]]), t[n][1].end.offset - t[n][1].start.offset ? (c = 2, u = Rt(u, [["enter", t[n][1], e], ["exit", t[n][1], e]])) : c = 0, Mt(t, r - 1, n - r + 3, u), n = r + u.length - c - 2;
          break;
        }
    }
  for (n = -1; ++n < t.length; )
    t[n][1].type === "attentionSequence" && (t[n][1].type = "data");
  return t;
}
function g1(t, e) {
  const n = this.parser.constructs.attentionMarkers.null, r = this.previous, i = Ei(r);
  let o;
  return s;
  function s(a) {
    return o = a, t.enter("attentionSequence"), l(a);
  }
  function l(a) {
    if (a === o)
      return t.consume(a), l;
    const u = t.exit("attentionSequence"), c = Ei(a), f = !c || c === 2 && i || n.includes(a), d = !i || i === 2 && c || n.includes(r);
    return u._open = !!(o === 42 ? f : f && (i || !d)), u._close = !!(o === 42 ? d : d && (c || !f)), e(a);
  }
}
function _f(t, e) {
  t.column += e, t.offset += e, t._bufferIndex += e;
}
const y1 = {
  name: "autolink",
  tokenize: k1
};
function k1(t, e, n) {
  let r = 0;
  return i;
  function i(h) {
    return t.enter("autolink"), t.enter("autolinkMarker"), t.consume(h), t.exit("autolinkMarker"), t.enter("autolinkProtocol"), o;
  }
  function o(h) {
    return it(h) ? (t.consume(h), s) : h === 64 ? n(h) : u(h);
  }
  function s(h) {
    return h === 43 || h === 45 || h === 46 || mt(h) ? (r = 1, l(h)) : u(h);
  }
  function l(h) {
    return h === 58 ? (t.consume(h), r = 0, a) : (h === 43 || h === 45 || h === 46 || mt(h)) && r++ < 32 ? (t.consume(h), l) : (r = 0, u(h));
  }
  function a(h) {
    return h === 62 ? (t.exit("autolinkProtocol"), t.enter("autolinkMarker"), t.consume(h), t.exit("autolinkMarker"), t.exit("autolink"), e) : h === null || h === 32 || h === 60 || Ys(h) ? n(h) : (t.consume(h), a);
  }
  function u(h) {
    return h === 64 ? (t.consume(h), c) : l1(h) ? (t.consume(h), u) : n(h);
  }
  function c(h) {
    return mt(h) ? f(h) : n(h);
  }
  function f(h) {
    return h === 46 ? (t.consume(h), r = 0, c) : h === 62 ? (t.exit("autolinkProtocol").type = "autolinkEmail", t.enter("autolinkMarker"), t.consume(h), t.exit("autolinkMarker"), t.exit("autolink"), e) : d(h);
  }
  function d(h) {
    if ((h === 45 || mt(h)) && r++ < 63) {
      const p = h === 45 ? d : f;
      return t.consume(h), p;
    }
    return n(h);
  }
}
const ts = {
  partial: !0,
  tokenize: b1
};
function b1(t, e, n) {
  return r;
  function r(o) {
    return se(o) ? de(t, i, "linePrefix")(o) : i(o);
  }
  function i(o) {
    return o === null || J(o) ? e(o) : n(o);
  }
}
const cp = {
  continuation: {
    tokenize: x1
  },
  exit: C1,
  name: "blockQuote",
  tokenize: w1
};
function w1(t, e, n) {
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
    return se(s) ? (t.enter("blockQuotePrefixWhitespace"), t.consume(s), t.exit("blockQuotePrefixWhitespace"), t.exit("blockQuotePrefix"), e) : (t.exit("blockQuotePrefix"), e(s));
  }
}
function x1(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return se(s) ? de(t, o, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(s) : o(s);
  }
  function o(s) {
    return t.attempt(cp, e, n)(s);
  }
}
function C1(t) {
  t.exit("blockQuote");
}
const fp = {
  name: "characterEscape",
  tokenize: S1
};
function S1(t, e, n) {
  return r;
  function r(o) {
    return t.enter("characterEscape"), t.enter("escapeMarker"), t.consume(o), t.exit("escapeMarker"), i;
  }
  function i(o) {
    return u1(o) ? (t.enter("characterEscapeValue"), t.consume(o), t.exit("characterEscapeValue"), t.exit("characterEscape"), e) : n(o);
  }
}
const dp = {
  name: "characterReference",
  tokenize: v1
};
function v1(t, e, n) {
  const r = this;
  let i = 0, o, s;
  return l;
  function l(f) {
    return t.enter("characterReference"), t.enter("characterReferenceMarker"), t.consume(f), t.exit("characterReferenceMarker"), a;
  }
  function a(f) {
    return f === 35 ? (t.enter("characterReferenceMarkerNumeric"), t.consume(f), t.exit("characterReferenceMarkerNumeric"), u) : (t.enter("characterReferenceValue"), o = 31, s = mt, c(f));
  }
  function u(f) {
    return f === 88 || f === 120 ? (t.enter("characterReferenceMarkerHexadecimal"), t.consume(f), t.exit("characterReferenceMarkerHexadecimal"), t.enter("characterReferenceValue"), o = 6, s = a1, c) : (t.enter("characterReferenceValue"), o = 7, s = za, c(f));
  }
  function c(f) {
    if (f === 59 && i) {
      const d = t.exit("characterReferenceValue");
      return s === mt && !Au(r.sliceSerialize(d)) ? n(f) : (t.enter("characterReferenceMarker"), t.consume(f), t.exit("characterReferenceMarker"), t.exit("characterReference"), e);
    }
    return s(f) && i++ < o ? (t.consume(f), c) : n(f);
  }
}
const Vf = {
  partial: !0,
  tokenize: T1
}, Hf = {
  concrete: !0,
  name: "codeFenced",
  tokenize: M1
};
function M1(t, e, n) {
  const r = this, i = {
    partial: !0,
    tokenize: j
  };
  let o = 0, s = 0, l;
  return a;
  function a(T) {
    return u(T);
  }
  function u(T) {
    const F = r.events[r.events.length - 1];
    return o = F && F[1].type === "linePrefix" ? F[2].sliceSerialize(F[1], !0).length : 0, l = T, t.enter("codeFenced"), t.enter("codeFencedFence"), t.enter("codeFencedFenceSequence"), c(T);
  }
  function c(T) {
    return T === l ? (s++, t.consume(T), c) : s < 3 ? n(T) : (t.exit("codeFencedFenceSequence"), se(T) ? de(t, f, "whitespace")(T) : f(T));
  }
  function f(T) {
    return T === null || J(T) ? (t.exit("codeFencedFence"), r.interrupt ? e(T) : t.check(Vf, k, W)(T)) : (t.enter("codeFencedFenceInfo"), t.enter("chunkString", {
      contentType: "string"
    }), d(T));
  }
  function d(T) {
    return T === null || J(T) ? (t.exit("chunkString"), t.exit("codeFencedFenceInfo"), f(T)) : se(T) ? (t.exit("chunkString"), t.exit("codeFencedFenceInfo"), de(t, h, "whitespace")(T)) : T === 96 && T === l ? n(T) : (t.consume(T), d);
  }
  function h(T) {
    return T === null || J(T) ? f(T) : (t.enter("codeFencedFenceMeta"), t.enter("chunkString", {
      contentType: "string"
    }), p(T));
  }
  function p(T) {
    return T === null || J(T) ? (t.exit("chunkString"), t.exit("codeFencedFenceMeta"), f(T)) : T === 96 && T === l ? n(T) : (t.consume(T), p);
  }
  function k(T) {
    return t.attempt(i, W, b)(T);
  }
  function b(T) {
    return t.enter("lineEnding"), t.consume(T), t.exit("lineEnding"), w;
  }
  function w(T) {
    return o > 0 && se(T) ? de(t, L, "linePrefix", o + 1)(T) : L(T);
  }
  function L(T) {
    return T === null || J(T) ? t.check(Vf, k, W)(T) : (t.enter("codeFlowValue"), O(T));
  }
  function O(T) {
    return T === null || J(T) ? (t.exit("codeFlowValue"), L(T)) : (t.consume(T), O);
  }
  function W(T) {
    return t.exit("codeFenced"), e(T);
  }
  function j(T, F, U) {
    let G = 0;
    return N;
    function N(ie) {
      return T.enter("lineEnding"), T.consume(ie), T.exit("lineEnding"), q;
    }
    function q(ie) {
      return T.enter("codeFencedFence"), se(ie) ? de(T, $, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(ie) : $(ie);
    }
    function $(ie) {
      return ie === l ? (T.enter("codeFencedFenceSequence"), ce(ie)) : U(ie);
    }
    function ce(ie) {
      return ie === l ? (G++, T.consume(ie), ce) : G >= s ? (T.exit("codeFencedFenceSequence"), se(ie) ? de(T, be, "whitespace")(ie) : be(ie)) : U(ie);
    }
    function be(ie) {
      return ie === null || J(ie) ? (T.exit("codeFencedFence"), F(ie)) : U(ie);
    }
  }
}
function T1(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return s === null ? n(s) : (t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), o);
  }
  function o(s) {
    return r.parser.lazy[r.now().line] ? n(s) : e(s);
  }
}
const Fl = {
  name: "codeIndented",
  tokenize: I1
}, N1 = {
  partial: !0,
  tokenize: A1
};
function I1(t, e, n) {
  const r = this;
  return i;
  function i(u) {
    return t.enter("codeIndented"), de(t, o, "linePrefix", 5)(u);
  }
  function o(u) {
    const c = r.events[r.events.length - 1];
    return c && c[1].type === "linePrefix" && c[2].sliceSerialize(c[1], !0).length >= 4 ? s(u) : n(u);
  }
  function s(u) {
    return u === null ? a(u) : J(u) ? t.attempt(N1, s, a)(u) : (t.enter("codeFlowValue"), l(u));
  }
  function l(u) {
    return u === null || J(u) ? (t.exit("codeFlowValue"), s(u)) : (t.consume(u), l);
  }
  function a(u) {
    return t.exit("codeIndented"), e(u);
  }
}
function A1(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return r.parser.lazy[r.now().line] ? n(s) : J(s) ? (t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), i) : de(t, o, "linePrefix", 5)(s);
  }
  function o(s) {
    const l = r.events[r.events.length - 1];
    return l && l[1].type === "linePrefix" && l[2].sliceSerialize(l[1], !0).length >= 4 ? e(s) : J(s) ? i(s) : n(s);
  }
}
const E1 = {
  name: "codeText",
  previous: D1,
  resolve: O1,
  tokenize: R1
};
function O1(t) {
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
function D1(t) {
  return t !== 96 || this.events[this.events.length - 1][1].type === "characterEscape";
}
function R1(t, e, n) {
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
class L1 {
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
    return r && no(this.left, r), o.reverse();
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
    this.setCursor(Number.POSITIVE_INFINITY), no(this.left, e);
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
    this.setCursor(0), no(this.right, e.reverse());
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
        no(this.right, n.reverse());
      } else {
        const n = this.right.splice(this.left.length + this.right.length - e, Number.POSITIVE_INFINITY);
        no(this.left, n.reverse());
      }
  }
}
function no(t, e) {
  let n = 0;
  if (e.length < 1e4)
    t.push(...e);
  else
    for (; n < e.length; )
      t.push(...e.slice(n, n + 1e4)), n += 1e4;
}
function hp(t) {
  const e = {};
  let n = -1, r, i, o, s, l, a, u;
  const c = new L1(t);
  for (; ++n < c.length; ) {
    for (; n in e; )
      n = e[n];
    if (r = c.get(n), n && r[1].type === "chunkFlow" && c.get(n - 1)[1].type === "listItemPrefix" && (a = r[1]._tokenizer.events, o = 0, o < a.length && a[o][1].type === "lineEndingBlank" && (o += 2), o < a.length && a[o][1].type === "content"))
      for (; ++o < a.length && a[o][1].type !== "content"; )
        a[o][1].type === "chunkText" && (a[o][1]._isInFirstContentOfListItem = !0, o++);
    if (r[0] === "enter")
      r[1].contentType && (Object.assign(e, P1(c, n)), n = e[n], u = !0);
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
  return Mt(t, 0, Number.POSITIVE_INFINITY, c.slice(0)), !u;
}
function P1(t, e) {
  const n = t.get(e)[1], r = t.get(e)[2];
  let i = e - 1;
  const o = [];
  let s = n._tokenizer;
  s || (s = r.parser[n.contentType](n.start), n._contentTypeTextTrailing && (s._contentTypeTextTrailing = !0));
  const l = s.events, a = [], u = {};
  let c, f, d = -1, h = n, p = 0, k = 0;
  const b = [k];
  for (; h; ) {
    for (; t.get(++i)[1] !== h; )
      ;
    o.push(i), h._tokenizer || (c = r.sliceStream(h), h.next || c.push(null), f && s.defineSkip(h.start), h._isInFirstContentOfListItem && (s._gfmTasklistFirstContentOfListItem = !0), s.write(c), h._isInFirstContentOfListItem && (s._gfmTasklistFirstContentOfListItem = void 0)), f = h, h = h.next;
  }
  for (h = n; ++d < l.length; )
    // Find a void token that includes a break.
    l[d][0] === "exit" && l[d - 1][0] === "enter" && l[d][1].type === l[d - 1][1].type && l[d][1].start.line !== l[d][1].end.line && (k = d + 1, b.push(k), h._tokenizer = void 0, h.previous = void 0, h = h.next);
  for (s.events = [], h ? (h._tokenizer = void 0, h.previous = void 0) : b.pop(), d = b.length; d--; ) {
    const w = l.slice(b[d], b[d + 1]), L = o.pop();
    a.push([L, L + w.length - 1]), t.splice(L, 2, w);
  }
  for (a.reverse(), d = -1; ++d < a.length; )
    u[p + a[d][0]] = p + a[d][1], p += a[d][1] - a[d][0] - 1;
  return u;
}
const z1 = {
  resolve: F1,
  tokenize: $1
}, B1 = {
  partial: !0,
  tokenize: _1
};
function F1(t) {
  return hp(t), t;
}
function $1(t, e) {
  let n;
  return r;
  function r(l) {
    return t.enter("content"), n = t.enter("chunkContent", {
      contentType: "content"
    }), i(l);
  }
  function i(l) {
    return l === null ? o(l) : J(l) ? t.check(B1, s, o)(l) : (t.consume(l), i);
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
function _1(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return t.exit("chunkContent"), t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), de(t, o, "linePrefix");
  }
  function o(s) {
    if (s === null || J(s))
      return n(s);
    const l = r.events[r.events.length - 1];
    return !r.parser.constructs.disable.null.includes("codeIndented") && l && l[1].type === "linePrefix" && l[2].sliceSerialize(l[1], !0).length >= 4 ? e(s) : t.interrupt(r.parser.constructs.flow, n, e)(s);
  }
}
function pp(t, e, n, r, i, o, s, l, a) {
  const u = a || Number.POSITIVE_INFINITY;
  let c = 0;
  return f;
  function f(w) {
    return w === 60 ? (t.enter(r), t.enter(i), t.enter(o), t.consume(w), t.exit(o), d) : w === null || w === 32 || w === 41 || Ys(w) ? n(w) : (t.enter(r), t.enter(s), t.enter(l), t.enter("chunkString", {
      contentType: "string"
    }), k(w));
  }
  function d(w) {
    return w === 62 ? (t.enter(o), t.consume(w), t.exit(o), t.exit(i), t.exit(r), e) : (t.enter(l), t.enter("chunkString", {
      contentType: "string"
    }), h(w));
  }
  function h(w) {
    return w === 62 ? (t.exit("chunkString"), t.exit(l), d(w)) : w === null || w === 60 || J(w) ? n(w) : (t.consume(w), w === 92 ? p : h);
  }
  function p(w) {
    return w === 60 || w === 62 || w === 92 ? (t.consume(w), h) : h(w);
  }
  function k(w) {
    return !c && (w === null || w === 41 || we(w)) ? (t.exit("chunkString"), t.exit(l), t.exit(s), t.exit(r), e(w)) : c < u && w === 40 ? (t.consume(w), c++, k) : w === 41 ? (t.consume(w), c--, k) : w === null || w === 32 || w === 40 || Ys(w) ? n(w) : (t.consume(w), w === 92 ? b : k);
  }
  function b(w) {
    return w === 40 || w === 41 || w === 92 ? (t.consume(w), k) : k(w);
  }
}
function mp(t, e, n, r, i, o) {
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
    h === 94 && !l && "_hiddenFootnoteSupport" in s.parser.constructs ? n(h) : h === 93 ? (t.exit(o), t.enter(i), t.consume(h), t.exit(i), t.exit(r), e) : J(h) ? (t.enter("lineEnding"), t.consume(h), t.exit("lineEnding"), c) : (t.enter("chunkString", {
      contentType: "string"
    }), f(h));
  }
  function f(h) {
    return h === null || h === 91 || h === 93 || J(h) || l++ > 999 ? (t.exit("chunkString"), c(h)) : (t.consume(h), a || (a = !se(h)), h === 92 ? d : f);
  }
  function d(h) {
    return h === 91 || h === 92 || h === 93 ? (t.consume(h), l++, f) : f(h);
  }
}
function gp(t, e, n, r, i, o) {
  let s;
  return l;
  function l(d) {
    return d === 34 || d === 39 || d === 40 ? (t.enter(r), t.enter(i), t.consume(d), t.exit(i), s = d === 40 ? 41 : d, a) : n(d);
  }
  function a(d) {
    return d === s ? (t.enter(i), t.consume(d), t.exit(i), t.exit(r), e) : (t.enter(o), u(d));
  }
  function u(d) {
    return d === s ? (t.exit(o), a(s)) : d === null ? n(d) : J(d) ? (t.enter("lineEnding"), t.consume(d), t.exit("lineEnding"), de(t, u, "linePrefix")) : (t.enter("chunkString", {
      contentType: "string"
    }), c(d));
  }
  function c(d) {
    return d === s || d === null || J(d) ? (t.exit("chunkString"), u(d)) : (t.consume(d), d === 92 ? f : c);
  }
  function f(d) {
    return d === s || d === 92 ? (t.consume(d), c) : c(d);
  }
}
function co(t, e) {
  let n;
  return r;
  function r(i) {
    return J(i) ? (t.enter("lineEnding"), t.consume(i), t.exit("lineEnding"), n = !0, r) : se(i) ? de(t, r, n ? "linePrefix" : "lineSuffix")(i) : e(i);
  }
}
const V1 = {
  name: "definition",
  tokenize: j1
}, H1 = {
  partial: !0,
  tokenize: W1
};
function j1(t, e, n) {
  const r = this;
  let i;
  return o;
  function o(h) {
    return t.enter("definition"), s(h);
  }
  function s(h) {
    return mp.call(
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
    return i = Wt(r.sliceSerialize(r.events[r.events.length - 1][1]).slice(1, -1)), h === 58 ? (t.enter("definitionMarker"), t.consume(h), t.exit("definitionMarker"), a) : n(h);
  }
  function a(h) {
    return we(h) ? co(t, u)(h) : u(h);
  }
  function u(h) {
    return pp(
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
    return t.attempt(H1, f, f)(h);
  }
  function f(h) {
    return se(h) ? de(t, d, "whitespace")(h) : d(h);
  }
  function d(h) {
    return h === null || J(h) ? (t.exit("definition"), r.parser.defined.push(i), e(h)) : n(h);
  }
}
function W1(t, e, n) {
  return r;
  function r(l) {
    return we(l) ? co(t, i)(l) : n(l);
  }
  function i(l) {
    return gp(t, o, n, "definitionTitle", "definitionTitleMarker", "definitionTitleString")(l);
  }
  function o(l) {
    return se(l) ? de(t, s, "whitespace")(l) : s(l);
  }
  function s(l) {
    return l === null || J(l) ? e(l) : n(l);
  }
}
const q1 = {
  name: "hardBreakEscape",
  tokenize: K1
};
function K1(t, e, n) {
  return r;
  function r(o) {
    return t.enter("hardBreakEscape"), t.consume(o), i;
  }
  function i(o) {
    return J(o) ? (t.exit("hardBreakEscape"), e(o)) : n(o);
  }
}
const U1 = {
  name: "headingAtx",
  resolve: J1,
  tokenize: G1
};
function J1(t, e) {
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
  }, Mt(t, r, n - r + 1, [["enter", i, e], ["enter", o, e], ["exit", o, e], ["exit", i, e]])), t;
}
function G1(t, e, n) {
  let r = 0;
  return i;
  function i(c) {
    return t.enter("atxHeading"), o(c);
  }
  function o(c) {
    return t.enter("atxHeadingSequence"), s(c);
  }
  function s(c) {
    return c === 35 && r++ < 6 ? (t.consume(c), s) : c === null || we(c) ? (t.exit("atxHeadingSequence"), l(c)) : n(c);
  }
  function l(c) {
    return c === 35 ? (t.enter("atxHeadingSequence"), a(c)) : c === null || J(c) ? (t.exit("atxHeading"), e(c)) : se(c) ? de(t, l, "whitespace")(c) : (t.enter("atxHeadingText"), u(c));
  }
  function a(c) {
    return c === 35 ? (t.consume(c), a) : (t.exit("atxHeadingSequence"), l(c));
  }
  function u(c) {
    return c === null || c === 35 || we(c) ? (t.exit("atxHeadingText"), l(c)) : (t.consume(c), u);
  }
}
const Y1 = [
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
], jf = ["pre", "script", "style", "textarea"], Q1 = {
  concrete: !0,
  name: "htmlFlow",
  resolveTo: eb,
  tokenize: tb
}, X1 = {
  partial: !0,
  tokenize: rb
}, Z1 = {
  partial: !0,
  tokenize: nb
};
function eb(t) {
  let e = t.length;
  for (; e-- && !(t[e][0] === "enter" && t[e][1].type === "htmlFlow"); )
    ;
  return e > 1 && t[e - 2][1].type === "linePrefix" && (t[e][1].start = t[e - 2][1].start, t[e + 1][1].start = t[e - 2][1].start, t.splice(e - 2, 2)), t;
}
function tb(t, e, n) {
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
    return S === 33 ? (t.consume(S), d) : S === 47 ? (t.consume(S), o = !0, k) : S === 63 ? (t.consume(S), i = 3, r.interrupt ? e : x) : it(S) ? (t.consume(S), s = String.fromCharCode(S), b) : n(S);
  }
  function d(S) {
    return S === 45 ? (t.consume(S), i = 2, h) : S === 91 ? (t.consume(S), i = 5, l = 0, p) : it(S) ? (t.consume(S), i = 4, r.interrupt ? e : x) : n(S);
  }
  function h(S) {
    return S === 45 ? (t.consume(S), r.interrupt ? e : x) : n(S);
  }
  function p(S) {
    const Ae = "CDATA[";
    return S === Ae.charCodeAt(l++) ? (t.consume(S), l === Ae.length ? r.interrupt ? e : $ : p) : n(S);
  }
  function k(S) {
    return it(S) ? (t.consume(S), s = String.fromCharCode(S), b) : n(S);
  }
  function b(S) {
    if (S === null || S === 47 || S === 62 || we(S)) {
      const Ae = S === 47, le = s.toLowerCase();
      return !Ae && !o && jf.includes(le) ? (i = 1, r.interrupt ? e(S) : $(S)) : Y1.includes(s.toLowerCase()) ? (i = 6, Ae ? (t.consume(S), w) : r.interrupt ? e(S) : $(S)) : (i = 7, r.interrupt && !r.parser.lazy[r.now().line] ? n(S) : o ? L(S) : O(S));
    }
    return S === 45 || mt(S) ? (t.consume(S), s += String.fromCharCode(S), b) : n(S);
  }
  function w(S) {
    return S === 62 ? (t.consume(S), r.interrupt ? e : $) : n(S);
  }
  function L(S) {
    return se(S) ? (t.consume(S), L) : N(S);
  }
  function O(S) {
    return S === 47 ? (t.consume(S), N) : S === 58 || S === 95 || it(S) ? (t.consume(S), W) : se(S) ? (t.consume(S), O) : N(S);
  }
  function W(S) {
    return S === 45 || S === 46 || S === 58 || S === 95 || mt(S) ? (t.consume(S), W) : j(S);
  }
  function j(S) {
    return S === 61 ? (t.consume(S), T) : se(S) ? (t.consume(S), j) : O(S);
  }
  function T(S) {
    return S === null || S === 60 || S === 61 || S === 62 || S === 96 ? n(S) : S === 34 || S === 39 ? (t.consume(S), a = S, F) : se(S) ? (t.consume(S), T) : U(S);
  }
  function F(S) {
    return S === a ? (t.consume(S), a = null, G) : S === null || J(S) ? n(S) : (t.consume(S), F);
  }
  function U(S) {
    return S === null || S === 34 || S === 39 || S === 47 || S === 60 || S === 61 || S === 62 || S === 96 || we(S) ? j(S) : (t.consume(S), U);
  }
  function G(S) {
    return S === 47 || S === 62 || se(S) ? O(S) : n(S);
  }
  function N(S) {
    return S === 62 ? (t.consume(S), q) : n(S);
  }
  function q(S) {
    return S === null || J(S) ? $(S) : se(S) ? (t.consume(S), q) : n(S);
  }
  function $(S) {
    return S === 45 && i === 2 ? (t.consume(S), Ne) : S === 60 && i === 1 ? (t.consume(S), pe) : S === 62 && i === 4 ? (t.consume(S), Pe) : S === 63 && i === 3 ? (t.consume(S), x) : S === 93 && i === 5 ? (t.consume(S), at) : J(S) && (i === 6 || i === 7) ? (t.exit("htmlFlowData"), t.check(X1, ut, ce)(S)) : S === null || J(S) ? (t.exit("htmlFlowData"), ce(S)) : (t.consume(S), $);
  }
  function ce(S) {
    return t.check(Z1, be, ut)(S);
  }
  function be(S) {
    return t.enter("lineEnding"), t.consume(S), t.exit("lineEnding"), ie;
  }
  function ie(S) {
    return S === null || J(S) ? ce(S) : (t.enter("htmlFlowData"), $(S));
  }
  function Ne(S) {
    return S === 45 ? (t.consume(S), x) : $(S);
  }
  function pe(S) {
    return S === 47 ? (t.consume(S), s = "", Le) : $(S);
  }
  function Le(S) {
    if (S === 62) {
      const Ae = s.toLowerCase();
      return jf.includes(Ae) ? (t.consume(S), Pe) : $(S);
    }
    return it(S) && s.length < 8 ? (t.consume(S), s += String.fromCharCode(S), Le) : $(S);
  }
  function at(S) {
    return S === 93 ? (t.consume(S), x) : $(S);
  }
  function x(S) {
    return S === 62 ? (t.consume(S), Pe) : S === 45 && i === 2 ? (t.consume(S), x) : $(S);
  }
  function Pe(S) {
    return S === null || J(S) ? (t.exit("htmlFlowData"), ut(S)) : (t.consume(S), Pe);
  }
  function ut(S) {
    return t.exit("htmlFlow"), e(S);
  }
}
function nb(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return J(s) ? (t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), o) : n(s);
  }
  function o(s) {
    return r.parser.lazy[r.now().line] ? n(s) : e(s);
  }
}
function rb(t, e, n) {
  return r;
  function r(i) {
    return t.enter("lineEnding"), t.consume(i), t.exit("lineEnding"), t.attempt(ts, e, n);
  }
}
const ib = {
  name: "htmlText",
  tokenize: ob
};
function ob(t, e, n) {
  const r = this;
  let i, o, s;
  return l;
  function l(x) {
    return t.enter("htmlText"), t.enter("htmlTextData"), t.consume(x), a;
  }
  function a(x) {
    return x === 33 ? (t.consume(x), u) : x === 47 ? (t.consume(x), j) : x === 63 ? (t.consume(x), O) : it(x) ? (t.consume(x), U) : n(x);
  }
  function u(x) {
    return x === 45 ? (t.consume(x), c) : x === 91 ? (t.consume(x), o = 0, p) : it(x) ? (t.consume(x), L) : n(x);
  }
  function c(x) {
    return x === 45 ? (t.consume(x), h) : n(x);
  }
  function f(x) {
    return x === null ? n(x) : x === 45 ? (t.consume(x), d) : J(x) ? (s = f, pe(x)) : (t.consume(x), f);
  }
  function d(x) {
    return x === 45 ? (t.consume(x), h) : f(x);
  }
  function h(x) {
    return x === 62 ? Ne(x) : x === 45 ? d(x) : f(x);
  }
  function p(x) {
    const Pe = "CDATA[";
    return x === Pe.charCodeAt(o++) ? (t.consume(x), o === Pe.length ? k : p) : n(x);
  }
  function k(x) {
    return x === null ? n(x) : x === 93 ? (t.consume(x), b) : J(x) ? (s = k, pe(x)) : (t.consume(x), k);
  }
  function b(x) {
    return x === 93 ? (t.consume(x), w) : k(x);
  }
  function w(x) {
    return x === 62 ? Ne(x) : x === 93 ? (t.consume(x), w) : k(x);
  }
  function L(x) {
    return x === null || x === 62 ? Ne(x) : J(x) ? (s = L, pe(x)) : (t.consume(x), L);
  }
  function O(x) {
    return x === null ? n(x) : x === 63 ? (t.consume(x), W) : J(x) ? (s = O, pe(x)) : (t.consume(x), O);
  }
  function W(x) {
    return x === 62 ? Ne(x) : O(x);
  }
  function j(x) {
    return it(x) ? (t.consume(x), T) : n(x);
  }
  function T(x) {
    return x === 45 || mt(x) ? (t.consume(x), T) : F(x);
  }
  function F(x) {
    return J(x) ? (s = F, pe(x)) : se(x) ? (t.consume(x), F) : Ne(x);
  }
  function U(x) {
    return x === 45 || mt(x) ? (t.consume(x), U) : x === 47 || x === 62 || we(x) ? G(x) : n(x);
  }
  function G(x) {
    return x === 47 ? (t.consume(x), Ne) : x === 58 || x === 95 || it(x) ? (t.consume(x), N) : J(x) ? (s = G, pe(x)) : se(x) ? (t.consume(x), G) : Ne(x);
  }
  function N(x) {
    return x === 45 || x === 46 || x === 58 || x === 95 || mt(x) ? (t.consume(x), N) : q(x);
  }
  function q(x) {
    return x === 61 ? (t.consume(x), $) : J(x) ? (s = q, pe(x)) : se(x) ? (t.consume(x), q) : G(x);
  }
  function $(x) {
    return x === null || x === 60 || x === 61 || x === 62 || x === 96 ? n(x) : x === 34 || x === 39 ? (t.consume(x), i = x, ce) : J(x) ? (s = $, pe(x)) : se(x) ? (t.consume(x), $) : (t.consume(x), be);
  }
  function ce(x) {
    return x === i ? (t.consume(x), i = void 0, ie) : x === null ? n(x) : J(x) ? (s = ce, pe(x)) : (t.consume(x), ce);
  }
  function be(x) {
    return x === null || x === 34 || x === 39 || x === 60 || x === 61 || x === 96 ? n(x) : x === 47 || x === 62 || we(x) ? G(x) : (t.consume(x), be);
  }
  function ie(x) {
    return x === 47 || x === 62 || we(x) ? G(x) : n(x);
  }
  function Ne(x) {
    return x === 62 ? (t.consume(x), t.exit("htmlTextData"), t.exit("htmlText"), e) : n(x);
  }
  function pe(x) {
    return t.exit("htmlTextData"), t.enter("lineEnding"), t.consume(x), t.exit("lineEnding"), Le;
  }
  function Le(x) {
    return se(x) ? de(t, at, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(x) : at(x);
  }
  function at(x) {
    return t.enter("htmlTextData"), s(x);
  }
}
const Eu = {
  name: "labelEnd",
  resolveAll: ub,
  resolveTo: cb,
  tokenize: fb
}, sb = {
  tokenize: db
}, lb = {
  tokenize: hb
}, ab = {
  tokenize: pb
};
function ub(t) {
  let e = -1;
  const n = [];
  for (; ++e < t.length; ) {
    const r = t[e][1];
    if (n.push(t[e]), r.type === "labelImage" || r.type === "labelLink" || r.type === "labelEnd") {
      const i = r.type === "labelImage" ? 4 : 2;
      r.type = "data", e += i;
    }
  }
  return t.length !== n.length && Mt(t, 0, t.length, n), t;
}
function cb(t, e) {
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
  return l = [["enter", a, e], ["enter", u, e]], l = Rt(l, t.slice(o + 1, o + r + 3)), l = Rt(l, [["enter", c, e]]), l = Rt(l, kl(e.parser.constructs.insideSpan.null, t.slice(o + r + 4, s - 3), e)), l = Rt(l, [["exit", c, e], t[s - 2], t[s - 1], ["exit", u, e]]), l = Rt(l, t.slice(s + 1)), l = Rt(l, [["exit", a, e]]), Mt(t, o, t.length, l), t;
}
function fb(t, e, n) {
  const r = this;
  let i = r.events.length, o, s;
  for (; i--; )
    if ((r.events[i][1].type === "labelImage" || r.events[i][1].type === "labelLink") && !r.events[i][1]._balanced) {
      o = r.events[i][1];
      break;
    }
  return l;
  function l(d) {
    return o ? o._inactive ? f(d) : (s = r.parser.defined.includes(Wt(r.sliceSerialize({
      start: o.end,
      end: r.now()
    }))), t.enter("labelEnd"), t.enter("labelMarker"), t.consume(d), t.exit("labelMarker"), t.exit("labelEnd"), a) : n(d);
  }
  function a(d) {
    return d === 40 ? t.attempt(sb, c, s ? c : f)(d) : d === 91 ? t.attempt(lb, c, s ? u : f)(d) : s ? c(d) : f(d);
  }
  function u(d) {
    return t.attempt(ab, c, f)(d);
  }
  function c(d) {
    return e(d);
  }
  function f(d) {
    return o._balanced = !0, n(d);
  }
}
function db(t, e, n) {
  return r;
  function r(f) {
    return t.enter("resource"), t.enter("resourceMarker"), t.consume(f), t.exit("resourceMarker"), i;
  }
  function i(f) {
    return we(f) ? co(t, o)(f) : o(f);
  }
  function o(f) {
    return f === 41 ? c(f) : pp(t, s, l, "resourceDestination", "resourceDestinationLiteral", "resourceDestinationLiteralMarker", "resourceDestinationRaw", "resourceDestinationString", 32)(f);
  }
  function s(f) {
    return we(f) ? co(t, a)(f) : c(f);
  }
  function l(f) {
    return n(f);
  }
  function a(f) {
    return f === 34 || f === 39 || f === 40 ? gp(t, u, n, "resourceTitle", "resourceTitleMarker", "resourceTitleString")(f) : c(f);
  }
  function u(f) {
    return we(f) ? co(t, c)(f) : c(f);
  }
  function c(f) {
    return f === 41 ? (t.enter("resourceMarker"), t.consume(f), t.exit("resourceMarker"), t.exit("resource"), e) : n(f);
  }
}
function hb(t, e, n) {
  const r = this;
  return i;
  function i(l) {
    return mp.call(r, t, o, s, "reference", "referenceMarker", "referenceString")(l);
  }
  function o(l) {
    return r.parser.defined.includes(Wt(r.sliceSerialize(r.events[r.events.length - 1][1]).slice(1, -1))) ? e(l) : n(l);
  }
  function s(l) {
    return n(l);
  }
}
function pb(t, e, n) {
  return r;
  function r(o) {
    return t.enter("reference"), t.enter("referenceMarker"), t.consume(o), t.exit("referenceMarker"), i;
  }
  function i(o) {
    return o === 93 ? (t.enter("referenceMarker"), t.consume(o), t.exit("referenceMarker"), t.exit("reference"), e) : n(o);
  }
}
const mb = {
  name: "labelStartImage",
  resolveAll: Eu.resolveAll,
  tokenize: gb
};
function gb(t, e, n) {
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
const yb = {
  name: "labelStartLink",
  resolveAll: Eu.resolveAll,
  tokenize: kb
};
function kb(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return t.enter("labelLink"), t.enter("labelMarker"), t.consume(s), t.exit("labelMarker"), t.exit("labelLink"), o;
  }
  function o(s) {
    return s === 94 && "_hiddenFootnoteSupport" in r.parser.constructs ? n(s) : e(s);
  }
}
const $l = {
  name: "lineEnding",
  tokenize: bb
};
function bb(t, e) {
  return n;
  function n(r) {
    return t.enter("lineEnding"), t.consume(r), t.exit("lineEnding"), de(t, e, "linePrefix");
  }
}
const Ps = {
  name: "thematicBreak",
  tokenize: wb
};
function wb(t, e, n) {
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
    return u === i ? (t.consume(u), r++, a) : (t.exit("thematicBreakSequence"), se(u) ? de(t, l, "whitespace")(u) : l(u));
  }
}
const ft = {
  continuation: {
    tokenize: vb
  },
  exit: Tb,
  name: "list",
  tokenize: Sb
}, xb = {
  partial: !0,
  tokenize: Nb
}, Cb = {
  partial: !0,
  tokenize: Mb
};
function Sb(t, e, n) {
  const r = this, i = r.events[r.events.length - 1];
  let o = i && i[1].type === "linePrefix" ? i[2].sliceSerialize(i[1], !0).length : 0, s = 0;
  return l;
  function l(h) {
    const p = r.containerState.type || (h === 42 || h === 43 || h === 45 ? "listUnordered" : "listOrdered");
    if (p === "listUnordered" ? !r.containerState.marker || h === r.containerState.marker : za(h)) {
      if (r.containerState.type || (r.containerState.type = p, t.enter(p, {
        _container: !0
      })), p === "listUnordered")
        return t.enter("listItemPrefix"), h === 42 || h === 45 ? t.check(Ps, n, u)(h) : u(h);
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
      t.attempt(xb, d, f)
    );
  }
  function c(h) {
    return r.containerState.initialBlankLine = !0, o++, d(h);
  }
  function f(h) {
    return se(h) ? (t.enter("listItemPrefixWhitespace"), t.consume(h), t.exit("listItemPrefixWhitespace"), d) : n(h);
  }
  function d(h) {
    return r.containerState.size = o + r.sliceSerialize(t.exit("listItemPrefix"), !0).length, e(h);
  }
}
function vb(t, e, n) {
  const r = this;
  return r.containerState._closeFlow = void 0, t.check(ts, i, o);
  function i(l) {
    return r.containerState.furtherBlankLines = r.containerState.furtherBlankLines || r.containerState.initialBlankLine, de(t, e, "listItemIndent", r.containerState.size + 1)(l);
  }
  function o(l) {
    return r.containerState.furtherBlankLines || !se(l) ? (r.containerState.furtherBlankLines = void 0, r.containerState.initialBlankLine = void 0, s(l)) : (r.containerState.furtherBlankLines = void 0, r.containerState.initialBlankLine = void 0, t.attempt(Cb, e, s)(l));
  }
  function s(l) {
    return r.containerState._closeFlow = !0, r.interrupt = void 0, de(t, t.attempt(ft, e, n), "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(l);
  }
}
function Mb(t, e, n) {
  const r = this;
  return de(t, i, "listItemIndent", r.containerState.size + 1);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return s && s[1].type === "listItemIndent" && s[2].sliceSerialize(s[1], !0).length === r.containerState.size ? e(o) : n(o);
  }
}
function Tb(t) {
  t.exit(this.containerState.type);
}
function Nb(t, e, n) {
  const r = this;
  return de(t, i, "listItemPrefixWhitespace", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 5);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return !se(o) && s && s[1].type === "listItemPrefixWhitespace" ? e(o) : n(o);
  }
}
const Wf = {
  name: "setextUnderline",
  resolveTo: Ib,
  tokenize: Ab
};
function Ib(t, e) {
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
function Ab(t, e, n) {
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
    return u === i ? (t.consume(u), l) : (t.exit("setextHeadingLineSequence"), se(u) ? de(t, a, "lineSuffix")(u) : a(u));
  }
  function a(u) {
    return u === null || J(u) ? (t.exit("setextHeadingLine"), e(u)) : n(u);
  }
}
const Eb = {
  tokenize: Ob
};
function Ob(t) {
  const e = this, n = t.attempt(
    // Try to parse a blank line.
    ts,
    r,
    // Try to parse initial flow (essentially, only code).
    t.attempt(this.parser.constructs.flowInitial, i, de(t, t.attempt(this.parser.constructs.flow, i, t.attempt(z1, i)), "linePrefix"))
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
const Db = {
  resolveAll: kp()
}, Rb = yp("string"), Lb = yp("text");
function yp(t) {
  return {
    resolveAll: kp(t === "text" ? Pb : void 0),
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
function kp(t) {
  return e;
  function e(n, r) {
    let i = -1, o;
    for (; ++i <= n.length; )
      o === void 0 ? n[i] && n[i][1].type === "data" && (o = i, i++) : (!n[i] || n[i][1].type !== "data") && (i !== o + 2 && (n[o][1].end = n[i - 1][1].end, n.splice(o + 2, i - o - 2), i = o + 2), o = void 0);
    return t ? t(n, r) : n;
  }
}
function Pb(t, e) {
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
const zb = {
  42: ft,
  43: ft,
  45: ft,
  48: ft,
  49: ft,
  50: ft,
  51: ft,
  52: ft,
  53: ft,
  54: ft,
  55: ft,
  56: ft,
  57: ft,
  62: cp
}, Bb = {
  91: V1
}, Fb = {
  [-2]: Fl,
  [-1]: Fl,
  32: Fl
}, $b = {
  35: U1,
  42: Ps,
  45: [Wf, Ps],
  60: Q1,
  61: Wf,
  95: Ps,
  96: Hf,
  126: Hf
}, _b = {
  38: dp,
  92: fp
}, Vb = {
  [-5]: $l,
  [-4]: $l,
  [-3]: $l,
  33: mb,
  38: dp,
  42: Ba,
  60: [y1, ib],
  91: yb,
  92: [q1, fp],
  93: Eu,
  95: Ba,
  96: E1
}, Hb = {
  null: [Ba, Db]
}, jb = {
  null: [42, 95]
}, Wb = {
  null: []
}, qb = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  attentionMarkers: jb,
  contentInitial: Bb,
  disable: Wb,
  document: zb,
  flow: $b,
  flowInitial: Fb,
  insideSpan: Hb,
  string: _b,
  text: Vb
}, Symbol.toStringTag, { value: "Module" }));
function Kb(t, e, n) {
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
    attempt: F(j),
    check: F(T),
    consume: L,
    enter: O,
    exit: W,
    interrupt: F(T, {
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
  function f(q) {
    return s = Rt(s, q), b(), s[s.length - 1] !== null ? [] : (U(e, 0), u.events = kl(o, u.events, u), u.events);
  }
  function d(q, $) {
    return Jb(h(q), $);
  }
  function h(q) {
    return Ub(s, q);
  }
  function p() {
    const {
      _bufferIndex: q,
      _index: $,
      line: ce,
      column: be,
      offset: ie
    } = r;
    return {
      _bufferIndex: q,
      _index: $,
      line: ce,
      column: be,
      offset: ie
    };
  }
  function k(q) {
    i[q.line] = q.column, N();
  }
  function b() {
    let q;
    for (; r._index < s.length; ) {
      const $ = s[r._index];
      if (typeof $ == "string")
        for (q = r._index, r._bufferIndex < 0 && (r._bufferIndex = 0); r._index === q && r._bufferIndex < $.length; )
          w($.charCodeAt(r._bufferIndex));
      else
        w($);
    }
  }
  function w(q) {
    c = c(q);
  }
  function L(q) {
    J(q) ? (r.line++, r.column = 1, r.offset += q === -3 ? 2 : 1, N()) : q !== -1 && (r.column++, r.offset++), r._bufferIndex < 0 ? r._index++ : (r._bufferIndex++, r._bufferIndex === // Points w/ non-negative `_bufferIndex` reference
    // strings.
    /** @type {string} */
    s[r._index].length && (r._bufferIndex = -1, r._index++)), u.previous = q;
  }
  function O(q, $) {
    const ce = $ || {};
    return ce.type = q, ce.start = p(), u.events.push(["enter", ce, u]), l.push(ce), ce;
  }
  function W(q) {
    const $ = l.pop();
    return $.end = p(), u.events.push(["exit", $, u]), $;
  }
  function j(q, $) {
    U(q, $.from);
  }
  function T(q, $) {
    $.restore();
  }
  function F(q, $) {
    return ce;
    function ce(be, ie, Ne) {
      let pe, Le, at, x;
      return Array.isArray(be) ? (
        /* c8 ignore next 1 */
        ut(be)
      ) : "tokenize" in be ? (
        // Looks like a construct.
        ut([
          /** @type {Construct} */
          be
        ])
      ) : Pe(be);
      function Pe(xe) {
        return oe;
        function oe(ze) {
          const ct = ze !== null && xe[ze], Ee = ze !== null && xe.null, ln = [
            // To do: add more extension tests.
            /* c8 ignore next 2 */
            ...Array.isArray(ct) ? ct : ct ? [ct] : [],
            ...Array.isArray(Ee) ? Ee : Ee ? [Ee] : []
          ];
          return ut(ln)(ze);
        }
      }
      function ut(xe) {
        return pe = xe, Le = 0, xe.length === 0 ? Ne : S(xe[Le]);
      }
      function S(xe) {
        return oe;
        function oe(ze) {
          return x = G(), at = xe, xe.partial || (u.currentConstruct = xe), xe.name && u.parser.constructs.disable.null.includes(xe.name) ? le() : xe.tokenize.call(
            // If we do have fields, create an object w/ `context` as its
            // prototype.
            // This allows a “live binding”, which is needed for `interrupt`.
            $ ? Object.assign(Object.create(u), $) : u,
            a,
            Ae,
            le
          )(ze);
        }
      }
      function Ae(xe) {
        return q(at, x), ie;
      }
      function le(xe) {
        return x.restore(), ++Le < pe.length ? S(pe[Le]) : Ne;
      }
    }
  }
  function U(q, $) {
    q.resolveAll && !o.includes(q) && o.push(q), q.resolve && Mt(u.events, $, u.events.length - $, q.resolve(u.events.slice($), u)), q.resolveTo && (u.events = q.resolveTo(u.events, u));
  }
  function G() {
    const q = p(), $ = u.previous, ce = u.currentConstruct, be = u.events.length, ie = Array.from(l);
    return {
      from: be,
      restore: Ne
    };
    function Ne() {
      r = q, u.previous = $, u.currentConstruct = ce, u.events.length = be, l = ie, N();
    }
  }
  function N() {
    r.line in i && r.column < 2 && (r.column = i[r.line], r.offset += i[r.line] - 1);
  }
}
function Ub(t, e) {
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
function Jb(t, e) {
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
function Gb(t) {
  const r = {
    constructs: (
      /** @type {FullNormalizedExtension} */
      ap([qb, ...(t || {}).extensions || []])
    ),
    content: i(c1),
    defined: [],
    document: i(d1),
    flow: i(Eb),
    lazy: {},
    string: i(Rb),
    text: i(Lb)
  };
  return r;
  function i(o) {
    return s;
    function s(l) {
      return Kb(r, o, l);
    }
  }
}
function Yb(t) {
  for (; !hp(t); )
    ;
  return t;
}
const qf = /[\0\t\n\r]/g;
function Qb() {
  let t = 1, e = "", n = !0, r;
  return i;
  function i(o, s, l) {
    const a = [];
    let u, c, f, d, h;
    for (o = e + (typeof o == "string" ? o.toString() : new TextDecoder(s || void 0).decode(o)), f = 0, e = "", n && (o.charCodeAt(0) === 65279 && f++, n = void 0); f < o.length; ) {
      if (qf.lastIndex = f, u = qf.exec(o), d = u && u.index !== void 0 ? u.index : o.length, h = o.charCodeAt(d), !u) {
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
const Xb = /\\([!-/:-@[-`{-~])|&(#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});/gi;
function bp(t) {
  return t.replace(Xb, Zb);
}
function Zb(t, e, n) {
  if (e)
    return e;
  if (n.charCodeAt(0) === 35) {
    const i = n.charCodeAt(1), o = i === 120 || i === 88;
    return up(n.slice(o ? 2 : 1), o ? 16 : 10);
  }
  return Au(n) || t;
}
function fo(t) {
  return !t || typeof t != "object" ? "" : "position" in t || "type" in t ? Kf(t.position) : "start" in t || "end" in t ? Kf(t) : "line" in t || "column" in t ? Fa(t) : "";
}
function Fa(t) {
  return Uf(t && t.line) + ":" + Uf(t && t.column);
}
function Kf(t) {
  return Fa(t && t.start) + "-" + Fa(t && t.end);
}
function Uf(t) {
  return t && typeof t == "number" ? t : 1;
}
const wp = {}.hasOwnProperty;
function Ou(t, e, n) {
  return e && typeof e == "object" && (n = e, e = void 0), e0(n)(Yb(Gb(n).document().write(Qb()(t, e, !0))));
}
function e0(t) {
  const e = {
    transforms: [],
    canContainEols: ["emphasis", "fragment", "heading", "paragraph", "strong"],
    enter: {
      autolink: o(Kr),
      autolinkProtocol: G,
      autolinkEmail: G,
      atxHeading: o(Be),
      blockQuote: o(Ee),
      characterEscape: G,
      characterReference: G,
      codeFenced: o(ln),
      codeFencedFenceInfo: s,
      codeFencedFenceMeta: s,
      codeIndented: o(ln, s),
      codeText: o(On, s),
      codeTextData: G,
      data: G,
      codeFlowValue: G,
      definition: o(Dl),
      definitionDestinationString: s,
      definitionLabelString: s,
      definitionTitleString: s,
      emphasis: o(Dn),
      hardBreakEscape: o(bs),
      hardBreakTrailing: o(bs),
      htmlFlow: o(Gi, s),
      htmlFlowData: G,
      htmlText: o(Gi, s),
      htmlTextData: G,
      image: o(Ge),
      label: s,
      link: o(Kr),
      listItem: o(ae),
      listItemValue: d,
      listOrdered: o(Yi, f),
      listUnordered: o(Yi),
      paragraph: o(lr),
      reference: S,
      referenceString: s,
      resourceDestinationString: s,
      resourceTitleString: s,
      setextHeading: o(Be),
      strong: o(ws),
      thematicBreak: o(Rl)
    },
    exit: {
      atxHeading: a(),
      atxHeadingSequence: j,
      autolink: a(),
      autolinkEmail: ct,
      autolinkProtocol: ze,
      blockQuote: a(),
      characterEscapeValue: N,
      characterReferenceMarkerHexadecimal: le,
      characterReferenceMarkerNumeric: le,
      characterReferenceValue: xe,
      characterReference: oe,
      codeFenced: a(b),
      codeFencedFence: k,
      codeFencedFenceInfo: h,
      codeFencedFenceMeta: p,
      codeFlowValue: N,
      codeIndented: a(w),
      codeText: a(ie),
      codeTextData: N,
      data: N,
      definition: a(),
      definitionDestinationString: W,
      definitionLabelString: L,
      definitionTitleString: O,
      emphasis: a(),
      hardBreakEscape: a($),
      hardBreakTrailing: a($),
      htmlFlow: a(ce),
      htmlFlowData: N,
      htmlText: a(be),
      htmlTextData: N,
      image: a(pe),
      label: at,
      labelText: Le,
      lineEnding: q,
      link: a(Ne),
      listItem: a(),
      listOrdered: a(),
      listUnordered: a(),
      paragraph: a(),
      referenceString: Ae,
      resourceDestinationString: x,
      resourceTitleString: Pe,
      resource: ut,
      setextHeading: a(U),
      setextHeadingLineSequence: F,
      setextHeadingText: T,
      strong: a(),
      thematicBreak: a()
    }
  };
  xp(e, (t || {}).mdastExtensions || []);
  const n = {};
  return r;
  function r(E) {
    let z = {
      type: "root",
      children: []
    };
    const ee = {
      stack: [z],
      tokenStack: [],
      config: e,
      enter: l,
      exit: u,
      buffer: s,
      resume: c,
      data: n
    }, ne = [];
    let me = -1;
    for (; ++me < E.length; )
      if (E[me][1].type === "listOrdered" || E[me][1].type === "listUnordered")
        if (E[me][0] === "enter")
          ne.push(me);
        else {
          const Ye = ne.pop();
          me = i(E, Ye, me);
        }
    for (me = -1; ++me < E.length; ) {
      const Ye = e[E[me][0]];
      wp.call(Ye, E[me][1].type) && Ye[E[me][1].type].call(Object.assign({
        sliceSerialize: E[me][2].sliceSerialize
      }, ee), E[me][1]);
    }
    if (ee.tokenStack.length > 0) {
      const Ye = ee.tokenStack[ee.tokenStack.length - 1];
      (Ye[1] || Jf).call(ee, void 0, Ye[0]);
    }
    for (z.position = {
      start: zn(E.length > 0 ? E[0][1].start : {
        line: 1,
        column: 1,
        offset: 0
      }),
      end: zn(E.length > 0 ? E[E.length - 2][1].end : {
        line: 1,
        column: 1,
        offset: 0
      })
    }, me = -1; ++me < e.transforms.length; )
      z = e.transforms[me](z) || z;
    return z;
  }
  function i(E, z, ee) {
    let ne = z - 1, me = -1, Ye = !1, an, $t, ar, ur;
    for (; ++ne <= ee; ) {
      const Qe = E[ne];
      switch (Qe[1].type) {
        case "listUnordered":
        case "listOrdered":
        case "blockQuote": {
          Qe[0] === "enter" ? me++ : me--, ur = void 0;
          break;
        }
        case "lineEndingBlank": {
          Qe[0] === "enter" && (an && !ur && !me && !ar && (ar = ne), ur = void 0);
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
      if (!me && Qe[0] === "enter" && Qe[1].type === "listItemPrefix" || me === -1 && Qe[0] === "exit" && (Qe[1].type === "listUnordered" || Qe[1].type === "listOrdered")) {
        if (an) {
          let Rn = ne;
          for ($t = void 0; Rn--; ) {
            const _t = E[Rn];
            if (_t[1].type === "lineEnding" || _t[1].type === "lineEndingBlank") {
              if (_t[0] === "exit") continue;
              $t && (E[$t][1].type = "lineEndingBlank", Ye = !0), _t[1].type = "lineEnding", $t = Rn;
            } else if (!(_t[1].type === "linePrefix" || _t[1].type === "blockQuotePrefix" || _t[1].type === "blockQuotePrefixWhitespace" || _t[1].type === "blockQuoteMarker" || _t[1].type === "listItemIndent")) break;
          }
          ar && (!$t || ar < $t) && (an._spread = !0), an.end = Object.assign({}, $t ? E[$t][1].start : Qe[1].end), E.splice($t || ne, 0, ["exit", an, Qe[2]]), ne++, ee++;
        }
        if (Qe[1].type === "listItemPrefix") {
          const Rn = {
            type: "listItem",
            _spread: !1,
            start: Object.assign({}, Qe[1].start),
            // @ts-expect-error: we’ll add `end` in a second.
            end: void 0
          };
          an = Rn, E.splice(ne, 0, ["enter", Rn, Qe[2]]), ne++, ee++, ar = void 0, ur = !0;
        }
      }
    }
    return E[z][1]._spread = Ye, ee;
  }
  function o(E, z) {
    return ee;
    function ee(ne) {
      l.call(this, E(ne), ne), z && z.call(this, ne);
    }
  }
  function s() {
    this.stack.push({
      type: "fragment",
      children: []
    });
  }
  function l(E, z, ee) {
    this.stack[this.stack.length - 1].children.push(E), this.stack.push(E), this.tokenStack.push([z, ee || void 0]), E.position = {
      start: zn(z.start),
      // @ts-expect-error: `end` will be patched later.
      end: void 0
    };
  }
  function a(E) {
    return z;
    function z(ee) {
      E && E.call(this, ee), u.call(this, ee);
    }
  }
  function u(E, z) {
    const ee = this.stack.pop(), ne = this.tokenStack.pop();
    if (ne)
      ne[0].type !== E.type && (z ? z.call(this, E, ne[0]) : (ne[1] || Jf).call(this, E, ne[0]));
    else throw new Error("Cannot close `" + E.type + "` (" + fo({
      start: E.start,
      end: E.end
    }) + "): it’s not open");
    ee.position.end = zn(E.end);
  }
  function c() {
    return Iu(this.stack.pop());
  }
  function f() {
    this.data.expectingFirstListItemValue = !0;
  }
  function d(E) {
    if (this.data.expectingFirstListItemValue) {
      const z = this.stack[this.stack.length - 2];
      z.start = Number.parseInt(this.sliceSerialize(E), 10), this.data.expectingFirstListItemValue = void 0;
    }
  }
  function h() {
    const E = this.resume(), z = this.stack[this.stack.length - 1];
    z.lang = E;
  }
  function p() {
    const E = this.resume(), z = this.stack[this.stack.length - 1];
    z.meta = E;
  }
  function k() {
    this.data.flowCodeInside || (this.buffer(), this.data.flowCodeInside = !0);
  }
  function b() {
    const E = this.resume(), z = this.stack[this.stack.length - 1];
    z.value = E.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, ""), this.data.flowCodeInside = void 0;
  }
  function w() {
    const E = this.resume(), z = this.stack[this.stack.length - 1];
    z.value = E.replace(/(\r?\n|\r)$/g, "");
  }
  function L(E) {
    const z = this.resume(), ee = this.stack[this.stack.length - 1];
    ee.label = z, ee.identifier = Wt(this.sliceSerialize(E)).toLowerCase();
  }
  function O() {
    const E = this.resume(), z = this.stack[this.stack.length - 1];
    z.title = E;
  }
  function W() {
    const E = this.resume(), z = this.stack[this.stack.length - 1];
    z.url = E;
  }
  function j(E) {
    const z = this.stack[this.stack.length - 1];
    if (!z.depth) {
      const ee = this.sliceSerialize(E).length;
      z.depth = ee;
    }
  }
  function T() {
    this.data.setextHeadingSlurpLineEnding = !0;
  }
  function F(E) {
    const z = this.stack[this.stack.length - 1];
    z.depth = this.sliceSerialize(E).codePointAt(0) === 61 ? 1 : 2;
  }
  function U() {
    this.data.setextHeadingSlurpLineEnding = void 0;
  }
  function G(E) {
    const ee = this.stack[this.stack.length - 1].children;
    let ne = ee[ee.length - 1];
    (!ne || ne.type !== "text") && (ne = Qi(), ne.position = {
      start: zn(E.start),
      // @ts-expect-error: we’ll add `end` later.
      end: void 0
    }, ee.push(ne)), this.stack.push(ne);
  }
  function N(E) {
    const z = this.stack.pop();
    z.value += this.sliceSerialize(E), z.position.end = zn(E.end);
  }
  function q(E) {
    const z = this.stack[this.stack.length - 1];
    if (this.data.atHardBreak) {
      const ee = z.children[z.children.length - 1];
      ee.position.end = zn(E.end), this.data.atHardBreak = void 0;
      return;
    }
    !this.data.setextHeadingSlurpLineEnding && e.canContainEols.includes(z.type) && (G.call(this, E), N.call(this, E));
  }
  function $() {
    this.data.atHardBreak = !0;
  }
  function ce() {
    const E = this.resume(), z = this.stack[this.stack.length - 1];
    z.value = E;
  }
  function be() {
    const E = this.resume(), z = this.stack[this.stack.length - 1];
    z.value = E;
  }
  function ie() {
    const E = this.resume(), z = this.stack[this.stack.length - 1];
    z.value = E;
  }
  function Ne() {
    const E = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const z = this.data.referenceType || "shortcut";
      E.type += "Reference", E.referenceType = z, delete E.url, delete E.title;
    } else
      delete E.identifier, delete E.label;
    this.data.referenceType = void 0;
  }
  function pe() {
    const E = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const z = this.data.referenceType || "shortcut";
      E.type += "Reference", E.referenceType = z, delete E.url, delete E.title;
    } else
      delete E.identifier, delete E.label;
    this.data.referenceType = void 0;
  }
  function Le(E) {
    const z = this.sliceSerialize(E), ee = this.stack[this.stack.length - 2];
    ee.label = bp(z), ee.identifier = Wt(z).toLowerCase();
  }
  function at() {
    const E = this.stack[this.stack.length - 1], z = this.resume(), ee = this.stack[this.stack.length - 1];
    if (this.data.inReference = !0, ee.type === "link") {
      const ne = E.children;
      ee.children = ne;
    } else
      ee.alt = z;
  }
  function x() {
    const E = this.resume(), z = this.stack[this.stack.length - 1];
    z.url = E;
  }
  function Pe() {
    const E = this.resume(), z = this.stack[this.stack.length - 1];
    z.title = E;
  }
  function ut() {
    this.data.inReference = void 0;
  }
  function S() {
    this.data.referenceType = "collapsed";
  }
  function Ae(E) {
    const z = this.resume(), ee = this.stack[this.stack.length - 1];
    ee.label = z, ee.identifier = Wt(this.sliceSerialize(E)).toLowerCase(), this.data.referenceType = "full";
  }
  function le(E) {
    this.data.characterReferenceType = E.type;
  }
  function xe(E) {
    const z = this.sliceSerialize(E), ee = this.data.characterReferenceType;
    let ne;
    ee ? (ne = up(z, ee === "characterReferenceMarkerNumeric" ? 10 : 16), this.data.characterReferenceType = void 0) : ne = Au(z);
    const me = this.stack[this.stack.length - 1];
    me.value += ne;
  }
  function oe(E) {
    const z = this.stack.pop();
    z.position.end = zn(E.end);
  }
  function ze(E) {
    N.call(this, E);
    const z = this.stack[this.stack.length - 1];
    z.url = this.sliceSerialize(E);
  }
  function ct(E) {
    N.call(this, E);
    const z = this.stack[this.stack.length - 1];
    z.url = "mailto:" + this.sliceSerialize(E);
  }
  function Ee() {
    return {
      type: "blockquote",
      children: []
    };
  }
  function ln() {
    return {
      type: "code",
      lang: null,
      meta: null,
      value: ""
    };
  }
  function On() {
    return {
      type: "inlineCode",
      value: ""
    };
  }
  function Dl() {
    return {
      type: "definition",
      identifier: "",
      label: null,
      title: null,
      url: ""
    };
  }
  function Dn() {
    return {
      type: "emphasis",
      children: []
    };
  }
  function Be() {
    return {
      type: "heading",
      // @ts-expect-error `depth` will be set later.
      depth: 0,
      children: []
    };
  }
  function bs() {
    return {
      type: "break"
    };
  }
  function Gi() {
    return {
      type: "html",
      value: ""
    };
  }
  function Ge() {
    return {
      type: "image",
      title: null,
      url: "",
      alt: null
    };
  }
  function Kr() {
    return {
      type: "link",
      title: null,
      url: "",
      children: []
    };
  }
  function Yi(E) {
    return {
      type: "list",
      ordered: E.type === "listOrdered",
      start: null,
      spread: E._spread,
      children: []
    };
  }
  function ae(E) {
    return {
      type: "listItem",
      spread: E._spread,
      checked: null,
      children: []
    };
  }
  function lr() {
    return {
      type: "paragraph",
      children: []
    };
  }
  function ws() {
    return {
      type: "strong",
      children: []
    };
  }
  function Qi() {
    return {
      type: "text",
      value: ""
    };
  }
  function Rl() {
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
function xp(t, e) {
  let n = -1;
  for (; ++n < e.length; ) {
    const r = e[n];
    Array.isArray(r) ? xp(t, r) : t0(t, r);
  }
}
function t0(t, e) {
  let n;
  for (n in e)
    if (wp.call(e, n))
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
function Jf(t, e) {
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
    return Ou(r, {
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
const Gf = {}.hasOwnProperty;
function n0(t, e) {
  const n = e || {};
  function r(i, ...o) {
    let s = r.invalid;
    const l = r.handlers;
    if (i && Gf.call(i, t)) {
      const a = String(i[t]);
      s = Gf.call(l, a) ? l[a] : r.unknown;
    }
    if (s)
      return s.call(this, i, ...o);
  }
  return r.handlers = n.handlers || {}, r.invalid = n.invalid, r.unknown = n.unknown, r;
}
const r0 = {}.hasOwnProperty;
function Cp(t, e) {
  let n = -1, r;
  if (e.extensions)
    for (; ++n < e.extensions.length; )
      Cp(t, e.extensions[n]);
  for (r in e)
    if (r0.call(e, r))
      switch (r) {
        case "extensions":
          break;
        case "unsafe": {
          Yf(t[r], e[r]);
          break;
        }
        case "join": {
          Yf(t[r], e[r]);
          break;
        }
        case "handlers": {
          i0(t[r], e[r]);
          break;
        }
        default:
          t.options[r] = e[r];
      }
  return t;
}
function Yf(t, e) {
  e && t.push(...e);
}
function i0(t, e) {
  e && Object.assign(t, e);
}
function o0(t, e, n, r) {
  const i = n.enter("blockquote"), o = n.createTracker(r);
  o.move("> "), o.shift(2);
  const s = n.indentLines(
    n.containerFlow(t, o.current()),
    s0
  );
  return i(), s;
}
function s0(t, e, n) {
  return ">" + (n ? "" : " ") + t;
}
function Sp(t, e) {
  return Qf(t, e.inConstruct, !0) && !Qf(t, e.notInConstruct, !1);
}
function Qf(t, e, n) {
  if (typeof e == "string" && (e = [e]), !e || e.length === 0)
    return n;
  let r = -1;
  for (; ++r < e.length; )
    if (t.includes(e[r]))
      return !0;
  return !1;
}
function Xf(t, e, n, r) {
  let i = -1;
  for (; ++i < n.unsafe.length; )
    if (n.unsafe[i].character === `
` && Sp(n.stack, n.unsafe[i]))
      return /[ \t]/.test(r.before) ? "" : " ";
  return `\\
`;
}
function l0(t, e) {
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
function a0(t) {
  const e = t.options.fence || "`";
  if (e !== "`" && e !== "~")
    throw new Error(
      "Cannot serialize code with `" + e + "` for `options.fence`, expected `` ` `` or `~`"
    );
  return e;
}
function u0(t, e, n, r) {
  const i = a0(n), o = t.value || "", s = i === "`" ? "GraveAccent" : "Tilde";
  if (_a(t, n)) {
    const f = n.enter("codeIndented"), d = n.indentLines(o, c0);
    return f(), d;
  }
  const l = n.createTracker(r), a = i.repeat(Math.max(l0(o, i) + 1, 3)), u = n.enter("codeFenced");
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
function c0(t, e, n) {
  return (n ? "" : "    ") + t;
}
function Du(t) {
  const e = t.options.quote || '"';
  if (e !== '"' && e !== "'")
    throw new Error(
      "Cannot serialize title with `" + e + "` for `options.quote`, expected `\"`, or `'`"
    );
  return e;
}
function f0(t, e, n, r) {
  const i = Du(n), o = i === '"' ? "Quote" : "Apostrophe", s = n.enter("definition");
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
function d0(t) {
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
function Qs(t, e, n) {
  const r = Ei(t), i = Ei(e);
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
vp.peek = h0;
function vp(t, e, n, r) {
  const i = d0(n), o = n.enter("emphasis"), s = n.createTracker(r), l = s.move(i);
  let a = s.move(
    n.containerPhrasing(t, {
      after: i,
      before: l,
      ...s.current()
    })
  );
  const u = a.charCodeAt(0), c = Qs(
    r.before.charCodeAt(r.before.length - 1),
    u,
    i
  );
  c.inside && (a = tr(u) + a.slice(1));
  const f = a.charCodeAt(a.length - 1), d = Qs(r.after.charCodeAt(0), f, i);
  d.inside && (a = a.slice(0, -1) + tr(f));
  const h = s.move(i);
  return o(), n.attentionEncodeSurroundingInfo = {
    after: d.outside,
    before: c.outside
  }, l + a + h;
}
function h0(t, e, n) {
  return n.options.emphasis || "*";
}
const bl = (
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
      return y0;
    if (typeof t == "function")
      return wl(t);
    if (typeof t == "object")
      return Array.isArray(t) ? p0(t) : (
        // Cast because `ReadonlyArray` goes into the above but `isArray`
        // narrows to `Array`.
        m0(
          /** @type {Props} */
          t
        )
      );
    if (typeof t == "string")
      return g0(t);
    throw new Error("Expected function, string, or object as test");
  }
);
function p0(t) {
  const e = [];
  let n = -1;
  for (; ++n < t.length; )
    e[n] = bl(t[n]);
  return wl(r);
  function r(...i) {
    let o = -1;
    for (; ++o < e.length; )
      if (e[o].apply(this, i)) return !0;
    return !1;
  }
}
function m0(t) {
  const e = (
    /** @type {Record<string, unknown>} */
    t
  );
  return wl(n);
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
function g0(t) {
  return wl(e);
  function e(n) {
    return n && n.type === t;
  }
}
function wl(t) {
  return e;
  function e(n, r, i) {
    return !!(k0(n) && t.call(
      this,
      n,
      typeof r == "number" ? r : void 0,
      i || void 0
    ));
  }
}
function y0() {
  return !0;
}
function k0(t) {
  return t !== null && typeof t == "object" && "type" in t;
}
const Mp = [], b0 = !0, Va = !1, Ha = "skip";
function Ru(t, e, n, r) {
  let i;
  typeof e == "function" && typeof n != "function" ? (r = n, n = e) : i = e;
  const o = bl(i), s = r ? -1 : 1;
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
      let h = Mp, p, k, b;
      if ((!e || o(a, u, c[c.length - 1] || void 0)) && (h = w0(n(a, c)), h[0] === Va))
        return h;
      if ("children" in a && a.children) {
        const w = (
          /** @type {UnistParent} */
          a
        );
        if (w.children && h[0] !== Ha)
          for (k = (r ? w.children.length : -1) + s, b = c.concat(w); k > -1 && k < w.children.length; ) {
            const L = w.children[k];
            if (p = l(L, k, b)(), p[0] === Va)
              return p;
            k = typeof p[1] == "number" ? p[1] : k + s;
          }
      }
      return h;
    }
  }
}
function w0(t) {
  return Array.isArray(t) ? t : typeof t == "number" ? [b0, t] : t == null ? Mp : [t];
}
function $i(t, e, n, r) {
  let i, o, s;
  typeof e == "function" && typeof n != "function" ? (o = void 0, s = e, i = n) : (o = e, s = n, i = r), Ru(t, o, l, i);
  function l(a, u) {
    const c = u[u.length - 1], f = c ? c.children.indexOf(a) : void 0;
    return s(a, f, c);
  }
}
function Tp(t, e) {
  let n = !1;
  return $i(t, function(r) {
    if ("value" in r && /\r?\n|\r/.test(r.value) || r.type === "break")
      return n = !0, Va;
  }), !!((!t.depth || t.depth < 3) && Iu(t) && (e.options.setext || n));
}
function x0(t, e, n, r) {
  const i = Math.max(Math.min(6, t.depth || 1), 1), o = n.createTracker(r);
  if (Tp(t, n)) {
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
Np.peek = C0;
function Np(t) {
  return t.value || "";
}
function C0() {
  return "<";
}
Ip.peek = S0;
function Ip(t, e, n, r) {
  const i = Du(n), o = i === '"' ? "Quote" : "Apostrophe", s = n.enter("image");
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
function S0() {
  return "!";
}
Ap.peek = v0;
function Ap(t, e, n, r) {
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
function v0() {
  return "!";
}
Ep.peek = M0;
function Ep(t, e, n) {
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
function M0() {
  return "`";
}
function Op(t, e) {
  const n = Iu(t);
  return !!(!e.options.resourceLink && // If there’s a url…
  t.url && // And there’s a no title…
  !t.title && // And the content of `node` is a single text node…
  t.children && t.children.length === 1 && t.children[0].type === "text" && // And if the url is the same as the content…
  (n === t.url || "mailto:" + n === t.url) && // And that starts w/ a protocol…
  /^[a-z][a-z+.-]+:/i.test(t.url) && // And that doesn’t contain ASCII control codes (character escapes and
  // references don’t work), space, or angle brackets…
  !/[\0- <>\u007F]/.test(t.url));
}
Dp.peek = T0;
function Dp(t, e, n, r) {
  const i = Du(n), o = i === '"' ? "Quote" : "Apostrophe", s = n.createTracker(r);
  let l, a;
  if (Op(t, n)) {
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
function T0(t, e, n) {
  return Op(t, n) ? "<" : "[";
}
Rp.peek = N0;
function Rp(t, e, n, r) {
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
function N0() {
  return "[";
}
function Lu(t) {
  const e = t.options.bullet || "*";
  if (e !== "*" && e !== "+" && e !== "-")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.bullet`, expected `*`, `+`, or `-`"
    );
  return e;
}
function I0(t) {
  const e = Lu(t), n = t.options.bulletOther;
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
function A0(t) {
  const e = t.options.bulletOrdered || ".";
  if (e !== "." && e !== ")")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.bulletOrdered`, expected `.` or `)`"
    );
  return e;
}
function Lp(t) {
  const e = t.options.rule || "*";
  if (e !== "*" && e !== "-" && e !== "_")
    throw new Error(
      "Cannot serialize rules with `" + e + "` for `options.rule`, expected `*`, `-`, or `_`"
    );
  return e;
}
function E0(t, e, n, r) {
  const i = n.enter("list"), o = n.bulletCurrent;
  let s = t.ordered ? A0(n) : Lu(n);
  const l = t.ordered ? s === "." ? ")" : "." : I0(n);
  let a = e && n.bulletLastUsed ? s === n.bulletLastUsed : !1;
  if (!t.ordered) {
    const c = t.children ? t.children[0] : void 0;
    if (
      // Bullet could be used as a thematic break marker:
      (s === "*" || s === "-") && // Empty first list item:
      c && (!c.children || !c.children[0]) && // Directly in two other list items:
      n.stack[n.stack.length - 1] === "list" && n.stack[n.stack.length - 2] === "listItem" && n.stack[n.stack.length - 3] === "list" && n.stack[n.stack.length - 4] === "listItem" && // That are each the first child.
      n.indexStack[n.indexStack.length - 1] === 0 && n.indexStack[n.indexStack.length - 2] === 0 && n.indexStack[n.indexStack.length - 3] === 0 && (a = !0), Lp(n) === s && c
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
function O0(t) {
  const e = t.options.listItemIndent || "one";
  if (e !== "tab" && e !== "one" && e !== "mixed")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.listItemIndent`, expected `tab`, `one`, or `mixed`"
    );
  return e;
}
function D0(t, e, n, r) {
  const i = O0(n);
  let o = n.bulletCurrent || Lu(n);
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
function R0(t, e, n, r) {
  const i = n.enter("paragraph"), o = n.enter("phrasing"), s = n.containerPhrasing(t, r);
  return o(), i(), s;
}
const L0 = (
  /** @type {(node?: unknown) => node is Exclude<PhrasingContent, Html>} */
  bl([
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
function P0(t, e, n, r) {
  return (t.children.some(function(s) {
    return L0(s);
  }) ? n.containerPhrasing : n.containerFlow).call(n, t, r);
}
function z0(t) {
  const e = t.options.strong || "*";
  if (e !== "*" && e !== "_")
    throw new Error(
      "Cannot serialize strong with `" + e + "` for `options.strong`, expected `*`, or `_`"
    );
  return e;
}
Pp.peek = B0;
function Pp(t, e, n, r) {
  const i = z0(n), o = n.enter("strong"), s = n.createTracker(r), l = s.move(i + i);
  let a = s.move(
    n.containerPhrasing(t, {
      after: i,
      before: l,
      ...s.current()
    })
  );
  const u = a.charCodeAt(0), c = Qs(
    r.before.charCodeAt(r.before.length - 1),
    u,
    i
  );
  c.inside && (a = tr(u) + a.slice(1));
  const f = a.charCodeAt(a.length - 1), d = Qs(r.after.charCodeAt(0), f, i);
  d.inside && (a = a.slice(0, -1) + tr(f));
  const h = s.move(i + i);
  return o(), n.attentionEncodeSurroundingInfo = {
    after: d.outside,
    before: c.outside
  }, l + a + h;
}
function B0(t, e, n) {
  return n.options.strong || "*";
}
function F0(t, e, n, r) {
  return n.safe(t.value, r);
}
function $0(t) {
  const e = t.options.ruleRepetition || 3;
  if (e < 3)
    throw new Error(
      "Cannot serialize rules with repetition `" + e + "` for `options.ruleRepetition`, expected `3` or more"
    );
  return e;
}
function _0(t, e, n) {
  const r = (Lp(n) + (n.options.ruleSpaces ? " " : "")).repeat($0(n));
  return n.options.ruleSpaces ? r.slice(0, -1) : r;
}
const Pu = {
  blockquote: o0,
  break: Xf,
  code: u0,
  definition: f0,
  emphasis: vp,
  hardBreak: Xf,
  heading: x0,
  html: Np,
  image: Ip,
  imageReference: Ap,
  inlineCode: Ep,
  link: Dp,
  linkReference: Rp,
  list: E0,
  listItem: D0,
  paragraph: R0,
  root: P0,
  strong: Pp,
  text: F0,
  thematicBreak: _0
}, V0 = [H0];
function H0(t, e, n, r) {
  if (e.type === "code" && _a(e, r) && (t.type === "list" || t.type === e.type && _a(t, r)))
    return !1;
  if ("spread" in n && typeof n.spread == "boolean")
    return t.type === "paragraph" && // Two paragraphs.
    (t.type === e.type || e.type === "definition" || // Paragraph followed by a setext heading.
    e.type === "heading" && Tp(e, r)) ? void 0 : n.spread ? 1 : 0;
}
const fr = [
  "autolink",
  "destinationLiteral",
  "destinationRaw",
  "reference",
  "titleQuote",
  "titleApostrophe"
], j0 = [
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
function W0(t) {
  return t.label || !t.identifier ? t.label || "" : bp(t.identifier);
}
function q0(t) {
  if (!t._compiled) {
    const e = (t.atBreak ? "[\\r\\n][\\t ]*" : "") + (t.before ? "(?:" + t.before + ")" : "");
    t._compiled = new RegExp(
      (e ? "(" + e + ")" : "") + (/[|\\{}()[\]^$+*?.-]/.test(t.character) ? "\\" : "") + t.character + (t.after ? "(?:" + t.after + ")" : ""),
      "g"
    );
  }
  return t._compiled;
}
function K0(t, e, n) {
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
function U0(t, e, n) {
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
      o.move(J0(a, i[l + 1], t, e))
    );
  }
  return r.pop(), s.join("");
}
function J0(t, e, n, r) {
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
const G0 = /\r?\n|\r/g;
function Y0(t, e) {
  const n = [];
  let r = 0, i = 0, o;
  for (; o = G0.exec(t); )
    s(t.slice(r, o.index)), n.push(o[0]), r = o.index + o[0].length, i++;
  return s(t.slice(r)), n.join("");
  function s(l) {
    n.push(e(l, i, !l));
  }
}
function Q0(t, e, n) {
  const r = (n.before || "") + (e || "") + (n.after || ""), i = [], o = [], s = {};
  let l = -1;
  for (; ++l < t.unsafe.length; ) {
    const c = t.unsafe[l];
    if (!Sp(t.stack, c))
      continue;
    const f = t.compilePattern(c);
    let d;
    for (; d = f.exec(r); ) {
      const h = "before" in c || !!c.atBreak, p = "after" in c, k = d.index + (h ? d[1].length : 0);
      i.includes(k) ? (s[k].before && !h && (s[k].before = !1), s[k].after && !p && (s[k].after = !1)) : (i.push(k), s[k] = { before: h, after: p });
    }
  }
  i.sort(X0);
  let a = n.before ? n.before.length : 0;
  const u = r.length - (n.after ? n.after.length : 0);
  for (l = -1; ++l < i.length; ) {
    const c = i[l];
    c < a || c >= u || c + 1 < u && i[l + 1] === c + 1 && s[c].after && !s[c + 1].before && !s[c + 1].after || i[l - 1] === c - 1 && s[c].before && !s[c - 1].before && !s[c - 1].after || (a !== c && o.push(Zf(r.slice(a, c), "\\")), a = c, /[!-/:-@[-`{-~]/.test(r.charAt(c)) && (!n.encode || !n.encode.includes(r.charAt(c))) ? o.push("\\") : (o.push(tr(r.charCodeAt(c))), a++));
  }
  return o.push(Zf(r.slice(a, u), n.after)), o.join("");
}
function X0(t, e) {
  return t - e;
}
function Zf(t, e) {
  const n = /\\(?=[!-/:-@[-`{-~])/g, r = [], i = [], o = t + e;
  let s = -1, l = 0, a;
  for (; a = n.exec(o); )
    r.push(a.index);
  for (; ++s < r.length; )
    l !== r[s] && i.push(t.slice(l, r[s])), i.push("\\"), l = r[s];
  return i.push(t.slice(l)), i.join("");
}
function Z0(t) {
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
function ew(t, e) {
  const n = e || {}, r = {
    associationId: W0,
    containerPhrasing: iw,
    containerFlow: ow,
    createTracker: Z0,
    compilePattern: q0,
    enter: o,
    // @ts-expect-error: GFM / frontmatter are typed in `mdast` but not defined
    // here.
    handlers: { ...Pu },
    // @ts-expect-error: add `handle` in a second.
    handle: void 0,
    indentLines: Y0,
    indexStack: [],
    join: [...V0],
    options: {},
    safe: sw,
    stack: [],
    unsafe: [...j0]
  };
  Cp(r, n), r.options.tightDefinitions && r.join.push(rw), r.handle = n0("type", {
    invalid: tw,
    unknown: nw,
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
function tw(t) {
  throw new Error("Cannot handle value `" + t + "`, expected node");
}
function nw(t) {
  const e = (
    /** @type {Nodes} */
    t
  );
  throw new Error("Cannot handle unknown node `" + e.type + "`");
}
function rw(t, e) {
  if (t.type === "definition" && t.type === e.type)
    return 0;
}
function iw(t, e) {
  return K0(t, this, e);
}
function ow(t, e) {
  return U0(t, this, e);
}
function sw(t, e) {
  return Q0(this, t, e);
}
function ja(t) {
  const e = this;
  e.compiler = n;
  function n(r) {
    return ew(r, {
      ...e.data("settings"),
      ...t,
      // Note: this option is not in the readme.
      // The goal is for it to be set by plugins on `data` instead of being
      // passed by users.
      extensions: e.data("toMarkdownExtensions") || []
    });
  }
}
function ed(t) {
  if (t)
    throw t;
}
function lw(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var zs = Object.prototype.hasOwnProperty, zp = Object.prototype.toString, td = Object.defineProperty, nd = Object.getOwnPropertyDescriptor, rd = function(e) {
  return typeof Array.isArray == "function" ? Array.isArray(e) : zp.call(e) === "[object Array]";
}, id = function(e) {
  if (!e || zp.call(e) !== "[object Object]")
    return !1;
  var n = zs.call(e, "constructor"), r = e.constructor && e.constructor.prototype && zs.call(e.constructor.prototype, "isPrototypeOf");
  if (e.constructor && !n && !r)
    return !1;
  var i;
  for (i in e)
    ;
  return typeof i > "u" || zs.call(e, i);
}, od = function(e, n) {
  td && n.name === "__proto__" ? td(e, n.name, {
    enumerable: !0,
    configurable: !0,
    value: n.newValue,
    writable: !0
  }) : e[n.name] = n.newValue;
}, sd = function(e, n) {
  if (n === "__proto__")
    if (zs.call(e, n)) {
      if (nd)
        return nd(e, n).value;
    } else return;
  return e[n];
}, aw = function t() {
  var e, n, r, i, o, s, l = arguments[0], a = 1, u = arguments.length, c = !1;
  for (typeof l == "boolean" && (c = l, l = arguments[1] || {}, a = 2), (l == null || typeof l != "object" && typeof l != "function") && (l = {}); a < u; ++a)
    if (e = arguments[a], e != null)
      for (n in e)
        r = sd(l, n), i = sd(e, n), l !== i && (c && i && (id(i) || (o = rd(i))) ? (o ? (o = !1, s = r && rd(r) ? r : []) : s = r && id(r) ? r : {}, od(l, { name: n, newValue: t(c, s, i) })) : typeof i < "u" && od(l, { name: n, newValue: i }));
  return l;
};
const _l = /* @__PURE__ */ lw(aw);
function Wa(t) {
  if (typeof t != "object" || t === null)
    return !1;
  const e = Object.getPrototypeOf(t);
  return (e === null || e === Object.prototype || Object.getPrototypeOf(e) === null) && !(Symbol.toStringTag in t) && !(Symbol.iterator in t);
}
function uw() {
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
      i = u, c ? cw(c, l)(...u) : s(null, ...u);
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
function cw(t, e) {
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
class kt extends Error {
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
kt.prototype.file = "";
kt.prototype.name = "";
kt.prototype.reason = "";
kt.prototype.message = "";
kt.prototype.stack = "";
kt.prototype.column = void 0;
kt.prototype.line = void 0;
kt.prototype.ancestors = void 0;
kt.prototype.cause = void 0;
kt.prototype.fatal = void 0;
kt.prototype.place = void 0;
kt.prototype.ruleId = void 0;
kt.prototype.source = void 0;
const Ut = { basename: fw, dirname: dw, extname: hw, join: pw, sep: "/" };
function fw(t, e) {
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
function dw(t) {
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
function hw(t) {
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
function pw(...t) {
  let e = -1, n;
  for (; ++e < t.length; )
    ns(t[e]), t[e] && (n = n === void 0 ? t[e] : n + "/" + t[e]);
  return n === void 0 ? "." : mw(n);
}
function mw(t) {
  ns(t);
  const e = t.codePointAt(0) === 47;
  let n = gw(t, !e);
  return n.length === 0 && !e && (n = "."), n.length > 0 && t.codePointAt(t.length - 1) === 47 && (n += "/"), e ? "/" + n : n;
}
function gw(t, e) {
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
const yw = { cwd: kw };
function kw() {
  return "/";
}
function qa(t) {
  return !!(t !== null && typeof t == "object" && "href" in t && t.href && "protocol" in t && t.protocol && // @ts-expect-error: indexing is fine.
  t.auth === void 0);
}
function bw(t) {
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
  return ww(t);
}
function ww(t) {
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
const Vl = (
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
class xw {
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
    e ? qa(e) ? n = { path: e } : typeof e == "string" || Cw(e) ? n = { value: e } : n = e : n = {}, this.cwd = "cwd" in n ? "" : yw.cwd(), this.data = {}, this.history = [], this.messages = [], this.value, this.map, this.result, this.stored;
    let r = -1;
    for (; ++r < Vl.length; ) {
      const o = Vl[r];
      o in n && n[o] !== void 0 && n[o] !== null && (this[o] = o === "history" ? [...n[o]] : n[o]);
    }
    let i;
    for (i in n)
      Vl.includes(i) || (this[i] = n[i]);
  }
  /**
   * Get the basename (including extname) (example: `'index.min.js'`).
   *
   * @returns {string | undefined}
   *   Basename.
   */
  get basename() {
    return typeof this.path == "string" ? Ut.basename(this.path) : void 0;
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
    jl(e, "basename"), Hl(e, "basename"), this.path = Ut.join(this.dirname || "", e);
  }
  /**
   * Get the parent path (example: `'~'`).
   *
   * @returns {string | undefined}
   *   Dirname.
   */
  get dirname() {
    return typeof this.path == "string" ? Ut.dirname(this.path) : void 0;
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
    ld(this.basename, "dirname"), this.path = Ut.join(e || "", this.basename);
  }
  /**
   * Get the extname (including dot) (example: `'.js'`).
   *
   * @returns {string | undefined}
   *   Extname.
   */
  get extname() {
    return typeof this.path == "string" ? Ut.extname(this.path) : void 0;
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
    if (Hl(e, "extname"), ld(this.dirname, "extname"), e) {
      if (e.codePointAt(0) !== 46)
        throw new Error("`extname` must start with `.`");
      if (e.includes(".", 1))
        throw new Error("`extname` cannot contain multiple dots");
    }
    this.path = Ut.join(this.dirname, this.stem + (e || ""));
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
    qa(e) && (e = bw(e)), jl(e, "path"), this.path !== e && this.history.push(e);
  }
  /**
   * Get the stem (basename w/o extname) (example: `'index.min'`).
   *
   * @returns {string | undefined}
   *   Stem.
   */
  get stem() {
    return typeof this.path == "string" ? Ut.basename(this.path, this.extname) : void 0;
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
    jl(e, "stem"), Hl(e, "stem"), this.path = Ut.join(this.dirname || "", e + (this.extname || ""));
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
    const i = new kt(
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
function Hl(t, e) {
  if (t && t.includes(Ut.sep))
    throw new Error(
      "`" + e + "` cannot be a path: did not expect `" + Ut.sep + "`"
    );
}
function jl(t, e) {
  if (!t)
    throw new Error("`" + e + "` cannot be empty");
}
function ld(t, e) {
  if (!t)
    throw new Error("Setting `" + e + "` requires `path` to be set too");
}
function Cw(t) {
  return !!(t && typeof t == "object" && "byteLength" in t && "byteOffset" in t);
}
const Sw = (
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
), vw = {}.hasOwnProperty;
class zu extends Sw {
  /**
   * Create a processor.
   */
  constructor() {
    super("copy"), this.Compiler = void 0, this.Parser = void 0, this.attachers = [], this.compiler = void 0, this.freezeIndex = -1, this.frozen = void 0, this.namespace = {}, this.parser = void 0, this.transformers = uw();
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
      new zu()
    );
    let n = -1;
    for (; ++n < this.attachers.length; ) {
      const r = this.attachers[n];
      e.use(...r);
    }
    return e.data(_l(!0, {}, this.namespace)), e;
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
    return typeof e == "string" ? arguments.length === 2 ? (Kl("data", this.frozen), this.namespace[e] = n, this) : vw.call(this.namespace, e) && this.namespace[e] || void 0 : e ? (Kl("data", this.frozen), this.namespace = e, this) : this.namespace;
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
    const n = Ms(e), r = this.parser || this.Parser;
    return Wl("parse", r), r(String(n), n);
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
    return this.freeze(), Wl("process", this.parser || this.Parser), ql("process", this.compiler || this.Compiler), n ? i(void 0, n) : new Promise(i);
    function i(o, s) {
      const l = Ms(e), a = (
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
        Tw(p) ? d.value = p : d.result = p, u(
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
    return this.freeze(), Wl("processSync", this.parser || this.Parser), ql("processSync", this.compiler || this.Compiler), this.process(e, i), ud("processSync", "process", n), r;
    function i(o, s) {
      n = !0, ed(o), r = s;
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
    ad(e), this.freeze();
    const i = this.transformers;
    return !r && typeof n == "function" && (r = n, n = void 0), r ? o(void 0, r) : new Promise(o);
    function o(s, l) {
      const a = Ms(n);
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
    return this.run(e, n, o), ud("runSync", "run", r), i;
    function o(s, l) {
      ed(s), i = l, r = !0;
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
    const r = Ms(n), i = this.compiler || this.Compiler;
    return ql("stringify", i), ad(e), i(e, r);
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
    if (Kl("use", this.frozen), e != null) if (typeof e == "function")
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
      l(u.plugins), u.settings && (i.settings = _l(!0, i.settings, u.settings));
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
        Wa(k) && Wa(h) && (h = _l(!0, k, h)), r[d] = [u, h, ...p];
      }
    }
  }
}
const Ka = new zu().freeze();
function Wl(t, e) {
  if (typeof e != "function")
    throw new TypeError("Cannot `" + t + "` without `parser`");
}
function ql(t, e) {
  if (typeof e != "function")
    throw new TypeError("Cannot `" + t + "` without `compiler`");
}
function Kl(t, e) {
  if (e)
    throw new Error(
      "Cannot call `" + t + "` on a frozen processor.\nCreate a new processor first, by calling it: use `processor()` instead of `processor`."
    );
}
function ad(t) {
  if (!Wa(t) || typeof t.type != "string")
    throw new TypeError("Expected node, got `" + t + "`");
}
function ud(t, e, n) {
  if (!n)
    throw new Error(
      "`" + t + "` finished async. Use `" + e + "` instead"
    );
}
function Ms(t) {
  return Mw(t) ? t : new xw(t);
}
function Mw(t) {
  return !!(t && typeof t == "object" && "message" in t && "messages" in t);
}
function Tw(t) {
  return typeof t == "string" || Nw(t);
}
function Nw(t) {
  return !!(t && typeof t == "object" && "byteLength" in t && "byteOffset" in t);
}
function We(t) {
  this.content = t;
}
We.prototype = {
  constructor: We,
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
    return i == -1 ? o.push(n || t, e) : (o[i + 1] = e, n && (o[i] = n)), new We(o);
  },
  // :: (string) → OrderedMap
  // Return a map with the given key removed, if it existed.
  remove: function(t) {
    var e = this.find(t);
    if (e == -1) return this;
    var n = this.content.slice();
    return n.splice(e, 2), new We(n);
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the start of the map.
  addToStart: function(t, e) {
    return new We([t, e].concat(this.remove(t).content));
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the end of the map.
  addToEnd: function(t, e) {
    var n = this.remove(t).content.slice();
    return n.push(t, e), new We(n);
  },
  // :: (string, string, any) → OrderedMap
  // Add a key after the given key. If `place` is not found, the new
  // key is added to the end.
  addBefore: function(t, e, n) {
    var r = this.remove(e), i = r.content.slice(), o = r.find(t);
    return i.splice(o == -1 ? i.length : o, 0, e, n), new We(i);
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
    return t = We.from(t), t.size ? new We(t.content.concat(this.subtract(t).content)) : this;
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a new map by appending the keys in this map that don't
  // appear in `map` after the keys in `map`.
  append: function(t) {
    return t = We.from(t), t.size ? new We(this.subtract(t).content.concat(t.content)) : this;
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a map containing all the keys in this map that don't
  // appear in `map`.
  subtract: function(t) {
    var e = this;
    t = We.from(t);
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
We.from = function(t) {
  if (t instanceof We) return t;
  var e = [];
  if (t) for (var n in t) e.push(n, t[n]);
  return new We(e);
};
function Bp(t, e, n) {
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
      let s = Bp(i.content, o.content, n + 1);
      if (s != null)
        return s;
    }
    n += i.nodeSize;
  }
}
function Fp(t, e, n, r) {
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
      let u = Fp(s.content, l.content, n - 1, r - 1);
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
    return Bp(this, e, n);
  }
  /**
  Find the first position, searching from the end, at which this
  fragment and the given fragment differ, or `null` if they are
  the same. Since this position will not be the same in both
  nodes, an object with two separate positions is returned.
  */
  findDiffEnd(e, n = this.size, r = e.size) {
    return Fp(this, e, n, r);
  }
  /**
  Find the index and inner offset corresponding to a given relative
  position in this fragment. The result object will be reused
  (overwritten) the next time the function is called. @internal
  */
  findIndex(e) {
    if (e == 0)
      return Ts(0, e);
    if (e == this.size)
      return Ts(this.content.length, e);
    if (e > this.size || e < 0)
      throw new RangeError(`Position ${e} outside of fragment (${this})`);
    for (let n = 0, r = 0; ; n++) {
      let i = this.child(n), o = r + i.nodeSize;
      if (o >= e)
        return o == e ? Ts(n + 1, o) : Ts(n, r);
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
const Ul = { index: 0, offset: 0 };
function Ts(t, e) {
  return Ul.index = t, Ul.offset = e, Ul;
}
function Xs(t, e) {
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
      if (!Xs(t[r], e[r]))
        return !1;
  } else {
    for (let r in t)
      if (!(r in e) || !Xs(t[r], e[r]))
        return !1;
    for (let r in e)
      if (!(r in t))
        return !1;
  }
  return !0;
}
class he {
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
    return this == e || this.type == e.type && Xs(this.attrs, e.attrs);
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
      return he.none;
    if (e instanceof he)
      return [e];
    let n = e.slice();
    return n.sort((r, i) => r.type.rank - i.type.rank), n;
  }
}
he.none = [];
class Zs extends Error {
}
class V {
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
    let r = _p(this.content, e + this.openStart, n);
    return r && new V(r, this.openStart, this.openEnd);
  }
  /**
  @internal
  */
  removeBetween(e, n) {
    return new V($p(this.content, e + this.openStart, n + this.openStart), this.openStart, this.openEnd);
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
      return V.empty;
    let r = n.openStart || 0, i = n.openEnd || 0;
    if (typeof r != "number" || typeof i != "number")
      throw new RangeError("Invalid input for Slice.fromJSON");
    return new V(R.fromJSON(e, n.content), r, i);
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
    return new V(e, r, i);
  }
}
V.empty = new V(R.empty, 0, 0);
function $p(t, e, n) {
  let { index: r, offset: i } = t.findIndex(e), o = t.maybeChild(r), { index: s, offset: l } = t.findIndex(n);
  if (i == e || o.isText) {
    if (l != n && !t.child(s).isText)
      throw new RangeError("Removing non-flat range");
    return t.cut(0, e).append(t.cut(n));
  }
  if (r != s)
    throw new RangeError("Removing non-flat range");
  return t.replaceChild(r, o.copy($p(o.content, e - i - 1, n - i - 1)));
}
function _p(t, e, n, r) {
  let { index: i, offset: o } = t.findIndex(e), s = t.maybeChild(i);
  if (o == e || s.isText)
    return r && !r.canReplace(i, i, n) ? null : t.cut(0, e).append(n).append(t.cut(e));
  let l = _p(s.content, e - o - 1, n, s);
  return l && t.replaceChild(i, s.copy(l));
}
function Iw(t, e, n) {
  if (n.openStart > t.depth)
    throw new Zs("Inserted content deeper than insertion position");
  if (t.depth - n.openStart != e.depth - n.openEnd)
    throw new Zs("Inconsistent open depths");
  return Vp(t, e, n, 0);
}
function Vp(t, e, n, r) {
  let i = t.index(r), o = t.node(r);
  if (i == e.index(r) && r < t.depth - n.openStart) {
    let s = Vp(t, e, n, r + 1);
    return o.copy(o.content.replaceChild(i, s));
  } else if (n.content.size)
    if (!n.openStart && !n.openEnd && t.depth == r && e.depth == r) {
      let s = t.parent, l = s.content;
      return Nr(s, l.cut(0, t.parentOffset).append(n.content).append(l.cut(e.parentOffset)));
    } else {
      let { start: s, end: l } = Aw(n, t);
      return Nr(o, jp(t, s, l, e, r));
    }
  else return Nr(o, el(t, e, r));
}
function Hp(t, e) {
  if (!e.type.compatibleContent(t.type))
    throw new Zs("Cannot join " + e.type.name + " onto " + t.type.name);
}
function Ua(t, e, n) {
  let r = t.node(n);
  return Hp(r, e.node(n)), r;
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
function jp(t, e, n, r, i) {
  let o = t.depth > i && Ua(t, e, i + 1), s = r.depth > i && Ua(n, r, i + 1), l = [];
  return ho(null, t, i, l), o && s && e.index(i) == n.index(i) ? (Hp(o, s), Tr(Nr(o, jp(t, e, n, r, i + 1)), l)) : (o && Tr(Nr(o, el(t, e, i + 1)), l), ho(e, n, i, l), s && Tr(Nr(s, el(n, r, i + 1)), l)), ho(r, null, i, l), new R(l);
}
function el(t, e, n) {
  let r = [];
  if (ho(null, t, n, r), t.depth > n) {
    let i = Ua(t, e, n + 1);
    Tr(Nr(i, el(t, e, n + 1)), r);
  }
  return ho(e, null, n, r), new R(r);
}
function Aw(t, e) {
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
      return he.none;
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
        return new Wp(this, e, r);
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
    let r = cd.get(e);
    if (r)
      for (let o = 0; o < r.elts.length; o++) {
        let s = r.elts[o];
        if (s.pos == n)
          return s;
      }
    else
      cd.set(e, r = new Ew());
    let i = r.elts[r.i] = No.resolve(e, n);
    return r.i = (r.i + 1) % Ow, i;
  }
}
class Ew {
  constructor() {
    this.elts = [], this.i = 0;
  }
}
const Ow = 12, cd = /* @__PURE__ */ new WeakMap();
class Wp {
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
const Dw = /* @__PURE__ */ Object.create(null);
let Sn = class Ja {
  /**
  @internal
  */
  constructor(e, n, r, i = he.none) {
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
    return this.type == e && Xs(this.attrs, n || e.defaultAttrs || Dw) && he.sameSet(this.marks, r || he.none);
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
      return V.empty;
    let i = this.resolve(e), o = this.resolve(n), s = r ? 0 : i.sharedDepth(n), l = i.start(s), u = i.node(s).content.cut(i.pos - l, o.pos - l);
    return new V(u, i.depth - s, o.depth - s);
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
    return Iw(this.resolve(e), this.resolve(n), r);
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
    return this.content.size && (e += "(" + this.content.toStringInner() + ")"), qp(this.marks, e);
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
    let e = he.none;
    for (let n = 0; n < this.marks.length; n++) {
      let r = this.marks[n];
      r.type.checkAttrs(r.attrs), e = r.addToSet(e);
    }
    if (!he.sameSet(e, this.marks))
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
Sn.prototype.text = void 0;
class tl extends Sn {
  /**
  @internal
  */
  constructor(e, n, r, i) {
    if (super(e, n, null, i), !r)
      throw new RangeError("Empty text nodes are not allowed");
    this.text = r;
  }
  toString() {
    return this.type.spec.toDebugString ? this.type.spec.toDebugString(this) : qp(this.marks, JSON.stringify(this.text));
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
    return e == this.marks ? this : new tl(this.type, this.attrs, this.text, e);
  }
  withText(e) {
    return e == this.text ? this : new tl(this.type, this.attrs, e, this.marks);
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
function qp(t, e) {
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
    let r = new Rw(e, n);
    if (r.next == null)
      return $r.empty;
    let i = Kp(r);
    r.next && r.err("Unexpected trailing text");
    let o = _w($w(i));
    return Vw(o, r), o;
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
class Rw {
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
function Kp(t) {
  let e = [];
  do
    e.push(Lw(t));
  while (t.eat("|"));
  return e.length == 1 ? e[0] : { type: "choice", exprs: e };
}
function Lw(t) {
  let e = [];
  do
    e.push(Pw(t));
  while (t.next && t.next != ")" && t.next != "|");
  return e.length == 1 ? e[0] : { type: "seq", exprs: e };
}
function Pw(t) {
  let e = Fw(t);
  for (; ; )
    if (t.eat("+"))
      e = { type: "plus", expr: e };
    else if (t.eat("*"))
      e = { type: "star", expr: e };
    else if (t.eat("?"))
      e = { type: "opt", expr: e };
    else if (t.eat("{"))
      e = zw(t, e);
    else
      break;
  return e;
}
function fd(t) {
  /\D/.test(t.next) && t.err("Expected number, got '" + t.next + "'");
  let e = Number(t.next);
  return t.pos++, e;
}
function zw(t, e) {
  let n = fd(t), r = n;
  return t.eat(",") && (t.next != "}" ? r = fd(t) : r = -1), t.eat("}") || t.err("Unclosed braced range"), { type: "range", min: n, max: r, expr: e };
}
function Bw(t, e) {
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
function Fw(t) {
  if (t.eat("(")) {
    let e = Kp(t);
    return t.eat(")") || t.err("Missing closing paren"), e;
  } else if (/\W/.test(t.next))
    t.err("Unexpected token '" + t.next + "'");
  else {
    let e = Bw(t, t.next).map((n) => (t.inline == null ? t.inline = n.isInline : t.inline != n.isInline && t.err("Mixing inline and block content"), { type: "name", value: n }));
    return t.pos++, e.length == 1 ? e[0] : { type: "choice", exprs: e };
  }
}
function $w(t) {
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
function Up(t, e) {
  return e - t;
}
function dd(t, e) {
  let n = [];
  return r(e), n.sort(Up);
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
function _w(t) {
  let e = /* @__PURE__ */ Object.create(null);
  return n(dd(t, 0));
  function n(r) {
    let i = [];
    r.forEach((s) => {
      t[s].forEach(({ term: l, to: a }) => {
        if (!l)
          return;
        let u;
        for (let c = 0; c < i.length; c++)
          i[c][0] == l && (u = i[c][1]);
        dd(t, a).forEach((c) => {
          u || i.push([l, u = []]), u.indexOf(c) == -1 && u.push(c);
        });
      });
    });
    let o = e[r.join(",")] = new $r(r.indexOf(t.length - 1) > -1);
    for (let s = 0; s < i.length; s++) {
      let l = i[s][1].sort(Up);
      o.next.push({ type: i[s][0], next: e[l.join(",")] || n(l) });
    }
    return o;
  }
}
function Vw(t, e) {
  for (let n = 0, r = [t]; n < r.length; n++) {
    let i = r[n], o = !i.validEnd, s = [];
    for (let l = 0; l < i.next.length; l++) {
      let { type: a, next: u } = i.next[l];
      s.push(a.name), o && !(a.isText || a.hasRequiredAttrs()) && (o = !1), r.indexOf(u) == -1 && r.push(u);
    }
    o && e.err("Only non-generatable nodes (" + s.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
  }
}
function Jp(t) {
  let e = /* @__PURE__ */ Object.create(null);
  for (let n in t) {
    let r = t[n];
    if (!r.hasDefault)
      return null;
    e[n] = r.default;
  }
  return e;
}
function Gp(t, e) {
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
function Yp(t, e, n, r) {
  for (let i in e)
    if (!(i in t))
      throw new RangeError(`Unsupported attribute ${i} for ${n} of type ${i}`);
  for (let i in t) {
    let o = t[i];
    o.validate && o.validate(e[i]);
  }
}
function Qp(t, e) {
  let n = /* @__PURE__ */ Object.create(null);
  if (e)
    for (let r in e)
      n[r] = new jw(t, r, e[r]);
  return n;
}
let hd = class Xp {
  /**
  @internal
  */
  constructor(e, n, r) {
    this.name = e, this.schema = n, this.spec = r, this.markSet = null, this.groups = r.group ? r.group.split(" ") : [], this.attrs = Qp(e, r.attrs), this.defaultAttrs = Jp(this.attrs), this.contentMatch = null, this.inlineContent = null, this.isBlock = !(r.inline || e == "text"), this.isText = e == "text";
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
    return !e && this.defaultAttrs ? this.defaultAttrs : Gp(this.attrs, e);
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
    return new Sn(this, this.computeAttrs(e), R.from(n), he.setFrom(r));
  }
  /**
  Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but check the given content
  against the node type's content restrictions, and throw an error
  if it doesn't match.
  */
  createChecked(e = null, n, r) {
    return n = R.from(n), this.checkContent(n), new Sn(this, this.computeAttrs(e), n, he.setFrom(r));
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
    return o ? new Sn(this, e, n.append(o), he.setFrom(r)) : null;
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
    Yp(this.attrs, e, "node", this.name);
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
    return n ? n.length ? n : he.none : e;
  }
  /**
  @internal
  */
  static compile(e, n) {
    let r = /* @__PURE__ */ Object.create(null);
    e.forEach((o, s) => r[o] = new Xp(o, n, s));
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
function Hw(t, e, n) {
  let r = n.split("|");
  return (i) => {
    let o = i === null ? "null" : typeof i;
    if (r.indexOf(o) < 0)
      throw new RangeError(`Expected value of type ${r} for attribute ${e} on type ${t}, got ${o}`);
  };
}
class jw {
  constructor(e, n, r) {
    this.hasDefault = Object.prototype.hasOwnProperty.call(r, "default"), this.default = r.default, this.validate = typeof r.validate == "string" ? Hw(e, n, r.validate) : r.validate;
  }
  get isRequired() {
    return !this.hasDefault;
  }
}
class xl {
  /**
  @internal
  */
  constructor(e, n, r, i) {
    this.name = e, this.rank = n, this.schema = r, this.spec = i, this.attrs = Qp(e, i.attrs), this.excluded = null;
    let o = Jp(this.attrs);
    this.instance = o ? new he(this, o) : null;
  }
  /**
  Create a mark of this type. `attrs` may be `null` or an object
  containing only some of the mark's attributes. The others, if
  they have defaults, will be added.
  */
  create(e = null) {
    return !e && this.instance ? this.instance : new he(this, Gp(this.attrs, e));
  }
  /**
  @internal
  */
  static compile(e, n) {
    let r = /* @__PURE__ */ Object.create(null), i = 0;
    return e.forEach((o, s) => r[o] = new xl(o, i++, n, s)), r;
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
    Yp(this.attrs, e, "mark", this.name);
  }
  /**
  Queries whether a given mark type is
  [excluded](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) by this one.
  */
  excludes(e) {
    return this.excluded.indexOf(e) > -1;
  }
}
class Ww {
  /**
  Construct a schema from a schema [specification](https://prosemirror.net/docs/ref/#model.SchemaSpec).
  */
  constructor(e) {
    this.linebreakReplacement = null, this.cached = /* @__PURE__ */ Object.create(null);
    let n = this.spec = {};
    for (let i in e)
      n[i] = e[i];
    n.nodes = We.from(e.nodes), n.marks = We.from(e.marks || {}), this.nodes = hd.compile(this.spec.nodes, this), this.marks = xl.compile(this.spec.marks, this);
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
      o.markSet = l == "_" ? null : l ? pd(this, l.split(" ")) : l == "" || !o.inlineContent ? [] : null;
    }
    for (let i in this.marks) {
      let o = this.marks[i], s = o.spec.excludes;
      o.excluded = s == null ? [o] : s == "" ? [] : pd(this, s.split(" "));
    }
    this.nodeFromJSON = (i) => Sn.fromJSON(this, i), this.markFromJSON = (i) => he.fromJSON(this, i), this.topNodeType = this.nodes[this.spec.topNode || "doc"], this.cached.wrappings = /* @__PURE__ */ Object.create(null);
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
    else if (e instanceof hd) {
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
    return new tl(r, r.defaultAttrs, e, he.setFrom(n));
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
function pd(t, e) {
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
function qw(t) {
  return t.tag != null;
}
function Kw(t) {
  return t.style != null;
}
let Bu = class Ga {
  /**
  Create a parser that targets the given schema, using the given
  parsing rules.
  */
  constructor(e, n) {
    this.schema = e, this.rules = n, this.tags = [], this.styles = [];
    let r = this.matchedStyles = [];
    n.forEach((i) => {
      if (qw(i))
        this.tags.push(i);
      else if (Kw(i)) {
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
    let r = new gd(this, n, !1);
    return r.addAll(e, he.none, n.from, n.to), r.finish();
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
    let r = new gd(this, n, !0);
    return r.addAll(e, he.none, n.from, n.to), V.maxOpen(r.finish());
  }
  /**
  @internal
  */
  matchTag(e, n, r) {
    for (let i = r ? this.tags.indexOf(r) + 1 : 0; i < this.tags.length; i++) {
      let o = this.tags[i];
      if (Gw(e, o.tag) && (o.namespace === void 0 || e.namespaceURI == o.namespace) && (!o.context || n.matchesContext(o.context))) {
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
        r(s = yd(s)), s.mark || s.ignore || s.clearMark || (s.mark = i);
      });
    }
    for (let i in e.nodes) {
      let o = e.nodes[i].spec.parseDOM;
      o && o.forEach((s) => {
        r(s = yd(s)), s.node || s.ignore || s.mark || (s.node = i);
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
const Zp = {
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
}, Uw = {
  head: !0,
  noscript: !0,
  object: !0,
  script: !0,
  style: !0,
  title: !0
}, em = { ol: !0, ul: !0 }, Io = 1, Ya = 2, po = 4;
function md(t, e, n) {
  return e != null ? (e ? Io : 0) | (e === "full" ? Ya : 0) : t && t.whitespace == "pre" ? Io | Ya : n & ~po;
}
class Ns {
  constructor(e, n, r, i, o, s) {
    this.type = e, this.attrs = n, this.marks = r, this.solid = i, this.options = s, this.content = [], this.activeMarks = he.none, this.match = o || (s & po ? null : e.contentMatch);
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
    return this.type ? this.type.inlineContent : this.content.length ? this.content[0].isInline : e.parentNode && !Zp.hasOwnProperty(e.parentNode.nodeName.toLowerCase());
  }
}
class gd {
  constructor(e, n, r) {
    this.parser = e, this.options = n, this.isOpen = r, this.open = 0, this.localPreserveWS = !1;
    let i = n.topNode, o, s = md(null, n.preserveWhitespace, 0) | (r ? po : 0);
    i ? o = new Ns(i.type, i.attrs, he.none, !0, n.topMatch || i.type.contentMatch, s) : r ? o = new Ns(null, null, he.none, !0, null, s) : o = new Ns(e.schema.topNodeType, null, he.none, !0, null, s), this.nodes = [o], this.find = n.findPositions, this.needsBlock = !1;
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
    em.hasOwnProperty(s) && this.parser.normalizeLists && Jw(e);
    let a = this.options.ruleFromNode && this.options.ruleFromNode(e) || (l = this.parser.matchTag(e, this, r));
    e: if (a ? a.ignore : Uw.hasOwnProperty(s))
      this.findInside(e), this.ignoreFallback(e, n);
    else if (!a || a.skip || a.closeParent) {
      a && a.closeParent ? this.open = Math.max(0, this.open - 1) : a && a.skip.nodeType && (e = a.skip);
      let u, c = this.needsBlock;
      if (Zp.hasOwnProperty(s))
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
      let s = he.none;
      for (let l of i.concat(e.marks))
        (o.type ? o.type.allowsMarkType(l.type) : kd(l.type, e.type)) && (s = l.addToSet(s));
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
    let l = md(e, o, s.options);
    s.options & po && s.content.length == 0 && (l |= po);
    let a = he.none;
    return r = r.filter((u) => (s.type ? s.type.allowsMarkType(u.type) : kd(u.type, e)) ? (a = u.addToSet(a), !1) : !0), this.nodes.push(new Ns(e, n, a, i, null, l)), this.open++, r;
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
function Jw(t) {
  for (let e = t.firstChild, n = null; e; e = e.nextSibling) {
    let r = e.nodeType == 1 ? e.nodeName.toLowerCase() : null;
    r && em.hasOwnProperty(r) && n ? (n.appendChild(e), e = n) : r == "li" ? n = e : r && (n = null);
  }
}
function Gw(t, e) {
  return (t.matches || t.msMatchesSelector || t.webkitMatchesSelector || t.mozMatchesSelector).call(t, e);
}
function yd(t) {
  let e = {};
  for (let n in t)
    e[n] = t[n];
  return e;
}
function kd(t, e) {
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
    r || (r = Jl(n).createDocumentFragment());
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
    let { dom: r, contentDOM: i } = Bs(Jl(n), this.nodes[e.type.name](e), null, e.attrs);
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
    return i && Bs(Jl(r), i(e, n), null, e.attrs);
  }
  static renderSpec(e, n, r = null, i) {
    return Bs(e, n, r, i);
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
    let n = bd(e.nodes);
    return n.text || (n.text = (r) => r.text), n;
  }
  /**
  Gather the serializers in a schema's mark specs into an object.
  */
  static marksFromSchema(e) {
    return bd(e.marks);
  }
}
function bd(t) {
  let e = {};
  for (let n in t) {
    let r = t[n].spec.toDOM;
    r && (e[n] = r);
  }
  return e;
}
function Jl(t) {
  return t.document || window.document;
}
const wd = /* @__PURE__ */ new WeakMap();
function Yw(t) {
  let e = wd.get(t);
  return e === void 0 && wd.set(t, e = Qw(t)), e;
}
function Qw(t) {
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
function Bs(t, e, n, r) {
  if (typeof e == "string")
    return { dom: t.createTextNode(e) };
  if (e.nodeType != null)
    return { dom: e };
  if (e.dom && e.dom.nodeType != null)
    return e;
  let i = e[0], o;
  if (typeof i != "string")
    throw new RangeError("Invalid array passed to renderSpec");
  if (r && (o = Yw(r)) && o.indexOf(e) > -1)
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
      let { dom: h, contentDOM: p } = Bs(t, d, n, r);
      if (a.appendChild(h), p) {
        if (l)
          throw new RangeError("Multiple content holes");
        l = p;
      }
    }
  }
  return { dom: a, contentDOM: l };
}
const tm = 65535, nm = Math.pow(2, 16);
function Xw(t, e) {
  return t + e * nm;
}
function xd(t) {
  return t & tm;
}
function Zw(t) {
  return (t - (t & tm)) / nm;
}
const rm = 1, im = 2, Fs = 4, om = 8;
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
    return (this.delInfo & om) > 0;
  }
  /**
  Tells you whether the token before the mapped position was deleted.
  */
  get deletedBefore() {
    return (this.delInfo & (rm | Fs)) > 0;
  }
  /**
  True when the token after the mapped position was deleted.
  */
  get deletedAfter() {
    return (this.delInfo & (im | Fs)) > 0;
  }
  /**
  Tells whether any of the steps mapped through deletes across the
  position (including both the token before and after the
  position).
  */
  get deletedAcross() {
    return (this.delInfo & Fs) > 0;
  }
}
class St {
  /**
  Create a position map. The modifications to the document are
  represented as an array of numbers, in which each group of three
  represents a modified chunk as `[start, oldSize, newSize]`.
  */
  constructor(e, n = !1) {
    if (this.ranges = e, this.inverted = n, !e.length && St.empty)
      return St.empty;
  }
  /**
  @internal
  */
  recover(e) {
    let n = 0, r = xd(e);
    if (!this.inverted)
      for (let i = 0; i < r; i++)
        n += this.ranges[i * 3 + 2] - this.ranges[i * 3 + 1];
    return this.ranges[r * 3] + n + Zw(e);
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
        let p = e == (n < 0 ? a : f) ? null : Xw(l / 3, e - a), k = e == a ? im : e == f ? rm : Fs;
        return (n < 0 ? e != a : e != f) && (k |= om), new Qa(h, k, p);
      }
      i += c - u;
    }
    return r ? e + i : new Qa(e + i, 0, null);
  }
  /**
  @internal
  */
  touches(e, n) {
    let r = 0, i = xd(n), o = this.inverted ? 2 : 1, s = this.inverted ? 1 : 2;
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
    return new St(this.ranges, !this.inverted);
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
    return e == 0 ? St.empty : new St(e < 0 ? [0, -e, 0] : [0, 0, e]);
  }
}
St.empty = new St([]);
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
const Gl = /* @__PURE__ */ Object.create(null);
class tt {
  /**
  Get the step map that represents the changes made by this step,
  and which can be used to transform between positions in the old
  and the new document.
  */
  getMap() {
    return St.empty;
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
    let r = Gl[n.stepType];
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
    if (e in Gl)
      throw new RangeError("Duplicate use of step JSON ID " + e);
    return Gl[e] = n, n.prototype.jsonID = e, n;
  }
}
class Re {
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
    return new Re(e, null);
  }
  /**
  Create a failed step result.
  */
  static fail(e) {
    return new Re(null, e);
  }
  /**
  Call [`Node.replace`](https://prosemirror.net/docs/ref/#model.Node.replace) with the given
  arguments. Create a successful result if it succeeds, and a
  failed one if it throws a `ReplaceError`.
  */
  static fromReplace(e, n, r, i) {
    try {
      return Re.ok(e.replace(n, r, i));
    } catch (o) {
      if (o instanceof Zs)
        return Re.fail(o.message);
      throw o;
    }
  }
}
function Fu(t, e, n) {
  let r = [];
  for (let i = 0; i < t.childCount; i++) {
    let o = t.child(i);
    o.content.size && (o = o.copy(Fu(o.content, e, o))), o.isInline && (o = e(o, n, i)), r.push(o);
  }
  return R.fromArray(r);
}
class wn extends tt {
  /**
  Create a mark step.
  */
  constructor(e, n, r) {
    super(), this.from = e, this.to = n, this.mark = r;
  }
  apply(e) {
    let n = e.slice(this.from, this.to), r = e.resolve(this.from), i = r.node(r.sharedDepth(this.to)), o = new V(Fu(n.content, (s, l) => !s.isAtom || !l.type.allowsMarkType(this.mark.type) ? s : s.mark(this.mark.addToSet(s.marks)), i), n.openStart, n.openEnd);
    return Re.fromReplace(e, this.from, this.to, o);
  }
  invert() {
    return new Yt(this.from, this.to, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
    return n.deleted && r.deleted || n.pos >= r.pos ? null : new wn(n.pos, r.pos, this.mark);
  }
  merge(e) {
    return e instanceof wn && e.mark.eq(this.mark) && this.from <= e.to && this.to >= e.from ? new wn(Math.min(this.from, e.from), Math.max(this.to, e.to), this.mark) : null;
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
    return new wn(n.from, n.to, e.markFromJSON(n.mark));
  }
}
tt.jsonID("addMark", wn);
class Yt extends tt {
  /**
  Create a mark-removing step.
  */
  constructor(e, n, r) {
    super(), this.from = e, this.to = n, this.mark = r;
  }
  apply(e) {
    let n = e.slice(this.from, this.to), r = new V(Fu(n.content, (i) => i.mark(this.mark.removeFromSet(i.marks)), e), n.openStart, n.openEnd);
    return Re.fromReplace(e, this.from, this.to, r);
  }
  invert() {
    return new wn(this.from, this.to, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
    return n.deleted && r.deleted || n.pos >= r.pos ? null : new Yt(n.pos, r.pos, this.mark);
  }
  merge(e) {
    return e instanceof Yt && e.mark.eq(this.mark) && this.from <= e.to && this.to >= e.from ? new Yt(Math.min(this.from, e.from), Math.max(this.to, e.to), this.mark) : null;
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
    return new Yt(n.from, n.to, e.markFromJSON(n.mark));
  }
}
tt.jsonID("removeMark", Yt);
class Jn extends tt {
  /**
  Create a node mark step.
  */
  constructor(e, n) {
    super(), this.pos = e, this.mark = n;
  }
  apply(e) {
    let n = e.nodeAt(this.pos);
    if (!n)
      return Re.fail("No node at mark step's position");
    let r = n.type.create(n.attrs, null, this.mark.addToSet(n.marks));
    return Re.fromReplace(e, this.pos, this.pos + 1, new V(R.from(r), 0, n.isLeaf ? 0 : 1));
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
tt.jsonID("addNodeMark", Jn);
class _r extends tt {
  /**
  Create a mark-removing step.
  */
  constructor(e, n) {
    super(), this.pos = e, this.mark = n;
  }
  apply(e) {
    let n = e.nodeAt(this.pos);
    if (!n)
      return Re.fail("No node at mark step's position");
    let r = n.type.create(n.attrs, null, this.mark.removeFromSet(n.marks));
    return Re.fromReplace(e, this.pos, this.pos + 1, new V(R.from(r), 0, n.isLeaf ? 0 : 1));
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
tt.jsonID("removeNodeMark", _r);
class De extends tt {
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
    return this.structure && Xa(e, this.from, this.to) ? Re.fail("Structure replace would overwrite content") : Re.fromReplace(e, this.from, this.to, this.slice);
  }
  getMap() {
    return new St([this.from, this.to - this.from, this.slice.size]);
  }
  invert(e) {
    return new De(this.from, this.from + this.slice.size, e.slice(this.from, this.to));
  }
  map(e) {
    let n = e.mapResult(this.to, -1), r = this.from == this.to && De.MAP_BIAS < 0 ? n : e.mapResult(this.from, 1);
    return r.deletedAcross && n.deletedAcross ? null : new De(r.pos, Math.max(r.pos, n.pos), this.slice, this.structure);
  }
  merge(e) {
    if (!(e instanceof De) || e.structure || this.structure)
      return null;
    if (this.from + this.slice.size == e.from && !this.slice.openEnd && !e.slice.openStart) {
      let n = this.slice.size + e.slice.size == 0 ? V.empty : new V(this.slice.content.append(e.slice.content), this.slice.openStart, e.slice.openEnd);
      return new De(this.from, this.to + (e.to - e.from), n, this.structure);
    } else if (e.to == this.from && !this.slice.openStart && !e.slice.openEnd) {
      let n = this.slice.size + e.slice.size == 0 ? V.empty : new V(e.slice.content.append(this.slice.content), e.slice.openStart, this.slice.openEnd);
      return new De(e.from, this.to, n, this.structure);
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
    return new De(n.from, n.to, V.fromJSON(e, n.slice), !!n.structure);
  }
}
De.MAP_BIAS = 1;
tt.jsonID("replace", De);
class Ze extends tt {
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
      return Re.fail("Structure gap-replace would overwrite content");
    let n = e.slice(this.gapFrom, this.gapTo);
    if (n.openStart || n.openEnd)
      return Re.fail("Gap is not a flat range");
    let r = this.slice.insertAt(this.insert, n.content);
    return r ? Re.fromReplace(e, this.from, this.to, r) : Re.fail("Content does not fit in gap");
  }
  getMap() {
    return new St([
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
    return new Ze(this.from, this.from + this.slice.size + n, this.from + this.insert, this.from + this.insert + n, e.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
  }
  map(e) {
    let n = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1), i = this.from == this.gapFrom ? n.pos : e.map(this.gapFrom, -1), o = this.to == this.gapTo ? r.pos : e.map(this.gapTo, 1);
    return n.deletedAcross && r.deletedAcross || i < n.pos || o > r.pos ? null : new Ze(n.pos, r.pos, i, o, this.slice, this.insert, this.structure);
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
    return new Ze(n.from, n.to, n.gapFrom, n.gapTo, V.fromJSON(e, n.slice), n.insert, !!n.structure);
  }
}
tt.jsonID("replaceAround", Ze);
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
function ex(t, e, n, r) {
  let i = [], o = [], s, l;
  t.doc.nodesBetween(e, n, (a, u, c) => {
    if (!a.isInline)
      return;
    let f = a.marks;
    if (!r.isInSet(f) && c.type.allowsMarkType(r.type)) {
      let d = Math.max(u, e), h = Math.min(u + a.nodeSize, n), p = r.addToSet(f);
      for (let k = 0; k < f.length; k++)
        f[k].isInSet(p) || (s && s.to == d && s.mark.eq(f[k]) ? s.to = h : i.push(s = new Yt(d, h, f[k])));
      l && l.to == d ? l.to = h : o.push(l = new wn(d, h, r));
    }
  }), i.forEach((a) => t.step(a)), o.forEach((a) => t.step(a));
}
function tx(t, e, n, r) {
  let i = [], o = 0;
  t.doc.nodesBetween(e, n, (s, l) => {
    if (!s.isInline)
      return;
    o++;
    let a = null;
    if (r instanceof xl) {
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
  }), i.forEach((s) => t.step(new Yt(s.from, s.to, s.style)));
}
function $u(t, e, n, r = n.contentMatch, i = !0) {
  let o = t.doc.nodeAt(e), s = [], l = e + 1;
  for (let a = 0; a < o.childCount; a++) {
    let u = o.child(a), c = l + u.nodeSize, f = r.matchType(u.type);
    if (!f)
      s.push(new De(l, c, V.empty));
    else {
      r = f;
      for (let d = 0; d < u.marks.length; d++)
        n.allowsMarkType(u.marks[d].type) || t.step(new Yt(l, c, u.marks[d]));
      if (i && u.isText && n.whitespace != "pre") {
        let d, h = /\r?\n|\r/g, p;
        for (; d = h.exec(u.text); )
          p || (p = new V(R.from(n.schema.text(" ", n.allowedMarks(u.marks))), 0, 0)), s.push(new De(l + d.index, l + d.index + d[0].length, p));
      }
    }
    l = c;
  }
  if (!r.validEnd) {
    let a = r.fillBefore(R.empty, !0);
    t.replace(l, l, new V(a, 0, 0));
  }
  for (let a = s.length - 1; a >= 0; a--)
    t.step(s[a]);
}
function nx(t, e, n) {
  return (e == 0 || t.canReplace(e, t.childCount)) && (n == t.childCount || t.canReplace(0, n));
}
function Cl(t) {
  let n = t.parent.content.cutByIndex(t.startIndex, t.endIndex);
  for (let r = t.depth, i = 0, o = 0; ; --r) {
    let s = t.$from.node(r), l = t.$from.index(r) + i, a = t.$to.indexAfter(r) - o;
    if (r < t.depth && s.canReplace(l, a, n))
      return r;
    if (r == 0 || s.type.spec.isolating || !nx(s, l, a))
      break;
    l && (i = 1), a < s.childCount && (o = 1);
  }
  return null;
}
function rx(t, e, n) {
  let { $from: r, $to: i, depth: o } = e, s = r.before(o + 1), l = i.after(o + 1), a = s, u = l, c = R.empty, f = 0;
  for (let p = o, k = !1; p > n; p--)
    k || r.index(p) > 0 ? (k = !0, c = R.from(r.node(p).copy(c)), f++) : a--;
  let d = R.empty, h = 0;
  for (let p = o, k = !1; p > n; p--)
    k || i.after(p + 1) < i.end(p) ? (k = !0, d = R.from(i.node(p).copy(d)), h++) : u++;
  t.step(new Ze(a, u, s, l, new V(c.append(d), f, h), c.size - f, !0));
}
function _u(t, e, n = null, r = t) {
  let i = ix(t, e), o = i && ox(r, e);
  return o ? i.map(Cd).concat({ type: e, attrs: n }).concat(o.map(Cd)) : null;
}
function Cd(t) {
  return { type: t, attrs: null };
}
function ix(t, e) {
  let { parent: n, startIndex: r, endIndex: i } = t, o = n.contentMatchAt(r).findWrapping(e);
  if (!o)
    return null;
  let s = o.length ? o[0] : e;
  return n.canReplaceWith(r, i, s) ? o : null;
}
function ox(t, e) {
  let { parent: n, startIndex: r, endIndex: i } = t, o = n.child(r), s = e.contentMatch.findWrapping(o.type);
  if (!s)
    return null;
  let a = (s.length ? s[s.length - 1] : e).contentMatch;
  for (let u = r; a && u < i; u++)
    a = a.matchType(n.child(u).type);
  return !a || !a.validEnd ? null : s;
}
function sx(t, e, n) {
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
  t.step(new Ze(i, o, i, o, new V(r, 0, 0), n.length, !0));
}
function lx(t, e, n, r, i) {
  if (!r.isTextblock)
    throw new RangeError("Type given to setBlockType should be a textblock");
  let o = t.steps.length;
  t.doc.nodesBetween(e, n, (s, l) => {
    let a = typeof i == "function" ? i(s) : i;
    if (s.isTextblock && !s.hasMarkup(r, a) && ax(t.doc, t.mapping.slice(o).map(l), r)) {
      let u = null;
      if (r.schema.linebreakReplacement) {
        let h = r.whitespace == "pre", p = !!r.contentMatch.matchType(r.schema.linebreakReplacement);
        h && !p ? u = !1 : !h && p && (u = !0);
      }
      u === !1 && lm(t, s, l, o), $u(t, t.mapping.slice(o).map(l, 1), r, void 0, u === null);
      let c = t.mapping.slice(o), f = c.map(l, 1), d = c.map(l + s.nodeSize, 1);
      return t.step(new Ze(f, d, f + 1, d - 1, new V(R.from(r.create(a, null, s.marks)), 0, 0), 1, !0)), u === !0 && sm(t, s, l, o), !1;
    }
  });
}
function sm(t, e, n, r) {
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
function lm(t, e, n, r) {
  e.forEach((i, o) => {
    if (i.type == i.type.schema.linebreakReplacement) {
      let s = t.mapping.slice(r).map(n + 1 + o);
      t.replaceWith(s, s + 1, e.type.schema.text(`
`));
    }
  });
}
function ax(t, e, n) {
  let r = t.resolve(e), i = r.index();
  return r.parent.canReplaceWith(i, i + 1, n);
}
function ux(t, e, n, r, i) {
  let o = t.doc.nodeAt(e);
  if (!o)
    throw new RangeError("No node at given position");
  n || (n = o.type);
  let s = n.create(r, null, i || o.marks);
  if (o.isLeaf)
    return t.replaceWith(e, e + o.nodeSize, s);
  if (!n.validContent(o.content))
    throw new RangeError("Invalid content for node type " + n.name);
  t.step(new Ze(e, e + o.nodeSize, e + 1, e + o.nodeSize - 1, new V(R.from(s), 0, 0), 1, !0));
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
function cx(t, e, n = 1, r) {
  let i = t.doc.resolve(e), o = R.empty, s = R.empty;
  for (let l = i.depth, a = i.depth - n, u = n - 1; l > a; l--, u--) {
    o = R.from(i.node(l).copy(o));
    let c = r && r[u];
    s = R.from(c ? c.type.create(c.attrs, s) : i.node(l).copy(s));
  }
  t.step(new De(e, e, new V(o.append(s), n, n), !0));
}
function Sl(t, e) {
  let n = t.resolve(e), r = n.index();
  return dx(n.nodeBefore, n.nodeAfter) && n.parent.canReplace(r, r + 1);
}
function fx(t, e) {
  e.content.size || t.type.compatibleContent(e.type);
  let n = t.contentMatchAt(t.childCount), { linebreakReplacement: r } = t.type.schema;
  for (let i = 0; i < e.childCount; i++) {
    let o = e.child(i), s = o.type == r ? t.type.schema.nodes.text : o.type;
    if (n = n.matchType(s), !n || !t.type.allowsMarks(o.marks))
      return !1;
  }
  return n.validEnd;
}
function dx(t, e) {
  return !!(t && e && !t.isLeaf && fx(t, e));
}
function hx(t, e, n) {
  let r = null, { linebreakReplacement: i } = t.doc.type.schema, o = t.doc.resolve(e - n), s = o.node().type;
  if (i && s.inlineContent) {
    let c = s.whitespace == "pre", f = !!s.contentMatch.matchType(i);
    c && !f ? r = !1 : !c && f && (r = !0);
  }
  let l = t.steps.length;
  if (r === !1) {
    let c = t.doc.resolve(e + n);
    lm(t, c.node(), c.before(), l);
  }
  s.inlineContent && $u(t, e + n - 1, s, o.node().contentMatchAt(o.index()), r == null);
  let a = t.mapping.slice(l), u = a.map(e - n);
  if (t.step(new De(u, a.map(e + n, -1), V.empty, !0)), r === !0) {
    let c = t.doc.resolve(u);
    sm(t, c.node(), c.before(), t.steps.length);
  }
  return t;
}
function px(t, e, n) {
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
function mx(t, e, n) {
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
function vl(t, e, n = e, r = V.empty) {
  if (e == n && !r.size)
    return null;
  let i = t.resolve(e), o = t.resolve(n);
  return am(i, o, r) ? new De(e, n, r) : new gx(i, o, r).fit();
}
function am(t, e, n) {
  return !n.openStart && !n.openEnd && t.start() == e.start() && t.parent.canReplace(t.index(), e.index(), n.content);
}
class gx {
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
    let a = new V(o, s, l);
    return e > -1 ? new Ze(r.pos, e, this.$to.pos, this.$to.end(), a, n) : a.size || r.pos != this.$to.pos ? new De(r.pos, i.pos, a) : null;
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
        r ? (o = Yl(this.unplaced.content, r - 1).firstChild, i = o.content) : i = this.unplaced.content;
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
    let { content: e, openStart: n, openEnd: r } = this.unplaced, i = Yl(e, n);
    return !i.childCount || i.firstChild.isLeaf ? !1 : (this.unplaced = new V(e, n + 1, Math.max(r, i.size + n >= e.size - r ? n + 1 : 0)), !0);
  }
  dropNode() {
    let { content: e, openStart: n, openEnd: r } = this.unplaced, i = Yl(e, n);
    if (i.childCount <= 1 && n > 0) {
      let o = e.size - n <= n + i.size;
      this.unplaced = new V(so(e, n - 1, 1), n - 1, o ? n - 1 : r);
    } else
      this.unplaced = new V(so(e, n, 1), n, r);
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
      let k = l.child(u), b = f.matchType(k.type);
      if (!b)
        break;
      u++, (u > 1 || a == 0 || k.content.size) && (f = b, c.push(um(k.mark(d.allowedMarks(k.marks)), u == 1 ? a : 0, u == l.childCount ? h : -1)));
    }
    let p = u == l.childCount;
    p || (h = -1), this.placed = lo(this.placed, n, R.from(c)), this.frontier[n].match = f, p && h < 0 && r && r.type == this.frontier[this.depth].type && this.frontier.length > 1 && this.closeFrontierNode();
    for (let k = 0, b = l; k < h; k++) {
      let w = b.lastChild;
      this.frontier.push({ type: w.type, match: w.contentMatchAt(w.childCount) }), b = w.content;
    }
    this.unplaced = p ? e == 0 ? V.empty : new V(so(s.content, e - 1, 1), e - 1, h < 0 ? s.openEnd : e - 1) : new V(so(s.content, e, u), s.openStart, s.openEnd);
  }
  mustMoveInline() {
    if (!this.$to.parent.isTextblock)
      return -1;
    let e = this.frontier[this.depth], n;
    if (!e.type.isTextblock || !Ql(this.$to, this.$to.depth, e.type, e.match, !1) || this.$to.depth == this.depth && (n = this.findCloseLevel(this.$to)) && n.depth == this.depth)
      return -1;
    let { depth: r } = this.$to, i = this.$to.after(r);
    for (; r > 1 && i == this.$to.end(--r); )
      ++i;
    return i;
  }
  findCloseLevel(e) {
    e: for (let n = Math.min(this.depth, e.depth); n >= 0; n--) {
      let { match: r, type: i } = this.frontier[n], o = n < e.depth && e.end(n + 1) == e.pos + (e.depth - (n + 1)), s = Ql(e, n, i, r, o);
      if (s) {
        for (let l = n - 1; l >= 0; l--) {
          let { match: a, type: u } = this.frontier[l], c = Ql(e, l, u, a, !0);
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
function Yl(t, e) {
  for (let n = 0; n < e; n++)
    t = t.firstChild.content;
  return t;
}
function um(t, e, n) {
  if (e <= 0)
    return t;
  let r = t.content;
  return e > 1 && (r = r.replaceChild(0, um(r.firstChild, e - 1, r.childCount == 1 ? n - 1 : 0))), e > 0 && (r = t.type.contentMatch.fillBefore(r).append(r), n <= 0 && (r = r.append(t.type.contentMatch.matchFragment(r).fillBefore(R.empty, !0)))), t.copy(r);
}
function Ql(t, e, n, r, i) {
  let o = t.node(e), s = i ? t.indexAfter(e) : t.index(e);
  if (s == o.childCount && !n.compatibleContent(o.type))
    return null;
  let l = r.fillBefore(o.content, !0, s);
  return l && !yx(n, o.content, s) ? l : null;
}
function yx(t, e, n) {
  for (let r = n; r < e.childCount; r++)
    if (!t.allowsMarks(e.child(r).marks))
      return !0;
  return !1;
}
function kx(t) {
  return t.spec.defining || t.spec.definingForContent;
}
function bx(t, e, n, r) {
  if (!r.size)
    return t.deleteRange(e, n);
  let i = t.doc.resolve(e), o = t.doc.resolve(n);
  if (am(i, o, r))
    return t.step(new De(e, n, r));
  let s = fm(i, o);
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
    let h = u[d], p = kx(h.type);
    if (p && !h.sameMarkup(i.node(Math.abs(l) - 1)))
      c = d;
    else if (p || !h.type.isTextblock)
      break;
  }
  for (let d = r.openStart; d >= 0; d--) {
    let h = (d + c + 1) % (r.openStart + 1), p = u[h];
    if (p)
      for (let k = 0; k < s.length; k++) {
        let b = s[(k + a) % s.length], w = !0;
        b < 0 && (w = !1, b = -b);
        let L = i.node(b - 1), O = i.index(b - 1);
        if (L.canReplaceWith(O, O, p.type, p.marks))
          return t.replace(i.before(b), w ? o.after(b) : n, new V(cm(r.content, 0, r.openStart, h), h, r.openEnd));
      }
  }
  let f = t.steps.length;
  for (let d = s.length - 1; d >= 0 && (t.replace(e, n, r), !(t.steps.length > f)); d--) {
    let h = s[d];
    h < 0 || (e = i.before(h), n = o.after(h));
  }
}
function cm(t, e, n, r, i) {
  if (e < n) {
    let o = t.firstChild;
    t = t.replaceChild(0, o.copy(cm(o.content, e + 1, n, r, o)));
  }
  if (e > r) {
    let o = i.contentMatchAt(0), s = o.fillBefore(t).append(t);
    t = s.append(o.matchFragment(s).fillBefore(R.empty, !0));
  }
  return t;
}
function wx(t, e, n, r) {
  if (!r.isInline && e == n && t.doc.resolve(e).parent.content.size) {
    let i = px(t.doc, e, r.type);
    i != null && (e = n = i);
  }
  t.replaceRange(e, n, new V(R.from(r), 0, 0));
}
function xx(t, e, n) {
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
  let o = fm(r, i);
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
function fm(t, e) {
  let n = [], r = Math.min(t.depth, e.depth);
  for (let i = r; i >= 0; i--) {
    let o = t.start(i);
    if (o < t.pos - (t.depth - i) || e.end(i) > e.pos + (e.depth - i) || t.node(i).type.spec.isolating || e.node(i).type.spec.isolating)
      break;
    (o == e.start(i) || i == t.depth && i == e.depth && t.parent.inlineContent && e.parent.inlineContent && i && e.start(i - 1) == o - 1) && n.push(i);
  }
  return n;
}
class li extends tt {
  /**
  Construct an attribute step.
  */
  constructor(e, n, r) {
    super(), this.pos = e, this.attr = n, this.value = r;
  }
  apply(e) {
    let n = e.nodeAt(this.pos);
    if (!n)
      return Re.fail("No node at attribute step's position");
    let r = /* @__PURE__ */ Object.create(null);
    for (let o in n.attrs)
      r[o] = n.attrs[o];
    r[this.attr] = this.value;
    let i = n.type.create(r, null, n.marks);
    return Re.fromReplace(e, this.pos, this.pos + 1, new V(R.from(i), 0, n.isLeaf ? 0 : 1));
  }
  getMap() {
    return St.empty;
  }
  invert(e) {
    return new li(this.pos, this.attr, e.nodeAt(this.pos).attrs[this.attr]);
  }
  map(e) {
    let n = e.mapResult(this.pos, 1);
    return n.deletedAfter ? null : new li(n.pos, this.attr, this.value);
  }
  toJSON() {
    return { stepType: "attr", pos: this.pos, attr: this.attr, value: this.value };
  }
  static fromJSON(e, n) {
    if (typeof n.pos != "number" || typeof n.attr != "string")
      throw new RangeError("Invalid input for AttrStep.fromJSON");
    return new li(n.pos, n.attr, n.value);
  }
}
tt.jsonID("attr", li);
class Eo extends tt {
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
    return Re.ok(r);
  }
  getMap() {
    return St.empty;
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
tt.jsonID("docAttr", Eo);
let Oi = class extends Error {
};
Oi = function t(e) {
  let n = Error.call(this, e);
  return n.__proto__ = t.prototype, n;
};
Oi.prototype = Object.create(Error.prototype);
Oi.prototype.constructor = Oi;
Oi.prototype.name = "TransformError";
class dm {
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
      throw new Oi(n.failed);
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
  replace(e, n = e, r = V.empty) {
    let i = vl(this.doc, e, n, r);
    return i && this.step(i), this;
  }
  /**
  Replace the given range with the given content, which may be a
  fragment, node, or array of nodes.
  */
  replaceWith(e, n, r) {
    return this.replace(e, n, new V(R.from(r), 0, 0));
  }
  /**
  Delete the content between the given positions.
  */
  delete(e, n) {
    return this.replace(e, n, V.empty);
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
    return bx(this, e, n, r), this;
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
    return wx(this, e, n, r), this;
  }
  /**
  Delete the given range, expanding it to cover fully covered
  parent nodes until a valid replace is found.
  */
  deleteRange(e, n) {
    return xx(this, e, n), this;
  }
  /**
  Split the content in the given range off from its parent, if there
  is sibling content before or after it, and move it up the tree to
  the depth specified by `target`. You'll probably want to use
  [`liftTarget`](https://prosemirror.net/docs/ref/#transform.liftTarget) to compute `target`, to make
  sure the lift is valid.
  */
  lift(e, n) {
    return rx(this, e, n), this;
  }
  /**
  Join the blocks around the given position. If depth is 2, their
  last and first siblings are also joined, and so on.
  */
  join(e, n = 1) {
    return hx(this, e, n), this;
  }
  /**
  Wrap the given [range](https://prosemirror.net/docs/ref/#model.NodeRange) in the given set of wrappers.
  The wrappers are assumed to be valid in this position, and should
  probably be computed with [`findWrapping`](https://prosemirror.net/docs/ref/#transform.findWrapping).
  */
  wrap(e, n) {
    return sx(this, e, n), this;
  }
  /**
  Set the type of all textblocks (partly) between `from` and `to` to
  the given node type with the given attributes.
  */
  setBlockType(e, n = e, r, i = null) {
    return lx(this, e, n, r, i), this;
  }
  /**
  Change the type, attributes, and/or marks of the node at `pos`.
  When `type` isn't given, the existing node type is preserved,
  */
  setNodeMarkup(e, n, r = null, i) {
    return ux(this, e, n, r, i), this;
  }
  /**
  Set a single attribute on a given node to a new value.
  The `pos` addresses the document content. Use `setDocAttribute`
  to set attributes on the document itself.
  */
  setNodeAttribute(e, n, r) {
    return this.step(new li(e, n, r)), this;
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
    if (n instanceof he)
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
    return cx(this, e, n, r), this;
  }
  /**
  Add the given mark to the inline content between `from` and `to`.
  */
  addMark(e, n, r) {
    return ex(this, e, n, r), this;
  }
  /**
  Remove marks from inline nodes between `from` and `to`. When
  `mark` is a single mark, remove precisely that mark. When it is
  a mark type, remove all marks of that type. When it is null,
  remove all marks of any type.
  */
  removeMark(e, n, r) {
    return tx(this, e, n, r), this;
  }
  /**
  Removes all marks and nodes from the content of the node at
  `pos` that don't match the given new parent node type. Accepts
  an optional starting [content match](https://prosemirror.net/docs/ref/#model.ContentMatch) as
  third argument.
  */
  clearIncompatible(e, n, r) {
    return $u(this, e, n, r), this;
  }
}
const Xl = /* @__PURE__ */ Object.create(null);
class te {
  /**
  Initialize a selection with the head and anchor and ranges. If no
  ranges are given, constructs a single range across `$anchor` and
  `$head`.
  */
  constructor(e, n, r) {
    this.$anchor = e, this.$head = n, this.ranges = r || [new hm(e.min(n), e.max(n))];
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
  replace(e, n = V.empty) {
    let r = n.content.lastChild, i = null;
    for (let l = 0; l < n.openEnd; l++)
      i = r, r = r.lastChild;
    let o = e.steps.length, s = this.ranges;
    for (let l = 0; l < s.length; l++) {
      let { $from: a, $to: u } = s[l], c = e.mapping.slice(o);
      e.replaceRange(c.map(a.pos), c.map(u.pos), l ? V.empty : n), l == 0 && Md(e, o, (r ? r.isInline : i && i.isTextblock) ? -1 : 1);
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
      o ? e.deleteRange(u, c) : (e.replaceRangeWith(u, c, n), Md(e, r, n.isInline ? -1 : 1));
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
    let i = e.parent.inlineContent ? new Q(e) : Zr(e.node(0), e.parent, e.pos, e.index(), n, r);
    if (i)
      return i;
    for (let o = e.depth - 1; o >= 0; o--) {
      let s = n < 0 ? Zr(e.node(0), e.node(o), e.before(o + 1), e.index(o), n, r) : Zr(e.node(0), e.node(o), e.after(o + 1), e.index(o) + 1, n, r);
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
    return this.findFrom(e, n) || this.findFrom(e, -n) || new Tt(e.node(0));
  }
  /**
  Find the cursor or leaf node selection closest to the start of
  the given document. Will return an
  [`AllSelection`](https://prosemirror.net/docs/ref/#state.AllSelection) if no valid position
  exists.
  */
  static atStart(e) {
    return Zr(e, e, 0, 0, 1) || new Tt(e);
  }
  /**
  Find the cursor or leaf node selection closest to the end of the
  given document.
  */
  static atEnd(e) {
    return Zr(e, e, e.content.size, e.childCount, -1) || new Tt(e);
  }
  /**
  Deserialize the JSON representation of a selection. Must be
  implemented for custom classes (as a static class method).
  */
  static fromJSON(e, n) {
    if (!n || !n.type)
      throw new RangeError("Invalid input for Selection.fromJSON");
    let r = Xl[n.type];
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
    if (e in Xl)
      throw new RangeError("Duplicate use of selection JSON ID " + e);
    return Xl[e] = n, n.prototype.jsonID = e, n;
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
    return Q.between(this.$anchor, this.$head).getBookmark();
  }
}
te.prototype.visible = !0;
class hm {
  /**
  Create a range.
  */
  constructor(e, n) {
    this.$from = e, this.$to = n;
  }
}
let Sd = !1;
function vd(t) {
  !Sd && !t.parent.inlineContent && (Sd = !0, console.warn("TextSelection endpoint not pointing into a node with inline content (" + t.parent.type.name + ")"));
}
class Q extends te {
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
      return te.near(r);
    let i = e.resolve(n.map(this.anchor));
    return new Q(i.parent.inlineContent ? i : r, r);
  }
  replace(e, n = V.empty) {
    if (super.replace(e, n), n == V.empty) {
      let r = this.$from.marksAcross(this.$to);
      r && e.ensureMarks(r);
    }
  }
  eq(e) {
    return e instanceof Q && e.anchor == this.anchor && e.head == this.head;
  }
  getBookmark() {
    return new Ml(this.anchor, this.head);
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
    return new Q(e.resolve(n.anchor), e.resolve(n.head));
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
    return e.parent.inlineContent || (i == 0 ? e = n : (e = (te.findFrom(e, -r, !0) || te.findFrom(e, r, !0)).$anchor, e.pos < n.pos != i < 0 && (e = n))), new Q(e, n);
  }
}
te.jsonID("text", Q);
class Ml {
  constructor(e, n) {
    this.anchor = e, this.head = n;
  }
  map(e) {
    return new Ml(e.map(this.anchor), e.map(this.head));
  }
  resolve(e) {
    return Q.between(e.resolve(this.anchor), e.resolve(this.head));
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
    return new V(R.from(this.node), 0, 0);
  }
  eq(e) {
    return e instanceof X && e.anchor == this.anchor;
  }
  toJSON() {
    return { type: "node", anchor: this.anchor };
  }
  getBookmark() {
    return new Vu(this.anchor);
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
class Vu {
  constructor(e) {
    this.anchor = e;
  }
  map(e) {
    let { deleted: n, pos: r } = e.mapResult(this.anchor);
    return n ? new Ml(r, r) : new Vu(r);
  }
  resolve(e) {
    let n = e.resolve(this.anchor), r = n.nodeAfter;
    return r && X.isSelectable(r) ? new X(n) : te.near(n);
  }
}
class Tt extends te {
  /**
  Create an all-selection over the given document.
  */
  constructor(e) {
    super(e.resolve(0), e.resolve(e.content.size));
  }
  replace(e, n = V.empty) {
    if (n == V.empty) {
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
    return new Tt(e);
  }
  map(e) {
    return new Tt(e);
  }
  eq(e) {
    return e instanceof Tt;
  }
  getBookmark() {
    return Cx;
  }
}
te.jsonID("all", Tt);
const Cx = {
  map() {
    return this;
  },
  resolve(t) {
    return new Tt(t);
  }
};
function Zr(t, e, n, r, i, o = !1) {
  if (e.inlineContent)
    return Q.create(t, n);
  for (let s = r - (i > 0 ? 0 : 1); i > 0 ? s < e.childCount : s >= 0; s += i) {
    let l = e.child(s);
    if (l.isAtom) {
      if (!o && X.isSelectable(l))
        return X.create(t, n - (i < 0 ? l.nodeSize : 0));
    } else {
      let a = Zr(t, l, n + i, i < 0 ? l.childCount : 0, i, o);
      if (a)
        return a;
    }
    n += l.nodeSize * i;
  }
  return null;
}
function Md(t, e, n) {
  let r = t.steps.length - 1;
  if (r < e)
    return;
  let i = t.steps[r];
  if (!(i instanceof De || i instanceof Ze))
    return;
  let o = t.mapping.maps[r], s;
  o.forEach((l, a, u, c) => {
    s == null && (s = c);
  }), t.setSelection(te.near(t.doc.resolve(s), n));
}
const Td = 1, Is = 2, Nd = 4;
class Sx extends dm {
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
    return this.curSelection = e, this.curSelectionFor = this.steps.length, this.updated = (this.updated | Td) & ~Is, this.storedMarks = null, this;
  }
  /**
  Whether the selection was explicitly updated by this transaction.
  */
  get selectionSet() {
    return (this.updated & Td) > 0;
  }
  /**
  Set the current stored marks.
  */
  setStoredMarks(e) {
    return this.storedMarks = e, this.updated |= Is, this;
  }
  /**
  Make sure the current stored marks or, if that is null, the marks
  at the selection, match the given set of marks. Does nothing if
  this is already the case.
  */
  ensureMarks(e) {
    return he.sameSet(this.storedMarks || this.selection.$from.marks(), e) || this.setStoredMarks(e), this;
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
    return (this.updated & Is) > 0;
  }
  /**
  @internal
  */
  addStep(e, n) {
    super.addStep(e, n), this.updated = this.updated & ~Is, this.storedMarks = null;
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
    return n && (e = e.mark(this.storedMarks || (r.empty ? r.$from.marks() : r.$from.marksAcross(r.$to) || he.none))), r.replaceWith(this, e), this;
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
    return this.updated |= Nd, this;
  }
  /**
  True when this transaction has had `scrollIntoView` called on it.
  */
  get scrolledIntoView() {
    return (this.updated & Nd) > 0;
  }
}
function Id(t, e) {
  return !e || !t ? t : t.bind(e);
}
class ao {
  constructor(e, n, r) {
    this.name = e, this.init = Id(n.init, r), this.apply = Id(n.apply, r);
  }
}
const vx = [
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
      return t.selection || te.atStart(e.doc);
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
class Zl {
  constructor(e, n) {
    this.schema = e, this.plugins = [], this.pluginsByKey = /* @__PURE__ */ Object.create(null), this.fields = vx.slice(), n && n.forEach((r) => {
      if (this.pluginsByKey[r.key])
        throw new RangeError("Adding different instances of a keyed plugin (" + r.key + ")");
      this.plugins.push(r), this.pluginsByKey[r.key] = r, r.spec.state && this.fields.push(new ao(r.key, r.spec.state, r));
    });
  }
}
class ii {
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
    let n = new ii(this.config), r = this.config.fields;
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
    return new Sx(this);
  }
  /**
  Create a new state.
  */
  static create(e) {
    let n = new Zl(e.doc ? e.doc.type.schema : e.schema, e.plugins), r = new ii(n);
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
    let n = new Zl(this.schema, e.plugins), r = n.fields, i = new ii(n);
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
    let i = new Zl(e.schema, e.plugins), o = new ii(i);
    return i.fields.forEach((s) => {
      if (s.name == "doc")
        o.doc = Sn.fromJSON(e.schema, n.doc);
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
function pm(t, e, n) {
  for (let r in t) {
    let i = t[r];
    i instanceof Function ? i = i.bind(e) : r == "handleDOMEvents" && (i = pm(i, e, {})), n[r] = i;
  }
  return n;
}
class je {
  /**
  Create a plugin.
  */
  constructor(e) {
    this.spec = e, this.props = {}, e.props && pm(e.props, this, this.props), this.key = e.key ? e.key.key : mm("plugin");
  }
  /**
  Extract the plugin's state field from an editor state.
  */
  getState(e) {
    return e[this.key];
  }
}
const ea = /* @__PURE__ */ Object.create(null);
function mm(t) {
  return t in ea ? t + "$" + ++ea[t] : (ea[t] = 0, t + "$");
}
class nt {
  /**
  Create a plugin key.
  */
  constructor(e = "key") {
    this.key = mm(e);
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
const Hu = (t, e) => t.selection.empty ? !1 : (e && e(t.tr.deleteSelection().scrollIntoView()), !0);
function gm(t, e) {
  let { $cursor: n } = t.selection;
  return !n || (e ? !e.endOfTextblock("backward", t) : n.parentOffset > 0) ? null : n;
}
const ym = (t, e, n) => {
  let r = gm(t, n);
  if (!r)
    return !1;
  let i = ju(r);
  if (!i) {
    let s = r.blockRange(), l = s && Cl(s);
    return l == null ? !1 : (e && e(t.tr.lift(s, l).scrollIntoView()), !0);
  }
  let o = i.nodeBefore;
  if (wm(t, i, e, -1))
    return !0;
  if (r.parent.content.size == 0 && (Di(o, "end") || X.isSelectable(o)))
    for (let s = r.depth; ; s--) {
      let l = vl(t.doc, r.before(s), r.after(s), V.empty);
      if (l && l.slice.size < l.to - l.from) {
        if (e) {
          let a = t.tr.step(l);
          a.setSelection(Di(o, "end") ? te.findFrom(a.doc.resolve(a.mapping.map(i.pos, -1)), -1) : X.create(a.doc, i.pos - o.nodeSize)), e(a.scrollIntoView());
        }
        return !0;
      }
      if (s == 1 || r.node(s - 1).childCount > 1)
        break;
    }
  return o.isAtom && i.depth == r.depth - 1 ? (e && e(t.tr.delete(i.pos - o.nodeSize, i.pos).scrollIntoView()), !0) : !1;
}, Mx = (t, e, n) => {
  let r = gm(t, n);
  if (!r)
    return !1;
  let i = ju(r);
  return i ? Tx(t, i, e) : !1;
};
function Tx(t, e, n) {
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
  let u = vl(t.doc, o, a, V.empty);
  if (!u || u.from != o || u instanceof De && u.slice.size >= a - o)
    return !1;
  if (n) {
    let c = t.tr.step(u);
    c.setSelection(Q.create(c.doc, o)), n(c.scrollIntoView());
  }
  return !0;
}
function Di(t, e, n = !1) {
  for (let r = t; r; r = e == "start" ? r.firstChild : r.lastChild) {
    if (r.isTextblock)
      return !0;
    if (n && r.childCount != 1)
      return !1;
  }
  return !1;
}
const km = (t, e, n) => {
  let { $head: r, empty: i } = t.selection, o = r;
  if (!i)
    return !1;
  if (r.parent.isTextblock) {
    if (n ? !n.endOfTextblock("backward", t) : r.parentOffset > 0)
      return !1;
    o = ju(r);
  }
  let s = o && o.nodeBefore;
  return !s || !X.isSelectable(s) ? !1 : (e && e(t.tr.setSelection(X.create(t.doc, o.pos - s.nodeSize)).scrollIntoView()), !0);
};
function ju(t) {
  if (!t.parent.type.spec.isolating)
    for (let e = t.depth - 1; e >= 0; e--) {
      if (t.index(e) > 0)
        return t.doc.resolve(t.before(e + 1));
      if (t.node(e).type.spec.isolating)
        break;
    }
  return null;
}
function Nx(t, e) {
  let { $cursor: n } = t.selection;
  return !n || (e ? !e.endOfTextblock("forward", t) : n.parentOffset < n.parent.content.size) ? null : n;
}
const Ix = (t, e, n) => {
  let r = Nx(t, n);
  if (!r)
    return !1;
  let i = bm(r);
  if (!i)
    return !1;
  let o = i.nodeAfter;
  if (wm(t, i, e, 1))
    return !0;
  if (r.parent.content.size == 0 && (Di(o, "start") || X.isSelectable(o))) {
    let s = vl(t.doc, r.before(), r.after(), V.empty);
    if (s && s.slice.size < s.to - s.from) {
      if (e) {
        let l = t.tr.step(s);
        l.setSelection(Di(o, "start") ? te.findFrom(l.doc.resolve(l.mapping.map(i.pos)), 1) : X.create(l.doc, l.mapping.map(i.pos))), e(l.scrollIntoView());
      }
      return !0;
    }
  }
  return o.isAtom && i.depth == r.depth - 1 ? (e && e(t.tr.delete(i.pos, i.pos + o.nodeSize).scrollIntoView()), !0) : !1;
}, Ax = (t, e, n) => {
  let { $head: r, empty: i } = t.selection, o = r;
  if (!i)
    return !1;
  if (r.parent.isTextblock) {
    if (n ? !n.endOfTextblock("forward", t) : r.parentOffset < r.parent.content.size)
      return !1;
    o = bm(r);
  }
  let s = o && o.nodeAfter;
  return !s || !X.isSelectable(s) ? !1 : (e && e(t.tr.setSelection(X.create(t.doc, o.pos)).scrollIntoView()), !0);
};
function bm(t) {
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
const Ex = (t, e) => {
  let { $head: n, $anchor: r } = t.selection;
  return !n.parent.type.spec.code || !n.sameParent(r) ? !1 : (e && e(t.tr.insertText(`
`).scrollIntoView()), !0);
};
function Wu(t) {
  for (let e = 0; e < t.edgeCount; e++) {
    let { type: n } = t.edge(e);
    if (n.isTextblock && !n.hasRequiredAttrs())
      return n;
  }
  return null;
}
const Ox = (t, e) => {
  let { $head: n, $anchor: r } = t.selection;
  if (!n.parent.type.spec.code || !n.sameParent(r))
    return !1;
  let i = n.node(-1), o = n.indexAfter(-1), s = Wu(i.contentMatchAt(o));
  if (!s || !i.canReplaceWith(o, o, s))
    return !1;
  if (e) {
    let l = n.after(), a = t.tr.replaceWith(l, l, s.createAndFill());
    a.setSelection(te.near(a.doc.resolve(l), 1)), e(a.scrollIntoView());
  }
  return !0;
}, Dx = (t, e) => {
  let n = t.selection, { $from: r, $to: i } = n;
  if (n instanceof Tt || r.parent.inlineContent || i.parent.inlineContent)
    return !1;
  let o = Wu(i.parent.contentMatchAt(i.indexAfter()));
  if (!o || !o.isTextblock)
    return !1;
  if (e) {
    let s = (!r.parentOffset && i.index() < i.parent.childCount ? r : i).pos, l = t.tr.insert(s, o.createAndFill());
    l.setSelection(Q.create(l.doc, s + 1)), e(l.scrollIntoView());
  }
  return !0;
}, Rx = (t, e) => {
  let { $cursor: n } = t.selection;
  if (!n || n.parent.content.size)
    return !1;
  if (n.depth > 1 && n.after() != n.end(-1)) {
    let o = n.before();
    if (mo(t.doc, o))
      return e && e(t.tr.split(o).scrollIntoView()), !0;
  }
  let r = n.blockRange(), i = r && Cl(r);
  return i == null ? !1 : (e && e(t.tr.lift(r, i).scrollIntoView()), !0);
};
function Lx(t) {
  return (e, n) => {
    let { $from: r, $to: i } = e.selection;
    if (e.selection instanceof X && e.selection.node.isBlock)
      return !r.parentOffset || !mo(e.doc, r.pos) ? !1 : (n && n(e.tr.split(r.pos).scrollIntoView()), !0);
    if (!r.depth)
      return !1;
    let o = [], s, l, a = !1, u = !1;
    for (let h = r.depth; ; h--)
      if (r.node(h).isBlock) {
        a = r.end(h) == r.pos + (r.depth - h), u = r.start(h) == r.pos - (r.depth - h), l = Wu(r.node(h - 1).contentMatchAt(r.indexAfter(h - 1))), o.unshift(a && l ? { type: l } : null), s = h;
        break;
      } else {
        if (h == 1)
          return !1;
        o.unshift(null);
      }
    let c = e.tr;
    (e.selection instanceof Q || e.selection instanceof Tt) && c.deleteSelection();
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
const Px = Lx(), zx = (t, e) => (e && e(t.tr.setSelection(new Tt(t.doc))), !0);
function Bx(t, e, n) {
  let r = e.nodeBefore, i = e.nodeAfter, o = e.index();
  return !r || !i || !r.type.compatibleContent(i.type) ? !1 : !r.content.size && e.parent.canReplace(o - 1, o) ? (n && n(t.tr.delete(e.pos - r.nodeSize, e.pos).scrollIntoView()), !0) : !e.parent.canReplace(o, o + 1) || !(i.isTextblock || Sl(t.doc, e.pos)) ? !1 : (n && n(t.tr.join(e.pos).scrollIntoView()), !0);
}
function wm(t, e, n, r) {
  let i = e.nodeBefore, o = e.nodeAfter, s, l, a = i.type.spec.isolating || o.type.spec.isolating;
  if (!a && Bx(t, e, n))
    return !0;
  let u = !a && e.parent.canReplace(e.index(), e.index() + 1);
  if (u && (s = (l = i.contentMatchAt(i.childCount)).findWrapping(o.type)) && l.matchType(s[0] || o.type).validEnd) {
    if (n) {
      let h = e.pos + o.nodeSize, p = R.empty;
      for (let w = s.length - 1; w >= 0; w--)
        p = R.from(s[w].create(null, p));
      p = R.from(i.copy(p));
      let k = t.tr.step(new Ze(e.pos - 1, h, e.pos, h, new V(p, 1, 0), s.length, !0)), b = k.doc.resolve(h + 2 * s.length);
      b.nodeAfter && b.nodeAfter.type == i.type && Sl(k.doc, b.pos) && k.join(b.pos), n(k.scrollIntoView());
    }
    return !0;
  }
  let c = o.type.spec.isolating || r > 0 && a ? null : te.findFrom(e, 1), f = c && c.$from.blockRange(c.$to), d = f && Cl(f);
  if (d != null && d >= e.depth)
    return n && n(t.tr.lift(f, d).scrollIntoView()), !0;
  if (u && Di(o, "start", !0) && Di(i, "end")) {
    let h = i, p = [];
    for (; p.push(h), !h.isTextblock; )
      h = h.lastChild;
    let k = o, b = 1;
    for (; !k.isTextblock; k = k.firstChild)
      b++;
    if (h.canReplace(h.childCount, h.childCount, k.content)) {
      if (n) {
        let w = R.empty;
        for (let O = p.length - 1; O >= 0; O--)
          w = R.from(p[O].copy(w));
        let L = t.tr.step(new Ze(e.pos - p.length, e.pos + o.nodeSize, e.pos + b, e.pos + o.nodeSize - b, new V(w, p.length, 0), 0, !0));
        n(L.scrollIntoView());
      }
      return !0;
    }
  }
  return !1;
}
function xm(t) {
  return function(e, n) {
    let r = e.selection, i = t < 0 ? r.$from : r.$to, o = i.depth;
    for (; i.node(o).isInline; ) {
      if (!o)
        return !1;
      o--;
    }
    return i.node(o).isTextblock ? (n && n(e.tr.setSelection(Q.create(e.doc, t < 0 ? i.start(o) : i.end(o)))), !0) : !1;
  };
}
const Fx = xm(-1), $x = xm(1);
function qu(t, e = null) {
  return function(n, r) {
    let { $from: i, $to: o } = n.selection, s = i.blockRange(o), l = s && _u(s, t, e);
    return l ? (r && r(n.tr.wrap(s, l).scrollIntoView()), !0) : !1;
  };
}
function xn(t, e = null) {
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
function _x(t, e, n, r) {
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
    if (o && !s || !_x(r.doc, l, t))
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
            let h = f.pos, p = d.pos, k = f.nodeAfter, b = d.nodeBefore, w = k && k.isText ? /^\s*/.exec(k.text)[0].length : 0, L = b && b.isText ? /\s*$/.exec(b.text)[0].length : 0;
            h + w < p && (h += w, p -= L), u.addMark(h, p, t.create(e));
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
let ta = Vi(Hu, ym, km), Ad = Vi(Hu, Ix, Ax);
const hn = {
  Enter: Vi(Ex, Dx, Rx, Px),
  "Mod-Enter": Ox,
  Backspace: ta,
  "Mod-Backspace": ta,
  "Shift-Backspace": ta,
  Delete: Ad,
  "Mod-Delete": Ad,
  "Mod-a": zx
}, Cm = {
  "Ctrl-h": hn.Backspace,
  "Alt-Backspace": hn["Mod-Backspace"],
  "Ctrl-d": hn.Delete,
  "Ctrl-Alt-Backspace": hn["Mod-Delete"],
  "Alt-Delete": hn["Mod-Delete"],
  "Alt-d": hn["Mod-Delete"],
  "Ctrl-a": Fx,
  "Ctrl-e": $x
};
for (let t in hn)
  Cm[t] = hn[t];
const Vx = typeof navigator < "u" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : typeof os < "u" && os.platform ? os.platform() == "darwin" : !1, Hx = Vx ? Cm : hn;
class Nt {
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
    this.match = e, this.match = e, this.handler = typeof n == "string" ? jx(n) : n, this.undoable = r.undoable !== !1, this.inCode = r.inCode || !1, this.inCodeMark = r.inCodeMark !== !1;
  }
}
function jx(t) {
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
const Wx = (t, e) => {
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
new Nt(/--$/, "—", { inCodeMark: !1 });
new Nt(/\.\.\.$/, "…", { inCodeMark: !1 });
new Nt(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(")$/, "“", { inCodeMark: !1 });
new Nt(/"$/, "”", { inCodeMark: !1 });
new Nt(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(')$/, "‘", { inCodeMark: !1 });
new Nt(/'$/, "’", { inCodeMark: !1 });
function Ku(t, e, n = null, r) {
  return new Nt(t, (i, o, s, l) => {
    let a = n instanceof Function ? n(o) : n, u = i.tr.delete(s, l), c = u.doc.resolve(s), f = c.blockRange(), d = f && _u(f, e, a);
    if (!d)
      return null;
    u.wrap(f, d);
    let h = u.doc.resolve(s - 1).nodeBefore;
    return h && h.type == e && Sl(u.doc, s - 1) && (!r || r(o, h)) && u.join(s - 1), u;
  });
}
function Sm(t, e, n = null) {
  return new Nt(t, (r, i, o, s) => {
    let l = r.doc.resolve(o), a = n instanceof Function ? n(i) : n;
    return l.node(-1).canReplaceWith(l.index(-1), l.indexAfter(-1), e) ? r.tr.delete(o, s).setBlockType(o, o, e, a) : null;
  });
}
const nr = typeof navigator < "u" ? navigator : null, Ed = typeof document < "u" ? document : null, or = nr && nr.userAgent || "", Za = /Edge\/(\d+)/.exec(or), vm = /MSIE \d/.exec(or), eu = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(or), Uu = !!(vm || eu || Za);
vm ? document.documentMode : eu ? +eu[1] : Za && +Za[1];
const qx = !Uu && /gecko\/(\d+)/i.test(or);
qx && +(/Firefox\/(\d+)/.exec(or) || [0, 0])[1];
const tu = !Uu && /Chrome\/(\d+)/.exec(or), Kx = !!tu;
tu && +tu[1];
const Ux = !Uu && !!nr && /Apple Computer/.test(nr.vendor), Jx = Ux && (/Mobile\/\w+/.test(or) || !!nr && nr.maxTouchPoints > 2);
Jx || nr && /Mac/.test(nr.platform);
const Gx = /Android \d/.test(or), Yx = !!Ed && "webkitFontSmoothing" in Ed.documentElement.style;
Yx && +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1];
function na(t, e, n, r, i, o) {
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
const Qx = new nt("MILKDOWN_CUSTOM_INPUTRULES");
function Xx({ rules: t }) {
  const e = new je({
    key: Qx,
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
        return na(n, r, i, o, t, e);
      },
      handleDOMEvents: {
        compositionend: (n) => (setTimeout(() => {
          const { $cursor: r } = n.state.selection;
          r && na(n, r.pos, r.pos, "", t, e);
        }), !1),
        keydown: (n, r) => !(Gx && Kx && r.key === "Enter") || n.composing ? !1 : n.someProp(
          "handleKeyDown",
          (i) => i(n, r)
        ) ? (r.preventDefault(), !0) : !1
      },
      handleKeyDown(n, r) {
        if (r.key !== "Enter") return !1;
        const { $cursor: i } = n.state.selection;
        return i ? na(n, i.pos, i.pos, `
`, t, e) : !1;
      }
    }
  });
  return e;
}
function is(t, e, n = {}) {
  return new Nt(t, (r, i, o, s) => {
    var l, a, u, c;
    const { tr: f } = r, d = i.length;
    let h = i[d - 1], p = i[0], k = [], b;
    const w = {
      group: h,
      fullMatch: p,
      start: o,
      end: s
    }, L = (l = n.updateCaptured) == null ? void 0 : l.call(n, w);
    if (Object.assign(w, L), { group: h, fullMatch: p, start: o, end: s } = w, p === null || (h == null ? void 0 : h.trim()) === "") return null;
    if (h) {
      const O = p.search(/\S/), W = o + p.indexOf(h), j = W + h.length;
      k = (a = f.storedMarks) != null ? a : [], j < s && f.delete(j, s), W > o && f.delete(o + O, W), b = o + O + h.length;
      const T = (u = n.getAttr) == null ? void 0 : u.call(n, i);
      f.addMark(o, b, e.create(T)), f.setStoredMarks(k), (c = n.beforeDispatch) == null || c.call(n, { match: i, start: o, end: s, tr: f });
    }
    return f;
  });
}
function Mm(t) {
  return Object.assign(Object.create(t), t).setTime(Date.now());
}
function Zx(t, e) {
  return Array.isArray(t) && t.includes(e.type) || e.type === t;
}
function eC(t) {
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
function tC(t, e) {
  return eC((n) => n.type === e)(t);
}
function nC(t) {
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
function rC(t, e) {
  if (!(t instanceof X)) return;
  const { node: n, $from: r } = t;
  if (Zx(e, n))
    return {
      node: n,
      pos: r.pos,
      start: r.start(r.depth),
      depth: r.depth
    };
}
const iC = (t, e) => {
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
}, nl = {
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
}, oC = typeof navigator < "u" && /Mac/.test(navigator.platform), sC = typeof navigator < "u" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
for (var qe = 0; qe < 10; qe++) rr[48 + qe] = rr[96 + qe] = String(qe);
for (var qe = 1; qe <= 24; qe++) rr[qe + 111] = "F" + qe;
for (var qe = 65; qe <= 90; qe++)
  rr[qe] = String.fromCharCode(qe + 32), nl[qe] = String.fromCharCode(qe);
for (var ra in rr) nl.hasOwnProperty(ra) || (nl[ra] = rr[ra]);
function lC(t) {
  var e = oC && t.metaKey && t.shiftKey && !t.ctrlKey && !t.altKey || sC && t.shiftKey && t.key && t.key.length == 1 || t.key == "Unidentified", n = !e && t.key || (t.shiftKey ? nl : rr)[t.keyCode] || t.key || "Unidentified";
  return n == "Esc" && (n = "Escape"), n == "Del" && (n = "Delete"), n == "Left" && (n = "ArrowLeft"), n == "Up" && (n = "ArrowUp"), n == "Right" && (n = "ArrowRight"), n == "Down" && (n = "ArrowDown"), n;
}
const aC = typeof navigator < "u" && /Mac|iP(hone|[oa]d)/.test(navigator.platform), uC = typeof navigator < "u" && /Win/.test(navigator.platform);
function cC(t) {
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
      aC ? s = !0 : i = !0;
    else
      throw new Error("Unrecognized modifier name: " + a);
  }
  return r && (n = "Alt-" + n), i && (n = "Ctrl-" + n), s && (n = "Meta-" + n), o && (n = "Shift-" + n), n;
}
function fC(t) {
  let e = /* @__PURE__ */ Object.create(null);
  for (let n in t)
    e[cC(n)] = t[n];
  return e;
}
function ia(t, e, n = !0) {
  return e.altKey && (t = "Alt-" + t), e.ctrlKey && (t = "Ctrl-" + t), e.metaKey && (t = "Meta-" + t), n && e.shiftKey && (t = "Shift-" + t), t;
}
function Tm(t) {
  return new je({ props: { handleKeyDown: Nm(t) } });
}
function Nm(t) {
  let e = fC(t);
  return function(n, r) {
    let i = lC(r), o, s = e[ia(i, r)];
    if (s && s(n.state, n.dispatch, n))
      return !0;
    if (i.length == 1 && i != " ") {
      if (r.shiftKey) {
        let l = e[ia(i, r, !1)];
        if (l && l(n.state, n.dispatch, n))
          return !0;
      }
      if ((r.altKey || r.metaKey || r.ctrlKey) && // Ctrl-Alt may be used for AltGr on Windows
      !(uC && r.ctrlKey && r.altKey) && (o = rr[r.keyCode]) && o != i) {
        let l = e[ia(o, r)];
        if (l && l(n.state, n.dispatch, n))
          return !0;
      }
    }
    return !1;
  };
}
var Im = class {
}, Am = class {
  constructor() {
    this.elements = [], this.size = () => this.elements.length, this.top = () => this.elements.at(-1), this.push = (t) => {
      var e;
      (e = this.top()) == null || e.push(t);
    }, this.open = (t) => {
      this.elements.push(t);
    }, this.close = () => {
      const t = this.elements.pop();
      if (!t) throw op();
      return t;
    };
  }
}, dC = class Em extends Im {
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
    return new Em(e, n, r);
  }
}, Ht, bi, Ho, jo, Wo, wi, xi, Pr, hC = (Pr = class extends Am {
  constructor(n) {
    super();
    K(this, Ht);
    K(this, bi);
    K(this, Ho);
    K(this, jo);
    K(this, Wo);
    K(this, wi);
    K(this, xi);
    B(this, Ht, he.none), B(this, bi, (r) => r.isText), B(this, Ho, (r, i) => {
      if (M(this, bi).call(this, r) && M(this, bi).call(this, i) && he.sameSet(r.marks, i.marks)) return this.schema.text(r.text + i.text, r.marks);
    }), B(this, jo, (r) => {
      const i = Object.values({
        ...this.schema.nodes,
        ...this.schema.marks
      }).find((o) => o.spec.parseMarkdown.match(r));
      if (!i) throw Kk(r);
      return i;
    }), B(this, Wo, (r) => {
      const i = M(this, jo).call(this, r);
      i.spec.parseMarkdown.runner(this, r, i);
    }), this.injectRoot = (r, i, o) => (this.openNode(i, o), this.next(r.children), this), this.openNode = (r, i) => (this.open(dC.create(r, [], i)), this), B(this, wi, () => {
      B(this, Ht, he.none);
      const r = this.close();
      return M(this, xi).call(this, r.type, r.attrs, r.content);
    }), this.closeNode = () => {
      try {
        M(this, wi).call(this);
      } catch (r) {
        console.error(r);
      }
      return this;
    }, B(this, xi, (r, i, o) => {
      const s = r.createAndFill(i, o, M(this, Ht));
      if (!s) throw qk(r, i, o);
      return this.push(s), s;
    }), this.addNode = (r, i, o) => {
      try {
        M(this, xi).call(this, r, i, o);
      } catch (s) {
        console.error(s);
      }
      return this;
    }, this.openMark = (r, i) => {
      const o = r.create(i);
      return B(this, Ht, o.addToSet(M(this, Ht))), this;
    }, this.closeMark = (r) => (B(this, Ht, r.removeFromSet(M(this, Ht))), this), this.addText = (r) => {
      try {
        const i = this.top();
        if (!i) throw op();
        const o = i.pop(), s = this.schema.text(r, M(this, Ht));
        if (!o)
          return i.push(s), this;
        const l = M(this, Ho).call(this, o, s);
        return l ? (i.push(l), this) : (i.push(o, s), this);
      } catch (i) {
        return console.error(i), this;
      }
    }, this.build = () => {
      let r;
      do
        r = M(this, wi).call(this);
      while (this.size());
      return r;
    }, this.next = (r = []) => ([r].flat().forEach((i) => M(this, Wo).call(this, i)), this), this.toDoc = () => this.build(), this.run = (r, i) => {
      const o = r.runSync(r.parse(i), i);
      return this.next(o), this;
    }, this.schema = n;
  }
}, Ht = new WeakMap(), bi = new WeakMap(), Ho = new WeakMap(), jo = new WeakMap(), Wo = new WeakMap(), wi = new WeakMap(), xi = new WeakMap(), Pr.create = (n, r) => {
  const i = new Pr(n);
  return (o) => (i.run(r, o), i.toDoc());
}, Pr), zr, Od = (zr = class extends Im {
  constructor(e, n, r, i = {}) {
    super(), this.type = e, this.children = n, this.value = r, this.props = i, this.push = (o, ...s) => {
      this.children || (this.children = []), this.children.push(o, ...s);
    }, this.pop = () => {
      var o;
      return (o = this.children) == null ? void 0 : o.pop();
    };
  }
}, zr.create = (e, n, r, i = {}) => new zr(e, n, r, i), zr), pC = (t) => Object.prototype.hasOwnProperty.call(t, "size"), Gt, Ci, qo, Ko, Si, Uo, vi, Jo, Go, wr, Kn, Yo, Mi, Br, mC = (Br = class extends Am {
  constructor(n) {
    super();
    K(this, Gt);
    K(this, Ci);
    K(this, qo);
    K(this, Ko);
    K(this, Si);
    K(this, Uo);
    K(this, vi);
    K(this, Jo);
    K(this, Go);
    K(this, wr);
    K(this, Kn);
    K(this, Yo);
    K(this, Mi);
    B(this, Gt, he.none), B(this, Ci, (r) => {
      const i = Object.values({
        ...this.schema.nodes,
        ...this.schema.marks
      }).find((o) => o.spec.toMarkdown.match(r));
      if (!i) throw Uk(r.type);
      return i;
    }), B(this, qo, (r) => M(this, Ci).call(this, r).spec.toMarkdown.runner(this, r)), B(this, Ko, (r, i) => M(this, Ci).call(this, r).spec.toMarkdown.runner(this, r, i)), B(this, Si, (r) => {
      const { marks: i } = r, o = (s) => s.type.spec.priority ?? 50;
      [...i].sort((s, l) => o(s) - o(l)).every((s) => !M(this, Ko).call(this, s, r)) && M(this, qo).call(this, r), i.forEach((s) => M(this, Mi).call(this, s));
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
          s = M(this, Uo).call(this, s, a.type);
          const { children: u, ...c } = s, { children: f, ...d } = a;
          if (s.type === a.type && u && f && JSON.stringify(c) === JSON.stringify(d)) {
            const h = {
              ...d,
              children: [...f, ...u]
            };
            return o.slice(0, -1).concat(M(this, vi).call(this, h));
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
    }), this.openNode = (r, i, o) => (this.open(Od.create(r, void 0, i, o)), this), B(this, Go, (r, i) => {
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
      o.length && M(this, Kn).call(this, "text", void 0, o);
      const f = i();
      return s.length && M(this, Kn).call(this, "text", void 0, s), f;
    }), B(this, wr, (r = !1) => {
      const i = this.close(), o = () => M(this, Kn).call(this, i.type, i.children, i.value, i.props);
      return r ? M(this, Go).call(this, i, o) : o();
    }), this.closeNode = () => (M(this, wr).call(this), this), B(this, Kn, (r, i, o, s) => {
      const l = Od.create(r, i, o, s), a = M(this, vi).call(this, M(this, Jo).call(this, l));
      return this.push(a), a;
    }), this.addNode = (r, i, o, s) => (M(this, Kn).call(this, r, i, o, s), this), B(this, Yo, (r, i, o, s) => r.isInSet(M(this, Gt)) ? this : (B(this, Gt, r.addToSet(M(this, Gt))), this.openNode(i, o, {
      ...s,
      isMark: !0
    }))), B(this, Mi, (r) => {
      r.isInSet(M(this, Gt)) && (B(this, Gt, r.type.removeFromSet(M(this, Gt))), M(this, wr).call(this, !0));
    }), this.withMark = (r, i, o, s) => (M(this, Yo).call(this, r, i, o, s), this), this.closeMark = (r) => (M(this, Mi).call(this, r), this), this.build = () => {
      let r = null;
      do
        r = M(this, wr).call(this);
      while (this.size());
      return r;
    }, this.next = (r) => pC(r) ? (r.forEach((i) => {
      M(this, Si).call(this, i);
    }), this) : (M(this, Si).call(this, r), this), this.toString = (r) => r.stringify(this.build()), this.run = (r) => (this.next(r), this), this.schema = n;
  }
}, Gt = new WeakMap(), Ci = new WeakMap(), qo = new WeakMap(), Ko = new WeakMap(), Si = new WeakMap(), Uo = new WeakMap(), vi = new WeakMap(), Jo = new WeakMap(), Go = new WeakMap(), wr = new WeakMap(), Kn = new WeakMap(), Yo = new WeakMap(), Mi = new WeakMap(), Br.create = (n, r) => {
  const i = new Br(n);
  return (o) => (i.run(o), i.toString(r));
}, Br);
const Ke = function(t) {
  for (var e = 0; ; e++)
    if (t = t.previousSibling, !t)
      return e;
}, Ri = function(t) {
  let e = t.assignedSlot || t.parentNode;
  return e && e.nodeType == 11 ? e.host : e;
};
let nu = null;
const dn = function(t, e, n) {
  let r = nu || (nu = document.createRange());
  return r.setEnd(t, n ?? t.nodeValue.length), r.setStart(t, e || 0), r;
}, gC = function() {
  nu = null;
}, Vr = function(t, e, n, r) {
  return n && (Dd(t, e, n, r, -1) || Dd(t, e, n, r, 1));
}, yC = /^(img|br|input|textarea|hr)$/i;
function Dd(t, e, n, r, i) {
  for (var o; ; ) {
    if (t == n && e == r)
      return !0;
    if (e == (i < 0 ? 0 : Lt(t))) {
      let s = t.parentNode;
      if (!s || s.nodeType != 1 || ss(t) || yC.test(t.nodeName) || t.contentEditable == "false")
        return !1;
      e = Ke(t) + (i < 0 ? 0 : 1), t = s;
    } else if (t.nodeType == 1) {
      let s = t.childNodes[e + (i < 0 ? -1 : 0)];
      if (s.nodeType == 1 && s.contentEditable == "false")
        if (!((o = s.pmViewDesc) === null || o === void 0) && o.ignoreForSelection)
          e += i;
        else
          return !1;
      else
        t = s, e = i < 0 ? Lt(t) : 0;
    } else
      return !1;
  }
}
function Lt(t) {
  return t.nodeType == 3 ? t.nodeValue.length : t.childNodes.length;
}
function kC(t, e) {
  for (; ; ) {
    if (t.nodeType == 3 && e)
      return t;
    if (t.nodeType == 1 && e > 0) {
      if (t.contentEditable == "false")
        return null;
      t = t.childNodes[e - 1], e = Lt(t);
    } else if (t.parentNode && !ss(t))
      e = Ke(t), t = t.parentNode;
    else
      return null;
  }
}
function bC(t, e) {
  for (; ; ) {
    if (t.nodeType == 3 && e < t.nodeValue.length)
      return t;
    if (t.nodeType == 1 && e < t.childNodes.length) {
      if (t.contentEditable == "false")
        return null;
      t = t.childNodes[e], e = 0;
    } else if (t.parentNode && !ss(t))
      e = Ke(t) + 1, t = t.parentNode;
    else
      return null;
  }
}
function wC(t, e, n) {
  for (let r = e == 0, i = e == Lt(t); r || i; ) {
    if (t == n)
      return !0;
    let o = Ke(t);
    if (t = t.parentNode, !t)
      return !1;
    r = r && o == 0, i = i && o == Lt(t);
  }
}
function ss(t) {
  let e;
  for (let n = t; n && !(e = n.pmViewDesc); n = n.parentNode)
    ;
  return e && e.node && e.node.isBlock && (e.dom == t || e.contentDOM == t);
}
const Tl = function(t) {
  return t.focusNode && Vr(t.focusNode, t.focusOffset, t.anchorNode, t.anchorOffset);
};
function pr(t, e) {
  let n = document.createEvent("Event");
  return n.initEvent("keydown", !0, !0), n.keyCode = t, n.key = n.code = e, n;
}
function xC(t) {
  let e = t.activeElement;
  for (; e && e.shadowRoot; )
    e = e.shadowRoot.activeElement;
  return e;
}
function CC(t, e, n) {
  if (t.caretPositionFromPoint)
    try {
      let r = t.caretPositionFromPoint(e, n);
      if (r)
        return { node: r.offsetNode, offset: Math.min(Lt(r.offsetNode), r.offset) };
    } catch {
    }
  if (t.caretRangeFromPoint) {
    let r = t.caretRangeFromPoint(e, n);
    if (r)
      return { node: r.startContainer, offset: Math.min(Lt(r.startContainer), r.startOffset) };
  }
}
const Qt = typeof navigator < "u" ? navigator : null, Rd = typeof document < "u" ? document : null, sr = Qt && Qt.userAgent || "", ru = /Edge\/(\d+)/.exec(sr), Om = /MSIE \d/.exec(sr), iu = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(sr), gt = !!(Om || iu || ru), Qn = Om ? document.documentMode : iu ? +iu[1] : ru ? +ru[1] : 0, Pt = !gt && /gecko\/(\d+)/i.test(sr);
Pt && +(/Firefox\/(\d+)/.exec(sr) || [0, 0])[1];
const ou = !gt && /Chrome\/(\d+)/.exec(sr), Ue = !!ou, Dm = ou ? +ou[1] : 0, et = !gt && !!Qt && /Apple Computer/.test(Qt.vendor), Li = et && (/Mobile\/\w+/.test(sr) || !!Qt && Qt.maxTouchPoints > 2), Dt = Li || (Qt ? /Mac/.test(Qt.platform) : !1), Rm = Qt ? /Win/.test(Qt.platform) : !1, Cn = /Android \d/.test(sr), ls = !!Rd && "webkitFontSmoothing" in Rd.documentElement.style, SC = ls ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0;
function vC(t) {
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
function cn(t, e) {
  return typeof t == "number" ? t : t[e];
}
function MC(t) {
  let e = t.getBoundingClientRect(), n = e.width / t.offsetWidth || 1, r = e.height / t.offsetHeight || 1;
  return {
    left: e.left,
    right: e.left + t.clientWidth * n,
    top: e.top,
    bottom: e.top + t.clientHeight * r
  };
}
function Ld(t, e, n) {
  let r = t.someProp("scrollThreshold") || 0, i = t.someProp("scrollMargin") || 5, o = t.dom.ownerDocument;
  for (let s = n || t.dom; s; ) {
    if (s.nodeType != 1) {
      s = Ri(s);
      continue;
    }
    let l = s, a = l == o.body, u = a ? vC(o) : MC(l), c = 0, f = 0;
    if (e.top < u.top + cn(r, "top") ? f = -(u.top - e.top + cn(i, "top")) : e.bottom > u.bottom - cn(r, "bottom") && (f = e.bottom - e.top > u.bottom - u.top ? e.top + cn(i, "top") - u.top : e.bottom - u.bottom + cn(i, "bottom")), e.left < u.left + cn(r, "left") ? c = -(u.left - e.left + cn(i, "left")) : e.right > u.right - cn(r, "right") && (c = e.right - u.right + cn(i, "right")), c || f)
      if (a)
        o.defaultView.scrollBy(c, f);
      else {
        let h = l.scrollLeft, p = l.scrollTop;
        f && (l.scrollTop += f), c && (l.scrollLeft += c);
        let k = l.scrollLeft - h, b = l.scrollTop - p;
        e = { left: e.left - k, top: e.top - b, right: e.right - k, bottom: e.bottom - b };
      }
    let d = a ? "fixed" : getComputedStyle(s).position;
    if (/^(fixed|sticky)$/.test(d))
      break;
    s = d == "absolute" ? s.offsetParent : Ri(s);
  }
}
function TC(t) {
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
  return { refDOM: r, refTop: i, stack: Lm(t.dom) };
}
function Lm(t) {
  let e = [], n = t.ownerDocument;
  for (let r = t; r && (e.push({ dom: r, top: r.scrollTop, left: r.scrollLeft }), t != n); r = Ri(r))
    ;
  return e;
}
function NC({ refDOM: t, refTop: e, stack: n }) {
  let r = t ? t.getBoundingClientRect().top : 0;
  Pm(n, r == 0 ? 0 : r - e);
}
function Pm(t, e) {
  for (let n = 0; n < t.length; n++) {
    let { dom: r, top: i, left: o } = t[n];
    r.scrollTop != i + e && (r.scrollTop = i + e), r.scrollLeft != o && (r.scrollLeft = o);
  }
}
let Yr = null;
function IC(t) {
  if (t.setActive)
    return t.setActive();
  if (Yr)
    return t.focus(Yr);
  let e = Lm(t);
  t.focus(Yr == null ? {
    get preventScroll() {
      return Yr = { preventScroll: !0 }, !0;
    }
  } : void 0), Yr || (Yr = !1, Pm(e, 0));
}
function zm(t, e) {
  let n, r = 2e8, i, o = 0, s = e.top, l = e.top, a, u;
  for (let c = t.firstChild, f = 0; c; c = c.nextSibling, f++) {
    let d;
    if (c.nodeType == 1)
      d = c.getClientRects();
    else if (c.nodeType == 3)
      d = dn(c).getClientRects();
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
  return !n && a && (n = a, i = u, r = 0), n && n.nodeType == 3 ? AC(n, i) : !n || r && n.nodeType == 1 ? { node: t, offset: o } : zm(n, i);
}
function AC(t, e) {
  let n = t.nodeValue.length, r = document.createRange(), i;
  for (let o = 0; o < n; o++) {
    r.setEnd(t, o + 1), r.setStart(t, o);
    let s = Fn(r, 1);
    if (s.top != s.bottom && Ju(e, s)) {
      i = { node: t, offset: o + (e.left >= (s.left + s.right) / 2 ? 1 : 0) };
      break;
    }
  }
  return r.detach(), i || { node: t, offset: 0 };
}
function Ju(t, e) {
  return t.left >= e.left - 1 && t.left <= e.right + 1 && t.top >= e.top - 1 && t.top <= e.bottom + 1;
}
function EC(t, e) {
  let n = t.parentNode;
  return n && /^li$/i.test(n.nodeName) && e.left < t.getBoundingClientRect().left ? n : t;
}
function OC(t, e, n) {
  let { node: r, offset: i } = zm(e, n), o = -1;
  if (r.nodeType == 1 && !r.firstChild) {
    let s = r.getBoundingClientRect();
    o = s.left != s.right && n.left > (s.left + s.right) / 2 ? 1 : -1;
  }
  return t.docView.posFromDOM(r, i, o);
}
function DC(t, e, n, r) {
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
function Bm(t, e, n) {
  let r = t.childNodes.length;
  if (r && n.top < n.bottom)
    for (let i = Math.max(0, Math.min(r - 1, Math.floor(r * (e.top - n.top) / (n.bottom - n.top)) - 2)), o = i; ; ) {
      let s = t.childNodes[o];
      if (s.nodeType == 1) {
        let l = s.getClientRects();
        for (let a = 0; a < l.length; a++) {
          let u = l[a];
          if (Ju(e, u))
            return Bm(s, e, u);
        }
      }
      if ((o = (o + 1) % r) == i)
        break;
    }
  return t;
}
function RC(t, e) {
  let n = t.dom.ownerDocument, r, i = 0, o = CC(n, e.left, e.top);
  o && ({ node: r, offset: i } = o);
  let s = (t.root.elementFromPoint ? t.root : n).elementFromPoint(e.left, e.top), l;
  if (!s || !t.dom.contains(s.nodeType != 1 ? s.parentNode : s)) {
    let u = t.dom.getBoundingClientRect();
    if (!Ju(e, u) || (s = Bm(t.dom, e, u), !s))
      return null;
  }
  if (et)
    for (let u = s; r && u; u = Ri(u))
      u.draggable && (r = void 0);
  if (s = EC(s, e), r) {
    if (Pt && r.nodeType == 1 && (i = Math.min(i, r.childNodes.length), i < r.childNodes.length)) {
      let c = r.childNodes[i], f;
      c.nodeName == "IMG" && (f = c.getBoundingClientRect()).right <= e.left && f.bottom > e.top && i++;
    }
    let u;
    ls && i && r.nodeType == 1 && (u = r.childNodes[i - 1]).nodeType == 1 && u.contentEditable == "false" && u.getBoundingClientRect().top >= e.top && i--, r == t.dom && i == r.childNodes.length - 1 && r.lastChild.nodeType == 1 && e.top > r.lastChild.getBoundingClientRect().bottom ? l = t.state.doc.content.size : (i == 0 || r.nodeType != 1 || r.childNodes[i - 1].nodeName != "BR") && (l = DC(t, r, i, e));
  }
  l == null && (l = OC(t, s, e));
  let a = t.docView.nearestDesc(s, !0);
  return { pos: l, inside: a ? a.posAtStart - a.border : -1 };
}
function Pd(t) {
  return t.top < t.bottom || t.left < t.right;
}
function Fn(t, e) {
  let n = t.getClientRects();
  if (n.length) {
    let r = n[e < 0 ? 0 : n.length - 1];
    if (Pd(r))
      return r;
  }
  return Array.prototype.find.call(n, Pd) || t.getBoundingClientRect();
}
const LC = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
function Fm(t, e, n) {
  let { node: r, offset: i, atom: o } = t.docView.domFromPos(e, n < 0 ? -1 : 1), s = ls || Pt;
  if (r.nodeType == 3)
    if (s && (LC.test(r.nodeValue) || (n < 0 ? !i : i == r.nodeValue.length))) {
      let a = Fn(dn(r, i, i), n);
      if (Pt && i && /\s/.test(r.nodeValue[i - 1]) && i < r.nodeValue.length) {
        let u = Fn(dn(r, i - 1, i - 1), -1);
        if (u.top == a.top) {
          let c = Fn(dn(r, i, i + 1), -1);
          if (c.top != a.top)
            return ro(c, c.left < u.left);
        }
      }
      return a;
    } else {
      let a = i, u = i, c = n < 0 ? 1 : -1;
      return n < 0 && !i ? (u++, c = -1) : n >= 0 && i == r.nodeValue.length ? (a--, c = 1) : n < 0 ? a-- : u++, ro(Fn(dn(r, a, u), c), c < 0);
    }
  if (!t.state.doc.resolve(e - (o || 0)).parent.inlineContent) {
    if (o == null && i && (n < 0 || i == Lt(r))) {
      let a = r.childNodes[i - 1];
      if (a.nodeType == 1)
        return oa(a.getBoundingClientRect(), !1);
    }
    if (o == null && i < Lt(r)) {
      let a = r.childNodes[i];
      if (a.nodeType == 1)
        return oa(a.getBoundingClientRect(), !0);
    }
    return oa(r.getBoundingClientRect(), n >= 0);
  }
  if (o == null && i && (n < 0 || i == Lt(r))) {
    let a = r.childNodes[i - 1], u = a.nodeType == 3 ? dn(a, Lt(a) - (s ? 0 : 1)) : a.nodeType == 1 && (a.nodeName != "BR" || !a.nextSibling) ? a : null;
    if (u)
      return ro(Fn(u, 1), !1);
  }
  if (o == null && i < Lt(r)) {
    let a = r.childNodes[i];
    for (; a.pmViewDesc && a.pmViewDesc.ignoreForCoords; )
      a = a.nextSibling;
    let u = a ? a.nodeType == 3 ? dn(a, 0, s ? 0 : 1) : a.nodeType == 1 ? a : null : null;
    if (u)
      return ro(Fn(u, -1), !0);
  }
  return ro(Fn(r.nodeType == 3 ? dn(r) : r, -n), n >= 0);
}
function ro(t, e) {
  if (t.width == 0)
    return t;
  let n = e ? t.left : t.right;
  return { top: t.top, bottom: t.bottom, left: n, right: n };
}
function oa(t, e) {
  if (t.height == 0)
    return t;
  let n = e ? t.top : t.bottom;
  return { top: n, bottom: n, left: t.left, right: t.right };
}
function $m(t, e, n) {
  let r = t.state, i = t.root.activeElement;
  r != e && t.updateState(e), i != t.dom && t.focus();
  try {
    return n();
  } finally {
    r != e && t.updateState(r), i != t.dom && i && i.focus();
  }
}
function PC(t, e, n) {
  let r = e.selection, i = n == "up" ? r.$from : r.$to;
  return $m(t, e, () => {
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
    let s = Fm(t, i.pos, 1);
    for (let l = o.firstChild; l; l = l.nextSibling) {
      let a;
      if (l.nodeType == 1)
        a = l.getClientRects();
      else if (l.nodeType == 3)
        a = dn(l, 0, l.nodeValue.length).getClientRects();
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
const zC = /[\u0590-\u08ac]/;
function BC(t, e, n) {
  let { $head: r } = e.selection;
  if (!r.parent.isTextblock)
    return !1;
  let i = r.parentOffset, o = !i, s = i == r.parent.content.size, l = t.domSelection();
  return l ? !zC.test(r.parent.textContent) || !l.modify ? n == "left" || n == "backward" ? o : s : $m(t, e, () => {
    let { focusNode: a, focusOffset: u, anchorNode: c, anchorOffset: f } = t.domSelectionRange(), d = l.caretBidiLevel;
    l.modify("move", n, "character");
    let h = r.depth ? t.docView.domAfterPos(r.before()) : t.dom, { focusNode: p, focusOffset: k } = t.domSelectionRange(), b = p && !h.contains(p.nodeType == 1 ? p : p.parentNode) || a == p && u == k;
    try {
      l.collapse(c, f), a && (a != c || u != f) && l.extend && l.extend(a, u);
    } catch {
    }
    return d != null && (l.caretBidiLevel = d), b;
  }) : r.pos == r.start() || r.pos == r.end();
}
let zd = null, Bd = null, Fd = !1;
function FC(t, e, n) {
  return zd == e && Bd == n ? Fd : (zd = e, Bd = n, Fd = n == "up" || n == "down" ? PC(t, e, n) : BC(t, e, n));
}
const zt = 0, $d = 1, mr = 2, Xt = 3;
class as {
  constructor(e, n, r, i) {
    this.parent = e, this.children = n, this.dom = r, this.contentDOM = i, this.dirty = zt, r.pmViewDesc = this;
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
      i = n > Ke(this.contentDOM);
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
      if (l > e || s instanceof Vm) {
        i = e - o;
        break;
      }
      o = l;
    }
    if (i)
      return this.children[r].domFromPos(i - this.children[r].border, n);
    for (let o; r && !(o = this.children[r - 1]).size && o instanceof _m && o.side >= 0; r--)
      ;
    if (n <= 0) {
      let o, s = !0;
      for (; o = r ? this.children[r - 1] : null, !(!o || o.dom.parentNode == this.contentDOM); r--, s = !1)
        ;
      return o && n && s && !o.border && !o.domAtom ? o.domFromPos(o.size, n) : { node: this.contentDOM, offset: o ? Ke(o.dom) + 1 : 0 };
    } else {
      let o, s = !0;
      for (; o = r < this.children.length ? this.children[r] : null, !(!o || o.dom.parentNode == this.contentDOM); r++, s = !1)
        ;
      return o && s && !o.border && !o.domAtom ? o.domFromPos(0, n) : { node: this.contentDOM, offset: o ? Ke(o.dom) : this.contentDOM.childNodes.length };
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
            i = Ke(d.dom) + 1;
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
            o = Ke(f.dom);
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
      let k = this.children[h], b = p + k.size;
      if (o > p && s < b)
        return k.setSelection(e - p - k.border, n - p - k.border, r, i);
      p = b;
    }
    let l = this.domFromPos(e, e ? -1 : 1), a = n == e ? l : this.domFromPos(n, n ? -1 : 1), u = r.root.getSelection(), c = r.domSelectionRange(), f = !1;
    if ((Pt || et) && e == n) {
      let { node: h, offset: p } = l;
      if (h.nodeType == 3) {
        if (f = !!(p && h.nodeValue[p - 1] == `
`), f && p == h.nodeValue.length)
          for (let k = h, b; k; k = k.parentNode) {
            if (b = k.nextSibling) {
              b.nodeName == "BR" && (l = a = { node: b.parentNode, offset: Ke(b) + 1 });
              break;
            }
            let w = k.pmViewDesc;
            if (w && w.node && w.node.isBlock)
              break;
          }
      } else {
        let k = h.childNodes[p - 1];
        f = k && (k.nodeName == "BR" || k.contentEditable == "false");
      }
    }
    if (Pt && c.focusNode && c.focusNode != a.node && c.focusNode.nodeType == 1) {
      let h = c.focusNode.childNodes[c.focusOffset];
      h && h.contentEditable == "false" && (i = !0);
    }
    if (!(i || f && et) && Vr(l.node, l.offset, c.anchorNode, c.anchorOffset) && Vr(a.node, a.offset, c.focusNode, c.focusOffset))
      return;
    let d = !1;
    if ((u.extend || e == n) && !(f && Pt)) {
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
          this.dirty = e == r || n == s ? mr : $d, e == l && n == a && (o.contentLost || o.dom.parentNode != this.contentDOM) ? o.dirty = Xt : o.markDirty(e - l, n - l);
          return;
        } else
          o.dirty = o.dom == o.contentDOM && o.dom.parentNode == this.contentDOM && !o.children.length ? mr : Xt;
      }
      r = s;
    }
    this.dirty = mr;
  }
  markParentsDirty() {
    let e = 1;
    for (let n = this.parent; n; n = n.parent, e++) {
      let r = e == 1 ? mr : $d;
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
class _m extends as {
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
    return this.dirty == zt && e.type.eq(this.widget.type);
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
class $C extends as {
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
    return this.dirty & Xt || this.mark.type.spec.reparseInView ? null : { mark: this.mark.type.name, attrs: this.mark.attrs, contentElement: this.contentDOM };
  }
  matchesMark(e) {
    return this.dirty != Xt && this.mark.eq(e);
  }
  markDirty(e, n) {
    if (super.markDirty(e, n), this.dirty != zt) {
      let r = this.parent;
      for (; !r.node; )
        r = r.parent;
      r.dirty < this.dirty && (r.dirty = this.dirty), this.dirty = zt;
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
    return c = Wm(c, r, n), u ? a = new _C(e, n, r, i, c, f || null, d, u, o, s + 1) : n.isText ? new Nl(e, n, r, i, c, d, o) : new Xn(e, n, r, i, c, f || null, d, o, s + 1);
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
    return this.dirty == zt && e.eq(this.node) && rl(n, this.outerDeco) && r.eq(this.innerDeco);
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
    let r = this.node.inlineContent, i = n, o = e.composing ? this.localCompositionInfo(e, n) : null, s = o && o.pos > -1 ? o : null, l = o && o.pos < 0, a = new HC(this, s && s.node, e);
    qC(this.node, this.innerDeco, (u, c, f) => {
      u.spec.marks ? a.syncToMarks(u.spec.marks, r, e, c) : u.type.side >= 0 && !f && a.syncToMarks(c == this.node.childCount ? he.none : this.node.child(c).marks, r, e, c), a.placeWidget(u, e, i);
    }, (u, c, f, d) => {
      a.syncToMarks(u.marks, r, e, d);
      let h;
      a.findNodeMatch(u, c, f, d) || l && e.state.selection.from > i && e.state.selection.to < i + u.nodeSize && (h = a.findIndexWithChild(o.node)) > -1 && a.updateNodeAt(u, c, f, h, e) || a.updateNextNode(u, c, f, e, d, i) || a.addNode(u, c, f, e, i), i += u.nodeSize;
    }), a.syncToMarks([], r, e, 0), this.node.isTextblock && a.addTextblockHacks(), a.destroyRest(), (a.changed || this.dirty == mr) && (s && this.protectLocalComposition(e, s), Hm(this.contentDOM, this.children, e), Li && KC(this.dom));
  }
  localCompositionInfo(e, n) {
    let { from: r, to: i } = e.state.selection;
    if (!(e.state.selection instanceof Q) || r < n || i > n + this.node.content.size)
      return null;
    let o = e.input.compositionNode;
    if (!o || !this.dom.contains(o.parentNode))
      return null;
    if (this.node.inlineContent) {
      let s = o.nodeValue, l = UC(this.node.content, s, r - n, i - n);
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
    let s = new $C(this, o, n, i);
    e.input.compositionNodes.push(s), this.children = lu(this.children, r, r + i.length, e, s);
  }
  // If this desc must be updated to match the given node decoration,
  // do so and return true.
  update(e, n, r, i) {
    return this.dirty == Xt || !e.sameMarkup(this.node) ? !1 : (this.updateInner(e, n, r, i), !0);
  }
  updateInner(e, n, r, i) {
    this.updateOuterDeco(n), this.node = e, this.innerDeco = r, this.contentDOM && this.updateChildren(i, this.posAtStart), this.dirty = zt;
  }
  updateOuterDeco(e) {
    if (rl(e, this.outerDeco))
      return;
    let n = this.nodeDOM.nodeType != 1, r = this.dom;
    this.dom = jm(this.dom, this.nodeDOM, su(this.outerDeco, this.node, n), su(e, this.node, n)), this.dom != r && (r.pmViewDesc = void 0, this.dom.pmViewDesc = this), this.outerDeco = e;
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
function _d(t, e, n, r, i) {
  Wm(r, e, t);
  let o = new Xn(void 0, t, e, n, r, r, r, i, 0);
  return o.contentDOM && o.updateChildren(i, 0), o;
}
class Nl extends Xn {
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
    return this.dirty == Xt || this.dirty != zt && !this.inParent() || !e.sameMarkup(this.node) ? !1 : (this.updateOuterDeco(n), (this.dirty != zt || e.text != this.node.text) && e.text != this.nodeDOM.nodeValue && (this.nodeDOM.nodeValue = e.text, i.trackWrites == this.nodeDOM && (i.trackWrites = null)), this.node = e, this.dirty = zt, !0);
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
    return new Nl(this.parent, i, this.outerDeco, this.innerDeco, o, o, r);
  }
  markDirty(e, n) {
    super.markDirty(e, n), this.dom != this.nodeDOM && (e == 0 || n == this.nodeDOM.nodeValue.length) && (this.dirty = Xt);
  }
  get domAtom() {
    return !1;
  }
  isText(e) {
    return this.node.text == e;
  }
}
class Vm extends as {
  parseRule() {
    return { ignore: !0 };
  }
  matchesHack(e) {
    return this.dirty == zt && this.dom.nodeName == e;
  }
  get domAtom() {
    return !0;
  }
  get ignoreForCoords() {
    return this.dom.nodeName == "IMG";
  }
}
class _C extends Xn {
  constructor(e, n, r, i, o, s, l, a, u, c) {
    super(e, n, r, i, o, s, l, u, c), this.spec = a;
  }
  // A custom `update` method gets to decide whether the update goes
  // through. If it does, and there's a `contentDOM` node, our logic
  // updates the children.
  update(e, n, r, i) {
    if (this.dirty == Xt)
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
function Hm(t, e, n) {
  let r = t.firstChild, i = !1;
  for (let o = 0; o < e.length; o++) {
    let s = e[o], l = s.dom;
    if (l.parentNode == t) {
      for (; l != r; )
        r = Vd(r), i = !0;
      r = r.nextSibling;
    } else
      i = !0, t.insertBefore(l, r);
    if (s instanceof Hr) {
      let a = r ? r.previousSibling : t.lastChild;
      Hm(s.contentDOM, s.children, n), r = a ? a.nextSibling : t.firstChild;
    }
  }
  for (; r; )
    r = Vd(r), i = !0;
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
function jm(t, e, n, r) {
  if (n == gr && r == gr)
    return e;
  let i = e;
  for (let o = 0; o < r.length; o++) {
    let s = r[o], l = n[o];
    if (o) {
      let a;
      l && l.nodeName == s.nodeName && i != t && (a = i.parentNode) && a.nodeName.toLowerCase() == s.nodeName || (a = document.createElement(s.nodeName), a.pmIsDeco = !0, a.appendChild(i), l = gr[0]), i = a;
    }
    VC(i, l || gr[0], s);
  }
  return i;
}
function VC(t, e, n) {
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
function Wm(t, e, n) {
  return jm(t, t, gr, su(e, n, t.nodeType != 1));
}
function rl(t, e) {
  if (t.length != e.length)
    return !1;
  for (let n = 0; n < t.length; n++)
    if (!t[n].type.eq(e[n].type))
      return !1;
  return !0;
}
function Vd(t) {
  let e = t.nextSibling;
  return t.parentNode.removeChild(t), e;
}
class HC {
  constructor(e, n, r) {
    this.lock = n, this.view = r, this.index = 0, this.stack = [], this.changed = !1, this.top = e, this.preMatch = jC(e.node.content, e);
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
      this.destroyRest(), this.top.dirty = zt, this.index = this.stack.pop(), this.top = this.stack.pop(), s--;
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
    return s.dirty == Xt && s.dom == s.contentDOM && (s.dirty = mr), s.update(e, n, r, o) ? (this.destroyBetween(this.index, i), this.index++, !0) : !1;
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
        let c = a.dom, f, d = this.isLocked(c) && !(e.isText && a.node && a.node.isText && a.nodeDOM.nodeValue == e.text && a.dirty != Xt && rl(n, a.outerDeco));
        if (!d && a.update(e, n, r, i))
          return this.destroyBetween(this.index, l), a.dom != c && (this.changed = !0), this.index++, !0;
        if (!d && (f = this.recreateWrapper(a, e, n, r, i, s)))
          return this.destroyBetween(this.index, l), this.top.children[this.index] = f, f.contentDOM && (f.dirty = mr, f.updateChildren(i, s + 1), f.dirty = zt), this.changed = !0, this.index++, !0;
        break;
      }
    }
    return !1;
  }
  // When a node with content is replaced by a different node with
  // identical content, move over its children.
  recreateWrapper(e, n, r, i, o, s) {
    if (e.dirty || n.isAtom || !e.children.length || !e.node.content.eq(n.content) || !rl(r, e.outerDeco) || !i.eq(e.innerDeco))
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
      let o = new _m(this.top, e, n, r);
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
    !(e instanceof Nl) || /\n$/.test(e.node.text) || this.view.requiresGeckoHackNode && /\s$/.test(e.node.text)) && ((et || Ue) && e && e.dom.contentEditable == "false" && this.addHackNode("IMG", n), this.addHackNode("BR", this.top));
  }
  addHackNode(e, n) {
    if (n == this.top && this.index < n.children.length && n.children[this.index].matchesHack(e))
      this.index++;
    else {
      let r = document.createElement(e);
      e == "IMG" && (r.className = "ProseMirror-separator", r.alt = ""), e == "BR" && (r.className = "ProseMirror-trailingBreak");
      let i = new Vm(this.top, [], r, null);
      n != this.top ? n.children.push(i) : n.children.splice(this.index++, 0, i), this.changed = !0;
    }
  }
  isLocked(e) {
    return this.lock && (e == this.lock || e.nodeType == 1 && e.contains(this.lock.parentNode));
  }
}
function jC(t, e) {
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
function WC(t, e) {
  return t.type.side - e.type.side;
}
function qC(t, e, n, r) {
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
      let b = i[s++];
      b.widget && (c ? (f || (f = [c])).push(b) : c = b);
    }
    if (c)
      if (f) {
        f.sort(WC);
        for (let b = 0; b < f.length; b++)
          n(f[b], u, !!a);
      } else
        n(c, u, !!a);
    let d, h;
    if (a)
      h = -1, d = a, a = null;
    else if (u < t.childCount)
      h = u, d = t.child(u++);
    else
      break;
    for (let b = 0; b < l.length; b++)
      l[b].to <= o && l.splice(b--, 1);
    for (; s < i.length && i[s].from <= o && i[s].to > o; )
      l.push(i[s++]);
    let p = o + d.nodeSize;
    if (d.isText) {
      let b = p;
      s < i.length && i[s].from < b && (b = i[s].from);
      for (let w = 0; w < l.length; w++)
        l[w].to < b && (b = l[w].to);
      b < p && (a = d.cut(b - o), d = d.cut(0, b - o), p = b, h = -1);
    } else
      for (; s < i.length && i[s].to < p; )
        s++;
    let k = d.isInline && !d.isLeaf ? l.filter((b) => !b.inline) : l.slice();
    r(d, k, e.forChild(o, d), h), o = p;
  }
}
function KC(t) {
  if (t.nodeName == "UL" || t.nodeName == "OL") {
    let e = t.style.cssText;
    t.style.cssText = e + "; list-style: square !important", window.getComputedStyle(t).listStyle, t.style.cssText = e;
  }
}
function UC(t, e, n, r) {
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
function Gu(t, e = null) {
  let n = t.domSelectionRange(), r = t.state.doc;
  if (!n.focusNode)
    return null;
  let i = t.docView.nearestDesc(n.focusNode), o = i && i.size == 0, s = t.docView.posFromDOM(n.focusNode, n.focusOffset, 1);
  if (s < 0)
    return null;
  let l = r.resolve(s), a, u;
  if (Tl(n)) {
    for (a = s; i && !i.node; )
      i = i.parent;
    let f = i.node;
    if (i && f.isAtom && X.isSelectable(f) && i.parent && !(f.isInline && wC(n.focusNode, n.focusOffset, i.dom))) {
      let d = i.posBefore;
      u = new X(s == d ? l : r.resolve(d));
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
    u = Yu(t, c, l, f);
  }
  return u;
}
function qm(t) {
  return t.editable ? t.hasFocus() : Um(t) && document.activeElement && document.activeElement.contains(t.dom);
}
function vn(t, e = !1) {
  let n = t.state.selection;
  if (Km(t, n), !!qm(t)) {
    if (!e && t.input.mouseDown && t.input.mouseDown.allowDefault && Ue) {
      let r = t.domSelectionRange(), i = t.domObserver.currentSelection;
      if (r.anchorNode && i.anchorNode && Vr(r.anchorNode, r.anchorOffset, i.anchorNode, i.anchorOffset)) {
        t.input.mouseDown.delayedSelectionSync = !0, t.domObserver.setCurSelection();
        return;
      }
    }
    if (t.domObserver.disconnectSelection(), t.cursorWrapper)
      GC(t);
    else {
      let { anchor: r, head: i } = n, o, s;
      Hd && !(n instanceof Q) && (n.$from.parent.inlineContent || (o = jd(t, n.from)), !n.empty && !n.$from.parent.inlineContent && (s = jd(t, n.to))), t.docView.setSelection(r, i, t, e), Hd && (o && Wd(o), s && Wd(s)), n.visible ? t.dom.classList.remove("ProseMirror-hideselection") : (t.dom.classList.add("ProseMirror-hideselection"), "onselectionchange" in document && JC(t));
    }
    t.domObserver.setCurSelection(), t.domObserver.connectSelection();
  }
}
const Hd = et || Ue && Dm < 63;
function jd(t, e) {
  let { node: n, offset: r } = t.docView.domFromPos(e, 0), i = r < n.childNodes.length ? n.childNodes[r] : null, o = r ? n.childNodes[r - 1] : null;
  if (et && i && i.contentEditable == "false")
    return sa(i);
  if ((!i || i.contentEditable == "false") && (!o || o.contentEditable == "false")) {
    if (i)
      return sa(i);
    if (o)
      return sa(o);
  }
}
function sa(t) {
  return t.contentEditable = "true", et && t.draggable && (t.draggable = !1, t.wasDraggable = !0), t;
}
function Wd(t) {
  t.contentEditable = "false", t.wasDraggable && (t.draggable = !0, t.wasDraggable = null);
}
function JC(t) {
  let e = t.dom.ownerDocument;
  e.removeEventListener("selectionchange", t.input.hideSelectionGuard);
  let n = t.domSelectionRange(), r = n.anchorNode, i = n.anchorOffset;
  e.addEventListener("selectionchange", t.input.hideSelectionGuard = () => {
    (n.anchorNode != r || n.anchorOffset != i) && (e.removeEventListener("selectionchange", t.input.hideSelectionGuard), setTimeout(() => {
      (!qm(t) || t.state.selection.visible) && t.dom.classList.remove("ProseMirror-hideselection");
    }, 20));
  });
}
function GC(t) {
  let e = t.domSelection();
  if (!e)
    return;
  let n = t.cursorWrapper.dom, r = n.nodeName == "IMG";
  r ? e.collapse(n.parentNode, Ke(n) + 1) : e.collapse(n, 0), !r && !t.state.selection.visible && gt && Qn <= 11 && (n.disabled = !0, n.disabled = !1);
}
function Km(t, e) {
  if (e instanceof X) {
    let n = t.docView.descAt(e.from);
    n != t.lastSelectedViewDesc && (qd(t), n && n.selectNode(), t.lastSelectedViewDesc = n);
  } else
    qd(t);
}
function qd(t) {
  t.lastSelectedViewDesc && (t.lastSelectedViewDesc.parent && t.lastSelectedViewDesc.deselectNode(), t.lastSelectedViewDesc = void 0);
}
function Yu(t, e, n, r) {
  return t.someProp("createSelectionBetween", (i) => i(t, e, n)) || Q.between(e, n, r);
}
function Kd(t) {
  return t.editable && !t.hasFocus() ? !1 : Um(t);
}
function Um(t) {
  let e = t.domSelectionRange();
  if (!e.anchorNode)
    return !1;
  try {
    return t.dom.contains(e.anchorNode.nodeType == 3 ? e.anchorNode.parentNode : e.anchorNode) && (t.editable || t.dom.contains(e.focusNode.nodeType == 3 ? e.focusNode.parentNode : e.focusNode));
  } catch {
    return !1;
  }
}
function YC(t) {
  let e = t.docView.domFromPos(t.state.selection.anchor, 0), n = t.domSelectionRange();
  return Vr(e.node, e.offset, n.anchorNode, n.anchorOffset);
}
function au(t, e) {
  let { $anchor: n, $head: r } = t.selection, i = e > 0 ? n.max(r) : n.min(r), o = i.parent.inlineContent ? i.depth ? t.doc.resolve(e > 0 ? i.after() : i.before()) : null : i;
  return o && te.findFrom(o, e);
}
function $n(t, e) {
  return t.dispatch(t.state.tr.setSelection(e).scrollIntoView()), !0;
}
function Ud(t, e, n) {
  let r = t.state.selection;
  if (r instanceof Q)
    if (n.indexOf("s") > -1) {
      let { $head: i } = r, o = i.textOffset ? null : e < 0 ? i.nodeBefore : i.nodeAfter;
      if (!o || o.isText || !o.isLeaf)
        return !1;
      let s = t.state.doc.resolve(i.pos + o.nodeSize * (e < 0 ? -1 : 1));
      return $n(t, new Q(r.$anchor, s));
    } else if (r.empty) {
      if (t.endOfTextblock(e > 0 ? "forward" : "backward")) {
        let i = au(t.state, e);
        return i && i instanceof X ? $n(t, i) : !1;
      } else if (!(Dt && n.indexOf("m") > -1)) {
        let i = r.$head, o = i.textOffset ? null : e < 0 ? i.nodeBefore : i.nodeAfter, s;
        if (!o || o.isText)
          return !1;
        let l = e < 0 ? i.pos - o.nodeSize : i.pos;
        return o.isAtom || (s = t.docView.descAt(l)) && !s.contentDOM ? X.isSelectable(o) ? $n(t, new X(e < 0 ? t.state.doc.resolve(i.pos - o.nodeSize) : i)) : ls ? $n(t, new Q(t.state.doc.resolve(e < 0 ? l : l + o.nodeSize))) : !1 : !1;
      }
    } else return !1;
  else {
    if (r instanceof X && r.node.isInline)
      return $n(t, new Q(e > 0 ? r.$to : r.$from));
    {
      let i = au(t.state, e);
      return i ? $n(t, i) : !1;
    }
  }
}
function il(t) {
  return t.nodeType == 3 ? t.nodeValue.length : t.childNodes.length;
}
function yo(t, e) {
  let n = t.pmViewDesc;
  return n && n.size == 0 && (e < 0 || t.nextSibling || t.nodeName != "BR");
}
function Qr(t, e) {
  return e < 0 ? QC(t) : XC(t);
}
function QC(t) {
  let e = t.domSelectionRange(), n = e.focusNode, r = e.focusOffset;
  if (!n)
    return;
  let i, o, s = !1;
  for (Pt && n.nodeType == 1 && r < il(n) && yo(n.childNodes[r], -1) && (s = !0); ; )
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
      if (Jm(n))
        break;
      {
        let l = n.previousSibling;
        for (; l && yo(l, -1); )
          i = n.parentNode, o = Ke(l), l = l.previousSibling;
        if (l)
          n = l, r = il(n);
        else {
          if (n = n.parentNode, n == t.dom)
            break;
          r = 0;
        }
      }
    }
  s ? uu(t, n, r) : i && uu(t, i, o);
}
function XC(t) {
  let e = t.domSelectionRange(), n = e.focusNode, r = e.focusOffset;
  if (!n)
    return;
  let i = il(n), o, s;
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
      if (Jm(n))
        break;
      {
        let l = n.nextSibling;
        for (; l && yo(l, 1); )
          o = l.parentNode, s = Ke(l) + 1, l = l.nextSibling;
        if (l)
          n = l, r = 0, i = il(n);
        else {
          if (n = n.parentNode, n == t.dom)
            break;
          r = i = 0;
        }
      }
    }
  o && uu(t, o, s);
}
function Jm(t) {
  let e = t.pmViewDesc;
  return e && e.node && e.node.isBlock;
}
function ZC(t, e) {
  for (; t && e == t.childNodes.length && !ss(t); )
    e = Ke(t) + 1, t = t.parentNode;
  for (; t && e < t.childNodes.length; ) {
    let n = t.childNodes[e];
    if (n.nodeType == 3)
      return n;
    if (n.nodeType == 1 && n.contentEditable == "false")
      break;
    t = n, e = 0;
  }
}
function eS(t, e) {
  for (; t && !e && !ss(t); )
    e = Ke(t), t = t.parentNode;
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
    (s = ZC(e, n)) ? (e = s, n = 0) : (o = eS(e, n)) && (e = o, n = o.nodeValue.length);
  }
  let r = t.domSelection();
  if (!r)
    return;
  if (Tl(r)) {
    let o = document.createRange();
    o.setEnd(e, n), o.setStart(e, n), r.removeAllRanges(), r.addRange(o);
  } else r.extend && r.extend(e, n);
  t.domObserver.setCurSelection();
  let { state: i } = t;
  setTimeout(() => {
    t.state == i && vn(t);
  }, 50);
}
function Jd(t, e) {
  let n = t.state.doc.resolve(e);
  if (!(Ue || Rm) && n.parent.inlineContent) {
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
function Gd(t, e, n) {
  let r = t.state.selection;
  if (r instanceof Q && !r.empty || n.indexOf("s") > -1 || Dt && n.indexOf("m") > -1)
    return !1;
  let { $from: i, $to: o } = r;
  if (!i.parent.inlineContent || t.endOfTextblock(e < 0 ? "up" : "down")) {
    let s = au(t.state, e);
    if (s && s instanceof X)
      return $n(t, s);
  }
  if (!i.parent.inlineContent) {
    let s = e < 0 ? i : o, l = r instanceof Tt ? te.near(s, e) : te.findFrom(s, e);
    return l ? $n(t, l) : !1;
  }
  return !1;
}
function Yd(t, e) {
  if (!(t.state.selection instanceof Q))
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
function Qd(t, e, n) {
  t.domObserver.stop(), e.contentEditable = n, t.domObserver.start();
}
function tS(t) {
  if (!et || t.state.selection.$head.parentOffset > 0)
    return !1;
  let { focusNode: e, focusOffset: n } = t.domSelectionRange();
  if (e && e.nodeType == 1 && n == 0 && e.firstChild && e.firstChild.contentEditable == "false") {
    let r = e.firstChild;
    Qd(t, r, "true"), setTimeout(() => Qd(t, r, "false"), 20);
  }
  return !1;
}
function nS(t) {
  let e = "";
  return t.ctrlKey && (e += "c"), t.metaKey && (e += "m"), t.altKey && (e += "a"), t.shiftKey && (e += "s"), e;
}
function rS(t, e) {
  let n = e.keyCode, r = nS(e);
  if (n == 8 || Dt && n == 72 && r == "c")
    return Yd(t, -1) || Qr(t, -1);
  if (n == 46 && !e.shiftKey || Dt && n == 68 && r == "c")
    return Yd(t, 1) || Qr(t, 1);
  if (n == 13 || n == 27)
    return !0;
  if (n == 37 || Dt && n == 66 && r == "c") {
    let i = n == 37 ? Jd(t, t.state.selection.from) == "ltr" ? -1 : 1 : -1;
    return Ud(t, i, r) || Qr(t, i);
  } else if (n == 39 || Dt && n == 70 && r == "c") {
    let i = n == 39 ? Jd(t, t.state.selection.from) == "ltr" ? 1 : -1 : 1;
    return Ud(t, i, r) || Qr(t, i);
  } else {
    if (n == 38 || Dt && n == 80 && r == "c")
      return Gd(t, -1, r) || Qr(t, -1);
    if (n == 40 || Dt && n == 78 && r == "c")
      return tS(t) || Gd(t, 1, r) || Qr(t, 1);
    if (r == (Dt ? "m" : "c") && (n == 66 || n == 73 || n == 89 || n == 90))
      return !0;
  }
  return !1;
}
function Qu(t, e) {
  t.someProp("transformCopied", (h) => {
    e = h(e, t);
  });
  let n = [], { content: r, openStart: i, openEnd: o } = e;
  for (; i > 1 && o > 1 && r.childCount == 1 && r.firstChild.childCount == 1; ) {
    i--, o--;
    let h = r.firstChild;
    n.push(h.type.name, h.attrs != h.type.defaultAttrs ? h.attrs : null), r = h.content;
  }
  let s = t.someProp("clipboardSerializer") || _i.fromSchema(t.state.schema), l = eg(), a = l.createElement("div");
  a.appendChild(s.serializeFragment(r, { document: l }));
  let u = a.firstChild, c, f = 0;
  for (; u && u.nodeType == 1 && (c = Zm[u.nodeName.toLowerCase()]); ) {
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
function Gm(t, e, n, r, i) {
  let o = i.parent.type.spec.code, s, l;
  if (!n && !e)
    return null;
  let a = !!e && (r || o || !n);
  if (a) {
    if (t.someProp("transformPastedText", (d) => {
      e = d(e, o || r, t);
    }), o)
      return l = new V(R.from(t.state.schema.text(e.replace(/\r\n?/g, `
`))), 0, 0), t.someProp("transformPasted", (d) => {
        l = d(l, t, !0);
      }), l;
    let f = t.someProp("clipboardTextParser", (d) => d(e, i, r, t));
    if (f)
      l = f;
    else {
      let d = i.marks(), { schema: h } = t.state, p = _i.fromSchema(h);
      s = document.createElement("div"), e.split(/(?:\r\n?|\n)+/).forEach((k) => {
        let b = s.appendChild(document.createElement("p"));
        k && b.appendChild(p.serializeNode(h.text(k, d)));
      });
    }
  } else
    t.someProp("transformPastedHTML", (f) => {
      n = f(n, t);
    }), s = lS(n), ls && aS(s);
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
  if (l || (l = (t.someProp("clipboardParser") || t.someProp("domParser") || Bu.fromSchema(t.state.schema)).parseSlice(s, {
    preserveWhitespace: !!(a || c),
    context: i,
    ruleFromNode(d) {
      return d.nodeName == "BR" && !d.nextSibling && d.parentNode && !iS.test(d.parentNode.nodeName) ? { ignore: !0 } : null;
    }
  })), c)
    l = uS(Xd(l, +c[1], +c[2]), c[4]);
  else if (l = V.maxOpen(oS(l.content, i), !0), l.openStart || l.openEnd) {
    let f = 0, d = 0;
    for (let h = l.content.firstChild; f < l.openStart && !h.type.spec.isolating; f++, h = h.firstChild)
      ;
    for (let h = l.content.lastChild; d < l.openEnd && !h.type.spec.isolating; d++, h = h.lastChild)
      ;
    l = Xd(l, f, d);
  }
  return t.someProp("transformPasted", (f) => {
    l = f(l, t, a);
  }), l;
}
const iS = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var)$/i;
function oS(t, e) {
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
      if (u = s.length && o.length && Qm(a, o, l, s[s.length - 1], 0))
        s[s.length - 1] = u;
      else {
        s.length && (s[s.length - 1] = Xm(s[s.length - 1], o.length));
        let c = Ym(l, a);
        s.push(c), i = i.matchType(c.type), o = a;
      }
    }), s)
      return R.from(s);
  }
  return t;
}
function Ym(t, e, n = 0) {
  for (let r = e.length - 1; r >= n; r--)
    t = e[r].create(null, R.from(t));
  return t;
}
function Qm(t, e, n, r, i) {
  if (i < t.length && i < e.length && t[i] == e[i]) {
    let o = Qm(t, e, n, r.lastChild, i + 1);
    if (o)
      return r.copy(r.content.replaceChild(r.childCount - 1, o));
    if (r.contentMatchAt(r.childCount).matchType(i == t.length - 1 ? n.type : t[i + 1]))
      return r.copy(r.content.append(R.from(Ym(n, t, i + 1))));
  }
}
function Xm(t, e) {
  if (e == 0)
    return t;
  let n = t.content.replaceChild(t.childCount - 1, Xm(t.lastChild, e - 1)), r = t.contentMatchAt(t.childCount).fillBefore(R.empty, !0);
  return t.copy(n.append(r));
}
function cu(t, e, n, r, i, o) {
  let s = e < 0 ? t.firstChild : t.lastChild, l = s.content;
  return t.childCount > 1 && (o = 0), i < r - 1 && (l = cu(l, e, n, r, i + 1, o)), i >= n && (l = e < 0 ? s.contentMatchAt(0).fillBefore(l, o <= i).append(l) : l.append(s.contentMatchAt(s.childCount).fillBefore(R.empty, !0))), t.replaceChild(e < 0 ? 0 : t.childCount - 1, s.copy(l));
}
function Xd(t, e, n) {
  return e < t.openStart && (t = new V(cu(t.content, -1, e, t.openStart, 0, t.openEnd), e, t.openEnd)), n < t.openEnd && (t = new V(cu(t.content, 1, n, t.openEnd, 0, 0), t.openStart, n)), t;
}
const Zm = {
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
let Zd = null;
function eg() {
  return Zd || (Zd = document.implementation.createHTMLDocument("title"));
}
let la = null;
function sS(t) {
  let e = window.trustedTypes;
  return e ? (la || (la = e.defaultPolicy || e.createPolicy("ProseMirrorClipboard", { createHTML: (n) => n })), la.createHTML(t)) : t;
}
function lS(t) {
  let e = /^(\s*<meta [^>]*>)*/.exec(t);
  e && (t = t.slice(e[0].length));
  let n = eg().createElement("div"), r = /<([a-z][^>\s]+)/i.exec(t), i;
  if ((i = r && Zm[r[1].toLowerCase()]) && (t = i.map((o) => "<" + o + ">").join("") + t + i.map((o) => "</" + o + ">").reverse().join("")), n.innerHTML = sS(t), i)
    for (let o = 0; o < i.length; o++)
      n = n.querySelector(i[o]) || n;
  return n;
}
function aS(t) {
  let e = t.querySelectorAll(Ue ? "span:not([class]):not([style])" : "span.Apple-converted-space");
  for (let n = 0; n < e.length; n++) {
    let r = e[n];
    r.childNodes.length == 1 && r.textContent == " " && r.parentNode && r.parentNode.replaceChild(t.ownerDocument.createTextNode(" "), r);
  }
}
function uS(t, e) {
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
  return new V(i, o, s);
}
const ot = {}, st = {}, cS = { touchstart: !0, touchmove: !0 };
class fS {
  constructor() {
    this.shiftKey = !1, this.mouseDown = null, this.lastKeyCode = null, this.lastKeyCodeTime = 0, this.lastClick = { time: 0, x: 0, y: 0, type: "", button: 0 }, this.lastSelectionOrigin = null, this.lastSelectionTime = 0, this.lastIOSEnter = 0, this.lastIOSEnterFallbackTimeout = -1, this.lastFocus = 0, this.lastTouch = 0, this.lastChromeDelete = 0, this.composing = !1, this.compositionNode = null, this.composingTimeout = -1, this.compositionNodes = [], this.compositionEndedAt = -2e8, this.compositionID = 1, this.badSafariComposition = !1, this.compositionPendingChanges = 0, this.domChangeCount = 0, this.eventHandlers = /* @__PURE__ */ Object.create(null), this.hideSelectionGuard = null;
  }
}
function dS(t) {
  for (let e in ot) {
    let n = ot[e];
    t.dom.addEventListener(e, t.input.eventHandlers[e] = (r) => {
      pS(t, r) && !Xu(t, r) && (t.editable || !(r.type in st)) && n(t, r);
    }, cS[e] ? { passive: !0 } : void 0);
  }
  et && t.dom.addEventListener("input", () => null), fu(t);
}
function Gn(t, e) {
  t.input.lastSelectionOrigin = e, t.input.lastSelectionTime = Date.now();
}
function hS(t) {
  t.domObserver.stop();
  for (let e in t.input.eventHandlers)
    t.dom.removeEventListener(e, t.input.eventHandlers[e]);
  clearTimeout(t.input.composingTimeout), clearTimeout(t.input.lastIOSEnterFallbackTimeout);
}
function fu(t) {
  t.someProp("handleDOMEvents", (e) => {
    for (let n in e)
      t.input.eventHandlers[n] || t.dom.addEventListener(n, t.input.eventHandlers[n] = (r) => Xu(t, r));
  });
}
function Xu(t, e) {
  return t.someProp("handleDOMEvents", (n) => {
    let r = n[e.type];
    return r ? r(t, e) || e.defaultPrevented : !1;
  });
}
function pS(t, e) {
  if (!e.bubbles)
    return !0;
  if (e.defaultPrevented)
    return !1;
  for (let n = e.target; n != t.dom; n = n.parentNode)
    if (!n || n.nodeType == 11 || n.pmViewDesc && n.pmViewDesc.stopEvent(e))
      return !1;
  return !0;
}
function mS(t, e) {
  !Xu(t, e) && ot[e.type] && (t.editable || !(e.type in st)) && ot[e.type](t, e);
}
st.keydown = (t, e) => {
  let n = e;
  if (t.input.shiftKey = n.keyCode == 16 || n.shiftKey, !ng(t, n) && (t.input.lastKeyCode = n.keyCode, t.input.lastKeyCodeTime = Date.now(), !(Cn && Ue && n.keyCode == 13)))
    if (n.keyCode != 229 && t.domObserver.forceFlush(), Li && n.keyCode == 13 && !n.ctrlKey && !n.altKey && !n.metaKey) {
      let r = Date.now();
      t.input.lastIOSEnter = r, t.input.lastIOSEnterFallbackTimeout = setTimeout(() => {
        t.input.lastIOSEnter == r && (t.someProp("handleKeyDown", (i) => i(t, pr(13, "Enter"))), t.input.lastIOSEnter = 0);
      }, 200);
    } else t.someProp("handleKeyDown", (r) => r(t, n)) || rS(t, n) ? n.preventDefault() : Gn(t, "key");
};
st.keyup = (t, e) => {
  e.keyCode == 16 && (t.input.shiftKey = !1);
};
st.keypress = (t, e) => {
  let n = e;
  if (ng(t, n) || !n.charCode || n.ctrlKey && !n.altKey || Dt && n.metaKey)
    return;
  if (t.someProp("handleKeyPress", (i) => i(t, n))) {
    n.preventDefault();
    return;
  }
  let r = t.state.selection;
  if (!(r instanceof Q) || !r.$from.sameParent(r.$to)) {
    let i = String.fromCharCode(n.charCode), o = () => t.state.tr.insertText(i).scrollIntoView();
    !/[\r\n]/.test(i) && !t.someProp("handleTextInput", (s) => s(t, r.$from.pos, r.$to.pos, i, o)) && t.dispatch(o()), n.preventDefault();
  }
};
function Il(t) {
  return { left: t.clientX, top: t.clientY };
}
function gS(t, e) {
  let n = e.x - t.clientX, r = e.y - t.clientY;
  return n * n + r * r < 100;
}
function Zu(t, e, n, r, i) {
  if (r == -1)
    return !1;
  let o = t.state.doc.resolve(r);
  for (let s = o.depth + 1; s > 0; s--)
    if (t.someProp(e, (l) => s > o.depth ? l(t, n, o.nodeAfter, o.before(s), i, !0) : l(t, n, o.node(s), o.before(s), i, !1)))
      return !0;
  return !1;
}
function ai(t, e, n) {
  if (t.focused || t.focus(), t.state.selection.eq(e))
    return;
  let r = t.state.tr.setSelection(e);
  r.setMeta("pointer", !0), t.dispatch(r);
}
function yS(t, e) {
  if (e == -1)
    return !1;
  let n = t.state.doc.resolve(e), r = n.nodeAfter;
  return r && r.isAtom && X.isSelectable(r) ? (ai(t, new X(n)), !0) : !1;
}
function kS(t, e) {
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
  return i != null ? (ai(t, X.create(t.state.doc, i)), !0) : !1;
}
function bS(t, e, n, r, i) {
  return Zu(t, "handleClickOn", e, n, r) || t.someProp("handleClick", (o) => o(t, e, r)) || (i ? kS(t, n) : yS(t, n));
}
function wS(t, e, n, r) {
  return Zu(t, "handleDoubleClickOn", e, n, r) || t.someProp("handleDoubleClick", (i) => i(t, e, r));
}
function xS(t, e, n, r) {
  return Zu(t, "handleTripleClickOn", e, n, r) || t.someProp("handleTripleClick", (i) => i(t, e, r)) || CS(t, n, r);
}
function CS(t, e, n) {
  if (n.button != 0)
    return !1;
  let r = t.state.doc;
  if (e == -1)
    return r.inlineContent ? (ai(t, Q.create(r, 0, r.content.size)), !0) : !1;
  let i = r.resolve(e);
  for (let o = i.depth + 1; o > 0; o--) {
    let s = o > i.depth ? i.nodeAfter : i.node(o), l = i.before(o);
    if (s.inlineContent)
      ai(t, Q.create(r, l + 1, l + 1 + s.content.size));
    else if (X.isSelectable(s))
      ai(t, X.create(r, l));
    else
      continue;
    return !0;
  }
}
function ec(t) {
  return ol(t);
}
const tg = Dt ? "metaKey" : "ctrlKey";
ot.mousedown = (t, e) => {
  let n = e;
  t.input.shiftKey = n.shiftKey;
  let r = ec(t), i = Date.now(), o = "singleClick";
  i - t.input.lastClick.time < 500 && gS(n, t.input.lastClick) && !n[tg] && t.input.lastClick.button == n.button && (t.input.lastClick.type == "singleClick" ? o = "doubleClick" : t.input.lastClick.type == "doubleClick" && (o = "tripleClick")), t.input.lastClick = { time: i, x: n.clientX, y: n.clientY, type: o, button: n.button };
  let s = t.posAtCoords(Il(n));
  s && (o == "singleClick" ? (t.input.mouseDown && t.input.mouseDown.done(), t.input.mouseDown = new SS(t, s, n, !!r)) : (o == "doubleClick" ? wS : xS)(t, s.pos, s.inside, n) ? n.preventDefault() : Gn(t, "pointer"));
};
class SS {
  constructor(e, n, r, i) {
    this.view = e, this.pos = n, this.event = r, this.flushed = i, this.delayedSelectionSync = !1, this.mightDrag = null, this.startDoc = e.state.doc, this.selectNode = !!r[tg], this.allowDefault = r.shiftKey;
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
      setUneditable: !!(this.target && Pt && !this.target.hasAttribute("contentEditable"))
    }), this.target && this.mightDrag && (this.mightDrag.addAttr || this.mightDrag.setUneditable) && (this.view.domObserver.stop(), this.mightDrag.addAttr && (this.target.draggable = !0), this.mightDrag.setUneditable && setTimeout(() => {
      this.view.input.mouseDown == this && this.target.setAttribute("contentEditable", "false");
    }, 20), this.view.domObserver.start()), e.root.addEventListener("mouseup", this.up = this.up.bind(this)), e.root.addEventListener("mousemove", this.move = this.move.bind(this)), Gn(e, "pointer");
  }
  done() {
    this.view.root.removeEventListener("mouseup", this.up), this.view.root.removeEventListener("mousemove", this.move), this.mightDrag && this.target && (this.view.domObserver.stop(), this.mightDrag.addAttr && this.target.removeAttribute("draggable"), this.mightDrag.setUneditable && this.target.removeAttribute("contentEditable"), this.view.domObserver.start()), this.delayedSelectionSync && setTimeout(() => vn(this.view)), this.view.input.mouseDown = null;
  }
  up(e) {
    if (this.done(), !this.view.dom.contains(e.target))
      return;
    let n = this.pos;
    this.view.state.doc != this.startDoc && (n = this.view.posAtCoords(Il(e))), this.updateAllowDefault(e), this.allowDefault || !n ? Gn(this.view, "pointer") : bS(this.view, n.pos, n.inside, e, this.selectNode) ? e.preventDefault() : e.button == 0 && (this.flushed || // Safari ignores clicks on draggable elements
    et && this.mightDrag && !this.mightDrag.node.isAtom || // Chrome will sometimes treat a node selection as a
    // cursor, but still report that the node is selected
    // when asked through getSelection. You'll then get a
    // situation where clicking at the point where that
    // (hidden) cursor is doesn't change the selection, and
    // thus doesn't get a reaction from ProseMirror. This
    // works around that.
    Ue && !this.view.state.selection.visible && Math.min(Math.abs(n.pos - this.view.state.selection.from), Math.abs(n.pos - this.view.state.selection.to)) <= 2) ? (ai(this.view, te.near(this.view.state.doc.resolve(n.pos))), e.preventDefault()) : Gn(this.view, "pointer");
  }
  move(e) {
    this.updateAllowDefault(e), Gn(this.view, "pointer"), e.buttons == 0 && this.done();
  }
  updateAllowDefault(e) {
    !this.allowDefault && (Math.abs(this.event.x - e.clientX) > 4 || Math.abs(this.event.y - e.clientY) > 4) && (this.allowDefault = !0);
  }
}
ot.touchstart = (t) => {
  t.input.lastTouch = Date.now(), ec(t), Gn(t, "pointer");
};
ot.touchmove = (t) => {
  t.input.lastTouch = Date.now(), Gn(t, "pointer");
};
ot.contextmenu = (t) => ec(t);
function ng(t, e) {
  return t.composing ? !0 : et && Math.abs(e.timeStamp - t.input.compositionEndedAt) < 500 ? (t.input.compositionEndedAt = -2e8, !0) : !1;
}
const vS = Cn ? 5e3 : -1;
st.compositionstart = st.compositionupdate = (t) => {
  if (!t.composing) {
    t.domObserver.flush();
    let { state: e } = t, n = e.selection.$to;
    if (e.selection instanceof Q && (e.storedMarks || !n.textOffset && n.parentOffset && n.nodeBefore.marks.some((r) => r.type.spec.inclusive === !1) || Ue && Rm && MS(t)))
      t.markCursor = t.state.storedMarks || n.marks(), ol(t, !0), t.markCursor = null;
    else if (ol(t, !e.selection.empty), Pt && e.selection.empty && n.parentOffset && !n.textOffset && n.nodeBefore.marks.length) {
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
  rg(t, vS);
};
function MS(t) {
  let { focusNode: e, focusOffset: n } = t.domSelectionRange();
  if (!e || e.nodeType != 1 || n >= e.childNodes.length)
    return !1;
  let r = e.childNodes[n];
  return r.nodeType == 1 && r.contentEditable == "false";
}
st.compositionend = (t, e) => {
  t.composing && (t.input.composing = !1, t.input.compositionEndedAt = e.timeStamp, t.input.compositionPendingChanges = t.domObserver.pendingRecords().length ? t.input.compositionID : 0, t.input.compositionNode = null, t.input.badSafariComposition ? t.domObserver.forceFlush() : t.input.compositionPendingChanges && Promise.resolve().then(() => t.domObserver.flush()), t.input.compositionID++, rg(t, 20));
};
function rg(t, e) {
  clearTimeout(t.input.composingTimeout), e > -1 && (t.input.composingTimeout = setTimeout(() => ol(t), e));
}
function ig(t) {
  for (t.composing && (t.input.composing = !1, t.input.compositionEndedAt = NS()); t.input.compositionNodes.length > 0; )
    t.input.compositionNodes.pop().markParentsDirty();
}
function TS(t) {
  let e = t.domSelectionRange();
  if (!e.focusNode)
    return null;
  let n = kC(e.focusNode, e.focusOffset), r = bC(e.focusNode, e.focusOffset);
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
function NS() {
  let t = document.createEvent("Event");
  return t.initEvent("event", !0, !0), t.timeStamp;
}
function ol(t, e = !1) {
  if (!(Cn && t.domObserver.flushingSoon >= 0)) {
    if (t.domObserver.forceFlush(), ig(t), e || t.docView && t.docView.dirty) {
      let n = Gu(t), r = t.state.selection;
      return n && !n.eq(r) ? t.dispatch(t.state.tr.setSelection(n)) : (t.markCursor || e) && !r.$from.node(r.$from.sharedDepth(r.to)).inlineContent ? t.dispatch(t.state.tr.deleteSelection()) : t.updateState(t.state), !0;
    }
    return !1;
  }
}
function IS(t, e) {
  if (!t.dom.parentNode)
    return;
  let n = t.dom.parentNode.appendChild(document.createElement("div"));
  n.appendChild(e), n.style.cssText = "position: fixed; left: -10000px; top: 10px";
  let r = getSelection(), i = document.createRange();
  i.selectNodeContents(e), t.dom.blur(), r.removeAllRanges(), r.addRange(i), setTimeout(() => {
    n.parentNode && n.parentNode.removeChild(n), t.focus();
  }, 50);
}
const Oo = gt && Qn < 15 || Li && SC < 604;
ot.copy = st.cut = (t, e) => {
  let n = e, r = t.state.selection, i = n.type == "cut";
  if (r.empty)
    return;
  let o = Oo ? null : n.clipboardData, s = r.content(), { dom: l, text: a } = Qu(t, s);
  o ? (n.preventDefault(), o.clearData(), o.setData("text/html", l.innerHTML), o.setData("text/plain", a)) : IS(t, l), i && t.dispatch(t.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
};
function AS(t) {
  return t.openStart == 0 && t.openEnd == 0 && t.content.childCount == 1 ? t.content.firstChild : null;
}
function ES(t, e) {
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
  let o = Gm(t, e, n, r, t.state.selection.$from);
  if (t.someProp("handlePaste", (a) => a(t, i, o || V.empty)))
    return !0;
  if (!o)
    return !1;
  let s = AS(o), l = s ? t.state.tr.replaceSelectionWith(s, r) : t.state.tr.replaceSelection(o);
  return t.dispatch(l.scrollIntoView().setMeta("paste", !0).setMeta("uiEvent", "paste")), !0;
}
function og(t) {
  let e = t.getData("text/plain") || t.getData("Text");
  if (e)
    return e;
  let n = t.getData("text/uri-list");
  return n ? n.replace(/\r?\n/g, " ") : "";
}
st.paste = (t, e) => {
  let n = e;
  if (t.composing && !Cn)
    return;
  let r = Oo ? null : n.clipboardData, i = t.input.shiftKey && t.input.lastKeyCode != 45;
  r && Do(t, og(r), r.getData("text/html"), i, n) ? n.preventDefault() : ES(t, n);
};
class sg {
  constructor(e, n, r) {
    this.slice = e, this.move = n, this.node = r;
  }
}
const OS = Dt ? "altKey" : "ctrlKey";
function lg(t, e) {
  let n;
  return t.someProp("dragCopies", (r) => {
    n = n || r(e);
  }), n != null ? !n : !e[OS];
}
ot.dragstart = (t, e) => {
  let n = e, r = t.input.mouseDown;
  if (r && r.done(), !n.dataTransfer)
    return;
  let i = t.state.selection, o = i.empty ? null : t.posAtCoords(Il(n)), s;
  if (!(o && o.pos >= i.from && o.pos <= (i instanceof X ? i.to - 1 : i.to))) {
    if (r && r.mightDrag)
      s = X.create(t.state.doc, r.mightDrag.pos);
    else if (n.target && n.target.nodeType == 1) {
      let f = t.docView.nearestDesc(n.target, !0);
      f && f.node.type.spec.draggable && f != t.docView && (s = X.create(t.state.doc, f.posBefore));
    }
  }
  let l = (s || t.state.selection).content(), { dom: a, text: u, slice: c } = Qu(t, l);
  (!n.dataTransfer.files.length || !Ue || Dm > 120) && n.dataTransfer.clearData(), n.dataTransfer.setData(Oo ? "Text" : "text/html", a.innerHTML), n.dataTransfer.effectAllowed = "copyMove", Oo || n.dataTransfer.setData("text/plain", u), t.dragging = new sg(c, lg(t, n), s);
};
ot.dragend = (t) => {
  let e = t.dragging;
  window.setTimeout(() => {
    t.dragging == e && (t.dragging = null);
  }, 50);
};
st.dragover = st.dragenter = (t, e) => e.preventDefault();
st.drop = (t, e) => {
  try {
    DS(t, e, t.dragging);
  } finally {
    t.dragging = null;
  }
};
function DS(t, e, n) {
  if (!e.dataTransfer)
    return;
  let r = t.posAtCoords(Il(e));
  if (!r)
    return;
  let i = t.state.doc.resolve(r.pos), o = n && n.slice;
  o ? t.someProp("transformPasted", (h) => {
    o = h(o, t, !1);
  }) : o = Gm(t, og(e.dataTransfer), Oo ? null : e.dataTransfer.getData("text/html"), !1, i);
  let s = !!(n && lg(t, e));
  if (t.someProp("handleDrop", (h) => h(t, e, o || V.empty, s))) {
    e.preventDefault();
    return;
  }
  if (!o)
    return;
  e.preventDefault();
  let l = o ? mx(t.state.doc, i.pos, o) : i.pos;
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
  if (c && X.isSelectable(o.content.firstChild) && d.nodeAfter && d.nodeAfter.sameMarkup(o.content.firstChild))
    a.setSelection(new X(d));
  else {
    let h = a.mapping.map(l);
    a.mapping.maps[a.mapping.maps.length - 1].forEach((p, k, b, w) => h = w), a.setSelection(Yu(t, d, a.doc.resolve(h)));
  }
  t.focus(), t.dispatch(a.setMeta("uiEvent", "drop"));
}
ot.focus = (t) => {
  t.input.lastFocus = Date.now(), t.focused || (t.domObserver.stop(), t.dom.classList.add("ProseMirror-focused"), t.domObserver.start(), t.focused = !0, setTimeout(() => {
    t.docView && t.hasFocus() && !t.domObserver.currentSelection.eq(t.domSelectionRange()) && vn(t);
  }, 20));
};
ot.blur = (t, e) => {
  let n = e;
  t.focused && (t.domObserver.stop(), t.dom.classList.remove("ProseMirror-focused"), t.domObserver.start(), n.relatedTarget && t.dom.contains(n.relatedTarget) && t.domObserver.currentSelection.clear(), t.focused = !1);
};
ot.beforeinput = (t, e) => {
  if (Ue && Cn && e.inputType == "deleteContentBackward") {
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
for (let t in st)
  ot[t] = st[t];
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
class sl {
  constructor(e, n) {
    this.toDOM = e, this.spec = n || Ir, this.side = this.spec.side || 0;
  }
  map(e, n, r, i) {
    let { pos: o, deleted: s } = e.mapResult(n.from + i, this.side < 0 ? -1 : 1);
    return s ? null : new Je(o - r, o - r, this);
  }
  valid() {
    return !0;
  }
  eq(e) {
    return this == e || e instanceof sl && (this.spec.key && this.spec.key == e.spec.key || this.toDOM == e.toDOM && Ro(this.spec, e.spec));
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
    return o >= s ? null : new Je(o, s, this);
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
class tc {
  constructor(e, n) {
    this.attrs = e, this.spec = n || Ir;
  }
  map(e, n, r, i) {
    let o = e.mapResult(n.from + i, 1);
    if (o.deleted)
      return null;
    let s = e.mapResult(n.to + i, -1);
    return s.deleted || s.pos <= o.pos ? null : new Je(o.pos - r, s.pos - r, this);
  }
  valid(e, n) {
    let { index: r, offset: i } = e.content.findIndex(n.from), o;
    return i == n.from && !(o = e.child(r)).isText && i + o.nodeSize == n.to;
  }
  eq(e) {
    return this == e || e instanceof tc && Ro(this.attrs, e.attrs) && Ro(this.spec, e.spec);
  }
  destroy() {
  }
}
class Je {
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
    return new Je(e, n, this.type);
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
    return new Je(e, e, new sl(n, r));
  }
  /**
  Creates an inline decoration, which adds the given attributes to
  each inline node between `from` and `to`.
  */
  static inline(e, n, r, i) {
    return new Je(e, n, new Zn(r, i));
  }
  /**
  Creates a node decoration. `from` and `to` should point precisely
  before and after a node in the document. That node, and only that
  node, will receive the given attributes.
  */
  static node(e, n, r, i) {
    return new Je(e, n, new tc(r, i));
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
    return this.type instanceof sl;
  }
}
const ei = [], Ir = {};
class Me {
  /**
  @internal
  */
  constructor(e, n) {
    this.local = e.length ? e : ei, this.children = n.length ? n : ei;
  }
  /**
  Create a set of decorations, using the structure of the given
  document. This will consume (modify) the `decorations` array, so
  you must make a copy if you want need to preserve that.
  */
  static create(e, n) {
    return n.length ? ll(n, e, 0, Ir) : Xe;
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
    return this == Xe || e.maps.length == 0 ? this : this.mapInner(e, n, 0, 0, r || Ir);
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
    return this.children.length ? RS(this.children, s || [], e, n, r, i, o) : s ? new Me(s.sort(Ar), ei) : Xe;
  }
  /**
  Add the given array of decorations to the ones in the set,
  producing a new set. Consumes the `decorations` array. Needs
  access to the current document to create the appropriate tree
  structure.
  */
  add(e, n) {
    return n.length ? this == Xe ? Me.create(e, n) : this.addInner(e, n, 0) : this;
  }
  addInner(e, n, r) {
    let i, o = 0;
    e.forEach((l, a) => {
      let u = a + r, c;
      if (c = ug(n, l, u)) {
        for (i || (i = this.children.slice()); o < i.length && i[o] < a; )
          o += 3;
        i[o] == a ? i[o + 2] = i[o + 2].addInner(l, c, u + 1) : i.splice(o, 0, a, a + l.nodeSize, ll(c, l, u + 1, Ir)), o += 3;
      }
    });
    let s = ag(o ? cg(n) : n, -r);
    for (let l = 0; l < s.length; l++)
      s[l].type.valid(e, s[l]) || s.splice(l--, 1);
    return new Me(s.length ? this.local.concat(s).sort(Ar) : this.local, i || this.children);
  }
  /**
  Create a new set that contains the decorations in this set, minus
  the ones in the given array.
  */
  remove(e) {
    return e.length == 0 || this == Xe ? this : this.removeInner(e, 0);
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
      u != Xe ? r[o + 2] = u : (r.splice(o, 3), o -= 3);
    }
    if (i.length) {
      for (let o = 0, s; o < e.length; o++)
        if (s = e[o])
          for (let l = 0; l < i.length; l++)
            i[l].eq(s, n) && (i == this.local && (i = this.local.slice()), i.splice(l--, 1));
    }
    return r == this.children && i == this.local ? this : i.length || r.length ? new Me(i, r) : Xe;
  }
  forChild(e, n) {
    if (this == Xe)
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
      let l = new Me(i.sort(Ar), ei);
      return r ? new Hn([l, r]) : l;
    }
    return r || Xe;
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
    return nc(this.localsInner(e));
  }
  /**
  @internal
  */
  localsInner(e) {
    if (this == Xe)
      return ei;
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
Me.removeOverlap = nc;
const Xe = Me.empty;
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
      o != Xe && (o instanceof Hn ? r = r.concat(o.members) : r.push(o));
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
    return n ? nc(r ? n : n.sort(Ar)) : ei;
  }
  // Create a group for the given array of decoration sets, or return
  // a single set when possible.
  static from(e) {
    switch (e.length) {
      case 0:
        return Xe;
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
function RS(t, e, n, r, i, o, s) {
  let l = t.slice();
  for (let u = 0, c = o; u < n.maps.length; u++) {
    let f = 0;
    n.maps[u].forEach((d, h, p, k) => {
      let b = k - p - (h - d);
      for (let w = 0; w < l.length; w += 3) {
        let L = l[w + 1];
        if (L < 0 || d > L + c - f)
          continue;
        let O = l[w] + c - f;
        h >= O ? l[w + 1] = d <= O ? -2 : -1 : d >= c && b && (l[w] += b, l[w + 1] += b);
      }
      f += b;
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
      let d = n.map(t[u + 1] + o, -1), h = d - i, { index: p, offset: k } = r.content.findIndex(f), b = r.maybeChild(p);
      if (b && k == f && k + b.nodeSize == h) {
        let w = l[u + 2].mapInner(n, b, c + 1, t[u] + o + 1, s);
        w != Xe ? (l[u] = f, l[u + 1] = h, l[u + 2] = w) : (l[u + 1] = -2, a = !0);
      } else
        a = !0;
    }
  if (a) {
    let u = LS(l, t, e, n, i, o, s), c = ll(u, r, 0, s);
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
function ag(t, e) {
  if (!e || !t.length)
    return t;
  let n = [];
  for (let r = 0; r < t.length; r++) {
    let i = t[r];
    n.push(new Je(i.from + e, i.to + e, i.type));
  }
  return n;
}
function LS(t, e, n, r, i, o, s) {
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
function ug(t, e, n) {
  if (e.isLeaf)
    return null;
  let r = n + e.nodeSize, i = null;
  for (let o = 0, s; o < t.length; o++)
    (s = t[o]) && s.from > n && s.to < r && ((i || (i = [])).push(s), t[o] = null);
  return i;
}
function cg(t) {
  let e = [];
  for (let n = 0; n < t.length; n++)
    t[n] != null && e.push(t[n]);
  return e;
}
function ll(t, e, n, r) {
  let i = [], o = !1;
  e.forEach((l, a) => {
    let u = ug(t, l, a + n);
    if (u) {
      o = !0;
      let c = ll(u, l, n + a + 1, r);
      c != Xe && i.push(a, a + l.nodeSize, c);
    }
  });
  let s = ag(o ? cg(t) : t, -n).sort(Ar);
  for (let l = 0; l < s.length; l++)
    s[l].type.valid(e, s[l]) || (r.onRemove && r.onRemove(s[l].spec), s.splice(l--, 1));
  return s.length || i.length ? new Me(s, i) : Xe;
}
function Ar(t, e) {
  return t.from - e.from || t.to - e.to;
}
function nc(t) {
  let e = t;
  for (let n = 0; n < e.length - 1; n++) {
    let r = e[n];
    if (r.from != r.to)
      for (let i = n + 1; i < e.length; i++) {
        let o = e[i];
        if (o.from == r.from) {
          o.to != r.to && (e == t && (e = t.slice()), e[i] = o.copy(o.from, r.to), eh(e, i + 1, o.copy(r.to, o.to)));
          continue;
        } else {
          o.from < r.to && (e == t && (e = t.slice()), e[n] = r.copy(r.from, o.from), eh(e, i, r.copy(o.from, r.to)));
          break;
        }
      }
  }
  return e;
}
function eh(t, e, n) {
  for (; e < t.length && Ar(n, t[e]) > 0; )
    e++;
  t.splice(e, 0, n);
}
function aa(t) {
  let e = [];
  return t.someProp("decorations", (n) => {
    let r = n(t.state);
    r && r != Xe && e.push(r);
  }), t.cursorWrapper && e.push(Me.create(t.state.doc, [t.cursorWrapper.deco])), Hn.from(e);
}
const PS = {
  childList: !0,
  characterData: !0,
  characterDataOldValue: !0,
  attributes: !0,
  attributeOldValue: !0,
  subtree: !0
}, zS = gt && Qn <= 11;
class BS {
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
class FS {
  constructor(e, n) {
    this.view = e, this.handleDOMChange = n, this.queue = [], this.flushingSoon = -1, this.observer = null, this.currentSelection = new BS(), this.onCharData = null, this.suppressingSelectionUpdates = !1, this.lastChangedTextNode = null, this.observer = window.MutationObserver && new window.MutationObserver((r) => {
      for (let i = 0; i < r.length; i++)
        this.queue.push(r[i]);
      gt && Qn <= 11 && r.some((i) => i.type == "childList" && i.removedNodes.length || i.type == "characterData" && i.oldValue.length > i.target.nodeValue.length) ? this.flushSoon() : et && e.composing && r.some((i) => i.type == "childList" && i.target.nodeName == "TR") ? (e.input.badSafariComposition = !0, this.flushSoon()) : this.flush();
    }), zS && (this.onCharData = (r) => {
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
    this.observer && (this.observer.takeRecords(), this.observer.observe(this.view.dom, PS)), this.onCharData && this.view.dom.addEventListener("DOMCharacterDataModified", this.onCharData), this.connectSelection();
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
    if (Kd(this.view)) {
      if (this.suppressingSelectionUpdates)
        return vn(this.view);
      if (gt && Qn <= 11 && !this.view.state.selection.empty) {
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
    for (let o = e.focusNode; o; o = Ri(o))
      n.add(o);
    for (let o = e.anchorNode; o; o = Ri(o))
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
    let r = e.domSelectionRange(), i = !this.suppressingSelectionUpdates && !this.currentSelection.eq(r) && Kd(e) && !this.ignoreSelectionChange(r), o = -1, s = -1, l = !1, a = [];
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
    } else if (Pt && a.length) {
      let c = a.filter((f) => f.nodeName == "BR");
      if (c.length == 2) {
        let [f, d] = c;
        f.parentNode && f.parentNode.parentNode == d.parentNode ? d.remove() : f.remove();
      } else {
        let { focusNode: f } = this.currentSelection;
        for (let d of c) {
          let h = d.parentNode;
          h && h.nodeName == "LI" && (!f || VS(e, f) != h) && d.remove();
        }
      }
    }
    let u = null;
    o < 0 && i && e.input.lastFocus > Date.now() - 200 && Math.max(e.input.lastTouch, e.input.lastClick.time) < Date.now() - 300 && Tl(r) && (u = Gu(e)) && u.eq(te.near(e.state.doc.resolve(0), 1)) ? (e.input.lastFocus = 0, vn(e), this.currentSelection.set(r), e.scrollToSelection()) : (o > -1 || i) && (o > -1 && (e.docView.markDirty(o, s), $S(e)), e.input.badSafariComposition && (e.input.badSafariComposition = !1, HS(e, a)), this.handleDOMChange(o, s, l, a), e.docView && e.docView.dirty ? e.updateState(e.state) : this.currentSelection.eq(r) || vn(e), this.currentSelection.set(r));
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
      if (gt && Qn <= 11 && e.addedNodes.length)
        for (let c = 0; c < e.addedNodes.length; c++) {
          let { previousSibling: f, nextSibling: d } = e.addedNodes[c];
          (!f || Array.prototype.indexOf.call(e.addedNodes, f) < 0) && (i = f), (!d || Array.prototype.indexOf.call(e.addedNodes, d) < 0) && (o = d);
        }
      let s = i && i.parentNode == e.target ? Ke(i) + 1 : 0, l = r.localPosFromDOM(e.target, s, -1), a = o && o.parentNode == e.target ? Ke(o) : e.target.childNodes.length, u = r.localPosFromDOM(e.target, a, 1);
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
let th = /* @__PURE__ */ new WeakMap(), nh = !1;
function $S(t) {
  if (!th.has(t) && (th.set(t, null), ["normal", "nowrap", "pre-line"].indexOf(getComputedStyle(t.dom).whiteSpace) !== -1)) {
    if (t.requiresGeckoHackNode = Pt, nh)
      return;
    console.warn("ProseMirror expects the CSS white-space property to be set, preferably to 'pre-wrap'. It is recommended to load style/prosemirror.css from the prosemirror-view package."), nh = !0;
  }
}
function rh(t, e) {
  let n = e.startContainer, r = e.startOffset, i = e.endContainer, o = e.endOffset, s = t.domAtPos(t.state.selection.anchor);
  return Vr(s.node, s.offset, i, o) && ([n, r, i, o] = [i, o, n, r]), { anchorNode: n, anchorOffset: r, focusNode: i, focusOffset: o };
}
function _S(t, e) {
  if (e.getComposedRanges) {
    let i = e.getComposedRanges(t.root)[0];
    if (i)
      return rh(t, i);
  }
  let n;
  function r(i) {
    i.preventDefault(), i.stopImmediatePropagation(), n = i.getTargetRanges()[0];
  }
  return t.dom.addEventListener("beforeinput", r, !0), document.execCommand("indent"), t.dom.removeEventListener("beforeinput", r, !0), n ? rh(t, n) : null;
}
function VS(t, e) {
  for (let n = e.parentNode; n && n != t.dom; n = n.parentNode) {
    let r = t.docView.nearestDesc(n, !0);
    if (r && r.node.isBlock)
      return n;
  }
  return null;
}
function HS(t, e) {
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
function jS(t, e, n) {
  let { node: r, fromOffset: i, toOffset: o, from: s, to: l } = t.docView.parseRange(e, n), a = t.domSelectionRange(), u, c = a.anchorNode;
  if (c && t.dom.contains(c.nodeType == 1 ? c : c.parentNode) && (u = [{ node: c, offset: a.anchorOffset }], Tl(a) || u.push({ node: a.focusNode, offset: a.focusOffset })), Ue && t.input.lastKeyCode === 8)
    for (let b = o; b > i; b--) {
      let w = r.childNodes[b - 1], L = w.pmViewDesc;
      if (w.nodeName == "BR" && !L) {
        o = b;
        break;
      }
      if (!L || L.size)
        break;
    }
  let f = t.state.doc, d = t.someProp("domParser") || Bu.fromSchema(t.state.schema), h = f.resolve(s), p = null, k = d.parse(r, {
    topNode: h.parent,
    topMatch: h.parent.contentMatchAt(h.index()),
    topOpen: !0,
    from: i,
    to: o,
    preserveWhitespace: h.parent.type.whitespace == "pre" ? "full" : !0,
    findPositions: u,
    ruleFromNode: WS,
    context: h
  });
  if (u && u[0].pos != null) {
    let b = u[0].pos, w = u[1] && u[1].pos;
    w == null && (w = b), p = { anchor: b + s, head: w + s };
  }
  return { doc: k, sel: p, from: s, to: l };
}
function WS(t) {
  let e = t.pmViewDesc;
  if (e)
    return e.parseRule();
  if (t.nodeName == "BR" && t.parentNode) {
    if (et && /^(ul|ol)$/i.test(t.parentNode.nodeName)) {
      let n = document.createElement("div");
      return n.appendChild(document.createElement("li")), { skip: n };
    } else if (t.parentNode.lastChild == t || et && /^(tr|table)$/i.test(t.parentNode.nodeName))
      return { ignore: !0 };
  } else if (t.nodeName == "IMG" && t.getAttribute("mark-placeholder"))
    return { ignore: !0 };
  return null;
}
const qS = /^(a|abbr|acronym|b|bd[io]|big|br|button|cite|code|data(list)?|del|dfn|em|i|img|ins|kbd|label|map|mark|meter|output|q|ruby|s|samp|small|span|strong|su[bp]|time|u|tt|var)$/i;
function KS(t, e, n, r, i) {
  let o = t.input.compositionPendingChanges || (t.composing ? t.input.compositionID : 0);
  if (t.input.compositionPendingChanges = 0, e < 0) {
    let F = t.input.lastSelectionTime > Date.now() - 50 ? t.input.lastSelectionOrigin : null, U = Gu(t, F);
    if (U && !t.state.selection.eq(U)) {
      if (Ue && Cn && t.input.lastKeyCode === 13 && Date.now() - 100 < t.input.lastKeyCodeTime && t.someProp("handleKeyDown", (N) => N(t, pr(13, "Enter"))))
        return;
      let G = t.state.tr.setSelection(U);
      F == "pointer" ? G.setMeta("pointer", !0) : F == "key" && G.scrollIntoView(), o && G.setMeta("composition", o), t.dispatch(G);
    }
    return;
  }
  let s = t.state.doc.resolve(e), l = s.sharedDepth(n);
  e = s.before(l + 1), n = t.state.doc.resolve(n).after(l + 1);
  let a = t.state.selection, u = jS(t, e, n), c = t.state.doc, f = c.slice(u.from, u.to), d, h;
  t.input.lastKeyCode === 8 && Date.now() - 100 < t.input.lastKeyCodeTime ? (d = t.state.selection.to, h = "end") : (d = t.state.selection.from, h = "start"), t.input.lastKeyCode = null;
  let p = GS(f.content, u.doc.content, u.from, d, h);
  if (p && t.input.domChangeCount++, (Li && t.input.lastIOSEnter > Date.now() - 225 || Cn) && i.some((F) => F.nodeType == 1 && !qS.test(F.nodeName)) && (!p || p.endA >= p.endB) && t.someProp("handleKeyDown", (F) => F(t, pr(13, "Enter")))) {
    t.input.lastIOSEnter = 0;
    return;
  }
  if (!p)
    if (r && a instanceof Q && !a.empty && a.$head.sameParent(a.$anchor) && !t.composing && !(u.sel && u.sel.anchor != u.sel.head))
      p = { start: a.from, endA: a.to, endB: a.to };
    else {
      if (u.sel) {
        let F = ih(t, t.state.doc, u.sel);
        if (F && !F.eq(t.state.selection)) {
          let U = t.state.tr.setSelection(F);
          o && U.setMeta("composition", o), t.dispatch(U);
        }
      }
      return;
    }
  t.state.selection.from < t.state.selection.to && p.start == p.endB && t.state.selection instanceof Q && (p.start > t.state.selection.from && p.start <= t.state.selection.from + 2 && t.state.selection.from >= u.from ? p.start = t.state.selection.from : p.endA < t.state.selection.to && p.endA >= t.state.selection.to - 2 && t.state.selection.to <= u.to && (p.endB += t.state.selection.to - p.endA, p.endA = t.state.selection.to)), gt && Qn <= 11 && p.endB == p.start + 1 && p.endA == p.start && p.start > u.from && u.doc.textBetween(p.start - u.from - 1, p.start - u.from + 1) == "  " && (p.start--, p.endA--, p.endB--);
  let k = u.doc.resolveNoCache(p.start - u.from), b = u.doc.resolveNoCache(p.endB - u.from), w = c.resolve(p.start), L = k.sameParent(b) && k.parent.inlineContent && w.end() >= p.endA;
  if ((Li && t.input.lastIOSEnter > Date.now() - 225 && (!L || i.some((F) => F.nodeName == "DIV" || F.nodeName == "P")) || !L && k.pos < u.doc.content.size && (!k.sameParent(b) || !k.parent.inlineContent) && k.pos < b.pos && !/\S/.test(u.doc.textBetween(k.pos, b.pos, "", ""))) && t.someProp("handleKeyDown", (F) => F(t, pr(13, "Enter")))) {
    t.input.lastIOSEnter = 0;
    return;
  }
  if (t.state.selection.anchor > p.start && JS(c, p.start, p.endA, k, b) && t.someProp("handleKeyDown", (F) => F(t, pr(8, "Backspace")))) {
    Cn && Ue && t.domObserver.suppressSelectionUpdates();
    return;
  }
  Ue && p.endB == p.start && (t.input.lastChromeDelete = Date.now()), Cn && !L && k.start() != b.start() && b.parentOffset == 0 && k.depth == b.depth && u.sel && u.sel.anchor == u.sel.head && u.sel.head == p.endA && (p.endB -= 2, b = u.doc.resolveNoCache(p.endB - u.from), setTimeout(() => {
    t.someProp("handleKeyDown", function(F) {
      return F(t, pr(13, "Enter"));
    });
  }, 20));
  let O = p.start, W = p.endA, j = (F) => {
    let U = F || t.state.tr.replace(O, W, u.doc.slice(p.start - u.from, p.endB - u.from));
    if (u.sel) {
      let G = ih(t, U.doc, u.sel);
      G && !(Ue && t.composing && G.empty && (p.start != p.endB || t.input.lastChromeDelete < Date.now() - 100) && (G.head == O || G.head == U.mapping.map(W) - 1) || gt && G.empty && G.head == O) && U.setSelection(G);
    }
    return o && U.setMeta("composition", o), U.scrollIntoView();
  }, T;
  if (L)
    if (k.pos == b.pos) {
      gt && Qn <= 11 && k.parentOffset == 0 && (t.domObserver.suppressSelectionUpdates(), setTimeout(() => vn(t), 20));
      let F = j(t.state.tr.delete(O, W)), U = c.resolve(p.start).marksAcross(c.resolve(p.endA));
      U && F.ensureMarks(U), t.dispatch(F);
    } else if (
      // Adding or removing a mark
      p.endA == p.endB && (T = US(k.parent.content.cut(k.parentOffset, b.parentOffset), w.parent.content.cut(w.parentOffset, p.endA - w.start())))
    ) {
      let F = j(t.state.tr);
      T.type == "add" ? F.addMark(O, W, T.mark) : F.removeMark(O, W, T.mark), t.dispatch(F);
    } else if (k.parent.child(k.index()).isText && k.index() == b.index() - (b.textOffset ? 0 : 1)) {
      let F = k.parent.textBetween(k.parentOffset, b.parentOffset), U = () => j(t.state.tr.insertText(F, O, W));
      t.someProp("handleTextInput", (G) => G(t, O, W, F, U)) || t.dispatch(U());
    } else
      t.dispatch(j());
  else
    t.dispatch(j());
}
function ih(t, e, n) {
  return Math.max(n.anchor, n.head) > e.content.size ? null : Yu(t, e.resolve(n.anchor), e.resolve(n.head));
}
function US(t, e) {
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
function JS(t, e, n, r, i) {
  if (
    // The content must have shrunk
    n - e <= i.pos - r.pos || // newEnd must point directly at or after the end of the block that newStart points into
    ua(r, !0, !1) < i.pos
  )
    return !1;
  let o = t.resolve(e);
  if (!r.parent.isTextblock) {
    let l = o.nodeAfter;
    return l != null && n == e + l.nodeSize;
  }
  if (o.parentOffset < o.parent.content.size || !o.parent.isTextblock)
    return !1;
  let s = t.resolve(ua(o, !0, !0));
  return !s.parent.isTextblock || s.pos > n || ua(s, !0, !1) < n ? !1 : r.parent.content.cut(r.parentOffset).eq(s.parent.content);
}
function ua(t, e, n) {
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
function GS(t, e, n, r, i) {
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
    o -= a, o && o < e.size && oh(e.textBetween(o - 1, o + 1)) && (o += a ? 1 : -1), l = o + (l - s), s = o;
  } else if (l < o) {
    let a = r <= o && r >= l ? o - r : 0;
    o -= a, o && o < t.size && oh(t.textBetween(o - 1, o + 1)) && (o += a ? 1 : -1), s = o + (s - l), l = o;
  }
  return { start: o, endA: s, endB: l };
}
function oh(t) {
  if (t.length != 2)
    return !1;
  let e = t.charCodeAt(0), n = t.charCodeAt(1);
  return e >= 56320 && e <= 57343 && n >= 55296 && n <= 56319;
}
class fg {
  /**
  Create a view. `place` may be a DOM node that the editor should
  be appended to, a function that will place it into the document,
  or an object whose `mount` property holds the node to use as the
  document container. If it is `null`, the editor will not be
  added to the document.
  */
  constructor(e, n) {
    this._root = null, this.focused = !1, this.trackWrites = null, this.mounted = !1, this.markCursor = null, this.cursorWrapper = null, this.lastSelectedViewDesc = void 0, this.input = new fS(), this.prevDirectPlugins = [], this.pluginViews = [], this.requiresGeckoHackNode = !1, this.dragging = null, this._props = n, this.state = n.state, this.directPlugins = n.plugins || [], this.directPlugins.forEach(ch), this.dispatch = this.dispatch.bind(this), this.dom = e && e.mount || document.createElement("div"), e && (e.appendChild ? e.appendChild(this.dom) : typeof e == "function" ? e(this.dom) : e.mount && (this.mounted = !0)), this.editable = ah(this), lh(this), this.nodeViews = uh(this), this.docView = _d(this.state.doc, sh(this), aa(this), this.dom, this), this.domObserver = new FS(this, (r, i, o, s) => KS(this, r, i, o, s)), this.domObserver.start(), dS(this), this.updatePluginViews();
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
    this._props = e, e.plugins && (e.plugins.forEach(ch), this.directPlugins = e.plugins), this.updateStateInner(e.state, n);
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
    e.storedMarks && this.composing && (ig(this), s = !0), this.state = e;
    let l = i.plugins != e.plugins || this._props.plugins != n.plugins;
    if (l || this._props.plugins != n.plugins || this._props.nodeViews != n.nodeViews) {
      let h = uh(this);
      QS(h, this.nodeViews) && (this.nodeViews = h, o = !0);
    }
    (l || n.handleDOMEvents != this._props.handleDOMEvents) && fu(this), this.editable = ah(this), lh(this);
    let a = aa(this), u = sh(this), c = i.plugins != e.plugins && !i.doc.eq(e.doc) ? "reset" : e.scrollToSelection > i.scrollToSelection ? "to selection" : "preserve", f = o || !this.docView.matchesNode(e.doc, u, a);
    (f || !e.selection.eq(i.selection)) && (s = !0);
    let d = c == "preserve" && s && this.dom.style.overflowAnchor == null && TC(this);
    if (s) {
      this.domObserver.stop();
      let h = f && (gt || Ue) && !this.composing && !i.selection.empty && !e.selection.empty && YS(i.selection, e.selection);
      if (f) {
        let p = Ue ? this.trackWrites = this.domSelectionRange().focusNode : null;
        this.composing && (this.input.compositionNode = TS(this)), (o || !this.docView.update(e.doc, u, a, this)) && (this.docView.updateOuterDeco(u), this.docView.destroy(), this.docView = _d(e.doc, u, a, this.dom, this)), p && (!this.trackWrites || !this.dom.contains(this.trackWrites)) && (h = !0);
      }
      h || !(this.input.mouseDown && this.domObserver.currentSelection.eq(this.domSelectionRange()) && YC(this)) ? vn(this, h) : (Km(this, e.selection), this.domObserver.setCurSelection()), this.domObserver.start();
    }
    this.updatePluginViews(i), !((r = this.dragging) === null || r === void 0) && r.node && !i.doc.eq(e.doc) && this.updateDraggedNode(this.dragging, i), c == "reset" ? this.dom.scrollTop = 0 : c == "to selection" ? this.scrollToSelection() : d && NC(d);
  }
  /**
  @internal
  */
  scrollToSelection() {
    let e = this.domSelectionRange().focusNode;
    if (!(!e || !this.dom.contains(e.nodeType == 1 ? e : e.parentNode))) {
      if (!this.someProp("handleScrollToSelection", (n) => n(this))) if (this.state.selection instanceof X) {
        let n = this.docView.domAfterPos(this.state.selection.from);
        n.nodeType == 1 && Ld(this, n.getBoundingClientRect(), e);
      } else
        Ld(this, this.coordsAtPos(this.state.selection.head, 1), e);
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
    this.dragging = new sg(e.slice, e.move, i < 0 ? void 0 : X.create(this.state.doc, i));
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
    if (gt) {
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
    this.domObserver.stop(), this.editable && IC(this.dom), vn(this), this.domObserver.start();
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
    return RC(this, e);
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
    return Fm(this, e, n);
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
    return FC(this, n || this.state, e);
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
    return Qu(this, e);
  }
  /**
  Removes the editor from the DOM and destroys all [node
  views](https://prosemirror.net/docs/ref/#view.NodeView).
  */
  destroy() {
    this.docView && (hS(this), this.destroyPluginViews(), this.mounted ? (this.docView.update(this.state.doc, [], aa(this), this), this.dom.textContent = "") : this.dom.parentNode && this.dom.parentNode.removeChild(this.dom), this.docView.destroy(), this.docView = null, gC());
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
    return mS(this, e);
  }
  /**
  @internal
  */
  domSelectionRange() {
    let e = this.domSelection();
    return e ? et && this.root.nodeType === 11 && xC(this.dom.ownerDocument) == this.dom && _S(this, e) || e : { focusNode: null, focusOffset: 0, anchorNode: null, anchorOffset: 0 };
  }
  /**
  @internal
  */
  domSelection() {
    return this.root.getSelection();
  }
}
fg.prototype.dispatch = function(t) {
  let e = this._props.dispatchTransaction;
  e ? e.call(this, t) : this.updateState(this.state.apply(t));
};
function sh(t) {
  let e = /* @__PURE__ */ Object.create(null);
  return e.class = "ProseMirror", e.contenteditable = String(t.editable), t.someProp("attributes", (n) => {
    if (typeof n == "function" && (n = n(t.state)), n)
      for (let r in n)
        r == "class" ? e.class += " " + n[r] : r == "style" ? e.style = (e.style ? e.style + ";" : "") + n[r] : !e[r] && r != "contenteditable" && r != "nodeName" && (e[r] = String(n[r]));
  }), e.translate || (e.translate = "no"), [Je.node(0, t.state.doc.content.size, e)];
}
function lh(t) {
  if (t.markCursor) {
    let e = document.createElement("img");
    e.className = "ProseMirror-separator", e.setAttribute("mark-placeholder", "true"), e.setAttribute("alt", ""), t.cursorWrapper = { dom: e, deco: Je.widget(t.state.selection.from, e, { raw: !0, marks: t.markCursor }) };
  } else
    t.cursorWrapper = null;
}
function ah(t) {
  return !t.someProp("editable", (e) => e(t.state) === !1);
}
function YS(t, e) {
  let n = Math.min(t.$anchor.sharedDepth(t.head), e.$anchor.sharedDepth(e.head));
  return t.$anchor.start(n) != e.$anchor.start(n);
}
function uh(t) {
  let e = /* @__PURE__ */ Object.create(null);
  function n(r) {
    for (let i in r)
      Object.prototype.hasOwnProperty.call(e, i) || (e[i] = r[i]);
  }
  return t.someProp("nodeViews", n), t.someProp("markViews", n), e;
}
function QS(t, e) {
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
function ch(t) {
  if (t.spec.state || t.spec.filterTransaction || t.spec.appendTransaction)
    throw new RangeError("Plugins passed directly to the view must not have a state component");
}
function Nn(t, e) {
  return t.meta = {
    package: "@milkdown/core",
    group: "System",
    ...e
  }, t;
}
var dg = {
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
}, Oe = ue({}, "editorView"), uo = ue({}, "editorState"), ca = ue([], "initTimer"), fh = ue({}, "editor"), Lo = ue([], "inputRules"), Tn = ue([], "prosePlugins"), Po = ue([], "remarkPlugins"), du = ue([], "nodeView"), hu = ue([], "markView"), Er = ue(Ka().use($a).use(ja), "remark"), ko = ue({
  handlers: dg,
  encode: []
}, "remarkStringifyOptions"), $s = tn("ConfigReady");
function XS(t) {
  const e = (n) => (n.record($s), async () => (await t(n), n.done($s), () => {
    n.clearTimer($s);
  }));
  return Nn(e, { displayName: "Config" }), e;
}
var Or = tn("InitReady");
function ZS(t) {
  const e = (n) => (n.inject(fh, t).inject(Tn, []).inject(Po, []).inject(Lo, []).inject(du, []).inject(hu, []).inject(ko, {
    handlers: dg,
    encode: []
  }).inject(Er, Ka().use($a).use(ja)).inject(ca, [$s]).record(Or), async () => {
    await n.waitTimers(ca);
    const r = n.get(ko);
    return n.set(Er, Ka().use($a).use(ja, r)), n.done(Or), () => {
      n.remove(fh).remove(Tn).remove(Po).remove(Lo).remove(du).remove(hu).remove(ko).remove(Er).remove(ca).clearTimer(Or);
    };
  });
  return Nn(e, { displayName: "Init" }), e;
}
var yt = tn("SchemaReady"), fa = ue([], "schemaTimer"), er = ue({}, "schema"), bo = ue([], "nodes"), wo = ue([], "marks");
function dh(t) {
  var e;
  return {
    ...t,
    parseDOM: (e = t.parseDOM) == null ? void 0 : e.map((n) => ({
      priority: t.priority,
      ...n
    }))
  };
}
var hg = (t) => (t.inject(er, {}).inject(bo, []).inject(wo, []).inject(fa, [Or]).record(yt), async () => {
  await t.waitTimers(fa);
  const e = t.get(Er), n = t.get(Po).reduce((i, o) => i.use(o.plugin, o.options), e);
  t.set(Er, n);
  const r = new Ww({
    nodes: Object.fromEntries(t.get(bo).map(([i, o]) => [i, dh(o)])),
    marks: Object.fromEntries(t.get(wo).map(([i, o]) => [i, dh(o)]))
  });
  return t.set(er, r), t.done(yt), () => {
    t.remove(er).remove(bo).remove(wo).remove(fa).clearTimer(yt);
  };
});
Nn(hg, { displayName: "Schema" });
var xr, Ot, rp, pg = (rp = class {
  constructor() {
    K(this, xr);
    K(this, Ot);
    B(this, xr, new sp()), B(this, Ot, null), this.setCtx = (t) => {
      B(this, Ot, t);
    }, this.chain = () => {
      if (M(this, Ot) == null) throw Bl();
      const t = M(this, Ot), e = [], n = this.get.bind(this), r = {
        run: () => {
          const o = Vi(...e), s = t.get(Oe);
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
    return M(this, Ot);
  }
  create(t, e) {
    const n = t.create(M(this, xr).sliceMap);
    return n.set(e), n;
  }
  get(t) {
    return M(this, xr).get(t).get();
  }
  remove(t) {
    return M(this, xr).remove(t);
  }
  call(t, e) {
    if (M(this, Ot) == null) throw Bl();
    const n = this.get(t)(e), r = M(this, Ot).get(Oe);
    return n(r.state, r.dispatch, r);
  }
  inline(t) {
    if (M(this, Ot) == null) throw Bl();
    const e = M(this, Ot).get(Oe);
    return t(e.state, e.dispatch, e);
  }
}, xr = new WeakMap(), Ot = new WeakMap(), rp);
function ev(t = "cmdKey") {
  return ue(() => () => !1, t);
}
var ge = ue(new pg(), "commands"), da = ue([yt], "commandsTimer"), xo = tn("CommandsReady"), mg = (t) => {
  const e = new pg();
  return e.setCtx(t), t.inject(ge, e).inject(da, [yt]).record(xo), async () => (await t.waitTimers(da), t.done(xo), () => {
    t.remove(ge).remove(da).clearTimer(xo);
  });
};
Nn(mg, { displayName: "Commands" });
function tv(t) {
  return t.Backspace = Vi(Wx, Hu, Mx, km), t;
}
var Cr, dt, ip, gg = (ip = class {
  constructor() {
    K(this, Cr);
    K(this, dt);
    B(this, Cr, null), B(this, dt, []), this.setCtx = (t) => {
      B(this, Cr, t);
    }, this.add = (t) => (M(this, dt).push(t), () => {
      B(this, dt, M(this, dt).filter((e) => e !== t));
    }), this.addObjectKeymap = (t) => {
      const e = [];
      return Object.entries(t).forEach(([n, r]) => {
        if (typeof r == "function") {
          const i = {
            key: n,
            onRun: () => r
          };
          M(this, dt).push(i), e.push(() => {
            B(this, dt, M(this, dt).filter((o) => o !== i));
          });
        } else
          M(this, dt).push(r), e.push(() => {
            B(this, dt, M(this, dt).filter((i) => i !== r));
          });
      }), () => {
        e.forEach((n) => n());
      };
    }, this.addBaseKeymap = () => {
      const t = tv(Hx);
      return this.addObjectKeymap(t);
    }, this.build = () => {
      const t = {};
      return M(this, dt).forEach((e) => {
        t[e.key] = [...t[e.key] || [], e];
      }), Object.fromEntries(Object.entries(t).map(([e, n]) => {
        const r = n.sort((o, s) => (s.priority ?? 50) - (o.priority ?? 50));
        return [e, (o, s, l) => {
          const a = M(this, Cr);
          if (a == null) throw gl();
          return Vi(...r.map((u) => u.onRun(a)))(o, s, l);
        }];
      }));
    };
  }
  get ctx() {
    return M(this, Cr);
  }
}, Cr = new WeakMap(), dt = new WeakMap(), ip), al = ue(new gg(), "keymap"), ha = ue([yt], "keymapTimer"), Co = tn("KeymapReady"), nv = (t) => {
  const e = new gg();
  return e.setCtx(t), t.inject(al, e).inject(ha, [yt]).record(Co), async () => (await t.waitTimers(ha), t.done(Co), () => {
    t.remove(al).remove(ha).clearTimer(Co);
  });
}, _s = tn("ParserReady"), yg = () => {
  throw gl();
}, Vs = ue(yg, "parser"), pa = ue([], "parserTimer"), kg = (t) => (t.inject(Vs, yg).inject(pa, [yt]).record(_s), async () => {
  await t.waitTimers(pa);
  const e = t.get(Er), n = t.get(er);
  return t.set(Vs, hC.create(n, e)), t.done(_s), () => {
    t.remove(Vs).remove(pa).clearTimer(_s);
  };
});
Nn(kg, { displayName: "Parser" });
var So = tn("SerializerReady"), ma = ue([], "serializerTimer"), bg = () => {
  throw gl();
}, vo = ue(bg, "serializer"), wg = (t) => (t.inject(vo, bg).inject(ma, [yt]).record(So), async () => {
  await t.waitTimers(ma);
  const e = t.get(Er), n = t.get(er);
  return t.set(vo, mC.create(n, e)), t.done(So), () => {
    t.remove(vo).remove(ma).clearTimer(So);
  };
});
Nn(wg, { displayName: "Serializer" });
var Hs = ue("", "defaultValue"), ga = ue((t) => t, "stateOptions"), ya = ue([], "editorStateTimer"), js = tn("EditorStateReady");
function rv(t, e, n) {
  if (typeof t == "string") return e(t);
  if (t.type === "html") return Bu.fromSchema(n).parse(t.dom);
  if (t.type === "json") return Sn.fromJSON(n, t.value);
  throw Hk(t);
}
var iv = new nt("MILKDOWN_STATE_TRACKER"), xg = (t) => (t.inject(Hs, "").inject(uo, {}).inject(ga, (e) => e).inject(ya, [
  _s,
  So,
  xo,
  Co
]).record(js), async () => {
  await t.waitTimers(ya);
  const e = t.get(er), n = t.get(Vs), r = t.get(Lo), i = t.get(ga), o = t.get(Tn), s = rv(t.get(Hs), n, e), l = t.get(al), a = l.addBaseKeymap(), u = [
    ...o,
    new je({
      key: iv,
      state: {
        init: () => {
        },
        apply: (d, h, p, k) => {
          t.set(uo, k);
        }
      }
    }),
    Xx({ rules: r }),
    Tm(l.build())
  ];
  t.set(Tn, u);
  const c = i({
    schema: e,
    doc: s,
    plugins: u
  }), f = ii.create(c);
  return t.set(uo, f), t.done(js), () => {
    a(), t.remove(Hs).remove(uo).remove(ga).remove(ya).clearTimer(js);
  };
});
Nn(xg, { displayName: "EditorState" });
var zo = ue([], "pasteRule"), ka = ue([yt], "pasteRuleTimer"), Ws = tn("PasteRuleReady"), Cg = (t) => (t.inject(zo, []).inject(ka, [yt]).record(Ws), async () => (await t.waitTimers(ka), t.done(Ws), () => {
  t.remove(zo).remove(ka).clearTimer(Ws);
}));
Nn(Cg, { displayName: "PasteRule" });
var qs = tn("EditorViewReady"), ba = ue([], "editorViewTimer"), wa = ue({}, "editorViewOptions"), Ks = ue(null, "root"), pu = ue(null, "rootDOM"), mu = ue({}, "rootAttrs");
function ov(t, e) {
  const n = document.createElement("div");
  n.className = "milkdown", t.appendChild(n), e.set(pu, n);
  const r = e.get(mu);
  return Object.entries(r).forEach(([i, o]) => n.setAttribute(i, o)), n;
}
function sv(t) {
  t.classList.add("editor"), t.setAttribute("role", "textbox");
}
var lv = new nt("MILKDOWN_VIEW_CLEAR"), Sg = (t) => (t.inject(Ks, document.body).inject(Oe, {}).inject(wa, {}).inject(pu, null).inject(mu, {}).inject(ba, [js, Ws]).record(qs), async () => {
  await t.wait(Or);
  const e = t.get(Ks) || document.body, n = typeof e == "string" ? document.querySelector(e) : e;
  t.update(Tn, (s) => [new je({
    key: lv,
    view: (l) => {
      const a = n ? ov(n, t) : void 0;
      return (() => {
        if (a && n) {
          const c = l.dom;
          n.replaceChild(a, c), a.appendChild(c);
        }
      })(), { destroy: () => {
        a != null && a.parentNode && (a == null || a.parentNode.replaceChild(l.dom, a)), a == null || a.remove();
      } };
    }
  }), ...s]), await t.waitTimers(ba);
  const r = t.get(uo), i = t.get(wa), o = new fg(n, {
    state: r,
    nodeViews: Object.fromEntries(t.get(du)),
    markViews: Object.fromEntries(t.get(hu)),
    transformPasted: (s, l, a) => (t.get(zo).sort((u, c) => (c.priority ?? 50) - (u.priority ?? 50)).map((u) => u.run).forEach((u) => {
      s = u(s, l, a);
    }), s),
    ...i
  });
  return sv(o.dom), t.set(Oe, o), t.done(qs), () => {
    o == null || o.destroy(), t.remove(Ks).remove(Oe).remove(wa).remove(pu).remove(mu).remove(ba).clearTimer(qs);
  };
});
Nn(Sg, { displayName: "EditorView" });
var At = /* @__PURE__ */ function(t) {
  return t.Idle = "Idle", t.OnCreate = "OnCreate", t.Created = "Created", t.OnDestroy = "OnDestroy", t.Destroyed = "Destroyed", t;
}({}), Sr, Ct, kn, Ti, Qo, Xo, ht, bn, vr, Zo, Mr, Ni, es, Un, Ii, Ai, av = (Ai = class {
  constructor() {
    K(this, Sr);
    K(this, Ct);
    K(this, kn);
    K(this, Ti);
    K(this, Qo);
    K(this, Xo);
    K(this, ht);
    K(this, bn);
    K(this, vr);
    K(this, Zo);
    K(this, Mr);
    K(this, Ni);
    K(this, es);
    K(this, Un);
    K(this, Ii);
    B(this, Sr, !1), B(this, Ct, At.Idle), B(this, kn, []), B(this, Ti, () => {
    }), B(this, Qo, new sp()), B(this, Xo, new e1()), B(this, ht, /* @__PURE__ */ new Map()), B(this, bn, /* @__PURE__ */ new Map()), B(this, vr, new Zk(M(this, Qo), M(this, Xo))), B(this, Zo, () => {
      const e = XS(async (r) => {
        await Promise.all(M(this, kn).map((i) => Promise.resolve(i(r))));
      }), n = [
        hg,
        kg,
        wg,
        mg,
        nv,
        Cg,
        xg,
        Sg,
        ZS(this),
        e
      ];
      M(this, Mr).call(this, n, M(this, bn));
    }), B(this, Mr, (e, n) => {
      e.forEach((r) => {
        const i = M(this, vr).produce(M(this, Sr) ? r.meta : void 0), o = r(i);
        n.set(r, {
          ctx: i,
          handler: o,
          cleanup: void 0
        });
      });
    }), B(this, Ni, (e, n = !1) => Promise.all([e].flat().map(async (r) => {
      var o;
      const i = (o = M(this, ht).get(r)) == null ? void 0 : o.cleanup;
      return n ? M(this, ht).delete(r) : M(this, ht).set(r, {
        ctx: void 0,
        handler: void 0,
        cleanup: void 0
      }), typeof i == "function" ? i() : i;
    }))), B(this, es, async () => {
      await Promise.all([...M(this, bn).entries()].map(async ([e, { cleanup: n }]) => typeof n == "function" ? n() : n)), M(this, bn).clear();
    }), B(this, Un, (e) => {
      B(this, Ct, e), M(this, Ti).call(this, e);
    }), B(this, Ii, (e) => [...e.entries()].map(async ([n, r]) => {
      const { ctx: i, handler: o } = r;
      if (!o) return;
      const s = await o();
      e.set(n, {
        ctx: i,
        handler: o,
        cleanup: s
      });
    })), this.enableInspector = (e = !0) => (B(this, Sr, e), this), this.onStatusChange = (e) => (B(this, Ti, e), this), this.config = (e) => (M(this, kn).push(e), this), this.removeConfig = (e) => (B(this, kn, M(this, kn).filter((n) => n !== e)), this), this.use = (e) => {
      const n = [e].flat();
      return n.flat().forEach((r) => {
        M(this, ht).set(r, {
          ctx: void 0,
          handler: void 0,
          cleanup: void 0
        });
      }), M(this, Ct) === At.Created && M(this, Mr).call(this, n, M(this, ht)), this;
    }, this.remove = async (e) => M(this, Ct) === At.OnCreate ? (console.warn("[Milkdown]: You are trying to remove plugins when the editor is creating, this is not recommended, please check your code."), new Promise((n) => {
      setTimeout(() => {
        n(this.remove(e));
      }, 50);
    })) : (await M(this, Ni).call(this, [e].flat(), !0), this), this.create = async () => M(this, Ct) === At.OnCreate ? this : (M(this, Ct) === At.Created && await this.destroy(), M(this, Un).call(this, At.OnCreate), M(this, Zo).call(this), M(this, Mr).call(this, [...M(this, ht).keys()], M(this, ht)), await Promise.all([M(this, Ii).call(this, M(this, bn)), M(this, Ii).call(this, M(this, ht))].flat()), M(this, Un).call(this, At.Created), this), this.destroy = async (e = !1) => M(this, Ct) === At.Destroyed || M(this, Ct) === At.OnDestroy ? this : M(this, Ct) === At.OnCreate ? new Promise((n) => {
      setTimeout(() => {
        n(this.destroy(e));
      }, 50);
    }) : (e && B(this, kn, []), M(this, Un).call(this, At.OnDestroy), await M(this, Ni).call(this, [...M(this, ht).keys()], e), await M(this, es).call(this), M(this, Un).call(this, At.Destroyed), this), this.action = (e) => e(M(this, vr)), this.inspect = () => M(this, Sr) ? [...M(this, bn).values(), ...M(this, ht).values()].map(({ ctx: e }) => {
      var n;
      return (n = e == null ? void 0 : e.inspector) == null ? void 0 : n.read();
    }).filter((e) => !!e) : (console.warn("[Milkdown]: You are trying to collect inspection when inspector is disabled, please enable inspector by `editor.enableInspector()` first."), []);
  }
  static make() {
    return new Ai();
  }
  get ctx() {
    return M(this, vr);
  }
  get status() {
    return M(this, Ct);
  }
}, Sr = new WeakMap(), Ct = new WeakMap(), kn = new WeakMap(), Ti = new WeakMap(), Qo = new WeakMap(), Xo = new WeakMap(), ht = new WeakMap(), bn = new WeakMap(), vr = new WeakMap(), Zo = new WeakMap(), Mr = new WeakMap(), Ni = new WeakMap(), es = new WeakMap(), Un = new WeakMap(), Ii = new WeakMap(), Ai);
function Z(t, e) {
  const n = ev(t), r = (i) => async () => {
    r.key = n, await i.wait(xo);
    const o = e(i);
    return i.get(ge).create(n, o), r.run = (s) => i.get(ge).call(t, s), () => {
      i.get(ge).remove(n);
    };
  };
  return r;
}
function bt(t) {
  const e = (n) => async () => {
    await n.wait(yt);
    const r = t(n);
    return n.update(Lo, (i) => [...i, r]), e.inputRule = r, () => {
      n.update(Lo, (i) => i.filter((o) => o !== r));
    };
  };
  return e;
}
function uv(t) {
  const e = (n) => async () => {
    await n.wait(yt);
    const r = t(n);
    return n.update(zo, (i) => [...i, r]), e.pasteRule = r, () => {
      n.update(zo, (i) => i.filter((o) => o !== r));
    };
  };
  return e;
}
function cv(t, e) {
  const n = (r) => async () => {
    const i = e(r);
    return r.update(wo, (o) => [...o.filter((s) => s[0] !== t), [t, i]]), n.id = t, n.schema = i, () => {
      r.update(wo, (o) => o.filter(([s]) => s !== t));
    };
  };
  return n.type = (r) => {
    const i = r.get(er).marks[t];
    if (!i) throw Gk(t);
    return i;
  }, n;
}
function rc(t, e) {
  const n = (r) => async () => {
    const i = e(r);
    return r.update(bo, (o) => [...o.filter((s) => s[0] !== t), [t, i]]), n.id = t, n.schema = i, () => {
      r.update(bo, (o) => o.filter(([s]) => s !== t));
    };
  };
  return n.type = (r) => {
    const i = r.get(er).nodes[t];
    if (!i) throw Jk(t);
    return i;
  }, n;
}
function nn(t) {
  let e;
  const n = (r) => async () => (await r.wait(yt), e = t(r), r.update(Tn, (i) => [...i, e]), () => {
    r.update(Tn, (i) => i.filter((o) => o !== e));
  });
  return n.plugin = () => e, n.key = () => e.spec.key, n;
}
function fv(t) {
  const e = (n) => async () => {
    await n.wait(Co);
    const r = n.get(al), i = t(n), o = r.addObjectKeymap(i);
    return e.keymap = i, () => {
      o();
    };
  };
  return e;
}
function In(t, e) {
  const n = ue(t, e), r = (i) => (i.inject(n), () => () => {
    i.remove(n);
  });
  return r.key = n, r;
}
function Ie(t, e) {
  const n = In(e, t), r = rc(t, (o) => o.get(n.key)(o)), i = [n, r];
  return i.id = r.id, i.node = r, i.type = (o) => r.type(o), i.ctx = n, i.key = n.key, i.extendSchema = (o) => Ie(t, o(e)), i;
}
function Hi(t, e) {
  const n = In(e, t), r = cv(t, (o) => o.get(n.key)(o)), i = [n, r];
  return i.id = r.id, i.mark = r, i.type = (o) => r.type(o), i.ctx = n, i.key = n.key, i.extendSchema = (o) => Hi(t, o(e)), i;
}
function wt(t, e) {
  const n = In(Object.fromEntries(Object.entries(e).map(([o, { shortcuts: s, priority: l }]) => [o, {
    shortcuts: s,
    priority: l
  }])), `${t}Keymap`), r = fv((o) => {
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
var qt = (t, e = () => ({})) => In(e, `${t}Attr`), us = (t, e = () => ({})) => In(e, `${t}Attr`);
function rn(t, e, n) {
  const r = In({}, t), i = (s) => async () => {
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
function dv(t, e) {
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
        for (let w = i.depth - d; w >= i.depth - 3; w--)
          f = R.from(i.node(w).copy(f));
        let h = i.indexAfter(-1) < i.node(-2).childCount ? 1 : i.indexAfter(-2) < i.node(-3).childCount ? 2 : 3;
        f = f.append(R.from(t.createAndFill()));
        let p = i.before(i.depth - (d - 1)), k = n.tr.replace(p, i.after(-h), new V(f, 4 - d, 0)), b = -1;
        k.doc.nodesBetween(p, k.doc.content.size, (w, L) => {
          if (b > -1)
            return !1;
          w.isTextblock && w.content.size == 0 && (b = L + 1);
        }), b > -1 && k.setSelection(te.near(k.doc.resolve(b))), r(k.scrollIntoView());
      }
      return !0;
    }
    let a = o.pos == i.end() ? l.contentMatchAt(0).defaultType : null, u = n.tr.delete(i.pos, o.pos), c = a ? [null, { type: a }] : void 0;
    return mo(u.doc, i.pos, 2, c) ? (r && r(u.split(i.pos, 2, c).scrollIntoView()), !0) : !1;
  };
}
function vg(t) {
  return function(e, n) {
    let { $from: r, $to: i } = e.selection, o = r.blockRange(i, (s) => s.childCount > 0 && s.firstChild.type == t);
    return o ? n ? r.node(o.depth - 1).type == t ? hv(e, n, t, o) : pv(e, n, o) : !0 : !1;
  };
}
function hv(t, e, n, r) {
  let i = t.tr, o = r.end, s = r.$to.end(r.depth);
  o < s && (i.step(new Ze(o - 1, s, o, s, new V(R.from(n.create(null, r.parent.copy())), 1, 0), 1, !0)), r = new Wp(i.doc.resolve(r.$from.pos), i.doc.resolve(s), r.depth));
  const l = Cl(r);
  if (l == null)
    return !1;
  i.lift(r, l);
  let a = i.doc.resolve(i.mapping.map(o, -1) - 1);
  return Sl(i.doc, a.pos) && a.nodeBefore.type == a.nodeAfter.type && i.join(a.pos), e(i.scrollIntoView()), !0;
}
function pv(t, e, n) {
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
  return r.step(new Ze(f - (l ? 1 : 0), d + (a ? 1 : 0), f + 1, d - 1, new V((l ? R.empty : R.from(i.copy(R.empty))).append(a ? R.empty : R.from(i.copy(R.empty))), l ? 0 : 1, a ? 0 : 1), l ? 0 : 1)), e(r.scrollIntoView()), !0;
}
function mv(t) {
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
      let u = a.lastChild && a.lastChild.type == l.type, c = R.from(u ? t.create() : null), f = new V(R.from(t.create(null, R.from(l.type.create(null, c)))), u ? 3 : 1, 0), d = o.start, h = o.end;
      n(e.tr.step(new Ze(d - (u ? 3 : 1), h, d, h, f, 1, !0)).scrollIntoView());
    }
    return !0;
  };
}
function gv(t) {
  const e = /* @__PURE__ */ new Map();
  if (!t || !t.type)
    throw new Error("mdast-util-definitions expected node");
  return $i(t, "definition", function(r) {
    const i = hh(r.identifier);
    i && !e.get(i) && e.set(i, r);
  }), n;
  function n(r) {
    const i = hh(r);
    return e.get(i);
  }
}
function hh(t) {
  return String(t || "").toUpperCase();
}
function yv() {
  return function(t) {
    const e = gv(t);
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
function Mg(t, e) {
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
var ic = us("emphasis");
D(ic, {
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
  toDOM: (e) => ["em", t.get(ic.key)(e)],
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
var oc = Z("ToggleEmphasis", (t) => () => rs(ji.type(t)));
D(oc, {
  displayName: "Command<toggleEmphasisCommand>",
  group: "Emphasis"
});
var Tg = bt((t) => is(/(?:^|[^*])\*([^*]+)\*$/, ji.type(t), {
  getAttr: () => ({ marker: "*" }),
  updateCaptured: ({ fullMatch: e, start: n }) => e.startsWith("*") ? {} : {
    fullMatch: e.slice(1),
    start: n + 1
  }
}));
D(Tg, {
  displayName: "InputRule<emphasis>|Star",
  group: "Emphasis"
});
var Ng = bt((t) => is(/\b_(?![_\s])(.*?[^_\s])_\b/, ji.type(t), {
  getAttr: () => ({ marker: "_" }),
  updateCaptured: ({ fullMatch: e, start: n }) => e.startsWith("_") ? {} : {
    fullMatch: e.slice(1),
    start: n + 1
  }
}));
D(Ng, {
  displayName: "InputRule<emphasis>|Underscore",
  group: "Emphasis"
});
var sc = wt("emphasisKeymap", { ToggleEmphasis: {
  shortcuts: "Mod-i",
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(oc.key);
  }
} });
D(sc.ctx, {
  displayName: "KeymapCtx<emphasis>",
  group: "Emphasis"
});
D(sc.shortcuts, {
  displayName: "Keymap<emphasis>",
  group: "Emphasis"
});
var lc = us("strong");
D(lc, {
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
  toDOM: (e) => ["strong", t.get(lc.key)(e)],
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
var ac = Z("ToggleStrong", (t) => () => rs(cs.type(t)));
D(ac, {
  displayName: "Command<toggleStrongCommand>",
  group: "Strong"
});
var Ig = bt((t) => is(new RegExp("(?:^|[^\\\\w:/])(?:\\\\*\\\\*|__)([^*_]+?)(?:\\\\*\\\\*|__)(?![\\\\w/])$"), cs.type(t), { updateCaptured: (e) => e.fullMatch.startsWith("**") || e.fullMatch.startsWith("__") ? e : { start: e.start + 1, fullMatch: e.fullMatch.slice(1) }, getAttr: (e) => ({ marker: (e[0].startsWith("**") || e[0].startsWith("__") ? e[0] : e[0].slice(1)).startsWith("*") ? "*" : "_" }) }));
D(Ig, {
  displayName: "InputRule<strong>",
  group: "Strong"
});
var uc = wt("strongKeymap", { ToggleBold: {
  shortcuts: ["Mod-b"],
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(ac.key);
  }
} });
D(uc.ctx, {
  displayName: "KeymapCtx<strong>",
  group: "Strong"
});
D(uc.shortcuts, {
  displayName: "Keymap<strong>",
  group: "Strong"
});
var cc = us("inlineCode");
D(cc, {
  displayName: "Attr<inlineCode>",
  group: "InlineCode"
});
var Yn = Hi("inlineCode", (t) => ({
  priority: 100,
  code: !0,
  parseDOM: [{ tag: "code" }],
  toDOM: (e) => ["code", t.get(cc.key)(e)],
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
var fc = Z("ToggleInlineCode", (t) => () => (e, n) => {
  const { selection: r, tr: i } = e;
  if (r.empty) return !1;
  const { from: o, to: s } = r;
  return e.doc.rangeHasMark(o, s, Yn.type(t)) ? (n == null || n(i.removeMark(o, s, Yn.type(t))), !0) : (Object.keys(e.schema.marks).filter((l) => l !== Yn.type.name).map((l) => e.schema.marks[l]).forEach((l) => {
    i.removeMark(o, s, l);
  }), n == null || n(i.addMark(o, s, Yn.type(t).create())), !0);
});
D(fc, {
  displayName: "Command<toggleInlineCodeCommand>",
  group: "InlineCode"
});
var Ag = bt((t) => is(/(?:`)([^`]+)(?:`)$/, Yn.type(t)));
D(Ag, {
  displayName: "InputRule<inlineCodeInputRule>",
  group: "InlineCode"
});
var dc = wt("inlineCodeKeymap", { ToggleInlineCode: {
  shortcuts: "Mod-e",
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(fc.key);
  }
} });
D(dc.ctx, {
  displayName: "KeymapCtx<inlineCode>",
  group: "InlineCode"
});
D(dc.shortcuts, {
  displayName: "Keymap<inlineCode>",
  group: "InlineCode"
});
var hc = us("link");
D(hc, {
  displayName: "Attr<link>",
  group: "Link"
});
var ui = Hi("link", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw en(e);
      return {
        href: e.getAttribute("href"),
        title: e.getAttribute("title")
      };
    }
  }],
  toDOM: (e) => ["a", {
    ...t.get(hc.key)(e),
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
D(ui.mark, {
  displayName: "MarkSchema<link>",
  group: "Link"
});
var Eg = Z("ToggleLink", (t) => (e = {}) => rs(ui.type(t), e));
D(Eg, {
  displayName: "Command<toggleLinkCommand>",
  group: "Link"
});
var Og = Z("UpdateLink", (t) => (e = {}) => (n, r) => {
  if (!r) return !1;
  let i, o = -1;
  const { selection: s } = n, { from: l, to: a } = s;
  if (n.doc.nodesBetween(l, l === a ? a + 1 : a, (p, k) => {
    if (ui.type(t).isInSet(p.marks))
      return i = p, o = k, !1;
  }), !i) return !1;
  const u = i.marks.find(({ type: p }) => p === ui.type(t));
  if (!u) return !1;
  const c = o, f = o + i.nodeSize, { tr: d } = n, h = ui.type(t).create({
    ...u.attrs,
    ...e
  });
  return h ? (r(d.removeMark(c, f, u).addMark(c, f, h).setSelection(new Q(d.selection.$anchor)).scrollIntoView()), !0) : !1;
});
D(Og, {
  displayName: "Command<updateLinkCommand>",
  group: "Link"
});
var Dg = rc("doc", () => ({
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
D(Dg, {
  displayName: "NodeSchema<doc>",
  group: "Doc"
});
function kv(t) {
  return Ru(t, (e) => {
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
var Al = rn("remark-preserve-empty-line", () => () => kv);
D(Al.plugin, {
  displayName: "Remark<remarkPreserveEmptyLine>",
  group: "Remark"
});
D(Al.options, {
  displayName: "RemarkConfig<remarkPreserveEmptyLine>",
  group: "Remark"
});
var pc = qt("paragraph");
D(pc, {
  displayName: "Attr<paragraph>",
  group: "Paragraph"
});
var Zt = Ie("paragraph", (t) => ({
  content: "inline*",
  group: "block",
  parseDOM: [{ tag: "p" }],
  toDOM: (e) => [
    "p",
    t.get(pc.key)(e),
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
      const r = (i = t.get(Oe).state) == null ? void 0 : i.doc.lastChild;
      e.openNode("paragraph"), (!n.content || n.content.size === 0) && n !== r && bv(t) ? e.addNode("html", void 0, "<br />") : Mg(e, n), e.closeNode();
    }
  }
}));
function bv(t) {
  let e = !1;
  try {
    t.get(Al.id), e = !0;
  } catch {
    e = !1;
  }
  return e;
}
D(Zt.node, {
  displayName: "NodeSchema<paragraph>",
  group: "Paragraph"
});
D(Zt.ctx, {
  displayName: "NodeSchemaCtx<paragraph>",
  group: "Paragraph"
});
var mc = Z("TurnIntoText", (t) => () => xn(Zt.type(t)));
D(mc, {
  displayName: "Command<turnIntoTextCommand>",
  group: "Paragraph"
});
var gc = wt("paragraphKeymap", { TurnIntoText: {
  shortcuts: "Mod-Alt-0",
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(mc.key);
  }
} });
D(gc.ctx, {
  displayName: "KeymapCtx<paragraph>",
  group: "Paragraph"
});
D(gc.shortcuts, {
  displayName: "Keymap<paragraph>",
  group: "Paragraph"
});
var wv = Array(6).fill(0).map((t, e) => e + 1);
function xv(t) {
  return t.textContent.toLowerCase().trim().replace(/\s+/g, "-");
}
var El = In(xv, "headingIdGenerator");
D(El, {
  displayName: "Ctx<HeadingIdGenerator>",
  group: "Heading"
});
var yc = qt("heading");
D(yc, {
  displayName: "Attr<heading>",
  group: "Heading"
});
var qr = Ie("heading", (t) => {
  const e = t.get(El.key);
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
    parseDOM: wv.map((n) => ({
      tag: `h${n}`,
      getAttrs: (r) => {
        if (!(r instanceof HTMLElement)) throw en(r);
        return {
          level: n,
          id: r.id
        };
      }
    })),
    toDOM: (n) => [
      `h${n.attrs.level}`,
      {
        ...t.get(yc.key)(n),
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
        n.openNode("heading", void 0, { depth: r.attrs.level }), Mg(n, r), n.closeNode();
      }
    }
  };
});
D(qr.node, {
  displayName: "NodeSchema<heading>",
  group: "Heading"
});
D(qr.ctx, {
  displayName: "NodeSchemaCtx<heading>",
  group: "Heading"
});
var Rg = bt((t) => Sm(/^(#+)\s$/, qr.type(t), (e) => {
  var o, s;
  const n = (e[1] || "").length || 0, { $from: r } = t.get(Oe).state.selection, i = r.node();
  if (i.type.name === "heading") {
    let l = Number(i.attrs.level) + Number(n);
    return l > 6 && (l = 6), { level: l };
  }
  return { level: n };
}));
D(Rg, {
  displayName: "InputRule<wrapInHeadingInputRule>",
  group: "Heading"
});
var _n = Z("WrapInHeading", (t) => (e) => (e ?? (e = 1), e < 1 ? xn(Zt.type(t)) : xn(qr.type(t), { level: e })));
D(_n, {
  displayName: "Command<wrapInHeadingCommand>",
  group: "Heading"
});
var kc = Z("DowngradeHeading", (t) => () => (e, n, r) => {
  const { $from: i } = e.selection, o = i.node();
  if (o.type !== qr.type(t) || !e.selection.empty || i.parentOffset !== 0) return !1;
  const s = o.attrs.level - 1;
  return s ? (n == null || n(e.tr.setNodeMarkup(e.selection.$from.before(), void 0, {
    ...o.attrs,
    level: s
  })), !0) : xn(Zt.type(t))(e, n, r);
});
D(kc, {
  displayName: "Command<downgradeHeadingCommand>",
  group: "Heading"
});
var bc = wt("headingKeymap", {
  TurnIntoH1: {
    shortcuts: "Mod-Alt-1",
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(_n.key, 1);
    }
  },
  TurnIntoH2: {
    shortcuts: "Mod-Alt-2",
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(_n.key, 2);
    }
  },
  TurnIntoH3: {
    shortcuts: "Mod-Alt-3",
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(_n.key, 3);
    }
  },
  TurnIntoH4: {
    shortcuts: "Mod-Alt-4",
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(_n.key, 4);
    }
  },
  TurnIntoH5: {
    shortcuts: "Mod-Alt-5",
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(_n.key, 5);
    }
  },
  TurnIntoH6: {
    shortcuts: "Mod-Alt-6",
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(_n.key, 6);
    }
  },
  DowngradeHeading: {
    shortcuts: ["Delete", "Backspace"],
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(kc.key);
    }
  }
});
D(bc.ctx, {
  displayName: "KeymapCtx<heading>",
  group: "Heading"
});
D(bc.shortcuts, {
  displayName: "Keymap<heading>",
  group: "Heading"
});
var wc = qt("blockquote");
D(wc, {
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
    t.get(wc.key)(e),
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
var Lg = bt((t) => Ku(/^\s*>\s$/, fs.type(t)));
D(Lg, {
  displayName: "InputRule<wrapInBlockquoteInputRule>",
  group: "Blockquote"
});
var xc = Z("WrapInBlockquote", (t) => () => qu(fs.type(t)));
D(xc, {
  displayName: "Command<wrapInBlockquoteCommand>",
  group: "Blockquote"
});
var Cc = wt("blockquoteKeymap", { WrapInBlockquote: {
  shortcuts: "Mod-Shift-b",
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(xc.key);
  }
} });
D(Cc.ctx, {
  displayName: "KeymapCtx<blockquote>",
  group: "Blockquote"
});
D(Cc.shortcuts, {
  displayName: "Keymap<blockquote>",
  group: "Blockquote"
});
var Sc = qt("codeBlock", () => ({
  pre: {},
  code: {}
}));
D(Sc, {
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
      if (!(e instanceof HTMLElement)) throw en(e);
      return { language: e.dataset.language };
    }
  }],
  toDOM: (e) => {
    const n = t.get(Sc.key)(e), r = e.attrs.language, i = r && r.length > 0 ? { "data-language": r } : void 0;
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
var Pg = bt((t) => Sm(/^```([a-z]*)?[\s\n]$/, ds.type(t), (e) => {
  var n;
  return { language: e[1] ?? "" };
}));
D(Pg, {
  displayName: "InputRule<createCodeBlockInputRule>",
  group: "CodeBlock"
});
var vc = Z("CreateCodeBlock", (t) => (e = "") => xn(ds.type(t), { language: e }));
D(vc, {
  displayName: "Command<createCodeBlockCommand>",
  group: "CodeBlock"
});
var Cv = Z("UpdateCodeBlockLanguage", () => ({ pos: t, language: e } = {
  pos: -1,
  language: ""
}) => (n, r) => t >= 0 ? (r == null || r(n.tr.setNodeAttribute(t, "language", e)), !0) : !1);
D(Cv, {
  displayName: "Command<updateCodeBlockLanguageCommand>",
  group: "CodeBlock"
});
var Mc = wt("codeBlockKeymap", { CreateCodeBlock: {
  shortcuts: "Mod-Alt-c",
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(vc.key);
  }
} });
D(Mc.ctx, {
  displayName: "KeymapCtx<codeBlock>",
  group: "CodeBlock"
});
D(Mc.shortcuts, {
  displayName: "Keymap<codeBlock>",
  group: "CodeBlock"
});
var Tc = qt("image");
D(Tc, {
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
      if (!(e instanceof HTMLElement)) throw en(e);
      return {
        src: e.getAttribute("src") || "",
        alt: e.getAttribute("alt") || "",
        title: e.getAttribute("title") || e.getAttribute("alt") || ""
      };
    }
  }],
  toDOM: (e) => ["img", {
    ...t.get(Tc.key)(e),
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
var zg = Z("InsertImage", (t) => (e = {}) => (n, r) => {
  if (!r) return !0;
  const { src: i = "", alt: o = "", title: s = "" } = e, l = Wi.type(t).create({
    src: i,
    alt: o,
    title: s
  });
  return l && r(n.tr.replaceSelectionWith(l).scrollIntoView()), !0;
});
D(zg, {
  displayName: "Command<insertImageCommand>",
  group: "Image"
});
var Bg = Z("UpdateImage", (t) => (e = {}) => (n, r) => {
  const i = rC(n.selection, Wi.type(t));
  if (!i) return !1;
  const { node: o, pos: s } = i, l = { ...o.attrs }, { src: a, alt: u, title: c } = e;
  return a !== void 0 && (l.src = a), u !== void 0 && (l.alt = u), c !== void 0 && (l.title = c), r == null || r(n.tr.setNodeMarkup(s, void 0, l).scrollIntoView()), !0;
});
D(Bg, {
  displayName: "Command<updateImageCommand>",
  group: "Image"
});
var Sv = bt((t) => new Nt(/!\[(.*?)]\((.*?)\s*(?="|\))"?([^"]+)?"?\)/, (e, n, r, i) => {
  const [o, s, l = "", a] = n;
  return o ? e.tr.replaceWith(r, i, Wi.type(t).create({
    src: l,
    alt: s,
    title: a
  })) : null;
}));
D(Sv, {
  displayName: "InputRule<insertImageInputRule>",
  group: "Image"
});
var ul = qt("hardbreak", (t) => ({
  "data-type": "hardbreak",
  "data-is-inline": t.attrs.isInline
}));
D(ul, {
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
    t.get(ul.key)(e),
    " "
  ] : ["br", t.get(ul.key)(e)],
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
var Nc = Z("InsertHardbreak", (t) => () => (e, n) => {
  var o;
  const { selection: r, tr: i } = e;
  if (!(r instanceof Q)) return !1;
  if (r.empty) {
    const s = r.$from.node();
    if (s.childCount > 0 && ((o = s.lastChild) == null ? void 0 : o.type.name) === "hardbreak")
      return n == null || n(i.replaceRangeWith(r.to - 1, r.to, e.schema.node("paragraph")).setSelection(te.near(i.doc.resolve(r.to))).scrollIntoView()), !0;
  }
  return n == null || n(i.setMeta("hardbreak", !0).replaceSelectionWith(Dr.type(t).create()).scrollIntoView()), !0;
});
D(Nc, {
  displayName: "Command<insertHardbreakCommand>",
  group: "Hardbreak"
});
var Ic = wt("hardbreakKeymap", { InsertHardbreak: {
  shortcuts: "Shift-Enter",
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(Nc.key);
  }
} });
D(Ic.ctx, {
  displayName: "KeymapCtx<hardbreak>",
  group: "Hardbreak"
});
D(Ic.shortcuts, {
  displayName: "Keymap<hardbreak>",
  group: "Hardbreak"
});
var Ac = qt("hr");
D(Ac, {
  displayName: "Attr<hr>",
  group: "Hr"
});
var hs = Ie("hr", (t) => ({
  group: "block",
  parseDOM: [{ tag: "hr" }],
  toDOM: (e) => ["hr", t.get(Ac.key)(e)],
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
var Fg = bt((t) => new Nt(/^(?:---|___\s|\*\*\*\s)$/, (e, n, r, i) => {
  const { tr: o } = e;
  return n[0] && o.replaceWith(r - 1, i, hs.type(t).create()), o;
}));
D(Fg, {
  displayName: "InputRule<insertHrInputRule>",
  group: "Hr"
});
var $g = Z("InsertHr", (t) => () => (e, n) => {
  if (!n) return !0;
  const r = Zt.node.type(t).create(), { tr: i, selection: o } = e, { from: s } = o, l = hs.type(t).create();
  if (!l) return !0;
  const a = i.replaceSelectionWith(l).insert(s, r), u = te.findFrom(a.doc.resolve(s), 1, !0);
  return u && n(a.setSelection(u).scrollIntoView()), !0;
});
D($g, {
  displayName: "Command<insertHrCommand>",
  group: "Hr"
});
var Ec = qt("bulletList");
D(Ec, {
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
      if (!(e instanceof HTMLElement)) throw en(e);
      return { spread: e.dataset.spread === "true" };
    }
  }],
  toDOM: (e) => [
    "ul",
    {
      ...t.get(Ec.key)(e),
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
var _g = bt((t) => Ku(/^\s*([-+*])\s$/, qi.type(t)));
D(_g, {
  displayName: "InputRule<wrapInBulletListInputRule>",
  group: "BulletList"
});
var Oc = Z("WrapInBulletList", (t) => () => qu(qi.type(t)));
D(Oc, {
  displayName: "Command<wrapInBulletListCommand>",
  group: "BulletList"
});
var Dc = wt("bulletListKeymap", { WrapInBulletList: {
  shortcuts: "Mod-Alt-8",
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(Oc.key);
  }
} });
D(Dc.ctx, {
  displayName: "KeymapCtx<bulletListKeymap>",
  group: "BulletList"
});
D(Dc.shortcuts, {
  displayName: "Keymap<bulletListKeymap>",
  group: "BulletList"
});
var Rc = qt("orderedList");
D(Rc, {
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
      if (!(e instanceof HTMLElement)) throw en(e);
      return {
        spread: e.dataset.spread,
        order: e.hasAttribute("start") ? Number(e.getAttribute("start")) : 1
      };
    }
  }],
  toDOM: (e) => [
    "ol",
    {
      ...t.get(Rc.key)(e),
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
var Vg = bt((t) => Ku(/^\s*(\d+)\.\s$/, Ki.type(t), (e) => ({ order: Number(e[1]) }), (e, n) => n.childCount + n.attrs.order === Number(e[1])));
D(Vg, {
  displayName: "InputRule<wrapInOrderedListInputRule>",
  group: "OrderedList"
});
var Lc = Z("WrapInOrderedList", (t) => () => qu(Ki.type(t)));
D(Lc, {
  displayName: "Command<wrapInOrderedListCommand>",
  group: "OrderedList"
});
var Pc = wt("orderedListKeymap", { WrapInOrderedList: {
  shortcuts: "Mod-Alt-7",
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(Lc.key);
  }
} });
D(Pc.ctx, {
  displayName: "KeymapCtx<orderedList>",
  group: "OrderedList"
});
D(Pc.shortcuts, {
  displayName: "Keymap<orderedList>",
  group: "OrderedList"
});
var zc = qt("listItem");
D(zc, {
  displayName: "Attr<listItem>",
  group: "ListItem"
});
var An = Ie("list_item", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw en(e);
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
      ...t.get(zc.key)(e),
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
D(An.node, {
  displayName: "NodeSchema<listItem>",
  group: "ListItem"
});
D(An.ctx, {
  displayName: "NodeSchemaCtx<listItem>",
  group: "ListItem"
});
var Bc = Z("SinkListItem", (t) => () => mv(An.type(t)));
D(Bc, {
  displayName: "Command<sinkListItemCommand>",
  group: "ListItem"
});
var Fc = Z("LiftListItem", (t) => () => vg(An.type(t)));
D(Fc, {
  displayName: "Command<liftListItemCommand>",
  group: "ListItem"
});
var $c = Z("SplitListItem", (t) => () => dv(An.type(t)));
D($c, {
  displayName: "Command<splitListItemCommand>",
  group: "ListItem"
});
function vv(t) {
  return (e, n, r) => {
    const { selection: i } = e;
    if (!(i instanceof Q)) return !1;
    const { empty: o, $from: s } = i;
    return !o || s.parentOffset !== 0 || s.node(-1).type !== An.type(t) ? !1 : ym(e, n, r);
  };
}
var _c = Z("LiftFirstListItem", (t) => () => vv(t));
D(_c, {
  displayName: "Command<liftFirstListItemCommand>",
  group: "ListItem"
});
var Vc = wt("listItemKeymap", {
  NextListItem: {
    shortcuts: "Enter",
    command: (t) => {
      const e = t.get(ge);
      return () => e.call($c.key);
    }
  },
  SinkListItem: {
    shortcuts: ["Tab", "Mod-]"],
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(Bc.key);
    }
  },
  LiftListItem: {
    shortcuts: ["Shift-Tab", "Mod-["],
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(Fc.key);
    }
  },
  LiftFirstListItem: {
    shortcuts: ["Backspace", "Delete"],
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(_c.key);
    }
  }
});
D(Vc.ctx, {
  displayName: "KeymapCtx<listItem>",
  group: "ListItem"
});
D(Vc.shortcuts, {
  displayName: "Keymap<listItem>",
  group: "ListItem"
});
var Hg = rc("text", () => ({
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
D(Hg, {
  displayName: "NodeSchema<text>",
  group: "Text"
});
var Hc = qt("html");
D(Hc, {
  displayName: "Attr<html>",
  group: "Html"
});
var jc = Ie("html", (t) => ({
  atom: !0,
  group: "inline",
  inline: !0,
  attrs: { value: {
    default: "",
    validate: "string"
  } },
  toDOM: (e) => {
    const n = document.createElement("span"), r = {
      ...t.get(Hc.key)(e),
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
D(jc.node, {
  displayName: "NodeSchema<html>",
  group: "Html"
});
D(jc.ctx, {
  displayName: "NodeSchemaCtx<html>",
  group: "Html"
});
var Mv = [
  Dg,
  pc,
  Zt,
  El,
  yc,
  qr,
  ul,
  Dr,
  wc,
  fs,
  Sc,
  ds,
  Ac,
  hs,
  Tc,
  Wi,
  Ec,
  qi,
  Rc,
  Ki,
  zc,
  An,
  ic,
  ji,
  lc,
  cs,
  cc,
  Yn,
  hc,
  ui,
  Hc,
  jc,
  Hg
].flat(), Tv = [
  Lg,
  _g,
  Vg,
  Pg,
  Fg,
  Rg
].flat(), Nv = [], Iv = Z("IsMarkSelected", () => (t) => (e) => {
  if (!t) return !1;
  const { doc: n, selection: r } = e;
  return n.rangeHasMark(r.from, r.to, t);
}), Av = Z("IsNoteSelected", () => (t) => (e) => t ? iC(e, t).hasNode : !1), Ev = Z("ClearTextInCurrentBlock", () => () => (t, e) => {
  let n = t.tr;
  const { $from: r, $to: i } = n.selection, { pos: o } = r, { pos: s } = i, l = o - r.node().content.size;
  return l < 0 ? !1 : (n = n.deleteRange(l, s), e == null || e(n), !0);
}), Ov = Z("SetBlockType", () => (t) => (e, n) => {
  const { nodeType: r, attrs: i = null } = t ?? {};
  if (!r) return !1;
  const o = e.tr, { from: s, to: l } = o.selection;
  try {
    o.setBlockType(s, l, r, i);
  } catch {
    return !1;
  }
  return n == null || n(o), !0;
}), Dv = Z("WrapInBlockType", () => (t) => (e, n) => {
  const { nodeType: r, attrs: i = null } = t ?? {};
  if (!r) return !1;
  let o = e.tr;
  try {
    const { $from: s, $to: l } = o.selection, a = s.blockRange(l), u = a && _u(a, r, i);
    if (!u) return !1;
    o = o.wrap(a, u);
  } catch {
    return !1;
  }
  return n == null || n(o), !0;
}), Rv = Z("AddBlockType", () => (t) => (e, n) => {
  const { nodeType: r, attrs: i = null } = t ?? {};
  if (!r) return !1;
  const o = e.tr;
  try {
    const s = r instanceof Sn ? r : r.createAndFill(i);
    if (!s) return !1;
    o.replaceSelectionWith(s);
  } catch {
    return !1;
  }
  return n == null || n(o), !0;
}), Lv = Z("SelectTextNearPos", () => (t) => (e, n) => {
  const { pos: r } = t ?? {};
  if (r == null) return !1;
  const i = (s, l, a) => Math.min(Math.max(s, l), a), o = e.tr;
  try {
    const s = e.doc.resolve(i(r, 0, e.doc.content.size));
    o.setSelection(Q.near(s));
  } catch {
    return !1;
  }
  return n == null || n(o.scrollIntoView()), !0;
}), Pv = [
  mc,
  xc,
  _n,
  kc,
  vc,
  Nc,
  $g,
  zg,
  Bg,
  Lc,
  Oc,
  Bc,
  $c,
  Fc,
  _c,
  oc,
  fc,
  ac,
  Eg,
  Og,
  Iv,
  Av,
  Ev,
  Ov,
  Dv,
  Rv,
  Lv
], zv = [
  Cc,
  Mc,
  Ic,
  bc,
  Vc,
  Pc,
  Dc,
  gc,
  sc,
  dc,
  uc
].flat(), Wc = rn("remarkAddOrderInList", () => () => (t) => {
  $i(t, "list", (e) => {
    if (e.ordered) {
      const n = e.start ?? 1;
      e.children.forEach((r, i) => {
        r.label = i + n;
      });
    }
  });
});
D(Wc.plugin, {
  displayName: "Remark<remarkAddOrderInListPlugin>",
  group: "Remark"
});
D(Wc.options, {
  displayName: "RemarkConfig<remarkAddOrderInListPlugin>",
  group: "Remark"
});
var qc = rn("remarkLineBreak", () => () => (t) => {
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
D(qc.plugin, {
  displayName: "Remark<remarkLineBreak>",
  group: "Remark"
});
D(qc.options, {
  displayName: "RemarkConfig<remarkLineBreak>",
  group: "Remark"
});
var Kc = rn("remarkInlineLink", () => yv);
D(Kc.plugin, {
  displayName: "Remark<remarkInlineLinkPlugin>",
  group: "Remark"
});
D(Kc.options, {
  displayName: "RemarkConfig<remarkInlineLinkPlugin>",
  group: "Remark"
});
var Bv = (t) => !!t.children, Fv = (t) => t.type === "html";
function $v(t, e) {
  return n(t, 0, null)[0];
  function n(r, i, o) {
    if (Bv(r)) {
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
var _v = [
  "root",
  "blockquote",
  "listItem"
], Uc = rn("remarkHTMLTransformer", () => () => (t) => {
  $v(t, (e, n, r) => Fv(e) ? (r && _v.includes(r.type) && (e.children = [{ ...e }], delete e.value, e.type = "paragraph"), [e]) : [e]);
});
D(Uc.plugin, {
  displayName: "Remark<remarkHtmlTransformer>",
  group: "Remark"
});
D(Uc.options, {
  displayName: "RemarkConfig<remarkHtmlTransformer>",
  group: "Remark"
});
var Jc = rn("remarkMarker", () => () => (t, e) => {
  const n = (r) => e.value.charAt(r.position.start.offset);
  $i(t, (r) => ["strong", "emphasis"].includes(r.type), (r) => {
    r.marker = n(r);
  });
});
D(Jc.plugin, {
  displayName: "Remark<remarkMarker>",
  group: "Remark"
});
D(Jc.options, {
  displayName: "RemarkConfig<remarkMarker>",
  group: "Remark"
});
var jg = nn(() => {
  let t = !1;
  const e = new je({
    key: new nt("MILKDOWN_INLINE_NODES_CURSOR"),
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
          const r = n.selection.$from.pos, i = document.createElement("span"), o = Je.widget(r, i, { side: -1 }), s = document.createElement("span"), l = Je.widget(r, s);
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
D(jg, {
  displayName: "Prose<inlineNodesCursorPlugin>",
  group: "Prose"
});
var Wg = nn((t) => new je({
  key: new nt("MILKDOWN_HARDBREAK_MARKS"),
  appendTransaction: (e, n, r) => {
    if (!e.length) return;
    const [i] = e;
    if (!i) return;
    const [o] = i.steps;
    if (i.getMeta("hardbreak")) {
      if (!(o instanceof De)) return;
      const { from: s } = o;
      return r.tr.setNodeMarkup(s, Dr.type(t), void 0, []);
    }
    if (o instanceof wn) {
      let s = r.tr;
      const { from: l, to: a } = o;
      return r.doc.nodesBetween(l, a, (u, c) => {
        u.type === Dr.type(t) && (s = s.setNodeMarkup(c, Dr.type(t), void 0, []));
      }), s;
    }
  }
}));
D(Wg, {
  displayName: "Prose<hardbreakClearMarkPlugin>",
  group: "Prose"
});
var Gc = In(["table", "code_block"], "hardbreakFilterNodes");
D(Gc, {
  displayName: "Ctx<hardbreakFilterNodes>",
  group: "Prose"
});
var qg = nn((t) => {
  const e = t.get(Gc.key);
  return new je({
    key: new nt("MILKDOWN_HARDBREAK_FILTER"),
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
D(qg, {
  displayName: "Prose<hardbreakFilterPlugin>",
  group: "Prose"
});
var Kg = nn((t) => {
  const e = new nt("MILKDOWN_HEADING_ID"), n = (r) => {
    if (r.composing) return;
    const i = t.get(El.key), o = r.state.tr.setMeta("addToHistory", !1);
    let s = !1;
    const l = {};
    r.state.doc.descendants((a, u) => {
      if (a.type === qr.type(t)) {
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
  return new je({
    key: e,
    view: (r) => (n(r), { update: (i, o) => {
      i.state.doc.eq(o.doc) || n(i);
    } })
  });
});
D(Kg, {
  displayName: "Prose<syncHeadingIdPlugin>",
  group: "Prose"
});
var Ug = nn((t) => {
  const e = (n, r, i) => {
    if (!i.selection || n.some((f) => f.getMeta("addToHistory") === !1 || !f.isGeneric)) return null;
    const o = Ki.type(t), s = qi.type(t), l = An.type(t), a = (f, d, h = 1) => {
      let p = !1;
      const k = `${d + h}.`;
      return f.label !== k && (f.label = k, p = !0), p;
    };
    let u = i.tr, c = !1;
    return i.doc.descendants((f, d, h, p) => {
      if (f.type === s) {
        const k = f.maybeChild(0);
        (k == null ? void 0 : k.type) === l && k.attrs.listType === "ordered" && (c = !0, u.setNodeMarkup(d, o, { spread: "true" }), f.descendants((b, w, L, O) => {
          if (b.type === l) {
            const W = { ...b.attrs };
            a(W, O) && (u = u.setNodeMarkup(w, void 0, W));
          }
          return !1;
        }));
      } else if (f.type === l && (h == null ? void 0 : h.type) === o) {
        const k = { ...f.attrs };
        let b = !1;
        k.listType !== "ordered" && (k.listType = "ordered", b = !0), h != null && h.maybeChild(0) && (b = a(k, p, (h == null ? void 0 : h.attrs.order) ?? 1)), b && (u = u.setNodeMarkup(d, void 0, k), c = !0);
      }
    }), c ? u.setMeta("addToHistory", !1) : null;
  };
  return new je({
    key: new nt("MILKDOWN_KEEP_LIST_ORDER"),
    appendTransaction: e
  });
});
D(Ug, {
  displayName: "Prose<syncListOrderPlugin>",
  group: "Prose"
});
var Vv = [
  Wg,
  Gc,
  qg,
  jg,
  Wc,
  Kc,
  qc,
  Uc,
  Jc,
  Al,
  Kg,
  Ug
].flat(), Hv = [
  Mv,
  Tv,
  Nv,
  Pv,
  zv,
  Vv
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
var ke = class {
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
    return gu(t) || yu(t, jv(t));
  }
};
function jv(t) {
  if (t.type.spec.tableRole != "table") throw new RangeError("Not a table node: " + t.type.name);
  const e = Wv(t), n = t.childCount, r = [];
  let i = 0, o = null;
  const s = [];
  for (let u = 0, c = e * n; u < c; u++) r[u] = 0;
  for (let u = 0, c = 0; u < n; u++) {
    const f = t.child(u);
    c++;
    for (let p = 0; ; p++) {
      for (; i < r.length && r[i] != 0; ) i++;
      if (p == f.childCount) break;
      const k = f.child(p), { colspan: b, rowspan: w, colwidth: L } = k.attrs;
      for (let O = 0; O < w; O++) {
        if (O + u >= n) {
          (o || (o = [])).push({
            type: "overlong_rowspan",
            pos: c,
            n: w - O
          });
          break;
        }
        const W = i + O * e;
        for (let j = 0; j < b; j++) {
          r[W + j] == 0 ? r[W + j] = c : (o || (o = [])).push({
            type: "collision",
            row: u,
            pos: c,
            n: b - j
          });
          const T = L && L[j];
          if (T) {
            const F = (W + j) % e * 2, U = s[F];
            U == null || U != T && s[F + 1] == 1 ? (s[F] = T, s[F + 1] = 1) : U == T && s[F + 1]++;
          }
        }
      }
      i += b, c += k.nodeSize;
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
  const l = new ke(e, n, r, o);
  let a = !1;
  for (let u = 0; !a && u < s.length; u += 2) s[u] != null && s[u + 1] < n && (a = !0);
  return a && qv(l, s, t), l;
}
function Wv(t) {
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
function qv(t, e, n) {
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
      c != null && (!a.colwidth || a.colwidth[u] != c) && ((l || (l = Kv(a)))[u] = c);
    }
    l && t.problems.unshift({
      type: "colwidth mismatch",
      pos: o,
      colwidth: l
    });
  }
}
function Kv(t) {
  if (t.colwidth) return t.colwidth.slice();
  const e = [];
  for (let n = 0; n < t.colspan; n++) e.push(0);
  return e;
}
function ph(t, e) {
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
function mh(t, e) {
  const n = {};
  t.attrs.colspan != 1 && (n.colspan = t.attrs.colspan), t.attrs.rowspan != 1 && (n.rowspan = t.attrs.rowspan), t.attrs.colwidth && (n["data-colwidth"] = t.attrs.colwidth.join(","));
  for (const r in e) {
    const i = e[r].setDOMAttr;
    i && i(t.attrs[r], n);
  }
  return n;
}
function Uv(t) {
  if (t !== null) {
    if (!Array.isArray(t)) throw new TypeError("colwidth must be null or an array");
    for (const e of t) if (typeof e != "number") throw new TypeError("colwidth must be null or an array of numbers");
  }
}
function Jv(t) {
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
      validate: Uv
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
        getAttrs: (r) => ph(r, e)
      }],
      toDOM(r) {
        return [
          "td",
          mh(r, e),
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
        getAttrs: (r) => ph(r, e)
      }],
      toDOM(r) {
        return [
          "th",
          mh(r, e),
          0
        ];
      }
    }
  };
}
function lt(t) {
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
const jn = new nt("selectingCells");
function Pi(t) {
  for (let e = t.depth - 1; e > 0; e--) if (t.node(e).type.spec.tableRole == "row") return t.node(0).resolve(t.before(e + 1));
  return null;
}
function Ve(t) {
  const e = t.selection.$head;
  for (let n = e.depth; n > 0; n--) if (e.node(n).type.spec.tableRole == "row") return !0;
  return !1;
}
function Ol(t) {
  const e = t.selection;
  if ("$anchorCell" in e && e.$anchorCell) return e.$anchorCell.pos > e.$headCell.pos ? e.$anchorCell : e.$headCell;
  if ("node" in e && e.node && e.node.type.spec.tableRole == "cell") return e.$anchor;
  const n = Pi(e.$head) || Gv(e.$head);
  if (n) return n;
  throw new RangeError(`No cell found around position ${e.head}`);
}
function Gv(t) {
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
function Yv(t) {
  return t.node(0).resolve(t.pos + t.nodeAfter.nodeSize);
}
function Yc(t, e) {
  return t.depth == e.depth && t.pos >= e.start(-1) && t.pos <= e.end(-1);
}
function Jg(t, e, n) {
  const r = t.node(-1), i = ke.get(r), o = t.start(-1), s = i.nextCell(t.pos - o, e, n);
  return s == null ? null : t.node(0).resolve(o + s);
}
function jr(t, e, n = 1) {
  const r = {
    ...t,
    colspan: t.colspan - n
  };
  return r.colwidth && (r.colwidth = r.colwidth.slice(), r.colwidth.splice(e, n), r.colwidth.some((i) => i > 0) || (r.colwidth = null)), r;
}
function Qv(t, e, n = 1) {
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
function Xv(t, e, n) {
  const r = lt(e.type.schema).header_cell;
  for (let i = 0; i < t.height; i++) if (e.nodeAt(t.map[n + i * t.width]).type != r) return !1;
  return !0;
}
var Se = class fn extends te {
  constructor(e, n = e) {
    const r = e.node(-1), i = ke.get(r), o = e.start(-1), s = i.rectBetween(e.pos - o, n.pos - o), l = e.node(0), a = i.cellsInRect(s).filter((c) => c != n.pos - o);
    a.unshift(n.pos - o);
    const u = a.map((c) => {
      const f = r.nodeAt(c);
      if (!f) throw new RangeError(`No cell with offset ${c} found`);
      const d = o + c + 1;
      return new hm(l.resolve(d), l.resolve(d + f.content.size));
    });
    super(u[0].$from, u[0].$to, u), this.$anchorCell = e, this.$headCell = n;
  }
  map(e, n) {
    const r = e.resolve(n.map(this.$anchorCell.pos)), i = e.resolve(n.map(this.$headCell.pos));
    if (ku(r) && ku(i) && Yc(r, i)) {
      const o = this.$anchorCell.node(-1) != r.node(-1);
      return o && this.isRowSelection() ? fn.rowSelection(r, i) : o && this.isColSelection() ? fn.colSelection(r, i) : new fn(r, i);
    }
    return Q.between(r, i);
  }
  content() {
    const e = this.$anchorCell.node(-1), n = ke.get(e), r = this.$anchorCell.start(-1), i = n.rectBetween(this.$anchorCell.pos - r, this.$headCell.pos - r), o = {}, s = [];
    for (let a = i.top; a < i.bottom; a++) {
      const u = [];
      for (let c = a * n.width + i.left, f = i.left; f < i.right; f++, c++) {
        const d = n.map[c];
        if (o[d]) continue;
        o[d] = !0;
        const h = n.findCell(d);
        let p = e.nodeAt(d);
        if (!p) throw new RangeError(`No cell with offset ${d} found`);
        const k = i.left - h.left, b = h.right - i.right;
        if (k > 0 || b > 0) {
          let w = p.attrs;
          if (k > 0 && (w = jr(w, 0, k)), b > 0 && (w = jr(w, w.colspan - b, b)), h.left < i.left) {
            if (p = p.type.createAndFill(w), !p) throw new RangeError(`Could not create cell with attrs ${JSON.stringify(w)}`);
          } else p = p.type.create(w, p.content);
        }
        if (h.top < i.top || h.bottom > i.bottom) {
          const w = {
            ...p.attrs,
            rowspan: Math.min(h.bottom, i.bottom) - Math.max(h.top, i.top)
          };
          h.top < i.top ? p = p.type.createAndFill(w) : p = p.type.create(w, p.content);
        }
        u.push(p);
      }
      s.push(e.child(a).copy(R.from(u)));
    }
    const l = this.isColSelection() && this.isRowSelection() ? e : s;
    return new V(R.from(l), 1, 1);
  }
  replace(e, n = V.empty) {
    const r = e.steps.length, i = this.ranges;
    for (let s = 0; s < i.length; s++) {
      const { $from: l, $to: a } = i[s], u = e.mapping.slice(r);
      e.replace(u.map(l.pos), u.map(a.pos), s ? V.empty : n);
    }
    const o = te.findFrom(e.doc.resolve(e.mapping.slice(r).map(this.to)), -1);
    o && e.setSelection(o);
  }
  replaceWith(e, n) {
    this.replace(e, new V(R.from(n), 0, 0));
  }
  forEachCell(e) {
    const n = this.$anchorCell.node(-1), r = ke.get(n), i = this.$anchorCell.start(-1), o = r.cellsInRect(r.rectBetween(this.$anchorCell.pos - i, this.$headCell.pos - i));
    for (let s = 0; s < o.length; s++) e(n.nodeAt(o[s]), i + o[s]);
  }
  isColSelection() {
    const e = this.$anchorCell.index(-1), n = this.$headCell.index(-1);
    if (Math.min(e, n) > 0) return !1;
    const r = e + this.$anchorCell.nodeAfter.attrs.rowspan, i = n + this.$headCell.nodeAfter.attrs.rowspan;
    return Math.max(r, i) == this.$headCell.node(-1).childCount;
  }
  static colSelection(e, n = e) {
    const r = e.node(-1), i = ke.get(r), o = e.start(-1), s = i.findCell(e.pos - o), l = i.findCell(n.pos - o), a = e.node(0);
    return s.top <= l.top ? (s.top > 0 && (e = a.resolve(o + i.map[s.left])), l.bottom < i.height && (n = a.resolve(o + i.map[i.width * (i.height - 1) + l.right - 1]))) : (l.top > 0 && (n = a.resolve(o + i.map[l.left])), s.bottom < i.height && (e = a.resolve(o + i.map[i.width * (i.height - 1) + s.right - 1]))), new fn(e, n);
  }
  isRowSelection() {
    const e = this.$anchorCell.node(-1), n = ke.get(e), r = this.$anchorCell.start(-1), i = n.colCount(this.$anchorCell.pos - r), o = n.colCount(this.$headCell.pos - r);
    if (Math.min(i, o) > 0) return !1;
    const s = i + this.$anchorCell.nodeAfter.attrs.colspan, l = o + this.$headCell.nodeAfter.attrs.colspan;
    return Math.max(s, l) == n.width;
  }
  eq(e) {
    return e instanceof fn && e.$anchorCell.pos == this.$anchorCell.pos && e.$headCell.pos == this.$headCell.pos;
  }
  static rowSelection(e, n = e) {
    const r = e.node(-1), i = ke.get(r), o = e.start(-1), s = i.findCell(e.pos - o), l = i.findCell(n.pos - o), a = e.node(0);
    return s.left <= l.left ? (s.left > 0 && (e = a.resolve(o + i.map[s.top * i.width])), l.right < i.width && (n = a.resolve(o + i.map[i.width * (l.top + 1) - 1]))) : (l.left > 0 && (n = a.resolve(o + i.map[l.top * i.width])), s.right < i.width && (e = a.resolve(o + i.map[i.width * (s.top + 1) - 1]))), new fn(e, n);
  }
  toJSON() {
    return {
      type: "cell",
      anchor: this.$anchorCell.pos,
      head: this.$headCell.pos
    };
  }
  static fromJSON(e, n) {
    return new fn(e.resolve(n.anchor), e.resolve(n.head));
  }
  static create(e, n, r = n) {
    return new fn(e.resolve(n), e.resolve(r));
  }
  getBookmark() {
    return new Zv(this.$anchorCell.pos, this.$headCell.pos);
  }
};
Se.prototype.visible = !1;
te.jsonID("cell", Se);
var Zv = class Gg {
  constructor(e, n) {
    this.anchor = e, this.head = n;
  }
  map(e) {
    return new Gg(e.map(this.anchor), e.map(this.head));
  }
  resolve(e) {
    const n = e.resolve(this.anchor), r = e.resolve(this.head);
    return n.parent.type.spec.tableRole == "row" && r.parent.type.spec.tableRole == "row" && n.index() < n.parent.childCount && r.index() < r.parent.childCount && Yc(n, r) ? new Se(n, r) : te.near(r, 1);
  }
};
function eM(t) {
  if (!(t.selection instanceof Se)) return null;
  const e = [];
  return t.selection.forEachCell((n, r) => {
    e.push(Je.node(r, r + n.nodeSize, { class: "selectedCell" }));
  }), Me.create(t.doc, e);
}
function tM({ $from: t, $to: e }) {
  if (t.pos == e.pos || t.pos < e.pos - 6) return !1;
  let n = t.pos, r = e.pos, i = t.depth;
  for (; i >= 0 && !(t.after(i + 1) < t.end(i)); i--, n++) ;
  for (let o = e.depth; o >= 0 && !(e.before(o + 1) > e.start(o)); o--, r--) ;
  return n == r && /row|table/.test(t.node(i).type.spec.tableRole);
}
function nM({ $from: t, $to: e }) {
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
function rM(t, e, n) {
  const r = (e || t).selection, i = (e || t).doc;
  let o, s;
  if (r instanceof X && (s = r.node.type.spec.tableRole)) {
    if (s == "cell" || s == "header_cell") o = Se.create(i, r.from);
    else if (s == "row") {
      const l = i.resolve(r.from + 1);
      o = Se.rowSelection(l, l);
    } else if (!n) {
      const l = ke.get(r.node), a = r.from + 1, u = a + l.map[l.width * l.height - 1];
      o = Se.create(i, a + 1, u);
    }
  } else r instanceof Q && tM(r) ? o = Q.create(i, r.from) : r instanceof Q && nM(r) && (o = Q.create(i, r.$from.start(), r.$from.end()));
  return o && (e || (e = t.tr)).setSelection(o), e;
}
const iM = new nt("fix-tables");
function Yg(t, e, n, r) {
  const i = t.childCount, o = e.childCount;
  e: for (let s = 0, l = 0; s < o; s++) {
    const a = e.child(s);
    for (let u = l, c = Math.min(i, s + 3); u < c; u++) if (t.child(u) == a) {
      l = u + 1, n += a.nodeSize;
      continue e;
    }
    r(a, n), l < i && t.child(l).sameMarkup(a) ? Yg(t.child(l), a, n + 1, r) : a.nodesBetween(0, a.content.size, r, n + 1), n += a.nodeSize;
  }
}
function oM(t, e) {
  let n;
  const r = (i, o) => {
    i.type.spec.tableRole == "table" && (n = sM(t, i, o, n));
  };
  return e ? e.doc != t.doc && Yg(e.doc, t.doc, 0, r) : t.doc.descendants(r), n;
}
function sM(t, e, n, r) {
  const i = ke.get(e);
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
      for (let b = 0; b < d; b++) {
        const w = lt(t.schema)[h].createAndFill();
        w && p.push(w);
      }
      const k = (a == 0 || s == a - 1) && l == a ? u + 1 : f - 1;
      r.insert(r.mapping.map(k), p);
    }
    u = f;
  }
  return r.setMeta(iM, { fixTables: !0 });
}
function Qg(t) {
  const e = ke.get(t), n = [], r = e.height, i = e.width;
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
function Xg(t, e) {
  const n = [], r = ke.get(t), i = r.height, o = r.width;
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
function Zg(t, e, n, r) {
  const i = e[0] > n[0] ? -1 : 1, o = t.splice(e[0], e.length), s = o.length % 2 === 0 ? 1 : 0;
  let l;
  return l = i === -1 ? n[0] : n[n.length - 1] - s, t.splice(l, 0, ...o), t;
}
function ps(t) {
  return lM((e) => e.type.spec.tableRole === "table", t);
}
function lM(t, e) {
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
function ti(t, e) {
  const n = ps(e.$from);
  if (!n) return;
  const r = ke.get(n.node);
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
function ni(t, e) {
  const n = ps(e.$from);
  if (!n) return;
  const r = ke.get(n.node);
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
function gh(t, e, n = e) {
  let r = e, i = n;
  for (let c = e; c >= 0; c--) {
    const f = ti(c, t.selection);
    f && f.forEach((d) => {
      const h = d.node.attrs.colspan + c - 1;
      h >= r && (r = c), h > i && (i = h);
    });
  }
  for (let c = e; c <= i; c++) {
    const f = ti(c, t.selection);
    f && f.forEach((d) => {
      const h = d.node.attrs.colspan + c - 1;
      d.node.attrs.colspan > 1 && h > i && (i = h);
    });
  }
  const o = [];
  for (let c = r; c <= i; c++) {
    const f = ti(c, t.selection);
    f && f.length > 0 && o.push(c);
  }
  r = o[0], i = o[o.length - 1];
  const s = ti(r, t.selection), l = ni(0, t.selection);
  if (!s || !l) return;
  const a = t.doc.resolve(s[s.length - 1].pos);
  let u;
  for (let c = i; c >= r; c--) {
    const f = ti(c, t.selection);
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
function yh(t, e, n = e) {
  let r = e, i = n;
  for (let c = e; c >= 0; c--) {
    const f = ni(c, t.selection);
    f && f.forEach((d) => {
      const h = d.node.attrs.rowspan + c - 1;
      h >= r && (r = c), h > i && (i = h);
    });
  }
  for (let c = e; c <= i; c++) {
    const f = ni(c, t.selection);
    f && f.forEach((d) => {
      const h = d.node.attrs.rowspan + c - 1;
      d.node.attrs.rowspan > 1 && h > i && (i = h);
    });
  }
  const o = [];
  for (let c = r; c <= i; c++) {
    const f = ni(c, t.selection);
    f && f.length > 0 && o.push(c);
  }
  r = o[0], i = o[o.length - 1];
  const s = ni(r, t.selection), l = ti(0, t.selection);
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
function kh(t) {
  return t[0].map((e, n) => t.map((r) => r[n]));
}
function aM(t) {
  var e, n;
  const { tr: r, originIndex: i, targetIndex: o, select: s, pos: l } = t, a = ps(r.doc.resolve(l));
  if (!a) return !1;
  const u = (e = gh(r, i)) === null || e === void 0 ? void 0 : e.indexes, c = (n = gh(r, o)) === null || n === void 0 ? void 0 : n.indexes;
  if (!u || !c || u.includes(o)) return !1;
  const f = uM(a.node, u, c);
  if (r.replaceWith(a.pos, a.pos + a.node.nodeSize, f), !s) return !0;
  const d = ke.get(f), h = a.start, p = o, k = d.positionAt(d.height - 1, p, f), b = r.doc.resolve(h + k), w = d.positionAt(0, p, f), L = r.doc.resolve(h + w);
  return r.setSelection(Se.colSelection(b, L)), !0;
}
function uM(t, e, n, r) {
  let i = kh(Qg(t));
  return i = Zg(i, e, n), i = kh(i), Xg(t, i);
}
function cM(t) {
  var e, n;
  const { tr: r, originIndex: i, targetIndex: o, select: s, pos: l } = t, a = ps(r.doc.resolve(l));
  if (!a) return !1;
  const u = (e = yh(r, i)) === null || e === void 0 ? void 0 : e.indexes, c = (n = yh(r, o)) === null || n === void 0 ? void 0 : n.indexes;
  if (!u || !c || u.includes(o)) return !1;
  const f = fM(a.node, u, c);
  if (r.replaceWith(a.pos, a.pos + a.node.nodeSize, f), !s) return !0;
  const d = ke.get(f), h = a.start, p = o, k = d.positionAt(p, d.width - 1, f), b = r.doc.resolve(h + k), w = d.positionAt(p, 0, f), L = r.doc.resolve(h + w);
  return r.setSelection(Se.rowSelection(b, L)), !0;
}
function fM(t, e, n, r) {
  let i = Qg(t);
  return i = Zg(i, e, n), Xg(t, i);
}
function on(t) {
  const e = t.selection, n = Ol(t), r = n.node(-1), i = n.start(-1), o = ke.get(r);
  return {
    ...e instanceof Se ? o.rectBetween(e.$anchorCell.pos - i, e.$headCell.pos - i) : o.findCell(n.pos - i),
    tableStart: i,
    map: o,
    table: r
  };
}
function ey(t, { map: e, tableStart: n, table: r }, i) {
  let o = i > 0 ? -1 : 0;
  Xv(e, r, i + o) && (o = i == 0 || i == e.width ? null : 0);
  for (let s = 0; s < e.height; s++) {
    const l = s * e.width + i;
    if (i > 0 && i < e.width && e.map[l - 1] == e.map[l]) {
      const a = e.map[l], u = r.nodeAt(a);
      t.setNodeMarkup(t.mapping.map(n + a), null, Qv(u.attrs, i - e.colCount(a))), s += u.attrs.rowspan - 1;
    } else {
      const a = o == null ? lt(r.type.schema).cell : r.nodeAt(e.map[l + o]).type, u = e.positionAt(s, i, r);
      t.insert(t.mapping.map(n + u), a.createAndFill());
    }
  }
  return t;
}
function ty(t, e) {
  if (!Ve(t)) return !1;
  if (e) {
    const n = on(t);
    e(ey(t.tr, n, n.left));
  }
  return !0;
}
function ny(t, e) {
  if (!Ve(t)) return !1;
  if (e) {
    const n = on(t);
    e(ey(t.tr, n, n.right));
  }
  return !0;
}
function dM(t, { map: e, table: n, tableStart: r }, i) {
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
function ry(t, e) {
  if (!Ve(t)) return !1;
  if (e) {
    const n = on(t), r = t.tr;
    if (n.left == 0 && n.right == n.map.width) return !1;
    for (let i = n.right - 1; dM(r, n, i), i != n.left; i--) {
      const o = n.tableStart ? r.doc.nodeAt(n.tableStart - 1) : r.doc;
      if (!o) throw new RangeError("No table found");
      n.table = o, n.map = ke.get(o);
    }
    e(r);
  }
  return !0;
}
function hM(t, e, n) {
  var r;
  const i = lt(e.type.schema).header_cell;
  for (let o = 0; o < t.width; o++) if (((r = e.nodeAt(t.map[o + n * t.width])) === null || r === void 0 ? void 0 : r.type) != i) return !1;
  return !0;
}
function iy(t, { map: e, tableStart: n, table: r }, i) {
  let o = n;
  for (let u = 0; u < i; u++) o += r.child(u).nodeSize;
  const s = [];
  let l = i > 0 ? -1 : 0;
  hM(e, r, i + l) && (l = i == 0 || i == e.height ? null : 0);
  for (let u = 0, c = e.width * i; u < e.width; u++, c++) if (i > 0 && i < e.height && e.map[c] == e.map[c - e.width]) {
    const f = e.map[c], d = r.nodeAt(f).attrs;
    t.setNodeMarkup(n + f, null, {
      ...d,
      rowspan: d.rowspan + 1
    }), u += d.colspan - 1;
  } else {
    var a;
    const f = l == null ? lt(r.type.schema).cell : (a = r.nodeAt(e.map[c + l * e.width])) === null || a === void 0 ? void 0 : a.type, d = f == null ? void 0 : f.createAndFill();
    d && s.push(d);
  }
  return t.insert(o, lt(r.type.schema).row.create(null, s)), t;
}
function pM(t, e) {
  if (!Ve(t)) return !1;
  if (e) {
    const n = on(t);
    e(iy(t.tr, n, n.top));
  }
  return !0;
}
function mM(t, e) {
  if (!Ve(t)) return !1;
  if (e) {
    const n = on(t);
    e(iy(t.tr, n, n.bottom));
  }
  return !0;
}
function gM(t, { map: e, table: n, tableStart: r }, i) {
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
function oy(t, e) {
  if (!Ve(t)) return !1;
  if (e) {
    const n = on(t), r = t.tr;
    if (n.top == 0 && n.bottom == n.map.height) return !1;
    for (let i = n.bottom - 1; gM(r, n, i), i != n.top; i--) {
      const o = n.tableStart ? r.doc.nodeAt(n.tableStart - 1) : r.doc;
      if (!o) throw new RangeError("No table found");
      n.table = o, n.map = ke.get(n.table);
    }
    e(r);
  }
  return !0;
}
function yM(t, e) {
  return function(n, r) {
    if (!Ve(n)) return !1;
    const i = Ol(n);
    if (i.nodeAfter.attrs[t] === e) return !1;
    if (r) {
      const o = n.tr;
      n.selection instanceof Se ? n.selection.forEachCell((s, l) => {
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
function kM(t) {
  return function(e, n) {
    if (!Ve(e)) return !1;
    if (n) {
      const r = lt(e.schema), i = on(e), o = e.tr, s = i.map.cellsInRect(t == "column" ? {
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
function bh(t, e, n) {
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
function Qc(t, e) {
  return e = e || { useDeprecatedLogic: !1 }, e.useDeprecatedLogic ? kM(t) : function(n, r) {
    if (!Ve(n)) return !1;
    if (r) {
      const i = lt(n.schema), o = on(n), s = n.tr, l = bh("row", o, i), a = bh("column", o, i), u = (t === "column" ? l : t === "row" && a) ? 1 : 0, c = t == "column" ? {
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
Qc("row", { useDeprecatedLogic: !0 });
Qc("column", { useDeprecatedLogic: !0 });
Qc("cell", { useDeprecatedLogic: !0 });
function bM(t, e) {
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
function sy(t) {
  return function(e, n) {
    if (!Ve(e)) return !1;
    const r = bM(Ol(e), t);
    if (r == null) return !1;
    if (n) {
      const i = e.doc.resolve(r);
      n(e.tr.setSelection(Q.between(i, Yv(i))).scrollIntoView());
    }
    return !0;
  };
}
function wM(t, e) {
  const n = t.selection.$anchor;
  for (let r = n.depth; r > 0; r--) if (n.node(r).type.spec.tableRole == "table")
    return e && e(t.tr.delete(n.before(r), n.after(r)).scrollIntoView()), !0;
  return !1;
}
function As(t, e) {
  const n = t.selection;
  if (!(n instanceof Se)) return !1;
  if (e) {
    const r = t.tr, i = lt(t.schema).cell.createAndFill().content;
    n.forEachCell((o, s) => {
      o.content.eq(i) || r.replace(r.mapping.map(s + 1), r.mapping.map(s + o.nodeSize - 1), new V(i, 0, 0));
    }), r.docChanged && e(r);
  }
  return !0;
}
function xM(t) {
  return (e, n) => {
    const { from: r, to: i, select: o = !0, pos: s = e.selection.from } = t, l = e.tr;
    return cM({
      tr: l,
      originIndex: r,
      targetIndex: i,
      select: o,
      pos: s
    }) ? (n == null || n(l), !0) : !1;
  };
}
function CM(t) {
  return (e, n) => {
    const { from: r, to: i, select: o = !0, pos: s = e.selection.from } = t, l = e.tr;
    return aM({
      tr: l,
      originIndex: r,
      targetIndex: i,
      select: o,
      pos: s
    }) ? (n == null || n(l), !0) : !1;
  };
}
function SM(t) {
  if (t.size === 0) return null;
  let { content: e, openStart: n, openEnd: r } = t;
  for (; e.childCount == 1 && (n > 0 && r > 0 || e.child(0).type.spec.tableRole == "table"); )
    n--, r--, e = e.child(0).content;
  const i = e.child(0), o = i.type.spec.tableRole, s = i.type.schema, l = [];
  if (o == "row") for (let a = 0; a < e.childCount; a++) {
    let u = e.child(a).content;
    const c = a ? 0 : Math.max(0, n - 1), f = a < e.childCount - 1 ? 0 : Math.max(0, r - 1);
    (c || f) && (u = bu(lt(s).row, new V(u, c, f)).content), l.push(u);
  }
  else if (o == "cell" || o == "header_cell") l.push(n || r ? bu(lt(s).row, new V(e, n, r)).content : e);
  else return null;
  return vM(s, l);
}
function vM(t, e) {
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
      const o = lt(t).cell.createAndFill(), s = [];
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
  return new dm(n).replace(0, n.content.size, e).doc;
}
function MM({ width: t, height: e, rows: n }, r, i) {
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
function TM(t, e, n, r, i, o, s) {
  const l = t.doc.type.schema, a = lt(l);
  let u, c;
  if (i > e.width) for (let f = 0, d = 0; f < e.height; f++) {
    const h = n.child(f);
    d += h.nodeSize;
    const p = [];
    let k;
    h.lastChild == null || h.lastChild.type == a.cell ? k = u || (u = a.cell.createAndFill()) : k = c || (c = a.header_cell.createAndFill());
    for (let b = e.width; b < i; b++) p.push(k);
    t.insert(t.mapping.slice(s).map(d - 1 + r), p);
  }
  if (o > e.height) {
    const f = [];
    for (let p = 0, k = (e.height - 1) * e.width; p < Math.max(e.width, i); p++) {
      const b = p >= e.width ? !1 : n.nodeAt(e.map[k + p]).type == a.header_cell;
      f.push(b ? c || (c = a.header_cell.createAndFill()) : u || (u = a.cell.createAndFill()));
    }
    const d = a.row.create(null, R.from(f)), h = [];
    for (let p = e.height; p < o; p++) h.push(d);
    t.insert(t.mapping.slice(s).map(r + n.nodeSize - 2), h);
  }
  return !!(u || c);
}
function wh(t, e, n, r, i, o, s, l) {
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
function xh(t, e, n, r, i, o, s, l) {
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
function Ch(t, e, n, r, i) {
  let o = n ? t.doc.nodeAt(n - 1) : t.doc;
  if (!o) throw new Error("No table found");
  let s = ke.get(o);
  const { top: l, left: a } = r, u = a + i.width, c = l + i.height, f = t.tr;
  let d = 0;
  function h() {
    if (o = n ? f.doc.nodeAt(n - 1) : f.doc, !o) throw new Error("No table found");
    s = ke.get(o), d = f.mapping.maps.length;
  }
  TM(f, s, o, n, u, c, d) && h(), wh(f, s, o, n, a, u, l, d) && h(), wh(f, s, o, n, a, u, c, d) && h(), xh(f, s, o, n, l, c, a, d) && h(), xh(f, s, o, n, l, c, u, d) && h();
  for (let p = l; p < c; p++) {
    const k = s.positionAt(p, a, o), b = s.positionAt(p, u, o);
    f.replace(f.mapping.slice(d).map(k + n), f.mapping.slice(d).map(b + n), new V(i.rows[p - l], 0, 0));
  }
  h(), f.setSelection(new Se(f.doc.resolve(n + s.positionAt(l, a, o)), f.doc.resolve(n + s.positionAt(c - 1, u - 1, o)))), e(f);
}
const NM = Nm({
  ArrowLeft: Es("horiz", -1),
  ArrowRight: Es("horiz", 1),
  ArrowUp: Es("vert", -1),
  ArrowDown: Es("vert", 1),
  "Shift-ArrowLeft": Os("horiz", -1),
  "Shift-ArrowRight": Os("horiz", 1),
  "Shift-ArrowUp": Os("vert", -1),
  "Shift-ArrowDown": Os("vert", 1),
  Backspace: As,
  "Mod-Backspace": As,
  Delete: As,
  "Mod-Delete": As
});
function Us(t, e, n) {
  return n.eq(t.selection) ? !1 : (e && e(t.tr.setSelection(n).scrollIntoView()), !0);
}
function Es(t, e) {
  return (n, r, i) => {
    if (!i) return !1;
    const o = n.selection;
    if (o instanceof Se) return Us(n, r, te.near(o.$headCell, e));
    if (t != "horiz" && !o.empty) return !1;
    const s = ly(i, t, e);
    if (s == null) return !1;
    if (t == "horiz") return Us(n, r, te.near(n.doc.resolve(o.head + e), e));
    {
      const l = n.doc.resolve(s), a = Jg(l, t, e);
      let u;
      return a ? u = te.near(a, 1) : e < 0 ? u = te.near(n.doc.resolve(l.before(-1)), -1) : u = te.near(n.doc.resolve(l.after(-1)), 1), Us(n, r, u);
    }
  };
}
function Os(t, e) {
  return (n, r, i) => {
    if (!i) return !1;
    const o = n.selection;
    let s;
    if (o instanceof Se) s = o;
    else {
      const a = ly(i, t, e);
      if (a == null) return !1;
      s = new Se(n.doc.resolve(a));
    }
    const l = Jg(s.$headCell, t, e);
    return l ? Us(n, r, new Se(s.$anchorCell, l)) : !1;
  };
}
function IM(t, e) {
  const n = t.state.doc, r = Pi(n.resolve(e));
  return r ? (t.dispatch(t.state.tr.setSelection(new Se(r))), !0) : !1;
}
function AM(t, e, n) {
  if (!Ve(t.state)) return !1;
  let r = SM(n);
  const i = t.state.selection;
  if (i instanceof Se) {
    r || (r = {
      width: 1,
      height: 1,
      rows: [R.from(bu(lt(t.state.schema).cell, n))]
    });
    const o = i.$anchorCell.node(-1), s = i.$anchorCell.start(-1), l = ke.get(o).rectBetween(i.$anchorCell.pos - s, i.$headCell.pos - s);
    return r = MM(r, l.right - l.left, l.bottom - l.top), Ch(t.state, t.dispatch, s, l, r), !0;
  } else if (r) {
    const o = Ol(t.state), s = o.start(-1);
    return Ch(t.state, t.dispatch, s, ke.get(o.node(-1)).findCell(o.pos - s), r), !0;
  } else return !1;
}
function EM(t, e) {
  var n;
  if (e.button != 0 || e.ctrlKey || e.metaKey) return;
  const r = Sh(t, e.target);
  let i;
  if (e.shiftKey && t.state.selection instanceof Se)
    o(t.state.selection.$anchorCell, e), e.preventDefault();
  else if (e.shiftKey && r && (i = Pi(t.state.selection.$anchor)) != null && ((n = xa(t, e)) === null || n === void 0 ? void 0 : n.pos) != i.pos)
    o(i, e), e.preventDefault();
  else if (!r) return;
  function o(a, u) {
    let c = xa(t, u);
    const f = jn.getState(t.state) == null;
    if (!c || !Yc(a, c)) if (f) c = a;
    else return;
    const d = new Se(a, c);
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
    else if (Sh(t, u.target) != r && (f = xa(t, e), !f))
      return s();
    f && o(f, u);
  }
  t.root.addEventListener("mouseup", s), t.root.addEventListener("dragstart", s), t.root.addEventListener("mousemove", l);
}
function ly(t, e, n) {
  if (!(t.state.selection instanceof Q)) return null;
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
function Sh(t, e) {
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
  return r >= 0 && Pi(t.state.doc.resolve(r)) || Pi(t.state.doc.resolve(i));
}
var OM = class {
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
        const b = i == d ? o : p && p[k], w = b ? b + "px" : "";
        if (s += b || r, b || (l = !1), a)
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
const vt = new nt("tableColumnResizing");
function DM({ handleWidth: t = 5, cellMinWidth: e = 25, defaultCellMinWidth: n = 100, View: r = OM, lastColumnResizable: i = !0 } = {}) {
  const o = new je({
    key: vt,
    state: {
      init(s, l) {
        var a;
        const u = (a = o.spec) === null || a === void 0 || (a = a.props) === null || a === void 0 ? void 0 : a.nodeViews, c = lt(l.schema).table.name;
        return r && u && (u[c] = (f, d) => new r(f, n, d)), new RM(-1, !1);
      },
      apply(s, l) {
        return l.apply(s);
      }
    },
    props: {
      attributes: (s) => {
        const l = vt.getState(s);
        return l && l.activeHandle > -1 ? { class: "resize-cursor" } : {};
      },
      handleDOMEvents: {
        mousemove: (s, l) => {
          LM(s, l, t, i);
        },
        mouseleave: (s) => {
          PM(s);
        },
        mousedown: (s, l) => {
          zM(s, l, e, n);
        }
      },
      decorations: (s) => {
        const l = vt.getState(s);
        if (l && l.activeHandle > -1) return VM(s, l.activeHandle);
      },
      nodeViews: {}
    }
  });
  return o;
}
var RM = class Js {
  constructor(e, n) {
    this.activeHandle = e, this.dragging = n;
  }
  apply(e) {
    const n = this, r = e.getMeta(vt);
    if (r && r.setHandle != null) return new Js(r.setHandle, !1);
    if (r && r.setDragging !== void 0) return new Js(n.activeHandle, r.setDragging);
    if (n.activeHandle > -1 && e.docChanged) {
      let i = e.mapping.map(n.activeHandle, -1);
      return ku(e.doc.resolve(i)) || (i = -1), new Js(i, n.dragging);
    }
    return n;
  }
};
function LM(t, e, n, r) {
  if (!t.editable) return;
  const i = vt.getState(t.state);
  if (i && !i.dragging) {
    const o = FM(e.target);
    let s = -1;
    if (o) {
      const { left: l, right: a } = o.getBoundingClientRect();
      e.clientX - l <= n ? s = vh(t, e, "left", n) : a - e.clientX <= n && (s = vh(t, e, "right", n));
    }
    if (s != i.activeHandle) {
      if (!r && s !== -1) {
        const l = t.state.doc.resolve(s), a = l.node(-1), u = ke.get(a), c = l.start(-1);
        if (u.colCount(l.pos - c) + l.nodeAfter.attrs.colspan - 1 == u.width - 1) return;
      }
      ay(t, s);
    }
  }
}
function PM(t) {
  if (!t.editable) return;
  const e = vt.getState(t.state);
  e && e.activeHandle > -1 && !e.dragging && ay(t, -1);
}
function zM(t, e, n, r) {
  var i;
  if (!t.editable) return !1;
  const o = (i = t.dom.ownerDocument.defaultView) !== null && i !== void 0 ? i : window, s = vt.getState(t.state);
  if (!s || s.activeHandle == -1 || s.dragging) return !1;
  const l = t.state.doc.nodeAt(s.activeHandle), a = BM(t, s.activeHandle, l.attrs);
  t.dispatch(t.state.tr.setMeta(vt, { setDragging: {
    startX: e.clientX,
    startWidth: a
  } }));
  function u(f) {
    o.removeEventListener("mouseup", u), o.removeEventListener("mousemove", c);
    const d = vt.getState(t.state);
    d != null && d.dragging && ($M(t, d.activeHandle, Mh(d.dragging, f, n)), t.dispatch(t.state.tr.setMeta(vt, { setDragging: null })));
  }
  function c(f) {
    if (!f.which) return u(f);
    const d = vt.getState(t.state);
    if (d && d.dragging) {
      const h = Mh(d.dragging, f, n);
      Th(t, d.activeHandle, h, r);
    }
  }
  return Th(t, s.activeHandle, a, r), o.addEventListener("mouseup", u), o.addEventListener("mousemove", c), e.preventDefault(), !0;
}
function BM(t, e, { colspan: n, colwidth: r }) {
  const i = r && r[r.length - 1];
  if (i) return i;
  const o = t.domAtPos(e);
  let s = o.node.childNodes[o.offset].offsetWidth, l = n;
  if (r)
    for (let a = 0; a < n; a++) r[a] && (s -= r[a], l--);
  return s / l;
}
function FM(t) {
  for (; t && t.nodeName != "TD" && t.nodeName != "TH"; ) t = t.classList && t.classList.contains("ProseMirror") ? null : t.parentNode;
  return t;
}
function vh(t, e, n, r) {
  const i = n == "right" ? -r : r, o = t.posAtCoords({
    left: e.clientX + i,
    top: e.clientY
  });
  if (!o) return -1;
  const { pos: s } = o, l = Pi(t.state.doc.resolve(s));
  if (!l) return -1;
  if (n == "right") return l.pos;
  const a = ke.get(l.node(-1)), u = l.start(-1), c = a.map.indexOf(l.pos - u);
  return c % a.width == 0 ? -1 : u + a.map[c - 1];
}
function Mh(t, e, n) {
  const r = e.clientX - t.startX;
  return Math.max(n, t.startWidth + r);
}
function ay(t, e) {
  t.dispatch(t.state.tr.setMeta(vt, { setHandle: e }));
}
function $M(t, e, n) {
  const r = t.state.doc.resolve(e), i = r.node(-1), o = ke.get(i), s = r.start(-1), l = o.colCount(r.pos - s) + r.nodeAfter.attrs.colspan - 1, a = t.state.tr;
  for (let u = 0; u < o.height; u++) {
    const c = u * o.width + l;
    if (u && o.map[c] == o.map[c - o.width]) continue;
    const f = o.map[c], d = i.nodeAt(f).attrs, h = d.colspan == 1 ? 0 : l - o.colCount(f);
    if (d.colwidth && d.colwidth[h] == n) continue;
    const p = d.colwidth ? d.colwidth.slice() : _M(d.colspan);
    p[h] = n, a.setNodeMarkup(s + f, null, {
      ...d,
      colwidth: p
    });
  }
  a.docChanged && t.dispatch(a);
}
function Th(t, e, n, r) {
  const i = t.state.doc.resolve(e), o = i.node(-1), s = i.start(-1), l = ke.get(o).colCount(i.pos - s) + i.nodeAfter.attrs.colspan - 1;
  let a = t.domAtPos(i.start(-1)).node;
  for (; a && a.nodeName != "TABLE"; ) a = a.parentNode;
  a && wu(o, a.firstChild, a, r, l, n);
}
function _M(t) {
  return Array(t).fill(0);
}
function VM(t, e) {
  const n = [], r = t.doc.resolve(e), i = r.node(-1);
  if (!i) return Me.empty;
  const o = ke.get(i), s = r.start(-1), l = o.colCount(r.pos - s) + r.nodeAfter.attrs.colspan - 1;
  for (let u = 0; u < o.height; u++) {
    const c = l + u * o.width;
    if ((l == o.width - 1 || o.map[c] != o.map[c + 1]) && (u == 0 || o.map[c] != o.map[c - o.width])) {
      var a;
      const f = o.map[c], d = s + f + i.nodeAt(f).nodeSize - 1, h = document.createElement("div");
      h.className = "column-resize-handle", !((a = vt.getState(t)) === null || a === void 0) && a.dragging && n.push(Je.node(s + f, s + f + i.nodeAt(f).nodeSize, { class: "column-resize-dragging" })), n.push(Je.widget(d, h));
    }
  }
  return Me.create(t.doc, n);
}
function HM({ allowTableNodeSelection: t = !1 } = {}) {
  return new je({
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
      decorations: eM,
      handleDOMEvents: { mousedown: EM },
      createSelectionBetween(e) {
        return jn.getState(e.state) != null ? e.state.selection : null;
      },
      handleTripleClick: IM,
      handleKeyDown: NM,
      handlePaste: AM
    },
    appendTransaction(e, n, r) {
      return rM(r, oM(r, n), t);
    }
  });
}
var cl = typeof navigator < "u" ? navigator : null, Xc = cl && cl.userAgent || "", jM = /Edge\/(\d+)/.exec(Xc), WM = /MSIE \d/.exec(Xc), qM = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(Xc), KM = !!(WM || qM || jM), UM = !KM && !!cl && /Apple Computer/.test(cl.vendor), uy = new nt("safari-ime-span"), xu = !1, JM = {
  key: uy,
  props: {
    decorations: GM,
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
function GM(t) {
  const { $from: e, $to: n, to: r } = t.selection;
  if (xu && e.sameParent(n)) {
    const i = Je.widget(r, YM, {
      ignoreSelection: !0,
      key: "safari-ime-span"
    });
    return Me.create(t.doc, [i]);
  }
}
function YM(t) {
  const e = t.dom.ownerDocument.createElement("span");
  return e.className = "ProseMirror-safari-ime-span", e;
}
var QM = new je(UM ? JM : { key: uy });
function Nh(t, e) {
  const n = String(t);
  if (typeof e != "string")
    throw new TypeError("Expected character");
  let r = 0, i = n.indexOf(e);
  for (; i !== -1; )
    r++, i = n.indexOf(e, i + e.length);
  return r;
}
function XM(t) {
  if (typeof t != "string")
    throw new TypeError("Expected a string");
  return t.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}
function ZM(t, e, n) {
  const i = bl((n || {}).ignore || []), o = eT(e);
  let s = -1;
  for (; ++s < o.length; )
    Ru(t, "text", l);
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
    const b = f.children.indexOf(u);
    let w = !1, L = [];
    d.lastIndex = 0;
    let O = d.exec(u.value);
    for (; O; ) {
      const W = O.index, j = {
        index: O.index,
        input: O.input,
        stack: [...c, u]
      };
      let T = h(...O, j);
      if (typeof T == "string" && (T = T.length > 0 ? { type: "text", value: T } : void 0), T === !1 ? d.lastIndex = W + 1 : (p !== W && L.push({
        type: "text",
        value: u.value.slice(p, W)
      }), Array.isArray(T) ? L.push(...T) : T && L.push(T), p = W + O[0].length, w = !0), !d.global)
        break;
      O = d.exec(u.value);
    }
    return w ? (p < u.value.length && L.push({ type: "text", value: u.value.slice(p) }), f.children.splice(b, 1, ...L)) : L = [u], b + L.length;
  }
}
function eT(t) {
  const e = [];
  if (!Array.isArray(t))
    throw new TypeError("Expected find and replace tuple or list of tuples");
  const n = !t[0] || Array.isArray(t[0]) ? t : [t];
  let r = -1;
  for (; ++r < n.length; ) {
    const i = n[r];
    e.push([tT(i[0]), nT(i[1])]);
  }
  return e;
}
function tT(t) {
  return typeof t == "string" ? new RegExp(XM(t), "g") : t;
}
function nT(t) {
  return typeof t == "function" ? t : function() {
    return t;
  };
}
const Ca = "phrasing", Sa = ["autolink", "link", "image", "label"];
function rT() {
  return {
    transforms: [cT],
    enter: {
      literalAutolink: oT,
      literalAutolinkEmail: va,
      literalAutolinkHttp: va,
      literalAutolinkWww: va
    },
    exit: {
      literalAutolink: uT,
      literalAutolinkEmail: aT,
      literalAutolinkHttp: sT,
      literalAutolinkWww: lT
    }
  };
}
function iT() {
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
function oT(t) {
  this.enter({ type: "link", title: null, url: "", children: [] }, t);
}
function va(t) {
  this.config.enter.autolinkProtocol.call(this, t);
}
function sT(t) {
  this.config.exit.autolinkProtocol.call(this, t);
}
function lT(t) {
  this.config.exit.data.call(this, t);
  const e = this.stack[this.stack.length - 1];
  e.type, e.url = "http://" + this.sliceSerialize(t);
}
function aT(t) {
  this.config.exit.autolinkEmail.call(this, t);
}
function uT(t) {
  this.exit(t);
}
function cT(t) {
  ZM(
    t,
    [
      [/(https?:\/\/|www(?=\.))([-.\w]+)([^ \t\r\n]*)/gi, fT],
      [new RegExp("(^|\\\\s|[\\\\u0021-\\\\u002F\\\\u003A-\\\\u0040\\\\u005B-\\\\u0060\\\\u007B-\\\\u007E])([-.\\\\w+]+)@([-\\\\w]+(?:\\\\.[-\\\\w]+)+)", "gu"), dT]
    ],
    { ignore: ["link", "linkReference"] }
  );
}
function fT(t, e, n, r, i) {
  let o = "";
  if (!cy(i) || (/^w/i.test(e) && (n = e + n, e = "", o = "http://"), !hT(n)))
    return !1;
  const s = pT(n + r);
  if (!s[0]) return !1;
  const l = {
    type: "link",
    title: null,
    url: o + e + s[0],
    children: [{ type: "text", value: e + s[0] }]
  };
  return s[1] ? [l, { type: "text", value: s[1] }] : l;
}
function dT(t, e, n, r) {
  return (
    // Not an expected previous character.
    !cy(r, !0) || // Label ends in not allowed character.
    /[-\d_]$/.test(n) ? !1 : {
      type: "link",
      title: null,
      url: "mailto:" + e + "@" + n,
      children: [{ type: "text", value: e + "@" + n }]
    }
  );
}
function hT(t) {
  const e = t.split(".");
  return !(e.length < 2 || e[e.length - 1] && (/_/.test(e[e.length - 1]) || !/[a-zA-Z\d]/.test(e[e.length - 1])) || e[e.length - 2] && (/_/.test(e[e.length - 2]) || !/[a-zA-Z\d]/.test(e[e.length - 2])));
}
function pT(t) {
  const e = /[!"&'),.:;<>?\]}]+$/.exec(t);
  if (!e)
    return [t, void 0];
  t = t.slice(0, e.index);
  let n = e[0], r = n.indexOf(")");
  const i = Nh(t, "(");
  let o = Nh(t, ")");
  for (; r !== -1 && i > o; )
    t += n.slice(0, r + 1), n = n.slice(r + 1), r = n.indexOf(")"), o++;
  return [t, n];
}
function cy(t, e) {
  const n = t.input.charCodeAt(t.index - 1);
  return (t.index === 0 || Fr(n) || yl(n)) && // If it’s an email, the previous character should not be a slash.
  (!e || n !== 47);
}
fy.peek = ST;
function mT() {
  this.buffer();
}
function gT(t) {
  this.enter({ type: "footnoteReference", identifier: "", label: "" }, t);
}
function yT() {
  this.buffer();
}
function kT(t) {
  this.enter(
    { type: "footnoteDefinition", identifier: "", label: "", children: [] },
    t
  );
}
function bT(t) {
  const e = this.resume(), n = this.stack[this.stack.length - 1];
  n.type, n.identifier = Wt(
    this.sliceSerialize(t)
  ).toLowerCase(), n.label = e;
}
function wT(t) {
  this.exit(t);
}
function xT(t) {
  const e = this.resume(), n = this.stack[this.stack.length - 1];
  n.type, n.identifier = Wt(
    this.sliceSerialize(t)
  ).toLowerCase(), n.label = e;
}
function CT(t) {
  this.exit(t);
}
function ST() {
  return "[";
}
function fy(t, e, n, r) {
  const i = n.createTracker(r);
  let o = i.move("[^");
  const s = n.enter("footnoteReference"), l = n.enter("reference");
  return o += i.move(
    n.safe(n.associationId(t), { after: "]", before: o })
  ), l(), s(), o += i.move("]"), o;
}
function vT() {
  return {
    enter: {
      gfmFootnoteCallString: mT,
      gfmFootnoteCall: gT,
      gfmFootnoteDefinitionLabelString: yT,
      gfmFootnoteDefinition: kT
    },
    exit: {
      gfmFootnoteCallString: bT,
      gfmFootnoteCall: wT,
      gfmFootnoteDefinitionLabelString: xT,
      gfmFootnoteDefinition: CT
    }
  };
}
function MT(t) {
  let e = !1;
  return t && t.firstLineBlank && (e = !0), {
    handlers: { footnoteDefinition: n, footnoteReference: fy },
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
        e ? dy : TT
      )
    )), u(), a;
  }
}
function TT(t, e, n) {
  return e === 0 ? t : dy(t, e, n);
}
function dy(t, e, n) {
  return (n ? "" : "    ") + t;
}
const NT = [
  "autolink",
  "destinationLiteral",
  "destinationRaw",
  "reference",
  "titleQuote",
  "titleApostrophe"
];
py.peek = OT;
function hy() {
  return {
    canContainEols: ["delete"],
    enter: { strikethrough: AT },
    exit: { strikethrough: ET }
  };
}
function IT() {
  return {
    unsafe: [
      {
        character: "~",
        inConstruct: "phrasing",
        notInConstruct: NT
      }
    ],
    handlers: { delete: py }
  };
}
function AT(t) {
  this.enter({ type: "delete", children: [] }, t);
}
function ET(t) {
  this.exit(t);
}
function py(t, e, n, r) {
  const i = n.createTracker(r), o = n.enter("strikethrough");
  let s = i.move("~~");
  return s += n.containerPhrasing(t, {
    ...i.current(),
    before: s,
    after: "~"
  }), s += i.move("~~"), o(), s;
}
function OT() {
  return "~";
}
function DT(t) {
  return t.length;
}
function RT(t, e) {
  const n = e || {}, r = (n.align || []).concat(), i = n.stringLength || DT, o = [], s = [], l = [], a = [];
  let u = 0, c = -1;
  for (; ++c < t.length; ) {
    const k = [], b = [];
    let w = -1;
    for (t[c].length > u && (u = t[c].length); ++w < t[c].length; ) {
      const L = LT(t[c][w]);
      if (n.alignDelimiters !== !1) {
        const O = i(L);
        b[w] = O, (a[w] === void 0 || O > a[w]) && (a[w] = O);
      }
      k.push(L);
    }
    s[c] = k, l[c] = b;
  }
  let f = -1;
  if (typeof r == "object" && "length" in r)
    for (; ++f < u; )
      o[f] = Ih(r[f]);
  else {
    const k = Ih(r);
    for (; ++f < u; )
      o[f] = k;
  }
  f = -1;
  const d = [], h = [];
  for (; ++f < u; ) {
    const k = o[f];
    let b = "", w = "";
    k === 99 ? (b = ":", w = ":") : k === 108 ? b = ":" : k === 114 && (w = ":");
    let L = n.alignDelimiters === !1 ? 1 : Math.max(
      1,
      a[f] - b.length - w.length
    );
    const O = b + "-".repeat(L) + w;
    n.alignDelimiters !== !1 && (L = b.length + L + w.length, L > a[f] && (a[f] = L), h[f] = L), d[f] = O;
  }
  s.splice(1, 0, d), l.splice(1, 0, h), c = -1;
  const p = [];
  for (; ++c < s.length; ) {
    const k = s[c], b = l[c];
    f = -1;
    const w = [];
    for (; ++f < u; ) {
      const L = k[f] || "";
      let O = "", W = "";
      if (n.alignDelimiters !== !1) {
        const j = a[f] - (b[f] || 0), T = o[f];
        T === 114 ? O = " ".repeat(j) : T === 99 ? j % 2 ? (O = " ".repeat(j / 2 + 0.5), W = " ".repeat(j / 2 - 0.5)) : (O = " ".repeat(j / 2), W = O) : W = " ".repeat(j);
      }
      n.delimiterStart !== !1 && !f && w.push("|"), n.padding !== !1 && // Don’t add the opening space if we’re not aligning and the cell is
      // empty: there will be a closing space.
      !(n.alignDelimiters === !1 && L === "") && (n.delimiterStart !== !1 || f) && w.push(" "), n.alignDelimiters !== !1 && w.push(O), w.push(L), n.alignDelimiters !== !1 && w.push(W), n.padding !== !1 && w.push(" "), (n.delimiterEnd !== !1 || f !== u - 1) && w.push("|");
    }
    p.push(
      n.delimiterEnd === !1 ? w.join("").replace(/ +$/, "") : w.join("")
    );
  }
  return p.join(`
`);
}
function LT(t) {
  return t == null ? "" : String(t);
}
function Ih(t) {
  const e = typeof t == "string" ? t.codePointAt(0) : 0;
  return e === 67 || e === 99 ? 99 : e === 76 || e === 108 ? 108 : e === 82 || e === 114 ? 114 : 0;
}
function PT() {
  return {
    enter: {
      table: zT,
      tableData: Ah,
      tableHeader: Ah,
      tableRow: FT
    },
    exit: {
      codeText: $T,
      table: BT,
      tableData: Ma,
      tableHeader: Ma,
      tableRow: Ma
    }
  };
}
function zT(t) {
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
function BT(t) {
  this.exit(t), this.data.inTable = void 0;
}
function FT(t) {
  this.enter({ type: "tableRow", children: [] }, t);
}
function Ma(t) {
  this.exit(t);
}
function Ah(t) {
  this.enter({ type: "tableCell", children: [] }, t);
}
function $T(t) {
  let e = this.resume();
  this.data.inTable && (e = e.replace(/\\([\\|])/g, _T));
  const n = this.stack[this.stack.length - 1];
  n.type, n.value = e, this.exit(t);
}
function _T(t, e) {
  return e === "|" ? e : t;
}
function VT(t) {
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
  function s(h, p, k, b) {
    return u(c(h, k, b), h.align);
  }
  function l(h, p, k, b) {
    const w = f(h, k, b), L = u([w]);
    return L.slice(0, L.indexOf(`
`));
  }
  function a(h, p, k, b) {
    const w = k.enter("tableCell"), L = k.enter("phrasing"), O = k.containerPhrasing(h, {
      ...b,
      before: o,
      after: o
    });
    return L(), w(), O;
  }
  function u(h, p) {
    return RT(h, {
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
    const b = h.children;
    let w = -1;
    const L = [], O = p.enter("table");
    for (; ++w < b.length; )
      L[w] = f(b[w], p, k);
    return O(), L;
  }
  function f(h, p, k) {
    const b = h.children;
    let w = -1;
    const L = [], O = p.enter("tableRow");
    for (; ++w < b.length; )
      L[w] = a(b[w], h, p, k);
    return O(), L;
  }
  function d(h, p, k) {
    let b = Pu.inlineCode(h, p, k);
    return k.stack.includes("tableCell") && (b = b.replace(/\|/g, "\\$&")), b;
  }
}
function HT() {
  return {
    exit: {
      taskListCheckValueChecked: Eh,
      taskListCheckValueUnchecked: Eh,
      paragraph: WT
    }
  };
}
function jT() {
  return {
    unsafe: [{ atBreak: !0, character: "-", after: "[:|-]" }],
    handlers: { listItem: qT }
  };
}
function Eh(t) {
  const e = this.stack[this.stack.length - 2];
  e.type, e.checked = t.type === "taskListCheckValueChecked";
}
function WT(t) {
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
function qT(t, e, n, r) {
  const i = t.children[0], o = typeof t.checked == "boolean" && i && i.type === "paragraph", s = "[" + (t.checked ? "x" : " ") + "] ", l = n.createTracker(r);
  o && l.move(s);
  let a = Pu.listItem(t, e, n, {
    ...r,
    ...l.current()
  });
  return o && (a = a.replace(/^(?:[*+-]|\d+\.)([\r\n]| {1,3})/, u)), a;
  function u(c) {
    return c + s;
  }
}
function KT() {
  return [
    rT(),
    vT(),
    hy(),
    PT(),
    HT()
  ];
}
function UT(t) {
  return {
    extensions: [
      iT(),
      MT(t),
      IT(),
      VT(t),
      jT()
    ]
  };
}
const JT = {
  tokenize: eN,
  partial: !0
}, my = {
  tokenize: tN,
  partial: !0
}, gy = {
  tokenize: nN,
  partial: !0
}, yy = {
  tokenize: rN,
  partial: !0
}, GT = {
  tokenize: iN,
  partial: !0
}, ky = {
  name: "wwwAutolink",
  tokenize: XT,
  previous: wy
}, by = {
  name: "protocolAutolink",
  tokenize: ZT,
  previous: xy
}, En = {
  name: "emailAutolink",
  tokenize: QT,
  previous: Cy
}, sn = {};
function YT() {
  return {
    text: sn
  };
}
let dr = 48;
for (; dr < 123; )
  sn[dr] = En, dr++, dr === 58 ? dr = 65 : dr === 91 && (dr = 97);
sn[43] = En;
sn[45] = En;
sn[46] = En;
sn[95] = En;
sn[72] = [En, by];
sn[104] = [En, by];
sn[87] = [En, ky];
sn[119] = [En, ky];
function QT(t, e, n) {
  const r = this;
  let i, o;
  return s;
  function s(f) {
    return !Cu(f) || !Cy.call(r, r.previous) || Zc(r.events) ? n(f) : (t.enter("literalAutolink"), t.enter("literalAutolinkEmail"), l(f));
  }
  function l(f) {
    return Cu(f) ? (t.consume(f), l) : f === 64 ? (t.consume(f), a) : n(f);
  }
  function a(f) {
    return f === 46 ? t.check(GT, c, u)(f) : f === 45 || f === 95 || mt(f) ? (o = !0, t.consume(f), a) : c(f);
  }
  function u(f) {
    return t.consume(f), i = !0, a;
  }
  function c(f) {
    return o && i && it(r.previous) ? (t.exit("literalAutolinkEmail"), t.exit("literalAutolink"), e(f)) : n(f);
  }
}
function XT(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return s !== 87 && s !== 119 || !wy.call(r, r.previous) || Zc(r.events) ? n(s) : (t.enter("literalAutolink"), t.enter("literalAutolinkWww"), t.check(JT, t.attempt(my, t.attempt(gy, o), n), n)(s));
  }
  function o(s) {
    return t.exit("literalAutolinkWww"), t.exit("literalAutolink"), e(s);
  }
}
function ZT(t, e, n) {
  const r = this;
  let i = "", o = !1;
  return s;
  function s(f) {
    return (f === 72 || f === 104) && xy.call(r, r.previous) && !Zc(r.events) ? (t.enter("literalAutolink"), t.enter("literalAutolinkHttp"), i += String.fromCodePoint(f), t.consume(f), l) : n(f);
  }
  function l(f) {
    if (it(f) && i.length < 5)
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
    return f === null || Ys(f) || we(f) || Fr(f) || yl(f) ? n(f) : t.attempt(my, t.attempt(gy, c), n)(f);
  }
  function c(f) {
    return t.exit("literalAutolinkHttp"), t.exit("literalAutolink"), e(f);
  }
}
function eN(t, e, n) {
  let r = 0;
  return i;
  function i(s) {
    return (s === 87 || s === 119) && r < 3 ? (r++, t.consume(s), i) : s === 46 && r === 3 ? (t.consume(s), o) : n(s);
  }
  function o(s) {
    return s === null ? n(s) : e(s);
  }
}
function tN(t, e, n) {
  let r, i, o;
  return s;
  function s(u) {
    return u === 46 || u === 95 ? t.check(yy, a, l)(u) : u === null || we(u) || Fr(u) || u !== 45 && yl(u) ? a(u) : (o = !0, t.consume(u), s);
  }
  function l(u) {
    return u === 95 ? r = !0 : (i = r, r = void 0), t.consume(u), s;
  }
  function a(u) {
    return i || r || !o ? n(u) : e(u);
  }
}
function nN(t, e) {
  let n = 0, r = 0;
  return i;
  function i(s) {
    return s === 40 ? (n++, t.consume(s), i) : s === 41 && r < n ? o(s) : s === 33 || s === 34 || s === 38 || s === 39 || s === 41 || s === 42 || s === 44 || s === 46 || s === 58 || s === 59 || s === 60 || s === 63 || s === 93 || s === 95 || s === 126 ? t.check(yy, e, o)(s) : s === null || we(s) || Fr(s) ? e(s) : (t.consume(s), i);
  }
  function o(s) {
    return s === 41 && r++, t.consume(s), i;
  }
}
function rN(t, e, n) {
  return r;
  function r(l) {
    return l === 33 || l === 34 || l === 39 || l === 41 || l === 42 || l === 44 || l === 46 || l === 58 || l === 59 || l === 63 || l === 95 || l === 126 ? (t.consume(l), r) : l === 38 ? (t.consume(l), o) : l === 93 ? (t.consume(l), i) : (
      // `<` is an end.
      l === 60 || // So is whitespace.
      l === null || we(l) || Fr(l) ? e(l) : n(l)
    );
  }
  function i(l) {
    return l === null || l === 40 || l === 91 || we(l) || Fr(l) ? e(l) : r(l);
  }
  function o(l) {
    return it(l) ? s(l) : n(l);
  }
  function s(l) {
    return l === 59 ? (t.consume(l), r) : it(l) ? (t.consume(l), s) : n(l);
  }
}
function iN(t, e, n) {
  return r;
  function r(o) {
    return t.consume(o), i;
  }
  function i(o) {
    return mt(o) ? n(o) : e(o);
  }
}
function wy(t) {
  return t === null || t === 40 || t === 42 || t === 95 || t === 91 || t === 93 || t === 126 || we(t);
}
function xy(t) {
  return !it(t);
}
function Cy(t) {
  return !(t === 47 || Cu(t));
}
function Cu(t) {
  return t === 43 || t === 45 || t === 46 || t === 95 || mt(t);
}
function Zc(t) {
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
const oN = {
  tokenize: hN,
  partial: !0
};
function sN() {
  return {
    document: {
      91: {
        name: "gfmFootnoteDefinition",
        tokenize: cN,
        continuation: {
          tokenize: fN
        },
        exit: dN
      }
    },
    text: {
      91: {
        name: "gfmFootnoteCall",
        tokenize: uN
      },
      93: {
        name: "gfmPotentialFootnoteCall",
        add: "after",
        tokenize: lN,
        resolveTo: aN
      }
    }
  };
}
function lN(t, e, n) {
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
    const u = Wt(r.sliceSerialize({
      start: s.end,
      end: r.now()
    }));
    return u.codePointAt(0) !== 94 || !o.includes(u.slice(1)) ? n(a) : (t.enter("gfmFootnoteCallLabelMarker"), t.consume(a), t.exit("gfmFootnoteCallLabelMarker"), e(a));
  }
}
function aN(t, e) {
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
function uN(t, e, n) {
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
      f === null || f === 91 || we(f)
    )
      return n(f);
    if (f === 93) {
      t.exit("chunkString");
      const d = t.exit("gfmFootnoteCallString");
      return i.includes(Wt(r.sliceSerialize(d))) ? (t.enter("gfmFootnoteCallLabelMarker"), t.consume(f), t.exit("gfmFootnoteCallLabelMarker"), t.exit("gfmFootnoteCall"), e) : n(f);
    }
    return we(f) || (s = !0), o++, t.consume(f), f === 92 ? c : u;
  }
  function c(f) {
    return f === 91 || f === 92 || f === 93 ? (t.consume(f), o++, u) : u(f);
  }
}
function cN(t, e, n) {
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
      p === null || p === 91 || we(p)
    )
      return n(p);
    if (p === 93) {
      t.exit("chunkString");
      const k = t.exit("gfmFootnoteDefinitionLabelString");
      return o = Wt(r.sliceSerialize(k)), t.enter("gfmFootnoteDefinitionLabelMarker"), t.consume(p), t.exit("gfmFootnoteDefinitionLabelMarker"), t.exit("gfmFootnoteDefinitionLabel"), d;
    }
    return we(p) || (l = !0), s++, t.consume(p), p === 92 ? f : c;
  }
  function f(p) {
    return p === 91 || p === 92 || p === 93 ? (t.consume(p), s++, c) : c(p);
  }
  function d(p) {
    return p === 58 ? (t.enter("definitionMarker"), t.consume(p), t.exit("definitionMarker"), i.includes(o) || i.push(o), de(t, h, "gfmFootnoteDefinitionWhitespace")) : n(p);
  }
  function h(p) {
    return e(p);
  }
}
function fN(t, e, n) {
  return t.check(ts, e, t.attempt(oN, e, n));
}
function dN(t) {
  t.exit("gfmFootnoteDefinition");
}
function hN(t, e, n) {
  const r = this;
  return de(t, i, "gfmFootnoteDefinitionIndent", 5);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return s && s[1].type === "gfmFootnoteDefinitionIndent" && s[2].sliceSerialize(s[1], !0).length === 4 ? e(o) : n(o);
  }
}
function Sy(t) {
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
            h && Mt(d, d.length, 0, kl(h, s.slice(u + 1, a), l)), Mt(d, d.length, 0, [["exit", f, l], ["enter", s[a][1], l], ["exit", s[a][1], l], ["exit", c, l]]), Mt(s, u - 1, a - u + 3, d), a = u + d.length - 2;
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
      const k = Ei(u);
      if (p === 126)
        return f > 1 ? a(p) : (s.consume(p), f++, h);
      if (f < 2 && !n) return a(p);
      const b = s.exit("strikethroughSequenceTemporary"), w = Ei(p);
      return b._open = !w || w === 2 && !!k, b._close = !k || k === 2 && !!w, l(p);
    }
  }
}
class pN {
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
    mN(this, e, n, r);
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
function mN(t, e, n, r) {
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
function gN(t, e) {
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
function yN() {
  return {
    flow: {
      null: {
        name: "table",
        tokenize: kN,
        resolveAll: bN
      }
    }
  };
}
function kN(t, e, n) {
  const r = this;
  let i = 0, o = 0, s;
  return l;
  function l(N) {
    let q = r.events.length - 1;
    for (; q > -1; ) {
      const be = r.events[q][1].type;
      if (be === "lineEnding" || // Note: markdown-rs uses `whitespace` instead of `linePrefix`
      be === "linePrefix") q--;
      else break;
    }
    const $ = q > -1 ? r.events[q][1].type : null, ce = $ === "tableHead" || $ === "tableRow" ? T : a;
    return ce === T && r.parser.lazy[r.now().line] ? n(N) : ce(N);
  }
  function a(N) {
    return t.enter("tableHead"), t.enter("tableRow"), u(N);
  }
  function u(N) {
    return N === 124 || (s = !0, o += 1), c(N);
  }
  function c(N) {
    return N === null ? n(N) : J(N) ? o > 1 ? (o = 0, r.interrupt = !0, t.exit("tableRow"), t.enter("lineEnding"), t.consume(N), t.exit("lineEnding"), h) : n(N) : se(N) ? de(t, c, "whitespace")(N) : (o += 1, s && (s = !1, i += 1), N === 124 ? (t.enter("tableCellDivider"), t.consume(N), t.exit("tableCellDivider"), s = !0, c) : (t.enter("data"), f(N)));
  }
  function f(N) {
    return N === null || N === 124 || we(N) ? (t.exit("data"), c(N)) : (t.consume(N), N === 92 ? d : f);
  }
  function d(N) {
    return N === 92 || N === 124 ? (t.consume(N), f) : f(N);
  }
  function h(N) {
    return r.interrupt = !1, r.parser.lazy[r.now().line] ? n(N) : (t.enter("tableDelimiterRow"), s = !1, se(N) ? de(t, p, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(N) : p(N));
  }
  function p(N) {
    return N === 45 || N === 58 ? b(N) : N === 124 ? (s = !0, t.enter("tableCellDivider"), t.consume(N), t.exit("tableCellDivider"), k) : j(N);
  }
  function k(N) {
    return se(N) ? de(t, b, "whitespace")(N) : b(N);
  }
  function b(N) {
    return N === 58 ? (o += 1, s = !0, t.enter("tableDelimiterMarker"), t.consume(N), t.exit("tableDelimiterMarker"), w) : N === 45 ? (o += 1, w(N)) : N === null || J(N) ? W(N) : j(N);
  }
  function w(N) {
    return N === 45 ? (t.enter("tableDelimiterFiller"), L(N)) : j(N);
  }
  function L(N) {
    return N === 45 ? (t.consume(N), L) : N === 58 ? (s = !0, t.exit("tableDelimiterFiller"), t.enter("tableDelimiterMarker"), t.consume(N), t.exit("tableDelimiterMarker"), O) : (t.exit("tableDelimiterFiller"), O(N));
  }
  function O(N) {
    return se(N) ? de(t, W, "whitespace")(N) : W(N);
  }
  function W(N) {
    return N === 124 ? p(N) : N === null || J(N) ? !s || i !== o ? j(N) : (t.exit("tableDelimiterRow"), t.exit("tableHead"), e(N)) : j(N);
  }
  function j(N) {
    return n(N);
  }
  function T(N) {
    return t.enter("tableRow"), F(N);
  }
  function F(N) {
    return N === 124 ? (t.enter("tableCellDivider"), t.consume(N), t.exit("tableCellDivider"), F) : N === null || J(N) ? (t.exit("tableRow"), e(N)) : se(N) ? de(t, F, "whitespace")(N) : (t.enter("data"), U(N));
  }
  function U(N) {
    return N === null || N === 124 || we(N) ? (t.exit("data"), F(N)) : (t.consume(N), N === 92 ? G : U);
  }
  function G(N) {
    return N === 92 || N === 124 ? (t.consume(N), U) : U(N);
  }
}
function bN(t, e) {
  let n = -1, r = !0, i = 0, o = [0, 0, 0, 0], s = [0, 0, 0, 0], l = !1, a = 0, u, c, f;
  const d = new pN();
  for (; ++n < t.length; ) {
    const h = t[n], p = h[1];
    h[0] === "enter" ? p.type === "tableHead" ? (l = !1, a !== 0 && (Oh(d, e, a, u, c), c = void 0, a = 0), u = {
      type: "table",
      start: Object.assign({}, p.start),
      // Note: correct end is set later.
      end: Object.assign({}, p.end)
    }, d.add(n, 0, [["enter", u, e]])) : p.type === "tableRow" || p.type === "tableDelimiterRow" ? (r = !0, f = void 0, o = [0, 0, 0, 0], s = [0, n + 1, 0, 0], l && (l = !1, c = {
      type: "tableBody",
      start: Object.assign({}, p.start),
      // Note: correct end is set later.
      end: Object.assign({}, p.end)
    }, d.add(n, 0, [["enter", c, e]])), i = p.type === "tableDelimiterRow" ? 2 : c ? 3 : 1) : i && (p.type === "data" || p.type === "tableDelimiterMarker" || p.type === "tableDelimiterFiller") ? (r = !1, s[2] === 0 && (o[1] !== 0 && (s[0] = s[1], f = Ds(d, e, o, i, void 0, f), o = [0, 0, 0, 0]), s[2] = n)) : p.type === "tableCellDivider" && (r ? r = !1 : (o[1] !== 0 && (s[0] = s[1], f = Ds(d, e, o, i, void 0, f)), o = s, s = [o[1], n, 0, 0])) : p.type === "tableHead" ? (l = !0, a = n) : p.type === "tableRow" || p.type === "tableDelimiterRow" ? (a = n, o[1] !== 0 ? (s[0] = s[1], f = Ds(d, e, o, i, n, f)) : s[1] !== 0 && (f = Ds(d, e, s, i, n, f)), i = 0) : i && (p.type === "data" || p.type === "tableDelimiterMarker" || p.type === "tableDelimiterFiller") && (s[3] = n);
  }
  for (a !== 0 && Oh(d, e, a, u, c), d.consume(e.events), n = -1; ++n < e.events.length; ) {
    const h = e.events[n];
    h[0] === "enter" && h[1].type === "table" && (h[1]._align = gN(e.events, n));
  }
  return t;
}
function Ds(t, e, n, r, i, o) {
  const s = r === 1 ? "tableHeader" : r === 2 ? "tableDelimiter" : "tableData", l = "tableContent";
  n[0] !== 0 && (o.end = Object.assign({}, ri(e.events, n[0])), t.add(n[0], 0, [["exit", o, e]]));
  const a = ri(e.events, n[1]);
  if (o = {
    type: s,
    start: Object.assign({}, a),
    // Note: correct end is set later.
    end: Object.assign({}, a)
  }, t.add(n[1], 0, [["enter", o, e]]), n[2] !== 0) {
    const u = ri(e.events, n[2]), c = ri(e.events, n[3]), f = {
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
  return i !== void 0 && (o.end = Object.assign({}, ri(e.events, i)), t.add(i, 0, [["exit", o, e]]), o = void 0), o;
}
function Oh(t, e, n, r, i) {
  const o = [], s = ri(e.events, n);
  i && (i.end = Object.assign({}, s), o.push(["exit", i, e])), r.end = Object.assign({}, s), o.push(["exit", r, e]), t.add(n + 1, 0, o);
}
function ri(t, e) {
  const n = t[e], r = n[0] === "enter" ? "start" : "end";
  return n[1][r];
}
const wN = {
  name: "tasklistCheck",
  tokenize: CN
};
function xN() {
  return {
    text: {
      91: wN
    }
  };
}
function CN(t, e, n) {
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
    return we(a) ? (t.enter("taskListCheckValueUnchecked"), t.consume(a), t.exit("taskListCheckValueUnchecked"), s) : a === 88 || a === 120 ? (t.enter("taskListCheckValueChecked"), t.consume(a), t.exit("taskListCheckValueChecked"), s) : n(a);
  }
  function s(a) {
    return a === 93 ? (t.enter("taskListCheckMarker"), t.consume(a), t.exit("taskListCheckMarker"), t.exit("taskListCheck"), l) : n(a);
  }
  function l(a) {
    return J(a) ? e(a) : se(a) ? t.check({
      tokenize: SN
    }, e, n)(a) : n(a);
  }
}
function SN(t, e, n) {
  return de(t, r, "whitespace");
  function r(i) {
    return i === null ? n(i) : e(i);
  }
}
function vN(t) {
  return ap([
    YT(),
    sN(),
    Sy(t),
    yN(),
    xN()
  ]);
}
const MN = {};
function TN(t) {
  const e = (
    /** @type {Processor<Root>} */
    this
  ), n = t || MN, r = e.data(), i = r.micromarkExtensions || (r.micromarkExtensions = []), o = r.fromMarkdownExtensions || (r.fromMarkdownExtensions = []), s = r.toMarkdownExtensions || (r.toMarkdownExtensions = []);
  i.push(vN(n)), o.push(KT()), s.push(UT(n));
}
function Y(t, e) {
  return Object.assign(t, { meta: {
    package: "@milkdown/preset-gfm",
    ...e
  } }), t;
}
var ef = us("strike_through");
Y(ef, {
  displayName: "Attr<strikethrough>",
  group: "Strikethrough"
});
var ms = Hi("strike_through", (t) => ({
  parseDOM: [{ tag: "del" }, {
    style: "text-decoration",
    getAttrs: (e) => e === "line-through"
  }],
  toDOM: (e) => ["del", t.get(ef.key)(e)],
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
Y(ms.mark, {
  displayName: "MarkSchema<strikethrough>",
  group: "Strikethrough"
});
Y(ms.ctx, {
  displayName: "MarkSchemaCtx<strikethrough>",
  group: "Strikethrough"
});
var tf = Z("ToggleStrikeThrough", (t) => () => rs(ms.type(t)));
Y(tf, {
  displayName: "Command<ToggleStrikethrough>",
  group: "Strikethrough"
});
var vy = bt((t) => is(new RegExp("(?:^|[^\\\\w:/])(~{1,2})(.+?)\\\\1(?!\\\\w|\\\\/)"), ms.type(t), { updateCaptured: (e) => e.fullMatch.startsWith("~") ? e : { start: e.start + 1, fullMatch: e.fullMatch.slice(1) } }));
Y(vy, {
  displayName: "InputRule<strikethrough>",
  group: "Strikethrough"
});
var nf = wt("strikeThroughKeymap", { ToggleStrikethrough: {
  shortcuts: "Mod-Alt-x",
  command: (t) => {
    const e = t.get(ge);
    return () => e.call(tf.key);
  }
} });
Y(nf.ctx, {
  displayName: "KeymapCtx<strikethrough>",
  group: "Strikethrough"
});
Y(nf.shortcuts, {
  displayName: "Keymap<strikethrough>",
  group: "Strikethrough"
});
var gs = Jv({
  tableGroup: "block",
  cellContent: "paragraph",
  cellAttributes: { alignment: {
    default: "left",
    getFromDOM: (t) => t.style.textAlign || "left",
    setDOMAttr: (t, e) => {
      e.style = `text-align: ${t || "left"}`;
    }
  } }
}), Mn = Ie("table", () => ({
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
Y(Mn.node, {
  displayName: "NodeSchema<table>",
  group: "Table"
});
Y(Mn.ctx, {
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
Y(ys.node, {
  displayName: "NodeSchema<tableHeaderRow>",
  group: "Table"
});
Y(ys.ctx, {
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
Y(Ui.node, {
  displayName: "NodeSchema<tableRow>",
  group: "Table"
});
Y(Ui.ctx, {
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
Y(ks.node, {
  displayName: "NodeSchema<tableCell>",
  group: "Table"
});
Y(ks.ctx, {
  displayName: "NodeSchemaCtx<tableCell>",
  group: "Table"
});
var zi = Ie("table_header", () => ({
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
Y(zi.node, {
  displayName: "NodeSchema<tableHeader>",
  group: "Table"
});
Y(zi.ctx, {
  displayName: "NodeSchemaCtx<tableHeader>",
  group: "Table"
});
function My(t, e = 3, n = 3) {
  const r = Array(n).fill(0).map(() => ks.type(t).createAndFill()), i = Array(n).fill(0).map(() => zi.type(t).createAndFill()), o = Array(e).fill(0).map((s, l) => l === 0 ? ys.type(t).create(null, i) : Ui.type(t).create(null, r));
  return Mn.type(t).create(null, o);
}
function Ty(t) {
  return (e, n) => (r) => {
    n = n ?? r.selection.from;
    const i = r.doc.resolve(n), o = nC((a) => a.type.name === "table")(i), s = o ? {
      node: o.node,
      from: o.start
    } : void 0, l = t === "row";
    if (s) {
      const a = ke.get(s.node);
      if (e >= 0 && e < (l ? a.height : a.width)) {
        const u = a.positionAt(l ? e : a.height - 1, l ? a.width - 1 : e, s.node), c = r.doc.resolve(s.from + u), f = l ? Se.rowSelection : Se.colSelection, d = a.positionAt(l ? e : 0, l ? 0 : e, s.node), h = r.doc.resolve(s.from + d);
        return Mm(r.setSelection(f(c, h)));
      }
    }
    return r;
  };
}
var NN = Ty("row"), IN = Ty("col");
function Ny(t, e, { map: n, tableStart: r, table: i }, o) {
  const s = Array(o).fill(0).reduce((a, u, c) => a + i.child(c).nodeSize, r), l = Array(n.width).fill(0).map((a, u) => {
    const c = i.nodeAt(n.map[u]);
    return ks.type(t).createAndFill({ alignment: c == null ? void 0 : c.attrs.alignment });
  });
  return e.insert(s, Ui.type(t).create(null, l)), e;
}
function AN(t) {
  const e = ps(t.$from);
  if (!e) return;
  const n = ke.get(e.node);
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
function EN(t) {
  const e = AN(t.selection);
  if (e && e[0]) {
    const n = t.doc.resolve(e[0].pos), r = e[e.length - 1];
    if (r) {
      const i = t.doc.resolve(r.pos);
      return Mm(t.setSelection(new Se(i, n)));
    }
  }
  return t;
}
var rf = Z("GoToPrevTableCell", () => () => sy(-1));
Y(rf, {
  displayName: "Command<goToPrevTableCellCommand>",
  group: "Table"
});
var of = Z("GoToNextTableCell", () => () => sy(1));
Y(of, {
  displayName: "Command<goToNextTableCellCommand>",
  group: "Table"
});
var sf = Z("ExitTable", (t) => () => (e, n) => {
  if (!Ve(e)) return !1;
  const { $head: r } = e.selection, i = tC(r, Mn.type(t));
  if (!i) return !1;
  const { to: o } = i, s = e.tr.replaceWith(o, o, Zt.type(t).createAndFill());
  return s.setSelection(te.near(s.doc.resolve(o), 1)).scrollIntoView(), n == null || n(s), !0;
});
Y(sf, {
  displayName: "Command<breakTableCommand>",
  group: "Table"
});
var Iy = Z("InsertTable", (t) => ({ row: e, col: n } = {}) => (r, i) => {
  const { selection: o, tr: s } = r, { from: l } = o, a = My(t, e, n), u = s.replaceSelectionWith(a), c = te.findFrom(u.doc.resolve(l), 1, !0);
  return c && u.setSelection(c), i == null || i(u), !0;
});
Y(Iy, {
  displayName: "Command<insertTableCommand>",
  group: "Table"
});
var Ay = Z("MoveRow", () => ({ from: t, to: e, pos: n } = {}) => xM({
  from: t ?? 0,
  to: e ?? 0,
  pos: n
}));
Y(Ay, {
  displayName: "Command<moveRowCommand>",
  group: "Table"
});
var Ey = Z("MoveCol", () => ({ from: t, to: e, pos: n } = {}) => CM({
  from: t ?? 0,
  to: e ?? 0,
  pos: n
}));
Y(Ey, {
  displayName: "Command<moveColCommand>",
  group: "Table"
});
var Oy = Z("SelectRow", () => (t = { index: 0 }) => (e, n) => {
  const { tr: r } = e;
  return !!(n == null ? void 0 : n(NN(t.index, t.pos)(r)));
});
Y(Oy, {
  displayName: "Command<selectRowCommand>",
  group: "Table"
});
var Dy = Z("SelectCol", () => (t = { index: 0 }) => (e, n) => {
  const { tr: r } = e;
  return !!(n == null ? void 0 : n(IN(t.index, t.pos)(r)));
});
Y(Dy, {
  displayName: "Command<selectColCommand>",
  group: "Table"
});
var Ry = Z("SelectTable", () => () => (t, e) => {
  const { tr: n } = t;
  return !!(e == null ? void 0 : e(EN(n)));
});
Y(Ry, {
  displayName: "Command<selectTableCommand>",
  group: "Table"
});
var Ly = Z("DeleteSelectedCells", () => () => (t, e) => {
  const { selection: n } = t;
  if (!(n instanceof Se)) return !1;
  const r = n.isRowSelection(), i = n.isColSelection();
  return r && i ? wM(t, e) : i ? ry(t, e) : oy(t, e);
});
Y(Ly, {
  displayName: "Command<deleteSelectedCellsCommand>",
  group: "Table"
});
var Py = Z("AddColBefore", () => () => ty);
Y(Py, {
  displayName: "Command<addColBeforeCommand>",
  group: "Table"
});
var zy = Z("AddColAfter", () => () => ny);
Y(zy, {
  displayName: "Command<addColAfterCommand>",
  group: "Table"
});
var By = Z("AddRowBefore", (t) => () => (e, n) => {
  if (!Ve(e)) return !1;
  if (n) {
    const r = on(e);
    n(Ny(t, e.tr, r, r.top));
  }
  return !0;
});
Y(By, {
  displayName: "Command<addRowBeforeCommand>",
  group: "Table"
});
var Fy = Z("AddRowAfter", (t) => () => (e, n) => {
  if (!Ve(e)) return !1;
  if (n) {
    const r = on(e);
    n(Ny(t, e.tr, r, r.bottom));
  }
  return !0;
});
Y(Fy, {
  displayName: "Command<addRowAfterCommand>",
  group: "Table"
});
var $y = Z("SetAlign", () => (t = "left") => yM("alignment", t));
Y($y, {
  displayName: "Command<setAlignCommand>",
  group: "Table"
});
var _y = bt((t) => new Nt(/^\|(\d+)[xX](\d+)\|\s$/, (e, n, r, i) => {
  var a, u;
  const o = e.doc.resolve(r);
  if (!o.node(-1).canReplaceWith(o.index(-1), o.indexAfter(-1), Mn.type(t))) return null;
  const s = My(t, Math.max(Number(((a = n.groups) == null ? void 0 : a.row) ?? 0), 2), Number((u = n.groups) == null ? void 0 : u.col)), l = e.tr.replaceRangeWith(r, i, s);
  return l.setSelection(Q.create(l.doc, r + 3)).scrollIntoView();
}));
Y(_y, {
  displayName: "InputRule<insertTableInputRule>",
  group: "Table"
});
var Vy = uv((t) => ({ run: (e, n, r) => {
  if (r) return e;
  function i(u) {
    var b;
    const c = u.childCount, f = ((b = u.lastChild) == null ? void 0 : b.childCount) ?? 0;
    if (c === 0 || f === 0) return Zt.type(t).create();
    const d = u.firstChild;
    if (!(f > 0 && d && d.childCount === 0)) return u;
    if (c >= 3) {
      const w = u.child(1), L = [];
      for (let j = 0; j < w.childCount; j++) {
        const T = w.child(j);
        L.push(zi.type(t).create(T.attrs, T.content, T.marks));
      }
      const O = d.type.create(d.attrs, L), W = [];
      for (let j = 2; j < c; j++) W.push(u.child(j));
      return u.type.create(u.attrs, [O, ...W]);
    }
    const h = Array(f).fill(0).map(() => zi.type(t).createAndFill()), p = new V(R.from(h), 0, 0), k = d.replace(0, 0, p);
    return u.replace(0, d.nodeSize, new V(R.from(k), 0, 0));
  }
  function o(u) {
    const c = Ui.type(t), f = [];
    let d = [], h = !1;
    function p() {
      if (d.length === 0) return;
      const k = ys.type(t).createAndFill(), b = Mn.type(t).create(null, [k, ...d]);
      f.push(i(b)), d = [];
    }
    return u.forEach((k) => {
      k.type === c ? (h = !0, d.push(k)) : (p(), f.push(k));
    }), p(), h ? R.from(f) : u;
  }
  function s(u) {
    let c = o(u), f = c !== u;
    const d = [];
    return c.forEach((h) => {
      if (h.type === Mn.type(t)) {
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
      h.type === Zt.type(t) && h.content.size === 0 && p && p.type === Mn.type(t) || c.push(h);
    }
    return c.length < f.length ? R.from(c) : u;
  }
  let a = s(e.content);
  return a = l(a), new V(R.from(a), e.openStart, e.openEnd);
} }));
Y(Vy, {
  displayName: "PasteRule<table>",
  group: "Table"
});
var lf = wt("tableKeymap", {
  NextCell: {
    priority: 100,
    shortcuts: ["Mod-]", "Tab"],
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(of.key);
    }
  },
  PrevCell: {
    shortcuts: ["Mod-[", "Shift-Tab"],
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(rf.key);
    }
  },
  ExitTable: {
    shortcuts: ["Mod-Enter", "Enter"],
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(sf.key);
    }
  }
});
Y(lf.ctx, {
  displayName: "KeymapCtx<table>",
  group: "Table"
});
Y(lf.shortcuts, {
  displayName: "Keymap<table>",
  group: "Table"
});
var Ta = "footnote_definition", Dh = "footnoteDefinition", af = Ie("footnote_definition", () => ({
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
      if (!(t instanceof HTMLElement)) throw en(t);
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
    match: ({ type: t }) => t === Dh,
    runner: (t, e, n) => {
      t.openNode(n, { label: e.label }).next(e.children).closeNode();
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === Ta,
    runner: (t, e) => {
      t.openNode(Dh, void 0, {
        label: e.attrs.label,
        identifier: e.attrs.label
      }).next(e.content).closeNode();
    }
  }
}));
Y(af.ctx, {
  displayName: "NodeSchemaCtx<footnodeDef>",
  group: "footnote"
});
Y(af.node, {
  displayName: "NodeSchema<footnodeDef>",
  group: "footnote"
});
var Na = "footnote_reference", uf = Ie("footnote_reference", () => ({
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
      if (!(t instanceof HTMLElement)) throw en(t);
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
Y(uf.ctx, {
  displayName: "NodeSchemaCtx<footnodeRef>",
  group: "footnote"
});
Y(uf.node, {
  displayName: "NodeSchema<footnodeRef>",
  group: "footnote"
});
var cf = An.extendSchema((t) => (e) => {
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
        if (!(r instanceof HTMLElement)) throw en(r);
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
Y(cf.node, {
  displayName: "NodeSchema<taskListItem>",
  group: "ListItem"
});
Y(cf.ctx, {
  displayName: "NodeSchemaCtx<taskListItem>",
  group: "ListItem"
});
var Hy = bt(() => new Nt(/^\[(\s|x)\]\s$/, (t, e, n, r) => {
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
Y(Hy, {
  displayName: "InputRule<wrapInTaskListInputRule>",
  group: "ListItem"
});
var ON = [nf, lf].flat(), DN = [_y, Hy], RN = [vy], LN = [Vy], jy = nn(() => QM);
Y(jy, {
  displayName: "Prose<autoInsertSpanPlugin>",
  group: "Prose"
});
var PN = nn(() => DM({}));
Y(PN, {
  displayName: "Prose<columnResizingPlugin>",
  group: "Prose"
});
var Wy = nn(() => HM({ allowTableNodeSelection: !0 }));
Y(Wy, {
  displayName: "Prose<tableEditingPlugin>",
  group: "Prose"
});
var ff = rn("remarkGFM", () => TN);
Y(ff.plugin, {
  displayName: "Remark<remarkGFMPlugin>",
  group: "Remark"
});
Y(ff.options, {
  displayName: "RemarkConfig<remarkGFMPlugin>",
  group: "Remark"
});
var zN = new nt("MILKDOWN_KEEP_TABLE_ALIGN_PLUGIN");
function BN(t, e) {
  let n = 0;
  return e.forEach((r, i, o) => {
    r === t && (n = o);
  }), n;
}
var qy = nn(() => new je({
  key: zN,
  appendTransaction: (t, e, n) => {
    let r;
    const i = (o, s) => {
      if (r || (r = n.tr), o.type.name !== "table_cell") return;
      const l = n.doc.resolve(s), a = l.node(l.depth), u = l.node(l.depth - 1).firstChild;
      if (!u) return;
      const c = BN(o, a), f = u.maybeChild(c);
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
Y(qy, {
  displayName: "Prose<keepTableAlignPlugin>",
  group: "Prose"
});
var FN = [
  qy,
  jy,
  ff,
  Wy
].flat(), $N = [
  cf,
  Mn,
  ys,
  Ui,
  zi,
  ks,
  af,
  uf,
  ef,
  ms
].flat(), _N = [
  of,
  rf,
  sf,
  Iy,
  Ay,
  Ey,
  Oy,
  Dy,
  Ry,
  Ly,
  By,
  Fy,
  Py,
  zy,
  $y,
  tf
], VN = [
  $N,
  DN,
  LN,
  RN,
  ON,
  _N,
  FN
].flat(), fl = 200, He = function() {
};
He.prototype.append = function(e) {
  return e.length ? (e = He.from(e), !this.length && e || e.length < fl && this.leafAppend(e) || this.length < fl && e.leafPrepend(this) || this.appendInner(e)) : this;
};
He.prototype.prepend = function(e) {
  return e.length ? He.from(e).append(this) : this;
};
He.prototype.appendInner = function(e) {
  return new HN(this, e);
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
  return e instanceof He ? e : e && e.length ? new Ky(e) : He.empty;
};
var Ky = /* @__PURE__ */ function(t) {
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
    if (this.length + i.length <= fl)
      return new e(this.values.concat(i.flatten()));
  }, e.prototype.leafPrepend = function(i) {
    if (this.length + i.length <= fl)
      return new e(i.flatten().concat(this.values));
  }, n.length.get = function() {
    return this.values.length;
  }, n.depth.get = function() {
    return 0;
  }, Object.defineProperties(e.prototype, n), e;
}(He);
He.empty = new Ky([]);
var HN = /* @__PURE__ */ function(t) {
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
const jN = 500;
class jt {
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
        c.push(new Jt(f.map));
        let h = f.step.map(i.slice(o)), p;
        h && s.maybeStep(h).doc && (p = s.mapping.maps[s.mapping.maps.length - 1], u.push(new Jt(p, void 0, void 0, u.length + c.length))), o--, p && i.appendMap(p, o);
      } else
        s.maybeStep(f.step);
      if (f.selection)
        return l = i ? f.selection.map(i.slice(o)) : f.selection, a = new jt(this.items.slice(0, r).append(c.reverse().concat(u)), this.eventCount - 1), !1;
    }, this.items.length, 0), { remaining: a, transform: s, selection: l };
  }
  // Create a new branch with the given transform added.
  addTransform(e, n, r, i) {
    let o = [], s = this.eventCount, l = this.items, a = !i && l.length ? l.get(l.length - 1) : null;
    for (let c = 0; c < e.steps.length; c++) {
      let f = e.steps[c].invert(e.docs[c]), d = new Jt(e.mapping.maps[c], f, n), h;
      (h = a && a.merge(d)) && (d = h, c ? o.pop() : l = l.slice(0, l.length - 1)), o.push(d), n && (s++, n = void 0), i || (a = d);
    }
    let u = s - r.depth;
    return u > qN && (l = WN(l, u), s -= u), new jt(l.append(o), s);
  }
  remapping(e, n) {
    let r = new Ao();
    return this.items.forEach((i, o) => {
      let s = i.mirrorOffset != null && o - i.mirrorOffset >= e ? r.maps.length - i.mirrorOffset : void 0;
      r.appendMap(i.map, s);
    }, e, n), r;
  }
  addMaps(e) {
    return this.eventCount == 0 ? this : new jt(this.items.append(e.map((n) => new Jt(n))), this.eventCount);
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
        let k = e.steps[h].invert(e.docs[h]), b = d.selection && d.selection.map(o.slice(a + 1, h));
        b && l++, r.push(new Jt(p, k, b));
      } else
        r.push(new Jt(p));
    }, i);
    let u = [];
    for (let d = n; d < s; d++)
      u.push(new Jt(o.maps[d]));
    let c = this.items.slice(0, i).append(u).append(r), f = new jt(c, l);
    return f.emptyItemCount() > jN && (f = f.compress(this.items.length - r.length)), f;
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
          let f = new Jt(u.invert(), a, c), d, h = i.length - 1;
          (d = i.length && i[h].merge(f)) ? i[h] = d : i.push(f);
        }
      } else s.map && r--;
    }, this.items.length, 0), new jt(He.from(i.reverse()), o);
  }
}
jt.empty = new jt(He.empty, 0);
function WN(t, e) {
  let n;
  return t.forEach((r, i) => {
    if (r.selection && e-- == 0)
      return n = i, !1;
  }), t.slice(n);
}
class Jt {
  constructor(e, n, r, i) {
    this.map = e, this.step = n, this.selection = r, this.mirrorOffset = i;
  }
  merge(e) {
    if (this.step && e.step && !e.selection) {
      let n = e.step.merge(this.step);
      if (n)
        return new Jt(n.getMap().invert(), n, this.selection);
    }
  }
}
class Vn {
  constructor(e, n, r, i, o) {
    this.done = e, this.undone = n, this.prevRanges = r, this.prevTime = i, this.prevComposition = o;
  }
}
const qN = 20;
function KN(t, e, n, r) {
  let i = n.getMeta(Rr), o;
  if (i)
    return i.historyState;
  n.getMeta(Uy) && (t = new Vn(t.done, t.undone, null, 0, -1));
  let s = n.getMeta("appendedTransaction");
  if (n.steps.length == 0)
    return t;
  if (s && s.getMeta(Rr))
    return s.getMeta(Rr).redo ? new Vn(t.done.addTransform(n, void 0, r, Gs(e)), t.undone, Rh(n.mapping.maps), t.prevTime, t.prevComposition) : new Vn(t.done, t.undone.addTransform(n, void 0, r, Gs(e)), null, t.prevTime, t.prevComposition);
  if (n.getMeta("addToHistory") !== !1 && !(s && s.getMeta("addToHistory") === !1)) {
    let l = n.getMeta("composition"), a = t.prevTime == 0 || !s && t.prevComposition != l && (t.prevTime < (n.time || 0) - r.newGroupDelay || !UN(n, t.prevRanges)), u = s ? Ia(t.prevRanges, n.mapping) : Rh(n.mapping.maps);
    return new Vn(t.done.addTransform(n, a ? e.selection.getBookmark() : void 0, r, Gs(e)), jt.empty, u, n.time, l ?? t.prevComposition);
  } else return (o = n.getMeta("rebased")) ? new Vn(t.done.rebased(n, o), t.undone.rebased(n, o), Ia(t.prevRanges, n.mapping), t.prevTime, t.prevComposition) : new Vn(t.done.addMaps(n.mapping.maps), t.undone.addMaps(n.mapping.maps), Ia(t.prevRanges, n.mapping), t.prevTime, t.prevComposition);
}
function UN(t, e) {
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
function Rh(t) {
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
function JN(t, e, n) {
  let r = Gs(e), i = Rr.get(e).spec.config, o = (n ? t.undone : t.done).popEvent(e, r);
  if (!o)
    return null;
  let s = o.selection.resolve(o.transform.doc), l = (n ? t.done : t.undone).addTransform(o.transform, e.selection.getBookmark(), i, r), a = new Vn(n ? l : o.remaining, n ? o.remaining : l, null, 0, -1);
  return o.transform.setSelection(s).setMeta(Rr, { redo: n, historyState: a });
}
let Aa = !1, Lh = null;
function Gs(t) {
  let e = t.plugins;
  if (Lh != e) {
    Aa = !1, Lh = e;
    for (let n = 0; n < e.length; n++)
      if (e[n].spec.historyPreserveItems) {
        Aa = !0;
        break;
      }
  }
  return Aa;
}
function Xr(t) {
  return t.setMeta(Uy, !0);
}
const Rr = new nt("history"), Uy = new nt("closeHistory");
function GN(t = {}) {
  return t = {
    depth: t.depth || 100,
    newGroupDelay: t.newGroupDelay || 500
  }, new je({
    key: Rr,
    state: {
      init() {
        return new Vn(jt.empty, jt.empty, null, 0, -1);
      },
      apply(e, n, r) {
        return KN(n, r, e, t);
      }
    },
    config: t,
    props: {
      handleDOMEvents: {
        beforeinput(e, n) {
          let r = n.inputType, i = r == "historyUndo" ? Mo : r == "historyRedo" ? oi : null;
          return !i || !e.editable ? !1 : (n.preventDefault(), i(e.state, e.dispatch));
        }
      }
    }
  });
}
function Jy(t, e) {
  return (n, r) => {
    let i = Rr.getState(n);
    if (!i || (t ? i.undone : i.done).eventCount == 0)
      return !1;
    if (r) {
      let o = JN(i, n, t);
      o && r(e ? o.scrollIntoView() : o);
    }
    return !0;
  };
}
const Mo = Jy(!1, !0), oi = Jy(!0, !0);
function Ji(t, e) {
  return Object.assign(t, { meta: {
    package: "@milkdown/plugin-history",
    ...e
  } }), t;
}
var df = Z("Undo", () => () => Mo);
Ji(df, { displayName: "Command<undo>" });
var hf = Z("Redo", () => () => oi);
Ji(hf, { displayName: "Command<redo>" });
var pf = In({}, "historyProviderConfig");
Ji(pf, { displayName: "Ctx<historyProviderConfig>" });
var Gy = nn((t) => GN(t.get(pf.key)));
Ji(Gy, { displayName: "Ctx<historyProviderPlugin>" });
var mf = wt("historyKeymap", {
  Undo: {
    shortcuts: "Mod-z",
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(df.key);
    }
  },
  Redo: {
    shortcuts: ["Mod-y", "Shift-Mod-z"],
    command: (t) => {
      const e = t.get(ge);
      return () => e.call(hf.key);
    }
  }
});
Ji(mf.ctx, { displayName: "KeymapCtx<history>" });
Ji(mf.shortcuts, { displayName: "Keymap<history>" });
var YN = [
  pf,
  Gy,
  mf,
  df,
  hf
].flat(), QN = typeof global == "object" && global && global.Object === Object && global, XN = typeof self == "object" && self && self.Object === Object && self, Yy = QN || XN || Function("return this")(), dl = Yy.Symbol, Qy = Object.prototype, ZN = Qy.hasOwnProperty, eI = Qy.toString, io = dl ? dl.toStringTag : void 0;
function tI(t) {
  var e = ZN.call(t, io), n = t[io];
  try {
    t[io] = void 0;
    var r = !0;
  } catch {
  }
  var i = eI.call(t);
  return r && (e ? t[io] = n : delete t[io]), i;
}
var nI = Object.prototype, rI = nI.toString;
function iI(t) {
  return rI.call(t);
}
var oI = "[object Null]", sI = "[object Undefined]", Ph = dl ? dl.toStringTag : void 0;
function lI(t) {
  return t == null ? t === void 0 ? sI : oI : Ph && Ph in Object(t) ? tI(t) : iI(t);
}
function aI(t) {
  return t != null && typeof t == "object";
}
var uI = "[object Symbol]";
function cI(t) {
  return typeof t == "symbol" || aI(t) && lI(t) == uI;
}
var fI = /\s/;
function dI(t) {
  for (var e = t.length; e-- && fI.test(t.charAt(e)); )
    ;
  return e;
}
var hI = /^\s+/;
function pI(t) {
  return t && t.slice(0, dI(t) + 1).replace(hI, "");
}
function Su(t) {
  var e = typeof t;
  return t != null && (e == "object" || e == "function");
}
var zh = NaN, mI = /^[-+]0x[0-9a-f]+$/i, gI = /^0b[01]+$/i, yI = /^0o[0-7]+$/i, kI = parseInt;
function Bh(t) {
  if (typeof t == "number")
    return t;
  if (cI(t))
    return zh;
  if (Su(t)) {
    var e = typeof t.valueOf == "function" ? t.valueOf() : t;
    t = Su(e) ? e + "" : e;
  }
  if (typeof t != "string")
    return t === 0 ? t : +t;
  t = pI(t);
  var n = gI.test(t);
  return n || yI.test(t) ? kI(t.slice(2), n ? 2 : 8) : mI.test(t) ? zh : +t;
}
var Ea = function() {
  return Yy.Date.now();
}, bI = "Expected a function", wI = Math.max, xI = Math.min;
function CI(t, e, n) {
  var r, i, o, s, l, a, u = 0, c = !1, f = !1, d = !0;
  if (typeof t != "function")
    throw new TypeError(bI);
  e = Bh(e) || 0, Su(n) && (c = !!n.leading, f = "maxWait" in n, o = f ? wI(Bh(n.maxWait) || 0, e) : o, d = "trailing" in n ? !!n.trailing : d);
  function h(T) {
    var F = r, U = i;
    return r = i = void 0, u = T, s = t.apply(U, F), s;
  }
  function p(T) {
    return u = T, l = setTimeout(w, e), c ? h(T) : s;
  }
  function k(T) {
    var F = T - a, U = T - u, G = e - F;
    return f ? xI(G, o - U) : G;
  }
  function b(T) {
    var F = T - a, U = T - u;
    return a === void 0 || F >= e || F < 0 || f && U >= o;
  }
  function w() {
    var T = Ea();
    if (b(T))
      return L(T);
    l = setTimeout(w, k(T));
  }
  function L(T) {
    return l = void 0, d && r ? h(T) : (r = i = void 0, s);
  }
  function O() {
    l !== void 0 && clearTimeout(l), u = 0, r = a = i = l = void 0;
  }
  function W() {
    return l === void 0 ? s : L(Ea());
  }
  function j() {
    var T = Ea(), F = b(T);
    if (r = arguments, i = this, a = T, F) {
      if (l === void 0)
        return p(a);
      if (f)
        return clearTimeout(l), l = setTimeout(w, e), h(a);
    }
    return l === void 0 && (l = setTimeout(w, e)), s;
  }
  return j.cancel = O, j.flush = W, j;
}
var Xy = class {
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
}, vu = ue(new Xy(), "listener"), SI = new nt("MILKDOWN_LISTENER"), Zy = (t) => (t.inject(vu, new Xy()), async () => {
  await t.wait(Or);
  const { listeners: e } = t.get(vu);
  e.beforeMount.forEach((u) => u(t)), await t.wait(So);
  const n = t.get(vo);
  let r = null, i = null, o = null, s = null;
  const l = CI(() => {
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
  }, 200), a = new je({
    key: SI,
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
  t.update(Tn, (u) => u.concat(a)), await t.wait(qs), e.mounted.forEach((u) => u(t));
});
Zy.meta = {
  package: "@milkdown/plugin-listener",
  displayName: "Listener"
};
const vI = [Sy()], MI = [hy()];
function ek(t, e = "Markdown") {
  const n = String(t || ""), { body: r, frontmatterLines: i } = tk(n), s = Ou(r, { extensions: vI, mdastExtensions: MI }).children || [];
  for (let l = 0; l < s.length; l += 1) {
    const a = s[l];
    if (a.type !== "heading" || a.depth !== 1) continue;
    const u = Mu(a.children);
    if (!u) continue;
    const c = s[l - 1], f = s[l + 1];
    if (c && f && c.type === "html" && NI(c.value) && f.type === "html" && II(f.value))
      return {
        displayText: u,
        source: "aligned-h1",
        isFileNameFallback: !1,
        locator: {
          kind: "aligned-lines",
          startLine: Oa(c.position, i),
          endLine: Fh(f.position, i),
          titleLine: Oa(a.position, i)
        }
      };
    const d = Oa(a.position, i), h = Fh(a.position, i);
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
function TI(t, e, n = {}) {
  const r = String(e || "").trim();
  if (!r)
    return String(t || "");
  const i = String(t || ""), o = n.newline || (i.includes(`\r
`) ? `\r
` : `
`), s = i.split(/\r?\n/), l = ek(i, "");
  if (l.locator) {
    const { kind: u, titleLine: c } = l.locator;
    return u === "setext-lines" ? s[c] = r : s[c] = `# ${r}`, s.join(o);
  }
  const { frontmatterLines: a } = tk(i);
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
function Mu(t) {
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
        e += Mu(n.children);
        break;
      case "image":
        e += n.alt || "";
        break;
      case "emphasis":
      case "strong":
      case "delete":
        e += Mu(n.children);
        break;
      case "break":
        e += " ";
        break;
    }
  return e.trim();
}
function tk(t) {
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
function Fh(t, e) {
  return (t && t.end ? t.end.line : 1) - 1 + e;
}
function NI(t) {
  const e = String(t || "").trim().toLowerCase();
  return e === '<div align="center">' || e === '<div align="right">';
}
function II(t) {
  return String(t || "").trim().toLowerCase() === "</div>";
}
const hl = /* @__PURE__ */ new WeakMap(), $h = ["name", "description", "trigger_keywords"], Da = [
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
function AI(t = "") {
  const e = String(t || ""), n = e.match(/^---[ \t]*(?:\r?\n)([\s\S]*?)(?:\r?\n)---[ \t]*(?:\r?\n|$)/);
  return n ? {
    raw: n[0],
    body: e.slice(n[0].length),
    fields: LI(n[1] || "")
  } : null;
}
function EI(t = "") {
  return (String(t || "").split(/[\\/]/).pop() || "").toLowerCase() === "skill.md";
}
function pl(t = "") {
  return String(t || "").trim().replace(/^['"]|['"]$/g, "").trim();
}
function OI(t = "") {
  const e = String(t || "").trim();
  if (e.startsWith("[") && e.endsWith("]"))
    return e.slice(1, -1).split(",").map(pl).filter(Boolean);
  const n = pl(e);
  return n ? [n] : [];
}
function DI(t = "") {
  const e = String(t || "").match(/(?:^|\s)Triggers:\s*([\s\S]+)$/i);
  return e ? e[1].split(",").map((n) => pl(n.replace(/\.$/, ""))).filter(Boolean) : [];
}
function RI(t = "") {
  return String(t || "").replace(/\s*Triggers:\s*[\s\S]+$/i, "").trim();
}
function LI(t = "") {
  const e = [];
  let n = -1, r = -1, i = !1;
  return String(t || "").split(/\r?\n/).forEach((o) => {
    const s = o.trim();
    if (!s) return;
    if (s.startsWith("- ")) {
      if (n >= 0) {
        const c = pl(s.slice(2));
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
      e.push({ key: a, values: OI(u) }), r = -1;
    }
  }), e;
}
function _h(t, e) {
  return ((t == null ? void 0 : t.fields) || []).find((n) => n.key === e) || null;
}
function To(t, e) {
  var r, i;
  const n = _h(t, e);
  if (n && e === "description")
    return (n.values || []).map(RI).filter(Boolean);
  if (n) return n.values || [];
  if (e === "trigger_keywords") {
    const o = ((i = (r = _h(t, "description")) == null ? void 0 : r.values) == null ? void 0 : i[0]) || "";
    return DI(o);
  }
  return [];
}
function PI(t, e, n) {
  if (!t) return;
  const r = n.map((o) => String(o || "").trim()).filter(Boolean), i = t.fields.find((o) => o.key === e);
  i ? i.values = r : t.fields.push({ key: e, values: r });
}
function zI(t = "") {
  return String(t || "").replace(/^---[ \t]*(?:\r?\n)?/, "").replace(/(?:\r?\n)?---[ \t]*(?:\r?\n)?$/, "").split(/\r?\n/);
}
function BI(t = "") {
  const e = [];
  let n = null;
  return zI(t).forEach((r) => {
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
function Vh(t, e = []) {
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
function FI(t) {
  if (!t) return "";
  const e = /* @__PURE__ */ new Set(), n = [];
  return BI(t.raw).forEach((r) => {
    if ($h.includes(r.key)) {
      e.add(r.key), n.push(...Vh(r.key, To(t, r.key)));
      return;
    }
    n.push(...r.lines);
  }), $h.forEach((r) => {
    e.has(r) || n.push(...Vh(r, To(t, r)));
  }), `---
${n.filter((r, i, o) => {
    var s;
    return r.trim() || ((s = o[i - 1]) == null ? void 0 : s.trim());
  }).join(`
`).trim()}
---
`;
}
function $I(t) {
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
function _I(t, e, n) {
  !t || !e || t.querySelectorAll("[data-frontmatter-field]").forEach((r) => {
    r.addEventListener("input", () => {
      const i = r.dataset.frontmatterField, o = r.value || "", s = i === "trigger_keywords" ? o.split(/[,\n]/).map((l) => l.trim()).filter(Boolean) : [o.trim()];
      PI(e, i, s), n == null || n();
    });
  });
}
function Hh(t = "") {
  const e = String(t || "").trim(), n = Da.some((r) => r.value === e);
  return !e || n ? Da : [
    ...Da,
    { value: e, label: e }
  ];
}
const Kt = {
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
}, nk = /(?:^|\s)nutbook-align=(left|center|right)(?=\s|$)/i, rk = /(?:^|\s)nutbook-size=(small|medium|large)(?=\s|$)/i, rt = "portable_image", VI = Object.freeze({ small: 160, medium: 480 }), kr = "<!-- nutbook-cover -->", pt = "markdown_cover_image", Bi = "aligned_text_block", Lr = Object.freeze(["center", "right"]);
function jh(t, e) {
  const n = e.nodes.heading;
  if (!n)
    return null;
  let r = null;
  return t.descendants((i, o, s) => r ? !1 : s === t ? i.type === n && i.attrs.level === 1 && i.textContent.trim() ? (r = { pos: o, node: i }, !1) : i.type.name === Bi : (s.type.name === Bi && i.type === n && i.attrs.level === 1 && i.textContent.trim() && (r = { pos: o, node: i }), !1)), r;
}
function si(t) {
  return Array.from((t == null ? void 0 : t.childNodes) || []).filter((e) => e.nodeType !== Node.TEXT_NODE || String(e.textContent || "").trim() !== "");
}
function La(t, e) {
  const n = new Set(e);
  return t.getAttributeNames().every((r) => n.has(r.toLowerCase()));
}
function Wh(t, e = "src") {
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
function HI(t = "") {
  const e = String(t || "");
  if (!e.trim() || typeof DOMParser != "function") return null;
  const n = new DOMParser().parseFromString(`<!doctype html><body>${e}</body>`, "text/html"), r = si(n.body);
  if (r.length !== 1 || r[0].nodeType !== Node.ELEMENT_NODE) return null;
  let i = r[0], o = "";
  if (i.tagName === "P") {
    if (!La(i, ["align"]) || (o = String(i.getAttribute("align") || "").toLowerCase(), !["left", "center", "right"].includes(o))) return null;
    const f = si(i);
    if (f.length !== 1 || f[0].nodeType !== Node.ELEMENT_NODE) return null;
    i = f[0];
  }
  let s = "", l = "";
  if (i.tagName === "A") {
    if (!La(i, ["href", "title"]) || (s = String(i.getAttribute("href") || "").trim(), l = String(i.getAttribute("title") || ""), !Wh(s, "href"))) return null;
    const f = si(i);
    if (f.length !== 1 || f[0].nodeType !== Node.ELEMENT_NODE) return null;
    i = f[0];
  }
  if (i.tagName !== "IMG" || !La(i, ["src", "alt", "title", "width"]) || si(i).length > 0) return null;
  const a = String(i.getAttribute("src") || "").trim();
  if (!Wh(a, "src")) return null;
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
function ik(t = {}) {
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
function gf(t) {
  if (!t || typeof t != "object" || (Array.isArray(t.children) && t.children.forEach(gf), t.type !== "html" || typeof t.value != "string")) return;
  const e = HI(t.value);
  e && (Object.keys(t).forEach((n) => {
    n !== "position" && delete t[n];
  }), Object.assign(t, { type: "portableImage", ...e }));
}
const jI = rn("portableImageRemark", () => () => (t) => {
  gf(t);
});
function WI(t = "") {
  const e = String(t || "").trim();
  if (!e || typeof DOMParser != "function" || !/^<div(?:\s|>)/i.test(e)) return null;
  const n = new DOMParser().parseFromString(`<!doctype html><body>${e}</div></body>`, "text/html"), r = si(n.body);
  if (r.length !== 1 || r[0].nodeType !== Node.ELEMENT_NODE) return null;
  const i = r[0];
  if (i.tagName !== "DIV" || si(i).length > 0) return null;
  const o = i.getAttributeNames();
  if (o.length !== 1 || o[0].toLowerCase() !== "align") return null;
  const s = String(i.getAttribute("align") || "").toLowerCase();
  return Lr.includes(s) ? s : null;
}
function qI(t = "") {
  return /^<\/div\s*>$/i.test(String(t || "").trim());
}
function ok(t) {
  return !t || typeof t != "object" ? !1 : ["html", "image", "portableImage", "alignedTextBlock"].includes(t.type) ? !0 : Array.isArray(t.children) && t.children.some(ok);
}
function KI(t) {
  if (!Array.isArray(t == null ? void 0 : t.children)) return;
  const e = t.children;
  for (let n = 0; n <= e.length - 3; n += 1) {
    const r = e[n], i = e[n + 1], o = e[n + 2];
    if ((r == null ? void 0 : r.type) !== "html" || (o == null ? void 0 : o.type) !== "html" || !i || !["paragraph", "heading"].includes(i.type)) continue;
    const s = WI(r.value);
    !s || !qI(o.value) || ok(i) || e.splice(n, 3, {
      type: "alignedTextBlock",
      alignment: s,
      sourceSyntax: "github-div-align",
      children: [i]
    });
  }
}
const UI = rn("alignedTextRemark", () => () => (t) => {
  KI(t);
}), JI = Ie(Bi, () => ({
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
    match: (t) => t.type.name === Bi,
    runner: (t, e) => {
      const n = String(e.attrs.alignment || "").toLowerCase();
      if (!Lr.includes(n) || e.childCount !== 1)
        throw new Error("Invalid aligned text block");
      t.addNode("html", void 0, `<div align="${n}">`).next(e.content).addNode("html", void 0, "</div>");
    }
  }
})), GI = Ie(rt, () => ({
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
    match: (t) => t.type.name === rt,
    runner: (t, e) => {
      const n = !e.attrs.presentationDirty && e.attrs.rawSource ? e.attrs.rawSource : ik(e.attrs);
      t.addNode("html", void 0, n);
    }
  }
}));
function YI(t) {
  return (t == null ? void 0 : t.type) === "html" && String((t == null ? void 0 : t.value) || "").trim() === kr;
}
function Pa(t, e) {
  var i, o, s, l;
  const n = (o = (i = e == null ? void 0 : e.position) == null ? void 0 : i.start) == null ? void 0 : o.offset, r = (l = (s = e == null ? void 0 : e.position) == null ? void 0 : s.end) == null ? void 0 : l.offset;
  return t && Number.isInteger(n) && Number.isInteger(r) && r > n && r <= t.length ? t.slice(n, r) : null;
}
function QI(t, e) {
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
      alignment: Wr(n.title || ""),
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
      alignment: Wr(i.title || ""),
      displayWidthPx: null,
      linkHref: n.url || "",
      linkTitle: n.title || "",
      rawSource: Pa(e, t) || ""
    };
  }
  return null;
}
function sk(t, e) {
  const n = t == null ? void 0 : t.children;
  if (!Array.isArray(n)) return [];
  const r = [];
  for (let i = 0; i < n.length; i += 1) {
    const o = n[i];
    if (!YI(o)) continue;
    const s = QI(n[i + 1], e);
    s && r.push({ markerIndex: i, blockIndex: i + 1, block: s });
  }
  return r;
}
function XI(t, e) {
  const n = [];
  if (!Array.isArray(t == null ? void 0 : t.children)) return n;
  const r = sk(t, e);
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
function ZI(t) {
  const e = Ou(String(t || ""));
  gf(e);
  const n = sk(e, null).length;
  return { count: n, duplicate: n > 1 };
}
function eA(t) {
  return String(t || "").replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\n/g, " ");
}
function qh(t) {
  return `"${String(t || "").replace(/"/g, '\\"')}"`;
}
function Kh(t) {
  const e = String(t || "");
  return e && (/[\s<>]/.test(e) ? `<${e.replace(/</g, "\\<").replace(/>/g, "\\>").replace(/\n/g, " ")}>` : e.replace(/[()]/g, (n) => `\\${n}`));
}
function tA(t = {}) {
  if (t.nodeKind === "portable-image") return ik(t);
  const e = ["left", "center", "right"].includes(t.alignment) ? `nutbook-align=${t.alignment}` : "", n = [t.title, e].filter(Boolean), r = n.length ? ` ${qh(n.join(" "))}` : "", i = `![${eA(t.alt)}](${Kh(t.src)}${r})`;
  if (t.nodeKind === "linked-image") {
    const o = t.linkTitle ? ` ${qh(t.linkTitle)}` : "";
    return `[${i}](${Kh(t.linkHref)}${o})`;
  }
  return i;
}
const nA = Ie(pt, () => ({
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
    const o = ["img", i], s = e.linkHref ? ["a", { href: e.linkHref, title: e.linkTitle || null }, o] : o, l = { class: "markdown-cover-media", "data-cover-badge": rA() };
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
    match: (t) => t.type.name === pt,
    runner: (t, e) => {
      const n = e.attrs, r = !n.presentationDirty && n.rawSource ? n.rawSource : tA(n);
      t.addNode("html", void 0, `${kr}
${r}`);
    }
  }
}));
function rA() {
  var e, n;
  const t = typeof window < "u" ? window.NutbookI18n : null;
  return ((n = t == null ? void 0 : t.lookup) == null ? void 0 : n.call(t, "markdown.coverBadge", (e = t.currentLanguage) == null ? void 0 : e.call(t))) || "封面";
}
function Rs(t) {
  var n, r;
  let e = null;
  return (r = (n = t == null ? void 0 : t.doc) == null ? void 0 : n.descendants) == null || r.call(n, (i, o) => i.type.name === pt ? (e = { node: i, pos: o }, !1) : !0), e;
}
function Uh(t) {
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
function Jh(t) {
  const e = t.attrs.title || "";
  return {
    nodeKind: "image",
    src: t.attrs.src || "",
    alt: t.attrs.alt || "",
    title: e,
    alignment: Wr(e),
    displayWidthPx: null,
    linkHref: "",
    linkTitle: "",
    rawSource: ""
  };
}
function Tu(t) {
  if (!(t != null && t.marks)) return null;
  for (let e = 0; e < t.marks.length; e += 1)
    if (t.marks[e].type.name === "link") return t.marks[e];
  return null;
}
function Gh(t, e) {
  const n = t.attrs.title || "";
  return {
    nodeKind: "linked-image",
    src: t.attrs.src || "",
    alt: t.attrs.alt || "",
    title: n,
    alignment: Wr(n),
    displayWidthPx: null,
    linkHref: (e == null ? void 0 : e.attrs.href) || "",
    linkTitle: (e == null ? void 0 : e.attrs.title) || "",
    rawSource: ""
  };
}
function Ls(t, e) {
  return t.nodes[pt].create({
    ...e,
    markerRaw: kr,
    presentationDirty: e.presentationDirty ?? !1
  });
}
function oo(t, e) {
  const n = t.nodes.image, r = t.nodes.paragraph;
  if (e.nodeKind === "portable-image")
    return t.nodes[rt].create({ ...e, presentationDirty: !1 });
  const i = n.create({ src: e.src, alt: e.alt, title: e.title || null });
  if (e.nodeKind === "linked-image") {
    const o = t.marks.link;
    if (o)
      return r.create(null, i.mark([o.create({ href: e.linkHref, title: e.linkTitle || null })]));
  }
  return r.create(null, i);
}
function iA(t, e) {
  const n = t.schema, r = n.nodes.image, i = n.nodes[rt], o = n.nodes.paragraph;
  if (!r || !o || !i) return null;
  const s = Math.max(0, Math.min(Number(e) || 0, t.doc.content.size)), l = t.doc.nodeAt(s);
  if (l) {
    if (l.type === i)
      return { blockStart: s, blockEnd: s + l.nodeSize, attrs: Uh(l) };
    if (l.type === o && l.childCount === 1) {
      const u = l.firstChild;
      if (u.type === r) {
        const c = Tu(u);
        return {
          blockStart: s,
          blockEnd: s + l.nodeSize,
          attrs: c ? Gh(u, c) : Jh(u)
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
        attrs: Uh(c)
      };
    if (c.type === o && c.childCount === 1) {
      const f = c.firstChild;
      if (f.type === r) {
        const d = Tu(f);
        return {
          blockStart: a.before(u),
          blockEnd: a.after(u),
          attrs: d ? Gh(f, d) : Jh(f)
        };
      }
      return null;
    }
  }
  return null;
}
function Wr(t = "") {
  var n;
  const e = String(t || "").match(nk);
  return ((n = e == null ? void 0 : e[1]) == null ? void 0 : n.toLowerCase()) || "";
}
function Nu(t = "") {
  var n;
  const e = String(t || "").match(rk);
  return ((n = e == null ? void 0 : e[1]) == null ? void 0 : n.toLowerCase()) || "large";
}
function oA(t = "") {
  return String(t || "").replace(nk, " ").replace(rk, " ").replace(/\s+/g, " ").trim();
}
function sA(t) {
  if (!t) return "";
  if (t.dataset.nutbookPortableImage === "true")
    return t.dataset.nutbookImageAlign || "";
  const e = Wr(t.getAttribute("title") || ""), n = Nu(t.getAttribute("title") || "");
  return ["left", "center", "right"].forEach((r) => {
    t.classList.toggle(`nutbook-image-align-${r}`, e === r);
  }), ["small", "medium", "large"].forEach((r) => {
    t.classList.toggle(`nutbook-image-size-${r}`, n === r);
  }), t.dataset.nutbookImageAlign = e, t.dataset.nutbookImageSize = n, e;
}
function lk(t) {
  const e = hl.get(t);
  e && (e.destroy(), hl.delete(t));
}
function Yh(t) {
  return String(t || "").replace(/\s+/g, " ").trim();
}
function yf(t) {
  var n, r;
  const e = t == null ? void 0 : t.$from;
  if (!e) return !1;
  for (let i = e.depth; i > 0; i -= 1) {
    const o = (r = (n = e.node(i)) == null ? void 0 : n.type) == null ? void 0 : r.name;
    if (o === "list_item" || o === "listItem") return !0;
  }
  return !1;
}
function lA(t) {
  var r;
  const { selection: e } = t;
  if (!(e != null && e.empty)) return !1;
  const { $from: n } = e;
  return !((r = n.parent) != null && r.isTextblock) || n.parentOffset !== 0 ? !1 : yf(e);
}
function aA(t, e, n) {
  if (!lA(t)) return !1;
  const r = t.schema.nodes.list_item || t.schema.nodes.listItem;
  return r ? vg(r)(t, e, n) : !1;
}
function uA() {
  return new je({
    props: {
      handlePaste(t, e) {
        var o, s;
        const n = (o = e.clipboardData) == null ? void 0 : o.getData("text/plain"), r = ((s = e.clipboardData) == null ? void 0 : s.getData("text/html")) || "";
        return !n || !r || yf(t.state.selection) || !(/<(ol|ul|li)\b/i.test(r) || /data-list-type=/i.test(r)) ? !1 : (e.preventDefault(), t.dispatch(t.state.tr.insertText(n).scrollIntoView()), !0);
      }
    }
  });
}
function Qh(t) {
  var n;
  const e = /* @__PURE__ */ new Set();
  return (n = t == null ? void 0 : t.descendants) == null || n.call(t, (r) => {
    var i, o, s, l;
    return ["image", rt].includes((i = r.type) == null ? void 0 : i.name) && ((o = r.attrs) != null && o.src) && e.add(String(r.attrs.src)), ((s = r.type) == null ? void 0 : s.name) === pt && ((l = r.attrs) != null && l.src) && e.add(String(r.attrs.src)), !0;
  }), e;
}
function cA(t) {
  return typeof t != "function" ? null : new je({
    view(e) {
      let n = Qh(e.state.doc), r = null;
      const i = () => {
        r = null;
        const s = Qh(e.state.doc);
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
function fA(t) {
  const e = (r) => {
    const i = r.dataset.nutbookOriginalSrc || r.getAttribute("src") || "";
    if (typeof t == "function") {
      const o = t(i);
      o && o !== r.getAttribute("src") && (r.dataset.nutbookOriginalSrc = i, r.setAttribute("src", o));
    }
    sA(r);
  }, n = (r) => {
    r.querySelectorAll("img[src]").forEach(e);
  };
  return new je({
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
function Xh(t) {
  var n, r;
  if (!t) return !1;
  if (["image", rt].includes((n = t.type) == null ? void 0 : n.name)) return !0;
  let e = !1;
  return (r = t.descendants) == null || r.call(t, (i) => {
    var o;
    return ["image", rt].includes((o = i.type) == null ? void 0 : o.name) ? (e = !0, !1) : !e;
  }), e;
}
function Zh(t, e = t == null ? void 0 : t.selection) {
  if (!t || !e || e.empty || e.from >= e.to)
    return { supported: !1, targets: [], alignment: "" };
  const n = t.schema.nodes.paragraph, r = t.schema.nodes.heading, i = t.schema.nodes[Bi];
  if (!n || !r || !i)
    return { supported: !1, targets: [], alignment: "" };
  const o = [];
  let s = !1;
  if (t.doc.forEach((u, c) => {
    const f = c + (u.type === i ? 2 : 1);
    if (!(e.from >= c + u.nodeSize || e.to <= f)) {
      if (u.type === n || u.type === r) {
        if (Xh(u)) {
          s = !0;
          return;
        }
        o.push({ pos: c, node: u, alignment: "left" });
        return;
      }
      if (u.type === i) {
        const d = u.childCount === 1 ? u.child(0) : null;
        if (!d || ![n, r].includes(d.type) || Xh(d)) {
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
async function dA({ root: t, markdown: e = "", fileName: n = "", language: r = null, onChange: i = null, onEdit: o = null, tableToolsEnabled: s = !0, resolveImageSrc: l = null, onInsertImageAsset: a = null, onInsertCoverAsset: u = null, onReleaseCoverAsset: c = null, onValidateCoverAsset: f = null, onRemoveImageAsset: d = null, onImageSizeError: h = null, onCoverChange: p = null }) {
  if (!t)
    throw new Error("Milkdown root is required");
  const k = window.NutbookI18n, b = (m) => {
    var g, y;
    return ((y = k == null ? void 0 : k.lookup) == null ? void 0 : y.call(k, m, r || ((g = k.currentLanguage) == null ? void 0 : g.call(k)))) ?? m;
  };
  lk(t), t.innerHTML = "";
  const w = AI(e), L = EI(n) ? w : null, O = w ? w.body : e, W = ZI(O);
  if (W.duplicate)
    throw new Error(
      `document declares ${W.count} valid \`<!-- nutbook-cover -->\` markers; only one cover identity is allowed — repair the source before editing`
    );
  const j = document.createElement("div");
  j.className = "milkdown-editor-body";
  const T = $I(L);
  T && t.appendChild(T), t.appendChild(j);
  let F = e, U = !1, G = !1, N = !1, q = !1, $ = null, ce = null, be = !1, ie = null, Ne = null, pe = null, Le = null, at = !1, x = null, Pe = null, ut = !1, S = !1, Ae = null, le = null, xe = null, oe = null, ze = null, ct = null, Ee = null, ln = e, On = [];
  const Dl = rn("coverImageRemark", () => () => (m) => {
    On = XI(m, O);
  }), Dn = /* @__PURE__ */ new Map(), Be = () => {
    U || o == null || o(), U = !0, ut && un();
  };
  _I(T, L, () => {
    Be(), G = !0, Qi(80);
  });
  const bs = [], Gi = (m) => {
    m.isComposing || m.key === "Process" || !(m.metaKey || m.ctrlKey) || m.altKey || m.key.toLowerCase() !== "z" || !ae() || !zl(m.shiftKey ? oi : Mo) || (m.preventDefault(), m.stopPropagation());
  };
  t.addEventListener("keydown", Gi, !0);
  const Ge = await av.make().config((m) => {
    m.set(Ks, j), m.set(Hs, O), m.update(Tn, (g) => [
      Tm({
        "Mod-z": Mo,
        "Shift-Mod-z": oi,
        "Mod-y": oi,
        Backspace: aA
      }),
      uA(),
      cA(d),
      fA(l),
      ...g
    ].filter(Boolean)), m.update(vu, (g) => g.updated(() => {
      q && (G = !0, Qi());
    }));
  }).use(UI).use(jI).use(Dl).use(Hv).use(VN).use(JI).use(GI).use(nA).use(YN).use(Zy).create(), Kr = () => N ? F : Ge.action((m) => {
    const g = m.get(Oe), C = m.get(vo)(g.state.doc), v = L ? FI(L) : (w == null ? void 0 : w.raw) || "";
    return F = w ? `${v}${C}` : C, F;
  }), Yi = Kr();
  ln = Yi, queueMicrotask(() => {
    N || (q = !0, Lk(), Ef(), yk(), Mk(), pk(), Fe(), $e(), _e(), It());
  });
  function ae() {
    return N ? null : Ge.action((m) => m.get(Oe));
  }
  function lr() {
    var m;
    return !!((m = ae()) != null && m.composing);
  }
  function ws() {
    if (Ee = null, N || !q) return;
    const m = ae();
    if (m != null && m.composing) {
      Qi(180);
      return;
    }
    const g = Kr();
    U || (o == null || o(), U = !0), g !== ln && (ln = g, i == null || i(g));
  }
  function Qi(m = 260) {
    q && (Ee && clearTimeout(Ee), Ee = window.setTimeout(ws, m));
  }
  function Rl(m) {
    var v, A, I;
    if (!m || !Ve(m.state)) return null;
    const { from: g } = m.state.selection, y = m.domAtPos(g), C = ((v = y.node) == null ? void 0 : v.nodeType) === Node.ELEMENT_NODE ? y.node : (A = y.node) == null ? void 0 : A.parentElement;
    return ((I = C == null ? void 0 : C.closest) == null ? void 0 : I.call(C, "table")) || null;
  }
  function E(m) {
    const g = ae();
    if (!g) return !1;
    const y = m(g.state, g.dispatch, g);
    return y && (Be(), g.focus(), Fe(), $e(), _e()), y;
  }
  function z(m) {
    var C, v, A;
    const g = m == null ? void 0 : m.state.selection;
    if (!m || !(g != null && g.empty) || Ve(m.state) || yf(g)) return null;
    const { $from: y } = g;
    return !((C = y.parent) != null && C.isTextblock) || ((v = y.parent.type) == null ? void 0 : v.name) !== "paragraph" || ((A = y.parent.content) == null ? void 0 : A.size) > 0 || y.parent.textContent.trim() ? null : {
      from: g.from,
      blockStart: y.before(y.depth),
      blockEnd: y.after(y.depth)
    };
  }
  function ee(m) {
    var y, C, v, A;
    const g = z(m);
    if (!m || !g) return null;
    try {
      const I = m.nodeDOM(g.blockStart);
      if ((I == null ? void 0 : I.nodeType) === Node.ELEMENT_NODE && ((y = I.matches) != null && y.call(I, "p")))
        return I;
      const P = m.domAtPos(g.from), _ = ((C = P.node) == null ? void 0 : C.nodeType) === Node.ELEMENT_NODE ? P.node : (v = P.node) == null ? void 0 : v.parentElement;
      return ((A = _ == null ? void 0 : _.closest) == null ? void 0 : A.call(_, "p")) || null;
    } catch {
      return null;
    }
  }
  function ne(m) {
    if (!m || !Ae) return !1;
    const g = Math.max(1, Math.min(Ae.from, m.state.doc.content.size));
    try {
      return m.dispatch(m.state.tr.setSelection(Q.create(m.state.doc, g))), !0;
    } catch {
      return !1;
    }
  }
  function me(m, g = null) {
    const y = ae();
    if (!y) return !1;
    ne(y);
    const C = z(y);
    if (!C) return !1;
    const v = y.state.tr.replaceWith(C.blockStart, C.blockEnd, m), A = Number.isFinite(g) ? C.blockStart + g : C.blockStart + m.nodeSize, I = Math.max(1, Math.min(A, v.doc.content.size));
    return v.setSelection(Q.near(v.doc.resolve(I), Number.isFinite(g) ? 1 : -1)), y.dispatch(v.scrollIntoView()), Be(), y.focus(), un(), Fe(), $e(), It(), !0;
  }
  function Ye(m) {
    const g = ae();
    if (!g) return !1;
    ne(g);
    const y = g.state.schema.nodes.heading;
    return !y || !z(g) ? !1 : (un(), E(xn(y, { level: m })));
  }
  function an() {
    const m = ae();
    if (!m) return !1;
    ne(m);
    const g = m.state.schema.nodes.code_block;
    return !g || !z(m) ? !1 : (un(), E(xn(g, { language: "" })));
  }
  function $t() {
    const m = ae(), g = m == null ? void 0 : m.state.schema.nodes, y = (g == null ? void 0 : g.bullet_list) || (g == null ? void 0 : g.bulletList), C = (g == null ? void 0 : g.list_item) || (g == null ? void 0 : g.listItem), v = g == null ? void 0 : g.paragraph;
    if (!m || !y || !C || !v) return !1;
    const A = y.create(null, [
      C.create(null, v.create())
    ]);
    return me(A, 3);
  }
  function ar() {
    const m = ae(), g = m == null ? void 0 : m.state.schema.nodes, y = (g == null ? void 0 : g.ordered_list) || (g == null ? void 0 : g.orderedList), C = (g == null ? void 0 : g.list_item) || (g == null ? void 0 : g.listItem), v = g == null ? void 0 : g.paragraph;
    if (!m || !y || !C || !v) return !1;
    const A = y.create({ order: 1 }, [
      C.create(null, v.create())
    ]);
    return me(A, 3);
  }
  function ur() {
    const m = ae(), g = m == null ? void 0 : m.state.schema.nodes, y = g == null ? void 0 : g.table, C = (g == null ? void 0 : g.table_row) || (g == null ? void 0 : g.tableRow), v = (g == null ? void 0 : g.table_cell) || (g == null ? void 0 : g.tableCell), A = (g == null ? void 0 : g.table_header_row) || (g == null ? void 0 : g.tableHeaderRow), I = (g == null ? void 0 : g.table_header) || (g == null ? void 0 : g.tableHeader);
    if (!m || !y || !C || !v || !A || !I) return !1;
    ne(m);
    const P = z(m);
    if (!P) return !1;
    const _ = (Te) => {
      var ye;
      return ((ye = Te.createAndFill) == null ? void 0 : ye.call(Te)) || Te.create();
    }, H = (Te) => [0, 1, 2].map(() => _(Te)), re = y.create(null, [
      A.create(null, H(I)),
      C.create(null, H(v)),
      C.create(null, H(v))
    ]), fe = m.state.tr.replaceWith(P.blockStart, P.blockEnd, re), Ce = te.findFrom(fe.doc.resolve(P.blockStart), 1, !0);
    return Ce && fe.setSelection(Ce), m.dispatch(fe.scrollIntoView()), Be(), m.focus(), un(), Fe(), $e(), It(), !0;
  }
  function Qe(m = "") {
    return (String(m || "").split(/[\\/]/).pop() || "image").replace(/\.[^.]+$/, "") || "image";
  }
  function Rn(m, g = "") {
    const y = ae(), C = y == null ? void 0 : y.state.schema.nodes.image, v = y == null ? void 0 : y.state.schema.nodes.paragraph;
    if (!y || !C || !v || !m) return !1;
    const A = C.create({
      src: m,
      alt: Qe(g || m),
      title: ""
    });
    return me(v.create(null, [A]));
  }
  async function _t() {
    if (typeof a != "function") return !1;
    const m = ae();
    if (!m || !z(m)) return !1;
    Ae = { from: m.state.selection.from }, xs({ preserveSelection: !0 });
    let g = null;
    try {
      g = await a();
    } catch (y) {
      console.warn("Markdown image insert failed", y);
    }
    return g != null && g.relativePath ? Rn(g.relativePath, g.fileName) : (Ae = null, _e(), !1);
  }
  async function ak() {
    if (typeof u != "function") return !1;
    const m = ae();
    if (!m || !z(m)) return !1;
    Ae = { from: m.state.selection.from }, xs({ preserveSelection: !0 });
    let g = null;
    try {
      g = await u();
    } catch (C) {
      console.warn("Markdown cover insert failed", C);
    }
    if (!(g != null && g.relativePath) || N || lr())
      return g != null && g.stagedAssetId && typeof c == "function" && await c(g), Ae = null, _e(), !1;
    const y = uk(g);
    return !y && g.stagedAssetId && typeof c == "function" && await c(g), y;
  }
  function uk(m) {
    const g = ae();
    if (!g || g.composing || On.some((Ce) => Ce.kind === "duplicate")) return !1;
    ne(g);
    const y = z(g);
    if (!y) return !1;
    const C = g.state.schema;
    if (!C.nodes[pt]) return !1;
    const A = Ls(C, {
      nodeKind: "image",
      src: m.relativePath,
      alt: Qe(m.fileName || m.relativePath),
      title: "",
      alignment: "center",
      displayWidthPx: null,
      linkHref: "",
      linkTitle: "",
      rawSource: ""
    }), I = Rs(g.state), P = (I == null ? void 0 : I.pos) ?? null, _ = I ? I.pos + I.node.nodeSize : null;
    let H = g.state.tr, re;
    if (I && P < y.blockStart) {
      H = H.replaceWith(y.blockStart, y.blockEnd, A);
      const Ce = y.blockStart + A.nodeSize;
      H = H.replaceWith(P, _, oo(C, I.node.attrs)), re = H.mapping.map(Ce);
    } else
      I && (H = H.replaceWith(P, _, oo(C, I.node.attrs))), H = H.replaceWith(y.blockStart, y.blockEnd, A), re = H.mapping.map(y.blockStart + A.nodeSize);
    const fe = Math.max(1, Math.min(re, H.doc.content.size));
    return H.setSelection(Q.near(H.doc.resolve(fe), -1)), g.dispatch(Xr(H.scrollIntoView())), Be(), g.focus(), un(), Fe(), $e(), _e(), !0;
  }
  function ck(m) {
    return m === "image" ? (_t(), !0) : m === "cover-image" ? (ak(), !0) : m === "h1" ? Ye(1) : m === "h2" ? Ye(2) : m === "h3" ? Ye(3) : m === "h4" ? Ye(4) : m === "bullet-list" ? $t() : m === "ordered-list" ? ar() : m === "table" ? ur() : m === "code-block" ? an() : !1;
  }
  function fk(m) {
    if (!m) return [];
    const g = [];
    return m.state.doc.descendants((y, C) => {
      var v;
      return ((v = y.type) == null ? void 0 : v.name) === "code_block" && g.push({ node: y, pos: C }), !0;
    }), g;
  }
  function dk(m, g) {
    var I;
    const y = ae();
    if (!y) return !1;
    const C = y.state.doc.nodeAt(m);
    if (!C || ((I = C.type) == null ? void 0 : I.name) !== "code_block") return !1;
    const v = String(g || "").trim(), A = y.state.tr.setNodeAttribute(m, "language", v);
    return y.dispatch(A), Be(), y.focus(), It(), !0;
  }
  function hk(m, g) {
    var v;
    const y = document.createElement("select");
    y.className = "markdown-code-language-select", y.setAttribute("aria-label", b("markdown.codeLanguage"));
    const C = ((v = g.node.attrs) == null ? void 0 : v.language) || "";
    return y.innerHTML = Hh(C).map((A) => `<option value="${yr(A.value)}">${yr(A.label)}</option>`).join(""), y.value = C, y.addEventListener("mousedown", (A) => {
      A.stopPropagation();
    }), y.addEventListener("click", (A) => {
      A.stopPropagation();
    }), y.addEventListener("change", (A) => {
      A.preventDefault(), A.stopPropagation(), dk(Number(y.dataset.codeBlockPos), A.target.value);
    }), ze.appendChild(y), Dn.set(m, y), y;
  }
  function pk() {
    ze || (ze = document.createElement("div"), ze.className = "markdown-code-language-layer", t.appendChild(ze), ["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
      t.addEventListener(m, It, !0);
    }), window.addEventListener("scroll", It, !0), window.addEventListener("resize", It));
  }
  function mk() {
    if (ct = null, !ze || !q || lr()) return;
    const m = ae(), g = t.querySelector(".ProseMirror");
    if (!m || !g) return;
    const y = t.getBoundingClientRect(), C = Array.from(g.querySelectorAll("pre")), v = fk(m);
    Dn.forEach((A, I) => {
      C.includes(I) || (A.remove(), Dn.delete(I));
    }), C.forEach((A, I) => {
      var ye;
      const P = v[I];
      if (!P) return;
      const _ = Dn.get(A) || hk(A, P);
      _.dataset.codeBlockPos = String(P.pos);
      const H = ((ye = P.node.attrs) == null ? void 0 : ye.language) || "";
      [..._.options].some((ve) => ve.value === H) || (_.innerHTML = Hh(H).map((ve) => `<option value="${yr(ve.value)}">${yr(ve.label)}</option>`).join("")), _.value = H;
      const re = A.getBoundingClientRect(), fe = re.bottom > y.top && re.top < y.bottom && A.offsetParent !== null;
      if (_.style.display = fe ? "inline-flex" : "none", !fe) return;
      const Ce = Math.max(8, re.left - y.left + 16), Te = Math.max(8, re.top - y.top + 10);
      _.style.left = `${Math.round(Ce)}px`, _.style.top = `${Math.round(Te)}px`;
    });
  }
  function It() {
    ze && (ct && cancelAnimationFrame(ct), ct = requestAnimationFrame(mk));
  }
  function gk() {
    var y;
    const m = document.createElement("div");
    m.className = "markdown-insert-menu", m.setAttribute("aria-label", b("markdown.insertMenu"));
    const g = [
      { command: "image", icon: Kt.image, label: b("markdown.insertImage") },
      // PR C / C2：「封面图」必须紧邻普通「图片」。
      { command: "cover-image", icon: Kt.cover, label: b("markdown.insertCoverImage") },
      { command: "h1", icon: Kt.h1, label: b("markdown.insertHeading1") },
      { command: "h2", icon: Kt.h2, label: b("markdown.insertHeading2") },
      { command: "h3", icon: Kt.h3, label: b("markdown.insertHeading3") },
      { command: "h4", icon: Kt.h4, label: b("markdown.insertHeading4") },
      { command: "bullet-list", icon: Kt.list, label: b("markdown.insertBulletList") },
      { command: "ordered-list", icon: Kt.orderedList, label: b("markdown.insertOrderedList") },
      { command: "table", icon: Kt.table, label: b("markdown.insertTable") },
      { command: "code-block", icon: Kt.code, label: b("markdown.insertCodeBlock") }
    ];
    return m.innerHTML = `
      <button class="markdown-insert-trigger" type="button" aria-label="${b("markdown.openInsertMenu")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.5v11M4.5 10h11" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
      </button>
      <div class="markdown-insert-popover" role="menu" aria-hidden="true">
        ${g.map((C) => `
          <button type="button" role="menuitem" data-insert-command="${C.command}" aria-label="${C.label}">
            ${C.icon}
            <span class="markdown-insert-tooltip">${C.label}</span>
          </button>
        `).join("")}
      </div>
    `, m.addEventListener("pointerdown", (C) => {
      C.preventDefault(), C.stopPropagation();
    }), (y = m.querySelector(".markdown-insert-trigger")) == null || y.addEventListener("pointerdown", (C) => {
      var A;
      C.preventDefault(), C.stopPropagation();
      const v = ae();
      !v || !z(v) || (Ae = { from: v.state.selection.from }, S = !S, m.classList.toggle("open", S), (A = m.querySelector(".markdown-insert-popover")) == null || A.setAttribute("aria-hidden", S ? "false" : "true"), _e());
    }), m.addEventListener("pointerdown", (C) => {
      const v = C.target.closest("button[data-insert-command]");
      v && (C.preventDefault(), C.stopPropagation(), ck(v.dataset.insertCommand));
    }), m;
  }
  function yk() {
    x || (x = gk(), t.appendChild(x), ["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
      t.addEventListener(m, _e, !0);
    }), t.addEventListener("keydown", kf, !0), t.addEventListener("pointerdown", bf, !0), window.addEventListener("scroll", _e, !0), window.addEventListener("resize", _e), t.addEventListener("focusout", wf, !0));
  }
  function kf(m) {
    m.key !== "Enter" || m.isComposing || (window.setTimeout(_e, 0), window.setTimeout(_e, 80));
  }
  function bf(m) {
    !S || x != null && x.contains(m.target) || xs();
  }
  function xs({ preserveSelection: m = !1 } = {}) {
    var g;
    S = !1, m || (Ae = null), x == null || x.classList.remove("open"), (g = x == null ? void 0 : x.querySelector(".markdown-insert-popover")) == null || g.setAttribute("aria-hidden", "true");
  }
  function un() {
    x && (xs(), x.classList.remove("visible"), ut = !1);
  }
  function wf() {
    window.setTimeout(() => {
      const m = document.activeElement;
      !t.contains(m) && !(x != null && x.contains(m)) && un();
    }, 0);
  }
  function kk() {
    var _;
    if (Pe = null, !x || !q || lr()) return;
    const m = ae(), g = z(m);
    if (!m || !g || !t.contains(m.dom)) {
      un();
      return;
    }
    let y = null;
    try {
      y = m.coordsAtPos(m.state.selection.from);
    } catch {
      un();
      return;
    }
    const C = t.getBoundingClientRect(), v = (_ = ee(m)) == null ? void 0 : _.getBoundingClientRect(), I = ((v == null ? void 0 : v.left) ?? y.left) - C.left - 34, P = Math.max(4, y.top - C.top + (y.bottom - y.top) / 2 - 13);
    x.style.left = `${Math.round(I)}px`, x.style.top = `${Math.round(P)}px`, ut || (x.classList.add("visible"), ut = !0);
  }
  function _e() {
    x && (Pe && cancelAnimationFrame(Pe), Pe = requestAnimationFrame(kk));
  }
  function Xi(m, g = ae()) {
    if (!m || !g) return null;
    let y = null;
    return g.state.doc.descendants((C, v) => {
      var I, P, _, H, re, fe;
      if (y || !["image", rt, pt].includes((I = C.type) == null ? void 0 : I.name)) return !y;
      const A = g.nodeDOM(v);
      if (A === m || (P = A == null ? void 0 : A.contains) != null && P.call(A, m)) {
        const Ce = g.state.doc.resolve(v), Te = ((_ = C.type) == null ? void 0 : _.name) === pt, ye = ((H = C.type) == null ? void 0 : H.name) === rt, ve = Te || ye || ((fe = (re = Ce.parent) == null ? void 0 : re.type) == null ? void 0 : fe.name) === "paragraph" && Ce.parent.childCount === 1;
        return y = { element: m, node: C, pos: v, isPortable: ye, isCover: Te, isStandalone: ve }, !1;
      }
      return !0;
    }), y;
  }
  function xf(m, g = {}) {
    var C, v, A, I, P;
    const y = m == null ? void 0 : m.node;
    return y ? ((C = y.type) == null ? void 0 : C.name) === rt ? {
      ...y.attrs,
      ...g,
      sourceSyntax: "github-html",
      presentationDirty: !0
    } : {
      src: ((v = y.attrs) == null ? void 0 : v.src) || "",
      alt: ((A = y.attrs) == null ? void 0 : A.alt) || "",
      title: oA(((I = y.attrs) == null ? void 0 : I.title) || ""),
      alignment: Wr(((P = y.attrs) == null ? void 0 : P.title) || ""),
      displayWidthPx: null,
      linkHref: "",
      linkTitle: "",
      sourceSyntax: "github-html",
      rawSource: "",
      presentationDirty: !0,
      ...g
    } : null;
  }
  function Cf(m, g, y) {
    var A;
    if (!m || !g || !y) return !1;
    const C = m.state.schema.nodes[rt];
    if (!C) return !1;
    let v = m.state.tr;
    if (((A = g.node.type) == null ? void 0 : A.name) === rt)
      v = v.setNodeMarkup(g.pos, C, y);
    else {
      if (!g.isStandalone) return !1;
      const I = m.state.doc.resolve(g.pos), P = I.parent, _ = I.before(I.depth);
      v = v.replaceWith(_, _ + P.nodeSize, C.create(y));
    }
    return m.dispatch(v.scrollIntoView()), Be(), Zi(), m.focus(), !0;
  }
  function bk(m) {
    const g = Number((m == null ? void 0 : m.naturalWidth) || 0);
    return g > 0 ? Promise.resolve(g) : m ? new Promise((y, C) => {
      let v = !1;
      const A = (H, re = null) => {
        v || (v = !0, window.clearTimeout(_), m.removeEventListener("load", I), m.removeEventListener("error", P), re ? C(re) : y(H));
      }, I = () => {
        const H = Number(m.naturalWidth || 0);
        H > 0 ? A(H) : A(0, new Error("IMAGE_DIMENSIONS_UNAVAILABLE"));
      }, P = () => A(0, new Error("IMAGE_LOAD_FAILED")), _ = window.setTimeout(() => A(0, new Error("IMAGE_DIMENSIONS_TIMEOUT")), 4e3);
      m.addEventListener("load", I, { once: !0 }), m.addEventListener("error", P, { once: !0 }), m.complete && I();
    }) : Promise.reject(new Error("IMAGE_NOT_AVAILABLE"));
  }
  async function Ll(m, g) {
    if (g === "large") return null;
    const y = VI[g];
    if (!y) return null;
    const C = await bk(m == null ? void 0 : m.element);
    return Math.min(y, C);
  }
  function Ur(m) {
    typeof h == "function" && h(m);
  }
  function Sf(m, g, { alignment: y, displayWidthPx: C }) {
    var I;
    const v = m.state.doc.nodeAt(g.pos);
    if (!v || ((I = v.type) == null ? void 0 : I.name) !== pt) return !1;
    const A = m.state.tr.setNodeAttribute(g.pos, "presentationDirty", !0);
    return A.setNodeAttribute(g.pos, "nodeKind", "portable-image"), A.setNodeAttribute(g.pos, "alignment", y || ""), A.setNodeAttribute(g.pos, "displayWidthPx", C ?? null), m.dispatch(Xr(A.scrollIntoView())), Be(), m.focus(), cr(), !0;
  }
  async function wk(m) {
    var v, A, I, P, _, H, re, fe;
    const g = ae();
    if (!g || !oe) return !1;
    let y = { ...oe, node: g.state.doc.nodeAt(oe.pos) };
    if (!y.node || !y.isStandalone) return !1;
    if (((v = y.node.type) == null ? void 0 : v.name) === pt) {
      const Ce = ((A = y.node.attrs) == null ? void 0 : A.displayWidthPx) ?? null;
      return Sf(g, y, { alignment: m, displayWidthPx: Ce });
    }
    let C = ((I = y.node.type) == null ? void 0 : I.name) === rt ? ((P = y.node.attrs) == null ? void 0 : P.displayWidthPx) ?? null : null;
    if (((_ = y.node.type) == null ? void 0 : _.name) === "image") {
      const Ce = Nu(((H = y.node.attrs) == null ? void 0 : H.title) || "");
      if (Ce !== "large") {
        try {
          C = await Ll(y, Ce);
        } catch (ye) {
          return Ur(ye), !1;
        }
        const Te = Xi(y.element, g);
        if (!Te || ((re = Te.node.attrs) == null ? void 0 : re.src) !== ((fe = y.node.attrs) == null ? void 0 : fe.src)) return !1;
        y = Te;
      }
    }
    return Cf(g, y, xf(y, { alignment: m, displayWidthPx: C }));
  }
  async function xk(m) {
    var C, v, A, I;
    const g = ae();
    if (!g || !oe) return !1;
    let y = { ...oe, node: g.state.doc.nodeAt(oe.pos) };
    if (!y.node || !y.isStandalone) return !1;
    if (((C = y.node.type) == null ? void 0 : C.name) === pt)
      try {
        const P = await Ll(y, m);
        return Sf(g, y, {
          alignment: ((v = y.node.attrs) == null ? void 0 : v.alignment) || "",
          displayWidthPx: P
        });
      } catch (P) {
        return Ur(P), !1;
      }
    try {
      const P = await Ll(y, m), _ = Xi(y.element, g);
      return !_ || ((A = _.node.attrs) == null ? void 0 : A.src) !== ((I = y.node.attrs) == null ? void 0 : I.src) ? !1 : (y = _, Cf(g, y, xf(y, { displayWidthPx: P })));
    } catch (P) {
      return Ur(P), !1;
    }
  }
  function Pl(m) {
    typeof p == "function" && p(m);
  }
  async function Ck() {
    var P, _;
    const m = ae();
    if (!m || !oe) return !1;
    let g = { ...oe, node: m.state.doc.nodeAt(oe.pos) };
    if (!g.node || !g.isStandalone || ((P = g.node.type) == null ? void 0 : P.name) === pt) return !1;
    const y = String(((_ = g.node.attrs) == null ? void 0 : _.src) || "");
    if (typeof f == "function" && !/^https?:\/\//i.test(y.trim()) && !await f(y))
      return Pl({ kind: "set", ok: !1, reason: "validation" }), !1;
    if (Ln.getCoverState().duplicate) return !1;
    const v = ae();
    if (!v || v.composing) return !1;
    const A = Xi(g.element, v);
    if (!A) return !1;
    const I = Ln.setCoverImage(A.pos);
    return Pl({ kind: "set", ok: I }), I;
  }
  function Sk() {
    if (Ln.getCoverState().duplicate) return !1;
    const m = Ln.removeCover();
    return Pl({ kind: "remove", ok: m }), m;
  }
  function vk() {
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
    m.innerHTML = g.map((C) => `
      <button type="button" data-image-${C.type}="${C.value}" aria-label="${C.label}">
        ${C.icon}
        <span class="markdown-image-align-tooltip">${C.label}</span>
      </button>
    `).join("");
    const y = (C) => {
      !C || C.disabled || C.hidden || (C.dataset.imageCover === "set" ? Ck().catch(Ur) : C.dataset.imageCover === "remove" ? Sk() : C.dataset.imageAlign ? wk(C.dataset.imageAlign).catch(Ur) : xk(C.dataset.imageSize || "large").catch(Ur));
    };
    return m.addEventListener("pointerdown", (C) => {
      const v = C.target.closest("button[data-image-align], button[data-image-size], button[data-image-cover]");
      v && (C.preventDefault(), C.stopPropagation(), y(v));
    }), m.addEventListener("keydown", (C) => {
      if (C.key !== "Enter" && C.key !== " ") return;
      const v = C.target.closest("button[data-image-align], button[data-image-size], button[data-image-cover]");
      v && (C.preventDefault(), C.stopPropagation(), y(v));
    }), m.addEventListener("pointerenter", () => {
      cr();
    }), m.addEventListener("pointerleave", () => {
      window.setTimeout(() => {
        var C, v;
        !(le != null && le.matches(":hover")) && !((v = (C = oe == null ? void 0 : oe.element) == null ? void 0 : C.matches) != null && v.call(C, ":hover")) && Zi();
      }, 120);
    }), m;
  }
  function Mk() {
    le || (le = vk(), t.appendChild(le), t.addEventListener("pointerover", vf, !0), t.addEventListener("pointerout", Mf, !0), window.addEventListener("scroll", cr, !0), window.addEventListener("resize", cr));
  }
  function vf(m) {
    var C, v;
    const g = (v = (C = m.target) == null ? void 0 : C.closest) == null ? void 0 : v.call(C, ".ProseMirror img");
    if (!g || !t.contains(g)) return;
    const y = Xi(g);
    y && (oe = y, cr());
  }
  function Mf(m) {
    if (!(oe != null && oe.element)) return;
    const g = m.relatedTarget;
    g && (oe.element.contains(g) || le != null && le.contains(g)) || window.setTimeout(() => {
      var y, C;
      !(le != null && le.matches(":hover")) && !((C = (y = oe == null ? void 0 : oe.element) == null ? void 0 : y.matches) != null && C.call(y, ":hover")) && Zi();
    }, 120);
  }
  function Zi() {
    le && (le.classList.remove("visible"), oe = null);
  }
  function Tk() {
    var Ss, vs, to, Pn, Df;
    if (xe = null, !le || !(oe != null && oe.element) || !t.contains(oe.element)) {
      Zi();
      return;
    }
    const m = ae(), g = Xi(oe.element, m);
    if (!g) {
      Zi();
      return;
    }
    oe = g;
    const y = oe.node, C = ((Ss = y.type) == null ? void 0 : Ss.name) === pt, v = C || ((vs = y.type) == null ? void 0 : vs.name) === rt, A = ((to = y.attrs) == null ? void 0 : to.title) || "", I = v ? ((Pn = y.attrs) == null ? void 0 : Pn.alignment) || "" : Wr(A), P = v ? ((Df = y.attrs) == null ? void 0 : Df.displayWidthPx) == null ? "large" : "custom" : Nu(A), _ = oe.isStandalone;
    le.querySelectorAll("button[data-image-align], button[data-image-size]").forEach((xt) => {
      xt.disabled = !_;
      const Rf = xt.querySelector(".markdown-image-align-tooltip");
      Rf && (Rf.textContent = _ ? xt.getAttribute("aria-label") || "" : b("markdown.imageBlockOnly"));
    }), le.querySelectorAll("button[data-image-align]").forEach((xt) => {
      xt.classList.toggle("active", xt.dataset.imageAlign === I);
    }), le.querySelectorAll("button[data-image-size]").forEach((xt) => {
      xt.classList.toggle("active", xt.dataset.imageSize === P);
    });
    const H = le.querySelector('button[data-image-cover="set"]'), re = le.querySelector('button[data-image-cover="remove"]'), fe = C, Ce = Ln.getCoverState();
    if (H) {
      H.disabled = !_;
      const xt = _ && !fe && !Ce.duplicate;
      H.hidden = !xt;
    }
    if (re) {
      re.disabled = !_;
      const xt = _ && fe && !Ce.duplicate;
      re.hidden = !xt;
    }
    const Te = t.getBoundingClientRect(), ye = oe.element.getBoundingClientRect(), ve = le.offsetWidth || 108, Jr = Math.max(8, Math.min(ye.left - Te.left + ye.width / 2 - ve / 2, Te.width - ve - 8)), Gr = Math.max(4, ye.top - Te.top + 8);
    le.style.left = `${Math.round(Jr)}px`, le.style.top = `${Math.round(Gr)}px`, le.classList.add("visible");
  }
  function cr() {
    le && (xe && cancelAnimationFrame(xe), xe = requestAnimationFrame(Tk));
  }
  function Tf(m, g = ie) {
    if (!m || !g) return (m == null ? void 0 : m.state.selection) || null;
    const y = m.state.doc.content.size, C = Math.max(0, Math.min(Number(g.anchor), y)), v = Math.max(0, Math.min(Number(g.head), y));
    return Q.between(m.state.doc.resolve(C), m.state.doc.resolve(v));
  }
  function Nf(m) {
    const g = ae();
    if (!g || !["left", ...Lr].includes(m)) return !1;
    const y = Tf(g), C = Zh(g.state, y);
    if (!C.supported) return !1;
    const v = Lr.includes(m) && C.alignment === m ? "left" : m, A = g.state.schema.nodes[Bi];
    let I = g.state.tr, P = !1, _ = y.anchor, H = y.head;
    const re = (ye, ve, Jr, Gr) => {
      const Ss = ye + ve, vs = Jr - ve, to = (Pn) => Pn <= ye ? Pn : Pn >= Ss ? Pn + vs : Pn + Gr;
      _ = to(_), H = to(H);
    };
    if ([...C.targets].reverse().forEach((ye) => {
      const ve = I.doc.nodeAt(ye.pos);
      if (!ve) return;
      if (ve.type === A) {
        if (v === "left") {
          if (ve.childCount !== 1) return;
          const Gr = ve.child(0);
          re(ye.pos, ve.nodeSize, Gr.nodeSize, -1), I = I.replaceWith(ye.pos, ye.pos + ve.nodeSize, Gr), P = !0;
          return;
        }
        if (ve.attrs.alignment === v) return;
        I = I.setNodeMarkup(ye.pos, A, {
          alignment: v,
          sourceSyntax: "github-div-align"
        }), P = !0;
        return;
      }
      if (v === "left") return;
      const Jr = A.create({
        alignment: v,
        sourceSyntax: "github-div-align"
      }, ve);
      re(ye.pos, ve.nodeSize, Jr.nodeSize, 1), I = I.replaceWith(ye.pos, ye.pos + ve.nodeSize, Jr), P = !0;
    }), !P) return !1;
    const fe = I.doc.content.size, Ce = Math.max(0, Math.min(_, fe)), Te = Math.max(0, Math.min(H, fe));
    return I = I.setSelection(Q.between(
      I.doc.resolve(Ce),
      I.doc.resolve(Te)
    )), I = Xr(I), g.dispatch(I.scrollIntoView()), Be(), g.focus(), Fe(), $e(), _e(), It(), !0;
  }
  function Nk(m) {
    const g = ae(), y = g == null ? void 0 : g.state.schema.marks[m];
    return y ? E(rs(y)) : !1;
  }
  function Cs() {
    var m;
    $ && ((m = $.querySelector(".markdown-format-link-popover")) == null || m.classList.remove("open"), Ne = null);
  }
  function Ik() {
    const m = ae(), g = m == null ? void 0 : m.state.selection;
    if (!$ || !m || !g || g.empty) return !1;
    Ne = { from: g.from, to: g.to };
    const y = $.querySelector(".markdown-format-link-popover"), C = $.querySelector("[data-format-link-input]");
    return !y || !C ? !1 : (y.classList.add("open"), C.value = "", window.setTimeout(() => C.focus(), 0), !0);
  }
  function If(m) {
    const g = String(m || "").trim();
    if (!g) return !1;
    const y = ae(), C = y == null ? void 0 : y.state.schema.marks.link;
    if (!y || !C || !Ne) return !1;
    const v = Math.max(0, Math.min(Ne.from, y.state.doc.content.size)), A = Math.max(v, Math.min(Ne.to, y.state.doc.content.size)), I = y.state.tr.setSelection(Q.create(y.state.doc, v, A)).addMark(v, A, C.create({ href: g }));
    return y.dispatch(I.scrollIntoView()), Be(), y.focus(), Cs(), Fe(), $e(), !0;
  }
  function Ak() {
    const m = ae(), g = m == null ? void 0 : m.state.schema.marks.link, y = m == null ? void 0 : m.state.selection;
    if (!m || !g || !y || y.empty) return !1;
    const C = m.state.tr.removeMark(y.from, y.to, g);
    return m.dispatch(C.scrollIntoView()), Be(), m.focus(), Cs(), Fe(), $e(), !0;
  }
  function Ek(m) {
    const g = ae();
    if (!g) return !1;
    const { nodes: y } = g.state.schema;
    if (m === "paragraph")
      return y.paragraph ? E(xn(y.paragraph)) : !1;
    const C = Number(String(m || "").replace("h", ""));
    return !y.heading || !Number.isFinite(C) ? !1 : E(xn(y.heading, { level: C }));
  }
  function Ok(m, g) {
    const y = m == null ? void 0 : m.state.schema.marks[g];
    if (!m || !y) return !1;
    const { from: C, to: v, empty: A, $from: I } = m.state.selection;
    return A ? !!y.isInSet(m.state.storedMarks || I.marks()) : m.state.doc.rangeHasMark(C, v, y);
  }
  function Dk(m) {
    var y;
    if (!m) return "paragraph";
    const { $from: g } = m.state.selection;
    for (let C = g.depth; C > 0; C -= 1) {
      const v = g.node(C);
      if (v.type.name === "heading")
        return `h${((y = v.attrs) == null ? void 0 : y.level) || 1}`;
      if (v.type.name === "paragraph")
        return "paragraph";
    }
    return "paragraph";
  }
  function Rk() {
    var C, v, A;
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
    m.addEventListener("mousedown", (I) => {
      I.target.closest("select") || I.target.closest("input") || I.preventDefault();
    }), m.addEventListener("pointerdown", (I) => {
      const P = I.target.closest("button[data-text-align]");
      P && (I.preventDefault(), I.stopPropagation(), P.getAttribute("aria-disabled") !== "true" && Nf(P.dataset.textAlign || "left"));
    }), m.addEventListener("click", (I) => {
      const P = I.target.closest("button[data-text-align]");
      if (P) {
        I.preventDefault(), I.stopPropagation(), I.detail === 0 && P.getAttribute("aria-disabled") !== "true" && Nf(P.dataset.textAlign || "left");
        return;
      }
      const _ = I.target.closest("button[data-format-command]");
      if (!(!_ || _.getAttribute("aria-disabled") === "true")) {
        if (I.preventDefault(), I.stopPropagation(), _.dataset.formatCommand === "link") {
          if (_.classList.contains("active")) {
            Ak();
            return;
          }
          Ik();
          return;
        }
        Nk(g[_.dataset.formatCommand]);
      }
    }), (C = m.querySelector("[data-format-link-apply]")) == null || C.addEventListener("click", (I) => {
      I.preventDefault(), I.stopPropagation();
      const P = m.querySelector("[data-format-link-input]");
      If(P == null ? void 0 : P.value);
    }), (v = m.querySelector("[data-format-link-input]")) == null || v.addEventListener("keydown", (I) => {
      var P;
      I.key === "Enter" && (I.preventDefault(), I.stopPropagation(), If(I.currentTarget.value)), I.key === "Escape" && (I.preventDefault(), I.stopPropagation(), Cs(), (P = ae()) == null || P.focus());
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
      y == null || y.addEventListener(I, (P) => P.stopPropagation());
    }), (A = m.querySelector("select")) == null || A.addEventListener("change", (I) => {
      Ek(I.target.value);
    }), m;
  }
  function Lk() {
    $ || ($ = Rk(), t.appendChild($), ["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
      t.addEventListener(m, Fe, !0);
    }), document.addEventListener("selectionchange", Fe), window.addEventListener("scroll", Fe, !0), window.addEventListener("resize", Fe), t.addEventListener("focusout", Af, !0));
  }
  function eo() {
    $ && (Cs(), $.classList.remove("visible"), be = !1, ie = null);
  }
  function Af() {
    window.setTimeout(() => {
      const m = document.activeElement;
      !t.contains(m) && !($ != null && $.contains(m)) && eo();
    }, 0);
  }
  function Pk(m) {
    if (!$ || !m) return;
    Object.entries({
      bold: "strong",
      italic: "emphasis",
      code: "inlineCode",
      strike: "strike_through",
      link: "link"
    }).forEach(([_, H]) => {
      const re = $.querySelector(`[data-format-command="${_}"]`);
      if (!re) return;
      const fe = !!m.state.schema.marks[H];
      re.classList.toggle("active", fe && Ok(m, H)), re.setAttribute("aria-disabled", fe ? "false" : "true");
    });
    const y = $.querySelector('[data-format-command="link"]'), C = y == null ? void 0 : y.querySelector(".markdown-format-tooltip"), v = !!(y != null && y.classList.contains("active"));
    y == null || y.setAttribute("aria-label", b(v ? "markdown.removeLink" : "markdown.addLink")), C && (C.textContent = b(v ? "actions.remove" : "markdown.linkTooltip"));
    const A = $.querySelector("select");
    A && (A.value = Dk(m));
    const I = Tf(m), P = Zh(m.state, I);
    $.querySelectorAll("button[data-text-align]").forEach((_) => {
      const H = P.supported, re = _.dataset.textAlign;
      _.classList.toggle("active", H && P.alignment === re), _.setAttribute("aria-disabled", H ? "false" : "true");
      const fe = _.querySelector(".markdown-format-tooltip");
      fe && (fe.textContent = H ? _.getAttribute("aria-label") || "" : b("markdown.textAlignBlockOnly"));
    });
  }
  function zk() {
    if (ce = null, !$ || !q || lr()) return;
    const m = ae(), g = m == null ? void 0 : m.state.selection;
    if (!m || !g || g.empty || !t.contains(m.dom)) {
      eo();
      return;
    }
    if (Ve(m.state)) {
      eo();
      return;
    }
    if (!m.state.doc.textBetween(g.from, g.to, " ").trim()) {
      eo();
      return;
    }
    ie = {
      anchor: g.anchor,
      head: g.head
    }, Pk(m);
    const C = t.getBoundingClientRect();
    let v = null, A = null;
    try {
      v = m.coordsAtPos(g.from), A = m.coordsAtPos(g.to);
    } catch {
      eo();
      return;
    }
    const I = $.offsetWidth || 352, P = $.offsetHeight || 38, _ = Math.min(v.left, A.left), H = Math.max(v.right || v.left, A.right || A.left), re = Math.min(v.top, A.top), fe = Math.max(v.bottom || v.top, A.bottom || A.top), Ce = (_ + H) / 2, Te = Math.max(8, Math.min(Ce - C.left - I / 2, C.width - I - 8));
    let ye = re - C.top - P - 10;
    ye < 8 && (ye = fe - C.top + 10), $.style.left = `${Math.round(Te)}px`, $.style.top = `${Math.round(ye)}px`, be || ($.classList.add("visible"), be = !0);
  }
  function Fe() {
    $ && (ce && cancelAnimationFrame(ce), ce = requestAnimationFrame(zk));
  }
  function Bk(m) {
    if (!s) return !1;
    const g = ae();
    if (!g || !Ve(g.state)) return !1;
    const y = m(g.state, g.dispatch, g);
    return y && (Be(), g.focus(), $e()), y;
  }
  function Fk() {
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
      ${Object.keys(y).map((v) => `
        <button type="button" data-table-command="${v}" aria-label="${y[v]}">
          ${g[v]}
          <span class="markdown-table-tooltip">${y[v]}</span>
        </button>
      `).join("")}
    `;
    const C = {
      "row-before": pM,
      "row-after": mM,
      "column-before": ty,
      "column-after": ny,
      "delete-row": oy,
      "delete-column": ry
    };
    return m.addEventListener("mousedown", (v) => {
      v.preventDefault();
    }), m.addEventListener("click", (v) => {
      const A = v.target.closest("button[data-table-command]");
      A && (v.preventDefault(), v.stopPropagation(), Bk(C[A.dataset.tableCommand]));
    }), m;
  }
  function Ef() {
    !s || pe || (pe = Fk(), t.appendChild(pe), ["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
      t.addEventListener(m, $e, !0);
    }), window.addEventListener("scroll", $e, !0), window.addEventListener("resize", $e));
  }
  function Of() {
    Le && (cancelAnimationFrame(Le), Le = null), pe && (["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
      t.removeEventListener(m, $e, !0);
    }), window.removeEventListener("scroll", $e, !0), window.removeEventListener("resize", $e), pe.remove(), pe = null, at = !1);
  }
  function $k() {
    pe && (pe.classList.remove("visible"), at = !1);
  }
  function _k() {
    if (Le = null, !pe || !s || !q || lr()) return;
    const m = ae(), g = Rl(m);
    if (!g) {
      $k();
      return;
    }
    const y = t.getBoundingClientRect();
    let C = null;
    try {
      C = m.coordsAtPos(m.state.selection.from);
    } catch {
      C = g.getBoundingClientRect();
    }
    const v = pe.offsetWidth || 224, A = pe.offsetHeight || 38, I = ((C.left || 0) + (C.right || C.left || 0)) / 2, P = Math.max(6, Math.min(I - y.left - v / 2, y.width - v - 6));
    let _ = (C.top || 0) - y.top - A - 10;
    _ < 6 && (_ = (C.bottom || C.top || 0) - y.top + 10), pe.style.left = `${Math.round(P)}px`, pe.style.top = `${Math.round(_)}px`, at || (pe.classList.add("visible"), at = !0);
  }
  function $e() {
    !s || !pe || (Le && cancelAnimationFrame(Le), Le = requestAnimationFrame(_k));
  }
  function zl(m) {
    if (N) return !1;
    const g = Ge.action((y) => {
      const C = y.get(Oe), v = m(C.state, C.dispatch, C);
      return v && (C.focus(), Fe(), $e(), _e(), It()), v;
    });
    return g && (Ee && (clearTimeout(Ee), Ee = null), ws()), g;
  }
  const Ln = {
    editor: Ge,
    getMarkdown() {
      Ee && (clearTimeout(Ee), Ee = null);
      const m = Kr();
      return ln = m, m;
    },
    getBaselineMarkdown() {
      return Yi;
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
      return N ? !1 : Ge.action((g) => {
        const y = g.get(Oe);
        if (!y || y.composing || On.some((re) => re.kind === "duplicate"))
          return !1;
        const C = y.state, v = iA(C, m);
        if (!v || !C.schema.nodes[pt]) return !1;
        const I = Rs(C), P = v.blockStart, _ = v.blockEnd;
        let H = C.tr;
        if (I) {
          const re = I.pos, fe = I.pos + I.node.nodeSize;
          re < P ? (H = H.replaceWith(P, _, Ls(C.schema, v.attrs)), H = H.replaceWith(re, fe, oo(C.schema, I.node.attrs))) : (H = H.replaceWith(re, fe, oo(C.schema, I.node.attrs)), H = H.replaceWith(P, _, Ls(C.schema, v.attrs)));
        } else
          H = H.replaceWith(P, _, Ls(C.schema, v.attrs));
        return y.dispatch(Xr(H)), Be(), y.focus(), Fe(), $e(), _e(), !0;
      });
    },
    /**
     * 取消当前封面：仅移除 marker/wrapper，图片原地保留为普通正文。
     * @returns {boolean} 是否已提交
     */
    removeCover() {
      return N ? !1 : Ge.action((m) => {
        const g = m.get(Oe);
        if (!g || g.composing || On.some((A) => A.kind === "duplicate"))
          return !1;
        const y = Rs(g.state);
        if (!y) return !1;
        const C = oo(g.state.schema, y.node.attrs);
        let v = g.state.tr.replaceWith(
          y.pos,
          y.pos + y.node.nodeSize,
          C
        );
        return g.dispatch(Xr(v)), Be(), g.focus(), Fe(), $e(), _e(), !0;
      });
    },
    /**
     * 读取当前封面身份与结构化诊断。
     * @returns {{hasCover:boolean, valid:boolean, duplicate:boolean,
     *   diagnostics:Array<{kind:string,count?:number}>, nodeKind:string|null,
     *   pos:number|null, src:string|null}}
     */
    getCoverState() {
      return N ? { hasCover: !1, valid: !1, duplicate: !1, diagnostics: [], nodeKind: null, pos: null, src: null } : Ge.action((m) => {
        const g = m.get(Oe), y = Rs(g.state), C = On.some((v) => v.kind === "duplicate");
        return {
          hasCover: !!y,
          valid: !!y && !C,
          duplicate: C,
          diagnostics: On.map((v) => ({ ...v })),
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
      return N ? [] : Ge.action((m) => {
        const g = m.get(Oe), y = [];
        return g.state.doc.descendants((C, v) => {
          var A;
          if (C.type.name === rt && ((A = C.attrs) != null && A.src))
            return y.push({ pos: v, nodeKind: "portable-image", src: String(C.attrs.src), alt: String(C.attrs.alt || "") }), !0;
          if (C.type.name === "paragraph" && C.childCount === 1) {
            const I = C.firstChild;
            if (I.type.name === "image") {
              const P = Tu(I);
              y.push({
                pos: v,
                nodeKind: P ? "linked-image" : "image",
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
      if (N) return !1;
      const g = String(m || "").trim();
      return g ? Ge.action((y) => {
        const C = y.get(Oe);
        if (!C || C.composing)
          return !1;
        const v = C.state, { doc: A } = v, I = jh(A, v.schema);
        if (I && I.node.textContent.trim() === g)
          return !1;
        let P = v.tr;
        if (I) {
          const _ = v.schema.text(g), H = I.node.type.create(I.node.attrs, _);
          P = P.replaceWith(I.pos, I.pos + I.node.nodeSize, H);
        } else {
          const _ = v.schema.nodes.heading.create({ level: 1 }, v.schema.text(g)), H = A.firstChild;
          H && H.type.name === "paragraph" && H.textContent.trim() === "" ? P = P.replaceWith(0, H.nodeSize, _) : P = P.insert(0, _);
        }
        return C.dispatch(Xr(P)), Be(), C.focus(), !0;
      }) : !1;
    },
    /**
     * 读取当前编辑器文档的权威标题（第一个有效顶层 H1 的纯文本）。
     * @returns {string|null} 无有效 H1 时返回 null
     */
    getDocumentTitle() {
      return N ? null : Ge.action((m) => {
        const g = m.get(Oe);
        if (!g)
          return null;
        const y = jh(g.state.doc, g.state.schema);
        return y ? y.node.textContent.trim() : null;
      });
    },
    hasChanges() {
      return G || U;
    },
    setTableToolsEnabled(m) {
      N || (s = !!m, s ? (Ef(), $e()) : Of());
    },
    undo() {
      return zl(Mo);
    },
    redo() {
      return zl(oi);
    },
    focus() {
      N || Ge.action((m) => {
        m.get(Oe).focus();
      });
    },
    blur() {
      N || Ge.action((m) => {
        m.get(Oe).dom.blur();
      });
    },
    focusAtText(m, g = 0) {
      if (N) return !1;
      const y = Yh(m);
      return y ? Ge.action((C) => {
        const v = C.get(Oe);
        let A = null;
        return v.state.doc.descendants((I, P) => {
          if (A !== null) return !1;
          if (!I.isText) return !0;
          const _ = I.text || "", H = Yh(_);
          if (H.indexOf(y) < 0 && !y.includes(H)) return !0;
          const fe = _.indexOf(m), Ce = fe >= 0 ? fe : 0;
          return A = Math.max(P + 1, Math.min(P + _.length, P + 1 + Ce + Math.max(0, g))), !1;
        }), A === null ? (v.focus(), !1) : (v.dispatch(v.state.tr.setSelection(Q.create(v.state.doc, A)).scrollIntoView()), v.focus(), !0);
      }) : (Ln.focus(), !1);
    },
    destroy() {
      N = !0, Ee && (clearTimeout(Ee), Ee = null), ce && (cancelAnimationFrame(ce), ce = null), $ && (["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
        t.removeEventListener(m, Fe, !0);
      }), document.removeEventListener("selectionchange", Fe), window.removeEventListener("scroll", Fe, !0), window.removeEventListener("resize", Fe), t.removeEventListener("focusout", Af, !0), $.remove(), $ = null), ct && (cancelAnimationFrame(ct), ct = null), ze && (["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
        t.removeEventListener(m, It, !0);
      }), window.removeEventListener("scroll", It, !0), window.removeEventListener("resize", It), Dn.forEach((m) => m.remove()), Dn.clear(), ze.remove(), ze = null), Of(), Pe && (cancelAnimationFrame(Pe), Pe = null), x && (["keyup", "mouseup", "focusin", "pointerup"].forEach((m) => {
        t.removeEventListener(m, _e, !0);
      }), t.removeEventListener("keydown", kf, !0), t.removeEventListener("pointerdown", bf, !0), window.removeEventListener("scroll", _e, !0), window.removeEventListener("resize", _e), t.removeEventListener("focusout", wf, !0), x.remove(), x = null), xe && (cancelAnimationFrame(xe), xe = null), le && (t.removeEventListener("pointerover", vf, !0), t.removeEventListener("pointerout", Mf, !0), window.removeEventListener("scroll", cr, !0), window.removeEventListener("resize", cr), le.remove(), le = null, oe = null);
      for (const m of bs)
        t.removeEventListener(m, Be, !0);
      t.removeEventListener("keydown", Gi, !0), Ge.destroy(), t.innerHTML = "", hl.delete(t);
    }
  };
  return hl.set(t, Ln), Ln;
}
window.NutbookMarkdownEditor = {
  create: dA,
  destroy(t) {
    lk(t);
  },
  // 权威标题语义的静态入口（与 dist/assets/markdown-document-title.js 同一实现）。
  parseDocumentTitle: ek,
  setDocumentTitleInSource: TI
};
