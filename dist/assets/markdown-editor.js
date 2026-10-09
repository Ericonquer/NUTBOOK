var ad = (t) => {
  throw TypeError(t);
};
var cd = (t, e, n) => e.has(t) || ad("Cannot " + n);
var N = (t, e, n) => (cd(t, e, "read from private field"), n ? n.call(t) : e.get(t)), q = (t, e, n) => e.has(t) ? ad("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, n), $ = (t, e, n, r) => (cd(t, e, "write to private field"), r ? r.call(t, n) : e.set(t, n), n);
var Kt = /* @__PURE__ */ function(t) {
  return t.docTypeError = "docTypeError", t.contextNotFound = "contextNotFound", t.timerNotFound = "timerNotFound", t.ctxCallOutOfScope = "ctxCallOutOfScope", t.createNodeInParserFail = "createNodeInParserFail", t.stackOverFlow = "stackOverFlow", t.parserMatchError = "parserMatchError", t.serializerMatchError = "serializerMatchError", t.getAtomFromSchemaFail = "getAtomFromSchemaFail", t.expectDomTypeError = "expectDomTypeError", t.callCommandBeforeEditorView = "callCommandBeforeEditorView", t.missingRootElement = "missingRootElement", t.missingNodeInSchema = "missingNodeInSchema", t.missingMarkInSchema = "missingMarkInSchema", t.ctxNotBind = "ctxNotBind", t.missingYjsDoc = "missingYjsDoc", t.aiProviderError = "aiProviderError", t.aiBuildContextError = "aiBuildContextError", t;
}({}), Ut = class extends Error {
  constructor(t, e, n) {
    super(e, n), this.name = "MilkdownError", this.code = t, (n == null ? void 0 : n.cause) !== void 0 && (this.cause = n.cause);
  }
}, Ob = (t, e) => typeof e == "function" ? "[Function]" : e, Il = (t) => JSON.stringify(t, Ob);
function Db(t) {
  return new Ut(Kt.docTypeError, `Doc type error, unsupported type: ${Il(t)}`);
}
function Rb(t) {
  return new Ut(Kt.contextNotFound, `Context "${t}" not found, do you forget to inject it?`);
}
function Lb(t) {
  return new Ut(Kt.timerNotFound, `Timer "${t}" not found, do you forget to record it?`);
}
function Ol() {
  return new Ut(Kt.ctxCallOutOfScope, "Should not call a context out of the plugin.");
}
function Pb(t, e, n) {
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
    const c = `${l}: ${i(a)}.`;
    return s.concat(c);
  }, []);
  return new Ut(Kt.createNodeInParserFail, o.join(`
`));
}
function Fp() {
  return new Ut(Kt.stackOverFlow, "Stack over flow, cannot pop on an empty stack.");
}
function zb(t) {
  return new Ut(Kt.parserMatchError, `Cannot match target parser for node: ${Il(t)}.`);
}
function Bb(t) {
  return new Ut(Kt.serializerMatchError, `Cannot match target serializer for node: ${Il(t)}.`);
}
function un(t) {
  return new Ut(Kt.expectDomTypeError, `Expect to be a dom, but get: ${Il(t)}.`);
}
function ra() {
  return new Ut(Kt.callCommandBeforeEditorView, "You're trying to call a command before editor view initialized, make sure to get commandManager from ctx after editor view has been initialized");
}
function Fb(t) {
  return new Ut(Kt.missingNodeInSchema, `Missing node in schema, milkdown cannot find "${t}" in schema.`);
}
function $b(t) {
  return new Ut(Kt.missingMarkInSchema, `Missing mark in schema, milkdown cannot find "${t}" in schema.`);
}
var $p = class {
  constructor() {
    this.sliceMap = /* @__PURE__ */ new Map(), this.get = (t) => {
      const e = typeof t == "string" ? [...this.sliceMap.values()].find((n) => n.type.name === t) : this.sliceMap.get(t.id);
      if (!e) throw Rb(typeof t == "string" ? t : t.name);
      return e;
    }, this.remove = (t) => {
      const e = typeof t == "string" ? [...this.sliceMap.values()].find((n) => n.type.name === t) : this.sliceMap.get(t.id);
      e && this.sliceMap.delete(e.type.id);
    }, this.has = (t) => typeof t == "string" ? [...this.sliceMap.values()].some((e) => e.type.name === t) : this.sliceMap.has(t.id);
  }
}, Jt, vn, Ci, Rp, _b = (Rp = class {
  constructor(e, n, r) {
    q(this, Jt);
    q(this, vn);
    q(this, Ci);
    $(this, Jt, []), $(this, Ci, () => {
      N(this, Jt).forEach((i) => i(N(this, vn)));
    }), this.set = (i) => {
      $(this, vn, i), N(this, Ci).call(this);
    }, this.get = () => N(this, vn), this.update = (i) => {
      $(this, vn, i(N(this, vn))), N(this, Ci).call(this);
    }, this.type = r, $(this, vn, n), e.set(r.id, this);
  }
  on(e) {
    return N(this, Jt).push(e), () => {
      $(this, Jt, N(this, Jt).filter((n) => n !== e));
    };
  }
  once(e) {
    const n = this.on((r) => {
      e(r), n();
    });
    return n;
  }
  off(e) {
    $(this, Jt, N(this, Jt).filter((n) => n !== e));
  }
  offAll() {
    $(this, Jt, []);
  }
}, Jt = new WeakMap(), vn = new WeakMap(), Ci = new WeakMap(), Rp), Vb = class {
  constructor(t, e) {
    this.id = Symbol(`Context-${e}`), this.name = e, this._defaultValue = t, this._typeInfo = () => {
      throw Ol();
    };
  }
  create(t, e = this._defaultValue) {
    return new _b(t, e, this);
  }
}, pe = (t, e) => new Vb(t, e), Uo, Jo, Go, Ar, Si, nr, vi, Mi, Ti, Lp, Hb = (Lp = class {
  constructor(t, e, n) {
    q(this, Uo);
    q(this, Jo);
    q(this, Go);
    q(this, Ar);
    q(this, Si);
    q(this, nr);
    q(this, vi);
    q(this, Mi);
    q(this, Ti);
    $(this, Ar, /* @__PURE__ */ new Set()), $(this, Si, /* @__PURE__ */ new Set()), $(this, nr, /* @__PURE__ */ new Map()), $(this, vi, /* @__PURE__ */ new Map()), this.read = () => ({
      metadata: N(this, Uo),
      injectedSlices: [...N(this, Ar)].map((r) => ({
        name: typeof r == "string" ? r : r.name,
        value: N(this, Mi).call(this, r)
      })),
      consumedSlices: [...N(this, Si)].map((r) => ({
        name: typeof r == "string" ? r : r.name,
        value: N(this, Mi).call(this, r)
      })),
      recordedTimers: [...N(this, nr)].map(([r, { duration: i }]) => ({
        name: r.name,
        duration: i,
        status: N(this, Ti).call(this, r)
      })),
      waitTimers: [...N(this, vi)].map(([r, { duration: i }]) => ({
        name: r.name,
        duration: i,
        status: N(this, Ti).call(this, r)
      }))
    }), this.onRecord = (r) => {
      N(this, nr).set(r, {
        start: Date.now(),
        duration: 0
      });
    }, this.onClear = (r) => {
      N(this, nr).delete(r);
    }, this.onDone = (r) => {
      const i = N(this, nr).get(r);
      i && (i.duration = Date.now() - i.start);
    }, this.onWait = (r, i) => {
      const o = Date.now();
      i.finally(() => {
        N(this, vi).set(r, { duration: Date.now() - o });
      }).catch(console.error);
    }, this.onInject = (r) => {
      N(this, Ar).add(r);
    }, this.onRemove = (r) => {
      N(this, Ar).delete(r);
    }, this.onUse = (r) => {
      N(this, Si).add(r);
    }, $(this, Mi, (r) => N(this, Jo).get(r).get()), $(this, Ti, (r) => N(this, Go).get(r).status), $(this, Jo, t), $(this, Go, e), $(this, Uo, n);
  }
}, Uo = new WeakMap(), Jo = new WeakMap(), Go = new WeakMap(), Ar = new WeakMap(), Si = new WeakMap(), nr = new WeakMap(), vi = new WeakMap(), Mi = new WeakMap(), Ti = new WeakMap(), Lp), Mn, Tn, Yo, $t, Ni, jb = (Ni = class {
  constructor(e, n, r) {
    q(this, Mn);
    q(this, Tn);
    q(this, Yo);
    q(this, $t);
    this.produce = (i) => i && Object.keys(i).length ? new Ni(N(this, Mn), N(this, Tn), { ...i }) : this, this.inject = (i, o) => {
      var l;
      const s = i.create(N(this, Mn).sliceMap);
      return o != null && s.set(o), (l = N(this, $t)) == null || l.onInject(i), this;
    }, this.remove = (i) => {
      var o;
      return N(this, Mn).remove(i), (o = N(this, $t)) == null || o.onRemove(i), this;
    }, this.record = (i) => {
      var o;
      return i.create(N(this, Tn).store), (o = N(this, $t)) == null || o.onRecord(i), this;
    }, this.clearTimer = (i) => {
      var o;
      return N(this, Tn).remove(i), (o = N(this, $t)) == null || o.onClear(i), this;
    }, this.isInjected = (i) => N(this, Mn).has(i), this.isRecorded = (i) => N(this, Tn).has(i), this.use = (i) => {
      var o;
      return (o = N(this, $t)) == null || o.onUse(i), N(this, Mn).get(i);
    }, this.get = (i) => this.use(i).get(), this.set = (i, o) => this.use(i).set(o), this.update = (i, o) => this.use(i).update(o), this.timer = (i) => N(this, Tn).get(i), this.done = (i) => {
      var o;
      this.timer(i).done(), (o = N(this, $t)) == null || o.onDone(i);
    }, this.wait = (i) => {
      var s;
      const o = this.timer(i).start();
      return (s = N(this, $t)) == null || s.onWait(i, o), o;
    }, this.waitTimers = async (i) => {
      await Promise.all(this.get(i).map((o) => this.wait(o)));
    }, $(this, Mn, e), $(this, Tn, n), $(this, Yo, r), r && $(this, $t, new Hb(e, n, r));
  }
  get meta() {
    return N(this, Yo);
  }
  get inspector() {
    return N(this, $t);
  }
}, Mn = new WeakMap(), Tn = new WeakMap(), Yo = new WeakMap(), $t = new WeakMap(), Ni), Wb = class {
  constructor() {
    this.store = /* @__PURE__ */ new Map(), this.get = (t) => {
      const e = this.store.get(t.id);
      if (!e) throw Lb(t.name);
      return e;
    }, this.remove = (t) => {
      this.store.delete(t.id);
    }, this.has = (t) => this.store.has(t.id);
  }
}, Ei, rr, Ai, Nn, Ii, Xo, Pp, qb = (Pp = class {
  constructor(t, e) {
    q(this, Ei);
    q(this, rr);
    q(this, Ai);
    q(this, Nn);
    q(this, Ii);
    q(this, Xo);
    $(this, Ei, null), $(this, rr, null), $(this, Nn, "pending"), this.start = () => (N(this, Ei) ?? $(this, Ei, new Promise((n, r) => {
      $(this, rr, (i) => {
        i instanceof CustomEvent && i.detail.id === N(this, Ai) && ($(this, Nn, "resolved"), N(this, Ii).call(this), i.stopImmediatePropagation(), n());
      }), N(this, Xo).call(this, () => {
        N(this, Nn) === "pending" && $(this, Nn, "rejected"), N(this, Ii).call(this), r(/* @__PURE__ */ new Error(`Timing ${this.type.name} timeout.`));
      }), $(this, Nn, "pending"), addEventListener(this.type.name, N(this, rr));
    })), N(this, Ei)), this.done = () => {
      const n = new CustomEvent(this.type.name, { detail: { id: N(this, Ai) } });
      dispatchEvent(n);
    }, $(this, Ii, () => {
      N(this, rr) && removeEventListener(this.type.name, N(this, rr));
    }), $(this, Xo, (n) => {
      setTimeout(() => {
        n();
      }, this.type.timeout);
    }), $(this, Ai, Symbol(e.name)), this.type = e, t.set(e.id, this);
  }
  get status() {
    return N(this, Nn);
  }
}, Ei = new WeakMap(), rr = new WeakMap(), Ai = new WeakMap(), Nn = new WeakMap(), Ii = new WeakMap(), Xo = new WeakMap(), Pp), Kb = class {
  constructor(t, e = 3e3) {
    this.create = (n) => new qb(n, this), this.id = Symbol(`Timer-${t}`), this.name = t, this.timeout = e;
  }
}, fn = (t, e = 3e3) => new Kb(t, e);
const Ub = {};
function Jc(t, e) {
  const n = Ub, r = typeof n.includeImageAlt == "boolean" ? n.includeImageAlt : !0, i = typeof n.includeHtml == "boolean" ? n.includeHtml : !0;
  return _p(t, r, i);
}
function _p(t, e, n) {
  if (Jb(t)) {
    if ("value" in t)
      return t.type === "html" && !n ? "" : t.value;
    if (e && "alt" in t && t.alt)
      return t.alt;
    if ("children" in t)
      return ud(t.children, e, n);
  }
  return Array.isArray(t) ? ud(t, e, n) : "";
}
function ud(t, e, n) {
  const r = [];
  let i = -1;
  for (; ++i < t.length; )
    r[i] = _p(t[i], e, n);
  return r.join("");
}
function Jb(t) {
  return !!(t && typeof t == "object");
}
const fd = document.createElement("i");
function Gc(t) {
  const e = "&" + t + ";";
  fd.innerHTML = e;
  const n = fd.textContent;
  return n.charCodeAt(n.length - 1) === 59 && t !== "semi" || n === e ? !1 : n;
}
function Ot(t, e, n, r) {
  const i = t.length;
  let o = 0, s;
  if (e < 0 ? e = -e > i ? 0 : i + e : e = e > i ? i : e, n = n > 0 ? n : 0, r.length < 1e4)
    s = Array.from(r), s.unshift(e, n), t.splice(...s);
  else
    for (n && t.splice(e, n); o < r.length; )
      s = r.slice(o, o + 1e4), s.unshift(e, 0), t.splice(...s), o += 1e4, e += 1e4;
}
function Ht(t, e) {
  return t.length > 0 ? (Ot(t, t.length, 0, e), t) : e;
}
const dd = {}.hasOwnProperty;
function Vp(t) {
  const e = {};
  let n = -1;
  for (; ++n < t.length; )
    Gb(e, t[n]);
  return e;
}
function Gb(t, e) {
  let n;
  for (n in e) {
    const i = (dd.call(t, n) ? t[n] : void 0) || (t[n] = {}), o = e[n];
    let s;
    if (o)
      for (s in o) {
        dd.call(i, s) || (i[s] = []);
        const l = o[s];
        Yb(
          // @ts-expect-error Looks like a list.
          i[s],
          Array.isArray(l) ? l : l ? [l] : []
        );
      }
  }
}
function Yb(t, e) {
  let n = -1;
  const r = [];
  for (; ++n < e.length; )
    (e[n].add === "after" ? t : r).push(e[n]);
  Ot(t, 0, 0, r);
}
function Hp(t, e) {
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
function Xt(t) {
  return t.replace(/[\t\n\r ]+/g, " ").replace(/^ | $/g, "").toLowerCase().toUpperCase();
}
const ft = gr(/[A-Za-z]/), kt = gr(/[\dA-Za-z]/), Xb = gr(/[#-'*+\--9=?A-Z^-~]/);
function fl(t) {
  return (
    // Special whitespace codes (which have negative values), C0 and Control
    // character DEL
    t !== null && (t < 32 || t === 127)
  );
}
const tc = gr(/\d/), Qb = gr(/[\dA-Fa-f]/), Zb = gr(/[!-/:-@[-`{-~]/);
function Z(t) {
  return t !== null && t < -2;
}
function Ne(t) {
  return t !== null && (t < 0 || t === 32);
}
function fe(t) {
  return t === -2 || t === -1 || t === 32;
}
const Dl = gr(new RegExp("[\\u0021-\\u002F\\u003A-\\u0040\\u005B-\\u0060\\u007B-\\u007E]")), Jr = gr(/\s/);
function gr(t) {
  return e;
  function e(n) {
    return n !== null && n > -1 && t.test(String.fromCharCode(n));
  }
}
function ge(t, e, n, r) {
  const i = r ? r - 1 : Number.POSITIVE_INFINITY;
  let o = 0;
  return s;
  function s(a) {
    return fe(a) ? (t.enter(n), l(a)) : e(a);
  }
  function l(a) {
    return fe(a) && o++ < i ? (t.consume(a), l) : (t.exit(n), e(a));
  }
}
const e1 = {
  tokenize: t1
};
function t1(t) {
  const e = t.attempt(this.parser.constructs.contentInitial, r, i);
  let n;
  return e;
  function r(l) {
    if (l === null) {
      t.consume(l);
      return;
    }
    return t.enter("lineEnding"), t.consume(l), t.exit("lineEnding"), ge(t, e, "linePrefix");
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
    return Z(l) ? (t.consume(l), t.exit("chunkText"), o) : (t.consume(l), s);
  }
}
const n1 = {
  tokenize: r1
}, hd = {
  tokenize: i1
};
function r1(t) {
  const e = this, n = [];
  let r = 0, i, o, s;
  return l;
  function l(I) {
    if (r < n.length) {
      const D = n[r];
      return e.containerState = D[1], t.attempt(D[0].continuation, a, c)(I);
    }
    return c(I);
  }
  function a(I) {
    if (r++, e.containerState._closeFlow) {
      e.containerState._closeFlow = void 0, i && L();
      const D = e.events.length;
      let j = D, A;
      for (; j--; )
        if (e.events[j][0] === "exit" && e.events[j][1].type === "chunkFlow") {
          A = e.events[j][1].end;
          break;
        }
      x(r);
      let _ = D;
      for (; _ < e.events.length; )
        e.events[_][1].end = {
          ...A
        }, _++;
      return Ot(e.events, j + 1, 0, e.events.slice(D)), e.events.length = _, c(I);
    }
    return l(I);
  }
  function c(I) {
    if (r === n.length) {
      if (!i)
        return d(I);
      if (i.currentConstruct && i.currentConstruct.concrete)
        return m(I);
      e.interrupt = !!(i.currentConstruct && !i._gfmTableDynamicInterruptHack);
    }
    return e.containerState = {}, t.check(hd, u, f)(I);
  }
  function u(I) {
    return i && L(), x(r), d(I);
  }
  function f(I) {
    return e.parser.lazy[e.now().line] = r !== n.length, s = e.now().offset, m(I);
  }
  function d(I) {
    return e.containerState = {}, t.attempt(hd, h, m)(I);
  }
  function h(I) {
    return r++, n.push([e.currentConstruct, e.containerState]), d(I);
  }
  function m(I) {
    if (I === null) {
      i && L(), x(0), t.consume(I);
      return;
    }
    return i = i || e.parser.flow(e.now()), t.enter("chunkFlow", {
      _tokenizer: i,
      contentType: "flow",
      previous: o
    }), b(I);
  }
  function b(I) {
    if (I === null) {
      C(t.exit("chunkFlow"), !0), x(0), t.consume(I);
      return;
    }
    return Z(I) ? (t.consume(I), C(t.exit("chunkFlow")), r = 0, e.interrupt = void 0, l) : (t.consume(I), b);
  }
  function C(I, D) {
    const j = e.sliceStream(I);
    if (D && j.push(null), I.previous = o, o && (o.next = I), o = I, i.defineSkip(I.start), i.write(j), e.parser.lazy[I.start.line]) {
      let A = i.events.length;
      for (; A--; )
        if (
          // The token starts before the line ending…
          i.events[A][1].start.offset < s && // …and either is not ended yet…
          (!i.events[A][1].end || // …or ends after it.
          i.events[A][1].end.offset > s)
        )
          return;
      const _ = e.events.length;
      let J = _, Y, O;
      for (; J--; )
        if (e.events[J][0] === "exit" && e.events[J][1].type === "chunkFlow") {
          if (Y) {
            O = e.events[J][1].end;
            break;
          }
          Y = !0;
        }
      for (x(r), A = _; A < e.events.length; )
        e.events[A][1].end = {
          ...O
        }, A++;
      Ot(e.events, J + 1, 0, e.events.slice(_)), e.events.length = A;
    }
  }
  function x(I) {
    let D = n.length;
    for (; D-- > I; ) {
      const j = n[D];
      e.containerState = j[1], j[0].exit.call(e, t);
    }
    n.length = I;
  }
  function L() {
    i.write([null]), o = void 0, i = void 0, e.containerState._closeFlow = void 0;
  }
}
function i1(t, e, n) {
  return ge(t, t.attempt(this.parser.constructs.document, e, n), "linePrefix", this.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4);
}
function Hi(t) {
  if (t === null || Ne(t) || Jr(t))
    return 1;
  if (Dl(t))
    return 2;
}
function Rl(t, e, n) {
  const r = [];
  let i = -1;
  for (; ++i < t.length; ) {
    const o = t[i].resolveAll;
    o && !r.includes(o) && (e = o(e, n), r.push(o));
  }
  return e;
}
const nc = {
  name: "attention",
  resolveAll: o1,
  tokenize: s1
};
function o1(t, e) {
  let n = -1, r, i, o, s, l, a, c, u;
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
          pd(f, -a), pd(d, a), s = {
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
          }, c = [], t[r][1].end.offset - t[r][1].start.offset && (c = Ht(c, [["enter", t[r][1], e], ["exit", t[r][1], e]])), c = Ht(c, [["enter", i, e], ["enter", s, e], ["exit", s, e], ["enter", o, e]]), c = Ht(c, Rl(e.parser.constructs.insideSpan.null, t.slice(r + 1, n), e)), c = Ht(c, [["exit", o, e], ["enter", l, e], ["exit", l, e], ["exit", i, e]]), t[n][1].end.offset - t[n][1].start.offset ? (u = 2, c = Ht(c, [["enter", t[n][1], e], ["exit", t[n][1], e]])) : u = 0, Ot(t, r - 1, n - r + 3, c), n = r + c.length - u - 2;
          break;
        }
    }
  for (n = -1; ++n < t.length; )
    t[n][1].type === "attentionSequence" && (t[n][1].type = "data");
  return t;
}
function s1(t, e) {
  const n = this.parser.constructs.attentionMarkers.null, r = this.previous, i = Hi(r);
  let o;
  return s;
  function s(a) {
    return o = a, t.enter("attentionSequence"), l(a);
  }
  function l(a) {
    if (a === o)
      return t.consume(a), l;
    const c = t.exit("attentionSequence"), u = Hi(a), f = !u || u === 2 && i || n.includes(a), d = !i || i === 2 && u || n.includes(r);
    return c._open = !!(o === 42 ? f : f && (i || !d)), c._close = !!(o === 42 ? d : d && (u || !f)), e(a);
  }
}
function pd(t, e) {
  t.column += e, t.offset += e, t._bufferIndex += e;
}
const l1 = {
  name: "autolink",
  tokenize: a1
};
function a1(t, e, n) {
  let r = 0;
  return i;
  function i(h) {
    return t.enter("autolink"), t.enter("autolinkMarker"), t.consume(h), t.exit("autolinkMarker"), t.enter("autolinkProtocol"), o;
  }
  function o(h) {
    return ft(h) ? (t.consume(h), s) : h === 64 ? n(h) : c(h);
  }
  function s(h) {
    return h === 43 || h === 45 || h === 46 || kt(h) ? (r = 1, l(h)) : c(h);
  }
  function l(h) {
    return h === 58 ? (t.consume(h), r = 0, a) : (h === 43 || h === 45 || h === 46 || kt(h)) && r++ < 32 ? (t.consume(h), l) : (r = 0, c(h));
  }
  function a(h) {
    return h === 62 ? (t.exit("autolinkProtocol"), t.enter("autolinkMarker"), t.consume(h), t.exit("autolinkMarker"), t.exit("autolink"), e) : h === null || h === 32 || h === 60 || fl(h) ? n(h) : (t.consume(h), a);
  }
  function c(h) {
    return h === 64 ? (t.consume(h), u) : Xb(h) ? (t.consume(h), c) : n(h);
  }
  function u(h) {
    return kt(h) ? f(h) : n(h);
  }
  function f(h) {
    return h === 46 ? (t.consume(h), r = 0, u) : h === 62 ? (t.exit("autolinkProtocol").type = "autolinkEmail", t.enter("autolinkMarker"), t.consume(h), t.exit("autolinkMarker"), t.exit("autolink"), e) : d(h);
  }
  function d(h) {
    if ((h === 45 || kt(h)) && r++ < 63) {
      const m = h === 45 ? d : f;
      return t.consume(h), m;
    }
    return n(h);
  }
}
const ds = {
  partial: !0,
  tokenize: c1
};
function c1(t, e, n) {
  return r;
  function r(o) {
    return fe(o) ? ge(t, i, "linePrefix")(o) : i(o);
  }
  function i(o) {
    return o === null || Z(o) ? e(o) : n(o);
  }
}
const jp = {
  continuation: {
    tokenize: f1
  },
  exit: d1,
  name: "blockQuote",
  tokenize: u1
};
function u1(t, e, n) {
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
    return fe(s) ? (t.enter("blockQuotePrefixWhitespace"), t.consume(s), t.exit("blockQuotePrefixWhitespace"), t.exit("blockQuotePrefix"), e) : (t.exit("blockQuotePrefix"), e(s));
  }
}
function f1(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return fe(s) ? ge(t, o, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(s) : o(s);
  }
  function o(s) {
    return t.attempt(jp, e, n)(s);
  }
}
function d1(t) {
  t.exit("blockQuote");
}
const Wp = {
  name: "characterEscape",
  tokenize: h1
};
function h1(t, e, n) {
  return r;
  function r(o) {
    return t.enter("characterEscape"), t.enter("escapeMarker"), t.consume(o), t.exit("escapeMarker"), i;
  }
  function i(o) {
    return Zb(o) ? (t.enter("characterEscapeValue"), t.consume(o), t.exit("characterEscapeValue"), t.exit("characterEscape"), e) : n(o);
  }
}
const qp = {
  name: "characterReference",
  tokenize: p1
};
function p1(t, e, n) {
  const r = this;
  let i = 0, o, s;
  return l;
  function l(f) {
    return t.enter("characterReference"), t.enter("characterReferenceMarker"), t.consume(f), t.exit("characterReferenceMarker"), a;
  }
  function a(f) {
    return f === 35 ? (t.enter("characterReferenceMarkerNumeric"), t.consume(f), t.exit("characterReferenceMarkerNumeric"), c) : (t.enter("characterReferenceValue"), o = 31, s = kt, u(f));
  }
  function c(f) {
    return f === 88 || f === 120 ? (t.enter("characterReferenceMarkerHexadecimal"), t.consume(f), t.exit("characterReferenceMarkerHexadecimal"), t.enter("characterReferenceValue"), o = 6, s = Qb, u) : (t.enter("characterReferenceValue"), o = 7, s = tc, u(f));
  }
  function u(f) {
    if (f === 59 && i) {
      const d = t.exit("characterReferenceValue");
      return s === kt && !Gc(r.sliceSerialize(d)) ? n(f) : (t.enter("characterReferenceMarker"), t.consume(f), t.exit("characterReferenceMarker"), t.exit("characterReference"), e);
    }
    return s(f) && i++ < o ? (t.consume(f), u) : n(f);
  }
}
const md = {
  partial: !0,
  tokenize: g1
}, gd = {
  concrete: !0,
  name: "codeFenced",
  tokenize: m1
};
function m1(t, e, n) {
  const r = this, i = {
    partial: !0,
    tokenize: j
  };
  let o = 0, s = 0, l;
  return a;
  function a(A) {
    return c(A);
  }
  function c(A) {
    const _ = r.events[r.events.length - 1];
    return o = _ && _[1].type === "linePrefix" ? _[2].sliceSerialize(_[1], !0).length : 0, l = A, t.enter("codeFenced"), t.enter("codeFencedFence"), t.enter("codeFencedFenceSequence"), u(A);
  }
  function u(A) {
    return A === l ? (s++, t.consume(A), u) : s < 3 ? n(A) : (t.exit("codeFencedFenceSequence"), fe(A) ? ge(t, f, "whitespace")(A) : f(A));
  }
  function f(A) {
    return A === null || Z(A) ? (t.exit("codeFencedFence"), r.interrupt ? e(A) : t.check(md, b, D)(A)) : (t.enter("codeFencedFenceInfo"), t.enter("chunkString", {
      contentType: "string"
    }), d(A));
  }
  function d(A) {
    return A === null || Z(A) ? (t.exit("chunkString"), t.exit("codeFencedFenceInfo"), f(A)) : fe(A) ? (t.exit("chunkString"), t.exit("codeFencedFenceInfo"), ge(t, h, "whitespace")(A)) : A === 96 && A === l ? n(A) : (t.consume(A), d);
  }
  function h(A) {
    return A === null || Z(A) ? f(A) : (t.enter("codeFencedFenceMeta"), t.enter("chunkString", {
      contentType: "string"
    }), m(A));
  }
  function m(A) {
    return A === null || Z(A) ? (t.exit("chunkString"), t.exit("codeFencedFenceMeta"), f(A)) : A === 96 && A === l ? n(A) : (t.consume(A), m);
  }
  function b(A) {
    return t.attempt(i, D, C)(A);
  }
  function C(A) {
    return t.enter("lineEnding"), t.consume(A), t.exit("lineEnding"), x;
  }
  function x(A) {
    return o > 0 && fe(A) ? ge(t, L, "linePrefix", o + 1)(A) : L(A);
  }
  function L(A) {
    return A === null || Z(A) ? t.check(md, b, D)(A) : (t.enter("codeFlowValue"), I(A));
  }
  function I(A) {
    return A === null || Z(A) ? (t.exit("codeFlowValue"), L(A)) : (t.consume(A), I);
  }
  function D(A) {
    return t.exit("codeFenced"), e(A);
  }
  function j(A, _, J) {
    let Y = 0;
    return O;
    function O(ce) {
      return A.enter("lineEnding"), A.consume(ce), A.exit("lineEnding"), U;
    }
    function U(ce) {
      return A.enter("codeFencedFence"), fe(ce) ? ge(A, K, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(ce) : K(ce);
    }
    function K(ce) {
      return ce === l ? (A.enter("codeFencedFenceSequence"), be(ce)) : J(ce);
    }
    function be(ce) {
      return ce === l ? (Y++, A.consume(ce), be) : Y >= s ? (A.exit("codeFencedFenceSequence"), fe(ce) ? ge(A, G, "whitespace")(ce) : G(ce)) : J(ce);
    }
    function G(ce) {
      return ce === null || Z(ce) ? (A.exit("codeFencedFence"), _(ce)) : J(ce);
    }
  }
}
function g1(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return s === null ? n(s) : (t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), o);
  }
  function o(s) {
    return r.parser.lazy[r.now().line] ? n(s) : e(s);
  }
}
const ia = {
  name: "codeIndented",
  tokenize: k1
}, y1 = {
  partial: !0,
  tokenize: b1
};
function k1(t, e, n) {
  const r = this;
  return i;
  function i(c) {
    return t.enter("codeIndented"), ge(t, o, "linePrefix", 5)(c);
  }
  function o(c) {
    const u = r.events[r.events.length - 1];
    return u && u[1].type === "linePrefix" && u[2].sliceSerialize(u[1], !0).length >= 4 ? s(c) : n(c);
  }
  function s(c) {
    return c === null ? a(c) : Z(c) ? t.attempt(y1, s, a)(c) : (t.enter("codeFlowValue"), l(c));
  }
  function l(c) {
    return c === null || Z(c) ? (t.exit("codeFlowValue"), s(c)) : (t.consume(c), l);
  }
  function a(c) {
    return t.exit("codeIndented"), e(c);
  }
}
function b1(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return r.parser.lazy[r.now().line] ? n(s) : Z(s) ? (t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), i) : ge(t, o, "linePrefix", 5)(s);
  }
  function o(s) {
    const l = r.events[r.events.length - 1];
    return l && l[1].type === "linePrefix" && l[2].sliceSerialize(l[1], !0).length >= 4 ? e(s) : Z(s) ? i(s) : n(s);
  }
}
const w1 = {
  name: "codeText",
  previous: C1,
  resolve: x1,
  tokenize: S1
};
function x1(t) {
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
function C1(t) {
  return t !== 96 || this.events[this.events.length - 1][1].type === "characterEscape";
}
function S1(t, e, n) {
  let r = 0, i, o;
  return s;
  function s(f) {
    return t.enter("codeText"), t.enter("codeTextSequence"), l(f);
  }
  function l(f) {
    return f === 96 ? (t.consume(f), r++, l) : (t.exit("codeTextSequence"), a(f));
  }
  function a(f) {
    return f === null ? n(f) : f === 32 ? (t.enter("space"), t.consume(f), t.exit("space"), a) : f === 96 ? (o = t.enter("codeTextSequence"), i = 0, u(f)) : Z(f) ? (t.enter("lineEnding"), t.consume(f), t.exit("lineEnding"), a) : (t.enter("codeTextData"), c(f));
  }
  function c(f) {
    return f === null || f === 32 || f === 96 || Z(f) ? (t.exit("codeTextData"), a(f)) : (t.consume(f), c);
  }
  function u(f) {
    return f === 96 ? (t.consume(f), i++, u) : i === r ? (t.exit("codeTextSequence"), t.exit("codeText"), e(f)) : (o.type = "codeTextData", c(f));
  }
}
class v1 {
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
    return r && fo(this.left, r), o.reverse();
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
    this.setCursor(Number.POSITIVE_INFINITY), fo(this.left, e);
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
    this.setCursor(0), fo(this.right, e.reverse());
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
        fo(this.right, n.reverse());
      } else {
        const n = this.right.splice(this.left.length + this.right.length - e, Number.POSITIVE_INFINITY);
        fo(this.left, n.reverse());
      }
  }
}
function fo(t, e) {
  let n = 0;
  if (e.length < 1e4)
    t.push(...e);
  else
    for (; n < e.length; )
      t.push(...e.slice(n, n + 1e4)), n += 1e4;
}
function Kp(t) {
  const e = {};
  let n = -1, r, i, o, s, l, a, c;
  const u = new v1(t);
  for (; ++n < u.length; ) {
    for (; n in e; )
      n = e[n];
    if (r = u.get(n), n && r[1].type === "chunkFlow" && u.get(n - 1)[1].type === "listItemPrefix" && (a = r[1]._tokenizer.events, o = 0, o < a.length && a[o][1].type === "lineEndingBlank" && (o += 2), o < a.length && a[o][1].type === "content"))
      for (; ++o < a.length && a[o][1].type !== "content"; )
        a[o][1].type === "chunkText" && (a[o][1]._isInFirstContentOfListItem = !0, o++);
    if (r[0] === "enter")
      r[1].contentType && (Object.assign(e, M1(u, n)), n = e[n], c = !0);
    else if (r[1]._container) {
      for (o = n, i = void 0; o--; )
        if (s = u.get(o), s[1].type === "lineEnding" || s[1].type === "lineEndingBlank")
          s[0] === "enter" && (i && (u.get(i)[1].type = "lineEndingBlank"), s[1].type = "lineEnding", i = o);
        else if (!(s[1].type === "linePrefix" || s[1].type === "listItemIndent")) break;
      i && (r[1].end = {
        ...u.get(i)[1].start
      }, l = u.slice(i, n), l.unshift(r), u.splice(i, n - i + 1, l));
    }
  }
  return Ot(t, 0, Number.POSITIVE_INFINITY, u.slice(0)), !c;
}
function M1(t, e) {
  const n = t.get(e)[1], r = t.get(e)[2];
  let i = e - 1;
  const o = [];
  let s = n._tokenizer;
  s || (s = r.parser[n.contentType](n.start), n._contentTypeTextTrailing && (s._contentTypeTextTrailing = !0));
  const l = s.events, a = [], c = {};
  let u, f, d = -1, h = n, m = 0, b = 0;
  const C = [b];
  for (; h; ) {
    for (; t.get(++i)[1] !== h; )
      ;
    o.push(i), h._tokenizer || (u = r.sliceStream(h), h.next || u.push(null), f && s.defineSkip(h.start), h._isInFirstContentOfListItem && (s._gfmTasklistFirstContentOfListItem = !0), s.write(u), h._isInFirstContentOfListItem && (s._gfmTasklistFirstContentOfListItem = void 0)), f = h, h = h.next;
  }
  for (h = n; ++d < l.length; )
    // Find a void token that includes a break.
    l[d][0] === "exit" && l[d - 1][0] === "enter" && l[d][1].type === l[d - 1][1].type && l[d][1].start.line !== l[d][1].end.line && (b = d + 1, C.push(b), h._tokenizer = void 0, h.previous = void 0, h = h.next);
  for (s.events = [], h ? (h._tokenizer = void 0, h.previous = void 0) : C.pop(), d = C.length; d--; ) {
    const x = l.slice(C[d], C[d + 1]), L = o.pop();
    a.push([L, L + x.length - 1]), t.splice(L, 2, x);
  }
  for (a.reverse(), d = -1; ++d < a.length; )
    c[m + a[d][0]] = m + a[d][1], m += a[d][1] - a[d][0] - 1;
  return c;
}
const T1 = {
  resolve: E1,
  tokenize: A1
}, N1 = {
  partial: !0,
  tokenize: I1
};
function E1(t) {
  return Kp(t), t;
}
function A1(t, e) {
  let n;
  return r;
  function r(l) {
    return t.enter("content"), n = t.enter("chunkContent", {
      contentType: "content"
    }), i(l);
  }
  function i(l) {
    return l === null ? o(l) : Z(l) ? t.check(N1, s, o)(l) : (t.consume(l), i);
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
function I1(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return t.exit("chunkContent"), t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), ge(t, o, "linePrefix");
  }
  function o(s) {
    if (s === null || Z(s))
      return n(s);
    const l = r.events[r.events.length - 1];
    return !r.parser.constructs.disable.null.includes("codeIndented") && l && l[1].type === "linePrefix" && l[2].sliceSerialize(l[1], !0).length >= 4 ? e(s) : t.interrupt(r.parser.constructs.flow, n, e)(s);
  }
}
function Up(t, e, n, r, i, o, s, l, a) {
  const c = a || Number.POSITIVE_INFINITY;
  let u = 0;
  return f;
  function f(x) {
    return x === 60 ? (t.enter(r), t.enter(i), t.enter(o), t.consume(x), t.exit(o), d) : x === null || x === 32 || x === 41 || fl(x) ? n(x) : (t.enter(r), t.enter(s), t.enter(l), t.enter("chunkString", {
      contentType: "string"
    }), b(x));
  }
  function d(x) {
    return x === 62 ? (t.enter(o), t.consume(x), t.exit(o), t.exit(i), t.exit(r), e) : (t.enter(l), t.enter("chunkString", {
      contentType: "string"
    }), h(x));
  }
  function h(x) {
    return x === 62 ? (t.exit("chunkString"), t.exit(l), d(x)) : x === null || x === 60 || Z(x) ? n(x) : (t.consume(x), x === 92 ? m : h);
  }
  function m(x) {
    return x === 60 || x === 62 || x === 92 ? (t.consume(x), h) : h(x);
  }
  function b(x) {
    return !u && (x === null || x === 41 || Ne(x)) ? (t.exit("chunkString"), t.exit(l), t.exit(s), t.exit(r), e(x)) : u < c && x === 40 ? (t.consume(x), u++, b) : x === 41 ? (t.consume(x), u--, b) : x === null || x === 32 || x === 40 || fl(x) ? n(x) : (t.consume(x), x === 92 ? C : b);
  }
  function C(x) {
    return x === 40 || x === 41 || x === 92 ? (t.consume(x), b) : b(x);
  }
}
function Jp(t, e, n, r, i, o) {
  const s = this;
  let l = 0, a;
  return c;
  function c(h) {
    return t.enter(r), t.enter(i), t.consume(h), t.exit(i), t.enter(o), u;
  }
  function u(h) {
    return l > 999 || h === null || h === 91 || h === 93 && !a || // To do: remove in the future once we’ve switched from
    // `micromark-extension-footnote` to `micromark-extension-gfm-footnote`,
    // which doesn’t need this.
    // Hidden footnotes hook.
    /* c8 ignore next 3 */
    h === 94 && !l && "_hiddenFootnoteSupport" in s.parser.constructs ? n(h) : h === 93 ? (t.exit(o), t.enter(i), t.consume(h), t.exit(i), t.exit(r), e) : Z(h) ? (t.enter("lineEnding"), t.consume(h), t.exit("lineEnding"), u) : (t.enter("chunkString", {
      contentType: "string"
    }), f(h));
  }
  function f(h) {
    return h === null || h === 91 || h === 93 || Z(h) || l++ > 999 ? (t.exit("chunkString"), u(h)) : (t.consume(h), a || (a = !fe(h)), h === 92 ? d : f);
  }
  function d(h) {
    return h === 91 || h === 92 || h === 93 ? (t.consume(h), l++, f) : f(h);
  }
}
function Gp(t, e, n, r, i, o) {
  let s;
  return l;
  function l(d) {
    return d === 34 || d === 39 || d === 40 ? (t.enter(r), t.enter(i), t.consume(d), t.exit(i), s = d === 40 ? 41 : d, a) : n(d);
  }
  function a(d) {
    return d === s ? (t.enter(i), t.consume(d), t.exit(i), t.exit(r), e) : (t.enter(o), c(d));
  }
  function c(d) {
    return d === s ? (t.exit(o), a(s)) : d === null ? n(d) : Z(d) ? (t.enter("lineEnding"), t.consume(d), t.exit("lineEnding"), ge(t, c, "linePrefix")) : (t.enter("chunkString", {
      contentType: "string"
    }), u(d));
  }
  function u(d) {
    return d === s || d === null || Z(d) ? (t.exit("chunkString"), c(d)) : (t.consume(d), d === 92 ? f : u);
  }
  function f(d) {
    return d === s || d === 92 ? (t.consume(d), u) : u(d);
  }
}
function xo(t, e) {
  let n;
  return r;
  function r(i) {
    return Z(i) ? (t.enter("lineEnding"), t.consume(i), t.exit("lineEnding"), n = !0, r) : fe(i) ? ge(t, r, n ? "linePrefix" : "lineSuffix")(i) : e(i);
  }
}
const O1 = {
  name: "definition",
  tokenize: R1
}, D1 = {
  partial: !0,
  tokenize: L1
};
function R1(t, e, n) {
  const r = this;
  let i;
  return o;
  function o(h) {
    return t.enter("definition"), s(h);
  }
  function s(h) {
    return Jp.call(
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
    return i = Xt(r.sliceSerialize(r.events[r.events.length - 1][1]).slice(1, -1)), h === 58 ? (t.enter("definitionMarker"), t.consume(h), t.exit("definitionMarker"), a) : n(h);
  }
  function a(h) {
    return Ne(h) ? xo(t, c)(h) : c(h);
  }
  function c(h) {
    return Up(
      t,
      u,
      // Note: we don’t need to reset the way `markdown-rs` does.
      n,
      "definitionDestination",
      "definitionDestinationLiteral",
      "definitionDestinationLiteralMarker",
      "definitionDestinationRaw",
      "definitionDestinationString"
    )(h);
  }
  function u(h) {
    return t.attempt(D1, f, f)(h);
  }
  function f(h) {
    return fe(h) ? ge(t, d, "whitespace")(h) : d(h);
  }
  function d(h) {
    return h === null || Z(h) ? (t.exit("definition"), r.parser.defined.push(i), e(h)) : n(h);
  }
}
function L1(t, e, n) {
  return r;
  function r(l) {
    return Ne(l) ? xo(t, i)(l) : n(l);
  }
  function i(l) {
    return Gp(t, o, n, "definitionTitle", "definitionTitleMarker", "definitionTitleString")(l);
  }
  function o(l) {
    return fe(l) ? ge(t, s, "whitespace")(l) : s(l);
  }
  function s(l) {
    return l === null || Z(l) ? e(l) : n(l);
  }
}
const P1 = {
  name: "hardBreakEscape",
  tokenize: z1
};
function z1(t, e, n) {
  return r;
  function r(o) {
    return t.enter("hardBreakEscape"), t.consume(o), i;
  }
  function i(o) {
    return Z(o) ? (t.exit("hardBreakEscape"), e(o)) : n(o);
  }
}
const B1 = {
  name: "headingAtx",
  resolve: F1,
  tokenize: $1
};
function F1(t, e) {
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
  }, Ot(t, r, n - r + 1, [["enter", i, e], ["enter", o, e], ["exit", o, e], ["exit", i, e]])), t;
}
function $1(t, e, n) {
  let r = 0;
  return i;
  function i(u) {
    return t.enter("atxHeading"), o(u);
  }
  function o(u) {
    return t.enter("atxHeadingSequence"), s(u);
  }
  function s(u) {
    return u === 35 && r++ < 6 ? (t.consume(u), s) : u === null || Ne(u) ? (t.exit("atxHeadingSequence"), l(u)) : n(u);
  }
  function l(u) {
    return u === 35 ? (t.enter("atxHeadingSequence"), a(u)) : u === null || Z(u) ? (t.exit("atxHeading"), e(u)) : fe(u) ? ge(t, l, "whitespace")(u) : (t.enter("atxHeadingText"), c(u));
  }
  function a(u) {
    return u === 35 ? (t.consume(u), a) : (t.exit("atxHeadingSequence"), l(u));
  }
  function c(u) {
    return u === null || u === 35 || Ne(u) ? (t.exit("atxHeadingText"), l(u)) : (t.consume(u), c);
  }
}
const _1 = [
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
], yd = ["pre", "script", "style", "textarea"], V1 = {
  concrete: !0,
  name: "htmlFlow",
  resolveTo: W1,
  tokenize: q1
}, H1 = {
  partial: !0,
  tokenize: U1
}, j1 = {
  partial: !0,
  tokenize: K1
};
function W1(t) {
  let e = t.length;
  for (; e-- && !(t[e][0] === "enter" && t[e][1].type === "htmlFlow"); )
    ;
  return e > 1 && t[e - 2][1].type === "linePrefix" && (t[e][1].start = t[e - 2][1].start, t[e + 1][1].start = t[e - 2][1].start, t.splice(e - 2, 2)), t;
}
function q1(t, e, n) {
  const r = this;
  let i, o, s, l, a;
  return c;
  function c(v) {
    return u(v);
  }
  function u(v) {
    return t.enter("htmlFlow"), t.enter("htmlFlowData"), t.consume(v), f;
  }
  function f(v) {
    return v === 33 ? (t.consume(v), d) : v === 47 ? (t.consume(v), o = !0, b) : v === 63 ? (t.consume(v), i = 3, r.interrupt ? e : S) : ft(v) ? (t.consume(v), s = String.fromCharCode(v), C) : n(v);
  }
  function d(v) {
    return v === 45 ? (t.consume(v), i = 2, h) : v === 91 ? (t.consume(v), i = 5, l = 0, m) : ft(v) ? (t.consume(v), i = 4, r.interrupt ? e : S) : n(v);
  }
  function h(v) {
    return v === 45 ? (t.consume(v), r.interrupt ? e : S) : n(v);
  }
  function m(v) {
    const le = "CDATA[";
    return v === le.charCodeAt(l++) ? (t.consume(v), l === le.length ? r.interrupt ? e : K : m) : n(v);
  }
  function b(v) {
    return ft(v) ? (t.consume(v), s = String.fromCharCode(v), C) : n(v);
  }
  function C(v) {
    if (v === null || v === 47 || v === 62 || Ne(v)) {
      const le = v === 47, at = s.toLowerCase();
      return !le && !o && yd.includes(at) ? (i = 1, r.interrupt ? e(v) : K(v)) : _1.includes(s.toLowerCase()) ? (i = 6, le ? (t.consume(v), x) : r.interrupt ? e(v) : K(v)) : (i = 7, r.interrupt && !r.parser.lazy[r.now().line] ? n(v) : o ? L(v) : I(v));
    }
    return v === 45 || kt(v) ? (t.consume(v), s += String.fromCharCode(v), C) : n(v);
  }
  function x(v) {
    return v === 62 ? (t.consume(v), r.interrupt ? e : K) : n(v);
  }
  function L(v) {
    return fe(v) ? (t.consume(v), L) : O(v);
  }
  function I(v) {
    return v === 47 ? (t.consume(v), O) : v === 58 || v === 95 || ft(v) ? (t.consume(v), D) : fe(v) ? (t.consume(v), I) : O(v);
  }
  function D(v) {
    return v === 45 || v === 46 || v === 58 || v === 95 || kt(v) ? (t.consume(v), D) : j(v);
  }
  function j(v) {
    return v === 61 ? (t.consume(v), A) : fe(v) ? (t.consume(v), j) : I(v);
  }
  function A(v) {
    return v === null || v === 60 || v === 61 || v === 62 || v === 96 ? n(v) : v === 34 || v === 39 ? (t.consume(v), a = v, _) : fe(v) ? (t.consume(v), A) : J(v);
  }
  function _(v) {
    return v === a ? (t.consume(v), a = null, Y) : v === null || Z(v) ? n(v) : (t.consume(v), _);
  }
  function J(v) {
    return v === null || v === 34 || v === 39 || v === 47 || v === 60 || v === 61 || v === 62 || v === 96 || Ne(v) ? j(v) : (t.consume(v), J);
  }
  function Y(v) {
    return v === 47 || v === 62 || fe(v) ? I(v) : n(v);
  }
  function O(v) {
    return v === 62 ? (t.consume(v), U) : n(v);
  }
  function U(v) {
    return v === null || Z(v) ? K(v) : fe(v) ? (t.consume(v), U) : n(v);
  }
  function K(v) {
    return v === 45 && i === 2 ? (t.consume(v), ne) : v === 60 && i === 1 ? (t.consume(v), Ee) : v === 62 && i === 4 ? (t.consume(v), Se) : v === 63 && i === 3 ? (t.consume(v), S) : v === 93 && i === 5 ? (t.consume(v), vt) : Z(v) && (i === 6 || i === 7) ? (t.exit("htmlFlowData"), t.check(H1, Ke, be)(v)) : v === null || Z(v) ? (t.exit("htmlFlowData"), be(v)) : (t.consume(v), K);
  }
  function be(v) {
    return t.check(j1, G, Ke)(v);
  }
  function G(v) {
    return t.enter("lineEnding"), t.consume(v), t.exit("lineEnding"), ce;
  }
  function ce(v) {
    return v === null || Z(v) ? be(v) : (t.enter("htmlFlowData"), K(v));
  }
  function ne(v) {
    return v === 45 ? (t.consume(v), S) : K(v);
  }
  function Ee(v) {
    return v === 47 ? (t.consume(v), s = "", lt) : K(v);
  }
  function lt(v) {
    if (v === 62) {
      const le = s.toLowerCase();
      return yd.includes(le) ? (t.consume(v), Se) : K(v);
    }
    return ft(v) && s.length < 8 ? (t.consume(v), s += String.fromCharCode(v), lt) : K(v);
  }
  function vt(v) {
    return v === 93 ? (t.consume(v), S) : K(v);
  }
  function S(v) {
    return v === 62 ? (t.consume(v), Se) : v === 45 && i === 2 ? (t.consume(v), S) : K(v);
  }
  function Se(v) {
    return v === null || Z(v) ? (t.exit("htmlFlowData"), Ke(v)) : (t.consume(v), Se);
  }
  function Ke(v) {
    return t.exit("htmlFlow"), e(v);
  }
}
function K1(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return Z(s) ? (t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), o) : n(s);
  }
  function o(s) {
    return r.parser.lazy[r.now().line] ? n(s) : e(s);
  }
}
function U1(t, e, n) {
  return r;
  function r(i) {
    return t.enter("lineEnding"), t.consume(i), t.exit("lineEnding"), t.attempt(ds, e, n);
  }
}
const J1 = {
  name: "htmlText",
  tokenize: G1
};
function G1(t, e, n) {
  const r = this;
  let i, o, s;
  return l;
  function l(S) {
    return t.enter("htmlText"), t.enter("htmlTextData"), t.consume(S), a;
  }
  function a(S) {
    return S === 33 ? (t.consume(S), c) : S === 47 ? (t.consume(S), j) : S === 63 ? (t.consume(S), I) : ft(S) ? (t.consume(S), J) : n(S);
  }
  function c(S) {
    return S === 45 ? (t.consume(S), u) : S === 91 ? (t.consume(S), o = 0, m) : ft(S) ? (t.consume(S), L) : n(S);
  }
  function u(S) {
    return S === 45 ? (t.consume(S), h) : n(S);
  }
  function f(S) {
    return S === null ? n(S) : S === 45 ? (t.consume(S), d) : Z(S) ? (s = f, Ee(S)) : (t.consume(S), f);
  }
  function d(S) {
    return S === 45 ? (t.consume(S), h) : f(S);
  }
  function h(S) {
    return S === 62 ? ne(S) : S === 45 ? d(S) : f(S);
  }
  function m(S) {
    const Se = "CDATA[";
    return S === Se.charCodeAt(o++) ? (t.consume(S), o === Se.length ? b : m) : n(S);
  }
  function b(S) {
    return S === null ? n(S) : S === 93 ? (t.consume(S), C) : Z(S) ? (s = b, Ee(S)) : (t.consume(S), b);
  }
  function C(S) {
    return S === 93 ? (t.consume(S), x) : b(S);
  }
  function x(S) {
    return S === 62 ? ne(S) : S === 93 ? (t.consume(S), x) : b(S);
  }
  function L(S) {
    return S === null || S === 62 ? ne(S) : Z(S) ? (s = L, Ee(S)) : (t.consume(S), L);
  }
  function I(S) {
    return S === null ? n(S) : S === 63 ? (t.consume(S), D) : Z(S) ? (s = I, Ee(S)) : (t.consume(S), I);
  }
  function D(S) {
    return S === 62 ? ne(S) : I(S);
  }
  function j(S) {
    return ft(S) ? (t.consume(S), A) : n(S);
  }
  function A(S) {
    return S === 45 || kt(S) ? (t.consume(S), A) : _(S);
  }
  function _(S) {
    return Z(S) ? (s = _, Ee(S)) : fe(S) ? (t.consume(S), _) : ne(S);
  }
  function J(S) {
    return S === 45 || kt(S) ? (t.consume(S), J) : S === 47 || S === 62 || Ne(S) ? Y(S) : n(S);
  }
  function Y(S) {
    return S === 47 ? (t.consume(S), ne) : S === 58 || S === 95 || ft(S) ? (t.consume(S), O) : Z(S) ? (s = Y, Ee(S)) : fe(S) ? (t.consume(S), Y) : ne(S);
  }
  function O(S) {
    return S === 45 || S === 46 || S === 58 || S === 95 || kt(S) ? (t.consume(S), O) : U(S);
  }
  function U(S) {
    return S === 61 ? (t.consume(S), K) : Z(S) ? (s = U, Ee(S)) : fe(S) ? (t.consume(S), U) : Y(S);
  }
  function K(S) {
    return S === null || S === 60 || S === 61 || S === 62 || S === 96 ? n(S) : S === 34 || S === 39 ? (t.consume(S), i = S, be) : Z(S) ? (s = K, Ee(S)) : fe(S) ? (t.consume(S), K) : (t.consume(S), G);
  }
  function be(S) {
    return S === i ? (t.consume(S), i = void 0, ce) : S === null ? n(S) : Z(S) ? (s = be, Ee(S)) : (t.consume(S), be);
  }
  function G(S) {
    return S === null || S === 34 || S === 39 || S === 60 || S === 61 || S === 96 ? n(S) : S === 47 || S === 62 || Ne(S) ? Y(S) : (t.consume(S), G);
  }
  function ce(S) {
    return S === 47 || S === 62 || Ne(S) ? Y(S) : n(S);
  }
  function ne(S) {
    return S === 62 ? (t.consume(S), t.exit("htmlTextData"), t.exit("htmlText"), e) : n(S);
  }
  function Ee(S) {
    return t.exit("htmlTextData"), t.enter("lineEnding"), t.consume(S), t.exit("lineEnding"), lt;
  }
  function lt(S) {
    return fe(S) ? ge(t, vt, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(S) : vt(S);
  }
  function vt(S) {
    return t.enter("htmlTextData"), s(S);
  }
}
const Yc = {
  name: "labelEnd",
  resolveAll: Z1,
  resolveTo: ew,
  tokenize: tw
}, Y1 = {
  tokenize: nw
}, X1 = {
  tokenize: rw
}, Q1 = {
  tokenize: iw
};
function Z1(t) {
  let e = -1;
  const n = [];
  for (; ++e < t.length; ) {
    const r = t[e][1];
    if (n.push(t[e]), r.type === "labelImage" || r.type === "labelLink" || r.type === "labelEnd") {
      const i = r.type === "labelImage" ? 4 : 2;
      r.type = "data", e += i;
    }
  }
  return t.length !== n.length && Ot(t, 0, t.length, n), t;
}
function ew(t, e) {
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
  }, c = {
    type: "label",
    start: {
      ...t[o][1].start
    },
    end: {
      ...t[s][1].end
    }
  }, u = {
    type: "labelText",
    start: {
      ...t[o + r + 2][1].end
    },
    end: {
      ...t[s - 2][1].start
    }
  };
  return l = [["enter", a, e], ["enter", c, e]], l = Ht(l, t.slice(o + 1, o + r + 3)), l = Ht(l, [["enter", u, e]]), l = Ht(l, Rl(e.parser.constructs.insideSpan.null, t.slice(o + r + 4, s - 3), e)), l = Ht(l, [["exit", u, e], t[s - 2], t[s - 1], ["exit", c, e]]), l = Ht(l, t.slice(s + 1)), l = Ht(l, [["exit", a, e]]), Ot(t, o, t.length, l), t;
}
function tw(t, e, n) {
  const r = this;
  let i = r.events.length, o, s;
  for (; i--; )
    if ((r.events[i][1].type === "labelImage" || r.events[i][1].type === "labelLink") && !r.events[i][1]._balanced) {
      o = r.events[i][1];
      break;
    }
  return l;
  function l(d) {
    return o ? o._inactive ? f(d) : (s = r.parser.defined.includes(Xt(r.sliceSerialize({
      start: o.end,
      end: r.now()
    }))), t.enter("labelEnd"), t.enter("labelMarker"), t.consume(d), t.exit("labelMarker"), t.exit("labelEnd"), a) : n(d);
  }
  function a(d) {
    return d === 40 ? t.attempt(Y1, u, s ? u : f)(d) : d === 91 ? t.attempt(X1, u, s ? c : f)(d) : s ? u(d) : f(d);
  }
  function c(d) {
    return t.attempt(Q1, u, f)(d);
  }
  function u(d) {
    return e(d);
  }
  function f(d) {
    return o._balanced = !0, n(d);
  }
}
function nw(t, e, n) {
  return r;
  function r(f) {
    return t.enter("resource"), t.enter("resourceMarker"), t.consume(f), t.exit("resourceMarker"), i;
  }
  function i(f) {
    return Ne(f) ? xo(t, o)(f) : o(f);
  }
  function o(f) {
    return f === 41 ? u(f) : Up(t, s, l, "resourceDestination", "resourceDestinationLiteral", "resourceDestinationLiteralMarker", "resourceDestinationRaw", "resourceDestinationString", 32)(f);
  }
  function s(f) {
    return Ne(f) ? xo(t, a)(f) : u(f);
  }
  function l(f) {
    return n(f);
  }
  function a(f) {
    return f === 34 || f === 39 || f === 40 ? Gp(t, c, n, "resourceTitle", "resourceTitleMarker", "resourceTitleString")(f) : u(f);
  }
  function c(f) {
    return Ne(f) ? xo(t, u)(f) : u(f);
  }
  function u(f) {
    return f === 41 ? (t.enter("resourceMarker"), t.consume(f), t.exit("resourceMarker"), t.exit("resource"), e) : n(f);
  }
}
function rw(t, e, n) {
  const r = this;
  return i;
  function i(l) {
    return Jp.call(r, t, o, s, "reference", "referenceMarker", "referenceString")(l);
  }
  function o(l) {
    return r.parser.defined.includes(Xt(r.sliceSerialize(r.events[r.events.length - 1][1]).slice(1, -1))) ? e(l) : n(l);
  }
  function s(l) {
    return n(l);
  }
}
function iw(t, e, n) {
  return r;
  function r(o) {
    return t.enter("reference"), t.enter("referenceMarker"), t.consume(o), t.exit("referenceMarker"), i;
  }
  function i(o) {
    return o === 93 ? (t.enter("referenceMarker"), t.consume(o), t.exit("referenceMarker"), t.exit("reference"), e) : n(o);
  }
}
const ow = {
  name: "labelStartImage",
  resolveAll: Yc.resolveAll,
  tokenize: sw
};
function sw(t, e, n) {
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
const lw = {
  name: "labelStartLink",
  resolveAll: Yc.resolveAll,
  tokenize: aw
};
function aw(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return t.enter("labelLink"), t.enter("labelMarker"), t.consume(s), t.exit("labelMarker"), t.exit("labelLink"), o;
  }
  function o(s) {
    return s === 94 && "_hiddenFootnoteSupport" in r.parser.constructs ? n(s) : e(s);
  }
}
const oa = {
  name: "lineEnding",
  tokenize: cw
};
function cw(t, e) {
  return n;
  function n(r) {
    return t.enter("lineEnding"), t.consume(r), t.exit("lineEnding"), ge(t, e, "linePrefix");
  }
}
const Gs = {
  name: "thematicBreak",
  tokenize: uw
};
function uw(t, e, n) {
  let r = 0, i;
  return o;
  function o(c) {
    return t.enter("thematicBreak"), s(c);
  }
  function s(c) {
    return i = c, l(c);
  }
  function l(c) {
    return c === i ? (t.enter("thematicBreakSequence"), a(c)) : r >= 3 && (c === null || Z(c)) ? (t.exit("thematicBreak"), e(c)) : n(c);
  }
  function a(c) {
    return c === i ? (t.consume(c), r++, a) : (t.exit("thematicBreakSequence"), fe(c) ? ge(t, l, "whitespace")(c) : l(c));
  }
}
const mt = {
  continuation: {
    tokenize: pw
  },
  exit: gw,
  name: "list",
  tokenize: hw
}, fw = {
  partial: !0,
  tokenize: yw
}, dw = {
  partial: !0,
  tokenize: mw
};
function hw(t, e, n) {
  const r = this, i = r.events[r.events.length - 1];
  let o = i && i[1].type === "linePrefix" ? i[2].sliceSerialize(i[1], !0).length : 0, s = 0;
  return l;
  function l(h) {
    const m = r.containerState.type || (h === 42 || h === 43 || h === 45 ? "listUnordered" : "listOrdered");
    if (m === "listUnordered" ? !r.containerState.marker || h === r.containerState.marker : tc(h)) {
      if (r.containerState.type || (r.containerState.type = m, t.enter(m, {
        _container: !0
      })), m === "listUnordered")
        return t.enter("listItemPrefix"), h === 42 || h === 45 ? t.check(Gs, n, c)(h) : c(h);
      if (!r.interrupt || h === 49)
        return t.enter("listItemPrefix"), t.enter("listItemValue"), a(h);
    }
    return n(h);
  }
  function a(h) {
    return tc(h) && ++s < 10 ? (t.consume(h), a) : (!r.interrupt || s < 2) && (r.containerState.marker ? h === r.containerState.marker : h === 41 || h === 46) ? (t.exit("listItemValue"), c(h)) : n(h);
  }
  function c(h) {
    return t.enter("listItemMarker"), t.consume(h), t.exit("listItemMarker"), r.containerState.marker = r.containerState.marker || h, t.check(
      ds,
      // Can’t be empty when interrupting.
      r.interrupt ? n : u,
      t.attempt(fw, d, f)
    );
  }
  function u(h) {
    return r.containerState.initialBlankLine = !0, o++, d(h);
  }
  function f(h) {
    return fe(h) ? (t.enter("listItemPrefixWhitespace"), t.consume(h), t.exit("listItemPrefixWhitespace"), d) : n(h);
  }
  function d(h) {
    return r.containerState.size = o + r.sliceSerialize(t.exit("listItemPrefix"), !0).length, e(h);
  }
}
function pw(t, e, n) {
  const r = this;
  return r.containerState._closeFlow = void 0, t.check(ds, i, o);
  function i(l) {
    return r.containerState.furtherBlankLines = r.containerState.furtherBlankLines || r.containerState.initialBlankLine, ge(t, e, "listItemIndent", r.containerState.size + 1)(l);
  }
  function o(l) {
    return r.containerState.furtherBlankLines || !fe(l) ? (r.containerState.furtherBlankLines = void 0, r.containerState.initialBlankLine = void 0, s(l)) : (r.containerState.furtherBlankLines = void 0, r.containerState.initialBlankLine = void 0, t.attempt(dw, e, s)(l));
  }
  function s(l) {
    return r.containerState._closeFlow = !0, r.interrupt = void 0, ge(t, t.attempt(mt, e, n), "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(l);
  }
}
function mw(t, e, n) {
  const r = this;
  return ge(t, i, "listItemIndent", r.containerState.size + 1);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return s && s[1].type === "listItemIndent" && s[2].sliceSerialize(s[1], !0).length === r.containerState.size ? e(o) : n(o);
  }
}
function gw(t) {
  t.exit(this.containerState.type);
}
function yw(t, e, n) {
  const r = this;
  return ge(t, i, "listItemPrefixWhitespace", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 5);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return !fe(o) && s && s[1].type === "listItemPrefixWhitespace" ? e(o) : n(o);
  }
}
const kd = {
  name: "setextUnderline",
  resolveTo: kw,
  tokenize: bw
};
function kw(t, e) {
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
function bw(t, e, n) {
  const r = this;
  let i;
  return o;
  function o(c) {
    let u = r.events.length, f;
    for (; u--; )
      if (r.events[u][1].type !== "lineEnding" && r.events[u][1].type !== "linePrefix" && r.events[u][1].type !== "content") {
        f = r.events[u][1].type === "paragraph";
        break;
      }
    return !r.parser.lazy[r.now().line] && (r.interrupt || f) ? (t.enter("setextHeadingLine"), i = c, s(c)) : n(c);
  }
  function s(c) {
    return t.enter("setextHeadingLineSequence"), l(c);
  }
  function l(c) {
    return c === i ? (t.consume(c), l) : (t.exit("setextHeadingLineSequence"), fe(c) ? ge(t, a, "lineSuffix")(c) : a(c));
  }
  function a(c) {
    return c === null || Z(c) ? (t.exit("setextHeadingLine"), e(c)) : n(c);
  }
}
const ww = {
  tokenize: xw
};
function xw(t) {
  const e = this, n = t.attempt(
    // Try to parse a blank line.
    ds,
    r,
    // Try to parse initial flow (essentially, only code).
    t.attempt(this.parser.constructs.flowInitial, i, ge(t, t.attempt(this.parser.constructs.flow, i, t.attempt(T1, i)), "linePrefix"))
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
const Cw = {
  resolveAll: Xp()
}, Sw = Yp("string"), vw = Yp("text");
function Yp(t) {
  return {
    resolveAll: Xp(t === "text" ? Mw : void 0),
    tokenize: e
  };
  function e(n) {
    const r = this, i = this.parser.constructs[t], o = n.attempt(i, s, l);
    return s;
    function s(u) {
      return c(u) ? o(u) : l(u);
    }
    function l(u) {
      if (u === null) {
        n.consume(u);
        return;
      }
      return n.enter("data"), n.consume(u), a;
    }
    function a(u) {
      return c(u) ? (n.exit("data"), o(u)) : (n.consume(u), a);
    }
    function c(u) {
      if (u === null)
        return !0;
      const f = i[u];
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
function Xp(t) {
  return e;
  function e(n, r) {
    let i = -1, o;
    for (; ++i <= n.length; )
      o === void 0 ? n[i] && n[i][1].type === "data" && (o = i, i++) : (!n[i] || n[i][1].type !== "data") && (i !== o + 2 && (n[o][1].end = n[i - 1][1].end, n.splice(o + 2, i - o - 2), i = o + 2), o = void 0);
    return t ? t(n, r) : n;
  }
}
function Mw(t, e) {
  let n = 0;
  for (; ++n <= t.length; )
    if ((n === t.length || t[n][1].type === "lineEnding") && t[n - 1][1].type === "data") {
      const r = t[n - 1][1], i = e.sliceStream(r);
      let o = i.length, s = -1, l = 0, a;
      for (; o--; ) {
        const c = i[o];
        if (typeof c == "string") {
          for (s = c.length; c.charCodeAt(s - 1) === 32; )
            l++, s--;
          if (s) break;
          s = -1;
        } else if (c === -2)
          a = !0, l++;
        else if (c !== -1) {
          o++;
          break;
        }
      }
      if (e._contentTypeTextTrailing && n === t.length && (l = 0), l) {
        const c = {
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
          ...c.start
        }, r.start.offset === r.end.offset ? Object.assign(r, c) : (t.splice(n, 0, ["enter", c, e], ["exit", c, e]), n += 2);
      }
      n++;
    }
  return t;
}
const Tw = {
  42: mt,
  43: mt,
  45: mt,
  48: mt,
  49: mt,
  50: mt,
  51: mt,
  52: mt,
  53: mt,
  54: mt,
  55: mt,
  56: mt,
  57: mt,
  62: jp
}, Nw = {
  91: O1
}, Ew = {
  [-2]: ia,
  [-1]: ia,
  32: ia
}, Aw = {
  35: B1,
  42: Gs,
  45: [kd, Gs],
  60: V1,
  61: kd,
  95: Gs,
  96: gd,
  126: gd
}, Iw = {
  38: qp,
  92: Wp
}, Ow = {
  [-5]: oa,
  [-4]: oa,
  [-3]: oa,
  33: ow,
  38: qp,
  42: nc,
  60: [l1, J1],
  91: lw,
  92: [P1, Wp],
  93: Yc,
  95: nc,
  96: w1
}, Dw = {
  null: [nc, Cw]
}, Rw = {
  null: [42, 95]
}, Lw = {
  null: []
}, Pw = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  attentionMarkers: Rw,
  contentInitial: Nw,
  disable: Lw,
  document: Tw,
  flow: Aw,
  flowInitial: Ew,
  insideSpan: Dw,
  string: Iw,
  text: Ow
}, Symbol.toStringTag, { value: "Module" }));
function zw(t, e, n) {
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
    attempt: _(j),
    check: _(A),
    consume: L,
    enter: I,
    exit: D,
    interrupt: _(A, {
      interrupt: !0
    })
  }, c = {
    code: null,
    containerState: {},
    defineSkip: b,
    events: [],
    now: m,
    parser: t,
    previous: null,
    sliceSerialize: d,
    sliceStream: h,
    write: f
  };
  let u = e.tokenize.call(c, a);
  return e.resolveAll && o.push(e), c;
  function f(U) {
    return s = Ht(s, U), C(), s[s.length - 1] !== null ? [] : (J(e, 0), c.events = Rl(o, c.events, c), c.events);
  }
  function d(U, K) {
    return Fw(h(U), K);
  }
  function h(U) {
    return Bw(s, U);
  }
  function m() {
    const {
      _bufferIndex: U,
      _index: K,
      line: be,
      column: G,
      offset: ce
    } = r;
    return {
      _bufferIndex: U,
      _index: K,
      line: be,
      column: G,
      offset: ce
    };
  }
  function b(U) {
    i[U.line] = U.column, O();
  }
  function C() {
    let U;
    for (; r._index < s.length; ) {
      const K = s[r._index];
      if (typeof K == "string")
        for (U = r._index, r._bufferIndex < 0 && (r._bufferIndex = 0); r._index === U && r._bufferIndex < K.length; )
          x(K.charCodeAt(r._bufferIndex));
      else
        x(K);
    }
  }
  function x(U) {
    u = u(U);
  }
  function L(U) {
    Z(U) ? (r.line++, r.column = 1, r.offset += U === -3 ? 2 : 1, O()) : U !== -1 && (r.column++, r.offset++), r._bufferIndex < 0 ? r._index++ : (r._bufferIndex++, r._bufferIndex === // Points w/ non-negative `_bufferIndex` reference
    // strings.
    /** @type {string} */
    s[r._index].length && (r._bufferIndex = -1, r._index++)), c.previous = U;
  }
  function I(U, K) {
    const be = K || {};
    return be.type = U, be.start = m(), c.events.push(["enter", be, c]), l.push(be), be;
  }
  function D(U) {
    const K = l.pop();
    return K.end = m(), c.events.push(["exit", K, c]), K;
  }
  function j(U, K) {
    J(U, K.from);
  }
  function A(U, K) {
    K.restore();
  }
  function _(U, K) {
    return be;
    function be(G, ce, ne) {
      let Ee, lt, vt, S;
      return Array.isArray(G) ? (
        /* c8 ignore next 1 */
        Ke(G)
      ) : "tokenize" in G ? (
        // Looks like a construct.
        Ke([
          /** @type {Construct} */
          G
        ])
      ) : Se(G);
      function Se(Oe) {
        return Lt;
        function Lt(Ue) {
          const Pe = Ue !== null && Oe[Ue], de = Ue !== null && Oe.null, Pt = [
            // To do: add more extension tests.
            /* c8 ignore next 2 */
            ...Array.isArray(Pe) ? Pe : Pe ? [Pe] : [],
            ...Array.isArray(de) ? de : de ? [de] : []
          ];
          return Ke(Pt)(Ue);
        }
      }
      function Ke(Oe) {
        return Ee = Oe, lt = 0, Oe.length === 0 ? ne : v(Oe[lt]);
      }
      function v(Oe) {
        return Lt;
        function Lt(Ue) {
          return S = Y(), vt = Oe, Oe.partial || (c.currentConstruct = Oe), Oe.name && c.parser.constructs.disable.null.includes(Oe.name) ? at() : Oe.tokenize.call(
            // If we do have fields, create an object w/ `context` as its
            // prototype.
            // This allows a “live binding”, which is needed for `interrupt`.
            K ? Object.assign(Object.create(c), K) : c,
            a,
            le,
            at
          )(Ue);
        }
      }
      function le(Oe) {
        return U(vt, S), ce;
      }
      function at(Oe) {
        return S.restore(), ++lt < Ee.length ? v(Ee[lt]) : ne;
      }
    }
  }
  function J(U, K) {
    U.resolveAll && !o.includes(U) && o.push(U), U.resolve && Ot(c.events, K, c.events.length - K, U.resolve(c.events.slice(K), c)), U.resolveTo && (c.events = U.resolveTo(c.events, c));
  }
  function Y() {
    const U = m(), K = c.previous, be = c.currentConstruct, G = c.events.length, ce = Array.from(l);
    return {
      from: G,
      restore: ne
    };
    function ne() {
      r = U, c.previous = K, c.currentConstruct = be, c.events.length = G, l = ce, O();
    }
  }
  function O() {
    r.line in i && r.column < 2 && (r.column = i[r.line], r.offset += i[r.line] - 1);
  }
}
function Bw(t, e) {
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
function Fw(t, e) {
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
function $w(t) {
  const r = {
    constructs: (
      /** @type {FullNormalizedExtension} */
      Vp([Pw, ...(t || {}).extensions || []])
    ),
    content: i(e1),
    defined: [],
    document: i(n1),
    flow: i(ww),
    lazy: {},
    string: i(Sw),
    text: i(vw)
  };
  return r;
  function i(o) {
    return s;
    function s(l) {
      return zw(r, o, l);
    }
  }
}
function _w(t) {
  for (; !Kp(t); )
    ;
  return t;
}
const bd = /[\0\t\n\r]/g;
function Vw() {
  let t = 1, e = "", n = !0, r;
  return i;
  function i(o, s, l) {
    const a = [];
    let c, u, f, d, h;
    for (o = e + (typeof o == "string" ? o.toString() : new TextDecoder(s || void 0).decode(o)), f = 0, e = "", n && (o.charCodeAt(0) === 65279 && f++, n = void 0); f < o.length; ) {
      if (bd.lastIndex = f, c = bd.exec(o), d = c && c.index !== void 0 ? c.index : o.length, h = o.charCodeAt(d), !c) {
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
            for (u = Math.ceil(t / 4) * 4, a.push(-2); t++ < u; ) a.push(-1);
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
const Hw = /\\([!-/:-@[-`{-~])|&(#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});/gi;
function Qp(t) {
  return t.replace(Hw, jw);
}
function jw(t, e, n) {
  if (e)
    return e;
  if (n.charCodeAt(0) === 35) {
    const i = n.charCodeAt(1), o = i === 120 || i === 88;
    return Hp(n.slice(o ? 2 : 1), o ? 16 : 10);
  }
  return Gc(n) || t;
}
function Co(t) {
  return !t || typeof t != "object" ? "" : "position" in t || "type" in t ? wd(t.position) : "start" in t || "end" in t ? wd(t) : "line" in t || "column" in t ? rc(t) : "";
}
function rc(t) {
  return xd(t && t.line) + ":" + xd(t && t.column);
}
function wd(t) {
  return rc(t && t.start) + "-" + rc(t && t.end);
}
function xd(t) {
  return t && typeof t == "number" ? t : 1;
}
const Zp = {}.hasOwnProperty;
function Xc(t, e, n) {
  return e && typeof e == "object" && (n = e, e = void 0), Ww(n)(_w($w(n).document().write(Vw()(t, e, !0))));
}
function Ww(t) {
  const e = {
    transforms: [],
    canContainEols: ["emphasis", "fragment", "heading", "paragraph", "strong"],
    enter: {
      autolink: o(Is),
      autolinkProtocol: Y,
      autolinkEmail: Y,
      atxHeading: o(_e),
      blockQuote: o(de),
      characterEscape: Y,
      characterReference: Y,
      codeFenced: o(Pt),
      codeFencedFenceInfo: s,
      codeFencedFenceMeta: s,
      codeIndented: o(Pt, s),
      codeText: o(ke, s),
      codeTextData: Y,
      data: Y,
      codeFlowValue: Y,
      definition: o(Mt),
      definitionDestinationString: s,
      definitionLabelString: s,
      definitionTitleString: s,
      emphasis: o(gn),
      hardBreakEscape: o(_n),
      hardBreakTrailing: o(_n),
      htmlFlow: o(Je, s),
      htmlFlowData: Y,
      htmlText: o(Je, s),
      htmlTextData: Y,
      image: o(As),
      label: s,
      link: o(Is),
      listItem: o(Ul),
      listItemValue: d,
      listOrdered: o(ii, f),
      listUnordered: o(ii),
      paragraph: o(yn),
      reference: v,
      referenceString: s,
      resourceDestinationString: s,
      resourceTitleString: s,
      setextHeading: o(_e),
      strong: o(Vn),
      thematicBreak: o(Jl)
    },
    exit: {
      atxHeading: a(),
      atxHeadingSequence: j,
      autolink: a(),
      autolinkEmail: Pe,
      autolinkProtocol: Ue,
      blockQuote: a(),
      characterEscapeValue: O,
      characterReferenceMarkerHexadecimal: at,
      characterReferenceMarkerNumeric: at,
      characterReferenceValue: Oe,
      characterReference: Lt,
      codeFenced: a(C),
      codeFencedFence: b,
      codeFencedFenceInfo: h,
      codeFencedFenceMeta: m,
      codeFlowValue: O,
      codeIndented: a(x),
      codeText: a(ce),
      codeTextData: O,
      data: O,
      definition: a(),
      definitionDestinationString: D,
      definitionLabelString: L,
      definitionTitleString: I,
      emphasis: a(),
      hardBreakEscape: a(K),
      hardBreakTrailing: a(K),
      htmlFlow: a(be),
      htmlFlowData: O,
      htmlText: a(G),
      htmlTextData: O,
      image: a(Ee),
      label: vt,
      labelText: lt,
      lineEnding: U,
      link: a(ne),
      listItem: a(),
      listOrdered: a(),
      listUnordered: a(),
      paragraph: a(),
      referenceString: le,
      resourceDestinationString: S,
      resourceTitleString: Se,
      resource: Ke,
      setextHeading: a(J),
      setextHeadingLineSequence: _,
      setextHeadingText: A,
      strong: a(),
      thematicBreak: a()
    }
  };
  em(e, (t || {}).mdastExtensions || []);
  const n = {};
  return r;
  function r(E) {
    let B = {
      type: "root",
      children: []
    };
    const X = {
      stack: [B],
      tokenStack: [],
      config: e,
      enter: l,
      exit: c,
      buffer: s,
      resume: u,
      data: n
    }, ae = [];
    let W = -1;
    for (; ++W < E.length; )
      if (E[W][1].type === "listOrdered" || E[W][1].type === "listUnordered")
        if (E[W][0] === "enter")
          ae.push(W);
        else {
          const Ge = ae.pop();
          W = i(E, Ge, W);
        }
    for (W = -1; ++W < E.length; ) {
      const Ge = e[E[W][0]];
      Zp.call(Ge, E[W][1].type) && Ge[E[W][1].type].call(Object.assign({
        sliceSerialize: E[W][2].sliceSerialize
      }, X), E[W][1]);
    }
    if (X.tokenStack.length > 0) {
      const Ge = X.tokenStack[X.tokenStack.length - 1];
      (Ge[1] || Cd).call(X, void 0, Ge[0]);
    }
    for (B.position = {
      start: Jn(E.length > 0 ? E[0][1].start : {
        line: 1,
        column: 1,
        offset: 0
      }),
      end: Jn(E.length > 0 ? E[E.length - 2][1].end : {
        line: 1,
        column: 1,
        offset: 0
      })
    }, W = -1; ++W < e.transforms.length; )
      B = e.transforms[W](B) || B;
    return B;
  }
  function i(E, B, X) {
    let ae = B - 1, W = -1, Ge = !1, Tt, zt, Hn, wr;
    for (; ++ae <= X; ) {
      const ze = E[ae];
      switch (ze[1].type) {
        case "listUnordered":
        case "listOrdered":
        case "blockQuote": {
          ze[0] === "enter" ? W++ : W--, wr = void 0;
          break;
        }
        case "lineEndingBlank": {
          ze[0] === "enter" && (Tt && !wr && !W && !Hn && (Hn = ae), wr = void 0);
          break;
        }
        case "linePrefix":
        case "listItemValue":
        case "listItemMarker":
        case "listItemPrefix":
        case "listItemPrefixWhitespace":
          break;
        default:
          wr = void 0;
      }
      if (!W && ze[0] === "enter" && ze[1].type === "listItemPrefix" || W === -1 && ze[0] === "exit" && (ze[1].type === "listUnordered" || ze[1].type === "listOrdered")) {
        if (Tt) {
          let jn = ae;
          for (zt = void 0; jn--; ) {
            const et = E[jn];
            if (et[1].type === "lineEnding" || et[1].type === "lineEndingBlank") {
              if (et[0] === "exit") continue;
              zt && (E[zt][1].type = "lineEndingBlank", Ge = !0), et[1].type = "lineEnding", zt = jn;
            } else if (!(et[1].type === "linePrefix" || et[1].type === "blockQuotePrefix" || et[1].type === "blockQuotePrefixWhitespace" || et[1].type === "blockQuoteMarker" || et[1].type === "listItemIndent")) break;
          }
          Hn && (!zt || Hn < zt) && (Tt._spread = !0), Tt.end = Object.assign({}, zt ? E[zt][1].start : ze[1].end), E.splice(zt || ae, 0, ["exit", Tt, ze[2]]), ae++, X++;
        }
        if (ze[1].type === "listItemPrefix") {
          const jn = {
            type: "listItem",
            _spread: !1,
            start: Object.assign({}, ze[1].start),
            // @ts-expect-error: we’ll add `end` in a second.
            end: void 0
          };
          Tt = jn, E.splice(ae, 0, ["enter", jn, ze[2]]), ae++, X++, Hn = void 0, wr = !0;
        }
      }
    }
    return E[B][1]._spread = Ge, X;
  }
  function o(E, B) {
    return X;
    function X(ae) {
      l.call(this, E(ae), ae), B && B.call(this, ae);
    }
  }
  function s() {
    this.stack.push({
      type: "fragment",
      children: []
    });
  }
  function l(E, B, X) {
    this.stack[this.stack.length - 1].children.push(E), this.stack.push(E), this.tokenStack.push([B, X || void 0]), E.position = {
      start: Jn(B.start),
      // @ts-expect-error: `end` will be patched later.
      end: void 0
    };
  }
  function a(E) {
    return B;
    function B(X) {
      E && E.call(this, X), c.call(this, X);
    }
  }
  function c(E, B) {
    const X = this.stack.pop(), ae = this.tokenStack.pop();
    if (ae)
      ae[0].type !== E.type && (B ? B.call(this, E, ae[0]) : (ae[1] || Cd).call(this, E, ae[0]));
    else throw new Error("Cannot close `" + E.type + "` (" + Co({
      start: E.start,
      end: E.end
    }) + "): it’s not open");
    X.position.end = Jn(E.end);
  }
  function u() {
    return Jc(this.stack.pop());
  }
  function f() {
    this.data.expectingFirstListItemValue = !0;
  }
  function d(E) {
    if (this.data.expectingFirstListItemValue) {
      const B = this.stack[this.stack.length - 2];
      B.start = Number.parseInt(this.sliceSerialize(E), 10), this.data.expectingFirstListItemValue = void 0;
    }
  }
  function h() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.lang = E;
  }
  function m() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.meta = E;
  }
  function b() {
    this.data.flowCodeInside || (this.buffer(), this.data.flowCodeInside = !0);
  }
  function C() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.value = E.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, ""), this.data.flowCodeInside = void 0;
  }
  function x() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.value = E.replace(/(\r?\n|\r)$/g, "");
  }
  function L(E) {
    const B = this.resume(), X = this.stack[this.stack.length - 1];
    X.label = B, X.identifier = Xt(this.sliceSerialize(E)).toLowerCase();
  }
  function I() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.title = E;
  }
  function D() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.url = E;
  }
  function j(E) {
    const B = this.stack[this.stack.length - 1];
    if (!B.depth) {
      const X = this.sliceSerialize(E).length;
      B.depth = X;
    }
  }
  function A() {
    this.data.setextHeadingSlurpLineEnding = !0;
  }
  function _(E) {
    const B = this.stack[this.stack.length - 1];
    B.depth = this.sliceSerialize(E).codePointAt(0) === 61 ? 1 : 2;
  }
  function J() {
    this.data.setextHeadingSlurpLineEnding = void 0;
  }
  function Y(E) {
    const X = this.stack[this.stack.length - 1].children;
    let ae = X[X.length - 1];
    (!ae || ae.type !== "text") && (ae = br(), ae.position = {
      start: Jn(E.start),
      // @ts-expect-error: we’ll add `end` later.
      end: void 0
    }, X.push(ae)), this.stack.push(ae);
  }
  function O(E) {
    const B = this.stack.pop();
    B.value += this.sliceSerialize(E), B.position.end = Jn(E.end);
  }
  function U(E) {
    const B = this.stack[this.stack.length - 1];
    if (this.data.atHardBreak) {
      const X = B.children[B.children.length - 1];
      X.position.end = Jn(E.end), this.data.atHardBreak = void 0;
      return;
    }
    !this.data.setextHeadingSlurpLineEnding && e.canContainEols.includes(B.type) && (Y.call(this, E), O.call(this, E));
  }
  function K() {
    this.data.atHardBreak = !0;
  }
  function be() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.value = E;
  }
  function G() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.value = E;
  }
  function ce() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.value = E;
  }
  function ne() {
    const E = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const B = this.data.referenceType || "shortcut";
      E.type += "Reference", E.referenceType = B, delete E.url, delete E.title;
    } else
      delete E.identifier, delete E.label;
    this.data.referenceType = void 0;
  }
  function Ee() {
    const E = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const B = this.data.referenceType || "shortcut";
      E.type += "Reference", E.referenceType = B, delete E.url, delete E.title;
    } else
      delete E.identifier, delete E.label;
    this.data.referenceType = void 0;
  }
  function lt(E) {
    const B = this.sliceSerialize(E), X = this.stack[this.stack.length - 2];
    X.label = Qp(B), X.identifier = Xt(B).toLowerCase();
  }
  function vt() {
    const E = this.stack[this.stack.length - 1], B = this.resume(), X = this.stack[this.stack.length - 1];
    if (this.data.inReference = !0, X.type === "link") {
      const ae = E.children;
      X.children = ae;
    } else
      X.alt = B;
  }
  function S() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.url = E;
  }
  function Se() {
    const E = this.resume(), B = this.stack[this.stack.length - 1];
    B.title = E;
  }
  function Ke() {
    this.data.inReference = void 0;
  }
  function v() {
    this.data.referenceType = "collapsed";
  }
  function le(E) {
    const B = this.resume(), X = this.stack[this.stack.length - 1];
    X.label = B, X.identifier = Xt(this.sliceSerialize(E)).toLowerCase(), this.data.referenceType = "full";
  }
  function at(E) {
    this.data.characterReferenceType = E.type;
  }
  function Oe(E) {
    const B = this.sliceSerialize(E), X = this.data.characterReferenceType;
    let ae;
    X ? (ae = Hp(B, X === "characterReferenceMarkerNumeric" ? 10 : 16), this.data.characterReferenceType = void 0) : ae = Gc(B);
    const W = this.stack[this.stack.length - 1];
    W.value += ae;
  }
  function Lt(E) {
    const B = this.stack.pop();
    B.position.end = Jn(E.end);
  }
  function Ue(E) {
    O.call(this, E);
    const B = this.stack[this.stack.length - 1];
    B.url = this.sliceSerialize(E);
  }
  function Pe(E) {
    O.call(this, E);
    const B = this.stack[this.stack.length - 1];
    B.url = "mailto:" + this.sliceSerialize(E);
  }
  function de() {
    return {
      type: "blockquote",
      children: []
    };
  }
  function Pt() {
    return {
      type: "code",
      lang: null,
      meta: null,
      value: ""
    };
  }
  function ke() {
    return {
      type: "inlineCode",
      value: ""
    };
  }
  function Mt() {
    return {
      type: "definition",
      identifier: "",
      label: null,
      title: null,
      url: ""
    };
  }
  function gn() {
    return {
      type: "emphasis",
      children: []
    };
  }
  function _e() {
    return {
      type: "heading",
      // @ts-expect-error `depth` will be set later.
      depth: 0,
      children: []
    };
  }
  function _n() {
    return {
      type: "break"
    };
  }
  function Je() {
    return {
      type: "html",
      value: ""
    };
  }
  function As() {
    return {
      type: "image",
      title: null,
      url: "",
      alt: null
    };
  }
  function Is() {
    return {
      type: "link",
      title: null,
      url: "",
      children: []
    };
  }
  function ii(E) {
    return {
      type: "list",
      ordered: E.type === "listOrdered",
      start: null,
      spread: E._spread,
      children: []
    };
  }
  function Ul(E) {
    return {
      type: "listItem",
      spread: E._spread,
      checked: null,
      children: []
    };
  }
  function yn() {
    return {
      type: "paragraph",
      children: []
    };
  }
  function Vn() {
    return {
      type: "strong",
      children: []
    };
  }
  function br() {
    return {
      type: "text",
      value: ""
    };
  }
  function Jl() {
    return {
      type: "thematicBreak"
    };
  }
}
function Jn(t) {
  return {
    line: t.line,
    column: t.column,
    offset: t.offset
  };
}
function em(t, e) {
  let n = -1;
  for (; ++n < e.length; ) {
    const r = e[n];
    Array.isArray(r) ? em(t, r) : qw(t, r);
  }
}
function qw(t, e) {
  let n;
  for (n in e)
    if (Zp.call(e, n))
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
function Cd(t, e) {
  throw t ? new Error("Cannot close `" + t.type + "` (" + Co({
    start: t.start,
    end: t.end
  }) + "): a different token (`" + e.type + "`, " + Co({
    start: e.start,
    end: e.end
  }) + ") is open") : new Error("Cannot close document, a token (`" + e.type + "`, " + Co({
    start: e.start,
    end: e.end
  }) + ") is still open");
}
function ic(t) {
  const e = this;
  e.parser = n;
  function n(r) {
    return Xc(r, {
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
const Sd = {}.hasOwnProperty;
function Kw(t, e) {
  const n = e || {};
  function r(i, ...o) {
    let s = r.invalid;
    const l = r.handlers;
    if (i && Sd.call(i, t)) {
      const a = String(i[t]);
      s = Sd.call(l, a) ? l[a] : r.unknown;
    }
    if (s)
      return s.call(this, i, ...o);
  }
  return r.handlers = n.handlers || {}, r.invalid = n.invalid, r.unknown = n.unknown, r;
}
const Uw = {}.hasOwnProperty;
function tm(t, e) {
  let n = -1, r;
  if (e.extensions)
    for (; ++n < e.extensions.length; )
      tm(t, e.extensions[n]);
  for (r in e)
    if (Uw.call(e, r))
      switch (r) {
        case "extensions":
          break;
        case "unsafe": {
          vd(t[r], e[r]);
          break;
        }
        case "join": {
          vd(t[r], e[r]);
          break;
        }
        case "handlers": {
          Jw(t[r], e[r]);
          break;
        }
        default:
          t.options[r] = e[r];
      }
  return t;
}
function vd(t, e) {
  e && t.push(...e);
}
function Jw(t, e) {
  e && Object.assign(t, e);
}
function Gw(t, e, n, r) {
  const i = n.enter("blockquote"), o = n.createTracker(r);
  o.move("> "), o.shift(2);
  const s = n.indentLines(
    n.containerFlow(t, o.current()),
    Yw
  );
  return i(), s;
}
function Yw(t, e, n) {
  return ">" + (n ? "" : " ") + t;
}
function nm(t, e) {
  return Md(t, e.inConstruct, !0) && !Md(t, e.notInConstruct, !1);
}
function Md(t, e, n) {
  if (typeof e == "string" && (e = [e]), !e || e.length === 0)
    return n;
  let r = -1;
  for (; ++r < e.length; )
    if (t.includes(e[r]))
      return !0;
  return !1;
}
function Td(t, e, n, r) {
  let i = -1;
  for (; ++i < n.unsafe.length; )
    if (n.unsafe[i].character === `
` && nm(n.stack, n.unsafe[i]))
      return /[ \t]/.test(r.before) ? "" : " ";
  return `\\
`;
}
function Xw(t, e) {
  const n = String(t);
  let r = n.indexOf(e), i = r, o = 0, s = 0;
  if (typeof e != "string")
    throw new TypeError("Expected substring");
  for (; r !== -1; )
    r === i ? ++o > s && (s = o) : o = 1, i = r + e.length, r = n.indexOf(e, i);
  return s;
}
function oc(t, e) {
  return !!(e.options.fences === !1 && t.value && // If there’s no info…
  !t.lang && // And there’s a non-whitespace character…
  /[^ \r\n]/.test(t.value) && // And the value doesn’t start or end in a blank…
  !/^[\t ]*(?:[\r\n]|$)|(?:^|[\r\n])[\t ]*$/.test(t.value));
}
function Qw(t) {
  const e = t.options.fence || "`";
  if (e !== "`" && e !== "~")
    throw new Error(
      "Cannot serialize code with `" + e + "` for `options.fence`, expected `` ` `` or `~`"
    );
  return e;
}
function Zw(t, e, n, r) {
  const i = Qw(n), o = t.value || "", s = i === "`" ? "GraveAccent" : "Tilde";
  if (oc(t, n)) {
    const f = n.enter("codeIndented"), d = n.indentLines(o, e0);
    return f(), d;
  }
  const l = n.createTracker(r), a = i.repeat(Math.max(Xw(o, i) + 1, 3)), c = n.enter("codeFenced");
  let u = l.move(a);
  if (t.lang) {
    const f = n.enter(`codeFencedLang${s}`);
    u += l.move(
      n.safe(t.lang, {
        before: u,
        after: " ",
        encode: ["`"],
        ...l.current()
      })
    ), f();
  }
  if (t.lang && t.meta) {
    const f = n.enter(`codeFencedMeta${s}`);
    u += l.move(" "), u += l.move(
      n.safe(t.meta, {
        before: u,
        after: `
`,
        encode: ["`"],
        ...l.current()
      })
    ), f();
  }
  return u += l.move(`
`), o && (u += l.move(o + `
`)), u += l.move(a), c(), u;
}
function e0(t, e, n) {
  return (n ? "" : "    ") + t;
}
function Qc(t) {
  const e = t.options.quote || '"';
  if (e !== '"' && e !== "'")
    throw new Error(
      "Cannot serialize title with `" + e + "` for `options.quote`, expected `\"`, or `'`"
    );
  return e;
}
function t0(t, e, n, r) {
  const i = Qc(n), o = i === '"' ? "Quote" : "Apostrophe", s = n.enter("definition");
  let l = n.enter("label");
  const a = n.createTracker(r);
  let c = a.move("[");
  return c += a.move(
    n.safe(n.associationId(t), {
      before: c,
      after: "]",
      ...a.current()
    })
  ), c += a.move("]: "), l(), // If there’s no url, or…
  !t.url || // If there are control characters or whitespace.
  /[\0- \u007F]/.test(t.url) ? (l = n.enter("destinationLiteral"), c += a.move("<"), c += a.move(
    n.safe(t.url, { before: c, after: ">", ...a.current() })
  ), c += a.move(">")) : (l = n.enter("destinationRaw"), c += a.move(
    n.safe(t.url, {
      before: c,
      after: t.title ? " " : `
`,
      ...a.current()
    })
  )), l(), t.title && (l = n.enter(`title${o}`), c += a.move(" " + i), c += a.move(
    n.safe(t.title, {
      before: c,
      after: i,
      ...a.current()
    })
  ), c += a.move(i), l()), s(), c;
}
function n0(t) {
  const e = t.options.emphasis || "*";
  if (e !== "*" && e !== "_")
    throw new Error(
      "Cannot serialize emphasis with `" + e + "` for `options.emphasis`, expected `*`, or `_`"
    );
  return e;
}
function hr(t) {
  return "&#x" + t.toString(16).toUpperCase() + ";";
}
function dl(t, e, n) {
  const r = Hi(t), i = Hi(e);
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
rm.peek = r0;
function rm(t, e, n, r) {
  const i = n0(n), o = n.enter("emphasis"), s = n.createTracker(r), l = s.move(i);
  let a = s.move(
    n.containerPhrasing(t, {
      after: i,
      before: l,
      ...s.current()
    })
  );
  const c = a.charCodeAt(0), u = dl(
    r.before.charCodeAt(r.before.length - 1),
    c,
    i
  );
  u.inside && (a = hr(c) + a.slice(1));
  const f = a.charCodeAt(a.length - 1), d = dl(r.after.charCodeAt(0), f, i);
  d.inside && (a = a.slice(0, -1) + hr(f));
  const h = s.move(i);
  return o(), n.attentionEncodeSurroundingInfo = {
    after: d.outside,
    before: u.outside
  }, l + a + h;
}
function r0(t, e, n) {
  return n.options.emphasis || "*";
}
const Ll = (
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
      return l0;
    if (typeof t == "function")
      return Pl(t);
    if (typeof t == "object")
      return Array.isArray(t) ? i0(t) : (
        // Cast because `ReadonlyArray` goes into the above but `isArray`
        // narrows to `Array`.
        o0(
          /** @type {Props} */
          t
        )
      );
    if (typeof t == "string")
      return s0(t);
    throw new Error("Expected function, string, or object as test");
  }
);
function i0(t) {
  const e = [];
  let n = -1;
  for (; ++n < t.length; )
    e[n] = Ll(t[n]);
  return Pl(r);
  function r(...i) {
    let o = -1;
    for (; ++o < e.length; )
      if (e[o].apply(this, i)) return !0;
    return !1;
  }
}
function o0(t) {
  const e = (
    /** @type {Record<string, unknown>} */
    t
  );
  return Pl(n);
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
function s0(t) {
  return Pl(e);
  function e(n) {
    return n && n.type === t;
  }
}
function Pl(t) {
  return e;
  function e(n, r, i) {
    return !!(a0(n) && t.call(
      this,
      n,
      typeof r == "number" ? r : void 0,
      i || void 0
    ));
  }
}
function l0() {
  return !0;
}
function a0(t) {
  return t !== null && typeof t == "object" && "type" in t;
}
const im = [], c0 = !0, sc = !1, lc = "skip";
function Zc(t, e, n, r) {
  let i;
  typeof e == "function" && typeof n != "function" ? (r = n, n = e) : i = e;
  const o = Ll(i), s = r ? -1 : 1;
  l(t, void 0, [])();
  function l(a, c, u) {
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
      let h = im, m, b, C;
      if ((!e || o(a, c, u[u.length - 1] || void 0)) && (h = u0(n(a, u)), h[0] === sc))
        return h;
      if ("children" in a && a.children) {
        const x = (
          /** @type {UnistParent} */
          a
        );
        if (x.children && h[0] !== lc)
          for (b = (r ? x.children.length : -1) + s, C = u.concat(x); b > -1 && b < x.children.length; ) {
            const L = x.children[b];
            if (m = l(L, b, C)(), m[0] === sc)
              return m;
            b = typeof m[1] == "number" ? m[1] : b + s;
          }
      }
      return h;
    }
  }
}
function u0(t) {
  return Array.isArray(t) ? t : typeof t == "number" ? [c0, t] : t == null ? im : [t];
}
function Yi(t, e, n, r) {
  let i, o, s;
  typeof e == "function" && typeof n != "function" ? (o = void 0, s = e, i = n) : (o = e, s = n, i = r), Zc(t, o, l, i);
  function l(a, c) {
    const u = c[c.length - 1], f = u ? u.children.indexOf(a) : void 0;
    return s(a, f, u);
  }
}
function om(t, e) {
  let n = !1;
  return Yi(t, function(r) {
    if ("value" in r && /\r?\n|\r/.test(r.value) || r.type === "break")
      return n = !0, sc;
  }), !!((!t.depth || t.depth < 3) && Jc(t) && (e.options.setext || n));
}
function f0(t, e, n, r) {
  const i = Math.max(Math.min(6, t.depth || 1), 1), o = n.createTracker(r);
  if (om(t, n)) {
    const u = n.enter("headingSetext"), f = n.enter("phrasing"), d = n.containerPhrasing(t, {
      ...o.current(),
      before: `
`,
      after: `
`
    });
    return f(), u(), d + `
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
  let c = n.containerPhrasing(t, {
    before: "# ",
    after: `
`,
    ...o.current()
  });
  return /^[\t ]/.test(c) && (c = hr(c.charCodeAt(0)) + c.slice(1)), c = c ? s + " " + c : s, n.options.closeAtx && (c += " " + s), a(), l(), c;
}
sm.peek = d0;
function sm(t) {
  return t.value || "";
}
function d0() {
  return "<";
}
lm.peek = h0;
function lm(t, e, n, r) {
  const i = Qc(n), o = i === '"' ? "Quote" : "Apostrophe", s = n.enter("image");
  let l = n.enter("label");
  const a = n.createTracker(r);
  let c = a.move("![");
  return c += a.move(
    n.safe(t.alt, { before: c, after: "]", ...a.current() })
  ), c += a.move("]("), l(), // If there’s no url but there is a title…
  !t.url && t.title || // If there are control characters or whitespace.
  /[\0- \u007F]/.test(t.url) ? (l = n.enter("destinationLiteral"), c += a.move("<"), c += a.move(
    n.safe(t.url, { before: c, after: ">", ...a.current() })
  ), c += a.move(">")) : (l = n.enter("destinationRaw"), c += a.move(
    n.safe(t.url, {
      before: c,
      after: t.title ? " " : ")",
      ...a.current()
    })
  )), l(), t.title && (l = n.enter(`title${o}`), c += a.move(" " + i), c += a.move(
    n.safe(t.title, {
      before: c,
      after: i,
      ...a.current()
    })
  ), c += a.move(i), l()), c += a.move(")"), s(), c;
}
function h0() {
  return "!";
}
am.peek = p0;
function am(t, e, n, r) {
  const i = t.referenceType, o = n.enter("imageReference");
  let s = n.enter("label");
  const l = n.createTracker(r);
  let a = l.move("![");
  const c = n.safe(t.alt, {
    before: a,
    after: "]",
    ...l.current()
  });
  a += l.move(c + "]["), s();
  const u = n.stack;
  n.stack = [], s = n.enter("reference");
  const f = n.safe(n.associationId(t), {
    before: a,
    after: "]",
    ...l.current()
  });
  return s(), n.stack = u, o(), i === "full" || !c || c !== f ? a += l.move(f + "]") : i === "shortcut" ? a = a.slice(0, -1) : a += l.move("]"), a;
}
function p0() {
  return "!";
}
cm.peek = m0;
function cm(t, e, n) {
  let r = t.value || "", i = "`", o = -1;
  for (; new RegExp("(^|[^`])" + i + "([^`]|$)").test(r); )
    i += "`";
  for (/[^ \r\n]/.test(r) && (/^[ \r\n]/.test(r) && /[ \r\n]$/.test(r) || /^`|`$/.test(r)) && (r = " " + r + " "); ++o < n.unsafe.length; ) {
    const s = n.unsafe[o], l = n.compilePattern(s);
    let a;
    if (s.atBreak)
      for (; a = l.exec(r); ) {
        let c = a.index;
        r.charCodeAt(c) === 10 && r.charCodeAt(c - 1) === 13 && c--, r = r.slice(0, c) + " " + r.slice(a.index + 1);
      }
  }
  return i + r + i;
}
function m0() {
  return "`";
}
function um(t, e) {
  const n = Jc(t);
  return !!(!e.options.resourceLink && // If there’s a url…
  t.url && // And there’s a no title…
  !t.title && // And the content of `node` is a single text node…
  t.children && t.children.length === 1 && t.children[0].type === "text" && // And if the url is the same as the content…
  (n === t.url || "mailto:" + n === t.url) && // And that starts w/ a protocol…
  /^[a-z][a-z+.-]+:/i.test(t.url) && // And that doesn’t contain ASCII control codes (character escapes and
  // references don’t work), space, or angle brackets…
  !/[\0- <>\u007F]/.test(t.url));
}
fm.peek = g0;
function fm(t, e, n, r) {
  const i = Qc(n), o = i === '"' ? "Quote" : "Apostrophe", s = n.createTracker(r);
  let l, a;
  if (um(t, n)) {
    const u = n.stack;
    n.stack = [], l = n.enter("autolink");
    let f = s.move("<");
    return f += s.move(
      n.containerPhrasing(t, {
        before: f,
        after: ">",
        ...s.current()
      })
    ), f += s.move(">"), l(), n.stack = u, f;
  }
  l = n.enter("link"), a = n.enter("label");
  let c = s.move("[");
  return c += s.move(
    n.containerPhrasing(t, {
      before: c,
      after: "](",
      ...s.current()
    })
  ), c += s.move("]("), a(), // If there’s no url but there is a title…
  !t.url && t.title || // If there are control characters or whitespace.
  /[\0- \u007F]/.test(t.url) ? (a = n.enter("destinationLiteral"), c += s.move("<"), c += s.move(
    n.safe(t.url, { before: c, after: ">", ...s.current() })
  ), c += s.move(">")) : (a = n.enter("destinationRaw"), c += s.move(
    n.safe(t.url, {
      before: c,
      after: t.title ? " " : ")",
      ...s.current()
    })
  )), a(), t.title && (a = n.enter(`title${o}`), c += s.move(" " + i), c += s.move(
    n.safe(t.title, {
      before: c,
      after: i,
      ...s.current()
    })
  ), c += s.move(i), a()), c += s.move(")"), l(), c;
}
function g0(t, e, n) {
  return um(t, n) ? "<" : "[";
}
dm.peek = y0;
function dm(t, e, n, r) {
  const i = t.referenceType, o = n.enter("linkReference");
  let s = n.enter("label");
  const l = n.createTracker(r);
  let a = l.move("[");
  const c = n.containerPhrasing(t, {
    before: a,
    after: "]",
    ...l.current()
  });
  a += l.move(c + "]["), s();
  const u = n.stack;
  n.stack = [], s = n.enter("reference");
  const f = n.safe(n.associationId(t), {
    before: a,
    after: "]",
    ...l.current()
  });
  return s(), n.stack = u, o(), i === "full" || !c || c !== f ? a += l.move(f + "]") : i === "shortcut" ? a = a.slice(0, -1) : a += l.move("]"), a;
}
function y0() {
  return "[";
}
function eu(t) {
  const e = t.options.bullet || "*";
  if (e !== "*" && e !== "+" && e !== "-")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.bullet`, expected `*`, `+`, or `-`"
    );
  return e;
}
function k0(t) {
  const e = eu(t), n = t.options.bulletOther;
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
function b0(t) {
  const e = t.options.bulletOrdered || ".";
  if (e !== "." && e !== ")")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.bulletOrdered`, expected `.` or `)`"
    );
  return e;
}
function hm(t) {
  const e = t.options.rule || "*";
  if (e !== "*" && e !== "-" && e !== "_")
    throw new Error(
      "Cannot serialize rules with `" + e + "` for `options.rule`, expected `*`, `-`, or `_`"
    );
  return e;
}
function w0(t, e, n, r) {
  const i = n.enter("list"), o = n.bulletCurrent;
  let s = t.ordered ? b0(n) : eu(n);
  const l = t.ordered ? s === "." ? ")" : "." : k0(n);
  let a = e && n.bulletLastUsed ? s === n.bulletLastUsed : !1;
  if (!t.ordered) {
    const u = t.children ? t.children[0] : void 0;
    if (
      // Bullet could be used as a thematic break marker:
      (s === "*" || s === "-") && // Empty first list item:
      u && (!u.children || !u.children[0]) && // Directly in two other list items:
      n.stack[n.stack.length - 1] === "list" && n.stack[n.stack.length - 2] === "listItem" && n.stack[n.stack.length - 3] === "list" && n.stack[n.stack.length - 4] === "listItem" && // That are each the first child.
      n.indexStack[n.indexStack.length - 1] === 0 && n.indexStack[n.indexStack.length - 2] === 0 && n.indexStack[n.indexStack.length - 3] === 0 && (a = !0), hm(n) === s && u
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
  const c = n.containerFlow(t, r);
  return n.bulletLastUsed = s, n.bulletCurrent = o, i(), c;
}
function x0(t) {
  const e = t.options.listItemIndent || "one";
  if (e !== "tab" && e !== "one" && e !== "mixed")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.listItemIndent`, expected `tab`, `one`, or `mixed`"
    );
  return e;
}
function C0(t, e, n, r) {
  const i = x0(n);
  let o = n.bulletCurrent || eu(n);
  e && e.type === "list" && e.ordered && (o = (typeof e.start == "number" && e.start > -1 ? e.start : 1) + (n.options.incrementListMarker === !1 ? 0 : e.children.indexOf(t)) + o);
  let s = o.length + 1;
  (i === "tab" || i === "mixed" && (e && e.type === "list" && e.spread || t.spread)) && (s = Math.ceil(s / 4) * 4);
  const l = n.createTracker(r);
  l.move(o + " ".repeat(s - o.length)), l.shift(s);
  const a = n.enter("listItem"), c = n.indentLines(
    n.containerFlow(t, l.current()),
    u
  );
  return a(), c;
  function u(f, d, h) {
    return d ? (h ? "" : " ".repeat(s)) + f : (h ? o : o + " ".repeat(s - o.length)) + f;
  }
}
function S0(t, e, n, r) {
  const i = n.enter("paragraph"), o = n.enter("phrasing"), s = n.containerPhrasing(t, r);
  return o(), i(), s;
}
const v0 = (
  /** @type {(node?: unknown) => node is Exclude<PhrasingContent, Html>} */
  Ll([
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
function M0(t, e, n, r) {
  return (t.children.some(function(s) {
    return v0(s);
  }) ? n.containerPhrasing : n.containerFlow).call(n, t, r);
}
function T0(t) {
  const e = t.options.strong || "*";
  if (e !== "*" && e !== "_")
    throw new Error(
      "Cannot serialize strong with `" + e + "` for `options.strong`, expected `*`, or `_`"
    );
  return e;
}
pm.peek = N0;
function pm(t, e, n, r) {
  const i = T0(n), o = n.enter("strong"), s = n.createTracker(r), l = s.move(i + i);
  let a = s.move(
    n.containerPhrasing(t, {
      after: i,
      before: l,
      ...s.current()
    })
  );
  const c = a.charCodeAt(0), u = dl(
    r.before.charCodeAt(r.before.length - 1),
    c,
    i
  );
  u.inside && (a = hr(c) + a.slice(1));
  const f = a.charCodeAt(a.length - 1), d = dl(r.after.charCodeAt(0), f, i);
  d.inside && (a = a.slice(0, -1) + hr(f));
  const h = s.move(i + i);
  return o(), n.attentionEncodeSurroundingInfo = {
    after: d.outside,
    before: u.outside
  }, l + a + h;
}
function N0(t, e, n) {
  return n.options.strong || "*";
}
function E0(t, e, n, r) {
  return n.safe(t.value, r);
}
function A0(t) {
  const e = t.options.ruleRepetition || 3;
  if (e < 3)
    throw new Error(
      "Cannot serialize rules with repetition `" + e + "` for `options.ruleRepetition`, expected `3` or more"
    );
  return e;
}
function I0(t, e, n) {
  const r = (hm(n) + (n.options.ruleSpaces ? " " : "")).repeat(A0(n));
  return n.options.ruleSpaces ? r.slice(0, -1) : r;
}
const tu = {
  blockquote: Gw,
  break: Td,
  code: Zw,
  definition: t0,
  emphasis: rm,
  hardBreak: Td,
  heading: f0,
  html: sm,
  image: lm,
  imageReference: am,
  inlineCode: cm,
  link: fm,
  linkReference: dm,
  list: w0,
  listItem: C0,
  paragraph: S0,
  root: M0,
  strong: pm,
  text: E0,
  thematicBreak: I0
}, O0 = [D0];
function D0(t, e, n, r) {
  if (e.type === "code" && oc(e, r) && (t.type === "list" || t.type === e.type && oc(t, r)))
    return !1;
  if ("spread" in n && typeof n.spread == "boolean")
    return t.type === "paragraph" && // Two paragraphs.
    (t.type === e.type || e.type === "definition" || // Paragraph followed by a setext heading.
    e.type === "heading" && om(e, r)) ? void 0 : n.spread ? 1 : 0;
}
const Cr = [
  "autolink",
  "destinationLiteral",
  "destinationRaw",
  "reference",
  "titleQuote",
  "titleApostrophe"
], R0 = [
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
    notInConstruct: Cr
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
    notInConstruct: Cr
  },
  // A right paren could start a list item or break out of a destination
  // raw.
  { atBreak: !0, before: "\\d+", character: ")" },
  { character: ")", inConstruct: "destinationRaw" },
  // An asterisk can start thematic breaks, list items, emphasis, strong.
  { atBreak: !0, character: "*", after: `(?:[ 	\r
*])` },
  { character: "*", inConstruct: "phrasing", notInConstruct: Cr },
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
    notInConstruct: Cr
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
  { character: "[", inConstruct: "phrasing", notInConstruct: Cr },
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
  { character: "_", inConstruct: "phrasing", notInConstruct: Cr },
  // A grave accent can start code (fenced or text), or it can break out of
  // a grave accent code fence.
  { atBreak: !0, character: "`" },
  {
    character: "`",
    inConstruct: ["codeFencedLangGraveAccent", "codeFencedMetaGraveAccent"]
  },
  { character: "`", inConstruct: "phrasing", notInConstruct: Cr },
  // Left brace, vertical bar, right brace are not used in markdown for
  // constructs.
  // A tilde can start code (fenced).
  { atBreak: !0, character: "~" }
];
function L0(t) {
  return t.label || !t.identifier ? t.label || "" : Qp(t.identifier);
}
function P0(t) {
  if (!t._compiled) {
    const e = (t.atBreak ? "[\\r\\n][\\t ]*" : "") + (t.before ? "(?:" + t.before + ")" : "");
    t._compiled = new RegExp(
      (e ? "(" + e + ")" : "") + (/[|\\{}()[\]^$+*?.-]/.test(t.character) ? "\\" : "") + t.character + (t.after ? "(?:" + t.after + ")" : ""),
      "g"
    );
  }
  return t._compiled;
}
function z0(t, e, n) {
  const r = e.indexStack, i = t.children || [], o = [];
  let s = -1, l = n.before, a;
  r.push(-1);
  let c = e.createTracker(n);
  for (; ++s < i.length; ) {
    const u = i[s];
    let f;
    if (r[r.length - 1] = s, s + 1 < i.length) {
      let m = e.handle.handlers[i[s + 1].type];
      m && m.peek && (m = m.peek), f = m ? m(i[s + 1], t, e, {
        before: "",
        after: "",
        ...c.current()
      }).charAt(0) : "";
    } else
      f = n.after;
    o.length > 0 && (l === "\r" || l === `
`) && u.type === "html" && (o[o.length - 1] = o[o.length - 1].replace(
      /(\r?\n|\r)$/,
      " "
    ), l = " ", c = e.createTracker(n), c.move(o.join("")));
    let d = e.handle(u, t, e, {
      ...c.current(),
      after: f,
      before: l
    });
    a && a === d.slice(0, 1) && (d = hr(a.charCodeAt(0)) + d.slice(1));
    const h = e.attentionEncodeSurroundingInfo;
    e.attentionEncodeSurroundingInfo = void 0, a = void 0, h && (o.length > 0 && h.before && l === o[o.length - 1].slice(-1) && (o[o.length - 1] = o[o.length - 1].slice(0, -1) + hr(l.charCodeAt(0))), h.after && (a = f)), c.move(d), o.push(d), l = d.slice(-1);
  }
  return r.pop(), o.join("");
}
function B0(t, e, n) {
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
      o.move(F0(a, i[l + 1], t, e))
    );
  }
  return r.pop(), s.join("");
}
function F0(t, e, n, r) {
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
const $0 = /\r?\n|\r/g;
function _0(t, e) {
  const n = [];
  let r = 0, i = 0, o;
  for (; o = $0.exec(t); )
    s(t.slice(r, o.index)), n.push(o[0]), r = o.index + o[0].length, i++;
  return s(t.slice(r)), n.join("");
  function s(l) {
    n.push(e(l, i, !l));
  }
}
function V0(t, e, n) {
  const r = (n.before || "") + (e || "") + (n.after || ""), i = [], o = [], s = {};
  let l = -1;
  for (; ++l < t.unsafe.length; ) {
    const u = t.unsafe[l];
    if (!nm(t.stack, u))
      continue;
    const f = t.compilePattern(u);
    let d;
    for (; d = f.exec(r); ) {
      const h = "before" in u || !!u.atBreak, m = "after" in u, b = d.index + (h ? d[1].length : 0);
      i.includes(b) ? (s[b].before && !h && (s[b].before = !1), s[b].after && !m && (s[b].after = !1)) : (i.push(b), s[b] = { before: h, after: m });
    }
  }
  i.sort(H0);
  let a = n.before ? n.before.length : 0;
  const c = r.length - (n.after ? n.after.length : 0);
  for (l = -1; ++l < i.length; ) {
    const u = i[l];
    u < a || u >= c || u + 1 < c && i[l + 1] === u + 1 && s[u].after && !s[u + 1].before && !s[u + 1].after || i[l - 1] === u - 1 && s[u].before && !s[u - 1].before && !s[u - 1].after || (a !== u && o.push(Nd(r.slice(a, u), "\\")), a = u, /[!-/:-@[-`{-~]/.test(r.charAt(u)) && (!n.encode || !n.encode.includes(r.charAt(u))) ? o.push("\\") : (o.push(hr(r.charCodeAt(u))), a++));
  }
  return o.push(Nd(r.slice(a, c), n.after)), o.join("");
}
function H0(t, e) {
  return t - e;
}
function Nd(t, e) {
  const n = /\\(?=[!-/:-@[-`{-~])/g, r = [], i = [], o = t + e;
  let s = -1, l = 0, a;
  for (; a = n.exec(o); )
    r.push(a.index);
  for (; ++s < r.length; )
    l !== r[s] && i.push(t.slice(l, r[s])), i.push("\\"), l = r[s];
  return i.push(t.slice(l)), i.join("");
}
function j0(t) {
  const e = t || {}, n = e.now || {};
  let r = e.lineShift || 0, i = n.line || 1, o = n.column || 1;
  return { move: a, current: s, shift: l };
  function s() {
    return { now: { line: i, column: o }, lineShift: r };
  }
  function l(c) {
    r += c;
  }
  function a(c) {
    const u = c || "", f = u.split(/\r?\n|\r/g), d = f[f.length - 1];
    return i += f.length - 1, o = f.length === 1 ? o + d.length : 1 + d.length + r, u;
  }
}
function W0(t, e) {
  const n = e || {}, r = {
    associationId: L0,
    containerPhrasing: J0,
    containerFlow: G0,
    createTracker: j0,
    compilePattern: P0,
    enter: o,
    // @ts-expect-error: GFM / frontmatter are typed in `mdast` but not defined
    // here.
    handlers: { ...tu },
    // @ts-expect-error: add `handle` in a second.
    handle: void 0,
    indentLines: _0,
    indexStack: [],
    join: [...O0],
    options: {},
    safe: Y0,
    stack: [],
    unsafe: [...R0]
  };
  tm(r, n), r.options.tightDefinitions && r.join.push(U0), r.handle = Kw("type", {
    invalid: q0,
    unknown: K0,
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
function q0(t) {
  throw new Error("Cannot handle value `" + t + "`, expected node");
}
function K0(t) {
  const e = (
    /** @type {Nodes} */
    t
  );
  throw new Error("Cannot handle unknown node `" + e.type + "`");
}
function U0(t, e) {
  if (t.type === "definition" && t.type === e.type)
    return 0;
}
function J0(t, e) {
  return z0(t, this, e);
}
function G0(t, e) {
  return B0(t, this, e);
}
function Y0(t, e) {
  return V0(this, t, e);
}
function ac(t) {
  const e = this;
  e.compiler = n;
  function n(r) {
    return W0(r, {
      ...e.data("settings"),
      ...t,
      // Note: this option is not in the readme.
      // The goal is for it to be set by plugins on `data` instead of being
      // passed by users.
      extensions: e.data("toMarkdownExtensions") || []
    });
  }
}
function Ed(t) {
  if (t)
    throw t;
}
function X0(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var Ys = Object.prototype.hasOwnProperty, mm = Object.prototype.toString, Ad = Object.defineProperty, Id = Object.getOwnPropertyDescriptor, Od = function(e) {
  return typeof Array.isArray == "function" ? Array.isArray(e) : mm.call(e) === "[object Array]";
}, Dd = function(e) {
  if (!e || mm.call(e) !== "[object Object]")
    return !1;
  var n = Ys.call(e, "constructor"), r = e.constructor && e.constructor.prototype && Ys.call(e.constructor.prototype, "isPrototypeOf");
  if (e.constructor && !n && !r)
    return !1;
  var i;
  for (i in e)
    ;
  return typeof i > "u" || Ys.call(e, i);
}, Rd = function(e, n) {
  Ad && n.name === "__proto__" ? Ad(e, n.name, {
    enumerable: !0,
    configurable: !0,
    value: n.newValue,
    writable: !0
  }) : e[n.name] = n.newValue;
}, Ld = function(e, n) {
  if (n === "__proto__")
    if (Ys.call(e, n)) {
      if (Id)
        return Id(e, n).value;
    } else return;
  return e[n];
}, Q0 = function t() {
  var e, n, r, i, o, s, l = arguments[0], a = 1, c = arguments.length, u = !1;
  for (typeof l == "boolean" && (u = l, l = arguments[1] || {}, a = 2), (l == null || typeof l != "object" && typeof l != "function") && (l = {}); a < c; ++a)
    if (e = arguments[a], e != null)
      for (n in e)
        r = Ld(l, n), i = Ld(e, n), l !== i && (u && i && (Dd(i) || (o = Od(i))) ? (o ? (o = !1, s = r && Od(r) ? r : []) : s = r && Dd(r) ? r : {}, Rd(l, { name: n, newValue: t(u, s, i) })) : typeof i < "u" && Rd(l, { name: n, newValue: i }));
  return l;
};
const sa = /* @__PURE__ */ X0(Q0);
function cc(t) {
  if (typeof t != "object" || t === null)
    return !1;
  const e = Object.getPrototypeOf(t);
  return (e === null || e === Object.prototype || Object.getPrototypeOf(e) === null) && !(Symbol.toStringTag in t) && !(Symbol.iterator in t);
}
function Z0() {
  const t = [], e = { run: n, use: r };
  return e;
  function n(...i) {
    let o = -1;
    const s = i.pop();
    if (typeof s != "function")
      throw new TypeError("Expected function as last argument, not " + s);
    l(null, ...i);
    function l(a, ...c) {
      const u = t[++o];
      let f = -1;
      if (a) {
        s(a);
        return;
      }
      for (; ++f < i.length; )
        (c[f] === null || c[f] === void 0) && (c[f] = i[f]);
      i = c, u ? ex(u, l)(...c) : s(null, ...c);
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
function ex(t, e) {
  let n;
  return r;
  function r(...s) {
    const l = t.length > s.length;
    let a;
    l && s.push(i);
    try {
      a = t.apply(this, s);
    } catch (c) {
      const u = (
        /** @type {Error} */
        c
      );
      if (l && n)
        throw u;
      return i(u);
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
class xt extends Error {
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
    this.ancestors = o.ancestors || void 0, this.cause = o.cause || void 0, this.column = l ? l.column : void 0, this.fatal = void 0, this.file = "", this.message = i, this.line = l ? l.line : void 0, this.name = Co(o.place) || "1:1", this.place = o.place || void 0, this.reason = this.message, this.ruleId = o.ruleId || void 0, this.source = o.source || void 0, this.stack = s && o.cause && typeof o.cause.stack == "string" ? o.cause.stack : "", this.actual = void 0, this.expected = void 0, this.note = void 0, this.url = void 0;
  }
}
xt.prototype.file = "";
xt.prototype.name = "";
xt.prototype.reason = "";
xt.prototype.message = "";
xt.prototype.stack = "";
xt.prototype.column = void 0;
xt.prototype.line = void 0;
xt.prototype.ancestors = void 0;
xt.prototype.cause = void 0;
xt.prototype.fatal = void 0;
xt.prototype.place = void 0;
xt.prototype.ruleId = void 0;
xt.prototype.source = void 0;
const tn = { basename: tx, dirname: nx, extname: rx, join: ix, sep: "/" };
function tx(t, e) {
  if (e !== void 0 && typeof e != "string")
    throw new TypeError('"ext" argument must be a string');
  hs(t);
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
function nx(t) {
  if (hs(t), t.length === 0)
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
function rx(t) {
  hs(t);
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
function ix(...t) {
  let e = -1, n;
  for (; ++e < t.length; )
    hs(t[e]), t[e] && (n = n === void 0 ? t[e] : n + "/" + t[e]);
  return n === void 0 ? "." : ox(n);
}
function ox(t) {
  hs(t);
  const e = t.codePointAt(0) === 47;
  let n = sx(t, !e);
  return n.length === 0 && !e && (n = "."), n.length > 0 && t.codePointAt(t.length - 1) === 47 && (n += "/"), e ? "/" + n : n;
}
function sx(t, e) {
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
function hs(t) {
  if (typeof t != "string")
    throw new TypeError(
      "Path must be a string. Received " + JSON.stringify(t)
    );
}
const lx = { cwd: ax };
function ax() {
  return "/";
}
function uc(t) {
  return !!(t !== null && typeof t == "object" && "href" in t && t.href && "protocol" in t && t.protocol && // @ts-expect-error: indexing is fine.
  t.auth === void 0);
}
function cx(t) {
  if (typeof t == "string")
    t = new URL(t);
  else if (!uc(t)) {
    const e = new TypeError(
      'The "path" argument must be of type string or an instance of URL. Received `' + t + "`"
    );
    throw e.code = "ERR_INVALID_ARG_TYPE", e;
  }
  if (t.protocol !== "file:") {
    const e = new TypeError("The URL must be of scheme file");
    throw e.code = "ERR_INVALID_URL_SCHEME", e;
  }
  return ux(t);
}
function ux(t) {
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
const la = (
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
class fx {
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
    e ? uc(e) ? n = { path: e } : typeof e == "string" || dx(e) ? n = { value: e } : n = e : n = {}, this.cwd = "cwd" in n ? "" : lx.cwd(), this.data = {}, this.history = [], this.messages = [], this.value, this.map, this.result, this.stored;
    let r = -1;
    for (; ++r < la.length; ) {
      const o = la[r];
      o in n && n[o] !== void 0 && n[o] !== null && (this[o] = o === "history" ? [...n[o]] : n[o]);
    }
    let i;
    for (i in n)
      la.includes(i) || (this[i] = n[i]);
  }
  /**
   * Get the basename (including extname) (example: `'index.min.js'`).
   *
   * @returns {string | undefined}
   *   Basename.
   */
  get basename() {
    return typeof this.path == "string" ? tn.basename(this.path) : void 0;
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
    ca(e, "basename"), aa(e, "basename"), this.path = tn.join(this.dirname || "", e);
  }
  /**
   * Get the parent path (example: `'~'`).
   *
   * @returns {string | undefined}
   *   Dirname.
   */
  get dirname() {
    return typeof this.path == "string" ? tn.dirname(this.path) : void 0;
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
    Pd(this.basename, "dirname"), this.path = tn.join(e || "", this.basename);
  }
  /**
   * Get the extname (including dot) (example: `'.js'`).
   *
   * @returns {string | undefined}
   *   Extname.
   */
  get extname() {
    return typeof this.path == "string" ? tn.extname(this.path) : void 0;
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
    if (aa(e, "extname"), Pd(this.dirname, "extname"), e) {
      if (e.codePointAt(0) !== 46)
        throw new Error("`extname` must start with `.`");
      if (e.includes(".", 1))
        throw new Error("`extname` cannot contain multiple dots");
    }
    this.path = tn.join(this.dirname, this.stem + (e || ""));
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
    uc(e) && (e = cx(e)), ca(e, "path"), this.path !== e && this.history.push(e);
  }
  /**
   * Get the stem (basename w/o extname) (example: `'index.min'`).
   *
   * @returns {string | undefined}
   *   Stem.
   */
  get stem() {
    return typeof this.path == "string" ? tn.basename(this.path, this.extname) : void 0;
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
    ca(e, "stem"), aa(e, "stem"), this.path = tn.join(this.dirname || "", e + (this.extname || ""));
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
    const i = new xt(
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
function aa(t, e) {
  if (t && t.includes(tn.sep))
    throw new Error(
      "`" + e + "` cannot be a path: did not expect `" + tn.sep + "`"
    );
}
function ca(t, e) {
  if (!t)
    throw new Error("`" + e + "` cannot be empty");
}
function Pd(t, e) {
  if (!t)
    throw new Error("Setting `" + e + "` requires `path` to be set too");
}
function dx(t) {
  return !!(t && typeof t == "object" && "byteLength" in t && "byteOffset" in t);
}
const hx = (
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
), px = {}.hasOwnProperty;
class nu extends hx {
  /**
   * Create a processor.
   */
  constructor() {
    super("copy"), this.Compiler = void 0, this.Parser = void 0, this.attachers = [], this.compiler = void 0, this.freezeIndex = -1, this.frozen = void 0, this.namespace = {}, this.parser = void 0, this.transformers = Z0();
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
      new nu()
    );
    let n = -1;
    for (; ++n < this.attachers.length; ) {
      const r = this.attachers[n];
      e.use(...r);
    }
    return e.data(sa(!0, {}, this.namespace)), e;
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
    return typeof e == "string" ? arguments.length === 2 ? (da("data", this.frozen), this.namespace[e] = n, this) : px.call(this.namespace, e) && this.namespace[e] || void 0 : e ? (da("data", this.frozen), this.namespace = e, this) : this.namespace;
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
    const n = _s(e), r = this.parser || this.Parser;
    return ua("parse", r), r(String(n), n);
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
    return this.freeze(), ua("process", this.parser || this.Parser), fa("process", this.compiler || this.Compiler), n ? i(void 0, n) : new Promise(i);
    function i(o, s) {
      const l = _s(e), a = (
        /** @type {HeadTree extends undefined ? Node : HeadTree} */
        /** @type {unknown} */
        r.parse(l)
      );
      r.run(a, l, function(u, f, d) {
        if (u || !f || !d)
          return c(u);
        const h = (
          /** @type {CompileTree extends undefined ? Node : CompileTree} */
          /** @type {unknown} */
          f
        ), m = r.stringify(h, d);
        gx(m) ? d.value = m : d.result = m, c(
          u,
          /** @type {VFileWithOutput<CompileResult>} */
          d
        );
      });
      function c(u, f) {
        u || !f ? s(u) : o ? o(f) : n(void 0, f);
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
    return this.freeze(), ua("processSync", this.parser || this.Parser), fa("processSync", this.compiler || this.Compiler), this.process(e, i), Bd("processSync", "process", n), r;
    function i(o, s) {
      n = !0, Ed(o), r = s;
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
    zd(e), this.freeze();
    const i = this.transformers;
    return !r && typeof n == "function" && (r = n, n = void 0), r ? o(void 0, r) : new Promise(o);
    function o(s, l) {
      const a = _s(n);
      i.run(e, a, c);
      function c(u, f, d) {
        const h = (
          /** @type {TailTree extends undefined ? Node : TailTree} */
          f || e
        );
        u ? l(u) : s ? s(h) : r(void 0, h, d);
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
    return this.run(e, n, o), Bd("runSync", "run", r), i;
    function o(s, l) {
      Ed(s), i = l, r = !0;
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
    const r = _s(n), i = this.compiler || this.Compiler;
    return fa("stringify", i), zd(e), i(e, r);
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
    if (da("use", this.frozen), e != null) if (typeof e == "function")
      a(e, n);
    else if (typeof e == "object")
      Array.isArray(e) ? l(e) : s(e);
    else
      throw new TypeError("Expected usable value, not `" + e + "`");
    return this;
    function o(c) {
      if (typeof c == "function")
        a(c, []);
      else if (typeof c == "object")
        if (Array.isArray(c)) {
          const [u, ...f] = (
            /** @type {PluginTuple<Array<unknown>>} */
            c
          );
          a(u, f);
        } else
          s(c);
      else
        throw new TypeError("Expected usable value, not `" + c + "`");
    }
    function s(c) {
      if (!("plugins" in c) && !("settings" in c))
        throw new Error(
          "Expected usable value but received an empty preset, which is probably a mistake: presets typically come with `plugins` and sometimes with `settings`, but this has neither"
        );
      l(c.plugins), c.settings && (i.settings = sa(!0, i.settings, c.settings));
    }
    function l(c) {
      let u = -1;
      if (c != null) if (Array.isArray(c))
        for (; ++u < c.length; ) {
          const f = c[u];
          o(f);
        }
      else
        throw new TypeError("Expected a list of plugins, not `" + c + "`");
    }
    function a(c, u) {
      let f = -1, d = -1;
      for (; ++f < r.length; )
        if (r[f][0] === c) {
          d = f;
          break;
        }
      if (d === -1)
        r.push([c, ...u]);
      else if (u.length > 0) {
        let [h, ...m] = u;
        const b = r[d][1];
        cc(b) && cc(h) && (h = sa(!0, b, h)), r[d] = [c, h, ...m];
      }
    }
  }
}
const fc = new nu().freeze();
function ua(t, e) {
  if (typeof e != "function")
    throw new TypeError("Cannot `" + t + "` without `parser`");
}
function fa(t, e) {
  if (typeof e != "function")
    throw new TypeError("Cannot `" + t + "` without `compiler`");
}
function da(t, e) {
  if (e)
    throw new Error(
      "Cannot call `" + t + "` on a frozen processor.\nCreate a new processor first, by calling it: use `processor()` instead of `processor`."
    );
}
function zd(t) {
  if (!cc(t) || typeof t.type != "string")
    throw new TypeError("Expected node, got `" + t + "`");
}
function Bd(t, e, n) {
  if (!n)
    throw new Error(
      "`" + t + "` finished async. Use `" + e + "` instead"
    );
}
function _s(t) {
  return mx(t) ? t : new fx(t);
}
function mx(t) {
  return !!(t && typeof t == "object" && "message" in t && "messages" in t);
}
function gx(t) {
  return typeof t == "string" || yx(t);
}
function yx(t) {
  return !!(t && typeof t == "object" && "byteLength" in t && "byteOffset" in t);
}
function Ye(t) {
  this.content = t;
}
Ye.prototype = {
  constructor: Ye,
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
    return i == -1 ? o.push(n || t, e) : (o[i + 1] = e, n && (o[i] = n)), new Ye(o);
  },
  // :: (string) → OrderedMap
  // Return a map with the given key removed, if it existed.
  remove: function(t) {
    var e = this.find(t);
    if (e == -1) return this;
    var n = this.content.slice();
    return n.splice(e, 2), new Ye(n);
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the start of the map.
  addToStart: function(t, e) {
    return new Ye([t, e].concat(this.remove(t).content));
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the end of the map.
  addToEnd: function(t, e) {
    var n = this.remove(t).content.slice();
    return n.push(t, e), new Ye(n);
  },
  // :: (string, string, any) → OrderedMap
  // Add a key after the given key. If `place` is not found, the new
  // key is added to the end.
  addBefore: function(t, e, n) {
    var r = this.remove(e), i = r.content.slice(), o = r.find(t);
    return i.splice(o == -1 ? i.length : o, 0, e, n), new Ye(i);
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
    return t = Ye.from(t), t.size ? new Ye(t.content.concat(this.subtract(t).content)) : this;
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a new map by appending the keys in this map that don't
  // appear in `map` after the keys in `map`.
  append: function(t) {
    return t = Ye.from(t), t.size ? new Ye(this.subtract(t).content.concat(t.content)) : this;
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a map containing all the keys in this map that don't
  // appear in `map`.
  subtract: function(t) {
    var e = this;
    t = Ye.from(t);
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
Ye.from = function(t) {
  if (t instanceof Ye) return t;
  var e = [];
  if (t) for (var n in t) e.push(n, t[n]);
  return new Ye(e);
};
function gm(t, e, n) {
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
      let s = gm(i.content, o.content, n + 1);
      if (s != null)
        return s;
    }
    n += i.nodeSize;
  }
}
function ym(t, e, n, r) {
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
      let c = 0, u = Math.min(s.text.length, l.text.length);
      for (; c < u && s.text[s.text.length - c - 1] == l.text[l.text.length - c - 1]; )
        c++, n--, r--;
      return { a: n, b: r };
    }
    if (s.content.size || l.content.size) {
      let c = ym(s.content, l.content, n - 1, r - 1);
      if (c)
        return c;
    }
    n -= a, r -= a;
  }
}
class z {
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
      let a = this.content[s], c = l + a.nodeSize;
      if (c > e && r(a, i + l, o || null, s) !== !1 && a.content.size) {
        let u = l + 1;
        a.nodesBetween(Math.max(0, e - u), Math.min(a.content.size, n - u), r, i + u);
      }
      l = c;
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
      let c = l.isText ? l.text.slice(Math.max(e, a) - a, n - a) : l.isLeaf ? i ? typeof i == "function" ? i(l) : i : l.type.spec.leafText ? l.type.spec.leafText(l) : "" : "";
      l.isBlock && (l.isLeaf && c || l.isTextblock) && r && (s ? s = !1 : o += r), o += c;
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
    return new z(i, this.size + e.size);
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
    return new z(r, i);
  }
  /**
  @internal
  */
  cutByIndex(e, n) {
    return e == n ? z.empty : e == 0 && n == this.content.length ? this : new z(this.content.slice(e, n));
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
    return i[e] = n, new z(i, o);
  }
  /**
  Create a new fragment by prepending the given node to this
  fragment.
  */
  addToStart(e) {
    return new z([e].concat(this.content), this.size + e.nodeSize);
  }
  /**
  Create a new fragment by appending the given node to this
  fragment.
  */
  addToEnd(e) {
    return new z(this.content.concat(e), this.size + e.nodeSize);
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
    return gm(this, e, n);
  }
  /**
  Find the first position, searching from the end, at which this
  fragment and the given fragment differ, or `null` if they are
  the same. Since this position will not be the same in both
  nodes, an object with two separate positions is returned.
  */
  findDiffEnd(e, n = this.size, r = e.size) {
    return ym(this, e, n, r);
  }
  /**
  Find the index and inner offset corresponding to a given relative
  position in this fragment. The result object will be reused
  (overwritten) the next time the function is called. @internal
  */
  findIndex(e) {
    if (e == 0)
      return Vs(0, e);
    if (e == this.size)
      return Vs(this.content.length, e);
    if (e > this.size || e < 0)
      throw new RangeError(`Position ${e} outside of fragment (${this})`);
    for (let n = 0, r = 0; ; n++) {
      let i = this.child(n), o = r + i.nodeSize;
      if (o >= e)
        return o == e ? Vs(n + 1, o) : Vs(n, r);
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
      return z.empty;
    if (!Array.isArray(n))
      throw new RangeError("Invalid input for Fragment.fromJSON");
    return new z(n.map(e.nodeFromJSON));
  }
  /**
  Build a fragment from an array of nodes. Ensures that adjacent
  text nodes with the same marks are joined together.
  */
  static fromArray(e) {
    if (!e.length)
      return z.empty;
    let n, r = 0;
    for (let i = 0; i < e.length; i++) {
      let o = e[i];
      r += o.nodeSize, i && o.isText && e[i - 1].sameMarkup(o) ? (n || (n = e.slice(0, i)), n[n.length - 1] = o.withText(n[n.length - 1].text + o.text)) : n && n.push(o);
    }
    return new z(n || e, r);
  }
  /**
  Create a fragment from something that can be interpreted as a
  set of nodes. For `null`, it returns the empty fragment. For a
  fragment, the fragment itself. For a node or array of nodes, a
  fragment containing those nodes.
  */
  static from(e) {
    if (!e)
      return z.empty;
    if (e instanceof z)
      return e;
    if (Array.isArray(e))
      return this.fromArray(e);
    if (e.attrs)
      return new z([e], e.nodeSize);
    throw new RangeError("Can not convert " + e + " to a Fragment" + (e.nodesBetween ? " (looks like multiple versions of prosemirror-model were loaded)" : ""));
  }
}
z.empty = new z([], 0);
const ha = { index: 0, offset: 0 };
function Vs(t, e) {
  return ha.index = t, ha.offset = e, ha;
}
function hl(t, e) {
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
      if (!hl(t[r], e[r]))
        return !1;
  } else {
    for (let r in t)
      if (!(r in e) || !hl(t[r], e[r]))
        return !1;
    for (let r in e)
      if (!(r in t))
        return !1;
  }
  return !0;
}
class ye {
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
    return this == e || this.type == e.type && hl(this.attrs, e.attrs);
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
      return ye.none;
    if (e instanceof ye)
      return [e];
    let n = e.slice();
    return n.sort((r, i) => r.type.rank - i.type.rank), n;
  }
}
ye.none = [];
class pl extends Error {
}
class H {
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
    let r = bm(this.content, e + this.openStart, n);
    return r && new H(r, this.openStart, this.openEnd);
  }
  /**
  @internal
  */
  removeBetween(e, n) {
    return new H(km(this.content, e + this.openStart, n + this.openStart), this.openStart, this.openEnd);
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
      return H.empty;
    let r = n.openStart || 0, i = n.openEnd || 0;
    if (typeof r != "number" || typeof i != "number")
      throw new RangeError("Invalid input for Slice.fromJSON");
    return new H(z.fromJSON(e, n.content), r, i);
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
    return new H(e, r, i);
  }
}
H.empty = new H(z.empty, 0, 0);
function km(t, e, n) {
  let { index: r, offset: i } = t.findIndex(e), o = t.maybeChild(r), { index: s, offset: l } = t.findIndex(n);
  if (i == e || o.isText) {
    if (l != n && !t.child(s).isText)
      throw new RangeError("Removing non-flat range");
    return t.cut(0, e).append(t.cut(n));
  }
  if (r != s)
    throw new RangeError("Removing non-flat range");
  return t.replaceChild(r, o.copy(km(o.content, e - i - 1, n - i - 1)));
}
function bm(t, e, n, r) {
  let { index: i, offset: o } = t.findIndex(e), s = t.maybeChild(i);
  if (o == e || s.isText)
    return r && !r.canReplace(i, i, n) ? null : t.cut(0, e).append(n).append(t.cut(e));
  let l = bm(s.content, e - o - 1, n, s);
  return l && t.replaceChild(i, s.copy(l));
}
function kx(t, e, n) {
  if (n.openStart > t.depth)
    throw new pl("Inserted content deeper than insertion position");
  if (t.depth - n.openStart != e.depth - n.openEnd)
    throw new pl("Inconsistent open depths");
  return wm(t, e, n, 0);
}
function wm(t, e, n, r) {
  let i = t.index(r), o = t.node(r);
  if (i == e.index(r) && r < t.depth - n.openStart) {
    let s = wm(t, e, n, r + 1);
    return o.copy(o.content.replaceChild(i, s));
  } else if (n.content.size)
    if (!n.openStart && !n.openEnd && t.depth == r && e.depth == r) {
      let s = t.parent, l = s.content;
      return Br(s, l.cut(0, t.parentOffset).append(n.content).append(l.cut(e.parentOffset)));
    } else {
      let { start: s, end: l } = bx(n, t);
      return Br(o, Cm(t, s, l, e, r));
    }
  else return Br(o, ml(t, e, r));
}
function xm(t, e) {
  if (!e.type.compatibleContent(t.type))
    throw new pl("Cannot join " + e.type.name + " onto " + t.type.name);
}
function dc(t, e, n) {
  let r = t.node(n);
  return xm(r, e.node(n)), r;
}
function zr(t, e) {
  let n = e.length - 1;
  n >= 0 && t.isText && t.sameMarkup(e[n]) ? e[n] = t.withText(e[n].text + t.text) : e.push(t);
}
function So(t, e, n, r) {
  let i = (e || t).node(n), o = 0, s = e ? e.index(n) : i.childCount;
  t && (o = t.index(n), t.depth > n ? o++ : t.textOffset && (zr(t.nodeAfter, r), o++));
  for (let l = o; l < s; l++)
    zr(i.child(l), r);
  e && e.depth == n && e.textOffset && zr(e.nodeBefore, r);
}
function Br(t, e) {
  return t.type.checkContent(e), t.copy(e);
}
function Cm(t, e, n, r, i) {
  let o = t.depth > i && dc(t, e, i + 1), s = r.depth > i && dc(n, r, i + 1), l = [];
  return So(null, t, i, l), o && s && e.index(i) == n.index(i) ? (xm(o, s), zr(Br(o, Cm(t, e, n, r, i + 1)), l)) : (o && zr(Br(o, ml(t, e, i + 1)), l), So(e, n, i, l), s && zr(Br(s, ml(n, r, i + 1)), l)), So(r, null, i, l), new z(l);
}
function ml(t, e, n) {
  let r = [];
  if (So(null, t, n, r), t.depth > n) {
    let i = dc(t, e, n + 1);
    zr(Br(i, ml(t, e, n + 1)), r);
  }
  return So(e, null, n, r), new z(r);
}
function bx(t, e) {
  let n = e.depth - t.openStart, i = e.node(n).copy(t.content);
  for (let o = n - 1; o >= 0; o--)
    i = e.node(o).copy(z.from(i));
  return {
    start: i.resolveNoCache(t.openStart + n),
    end: i.resolveNoCache(i.content.size - t.openEnd - n)
  };
}
class Bo {
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
      return ye.none;
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
        return new Sm(this, e, r);
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
      let { index: l, offset: a } = s.content.findIndex(o), c = o - a;
      if (r.push(s, l, i + a), !c || (s = s.child(l), s.isText))
        break;
      o = c - 1, i += a + 1;
    }
    return new Bo(n, r, o);
  }
  /**
  @internal
  */
  static resolveCached(e, n) {
    let r = Fd.get(e);
    if (r)
      for (let o = 0; o < r.elts.length; o++) {
        let s = r.elts[o];
        if (s.pos == n)
          return s;
      }
    else
      Fd.set(e, r = new wx());
    let i = r.elts[r.i] = Bo.resolve(e, n);
    return r.i = (r.i + 1) % xx, i;
  }
}
class wx {
  constructor() {
    this.elts = [], this.i = 0;
  }
}
const xx = 12, Fd = /* @__PURE__ */ new WeakMap();
class Sm {
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
const Cx = /* @__PURE__ */ Object.create(null);
let Rn = class hc {
  /**
  @internal
  */
  constructor(e, n, r, i = ye.none) {
    this.type = e, this.attrs = n, this.marks = i, this.content = r || z.empty;
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
    return this.type == e && hl(this.attrs, n || e.defaultAttrs || Cx) && ye.sameSet(this.marks, r || ye.none);
  }
  /**
  Create a new node with the same markup as this node, containing
  the given content (or empty, if no content is given).
  */
  copy(e = null) {
    return e == this.content ? this : new hc(this.type, this.attrs, e, this.marks);
  }
  /**
  Create a copy of this node, with the given set of marks instead
  of the node's own marks.
  */
  mark(e) {
    return e == this.marks ? this : new hc(this.type, this.attrs, this.content, e);
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
      return H.empty;
    let i = this.resolve(e), o = this.resolve(n), s = r ? 0 : i.sharedDepth(n), l = i.start(s), c = i.node(s).content.cut(i.pos - l, o.pos - l);
    return new H(c, i.depth - s, o.depth - s);
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
    return kx(this.resolve(e), this.resolve(n), r);
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
    return Bo.resolveCached(this, e);
  }
  /**
  @internal
  */
  resolveNoCache(e) {
    return Bo.resolve(this, e);
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
    return this.content.size && (e += "(" + this.content.toStringInner() + ")"), vm(this.marks, e);
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
  canReplace(e, n, r = z.empty, i = 0, o = r.childCount) {
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
    let e = ye.none;
    for (let n = 0; n < this.marks.length; n++) {
      let r = this.marks[n];
      r.type.checkAttrs(r.attrs), e = r.addToSet(e);
    }
    if (!ye.sameSet(e, this.marks))
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
    let i = z.fromJSON(e, n.content), o = e.nodeType(n.type).create(n.attrs, i, r);
    return o.type.checkAttrs(o.attrs), o;
  }
};
Rn.prototype.text = void 0;
class gl extends Rn {
  /**
  @internal
  */
  constructor(e, n, r, i) {
    if (super(e, n, null, i), !r)
      throw new RangeError("Empty text nodes are not allowed");
    this.text = r;
  }
  toString() {
    return this.type.spec.toDebugString ? this.type.spec.toDebugString(this) : vm(this.marks, JSON.stringify(this.text));
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
    return e == this.marks ? this : new gl(this.type, this.attrs, this.text, e);
  }
  withText(e) {
    return e == this.text ? this : new gl(this.type, this.attrs, e, this.marks);
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
function vm(t, e) {
  for (let n = t.length - 1; n >= 0; n--)
    e = t[n].type.name + "(" + e + ")";
  return e;
}
class Gr {
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
    let r = new Sx(e, n);
    if (r.next == null)
      return Gr.empty;
    let i = Mm(r);
    r.next && r.err("Unexpected trailing text");
    let o = Ix(Ax(i));
    return Ox(o, r), o;
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
        return z.from(l.map((c) => c.createAndFill()));
      for (let c = 0; c < s.next.length; c++) {
        let { type: u, next: f } = s.next[c];
        if (!(u.isText || u.hasRequiredAttrs()) && i.indexOf(f) == -1) {
          i.push(f);
          let d = o(f, l.concat(u));
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
Gr.empty = new Gr(!0);
class Sx {
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
function Mm(t) {
  let e = [];
  do
    e.push(vx(t));
  while (t.eat("|"));
  return e.length == 1 ? e[0] : { type: "choice", exprs: e };
}
function vx(t) {
  let e = [];
  do
    e.push(Mx(t));
  while (t.next && t.next != ")" && t.next != "|");
  return e.length == 1 ? e[0] : { type: "seq", exprs: e };
}
function Mx(t) {
  let e = Ex(t);
  for (; ; )
    if (t.eat("+"))
      e = { type: "plus", expr: e };
    else if (t.eat("*"))
      e = { type: "star", expr: e };
    else if (t.eat("?"))
      e = { type: "opt", expr: e };
    else if (t.eat("{"))
      e = Tx(t, e);
    else
      break;
  return e;
}
function $d(t) {
  /\D/.test(t.next) && t.err("Expected number, got '" + t.next + "'");
  let e = Number(t.next);
  return t.pos++, e;
}
function Tx(t, e) {
  let n = $d(t), r = n;
  return t.eat(",") && (t.next != "}" ? r = $d(t) : r = -1), t.eat("}") || t.err("Unclosed braced range"), { type: "range", min: n, max: r, expr: e };
}
function Nx(t, e) {
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
function Ex(t) {
  if (t.eat("(")) {
    let e = Mm(t);
    return t.eat(")") || t.err("Missing closing paren"), e;
  } else if (/\W/.test(t.next))
    t.err("Unexpected token '" + t.next + "'");
  else {
    let e = Nx(t, t.next).map((n) => (t.inline == null ? t.inline = n.isInline : t.inline != n.isInline && t.err("Mixing inline and block content"), { type: "name", value: n }));
    return t.pos++, e.length == 1 ? e[0] : { type: "choice", exprs: e };
  }
}
function Ax(t) {
  let e = [[]];
  return i(o(t, 0), n()), e;
  function n() {
    return e.push([]) - 1;
  }
  function r(s, l, a) {
    let c = { term: a, to: l };
    return e[s].push(c), c;
  }
  function i(s, l) {
    s.forEach((a) => a.to = l);
  }
  function o(s, l) {
    if (s.type == "choice")
      return s.exprs.reduce((a, c) => a.concat(o(c, l)), []);
    if (s.type == "seq")
      for (let a = 0; ; a++) {
        let c = o(s.exprs[a], l);
        if (a == s.exprs.length - 1)
          return c;
        i(c, l = n());
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
        for (let c = 0; c < s.min; c++) {
          let u = n();
          i(o(s.expr, a), u), a = u;
        }
        if (s.max == -1)
          i(o(s.expr, a), a);
        else
          for (let c = s.min; c < s.max; c++) {
            let u = n();
            r(a, u), i(o(s.expr, a), u), a = u;
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
function Tm(t, e) {
  return e - t;
}
function _d(t, e) {
  let n = [];
  return r(e), n.sort(Tm);
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
function Ix(t) {
  let e = /* @__PURE__ */ Object.create(null);
  return n(_d(t, 0));
  function n(r) {
    let i = [];
    r.forEach((s) => {
      t[s].forEach(({ term: l, to: a }) => {
        if (!l)
          return;
        let c;
        for (let u = 0; u < i.length; u++)
          i[u][0] == l && (c = i[u][1]);
        _d(t, a).forEach((u) => {
          c || i.push([l, c = []]), c.indexOf(u) == -1 && c.push(u);
        });
      });
    });
    let o = e[r.join(",")] = new Gr(r.indexOf(t.length - 1) > -1);
    for (let s = 0; s < i.length; s++) {
      let l = i[s][1].sort(Tm);
      o.next.push({ type: i[s][0], next: e[l.join(",")] || n(l) });
    }
    return o;
  }
}
function Ox(t, e) {
  for (let n = 0, r = [t]; n < r.length; n++) {
    let i = r[n], o = !i.validEnd, s = [];
    for (let l = 0; l < i.next.length; l++) {
      let { type: a, next: c } = i.next[l];
      s.push(a.name), o && !(a.isText || a.hasRequiredAttrs()) && (o = !1), r.indexOf(c) == -1 && r.push(c);
    }
    o && e.err("Only non-generatable nodes (" + s.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
  }
}
function Nm(t) {
  let e = /* @__PURE__ */ Object.create(null);
  for (let n in t) {
    let r = t[n];
    if (!r.hasDefault)
      return null;
    e[n] = r.default;
  }
  return e;
}
function Em(t, e) {
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
function Am(t, e, n, r) {
  for (let i in e)
    if (!(i in t))
      throw new RangeError(`Unsupported attribute ${i} for ${n} of type ${i}`);
  for (let i in t) {
    let o = t[i];
    o.validate && o.validate(e[i]);
  }
}
function Im(t, e) {
  let n = /* @__PURE__ */ Object.create(null);
  if (e)
    for (let r in e)
      n[r] = new Rx(t, r, e[r]);
  return n;
}
let Vd = class Om {
  /**
  @internal
  */
  constructor(e, n, r) {
    this.name = e, this.schema = n, this.spec = r, this.markSet = null, this.groups = r.group ? r.group.split(" ") : [], this.attrs = Im(e, r.attrs), this.defaultAttrs = Nm(this.attrs), this.contentMatch = null, this.inlineContent = null, this.isBlock = !(r.inline || e == "text"), this.isText = e == "text";
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
    return this.contentMatch == Gr.empty;
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
    return !e && this.defaultAttrs ? this.defaultAttrs : Em(this.attrs, e);
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
    return new Rn(this, this.computeAttrs(e), z.from(n), ye.setFrom(r));
  }
  /**
  Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but check the given content
  against the node type's content restrictions, and throw an error
  if it doesn't match.
  */
  createChecked(e = null, n, r) {
    return n = z.from(n), this.checkContent(n), new Rn(this, this.computeAttrs(e), n, ye.setFrom(r));
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
    if (e = this.computeAttrs(e), n = z.from(n), n.size) {
      let s = this.contentMatch.fillBefore(n);
      if (!s)
        return null;
      n = s.append(n);
    }
    let i = this.contentMatch.matchFragment(n), o = i && i.fillBefore(z.empty, !0);
    return o ? new Rn(this, e, n.append(o), ye.setFrom(r)) : null;
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
    Am(this.attrs, e, "node", this.name);
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
    return n ? n.length ? n : ye.none : e;
  }
  /**
  @internal
  */
  static compile(e, n) {
    let r = /* @__PURE__ */ Object.create(null);
    e.forEach((o, s) => r[o] = new Om(o, n, s));
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
function Dx(t, e, n) {
  let r = n.split("|");
  return (i) => {
    let o = i === null ? "null" : typeof i;
    if (r.indexOf(o) < 0)
      throw new RangeError(`Expected value of type ${r} for attribute ${e} on type ${t}, got ${o}`);
  };
}
class Rx {
  constructor(e, n, r) {
    this.hasDefault = Object.prototype.hasOwnProperty.call(r, "default"), this.default = r.default, this.validate = typeof r.validate == "string" ? Dx(e, n, r.validate) : r.validate;
  }
  get isRequired() {
    return !this.hasDefault;
  }
}
class zl {
  /**
  @internal
  */
  constructor(e, n, r, i) {
    this.name = e, this.rank = n, this.schema = r, this.spec = i, this.attrs = Im(e, i.attrs), this.excluded = null;
    let o = Nm(this.attrs);
    this.instance = o ? new ye(this, o) : null;
  }
  /**
  Create a mark of this type. `attrs` may be `null` or an object
  containing only some of the mark's attributes. The others, if
  they have defaults, will be added.
  */
  create(e = null) {
    return !e && this.instance ? this.instance : new ye(this, Em(this.attrs, e));
  }
  /**
  @internal
  */
  static compile(e, n) {
    let r = /* @__PURE__ */ Object.create(null), i = 0;
    return e.forEach((o, s) => r[o] = new zl(o, i++, n, s)), r;
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
    Am(this.attrs, e, "mark", this.name);
  }
  /**
  Queries whether a given mark type is
  [excluded](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) by this one.
  */
  excludes(e) {
    return this.excluded.indexOf(e) > -1;
  }
}
class Lx {
  /**
  Construct a schema from a schema [specification](https://prosemirror.net/docs/ref/#model.SchemaSpec).
  */
  constructor(e) {
    this.linebreakReplacement = null, this.cached = /* @__PURE__ */ Object.create(null);
    let n = this.spec = {};
    for (let i in e)
      n[i] = e[i];
    n.nodes = Ye.from(e.nodes), n.marks = Ye.from(e.marks || {}), this.nodes = Vd.compile(this.spec.nodes, this), this.marks = zl.compile(this.spec.marks, this);
    let r = /* @__PURE__ */ Object.create(null);
    for (let i in this.nodes) {
      if (i in this.marks)
        throw new RangeError(i + " can not be both a node and a mark");
      let o = this.nodes[i], s = o.spec.content || "", l = o.spec.marks;
      if (o.contentMatch = r[s] || (r[s] = Gr.parse(s, this.nodes)), o.inlineContent = o.contentMatch.inlineContent, o.spec.linebreakReplacement) {
        if (this.linebreakReplacement)
          throw new RangeError("Multiple linebreak nodes defined");
        if (!o.isInline || !o.isLeaf)
          throw new RangeError("Linebreak replacement nodes must be inline leaf nodes");
        this.linebreakReplacement = o;
      }
      o.markSet = l == "_" ? null : l ? Hd(this, l.split(" ")) : l == "" || !o.inlineContent ? [] : null;
    }
    for (let i in this.marks) {
      let o = this.marks[i], s = o.spec.excludes;
      o.excluded = s == null ? [o] : s == "" ? [] : Hd(this, s.split(" "));
    }
    this.nodeFromJSON = (i) => Rn.fromJSON(this, i), this.markFromJSON = (i) => ye.fromJSON(this, i), this.topNodeType = this.nodes[this.spec.topNode || "doc"], this.cached.wrappings = /* @__PURE__ */ Object.create(null);
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
    else if (e instanceof Vd) {
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
    return new gl(r, r.defaultAttrs, e, ye.setFrom(n));
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
function Hd(t, e) {
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
function Px(t) {
  return t.tag != null;
}
function zx(t) {
  return t.style != null;
}
let ru = class pc {
  /**
  Create a parser that targets the given schema, using the given
  parsing rules.
  */
  constructor(e, n) {
    this.schema = e, this.rules = n, this.tags = [], this.styles = [];
    let r = this.matchedStyles = [];
    n.forEach((i) => {
      if (Px(i))
        this.tags.push(i);
      else if (zx(i)) {
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
    let r = new Wd(this, n, !1);
    return r.addAll(e, ye.none, n.from, n.to), r.finish();
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
    let r = new Wd(this, n, !0);
    return r.addAll(e, ye.none, n.from, n.to), H.maxOpen(r.finish());
  }
  /**
  @internal
  */
  matchTag(e, n, r) {
    for (let i = r ? this.tags.indexOf(r) + 1 : 0; i < this.tags.length; i++) {
      let o = this.tags[i];
      if ($x(e, o.tag) && (o.namespace === void 0 || e.namespaceURI == o.namespace) && (!o.context || n.matchesContext(o.context))) {
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
        r(s = qd(s)), s.mark || s.ignore || s.clearMark || (s.mark = i);
      });
    }
    for (let i in e.nodes) {
      let o = e.nodes[i].spec.parseDOM;
      o && o.forEach((s) => {
        r(s = qd(s)), s.node || s.ignore || s.mark || (s.node = i);
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
    return e.cached.domParser || (e.cached.domParser = new pc(e, pc.schemaRules(e)));
  }
};
const Dm = {
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
}, Bx = {
  head: !0,
  noscript: !0,
  object: !0,
  script: !0,
  style: !0,
  title: !0
}, Rm = { ol: !0, ul: !0 }, Fo = 1, mc = 2, vo = 4;
function jd(t, e, n) {
  return e != null ? (e ? Fo : 0) | (e === "full" ? mc : 0) : t && t.whitespace == "pre" ? Fo | mc : n & ~vo;
}
class Hs {
  constructor(e, n, r, i, o, s) {
    this.type = e, this.attrs = n, this.marks = r, this.solid = i, this.options = s, this.content = [], this.activeMarks = ye.none, this.match = o || (s & vo ? null : e.contentMatch);
  }
  findWrapping(e) {
    if (!this.match) {
      if (!this.type)
        return [];
      let n = this.type.contentMatch.fillBefore(z.from(e));
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
    if (!(this.options & Fo)) {
      let r = this.content[this.content.length - 1], i;
      if (r && r.isText && (i = /[ \t\r\n\u000c]+$/.exec(r.text))) {
        let o = r;
        r.text.length == i[0].length ? this.content.pop() : this.content[this.content.length - 1] = o.withText(o.text.slice(0, o.text.length - i[0].length));
      }
    }
    let n = z.from(this.content);
    return !e && this.match && (n = n.append(this.match.fillBefore(z.empty, !0))), this.type ? this.type.create(this.attrs, n, this.marks) : n;
  }
  inlineContext(e) {
    return this.type ? this.type.inlineContent : this.content.length ? this.content[0].isInline : e.parentNode && !Dm.hasOwnProperty(e.parentNode.nodeName.toLowerCase());
  }
}
class Wd {
  constructor(e, n, r) {
    this.parser = e, this.options = n, this.isOpen = r, this.open = 0, this.localPreserveWS = !1;
    let i = n.topNode, o, s = jd(null, n.preserveWhitespace, 0) | (r ? vo : 0);
    i ? o = new Hs(i.type, i.attrs, ye.none, !0, n.topMatch || i.type.contentMatch, s) : r ? o = new Hs(null, null, ye.none, !0, null, s) : o = new Hs(e.schema.topNodeType, null, ye.none, !0, null, s), this.nodes = [o], this.find = n.findPositions, this.needsBlock = !1;
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
    let r = e.nodeValue, i = this.top, o = i.options & mc ? "full" : this.localPreserveWS || (i.options & Fo) > 0, { schema: s } = this.parser;
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
    Rm.hasOwnProperty(s) && this.parser.normalizeLists && Fx(e);
    let a = this.options.ruleFromNode && this.options.ruleFromNode(e) || (l = this.parser.matchTag(e, this, r));
    e: if (a ? a.ignore : Bx.hasOwnProperty(s))
      this.findInside(e), this.ignoreFallback(e, n);
    else if (!a || a.skip || a.closeParent) {
      a && a.closeParent ? this.open = Math.max(0, this.open - 1) : a && a.skip.nodeType && (e = a.skip);
      let c, u = this.needsBlock;
      if (Dm.hasOwnProperty(s))
        o.content.length && o.content[0].isInline && this.open && (this.open--, o = this.top), c = !0, o.type || (this.needsBlock = !0);
      else if (!e.firstChild) {
        this.leafFallback(e, n);
        break e;
      }
      let f = a && a.skip ? n : this.readStyles(e, n);
      f && this.addAll(e, f), c && this.sync(o), this.needsBlock = u;
    } else {
      let c = this.readStyles(e, n);
      c && this.addElementByRule(e, a, c, a.consuming === !1 ? l : void 0);
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
            if (a.clearMark ? n = n.filter((c) => !a.clearMark(c)) : n = n.concat(this.parser.schema.marks[a.mark].create(a.attrs)), a.consuming === !1)
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
      let a = this.nodes[s], c = a.findWrapping(e);
      if (c && (!i || i.length > c.length + l) && (i = c, o = a, !c.length))
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
      let s = ye.none;
      for (let l of i.concat(e.marks))
        (o.type ? o.type.allowsMarkType(l.type) : Kd(l.type, e.type)) && (s = l.addToSet(s));
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
    let l = jd(e, o, s.options);
    s.options & vo && s.content.length == 0 && (l |= vo);
    let a = ye.none;
    return r = r.filter((c) => (s.type ? s.type.allowsMarkType(c.type) : Kd(c.type, e)) ? (a = c.addToSet(a), !1) : !0), this.nodes.push(new Hs(e, n, a, i, null, l)), this.open++, r;
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
      this.localPreserveWS && (this.nodes[n].options |= Fo);
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
        let c = n[l];
        if (c == "") {
          if (l == n.length - 1 || l == 0)
            continue;
          for (; a >= o; a--)
            if (s(l - 1, a))
              return !0;
          return !1;
        } else {
          let u = a > 0 || a == 0 && i ? this.nodes[a].type : r && a >= o ? r.node(a - o).type : null;
          if (!u || u.name != c && !u.isInGroup(c))
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
function Fx(t) {
  for (let e = t.firstChild, n = null; e; e = e.nextSibling) {
    let r = e.nodeType == 1 ? e.nodeName.toLowerCase() : null;
    r && Rm.hasOwnProperty(r) && n ? (n.appendChild(e), e = n) : r == "li" ? n = e : r && (n = null);
  }
}
function $x(t, e) {
  return (t.matches || t.msMatchesSelector || t.webkitMatchesSelector || t.mozMatchesSelector).call(t, e);
}
function qd(t) {
  let e = {};
  for (let n in t)
    e[n] = t[n];
  return e;
}
function Kd(t, e) {
  let n = e.schema.nodes;
  for (let r in n) {
    let i = n[r];
    if (!i.allowsMarkType(t))
      continue;
    let o = [], s = (l) => {
      o.push(l);
      for (let a = 0; a < l.edgeCount; a++) {
        let { type: c, next: u } = l.edge(a);
        if (c == e || o.indexOf(u) < 0 && s(u))
          return !0;
      }
    };
    if (s(i.contentMatch))
      return !0;
  }
}
class ni {
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
    r || (r = pa(n).createDocumentFragment());
    let i = r, o = [];
    return e.forEach((s) => {
      if (o.length || s.marks.length) {
        let l = 0, a = 0;
        for (; l < o.length && a < s.marks.length; ) {
          let c = s.marks[a];
          if (!this.marks[c.type.name]) {
            a++;
            continue;
          }
          if (!c.eq(o[l][0]) || c.type.spec.spanning === !1)
            break;
          l++, a++;
        }
        for (; l < o.length; )
          i = o.pop()[1];
        for (; a < s.marks.length; ) {
          let c = s.marks[a++], u = this.serializeMark(c, s.isInline, n);
          u && (o.push([c, i]), i.appendChild(u.dom), i = u.contentDOM || u.dom);
        }
      }
      i.appendChild(this.serializeNodeInner(s, n));
    }), r;
  }
  /**
  @internal
  */
  serializeNodeInner(e, n) {
    let { dom: r, contentDOM: i } = Xs(pa(n), this.nodes[e.type.name](e), null, e.attrs);
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
    return i && Xs(pa(r), i(e, n), null, e.attrs);
  }
  static renderSpec(e, n, r = null, i) {
    return Xs(e, n, r, i);
  }
  /**
  Build a serializer using the [`toDOM`](https://prosemirror.net/docs/ref/#model.NodeSpec.toDOM)
  properties in a schema's node and mark specs.
  */
  static fromSchema(e) {
    return e.cached.domSerializer || (e.cached.domSerializer = new ni(this.nodesFromSchema(e), this.marksFromSchema(e)));
  }
  /**
  Gather the serializers in a schema's node specs into an object.
  This can be useful as a base to build a custom serializer from.
  */
  static nodesFromSchema(e) {
    let n = Ud(e.nodes);
    return n.text || (n.text = (r) => r.text), n;
  }
  /**
  Gather the serializers in a schema's mark specs into an object.
  */
  static marksFromSchema(e) {
    return Ud(e.marks);
  }
}
function Ud(t) {
  let e = {};
  for (let n in t) {
    let r = t[n].spec.toDOM;
    r && (e[n] = r);
  }
  return e;
}
function pa(t) {
  return t.document || window.document;
}
const Jd = /* @__PURE__ */ new WeakMap();
function _x(t) {
  let e = Jd.get(t);
  return e === void 0 && Jd.set(t, e = Vx(t)), e;
}
function Vx(t) {
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
function Xs(t, e, n, r) {
  if (typeof e == "string")
    return { dom: t.createTextNode(e) };
  if (e.nodeType != null)
    return { dom: e };
  if (e.dom && e.dom.nodeType != null)
    return e;
  let i = e[0], o;
  if (typeof i != "string")
    throw new RangeError("Invalid array passed to renderSpec");
  if (r && (o = _x(r)) && o.indexOf(e) > -1)
    throw new RangeError("Using an array from an attribute object as a DOM spec. This may be an attempted cross site scripting attack.");
  let s = i.indexOf(" ");
  s > 0 && (n = i.slice(0, s), i = i.slice(s + 1));
  let l, a = n ? t.createElementNS(n, i) : t.createElement(i), c = e[1], u = 1;
  if (c && typeof c == "object" && c.nodeType == null && !Array.isArray(c)) {
    u = 2;
    for (let f in c)
      if (c[f] != null) {
        let d = f.indexOf(" ");
        d > 0 ? a.setAttributeNS(f.slice(0, d), f.slice(d + 1), c[f]) : f == "style" && a.style ? a.style.cssText = c[f] : a.setAttribute(f, c[f]);
      }
  }
  for (let f = u; f < e.length; f++) {
    let d = e[f];
    if (d === 0) {
      if (f < e.length - 1 || f > u)
        throw new RangeError("Content hole must be the only child of its parent node");
      return { dom: a, contentDOM: a };
    } else {
      let { dom: h, contentDOM: m } = Xs(t, d, n, r);
      if (a.appendChild(h), m) {
        if (l)
          throw new RangeError("Multiple content holes");
        l = m;
      }
    }
  }
  return { dom: a, contentDOM: l };
}
const Lm = 65535, Pm = Math.pow(2, 16);
function Hx(t, e) {
  return t + e * Pm;
}
function Gd(t) {
  return t & Lm;
}
function jx(t) {
  return (t - (t & Lm)) / Pm;
}
const zm = 1, Bm = 2, Qs = 4, Fm = 8;
class gc {
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
    return (this.delInfo & Fm) > 0;
  }
  /**
  Tells you whether the token before the mapped position was deleted.
  */
  get deletedBefore() {
    return (this.delInfo & (zm | Qs)) > 0;
  }
  /**
  True when the token after the mapped position was deleted.
  */
  get deletedAfter() {
    return (this.delInfo & (Bm | Qs)) > 0;
  }
  /**
  Tells whether any of the steps mapped through deletes across the
  position (including both the token before and after the
  position).
  */
  get deletedAcross() {
    return (this.delInfo & Qs) > 0;
  }
}
class At {
  /**
  Create a position map. The modifications to the document are
  represented as an array of numbers, in which each group of three
  represents a modified chunk as `[start, oldSize, newSize]`.
  */
  constructor(e, n = !1) {
    if (this.ranges = e, this.inverted = n, !e.length && At.empty)
      return At.empty;
  }
  /**
  @internal
  */
  recover(e) {
    let n = 0, r = Gd(e);
    if (!this.inverted)
      for (let i = 0; i < r; i++)
        n += this.ranges[i * 3 + 2] - this.ranges[i * 3 + 1];
    return this.ranges[r * 3] + n + jx(e);
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
      let c = this.ranges[l + o], u = this.ranges[l + s], f = a + c;
      if (e <= f) {
        let d = c ? e == a ? -1 : e == f ? 1 : n : n, h = a + i + (d < 0 ? 0 : u);
        if (r)
          return h;
        let m = e == (n < 0 ? a : f) ? null : Hx(l / 3, e - a), b = e == a ? Bm : e == f ? zm : Qs;
        return (n < 0 ? e != a : e != f) && (b |= Fm), new gc(h, b, m);
      }
      i += u - c;
    }
    return r ? e + i : new gc(e + i, 0, null);
  }
  /**
  @internal
  */
  touches(e, n) {
    let r = 0, i = Gd(n), o = this.inverted ? 2 : 1, s = this.inverted ? 1 : 2;
    for (let l = 0; l < this.ranges.length; l += 3) {
      let a = this.ranges[l] - (this.inverted ? r : 0);
      if (a > e)
        break;
      let c = this.ranges[l + o], u = a + c;
      if (e <= u && l == i * 3)
        return !0;
      r += this.ranges[l + s] - c;
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
      let s = this.ranges[i], l = s - (this.inverted ? o : 0), a = s + (this.inverted ? 0 : o), c = this.ranges[i + n], u = this.ranges[i + r];
      e(l, l + c, a, a + u), o += u - c;
    }
  }
  /**
  Create an inverted version of this map. The result can be used to
  map positions in the post-step document to the pre-step document.
  */
  invert() {
    return new At(this.ranges, !this.inverted);
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
    return e == 0 ? At.empty : new At(e < 0 ? [0, -e, 0] : [0, 0, e]);
  }
}
At.empty = new At([]);
class $o {
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
    return new $o(this._maps, this.mirror, e, n);
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
    let e = new $o();
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
    return r ? e : new gc(e, i, null);
  }
}
const ma = /* @__PURE__ */ Object.create(null);
class ot {
  /**
  Get the step map that represents the changes made by this step,
  and which can be used to transform between positions in the old
  and the new document.
  */
  getMap() {
    return At.empty;
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
    let r = ma[n.stepType];
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
    if (e in ma)
      throw new RangeError("Duplicate use of step JSON ID " + e);
    return ma[e] = n, n.prototype.jsonID = e, n;
  }
}
class $e {
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
    return new $e(e, null);
  }
  /**
  Create a failed step result.
  */
  static fail(e) {
    return new $e(null, e);
  }
  /**
  Call [`Node.replace`](https://prosemirror.net/docs/ref/#model.Node.replace) with the given
  arguments. Create a successful result if it succeeds, and a
  failed one if it throws a `ReplaceError`.
  */
  static fromReplace(e, n, r, i) {
    try {
      return $e.ok(e.replace(n, r, i));
    } catch (o) {
      if (o instanceof pl)
        return $e.fail(o.message);
      throw o;
    }
  }
}
function iu(t, e, n) {
  let r = [];
  for (let i = 0; i < t.childCount; i++) {
    let o = t.child(i);
    o.content.size && (o = o.copy(iu(o.content, e, o))), o.isInline && (o = e(o, n, i)), r.push(o);
  }
  return z.fromArray(r);
}
class In extends ot {
  /**
  Create a mark step.
  */
  constructor(e, n, r) {
    super(), this.from = e, this.to = n, this.mark = r;
  }
  apply(e) {
    let n = e.slice(this.from, this.to), r = e.resolve(this.from), i = r.node(r.sharedDepth(this.to)), o = new H(iu(n.content, (s, l) => !s.isAtom || !l.type.allowsMarkType(this.mark.type) ? s : s.mark(this.mark.addToSet(s.marks)), i), n.openStart, n.openEnd);
    return $e.fromReplace(e, this.from, this.to, o);
  }
  invert() {
    return new on(this.from, this.to, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
    return n.deleted && r.deleted || n.pos >= r.pos ? null : new In(n.pos, r.pos, this.mark);
  }
  merge(e) {
    return e instanceof In && e.mark.eq(this.mark) && this.from <= e.to && this.to >= e.from ? new In(Math.min(this.from, e.from), Math.max(this.to, e.to), this.mark) : null;
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
    return new In(n.from, n.to, e.markFromJSON(n.mark));
  }
}
ot.jsonID("addMark", In);
class on extends ot {
  /**
  Create a mark-removing step.
  */
  constructor(e, n, r) {
    super(), this.from = e, this.to = n, this.mark = r;
  }
  apply(e) {
    let n = e.slice(this.from, this.to), r = new H(iu(n.content, (i) => i.mark(this.mark.removeFromSet(i.marks)), e), n.openStart, n.openEnd);
    return $e.fromReplace(e, this.from, this.to, r);
  }
  invert() {
    return new In(this.from, this.to, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
    return n.deleted && r.deleted || n.pos >= r.pos ? null : new on(n.pos, r.pos, this.mark);
  }
  merge(e) {
    return e instanceof on && e.mark.eq(this.mark) && this.from <= e.to && this.to >= e.from ? new on(Math.min(this.from, e.from), Math.max(this.to, e.to), this.mark) : null;
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
    return new on(n.from, n.to, e.markFromJSON(n.mark));
  }
}
ot.jsonID("removeMark", on);
class sr extends ot {
  /**
  Create a node mark step.
  */
  constructor(e, n) {
    super(), this.pos = e, this.mark = n;
  }
  apply(e) {
    let n = e.nodeAt(this.pos);
    if (!n)
      return $e.fail("No node at mark step's position");
    let r = n.type.create(n.attrs, null, this.mark.addToSet(n.marks));
    return $e.fromReplace(e, this.pos, this.pos + 1, new H(z.from(r), 0, n.isLeaf ? 0 : 1));
  }
  invert(e) {
    let n = e.nodeAt(this.pos);
    if (n) {
      let r = this.mark.addToSet(n.marks);
      if (r.length == n.marks.length) {
        for (let i = 0; i < n.marks.length; i++)
          if (!n.marks[i].isInSet(r))
            return new sr(this.pos, n.marks[i]);
        return new sr(this.pos, this.mark);
      }
    }
    return new Yr(this.pos, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.pos, 1);
    return n.deletedAfter ? null : new sr(n.pos, this.mark);
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
    return new sr(n.pos, e.markFromJSON(n.mark));
  }
}
ot.jsonID("addNodeMark", sr);
class Yr extends ot {
  /**
  Create a mark-removing step.
  */
  constructor(e, n) {
    super(), this.pos = e, this.mark = n;
  }
  apply(e) {
    let n = e.nodeAt(this.pos);
    if (!n)
      return $e.fail("No node at mark step's position");
    let r = n.type.create(n.attrs, null, this.mark.removeFromSet(n.marks));
    return $e.fromReplace(e, this.pos, this.pos + 1, new H(z.from(r), 0, n.isLeaf ? 0 : 1));
  }
  invert(e) {
    let n = e.nodeAt(this.pos);
    return !n || !this.mark.isInSet(n.marks) ? this : new sr(this.pos, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.pos, 1);
    return n.deletedAfter ? null : new Yr(n.pos, this.mark);
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
    return new Yr(n.pos, e.markFromJSON(n.mark));
  }
}
ot.jsonID("removeNodeMark", Yr);
class Fe extends ot {
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
    return this.structure && yc(e, this.from, this.to) ? $e.fail("Structure replace would overwrite content") : $e.fromReplace(e, this.from, this.to, this.slice);
  }
  getMap() {
    return new At([this.from, this.to - this.from, this.slice.size]);
  }
  invert(e) {
    return new Fe(this.from, this.from + this.slice.size, e.slice(this.from, this.to));
  }
  map(e) {
    let n = e.mapResult(this.to, -1), r = this.from == this.to && Fe.MAP_BIAS < 0 ? n : e.mapResult(this.from, 1);
    return r.deletedAcross && n.deletedAcross ? null : new Fe(r.pos, Math.max(r.pos, n.pos), this.slice, this.structure);
  }
  merge(e) {
    if (!(e instanceof Fe) || e.structure || this.structure)
      return null;
    if (this.from + this.slice.size == e.from && !this.slice.openEnd && !e.slice.openStart) {
      let n = this.slice.size + e.slice.size == 0 ? H.empty : new H(this.slice.content.append(e.slice.content), this.slice.openStart, e.slice.openEnd);
      return new Fe(this.from, this.to + (e.to - e.from), n, this.structure);
    } else if (e.to == this.from && !this.slice.openStart && !e.slice.openEnd) {
      let n = this.slice.size + e.slice.size == 0 ? H.empty : new H(e.slice.content.append(this.slice.content), e.slice.openStart, this.slice.openEnd);
      return new Fe(e.from, this.to, n, this.structure);
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
    return new Fe(n.from, n.to, H.fromJSON(e, n.slice), !!n.structure);
  }
}
Fe.MAP_BIAS = 1;
ot.jsonID("replace", Fe);
class rt extends ot {
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
    if (this.structure && (yc(e, this.from, this.gapFrom) || yc(e, this.gapTo, this.to)))
      return $e.fail("Structure gap-replace would overwrite content");
    let n = e.slice(this.gapFrom, this.gapTo);
    if (n.openStart || n.openEnd)
      return $e.fail("Gap is not a flat range");
    let r = this.slice.insertAt(this.insert, n.content);
    return r ? $e.fromReplace(e, this.from, this.to, r) : $e.fail("Content does not fit in gap");
  }
  getMap() {
    return new At([
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
    return new rt(this.from, this.from + this.slice.size + n, this.from + this.insert, this.from + this.insert + n, e.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
  }
  map(e) {
    let n = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1), i = this.from == this.gapFrom ? n.pos : e.map(this.gapFrom, -1), o = this.to == this.gapTo ? r.pos : e.map(this.gapTo, 1);
    return n.deletedAcross && r.deletedAcross || i < n.pos || o > r.pos ? null : new rt(n.pos, r.pos, i, o, this.slice, this.insert, this.structure);
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
    return new rt(n.from, n.to, n.gapFrom, n.gapTo, H.fromJSON(e, n.slice), n.insert, !!n.structure);
  }
}
ot.jsonID("replaceAround", rt);
function yc(t, e, n) {
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
function Wx(t, e, n, r) {
  let i = [], o = [], s, l;
  t.doc.nodesBetween(e, n, (a, c, u) => {
    if (!a.isInline)
      return;
    let f = a.marks;
    if (!r.isInSet(f) && u.type.allowsMarkType(r.type)) {
      let d = Math.max(c, e), h = Math.min(c + a.nodeSize, n), m = r.addToSet(f);
      for (let b = 0; b < f.length; b++)
        f[b].isInSet(m) || (s && s.to == d && s.mark.eq(f[b]) ? s.to = h : i.push(s = new on(d, h, f[b])));
      l && l.to == d ? l.to = h : o.push(l = new In(d, h, r));
    }
  }), i.forEach((a) => t.step(a)), o.forEach((a) => t.step(a));
}
function qx(t, e, n, r) {
  let i = [], o = 0;
  t.doc.nodesBetween(e, n, (s, l) => {
    if (!s.isInline)
      return;
    o++;
    let a = null;
    if (r instanceof zl) {
      let c = s.marks, u;
      for (; u = r.isInSet(c); )
        (a || (a = [])).push(u), c = u.removeFromSet(c);
    } else r ? r.isInSet(s.marks) && (a = [r]) : a = s.marks;
    if (a && a.length) {
      let c = Math.min(l + s.nodeSize, n);
      for (let u = 0; u < a.length; u++) {
        let f = a[u], d;
        for (let h = 0; h < i.length; h++) {
          let m = i[h];
          m.step == o - 1 && f.eq(i[h].style) && (d = m);
        }
        d ? (d.to = c, d.step = o) : i.push({ style: f, from: Math.max(l, e), to: c, step: o });
      }
    }
  }), i.forEach((s) => t.step(new on(s.from, s.to, s.style)));
}
function ou(t, e, n, r = n.contentMatch, i = !0) {
  let o = t.doc.nodeAt(e), s = [], l = e + 1;
  for (let a = 0; a < o.childCount; a++) {
    let c = o.child(a), u = l + c.nodeSize, f = r.matchType(c.type);
    if (!f)
      s.push(new Fe(l, u, H.empty));
    else {
      r = f;
      for (let d = 0; d < c.marks.length; d++)
        n.allowsMarkType(c.marks[d].type) || t.step(new on(l, u, c.marks[d]));
      if (i && c.isText && n.whitespace != "pre") {
        let d, h = /\r?\n|\r/g, m;
        for (; d = h.exec(c.text); )
          m || (m = new H(z.from(n.schema.text(" ", n.allowedMarks(c.marks))), 0, 0)), s.push(new Fe(l + d.index, l + d.index + d[0].length, m));
      }
    }
    l = u;
  }
  if (!r.validEnd) {
    let a = r.fillBefore(z.empty, !0);
    t.replace(l, l, new H(a, 0, 0));
  }
  for (let a = s.length - 1; a >= 0; a--)
    t.step(s[a]);
}
function Kx(t, e, n) {
  return (e == 0 || t.canReplace(e, t.childCount)) && (n == t.childCount || t.canReplace(0, n));
}
function Bl(t) {
  let n = t.parent.content.cutByIndex(t.startIndex, t.endIndex);
  for (let r = t.depth, i = 0, o = 0; ; --r) {
    let s = t.$from.node(r), l = t.$from.index(r) + i, a = t.$to.indexAfter(r) - o;
    if (r < t.depth && s.canReplace(l, a, n))
      return r;
    if (r == 0 || s.type.spec.isolating || !Kx(s, l, a))
      break;
    l && (i = 1), a < s.childCount && (o = 1);
  }
  return null;
}
function Ux(t, e, n) {
  let { $from: r, $to: i, depth: o } = e, s = r.before(o + 1), l = i.after(o + 1), a = s, c = l, u = z.empty, f = 0;
  for (let m = o, b = !1; m > n; m--)
    b || r.index(m) > 0 ? (b = !0, u = z.from(r.node(m).copy(u)), f++) : a--;
  let d = z.empty, h = 0;
  for (let m = o, b = !1; m > n; m--)
    b || i.after(m + 1) < i.end(m) ? (b = !0, d = z.from(i.node(m).copy(d)), h++) : c++;
  t.step(new rt(a, c, s, l, new H(u.append(d), f, h), u.size - f, !0));
}
function su(t, e, n = null, r = t) {
  let i = Jx(t, e), o = i && Gx(r, e);
  return o ? i.map(Yd).concat({ type: e, attrs: n }).concat(o.map(Yd)) : null;
}
function Yd(t) {
  return { type: t, attrs: null };
}
function Jx(t, e) {
  let { parent: n, startIndex: r, endIndex: i } = t, o = n.contentMatchAt(r).findWrapping(e);
  if (!o)
    return null;
  let s = o.length ? o[0] : e;
  return n.canReplaceWith(r, i, s) ? o : null;
}
function Gx(t, e) {
  let { parent: n, startIndex: r, endIndex: i } = t, o = n.child(r), s = e.contentMatch.findWrapping(o.type);
  if (!s)
    return null;
  let a = (s.length ? s[s.length - 1] : e).contentMatch;
  for (let c = r; a && c < i; c++)
    a = a.matchType(n.child(c).type);
  return !a || !a.validEnd ? null : s;
}
function Yx(t, e, n) {
  let r = z.empty;
  for (let s = n.length - 1; s >= 0; s--) {
    if (r.size) {
      let l = n[s].type.contentMatch.matchFragment(r);
      if (!l || !l.validEnd)
        throw new RangeError("Wrapper type given to Transform.wrap does not form valid content of its parent wrapper");
    }
    r = z.from(n[s].type.create(n[s].attrs, r));
  }
  let i = e.start, o = e.end;
  t.step(new rt(i, o, i, o, new H(r, 0, 0), n.length, !0));
}
function Xx(t, e, n, r, i) {
  if (!r.isTextblock)
    throw new RangeError("Type given to setBlockType should be a textblock");
  let o = t.steps.length;
  t.doc.nodesBetween(e, n, (s, l) => {
    let a = typeof i == "function" ? i(s) : i;
    if (s.isTextblock && !s.hasMarkup(r, a) && Qx(t.doc, t.mapping.slice(o).map(l), r)) {
      let c = null;
      if (r.schema.linebreakReplacement) {
        let h = r.whitespace == "pre", m = !!r.contentMatch.matchType(r.schema.linebreakReplacement);
        h && !m ? c = !1 : !h && m && (c = !0);
      }
      c === !1 && _m(t, s, l, o), ou(t, t.mapping.slice(o).map(l, 1), r, void 0, c === null);
      let u = t.mapping.slice(o), f = u.map(l, 1), d = u.map(l + s.nodeSize, 1);
      return t.step(new rt(f, d, f + 1, d - 1, new H(z.from(r.create(a, null, s.marks)), 0, 0), 1, !0)), c === !0 && $m(t, s, l, o), !1;
    }
  });
}
function $m(t, e, n, r) {
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
function _m(t, e, n, r) {
  e.forEach((i, o) => {
    if (i.type == i.type.schema.linebreakReplacement) {
      let s = t.mapping.slice(r).map(n + 1 + o);
      t.replaceWith(s, s + 1, e.type.schema.text(`
`));
    }
  });
}
function Qx(t, e, n) {
  let r = t.resolve(e), i = r.index();
  return r.parent.canReplaceWith(i, i + 1, n);
}
function Zx(t, e, n, r, i) {
  let o = t.doc.nodeAt(e);
  if (!o)
    throw new RangeError("No node at given position");
  n || (n = o.type);
  let s = n.create(r, null, i || o.marks);
  if (o.isLeaf)
    return t.replaceWith(e, e + o.nodeSize, s);
  if (!n.validContent(o.content))
    throw new RangeError("Invalid content for node type " + n.name);
  t.step(new rt(e, e + o.nodeSize, e + 1, e + o.nodeSize - 1, new H(z.from(s), 0, 0), 1, !0));
}
function Mo(t, e, n = 1, r) {
  let i = t.resolve(e), o = i.depth - n, s = r && r[r.length - 1] || i.parent;
  if (o < 0 || i.parent.type.spec.isolating || !i.parent.canReplace(i.index(), i.parent.childCount) || !s.type.validContent(i.parent.content.cutByIndex(i.index(), i.parent.childCount)))
    return !1;
  for (let c = i.depth - 1, u = n - 2; c > o; c--, u--) {
    let f = i.node(c), d = i.index(c);
    if (f.type.spec.isolating)
      return !1;
    let h = f.content.cutByIndex(d, f.childCount), m = r && r[u + 1];
    m && (h = h.replaceChild(0, m.type.create(m.attrs)));
    let b = r && r[u] || f;
    if (!f.canReplace(d + 1, f.childCount) || !b.type.validContent(h))
      return !1;
  }
  let l = i.indexAfter(o), a = r && r[0];
  return i.node(o).canReplaceWith(l, l, a ? a.type : i.node(o + 1).type);
}
function eC(t, e, n = 1, r) {
  let i = t.doc.resolve(e), o = z.empty, s = z.empty;
  for (let l = i.depth, a = i.depth - n, c = n - 1; l > a; l--, c--) {
    o = z.from(i.node(l).copy(o));
    let u = r && r[c];
    s = z.from(u ? u.type.create(u.attrs, s) : i.node(l).copy(s));
  }
  t.step(new Fe(e, e, new H(o.append(s), n, n), !0));
}
function Fl(t, e) {
  let n = t.resolve(e), r = n.index();
  return nC(n.nodeBefore, n.nodeAfter) && n.parent.canReplace(r, r + 1);
}
function tC(t, e) {
  e.content.size || t.type.compatibleContent(e.type);
  let n = t.contentMatchAt(t.childCount), { linebreakReplacement: r } = t.type.schema;
  for (let i = 0; i < e.childCount; i++) {
    let o = e.child(i), s = o.type == r ? t.type.schema.nodes.text : o.type;
    if (n = n.matchType(s), !n || !t.type.allowsMarks(o.marks))
      return !1;
  }
  return n.validEnd;
}
function nC(t, e) {
  return !!(t && e && !t.isLeaf && tC(t, e));
}
function rC(t, e, n) {
  let r = null, { linebreakReplacement: i } = t.doc.type.schema, o = t.doc.resolve(e - n), s = o.node().type;
  if (i && s.inlineContent) {
    let u = s.whitespace == "pre", f = !!s.contentMatch.matchType(i);
    u && !f ? r = !1 : !u && f && (r = !0);
  }
  let l = t.steps.length;
  if (r === !1) {
    let u = t.doc.resolve(e + n);
    _m(t, u.node(), u.before(), l);
  }
  s.inlineContent && ou(t, e + n - 1, s, o.node().contentMatchAt(o.index()), r == null);
  let a = t.mapping.slice(l), c = a.map(e - n);
  if (t.step(new Fe(c, a.map(e + n, -1), H.empty, !0)), r === !0) {
    let u = t.doc.resolve(c);
    $m(t, u.node(), u.before(), t.steps.length);
  }
  return t;
}
function iC(t, e, n) {
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
function oC(t, e, n) {
  let r = t.resolve(e);
  if (!n.content.size)
    return e;
  let i = n.content;
  for (let o = 0; o < n.openStart; o++)
    i = i.firstChild.content;
  for (let o = 1; o <= (n.openStart == 0 && n.size ? 2 : 1); o++)
    for (let s = r.depth; s >= 0; s--) {
      let l = s == r.depth ? 0 : r.pos <= (r.start(s + 1) + r.end(s + 1)) / 2 ? -1 : 1, a = r.index(s) + (l > 0 ? 1 : 0), c = r.node(s), u = !1;
      if (o == 1)
        u = c.canReplace(a, a, i);
      else {
        let f = c.contentMatchAt(a).findWrapping(i.firstChild.type);
        u = f && c.canReplaceWith(a, a, f[0]);
      }
      if (u)
        return l == 0 ? r.pos : l < 0 ? r.before(s + 1) : r.after(s + 1);
    }
  return null;
}
function $l(t, e, n = e, r = H.empty) {
  if (e == n && !r.size)
    return null;
  let i = t.resolve(e), o = t.resolve(n);
  return Vm(i, o, r) ? new Fe(e, n, r) : new sC(i, o, r).fit();
}
function Vm(t, e, n) {
  return !n.openStart && !n.openEnd && t.start() == e.start() && t.parent.canReplace(t.index(), e.index(), n.content);
}
class sC {
  constructor(e, n, r) {
    this.$from = e, this.$to = n, this.unplaced = r, this.frontier = [], this.placed = z.empty;
    for (let i = 0; i <= e.depth; i++) {
      let o = e.node(i);
      this.frontier.push({
        type: o.type,
        match: o.contentMatchAt(e.indexAfter(i))
      });
    }
    for (let i = e.depth; i > 0; i--)
      this.placed = z.from(e.node(i).copy(this.placed));
  }
  get depth() {
    return this.frontier.length - 1;
  }
  fit() {
    for (; this.unplaced.size; ) {
      let c = this.findFittable();
      c ? this.placeNodes(c) : this.openMore() || this.dropNode();
    }
    let e = this.mustMoveInline(), n = this.placed.size - this.depth - this.$from.depth, r = this.$from, i = this.close(e < 0 ? this.$to : r.doc.resolve(e));
    if (!i)
      return null;
    let o = this.placed, s = r.depth, l = i.depth;
    for (; s && l && o.childCount == 1; )
      o = o.firstChild.content, s--, l--;
    let a = new H(o, s, l);
    return e > -1 ? new rt(r.pos, e, this.$to.pos, this.$to.end(), a, n) : a.size || r.pos != this.$to.pos ? new Fe(r.pos, i.pos, a) : null;
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
        r ? (o = ga(this.unplaced.content, r - 1).firstChild, i = o.content) : i = this.unplaced.content;
        let s = i.firstChild;
        for (let l = this.depth; l >= 0; l--) {
          let { type: a, match: c } = this.frontier[l], u, f = null;
          if (n == 1 && (s ? c.matchType(s.type) || (f = c.fillBefore(z.from(s), !1)) : o && a.compatibleContent(o.type)))
            return { sliceDepth: r, frontierDepth: l, parent: o, inject: f };
          if (n == 2 && s && (u = c.findWrapping(s.type)))
            return { sliceDepth: r, frontierDepth: l, parent: o, wrap: u };
          if (o && c.matchType(o.type))
            break;
        }
      }
  }
  openMore() {
    let { content: e, openStart: n, openEnd: r } = this.unplaced, i = ga(e, n);
    return !i.childCount || i.firstChild.isLeaf ? !1 : (this.unplaced = new H(e, n + 1, Math.max(r, i.size + n >= e.size - r ? n + 1 : 0)), !0);
  }
  dropNode() {
    let { content: e, openStart: n, openEnd: r } = this.unplaced, i = ga(e, n);
    if (i.childCount <= 1 && n > 0) {
      let o = e.size - n <= n + i.size;
      this.unplaced = new H(yo(e, n - 1, 1), n - 1, o ? n - 1 : r);
    } else
      this.unplaced = new H(yo(e, n, 1), n, r);
  }
  // Move content from the unplaced slice at `sliceDepth` to the
  // frontier node at `frontierDepth`. Close that frontier node when
  // applicable.
  placeNodes({ sliceDepth: e, frontierDepth: n, parent: r, inject: i, wrap: o }) {
    for (; this.depth > n; )
      this.closeFrontierNode();
    if (o)
      for (let b = 0; b < o.length; b++)
        this.openFrontierNode(o[b]);
    let s = this.unplaced, l = r ? r.content : s.content, a = s.openStart - e, c = 0, u = [], { match: f, type: d } = this.frontier[n];
    if (i) {
      for (let b = 0; b < i.childCount; b++)
        u.push(i.child(b));
      f = f.matchFragment(i);
    }
    let h = l.size + e - (s.content.size - s.openEnd);
    for (; c < l.childCount; ) {
      let b = l.child(c), C = f.matchType(b.type);
      if (!C)
        break;
      c++, (c > 1 || a == 0 || b.content.size) && (f = C, u.push(Hm(b.mark(d.allowedMarks(b.marks)), c == 1 ? a : 0, c == l.childCount ? h : -1)));
    }
    let m = c == l.childCount;
    m || (h = -1), this.placed = ko(this.placed, n, z.from(u)), this.frontier[n].match = f, m && h < 0 && r && r.type == this.frontier[this.depth].type && this.frontier.length > 1 && this.closeFrontierNode();
    for (let b = 0, C = l; b < h; b++) {
      let x = C.lastChild;
      this.frontier.push({ type: x.type, match: x.contentMatchAt(x.childCount) }), C = x.content;
    }
    this.unplaced = m ? e == 0 ? H.empty : new H(yo(s.content, e - 1, 1), e - 1, h < 0 ? s.openEnd : e - 1) : new H(yo(s.content, e, c), s.openStart, s.openEnd);
  }
  mustMoveInline() {
    if (!this.$to.parent.isTextblock)
      return -1;
    let e = this.frontier[this.depth], n;
    if (!e.type.isTextblock || !ya(this.$to, this.$to.depth, e.type, e.match, !1) || this.$to.depth == this.depth && (n = this.findCloseLevel(this.$to)) && n.depth == this.depth)
      return -1;
    let { depth: r } = this.$to, i = this.$to.after(r);
    for (; r > 1 && i == this.$to.end(--r); )
      ++i;
    return i;
  }
  findCloseLevel(e) {
    e: for (let n = Math.min(this.depth, e.depth); n >= 0; n--) {
      let { match: r, type: i } = this.frontier[n], o = n < e.depth && e.end(n + 1) == e.pos + (e.depth - (n + 1)), s = ya(e, n, i, r, o);
      if (s) {
        for (let l = n - 1; l >= 0; l--) {
          let { match: a, type: c } = this.frontier[l], u = ya(e, l, c, a, !0);
          if (!u || u.childCount)
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
    n.fit.childCount && (this.placed = ko(this.placed, n.depth, n.fit)), e = n.move;
    for (let r = n.depth + 1; r <= e.depth; r++) {
      let i = e.node(r), o = i.type.contentMatch.fillBefore(i.content, !0, e.index(r));
      this.openFrontierNode(i.type, i.attrs, o);
    }
    return e;
  }
  openFrontierNode(e, n = null, r) {
    let i = this.frontier[this.depth];
    i.match = i.match.matchType(e), this.placed = ko(this.placed, this.depth, z.from(e.create(n, r))), this.frontier.push({ type: e, match: e.contentMatch });
  }
  closeFrontierNode() {
    let n = this.frontier.pop().match.fillBefore(z.empty, !0);
    n.childCount && (this.placed = ko(this.placed, this.frontier.length, n));
  }
}
function yo(t, e, n) {
  return e == 0 ? t.cutByIndex(n, t.childCount) : t.replaceChild(0, t.firstChild.copy(yo(t.firstChild.content, e - 1, n)));
}
function ko(t, e, n) {
  return e == 0 ? t.append(n) : t.replaceChild(t.childCount - 1, t.lastChild.copy(ko(t.lastChild.content, e - 1, n)));
}
function ga(t, e) {
  for (let n = 0; n < e; n++)
    t = t.firstChild.content;
  return t;
}
function Hm(t, e, n) {
  if (e <= 0)
    return t;
  let r = t.content;
  return e > 1 && (r = r.replaceChild(0, Hm(r.firstChild, e - 1, r.childCount == 1 ? n - 1 : 0))), e > 0 && (r = t.type.contentMatch.fillBefore(r).append(r), n <= 0 && (r = r.append(t.type.contentMatch.matchFragment(r).fillBefore(z.empty, !0)))), t.copy(r);
}
function ya(t, e, n, r, i) {
  let o = t.node(e), s = i ? t.indexAfter(e) : t.index(e);
  if (s == o.childCount && !n.compatibleContent(o.type))
    return null;
  let l = r.fillBefore(o.content, !0, s);
  return l && !lC(n, o.content, s) ? l : null;
}
function lC(t, e, n) {
  for (let r = n; r < e.childCount; r++)
    if (!t.allowsMarks(e.child(r).marks))
      return !0;
  return !1;
}
function aC(t) {
  return t.spec.defining || t.spec.definingForContent;
}
function cC(t, e, n, r) {
  if (!r.size)
    return t.deleteRange(e, n);
  let i = t.doc.resolve(e), o = t.doc.resolve(n);
  if (Vm(i, o, r))
    return t.step(new Fe(e, n, r));
  let s = Wm(i, o);
  s[s.length - 1] == 0 && s.pop();
  let l = -(i.depth + 1);
  s.unshift(l);
  for (let d = i.depth, h = i.pos - 1; d > 0; d--, h--) {
    let m = i.node(d).type.spec;
    if (m.defining || m.definingAsContext || m.isolating)
      break;
    s.indexOf(d) > -1 ? l = d : i.before(d) == h && s.splice(1, 0, -d);
  }
  let a = s.indexOf(l), c = [], u = r.openStart;
  for (let d = r.content, h = 0; ; h++) {
    let m = d.firstChild;
    if (c.push(m), h == r.openStart)
      break;
    d = m.content;
  }
  for (let d = u - 1; d >= 0; d--) {
    let h = c[d], m = aC(h.type);
    if (m && !h.sameMarkup(i.node(Math.abs(l) - 1)))
      u = d;
    else if (m || !h.type.isTextblock)
      break;
  }
  for (let d = r.openStart; d >= 0; d--) {
    let h = (d + u + 1) % (r.openStart + 1), m = c[h];
    if (m)
      for (let b = 0; b < s.length; b++) {
        let C = s[(b + a) % s.length], x = !0;
        C < 0 && (x = !1, C = -C);
        let L = i.node(C - 1), I = i.index(C - 1);
        if (L.canReplaceWith(I, I, m.type, m.marks))
          return t.replace(i.before(C), x ? o.after(C) : n, new H(jm(r.content, 0, r.openStart, h), h, r.openEnd));
      }
  }
  let f = t.steps.length;
  for (let d = s.length - 1; d >= 0 && (t.replace(e, n, r), !(t.steps.length > f)); d--) {
    let h = s[d];
    h < 0 || (e = i.before(h), n = o.after(h));
  }
}
function jm(t, e, n, r, i) {
  if (e < n) {
    let o = t.firstChild;
    t = t.replaceChild(0, o.copy(jm(o.content, e + 1, n, r, o)));
  }
  if (e > r) {
    let o = i.contentMatchAt(0), s = o.fillBefore(t).append(t);
    t = s.append(o.matchFragment(s).fillBefore(z.empty, !0));
  }
  return t;
}
function uC(t, e, n, r) {
  if (!r.isInline && e == n && t.doc.resolve(e).parent.content.size) {
    let i = iC(t.doc, e, r.type);
    i != null && (e = n = i);
  }
  t.replaceRange(e, n, new H(z.from(r), 0, 0));
}
function fC(t, e, n) {
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
  let o = Wm(r, i);
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
function Wm(t, e) {
  let n = [], r = Math.min(t.depth, e.depth);
  for (let i = r; i >= 0; i--) {
    let o = t.start(i);
    if (o < t.pos - (t.depth - i) || e.end(i) > e.pos + (e.depth - i) || t.node(i).type.spec.isolating || e.node(i).type.spec.isolating)
      break;
    (o == e.start(i) || i == t.depth && i == e.depth && t.parent.inlineContent && e.parent.inlineContent && i && e.start(i - 1) == o - 1) && n.push(i);
  }
  return n;
}
class bi extends ot {
  /**
  Construct an attribute step.
  */
  constructor(e, n, r) {
    super(), this.pos = e, this.attr = n, this.value = r;
  }
  apply(e) {
    let n = e.nodeAt(this.pos);
    if (!n)
      return $e.fail("No node at attribute step's position");
    let r = /* @__PURE__ */ Object.create(null);
    for (let o in n.attrs)
      r[o] = n.attrs[o];
    r[this.attr] = this.value;
    let i = n.type.create(r, null, n.marks);
    return $e.fromReplace(e, this.pos, this.pos + 1, new H(z.from(i), 0, n.isLeaf ? 0 : 1));
  }
  getMap() {
    return At.empty;
  }
  invert(e) {
    return new bi(this.pos, this.attr, e.nodeAt(this.pos).attrs[this.attr]);
  }
  map(e) {
    let n = e.mapResult(this.pos, 1);
    return n.deletedAfter ? null : new bi(n.pos, this.attr, this.value);
  }
  toJSON() {
    return { stepType: "attr", pos: this.pos, attr: this.attr, value: this.value };
  }
  static fromJSON(e, n) {
    if (typeof n.pos != "number" || typeof n.attr != "string")
      throw new RangeError("Invalid input for AttrStep.fromJSON");
    return new bi(n.pos, n.attr, n.value);
  }
}
ot.jsonID("attr", bi);
class _o extends ot {
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
    return $e.ok(r);
  }
  getMap() {
    return At.empty;
  }
  invert(e) {
    return new _o(this.attr, e.attrs[this.attr]);
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
    return new _o(n.attr, n.value);
  }
}
ot.jsonID("docAttr", _o);
let ji = class extends Error {
};
ji = function t(e) {
  let n = Error.call(this, e);
  return n.__proto__ = t.prototype, n;
};
ji.prototype = Object.create(Error.prototype);
ji.prototype.constructor = ji;
ji.prototype.name = "TransformError";
class qm {
  /**
  Create a transform that starts with the given document.
  */
  constructor(e) {
    this.doc = e, this.steps = [], this.docs = [], this.mapping = new $o();
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
      throw new ji(n.failed);
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
  replace(e, n = e, r = H.empty) {
    let i = $l(this.doc, e, n, r);
    return i && this.step(i), this;
  }
  /**
  Replace the given range with the given content, which may be a
  fragment, node, or array of nodes.
  */
  replaceWith(e, n, r) {
    return this.replace(e, n, new H(z.from(r), 0, 0));
  }
  /**
  Delete the content between the given positions.
  */
  delete(e, n) {
    return this.replace(e, n, H.empty);
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
    return cC(this, e, n, r), this;
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
    return uC(this, e, n, r), this;
  }
  /**
  Delete the given range, expanding it to cover fully covered
  parent nodes until a valid replace is found.
  */
  deleteRange(e, n) {
    return fC(this, e, n), this;
  }
  /**
  Split the content in the given range off from its parent, if there
  is sibling content before or after it, and move it up the tree to
  the depth specified by `target`. You'll probably want to use
  [`liftTarget`](https://prosemirror.net/docs/ref/#transform.liftTarget) to compute `target`, to make
  sure the lift is valid.
  */
  lift(e, n) {
    return Ux(this, e, n), this;
  }
  /**
  Join the blocks around the given position. If depth is 2, their
  last and first siblings are also joined, and so on.
  */
  join(e, n = 1) {
    return rC(this, e, n), this;
  }
  /**
  Wrap the given [range](https://prosemirror.net/docs/ref/#model.NodeRange) in the given set of wrappers.
  The wrappers are assumed to be valid in this position, and should
  probably be computed with [`findWrapping`](https://prosemirror.net/docs/ref/#transform.findWrapping).
  */
  wrap(e, n) {
    return Yx(this, e, n), this;
  }
  /**
  Set the type of all textblocks (partly) between `from` and `to` to
  the given node type with the given attributes.
  */
  setBlockType(e, n = e, r, i = null) {
    return Xx(this, e, n, r, i), this;
  }
  /**
  Change the type, attributes, and/or marks of the node at `pos`.
  When `type` isn't given, the existing node type is preserved,
  */
  setNodeMarkup(e, n, r = null, i) {
    return Zx(this, e, n, r, i), this;
  }
  /**
  Set a single attribute on a given node to a new value.
  The `pos` addresses the document content. Use `setDocAttribute`
  to set attributes on the document itself.
  */
  setNodeAttribute(e, n, r) {
    return this.step(new bi(e, n, r)), this;
  }
  /**
  Set a single attribute on the document to a new value.
  */
  setDocAttribute(e, n) {
    return this.step(new _o(e, n)), this;
  }
  /**
  Add a mark to the node at position `pos`.
  */
  addNodeMark(e, n) {
    return this.step(new sr(e, n)), this;
  }
  /**
  Remove a mark (or all marks of the given type) from the node at
  position `pos`.
  */
  removeNodeMark(e, n) {
    let r = this.doc.nodeAt(e);
    if (!r)
      throw new RangeError("No node at position " + e);
    if (n instanceof ye)
      n.isInSet(r.marks) && this.step(new Yr(e, n));
    else {
      let i = r.marks, o, s = [];
      for (; o = n.isInSet(i); )
        s.push(new Yr(e, o)), i = o.removeFromSet(i);
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
    return eC(this, e, n, r), this;
  }
  /**
  Add the given mark to the inline content between `from` and `to`.
  */
  addMark(e, n, r) {
    return Wx(this, e, n, r), this;
  }
  /**
  Remove marks from inline nodes between `from` and `to`. When
  `mark` is a single mark, remove precisely that mark. When it is
  a mark type, remove all marks of that type. When it is null,
  remove all marks of any type.
  */
  removeMark(e, n, r) {
    return qx(this, e, n, r), this;
  }
  /**
  Removes all marks and nodes from the content of the node at
  `pos` that don't match the given new parent node type. Accepts
  an optional starting [content match](https://prosemirror.net/docs/ref/#model.ContentMatch) as
  third argument.
  */
  clearIncompatible(e, n, r) {
    return ou(this, e, n, r), this;
  }
}
const ka = /* @__PURE__ */ Object.create(null);
class se {
  /**
  Initialize a selection with the head and anchor and ranges. If no
  ranges are given, constructs a single range across `$anchor` and
  `$head`.
  */
  constructor(e, n, r) {
    this.$anchor = e, this.$head = n, this.ranges = r || [new Km(e.min(n), e.max(n))];
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
  replace(e, n = H.empty) {
    let r = n.content.lastChild, i = null;
    for (let l = 0; l < n.openEnd; l++)
      i = r, r = r.lastChild;
    let o = e.steps.length, s = this.ranges;
    for (let l = 0; l < s.length; l++) {
      let { $from: a, $to: c } = s[l], u = e.mapping.slice(o);
      e.replaceRange(u.map(a.pos), u.map(c.pos), l ? H.empty : n), l == 0 && Zd(e, o, (r ? r.isInline : i && i.isTextblock) ? -1 : 1);
    }
  }
  /**
  Replace the selection with the given node, appending the changes
  to the given transaction.
  */
  replaceWith(e, n) {
    let r = e.steps.length, i = this.ranges;
    for (let o = 0; o < i.length; o++) {
      let { $from: s, $to: l } = i[o], a = e.mapping.slice(r), c = a.map(s.pos), u = a.map(l.pos);
      o ? e.deleteRange(c, u) : (e.replaceRangeWith(c, u, n), Zd(e, r, n.isInline ? -1 : 1));
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
    let i = e.parent.inlineContent ? new ee(e) : fi(e.node(0), e.parent, e.pos, e.index(), n, r);
    if (i)
      return i;
    for (let o = e.depth - 1; o >= 0; o--) {
      let s = n < 0 ? fi(e.node(0), e.node(o), e.before(o + 1), e.index(o), n, r) : fi(e.node(0), e.node(o), e.after(o + 1), e.index(o) + 1, n, r);
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
    return this.findFrom(e, n) || this.findFrom(e, -n) || new Dt(e.node(0));
  }
  /**
  Find the cursor or leaf node selection closest to the start of
  the given document. Will return an
  [`AllSelection`](https://prosemirror.net/docs/ref/#state.AllSelection) if no valid position
  exists.
  */
  static atStart(e) {
    return fi(e, e, 0, 0, 1) || new Dt(e);
  }
  /**
  Find the cursor or leaf node selection closest to the end of the
  given document.
  */
  static atEnd(e) {
    return fi(e, e, e.content.size, e.childCount, -1) || new Dt(e);
  }
  /**
  Deserialize the JSON representation of a selection. Must be
  implemented for custom classes (as a static class method).
  */
  static fromJSON(e, n) {
    if (!n || !n.type)
      throw new RangeError("Invalid input for Selection.fromJSON");
    let r = ka[n.type];
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
    if (e in ka)
      throw new RangeError("Duplicate use of selection JSON ID " + e);
    return ka[e] = n, n.prototype.jsonID = e, n;
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
    return ee.between(this.$anchor, this.$head).getBookmark();
  }
}
se.prototype.visible = !0;
class Km {
  /**
  Create a range.
  */
  constructor(e, n) {
    this.$from = e, this.$to = n;
  }
}
let Xd = !1;
function Qd(t) {
  !Xd && !t.parent.inlineContent && (Xd = !0, console.warn("TextSelection endpoint not pointing into a node with inline content (" + t.parent.type.name + ")"));
}
class ee extends se {
  /**
  Construct a text selection between the given points.
  */
  constructor(e, n = e) {
    Qd(e), Qd(n), super(e, n);
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
      return se.near(r);
    let i = e.resolve(n.map(this.anchor));
    return new ee(i.parent.inlineContent ? i : r, r);
  }
  replace(e, n = H.empty) {
    if (super.replace(e, n), n == H.empty) {
      let r = this.$from.marksAcross(this.$to);
      r && e.ensureMarks(r);
    }
  }
  eq(e) {
    return e instanceof ee && e.anchor == this.anchor && e.head == this.head;
  }
  getBookmark() {
    return new _l(this.anchor, this.head);
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
    return new ee(e.resolve(n.anchor), e.resolve(n.head));
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
      let o = se.findFrom(n, r, !0) || se.findFrom(n, -r, !0);
      if (o)
        n = o.$head;
      else
        return se.near(n, r);
    }
    return e.parent.inlineContent || (i == 0 ? e = n : (e = (se.findFrom(e, -r, !0) || se.findFrom(e, r, !0)).$anchor, e.pos < n.pos != i < 0 && (e = n))), new ee(e, n);
  }
}
se.jsonID("text", ee);
class _l {
  constructor(e, n) {
    this.anchor = e, this.head = n;
  }
  map(e) {
    return new _l(e.map(this.anchor), e.map(this.head));
  }
  resolve(e) {
    return ee.between(e.resolve(this.anchor), e.resolve(this.head));
  }
}
class re extends se {
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
    return r ? se.near(o) : new re(o);
  }
  content() {
    return new H(z.from(this.node), 0, 0);
  }
  eq(e) {
    return e instanceof re && e.anchor == this.anchor;
  }
  toJSON() {
    return { type: "node", anchor: this.anchor };
  }
  getBookmark() {
    return new lu(this.anchor);
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
se.jsonID("node", re);
class lu {
  constructor(e) {
    this.anchor = e;
  }
  map(e) {
    let { deleted: n, pos: r } = e.mapResult(this.anchor);
    return n ? new _l(r, r) : new lu(r);
  }
  resolve(e) {
    let n = e.resolve(this.anchor), r = n.nodeAfter;
    return r && re.isSelectable(r) ? new re(n) : se.near(n);
  }
}
class Dt extends se {
  /**
  Create an all-selection over the given document.
  */
  constructor(e) {
    super(e.resolve(0), e.resolve(e.content.size));
  }
  replace(e, n = H.empty) {
    if (n == H.empty) {
      e.delete(0, e.doc.content.size);
      let r = se.atStart(e.doc);
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
    return new Dt(e);
  }
  map(e) {
    return new Dt(e);
  }
  eq(e) {
    return e instanceof Dt;
  }
  getBookmark() {
    return dC;
  }
}
se.jsonID("all", Dt);
const dC = {
  map() {
    return this;
  },
  resolve(t) {
    return new Dt(t);
  }
};
function fi(t, e, n, r, i, o = !1) {
  if (e.inlineContent)
    return ee.create(t, n);
  for (let s = r - (i > 0 ? 0 : 1); i > 0 ? s < e.childCount : s >= 0; s += i) {
    let l = e.child(s);
    if (l.isAtom) {
      if (!o && re.isSelectable(l))
        return re.create(t, n - (i < 0 ? l.nodeSize : 0));
    } else {
      let a = fi(t, l, n + i, i < 0 ? l.childCount : 0, i, o);
      if (a)
        return a;
    }
    n += l.nodeSize * i;
  }
  return null;
}
function Zd(t, e, n) {
  let r = t.steps.length - 1;
  if (r < e)
    return;
  let i = t.steps[r];
  if (!(i instanceof Fe || i instanceof rt))
    return;
  let o = t.mapping.maps[r], s;
  o.forEach((l, a, c, u) => {
    s == null && (s = u);
  }), t.setSelection(se.near(t.doc.resolve(s), n));
}
const eh = 1, js = 2, th = 4;
class hC extends qm {
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
    return this.curSelection = e, this.curSelectionFor = this.steps.length, this.updated = (this.updated | eh) & ~js, this.storedMarks = null, this;
  }
  /**
  Whether the selection was explicitly updated by this transaction.
  */
  get selectionSet() {
    return (this.updated & eh) > 0;
  }
  /**
  Set the current stored marks.
  */
  setStoredMarks(e) {
    return this.storedMarks = e, this.updated |= js, this;
  }
  /**
  Make sure the current stored marks or, if that is null, the marks
  at the selection, match the given set of marks. Does nothing if
  this is already the case.
  */
  ensureMarks(e) {
    return ye.sameSet(this.storedMarks || this.selection.$from.marks(), e) || this.setStoredMarks(e), this;
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
    return (this.updated & js) > 0;
  }
  /**
  @internal
  */
  addStep(e, n) {
    super.addStep(e, n), this.updated = this.updated & ~js, this.storedMarks = null;
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
    return n && (e = e.mark(this.storedMarks || (r.empty ? r.$from.marks() : r.$from.marksAcross(r.$to) || ye.none))), r.replaceWith(this, e), this;
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
      return this.replaceRangeWith(n, r, i.text(e, o)), !this.selection.empty && this.selection.to == n + e.length && this.setSelection(se.near(this.selection.$to)), this;
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
    return this.updated |= th, this;
  }
  /**
  True when this transaction has had `scrollIntoView` called on it.
  */
  get scrolledIntoView() {
    return (this.updated & th) > 0;
  }
}
function nh(t, e) {
  return !e || !t ? t : t.bind(e);
}
class bo {
  constructor(e, n, r) {
    this.name = e, this.init = nh(n.init, r), this.apply = nh(n.apply, r);
  }
}
const pC = [
  new bo("doc", {
    init(t) {
      return t.doc || t.schema.topNodeType.createAndFill();
    },
    apply(t) {
      return t.doc;
    }
  }),
  new bo("selection", {
    init(t, e) {
      return t.selection || se.atStart(e.doc);
    },
    apply(t) {
      return t.selection;
    }
  }),
  new bo("storedMarks", {
    init(t) {
      return t.storedMarks || null;
    },
    apply(t, e, n, r) {
      return r.selection.$cursor ? t.storedMarks : null;
    }
  }),
  new bo("scrollToSelection", {
    init() {
      return 0;
    },
    apply(t, e) {
      return t.scrolledIntoView ? e + 1 : e;
    }
  })
];
class ba {
  constructor(e, n) {
    this.schema = e, this.plugins = [], this.pluginsByKey = /* @__PURE__ */ Object.create(null), this.fields = pC.slice(), n && n.forEach((r) => {
      if (this.pluginsByKey[r.key])
        throw new RangeError("Adding different instances of a keyed plugin (" + r.key + ")");
      this.plugins.push(r), this.pluginsByKey[r.key] = r, r.spec.state && this.fields.push(new bo(r.key, r.spec.state, r));
    });
  }
}
class gi {
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
          let a = i ? i[s].n : 0, c = i ? i[s].state : this, u = a < n.length && l.spec.appendTransaction.call(l, a ? n.slice(a) : n, c, r);
          if (u && r.filterTransaction(u, s)) {
            if (u.setMeta("appendedTransaction", e), !i) {
              i = [];
              for (let f = 0; f < this.config.plugins.length; f++)
                i.push(f < s ? { state: r, n: n.length } : { state: this, n: 0 });
            }
            n.push(u), r = r.applyInner(u), o = !0;
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
    let n = new gi(this.config), r = this.config.fields;
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
    return new hC(this);
  }
  /**
  Create a new state.
  */
  static create(e) {
    let n = new ba(e.doc ? e.doc.type.schema : e.schema, e.plugins), r = new gi(n);
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
    let n = new ba(this.schema, e.plugins), r = n.fields, i = new gi(n);
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
    let i = new ba(e.schema, e.plugins), o = new gi(i);
    return i.fields.forEach((s) => {
      if (s.name == "doc")
        o.doc = Rn.fromJSON(e.schema, n.doc);
      else if (s.name == "selection")
        o.selection = se.fromJSON(o.doc, n.selection);
      else if (s.name == "storedMarks")
        n.storedMarks && (o.storedMarks = n.storedMarks.map(e.schema.markFromJSON));
      else {
        if (r)
          for (let l in r) {
            let a = r[l], c = a.spec.state;
            if (a.key == s.name && c && c.fromJSON && Object.prototype.hasOwnProperty.call(n, l)) {
              o[s.name] = c.fromJSON.call(a, e, n[l], o);
              return;
            }
          }
        o[s.name] = s.init(e, o);
      }
    }), o;
  }
}
function Um(t, e, n) {
  for (let r in t) {
    let i = t[r];
    i instanceof Function ? i = i.bind(e) : r == "handleDOMEvents" && (i = Um(i, e, {})), n[r] = i;
  }
  return n;
}
class Ie {
  /**
  Create a plugin.
  */
  constructor(e) {
    this.spec = e, this.props = {}, e.props && Um(e.props, this, this.props), this.key = e.key ? e.key.key : Jm("plugin");
  }
  /**
  Extract the plugin's state field from an editor state.
  */
  getState(e) {
    return e[this.key];
  }
}
const wa = /* @__PURE__ */ Object.create(null);
function Jm(t) {
  return t in wa ? t + "$" + ++wa[t] : (wa[t] = 0, t + "$");
}
class st {
  /**
  Create a plugin key.
  */
  constructor(e = "key") {
    this.key = Jm(e);
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
const au = (t, e) => t.selection.empty ? !1 : (e && e(t.tr.deleteSelection().scrollIntoView()), !0);
function Gm(t, e) {
  let { $cursor: n } = t.selection;
  return !n || (e ? !e.endOfTextblock("backward", t) : n.parentOffset > 0) ? null : n;
}
const Ym = (t, e, n) => {
  let r = Gm(t, n);
  if (!r)
    return !1;
  let i = cu(r);
  if (!i) {
    let s = r.blockRange(), l = s && Bl(s);
    return l == null ? !1 : (e && e(t.tr.lift(s, l).scrollIntoView()), !0);
  }
  let o = i.nodeBefore;
  if (Zm(t, i, e, -1))
    return !0;
  if (r.parent.content.size == 0 && (Wi(o, "end") || re.isSelectable(o)))
    for (let s = r.depth; ; s--) {
      let l = $l(t.doc, r.before(s), r.after(s), H.empty);
      if (l && l.slice.size < l.to - l.from) {
        if (e) {
          let a = t.tr.step(l);
          a.setSelection(Wi(o, "end") ? se.findFrom(a.doc.resolve(a.mapping.map(i.pos, -1)), -1) : re.create(a.doc, i.pos - o.nodeSize)), e(a.scrollIntoView());
        }
        return !0;
      }
      if (s == 1 || r.node(s - 1).childCount > 1)
        break;
    }
  return o.isAtom && i.depth == r.depth - 1 ? (e && e(t.tr.delete(i.pos - o.nodeSize, i.pos).scrollIntoView()), !0) : !1;
}, mC = (t, e, n) => {
  let r = Gm(t, n);
  if (!r)
    return !1;
  let i = cu(r);
  return i ? gC(t, i, e) : !1;
};
function gC(t, e, n) {
  let r = e.nodeBefore, i = r, o = e.pos - 1;
  for (; !i.isTextblock; o--) {
    if (i.type.spec.isolating)
      return !1;
    let u = i.lastChild;
    if (!u)
      return !1;
    i = u;
  }
  let s = e.nodeAfter, l = s, a = e.pos + 1;
  for (; !l.isTextblock; a++) {
    if (l.type.spec.isolating)
      return !1;
    let u = l.firstChild;
    if (!u)
      return !1;
    l = u;
  }
  let c = $l(t.doc, o, a, H.empty);
  if (!c || c.from != o || c instanceof Fe && c.slice.size >= a - o)
    return !1;
  if (n) {
    let u = t.tr.step(c);
    u.setSelection(ee.create(u.doc, o)), n(u.scrollIntoView());
  }
  return !0;
}
function Wi(t, e, n = !1) {
  for (let r = t; r; r = e == "start" ? r.firstChild : r.lastChild) {
    if (r.isTextblock)
      return !0;
    if (n && r.childCount != 1)
      return !1;
  }
  return !1;
}
const Xm = (t, e, n) => {
  let { $head: r, empty: i } = t.selection, o = r;
  if (!i)
    return !1;
  if (r.parent.isTextblock) {
    if (n ? !n.endOfTextblock("backward", t) : r.parentOffset > 0)
      return !1;
    o = cu(r);
  }
  let s = o && o.nodeBefore;
  return !s || !re.isSelectable(s) ? !1 : (e && e(t.tr.setSelection(re.create(t.doc, o.pos - s.nodeSize)).scrollIntoView()), !0);
};
function cu(t) {
  if (!t.parent.type.spec.isolating)
    for (let e = t.depth - 1; e >= 0; e--) {
      if (t.index(e) > 0)
        return t.doc.resolve(t.before(e + 1));
      if (t.node(e).type.spec.isolating)
        break;
    }
  return null;
}
function yC(t, e) {
  let { $cursor: n } = t.selection;
  return !n || (e ? !e.endOfTextblock("forward", t) : n.parentOffset < n.parent.content.size) ? null : n;
}
const kC = (t, e, n) => {
  let r = yC(t, n);
  if (!r)
    return !1;
  let i = Qm(r);
  if (!i)
    return !1;
  let o = i.nodeAfter;
  if (Zm(t, i, e, 1))
    return !0;
  if (r.parent.content.size == 0 && (Wi(o, "start") || re.isSelectable(o))) {
    let s = $l(t.doc, r.before(), r.after(), H.empty);
    if (s && s.slice.size < s.to - s.from) {
      if (e) {
        let l = t.tr.step(s);
        l.setSelection(Wi(o, "start") ? se.findFrom(l.doc.resolve(l.mapping.map(i.pos)), 1) : re.create(l.doc, l.mapping.map(i.pos))), e(l.scrollIntoView());
      }
      return !0;
    }
  }
  return o.isAtom && i.depth == r.depth - 1 ? (e && e(t.tr.delete(i.pos, i.pos + o.nodeSize).scrollIntoView()), !0) : !1;
}, bC = (t, e, n) => {
  let { $head: r, empty: i } = t.selection, o = r;
  if (!i)
    return !1;
  if (r.parent.isTextblock) {
    if (n ? !n.endOfTextblock("forward", t) : r.parentOffset < r.parent.content.size)
      return !1;
    o = Qm(r);
  }
  let s = o && o.nodeAfter;
  return !s || !re.isSelectable(s) ? !1 : (e && e(t.tr.setSelection(re.create(t.doc, o.pos)).scrollIntoView()), !0);
};
function Qm(t) {
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
const wC = (t, e) => {
  let { $head: n, $anchor: r } = t.selection;
  return !n.parent.type.spec.code || !n.sameParent(r) ? !1 : (e && e(t.tr.insertText(`
`).scrollIntoView()), !0);
};
function uu(t) {
  for (let e = 0; e < t.edgeCount; e++) {
    let { type: n } = t.edge(e);
    if (n.isTextblock && !n.hasRequiredAttrs())
      return n;
  }
  return null;
}
const xC = (t, e) => {
  let { $head: n, $anchor: r } = t.selection;
  if (!n.parent.type.spec.code || !n.sameParent(r))
    return !1;
  let i = n.node(-1), o = n.indexAfter(-1), s = uu(i.contentMatchAt(o));
  if (!s || !i.canReplaceWith(o, o, s))
    return !1;
  if (e) {
    let l = n.after(), a = t.tr.replaceWith(l, l, s.createAndFill());
    a.setSelection(se.near(a.doc.resolve(l), 1)), e(a.scrollIntoView());
  }
  return !0;
}, CC = (t, e) => {
  let n = t.selection, { $from: r, $to: i } = n;
  if (n instanceof Dt || r.parent.inlineContent || i.parent.inlineContent)
    return !1;
  let o = uu(i.parent.contentMatchAt(i.indexAfter()));
  if (!o || !o.isTextblock)
    return !1;
  if (e) {
    let s = (!r.parentOffset && i.index() < i.parent.childCount ? r : i).pos, l = t.tr.insert(s, o.createAndFill());
    l.setSelection(ee.create(l.doc, s + 1)), e(l.scrollIntoView());
  }
  return !0;
}, SC = (t, e) => {
  let { $cursor: n } = t.selection;
  if (!n || n.parent.content.size)
    return !1;
  if (n.depth > 1 && n.after() != n.end(-1)) {
    let o = n.before();
    if (Mo(t.doc, o))
      return e && e(t.tr.split(o).scrollIntoView()), !0;
  }
  let r = n.blockRange(), i = r && Bl(r);
  return i == null ? !1 : (e && e(t.tr.lift(r, i).scrollIntoView()), !0);
};
function vC(t) {
  return (e, n) => {
    let { $from: r, $to: i } = e.selection;
    if (e.selection instanceof re && e.selection.node.isBlock)
      return !r.parentOffset || !Mo(e.doc, r.pos) ? !1 : (n && n(e.tr.split(r.pos).scrollIntoView()), !0);
    if (!r.depth)
      return !1;
    let o = [], s, l, a = !1, c = !1;
    for (let h = r.depth; ; h--)
      if (r.node(h).isBlock) {
        a = r.end(h) == r.pos + (r.depth - h), c = r.start(h) == r.pos - (r.depth - h), l = uu(r.node(h - 1).contentMatchAt(r.indexAfter(h - 1))), o.unshift(a && l ? { type: l } : null), s = h;
        break;
      } else {
        if (h == 1)
          return !1;
        o.unshift(null);
      }
    let u = e.tr;
    (e.selection instanceof ee || e.selection instanceof Dt) && u.deleteSelection();
    let f = u.mapping.map(r.pos), d = Mo(u.doc, f, o.length, o);
    if (d || (o[0] = l ? { type: l } : null, d = Mo(u.doc, f, o.length, o)), !d)
      return !1;
    if (u.split(f, o.length, o), !a && c && r.node(s).type != l) {
      let h = u.mapping.map(r.before(s)), m = u.doc.resolve(h);
      l && r.node(s - 1).canReplaceWith(m.index(), m.index() + 1, l) && u.setNodeMarkup(u.mapping.map(r.before(s)), l);
    }
    return n && n(u.scrollIntoView()), !0;
  };
}
const MC = vC(), TC = (t, e) => (e && e(t.tr.setSelection(new Dt(t.doc))), !0);
function NC(t, e, n) {
  let r = e.nodeBefore, i = e.nodeAfter, o = e.index();
  return !r || !i || !r.type.compatibleContent(i.type) ? !1 : !r.content.size && e.parent.canReplace(o - 1, o) ? (n && n(t.tr.delete(e.pos - r.nodeSize, e.pos).scrollIntoView()), !0) : !e.parent.canReplace(o, o + 1) || !(i.isTextblock || Fl(t.doc, e.pos)) ? !1 : (n && n(t.tr.join(e.pos).scrollIntoView()), !0);
}
function Zm(t, e, n, r) {
  let i = e.nodeBefore, o = e.nodeAfter, s, l, a = i.type.spec.isolating || o.type.spec.isolating;
  if (!a && NC(t, e, n))
    return !0;
  let c = !a && e.parent.canReplace(e.index(), e.index() + 1);
  if (c && (s = (l = i.contentMatchAt(i.childCount)).findWrapping(o.type)) && l.matchType(s[0] || o.type).validEnd) {
    if (n) {
      let h = e.pos + o.nodeSize, m = z.empty;
      for (let x = s.length - 1; x >= 0; x--)
        m = z.from(s[x].create(null, m));
      m = z.from(i.copy(m));
      let b = t.tr.step(new rt(e.pos - 1, h, e.pos, h, new H(m, 1, 0), s.length, !0)), C = b.doc.resolve(h + 2 * s.length);
      C.nodeAfter && C.nodeAfter.type == i.type && Fl(b.doc, C.pos) && b.join(C.pos), n(b.scrollIntoView());
    }
    return !0;
  }
  let u = o.type.spec.isolating || r > 0 && a ? null : se.findFrom(e, 1), f = u && u.$from.blockRange(u.$to), d = f && Bl(f);
  if (d != null && d >= e.depth)
    return n && n(t.tr.lift(f, d).scrollIntoView()), !0;
  if (c && Wi(o, "start", !0) && Wi(i, "end")) {
    let h = i, m = [];
    for (; m.push(h), !h.isTextblock; )
      h = h.lastChild;
    let b = o, C = 1;
    for (; !b.isTextblock; b = b.firstChild)
      C++;
    if (h.canReplace(h.childCount, h.childCount, b.content)) {
      if (n) {
        let x = z.empty;
        for (let I = m.length - 1; I >= 0; I--)
          x = z.from(m[I].copy(x));
        let L = t.tr.step(new rt(e.pos - m.length, e.pos + o.nodeSize, e.pos + C, e.pos + o.nodeSize - C, new H(x, m.length, 0), 0, !0));
        n(L.scrollIntoView());
      }
      return !0;
    }
  }
  return !1;
}
function eg(t) {
  return function(e, n) {
    let r = e.selection, i = t < 0 ? r.$from : r.$to, o = i.depth;
    for (; i.node(o).isInline; ) {
      if (!o)
        return !1;
      o--;
    }
    return i.node(o).isTextblock ? (n && n(e.tr.setSelection(ee.create(e.doc, t < 0 ? i.start(o) : i.end(o)))), !0) : !1;
  };
}
const EC = eg(-1), AC = eg(1);
function fu(t, e = null) {
  return function(n, r) {
    let { $from: i, $to: o } = n.selection, s = i.blockRange(o), l = s && su(s, t, e);
    return l ? (r && r(n.tr.wrap(s, l).scrollIntoView()), !0) : !1;
  };
}
function On(t, e = null) {
  return function(n, r) {
    let i = !1;
    for (let o = 0; o < n.selection.ranges.length && !i; o++) {
      let { $from: { pos: s }, $to: { pos: l } } = n.selection.ranges[o];
      n.doc.nodesBetween(s, l, (a, c) => {
        if (i)
          return !1;
        if (!(!a.isTextblock || a.hasMarkup(t, e)))
          if (a.type == t)
            i = !0;
          else {
            let u = n.doc.resolve(c), f = u.index();
            i = u.parent.canReplaceWith(f, f + 1, t);
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
function IC(t, e, n, r) {
  for (let i = 0; i < e.length; i++) {
    let { $from: o, $to: s } = e[i], l = o.depth == 0 ? t.inlineContent && t.type.allowsMarkType(n) : !1;
    if (t.nodesBetween(o.pos, s.pos, (a, c) => {
      if (l)
        return !1;
      l = a.inlineContent && a.type.allowsMarkType(n);
    }), l)
      return !0;
  }
  return !1;
}
function ps(t, e = null, n) {
  return function(r, i) {
    let { empty: o, $cursor: s, ranges: l } = r.selection;
    if (o && !s || !IC(r.doc, l, t))
      return !1;
    if (i)
      if (s)
        t.isInSet(r.storedMarks || s.marks()) ? i(r.tr.removeStoredMark(t)) : i(r.tr.addStoredMark(t.create(e)));
      else {
        let a, c = r.tr;
        a = !l.some((u) => r.doc.rangeHasMark(u.$from.pos, u.$to.pos, t));
        for (let u = 0; u < l.length; u++) {
          let { $from: f, $to: d } = l[u];
          if (!a)
            c.removeMark(f.pos, d.pos, t);
          else {
            let h = f.pos, m = d.pos, b = f.nodeAfter, C = d.nodeBefore, x = b && b.isText ? /^\s*/.exec(b.text)[0].length : 0, L = C && C.isText ? /\s*$/.exec(C.text)[0].length : 0;
            h + x < m && (h += x, m -= L), c.addMark(h, m, t.create(e));
          }
        }
        i(c.scrollIntoView());
      }
    return !0;
  };
}
function Xi(...t) {
  return function(e, n, r) {
    for (let i = 0; i < t.length; i++)
      if (t[i](e, n, r))
        return !0;
    return !1;
  };
}
let xa = Xi(au, Ym, Xm), rh = Xi(au, kC, bC);
const Sn = {
  Enter: Xi(wC, CC, SC, MC),
  "Mod-Enter": xC,
  Backspace: xa,
  "Mod-Backspace": xa,
  "Shift-Backspace": xa,
  Delete: rh,
  "Mod-Delete": rh,
  "Mod-a": TC
}, tg = {
  "Ctrl-h": Sn.Backspace,
  "Alt-Backspace": Sn["Mod-Backspace"],
  "Ctrl-d": Sn.Delete,
  "Ctrl-Alt-Backspace": Sn["Mod-Delete"],
  "Alt-Delete": Sn["Mod-Delete"],
  "Alt-d": Sn["Mod-Delete"],
  "Ctrl-a": EC,
  "Ctrl-e": AC
};
for (let t in Sn)
  tg[t] = Sn[t];
const OC = typeof navigator < "u" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : typeof os < "u" && os.platform ? os.platform() == "darwin" : !1, DC = OC ? tg : Sn;
class Rt {
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
    this.match = e, this.match = e, this.handler = typeof n == "string" ? RC(n) : n, this.undoable = r.undoable !== !1, this.inCode = r.inCode || !1, this.inCodeMark = r.inCodeMark !== !1;
  }
}
function RC(t) {
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
const LC = (t, e) => {
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
new Rt(/--$/, "—", { inCodeMark: !1 });
new Rt(/\.\.\.$/, "…", { inCodeMark: !1 });
new Rt(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(")$/, "“", { inCodeMark: !1 });
new Rt(/"$/, "”", { inCodeMark: !1 });
new Rt(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(')$/, "‘", { inCodeMark: !1 });
new Rt(/'$/, "’", { inCodeMark: !1 });
function du(t, e, n = null, r) {
  return new Rt(t, (i, o, s, l) => {
    let a = n instanceof Function ? n(o) : n, c = i.tr.delete(s, l), u = c.doc.resolve(s), f = u.blockRange(), d = f && su(f, e, a);
    if (!d)
      return null;
    c.wrap(f, d);
    let h = c.doc.resolve(s - 1).nodeBefore;
    return h && h.type == e && Fl(c.doc, s - 1) && (!r || r(o, h)) && c.join(s - 1), c;
  });
}
function ng(t, e, n = null) {
  return new Rt(t, (r, i, o, s) => {
    let l = r.doc.resolve(o), a = n instanceof Function ? n(i) : n;
    return l.node(-1).canReplaceWith(l.index(-1), l.indexAfter(-1), e) ? r.tr.delete(o, s).setBlockType(o, o, e, a) : null;
  });
}
const pr = typeof navigator < "u" ? navigator : null, ih = typeof document < "u" ? document : null, yr = pr && pr.userAgent || "", kc = /Edge\/(\d+)/.exec(yr), rg = /MSIE \d/.exec(yr), bc = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(yr), hu = !!(rg || bc || kc);
rg ? document.documentMode : bc ? +bc[1] : kc && +kc[1];
const PC = !hu && /gecko\/(\d+)/i.test(yr);
PC && +(/Firefox\/(\d+)/.exec(yr) || [0, 0])[1];
const wc = !hu && /Chrome\/(\d+)/.exec(yr), zC = !!wc;
wc && +wc[1];
const BC = !hu && !!pr && /Apple Computer/.test(pr.vendor), FC = BC && (/Mobile\/\w+/.test(yr) || !!pr && pr.maxTouchPoints > 2);
FC || pr && /Mac/.test(pr.platform);
const $C = /Android \d/.test(yr), _C = !!ih && "webkitFontSmoothing" in ih.documentElement.style;
_C && +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1];
function Ca(t, e, n, r, i, o) {
  if (t.composing) return !1;
  const s = t.state, l = s.doc.resolve(e);
  if (l.parent.type.spec.code) return !1;
  const a = l.parent.textBetween(
    Math.max(0, l.parentOffset - 500),
    l.parentOffset,
    void 0,
    "￼"
  ) + r;
  for (let c of i) {
    const u = c, f = u.match.exec(a), d = f && f[0] && u.handler(s, f, e - (f[0].length - r.length), n);
    if (d)
      return u.undoable !== !1 && d.setMeta(o, { transform: d, from: e, to: n, text: r }), t.dispatch(d), !0;
  }
  return !1;
}
const VC = new st("MILKDOWN_CUSTOM_INPUTRULES");
function HC({ rules: t }) {
  const e = new Ie({
    key: VC,
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
        return Ca(n, r, i, o, t, e);
      },
      handleDOMEvents: {
        compositionend: (n) => (setTimeout(() => {
          const { $cursor: r } = n.state.selection;
          r && Ca(n, r.pos, r.pos, "", t, e);
        }), !1),
        keydown: (n, r) => !($C && zC && r.key === "Enter") || n.composing ? !1 : n.someProp(
          "handleKeyDown",
          (i) => i(n, r)
        ) ? (r.preventDefault(), !0) : !1
      },
      handleKeyDown(n, r) {
        if (r.key !== "Enter") return !1;
        const { $cursor: i } = n.state.selection;
        return i ? Ca(n, i.pos, i.pos, `
`, t, e) : !1;
      }
    }
  });
  return e;
}
function ms(t, e, n = {}) {
  return new Rt(t, (r, i, o, s) => {
    var l, a, c, u;
    const { tr: f } = r, d = i.length;
    let h = i[d - 1], m = i[0], b = [], C;
    const x = {
      group: h,
      fullMatch: m,
      start: o,
      end: s
    }, L = (l = n.updateCaptured) == null ? void 0 : l.call(n, x);
    if (Object.assign(x, L), { group: h, fullMatch: m, start: o, end: s } = x, m === null || (h == null ? void 0 : h.trim()) === "") return null;
    if (h) {
      const I = m.search(/\S/), D = o + m.indexOf(h), j = D + h.length;
      b = (a = f.storedMarks) != null ? a : [], j < s && f.delete(j, s), D > o && f.delete(o + I, D), C = o + I + h.length;
      const A = (c = n.getAttr) == null ? void 0 : c.call(n, i);
      f.addMark(o, C, e.create(A)), f.setStoredMarks(b), (u = n.beforeDispatch) == null || u.call(n, { match: i, start: o, end: s, tr: f });
    }
    return f;
  });
}
function ig(t) {
  return Object.assign(Object.create(t), t).setTime(Date.now());
}
function jC(t, e) {
  return Array.isArray(t) && t.includes(e.type) || e.type === t;
}
function WC(t) {
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
function qC(t, e) {
  return WC((n) => n.type === e)(t);
}
function KC(t) {
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
function UC(t, e) {
  if (!(t instanceof re)) return;
  const { node: n, $from: r } = t;
  if (jC(e, n))
    return {
      node: n,
      pos: r.pos,
      start: r.start(r.depth),
      depth: r.depth
    };
}
const JC = (t, e) => {
  const { selection: n, doc: r } = t;
  if (n instanceof re)
    return {
      hasNode: n.node.type === e,
      pos: n.from,
      target: n.node
    };
  const { from: i, to: o } = n;
  let s = !1, l = -1, a = null;
  return r.nodesBetween(i, o, (c, u) => a ? !1 : c.type === e ? (s = !0, l = u, a = c, !1) : !0), {
    hasNode: s,
    pos: l,
    target: a
  };
};
var mr = {
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
}, yl = {
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
}, GC = typeof navigator < "u" && /Mac/.test(navigator.platform), YC = typeof navigator < "u" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
for (var Xe = 0; Xe < 10; Xe++) mr[48 + Xe] = mr[96 + Xe] = String(Xe);
for (var Xe = 1; Xe <= 24; Xe++) mr[Xe + 111] = "F" + Xe;
for (var Xe = 65; Xe <= 90; Xe++)
  mr[Xe] = String.fromCharCode(Xe + 32), yl[Xe] = String.fromCharCode(Xe);
for (var Sa in mr) yl.hasOwnProperty(Sa) || (yl[Sa] = mr[Sa]);
function XC(t) {
  var e = GC && t.metaKey && t.shiftKey && !t.ctrlKey && !t.altKey || YC && t.shiftKey && t.key && t.key.length == 1 || t.key == "Unidentified", n = !e && t.key || (t.shiftKey ? yl : mr)[t.keyCode] || t.key || "Unidentified";
  return n == "Esc" && (n = "Escape"), n == "Del" && (n = "Delete"), n == "Left" && (n = "ArrowLeft"), n == "Up" && (n = "ArrowUp"), n == "Right" && (n = "ArrowRight"), n == "Down" && (n = "ArrowDown"), n;
}
const QC = typeof navigator < "u" && /Mac|iP(hone|[oa]d)/.test(navigator.platform), ZC = typeof navigator < "u" && /Win/.test(navigator.platform);
function eS(t) {
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
      QC ? s = !0 : i = !0;
    else
      throw new Error("Unrecognized modifier name: " + a);
  }
  return r && (n = "Alt-" + n), i && (n = "Ctrl-" + n), s && (n = "Meta-" + n), o && (n = "Shift-" + n), n;
}
function tS(t) {
  let e = /* @__PURE__ */ Object.create(null);
  for (let n in t)
    e[eS(n)] = t[n];
  return e;
}
function va(t, e, n = !0) {
  return e.altKey && (t = "Alt-" + t), e.ctrlKey && (t = "Ctrl-" + t), e.metaKey && (t = "Meta-" + t), n && e.shiftKey && (t = "Shift-" + t), t;
}
function og(t) {
  return new Ie({ props: { handleKeyDown: sg(t) } });
}
function sg(t) {
  let e = tS(t);
  return function(n, r) {
    let i = XC(r), o, s = e[va(i, r)];
    if (s && s(n.state, n.dispatch, n))
      return !0;
    if (i.length == 1 && i != " ") {
      if (r.shiftKey) {
        let l = e[va(i, r, !1)];
        if (l && l(n.state, n.dispatch, n))
          return !0;
      }
      if ((r.altKey || r.metaKey || r.ctrlKey) && // Ctrl-Alt may be used for AltGr on Windows
      !(ZC && r.ctrlKey && r.altKey) && (o = mr[r.keyCode]) && o != i) {
        let l = e[va(o, r)];
        if (l && l(n.state, n.dispatch, n))
          return !0;
      }
    }
    return !1;
  };
}
var lg = class {
}, ag = class {
  constructor() {
    this.elements = [], this.size = () => this.elements.length, this.top = () => this.elements.at(-1), this.push = (t) => {
      var e;
      (e = this.top()) == null || e.push(t);
    }, this.open = (t) => {
      this.elements.push(t);
    }, this.close = () => {
      const t = this.elements.pop();
      if (!t) throw Fp();
      return t;
    };
  }
}, nS = class cg extends lg {
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
    return new cg(e, n, r);
  }
}, Gt, Oi, Qo, Zo, es, Di, Ri, qr, rS = (qr = class extends ag {
  constructor(n) {
    super();
    q(this, Gt);
    q(this, Oi);
    q(this, Qo);
    q(this, Zo);
    q(this, es);
    q(this, Di);
    q(this, Ri);
    $(this, Gt, ye.none), $(this, Oi, (r) => r.isText), $(this, Qo, (r, i) => {
      if (N(this, Oi).call(this, r) && N(this, Oi).call(this, i) && ye.sameSet(r.marks, i.marks)) return this.schema.text(r.text + i.text, r.marks);
    }), $(this, Zo, (r) => {
      const i = Object.values({
        ...this.schema.nodes,
        ...this.schema.marks
      }).find((o) => o.spec.parseMarkdown.match(r));
      if (!i) throw zb(r);
      return i;
    }), $(this, es, (r) => {
      const i = N(this, Zo).call(this, r);
      i.spec.parseMarkdown.runner(this, r, i);
    }), this.injectRoot = (r, i, o) => (this.openNode(i, o), this.next(r.children), this), this.openNode = (r, i) => (this.open(nS.create(r, [], i)), this), $(this, Di, () => {
      $(this, Gt, ye.none);
      const r = this.close();
      return N(this, Ri).call(this, r.type, r.attrs, r.content);
    }), this.closeNode = () => {
      try {
        N(this, Di).call(this);
      } catch (r) {
        console.error(r);
      }
      return this;
    }, $(this, Ri, (r, i, o) => {
      const s = r.createAndFill(i, o, N(this, Gt));
      if (!s) throw Pb(r, i, o);
      return this.push(s), s;
    }), this.addNode = (r, i, o) => {
      try {
        N(this, Ri).call(this, r, i, o);
      } catch (s) {
        console.error(s);
      }
      return this;
    }, this.openMark = (r, i) => {
      const o = r.create(i);
      return $(this, Gt, o.addToSet(N(this, Gt))), this;
    }, this.closeMark = (r) => ($(this, Gt, r.removeFromSet(N(this, Gt))), this), this.addText = (r) => {
      try {
        const i = this.top();
        if (!i) throw Fp();
        const o = i.pop(), s = this.schema.text(r, N(this, Gt));
        if (!o)
          return i.push(s), this;
        const l = N(this, Qo).call(this, o, s);
        return l ? (i.push(l), this) : (i.push(o, s), this);
      } catch (i) {
        return console.error(i), this;
      }
    }, this.build = () => {
      let r;
      do
        r = N(this, Di).call(this);
      while (this.size());
      return r;
    }, this.next = (r = []) => ([r].flat().forEach((i) => N(this, es).call(this, i)), this), this.toDoc = () => this.build(), this.run = (r, i) => {
      const o = r.runSync(r.parse(i), i);
      return this.next(o), this;
    }, this.schema = n;
  }
}, Gt = new WeakMap(), Oi = new WeakMap(), Qo = new WeakMap(), Zo = new WeakMap(), es = new WeakMap(), Di = new WeakMap(), Ri = new WeakMap(), qr.create = (n, r) => {
  const i = new qr(n);
  return (o) => (i.run(r, o), i.toDoc());
}, qr), Kr, oh = (Kr = class extends lg {
  constructor(e, n, r, i = {}) {
    super(), this.type = e, this.children = n, this.value = r, this.props = i, this.push = (o, ...s) => {
      this.children || (this.children = []), this.children.push(o, ...s);
    }, this.pop = () => {
      var o;
      return (o = this.children) == null ? void 0 : o.pop();
    };
  }
}, Kr.create = (e, n, r, i = {}) => new Kr(e, n, r, i), Kr), iS = (t) => Object.prototype.hasOwnProperty.call(t, "size"), rn, Li, ts, ns, Pi, rs, zi, is, ss, Ir, ir, ls, Bi, Ur, oS = (Ur = class extends ag {
  constructor(n) {
    super();
    q(this, rn);
    q(this, Li);
    q(this, ts);
    q(this, ns);
    q(this, Pi);
    q(this, rs);
    q(this, zi);
    q(this, is);
    q(this, ss);
    q(this, Ir);
    q(this, ir);
    q(this, ls);
    q(this, Bi);
    $(this, rn, ye.none), $(this, Li, (r) => {
      const i = Object.values({
        ...this.schema.nodes,
        ...this.schema.marks
      }).find((o) => o.spec.toMarkdown.match(r));
      if (!i) throw Bb(r.type);
      return i;
    }), $(this, ts, (r) => N(this, Li).call(this, r).spec.toMarkdown.runner(this, r)), $(this, ns, (r, i) => N(this, Li).call(this, r).spec.toMarkdown.runner(this, r, i)), $(this, Pi, (r) => {
      const { marks: i } = r, o = (s) => s.type.spec.priority ?? 50;
      [...i].sort((s, l) => o(s) - o(l)).every((s) => !N(this, ns).call(this, s, r)) && N(this, ts).call(this, r), i.forEach((s) => N(this, Bi).call(this, s));
    }), $(this, rs, (r, i) => {
      var c;
      if (r.type === i || ((c = r.children) == null ? void 0 : c.length) !== 1) return r;
      const o = (u) => {
        var d;
        if (u.type === i) return u.value != null ? null : u;
        if (((d = u.children) == null ? void 0 : d.length) !== 1) return null;
        const [f] = u.children;
        return f ? o(f) : null;
      }, s = o(r);
      if (!s) return r;
      const l = s.children ? [...s.children] : void 0, a = {
        ...r,
        children: l
      };
      return a.children = l, s.children = [a], s;
    }), $(this, zi, (r) => {
      const { children: i } = r;
      return i && (r.children = i.reduce((o, s, l) => {
        if (l === 0) return [s];
        const a = o.at(-1);
        if (a && a.isMark && s.isMark) {
          s = N(this, rs).call(this, s, a.type);
          const { children: c, ...u } = s, { children: f, ...d } = a;
          if (s.type === a.type && c && f && JSON.stringify(u) === JSON.stringify(d)) {
            const h = {
              ...d,
              children: [...f, ...c]
            };
            return o.slice(0, -1).concat(N(this, zi).call(this, h));
          }
        }
        return o.concat(s);
      }, [])), r;
    }), $(this, is, (r) => {
      const i = {
        ...r.props,
        type: r.type
      };
      return r.children && (i.children = r.children), r.value && (i.value = r.value), i;
    }), this.openNode = (r, i, o) => (this.open(oh.create(r, void 0, i, o)), this), $(this, ss, (r, i) => {
      let o = "", s = "";
      const l = r.children;
      let a = -1, c = -1;
      const u = (d) => {
        d && d.forEach((h, m) => {
          h.type === "text" && h.value && (a < 0 && (a = m), c = m);
        });
      };
      if (l) {
        u(l);
        const d = l == null ? void 0 : l[c], h = l == null ? void 0 : l[a];
        if (d && d.value.endsWith(" ")) {
          const m = d.value, b = m.trimEnd();
          s = m.slice(b.length), d.value = b;
        }
        if (h && h.value.startsWith(" ")) {
          const m = h.value, b = m.trimStart();
          o = m.slice(0, m.length - b.length), h.value = b;
        }
      }
      o.length && N(this, ir).call(this, "text", void 0, o);
      const f = i();
      return s.length && N(this, ir).call(this, "text", void 0, s), f;
    }), $(this, Ir, (r = !1) => {
      const i = this.close(), o = () => N(this, ir).call(this, i.type, i.children, i.value, i.props);
      return r ? N(this, ss).call(this, i, o) : o();
    }), this.closeNode = () => (N(this, Ir).call(this), this), $(this, ir, (r, i, o, s) => {
      const l = oh.create(r, i, o, s), a = N(this, zi).call(this, N(this, is).call(this, l));
      return this.push(a), a;
    }), this.addNode = (r, i, o, s) => (N(this, ir).call(this, r, i, o, s), this), $(this, ls, (r, i, o, s) => r.isInSet(N(this, rn)) ? this : ($(this, rn, r.addToSet(N(this, rn))), this.openNode(i, o, {
      ...s,
      isMark: !0
    }))), $(this, Bi, (r) => {
      r.isInSet(N(this, rn)) && ($(this, rn, r.type.removeFromSet(N(this, rn))), N(this, Ir).call(this, !0));
    }), this.withMark = (r, i, o, s) => (N(this, ls).call(this, r, i, o, s), this), this.closeMark = (r) => (N(this, Bi).call(this, r), this), this.build = () => {
      let r = null;
      do
        r = N(this, Ir).call(this);
      while (this.size());
      return r;
    }, this.next = (r) => iS(r) ? (r.forEach((i) => {
      N(this, Pi).call(this, i);
    }), this) : (N(this, Pi).call(this, r), this), this.toString = (r) => r.stringify(this.build()), this.run = (r) => (this.next(r), this), this.schema = n;
  }
}, rn = new WeakMap(), Li = new WeakMap(), ts = new WeakMap(), ns = new WeakMap(), Pi = new WeakMap(), rs = new WeakMap(), zi = new WeakMap(), is = new WeakMap(), ss = new WeakMap(), Ir = new WeakMap(), ir = new WeakMap(), ls = new WeakMap(), Bi = new WeakMap(), Ur.create = (n, r) => {
  const i = new Ur(n);
  return (o) => (i.run(o), i.toString(r));
}, Ur);
const Qe = function(t) {
  for (var e = 0; ; e++)
    if (t = t.previousSibling, !t)
      return e;
}, qi = function(t) {
  let e = t.assignedSlot || t.parentNode;
  return e && e.nodeType == 11 ? e.host : e;
};
let xc = null;
const Cn = function(t, e, n) {
  let r = xc || (xc = document.createRange());
  return r.setEnd(t, n ?? t.nodeValue.length), r.setStart(t, e || 0), r;
}, sS = function() {
  xc = null;
}, Xr = function(t, e, n, r) {
  return n && (sh(t, e, n, r, -1) || sh(t, e, n, r, 1));
}, lS = /^(img|br|input|textarea|hr)$/i;
function sh(t, e, n, r, i) {
  for (var o; ; ) {
    if (t == n && e == r)
      return !0;
    if (e == (i < 0 ? 0 : jt(t))) {
      let s = t.parentNode;
      if (!s || s.nodeType != 1 || gs(t) || lS.test(t.nodeName) || t.contentEditable == "false")
        return !1;
      e = Qe(t) + (i < 0 ? 0 : 1), t = s;
    } else if (t.nodeType == 1) {
      let s = t.childNodes[e + (i < 0 ? -1 : 0)];
      if (s.nodeType == 1 && s.contentEditable == "false")
        if (!((o = s.pmViewDesc) === null || o === void 0) && o.ignoreForSelection)
          e += i;
        else
          return !1;
      else
        t = s, e = i < 0 ? jt(t) : 0;
    } else
      return !1;
  }
}
function jt(t) {
  return t.nodeType == 3 ? t.nodeValue.length : t.childNodes.length;
}
function aS(t, e) {
  for (; ; ) {
    if (t.nodeType == 3 && e)
      return t;
    if (t.nodeType == 1 && e > 0) {
      if (t.contentEditable == "false")
        return null;
      t = t.childNodes[e - 1], e = jt(t);
    } else if (t.parentNode && !gs(t))
      e = Qe(t), t = t.parentNode;
    else
      return null;
  }
}
function cS(t, e) {
  for (; ; ) {
    if (t.nodeType == 3 && e < t.nodeValue.length)
      return t;
    if (t.nodeType == 1 && e < t.childNodes.length) {
      if (t.contentEditable == "false")
        return null;
      t = t.childNodes[e], e = 0;
    } else if (t.parentNode && !gs(t))
      e = Qe(t) + 1, t = t.parentNode;
    else
      return null;
  }
}
function uS(t, e, n) {
  for (let r = e == 0, i = e == jt(t); r || i; ) {
    if (t == n)
      return !0;
    let o = Qe(t);
    if (t = t.parentNode, !t)
      return !1;
    r = r && o == 0, i = i && o == jt(t);
  }
}
function gs(t) {
  let e;
  for (let n = t; n && !(e = n.pmViewDesc); n = n.parentNode)
    ;
  return e && e.node && e.node.isBlock && (e.dom == t || e.contentDOM == t);
}
const Vl = function(t) {
  return t.focusNode && Xr(t.focusNode, t.focusOffset, t.anchorNode, t.anchorOffset);
};
function Mr(t, e) {
  let n = document.createEvent("Event");
  return n.initEvent("keydown", !0, !0), n.keyCode = t, n.key = n.code = e, n;
}
function fS(t) {
  let e = t.activeElement;
  for (; e && e.shadowRoot; )
    e = e.shadowRoot.activeElement;
  return e;
}
function dS(t, e, n) {
  if (t.caretPositionFromPoint)
    try {
      let r = t.caretPositionFromPoint(e, n);
      if (r)
        return { node: r.offsetNode, offset: Math.min(jt(r.offsetNode), r.offset) };
    } catch {
    }
  if (t.caretRangeFromPoint) {
    let r = t.caretRangeFromPoint(e, n);
    if (r)
      return { node: r.startContainer, offset: Math.min(jt(r.startContainer), r.startOffset) };
  }
}
const sn = typeof navigator < "u" ? navigator : null, lh = typeof document < "u" ? document : null, kr = sn && sn.userAgent || "", Cc = /Edge\/(\d+)/.exec(kr), ug = /MSIE \d/.exec(kr), Sc = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(kr), bt = !!(ug || Sc || Cc), cr = ug ? document.documentMode : Sc ? +Sc[1] : Cc ? +Cc[1] : 0, Wt = !bt && /gecko\/(\d+)/i.test(kr);
Wt && +(/Firefox\/(\d+)/.exec(kr) || [0, 0])[1];
const vc = !bt && /Chrome\/(\d+)/.exec(kr), Ze = !!vc, fg = vc ? +vc[1] : 0, it = !bt && !!sn && /Apple Computer/.test(sn.vendor), Ki = it && (/Mobile\/\w+/.test(kr) || !!sn && sn.maxTouchPoints > 2), Vt = Ki || (sn ? /Mac/.test(sn.platform) : !1), dg = sn ? /Win/.test(sn.platform) : !1, Dn = /Android \d/.test(kr), ys = !!lh && "webkitFontSmoothing" in lh.documentElement.style, hS = ys ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0;
function pS(t) {
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
function bn(t, e) {
  return typeof t == "number" ? t : t[e];
}
function mS(t) {
  let e = t.getBoundingClientRect(), n = e.width / t.offsetWidth || 1, r = e.height / t.offsetHeight || 1;
  return {
    left: e.left,
    right: e.left + t.clientWidth * n,
    top: e.top,
    bottom: e.top + t.clientHeight * r
  };
}
function ah(t, e, n) {
  let r = t.someProp("scrollThreshold") || 0, i = t.someProp("scrollMargin") || 5, o = t.dom.ownerDocument;
  for (let s = n || t.dom; s; ) {
    if (s.nodeType != 1) {
      s = qi(s);
      continue;
    }
    let l = s, a = l == o.body, c = a ? pS(o) : mS(l), u = 0, f = 0;
    if (e.top < c.top + bn(r, "top") ? f = -(c.top - e.top + bn(i, "top")) : e.bottom > c.bottom - bn(r, "bottom") && (f = e.bottom - e.top > c.bottom - c.top ? e.top + bn(i, "top") - c.top : e.bottom - c.bottom + bn(i, "bottom")), e.left < c.left + bn(r, "left") ? u = -(c.left - e.left + bn(i, "left")) : e.right > c.right - bn(r, "right") && (u = e.right - c.right + bn(i, "right")), u || f)
      if (a)
        o.defaultView.scrollBy(u, f);
      else {
        let h = l.scrollLeft, m = l.scrollTop;
        f && (l.scrollTop += f), u && (l.scrollLeft += u);
        let b = l.scrollLeft - h, C = l.scrollTop - m;
        e = { left: e.left - b, top: e.top - C, right: e.right - b, bottom: e.bottom - C };
      }
    let d = a ? "fixed" : getComputedStyle(s).position;
    if (/^(fixed|sticky)$/.test(d))
      break;
    s = d == "absolute" ? s.offsetParent : qi(s);
  }
}
function gS(t) {
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
  return { refDOM: r, refTop: i, stack: hg(t.dom) };
}
function hg(t) {
  let e = [], n = t.ownerDocument;
  for (let r = t; r && (e.push({ dom: r, top: r.scrollTop, left: r.scrollLeft }), t != n); r = qi(r))
    ;
  return e;
}
function yS({ refDOM: t, refTop: e, stack: n }) {
  let r = t ? t.getBoundingClientRect().top : 0;
  pg(n, r == 0 ? 0 : r - e);
}
function pg(t, e) {
  for (let n = 0; n < t.length; n++) {
    let { dom: r, top: i, left: o } = t[n];
    r.scrollTop != i + e && (r.scrollTop = i + e), r.scrollLeft != o && (r.scrollLeft = o);
  }
}
let ci = null;
function kS(t) {
  if (t.setActive)
    return t.setActive();
  if (ci)
    return t.focus(ci);
  let e = hg(t);
  t.focus(ci == null ? {
    get preventScroll() {
      return ci = { preventScroll: !0 }, !0;
    }
  } : void 0), ci || (ci = !1, pg(e, 0));
}
function mg(t, e) {
  let n, r = 2e8, i, o = 0, s = e.top, l = e.top, a, c;
  for (let u = t.firstChild, f = 0; u; u = u.nextSibling, f++) {
    let d;
    if (u.nodeType == 1)
      d = u.getClientRects();
    else if (u.nodeType == 3)
      d = Cn(u).getClientRects();
    else
      continue;
    for (let h = 0; h < d.length; h++) {
      let m = d[h];
      if (m.top <= s && m.bottom >= l) {
        s = Math.max(m.bottom, s), l = Math.min(m.top, l);
        let b = m.left > e.left ? m.left - e.left : m.right < e.left ? e.left - m.right : 0;
        if (b < r) {
          n = u, r = b, i = b && n.nodeType == 3 ? {
            left: m.right < e.left ? m.right : m.left,
            top: e.top
          } : e, u.nodeType == 1 && b && (o = f + (e.left >= (m.left + m.right) / 2 ? 1 : 0));
          continue;
        }
      } else m.top > e.top && !a && m.left <= e.left && m.right >= e.left && (a = u, c = { left: Math.max(m.left, Math.min(m.right, e.left)), top: m.top });
      !n && (e.left >= m.right && e.top >= m.top || e.left >= m.left && e.top >= m.bottom) && (o = f + 1);
    }
  }
  return !n && a && (n = a, i = c, r = 0), n && n.nodeType == 3 ? bS(n, i) : !n || r && n.nodeType == 1 ? { node: t, offset: o } : mg(n, i);
}
function bS(t, e) {
  let n = t.nodeValue.length, r = document.createRange(), i;
  for (let o = 0; o < n; o++) {
    r.setEnd(t, o + 1), r.setStart(t, o);
    let s = Yn(r, 1);
    if (s.top != s.bottom && pu(e, s)) {
      i = { node: t, offset: o + (e.left >= (s.left + s.right) / 2 ? 1 : 0) };
      break;
    }
  }
  return r.detach(), i || { node: t, offset: 0 };
}
function pu(t, e) {
  return t.left >= e.left - 1 && t.left <= e.right + 1 && t.top >= e.top - 1 && t.top <= e.bottom + 1;
}
function wS(t, e) {
  let n = t.parentNode;
  return n && /^li$/i.test(n.nodeName) && e.left < t.getBoundingClientRect().left ? n : t;
}
function xS(t, e, n) {
  let { node: r, offset: i } = mg(e, n), o = -1;
  if (r.nodeType == 1 && !r.firstChild) {
    let s = r.getBoundingClientRect();
    o = s.left != s.right && n.left > (s.left + s.right) / 2 ? 1 : -1;
  }
  return t.docView.posFromDOM(r, i, o);
}
function CS(t, e, n, r) {
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
function gg(t, e, n) {
  let r = t.childNodes.length;
  if (r && n.top < n.bottom)
    for (let i = Math.max(0, Math.min(r - 1, Math.floor(r * (e.top - n.top) / (n.bottom - n.top)) - 2)), o = i; ; ) {
      let s = t.childNodes[o];
      if (s.nodeType == 1) {
        let l = s.getClientRects();
        for (let a = 0; a < l.length; a++) {
          let c = l[a];
          if (pu(e, c))
            return gg(s, e, c);
        }
      }
      if ((o = (o + 1) % r) == i)
        break;
    }
  return t;
}
function SS(t, e) {
  let n = t.dom.ownerDocument, r, i = 0, o = dS(n, e.left, e.top);
  o && ({ node: r, offset: i } = o);
  let s = (t.root.elementFromPoint ? t.root : n).elementFromPoint(e.left, e.top), l;
  if (!s || !t.dom.contains(s.nodeType != 1 ? s.parentNode : s)) {
    let c = t.dom.getBoundingClientRect();
    if (!pu(e, c) || (s = gg(t.dom, e, c), !s))
      return null;
  }
  if (it)
    for (let c = s; r && c; c = qi(c))
      c.draggable && (r = void 0);
  if (s = wS(s, e), r) {
    if (Wt && r.nodeType == 1 && (i = Math.min(i, r.childNodes.length), i < r.childNodes.length)) {
      let u = r.childNodes[i], f;
      u.nodeName == "IMG" && (f = u.getBoundingClientRect()).right <= e.left && f.bottom > e.top && i++;
    }
    let c;
    ys && i && r.nodeType == 1 && (c = r.childNodes[i - 1]).nodeType == 1 && c.contentEditable == "false" && c.getBoundingClientRect().top >= e.top && i--, r == t.dom && i == r.childNodes.length - 1 && r.lastChild.nodeType == 1 && e.top > r.lastChild.getBoundingClientRect().bottom ? l = t.state.doc.content.size : (i == 0 || r.nodeType != 1 || r.childNodes[i - 1].nodeName != "BR") && (l = CS(t, r, i, e));
  }
  l == null && (l = xS(t, s, e));
  let a = t.docView.nearestDesc(s, !0);
  return { pos: l, inside: a ? a.posAtStart - a.border : -1 };
}
function ch(t) {
  return t.top < t.bottom || t.left < t.right;
}
function Yn(t, e) {
  let n = t.getClientRects();
  if (n.length) {
    let r = n[e < 0 ? 0 : n.length - 1];
    if (ch(r))
      return r;
  }
  return Array.prototype.find.call(n, ch) || t.getBoundingClientRect();
}
const vS = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
function yg(t, e, n) {
  let { node: r, offset: i, atom: o } = t.docView.domFromPos(e, n < 0 ? -1 : 1), s = ys || Wt;
  if (r.nodeType == 3)
    if (s && (vS.test(r.nodeValue) || (n < 0 ? !i : i == r.nodeValue.length))) {
      let a = Yn(Cn(r, i, i), n);
      if (Wt && i && /\s/.test(r.nodeValue[i - 1]) && i < r.nodeValue.length) {
        let c = Yn(Cn(r, i - 1, i - 1), -1);
        if (c.top == a.top) {
          let u = Yn(Cn(r, i, i + 1), -1);
          if (u.top != a.top)
            return ho(u, u.left < c.left);
        }
      }
      return a;
    } else {
      let a = i, c = i, u = n < 0 ? 1 : -1;
      return n < 0 && !i ? (c++, u = -1) : n >= 0 && i == r.nodeValue.length ? (a--, u = 1) : n < 0 ? a-- : c++, ho(Yn(Cn(r, a, c), u), u < 0);
    }
  if (!t.state.doc.resolve(e - (o || 0)).parent.inlineContent) {
    if (o == null && i && (n < 0 || i == jt(r))) {
      let a = r.childNodes[i - 1];
      if (a.nodeType == 1)
        return Ma(a.getBoundingClientRect(), !1);
    }
    if (o == null && i < jt(r)) {
      let a = r.childNodes[i];
      if (a.nodeType == 1)
        return Ma(a.getBoundingClientRect(), !0);
    }
    return Ma(r.getBoundingClientRect(), n >= 0);
  }
  if (o == null && i && (n < 0 || i == jt(r))) {
    let a = r.childNodes[i - 1], c = a.nodeType == 3 ? Cn(a, jt(a) - (s ? 0 : 1)) : a.nodeType == 1 && (a.nodeName != "BR" || !a.nextSibling) ? a : null;
    if (c)
      return ho(Yn(c, 1), !1);
  }
  if (o == null && i < jt(r)) {
    let a = r.childNodes[i];
    for (; a.pmViewDesc && a.pmViewDesc.ignoreForCoords; )
      a = a.nextSibling;
    let c = a ? a.nodeType == 3 ? Cn(a, 0, s ? 0 : 1) : a.nodeType == 1 ? a : null : null;
    if (c)
      return ho(Yn(c, -1), !0);
  }
  return ho(Yn(r.nodeType == 3 ? Cn(r) : r, -n), n >= 0);
}
function ho(t, e) {
  if (t.width == 0)
    return t;
  let n = e ? t.left : t.right;
  return { top: t.top, bottom: t.bottom, left: n, right: n };
}
function Ma(t, e) {
  if (t.height == 0)
    return t;
  let n = e ? t.top : t.bottom;
  return { top: n, bottom: n, left: t.left, right: t.right };
}
function kg(t, e, n) {
  let r = t.state, i = t.root.activeElement;
  r != e && t.updateState(e), i != t.dom && t.focus();
  try {
    return n();
  } finally {
    r != e && t.updateState(r), i != t.dom && i && i.focus();
  }
}
function MS(t, e, n) {
  let r = e.selection, i = n == "up" ? r.$from : r.$to;
  return kg(t, e, () => {
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
    let s = yg(t, i.pos, 1);
    for (let l = o.firstChild; l; l = l.nextSibling) {
      let a;
      if (l.nodeType == 1)
        a = l.getClientRects();
      else if (l.nodeType == 3)
        a = Cn(l, 0, l.nodeValue.length).getClientRects();
      else
        continue;
      for (let c = 0; c < a.length; c++) {
        let u = a[c];
        if (u.bottom > u.top + 1 && (n == "up" ? s.top - u.top > (u.bottom - s.top) * 2 : u.bottom - s.bottom > (s.bottom - u.top) * 2))
          return !1;
      }
    }
    return !0;
  });
}
const TS = /[\u0590-\u08ac]/;
function NS(t, e, n) {
  let { $head: r } = e.selection;
  if (!r.parent.isTextblock)
    return !1;
  let i = r.parentOffset, o = !i, s = i == r.parent.content.size, l = t.domSelection();
  return l ? !TS.test(r.parent.textContent) || !l.modify ? n == "left" || n == "backward" ? o : s : kg(t, e, () => {
    let { focusNode: a, focusOffset: c, anchorNode: u, anchorOffset: f } = t.domSelectionRange(), d = l.caretBidiLevel;
    l.modify("move", n, "character");
    let h = r.depth ? t.docView.domAfterPos(r.before()) : t.dom, { focusNode: m, focusOffset: b } = t.domSelectionRange(), C = m && !h.contains(m.nodeType == 1 ? m : m.parentNode) || a == m && c == b;
    try {
      l.collapse(u, f), a && (a != u || c != f) && l.extend && l.extend(a, c);
    } catch {
    }
    return d != null && (l.caretBidiLevel = d), C;
  }) : r.pos == r.start() || r.pos == r.end();
}
let uh = null, fh = null, dh = !1;
function ES(t, e, n) {
  return uh == e && fh == n ? dh : (uh = e, fh = n, dh = n == "up" || n == "down" ? MS(t, e, n) : NS(t, e, n));
}
const qt = 0, hh = 1, Tr = 2, ln = 3;
class ks {
  constructor(e, n, r, i) {
    this.parent = e, this.children = n, this.dom = r, this.contentDOM = i, this.dirty = qt, r.pmViewDesc = this;
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
      i = n > Qe(this.contentDOM);
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
      if (l > e || s instanceof wg) {
        i = e - o;
        break;
      }
      o = l;
    }
    if (i)
      return this.children[r].domFromPos(i - this.children[r].border, n);
    for (let o; r && !(o = this.children[r - 1]).size && o instanceof bg && o.side >= 0; r--)
      ;
    if (n <= 0) {
      let o, s = !0;
      for (; o = r ? this.children[r - 1] : null, !(!o || o.dom.parentNode == this.contentDOM); r--, s = !1)
        ;
      return o && n && s && !o.border && !o.domAtom ? o.domFromPos(o.size, n) : { node: this.contentDOM, offset: o ? Qe(o.dom) + 1 : 0 };
    } else {
      let o, s = !0;
      for (; o = r < this.children.length ? this.children[r] : null, !(!o || o.dom.parentNode == this.contentDOM); r++, s = !1)
        ;
      return o && s && !o.border && !o.domAtom ? o.domFromPos(0, n) : { node: this.contentDOM, offset: o ? Qe(o.dom) : this.contentDOM.childNodes.length };
    }
  }
  // Used to find a DOM range in a single parent for a given changed
  // range.
  parseRange(e, n, r = 0) {
    if (this.children.length == 0)
      return { node: this.contentDOM, from: e, to: n, fromOffset: 0, toOffset: this.contentDOM.childNodes.length };
    let i = -1, o = -1;
    for (let s = r, l = 0; ; l++) {
      let a = this.children[l], c = s + a.size;
      if (i == -1 && e <= c) {
        let u = s + a.border;
        if (e >= u && n <= c - a.border && a.node && a.contentDOM && this.contentDOM.contains(a.contentDOM))
          return a.parseRange(e, n, u);
        e = s;
        for (let f = l; f > 0; f--) {
          let d = this.children[f - 1];
          if (d.size && d.dom.parentNode == this.contentDOM && !d.emptyChildAt(1)) {
            i = Qe(d.dom) + 1;
            break;
          }
          e -= d.size;
        }
        i == -1 && (i = 0);
      }
      if (i > -1 && (c > n || l == this.children.length - 1)) {
        n = c;
        for (let u = l + 1; u < this.children.length; u++) {
          let f = this.children[u];
          if (f.size && f.dom.parentNode == this.contentDOM && !f.emptyChildAt(-1)) {
            o = Qe(f.dom);
            break;
          }
          n += f.size;
        }
        o == -1 && (o = this.contentDOM.childNodes.length);
        break;
      }
      s = c;
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
    for (let h = 0, m = 0; h < this.children.length; h++) {
      let b = this.children[h], C = m + b.size;
      if (o > m && s < C)
        return b.setSelection(e - m - b.border, n - m - b.border, r, i);
      m = C;
    }
    let l = this.domFromPos(e, e ? -1 : 1), a = n == e ? l : this.domFromPos(n, n ? -1 : 1), c = r.root.getSelection(), u = r.domSelectionRange(), f = !1;
    if ((Wt || it) && e == n) {
      let { node: h, offset: m } = l;
      if (h.nodeType == 3) {
        if (f = !!(m && h.nodeValue[m - 1] == `
`), f && m == h.nodeValue.length)
          for (let b = h, C; b; b = b.parentNode) {
            if (C = b.nextSibling) {
              C.nodeName == "BR" && (l = a = { node: C.parentNode, offset: Qe(C) + 1 });
              break;
            }
            let x = b.pmViewDesc;
            if (x && x.node && x.node.isBlock)
              break;
          }
      } else {
        let b = h.childNodes[m - 1];
        f = b && (b.nodeName == "BR" || b.contentEditable == "false");
      }
    }
    if (Wt && u.focusNode && u.focusNode != a.node && u.focusNode.nodeType == 1) {
      let h = u.focusNode.childNodes[u.focusOffset];
      h && h.contentEditable == "false" && (i = !0);
    }
    if (!(i || f && it) && Xr(l.node, l.offset, u.anchorNode, u.anchorOffset) && Xr(a.node, a.offset, u.focusNode, u.focusOffset))
      return;
    let d = !1;
    if ((c.extend || e == n) && !(f && Wt)) {
      c.collapse(l.node, l.offset);
      try {
        e != n && c.extend(a.node, a.offset), d = !0;
      } catch {
      }
    }
    if (!d) {
      if (e > n) {
        let m = l;
        l = a, a = m;
      }
      let h = document.createRange();
      h.setEnd(a.node, a.offset), h.setStart(l.node, l.offset), c.removeAllRanges(), c.addRange(h);
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
          this.dirty = e == r || n == s ? Tr : hh, e == l && n == a && (o.contentLost || o.dom.parentNode != this.contentDOM) ? o.dirty = ln : o.markDirty(e - l, n - l);
          return;
        } else
          o.dirty = o.dom == o.contentDOM && o.dom.parentNode == this.contentDOM && !o.children.length ? Tr : ln;
      }
      r = s;
    }
    this.dirty = Tr;
  }
  markParentsDirty() {
    let e = 1;
    for (let n = this.parent; n; n = n.parent, e++) {
      let r = e == 1 ? Tr : hh;
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
class bg extends ks {
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
    return this.dirty == qt && e.type.eq(this.widget.type);
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
class AS extends ks {
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
class Qr extends ks {
  constructor(e, n, r, i, o) {
    super(e, [], r, i), this.mark = n, this.spec = o;
  }
  static create(e, n, r, i) {
    let o = i.nodeViews[n.type.name], s = o && o(n, i, r);
    return (!s || !s.dom) && (s = ni.renderSpec(document, n.type.spec.toDOM(n, r), null, n.attrs)), new Qr(e, n, s.dom, s.contentDOM || s.dom, s);
  }
  parseRule() {
    return this.dirty & ln || this.mark.type.spec.reparseInView ? null : { mark: this.mark.type.name, attrs: this.mark.attrs, contentElement: this.contentDOM };
  }
  matchesMark(e) {
    return this.dirty != ln && this.mark.eq(e);
  }
  markDirty(e, n) {
    if (super.markDirty(e, n), this.dirty != qt) {
      let r = this.parent;
      for (; !r.node; )
        r = r.parent;
      r.dirty < this.dirty && (r.dirty = this.dirty), this.dirty = qt;
    }
  }
  slice(e, n, r) {
    let i = Qr.create(this.parent, this.mark, !0, r), o = this.children, s = this.size;
    n < s && (o = Tc(o, n, s, r)), e > 0 && (o = Tc(o, 0, e, r));
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
class ur extends ks {
  constructor(e, n, r, i, o, s, l, a, c) {
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
    let l = o.nodeViews[n.type.name], a, c = l && l(n, o, () => {
      if (!a)
        return s;
      if (a.parent)
        return a.parent.posBeforeChild(a);
    }, r, i), u = c && c.dom, f = c && c.contentDOM;
    if (n.isText) {
      if (!u)
        u = document.createTextNode(n.text);
      else if (u.nodeType != 3)
        throw new RangeError("Text must be rendered as a DOM text node");
    } else u || ({ dom: u, contentDOM: f } = ni.renderSpec(document, n.type.spec.toDOM(n), null, n.attrs));
    !f && !n.isText && u.nodeName != "BR" && (u.hasAttribute("contenteditable") || (u.contentEditable = "false"), n.type.spec.draggable && (u.draggable = !0));
    let d = u;
    return u = Sg(u, r, n), c ? a = new IS(e, n, r, i, u, f || null, d, c, o, s + 1) : n.isText ? new Hl(e, n, r, i, u, d, o) : new ur(e, n, r, i, u, f || null, d, o, s + 1);
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
      e.contentElement || (e.getContent = () => z.empty);
    }
    return e;
  }
  matchesNode(e, n, r) {
    return this.dirty == qt && e.eq(this.node) && kl(n, this.outerDeco) && r.eq(this.innerDeco);
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
    let r = this.node.inlineContent, i = n, o = e.composing ? this.localCompositionInfo(e, n) : null, s = o && o.pos > -1 ? o : null, l = o && o.pos < 0, a = new DS(this, s && s.node, e);
    PS(this.node, this.innerDeco, (c, u, f) => {
      c.spec.marks ? a.syncToMarks(c.spec.marks, r, e, u) : c.type.side >= 0 && !f && a.syncToMarks(u == this.node.childCount ? ye.none : this.node.child(u).marks, r, e, u), a.placeWidget(c, e, i);
    }, (c, u, f, d) => {
      a.syncToMarks(c.marks, r, e, d);
      let h;
      a.findNodeMatch(c, u, f, d) || l && e.state.selection.from > i && e.state.selection.to < i + c.nodeSize && (h = a.findIndexWithChild(o.node)) > -1 && a.updateNodeAt(c, u, f, h, e) || a.updateNextNode(c, u, f, e, d, i) || a.addNode(c, u, f, e, i), i += c.nodeSize;
    }), a.syncToMarks([], r, e, 0), this.node.isTextblock && a.addTextblockHacks(), a.destroyRest(), (a.changed || this.dirty == Tr) && (s && this.protectLocalComposition(e, s), xg(this.contentDOM, this.children, e), Ki && zS(this.dom));
  }
  localCompositionInfo(e, n) {
    let { from: r, to: i } = e.state.selection;
    if (!(e.state.selection instanceof ee) || r < n || i > n + this.node.content.size)
      return null;
    let o = e.input.compositionNode;
    if (!o || !this.dom.contains(o.parentNode))
      return null;
    if (this.node.inlineContent) {
      let s = o.nodeValue, l = BS(this.node.content, s, r - n, i - n);
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
    let s = new AS(this, o, n, i);
    e.input.compositionNodes.push(s), this.children = Tc(this.children, r, r + i.length, e, s);
  }
  // If this desc must be updated to match the given node decoration,
  // do so and return true.
  update(e, n, r, i) {
    return this.dirty == ln || !e.sameMarkup(this.node) ? !1 : (this.updateInner(e, n, r, i), !0);
  }
  updateInner(e, n, r, i) {
    this.updateOuterDeco(n), this.node = e, this.innerDeco = r, this.contentDOM && this.updateChildren(i, this.posAtStart), this.dirty = qt;
  }
  updateOuterDeco(e) {
    if (kl(e, this.outerDeco))
      return;
    let n = this.nodeDOM.nodeType != 1, r = this.dom;
    this.dom = Cg(this.dom, this.nodeDOM, Mc(this.outerDeco, this.node, n), Mc(e, this.node, n)), this.dom != r && (r.pmViewDesc = void 0, this.dom.pmViewDesc = this), this.outerDeco = e;
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
function ph(t, e, n, r, i) {
  Sg(r, e, t);
  let o = new ur(void 0, t, e, n, r, r, r, i, 0);
  return o.contentDOM && o.updateChildren(i, 0), o;
}
class Hl extends ur {
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
    return this.dirty == ln || this.dirty != qt && !this.inParent() || !e.sameMarkup(this.node) ? !1 : (this.updateOuterDeco(n), (this.dirty != qt || e.text != this.node.text) && e.text != this.nodeDOM.nodeValue && (this.nodeDOM.nodeValue = e.text, i.trackWrites == this.nodeDOM && (i.trackWrites = null)), this.node = e, this.dirty = qt, !0);
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
    return new Hl(this.parent, i, this.outerDeco, this.innerDeco, o, o, r);
  }
  markDirty(e, n) {
    super.markDirty(e, n), this.dom != this.nodeDOM && (e == 0 || n == this.nodeDOM.nodeValue.length) && (this.dirty = ln);
  }
  get domAtom() {
    return !1;
  }
  isText(e) {
    return this.node.text == e;
  }
}
class wg extends ks {
  parseRule() {
    return { ignore: !0 };
  }
  matchesHack(e) {
    return this.dirty == qt && this.dom.nodeName == e;
  }
  get domAtom() {
    return !0;
  }
  get ignoreForCoords() {
    return this.dom.nodeName == "IMG";
  }
}
class IS extends ur {
  constructor(e, n, r, i, o, s, l, a, c, u) {
    super(e, n, r, i, o, s, l, c, u), this.spec = a;
  }
  // A custom `update` method gets to decide whether the update goes
  // through. If it does, and there's a `contentDOM` node, our logic
  // updates the children.
  update(e, n, r, i) {
    if (this.dirty == ln)
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
function xg(t, e, n) {
  let r = t.firstChild, i = !1;
  for (let o = 0; o < e.length; o++) {
    let s = e[o], l = s.dom;
    if (l.parentNode == t) {
      for (; l != r; )
        r = mh(r), i = !0;
      r = r.nextSibling;
    } else
      i = !0, t.insertBefore(l, r);
    if (s instanceof Qr) {
      let a = r ? r.previousSibling : t.lastChild;
      xg(s.contentDOM, s.children, n), r = a ? a.nextSibling : t.firstChild;
    }
  }
  for (; r; )
    r = mh(r), i = !0;
  i && n.trackWrites == t && (n.trackWrites = null);
}
const To = function(t) {
  t && (this.nodeName = t);
};
To.prototype = /* @__PURE__ */ Object.create(null);
const Nr = [new To()];
function Mc(t, e, n) {
  if (t.length == 0)
    return Nr;
  let r = n ? Nr[0] : new To(), i = [r];
  for (let o = 0; o < t.length; o++) {
    let s = t[o].type.attrs;
    if (s) {
      s.nodeName && i.push(r = new To(s.nodeName));
      for (let l in s) {
        let a = s[l];
        a != null && (n && i.length == 1 && i.push(r = new To(e.isInline ? "span" : "div")), l == "class" ? r.class = (r.class ? r.class + " " : "") + a : l == "style" ? r.style = (r.style ? r.style + ";" : "") + a : l != "nodeName" && (r[l] = a));
      }
    }
  }
  return i;
}
function Cg(t, e, n, r) {
  if (n == Nr && r == Nr)
    return e;
  let i = e;
  for (let o = 0; o < r.length; o++) {
    let s = r[o], l = n[o];
    if (o) {
      let a;
      l && l.nodeName == s.nodeName && i != t && (a = i.parentNode) && a.nodeName.toLowerCase() == s.nodeName || (a = document.createElement(s.nodeName), a.pmIsDeco = !0, a.appendChild(i), l = Nr[0]), i = a;
    }
    OS(i, l || Nr[0], s);
  }
  return i;
}
function OS(t, e, n) {
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
function Sg(t, e, n) {
  return Cg(t, t, Nr, Mc(e, n, t.nodeType != 1));
}
function kl(t, e) {
  if (t.length != e.length)
    return !1;
  for (let n = 0; n < t.length; n++)
    if (!t[n].type.eq(e[n].type))
      return !1;
  return !0;
}
function mh(t) {
  let e = t.nextSibling;
  return t.parentNode.removeChild(t), e;
}
class DS {
  constructor(e, n, r) {
    this.lock = n, this.view = r, this.index = 0, this.stack = [], this.changed = !1, this.top = e, this.preMatch = RS(e.node.content, e);
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
      this.destroyRest(), this.top.dirty = qt, this.index = this.stack.pop(), this.top = this.stack.pop(), s--;
    for (; s < e.length; ) {
      this.stack.push(this.top, this.index + 1);
      let a = -1, c = this.top.children.length;
      i < this.preMatch.index && (c = Math.min(this.index + 3, c));
      for (let u = this.index; u < c; u++) {
        let f = this.top.children[u];
        if (f.matchesMark(e[s]) && !this.isLocked(f.dom)) {
          a = u;
          break;
        }
      }
      if (a > -1)
        a > this.index && (this.changed = !0, this.destroyBetween(this.index, a)), this.top = this.top.children[this.index];
      else {
        let u = Qr.create(this.top, e[s], n, r);
        this.top.children.splice(this.index, 0, u), this.top = u, this.changed = !0;
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
        let c = this.top.children[l];
        if (c.matchesNode(e, n, r) && !this.preMatch.matched.has(c)) {
          o = l;
          break;
        }
      }
    return o < 0 ? !1 : (this.destroyBetween(this.index, o), this.index++, !0);
  }
  updateNodeAt(e, n, r, i, o) {
    let s = this.top.children[i];
    return s.dirty == ln && s.dom == s.contentDOM && (s.dirty = Tr), s.update(e, n, r, o) ? (this.destroyBetween(this.index, i), this.index++, !0) : !1;
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
      if (a instanceof ur) {
        let c = this.preMatch.matched.get(a);
        if (c != null && c != o)
          return !1;
        let u = a.dom, f, d = this.isLocked(u) && !(e.isText && a.node && a.node.isText && a.nodeDOM.nodeValue == e.text && a.dirty != ln && kl(n, a.outerDeco));
        if (!d && a.update(e, n, r, i))
          return this.destroyBetween(this.index, l), a.dom != u && (this.changed = !0), this.index++, !0;
        if (!d && (f = this.recreateWrapper(a, e, n, r, i, s)))
          return this.destroyBetween(this.index, l), this.top.children[this.index] = f, f.contentDOM && (f.dirty = Tr, f.updateChildren(i, s + 1), f.dirty = qt), this.changed = !0, this.index++, !0;
        break;
      }
    }
    return !1;
  }
  // When a node with content is replaced by a different node with
  // identical content, move over its children.
  recreateWrapper(e, n, r, i, o, s) {
    if (e.dirty || n.isAtom || !e.children.length || !e.node.content.eq(n.content) || !kl(r, e.outerDeco) || !i.eq(e.innerDeco))
      return null;
    let l = ur.create(this.top, n, r, i, o, s);
    if (l.contentDOM) {
      l.children = e.children, e.children = [];
      for (let a of l.children)
        a.parent = l;
    }
    return e.destroy(), l;
  }
  // Insert the node as a newly created node desc.
  addNode(e, n, r, i, o) {
    let s = ur.create(this.top, e, n, r, i, o);
    s.contentDOM && s.updateChildren(i, o + 1), this.top.children.splice(this.index++, 0, s), this.changed = !0;
  }
  placeWidget(e, n, r) {
    let i = this.index < this.top.children.length ? this.top.children[this.index] : null;
    if (i && i.matchesWidget(e) && (e == i.widget || !i.widget.type.toDOM.parentNode))
      this.index++;
    else {
      let o = new bg(this.top, e, n, r);
      this.top.children.splice(this.index++, 0, o), this.changed = !0;
    }
  }
  // Make sure a textblock looks and behaves correctly in
  // contentEditable.
  addTextblockHacks() {
    let e = this.top.children[this.index - 1], n = this.top;
    for (; e instanceof Qr; )
      n = e, e = n.children[n.children.length - 1];
    (!e || // Empty textblock
    !(e instanceof Hl) || /\n$/.test(e.node.text) || this.view.requiresGeckoHackNode && /\s$/.test(e.node.text)) && ((it || Ze) && e && e.dom.contentEditable == "false" && this.addHackNode("IMG", n), this.addHackNode("BR", this.top));
  }
  addHackNode(e, n) {
    if (n == this.top && this.index < n.children.length && n.children[this.index].matchesHack(e))
      this.index++;
    else {
      let r = document.createElement(e);
      e == "IMG" && (r.className = "ProseMirror-separator", r.alt = ""), e == "BR" && (r.className = "ProseMirror-trailingBreak");
      let i = new wg(this.top, [], r, null);
      n != this.top ? n.children.push(i) : n.children.splice(this.index++, 0, i), this.changed = !0;
    }
  }
  isLocked(e) {
    return this.lock && (e == this.lock || e.nodeType == 1 && e.contains(this.lock.parentNode));
  }
}
function RS(t, e) {
  let n = e, r = n.children.length, i = t.childCount, o = /* @__PURE__ */ new Map(), s = [];
  e: for (; i > 0; ) {
    let l;
    for (; ; )
      if (r) {
        let c = n.children[r - 1];
        if (c instanceof Qr)
          n = c, r = c.children.length;
        else {
          l = c, r--;
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
function LS(t, e) {
  return t.type.side - e.type.side;
}
function PS(t, e, n, r) {
  let i = e.locals(t), o = 0;
  if (i.length == 0) {
    for (let c = 0; c < t.childCount; c++) {
      let u = t.child(c);
      r(u, i, e.forChild(o, u), c), o += u.nodeSize;
    }
    return;
  }
  let s = 0, l = [], a = null;
  for (let c = 0; ; ) {
    let u, f;
    for (; s < i.length && i[s].to == o; ) {
      let C = i[s++];
      C.widget && (u ? (f || (f = [u])).push(C) : u = C);
    }
    if (u)
      if (f) {
        f.sort(LS);
        for (let C = 0; C < f.length; C++)
          n(f[C], c, !!a);
      } else
        n(u, c, !!a);
    let d, h;
    if (a)
      h = -1, d = a, a = null;
    else if (c < t.childCount)
      h = c, d = t.child(c++);
    else
      break;
    for (let C = 0; C < l.length; C++)
      l[C].to <= o && l.splice(C--, 1);
    for (; s < i.length && i[s].from <= o && i[s].to > o; )
      l.push(i[s++]);
    let m = o + d.nodeSize;
    if (d.isText) {
      let C = m;
      s < i.length && i[s].from < C && (C = i[s].from);
      for (let x = 0; x < l.length; x++)
        l[x].to < C && (C = l[x].to);
      C < m && (a = d.cut(C - o), d = d.cut(0, C - o), m = C, h = -1);
    } else
      for (; s < i.length && i[s].to < m; )
        s++;
    let b = d.isInline && !d.isLeaf ? l.filter((C) => !C.inline) : l.slice();
    r(d, b, e.forChild(o, d), h), o = m;
  }
}
function zS(t) {
  if (t.nodeName == "UL" || t.nodeName == "OL") {
    let e = t.style.cssText;
    t.style.cssText = e + "; list-style: square !important", window.getComputedStyle(t).listStyle, t.style.cssText = e;
  }
}
function BS(t, e, n, r) {
  for (let i = 0, o = 0; i < t.childCount && o <= r; ) {
    let s = t.child(i++), l = o;
    if (o += s.nodeSize, !s.isText)
      continue;
    let a = s.text;
    for (; i < t.childCount; ) {
      let c = t.child(i++);
      if (o += c.nodeSize, !c.isText)
        break;
      a += c.text;
    }
    if (o >= n) {
      if (o >= r && a.slice(r - e.length - l, r - l) == e)
        return r - e.length;
      let c = l < r ? a.lastIndexOf(e, r - l - 1) : -1;
      if (c >= 0 && c + e.length + l >= n)
        return l + c;
      if (n == r && a.length >= r + e.length - l && a.slice(r - l, r - l + e.length) == e)
        return r;
    }
  }
  return -1;
}
function Tc(t, e, n, r, i) {
  let o = [];
  for (let s = 0, l = 0; s < t.length; s++) {
    let a = t[s], c = l, u = l += a.size;
    c >= n || u <= e ? o.push(a) : (c < e && o.push(a.slice(0, e - c, r)), i && (o.push(i), i = void 0), u > n && o.push(a.slice(n - c, a.size, r)));
  }
  return o;
}
function mu(t, e = null) {
  let n = t.domSelectionRange(), r = t.state.doc;
  if (!n.focusNode)
    return null;
  let i = t.docView.nearestDesc(n.focusNode), o = i && i.size == 0, s = t.docView.posFromDOM(n.focusNode, n.focusOffset, 1);
  if (s < 0)
    return null;
  let l = r.resolve(s), a, c;
  if (Vl(n)) {
    for (a = s; i && !i.node; )
      i = i.parent;
    let f = i.node;
    if (i && f.isAtom && re.isSelectable(f) && i.parent && !(f.isInline && uS(n.focusNode, n.focusOffset, i.dom))) {
      let d = i.posBefore;
      c = new re(s == d ? l : r.resolve(d));
    }
  } else {
    if (n instanceof t.dom.ownerDocument.defaultView.Selection && n.rangeCount > 1) {
      let f = s, d = s;
      for (let h = 0; h < n.rangeCount; h++) {
        let m = n.getRangeAt(h);
        f = Math.min(f, t.docView.posFromDOM(m.startContainer, m.startOffset, 1)), d = Math.max(d, t.docView.posFromDOM(m.endContainer, m.endOffset, -1));
      }
      if (f < 0)
        return null;
      [a, s] = d == t.state.selection.anchor ? [d, f] : [f, d], l = r.resolve(s);
    } else
      a = t.docView.posFromDOM(n.anchorNode, n.anchorOffset, 1);
    if (a < 0)
      return null;
  }
  let u = r.resolve(a);
  if (!c) {
    let f = e == "pointer" || t.state.selection.head < l.pos && !o ? 1 : -1;
    c = gu(t, u, l, f);
  }
  return c;
}
function vg(t) {
  return t.editable ? t.hasFocus() : Tg(t) && document.activeElement && document.activeElement.contains(t.dom);
}
function Ln(t, e = !1) {
  let n = t.state.selection;
  if (Mg(t, n), !!vg(t)) {
    if (!e && t.input.mouseDown && t.input.mouseDown.allowDefault && Ze) {
      let r = t.domSelectionRange(), i = t.domObserver.currentSelection;
      if (r.anchorNode && i.anchorNode && Xr(r.anchorNode, r.anchorOffset, i.anchorNode, i.anchorOffset)) {
        t.input.mouseDown.delayedSelectionSync = !0, t.domObserver.setCurSelection();
        return;
      }
    }
    if (t.domObserver.disconnectSelection(), t.cursorWrapper)
      $S(t);
    else {
      let { anchor: r, head: i } = n, o, s;
      gh && !(n instanceof ee) && (n.$from.parent.inlineContent || (o = yh(t, n.from)), !n.empty && !n.$from.parent.inlineContent && (s = yh(t, n.to))), t.docView.setSelection(r, i, t, e), gh && (o && kh(o), s && kh(s)), n.visible ? t.dom.classList.remove("ProseMirror-hideselection") : (t.dom.classList.add("ProseMirror-hideselection"), "onselectionchange" in document && FS(t));
    }
    t.domObserver.setCurSelection(), t.domObserver.connectSelection();
  }
}
const gh = it || Ze && fg < 63;
function yh(t, e) {
  let { node: n, offset: r } = t.docView.domFromPos(e, 0), i = r < n.childNodes.length ? n.childNodes[r] : null, o = r ? n.childNodes[r - 1] : null;
  if (it && i && i.contentEditable == "false")
    return Ta(i);
  if ((!i || i.contentEditable == "false") && (!o || o.contentEditable == "false")) {
    if (i)
      return Ta(i);
    if (o)
      return Ta(o);
  }
}
function Ta(t) {
  return t.contentEditable = "true", it && t.draggable && (t.draggable = !1, t.wasDraggable = !0), t;
}
function kh(t) {
  t.contentEditable = "false", t.wasDraggable && (t.draggable = !0, t.wasDraggable = null);
}
function FS(t) {
  let e = t.dom.ownerDocument;
  e.removeEventListener("selectionchange", t.input.hideSelectionGuard);
  let n = t.domSelectionRange(), r = n.anchorNode, i = n.anchorOffset;
  e.addEventListener("selectionchange", t.input.hideSelectionGuard = () => {
    (n.anchorNode != r || n.anchorOffset != i) && (e.removeEventListener("selectionchange", t.input.hideSelectionGuard), setTimeout(() => {
      (!vg(t) || t.state.selection.visible) && t.dom.classList.remove("ProseMirror-hideselection");
    }, 20));
  });
}
function $S(t) {
  let e = t.domSelection();
  if (!e)
    return;
  let n = t.cursorWrapper.dom, r = n.nodeName == "IMG";
  r ? e.collapse(n.parentNode, Qe(n) + 1) : e.collapse(n, 0), !r && !t.state.selection.visible && bt && cr <= 11 && (n.disabled = !0, n.disabled = !1);
}
function Mg(t, e) {
  if (e instanceof re) {
    let n = t.docView.descAt(e.from);
    n != t.lastSelectedViewDesc && (bh(t), n && n.selectNode(), t.lastSelectedViewDesc = n);
  } else
    bh(t);
}
function bh(t) {
  t.lastSelectedViewDesc && (t.lastSelectedViewDesc.parent && t.lastSelectedViewDesc.deselectNode(), t.lastSelectedViewDesc = void 0);
}
function gu(t, e, n, r) {
  return t.someProp("createSelectionBetween", (i) => i(t, e, n)) || ee.between(e, n, r);
}
function wh(t) {
  return t.editable && !t.hasFocus() ? !1 : Tg(t);
}
function Tg(t) {
  let e = t.domSelectionRange();
  if (!e.anchorNode)
    return !1;
  try {
    return t.dom.contains(e.anchorNode.nodeType == 3 ? e.anchorNode.parentNode : e.anchorNode) && (t.editable || t.dom.contains(e.focusNode.nodeType == 3 ? e.focusNode.parentNode : e.focusNode));
  } catch {
    return !1;
  }
}
function _S(t) {
  let e = t.docView.domFromPos(t.state.selection.anchor, 0), n = t.domSelectionRange();
  return Xr(e.node, e.offset, n.anchorNode, n.anchorOffset);
}
function Nc(t, e) {
  let { $anchor: n, $head: r } = t.selection, i = e > 0 ? n.max(r) : n.min(r), o = i.parent.inlineContent ? i.depth ? t.doc.resolve(e > 0 ? i.after() : i.before()) : null : i;
  return o && se.findFrom(o, e);
}
function Xn(t, e) {
  return t.dispatch(t.state.tr.setSelection(e).scrollIntoView()), !0;
}
function xh(t, e, n) {
  let r = t.state.selection;
  if (r instanceof ee)
    if (n.indexOf("s") > -1) {
      let { $head: i } = r, o = i.textOffset ? null : e < 0 ? i.nodeBefore : i.nodeAfter;
      if (!o || o.isText || !o.isLeaf)
        return !1;
      let s = t.state.doc.resolve(i.pos + o.nodeSize * (e < 0 ? -1 : 1));
      return Xn(t, new ee(r.$anchor, s));
    } else if (r.empty) {
      if (t.endOfTextblock(e > 0 ? "forward" : "backward")) {
        let i = Nc(t.state, e);
        return i && i instanceof re ? Xn(t, i) : !1;
      } else if (!(Vt && n.indexOf("m") > -1)) {
        let i = r.$head, o = i.textOffset ? null : e < 0 ? i.nodeBefore : i.nodeAfter, s;
        if (!o || o.isText)
          return !1;
        let l = e < 0 ? i.pos - o.nodeSize : i.pos;
        return o.isAtom || (s = t.docView.descAt(l)) && !s.contentDOM ? re.isSelectable(o) ? Xn(t, new re(e < 0 ? t.state.doc.resolve(i.pos - o.nodeSize) : i)) : ys ? Xn(t, new ee(t.state.doc.resolve(e < 0 ? l : l + o.nodeSize))) : !1 : !1;
      }
    } else return !1;
  else {
    if (r instanceof re && r.node.isInline)
      return Xn(t, new ee(e > 0 ? r.$to : r.$from));
    {
      let i = Nc(t.state, e);
      return i ? Xn(t, i) : !1;
    }
  }
}
function bl(t) {
  return t.nodeType == 3 ? t.nodeValue.length : t.childNodes.length;
}
function No(t, e) {
  let n = t.pmViewDesc;
  return n && n.size == 0 && (e < 0 || t.nextSibling || t.nodeName != "BR");
}
function ui(t, e) {
  return e < 0 ? VS(t) : HS(t);
}
function VS(t) {
  let e = t.domSelectionRange(), n = e.focusNode, r = e.focusOffset;
  if (!n)
    return;
  let i, o, s = !1;
  for (Wt && n.nodeType == 1 && r < bl(n) && No(n.childNodes[r], -1) && (s = !0); ; )
    if (r > 0) {
      if (n.nodeType != 1)
        break;
      {
        let l = n.childNodes[r - 1];
        if (No(l, -1))
          i = n, o = --r;
        else if (l.nodeType == 3)
          n = l, r = n.nodeValue.length;
        else
          break;
      }
    } else {
      if (Ng(n))
        break;
      {
        let l = n.previousSibling;
        for (; l && No(l, -1); )
          i = n.parentNode, o = Qe(l), l = l.previousSibling;
        if (l)
          n = l, r = bl(n);
        else {
          if (n = n.parentNode, n == t.dom)
            break;
          r = 0;
        }
      }
    }
  s ? Ec(t, n, r) : i && Ec(t, i, o);
}
function HS(t) {
  let e = t.domSelectionRange(), n = e.focusNode, r = e.focusOffset;
  if (!n)
    return;
  let i = bl(n), o, s;
  for (; ; )
    if (r < i) {
      if (n.nodeType != 1)
        break;
      let l = n.childNodes[r];
      if (No(l, 1))
        o = n, s = ++r;
      else
        break;
    } else {
      if (Ng(n))
        break;
      {
        let l = n.nextSibling;
        for (; l && No(l, 1); )
          o = l.parentNode, s = Qe(l) + 1, l = l.nextSibling;
        if (l)
          n = l, r = 0, i = bl(n);
        else {
          if (n = n.parentNode, n == t.dom)
            break;
          r = i = 0;
        }
      }
    }
  o && Ec(t, o, s);
}
function Ng(t) {
  let e = t.pmViewDesc;
  return e && e.node && e.node.isBlock;
}
function jS(t, e) {
  for (; t && e == t.childNodes.length && !gs(t); )
    e = Qe(t) + 1, t = t.parentNode;
  for (; t && e < t.childNodes.length; ) {
    let n = t.childNodes[e];
    if (n.nodeType == 3)
      return n;
    if (n.nodeType == 1 && n.contentEditable == "false")
      break;
    t = n, e = 0;
  }
}
function WS(t, e) {
  for (; t && !e && !gs(t); )
    e = Qe(t), t = t.parentNode;
  for (; t && e; ) {
    let n = t.childNodes[e - 1];
    if (n.nodeType == 3)
      return n;
    if (n.nodeType == 1 && n.contentEditable == "false")
      break;
    t = n, e = t.childNodes.length;
  }
}
function Ec(t, e, n) {
  if (e.nodeType != 3) {
    let o, s;
    (s = jS(e, n)) ? (e = s, n = 0) : (o = WS(e, n)) && (e = o, n = o.nodeValue.length);
  }
  let r = t.domSelection();
  if (!r)
    return;
  if (Vl(r)) {
    let o = document.createRange();
    o.setEnd(e, n), o.setStart(e, n), r.removeAllRanges(), r.addRange(o);
  } else r.extend && r.extend(e, n);
  t.domObserver.setCurSelection();
  let { state: i } = t;
  setTimeout(() => {
    t.state == i && Ln(t);
  }, 50);
}
function Ch(t, e) {
  let n = t.state.doc.resolve(e);
  if (!(Ze || dg) && n.parent.inlineContent) {
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
function Sh(t, e, n) {
  let r = t.state.selection;
  if (r instanceof ee && !r.empty || n.indexOf("s") > -1 || Vt && n.indexOf("m") > -1)
    return !1;
  let { $from: i, $to: o } = r;
  if (!i.parent.inlineContent || t.endOfTextblock(e < 0 ? "up" : "down")) {
    let s = Nc(t.state, e);
    if (s && s instanceof re)
      return Xn(t, s);
  }
  if (!i.parent.inlineContent) {
    let s = e < 0 ? i : o, l = r instanceof Dt ? se.near(s, e) : se.findFrom(s, e);
    return l ? Xn(t, l) : !1;
  }
  return !1;
}
function vh(t, e) {
  if (!(t.state.selection instanceof ee))
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
function Mh(t, e, n) {
  t.domObserver.stop(), e.contentEditable = n, t.domObserver.start();
}
function qS(t) {
  if (!it || t.state.selection.$head.parentOffset > 0)
    return !1;
  let { focusNode: e, focusOffset: n } = t.domSelectionRange();
  if (e && e.nodeType == 1 && n == 0 && e.firstChild && e.firstChild.contentEditable == "false") {
    let r = e.firstChild;
    Mh(t, r, "true"), setTimeout(() => Mh(t, r, "false"), 20);
  }
  return !1;
}
function KS(t) {
  let e = "";
  return t.ctrlKey && (e += "c"), t.metaKey && (e += "m"), t.altKey && (e += "a"), t.shiftKey && (e += "s"), e;
}
function US(t, e) {
  let n = e.keyCode, r = KS(e);
  if (n == 8 || Vt && n == 72 && r == "c")
    return vh(t, -1) || ui(t, -1);
  if (n == 46 && !e.shiftKey || Vt && n == 68 && r == "c")
    return vh(t, 1) || ui(t, 1);
  if (n == 13 || n == 27)
    return !0;
  if (n == 37 || Vt && n == 66 && r == "c") {
    let i = n == 37 ? Ch(t, t.state.selection.from) == "ltr" ? -1 : 1 : -1;
    return xh(t, i, r) || ui(t, i);
  } else if (n == 39 || Vt && n == 70 && r == "c") {
    let i = n == 39 ? Ch(t, t.state.selection.from) == "ltr" ? 1 : -1 : 1;
    return xh(t, i, r) || ui(t, i);
  } else {
    if (n == 38 || Vt && n == 80 && r == "c")
      return Sh(t, -1, r) || ui(t, -1);
    if (n == 40 || Vt && n == 78 && r == "c")
      return qS(t) || Sh(t, 1, r) || ui(t, 1);
    if (r == (Vt ? "m" : "c") && (n == 66 || n == 73 || n == 89 || n == 90))
      return !0;
  }
  return !1;
}
function yu(t, e) {
  t.someProp("transformCopied", (h) => {
    e = h(e, t);
  });
  let n = [], { content: r, openStart: i, openEnd: o } = e;
  for (; i > 1 && o > 1 && r.childCount == 1 && r.firstChild.childCount == 1; ) {
    i--, o--;
    let h = r.firstChild;
    n.push(h.type.name, h.attrs != h.type.defaultAttrs ? h.attrs : null), r = h.content;
  }
  let s = t.someProp("clipboardSerializer") || ni.fromSchema(t.state.schema), l = Rg(), a = l.createElement("div");
  a.appendChild(s.serializeFragment(r, { document: l }));
  let c = a.firstChild, u, f = 0;
  for (; c && c.nodeType == 1 && (u = Dg[c.nodeName.toLowerCase()]); ) {
    for (let h = u.length - 1; h >= 0; h--) {
      let m = l.createElement(u[h]);
      for (; a.firstChild; )
        m.appendChild(a.firstChild);
      a.appendChild(m), f++;
    }
    c = a.firstChild;
  }
  c && c.nodeType == 1 && c.setAttribute("data-pm-slice", `${i} ${o}${f ? ` -${f}` : ""} ${JSON.stringify(n)}`);
  let d = t.someProp("clipboardTextSerializer", (h) => h(e, t)) || e.content.textBetween(0, e.content.size, `

`);
  return { dom: a, text: d, slice: e };
}
function Eg(t, e, n, r, i) {
  let o = i.parent.type.spec.code, s, l;
  if (!n && !e)
    return null;
  let a = !!e && (r || o || !n);
  if (a) {
    if (t.someProp("transformPastedText", (d) => {
      e = d(e, o || r, t);
    }), o)
      return l = new H(z.from(t.state.schema.text(e.replace(/\r\n?/g, `
`))), 0, 0), t.someProp("transformPasted", (d) => {
        l = d(l, t, !0);
      }), l;
    let f = t.someProp("clipboardTextParser", (d) => d(e, i, r, t));
    if (f)
      l = f;
    else {
      let d = i.marks(), { schema: h } = t.state, m = ni.fromSchema(h);
      s = document.createElement("div"), e.split(/(?:\r\n?|\n)+/).forEach((b) => {
        let C = s.appendChild(document.createElement("p"));
        b && C.appendChild(m.serializeNode(h.text(b, d)));
      });
    }
  } else
    t.someProp("transformPastedHTML", (f) => {
      n = f(n, t);
    }), s = XS(n), ys && QS(s);
  let c = s && s.querySelector("[data-pm-slice]"), u = c && /^(\d+) (\d+)(?: -(\d+))? (.*)/.exec(c.getAttribute("data-pm-slice") || "");
  if (u && u[3])
    for (let f = +u[3]; f > 0; f--) {
      let d = s.firstChild;
      for (; d && d.nodeType != 1; )
        d = d.nextSibling;
      if (!d)
        break;
      s = d;
    }
  if (l || (l = (t.someProp("clipboardParser") || t.someProp("domParser") || ru.fromSchema(t.state.schema)).parseSlice(s, {
    preserveWhitespace: !!(a || u),
    context: i,
    ruleFromNode(d) {
      return d.nodeName == "BR" && !d.nextSibling && d.parentNode && !JS.test(d.parentNode.nodeName) ? { ignore: !0 } : null;
    }
  })), u)
    l = ZS(Th(l, +u[1], +u[2]), u[4]);
  else if (l = H.maxOpen(GS(l.content, i), !0), l.openStart || l.openEnd) {
    let f = 0, d = 0;
    for (let h = l.content.firstChild; f < l.openStart && !h.type.spec.isolating; f++, h = h.firstChild)
      ;
    for (let h = l.content.lastChild; d < l.openEnd && !h.type.spec.isolating; d++, h = h.lastChild)
      ;
    l = Th(l, f, d);
  }
  return t.someProp("transformPasted", (f) => {
    l = f(l, t, a);
  }), l;
}
const JS = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var)$/i;
function GS(t, e) {
  if (t.childCount < 2)
    return t;
  for (let n = e.depth; n >= 0; n--) {
    let i = e.node(n).contentMatchAt(e.index(n)), o, s = [];
    if (t.forEach((l) => {
      if (!s)
        return;
      let a = i.findWrapping(l.type), c;
      if (!a)
        return s = null;
      if (c = s.length && o.length && Ig(a, o, l, s[s.length - 1], 0))
        s[s.length - 1] = c;
      else {
        s.length && (s[s.length - 1] = Og(s[s.length - 1], o.length));
        let u = Ag(l, a);
        s.push(u), i = i.matchType(u.type), o = a;
      }
    }), s)
      return z.from(s);
  }
  return t;
}
function Ag(t, e, n = 0) {
  for (let r = e.length - 1; r >= n; r--)
    t = e[r].create(null, z.from(t));
  return t;
}
function Ig(t, e, n, r, i) {
  if (i < t.length && i < e.length && t[i] == e[i]) {
    let o = Ig(t, e, n, r.lastChild, i + 1);
    if (o)
      return r.copy(r.content.replaceChild(r.childCount - 1, o));
    if (r.contentMatchAt(r.childCount).matchType(i == t.length - 1 ? n.type : t[i + 1]))
      return r.copy(r.content.append(z.from(Ag(n, t, i + 1))));
  }
}
function Og(t, e) {
  if (e == 0)
    return t;
  let n = t.content.replaceChild(t.childCount - 1, Og(t.lastChild, e - 1)), r = t.contentMatchAt(t.childCount).fillBefore(z.empty, !0);
  return t.copy(n.append(r));
}
function Ac(t, e, n, r, i, o) {
  let s = e < 0 ? t.firstChild : t.lastChild, l = s.content;
  return t.childCount > 1 && (o = 0), i < r - 1 && (l = Ac(l, e, n, r, i + 1, o)), i >= n && (l = e < 0 ? s.contentMatchAt(0).fillBefore(l, o <= i).append(l) : l.append(s.contentMatchAt(s.childCount).fillBefore(z.empty, !0))), t.replaceChild(e < 0 ? 0 : t.childCount - 1, s.copy(l));
}
function Th(t, e, n) {
  return e < t.openStart && (t = new H(Ac(t.content, -1, e, t.openStart, 0, t.openEnd), e, t.openEnd)), n < t.openEnd && (t = new H(Ac(t.content, 1, n, t.openEnd, 0, 0), t.openStart, n)), t;
}
const Dg = {
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
let Nh = null;
function Rg() {
  return Nh || (Nh = document.implementation.createHTMLDocument("title"));
}
let Na = null;
function YS(t) {
  let e = window.trustedTypes;
  return e ? (Na || (Na = e.defaultPolicy || e.createPolicy("ProseMirrorClipboard", { createHTML: (n) => n })), Na.createHTML(t)) : t;
}
function XS(t) {
  let e = /^(\s*<meta [^>]*>)*/.exec(t);
  e && (t = t.slice(e[0].length));
  let n = Rg().createElement("div"), r = /<([a-z][^>\s]+)/i.exec(t), i;
  if ((i = r && Dg[r[1].toLowerCase()]) && (t = i.map((o) => "<" + o + ">").join("") + t + i.map((o) => "</" + o + ">").reverse().join("")), n.innerHTML = YS(t), i)
    for (let o = 0; o < i.length; o++)
      n = n.querySelector(i[o]) || n;
  return n;
}
function QS(t) {
  let e = t.querySelectorAll(Ze ? "span:not([class]):not([style])" : "span.Apple-converted-space");
  for (let n = 0; n < e.length; n++) {
    let r = e[n];
    r.childNodes.length == 1 && r.textContent == " " && r.parentNode && r.parentNode.replaceChild(t.ownerDocument.createTextNode(" "), r);
  }
}
function ZS(t, e) {
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
    i = z.from(a.create(r[l + 1], i)), o++, s++;
  }
  return new H(i, o, s);
}
const dt = {}, ht = {}, ev = { touchstart: !0, touchmove: !0 };
class tv {
  constructor() {
    this.shiftKey = !1, this.mouseDown = null, this.lastKeyCode = null, this.lastKeyCodeTime = 0, this.lastClick = { time: 0, x: 0, y: 0, type: "", button: 0 }, this.lastSelectionOrigin = null, this.lastSelectionTime = 0, this.lastIOSEnter = 0, this.lastIOSEnterFallbackTimeout = -1, this.lastFocus = 0, this.lastTouch = 0, this.lastChromeDelete = 0, this.composing = !1, this.compositionNode = null, this.composingTimeout = -1, this.compositionNodes = [], this.compositionEndedAt = -2e8, this.compositionID = 1, this.badSafariComposition = !1, this.compositionPendingChanges = 0, this.domChangeCount = 0, this.eventHandlers = /* @__PURE__ */ Object.create(null), this.hideSelectionGuard = null;
  }
}
function nv(t) {
  for (let e in dt) {
    let n = dt[e];
    t.dom.addEventListener(e, t.input.eventHandlers[e] = (r) => {
      iv(t, r) && !ku(t, r) && (t.editable || !(r.type in ht)) && n(t, r);
    }, ev[e] ? { passive: !0 } : void 0);
  }
  it && t.dom.addEventListener("input", () => null), Ic(t);
}
function lr(t, e) {
  t.input.lastSelectionOrigin = e, t.input.lastSelectionTime = Date.now();
}
function rv(t) {
  t.domObserver.stop();
  for (let e in t.input.eventHandlers)
    t.dom.removeEventListener(e, t.input.eventHandlers[e]);
  clearTimeout(t.input.composingTimeout), clearTimeout(t.input.lastIOSEnterFallbackTimeout);
}
function Ic(t) {
  t.someProp("handleDOMEvents", (e) => {
    for (let n in e)
      t.input.eventHandlers[n] || t.dom.addEventListener(n, t.input.eventHandlers[n] = (r) => ku(t, r));
  });
}
function ku(t, e) {
  return t.someProp("handleDOMEvents", (n) => {
    let r = n[e.type];
    return r ? r(t, e) || e.defaultPrevented : !1;
  });
}
function iv(t, e) {
  if (!e.bubbles)
    return !0;
  if (e.defaultPrevented)
    return !1;
  for (let n = e.target; n != t.dom; n = n.parentNode)
    if (!n || n.nodeType == 11 || n.pmViewDesc && n.pmViewDesc.stopEvent(e))
      return !1;
  return !0;
}
function ov(t, e) {
  !ku(t, e) && dt[e.type] && (t.editable || !(e.type in ht)) && dt[e.type](t, e);
}
ht.keydown = (t, e) => {
  let n = e;
  if (t.input.shiftKey = n.keyCode == 16 || n.shiftKey, !Pg(t, n) && (t.input.lastKeyCode = n.keyCode, t.input.lastKeyCodeTime = Date.now(), !(Dn && Ze && n.keyCode == 13)))
    if (n.keyCode != 229 && t.domObserver.forceFlush(), Ki && n.keyCode == 13 && !n.ctrlKey && !n.altKey && !n.metaKey) {
      let r = Date.now();
      t.input.lastIOSEnter = r, t.input.lastIOSEnterFallbackTimeout = setTimeout(() => {
        t.input.lastIOSEnter == r && (t.someProp("handleKeyDown", (i) => i(t, Mr(13, "Enter"))), t.input.lastIOSEnter = 0);
      }, 200);
    } else t.someProp("handleKeyDown", (r) => r(t, n)) || US(t, n) ? n.preventDefault() : lr(t, "key");
};
ht.keyup = (t, e) => {
  e.keyCode == 16 && (t.input.shiftKey = !1);
};
ht.keypress = (t, e) => {
  let n = e;
  if (Pg(t, n) || !n.charCode || n.ctrlKey && !n.altKey || Vt && n.metaKey)
    return;
  if (t.someProp("handleKeyPress", (i) => i(t, n))) {
    n.preventDefault();
    return;
  }
  let r = t.state.selection;
  if (!(r instanceof ee) || !r.$from.sameParent(r.$to)) {
    let i = String.fromCharCode(n.charCode), o = () => t.state.tr.insertText(i).scrollIntoView();
    !/[\r\n]/.test(i) && !t.someProp("handleTextInput", (s) => s(t, r.$from.pos, r.$to.pos, i, o)) && t.dispatch(o()), n.preventDefault();
  }
};
function jl(t) {
  return { left: t.clientX, top: t.clientY };
}
function sv(t, e) {
  let n = e.x - t.clientX, r = e.y - t.clientY;
  return n * n + r * r < 100;
}
function bu(t, e, n, r, i) {
  if (r == -1)
    return !1;
  let o = t.state.doc.resolve(r);
  for (let s = o.depth + 1; s > 0; s--)
    if (t.someProp(e, (l) => s > o.depth ? l(t, n, o.nodeAfter, o.before(s), i, !0) : l(t, n, o.node(s), o.before(s), i, !1)))
      return !0;
  return !1;
}
function wi(t, e, n) {
  if (t.focused || t.focus(), t.state.selection.eq(e))
    return;
  let r = t.state.tr.setSelection(e);
  r.setMeta("pointer", !0), t.dispatch(r);
}
function lv(t, e) {
  if (e == -1)
    return !1;
  let n = t.state.doc.resolve(e), r = n.nodeAfter;
  return r && r.isAtom && re.isSelectable(r) ? (wi(t, new re(n)), !0) : !1;
}
function av(t, e) {
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
  return i != null ? (wi(t, re.create(t.state.doc, i)), !0) : !1;
}
function cv(t, e, n, r, i) {
  return bu(t, "handleClickOn", e, n, r) || t.someProp("handleClick", (o) => o(t, e, r)) || (i ? av(t, n) : lv(t, n));
}
function uv(t, e, n, r) {
  return bu(t, "handleDoubleClickOn", e, n, r) || t.someProp("handleDoubleClick", (i) => i(t, e, r));
}
function fv(t, e, n, r) {
  return bu(t, "handleTripleClickOn", e, n, r) || t.someProp("handleTripleClick", (i) => i(t, e, r)) || dv(t, n, r);
}
function dv(t, e, n) {
  if (n.button != 0)
    return !1;
  let r = t.state.doc;
  if (e == -1)
    return r.inlineContent ? (wi(t, ee.create(r, 0, r.content.size)), !0) : !1;
  let i = r.resolve(e);
  for (let o = i.depth + 1; o > 0; o--) {
    let s = o > i.depth ? i.nodeAfter : i.node(o), l = i.before(o);
    if (s.inlineContent)
      wi(t, ee.create(r, l + 1, l + 1 + s.content.size));
    else if (re.isSelectable(s))
      wi(t, re.create(r, l));
    else
      continue;
    return !0;
  }
}
function wu(t) {
  return wl(t);
}
const Lg = Vt ? "metaKey" : "ctrlKey";
dt.mousedown = (t, e) => {
  let n = e;
  t.input.shiftKey = n.shiftKey;
  let r = wu(t), i = Date.now(), o = "singleClick";
  i - t.input.lastClick.time < 500 && sv(n, t.input.lastClick) && !n[Lg] && t.input.lastClick.button == n.button && (t.input.lastClick.type == "singleClick" ? o = "doubleClick" : t.input.lastClick.type == "doubleClick" && (o = "tripleClick")), t.input.lastClick = { time: i, x: n.clientX, y: n.clientY, type: o, button: n.button };
  let s = t.posAtCoords(jl(n));
  s && (o == "singleClick" ? (t.input.mouseDown && t.input.mouseDown.done(), t.input.mouseDown = new hv(t, s, n, !!r)) : (o == "doubleClick" ? uv : fv)(t, s.pos, s.inside, n) ? n.preventDefault() : lr(t, "pointer"));
};
class hv {
  constructor(e, n, r, i) {
    this.view = e, this.pos = n, this.event = r, this.flushed = i, this.delayedSelectionSync = !1, this.mightDrag = null, this.startDoc = e.state.doc, this.selectNode = !!r[Lg], this.allowDefault = r.shiftKey;
    let o, s;
    if (n.inside > -1)
      o = e.state.doc.nodeAt(n.inside), s = n.inside;
    else {
      let u = e.state.doc.resolve(n.pos);
      o = u.parent, s = u.depth ? u.before() : 0;
    }
    const l = i ? null : r.target, a = l ? e.docView.nearestDesc(l, !0) : null;
    this.target = a && a.nodeDOM.nodeType == 1 ? a.nodeDOM : null;
    let { selection: c } = e.state;
    r.button == 0 && (o.type.spec.draggable && o.type.spec.selectable !== !1 || c instanceof re && c.from <= s && c.to > s) && (this.mightDrag = {
      node: o,
      pos: s,
      addAttr: !!(this.target && !this.target.draggable),
      setUneditable: !!(this.target && Wt && !this.target.hasAttribute("contentEditable"))
    }), this.target && this.mightDrag && (this.mightDrag.addAttr || this.mightDrag.setUneditable) && (this.view.domObserver.stop(), this.mightDrag.addAttr && (this.target.draggable = !0), this.mightDrag.setUneditable && setTimeout(() => {
      this.view.input.mouseDown == this && this.target.setAttribute("contentEditable", "false");
    }, 20), this.view.domObserver.start()), e.root.addEventListener("mouseup", this.up = this.up.bind(this)), e.root.addEventListener("mousemove", this.move = this.move.bind(this)), lr(e, "pointer");
  }
  done() {
    this.view.root.removeEventListener("mouseup", this.up), this.view.root.removeEventListener("mousemove", this.move), this.mightDrag && this.target && (this.view.domObserver.stop(), this.mightDrag.addAttr && this.target.removeAttribute("draggable"), this.mightDrag.setUneditable && this.target.removeAttribute("contentEditable"), this.view.domObserver.start()), this.delayedSelectionSync && setTimeout(() => Ln(this.view)), this.view.input.mouseDown = null;
  }
  up(e) {
    if (this.done(), !this.view.dom.contains(e.target))
      return;
    let n = this.pos;
    this.view.state.doc != this.startDoc && (n = this.view.posAtCoords(jl(e))), this.updateAllowDefault(e), this.allowDefault || !n ? lr(this.view, "pointer") : cv(this.view, n.pos, n.inside, e, this.selectNode) ? e.preventDefault() : e.button == 0 && (this.flushed || // Safari ignores clicks on draggable elements
    it && this.mightDrag && !this.mightDrag.node.isAtom || // Chrome will sometimes treat a node selection as a
    // cursor, but still report that the node is selected
    // when asked through getSelection. You'll then get a
    // situation where clicking at the point where that
    // (hidden) cursor is doesn't change the selection, and
    // thus doesn't get a reaction from ProseMirror. This
    // works around that.
    Ze && !this.view.state.selection.visible && Math.min(Math.abs(n.pos - this.view.state.selection.from), Math.abs(n.pos - this.view.state.selection.to)) <= 2) ? (wi(this.view, se.near(this.view.state.doc.resolve(n.pos))), e.preventDefault()) : lr(this.view, "pointer");
  }
  move(e) {
    this.updateAllowDefault(e), lr(this.view, "pointer"), e.buttons == 0 && this.done();
  }
  updateAllowDefault(e) {
    !this.allowDefault && (Math.abs(this.event.x - e.clientX) > 4 || Math.abs(this.event.y - e.clientY) > 4) && (this.allowDefault = !0);
  }
}
dt.touchstart = (t) => {
  t.input.lastTouch = Date.now(), wu(t), lr(t, "pointer");
};
dt.touchmove = (t) => {
  t.input.lastTouch = Date.now(), lr(t, "pointer");
};
dt.contextmenu = (t) => wu(t);
function Pg(t, e) {
  return t.composing ? !0 : it && Math.abs(e.timeStamp - t.input.compositionEndedAt) < 500 ? (t.input.compositionEndedAt = -2e8, !0) : !1;
}
const pv = Dn ? 5e3 : -1;
ht.compositionstart = ht.compositionupdate = (t) => {
  if (!t.composing) {
    t.domObserver.flush();
    let { state: e } = t, n = e.selection.$to;
    if (e.selection instanceof ee && (e.storedMarks || !n.textOffset && n.parentOffset && n.nodeBefore.marks.some((r) => r.type.spec.inclusive === !1) || Ze && dg && mv(t)))
      t.markCursor = t.state.storedMarks || n.marks(), wl(t, !0), t.markCursor = null;
    else if (wl(t, !e.selection.empty), Wt && e.selection.empty && n.parentOffset && !n.textOffset && n.nodeBefore.marks.length) {
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
  zg(t, pv);
};
function mv(t) {
  let { focusNode: e, focusOffset: n } = t.domSelectionRange();
  if (!e || e.nodeType != 1 || n >= e.childNodes.length)
    return !1;
  let r = e.childNodes[n];
  return r.nodeType == 1 && r.contentEditable == "false";
}
ht.compositionend = (t, e) => {
  t.composing && (t.input.composing = !1, t.input.compositionEndedAt = e.timeStamp, t.input.compositionPendingChanges = t.domObserver.pendingRecords().length ? t.input.compositionID : 0, t.input.compositionNode = null, t.input.badSafariComposition ? t.domObserver.forceFlush() : t.input.compositionPendingChanges && Promise.resolve().then(() => t.domObserver.flush()), t.input.compositionID++, zg(t, 20));
};
function zg(t, e) {
  clearTimeout(t.input.composingTimeout), e > -1 && (t.input.composingTimeout = setTimeout(() => wl(t), e));
}
function Bg(t) {
  for (t.composing && (t.input.composing = !1, t.input.compositionEndedAt = yv()); t.input.compositionNodes.length > 0; )
    t.input.compositionNodes.pop().markParentsDirty();
}
function gv(t) {
  let e = t.domSelectionRange();
  if (!e.focusNode)
    return null;
  let n = aS(e.focusNode, e.focusOffset), r = cS(e.focusNode, e.focusOffset);
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
function yv() {
  let t = document.createEvent("Event");
  return t.initEvent("event", !0, !0), t.timeStamp;
}
function wl(t, e = !1) {
  if (!(Dn && t.domObserver.flushingSoon >= 0)) {
    if (t.domObserver.forceFlush(), Bg(t), e || t.docView && t.docView.dirty) {
      let n = mu(t), r = t.state.selection;
      return n && !n.eq(r) ? t.dispatch(t.state.tr.setSelection(n)) : (t.markCursor || e) && !r.$from.node(r.$from.sharedDepth(r.to)).inlineContent ? t.dispatch(t.state.tr.deleteSelection()) : t.updateState(t.state), !0;
    }
    return !1;
  }
}
function kv(t, e) {
  if (!t.dom.parentNode)
    return;
  let n = t.dom.parentNode.appendChild(document.createElement("div"));
  n.appendChild(e), n.style.cssText = "position: fixed; left: -10000px; top: 10px";
  let r = getSelection(), i = document.createRange();
  i.selectNodeContents(e), t.dom.blur(), r.removeAllRanges(), r.addRange(i), setTimeout(() => {
    n.parentNode && n.parentNode.removeChild(n), t.focus();
  }, 50);
}
const Vo = bt && cr < 15 || Ki && hS < 604;
dt.copy = ht.cut = (t, e) => {
  let n = e, r = t.state.selection, i = n.type == "cut";
  if (r.empty)
    return;
  let o = Vo ? null : n.clipboardData, s = r.content(), { dom: l, text: a } = yu(t, s);
  o ? (n.preventDefault(), o.clearData(), o.setData("text/html", l.innerHTML), o.setData("text/plain", a)) : kv(t, l), i && t.dispatch(t.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
};
function bv(t) {
  return t.openStart == 0 && t.openEnd == 0 && t.content.childCount == 1 ? t.content.firstChild : null;
}
function wv(t, e) {
  if (!t.dom.parentNode)
    return;
  let n = t.input.shiftKey || t.state.selection.$from.parent.type.spec.code, r = t.dom.parentNode.appendChild(document.createElement(n ? "textarea" : "div"));
  n || (r.contentEditable = "true"), r.style.cssText = "position: fixed; left: -10000px; top: 10px", r.focus();
  let i = t.input.shiftKey && t.input.lastKeyCode != 45;
  setTimeout(() => {
    t.focus(), r.parentNode && r.parentNode.removeChild(r), n ? Ho(t, r.value, null, i, e) : Ho(t, r.textContent, r.innerHTML, i, e);
  }, 50);
}
function Ho(t, e, n, r, i) {
  let o = Eg(t, e, n, r, t.state.selection.$from);
  if (t.someProp("handlePaste", (a) => a(t, i, o || H.empty)))
    return !0;
  if (!o)
    return !1;
  let s = bv(o), l = s ? t.state.tr.replaceSelectionWith(s, r) : t.state.tr.replaceSelection(o);
  return t.dispatch(l.scrollIntoView().setMeta("paste", !0).setMeta("uiEvent", "paste")), !0;
}
function Fg(t) {
  let e = t.getData("text/plain") || t.getData("Text");
  if (e)
    return e;
  let n = t.getData("text/uri-list");
  return n ? n.replace(/\r?\n/g, " ") : "";
}
ht.paste = (t, e) => {
  let n = e;
  if (t.composing && !Dn)
    return;
  let r = Vo ? null : n.clipboardData, i = t.input.shiftKey && t.input.lastKeyCode != 45;
  r && Ho(t, Fg(r), r.getData("text/html"), i, n) ? n.preventDefault() : wv(t, n);
};
class $g {
  constructor(e, n, r) {
    this.slice = e, this.move = n, this.node = r;
  }
}
const xv = Vt ? "altKey" : "ctrlKey";
function _g(t, e) {
  let n;
  return t.someProp("dragCopies", (r) => {
    n = n || r(e);
  }), n != null ? !n : !e[xv];
}
dt.dragstart = (t, e) => {
  let n = e, r = t.input.mouseDown;
  if (r && r.done(), !n.dataTransfer)
    return;
  let i = t.state.selection, o = i.empty ? null : t.posAtCoords(jl(n)), s;
  if (!(o && o.pos >= i.from && o.pos <= (i instanceof re ? i.to - 1 : i.to))) {
    if (r && r.mightDrag)
      s = re.create(t.state.doc, r.mightDrag.pos);
    else if (n.target && n.target.nodeType == 1) {
      let f = t.docView.nearestDesc(n.target, !0);
      f && f.node.type.spec.draggable && f != t.docView && (s = re.create(t.state.doc, f.posBefore));
    }
  }
  let l = (s || t.state.selection).content(), { dom: a, text: c, slice: u } = yu(t, l);
  (!n.dataTransfer.files.length || !Ze || fg > 120) && n.dataTransfer.clearData(), n.dataTransfer.setData(Vo ? "Text" : "text/html", a.innerHTML), n.dataTransfer.effectAllowed = "copyMove", Vo || n.dataTransfer.setData("text/plain", c), t.dragging = new $g(u, _g(t, n), s);
};
dt.dragend = (t) => {
  let e = t.dragging;
  window.setTimeout(() => {
    t.dragging == e && (t.dragging = null);
  }, 50);
};
ht.dragover = ht.dragenter = (t, e) => e.preventDefault();
ht.drop = (t, e) => {
  try {
    Cv(t, e, t.dragging);
  } finally {
    t.dragging = null;
  }
};
function Cv(t, e, n) {
  if (!e.dataTransfer)
    return;
  let r = t.posAtCoords(jl(e));
  if (!r)
    return;
  let i = t.state.doc.resolve(r.pos), o = n && n.slice;
  o ? t.someProp("transformPasted", (h) => {
    o = h(o, t, !1);
  }) : o = Eg(t, Fg(e.dataTransfer), Vo ? null : e.dataTransfer.getData("text/html"), !1, i);
  let s = !!(n && _g(t, e));
  if (t.someProp("handleDrop", (h) => h(t, e, o || H.empty, s))) {
    e.preventDefault();
    return;
  }
  if (!o)
    return;
  e.preventDefault();
  let l = o ? oC(t.state.doc, i.pos, o) : i.pos;
  l == null && (l = i.pos);
  let a = t.state.tr;
  if (s) {
    let { node: h } = n;
    h ? h.replace(a) : a.deleteSelection();
  }
  let c = a.mapping.map(l), u = o.openStart == 0 && o.openEnd == 0 && o.content.childCount == 1, f = a.doc;
  if (u ? a.replaceRangeWith(c, c, o.content.firstChild) : a.replaceRange(c, c, o), a.doc.eq(f))
    return;
  let d = a.doc.resolve(c);
  if (u && re.isSelectable(o.content.firstChild) && d.nodeAfter && d.nodeAfter.sameMarkup(o.content.firstChild))
    a.setSelection(new re(d));
  else {
    let h = a.mapping.map(l);
    a.mapping.maps[a.mapping.maps.length - 1].forEach((m, b, C, x) => h = x), a.setSelection(gu(t, d, a.doc.resolve(h)));
  }
  t.focus(), t.dispatch(a.setMeta("uiEvent", "drop"));
}
dt.focus = (t) => {
  t.input.lastFocus = Date.now(), t.focused || (t.domObserver.stop(), t.dom.classList.add("ProseMirror-focused"), t.domObserver.start(), t.focused = !0, setTimeout(() => {
    t.docView && t.hasFocus() && !t.domObserver.currentSelection.eq(t.domSelectionRange()) && Ln(t);
  }, 20));
};
dt.blur = (t, e) => {
  let n = e;
  t.focused && (t.domObserver.stop(), t.dom.classList.remove("ProseMirror-focused"), t.domObserver.start(), n.relatedTarget && t.dom.contains(n.relatedTarget) && t.domObserver.currentSelection.clear(), t.focused = !1);
};
dt.beforeinput = (t, e) => {
  if (Ze && Dn && e.inputType == "deleteContentBackward") {
    t.domObserver.flushSoon();
    let { domChangeCount: r } = t.input;
    setTimeout(() => {
      if (t.input.domChangeCount != r || (t.dom.blur(), t.focus(), t.someProp("handleKeyDown", (o) => o(t, Mr(8, "Backspace")))))
        return;
      let { $cursor: i } = t.state.selection;
      i && i.pos > 0 && t.dispatch(t.state.tr.delete(i.pos - 1, i.pos).scrollIntoView());
    }, 50);
  }
};
for (let t in ht)
  dt[t] = ht[t];
function jo(t, e) {
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
class xl {
  constructor(e, n) {
    this.toDOM = e, this.spec = n || Fr, this.side = this.spec.side || 0;
  }
  map(e, n, r, i) {
    let { pos: o, deleted: s } = e.mapResult(n.from + i, this.side < 0 ? -1 : 1);
    return s ? null : new Le(o - r, o - r, this);
  }
  valid() {
    return !0;
  }
  eq(e) {
    return this == e || e instanceof xl && (this.spec.key && this.spec.key == e.spec.key || this.toDOM == e.toDOM && jo(this.spec, e.spec));
  }
  destroy(e) {
    this.spec.destroy && this.spec.destroy(e);
  }
}
class fr {
  constructor(e, n) {
    this.attrs = e, this.spec = n || Fr;
  }
  map(e, n, r, i) {
    let o = e.map(n.from + i, this.spec.inclusiveStart ? -1 : 1) - r, s = e.map(n.to + i, this.spec.inclusiveEnd ? 1 : -1) - r;
    return o >= s ? null : new Le(o, s, this);
  }
  valid(e, n) {
    return n.from < n.to;
  }
  eq(e) {
    return this == e || e instanceof fr && jo(this.attrs, e.attrs) && jo(this.spec, e.spec);
  }
  static is(e) {
    return e.type instanceof fr;
  }
  destroy() {
  }
}
class xu {
  constructor(e, n) {
    this.attrs = e, this.spec = n || Fr;
  }
  map(e, n, r, i) {
    let o = e.mapResult(n.from + i, 1);
    if (o.deleted)
      return null;
    let s = e.mapResult(n.to + i, -1);
    return s.deleted || s.pos <= o.pos ? null : new Le(o.pos - r, s.pos - r, this);
  }
  valid(e, n) {
    let { index: r, offset: i } = e.content.findIndex(n.from), o;
    return i == n.from && !(o = e.child(r)).isText && i + o.nodeSize == n.to;
  }
  eq(e) {
    return this == e || e instanceof xu && jo(this.attrs, e.attrs) && jo(this.spec, e.spec);
  }
  destroy() {
  }
}
class Le {
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
    return new Le(e, n, this.type);
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
    return new Le(e, e, new xl(n, r));
  }
  /**
  Creates an inline decoration, which adds the given attributes to
  each inline node between `from` and `to`.
  */
  static inline(e, n, r, i) {
    return new Le(e, n, new fr(r, i));
  }
  /**
  Creates a node decoration. `from` and `to` should point precisely
  before and after a node in the document. That node, and only that
  node, will receive the given attributes.
  */
  static node(e, n, r, i) {
    return new Le(e, n, new xu(r, i));
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
    return this.type instanceof fr;
  }
  /**
  @internal
  */
  get widget() {
    return this.type instanceof xl;
  }
}
const di = [], Fr = {};
class Te {
  /**
  @internal
  */
  constructor(e, n) {
    this.local = e.length ? e : di, this.children = n.length ? n : di;
  }
  /**
  Create a set of decorations, using the structure of the given
  document. This will consume (modify) the `decorations` array, so
  you must make a copy if you want need to preserve that.
  */
  static create(e, n) {
    return n.length ? Cl(n, e, 0, Fr) : tt;
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
    return this == tt || e.maps.length == 0 ? this : this.mapInner(e, n, 0, 0, r || Fr);
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
    return this.children.length ? Sv(this.children, s || [], e, n, r, i, o) : s ? new Te(s.sort($r), di) : tt;
  }
  /**
  Add the given array of decorations to the ones in the set,
  producing a new set. Consumes the `decorations` array. Needs
  access to the current document to create the appropriate tree
  structure.
  */
  add(e, n) {
    return n.length ? this == tt ? Te.create(e, n) : this.addInner(e, n, 0) : this;
  }
  addInner(e, n, r) {
    let i, o = 0;
    e.forEach((l, a) => {
      let c = a + r, u;
      if (u = Hg(n, l, c)) {
        for (i || (i = this.children.slice()); o < i.length && i[o] < a; )
          o += 3;
        i[o] == a ? i[o + 2] = i[o + 2].addInner(l, u, c + 1) : i.splice(o, 0, a, a + l.nodeSize, Cl(u, l, c + 1, Fr)), o += 3;
      }
    });
    let s = Vg(o ? jg(n) : n, -r);
    for (let l = 0; l < s.length; l++)
      s[l].type.valid(e, s[l]) || s.splice(l--, 1);
    return new Te(s.length ? this.local.concat(s).sort($r) : this.local, i || this.children);
  }
  /**
  Create a new set that contains the decorations in this set, minus
  the ones in the given array.
  */
  remove(e) {
    return e.length == 0 || this == tt ? this : this.removeInner(e, 0);
  }
  removeInner(e, n) {
    let r = this.children, i = this.local;
    for (let o = 0; o < r.length; o += 3) {
      let s, l = r[o] + n, a = r[o + 1] + n;
      for (let u = 0, f; u < e.length; u++)
        (f = e[u]) && f.from > l && f.to < a && (e[u] = null, (s || (s = [])).push(f));
      if (!s)
        continue;
      r == this.children && (r = this.children.slice());
      let c = r[o + 2].removeInner(s, l + 1);
      c != tt ? r[o + 2] = c : (r.splice(o, 3), o -= 3);
    }
    if (i.length) {
      for (let o = 0, s; o < e.length; o++)
        if (s = e[o])
          for (let l = 0; l < i.length; l++)
            i[l].eq(s, n) && (i == this.local && (i = this.local.slice()), i.splice(l--, 1));
    }
    return r == this.children && i == this.local ? this : i.length || r.length ? new Te(i, r) : tt;
  }
  forChild(e, n) {
    if (this == tt)
      return this;
    if (n.isLeaf)
      return Te.empty;
    let r, i;
    for (let l = 0; l < this.children.length; l += 3)
      if (this.children[l] >= e) {
        this.children[l] == e && (r = this.children[l + 2]);
        break;
      }
    let o = e + 1, s = o + n.content.size;
    for (let l = 0; l < this.local.length; l++) {
      let a = this.local[l];
      if (a.from < s && a.to > o && a.type instanceof fr) {
        let c = Math.max(o, a.from) - o, u = Math.min(s, a.to) - o;
        c < u && (i || (i = [])).push(a.copy(c, u));
      }
    }
    if (i) {
      let l = new Te(i.sort($r), di);
      return r ? new er([l, r]) : l;
    }
    return r || tt;
  }
  /**
  @internal
  */
  eq(e) {
    if (this == e)
      return !0;
    if (!(e instanceof Te) || this.local.length != e.local.length || this.children.length != e.children.length)
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
    return Cu(this.localsInner(e));
  }
  /**
  @internal
  */
  localsInner(e) {
    if (this == tt)
      return di;
    if (e.inlineContent || !this.local.some(fr.is))
      return this.local;
    let n = [];
    for (let r = 0; r < this.local.length; r++)
      this.local[r].type instanceof fr || n.push(this.local[r]);
    return n;
  }
  forEachSet(e) {
    e(this);
  }
}
Te.empty = new Te([], []);
Te.removeOverlap = Cu;
const tt = Te.empty;
class er {
  constructor(e) {
    this.members = e;
  }
  map(e, n) {
    const r = this.members.map((i) => i.map(e, n, Fr));
    return er.from(r);
  }
  forChild(e, n) {
    if (n.isLeaf)
      return Te.empty;
    let r = [];
    for (let i = 0; i < this.members.length; i++) {
      let o = this.members[i].forChild(e, n);
      o != tt && (o instanceof er ? r = r.concat(o.members) : r.push(o));
    }
    return er.from(r);
  }
  eq(e) {
    if (!(e instanceof er) || e.members.length != this.members.length)
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
    return n ? Cu(r ? n : n.sort($r)) : di;
  }
  // Create a group for the given array of decoration sets, or return
  // a single set when possible.
  static from(e) {
    switch (e.length) {
      case 0:
        return tt;
      case 1:
        return e[0];
      default:
        return new er(e.every((n) => n instanceof Te) ? e : e.reduce((n, r) => n.concat(r instanceof Te ? r : r.members), []));
    }
  }
  forEachSet(e) {
    for (let n = 0; n < this.members.length; n++)
      this.members[n].forEachSet(e);
  }
}
function Sv(t, e, n, r, i, o, s) {
  let l = t.slice();
  for (let c = 0, u = o; c < n.maps.length; c++) {
    let f = 0;
    n.maps[c].forEach((d, h, m, b) => {
      let C = b - m - (h - d);
      for (let x = 0; x < l.length; x += 3) {
        let L = l[x + 1];
        if (L < 0 || d > L + u - f)
          continue;
        let I = l[x] + u - f;
        h >= I ? l[x + 1] = d <= I ? -2 : -1 : d >= u && C && (l[x] += C, l[x + 1] += C);
      }
      f += C;
    }), u = n.maps[c].map(u, -1);
  }
  let a = !1;
  for (let c = 0; c < l.length; c += 3)
    if (l[c + 1] < 0) {
      if (l[c + 1] == -2) {
        a = !0, l[c + 1] = -1;
        continue;
      }
      let u = n.map(t[c] + o), f = u - i;
      if (f < 0 || f >= r.content.size) {
        a = !0;
        continue;
      }
      let d = n.map(t[c + 1] + o, -1), h = d - i, { index: m, offset: b } = r.content.findIndex(f), C = r.maybeChild(m);
      if (C && b == f && b + C.nodeSize == h) {
        let x = l[c + 2].mapInner(n, C, u + 1, t[c] + o + 1, s);
        x != tt ? (l[c] = f, l[c + 1] = h, l[c + 2] = x) : (l[c + 1] = -2, a = !0);
      } else
        a = !0;
    }
  if (a) {
    let c = vv(l, t, e, n, i, o, s), u = Cl(c, r, 0, s);
    e = u.local;
    for (let f = 0; f < l.length; f += 3)
      l[f + 1] < 0 && (l.splice(f, 3), f -= 3);
    for (let f = 0, d = 0; f < u.children.length; f += 3) {
      let h = u.children[f];
      for (; d < l.length && l[d] < h; )
        d += 3;
      l.splice(d, 0, u.children[f], u.children[f + 1], u.children[f + 2]);
    }
  }
  return new Te(e.sort($r), l);
}
function Vg(t, e) {
  if (!e || !t.length)
    return t;
  let n = [];
  for (let r = 0; r < t.length; r++) {
    let i = t[r];
    n.push(new Le(i.from + e, i.to + e, i.type));
  }
  return n;
}
function vv(t, e, n, r, i, o, s) {
  function l(a, c) {
    for (let u = 0; u < a.local.length; u++) {
      let f = a.local[u].map(r, i, c);
      f ? n.push(f) : s.onRemove && s.onRemove(a.local[u].spec);
    }
    for (let u = 0; u < a.children.length; u += 3)
      l(a.children[u + 2], a.children[u] + c + 1);
  }
  for (let a = 0; a < t.length; a += 3)
    t[a + 1] == -1 && l(t[a + 2], e[a] + o + 1);
  return n;
}
function Hg(t, e, n) {
  if (e.isLeaf)
    return null;
  let r = n + e.nodeSize, i = null;
  for (let o = 0, s; o < t.length; o++)
    (s = t[o]) && s.from > n && s.to < r && ((i || (i = [])).push(s), t[o] = null);
  return i;
}
function jg(t) {
  let e = [];
  for (let n = 0; n < t.length; n++)
    t[n] != null && e.push(t[n]);
  return e;
}
function Cl(t, e, n, r) {
  let i = [], o = !1;
  e.forEach((l, a) => {
    let c = Hg(t, l, a + n);
    if (c) {
      o = !0;
      let u = Cl(c, l, n + a + 1, r);
      u != tt && i.push(a, a + l.nodeSize, u);
    }
  });
  let s = Vg(o ? jg(t) : t, -n).sort($r);
  for (let l = 0; l < s.length; l++)
    s[l].type.valid(e, s[l]) || (r.onRemove && r.onRemove(s[l].spec), s.splice(l--, 1));
  return s.length || i.length ? new Te(s, i) : tt;
}
function $r(t, e) {
  return t.from - e.from || t.to - e.to;
}
function Cu(t) {
  let e = t;
  for (let n = 0; n < e.length - 1; n++) {
    let r = e[n];
    if (r.from != r.to)
      for (let i = n + 1; i < e.length; i++) {
        let o = e[i];
        if (o.from == r.from) {
          o.to != r.to && (e == t && (e = t.slice()), e[i] = o.copy(o.from, r.to), Eh(e, i + 1, o.copy(r.to, o.to)));
          continue;
        } else {
          o.from < r.to && (e == t && (e = t.slice()), e[n] = r.copy(r.from, o.from), Eh(e, i, r.copy(o.from, r.to)));
          break;
        }
      }
  }
  return e;
}
function Eh(t, e, n) {
  for (; e < t.length && $r(n, t[e]) > 0; )
    e++;
  t.splice(e, 0, n);
}
function Ea(t) {
  let e = [];
  return t.someProp("decorations", (n) => {
    let r = n(t.state);
    r && r != tt && e.push(r);
  }), t.cursorWrapper && e.push(Te.create(t.state.doc, [t.cursorWrapper.deco])), er.from(e);
}
const Mv = {
  childList: !0,
  characterData: !0,
  characterDataOldValue: !0,
  attributes: !0,
  attributeOldValue: !0,
  subtree: !0
}, Tv = bt && cr <= 11;
class Nv {
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
class Ev {
  constructor(e, n) {
    this.view = e, this.handleDOMChange = n, this.queue = [], this.flushingSoon = -1, this.observer = null, this.currentSelection = new Nv(), this.onCharData = null, this.suppressingSelectionUpdates = !1, this.lastChangedTextNode = null, this.observer = window.MutationObserver && new window.MutationObserver((r) => {
      for (let i = 0; i < r.length; i++)
        this.queue.push(r[i]);
      bt && cr <= 11 && r.some((i) => i.type == "childList" && i.removedNodes.length || i.type == "characterData" && i.oldValue.length > i.target.nodeValue.length) ? this.flushSoon() : it && e.composing && r.some((i) => i.type == "childList" && i.target.nodeName == "TR") ? (e.input.badSafariComposition = !0, this.flushSoon()) : this.flush();
    }), Tv && (this.onCharData = (r) => {
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
    this.observer && (this.observer.takeRecords(), this.observer.observe(this.view.dom, Mv)), this.onCharData && this.view.dom.addEventListener("DOMCharacterDataModified", this.onCharData), this.connectSelection();
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
    if (wh(this.view)) {
      if (this.suppressingSelectionUpdates)
        return Ln(this.view);
      if (bt && cr <= 11 && !this.view.state.selection.empty) {
        let e = this.view.domSelectionRange();
        if (e.focusNode && Xr(e.focusNode, e.focusOffset, e.anchorNode, e.anchorOffset))
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
    for (let o = e.focusNode; o; o = qi(o))
      n.add(o);
    for (let o = e.anchorNode; o; o = qi(o))
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
    let r = e.domSelectionRange(), i = !this.suppressingSelectionUpdates && !this.currentSelection.eq(r) && wh(e) && !this.ignoreSelectionChange(r), o = -1, s = -1, l = !1, a = [];
    if (e.editable)
      for (let u = 0; u < n.length; u++) {
        let f = this.registerMutation(n[u], a);
        f && (o = o < 0 ? f.from : Math.min(f.from, o), s = s < 0 ? f.to : Math.max(f.to, s), f.typeOver && (l = !0));
      }
    if (a.some((u) => u.nodeName == "BR") && (e.input.lastKeyCode == 8 || e.input.lastKeyCode == 46)) {
      for (let u of a)
        if (u.nodeName == "BR" && u.parentNode) {
          let f = u.nextSibling;
          for (; f && f.nodeType == 1; ) {
            if (f.contentEditable == "false") {
              u.parentNode.removeChild(u);
              break;
            }
            f = f.firstChild;
          }
        }
    } else if (Wt && a.length) {
      let u = a.filter((f) => f.nodeName == "BR");
      if (u.length == 2) {
        let [f, d] = u;
        f.parentNode && f.parentNode.parentNode == d.parentNode ? d.remove() : f.remove();
      } else {
        let { focusNode: f } = this.currentSelection;
        for (let d of u) {
          let h = d.parentNode;
          h && h.nodeName == "LI" && (!f || Ov(e, f) != h) && d.remove();
        }
      }
    }
    let c = null;
    o < 0 && i && e.input.lastFocus > Date.now() - 200 && Math.max(e.input.lastTouch, e.input.lastClick.time) < Date.now() - 300 && Vl(r) && (c = mu(e)) && c.eq(se.near(e.state.doc.resolve(0), 1)) ? (e.input.lastFocus = 0, Ln(e), this.currentSelection.set(r), e.scrollToSelection()) : (o > -1 || i) && (o > -1 && (e.docView.markDirty(o, s), Av(e)), e.input.badSafariComposition && (e.input.badSafariComposition = !1, Dv(e, a)), this.handleDOMChange(o, s, l, a), e.docView && e.docView.dirty ? e.updateState(e.state) : this.currentSelection.eq(r) || Ln(e), this.currentSelection.set(r));
  }
  registerMutation(e, n) {
    if (n.indexOf(e.target) > -1)
      return null;
    let r = this.view.docView.nearestDesc(e.target);
    if (e.type == "attributes" && (r == this.view.docView || e.attributeName == "contenteditable" || // Firefox sometimes fires spurious events for null/empty styles
    e.attributeName == "style" && !e.oldValue && !e.target.getAttribute("style")) || !r || r.ignoreMutation(e))
      return null;
    if (e.type == "childList") {
      for (let u = 0; u < e.addedNodes.length; u++) {
        let f = e.addedNodes[u];
        n.push(f), f.nodeType == 3 && (this.lastChangedTextNode = f);
      }
      if (r.contentDOM && r.contentDOM != r.dom && !r.contentDOM.contains(e.target))
        return { from: r.posBefore, to: r.posAfter };
      let i = e.previousSibling, o = e.nextSibling;
      if (bt && cr <= 11 && e.addedNodes.length)
        for (let u = 0; u < e.addedNodes.length; u++) {
          let { previousSibling: f, nextSibling: d } = e.addedNodes[u];
          (!f || Array.prototype.indexOf.call(e.addedNodes, f) < 0) && (i = f), (!d || Array.prototype.indexOf.call(e.addedNodes, d) < 0) && (o = d);
        }
      let s = i && i.parentNode == e.target ? Qe(i) + 1 : 0, l = r.localPosFromDOM(e.target, s, -1), a = o && o.parentNode == e.target ? Qe(o) : e.target.childNodes.length, c = r.localPosFromDOM(e.target, a, 1);
      return { from: l, to: c };
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
let Ah = /* @__PURE__ */ new WeakMap(), Ih = !1;
function Av(t) {
  if (!Ah.has(t) && (Ah.set(t, null), ["normal", "nowrap", "pre-line"].indexOf(getComputedStyle(t.dom).whiteSpace) !== -1)) {
    if (t.requiresGeckoHackNode = Wt, Ih)
      return;
    console.warn("ProseMirror expects the CSS white-space property to be set, preferably to 'pre-wrap'. It is recommended to load style/prosemirror.css from the prosemirror-view package."), Ih = !0;
  }
}
function Oh(t, e) {
  let n = e.startContainer, r = e.startOffset, i = e.endContainer, o = e.endOffset, s = t.domAtPos(t.state.selection.anchor);
  return Xr(s.node, s.offset, i, o) && ([n, r, i, o] = [i, o, n, r]), { anchorNode: n, anchorOffset: r, focusNode: i, focusOffset: o };
}
function Iv(t, e) {
  if (e.getComposedRanges) {
    let i = e.getComposedRanges(t.root)[0];
    if (i)
      return Oh(t, i);
  }
  let n;
  function r(i) {
    i.preventDefault(), i.stopImmediatePropagation(), n = i.getTargetRanges()[0];
  }
  return t.dom.addEventListener("beforeinput", r, !0), document.execCommand("indent"), t.dom.removeEventListener("beforeinput", r, !0), n ? Oh(t, n) : null;
}
function Ov(t, e) {
  for (let n = e.parentNode; n && n != t.dom; n = n.parentNode) {
    let r = t.docView.nearestDesc(n, !0);
    if (r && r.node.isBlock)
      return n;
  }
  return null;
}
function Dv(t, e) {
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
function Rv(t, e, n) {
  let { node: r, fromOffset: i, toOffset: o, from: s, to: l } = t.docView.parseRange(e, n), a = t.domSelectionRange(), c, u = a.anchorNode;
  if (u && t.dom.contains(u.nodeType == 1 ? u : u.parentNode) && (c = [{ node: u, offset: a.anchorOffset }], Vl(a) || c.push({ node: a.focusNode, offset: a.focusOffset })), Ze && t.input.lastKeyCode === 8)
    for (let C = o; C > i; C--) {
      let x = r.childNodes[C - 1], L = x.pmViewDesc;
      if (x.nodeName == "BR" && !L) {
        o = C;
        break;
      }
      if (!L || L.size)
        break;
    }
  let f = t.state.doc, d = t.someProp("domParser") || ru.fromSchema(t.state.schema), h = f.resolve(s), m = null, b = d.parse(r, {
    topNode: h.parent,
    topMatch: h.parent.contentMatchAt(h.index()),
    topOpen: !0,
    from: i,
    to: o,
    preserveWhitespace: h.parent.type.whitespace == "pre" ? "full" : !0,
    findPositions: c,
    ruleFromNode: Lv,
    context: h
  });
  if (c && c[0].pos != null) {
    let C = c[0].pos, x = c[1] && c[1].pos;
    x == null && (x = C), m = { anchor: C + s, head: x + s };
  }
  return { doc: b, sel: m, from: s, to: l };
}
function Lv(t) {
  let e = t.pmViewDesc;
  if (e)
    return e.parseRule();
  if (t.nodeName == "BR" && t.parentNode) {
    if (it && /^(ul|ol)$/i.test(t.parentNode.nodeName)) {
      let n = document.createElement("div");
      return n.appendChild(document.createElement("li")), { skip: n };
    } else if (t.parentNode.lastChild == t || it && /^(tr|table)$/i.test(t.parentNode.nodeName))
      return { ignore: !0 };
  } else if (t.nodeName == "IMG" && t.getAttribute("mark-placeholder"))
    return { ignore: !0 };
  return null;
}
const Pv = /^(a|abbr|acronym|b|bd[io]|big|br|button|cite|code|data(list)?|del|dfn|em|i|img|ins|kbd|label|map|mark|meter|output|q|ruby|s|samp|small|span|strong|su[bp]|time|u|tt|var)$/i;
function zv(t, e, n, r, i) {
  let o = t.input.compositionPendingChanges || (t.composing ? t.input.compositionID : 0);
  if (t.input.compositionPendingChanges = 0, e < 0) {
    let _ = t.input.lastSelectionTime > Date.now() - 50 ? t.input.lastSelectionOrigin : null, J = mu(t, _);
    if (J && !t.state.selection.eq(J)) {
      if (Ze && Dn && t.input.lastKeyCode === 13 && Date.now() - 100 < t.input.lastKeyCodeTime && t.someProp("handleKeyDown", (O) => O(t, Mr(13, "Enter"))))
        return;
      let Y = t.state.tr.setSelection(J);
      _ == "pointer" ? Y.setMeta("pointer", !0) : _ == "key" && Y.scrollIntoView(), o && Y.setMeta("composition", o), t.dispatch(Y);
    }
    return;
  }
  let s = t.state.doc.resolve(e), l = s.sharedDepth(n);
  e = s.before(l + 1), n = t.state.doc.resolve(n).after(l + 1);
  let a = t.state.selection, c = Rv(t, e, n), u = t.state.doc, f = u.slice(c.from, c.to), d, h;
  t.input.lastKeyCode === 8 && Date.now() - 100 < t.input.lastKeyCodeTime ? (d = t.state.selection.to, h = "end") : (d = t.state.selection.from, h = "start"), t.input.lastKeyCode = null;
  let m = $v(f.content, c.doc.content, c.from, d, h);
  if (m && t.input.domChangeCount++, (Ki && t.input.lastIOSEnter > Date.now() - 225 || Dn) && i.some((_) => _.nodeType == 1 && !Pv.test(_.nodeName)) && (!m || m.endA >= m.endB) && t.someProp("handleKeyDown", (_) => _(t, Mr(13, "Enter")))) {
    t.input.lastIOSEnter = 0;
    return;
  }
  if (!m)
    if (r && a instanceof ee && !a.empty && a.$head.sameParent(a.$anchor) && !t.composing && !(c.sel && c.sel.anchor != c.sel.head))
      m = { start: a.from, endA: a.to, endB: a.to };
    else {
      if (c.sel) {
        let _ = Dh(t, t.state.doc, c.sel);
        if (_ && !_.eq(t.state.selection)) {
          let J = t.state.tr.setSelection(_);
          o && J.setMeta("composition", o), t.dispatch(J);
        }
      }
      return;
    }
  t.state.selection.from < t.state.selection.to && m.start == m.endB && t.state.selection instanceof ee && (m.start > t.state.selection.from && m.start <= t.state.selection.from + 2 && t.state.selection.from >= c.from ? m.start = t.state.selection.from : m.endA < t.state.selection.to && m.endA >= t.state.selection.to - 2 && t.state.selection.to <= c.to && (m.endB += t.state.selection.to - m.endA, m.endA = t.state.selection.to)), bt && cr <= 11 && m.endB == m.start + 1 && m.endA == m.start && m.start > c.from && c.doc.textBetween(m.start - c.from - 1, m.start - c.from + 1) == "  " && (m.start--, m.endA--, m.endB--);
  let b = c.doc.resolveNoCache(m.start - c.from), C = c.doc.resolveNoCache(m.endB - c.from), x = u.resolve(m.start), L = b.sameParent(C) && b.parent.inlineContent && x.end() >= m.endA;
  if ((Ki && t.input.lastIOSEnter > Date.now() - 225 && (!L || i.some((_) => _.nodeName == "DIV" || _.nodeName == "P")) || !L && b.pos < c.doc.content.size && (!b.sameParent(C) || !b.parent.inlineContent) && b.pos < C.pos && !/\S/.test(c.doc.textBetween(b.pos, C.pos, "", ""))) && t.someProp("handleKeyDown", (_) => _(t, Mr(13, "Enter")))) {
    t.input.lastIOSEnter = 0;
    return;
  }
  if (t.state.selection.anchor > m.start && Fv(u, m.start, m.endA, b, C) && t.someProp("handleKeyDown", (_) => _(t, Mr(8, "Backspace")))) {
    Dn && Ze && t.domObserver.suppressSelectionUpdates();
    return;
  }
  Ze && m.endB == m.start && (t.input.lastChromeDelete = Date.now()), Dn && !L && b.start() != C.start() && C.parentOffset == 0 && b.depth == C.depth && c.sel && c.sel.anchor == c.sel.head && c.sel.head == m.endA && (m.endB -= 2, C = c.doc.resolveNoCache(m.endB - c.from), setTimeout(() => {
    t.someProp("handleKeyDown", function(_) {
      return _(t, Mr(13, "Enter"));
    });
  }, 20));
  let I = m.start, D = m.endA, j = (_) => {
    let J = _ || t.state.tr.replace(I, D, c.doc.slice(m.start - c.from, m.endB - c.from));
    if (c.sel) {
      let Y = Dh(t, J.doc, c.sel);
      Y && !(Ze && t.composing && Y.empty && (m.start != m.endB || t.input.lastChromeDelete < Date.now() - 100) && (Y.head == I || Y.head == J.mapping.map(D) - 1) || bt && Y.empty && Y.head == I) && J.setSelection(Y);
    }
    return o && J.setMeta("composition", o), J.scrollIntoView();
  }, A;
  if (L)
    if (b.pos == C.pos) {
      bt && cr <= 11 && b.parentOffset == 0 && (t.domObserver.suppressSelectionUpdates(), setTimeout(() => Ln(t), 20));
      let _ = j(t.state.tr.delete(I, D)), J = u.resolve(m.start).marksAcross(u.resolve(m.endA));
      J && _.ensureMarks(J), t.dispatch(_);
    } else if (
      // Adding or removing a mark
      m.endA == m.endB && (A = Bv(b.parent.content.cut(b.parentOffset, C.parentOffset), x.parent.content.cut(x.parentOffset, m.endA - x.start())))
    ) {
      let _ = j(t.state.tr);
      A.type == "add" ? _.addMark(I, D, A.mark) : _.removeMark(I, D, A.mark), t.dispatch(_);
    } else if (b.parent.child(b.index()).isText && b.index() == C.index() - (C.textOffset ? 0 : 1)) {
      let _ = b.parent.textBetween(b.parentOffset, C.parentOffset), J = () => j(t.state.tr.insertText(_, I, D));
      t.someProp("handleTextInput", (Y) => Y(t, I, D, _, J)) || t.dispatch(J());
    } else
      t.dispatch(j());
  else
    t.dispatch(j());
}
function Dh(t, e, n) {
  return Math.max(n.anchor, n.head) > e.content.size ? null : gu(t, e.resolve(n.anchor), e.resolve(n.head));
}
function Bv(t, e) {
  let n = t.firstChild.marks, r = e.firstChild.marks, i = n, o = r, s, l, a;
  for (let u = 0; u < r.length; u++)
    i = r[u].removeFromSet(i);
  for (let u = 0; u < n.length; u++)
    o = n[u].removeFromSet(o);
  if (i.length == 1 && o.length == 0)
    l = i[0], s = "add", a = (u) => u.mark(l.addToSet(u.marks));
  else if (i.length == 0 && o.length == 1)
    l = o[0], s = "remove", a = (u) => u.mark(l.removeFromSet(u.marks));
  else
    return null;
  let c = [];
  for (let u = 0; u < e.childCount; u++)
    c.push(a(e.child(u)));
  if (z.from(c).eq(t))
    return { mark: l, type: s };
}
function Fv(t, e, n, r, i) {
  if (
    // The content must have shrunk
    n - e <= i.pos - r.pos || // newEnd must point directly at or after the end of the block that newStart points into
    Aa(r, !0, !1) < i.pos
  )
    return !1;
  let o = t.resolve(e);
  if (!r.parent.isTextblock) {
    let l = o.nodeAfter;
    return l != null && n == e + l.nodeSize;
  }
  if (o.parentOffset < o.parent.content.size || !o.parent.isTextblock)
    return !1;
  let s = t.resolve(Aa(o, !0, !0));
  return !s.parent.isTextblock || s.pos > n || Aa(s, !0, !1) < n ? !1 : r.parent.content.cut(r.parentOffset).eq(s.parent.content);
}
function Aa(t, e, n) {
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
function $v(t, e, n, r, i) {
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
    o -= a, o && o < e.size && Rh(e.textBetween(o - 1, o + 1)) && (o += a ? 1 : -1), l = o + (l - s), s = o;
  } else if (l < o) {
    let a = r <= o && r >= l ? o - r : 0;
    o -= a, o && o < t.size && Rh(t.textBetween(o - 1, o + 1)) && (o += a ? 1 : -1), s = o + (s - l), l = o;
  }
  return { start: o, endA: s, endB: l };
}
function Rh(t) {
  if (t.length != 2)
    return !1;
  let e = t.charCodeAt(0), n = t.charCodeAt(1);
  return e >= 56320 && e <= 57343 && n >= 55296 && n <= 56319;
}
class Wg {
  /**
  Create a view. `place` may be a DOM node that the editor should
  be appended to, a function that will place it into the document,
  or an object whose `mount` property holds the node to use as the
  document container. If it is `null`, the editor will not be
  added to the document.
  */
  constructor(e, n) {
    this._root = null, this.focused = !1, this.trackWrites = null, this.mounted = !1, this.markCursor = null, this.cursorWrapper = null, this.lastSelectedViewDesc = void 0, this.input = new tv(), this.prevDirectPlugins = [], this.pluginViews = [], this.requiresGeckoHackNode = !1, this.dragging = null, this._props = n, this.state = n.state, this.directPlugins = n.plugins || [], this.directPlugins.forEach(Fh), this.dispatch = this.dispatch.bind(this), this.dom = e && e.mount || document.createElement("div"), e && (e.appendChild ? e.appendChild(this.dom) : typeof e == "function" ? e(this.dom) : e.mount && (this.mounted = !0)), this.editable = zh(this), Ph(this), this.nodeViews = Bh(this), this.docView = ph(this.state.doc, Lh(this), Ea(this), this.dom, this), this.domObserver = new Ev(this, (r, i, o, s) => zv(this, r, i, o, s)), this.domObserver.start(), nv(this), this.updatePluginViews();
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
    e.handleDOMEvents != this._props.handleDOMEvents && Ic(this);
    let n = this._props;
    this._props = e, e.plugins && (e.plugins.forEach(Fh), this.directPlugins = e.plugins), this.updateStateInner(e.state, n);
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
    e.storedMarks && this.composing && (Bg(this), s = !0), this.state = e;
    let l = i.plugins != e.plugins || this._props.plugins != n.plugins;
    if (l || this._props.plugins != n.plugins || this._props.nodeViews != n.nodeViews) {
      let h = Bh(this);
      Vv(h, this.nodeViews) && (this.nodeViews = h, o = !0);
    }
    (l || n.handleDOMEvents != this._props.handleDOMEvents) && Ic(this), this.editable = zh(this), Ph(this);
    let a = Ea(this), c = Lh(this), u = i.plugins != e.plugins && !i.doc.eq(e.doc) ? "reset" : e.scrollToSelection > i.scrollToSelection ? "to selection" : "preserve", f = o || !this.docView.matchesNode(e.doc, c, a);
    (f || !e.selection.eq(i.selection)) && (s = !0);
    let d = u == "preserve" && s && this.dom.style.overflowAnchor == null && gS(this);
    if (s) {
      this.domObserver.stop();
      let h = f && (bt || Ze) && !this.composing && !i.selection.empty && !e.selection.empty && _v(i.selection, e.selection);
      if (f) {
        let m = Ze ? this.trackWrites = this.domSelectionRange().focusNode : null;
        this.composing && (this.input.compositionNode = gv(this)), (o || !this.docView.update(e.doc, c, a, this)) && (this.docView.updateOuterDeco(c), this.docView.destroy(), this.docView = ph(e.doc, c, a, this.dom, this)), m && (!this.trackWrites || !this.dom.contains(this.trackWrites)) && (h = !0);
      }
      h || !(this.input.mouseDown && this.domObserver.currentSelection.eq(this.domSelectionRange()) && _S(this)) ? Ln(this, h) : (Mg(this, e.selection), this.domObserver.setCurSelection()), this.domObserver.start();
    }
    this.updatePluginViews(i), !((r = this.dragging) === null || r === void 0) && r.node && !i.doc.eq(e.doc) && this.updateDraggedNode(this.dragging, i), u == "reset" ? this.dom.scrollTop = 0 : u == "to selection" ? this.scrollToSelection() : d && yS(d);
  }
  /**
  @internal
  */
  scrollToSelection() {
    let e = this.domSelectionRange().focusNode;
    if (!(!e || !this.dom.contains(e.nodeType == 1 ? e : e.parentNode))) {
      if (!this.someProp("handleScrollToSelection", (n) => n(this))) if (this.state.selection instanceof re) {
        let n = this.docView.domAfterPos(this.state.selection.from);
        n.nodeType == 1 && ah(this, n.getBoundingClientRect(), e);
      } else
        ah(this, this.coordsAtPos(this.state.selection.head, 1), e);
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
    this.dragging = new $g(e.slice, e.move, i < 0 ? void 0 : re.create(this.state.doc, i));
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
    if (bt) {
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
    this.domObserver.stop(), this.editable && kS(this.dom), Ln(this), this.domObserver.start();
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
    return SS(this, e);
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
    return yg(this, e, n);
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
    return ES(this, n || this.state, e);
  }
  /**
  Run the editor's paste logic with the given HTML string. The
  `event`, if given, will be passed to the
  [`handlePaste`](https://prosemirror.net/docs/ref/#view.EditorProps.handlePaste) hook.
  */
  pasteHTML(e, n) {
    return Ho(this, "", e, !1, n || new ClipboardEvent("paste"));
  }
  /**
  Run the editor's paste logic with the given plain-text input.
  */
  pasteText(e, n) {
    return Ho(this, e, null, !0, n || new ClipboardEvent("paste"));
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
    return yu(this, e);
  }
  /**
  Removes the editor from the DOM and destroys all [node
  views](https://prosemirror.net/docs/ref/#view.NodeView).
  */
  destroy() {
    this.docView && (rv(this), this.destroyPluginViews(), this.mounted ? (this.docView.update(this.state.doc, [], Ea(this), this), this.dom.textContent = "") : this.dom.parentNode && this.dom.parentNode.removeChild(this.dom), this.docView.destroy(), this.docView = null, sS());
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
    return ov(this, e);
  }
  /**
  @internal
  */
  domSelectionRange() {
    let e = this.domSelection();
    return e ? it && this.root.nodeType === 11 && fS(this.dom.ownerDocument) == this.dom && Iv(this, e) || e : { focusNode: null, focusOffset: 0, anchorNode: null, anchorOffset: 0 };
  }
  /**
  @internal
  */
  domSelection() {
    return this.root.getSelection();
  }
}
Wg.prototype.dispatch = function(t) {
  let e = this._props.dispatchTransaction;
  e ? e.call(this, t) : this.updateState(this.state.apply(t));
};
function Lh(t) {
  let e = /* @__PURE__ */ Object.create(null);
  return e.class = "ProseMirror", e.contenteditable = String(t.editable), t.someProp("attributes", (n) => {
    if (typeof n == "function" && (n = n(t.state)), n)
      for (let r in n)
        r == "class" ? e.class += " " + n[r] : r == "style" ? e.style = (e.style ? e.style + ";" : "") + n[r] : !e[r] && r != "contenteditable" && r != "nodeName" && (e[r] = String(n[r]));
  }), e.translate || (e.translate = "no"), [Le.node(0, t.state.doc.content.size, e)];
}
function Ph(t) {
  if (t.markCursor) {
    let e = document.createElement("img");
    e.className = "ProseMirror-separator", e.setAttribute("mark-placeholder", "true"), e.setAttribute("alt", ""), t.cursorWrapper = { dom: e, deco: Le.widget(t.state.selection.from, e, { raw: !0, marks: t.markCursor }) };
  } else
    t.cursorWrapper = null;
}
function zh(t) {
  return !t.someProp("editable", (e) => e(t.state) === !1);
}
function _v(t, e) {
  let n = Math.min(t.$anchor.sharedDepth(t.head), e.$anchor.sharedDepth(e.head));
  return t.$anchor.start(n) != e.$anchor.start(n);
}
function Bh(t) {
  let e = /* @__PURE__ */ Object.create(null);
  function n(r) {
    for (let i in r)
      Object.prototype.hasOwnProperty.call(e, i) || (e[i] = r[i]);
  }
  return t.someProp("nodeViews", n), t.someProp("markViews", n), e;
}
function Vv(t, e) {
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
function Fh(t) {
  if (t.spec.state || t.spec.filterTransaction || t.spec.appendTransaction)
    throw new RangeError("Plugins passed directly to the view must not have a state component");
}
function zn(t, e) {
  return t.meta = {
    package: "@milkdown/core",
    group: "System",
    ...e
  }, t;
}
var qg = {
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
}, Re = pe({}, "editorView"), wo = pe({}, "editorState"), Ia = pe([], "initTimer"), $h = pe({}, "editor"), Wo = pe([], "inputRules"), an = pe([], "prosePlugins"), qo = pe([], "remarkPlugins"), Oc = pe([], "nodeView"), Dc = pe([], "markView"), _r = pe(fc().use(ic).use(ac), "remark"), Eo = pe({
  handlers: qg,
  encode: []
}, "remarkStringifyOptions"), Zs = fn("ConfigReady");
function Hv(t) {
  const e = (n) => (n.record(Zs), async () => (await t(n), n.done(Zs), () => {
    n.clearTimer(Zs);
  }));
  return zn(e, { displayName: "Config" }), e;
}
var Vr = fn("InitReady");
function jv(t) {
  const e = (n) => (n.inject($h, t).inject(an, []).inject(qo, []).inject(Wo, []).inject(Oc, []).inject(Dc, []).inject(Eo, {
    handlers: qg,
    encode: []
  }).inject(_r, fc().use(ic).use(ac)).inject(Ia, [Zs]).record(Vr), async () => {
    await n.waitTimers(Ia);
    const r = n.get(Eo);
    return n.set(_r, fc().use(ic).use(ac, r)), n.done(Vr), () => {
      n.remove($h).remove(an).remove(qo).remove(Wo).remove(Oc).remove(Dc).remove(Eo).remove(_r).remove(Ia).clearTimer(Vr);
    };
  });
  return zn(e, { displayName: "Init" }), e;
}
var wt = fn("SchemaReady"), Oa = pe([], "schemaTimer"), dr = pe({}, "schema"), Ao = pe([], "nodes"), Io = pe([], "marks");
function _h(t) {
  var e;
  return {
    ...t,
    parseDOM: (e = t.parseDOM) == null ? void 0 : e.map((n) => ({
      priority: t.priority,
      ...n
    }))
  };
}
var Kg = (t) => (t.inject(dr, {}).inject(Ao, []).inject(Io, []).inject(Oa, [Vr]).record(wt), async () => {
  await t.waitTimers(Oa);
  const e = t.get(_r), n = t.get(qo).reduce((i, o) => i.use(o.plugin, o.options), e);
  t.set(_r, n);
  const r = new Lx({
    nodes: Object.fromEntries(t.get(Ao).map(([i, o]) => [i, _h(o)])),
    marks: Object.fromEntries(t.get(Io).map(([i, o]) => [i, _h(o)]))
  });
  return t.set(dr, r), t.done(wt), () => {
    t.remove(dr).remove(Ao).remove(Io).remove(Oa).clearTimer(wt);
  };
});
zn(Kg, { displayName: "Schema" });
var Or, _t, zp, Ug = (zp = class {
  constructor() {
    q(this, Or);
    q(this, _t);
    $(this, Or, new $p()), $(this, _t, null), this.setCtx = (t) => {
      $(this, _t, t);
    }, this.chain = () => {
      if (N(this, _t) == null) throw ra();
      const t = N(this, _t), e = [], n = this.get.bind(this), r = {
        run: () => {
          const o = Xi(...e), s = t.get(Re);
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
    return N(this, _t);
  }
  create(t, e) {
    const n = t.create(N(this, Or).sliceMap);
    return n.set(e), n;
  }
  get(t) {
    return N(this, Or).get(t).get();
  }
  remove(t) {
    return N(this, Or).remove(t);
  }
  call(t, e) {
    if (N(this, _t) == null) throw ra();
    const n = this.get(t)(e), r = N(this, _t).get(Re);
    return n(r.state, r.dispatch, r);
  }
  inline(t) {
    if (N(this, _t) == null) throw ra();
    const e = N(this, _t).get(Re);
    return t(e.state, e.dispatch, e);
  }
}, Or = new WeakMap(), _t = new WeakMap(), zp);
function Wv(t = "cmdKey") {
  return pe(() => () => !1, t);
}
var we = pe(new Ug(), "commands"), Da = pe([wt], "commandsTimer"), Oo = fn("CommandsReady"), Jg = (t) => {
  const e = new Ug();
  return e.setCtx(t), t.inject(we, e).inject(Da, [wt]).record(Oo), async () => (await t.waitTimers(Da), t.done(Oo), () => {
    t.remove(we).remove(Da).clearTimer(Oo);
  });
};
zn(Jg, { displayName: "Commands" });
function qv(t) {
  return t.Backspace = Xi(LC, au, mC, Xm), t;
}
var Dr, gt, Bp, Gg = (Bp = class {
  constructor() {
    q(this, Dr);
    q(this, gt);
    $(this, Dr, null), $(this, gt, []), this.setCtx = (t) => {
      $(this, Dr, t);
    }, this.add = (t) => (N(this, gt).push(t), () => {
      $(this, gt, N(this, gt).filter((e) => e !== t));
    }), this.addObjectKeymap = (t) => {
      const e = [];
      return Object.entries(t).forEach(([n, r]) => {
        if (typeof r == "function") {
          const i = {
            key: n,
            onRun: () => r
          };
          N(this, gt).push(i), e.push(() => {
            $(this, gt, N(this, gt).filter((o) => o !== i));
          });
        } else
          N(this, gt).push(r), e.push(() => {
            $(this, gt, N(this, gt).filter((i) => i !== r));
          });
      }), () => {
        e.forEach((n) => n());
      };
    }, this.addBaseKeymap = () => {
      const t = qv(DC);
      return this.addObjectKeymap(t);
    }, this.build = () => {
      const t = {};
      return N(this, gt).forEach((e) => {
        t[e.key] = [...t[e.key] || [], e];
      }), Object.fromEntries(Object.entries(t).map(([e, n]) => {
        const r = n.sort((o, s) => (s.priority ?? 50) - (o.priority ?? 50));
        return [e, (o, s, l) => {
          const a = N(this, Dr);
          if (a == null) throw Ol();
          return Xi(...r.map((c) => c.onRun(a)))(o, s, l);
        }];
      }));
    };
  }
  get ctx() {
    return N(this, Dr);
  }
}, Dr = new WeakMap(), gt = new WeakMap(), Bp), Sl = pe(new Gg(), "keymap"), Ra = pe([wt], "keymapTimer"), Do = fn("KeymapReady"), Kv = (t) => {
  const e = new Gg();
  return e.setCtx(t), t.inject(Sl, e).inject(Ra, [wt]).record(Do), async () => (await t.waitTimers(Ra), t.done(Do), () => {
    t.remove(Sl).remove(Ra).clearTimer(Do);
  });
}, el = fn("ParserReady"), Yg = () => {
  throw Ol();
}, tl = pe(Yg, "parser"), La = pe([], "parserTimer"), Xg = (t) => (t.inject(tl, Yg).inject(La, [wt]).record(el), async () => {
  await t.waitTimers(La);
  const e = t.get(_r), n = t.get(dr);
  return t.set(tl, rS.create(n, e)), t.done(el), () => {
    t.remove(tl).remove(La).clearTimer(el);
  };
});
zn(Xg, { displayName: "Parser" });
var Ro = fn("SerializerReady"), Pa = pe([], "serializerTimer"), Qg = () => {
  throw Ol();
}, Lo = pe(Qg, "serializer"), Zg = (t) => (t.inject(Lo, Qg).inject(Pa, [wt]).record(Ro), async () => {
  await t.waitTimers(Pa);
  const e = t.get(_r), n = t.get(dr);
  return t.set(Lo, oS.create(n, e)), t.done(Ro), () => {
    t.remove(Lo).remove(Pa).clearTimer(Ro);
  };
});
zn(Zg, { displayName: "Serializer" });
var nl = pe("", "defaultValue"), za = pe((t) => t, "stateOptions"), Ba = pe([], "editorStateTimer"), rl = fn("EditorStateReady");
function Uv(t, e, n) {
  if (typeof t == "string") return e(t);
  if (t.type === "html") return ru.fromSchema(n).parse(t.dom);
  if (t.type === "json") return Rn.fromJSON(n, t.value);
  throw Db(t);
}
var Jv = new st("MILKDOWN_STATE_TRACKER"), ey = (t) => (t.inject(nl, "").inject(wo, {}).inject(za, (e) => e).inject(Ba, [
  el,
  Ro,
  Oo,
  Do
]).record(rl), async () => {
  await t.waitTimers(Ba);
  const e = t.get(dr), n = t.get(tl), r = t.get(Wo), i = t.get(za), o = t.get(an), s = Uv(t.get(nl), n, e), l = t.get(Sl), a = l.addBaseKeymap(), c = [
    ...o,
    new Ie({
      key: Jv,
      state: {
        init: () => {
        },
        apply: (d, h, m, b) => {
          t.set(wo, b);
        }
      }
    }),
    HC({ rules: r }),
    og(l.build())
  ];
  t.set(an, c);
  const u = i({
    schema: e,
    doc: s,
    plugins: c
  }), f = gi.create(u);
  return t.set(wo, f), t.done(rl), () => {
    a(), t.remove(nl).remove(wo).remove(za).remove(Ba).clearTimer(rl);
  };
});
zn(ey, { displayName: "EditorState" });
var Ko = pe([], "pasteRule"), Fa = pe([wt], "pasteRuleTimer"), il = fn("PasteRuleReady"), ty = (t) => (t.inject(Ko, []).inject(Fa, [wt]).record(il), async () => (await t.waitTimers(Fa), t.done(il), () => {
  t.remove(Ko).remove(Fa).clearTimer(il);
}));
zn(ty, { displayName: "PasteRule" });
var ol = fn("EditorViewReady"), $a = pe([], "editorViewTimer"), sl = pe({}, "editorViewOptions"), ll = pe(null, "root"), Rc = pe(null, "rootDOM"), Lc = pe({}, "rootAttrs");
function Gv(t, e) {
  const n = document.createElement("div");
  n.className = "milkdown", t.appendChild(n), e.set(Rc, n);
  const r = e.get(Lc);
  return Object.entries(r).forEach(([i, o]) => n.setAttribute(i, o)), n;
}
function Yv(t) {
  t.classList.add("editor"), t.setAttribute("role", "textbox");
}
var Xv = new st("MILKDOWN_VIEW_CLEAR"), ny = (t) => (t.inject(ll, document.body).inject(Re, {}).inject(sl, {}).inject(Rc, null).inject(Lc, {}).inject($a, [rl, il]).record(ol), async () => {
  await t.wait(Vr);
  const e = t.get(ll) || document.body, n = typeof e == "string" ? document.querySelector(e) : e;
  t.update(an, (s) => [new Ie({
    key: Xv,
    view: (l) => {
      const a = n ? Gv(n, t) : void 0;
      return (() => {
        if (a && n) {
          const u = l.dom;
          n.replaceChild(a, u), a.appendChild(u);
        }
      })(), { destroy: () => {
        a != null && a.parentNode && (a == null || a.parentNode.replaceChild(l.dom, a)), a == null || a.remove();
      } };
    }
  }), ...s]), await t.waitTimers($a);
  const r = t.get(wo), i = t.get(sl), o = new Wg(n, {
    state: r,
    nodeViews: Object.fromEntries(t.get(Oc)),
    markViews: Object.fromEntries(t.get(Dc)),
    transformPasted: (s, l, a) => (t.get(Ko).sort((c, u) => (u.priority ?? 50) - (c.priority ?? 50)).map((c) => c.run).forEach((c) => {
      s = c(s, l, a);
    }), s),
    ...i
  });
  return Yv(o.dom), t.set(Re, o), t.done(ol), () => {
    o == null || o.destroy(), t.remove(ll).remove(Re).remove(sl).remove(Rc).remove(Lc).remove($a).clearTimer(ol);
  };
});
zn(ny, { displayName: "EditorView" });
var Ft = /* @__PURE__ */ function(t) {
  return t.Idle = "Idle", t.OnCreate = "OnCreate", t.Created = "Created", t.OnDestroy = "OnDestroy", t.Destroyed = "Destroyed", t;
}({}), Rr, Et, En, Fi, as, cs, yt, An, Lr, us, Pr, $i, fs, or, _i, Vi, Qv = (Vi = class {
  constructor() {
    q(this, Rr);
    q(this, Et);
    q(this, En);
    q(this, Fi);
    q(this, as);
    q(this, cs);
    q(this, yt);
    q(this, An);
    q(this, Lr);
    q(this, us);
    q(this, Pr);
    q(this, $i);
    q(this, fs);
    q(this, or);
    q(this, _i);
    $(this, Rr, !1), $(this, Et, Ft.Idle), $(this, En, []), $(this, Fi, () => {
    }), $(this, as, new $p()), $(this, cs, new Wb()), $(this, yt, /* @__PURE__ */ new Map()), $(this, An, /* @__PURE__ */ new Map()), $(this, Lr, new jb(N(this, as), N(this, cs))), $(this, us, () => {
      const e = Hv(async (r) => {
        await Promise.all(N(this, En).map((i) => Promise.resolve(i(r))));
      }), n = [
        Kg,
        Xg,
        Zg,
        Jg,
        Kv,
        ty,
        ey,
        ny,
        jv(this),
        e
      ];
      N(this, Pr).call(this, n, N(this, An));
    }), $(this, Pr, (e, n) => {
      e.forEach((r) => {
        const i = N(this, Lr).produce(N(this, Rr) ? r.meta : void 0), o = r(i);
        n.set(r, {
          ctx: i,
          handler: o,
          cleanup: void 0
        });
      });
    }), $(this, $i, (e, n = !1) => Promise.all([e].flat().map(async (r) => {
      var o;
      const i = (o = N(this, yt).get(r)) == null ? void 0 : o.cleanup;
      return n ? N(this, yt).delete(r) : N(this, yt).set(r, {
        ctx: void 0,
        handler: void 0,
        cleanup: void 0
      }), typeof i == "function" ? i() : i;
    }))), $(this, fs, async () => {
      await Promise.all([...N(this, An).entries()].map(async ([e, { cleanup: n }]) => typeof n == "function" ? n() : n)), N(this, An).clear();
    }), $(this, or, (e) => {
      $(this, Et, e), N(this, Fi).call(this, e);
    }), $(this, _i, (e) => [...e.entries()].map(async ([n, r]) => {
      const { ctx: i, handler: o } = r;
      if (!o) return;
      const s = await o();
      e.set(n, {
        ctx: i,
        handler: o,
        cleanup: s
      });
    })), this.enableInspector = (e = !0) => ($(this, Rr, e), this), this.onStatusChange = (e) => ($(this, Fi, e), this), this.config = (e) => (N(this, En).push(e), this), this.removeConfig = (e) => ($(this, En, N(this, En).filter((n) => n !== e)), this), this.use = (e) => {
      const n = [e].flat();
      return n.flat().forEach((r) => {
        N(this, yt).set(r, {
          ctx: void 0,
          handler: void 0,
          cleanup: void 0
        });
      }), N(this, Et) === Ft.Created && N(this, Pr).call(this, n, N(this, yt)), this;
    }, this.remove = async (e) => N(this, Et) === Ft.OnCreate ? (console.warn("[Milkdown]: You are trying to remove plugins when the editor is creating, this is not recommended, please check your code."), new Promise((n) => {
      setTimeout(() => {
        n(this.remove(e));
      }, 50);
    })) : (await N(this, $i).call(this, [e].flat(), !0), this), this.create = async () => N(this, Et) === Ft.OnCreate ? this : (N(this, Et) === Ft.Created && await this.destroy(), N(this, or).call(this, Ft.OnCreate), N(this, us).call(this), N(this, Pr).call(this, [...N(this, yt).keys()], N(this, yt)), await Promise.all([N(this, _i).call(this, N(this, An)), N(this, _i).call(this, N(this, yt))].flat()), N(this, or).call(this, Ft.Created), this), this.destroy = async (e = !1) => N(this, Et) === Ft.Destroyed || N(this, Et) === Ft.OnDestroy ? this : N(this, Et) === Ft.OnCreate ? new Promise((n) => {
      setTimeout(() => {
        n(this.destroy(e));
      }, 50);
    }) : (e && $(this, En, []), N(this, or).call(this, Ft.OnDestroy), await N(this, $i).call(this, [...N(this, yt).keys()], e), await N(this, fs).call(this), N(this, or).call(this, Ft.Destroyed), this), this.action = (e) => e(N(this, Lr)), this.inspect = () => N(this, Rr) ? [...N(this, An).values(), ...N(this, yt).values()].map(({ ctx: e }) => {
      var n;
      return (n = e == null ? void 0 : e.inspector) == null ? void 0 : n.read();
    }).filter((e) => !!e) : (console.warn("[Milkdown]: You are trying to collect inspection when inspector is disabled, please enable inspector by `editor.enableInspector()` first."), []);
  }
  static make() {
    return new Vi();
  }
  get ctx() {
    return N(this, Lr);
  }
  get status() {
    return N(this, Et);
  }
}, Rr = new WeakMap(), Et = new WeakMap(), En = new WeakMap(), Fi = new WeakMap(), as = new WeakMap(), cs = new WeakMap(), yt = new WeakMap(), An = new WeakMap(), Lr = new WeakMap(), us = new WeakMap(), Pr = new WeakMap(), $i = new WeakMap(), fs = new WeakMap(), or = new WeakMap(), _i = new WeakMap(), Vi);
function ie(t, e) {
  const n = Wv(t), r = (i) => async () => {
    r.key = n, await i.wait(Oo);
    const o = e(i);
    return i.get(we).create(n, o), r.run = (s) => i.get(we).call(t, s), () => {
      i.get(we).remove(n);
    };
  };
  return r;
}
function Ct(t) {
  const e = (n) => async () => {
    await n.wait(wt);
    const r = t(n);
    return n.update(Wo, (i) => [...i, r]), e.inputRule = r, () => {
      n.update(Wo, (i) => i.filter((o) => o !== r));
    };
  };
  return e;
}
function Zv(t) {
  const e = (n) => async () => {
    await n.wait(wt);
    const r = t(n);
    return n.update(Ko, (i) => [...i, r]), e.pasteRule = r, () => {
      n.update(Ko, (i) => i.filter((o) => o !== r));
    };
  };
  return e;
}
function eM(t, e) {
  const n = (r) => async () => {
    const i = e(r);
    return r.update(Io, (o) => [...o.filter((s) => s[0] !== t), [t, i]]), n.id = t, n.schema = i, () => {
      r.update(Io, (o) => o.filter(([s]) => s !== t));
    };
  };
  return n.type = (r) => {
    const i = r.get(dr).marks[t];
    if (!i) throw $b(t);
    return i;
  }, n;
}
function Su(t, e) {
  const n = (r) => async () => {
    const i = e(r);
    return r.update(Ao, (o) => [...o.filter((s) => s[0] !== t), [t, i]]), n.id = t, n.schema = i, () => {
      r.update(Ao, (o) => o.filter(([s]) => s !== t));
    };
  };
  return n.type = (r) => {
    const i = r.get(dr).nodes[t];
    if (!i) throw Fb(t);
    return i;
  }, n;
}
function dn(t) {
  let e;
  const n = (r) => async () => (await r.wait(wt), e = t(r), r.update(an, (i) => [...i, e]), () => {
    r.update(an, (i) => i.filter((o) => o !== e));
  });
  return n.plugin = () => e, n.key = () => e.spec.key, n;
}
function tM(t) {
  const e = (n) => async () => {
    await n.wait(Do);
    const r = n.get(Sl), i = t(n), o = r.addObjectKeymap(i);
    return e.keymap = i, () => {
      o();
    };
  };
  return e;
}
function Bn(t, e) {
  const n = pe(t, e), r = (i) => (i.inject(n), () => () => {
    i.remove(n);
  });
  return r.key = n, r;
}
function De(t, e) {
  const n = Bn(e, t), r = Su(t, (o) => o.get(n.key)(o)), i = [n, r];
  return i.id = r.id, i.node = r, i.type = (o) => r.type(o), i.ctx = n, i.key = n.key, i.extendSchema = (o) => De(t, o(e)), i;
}
function Qi(t, e) {
  const n = Bn(e, t), r = eM(t, (o) => o.get(n.key)(o)), i = [n, r];
  return i.id = r.id, i.mark = r, i.type = (o) => r.type(o), i.ctx = n, i.key = n.key, i.extendSchema = (o) => Qi(t, o(e)), i;
}
function St(t, e) {
  const n = Bn(Object.fromEntries(Object.entries(e).map(([o, { shortcuts: s, priority: l }]) => [o, {
    shortcuts: s,
    priority: l
  }])), `${t}Keymap`), r = tM((o) => {
    const s = o.get(n.key), l = Object.entries(e).flatMap(([a, { command: c }]) => {
      const u = s[a], f = [u.shortcuts].flat(), d = u.priority;
      return f.map((h) => [h, {
        key: h,
        onRun: c,
        priority: d
      }]);
    });
    return Object.fromEntries(l);
  }), i = [n, r];
  return i.ctx = n, i.shortcuts = r, i.key = n.key, i.keymap = r.keymap, i;
}
var Qt = (t, e = () => ({})) => Bn(e, `${t}Attr`), bs = (t, e = () => ({})) => Bn(e, `${t}Attr`);
function hn(t, e, n) {
  const r = Bn({}, t), i = (s) => async () => {
    await s.wait(Vr);
    const l = {
      plugin: e(s),
      options: s.get(r.key)
    };
    return s.update(qo, (a) => [...a, l]), () => {
      s.update(qo, (a) => a.filter((c) => c !== l));
    };
  }, o = [r, i];
  return o.id = t, o.plugin = i, o.options = r, o;
}
function nM(t, e) {
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
        let f = z.empty, d = i.index(-1) ? 1 : i.index(-2) ? 2 : 3;
        for (let x = i.depth - d; x >= i.depth - 3; x--)
          f = z.from(i.node(x).copy(f));
        let h = i.indexAfter(-1) < i.node(-2).childCount ? 1 : i.indexAfter(-2) < i.node(-3).childCount ? 2 : 3;
        f = f.append(z.from(t.createAndFill()));
        let m = i.before(i.depth - (d - 1)), b = n.tr.replace(m, i.after(-h), new H(f, 4 - d, 0)), C = -1;
        b.doc.nodesBetween(m, b.doc.content.size, (x, L) => {
          if (C > -1)
            return !1;
          x.isTextblock && x.content.size == 0 && (C = L + 1);
        }), C > -1 && b.setSelection(se.near(b.doc.resolve(C))), r(b.scrollIntoView());
      }
      return !0;
    }
    let a = o.pos == i.end() ? l.contentMatchAt(0).defaultType : null, c = n.tr.delete(i.pos, o.pos), u = a ? [null, { type: a }] : void 0;
    return Mo(c.doc, i.pos, 2, u) ? (r && r(c.split(i.pos, 2, u).scrollIntoView()), !0) : !1;
  };
}
function ry(t) {
  return function(e, n) {
    let { $from: r, $to: i } = e.selection, o = r.blockRange(i, (s) => s.childCount > 0 && s.firstChild.type == t);
    return o ? n ? r.node(o.depth - 1).type == t ? rM(e, n, t, o) : iM(e, n, o) : !0 : !1;
  };
}
function rM(t, e, n, r) {
  let i = t.tr, o = r.end, s = r.$to.end(r.depth);
  o < s && (i.step(new rt(o - 1, s, o, s, new H(z.from(n.create(null, r.parent.copy())), 1, 0), 1, !0)), r = new Sm(i.doc.resolve(r.$from.pos), i.doc.resolve(s), r.depth));
  const l = Bl(r);
  if (l == null)
    return !1;
  i.lift(r, l);
  let a = i.doc.resolve(i.mapping.map(o, -1) - 1);
  return Fl(i.doc, a.pos) && a.nodeBefore.type == a.nodeAfter.type && i.join(a.pos), e(i.scrollIntoView()), !0;
}
function iM(t, e, n) {
  let r = t.tr, i = n.parent;
  for (let h = n.end, m = n.endIndex - 1, b = n.startIndex; m > b; m--)
    h -= i.child(m).nodeSize, r.delete(h - 1, h + 1);
  let o = r.doc.resolve(n.start), s = o.nodeAfter;
  if (r.mapping.map(n.end) != n.start + o.nodeAfter.nodeSize)
    return !1;
  let l = n.startIndex == 0, a = n.endIndex == i.childCount, c = o.node(-1), u = o.index(-1);
  if (!c.canReplace(u + (l ? 0 : 1), u + 1, s.content.append(a ? z.empty : z.from(i))))
    return !1;
  let f = o.pos, d = f + s.nodeSize;
  return r.step(new rt(f - (l ? 1 : 0), d + (a ? 1 : 0), f + 1, d - 1, new H((l ? z.empty : z.from(i.copy(z.empty))).append(a ? z.empty : z.from(i.copy(z.empty))), l ? 0 : 1, a ? 0 : 1), l ? 0 : 1)), e(r.scrollIntoView()), !0;
}
function oM(t) {
  return function(e, n) {
    let { $from: r, $to: i } = e.selection, o = r.blockRange(i, (c) => c.childCount > 0 && c.firstChild.type == t);
    if (!o)
      return !1;
    let s = o.startIndex;
    if (s == 0)
      return !1;
    let l = o.parent, a = l.child(s - 1);
    if (a.type != t)
      return !1;
    if (n) {
      let c = a.lastChild && a.lastChild.type == l.type, u = z.from(c ? t.create() : null), f = new H(z.from(t.create(null, z.from(l.type.create(null, u)))), c ? 3 : 1, 0), d = o.start, h = o.end;
      n(e.tr.step(new rt(d - (c ? 3 : 1), h, d, h, f, 1, !0)).scrollIntoView());
    }
    return !0;
  };
}
function sM(t) {
  const e = /* @__PURE__ */ new Map();
  if (!t || !t.type)
    throw new Error("mdast-util-definitions expected node");
  return Yi(t, "definition", function(r) {
    const i = Vh(r.identifier);
    i && !e.get(i) && e.set(i, r);
  }), n;
  function n(r) {
    const i = Vh(r);
    return e.get(i);
  }
}
function Vh(t) {
  return String(t || "").toUpperCase();
}
function lM() {
  return function(t) {
    const e = sM(t);
    Yi(t, function(n, r, i) {
      if (n.type === "definition" && i !== void 0 && typeof r == "number")
        return i.children.splice(r, 1), [lc, r];
      if (n.type === "imageReference" || n.type === "linkReference") {
        const o = e(n.identifier);
        if (o && i && typeof r == "number")
          return i.children[r] = n.type === "imageReference" ? { type: "image", url: o.url, title: o.title, alt: n.alt } : {
            type: "link",
            url: o.url,
            title: o.title,
            children: n.children
          }, [lc, r];
      }
    });
  };
}
function iy(t, e) {
  var r;
  if (!(e.childCount >= 1 && ((r = e.lastChild) == null ? void 0 : r.type.name) === "hardbreak")) {
    t.next(e.content);
    return;
  }
  const n = [];
  e.content.forEach((i, o, s) => {
    s !== e.childCount - 1 && n.push(i);
  }), t.next(z.fromArray(n));
}
function R(t, e) {
  return Object.assign(t, { meta: {
    package: "@milkdown/preset-commonmark",
    ...e
  } }), t;
}
var vu = bs("emphasis");
R(vu, {
  displayName: "Attr<emphasis>",
  group: "Emphasis"
});
var Zi = Qi("emphasis", (t) => ({
  attrs: { marker: {
    default: t.get(Eo).emphasis || "*",
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
  toDOM: (e) => ["em", t.get(vu.key)(e)],
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
R(Zi.mark, {
  displayName: "MarkSchema<emphasis>",
  group: "Emphasis"
});
R(Zi.ctx, {
  displayName: "MarkSchemaCtx<emphasis>",
  group: "Emphasis"
});
var Mu = ie("ToggleEmphasis", (t) => () => ps(Zi.type(t)));
R(Mu, {
  displayName: "Command<toggleEmphasisCommand>",
  group: "Emphasis"
});
var oy = Ct((t) => ms(/(?:^|[^*])\*([^*]+)\*$/, Zi.type(t), {
  getAttr: () => ({ marker: "*" }),
  updateCaptured: ({ fullMatch: e, start: n }) => e.startsWith("*") ? {} : {
    fullMatch: e.slice(1),
    start: n + 1
  }
}));
R(oy, {
  displayName: "InputRule<emphasis>|Star",
  group: "Emphasis"
});
var sy = Ct((t) => ms(/\b_(?![_\s])(.*?[^_\s])_\b/, Zi.type(t), {
  getAttr: () => ({ marker: "_" }),
  updateCaptured: ({ fullMatch: e, start: n }) => e.startsWith("_") ? {} : {
    fullMatch: e.slice(1),
    start: n + 1
  }
}));
R(sy, {
  displayName: "InputRule<emphasis>|Underscore",
  group: "Emphasis"
});
var Tu = St("emphasisKeymap", { ToggleEmphasis: {
  shortcuts: "Mod-i",
  command: (t) => {
    const e = t.get(we);
    return () => e.call(Mu.key);
  }
} });
R(Tu.ctx, {
  displayName: "KeymapCtx<emphasis>",
  group: "Emphasis"
});
R(Tu.shortcuts, {
  displayName: "Keymap<emphasis>",
  group: "Emphasis"
});
var Nu = bs("strong");
R(Nu, {
  displayName: "Attr<strong>",
  group: "Strong"
});
var ws = Qi("strong", (t) => ({
  attrs: { marker: {
    default: t.get(Eo).strong || "*",
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
  toDOM: (e) => ["strong", t.get(Nu.key)(e)],
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
R(ws.mark, {
  displayName: "MarkSchema<strong>",
  group: "Strong"
});
R(ws.ctx, {
  displayName: "MarkSchemaCtx<strong>",
  group: "Strong"
});
var Eu = ie("ToggleStrong", (t) => () => ps(ws.type(t)));
R(Eu, {
  displayName: "Command<toggleStrongCommand>",
  group: "Strong"
});
var ly = Ct((t) => ms(new RegExp("(?:^|[^\\\\w:/])(?:\\\\*\\\\*|__)([^*_]+?)(?:\\\\*\\\\*|__)(?![\\\\w/])$"), ws.type(t), { updateCaptured: (e) => e.fullMatch.startsWith("**") || e.fullMatch.startsWith("__") ? e : { start: e.start + 1, fullMatch: e.fullMatch.slice(1) }, getAttr: (e) => ({ marker: (e[0].startsWith("**") || e[0].startsWith("__") ? e[0] : e[0].slice(1)).startsWith("*") ? "*" : "_" }) }));
R(ly, {
  displayName: "InputRule<strong>",
  group: "Strong"
});
var Au = St("strongKeymap", { ToggleBold: {
  shortcuts: ["Mod-b"],
  command: (t) => {
    const e = t.get(we);
    return () => e.call(Eu.key);
  }
} });
R(Au.ctx, {
  displayName: "KeymapCtx<strong>",
  group: "Strong"
});
R(Au.shortcuts, {
  displayName: "Keymap<strong>",
  group: "Strong"
});
var Iu = bs("inlineCode");
R(Iu, {
  displayName: "Attr<inlineCode>",
  group: "InlineCode"
});
var ar = Qi("inlineCode", (t) => ({
  priority: 100,
  code: !0,
  parseDOM: [{ tag: "code" }],
  toDOM: (e) => ["code", t.get(Iu.key)(e)],
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
R(ar.mark, {
  displayName: "MarkSchema<inlineCode>",
  group: "InlineCode"
});
R(ar.ctx, {
  displayName: "MarkSchemaCtx<inlineCode>",
  group: "InlineCode"
});
var Ou = ie("ToggleInlineCode", (t) => () => (e, n) => {
  const { selection: r, tr: i } = e;
  if (r.empty) return !1;
  const { from: o, to: s } = r;
  return e.doc.rangeHasMark(o, s, ar.type(t)) ? (n == null || n(i.removeMark(o, s, ar.type(t))), !0) : (Object.keys(e.schema.marks).filter((l) => l !== ar.type.name).map((l) => e.schema.marks[l]).forEach((l) => {
    i.removeMark(o, s, l);
  }), n == null || n(i.addMark(o, s, ar.type(t).create())), !0);
});
R(Ou, {
  displayName: "Command<toggleInlineCodeCommand>",
  group: "InlineCode"
});
var ay = Ct((t) => ms(/(?:`)([^`]+)(?:`)$/, ar.type(t)));
R(ay, {
  displayName: "InputRule<inlineCodeInputRule>",
  group: "InlineCode"
});
var Du = St("inlineCodeKeymap", { ToggleInlineCode: {
  shortcuts: "Mod-e",
  command: (t) => {
    const e = t.get(we);
    return () => e.call(Ou.key);
  }
} });
R(Du.ctx, {
  displayName: "KeymapCtx<inlineCode>",
  group: "InlineCode"
});
R(Du.shortcuts, {
  displayName: "Keymap<inlineCode>",
  group: "InlineCode"
});
var Ru = bs("link");
R(Ru, {
  displayName: "Attr<link>",
  group: "Link"
});
var xi = Qi("link", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw un(e);
      return {
        href: e.getAttribute("href"),
        title: e.getAttribute("title")
      };
    }
  }],
  toDOM: (e) => ["a", {
    ...t.get(Ru.key)(e),
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
R(xi.mark, {
  displayName: "MarkSchema<link>",
  group: "Link"
});
var cy = ie("ToggleLink", (t) => (e = {}) => ps(xi.type(t), e));
R(cy, {
  displayName: "Command<toggleLinkCommand>",
  group: "Link"
});
var uy = ie("UpdateLink", (t) => (e = {}) => (n, r) => {
  if (!r) return !1;
  let i, o = -1;
  const { selection: s } = n, { from: l, to: a } = s;
  if (n.doc.nodesBetween(l, l === a ? a + 1 : a, (m, b) => {
    if (xi.type(t).isInSet(m.marks))
      return i = m, o = b, !1;
  }), !i) return !1;
  const c = i.marks.find(({ type: m }) => m === xi.type(t));
  if (!c) return !1;
  const u = o, f = o + i.nodeSize, { tr: d } = n, h = xi.type(t).create({
    ...c.attrs,
    ...e
  });
  return h ? (r(d.removeMark(u, f, c).addMark(u, f, h).setSelection(new ee(d.selection.$anchor)).scrollIntoView()), !0) : !1;
});
R(uy, {
  displayName: "Command<updateLinkCommand>",
  group: "Link"
});
var fy = Su("doc", () => ({
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
R(fy, {
  displayName: "NodeSchema<doc>",
  group: "Doc"
});
function aM(t) {
  return Zc(t, (e) => {
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
var Wl = hn("remark-preserve-empty-line", () => () => aM);
R(Wl.plugin, {
  displayName: "Remark<remarkPreserveEmptyLine>",
  group: "Remark"
});
R(Wl.options, {
  displayName: "RemarkConfig<remarkPreserveEmptyLine>",
  group: "Remark"
});
var Lu = Qt("paragraph");
R(Lu, {
  displayName: "Attr<paragraph>",
  group: "Paragraph"
});
var cn = De("paragraph", (t) => ({
  content: "inline*",
  group: "block",
  parseDOM: [{ tag: "p" }],
  toDOM: (e) => [
    "p",
    t.get(Lu.key)(e),
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
      const r = (i = t.get(Re).state) == null ? void 0 : i.doc.lastChild;
      e.openNode("paragraph"), (!n.content || n.content.size === 0) && n !== r && cM(t) ? e.addNode("html", void 0, "<br />") : iy(e, n), e.closeNode();
    }
  }
}));
function cM(t) {
  let e = !1;
  try {
    t.get(Wl.id), e = !0;
  } catch {
    e = !1;
  }
  return e;
}
R(cn.node, {
  displayName: "NodeSchema<paragraph>",
  group: "Paragraph"
});
R(cn.ctx, {
  displayName: "NodeSchemaCtx<paragraph>",
  group: "Paragraph"
});
var Pu = ie("TurnIntoText", (t) => () => On(cn.type(t)));
R(Pu, {
  displayName: "Command<turnIntoTextCommand>",
  group: "Paragraph"
});
var zu = St("paragraphKeymap", { TurnIntoText: {
  shortcuts: "Mod-Alt-0",
  command: (t) => {
    const e = t.get(we);
    return () => e.call(Pu.key);
  }
} });
R(zu.ctx, {
  displayName: "KeymapCtx<paragraph>",
  group: "Paragraph"
});
R(zu.shortcuts, {
  displayName: "Keymap<paragraph>",
  group: "Paragraph"
});
var uM = Array(6).fill(0).map((t, e) => e + 1);
function fM(t) {
  return t.textContent.toLowerCase().trim().replace(/\s+/g, "-");
}
var ql = Bn(fM, "headingIdGenerator");
R(ql, {
  displayName: "Ctx<HeadingIdGenerator>",
  group: "Heading"
});
var Bu = Qt("heading");
R(Bu, {
  displayName: "Attr<heading>",
  group: "Heading"
});
var ri = De("heading", (t) => {
  const e = t.get(ql.key);
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
    parseDOM: uM.map((n) => ({
      tag: `h${n}`,
      getAttrs: (r) => {
        if (!(r instanceof HTMLElement)) throw un(r);
        return {
          level: n,
          id: r.id
        };
      }
    })),
    toDOM: (n) => [
      `h${n.attrs.level}`,
      {
        ...t.get(Bu.key)(n),
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
        n.openNode("heading", void 0, { depth: r.attrs.level }), iy(n, r), n.closeNode();
      }
    }
  };
});
R(ri.node, {
  displayName: "NodeSchema<heading>",
  group: "Heading"
});
R(ri.ctx, {
  displayName: "NodeSchemaCtx<heading>",
  group: "Heading"
});
var dy = Ct((t) => ng(/^(#+)\s$/, ri.type(t), (e) => {
  var o, s;
  const n = (e[1] || "").length || 0, { $from: r } = t.get(Re).state.selection, i = r.node();
  if (i.type.name === "heading") {
    let l = Number(i.attrs.level) + Number(n);
    return l > 6 && (l = 6), { level: l };
  }
  return { level: n };
}));
R(dy, {
  displayName: "InputRule<wrapInHeadingInputRule>",
  group: "Heading"
});
var Qn = ie("WrapInHeading", (t) => (e) => (e ?? (e = 1), e < 1 ? On(cn.type(t)) : On(ri.type(t), { level: e })));
R(Qn, {
  displayName: "Command<wrapInHeadingCommand>",
  group: "Heading"
});
var Fu = ie("DowngradeHeading", (t) => () => (e, n, r) => {
  const { $from: i } = e.selection, o = i.node();
  if (o.type !== ri.type(t) || !e.selection.empty || i.parentOffset !== 0) return !1;
  const s = o.attrs.level - 1;
  return s ? (n == null || n(e.tr.setNodeMarkup(e.selection.$from.before(), void 0, {
    ...o.attrs,
    level: s
  })), !0) : On(cn.type(t))(e, n, r);
});
R(Fu, {
  displayName: "Command<downgradeHeadingCommand>",
  group: "Heading"
});
var $u = St("headingKeymap", {
  TurnIntoH1: {
    shortcuts: "Mod-Alt-1",
    command: (t) => {
      const e = t.get(we);
      return () => e.call(Qn.key, 1);
    }
  },
  TurnIntoH2: {
    shortcuts: "Mod-Alt-2",
    command: (t) => {
      const e = t.get(we);
      return () => e.call(Qn.key, 2);
    }
  },
  TurnIntoH3: {
    shortcuts: "Mod-Alt-3",
    command: (t) => {
      const e = t.get(we);
      return () => e.call(Qn.key, 3);
    }
  },
  TurnIntoH4: {
    shortcuts: "Mod-Alt-4",
    command: (t) => {
      const e = t.get(we);
      return () => e.call(Qn.key, 4);
    }
  },
  TurnIntoH5: {
    shortcuts: "Mod-Alt-5",
    command: (t) => {
      const e = t.get(we);
      return () => e.call(Qn.key, 5);
    }
  },
  TurnIntoH6: {
    shortcuts: "Mod-Alt-6",
    command: (t) => {
      const e = t.get(we);
      return () => e.call(Qn.key, 6);
    }
  },
  DowngradeHeading: {
    shortcuts: ["Delete", "Backspace"],
    command: (t) => {
      const e = t.get(we);
      return () => e.call(Fu.key);
    }
  }
});
R($u.ctx, {
  displayName: "KeymapCtx<heading>",
  group: "Heading"
});
R($u.shortcuts, {
  displayName: "Keymap<heading>",
  group: "Heading"
});
var _u = Qt("blockquote");
R(_u, {
  displayName: "Attr<blockquote>",
  group: "Blockquote"
});
var xs = De("blockquote", (t) => ({
  content: "block+",
  group: "block",
  defining: !0,
  parseDOM: [{ tag: "blockquote" }],
  toDOM: (e) => [
    "blockquote",
    t.get(_u.key)(e),
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
R(xs.node, {
  displayName: "NodeSchema<blockquote>",
  group: "Blockquote"
});
R(xs.ctx, {
  displayName: "NodeSchemaCtx<blockquote>",
  group: "Blockquote"
});
var hy = Ct((t) => du(/^\s*>\s$/, xs.type(t)));
R(hy, {
  displayName: "InputRule<wrapInBlockquoteInputRule>",
  group: "Blockquote"
});
var Vu = ie("WrapInBlockquote", (t) => () => fu(xs.type(t)));
R(Vu, {
  displayName: "Command<wrapInBlockquoteCommand>",
  group: "Blockquote"
});
var Hu = St("blockquoteKeymap", { WrapInBlockquote: {
  shortcuts: "Mod-Shift-b",
  command: (t) => {
    const e = t.get(we);
    return () => e.call(Vu.key);
  }
} });
R(Hu.ctx, {
  displayName: "KeymapCtx<blockquote>",
  group: "Blockquote"
});
R(Hu.shortcuts, {
  displayName: "Keymap<blockquote>",
  group: "Blockquote"
});
var ju = Qt("codeBlock", () => ({
  pre: {},
  code: {}
}));
R(ju, {
  displayName: "Attr<codeBlock>",
  group: "CodeBlock"
});
var Cs = De("code_block", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw un(e);
      return { language: e.dataset.language };
    }
  }],
  toDOM: (e) => {
    const n = t.get(ju.key)(e), r = e.attrs.language, i = r && r.length > 0 ? { "data-language": r } : void 0;
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
R(Cs.node, {
  displayName: "NodeSchema<codeBlock>",
  group: "CodeBlock"
});
R(Cs.ctx, {
  displayName: "NodeSchemaCtx<codeBlock>",
  group: "CodeBlock"
});
var py = Ct((t) => ng(/^```([a-z]*)?[\s\n]$/, Cs.type(t), (e) => {
  var n;
  return { language: e[1] ?? "" };
}));
R(py, {
  displayName: "InputRule<createCodeBlockInputRule>",
  group: "CodeBlock"
});
var Wu = ie("CreateCodeBlock", (t) => (e = "") => On(Cs.type(t), { language: e }));
R(Wu, {
  displayName: "Command<createCodeBlockCommand>",
  group: "CodeBlock"
});
var dM = ie("UpdateCodeBlockLanguage", () => ({ pos: t, language: e } = {
  pos: -1,
  language: ""
}) => (n, r) => t >= 0 ? (r == null || r(n.tr.setNodeAttribute(t, "language", e)), !0) : !1);
R(dM, {
  displayName: "Command<updateCodeBlockLanguageCommand>",
  group: "CodeBlock"
});
var qu = St("codeBlockKeymap", { CreateCodeBlock: {
  shortcuts: "Mod-Alt-c",
  command: (t) => {
    const e = t.get(we);
    return () => e.call(Wu.key);
  }
} });
R(qu.ctx, {
  displayName: "KeymapCtx<codeBlock>",
  group: "CodeBlock"
});
R(qu.shortcuts, {
  displayName: "Keymap<codeBlock>",
  group: "CodeBlock"
});
var Ku = Qt("image");
R(Ku, {
  displayName: "Attr<image>",
  group: "Image"
});
var eo = De("image", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw un(e);
      return {
        src: e.getAttribute("src") || "",
        alt: e.getAttribute("alt") || "",
        title: e.getAttribute("title") || e.getAttribute("alt") || ""
      };
    }
  }],
  toDOM: (e) => ["img", {
    ...t.get(Ku.key)(e),
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
R(eo.node, {
  displayName: "NodeSchema<image>",
  group: "Image"
});
R(eo.ctx, {
  displayName: "NodeSchemaCtx<image>",
  group: "Image"
});
var my = ie("InsertImage", (t) => (e = {}) => (n, r) => {
  if (!r) return !0;
  const { src: i = "", alt: o = "", title: s = "" } = e, l = eo.type(t).create({
    src: i,
    alt: o,
    title: s
  });
  return l && r(n.tr.replaceSelectionWith(l).scrollIntoView()), !0;
});
R(my, {
  displayName: "Command<insertImageCommand>",
  group: "Image"
});
var gy = ie("UpdateImage", (t) => (e = {}) => (n, r) => {
  const i = UC(n.selection, eo.type(t));
  if (!i) return !1;
  const { node: o, pos: s } = i, l = { ...o.attrs }, { src: a, alt: c, title: u } = e;
  return a !== void 0 && (l.src = a), c !== void 0 && (l.alt = c), u !== void 0 && (l.title = u), r == null || r(n.tr.setNodeMarkup(s, void 0, l).scrollIntoView()), !0;
});
R(gy, {
  displayName: "Command<updateImageCommand>",
  group: "Image"
});
var hM = Ct((t) => new Rt(/!\[(.*?)]\((.*?)\s*(?="|\))"?([^"]+)?"?\)/, (e, n, r, i) => {
  const [o, s, l = "", a] = n;
  return o ? e.tr.replaceWith(r, i, eo.type(t).create({
    src: l,
    alt: s,
    title: a
  })) : null;
}));
R(hM, {
  displayName: "InputRule<insertImageInputRule>",
  group: "Image"
});
var vl = Qt("hardbreak", (t) => ({
  "data-type": "hardbreak",
  "data-is-inline": t.attrs.isInline
}));
R(vl, {
  displayName: "Attr<hardbreak>",
  group: "Hardbreak"
});
var Hr = De("hardbreak", (t) => ({
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
    t.get(vl.key)(e),
    " "
  ] : ["br", t.get(vl.key)(e)],
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
R(Hr.node, {
  displayName: "NodeSchema<hardbreak>",
  group: "Hardbreak"
});
R(Hr.ctx, {
  displayName: "NodeSchemaCtx<hardbreak>",
  group: "Hardbreak"
});
var Uu = ie("InsertHardbreak", (t) => () => (e, n) => {
  var o;
  const { selection: r, tr: i } = e;
  if (!(r instanceof ee)) return !1;
  if (r.empty) {
    const s = r.$from.node();
    if (s.childCount > 0 && ((o = s.lastChild) == null ? void 0 : o.type.name) === "hardbreak")
      return n == null || n(i.replaceRangeWith(r.to - 1, r.to, e.schema.node("paragraph")).setSelection(se.near(i.doc.resolve(r.to))).scrollIntoView()), !0;
  }
  return n == null || n(i.setMeta("hardbreak", !0).replaceSelectionWith(Hr.type(t).create()).scrollIntoView()), !0;
});
R(Uu, {
  displayName: "Command<insertHardbreakCommand>",
  group: "Hardbreak"
});
var Ju = St("hardbreakKeymap", { InsertHardbreak: {
  shortcuts: "Shift-Enter",
  command: (t) => {
    const e = t.get(we);
    return () => e.call(Uu.key);
  }
} });
R(Ju.ctx, {
  displayName: "KeymapCtx<hardbreak>",
  group: "Hardbreak"
});
R(Ju.shortcuts, {
  displayName: "Keymap<hardbreak>",
  group: "Hardbreak"
});
var Gu = Qt("hr");
R(Gu, {
  displayName: "Attr<hr>",
  group: "Hr"
});
var Ss = De("hr", (t) => ({
  group: "block",
  parseDOM: [{ tag: "hr" }],
  toDOM: (e) => ["hr", t.get(Gu.key)(e)],
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
R(Ss.node, {
  displayName: "NodeSchema<hr>",
  group: "Hr"
});
R(Ss.ctx, {
  displayName: "NodeSchemaCtx<hr>",
  group: "Hr"
});
var yy = Ct((t) => new Rt(/^(?:---|___\s|\*\*\*\s)$/, (e, n, r, i) => {
  const { tr: o } = e;
  return n[0] && o.replaceWith(r - 1, i, Ss.type(t).create()), o;
}));
R(yy, {
  displayName: "InputRule<insertHrInputRule>",
  group: "Hr"
});
var ky = ie("InsertHr", (t) => () => (e, n) => {
  if (!n) return !0;
  const r = cn.node.type(t).create(), { tr: i, selection: o } = e, { from: s } = o, l = Ss.type(t).create();
  if (!l) return !0;
  const a = i.replaceSelectionWith(l).insert(s, r), c = se.findFrom(a.doc.resolve(s), 1, !0);
  return c && n(a.setSelection(c).scrollIntoView()), !0;
});
R(ky, {
  displayName: "Command<insertHrCommand>",
  group: "Hr"
});
var Yu = Qt("bulletList");
R(Yu, {
  displayName: "Attr<bulletList>",
  group: "BulletList"
});
var to = De("bullet_list", (t) => ({
  content: "listItem+",
  group: "block",
  attrs: { spread: {
    default: !1,
    validate: "boolean"
  } },
  parseDOM: [{
    tag: "ul",
    getAttrs: (e) => {
      if (!(e instanceof HTMLElement)) throw un(e);
      return { spread: e.dataset.spread === "true" };
    }
  }],
  toDOM: (e) => [
    "ul",
    {
      ...t.get(Yu.key)(e),
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
R(to.node, {
  displayName: "NodeSchema<bulletList>",
  group: "BulletList"
});
R(to.ctx, {
  displayName: "NodeSchemaCtx<bulletList>",
  group: "BulletList"
});
var by = Ct((t) => du(/^\s*([-+*])\s$/, to.type(t)));
R(by, {
  displayName: "InputRule<wrapInBulletListInputRule>",
  group: "BulletList"
});
var Xu = ie("WrapInBulletList", (t) => () => fu(to.type(t)));
R(Xu, {
  displayName: "Command<wrapInBulletListCommand>",
  group: "BulletList"
});
var Qu = St("bulletListKeymap", { WrapInBulletList: {
  shortcuts: "Mod-Alt-8",
  command: (t) => {
    const e = t.get(we);
    return () => e.call(Xu.key);
  }
} });
R(Qu.ctx, {
  displayName: "KeymapCtx<bulletListKeymap>",
  group: "BulletList"
});
R(Qu.shortcuts, {
  displayName: "Keymap<bulletListKeymap>",
  group: "BulletList"
});
var Zu = Qt("orderedList");
R(Zu, {
  displayName: "Attr<orderedList>",
  group: "OrderedList"
});
var no = De("ordered_list", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw un(e);
      return {
        spread: e.dataset.spread,
        order: e.hasAttribute("start") ? Number(e.getAttribute("start")) : 1
      };
    }
  }],
  toDOM: (e) => [
    "ol",
    {
      ...t.get(Zu.key)(e),
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
R(no.node, {
  displayName: "NodeSchema<orderedList>",
  group: "OrderedList"
});
R(no.ctx, {
  displayName: "NodeSchemaCtx<orderedList>",
  group: "OrderedList"
});
var wy = Ct((t) => du(/^\s*(\d+)\.\s$/, no.type(t), (e) => ({ order: Number(e[1]) }), (e, n) => n.childCount + n.attrs.order === Number(e[1])));
R(wy, {
  displayName: "InputRule<wrapInOrderedListInputRule>",
  group: "OrderedList"
});
var ef = ie("WrapInOrderedList", (t) => () => fu(no.type(t)));
R(ef, {
  displayName: "Command<wrapInOrderedListCommand>",
  group: "OrderedList"
});
var tf = St("orderedListKeymap", { WrapInOrderedList: {
  shortcuts: "Mod-Alt-7",
  command: (t) => {
    const e = t.get(we);
    return () => e.call(ef.key);
  }
} });
R(tf.ctx, {
  displayName: "KeymapCtx<orderedList>",
  group: "OrderedList"
});
R(tf.shortcuts, {
  displayName: "Keymap<orderedList>",
  group: "OrderedList"
});
var nf = Qt("listItem");
R(nf, {
  displayName: "Attr<listItem>",
  group: "ListItem"
});
var Fn = De("list_item", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw un(e);
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
      ...t.get(nf.key)(e),
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
R(Fn.node, {
  displayName: "NodeSchema<listItem>",
  group: "ListItem"
});
R(Fn.ctx, {
  displayName: "NodeSchemaCtx<listItem>",
  group: "ListItem"
});
var rf = ie("SinkListItem", (t) => () => oM(Fn.type(t)));
R(rf, {
  displayName: "Command<sinkListItemCommand>",
  group: "ListItem"
});
var of = ie("LiftListItem", (t) => () => ry(Fn.type(t)));
R(of, {
  displayName: "Command<liftListItemCommand>",
  group: "ListItem"
});
var sf = ie("SplitListItem", (t) => () => nM(Fn.type(t)));
R(sf, {
  displayName: "Command<splitListItemCommand>",
  group: "ListItem"
});
function pM(t) {
  return (e, n, r) => {
    const { selection: i } = e;
    if (!(i instanceof ee)) return !1;
    const { empty: o, $from: s } = i;
    return !o || s.parentOffset !== 0 || s.node(-1).type !== Fn.type(t) ? !1 : Ym(e, n, r);
  };
}
var lf = ie("LiftFirstListItem", (t) => () => pM(t));
R(lf, {
  displayName: "Command<liftFirstListItemCommand>",
  group: "ListItem"
});
var af = St("listItemKeymap", {
  NextListItem: {
    shortcuts: "Enter",
    command: (t) => {
      const e = t.get(we);
      return () => e.call(sf.key);
    }
  },
  SinkListItem: {
    shortcuts: ["Tab", "Mod-]"],
    command: (t) => {
      const e = t.get(we);
      return () => e.call(rf.key);
    }
  },
  LiftListItem: {
    shortcuts: ["Shift-Tab", "Mod-["],
    command: (t) => {
      const e = t.get(we);
      return () => e.call(of.key);
    }
  },
  LiftFirstListItem: {
    shortcuts: ["Backspace", "Delete"],
    command: (t) => {
      const e = t.get(we);
      return () => e.call(lf.key);
    }
  }
});
R(af.ctx, {
  displayName: "KeymapCtx<listItem>",
  group: "ListItem"
});
R(af.shortcuts, {
  displayName: "Keymap<listItem>",
  group: "ListItem"
});
var xy = Su("text", () => ({
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
R(xy, {
  displayName: "NodeSchema<text>",
  group: "Text"
});
var cf = Qt("html");
R(cf, {
  displayName: "Attr<html>",
  group: "Html"
});
var uf = De("html", (t) => ({
  atom: !0,
  group: "inline",
  inline: !0,
  attrs: { value: {
    default: "",
    validate: "string"
  } },
  toDOM: (e) => {
    const n = document.createElement("span"), r = {
      ...t.get(cf.key)(e),
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
R(uf.node, {
  displayName: "NodeSchema<html>",
  group: "Html"
});
R(uf.ctx, {
  displayName: "NodeSchemaCtx<html>",
  group: "Html"
});
var mM = [
  fy,
  Lu,
  cn,
  ql,
  Bu,
  ri,
  vl,
  Hr,
  _u,
  xs,
  ju,
  Cs,
  Gu,
  Ss,
  Ku,
  eo,
  Yu,
  to,
  Zu,
  no,
  nf,
  Fn,
  vu,
  Zi,
  Nu,
  ws,
  Iu,
  ar,
  Ru,
  xi,
  cf,
  uf,
  xy
].flat(), gM = [
  hy,
  by,
  wy,
  py,
  yy,
  dy
].flat(), yM = [], kM = ie("IsMarkSelected", () => (t) => (e) => {
  if (!t) return !1;
  const { doc: n, selection: r } = e;
  return n.rangeHasMark(r.from, r.to, t);
}), bM = ie("IsNoteSelected", () => (t) => (e) => t ? JC(e, t).hasNode : !1), wM = ie("ClearTextInCurrentBlock", () => () => (t, e) => {
  let n = t.tr;
  const { $from: r, $to: i } = n.selection, { pos: o } = r, { pos: s } = i, l = o - r.node().content.size;
  return l < 0 ? !1 : (n = n.deleteRange(l, s), e == null || e(n), !0);
}), xM = ie("SetBlockType", () => (t) => (e, n) => {
  const { nodeType: r, attrs: i = null } = t ?? {};
  if (!r) return !1;
  const o = e.tr, { from: s, to: l } = o.selection;
  try {
    o.setBlockType(s, l, r, i);
  } catch {
    return !1;
  }
  return n == null || n(o), !0;
}), CM = ie("WrapInBlockType", () => (t) => (e, n) => {
  const { nodeType: r, attrs: i = null } = t ?? {};
  if (!r) return !1;
  let o = e.tr;
  try {
    const { $from: s, $to: l } = o.selection, a = s.blockRange(l), c = a && su(a, r, i);
    if (!c) return !1;
    o = o.wrap(a, c);
  } catch {
    return !1;
  }
  return n == null || n(o), !0;
}), SM = ie("AddBlockType", () => (t) => (e, n) => {
  const { nodeType: r, attrs: i = null } = t ?? {};
  if (!r) return !1;
  const o = e.tr;
  try {
    const s = r instanceof Rn ? r : r.createAndFill(i);
    if (!s) return !1;
    o.replaceSelectionWith(s);
  } catch {
    return !1;
  }
  return n == null || n(o), !0;
}), vM = ie("SelectTextNearPos", () => (t) => (e, n) => {
  const { pos: r } = t ?? {};
  if (r == null) return !1;
  const i = (s, l, a) => Math.min(Math.max(s, l), a), o = e.tr;
  try {
    const s = e.doc.resolve(i(r, 0, e.doc.content.size));
    o.setSelection(ee.near(s));
  } catch {
    return !1;
  }
  return n == null || n(o.scrollIntoView()), !0;
}), MM = [
  Pu,
  Vu,
  Qn,
  Fu,
  Wu,
  Uu,
  ky,
  my,
  gy,
  ef,
  Xu,
  rf,
  sf,
  of,
  lf,
  Mu,
  Ou,
  Eu,
  cy,
  uy,
  kM,
  bM,
  wM,
  xM,
  CM,
  SM,
  vM
], TM = [
  Hu,
  qu,
  Ju,
  $u,
  af,
  tf,
  Qu,
  zu,
  Tu,
  Du,
  Au
].flat(), ff = hn("remarkAddOrderInList", () => () => (t) => {
  Yi(t, "list", (e) => {
    if (e.ordered) {
      const n = e.start ?? 1;
      e.children.forEach((r, i) => {
        r.label = i + n;
      });
    }
  });
});
R(ff.plugin, {
  displayName: "Remark<remarkAddOrderInListPlugin>",
  group: "Remark"
});
R(ff.options, {
  displayName: "RemarkConfig<remarkAddOrderInListPlugin>",
  group: "Remark"
});
var df = hn("remarkLineBreak", () => () => (t) => {
  const e = /[\t ]*(?:\r?\n|\r)/g;
  Yi(t, "text", (n, r, i) => {
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
R(df.plugin, {
  displayName: "Remark<remarkLineBreak>",
  group: "Remark"
});
R(df.options, {
  displayName: "RemarkConfig<remarkLineBreak>",
  group: "Remark"
});
var hf = hn("remarkInlineLink", () => lM);
R(hf.plugin, {
  displayName: "Remark<remarkInlineLinkPlugin>",
  group: "Remark"
});
R(hf.options, {
  displayName: "RemarkConfig<remarkInlineLinkPlugin>",
  group: "Remark"
});
var NM = (t) => !!t.children, EM = (t) => t.type === "html";
function AM(t, e) {
  return n(t, 0, null)[0];
  function n(r, i, o) {
    if (NM(r)) {
      const s = [];
      for (let l = 0, a = r.children.length; l < a; l++) {
        const c = r.children[l];
        if (c) {
          const u = n(c, l, r);
          if (u) for (let f = 0, d = u.length; f < d; f++) {
            const h = u[f];
            h && s.push(h);
          }
        }
      }
      r.children = s;
    }
    return e(r, i, o);
  }
}
var IM = [
  "root",
  "blockquote",
  "listItem"
], pf = hn("remarkHTMLTransformer", () => () => (t) => {
  AM(t, (e, n, r) => EM(e) ? (r && IM.includes(r.type) && (e.children = [{ ...e }], delete e.value, e.type = "paragraph"), [e]) : [e]);
});
R(pf.plugin, {
  displayName: "Remark<remarkHtmlTransformer>",
  group: "Remark"
});
R(pf.options, {
  displayName: "RemarkConfig<remarkHtmlTransformer>",
  group: "Remark"
});
var mf = hn("remarkMarker", () => () => (t, e) => {
  const n = (r) => e.value.charAt(r.position.start.offset);
  Yi(t, (r) => ["strong", "emphasis"].includes(r.type), (r) => {
    r.marker = n(r);
  });
});
R(mf.plugin, {
  displayName: "Remark<remarkMarker>",
  group: "Remark"
});
R(mf.options, {
  displayName: "RemarkConfig<remarkMarker>",
  group: "Remark"
});
var Cy = dn(() => {
  let t = !1;
  const e = new Ie({
    key: new st("MILKDOWN_INLINE_NODES_CURSOR"),
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
          const r = n.selection.$from.pos, i = document.createElement("span"), o = Le.widget(r, i, { side: -1 }), s = document.createElement("span"), l = Le.widget(r, s);
          return setTimeout(() => {
            i.contentEditable = "true", s.contentEditable = "true";
          }), Te.create(n.doc, [o, l]);
        }
        return Te.empty;
      }
    }
  });
  return e;
});
R(Cy, {
  displayName: "Prose<inlineNodesCursorPlugin>",
  group: "Prose"
});
var Sy = dn((t) => new Ie({
  key: new st("MILKDOWN_HARDBREAK_MARKS"),
  appendTransaction: (e, n, r) => {
    if (!e.length) return;
    const [i] = e;
    if (!i) return;
    const [o] = i.steps;
    if (i.getMeta("hardbreak")) {
      if (!(o instanceof Fe)) return;
      const { from: s } = o;
      return r.tr.setNodeMarkup(s, Hr.type(t), void 0, []);
    }
    if (o instanceof In) {
      let s = r.tr;
      const { from: l, to: a } = o;
      return r.doc.nodesBetween(l, a, (c, u) => {
        c.type === Hr.type(t) && (s = s.setNodeMarkup(u, Hr.type(t), void 0, []));
      }), s;
    }
  }
}));
R(Sy, {
  displayName: "Prose<hardbreakClearMarkPlugin>",
  group: "Prose"
});
var gf = Bn(["table", "code_block"], "hardbreakFilterNodes");
R(gf, {
  displayName: "Ctx<hardbreakFilterNodes>",
  group: "Prose"
});
var vy = dn((t) => {
  const e = t.get(gf.key);
  return new Ie({
    key: new st("MILKDOWN_HARDBREAK_FILTER"),
    filterTransaction: (n, r) => {
      const i = n.getMeta("hardbreak"), [o] = n.steps;
      if (i && o) {
        const { from: s } = o, l = r.doc.resolve(s);
        let a = l.depth, c = !0;
        for (; a > 0; )
          e.includes(l.node(a).type.name) && (c = !1), a--;
        return c;
      }
      return !0;
    }
  });
});
R(vy, {
  displayName: "Prose<hardbreakFilterPlugin>",
  group: "Prose"
});
var My = dn((t) => {
  const e = new st("MILKDOWN_HEADING_ID"), n = (r) => {
    if (r.composing) return;
    const i = t.get(ql.key), o = r.state.tr.setMeta("addToHistory", !1);
    let s = !1;
    const l = {};
    r.state.doc.descendants((a, c) => {
      if (a.type === ri.type(t)) {
        if (a.textContent.trim().length === 0) return;
        const u = a.attrs;
        let f = i(a);
        l[f] ? (l[f] += 1, f += `-#${l[f]}`) : l[f] = 1, u.id !== f && (s = !0, o.setMeta(e, !0).setNodeMarkup(c, void 0, {
          ...u,
          id: f
        }));
      }
    }), s && r.dispatch(o);
  };
  return new Ie({
    key: e,
    view: (r) => (n(r), { update: (i, o) => {
      i.state.doc.eq(o.doc) || n(i);
    } })
  });
});
R(My, {
  displayName: "Prose<syncHeadingIdPlugin>",
  group: "Prose"
});
var Ty = dn((t) => {
  const e = (n, r, i) => {
    if (!i.selection || n.some((f) => f.getMeta("addToHistory") === !1 || !f.isGeneric)) return null;
    const o = no.type(t), s = to.type(t), l = Fn.type(t), a = (f, d, h = 1) => {
      let m = !1;
      const b = `${d + h}.`;
      return f.label !== b && (f.label = b, m = !0), m;
    };
    let c = i.tr, u = !1;
    return i.doc.descendants((f, d, h, m) => {
      if (f.type === s) {
        const b = f.maybeChild(0);
        (b == null ? void 0 : b.type) === l && b.attrs.listType === "ordered" && (u = !0, c.setNodeMarkup(d, o, { spread: "true" }), f.descendants((C, x, L, I) => {
          if (C.type === l) {
            const D = { ...C.attrs };
            a(D, I) && (c = c.setNodeMarkup(x, void 0, D));
          }
          return !1;
        }));
      } else if (f.type === l && (h == null ? void 0 : h.type) === o) {
        const b = { ...f.attrs };
        let C = !1;
        b.listType !== "ordered" && (b.listType = "ordered", C = !0), h != null && h.maybeChild(0) && (C = a(b, m, (h == null ? void 0 : h.attrs.order) ?? 1)), C && (c = c.setNodeMarkup(d, void 0, b), u = !0);
      }
    }), u ? c.setMeta("addToHistory", !1) : null;
  };
  return new Ie({
    key: new st("MILKDOWN_KEEP_LIST_ORDER"),
    appendTransaction: e
  });
});
R(Ty, {
  displayName: "Prose<syncListOrderPlugin>",
  group: "Prose"
});
var OM = [
  Sy,
  gf,
  vy,
  Cy,
  ff,
  hf,
  df,
  pf,
  mf,
  Wl,
  My,
  Ty
].flat(), DM = [
  mM,
  gM,
  yM,
  MM,
  TM,
  OM
].flat();
let Pc, zc;
if (typeof WeakMap < "u") {
  let t = /* @__PURE__ */ new WeakMap();
  Pc = (e) => t.get(e), zc = (e, n) => (t.set(e, n), n);
} else {
  const t = [];
  let n = 0;
  Pc = (r) => {
    for (let i = 0; i < t.length; i += 2) if (t[i] == r) return t[i + 1];
  }, zc = (r, i) => (n == 10 && (n = 0), t[n++] = r, t[n++] = i);
}
var xe = class {
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
    const { left: n, right: r, top: i, bottom: o } = this.findCell(t), { left: s, right: l, top: a, bottom: c } = this.findCell(e);
    return {
      left: Math.min(n, s),
      top: Math.min(i, a),
      right: Math.max(r, l),
      bottom: Math.max(o, c)
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
    return Pc(t) || zc(t, RM(t));
  }
};
function RM(t) {
  if (t.type.spec.tableRole != "table") throw new RangeError("Not a table node: " + t.type.name);
  const e = LM(t), n = t.childCount, r = [];
  let i = 0, o = null;
  const s = [];
  for (let c = 0, u = e * n; c < u; c++) r[c] = 0;
  for (let c = 0, u = 0; c < n; c++) {
    const f = t.child(c);
    u++;
    for (let m = 0; ; m++) {
      for (; i < r.length && r[i] != 0; ) i++;
      if (m == f.childCount) break;
      const b = f.child(m), { colspan: C, rowspan: x, colwidth: L } = b.attrs;
      for (let I = 0; I < x; I++) {
        if (I + c >= n) {
          (o || (o = [])).push({
            type: "overlong_rowspan",
            pos: u,
            n: x - I
          });
          break;
        }
        const D = i + I * e;
        for (let j = 0; j < C; j++) {
          r[D + j] == 0 ? r[D + j] = u : (o || (o = [])).push({
            type: "collision",
            row: c,
            pos: u,
            n: C - j
          });
          const A = L && L[j];
          if (A) {
            const _ = (D + j) % e * 2, J = s[_];
            J == null || J != A && s[_ + 1] == 1 ? (s[_] = A, s[_ + 1] = 1) : J == A && s[_ + 1]++;
          }
        }
      }
      i += C, u += b.nodeSize;
    }
    const d = (c + 1) * e;
    let h = 0;
    for (; i < d; ) r[i++] == 0 && h++;
    h && (o || (o = [])).push({
      type: "missing",
      row: c,
      n: h
    }), u++;
  }
  (e === 0 || n === 0) && (o || (o = [])).push({ type: "zero_sized" });
  const l = new xe(e, n, r, o);
  let a = !1;
  for (let c = 0; !a && c < s.length; c += 2) s[c] != null && s[c + 1] < n && (a = !0);
  return a && PM(l, s, t), l;
}
function LM(t) {
  let e = -1, n = !1;
  for (let r = 0; r < t.childCount; r++) {
    const i = t.child(r);
    let o = 0;
    if (n) for (let s = 0; s < r; s++) {
      const l = t.child(s);
      for (let a = 0; a < l.childCount; a++) {
        const c = l.child(a);
        s + c.attrs.rowspan > r && (o += c.attrs.colspan);
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
function PM(t, e, n) {
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
    for (let c = 0; c < a.colspan; c++) {
      const u = e[(i + c) % t.width * 2];
      u != null && (!a.colwidth || a.colwidth[c] != u) && ((l || (l = zM(a)))[c] = u);
    }
    l && t.problems.unshift({
      type: "colwidth mismatch",
      pos: o,
      colwidth: l
    });
  }
}
function zM(t) {
  if (t.colwidth) return t.colwidth.slice();
  const e = [];
  for (let n = 0; n < t.colspan; n++) e.push(0);
  return e;
}
function Hh(t, e) {
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
function jh(t, e) {
  const n = {};
  t.attrs.colspan != 1 && (n.colspan = t.attrs.colspan), t.attrs.rowspan != 1 && (n.rowspan = t.attrs.rowspan), t.attrs.colwidth && (n["data-colwidth"] = t.attrs.colwidth.join(","));
  for (const r in e) {
    const i = e[r].setDOMAttr;
    i && i(t.attrs[r], n);
  }
  return n;
}
function BM(t) {
  if (t !== null) {
    if (!Array.isArray(t)) throw new TypeError("colwidth must be null or an array");
    for (const e of t) if (typeof e != "number") throw new TypeError("colwidth must be null or an array of numbers");
  }
}
function FM(t) {
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
      validate: BM
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
        getAttrs: (r) => Hh(r, e)
      }],
      toDOM(r) {
        return [
          "td",
          jh(r, e),
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
        getAttrs: (r) => Hh(r, e)
      }],
      toDOM(r) {
        return [
          "th",
          jh(r, e),
          0
        ];
      }
    }
  };
}
function pt(t) {
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
const tr = new st("selectingCells");
function Ui(t) {
  for (let e = t.depth - 1; e > 0; e--) if (t.node(e).type.spec.tableRole == "row") return t.node(0).resolve(t.before(e + 1));
  return null;
}
function We(t) {
  const e = t.selection.$head;
  for (let n = e.depth; n > 0; n--) if (e.node(n).type.spec.tableRole == "row") return !0;
  return !1;
}
function Kl(t) {
  const e = t.selection;
  if ("$anchorCell" in e && e.$anchorCell) return e.$anchorCell.pos > e.$headCell.pos ? e.$anchorCell : e.$headCell;
  if ("node" in e && e.node && e.node.type.spec.tableRole == "cell") return e.$anchor;
  const n = Ui(e.$head) || $M(e.$head);
  if (n) return n;
  throw new RangeError(`No cell found around position ${e.head}`);
}
function $M(t) {
  for (let e = t.nodeAfter, n = t.pos; e; e = e.firstChild, n++) {
    const r = e.type.spec.tableRole;
    if (r == "cell" || r == "header_cell") return t.doc.resolve(n);
  }
  for (let e = t.nodeBefore, n = t.pos; e; e = e.lastChild, n--) {
    const r = e.type.spec.tableRole;
    if (r == "cell" || r == "header_cell") return t.doc.resolve(n - e.nodeSize);
  }
}
function Bc(t) {
  return t.parent.type.spec.tableRole == "row" && !!t.nodeAfter;
}
function _M(t) {
  return t.node(0).resolve(t.pos + t.nodeAfter.nodeSize);
}
function yf(t, e) {
  return t.depth == e.depth && t.pos >= e.start(-1) && t.pos <= e.end(-1);
}
function Ny(t, e, n) {
  const r = t.node(-1), i = xe.get(r), o = t.start(-1), s = i.nextCell(t.pos - o, e, n);
  return s == null ? null : t.node(0).resolve(o + s);
}
function Zr(t, e, n = 1) {
  const r = {
    ...t,
    colspan: t.colspan - n
  };
  return r.colwidth && (r.colwidth = r.colwidth.slice(), r.colwidth.splice(e, n), r.colwidth.some((i) => i > 0) || (r.colwidth = null)), r;
}
function VM(t, e, n = 1) {
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
function HM(t, e, n) {
  const r = pt(e.type.schema).header_cell;
  for (let i = 0; i < t.height; i++) if (e.nodeAt(t.map[n + i * t.width]).type != r) return !1;
  return !0;
}
var Ae = class xn extends se {
  constructor(e, n = e) {
    const r = e.node(-1), i = xe.get(r), o = e.start(-1), s = i.rectBetween(e.pos - o, n.pos - o), l = e.node(0), a = i.cellsInRect(s).filter((u) => u != n.pos - o);
    a.unshift(n.pos - o);
    const c = a.map((u) => {
      const f = r.nodeAt(u);
      if (!f) throw new RangeError(`No cell with offset ${u} found`);
      const d = o + u + 1;
      return new Km(l.resolve(d), l.resolve(d + f.content.size));
    });
    super(c[0].$from, c[0].$to, c), this.$anchorCell = e, this.$headCell = n;
  }
  map(e, n) {
    const r = e.resolve(n.map(this.$anchorCell.pos)), i = e.resolve(n.map(this.$headCell.pos));
    if (Bc(r) && Bc(i) && yf(r, i)) {
      const o = this.$anchorCell.node(-1) != r.node(-1);
      return o && this.isRowSelection() ? xn.rowSelection(r, i) : o && this.isColSelection() ? xn.colSelection(r, i) : new xn(r, i);
    }
    return ee.between(r, i);
  }
  content() {
    const e = this.$anchorCell.node(-1), n = xe.get(e), r = this.$anchorCell.start(-1), i = n.rectBetween(this.$anchorCell.pos - r, this.$headCell.pos - r), o = {}, s = [];
    for (let a = i.top; a < i.bottom; a++) {
      const c = [];
      for (let u = a * n.width + i.left, f = i.left; f < i.right; f++, u++) {
        const d = n.map[u];
        if (o[d]) continue;
        o[d] = !0;
        const h = n.findCell(d);
        let m = e.nodeAt(d);
        if (!m) throw new RangeError(`No cell with offset ${d} found`);
        const b = i.left - h.left, C = h.right - i.right;
        if (b > 0 || C > 0) {
          let x = m.attrs;
          if (b > 0 && (x = Zr(x, 0, b)), C > 0 && (x = Zr(x, x.colspan - C, C)), h.left < i.left) {
            if (m = m.type.createAndFill(x), !m) throw new RangeError(`Could not create cell with attrs ${JSON.stringify(x)}`);
          } else m = m.type.create(x, m.content);
        }
        if (h.top < i.top || h.bottom > i.bottom) {
          const x = {
            ...m.attrs,
            rowspan: Math.min(h.bottom, i.bottom) - Math.max(h.top, i.top)
          };
          h.top < i.top ? m = m.type.createAndFill(x) : m = m.type.create(x, m.content);
        }
        c.push(m);
      }
      s.push(e.child(a).copy(z.from(c)));
    }
    const l = this.isColSelection() && this.isRowSelection() ? e : s;
    return new H(z.from(l), 1, 1);
  }
  replace(e, n = H.empty) {
    const r = e.steps.length, i = this.ranges;
    for (let s = 0; s < i.length; s++) {
      const { $from: l, $to: a } = i[s], c = e.mapping.slice(r);
      e.replace(c.map(l.pos), c.map(a.pos), s ? H.empty : n);
    }
    const o = se.findFrom(e.doc.resolve(e.mapping.slice(r).map(this.to)), -1);
    o && e.setSelection(o);
  }
  replaceWith(e, n) {
    this.replace(e, new H(z.from(n), 0, 0));
  }
  forEachCell(e) {
    const n = this.$anchorCell.node(-1), r = xe.get(n), i = this.$anchorCell.start(-1), o = r.cellsInRect(r.rectBetween(this.$anchorCell.pos - i, this.$headCell.pos - i));
    for (let s = 0; s < o.length; s++) e(n.nodeAt(o[s]), i + o[s]);
  }
  isColSelection() {
    const e = this.$anchorCell.index(-1), n = this.$headCell.index(-1);
    if (Math.min(e, n) > 0) return !1;
    const r = e + this.$anchorCell.nodeAfter.attrs.rowspan, i = n + this.$headCell.nodeAfter.attrs.rowspan;
    return Math.max(r, i) == this.$headCell.node(-1).childCount;
  }
  static colSelection(e, n = e) {
    const r = e.node(-1), i = xe.get(r), o = e.start(-1), s = i.findCell(e.pos - o), l = i.findCell(n.pos - o), a = e.node(0);
    return s.top <= l.top ? (s.top > 0 && (e = a.resolve(o + i.map[s.left])), l.bottom < i.height && (n = a.resolve(o + i.map[i.width * (i.height - 1) + l.right - 1]))) : (l.top > 0 && (n = a.resolve(o + i.map[l.left])), s.bottom < i.height && (e = a.resolve(o + i.map[i.width * (i.height - 1) + s.right - 1]))), new xn(e, n);
  }
  isRowSelection() {
    const e = this.$anchorCell.node(-1), n = xe.get(e), r = this.$anchorCell.start(-1), i = n.colCount(this.$anchorCell.pos - r), o = n.colCount(this.$headCell.pos - r);
    if (Math.min(i, o) > 0) return !1;
    const s = i + this.$anchorCell.nodeAfter.attrs.colspan, l = o + this.$headCell.nodeAfter.attrs.colspan;
    return Math.max(s, l) == n.width;
  }
  eq(e) {
    return e instanceof xn && e.$anchorCell.pos == this.$anchorCell.pos && e.$headCell.pos == this.$headCell.pos;
  }
  static rowSelection(e, n = e) {
    const r = e.node(-1), i = xe.get(r), o = e.start(-1), s = i.findCell(e.pos - o), l = i.findCell(n.pos - o), a = e.node(0);
    return s.left <= l.left ? (s.left > 0 && (e = a.resolve(o + i.map[s.top * i.width])), l.right < i.width && (n = a.resolve(o + i.map[i.width * (l.top + 1) - 1]))) : (l.left > 0 && (n = a.resolve(o + i.map[l.top * i.width])), s.right < i.width && (e = a.resolve(o + i.map[i.width * (s.top + 1) - 1]))), new xn(e, n);
  }
  toJSON() {
    return {
      type: "cell",
      anchor: this.$anchorCell.pos,
      head: this.$headCell.pos
    };
  }
  static fromJSON(e, n) {
    return new xn(e.resolve(n.anchor), e.resolve(n.head));
  }
  static create(e, n, r = n) {
    return new xn(e.resolve(n), e.resolve(r));
  }
  getBookmark() {
    return new jM(this.$anchorCell.pos, this.$headCell.pos);
  }
};
Ae.prototype.visible = !1;
se.jsonID("cell", Ae);
var jM = class Ey {
  constructor(e, n) {
    this.anchor = e, this.head = n;
  }
  map(e) {
    return new Ey(e.map(this.anchor), e.map(this.head));
  }
  resolve(e) {
    const n = e.resolve(this.anchor), r = e.resolve(this.head);
    return n.parent.type.spec.tableRole == "row" && r.parent.type.spec.tableRole == "row" && n.index() < n.parent.childCount && r.index() < r.parent.childCount && yf(n, r) ? new Ae(n, r) : se.near(r, 1);
  }
};
function WM(t) {
  if (!(t.selection instanceof Ae)) return null;
  const e = [];
  return t.selection.forEachCell((n, r) => {
    e.push(Le.node(r, r + n.nodeSize, { class: "selectedCell" }));
  }), Te.create(t.doc, e);
}
function qM({ $from: t, $to: e }) {
  if (t.pos == e.pos || t.pos < e.pos - 6) return !1;
  let n = t.pos, r = e.pos, i = t.depth;
  for (; i >= 0 && !(t.after(i + 1) < t.end(i)); i--, n++) ;
  for (let o = e.depth; o >= 0 && !(e.before(o + 1) > e.start(o)); o--, r--) ;
  return n == r && /row|table/.test(t.node(i).type.spec.tableRole);
}
function KM({ $from: t, $to: e }) {
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
function UM(t, e, n) {
  const r = (e || t).selection, i = (e || t).doc;
  let o, s;
  if (r instanceof re && (s = r.node.type.spec.tableRole)) {
    if (s == "cell" || s == "header_cell") o = Ae.create(i, r.from);
    else if (s == "row") {
      const l = i.resolve(r.from + 1);
      o = Ae.rowSelection(l, l);
    } else if (!n) {
      const l = xe.get(r.node), a = r.from + 1, c = a + l.map[l.width * l.height - 1];
      o = Ae.create(i, a + 1, c);
    }
  } else r instanceof ee && qM(r) ? o = ee.create(i, r.from) : r instanceof ee && KM(r) && (o = ee.create(i, r.$from.start(), r.$from.end()));
  return o && (e || (e = t.tr)).setSelection(o), e;
}
const JM = new st("fix-tables");
function Ay(t, e, n, r) {
  const i = t.childCount, o = e.childCount;
  e: for (let s = 0, l = 0; s < o; s++) {
    const a = e.child(s);
    for (let c = l, u = Math.min(i, s + 3); c < u; c++) if (t.child(c) == a) {
      l = c + 1, n += a.nodeSize;
      continue e;
    }
    r(a, n), l < i && t.child(l).sameMarkup(a) ? Ay(t.child(l), a, n + 1, r) : a.nodesBetween(0, a.content.size, r, n + 1), n += a.nodeSize;
  }
}
function GM(t, e) {
  let n;
  const r = (i, o) => {
    i.type.spec.tableRole == "table" && (n = YM(t, i, o, n));
  };
  return e ? e.doc != t.doc && Ay(e.doc, t.doc, 0, r) : t.doc.descendants(r), n;
}
function YM(t, e, n, r) {
  const i = xe.get(e);
  if (!i.problems) return r;
  r || (r = t.tr);
  const o = [];
  for (let a = 0; a < i.height; a++) o.push(0);
  for (let a = 0; a < i.problems.length; a++) {
    const c = i.problems[a];
    if (c.type == "collision") {
      const u = e.nodeAt(c.pos);
      if (!u) continue;
      const f = u.attrs;
      for (let d = 0; d < f.rowspan; d++) o[c.row + d] += c.n;
      r.setNodeMarkup(r.mapping.map(n + 1 + c.pos), null, Zr(f, f.colspan - c.n, c.n));
    } else if (c.type == "missing") o[c.row] += c.n;
    else if (c.type == "overlong_rowspan") {
      const u = e.nodeAt(c.pos);
      if (!u) continue;
      r.setNodeMarkup(r.mapping.map(n + 1 + c.pos), null, {
        ...u.attrs,
        rowspan: u.attrs.rowspan - c.n
      });
    } else if (c.type == "colwidth mismatch") {
      const u = e.nodeAt(c.pos);
      if (!u) continue;
      r.setNodeMarkup(r.mapping.map(n + 1 + c.pos), null, {
        ...u.attrs,
        colwidth: c.colwidth
      });
    } else if (c.type == "zero_sized") {
      const u = r.mapping.map(n);
      r.delete(u, u + e.nodeSize);
    }
  }
  let s, l;
  for (let a = 0; a < o.length; a++) o[a] && (s == null && (s = a), l = a);
  for (let a = 0, c = n + 1; a < i.height; a++) {
    const u = e.child(a), f = c + u.nodeSize, d = o[a];
    if (d > 0) {
      let h = "cell";
      u.firstChild && (h = u.firstChild.type.spec.tableRole);
      const m = [];
      for (let C = 0; C < d; C++) {
        const x = pt(t.schema)[h].createAndFill();
        x && m.push(x);
      }
      const b = (a == 0 || s == a - 1) && l == a ? c + 1 : f - 1;
      r.insert(r.mapping.map(b), m);
    }
    c = f;
  }
  return r.setMeta(JM, { fixTables: !0 });
}
function Iy(t) {
  const e = xe.get(t), n = [], r = e.height, i = e.width;
  for (let o = 0; o < r; o++) {
    const s = [];
    for (let l = 0; l < i; l++) {
      const a = o * i + l, c = e.map[a];
      if (o > 0) {
        const u = a - i;
        if (c === e.map[u]) {
          s.push(null);
          continue;
        }
      }
      if (l > 0) {
        const u = a - 1;
        if (c === e.map[u]) {
          s.push(null);
          continue;
        }
      }
      s.push(t.nodeAt(c));
    }
    n.push(s);
  }
  return n;
}
function Oy(t, e) {
  const n = [], r = xe.get(t), i = r.height, o = r.width;
  for (let s = 0; s < i; s++) {
    const l = t.child(s), a = [];
    for (let u = 0; u < o; u++) {
      const f = e[s][u];
      if (!f) continue;
      const d = r.map[s * r.width + u], h = t.nodeAt(d);
      if (!h) continue;
      const m = h.type.createChecked(f.attrs, f.content, f.marks);
      a.push(m);
    }
    const c = l.type.createChecked(l.attrs, a, l.marks);
    n.push(c);
  }
  return t.type.createChecked(t.attrs, n, t.marks);
}
function Dy(t, e, n, r) {
  const i = e[0] > n[0] ? -1 : 1, o = t.splice(e[0], e.length), s = o.length % 2 === 0 ? 1 : 0;
  let l;
  return l = i === -1 ? n[0] : n[n.length - 1] - s, t.splice(l, 0, ...o), t;
}
function vs(t) {
  return XM((e) => e.type.spec.tableRole === "table", t);
}
function XM(t, e) {
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
function hi(t, e) {
  const n = vs(e.$from);
  if (!n) return;
  const r = xe.get(n.node);
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
function pi(t, e) {
  const n = vs(e.$from);
  if (!n) return;
  const r = xe.get(n.node);
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
function Wh(t, e, n = e) {
  let r = e, i = n;
  for (let u = e; u >= 0; u--) {
    const f = hi(u, t.selection);
    f && f.forEach((d) => {
      const h = d.node.attrs.colspan + u - 1;
      h >= r && (r = u), h > i && (i = h);
    });
  }
  for (let u = e; u <= i; u++) {
    const f = hi(u, t.selection);
    f && f.forEach((d) => {
      const h = d.node.attrs.colspan + u - 1;
      d.node.attrs.colspan > 1 && h > i && (i = h);
    });
  }
  const o = [];
  for (let u = r; u <= i; u++) {
    const f = hi(u, t.selection);
    f && f.length > 0 && o.push(u);
  }
  r = o[0], i = o[o.length - 1];
  const s = hi(r, t.selection), l = pi(0, t.selection);
  if (!s || !l) return;
  const a = t.doc.resolve(s[s.length - 1].pos);
  let c;
  for (let u = i; u >= r; u--) {
    const f = hi(u, t.selection);
    if (f && f.length > 0) {
      for (let d = l.length - 1; d >= 0; d--) if (l[d].pos === f[0].pos) {
        c = f[0];
        break;
      }
      if (c) break;
    }
  }
  if (c)
    return {
      $anchor: a,
      $head: t.doc.resolve(c.pos),
      indexes: o
    };
}
function qh(t, e, n = e) {
  let r = e, i = n;
  for (let u = e; u >= 0; u--) {
    const f = pi(u, t.selection);
    f && f.forEach((d) => {
      const h = d.node.attrs.rowspan + u - 1;
      h >= r && (r = u), h > i && (i = h);
    });
  }
  for (let u = e; u <= i; u++) {
    const f = pi(u, t.selection);
    f && f.forEach((d) => {
      const h = d.node.attrs.rowspan + u - 1;
      d.node.attrs.rowspan > 1 && h > i && (i = h);
    });
  }
  const o = [];
  for (let u = r; u <= i; u++) {
    const f = pi(u, t.selection);
    f && f.length > 0 && o.push(u);
  }
  r = o[0], i = o[o.length - 1];
  const s = pi(r, t.selection), l = hi(0, t.selection);
  if (!s || !l) return;
  const a = t.doc.resolve(s[s.length - 1].pos);
  let c;
  for (let u = i; u >= r; u--) {
    const f = pi(u, t.selection);
    if (f && f.length > 0) {
      for (let d = l.length - 1; d >= 0; d--) if (l[d].pos === f[0].pos) {
        c = f[0];
        break;
      }
      if (c) break;
    }
  }
  if (c)
    return {
      $anchor: a,
      $head: t.doc.resolve(c.pos),
      indexes: o
    };
}
function Kh(t) {
  return t[0].map((e, n) => t.map((r) => r[n]));
}
function QM(t) {
  var e, n;
  const { tr: r, originIndex: i, targetIndex: o, select: s, pos: l } = t, a = vs(r.doc.resolve(l));
  if (!a) return !1;
  const c = (e = Wh(r, i)) === null || e === void 0 ? void 0 : e.indexes, u = (n = Wh(r, o)) === null || n === void 0 ? void 0 : n.indexes;
  if (!c || !u || c.includes(o)) return !1;
  const f = ZM(a.node, c, u);
  if (r.replaceWith(a.pos, a.pos + a.node.nodeSize, f), !s) return !0;
  const d = xe.get(f), h = a.start, m = o, b = d.positionAt(d.height - 1, m, f), C = r.doc.resolve(h + b), x = d.positionAt(0, m, f), L = r.doc.resolve(h + x);
  return r.setSelection(Ae.colSelection(C, L)), !0;
}
function ZM(t, e, n, r) {
  let i = Kh(Iy(t));
  return i = Dy(i, e, n), i = Kh(i), Oy(t, i);
}
function eT(t) {
  var e, n;
  const { tr: r, originIndex: i, targetIndex: o, select: s, pos: l } = t, a = vs(r.doc.resolve(l));
  if (!a) return !1;
  const c = (e = qh(r, i)) === null || e === void 0 ? void 0 : e.indexes, u = (n = qh(r, o)) === null || n === void 0 ? void 0 : n.indexes;
  if (!c || !u || c.includes(o)) return !1;
  const f = tT(a.node, c, u);
  if (r.replaceWith(a.pos, a.pos + a.node.nodeSize, f), !s) return !0;
  const d = xe.get(f), h = a.start, m = o, b = d.positionAt(m, d.width - 1, f), C = r.doc.resolve(h + b), x = d.positionAt(m, 0, f), L = r.doc.resolve(h + x);
  return r.setSelection(Ae.rowSelection(C, L)), !0;
}
function tT(t, e, n, r) {
  let i = Iy(t);
  return i = Dy(i, e, n), Oy(t, i);
}
function pn(t) {
  const e = t.selection, n = Kl(t), r = n.node(-1), i = n.start(-1), o = xe.get(r);
  return {
    ...e instanceof Ae ? o.rectBetween(e.$anchorCell.pos - i, e.$headCell.pos - i) : o.findCell(n.pos - i),
    tableStart: i,
    map: o,
    table: r
  };
}
function Ry(t, { map: e, tableStart: n, table: r }, i) {
  let o = i > 0 ? -1 : 0;
  HM(e, r, i + o) && (o = i == 0 || i == e.width ? null : 0);
  for (let s = 0; s < e.height; s++) {
    const l = s * e.width + i;
    if (i > 0 && i < e.width && e.map[l - 1] == e.map[l]) {
      const a = e.map[l], c = r.nodeAt(a);
      t.setNodeMarkup(t.mapping.map(n + a), null, VM(c.attrs, i - e.colCount(a))), s += c.attrs.rowspan - 1;
    } else {
      const a = o == null ? pt(r.type.schema).cell : r.nodeAt(e.map[l + o]).type, c = e.positionAt(s, i, r);
      t.insert(t.mapping.map(n + c), a.createAndFill());
    }
  }
  return t;
}
function Ly(t, e) {
  if (!We(t)) return !1;
  if (e) {
    const n = pn(t);
    e(Ry(t.tr, n, n.left));
  }
  return !0;
}
function Py(t, e) {
  if (!We(t)) return !1;
  if (e) {
    const n = pn(t);
    e(Ry(t.tr, n, n.right));
  }
  return !0;
}
function nT(t, { map: e, table: n, tableStart: r }, i) {
  const o = t.mapping.maps.length;
  for (let s = 0; s < e.height; ) {
    const l = s * e.width + i, a = e.map[l], c = n.nodeAt(a), u = c.attrs;
    if (i > 0 && e.map[l - 1] == a || i < e.width - 1 && e.map[l + 1] == a) t.setNodeMarkup(t.mapping.slice(o).map(r + a), null, Zr(u, i - e.colCount(a)));
    else {
      const f = t.mapping.slice(o).map(r + a);
      t.delete(f, f + c.nodeSize);
    }
    s += u.rowspan;
  }
}
function zy(t, e) {
  if (!We(t)) return !1;
  if (e) {
    const n = pn(t), r = t.tr;
    if (n.left == 0 && n.right == n.map.width) return !1;
    for (let i = n.right - 1; nT(r, n, i), i != n.left; i--) {
      const o = n.tableStart ? r.doc.nodeAt(n.tableStart - 1) : r.doc;
      if (!o) throw new RangeError("No table found");
      n.table = o, n.map = xe.get(o);
    }
    e(r);
  }
  return !0;
}
function rT(t, e, n) {
  var r;
  const i = pt(e.type.schema).header_cell;
  for (let o = 0; o < t.width; o++) if (((r = e.nodeAt(t.map[o + n * t.width])) === null || r === void 0 ? void 0 : r.type) != i) return !1;
  return !0;
}
function By(t, { map: e, tableStart: n, table: r }, i) {
  let o = n;
  for (let c = 0; c < i; c++) o += r.child(c).nodeSize;
  const s = [];
  let l = i > 0 ? -1 : 0;
  rT(e, r, i + l) && (l = i == 0 || i == e.height ? null : 0);
  for (let c = 0, u = e.width * i; c < e.width; c++, u++) if (i > 0 && i < e.height && e.map[u] == e.map[u - e.width]) {
    const f = e.map[u], d = r.nodeAt(f).attrs;
    t.setNodeMarkup(n + f, null, {
      ...d,
      rowspan: d.rowspan + 1
    }), c += d.colspan - 1;
  } else {
    var a;
    const f = l == null ? pt(r.type.schema).cell : (a = r.nodeAt(e.map[u + l * e.width])) === null || a === void 0 ? void 0 : a.type, d = f == null ? void 0 : f.createAndFill();
    d && s.push(d);
  }
  return t.insert(o, pt(r.type.schema).row.create(null, s)), t;
}
function iT(t, e) {
  if (!We(t)) return !1;
  if (e) {
    const n = pn(t);
    e(By(t.tr, n, n.top));
  }
  return !0;
}
function oT(t, e) {
  if (!We(t)) return !1;
  if (e) {
    const n = pn(t);
    e(By(t.tr, n, n.bottom));
  }
  return !0;
}
function sT(t, { map: e, table: n, tableStart: r }, i) {
  let o = 0;
  for (let c = 0; c < i; c++) o += n.child(c).nodeSize;
  const s = o + n.child(i).nodeSize, l = t.mapping.maps.length;
  t.delete(o + r, s + r);
  const a = /* @__PURE__ */ new Set();
  for (let c = 0, u = i * e.width; c < e.width; c++, u++) {
    const f = e.map[u];
    if (!a.has(f)) {
      if (a.add(f), i > 0 && f == e.map[u - e.width]) {
        const d = n.nodeAt(f).attrs;
        t.setNodeMarkup(t.mapping.slice(l).map(f + r), null, {
          ...d,
          rowspan: d.rowspan - 1
        }), c += d.colspan - 1;
      } else if (i < e.height && f == e.map[u + e.width]) {
        const d = n.nodeAt(f), h = d.attrs, m = d.type.create({
          ...h,
          rowspan: d.attrs.rowspan - 1
        }, d.content), b = e.positionAt(i + 1, c, n);
        t.insert(t.mapping.slice(l).map(r + b), m), c += h.colspan - 1;
      }
    }
  }
}
function Fy(t, e) {
  if (!We(t)) return !1;
  if (e) {
    const n = pn(t), r = t.tr;
    if (n.top == 0 && n.bottom == n.map.height) return !1;
    for (let i = n.bottom - 1; sT(r, n, i), i != n.top; i--) {
      const o = n.tableStart ? r.doc.nodeAt(n.tableStart - 1) : r.doc;
      if (!o) throw new RangeError("No table found");
      n.table = o, n.map = xe.get(n.table);
    }
    e(r);
  }
  return !0;
}
function lT(t, e) {
  return function(n, r) {
    if (!We(n)) return !1;
    const i = Kl(n);
    if (i.nodeAfter.attrs[t] === e) return !1;
    if (r) {
      const o = n.tr;
      n.selection instanceof Ae ? n.selection.forEachCell((s, l) => {
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
function aT(t) {
  return function(e, n) {
    if (!We(e)) return !1;
    if (n) {
      const r = pt(e.schema), i = pn(e), o = e.tr, s = i.map.cellsInRect(t == "column" ? {
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
function Uh(t, e, n) {
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
function kf(t, e) {
  return e = e || { useDeprecatedLogic: !1 }, e.useDeprecatedLogic ? aT(t) : function(n, r) {
    if (!We(n)) return !1;
    if (r) {
      const i = pt(n.schema), o = pn(n), s = n.tr, l = Uh("row", o, i), a = Uh("column", o, i), c = (t === "column" ? l : t === "row" && a) ? 1 : 0, u = t == "column" ? {
        left: 0,
        top: c,
        right: 1,
        bottom: o.map.height
      } : t == "row" ? {
        left: c,
        top: 0,
        right: o.map.width,
        bottom: 1
      } : o, f = t == "column" ? a ? i.cell : i.header_cell : t == "row" ? l ? i.cell : i.header_cell : i.cell;
      o.map.cellsInRect(u).forEach((d) => {
        const h = d + o.tableStart, m = s.doc.nodeAt(h);
        m && s.setNodeMarkup(h, f, m.attrs);
      }), r(s);
    }
    return !0;
  };
}
kf("row", { useDeprecatedLogic: !0 });
kf("column", { useDeprecatedLogic: !0 });
kf("cell", { useDeprecatedLogic: !0 });
function cT(t, e) {
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
function $y(t) {
  return function(e, n) {
    if (!We(e)) return !1;
    const r = cT(Kl(e), t);
    if (r == null) return !1;
    if (n) {
      const i = e.doc.resolve(r);
      n(e.tr.setSelection(ee.between(i, _M(i))).scrollIntoView());
    }
    return !0;
  };
}
function uT(t, e) {
  const n = t.selection.$anchor;
  for (let r = n.depth; r > 0; r--) if (n.node(r).type.spec.tableRole == "table")
    return e && e(t.tr.delete(n.before(r), n.after(r)).scrollIntoView()), !0;
  return !1;
}
function Ws(t, e) {
  const n = t.selection;
  if (!(n instanceof Ae)) return !1;
  if (e) {
    const r = t.tr, i = pt(t.schema).cell.createAndFill().content;
    n.forEachCell((o, s) => {
      o.content.eq(i) || r.replace(r.mapping.map(s + 1), r.mapping.map(s + o.nodeSize - 1), new H(i, 0, 0));
    }), r.docChanged && e(r);
  }
  return !0;
}
function fT(t) {
  return (e, n) => {
    const { from: r, to: i, select: o = !0, pos: s = e.selection.from } = t, l = e.tr;
    return eT({
      tr: l,
      originIndex: r,
      targetIndex: i,
      select: o,
      pos: s
    }) ? (n == null || n(l), !0) : !1;
  };
}
function dT(t) {
  return (e, n) => {
    const { from: r, to: i, select: o = !0, pos: s = e.selection.from } = t, l = e.tr;
    return QM({
      tr: l,
      originIndex: r,
      targetIndex: i,
      select: o,
      pos: s
    }) ? (n == null || n(l), !0) : !1;
  };
}
function hT(t) {
  if (t.size === 0) return null;
  let { content: e, openStart: n, openEnd: r } = t;
  for (; e.childCount == 1 && (n > 0 && r > 0 || e.child(0).type.spec.tableRole == "table"); )
    n--, r--, e = e.child(0).content;
  const i = e.child(0), o = i.type.spec.tableRole, s = i.type.schema, l = [];
  if (o == "row") for (let a = 0; a < e.childCount; a++) {
    let c = e.child(a).content;
    const u = a ? 0 : Math.max(0, n - 1), f = a < e.childCount - 1 ? 0 : Math.max(0, r - 1);
    (u || f) && (c = Fc(pt(s).row, new H(c, u, f)).content), l.push(c);
  }
  else if (o == "cell" || o == "header_cell") l.push(n || r ? Fc(pt(s).row, new H(e, n, r)).content : e);
  else return null;
  return pT(s, l);
}
function pT(t, e) {
  const n = [];
  for (let i = 0; i < e.length; i++) {
    const o = e[i];
    for (let s = o.childCount - 1; s >= 0; s--) {
      const { rowspan: l, colspan: a } = o.child(s).attrs;
      for (let c = i; c < i + l; c++) n[c] = (n[c] || 0) + a;
    }
  }
  let r = 0;
  for (let i = 0; i < n.length; i++) r = Math.max(r, n[i]);
  for (let i = 0; i < n.length; i++)
    if (i >= e.length && e.push(z.empty), n[i] < r) {
      const o = pt(t).cell.createAndFill(), s = [];
      for (let l = n[i]; l < r; l++) s.push(o);
      e[i] = e[i].append(z.from(s));
    }
  return {
    height: e.length,
    width: r,
    rows: e
  };
}
function Fc(t, e) {
  const n = t.createAndFill();
  return new qm(n).replace(0, n.content.size, e).doc;
}
function mT({ width: t, height: e, rows: n }, r, i) {
  if (t != r) {
    const o = [], s = [];
    for (let l = 0; l < n.length; l++) {
      const a = n[l], c = [];
      for (let u = o[l] || 0, f = 0; u < r; f++) {
        let d = a.child(f % a.childCount);
        u + d.attrs.colspan > r && (d = d.type.createChecked(Zr(d.attrs, d.attrs.colspan, u + d.attrs.colspan - r), d.content)), c.push(d), u += d.attrs.colspan;
        for (let h = 1; h < d.attrs.rowspan; h++) o[l + h] = (o[l + h] || 0) + d.attrs.colspan;
      }
      s.push(z.from(c));
    }
    n = s, t = r;
  }
  if (e != i) {
    const o = [];
    for (let s = 0, l = 0; s < i; s++, l++) {
      const a = [], c = n[l % e];
      for (let u = 0; u < c.childCount; u++) {
        let f = c.child(u);
        s + f.attrs.rowspan > i && (f = f.type.create({
          ...f.attrs,
          rowspan: Math.max(1, i - f.attrs.rowspan)
        }, f.content)), a.push(f);
      }
      o.push(z.from(a));
    }
    n = o, e = i;
  }
  return {
    width: t,
    height: e,
    rows: n
  };
}
function gT(t, e, n, r, i, o, s) {
  const l = t.doc.type.schema, a = pt(l);
  let c, u;
  if (i > e.width) for (let f = 0, d = 0; f < e.height; f++) {
    const h = n.child(f);
    d += h.nodeSize;
    const m = [];
    let b;
    h.lastChild == null || h.lastChild.type == a.cell ? b = c || (c = a.cell.createAndFill()) : b = u || (u = a.header_cell.createAndFill());
    for (let C = e.width; C < i; C++) m.push(b);
    t.insert(t.mapping.slice(s).map(d - 1 + r), m);
  }
  if (o > e.height) {
    const f = [];
    for (let m = 0, b = (e.height - 1) * e.width; m < Math.max(e.width, i); m++) {
      const C = m >= e.width ? !1 : n.nodeAt(e.map[b + m]).type == a.header_cell;
      f.push(C ? u || (u = a.header_cell.createAndFill()) : c || (c = a.cell.createAndFill()));
    }
    const d = a.row.create(null, z.from(f)), h = [];
    for (let m = e.height; m < o; m++) h.push(d);
    t.insert(t.mapping.slice(s).map(r + n.nodeSize - 2), h);
  }
  return !!(c || u);
}
function Jh(t, e, n, r, i, o, s, l) {
  if (s == 0 || s == e.height) return !1;
  let a = !1;
  for (let c = i; c < o; c++) {
    const u = s * e.width + c, f = e.map[u];
    if (e.map[u - e.width] == f) {
      a = !0;
      const d = n.nodeAt(f), { top: h, left: m } = e.findCell(f);
      t.setNodeMarkup(t.mapping.slice(l).map(f + r), null, {
        ...d.attrs,
        rowspan: s - h
      }), t.insert(t.mapping.slice(l).map(e.positionAt(s, m, n)), d.type.createAndFill({
        ...d.attrs,
        rowspan: h + d.attrs.rowspan - s
      })), c += d.attrs.colspan - 1;
    }
  }
  return a;
}
function Gh(t, e, n, r, i, o, s, l) {
  if (s == 0 || s == e.width) return !1;
  let a = !1;
  for (let c = i; c < o; c++) {
    const u = c * e.width + s, f = e.map[u];
    if (e.map[u - 1] == f) {
      a = !0;
      const d = n.nodeAt(f), h = e.colCount(f), m = t.mapping.slice(l).map(f + r);
      t.setNodeMarkup(m, null, Zr(d.attrs, s - h, d.attrs.colspan - (s - h))), t.insert(m + d.nodeSize, d.type.createAndFill(Zr(d.attrs, 0, s - h))), c += d.attrs.rowspan - 1;
    }
  }
  return a;
}
function Yh(t, e, n, r, i) {
  let o = n ? t.doc.nodeAt(n - 1) : t.doc;
  if (!o) throw new Error("No table found");
  let s = xe.get(o);
  const { top: l, left: a } = r, c = a + i.width, u = l + i.height, f = t.tr;
  let d = 0;
  function h() {
    if (o = n ? f.doc.nodeAt(n - 1) : f.doc, !o) throw new Error("No table found");
    s = xe.get(o), d = f.mapping.maps.length;
  }
  gT(f, s, o, n, c, u, d) && h(), Jh(f, s, o, n, a, c, l, d) && h(), Jh(f, s, o, n, a, c, u, d) && h(), Gh(f, s, o, n, l, u, a, d) && h(), Gh(f, s, o, n, l, u, c, d) && h();
  for (let m = l; m < u; m++) {
    const b = s.positionAt(m, a, o), C = s.positionAt(m, c, o);
    f.replace(f.mapping.slice(d).map(b + n), f.mapping.slice(d).map(C + n), new H(i.rows[m - l], 0, 0));
  }
  h(), f.setSelection(new Ae(f.doc.resolve(n + s.positionAt(l, a, o)), f.doc.resolve(n + s.positionAt(u - 1, c - 1, o)))), e(f);
}
const yT = sg({
  ArrowLeft: qs("horiz", -1),
  ArrowRight: qs("horiz", 1),
  ArrowUp: qs("vert", -1),
  ArrowDown: qs("vert", 1),
  "Shift-ArrowLeft": Ks("horiz", -1),
  "Shift-ArrowRight": Ks("horiz", 1),
  "Shift-ArrowUp": Ks("vert", -1),
  "Shift-ArrowDown": Ks("vert", 1),
  Backspace: Ws,
  "Mod-Backspace": Ws,
  Delete: Ws,
  "Mod-Delete": Ws
});
function al(t, e, n) {
  return n.eq(t.selection) ? !1 : (e && e(t.tr.setSelection(n).scrollIntoView()), !0);
}
function qs(t, e) {
  return (n, r, i) => {
    if (!i) return !1;
    const o = n.selection;
    if (o instanceof Ae) return al(n, r, se.near(o.$headCell, e));
    if (t != "horiz" && !o.empty) return !1;
    const s = _y(i, t, e);
    if (s == null) return !1;
    if (t == "horiz") return al(n, r, se.near(n.doc.resolve(o.head + e), e));
    {
      const l = n.doc.resolve(s), a = Ny(l, t, e);
      let c;
      return a ? c = se.near(a, 1) : e < 0 ? c = se.near(n.doc.resolve(l.before(-1)), -1) : c = se.near(n.doc.resolve(l.after(-1)), 1), al(n, r, c);
    }
  };
}
function Ks(t, e) {
  return (n, r, i) => {
    if (!i) return !1;
    const o = n.selection;
    let s;
    if (o instanceof Ae) s = o;
    else {
      const a = _y(i, t, e);
      if (a == null) return !1;
      s = new Ae(n.doc.resolve(a));
    }
    const l = Ny(s.$headCell, t, e);
    return l ? al(n, r, new Ae(s.$anchorCell, l)) : !1;
  };
}
function kT(t, e) {
  const n = t.state.doc, r = Ui(n.resolve(e));
  return r ? (t.dispatch(t.state.tr.setSelection(new Ae(r))), !0) : !1;
}
function bT(t, e, n) {
  if (!We(t.state)) return !1;
  let r = hT(n);
  const i = t.state.selection;
  if (i instanceof Ae) {
    r || (r = {
      width: 1,
      height: 1,
      rows: [z.from(Fc(pt(t.state.schema).cell, n))]
    });
    const o = i.$anchorCell.node(-1), s = i.$anchorCell.start(-1), l = xe.get(o).rectBetween(i.$anchorCell.pos - s, i.$headCell.pos - s);
    return r = mT(r, l.right - l.left, l.bottom - l.top), Yh(t.state, t.dispatch, s, l, r), !0;
  } else if (r) {
    const o = Kl(t.state), s = o.start(-1);
    return Yh(t.state, t.dispatch, s, xe.get(o.node(-1)).findCell(o.pos - s), r), !0;
  } else return !1;
}
function wT(t, e) {
  var n;
  if (e.button != 0 || e.ctrlKey || e.metaKey) return;
  const r = Xh(t, e.target);
  let i;
  if (e.shiftKey && t.state.selection instanceof Ae)
    o(t.state.selection.$anchorCell, e), e.preventDefault();
  else if (e.shiftKey && r && (i = Ui(t.state.selection.$anchor)) != null && ((n = _a(t, e)) === null || n === void 0 ? void 0 : n.pos) != i.pos)
    o(i, e), e.preventDefault();
  else if (!r) return;
  function o(a, c) {
    let u = _a(t, c);
    const f = tr.getState(t.state) == null;
    if (!u || !yf(a, u)) if (f) u = a;
    else return;
    const d = new Ae(a, u);
    if (f || !t.state.selection.eq(d)) {
      const h = t.state.tr.setSelection(d);
      f && h.setMeta(tr, a.pos), t.dispatch(h);
    }
  }
  function s() {
    t.root.removeEventListener("mouseup", s), t.root.removeEventListener("dragstart", s), t.root.removeEventListener("mousemove", l), tr.getState(t.state) != null && t.dispatch(t.state.tr.setMeta(tr, -1));
  }
  function l(a) {
    const c = a, u = tr.getState(t.state);
    let f;
    if (u != null) f = t.state.doc.resolve(u);
    else if (Xh(t, c.target) != r && (f = _a(t, e), !f))
      return s();
    f && o(f, c);
  }
  t.root.addEventListener("mouseup", s), t.root.addEventListener("dragstart", s), t.root.addEventListener("mousemove", l);
}
function _y(t, e, n) {
  if (!(t.state.selection instanceof ee)) return null;
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
function Xh(t, e) {
  for (; e && e != t.dom; e = e.parentNode) if (e.nodeName == "TD" || e.nodeName == "TH") return e;
  return null;
}
function _a(t, e) {
  const n = t.posAtCoords({
    left: e.clientX,
    top: e.clientY
  });
  if (!n) return null;
  let { inside: r, pos: i } = n;
  return r >= 0 && Ui(t.state.doc.resolve(r)) || Ui(t.state.doc.resolve(i));
}
var xT = class {
  constructor(t, e) {
    this.node = t, this.defaultCellMinWidth = e, this.dom = document.createElement("div"), this.dom.className = "tableWrapper", this.table = this.dom.appendChild(document.createElement("table")), this.table.style.setProperty("--default-cell-min-width", `${e}px`), this.colgroup = this.table.appendChild(document.createElement("colgroup")), $c(t, this.colgroup, this.table, e), this.contentDOM = this.table.appendChild(document.createElement("tbody"));
  }
  update(t) {
    return t.type != this.node.type ? !1 : (this.node = t, $c(t, this.colgroup, this.table, this.defaultCellMinWidth), !0);
  }
  ignoreMutation(t) {
    return t.type == "attributes" && (t.target == this.table || this.colgroup.contains(t.target));
  }
};
function $c(t, e, n, r, i, o) {
  let s = 0, l = !0, a = e.firstChild;
  const c = t.firstChild;
  if (c) {
    for (let f = 0, d = 0; f < c.childCount; f++) {
      const { colspan: h, colwidth: m } = c.child(f).attrs;
      for (let b = 0; b < h; b++, d++) {
        const C = i == d ? o : m && m[b], x = C ? C + "px" : "";
        if (s += C || r, C || (l = !1), a)
          a.style.width != x && (a.style.width = x), a = a.nextSibling;
        else {
          const L = document.createElement("col");
          L.style.width = x, e.appendChild(L);
        }
      }
    }
    for (; a; ) {
      var u;
      const f = a.nextSibling;
      (u = a.parentNode) === null || u === void 0 || u.removeChild(a), a = f;
    }
    l ? (n.style.width = s + "px", n.style.minWidth = "") : (n.style.width = "", n.style.minWidth = s + "px");
  }
}
const It = new st("tableColumnResizing");
function CT({ handleWidth: t = 5, cellMinWidth: e = 25, defaultCellMinWidth: n = 100, View: r = xT, lastColumnResizable: i = !0 } = {}) {
  const o = new Ie({
    key: It,
    state: {
      init(s, l) {
        var a;
        const c = (a = o.spec) === null || a === void 0 || (a = a.props) === null || a === void 0 ? void 0 : a.nodeViews, u = pt(l.schema).table.name;
        return r && c && (c[u] = (f, d) => new r(f, n, d)), new ST(-1, !1);
      },
      apply(s, l) {
        return l.apply(s);
      }
    },
    props: {
      attributes: (s) => {
        const l = It.getState(s);
        return l && l.activeHandle > -1 ? { class: "resize-cursor" } : {};
      },
      handleDOMEvents: {
        mousemove: (s, l) => {
          vT(s, l, t, i);
        },
        mouseleave: (s) => {
          MT(s);
        },
        mousedown: (s, l) => {
          TT(s, l, e, n);
        }
      },
      decorations: (s) => {
        const l = It.getState(s);
        if (l && l.activeHandle > -1) return OT(s, l.activeHandle);
      },
      nodeViews: {}
    }
  });
  return o;
}
var ST = class cl {
  constructor(e, n) {
    this.activeHandle = e, this.dragging = n;
  }
  apply(e) {
    const n = this, r = e.getMeta(It);
    if (r && r.setHandle != null) return new cl(r.setHandle, !1);
    if (r && r.setDragging !== void 0) return new cl(n.activeHandle, r.setDragging);
    if (n.activeHandle > -1 && e.docChanged) {
      let i = e.mapping.map(n.activeHandle, -1);
      return Bc(e.doc.resolve(i)) || (i = -1), new cl(i, n.dragging);
    }
    return n;
  }
};
function vT(t, e, n, r) {
  if (!t.editable) return;
  const i = It.getState(t.state);
  if (i && !i.dragging) {
    const o = ET(e.target);
    let s = -1;
    if (o) {
      const { left: l, right: a } = o.getBoundingClientRect();
      e.clientX - l <= n ? s = Qh(t, e, "left", n) : a - e.clientX <= n && (s = Qh(t, e, "right", n));
    }
    if (s != i.activeHandle) {
      if (!r && s !== -1) {
        const l = t.state.doc.resolve(s), a = l.node(-1), c = xe.get(a), u = l.start(-1);
        if (c.colCount(l.pos - u) + l.nodeAfter.attrs.colspan - 1 == c.width - 1) return;
      }
      Vy(t, s);
    }
  }
}
function MT(t) {
  if (!t.editable) return;
  const e = It.getState(t.state);
  e && e.activeHandle > -1 && !e.dragging && Vy(t, -1);
}
function TT(t, e, n, r) {
  var i;
  if (!t.editable) return !1;
  const o = (i = t.dom.ownerDocument.defaultView) !== null && i !== void 0 ? i : window, s = It.getState(t.state);
  if (!s || s.activeHandle == -1 || s.dragging) return !1;
  const l = t.state.doc.nodeAt(s.activeHandle), a = NT(t, s.activeHandle, l.attrs);
  t.dispatch(t.state.tr.setMeta(It, { setDragging: {
    startX: e.clientX,
    startWidth: a
  } }));
  function c(f) {
    o.removeEventListener("mouseup", c), o.removeEventListener("mousemove", u);
    const d = It.getState(t.state);
    d != null && d.dragging && (AT(t, d.activeHandle, Zh(d.dragging, f, n)), t.dispatch(t.state.tr.setMeta(It, { setDragging: null })));
  }
  function u(f) {
    if (!f.which) return c(f);
    const d = It.getState(t.state);
    if (d && d.dragging) {
      const h = Zh(d.dragging, f, n);
      ep(t, d.activeHandle, h, r);
    }
  }
  return ep(t, s.activeHandle, a, r), o.addEventListener("mouseup", c), o.addEventListener("mousemove", u), e.preventDefault(), !0;
}
function NT(t, e, { colspan: n, colwidth: r }) {
  const i = r && r[r.length - 1];
  if (i) return i;
  const o = t.domAtPos(e);
  let s = o.node.childNodes[o.offset].offsetWidth, l = n;
  if (r)
    for (let a = 0; a < n; a++) r[a] && (s -= r[a], l--);
  return s / l;
}
function ET(t) {
  for (; t && t.nodeName != "TD" && t.nodeName != "TH"; ) t = t.classList && t.classList.contains("ProseMirror") ? null : t.parentNode;
  return t;
}
function Qh(t, e, n, r) {
  const i = n == "right" ? -r : r, o = t.posAtCoords({
    left: e.clientX + i,
    top: e.clientY
  });
  if (!o) return -1;
  const { pos: s } = o, l = Ui(t.state.doc.resolve(s));
  if (!l) return -1;
  if (n == "right") return l.pos;
  const a = xe.get(l.node(-1)), c = l.start(-1), u = a.map.indexOf(l.pos - c);
  return u % a.width == 0 ? -1 : c + a.map[u - 1];
}
function Zh(t, e, n) {
  const r = e.clientX - t.startX;
  return Math.max(n, t.startWidth + r);
}
function Vy(t, e) {
  t.dispatch(t.state.tr.setMeta(It, { setHandle: e }));
}
function AT(t, e, n) {
  const r = t.state.doc.resolve(e), i = r.node(-1), o = xe.get(i), s = r.start(-1), l = o.colCount(r.pos - s) + r.nodeAfter.attrs.colspan - 1, a = t.state.tr;
  for (let c = 0; c < o.height; c++) {
    const u = c * o.width + l;
    if (c && o.map[u] == o.map[u - o.width]) continue;
    const f = o.map[u], d = i.nodeAt(f).attrs, h = d.colspan == 1 ? 0 : l - o.colCount(f);
    if (d.colwidth && d.colwidth[h] == n) continue;
    const m = d.colwidth ? d.colwidth.slice() : IT(d.colspan);
    m[h] = n, a.setNodeMarkup(s + f, null, {
      ...d,
      colwidth: m
    });
  }
  a.docChanged && t.dispatch(a);
}
function ep(t, e, n, r) {
  const i = t.state.doc.resolve(e), o = i.node(-1), s = i.start(-1), l = xe.get(o).colCount(i.pos - s) + i.nodeAfter.attrs.colspan - 1;
  let a = t.domAtPos(i.start(-1)).node;
  for (; a && a.nodeName != "TABLE"; ) a = a.parentNode;
  a && $c(o, a.firstChild, a, r, l, n);
}
function IT(t) {
  return Array(t).fill(0);
}
function OT(t, e) {
  const n = [], r = t.doc.resolve(e), i = r.node(-1);
  if (!i) return Te.empty;
  const o = xe.get(i), s = r.start(-1), l = o.colCount(r.pos - s) + r.nodeAfter.attrs.colspan - 1;
  for (let c = 0; c < o.height; c++) {
    const u = l + c * o.width;
    if ((l == o.width - 1 || o.map[u] != o.map[u + 1]) && (c == 0 || o.map[u] != o.map[u - o.width])) {
      var a;
      const f = o.map[u], d = s + f + i.nodeAt(f).nodeSize - 1, h = document.createElement("div");
      h.className = "column-resize-handle", !((a = It.getState(t)) === null || a === void 0) && a.dragging && n.push(Le.node(s + f, s + f + i.nodeAt(f).nodeSize, { class: "column-resize-dragging" })), n.push(Le.widget(d, h));
    }
  }
  return Te.create(t.doc, n);
}
function DT({ allowTableNodeSelection: t = !1 } = {}) {
  return new Ie({
    key: tr,
    state: {
      init() {
        return null;
      },
      apply(e, n) {
        const r = e.getMeta(tr);
        if (r != null) return r == -1 ? null : r;
        if (n == null || !e.docChanged) return n;
        const { deleted: i, pos: o } = e.mapping.mapResult(n);
        return i ? null : o;
      }
    },
    props: {
      decorations: WM,
      handleDOMEvents: { mousedown: wT },
      createSelectionBetween(e) {
        return tr.getState(e.state) != null ? e.state.selection : null;
      },
      handleTripleClick: kT,
      handleKeyDown: yT,
      handlePaste: bT
    },
    appendTransaction(e, n, r) {
      return UM(r, GM(r, n), t);
    }
  });
}
var Ml = typeof navigator < "u" ? navigator : null, bf = Ml && Ml.userAgent || "", RT = /Edge\/(\d+)/.exec(bf), LT = /MSIE \d/.exec(bf), PT = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(bf), zT = !!(LT || PT || RT), BT = !zT && !!Ml && /Apple Computer/.test(Ml.vendor), Hy = new st("safari-ime-span"), _c = !1, FT = {
  key: Hy,
  props: {
    decorations: $T,
    handleDOMEvents: {
      compositionstart: () => {
        _c = !0;
      },
      compositionend: () => {
        _c = !1;
      }
    }
  }
};
function $T(t) {
  const { $from: e, $to: n, to: r } = t.selection;
  if (_c && e.sameParent(n)) {
    const i = Le.widget(r, _T, {
      ignoreSelection: !0,
      key: "safari-ime-span"
    });
    return Te.create(t.doc, [i]);
  }
}
function _T(t) {
  const e = t.dom.ownerDocument.createElement("span");
  return e.className = "ProseMirror-safari-ime-span", e;
}
var VT = new Ie(BT ? FT : { key: Hy });
function tp(t, e) {
  const n = String(t);
  if (typeof e != "string")
    throw new TypeError("Expected character");
  let r = 0, i = n.indexOf(e);
  for (; i !== -1; )
    r++, i = n.indexOf(e, i + e.length);
  return r;
}
function HT(t) {
  if (typeof t != "string")
    throw new TypeError("Expected a string");
  return t.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}
function jT(t, e, n) {
  const i = Ll((n || {}).ignore || []), o = WT(e);
  let s = -1;
  for (; ++s < o.length; )
    Zc(t, "text", l);
  function l(c, u) {
    let f = -1, d;
    for (; ++f < u.length; ) {
      const h = u[f], m = d ? d.children : void 0;
      if (i(
        h,
        m ? m.indexOf(h) : void 0,
        d
      ))
        return;
      d = h;
    }
    if (d)
      return a(c, u);
  }
  function a(c, u) {
    const f = u[u.length - 1], d = o[s][0], h = o[s][1];
    let m = 0;
    const C = f.children.indexOf(c);
    let x = !1, L = [];
    d.lastIndex = 0;
    let I = d.exec(c.value);
    for (; I; ) {
      const D = I.index, j = {
        index: I.index,
        input: I.input,
        stack: [...u, c]
      };
      let A = h(...I, j);
      if (typeof A == "string" && (A = A.length > 0 ? { type: "text", value: A } : void 0), A === !1 ? d.lastIndex = D + 1 : (m !== D && L.push({
        type: "text",
        value: c.value.slice(m, D)
      }), Array.isArray(A) ? L.push(...A) : A && L.push(A), m = D + I[0].length, x = !0), !d.global)
        break;
      I = d.exec(c.value);
    }
    return x ? (m < c.value.length && L.push({ type: "text", value: c.value.slice(m) }), f.children.splice(C, 1, ...L)) : L = [c], C + L.length;
  }
}
function WT(t) {
  const e = [];
  if (!Array.isArray(t))
    throw new TypeError("Expected find and replace tuple or list of tuples");
  const n = !t[0] || Array.isArray(t[0]) ? t : [t];
  let r = -1;
  for (; ++r < n.length; ) {
    const i = n[r];
    e.push([qT(i[0]), KT(i[1])]);
  }
  return e;
}
function qT(t) {
  return typeof t == "string" ? new RegExp(HT(t), "g") : t;
}
function KT(t) {
  return typeof t == "function" ? t : function() {
    return t;
  };
}
const Va = "phrasing", Ha = ["autolink", "link", "image", "label"];
function UT() {
  return {
    transforms: [eN],
    enter: {
      literalAutolink: GT,
      literalAutolinkEmail: ja,
      literalAutolinkHttp: ja,
      literalAutolinkWww: ja
    },
    exit: {
      literalAutolink: ZT,
      literalAutolinkEmail: QT,
      literalAutolinkHttp: YT,
      literalAutolinkWww: XT
    }
  };
}
function JT() {
  return {
    unsafe: [
      {
        character: "@",
        before: "[+\\-.\\w]",
        after: "[\\-.\\w]",
        inConstruct: Va,
        notInConstruct: Ha
      },
      {
        character: ".",
        before: "[Ww]",
        after: "[\\-.\\w]",
        inConstruct: Va,
        notInConstruct: Ha
      },
      {
        character: ":",
        before: "[ps]",
        after: "\\/",
        inConstruct: Va,
        notInConstruct: Ha
      }
    ]
  };
}
function GT(t) {
  this.enter({ type: "link", title: null, url: "", children: [] }, t);
}
function ja(t) {
  this.config.enter.autolinkProtocol.call(this, t);
}
function YT(t) {
  this.config.exit.autolinkProtocol.call(this, t);
}
function XT(t) {
  this.config.exit.data.call(this, t);
  const e = this.stack[this.stack.length - 1];
  e.type, e.url = "http://" + this.sliceSerialize(t);
}
function QT(t) {
  this.config.exit.autolinkEmail.call(this, t);
}
function ZT(t) {
  this.exit(t);
}
function eN(t) {
  jT(
    t,
    [
      [/(https?:\/\/|www(?=\.))([-.\w]+)([^ \t\r\n]*)/gi, tN],
      [new RegExp("(^|\\\\s|[\\\\u0021-\\\\u002F\\\\u003A-\\\\u0040\\\\u005B-\\\\u0060\\\\u007B-\\\\u007E])([-.\\\\w+]+)@([-\\\\w]+(?:\\\\.[-\\\\w]+)+)", "gu"), nN]
    ],
    { ignore: ["link", "linkReference"] }
  );
}
function tN(t, e, n, r, i) {
  let o = "";
  if (!jy(i) || (/^w/i.test(e) && (n = e + n, e = "", o = "http://"), !rN(n)))
    return !1;
  const s = iN(n + r);
  if (!s[0]) return !1;
  const l = {
    type: "link",
    title: null,
    url: o + e + s[0],
    children: [{ type: "text", value: e + s[0] }]
  };
  return s[1] ? [l, { type: "text", value: s[1] }] : l;
}
function nN(t, e, n, r) {
  return (
    // Not an expected previous character.
    !jy(r, !0) || // Label ends in not allowed character.
    /[-\d_]$/.test(n) ? !1 : {
      type: "link",
      title: null,
      url: "mailto:" + e + "@" + n,
      children: [{ type: "text", value: e + "@" + n }]
    }
  );
}
function rN(t) {
  const e = t.split(".");
  return !(e.length < 2 || e[e.length - 1] && (/_/.test(e[e.length - 1]) || !/[a-zA-Z\d]/.test(e[e.length - 1])) || e[e.length - 2] && (/_/.test(e[e.length - 2]) || !/[a-zA-Z\d]/.test(e[e.length - 2])));
}
function iN(t) {
  const e = /[!"&'),.:;<>?\]}]+$/.exec(t);
  if (!e)
    return [t, void 0];
  t = t.slice(0, e.index);
  let n = e[0], r = n.indexOf(")");
  const i = tp(t, "(");
  let o = tp(t, ")");
  for (; r !== -1 && i > o; )
    t += n.slice(0, r + 1), n = n.slice(r + 1), r = n.indexOf(")"), o++;
  return [t, n];
}
function jy(t, e) {
  const n = t.input.charCodeAt(t.index - 1);
  return (t.index === 0 || Jr(n) || Dl(n)) && // If it’s an email, the previous character should not be a slash.
  (!e || n !== 47);
}
Wy.peek = hN;
function oN() {
  this.buffer();
}
function sN(t) {
  this.enter({ type: "footnoteReference", identifier: "", label: "" }, t);
}
function lN() {
  this.buffer();
}
function aN(t) {
  this.enter(
    { type: "footnoteDefinition", identifier: "", label: "", children: [] },
    t
  );
}
function cN(t) {
  const e = this.resume(), n = this.stack[this.stack.length - 1];
  n.type, n.identifier = Xt(
    this.sliceSerialize(t)
  ).toLowerCase(), n.label = e;
}
function uN(t) {
  this.exit(t);
}
function fN(t) {
  const e = this.resume(), n = this.stack[this.stack.length - 1];
  n.type, n.identifier = Xt(
    this.sliceSerialize(t)
  ).toLowerCase(), n.label = e;
}
function dN(t) {
  this.exit(t);
}
function hN() {
  return "[";
}
function Wy(t, e, n, r) {
  const i = n.createTracker(r);
  let o = i.move("[^");
  const s = n.enter("footnoteReference"), l = n.enter("reference");
  return o += i.move(
    n.safe(n.associationId(t), { after: "]", before: o })
  ), l(), s(), o += i.move("]"), o;
}
function pN() {
  return {
    enter: {
      gfmFootnoteCallString: oN,
      gfmFootnoteCall: sN,
      gfmFootnoteDefinitionLabelString: lN,
      gfmFootnoteDefinition: aN
    },
    exit: {
      gfmFootnoteCallString: cN,
      gfmFootnoteCall: uN,
      gfmFootnoteDefinitionLabelString: fN,
      gfmFootnoteDefinition: dN
    }
  };
}
function mN(t) {
  let e = !1;
  return t && t.firstLineBlank && (e = !0), {
    handlers: { footnoteDefinition: n, footnoteReference: Wy },
    // This is on by default already.
    unsafe: [{ character: "[", inConstruct: ["label", "phrasing", "reference"] }]
  };
  function n(r, i, o, s) {
    const l = o.createTracker(s);
    let a = l.move("[^");
    const c = o.enter("footnoteDefinition"), u = o.enter("label");
    return a += l.move(
      o.safe(o.associationId(r), { before: a, after: "]" })
    ), u(), a += l.move("]:"), r.children && r.children.length > 0 && (l.shift(4), a += l.move(
      (e ? `
` : " ") + o.indentLines(
        o.containerFlow(r, l.current()),
        e ? qy : gN
      )
    )), c(), a;
  }
}
function gN(t, e, n) {
  return e === 0 ? t : qy(t, e, n);
}
function qy(t, e, n) {
  return (n ? "" : "    ") + t;
}
const yN = [
  "autolink",
  "destinationLiteral",
  "destinationRaw",
  "reference",
  "titleQuote",
  "titleApostrophe"
];
Uy.peek = xN;
function Ky() {
  return {
    canContainEols: ["delete"],
    enter: { strikethrough: bN },
    exit: { strikethrough: wN }
  };
}
function kN() {
  return {
    unsafe: [
      {
        character: "~",
        inConstruct: "phrasing",
        notInConstruct: yN
      }
    ],
    handlers: { delete: Uy }
  };
}
function bN(t) {
  this.enter({ type: "delete", children: [] }, t);
}
function wN(t) {
  this.exit(t);
}
function Uy(t, e, n, r) {
  const i = n.createTracker(r), o = n.enter("strikethrough");
  let s = i.move("~~");
  return s += n.containerPhrasing(t, {
    ...i.current(),
    before: s,
    after: "~"
  }), s += i.move("~~"), o(), s;
}
function xN() {
  return "~";
}
function CN(t) {
  return t.length;
}
function SN(t, e) {
  const n = e || {}, r = (n.align || []).concat(), i = n.stringLength || CN, o = [], s = [], l = [], a = [];
  let c = 0, u = -1;
  for (; ++u < t.length; ) {
    const b = [], C = [];
    let x = -1;
    for (t[u].length > c && (c = t[u].length); ++x < t[u].length; ) {
      const L = vN(t[u][x]);
      if (n.alignDelimiters !== !1) {
        const I = i(L);
        C[x] = I, (a[x] === void 0 || I > a[x]) && (a[x] = I);
      }
      b.push(L);
    }
    s[u] = b, l[u] = C;
  }
  let f = -1;
  if (typeof r == "object" && "length" in r)
    for (; ++f < c; )
      o[f] = np(r[f]);
  else {
    const b = np(r);
    for (; ++f < c; )
      o[f] = b;
  }
  f = -1;
  const d = [], h = [];
  for (; ++f < c; ) {
    const b = o[f];
    let C = "", x = "";
    b === 99 ? (C = ":", x = ":") : b === 108 ? C = ":" : b === 114 && (x = ":");
    let L = n.alignDelimiters === !1 ? 1 : Math.max(
      1,
      a[f] - C.length - x.length
    );
    const I = C + "-".repeat(L) + x;
    n.alignDelimiters !== !1 && (L = C.length + L + x.length, L > a[f] && (a[f] = L), h[f] = L), d[f] = I;
  }
  s.splice(1, 0, d), l.splice(1, 0, h), u = -1;
  const m = [];
  for (; ++u < s.length; ) {
    const b = s[u], C = l[u];
    f = -1;
    const x = [];
    for (; ++f < c; ) {
      const L = b[f] || "";
      let I = "", D = "";
      if (n.alignDelimiters !== !1) {
        const j = a[f] - (C[f] || 0), A = o[f];
        A === 114 ? I = " ".repeat(j) : A === 99 ? j % 2 ? (I = " ".repeat(j / 2 + 0.5), D = " ".repeat(j / 2 - 0.5)) : (I = " ".repeat(j / 2), D = I) : D = " ".repeat(j);
      }
      n.delimiterStart !== !1 && !f && x.push("|"), n.padding !== !1 && // Don’t add the opening space if we’re not aligning and the cell is
      // empty: there will be a closing space.
      !(n.alignDelimiters === !1 && L === "") && (n.delimiterStart !== !1 || f) && x.push(" "), n.alignDelimiters !== !1 && x.push(I), x.push(L), n.alignDelimiters !== !1 && x.push(D), n.padding !== !1 && x.push(" "), (n.delimiterEnd !== !1 || f !== c - 1) && x.push("|");
    }
    m.push(
      n.delimiterEnd === !1 ? x.join("").replace(/ +$/, "") : x.join("")
    );
  }
  return m.join(`
`);
}
function vN(t) {
  return t == null ? "" : String(t);
}
function np(t) {
  const e = typeof t == "string" ? t.codePointAt(0) : 0;
  return e === 67 || e === 99 ? 99 : e === 76 || e === 108 ? 108 : e === 82 || e === 114 ? 114 : 0;
}
function MN() {
  return {
    enter: {
      table: TN,
      tableData: rp,
      tableHeader: rp,
      tableRow: EN
    },
    exit: {
      codeText: AN,
      table: NN,
      tableData: Wa,
      tableHeader: Wa,
      tableRow: Wa
    }
  };
}
function TN(t) {
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
function NN(t) {
  this.exit(t), this.data.inTable = void 0;
}
function EN(t) {
  this.enter({ type: "tableRow", children: [] }, t);
}
function Wa(t) {
  this.exit(t);
}
function rp(t) {
  this.enter({ type: "tableCell", children: [] }, t);
}
function AN(t) {
  let e = this.resume();
  this.data.inTable && (e = e.replace(/\\([\\|])/g, IN));
  const n = this.stack[this.stack.length - 1];
  n.type, n.value = e, this.exit(t);
}
function IN(t, e) {
  return e === "|" ? e : t;
}
function ON(t) {
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
  function s(h, m, b, C) {
    return c(u(h, b, C), h.align);
  }
  function l(h, m, b, C) {
    const x = f(h, b, C), L = c([x]);
    return L.slice(0, L.indexOf(`
`));
  }
  function a(h, m, b, C) {
    const x = b.enter("tableCell"), L = b.enter("phrasing"), I = b.containerPhrasing(h, {
      ...C,
      before: o,
      after: o
    });
    return L(), x(), I;
  }
  function c(h, m) {
    return SN(h, {
      align: m,
      // @ts-expect-error: `markdown-table` types should support `null`.
      alignDelimiters: r,
      // @ts-expect-error: `markdown-table` types should support `null`.
      padding: n,
      // @ts-expect-error: `markdown-table` types should support `null`.
      stringLength: i
    });
  }
  function u(h, m, b) {
    const C = h.children;
    let x = -1;
    const L = [], I = m.enter("table");
    for (; ++x < C.length; )
      L[x] = f(C[x], m, b);
    return I(), L;
  }
  function f(h, m, b) {
    const C = h.children;
    let x = -1;
    const L = [], I = m.enter("tableRow");
    for (; ++x < C.length; )
      L[x] = a(C[x], h, m, b);
    return I(), L;
  }
  function d(h, m, b) {
    let C = tu.inlineCode(h, m, b);
    return b.stack.includes("tableCell") && (C = C.replace(/\|/g, "\\$&")), C;
  }
}
function DN() {
  return {
    exit: {
      taskListCheckValueChecked: ip,
      taskListCheckValueUnchecked: ip,
      paragraph: LN
    }
  };
}
function RN() {
  return {
    unsafe: [{ atBreak: !0, character: "-", after: "[:|-]" }],
    handlers: { listItem: PN }
  };
}
function ip(t) {
  const e = this.stack[this.stack.length - 2];
  e.type, e.checked = t.type === "taskListCheckValueChecked";
}
function LN(t) {
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
function PN(t, e, n, r) {
  const i = t.children[0], o = typeof t.checked == "boolean" && i && i.type === "paragraph", s = "[" + (t.checked ? "x" : " ") + "] ", l = n.createTracker(r);
  o && l.move(s);
  let a = tu.listItem(t, e, n, {
    ...r,
    ...l.current()
  });
  return o && (a = a.replace(/^(?:[*+-]|\d+\.)([\r\n]| {1,3})/, c)), a;
  function c(u) {
    return u + s;
  }
}
function zN() {
  return [
    UT(),
    pN(),
    Ky(),
    MN(),
    DN()
  ];
}
function BN(t) {
  return {
    extensions: [
      JT(),
      mN(t),
      kN(),
      ON(t),
      RN()
    ]
  };
}
const FN = {
  tokenize: WN,
  partial: !0
}, Jy = {
  tokenize: qN,
  partial: !0
}, Gy = {
  tokenize: KN,
  partial: !0
}, Yy = {
  tokenize: UN,
  partial: !0
}, $N = {
  tokenize: JN,
  partial: !0
}, Xy = {
  name: "wwwAutolink",
  tokenize: HN,
  previous: Zy
}, Qy = {
  name: "protocolAutolink",
  tokenize: jN,
  previous: ek
}, $n = {
  name: "emailAutolink",
  tokenize: VN,
  previous: tk
}, mn = {};
function _N() {
  return {
    text: mn
  };
}
let Sr = 48;
for (; Sr < 123; )
  mn[Sr] = $n, Sr++, Sr === 58 ? Sr = 65 : Sr === 91 && (Sr = 97);
mn[43] = $n;
mn[45] = $n;
mn[46] = $n;
mn[95] = $n;
mn[72] = [$n, Qy];
mn[104] = [$n, Qy];
mn[87] = [$n, Xy];
mn[119] = [$n, Xy];
function VN(t, e, n) {
  const r = this;
  let i, o;
  return s;
  function s(f) {
    return !Vc(f) || !tk.call(r, r.previous) || wf(r.events) ? n(f) : (t.enter("literalAutolink"), t.enter("literalAutolinkEmail"), l(f));
  }
  function l(f) {
    return Vc(f) ? (t.consume(f), l) : f === 64 ? (t.consume(f), a) : n(f);
  }
  function a(f) {
    return f === 46 ? t.check($N, u, c)(f) : f === 45 || f === 95 || kt(f) ? (o = !0, t.consume(f), a) : u(f);
  }
  function c(f) {
    return t.consume(f), i = !0, a;
  }
  function u(f) {
    return o && i && ft(r.previous) ? (t.exit("literalAutolinkEmail"), t.exit("literalAutolink"), e(f)) : n(f);
  }
}
function HN(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return s !== 87 && s !== 119 || !Zy.call(r, r.previous) || wf(r.events) ? n(s) : (t.enter("literalAutolink"), t.enter("literalAutolinkWww"), t.check(FN, t.attempt(Jy, t.attempt(Gy, o), n), n)(s));
  }
  function o(s) {
    return t.exit("literalAutolinkWww"), t.exit("literalAutolink"), e(s);
  }
}
function jN(t, e, n) {
  const r = this;
  let i = "", o = !1;
  return s;
  function s(f) {
    return (f === 72 || f === 104) && ek.call(r, r.previous) && !wf(r.events) ? (t.enter("literalAutolink"), t.enter("literalAutolinkHttp"), i += String.fromCodePoint(f), t.consume(f), l) : n(f);
  }
  function l(f) {
    if (ft(f) && i.length < 5)
      return i += String.fromCodePoint(f), t.consume(f), l;
    if (f === 58) {
      const d = i.toLowerCase();
      if (d === "http" || d === "https")
        return t.consume(f), a;
    }
    return n(f);
  }
  function a(f) {
    return f === 47 ? (t.consume(f), o ? c : (o = !0, a)) : n(f);
  }
  function c(f) {
    return f === null || fl(f) || Ne(f) || Jr(f) || Dl(f) ? n(f) : t.attempt(Jy, t.attempt(Gy, u), n)(f);
  }
  function u(f) {
    return t.exit("literalAutolinkHttp"), t.exit("literalAutolink"), e(f);
  }
}
function WN(t, e, n) {
  let r = 0;
  return i;
  function i(s) {
    return (s === 87 || s === 119) && r < 3 ? (r++, t.consume(s), i) : s === 46 && r === 3 ? (t.consume(s), o) : n(s);
  }
  function o(s) {
    return s === null ? n(s) : e(s);
  }
}
function qN(t, e, n) {
  let r, i, o;
  return s;
  function s(c) {
    return c === 46 || c === 95 ? t.check(Yy, a, l)(c) : c === null || Ne(c) || Jr(c) || c !== 45 && Dl(c) ? a(c) : (o = !0, t.consume(c), s);
  }
  function l(c) {
    return c === 95 ? r = !0 : (i = r, r = void 0), t.consume(c), s;
  }
  function a(c) {
    return i || r || !o ? n(c) : e(c);
  }
}
function KN(t, e) {
  let n = 0, r = 0;
  return i;
  function i(s) {
    return s === 40 ? (n++, t.consume(s), i) : s === 41 && r < n ? o(s) : s === 33 || s === 34 || s === 38 || s === 39 || s === 41 || s === 42 || s === 44 || s === 46 || s === 58 || s === 59 || s === 60 || s === 63 || s === 93 || s === 95 || s === 126 ? t.check(Yy, e, o)(s) : s === null || Ne(s) || Jr(s) ? e(s) : (t.consume(s), i);
  }
  function o(s) {
    return s === 41 && r++, t.consume(s), i;
  }
}
function UN(t, e, n) {
  return r;
  function r(l) {
    return l === 33 || l === 34 || l === 39 || l === 41 || l === 42 || l === 44 || l === 46 || l === 58 || l === 59 || l === 63 || l === 95 || l === 126 ? (t.consume(l), r) : l === 38 ? (t.consume(l), o) : l === 93 ? (t.consume(l), i) : (
      // `<` is an end.
      l === 60 || // So is whitespace.
      l === null || Ne(l) || Jr(l) ? e(l) : n(l)
    );
  }
  function i(l) {
    return l === null || l === 40 || l === 91 || Ne(l) || Jr(l) ? e(l) : r(l);
  }
  function o(l) {
    return ft(l) ? s(l) : n(l);
  }
  function s(l) {
    return l === 59 ? (t.consume(l), r) : ft(l) ? (t.consume(l), s) : n(l);
  }
}
function JN(t, e, n) {
  return r;
  function r(o) {
    return t.consume(o), i;
  }
  function i(o) {
    return kt(o) ? n(o) : e(o);
  }
}
function Zy(t) {
  return t === null || t === 40 || t === 42 || t === 95 || t === 91 || t === 93 || t === 126 || Ne(t);
}
function ek(t) {
  return !ft(t);
}
function tk(t) {
  return !(t === 47 || Vc(t));
}
function Vc(t) {
  return t === 43 || t === 45 || t === 46 || t === 95 || kt(t);
}
function wf(t) {
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
const GN = {
  tokenize: rE,
  partial: !0
};
function YN() {
  return {
    document: {
      91: {
        name: "gfmFootnoteDefinition",
        tokenize: eE,
        continuation: {
          tokenize: tE
        },
        exit: nE
      }
    },
    text: {
      91: {
        name: "gfmFootnoteCall",
        tokenize: ZN
      },
      93: {
        name: "gfmPotentialFootnoteCall",
        add: "after",
        tokenize: XN,
        resolveTo: QN
      }
    }
  };
}
function XN(t, e, n) {
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
    const c = Xt(r.sliceSerialize({
      start: s.end,
      end: r.now()
    }));
    return c.codePointAt(0) !== 94 || !o.includes(c.slice(1)) ? n(a) : (t.enter("gfmFootnoteCallLabelMarker"), t.consume(a), t.exit("gfmFootnoteCallLabelMarker"), e(a));
  }
}
function QN(t, e) {
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
function ZN(t, e, n) {
  const r = this, i = r.parser.gfmFootnotes || (r.parser.gfmFootnotes = []);
  let o = 0, s;
  return l;
  function l(f) {
    return t.enter("gfmFootnoteCall"), t.enter("gfmFootnoteCallLabelMarker"), t.consume(f), t.exit("gfmFootnoteCallLabelMarker"), a;
  }
  function a(f) {
    return f !== 94 ? n(f) : (t.enter("gfmFootnoteCallMarker"), t.consume(f), t.exit("gfmFootnoteCallMarker"), t.enter("gfmFootnoteCallString"), t.enter("chunkString").contentType = "string", c);
  }
  function c(f) {
    if (
      // Too long.
      o > 999 || // Closing brace with nothing.
      f === 93 && !s || // Space or tab is not supported by GFM for some reason.
      // `\n` and `[` not being supported makes sense.
      f === null || f === 91 || Ne(f)
    )
      return n(f);
    if (f === 93) {
      t.exit("chunkString");
      const d = t.exit("gfmFootnoteCallString");
      return i.includes(Xt(r.sliceSerialize(d))) ? (t.enter("gfmFootnoteCallLabelMarker"), t.consume(f), t.exit("gfmFootnoteCallLabelMarker"), t.exit("gfmFootnoteCall"), e) : n(f);
    }
    return Ne(f) || (s = !0), o++, t.consume(f), f === 92 ? u : c;
  }
  function u(f) {
    return f === 91 || f === 92 || f === 93 ? (t.consume(f), o++, c) : c(f);
  }
}
function eE(t, e, n) {
  const r = this, i = r.parser.gfmFootnotes || (r.parser.gfmFootnotes = []);
  let o, s = 0, l;
  return a;
  function a(m) {
    return t.enter("gfmFootnoteDefinition")._container = !0, t.enter("gfmFootnoteDefinitionLabel"), t.enter("gfmFootnoteDefinitionLabelMarker"), t.consume(m), t.exit("gfmFootnoteDefinitionLabelMarker"), c;
  }
  function c(m) {
    return m === 94 ? (t.enter("gfmFootnoteDefinitionMarker"), t.consume(m), t.exit("gfmFootnoteDefinitionMarker"), t.enter("gfmFootnoteDefinitionLabelString"), t.enter("chunkString").contentType = "string", u) : n(m);
  }
  function u(m) {
    if (
      // Too long.
      s > 999 || // Closing brace with nothing.
      m === 93 && !l || // Space or tab is not supported by GFM for some reason.
      // `\n` and `[` not being supported makes sense.
      m === null || m === 91 || Ne(m)
    )
      return n(m);
    if (m === 93) {
      t.exit("chunkString");
      const b = t.exit("gfmFootnoteDefinitionLabelString");
      return o = Xt(r.sliceSerialize(b)), t.enter("gfmFootnoteDefinitionLabelMarker"), t.consume(m), t.exit("gfmFootnoteDefinitionLabelMarker"), t.exit("gfmFootnoteDefinitionLabel"), d;
    }
    return Ne(m) || (l = !0), s++, t.consume(m), m === 92 ? f : u;
  }
  function f(m) {
    return m === 91 || m === 92 || m === 93 ? (t.consume(m), s++, u) : u(m);
  }
  function d(m) {
    return m === 58 ? (t.enter("definitionMarker"), t.consume(m), t.exit("definitionMarker"), i.includes(o) || i.push(o), ge(t, h, "gfmFootnoteDefinitionWhitespace")) : n(m);
  }
  function h(m) {
    return e(m);
  }
}
function tE(t, e, n) {
  return t.check(ds, e, t.attempt(GN, e, n));
}
function nE(t) {
  t.exit("gfmFootnoteDefinition");
}
function rE(t, e, n) {
  const r = this;
  return ge(t, i, "gfmFootnoteDefinitionIndent", 5);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return s && s[1].type === "gfmFootnoteDefinitionIndent" && s[2].sliceSerialize(s[1], !0).length === 4 ? e(o) : n(o);
  }
}
function nk(t) {
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
        let c = a;
        for (; c--; )
          if (s[c][0] === "exit" && s[c][1].type === "strikethroughSequenceTemporary" && s[c][1]._open && // If the sizes are the same:
          s[a][1].end.offset - s[a][1].start.offset === s[c][1].end.offset - s[c][1].start.offset) {
            s[a][1].type = "strikethroughSequence", s[c][1].type = "strikethroughSequence";
            const u = {
              type: "strikethrough",
              start: Object.assign({}, s[c][1].start),
              end: Object.assign({}, s[a][1].end)
            }, f = {
              type: "strikethroughText",
              start: Object.assign({}, s[c][1].end),
              end: Object.assign({}, s[a][1].start)
            }, d = [["enter", u, l], ["enter", s[c][1], l], ["exit", s[c][1], l], ["enter", f, l]], h = l.parser.constructs.insideSpan.null;
            h && Ot(d, d.length, 0, Rl(h, s.slice(c + 1, a), l)), Ot(d, d.length, 0, [["exit", f, l], ["enter", s[a][1], l], ["exit", s[a][1], l], ["exit", u, l]]), Ot(s, c - 1, a - c + 3, d), a = c + d.length - 2;
            break;
          }
      }
    for (a = -1; ++a < s.length; )
      s[a][1].type === "strikethroughSequenceTemporary" && (s[a][1].type = "data");
    return s;
  }
  function o(s, l, a) {
    const c = this.previous, u = this.events;
    let f = 0;
    return d;
    function d(m) {
      return c === 126 && u[u.length - 1][1].type !== "characterEscape" ? a(m) : (s.enter("strikethroughSequenceTemporary"), h(m));
    }
    function h(m) {
      const b = Hi(c);
      if (m === 126)
        return f > 1 ? a(m) : (s.consume(m), f++, h);
      if (f < 2 && !n) return a(m);
      const C = s.exit("strikethroughSequenceTemporary"), x = Hi(m);
      return C._open = !x || x === 2 && !!b, C._close = !b || b === 2 && !!x, l(m);
    }
  }
}
class iE {
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
    oE(this, e, n, r);
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
function oE(t, e, n, r) {
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
function sE(t, e) {
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
function lE() {
  return {
    flow: {
      null: {
        name: "table",
        tokenize: aE,
        resolveAll: cE
      }
    }
  };
}
function aE(t, e, n) {
  const r = this;
  let i = 0, o = 0, s;
  return l;
  function l(O) {
    let U = r.events.length - 1;
    for (; U > -1; ) {
      const G = r.events[U][1].type;
      if (G === "lineEnding" || // Note: markdown-rs uses `whitespace` instead of `linePrefix`
      G === "linePrefix") U--;
      else break;
    }
    const K = U > -1 ? r.events[U][1].type : null, be = K === "tableHead" || K === "tableRow" ? A : a;
    return be === A && r.parser.lazy[r.now().line] ? n(O) : be(O);
  }
  function a(O) {
    return t.enter("tableHead"), t.enter("tableRow"), c(O);
  }
  function c(O) {
    return O === 124 || (s = !0, o += 1), u(O);
  }
  function u(O) {
    return O === null ? n(O) : Z(O) ? o > 1 ? (o = 0, r.interrupt = !0, t.exit("tableRow"), t.enter("lineEnding"), t.consume(O), t.exit("lineEnding"), h) : n(O) : fe(O) ? ge(t, u, "whitespace")(O) : (o += 1, s && (s = !1, i += 1), O === 124 ? (t.enter("tableCellDivider"), t.consume(O), t.exit("tableCellDivider"), s = !0, u) : (t.enter("data"), f(O)));
  }
  function f(O) {
    return O === null || O === 124 || Ne(O) ? (t.exit("data"), u(O)) : (t.consume(O), O === 92 ? d : f);
  }
  function d(O) {
    return O === 92 || O === 124 ? (t.consume(O), f) : f(O);
  }
  function h(O) {
    return r.interrupt = !1, r.parser.lazy[r.now().line] ? n(O) : (t.enter("tableDelimiterRow"), s = !1, fe(O) ? ge(t, m, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(O) : m(O));
  }
  function m(O) {
    return O === 45 || O === 58 ? C(O) : O === 124 ? (s = !0, t.enter("tableCellDivider"), t.consume(O), t.exit("tableCellDivider"), b) : j(O);
  }
  function b(O) {
    return fe(O) ? ge(t, C, "whitespace")(O) : C(O);
  }
  function C(O) {
    return O === 58 ? (o += 1, s = !0, t.enter("tableDelimiterMarker"), t.consume(O), t.exit("tableDelimiterMarker"), x) : O === 45 ? (o += 1, x(O)) : O === null || Z(O) ? D(O) : j(O);
  }
  function x(O) {
    return O === 45 ? (t.enter("tableDelimiterFiller"), L(O)) : j(O);
  }
  function L(O) {
    return O === 45 ? (t.consume(O), L) : O === 58 ? (s = !0, t.exit("tableDelimiterFiller"), t.enter("tableDelimiterMarker"), t.consume(O), t.exit("tableDelimiterMarker"), I) : (t.exit("tableDelimiterFiller"), I(O));
  }
  function I(O) {
    return fe(O) ? ge(t, D, "whitespace")(O) : D(O);
  }
  function D(O) {
    return O === 124 ? m(O) : O === null || Z(O) ? !s || i !== o ? j(O) : (t.exit("tableDelimiterRow"), t.exit("tableHead"), e(O)) : j(O);
  }
  function j(O) {
    return n(O);
  }
  function A(O) {
    return t.enter("tableRow"), _(O);
  }
  function _(O) {
    return O === 124 ? (t.enter("tableCellDivider"), t.consume(O), t.exit("tableCellDivider"), _) : O === null || Z(O) ? (t.exit("tableRow"), e(O)) : fe(O) ? ge(t, _, "whitespace")(O) : (t.enter("data"), J(O));
  }
  function J(O) {
    return O === null || O === 124 || Ne(O) ? (t.exit("data"), _(O)) : (t.consume(O), O === 92 ? Y : J);
  }
  function Y(O) {
    return O === 92 || O === 124 ? (t.consume(O), J) : J(O);
  }
}
function cE(t, e) {
  let n = -1, r = !0, i = 0, o = [0, 0, 0, 0], s = [0, 0, 0, 0], l = !1, a = 0, c, u, f;
  const d = new iE();
  for (; ++n < t.length; ) {
    const h = t[n], m = h[1];
    h[0] === "enter" ? m.type === "tableHead" ? (l = !1, a !== 0 && (op(d, e, a, c, u), u = void 0, a = 0), c = {
      type: "table",
      start: Object.assign({}, m.start),
      // Note: correct end is set later.
      end: Object.assign({}, m.end)
    }, d.add(n, 0, [["enter", c, e]])) : m.type === "tableRow" || m.type === "tableDelimiterRow" ? (r = !0, f = void 0, o = [0, 0, 0, 0], s = [0, n + 1, 0, 0], l && (l = !1, u = {
      type: "tableBody",
      start: Object.assign({}, m.start),
      // Note: correct end is set later.
      end: Object.assign({}, m.end)
    }, d.add(n, 0, [["enter", u, e]])), i = m.type === "tableDelimiterRow" ? 2 : u ? 3 : 1) : i && (m.type === "data" || m.type === "tableDelimiterMarker" || m.type === "tableDelimiterFiller") ? (r = !1, s[2] === 0 && (o[1] !== 0 && (s[0] = s[1], f = Us(d, e, o, i, void 0, f), o = [0, 0, 0, 0]), s[2] = n)) : m.type === "tableCellDivider" && (r ? r = !1 : (o[1] !== 0 && (s[0] = s[1], f = Us(d, e, o, i, void 0, f)), o = s, s = [o[1], n, 0, 0])) : m.type === "tableHead" ? (l = !0, a = n) : m.type === "tableRow" || m.type === "tableDelimiterRow" ? (a = n, o[1] !== 0 ? (s[0] = s[1], f = Us(d, e, o, i, n, f)) : s[1] !== 0 && (f = Us(d, e, s, i, n, f)), i = 0) : i && (m.type === "data" || m.type === "tableDelimiterMarker" || m.type === "tableDelimiterFiller") && (s[3] = n);
  }
  for (a !== 0 && op(d, e, a, c, u), d.consume(e.events), n = -1; ++n < e.events.length; ) {
    const h = e.events[n];
    h[0] === "enter" && h[1].type === "table" && (h[1]._align = sE(e.events, n));
  }
  return t;
}
function Us(t, e, n, r, i, o) {
  const s = r === 1 ? "tableHeader" : r === 2 ? "tableDelimiter" : "tableData", l = "tableContent";
  n[0] !== 0 && (o.end = Object.assign({}, mi(e.events, n[0])), t.add(n[0], 0, [["exit", o, e]]));
  const a = mi(e.events, n[1]);
  if (o = {
    type: s,
    start: Object.assign({}, a),
    // Note: correct end is set later.
    end: Object.assign({}, a)
  }, t.add(n[1], 0, [["enter", o, e]]), n[2] !== 0) {
    const c = mi(e.events, n[2]), u = mi(e.events, n[3]), f = {
      type: l,
      start: Object.assign({}, c),
      end: Object.assign({}, u)
    };
    if (t.add(n[2], 0, [["enter", f, e]]), r !== 2) {
      const d = e.events[n[2]], h = e.events[n[3]];
      if (d[1].end = Object.assign({}, h[1].end), d[1].type = "chunkText", d[1].contentType = "text", n[3] > n[2] + 1) {
        const m = n[2] + 1, b = n[3] - n[2] - 1;
        t.add(m, b, []);
      }
    }
    t.add(n[3] + 1, 0, [["exit", f, e]]);
  }
  return i !== void 0 && (o.end = Object.assign({}, mi(e.events, i)), t.add(i, 0, [["exit", o, e]]), o = void 0), o;
}
function op(t, e, n, r, i) {
  const o = [], s = mi(e.events, n);
  i && (i.end = Object.assign({}, s), o.push(["exit", i, e])), r.end = Object.assign({}, s), o.push(["exit", r, e]), t.add(n + 1, 0, o);
}
function mi(t, e) {
  const n = t[e], r = n[0] === "enter" ? "start" : "end";
  return n[1][r];
}
const uE = {
  name: "tasklistCheck",
  tokenize: dE
};
function fE() {
  return {
    text: {
      91: uE
    }
  };
}
function dE(t, e, n) {
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
    return Ne(a) ? (t.enter("taskListCheckValueUnchecked"), t.consume(a), t.exit("taskListCheckValueUnchecked"), s) : a === 88 || a === 120 ? (t.enter("taskListCheckValueChecked"), t.consume(a), t.exit("taskListCheckValueChecked"), s) : n(a);
  }
  function s(a) {
    return a === 93 ? (t.enter("taskListCheckMarker"), t.consume(a), t.exit("taskListCheckMarker"), t.exit("taskListCheck"), l) : n(a);
  }
  function l(a) {
    return Z(a) ? e(a) : fe(a) ? t.check({
      tokenize: hE
    }, e, n)(a) : n(a);
  }
}
function hE(t, e, n) {
  return ge(t, r, "whitespace");
  function r(i) {
    return i === null ? n(i) : e(i);
  }
}
function pE(t) {
  return Vp([
    _N(),
    YN(),
    nk(t),
    lE(),
    fE()
  ]);
}
const mE = {};
function gE(t) {
  const e = (
    /** @type {Processor<Root>} */
    this
  ), n = t || mE, r = e.data(), i = r.micromarkExtensions || (r.micromarkExtensions = []), o = r.fromMarkdownExtensions || (r.fromMarkdownExtensions = []), s = r.toMarkdownExtensions || (r.toMarkdownExtensions = []);
  i.push(pE(n)), o.push(zN()), s.push(BN(n));
}
function te(t, e) {
  return Object.assign(t, { meta: {
    package: "@milkdown/preset-gfm",
    ...e
  } }), t;
}
var xf = bs("strike_through");
te(xf, {
  displayName: "Attr<strikethrough>",
  group: "Strikethrough"
});
var Ms = Qi("strike_through", (t) => ({
  parseDOM: [{ tag: "del" }, {
    style: "text-decoration",
    getAttrs: (e) => e === "line-through"
  }],
  toDOM: (e) => ["del", t.get(xf.key)(e)],
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
te(Ms.mark, {
  displayName: "MarkSchema<strikethrough>",
  group: "Strikethrough"
});
te(Ms.ctx, {
  displayName: "MarkSchemaCtx<strikethrough>",
  group: "Strikethrough"
});
var Cf = ie("ToggleStrikeThrough", (t) => () => ps(Ms.type(t)));
te(Cf, {
  displayName: "Command<ToggleStrikethrough>",
  group: "Strikethrough"
});
var rk = Ct((t) => ms(new RegExp("(?:^|[^\\\\w:/])(~{1,2})(.+?)\\\\1(?!\\\\w|\\\\/)"), Ms.type(t), { updateCaptured: (e) => e.fullMatch.startsWith("~") ? e : { start: e.start + 1, fullMatch: e.fullMatch.slice(1) } }));
te(rk, {
  displayName: "InputRule<strikethrough>",
  group: "Strikethrough"
});
var Sf = St("strikeThroughKeymap", { ToggleStrikethrough: {
  shortcuts: "Mod-Alt-x",
  command: (t) => {
    const e = t.get(we);
    return () => e.call(Cf.key);
  }
} });
te(Sf.ctx, {
  displayName: "KeymapCtx<strikethrough>",
  group: "Strikethrough"
});
te(Sf.shortcuts, {
  displayName: "Keymap<strikethrough>",
  group: "Strikethrough"
});
var Ts = FM({
  tableGroup: "block",
  cellContent: "paragraph",
  cellAttributes: { alignment: {
    default: "left",
    getFromDOM: (t) => t.style.textAlign || "left",
    setDOMAttr: (t, e) => {
      e.style = `text-align: ${t || "left"}`;
    }
  } }
}), Pn = De("table", () => ({
  ...Ts.table,
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
te(Pn.node, {
  displayName: "NodeSchema<table>",
  group: "Table"
});
te(Pn.ctx, {
  displayName: "NodeSchemaCtx<table>",
  group: "Table"
});
var Ns = De("table_header_row", () => ({
  ...Ts.table_row,
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
te(Ns.node, {
  displayName: "NodeSchema<tableHeaderRow>",
  group: "Table"
});
te(Ns.ctx, {
  displayName: "NodeSchemaCtx<tableHeaderRow>",
  group: "Table"
});
var ro = De("table_row", () => ({
  ...Ts.table_row,
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
te(ro.node, {
  displayName: "NodeSchema<tableRow>",
  group: "Table"
});
te(ro.ctx, {
  displayName: "NodeSchemaCtx<tableRow>",
  group: "Table"
});
var Es = De("table_cell", () => ({
  ...Ts.table_cell,
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
te(Es.node, {
  displayName: "NodeSchema<tableCell>",
  group: "Table"
});
te(Es.ctx, {
  displayName: "NodeSchemaCtx<tableCell>",
  group: "Table"
});
var Ji = De("table_header", () => ({
  ...Ts.table_header,
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
te(Ji.node, {
  displayName: "NodeSchema<tableHeader>",
  group: "Table"
});
te(Ji.ctx, {
  displayName: "NodeSchemaCtx<tableHeader>",
  group: "Table"
});
function ik(t, e = 3, n = 3) {
  const r = Array(n).fill(0).map(() => Es.type(t).createAndFill()), i = Array(n).fill(0).map(() => Ji.type(t).createAndFill()), o = Array(e).fill(0).map((s, l) => l === 0 ? Ns.type(t).create(null, i) : ro.type(t).create(null, r));
  return Pn.type(t).create(null, o);
}
function ok(t) {
  return (e, n) => (r) => {
    n = n ?? r.selection.from;
    const i = r.doc.resolve(n), o = KC((a) => a.type.name === "table")(i), s = o ? {
      node: o.node,
      from: o.start
    } : void 0, l = t === "row";
    if (s) {
      const a = xe.get(s.node);
      if (e >= 0 && e < (l ? a.height : a.width)) {
        const c = a.positionAt(l ? e : a.height - 1, l ? a.width - 1 : e, s.node), u = r.doc.resolve(s.from + c), f = l ? Ae.rowSelection : Ae.colSelection, d = a.positionAt(l ? e : 0, l ? 0 : e, s.node), h = r.doc.resolve(s.from + d);
        return ig(r.setSelection(f(u, h)));
      }
    }
    return r;
  };
}
var yE = ok("row"), kE = ok("col");
function sk(t, e, { map: n, tableStart: r, table: i }, o) {
  const s = Array(o).fill(0).reduce((a, c, u) => a + i.child(u).nodeSize, r), l = Array(n.width).fill(0).map((a, c) => {
    const u = i.nodeAt(n.map[c]);
    return Es.type(t).createAndFill({ alignment: u == null ? void 0 : u.attrs.alignment });
  });
  return e.insert(s, ro.type(t).create(null, l)), e;
}
function bE(t) {
  const e = vs(t.$from);
  if (!e) return;
  const n = xe.get(e.node);
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
function wE(t) {
  const e = bE(t.selection);
  if (e && e[0]) {
    const n = t.doc.resolve(e[0].pos), r = e[e.length - 1];
    if (r) {
      const i = t.doc.resolve(r.pos);
      return ig(t.setSelection(new Ae(i, n)));
    }
  }
  return t;
}
var vf = ie("GoToPrevTableCell", () => () => $y(-1));
te(vf, {
  displayName: "Command<goToPrevTableCellCommand>",
  group: "Table"
});
var Mf = ie("GoToNextTableCell", () => () => $y(1));
te(Mf, {
  displayName: "Command<goToNextTableCellCommand>",
  group: "Table"
});
var Tf = ie("ExitTable", (t) => () => (e, n) => {
  if (!We(e)) return !1;
  const { $head: r } = e.selection, i = qC(r, Pn.type(t));
  if (!i) return !1;
  const { to: o } = i, s = e.tr.replaceWith(o, o, cn.type(t).createAndFill());
  return s.setSelection(se.near(s.doc.resolve(o), 1)).scrollIntoView(), n == null || n(s), !0;
});
te(Tf, {
  displayName: "Command<breakTableCommand>",
  group: "Table"
});
var lk = ie("InsertTable", (t) => ({ row: e, col: n } = {}) => (r, i) => {
  const { selection: o, tr: s } = r, { from: l } = o, a = ik(t, e, n), c = s.replaceSelectionWith(a), u = se.findFrom(c.doc.resolve(l), 1, !0);
  return u && c.setSelection(u), i == null || i(c), !0;
});
te(lk, {
  displayName: "Command<insertTableCommand>",
  group: "Table"
});
var ak = ie("MoveRow", () => ({ from: t, to: e, pos: n } = {}) => fT({
  from: t ?? 0,
  to: e ?? 0,
  pos: n
}));
te(ak, {
  displayName: "Command<moveRowCommand>",
  group: "Table"
});
var ck = ie("MoveCol", () => ({ from: t, to: e, pos: n } = {}) => dT({
  from: t ?? 0,
  to: e ?? 0,
  pos: n
}));
te(ck, {
  displayName: "Command<moveColCommand>",
  group: "Table"
});
var uk = ie("SelectRow", () => (t = { index: 0 }) => (e, n) => {
  const { tr: r } = e;
  return !!(n == null ? void 0 : n(yE(t.index, t.pos)(r)));
});
te(uk, {
  displayName: "Command<selectRowCommand>",
  group: "Table"
});
var fk = ie("SelectCol", () => (t = { index: 0 }) => (e, n) => {
  const { tr: r } = e;
  return !!(n == null ? void 0 : n(kE(t.index, t.pos)(r)));
});
te(fk, {
  displayName: "Command<selectColCommand>",
  group: "Table"
});
var dk = ie("SelectTable", () => () => (t, e) => {
  const { tr: n } = t;
  return !!(e == null ? void 0 : e(wE(n)));
});
te(dk, {
  displayName: "Command<selectTableCommand>",
  group: "Table"
});
var hk = ie("DeleteSelectedCells", () => () => (t, e) => {
  const { selection: n } = t;
  if (!(n instanceof Ae)) return !1;
  const r = n.isRowSelection(), i = n.isColSelection();
  return r && i ? uT(t, e) : i ? zy(t, e) : Fy(t, e);
});
te(hk, {
  displayName: "Command<deleteSelectedCellsCommand>",
  group: "Table"
});
var pk = ie("AddColBefore", () => () => Ly);
te(pk, {
  displayName: "Command<addColBeforeCommand>",
  group: "Table"
});
var mk = ie("AddColAfter", () => () => Py);
te(mk, {
  displayName: "Command<addColAfterCommand>",
  group: "Table"
});
var gk = ie("AddRowBefore", (t) => () => (e, n) => {
  if (!We(e)) return !1;
  if (n) {
    const r = pn(e);
    n(sk(t, e.tr, r, r.top));
  }
  return !0;
});
te(gk, {
  displayName: "Command<addRowBeforeCommand>",
  group: "Table"
});
var yk = ie("AddRowAfter", (t) => () => (e, n) => {
  if (!We(e)) return !1;
  if (n) {
    const r = pn(e);
    n(sk(t, e.tr, r, r.bottom));
  }
  return !0;
});
te(yk, {
  displayName: "Command<addRowAfterCommand>",
  group: "Table"
});
var kk = ie("SetAlign", () => (t = "left") => lT("alignment", t));
te(kk, {
  displayName: "Command<setAlignCommand>",
  group: "Table"
});
var bk = Ct((t) => new Rt(/^\|(\d+)[xX](\d+)\|\s$/, (e, n, r, i) => {
  var a, c;
  const o = e.doc.resolve(r);
  if (!o.node(-1).canReplaceWith(o.index(-1), o.indexAfter(-1), Pn.type(t))) return null;
  const s = ik(t, Math.max(Number(((a = n.groups) == null ? void 0 : a.row) ?? 0), 2), Number((c = n.groups) == null ? void 0 : c.col)), l = e.tr.replaceRangeWith(r, i, s);
  return l.setSelection(ee.create(l.doc, r + 3)).scrollIntoView();
}));
te(bk, {
  displayName: "InputRule<insertTableInputRule>",
  group: "Table"
});
var wk = Zv((t) => ({ run: (e, n, r) => {
  if (r) return e;
  function i(c) {
    var C;
    const u = c.childCount, f = ((C = c.lastChild) == null ? void 0 : C.childCount) ?? 0;
    if (u === 0 || f === 0) return cn.type(t).create();
    const d = c.firstChild;
    if (!(f > 0 && d && d.childCount === 0)) return c;
    if (u >= 3) {
      const x = c.child(1), L = [];
      for (let j = 0; j < x.childCount; j++) {
        const A = x.child(j);
        L.push(Ji.type(t).create(A.attrs, A.content, A.marks));
      }
      const I = d.type.create(d.attrs, L), D = [];
      for (let j = 2; j < u; j++) D.push(c.child(j));
      return c.type.create(c.attrs, [I, ...D]);
    }
    const h = Array(f).fill(0).map(() => Ji.type(t).createAndFill()), m = new H(z.from(h), 0, 0), b = d.replace(0, 0, m);
    return c.replace(0, d.nodeSize, new H(z.from(b), 0, 0));
  }
  function o(c) {
    const u = ro.type(t), f = [];
    let d = [], h = !1;
    function m() {
      if (d.length === 0) return;
      const b = Ns.type(t).createAndFill(), C = Pn.type(t).create(null, [b, ...d]);
      f.push(i(C)), d = [];
    }
    return c.forEach((b) => {
      b.type === u ? (h = !0, d.push(b)) : (m(), f.push(b));
    }), m(), h ? z.from(f) : c;
  }
  function s(c) {
    let u = o(c), f = u !== c;
    const d = [];
    return u.forEach((h) => {
      if (h.type === Pn.type(t)) {
        const m = i(h);
        m !== h && (f = !0), d.push(m);
      } else if (h.childCount > 0) {
        const m = s(h.content);
        m !== h.content ? (f = !0, d.push(h.copy(m))) : d.push(h);
      } else d.push(h);
    }), f ? z.from(d) : c;
  }
  function l(c) {
    const u = [], f = [];
    c.forEach((d) => f.push(d));
    for (let d = 0; d < f.length; d++) {
      const h = f[d], m = f[d + 1];
      h.type === cn.type(t) && h.content.size === 0 && m && m.type === Pn.type(t) || u.push(h);
    }
    return u.length < f.length ? z.from(u) : c;
  }
  let a = s(e.content);
  return a = l(a), new H(z.from(a), e.openStart, e.openEnd);
} }));
te(wk, {
  displayName: "PasteRule<table>",
  group: "Table"
});
var Nf = St("tableKeymap", {
  NextCell: {
    priority: 100,
    shortcuts: ["Mod-]", "Tab"],
    command: (t) => {
      const e = t.get(we);
      return () => e.call(Mf.key);
    }
  },
  PrevCell: {
    shortcuts: ["Mod-[", "Shift-Tab"],
    command: (t) => {
      const e = t.get(we);
      return () => e.call(vf.key);
    }
  },
  ExitTable: {
    shortcuts: ["Mod-Enter", "Enter"],
    command: (t) => {
      const e = t.get(we);
      return () => e.call(Tf.key);
    }
  }
});
te(Nf.ctx, {
  displayName: "KeymapCtx<table>",
  group: "Table"
});
te(Nf.shortcuts, {
  displayName: "Keymap<table>",
  group: "Table"
});
var qa = "footnote_definition", sp = "footnoteDefinition", Ef = De("footnote_definition", () => ({
  group: "block",
  content: "block+",
  defining: !0,
  attrs: { label: {
    default: "",
    validate: "string"
  } },
  parseDOM: [{
    tag: `dl[data-type="${qa}"]`,
    getAttrs: (t) => {
      if (!(t instanceof HTMLElement)) throw un(t);
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
        "data-type": qa
      },
      ["dt", e],
      ["dd", 0]
    ];
  },
  parseMarkdown: {
    match: ({ type: t }) => t === sp,
    runner: (t, e, n) => {
      t.openNode(n, { label: e.label }).next(e.children).closeNode();
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === qa,
    runner: (t, e) => {
      t.openNode(sp, void 0, {
        label: e.attrs.label,
        identifier: e.attrs.label
      }).next(e.content).closeNode();
    }
  }
}));
te(Ef.ctx, {
  displayName: "NodeSchemaCtx<footnodeDef>",
  group: "footnote"
});
te(Ef.node, {
  displayName: "NodeSchema<footnodeDef>",
  group: "footnote"
});
var Ka = "footnote_reference", Af = De("footnote_reference", () => ({
  group: "inline",
  inline: !0,
  atom: !0,
  attrs: { label: {
    default: "",
    validate: "string"
  } },
  parseDOM: [{
    tag: `sup[data-type="${Ka}"]`,
    getAttrs: (t) => {
      if (!(t instanceof HTMLElement)) throw un(t);
      return { label: t.dataset.label };
    }
  }],
  toDOM: (t) => {
    const e = t.attrs.label;
    return [
      "sup",
      {
        "data-label": e,
        "data-type": Ka
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
    match: (t) => t.type.name === Ka,
    runner: (t, e) => {
      t.addNode("footnoteReference", void 0, void 0, {
        label: e.attrs.label,
        identifier: e.attrs.label
      });
    }
  }
}));
te(Af.ctx, {
  displayName: "NodeSchemaCtx<footnodeRef>",
  group: "footnote"
});
te(Af.node, {
  displayName: "NodeSchema<footnodeRef>",
  group: "footnote"
});
var If = Fn.extendSchema((t) => (e) => {
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
        if (!(r instanceof HTMLElement)) throw un(r);
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
        const s = i.label != null ? `${i.label}.` : "•", l = i.checked != null ? !!i.checked : null, a = i.label != null ? "ordered" : "bullet", c = i.spread != null ? `${i.spread}` : "true";
        r.openNode(o, {
          label: s,
          listType: a,
          spread: c,
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
te(If.node, {
  displayName: "NodeSchema<taskListItem>",
  group: "ListItem"
});
te(If.ctx, {
  displayName: "NodeSchemaCtx<taskListItem>",
  group: "ListItem"
});
var xk = Ct(() => new Rt(/^\[(\s|x)\]\s$/, (t, e, n, r) => {
  var u;
  const i = t.doc.resolve(n);
  let o = 0, s = i.node(o);
  for (; s && s.type.name !== "list_item"; )
    o--, s = i.node(o);
  if (!s || s.attrs.checked != null) return null;
  const l = ((u = e.groups) == null ? void 0 : u.checked) === "x", a = i.before(o), c = t.tr;
  return c.deleteRange(n, r).setNodeMarkup(a, void 0, {
    ...s.attrs,
    checked: l
  }), c;
}));
te(xk, {
  displayName: "InputRule<wrapInTaskListInputRule>",
  group: "ListItem"
});
var xE = [Sf, Nf].flat(), CE = [bk, xk], SE = [rk], vE = [wk], Ck = dn(() => VT);
te(Ck, {
  displayName: "Prose<autoInsertSpanPlugin>",
  group: "Prose"
});
var ME = dn(() => CT({}));
te(ME, {
  displayName: "Prose<columnResizingPlugin>",
  group: "Prose"
});
var Sk = dn(() => DT({ allowTableNodeSelection: !0 }));
te(Sk, {
  displayName: "Prose<tableEditingPlugin>",
  group: "Prose"
});
var Of = hn("remarkGFM", () => gE);
te(Of.plugin, {
  displayName: "Remark<remarkGFMPlugin>",
  group: "Remark"
});
te(Of.options, {
  displayName: "RemarkConfig<remarkGFMPlugin>",
  group: "Remark"
});
var TE = new st("MILKDOWN_KEEP_TABLE_ALIGN_PLUGIN");
function NE(t, e) {
  let n = 0;
  return e.forEach((r, i, o) => {
    r === t && (n = o);
  }), n;
}
var vk = dn(() => new Ie({
  key: TE,
  appendTransaction: (t, e, n) => {
    let r;
    const i = (o, s) => {
      if (r || (r = n.tr), o.type.name !== "table_cell") return;
      const l = n.doc.resolve(s), a = l.node(l.depth), c = l.node(l.depth - 1).firstChild;
      if (!c) return;
      const u = NE(o, a), f = c.maybeChild(u);
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
te(vk, {
  displayName: "Prose<keepTableAlignPlugin>",
  group: "Prose"
});
var EE = [
  vk,
  Ck,
  Of,
  Sk
].flat(), AE = [
  If,
  Pn,
  Ns,
  ro,
  Ji,
  Es,
  Ef,
  Af,
  xf,
  Ms
].flat(), IE = [
  Mf,
  vf,
  Tf,
  lk,
  ak,
  ck,
  uk,
  fk,
  dk,
  hk,
  gk,
  yk,
  pk,
  mk,
  kk,
  Cf
], OE = [
  AE,
  CE,
  vE,
  SE,
  xE,
  IE,
  EE
].flat(), Tl = 200, qe = function() {
};
qe.prototype.append = function(e) {
  return e.length ? (e = qe.from(e), !this.length && e || e.length < Tl && this.leafAppend(e) || this.length < Tl && e.leafPrepend(this) || this.appendInner(e)) : this;
};
qe.prototype.prepend = function(e) {
  return e.length ? qe.from(e).append(this) : this;
};
qe.prototype.appendInner = function(e) {
  return new DE(this, e);
};
qe.prototype.slice = function(e, n) {
  return e === void 0 && (e = 0), n === void 0 && (n = this.length), e >= n ? qe.empty : this.sliceInner(Math.max(0, e), Math.min(this.length, n));
};
qe.prototype.get = function(e) {
  if (!(e < 0 || e >= this.length))
    return this.getInner(e);
};
qe.prototype.forEach = function(e, n, r) {
  n === void 0 && (n = 0), r === void 0 && (r = this.length), n <= r ? this.forEachInner(e, n, r, 0) : this.forEachInvertedInner(e, n, r, 0);
};
qe.prototype.map = function(e, n, r) {
  n === void 0 && (n = 0), r === void 0 && (r = this.length);
  var i = [];
  return this.forEach(function(o, s) {
    return i.push(e(o, s));
  }, n, r), i;
};
qe.from = function(e) {
  return e instanceof qe ? e : e && e.length ? new Mk(e) : qe.empty;
};
var Mk = /* @__PURE__ */ function(t) {
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
    if (this.length + i.length <= Tl)
      return new e(this.values.concat(i.flatten()));
  }, e.prototype.leafPrepend = function(i) {
    if (this.length + i.length <= Tl)
      return new e(i.flatten().concat(this.values));
  }, n.length.get = function() {
    return this.values.length;
  }, n.depth.get = function() {
    return 0;
  }, Object.defineProperties(e.prototype, n), e;
}(qe);
qe.empty = new Mk([]);
var DE = /* @__PURE__ */ function(t) {
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
}(qe);
const RE = 500;
class Yt {
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
    let s = e.tr, l, a, c = [], u = [];
    return this.items.forEach((f, d) => {
      if (!f.step) {
        i || (i = this.remapping(r, d + 1), o = i.maps.length), o--, u.push(f);
        return;
      }
      if (i) {
        u.push(new nn(f.map));
        let h = f.step.map(i.slice(o)), m;
        h && s.maybeStep(h).doc && (m = s.mapping.maps[s.mapping.maps.length - 1], c.push(new nn(m, void 0, void 0, c.length + u.length))), o--, m && i.appendMap(m, o);
      } else
        s.maybeStep(f.step);
      if (f.selection)
        return l = i ? f.selection.map(i.slice(o)) : f.selection, a = new Yt(this.items.slice(0, r).append(u.reverse().concat(c)), this.eventCount - 1), !1;
    }, this.items.length, 0), { remaining: a, transform: s, selection: l };
  }
  // Create a new branch with the given transform added.
  addTransform(e, n, r, i) {
    let o = [], s = this.eventCount, l = this.items, a = !i && l.length ? l.get(l.length - 1) : null;
    for (let u = 0; u < e.steps.length; u++) {
      let f = e.steps[u].invert(e.docs[u]), d = new nn(e.mapping.maps[u], f, n), h;
      (h = a && a.merge(d)) && (d = h, u ? o.pop() : l = l.slice(0, l.length - 1)), o.push(d), n && (s++, n = void 0), i || (a = d);
    }
    let c = s - r.depth;
    return c > PE && (l = LE(l, c), s -= c), new Yt(l.append(o), s);
  }
  remapping(e, n) {
    let r = new $o();
    return this.items.forEach((i, o) => {
      let s = i.mirrorOffset != null && o - i.mirrorOffset >= e ? r.maps.length - i.mirrorOffset : void 0;
      r.appendMap(i.map, s);
    }, e, n), r;
  }
  addMaps(e) {
    return this.eventCount == 0 ? this : new Yt(this.items.append(e.map((n) => new nn(n))), this.eventCount);
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
      let m = o.maps[h];
      if (d.step) {
        let b = e.steps[h].invert(e.docs[h]), C = d.selection && d.selection.map(o.slice(a + 1, h));
        C && l++, r.push(new nn(m, b, C));
      } else
        r.push(new nn(m));
    }, i);
    let c = [];
    for (let d = n; d < s; d++)
      c.push(new nn(o.maps[d]));
    let u = this.items.slice(0, i).append(c).append(r), f = new Yt(u, l);
    return f.emptyItemCount() > RE && (f = f.compress(this.items.length - r.length)), f;
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
        let a = s.step.map(n.slice(r)), c = a && a.getMap();
        if (r--, c && n.appendMap(c, r), a) {
          let u = s.selection && s.selection.map(n.slice(r));
          u && o++;
          let f = new nn(c.invert(), a, u), d, h = i.length - 1;
          (d = i.length && i[h].merge(f)) ? i[h] = d : i.push(f);
        }
      } else s.map && r--;
    }, this.items.length, 0), new Yt(qe.from(i.reverse()), o);
  }
}
Yt.empty = new Yt(qe.empty, 0);
function LE(t, e) {
  let n;
  return t.forEach((r, i) => {
    if (r.selection && e-- == 0)
      return n = i, !1;
  }), t.slice(n);
}
class nn {
  constructor(e, n, r, i) {
    this.map = e, this.step = n, this.selection = r, this.mirrorOffset = i;
  }
  merge(e) {
    if (this.step && e.step && !e.selection) {
      let n = e.step.merge(this.step);
      if (n)
        return new nn(n.getMap().invert(), n, this.selection);
    }
  }
}
class Zn {
  constructor(e, n, r, i, o) {
    this.done = e, this.undone = n, this.prevRanges = r, this.prevTime = i, this.prevComposition = o;
  }
}
const PE = 20;
function zE(t, e, n, r) {
  let i = n.getMeta(jr), o;
  if (i)
    return i.historyState;
  n.getMeta(Tk) && (t = new Zn(t.done, t.undone, null, 0, -1));
  let s = n.getMeta("appendedTransaction");
  if (n.steps.length == 0)
    return t;
  if (s && s.getMeta(jr))
    return s.getMeta(jr).redo ? new Zn(t.done.addTransform(n, void 0, r, ul(e)), t.undone, lp(n.mapping.maps), t.prevTime, t.prevComposition) : new Zn(t.done, t.undone.addTransform(n, void 0, r, ul(e)), null, t.prevTime, t.prevComposition);
  if (n.getMeta("addToHistory") !== !1 && !(s && s.getMeta("addToHistory") === !1)) {
    let l = n.getMeta("composition"), a = t.prevTime == 0 || !s && t.prevComposition != l && (t.prevTime < (n.time || 0) - r.newGroupDelay || !BE(n, t.prevRanges)), c = s ? Ua(t.prevRanges, n.mapping) : lp(n.mapping.maps);
    return new Zn(t.done.addTransform(n, a ? e.selection.getBookmark() : void 0, r, ul(e)), Yt.empty, c, n.time, l ?? t.prevComposition);
  } else return (o = n.getMeta("rebased")) ? new Zn(t.done.rebased(n, o), t.undone.rebased(n, o), Ua(t.prevRanges, n.mapping), t.prevTime, t.prevComposition) : new Zn(t.done.addMaps(n.mapping.maps), t.undone.addMaps(n.mapping.maps), Ua(t.prevRanges, n.mapping), t.prevTime, t.prevComposition);
}
function BE(t, e) {
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
function lp(t) {
  let e = [];
  for (let n = t.length - 1; n >= 0 && e.length == 0; n--)
    t[n].forEach((r, i, o, s) => e.push(o, s));
  return e;
}
function Ua(t, e) {
  if (!t)
    return null;
  let n = [];
  for (let r = 0; r < t.length; r += 2) {
    let i = e.map(t[r], 1), o = e.map(t[r + 1], -1);
    i <= o && n.push(i, o);
  }
  return n;
}
function FE(t, e, n) {
  let r = ul(e), i = jr.get(e).spec.config, o = (n ? t.undone : t.done).popEvent(e, r);
  if (!o)
    return null;
  let s = o.selection.resolve(o.transform.doc), l = (n ? t.done : t.undone).addTransform(o.transform, e.selection.getBookmark(), i, r), a = new Zn(n ? l : o.remaining, n ? o.remaining : l, null, 0, -1);
  return o.transform.setSelection(s).setMeta(jr, { redo: n, historyState: a });
}
let Ja = !1, ap = null;
function ul(t) {
  let e = t.plugins;
  if (ap != e) {
    Ja = !1, ap = e;
    for (let n = 0; n < e.length; n++)
      if (e[n].spec.historyPreserveItems) {
        Ja = !0;
        break;
      }
  }
  return Ja;
}
function wn(t) {
  return t.setMeta(Tk, !0);
}
const jr = new st("history"), Tk = new st("closeHistory");
function $E(t = {}) {
  return t = {
    depth: t.depth || 100,
    newGroupDelay: t.newGroupDelay || 500
  }, new Ie({
    key: jr,
    state: {
      init() {
        return new Zn(Yt.empty, Yt.empty, null, 0, -1);
      },
      apply(e, n, r) {
        return zE(n, r, e, t);
      }
    },
    config: t,
    props: {
      handleDOMEvents: {
        beforeinput(e, n) {
          let r = n.inputType, i = r == "historyUndo" ? Po : r == "historyRedo" ? yi : null;
          return !i || !e.editable ? !1 : (n.preventDefault(), i(e.state, e.dispatch));
        }
      }
    }
  });
}
function Nk(t, e) {
  return (n, r) => {
    let i = jr.getState(n);
    if (!i || (t ? i.undone : i.done).eventCount == 0)
      return !1;
    if (r) {
      let o = FE(i, n, t);
      o && r(e ? o.scrollIntoView() : o);
    }
    return !0;
  };
}
const Po = Nk(!1, !0), yi = Nk(!0, !0);
function io(t, e) {
  return Object.assign(t, { meta: {
    package: "@milkdown/plugin-history",
    ...e
  } }), t;
}
var Df = ie("Undo", () => () => Po);
io(Df, { displayName: "Command<undo>" });
var Rf = ie("Redo", () => () => yi);
io(Rf, { displayName: "Command<redo>" });
var Lf = Bn({}, "historyProviderConfig");
io(Lf, { displayName: "Ctx<historyProviderConfig>" });
var Ek = dn((t) => $E(t.get(Lf.key)));
io(Ek, { displayName: "Ctx<historyProviderPlugin>" });
var Pf = St("historyKeymap", {
  Undo: {
    shortcuts: "Mod-z",
    command: (t) => {
      const e = t.get(we);
      return () => e.call(Df.key);
    }
  },
  Redo: {
    shortcuts: ["Mod-y", "Shift-Mod-z"],
    command: (t) => {
      const e = t.get(we);
      return () => e.call(Rf.key);
    }
  }
});
io(Pf.ctx, { displayName: "KeymapCtx<history>" });
io(Pf.shortcuts, { displayName: "Keymap<history>" });
var _E = [
  Lf,
  Ek,
  Pf,
  Df,
  Rf
].flat(), VE = typeof global == "object" && global && global.Object === Object && global, HE = typeof self == "object" && self && self.Object === Object && self, Ak = VE || HE || Function("return this")(), Nl = Ak.Symbol, Ik = Object.prototype, jE = Ik.hasOwnProperty, WE = Ik.toString, po = Nl ? Nl.toStringTag : void 0;
function qE(t) {
  var e = jE.call(t, po), n = t[po];
  try {
    t[po] = void 0;
    var r = !0;
  } catch {
  }
  var i = WE.call(t);
  return r && (e ? t[po] = n : delete t[po]), i;
}
var KE = Object.prototype, UE = KE.toString;
function JE(t) {
  return UE.call(t);
}
var GE = "[object Null]", YE = "[object Undefined]", cp = Nl ? Nl.toStringTag : void 0;
function XE(t) {
  return t == null ? t === void 0 ? YE : GE : cp && cp in Object(t) ? qE(t) : JE(t);
}
function QE(t) {
  return t != null && typeof t == "object";
}
var ZE = "[object Symbol]";
function eA(t) {
  return typeof t == "symbol" || QE(t) && XE(t) == ZE;
}
var tA = /\s/;
function nA(t) {
  for (var e = t.length; e-- && tA.test(t.charAt(e)); )
    ;
  return e;
}
var rA = /^\s+/;
function iA(t) {
  return t && t.slice(0, nA(t) + 1).replace(rA, "");
}
function Hc(t) {
  var e = typeof t;
  return t != null && (e == "object" || e == "function");
}
var up = NaN, oA = /^[-+]0x[0-9a-f]+$/i, sA = /^0b[01]+$/i, lA = /^0o[0-7]+$/i, aA = parseInt;
function fp(t) {
  if (typeof t == "number")
    return t;
  if (eA(t))
    return up;
  if (Hc(t)) {
    var e = typeof t.valueOf == "function" ? t.valueOf() : t;
    t = Hc(e) ? e + "" : e;
  }
  if (typeof t != "string")
    return t === 0 ? t : +t;
  t = iA(t);
  var n = sA.test(t);
  return n || lA.test(t) ? aA(t.slice(2), n ? 2 : 8) : oA.test(t) ? up : +t;
}
var Ga = function() {
  return Ak.Date.now();
}, cA = "Expected a function", uA = Math.max, fA = Math.min;
function dA(t, e, n) {
  var r, i, o, s, l, a, c = 0, u = !1, f = !1, d = !0;
  if (typeof t != "function")
    throw new TypeError(cA);
  e = fp(e) || 0, Hc(n) && (u = !!n.leading, f = "maxWait" in n, o = f ? uA(fp(n.maxWait) || 0, e) : o, d = "trailing" in n ? !!n.trailing : d);
  function h(A) {
    var _ = r, J = i;
    return r = i = void 0, c = A, s = t.apply(J, _), s;
  }
  function m(A) {
    return c = A, l = setTimeout(x, e), u ? h(A) : s;
  }
  function b(A) {
    var _ = A - a, J = A - c, Y = e - _;
    return f ? fA(Y, o - J) : Y;
  }
  function C(A) {
    var _ = A - a, J = A - c;
    return a === void 0 || _ >= e || _ < 0 || f && J >= o;
  }
  function x() {
    var A = Ga();
    if (C(A))
      return L(A);
    l = setTimeout(x, b(A));
  }
  function L(A) {
    return l = void 0, d && r ? h(A) : (r = i = void 0, s);
  }
  function I() {
    l !== void 0 && clearTimeout(l), c = 0, r = a = i = l = void 0;
  }
  function D() {
    return l === void 0 ? s : L(Ga());
  }
  function j() {
    var A = Ga(), _ = C(A);
    if (r = arguments, i = this, a = A, _) {
      if (l === void 0)
        return m(a);
      if (f)
        return clearTimeout(l), l = setTimeout(x, e), h(a);
    }
    return l === void 0 && (l = setTimeout(x, e)), s;
  }
  return j.cancel = I, j.flush = D, j;
}
var Ok = class {
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
}, jc = pe(new Ok(), "listener"), hA = new st("MILKDOWN_LISTENER"), Wc = (t) => (t.inject(jc, new Ok()), async () => {
  await t.wait(Vr);
  const { listeners: e } = t.get(jc);
  e.beforeMount.forEach((c) => c(t)), await t.wait(Ro);
  const n = t.get(Lo);
  let r = null, i = null, o = null, s = null;
  const l = dA(() => {
    if (!s) return;
    const { doc: c } = s;
    if (e.updated.length > 0 && r && !r.eq(c) && e.updated.forEach((u) => {
      u(t, c, r);
    }), e.markdownUpdated.length > 0 && r && !r.eq(c)) {
      const u = n(c);
      e.markdownUpdated.forEach((f) => {
        f(t, u, i);
      }), i = u;
    }
    r = c, s = null;
  }, 200), a = new Ie({
    key: hA,
    view: () => ({ destroy: () => {
      e.destroy.forEach((c) => c(t));
    } }),
    props: { handleDOMEvents: {
      focus: () => (e.focus.forEach((c) => c(t)), !1),
      blur: () => (e.blur.forEach((c) => c(t)), !1)
    } },
    state: {
      init: (c, u) => {
        r = u.doc, i = n(u.doc);
      },
      apply: (c) => {
        const u = c.selection;
        (!o && u || o && !u.eq(o)) && (e.selectionUpdated.forEach((f) => {
          f(t, u, o);
        }), o = u), !(!(c.docChanged || c.storedMarksSet) || c.getMeta("addToHistory") === !1) && (s = c, l());
      }
    }
  });
  t.update(an, (c) => c.concat(a)), await t.wait(ol), e.mounted.forEach((c) => c(t));
});
Wc.meta = {
  package: "@milkdown/plugin-listener",
  displayName: "Listener"
};
const pA = [nk()], mA = [Ky()];
function Dk(t, e = "Markdown") {
  const n = String(t || ""), { body: r, frontmatterLines: i } = Rk(n), s = Xc(r, { extensions: pA, mdastExtensions: mA }).children || [];
  for (let l = 0; l < s.length; l += 1) {
    const a = s[l];
    if (a.type !== "heading" || a.depth !== 1) continue;
    const c = qc(a.children);
    if (!c) continue;
    const u = s[l - 1], f = s[l + 1];
    if (u && f && u.type === "html" && yA(u.value) && f.type === "html" && kA(f.value))
      return {
        displayText: c,
        source: "aligned-h1",
        isFileNameFallback: !1,
        locator: {
          kind: "aligned-lines",
          startLine: Ya(u.position, i),
          endLine: dp(f.position, i),
          titleLine: Ya(a.position, i)
        }
      };
    const d = Ya(a.position, i), h = dp(a.position, i);
    return d === h ? {
      displayText: c,
      source: "atx-h1",
      isFileNameFallback: !1,
      locator: { kind: "atx-line", startLine: d, endLine: h, titleLine: d }
    } : {
      displayText: c,
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
function gA(t, e, n = {}) {
  const r = String(e || "").trim();
  if (!r)
    return String(t || "");
  const i = String(t || ""), o = n.newline || (i.includes(`\r
`) ? `\r
` : `
`), s = i.split(/\r?\n/), l = Dk(i, "");
  if (l.locator) {
    const { kind: c, titleLine: u } = l.locator;
    return c === "setext-lines" ? s[u] = r : s[u] = `# ${r}`, s.join(o);
  }
  const { frontmatterLines: a } = Rk(i);
  if (a > 0) {
    const c = s.slice(0, a), u = s.slice(a);
    let f = 0;
    for (; f < u.length && u[f].trim() === ""; )
      f += 1;
    const d = u.slice(f);
    return [...c, "", `# ${r}`, "", ...d].join(o);
  }
  return i.trim() ? [`# ${r}`, "", ...s].join(o) : `# ${r}${o}`;
}
function qc(t) {
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
        e += qc(n.children);
        break;
      case "image":
        e += n.alt || "";
        break;
      case "emphasis":
      case "strong":
      case "delete":
        e += qc(n.children);
        break;
      case "break":
        e += " ";
        break;
    }
  return e.trim();
}
function Rk(t) {
  const e = t.split(/\r?\n/);
  if ((e[0] || "").trim() !== "---")
    return { body: t, frontmatterLines: 0 };
  for (let n = 1; n < e.length; n += 1)
    if (e[n].trim() === "---")
      return { body: e.slice(n + 1).join(`
`), frontmatterLines: n + 1 };
  return { body: t, frontmatterLines: 0 };
}
function Ya(t, e) {
  return (t && t.start ? t.start.line : 1) - 1 + e;
}
function dp(t, e) {
  return (t && t.end ? t.end.line : 1) - 1 + e;
}
function yA(t) {
  const e = String(t || "").trim().toLowerCase();
  return e === '<div align="center">' || e === '<div align="right">';
}
function kA(t) {
  return String(t || "").trim().toLowerCase() === "</div>";
}
function bA(t, e) {
  const n = [];
  return t.descendants((r, i) => {
    var o;
    return r.isText && r.text ? (n.push({ text: r.text, from: e + 1 + i, to: e + 1 + i + r.text.length }), !1) : r.isAtom || ((o = r.type) == null ? void 0 : o.name) === "hard_break" ? (n.push({ boundary: !0 }), !1) : !0;
  }), n;
}
function wA(t) {
  const e = [];
  return t.descendants((n, r) => {
    if (!n.isTextblock) return !0;
    let i = [];
    for (const o of bA(n, r))
      o.boundary ? (i.length && e.push(i), i = []) : i.push(o);
    return i.length && e.push(i), !1;
  }), e;
}
function xA(t, e, n) {
  const r = t.map((a) => a.text).join(""), i = n ? r : r.toLocaleLowerCase(), o = n ? e : e.toLocaleLowerCase(), s = [];
  let l = 0;
  for (; o && l <= i.length - o.length; ) {
    const a = i.indexOf(o, l);
    if (a < 0) break;
    let c = 0, u = null, f = null;
    for (const d of t) {
      const h = c + d.text.length;
      u === null && a >= c && a < h && (u = d.from + a - c);
      const m = a + o.length;
      if (m > c && m <= h) {
        f = d.from + m - c;
        break;
      }
      c = h;
    }
    u !== null && f !== null && u < f && s.push({ from: u, to: f }), l = a + Math.max(o.length, 1);
  }
  return s;
}
function CA(t, e, { caseSensitive: n = !1 } = {}) {
  const r = String(e || "");
  return r ? wA(t).flatMap((i) => xA(i, r, n)) : [];
}
function SA(t) {
  return [...t].sort((e, n) => n.from - e.from || n.to - e.to);
}
const El = /* @__PURE__ */ new WeakMap(), hp = ["name", "description", "trigger_keywords"], Xa = [
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
function Me(t) {
  return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function vA(t = "") {
  const e = String(t || ""), n = e.match(/^---[ \t]*(?:\r?\n)([\s\S]*?)(?:\r?\n)---[ \t]*(?:\r?\n|$)/);
  return n ? {
    raw: n[0],
    body: e.slice(n[0].length),
    fields: AA(n[1] || "")
  } : null;
}
function MA(t = "") {
  return (String(t || "").split(/[\\/]/).pop() || "").toLowerCase() === "skill.md";
}
function Al(t = "") {
  return String(t || "").trim().replace(/^['"]|['"]$/g, "").trim();
}
function TA(t = "") {
  const e = String(t || "").trim();
  if (e.startsWith("[") && e.endsWith("]"))
    return e.slice(1, -1).split(",").map(Al).filter(Boolean);
  const n = Al(e);
  return n ? [n] : [];
}
function NA(t = "") {
  const e = String(t || "").match(/(?:^|\s)Triggers:\s*([\s\S]+)$/i);
  return e ? e[1].split(",").map((n) => Al(n.replace(/\.$/, ""))).filter(Boolean) : [];
}
function EA(t = "") {
  return String(t || "").replace(/\s*Triggers:\s*[\s\S]+$/i, "").trim();
}
function AA(t = "") {
  const e = [];
  let n = -1, r = -1, i = !1;
  return String(t || "").split(/\r?\n/).forEach((o) => {
    const s = o.trim();
    if (!s) return;
    if (s.startsWith("- ")) {
      if (n >= 0) {
        const u = Al(s.slice(2));
        u && e[n].values.push(u);
      }
      return;
    }
    if (/^\s/.test(o) && r >= 0) {
      const u = s;
      if (!u) return;
      const f = e[r].values;
      f[0] = [f[0], u].filter(Boolean).join(i ? " " : `
`);
      return;
    }
    const l = s.indexOf(":");
    if (l < 0) {
      n = -1, r = -1;
      return;
    }
    const a = s.slice(0, l).trim(), c = s.slice(l + 1).trim();
    if (a) {
      if (n = e.length, c === ">" || c === "|") {
        e.push({ key: a, values: [""] }), r = n, i = c === ">";
        return;
      }
      e.push({ key: a, values: TA(c) }), r = -1;
    }
  }), e;
}
function pp(t, e) {
  return ((t == null ? void 0 : t.fields) || []).find((n) => n.key === e) || null;
}
function zo(t, e) {
  var r, i;
  const n = pp(t, e);
  if (n && e === "description")
    return (n.values || []).map(EA).filter(Boolean);
  if (n) return n.values || [];
  if (e === "trigger_keywords") {
    const o = ((i = (r = pp(t, "description")) == null ? void 0 : r.values) == null ? void 0 : i[0]) || "";
    return NA(o);
  }
  return [];
}
function IA(t, e, n) {
  if (!t) return;
  const r = n.map((o) => String(o || "").trim()).filter(Boolean), i = t.fields.find((o) => o.key === e);
  i ? i.values = r : t.fields.push({ key: e, values: r });
}
function OA(t = "") {
  return String(t || "").replace(/^---[ \t]*(?:\r?\n)?/, "").replace(/(?:\r?\n)?---[ \t]*(?:\r?\n)?$/, "").split(/\r?\n/);
}
function DA(t = "") {
  const e = [];
  let n = null;
  return OA(t).forEach((r) => {
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
function mp(t, e = []) {
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
function RA(t) {
  if (!t) return "";
  const e = /* @__PURE__ */ new Set(), n = [];
  return DA(t.raw).forEach((r) => {
    if (hp.includes(r.key)) {
      e.add(r.key), n.push(...mp(r.key, zo(t, r.key)));
      return;
    }
    n.push(...r.lines);
  }), hp.forEach((r) => {
    e.has(r) || n.push(...mp(r, zo(t, r)));
  }), `---
${n.filter((r, i, o) => {
    var s;
    return r.trim() || ((s = o[i - 1]) == null ? void 0 : s.trim());
  }).join(`
`).trim()}
---
`;
}
function LA(t) {
  if (!t) return null;
  const e = document.createElement("section");
  e.className = "markdown-frontmatter skill-frontmatter", e.setAttribute("contenteditable", "false");
  const n = zo(t, "name")[0] || "", r = zo(t, "description")[0] || "", i = zo(t, "trigger_keywords").join(`
`);
  return e.innerHTML = `
    <div class="markdown-frontmatter-label">SKILL 元信息</div>
    <label class="markdown-frontmatter-row">
      <span class="markdown-frontmatter-key">name</span>
      <input class="markdown-frontmatter-input" data-frontmatter-field="name" value="${Me(n)}" spellcheck="false" />
    </label>
    <label class="markdown-frontmatter-row">
      <span class="markdown-frontmatter-key">description</span>
      <textarea class="markdown-frontmatter-input markdown-frontmatter-textarea" data-frontmatter-field="description" rows="3">${Me(r)}</textarea>
    </label>
    <label class="markdown-frontmatter-row">
      <span class="markdown-frontmatter-key">trigger_keywords</span>
      <textarea class="markdown-frontmatter-input markdown-frontmatter-textarea" data-frontmatter-field="trigger_keywords" rows="2" placeholder="每行一个关键词，也可以用逗号分隔">${Me(i)}</textarea>
    </label>
  `, e;
}
function PA(t, e, n) {
  !t || !e || t.querySelectorAll("[data-frontmatter-field]").forEach((r) => {
    r.addEventListener("input", () => {
      const i = r.dataset.frontmatterField, o = r.value || "", s = i === "trigger_keywords" ? o.split(/[,\n]/).map((l) => l.trim()).filter(Boolean) : [o.trim()];
      IA(e, i, s), n == null || n();
    });
  });
}
function gp(t = "") {
  const e = String(t || "").trim(), n = Xa.some((r) => r.value === e);
  return !e || n ? Xa : [
    ...Xa,
    { value: e, label: e }
  ];
}
const en = {
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
}, Gn = {
  left: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M4 8h8.5M4 11.5h12M4 15h8.5" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>',
  center: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M6.2 8h7.6M4 11.5h12M6.2 15h7.6" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>',
  right: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M7.5 8H16M4 11.5h12M7.5 15H16" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>',
  coverSet: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 5.2h11a1.3 1.3 0 0 1 1.3 1.3v8a1.3 1.3 0 0 1-1.3 1.3h-11a1.3 1.3 0 0 1-1.3-1.3v-8a1.3 1.3 0 0 1 1.3-1.3Z" fill="none" stroke="currentColor" stroke-width="1.45"/><path d="M4.3 13.4 7 10.7l2.2 2 2.9-3.4 3.6 4.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.4 7.6h3.4M14.1 5.9v3.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
  coverRemove: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 5.2h11a1.3 1.3 0 0 1 1.3 1.3v8a1.3 1.3 0 0 1-1.3 1.3h-11a1.3 1.3 0 0 1-1.3-1.3v-8a1.3 1.3 0 0 1 1.3-1.3Z" fill="none" stroke="currentColor" stroke-width="1.45"/><path d="m7 9.3 6 6M13 9.3l-6 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
}, Qa = {
  small: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6.2" y="6.2" width="7.6" height="7.6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.55"/><path d="M8 11.8 9.5 10l1.1 1.2 1.2-1.5 1.5 2.1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  medium: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4.8" y="4.8" width="10.4" height="10.4" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.55"/><path d="M6.8 12.8 9 10.5l1.4 1.5 1.7-2 2 2.8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  large: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="3.5" width="13" height="13" rx="1.7" fill="none" stroke="currentColor" stroke-width="1.55"/><path d="M5.8 13.7 8.7 11l1.8 1.8 2.2-2.6 2.5 3.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
}, Lk = /(?:^|\s)nutbook-align=(left|center|right)(?=\s|$)/i, Pk = /(?:^|\s)nutbook-size=(small|medium|large)(?=\s|$)/i, nt = "portable_image", zA = Object.freeze({ small: 160, medium: 480 }), Er = "<!-- nutbook-cover -->", ut = "markdown_cover_image", ei = "aligned_text_block", Wr = Object.freeze(["center", "right"]);
function yp(t, e) {
  const n = e.nodes.heading;
  if (!n)
    return null;
  let r = null;
  return t.descendants((i, o, s) => r ? !1 : s === t ? i.type === n && i.attrs.level === 1 && i.textContent.trim() ? (r = { pos: o, node: i }, !1) : i.type.name === ei : (s.type.name === ei && i.type === n && i.attrs.level === 1 && i.textContent.trim() && (r = { pos: o, node: i }), !1)), r;
}
function ki(t) {
  return Array.from((t == null ? void 0 : t.childNodes) || []).filter((e) => e.nodeType !== Node.TEXT_NODE || String(e.textContent || "").trim() !== "");
}
function Za(t, e) {
  const n = new Set(e);
  return t.getAttributeNames().every((r) => n.has(r.toLowerCase()));
}
function kp(t, e = "src") {
  var i, o;
  const n = String(t || "").trim();
  if (!n || /[\u0000-\u001f\u007f]/.test(n) || n.startsWith("//")) return !1;
  const r = ((o = (i = n.match(/^([a-z][a-z0-9+.-]*):/i)) == null ? void 0 : i[1]) == null ? void 0 : o.toLowerCase()) || "";
  return !r || r === "http" || r === "https" ? !0 : e === "href" && r === "mailto";
}
function Gi(t) {
  if (t == null || t === "" || !/^\d+$/.test(String(t))) return null;
  const e = Number(t);
  return Number.isInteger(e) && e >= 1 && e <= 8192 ? e : null;
}
function BA(t = "") {
  const e = String(t || "");
  if (!e.trim() || typeof DOMParser != "function") return null;
  const n = new DOMParser().parseFromString(`<!doctype html><body>${e}</body>`, "text/html"), r = ki(n.body);
  if (r.length !== 1 || r[0].nodeType !== Node.ELEMENT_NODE) return null;
  let i = r[0], o = "";
  if (i.tagName === "P") {
    if (!Za(i, ["align"]) || (o = String(i.getAttribute("align") || "").toLowerCase(), !["left", "center", "right"].includes(o))) return null;
    const f = ki(i);
    if (f.length !== 1 || f[0].nodeType !== Node.ELEMENT_NODE) return null;
    i = f[0];
  }
  let s = "", l = "";
  if (i.tagName === "A") {
    if (!Za(i, ["href", "title"]) || (s = String(i.getAttribute("href") || "").trim(), l = String(i.getAttribute("title") || ""), !kp(s, "href"))) return null;
    const f = ki(i);
    if (f.length !== 1 || f[0].nodeType !== Node.ELEMENT_NODE) return null;
    i = f[0];
  }
  if (i.tagName !== "IMG" || !Za(i, ["src", "alt", "title", "width"]) || ki(i).length > 0) return null;
  const a = String(i.getAttribute("src") || "").trim();
  if (!kp(a, "src")) return null;
  const c = i.getAttribute("width"), u = Gi(c);
  return c != null && u == null ? null : {
    src: a,
    alt: String(i.getAttribute("alt") || ""),
    title: String(i.getAttribute("title") || ""),
    alignment: o,
    displayWidthPx: u,
    linkHref: s,
    linkTitle: l,
    sourceSyntax: "github-html",
    rawSource: e,
    presentationDirty: !1
  };
}
function vr(t) {
  return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function zk(t = {}) {
  const e = [
    `src="${vr(t.src)}"`,
    `alt="${vr(t.alt)}"`
  ];
  t.title && e.push(`title="${vr(t.title)}"`);
  const n = Gi(t.displayWidthPx);
  n != null && e.push(`width="${n}"`);
  const r = `<img ${e.join(" ")}>`, i = t.linkHref ? `<a href="${vr(t.linkHref)}"${t.linkTitle ? ` title="${vr(t.linkTitle)}"` : ""}>
    ${r}
  </a>` : r, o = ["left", "center", "right"].includes(t.alignment) ? t.alignment : "";
  return o ? `<p align="${o}">
  ${i}
</p>` : t.linkHref ? `<a href="${vr(t.linkHref)}"${t.linkTitle ? ` title="${vr(t.linkTitle)}"` : ""}>
  ${r}
</a>` : r;
}
function zf(t) {
  if (!t || typeof t != "object" || (Array.isArray(t.children) && t.children.forEach(zf), t.type !== "html" || typeof t.value != "string")) return;
  const e = BA(t.value);
  e && (Object.keys(t).forEach((n) => {
    n !== "position" && delete t[n];
  }), Object.assign(t, { type: "portableImage", ...e }));
}
const FA = hn("portableImageRemark", () => () => (t) => {
  zf(t);
});
function $A(t = "") {
  const e = String(t || "").trim();
  if (!e || typeof DOMParser != "function" || !/^<div(?:\s|>)/i.test(e)) return null;
  const n = new DOMParser().parseFromString(`<!doctype html><body>${e}</div></body>`, "text/html"), r = ki(n.body);
  if (r.length !== 1 || r[0].nodeType !== Node.ELEMENT_NODE) return null;
  const i = r[0];
  if (i.tagName !== "DIV" || ki(i).length > 0) return null;
  const o = i.getAttributeNames();
  if (o.length !== 1 || o[0].toLowerCase() !== "align") return null;
  const s = String(i.getAttribute("align") || "").toLowerCase();
  return Wr.includes(s) ? s : null;
}
function _A(t = "") {
  return /^<\/div\s*>$/i.test(String(t || "").trim());
}
function Bk(t) {
  return !t || typeof t != "object" ? !1 : ["html", "image", "portableImage", "alignedTextBlock"].includes(t.type) ? !0 : Array.isArray(t.children) && t.children.some(Bk);
}
function VA(t) {
  if (!Array.isArray(t == null ? void 0 : t.children)) return;
  const e = t.children;
  for (let n = 0; n <= e.length - 3; n += 1) {
    const r = e[n], i = e[n + 1], o = e[n + 2];
    if ((r == null ? void 0 : r.type) !== "html" || (o == null ? void 0 : o.type) !== "html" || !i || !["paragraph", "heading"].includes(i.type)) continue;
    const s = $A(r.value);
    !s || !_A(o.value) || Bk(i) || e.splice(n, 3, {
      type: "alignedTextBlock",
      alignment: s,
      sourceSyntax: "github-div-align",
      children: [i]
    });
  }
}
const HA = hn("alignedTextRemark", () => () => (t) => {
  VA(t);
}), jA = De(ei, () => ({
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
      return Wr.includes(e) ? { alignment: e, sourceSyntax: "github-div-align" } : !1;
    }
  }],
  toDOM: (t) => {
    const e = Wr.includes(t.attrs.alignment) ? t.attrs.alignment : "center";
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
    match: (t) => t.type.name === ei,
    runner: (t, e) => {
      const n = String(e.attrs.alignment || "").toLowerCase();
      if (!Wr.includes(n) || e.childCount !== 1)
        throw new Error("Invalid aligned text block");
      t.addNode("html", void 0, `<div align="${n}">`).next(e.content).addNode("html", void 0, "</div>");
    }
  }
})), WA = De(nt, () => ({
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
        displayWidthPx: Gi(t.dataset.nutbookDisplayWidth),
        linkHref: (n == null ? void 0 : n.getAttribute("href")) || "",
        linkTitle: (n == null ? void 0 : n.getAttribute("title")) || "",
        sourceSyntax: "github-html",
        rawSource: t.dataset.nutbookRawSource || "",
        presentationDirty: t.dataset.nutbookPresentationDirty === "true"
      };
    }
  }],
  toDOM: (t) => {
    const e = ["left", "center", "right"].includes(t.attrs.alignment) ? t.attrs.alignment : "", n = Gi(t.attrs.displayWidthPx), r = {
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
    match: (t) => t.type.name === nt,
    runner: (t, e) => {
      const n = !e.attrs.presentationDirty && e.attrs.rawSource ? e.attrs.rawSource : zk(e.attrs);
      t.addNode("html", void 0, n);
    }
  }
}));
function qA(t) {
  return (t == null ? void 0 : t.type) === "html" && String((t == null ? void 0 : t.value) || "").trim() === Er;
}
function ec(t, e) {
  var i, o, s, l;
  const n = (o = (i = e == null ? void 0 : e.position) == null ? void 0 : i.start) == null ? void 0 : o.offset, r = (l = (s = e == null ? void 0 : e.position) == null ? void 0 : s.end) == null ? void 0 : l.offset;
  return t && Number.isInteger(n) && Number.isInteger(r) && r > n && r <= t.length ? t.slice(n, r) : null;
}
function KA(t, e) {
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
      rawSource: ec(e, t) || t.rawSource || ""
    };
  if (t.type !== "paragraph" || !Array.isArray(t.children) || t.children.length !== 1) return null;
  const n = t.children[0];
  if ((n == null ? void 0 : n.type) === "image")
    return {
      nodeKind: "image",
      src: n.url || "",
      alt: n.alt || "",
      title: n.title || "",
      alignment: ti(n.title || ""),
      displayWidthPx: null,
      linkHref: "",
      linkTitle: "",
      rawSource: ec(e, t) || ""
    };
  if ((n == null ? void 0 : n.type) === "link" && Array.isArray(n.children) && n.children.length === 1 && ((r = n.children[0]) == null ? void 0 : r.type) === "image") {
    const i = n.children[0];
    return {
      nodeKind: "linked-image",
      src: i.url || "",
      alt: i.alt || "",
      title: i.title || "",
      alignment: ti(i.title || ""),
      displayWidthPx: null,
      linkHref: n.url || "",
      linkTitle: n.title || "",
      rawSource: ec(e, t) || ""
    };
  }
  return null;
}
function Fk(t, e) {
  const n = t == null ? void 0 : t.children;
  if (!Array.isArray(n)) return [];
  const r = [];
  for (let i = 0; i < n.length; i += 1) {
    const o = n[i];
    if (!qA(o)) continue;
    const s = KA(n[i + 1], e);
    s && r.push({ markerIndex: i, blockIndex: i + 1, block: s });
  }
  return r;
}
function UA(t, e) {
  const n = [];
  if (!Array.isArray(t == null ? void 0 : t.children)) return n;
  const r = Fk(t, e);
  if (r.length > 1)
    return n.push({ kind: "duplicate", count: r.length }), n;
  if (r.length !== 1) return n;
  const { markerIndex: i, blockIndex: o, block: s } = r[0];
  return t.children.splice(i, 2, {
    type: "markdownCoverImage",
    ...s,
    markerRaw: Er,
    presentationDirty: !1
  }), n;
}
function JA(t) {
  const e = Xc(String(t || ""));
  zf(e);
  const n = Fk(e, null).length;
  return { count: n, duplicate: n > 1 };
}
function GA(t) {
  return String(t || "").replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\n/g, " ");
}
function bp(t) {
  return `"${String(t || "").replace(/"/g, '\\"')}"`;
}
function wp(t) {
  const e = String(t || "");
  return e && (/[\s<>]/.test(e) ? `<${e.replace(/</g, "\\<").replace(/>/g, "\\>").replace(/\n/g, " ")}>` : e.replace(/[()]/g, (n) => `\\${n}`));
}
function YA(t = {}) {
  if (t.nodeKind === "portable-image") return zk(t);
  const e = ["left", "center", "right"].includes(t.alignment) ? `nutbook-align=${t.alignment}` : "", n = [t.title, e].filter(Boolean), r = n.length ? ` ${bp(n.join(" "))}` : "", i = `![${GA(t.alt)}](${wp(t.src)}${r})`;
  if (t.nodeKind === "linked-image") {
    const o = t.linkTitle ? ` ${bp(t.linkTitle)}` : "";
    return `[${i}](${wp(t.linkHref)}${o})`;
  }
  return i;
}
const XA = De(ut, () => ({
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
    markerRaw: { default: Er, validate: "string" },
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
        displayWidthPx: Gi(t.dataset.nutbookDisplayWidth),
        linkHref: (n == null ? void 0 : n.getAttribute("href")) || "",
        linkTitle: (n == null ? void 0 : n.getAttribute("title")) || "",
        rawSource: t.dataset.nutbookRawSource || "",
        markerRaw: Er,
        presentationDirty: t.dataset.nutbookPresentationDirty === "true"
      };
    }
  }],
  toDOM: (t) => {
    const e = t.attrs, n = ["left", "center", "right"].includes(e.alignment) ? e.alignment : "", r = Gi(e.displayWidthPx), i = {
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
    const o = ["img", i], s = e.linkHref ? ["a", { href: e.linkHref, title: e.linkTitle || null }, o] : o, l = { class: "markdown-cover-media", "data-cover-badge": QA() };
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
        markerRaw: Er,
        presentationDirty: !1
      });
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === ut,
    runner: (t, e) => {
      const n = e.attrs, r = !n.presentationDirty && n.rawSource ? n.rawSource : YA(n);
      t.addNode("html", void 0, `${Er}
${r}`);
    }
  }
}));
function QA() {
  var e, n;
  const t = typeof window < "u" ? window.NutbookI18n : null;
  return ((n = t == null ? void 0 : t.lookup) == null ? void 0 : n.call(t, "markdown.coverBadge", (e = t.currentLanguage) == null ? void 0 : e.call(t))) || "封面";
}
function mo(t) {
  var n, r;
  let e = null;
  return (r = (n = t == null ? void 0 : t.doc) == null ? void 0 : n.descendants) == null || r.call(n, (i, o) => i.type.name === ut ? (e = { node: i, pos: o }, !1) : !0), e;
}
function xp(t, e) {
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
function Cp(t, e, n) {
  var a, c;
  if (!e) return;
  const r = (a = t == null ? void 0 : t.nodeDOM) == null ? void 0 : a.call(t, n), i = r instanceof Element ? r.matches("img") ? r : r.querySelector("img") : null;
  if (!i) return;
  const o = i.getBoundingClientRect(), s = o.left - e.left, l = o.top - e.top;
  if ((c = e.scrollParent) != null && c.isConnected) {
    Math.abs(s) > 0.5 && (e.scrollParent.scrollLeft += s), Math.abs(l) > 0.5 && (e.scrollParent.scrollTop += l);
    return;
  }
  (Math.abs(s) > 0.5 || Math.abs(l) > 0.5) && window.scrollTo(e.windowX + s, e.windowY + l);
}
function Sp(t) {
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
function vp(t) {
  const e = t.attrs.title || "";
  return {
    nodeKind: "image",
    src: t.attrs.src || "",
    alt: t.attrs.alt || "",
    title: e,
    alignment: ti(e),
    displayWidthPx: null,
    linkHref: "",
    linkTitle: "",
    rawSource: ""
  };
}
function Kc(t) {
  if (!(t != null && t.marks)) return null;
  for (let e = 0; e < t.marks.length; e += 1)
    if (t.marks[e].type.name === "link") return t.marks[e];
  return null;
}
function Mp(t, e) {
  const n = t.attrs.title || "";
  return {
    nodeKind: "linked-image",
    src: t.attrs.src || "",
    alt: t.attrs.alt || "",
    title: n,
    alignment: ti(n),
    displayWidthPx: null,
    linkHref: (e == null ? void 0 : e.attrs.href) || "",
    linkTitle: (e == null ? void 0 : e.attrs.title) || "",
    rawSource: ""
  };
}
function Js(t, e) {
  return t.nodes[ut].create({
    ...e,
    markerRaw: Er,
    presentationDirty: e.presentationDirty ?? !1
  });
}
function go(t, e) {
  const n = t.nodes.image, r = t.nodes.paragraph;
  if (e.nodeKind === "portable-image")
    return t.nodes[nt].create({ ...e, presentationDirty: !1 });
  const i = n.create({ src: e.src, alt: e.alt, title: e.title || null });
  if (e.nodeKind === "linked-image") {
    const o = t.marks.link;
    if (o)
      return r.create(null, i.mark([o.create({ href: e.linkHref, title: e.linkTitle || null })]));
  }
  return r.create(null, i);
}
function ZA(t, e) {
  const n = t.schema, r = n.nodes.image, i = n.nodes[nt], o = n.nodes.paragraph;
  if (!r || !o || !i) return null;
  const s = Math.max(0, Math.min(Number(e) || 0, t.doc.content.size)), l = t.doc.nodeAt(s);
  if (l) {
    if (l.type === i)
      return { blockStart: s, blockEnd: s + l.nodeSize, attrs: Sp(l) };
    if (l.type === o && l.childCount === 1) {
      const c = l.firstChild;
      if (c.type === r) {
        const u = Kc(c);
        return {
          blockStart: s,
          blockEnd: s + l.nodeSize,
          attrs: u ? Mp(c, u) : vp(c)
        };
      }
    }
  }
  let a = t.doc.resolve(s);
  for (let c = a.depth; c >= 1; c -= 1) {
    const u = a.node(c);
    if (u.type === i)
      return {
        blockStart: a.before(c),
        blockEnd: a.after(c),
        attrs: Sp(u)
      };
    if (u.type === o && u.childCount === 1) {
      const f = u.firstChild;
      if (f.type === r) {
        const d = Kc(f);
        return {
          blockStart: a.before(c),
          blockEnd: a.after(c),
          attrs: d ? Mp(f, d) : vp(f)
        };
      }
      return null;
    }
  }
  return null;
}
function ti(t = "") {
  var n;
  const e = String(t || "").match(Lk);
  return ((n = e == null ? void 0 : e[1]) == null ? void 0 : n.toLowerCase()) || "";
}
function Uc(t = "") {
  var n;
  const e = String(t || "").match(Pk);
  return ((n = e == null ? void 0 : e[1]) == null ? void 0 : n.toLowerCase()) || "large";
}
function eI(t = "") {
  return String(t || "").replace(Lk, " ").replace(Pk, " ").replace(/\s+/g, " ").trim();
}
function tI(t) {
  if (!t) return "";
  if (t.dataset.nutbookPortableImage === "true")
    return t.dataset.nutbookImageAlign || "";
  const e = ti(t.getAttribute("title") || ""), n = Uc(t.getAttribute("title") || "");
  return ["left", "center", "right"].forEach((r) => {
    t.classList.toggle(`nutbook-image-align-${r}`, e === r);
  }), ["small", "medium", "large"].forEach((r) => {
    t.classList.toggle(`nutbook-image-size-${r}`, n === r);
  }), t.dataset.nutbookImageAlign = e, t.dataset.nutbookImageSize = n, e;
}
function $k(t) {
  const e = El.get(t);
  e && (e.destroy(), El.delete(t));
}
function Tp(t) {
  return String(t || "").replace(/\s+/g, " ").trim();
}
function Bf(t) {
  var n, r;
  const e = t == null ? void 0 : t.$from;
  if (!e) return !1;
  for (let i = e.depth; i > 0; i -= 1) {
    const o = (r = (n = e.node(i)) == null ? void 0 : n.type) == null ? void 0 : r.name;
    if (o === "list_item" || o === "listItem") return !0;
  }
  return !1;
}
function nI(t) {
  var r;
  const { selection: e } = t;
  if (!(e != null && e.empty)) return !1;
  const { $from: n } = e;
  return !((r = n.parent) != null && r.isTextblock) || n.parentOffset !== 0 ? !1 : Bf(e);
}
function rI(t, e, n) {
  if (!nI(t)) return !1;
  const r = t.schema.nodes.list_item || t.schema.nodes.listItem;
  return r ? ry(r)(t, e, n) : !1;
}
function iI() {
  return new Ie({
    props: {
      handlePaste(t, e) {
        var o, s;
        const n = (o = e.clipboardData) == null ? void 0 : o.getData("text/plain"), r = ((s = e.clipboardData) == null ? void 0 : s.getData("text/html")) || "";
        return !n || !r || Bf(t.state.selection) || !(/<(ol|ul|li)\b/i.test(r) || /data-list-type=/i.test(r)) ? !1 : (e.preventDefault(), t.dispatch(t.state.tr.insertText(n).scrollIntoView()), !0);
      }
    }
  });
}
function Np(t) {
  var n;
  const e = /* @__PURE__ */ new Set();
  return (n = t == null ? void 0 : t.descendants) == null || n.call(t, (r) => {
    var i, o, s, l;
    return ["image", nt].includes((i = r.type) == null ? void 0 : i.name) && ((o = r.attrs) != null && o.src) && e.add(String(r.attrs.src)), ((s = r.type) == null ? void 0 : s.name) === ut && ((l = r.attrs) != null && l.src) && e.add(String(r.attrs.src)), !0;
  }), e;
}
function oI(t) {
  return typeof t != "function" ? null : new Ie({
    view(e) {
      let n = Np(e.state.doc), r = null;
      const i = () => {
        r = null;
        const s = Np(e.state.doc);
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
function Ep(t, e = !1) {
  const n = (o) => {
    const s = o.dataset.nutbookOriginalSrc || o.getAttribute("src") || "";
    if (typeof t == "function") {
      const l = t(s);
      l && l !== o.getAttribute("src") && (o.dataset.nutbookOriginalSrc = s, o.setAttribute("src", l));
    }
    tI(o);
  }, r = (o) => {
    o.querySelectorAll("img[src]").forEach(n);
  }, i = (o) => {
    if (!Array.isArray(o)) return o;
    const s = o.map((l) => Array.isArray(l) ? i(l) : l);
    if (s[0] === "img" && s[1] && typeof s[1] == "object") {
      const l = s[1].src || "";
      s[1] = { ...s[1], src: (t == null ? void 0 : t(l)) || "data:image/png;base64,", "data-nutbook-original-src": l };
    }
    return s;
  };
  return new Ie({
    // Publishing images must not briefly request an unchecked URL before the
    // observer runs. Resolve their DOM spec before any src attribute is set.
    props: e ? { nodeViews: Object.fromEntries(["image", nt, ut].map((o) => [o, (s) => ({ dom: ni.renderSpec(document, i(s.type.spec.toDOM(s))).dom })])) } : {},
    view(o) {
      const s = new MutationObserver((c) => {
        c.forEach((u) => {
          u.addedNodes.forEach((f) => {
            var d, h;
            f.nodeType === Node.ELEMENT_NODE && ((d = f.matches) != null && d.call(f, "img[src]") && n(f), (h = f.querySelectorAll) == null || h.call(f, "img[src]").forEach(n));
          });
        });
      });
      s.observe(o.dom, { childList: !0, subtree: !0 });
      const l = requestAnimationFrame(() => r(o.dom)), a = () => r(o.dom);
      return o.dom.addEventListener("nutbook:normalize-local-images", a), {
        destroy() {
          s.disconnect(), cancelAnimationFrame(l), o.dom.removeEventListener("nutbook:normalize-local-images", a);
        }
      };
    }
  });
}
function Ap(t) {
  const e = [];
  let n = !1, r = 0;
  const i = (o, s, l) => {
    o.forEach((a, c) => {
      const u = s + c + 1, f = l || a.type.name === ei;
      if (a.type.name === "heading") {
        const d = u + a.nodeSize;
        Number(a.attrs.level) === 1 && !n ? (n = !0, f || e.push(Le.node(u, d, { class: "markdown-document-title-source" }))) : (e.push(Le.node(u, d, { "data-markdown-outline-index": String(r) })), r += 1);
        return;
      }
      a.childCount && i(a, u, f);
    });
  };
  return i(t, -1, !1), e;
}
function Ip() {
  return new Ie({
    state: {
      init: (t, e) => Te.create(e.doc, Ap(e.doc)),
      apply: (t, e) => t.docChanged ? Te.create(t.doc, Ap(t.doc)) : e
    },
    props: {
      decorations(t) {
        return this.getState(t);
      }
    }
  });
}
function Op(t) {
  var n, r;
  if (!t) return !1;
  if (["image", nt].includes((n = t.type) == null ? void 0 : n.name)) return !0;
  let e = !1;
  return (r = t.descendants) == null || r.call(t, (i) => {
    var o;
    return ["image", nt].includes((o = i.type) == null ? void 0 : o.name) ? (e = !0, !1) : !e;
  }), e;
}
function Dp(t, e = t == null ? void 0 : t.selection) {
  if (!t || !e || e.empty || e.from >= e.to)
    return { supported: !1, targets: [], alignment: "" };
  const n = t.schema.nodes.paragraph, r = t.schema.nodes.heading, i = t.schema.nodes[ei];
  if (!n || !r || !i)
    return { supported: !1, targets: [], alignment: "" };
  const o = [];
  let s = !1;
  if (t.doc.forEach((c, u) => {
    const f = u + (c.type === i ? 2 : 1);
    if (!(e.from >= u + c.nodeSize || e.to <= f)) {
      if (c.type === n || c.type === r) {
        if (Op(c)) {
          s = !0;
          return;
        }
        o.push({ pos: u, node: c, alignment: "left" });
        return;
      }
      if (c.type === i) {
        const d = c.childCount === 1 ? c.child(0) : null;
        if (!d || ![n, r].includes(d.type) || Op(d)) {
          s = !0;
          return;
        }
        const h = Wr.includes(c.attrs.alignment) ? c.attrs.alignment : "";
        if (!h) {
          s = !0;
          return;
        }
        o.push({ pos: u, node: c, alignment: h });
        return;
      }
      s = !0;
    }
  }), s || !o.length)
    return { supported: !1, targets: [], alignment: "" };
  const l = o[0].alignment, a = o.every((c) => c.alignment === l) ? l : "";
  return { supported: !0, targets: o, alignment: a };
}
async function sI({ root: t, markdown: e = "", fileName: n = "", language: r = null, onChange: i = null, onEdit: o = null, tableToolsEnabled: s = !0, resolveImageSrc: l = null, isolateImages: a = !1, onInsertImageAsset: c = null, onPasteImageAsset: u = null, onImagePasteStatus: f = null, onInsertCoverAsset: d = null, onReleaseCoverAsset: h = null, onValidateCoverAsset: m = null, onRemoveImageAsset: b = null, onImageSizeError: C = null, onCoverChange: x = null, readOnly: L = !1 }) {
  if (!t)
    throw new Error("Milkdown root is required");
  const I = window.NutbookI18n, D = (p) => {
    var g, y;
    return ((y = I == null ? void 0 : I.lookup) == null ? void 0 : y.call(I, p, r || ((g = I.currentLanguage) == null ? void 0 : g.call(I)))) ?? p;
  };
  $k(t), t.innerHTML = "";
  const j = vA(e), A = MA(n) ? j : null, _ = j ? j.body : e, J = JA(_);
  if (J.duplicate)
    throw new Error(
      `document declares ${J.count} valid \`<!-- nutbook-cover -->\` markers; only one cover identity is allowed — repair the source before editing`
    );
  const Y = document.createElement("div");
  Y.className = "milkdown-editor-body";
  const O = LA(A);
  O && (t.appendChild(O), L && O.querySelectorAll("input,textarea").forEach((p) => {
    p.disabled = !0, p.tabIndex = -1;
  })), t.appendChild(Y), L && (Y.setAttribute("contenteditable", "false"), Y.setAttribute("spellcheck", "false"));
  let U = e, K = !1, be = !1, G = !1, ce = !1, ne = null, Ee = null, lt = !1, vt = null, S = null, Se = null, Ke = null, v = !1, le = null, at = null, Oe = !1, Lt = !1, Ue = null, Pe = null, de = null, Pt = null, ke = null, Mt = null, gn = null, _e = null, _n = e, Je = !1;
  const As = /* @__PURE__ */ new Set(), Is = (p) => typeof p == "string" && p && !/^(https?:|data:|file:|#|\/)/i.test(p);
  function ii(p) {
    var g, y;
    (y = (g = p == null ? void 0 : p.doc) == null ? void 0 : g.descendants) == null || y.call(g, (k) => {
      var M, T;
      const w = ((M = k.attrs) == null ? void 0 : M.src) ?? ((T = k.attrs) == null ? void 0 : T.url);
      return Is(w) && As.add(w), !0;
    });
  }
  const Ul = new Ie({
    state: {
      init: (p, g) => (ii(g), null),
      apply: (p, g, y, k) => (p.docChanged && ii(k), null)
    }
  });
  let yn = !1, Vn = null;
  const br = new Ie({
    state: {
      init: () => null,
      apply(p, g) {
        const y = p.getMeta(br);
        return y !== void 0 ? y : g == null ? null : p.mapping.map(g, 1);
      }
    },
    props: {
      decorations(p) {
        if (!yn) return null;
        const g = br.getState(p);
        return g == null ? null : Te.create(p.doc, [Le.widget(g, () => {
          const y = document.createElement("span");
          return y.className = "markdown-image-paste-progress", y.setAttribute("role", "status"), y.textContent = r === "en-US" ? "Importing image…" : "正在处理图片…", y;
        }, { side: 1, key: "image-paste-progress" })]);
      },
      handlePaste(p, g) {
        if (!u || L || Je || p.composing) return !1;
        const y = g.clipboardData, k = [...(y == null ? void 0 : y.items) || []].filter((V) => V.kind === "file" && V.type.startsWith("image/")).map((V) => V.getAsFile()).filter(Boolean), w = ((y == null ? void 0 : y.getData("text/plain")) || "").trim(), M = w.match(/^!\[([^\]\n]*)\]\((https?:\/\/[^\s]+)\)$/i);
        let T = (M == null ? void 0 : M[2]) || (/^https?:\/\/\S+$/i.test(w) && /\.(png|jpe?g|webp)(?:[?#]|$)/i.test(w) ? w : null);
        if (!k.length && !T && !w) {
          const V = (y == null ? void 0 : y.getData("text/html")) || "";
          if (V) {
            const Q = new DOMParser().parseFromString(V, "text/html"), ue = Q.querySelectorAll("img");
            ue.length === 1 && !Q.body.textContent.trim() && /^https?:\/\//i.test(ue[0].getAttribute("src") || "") && (T = ue[0].getAttribute("src"));
          }
        }
        if (!k.length && !T) return !1;
        if (g.preventDefault(), yn || p.state.selection.$from.parent.type.spec.code)
          return f == null || f("error", r === "en-US" ? "Finish the current image import or leave the code block first." : "请等待当前图片处理完成，或先移出代码块。"), !0;
        const P = p.state.doc, F = p.state.selection.getBookmark();
        return yn = !0, Vn = new AbortController(), p.dispatch(p.state.tr.setMeta(br, p.state.selection.from).setMeta("addToHistory", !1)), f == null || f("busy"), (async () => {
          try {
            const V = [];
            for (const he of k.length ? k : [{ src: T, fileName: (M == null ? void 0 : M[1]) || "image" }]) {
              const Ce = await u(he, { signal: Vn.signal });
              if (!(Ce != null && Ce.relativePath)) throw new Error(r === "en-US" ? "Image import cancelled." : "图片未插入。");
              V.push(Ce);
            }
            if (G || Je || !t.isConnected) return;
            if (!p.state.doc.eq(P) || p.composing) throw new Error(r === "en-US" ? "Content changed. Paste the image again." : "内容已变化，请在需要的位置重新粘贴图片。");
            const Q = F.resolve(p.state.doc), ue = V.map((he) => p.state.schema.nodes.image.create({ src: he.relativePath, alt: Ps(he.fileName || he.relativePath), title: "" }));
            let me = p.state.tr.setSelection(Q);
            const ve = ue.length === 1 ? ue[0] : p.state.schema.nodes.paragraph.create(null, ue);
            me = me.replaceSelectionWith(ve), p.dispatch(wn(me.scrollIntoView())), Be(), Rs(), f == null || f("done");
          } catch (V) {
            G || f == null || f("error", String(V.message || V));
          } finally {
            yn = !1, Vn = null, G || p.dispatch(p.state.tr.setMeta(br, null).setMeta("addToHistory", !1));
          }
        })(), !0;
      }
    }
  }), Jl = new Ie({
    filterTransaction: () => !Je
  });
  let E = null, B = null, X = null, ae = null, W = { query: "", caseSensitive: !1, current: 0, matches: [] }, Ge = !1, Tt = null;
  const zt = "nutbook.markdownFindHistory.v1", Hn = () => {
    var p;
    try {
      const g = JSON.parse(((p = window.localStorage) == null ? void 0 : p.getItem(zt)) || "[]");
      return Array.isArray(g) ? g.filter((y) => typeof y == "string" && y.trim()).slice(0, 3) : [];
    } catch {
      return [];
    }
  }, wr = (p) => {
    var y;
    const g = String(p || "").trim();
    if (g)
      try {
        const k = [g, ...Hn().filter((w) => w.toLocaleLowerCase() !== g.toLocaleLowerCase())].slice(0, 3);
        (y = window.localStorage) == null || y.setItem(zt, JSON.stringify(k));
      } catch {
      }
  };
  let ze = [];
  const jn = hn("coverImageRemark", () => () => (p) => {
    ze = UA(p, _);
  }), et = /* @__PURE__ */ new Map(), Be = () => {
    K || o == null || o(), K = !0, Oe && kn();
  };
  L || PA(O, A, () => {
    Be(), be = !0, Gl(80);
  });
  const _k = [], Os = new Ie({
    state: {
      init: (p, g) => Ff(g.doc),
      apply: (p, g, y, k) => p.docChanged || p.getMeta(Os) ? Ff(k.doc) : g.map(p.mapping, p.doc)
    },
    props: { decorations: (p) => Os.getState(p) }
  });
  function Ff(p) {
    W.matches = CA(p, W.query, { caseSensitive: W.caseSensitive }), W.current >= W.matches.length && (W.current = 0);
    const g = W.matches.map((y, k) => Le.inline(
      y.from,
      y.to,
      { class: k === W.current ? "nutbook-find-current" : "nutbook-find-match" }
    ));
    return Te.create(p, g);
  }
  const $f = (p) => {
    p.isComposing || p.key === "Process" || Je || !(p.metaKey || p.ctrlKey) || p.altKey || p.key.toLowerCase() !== "z" || !oe() || !na(p.shiftKey ? yi : Po) || (p.preventDefault(), p.stopPropagation());
  };
  L || t.addEventListener("keydown", $f, !0);
  const _f = Qv.make().config((p) => {
    p.set(ll, Y), p.set(nl, _), L ? (p.update(sl, (g) => ({
      ...g,
      editable: () => !1
    })), p.update(an, () => [
      Ep(l, a),
      Ip()
    ].filter(Boolean))) : (p.update(an, (g) => [
      // R4-1：事务级同步追踪（真实 PM 事务入口，先于一切早退）。
      Ul,
      // R4-2：锁定期间的事务门（不替换 bound dispatch）。
      Jl,
      og({
        // R3-1：锁定期间撤销/重做命令零效果（keydown 在 PM editHandlers
        // 已被 editable 关断，这里兜底 keymap 直连路径）。
        "Mod-z": (y, k, w) => Je ? !1 : Po(y, k, w),
        "Shift-Mod-z": (y, k, w) => Je ? !1 : yi(y, k, w),
        "Mod-y": (y, k, w) => Je ? !1 : yi(y, k, w),
        Backspace: rI
      }),
      br,
      iI(),
      oI(b),
      Ep(l, a),
      Ip(),
      Os,
      ...g
    ].filter(Boolean)), p.update(jc, (g) => g.updated(() => {
      ce && (be = !0, Gl());
    })));
  }).use(HA).use(FA).use(jn).use(DM).use(OE).use(jA).use(WA).use(XA), ct = await (L ? _f.use(Wc) : _f.use(_E).use(Wc)).create();
  ct.action((p) => {
    var g;
    ii((g = p.get(Re)) == null ? void 0 : g.state);
  });
  const Ds = () => G ? U : ct.action((p) => {
    const g = p.get(Re), k = p.get(Lo)(g.state.doc), w = A ? RA(A) : (j == null ? void 0 : j.raw) || "";
    return U = j ? `${w}${k}` : k, U;
  }), Vf = Ds();
  _n = Vf, queueMicrotask(() => {
    G || (ce = !0, !L && (vb(), id(), sb(), mb(), rb(), He(), je(), Ve(), Bt()));
  });
  function oe() {
    return G ? null : ct.action((p) => p.get(Re));
  }
  function Wn() {
    var p;
    return !!((p = oe()) != null && p.composing);
  }
  function Rs() {
    if (_e = null, G || !ce) return;
    const p = oe();
    if (p != null && p.composing) {
      Gl(180);
      return;
    }
    const g = Ds();
    K || (o == null || o(), K = !0), g !== _n && (_n = g, i == null || i(g));
  }
  function Gl(p = 260) {
    ce && (_e && clearTimeout(_e), _e = window.setTimeout(Rs, p));
  }
  function qn({ scroll: p = !1 } = {}) {
    const g = oe();
    if (!g) return;
    g.dispatch(g.state.tr.setMeta(Os, !0)), Vk(), oo();
    const y = W.matches[W.current];
    p && y && (Ge = !0, g.dispatch(g.state.tr.setSelection(ee.create(g.state.doc, y.from, y.to)).scrollIntoView()));
  }
  function Vk() {
    if (!E) return;
    const p = E.querySelector("[data-find-count]");
    p && (p.textContent = `${W.matches.length ? W.current + 1 : 0}/${W.matches.length}`);
    const g = E.querySelector("[data-find-case]");
    g && g.classList.toggle("active", W.caseSensitive);
    const y = E.querySelector("[data-find-history]");
    if (y) {
      const k = Hn();
      y.hidden = !k.length, y.innerHTML = k.length ? `<span class="markdown-find-history-label">${Me(D("markdown.recentFinds"))}</span>${k.map((w, M) => `<button type="button" data-find-history-item="${M}" data-i18n-skip title="${Me(w)}">${Me(w)}</button>`).join("")}` : "", y.querySelectorAll("[data-find-history-item]").forEach((w) => w.addEventListener("click", () => {
        const M = k[Number(w.dataset.findHistoryItem)] || "";
        !M || !B || (B.value = M, W.query = M, W.current = 0, qn({ scroll: !0 }));
      }));
    }
  }
  function Hf() {
    if (!E) return;
    const g = (t.closest(".viewer-body") || t).getBoundingClientRect();
    E.style.top = `${Math.max(8, g.top + 12)}px`, E.style.right = `${Math.max(12, window.innerWidth - g.right + 12)}px`;
  }
  function oo() {
    !E || Tt || (Tt = requestAnimationFrame(() => {
      Tt = null, Hf();
    }));
  }
  function Yl() {
    var g;
    if (!E) return;
    const p = oe();
    p && !p.state.selection.empty && p.dispatch(p.state.tr.setSelection(ee.create(p.state.doc, p.state.selection.from))), wr(W.query), Ge = !1, W = { query: "", caseSensitive: !1, current: 0, matches: [] }, E.remove(), E = null, B = null, X = null, ae = null, qn(), (g = oe()) == null || g.focus();
  }
  function Xl(p) {
    W.matches.length && (W.current = (W.current + p + W.matches.length) % W.matches.length, qn({ scroll: !0 }));
  }
  function Hk() {
    const p = oe(), g = W.matches[W.current];
    if (!p || !g) return;
    const y = p.state.doc.resolve(g.from).marks(), k = p.state.tr.replaceWith(g.from, g.to, p.state.schema.text((X == null ? void 0 : X.value) || "", y));
    p.dispatch(k), Be(), qn({ scroll: !0 });
  }
  function jk() {
    const p = oe();
    if (!p || !W.matches.length) return;
    const g = (X == null ? void 0 : X.value) || "";
    let y = p.state.tr;
    for (const k of SA(W.matches)) {
      const w = p.state.doc.resolve(k.from).marks();
      y = y.replaceWith(k.from, k.to, p.state.schema.text(g, w));
    }
    p.dispatch(wn(y)), Be(), qn({ scroll: !0 });
  }
  function jf({ showReplace: p = !1, query: g = null, focus: y = !0 } = {}) {
    if (!(L || G)) {
      if (!E) {
        E = document.createElement("div"), E.className = "markdown-find-panel", E.setAttribute("role", "dialog"), E.setAttribute("aria-label", D("markdown.find")), E.innerHTML = `
        <div class="markdown-find-row">
          <input data-find-query type="search" autocomplete="off" placeholder="${Me(D("markdown.findPlaceholder"))}" aria-label="${Me(D("markdown.find"))}" />
          <button type="button" data-find-case aria-label="${Me(D("markdown.matchCase"))}">Aa<span class="markdown-find-tooltip">${Me(D("markdown.matchCase"))}</span></button>
          <span data-find-count aria-live="polite">0/0</span>
          <button type="button" data-find-prev aria-label="${Me(D("markdown.previousMatch"))}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 12 5-5 5 5"/></svg><span class="markdown-find-tooltip">${Me(D("markdown.previousMatch"))}</span></button>
          <button type="button" data-find-next aria-label="${Me(D("markdown.nextMatch"))}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 8 5 5 5-5"/></svg><span class="markdown-find-tooltip">${Me(D("markdown.nextMatch"))}</span></button>
          <button type="button" data-find-expand aria-label="${Me(D("markdown.showReplace"))}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6h10m-4-3 4 3-4 3M17 14H7m4-3-4 3 4 3"/></svg><span class="markdown-find-tooltip">${Me(D("markdown.showReplace"))}</span></button>
          <button type="button" data-find-close aria-label="${Me(D("markdown.closeFind"))}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 6 8 8m0-8-8 8"/></svg><span class="markdown-find-tooltip">${Me(D("markdown.closeFind"))}</span></button>
        </div>
        <div class="markdown-find-row markdown-find-replace" hidden>
          <input data-replace-query autocomplete="off" placeholder="${Me(D("markdown.replacePlaceholder"))}" aria-label="${Me(D("markdown.replace"))}" />
          <button type="button" data-find-replace aria-label="${Me(D("markdown.replace"))}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h10m-4-4 4 4-4 4"/><path d="M3 5h4M3 15h4"/></svg><span class="markdown-find-tooltip">${Me(D("markdown.replace"))}</span></button>
          <button type="button" data-find-replace-all aria-label="${Me(D("markdown.replaceAll"))}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6h10m-4-3 4 3-4 3M3 14h10m-4-3 4 3-4 3"/><path d="M3 10h4"/></svg><span class="markdown-find-tooltip">${Me(D("markdown.replaceAll"))}</span></button>
        </div>
        <div class="markdown-find-history" data-find-history data-i18n-skip hidden></div>`, t.appendChild(E), B = E.querySelector("[data-find-query]"), X = E.querySelector("[data-replace-query]"), ae = E.querySelector(".markdown-find-replace"), B.addEventListener("input", () => {
          W.query = B.value, W.current = 0, qn({ scroll: !0 });
        }), E.querySelector("[data-find-case]").addEventListener("click", () => {
          W.caseSensitive = !W.caseSensitive, W.current = 0, qn({ scroll: !0 });
        }), E.querySelector("[data-find-prev]").addEventListener("click", () => Xl(-1)), E.querySelector("[data-find-next]").addEventListener("click", () => Xl(1));
        let k = null;
        E.querySelector("[data-find-expand]").addEventListener("click", (w) => {
          ae.hidden = !ae.hidden, k = { x: w.clientX, y: w.clientY }, E.classList.add("suppress-find-tooltips"), ae.hidden || X.focus();
        }), E.addEventListener("pointermove", (w) => {
          k && Math.hypot(w.clientX - k.x, w.clientY - k.y) > 4 && (k = null, E.classList.remove("suppress-find-tooltips"));
        }), E.addEventListener("pointerleave", () => {
          k = null, E.classList.remove("suppress-find-tooltips");
        }), E.querySelector("[data-find-close]").addEventListener("click", Yl), E.querySelector("[data-find-replace]").addEventListener("click", Hk), E.querySelector("[data-find-replace-all]").addEventListener("click", jk), E.addEventListener("keydown", (w) => {
          w.isComposing || w.keyCode === 229 || (w.key === "Escape" && (w.preventDefault(), w.stopPropagation(), Yl()), w.key === "Enter" && (w.preventDefault(), w.stopPropagation(), Xl(w.shiftKey ? -1 : 1)));
        });
      }
      g !== null && B && (B.value = g, W.query = g, W.current = 0), p && ae && (ae.hidden = !1), qn(), Hf(), y && (B == null || B.focus());
    }
  }
  const Wf = (p) => {
    L || p.isComposing || p.keyCode === 229 || !(p.metaKey || p.ctrlKey) || p.altKey || p.key.toLowerCase() !== "f" || !oe() || !t.contains(p.target) || (p.preventDefault(), p.stopPropagation(), jf());
  };
  L || t.addEventListener("keydown", Wf, !0), L || (window.addEventListener("scroll", oo, !0), window.addEventListener("resize", oo)), L || (t.addEventListener("pointerdown", () => {
    Ge = !1;
  }, !0), t.addEventListener("keydown", (p) => {
    E != null && E.contains(p.target) || (Ge = !1);
  }, !0));
  function Wk(p) {
    var w, M, T;
    if (!p || !We(p.state)) return null;
    const { from: g } = p.state.selection, y = p.domAtPos(g), k = ((w = y.node) == null ? void 0 : w.nodeType) === Node.ELEMENT_NODE ? y.node : (M = y.node) == null ? void 0 : M.parentElement;
    return ((T = k == null ? void 0 : k.closest) == null ? void 0 : T.call(k, "table")) || null;
  }
  function so(p) {
    const g = oe();
    if (!g) return !1;
    const y = p(g.state, g.dispatch, g);
    return y && (Be(), g.focus(), He(), je(), Ve()), y;
  }
  function Zt(p) {
    var k, w, M;
    const g = p == null ? void 0 : p.state.selection;
    if (!p || !(g != null && g.empty) || We(p.state) || Bf(g)) return null;
    const { $from: y } = g;
    return !((k = y.parent) != null && k.isTextblock) || ((w = y.parent.type) == null ? void 0 : w.name) !== "paragraph" || ((M = y.parent.content) == null ? void 0 : M.size) > 0 || y.parent.textContent.trim() ? null : {
      from: g.from,
      blockStart: y.before(y.depth),
      blockEnd: y.after(y.depth)
    };
  }
  function qk(p) {
    var y, k, w, M;
    const g = Zt(p);
    if (!p || !g) return null;
    try {
      const T = p.nodeDOM(g.blockStart);
      if ((T == null ? void 0 : T.nodeType) === Node.ELEMENT_NODE && ((y = T.matches) != null && y.call(T, "p")))
        return T;
      const P = p.domAtPos(g.from), F = ((k = P.node) == null ? void 0 : k.nodeType) === Node.ELEMENT_NODE ? P.node : (w = P.node) == null ? void 0 : w.parentElement;
      return ((M = F == null ? void 0 : F.closest) == null ? void 0 : M.call(F, "p")) || null;
    } catch {
      return null;
    }
  }
  function lo(p) {
    if (!p || !Ue) return !1;
    const g = Math.max(1, Math.min(Ue.from, p.state.doc.content.size));
    try {
      return p.dispatch(p.state.tr.setSelection(ee.create(p.state.doc, g))), !0;
    } catch {
      return !1;
    }
  }
  function Ql(p, g = null) {
    const y = oe();
    if (!y) return !1;
    lo(y);
    const k = Zt(y);
    if (!k) return !1;
    const w = y.state.tr.replaceWith(k.blockStart, k.blockEnd, p), M = Number.isFinite(g) ? k.blockStart + g : k.blockStart + p.nodeSize, T = Math.max(1, Math.min(M, w.doc.content.size));
    return w.setSelection(ee.near(w.doc.resolve(T), Number.isFinite(g) ? 1 : -1)), y.dispatch(w.scrollIntoView()), Be(), y.focus(), kn(), He(), je(), Bt(), !0;
  }
  function Ls(p) {
    const g = oe();
    if (!g) return !1;
    lo(g);
    const y = g.state.schema.nodes.heading;
    return !y || !Zt(g) ? !1 : (kn(), so(On(y, { level: p })));
  }
  function Kk() {
    const p = oe();
    if (!p) return !1;
    lo(p);
    const g = p.state.schema.nodes.code_block;
    return !g || !Zt(p) ? !1 : (kn(), so(On(g, { language: "" })));
  }
  function Uk() {
    const p = oe(), g = p == null ? void 0 : p.state.schema.nodes, y = (g == null ? void 0 : g.bullet_list) || (g == null ? void 0 : g.bulletList), k = (g == null ? void 0 : g.list_item) || (g == null ? void 0 : g.listItem), w = g == null ? void 0 : g.paragraph;
    if (!p || !y || !k || !w) return !1;
    const M = y.create(null, [
      k.create(null, w.create())
    ]);
    return Ql(M, 3);
  }
  function Jk() {
    const p = oe(), g = p == null ? void 0 : p.state.schema.nodes, y = (g == null ? void 0 : g.ordered_list) || (g == null ? void 0 : g.orderedList), k = (g == null ? void 0 : g.list_item) || (g == null ? void 0 : g.listItem), w = g == null ? void 0 : g.paragraph;
    if (!p || !y || !k || !w) return !1;
    const M = y.create({ order: 1 }, [
      k.create(null, w.create())
    ]);
    return Ql(M, 3);
  }
  function Gk() {
    const p = oe(), g = p == null ? void 0 : p.state.schema.nodes, y = g == null ? void 0 : g.table, k = (g == null ? void 0 : g.table_row) || (g == null ? void 0 : g.tableRow), w = (g == null ? void 0 : g.table_cell) || (g == null ? void 0 : g.tableCell), M = (g == null ? void 0 : g.table_header_row) || (g == null ? void 0 : g.tableHeaderRow), T = (g == null ? void 0 : g.table_header) || (g == null ? void 0 : g.tableHeader);
    if (!p || !y || !k || !w || !M || !T) return !1;
    lo(p);
    const P = Zt(p);
    if (!P) return !1;
    const F = (ve) => {
      var he;
      return ((he = ve.createAndFill) == null ? void 0 : he.call(ve)) || ve.create();
    }, V = (ve) => [0, 1, 2].map(() => F(ve)), Q = y.create(null, [
      M.create(null, V(T)),
      k.create(null, V(w)),
      k.create(null, V(w))
    ]), ue = p.state.tr.replaceWith(P.blockStart, P.blockEnd, Q), me = se.findFrom(ue.doc.resolve(P.blockStart), 1, !0);
    return me && ue.setSelection(me), p.dispatch(ue.scrollIntoView()), Be(), p.focus(), kn(), He(), je(), Bt(), !0;
  }
  function Ps(p = "") {
    return (String(p || "").split(/[\\/]/).pop() || "image").replace(/\.[^.]+$/, "") || "image";
  }
  function Yk(p, g = "") {
    const y = oe(), k = y == null ? void 0 : y.state.schema.nodes.image, w = y == null ? void 0 : y.state.schema.nodes.paragraph;
    if (!y || !k || !w || !p) return !1;
    const M = k.create({
      src: p,
      alt: Ps(g || p),
      title: ""
    });
    return Ql(w.create(null, [M]));
  }
  async function qf() {
    if (typeof c != "function" || G || Je || Wn() || yn) return !1;
    const p = oe();
    if (!p || p.state.selection.$from.parent.type.spec.code) return !1;
    const g = p.state.doc, y = p.state.selection.getBookmark(), k = Zt(p);
    Ue = k ? { from: p.state.selection.from } : null, zs({ preserveSelection: !0 });
    let w = !1;
    yn = !0, f == null || f("busy");
    try {
      const M = await c();
      if (!(M != null && M.relativePath) || G || Je || !t.isConnected) return !1;
      if (!p.state.doc.eq(g) || Wn()) throw new Error(r === "en-US" ? "Content changed. Insert the image again." : "内容已变化，请在需要的位置重新插入图片。");
      if (k) return Yk(M.relativePath, M.fileName);
      const T = p.state.schema.nodes.image.create({ src: M.relativePath, alt: Ps(M.fileName || M.relativePath), title: "" });
      return p.dispatch(wn(p.state.tr.setSelection(y.resolve(p.state.doc)).replaceSelectionWith(T).scrollIntoView())), Be(), Rs(), p.focus(), !0;
    } catch (M) {
      return w = !0, G || f == null || f("error", String(M.message || M)), !1;
    } finally {
      yn = !1, Ue = null, Ve(), !G && !w && (f == null || f("done"));
    }
  }
  async function Xk() {
    if (typeof d != "function") return !1;
    const p = oe();
    if (!p || !Zt(p)) return !1;
    Ue = { from: p.state.selection.from }, zs({ preserveSelection: !0 });
    let g = null;
    try {
      g = await d();
    } catch (k) {
      console.warn("Markdown cover insert failed", k);
    }
    if (!(g != null && g.relativePath) || G || Wn())
      return g != null && g.stagedAssetId && typeof h == "function" && await h(g), Ue = null, Ve(), !1;
    const y = Qk(g);
    return !y && g.stagedAssetId && typeof h == "function" && await h(g), y;
  }
  function Qk(p) {
    const g = oe();
    if (!g || g.composing || ze.some((me) => me.kind === "duplicate")) return !1;
    lo(g);
    const y = Zt(g);
    if (!y) return !1;
    const k = g.state.schema;
    if (!k.nodes[ut]) return !1;
    const M = Js(k, {
      nodeKind: "image",
      src: p.relativePath,
      alt: Ps(p.fileName || p.relativePath),
      title: "",
      alignment: "center",
      displayWidthPx: null,
      linkHref: "",
      linkTitle: "",
      rawSource: ""
    }), T = mo(g.state), P = (T == null ? void 0 : T.pos) ?? null, F = T ? T.pos + T.node.nodeSize : null;
    let V = g.state.tr, Q;
    if (T && P < y.blockStart) {
      V = V.replaceWith(y.blockStart, y.blockEnd, M);
      const me = y.blockStart + M.nodeSize;
      V = V.replaceWith(P, F, go(k, T.node.attrs)), Q = V.mapping.map(me);
    } else
      T && (V = V.replaceWith(P, F, go(k, T.node.attrs))), V = V.replaceWith(y.blockStart, y.blockEnd, M), Q = V.mapping.map(y.blockStart + M.nodeSize);
    const ue = Math.max(1, Math.min(Q, V.doc.content.size));
    return V.setSelection(ee.near(V.doc.resolve(ue), -1)), g.dispatch(wn(V.scrollIntoView())), Be(), g.focus(), kn(), He(), je(), Ve(), !0;
  }
  function Zk(p) {
    return p === "image" ? (qf(), !0) : p === "cover-image" ? (Xk(), !0) : p === "h1" ? Ls(1) : p === "h2" ? Ls(2) : p === "h3" ? Ls(3) : p === "h4" ? Ls(4) : p === "bullet-list" ? Uk() : p === "ordered-list" ? Jk() : p === "table" ? Gk() : p === "code-block" ? Kk() : !1;
  }
  function eb(p) {
    if (!p) return [];
    const g = [];
    return p.state.doc.descendants((y, k) => {
      var w;
      return ((w = y.type) == null ? void 0 : w.name) === "code_block" && g.push({ node: y, pos: k }), !0;
    }), g;
  }
  function tb(p, g) {
    var T;
    const y = oe();
    if (!y) return !1;
    const k = y.state.doc.nodeAt(p);
    if (!k || ((T = k.type) == null ? void 0 : T.name) !== "code_block") return !1;
    const w = String(g || "").trim(), M = y.state.tr.setNodeAttribute(p, "language", w);
    return y.dispatch(M), Be(), y.focus(), Bt(), !0;
  }
  function nb(p, g) {
    var w;
    const y = document.createElement("select");
    y.className = "markdown-code-language-select", y.setAttribute("aria-label", D("markdown.codeLanguage"));
    const k = ((w = g.node.attrs) == null ? void 0 : w.language) || "";
    return y.innerHTML = gp(k).map((M) => `<option value="${Me(M.value)}">${Me(M.label)}</option>`).join(""), y.value = k, y.addEventListener("mousedown", (M) => {
      M.stopPropagation();
    }), y.addEventListener("click", (M) => {
      M.stopPropagation();
    }), y.addEventListener("change", (M) => {
      M.preventDefault(), M.stopPropagation(), tb(Number(y.dataset.codeBlockPos), M.target.value);
    }), Mt.appendChild(y), et.set(p, y), y;
  }
  function rb() {
    Mt || (Mt = document.createElement("div"), Mt.className = "markdown-code-language-layer", t.appendChild(Mt), ["keyup", "mouseup", "focusin", "pointerup"].forEach((p) => {
      t.addEventListener(p, Bt, !0);
    }), window.addEventListener("scroll", Bt, !0), window.addEventListener("resize", Bt));
  }
  function ib() {
    if (gn = null, !Mt || !ce || Wn()) return;
    const p = oe(), g = t.querySelector(".ProseMirror");
    if (!p || !g) return;
    const y = t.getBoundingClientRect(), k = Array.from(g.querySelectorAll("pre")), w = eb(p);
    et.forEach((M, T) => {
      k.includes(T) || (M.remove(), et.delete(T));
    }), k.forEach((M, T) => {
      var he;
      const P = w[T];
      if (!P) return;
      const F = et.get(M) || nb(M, P);
      F.dataset.codeBlockPos = String(P.pos);
      const V = ((he = P.node.attrs) == null ? void 0 : he.language) || "";
      [...F.options].some((Ce) => Ce.value === V) || (F.innerHTML = gp(V).map((Ce) => `<option value="${Me(Ce.value)}">${Me(Ce.label)}</option>`).join("")), F.value = V;
      const Q = M.getBoundingClientRect(), ue = Q.bottom > y.top && Q.top < y.bottom && M.offsetParent !== null;
      if (F.style.display = ue ? "inline-flex" : "none", !ue) return;
      const me = Math.max(8, Q.left - y.left + 16), ve = Math.max(8, Q.top - y.top + 10);
      F.style.left = `${Math.round(me)}px`, F.style.top = `${Math.round(ve)}px`;
    });
  }
  function Bt() {
    Mt && (gn && cancelAnimationFrame(gn), gn = requestAnimationFrame(ib));
  }
  function ob() {
    var y;
    const p = document.createElement("div");
    p.className = "markdown-insert-menu", p.setAttribute("aria-label", D("markdown.insertMenu"));
    const g = [
      { command: "image", icon: en.image, label: D("markdown.insertImage") },
      // PR C / C2：「封面图」必须紧邻普通「图片」。
      { command: "cover-image", icon: en.cover, label: D("markdown.insertCoverImage") },
      { command: "h1", icon: en.h1, label: D("markdown.insertHeading1") },
      { command: "h2", icon: en.h2, label: D("markdown.insertHeading2") },
      { command: "h3", icon: en.h3, label: D("markdown.insertHeading3") },
      { command: "h4", icon: en.h4, label: D("markdown.insertHeading4") },
      { command: "bullet-list", icon: en.list, label: D("markdown.insertBulletList") },
      { command: "ordered-list", icon: en.orderedList, label: D("markdown.insertOrderedList") },
      { command: "table", icon: en.table, label: D("markdown.insertTable") },
      { command: "code-block", icon: en.code, label: D("markdown.insertCodeBlock") }
    ];
    return p.innerHTML = `
      <button class="markdown-insert-trigger" type="button" aria-label="${D("markdown.openInsertMenu")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.5v11M4.5 10h11" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
      </button>
      <div class="markdown-insert-popover" role="menu" aria-hidden="true">
        ${g.map((k) => `
          <button type="button" role="menuitem" data-insert-command="${k.command}" aria-label="${k.label}">
            ${k.icon}
            <span class="markdown-insert-tooltip">${k.label}</span>
          </button>
        `).join("")}
      </div>
    `, p.addEventListener("pointerdown", (k) => {
      k.preventDefault(), k.stopPropagation();
    }), (y = p.querySelector(".markdown-insert-trigger")) == null || y.addEventListener("pointerdown", (k) => {
      var M;
      k.preventDefault(), k.stopPropagation();
      const w = oe();
      !w || !Zt(w) || (Ue = { from: w.state.selection.from }, Lt = !Lt, p.classList.toggle("open", Lt), (M = p.querySelector(".markdown-insert-popover")) == null || M.setAttribute("aria-hidden", Lt ? "false" : "true"), Ve());
    }), p.addEventListener("pointerdown", (k) => {
      const w = k.target.closest("button[data-insert-command]");
      w && (k.preventDefault(), k.stopPropagation(), Zk(w.dataset.insertCommand));
    }), p;
  }
  function Zl(p = null) {
    var k, w, M, T, P;
    const g = (k = p == null ? void 0 : p.matches) != null && k.call(p, "[data-markdown-shell-overlay]") ? p : (w = p == null ? void 0 : p.querySelector) == null ? void 0 : w.call(p, "[data-markdown-shell-overlay]");
    if (g) return g;
    const y = (M = p == null ? void 0 : p.matches) != null && M.call(p, ".markdown-document-shell") ? p : ((T = p == null ? void 0 : p.closest) == null ? void 0 : T.call(p, ".markdown-document-shell")) || t.closest(".markdown-document-shell");
    return ((P = y == null ? void 0 : y.querySelector) == null ? void 0 : P.call(y, "[data-markdown-shell-overlay]")) || y || t;
  }
  function sb() {
    le || (le = ob(), Pe = Zl(), Pe.appendChild(le), ["keyup", "mouseup", "focusin", "pointerup"].forEach((p) => {
      t.addEventListener(p, Ve, !0);
    }), t.addEventListener("keydown", Kf, !0), t.addEventListener("pointerdown", Uf, !0), window.addEventListener("scroll", Ve, !0), window.addEventListener("resize", Ve), t.addEventListener("focusout", Jf, !0));
  }
  function Kf(p) {
    p.key !== "Enter" || p.isComposing || (window.setTimeout(Ve, 0), window.setTimeout(Ve, 80));
  }
  function Uf(p) {
    !Lt || le != null && le.contains(p.target) || zs();
  }
  function zs({ preserveSelection: p = !1 } = {}) {
    var g;
    Lt = !1, p || (Ue = null), le == null || le.classList.remove("open"), (g = le == null ? void 0 : le.querySelector(".markdown-insert-popover")) == null || g.setAttribute("aria-hidden", "true");
  }
  function kn() {
    le && (zs(), le.classList.remove("visible"), Oe = !1);
  }
  function Jf() {
    window.setTimeout(() => {
      const p = document.activeElement;
      !t.contains(p) && !(le != null && le.contains(p)) && kn();
    }, 0);
  }
  function lb() {
    var F;
    if (at = null, !le || !ce || ((!(Pe != null && Pe.isConnected) || le.parentNode !== Pe) && (Pe = Zl(), Pe.appendChild(le)), Wn())) return;
    const p = oe(), g = Zt(p);
    if (!p || !g || !t.contains(p.dom)) {
      kn();
      return;
    }
    let y = null;
    try {
      y = p.coordsAtPos(p.state.selection.from);
    } catch {
      kn();
      return;
    }
    const k = Pe.getBoundingClientRect(), w = (F = qk(p)) == null ? void 0 : F.getBoundingClientRect(), T = ((w == null ? void 0 : w.left) ?? y.left) - k.left - 34, P = Math.max(4, y.top - k.top + (y.bottom - y.top) / 2 - 13);
    le.style.left = `${Math.round(T)}px`, le.style.top = `${Math.round(P)}px`, Oe || (le.classList.add("visible"), Oe = !0);
  }
  function Ve() {
    le && (at && cancelAnimationFrame(at), at = requestAnimationFrame(lb));
  }
  function ao(p, g = oe()) {
    if (!p || !g) return null;
    let y = null;
    return g.state.doc.descendants((k, w) => {
      var T, P, F, V, Q, ue;
      if (y || !["image", nt, ut].includes((T = k.type) == null ? void 0 : T.name)) return !y;
      const M = g.nodeDOM(w);
      if (M === p || (P = M == null ? void 0 : M.contains) != null && P.call(M, p)) {
        const me = g.state.doc.resolve(w), ve = ((F = k.type) == null ? void 0 : F.name) === ut, he = ((V = k.type) == null ? void 0 : V.name) === nt, Ce = ve || he || ((ue = (Q = me.parent) == null ? void 0 : Q.type) == null ? void 0 : ue.name) === "paragraph" && me.parent.childCount === 1;
        return y = { element: p, node: k, pos: w, isPortable: he, isCover: ve, isStandalone: Ce }, !1;
      }
      return !0;
    }), y;
  }
  function Gf(p, g = {}) {
    var k, w, M, T, P;
    const y = p == null ? void 0 : p.node;
    return y ? ((k = y.type) == null ? void 0 : k.name) === nt ? {
      ...y.attrs,
      ...g,
      sourceSyntax: "github-html",
      presentationDirty: !0
    } : {
      src: ((w = y.attrs) == null ? void 0 : w.src) || "",
      alt: ((M = y.attrs) == null ? void 0 : M.alt) || "",
      title: eI(((T = y.attrs) == null ? void 0 : T.title) || ""),
      alignment: ti(((P = y.attrs) == null ? void 0 : P.title) || ""),
      displayWidthPx: null,
      linkHref: "",
      linkTitle: "",
      sourceSyntax: "github-html",
      rawSource: "",
      presentationDirty: !0,
      ...g
    } : null;
  }
  function Yf(p, g, y) {
    var M;
    if (!p || !g || !y) return !1;
    const k = p.state.schema.nodes[nt];
    if (!k) return !1;
    let w = p.state.tr;
    if (((M = g.node.type) == null ? void 0 : M.name) === nt)
      w = w.setNodeMarkup(g.pos, k, y);
    else {
      if (!g.isStandalone) return !1;
      const T = p.state.doc.resolve(g.pos), P = T.parent, F = T.before(T.depth);
      w = w.replaceWith(F, F + P.nodeSize, k.create(y));
    }
    return p.dispatch(w.scrollIntoView()), Be(), co(), p.focus(), !0;
  }
  function ab(p) {
    const g = Number((p == null ? void 0 : p.naturalWidth) || 0);
    return g > 0 ? Promise.resolve(g) : p ? new Promise((y, k) => {
      let w = !1;
      const M = (V, Q = null) => {
        w || (w = !0, window.clearTimeout(F), p.removeEventListener("load", T), p.removeEventListener("error", P), Q ? k(Q) : y(V));
      }, T = () => {
        const V = Number(p.naturalWidth || 0);
        V > 0 ? M(V) : M(0, new Error("IMAGE_DIMENSIONS_UNAVAILABLE"));
      }, P = () => M(0, new Error("IMAGE_LOAD_FAILED")), F = window.setTimeout(() => M(0, new Error("IMAGE_DIMENSIONS_TIMEOUT")), 4e3);
      p.addEventListener("load", T, { once: !0 }), p.addEventListener("error", P, { once: !0 }), p.complete && T();
    }) : Promise.reject(new Error("IMAGE_NOT_AVAILABLE"));
  }
  async function ea(p, g) {
    if (g === "large") return null;
    const y = zA[g];
    if (!y) return null;
    const k = await ab(p == null ? void 0 : p.element);
    return Math.min(y, k);
  }
  function oi(p) {
    typeof C == "function" && C(p);
  }
  function Xf(p, g, { alignment: y, displayWidthPx: k }) {
    var T;
    const w = p.state.doc.nodeAt(g.pos);
    if (!w || ((T = w.type) == null ? void 0 : T.name) !== ut) return !1;
    const M = p.state.tr.setNodeAttribute(g.pos, "presentationDirty", !0);
    return M.setNodeAttribute(g.pos, "nodeKind", "portable-image"), M.setNodeAttribute(g.pos, "alignment", y || ""), M.setNodeAttribute(g.pos, "displayWidthPx", k ?? null), p.dispatch(wn(M.scrollIntoView())), Be(), p.focus(), xr(), !0;
  }
  async function cb(p) {
    var w, M, T, P, F, V, Q, ue;
    const g = oe();
    if (!g || !ke) return !1;
    let y = { ...ke, node: g.state.doc.nodeAt(ke.pos) };
    if (!y.node || !y.isStandalone) return !1;
    if (((w = y.node.type) == null ? void 0 : w.name) === ut) {
      const me = ((M = y.node.attrs) == null ? void 0 : M.displayWidthPx) ?? null;
      return Xf(g, y, { alignment: p, displayWidthPx: me });
    }
    let k = ((T = y.node.type) == null ? void 0 : T.name) === nt ? ((P = y.node.attrs) == null ? void 0 : P.displayWidthPx) ?? null : null;
    if (((F = y.node.type) == null ? void 0 : F.name) === "image") {
      const me = Uc(((V = y.node.attrs) == null ? void 0 : V.title) || "");
      if (me !== "large") {
        try {
          k = await ea(y, me);
        } catch (he) {
          return oi(he), !1;
        }
        const ve = ao(y.element, g);
        if (!ve || ((Q = ve.node.attrs) == null ? void 0 : Q.src) !== ((ue = y.node.attrs) == null ? void 0 : ue.src)) return !1;
        y = ve;
      }
    }
    return Yf(g, y, Gf(y, { alignment: p, displayWidthPx: k }));
  }
  async function ub(p) {
    var k, w, M, T;
    const g = oe();
    if (!g || !ke) return !1;
    let y = { ...ke, node: g.state.doc.nodeAt(ke.pos) };
    if (!y.node || !y.isStandalone) return !1;
    if (((k = y.node.type) == null ? void 0 : k.name) === ut)
      try {
        const P = await ea(y, p);
        return Xf(g, y, {
          alignment: ((w = y.node.attrs) == null ? void 0 : w.alignment) || "",
          displayWidthPx: P
        });
      } catch (P) {
        return oi(P), !1;
      }
    try {
      const P = await ea(y, p), F = ao(y.element, g);
      return !F || ((M = F.node.attrs) == null ? void 0 : M.src) !== ((T = y.node.attrs) == null ? void 0 : T.src) ? !1 : (y = F, Yf(g, y, Gf(y, { displayWidthPx: P })));
    } catch (P) {
      return oi(P), !1;
    }
  }
  function ta(p) {
    typeof x == "function" && x(p);
  }
  async function fb() {
    var P, F;
    const p = oe();
    if (!p || !ke) return !1;
    let g = { ...ke, node: p.state.doc.nodeAt(ke.pos) };
    if (!g.node || !g.isStandalone || ((P = g.node.type) == null ? void 0 : P.name) === ut) return !1;
    const y = String(((F = g.node.attrs) == null ? void 0 : F.src) || "");
    if (typeof m == "function" && !/^https?:\/\//i.test(y.trim()) && !await m(y))
      return ta({ kind: "set", ok: !1, reason: "validation" }), !1;
    if (Kn.getCoverState().duplicate) return !1;
    const w = oe();
    if (!w || w.composing) return !1;
    const M = ao(g.element, w);
    if (!M) return !1;
    const T = Kn.setCoverImage(M.pos);
    return ta({ kind: "set", ok: T }), T;
  }
  function db() {
    if (Kn.getCoverState().duplicate) return !1;
    const p = Kn.removeCover();
    return ta({ kind: "remove", ok: p }), p;
  }
  function hb() {
    var w;
    const p = oe();
    if (!((w = p == null ? void 0 : p.dom) != null && w.isConnected)) return;
    const g = [];
    for (let M = p.dom.parentElement; M; M = M.parentElement)
      g.push({ element: M, left: M.scrollLeft, top: M.scrollTop });
    const y = window.scrollX, k = window.scrollY;
    try {
      p.dom.focus({ preventScroll: !0 });
    } catch {
      p.dom.focus();
    }
    g.forEach(({ element: M, left: T, top: P }) => {
      M.scrollLeft !== T && (M.scrollLeft = T), M.scrollTop !== P && (M.scrollTop = P);
    }), (window.scrollX !== y || window.scrollY !== k) && window.scrollTo(y, k);
  }
  function pb() {
    const p = document.createElement("div");
    p.className = "markdown-image-align-toolbar", p.setAttribute("aria-label", D("markdown.imageAlignTools"));
    const g = [
      { type: "align", value: "left", icon: Gn.left, label: D("markdown.alignLeft") },
      { type: "align", value: "center", icon: Gn.center, label: D("markdown.alignCenter") },
      { type: "align", value: "right", icon: Gn.right, label: D("markdown.alignRight") },
      { type: "size", value: "small", icon: Qa.small, label: D("markdown.imageSizeSmall") },
      { type: "size", value: "medium", icon: Qa.medium, label: D("markdown.imageSizeMedium") },
      { type: "size", value: "large", icon: Qa.large, label: D("markdown.imageSizeLarge") },
      // PR C / C2：封面二态工具。合格非封面图片只显示「设为封面」；
      // 当前封面只显示「取消封面」；不提供替换当前封面的第三态入口。
      { type: "cover", value: "set", icon: Gn.coverSet, label: D("markdown.setAsCover") },
      { type: "cover", value: "remove", icon: Gn.coverRemove, label: D("markdown.removeCover") }
    ];
    p.innerHTML = g.map((k) => `
      <button type="button" data-image-${k.type}="${k.value}" aria-label="${k.label}">
        ${k.icon}
        <span class="markdown-image-align-tooltip">${k.label}</span>
      </button>
    `).join("");
    const y = (k) => !k || k.disabled || k.hidden ? !1 : k.dataset.imageCover === "set" ? fb().catch((w) => (oi(w), !1)) : k.dataset.imageCover === "remove" ? db() : k.dataset.imageAlign ? cb(k.dataset.imageAlign).catch((w) => (oi(w), !1)) : ub(k.dataset.imageSize || "large").catch((w) => (oi(w), !1));
    return p.addEventListener("pointerdown", (k) => {
      const w = k.target.closest("button[data-image-align], button[data-image-size], button[data-image-cover]");
      w && (k.preventDefault(), k.stopPropagation(), y(w));
    }), p.addEventListener("keydown", (k) => {
      if (k.key !== "Enter" && k.key !== " ") return;
      const w = k.target.closest("button[data-image-align], button[data-image-size], button[data-image-cover]");
      w && (k.preventDefault(), k.stopPropagation(), Promise.resolve(y(w)).finally(() => {
        hb();
      }));
    }), p.addEventListener("pointerenter", () => {
      xr();
    }), p.addEventListener("pointerleave", () => {
      window.setTimeout(() => {
        var k, w;
        !(de != null && de.matches(":hover")) && !((w = (k = ke == null ? void 0 : ke.element) == null ? void 0 : k.matches) != null && w.call(k, ":hover")) && co();
      }, 120);
    }), p;
  }
  function mb() {
    de || (de = pb(), t.appendChild(de), t.addEventListener("pointerover", Qf, !0), t.addEventListener("pointerout", Zf, !0), window.addEventListener("scroll", xr, !0), window.addEventListener("resize", xr));
  }
  function Qf(p) {
    var k, w;
    const g = (w = (k = p.target) == null ? void 0 : k.closest) == null ? void 0 : w.call(k, ".ProseMirror img");
    if (!g || !t.contains(g)) return;
    const y = ao(g);
    y && (ke = y, xr());
  }
  function Zf(p) {
    if (!(ke != null && ke.element)) return;
    const g = p.relatedTarget;
    g && (ke.element.contains(g) || de != null && de.contains(g)) || window.setTimeout(() => {
      var y, k;
      !(de != null && de.matches(":hover")) && !((k = (y = ke == null ? void 0 : ke.element) == null ? void 0 : y.matches) != null && k.call(y, ":hover")) && co();
    }, 120);
  }
  function co() {
    de && (de.classList.remove("visible"), ke = null);
  }
  function gb() {
    var Fs, $s, uo, Un, sd;
    if (Pt = null, !de || !(ke != null && ke.element) || !t.contains(ke.element)) {
      co();
      return;
    }
    const p = oe(), g = ao(ke.element, p);
    if (!g) {
      co();
      return;
    }
    ke = g;
    const y = ke.node, k = ((Fs = y.type) == null ? void 0 : Fs.name) === ut, w = k || (($s = y.type) == null ? void 0 : $s.name) === nt, M = ((uo = y.attrs) == null ? void 0 : uo.title) || "", T = w ? ((Un = y.attrs) == null ? void 0 : Un.alignment) || "" : ti(M), P = w ? ((sd = y.attrs) == null ? void 0 : sd.displayWidthPx) == null ? "large" : "custom" : Uc(M), F = ke.isStandalone;
    de.querySelectorAll("button[data-image-align], button[data-image-size]").forEach((Nt) => {
      Nt.disabled = !F;
      const ld = Nt.querySelector(".markdown-image-align-tooltip");
      ld && (ld.textContent = F ? Nt.getAttribute("aria-label") || "" : D("markdown.imageBlockOnly"));
    }), de.querySelectorAll("button[data-image-align]").forEach((Nt) => {
      Nt.classList.toggle("active", Nt.dataset.imageAlign === T);
    }), de.querySelectorAll("button[data-image-size]").forEach((Nt) => {
      Nt.classList.toggle("active", Nt.dataset.imageSize === P);
    });
    const V = de.querySelector('button[data-image-cover="set"]'), Q = de.querySelector('button[data-image-cover="remove"]'), ue = k, me = Kn.getCoverState();
    if (V) {
      V.disabled = !F;
      const Nt = F && !ue && !me.duplicate;
      V.hidden = !Nt;
    }
    if (Q) {
      Q.disabled = !F;
      const Nt = F && ue && !me.duplicate;
      Q.hidden = !Nt;
    }
    const ve = t.getBoundingClientRect(), he = ke.element.getBoundingClientRect(), Ce = de.offsetWidth || 108, li = Math.max(8, Math.min(he.left - ve.left + he.width / 2 - Ce / 2, ve.width - Ce - 8)), ai = Math.max(4, he.top - ve.top + 8);
    de.style.left = `${Math.round(li)}px`, de.style.top = `${Math.round(ai)}px`, de.classList.add("visible");
  }
  function xr() {
    de && (Pt && cancelAnimationFrame(Pt), Pt = requestAnimationFrame(gb));
  }
  function ed(p, g = vt) {
    if (!p || !g) return (p == null ? void 0 : p.state.selection) || null;
    const y = p.state.doc.content.size, k = Math.max(0, Math.min(Number(g.anchor), y)), w = Math.max(0, Math.min(Number(g.head), y));
    return ee.between(p.state.doc.resolve(k), p.state.doc.resolve(w));
  }
  function td(p) {
    const g = oe();
    if (!g || !["left", ...Wr].includes(p)) return !1;
    const y = ed(g), k = Dp(g.state, y);
    if (!k.supported) return !1;
    const w = Wr.includes(p) && k.alignment === p ? "left" : p, M = g.state.schema.nodes[ei];
    let T = g.state.tr, P = !1, F = y.anchor, V = y.head;
    const Q = (he, Ce, li, ai) => {
      const Fs = he + Ce, $s = li - Ce, uo = (Un) => Un <= he ? Un : Un >= Fs ? Un + $s : Un + ai;
      F = uo(F), V = uo(V);
    };
    if ([...k.targets].reverse().forEach((he) => {
      const Ce = T.doc.nodeAt(he.pos);
      if (!Ce) return;
      if (Ce.type === M) {
        if (w === "left") {
          if (Ce.childCount !== 1) return;
          const ai = Ce.child(0);
          Q(he.pos, Ce.nodeSize, ai.nodeSize, -1), T = T.replaceWith(he.pos, he.pos + Ce.nodeSize, ai), P = !0;
          return;
        }
        if (Ce.attrs.alignment === w) return;
        T = T.setNodeMarkup(he.pos, M, {
          alignment: w,
          sourceSyntax: "github-div-align"
        }), P = !0;
        return;
      }
      if (w === "left") return;
      const li = M.create({
        alignment: w,
        sourceSyntax: "github-div-align"
      }, Ce);
      Q(he.pos, Ce.nodeSize, li.nodeSize, 1), T = T.replaceWith(he.pos, he.pos + Ce.nodeSize, li), P = !0;
    }), !P) return !1;
    const ue = T.doc.content.size, me = Math.max(0, Math.min(F, ue)), ve = Math.max(0, Math.min(V, ue));
    return T = T.setSelection(ee.between(
      T.doc.resolve(me),
      T.doc.resolve(ve)
    )), T = wn(T), g.dispatch(T.scrollIntoView()), Be(), g.focus(), He(), je(), Ve(), Bt(), !0;
  }
  function yb(p) {
    const g = oe(), y = g == null ? void 0 : g.state.schema.marks[p];
    return y ? so(ps(y)) : !1;
  }
  function Bs() {
    var p;
    ne && ((p = ne.querySelector(".markdown-format-link-popover")) == null || p.classList.remove("open"), S = null);
  }
  function kb() {
    const p = oe(), g = p == null ? void 0 : p.state.selection;
    if (!ne || !p || !g || g.empty) return !1;
    S = { from: g.from, to: g.to };
    const y = ne.querySelector(".markdown-format-link-popover"), k = ne.querySelector("[data-format-link-input]");
    return !y || !k ? !1 : (y.classList.add("open"), k.value = "", window.setTimeout(() => k.focus(), 0), !0);
  }
  function nd(p) {
    const g = String(p || "").trim();
    if (!g) return !1;
    const y = oe(), k = y == null ? void 0 : y.state.schema.marks.link;
    if (!y || !k || !S) return !1;
    const w = Math.max(0, Math.min(S.from, y.state.doc.content.size)), M = Math.max(w, Math.min(S.to, y.state.doc.content.size)), T = y.state.tr.setSelection(ee.create(y.state.doc, w, M)).addMark(w, M, k.create({ href: g }));
    return y.dispatch(T.scrollIntoView()), Be(), y.focus(), Bs(), He(), je(), !0;
  }
  function bb() {
    const p = oe(), g = p == null ? void 0 : p.state.schema.marks.link, y = p == null ? void 0 : p.state.selection;
    if (!p || !g || !y || y.empty) return !1;
    const k = p.state.tr.removeMark(y.from, y.to, g);
    return p.dispatch(k.scrollIntoView()), Be(), p.focus(), Bs(), He(), je(), !0;
  }
  function wb(p) {
    const g = oe();
    if (!g) return !1;
    const { nodes: y } = g.state.schema;
    if (p === "paragraph")
      return y.paragraph ? so(On(y.paragraph)) : !1;
    const k = Number(String(p || "").replace("h", ""));
    return !y.heading || !Number.isFinite(k) ? !1 : so(On(y.heading, { level: k }));
  }
  function xb(p, g) {
    const y = p == null ? void 0 : p.state.schema.marks[g];
    if (!p || !y) return !1;
    const { from: k, to: w, empty: M, $from: T } = p.state.selection;
    return M ? !!y.isInSet(p.state.storedMarks || T.marks()) : p.state.doc.rangeHasMark(k, w, y);
  }
  function Cb(p) {
    var y;
    if (!p) return "paragraph";
    const { $from: g } = p.state.selection;
    for (let k = g.depth; k > 0; k -= 1) {
      const w = g.node(k);
      if (w.type.name === "heading")
        return `h${((y = w.attrs) == null ? void 0 : y.level) || 1}`;
      if (w.type.name === "paragraph")
        return "paragraph";
    }
    return "paragraph";
  }
  function Sb() {
    var k, w, M;
    const p = document.createElement("div");
    p.className = "markdown-format-toolbar", p.setAttribute("aria-label", D("markdown.formatTools")), p.innerHTML = `
      <label class="markdown-format-heading-wrap">
        <select class="markdown-format-heading" aria-label="${D("markdown.headingLevel")}">
          <option value="paragraph">正文</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
          <option value="h4">H4</option>
        </select>
        <svg class="markdown-format-heading-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.2 4.5 6 7.3l2.8-2.8" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </label>
      <button type="button" data-format-command="bold" aria-label="${D("markdown.bold")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4h4.3c2 0 3.2 1 3.2 2.6 0 1.1-.6 1.9-1.5 2.2 1.3.3 2.1 1.3 2.1 2.7 0 1.9-1.4 3.2-3.6 3.2H6V4Zm2.2 4h1.9c.8 0 1.2-.4 1.2-1.1 0-.7-.5-1.1-1.3-1.1H8.2V8Zm0 5h2.1c.9 0 1.5-.5 1.5-1.3 0-.9-.6-1.3-1.6-1.3h-2V13Z" fill="currentColor"/></svg>
        <span class="markdown-format-tooltip">⌘B</span>
      </button>
      <button type="button" data-format-command="italic" aria-label="${D("markdown.italic")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M9.1 4h6l-.3 1.7h-1.9l-1.8 8.6H13L12.7 16h-6l.3-1.7h1.9l1.8-8.6H8.8L9.1 4Z" fill="currentColor"/></svg>
        <span class="markdown-format-tooltip">⌘I</span>
      </button>
      <button type="button" data-format-command="code" aria-label="${D("markdown.inlineCode")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.2 6.4-3.3 3.5 3.3 3.5M12.8 6.4l3.3 3.5-3.3 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="markdown-format-tooltip">⌘E</span>
      </button>
      <button type="button" data-format-command="strike" aria-label="${D("markdown.strike")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10M7.1 13.3c.6 1 1.7 1.6 3.1 1.6 1.8 0 3-.9 3-2.2 0-1.1-.7-1.8-2.3-2.2l-1.8-.5C7.5 9.6 6.7 8.8 6.7 7.5c0-1.6 1.4-2.7 3.3-2.7 1.5 0 2.6.6 3.2 1.7" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>
        <span class="markdown-format-tooltip">⌥⌘X</span>
      </button>
      <button type="button" data-format-command="link" aria-label="${D("markdown.addLink")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.2 6.7 9.4 5.5a3.3 3.3 0 0 1 4.7 4.7l-1.6 1.6a3.3 3.3 0 0 1-4.5.2M11.8 13.3l-1.2 1.2a3.3 3.3 0 0 1-4.7-4.7l1.6-1.6a3.3 3.3 0 0 1 4.5-.2" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="markdown-format-tooltip">${D("markdown.linkTooltip")}</span>
      </button>
      <span class="markdown-format-divider" aria-hidden="true"></span>
      <button type="button" data-text-align="left" aria-label="${D("markdown.alignLeft")}">
        ${Gn.left}
        <span class="markdown-format-tooltip">${D("markdown.alignLeft")}</span>
      </button>
      <button type="button" data-text-align="center" aria-label="${D("markdown.alignCenter")}">
        ${Gn.center}
        <span class="markdown-format-tooltip">${D("markdown.alignCenter")}</span>
      </button>
      <button type="button" data-text-align="right" aria-label="${D("markdown.alignRight")}">
        ${Gn.right}
        <span class="markdown-format-tooltip">${D("markdown.alignRight")}</span>
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
    p.addEventListener("mousedown", (T) => {
      T.target.closest("select") || T.target.closest("input") || T.preventDefault();
    }), p.addEventListener("pointerdown", (T) => {
      const P = T.target.closest("button[data-text-align]");
      P && (T.preventDefault(), T.stopPropagation(), P.getAttribute("aria-disabled") !== "true" && td(P.dataset.textAlign || "left"));
    }), p.addEventListener("click", (T) => {
      const P = T.target.closest("button[data-text-align]");
      if (P) {
        T.preventDefault(), T.stopPropagation(), T.detail === 0 && P.getAttribute("aria-disabled") !== "true" && td(P.dataset.textAlign || "left");
        return;
      }
      const F = T.target.closest("button[data-format-command]");
      if (!(!F || F.getAttribute("aria-disabled") === "true")) {
        if (T.preventDefault(), T.stopPropagation(), F.dataset.formatCommand === "link") {
          if (F.classList.contains("active")) {
            bb();
            return;
          }
          kb();
          return;
        }
        yb(g[F.dataset.formatCommand]);
      }
    }), (k = p.querySelector("[data-format-link-apply]")) == null || k.addEventListener("click", (T) => {
      T.preventDefault(), T.stopPropagation();
      const P = p.querySelector("[data-format-link-input]");
      nd(P == null ? void 0 : P.value);
    }), (w = p.querySelector("[data-format-link-input]")) == null || w.addEventListener("keydown", (T) => {
      var P;
      T.key === "Enter" && (T.preventDefault(), T.stopPropagation(), nd(T.currentTarget.value)), T.key === "Escape" && (T.preventDefault(), T.stopPropagation(), Bs(), (P = oe()) == null || P.focus());
    });
    const y = p.querySelector("[data-format-link-input]");
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
    ].forEach((T) => {
      y == null || y.addEventListener(T, (P) => P.stopPropagation());
    }), (M = p.querySelector("select")) == null || M.addEventListener("change", (T) => {
      wb(T.target.value);
    }), p;
  }
  function vb() {
    ne || (ne = Sb(), t.appendChild(ne), ["keyup", "mouseup", "focusin", "pointerup"].forEach((p) => {
      t.addEventListener(p, He, !0);
    }), document.addEventListener("selectionchange", He), window.addEventListener("scroll", He, !0), window.addEventListener("resize", He), t.addEventListener("focusout", rd, !0));
  }
  function si() {
    ne && (Bs(), ne.classList.remove("visible"), lt = !1, vt = null);
  }
  function rd() {
    window.setTimeout(() => {
      const p = document.activeElement;
      !t.contains(p) && !(ne != null && ne.contains(p)) && si();
    }, 0);
  }
  function Mb(p) {
    if (!ne || !p) return;
    Object.entries({
      bold: "strong",
      italic: "emphasis",
      code: "inlineCode",
      strike: "strike_through",
      link: "link"
    }).forEach(([F, V]) => {
      const Q = ne.querySelector(`[data-format-command="${F}"]`);
      if (!Q) return;
      const ue = !!p.state.schema.marks[V];
      Q.classList.toggle("active", ue && xb(p, V)), Q.setAttribute("aria-disabled", ue ? "false" : "true");
    });
    const y = ne.querySelector('[data-format-command="link"]'), k = y == null ? void 0 : y.querySelector(".markdown-format-tooltip"), w = !!(y != null && y.classList.contains("active"));
    y == null || y.setAttribute("aria-label", D(w ? "markdown.removeLink" : "markdown.addLink")), k && (k.textContent = D(w ? "actions.remove" : "markdown.linkTooltip"));
    const M = ne.querySelector("select");
    M && (M.value = Cb(p));
    const T = ed(p), P = Dp(p.state, T);
    ne.querySelectorAll("button[data-text-align]").forEach((F) => {
      const V = P.supported, Q = F.dataset.textAlign;
      F.classList.toggle("active", V && P.alignment === Q), F.setAttribute("aria-disabled", V ? "false" : "true");
      const ue = F.querySelector(".markdown-format-tooltip");
      ue && (ue.textContent = V ? F.getAttribute("aria-label") || "" : D("markdown.textAlignBlockOnly"));
    });
  }
  function Tb() {
    if (Ee = null, !ne || !ce) return;
    if (E && Ge) {
      si();
      return;
    }
    if (Wn()) return;
    const p = oe(), g = p == null ? void 0 : p.state.selection;
    if (!p || !g || g.empty || !t.contains(p.dom)) {
      si();
      return;
    }
    if (We(p.state)) {
      si();
      return;
    }
    if (!p.state.doc.textBetween(g.from, g.to, " ").trim()) {
      si();
      return;
    }
    vt = {
      anchor: g.anchor,
      head: g.head
    }, Mb(p);
    const k = t.getBoundingClientRect();
    let w = null, M = null;
    try {
      w = p.coordsAtPos(g.from), M = p.coordsAtPos(g.to);
    } catch {
      si();
      return;
    }
    const T = ne.offsetWidth || 352, P = ne.offsetHeight || 38, F = Math.min(w.left, M.left), V = Math.max(w.right || w.left, M.right || M.left), Q = Math.min(w.top, M.top), ue = Math.max(w.bottom || w.top, M.bottom || M.top), me = (F + V) / 2, ve = Math.max(8, Math.min(me - k.left - T / 2, k.width - T - 8));
    let he = Q - k.top - P - 10;
    he < 8 && (he = ue - k.top + 10), ne.style.left = `${Math.round(ve)}px`, ne.style.top = `${Math.round(he)}px`, lt || (ne.classList.add("visible"), lt = !0);
  }
  function He() {
    ne && (Ee && cancelAnimationFrame(Ee), Ee = requestAnimationFrame(Tb));
  }
  function Nb(p) {
    if (!s) return !1;
    const g = oe();
    if (!g || !We(g.state)) return !1;
    const y = p(g.state, g.dispatch, g);
    return y && (Be(), g.focus(), je()), y;
  }
  function Eb() {
    const p = document.createElement("div");
    p.className = "markdown-table-toolbar", p.setAttribute("aria-label", D("markdown.tableTools"));
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
    p.innerHTML = `
      ${Object.keys(y).map((w) => `
        <button type="button" data-table-command="${w}" aria-label="${y[w]}">
          ${g[w]}
          <span class="markdown-table-tooltip">${y[w]}</span>
        </button>
      `).join("")}
    `;
    const k = {
      "row-before": iT,
      "row-after": oT,
      "column-before": Ly,
      "column-after": Py,
      "delete-row": Fy,
      "delete-column": zy
    };
    return p.addEventListener("mousedown", (w) => {
      w.preventDefault();
    }), p.addEventListener("click", (w) => {
      const M = w.target.closest("button[data-table-command]");
      M && (w.preventDefault(), w.stopPropagation(), Nb(k[M.dataset.tableCommand]));
    }), p;
  }
  function id() {
    !s || Se || (Se = Eb(), t.appendChild(Se), ["keyup", "mouseup", "focusin", "pointerup"].forEach((p) => {
      t.addEventListener(p, je, !0);
    }), window.addEventListener("scroll", je, !0), window.addEventListener("resize", je));
  }
  function od() {
    Ke && (cancelAnimationFrame(Ke), Ke = null), Se && (["keyup", "mouseup", "focusin", "pointerup"].forEach((p) => {
      t.removeEventListener(p, je, !0);
    }), window.removeEventListener("scroll", je, !0), window.removeEventListener("resize", je), Se.remove(), Se = null, v = !1);
  }
  function Ab() {
    Se && (Se.classList.remove("visible"), v = !1);
  }
  function Ib() {
    if (Ke = null, !Se || !s || !ce || Wn()) return;
    const p = oe(), g = Wk(p);
    if (!g) {
      Ab();
      return;
    }
    const y = t.getBoundingClientRect();
    let k = null;
    try {
      k = p.coordsAtPos(p.state.selection.from);
    } catch {
      k = g.getBoundingClientRect();
    }
    const w = Se.offsetWidth || 224, M = Se.offsetHeight || 38, T = ((k.left || 0) + (k.right || k.left || 0)) / 2, P = Math.max(6, Math.min(T - y.left - w / 2, y.width - w - 6));
    let F = (k.top || 0) - y.top - M - 10;
    F < 6 && (F = (k.bottom || k.top || 0) - y.top + 10), Se.style.left = `${Math.round(P)}px`, Se.style.top = `${Math.round(F)}px`, v || (Se.classList.add("visible"), v = !0);
  }
  function je() {
    !s || !Se || (Ke && cancelAnimationFrame(Ke), Ke = requestAnimationFrame(Ib));
  }
  function na(p) {
    if (G) return !1;
    const g = ct.action((y) => {
      const k = y.get(Re), w = p(k.state, k.dispatch, k);
      return w && (k.focus(), He(), je(), Ve(), Bt()), w;
    });
    return g && (_e && (clearTimeout(_e), _e = null), Rs()), g;
  }
  const Kn = {
    setLanguage(p) {
      var g, y;
      if (!G) {
        r = p;
        for (const k of [ne, Se, le, de, Mt, E])
          if (k) {
            for (const w of [k, ...k.querySelectorAll("*")])
              if (!w.closest("[data-find-history-item]")) {
                for (const M of ["aria-label", "title", "placeholder"])
                  w.hasAttribute(M) && w.setAttribute(M, ((g = I == null ? void 0 : I.translateText) == null ? void 0 : g.call(I, w.getAttribute(M), r)) ?? w.getAttribute(M));
                for (const M of w.childNodes) {
                  if (M.nodeType !== Node.TEXT_NODE || !M.textContent.trim()) continue;
                  const T = M.textContent.trim(), P = ((y = I == null ? void 0 : I.translateText) == null ? void 0 : y.call(I, T, r)) ?? T;
                  P !== T && (M.textContent = M.textContent.replace(T, P));
                }
              }
          }
      }
    },
    refreshImageSources() {
      var p;
      G || (p = oe()) == null || p.dom.dispatchEvent(new Event("nutbook:normalize-local-images"));
    },
    editor: ct,
    /**
     * Codex review R3-1 / R4-2 / R4-3：真实编辑锁（主 Milkdown 运行面）。
     *
     * - 等 view.composing 结束（ProseMirror 的 composition 权威状态源），
     *   组合文本落定后才锁——不用 document.activeElement.isComposing 猜。
     *   R4-3：超时 ≠ 组合结束（compositionend 事件是唯一权威落定信号）。
     *   超时一律返回 false（busy，可重试），绝不强行锁定/序列化截断
     *   组合输入；compositionend 后让出一拍并复核，防止新组合被截断。
     * - flush：序列化当前 doc 并同步 lastNotifiedMarkdown，清掉 pending timer。
     * - `view.setProps({ editable: () => false })`：PM 真实权限边界——
     *   keydown/paste/drop/IME 全部在 editHandlers 里被 view.editable 关断，
     *   contenteditable 属性同步更新（已核对 prosemirror-view 实现）。
     * - 事务门（lockGatePlugin 的 filterTransaction）：程序化入口（工具条/
     *   封面操作/命令 dispatch）在锁定期间事务一律被过滤，零效果。
     *   R4-2：绝不替换/删除 view.dispatch——构造器 bound 方法一旦被
     *   delete，keymap 命令内部裸调用 dispatch 会丢 this 直接 TypeError。
     * 不 blur、不碰焦点、不改全局 textarea——锁定的是本实例。
     * 返回 true = 已锁定（含此前已锁）；false = busy/不可用，调用方应
     * 放弃本次保存窗口并保留编辑状态（可重试）。
     */
    async lockEditing() {
      if (G || Je) return !0;
      const p = oe();
      return !p || p.composing && (!await new Promise((y) => {
        const k = p.dom;
        let w = !1;
        const M = (F) => {
          w || (w = !0, k.removeEventListener("compositionend", T), clearTimeout(P), y(F));
        }, T = () => M(!0);
        k.addEventListener("compositionend", T);
        const P = setTimeout(() => M(!1), 2e3);
      }) || (await new Promise((y) => setTimeout(y, 0)), G) || p.composing) || G ? !1 : (_e && (clearTimeout(_e), _e = null), _n = Ds(), Je = !0, p.setProps({ editable: () => !1 }), !0);
    },
    unlockEditing() {
      if (G || !Je) return;
      Je = !1;
      const p = oe();
      p && p.setProps({ editable: () => !0 });
    },
    isEditingLocked() {
      return Je;
    },
    // R3-2：撤销/重做可达资源引用集合（相对/非外链）快照。
    getEverReferencedResources() {
      return [...As];
    },
    getMarkdown() {
      _e && (clearTimeout(_e), _e = null);
      const p = Ds();
      return _n = p, p;
    },
    // Reuse the existing empty-paragraph image command in isolated workspaces.
    insertImageAsset() {
      return L || G || Wn() ? Promise.resolve(!1) : qf();
    },
    getBaselineMarkdown() {
      return Vf;
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
    setCoverImage(p) {
      return G ? !1 : ct.action((g) => {
        const y = g.get(Re);
        if (!y || y.composing || ze.some((me) => me.kind === "duplicate"))
          return !1;
        const k = y.state, w = ZA(k, p);
        if (!w || !k.schema.nodes[ut]) return !1;
        const T = mo(k), P = w.blockStart, F = w.blockEnd, V = xp(y, P);
        let Q = k.tr;
        if (T) {
          const me = T.pos, ve = T.pos + T.node.nodeSize;
          me < P ? (Q = Q.replaceWith(P, F, Js(k.schema, w.attrs)), Q = Q.replaceWith(me, ve, go(k.schema, T.node.attrs))) : (Q = Q.replaceWith(me, ve, go(k.schema, T.node.attrs)), Q = Q.replaceWith(P, F, Js(k.schema, w.attrs)));
        } else
          Q = Q.replaceWith(P, F, Js(k.schema, w.attrs));
        y.dispatch(wn(Q)), y.dom.dispatchEvent(new Event("nutbook:normalize-local-images"));
        const ue = mo(y.state);
        return ue && Cp(y, V, ue.pos), Be(), He(), je(), Ve(), !0;
      });
    },
    /**
     * 取消当前封面：仅移除 marker/wrapper，图片原地保留为普通正文。
     * @returns {boolean} 是否已提交
     */
    removeCover() {
      return G ? !1 : ct.action((p) => {
        const g = p.get(Re);
        if (!g || g.composing || ze.some((T) => T.kind === "duplicate"))
          return !1;
        const y = mo(g.state);
        if (!y) return !1;
        const k = xp(g, y.pos), w = go(g.state.schema, y.node.attrs);
        let M = g.state.tr.replaceWith(
          y.pos,
          y.pos + y.node.nodeSize,
          w
        );
        return g.dispatch(wn(M)), g.dom.dispatchEvent(new Event("nutbook:normalize-local-images")), Cp(g, k, y.pos), Be(), He(), je(), Ve(), !0;
      });
    },
    /**
     * 读取当前封面身份与结构化诊断。
     * @returns {{hasCover:boolean, valid:boolean, duplicate:boolean,
     *   diagnostics:Array<{kind:string,count?:number}>, nodeKind:string|null,
     *   pos:number|null, src:string|null}}
     */
    getCoverState() {
      return G ? { hasCover: !1, valid: !1, duplicate: !1, diagnostics: [], nodeKind: null, pos: null, src: null } : ct.action((p) => {
        const g = p.get(Re), y = mo(g.state), k = ze.some((w) => w.kind === "duplicate");
        return {
          hasCover: !!y,
          valid: !!y && !k,
          duplicate: k,
          diagnostics: ze.map((w) => ({ ...w })),
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
      return G ? [] : ct.action((p) => {
        const g = p.get(Re), y = [];
        return g.state.doc.descendants((k, w) => {
          var M;
          if (k.type.name === nt && ((M = k.attrs) != null && M.src))
            return y.push({ pos: w, nodeKind: "portable-image", src: String(k.attrs.src), alt: String(k.attrs.alt || "") }), !0;
          if (k.type.name === "paragraph" && k.childCount === 1) {
            const T = k.firstChild;
            if (T.type.name === "image") {
              const P = Kc(T);
              y.push({
                pos: w,
                nodeKind: P ? "linked-image" : "image",
                src: String(T.attrs.src || ""),
                alt: String(T.attrs.alt || "")
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
    setDocumentTitle(p) {
      if (G) return !1;
      const g = String(p || "").trim();
      return g ? ct.action((y) => {
        const k = y.get(Re);
        if (!k || k.composing)
          return !1;
        const w = k.state, { doc: M } = w, T = yp(M, w.schema);
        if (T && T.node.textContent.trim() === g)
          return !1;
        let P = w.tr;
        if (T) {
          const F = w.schema.text(g), V = T.node.type.create(T.node.attrs, F);
          P = P.replaceWith(T.pos, T.pos + T.node.nodeSize, V);
        } else {
          const F = w.schema.nodes.heading.create({ level: 1 }, w.schema.text(g)), V = M.firstChild;
          V && V.type.name === "paragraph" && V.textContent.trim() === "" ? P = P.replaceWith(0, V.nodeSize, F) : P = P.insert(0, F);
        }
        return k.dispatch(wn(P)), Be(), k.focus(), !0;
      }) : !1;
    },
    /**
     * 读取当前编辑器文档的权威标题（第一个有效顶层 H1 的纯文本）。
     * @returns {string|null} 无有效 H1 时返回 null
     */
    getDocumentTitle() {
      return G ? null : ct.action((p) => {
        const g = p.get(Re);
        if (!g)
          return null;
        const y = yp(g.state.doc, g.state.schema);
        return y ? y.node.textContent.trim() : null;
      });
    },
    hasChanges() {
      return be || K;
    },
    setTableToolsEnabled(p) {
      G || (s = !!p, s ? (id(), je()) : od());
    },
    undo() {
      return na(Po);
    },
    redo() {
      return na(yi);
    },
    openFind: jf,
    closeFind: Yl,
    focus() {
      G || ct.action((p) => {
        p.get(Re).focus();
      });
    },
    blur() {
      G || ct.action((p) => {
        p.get(Re).dom.blur();
      });
    },
    // The insert controls live in the document-shell overlay rather than in
    // Milkdown.  A preserved editor session can be moved into a freshly
    // rendered shell, so the host rebind is explicit and does not touch PM
    // selection/history state.
    rebindInsertMenuHost(p = null) {
      return G || !le ? !1 : (Pe = Zl(p), le.parentNode !== Pe && Pe.appendChild(le), Ve(), !0);
    },
    focusAtText(p, g = 0) {
      if (G) return !1;
      const y = Tp(p);
      return y ? ct.action((k) => {
        const w = k.get(Re);
        let M = null;
        return w.state.doc.descendants((T, P) => {
          if (M !== null) return !1;
          if (!T.isText) return !0;
          const F = T.text || "", V = Tp(F);
          if (V.indexOf(y) < 0 && !y.includes(V)) return !0;
          const ue = F.indexOf(p), me = ue >= 0 ? ue : 0;
          return M = Math.max(P + 1, Math.min(P + F.length, P + 1 + me + Math.max(0, g))), !1;
        }), M === null ? (w.focus(), !1) : (w.dispatch(w.state.tr.setSelection(ee.create(w.state.doc, M)).scrollIntoView()), w.focus(), !0);
      }) : (Kn.focus(), !1);
    },
    destroy() {
      G = !0, Vn == null || Vn.abort(), E && E.remove(), t.removeEventListener("keydown", Wf, !0), window.removeEventListener("scroll", oo, !0), window.removeEventListener("resize", oo), Tt && cancelAnimationFrame(Tt), _e && (clearTimeout(_e), _e = null), Ee && (cancelAnimationFrame(Ee), Ee = null), ne && (["keyup", "mouseup", "focusin", "pointerup"].forEach((p) => {
        t.removeEventListener(p, He, !0);
      }), document.removeEventListener("selectionchange", He), window.removeEventListener("scroll", He, !0), window.removeEventListener("resize", He), t.removeEventListener("focusout", rd, !0), ne.remove(), ne = null), gn && (cancelAnimationFrame(gn), gn = null), Mt && (["keyup", "mouseup", "focusin", "pointerup"].forEach((p) => {
        t.removeEventListener(p, Bt, !0);
      }), window.removeEventListener("scroll", Bt, !0), window.removeEventListener("resize", Bt), et.forEach((p) => p.remove()), et.clear(), Mt.remove(), Mt = null), od(), at && (cancelAnimationFrame(at), at = null), le && (["keyup", "mouseup", "focusin", "pointerup"].forEach((p) => {
        t.removeEventListener(p, Ve, !0);
      }), t.removeEventListener("keydown", Kf, !0), t.removeEventListener("pointerdown", Uf, !0), window.removeEventListener("scroll", Ve, !0), window.removeEventListener("resize", Ve), t.removeEventListener("focusout", Jf, !0), le.remove(), le = null, Pe = null), Pt && (cancelAnimationFrame(Pt), Pt = null), de && (t.removeEventListener("pointerover", Qf, !0), t.removeEventListener("pointerout", Zf, !0), window.removeEventListener("scroll", xr, !0), window.removeEventListener("resize", xr), de.remove(), de = null, ke = null);
      for (const p of _k)
        t.removeEventListener(p, Be, !0);
      t.removeEventListener("keydown", $f, !0), ct.destroy(), t.innerHTML = "", El.delete(t);
    }
  };
  return El.set(t, Kn), Kn;
}
window.NutbookMarkdownEditor = {
  create: sI,
  destroy(t) {
    $k(t);
  },
  // 权威标题语义的静态入口（与 dist/assets/markdown-document-title.js 同一实现）。
  parseDocumentTitle: Dk,
  setDocumentTitleInSource: gA
};
