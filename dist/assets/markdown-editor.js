var sc = (t) => {
  throw TypeError(t);
};
var lc = (t, e, n) => e.has(t) || sc("Cannot " + n);
var C = (t, e, n) => (lc(t, e, "read from private field"), n ? n.call(t) : e.get(t)), F = (t, e, n) => e.has(t) ? sc("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, n), R = (t, e, n, r) => (lc(t, e, "write to private field"), r ? r.call(t, n) : e.set(t, n), n);
var dt = /* @__PURE__ */ function(t) {
  return t.docTypeError = "docTypeError", t.contextNotFound = "contextNotFound", t.timerNotFound = "timerNotFound", t.ctxCallOutOfScope = "ctxCallOutOfScope", t.createNodeInParserFail = "createNodeInParserFail", t.stackOverFlow = "stackOverFlow", t.parserMatchError = "parserMatchError", t.serializerMatchError = "serializerMatchError", t.getAtomFromSchemaFail = "getAtomFromSchemaFail", t.expectDomTypeError = "expectDomTypeError", t.callCommandBeforeEditorView = "callCommandBeforeEditorView", t.missingRootElement = "missingRootElement", t.missingNodeInSchema = "missingNodeInSchema", t.missingMarkInSchema = "missingMarkInSchema", t.ctxNotBind = "ctxNotBind", t.missingYjsDoc = "missingYjsDoc", t.aiProviderError = "aiProviderError", t.aiBuildContextError = "aiBuildContextError", t;
}({}), pt = class extends Error {
  constructor(t, e, n) {
    super(e, n), this.name = "MilkdownError", this.code = t, (n == null ? void 0 : n.cause) !== void 0 && (this.cause = n.cause);
  }
}, hg = (t, e) => typeof e == "function" ? "[Function]" : e, ks = (t) => JSON.stringify(t, hg);
function dg(t) {
  return new pt(dt.docTypeError, `Doc type error, unsupported type: ${ks(t)}`);
}
function pg(t) {
  return new pt(dt.contextNotFound, `Context "${t}" not found, do you forget to inject it?`);
}
function mg(t) {
  return new pt(dt.timerNotFound, `Timer "${t}" not found, do you forget to record it?`);
}
function bs() {
  return new pt(dt.ctxCallOutOfScope, "Should not call a context out of the plugin.");
}
function gg(t, e, n) {
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
  return new pt(dt.createNodeInParserFail, o.join(`
`));
}
function kh() {
  return new pt(dt.stackOverFlow, "Stack over flow, cannot pop on an empty stack.");
}
function yg(t) {
  return new pt(dt.parserMatchError, `Cannot match target parser for node: ${ks(t)}.`);
}
function kg(t) {
  return new pt(dt.serializerMatchError, `Cannot match target serializer for node: ${ks(t)}.`);
}
function Ot(t) {
  return new pt(dt.expectDomTypeError, `Expect to be a dom, but get: ${ks(t)}.`);
}
function Fs() {
  return new pt(dt.callCommandBeforeEditorView, "You're trying to call a command before editor view initialized, make sure to get commandManager from ctx after editor view has been initialized");
}
function bg(t) {
  return new pt(dt.missingNodeInSchema, `Missing node in schema, milkdown cannot find "${t}" in schema.`);
}
function wg(t) {
  return new pt(dt.missingMarkInSchema, `Missing mark in schema, milkdown cannot find "${t}" in schema.`);
}
var bh = class {
  constructor() {
    this.sliceMap = /* @__PURE__ */ new Map(), this.get = (t) => {
      const e = typeof t == "string" ? [...this.sliceMap.values()].find((n) => n.type.name === t) : this.sliceMap.get(t.id);
      if (!e) throw pg(typeof t == "string" ? t : t.name);
      return e;
    }, this.remove = (t) => {
      const e = typeof t == "string" ? [...this.sliceMap.values()].find((n) => n.type.name === t) : this.sliceMap.get(t.id);
      e && this.sliceMap.delete(e.type.id);
    }, this.has = (t) => typeof t == "string" ? [...this.sliceMap.values()].some((e) => e.type.name === t) : this.sliceMap.has(t.id);
  }
}, yt, _t, Sr, dh, xg = (dh = class {
  constructor(e, n, r) {
    F(this, yt);
    F(this, _t);
    F(this, Sr);
    R(this, yt, []), R(this, Sr, () => {
      C(this, yt).forEach((i) => i(C(this, _t)));
    }), this.set = (i) => {
      R(this, _t, i), C(this, Sr).call(this);
    }, this.get = () => C(this, _t), this.update = (i) => {
      R(this, _t, i(C(this, _t))), C(this, Sr).call(this);
    }, this.type = r, R(this, _t, n), e.set(r.id, this);
  }
  on(e) {
    return C(this, yt).push(e), () => {
      R(this, yt, C(this, yt).filter((n) => n !== e));
    };
  }
  once(e) {
    const n = this.on((r) => {
      e(r), n();
    });
    return n;
  }
  off(e) {
    R(this, yt, C(this, yt).filter((n) => n !== e));
  }
  offAll() {
    R(this, yt, []);
  }
}, yt = new WeakMap(), _t = new WeakMap(), Sr = new WeakMap(), dh), Cg = class {
  constructor(t, e) {
    this.id = Symbol(`Context-${e}`), this.name = e, this._defaultValue = t, this._typeInfo = () => {
      throw bs();
    };
  }
  create(t, e = this._defaultValue) {
    return new xg(t, e, this);
  }
}, ee = (t, e) => new Cg(t, e), Vi, Hi, ji, zn, Mr, hn, Nr, Tr, vr, ph, Sg = (ph = class {
  constructor(t, e, n) {
    F(this, Vi);
    F(this, Hi);
    F(this, ji);
    F(this, zn);
    F(this, Mr);
    F(this, hn);
    F(this, Nr);
    F(this, Tr);
    F(this, vr);
    R(this, zn, /* @__PURE__ */ new Set()), R(this, Mr, /* @__PURE__ */ new Set()), R(this, hn, /* @__PURE__ */ new Map()), R(this, Nr, /* @__PURE__ */ new Map()), this.read = () => ({
      metadata: C(this, Vi),
      injectedSlices: [...C(this, zn)].map((r) => ({
        name: typeof r == "string" ? r : r.name,
        value: C(this, Tr).call(this, r)
      })),
      consumedSlices: [...C(this, Mr)].map((r) => ({
        name: typeof r == "string" ? r : r.name,
        value: C(this, Tr).call(this, r)
      })),
      recordedTimers: [...C(this, hn)].map(([r, { duration: i }]) => ({
        name: r.name,
        duration: i,
        status: C(this, vr).call(this, r)
      })),
      waitTimers: [...C(this, Nr)].map(([r, { duration: i }]) => ({
        name: r.name,
        duration: i,
        status: C(this, vr).call(this, r)
      }))
    }), this.onRecord = (r) => {
      C(this, hn).set(r, {
        start: Date.now(),
        duration: 0
      });
    }, this.onClear = (r) => {
      C(this, hn).delete(r);
    }, this.onDone = (r) => {
      const i = C(this, hn).get(r);
      i && (i.duration = Date.now() - i.start);
    }, this.onWait = (r, i) => {
      const o = Date.now();
      i.finally(() => {
        C(this, Nr).set(r, { duration: Date.now() - o });
      }).catch(console.error);
    }, this.onInject = (r) => {
      C(this, zn).add(r);
    }, this.onRemove = (r) => {
      C(this, zn).delete(r);
    }, this.onUse = (r) => {
      C(this, Mr).add(r);
    }, R(this, Tr, (r) => C(this, Hi).get(r).get()), R(this, vr, (r) => C(this, ji).get(r).status), R(this, Hi, t), R(this, ji, e), R(this, Vi, n);
  }
}, Vi = new WeakMap(), Hi = new WeakMap(), ji = new WeakMap(), zn = new WeakMap(), Mr = new WeakMap(), hn = new WeakMap(), Nr = new WeakMap(), Tr = new WeakMap(), vr = new WeakMap(), ph), Vt, Ht, qi, st, Ir, Mg = (Ir = class {
  constructor(e, n, r) {
    F(this, Vt);
    F(this, Ht);
    F(this, qi);
    F(this, st);
    this.produce = (i) => i && Object.keys(i).length ? new Ir(C(this, Vt), C(this, Ht), { ...i }) : this, this.inject = (i, o) => {
      var l;
      const s = i.create(C(this, Vt).sliceMap);
      return o != null && s.set(o), (l = C(this, st)) == null || l.onInject(i), this;
    }, this.remove = (i) => {
      var o;
      return C(this, Vt).remove(i), (o = C(this, st)) == null || o.onRemove(i), this;
    }, this.record = (i) => {
      var o;
      return i.create(C(this, Ht).store), (o = C(this, st)) == null || o.onRecord(i), this;
    }, this.clearTimer = (i) => {
      var o;
      return C(this, Ht).remove(i), (o = C(this, st)) == null || o.onClear(i), this;
    }, this.isInjected = (i) => C(this, Vt).has(i), this.isRecorded = (i) => C(this, Ht).has(i), this.use = (i) => {
      var o;
      return (o = C(this, st)) == null || o.onUse(i), C(this, Vt).get(i);
    }, this.get = (i) => this.use(i).get(), this.set = (i, o) => this.use(i).set(o), this.update = (i, o) => this.use(i).update(o), this.timer = (i) => C(this, Ht).get(i), this.done = (i) => {
      var o;
      this.timer(i).done(), (o = C(this, st)) == null || o.onDone(i);
    }, this.wait = (i) => {
      var s;
      const o = this.timer(i).start();
      return (s = C(this, st)) == null || s.onWait(i, o), o;
    }, this.waitTimers = async (i) => {
      await Promise.all(this.get(i).map((o) => this.wait(o)));
    }, R(this, Vt, e), R(this, Ht, n), R(this, qi, r), r && R(this, st, new Sg(e, n, r));
  }
  get meta() {
    return C(this, qi);
  }
  get inspector() {
    return C(this, st);
  }
}, Vt = new WeakMap(), Ht = new WeakMap(), qi = new WeakMap(), st = new WeakMap(), Ir), Ng = class {
  constructor() {
    this.store = /* @__PURE__ */ new Map(), this.get = (t) => {
      const e = this.store.get(t.id);
      if (!e) throw mg(t.name);
      return e;
    }, this.remove = (t) => {
      this.store.delete(t.id);
    }, this.has = (t) => this.store.has(t.id);
  }
}, Ar, dn, Er, jt, Or, Wi, mh, Tg = (mh = class {
  constructor(t, e) {
    F(this, Ar);
    F(this, dn);
    F(this, Er);
    F(this, jt);
    F(this, Or);
    F(this, Wi);
    R(this, Ar, null), R(this, dn, null), R(this, jt, "pending"), this.start = () => (C(this, Ar) ?? R(this, Ar, new Promise((n, r) => {
      R(this, dn, (i) => {
        i instanceof CustomEvent && i.detail.id === C(this, Er) && (R(this, jt, "resolved"), C(this, Or).call(this), i.stopImmediatePropagation(), n());
      }), C(this, Wi).call(this, () => {
        C(this, jt) === "pending" && R(this, jt, "rejected"), C(this, Or).call(this), r(/* @__PURE__ */ new Error(`Timing ${this.type.name} timeout.`));
      }), R(this, jt, "pending"), addEventListener(this.type.name, C(this, dn));
    })), C(this, Ar)), this.done = () => {
      const n = new CustomEvent(this.type.name, { detail: { id: C(this, Er) } });
      dispatchEvent(n);
    }, R(this, Or, () => {
      C(this, dn) && removeEventListener(this.type.name, C(this, dn));
    }), R(this, Wi, (n) => {
      setTimeout(() => {
        n();
      }, this.type.timeout);
    }), R(this, Er, Symbol(e.name)), this.type = e, t.set(e.id, this);
  }
  get status() {
    return C(this, jt);
  }
}, Ar = new WeakMap(), dn = new WeakMap(), Er = new WeakMap(), jt = new WeakMap(), Or = new WeakMap(), Wi = new WeakMap(), mh), vg = class {
  constructor(t, e = 3e3) {
    this.create = (n) => new Tg(n, this), this.id = Symbol(`Timer-${t}`), this.name = t, this.timeout = e;
  }
}, Dt = (t, e = 3e3) => new vg(t, e);
const Ig = {};
function xa(t, e) {
  const n = Ig, r = typeof n.includeImageAlt == "boolean" ? n.includeImageAlt : !0, i = typeof n.includeHtml == "boolean" ? n.includeHtml : !0;
  return wh(t, r, i);
}
function wh(t, e, n) {
  if (Ag(t)) {
    if ("value" in t)
      return t.type === "html" && !n ? "" : t.value;
    if (e && "alt" in t && t.alt)
      return t.alt;
    if ("children" in t)
      return ac(t.children, e, n);
  }
  return Array.isArray(t) ? ac(t, e, n) : "";
}
function ac(t, e, n) {
  const r = [];
  let i = -1;
  for (; ++i < t.length; )
    r[i] = wh(t[i], e, n);
  return r.join("");
}
function Ag(t) {
  return !!(t && typeof t == "object");
}
const uc = document.createElement("i");
function Ca(t) {
  const e = "&" + t + ";";
  uc.innerHTML = e;
  const n = uc.textContent;
  return n.charCodeAt(n.length - 1) === 59 && t !== "semi" || n === e ? !1 : n;
}
function tt(t, e, n, r) {
  const i = t.length;
  let o = 0, s;
  if (e < 0 ? e = -e > i ? 0 : i + e : e = e > i ? i : e, n = n > 0 ? n : 0, r.length < 1e4)
    s = Array.from(r), s.unshift(e, n), t.splice(...s);
  else
    for (n && t.splice(e, n); o < r.length; )
      s = r.slice(o, o + 1e4), s.unshift(e, 0), t.splice(...s), o += 1e4, e += 1e4;
}
function ut(t, e) {
  return t.length > 0 ? (tt(t, t.length, 0, e), t) : e;
}
const cc = {}.hasOwnProperty;
function xh(t) {
  const e = {};
  let n = -1;
  for (; ++n < t.length; )
    Eg(e, t[n]);
  return e;
}
function Eg(t, e) {
  let n;
  for (n in e) {
    const i = (cc.call(t, n) ? t[n] : void 0) || (t[n] = {}), o = e[n];
    let s;
    if (o)
      for (s in o) {
        cc.call(i, s) || (i[s] = []);
        const l = o[s];
        Og(
          // @ts-expect-error Looks like a list.
          i[s],
          Array.isArray(l) ? l : l ? [l] : []
        );
      }
  }
}
function Og(t, e) {
  let n = -1;
  const r = [];
  for (; ++n < e.length; )
    (e[n].add === "after" ? t : r).push(e[n]);
  tt(t, 0, 0, r);
}
function Ch(t, e) {
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
function wt(t) {
  return t.replace(/[\t\n\r ]+/g, " ").replace(/^ | $/g, "").toLowerCase().toUpperCase();
}
const Le = Tn(/[A-Za-z]/), He = Tn(/[\dA-Za-z]/), Dg = Tn(/[#-'*+\--9=?A-Z^-~]/);
function Zo(t) {
  return (
    // Special whitespace codes (which have negative values), C0 and Control
    // character DEL
    t !== null && (t < 32 || t === 127)
  );
}
const Rl = Tn(/\d/), Rg = Tn(/[\dA-Fa-f]/), Lg = Tn(/[!-/:-@[-`{-~]/);
function j(t) {
  return t !== null && t < -2;
}
function se(t) {
  return t !== null && (t < 0 || t === 32);
}
function Z(t) {
  return t === -2 || t === -1 || t === 32;
}
const ws = Tn(new RegExp("[\\u0021-\\u002F\\u003A-\\u0040\\u005B-\\u0060\\u007B-\\u007E]")), er = Tn(/\s/);
function Tn(t) {
  return e;
  function e(n) {
    return n !== null && n > -1 && t.test(String.fromCharCode(n));
  }
}
function te(t, e, n, r) {
  const i = r ? r - 1 : Number.POSITIVE_INFINITY;
  let o = 0;
  return s;
  function s(a) {
    return Z(a) ? (t.enter(n), l(a)) : e(a);
  }
  function l(a) {
    return Z(a) && o++ < i ? (t.consume(a), l) : (t.exit(n), e(a));
  }
}
const Pg = {
  tokenize: zg
};
function zg(t) {
  const e = t.attempt(this.parser.constructs.contentInitial, r, i);
  let n;
  return e;
  function r(l) {
    if (l === null) {
      t.consume(l);
      return;
    }
    return t.enter("lineEnding"), t.consume(l), t.exit("lineEnding"), te(t, e, "linePrefix");
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
    return j(l) ? (t.consume(l), t.exit("chunkText"), o) : (t.consume(l), s);
  }
}
const Bg = {
  tokenize: Fg
}, fc = {
  tokenize: $g
};
function Fg(t) {
  const e = this, n = [];
  let r = 0, i, o, s;
  return l;
  function l(T) {
    if (r < n.length) {
      const B = n[r];
      return e.containerState = B[1], t.attempt(B[0].continuation, a, u)(T);
    }
    return u(T);
  }
  function a(T) {
    if (r++, e.containerState._closeFlow) {
      e.containerState._closeFlow = void 0, i && E();
      const B = e.events.length;
      let z = B, S;
      for (; z--; )
        if (e.events[z][0] === "exit" && e.events[z][1].type === "chunkFlow") {
          S = e.events[z][1].end;
          break;
        }
      g(r);
      let D = B;
      for (; D < e.events.length; )
        e.events[D][1].end = {
          ...S
        }, D++;
      return tt(e.events, z + 1, 0, e.events.slice(B)), e.events.length = D, u(T);
    }
    return l(T);
  }
  function u(T) {
    if (r === n.length) {
      if (!i)
        return d(T);
      if (i.currentConstruct && i.currentConstruct.concrete)
        return p(T);
      e.interrupt = !!(i.currentConstruct && !i._gfmTableDynamicInterruptHack);
    }
    return e.containerState = {}, t.check(fc, c, f)(T);
  }
  function c(T) {
    return i && E(), g(r), d(T);
  }
  function f(T) {
    return e.parser.lazy[e.now().line] = r !== n.length, s = e.now().offset, p(T);
  }
  function d(T) {
    return e.containerState = {}, t.attempt(fc, h, p)(T);
  }
  function h(T) {
    return r++, n.push([e.currentConstruct, e.containerState]), d(T);
  }
  function p(T) {
    if (T === null) {
      i && E(), g(0), t.consume(T);
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
      y(t.exit("chunkFlow"), !0), g(0), t.consume(T);
      return;
    }
    return j(T) ? (t.consume(T), y(t.exit("chunkFlow")), r = 0, e.interrupt = void 0, l) : (t.consume(T), m);
  }
  function y(T, B) {
    const z = e.sliceStream(T);
    if (B && z.push(null), T.previous = o, o && (o.next = T), o = T, i.defineSkip(T.start), i.write(z), e.parser.lazy[T.start.line]) {
      let S = i.events.length;
      for (; S--; )
        if (
          // The token starts before the line ending…
          i.events[S][1].start.offset < s && // …and either is not ended yet…
          (!i.events[S][1].end || // …or ends after it.
          i.events[S][1].end.offset > s)
        )
          return;
      const D = e.events.length;
      let V = D, q, N;
      for (; V--; )
        if (e.events[V][0] === "exit" && e.events[V][1].type === "chunkFlow") {
          if (q) {
            N = e.events[V][1].end;
            break;
          }
          q = !0;
        }
      for (g(r), S = D; S < e.events.length; )
        e.events[S][1].end = {
          ...N
        }, S++;
      tt(e.events, V + 1, 0, e.events.slice(D)), e.events.length = S;
    }
  }
  function g(T) {
    let B = n.length;
    for (; B-- > T; ) {
      const z = n[B];
      e.containerState = z[1], z[0].exit.call(e, t);
    }
    n.length = T;
  }
  function E() {
    i.write([null]), o = void 0, i = void 0, e.containerState._closeFlow = void 0;
  }
}
function $g(t, e, n) {
  return te(t, t.attempt(this.parser.constructs.document, e, n), "linePrefix", this.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4);
}
function jr(t) {
  if (t === null || se(t) || er(t))
    return 1;
  if (ws(t))
    return 2;
}
function xs(t, e, n) {
  const r = [];
  let i = -1;
  for (; ++i < t.length; ) {
    const o = t[i].resolveAll;
    o && !r.includes(o) && (e = o(e, n), r.push(o));
  }
  return e;
}
const Ll = {
  name: "attention",
  resolveAll: _g,
  tokenize: Vg
};
function _g(t, e) {
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
          hc(f, -a), hc(d, a), s = {
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
          }, u = [], t[r][1].end.offset - t[r][1].start.offset && (u = ut(u, [["enter", t[r][1], e], ["exit", t[r][1], e]])), u = ut(u, [["enter", i, e], ["enter", s, e], ["exit", s, e], ["enter", o, e]]), u = ut(u, xs(e.parser.constructs.insideSpan.null, t.slice(r + 1, n), e)), u = ut(u, [["exit", o, e], ["enter", l, e], ["exit", l, e], ["exit", i, e]]), t[n][1].end.offset - t[n][1].start.offset ? (c = 2, u = ut(u, [["enter", t[n][1], e], ["exit", t[n][1], e]])) : c = 0, tt(t, r - 1, n - r + 3, u), n = r + u.length - c - 2;
          break;
        }
    }
  for (n = -1; ++n < t.length; )
    t[n][1].type === "attentionSequence" && (t[n][1].type = "data");
  return t;
}
function Vg(t, e) {
  const n = this.parser.constructs.attentionMarkers.null, r = this.previous, i = jr(r);
  let o;
  return s;
  function s(a) {
    return o = a, t.enter("attentionSequence"), l(a);
  }
  function l(a) {
    if (a === o)
      return t.consume(a), l;
    const u = t.exit("attentionSequence"), c = jr(a), f = !c || c === 2 && i || n.includes(a), d = !i || i === 2 && c || n.includes(r);
    return u._open = !!(o === 42 ? f : f && (i || !d)), u._close = !!(o === 42 ? d : d && (c || !f)), e(a);
  }
}
function hc(t, e) {
  t.column += e, t.offset += e, t._bufferIndex += e;
}
const Hg = {
  name: "autolink",
  tokenize: jg
};
function jg(t, e, n) {
  let r = 0;
  return i;
  function i(h) {
    return t.enter("autolink"), t.enter("autolinkMarker"), t.consume(h), t.exit("autolinkMarker"), t.enter("autolinkProtocol"), o;
  }
  function o(h) {
    return Le(h) ? (t.consume(h), s) : h === 64 ? n(h) : u(h);
  }
  function s(h) {
    return h === 43 || h === 45 || h === 46 || He(h) ? (r = 1, l(h)) : u(h);
  }
  function l(h) {
    return h === 58 ? (t.consume(h), r = 0, a) : (h === 43 || h === 45 || h === 46 || He(h)) && r++ < 32 ? (t.consume(h), l) : (r = 0, u(h));
  }
  function a(h) {
    return h === 62 ? (t.exit("autolinkProtocol"), t.enter("autolinkMarker"), t.consume(h), t.exit("autolinkMarker"), t.exit("autolink"), e) : h === null || h === 32 || h === 60 || Zo(h) ? n(h) : (t.consume(h), a);
  }
  function u(h) {
    return h === 64 ? (t.consume(h), c) : Dg(h) ? (t.consume(h), u) : n(h);
  }
  function c(h) {
    return He(h) ? f(h) : n(h);
  }
  function f(h) {
    return h === 46 ? (t.consume(h), r = 0, c) : h === 62 ? (t.exit("autolinkProtocol").type = "autolinkEmail", t.enter("autolinkMarker"), t.consume(h), t.exit("autolinkMarker"), t.exit("autolink"), e) : d(h);
  }
  function d(h) {
    if ((h === 45 || He(h)) && r++ < 63) {
      const p = h === 45 ? d : f;
      return t.consume(h), p;
    }
    return n(h);
  }
}
const oo = {
  partial: !0,
  tokenize: qg
};
function qg(t, e, n) {
  return r;
  function r(o) {
    return Z(o) ? te(t, i, "linePrefix")(o) : i(o);
  }
  function i(o) {
    return o === null || j(o) ? e(o) : n(o);
  }
}
const Sh = {
  continuation: {
    tokenize: Kg
  },
  exit: Ug,
  name: "blockQuote",
  tokenize: Wg
};
function Wg(t, e, n) {
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
    return Z(s) ? (t.enter("blockQuotePrefixWhitespace"), t.consume(s), t.exit("blockQuotePrefixWhitespace"), t.exit("blockQuotePrefix"), e) : (t.exit("blockQuotePrefix"), e(s));
  }
}
function Kg(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return Z(s) ? te(t, o, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(s) : o(s);
  }
  function o(s) {
    return t.attempt(Sh, e, n)(s);
  }
}
function Ug(t) {
  t.exit("blockQuote");
}
const Mh = {
  name: "characterEscape",
  tokenize: Jg
};
function Jg(t, e, n) {
  return r;
  function r(o) {
    return t.enter("characterEscape"), t.enter("escapeMarker"), t.consume(o), t.exit("escapeMarker"), i;
  }
  function i(o) {
    return Lg(o) ? (t.enter("characterEscapeValue"), t.consume(o), t.exit("characterEscapeValue"), t.exit("characterEscape"), e) : n(o);
  }
}
const Nh = {
  name: "characterReference",
  tokenize: Gg
};
function Gg(t, e, n) {
  const r = this;
  let i = 0, o, s;
  return l;
  function l(f) {
    return t.enter("characterReference"), t.enter("characterReferenceMarker"), t.consume(f), t.exit("characterReferenceMarker"), a;
  }
  function a(f) {
    return f === 35 ? (t.enter("characterReferenceMarkerNumeric"), t.consume(f), t.exit("characterReferenceMarkerNumeric"), u) : (t.enter("characterReferenceValue"), o = 31, s = He, c(f));
  }
  function u(f) {
    return f === 88 || f === 120 ? (t.enter("characterReferenceMarkerHexadecimal"), t.consume(f), t.exit("characterReferenceMarkerHexadecimal"), t.enter("characterReferenceValue"), o = 6, s = Rg, c) : (t.enter("characterReferenceValue"), o = 7, s = Rl, c(f));
  }
  function c(f) {
    if (f === 59 && i) {
      const d = t.exit("characterReferenceValue");
      return s === He && !Ca(r.sliceSerialize(d)) ? n(f) : (t.enter("characterReferenceMarker"), t.consume(f), t.exit("characterReferenceMarker"), t.exit("characterReference"), e);
    }
    return s(f) && i++ < o ? (t.consume(f), c) : n(f);
  }
}
const dc = {
  partial: !0,
  tokenize: Qg
}, pc = {
  concrete: !0,
  name: "codeFenced",
  tokenize: Yg
};
function Yg(t, e, n) {
  const r = this, i = {
    partial: !0,
    tokenize: z
  };
  let o = 0, s = 0, l;
  return a;
  function a(S) {
    return u(S);
  }
  function u(S) {
    const D = r.events[r.events.length - 1];
    return o = D && D[1].type === "linePrefix" ? D[2].sliceSerialize(D[1], !0).length : 0, l = S, t.enter("codeFenced"), t.enter("codeFencedFence"), t.enter("codeFencedFenceSequence"), c(S);
  }
  function c(S) {
    return S === l ? (s++, t.consume(S), c) : s < 3 ? n(S) : (t.exit("codeFencedFenceSequence"), Z(S) ? te(t, f, "whitespace")(S) : f(S));
  }
  function f(S) {
    return S === null || j(S) ? (t.exit("codeFencedFence"), r.interrupt ? e(S) : t.check(dc, m, B)(S)) : (t.enter("codeFencedFenceInfo"), t.enter("chunkString", {
      contentType: "string"
    }), d(S));
  }
  function d(S) {
    return S === null || j(S) ? (t.exit("chunkString"), t.exit("codeFencedFenceInfo"), f(S)) : Z(S) ? (t.exit("chunkString"), t.exit("codeFencedFenceInfo"), te(t, h, "whitespace")(S)) : S === 96 && S === l ? n(S) : (t.consume(S), d);
  }
  function h(S) {
    return S === null || j(S) ? f(S) : (t.enter("codeFencedFenceMeta"), t.enter("chunkString", {
      contentType: "string"
    }), p(S));
  }
  function p(S) {
    return S === null || j(S) ? (t.exit("chunkString"), t.exit("codeFencedFenceMeta"), f(S)) : S === 96 && S === l ? n(S) : (t.consume(S), p);
  }
  function m(S) {
    return t.attempt(i, B, y)(S);
  }
  function y(S) {
    return t.enter("lineEnding"), t.consume(S), t.exit("lineEnding"), g;
  }
  function g(S) {
    return o > 0 && Z(S) ? te(t, E, "linePrefix", o + 1)(S) : E(S);
  }
  function E(S) {
    return S === null || j(S) ? t.check(dc, m, B)(S) : (t.enter("codeFlowValue"), T(S));
  }
  function T(S) {
    return S === null || j(S) ? (t.exit("codeFlowValue"), E(S)) : (t.consume(S), T);
  }
  function B(S) {
    return t.exit("codeFenced"), e(S);
  }
  function z(S, D, V) {
    let q = 0;
    return N;
    function N(X) {
      return S.enter("lineEnding"), S.consume(X), S.exit("lineEnding"), _;
    }
    function _(X) {
      return S.enter("codeFencedFence"), Z(X) ? te(S, H, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(X) : H(X);
    }
    function H(X) {
      return X === l ? (S.enter("codeFencedFenceSequence"), Y(X)) : V(X);
    }
    function Y(X) {
      return X === l ? (q++, S.consume(X), Y) : q >= s ? (S.exit("codeFencedFenceSequence"), Z(X) ? te(S, le, "whitespace")(X) : le(X)) : V(X);
    }
    function le(X) {
      return X === null || j(X) ? (S.exit("codeFencedFence"), D(X)) : V(X);
    }
  }
}
function Qg(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return s === null ? n(s) : (t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), o);
  }
  function o(s) {
    return r.parser.lazy[r.now().line] ? n(s) : e(s);
  }
}
const $s = {
  name: "codeIndented",
  tokenize: Zg
}, Xg = {
  partial: !0,
  tokenize: ey
};
function Zg(t, e, n) {
  const r = this;
  return i;
  function i(u) {
    return t.enter("codeIndented"), te(t, o, "linePrefix", 5)(u);
  }
  function o(u) {
    const c = r.events[r.events.length - 1];
    return c && c[1].type === "linePrefix" && c[2].sliceSerialize(c[1], !0).length >= 4 ? s(u) : n(u);
  }
  function s(u) {
    return u === null ? a(u) : j(u) ? t.attempt(Xg, s, a)(u) : (t.enter("codeFlowValue"), l(u));
  }
  function l(u) {
    return u === null || j(u) ? (t.exit("codeFlowValue"), s(u)) : (t.consume(u), l);
  }
  function a(u) {
    return t.exit("codeIndented"), e(u);
  }
}
function ey(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return r.parser.lazy[r.now().line] ? n(s) : j(s) ? (t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), i) : te(t, o, "linePrefix", 5)(s);
  }
  function o(s) {
    const l = r.events[r.events.length - 1];
    return l && l[1].type === "linePrefix" && l[2].sliceSerialize(l[1], !0).length >= 4 ? e(s) : j(s) ? i(s) : n(s);
  }
}
const ty = {
  name: "codeText",
  previous: ry,
  resolve: ny,
  tokenize: iy
};
function ny(t) {
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
function ry(t) {
  return t !== 96 || this.events[this.events.length - 1][1].type === "characterEscape";
}
function iy(t, e, n) {
  let r = 0, i, o;
  return s;
  function s(f) {
    return t.enter("codeText"), t.enter("codeTextSequence"), l(f);
  }
  function l(f) {
    return f === 96 ? (t.consume(f), r++, l) : (t.exit("codeTextSequence"), a(f));
  }
  function a(f) {
    return f === null ? n(f) : f === 32 ? (t.enter("space"), t.consume(f), t.exit("space"), a) : f === 96 ? (o = t.enter("codeTextSequence"), i = 0, c(f)) : j(f) ? (t.enter("lineEnding"), t.consume(f), t.exit("lineEnding"), a) : (t.enter("codeTextData"), u(f));
  }
  function u(f) {
    return f === null || f === 32 || f === 96 || j(f) ? (t.exit("codeTextData"), a(f)) : (t.consume(f), u);
  }
  function c(f) {
    return f === 96 ? (t.consume(f), i++, c) : i === r ? (t.exit("codeTextSequence"), t.exit("codeText"), e(f)) : (o.type = "codeTextData", u(f));
  }
}
class oy {
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
    return r && ui(this.left, r), o.reverse();
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
    this.setCursor(Number.POSITIVE_INFINITY), ui(this.left, e);
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
    this.setCursor(0), ui(this.right, e.reverse());
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
        ui(this.right, n.reverse());
      } else {
        const n = this.right.splice(this.left.length + this.right.length - e, Number.POSITIVE_INFINITY);
        ui(this.left, n.reverse());
      }
  }
}
function ui(t, e) {
  let n = 0;
  if (e.length < 1e4)
    t.push(...e);
  else
    for (; n < e.length; )
      t.push(...e.slice(n, n + 1e4)), n += 1e4;
}
function Th(t) {
  const e = {};
  let n = -1, r, i, o, s, l, a, u;
  const c = new oy(t);
  for (; ++n < c.length; ) {
    for (; n in e; )
      n = e[n];
    if (r = c.get(n), n && r[1].type === "chunkFlow" && c.get(n - 1)[1].type === "listItemPrefix" && (a = r[1]._tokenizer.events, o = 0, o < a.length && a[o][1].type === "lineEndingBlank" && (o += 2), o < a.length && a[o][1].type === "content"))
      for (; ++o < a.length && a[o][1].type !== "content"; )
        a[o][1].type === "chunkText" && (a[o][1]._isInFirstContentOfListItem = !0, o++);
    if (r[0] === "enter")
      r[1].contentType && (Object.assign(e, sy(c, n)), n = e[n], u = !0);
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
  return tt(t, 0, Number.POSITIVE_INFINITY, c.slice(0)), !u;
}
function sy(t, e) {
  const n = t.get(e)[1], r = t.get(e)[2];
  let i = e - 1;
  const o = [];
  let s = n._tokenizer;
  s || (s = r.parser[n.contentType](n.start), n._contentTypeTextTrailing && (s._contentTypeTextTrailing = !0));
  const l = s.events, a = [], u = {};
  let c, f, d = -1, h = n, p = 0, m = 0;
  const y = [m];
  for (; h; ) {
    for (; t.get(++i)[1] !== h; )
      ;
    o.push(i), h._tokenizer || (c = r.sliceStream(h), h.next || c.push(null), f && s.defineSkip(h.start), h._isInFirstContentOfListItem && (s._gfmTasklistFirstContentOfListItem = !0), s.write(c), h._isInFirstContentOfListItem && (s._gfmTasklistFirstContentOfListItem = void 0)), f = h, h = h.next;
  }
  for (h = n; ++d < l.length; )
    // Find a void token that includes a break.
    l[d][0] === "exit" && l[d - 1][0] === "enter" && l[d][1].type === l[d - 1][1].type && l[d][1].start.line !== l[d][1].end.line && (m = d + 1, y.push(m), h._tokenizer = void 0, h.previous = void 0, h = h.next);
  for (s.events = [], h ? (h._tokenizer = void 0, h.previous = void 0) : y.pop(), d = y.length; d--; ) {
    const g = l.slice(y[d], y[d + 1]), E = o.pop();
    a.push([E, E + g.length - 1]), t.splice(E, 2, g);
  }
  for (a.reverse(), d = -1; ++d < a.length; )
    u[p + a[d][0]] = p + a[d][1], p += a[d][1] - a[d][0] - 1;
  return u;
}
const ly = {
  resolve: uy,
  tokenize: cy
}, ay = {
  partial: !0,
  tokenize: fy
};
function uy(t) {
  return Th(t), t;
}
function cy(t, e) {
  let n;
  return r;
  function r(l) {
    return t.enter("content"), n = t.enter("chunkContent", {
      contentType: "content"
    }), i(l);
  }
  function i(l) {
    return l === null ? o(l) : j(l) ? t.check(ay, s, o)(l) : (t.consume(l), i);
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
function fy(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return t.exit("chunkContent"), t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), te(t, o, "linePrefix");
  }
  function o(s) {
    if (s === null || j(s))
      return n(s);
    const l = r.events[r.events.length - 1];
    return !r.parser.constructs.disable.null.includes("codeIndented") && l && l[1].type === "linePrefix" && l[2].sliceSerialize(l[1], !0).length >= 4 ? e(s) : t.interrupt(r.parser.constructs.flow, n, e)(s);
  }
}
function vh(t, e, n, r, i, o, s, l, a) {
  const u = a || Number.POSITIVE_INFINITY;
  let c = 0;
  return f;
  function f(g) {
    return g === 60 ? (t.enter(r), t.enter(i), t.enter(o), t.consume(g), t.exit(o), d) : g === null || g === 32 || g === 41 || Zo(g) ? n(g) : (t.enter(r), t.enter(s), t.enter(l), t.enter("chunkString", {
      contentType: "string"
    }), m(g));
  }
  function d(g) {
    return g === 62 ? (t.enter(o), t.consume(g), t.exit(o), t.exit(i), t.exit(r), e) : (t.enter(l), t.enter("chunkString", {
      contentType: "string"
    }), h(g));
  }
  function h(g) {
    return g === 62 ? (t.exit("chunkString"), t.exit(l), d(g)) : g === null || g === 60 || j(g) ? n(g) : (t.consume(g), g === 92 ? p : h);
  }
  function p(g) {
    return g === 60 || g === 62 || g === 92 ? (t.consume(g), h) : h(g);
  }
  function m(g) {
    return !c && (g === null || g === 41 || se(g)) ? (t.exit("chunkString"), t.exit(l), t.exit(s), t.exit(r), e(g)) : c < u && g === 40 ? (t.consume(g), c++, m) : g === 41 ? (t.consume(g), c--, m) : g === null || g === 32 || g === 40 || Zo(g) ? n(g) : (t.consume(g), g === 92 ? y : m);
  }
  function y(g) {
    return g === 40 || g === 41 || g === 92 ? (t.consume(g), m) : m(g);
  }
}
function Ih(t, e, n, r, i, o) {
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
    h === 94 && !l && "_hiddenFootnoteSupport" in s.parser.constructs ? n(h) : h === 93 ? (t.exit(o), t.enter(i), t.consume(h), t.exit(i), t.exit(r), e) : j(h) ? (t.enter("lineEnding"), t.consume(h), t.exit("lineEnding"), c) : (t.enter("chunkString", {
      contentType: "string"
    }), f(h));
  }
  function f(h) {
    return h === null || h === 91 || h === 93 || j(h) || l++ > 999 ? (t.exit("chunkString"), c(h)) : (t.consume(h), a || (a = !Z(h)), h === 92 ? d : f);
  }
  function d(h) {
    return h === 91 || h === 92 || h === 93 ? (t.consume(h), l++, f) : f(h);
  }
}
function Ah(t, e, n, r, i, o) {
  let s;
  return l;
  function l(d) {
    return d === 34 || d === 39 || d === 40 ? (t.enter(r), t.enter(i), t.consume(d), t.exit(i), s = d === 40 ? 41 : d, a) : n(d);
  }
  function a(d) {
    return d === s ? (t.enter(i), t.consume(d), t.exit(i), t.exit(r), e) : (t.enter(o), u(d));
  }
  function u(d) {
    return d === s ? (t.exit(o), a(s)) : d === null ? n(d) : j(d) ? (t.enter("lineEnding"), t.consume(d), t.exit("lineEnding"), te(t, u, "linePrefix")) : (t.enter("chunkString", {
      contentType: "string"
    }), c(d));
  }
  function c(d) {
    return d === s || d === null || j(d) ? (t.exit("chunkString"), u(d)) : (t.consume(d), d === 92 ? f : c);
  }
  function f(d) {
    return d === s || d === 92 ? (t.consume(d), c) : c(d);
  }
}
function gi(t, e) {
  let n;
  return r;
  function r(i) {
    return j(i) ? (t.enter("lineEnding"), t.consume(i), t.exit("lineEnding"), n = !0, r) : Z(i) ? te(t, r, n ? "linePrefix" : "lineSuffix")(i) : e(i);
  }
}
const hy = {
  name: "definition",
  tokenize: py
}, dy = {
  partial: !0,
  tokenize: my
};
function py(t, e, n) {
  const r = this;
  let i;
  return o;
  function o(h) {
    return t.enter("definition"), s(h);
  }
  function s(h) {
    return Ih.call(
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
    return i = wt(r.sliceSerialize(r.events[r.events.length - 1][1]).slice(1, -1)), h === 58 ? (t.enter("definitionMarker"), t.consume(h), t.exit("definitionMarker"), a) : n(h);
  }
  function a(h) {
    return se(h) ? gi(t, u)(h) : u(h);
  }
  function u(h) {
    return vh(
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
    return t.attempt(dy, f, f)(h);
  }
  function f(h) {
    return Z(h) ? te(t, d, "whitespace")(h) : d(h);
  }
  function d(h) {
    return h === null || j(h) ? (t.exit("definition"), r.parser.defined.push(i), e(h)) : n(h);
  }
}
function my(t, e, n) {
  return r;
  function r(l) {
    return se(l) ? gi(t, i)(l) : n(l);
  }
  function i(l) {
    return Ah(t, o, n, "definitionTitle", "definitionTitleMarker", "definitionTitleString")(l);
  }
  function o(l) {
    return Z(l) ? te(t, s, "whitespace")(l) : s(l);
  }
  function s(l) {
    return l === null || j(l) ? e(l) : n(l);
  }
}
const gy = {
  name: "hardBreakEscape",
  tokenize: yy
};
function yy(t, e, n) {
  return r;
  function r(o) {
    return t.enter("hardBreakEscape"), t.consume(o), i;
  }
  function i(o) {
    return j(o) ? (t.exit("hardBreakEscape"), e(o)) : n(o);
  }
}
const ky = {
  name: "headingAtx",
  resolve: by,
  tokenize: wy
};
function by(t, e) {
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
  }, tt(t, r, n - r + 1, [["enter", i, e], ["enter", o, e], ["exit", o, e], ["exit", i, e]])), t;
}
function wy(t, e, n) {
  let r = 0;
  return i;
  function i(c) {
    return t.enter("atxHeading"), o(c);
  }
  function o(c) {
    return t.enter("atxHeadingSequence"), s(c);
  }
  function s(c) {
    return c === 35 && r++ < 6 ? (t.consume(c), s) : c === null || se(c) ? (t.exit("atxHeadingSequence"), l(c)) : n(c);
  }
  function l(c) {
    return c === 35 ? (t.enter("atxHeadingSequence"), a(c)) : c === null || j(c) ? (t.exit("atxHeading"), e(c)) : Z(c) ? te(t, l, "whitespace")(c) : (t.enter("atxHeadingText"), u(c));
  }
  function a(c) {
    return c === 35 ? (t.consume(c), a) : (t.exit("atxHeadingSequence"), l(c));
  }
  function u(c) {
    return c === null || c === 35 || se(c) ? (t.exit("atxHeadingText"), l(c)) : (t.consume(c), u);
  }
}
const xy = [
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
], mc = ["pre", "script", "style", "textarea"], Cy = {
  concrete: !0,
  name: "htmlFlow",
  resolveTo: Ny,
  tokenize: Ty
}, Sy = {
  partial: !0,
  tokenize: Iy
}, My = {
  partial: !0,
  tokenize: vy
};
function Ny(t) {
  let e = t.length;
  for (; e-- && !(t[e][0] === "enter" && t[e][1].type === "htmlFlow"); )
    ;
  return e > 1 && t[e - 2][1].type === "linePrefix" && (t[e][1].start = t[e - 2][1].start, t[e + 1][1].start = t[e - 2][1].start, t.splice(e - 2, 2)), t;
}
function Ty(t, e, n) {
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
    return b === 33 ? (t.consume(b), d) : b === 47 ? (t.consume(b), o = !0, m) : b === 63 ? (t.consume(b), i = 3, r.interrupt ? e : k) : Le(b) ? (t.consume(b), s = String.fromCharCode(b), y) : n(b);
  }
  function d(b) {
    return b === 45 ? (t.consume(b), i = 2, h) : b === 91 ? (t.consume(b), i = 5, l = 0, p) : Le(b) ? (t.consume(b), i = 4, r.interrupt ? e : k) : n(b);
  }
  function h(b) {
    return b === 45 ? (t.consume(b), r.interrupt ? e : k) : n(b);
  }
  function p(b) {
    const Ge = "CDATA[";
    return b === Ge.charCodeAt(l++) ? (t.consume(b), l === Ge.length ? r.interrupt ? e : H : p) : n(b);
  }
  function m(b) {
    return Le(b) ? (t.consume(b), s = String.fromCharCode(b), y) : n(b);
  }
  function y(b) {
    if (b === null || b === 47 || b === 62 || se(b)) {
      const Ge = b === 47, Ct = s.toLowerCase();
      return !Ge && !o && mc.includes(Ct) ? (i = 1, r.interrupt ? e(b) : H(b)) : xy.includes(s.toLowerCase()) ? (i = 6, Ge ? (t.consume(b), g) : r.interrupt ? e(b) : H(b)) : (i = 7, r.interrupt && !r.parser.lazy[r.now().line] ? n(b) : o ? E(b) : T(b));
    }
    return b === 45 || He(b) ? (t.consume(b), s += String.fromCharCode(b), y) : n(b);
  }
  function g(b) {
    return b === 62 ? (t.consume(b), r.interrupt ? e : H) : n(b);
  }
  function E(b) {
    return Z(b) ? (t.consume(b), E) : N(b);
  }
  function T(b) {
    return b === 47 ? (t.consume(b), N) : b === 58 || b === 95 || Le(b) ? (t.consume(b), B) : Z(b) ? (t.consume(b), T) : N(b);
  }
  function B(b) {
    return b === 45 || b === 46 || b === 58 || b === 95 || He(b) ? (t.consume(b), B) : z(b);
  }
  function z(b) {
    return b === 61 ? (t.consume(b), S) : Z(b) ? (t.consume(b), z) : T(b);
  }
  function S(b) {
    return b === null || b === 60 || b === 61 || b === 62 || b === 96 ? n(b) : b === 34 || b === 39 ? (t.consume(b), a = b, D) : Z(b) ? (t.consume(b), S) : V(b);
  }
  function D(b) {
    return b === a ? (t.consume(b), a = null, q) : b === null || j(b) ? n(b) : (t.consume(b), D);
  }
  function V(b) {
    return b === null || b === 34 || b === 39 || b === 47 || b === 60 || b === 61 || b === 62 || b === 96 || se(b) ? z(b) : (t.consume(b), V);
  }
  function q(b) {
    return b === 47 || b === 62 || Z(b) ? T(b) : n(b);
  }
  function N(b) {
    return b === 62 ? (t.consume(b), _) : n(b);
  }
  function _(b) {
    return b === null || j(b) ? H(b) : Z(b) ? (t.consume(b), _) : n(b);
  }
  function H(b) {
    return b === 45 && i === 2 ? (t.consume(b), ke) : b === 60 && i === 1 ? (t.consume(b), pe) : b === 62 && i === 4 ? (t.consume(b), ue) : b === 63 && i === 3 ? (t.consume(b), k) : b === 93 && i === 5 ? (t.consume(b), mt) : j(b) && (i === 6 || i === 7) ? (t.exit("htmlFlowData"), t.check(Sy, gt, Y)(b)) : b === null || j(b) ? (t.exit("htmlFlowData"), Y(b)) : (t.consume(b), H);
  }
  function Y(b) {
    return t.check(My, le, gt)(b);
  }
  function le(b) {
    return t.enter("lineEnding"), t.consume(b), t.exit("lineEnding"), X;
  }
  function X(b) {
    return b === null || j(b) ? Y(b) : (t.enter("htmlFlowData"), H(b));
  }
  function ke(b) {
    return b === 45 ? (t.consume(b), k) : H(b);
  }
  function pe(b) {
    return b === 47 ? (t.consume(b), s = "", Je) : H(b);
  }
  function Je(b) {
    if (b === 62) {
      const Ge = s.toLowerCase();
      return mc.includes(Ge) ? (t.consume(b), ue) : H(b);
    }
    return Le(b) && s.length < 8 ? (t.consume(b), s += String.fromCharCode(b), Je) : H(b);
  }
  function mt(b) {
    return b === 93 ? (t.consume(b), k) : H(b);
  }
  function k(b) {
    return b === 62 ? (t.consume(b), ue) : b === 45 && i === 2 ? (t.consume(b), k) : H(b);
  }
  function ue(b) {
    return b === null || j(b) ? (t.exit("htmlFlowData"), gt(b)) : (t.consume(b), ue);
  }
  function gt(b) {
    return t.exit("htmlFlow"), e(b);
  }
}
function vy(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return j(s) ? (t.enter("lineEnding"), t.consume(s), t.exit("lineEnding"), o) : n(s);
  }
  function o(s) {
    return r.parser.lazy[r.now().line] ? n(s) : e(s);
  }
}
function Iy(t, e, n) {
  return r;
  function r(i) {
    return t.enter("lineEnding"), t.consume(i), t.exit("lineEnding"), t.attempt(oo, e, n);
  }
}
const Ay = {
  name: "htmlText",
  tokenize: Ey
};
function Ey(t, e, n) {
  const r = this;
  let i, o, s;
  return l;
  function l(k) {
    return t.enter("htmlText"), t.enter("htmlTextData"), t.consume(k), a;
  }
  function a(k) {
    return k === 33 ? (t.consume(k), u) : k === 47 ? (t.consume(k), z) : k === 63 ? (t.consume(k), T) : Le(k) ? (t.consume(k), V) : n(k);
  }
  function u(k) {
    return k === 45 ? (t.consume(k), c) : k === 91 ? (t.consume(k), o = 0, p) : Le(k) ? (t.consume(k), E) : n(k);
  }
  function c(k) {
    return k === 45 ? (t.consume(k), h) : n(k);
  }
  function f(k) {
    return k === null ? n(k) : k === 45 ? (t.consume(k), d) : j(k) ? (s = f, pe(k)) : (t.consume(k), f);
  }
  function d(k) {
    return k === 45 ? (t.consume(k), h) : f(k);
  }
  function h(k) {
    return k === 62 ? ke(k) : k === 45 ? d(k) : f(k);
  }
  function p(k) {
    const ue = "CDATA[";
    return k === ue.charCodeAt(o++) ? (t.consume(k), o === ue.length ? m : p) : n(k);
  }
  function m(k) {
    return k === null ? n(k) : k === 93 ? (t.consume(k), y) : j(k) ? (s = m, pe(k)) : (t.consume(k), m);
  }
  function y(k) {
    return k === 93 ? (t.consume(k), g) : m(k);
  }
  function g(k) {
    return k === 62 ? ke(k) : k === 93 ? (t.consume(k), g) : m(k);
  }
  function E(k) {
    return k === null || k === 62 ? ke(k) : j(k) ? (s = E, pe(k)) : (t.consume(k), E);
  }
  function T(k) {
    return k === null ? n(k) : k === 63 ? (t.consume(k), B) : j(k) ? (s = T, pe(k)) : (t.consume(k), T);
  }
  function B(k) {
    return k === 62 ? ke(k) : T(k);
  }
  function z(k) {
    return Le(k) ? (t.consume(k), S) : n(k);
  }
  function S(k) {
    return k === 45 || He(k) ? (t.consume(k), S) : D(k);
  }
  function D(k) {
    return j(k) ? (s = D, pe(k)) : Z(k) ? (t.consume(k), D) : ke(k);
  }
  function V(k) {
    return k === 45 || He(k) ? (t.consume(k), V) : k === 47 || k === 62 || se(k) ? q(k) : n(k);
  }
  function q(k) {
    return k === 47 ? (t.consume(k), ke) : k === 58 || k === 95 || Le(k) ? (t.consume(k), N) : j(k) ? (s = q, pe(k)) : Z(k) ? (t.consume(k), q) : ke(k);
  }
  function N(k) {
    return k === 45 || k === 46 || k === 58 || k === 95 || He(k) ? (t.consume(k), N) : _(k);
  }
  function _(k) {
    return k === 61 ? (t.consume(k), H) : j(k) ? (s = _, pe(k)) : Z(k) ? (t.consume(k), _) : q(k);
  }
  function H(k) {
    return k === null || k === 60 || k === 61 || k === 62 || k === 96 ? n(k) : k === 34 || k === 39 ? (t.consume(k), i = k, Y) : j(k) ? (s = H, pe(k)) : Z(k) ? (t.consume(k), H) : (t.consume(k), le);
  }
  function Y(k) {
    return k === i ? (t.consume(k), i = void 0, X) : k === null ? n(k) : j(k) ? (s = Y, pe(k)) : (t.consume(k), Y);
  }
  function le(k) {
    return k === null || k === 34 || k === 39 || k === 60 || k === 61 || k === 96 ? n(k) : k === 47 || k === 62 || se(k) ? q(k) : (t.consume(k), le);
  }
  function X(k) {
    return k === 47 || k === 62 || se(k) ? q(k) : n(k);
  }
  function ke(k) {
    return k === 62 ? (t.consume(k), t.exit("htmlTextData"), t.exit("htmlText"), e) : n(k);
  }
  function pe(k) {
    return t.exit("htmlTextData"), t.enter("lineEnding"), t.consume(k), t.exit("lineEnding"), Je;
  }
  function Je(k) {
    return Z(k) ? te(t, mt, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(k) : mt(k);
  }
  function mt(k) {
    return t.enter("htmlTextData"), s(k);
  }
}
const Sa = {
  name: "labelEnd",
  resolveAll: Ly,
  resolveTo: Py,
  tokenize: zy
}, Oy = {
  tokenize: By
}, Dy = {
  tokenize: Fy
}, Ry = {
  tokenize: $y
};
function Ly(t) {
  let e = -1;
  const n = [];
  for (; ++e < t.length; ) {
    const r = t[e][1];
    if (n.push(t[e]), r.type === "labelImage" || r.type === "labelLink" || r.type === "labelEnd") {
      const i = r.type === "labelImage" ? 4 : 2;
      r.type = "data", e += i;
    }
  }
  return t.length !== n.length && tt(t, 0, t.length, n), t;
}
function Py(t, e) {
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
  return l = [["enter", a, e], ["enter", u, e]], l = ut(l, t.slice(o + 1, o + r + 3)), l = ut(l, [["enter", c, e]]), l = ut(l, xs(e.parser.constructs.insideSpan.null, t.slice(o + r + 4, s - 3), e)), l = ut(l, [["exit", c, e], t[s - 2], t[s - 1], ["exit", u, e]]), l = ut(l, t.slice(s + 1)), l = ut(l, [["exit", a, e]]), tt(t, o, t.length, l), t;
}
function zy(t, e, n) {
  const r = this;
  let i = r.events.length, o, s;
  for (; i--; )
    if ((r.events[i][1].type === "labelImage" || r.events[i][1].type === "labelLink") && !r.events[i][1]._balanced) {
      o = r.events[i][1];
      break;
    }
  return l;
  function l(d) {
    return o ? o._inactive ? f(d) : (s = r.parser.defined.includes(wt(r.sliceSerialize({
      start: o.end,
      end: r.now()
    }))), t.enter("labelEnd"), t.enter("labelMarker"), t.consume(d), t.exit("labelMarker"), t.exit("labelEnd"), a) : n(d);
  }
  function a(d) {
    return d === 40 ? t.attempt(Oy, c, s ? c : f)(d) : d === 91 ? t.attempt(Dy, c, s ? u : f)(d) : s ? c(d) : f(d);
  }
  function u(d) {
    return t.attempt(Ry, c, f)(d);
  }
  function c(d) {
    return e(d);
  }
  function f(d) {
    return o._balanced = !0, n(d);
  }
}
function By(t, e, n) {
  return r;
  function r(f) {
    return t.enter("resource"), t.enter("resourceMarker"), t.consume(f), t.exit("resourceMarker"), i;
  }
  function i(f) {
    return se(f) ? gi(t, o)(f) : o(f);
  }
  function o(f) {
    return f === 41 ? c(f) : vh(t, s, l, "resourceDestination", "resourceDestinationLiteral", "resourceDestinationLiteralMarker", "resourceDestinationRaw", "resourceDestinationString", 32)(f);
  }
  function s(f) {
    return se(f) ? gi(t, a)(f) : c(f);
  }
  function l(f) {
    return n(f);
  }
  function a(f) {
    return f === 34 || f === 39 || f === 40 ? Ah(t, u, n, "resourceTitle", "resourceTitleMarker", "resourceTitleString")(f) : c(f);
  }
  function u(f) {
    return se(f) ? gi(t, c)(f) : c(f);
  }
  function c(f) {
    return f === 41 ? (t.enter("resourceMarker"), t.consume(f), t.exit("resourceMarker"), t.exit("resource"), e) : n(f);
  }
}
function Fy(t, e, n) {
  const r = this;
  return i;
  function i(l) {
    return Ih.call(r, t, o, s, "reference", "referenceMarker", "referenceString")(l);
  }
  function o(l) {
    return r.parser.defined.includes(wt(r.sliceSerialize(r.events[r.events.length - 1][1]).slice(1, -1))) ? e(l) : n(l);
  }
  function s(l) {
    return n(l);
  }
}
function $y(t, e, n) {
  return r;
  function r(o) {
    return t.enter("reference"), t.enter("referenceMarker"), t.consume(o), t.exit("referenceMarker"), i;
  }
  function i(o) {
    return o === 93 ? (t.enter("referenceMarker"), t.consume(o), t.exit("referenceMarker"), t.exit("reference"), e) : n(o);
  }
}
const _y = {
  name: "labelStartImage",
  resolveAll: Sa.resolveAll,
  tokenize: Vy
};
function Vy(t, e, n) {
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
const Hy = {
  name: "labelStartLink",
  resolveAll: Sa.resolveAll,
  tokenize: jy
};
function jy(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return t.enter("labelLink"), t.enter("labelMarker"), t.consume(s), t.exit("labelMarker"), t.exit("labelLink"), o;
  }
  function o(s) {
    return s === 94 && "_hiddenFootnoteSupport" in r.parser.constructs ? n(s) : e(s);
  }
}
const _s = {
  name: "lineEnding",
  tokenize: qy
};
function qy(t, e) {
  return n;
  function n(r) {
    return t.enter("lineEnding"), t.consume(r), t.exit("lineEnding"), te(t, e, "linePrefix");
  }
}
const Fo = {
  name: "thematicBreak",
  tokenize: Wy
};
function Wy(t, e, n) {
  let r = 0, i;
  return o;
  function o(u) {
    return t.enter("thematicBreak"), s(u);
  }
  function s(u) {
    return i = u, l(u);
  }
  function l(u) {
    return u === i ? (t.enter("thematicBreakSequence"), a(u)) : r >= 3 && (u === null || j(u)) ? (t.exit("thematicBreak"), e(u)) : n(u);
  }
  function a(u) {
    return u === i ? (t.consume(u), r++, a) : (t.exit("thematicBreakSequence"), Z(u) ? te(t, l, "whitespace")(u) : l(u));
  }
}
const Fe = {
  continuation: {
    tokenize: Gy
  },
  exit: Qy,
  name: "list",
  tokenize: Jy
}, Ky = {
  partial: !0,
  tokenize: Xy
}, Uy = {
  partial: !0,
  tokenize: Yy
};
function Jy(t, e, n) {
  const r = this, i = r.events[r.events.length - 1];
  let o = i && i[1].type === "linePrefix" ? i[2].sliceSerialize(i[1], !0).length : 0, s = 0;
  return l;
  function l(h) {
    const p = r.containerState.type || (h === 42 || h === 43 || h === 45 ? "listUnordered" : "listOrdered");
    if (p === "listUnordered" ? !r.containerState.marker || h === r.containerState.marker : Rl(h)) {
      if (r.containerState.type || (r.containerState.type = p, t.enter(p, {
        _container: !0
      })), p === "listUnordered")
        return t.enter("listItemPrefix"), h === 42 || h === 45 ? t.check(Fo, n, u)(h) : u(h);
      if (!r.interrupt || h === 49)
        return t.enter("listItemPrefix"), t.enter("listItemValue"), a(h);
    }
    return n(h);
  }
  function a(h) {
    return Rl(h) && ++s < 10 ? (t.consume(h), a) : (!r.interrupt || s < 2) && (r.containerState.marker ? h === r.containerState.marker : h === 41 || h === 46) ? (t.exit("listItemValue"), u(h)) : n(h);
  }
  function u(h) {
    return t.enter("listItemMarker"), t.consume(h), t.exit("listItemMarker"), r.containerState.marker = r.containerState.marker || h, t.check(
      oo,
      // Can’t be empty when interrupting.
      r.interrupt ? n : c,
      t.attempt(Ky, d, f)
    );
  }
  function c(h) {
    return r.containerState.initialBlankLine = !0, o++, d(h);
  }
  function f(h) {
    return Z(h) ? (t.enter("listItemPrefixWhitespace"), t.consume(h), t.exit("listItemPrefixWhitespace"), d) : n(h);
  }
  function d(h) {
    return r.containerState.size = o + r.sliceSerialize(t.exit("listItemPrefix"), !0).length, e(h);
  }
}
function Gy(t, e, n) {
  const r = this;
  return r.containerState._closeFlow = void 0, t.check(oo, i, o);
  function i(l) {
    return r.containerState.furtherBlankLines = r.containerState.furtherBlankLines || r.containerState.initialBlankLine, te(t, e, "listItemIndent", r.containerState.size + 1)(l);
  }
  function o(l) {
    return r.containerState.furtherBlankLines || !Z(l) ? (r.containerState.furtherBlankLines = void 0, r.containerState.initialBlankLine = void 0, s(l)) : (r.containerState.furtherBlankLines = void 0, r.containerState.initialBlankLine = void 0, t.attempt(Uy, e, s)(l));
  }
  function s(l) {
    return r.containerState._closeFlow = !0, r.interrupt = void 0, te(t, t.attempt(Fe, e, n), "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(l);
  }
}
function Yy(t, e, n) {
  const r = this;
  return te(t, i, "listItemIndent", r.containerState.size + 1);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return s && s[1].type === "listItemIndent" && s[2].sliceSerialize(s[1], !0).length === r.containerState.size ? e(o) : n(o);
  }
}
function Qy(t) {
  t.exit(this.containerState.type);
}
function Xy(t, e, n) {
  const r = this;
  return te(t, i, "listItemPrefixWhitespace", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 5);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return !Z(o) && s && s[1].type === "listItemPrefixWhitespace" ? e(o) : n(o);
  }
}
const gc = {
  name: "setextUnderline",
  resolveTo: Zy,
  tokenize: ek
};
function Zy(t, e) {
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
function ek(t, e, n) {
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
    return u === i ? (t.consume(u), l) : (t.exit("setextHeadingLineSequence"), Z(u) ? te(t, a, "lineSuffix")(u) : a(u));
  }
  function a(u) {
    return u === null || j(u) ? (t.exit("setextHeadingLine"), e(u)) : n(u);
  }
}
const tk = {
  tokenize: nk
};
function nk(t) {
  const e = this, n = t.attempt(
    // Try to parse a blank line.
    oo,
    r,
    // Try to parse initial flow (essentially, only code).
    t.attempt(this.parser.constructs.flowInitial, i, te(t, t.attempt(this.parser.constructs.flow, i, t.attempt(ly, i)), "linePrefix"))
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
const rk = {
  resolveAll: Oh()
}, ik = Eh("string"), ok = Eh("text");
function Eh(t) {
  return {
    resolveAll: Oh(t === "text" ? sk : void 0),
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
function Oh(t) {
  return e;
  function e(n, r) {
    let i = -1, o;
    for (; ++i <= n.length; )
      o === void 0 ? n[i] && n[i][1].type === "data" && (o = i, i++) : (!n[i] || n[i][1].type !== "data") && (i !== o + 2 && (n[o][1].end = n[i - 1][1].end, n.splice(o + 2, i - o - 2), i = o + 2), o = void 0);
    return t ? t(n, r) : n;
  }
}
function sk(t, e) {
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
const lk = {
  42: Fe,
  43: Fe,
  45: Fe,
  48: Fe,
  49: Fe,
  50: Fe,
  51: Fe,
  52: Fe,
  53: Fe,
  54: Fe,
  55: Fe,
  56: Fe,
  57: Fe,
  62: Sh
}, ak = {
  91: hy
}, uk = {
  [-2]: $s,
  [-1]: $s,
  32: $s
}, ck = {
  35: ky,
  42: Fo,
  45: [gc, Fo],
  60: Cy,
  61: gc,
  95: Fo,
  96: pc,
  126: pc
}, fk = {
  38: Nh,
  92: Mh
}, hk = {
  [-5]: _s,
  [-4]: _s,
  [-3]: _s,
  33: _y,
  38: Nh,
  42: Ll,
  60: [Hg, Ay],
  91: Hy,
  92: [gy, Mh],
  93: Sa,
  95: Ll,
  96: ty
}, dk = {
  null: [Ll, rk]
}, pk = {
  null: [42, 95]
}, mk = {
  null: []
}, gk = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  attentionMarkers: pk,
  contentInitial: ak,
  disable: mk,
  document: lk,
  flow: ck,
  flowInitial: uk,
  insideSpan: dk,
  string: fk,
  text: hk
}, Symbol.toStringTag, { value: "Module" }));
function yk(t, e, n) {
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
    attempt: D(z),
    check: D(S),
    consume: E,
    enter: T,
    exit: B,
    interrupt: D(S, {
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
    sliceSerialize: d,
    sliceStream: h,
    write: f
  };
  let c = e.tokenize.call(u, a);
  return e.resolveAll && o.push(e), u;
  function f(_) {
    return s = ut(s, _), y(), s[s.length - 1] !== null ? [] : (V(e, 0), u.events = xs(o, u.events, u), u.events);
  }
  function d(_, H) {
    return bk(h(_), H);
  }
  function h(_) {
    return kk(s, _);
  }
  function p() {
    const {
      _bufferIndex: _,
      _index: H,
      line: Y,
      column: le,
      offset: X
    } = r;
    return {
      _bufferIndex: _,
      _index: H,
      line: Y,
      column: le,
      offset: X
    };
  }
  function m(_) {
    i[_.line] = _.column, N();
  }
  function y() {
    let _;
    for (; r._index < s.length; ) {
      const H = s[r._index];
      if (typeof H == "string")
        for (_ = r._index, r._bufferIndex < 0 && (r._bufferIndex = 0); r._index === _ && r._bufferIndex < H.length; )
          g(H.charCodeAt(r._bufferIndex));
      else
        g(H);
    }
  }
  function g(_) {
    c = c(_);
  }
  function E(_) {
    j(_) ? (r.line++, r.column = 1, r.offset += _ === -3 ? 2 : 1, N()) : _ !== -1 && (r.column++, r.offset++), r._bufferIndex < 0 ? r._index++ : (r._bufferIndex++, r._bufferIndex === // Points w/ non-negative `_bufferIndex` reference
    // strings.
    /** @type {string} */
    s[r._index].length && (r._bufferIndex = -1, r._index++)), u.previous = _;
  }
  function T(_, H) {
    const Y = H || {};
    return Y.type = _, Y.start = p(), u.events.push(["enter", Y, u]), l.push(Y), Y;
  }
  function B(_) {
    const H = l.pop();
    return H.end = p(), u.events.push(["exit", H, u]), H;
  }
  function z(_, H) {
    V(_, H.from);
  }
  function S(_, H) {
    H.restore();
  }
  function D(_, H) {
    return Y;
    function Y(le, X, ke) {
      let pe, Je, mt, k;
      return Array.isArray(le) ? (
        /* c8 ignore next 1 */
        gt(le)
      ) : "tokenize" in le ? (
        // Looks like a construct.
        gt([
          /** @type {Construct} */
          le
        ])
      ) : ue(le);
      function ue(me) {
        return An;
        function An(St) {
          const nn = St !== null && me[St], rn = St !== null && me.null, ur = [
            // To do: add more extension tests.
            /* c8 ignore next 2 */
            ...Array.isArray(nn) ? nn : nn ? [nn] : [],
            ...Array.isArray(rn) ? rn : rn ? [rn] : []
          ];
          return gt(ur)(St);
        }
      }
      function gt(me) {
        return pe = me, Je = 0, me.length === 0 ? ke : b(me[Je]);
      }
      function b(me) {
        return An;
        function An(St) {
          return k = q(), mt = me, me.partial || (u.currentConstruct = me), me.name && u.parser.constructs.disable.null.includes(me.name) ? Ct() : me.tokenize.call(
            // If we do have fields, create an object w/ `context` as its
            // prototype.
            // This allows a “live binding”, which is needed for `interrupt`.
            H ? Object.assign(Object.create(u), H) : u,
            a,
            Ge,
            Ct
          )(St);
        }
      }
      function Ge(me) {
        return _(mt, k), X;
      }
      function Ct(me) {
        return k.restore(), ++Je < pe.length ? b(pe[Je]) : ke;
      }
    }
  }
  function V(_, H) {
    _.resolveAll && !o.includes(_) && o.push(_), _.resolve && tt(u.events, H, u.events.length - H, _.resolve(u.events.slice(H), u)), _.resolveTo && (u.events = _.resolveTo(u.events, u));
  }
  function q() {
    const _ = p(), H = u.previous, Y = u.currentConstruct, le = u.events.length, X = Array.from(l);
    return {
      from: le,
      restore: ke
    };
    function ke() {
      r = _, u.previous = H, u.currentConstruct = Y, u.events.length = le, l = X, N();
    }
  }
  function N() {
    r.line in i && r.column < 2 && (r.column = i[r.line], r.offset += i[r.line] - 1);
  }
}
function kk(t, e) {
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
function bk(t, e) {
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
function wk(t) {
  const r = {
    constructs: (
      /** @type {FullNormalizedExtension} */
      xh([gk, ...(t || {}).extensions || []])
    ),
    content: i(Pg),
    defined: [],
    document: i(Bg),
    flow: i(tk),
    lazy: {},
    string: i(ik),
    text: i(ok)
  };
  return r;
  function i(o) {
    return s;
    function s(l) {
      return yk(r, o, l);
    }
  }
}
function xk(t) {
  for (; !Th(t); )
    ;
  return t;
}
const yc = /[\0\t\n\r]/g;
function Ck() {
  let t = 1, e = "", n = !0, r;
  return i;
  function i(o, s, l) {
    const a = [];
    let u, c, f, d, h;
    for (o = e + (typeof o == "string" ? o.toString() : new TextDecoder(s || void 0).decode(o)), f = 0, e = "", n && (o.charCodeAt(0) === 65279 && f++, n = void 0); f < o.length; ) {
      if (yc.lastIndex = f, u = yc.exec(o), d = u && u.index !== void 0 ? u.index : o.length, h = o.charCodeAt(d), !u) {
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
const Sk = /\\([!-/:-@[-`{-~])|&(#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});/gi;
function Dh(t) {
  return t.replace(Sk, Mk);
}
function Mk(t, e, n) {
  if (e)
    return e;
  if (n.charCodeAt(0) === 35) {
    const i = n.charCodeAt(1), o = i === 120 || i === 88;
    return Ch(n.slice(o ? 2 : 1), o ? 16 : 10);
  }
  return Ca(n) || t;
}
function yi(t) {
  return !t || typeof t != "object" ? "" : "position" in t || "type" in t ? kc(t.position) : "start" in t || "end" in t ? kc(t) : "line" in t || "column" in t ? Pl(t) : "";
}
function Pl(t) {
  return bc(t && t.line) + ":" + bc(t && t.column);
}
function kc(t) {
  return Pl(t && t.start) + "-" + Pl(t && t.end);
}
function bc(t) {
  return t && typeof t == "number" ? t : 1;
}
const Rh = {}.hasOwnProperty;
function Nk(t, e, n) {
  return e && typeof e == "object" && (n = e, e = void 0), Tk(n)(xk(wk(n).document().write(Ck()(t, e, !0))));
}
function Tk(t) {
  const e = {
    transforms: [],
    canContainEols: ["emphasis", "fragment", "heading", "paragraph", "strong"],
    enter: {
      autolink: o(To),
      autolinkProtocol: q,
      autolinkEmail: q,
      atxHeading: o(Mo),
      blockQuote: o(rn),
      characterEscape: q,
      characterReference: q,
      codeFenced: o(ur),
      codeFencedFenceInfo: s,
      codeFencedFenceMeta: s,
      codeIndented: o(ur, s),
      codeText: o(En, s),
      codeTextData: q,
      data: q,
      codeFlowValue: q,
      definition: o(So),
      definitionDestinationString: s,
      definitionLabelString: s,
      definitionTitleString: s,
      emphasis: o(Ps),
      hardBreakEscape: o(ge),
      hardBreakTrailing: o(ge),
      htmlFlow: o(No, s),
      htmlFlowData: q,
      htmlText: o(No, s),
      htmlTextData: q,
      image: o(zs),
      label: s,
      link: o(To),
      listItem: o(Bs),
      listItemValue: d,
      listOrdered: o(vo, f),
      listUnordered: o(vo),
      paragraph: o(xe),
      reference: b,
      referenceString: s,
      resourceDestinationString: s,
      resourceTitleString: s,
      setextHeading: o(Mo),
      strong: o(Io),
      thematicBreak: o(M)
    },
    exit: {
      atxHeading: a(),
      atxHeadingSequence: z,
      autolink: a(),
      autolinkEmail: nn,
      autolinkProtocol: St,
      blockQuote: a(),
      characterEscapeValue: N,
      characterReferenceMarkerHexadecimal: Ct,
      characterReferenceMarkerNumeric: Ct,
      characterReferenceValue: me,
      characterReference: An,
      codeFenced: a(y),
      codeFencedFence: m,
      codeFencedFenceInfo: h,
      codeFencedFenceMeta: p,
      codeFlowValue: N,
      codeIndented: a(g),
      codeText: a(X),
      codeTextData: N,
      data: N,
      definition: a(),
      definitionDestinationString: B,
      definitionLabelString: E,
      definitionTitleString: T,
      emphasis: a(),
      hardBreakEscape: a(H),
      hardBreakTrailing: a(H),
      htmlFlow: a(Y),
      htmlFlowData: N,
      htmlText: a(le),
      htmlTextData: N,
      image: a(pe),
      label: mt,
      labelText: Je,
      lineEnding: _,
      link: a(ke),
      listItem: a(),
      listOrdered: a(),
      listUnordered: a(),
      paragraph: a(),
      referenceString: Ge,
      resourceDestinationString: k,
      resourceTitleString: ue,
      resource: gt,
      setextHeading: a(V),
      setextHeadingLineSequence: D,
      setextHeadingText: S,
      strong: a(),
      thematicBreak: a()
    }
  };
  Lh(e, (t || {}).mdastExtensions || []);
  const n = {};
  return r;
  function r(w) {
    let x = {
      type: "root",
      children: []
    };
    const I = {
      stack: [x],
      tokenStack: [],
      config: e,
      enter: l,
      exit: u,
      buffer: s,
      resume: c,
      data: n
    }, O = [];
    let L = -1;
    for (; ++L < w.length; )
      if (w[L][1].type === "listOrdered" || w[L][1].type === "listUnordered")
        if (w[L][0] === "enter")
          O.push(L);
        else {
          const $ = O.pop();
          L = i(w, $, L);
        }
    for (L = -1; ++L < w.length; ) {
      const $ = e[w[L][0]];
      Rh.call($, w[L][1].type) && $[w[L][1].type].call(Object.assign({
        sliceSerialize: w[L][2].sliceSerialize
      }, I), w[L][1]);
    }
    if (I.tokenStack.length > 0) {
      const $ = I.tokenStack[I.tokenStack.length - 1];
      ($[1] || wc).call(I, void 0, $[0]);
    }
    for (x.position = {
      start: on(w.length > 0 ? w[0][1].start : {
        line: 1,
        column: 1,
        offset: 0
      }),
      end: on(w.length > 0 ? w[w.length - 2][1].end : {
        line: 1,
        column: 1,
        offset: 0
      })
    }, L = -1; ++L < e.transforms.length; )
      x = e.transforms[L](x) || x;
    return x;
  }
  function i(w, x, I) {
    let O = x - 1, L = -1, $ = !1, Q, re, be, Ye;
    for (; ++O <= I; ) {
      const fe = w[O];
      switch (fe[1].type) {
        case "listUnordered":
        case "listOrdered":
        case "blockQuote": {
          fe[0] === "enter" ? L++ : L--, Ye = void 0;
          break;
        }
        case "lineEndingBlank": {
          fe[0] === "enter" && (Q && !Ye && !L && !be && (be = O), Ye = void 0);
          break;
        }
        case "linePrefix":
        case "listItemValue":
        case "listItemMarker":
        case "listItemPrefix":
        case "listItemPrefixWhitespace":
          break;
        default:
          Ye = void 0;
      }
      if (!L && fe[0] === "enter" && fe[1].type === "listItemPrefix" || L === -1 && fe[0] === "exit" && (fe[1].type === "listUnordered" || fe[1].type === "listOrdered")) {
        if (Q) {
          let it = O;
          for (re = void 0; it--; ) {
            const Qe = w[it];
            if (Qe[1].type === "lineEnding" || Qe[1].type === "lineEndingBlank") {
              if (Qe[0] === "exit") continue;
              re && (w[re][1].type = "lineEndingBlank", $ = !0), Qe[1].type = "lineEnding", re = it;
            } else if (!(Qe[1].type === "linePrefix" || Qe[1].type === "blockQuotePrefix" || Qe[1].type === "blockQuotePrefixWhitespace" || Qe[1].type === "blockQuoteMarker" || Qe[1].type === "listItemIndent")) break;
          }
          be && (!re || be < re) && (Q._spread = !0), Q.end = Object.assign({}, re ? w[re][1].start : fe[1].end), w.splice(re || O, 0, ["exit", Q, fe[2]]), O++, I++;
        }
        if (fe[1].type === "listItemPrefix") {
          const it = {
            type: "listItem",
            _spread: !1,
            start: Object.assign({}, fe[1].start),
            // @ts-expect-error: we’ll add `end` in a second.
            end: void 0
          };
          Q = it, w.splice(O, 0, ["enter", it, fe[2]]), O++, I++, be = void 0, Ye = !0;
        }
      }
    }
    return w[x][1]._spread = $, I;
  }
  function o(w, x) {
    return I;
    function I(O) {
      l.call(this, w(O), O), x && x.call(this, O);
    }
  }
  function s() {
    this.stack.push({
      type: "fragment",
      children: []
    });
  }
  function l(w, x, I) {
    this.stack[this.stack.length - 1].children.push(w), this.stack.push(w), this.tokenStack.push([x, I || void 0]), w.position = {
      start: on(x.start),
      // @ts-expect-error: `end` will be patched later.
      end: void 0
    };
  }
  function a(w) {
    return x;
    function x(I) {
      w && w.call(this, I), u.call(this, I);
    }
  }
  function u(w, x) {
    const I = this.stack.pop(), O = this.tokenStack.pop();
    if (O)
      O[0].type !== w.type && (x ? x.call(this, w, O[0]) : (O[1] || wc).call(this, w, O[0]));
    else throw new Error("Cannot close `" + w.type + "` (" + yi({
      start: w.start,
      end: w.end
    }) + "): it’s not open");
    I.position.end = on(w.end);
  }
  function c() {
    return xa(this.stack.pop());
  }
  function f() {
    this.data.expectingFirstListItemValue = !0;
  }
  function d(w) {
    if (this.data.expectingFirstListItemValue) {
      const x = this.stack[this.stack.length - 2];
      x.start = Number.parseInt(this.sliceSerialize(w), 10), this.data.expectingFirstListItemValue = void 0;
    }
  }
  function h() {
    const w = this.resume(), x = this.stack[this.stack.length - 1];
    x.lang = w;
  }
  function p() {
    const w = this.resume(), x = this.stack[this.stack.length - 1];
    x.meta = w;
  }
  function m() {
    this.data.flowCodeInside || (this.buffer(), this.data.flowCodeInside = !0);
  }
  function y() {
    const w = this.resume(), x = this.stack[this.stack.length - 1];
    x.value = w.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, ""), this.data.flowCodeInside = void 0;
  }
  function g() {
    const w = this.resume(), x = this.stack[this.stack.length - 1];
    x.value = w.replace(/(\r?\n|\r)$/g, "");
  }
  function E(w) {
    const x = this.resume(), I = this.stack[this.stack.length - 1];
    I.label = x, I.identifier = wt(this.sliceSerialize(w)).toLowerCase();
  }
  function T() {
    const w = this.resume(), x = this.stack[this.stack.length - 1];
    x.title = w;
  }
  function B() {
    const w = this.resume(), x = this.stack[this.stack.length - 1];
    x.url = w;
  }
  function z(w) {
    const x = this.stack[this.stack.length - 1];
    if (!x.depth) {
      const I = this.sliceSerialize(w).length;
      x.depth = I;
    }
  }
  function S() {
    this.data.setextHeadingSlurpLineEnding = !0;
  }
  function D(w) {
    const x = this.stack[this.stack.length - 1];
    x.depth = this.sliceSerialize(w).codePointAt(0) === 61 ? 1 : 2;
  }
  function V() {
    this.data.setextHeadingSlurpLineEnding = void 0;
  }
  function q(w) {
    const I = this.stack[this.stack.length - 1].children;
    let O = I[I.length - 1];
    (!O || O.type !== "text") && (O = li(), O.position = {
      start: on(w.start),
      // @ts-expect-error: we’ll add `end` later.
      end: void 0
    }, I.push(O)), this.stack.push(O);
  }
  function N(w) {
    const x = this.stack.pop();
    x.value += this.sliceSerialize(w), x.position.end = on(w.end);
  }
  function _(w) {
    const x = this.stack[this.stack.length - 1];
    if (this.data.atHardBreak) {
      const I = x.children[x.children.length - 1];
      I.position.end = on(w.end), this.data.atHardBreak = void 0;
      return;
    }
    !this.data.setextHeadingSlurpLineEnding && e.canContainEols.includes(x.type) && (q.call(this, w), N.call(this, w));
  }
  function H() {
    this.data.atHardBreak = !0;
  }
  function Y() {
    const w = this.resume(), x = this.stack[this.stack.length - 1];
    x.value = w;
  }
  function le() {
    const w = this.resume(), x = this.stack[this.stack.length - 1];
    x.value = w;
  }
  function X() {
    const w = this.resume(), x = this.stack[this.stack.length - 1];
    x.value = w;
  }
  function ke() {
    const w = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const x = this.data.referenceType || "shortcut";
      w.type += "Reference", w.referenceType = x, delete w.url, delete w.title;
    } else
      delete w.identifier, delete w.label;
    this.data.referenceType = void 0;
  }
  function pe() {
    const w = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const x = this.data.referenceType || "shortcut";
      w.type += "Reference", w.referenceType = x, delete w.url, delete w.title;
    } else
      delete w.identifier, delete w.label;
    this.data.referenceType = void 0;
  }
  function Je(w) {
    const x = this.sliceSerialize(w), I = this.stack[this.stack.length - 2];
    I.label = Dh(x), I.identifier = wt(x).toLowerCase();
  }
  function mt() {
    const w = this.stack[this.stack.length - 1], x = this.resume(), I = this.stack[this.stack.length - 1];
    if (this.data.inReference = !0, I.type === "link") {
      const O = w.children;
      I.children = O;
    } else
      I.alt = x;
  }
  function k() {
    const w = this.resume(), x = this.stack[this.stack.length - 1];
    x.url = w;
  }
  function ue() {
    const w = this.resume(), x = this.stack[this.stack.length - 1];
    x.title = w;
  }
  function gt() {
    this.data.inReference = void 0;
  }
  function b() {
    this.data.referenceType = "collapsed";
  }
  function Ge(w) {
    const x = this.resume(), I = this.stack[this.stack.length - 1];
    I.label = x, I.identifier = wt(this.sliceSerialize(w)).toLowerCase(), this.data.referenceType = "full";
  }
  function Ct(w) {
    this.data.characterReferenceType = w.type;
  }
  function me(w) {
    const x = this.sliceSerialize(w), I = this.data.characterReferenceType;
    let O;
    I ? (O = Ch(x, I === "characterReferenceMarkerNumeric" ? 10 : 16), this.data.characterReferenceType = void 0) : O = Ca(x);
    const L = this.stack[this.stack.length - 1];
    L.value += O;
  }
  function An(w) {
    const x = this.stack.pop();
    x.position.end = on(w.end);
  }
  function St(w) {
    N.call(this, w);
    const x = this.stack[this.stack.length - 1];
    x.url = this.sliceSerialize(w);
  }
  function nn(w) {
    N.call(this, w);
    const x = this.stack[this.stack.length - 1];
    x.url = "mailto:" + this.sliceSerialize(w);
  }
  function rn() {
    return {
      type: "blockquote",
      children: []
    };
  }
  function ur() {
    return {
      type: "code",
      lang: null,
      meta: null,
      value: ""
    };
  }
  function En() {
    return {
      type: "inlineCode",
      value: ""
    };
  }
  function So() {
    return {
      type: "definition",
      identifier: "",
      label: null,
      title: null,
      url: ""
    };
  }
  function Ps() {
    return {
      type: "emphasis",
      children: []
    };
  }
  function Mo() {
    return {
      type: "heading",
      // @ts-expect-error `depth` will be set later.
      depth: 0,
      children: []
    };
  }
  function ge() {
    return {
      type: "break"
    };
  }
  function No() {
    return {
      type: "html",
      value: ""
    };
  }
  function zs() {
    return {
      type: "image",
      title: null,
      url: "",
      alt: null
    };
  }
  function To() {
    return {
      type: "link",
      title: null,
      url: "",
      children: []
    };
  }
  function vo(w) {
    return {
      type: "list",
      ordered: w.type === "listOrdered",
      start: null,
      spread: w._spread,
      children: []
    };
  }
  function Bs(w) {
    return {
      type: "listItem",
      spread: w._spread,
      checked: null,
      children: []
    };
  }
  function xe() {
    return {
      type: "paragraph",
      children: []
    };
  }
  function Io() {
    return {
      type: "strong",
      children: []
    };
  }
  function li() {
    return {
      type: "text",
      value: ""
    };
  }
  function M() {
    return {
      type: "thematicBreak"
    };
  }
}
function on(t) {
  return {
    line: t.line,
    column: t.column,
    offset: t.offset
  };
}
function Lh(t, e) {
  let n = -1;
  for (; ++n < e.length; ) {
    const r = e[n];
    Array.isArray(r) ? Lh(t, r) : vk(t, r);
  }
}
function vk(t, e) {
  let n;
  for (n in e)
    if (Rh.call(e, n))
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
function wc(t, e) {
  throw t ? new Error("Cannot close `" + t.type + "` (" + yi({
    start: t.start,
    end: t.end
  }) + "): a different token (`" + e.type + "`, " + yi({
    start: e.start,
    end: e.end
  }) + ") is open") : new Error("Cannot close document, a token (`" + e.type + "`, " + yi({
    start: e.start,
    end: e.end
  }) + ") is still open");
}
function zl(t) {
  const e = this;
  e.parser = n;
  function n(r) {
    return Nk(r, {
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
const xc = {}.hasOwnProperty;
function Ik(t, e) {
  const n = e || {};
  function r(i, ...o) {
    let s = r.invalid;
    const l = r.handlers;
    if (i && xc.call(i, t)) {
      const a = String(i[t]);
      s = xc.call(l, a) ? l[a] : r.unknown;
    }
    if (s)
      return s.call(this, i, ...o);
  }
  return r.handlers = n.handlers || {}, r.invalid = n.invalid, r.unknown = n.unknown, r;
}
const Ak = {}.hasOwnProperty;
function Ph(t, e) {
  let n = -1, r;
  if (e.extensions)
    for (; ++n < e.extensions.length; )
      Ph(t, e.extensions[n]);
  for (r in e)
    if (Ak.call(e, r))
      switch (r) {
        case "extensions":
          break;
        case "unsafe": {
          Cc(t[r], e[r]);
          break;
        }
        case "join": {
          Cc(t[r], e[r]);
          break;
        }
        case "handlers": {
          Ek(t[r], e[r]);
          break;
        }
        default:
          t.options[r] = e[r];
      }
  return t;
}
function Cc(t, e) {
  e && t.push(...e);
}
function Ek(t, e) {
  e && Object.assign(t, e);
}
function Ok(t, e, n, r) {
  const i = n.enter("blockquote"), o = n.createTracker(r);
  o.move("> "), o.shift(2);
  const s = n.indentLines(
    n.containerFlow(t, o.current()),
    Dk
  );
  return i(), s;
}
function Dk(t, e, n) {
  return ">" + (n ? "" : " ") + t;
}
function zh(t, e) {
  return Sc(t, e.inConstruct, !0) && !Sc(t, e.notInConstruct, !1);
}
function Sc(t, e, n) {
  if (typeof e == "string" && (e = [e]), !e || e.length === 0)
    return n;
  let r = -1;
  for (; ++r < e.length; )
    if (t.includes(e[r]))
      return !0;
  return !1;
}
function Mc(t, e, n, r) {
  let i = -1;
  for (; ++i < n.unsafe.length; )
    if (n.unsafe[i].character === `
` && zh(n.stack, n.unsafe[i]))
      return /[ \t]/.test(r.before) ? "" : " ";
  return `\\
`;
}
function Rk(t, e) {
  const n = String(t);
  let r = n.indexOf(e), i = r, o = 0, s = 0;
  if (typeof e != "string")
    throw new TypeError("Expected substring");
  for (; r !== -1; )
    r === i ? ++o > s && (s = o) : o = 1, i = r + e.length, r = n.indexOf(e, i);
  return s;
}
function Bl(t, e) {
  return !!(e.options.fences === !1 && t.value && // If there’s no info…
  !t.lang && // And there’s a non-whitespace character…
  /[^ \r\n]/.test(t.value) && // And the value doesn’t start or end in a blank…
  !/^[\t ]*(?:[\r\n]|$)|(?:^|[\r\n])[\t ]*$/.test(t.value));
}
function Lk(t) {
  const e = t.options.fence || "`";
  if (e !== "`" && e !== "~")
    throw new Error(
      "Cannot serialize code with `" + e + "` for `options.fence`, expected `` ` `` or `~`"
    );
  return e;
}
function Pk(t, e, n, r) {
  const i = Lk(n), o = t.value || "", s = i === "`" ? "GraveAccent" : "Tilde";
  if (Bl(t, n)) {
    const f = n.enter("codeIndented"), d = n.indentLines(o, zk);
    return f(), d;
  }
  const l = n.createTracker(r), a = i.repeat(Math.max(Rk(o, i) + 1, 3)), u = n.enter("codeFenced");
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
function zk(t, e, n) {
  return (n ? "" : "    ") + t;
}
function Ma(t) {
  const e = t.options.quote || '"';
  if (e !== '"' && e !== "'")
    throw new Error(
      "Cannot serialize title with `" + e + "` for `options.quote`, expected `\"`, or `'`"
    );
  return e;
}
function Bk(t, e, n, r) {
  const i = Ma(n), o = i === '"' ? "Quote" : "Apostrophe", s = n.enter("definition");
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
function Fk(t) {
  const e = t.options.emphasis || "*";
  if (e !== "*" && e !== "_")
    throw new Error(
      "Cannot serialize emphasis with `" + e + "` for `options.emphasis`, expected `*`, or `_`"
    );
  return e;
}
function Sn(t) {
  return "&#x" + t.toString(16).toUpperCase() + ";";
}
function es(t, e, n) {
  const r = jr(t), i = jr(e);
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
Bh.peek = $k;
function Bh(t, e, n, r) {
  const i = Fk(n), o = n.enter("emphasis"), s = n.createTracker(r), l = s.move(i);
  let a = s.move(
    n.containerPhrasing(t, {
      after: i,
      before: l,
      ...s.current()
    })
  );
  const u = a.charCodeAt(0), c = es(
    r.before.charCodeAt(r.before.length - 1),
    u,
    i
  );
  c.inside && (a = Sn(u) + a.slice(1));
  const f = a.charCodeAt(a.length - 1), d = es(r.after.charCodeAt(0), f, i);
  d.inside && (a = a.slice(0, -1) + Sn(f));
  const h = s.move(i);
  return o(), n.attentionEncodeSurroundingInfo = {
    after: d.outside,
    before: c.outside
  }, l + a + h;
}
function $k(t, e, n) {
  return n.options.emphasis || "*";
}
const Cs = (
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
      return jk;
    if (typeof t == "function")
      return Ss(t);
    if (typeof t == "object")
      return Array.isArray(t) ? _k(t) : (
        // Cast because `ReadonlyArray` goes into the above but `isArray`
        // narrows to `Array`.
        Vk(
          /** @type {Props} */
          t
        )
      );
    if (typeof t == "string")
      return Hk(t);
    throw new Error("Expected function, string, or object as test");
  }
);
function _k(t) {
  const e = [];
  let n = -1;
  for (; ++n < t.length; )
    e[n] = Cs(t[n]);
  return Ss(r);
  function r(...i) {
    let o = -1;
    for (; ++o < e.length; )
      if (e[o].apply(this, i)) return !0;
    return !1;
  }
}
function Vk(t) {
  const e = (
    /** @type {Record<string, unknown>} */
    t
  );
  return Ss(n);
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
function Hk(t) {
  return Ss(e);
  function e(n) {
    return n && n.type === t;
  }
}
function Ss(t) {
  return e;
  function e(n, r, i) {
    return !!(qk(n) && t.call(
      this,
      n,
      typeof r == "number" ? r : void 0,
      i || void 0
    ));
  }
}
function jk() {
  return !0;
}
function qk(t) {
  return t !== null && typeof t == "object" && "type" in t;
}
const Fh = [], Wk = !0, Fl = !1, $l = "skip";
function Na(t, e, n, r) {
  let i;
  typeof e == "function" && typeof n != "function" ? (r = n, n = e) : i = e;
  const o = Cs(i), s = r ? -1 : 1;
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
      let h = Fh, p, m, y;
      if ((!e || o(a, u, c[c.length - 1] || void 0)) && (h = Kk(n(a, c)), h[0] === Fl))
        return h;
      if ("children" in a && a.children) {
        const g = (
          /** @type {UnistParent} */
          a
        );
        if (g.children && h[0] !== $l)
          for (m = (r ? g.children.length : -1) + s, y = c.concat(g); m > -1 && m < g.children.length; ) {
            const E = g.children[m];
            if (p = l(E, m, y)(), p[0] === Fl)
              return p;
            m = typeof p[1] == "number" ? p[1] : m + s;
          }
      }
      return h;
    }
  }
}
function Kk(t) {
  return Array.isArray(t) ? t : typeof t == "number" ? [Wk, t] : t == null ? Fh : [t];
}
function Qr(t, e, n, r) {
  let i, o, s;
  typeof e == "function" && typeof n != "function" ? (o = void 0, s = e, i = n) : (o = e, s = n, i = r), Na(t, o, l, i);
  function l(a, u) {
    const c = u[u.length - 1], f = c ? c.children.indexOf(a) : void 0;
    return s(a, f, c);
  }
}
function $h(t, e) {
  let n = !1;
  return Qr(t, function(r) {
    if ("value" in r && /\r?\n|\r/.test(r.value) || r.type === "break")
      return n = !0, Fl;
  }), !!((!t.depth || t.depth < 3) && xa(t) && (e.options.setext || n));
}
function Uk(t, e, n, r) {
  const i = Math.max(Math.min(6, t.depth || 1), 1), o = n.createTracker(r);
  if ($h(t, n)) {
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
  return /^[\t ]/.test(u) && (u = Sn(u.charCodeAt(0)) + u.slice(1)), u = u ? s + " " + u : s, n.options.closeAtx && (u += " " + s), a(), l(), u;
}
_h.peek = Jk;
function _h(t) {
  return t.value || "";
}
function Jk() {
  return "<";
}
Vh.peek = Gk;
function Vh(t, e, n, r) {
  const i = Ma(n), o = i === '"' ? "Quote" : "Apostrophe", s = n.enter("image");
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
function Gk() {
  return "!";
}
Hh.peek = Yk;
function Hh(t, e, n, r) {
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
function Yk() {
  return "!";
}
jh.peek = Qk;
function jh(t, e, n) {
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
function Qk() {
  return "`";
}
function qh(t, e) {
  const n = xa(t);
  return !!(!e.options.resourceLink && // If there’s a url…
  t.url && // And there’s a no title…
  !t.title && // And the content of `node` is a single text node…
  t.children && t.children.length === 1 && t.children[0].type === "text" && // And if the url is the same as the content…
  (n === t.url || "mailto:" + n === t.url) && // And that starts w/ a protocol…
  /^[a-z][a-z+.-]+:/i.test(t.url) && // And that doesn’t contain ASCII control codes (character escapes and
  // references don’t work), space, or angle brackets…
  !/[\0- <>\u007F]/.test(t.url));
}
Wh.peek = Xk;
function Wh(t, e, n, r) {
  const i = Ma(n), o = i === '"' ? "Quote" : "Apostrophe", s = n.createTracker(r);
  let l, a;
  if (qh(t, n)) {
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
function Xk(t, e, n) {
  return qh(t, n) ? "<" : "[";
}
Kh.peek = Zk;
function Kh(t, e, n, r) {
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
function Zk() {
  return "[";
}
function Ta(t) {
  const e = t.options.bullet || "*";
  if (e !== "*" && e !== "+" && e !== "-")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.bullet`, expected `*`, `+`, or `-`"
    );
  return e;
}
function e1(t) {
  const e = Ta(t), n = t.options.bulletOther;
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
function t1(t) {
  const e = t.options.bulletOrdered || ".";
  if (e !== "." && e !== ")")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.bulletOrdered`, expected `.` or `)`"
    );
  return e;
}
function Uh(t) {
  const e = t.options.rule || "*";
  if (e !== "*" && e !== "-" && e !== "_")
    throw new Error(
      "Cannot serialize rules with `" + e + "` for `options.rule`, expected `*`, `-`, or `_`"
    );
  return e;
}
function n1(t, e, n, r) {
  const i = n.enter("list"), o = n.bulletCurrent;
  let s = t.ordered ? t1(n) : Ta(n);
  const l = t.ordered ? s === "." ? ")" : "." : e1(n);
  let a = e && n.bulletLastUsed ? s === n.bulletLastUsed : !1;
  if (!t.ordered) {
    const c = t.children ? t.children[0] : void 0;
    if (
      // Bullet could be used as a thematic break marker:
      (s === "*" || s === "-") && // Empty first list item:
      c && (!c.children || !c.children[0]) && // Directly in two other list items:
      n.stack[n.stack.length - 1] === "list" && n.stack[n.stack.length - 2] === "listItem" && n.stack[n.stack.length - 3] === "list" && n.stack[n.stack.length - 4] === "listItem" && // That are each the first child.
      n.indexStack[n.indexStack.length - 1] === 0 && n.indexStack[n.indexStack.length - 2] === 0 && n.indexStack[n.indexStack.length - 3] === 0 && (a = !0), Uh(n) === s && c
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
function r1(t) {
  const e = t.options.listItemIndent || "one";
  if (e !== "tab" && e !== "one" && e !== "mixed")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.listItemIndent`, expected `tab`, `one`, or `mixed`"
    );
  return e;
}
function i1(t, e, n, r) {
  const i = r1(n);
  let o = n.bulletCurrent || Ta(n);
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
function o1(t, e, n, r) {
  const i = n.enter("paragraph"), o = n.enter("phrasing"), s = n.containerPhrasing(t, r);
  return o(), i(), s;
}
const s1 = (
  /** @type {(node?: unknown) => node is Exclude<PhrasingContent, Html>} */
  Cs([
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
function l1(t, e, n, r) {
  return (t.children.some(function(s) {
    return s1(s);
  }) ? n.containerPhrasing : n.containerFlow).call(n, t, r);
}
function a1(t) {
  const e = t.options.strong || "*";
  if (e !== "*" && e !== "_")
    throw new Error(
      "Cannot serialize strong with `" + e + "` for `options.strong`, expected `*`, or `_`"
    );
  return e;
}
Jh.peek = u1;
function Jh(t, e, n, r) {
  const i = a1(n), o = n.enter("strong"), s = n.createTracker(r), l = s.move(i + i);
  let a = s.move(
    n.containerPhrasing(t, {
      after: i,
      before: l,
      ...s.current()
    })
  );
  const u = a.charCodeAt(0), c = es(
    r.before.charCodeAt(r.before.length - 1),
    u,
    i
  );
  c.inside && (a = Sn(u) + a.slice(1));
  const f = a.charCodeAt(a.length - 1), d = es(r.after.charCodeAt(0), f, i);
  d.inside && (a = a.slice(0, -1) + Sn(f));
  const h = s.move(i + i);
  return o(), n.attentionEncodeSurroundingInfo = {
    after: d.outside,
    before: c.outside
  }, l + a + h;
}
function u1(t, e, n) {
  return n.options.strong || "*";
}
function c1(t, e, n, r) {
  return n.safe(t.value, r);
}
function f1(t) {
  const e = t.options.ruleRepetition || 3;
  if (e < 3)
    throw new Error(
      "Cannot serialize rules with repetition `" + e + "` for `options.ruleRepetition`, expected `3` or more"
    );
  return e;
}
function h1(t, e, n) {
  const r = (Uh(n) + (n.options.ruleSpaces ? " " : "")).repeat(f1(n));
  return n.options.ruleSpaces ? r.slice(0, -1) : r;
}
const va = {
  blockquote: Ok,
  break: Mc,
  code: Pk,
  definition: Bk,
  emphasis: Bh,
  hardBreak: Mc,
  heading: Uk,
  html: _h,
  image: Vh,
  imageReference: Hh,
  inlineCode: jh,
  link: Wh,
  linkReference: Kh,
  list: n1,
  listItem: i1,
  paragraph: o1,
  root: l1,
  strong: Jh,
  text: c1,
  thematicBreak: h1
}, d1 = [p1];
function p1(t, e, n, r) {
  if (e.type === "code" && Bl(e, r) && (t.type === "list" || t.type === e.type && Bl(t, r)))
    return !1;
  if ("spread" in n && typeof n.spread == "boolean")
    return t.type === "paragraph" && // Two paragraphs.
    (t.type === e.type || e.type === "definition" || // Paragraph followed by a setext heading.
    e.type === "heading" && $h(e, r)) ? void 0 : n.spread ? 1 : 0;
}
const On = [
  "autolink",
  "destinationLiteral",
  "destinationRaw",
  "reference",
  "titleQuote",
  "titleApostrophe"
], m1 = [
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
    notInConstruct: On
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
    notInConstruct: On
  },
  // A right paren could start a list item or break out of a destination
  // raw.
  { atBreak: !0, before: "\\d+", character: ")" },
  { character: ")", inConstruct: "destinationRaw" },
  // An asterisk can start thematic breaks, list items, emphasis, strong.
  { atBreak: !0, character: "*", after: `(?:[ 	\r
*])` },
  { character: "*", inConstruct: "phrasing", notInConstruct: On },
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
    notInConstruct: On
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
  { character: "[", inConstruct: "phrasing", notInConstruct: On },
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
  { character: "_", inConstruct: "phrasing", notInConstruct: On },
  // A grave accent can start code (fenced or text), or it can break out of
  // a grave accent code fence.
  { atBreak: !0, character: "`" },
  {
    character: "`",
    inConstruct: ["codeFencedLangGraveAccent", "codeFencedMetaGraveAccent"]
  },
  { character: "`", inConstruct: "phrasing", notInConstruct: On },
  // Left brace, vertical bar, right brace are not used in markdown for
  // constructs.
  // A tilde can start code (fenced).
  { atBreak: !0, character: "~" }
];
function g1(t) {
  return t.label || !t.identifier ? t.label || "" : Dh(t.identifier);
}
function y1(t) {
  if (!t._compiled) {
    const e = (t.atBreak ? "[\\r\\n][\\t ]*" : "") + (t.before ? "(?:" + t.before + ")" : "");
    t._compiled = new RegExp(
      (e ? "(" + e + ")" : "") + (/[|\\{}()[\]^$+*?.-]/.test(t.character) ? "\\" : "") + t.character + (t.after ? "(?:" + t.after + ")" : ""),
      "g"
    );
  }
  return t._compiled;
}
function k1(t, e, n) {
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
    a && a === d.slice(0, 1) && (d = Sn(a.charCodeAt(0)) + d.slice(1));
    const h = e.attentionEncodeSurroundingInfo;
    e.attentionEncodeSurroundingInfo = void 0, a = void 0, h && (o.length > 0 && h.before && l === o[o.length - 1].slice(-1) && (o[o.length - 1] = o[o.length - 1].slice(0, -1) + Sn(l.charCodeAt(0))), h.after && (a = f)), u.move(d), o.push(d), l = d.slice(-1);
  }
  return r.pop(), o.join("");
}
function b1(t, e, n) {
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
      o.move(w1(a, i[l + 1], t, e))
    );
  }
  return r.pop(), s.join("");
}
function w1(t, e, n, r) {
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
const x1 = /\r?\n|\r/g;
function C1(t, e) {
  const n = [];
  let r = 0, i = 0, o;
  for (; o = x1.exec(t); )
    s(t.slice(r, o.index)), n.push(o[0]), r = o.index + o[0].length, i++;
  return s(t.slice(r)), n.join("");
  function s(l) {
    n.push(e(l, i, !l));
  }
}
function S1(t, e, n) {
  const r = (n.before || "") + (e || "") + (n.after || ""), i = [], o = [], s = {};
  let l = -1;
  for (; ++l < t.unsafe.length; ) {
    const c = t.unsafe[l];
    if (!zh(t.stack, c))
      continue;
    const f = t.compilePattern(c);
    let d;
    for (; d = f.exec(r); ) {
      const h = "before" in c || !!c.atBreak, p = "after" in c, m = d.index + (h ? d[1].length : 0);
      i.includes(m) ? (s[m].before && !h && (s[m].before = !1), s[m].after && !p && (s[m].after = !1)) : (i.push(m), s[m] = { before: h, after: p });
    }
  }
  i.sort(M1);
  let a = n.before ? n.before.length : 0;
  const u = r.length - (n.after ? n.after.length : 0);
  for (l = -1; ++l < i.length; ) {
    const c = i[l];
    c < a || c >= u || c + 1 < u && i[l + 1] === c + 1 && s[c].after && !s[c + 1].before && !s[c + 1].after || i[l - 1] === c - 1 && s[c].before && !s[c - 1].before && !s[c - 1].after || (a !== c && o.push(Nc(r.slice(a, c), "\\")), a = c, /[!-/:-@[-`{-~]/.test(r.charAt(c)) && (!n.encode || !n.encode.includes(r.charAt(c))) ? o.push("\\") : (o.push(Sn(r.charCodeAt(c))), a++));
  }
  return o.push(Nc(r.slice(a, u), n.after)), o.join("");
}
function M1(t, e) {
  return t - e;
}
function Nc(t, e) {
  const n = /\\(?=[!-/:-@[-`{-~])/g, r = [], i = [], o = t + e;
  let s = -1, l = 0, a;
  for (; a = n.exec(o); )
    r.push(a.index);
  for (; ++s < r.length; )
    l !== r[s] && i.push(t.slice(l, r[s])), i.push("\\"), l = r[s];
  return i.push(t.slice(l)), i.join("");
}
function N1(t) {
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
function T1(t, e) {
  const n = e || {}, r = {
    associationId: g1,
    containerPhrasing: E1,
    containerFlow: O1,
    createTracker: N1,
    compilePattern: y1,
    enter: o,
    // @ts-expect-error: GFM / frontmatter are typed in `mdast` but not defined
    // here.
    handlers: { ...va },
    // @ts-expect-error: add `handle` in a second.
    handle: void 0,
    indentLines: C1,
    indexStack: [],
    join: [...d1],
    options: {},
    safe: D1,
    stack: [],
    unsafe: [...m1]
  };
  Ph(r, n), r.options.tightDefinitions && r.join.push(A1), r.handle = Ik("type", {
    invalid: v1,
    unknown: I1,
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
function v1(t) {
  throw new Error("Cannot handle value `" + t + "`, expected node");
}
function I1(t) {
  const e = (
    /** @type {Nodes} */
    t
  );
  throw new Error("Cannot handle unknown node `" + e.type + "`");
}
function A1(t, e) {
  if (t.type === "definition" && t.type === e.type)
    return 0;
}
function E1(t, e) {
  return k1(t, this, e);
}
function O1(t, e) {
  return b1(t, this, e);
}
function D1(t, e) {
  return S1(this, t, e);
}
function _l(t) {
  const e = this;
  e.compiler = n;
  function n(r) {
    return T1(r, {
      ...e.data("settings"),
      ...t,
      // Note: this option is not in the readme.
      // The goal is for it to be set by plugins on `data` instead of being
      // passed by users.
      extensions: e.data("toMarkdownExtensions") || []
    });
  }
}
function Tc(t) {
  if (t)
    throw t;
}
function R1(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var $o = Object.prototype.hasOwnProperty, Gh = Object.prototype.toString, vc = Object.defineProperty, Ic = Object.getOwnPropertyDescriptor, Ac = function(e) {
  return typeof Array.isArray == "function" ? Array.isArray(e) : Gh.call(e) === "[object Array]";
}, Ec = function(e) {
  if (!e || Gh.call(e) !== "[object Object]")
    return !1;
  var n = $o.call(e, "constructor"), r = e.constructor && e.constructor.prototype && $o.call(e.constructor.prototype, "isPrototypeOf");
  if (e.constructor && !n && !r)
    return !1;
  var i;
  for (i in e)
    ;
  return typeof i > "u" || $o.call(e, i);
}, Oc = function(e, n) {
  vc && n.name === "__proto__" ? vc(e, n.name, {
    enumerable: !0,
    configurable: !0,
    value: n.newValue,
    writable: !0
  }) : e[n.name] = n.newValue;
}, Dc = function(e, n) {
  if (n === "__proto__")
    if ($o.call(e, n)) {
      if (Ic)
        return Ic(e, n).value;
    } else return;
  return e[n];
}, L1 = function t() {
  var e, n, r, i, o, s, l = arguments[0], a = 1, u = arguments.length, c = !1;
  for (typeof l == "boolean" && (c = l, l = arguments[1] || {}, a = 2), (l == null || typeof l != "object" && typeof l != "function") && (l = {}); a < u; ++a)
    if (e = arguments[a], e != null)
      for (n in e)
        r = Dc(l, n), i = Dc(e, n), l !== i && (c && i && (Ec(i) || (o = Ac(i))) ? (o ? (o = !1, s = r && Ac(r) ? r : []) : s = r && Ec(r) ? r : {}, Oc(l, { name: n, newValue: t(c, s, i) })) : typeof i < "u" && Oc(l, { name: n, newValue: i }));
  return l;
};
const Vs = /* @__PURE__ */ R1(L1);
function Vl(t) {
  if (typeof t != "object" || t === null)
    return !1;
  const e = Object.getPrototypeOf(t);
  return (e === null || e === Object.prototype || Object.getPrototypeOf(e) === null) && !(Symbol.toStringTag in t) && !(Symbol.iterator in t);
}
function P1() {
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
      i = u, c ? z1(c, l)(...u) : s(null, ...u);
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
function z1(t, e) {
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
class We extends Error {
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
    this.ancestors = o.ancestors || void 0, this.cause = o.cause || void 0, this.column = l ? l.column : void 0, this.fatal = void 0, this.file = "", this.message = i, this.line = l ? l.line : void 0, this.name = yi(o.place) || "1:1", this.place = o.place || void 0, this.reason = this.message, this.ruleId = o.ruleId || void 0, this.source = o.source || void 0, this.stack = s && o.cause && typeof o.cause.stack == "string" ? o.cause.stack : "", this.actual = void 0, this.expected = void 0, this.note = void 0, this.url = void 0;
  }
}
We.prototype.file = "";
We.prototype.name = "";
We.prototype.reason = "";
We.prototype.message = "";
We.prototype.stack = "";
We.prototype.column = void 0;
We.prototype.line = void 0;
We.prototype.ancestors = void 0;
We.prototype.cause = void 0;
We.prototype.fatal = void 0;
We.prototype.place = void 0;
We.prototype.ruleId = void 0;
We.prototype.source = void 0;
const Mt = { basename: B1, dirname: F1, extname: $1, join: _1, sep: "/" };
function B1(t, e) {
  if (e !== void 0 && typeof e != "string")
    throw new TypeError('"ext" argument must be a string');
  so(t);
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
function F1(t) {
  if (so(t), t.length === 0)
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
function $1(t) {
  so(t);
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
function _1(...t) {
  let e = -1, n;
  for (; ++e < t.length; )
    so(t[e]), t[e] && (n = n === void 0 ? t[e] : n + "/" + t[e]);
  return n === void 0 ? "." : V1(n);
}
function V1(t) {
  so(t);
  const e = t.codePointAt(0) === 47;
  let n = H1(t, !e);
  return n.length === 0 && !e && (n = "."), n.length > 0 && t.codePointAt(t.length - 1) === 47 && (n += "/"), e ? "/" + n : n;
}
function H1(t, e) {
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
function so(t) {
  if (typeof t != "string")
    throw new TypeError(
      "Path must be a string. Received " + JSON.stringify(t)
    );
}
const j1 = { cwd: q1 };
function q1() {
  return "/";
}
function Hl(t) {
  return !!(t !== null && typeof t == "object" && "href" in t && t.href && "protocol" in t && t.protocol && // @ts-expect-error: indexing is fine.
  t.auth === void 0);
}
function W1(t) {
  if (typeof t == "string")
    t = new URL(t);
  else if (!Hl(t)) {
    const e = new TypeError(
      'The "path" argument must be of type string or an instance of URL. Received `' + t + "`"
    );
    throw e.code = "ERR_INVALID_ARG_TYPE", e;
  }
  if (t.protocol !== "file:") {
    const e = new TypeError("The URL must be of scheme file");
    throw e.code = "ERR_INVALID_URL_SCHEME", e;
  }
  return K1(t);
}
function K1(t) {
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
const Hs = (
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
class U1 {
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
    e ? Hl(e) ? n = { path: e } : typeof e == "string" || J1(e) ? n = { value: e } : n = e : n = {}, this.cwd = "cwd" in n ? "" : j1.cwd(), this.data = {}, this.history = [], this.messages = [], this.value, this.map, this.result, this.stored;
    let r = -1;
    for (; ++r < Hs.length; ) {
      const o = Hs[r];
      o in n && n[o] !== void 0 && n[o] !== null && (this[o] = o === "history" ? [...n[o]] : n[o]);
    }
    let i;
    for (i in n)
      Hs.includes(i) || (this[i] = n[i]);
  }
  /**
   * Get the basename (including extname) (example: `'index.min.js'`).
   *
   * @returns {string | undefined}
   *   Basename.
   */
  get basename() {
    return typeof this.path == "string" ? Mt.basename(this.path) : void 0;
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
    qs(e, "basename"), js(e, "basename"), this.path = Mt.join(this.dirname || "", e);
  }
  /**
   * Get the parent path (example: `'~'`).
   *
   * @returns {string | undefined}
   *   Dirname.
   */
  get dirname() {
    return typeof this.path == "string" ? Mt.dirname(this.path) : void 0;
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
    Rc(this.basename, "dirname"), this.path = Mt.join(e || "", this.basename);
  }
  /**
   * Get the extname (including dot) (example: `'.js'`).
   *
   * @returns {string | undefined}
   *   Extname.
   */
  get extname() {
    return typeof this.path == "string" ? Mt.extname(this.path) : void 0;
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
    if (js(e, "extname"), Rc(this.dirname, "extname"), e) {
      if (e.codePointAt(0) !== 46)
        throw new Error("`extname` must start with `.`");
      if (e.includes(".", 1))
        throw new Error("`extname` cannot contain multiple dots");
    }
    this.path = Mt.join(this.dirname, this.stem + (e || ""));
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
    Hl(e) && (e = W1(e)), qs(e, "path"), this.path !== e && this.history.push(e);
  }
  /**
   * Get the stem (basename w/o extname) (example: `'index.min'`).
   *
   * @returns {string | undefined}
   *   Stem.
   */
  get stem() {
    return typeof this.path == "string" ? Mt.basename(this.path, this.extname) : void 0;
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
    qs(e, "stem"), js(e, "stem"), this.path = Mt.join(this.dirname || "", e + (this.extname || ""));
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
    const i = new We(
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
function js(t, e) {
  if (t && t.includes(Mt.sep))
    throw new Error(
      "`" + e + "` cannot be a path: did not expect `" + Mt.sep + "`"
    );
}
function qs(t, e) {
  if (!t)
    throw new Error("`" + e + "` cannot be empty");
}
function Rc(t, e) {
  if (!t)
    throw new Error("Setting `" + e + "` requires `path` to be set too");
}
function J1(t) {
  return !!(t && typeof t == "object" && "byteLength" in t && "byteOffset" in t);
}
const G1 = (
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
), Y1 = {}.hasOwnProperty;
class Ia extends G1 {
  /**
   * Create a processor.
   */
  constructor() {
    super("copy"), this.Compiler = void 0, this.Parser = void 0, this.attachers = [], this.compiler = void 0, this.freezeIndex = -1, this.frozen = void 0, this.namespace = {}, this.parser = void 0, this.transformers = P1();
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
      new Ia()
    );
    let n = -1;
    for (; ++n < this.attachers.length; ) {
      const r = this.attachers[n];
      e.use(...r);
    }
    return e.data(Vs(!0, {}, this.namespace)), e;
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
    return typeof e == "string" ? arguments.length === 2 ? (Us("data", this.frozen), this.namespace[e] = n, this) : Y1.call(this.namespace, e) && this.namespace[e] || void 0 : e ? (Us("data", this.frozen), this.namespace = e, this) : this.namespace;
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
    const n = Ao(e), r = this.parser || this.Parser;
    return Ws("parse", r), r(String(n), n);
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
    return this.freeze(), Ws("process", this.parser || this.Parser), Ks("process", this.compiler || this.Compiler), n ? i(void 0, n) : new Promise(i);
    function i(o, s) {
      const l = Ao(e), a = (
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
        X1(p) ? d.value = p : d.result = p, u(
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
    return this.freeze(), Ws("processSync", this.parser || this.Parser), Ks("processSync", this.compiler || this.Compiler), this.process(e, i), Pc("processSync", "process", n), r;
    function i(o, s) {
      n = !0, Tc(o), r = s;
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
    Lc(e), this.freeze();
    const i = this.transformers;
    return !r && typeof n == "function" && (r = n, n = void 0), r ? o(void 0, r) : new Promise(o);
    function o(s, l) {
      const a = Ao(n);
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
    return this.run(e, n, o), Pc("runSync", "run", r), i;
    function o(s, l) {
      Tc(s), i = l, r = !0;
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
    const r = Ao(n), i = this.compiler || this.Compiler;
    return Ks("stringify", i), Lc(e), i(e, r);
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
    if (Us("use", this.frozen), e != null) if (typeof e == "function")
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
      l(u.plugins), u.settings && (i.settings = Vs(!0, i.settings, u.settings));
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
        const m = r[d][1];
        Vl(m) && Vl(h) && (h = Vs(!0, m, h)), r[d] = [u, h, ...p];
      }
    }
  }
}
const jl = new Ia().freeze();
function Ws(t, e) {
  if (typeof e != "function")
    throw new TypeError("Cannot `" + t + "` without `parser`");
}
function Ks(t, e) {
  if (typeof e != "function")
    throw new TypeError("Cannot `" + t + "` without `compiler`");
}
function Us(t, e) {
  if (e)
    throw new Error(
      "Cannot call `" + t + "` on a frozen processor.\nCreate a new processor first, by calling it: use `processor()` instead of `processor`."
    );
}
function Lc(t) {
  if (!Vl(t) || typeof t.type != "string")
    throw new TypeError("Expected node, got `" + t + "`");
}
function Pc(t, e, n) {
  if (!n)
    throw new Error(
      "`" + t + "` finished async. Use `" + e + "` instead"
    );
}
function Ao(t) {
  return Q1(t) ? t : new U1(t);
}
function Q1(t) {
  return !!(t && typeof t == "object" && "message" in t && "messages" in t);
}
function X1(t) {
  return typeof t == "string" || Z1(t);
}
function Z1(t) {
  return !!(t && typeof t == "object" && "byteLength" in t && "byteOffset" in t);
}
function Ce(t) {
  this.content = t;
}
Ce.prototype = {
  constructor: Ce,
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
    return i == -1 ? o.push(n || t, e) : (o[i + 1] = e, n && (o[i] = n)), new Ce(o);
  },
  // :: (string) → OrderedMap
  // Return a map with the given key removed, if it existed.
  remove: function(t) {
    var e = this.find(t);
    if (e == -1) return this;
    var n = this.content.slice();
    return n.splice(e, 2), new Ce(n);
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the start of the map.
  addToStart: function(t, e) {
    return new Ce([t, e].concat(this.remove(t).content));
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the end of the map.
  addToEnd: function(t, e) {
    var n = this.remove(t).content.slice();
    return n.push(t, e), new Ce(n);
  },
  // :: (string, string, any) → OrderedMap
  // Add a key after the given key. If `place` is not found, the new
  // key is added to the end.
  addBefore: function(t, e, n) {
    var r = this.remove(e), i = r.content.slice(), o = r.find(t);
    return i.splice(o == -1 ? i.length : o, 0, e, n), new Ce(i);
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
    return t = Ce.from(t), t.size ? new Ce(t.content.concat(this.subtract(t).content)) : this;
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a new map by appending the keys in this map that don't
  // appear in `map` after the keys in `map`.
  append: function(t) {
    return t = Ce.from(t), t.size ? new Ce(this.subtract(t).content.concat(t.content)) : this;
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a map containing all the keys in this map that don't
  // appear in `map`.
  subtract: function(t) {
    var e = this;
    t = Ce.from(t);
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
Ce.from = function(t) {
  if (t instanceof Ce) return t;
  var e = [];
  if (t) for (var n in t) e.push(n, t[n]);
  return new Ce(e);
};
function Yh(t, e, n) {
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
      let s = Yh(i.content, o.content, n + 1);
      if (s != null)
        return s;
    }
    n += i.nodeSize;
  }
}
function Qh(t, e, n, r) {
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
      let u = Qh(s.content, l.content, n - 1, r - 1);
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
    return Yh(this, e, n);
  }
  /**
  Find the first position, searching from the end, at which this
  fragment and the given fragment differ, or `null` if they are
  the same. Since this position will not be the same in both
  nodes, an object with two separate positions is returned.
  */
  findDiffEnd(e, n = this.size, r = e.size) {
    return Qh(this, e, n, r);
  }
  /**
  Find the index and inner offset corresponding to a given relative
  position in this fragment. The result object will be reused
  (overwritten) the next time the function is called. @internal
  */
  findIndex(e) {
    if (e == 0)
      return Eo(0, e);
    if (e == this.size)
      return Eo(this.content.length, e);
    if (e > this.size || e < 0)
      throw new RangeError(`Position ${e} outside of fragment (${this})`);
    for (let n = 0, r = 0; ; n++) {
      let i = this.child(n), o = r + i.nodeSize;
      if (o >= e)
        return o == e ? Eo(n + 1, o) : Eo(n, r);
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
const Js = { index: 0, offset: 0 };
function Eo(t, e) {
  return Js.index = t, Js.offset = e, Js;
}
function ts(t, e) {
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
      if (!ts(t[r], e[r]))
        return !1;
  } else {
    for (let r in t)
      if (!(r in e) || !ts(t[r], e[r]))
        return !1;
    for (let r in e)
      if (!(r in t))
        return !1;
  }
  return !0;
}
class ne {
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
    return this == e || this.type == e.type && ts(this.attrs, e.attrs);
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
      return ne.none;
    if (e instanceof ne)
      return [e];
    let n = e.slice();
    return n.sort((r, i) => r.type.rank - i.type.rank), n;
  }
}
ne.none = [];
class ns extends Error {
}
class P {
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
    let r = Zh(this.content, e + this.openStart, n);
    return r && new P(r, this.openStart, this.openEnd);
  }
  /**
  @internal
  */
  removeBetween(e, n) {
    return new P(Xh(this.content, e + this.openStart, n + this.openStart), this.openStart, this.openEnd);
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
      return P.empty;
    let r = n.openStart || 0, i = n.openEnd || 0;
    if (typeof r != "number" || typeof i != "number")
      throw new RangeError("Invalid input for Slice.fromJSON");
    return new P(A.fromJSON(e, n.content), r, i);
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
    return new P(e, r, i);
  }
}
P.empty = new P(A.empty, 0, 0);
function Xh(t, e, n) {
  let { index: r, offset: i } = t.findIndex(e), o = t.maybeChild(r), { index: s, offset: l } = t.findIndex(n);
  if (i == e || o.isText) {
    if (l != n && !t.child(s).isText)
      throw new RangeError("Removing non-flat range");
    return t.cut(0, e).append(t.cut(n));
  }
  if (r != s)
    throw new RangeError("Removing non-flat range");
  return t.replaceChild(r, o.copy(Xh(o.content, e - i - 1, n - i - 1)));
}
function Zh(t, e, n, r) {
  let { index: i, offset: o } = t.findIndex(e), s = t.maybeChild(i);
  if (o == e || s.isText)
    return r && !r.canReplace(i, i, n) ? null : t.cut(0, e).append(n).append(t.cut(e));
  let l = Zh(s.content, e - o - 1, n, s);
  return l && t.replaceChild(i, s.copy(l));
}
function eb(t, e, n) {
  if (n.openStart > t.depth)
    throw new ns("Inserted content deeper than insertion position");
  if (t.depth - n.openStart != e.depth - n.openEnd)
    throw new ns("Inconsistent open depths");
  return ed(t, e, n, 0);
}
function ed(t, e, n, r) {
  let i = t.index(r), o = t.node(r);
  if (i == e.index(r) && r < t.depth - n.openStart) {
    let s = ed(t, e, n, r + 1);
    return o.copy(o.content.replaceChild(i, s));
  } else if (n.content.size)
    if (!n.openStart && !n.openEnd && t.depth == r && e.depth == r) {
      let s = t.parent, l = s.content;
      return qn(s, l.cut(0, t.parentOffset).append(n.content).append(l.cut(e.parentOffset)));
    } else {
      let { start: s, end: l } = tb(n, t);
      return qn(o, nd(t, s, l, e, r));
    }
  else return qn(o, rs(t, e, r));
}
function td(t, e) {
  if (!e.type.compatibleContent(t.type))
    throw new ns("Cannot join " + e.type.name + " onto " + t.type.name);
}
function ql(t, e, n) {
  let r = t.node(n);
  return td(r, e.node(n)), r;
}
function jn(t, e) {
  let n = e.length - 1;
  n >= 0 && t.isText && t.sameMarkup(e[n]) ? e[n] = t.withText(e[n].text + t.text) : e.push(t);
}
function ki(t, e, n, r) {
  let i = (e || t).node(n), o = 0, s = e ? e.index(n) : i.childCount;
  t && (o = t.index(n), t.depth > n ? o++ : t.textOffset && (jn(t.nodeAfter, r), o++));
  for (let l = o; l < s; l++)
    jn(i.child(l), r);
  e && e.depth == n && e.textOffset && jn(e.nodeBefore, r);
}
function qn(t, e) {
  return t.type.checkContent(e), t.copy(e);
}
function nd(t, e, n, r, i) {
  let o = t.depth > i && ql(t, e, i + 1), s = r.depth > i && ql(n, r, i + 1), l = [];
  return ki(null, t, i, l), o && s && e.index(i) == n.index(i) ? (td(o, s), jn(qn(o, nd(t, e, n, r, i + 1)), l)) : (o && jn(qn(o, rs(t, e, i + 1)), l), ki(e, n, i, l), s && jn(qn(s, rs(n, r, i + 1)), l)), ki(r, null, i, l), new A(l);
}
function rs(t, e, n) {
  let r = [];
  if (ki(null, t, n, r), t.depth > n) {
    let i = ql(t, e, n + 1);
    jn(qn(i, rs(t, e, n + 1)), r);
  }
  return ki(e, null, n, r), new A(r);
}
function tb(t, e) {
  let n = e.depth - t.openStart, i = e.node(n).copy(t.content);
  for (let o = n - 1; o >= 0; o--)
    i = e.node(o).copy(A.from(i));
  return {
    start: i.resolveNoCache(t.openStart + n),
    end: i.resolveNoCache(i.content.size - t.openEnd - n)
  };
}
class Oi {
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
      return ne.none;
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
        return new rd(this, e, r);
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
    return new Oi(n, r, o);
  }
  /**
  @internal
  */
  static resolveCached(e, n) {
    let r = zc.get(e);
    if (r)
      for (let o = 0; o < r.elts.length; o++) {
        let s = r.elts[o];
        if (s.pos == n)
          return s;
      }
    else
      zc.set(e, r = new nb());
    let i = r.elts[r.i] = Oi.resolve(e, n);
    return r.i = (r.i + 1) % rb, i;
  }
}
class nb {
  constructor() {
    this.elts = [], this.i = 0;
  }
}
const rb = 12, zc = /* @__PURE__ */ new WeakMap();
class rd {
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
const ib = /* @__PURE__ */ Object.create(null);
let Jt = class Wl {
  /**
  @internal
  */
  constructor(e, n, r, i = ne.none) {
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
    return this.type == e && ts(this.attrs, n || e.defaultAttrs || ib) && ne.sameSet(this.marks, r || ne.none);
  }
  /**
  Create a new node with the same markup as this node, containing
  the given content (or empty, if no content is given).
  */
  copy(e = null) {
    return e == this.content ? this : new Wl(this.type, this.attrs, e, this.marks);
  }
  /**
  Create a copy of this node, with the given set of marks instead
  of the node's own marks.
  */
  mark(e) {
    return e == this.marks ? this : new Wl(this.type, this.attrs, this.content, e);
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
      return P.empty;
    let i = this.resolve(e), o = this.resolve(n), s = r ? 0 : i.sharedDepth(n), l = i.start(s), u = i.node(s).content.cut(i.pos - l, o.pos - l);
    return new P(u, i.depth - s, o.depth - s);
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
    return eb(this.resolve(e), this.resolve(n), r);
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
    return Oi.resolveCached(this, e);
  }
  /**
  @internal
  */
  resolveNoCache(e) {
    return Oi.resolve(this, e);
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
    return this.content.size && (e += "(" + this.content.toStringInner() + ")"), id(this.marks, e);
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
    let e = ne.none;
    for (let n = 0; n < this.marks.length; n++) {
      let r = this.marks[n];
      r.type.checkAttrs(r.attrs), e = r.addToSet(e);
    }
    if (!ne.sameSet(e, this.marks))
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
Jt.prototype.text = void 0;
class is extends Jt {
  /**
  @internal
  */
  constructor(e, n, r, i) {
    if (super(e, n, null, i), !r)
      throw new RangeError("Empty text nodes are not allowed");
    this.text = r;
  }
  toString() {
    return this.type.spec.toDebugString ? this.type.spec.toDebugString(this) : id(this.marks, JSON.stringify(this.text));
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
    return e == this.marks ? this : new is(this.type, this.attrs, this.text, e);
  }
  withText(e) {
    return e == this.text ? this : new is(this.type, this.attrs, e, this.marks);
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
function id(t, e) {
  for (let n = t.length - 1; n >= 0; n--)
    e = t[n].type.name + "(" + e + ")";
  return e;
}
class tr {
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
    let r = new ob(e, n);
    if (r.next == null)
      return tr.empty;
    let i = od(r);
    r.next && r.err("Unexpected trailing text");
    let o = hb(fb(i));
    return db(o, r), o;
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
tr.empty = new tr(!0);
class ob {
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
function od(t) {
  let e = [];
  do
    e.push(sb(t));
  while (t.eat("|"));
  return e.length == 1 ? e[0] : { type: "choice", exprs: e };
}
function sb(t) {
  let e = [];
  do
    e.push(lb(t));
  while (t.next && t.next != ")" && t.next != "|");
  return e.length == 1 ? e[0] : { type: "seq", exprs: e };
}
function lb(t) {
  let e = cb(t);
  for (; ; )
    if (t.eat("+"))
      e = { type: "plus", expr: e };
    else if (t.eat("*"))
      e = { type: "star", expr: e };
    else if (t.eat("?"))
      e = { type: "opt", expr: e };
    else if (t.eat("{"))
      e = ab(t, e);
    else
      break;
  return e;
}
function Bc(t) {
  /\D/.test(t.next) && t.err("Expected number, got '" + t.next + "'");
  let e = Number(t.next);
  return t.pos++, e;
}
function ab(t, e) {
  let n = Bc(t), r = n;
  return t.eat(",") && (t.next != "}" ? r = Bc(t) : r = -1), t.eat("}") || t.err("Unclosed braced range"), { type: "range", min: n, max: r, expr: e };
}
function ub(t, e) {
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
function cb(t) {
  if (t.eat("(")) {
    let e = od(t);
    return t.eat(")") || t.err("Missing closing paren"), e;
  } else if (/\W/.test(t.next))
    t.err("Unexpected token '" + t.next + "'");
  else {
    let e = ub(t, t.next).map((n) => (t.inline == null ? t.inline = n.isInline : t.inline != n.isInline && t.err("Mixing inline and block content"), { type: "name", value: n }));
    return t.pos++, e.length == 1 ? e[0] : { type: "choice", exprs: e };
  }
}
function fb(t) {
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
function sd(t, e) {
  return e - t;
}
function Fc(t, e) {
  let n = [];
  return r(e), n.sort(sd);
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
function hb(t) {
  let e = /* @__PURE__ */ Object.create(null);
  return n(Fc(t, 0));
  function n(r) {
    let i = [];
    r.forEach((s) => {
      t[s].forEach(({ term: l, to: a }) => {
        if (!l)
          return;
        let u;
        for (let c = 0; c < i.length; c++)
          i[c][0] == l && (u = i[c][1]);
        Fc(t, a).forEach((c) => {
          u || i.push([l, u = []]), u.indexOf(c) == -1 && u.push(c);
        });
      });
    });
    let o = e[r.join(",")] = new tr(r.indexOf(t.length - 1) > -1);
    for (let s = 0; s < i.length; s++) {
      let l = i[s][1].sort(sd);
      o.next.push({ type: i[s][0], next: e[l.join(",")] || n(l) });
    }
    return o;
  }
}
function db(t, e) {
  for (let n = 0, r = [t]; n < r.length; n++) {
    let i = r[n], o = !i.validEnd, s = [];
    for (let l = 0; l < i.next.length; l++) {
      let { type: a, next: u } = i.next[l];
      s.push(a.name), o && !(a.isText || a.hasRequiredAttrs()) && (o = !1), r.indexOf(u) == -1 && r.push(u);
    }
    o && e.err("Only non-generatable nodes (" + s.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
  }
}
function ld(t) {
  let e = /* @__PURE__ */ Object.create(null);
  for (let n in t) {
    let r = t[n];
    if (!r.hasDefault)
      return null;
    e[n] = r.default;
  }
  return e;
}
function ad(t, e) {
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
function ud(t, e, n, r) {
  for (let i in e)
    if (!(i in t))
      throw new RangeError(`Unsupported attribute ${i} for ${n} of type ${i}`);
  for (let i in t) {
    let o = t[i];
    o.validate && o.validate(e[i]);
  }
}
function cd(t, e) {
  let n = /* @__PURE__ */ Object.create(null);
  if (e)
    for (let r in e)
      n[r] = new mb(t, r, e[r]);
  return n;
}
let $c = class fd {
  /**
  @internal
  */
  constructor(e, n, r) {
    this.name = e, this.schema = n, this.spec = r, this.markSet = null, this.groups = r.group ? r.group.split(" ") : [], this.attrs = cd(e, r.attrs), this.defaultAttrs = ld(this.attrs), this.contentMatch = null, this.inlineContent = null, this.isBlock = !(r.inline || e == "text"), this.isText = e == "text";
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
    return this.contentMatch == tr.empty;
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
    return !e && this.defaultAttrs ? this.defaultAttrs : ad(this.attrs, e);
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
    return new Jt(this, this.computeAttrs(e), A.from(n), ne.setFrom(r));
  }
  /**
  Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but check the given content
  against the node type's content restrictions, and throw an error
  if it doesn't match.
  */
  createChecked(e = null, n, r) {
    return n = A.from(n), this.checkContent(n), new Jt(this, this.computeAttrs(e), n, ne.setFrom(r));
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
    return o ? new Jt(this, e, n.append(o), ne.setFrom(r)) : null;
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
    ud(this.attrs, e, "node", this.name);
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
    return n ? n.length ? n : ne.none : e;
  }
  /**
  @internal
  */
  static compile(e, n) {
    let r = /* @__PURE__ */ Object.create(null);
    e.forEach((o, s) => r[o] = new fd(o, n, s));
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
function pb(t, e, n) {
  let r = n.split("|");
  return (i) => {
    let o = i === null ? "null" : typeof i;
    if (r.indexOf(o) < 0)
      throw new RangeError(`Expected value of type ${r} for attribute ${e} on type ${t}, got ${o}`);
  };
}
class mb {
  constructor(e, n, r) {
    this.hasDefault = Object.prototype.hasOwnProperty.call(r, "default"), this.default = r.default, this.validate = typeof r.validate == "string" ? pb(e, n, r.validate) : r.validate;
  }
  get isRequired() {
    return !this.hasDefault;
  }
}
class Ms {
  /**
  @internal
  */
  constructor(e, n, r, i) {
    this.name = e, this.rank = n, this.schema = r, this.spec = i, this.attrs = cd(e, i.attrs), this.excluded = null;
    let o = ld(this.attrs);
    this.instance = o ? new ne(this, o) : null;
  }
  /**
  Create a mark of this type. `attrs` may be `null` or an object
  containing only some of the mark's attributes. The others, if
  they have defaults, will be added.
  */
  create(e = null) {
    return !e && this.instance ? this.instance : new ne(this, ad(this.attrs, e));
  }
  /**
  @internal
  */
  static compile(e, n) {
    let r = /* @__PURE__ */ Object.create(null), i = 0;
    return e.forEach((o, s) => r[o] = new Ms(o, i++, n, s)), r;
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
    ud(this.attrs, e, "mark", this.name);
  }
  /**
  Queries whether a given mark type is
  [excluded](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) by this one.
  */
  excludes(e) {
    return this.excluded.indexOf(e) > -1;
  }
}
class gb {
  /**
  Construct a schema from a schema [specification](https://prosemirror.net/docs/ref/#model.SchemaSpec).
  */
  constructor(e) {
    this.linebreakReplacement = null, this.cached = /* @__PURE__ */ Object.create(null);
    let n = this.spec = {};
    for (let i in e)
      n[i] = e[i];
    n.nodes = Ce.from(e.nodes), n.marks = Ce.from(e.marks || {}), this.nodes = $c.compile(this.spec.nodes, this), this.marks = Ms.compile(this.spec.marks, this);
    let r = /* @__PURE__ */ Object.create(null);
    for (let i in this.nodes) {
      if (i in this.marks)
        throw new RangeError(i + " can not be both a node and a mark");
      let o = this.nodes[i], s = o.spec.content || "", l = o.spec.marks;
      if (o.contentMatch = r[s] || (r[s] = tr.parse(s, this.nodes)), o.inlineContent = o.contentMatch.inlineContent, o.spec.linebreakReplacement) {
        if (this.linebreakReplacement)
          throw new RangeError("Multiple linebreak nodes defined");
        if (!o.isInline || !o.isLeaf)
          throw new RangeError("Linebreak replacement nodes must be inline leaf nodes");
        this.linebreakReplacement = o;
      }
      o.markSet = l == "_" ? null : l ? _c(this, l.split(" ")) : l == "" || !o.inlineContent ? [] : null;
    }
    for (let i in this.marks) {
      let o = this.marks[i], s = o.spec.excludes;
      o.excluded = s == null ? [o] : s == "" ? [] : _c(this, s.split(" "));
    }
    this.nodeFromJSON = (i) => Jt.fromJSON(this, i), this.markFromJSON = (i) => ne.fromJSON(this, i), this.topNodeType = this.nodes[this.spec.topNode || "doc"], this.cached.wrappings = /* @__PURE__ */ Object.create(null);
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
    else if (e instanceof $c) {
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
    return new is(r, r.defaultAttrs, e, ne.setFrom(n));
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
function _c(t, e) {
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
function yb(t) {
  return t.tag != null;
}
function kb(t) {
  return t.style != null;
}
class qr {
  /**
  Create a parser that targets the given schema, using the given
  parsing rules.
  */
  constructor(e, n) {
    this.schema = e, this.rules = n, this.tags = [], this.styles = [];
    let r = this.matchedStyles = [];
    n.forEach((i) => {
      if (yb(i))
        this.tags.push(i);
      else if (kb(i)) {
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
    let r = new Hc(this, n, !1);
    return r.addAll(e, ne.none, n.from, n.to), r.finish();
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
    let r = new Hc(this, n, !0);
    return r.addAll(e, ne.none, n.from, n.to), P.maxOpen(r.finish());
  }
  /**
  @internal
  */
  matchTag(e, n, r) {
    for (let i = r ? this.tags.indexOf(r) + 1 : 0; i < this.tags.length; i++) {
      let o = this.tags[i];
      if (xb(e, o.tag) && (o.namespace === void 0 || e.namespaceURI == o.namespace) && (!o.context || n.matchesContext(o.context))) {
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
        r(s = jc(s)), s.mark || s.ignore || s.clearMark || (s.mark = i);
      });
    }
    for (let i in e.nodes) {
      let o = e.nodes[i].spec.parseDOM;
      o && o.forEach((s) => {
        r(s = jc(s)), s.node || s.ignore || s.mark || (s.node = i);
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
    return e.cached.domParser || (e.cached.domParser = new qr(e, qr.schemaRules(e)));
  }
}
const hd = {
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
}, bb = {
  head: !0,
  noscript: !0,
  object: !0,
  script: !0,
  style: !0,
  title: !0
}, dd = { ol: !0, ul: !0 }, Di = 1, Kl = 2, bi = 4;
function Vc(t, e, n) {
  return e != null ? (e ? Di : 0) | (e === "full" ? Kl : 0) : t && t.whitespace == "pre" ? Di | Kl : n & ~bi;
}
class Oo {
  constructor(e, n, r, i, o, s) {
    this.type = e, this.attrs = n, this.marks = r, this.solid = i, this.options = s, this.content = [], this.activeMarks = ne.none, this.match = o || (s & bi ? null : e.contentMatch);
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
    if (!(this.options & Di)) {
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
    return this.type ? this.type.inlineContent : this.content.length ? this.content[0].isInline : e.parentNode && !hd.hasOwnProperty(e.parentNode.nodeName.toLowerCase());
  }
}
class Hc {
  constructor(e, n, r) {
    this.parser = e, this.options = n, this.isOpen = r, this.open = 0, this.localPreserveWS = !1;
    let i = n.topNode, o, s = Vc(null, n.preserveWhitespace, 0) | (r ? bi : 0);
    i ? o = new Oo(i.type, i.attrs, ne.none, !0, n.topMatch || i.type.contentMatch, s) : r ? o = new Oo(null, null, ne.none, !0, null, s) : o = new Oo(e.schema.topNodeType, null, ne.none, !0, null, s), this.nodes = [o], this.find = n.findPositions, this.needsBlock = !1;
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
    let r = e.nodeValue, i = this.top, o = i.options & Kl ? "full" : this.localPreserveWS || (i.options & Di) > 0, { schema: s } = this.parser;
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
    dd.hasOwnProperty(s) && this.parser.normalizeLists && wb(e);
    let a = this.options.ruleFromNode && this.options.ruleFromNode(e) || (l = this.parser.matchTag(e, this, r));
    e: if (a ? a.ignore : bb.hasOwnProperty(s))
      this.findInside(e), this.ignoreFallback(e, n);
    else if (!a || a.skip || a.closeParent) {
      a && a.closeParent ? this.open = Math.max(0, this.open - 1) : a && a.skip.nodeType && (e = a.skip);
      let u, c = this.needsBlock;
      if (hd.hasOwnProperty(s))
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
      let s = ne.none;
      for (let l of i.concat(e.marks))
        (o.type ? o.type.allowsMarkType(l.type) : qc(l.type, e.type)) && (s = l.addToSet(s));
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
    let l = Vc(e, o, s.options);
    s.options & bi && s.content.length == 0 && (l |= bi);
    let a = ne.none;
    return r = r.filter((u) => (s.type ? s.type.allowsMarkType(u.type) : qc(u.type, e)) ? (a = u.addToSet(a), !1) : !0), this.nodes.push(new Oo(e, n, a, i, null, l)), this.open++, r;
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
      this.localPreserveWS && (this.nodes[n].options |= Di);
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
function wb(t) {
  for (let e = t.firstChild, n = null; e; e = e.nextSibling) {
    let r = e.nodeType == 1 ? e.nodeName.toLowerCase() : null;
    r && dd.hasOwnProperty(r) && n ? (n.appendChild(e), e = n) : r == "li" ? n = e : r && (n = null);
  }
}
function xb(t, e) {
  return (t.matches || t.msMatchesSelector || t.webkitMatchesSelector || t.mozMatchesSelector).call(t, e);
}
function jc(t) {
  let e = {};
  for (let n in t)
    e[n] = t[n];
  return e;
}
function qc(t, e) {
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
class Xr {
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
    r || (r = Gs(n).createDocumentFragment());
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
    let { dom: r, contentDOM: i } = _o(Gs(n), this.nodes[e.type.name](e), null, e.attrs);
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
    return i && _o(Gs(r), i(e, n), null, e.attrs);
  }
  static renderSpec(e, n, r = null, i) {
    return _o(e, n, r, i);
  }
  /**
  Build a serializer using the [`toDOM`](https://prosemirror.net/docs/ref/#model.NodeSpec.toDOM)
  properties in a schema's node and mark specs.
  */
  static fromSchema(e) {
    return e.cached.domSerializer || (e.cached.domSerializer = new Xr(this.nodesFromSchema(e), this.marksFromSchema(e)));
  }
  /**
  Gather the serializers in a schema's node specs into an object.
  This can be useful as a base to build a custom serializer from.
  */
  static nodesFromSchema(e) {
    let n = Wc(e.nodes);
    return n.text || (n.text = (r) => r.text), n;
  }
  /**
  Gather the serializers in a schema's mark specs into an object.
  */
  static marksFromSchema(e) {
    return Wc(e.marks);
  }
}
function Wc(t) {
  let e = {};
  for (let n in t) {
    let r = t[n].spec.toDOM;
    r && (e[n] = r);
  }
  return e;
}
function Gs(t) {
  return t.document || window.document;
}
const Kc = /* @__PURE__ */ new WeakMap();
function Cb(t) {
  let e = Kc.get(t);
  return e === void 0 && Kc.set(t, e = Sb(t)), e;
}
function Sb(t) {
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
function _o(t, e, n, r) {
  if (typeof e == "string")
    return { dom: t.createTextNode(e) };
  if (e.nodeType != null)
    return { dom: e };
  if (e.dom && e.dom.nodeType != null)
    return e;
  let i = e[0], o;
  if (typeof i != "string")
    throw new RangeError("Invalid array passed to renderSpec");
  if (r && (o = Cb(r)) && o.indexOf(e) > -1)
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
      let { dom: h, contentDOM: p } = _o(t, d, n, r);
      if (a.appendChild(h), p) {
        if (l)
          throw new RangeError("Multiple content holes");
        l = p;
      }
    }
  }
  return { dom: a, contentDOM: l };
}
const pd = 65535, md = Math.pow(2, 16);
function Mb(t, e) {
  return t + e * md;
}
function Uc(t) {
  return t & pd;
}
function Nb(t) {
  return (t - (t & pd)) / md;
}
const gd = 1, yd = 2, Vo = 4, kd = 8;
class Ul {
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
    return (this.delInfo & kd) > 0;
  }
  /**
  Tells you whether the token before the mapped position was deleted.
  */
  get deletedBefore() {
    return (this.delInfo & (gd | Vo)) > 0;
  }
  /**
  True when the token after the mapped position was deleted.
  */
  get deletedAfter() {
    return (this.delInfo & (yd | Vo)) > 0;
  }
  /**
  Tells whether any of the steps mapped through deletes across the
  position (including both the token before and after the
  position).
  */
  get deletedAcross() {
    return (this.delInfo & Vo) > 0;
  }
}
class Ze {
  /**
  Create a position map. The modifications to the document are
  represented as an array of numbers, in which each group of three
  represents a modified chunk as `[start, oldSize, newSize]`.
  */
  constructor(e, n = !1) {
    if (this.ranges = e, this.inverted = n, !e.length && Ze.empty)
      return Ze.empty;
  }
  /**
  @internal
  */
  recover(e) {
    let n = 0, r = Uc(e);
    if (!this.inverted)
      for (let i = 0; i < r; i++)
        n += this.ranges[i * 3 + 2] - this.ranges[i * 3 + 1];
    return this.ranges[r * 3] + n + Nb(e);
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
        let p = e == (n < 0 ? a : f) ? null : Mb(l / 3, e - a), m = e == a ? yd : e == f ? gd : Vo;
        return (n < 0 ? e != a : e != f) && (m |= kd), new Ul(h, m, p);
      }
      i += c - u;
    }
    return r ? e + i : new Ul(e + i, 0, null);
  }
  /**
  @internal
  */
  touches(e, n) {
    let r = 0, i = Uc(n), o = this.inverted ? 2 : 1, s = this.inverted ? 1 : 2;
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
    return new Ze(this.ranges, !this.inverted);
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
    return e == 0 ? Ze.empty : new Ze(e < 0 ? [0, -e, 0] : [0, 0, e]);
  }
}
Ze.empty = new Ze([]);
class Ri {
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
    return new Ri(this._maps, this.mirror, e, n);
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
    let e = new Ri();
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
    return r ? e : new Ul(e, i, null);
  }
}
const Ys = /* @__PURE__ */ Object.create(null);
class De {
  /**
  Get the step map that represents the changes made by this step,
  and which can be used to transform between positions in the old
  and the new document.
  */
  getMap() {
    return Ze.empty;
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
    let r = Ys[n.stepType];
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
    if (e in Ys)
      throw new RangeError("Duplicate use of step JSON ID " + e);
    return Ys[e] = n, n.prototype.jsonID = e, n;
  }
}
class de {
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
    return new de(e, null);
  }
  /**
  Create a failed step result.
  */
  static fail(e) {
    return new de(null, e);
  }
  /**
  Call [`Node.replace`](https://prosemirror.net/docs/ref/#model.Node.replace) with the given
  arguments. Create a successful result if it succeeds, and a
  failed one if it throws a `ReplaceError`.
  */
  static fromReplace(e, n, r, i) {
    try {
      return de.ok(e.replace(n, r, i));
    } catch (o) {
      if (o instanceof ns)
        return de.fail(o.message);
      throw o;
    }
  }
}
function Aa(t, e, n) {
  let r = [];
  for (let i = 0; i < t.childCount; i++) {
    let o = t.child(i);
    o.content.size && (o = o.copy(Aa(o.content, e, o))), o.isInline && (o = e(o, n, i)), r.push(o);
  }
  return A.fromArray(r);
}
class Kt extends De {
  /**
  Create a mark step.
  */
  constructor(e, n, r) {
    super(), this.from = e, this.to = n, this.mark = r;
  }
  apply(e) {
    let n = e.slice(this.from, this.to), r = e.resolve(this.from), i = r.node(r.sharedDepth(this.to)), o = new P(Aa(n.content, (s, l) => !s.isAtom || !l.type.allowsMarkType(this.mark.type) ? s : s.mark(this.mark.addToSet(s.marks)), i), n.openStart, n.openEnd);
    return de.fromReplace(e, this.from, this.to, o);
  }
  invert() {
    return new vt(this.from, this.to, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
    return n.deleted && r.deleted || n.pos >= r.pos ? null : new Kt(n.pos, r.pos, this.mark);
  }
  merge(e) {
    return e instanceof Kt && e.mark.eq(this.mark) && this.from <= e.to && this.to >= e.from ? new Kt(Math.min(this.from, e.from), Math.max(this.to, e.to), this.mark) : null;
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
    return new Kt(n.from, n.to, e.markFromJSON(n.mark));
  }
}
De.jsonID("addMark", Kt);
class vt extends De {
  /**
  Create a mark-removing step.
  */
  constructor(e, n, r) {
    super(), this.from = e, this.to = n, this.mark = r;
  }
  apply(e) {
    let n = e.slice(this.from, this.to), r = new P(Aa(n.content, (i) => i.mark(this.mark.removeFromSet(i.marks)), e), n.openStart, n.openEnd);
    return de.fromReplace(e, this.from, this.to, r);
  }
  invert() {
    return new Kt(this.from, this.to, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
    return n.deleted && r.deleted || n.pos >= r.pos ? null : new vt(n.pos, r.pos, this.mark);
  }
  merge(e) {
    return e instanceof vt && e.mark.eq(this.mark) && this.from <= e.to && this.to >= e.from ? new vt(Math.min(this.from, e.from), Math.max(this.to, e.to), this.mark) : null;
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
    return new vt(n.from, n.to, e.markFromJSON(n.mark));
  }
}
De.jsonID("removeMark", vt);
class gn extends De {
  /**
  Create a node mark step.
  */
  constructor(e, n) {
    super(), this.pos = e, this.mark = n;
  }
  apply(e) {
    let n = e.nodeAt(this.pos);
    if (!n)
      return de.fail("No node at mark step's position");
    let r = n.type.create(n.attrs, null, this.mark.addToSet(n.marks));
    return de.fromReplace(e, this.pos, this.pos + 1, new P(A.from(r), 0, n.isLeaf ? 0 : 1));
  }
  invert(e) {
    let n = e.nodeAt(this.pos);
    if (n) {
      let r = this.mark.addToSet(n.marks);
      if (r.length == n.marks.length) {
        for (let i = 0; i < n.marks.length; i++)
          if (!n.marks[i].isInSet(r))
            return new gn(this.pos, n.marks[i]);
        return new gn(this.pos, this.mark);
      }
    }
    return new nr(this.pos, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.pos, 1);
    return n.deletedAfter ? null : new gn(n.pos, this.mark);
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
    return new gn(n.pos, e.markFromJSON(n.mark));
  }
}
De.jsonID("addNodeMark", gn);
class nr extends De {
  /**
  Create a mark-removing step.
  */
  constructor(e, n) {
    super(), this.pos = e, this.mark = n;
  }
  apply(e) {
    let n = e.nodeAt(this.pos);
    if (!n)
      return de.fail("No node at mark step's position");
    let r = n.type.create(n.attrs, null, this.mark.removeFromSet(n.marks));
    return de.fromReplace(e, this.pos, this.pos + 1, new P(A.from(r), 0, n.isLeaf ? 0 : 1));
  }
  invert(e) {
    let n = e.nodeAt(this.pos);
    return !n || !this.mark.isInSet(n.marks) ? this : new gn(this.pos, this.mark);
  }
  map(e) {
    let n = e.mapResult(this.pos, 1);
    return n.deletedAfter ? null : new nr(n.pos, this.mark);
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
    return new nr(n.pos, e.markFromJSON(n.mark));
  }
}
De.jsonID("removeNodeMark", nr);
class he extends De {
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
    return this.structure && Jl(e, this.from, this.to) ? de.fail("Structure replace would overwrite content") : de.fromReplace(e, this.from, this.to, this.slice);
  }
  getMap() {
    return new Ze([this.from, this.to - this.from, this.slice.size]);
  }
  invert(e) {
    return new he(this.from, this.from + this.slice.size, e.slice(this.from, this.to));
  }
  map(e) {
    let n = e.mapResult(this.to, -1), r = this.from == this.to && he.MAP_BIAS < 0 ? n : e.mapResult(this.from, 1);
    return r.deletedAcross && n.deletedAcross ? null : new he(r.pos, Math.max(r.pos, n.pos), this.slice, this.structure);
  }
  merge(e) {
    if (!(e instanceof he) || e.structure || this.structure)
      return null;
    if (this.from + this.slice.size == e.from && !this.slice.openEnd && !e.slice.openStart) {
      let n = this.slice.size + e.slice.size == 0 ? P.empty : new P(this.slice.content.append(e.slice.content), this.slice.openStart, e.slice.openEnd);
      return new he(this.from, this.to + (e.to - e.from), n, this.structure);
    } else if (e.to == this.from && !this.slice.openStart && !e.slice.openEnd) {
      let n = this.slice.size + e.slice.size == 0 ? P.empty : new P(e.slice.content.append(this.slice.content), e.slice.openStart, this.slice.openEnd);
      return new he(e.from, this.to, n, this.structure);
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
    return new he(n.from, n.to, P.fromJSON(e, n.slice), !!n.structure);
  }
}
he.MAP_BIAS = 1;
De.jsonID("replace", he);
class Ee extends De {
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
    if (this.structure && (Jl(e, this.from, this.gapFrom) || Jl(e, this.gapTo, this.to)))
      return de.fail("Structure gap-replace would overwrite content");
    let n = e.slice(this.gapFrom, this.gapTo);
    if (n.openStart || n.openEnd)
      return de.fail("Gap is not a flat range");
    let r = this.slice.insertAt(this.insert, n.content);
    return r ? de.fromReplace(e, this.from, this.to, r) : de.fail("Content does not fit in gap");
  }
  getMap() {
    return new Ze([
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
    return new Ee(this.from, this.from + this.slice.size + n, this.from + this.insert, this.from + this.insert + n, e.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
  }
  map(e) {
    let n = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1), i = this.from == this.gapFrom ? n.pos : e.map(this.gapFrom, -1), o = this.to == this.gapTo ? r.pos : e.map(this.gapTo, 1);
    return n.deletedAcross && r.deletedAcross || i < n.pos || o > r.pos ? null : new Ee(n.pos, r.pos, i, o, this.slice, this.insert, this.structure);
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
    return new Ee(n.from, n.to, n.gapFrom, n.gapTo, P.fromJSON(e, n.slice), n.insert, !!n.structure);
  }
}
De.jsonID("replaceAround", Ee);
function Jl(t, e, n) {
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
function Tb(t, e, n, r) {
  let i = [], o = [], s, l;
  t.doc.nodesBetween(e, n, (a, u, c) => {
    if (!a.isInline)
      return;
    let f = a.marks;
    if (!r.isInSet(f) && c.type.allowsMarkType(r.type)) {
      let d = Math.max(u, e), h = Math.min(u + a.nodeSize, n), p = r.addToSet(f);
      for (let m = 0; m < f.length; m++)
        f[m].isInSet(p) || (s && s.to == d && s.mark.eq(f[m]) ? s.to = h : i.push(s = new vt(d, h, f[m])));
      l && l.to == d ? l.to = h : o.push(l = new Kt(d, h, r));
    }
  }), i.forEach((a) => t.step(a)), o.forEach((a) => t.step(a));
}
function vb(t, e, n, r) {
  let i = [], o = 0;
  t.doc.nodesBetween(e, n, (s, l) => {
    if (!s.isInline)
      return;
    o++;
    let a = null;
    if (r instanceof Ms) {
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
  }), i.forEach((s) => t.step(new vt(s.from, s.to, s.style)));
}
function Ea(t, e, n, r = n.contentMatch, i = !0) {
  let o = t.doc.nodeAt(e), s = [], l = e + 1;
  for (let a = 0; a < o.childCount; a++) {
    let u = o.child(a), c = l + u.nodeSize, f = r.matchType(u.type);
    if (!f)
      s.push(new he(l, c, P.empty));
    else {
      r = f;
      for (let d = 0; d < u.marks.length; d++)
        n.allowsMarkType(u.marks[d].type) || t.step(new vt(l, c, u.marks[d]));
      if (i && u.isText && n.whitespace != "pre") {
        let d, h = /\r?\n|\r/g, p;
        for (; d = h.exec(u.text); )
          p || (p = new P(A.from(n.schema.text(" ", n.allowedMarks(u.marks))), 0, 0)), s.push(new he(l + d.index, l + d.index + d[0].length, p));
      }
    }
    l = c;
  }
  if (!r.validEnd) {
    let a = r.fillBefore(A.empty, !0);
    t.replace(l, l, new P(a, 0, 0));
  }
  for (let a = s.length - 1; a >= 0; a--)
    t.step(s[a]);
}
function Ib(t, e, n) {
  return (e == 0 || t.canReplace(e, t.childCount)) && (n == t.childCount || t.canReplace(0, n));
}
function Ns(t) {
  let n = t.parent.content.cutByIndex(t.startIndex, t.endIndex);
  for (let r = t.depth, i = 0, o = 0; ; --r) {
    let s = t.$from.node(r), l = t.$from.index(r) + i, a = t.$to.indexAfter(r) - o;
    if (r < t.depth && s.canReplace(l, a, n))
      return r;
    if (r == 0 || s.type.spec.isolating || !Ib(s, l, a))
      break;
    l && (i = 1), a < s.childCount && (o = 1);
  }
  return null;
}
function Ab(t, e, n) {
  let { $from: r, $to: i, depth: o } = e, s = r.before(o + 1), l = i.after(o + 1), a = s, u = l, c = A.empty, f = 0;
  for (let p = o, m = !1; p > n; p--)
    m || r.index(p) > 0 ? (m = !0, c = A.from(r.node(p).copy(c)), f++) : a--;
  let d = A.empty, h = 0;
  for (let p = o, m = !1; p > n; p--)
    m || i.after(p + 1) < i.end(p) ? (m = !0, d = A.from(i.node(p).copy(d)), h++) : u++;
  t.step(new Ee(a, u, s, l, new P(c.append(d), f, h), c.size - f, !0));
}
function Oa(t, e, n = null, r = t) {
  let i = Eb(t, e), o = i && Ob(r, e);
  return o ? i.map(Jc).concat({ type: e, attrs: n }).concat(o.map(Jc)) : null;
}
function Jc(t) {
  return { type: t, attrs: null };
}
function Eb(t, e) {
  let { parent: n, startIndex: r, endIndex: i } = t, o = n.contentMatchAt(r).findWrapping(e);
  if (!o)
    return null;
  let s = o.length ? o[0] : e;
  return n.canReplaceWith(r, i, s) ? o : null;
}
function Ob(t, e) {
  let { parent: n, startIndex: r, endIndex: i } = t, o = n.child(r), s = e.contentMatch.findWrapping(o.type);
  if (!s)
    return null;
  let a = (s.length ? s[s.length - 1] : e).contentMatch;
  for (let u = r; a && u < i; u++)
    a = a.matchType(n.child(u).type);
  return !a || !a.validEnd ? null : s;
}
function Db(t, e, n) {
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
  t.step(new Ee(i, o, i, o, new P(r, 0, 0), n.length, !0));
}
function Rb(t, e, n, r, i) {
  if (!r.isTextblock)
    throw new RangeError("Type given to setBlockType should be a textblock");
  let o = t.steps.length;
  t.doc.nodesBetween(e, n, (s, l) => {
    let a = typeof i == "function" ? i(s) : i;
    if (s.isTextblock && !s.hasMarkup(r, a) && Lb(t.doc, t.mapping.slice(o).map(l), r)) {
      let u = null;
      if (r.schema.linebreakReplacement) {
        let h = r.whitespace == "pre", p = !!r.contentMatch.matchType(r.schema.linebreakReplacement);
        h && !p ? u = !1 : !h && p && (u = !0);
      }
      u === !1 && wd(t, s, l, o), Ea(t, t.mapping.slice(o).map(l, 1), r, void 0, u === null);
      let c = t.mapping.slice(o), f = c.map(l, 1), d = c.map(l + s.nodeSize, 1);
      return t.step(new Ee(f, d, f + 1, d - 1, new P(A.from(r.create(a, null, s.marks)), 0, 0), 1, !0)), u === !0 && bd(t, s, l, o), !1;
    }
  });
}
function bd(t, e, n, r) {
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
function wd(t, e, n, r) {
  e.forEach((i, o) => {
    if (i.type == i.type.schema.linebreakReplacement) {
      let s = t.mapping.slice(r).map(n + 1 + o);
      t.replaceWith(s, s + 1, e.type.schema.text(`
`));
    }
  });
}
function Lb(t, e, n) {
  let r = t.resolve(e), i = r.index();
  return r.parent.canReplaceWith(i, i + 1, n);
}
function Pb(t, e, n, r, i) {
  let o = t.doc.nodeAt(e);
  if (!o)
    throw new RangeError("No node at given position");
  n || (n = o.type);
  let s = n.create(r, null, i || o.marks);
  if (o.isLeaf)
    return t.replaceWith(e, e + o.nodeSize, s);
  if (!n.validContent(o.content))
    throw new RangeError("Invalid content for node type " + n.name);
  t.step(new Ee(e, e + o.nodeSize, e + 1, e + o.nodeSize - 1, new P(A.from(s), 0, 0), 1, !0));
}
function wi(t, e, n = 1, r) {
  let i = t.resolve(e), o = i.depth - n, s = r && r[r.length - 1] || i.parent;
  if (o < 0 || i.parent.type.spec.isolating || !i.parent.canReplace(i.index(), i.parent.childCount) || !s.type.validContent(i.parent.content.cutByIndex(i.index(), i.parent.childCount)))
    return !1;
  for (let u = i.depth - 1, c = n - 2; u > o; u--, c--) {
    let f = i.node(u), d = i.index(u);
    if (f.type.spec.isolating)
      return !1;
    let h = f.content.cutByIndex(d, f.childCount), p = r && r[c + 1];
    p && (h = h.replaceChild(0, p.type.create(p.attrs)));
    let m = r && r[c] || f;
    if (!f.canReplace(d + 1, f.childCount) || !m.type.validContent(h))
      return !1;
  }
  let l = i.indexAfter(o), a = r && r[0];
  return i.node(o).canReplaceWith(l, l, a ? a.type : i.node(o + 1).type);
}
function zb(t, e, n = 1, r) {
  let i = t.doc.resolve(e), o = A.empty, s = A.empty;
  for (let l = i.depth, a = i.depth - n, u = n - 1; l > a; l--, u--) {
    o = A.from(i.node(l).copy(o));
    let c = r && r[u];
    s = A.from(c ? c.type.create(c.attrs, s) : i.node(l).copy(s));
  }
  t.step(new he(e, e, new P(o.append(s), n, n), !0));
}
function Ts(t, e) {
  let n = t.resolve(e), r = n.index();
  return Fb(n.nodeBefore, n.nodeAfter) && n.parent.canReplace(r, r + 1);
}
function Bb(t, e) {
  e.content.size || t.type.compatibleContent(e.type);
  let n = t.contentMatchAt(t.childCount), { linebreakReplacement: r } = t.type.schema;
  for (let i = 0; i < e.childCount; i++) {
    let o = e.child(i), s = o.type == r ? t.type.schema.nodes.text : o.type;
    if (n = n.matchType(s), !n || !t.type.allowsMarks(o.marks))
      return !1;
  }
  return n.validEnd;
}
function Fb(t, e) {
  return !!(t && e && !t.isLeaf && Bb(t, e));
}
function $b(t, e, n) {
  let r = null, { linebreakReplacement: i } = t.doc.type.schema, o = t.doc.resolve(e - n), s = o.node().type;
  if (i && s.inlineContent) {
    let c = s.whitespace == "pre", f = !!s.contentMatch.matchType(i);
    c && !f ? r = !1 : !c && f && (r = !0);
  }
  let l = t.steps.length;
  if (r === !1) {
    let c = t.doc.resolve(e + n);
    wd(t, c.node(), c.before(), l);
  }
  s.inlineContent && Ea(t, e + n - 1, s, o.node().contentMatchAt(o.index()), r == null);
  let a = t.mapping.slice(l), u = a.map(e - n);
  if (t.step(new he(u, a.map(e + n, -1), P.empty, !0)), r === !0) {
    let c = t.doc.resolve(u);
    bd(t, c.node(), c.before(), t.steps.length);
  }
  return t;
}
function _b(t, e, n) {
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
function Vb(t, e, n) {
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
function vs(t, e, n = e, r = P.empty) {
  if (e == n && !r.size)
    return null;
  let i = t.resolve(e), o = t.resolve(n);
  return xd(i, o, r) ? new he(e, n, r) : new Hb(i, o, r).fit();
}
function xd(t, e, n) {
  return !n.openStart && !n.openEnd && t.start() == e.start() && t.parent.canReplace(t.index(), e.index(), n.content);
}
class Hb {
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
    let a = new P(o, s, l);
    return e > -1 ? new Ee(r.pos, e, this.$to.pos, this.$to.end(), a, n) : a.size || r.pos != this.$to.pos ? new he(r.pos, i.pos, a) : null;
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
        r ? (o = Qs(this.unplaced.content, r - 1).firstChild, i = o.content) : i = this.unplaced.content;
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
    let { content: e, openStart: n, openEnd: r } = this.unplaced, i = Qs(e, n);
    return !i.childCount || i.firstChild.isLeaf ? !1 : (this.unplaced = new P(e, n + 1, Math.max(r, i.size + n >= e.size - r ? n + 1 : 0)), !0);
  }
  dropNode() {
    let { content: e, openStart: n, openEnd: r } = this.unplaced, i = Qs(e, n);
    if (i.childCount <= 1 && n > 0) {
      let o = e.size - n <= n + i.size;
      this.unplaced = new P(hi(e, n - 1, 1), n - 1, o ? n - 1 : r);
    } else
      this.unplaced = new P(hi(e, n, 1), n, r);
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
    let s = this.unplaced, l = r ? r.content : s.content, a = s.openStart - e, u = 0, c = [], { match: f, type: d } = this.frontier[n];
    if (i) {
      for (let m = 0; m < i.childCount; m++)
        c.push(i.child(m));
      f = f.matchFragment(i);
    }
    let h = l.size + e - (s.content.size - s.openEnd);
    for (; u < l.childCount; ) {
      let m = l.child(u), y = f.matchType(m.type);
      if (!y)
        break;
      u++, (u > 1 || a == 0 || m.content.size) && (f = y, c.push(Cd(m.mark(d.allowedMarks(m.marks)), u == 1 ? a : 0, u == l.childCount ? h : -1)));
    }
    let p = u == l.childCount;
    p || (h = -1), this.placed = di(this.placed, n, A.from(c)), this.frontier[n].match = f, p && h < 0 && r && r.type == this.frontier[this.depth].type && this.frontier.length > 1 && this.closeFrontierNode();
    for (let m = 0, y = l; m < h; m++) {
      let g = y.lastChild;
      this.frontier.push({ type: g.type, match: g.contentMatchAt(g.childCount) }), y = g.content;
    }
    this.unplaced = p ? e == 0 ? P.empty : new P(hi(s.content, e - 1, 1), e - 1, h < 0 ? s.openEnd : e - 1) : new P(hi(s.content, e, u), s.openStart, s.openEnd);
  }
  mustMoveInline() {
    if (!this.$to.parent.isTextblock)
      return -1;
    let e = this.frontier[this.depth], n;
    if (!e.type.isTextblock || !Xs(this.$to, this.$to.depth, e.type, e.match, !1) || this.$to.depth == this.depth && (n = this.findCloseLevel(this.$to)) && n.depth == this.depth)
      return -1;
    let { depth: r } = this.$to, i = this.$to.after(r);
    for (; r > 1 && i == this.$to.end(--r); )
      ++i;
    return i;
  }
  findCloseLevel(e) {
    e: for (let n = Math.min(this.depth, e.depth); n >= 0; n--) {
      let { match: r, type: i } = this.frontier[n], o = n < e.depth && e.end(n + 1) == e.pos + (e.depth - (n + 1)), s = Xs(e, n, i, r, o);
      if (s) {
        for (let l = n - 1; l >= 0; l--) {
          let { match: a, type: u } = this.frontier[l], c = Xs(e, l, u, a, !0);
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
    n.fit.childCount && (this.placed = di(this.placed, n.depth, n.fit)), e = n.move;
    for (let r = n.depth + 1; r <= e.depth; r++) {
      let i = e.node(r), o = i.type.contentMatch.fillBefore(i.content, !0, e.index(r));
      this.openFrontierNode(i.type, i.attrs, o);
    }
    return e;
  }
  openFrontierNode(e, n = null, r) {
    let i = this.frontier[this.depth];
    i.match = i.match.matchType(e), this.placed = di(this.placed, this.depth, A.from(e.create(n, r))), this.frontier.push({ type: e, match: e.contentMatch });
  }
  closeFrontierNode() {
    let n = this.frontier.pop().match.fillBefore(A.empty, !0);
    n.childCount && (this.placed = di(this.placed, this.frontier.length, n));
  }
}
function hi(t, e, n) {
  return e == 0 ? t.cutByIndex(n, t.childCount) : t.replaceChild(0, t.firstChild.copy(hi(t.firstChild.content, e - 1, n)));
}
function di(t, e, n) {
  return e == 0 ? t.append(n) : t.replaceChild(t.childCount - 1, t.lastChild.copy(di(t.lastChild.content, e - 1, n)));
}
function Qs(t, e) {
  for (let n = 0; n < e; n++)
    t = t.firstChild.content;
  return t;
}
function Cd(t, e, n) {
  if (e <= 0)
    return t;
  let r = t.content;
  return e > 1 && (r = r.replaceChild(0, Cd(r.firstChild, e - 1, r.childCount == 1 ? n - 1 : 0))), e > 0 && (r = t.type.contentMatch.fillBefore(r).append(r), n <= 0 && (r = r.append(t.type.contentMatch.matchFragment(r).fillBefore(A.empty, !0)))), t.copy(r);
}
function Xs(t, e, n, r, i) {
  let o = t.node(e), s = i ? t.indexAfter(e) : t.index(e);
  if (s == o.childCount && !n.compatibleContent(o.type))
    return null;
  let l = r.fillBefore(o.content, !0, s);
  return l && !jb(n, o.content, s) ? l : null;
}
function jb(t, e, n) {
  for (let r = n; r < e.childCount; r++)
    if (!t.allowsMarks(e.child(r).marks))
      return !0;
  return !1;
}
function qb(t) {
  return t.spec.defining || t.spec.definingForContent;
}
function Wb(t, e, n, r) {
  if (!r.size)
    return t.deleteRange(e, n);
  let i = t.doc.resolve(e), o = t.doc.resolve(n);
  if (xd(i, o, r))
    return t.step(new he(e, n, r));
  let s = Md(i, o);
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
    let h = u[d], p = qb(h.type);
    if (p && !h.sameMarkup(i.node(Math.abs(l) - 1)))
      c = d;
    else if (p || !h.type.isTextblock)
      break;
  }
  for (let d = r.openStart; d >= 0; d--) {
    let h = (d + c + 1) % (r.openStart + 1), p = u[h];
    if (p)
      for (let m = 0; m < s.length; m++) {
        let y = s[(m + a) % s.length], g = !0;
        y < 0 && (g = !1, y = -y);
        let E = i.node(y - 1), T = i.index(y - 1);
        if (E.canReplaceWith(T, T, p.type, p.marks))
          return t.replace(i.before(y), g ? o.after(y) : n, new P(Sd(r.content, 0, r.openStart, h), h, r.openEnd));
      }
  }
  let f = t.steps.length;
  for (let d = s.length - 1; d >= 0 && (t.replace(e, n, r), !(t.steps.length > f)); d--) {
    let h = s[d];
    h < 0 || (e = i.before(h), n = o.after(h));
  }
}
function Sd(t, e, n, r, i) {
  if (e < n) {
    let o = t.firstChild;
    t = t.replaceChild(0, o.copy(Sd(o.content, e + 1, n, r, o)));
  }
  if (e > r) {
    let o = i.contentMatchAt(0), s = o.fillBefore(t).append(t);
    t = s.append(o.matchFragment(s).fillBefore(A.empty, !0));
  }
  return t;
}
function Kb(t, e, n, r) {
  if (!r.isInline && e == n && t.doc.resolve(e).parent.content.size) {
    let i = _b(t.doc, e, r.type);
    i != null && (e = n = i);
  }
  t.replaceRange(e, n, new P(A.from(r), 0, 0));
}
function Ub(t, e, n) {
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
  let o = Md(r, i);
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
function Md(t, e) {
  let n = [], r = Math.min(t.depth, e.depth);
  for (let i = r; i >= 0; i--) {
    let o = t.start(i);
    if (o < t.pos - (t.depth - i) || e.end(i) > e.pos + (e.depth - i) || t.node(i).type.spec.isolating || e.node(i).type.spec.isolating)
      break;
    (o == e.start(i) || i == t.depth && i == e.depth && t.parent.inlineContent && e.parent.inlineContent && i && e.start(i - 1) == o - 1) && n.push(i);
  }
  return n;
}
class wr extends De {
  /**
  Construct an attribute step.
  */
  constructor(e, n, r) {
    super(), this.pos = e, this.attr = n, this.value = r;
  }
  apply(e) {
    let n = e.nodeAt(this.pos);
    if (!n)
      return de.fail("No node at attribute step's position");
    let r = /* @__PURE__ */ Object.create(null);
    for (let o in n.attrs)
      r[o] = n.attrs[o];
    r[this.attr] = this.value;
    let i = n.type.create(r, null, n.marks);
    return de.fromReplace(e, this.pos, this.pos + 1, new P(A.from(i), 0, n.isLeaf ? 0 : 1));
  }
  getMap() {
    return Ze.empty;
  }
  invert(e) {
    return new wr(this.pos, this.attr, e.nodeAt(this.pos).attrs[this.attr]);
  }
  map(e) {
    let n = e.mapResult(this.pos, 1);
    return n.deletedAfter ? null : new wr(n.pos, this.attr, this.value);
  }
  toJSON() {
    return { stepType: "attr", pos: this.pos, attr: this.attr, value: this.value };
  }
  static fromJSON(e, n) {
    if (typeof n.pos != "number" || typeof n.attr != "string")
      throw new RangeError("Invalid input for AttrStep.fromJSON");
    return new wr(n.pos, n.attr, n.value);
  }
}
De.jsonID("attr", wr);
class Li extends De {
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
    return de.ok(r);
  }
  getMap() {
    return Ze.empty;
  }
  invert(e) {
    return new Li(this.attr, e.attrs[this.attr]);
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
    return new Li(n.attr, n.value);
  }
}
De.jsonID("docAttr", Li);
let Wr = class extends Error {
};
Wr = function t(e) {
  let n = Error.call(this, e);
  return n.__proto__ = t.prototype, n;
};
Wr.prototype = Object.create(Error.prototype);
Wr.prototype.constructor = Wr;
Wr.prototype.name = "TransformError";
class Nd {
  /**
  Create a transform that starts with the given document.
  */
  constructor(e) {
    this.doc = e, this.steps = [], this.docs = [], this.mapping = new Ri();
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
      throw new Wr(n.failed);
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
  replace(e, n = e, r = P.empty) {
    let i = vs(this.doc, e, n, r);
    return i && this.step(i), this;
  }
  /**
  Replace the given range with the given content, which may be a
  fragment, node, or array of nodes.
  */
  replaceWith(e, n, r) {
    return this.replace(e, n, new P(A.from(r), 0, 0));
  }
  /**
  Delete the content between the given positions.
  */
  delete(e, n) {
    return this.replace(e, n, P.empty);
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
    return Wb(this, e, n, r), this;
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
    return Kb(this, e, n, r), this;
  }
  /**
  Delete the given range, expanding it to cover fully covered
  parent nodes until a valid replace is found.
  */
  deleteRange(e, n) {
    return Ub(this, e, n), this;
  }
  /**
  Split the content in the given range off from its parent, if there
  is sibling content before or after it, and move it up the tree to
  the depth specified by `target`. You'll probably want to use
  [`liftTarget`](https://prosemirror.net/docs/ref/#transform.liftTarget) to compute `target`, to make
  sure the lift is valid.
  */
  lift(e, n) {
    return Ab(this, e, n), this;
  }
  /**
  Join the blocks around the given position. If depth is 2, their
  last and first siblings are also joined, and so on.
  */
  join(e, n = 1) {
    return $b(this, e, n), this;
  }
  /**
  Wrap the given [range](https://prosemirror.net/docs/ref/#model.NodeRange) in the given set of wrappers.
  The wrappers are assumed to be valid in this position, and should
  probably be computed with [`findWrapping`](https://prosemirror.net/docs/ref/#transform.findWrapping).
  */
  wrap(e, n) {
    return Db(this, e, n), this;
  }
  /**
  Set the type of all textblocks (partly) between `from` and `to` to
  the given node type with the given attributes.
  */
  setBlockType(e, n = e, r, i = null) {
    return Rb(this, e, n, r, i), this;
  }
  /**
  Change the type, attributes, and/or marks of the node at `pos`.
  When `type` isn't given, the existing node type is preserved,
  */
  setNodeMarkup(e, n, r = null, i) {
    return Pb(this, e, n, r, i), this;
  }
  /**
  Set a single attribute on a given node to a new value.
  The `pos` addresses the document content. Use `setDocAttribute`
  to set attributes on the document itself.
  */
  setNodeAttribute(e, n, r) {
    return this.step(new wr(e, n, r)), this;
  }
  /**
  Set a single attribute on the document to a new value.
  */
  setDocAttribute(e, n) {
    return this.step(new Li(e, n)), this;
  }
  /**
  Add a mark to the node at position `pos`.
  */
  addNodeMark(e, n) {
    return this.step(new gn(e, n)), this;
  }
  /**
  Remove a mark (or all marks of the given type) from the node at
  position `pos`.
  */
  removeNodeMark(e, n) {
    let r = this.doc.nodeAt(e);
    if (!r)
      throw new RangeError("No node at position " + e);
    if (n instanceof ne)
      n.isInSet(r.marks) && this.step(new nr(e, n));
    else {
      let i = r.marks, o, s = [];
      for (; o = n.isInSet(i); )
        s.push(new nr(e, o)), i = o.removeFromSet(i);
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
    return zb(this, e, n, r), this;
  }
  /**
  Add the given mark to the inline content between `from` and `to`.
  */
  addMark(e, n, r) {
    return Tb(this, e, n, r), this;
  }
  /**
  Remove marks from inline nodes between `from` and `to`. When
  `mark` is a single mark, remove precisely that mark. When it is
  a mark type, remove all marks of that type. When it is null,
  remove all marks of any type.
  */
  removeMark(e, n, r) {
    return vb(this, e, n, r), this;
  }
  /**
  Removes all marks and nodes from the content of the node at
  `pos` that don't match the given new parent node type. Accepts
  an optional starting [content match](https://prosemirror.net/docs/ref/#model.ContentMatch) as
  third argument.
  */
  clearIncompatible(e, n, r) {
    return Ea(this, e, n, r), this;
  }
}
const Zs = /* @__PURE__ */ Object.create(null);
class J {
  /**
  Initialize a selection with the head and anchor and ranges. If no
  ranges are given, constructs a single range across `$anchor` and
  `$head`.
  */
  constructor(e, n, r) {
    this.$anchor = e, this.$head = n, this.ranges = r || [new Td(e.min(n), e.max(n))];
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
  replace(e, n = P.empty) {
    let r = n.content.lastChild, i = null;
    for (let l = 0; l < n.openEnd; l++)
      i = r, r = r.lastChild;
    let o = e.steps.length, s = this.ranges;
    for (let l = 0; l < s.length; l++) {
      let { $from: a, $to: u } = s[l], c = e.mapping.slice(o);
      e.replaceRange(c.map(a.pos), c.map(u.pos), l ? P.empty : n), l == 0 && Qc(e, o, (r ? r.isInline : i && i.isTextblock) ? -1 : 1);
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
      o ? e.deleteRange(u, c) : (e.replaceRangeWith(u, c, n), Qc(e, r, n.isInline ? -1 : 1));
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
    let i = e.parent.inlineContent ? new G(e) : dr(e.node(0), e.parent, e.pos, e.index(), n, r);
    if (i)
      return i;
    for (let o = e.depth - 1; o >= 0; o--) {
      let s = n < 0 ? dr(e.node(0), e.node(o), e.before(o + 1), e.index(o), n, r) : dr(e.node(0), e.node(o), e.after(o + 1), e.index(o) + 1, n, r);
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
    return this.findFrom(e, n) || this.findFrom(e, -n) || new nt(e.node(0));
  }
  /**
  Find the cursor or leaf node selection closest to the start of
  the given document. Will return an
  [`AllSelection`](https://prosemirror.net/docs/ref/#state.AllSelection) if no valid position
  exists.
  */
  static atStart(e) {
    return dr(e, e, 0, 0, 1) || new nt(e);
  }
  /**
  Find the cursor or leaf node selection closest to the end of the
  given document.
  */
  static atEnd(e) {
    return dr(e, e, e.content.size, e.childCount, -1) || new nt(e);
  }
  /**
  Deserialize the JSON representation of a selection. Must be
  implemented for custom classes (as a static class method).
  */
  static fromJSON(e, n) {
    if (!n || !n.type)
      throw new RangeError("Invalid input for Selection.fromJSON");
    let r = Zs[n.type];
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
    if (e in Zs)
      throw new RangeError("Duplicate use of selection JSON ID " + e);
    return Zs[e] = n, n.prototype.jsonID = e, n;
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
    return G.between(this.$anchor, this.$head).getBookmark();
  }
}
J.prototype.visible = !0;
class Td {
  /**
  Create a range.
  */
  constructor(e, n) {
    this.$from = e, this.$to = n;
  }
}
let Gc = !1;
function Yc(t) {
  !Gc && !t.parent.inlineContent && (Gc = !0, console.warn("TextSelection endpoint not pointing into a node with inline content (" + t.parent.type.name + ")"));
}
class G extends J {
  /**
  Construct a text selection between the given points.
  */
  constructor(e, n = e) {
    Yc(e), Yc(n), super(e, n);
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
      return J.near(r);
    let i = e.resolve(n.map(this.anchor));
    return new G(i.parent.inlineContent ? i : r, r);
  }
  replace(e, n = P.empty) {
    if (super.replace(e, n), n == P.empty) {
      let r = this.$from.marksAcross(this.$to);
      r && e.ensureMarks(r);
    }
  }
  eq(e) {
    return e instanceof G && e.anchor == this.anchor && e.head == this.head;
  }
  getBookmark() {
    return new Is(this.anchor, this.head);
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
    return new G(e.resolve(n.anchor), e.resolve(n.head));
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
      let o = J.findFrom(n, r, !0) || J.findFrom(n, -r, !0);
      if (o)
        n = o.$head;
      else
        return J.near(n, r);
    }
    return e.parent.inlineContent || (i == 0 ? e = n : (e = (J.findFrom(e, -r, !0) || J.findFrom(e, r, !0)).$anchor, e.pos < n.pos != i < 0 && (e = n))), new G(e, n);
  }
}
J.jsonID("text", G);
class Is {
  constructor(e, n) {
    this.anchor = e, this.head = n;
  }
  map(e) {
    return new Is(e.map(this.anchor), e.map(this.head));
  }
  resolve(e) {
    return G.between(e.resolve(this.anchor), e.resolve(this.head));
  }
}
class K extends J {
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
    return r ? J.near(o) : new K(o);
  }
  content() {
    return new P(A.from(this.node), 0, 0);
  }
  eq(e) {
    return e instanceof K && e.anchor == this.anchor;
  }
  toJSON() {
    return { type: "node", anchor: this.anchor };
  }
  getBookmark() {
    return new Da(this.anchor);
  }
  /**
  @internal
  */
  static fromJSON(e, n) {
    if (typeof n.anchor != "number")
      throw new RangeError("Invalid input for NodeSelection.fromJSON");
    return new K(e.resolve(n.anchor));
  }
  /**
  Create a node selection from non-resolved positions.
  */
  static create(e, n) {
    return new K(e.resolve(n));
  }
  /**
  Determines whether the given node may be selected as a node
  selection.
  */
  static isSelectable(e) {
    return !e.isText && e.type.spec.selectable !== !1;
  }
}
K.prototype.visible = !1;
J.jsonID("node", K);
class Da {
  constructor(e) {
    this.anchor = e;
  }
  map(e) {
    let { deleted: n, pos: r } = e.mapResult(this.anchor);
    return n ? new Is(r, r) : new Da(r);
  }
  resolve(e) {
    let n = e.resolve(this.anchor), r = n.nodeAfter;
    return r && K.isSelectable(r) ? new K(n) : J.near(n);
  }
}
class nt extends J {
  /**
  Create an all-selection over the given document.
  */
  constructor(e) {
    super(e.resolve(0), e.resolve(e.content.size));
  }
  replace(e, n = P.empty) {
    if (n == P.empty) {
      e.delete(0, e.doc.content.size);
      let r = J.atStart(e.doc);
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
    return new nt(e);
  }
  map(e) {
    return new nt(e);
  }
  eq(e) {
    return e instanceof nt;
  }
  getBookmark() {
    return Jb;
  }
}
J.jsonID("all", nt);
const Jb = {
  map() {
    return this;
  },
  resolve(t) {
    return new nt(t);
  }
};
function dr(t, e, n, r, i, o = !1) {
  if (e.inlineContent)
    return G.create(t, n);
  for (let s = r - (i > 0 ? 0 : 1); i > 0 ? s < e.childCount : s >= 0; s += i) {
    let l = e.child(s);
    if (l.isAtom) {
      if (!o && K.isSelectable(l))
        return K.create(t, n - (i < 0 ? l.nodeSize : 0));
    } else {
      let a = dr(t, l, n + i, i < 0 ? l.childCount : 0, i, o);
      if (a)
        return a;
    }
    n += l.nodeSize * i;
  }
  return null;
}
function Qc(t, e, n) {
  let r = t.steps.length - 1;
  if (r < e)
    return;
  let i = t.steps[r];
  if (!(i instanceof he || i instanceof Ee))
    return;
  let o = t.mapping.maps[r], s;
  o.forEach((l, a, u, c) => {
    s == null && (s = c);
  }), t.setSelection(J.near(t.doc.resolve(s), n));
}
const Xc = 1, Do = 2, Zc = 4;
class Gb extends Nd {
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
    return this.curSelection = e, this.curSelectionFor = this.steps.length, this.updated = (this.updated | Xc) & ~Do, this.storedMarks = null, this;
  }
  /**
  Whether the selection was explicitly updated by this transaction.
  */
  get selectionSet() {
    return (this.updated & Xc) > 0;
  }
  /**
  Set the current stored marks.
  */
  setStoredMarks(e) {
    return this.storedMarks = e, this.updated |= Do, this;
  }
  /**
  Make sure the current stored marks or, if that is null, the marks
  at the selection, match the given set of marks. Does nothing if
  this is already the case.
  */
  ensureMarks(e) {
    return ne.sameSet(this.storedMarks || this.selection.$from.marks(), e) || this.setStoredMarks(e), this;
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
    return (this.updated & Do) > 0;
  }
  /**
  @internal
  */
  addStep(e, n) {
    super.addStep(e, n), this.updated = this.updated & ~Do, this.storedMarks = null;
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
    return n && (e = e.mark(this.storedMarks || (r.empty ? r.$from.marks() : r.$from.marksAcross(r.$to) || ne.none))), r.replaceWith(this, e), this;
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
      return this.replaceRangeWith(n, r, i.text(e, o)), !this.selection.empty && this.selection.to == n + e.length && this.setSelection(J.near(this.selection.$to)), this;
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
    return this.updated |= Zc, this;
  }
  /**
  True when this transaction has had `scrollIntoView` called on it.
  */
  get scrolledIntoView() {
    return (this.updated & Zc) > 0;
  }
}
function ef(t, e) {
  return !e || !t ? t : t.bind(e);
}
class pi {
  constructor(e, n, r) {
    this.name = e, this.init = ef(n.init, r), this.apply = ef(n.apply, r);
  }
}
const Yb = [
  new pi("doc", {
    init(t) {
      return t.doc || t.schema.topNodeType.createAndFill();
    },
    apply(t) {
      return t.doc;
    }
  }),
  new pi("selection", {
    init(t, e) {
      return t.selection || J.atStart(e.doc);
    },
    apply(t) {
      return t.selection;
    }
  }),
  new pi("storedMarks", {
    init(t) {
      return t.storedMarks || null;
    },
    apply(t, e, n, r) {
      return r.selection.$cursor ? t.storedMarks : null;
    }
  }),
  new pi("scrollToSelection", {
    init() {
      return 0;
    },
    apply(t, e) {
      return t.scrolledIntoView ? e + 1 : e;
    }
  })
];
class el {
  constructor(e, n) {
    this.schema = e, this.plugins = [], this.pluginsByKey = /* @__PURE__ */ Object.create(null), this.fields = Yb.slice(), n && n.forEach((r) => {
      if (this.pluginsByKey[r.key])
        throw new RangeError("Adding different instances of a keyed plugin (" + r.key + ")");
      this.plugins.push(r), this.pluginsByKey[r.key] = r, r.spec.state && this.fields.push(new pi(r.key, r.spec.state, r));
    });
  }
}
class kr {
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
    let n = new kr(this.config), r = this.config.fields;
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
    return new Gb(this);
  }
  /**
  Create a new state.
  */
  static create(e) {
    let n = new el(e.doc ? e.doc.type.schema : e.schema, e.plugins), r = new kr(n);
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
    let n = new el(this.schema, e.plugins), r = n.fields, i = new kr(n);
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
    let i = new el(e.schema, e.plugins), o = new kr(i);
    return i.fields.forEach((s) => {
      if (s.name == "doc")
        o.doc = Jt.fromJSON(e.schema, n.doc);
      else if (s.name == "selection")
        o.selection = J.fromJSON(o.doc, n.selection);
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
function vd(t, e, n) {
  for (let r in t) {
    let i = t[r];
    i instanceof Function ? i = i.bind(e) : r == "handleDOMEvents" && (i = vd(i, e, {})), n[r] = i;
  }
  return n;
}
class Ie {
  /**
  Create a plugin.
  */
  constructor(e) {
    this.spec = e, this.props = {}, e.props && vd(e.props, this, this.props), this.key = e.key ? e.key.key : Id("plugin");
  }
  /**
  Extract the plugin's state field from an editor state.
  */
  getState(e) {
    return e[this.key];
  }
}
const tl = /* @__PURE__ */ Object.create(null);
function Id(t) {
  return t in tl ? t + "$" + ++tl[t] : (tl[t] = 0, t + "$");
}
class Re {
  /**
  Create a plugin key.
  */
  constructor(e = "key") {
    this.key = Id(e);
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
const Ra = (t, e) => t.selection.empty ? !1 : (e && e(t.tr.deleteSelection().scrollIntoView()), !0);
function Ad(t, e) {
  let { $cursor: n } = t.selection;
  return !n || (e ? !e.endOfTextblock("backward", t) : n.parentOffset > 0) ? null : n;
}
const Ed = (t, e, n) => {
  let r = Ad(t, n);
  if (!r)
    return !1;
  let i = La(r);
  if (!i) {
    let s = r.blockRange(), l = s && Ns(s);
    return l == null ? !1 : (e && e(t.tr.lift(s, l).scrollIntoView()), !0);
  }
  let o = i.nodeBefore;
  if (Rd(t, i, e, -1))
    return !0;
  if (r.parent.content.size == 0 && (Kr(o, "end") || K.isSelectable(o)))
    for (let s = r.depth; ; s--) {
      let l = vs(t.doc, r.before(s), r.after(s), P.empty);
      if (l && l.slice.size < l.to - l.from) {
        if (e) {
          let a = t.tr.step(l);
          a.setSelection(Kr(o, "end") ? J.findFrom(a.doc.resolve(a.mapping.map(i.pos, -1)), -1) : K.create(a.doc, i.pos - o.nodeSize)), e(a.scrollIntoView());
        }
        return !0;
      }
      if (s == 1 || r.node(s - 1).childCount > 1)
        break;
    }
  return o.isAtom && i.depth == r.depth - 1 ? (e && e(t.tr.delete(i.pos - o.nodeSize, i.pos).scrollIntoView()), !0) : !1;
}, Qb = (t, e, n) => {
  let r = Ad(t, n);
  if (!r)
    return !1;
  let i = La(r);
  return i ? Xb(t, i, e) : !1;
};
function Xb(t, e, n) {
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
  let u = vs(t.doc, o, a, P.empty);
  if (!u || u.from != o || u instanceof he && u.slice.size >= a - o)
    return !1;
  if (n) {
    let c = t.tr.step(u);
    c.setSelection(G.create(c.doc, o)), n(c.scrollIntoView());
  }
  return !0;
}
function Kr(t, e, n = !1) {
  for (let r = t; r; r = e == "start" ? r.firstChild : r.lastChild) {
    if (r.isTextblock)
      return !0;
    if (n && r.childCount != 1)
      return !1;
  }
  return !1;
}
const Od = (t, e, n) => {
  let { $head: r, empty: i } = t.selection, o = r;
  if (!i)
    return !1;
  if (r.parent.isTextblock) {
    if (n ? !n.endOfTextblock("backward", t) : r.parentOffset > 0)
      return !1;
    o = La(r);
  }
  let s = o && o.nodeBefore;
  return !s || !K.isSelectable(s) ? !1 : (e && e(t.tr.setSelection(K.create(t.doc, o.pos - s.nodeSize)).scrollIntoView()), !0);
};
function La(t) {
  if (!t.parent.type.spec.isolating)
    for (let e = t.depth - 1; e >= 0; e--) {
      if (t.index(e) > 0)
        return t.doc.resolve(t.before(e + 1));
      if (t.node(e).type.spec.isolating)
        break;
    }
  return null;
}
function Zb(t, e) {
  let { $cursor: n } = t.selection;
  return !n || (e ? !e.endOfTextblock("forward", t) : n.parentOffset < n.parent.content.size) ? null : n;
}
const e0 = (t, e, n) => {
  let r = Zb(t, n);
  if (!r)
    return !1;
  let i = Dd(r);
  if (!i)
    return !1;
  let o = i.nodeAfter;
  if (Rd(t, i, e, 1))
    return !0;
  if (r.parent.content.size == 0 && (Kr(o, "start") || K.isSelectable(o))) {
    let s = vs(t.doc, r.before(), r.after(), P.empty);
    if (s && s.slice.size < s.to - s.from) {
      if (e) {
        let l = t.tr.step(s);
        l.setSelection(Kr(o, "start") ? J.findFrom(l.doc.resolve(l.mapping.map(i.pos)), 1) : K.create(l.doc, l.mapping.map(i.pos))), e(l.scrollIntoView());
      }
      return !0;
    }
  }
  return o.isAtom && i.depth == r.depth - 1 ? (e && e(t.tr.delete(i.pos, i.pos + o.nodeSize).scrollIntoView()), !0) : !1;
}, t0 = (t, e, n) => {
  let { $head: r, empty: i } = t.selection, o = r;
  if (!i)
    return !1;
  if (r.parent.isTextblock) {
    if (n ? !n.endOfTextblock("forward", t) : r.parentOffset < r.parent.content.size)
      return !1;
    o = Dd(r);
  }
  let s = o && o.nodeAfter;
  return !s || !K.isSelectable(s) ? !1 : (e && e(t.tr.setSelection(K.create(t.doc, o.pos)).scrollIntoView()), !0);
};
function Dd(t) {
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
const n0 = (t, e) => {
  let { $head: n, $anchor: r } = t.selection;
  return !n.parent.type.spec.code || !n.sameParent(r) ? !1 : (e && e(t.tr.insertText(`
`).scrollIntoView()), !0);
};
function Pa(t) {
  for (let e = 0; e < t.edgeCount; e++) {
    let { type: n } = t.edge(e);
    if (n.isTextblock && !n.hasRequiredAttrs())
      return n;
  }
  return null;
}
const r0 = (t, e) => {
  let { $head: n, $anchor: r } = t.selection;
  if (!n.parent.type.spec.code || !n.sameParent(r))
    return !1;
  let i = n.node(-1), o = n.indexAfter(-1), s = Pa(i.contentMatchAt(o));
  if (!s || !i.canReplaceWith(o, o, s))
    return !1;
  if (e) {
    let l = n.after(), a = t.tr.replaceWith(l, l, s.createAndFill());
    a.setSelection(J.near(a.doc.resolve(l), 1)), e(a.scrollIntoView());
  }
  return !0;
}, i0 = (t, e) => {
  let n = t.selection, { $from: r, $to: i } = n;
  if (n instanceof nt || r.parent.inlineContent || i.parent.inlineContent)
    return !1;
  let o = Pa(i.parent.contentMatchAt(i.indexAfter()));
  if (!o || !o.isTextblock)
    return !1;
  if (e) {
    let s = (!r.parentOffset && i.index() < i.parent.childCount ? r : i).pos, l = t.tr.insert(s, o.createAndFill());
    l.setSelection(G.create(l.doc, s + 1)), e(l.scrollIntoView());
  }
  return !0;
}, o0 = (t, e) => {
  let { $cursor: n } = t.selection;
  if (!n || n.parent.content.size)
    return !1;
  if (n.depth > 1 && n.after() != n.end(-1)) {
    let o = n.before();
    if (wi(t.doc, o))
      return e && e(t.tr.split(o).scrollIntoView()), !0;
  }
  let r = n.blockRange(), i = r && Ns(r);
  return i == null ? !1 : (e && e(t.tr.lift(r, i).scrollIntoView()), !0);
};
function s0(t) {
  return (e, n) => {
    let { $from: r, $to: i } = e.selection;
    if (e.selection instanceof K && e.selection.node.isBlock)
      return !r.parentOffset || !wi(e.doc, r.pos) ? !1 : (n && n(e.tr.split(r.pos).scrollIntoView()), !0);
    if (!r.depth)
      return !1;
    let o = [], s, l, a = !1, u = !1;
    for (let h = r.depth; ; h--)
      if (r.node(h).isBlock) {
        a = r.end(h) == r.pos + (r.depth - h), u = r.start(h) == r.pos - (r.depth - h), l = Pa(r.node(h - 1).contentMatchAt(r.indexAfter(h - 1))), o.unshift(a && l ? { type: l } : null), s = h;
        break;
      } else {
        if (h == 1)
          return !1;
        o.unshift(null);
      }
    let c = e.tr;
    (e.selection instanceof G || e.selection instanceof nt) && c.deleteSelection();
    let f = c.mapping.map(r.pos), d = wi(c.doc, f, o.length, o);
    if (d || (o[0] = l ? { type: l } : null, d = wi(c.doc, f, o.length, o)), !d)
      return !1;
    if (c.split(f, o.length, o), !a && u && r.node(s).type != l) {
      let h = c.mapping.map(r.before(s)), p = c.doc.resolve(h);
      l && r.node(s - 1).canReplaceWith(p.index(), p.index() + 1, l) && c.setNodeMarkup(c.mapping.map(r.before(s)), l);
    }
    return n && n(c.scrollIntoView()), !0;
  };
}
const l0 = s0(), a0 = (t, e) => (e && e(t.tr.setSelection(new nt(t.doc))), !0);
function u0(t, e, n) {
  let r = e.nodeBefore, i = e.nodeAfter, o = e.index();
  return !r || !i || !r.type.compatibleContent(i.type) ? !1 : !r.content.size && e.parent.canReplace(o - 1, o) ? (n && n(t.tr.delete(e.pos - r.nodeSize, e.pos).scrollIntoView()), !0) : !e.parent.canReplace(o, o + 1) || !(i.isTextblock || Ts(t.doc, e.pos)) ? !1 : (n && n(t.tr.join(e.pos).scrollIntoView()), !0);
}
function Rd(t, e, n, r) {
  let i = e.nodeBefore, o = e.nodeAfter, s, l, a = i.type.spec.isolating || o.type.spec.isolating;
  if (!a && u0(t, e, n))
    return !0;
  let u = !a && e.parent.canReplace(e.index(), e.index() + 1);
  if (u && (s = (l = i.contentMatchAt(i.childCount)).findWrapping(o.type)) && l.matchType(s[0] || o.type).validEnd) {
    if (n) {
      let h = e.pos + o.nodeSize, p = A.empty;
      for (let g = s.length - 1; g >= 0; g--)
        p = A.from(s[g].create(null, p));
      p = A.from(i.copy(p));
      let m = t.tr.step(new Ee(e.pos - 1, h, e.pos, h, new P(p, 1, 0), s.length, !0)), y = m.doc.resolve(h + 2 * s.length);
      y.nodeAfter && y.nodeAfter.type == i.type && Ts(m.doc, y.pos) && m.join(y.pos), n(m.scrollIntoView());
    }
    return !0;
  }
  let c = o.type.spec.isolating || r > 0 && a ? null : J.findFrom(e, 1), f = c && c.$from.blockRange(c.$to), d = f && Ns(f);
  if (d != null && d >= e.depth)
    return n && n(t.tr.lift(f, d).scrollIntoView()), !0;
  if (u && Kr(o, "start", !0) && Kr(i, "end")) {
    let h = i, p = [];
    for (; p.push(h), !h.isTextblock; )
      h = h.lastChild;
    let m = o, y = 1;
    for (; !m.isTextblock; m = m.firstChild)
      y++;
    if (h.canReplace(h.childCount, h.childCount, m.content)) {
      if (n) {
        let g = A.empty;
        for (let T = p.length - 1; T >= 0; T--)
          g = A.from(p[T].copy(g));
        let E = t.tr.step(new Ee(e.pos - p.length, e.pos + o.nodeSize, e.pos + y, e.pos + o.nodeSize - y, new P(g, p.length, 0), 0, !0));
        n(E.scrollIntoView());
      }
      return !0;
    }
  }
  return !1;
}
function Ld(t) {
  return function(e, n) {
    let r = e.selection, i = t < 0 ? r.$from : r.$to, o = i.depth;
    for (; i.node(o).isInline; ) {
      if (!o)
        return !1;
      o--;
    }
    return i.node(o).isTextblock ? (n && n(e.tr.setSelection(G.create(e.doc, t < 0 ? i.start(o) : i.end(o)))), !0) : !1;
  };
}
const c0 = Ld(-1), f0 = Ld(1);
function za(t, e = null) {
  return function(n, r) {
    let { $from: i, $to: o } = n.selection, s = i.blockRange(o), l = s && Oa(s, t, e);
    return l ? (r && r(n.tr.wrap(s, l).scrollIntoView()), !0) : !1;
  };
}
function rr(t, e = null) {
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
function h0(t, e, n, r) {
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
function lo(t, e = null, n) {
  return function(r, i) {
    let { empty: o, $cursor: s, ranges: l } = r.selection;
    if (o && !s || !h0(r.doc, l, t))
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
            let h = f.pos, p = d.pos, m = f.nodeAfter, y = d.nodeBefore, g = m && m.isText ? /^\s*/.exec(m.text)[0].length : 0, E = y && y.isText ? /\s*$/.exec(y.text)[0].length : 0;
            h + g < p && (h += g, p -= E), u.addMark(h, p, t.create(e));
          }
        }
        i(u.scrollIntoView());
      }
    return !0;
  };
}
function Zr(...t) {
  return function(e, n, r) {
    for (let i = 0; i < t.length; i++)
      if (t[i](e, n, r))
        return !0;
    return !1;
  };
}
let nl = Zr(Ra, Ed, Od), tf = Zr(Ra, e0, t0);
const $t = {
  Enter: Zr(n0, i0, o0, l0),
  "Mod-Enter": r0,
  Backspace: nl,
  "Mod-Backspace": nl,
  "Shift-Backspace": nl,
  Delete: tf,
  "Mod-Delete": tf,
  "Mod-a": a0
}, Pd = {
  "Ctrl-h": $t.Backspace,
  "Alt-Backspace": $t["Mod-Backspace"],
  "Ctrl-d": $t.Delete,
  "Ctrl-Alt-Backspace": $t["Mod-Delete"],
  "Alt-Delete": $t["Mod-Delete"],
  "Alt-d": $t["Mod-Delete"],
  "Ctrl-a": c0,
  "Ctrl-e": f0
};
for (let t in $t)
  Pd[t] = $t[t];
const d0 = typeof navigator < "u" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : typeof os < "u" && os.platform ? os.platform() == "darwin" : !1, p0 = d0 ? Pd : $t;
class rt {
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
    this.match = e, this.match = e, this.handler = typeof n == "string" ? m0(n) : n, this.undoable = r.undoable !== !1, this.inCode = r.inCode || !1, this.inCodeMark = r.inCodeMark !== !1;
  }
}
function m0(t) {
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
const g0 = (t, e) => {
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
new rt(/--$/, "—", { inCodeMark: !1 });
new rt(/\.\.\.$/, "…", { inCodeMark: !1 });
new rt(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(")$/, "“", { inCodeMark: !1 });
new rt(/"$/, "”", { inCodeMark: !1 });
new rt(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(')$/, "‘", { inCodeMark: !1 });
new rt(/'$/, "’", { inCodeMark: !1 });
function Ba(t, e, n = null, r) {
  return new rt(t, (i, o, s, l) => {
    let a = n instanceof Function ? n(o) : n, u = i.tr.delete(s, l), c = u.doc.resolve(s), f = c.blockRange(), d = f && Oa(f, e, a);
    if (!d)
      return null;
    u.wrap(f, d);
    let h = u.doc.resolve(s - 1).nodeBefore;
    return h && h.type == e && Ts(u.doc, s - 1) && (!r || r(o, h)) && u.join(s - 1), u;
  });
}
function zd(t, e, n = null) {
  return new rt(t, (r, i, o, s) => {
    let l = r.doc.resolve(o), a = n instanceof Function ? n(i) : n;
    return l.node(-1).canReplaceWith(l.index(-1), l.indexAfter(-1), e) ? r.tr.delete(o, s).setBlockType(o, o, e, a) : null;
  });
}
const Mn = typeof navigator < "u" ? navigator : null, nf = typeof document < "u" ? document : null, vn = Mn && Mn.userAgent || "", Gl = /Edge\/(\d+)/.exec(vn), Bd = /MSIE \d/.exec(vn), Yl = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(vn), Fa = !!(Bd || Yl || Gl);
Bd ? document.documentMode : Yl ? +Yl[1] : Gl && +Gl[1];
const y0 = !Fa && /gecko\/(\d+)/i.test(vn);
y0 && +(/Firefox\/(\d+)/.exec(vn) || [0, 0])[1];
const Ql = !Fa && /Chrome\/(\d+)/.exec(vn), k0 = !!Ql;
Ql && +Ql[1];
const b0 = !Fa && !!Mn && /Apple Computer/.test(Mn.vendor), w0 = b0 && (/Mobile\/\w+/.test(vn) || !!Mn && Mn.maxTouchPoints > 2);
w0 || Mn && /Mac/.test(Mn.platform);
const x0 = /Android \d/.test(vn), C0 = !!nf && "webkitFontSmoothing" in nf.documentElement.style;
C0 && +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1];
function rl(t, e, n, r, i, o) {
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
const S0 = new Re("MILKDOWN_CUSTOM_INPUTRULES");
function M0({ rules: t }) {
  const e = new Ie({
    key: S0,
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
        return rl(n, r, i, o, t, e);
      },
      handleDOMEvents: {
        compositionend: (n) => (setTimeout(() => {
          const { $cursor: r } = n.state.selection;
          r && rl(n, r.pos, r.pos, "", t, e);
        }), !1),
        keydown: (n, r) => !(x0 && k0 && r.key === "Enter") || n.composing ? !1 : n.someProp(
          "handleKeyDown",
          (i) => i(n, r)
        ) ? (r.preventDefault(), !0) : !1
      },
      handleKeyDown(n, r) {
        if (r.key !== "Enter") return !1;
        const { $cursor: i } = n.state.selection;
        return i ? rl(n, i.pos, i.pos, `
`, t, e) : !1;
      }
    }
  });
  return e;
}
function ao(t, e, n = {}) {
  return new rt(t, (r, i, o, s) => {
    var l, a, u, c;
    const { tr: f } = r, d = i.length;
    let h = i[d - 1], p = i[0], m = [], y;
    const g = {
      group: h,
      fullMatch: p,
      start: o,
      end: s
    }, E = (l = n.updateCaptured) == null ? void 0 : l.call(n, g);
    if (Object.assign(g, E), { group: h, fullMatch: p, start: o, end: s } = g, p === null || (h == null ? void 0 : h.trim()) === "") return null;
    if (h) {
      const T = p.search(/\S/), B = o + p.indexOf(h), z = B + h.length;
      m = (a = f.storedMarks) != null ? a : [], z < s && f.delete(z, s), B > o && f.delete(o + T, B), y = o + T + h.length;
      const S = (u = n.getAttr) == null ? void 0 : u.call(n, i);
      f.addMark(o, y, e.create(S)), f.setStoredMarks(m), (c = n.beforeDispatch) == null || c.call(n, { match: i, start: o, end: s, tr: f });
    }
    return f;
  });
}
function Fd(t) {
  return Object.assign(Object.create(t), t).setTime(Date.now());
}
function N0(t, e) {
  return Array.isArray(t) && t.includes(e.type) || e.type === t;
}
function T0(t) {
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
function v0(t, e) {
  return T0((n) => n.type === e)(t);
}
function I0(t) {
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
function A0(t, e) {
  if (!(t instanceof K)) return;
  const { node: n, $from: r } = t;
  if (N0(e, n))
    return {
      node: n,
      pos: r.pos,
      start: r.start(r.depth),
      depth: r.depth
    };
}
const E0 = (t, e) => {
  const { selection: n, doc: r } = t;
  if (n instanceof K)
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
var Nn = {
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
}, ss = {
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
}, O0 = typeof navigator < "u" && /Mac/.test(navigator.platform), D0 = typeof navigator < "u" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
for (var Se = 0; Se < 10; Se++) Nn[48 + Se] = Nn[96 + Se] = String(Se);
for (var Se = 1; Se <= 24; Se++) Nn[Se + 111] = "F" + Se;
for (var Se = 65; Se <= 90; Se++)
  Nn[Se] = String.fromCharCode(Se + 32), ss[Se] = String.fromCharCode(Se);
for (var il in Nn) ss.hasOwnProperty(il) || (ss[il] = Nn[il]);
function R0(t) {
  var e = O0 && t.metaKey && t.shiftKey && !t.ctrlKey && !t.altKey || D0 && t.shiftKey && t.key && t.key.length == 1 || t.key == "Unidentified", n = !e && t.key || (t.shiftKey ? ss : Nn)[t.keyCode] || t.key || "Unidentified";
  return n == "Esc" && (n = "Escape"), n == "Del" && (n = "Delete"), n == "Left" && (n = "ArrowLeft"), n == "Up" && (n = "ArrowUp"), n == "Right" && (n = "ArrowRight"), n == "Down" && (n = "ArrowDown"), n;
}
const L0 = typeof navigator < "u" && /Mac|iP(hone|[oa]d)/.test(navigator.platform), P0 = typeof navigator < "u" && /Win/.test(navigator.platform);
function z0(t) {
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
      L0 ? s = !0 : i = !0;
    else
      throw new Error("Unrecognized modifier name: " + a);
  }
  return r && (n = "Alt-" + n), i && (n = "Ctrl-" + n), s && (n = "Meta-" + n), o && (n = "Shift-" + n), n;
}
function B0(t) {
  let e = /* @__PURE__ */ Object.create(null);
  for (let n in t)
    e[z0(n)] = t[n];
  return e;
}
function ol(t, e, n = !0) {
  return e.altKey && (t = "Alt-" + t), e.ctrlKey && (t = "Ctrl-" + t), e.metaKey && (t = "Meta-" + t), n && e.shiftKey && (t = "Shift-" + t), t;
}
function $d(t) {
  return new Ie({ props: { handleKeyDown: _d(t) } });
}
function _d(t) {
  let e = B0(t);
  return function(n, r) {
    let i = R0(r), o, s = e[ol(i, r)];
    if (s && s(n.state, n.dispatch, n))
      return !0;
    if (i.length == 1 && i != " ") {
      if (r.shiftKey) {
        let l = e[ol(i, r, !1)];
        if (l && l(n.state, n.dispatch, n))
          return !0;
      }
      if ((r.altKey || r.metaKey || r.ctrlKey) && // Ctrl-Alt may be used for AltGr on Windows
      !(P0 && r.ctrlKey && r.altKey) && (o = Nn[r.keyCode]) && o != i) {
        let l = e[ol(o, r)];
        if (l && l(n.state, n.dispatch, n))
          return !0;
      }
    }
    return !1;
  };
}
var Vd = class {
}, Hd = class {
  constructor() {
    this.elements = [], this.size = () => this.elements.length, this.top = () => this.elements.at(-1), this.push = (t) => {
      var e;
      (e = this.top()) == null || e.push(t);
    }, this.open = (t) => {
      this.elements.push(t);
    }, this.close = () => {
      const t = this.elements.pop();
      if (!t) throw kh();
      return t;
    };
  }
}, F0 = class jd extends Vd {
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
    return new jd(e, n, r);
  }
}, kt, Dr, Ki, Ui, Ji, Rr, Lr, Qn, $0 = (Qn = class extends Hd {
  constructor(n) {
    super();
    F(this, kt);
    F(this, Dr);
    F(this, Ki);
    F(this, Ui);
    F(this, Ji);
    F(this, Rr);
    F(this, Lr);
    R(this, kt, ne.none), R(this, Dr, (r) => r.isText), R(this, Ki, (r, i) => {
      if (C(this, Dr).call(this, r) && C(this, Dr).call(this, i) && ne.sameSet(r.marks, i.marks)) return this.schema.text(r.text + i.text, r.marks);
    }), R(this, Ui, (r) => {
      const i = Object.values({
        ...this.schema.nodes,
        ...this.schema.marks
      }).find((o) => o.spec.parseMarkdown.match(r));
      if (!i) throw yg(r);
      return i;
    }), R(this, Ji, (r) => {
      const i = C(this, Ui).call(this, r);
      i.spec.parseMarkdown.runner(this, r, i);
    }), this.injectRoot = (r, i, o) => (this.openNode(i, o), this.next(r.children), this), this.openNode = (r, i) => (this.open(F0.create(r, [], i)), this), R(this, Rr, () => {
      R(this, kt, ne.none);
      const r = this.close();
      return C(this, Lr).call(this, r.type, r.attrs, r.content);
    }), this.closeNode = () => {
      try {
        C(this, Rr).call(this);
      } catch (r) {
        console.error(r);
      }
      return this;
    }, R(this, Lr, (r, i, o) => {
      const s = r.createAndFill(i, o, C(this, kt));
      if (!s) throw gg(r, i, o);
      return this.push(s), s;
    }), this.addNode = (r, i, o) => {
      try {
        C(this, Lr).call(this, r, i, o);
      } catch (s) {
        console.error(s);
      }
      return this;
    }, this.openMark = (r, i) => {
      const o = r.create(i);
      return R(this, kt, o.addToSet(C(this, kt))), this;
    }, this.closeMark = (r) => (R(this, kt, r.removeFromSet(C(this, kt))), this), this.addText = (r) => {
      try {
        const i = this.top();
        if (!i) throw kh();
        const o = i.pop(), s = this.schema.text(r, C(this, kt));
        if (!o)
          return i.push(s), this;
        const l = C(this, Ki).call(this, o, s);
        return l ? (i.push(l), this) : (i.push(o, s), this);
      } catch (i) {
        return console.error(i), this;
      }
    }, this.build = () => {
      let r;
      do
        r = C(this, Rr).call(this);
      while (this.size());
      return r;
    }, this.next = (r = []) => ([r].flat().forEach((i) => C(this, Ji).call(this, i)), this), this.toDoc = () => this.build(), this.run = (r, i) => {
      const o = r.runSync(r.parse(i), i);
      return this.next(o), this;
    }, this.schema = n;
  }
}, kt = new WeakMap(), Dr = new WeakMap(), Ki = new WeakMap(), Ui = new WeakMap(), Ji = new WeakMap(), Rr = new WeakMap(), Lr = new WeakMap(), Qn.create = (n, r) => {
  const i = new Qn(n);
  return (o) => (i.run(r, o), i.toDoc());
}, Qn), Xn, rf = (Xn = class extends Vd {
  constructor(e, n, r, i = {}) {
    super(), this.type = e, this.children = n, this.value = r, this.props = i, this.push = (o, ...s) => {
      this.children || (this.children = []), this.children.push(o, ...s);
    }, this.pop = () => {
      var o;
      return (o = this.children) == null ? void 0 : o.pop();
    };
  }
}, Xn.create = (e, n, r, i = {}) => new Xn(e, n, r, i), Xn), _0 = (t) => Object.prototype.hasOwnProperty.call(t, "size"), Tt, Pr, Gi, Yi, zr, Qi, Br, Xi, Zi, Bn, pn, eo, Fr, Zn, V0 = (Zn = class extends Hd {
  constructor(n) {
    super();
    F(this, Tt);
    F(this, Pr);
    F(this, Gi);
    F(this, Yi);
    F(this, zr);
    F(this, Qi);
    F(this, Br);
    F(this, Xi);
    F(this, Zi);
    F(this, Bn);
    F(this, pn);
    F(this, eo);
    F(this, Fr);
    R(this, Tt, ne.none), R(this, Pr, (r) => {
      const i = Object.values({
        ...this.schema.nodes,
        ...this.schema.marks
      }).find((o) => o.spec.toMarkdown.match(r));
      if (!i) throw kg(r.type);
      return i;
    }), R(this, Gi, (r) => C(this, Pr).call(this, r).spec.toMarkdown.runner(this, r)), R(this, Yi, (r, i) => C(this, Pr).call(this, r).spec.toMarkdown.runner(this, r, i)), R(this, zr, (r) => {
      const { marks: i } = r, o = (s) => s.type.spec.priority ?? 50;
      [...i].sort((s, l) => o(s) - o(l)).every((s) => !C(this, Yi).call(this, s, r)) && C(this, Gi).call(this, r), i.forEach((s) => C(this, Fr).call(this, s));
    }), R(this, Qi, (r, i) => {
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
    }), R(this, Br, (r) => {
      const { children: i } = r;
      return i && (r.children = i.reduce((o, s, l) => {
        if (l === 0) return [s];
        const a = o.at(-1);
        if (a && a.isMark && s.isMark) {
          s = C(this, Qi).call(this, s, a.type);
          const { children: u, ...c } = s, { children: f, ...d } = a;
          if (s.type === a.type && u && f && JSON.stringify(c) === JSON.stringify(d)) {
            const h = {
              ...d,
              children: [...f, ...u]
            };
            return o.slice(0, -1).concat(C(this, Br).call(this, h));
          }
        }
        return o.concat(s);
      }, [])), r;
    }), R(this, Xi, (r) => {
      const i = {
        ...r.props,
        type: r.type
      };
      return r.children && (i.children = r.children), r.value && (i.value = r.value), i;
    }), this.openNode = (r, i, o) => (this.open(rf.create(r, void 0, i, o)), this), R(this, Zi, (r, i) => {
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
          const p = d.value, m = p.trimEnd();
          s = p.slice(m.length), d.value = m;
        }
        if (h && h.value.startsWith(" ")) {
          const p = h.value, m = p.trimStart();
          o = p.slice(0, p.length - m.length), h.value = m;
        }
      }
      o.length && C(this, pn).call(this, "text", void 0, o);
      const f = i();
      return s.length && C(this, pn).call(this, "text", void 0, s), f;
    }), R(this, Bn, (r = !1) => {
      const i = this.close(), o = () => C(this, pn).call(this, i.type, i.children, i.value, i.props);
      return r ? C(this, Zi).call(this, i, o) : o();
    }), this.closeNode = () => (C(this, Bn).call(this), this), R(this, pn, (r, i, o, s) => {
      const l = rf.create(r, i, o, s), a = C(this, Br).call(this, C(this, Xi).call(this, l));
      return this.push(a), a;
    }), this.addNode = (r, i, o, s) => (C(this, pn).call(this, r, i, o, s), this), R(this, eo, (r, i, o, s) => r.isInSet(C(this, Tt)) ? this : (R(this, Tt, r.addToSet(C(this, Tt))), this.openNode(i, o, {
      ...s,
      isMark: !0
    }))), R(this, Fr, (r) => {
      r.isInSet(C(this, Tt)) && (R(this, Tt, r.type.removeFromSet(C(this, Tt))), C(this, Bn).call(this, !0));
    }), this.withMark = (r, i, o, s) => (C(this, eo).call(this, r, i, o, s), this), this.closeMark = (r) => (C(this, Fr).call(this, r), this), this.build = () => {
      let r = null;
      do
        r = C(this, Bn).call(this);
      while (this.size());
      return r;
    }, this.next = (r) => _0(r) ? (r.forEach((i) => {
      C(this, zr).call(this, i);
    }), this) : (C(this, zr).call(this, r), this), this.toString = (r) => r.stringify(this.build()), this.run = (r) => (this.next(r), this), this.schema = n;
  }
}, Tt = new WeakMap(), Pr = new WeakMap(), Gi = new WeakMap(), Yi = new WeakMap(), zr = new WeakMap(), Qi = new WeakMap(), Br = new WeakMap(), Xi = new WeakMap(), Zi = new WeakMap(), Bn = new WeakMap(), pn = new WeakMap(), eo = new WeakMap(), Fr = new WeakMap(), Zn.create = (n, r) => {
  const i = new Zn(n);
  return (o) => (i.run(o), i.toString(r));
}, Zn);
const Me = function(t) {
  for (var e = 0; ; e++)
    if (t = t.previousSibling, !t)
      return e;
}, Ur = function(t) {
  let e = t.assignedSlot || t.parentNode;
  return e && e.nodeType == 11 ? e.host : e;
};
let Xl = null;
const Ft = function(t, e, n) {
  let r = Xl || (Xl = document.createRange());
  return r.setEnd(t, n ?? t.nodeValue.length), r.setStart(t, e || 0), r;
}, H0 = function() {
  Xl = null;
}, ir = function(t, e, n, r) {
  return n && (of(t, e, n, r, -1) || of(t, e, n, r, 1));
}, j0 = /^(img|br|input|textarea|hr)$/i;
function of(t, e, n, r, i) {
  for (var o; ; ) {
    if (t == n && e == r)
      return !0;
    if (e == (i < 0 ? 0 : ct(t))) {
      let s = t.parentNode;
      if (!s || s.nodeType != 1 || uo(t) || j0.test(t.nodeName) || t.contentEditable == "false")
        return !1;
      e = Me(t) + (i < 0 ? 0 : 1), t = s;
    } else if (t.nodeType == 1) {
      let s = t.childNodes[e + (i < 0 ? -1 : 0)];
      if (s.nodeType == 1 && s.contentEditable == "false")
        if (!((o = s.pmViewDesc) === null || o === void 0) && o.ignoreForSelection)
          e += i;
        else
          return !1;
      else
        t = s, e = i < 0 ? ct(t) : 0;
    } else
      return !1;
  }
}
function ct(t) {
  return t.nodeType == 3 ? t.nodeValue.length : t.childNodes.length;
}
function q0(t, e) {
  for (; ; ) {
    if (t.nodeType == 3 && e)
      return t;
    if (t.nodeType == 1 && e > 0) {
      if (t.contentEditable == "false")
        return null;
      t = t.childNodes[e - 1], e = ct(t);
    } else if (t.parentNode && !uo(t))
      e = Me(t), t = t.parentNode;
    else
      return null;
  }
}
function W0(t, e) {
  for (; ; ) {
    if (t.nodeType == 3 && e < t.nodeValue.length)
      return t;
    if (t.nodeType == 1 && e < t.childNodes.length) {
      if (t.contentEditable == "false")
        return null;
      t = t.childNodes[e], e = 0;
    } else if (t.parentNode && !uo(t))
      e = Me(t) + 1, t = t.parentNode;
    else
      return null;
  }
}
function K0(t, e, n) {
  for (let r = e == 0, i = e == ct(t); r || i; ) {
    if (t == n)
      return !0;
    let o = Me(t);
    if (t = t.parentNode, !t)
      return !1;
    r = r && o == 0, i = i && o == ct(t);
  }
}
function uo(t) {
  let e;
  for (let n = t; n && !(e = n.pmViewDesc); n = n.parentNode)
    ;
  return e && e.node && e.node.isBlock && (e.dom == t || e.contentDOM == t);
}
const As = function(t) {
  return t.focusNode && ir(t.focusNode, t.focusOffset, t.anchorNode, t.anchorOffset);
};
function Rn(t, e) {
  let n = document.createEvent("Event");
  return n.initEvent("keydown", !0, !0), n.keyCode = t, n.key = n.code = e, n;
}
function U0(t) {
  let e = t.activeElement;
  for (; e && e.shadowRoot; )
    e = e.shadowRoot.activeElement;
  return e;
}
function J0(t, e, n) {
  if (t.caretPositionFromPoint)
    try {
      let r = t.caretPositionFromPoint(e, n);
      if (r)
        return { node: r.offsetNode, offset: Math.min(ct(r.offsetNode), r.offset) };
    } catch {
    }
  if (t.caretRangeFromPoint) {
    let r = t.caretRangeFromPoint(e, n);
    if (r)
      return { node: r.startContainer, offset: Math.min(ct(r.startContainer), r.startOffset) };
  }
}
const It = typeof navigator < "u" ? navigator : null, sf = typeof document < "u" ? document : null, In = It && It.userAgent || "", Zl = /Edge\/(\d+)/.exec(In), qd = /MSIE \d/.exec(In), ea = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(In), je = !!(qd || ea || Zl), bn = qd ? document.documentMode : ea ? +ea[1] : Zl ? +Zl[1] : 0, ft = !je && /gecko\/(\d+)/i.test(In);
ft && +(/Firefox\/(\d+)/.exec(In) || [0, 0])[1];
const ta = !je && /Chrome\/(\d+)/.exec(In), Ne = !!ta, Wd = ta ? +ta[1] : 0, Oe = !je && !!It && /Apple Computer/.test(It.vendor), Jr = Oe && (/Mobile\/\w+/.test(In) || !!It && It.maxTouchPoints > 2), at = Jr || (It ? /Mac/.test(It.platform) : !1), Kd = It ? /Win/.test(It.platform) : !1, Ut = /Android \d/.test(In), co = !!sf && "webkitFontSmoothing" in sf.documentElement.style, G0 = co ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0;
function Y0(t) {
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
function zt(t, e) {
  return typeof t == "number" ? t : t[e];
}
function Q0(t) {
  let e = t.getBoundingClientRect(), n = e.width / t.offsetWidth || 1, r = e.height / t.offsetHeight || 1;
  return {
    left: e.left,
    right: e.left + t.clientWidth * n,
    top: e.top,
    bottom: e.top + t.clientHeight * r
  };
}
function lf(t, e, n) {
  let r = t.someProp("scrollThreshold") || 0, i = t.someProp("scrollMargin") || 5, o = t.dom.ownerDocument;
  for (let s = n || t.dom; s; ) {
    if (s.nodeType != 1) {
      s = Ur(s);
      continue;
    }
    let l = s, a = l == o.body, u = a ? Y0(o) : Q0(l), c = 0, f = 0;
    if (e.top < u.top + zt(r, "top") ? f = -(u.top - e.top + zt(i, "top")) : e.bottom > u.bottom - zt(r, "bottom") && (f = e.bottom - e.top > u.bottom - u.top ? e.top + zt(i, "top") - u.top : e.bottom - u.bottom + zt(i, "bottom")), e.left < u.left + zt(r, "left") ? c = -(u.left - e.left + zt(i, "left")) : e.right > u.right - zt(r, "right") && (c = e.right - u.right + zt(i, "right")), c || f)
      if (a)
        o.defaultView.scrollBy(c, f);
      else {
        let h = l.scrollLeft, p = l.scrollTop;
        f && (l.scrollTop += f), c && (l.scrollLeft += c);
        let m = l.scrollLeft - h, y = l.scrollTop - p;
        e = { left: e.left - m, top: e.top - y, right: e.right - m, bottom: e.bottom - y };
      }
    let d = a ? "fixed" : getComputedStyle(s).position;
    if (/^(fixed|sticky)$/.test(d))
      break;
    s = d == "absolute" ? s.offsetParent : Ur(s);
  }
}
function X0(t) {
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
  return { refDOM: r, refTop: i, stack: Ud(t.dom) };
}
function Ud(t) {
  let e = [], n = t.ownerDocument;
  for (let r = t; r && (e.push({ dom: r, top: r.scrollTop, left: r.scrollLeft }), t != n); r = Ur(r))
    ;
  return e;
}
function Z0({ refDOM: t, refTop: e, stack: n }) {
  let r = t ? t.getBoundingClientRect().top : 0;
  Jd(n, r == 0 ? 0 : r - e);
}
function Jd(t, e) {
  for (let n = 0; n < t.length; n++) {
    let { dom: r, top: i, left: o } = t[n];
    r.scrollTop != i + e && (r.scrollTop = i + e), r.scrollLeft != o && (r.scrollLeft = o);
  }
}
let fr = null;
function ew(t) {
  if (t.setActive)
    return t.setActive();
  if (fr)
    return t.focus(fr);
  let e = Ud(t);
  t.focus(fr == null ? {
    get preventScroll() {
      return fr = { preventScroll: !0 }, !0;
    }
  } : void 0), fr || (fr = !1, Jd(e, 0));
}
function Gd(t, e) {
  let n, r = 2e8, i, o = 0, s = e.top, l = e.top, a, u;
  for (let c = t.firstChild, f = 0; c; c = c.nextSibling, f++) {
    let d;
    if (c.nodeType == 1)
      d = c.getClientRects();
    else if (c.nodeType == 3)
      d = Ft(c).getClientRects();
    else
      continue;
    for (let h = 0; h < d.length; h++) {
      let p = d[h];
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
  return !n && a && (n = a, i = u, r = 0), n && n.nodeType == 3 ? tw(n, i) : !n || r && n.nodeType == 1 ? { node: t, offset: o } : Gd(n, i);
}
function tw(t, e) {
  let n = t.nodeValue.length, r = document.createRange(), i;
  for (let o = 0; o < n; o++) {
    r.setEnd(t, o + 1), r.setStart(t, o);
    let s = sn(r, 1);
    if (s.top != s.bottom && $a(e, s)) {
      i = { node: t, offset: o + (e.left >= (s.left + s.right) / 2 ? 1 : 0) };
      break;
    }
  }
  return r.detach(), i || { node: t, offset: 0 };
}
function $a(t, e) {
  return t.left >= e.left - 1 && t.left <= e.right + 1 && t.top >= e.top - 1 && t.top <= e.bottom + 1;
}
function nw(t, e) {
  let n = t.parentNode;
  return n && /^li$/i.test(n.nodeName) && e.left < t.getBoundingClientRect().left ? n : t;
}
function rw(t, e, n) {
  let { node: r, offset: i } = Gd(e, n), o = -1;
  if (r.nodeType == 1 && !r.firstChild) {
    let s = r.getBoundingClientRect();
    o = s.left != s.right && n.left > (s.left + s.right) / 2 ? 1 : -1;
  }
  return t.docView.posFromDOM(r, i, o);
}
function iw(t, e, n, r) {
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
function Yd(t, e, n) {
  let r = t.childNodes.length;
  if (r && n.top < n.bottom)
    for (let i = Math.max(0, Math.min(r - 1, Math.floor(r * (e.top - n.top) / (n.bottom - n.top)) - 2)), o = i; ; ) {
      let s = t.childNodes[o];
      if (s.nodeType == 1) {
        let l = s.getClientRects();
        for (let a = 0; a < l.length; a++) {
          let u = l[a];
          if ($a(e, u))
            return Yd(s, e, u);
        }
      }
      if ((o = (o + 1) % r) == i)
        break;
    }
  return t;
}
function ow(t, e) {
  let n = t.dom.ownerDocument, r, i = 0, o = J0(n, e.left, e.top);
  o && ({ node: r, offset: i } = o);
  let s = (t.root.elementFromPoint ? t.root : n).elementFromPoint(e.left, e.top), l;
  if (!s || !t.dom.contains(s.nodeType != 1 ? s.parentNode : s)) {
    let u = t.dom.getBoundingClientRect();
    if (!$a(e, u) || (s = Yd(t.dom, e, u), !s))
      return null;
  }
  if (Oe)
    for (let u = s; r && u; u = Ur(u))
      u.draggable && (r = void 0);
  if (s = nw(s, e), r) {
    if (ft && r.nodeType == 1 && (i = Math.min(i, r.childNodes.length), i < r.childNodes.length)) {
      let c = r.childNodes[i], f;
      c.nodeName == "IMG" && (f = c.getBoundingClientRect()).right <= e.left && f.bottom > e.top && i++;
    }
    let u;
    co && i && r.nodeType == 1 && (u = r.childNodes[i - 1]).nodeType == 1 && u.contentEditable == "false" && u.getBoundingClientRect().top >= e.top && i--, r == t.dom && i == r.childNodes.length - 1 && r.lastChild.nodeType == 1 && e.top > r.lastChild.getBoundingClientRect().bottom ? l = t.state.doc.content.size : (i == 0 || r.nodeType != 1 || r.childNodes[i - 1].nodeName != "BR") && (l = iw(t, r, i, e));
  }
  l == null && (l = rw(t, s, e));
  let a = t.docView.nearestDesc(s, !0);
  return { pos: l, inside: a ? a.posAtStart - a.border : -1 };
}
function af(t) {
  return t.top < t.bottom || t.left < t.right;
}
function sn(t, e) {
  let n = t.getClientRects();
  if (n.length) {
    let r = n[e < 0 ? 0 : n.length - 1];
    if (af(r))
      return r;
  }
  return Array.prototype.find.call(n, af) || t.getBoundingClientRect();
}
const sw = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
function Qd(t, e, n) {
  let { node: r, offset: i, atom: o } = t.docView.domFromPos(e, n < 0 ? -1 : 1), s = co || ft;
  if (r.nodeType == 3)
    if (s && (sw.test(r.nodeValue) || (n < 0 ? !i : i == r.nodeValue.length))) {
      let a = sn(Ft(r, i, i), n);
      if (ft && i && /\s/.test(r.nodeValue[i - 1]) && i < r.nodeValue.length) {
        let u = sn(Ft(r, i - 1, i - 1), -1);
        if (u.top == a.top) {
          let c = sn(Ft(r, i, i + 1), -1);
          if (c.top != a.top)
            return ci(c, c.left < u.left);
        }
      }
      return a;
    } else {
      let a = i, u = i, c = n < 0 ? 1 : -1;
      return n < 0 && !i ? (u++, c = -1) : n >= 0 && i == r.nodeValue.length ? (a--, c = 1) : n < 0 ? a-- : u++, ci(sn(Ft(r, a, u), c), c < 0);
    }
  if (!t.state.doc.resolve(e - (o || 0)).parent.inlineContent) {
    if (o == null && i && (n < 0 || i == ct(r))) {
      let a = r.childNodes[i - 1];
      if (a.nodeType == 1)
        return sl(a.getBoundingClientRect(), !1);
    }
    if (o == null && i < ct(r)) {
      let a = r.childNodes[i];
      if (a.nodeType == 1)
        return sl(a.getBoundingClientRect(), !0);
    }
    return sl(r.getBoundingClientRect(), n >= 0);
  }
  if (o == null && i && (n < 0 || i == ct(r))) {
    let a = r.childNodes[i - 1], u = a.nodeType == 3 ? Ft(a, ct(a) - (s ? 0 : 1)) : a.nodeType == 1 && (a.nodeName != "BR" || !a.nextSibling) ? a : null;
    if (u)
      return ci(sn(u, 1), !1);
  }
  if (o == null && i < ct(r)) {
    let a = r.childNodes[i];
    for (; a.pmViewDesc && a.pmViewDesc.ignoreForCoords; )
      a = a.nextSibling;
    let u = a ? a.nodeType == 3 ? Ft(a, 0, s ? 0 : 1) : a.nodeType == 1 ? a : null : null;
    if (u)
      return ci(sn(u, -1), !0);
  }
  return ci(sn(r.nodeType == 3 ? Ft(r) : r, -n), n >= 0);
}
function ci(t, e) {
  if (t.width == 0)
    return t;
  let n = e ? t.left : t.right;
  return { top: t.top, bottom: t.bottom, left: n, right: n };
}
function sl(t, e) {
  if (t.height == 0)
    return t;
  let n = e ? t.top : t.bottom;
  return { top: n, bottom: n, left: t.left, right: t.right };
}
function Xd(t, e, n) {
  let r = t.state, i = t.root.activeElement;
  r != e && t.updateState(e), i != t.dom && t.focus();
  try {
    return n();
  } finally {
    r != e && t.updateState(r), i != t.dom && i && i.focus();
  }
}
function lw(t, e, n) {
  let r = e.selection, i = n == "up" ? r.$from : r.$to;
  return Xd(t, e, () => {
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
    let s = Qd(t, i.pos, 1);
    for (let l = o.firstChild; l; l = l.nextSibling) {
      let a;
      if (l.nodeType == 1)
        a = l.getClientRects();
      else if (l.nodeType == 3)
        a = Ft(l, 0, l.nodeValue.length).getClientRects();
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
const aw = /[\u0590-\u08ac]/;
function uw(t, e, n) {
  let { $head: r } = e.selection;
  if (!r.parent.isTextblock)
    return !1;
  let i = r.parentOffset, o = !i, s = i == r.parent.content.size, l = t.domSelection();
  return l ? !aw.test(r.parent.textContent) || !l.modify ? n == "left" || n == "backward" ? o : s : Xd(t, e, () => {
    let { focusNode: a, focusOffset: u, anchorNode: c, anchorOffset: f } = t.domSelectionRange(), d = l.caretBidiLevel;
    l.modify("move", n, "character");
    let h = r.depth ? t.docView.domAfterPos(r.before()) : t.dom, { focusNode: p, focusOffset: m } = t.domSelectionRange(), y = p && !h.contains(p.nodeType == 1 ? p : p.parentNode) || a == p && u == m;
    try {
      l.collapse(c, f), a && (a != c || u != f) && l.extend && l.extend(a, u);
    } catch {
    }
    return d != null && (l.caretBidiLevel = d), y;
  }) : r.pos == r.start() || r.pos == r.end();
}
let uf = null, cf = null, ff = !1;
function cw(t, e, n) {
  return uf == e && cf == n ? ff : (uf = e, cf = n, ff = n == "up" || n == "down" ? lw(t, e, n) : uw(t, e, n));
}
const ht = 0, hf = 1, Ln = 2, At = 3;
class fo {
  constructor(e, n, r, i) {
    this.parent = e, this.children = n, this.dom = r, this.contentDOM = i, this.dirty = ht, r.pmViewDesc = this;
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
      i = n > Me(this.contentDOM);
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
      if (l > e || s instanceof ep) {
        i = e - o;
        break;
      }
      o = l;
    }
    if (i)
      return this.children[r].domFromPos(i - this.children[r].border, n);
    for (let o; r && !(o = this.children[r - 1]).size && o instanceof Zd && o.side >= 0; r--)
      ;
    if (n <= 0) {
      let o, s = !0;
      for (; o = r ? this.children[r - 1] : null, !(!o || o.dom.parentNode == this.contentDOM); r--, s = !1)
        ;
      return o && n && s && !o.border && !o.domAtom ? o.domFromPos(o.size, n) : { node: this.contentDOM, offset: o ? Me(o.dom) + 1 : 0 };
    } else {
      let o, s = !0;
      for (; o = r < this.children.length ? this.children[r] : null, !(!o || o.dom.parentNode == this.contentDOM); r++, s = !1)
        ;
      return o && s && !o.border && !o.domAtom ? o.domFromPos(0, n) : { node: this.contentDOM, offset: o ? Me(o.dom) : this.contentDOM.childNodes.length };
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
            i = Me(d.dom) + 1;
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
            o = Me(f.dom);
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
      let m = this.children[h], y = p + m.size;
      if (o > p && s < y)
        return m.setSelection(e - p - m.border, n - p - m.border, r, i);
      p = y;
    }
    let l = this.domFromPos(e, e ? -1 : 1), a = n == e ? l : this.domFromPos(n, n ? -1 : 1), u = r.root.getSelection(), c = r.domSelectionRange(), f = !1;
    if ((ft || Oe) && e == n) {
      let { node: h, offset: p } = l;
      if (h.nodeType == 3) {
        if (f = !!(p && h.nodeValue[p - 1] == `
`), f && p == h.nodeValue.length)
          for (let m = h, y; m; m = m.parentNode) {
            if (y = m.nextSibling) {
              y.nodeName == "BR" && (l = a = { node: y.parentNode, offset: Me(y) + 1 });
              break;
            }
            let g = m.pmViewDesc;
            if (g && g.node && g.node.isBlock)
              break;
          }
      } else {
        let m = h.childNodes[p - 1];
        f = m && (m.nodeName == "BR" || m.contentEditable == "false");
      }
    }
    if (ft && c.focusNode && c.focusNode != a.node && c.focusNode.nodeType == 1) {
      let h = c.focusNode.childNodes[c.focusOffset];
      h && h.contentEditable == "false" && (i = !0);
    }
    if (!(i || f && Oe) && ir(l.node, l.offset, c.anchorNode, c.anchorOffset) && ir(a.node, a.offset, c.focusNode, c.focusOffset))
      return;
    let d = !1;
    if ((u.extend || e == n) && !(f && ft)) {
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
          this.dirty = e == r || n == s ? Ln : hf, e == l && n == a && (o.contentLost || o.dom.parentNode != this.contentDOM) ? o.dirty = At : o.markDirty(e - l, n - l);
          return;
        } else
          o.dirty = o.dom == o.contentDOM && o.dom.parentNode == this.contentDOM && !o.children.length ? Ln : At;
      }
      r = s;
    }
    this.dirty = Ln;
  }
  markParentsDirty() {
    let e = 1;
    for (let n = this.parent; n; n = n.parent, e++) {
      let r = e == 1 ? Ln : hf;
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
class Zd extends fo {
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
    return this.dirty == ht && e.type.eq(this.widget.type);
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
class fw extends fo {
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
class or extends fo {
  constructor(e, n, r, i, o) {
    super(e, [], r, i), this.mark = n, this.spec = o;
  }
  static create(e, n, r, i) {
    let o = i.nodeViews[n.type.name], s = o && o(n, i, r);
    return (!s || !s.dom) && (s = Xr.renderSpec(document, n.type.spec.toDOM(n, r), null, n.attrs)), new or(e, n, s.dom, s.contentDOM || s.dom, s);
  }
  parseRule() {
    return this.dirty & At || this.mark.type.spec.reparseInView ? null : { mark: this.mark.type.name, attrs: this.mark.attrs, contentElement: this.contentDOM };
  }
  matchesMark(e) {
    return this.dirty != At && this.mark.eq(e);
  }
  markDirty(e, n) {
    if (super.markDirty(e, n), this.dirty != ht) {
      let r = this.parent;
      for (; !r.node; )
        r = r.parent;
      r.dirty < this.dirty && (r.dirty = this.dirty), this.dirty = ht;
    }
  }
  slice(e, n, r) {
    let i = or.create(this.parent, this.mark, !0, r), o = this.children, s = this.size;
    n < s && (o = ra(o, n, s, r)), e > 0 && (o = ra(o, 0, e, r));
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
class wn extends fo {
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
    } else c || ({ dom: c, contentDOM: f } = Xr.renderSpec(document, n.type.spec.toDOM(n), null, n.attrs));
    !f && !n.isText && c.nodeName != "BR" && (c.hasAttribute("contenteditable") || (c.contentEditable = "false"), n.type.spec.draggable && (c.draggable = !0));
    let d = c;
    return c = rp(c, r, n), u ? a = new hw(e, n, r, i, c, f || null, d, u, o, s + 1) : n.isText ? new Es(e, n, r, i, c, d, o) : new wn(e, n, r, i, c, f || null, d, o, s + 1);
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
    return this.dirty == ht && e.eq(this.node) && ls(n, this.outerDeco) && r.eq(this.innerDeco);
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
    let r = this.node.inlineContent, i = n, o = e.composing ? this.localCompositionInfo(e, n) : null, s = o && o.pos > -1 ? o : null, l = o && o.pos < 0, a = new pw(this, s && s.node, e);
    yw(this.node, this.innerDeco, (u, c, f) => {
      u.spec.marks ? a.syncToMarks(u.spec.marks, r, e, c) : u.type.side >= 0 && !f && a.syncToMarks(c == this.node.childCount ? ne.none : this.node.child(c).marks, r, e, c), a.placeWidget(u, e, i);
    }, (u, c, f, d) => {
      a.syncToMarks(u.marks, r, e, d);
      let h;
      a.findNodeMatch(u, c, f, d) || l && e.state.selection.from > i && e.state.selection.to < i + u.nodeSize && (h = a.findIndexWithChild(o.node)) > -1 && a.updateNodeAt(u, c, f, h, e) || a.updateNextNode(u, c, f, e, d, i) || a.addNode(u, c, f, e, i), i += u.nodeSize;
    }), a.syncToMarks([], r, e, 0), this.node.isTextblock && a.addTextblockHacks(), a.destroyRest(), (a.changed || this.dirty == Ln) && (s && this.protectLocalComposition(e, s), tp(this.contentDOM, this.children, e), Jr && kw(this.dom));
  }
  localCompositionInfo(e, n) {
    let { from: r, to: i } = e.state.selection;
    if (!(e.state.selection instanceof G) || r < n || i > n + this.node.content.size)
      return null;
    let o = e.input.compositionNode;
    if (!o || !this.dom.contains(o.parentNode))
      return null;
    if (this.node.inlineContent) {
      let s = o.nodeValue, l = bw(this.node.content, s, r - n, i - n);
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
    let s = new fw(this, o, n, i);
    e.input.compositionNodes.push(s), this.children = ra(this.children, r, r + i.length, e, s);
  }
  // If this desc must be updated to match the given node decoration,
  // do so and return true.
  update(e, n, r, i) {
    return this.dirty == At || !e.sameMarkup(this.node) ? !1 : (this.updateInner(e, n, r, i), !0);
  }
  updateInner(e, n, r, i) {
    this.updateOuterDeco(n), this.node = e, this.innerDeco = r, this.contentDOM && this.updateChildren(i, this.posAtStart), this.dirty = ht;
  }
  updateOuterDeco(e) {
    if (ls(e, this.outerDeco))
      return;
    let n = this.nodeDOM.nodeType != 1, r = this.dom;
    this.dom = np(this.dom, this.nodeDOM, na(this.outerDeco, this.node, n), na(e, this.node, n)), this.dom != r && (r.pmViewDesc = void 0, this.dom.pmViewDesc = this), this.outerDeco = e;
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
function df(t, e, n, r, i) {
  rp(r, e, t);
  let o = new wn(void 0, t, e, n, r, r, r, i, 0);
  return o.contentDOM && o.updateChildren(i, 0), o;
}
class Es extends wn {
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
    return this.dirty == At || this.dirty != ht && !this.inParent() || !e.sameMarkup(this.node) ? !1 : (this.updateOuterDeco(n), (this.dirty != ht || e.text != this.node.text) && e.text != this.nodeDOM.nodeValue && (this.nodeDOM.nodeValue = e.text, i.trackWrites == this.nodeDOM && (i.trackWrites = null)), this.node = e, this.dirty = ht, !0);
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
    return new Es(this.parent, i, this.outerDeco, this.innerDeco, o, o, r);
  }
  markDirty(e, n) {
    super.markDirty(e, n), this.dom != this.nodeDOM && (e == 0 || n == this.nodeDOM.nodeValue.length) && (this.dirty = At);
  }
  get domAtom() {
    return !1;
  }
  isText(e) {
    return this.node.text == e;
  }
}
class ep extends fo {
  parseRule() {
    return { ignore: !0 };
  }
  matchesHack(e) {
    return this.dirty == ht && this.dom.nodeName == e;
  }
  get domAtom() {
    return !0;
  }
  get ignoreForCoords() {
    return this.dom.nodeName == "IMG";
  }
}
class hw extends wn {
  constructor(e, n, r, i, o, s, l, a, u, c) {
    super(e, n, r, i, o, s, l, u, c), this.spec = a;
  }
  // A custom `update` method gets to decide whether the update goes
  // through. If it does, and there's a `contentDOM` node, our logic
  // updates the children.
  update(e, n, r, i) {
    if (this.dirty == At)
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
function tp(t, e, n) {
  let r = t.firstChild, i = !1;
  for (let o = 0; o < e.length; o++) {
    let s = e[o], l = s.dom;
    if (l.parentNode == t) {
      for (; l != r; )
        r = pf(r), i = !0;
      r = r.nextSibling;
    } else
      i = !0, t.insertBefore(l, r);
    if (s instanceof or) {
      let a = r ? r.previousSibling : t.lastChild;
      tp(s.contentDOM, s.children, n), r = a ? a.nextSibling : t.firstChild;
    }
  }
  for (; r; )
    r = pf(r), i = !0;
  i && n.trackWrites == t && (n.trackWrites = null);
}
const xi = function(t) {
  t && (this.nodeName = t);
};
xi.prototype = /* @__PURE__ */ Object.create(null);
const Pn = [new xi()];
function na(t, e, n) {
  if (t.length == 0)
    return Pn;
  let r = n ? Pn[0] : new xi(), i = [r];
  for (let o = 0; o < t.length; o++) {
    let s = t[o].type.attrs;
    if (s) {
      s.nodeName && i.push(r = new xi(s.nodeName));
      for (let l in s) {
        let a = s[l];
        a != null && (n && i.length == 1 && i.push(r = new xi(e.isInline ? "span" : "div")), l == "class" ? r.class = (r.class ? r.class + " " : "") + a : l == "style" ? r.style = (r.style ? r.style + ";" : "") + a : l != "nodeName" && (r[l] = a));
      }
    }
  }
  return i;
}
function np(t, e, n, r) {
  if (n == Pn && r == Pn)
    return e;
  let i = e;
  for (let o = 0; o < r.length; o++) {
    let s = r[o], l = n[o];
    if (o) {
      let a;
      l && l.nodeName == s.nodeName && i != t && (a = i.parentNode) && a.nodeName.toLowerCase() == s.nodeName || (a = document.createElement(s.nodeName), a.pmIsDeco = !0, a.appendChild(i), l = Pn[0]), i = a;
    }
    dw(i, l || Pn[0], s);
  }
  return i;
}
function dw(t, e, n) {
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
function rp(t, e, n) {
  return np(t, t, Pn, na(e, n, t.nodeType != 1));
}
function ls(t, e) {
  if (t.length != e.length)
    return !1;
  for (let n = 0; n < t.length; n++)
    if (!t[n].type.eq(e[n].type))
      return !1;
  return !0;
}
function pf(t) {
  let e = t.nextSibling;
  return t.parentNode.removeChild(t), e;
}
class pw {
  constructor(e, n, r) {
    this.lock = n, this.view = r, this.index = 0, this.stack = [], this.changed = !1, this.top = e, this.preMatch = mw(e.node.content, e);
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
      this.destroyRest(), this.top.dirty = ht, this.index = this.stack.pop(), this.top = this.stack.pop(), s--;
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
        let c = or.create(this.top, e[s], n, r);
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
    return s.dirty == At && s.dom == s.contentDOM && (s.dirty = Ln), s.update(e, n, r, o) ? (this.destroyBetween(this.index, i), this.index++, !0) : !1;
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
      if (a instanceof wn) {
        let u = this.preMatch.matched.get(a);
        if (u != null && u != o)
          return !1;
        let c = a.dom, f, d = this.isLocked(c) && !(e.isText && a.node && a.node.isText && a.nodeDOM.nodeValue == e.text && a.dirty != At && ls(n, a.outerDeco));
        if (!d && a.update(e, n, r, i))
          return this.destroyBetween(this.index, l), a.dom != c && (this.changed = !0), this.index++, !0;
        if (!d && (f = this.recreateWrapper(a, e, n, r, i, s)))
          return this.destroyBetween(this.index, l), this.top.children[this.index] = f, f.contentDOM && (f.dirty = Ln, f.updateChildren(i, s + 1), f.dirty = ht), this.changed = !0, this.index++, !0;
        break;
      }
    }
    return !1;
  }
  // When a node with content is replaced by a different node with
  // identical content, move over its children.
  recreateWrapper(e, n, r, i, o, s) {
    if (e.dirty || n.isAtom || !e.children.length || !e.node.content.eq(n.content) || !ls(r, e.outerDeco) || !i.eq(e.innerDeco))
      return null;
    let l = wn.create(this.top, n, r, i, o, s);
    if (l.contentDOM) {
      l.children = e.children, e.children = [];
      for (let a of l.children)
        a.parent = l;
    }
    return e.destroy(), l;
  }
  // Insert the node as a newly created node desc.
  addNode(e, n, r, i, o) {
    let s = wn.create(this.top, e, n, r, i, o);
    s.contentDOM && s.updateChildren(i, o + 1), this.top.children.splice(this.index++, 0, s), this.changed = !0;
  }
  placeWidget(e, n, r) {
    let i = this.index < this.top.children.length ? this.top.children[this.index] : null;
    if (i && i.matchesWidget(e) && (e == i.widget || !i.widget.type.toDOM.parentNode))
      this.index++;
    else {
      let o = new Zd(this.top, e, n, r);
      this.top.children.splice(this.index++, 0, o), this.changed = !0;
    }
  }
  // Make sure a textblock looks and behaves correctly in
  // contentEditable.
  addTextblockHacks() {
    let e = this.top.children[this.index - 1], n = this.top;
    for (; e instanceof or; )
      n = e, e = n.children[n.children.length - 1];
    (!e || // Empty textblock
    !(e instanceof Es) || /\n$/.test(e.node.text) || this.view.requiresGeckoHackNode && /\s$/.test(e.node.text)) && ((Oe || Ne) && e && e.dom.contentEditable == "false" && this.addHackNode("IMG", n), this.addHackNode("BR", this.top));
  }
  addHackNode(e, n) {
    if (n == this.top && this.index < n.children.length && n.children[this.index].matchesHack(e))
      this.index++;
    else {
      let r = document.createElement(e);
      e == "IMG" && (r.className = "ProseMirror-separator", r.alt = ""), e == "BR" && (r.className = "ProseMirror-trailingBreak");
      let i = new ep(this.top, [], r, null);
      n != this.top ? n.children.push(i) : n.children.splice(this.index++, 0, i), this.changed = !0;
    }
  }
  isLocked(e) {
    return this.lock && (e == this.lock || e.nodeType == 1 && e.contains(this.lock.parentNode));
  }
}
function mw(t, e) {
  let n = e, r = n.children.length, i = t.childCount, o = /* @__PURE__ */ new Map(), s = [];
  e: for (; i > 0; ) {
    let l;
    for (; ; )
      if (r) {
        let u = n.children[r - 1];
        if (u instanceof or)
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
function gw(t, e) {
  return t.type.side - e.type.side;
}
function yw(t, e, n, r) {
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
      let y = i[s++];
      y.widget && (c ? (f || (f = [c])).push(y) : c = y);
    }
    if (c)
      if (f) {
        f.sort(gw);
        for (let y = 0; y < f.length; y++)
          n(f[y], u, !!a);
      } else
        n(c, u, !!a);
    let d, h;
    if (a)
      h = -1, d = a, a = null;
    else if (u < t.childCount)
      h = u, d = t.child(u++);
    else
      break;
    for (let y = 0; y < l.length; y++)
      l[y].to <= o && l.splice(y--, 1);
    for (; s < i.length && i[s].from <= o && i[s].to > o; )
      l.push(i[s++]);
    let p = o + d.nodeSize;
    if (d.isText) {
      let y = p;
      s < i.length && i[s].from < y && (y = i[s].from);
      for (let g = 0; g < l.length; g++)
        l[g].to < y && (y = l[g].to);
      y < p && (a = d.cut(y - o), d = d.cut(0, y - o), p = y, h = -1);
    } else
      for (; s < i.length && i[s].to < p; )
        s++;
    let m = d.isInline && !d.isLeaf ? l.filter((y) => !y.inline) : l.slice();
    r(d, m, e.forChild(o, d), h), o = p;
  }
}
function kw(t) {
  if (t.nodeName == "UL" || t.nodeName == "OL") {
    let e = t.style.cssText;
    t.style.cssText = e + "; list-style: square !important", window.getComputedStyle(t).listStyle, t.style.cssText = e;
  }
}
function bw(t, e, n, r) {
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
function ra(t, e, n, r, i) {
  let o = [];
  for (let s = 0, l = 0; s < t.length; s++) {
    let a = t[s], u = l, c = l += a.size;
    u >= n || c <= e ? o.push(a) : (u < e && o.push(a.slice(0, e - u, r)), i && (o.push(i), i = void 0), c > n && o.push(a.slice(n - u, a.size, r)));
  }
  return o;
}
function _a(t, e = null) {
  let n = t.domSelectionRange(), r = t.state.doc;
  if (!n.focusNode)
    return null;
  let i = t.docView.nearestDesc(n.focusNode), o = i && i.size == 0, s = t.docView.posFromDOM(n.focusNode, n.focusOffset, 1);
  if (s < 0)
    return null;
  let l = r.resolve(s), a, u;
  if (As(n)) {
    for (a = s; i && !i.node; )
      i = i.parent;
    let f = i.node;
    if (i && f.isAtom && K.isSelectable(f) && i.parent && !(f.isInline && K0(n.focusNode, n.focusOffset, i.dom))) {
      let d = i.posBefore;
      u = new K(s == d ? l : r.resolve(d));
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
    u = Va(t, c, l, f);
  }
  return u;
}
function ip(t) {
  return t.editable ? t.hasFocus() : sp(t) && document.activeElement && document.activeElement.contains(t.dom);
}
function Gt(t, e = !1) {
  let n = t.state.selection;
  if (op(t, n), !!ip(t)) {
    if (!e && t.input.mouseDown && t.input.mouseDown.allowDefault && Ne) {
      let r = t.domSelectionRange(), i = t.domObserver.currentSelection;
      if (r.anchorNode && i.anchorNode && ir(r.anchorNode, r.anchorOffset, i.anchorNode, i.anchorOffset)) {
        t.input.mouseDown.delayedSelectionSync = !0, t.domObserver.setCurSelection();
        return;
      }
    }
    if (t.domObserver.disconnectSelection(), t.cursorWrapper)
      xw(t);
    else {
      let { anchor: r, head: i } = n, o, s;
      mf && !(n instanceof G) && (n.$from.parent.inlineContent || (o = gf(t, n.from)), !n.empty && !n.$from.parent.inlineContent && (s = gf(t, n.to))), t.docView.setSelection(r, i, t, e), mf && (o && yf(o), s && yf(s)), n.visible ? t.dom.classList.remove("ProseMirror-hideselection") : (t.dom.classList.add("ProseMirror-hideselection"), "onselectionchange" in document && ww(t));
    }
    t.domObserver.setCurSelection(), t.domObserver.connectSelection();
  }
}
const mf = Oe || Ne && Wd < 63;
function gf(t, e) {
  let { node: n, offset: r } = t.docView.domFromPos(e, 0), i = r < n.childNodes.length ? n.childNodes[r] : null, o = r ? n.childNodes[r - 1] : null;
  if (Oe && i && i.contentEditable == "false")
    return ll(i);
  if ((!i || i.contentEditable == "false") && (!o || o.contentEditable == "false")) {
    if (i)
      return ll(i);
    if (o)
      return ll(o);
  }
}
function ll(t) {
  return t.contentEditable = "true", Oe && t.draggable && (t.draggable = !1, t.wasDraggable = !0), t;
}
function yf(t) {
  t.contentEditable = "false", t.wasDraggable && (t.draggable = !0, t.wasDraggable = null);
}
function ww(t) {
  let e = t.dom.ownerDocument;
  e.removeEventListener("selectionchange", t.input.hideSelectionGuard);
  let n = t.domSelectionRange(), r = n.anchorNode, i = n.anchorOffset;
  e.addEventListener("selectionchange", t.input.hideSelectionGuard = () => {
    (n.anchorNode != r || n.anchorOffset != i) && (e.removeEventListener("selectionchange", t.input.hideSelectionGuard), setTimeout(() => {
      (!ip(t) || t.state.selection.visible) && t.dom.classList.remove("ProseMirror-hideselection");
    }, 20));
  });
}
function xw(t) {
  let e = t.domSelection();
  if (!e)
    return;
  let n = t.cursorWrapper.dom, r = n.nodeName == "IMG";
  r ? e.collapse(n.parentNode, Me(n) + 1) : e.collapse(n, 0), !r && !t.state.selection.visible && je && bn <= 11 && (n.disabled = !0, n.disabled = !1);
}
function op(t, e) {
  if (e instanceof K) {
    let n = t.docView.descAt(e.from);
    n != t.lastSelectedViewDesc && (kf(t), n && n.selectNode(), t.lastSelectedViewDesc = n);
  } else
    kf(t);
}
function kf(t) {
  t.lastSelectedViewDesc && (t.lastSelectedViewDesc.parent && t.lastSelectedViewDesc.deselectNode(), t.lastSelectedViewDesc = void 0);
}
function Va(t, e, n, r) {
  return t.someProp("createSelectionBetween", (i) => i(t, e, n)) || G.between(e, n, r);
}
function bf(t) {
  return t.editable && !t.hasFocus() ? !1 : sp(t);
}
function sp(t) {
  let e = t.domSelectionRange();
  if (!e.anchorNode)
    return !1;
  try {
    return t.dom.contains(e.anchorNode.nodeType == 3 ? e.anchorNode.parentNode : e.anchorNode) && (t.editable || t.dom.contains(e.focusNode.nodeType == 3 ? e.focusNode.parentNode : e.focusNode));
  } catch {
    return !1;
  }
}
function Cw(t) {
  let e = t.docView.domFromPos(t.state.selection.anchor, 0), n = t.domSelectionRange();
  return ir(e.node, e.offset, n.anchorNode, n.anchorOffset);
}
function ia(t, e) {
  let { $anchor: n, $head: r } = t.selection, i = e > 0 ? n.max(r) : n.min(r), o = i.parent.inlineContent ? i.depth ? t.doc.resolve(e > 0 ? i.after() : i.before()) : null : i;
  return o && J.findFrom(o, e);
}
function ln(t, e) {
  return t.dispatch(t.state.tr.setSelection(e).scrollIntoView()), !0;
}
function wf(t, e, n) {
  let r = t.state.selection;
  if (r instanceof G)
    if (n.indexOf("s") > -1) {
      let { $head: i } = r, o = i.textOffset ? null : e < 0 ? i.nodeBefore : i.nodeAfter;
      if (!o || o.isText || !o.isLeaf)
        return !1;
      let s = t.state.doc.resolve(i.pos + o.nodeSize * (e < 0 ? -1 : 1));
      return ln(t, new G(r.$anchor, s));
    } else if (r.empty) {
      if (t.endOfTextblock(e > 0 ? "forward" : "backward")) {
        let i = ia(t.state, e);
        return i && i instanceof K ? ln(t, i) : !1;
      } else if (!(at && n.indexOf("m") > -1)) {
        let i = r.$head, o = i.textOffset ? null : e < 0 ? i.nodeBefore : i.nodeAfter, s;
        if (!o || o.isText)
          return !1;
        let l = e < 0 ? i.pos - o.nodeSize : i.pos;
        return o.isAtom || (s = t.docView.descAt(l)) && !s.contentDOM ? K.isSelectable(o) ? ln(t, new K(e < 0 ? t.state.doc.resolve(i.pos - o.nodeSize) : i)) : co ? ln(t, new G(t.state.doc.resolve(e < 0 ? l : l + o.nodeSize))) : !1 : !1;
      }
    } else return !1;
  else {
    if (r instanceof K && r.node.isInline)
      return ln(t, new G(e > 0 ? r.$to : r.$from));
    {
      let i = ia(t.state, e);
      return i ? ln(t, i) : !1;
    }
  }
}
function as(t) {
  return t.nodeType == 3 ? t.nodeValue.length : t.childNodes.length;
}
function Ci(t, e) {
  let n = t.pmViewDesc;
  return n && n.size == 0 && (e < 0 || t.nextSibling || t.nodeName != "BR");
}
function hr(t, e) {
  return e < 0 ? Sw(t) : Mw(t);
}
function Sw(t) {
  let e = t.domSelectionRange(), n = e.focusNode, r = e.focusOffset;
  if (!n)
    return;
  let i, o, s = !1;
  for (ft && n.nodeType == 1 && r < as(n) && Ci(n.childNodes[r], -1) && (s = !0); ; )
    if (r > 0) {
      if (n.nodeType != 1)
        break;
      {
        let l = n.childNodes[r - 1];
        if (Ci(l, -1))
          i = n, o = --r;
        else if (l.nodeType == 3)
          n = l, r = n.nodeValue.length;
        else
          break;
      }
    } else {
      if (lp(n))
        break;
      {
        let l = n.previousSibling;
        for (; l && Ci(l, -1); )
          i = n.parentNode, o = Me(l), l = l.previousSibling;
        if (l)
          n = l, r = as(n);
        else {
          if (n = n.parentNode, n == t.dom)
            break;
          r = 0;
        }
      }
    }
  s ? oa(t, n, r) : i && oa(t, i, o);
}
function Mw(t) {
  let e = t.domSelectionRange(), n = e.focusNode, r = e.focusOffset;
  if (!n)
    return;
  let i = as(n), o, s;
  for (; ; )
    if (r < i) {
      if (n.nodeType != 1)
        break;
      let l = n.childNodes[r];
      if (Ci(l, 1))
        o = n, s = ++r;
      else
        break;
    } else {
      if (lp(n))
        break;
      {
        let l = n.nextSibling;
        for (; l && Ci(l, 1); )
          o = l.parentNode, s = Me(l) + 1, l = l.nextSibling;
        if (l)
          n = l, r = 0, i = as(n);
        else {
          if (n = n.parentNode, n == t.dom)
            break;
          r = i = 0;
        }
      }
    }
  o && oa(t, o, s);
}
function lp(t) {
  let e = t.pmViewDesc;
  return e && e.node && e.node.isBlock;
}
function Nw(t, e) {
  for (; t && e == t.childNodes.length && !uo(t); )
    e = Me(t) + 1, t = t.parentNode;
  for (; t && e < t.childNodes.length; ) {
    let n = t.childNodes[e];
    if (n.nodeType == 3)
      return n;
    if (n.nodeType == 1 && n.contentEditable == "false")
      break;
    t = n, e = 0;
  }
}
function Tw(t, e) {
  for (; t && !e && !uo(t); )
    e = Me(t), t = t.parentNode;
  for (; t && e; ) {
    let n = t.childNodes[e - 1];
    if (n.nodeType == 3)
      return n;
    if (n.nodeType == 1 && n.contentEditable == "false")
      break;
    t = n, e = t.childNodes.length;
  }
}
function oa(t, e, n) {
  if (e.nodeType != 3) {
    let o, s;
    (s = Nw(e, n)) ? (e = s, n = 0) : (o = Tw(e, n)) && (e = o, n = o.nodeValue.length);
  }
  let r = t.domSelection();
  if (!r)
    return;
  if (As(r)) {
    let o = document.createRange();
    o.setEnd(e, n), o.setStart(e, n), r.removeAllRanges(), r.addRange(o);
  } else r.extend && r.extend(e, n);
  t.domObserver.setCurSelection();
  let { state: i } = t;
  setTimeout(() => {
    t.state == i && Gt(t);
  }, 50);
}
function xf(t, e) {
  let n = t.state.doc.resolve(e);
  if (!(Ne || Kd) && n.parent.inlineContent) {
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
function Cf(t, e, n) {
  let r = t.state.selection;
  if (r instanceof G && !r.empty || n.indexOf("s") > -1 || at && n.indexOf("m") > -1)
    return !1;
  let { $from: i, $to: o } = r;
  if (!i.parent.inlineContent || t.endOfTextblock(e < 0 ? "up" : "down")) {
    let s = ia(t.state, e);
    if (s && s instanceof K)
      return ln(t, s);
  }
  if (!i.parent.inlineContent) {
    let s = e < 0 ? i : o, l = r instanceof nt ? J.near(s, e) : J.findFrom(s, e);
    return l ? ln(t, l) : !1;
  }
  return !1;
}
function Sf(t, e) {
  if (!(t.state.selection instanceof G))
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
function Mf(t, e, n) {
  t.domObserver.stop(), e.contentEditable = n, t.domObserver.start();
}
function vw(t) {
  if (!Oe || t.state.selection.$head.parentOffset > 0)
    return !1;
  let { focusNode: e, focusOffset: n } = t.domSelectionRange();
  if (e && e.nodeType == 1 && n == 0 && e.firstChild && e.firstChild.contentEditable == "false") {
    let r = e.firstChild;
    Mf(t, r, "true"), setTimeout(() => Mf(t, r, "false"), 20);
  }
  return !1;
}
function Iw(t) {
  let e = "";
  return t.ctrlKey && (e += "c"), t.metaKey && (e += "m"), t.altKey && (e += "a"), t.shiftKey && (e += "s"), e;
}
function Aw(t, e) {
  let n = e.keyCode, r = Iw(e);
  if (n == 8 || at && n == 72 && r == "c")
    return Sf(t, -1) || hr(t, -1);
  if (n == 46 && !e.shiftKey || at && n == 68 && r == "c")
    return Sf(t, 1) || hr(t, 1);
  if (n == 13 || n == 27)
    return !0;
  if (n == 37 || at && n == 66 && r == "c") {
    let i = n == 37 ? xf(t, t.state.selection.from) == "ltr" ? -1 : 1 : -1;
    return wf(t, i, r) || hr(t, i);
  } else if (n == 39 || at && n == 70 && r == "c") {
    let i = n == 39 ? xf(t, t.state.selection.from) == "ltr" ? 1 : -1 : 1;
    return wf(t, i, r) || hr(t, i);
  } else {
    if (n == 38 || at && n == 80 && r == "c")
      return Cf(t, -1, r) || hr(t, -1);
    if (n == 40 || at && n == 78 && r == "c")
      return vw(t) || Cf(t, 1, r) || hr(t, 1);
    if (r == (at ? "m" : "c") && (n == 66 || n == 73 || n == 89 || n == 90))
      return !0;
  }
  return !1;
}
function Ha(t, e) {
  t.someProp("transformCopied", (h) => {
    e = h(e, t);
  });
  let n = [], { content: r, openStart: i, openEnd: o } = e;
  for (; i > 1 && o > 1 && r.childCount == 1 && r.firstChild.childCount == 1; ) {
    i--, o--;
    let h = r.firstChild;
    n.push(h.type.name, h.attrs != h.type.defaultAttrs ? h.attrs : null), r = h.content;
  }
  let s = t.someProp("clipboardSerializer") || Xr.fromSchema(t.state.schema), l = dp(), a = l.createElement("div");
  a.appendChild(s.serializeFragment(r, { document: l }));
  let u = a.firstChild, c, f = 0;
  for (; u && u.nodeType == 1 && (c = hp[u.nodeName.toLowerCase()]); ) {
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
function ap(t, e, n, r, i) {
  let o = i.parent.type.spec.code, s, l;
  if (!n && !e)
    return null;
  let a = !!e && (r || o || !n);
  if (a) {
    if (t.someProp("transformPastedText", (d) => {
      e = d(e, o || r, t);
    }), o)
      return l = new P(A.from(t.state.schema.text(e.replace(/\r\n?/g, `
`))), 0, 0), t.someProp("transformPasted", (d) => {
        l = d(l, t, !0);
      }), l;
    let f = t.someProp("clipboardTextParser", (d) => d(e, i, r, t));
    if (f)
      l = f;
    else {
      let d = i.marks(), { schema: h } = t.state, p = Xr.fromSchema(h);
      s = document.createElement("div"), e.split(/(?:\r\n?|\n)+/).forEach((m) => {
        let y = s.appendChild(document.createElement("p"));
        m && y.appendChild(p.serializeNode(h.text(m, d)));
      });
    }
  } else
    t.someProp("transformPastedHTML", (f) => {
      n = f(n, t);
    }), s = Rw(n), co && Lw(s);
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
  if (l || (l = (t.someProp("clipboardParser") || t.someProp("domParser") || qr.fromSchema(t.state.schema)).parseSlice(s, {
    preserveWhitespace: !!(a || c),
    context: i,
    ruleFromNode(d) {
      return d.nodeName == "BR" && !d.nextSibling && d.parentNode && !Ew.test(d.parentNode.nodeName) ? { ignore: !0 } : null;
    }
  })), c)
    l = Pw(Nf(l, +c[1], +c[2]), c[4]);
  else if (l = P.maxOpen(Ow(l.content, i), !0), l.openStart || l.openEnd) {
    let f = 0, d = 0;
    for (let h = l.content.firstChild; f < l.openStart && !h.type.spec.isolating; f++, h = h.firstChild)
      ;
    for (let h = l.content.lastChild; d < l.openEnd && !h.type.spec.isolating; d++, h = h.lastChild)
      ;
    l = Nf(l, f, d);
  }
  return t.someProp("transformPasted", (f) => {
    l = f(l, t, a);
  }), l;
}
const Ew = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var)$/i;
function Ow(t, e) {
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
      if (u = s.length && o.length && cp(a, o, l, s[s.length - 1], 0))
        s[s.length - 1] = u;
      else {
        s.length && (s[s.length - 1] = fp(s[s.length - 1], o.length));
        let c = up(l, a);
        s.push(c), i = i.matchType(c.type), o = a;
      }
    }), s)
      return A.from(s);
  }
  return t;
}
function up(t, e, n = 0) {
  for (let r = e.length - 1; r >= n; r--)
    t = e[r].create(null, A.from(t));
  return t;
}
function cp(t, e, n, r, i) {
  if (i < t.length && i < e.length && t[i] == e[i]) {
    let o = cp(t, e, n, r.lastChild, i + 1);
    if (o)
      return r.copy(r.content.replaceChild(r.childCount - 1, o));
    if (r.contentMatchAt(r.childCount).matchType(i == t.length - 1 ? n.type : t[i + 1]))
      return r.copy(r.content.append(A.from(up(n, t, i + 1))));
  }
}
function fp(t, e) {
  if (e == 0)
    return t;
  let n = t.content.replaceChild(t.childCount - 1, fp(t.lastChild, e - 1)), r = t.contentMatchAt(t.childCount).fillBefore(A.empty, !0);
  return t.copy(n.append(r));
}
function sa(t, e, n, r, i, o) {
  let s = e < 0 ? t.firstChild : t.lastChild, l = s.content;
  return t.childCount > 1 && (o = 0), i < r - 1 && (l = sa(l, e, n, r, i + 1, o)), i >= n && (l = e < 0 ? s.contentMatchAt(0).fillBefore(l, o <= i).append(l) : l.append(s.contentMatchAt(s.childCount).fillBefore(A.empty, !0))), t.replaceChild(e < 0 ? 0 : t.childCount - 1, s.copy(l));
}
function Nf(t, e, n) {
  return e < t.openStart && (t = new P(sa(t.content, -1, e, t.openStart, 0, t.openEnd), e, t.openEnd)), n < t.openEnd && (t = new P(sa(t.content, 1, n, t.openEnd, 0, 0), t.openStart, n)), t;
}
const hp = {
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
let Tf = null;
function dp() {
  return Tf || (Tf = document.implementation.createHTMLDocument("title"));
}
let al = null;
function Dw(t) {
  let e = window.trustedTypes;
  return e ? (al || (al = e.defaultPolicy || e.createPolicy("ProseMirrorClipboard", { createHTML: (n) => n })), al.createHTML(t)) : t;
}
function Rw(t) {
  let e = /^(\s*<meta [^>]*>)*/.exec(t);
  e && (t = t.slice(e[0].length));
  let n = dp().createElement("div"), r = /<([a-z][^>\s]+)/i.exec(t), i;
  if ((i = r && hp[r[1].toLowerCase()]) && (t = i.map((o) => "<" + o + ">").join("") + t + i.map((o) => "</" + o + ">").reverse().join("")), n.innerHTML = Dw(t), i)
    for (let o = 0; o < i.length; o++)
      n = n.querySelector(i[o]) || n;
  return n;
}
function Lw(t) {
  let e = t.querySelectorAll(Ne ? "span:not([class]):not([style])" : "span.Apple-converted-space");
  for (let n = 0; n < e.length; n++) {
    let r = e[n];
    r.childNodes.length == 1 && r.textContent == " " && r.parentNode && r.parentNode.replaceChild(t.ownerDocument.createTextNode(" "), r);
  }
}
function Pw(t, e) {
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
  return new P(i, o, s);
}
const Pe = {}, ze = {}, zw = { touchstart: !0, touchmove: !0 };
class Bw {
  constructor() {
    this.shiftKey = !1, this.mouseDown = null, this.lastKeyCode = null, this.lastKeyCodeTime = 0, this.lastClick = { time: 0, x: 0, y: 0, type: "", button: 0 }, this.lastSelectionOrigin = null, this.lastSelectionTime = 0, this.lastIOSEnter = 0, this.lastIOSEnterFallbackTimeout = -1, this.lastFocus = 0, this.lastTouch = 0, this.lastChromeDelete = 0, this.composing = !1, this.compositionNode = null, this.composingTimeout = -1, this.compositionNodes = [], this.compositionEndedAt = -2e8, this.compositionID = 1, this.badSafariComposition = !1, this.compositionPendingChanges = 0, this.domChangeCount = 0, this.eventHandlers = /* @__PURE__ */ Object.create(null), this.hideSelectionGuard = null;
  }
}
function Fw(t) {
  for (let e in Pe) {
    let n = Pe[e];
    t.dom.addEventListener(e, t.input.eventHandlers[e] = (r) => {
      _w(t, r) && !ja(t, r) && (t.editable || !(r.type in ze)) && n(t, r);
    }, zw[e] ? { passive: !0 } : void 0);
  }
  Oe && t.dom.addEventListener("input", () => null), la(t);
}
function yn(t, e) {
  t.input.lastSelectionOrigin = e, t.input.lastSelectionTime = Date.now();
}
function $w(t) {
  t.domObserver.stop();
  for (let e in t.input.eventHandlers)
    t.dom.removeEventListener(e, t.input.eventHandlers[e]);
  clearTimeout(t.input.composingTimeout), clearTimeout(t.input.lastIOSEnterFallbackTimeout);
}
function la(t) {
  t.someProp("handleDOMEvents", (e) => {
    for (let n in e)
      t.input.eventHandlers[n] || t.dom.addEventListener(n, t.input.eventHandlers[n] = (r) => ja(t, r));
  });
}
function ja(t, e) {
  return t.someProp("handleDOMEvents", (n) => {
    let r = n[e.type];
    return r ? r(t, e) || e.defaultPrevented : !1;
  });
}
function _w(t, e) {
  if (!e.bubbles)
    return !0;
  if (e.defaultPrevented)
    return !1;
  for (let n = e.target; n != t.dom; n = n.parentNode)
    if (!n || n.nodeType == 11 || n.pmViewDesc && n.pmViewDesc.stopEvent(e))
      return !1;
  return !0;
}
function Vw(t, e) {
  !ja(t, e) && Pe[e.type] && (t.editable || !(e.type in ze)) && Pe[e.type](t, e);
}
ze.keydown = (t, e) => {
  let n = e;
  if (t.input.shiftKey = n.keyCode == 16 || n.shiftKey, !mp(t, n) && (t.input.lastKeyCode = n.keyCode, t.input.lastKeyCodeTime = Date.now(), !(Ut && Ne && n.keyCode == 13)))
    if (n.keyCode != 229 && t.domObserver.forceFlush(), Jr && n.keyCode == 13 && !n.ctrlKey && !n.altKey && !n.metaKey) {
      let r = Date.now();
      t.input.lastIOSEnter = r, t.input.lastIOSEnterFallbackTimeout = setTimeout(() => {
        t.input.lastIOSEnter == r && (t.someProp("handleKeyDown", (i) => i(t, Rn(13, "Enter"))), t.input.lastIOSEnter = 0);
      }, 200);
    } else t.someProp("handleKeyDown", (r) => r(t, n)) || Aw(t, n) ? n.preventDefault() : yn(t, "key");
};
ze.keyup = (t, e) => {
  e.keyCode == 16 && (t.input.shiftKey = !1);
};
ze.keypress = (t, e) => {
  let n = e;
  if (mp(t, n) || !n.charCode || n.ctrlKey && !n.altKey || at && n.metaKey)
    return;
  if (t.someProp("handleKeyPress", (i) => i(t, n))) {
    n.preventDefault();
    return;
  }
  let r = t.state.selection;
  if (!(r instanceof G) || !r.$from.sameParent(r.$to)) {
    let i = String.fromCharCode(n.charCode), o = () => t.state.tr.insertText(i).scrollIntoView();
    !/[\r\n]/.test(i) && !t.someProp("handleTextInput", (s) => s(t, r.$from.pos, r.$to.pos, i, o)) && t.dispatch(o()), n.preventDefault();
  }
};
function Os(t) {
  return { left: t.clientX, top: t.clientY };
}
function Hw(t, e) {
  let n = e.x - t.clientX, r = e.y - t.clientY;
  return n * n + r * r < 100;
}
function qa(t, e, n, r, i) {
  if (r == -1)
    return !1;
  let o = t.state.doc.resolve(r);
  for (let s = o.depth + 1; s > 0; s--)
    if (t.someProp(e, (l) => s > o.depth ? l(t, n, o.nodeAfter, o.before(s), i, !0) : l(t, n, o.node(s), o.before(s), i, !1)))
      return !0;
  return !1;
}
function xr(t, e, n) {
  if (t.focused || t.focus(), t.state.selection.eq(e))
    return;
  let r = t.state.tr.setSelection(e);
  r.setMeta("pointer", !0), t.dispatch(r);
}
function jw(t, e) {
  if (e == -1)
    return !1;
  let n = t.state.doc.resolve(e), r = n.nodeAfter;
  return r && r.isAtom && K.isSelectable(r) ? (xr(t, new K(n)), !0) : !1;
}
function qw(t, e) {
  if (e == -1)
    return !1;
  let n = t.state.selection, r, i;
  n instanceof K && (r = n.node);
  let o = t.state.doc.resolve(e);
  for (let s = o.depth + 1; s > 0; s--) {
    let l = s > o.depth ? o.nodeAfter : o.node(s);
    if (K.isSelectable(l)) {
      r && n.$from.depth > 0 && s >= n.$from.depth && o.before(n.$from.depth + 1) == n.$from.pos ? i = o.before(n.$from.depth) : i = o.before(s);
      break;
    }
  }
  return i != null ? (xr(t, K.create(t.state.doc, i)), !0) : !1;
}
function Ww(t, e, n, r, i) {
  return qa(t, "handleClickOn", e, n, r) || t.someProp("handleClick", (o) => o(t, e, r)) || (i ? qw(t, n) : jw(t, n));
}
function Kw(t, e, n, r) {
  return qa(t, "handleDoubleClickOn", e, n, r) || t.someProp("handleDoubleClick", (i) => i(t, e, r));
}
function Uw(t, e, n, r) {
  return qa(t, "handleTripleClickOn", e, n, r) || t.someProp("handleTripleClick", (i) => i(t, e, r)) || Jw(t, n, r);
}
function Jw(t, e, n) {
  if (n.button != 0)
    return !1;
  let r = t.state.doc;
  if (e == -1)
    return r.inlineContent ? (xr(t, G.create(r, 0, r.content.size)), !0) : !1;
  let i = r.resolve(e);
  for (let o = i.depth + 1; o > 0; o--) {
    let s = o > i.depth ? i.nodeAfter : i.node(o), l = i.before(o);
    if (s.inlineContent)
      xr(t, G.create(r, l + 1, l + 1 + s.content.size));
    else if (K.isSelectable(s))
      xr(t, K.create(r, l));
    else
      continue;
    return !0;
  }
}
function Wa(t) {
  return us(t);
}
const pp = at ? "metaKey" : "ctrlKey";
Pe.mousedown = (t, e) => {
  let n = e;
  t.input.shiftKey = n.shiftKey;
  let r = Wa(t), i = Date.now(), o = "singleClick";
  i - t.input.lastClick.time < 500 && Hw(n, t.input.lastClick) && !n[pp] && t.input.lastClick.button == n.button && (t.input.lastClick.type == "singleClick" ? o = "doubleClick" : t.input.lastClick.type == "doubleClick" && (o = "tripleClick")), t.input.lastClick = { time: i, x: n.clientX, y: n.clientY, type: o, button: n.button };
  let s = t.posAtCoords(Os(n));
  s && (o == "singleClick" ? (t.input.mouseDown && t.input.mouseDown.done(), t.input.mouseDown = new Gw(t, s, n, !!r)) : (o == "doubleClick" ? Kw : Uw)(t, s.pos, s.inside, n) ? n.preventDefault() : yn(t, "pointer"));
};
class Gw {
  constructor(e, n, r, i) {
    this.view = e, this.pos = n, this.event = r, this.flushed = i, this.delayedSelectionSync = !1, this.mightDrag = null, this.startDoc = e.state.doc, this.selectNode = !!r[pp], this.allowDefault = r.shiftKey;
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
    r.button == 0 && (o.type.spec.draggable && o.type.spec.selectable !== !1 || u instanceof K && u.from <= s && u.to > s) && (this.mightDrag = {
      node: o,
      pos: s,
      addAttr: !!(this.target && !this.target.draggable),
      setUneditable: !!(this.target && ft && !this.target.hasAttribute("contentEditable"))
    }), this.target && this.mightDrag && (this.mightDrag.addAttr || this.mightDrag.setUneditable) && (this.view.domObserver.stop(), this.mightDrag.addAttr && (this.target.draggable = !0), this.mightDrag.setUneditable && setTimeout(() => {
      this.view.input.mouseDown == this && this.target.setAttribute("contentEditable", "false");
    }, 20), this.view.domObserver.start()), e.root.addEventListener("mouseup", this.up = this.up.bind(this)), e.root.addEventListener("mousemove", this.move = this.move.bind(this)), yn(e, "pointer");
  }
  done() {
    this.view.root.removeEventListener("mouseup", this.up), this.view.root.removeEventListener("mousemove", this.move), this.mightDrag && this.target && (this.view.domObserver.stop(), this.mightDrag.addAttr && this.target.removeAttribute("draggable"), this.mightDrag.setUneditable && this.target.removeAttribute("contentEditable"), this.view.domObserver.start()), this.delayedSelectionSync && setTimeout(() => Gt(this.view)), this.view.input.mouseDown = null;
  }
  up(e) {
    if (this.done(), !this.view.dom.contains(e.target))
      return;
    let n = this.pos;
    this.view.state.doc != this.startDoc && (n = this.view.posAtCoords(Os(e))), this.updateAllowDefault(e), this.allowDefault || !n ? yn(this.view, "pointer") : Ww(this.view, n.pos, n.inside, e, this.selectNode) ? e.preventDefault() : e.button == 0 && (this.flushed || // Safari ignores clicks on draggable elements
    Oe && this.mightDrag && !this.mightDrag.node.isAtom || // Chrome will sometimes treat a node selection as a
    // cursor, but still report that the node is selected
    // when asked through getSelection. You'll then get a
    // situation where clicking at the point where that
    // (hidden) cursor is doesn't change the selection, and
    // thus doesn't get a reaction from ProseMirror. This
    // works around that.
    Ne && !this.view.state.selection.visible && Math.min(Math.abs(n.pos - this.view.state.selection.from), Math.abs(n.pos - this.view.state.selection.to)) <= 2) ? (xr(this.view, J.near(this.view.state.doc.resolve(n.pos))), e.preventDefault()) : yn(this.view, "pointer");
  }
  move(e) {
    this.updateAllowDefault(e), yn(this.view, "pointer"), e.buttons == 0 && this.done();
  }
  updateAllowDefault(e) {
    !this.allowDefault && (Math.abs(this.event.x - e.clientX) > 4 || Math.abs(this.event.y - e.clientY) > 4) && (this.allowDefault = !0);
  }
}
Pe.touchstart = (t) => {
  t.input.lastTouch = Date.now(), Wa(t), yn(t, "pointer");
};
Pe.touchmove = (t) => {
  t.input.lastTouch = Date.now(), yn(t, "pointer");
};
Pe.contextmenu = (t) => Wa(t);
function mp(t, e) {
  return t.composing ? !0 : Oe && Math.abs(e.timeStamp - t.input.compositionEndedAt) < 500 ? (t.input.compositionEndedAt = -2e8, !0) : !1;
}
const Yw = Ut ? 5e3 : -1;
ze.compositionstart = ze.compositionupdate = (t) => {
  if (!t.composing) {
    t.domObserver.flush();
    let { state: e } = t, n = e.selection.$to;
    if (e.selection instanceof G && (e.storedMarks || !n.textOffset && n.parentOffset && n.nodeBefore.marks.some((r) => r.type.spec.inclusive === !1) || Ne && Kd && Qw(t)))
      t.markCursor = t.state.storedMarks || n.marks(), us(t, !0), t.markCursor = null;
    else if (us(t, !e.selection.empty), ft && e.selection.empty && n.parentOffset && !n.textOffset && n.nodeBefore.marks.length) {
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
  gp(t, Yw);
};
function Qw(t) {
  let { focusNode: e, focusOffset: n } = t.domSelectionRange();
  if (!e || e.nodeType != 1 || n >= e.childNodes.length)
    return !1;
  let r = e.childNodes[n];
  return r.nodeType == 1 && r.contentEditable == "false";
}
ze.compositionend = (t, e) => {
  t.composing && (t.input.composing = !1, t.input.compositionEndedAt = e.timeStamp, t.input.compositionPendingChanges = t.domObserver.pendingRecords().length ? t.input.compositionID : 0, t.input.compositionNode = null, t.input.badSafariComposition ? t.domObserver.forceFlush() : t.input.compositionPendingChanges && Promise.resolve().then(() => t.domObserver.flush()), t.input.compositionID++, gp(t, 20));
};
function gp(t, e) {
  clearTimeout(t.input.composingTimeout), e > -1 && (t.input.composingTimeout = setTimeout(() => us(t), e));
}
function yp(t) {
  for (t.composing && (t.input.composing = !1, t.input.compositionEndedAt = Zw()); t.input.compositionNodes.length > 0; )
    t.input.compositionNodes.pop().markParentsDirty();
}
function Xw(t) {
  let e = t.domSelectionRange();
  if (!e.focusNode)
    return null;
  let n = q0(e.focusNode, e.focusOffset), r = W0(e.focusNode, e.focusOffset);
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
function Zw() {
  let t = document.createEvent("Event");
  return t.initEvent("event", !0, !0), t.timeStamp;
}
function us(t, e = !1) {
  if (!(Ut && t.domObserver.flushingSoon >= 0)) {
    if (t.domObserver.forceFlush(), yp(t), e || t.docView && t.docView.dirty) {
      let n = _a(t), r = t.state.selection;
      return n && !n.eq(r) ? t.dispatch(t.state.tr.setSelection(n)) : (t.markCursor || e) && !r.$from.node(r.$from.sharedDepth(r.to)).inlineContent ? t.dispatch(t.state.tr.deleteSelection()) : t.updateState(t.state), !0;
    }
    return !1;
  }
}
function ex(t, e) {
  if (!t.dom.parentNode)
    return;
  let n = t.dom.parentNode.appendChild(document.createElement("div"));
  n.appendChild(e), n.style.cssText = "position: fixed; left: -10000px; top: 10px";
  let r = getSelection(), i = document.createRange();
  i.selectNodeContents(e), t.dom.blur(), r.removeAllRanges(), r.addRange(i), setTimeout(() => {
    n.parentNode && n.parentNode.removeChild(n), t.focus();
  }, 50);
}
const Pi = je && bn < 15 || Jr && G0 < 604;
Pe.copy = ze.cut = (t, e) => {
  let n = e, r = t.state.selection, i = n.type == "cut";
  if (r.empty)
    return;
  let o = Pi ? null : n.clipboardData, s = r.content(), { dom: l, text: a } = Ha(t, s);
  o ? (n.preventDefault(), o.clearData(), o.setData("text/html", l.innerHTML), o.setData("text/plain", a)) : ex(t, l), i && t.dispatch(t.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
};
function tx(t) {
  return t.openStart == 0 && t.openEnd == 0 && t.content.childCount == 1 ? t.content.firstChild : null;
}
function nx(t, e) {
  if (!t.dom.parentNode)
    return;
  let n = t.input.shiftKey || t.state.selection.$from.parent.type.spec.code, r = t.dom.parentNode.appendChild(document.createElement(n ? "textarea" : "div"));
  n || (r.contentEditable = "true"), r.style.cssText = "position: fixed; left: -10000px; top: 10px", r.focus();
  let i = t.input.shiftKey && t.input.lastKeyCode != 45;
  setTimeout(() => {
    t.focus(), r.parentNode && r.parentNode.removeChild(r), n ? zi(t, r.value, null, i, e) : zi(t, r.textContent, r.innerHTML, i, e);
  }, 50);
}
function zi(t, e, n, r, i) {
  let o = ap(t, e, n, r, t.state.selection.$from);
  if (t.someProp("handlePaste", (a) => a(t, i, o || P.empty)))
    return !0;
  if (!o)
    return !1;
  let s = tx(o), l = s ? t.state.tr.replaceSelectionWith(s, r) : t.state.tr.replaceSelection(o);
  return t.dispatch(l.scrollIntoView().setMeta("paste", !0).setMeta("uiEvent", "paste")), !0;
}
function kp(t) {
  let e = t.getData("text/plain") || t.getData("Text");
  if (e)
    return e;
  let n = t.getData("text/uri-list");
  return n ? n.replace(/\r?\n/g, " ") : "";
}
ze.paste = (t, e) => {
  let n = e;
  if (t.composing && !Ut)
    return;
  let r = Pi ? null : n.clipboardData, i = t.input.shiftKey && t.input.lastKeyCode != 45;
  r && zi(t, kp(r), r.getData("text/html"), i, n) ? n.preventDefault() : nx(t, n);
};
class bp {
  constructor(e, n, r) {
    this.slice = e, this.move = n, this.node = r;
  }
}
const rx = at ? "altKey" : "ctrlKey";
function wp(t, e) {
  let n;
  return t.someProp("dragCopies", (r) => {
    n = n || r(e);
  }), n != null ? !n : !e[rx];
}
Pe.dragstart = (t, e) => {
  let n = e, r = t.input.mouseDown;
  if (r && r.done(), !n.dataTransfer)
    return;
  let i = t.state.selection, o = i.empty ? null : t.posAtCoords(Os(n)), s;
  if (!(o && o.pos >= i.from && o.pos <= (i instanceof K ? i.to - 1 : i.to))) {
    if (r && r.mightDrag)
      s = K.create(t.state.doc, r.mightDrag.pos);
    else if (n.target && n.target.nodeType == 1) {
      let f = t.docView.nearestDesc(n.target, !0);
      f && f.node.type.spec.draggable && f != t.docView && (s = K.create(t.state.doc, f.posBefore));
    }
  }
  let l = (s || t.state.selection).content(), { dom: a, text: u, slice: c } = Ha(t, l);
  (!n.dataTransfer.files.length || !Ne || Wd > 120) && n.dataTransfer.clearData(), n.dataTransfer.setData(Pi ? "Text" : "text/html", a.innerHTML), n.dataTransfer.effectAllowed = "copyMove", Pi || n.dataTransfer.setData("text/plain", u), t.dragging = new bp(c, wp(t, n), s);
};
Pe.dragend = (t) => {
  let e = t.dragging;
  window.setTimeout(() => {
    t.dragging == e && (t.dragging = null);
  }, 50);
};
ze.dragover = ze.dragenter = (t, e) => e.preventDefault();
ze.drop = (t, e) => {
  try {
    ix(t, e, t.dragging);
  } finally {
    t.dragging = null;
  }
};
function ix(t, e, n) {
  if (!e.dataTransfer)
    return;
  let r = t.posAtCoords(Os(e));
  if (!r)
    return;
  let i = t.state.doc.resolve(r.pos), o = n && n.slice;
  o ? t.someProp("transformPasted", (h) => {
    o = h(o, t, !1);
  }) : o = ap(t, kp(e.dataTransfer), Pi ? null : e.dataTransfer.getData("text/html"), !1, i);
  let s = !!(n && wp(t, e));
  if (t.someProp("handleDrop", (h) => h(t, e, o || P.empty, s))) {
    e.preventDefault();
    return;
  }
  if (!o)
    return;
  e.preventDefault();
  let l = o ? Vb(t.state.doc, i.pos, o) : i.pos;
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
  if (c && K.isSelectable(o.content.firstChild) && d.nodeAfter && d.nodeAfter.sameMarkup(o.content.firstChild))
    a.setSelection(new K(d));
  else {
    let h = a.mapping.map(l);
    a.mapping.maps[a.mapping.maps.length - 1].forEach((p, m, y, g) => h = g), a.setSelection(Va(t, d, a.doc.resolve(h)));
  }
  t.focus(), t.dispatch(a.setMeta("uiEvent", "drop"));
}
Pe.focus = (t) => {
  t.input.lastFocus = Date.now(), t.focused || (t.domObserver.stop(), t.dom.classList.add("ProseMirror-focused"), t.domObserver.start(), t.focused = !0, setTimeout(() => {
    t.docView && t.hasFocus() && !t.domObserver.currentSelection.eq(t.domSelectionRange()) && Gt(t);
  }, 20));
};
Pe.blur = (t, e) => {
  let n = e;
  t.focused && (t.domObserver.stop(), t.dom.classList.remove("ProseMirror-focused"), t.domObserver.start(), n.relatedTarget && t.dom.contains(n.relatedTarget) && t.domObserver.currentSelection.clear(), t.focused = !1);
};
Pe.beforeinput = (t, e) => {
  if (Ne && Ut && e.inputType == "deleteContentBackward") {
    t.domObserver.flushSoon();
    let { domChangeCount: r } = t.input;
    setTimeout(() => {
      if (t.input.domChangeCount != r || (t.dom.blur(), t.focus(), t.someProp("handleKeyDown", (o) => o(t, Rn(8, "Backspace")))))
        return;
      let { $cursor: i } = t.state.selection;
      i && i.pos > 0 && t.dispatch(t.state.tr.delete(i.pos - 1, i.pos).scrollIntoView());
    }, 50);
  }
};
for (let t in ze)
  Pe[t] = ze[t];
function Bi(t, e) {
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
class cs {
  constructor(e, n) {
    this.toDOM = e, this.spec = n || Wn, this.side = this.spec.side || 0;
  }
  map(e, n, r, i) {
    let { pos: o, deleted: s } = e.mapResult(n.from + i, this.side < 0 ? -1 : 1);
    return s ? null : new Te(o - r, o - r, this);
  }
  valid() {
    return !0;
  }
  eq(e) {
    return this == e || e instanceof cs && (this.spec.key && this.spec.key == e.spec.key || this.toDOM == e.toDOM && Bi(this.spec, e.spec));
  }
  destroy(e) {
    this.spec.destroy && this.spec.destroy(e);
  }
}
class xn {
  constructor(e, n) {
    this.attrs = e, this.spec = n || Wn;
  }
  map(e, n, r, i) {
    let o = e.map(n.from + i, this.spec.inclusiveStart ? -1 : 1) - r, s = e.map(n.to + i, this.spec.inclusiveEnd ? 1 : -1) - r;
    return o >= s ? null : new Te(o, s, this);
  }
  valid(e, n) {
    return n.from < n.to;
  }
  eq(e) {
    return this == e || e instanceof xn && Bi(this.attrs, e.attrs) && Bi(this.spec, e.spec);
  }
  static is(e) {
    return e.type instanceof xn;
  }
  destroy() {
  }
}
class Ka {
  constructor(e, n) {
    this.attrs = e, this.spec = n || Wn;
  }
  map(e, n, r, i) {
    let o = e.mapResult(n.from + i, 1);
    if (o.deleted)
      return null;
    let s = e.mapResult(n.to + i, -1);
    return s.deleted || s.pos <= o.pos ? null : new Te(o.pos - r, s.pos - r, this);
  }
  valid(e, n) {
    let { index: r, offset: i } = e.content.findIndex(n.from), o;
    return i == n.from && !(o = e.child(r)).isText && i + o.nodeSize == n.to;
  }
  eq(e) {
    return this == e || e instanceof Ka && Bi(this.attrs, e.attrs) && Bi(this.spec, e.spec);
  }
  destroy() {
  }
}
class Te {
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
    return new Te(e, n, this.type);
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
    return new Te(e, e, new cs(n, r));
  }
  /**
  Creates an inline decoration, which adds the given attributes to
  each inline node between `from` and `to`.
  */
  static inline(e, n, r, i) {
    return new Te(e, n, new xn(r, i));
  }
  /**
  Creates a node decoration. `from` and `to` should point precisely
  before and after a node in the document. That node, and only that
  node, will receive the given attributes.
  */
  static node(e, n, r, i) {
    return new Te(e, n, new Ka(r, i));
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
    return this.type instanceof xn;
  }
  /**
  @internal
  */
  get widget() {
    return this.type instanceof cs;
  }
}
const pr = [], Wn = {};
class ce {
  /**
  @internal
  */
  constructor(e, n) {
    this.local = e.length ? e : pr, this.children = n.length ? n : pr;
  }
  /**
  Create a set of decorations, using the structure of the given
  document. This will consume (modify) the `decorations` array, so
  you must make a copy if you want need to preserve that.
  */
  static create(e, n) {
    return n.length ? fs(n, e, 0, Wn) : Ae;
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
    return this == Ae || e.maps.length == 0 ? this : this.mapInner(e, n, 0, 0, r || Wn);
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
    return this.children.length ? ox(this.children, s || [], e, n, r, i, o) : s ? new ce(s.sort(Kn), pr) : Ae;
  }
  /**
  Add the given array of decorations to the ones in the set,
  producing a new set. Consumes the `decorations` array. Needs
  access to the current document to create the appropriate tree
  structure.
  */
  add(e, n) {
    return n.length ? this == Ae ? ce.create(e, n) : this.addInner(e, n, 0) : this;
  }
  addInner(e, n, r) {
    let i, o = 0;
    e.forEach((l, a) => {
      let u = a + r, c;
      if (c = Cp(n, l, u)) {
        for (i || (i = this.children.slice()); o < i.length && i[o] < a; )
          o += 3;
        i[o] == a ? i[o + 2] = i[o + 2].addInner(l, c, u + 1) : i.splice(o, 0, a, a + l.nodeSize, fs(c, l, u + 1, Wn)), o += 3;
      }
    });
    let s = xp(o ? Sp(n) : n, -r);
    for (let l = 0; l < s.length; l++)
      s[l].type.valid(e, s[l]) || s.splice(l--, 1);
    return new ce(s.length ? this.local.concat(s).sort(Kn) : this.local, i || this.children);
  }
  /**
  Create a new set that contains the decorations in this set, minus
  the ones in the given array.
  */
  remove(e) {
    return e.length == 0 || this == Ae ? this : this.removeInner(e, 0);
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
      u != Ae ? r[o + 2] = u : (r.splice(o, 3), o -= 3);
    }
    if (i.length) {
      for (let o = 0, s; o < e.length; o++)
        if (s = e[o])
          for (let l = 0; l < i.length; l++)
            i[l].eq(s, n) && (i == this.local && (i = this.local.slice()), i.splice(l--, 1));
    }
    return r == this.children && i == this.local ? this : i.length || r.length ? new ce(i, r) : Ae;
  }
  forChild(e, n) {
    if (this == Ae)
      return this;
    if (n.isLeaf)
      return ce.empty;
    let r, i;
    for (let l = 0; l < this.children.length; l += 3)
      if (this.children[l] >= e) {
        this.children[l] == e && (r = this.children[l + 2]);
        break;
      }
    let o = e + 1, s = o + n.content.size;
    for (let l = 0; l < this.local.length; l++) {
      let a = this.local[l];
      if (a.from < s && a.to > o && a.type instanceof xn) {
        let u = Math.max(o, a.from) - o, c = Math.min(s, a.to) - o;
        u < c && (i || (i = [])).push(a.copy(u, c));
      }
    }
    if (i) {
      let l = new ce(i.sort(Kn), pr);
      return r ? new cn([l, r]) : l;
    }
    return r || Ae;
  }
  /**
  @internal
  */
  eq(e) {
    if (this == e)
      return !0;
    if (!(e instanceof ce) || this.local.length != e.local.length || this.children.length != e.children.length)
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
    return Ua(this.localsInner(e));
  }
  /**
  @internal
  */
  localsInner(e) {
    if (this == Ae)
      return pr;
    if (e.inlineContent || !this.local.some(xn.is))
      return this.local;
    let n = [];
    for (let r = 0; r < this.local.length; r++)
      this.local[r].type instanceof xn || n.push(this.local[r]);
    return n;
  }
  forEachSet(e) {
    e(this);
  }
}
ce.empty = new ce([], []);
ce.removeOverlap = Ua;
const Ae = ce.empty;
class cn {
  constructor(e) {
    this.members = e;
  }
  map(e, n) {
    const r = this.members.map((i) => i.map(e, n, Wn));
    return cn.from(r);
  }
  forChild(e, n) {
    if (n.isLeaf)
      return ce.empty;
    let r = [];
    for (let i = 0; i < this.members.length; i++) {
      let o = this.members[i].forChild(e, n);
      o != Ae && (o instanceof cn ? r = r.concat(o.members) : r.push(o));
    }
    return cn.from(r);
  }
  eq(e) {
    if (!(e instanceof cn) || e.members.length != this.members.length)
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
    return n ? Ua(r ? n : n.sort(Kn)) : pr;
  }
  // Create a group for the given array of decoration sets, or return
  // a single set when possible.
  static from(e) {
    switch (e.length) {
      case 0:
        return Ae;
      case 1:
        return e[0];
      default:
        return new cn(e.every((n) => n instanceof ce) ? e : e.reduce((n, r) => n.concat(r instanceof ce ? r : r.members), []));
    }
  }
  forEachSet(e) {
    for (let n = 0; n < this.members.length; n++)
      this.members[n].forEachSet(e);
  }
}
function ox(t, e, n, r, i, o, s) {
  let l = t.slice();
  for (let u = 0, c = o; u < n.maps.length; u++) {
    let f = 0;
    n.maps[u].forEach((d, h, p, m) => {
      let y = m - p - (h - d);
      for (let g = 0; g < l.length; g += 3) {
        let E = l[g + 1];
        if (E < 0 || d > E + c - f)
          continue;
        let T = l[g] + c - f;
        h >= T ? l[g + 1] = d <= T ? -2 : -1 : d >= c && y && (l[g] += y, l[g + 1] += y);
      }
      f += y;
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
      let d = n.map(t[u + 1] + o, -1), h = d - i, { index: p, offset: m } = r.content.findIndex(f), y = r.maybeChild(p);
      if (y && m == f && m + y.nodeSize == h) {
        let g = l[u + 2].mapInner(n, y, c + 1, t[u] + o + 1, s);
        g != Ae ? (l[u] = f, l[u + 1] = h, l[u + 2] = g) : (l[u + 1] = -2, a = !0);
      } else
        a = !0;
    }
  if (a) {
    let u = sx(l, t, e, n, i, o, s), c = fs(u, r, 0, s);
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
  return new ce(e.sort(Kn), l);
}
function xp(t, e) {
  if (!e || !t.length)
    return t;
  let n = [];
  for (let r = 0; r < t.length; r++) {
    let i = t[r];
    n.push(new Te(i.from + e, i.to + e, i.type));
  }
  return n;
}
function sx(t, e, n, r, i, o, s) {
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
function Cp(t, e, n) {
  if (e.isLeaf)
    return null;
  let r = n + e.nodeSize, i = null;
  for (let o = 0, s; o < t.length; o++)
    (s = t[o]) && s.from > n && s.to < r && ((i || (i = [])).push(s), t[o] = null);
  return i;
}
function Sp(t) {
  let e = [];
  for (let n = 0; n < t.length; n++)
    t[n] != null && e.push(t[n]);
  return e;
}
function fs(t, e, n, r) {
  let i = [], o = !1;
  e.forEach((l, a) => {
    let u = Cp(t, l, a + n);
    if (u) {
      o = !0;
      let c = fs(u, l, n + a + 1, r);
      c != Ae && i.push(a, a + l.nodeSize, c);
    }
  });
  let s = xp(o ? Sp(t) : t, -n).sort(Kn);
  for (let l = 0; l < s.length; l++)
    s[l].type.valid(e, s[l]) || (r.onRemove && r.onRemove(s[l].spec), s.splice(l--, 1));
  return s.length || i.length ? new ce(s, i) : Ae;
}
function Kn(t, e) {
  return t.from - e.from || t.to - e.to;
}
function Ua(t) {
  let e = t;
  for (let n = 0; n < e.length - 1; n++) {
    let r = e[n];
    if (r.from != r.to)
      for (let i = n + 1; i < e.length; i++) {
        let o = e[i];
        if (o.from == r.from) {
          o.to != r.to && (e == t && (e = t.slice()), e[i] = o.copy(o.from, r.to), vf(e, i + 1, o.copy(r.to, o.to)));
          continue;
        } else {
          o.from < r.to && (e == t && (e = t.slice()), e[n] = r.copy(r.from, o.from), vf(e, i, r.copy(o.from, r.to)));
          break;
        }
      }
  }
  return e;
}
function vf(t, e, n) {
  for (; e < t.length && Kn(n, t[e]) > 0; )
    e++;
  t.splice(e, 0, n);
}
function ul(t) {
  let e = [];
  return t.someProp("decorations", (n) => {
    let r = n(t.state);
    r && r != Ae && e.push(r);
  }), t.cursorWrapper && e.push(ce.create(t.state.doc, [t.cursorWrapper.deco])), cn.from(e);
}
const lx = {
  childList: !0,
  characterData: !0,
  characterDataOldValue: !0,
  attributes: !0,
  attributeOldValue: !0,
  subtree: !0
}, ax = je && bn <= 11;
class ux {
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
class cx {
  constructor(e, n) {
    this.view = e, this.handleDOMChange = n, this.queue = [], this.flushingSoon = -1, this.observer = null, this.currentSelection = new ux(), this.onCharData = null, this.suppressingSelectionUpdates = !1, this.lastChangedTextNode = null, this.observer = window.MutationObserver && new window.MutationObserver((r) => {
      for (let i = 0; i < r.length; i++)
        this.queue.push(r[i]);
      je && bn <= 11 && r.some((i) => i.type == "childList" && i.removedNodes.length || i.type == "characterData" && i.oldValue.length > i.target.nodeValue.length) ? this.flushSoon() : Oe && e.composing && r.some((i) => i.type == "childList" && i.target.nodeName == "TR") ? (e.input.badSafariComposition = !0, this.flushSoon()) : this.flush();
    }), ax && (this.onCharData = (r) => {
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
    this.observer && (this.observer.takeRecords(), this.observer.observe(this.view.dom, lx)), this.onCharData && this.view.dom.addEventListener("DOMCharacterDataModified", this.onCharData), this.connectSelection();
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
    if (bf(this.view)) {
      if (this.suppressingSelectionUpdates)
        return Gt(this.view);
      if (je && bn <= 11 && !this.view.state.selection.empty) {
        let e = this.view.domSelectionRange();
        if (e.focusNode && ir(e.focusNode, e.focusOffset, e.anchorNode, e.anchorOffset))
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
    for (let o = e.focusNode; o; o = Ur(o))
      n.add(o);
    for (let o = e.anchorNode; o; o = Ur(o))
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
    let r = e.domSelectionRange(), i = !this.suppressingSelectionUpdates && !this.currentSelection.eq(r) && bf(e) && !this.ignoreSelectionChange(r), o = -1, s = -1, l = !1, a = [];
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
    } else if (ft && a.length) {
      let c = a.filter((f) => f.nodeName == "BR");
      if (c.length == 2) {
        let [f, d] = c;
        f.parentNode && f.parentNode.parentNode == d.parentNode ? d.remove() : f.remove();
      } else {
        let { focusNode: f } = this.currentSelection;
        for (let d of c) {
          let h = d.parentNode;
          h && h.nodeName == "LI" && (!f || dx(e, f) != h) && d.remove();
        }
      }
    }
    let u = null;
    o < 0 && i && e.input.lastFocus > Date.now() - 200 && Math.max(e.input.lastTouch, e.input.lastClick.time) < Date.now() - 300 && As(r) && (u = _a(e)) && u.eq(J.near(e.state.doc.resolve(0), 1)) ? (e.input.lastFocus = 0, Gt(e), this.currentSelection.set(r), e.scrollToSelection()) : (o > -1 || i) && (o > -1 && (e.docView.markDirty(o, s), fx(e)), e.input.badSafariComposition && (e.input.badSafariComposition = !1, px(e, a)), this.handleDOMChange(o, s, l, a), e.docView && e.docView.dirty ? e.updateState(e.state) : this.currentSelection.eq(r) || Gt(e), this.currentSelection.set(r));
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
      if (je && bn <= 11 && e.addedNodes.length)
        for (let c = 0; c < e.addedNodes.length; c++) {
          let { previousSibling: f, nextSibling: d } = e.addedNodes[c];
          (!f || Array.prototype.indexOf.call(e.addedNodes, f) < 0) && (i = f), (!d || Array.prototype.indexOf.call(e.addedNodes, d) < 0) && (o = d);
        }
      let s = i && i.parentNode == e.target ? Me(i) + 1 : 0, l = r.localPosFromDOM(e.target, s, -1), a = o && o.parentNode == e.target ? Me(o) : e.target.childNodes.length, u = r.localPosFromDOM(e.target, a, 1);
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
let If = /* @__PURE__ */ new WeakMap(), Af = !1;
function fx(t) {
  if (!If.has(t) && (If.set(t, null), ["normal", "nowrap", "pre-line"].indexOf(getComputedStyle(t.dom).whiteSpace) !== -1)) {
    if (t.requiresGeckoHackNode = ft, Af)
      return;
    console.warn("ProseMirror expects the CSS white-space property to be set, preferably to 'pre-wrap'. It is recommended to load style/prosemirror.css from the prosemirror-view package."), Af = !0;
  }
}
function Ef(t, e) {
  let n = e.startContainer, r = e.startOffset, i = e.endContainer, o = e.endOffset, s = t.domAtPos(t.state.selection.anchor);
  return ir(s.node, s.offset, i, o) && ([n, r, i, o] = [i, o, n, r]), { anchorNode: n, anchorOffset: r, focusNode: i, focusOffset: o };
}
function hx(t, e) {
  if (e.getComposedRanges) {
    let i = e.getComposedRanges(t.root)[0];
    if (i)
      return Ef(t, i);
  }
  let n;
  function r(i) {
    i.preventDefault(), i.stopImmediatePropagation(), n = i.getTargetRanges()[0];
  }
  return t.dom.addEventListener("beforeinput", r, !0), document.execCommand("indent"), t.dom.removeEventListener("beforeinput", r, !0), n ? Ef(t, n) : null;
}
function dx(t, e) {
  for (let n = e.parentNode; n && n != t.dom; n = n.parentNode) {
    let r = t.docView.nearestDesc(n, !0);
    if (r && r.node.isBlock)
      return n;
  }
  return null;
}
function px(t, e) {
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
function mx(t, e, n) {
  let { node: r, fromOffset: i, toOffset: o, from: s, to: l } = t.docView.parseRange(e, n), a = t.domSelectionRange(), u, c = a.anchorNode;
  if (c && t.dom.contains(c.nodeType == 1 ? c : c.parentNode) && (u = [{ node: c, offset: a.anchorOffset }], As(a) || u.push({ node: a.focusNode, offset: a.focusOffset })), Ne && t.input.lastKeyCode === 8)
    for (let y = o; y > i; y--) {
      let g = r.childNodes[y - 1], E = g.pmViewDesc;
      if (g.nodeName == "BR" && !E) {
        o = y;
        break;
      }
      if (!E || E.size)
        break;
    }
  let f = t.state.doc, d = t.someProp("domParser") || qr.fromSchema(t.state.schema), h = f.resolve(s), p = null, m = d.parse(r, {
    topNode: h.parent,
    topMatch: h.parent.contentMatchAt(h.index()),
    topOpen: !0,
    from: i,
    to: o,
    preserveWhitespace: h.parent.type.whitespace == "pre" ? "full" : !0,
    findPositions: u,
    ruleFromNode: gx,
    context: h
  });
  if (u && u[0].pos != null) {
    let y = u[0].pos, g = u[1] && u[1].pos;
    g == null && (g = y), p = { anchor: y + s, head: g + s };
  }
  return { doc: m, sel: p, from: s, to: l };
}
function gx(t) {
  let e = t.pmViewDesc;
  if (e)
    return e.parseRule();
  if (t.nodeName == "BR" && t.parentNode) {
    if (Oe && /^(ul|ol)$/i.test(t.parentNode.nodeName)) {
      let n = document.createElement("div");
      return n.appendChild(document.createElement("li")), { skip: n };
    } else if (t.parentNode.lastChild == t || Oe && /^(tr|table)$/i.test(t.parentNode.nodeName))
      return { ignore: !0 };
  } else if (t.nodeName == "IMG" && t.getAttribute("mark-placeholder"))
    return { ignore: !0 };
  return null;
}
const yx = /^(a|abbr|acronym|b|bd[io]|big|br|button|cite|code|data(list)?|del|dfn|em|i|img|ins|kbd|label|map|mark|meter|output|q|ruby|s|samp|small|span|strong|su[bp]|time|u|tt|var)$/i;
function kx(t, e, n, r, i) {
  let o = t.input.compositionPendingChanges || (t.composing ? t.input.compositionID : 0);
  if (t.input.compositionPendingChanges = 0, e < 0) {
    let D = t.input.lastSelectionTime > Date.now() - 50 ? t.input.lastSelectionOrigin : null, V = _a(t, D);
    if (V && !t.state.selection.eq(V)) {
      if (Ne && Ut && t.input.lastKeyCode === 13 && Date.now() - 100 < t.input.lastKeyCodeTime && t.someProp("handleKeyDown", (N) => N(t, Rn(13, "Enter"))))
        return;
      let q = t.state.tr.setSelection(V);
      D == "pointer" ? q.setMeta("pointer", !0) : D == "key" && q.scrollIntoView(), o && q.setMeta("composition", o), t.dispatch(q);
    }
    return;
  }
  let s = t.state.doc.resolve(e), l = s.sharedDepth(n);
  e = s.before(l + 1), n = t.state.doc.resolve(n).after(l + 1);
  let a = t.state.selection, u = mx(t, e, n), c = t.state.doc, f = c.slice(u.from, u.to), d, h;
  t.input.lastKeyCode === 8 && Date.now() - 100 < t.input.lastKeyCodeTime ? (d = t.state.selection.to, h = "end") : (d = t.state.selection.from, h = "start"), t.input.lastKeyCode = null;
  let p = xx(f.content, u.doc.content, u.from, d, h);
  if (p && t.input.domChangeCount++, (Jr && t.input.lastIOSEnter > Date.now() - 225 || Ut) && i.some((D) => D.nodeType == 1 && !yx.test(D.nodeName)) && (!p || p.endA >= p.endB) && t.someProp("handleKeyDown", (D) => D(t, Rn(13, "Enter")))) {
    t.input.lastIOSEnter = 0;
    return;
  }
  if (!p)
    if (r && a instanceof G && !a.empty && a.$head.sameParent(a.$anchor) && !t.composing && !(u.sel && u.sel.anchor != u.sel.head))
      p = { start: a.from, endA: a.to, endB: a.to };
    else {
      if (u.sel) {
        let D = Of(t, t.state.doc, u.sel);
        if (D && !D.eq(t.state.selection)) {
          let V = t.state.tr.setSelection(D);
          o && V.setMeta("composition", o), t.dispatch(V);
        }
      }
      return;
    }
  t.state.selection.from < t.state.selection.to && p.start == p.endB && t.state.selection instanceof G && (p.start > t.state.selection.from && p.start <= t.state.selection.from + 2 && t.state.selection.from >= u.from ? p.start = t.state.selection.from : p.endA < t.state.selection.to && p.endA >= t.state.selection.to - 2 && t.state.selection.to <= u.to && (p.endB += t.state.selection.to - p.endA, p.endA = t.state.selection.to)), je && bn <= 11 && p.endB == p.start + 1 && p.endA == p.start && p.start > u.from && u.doc.textBetween(p.start - u.from - 1, p.start - u.from + 1) == "  " && (p.start--, p.endA--, p.endB--);
  let m = u.doc.resolveNoCache(p.start - u.from), y = u.doc.resolveNoCache(p.endB - u.from), g = c.resolve(p.start), E = m.sameParent(y) && m.parent.inlineContent && g.end() >= p.endA;
  if ((Jr && t.input.lastIOSEnter > Date.now() - 225 && (!E || i.some((D) => D.nodeName == "DIV" || D.nodeName == "P")) || !E && m.pos < u.doc.content.size && (!m.sameParent(y) || !m.parent.inlineContent) && m.pos < y.pos && !/\S/.test(u.doc.textBetween(m.pos, y.pos, "", ""))) && t.someProp("handleKeyDown", (D) => D(t, Rn(13, "Enter")))) {
    t.input.lastIOSEnter = 0;
    return;
  }
  if (t.state.selection.anchor > p.start && wx(c, p.start, p.endA, m, y) && t.someProp("handleKeyDown", (D) => D(t, Rn(8, "Backspace")))) {
    Ut && Ne && t.domObserver.suppressSelectionUpdates();
    return;
  }
  Ne && p.endB == p.start && (t.input.lastChromeDelete = Date.now()), Ut && !E && m.start() != y.start() && y.parentOffset == 0 && m.depth == y.depth && u.sel && u.sel.anchor == u.sel.head && u.sel.head == p.endA && (p.endB -= 2, y = u.doc.resolveNoCache(p.endB - u.from), setTimeout(() => {
    t.someProp("handleKeyDown", function(D) {
      return D(t, Rn(13, "Enter"));
    });
  }, 20));
  let T = p.start, B = p.endA, z = (D) => {
    let V = D || t.state.tr.replace(T, B, u.doc.slice(p.start - u.from, p.endB - u.from));
    if (u.sel) {
      let q = Of(t, V.doc, u.sel);
      q && !(Ne && t.composing && q.empty && (p.start != p.endB || t.input.lastChromeDelete < Date.now() - 100) && (q.head == T || q.head == V.mapping.map(B) - 1) || je && q.empty && q.head == T) && V.setSelection(q);
    }
    return o && V.setMeta("composition", o), V.scrollIntoView();
  }, S;
  if (E)
    if (m.pos == y.pos) {
      je && bn <= 11 && m.parentOffset == 0 && (t.domObserver.suppressSelectionUpdates(), setTimeout(() => Gt(t), 20));
      let D = z(t.state.tr.delete(T, B)), V = c.resolve(p.start).marksAcross(c.resolve(p.endA));
      V && D.ensureMarks(V), t.dispatch(D);
    } else if (
      // Adding or removing a mark
      p.endA == p.endB && (S = bx(m.parent.content.cut(m.parentOffset, y.parentOffset), g.parent.content.cut(g.parentOffset, p.endA - g.start())))
    ) {
      let D = z(t.state.tr);
      S.type == "add" ? D.addMark(T, B, S.mark) : D.removeMark(T, B, S.mark), t.dispatch(D);
    } else if (m.parent.child(m.index()).isText && m.index() == y.index() - (y.textOffset ? 0 : 1)) {
      let D = m.parent.textBetween(m.parentOffset, y.parentOffset), V = () => z(t.state.tr.insertText(D, T, B));
      t.someProp("handleTextInput", (q) => q(t, T, B, D, V)) || t.dispatch(V());
    } else
      t.dispatch(z());
  else
    t.dispatch(z());
}
function Of(t, e, n) {
  return Math.max(n.anchor, n.head) > e.content.size ? null : Va(t, e.resolve(n.anchor), e.resolve(n.head));
}
function bx(t, e) {
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
function wx(t, e, n, r, i) {
  if (
    // The content must have shrunk
    n - e <= i.pos - r.pos || // newEnd must point directly at or after the end of the block that newStart points into
    cl(r, !0, !1) < i.pos
  )
    return !1;
  let o = t.resolve(e);
  if (!r.parent.isTextblock) {
    let l = o.nodeAfter;
    return l != null && n == e + l.nodeSize;
  }
  if (o.parentOffset < o.parent.content.size || !o.parent.isTextblock)
    return !1;
  let s = t.resolve(cl(o, !0, !0));
  return !s.parent.isTextblock || s.pos > n || cl(s, !0, !1) < n ? !1 : r.parent.content.cut(r.parentOffset).eq(s.parent.content);
}
function cl(t, e, n) {
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
function xx(t, e, n, r, i) {
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
    o -= a, o && o < e.size && Df(e.textBetween(o - 1, o + 1)) && (o += a ? 1 : -1), l = o + (l - s), s = o;
  } else if (l < o) {
    let a = r <= o && r >= l ? o - r : 0;
    o -= a, o && o < t.size && Df(t.textBetween(o - 1, o + 1)) && (o += a ? 1 : -1), s = o + (s - l), l = o;
  }
  return { start: o, endA: s, endB: l };
}
function Df(t) {
  if (t.length != 2)
    return !1;
  let e = t.charCodeAt(0), n = t.charCodeAt(1);
  return e >= 56320 && e <= 57343 && n >= 55296 && n <= 56319;
}
class Mp {
  /**
  Create a view. `place` may be a DOM node that the editor should
  be appended to, a function that will place it into the document,
  or an object whose `mount` property holds the node to use as the
  document container. If it is `null`, the editor will not be
  added to the document.
  */
  constructor(e, n) {
    this._root = null, this.focused = !1, this.trackWrites = null, this.mounted = !1, this.markCursor = null, this.cursorWrapper = null, this.lastSelectedViewDesc = void 0, this.input = new Bw(), this.prevDirectPlugins = [], this.pluginViews = [], this.requiresGeckoHackNode = !1, this.dragging = null, this._props = n, this.state = n.state, this.directPlugins = n.plugins || [], this.directPlugins.forEach(Bf), this.dispatch = this.dispatch.bind(this), this.dom = e && e.mount || document.createElement("div"), e && (e.appendChild ? e.appendChild(this.dom) : typeof e == "function" ? e(this.dom) : e.mount && (this.mounted = !0)), this.editable = Pf(this), Lf(this), this.nodeViews = zf(this), this.docView = df(this.state.doc, Rf(this), ul(this), this.dom, this), this.domObserver = new cx(this, (r, i, o, s) => kx(this, r, i, o, s)), this.domObserver.start(), Fw(this), this.updatePluginViews();
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
    e.handleDOMEvents != this._props.handleDOMEvents && la(this);
    let n = this._props;
    this._props = e, e.plugins && (e.plugins.forEach(Bf), this.directPlugins = e.plugins), this.updateStateInner(e.state, n);
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
    e.storedMarks && this.composing && (yp(this), s = !0), this.state = e;
    let l = i.plugins != e.plugins || this._props.plugins != n.plugins;
    if (l || this._props.plugins != n.plugins || this._props.nodeViews != n.nodeViews) {
      let h = zf(this);
      Sx(h, this.nodeViews) && (this.nodeViews = h, o = !0);
    }
    (l || n.handleDOMEvents != this._props.handleDOMEvents) && la(this), this.editable = Pf(this), Lf(this);
    let a = ul(this), u = Rf(this), c = i.plugins != e.plugins && !i.doc.eq(e.doc) ? "reset" : e.scrollToSelection > i.scrollToSelection ? "to selection" : "preserve", f = o || !this.docView.matchesNode(e.doc, u, a);
    (f || !e.selection.eq(i.selection)) && (s = !0);
    let d = c == "preserve" && s && this.dom.style.overflowAnchor == null && X0(this);
    if (s) {
      this.domObserver.stop();
      let h = f && (je || Ne) && !this.composing && !i.selection.empty && !e.selection.empty && Cx(i.selection, e.selection);
      if (f) {
        let p = Ne ? this.trackWrites = this.domSelectionRange().focusNode : null;
        this.composing && (this.input.compositionNode = Xw(this)), (o || !this.docView.update(e.doc, u, a, this)) && (this.docView.updateOuterDeco(u), this.docView.destroy(), this.docView = df(e.doc, u, a, this.dom, this)), p && (!this.trackWrites || !this.dom.contains(this.trackWrites)) && (h = !0);
      }
      h || !(this.input.mouseDown && this.domObserver.currentSelection.eq(this.domSelectionRange()) && Cw(this)) ? Gt(this, h) : (op(this, e.selection), this.domObserver.setCurSelection()), this.domObserver.start();
    }
    this.updatePluginViews(i), !((r = this.dragging) === null || r === void 0) && r.node && !i.doc.eq(e.doc) && this.updateDraggedNode(this.dragging, i), c == "reset" ? this.dom.scrollTop = 0 : c == "to selection" ? this.scrollToSelection() : d && Z0(d);
  }
  /**
  @internal
  */
  scrollToSelection() {
    let e = this.domSelectionRange().focusNode;
    if (!(!e || !this.dom.contains(e.nodeType == 1 ? e : e.parentNode))) {
      if (!this.someProp("handleScrollToSelection", (n) => n(this))) if (this.state.selection instanceof K) {
        let n = this.docView.domAfterPos(this.state.selection.from);
        n.nodeType == 1 && lf(this, n.getBoundingClientRect(), e);
      } else
        lf(this, this.coordsAtPos(this.state.selection.head, 1), e);
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
    this.dragging = new bp(e.slice, e.move, i < 0 ? void 0 : K.create(this.state.doc, i));
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
    if (je) {
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
    this.domObserver.stop(), this.editable && ew(this.dom), Gt(this), this.domObserver.start();
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
    return ow(this, e);
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
    return Qd(this, e, n);
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
    return cw(this, n || this.state, e);
  }
  /**
  Run the editor's paste logic with the given HTML string. The
  `event`, if given, will be passed to the
  [`handlePaste`](https://prosemirror.net/docs/ref/#view.EditorProps.handlePaste) hook.
  */
  pasteHTML(e, n) {
    return zi(this, "", e, !1, n || new ClipboardEvent("paste"));
  }
  /**
  Run the editor's paste logic with the given plain-text input.
  */
  pasteText(e, n) {
    return zi(this, e, null, !0, n || new ClipboardEvent("paste"));
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
    return Ha(this, e);
  }
  /**
  Removes the editor from the DOM and destroys all [node
  views](https://prosemirror.net/docs/ref/#view.NodeView).
  */
  destroy() {
    this.docView && ($w(this), this.destroyPluginViews(), this.mounted ? (this.docView.update(this.state.doc, [], ul(this), this), this.dom.textContent = "") : this.dom.parentNode && this.dom.parentNode.removeChild(this.dom), this.docView.destroy(), this.docView = null, H0());
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
    return Vw(this, e);
  }
  /**
  @internal
  */
  domSelectionRange() {
    let e = this.domSelection();
    return e ? Oe && this.root.nodeType === 11 && U0(this.dom.ownerDocument) == this.dom && hx(this, e) || e : { focusNode: null, focusOffset: 0, anchorNode: null, anchorOffset: 0 };
  }
  /**
  @internal
  */
  domSelection() {
    return this.root.getSelection();
  }
}
Mp.prototype.dispatch = function(t) {
  let e = this._props.dispatchTransaction;
  e ? e.call(this, t) : this.updateState(this.state.apply(t));
};
function Rf(t) {
  let e = /* @__PURE__ */ Object.create(null);
  return e.class = "ProseMirror", e.contenteditable = String(t.editable), t.someProp("attributes", (n) => {
    if (typeof n == "function" && (n = n(t.state)), n)
      for (let r in n)
        r == "class" ? e.class += " " + n[r] : r == "style" ? e.style = (e.style ? e.style + ";" : "") + n[r] : !e[r] && r != "contenteditable" && r != "nodeName" && (e[r] = String(n[r]));
  }), e.translate || (e.translate = "no"), [Te.node(0, t.state.doc.content.size, e)];
}
function Lf(t) {
  if (t.markCursor) {
    let e = document.createElement("img");
    e.className = "ProseMirror-separator", e.setAttribute("mark-placeholder", "true"), e.setAttribute("alt", ""), t.cursorWrapper = { dom: e, deco: Te.widget(t.state.selection.from, e, { raw: !0, marks: t.markCursor }) };
  } else
    t.cursorWrapper = null;
}
function Pf(t) {
  return !t.someProp("editable", (e) => e(t.state) === !1);
}
function Cx(t, e) {
  let n = Math.min(t.$anchor.sharedDepth(t.head), e.$anchor.sharedDepth(e.head));
  return t.$anchor.start(n) != e.$anchor.start(n);
}
function zf(t) {
  let e = /* @__PURE__ */ Object.create(null);
  function n(r) {
    for (let i in r)
      Object.prototype.hasOwnProperty.call(e, i) || (e[i] = r[i]);
  }
  return t.someProp("nodeViews", n), t.someProp("markViews", n), e;
}
function Sx(t, e) {
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
function Bf(t) {
  if (t.spec.state || t.spec.filterTransaction || t.spec.appendTransaction)
    throw new RangeError("Plugins passed directly to the view must not have a state component");
}
function Xt(t, e) {
  return t.meta = {
    package: "@milkdown/core",
    group: "System",
    ...e
  }, t;
}
var Np = {
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
}, Ve = ee({}, "editorView"), mi = ee({}, "editorState"), fl = ee([], "initTimer"), Ff = ee({}, "editor"), Fi = ee([], "inputRules"), Qt = ee([], "prosePlugins"), $i = ee([], "remarkPlugins"), aa = ee([], "nodeView"), ua = ee([], "markView"), Un = ee(jl().use(zl).use(_l), "remark"), Si = ee({
  handlers: Np,
  encode: []
}, "remarkStringifyOptions"), Ho = Dt("ConfigReady");
function Mx(t) {
  const e = (n) => (n.record(Ho), async () => (await t(n), n.done(Ho), () => {
    n.clearTimer(Ho);
  }));
  return Xt(e, { displayName: "Config" }), e;
}
var Jn = Dt("InitReady");
function Nx(t) {
  const e = (n) => (n.inject(Ff, t).inject(Qt, []).inject($i, []).inject(Fi, []).inject(aa, []).inject(ua, []).inject(Si, {
    handlers: Np,
    encode: []
  }).inject(Un, jl().use(zl).use(_l)).inject(fl, [Ho]).record(Jn), async () => {
    await n.waitTimers(fl);
    const r = n.get(Si);
    return n.set(Un, jl().use(zl).use(_l, r)), n.done(Jn), () => {
      n.remove(Ff).remove(Qt).remove($i).remove(Fi).remove(aa).remove(ua).remove(Si).remove(Un).remove(fl).clearTimer(Jn);
    };
  });
  return Xt(e, { displayName: "Init" }), e;
}
var qe = Dt("SchemaReady"), hl = ee([], "schemaTimer"), Cn = ee({}, "schema"), Mi = ee([], "nodes"), Ni = ee([], "marks");
function $f(t) {
  var e;
  return {
    ...t,
    parseDOM: (e = t.parseDOM) == null ? void 0 : e.map((n) => ({
      priority: t.priority,
      ...n
    }))
  };
}
var Tp = (t) => (t.inject(Cn, {}).inject(Mi, []).inject(Ni, []).inject(hl, [Jn]).record(qe), async () => {
  await t.waitTimers(hl);
  const e = t.get(Un), n = t.get($i).reduce((i, o) => i.use(o.plugin, o.options), e);
  t.set(Un, n);
  const r = new gb({
    nodes: Object.fromEntries(t.get(Mi).map(([i, o]) => [i, $f(o)])),
    marks: Object.fromEntries(t.get(Ni).map(([i, o]) => [i, $f(o)]))
  });
  return t.set(Cn, r), t.done(qe), () => {
    t.remove(Cn).remove(Mi).remove(Ni).remove(hl).clearTimer(qe);
  };
});
Xt(Tp, { displayName: "Schema" });
var Fn, lt, gh, vp = (gh = class {
  constructor() {
    F(this, Fn);
    F(this, lt);
    R(this, Fn, new bh()), R(this, lt, null), this.setCtx = (t) => {
      R(this, lt, t);
    }, this.chain = () => {
      if (C(this, lt) == null) throw Fs();
      const t = C(this, lt), e = [], n = this.get.bind(this), r = {
        run: () => {
          const o = Zr(...e), s = t.get(Ve);
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
    return C(this, lt);
  }
  create(t, e) {
    const n = t.create(C(this, Fn).sliceMap);
    return n.set(e), n;
  }
  get(t) {
    return C(this, Fn).get(t).get();
  }
  remove(t) {
    return C(this, Fn).remove(t);
  }
  call(t, e) {
    if (C(this, lt) == null) throw Fs();
    const n = this.get(t)(e), r = C(this, lt).get(Ve);
    return n(r.state, r.dispatch, r);
  }
  inline(t) {
    if (C(this, lt) == null) throw Fs();
    const e = C(this, lt).get(Ve);
    return t(e.state, e.dispatch, e);
  }
}, Fn = new WeakMap(), lt = new WeakMap(), gh);
function Tx(t = "cmdKey") {
  return ee(() => () => !1, t);
}
var ie = ee(new vp(), "commands"), dl = ee([qe], "commandsTimer"), Ti = Dt("CommandsReady"), Ip = (t) => {
  const e = new vp();
  return e.setCtx(t), t.inject(ie, e).inject(dl, [qe]).record(Ti), async () => (await t.waitTimers(dl), t.done(Ti), () => {
    t.remove(ie).remove(dl).clearTimer(Ti);
  });
};
Xt(Ip, { displayName: "Commands" });
function vx(t) {
  return t.Backspace = Zr(g0, Ra, Qb, Od), t;
}
var $n, $e, yh, Ap = (yh = class {
  constructor() {
    F(this, $n);
    F(this, $e);
    R(this, $n, null), R(this, $e, []), this.setCtx = (t) => {
      R(this, $n, t);
    }, this.add = (t) => (C(this, $e).push(t), () => {
      R(this, $e, C(this, $e).filter((e) => e !== t));
    }), this.addObjectKeymap = (t) => {
      const e = [];
      return Object.entries(t).forEach(([n, r]) => {
        if (typeof r == "function") {
          const i = {
            key: n,
            onRun: () => r
          };
          C(this, $e).push(i), e.push(() => {
            R(this, $e, C(this, $e).filter((o) => o !== i));
          });
        } else
          C(this, $e).push(r), e.push(() => {
            R(this, $e, C(this, $e).filter((i) => i !== r));
          });
      }), () => {
        e.forEach((n) => n());
      };
    }, this.addBaseKeymap = () => {
      const t = vx(p0);
      return this.addObjectKeymap(t);
    }, this.build = () => {
      const t = {};
      return C(this, $e).forEach((e) => {
        t[e.key] = [...t[e.key] || [], e];
      }), Object.fromEntries(Object.entries(t).map(([e, n]) => {
        const r = n.sort((o, s) => (s.priority ?? 50) - (o.priority ?? 50));
        return [e, (o, s, l) => {
          const a = C(this, $n);
          if (a == null) throw bs();
          return Zr(...r.map((u) => u.onRun(a)))(o, s, l);
        }];
      }));
    };
  }
  get ctx() {
    return C(this, $n);
  }
}, $n = new WeakMap(), $e = new WeakMap(), yh), hs = ee(new Ap(), "keymap"), pl = ee([qe], "keymapTimer"), vi = Dt("KeymapReady"), Ix = (t) => {
  const e = new Ap();
  return e.setCtx(t), t.inject(hs, e).inject(pl, [qe]).record(vi), async () => (await t.waitTimers(pl), t.done(vi), () => {
    t.remove(hs).remove(pl).clearTimer(vi);
  });
}, jo = Dt("ParserReady"), Ep = () => {
  throw bs();
}, qo = ee(Ep, "parser"), ml = ee([], "parserTimer"), Op = (t) => (t.inject(qo, Ep).inject(ml, [qe]).record(jo), async () => {
  await t.waitTimers(ml);
  const e = t.get(Un), n = t.get(Cn);
  return t.set(qo, $0.create(n, e)), t.done(jo), () => {
    t.remove(qo).remove(ml).clearTimer(jo);
  };
});
Xt(Op, { displayName: "Parser" });
var Ii = Dt("SerializerReady"), gl = ee([], "serializerTimer"), Dp = () => {
  throw bs();
}, Ai = ee(Dp, "serializer"), Rp = (t) => (t.inject(Ai, Dp).inject(gl, [qe]).record(Ii), async () => {
  await t.waitTimers(gl);
  const e = t.get(Un), n = t.get(Cn);
  return t.set(Ai, V0.create(n, e)), t.done(Ii), () => {
    t.remove(Ai).remove(gl).clearTimer(Ii);
  };
});
Xt(Rp, { displayName: "Serializer" });
var Wo = ee("", "defaultValue"), yl = ee((t) => t, "stateOptions"), kl = ee([], "editorStateTimer"), Ko = Dt("EditorStateReady");
function Ax(t, e, n) {
  if (typeof t == "string") return e(t);
  if (t.type === "html") return qr.fromSchema(n).parse(t.dom);
  if (t.type === "json") return Jt.fromJSON(n, t.value);
  throw dg(t);
}
var Ex = new Re("MILKDOWN_STATE_TRACKER"), Lp = (t) => (t.inject(Wo, "").inject(mi, {}).inject(yl, (e) => e).inject(kl, [
  jo,
  Ii,
  Ti,
  vi
]).record(Ko), async () => {
  await t.waitTimers(kl);
  const e = t.get(Cn), n = t.get(qo), r = t.get(Fi), i = t.get(yl), o = t.get(Qt), s = Ax(t.get(Wo), n, e), l = t.get(hs), a = l.addBaseKeymap(), u = [
    ...o,
    new Ie({
      key: Ex,
      state: {
        init: () => {
        },
        apply: (d, h, p, m) => {
          t.set(mi, m);
        }
      }
    }),
    M0({ rules: r }),
    $d(l.build())
  ];
  t.set(Qt, u);
  const c = i({
    schema: e,
    doc: s,
    plugins: u
  }), f = kr.create(c);
  return t.set(mi, f), t.done(Ko), () => {
    a(), t.remove(Wo).remove(mi).remove(yl).remove(kl).clearTimer(Ko);
  };
});
Xt(Lp, { displayName: "EditorState" });
var _i = ee([], "pasteRule"), bl = ee([qe], "pasteRuleTimer"), Uo = Dt("PasteRuleReady"), Pp = (t) => (t.inject(_i, []).inject(bl, [qe]).record(Uo), async () => (await t.waitTimers(bl), t.done(Uo), () => {
  t.remove(_i).remove(bl).clearTimer(Uo);
}));
Xt(Pp, { displayName: "PasteRule" });
var Jo = Dt("EditorViewReady"), wl = ee([], "editorViewTimer"), xl = ee({}, "editorViewOptions"), Go = ee(null, "root"), ca = ee(null, "rootDOM"), fa = ee({}, "rootAttrs");
function Ox(t, e) {
  const n = document.createElement("div");
  n.className = "milkdown", t.appendChild(n), e.set(ca, n);
  const r = e.get(fa);
  return Object.entries(r).forEach(([i, o]) => n.setAttribute(i, o)), n;
}
function Dx(t) {
  t.classList.add("editor"), t.setAttribute("role", "textbox");
}
var Rx = new Re("MILKDOWN_VIEW_CLEAR"), zp = (t) => (t.inject(Go, document.body).inject(Ve, {}).inject(xl, {}).inject(ca, null).inject(fa, {}).inject(wl, [Ko, Uo]).record(Jo), async () => {
  await t.wait(Jn);
  const e = t.get(Go) || document.body, n = typeof e == "string" ? document.querySelector(e) : e;
  t.update(Qt, (s) => [new Ie({
    key: Rx,
    view: (l) => {
      const a = n ? Ox(n, t) : void 0;
      return (() => {
        if (a && n) {
          const c = l.dom;
          n.replaceChild(a, c), a.appendChild(c);
        }
      })(), { destroy: () => {
        a != null && a.parentNode && (a == null || a.parentNode.replaceChild(l.dom, a)), a == null || a.remove();
      } };
    }
  }), ...s]), await t.waitTimers(wl);
  const r = t.get(mi), i = t.get(xl), o = new Mp(n, {
    state: r,
    nodeViews: Object.fromEntries(t.get(aa)),
    markViews: Object.fromEntries(t.get(ua)),
    transformPasted: (s, l, a) => (t.get(_i).sort((u, c) => (c.priority ?? 50) - (u.priority ?? 50)).map((u) => u.run).forEach((u) => {
      s = u(s, l, a);
    }), s),
    ...i
  });
  return Dx(o.dom), t.set(Ve, o), t.done(Jo), () => {
    o == null || o.destroy(), t.remove(Go).remove(Ve).remove(xl).remove(ca).remove(fa).remove(wl).clearTimer(Jo);
  };
});
Xt(zp, { displayName: "EditorView" });
var ot = /* @__PURE__ */ function(t) {
  return t.Idle = "Idle", t.OnCreate = "OnCreate", t.Created = "Created", t.OnDestroy = "OnDestroy", t.Destroyed = "Destroyed", t;
}({}), _n, Xe, qt, $r, to, no, _e, Wt, Vn, ro, Hn, _r, io, mn, Vr, Hr, Lx = (Hr = class {
  constructor() {
    F(this, _n);
    F(this, Xe);
    F(this, qt);
    F(this, $r);
    F(this, to);
    F(this, no);
    F(this, _e);
    F(this, Wt);
    F(this, Vn);
    F(this, ro);
    F(this, Hn);
    F(this, _r);
    F(this, io);
    F(this, mn);
    F(this, Vr);
    R(this, _n, !1), R(this, Xe, ot.Idle), R(this, qt, []), R(this, $r, () => {
    }), R(this, to, new bh()), R(this, no, new Ng()), R(this, _e, /* @__PURE__ */ new Map()), R(this, Wt, /* @__PURE__ */ new Map()), R(this, Vn, new Mg(C(this, to), C(this, no))), R(this, ro, () => {
      const e = Mx(async (r) => {
        await Promise.all(C(this, qt).map((i) => Promise.resolve(i(r))));
      }), n = [
        Tp,
        Op,
        Rp,
        Ip,
        Ix,
        Pp,
        Lp,
        zp,
        Nx(this),
        e
      ];
      C(this, Hn).call(this, n, C(this, Wt));
    }), R(this, Hn, (e, n) => {
      e.forEach((r) => {
        const i = C(this, Vn).produce(C(this, _n) ? r.meta : void 0), o = r(i);
        n.set(r, {
          ctx: i,
          handler: o,
          cleanup: void 0
        });
      });
    }), R(this, _r, (e, n = !1) => Promise.all([e].flat().map(async (r) => {
      var o;
      const i = (o = C(this, _e).get(r)) == null ? void 0 : o.cleanup;
      return n ? C(this, _e).delete(r) : C(this, _e).set(r, {
        ctx: void 0,
        handler: void 0,
        cleanup: void 0
      }), typeof i == "function" ? i() : i;
    }))), R(this, io, async () => {
      await Promise.all([...C(this, Wt).entries()].map(async ([e, { cleanup: n }]) => typeof n == "function" ? n() : n)), C(this, Wt).clear();
    }), R(this, mn, (e) => {
      R(this, Xe, e), C(this, $r).call(this, e);
    }), R(this, Vr, (e) => [...e.entries()].map(async ([n, r]) => {
      const { ctx: i, handler: o } = r;
      if (!o) return;
      const s = await o();
      e.set(n, {
        ctx: i,
        handler: o,
        cleanup: s
      });
    })), this.enableInspector = (e = !0) => (R(this, _n, e), this), this.onStatusChange = (e) => (R(this, $r, e), this), this.config = (e) => (C(this, qt).push(e), this), this.removeConfig = (e) => (R(this, qt, C(this, qt).filter((n) => n !== e)), this), this.use = (e) => {
      const n = [e].flat();
      return n.flat().forEach((r) => {
        C(this, _e).set(r, {
          ctx: void 0,
          handler: void 0,
          cleanup: void 0
        });
      }), C(this, Xe) === ot.Created && C(this, Hn).call(this, n, C(this, _e)), this;
    }, this.remove = async (e) => C(this, Xe) === ot.OnCreate ? (console.warn("[Milkdown]: You are trying to remove plugins when the editor is creating, this is not recommended, please check your code."), new Promise((n) => {
      setTimeout(() => {
        n(this.remove(e));
      }, 50);
    })) : (await C(this, _r).call(this, [e].flat(), !0), this), this.create = async () => C(this, Xe) === ot.OnCreate ? this : (C(this, Xe) === ot.Created && await this.destroy(), C(this, mn).call(this, ot.OnCreate), C(this, ro).call(this), C(this, Hn).call(this, [...C(this, _e).keys()], C(this, _e)), await Promise.all([C(this, Vr).call(this, C(this, Wt)), C(this, Vr).call(this, C(this, _e))].flat()), C(this, mn).call(this, ot.Created), this), this.destroy = async (e = !1) => C(this, Xe) === ot.Destroyed || C(this, Xe) === ot.OnDestroy ? this : C(this, Xe) === ot.OnCreate ? new Promise((n) => {
      setTimeout(() => {
        n(this.destroy(e));
      }, 50);
    }) : (e && R(this, qt, []), C(this, mn).call(this, ot.OnDestroy), await C(this, _r).call(this, [...C(this, _e).keys()], e), await C(this, io).call(this), C(this, mn).call(this, ot.Destroyed), this), this.action = (e) => e(C(this, Vn)), this.inspect = () => C(this, _n) ? [...C(this, Wt).values(), ...C(this, _e).values()].map(({ ctx: e }) => {
      var n;
      return (n = e == null ? void 0 : e.inspector) == null ? void 0 : n.read();
    }).filter((e) => !!e) : (console.warn("[Milkdown]: You are trying to collect inspection when inspector is disabled, please enable inspector by `editor.enableInspector()` first."), []);
  }
  static make() {
    return new Hr();
  }
  get ctx() {
    return C(this, Vn);
  }
  get status() {
    return C(this, Xe);
  }
}, _n = new WeakMap(), Xe = new WeakMap(), qt = new WeakMap(), $r = new WeakMap(), to = new WeakMap(), no = new WeakMap(), _e = new WeakMap(), Wt = new WeakMap(), Vn = new WeakMap(), ro = new WeakMap(), Hn = new WeakMap(), _r = new WeakMap(), io = new WeakMap(), mn = new WeakMap(), Vr = new WeakMap(), Hr);
function U(t, e) {
  const n = Tx(t), r = (i) => async () => {
    r.key = n, await i.wait(Ti);
    const o = e(i);
    return i.get(ie).create(n, o), r.run = (s) => i.get(ie).call(t, s), () => {
      i.get(ie).remove(n);
    };
  };
  return r;
}
function Ke(t) {
  const e = (n) => async () => {
    await n.wait(qe);
    const r = t(n);
    return n.update(Fi, (i) => [...i, r]), e.inputRule = r, () => {
      n.update(Fi, (i) => i.filter((o) => o !== r));
    };
  };
  return e;
}
function Px(t) {
  const e = (n) => async () => {
    await n.wait(qe);
    const r = t(n);
    return n.update(_i, (i) => [...i, r]), e.pasteRule = r, () => {
      n.update(_i, (i) => i.filter((o) => o !== r));
    };
  };
  return e;
}
function zx(t, e) {
  const n = (r) => async () => {
    const i = e(r);
    return r.update(Ni, (o) => [...o.filter((s) => s[0] !== t), [t, i]]), n.id = t, n.schema = i, () => {
      r.update(Ni, (o) => o.filter(([s]) => s !== t));
    };
  };
  return n.type = (r) => {
    const i = r.get(Cn).marks[t];
    if (!i) throw wg(t);
    return i;
  }, n;
}
function Ja(t, e) {
  const n = (r) => async () => {
    const i = e(r);
    return r.update(Mi, (o) => [...o.filter((s) => s[0] !== t), [t, i]]), n.id = t, n.schema = i, () => {
      r.update(Mi, (o) => o.filter(([s]) => s !== t));
    };
  };
  return n.type = (r) => {
    const i = r.get(Cn).nodes[t];
    if (!i) throw bg(t);
    return i;
  }, n;
}
function Rt(t) {
  let e;
  const n = (r) => async () => (await r.wait(qe), e = t(r), r.update(Qt, (i) => [...i, e]), () => {
    r.update(Qt, (i) => i.filter((o) => o !== e));
  });
  return n.plugin = () => e, n.key = () => e.spec.key, n;
}
function Bx(t) {
  const e = (n) => async () => {
    await n.wait(vi);
    const r = n.get(hs), i = t(n), o = r.addObjectKeymap(i);
    return e.keymap = i, () => {
      o();
    };
  };
  return e;
}
function Zt(t, e) {
  const n = ee(t, e), r = (i) => (i.inject(n), () => () => {
    i.remove(n);
  });
  return r.key = n, r;
}
function ye(t, e) {
  const n = Zt(e, t), r = Ja(t, (o) => o.get(n.key)(o)), i = [n, r];
  return i.id = r.id, i.node = r, i.type = (o) => r.type(o), i.ctx = n, i.key = n.key, i.extendSchema = (o) => ye(t, o(e)), i;
}
function ei(t, e) {
  const n = Zt(e, t), r = zx(t, (o) => o.get(n.key)(o)), i = [n, r];
  return i.id = r.id, i.mark = r, i.type = (o) => r.type(o), i.ctx = n, i.key = n.key, i.extendSchema = (o) => ei(t, o(e)), i;
}
function Ue(t, e) {
  const n = Zt(Object.fromEntries(Object.entries(e).map(([o, { shortcuts: s, priority: l }]) => [o, {
    shortcuts: s,
    priority: l
  }])), `${t}Keymap`), r = Bx((o) => {
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
var xt = (t, e = () => ({})) => Zt(e, `${t}Attr`), ho = (t, e = () => ({})) => Zt(e, `${t}Attr`);
function lr(t, e, n) {
  const r = Zt({}, t), i = (s) => async () => {
    await s.wait(Jn);
    const l = {
      plugin: e(s),
      options: s.get(r.key)
    };
    return s.update($i, (a) => [...a, l]), () => {
      s.update($i, (a) => a.filter((u) => u !== l));
    };
  }, o = [r, i];
  return o.id = t, o.plugin = i, o.options = r, o;
}
function Fx(t, e) {
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
        let f = A.empty, d = i.index(-1) ? 1 : i.index(-2) ? 2 : 3;
        for (let g = i.depth - d; g >= i.depth - 3; g--)
          f = A.from(i.node(g).copy(f));
        let h = i.indexAfter(-1) < i.node(-2).childCount ? 1 : i.indexAfter(-2) < i.node(-3).childCount ? 2 : 3;
        f = f.append(A.from(t.createAndFill()));
        let p = i.before(i.depth - (d - 1)), m = n.tr.replace(p, i.after(-h), new P(f, 4 - d, 0)), y = -1;
        m.doc.nodesBetween(p, m.doc.content.size, (g, E) => {
          if (y > -1)
            return !1;
          g.isTextblock && g.content.size == 0 && (y = E + 1);
        }), y > -1 && m.setSelection(J.near(m.doc.resolve(y))), r(m.scrollIntoView());
      }
      return !0;
    }
    let a = o.pos == i.end() ? l.contentMatchAt(0).defaultType : null, u = n.tr.delete(i.pos, o.pos), c = a ? [null, { type: a }] : void 0;
    return wi(u.doc, i.pos, 2, c) ? (r && r(u.split(i.pos, 2, c).scrollIntoView()), !0) : !1;
  };
}
function Bp(t) {
  return function(e, n) {
    let { $from: r, $to: i } = e.selection, o = r.blockRange(i, (s) => s.childCount > 0 && s.firstChild.type == t);
    return o ? n ? r.node(o.depth - 1).type == t ? $x(e, n, t, o) : _x(e, n, o) : !0 : !1;
  };
}
function $x(t, e, n, r) {
  let i = t.tr, o = r.end, s = r.$to.end(r.depth);
  o < s && (i.step(new Ee(o - 1, s, o, s, new P(A.from(n.create(null, r.parent.copy())), 1, 0), 1, !0)), r = new rd(i.doc.resolve(r.$from.pos), i.doc.resolve(s), r.depth));
  const l = Ns(r);
  if (l == null)
    return !1;
  i.lift(r, l);
  let a = i.doc.resolve(i.mapping.map(o, -1) - 1);
  return Ts(i.doc, a.pos) && a.nodeBefore.type == a.nodeAfter.type && i.join(a.pos), e(i.scrollIntoView()), !0;
}
function _x(t, e, n) {
  let r = t.tr, i = n.parent;
  for (let h = n.end, p = n.endIndex - 1, m = n.startIndex; p > m; p--)
    h -= i.child(p).nodeSize, r.delete(h - 1, h + 1);
  let o = r.doc.resolve(n.start), s = o.nodeAfter;
  if (r.mapping.map(n.end) != n.start + o.nodeAfter.nodeSize)
    return !1;
  let l = n.startIndex == 0, a = n.endIndex == i.childCount, u = o.node(-1), c = o.index(-1);
  if (!u.canReplace(c + (l ? 0 : 1), c + 1, s.content.append(a ? A.empty : A.from(i))))
    return !1;
  let f = o.pos, d = f + s.nodeSize;
  return r.step(new Ee(f - (l ? 1 : 0), d + (a ? 1 : 0), f + 1, d - 1, new P((l ? A.empty : A.from(i.copy(A.empty))).append(a ? A.empty : A.from(i.copy(A.empty))), l ? 0 : 1, a ? 0 : 1), l ? 0 : 1)), e(r.scrollIntoView()), !0;
}
function Vx(t) {
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
      let u = a.lastChild && a.lastChild.type == l.type, c = A.from(u ? t.create() : null), f = new P(A.from(t.create(null, A.from(l.type.create(null, c)))), u ? 3 : 1, 0), d = o.start, h = o.end;
      n(e.tr.step(new Ee(d - (u ? 3 : 1), h, d, h, f, 1, !0)).scrollIntoView());
    }
    return !0;
  };
}
function Hx(t) {
  const e = /* @__PURE__ */ new Map();
  if (!t || !t.type)
    throw new Error("mdast-util-definitions expected node");
  return Qr(t, "definition", function(r) {
    const i = _f(r.identifier);
    i && !e.get(i) && e.set(i, r);
  }), n;
  function n(r) {
    const i = _f(r);
    return e.get(i);
  }
}
function _f(t) {
  return String(t || "").toUpperCase();
}
function jx() {
  return function(t) {
    const e = Hx(t);
    Qr(t, function(n, r, i) {
      if (n.type === "definition" && i !== void 0 && typeof r == "number")
        return i.children.splice(r, 1), [$l, r];
      if (n.type === "imageReference" || n.type === "linkReference") {
        const o = e(n.identifier);
        if (o && i && typeof r == "number")
          return i.children[r] = n.type === "imageReference" ? { type: "image", url: o.url, title: o.title, alt: n.alt } : {
            type: "link",
            url: o.url,
            title: o.title,
            children: n.children
          }, [$l, r];
      }
    });
  };
}
function Fp(t, e) {
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
function v(t, e) {
  return Object.assign(t, { meta: {
    package: "@milkdown/preset-commonmark",
    ...e
  } }), t;
}
var Ga = ho("emphasis");
v(Ga, {
  displayName: "Attr<emphasis>",
  group: "Emphasis"
});
var ti = ei("emphasis", (t) => ({
  attrs: { marker: {
    default: t.get(Si).emphasis || "*",
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
  toDOM: (e) => ["em", t.get(Ga.key)(e)],
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
v(ti.mark, {
  displayName: "MarkSchema<emphasis>",
  group: "Emphasis"
});
v(ti.ctx, {
  displayName: "MarkSchemaCtx<emphasis>",
  group: "Emphasis"
});
var Ya = U("ToggleEmphasis", (t) => () => lo(ti.type(t)));
v(Ya, {
  displayName: "Command<toggleEmphasisCommand>",
  group: "Emphasis"
});
var $p = Ke((t) => ao(/(?:^|[^*])\*([^*]+)\*$/, ti.type(t), {
  getAttr: () => ({ marker: "*" }),
  updateCaptured: ({ fullMatch: e, start: n }) => e.startsWith("*") ? {} : {
    fullMatch: e.slice(1),
    start: n + 1
  }
}));
v($p, {
  displayName: "InputRule<emphasis>|Star",
  group: "Emphasis"
});
var _p = Ke((t) => ao(/\b_(?![_\s])(.*?[^_\s])_\b/, ti.type(t), {
  getAttr: () => ({ marker: "_" }),
  updateCaptured: ({ fullMatch: e, start: n }) => e.startsWith("_") ? {} : {
    fullMatch: e.slice(1),
    start: n + 1
  }
}));
v(_p, {
  displayName: "InputRule<emphasis>|Underscore",
  group: "Emphasis"
});
var Qa = Ue("emphasisKeymap", { ToggleEmphasis: {
  shortcuts: "Mod-i",
  command: (t) => {
    const e = t.get(ie);
    return () => e.call(Ya.key);
  }
} });
v(Qa.ctx, {
  displayName: "KeymapCtx<emphasis>",
  group: "Emphasis"
});
v(Qa.shortcuts, {
  displayName: "Keymap<emphasis>",
  group: "Emphasis"
});
var Xa = ho("strong");
v(Xa, {
  displayName: "Attr<strong>",
  group: "Strong"
});
var po = ei("strong", (t) => ({
  attrs: { marker: {
    default: t.get(Si).strong || "*",
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
  toDOM: (e) => ["strong", t.get(Xa.key)(e)],
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
v(po.mark, {
  displayName: "MarkSchema<strong>",
  group: "Strong"
});
v(po.ctx, {
  displayName: "MarkSchemaCtx<strong>",
  group: "Strong"
});
var Za = U("ToggleStrong", (t) => () => lo(po.type(t)));
v(Za, {
  displayName: "Command<toggleStrongCommand>",
  group: "Strong"
});
var Vp = Ke((t) => ao(new RegExp("(?:^|[^\\\\w:/])(?:\\\\*\\\\*|__)([^*_]+?)(?:\\\\*\\\\*|__)(?![\\\\w/])$"), po.type(t), { updateCaptured: (e) => e.fullMatch.startsWith("**") || e.fullMatch.startsWith("__") ? e : { start: e.start + 1, fullMatch: e.fullMatch.slice(1) }, getAttr: (e) => ({ marker: (e[0].startsWith("**") || e[0].startsWith("__") ? e[0] : e[0].slice(1)).startsWith("*") ? "*" : "_" }) }));
v(Vp, {
  displayName: "InputRule<strong>",
  group: "Strong"
});
var eu = Ue("strongKeymap", { ToggleBold: {
  shortcuts: ["Mod-b"],
  command: (t) => {
    const e = t.get(ie);
    return () => e.call(Za.key);
  }
} });
v(eu.ctx, {
  displayName: "KeymapCtx<strong>",
  group: "Strong"
});
v(eu.shortcuts, {
  displayName: "Keymap<strong>",
  group: "Strong"
});
var tu = ho("inlineCode");
v(tu, {
  displayName: "Attr<inlineCode>",
  group: "InlineCode"
});
var kn = ei("inlineCode", (t) => ({
  priority: 100,
  code: !0,
  parseDOM: [{ tag: "code" }],
  toDOM: (e) => ["code", t.get(tu.key)(e)],
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
v(kn.mark, {
  displayName: "MarkSchema<inlineCode>",
  group: "InlineCode"
});
v(kn.ctx, {
  displayName: "MarkSchemaCtx<inlineCode>",
  group: "InlineCode"
});
var nu = U("ToggleInlineCode", (t) => () => (e, n) => {
  const { selection: r, tr: i } = e;
  if (r.empty) return !1;
  const { from: o, to: s } = r;
  return e.doc.rangeHasMark(o, s, kn.type(t)) ? (n == null || n(i.removeMark(o, s, kn.type(t))), !0) : (Object.keys(e.schema.marks).filter((l) => l !== kn.type.name).map((l) => e.schema.marks[l]).forEach((l) => {
    i.removeMark(o, s, l);
  }), n == null || n(i.addMark(o, s, kn.type(t).create())), !0);
});
v(nu, {
  displayName: "Command<toggleInlineCodeCommand>",
  group: "InlineCode"
});
var Hp = Ke((t) => ao(/(?:`)([^`]+)(?:`)$/, kn.type(t)));
v(Hp, {
  displayName: "InputRule<inlineCodeInputRule>",
  group: "InlineCode"
});
var ru = Ue("inlineCodeKeymap", { ToggleInlineCode: {
  shortcuts: "Mod-e",
  command: (t) => {
    const e = t.get(ie);
    return () => e.call(nu.key);
  }
} });
v(ru.ctx, {
  displayName: "KeymapCtx<inlineCode>",
  group: "InlineCode"
});
v(ru.shortcuts, {
  displayName: "Keymap<inlineCode>",
  group: "InlineCode"
});
var iu = ho("link");
v(iu, {
  displayName: "Attr<link>",
  group: "Link"
});
var Cr = ei("link", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw Ot(e);
      return {
        href: e.getAttribute("href"),
        title: e.getAttribute("title")
      };
    }
  }],
  toDOM: (e) => ["a", {
    ...t.get(iu.key)(e),
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
v(Cr.mark, {
  displayName: "MarkSchema<link>",
  group: "Link"
});
var jp = U("ToggleLink", (t) => (e = {}) => lo(Cr.type(t), e));
v(jp, {
  displayName: "Command<toggleLinkCommand>",
  group: "Link"
});
var qp = U("UpdateLink", (t) => (e = {}) => (n, r) => {
  if (!r) return !1;
  let i, o = -1;
  const { selection: s } = n, { from: l, to: a } = s;
  if (n.doc.nodesBetween(l, l === a ? a + 1 : a, (p, m) => {
    if (Cr.type(t).isInSet(p.marks))
      return i = p, o = m, !1;
  }), !i) return !1;
  const u = i.marks.find(({ type: p }) => p === Cr.type(t));
  if (!u) return !1;
  const c = o, f = o + i.nodeSize, { tr: d } = n, h = Cr.type(t).create({
    ...u.attrs,
    ...e
  });
  return h ? (r(d.removeMark(c, f, u).addMark(c, f, h).setSelection(new G(d.selection.$anchor)).scrollIntoView()), !0) : !1;
});
v(qp, {
  displayName: "Command<updateLinkCommand>",
  group: "Link"
});
var Wp = Ja("doc", () => ({
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
v(Wp, {
  displayName: "NodeSchema<doc>",
  group: "Doc"
});
function qx(t) {
  return Na(t, (e) => {
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
var Ds = lr("remark-preserve-empty-line", () => () => qx);
v(Ds.plugin, {
  displayName: "Remark<remarkPreserveEmptyLine>",
  group: "Remark"
});
v(Ds.options, {
  displayName: "RemarkConfig<remarkPreserveEmptyLine>",
  group: "Remark"
});
var ou = xt("paragraph");
v(ou, {
  displayName: "Attr<paragraph>",
  group: "Paragraph"
});
var Et = ye("paragraph", (t) => ({
  content: "inline*",
  group: "block",
  parseDOM: [{ tag: "p" }],
  toDOM: (e) => [
    "p",
    t.get(ou.key)(e),
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
      const r = (i = t.get(Ve).state) == null ? void 0 : i.doc.lastChild;
      e.openNode("paragraph"), (!n.content || n.content.size === 0) && n !== r && Wx(t) ? e.addNode("html", void 0, "<br />") : Fp(e, n), e.closeNode();
    }
  }
}));
function Wx(t) {
  let e = !1;
  try {
    t.get(Ds.id), e = !0;
  } catch {
    e = !1;
  }
  return e;
}
v(Et.node, {
  displayName: "NodeSchema<paragraph>",
  group: "Paragraph"
});
v(Et.ctx, {
  displayName: "NodeSchemaCtx<paragraph>",
  group: "Paragraph"
});
var su = U("TurnIntoText", (t) => () => rr(Et.type(t)));
v(su, {
  displayName: "Command<turnIntoTextCommand>",
  group: "Paragraph"
});
var lu = Ue("paragraphKeymap", { TurnIntoText: {
  shortcuts: "Mod-Alt-0",
  command: (t) => {
    const e = t.get(ie);
    return () => e.call(su.key);
  }
} });
v(lu.ctx, {
  displayName: "KeymapCtx<paragraph>",
  group: "Paragraph"
});
v(lu.shortcuts, {
  displayName: "Keymap<paragraph>",
  group: "Paragraph"
});
var Kx = Array(6).fill(0).map((t, e) => e + 1);
function Ux(t) {
  return t.textContent.toLowerCase().trim().replace(/\s+/g, "-");
}
var Rs = Zt(Ux, "headingIdGenerator");
v(Rs, {
  displayName: "Ctx<HeadingIdGenerator>",
  group: "Heading"
});
var au = xt("heading");
v(au, {
  displayName: "Attr<heading>",
  group: "Heading"
});
var ar = ye("heading", (t) => {
  const e = t.get(Rs.key);
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
    parseDOM: Kx.map((n) => ({
      tag: `h${n}`,
      getAttrs: (r) => {
        if (!(r instanceof HTMLElement)) throw Ot(r);
        return {
          level: n,
          id: r.id
        };
      }
    })),
    toDOM: (n) => [
      `h${n.attrs.level}`,
      {
        ...t.get(au.key)(n),
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
        n.openNode("heading", void 0, { depth: r.attrs.level }), Fp(n, r), n.closeNode();
      }
    }
  };
});
v(ar.node, {
  displayName: "NodeSchema<heading>",
  group: "Heading"
});
v(ar.ctx, {
  displayName: "NodeSchemaCtx<heading>",
  group: "Heading"
});
var Kp = Ke((t) => zd(/^(#+)\s$/, ar.type(t), (e) => {
  var o, s;
  const n = (e[1] || "").length || 0, { $from: r } = t.get(Ve).state.selection, i = r.node();
  if (i.type.name === "heading") {
    let l = Number(i.attrs.level) + Number(n);
    return l > 6 && (l = 6), { level: l };
  }
  return { level: n };
}));
v(Kp, {
  displayName: "InputRule<wrapInHeadingInputRule>",
  group: "Heading"
});
var an = U("WrapInHeading", (t) => (e) => (e ?? (e = 1), e < 1 ? rr(Et.type(t)) : rr(ar.type(t), { level: e })));
v(an, {
  displayName: "Command<wrapInHeadingCommand>",
  group: "Heading"
});
var uu = U("DowngradeHeading", (t) => () => (e, n, r) => {
  const { $from: i } = e.selection, o = i.node();
  if (o.type !== ar.type(t) || !e.selection.empty || i.parentOffset !== 0) return !1;
  const s = o.attrs.level - 1;
  return s ? (n == null || n(e.tr.setNodeMarkup(e.selection.$from.before(), void 0, {
    ...o.attrs,
    level: s
  })), !0) : rr(Et.type(t))(e, n, r);
});
v(uu, {
  displayName: "Command<downgradeHeadingCommand>",
  group: "Heading"
});
var cu = Ue("headingKeymap", {
  TurnIntoH1: {
    shortcuts: "Mod-Alt-1",
    command: (t) => {
      const e = t.get(ie);
      return () => e.call(an.key, 1);
    }
  },
  TurnIntoH2: {
    shortcuts: "Mod-Alt-2",
    command: (t) => {
      const e = t.get(ie);
      return () => e.call(an.key, 2);
    }
  },
  TurnIntoH3: {
    shortcuts: "Mod-Alt-3",
    command: (t) => {
      const e = t.get(ie);
      return () => e.call(an.key, 3);
    }
  },
  TurnIntoH4: {
    shortcuts: "Mod-Alt-4",
    command: (t) => {
      const e = t.get(ie);
      return () => e.call(an.key, 4);
    }
  },
  TurnIntoH5: {
    shortcuts: "Mod-Alt-5",
    command: (t) => {
      const e = t.get(ie);
      return () => e.call(an.key, 5);
    }
  },
  TurnIntoH6: {
    shortcuts: "Mod-Alt-6",
    command: (t) => {
      const e = t.get(ie);
      return () => e.call(an.key, 6);
    }
  },
  DowngradeHeading: {
    shortcuts: ["Delete", "Backspace"],
    command: (t) => {
      const e = t.get(ie);
      return () => e.call(uu.key);
    }
  }
});
v(cu.ctx, {
  displayName: "KeymapCtx<heading>",
  group: "Heading"
});
v(cu.shortcuts, {
  displayName: "Keymap<heading>",
  group: "Heading"
});
var fu = xt("blockquote");
v(fu, {
  displayName: "Attr<blockquote>",
  group: "Blockquote"
});
var mo = ye("blockquote", (t) => ({
  content: "block+",
  group: "block",
  defining: !0,
  parseDOM: [{ tag: "blockquote" }],
  toDOM: (e) => [
    "blockquote",
    t.get(fu.key)(e),
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
v(mo.node, {
  displayName: "NodeSchema<blockquote>",
  group: "Blockquote"
});
v(mo.ctx, {
  displayName: "NodeSchemaCtx<blockquote>",
  group: "Blockquote"
});
var Up = Ke((t) => Ba(/^\s*>\s$/, mo.type(t)));
v(Up, {
  displayName: "InputRule<wrapInBlockquoteInputRule>",
  group: "Blockquote"
});
var hu = U("WrapInBlockquote", (t) => () => za(mo.type(t)));
v(hu, {
  displayName: "Command<wrapInBlockquoteCommand>",
  group: "Blockquote"
});
var du = Ue("blockquoteKeymap", { WrapInBlockquote: {
  shortcuts: "Mod-Shift-b",
  command: (t) => {
    const e = t.get(ie);
    return () => e.call(hu.key);
  }
} });
v(du.ctx, {
  displayName: "KeymapCtx<blockquote>",
  group: "Blockquote"
});
v(du.shortcuts, {
  displayName: "Keymap<blockquote>",
  group: "Blockquote"
});
var pu = xt("codeBlock", () => ({
  pre: {},
  code: {}
}));
v(pu, {
  displayName: "Attr<codeBlock>",
  group: "CodeBlock"
});
var go = ye("code_block", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw Ot(e);
      return { language: e.dataset.language };
    }
  }],
  toDOM: (e) => {
    const n = t.get(pu.key)(e), r = e.attrs.language, i = r && r.length > 0 ? { "data-language": r } : void 0;
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
v(go.node, {
  displayName: "NodeSchema<codeBlock>",
  group: "CodeBlock"
});
v(go.ctx, {
  displayName: "NodeSchemaCtx<codeBlock>",
  group: "CodeBlock"
});
var Jp = Ke((t) => zd(/^```([a-z]*)?[\s\n]$/, go.type(t), (e) => {
  var n;
  return { language: e[1] ?? "" };
}));
v(Jp, {
  displayName: "InputRule<createCodeBlockInputRule>",
  group: "CodeBlock"
});
var mu = U("CreateCodeBlock", (t) => (e = "") => rr(go.type(t), { language: e }));
v(mu, {
  displayName: "Command<createCodeBlockCommand>",
  group: "CodeBlock"
});
var Jx = U("UpdateCodeBlockLanguage", () => ({ pos: t, language: e } = {
  pos: -1,
  language: ""
}) => (n, r) => t >= 0 ? (r == null || r(n.tr.setNodeAttribute(t, "language", e)), !0) : !1);
v(Jx, {
  displayName: "Command<updateCodeBlockLanguageCommand>",
  group: "CodeBlock"
});
var gu = Ue("codeBlockKeymap", { CreateCodeBlock: {
  shortcuts: "Mod-Alt-c",
  command: (t) => {
    const e = t.get(ie);
    return () => e.call(mu.key);
  }
} });
v(gu.ctx, {
  displayName: "KeymapCtx<codeBlock>",
  group: "CodeBlock"
});
v(gu.shortcuts, {
  displayName: "Keymap<codeBlock>",
  group: "CodeBlock"
});
var yu = xt("image");
v(yu, {
  displayName: "Attr<image>",
  group: "Image"
});
var ni = ye("image", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw Ot(e);
      return {
        src: e.getAttribute("src") || "",
        alt: e.getAttribute("alt") || "",
        title: e.getAttribute("title") || e.getAttribute("alt") || ""
      };
    }
  }],
  toDOM: (e) => ["img", {
    ...t.get(yu.key)(e),
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
v(ni.node, {
  displayName: "NodeSchema<image>",
  group: "Image"
});
v(ni.ctx, {
  displayName: "NodeSchemaCtx<image>",
  group: "Image"
});
var Gp = U("InsertImage", (t) => (e = {}) => (n, r) => {
  if (!r) return !0;
  const { src: i = "", alt: o = "", title: s = "" } = e, l = ni.type(t).create({
    src: i,
    alt: o,
    title: s
  });
  return l && r(n.tr.replaceSelectionWith(l).scrollIntoView()), !0;
});
v(Gp, {
  displayName: "Command<insertImageCommand>",
  group: "Image"
});
var Yp = U("UpdateImage", (t) => (e = {}) => (n, r) => {
  const i = A0(n.selection, ni.type(t));
  if (!i) return !1;
  const { node: o, pos: s } = i, l = { ...o.attrs }, { src: a, alt: u, title: c } = e;
  return a !== void 0 && (l.src = a), u !== void 0 && (l.alt = u), c !== void 0 && (l.title = c), r == null || r(n.tr.setNodeMarkup(s, void 0, l).scrollIntoView()), !0;
});
v(Yp, {
  displayName: "Command<updateImageCommand>",
  group: "Image"
});
var Gx = Ke((t) => new rt(/!\[(.*?)]\((.*?)\s*(?="|\))"?([^"]+)?"?\)/, (e, n, r, i) => {
  const [o, s, l = "", a] = n;
  return o ? e.tr.replaceWith(r, i, ni.type(t).create({
    src: l,
    alt: s,
    title: a
  })) : null;
}));
v(Gx, {
  displayName: "InputRule<insertImageInputRule>",
  group: "Image"
});
var ds = xt("hardbreak", (t) => ({
  "data-type": "hardbreak",
  "data-is-inline": t.attrs.isInline
}));
v(ds, {
  displayName: "Attr<hardbreak>",
  group: "Hardbreak"
});
var Gn = ye("hardbreak", (t) => ({
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
    t.get(ds.key)(e),
    " "
  ] : ["br", t.get(ds.key)(e)],
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
v(Gn.node, {
  displayName: "NodeSchema<hardbreak>",
  group: "Hardbreak"
});
v(Gn.ctx, {
  displayName: "NodeSchemaCtx<hardbreak>",
  group: "Hardbreak"
});
var ku = U("InsertHardbreak", (t) => () => (e, n) => {
  var o;
  const { selection: r, tr: i } = e;
  if (!(r instanceof G)) return !1;
  if (r.empty) {
    const s = r.$from.node();
    if (s.childCount > 0 && ((o = s.lastChild) == null ? void 0 : o.type.name) === "hardbreak")
      return n == null || n(i.replaceRangeWith(r.to - 1, r.to, e.schema.node("paragraph")).setSelection(J.near(i.doc.resolve(r.to))).scrollIntoView()), !0;
  }
  return n == null || n(i.setMeta("hardbreak", !0).replaceSelectionWith(Gn.type(t).create()).scrollIntoView()), !0;
});
v(ku, {
  displayName: "Command<insertHardbreakCommand>",
  group: "Hardbreak"
});
var bu = Ue("hardbreakKeymap", { InsertHardbreak: {
  shortcuts: "Shift-Enter",
  command: (t) => {
    const e = t.get(ie);
    return () => e.call(ku.key);
  }
} });
v(bu.ctx, {
  displayName: "KeymapCtx<hardbreak>",
  group: "Hardbreak"
});
v(bu.shortcuts, {
  displayName: "Keymap<hardbreak>",
  group: "Hardbreak"
});
var wu = xt("hr");
v(wu, {
  displayName: "Attr<hr>",
  group: "Hr"
});
var yo = ye("hr", (t) => ({
  group: "block",
  parseDOM: [{ tag: "hr" }],
  toDOM: (e) => ["hr", t.get(wu.key)(e)],
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
v(yo.node, {
  displayName: "NodeSchema<hr>",
  group: "Hr"
});
v(yo.ctx, {
  displayName: "NodeSchemaCtx<hr>",
  group: "Hr"
});
var Qp = Ke((t) => new rt(/^(?:---|___\s|\*\*\*\s)$/, (e, n, r, i) => {
  const { tr: o } = e;
  return n[0] && o.replaceWith(r - 1, i, yo.type(t).create()), o;
}));
v(Qp, {
  displayName: "InputRule<insertHrInputRule>",
  group: "Hr"
});
var Xp = U("InsertHr", (t) => () => (e, n) => {
  if (!n) return !0;
  const r = Et.node.type(t).create(), { tr: i, selection: o } = e, { from: s } = o, l = yo.type(t).create();
  if (!l) return !0;
  const a = i.replaceSelectionWith(l).insert(s, r), u = J.findFrom(a.doc.resolve(s), 1, !0);
  return u && n(a.setSelection(u).scrollIntoView()), !0;
});
v(Xp, {
  displayName: "Command<insertHrCommand>",
  group: "Hr"
});
var xu = xt("bulletList");
v(xu, {
  displayName: "Attr<bulletList>",
  group: "BulletList"
});
var ri = ye("bullet_list", (t) => ({
  content: "listItem+",
  group: "block",
  attrs: { spread: {
    default: !1,
    validate: "boolean"
  } },
  parseDOM: [{
    tag: "ul",
    getAttrs: (e) => {
      if (!(e instanceof HTMLElement)) throw Ot(e);
      return { spread: e.dataset.spread === "true" };
    }
  }],
  toDOM: (e) => [
    "ul",
    {
      ...t.get(xu.key)(e),
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
v(ri.node, {
  displayName: "NodeSchema<bulletList>",
  group: "BulletList"
});
v(ri.ctx, {
  displayName: "NodeSchemaCtx<bulletList>",
  group: "BulletList"
});
var Zp = Ke((t) => Ba(/^\s*([-+*])\s$/, ri.type(t)));
v(Zp, {
  displayName: "InputRule<wrapInBulletListInputRule>",
  group: "BulletList"
});
var Cu = U("WrapInBulletList", (t) => () => za(ri.type(t)));
v(Cu, {
  displayName: "Command<wrapInBulletListCommand>",
  group: "BulletList"
});
var Su = Ue("bulletListKeymap", { WrapInBulletList: {
  shortcuts: "Mod-Alt-8",
  command: (t) => {
    const e = t.get(ie);
    return () => e.call(Cu.key);
  }
} });
v(Su.ctx, {
  displayName: "KeymapCtx<bulletListKeymap>",
  group: "BulletList"
});
v(Su.shortcuts, {
  displayName: "Keymap<bulletListKeymap>",
  group: "BulletList"
});
var Mu = xt("orderedList");
v(Mu, {
  displayName: "Attr<orderedList>",
  group: "OrderedList"
});
var ii = ye("ordered_list", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw Ot(e);
      return {
        spread: e.dataset.spread,
        order: e.hasAttribute("start") ? Number(e.getAttribute("start")) : 1
      };
    }
  }],
  toDOM: (e) => [
    "ol",
    {
      ...t.get(Mu.key)(e),
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
v(ii.node, {
  displayName: "NodeSchema<orderedList>",
  group: "OrderedList"
});
v(ii.ctx, {
  displayName: "NodeSchemaCtx<orderedList>",
  group: "OrderedList"
});
var em = Ke((t) => Ba(/^\s*(\d+)\.\s$/, ii.type(t), (e) => ({ order: Number(e[1]) }), (e, n) => n.childCount + n.attrs.order === Number(e[1])));
v(em, {
  displayName: "InputRule<wrapInOrderedListInputRule>",
  group: "OrderedList"
});
var Nu = U("WrapInOrderedList", (t) => () => za(ii.type(t)));
v(Nu, {
  displayName: "Command<wrapInOrderedListCommand>",
  group: "OrderedList"
});
var Tu = Ue("orderedListKeymap", { WrapInOrderedList: {
  shortcuts: "Mod-Alt-7",
  command: (t) => {
    const e = t.get(ie);
    return () => e.call(Nu.key);
  }
} });
v(Tu.ctx, {
  displayName: "KeymapCtx<orderedList>",
  group: "OrderedList"
});
v(Tu.shortcuts, {
  displayName: "Keymap<orderedList>",
  group: "OrderedList"
});
var vu = xt("listItem");
v(vu, {
  displayName: "Attr<listItem>",
  group: "ListItem"
});
var en = ye("list_item", (t) => ({
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
      if (!(e instanceof HTMLElement)) throw Ot(e);
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
      ...t.get(vu.key)(e),
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
v(en.node, {
  displayName: "NodeSchema<listItem>",
  group: "ListItem"
});
v(en.ctx, {
  displayName: "NodeSchemaCtx<listItem>",
  group: "ListItem"
});
var Iu = U("SinkListItem", (t) => () => Vx(en.type(t)));
v(Iu, {
  displayName: "Command<sinkListItemCommand>",
  group: "ListItem"
});
var Au = U("LiftListItem", (t) => () => Bp(en.type(t)));
v(Au, {
  displayName: "Command<liftListItemCommand>",
  group: "ListItem"
});
var Eu = U("SplitListItem", (t) => () => Fx(en.type(t)));
v(Eu, {
  displayName: "Command<splitListItemCommand>",
  group: "ListItem"
});
function Yx(t) {
  return (e, n, r) => {
    const { selection: i } = e;
    if (!(i instanceof G)) return !1;
    const { empty: o, $from: s } = i;
    return !o || s.parentOffset !== 0 || s.node(-1).type !== en.type(t) ? !1 : Ed(e, n, r);
  };
}
var Ou = U("LiftFirstListItem", (t) => () => Yx(t));
v(Ou, {
  displayName: "Command<liftFirstListItemCommand>",
  group: "ListItem"
});
var Du = Ue("listItemKeymap", {
  NextListItem: {
    shortcuts: "Enter",
    command: (t) => {
      const e = t.get(ie);
      return () => e.call(Eu.key);
    }
  },
  SinkListItem: {
    shortcuts: ["Tab", "Mod-]"],
    command: (t) => {
      const e = t.get(ie);
      return () => e.call(Iu.key);
    }
  },
  LiftListItem: {
    shortcuts: ["Shift-Tab", "Mod-["],
    command: (t) => {
      const e = t.get(ie);
      return () => e.call(Au.key);
    }
  },
  LiftFirstListItem: {
    shortcuts: ["Backspace", "Delete"],
    command: (t) => {
      const e = t.get(ie);
      return () => e.call(Ou.key);
    }
  }
});
v(Du.ctx, {
  displayName: "KeymapCtx<listItem>",
  group: "ListItem"
});
v(Du.shortcuts, {
  displayName: "Keymap<listItem>",
  group: "ListItem"
});
var tm = Ja("text", () => ({
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
v(tm, {
  displayName: "NodeSchema<text>",
  group: "Text"
});
var Ru = xt("html");
v(Ru, {
  displayName: "Attr<html>",
  group: "Html"
});
var Lu = ye("html", (t) => ({
  atom: !0,
  group: "inline",
  inline: !0,
  attrs: { value: {
    default: "",
    validate: "string"
  } },
  toDOM: (e) => {
    const n = document.createElement("span"), r = {
      ...t.get(Ru.key)(e),
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
v(Lu.node, {
  displayName: "NodeSchema<html>",
  group: "Html"
});
v(Lu.ctx, {
  displayName: "NodeSchemaCtx<html>",
  group: "Html"
});
var Qx = [
  Wp,
  ou,
  Et,
  Rs,
  au,
  ar,
  ds,
  Gn,
  fu,
  mo,
  pu,
  go,
  wu,
  yo,
  yu,
  ni,
  xu,
  ri,
  Mu,
  ii,
  vu,
  en,
  Ga,
  ti,
  Xa,
  po,
  tu,
  kn,
  iu,
  Cr,
  Ru,
  Lu,
  tm
].flat(), Xx = [
  Up,
  Zp,
  em,
  Jp,
  Qp,
  Kp
].flat(), Zx = [], eC = U("IsMarkSelected", () => (t) => (e) => {
  if (!t) return !1;
  const { doc: n, selection: r } = e;
  return n.rangeHasMark(r.from, r.to, t);
}), tC = U("IsNoteSelected", () => (t) => (e) => t ? E0(e, t).hasNode : !1), nC = U("ClearTextInCurrentBlock", () => () => (t, e) => {
  let n = t.tr;
  const { $from: r, $to: i } = n.selection, { pos: o } = r, { pos: s } = i, l = o - r.node().content.size;
  return l < 0 ? !1 : (n = n.deleteRange(l, s), e == null || e(n), !0);
}), rC = U("SetBlockType", () => (t) => (e, n) => {
  const { nodeType: r, attrs: i = null } = t ?? {};
  if (!r) return !1;
  const o = e.tr, { from: s, to: l } = o.selection;
  try {
    o.setBlockType(s, l, r, i);
  } catch {
    return !1;
  }
  return n == null || n(o), !0;
}), iC = U("WrapInBlockType", () => (t) => (e, n) => {
  const { nodeType: r, attrs: i = null } = t ?? {};
  if (!r) return !1;
  let o = e.tr;
  try {
    const { $from: s, $to: l } = o.selection, a = s.blockRange(l), u = a && Oa(a, r, i);
    if (!u) return !1;
    o = o.wrap(a, u);
  } catch {
    return !1;
  }
  return n == null || n(o), !0;
}), oC = U("AddBlockType", () => (t) => (e, n) => {
  const { nodeType: r, attrs: i = null } = t ?? {};
  if (!r) return !1;
  const o = e.tr;
  try {
    const s = r instanceof Jt ? r : r.createAndFill(i);
    if (!s) return !1;
    o.replaceSelectionWith(s);
  } catch {
    return !1;
  }
  return n == null || n(o), !0;
}), sC = U("SelectTextNearPos", () => (t) => (e, n) => {
  const { pos: r } = t ?? {};
  if (r == null) return !1;
  const i = (s, l, a) => Math.min(Math.max(s, l), a), o = e.tr;
  try {
    const s = e.doc.resolve(i(r, 0, e.doc.content.size));
    o.setSelection(G.near(s));
  } catch {
    return !1;
  }
  return n == null || n(o.scrollIntoView()), !0;
}), lC = [
  su,
  hu,
  an,
  uu,
  mu,
  ku,
  Xp,
  Gp,
  Yp,
  Nu,
  Cu,
  Iu,
  Eu,
  Au,
  Ou,
  Ya,
  nu,
  Za,
  jp,
  qp,
  eC,
  tC,
  nC,
  rC,
  iC,
  oC,
  sC
], aC = [
  du,
  gu,
  bu,
  cu,
  Du,
  Tu,
  Su,
  lu,
  Qa,
  ru,
  eu
].flat(), Pu = lr("remarkAddOrderInList", () => () => (t) => {
  Qr(t, "list", (e) => {
    if (e.ordered) {
      const n = e.start ?? 1;
      e.children.forEach((r, i) => {
        r.label = i + n;
      });
    }
  });
});
v(Pu.plugin, {
  displayName: "Remark<remarkAddOrderInListPlugin>",
  group: "Remark"
});
v(Pu.options, {
  displayName: "RemarkConfig<remarkAddOrderInListPlugin>",
  group: "Remark"
});
var zu = lr("remarkLineBreak", () => () => (t) => {
  const e = /[\t ]*(?:\r?\n|\r)/g;
  Qr(t, "text", (n, r, i) => {
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
v(zu.plugin, {
  displayName: "Remark<remarkLineBreak>",
  group: "Remark"
});
v(zu.options, {
  displayName: "RemarkConfig<remarkLineBreak>",
  group: "Remark"
});
var Bu = lr("remarkInlineLink", () => jx);
v(Bu.plugin, {
  displayName: "Remark<remarkInlineLinkPlugin>",
  group: "Remark"
});
v(Bu.options, {
  displayName: "RemarkConfig<remarkInlineLinkPlugin>",
  group: "Remark"
});
var uC = (t) => !!t.children, cC = (t) => t.type === "html";
function fC(t, e) {
  return n(t, 0, null)[0];
  function n(r, i, o) {
    if (uC(r)) {
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
var hC = [
  "root",
  "blockquote",
  "listItem"
], Fu = lr("remarkHTMLTransformer", () => () => (t) => {
  fC(t, (e, n, r) => cC(e) ? (r && hC.includes(r.type) && (e.children = [{ ...e }], delete e.value, e.type = "paragraph"), [e]) : [e]);
});
v(Fu.plugin, {
  displayName: "Remark<remarkHtmlTransformer>",
  group: "Remark"
});
v(Fu.options, {
  displayName: "RemarkConfig<remarkHtmlTransformer>",
  group: "Remark"
});
var $u = lr("remarkMarker", () => () => (t, e) => {
  const n = (r) => e.value.charAt(r.position.start.offset);
  Qr(t, (r) => ["strong", "emphasis"].includes(r.type), (r) => {
    r.marker = n(r);
  });
});
v($u.plugin, {
  displayName: "Remark<remarkMarker>",
  group: "Remark"
});
v($u.options, {
  displayName: "RemarkConfig<remarkMarker>",
  group: "Remark"
});
var nm = Rt(() => {
  let t = !1;
  const e = new Ie({
    key: new Re("MILKDOWN_INLINE_NODES_CURSOR"),
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
          const r = n.selection.$from.pos, i = document.createElement("span"), o = Te.widget(r, i, { side: -1 }), s = document.createElement("span"), l = Te.widget(r, s);
          return setTimeout(() => {
            i.contentEditable = "true", s.contentEditable = "true";
          }), ce.create(n.doc, [o, l]);
        }
        return ce.empty;
      }
    }
  });
  return e;
});
v(nm, {
  displayName: "Prose<inlineNodesCursorPlugin>",
  group: "Prose"
});
var rm = Rt((t) => new Ie({
  key: new Re("MILKDOWN_HARDBREAK_MARKS"),
  appendTransaction: (e, n, r) => {
    if (!e.length) return;
    const [i] = e;
    if (!i) return;
    const [o] = i.steps;
    if (i.getMeta("hardbreak")) {
      if (!(o instanceof he)) return;
      const { from: s } = o;
      return r.tr.setNodeMarkup(s, Gn.type(t), void 0, []);
    }
    if (o instanceof Kt) {
      let s = r.tr;
      const { from: l, to: a } = o;
      return r.doc.nodesBetween(l, a, (u, c) => {
        u.type === Gn.type(t) && (s = s.setNodeMarkup(c, Gn.type(t), void 0, []));
      }), s;
    }
  }
}));
v(rm, {
  displayName: "Prose<hardbreakClearMarkPlugin>",
  group: "Prose"
});
var _u = Zt(["table", "code_block"], "hardbreakFilterNodes");
v(_u, {
  displayName: "Ctx<hardbreakFilterNodes>",
  group: "Prose"
});
var im = Rt((t) => {
  const e = t.get(_u.key);
  return new Ie({
    key: new Re("MILKDOWN_HARDBREAK_FILTER"),
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
v(im, {
  displayName: "Prose<hardbreakFilterPlugin>",
  group: "Prose"
});
var om = Rt((t) => {
  const e = new Re("MILKDOWN_HEADING_ID"), n = (r) => {
    if (r.composing) return;
    const i = t.get(Rs.key), o = r.state.tr.setMeta("addToHistory", !1);
    let s = !1;
    const l = {};
    r.state.doc.descendants((a, u) => {
      if (a.type === ar.type(t)) {
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
  return new Ie({
    key: e,
    view: (r) => (n(r), { update: (i, o) => {
      i.state.doc.eq(o.doc) || n(i);
    } })
  });
});
v(om, {
  displayName: "Prose<syncHeadingIdPlugin>",
  group: "Prose"
});
var sm = Rt((t) => {
  const e = (n, r, i) => {
    if (!i.selection || n.some((f) => f.getMeta("addToHistory") === !1 || !f.isGeneric)) return null;
    const o = ii.type(t), s = ri.type(t), l = en.type(t), a = (f, d, h = 1) => {
      let p = !1;
      const m = `${d + h}.`;
      return f.label !== m && (f.label = m, p = !0), p;
    };
    let u = i.tr, c = !1;
    return i.doc.descendants((f, d, h, p) => {
      if (f.type === s) {
        const m = f.maybeChild(0);
        (m == null ? void 0 : m.type) === l && m.attrs.listType === "ordered" && (c = !0, u.setNodeMarkup(d, o, { spread: "true" }), f.descendants((y, g, E, T) => {
          if (y.type === l) {
            const B = { ...y.attrs };
            a(B, T) && (u = u.setNodeMarkup(g, void 0, B));
          }
          return !1;
        }));
      } else if (f.type === l && (h == null ? void 0 : h.type) === o) {
        const m = { ...f.attrs };
        let y = !1;
        m.listType !== "ordered" && (m.listType = "ordered", y = !0), h != null && h.maybeChild(0) && (y = a(m, p, (h == null ? void 0 : h.attrs.order) ?? 1)), y && (u = u.setNodeMarkup(d, void 0, m), c = !0);
      }
    }), c ? u.setMeta("addToHistory", !1) : null;
  };
  return new Ie({
    key: new Re("MILKDOWN_KEEP_LIST_ORDER"),
    appendTransaction: e
  });
});
v(sm, {
  displayName: "Prose<syncListOrderPlugin>",
  group: "Prose"
});
var dC = [
  rm,
  _u,
  im,
  nm,
  Pu,
  Bu,
  zu,
  Fu,
  $u,
  Ds,
  om,
  sm
].flat(), pC = [
  Qx,
  Xx,
  Zx,
  lC,
  aC,
  dC
].flat();
let ha, da;
if (typeof WeakMap < "u") {
  let t = /* @__PURE__ */ new WeakMap();
  ha = (e) => t.get(e), da = (e, n) => (t.set(e, n), n);
} else {
  const t = [];
  let n = 0;
  ha = (r) => {
    for (let i = 0; i < t.length; i += 2) if (t[i] == r) return t[i + 1];
  }, da = (r, i) => (n == 10 && (n = 0), t[n++] = r, t[n++] = i);
}
var oe = class {
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
    return ha(t) || da(t, mC(t));
  }
};
function mC(t) {
  if (t.type.spec.tableRole != "table") throw new RangeError("Not a table node: " + t.type.name);
  const e = gC(t), n = t.childCount, r = [];
  let i = 0, o = null;
  const s = [];
  for (let u = 0, c = e * n; u < c; u++) r[u] = 0;
  for (let u = 0, c = 0; u < n; u++) {
    const f = t.child(u);
    c++;
    for (let p = 0; ; p++) {
      for (; i < r.length && r[i] != 0; ) i++;
      if (p == f.childCount) break;
      const m = f.child(p), { colspan: y, rowspan: g, colwidth: E } = m.attrs;
      for (let T = 0; T < g; T++) {
        if (T + u >= n) {
          (o || (o = [])).push({
            type: "overlong_rowspan",
            pos: c,
            n: g - T
          });
          break;
        }
        const B = i + T * e;
        for (let z = 0; z < y; z++) {
          r[B + z] == 0 ? r[B + z] = c : (o || (o = [])).push({
            type: "collision",
            row: u,
            pos: c,
            n: y - z
          });
          const S = E && E[z];
          if (S) {
            const D = (B + z) % e * 2, V = s[D];
            V == null || V != S && s[D + 1] == 1 ? (s[D] = S, s[D + 1] = 1) : V == S && s[D + 1]++;
          }
        }
      }
      i += y, c += m.nodeSize;
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
  const l = new oe(e, n, r, o);
  let a = !1;
  for (let u = 0; !a && u < s.length; u += 2) s[u] != null && s[u + 1] < n && (a = !0);
  return a && yC(l, s, t), l;
}
function gC(t) {
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
function yC(t, e, n) {
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
      c != null && (!a.colwidth || a.colwidth[u] != c) && ((l || (l = kC(a)))[u] = c);
    }
    l && t.problems.unshift({
      type: "colwidth mismatch",
      pos: o,
      colwidth: l
    });
  }
}
function kC(t) {
  if (t.colwidth) return t.colwidth.slice();
  const e = [];
  for (let n = 0; n < t.colspan; n++) e.push(0);
  return e;
}
function Vf(t, e) {
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
function Hf(t, e) {
  const n = {};
  t.attrs.colspan != 1 && (n.colspan = t.attrs.colspan), t.attrs.rowspan != 1 && (n.rowspan = t.attrs.rowspan), t.attrs.colwidth && (n["data-colwidth"] = t.attrs.colwidth.join(","));
  for (const r in e) {
    const i = e[r].setDOMAttr;
    i && i(t.attrs[r], n);
  }
  return n;
}
function bC(t) {
  if (t !== null) {
    if (!Array.isArray(t)) throw new TypeError("colwidth must be null or an array");
    for (const e of t) if (typeof e != "number") throw new TypeError("colwidth must be null or an array of numbers");
  }
}
function wC(t) {
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
      validate: bC
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
        getAttrs: (r) => Vf(r, e)
      }],
      toDOM(r) {
        return [
          "td",
          Hf(r, e),
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
        getAttrs: (r) => Vf(r, e)
      }],
      toDOM(r) {
        return [
          "th",
          Hf(r, e),
          0
        ];
      }
    }
  };
}
function Be(t) {
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
const fn = new Re("selectingCells");
function Gr(t) {
  for (let e = t.depth - 1; e > 0; e--) if (t.node(e).type.spec.tableRole == "row") return t.node(0).resolve(t.before(e + 1));
  return null;
}
function ve(t) {
  const e = t.selection.$head;
  for (let n = e.depth; n > 0; n--) if (e.node(n).type.spec.tableRole == "row") return !0;
  return !1;
}
function Ls(t) {
  const e = t.selection;
  if ("$anchorCell" in e && e.$anchorCell) return e.$anchorCell.pos > e.$headCell.pos ? e.$anchorCell : e.$headCell;
  if ("node" in e && e.node && e.node.type.spec.tableRole == "cell") return e.$anchor;
  const n = Gr(e.$head) || xC(e.$head);
  if (n) return n;
  throw new RangeError(`No cell found around position ${e.head}`);
}
function xC(t) {
  for (let e = t.nodeAfter, n = t.pos; e; e = e.firstChild, n++) {
    const r = e.type.spec.tableRole;
    if (r == "cell" || r == "header_cell") return t.doc.resolve(n);
  }
  for (let e = t.nodeBefore, n = t.pos; e; e = e.lastChild, n--) {
    const r = e.type.spec.tableRole;
    if (r == "cell" || r == "header_cell") return t.doc.resolve(n - e.nodeSize);
  }
}
function pa(t) {
  return t.parent.type.spec.tableRole == "row" && !!t.nodeAfter;
}
function CC(t) {
  return t.node(0).resolve(t.pos + t.nodeAfter.nodeSize);
}
function Vu(t, e) {
  return t.depth == e.depth && t.pos >= e.start(-1) && t.pos <= e.end(-1);
}
function lm(t, e, n) {
  const r = t.node(-1), i = oe.get(r), o = t.start(-1), s = i.nextCell(t.pos - o, e, n);
  return s == null ? null : t.node(0).resolve(o + s);
}
function sr(t, e, n = 1) {
  const r = {
    ...t,
    colspan: t.colspan - n
  };
  return r.colwidth && (r.colwidth = r.colwidth.slice(), r.colwidth.splice(e, n), r.colwidth.some((i) => i > 0) || (r.colwidth = null)), r;
}
function SC(t, e, n = 1) {
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
function MC(t, e, n) {
  const r = Be(e.type.schema).header_cell;
  for (let i = 0; i < t.height; i++) if (e.nodeAt(t.map[n + i * t.width]).type != r) return !1;
  return !0;
}
var ae = class Bt extends J {
  constructor(e, n = e) {
    const r = e.node(-1), i = oe.get(r), o = e.start(-1), s = i.rectBetween(e.pos - o, n.pos - o), l = e.node(0), a = i.cellsInRect(s).filter((c) => c != n.pos - o);
    a.unshift(n.pos - o);
    const u = a.map((c) => {
      const f = r.nodeAt(c);
      if (!f) throw new RangeError(`No cell with offset ${c} found`);
      const d = o + c + 1;
      return new Td(l.resolve(d), l.resolve(d + f.content.size));
    });
    super(u[0].$from, u[0].$to, u), this.$anchorCell = e, this.$headCell = n;
  }
  map(e, n) {
    const r = e.resolve(n.map(this.$anchorCell.pos)), i = e.resolve(n.map(this.$headCell.pos));
    if (pa(r) && pa(i) && Vu(r, i)) {
      const o = this.$anchorCell.node(-1) != r.node(-1);
      return o && this.isRowSelection() ? Bt.rowSelection(r, i) : o && this.isColSelection() ? Bt.colSelection(r, i) : new Bt(r, i);
    }
    return G.between(r, i);
  }
  content() {
    const e = this.$anchorCell.node(-1), n = oe.get(e), r = this.$anchorCell.start(-1), i = n.rectBetween(this.$anchorCell.pos - r, this.$headCell.pos - r), o = {}, s = [];
    for (let a = i.top; a < i.bottom; a++) {
      const u = [];
      for (let c = a * n.width + i.left, f = i.left; f < i.right; f++, c++) {
        const d = n.map[c];
        if (o[d]) continue;
        o[d] = !0;
        const h = n.findCell(d);
        let p = e.nodeAt(d);
        if (!p) throw new RangeError(`No cell with offset ${d} found`);
        const m = i.left - h.left, y = h.right - i.right;
        if (m > 0 || y > 0) {
          let g = p.attrs;
          if (m > 0 && (g = sr(g, 0, m)), y > 0 && (g = sr(g, g.colspan - y, y)), h.left < i.left) {
            if (p = p.type.createAndFill(g), !p) throw new RangeError(`Could not create cell with attrs ${JSON.stringify(g)}`);
          } else p = p.type.create(g, p.content);
        }
        if (h.top < i.top || h.bottom > i.bottom) {
          const g = {
            ...p.attrs,
            rowspan: Math.min(h.bottom, i.bottom) - Math.max(h.top, i.top)
          };
          h.top < i.top ? p = p.type.createAndFill(g) : p = p.type.create(g, p.content);
        }
        u.push(p);
      }
      s.push(e.child(a).copy(A.from(u)));
    }
    const l = this.isColSelection() && this.isRowSelection() ? e : s;
    return new P(A.from(l), 1, 1);
  }
  replace(e, n = P.empty) {
    const r = e.steps.length, i = this.ranges;
    for (let s = 0; s < i.length; s++) {
      const { $from: l, $to: a } = i[s], u = e.mapping.slice(r);
      e.replace(u.map(l.pos), u.map(a.pos), s ? P.empty : n);
    }
    const o = J.findFrom(e.doc.resolve(e.mapping.slice(r).map(this.to)), -1);
    o && e.setSelection(o);
  }
  replaceWith(e, n) {
    this.replace(e, new P(A.from(n), 0, 0));
  }
  forEachCell(e) {
    const n = this.$anchorCell.node(-1), r = oe.get(n), i = this.$anchorCell.start(-1), o = r.cellsInRect(r.rectBetween(this.$anchorCell.pos - i, this.$headCell.pos - i));
    for (let s = 0; s < o.length; s++) e(n.nodeAt(o[s]), i + o[s]);
  }
  isColSelection() {
    const e = this.$anchorCell.index(-1), n = this.$headCell.index(-1);
    if (Math.min(e, n) > 0) return !1;
    const r = e + this.$anchorCell.nodeAfter.attrs.rowspan, i = n + this.$headCell.nodeAfter.attrs.rowspan;
    return Math.max(r, i) == this.$headCell.node(-1).childCount;
  }
  static colSelection(e, n = e) {
    const r = e.node(-1), i = oe.get(r), o = e.start(-1), s = i.findCell(e.pos - o), l = i.findCell(n.pos - o), a = e.node(0);
    return s.top <= l.top ? (s.top > 0 && (e = a.resolve(o + i.map[s.left])), l.bottom < i.height && (n = a.resolve(o + i.map[i.width * (i.height - 1) + l.right - 1]))) : (l.top > 0 && (n = a.resolve(o + i.map[l.left])), s.bottom < i.height && (e = a.resolve(o + i.map[i.width * (i.height - 1) + s.right - 1]))), new Bt(e, n);
  }
  isRowSelection() {
    const e = this.$anchorCell.node(-1), n = oe.get(e), r = this.$anchorCell.start(-1), i = n.colCount(this.$anchorCell.pos - r), o = n.colCount(this.$headCell.pos - r);
    if (Math.min(i, o) > 0) return !1;
    const s = i + this.$anchorCell.nodeAfter.attrs.colspan, l = o + this.$headCell.nodeAfter.attrs.colspan;
    return Math.max(s, l) == n.width;
  }
  eq(e) {
    return e instanceof Bt && e.$anchorCell.pos == this.$anchorCell.pos && e.$headCell.pos == this.$headCell.pos;
  }
  static rowSelection(e, n = e) {
    const r = e.node(-1), i = oe.get(r), o = e.start(-1), s = i.findCell(e.pos - o), l = i.findCell(n.pos - o), a = e.node(0);
    return s.left <= l.left ? (s.left > 0 && (e = a.resolve(o + i.map[s.top * i.width])), l.right < i.width && (n = a.resolve(o + i.map[i.width * (l.top + 1) - 1]))) : (l.left > 0 && (n = a.resolve(o + i.map[l.top * i.width])), s.right < i.width && (e = a.resolve(o + i.map[i.width * (s.top + 1) - 1]))), new Bt(e, n);
  }
  toJSON() {
    return {
      type: "cell",
      anchor: this.$anchorCell.pos,
      head: this.$headCell.pos
    };
  }
  static fromJSON(e, n) {
    return new Bt(e.resolve(n.anchor), e.resolve(n.head));
  }
  static create(e, n, r = n) {
    return new Bt(e.resolve(n), e.resolve(r));
  }
  getBookmark() {
    return new NC(this.$anchorCell.pos, this.$headCell.pos);
  }
};
ae.prototype.visible = !1;
J.jsonID("cell", ae);
var NC = class am {
  constructor(e, n) {
    this.anchor = e, this.head = n;
  }
  map(e) {
    return new am(e.map(this.anchor), e.map(this.head));
  }
  resolve(e) {
    const n = e.resolve(this.anchor), r = e.resolve(this.head);
    return n.parent.type.spec.tableRole == "row" && r.parent.type.spec.tableRole == "row" && n.index() < n.parent.childCount && r.index() < r.parent.childCount && Vu(n, r) ? new ae(n, r) : J.near(r, 1);
  }
};
function TC(t) {
  if (!(t.selection instanceof ae)) return null;
  const e = [];
  return t.selection.forEachCell((n, r) => {
    e.push(Te.node(r, r + n.nodeSize, { class: "selectedCell" }));
  }), ce.create(t.doc, e);
}
function vC({ $from: t, $to: e }) {
  if (t.pos == e.pos || t.pos < e.pos - 6) return !1;
  let n = t.pos, r = e.pos, i = t.depth;
  for (; i >= 0 && !(t.after(i + 1) < t.end(i)); i--, n++) ;
  for (let o = e.depth; o >= 0 && !(e.before(o + 1) > e.start(o)); o--, r--) ;
  return n == r && /row|table/.test(t.node(i).type.spec.tableRole);
}
function IC({ $from: t, $to: e }) {
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
function AC(t, e, n) {
  const r = (e || t).selection, i = (e || t).doc;
  let o, s;
  if (r instanceof K && (s = r.node.type.spec.tableRole)) {
    if (s == "cell" || s == "header_cell") o = ae.create(i, r.from);
    else if (s == "row") {
      const l = i.resolve(r.from + 1);
      o = ae.rowSelection(l, l);
    } else if (!n) {
      const l = oe.get(r.node), a = r.from + 1, u = a + l.map[l.width * l.height - 1];
      o = ae.create(i, a + 1, u);
    }
  } else r instanceof G && vC(r) ? o = G.create(i, r.from) : r instanceof G && IC(r) && (o = G.create(i, r.$from.start(), r.$from.end()));
  return o && (e || (e = t.tr)).setSelection(o), e;
}
const EC = new Re("fix-tables");
function um(t, e, n, r) {
  const i = t.childCount, o = e.childCount;
  e: for (let s = 0, l = 0; s < o; s++) {
    const a = e.child(s);
    for (let u = l, c = Math.min(i, s + 3); u < c; u++) if (t.child(u) == a) {
      l = u + 1, n += a.nodeSize;
      continue e;
    }
    r(a, n), l < i && t.child(l).sameMarkup(a) ? um(t.child(l), a, n + 1, r) : a.nodesBetween(0, a.content.size, r, n + 1), n += a.nodeSize;
  }
}
function OC(t, e) {
  let n;
  const r = (i, o) => {
    i.type.spec.tableRole == "table" && (n = DC(t, i, o, n));
  };
  return e ? e.doc != t.doc && um(e.doc, t.doc, 0, r) : t.doc.descendants(r), n;
}
function DC(t, e, n, r) {
  const i = oe.get(e);
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
      r.setNodeMarkup(r.mapping.map(n + 1 + u.pos), null, sr(f, f.colspan - u.n, u.n));
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
      for (let y = 0; y < d; y++) {
        const g = Be(t.schema)[h].createAndFill();
        g && p.push(g);
      }
      const m = (a == 0 || s == a - 1) && l == a ? u + 1 : f - 1;
      r.insert(r.mapping.map(m), p);
    }
    u = f;
  }
  return r.setMeta(EC, { fixTables: !0 });
}
function cm(t) {
  const e = oe.get(t), n = [], r = e.height, i = e.width;
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
function fm(t, e) {
  const n = [], r = oe.get(t), i = r.height, o = r.width;
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
function hm(t, e, n, r) {
  const i = e[0] > n[0] ? -1 : 1, o = t.splice(e[0], e.length), s = o.length % 2 === 0 ? 1 : 0;
  let l;
  return l = i === -1 ? n[0] : n[n.length - 1] - s, t.splice(l, 0, ...o), t;
}
function ko(t) {
  return RC((e) => e.type.spec.tableRole === "table", t);
}
function RC(t, e) {
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
function mr(t, e) {
  const n = ko(e.$from);
  if (!n) return;
  const r = oe.get(n.node);
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
function gr(t, e) {
  const n = ko(e.$from);
  if (!n) return;
  const r = oe.get(n.node);
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
function jf(t, e, n = e) {
  let r = e, i = n;
  for (let c = e; c >= 0; c--) {
    const f = mr(c, t.selection);
    f && f.forEach((d) => {
      const h = d.node.attrs.colspan + c - 1;
      h >= r && (r = c), h > i && (i = h);
    });
  }
  for (let c = e; c <= i; c++) {
    const f = mr(c, t.selection);
    f && f.forEach((d) => {
      const h = d.node.attrs.colspan + c - 1;
      d.node.attrs.colspan > 1 && h > i && (i = h);
    });
  }
  const o = [];
  for (let c = r; c <= i; c++) {
    const f = mr(c, t.selection);
    f && f.length > 0 && o.push(c);
  }
  r = o[0], i = o[o.length - 1];
  const s = mr(r, t.selection), l = gr(0, t.selection);
  if (!s || !l) return;
  const a = t.doc.resolve(s[s.length - 1].pos);
  let u;
  for (let c = i; c >= r; c--) {
    const f = mr(c, t.selection);
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
function qf(t, e, n = e) {
  let r = e, i = n;
  for (let c = e; c >= 0; c--) {
    const f = gr(c, t.selection);
    f && f.forEach((d) => {
      const h = d.node.attrs.rowspan + c - 1;
      h >= r && (r = c), h > i && (i = h);
    });
  }
  for (let c = e; c <= i; c++) {
    const f = gr(c, t.selection);
    f && f.forEach((d) => {
      const h = d.node.attrs.rowspan + c - 1;
      d.node.attrs.rowspan > 1 && h > i && (i = h);
    });
  }
  const o = [];
  for (let c = r; c <= i; c++) {
    const f = gr(c, t.selection);
    f && f.length > 0 && o.push(c);
  }
  r = o[0], i = o[o.length - 1];
  const s = gr(r, t.selection), l = mr(0, t.selection);
  if (!s || !l) return;
  const a = t.doc.resolve(s[s.length - 1].pos);
  let u;
  for (let c = i; c >= r; c--) {
    const f = gr(c, t.selection);
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
function Wf(t) {
  return t[0].map((e, n) => t.map((r) => r[n]));
}
function LC(t) {
  var e, n;
  const { tr: r, originIndex: i, targetIndex: o, select: s, pos: l } = t, a = ko(r.doc.resolve(l));
  if (!a) return !1;
  const u = (e = jf(r, i)) === null || e === void 0 ? void 0 : e.indexes, c = (n = jf(r, o)) === null || n === void 0 ? void 0 : n.indexes;
  if (!u || !c || u.includes(o)) return !1;
  const f = PC(a.node, u, c);
  if (r.replaceWith(a.pos, a.pos + a.node.nodeSize, f), !s) return !0;
  const d = oe.get(f), h = a.start, p = o, m = d.positionAt(d.height - 1, p, f), y = r.doc.resolve(h + m), g = d.positionAt(0, p, f), E = r.doc.resolve(h + g);
  return r.setSelection(ae.colSelection(y, E)), !0;
}
function PC(t, e, n, r) {
  let i = Wf(cm(t));
  return i = hm(i, e, n), i = Wf(i), fm(t, i);
}
function zC(t) {
  var e, n;
  const { tr: r, originIndex: i, targetIndex: o, select: s, pos: l } = t, a = ko(r.doc.resolve(l));
  if (!a) return !1;
  const u = (e = qf(r, i)) === null || e === void 0 ? void 0 : e.indexes, c = (n = qf(r, o)) === null || n === void 0 ? void 0 : n.indexes;
  if (!u || !c || u.includes(o)) return !1;
  const f = BC(a.node, u, c);
  if (r.replaceWith(a.pos, a.pos + a.node.nodeSize, f), !s) return !0;
  const d = oe.get(f), h = a.start, p = o, m = d.positionAt(p, d.width - 1, f), y = r.doc.resolve(h + m), g = d.positionAt(p, 0, f), E = r.doc.resolve(h + g);
  return r.setSelection(ae.rowSelection(y, E)), !0;
}
function BC(t, e, n, r) {
  let i = cm(t);
  return i = hm(i, e, n), fm(t, i);
}
function Lt(t) {
  const e = t.selection, n = Ls(t), r = n.node(-1), i = n.start(-1), o = oe.get(r);
  return {
    ...e instanceof ae ? o.rectBetween(e.$anchorCell.pos - i, e.$headCell.pos - i) : o.findCell(n.pos - i),
    tableStart: i,
    map: o,
    table: r
  };
}
function dm(t, { map: e, tableStart: n, table: r }, i) {
  let o = i > 0 ? -1 : 0;
  MC(e, r, i + o) && (o = i == 0 || i == e.width ? null : 0);
  for (let s = 0; s < e.height; s++) {
    const l = s * e.width + i;
    if (i > 0 && i < e.width && e.map[l - 1] == e.map[l]) {
      const a = e.map[l], u = r.nodeAt(a);
      t.setNodeMarkup(t.mapping.map(n + a), null, SC(u.attrs, i - e.colCount(a))), s += u.attrs.rowspan - 1;
    } else {
      const a = o == null ? Be(r.type.schema).cell : r.nodeAt(e.map[l + o]).type, u = e.positionAt(s, i, r);
      t.insert(t.mapping.map(n + u), a.createAndFill());
    }
  }
  return t;
}
function pm(t, e) {
  if (!ve(t)) return !1;
  if (e) {
    const n = Lt(t);
    e(dm(t.tr, n, n.left));
  }
  return !0;
}
function mm(t, e) {
  if (!ve(t)) return !1;
  if (e) {
    const n = Lt(t);
    e(dm(t.tr, n, n.right));
  }
  return !0;
}
function FC(t, { map: e, table: n, tableStart: r }, i) {
  const o = t.mapping.maps.length;
  for (let s = 0; s < e.height; ) {
    const l = s * e.width + i, a = e.map[l], u = n.nodeAt(a), c = u.attrs;
    if (i > 0 && e.map[l - 1] == a || i < e.width - 1 && e.map[l + 1] == a) t.setNodeMarkup(t.mapping.slice(o).map(r + a), null, sr(c, i - e.colCount(a)));
    else {
      const f = t.mapping.slice(o).map(r + a);
      t.delete(f, f + u.nodeSize);
    }
    s += c.rowspan;
  }
}
function gm(t, e) {
  if (!ve(t)) return !1;
  if (e) {
    const n = Lt(t), r = t.tr;
    if (n.left == 0 && n.right == n.map.width) return !1;
    for (let i = n.right - 1; FC(r, n, i), i != n.left; i--) {
      const o = n.tableStart ? r.doc.nodeAt(n.tableStart - 1) : r.doc;
      if (!o) throw new RangeError("No table found");
      n.table = o, n.map = oe.get(o);
    }
    e(r);
  }
  return !0;
}
function $C(t, e, n) {
  var r;
  const i = Be(e.type.schema).header_cell;
  for (let o = 0; o < t.width; o++) if (((r = e.nodeAt(t.map[o + n * t.width])) === null || r === void 0 ? void 0 : r.type) != i) return !1;
  return !0;
}
function ym(t, { map: e, tableStart: n, table: r }, i) {
  let o = n;
  for (let u = 0; u < i; u++) o += r.child(u).nodeSize;
  const s = [];
  let l = i > 0 ? -1 : 0;
  $C(e, r, i + l) && (l = i == 0 || i == e.height ? null : 0);
  for (let u = 0, c = e.width * i; u < e.width; u++, c++) if (i > 0 && i < e.height && e.map[c] == e.map[c - e.width]) {
    const f = e.map[c], d = r.nodeAt(f).attrs;
    t.setNodeMarkup(n + f, null, {
      ...d,
      rowspan: d.rowspan + 1
    }), u += d.colspan - 1;
  } else {
    var a;
    const f = l == null ? Be(r.type.schema).cell : (a = r.nodeAt(e.map[c + l * e.width])) === null || a === void 0 ? void 0 : a.type, d = f == null ? void 0 : f.createAndFill();
    d && s.push(d);
  }
  return t.insert(o, Be(r.type.schema).row.create(null, s)), t;
}
function _C(t, e) {
  if (!ve(t)) return !1;
  if (e) {
    const n = Lt(t);
    e(ym(t.tr, n, n.top));
  }
  return !0;
}
function VC(t, e) {
  if (!ve(t)) return !1;
  if (e) {
    const n = Lt(t);
    e(ym(t.tr, n, n.bottom));
  }
  return !0;
}
function HC(t, { map: e, table: n, tableStart: r }, i) {
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
        }, d.content), m = e.positionAt(i + 1, u, n);
        t.insert(t.mapping.slice(l).map(r + m), p), u += h.colspan - 1;
      }
    }
  }
}
function km(t, e) {
  if (!ve(t)) return !1;
  if (e) {
    const n = Lt(t), r = t.tr;
    if (n.top == 0 && n.bottom == n.map.height) return !1;
    for (let i = n.bottom - 1; HC(r, n, i), i != n.top; i--) {
      const o = n.tableStart ? r.doc.nodeAt(n.tableStart - 1) : r.doc;
      if (!o) throw new RangeError("No table found");
      n.table = o, n.map = oe.get(n.table);
    }
    e(r);
  }
  return !0;
}
function jC(t, e) {
  return function(n, r) {
    if (!ve(n)) return !1;
    const i = Ls(n);
    if (i.nodeAfter.attrs[t] === e) return !1;
    if (r) {
      const o = n.tr;
      n.selection instanceof ae ? n.selection.forEachCell((s, l) => {
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
function qC(t) {
  return function(e, n) {
    if (!ve(e)) return !1;
    if (n) {
      const r = Be(e.schema), i = Lt(e), o = e.tr, s = i.map.cellsInRect(t == "column" ? {
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
function Kf(t, e, n) {
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
function Hu(t, e) {
  return e = e || { useDeprecatedLogic: !1 }, e.useDeprecatedLogic ? qC(t) : function(n, r) {
    if (!ve(n)) return !1;
    if (r) {
      const i = Be(n.schema), o = Lt(n), s = n.tr, l = Kf("row", o, i), a = Kf("column", o, i), u = (t === "column" ? l : t === "row" && a) ? 1 : 0, c = t == "column" ? {
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
Hu("row", { useDeprecatedLogic: !0 });
Hu("column", { useDeprecatedLogic: !0 });
Hu("cell", { useDeprecatedLogic: !0 });
function WC(t, e) {
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
function bm(t) {
  return function(e, n) {
    if (!ve(e)) return !1;
    const r = WC(Ls(e), t);
    if (r == null) return !1;
    if (n) {
      const i = e.doc.resolve(r);
      n(e.tr.setSelection(G.between(i, CC(i))).scrollIntoView());
    }
    return !0;
  };
}
function KC(t, e) {
  const n = t.selection.$anchor;
  for (let r = n.depth; r > 0; r--) if (n.node(r).type.spec.tableRole == "table")
    return e && e(t.tr.delete(n.before(r), n.after(r)).scrollIntoView()), !0;
  return !1;
}
function Ro(t, e) {
  const n = t.selection;
  if (!(n instanceof ae)) return !1;
  if (e) {
    const r = t.tr, i = Be(t.schema).cell.createAndFill().content;
    n.forEachCell((o, s) => {
      o.content.eq(i) || r.replace(r.mapping.map(s + 1), r.mapping.map(s + o.nodeSize - 1), new P(i, 0, 0));
    }), r.docChanged && e(r);
  }
  return !0;
}
function UC(t) {
  return (e, n) => {
    const { from: r, to: i, select: o = !0, pos: s = e.selection.from } = t, l = e.tr;
    return zC({
      tr: l,
      originIndex: r,
      targetIndex: i,
      select: o,
      pos: s
    }) ? (n == null || n(l), !0) : !1;
  };
}
function JC(t) {
  return (e, n) => {
    const { from: r, to: i, select: o = !0, pos: s = e.selection.from } = t, l = e.tr;
    return LC({
      tr: l,
      originIndex: r,
      targetIndex: i,
      select: o,
      pos: s
    }) ? (n == null || n(l), !0) : !1;
  };
}
function GC(t) {
  if (t.size === 0) return null;
  let { content: e, openStart: n, openEnd: r } = t;
  for (; e.childCount == 1 && (n > 0 && r > 0 || e.child(0).type.spec.tableRole == "table"); )
    n--, r--, e = e.child(0).content;
  const i = e.child(0), o = i.type.spec.tableRole, s = i.type.schema, l = [];
  if (o == "row") for (let a = 0; a < e.childCount; a++) {
    let u = e.child(a).content;
    const c = a ? 0 : Math.max(0, n - 1), f = a < e.childCount - 1 ? 0 : Math.max(0, r - 1);
    (c || f) && (u = ma(Be(s).row, new P(u, c, f)).content), l.push(u);
  }
  else if (o == "cell" || o == "header_cell") l.push(n || r ? ma(Be(s).row, new P(e, n, r)).content : e);
  else return null;
  return YC(s, l);
}
function YC(t, e) {
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
      const o = Be(t).cell.createAndFill(), s = [];
      for (let l = n[i]; l < r; l++) s.push(o);
      e[i] = e[i].append(A.from(s));
    }
  return {
    height: e.length,
    width: r,
    rows: e
  };
}
function ma(t, e) {
  const n = t.createAndFill();
  return new Nd(n).replace(0, n.content.size, e).doc;
}
function QC({ width: t, height: e, rows: n }, r, i) {
  if (t != r) {
    const o = [], s = [];
    for (let l = 0; l < n.length; l++) {
      const a = n[l], u = [];
      for (let c = o[l] || 0, f = 0; c < r; f++) {
        let d = a.child(f % a.childCount);
        c + d.attrs.colspan > r && (d = d.type.createChecked(sr(d.attrs, d.attrs.colspan, c + d.attrs.colspan - r), d.content)), u.push(d), c += d.attrs.colspan;
        for (let h = 1; h < d.attrs.rowspan; h++) o[l + h] = (o[l + h] || 0) + d.attrs.colspan;
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
function XC(t, e, n, r, i, o, s) {
  const l = t.doc.type.schema, a = Be(l);
  let u, c;
  if (i > e.width) for (let f = 0, d = 0; f < e.height; f++) {
    const h = n.child(f);
    d += h.nodeSize;
    const p = [];
    let m;
    h.lastChild == null || h.lastChild.type == a.cell ? m = u || (u = a.cell.createAndFill()) : m = c || (c = a.header_cell.createAndFill());
    for (let y = e.width; y < i; y++) p.push(m);
    t.insert(t.mapping.slice(s).map(d - 1 + r), p);
  }
  if (o > e.height) {
    const f = [];
    for (let p = 0, m = (e.height - 1) * e.width; p < Math.max(e.width, i); p++) {
      const y = p >= e.width ? !1 : n.nodeAt(e.map[m + p]).type == a.header_cell;
      f.push(y ? c || (c = a.header_cell.createAndFill()) : u || (u = a.cell.createAndFill()));
    }
    const d = a.row.create(null, A.from(f)), h = [];
    for (let p = e.height; p < o; p++) h.push(d);
    t.insert(t.mapping.slice(s).map(r + n.nodeSize - 2), h);
  }
  return !!(u || c);
}
function Uf(t, e, n, r, i, o, s, l) {
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
function Jf(t, e, n, r, i, o, s, l) {
  if (s == 0 || s == e.width) return !1;
  let a = !1;
  for (let u = i; u < o; u++) {
    const c = u * e.width + s, f = e.map[c];
    if (e.map[c - 1] == f) {
      a = !0;
      const d = n.nodeAt(f), h = e.colCount(f), p = t.mapping.slice(l).map(f + r);
      t.setNodeMarkup(p, null, sr(d.attrs, s - h, d.attrs.colspan - (s - h))), t.insert(p + d.nodeSize, d.type.createAndFill(sr(d.attrs, 0, s - h))), u += d.attrs.rowspan - 1;
    }
  }
  return a;
}
function Gf(t, e, n, r, i) {
  let o = n ? t.doc.nodeAt(n - 1) : t.doc;
  if (!o) throw new Error("No table found");
  let s = oe.get(o);
  const { top: l, left: a } = r, u = a + i.width, c = l + i.height, f = t.tr;
  let d = 0;
  function h() {
    if (o = n ? f.doc.nodeAt(n - 1) : f.doc, !o) throw new Error("No table found");
    s = oe.get(o), d = f.mapping.maps.length;
  }
  XC(f, s, o, n, u, c, d) && h(), Uf(f, s, o, n, a, u, l, d) && h(), Uf(f, s, o, n, a, u, c, d) && h(), Jf(f, s, o, n, l, c, a, d) && h(), Jf(f, s, o, n, l, c, u, d) && h();
  for (let p = l; p < c; p++) {
    const m = s.positionAt(p, a, o), y = s.positionAt(p, u, o);
    f.replace(f.mapping.slice(d).map(m + n), f.mapping.slice(d).map(y + n), new P(i.rows[p - l], 0, 0));
  }
  h(), f.setSelection(new ae(f.doc.resolve(n + s.positionAt(l, a, o)), f.doc.resolve(n + s.positionAt(c - 1, u - 1, o)))), e(f);
}
const ZC = _d({
  ArrowLeft: Lo("horiz", -1),
  ArrowRight: Lo("horiz", 1),
  ArrowUp: Lo("vert", -1),
  ArrowDown: Lo("vert", 1),
  "Shift-ArrowLeft": Po("horiz", -1),
  "Shift-ArrowRight": Po("horiz", 1),
  "Shift-ArrowUp": Po("vert", -1),
  "Shift-ArrowDown": Po("vert", 1),
  Backspace: Ro,
  "Mod-Backspace": Ro,
  Delete: Ro,
  "Mod-Delete": Ro
});
function Yo(t, e, n) {
  return n.eq(t.selection) ? !1 : (e && e(t.tr.setSelection(n).scrollIntoView()), !0);
}
function Lo(t, e) {
  return (n, r, i) => {
    if (!i) return !1;
    const o = n.selection;
    if (o instanceof ae) return Yo(n, r, J.near(o.$headCell, e));
    if (t != "horiz" && !o.empty) return !1;
    const s = wm(i, t, e);
    if (s == null) return !1;
    if (t == "horiz") return Yo(n, r, J.near(n.doc.resolve(o.head + e), e));
    {
      const l = n.doc.resolve(s), a = lm(l, t, e);
      let u;
      return a ? u = J.near(a, 1) : e < 0 ? u = J.near(n.doc.resolve(l.before(-1)), -1) : u = J.near(n.doc.resolve(l.after(-1)), 1), Yo(n, r, u);
    }
  };
}
function Po(t, e) {
  return (n, r, i) => {
    if (!i) return !1;
    const o = n.selection;
    let s;
    if (o instanceof ae) s = o;
    else {
      const a = wm(i, t, e);
      if (a == null) return !1;
      s = new ae(n.doc.resolve(a));
    }
    const l = lm(s.$headCell, t, e);
    return l ? Yo(n, r, new ae(s.$anchorCell, l)) : !1;
  };
}
function eS(t, e) {
  const n = t.state.doc, r = Gr(n.resolve(e));
  return r ? (t.dispatch(t.state.tr.setSelection(new ae(r))), !0) : !1;
}
function tS(t, e, n) {
  if (!ve(t.state)) return !1;
  let r = GC(n);
  const i = t.state.selection;
  if (i instanceof ae) {
    r || (r = {
      width: 1,
      height: 1,
      rows: [A.from(ma(Be(t.state.schema).cell, n))]
    });
    const o = i.$anchorCell.node(-1), s = i.$anchorCell.start(-1), l = oe.get(o).rectBetween(i.$anchorCell.pos - s, i.$headCell.pos - s);
    return r = QC(r, l.right - l.left, l.bottom - l.top), Gf(t.state, t.dispatch, s, l, r), !0;
  } else if (r) {
    const o = Ls(t.state), s = o.start(-1);
    return Gf(t.state, t.dispatch, s, oe.get(o.node(-1)).findCell(o.pos - s), r), !0;
  } else return !1;
}
function nS(t, e) {
  var n;
  if (e.button != 0 || e.ctrlKey || e.metaKey) return;
  const r = Yf(t, e.target);
  let i;
  if (e.shiftKey && t.state.selection instanceof ae)
    o(t.state.selection.$anchorCell, e), e.preventDefault();
  else if (e.shiftKey && r && (i = Gr(t.state.selection.$anchor)) != null && ((n = Cl(t, e)) === null || n === void 0 ? void 0 : n.pos) != i.pos)
    o(i, e), e.preventDefault();
  else if (!r) return;
  function o(a, u) {
    let c = Cl(t, u);
    const f = fn.getState(t.state) == null;
    if (!c || !Vu(a, c)) if (f) c = a;
    else return;
    const d = new ae(a, c);
    if (f || !t.state.selection.eq(d)) {
      const h = t.state.tr.setSelection(d);
      f && h.setMeta(fn, a.pos), t.dispatch(h);
    }
  }
  function s() {
    t.root.removeEventListener("mouseup", s), t.root.removeEventListener("dragstart", s), t.root.removeEventListener("mousemove", l), fn.getState(t.state) != null && t.dispatch(t.state.tr.setMeta(fn, -1));
  }
  function l(a) {
    const u = a, c = fn.getState(t.state);
    let f;
    if (c != null) f = t.state.doc.resolve(c);
    else if (Yf(t, u.target) != r && (f = Cl(t, e), !f))
      return s();
    f && o(f, u);
  }
  t.root.addEventListener("mouseup", s), t.root.addEventListener("dragstart", s), t.root.addEventListener("mousemove", l);
}
function wm(t, e, n) {
  if (!(t.state.selection instanceof G)) return null;
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
function Yf(t, e) {
  for (; e && e != t.dom; e = e.parentNode) if (e.nodeName == "TD" || e.nodeName == "TH") return e;
  return null;
}
function Cl(t, e) {
  const n = t.posAtCoords({
    left: e.clientX,
    top: e.clientY
  });
  if (!n) return null;
  let { inside: r, pos: i } = n;
  return r >= 0 && Gr(t.state.doc.resolve(r)) || Gr(t.state.doc.resolve(i));
}
var rS = class {
  constructor(t, e) {
    this.node = t, this.defaultCellMinWidth = e, this.dom = document.createElement("div"), this.dom.className = "tableWrapper", this.table = this.dom.appendChild(document.createElement("table")), this.table.style.setProperty("--default-cell-min-width", `${e}px`), this.colgroup = this.table.appendChild(document.createElement("colgroup")), ga(t, this.colgroup, this.table, e), this.contentDOM = this.table.appendChild(document.createElement("tbody"));
  }
  update(t) {
    return t.type != this.node.type ? !1 : (this.node = t, ga(t, this.colgroup, this.table, this.defaultCellMinWidth), !0);
  }
  ignoreMutation(t) {
    return t.type == "attributes" && (t.target == this.table || this.colgroup.contains(t.target));
  }
};
function ga(t, e, n, r, i, o) {
  let s = 0, l = !0, a = e.firstChild;
  const u = t.firstChild;
  if (u) {
    for (let f = 0, d = 0; f < u.childCount; f++) {
      const { colspan: h, colwidth: p } = u.child(f).attrs;
      for (let m = 0; m < h; m++, d++) {
        const y = i == d ? o : p && p[m], g = y ? y + "px" : "";
        if (s += y || r, y || (l = !1), a)
          a.style.width != g && (a.style.width = g), a = a.nextSibling;
        else {
          const E = document.createElement("col");
          E.style.width = g, e.appendChild(E);
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
const et = new Re("tableColumnResizing");
function iS({ handleWidth: t = 5, cellMinWidth: e = 25, defaultCellMinWidth: n = 100, View: r = rS, lastColumnResizable: i = !0 } = {}) {
  const o = new Ie({
    key: et,
    state: {
      init(s, l) {
        var a;
        const u = (a = o.spec) === null || a === void 0 || (a = a.props) === null || a === void 0 ? void 0 : a.nodeViews, c = Be(l.schema).table.name;
        return r && u && (u[c] = (f, d) => new r(f, n, d)), new oS(-1, !1);
      },
      apply(s, l) {
        return l.apply(s);
      }
    },
    props: {
      attributes: (s) => {
        const l = et.getState(s);
        return l && l.activeHandle > -1 ? { class: "resize-cursor" } : {};
      },
      handleDOMEvents: {
        mousemove: (s, l) => {
          sS(s, l, t, i);
        },
        mouseleave: (s) => {
          lS(s);
        },
        mousedown: (s, l) => {
          aS(s, l, e, n);
        }
      },
      decorations: (s) => {
        const l = et.getState(s);
        if (l && l.activeHandle > -1) return dS(s, l.activeHandle);
      },
      nodeViews: {}
    }
  });
  return o;
}
var oS = class Qo {
  constructor(e, n) {
    this.activeHandle = e, this.dragging = n;
  }
  apply(e) {
    const n = this, r = e.getMeta(et);
    if (r && r.setHandle != null) return new Qo(r.setHandle, !1);
    if (r && r.setDragging !== void 0) return new Qo(n.activeHandle, r.setDragging);
    if (n.activeHandle > -1 && e.docChanged) {
      let i = e.mapping.map(n.activeHandle, -1);
      return pa(e.doc.resolve(i)) || (i = -1), new Qo(i, n.dragging);
    }
    return n;
  }
};
function sS(t, e, n, r) {
  if (!t.editable) return;
  const i = et.getState(t.state);
  if (i && !i.dragging) {
    const o = cS(e.target);
    let s = -1;
    if (o) {
      const { left: l, right: a } = o.getBoundingClientRect();
      e.clientX - l <= n ? s = Qf(t, e, "left", n) : a - e.clientX <= n && (s = Qf(t, e, "right", n));
    }
    if (s != i.activeHandle) {
      if (!r && s !== -1) {
        const l = t.state.doc.resolve(s), a = l.node(-1), u = oe.get(a), c = l.start(-1);
        if (u.colCount(l.pos - c) + l.nodeAfter.attrs.colspan - 1 == u.width - 1) return;
      }
      xm(t, s);
    }
  }
}
function lS(t) {
  if (!t.editable) return;
  const e = et.getState(t.state);
  e && e.activeHandle > -1 && !e.dragging && xm(t, -1);
}
function aS(t, e, n, r) {
  var i;
  if (!t.editable) return !1;
  const o = (i = t.dom.ownerDocument.defaultView) !== null && i !== void 0 ? i : window, s = et.getState(t.state);
  if (!s || s.activeHandle == -1 || s.dragging) return !1;
  const l = t.state.doc.nodeAt(s.activeHandle), a = uS(t, s.activeHandle, l.attrs);
  t.dispatch(t.state.tr.setMeta(et, { setDragging: {
    startX: e.clientX,
    startWidth: a
  } }));
  function u(f) {
    o.removeEventListener("mouseup", u), o.removeEventListener("mousemove", c);
    const d = et.getState(t.state);
    d != null && d.dragging && (fS(t, d.activeHandle, Xf(d.dragging, f, n)), t.dispatch(t.state.tr.setMeta(et, { setDragging: null })));
  }
  function c(f) {
    if (!f.which) return u(f);
    const d = et.getState(t.state);
    if (d && d.dragging) {
      const h = Xf(d.dragging, f, n);
      Zf(t, d.activeHandle, h, r);
    }
  }
  return Zf(t, s.activeHandle, a, r), o.addEventListener("mouseup", u), o.addEventListener("mousemove", c), e.preventDefault(), !0;
}
function uS(t, e, { colspan: n, colwidth: r }) {
  const i = r && r[r.length - 1];
  if (i) return i;
  const o = t.domAtPos(e);
  let s = o.node.childNodes[o.offset].offsetWidth, l = n;
  if (r)
    for (let a = 0; a < n; a++) r[a] && (s -= r[a], l--);
  return s / l;
}
function cS(t) {
  for (; t && t.nodeName != "TD" && t.nodeName != "TH"; ) t = t.classList && t.classList.contains("ProseMirror") ? null : t.parentNode;
  return t;
}
function Qf(t, e, n, r) {
  const i = n == "right" ? -r : r, o = t.posAtCoords({
    left: e.clientX + i,
    top: e.clientY
  });
  if (!o) return -1;
  const { pos: s } = o, l = Gr(t.state.doc.resolve(s));
  if (!l) return -1;
  if (n == "right") return l.pos;
  const a = oe.get(l.node(-1)), u = l.start(-1), c = a.map.indexOf(l.pos - u);
  return c % a.width == 0 ? -1 : u + a.map[c - 1];
}
function Xf(t, e, n) {
  const r = e.clientX - t.startX;
  return Math.max(n, t.startWidth + r);
}
function xm(t, e) {
  t.dispatch(t.state.tr.setMeta(et, { setHandle: e }));
}
function fS(t, e, n) {
  const r = t.state.doc.resolve(e), i = r.node(-1), o = oe.get(i), s = r.start(-1), l = o.colCount(r.pos - s) + r.nodeAfter.attrs.colspan - 1, a = t.state.tr;
  for (let u = 0; u < o.height; u++) {
    const c = u * o.width + l;
    if (u && o.map[c] == o.map[c - o.width]) continue;
    const f = o.map[c], d = i.nodeAt(f).attrs, h = d.colspan == 1 ? 0 : l - o.colCount(f);
    if (d.colwidth && d.colwidth[h] == n) continue;
    const p = d.colwidth ? d.colwidth.slice() : hS(d.colspan);
    p[h] = n, a.setNodeMarkup(s + f, null, {
      ...d,
      colwidth: p
    });
  }
  a.docChanged && t.dispatch(a);
}
function Zf(t, e, n, r) {
  const i = t.state.doc.resolve(e), o = i.node(-1), s = i.start(-1), l = oe.get(o).colCount(i.pos - s) + i.nodeAfter.attrs.colspan - 1;
  let a = t.domAtPos(i.start(-1)).node;
  for (; a && a.nodeName != "TABLE"; ) a = a.parentNode;
  a && ga(o, a.firstChild, a, r, l, n);
}
function hS(t) {
  return Array(t).fill(0);
}
function dS(t, e) {
  const n = [], r = t.doc.resolve(e), i = r.node(-1);
  if (!i) return ce.empty;
  const o = oe.get(i), s = r.start(-1), l = o.colCount(r.pos - s) + r.nodeAfter.attrs.colspan - 1;
  for (let u = 0; u < o.height; u++) {
    const c = l + u * o.width;
    if ((l == o.width - 1 || o.map[c] != o.map[c + 1]) && (u == 0 || o.map[c] != o.map[c - o.width])) {
      var a;
      const f = o.map[c], d = s + f + i.nodeAt(f).nodeSize - 1, h = document.createElement("div");
      h.className = "column-resize-handle", !((a = et.getState(t)) === null || a === void 0) && a.dragging && n.push(Te.node(s + f, s + f + i.nodeAt(f).nodeSize, { class: "column-resize-dragging" })), n.push(Te.widget(d, h));
    }
  }
  return ce.create(t.doc, n);
}
function pS({ allowTableNodeSelection: t = !1 } = {}) {
  return new Ie({
    key: fn,
    state: {
      init() {
        return null;
      },
      apply(e, n) {
        const r = e.getMeta(fn);
        if (r != null) return r == -1 ? null : r;
        if (n == null || !e.docChanged) return n;
        const { deleted: i, pos: o } = e.mapping.mapResult(n);
        return i ? null : o;
      }
    },
    props: {
      decorations: TC,
      handleDOMEvents: { mousedown: nS },
      createSelectionBetween(e) {
        return fn.getState(e.state) != null ? e.state.selection : null;
      },
      handleTripleClick: eS,
      handleKeyDown: ZC,
      handlePaste: tS
    },
    appendTransaction(e, n, r) {
      return AC(r, OC(r, n), t);
    }
  });
}
var ps = typeof navigator < "u" ? navigator : null, ju = ps && ps.userAgent || "", mS = /Edge\/(\d+)/.exec(ju), gS = /MSIE \d/.exec(ju), yS = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(ju), kS = !!(gS || yS || mS), bS = !kS && !!ps && /Apple Computer/.test(ps.vendor), Cm = new Re("safari-ime-span"), ya = !1, wS = {
  key: Cm,
  props: {
    decorations: xS,
    handleDOMEvents: {
      compositionstart: () => {
        ya = !0;
      },
      compositionend: () => {
        ya = !1;
      }
    }
  }
};
function xS(t) {
  const { $from: e, $to: n, to: r } = t.selection;
  if (ya && e.sameParent(n)) {
    const i = Te.widget(r, CS, {
      ignoreSelection: !0,
      key: "safari-ime-span"
    });
    return ce.create(t.doc, [i]);
  }
}
function CS(t) {
  const e = t.dom.ownerDocument.createElement("span");
  return e.className = "ProseMirror-safari-ime-span", e;
}
var SS = new Ie(bS ? wS : { key: Cm });
function eh(t, e) {
  const n = String(t);
  if (typeof e != "string")
    throw new TypeError("Expected character");
  let r = 0, i = n.indexOf(e);
  for (; i !== -1; )
    r++, i = n.indexOf(e, i + e.length);
  return r;
}
function MS(t) {
  if (typeof t != "string")
    throw new TypeError("Expected a string");
  return t.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}
function NS(t, e, n) {
  const i = Cs((n || {}).ignore || []), o = TS(e);
  let s = -1;
  for (; ++s < o.length; )
    Na(t, "text", l);
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
    const y = f.children.indexOf(u);
    let g = !1, E = [];
    d.lastIndex = 0;
    let T = d.exec(u.value);
    for (; T; ) {
      const B = T.index, z = {
        index: T.index,
        input: T.input,
        stack: [...c, u]
      };
      let S = h(...T, z);
      if (typeof S == "string" && (S = S.length > 0 ? { type: "text", value: S } : void 0), S === !1 ? d.lastIndex = B + 1 : (p !== B && E.push({
        type: "text",
        value: u.value.slice(p, B)
      }), Array.isArray(S) ? E.push(...S) : S && E.push(S), p = B + T[0].length, g = !0), !d.global)
        break;
      T = d.exec(u.value);
    }
    return g ? (p < u.value.length && E.push({ type: "text", value: u.value.slice(p) }), f.children.splice(y, 1, ...E)) : E = [u], y + E.length;
  }
}
function TS(t) {
  const e = [];
  if (!Array.isArray(t))
    throw new TypeError("Expected find and replace tuple or list of tuples");
  const n = !t[0] || Array.isArray(t[0]) ? t : [t];
  let r = -1;
  for (; ++r < n.length; ) {
    const i = n[r];
    e.push([vS(i[0]), IS(i[1])]);
  }
  return e;
}
function vS(t) {
  return typeof t == "string" ? new RegExp(MS(t), "g") : t;
}
function IS(t) {
  return typeof t == "function" ? t : function() {
    return t;
  };
}
const Sl = "phrasing", Ml = ["autolink", "link", "image", "label"];
function AS() {
  return {
    transforms: [zS],
    enter: {
      literalAutolink: OS,
      literalAutolinkEmail: Nl,
      literalAutolinkHttp: Nl,
      literalAutolinkWww: Nl
    },
    exit: {
      literalAutolink: PS,
      literalAutolinkEmail: LS,
      literalAutolinkHttp: DS,
      literalAutolinkWww: RS
    }
  };
}
function ES() {
  return {
    unsafe: [
      {
        character: "@",
        before: "[+\\-.\\w]",
        after: "[\\-.\\w]",
        inConstruct: Sl,
        notInConstruct: Ml
      },
      {
        character: ".",
        before: "[Ww]",
        after: "[\\-.\\w]",
        inConstruct: Sl,
        notInConstruct: Ml
      },
      {
        character: ":",
        before: "[ps]",
        after: "\\/",
        inConstruct: Sl,
        notInConstruct: Ml
      }
    ]
  };
}
function OS(t) {
  this.enter({ type: "link", title: null, url: "", children: [] }, t);
}
function Nl(t) {
  this.config.enter.autolinkProtocol.call(this, t);
}
function DS(t) {
  this.config.exit.autolinkProtocol.call(this, t);
}
function RS(t) {
  this.config.exit.data.call(this, t);
  const e = this.stack[this.stack.length - 1];
  e.type, e.url = "http://" + this.sliceSerialize(t);
}
function LS(t) {
  this.config.exit.autolinkEmail.call(this, t);
}
function PS(t) {
  this.exit(t);
}
function zS(t) {
  NS(
    t,
    [
      [/(https?:\/\/|www(?=\.))([-.\w]+)([^ \t\r\n]*)/gi, BS],
      [new RegExp("(^|\\\\s|[\\\\u0021-\\\\u002F\\\\u003A-\\\\u0040\\\\u005B-\\\\u0060\\\\u007B-\\\\u007E])([-.\\\\w+]+)@([-\\\\w]+(?:\\\\.[-\\\\w]+)+)", "gu"), FS]
    ],
    { ignore: ["link", "linkReference"] }
  );
}
function BS(t, e, n, r, i) {
  let o = "";
  if (!Sm(i) || (/^w/i.test(e) && (n = e + n, e = "", o = "http://"), !$S(n)))
    return !1;
  const s = _S(n + r);
  if (!s[0]) return !1;
  const l = {
    type: "link",
    title: null,
    url: o + e + s[0],
    children: [{ type: "text", value: e + s[0] }]
  };
  return s[1] ? [l, { type: "text", value: s[1] }] : l;
}
function FS(t, e, n, r) {
  return (
    // Not an expected previous character.
    !Sm(r, !0) || // Label ends in not allowed character.
    /[-\d_]$/.test(n) ? !1 : {
      type: "link",
      title: null,
      url: "mailto:" + e + "@" + n,
      children: [{ type: "text", value: e + "@" + n }]
    }
  );
}
function $S(t) {
  const e = t.split(".");
  return !(e.length < 2 || e[e.length - 1] && (/_/.test(e[e.length - 1]) || !/[a-zA-Z\d]/.test(e[e.length - 1])) || e[e.length - 2] && (/_/.test(e[e.length - 2]) || !/[a-zA-Z\d]/.test(e[e.length - 2])));
}
function _S(t) {
  const e = /[!"&'),.:;<>?\]}]+$/.exec(t);
  if (!e)
    return [t, void 0];
  t = t.slice(0, e.index);
  let n = e[0], r = n.indexOf(")");
  const i = eh(t, "(");
  let o = eh(t, ")");
  for (; r !== -1 && i > o; )
    t += n.slice(0, r + 1), n = n.slice(r + 1), r = n.indexOf(")"), o++;
  return [t, n];
}
function Sm(t, e) {
  const n = t.input.charCodeAt(t.index - 1);
  return (t.index === 0 || er(n) || ws(n)) && // If it’s an email, the previous character should not be a slash.
  (!e || n !== 47);
}
Mm.peek = GS;
function VS() {
  this.buffer();
}
function HS(t) {
  this.enter({ type: "footnoteReference", identifier: "", label: "" }, t);
}
function jS() {
  this.buffer();
}
function qS(t) {
  this.enter(
    { type: "footnoteDefinition", identifier: "", label: "", children: [] },
    t
  );
}
function WS(t) {
  const e = this.resume(), n = this.stack[this.stack.length - 1];
  n.type, n.identifier = wt(
    this.sliceSerialize(t)
  ).toLowerCase(), n.label = e;
}
function KS(t) {
  this.exit(t);
}
function US(t) {
  const e = this.resume(), n = this.stack[this.stack.length - 1];
  n.type, n.identifier = wt(
    this.sliceSerialize(t)
  ).toLowerCase(), n.label = e;
}
function JS(t) {
  this.exit(t);
}
function GS() {
  return "[";
}
function Mm(t, e, n, r) {
  const i = n.createTracker(r);
  let o = i.move("[^");
  const s = n.enter("footnoteReference"), l = n.enter("reference");
  return o += i.move(
    n.safe(n.associationId(t), { after: "]", before: o })
  ), l(), s(), o += i.move("]"), o;
}
function YS() {
  return {
    enter: {
      gfmFootnoteCallString: VS,
      gfmFootnoteCall: HS,
      gfmFootnoteDefinitionLabelString: jS,
      gfmFootnoteDefinition: qS
    },
    exit: {
      gfmFootnoteCallString: WS,
      gfmFootnoteCall: KS,
      gfmFootnoteDefinitionLabelString: US,
      gfmFootnoteDefinition: JS
    }
  };
}
function QS(t) {
  let e = !1;
  return t && t.firstLineBlank && (e = !0), {
    handlers: { footnoteDefinition: n, footnoteReference: Mm },
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
        e ? Nm : XS
      )
    )), u(), a;
  }
}
function XS(t, e, n) {
  return e === 0 ? t : Nm(t, e, n);
}
function Nm(t, e, n) {
  return (n ? "" : "    ") + t;
}
const ZS = [
  "autolink",
  "destinationLiteral",
  "destinationRaw",
  "reference",
  "titleQuote",
  "titleApostrophe"
];
Tm.peek = iM;
function eM() {
  return {
    canContainEols: ["delete"],
    enter: { strikethrough: nM },
    exit: { strikethrough: rM }
  };
}
function tM() {
  return {
    unsafe: [
      {
        character: "~",
        inConstruct: "phrasing",
        notInConstruct: ZS
      }
    ],
    handlers: { delete: Tm }
  };
}
function nM(t) {
  this.enter({ type: "delete", children: [] }, t);
}
function rM(t) {
  this.exit(t);
}
function Tm(t, e, n, r) {
  const i = n.createTracker(r), o = n.enter("strikethrough");
  let s = i.move("~~");
  return s += n.containerPhrasing(t, {
    ...i.current(),
    before: s,
    after: "~"
  }), s += i.move("~~"), o(), s;
}
function iM() {
  return "~";
}
function oM(t) {
  return t.length;
}
function sM(t, e) {
  const n = e || {}, r = (n.align || []).concat(), i = n.stringLength || oM, o = [], s = [], l = [], a = [];
  let u = 0, c = -1;
  for (; ++c < t.length; ) {
    const m = [], y = [];
    let g = -1;
    for (t[c].length > u && (u = t[c].length); ++g < t[c].length; ) {
      const E = lM(t[c][g]);
      if (n.alignDelimiters !== !1) {
        const T = i(E);
        y[g] = T, (a[g] === void 0 || T > a[g]) && (a[g] = T);
      }
      m.push(E);
    }
    s[c] = m, l[c] = y;
  }
  let f = -1;
  if (typeof r == "object" && "length" in r)
    for (; ++f < u; )
      o[f] = th(r[f]);
  else {
    const m = th(r);
    for (; ++f < u; )
      o[f] = m;
  }
  f = -1;
  const d = [], h = [];
  for (; ++f < u; ) {
    const m = o[f];
    let y = "", g = "";
    m === 99 ? (y = ":", g = ":") : m === 108 ? y = ":" : m === 114 && (g = ":");
    let E = n.alignDelimiters === !1 ? 1 : Math.max(
      1,
      a[f] - y.length - g.length
    );
    const T = y + "-".repeat(E) + g;
    n.alignDelimiters !== !1 && (E = y.length + E + g.length, E > a[f] && (a[f] = E), h[f] = E), d[f] = T;
  }
  s.splice(1, 0, d), l.splice(1, 0, h), c = -1;
  const p = [];
  for (; ++c < s.length; ) {
    const m = s[c], y = l[c];
    f = -1;
    const g = [];
    for (; ++f < u; ) {
      const E = m[f] || "";
      let T = "", B = "";
      if (n.alignDelimiters !== !1) {
        const z = a[f] - (y[f] || 0), S = o[f];
        S === 114 ? T = " ".repeat(z) : S === 99 ? z % 2 ? (T = " ".repeat(z / 2 + 0.5), B = " ".repeat(z / 2 - 0.5)) : (T = " ".repeat(z / 2), B = T) : B = " ".repeat(z);
      }
      n.delimiterStart !== !1 && !f && g.push("|"), n.padding !== !1 && // Don’t add the opening space if we’re not aligning and the cell is
      // empty: there will be a closing space.
      !(n.alignDelimiters === !1 && E === "") && (n.delimiterStart !== !1 || f) && g.push(" "), n.alignDelimiters !== !1 && g.push(T), g.push(E), n.alignDelimiters !== !1 && g.push(B), n.padding !== !1 && g.push(" "), (n.delimiterEnd !== !1 || f !== u - 1) && g.push("|");
    }
    p.push(
      n.delimiterEnd === !1 ? g.join("").replace(/ +$/, "") : g.join("")
    );
  }
  return p.join(`
`);
}
function lM(t) {
  return t == null ? "" : String(t);
}
function th(t) {
  const e = typeof t == "string" ? t.codePointAt(0) : 0;
  return e === 67 || e === 99 ? 99 : e === 76 || e === 108 ? 108 : e === 82 || e === 114 ? 114 : 0;
}
function aM() {
  return {
    enter: {
      table: uM,
      tableData: nh,
      tableHeader: nh,
      tableRow: fM
    },
    exit: {
      codeText: hM,
      table: cM,
      tableData: Tl,
      tableHeader: Tl,
      tableRow: Tl
    }
  };
}
function uM(t) {
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
function cM(t) {
  this.exit(t), this.data.inTable = void 0;
}
function fM(t) {
  this.enter({ type: "tableRow", children: [] }, t);
}
function Tl(t) {
  this.exit(t);
}
function nh(t) {
  this.enter({ type: "tableCell", children: [] }, t);
}
function hM(t) {
  let e = this.resume();
  this.data.inTable && (e = e.replace(/\\([\\|])/g, dM));
  const n = this.stack[this.stack.length - 1];
  n.type, n.value = e, this.exit(t);
}
function dM(t, e) {
  return e === "|" ? e : t;
}
function pM(t) {
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
  function s(h, p, m, y) {
    return u(c(h, m, y), h.align);
  }
  function l(h, p, m, y) {
    const g = f(h, m, y), E = u([g]);
    return E.slice(0, E.indexOf(`
`));
  }
  function a(h, p, m, y) {
    const g = m.enter("tableCell"), E = m.enter("phrasing"), T = m.containerPhrasing(h, {
      ...y,
      before: o,
      after: o
    });
    return E(), g(), T;
  }
  function u(h, p) {
    return sM(h, {
      align: p,
      // @ts-expect-error: `markdown-table` types should support `null`.
      alignDelimiters: r,
      // @ts-expect-error: `markdown-table` types should support `null`.
      padding: n,
      // @ts-expect-error: `markdown-table` types should support `null`.
      stringLength: i
    });
  }
  function c(h, p, m) {
    const y = h.children;
    let g = -1;
    const E = [], T = p.enter("table");
    for (; ++g < y.length; )
      E[g] = f(y[g], p, m);
    return T(), E;
  }
  function f(h, p, m) {
    const y = h.children;
    let g = -1;
    const E = [], T = p.enter("tableRow");
    for (; ++g < y.length; )
      E[g] = a(y[g], h, p, m);
    return T(), E;
  }
  function d(h, p, m) {
    let y = va.inlineCode(h, p, m);
    return m.stack.includes("tableCell") && (y = y.replace(/\|/g, "\\$&")), y;
  }
}
function mM() {
  return {
    exit: {
      taskListCheckValueChecked: rh,
      taskListCheckValueUnchecked: rh,
      paragraph: yM
    }
  };
}
function gM() {
  return {
    unsafe: [{ atBreak: !0, character: "-", after: "[:|-]" }],
    handlers: { listItem: kM }
  };
}
function rh(t) {
  const e = this.stack[this.stack.length - 2];
  e.type, e.checked = t.type === "taskListCheckValueChecked";
}
function yM(t) {
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
function kM(t, e, n, r) {
  const i = t.children[0], o = typeof t.checked == "boolean" && i && i.type === "paragraph", s = "[" + (t.checked ? "x" : " ") + "] ", l = n.createTracker(r);
  o && l.move(s);
  let a = va.listItem(t, e, n, {
    ...r,
    ...l.current()
  });
  return o && (a = a.replace(/^(?:[*+-]|\d+\.)([\r\n]| {1,3})/, u)), a;
  function u(c) {
    return c + s;
  }
}
function bM() {
  return [
    AS(),
    YS(),
    eM(),
    aM(),
    mM()
  ];
}
function wM(t) {
  return {
    extensions: [
      ES(),
      QS(t),
      tM(),
      pM(t),
      gM()
    ]
  };
}
const xM = {
  tokenize: vM,
  partial: !0
}, vm = {
  tokenize: IM,
  partial: !0
}, Im = {
  tokenize: AM,
  partial: !0
}, Am = {
  tokenize: EM,
  partial: !0
}, CM = {
  tokenize: OM,
  partial: !0
}, Em = {
  name: "wwwAutolink",
  tokenize: NM,
  previous: Dm
}, Om = {
  name: "protocolAutolink",
  tokenize: TM,
  previous: Rm
}, tn = {
  name: "emailAutolink",
  tokenize: MM,
  previous: Lm
}, Pt = {};
function SM() {
  return {
    text: Pt
  };
}
let Dn = 48;
for (; Dn < 123; )
  Pt[Dn] = tn, Dn++, Dn === 58 ? Dn = 65 : Dn === 91 && (Dn = 97);
Pt[43] = tn;
Pt[45] = tn;
Pt[46] = tn;
Pt[95] = tn;
Pt[72] = [tn, Om];
Pt[104] = [tn, Om];
Pt[87] = [tn, Em];
Pt[119] = [tn, Em];
function MM(t, e, n) {
  const r = this;
  let i, o;
  return s;
  function s(f) {
    return !ka(f) || !Lm.call(r, r.previous) || qu(r.events) ? n(f) : (t.enter("literalAutolink"), t.enter("literalAutolinkEmail"), l(f));
  }
  function l(f) {
    return ka(f) ? (t.consume(f), l) : f === 64 ? (t.consume(f), a) : n(f);
  }
  function a(f) {
    return f === 46 ? t.check(CM, c, u)(f) : f === 45 || f === 95 || He(f) ? (o = !0, t.consume(f), a) : c(f);
  }
  function u(f) {
    return t.consume(f), i = !0, a;
  }
  function c(f) {
    return o && i && Le(r.previous) ? (t.exit("literalAutolinkEmail"), t.exit("literalAutolink"), e(f)) : n(f);
  }
}
function NM(t, e, n) {
  const r = this;
  return i;
  function i(s) {
    return s !== 87 && s !== 119 || !Dm.call(r, r.previous) || qu(r.events) ? n(s) : (t.enter("literalAutolink"), t.enter("literalAutolinkWww"), t.check(xM, t.attempt(vm, t.attempt(Im, o), n), n)(s));
  }
  function o(s) {
    return t.exit("literalAutolinkWww"), t.exit("literalAutolink"), e(s);
  }
}
function TM(t, e, n) {
  const r = this;
  let i = "", o = !1;
  return s;
  function s(f) {
    return (f === 72 || f === 104) && Rm.call(r, r.previous) && !qu(r.events) ? (t.enter("literalAutolink"), t.enter("literalAutolinkHttp"), i += String.fromCodePoint(f), t.consume(f), l) : n(f);
  }
  function l(f) {
    if (Le(f) && i.length < 5)
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
    return f === null || Zo(f) || se(f) || er(f) || ws(f) ? n(f) : t.attempt(vm, t.attempt(Im, c), n)(f);
  }
  function c(f) {
    return t.exit("literalAutolinkHttp"), t.exit("literalAutolink"), e(f);
  }
}
function vM(t, e, n) {
  let r = 0;
  return i;
  function i(s) {
    return (s === 87 || s === 119) && r < 3 ? (r++, t.consume(s), i) : s === 46 && r === 3 ? (t.consume(s), o) : n(s);
  }
  function o(s) {
    return s === null ? n(s) : e(s);
  }
}
function IM(t, e, n) {
  let r, i, o;
  return s;
  function s(u) {
    return u === 46 || u === 95 ? t.check(Am, a, l)(u) : u === null || se(u) || er(u) || u !== 45 && ws(u) ? a(u) : (o = !0, t.consume(u), s);
  }
  function l(u) {
    return u === 95 ? r = !0 : (i = r, r = void 0), t.consume(u), s;
  }
  function a(u) {
    return i || r || !o ? n(u) : e(u);
  }
}
function AM(t, e) {
  let n = 0, r = 0;
  return i;
  function i(s) {
    return s === 40 ? (n++, t.consume(s), i) : s === 41 && r < n ? o(s) : s === 33 || s === 34 || s === 38 || s === 39 || s === 41 || s === 42 || s === 44 || s === 46 || s === 58 || s === 59 || s === 60 || s === 63 || s === 93 || s === 95 || s === 126 ? t.check(Am, e, o)(s) : s === null || se(s) || er(s) ? e(s) : (t.consume(s), i);
  }
  function o(s) {
    return s === 41 && r++, t.consume(s), i;
  }
}
function EM(t, e, n) {
  return r;
  function r(l) {
    return l === 33 || l === 34 || l === 39 || l === 41 || l === 42 || l === 44 || l === 46 || l === 58 || l === 59 || l === 63 || l === 95 || l === 126 ? (t.consume(l), r) : l === 38 ? (t.consume(l), o) : l === 93 ? (t.consume(l), i) : (
      // `<` is an end.
      l === 60 || // So is whitespace.
      l === null || se(l) || er(l) ? e(l) : n(l)
    );
  }
  function i(l) {
    return l === null || l === 40 || l === 91 || se(l) || er(l) ? e(l) : r(l);
  }
  function o(l) {
    return Le(l) ? s(l) : n(l);
  }
  function s(l) {
    return l === 59 ? (t.consume(l), r) : Le(l) ? (t.consume(l), s) : n(l);
  }
}
function OM(t, e, n) {
  return r;
  function r(o) {
    return t.consume(o), i;
  }
  function i(o) {
    return He(o) ? n(o) : e(o);
  }
}
function Dm(t) {
  return t === null || t === 40 || t === 42 || t === 95 || t === 91 || t === 93 || t === 126 || se(t);
}
function Rm(t) {
  return !Le(t);
}
function Lm(t) {
  return !(t === 47 || ka(t));
}
function ka(t) {
  return t === 43 || t === 45 || t === 46 || t === 95 || He(t);
}
function qu(t) {
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
const DM = {
  tokenize: _M,
  partial: !0
};
function RM() {
  return {
    document: {
      91: {
        name: "gfmFootnoteDefinition",
        tokenize: BM,
        continuation: {
          tokenize: FM
        },
        exit: $M
      }
    },
    text: {
      91: {
        name: "gfmFootnoteCall",
        tokenize: zM
      },
      93: {
        name: "gfmPotentialFootnoteCall",
        add: "after",
        tokenize: LM,
        resolveTo: PM
      }
    }
  };
}
function LM(t, e, n) {
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
    const u = wt(r.sliceSerialize({
      start: s.end,
      end: r.now()
    }));
    return u.codePointAt(0) !== 94 || !o.includes(u.slice(1)) ? n(a) : (t.enter("gfmFootnoteCallLabelMarker"), t.consume(a), t.exit("gfmFootnoteCallLabelMarker"), e(a));
  }
}
function PM(t, e) {
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
function zM(t, e, n) {
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
      f === null || f === 91 || se(f)
    )
      return n(f);
    if (f === 93) {
      t.exit("chunkString");
      const d = t.exit("gfmFootnoteCallString");
      return i.includes(wt(r.sliceSerialize(d))) ? (t.enter("gfmFootnoteCallLabelMarker"), t.consume(f), t.exit("gfmFootnoteCallLabelMarker"), t.exit("gfmFootnoteCall"), e) : n(f);
    }
    return se(f) || (s = !0), o++, t.consume(f), f === 92 ? c : u;
  }
  function c(f) {
    return f === 91 || f === 92 || f === 93 ? (t.consume(f), o++, u) : u(f);
  }
}
function BM(t, e, n) {
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
      p === null || p === 91 || se(p)
    )
      return n(p);
    if (p === 93) {
      t.exit("chunkString");
      const m = t.exit("gfmFootnoteDefinitionLabelString");
      return o = wt(r.sliceSerialize(m)), t.enter("gfmFootnoteDefinitionLabelMarker"), t.consume(p), t.exit("gfmFootnoteDefinitionLabelMarker"), t.exit("gfmFootnoteDefinitionLabel"), d;
    }
    return se(p) || (l = !0), s++, t.consume(p), p === 92 ? f : c;
  }
  function f(p) {
    return p === 91 || p === 92 || p === 93 ? (t.consume(p), s++, c) : c(p);
  }
  function d(p) {
    return p === 58 ? (t.enter("definitionMarker"), t.consume(p), t.exit("definitionMarker"), i.includes(o) || i.push(o), te(t, h, "gfmFootnoteDefinitionWhitespace")) : n(p);
  }
  function h(p) {
    return e(p);
  }
}
function FM(t, e, n) {
  return t.check(oo, e, t.attempt(DM, e, n));
}
function $M(t) {
  t.exit("gfmFootnoteDefinition");
}
function _M(t, e, n) {
  const r = this;
  return te(t, i, "gfmFootnoteDefinitionIndent", 5);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return s && s[1].type === "gfmFootnoteDefinitionIndent" && s[2].sliceSerialize(s[1], !0).length === 4 ? e(o) : n(o);
  }
}
function VM(t) {
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
            h && tt(d, d.length, 0, xs(h, s.slice(u + 1, a), l)), tt(d, d.length, 0, [["exit", f, l], ["enter", s[a][1], l], ["exit", s[a][1], l], ["exit", c, l]]), tt(s, u - 1, a - u + 3, d), a = u + d.length - 2;
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
      const m = jr(u);
      if (p === 126)
        return f > 1 ? a(p) : (s.consume(p), f++, h);
      if (f < 2 && !n) return a(p);
      const y = s.exit("strikethroughSequenceTemporary"), g = jr(p);
      return y._open = !g || g === 2 && !!m, y._close = !m || m === 2 && !!g, l(p);
    }
  }
}
class HM {
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
    jM(this, e, n, r);
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
function jM(t, e, n, r) {
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
function qM(t, e) {
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
function WM() {
  return {
    flow: {
      null: {
        name: "table",
        tokenize: KM,
        resolveAll: UM
      }
    }
  };
}
function KM(t, e, n) {
  const r = this;
  let i = 0, o = 0, s;
  return l;
  function l(N) {
    let _ = r.events.length - 1;
    for (; _ > -1; ) {
      const le = r.events[_][1].type;
      if (le === "lineEnding" || // Note: markdown-rs uses `whitespace` instead of `linePrefix`
      le === "linePrefix") _--;
      else break;
    }
    const H = _ > -1 ? r.events[_][1].type : null, Y = H === "tableHead" || H === "tableRow" ? S : a;
    return Y === S && r.parser.lazy[r.now().line] ? n(N) : Y(N);
  }
  function a(N) {
    return t.enter("tableHead"), t.enter("tableRow"), u(N);
  }
  function u(N) {
    return N === 124 || (s = !0, o += 1), c(N);
  }
  function c(N) {
    return N === null ? n(N) : j(N) ? o > 1 ? (o = 0, r.interrupt = !0, t.exit("tableRow"), t.enter("lineEnding"), t.consume(N), t.exit("lineEnding"), h) : n(N) : Z(N) ? te(t, c, "whitespace")(N) : (o += 1, s && (s = !1, i += 1), N === 124 ? (t.enter("tableCellDivider"), t.consume(N), t.exit("tableCellDivider"), s = !0, c) : (t.enter("data"), f(N)));
  }
  function f(N) {
    return N === null || N === 124 || se(N) ? (t.exit("data"), c(N)) : (t.consume(N), N === 92 ? d : f);
  }
  function d(N) {
    return N === 92 || N === 124 ? (t.consume(N), f) : f(N);
  }
  function h(N) {
    return r.interrupt = !1, r.parser.lazy[r.now().line] ? n(N) : (t.enter("tableDelimiterRow"), s = !1, Z(N) ? te(t, p, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(N) : p(N));
  }
  function p(N) {
    return N === 45 || N === 58 ? y(N) : N === 124 ? (s = !0, t.enter("tableCellDivider"), t.consume(N), t.exit("tableCellDivider"), m) : z(N);
  }
  function m(N) {
    return Z(N) ? te(t, y, "whitespace")(N) : y(N);
  }
  function y(N) {
    return N === 58 ? (o += 1, s = !0, t.enter("tableDelimiterMarker"), t.consume(N), t.exit("tableDelimiterMarker"), g) : N === 45 ? (o += 1, g(N)) : N === null || j(N) ? B(N) : z(N);
  }
  function g(N) {
    return N === 45 ? (t.enter("tableDelimiterFiller"), E(N)) : z(N);
  }
  function E(N) {
    return N === 45 ? (t.consume(N), E) : N === 58 ? (s = !0, t.exit("tableDelimiterFiller"), t.enter("tableDelimiterMarker"), t.consume(N), t.exit("tableDelimiterMarker"), T) : (t.exit("tableDelimiterFiller"), T(N));
  }
  function T(N) {
    return Z(N) ? te(t, B, "whitespace")(N) : B(N);
  }
  function B(N) {
    return N === 124 ? p(N) : N === null || j(N) ? !s || i !== o ? z(N) : (t.exit("tableDelimiterRow"), t.exit("tableHead"), e(N)) : z(N);
  }
  function z(N) {
    return n(N);
  }
  function S(N) {
    return t.enter("tableRow"), D(N);
  }
  function D(N) {
    return N === 124 ? (t.enter("tableCellDivider"), t.consume(N), t.exit("tableCellDivider"), D) : N === null || j(N) ? (t.exit("tableRow"), e(N)) : Z(N) ? te(t, D, "whitespace")(N) : (t.enter("data"), V(N));
  }
  function V(N) {
    return N === null || N === 124 || se(N) ? (t.exit("data"), D(N)) : (t.consume(N), N === 92 ? q : V);
  }
  function q(N) {
    return N === 92 || N === 124 ? (t.consume(N), V) : V(N);
  }
}
function UM(t, e) {
  let n = -1, r = !0, i = 0, o = [0, 0, 0, 0], s = [0, 0, 0, 0], l = !1, a = 0, u, c, f;
  const d = new HM();
  for (; ++n < t.length; ) {
    const h = t[n], p = h[1];
    h[0] === "enter" ? p.type === "tableHead" ? (l = !1, a !== 0 && (ih(d, e, a, u, c), c = void 0, a = 0), u = {
      type: "table",
      start: Object.assign({}, p.start),
      // Note: correct end is set later.
      end: Object.assign({}, p.end)
    }, d.add(n, 0, [["enter", u, e]])) : p.type === "tableRow" || p.type === "tableDelimiterRow" ? (r = !0, f = void 0, o = [0, 0, 0, 0], s = [0, n + 1, 0, 0], l && (l = !1, c = {
      type: "tableBody",
      start: Object.assign({}, p.start),
      // Note: correct end is set later.
      end: Object.assign({}, p.end)
    }, d.add(n, 0, [["enter", c, e]])), i = p.type === "tableDelimiterRow" ? 2 : c ? 3 : 1) : i && (p.type === "data" || p.type === "tableDelimiterMarker" || p.type === "tableDelimiterFiller") ? (r = !1, s[2] === 0 && (o[1] !== 0 && (s[0] = s[1], f = zo(d, e, o, i, void 0, f), o = [0, 0, 0, 0]), s[2] = n)) : p.type === "tableCellDivider" && (r ? r = !1 : (o[1] !== 0 && (s[0] = s[1], f = zo(d, e, o, i, void 0, f)), o = s, s = [o[1], n, 0, 0])) : p.type === "tableHead" ? (l = !0, a = n) : p.type === "tableRow" || p.type === "tableDelimiterRow" ? (a = n, o[1] !== 0 ? (s[0] = s[1], f = zo(d, e, o, i, n, f)) : s[1] !== 0 && (f = zo(d, e, s, i, n, f)), i = 0) : i && (p.type === "data" || p.type === "tableDelimiterMarker" || p.type === "tableDelimiterFiller") && (s[3] = n);
  }
  for (a !== 0 && ih(d, e, a, u, c), d.consume(e.events), n = -1; ++n < e.events.length; ) {
    const h = e.events[n];
    h[0] === "enter" && h[1].type === "table" && (h[1]._align = qM(e.events, n));
  }
  return t;
}
function zo(t, e, n, r, i, o) {
  const s = r === 1 ? "tableHeader" : r === 2 ? "tableDelimiter" : "tableData", l = "tableContent";
  n[0] !== 0 && (o.end = Object.assign({}, yr(e.events, n[0])), t.add(n[0], 0, [["exit", o, e]]));
  const a = yr(e.events, n[1]);
  if (o = {
    type: s,
    start: Object.assign({}, a),
    // Note: correct end is set later.
    end: Object.assign({}, a)
  }, t.add(n[1], 0, [["enter", o, e]]), n[2] !== 0) {
    const u = yr(e.events, n[2]), c = yr(e.events, n[3]), f = {
      type: l,
      start: Object.assign({}, u),
      end: Object.assign({}, c)
    };
    if (t.add(n[2], 0, [["enter", f, e]]), r !== 2) {
      const d = e.events[n[2]], h = e.events[n[3]];
      if (d[1].end = Object.assign({}, h[1].end), d[1].type = "chunkText", d[1].contentType = "text", n[3] > n[2] + 1) {
        const p = n[2] + 1, m = n[3] - n[2] - 1;
        t.add(p, m, []);
      }
    }
    t.add(n[3] + 1, 0, [["exit", f, e]]);
  }
  return i !== void 0 && (o.end = Object.assign({}, yr(e.events, i)), t.add(i, 0, [["exit", o, e]]), o = void 0), o;
}
function ih(t, e, n, r, i) {
  const o = [], s = yr(e.events, n);
  i && (i.end = Object.assign({}, s), o.push(["exit", i, e])), r.end = Object.assign({}, s), o.push(["exit", r, e]), t.add(n + 1, 0, o);
}
function yr(t, e) {
  const n = t[e], r = n[0] === "enter" ? "start" : "end";
  return n[1][r];
}
const JM = {
  name: "tasklistCheck",
  tokenize: YM
};
function GM() {
  return {
    text: {
      91: JM
    }
  };
}
function YM(t, e, n) {
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
    return se(a) ? (t.enter("taskListCheckValueUnchecked"), t.consume(a), t.exit("taskListCheckValueUnchecked"), s) : a === 88 || a === 120 ? (t.enter("taskListCheckValueChecked"), t.consume(a), t.exit("taskListCheckValueChecked"), s) : n(a);
  }
  function s(a) {
    return a === 93 ? (t.enter("taskListCheckMarker"), t.consume(a), t.exit("taskListCheckMarker"), t.exit("taskListCheck"), l) : n(a);
  }
  function l(a) {
    return j(a) ? e(a) : Z(a) ? t.check({
      tokenize: QM
    }, e, n)(a) : n(a);
  }
}
function QM(t, e, n) {
  return te(t, r, "whitespace");
  function r(i) {
    return i === null ? n(i) : e(i);
  }
}
function XM(t) {
  return xh([
    SM(),
    RM(),
    VM(t),
    WM(),
    GM()
  ]);
}
const ZM = {};
function eN(t) {
  const e = (
    /** @type {Processor<Root>} */
    this
  ), n = t || ZM, r = e.data(), i = r.micromarkExtensions || (r.micromarkExtensions = []), o = r.fromMarkdownExtensions || (r.fromMarkdownExtensions = []), s = r.toMarkdownExtensions || (r.toMarkdownExtensions = []);
  i.push(XM(n)), o.push(bM()), s.push(wM(n));
}
function W(t, e) {
  return Object.assign(t, { meta: {
    package: "@milkdown/preset-gfm",
    ...e
  } }), t;
}
var Wu = ho("strike_through");
W(Wu, {
  displayName: "Attr<strikethrough>",
  group: "Strikethrough"
});
var bo = ei("strike_through", (t) => ({
  parseDOM: [{ tag: "del" }, {
    style: "text-decoration",
    getAttrs: (e) => e === "line-through"
  }],
  toDOM: (e) => ["del", t.get(Wu.key)(e)],
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
W(bo.mark, {
  displayName: "MarkSchema<strikethrough>",
  group: "Strikethrough"
});
W(bo.ctx, {
  displayName: "MarkSchemaCtx<strikethrough>",
  group: "Strikethrough"
});
var Ku = U("ToggleStrikeThrough", (t) => () => lo(bo.type(t)));
W(Ku, {
  displayName: "Command<ToggleStrikethrough>",
  group: "Strikethrough"
});
var Pm = Ke((t) => ao(new RegExp("(?:^|[^\\\\w:/])(~{1,2})(.+?)\\\\1(?!\\\\w|\\\\/)"), bo.type(t), { updateCaptured: (e) => e.fullMatch.startsWith("~") ? e : { start: e.start + 1, fullMatch: e.fullMatch.slice(1) } }));
W(Pm, {
  displayName: "InputRule<strikethrough>",
  group: "Strikethrough"
});
var Uu = Ue("strikeThroughKeymap", { ToggleStrikethrough: {
  shortcuts: "Mod-Alt-x",
  command: (t) => {
    const e = t.get(ie);
    return () => e.call(Ku.key);
  }
} });
W(Uu.ctx, {
  displayName: "KeymapCtx<strikethrough>",
  group: "Strikethrough"
});
W(Uu.shortcuts, {
  displayName: "Keymap<strikethrough>",
  group: "Strikethrough"
});
var wo = wC({
  tableGroup: "block",
  cellContent: "paragraph",
  cellAttributes: { alignment: {
    default: "left",
    getFromDOM: (t) => t.style.textAlign || "left",
    setDOMAttr: (t, e) => {
      e.style = `text-align: ${t || "left"}`;
    }
  } }
}), Yt = ye("table", () => ({
  ...wo.table,
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
W(Yt.node, {
  displayName: "NodeSchema<table>",
  group: "Table"
});
W(Yt.ctx, {
  displayName: "NodeSchemaCtx<table>",
  group: "Table"
});
var xo = ye("table_header_row", () => ({
  ...wo.table_row,
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
W(xo.node, {
  displayName: "NodeSchema<tableHeaderRow>",
  group: "Table"
});
W(xo.ctx, {
  displayName: "NodeSchemaCtx<tableHeaderRow>",
  group: "Table"
});
var oi = ye("table_row", () => ({
  ...wo.table_row,
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
W(oi.node, {
  displayName: "NodeSchema<tableRow>",
  group: "Table"
});
W(oi.ctx, {
  displayName: "NodeSchemaCtx<tableRow>",
  group: "Table"
});
var Co = ye("table_cell", () => ({
  ...wo.table_cell,
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
W(Co.node, {
  displayName: "NodeSchema<tableCell>",
  group: "Table"
});
W(Co.ctx, {
  displayName: "NodeSchemaCtx<tableCell>",
  group: "Table"
});
var Yr = ye("table_header", () => ({
  ...wo.table_header,
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
W(Yr.node, {
  displayName: "NodeSchema<tableHeader>",
  group: "Table"
});
W(Yr.ctx, {
  displayName: "NodeSchemaCtx<tableHeader>",
  group: "Table"
});
function zm(t, e = 3, n = 3) {
  const r = Array(n).fill(0).map(() => Co.type(t).createAndFill()), i = Array(n).fill(0).map(() => Yr.type(t).createAndFill()), o = Array(e).fill(0).map((s, l) => l === 0 ? xo.type(t).create(null, i) : oi.type(t).create(null, r));
  return Yt.type(t).create(null, o);
}
function Bm(t) {
  return (e, n) => (r) => {
    n = n ?? r.selection.from;
    const i = r.doc.resolve(n), o = I0((a) => a.type.name === "table")(i), s = o ? {
      node: o.node,
      from: o.start
    } : void 0, l = t === "row";
    if (s) {
      const a = oe.get(s.node);
      if (e >= 0 && e < (l ? a.height : a.width)) {
        const u = a.positionAt(l ? e : a.height - 1, l ? a.width - 1 : e, s.node), c = r.doc.resolve(s.from + u), f = l ? ae.rowSelection : ae.colSelection, d = a.positionAt(l ? e : 0, l ? 0 : e, s.node), h = r.doc.resolve(s.from + d);
        return Fd(r.setSelection(f(c, h)));
      }
    }
    return r;
  };
}
var tN = Bm("row"), nN = Bm("col");
function Fm(t, e, { map: n, tableStart: r, table: i }, o) {
  const s = Array(o).fill(0).reduce((a, u, c) => a + i.child(c).nodeSize, r), l = Array(n.width).fill(0).map((a, u) => {
    const c = i.nodeAt(n.map[u]);
    return Co.type(t).createAndFill({ alignment: c == null ? void 0 : c.attrs.alignment });
  });
  return e.insert(s, oi.type(t).create(null, l)), e;
}
function rN(t) {
  const e = ko(t.$from);
  if (!e) return;
  const n = oe.get(e.node);
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
function iN(t) {
  const e = rN(t.selection);
  if (e && e[0]) {
    const n = t.doc.resolve(e[0].pos), r = e[e.length - 1];
    if (r) {
      const i = t.doc.resolve(r.pos);
      return Fd(t.setSelection(new ae(i, n)));
    }
  }
  return t;
}
var Ju = U("GoToPrevTableCell", () => () => bm(-1));
W(Ju, {
  displayName: "Command<goToPrevTableCellCommand>",
  group: "Table"
});
var Gu = U("GoToNextTableCell", () => () => bm(1));
W(Gu, {
  displayName: "Command<goToNextTableCellCommand>",
  group: "Table"
});
var Yu = U("ExitTable", (t) => () => (e, n) => {
  if (!ve(e)) return !1;
  const { $head: r } = e.selection, i = v0(r, Yt.type(t));
  if (!i) return !1;
  const { to: o } = i, s = e.tr.replaceWith(o, o, Et.type(t).createAndFill());
  return s.setSelection(J.near(s.doc.resolve(o), 1)).scrollIntoView(), n == null || n(s), !0;
});
W(Yu, {
  displayName: "Command<breakTableCommand>",
  group: "Table"
});
var $m = U("InsertTable", (t) => ({ row: e, col: n } = {}) => (r, i) => {
  const { selection: o, tr: s } = r, { from: l } = o, a = zm(t, e, n), u = s.replaceSelectionWith(a), c = J.findFrom(u.doc.resolve(l), 1, !0);
  return c && u.setSelection(c), i == null || i(u), !0;
});
W($m, {
  displayName: "Command<insertTableCommand>",
  group: "Table"
});
var _m = U("MoveRow", () => ({ from: t, to: e, pos: n } = {}) => UC({
  from: t ?? 0,
  to: e ?? 0,
  pos: n
}));
W(_m, {
  displayName: "Command<moveRowCommand>",
  group: "Table"
});
var Vm = U("MoveCol", () => ({ from: t, to: e, pos: n } = {}) => JC({
  from: t ?? 0,
  to: e ?? 0,
  pos: n
}));
W(Vm, {
  displayName: "Command<moveColCommand>",
  group: "Table"
});
var Hm = U("SelectRow", () => (t = { index: 0 }) => (e, n) => {
  const { tr: r } = e;
  return !!(n == null ? void 0 : n(tN(t.index, t.pos)(r)));
});
W(Hm, {
  displayName: "Command<selectRowCommand>",
  group: "Table"
});
var jm = U("SelectCol", () => (t = { index: 0 }) => (e, n) => {
  const { tr: r } = e;
  return !!(n == null ? void 0 : n(nN(t.index, t.pos)(r)));
});
W(jm, {
  displayName: "Command<selectColCommand>",
  group: "Table"
});
var qm = U("SelectTable", () => () => (t, e) => {
  const { tr: n } = t;
  return !!(e == null ? void 0 : e(iN(n)));
});
W(qm, {
  displayName: "Command<selectTableCommand>",
  group: "Table"
});
var Wm = U("DeleteSelectedCells", () => () => (t, e) => {
  const { selection: n } = t;
  if (!(n instanceof ae)) return !1;
  const r = n.isRowSelection(), i = n.isColSelection();
  return r && i ? KC(t, e) : i ? gm(t, e) : km(t, e);
});
W(Wm, {
  displayName: "Command<deleteSelectedCellsCommand>",
  group: "Table"
});
var Km = U("AddColBefore", () => () => pm);
W(Km, {
  displayName: "Command<addColBeforeCommand>",
  group: "Table"
});
var Um = U("AddColAfter", () => () => mm);
W(Um, {
  displayName: "Command<addColAfterCommand>",
  group: "Table"
});
var Jm = U("AddRowBefore", (t) => () => (e, n) => {
  if (!ve(e)) return !1;
  if (n) {
    const r = Lt(e);
    n(Fm(t, e.tr, r, r.top));
  }
  return !0;
});
W(Jm, {
  displayName: "Command<addRowBeforeCommand>",
  group: "Table"
});
var Gm = U("AddRowAfter", (t) => () => (e, n) => {
  if (!ve(e)) return !1;
  if (n) {
    const r = Lt(e);
    n(Fm(t, e.tr, r, r.bottom));
  }
  return !0;
});
W(Gm, {
  displayName: "Command<addRowAfterCommand>",
  group: "Table"
});
var Ym = U("SetAlign", () => (t = "left") => jC("alignment", t));
W(Ym, {
  displayName: "Command<setAlignCommand>",
  group: "Table"
});
var Qm = Ke((t) => new rt(/^\|(\d+)[xX](\d+)\|\s$/, (e, n, r, i) => {
  var a, u;
  const o = e.doc.resolve(r);
  if (!o.node(-1).canReplaceWith(o.index(-1), o.indexAfter(-1), Yt.type(t))) return null;
  const s = zm(t, Math.max(Number(((a = n.groups) == null ? void 0 : a.row) ?? 0), 2), Number((u = n.groups) == null ? void 0 : u.col)), l = e.tr.replaceRangeWith(r, i, s);
  return l.setSelection(G.create(l.doc, r + 3)).scrollIntoView();
}));
W(Qm, {
  displayName: "InputRule<insertTableInputRule>",
  group: "Table"
});
var Xm = Px((t) => ({ run: (e, n, r) => {
  if (r) return e;
  function i(u) {
    var y;
    const c = u.childCount, f = ((y = u.lastChild) == null ? void 0 : y.childCount) ?? 0;
    if (c === 0 || f === 0) return Et.type(t).create();
    const d = u.firstChild;
    if (!(f > 0 && d && d.childCount === 0)) return u;
    if (c >= 3) {
      const g = u.child(1), E = [];
      for (let z = 0; z < g.childCount; z++) {
        const S = g.child(z);
        E.push(Yr.type(t).create(S.attrs, S.content, S.marks));
      }
      const T = d.type.create(d.attrs, E), B = [];
      for (let z = 2; z < c; z++) B.push(u.child(z));
      return u.type.create(u.attrs, [T, ...B]);
    }
    const h = Array(f).fill(0).map(() => Yr.type(t).createAndFill()), p = new P(A.from(h), 0, 0), m = d.replace(0, 0, p);
    return u.replace(0, d.nodeSize, new P(A.from(m), 0, 0));
  }
  function o(u) {
    const c = oi.type(t), f = [];
    let d = [], h = !1;
    function p() {
      if (d.length === 0) return;
      const m = xo.type(t).createAndFill(), y = Yt.type(t).create(null, [m, ...d]);
      f.push(i(y)), d = [];
    }
    return u.forEach((m) => {
      m.type === c ? (h = !0, d.push(m)) : (p(), f.push(m));
    }), p(), h ? A.from(f) : u;
  }
  function s(u) {
    let c = o(u), f = c !== u;
    const d = [];
    return c.forEach((h) => {
      if (h.type === Yt.type(t)) {
        const p = i(h);
        p !== h && (f = !0), d.push(p);
      } else if (h.childCount > 0) {
        const p = s(h.content);
        p !== h.content ? (f = !0, d.push(h.copy(p))) : d.push(h);
      } else d.push(h);
    }), f ? A.from(d) : u;
  }
  function l(u) {
    const c = [], f = [];
    u.forEach((d) => f.push(d));
    for (let d = 0; d < f.length; d++) {
      const h = f[d], p = f[d + 1];
      h.type === Et.type(t) && h.content.size === 0 && p && p.type === Yt.type(t) || c.push(h);
    }
    return c.length < f.length ? A.from(c) : u;
  }
  let a = s(e.content);
  return a = l(a), new P(A.from(a), e.openStart, e.openEnd);
} }));
W(Xm, {
  displayName: "PasteRule<table>",
  group: "Table"
});
var Qu = Ue("tableKeymap", {
  NextCell: {
    priority: 100,
    shortcuts: ["Mod-]", "Tab"],
    command: (t) => {
      const e = t.get(ie);
      return () => e.call(Gu.key);
    }
  },
  PrevCell: {
    shortcuts: ["Mod-[", "Shift-Tab"],
    command: (t) => {
      const e = t.get(ie);
      return () => e.call(Ju.key);
    }
  },
  ExitTable: {
    shortcuts: ["Mod-Enter", "Enter"],
    command: (t) => {
      const e = t.get(ie);
      return () => e.call(Yu.key);
    }
  }
});
W(Qu.ctx, {
  displayName: "KeymapCtx<table>",
  group: "Table"
});
W(Qu.shortcuts, {
  displayName: "Keymap<table>",
  group: "Table"
});
var vl = "footnote_definition", oh = "footnoteDefinition", Xu = ye("footnote_definition", () => ({
  group: "block",
  content: "block+",
  defining: !0,
  attrs: { label: {
    default: "",
    validate: "string"
  } },
  parseDOM: [{
    tag: `dl[data-type="${vl}"]`,
    getAttrs: (t) => {
      if (!(t instanceof HTMLElement)) throw Ot(t);
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
        "data-type": vl
      },
      ["dt", e],
      ["dd", 0]
    ];
  },
  parseMarkdown: {
    match: ({ type: t }) => t === oh,
    runner: (t, e, n) => {
      t.openNode(n, { label: e.label }).next(e.children).closeNode();
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === vl,
    runner: (t, e) => {
      t.openNode(oh, void 0, {
        label: e.attrs.label,
        identifier: e.attrs.label
      }).next(e.content).closeNode();
    }
  }
}));
W(Xu.ctx, {
  displayName: "NodeSchemaCtx<footnodeDef>",
  group: "footnote"
});
W(Xu.node, {
  displayName: "NodeSchema<footnodeDef>",
  group: "footnote"
});
var Il = "footnote_reference", Zu = ye("footnote_reference", () => ({
  group: "inline",
  inline: !0,
  atom: !0,
  attrs: { label: {
    default: "",
    validate: "string"
  } },
  parseDOM: [{
    tag: `sup[data-type="${Il}"]`,
    getAttrs: (t) => {
      if (!(t instanceof HTMLElement)) throw Ot(t);
      return { label: t.dataset.label };
    }
  }],
  toDOM: (t) => {
    const e = t.attrs.label;
    return [
      "sup",
      {
        "data-label": e,
        "data-type": Il
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
    match: (t) => t.type.name === Il,
    runner: (t, e) => {
      t.addNode("footnoteReference", void 0, void 0, {
        label: e.attrs.label,
        identifier: e.attrs.label
      });
    }
  }
}));
W(Zu.ctx, {
  displayName: "NodeSchemaCtx<footnodeRef>",
  group: "footnote"
});
W(Zu.node, {
  displayName: "NodeSchema<footnodeRef>",
  group: "footnote"
});
var ec = en.extendSchema((t) => (e) => {
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
        if (!(r instanceof HTMLElement)) throw Ot(r);
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
W(ec.node, {
  displayName: "NodeSchema<taskListItem>",
  group: "ListItem"
});
W(ec.ctx, {
  displayName: "NodeSchemaCtx<taskListItem>",
  group: "ListItem"
});
var Zm = Ke(() => new rt(/^\[(\s|x)\]\s$/, (t, e, n, r) => {
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
W(Zm, {
  displayName: "InputRule<wrapInTaskListInputRule>",
  group: "ListItem"
});
var oN = [Uu, Qu].flat(), sN = [Qm, Zm], lN = [Pm], aN = [Xm], eg = Rt(() => SS);
W(eg, {
  displayName: "Prose<autoInsertSpanPlugin>",
  group: "Prose"
});
var uN = Rt(() => iS({}));
W(uN, {
  displayName: "Prose<columnResizingPlugin>",
  group: "Prose"
});
var tg = Rt(() => pS({ allowTableNodeSelection: !0 }));
W(tg, {
  displayName: "Prose<tableEditingPlugin>",
  group: "Prose"
});
var tc = lr("remarkGFM", () => eN);
W(tc.plugin, {
  displayName: "Remark<remarkGFMPlugin>",
  group: "Remark"
});
W(tc.options, {
  displayName: "RemarkConfig<remarkGFMPlugin>",
  group: "Remark"
});
var cN = new Re("MILKDOWN_KEEP_TABLE_ALIGN_PLUGIN");
function fN(t, e) {
  let n = 0;
  return e.forEach((r, i, o) => {
    r === t && (n = o);
  }), n;
}
var ng = Rt(() => new Ie({
  key: cN,
  appendTransaction: (t, e, n) => {
    let r;
    const i = (o, s) => {
      if (r || (r = n.tr), o.type.name !== "table_cell") return;
      const l = n.doc.resolve(s), a = l.node(l.depth), u = l.node(l.depth - 1).firstChild;
      if (!u) return;
      const c = fN(o, a), f = u.maybeChild(c);
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
W(ng, {
  displayName: "Prose<keepTableAlignPlugin>",
  group: "Prose"
});
var hN = [
  ng,
  eg,
  tc,
  tg
].flat(), dN = [
  ec,
  Yt,
  xo,
  oi,
  Yr,
  Co,
  Xu,
  Zu,
  Wu,
  bo
].flat(), pN = [
  Gu,
  Ju,
  Yu,
  $m,
  _m,
  Vm,
  Hm,
  jm,
  qm,
  Wm,
  Jm,
  Gm,
  Km,
  Um,
  Ym,
  Ku
], mN = [
  dN,
  sN,
  aN,
  lN,
  oN,
  pN,
  hN
].flat(), ms = 200, we = function() {
};
we.prototype.append = function(e) {
  return e.length ? (e = we.from(e), !this.length && e || e.length < ms && this.leafAppend(e) || this.length < ms && e.leafPrepend(this) || this.appendInner(e)) : this;
};
we.prototype.prepend = function(e) {
  return e.length ? we.from(e).append(this) : this;
};
we.prototype.appendInner = function(e) {
  return new gN(this, e);
};
we.prototype.slice = function(e, n) {
  return e === void 0 && (e = 0), n === void 0 && (n = this.length), e >= n ? we.empty : this.sliceInner(Math.max(0, e), Math.min(this.length, n));
};
we.prototype.get = function(e) {
  if (!(e < 0 || e >= this.length))
    return this.getInner(e);
};
we.prototype.forEach = function(e, n, r) {
  n === void 0 && (n = 0), r === void 0 && (r = this.length), n <= r ? this.forEachInner(e, n, r, 0) : this.forEachInvertedInner(e, n, r, 0);
};
we.prototype.map = function(e, n, r) {
  n === void 0 && (n = 0), r === void 0 && (r = this.length);
  var i = [];
  return this.forEach(function(o, s) {
    return i.push(e(o, s));
  }, n, r), i;
};
we.from = function(e) {
  return e instanceof we ? e : e && e.length ? new rg(e) : we.empty;
};
var rg = /* @__PURE__ */ function(t) {
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
    if (this.length + i.length <= ms)
      return new e(this.values.concat(i.flatten()));
  }, e.prototype.leafPrepend = function(i) {
    if (this.length + i.length <= ms)
      return new e(i.flatten().concat(this.values));
  }, n.length.get = function() {
    return this.values.length;
  }, n.depth.get = function() {
    return 0;
  }, Object.defineProperties(e.prototype, n), e;
}(we);
we.empty = new rg([]);
var gN = /* @__PURE__ */ function(t) {
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
}(we);
const yN = 500;
class bt {
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
        c.push(new Nt(f.map));
        let h = f.step.map(i.slice(o)), p;
        h && s.maybeStep(h).doc && (p = s.mapping.maps[s.mapping.maps.length - 1], u.push(new Nt(p, void 0, void 0, u.length + c.length))), o--, p && i.appendMap(p, o);
      } else
        s.maybeStep(f.step);
      if (f.selection)
        return l = i ? f.selection.map(i.slice(o)) : f.selection, a = new bt(this.items.slice(0, r).append(c.reverse().concat(u)), this.eventCount - 1), !1;
    }, this.items.length, 0), { remaining: a, transform: s, selection: l };
  }
  // Create a new branch with the given transform added.
  addTransform(e, n, r, i) {
    let o = [], s = this.eventCount, l = this.items, a = !i && l.length ? l.get(l.length - 1) : null;
    for (let c = 0; c < e.steps.length; c++) {
      let f = e.steps[c].invert(e.docs[c]), d = new Nt(e.mapping.maps[c], f, n), h;
      (h = a && a.merge(d)) && (d = h, c ? o.pop() : l = l.slice(0, l.length - 1)), o.push(d), n && (s++, n = void 0), i || (a = d);
    }
    let u = s - r.depth;
    return u > bN && (l = kN(l, u), s -= u), new bt(l.append(o), s);
  }
  remapping(e, n) {
    let r = new Ri();
    return this.items.forEach((i, o) => {
      let s = i.mirrorOffset != null && o - i.mirrorOffset >= e ? r.maps.length - i.mirrorOffset : void 0;
      r.appendMap(i.map, s);
    }, e, n), r;
  }
  addMaps(e) {
    return this.eventCount == 0 ? this : new bt(this.items.append(e.map((n) => new Nt(n))), this.eventCount);
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
        let m = e.steps[h].invert(e.docs[h]), y = d.selection && d.selection.map(o.slice(a + 1, h));
        y && l++, r.push(new Nt(p, m, y));
      } else
        r.push(new Nt(p));
    }, i);
    let u = [];
    for (let d = n; d < s; d++)
      u.push(new Nt(o.maps[d]));
    let c = this.items.slice(0, i).append(u).append(r), f = new bt(c, l);
    return f.emptyItemCount() > yN && (f = f.compress(this.items.length - r.length)), f;
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
          let f = new Nt(u.invert(), a, c), d, h = i.length - 1;
          (d = i.length && i[h].merge(f)) ? i[h] = d : i.push(f);
        }
      } else s.map && r--;
    }, this.items.length, 0), new bt(we.from(i.reverse()), o);
  }
}
bt.empty = new bt(we.empty, 0);
function kN(t, e) {
  let n;
  return t.forEach((r, i) => {
    if (r.selection && e-- == 0)
      return n = i, !1;
  }), t.slice(n);
}
class Nt {
  constructor(e, n, r, i) {
    this.map = e, this.step = n, this.selection = r, this.mirrorOffset = i;
  }
  merge(e) {
    if (this.step && e.step && !e.selection) {
      let n = e.step.merge(this.step);
      if (n)
        return new Nt(n.getMap().invert(), n, this.selection);
    }
  }
}
class un {
  constructor(e, n, r, i, o) {
    this.done = e, this.undone = n, this.prevRanges = r, this.prevTime = i, this.prevComposition = o;
  }
}
const bN = 20;
function wN(t, e, n, r) {
  let i = n.getMeta(Yn), o;
  if (i)
    return i.historyState;
  n.getMeta(SN) && (t = new un(t.done, t.undone, null, 0, -1));
  let s = n.getMeta("appendedTransaction");
  if (n.steps.length == 0)
    return t;
  if (s && s.getMeta(Yn))
    return s.getMeta(Yn).redo ? new un(t.done.addTransform(n, void 0, r, Xo(e)), t.undone, sh(n.mapping.maps), t.prevTime, t.prevComposition) : new un(t.done, t.undone.addTransform(n, void 0, r, Xo(e)), null, t.prevTime, t.prevComposition);
  if (n.getMeta("addToHistory") !== !1 && !(s && s.getMeta("addToHistory") === !1)) {
    let l = n.getMeta("composition"), a = t.prevTime == 0 || !s && t.prevComposition != l && (t.prevTime < (n.time || 0) - r.newGroupDelay || !xN(n, t.prevRanges)), u = s ? Al(t.prevRanges, n.mapping) : sh(n.mapping.maps);
    return new un(t.done.addTransform(n, a ? e.selection.getBookmark() : void 0, r, Xo(e)), bt.empty, u, n.time, l ?? t.prevComposition);
  } else return (o = n.getMeta("rebased")) ? new un(t.done.rebased(n, o), t.undone.rebased(n, o), Al(t.prevRanges, n.mapping), t.prevTime, t.prevComposition) : new un(t.done.addMaps(n.mapping.maps), t.undone.addMaps(n.mapping.maps), Al(t.prevRanges, n.mapping), t.prevTime, t.prevComposition);
}
function xN(t, e) {
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
function sh(t) {
  let e = [];
  for (let n = t.length - 1; n >= 0 && e.length == 0; n--)
    t[n].forEach((r, i, o, s) => e.push(o, s));
  return e;
}
function Al(t, e) {
  if (!t)
    return null;
  let n = [];
  for (let r = 0; r < t.length; r += 2) {
    let i = e.map(t[r], 1), o = e.map(t[r + 1], -1);
    i <= o && n.push(i, o);
  }
  return n;
}
function CN(t, e, n) {
  let r = Xo(e), i = Yn.get(e).spec.config, o = (n ? t.undone : t.done).popEvent(e, r);
  if (!o)
    return null;
  let s = o.selection.resolve(o.transform.doc), l = (n ? t.done : t.undone).addTransform(o.transform, e.selection.getBookmark(), i, r), a = new un(n ? l : o.remaining, n ? o.remaining : l, null, 0, -1);
  return o.transform.setSelection(s).setMeta(Yn, { redo: n, historyState: a });
}
let El = !1, lh = null;
function Xo(t) {
  let e = t.plugins;
  if (lh != e) {
    El = !1, lh = e;
    for (let n = 0; n < e.length; n++)
      if (e[n].spec.historyPreserveItems) {
        El = !0;
        break;
      }
  }
  return El;
}
const Yn = new Re("history"), SN = new Re("closeHistory");
function MN(t = {}) {
  return t = {
    depth: t.depth || 100,
    newGroupDelay: t.newGroupDelay || 500
  }, new Ie({
    key: Yn,
    state: {
      init() {
        return new un(bt.empty, bt.empty, null, 0, -1);
      },
      apply(e, n, r) {
        return wN(n, r, e, t);
      }
    },
    config: t,
    props: {
      handleDOMEvents: {
        beforeinput(e, n) {
          let r = n.inputType, i = r == "historyUndo" ? Ei : r == "historyRedo" ? br : null;
          return !i || !e.editable ? !1 : (n.preventDefault(), i(e.state, e.dispatch));
        }
      }
    }
  });
}
function ig(t, e) {
  return (n, r) => {
    let i = Yn.getState(n);
    if (!i || (t ? i.undone : i.done).eventCount == 0)
      return !1;
    if (r) {
      let o = CN(i, n, t);
      o && r(e ? o.scrollIntoView() : o);
    }
    return !0;
  };
}
const Ei = ig(!1, !0), br = ig(!0, !0);
function si(t, e) {
  return Object.assign(t, { meta: {
    package: "@milkdown/plugin-history",
    ...e
  } }), t;
}
var nc = U("Undo", () => () => Ei);
si(nc, { displayName: "Command<undo>" });
var rc = U("Redo", () => () => br);
si(rc, { displayName: "Command<redo>" });
var ic = Zt({}, "historyProviderConfig");
si(ic, { displayName: "Ctx<historyProviderConfig>" });
var og = Rt((t) => MN(t.get(ic.key)));
si(og, { displayName: "Ctx<historyProviderPlugin>" });
var oc = Ue("historyKeymap", {
  Undo: {
    shortcuts: "Mod-z",
    command: (t) => {
      const e = t.get(ie);
      return () => e.call(nc.key);
    }
  },
  Redo: {
    shortcuts: ["Mod-y", "Shift-Mod-z"],
    command: (t) => {
      const e = t.get(ie);
      return () => e.call(rc.key);
    }
  }
});
si(oc.ctx, { displayName: "KeymapCtx<history>" });
si(oc.shortcuts, { displayName: "Keymap<history>" });
var NN = [
  ic,
  og,
  oc,
  nc,
  rc
].flat(), TN = typeof global == "object" && global && global.Object === Object && global, vN = typeof self == "object" && self && self.Object === Object && self, sg = TN || vN || Function("return this")(), gs = sg.Symbol, lg = Object.prototype, IN = lg.hasOwnProperty, AN = lg.toString, fi = gs ? gs.toStringTag : void 0;
function EN(t) {
  var e = IN.call(t, fi), n = t[fi];
  try {
    t[fi] = void 0;
    var r = !0;
  } catch {
  }
  var i = AN.call(t);
  return r && (e ? t[fi] = n : delete t[fi]), i;
}
var ON = Object.prototype, DN = ON.toString;
function RN(t) {
  return DN.call(t);
}
var LN = "[object Null]", PN = "[object Undefined]", ah = gs ? gs.toStringTag : void 0;
function zN(t) {
  return t == null ? t === void 0 ? PN : LN : ah && ah in Object(t) ? EN(t) : RN(t);
}
function BN(t) {
  return t != null && typeof t == "object";
}
var FN = "[object Symbol]";
function $N(t) {
  return typeof t == "symbol" || BN(t) && zN(t) == FN;
}
var _N = /\s/;
function VN(t) {
  for (var e = t.length; e-- && _N.test(t.charAt(e)); )
    ;
  return e;
}
var HN = /^\s+/;
function jN(t) {
  return t && t.slice(0, VN(t) + 1).replace(HN, "");
}
function ba(t) {
  var e = typeof t;
  return t != null && (e == "object" || e == "function");
}
var uh = NaN, qN = /^[-+]0x[0-9a-f]+$/i, WN = /^0b[01]+$/i, KN = /^0o[0-7]+$/i, UN = parseInt;
function ch(t) {
  if (typeof t == "number")
    return t;
  if ($N(t))
    return uh;
  if (ba(t)) {
    var e = typeof t.valueOf == "function" ? t.valueOf() : t;
    t = ba(e) ? e + "" : e;
  }
  if (typeof t != "string")
    return t === 0 ? t : +t;
  t = jN(t);
  var n = WN.test(t);
  return n || KN.test(t) ? UN(t.slice(2), n ? 2 : 8) : qN.test(t) ? uh : +t;
}
var Ol = function() {
  return sg.Date.now();
}, JN = "Expected a function", GN = Math.max, YN = Math.min;
function QN(t, e, n) {
  var r, i, o, s, l, a, u = 0, c = !1, f = !1, d = !0;
  if (typeof t != "function")
    throw new TypeError(JN);
  e = ch(e) || 0, ba(n) && (c = !!n.leading, f = "maxWait" in n, o = f ? GN(ch(n.maxWait) || 0, e) : o, d = "trailing" in n ? !!n.trailing : d);
  function h(S) {
    var D = r, V = i;
    return r = i = void 0, u = S, s = t.apply(V, D), s;
  }
  function p(S) {
    return u = S, l = setTimeout(g, e), c ? h(S) : s;
  }
  function m(S) {
    var D = S - a, V = S - u, q = e - D;
    return f ? YN(q, o - V) : q;
  }
  function y(S) {
    var D = S - a, V = S - u;
    return a === void 0 || D >= e || D < 0 || f && V >= o;
  }
  function g() {
    var S = Ol();
    if (y(S))
      return E(S);
    l = setTimeout(g, m(S));
  }
  function E(S) {
    return l = void 0, d && r ? h(S) : (r = i = void 0, s);
  }
  function T() {
    l !== void 0 && clearTimeout(l), u = 0, r = a = i = l = void 0;
  }
  function B() {
    return l === void 0 ? s : E(Ol());
  }
  function z() {
    var S = Ol(), D = y(S);
    if (r = arguments, i = this, a = S, D) {
      if (l === void 0)
        return p(a);
      if (f)
        return clearTimeout(l), l = setTimeout(g, e), h(a);
    }
    return l === void 0 && (l = setTimeout(g, e)), s;
  }
  return z.cancel = T, z.flush = B, z;
}
var ag = class {
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
}, wa = ee(new ag(), "listener"), XN = new Re("MILKDOWN_LISTENER"), ug = (t) => (t.inject(wa, new ag()), async () => {
  await t.wait(Jn);
  const { listeners: e } = t.get(wa);
  e.beforeMount.forEach((u) => u(t)), await t.wait(Ii);
  const n = t.get(Ai);
  let r = null, i = null, o = null, s = null;
  const l = QN(() => {
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
  }, 200), a = new Ie({
    key: XN,
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
  t.update(Qt, (u) => u.concat(a)), await t.wait(Jo), e.mounted.forEach((u) => u(t));
});
ug.meta = {
  package: "@milkdown/plugin-listener",
  displayName: "Listener"
};
const ys = /* @__PURE__ */ new WeakMap(), Dl = [
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
function Bo(t) {
  return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function fh(t = "") {
  const e = String(t || "").trim(), n = Dl.some((r) => r.value === e);
  return !e || n ? Dl : [
    ...Dl,
    { value: e, label: e }
  ];
}
function cg(t) {
  const e = ys.get(t);
  e && (e.destroy(), ys.delete(t));
}
function hh(t) {
  return String(t || "").replace(/\s+/g, " ").trim();
}
function fg(t) {
  var n, r;
  const e = t == null ? void 0 : t.$from;
  if (!e) return !1;
  for (let i = e.depth; i > 0; i -= 1) {
    const o = (r = (n = e.node(i)) == null ? void 0 : n.type) == null ? void 0 : r.name;
    if (o === "list_item" || o === "listItem") return !0;
  }
  return !1;
}
function ZN(t) {
  var r;
  const { selection: e } = t;
  if (!(e != null && e.empty)) return !1;
  const { $from: n } = e;
  return !((r = n.parent) != null && r.isTextblock) || n.parentOffset !== 0 ? !1 : fg(e);
}
function eT(t, e, n) {
  if (!ZN(t)) return !1;
  const r = t.schema.nodes.list_item || t.schema.nodes.listItem;
  return r ? Bp(r)(t, e, n) : !1;
}
function tT() {
  return new Ie({
    props: {
      handlePaste(t, e) {
        var o, s;
        const n = (o = e.clipboardData) == null ? void 0 : o.getData("text/plain"), r = ((s = e.clipboardData) == null ? void 0 : s.getData("text/html")) || "";
        return !n || !r || fg(t.state.selection) || !(/<(ol|ul|li)\b/i.test(r) || /data-list-type=/i.test(r)) ? !1 : (e.preventDefault(), t.dispatch(t.state.tr.insertText(n).scrollIntoView()), !0);
      }
    }
  });
}
function nT(t) {
  if (typeof t != "function") return null;
  const e = (r) => {
    const i = r.dataset.nutbookOriginalSrc || r.getAttribute("src") || "", o = t(i);
    !o || o === r.getAttribute("src") || (r.dataset.nutbookOriginalSrc = i, r.setAttribute("src", o));
  }, n = (r) => {
    r.querySelectorAll("img[src]").forEach(e);
  };
  return new Ie({
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
async function rT({ root: t, markdown: e = "", language: n = null, onChange: r = null, onEdit: i = null, tableToolsEnabled: o = !0, resolveImageSrc: s = null }) {
  if (!t)
    throw new Error("Milkdown root is required");
  const l = window.NutbookI18n, a = (M) => {
    var w, x;
    return ((x = l == null ? void 0 : l.lookup) == null ? void 0 : x.call(l, M, n || ((w = l.currentLanguage) == null ? void 0 : w.call(l)))) ?? M;
  };
  cg(t), t.innerHTML = "";
  let u = e, c = !1, f = !1, d = !1, h = null, p = null, m = !1, y = null, g = null, E = null, T = !1, B = null, z = null;
  const S = /* @__PURE__ */ new Map(), D = () => {
    c || i == null || i(), c = !0;
  }, V = ["beforeinput", "input", "paste", "keydown", "compositionend"];
  for (const M of V)
    t.addEventListener(M, D, !0);
  const q = (M) => {
    if (!(M.metaKey || M.ctrlKey) || M.altKey || M.key.toLowerCase() !== "z") return;
    const w = Y();
    !w || !(M.shiftKey ? br : Ei)(w.state, w.dispatch, w) || (M.preventDefault(), M.stopPropagation(), w.focus(), ge(), xe(), ue());
  };
  t.addEventListener("keydown", q, !0);
  const N = await Lx.make().config((M) => {
    M.set(Go, t), M.set(Wo, e), M.update(Qt, (w) => [
      $d({
        "Mod-z": Ei,
        "Shift-Mod-z": br,
        "Mod-y": br,
        Backspace: eT
      }),
      tT(),
      nT(s),
      ...w
    ].filter(Boolean)), M.update(wa, (w) => w.updated(() => {
      d && (f = !0, ge(), xe(), ue(), c || i == null || i(), c = !0);
    }).markdownUpdated((x, I) => {
      u = I, d && I !== e && (f = !0, ge(), xe(), ue(), c || i == null || i(), c = !0, r == null || r(I));
    }));
  }).use(pC).use(mN).use(NN).use(ug).create(), _ = () => N.action((M) => {
    const w = M.get(Ve);
    return u = M.get(Ai)(w.state.doc), u;
  }), H = _();
  queueMicrotask(() => {
    d = !0, ur(), To(), mt(), ge(), xe(), ue();
  });
  function Y() {
    return N.action((M) => M.get(Ve));
  }
  function le(M) {
    var O, L, $;
    if (!M || !ve(M.state)) return null;
    const { from: w } = M.state.selection, x = M.domAtPos(w), I = ((O = x.node) == null ? void 0 : O.nodeType) === Node.ELEMENT_NODE ? x.node : (L = x.node) == null ? void 0 : L.parentElement;
    return (($ = I == null ? void 0 : I.closest) == null ? void 0 : $.call(I, "table")) || null;
  }
  function X(M) {
    const w = Y();
    if (!w) return !1;
    const x = M(w.state, w.dispatch, w);
    return x && (D(), w.focus(), ge(), xe()), x;
  }
  function ke(M) {
    if (!M) return [];
    const w = [];
    return M.state.doc.descendants((x, I) => {
      var O;
      return ((O = x.type) == null ? void 0 : O.name) === "code_block" && w.push({ node: x, pos: I }), !0;
    }), w;
  }
  function pe(M, w) {
    var $;
    const x = Y();
    if (!x) return !1;
    const I = x.state.doc.nodeAt(M);
    if (!I || (($ = I.type) == null ? void 0 : $.name) !== "code_block") return !1;
    const O = String(w || "").trim(), L = x.state.tr.setNodeAttribute(M, "language", O);
    return x.dispatch(L), D(), x.focus(), ue(), !0;
  }
  function Je(M, w) {
    var O;
    const x = document.createElement("select");
    x.className = "markdown-code-language-select", x.setAttribute("aria-label", a("markdown.codeLanguage"));
    const I = ((O = w.node.attrs) == null ? void 0 : O.language) || "";
    return x.innerHTML = fh(I).map((L) => `<option value="${Bo(L.value)}">${Bo(L.label)}</option>`).join(""), x.value = I, x.addEventListener("mousedown", (L) => {
      L.stopPropagation();
    }), x.addEventListener("click", (L) => {
      L.stopPropagation();
    }), x.addEventListener("change", (L) => {
      L.preventDefault(), L.stopPropagation(), pe(Number(x.dataset.codeBlockPos), L.target.value);
    }), B.appendChild(x), S.set(M, x), x;
  }
  function mt() {
    B || (B = document.createElement("div"), B.className = "markdown-code-language-layer", t.appendChild(B), ["keyup", "mouseup", "focusin", "pointerup", "input"].forEach((M) => {
      t.addEventListener(M, ue, !0);
    }), window.addEventListener("scroll", ue, !0), window.addEventListener("resize", ue));
  }
  function k() {
    if (z = null, !B || !d) return;
    const M = Y(), w = t.querySelector(".ProseMirror");
    if (!M || !w) return;
    const x = t.getBoundingClientRect(), I = Array.from(w.querySelectorAll("pre")), O = ke(M);
    S.forEach((L, $) => {
      I.includes($) || (L.remove(), S.delete($));
    }), I.forEach((L, $) => {
      var cr;
      const Q = O[$];
      if (!Q) return;
      const re = S.get(L) || Je(L, Q);
      re.dataset.codeBlockPos = String(Q.pos);
      const be = ((cr = Q.node.attrs) == null ? void 0 : cr.language) || "";
      [...re.options].some((ai) => ai.value === be) || (re.innerHTML = fh(be).map((ai) => `<option value="${Bo(ai.value)}">${Bo(ai.label)}</option>`).join("")), re.value = be;
      const Ye = L.getBoundingClientRect(), fe = Ye.bottom > x.top && Ye.top < x.bottom && L.offsetParent !== null;
      if (re.style.display = fe ? "inline-flex" : "none", !fe) return;
      const it = Math.max(8, Ye.left - x.left + 16), Qe = Math.max(8, Ye.top - x.top + 10);
      re.style.left = `${Math.round(it)}px`, re.style.top = `${Math.round(Qe)}px`;
    });
  }
  function ue() {
    B && (z && cancelAnimationFrame(z), z = requestAnimationFrame(k));
  }
  function gt(M) {
    const w = Y(), x = w == null ? void 0 : w.state.schema.marks[M];
    return x ? X(lo(x)) : !1;
  }
  function b() {
    var M;
    h && ((M = h.querySelector(".markdown-format-link-popover")) == null || M.classList.remove("open"), y = null);
  }
  function Ge() {
    const M = Y(), w = M == null ? void 0 : M.state.selection;
    if (!h || !M || !w || w.empty) return !1;
    y = { from: w.from, to: w.to };
    const x = h.querySelector(".markdown-format-link-popover"), I = h.querySelector("[data-format-link-input]");
    return !x || !I ? !1 : (x.classList.add("open"), I.value = "", window.setTimeout(() => I.focus(), 0), !0);
  }
  function Ct(M) {
    const w = String(M || "").trim();
    if (!w) return !1;
    const x = Y(), I = x == null ? void 0 : x.state.schema.marks.link;
    if (!x || !I || !y) return !1;
    const O = Math.max(0, Math.min(y.from, x.state.doc.content.size)), L = Math.max(O, Math.min(y.to, x.state.doc.content.size)), $ = x.state.tr.setSelection(G.create(x.state.doc, O, L)).addMark(O, L, I.create({ href: w }));
    return x.dispatch($.scrollIntoView()), D(), x.focus(), b(), ge(), xe(), !0;
  }
  function me() {
    const M = Y(), w = M == null ? void 0 : M.state.schema.marks.link, x = M == null ? void 0 : M.state.selection;
    if (!M || !w || !x || x.empty) return !1;
    const I = M.state.tr.removeMark(x.from, x.to, w);
    return M.dispatch(I.scrollIntoView()), D(), M.focus(), b(), ge(), xe(), !0;
  }
  function An(M) {
    const w = Y();
    if (!w) return !1;
    const { nodes: x } = w.state.schema;
    if (M === "paragraph")
      return x.paragraph ? X(rr(x.paragraph)) : !1;
    const I = Number(String(M || "").replace("h", ""));
    return !x.heading || !Number.isFinite(I) ? !1 : X(rr(x.heading, { level: I }));
  }
  function St(M, w) {
    const x = M == null ? void 0 : M.state.schema.marks[w];
    if (!M || !x) return !1;
    const { from: I, to: O, empty: L, $from: $ } = M.state.selection;
    return L ? !!x.isInSet(M.state.storedMarks || $.marks()) : M.state.doc.rangeHasMark(I, O, x);
  }
  function nn(M) {
    var x;
    if (!M) return "paragraph";
    const { $from: w } = M.state.selection;
    for (let I = w.depth; I > 0; I -= 1) {
      const O = w.node(I);
      if (O.type.name === "heading")
        return `h${((x = O.attrs) == null ? void 0 : x.level) || 1}`;
      if (O.type.name === "paragraph")
        return "paragraph";
    }
    return "paragraph";
  }
  function rn() {
    var I, O, L;
    const M = document.createElement("div");
    M.className = "markdown-format-toolbar", M.setAttribute("aria-label", a("markdown.formatTools")), M.innerHTML = `
      <label class="markdown-format-heading-wrap">
        <select class="markdown-format-heading" aria-label="${a("markdown.headingLevel")}">
          <option value="paragraph">正文</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
          <option value="h4">H4</option>
        </select>
        <svg class="markdown-format-heading-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.2 4.5 6 7.3l2.8-2.8" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </label>
      <button type="button" data-format-command="bold" aria-label="${a("markdown.bold")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4h4.3c2 0 3.2 1 3.2 2.6 0 1.1-.6 1.9-1.5 2.2 1.3.3 2.1 1.3 2.1 2.7 0 1.9-1.4 3.2-3.6 3.2H6V4Zm2.2 4h1.9c.8 0 1.2-.4 1.2-1.1 0-.7-.5-1.1-1.3-1.1H8.2V8Zm0 5h2.1c.9 0 1.5-.5 1.5-1.3 0-.9-.6-1.3-1.6-1.3h-2V13Z" fill="currentColor"/></svg>
        <span class="markdown-format-tooltip">⌘B</span>
      </button>
      <button type="button" data-format-command="italic" aria-label="${a("markdown.italic")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M9.1 4h6l-.3 1.7h-1.9l-1.8 8.6H13L12.7 16h-6l.3-1.7h1.9l1.8-8.6H8.8L9.1 4Z" fill="currentColor"/></svg>
        <span class="markdown-format-tooltip">⌘I</span>
      </button>
      <button type="button" data-format-command="code" aria-label="${a("markdown.inlineCode")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.2 6.4-3.3 3.5 3.3 3.5M12.8 6.4l3.3 3.5-3.3 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="markdown-format-tooltip">⌘E</span>
      </button>
      <button type="button" data-format-command="strike" aria-label="${a("markdown.strike")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10M7.1 13.3c.6 1 1.7 1.6 3.1 1.6 1.8 0 3-.9 3-2.2 0-1.1-.7-1.8-2.3-2.2l-1.8-.5C7.5 9.6 6.7 8.8 6.7 7.5c0-1.6 1.4-2.7 3.3-2.7 1.5 0 2.6.6 3.2 1.7" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>
        <span class="markdown-format-tooltip">⌥⌘X</span>
      </button>
      <button type="button" data-format-command="link" aria-label="${a("markdown.addLink")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.2 6.7 9.4 5.5a3.3 3.3 0 0 1 4.7 4.7l-1.6 1.6a3.3 3.3 0 0 1-4.5.2M11.8 13.3l-1.2 1.2a3.3 3.3 0 0 1-4.7-4.7l1.6-1.6a3.3 3.3 0 0 1 4.5-.2" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="markdown-format-tooltip">${a("markdown.linkTooltip")}</span>
      </button>
      <div class="markdown-format-link-popover" aria-hidden="true">
        <input data-format-link-input type="text" placeholder="粘贴链接或文件路径" />
        <button type="button" data-format-link-apply>确认</button>
      </div>
    `;
    const w = {
      bold: "strong",
      italic: "emphasis",
      code: "inlineCode",
      strike: "strike_through"
    };
    M.addEventListener("mousedown", ($) => {
      $.target.closest("select") || $.target.closest("input") || $.preventDefault();
    }), M.addEventListener("click", ($) => {
      const Q = $.target.closest("button[data-format-command]");
      if (!(!Q || Q.getAttribute("aria-disabled") === "true")) {
        if ($.preventDefault(), $.stopPropagation(), Q.dataset.formatCommand === "link") {
          if (Q.classList.contains("active")) {
            me();
            return;
          }
          Ge();
          return;
        }
        gt(w[Q.dataset.formatCommand]);
      }
    }), (I = M.querySelector("[data-format-link-apply]")) == null || I.addEventListener("click", ($) => {
      $.preventDefault(), $.stopPropagation();
      const Q = M.querySelector("[data-format-link-input]");
      Ct(Q == null ? void 0 : Q.value);
    }), (O = M.querySelector("[data-format-link-input]")) == null || O.addEventListener("keydown", ($) => {
      var Q;
      $.key === "Enter" && ($.preventDefault(), $.stopPropagation(), Ct($.currentTarget.value)), $.key === "Escape" && ($.preventDefault(), $.stopPropagation(), b(), (Q = Y()) == null || Q.focus());
    });
    const x = M.querySelector("[data-format-link-input]");
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
      x == null || x.addEventListener($, (Q) => Q.stopPropagation());
    }), (L = M.querySelector("select")) == null || L.addEventListener("change", ($) => {
      An($.target.value);
    }), M;
  }
  function ur() {
    h || (h = rn(), t.appendChild(h), ["keyup", "mouseup", "focusin", "pointerup"].forEach((M) => {
      t.addEventListener(M, ge, !0);
    }), document.addEventListener("selectionchange", ge), window.addEventListener("scroll", ge, !0), window.addEventListener("resize", ge), t.addEventListener("focusout", So, !0));
  }
  function En() {
    h && (b(), h.classList.remove("visible"), m = !1);
  }
  function So() {
    window.setTimeout(() => {
      const M = document.activeElement;
      !t.contains(M) && !(h != null && h.contains(M)) && En();
    }, 0);
  }
  function Ps(M) {
    if (!h || !M) return;
    Object.entries({
      bold: "strong",
      italic: "emphasis",
      code: "inlineCode",
      strike: "strike_through",
      link: "link"
    }).forEach(([$, Q]) => {
      const re = h.querySelector(`[data-format-command="${$}"]`);
      if (!re) return;
      const be = !!M.state.schema.marks[Q];
      re.classList.toggle("active", be && St(M, Q)), re.setAttribute("aria-disabled", be ? "false" : "true");
    });
    const x = h.querySelector('[data-format-command="link"]'), I = x == null ? void 0 : x.querySelector(".markdown-format-tooltip"), O = !!(x != null && x.classList.contains("active"));
    x == null || x.setAttribute("aria-label", a(O ? "markdown.removeLink" : "markdown.addLink")), I && (I.textContent = a(O ? "actions.remove" : "markdown.linkTooltip"));
    const L = h.querySelector("select");
    L && (L.value = nn(M));
  }
  function Mo() {
    if (p = null, !h || !d) return;
    const M = Y(), w = M == null ? void 0 : M.state.selection;
    if (!M || !w || w.empty || !t.contains(M.dom)) {
      En();
      return;
    }
    if (ve(M.state)) {
      En();
      return;
    }
    if (!M.state.doc.textBetween(w.from, w.to, " ").trim()) {
      En();
      return;
    }
    Ps(M);
    const I = t.getBoundingClientRect();
    let O = null, L = null;
    try {
      O = M.coordsAtPos(w.from), L = M.coordsAtPos(w.to);
    } catch {
      En();
      return;
    }
    const $ = h.offsetWidth || 248, Q = h.offsetHeight || 38, re = Math.min(O.left, L.left), be = Math.max(O.right || O.left, L.right || L.left), Ye = Math.min(O.top, L.top), fe = Math.max(O.bottom || O.top, L.bottom || L.top), it = (re + be) / 2, Qe = Math.max(8, Math.min(it - I.left - $ / 2, I.width - $ - 8));
    let cr = Ye - I.top - Q - 10;
    cr < 8 && (cr = fe - I.top + 10), h.style.left = `${Math.round(Qe)}px`, h.style.top = `${Math.round(cr)}px`, m || (h.classList.add("visible"), m = !0);
  }
  function ge() {
    h && (p && cancelAnimationFrame(p), p = requestAnimationFrame(Mo));
  }
  function No(M) {
    if (!o) return !1;
    const w = Y();
    if (!w || !ve(w.state)) return !1;
    const x = M(w.state, w.dispatch, w);
    return x && (D(), w.focus(), xe()), x;
  }
  function zs() {
    const M = document.createElement("div");
    M.className = "markdown-table-toolbar", M.setAttribute("aria-label", a("markdown.tableTools"));
    const w = {
      "row-before": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5h12M4 9.5h12M4 13.5h12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M10 2.8v4.1M7.9 4.8 10 2.7l2.1 2.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "row-after": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5h12M4 9.5h12M4 13.5h12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M10 17.2v-4.1M7.9 15.2l2.1 2.1 2.1-2.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "column-before": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 4v12M9.5 4v12M13.5 4v12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M2.8 10h4.1M4.8 7.9 2.7 10l2.1 2.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "column-after": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 4v12M9.5 4v12M13.5 4v12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M17.2 10h-4.1M15.2 7.9l2.1 2.1-2.1 2.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "delete-row": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M4 10h12M4 14h12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="m7.7 7.7 4.6 4.6m0-4.6-4.6 4.6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>',
      "delete-column": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4v12M10 4v12M14 4v12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="m7.7 7.7 4.6 4.6m0-4.6-4.6 4.6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>'
    }, x = {
      "row-before": "上方插行",
      "row-after": "下方插行",
      "column-before": "左侧插列",
      "column-after": "右侧插列",
      "delete-row": "删除行",
      "delete-column": "删除列"
    };
    M.innerHTML = `
      ${Object.keys(x).map((O) => `
        <button type="button" data-table-command="${O}" aria-label="${x[O]}">
          ${w[O]}
          <span class="markdown-table-tooltip">${x[O]}</span>
        </button>
      `).join("")}
    `;
    const I = {
      "row-before": _C,
      "row-after": VC,
      "column-before": pm,
      "column-after": mm,
      "delete-row": km,
      "delete-column": gm
    };
    return M.addEventListener("mousedown", (O) => {
      O.preventDefault();
    }), M.addEventListener("click", (O) => {
      const L = O.target.closest("button[data-table-command]");
      L && (O.preventDefault(), O.stopPropagation(), No(I[L.dataset.tableCommand]));
    }), M;
  }
  function To() {
    !o || g || (g = zs(), t.appendChild(g), ["keyup", "mouseup", "focusin", "pointerup"].forEach((M) => {
      t.addEventListener(M, xe, !0);
    }), window.addEventListener("scroll", xe, !0), window.addEventListener("resize", xe));
  }
  function vo() {
    g && (g.classList.remove("visible"), T = !1);
  }
  function Bs() {
    if (E = null, !g || !o || !d) return;
    const M = Y(), w = le(M);
    if (!w) {
      vo();
      return;
    }
    const x = t.getBoundingClientRect();
    let I = null;
    try {
      I = M.coordsAtPos(M.state.selection.from);
    } catch {
      I = w.getBoundingClientRect();
    }
    const O = g.offsetWidth || 224, L = g.offsetHeight || 38, $ = ((I.left || 0) + (I.right || I.left || 0)) / 2, Q = Math.max(6, Math.min($ - x.left - O / 2, x.width - O - 6));
    let re = (I.top || 0) - x.top - L - 10;
    re < 6 && (re = (I.bottom || I.top || 0) - x.top + 10), g.style.left = `${Math.round(Q)}px`, g.style.top = `${Math.round(re)}px`, T || (g.classList.add("visible"), T = !0);
  }
  function xe() {
    !o || !g || (E && cancelAnimationFrame(E), E = requestAnimationFrame(Bs));
  }
  function Io(M) {
    return N.action((w) => {
      const x = w.get(Ve), I = M(x.state, x.dispatch, x);
      return I && (x.focus(), ge(), xe(), ue()), I;
    });
  }
  const li = {
    editor: N,
    getMarkdown() {
      return _();
    },
    getBaselineMarkdown() {
      return H;
    },
    hasChanges() {
      return f || c;
    },
    undo() {
      return Io(Ei);
    },
    redo() {
      return Io(br);
    },
    focus() {
      N.action((M) => {
        M.get(Ve).focus();
      });
    },
    blur() {
      N.action((M) => {
        M.get(Ve).dom.blur();
      });
    },
    focusAtText(M, w = 0) {
      const x = hh(M);
      return x ? N.action((I) => {
        const O = I.get(Ve);
        let L = null;
        return O.state.doc.descendants(($, Q) => {
          if (!$.isText || L !== null) return !1;
          const re = $.text || "", be = hh(re);
          if (be.indexOf(x) < 0 && !x.includes(be)) return !0;
          const fe = re.indexOf(M), it = fe >= 0 ? fe : 0;
          return L = Math.max(Q + 1, Math.min(Q + re.length, Q + 1 + it + Math.max(0, w))), !1;
        }), L === null ? (O.focus(), !1) : (O.dispatch(O.state.tr.setSelection(G.create(O.state.doc, L)).scrollIntoView()), O.focus(), !0);
      }) : (li.focus(), !1);
    },
    destroy() {
      p && (cancelAnimationFrame(p), p = null), h && (["keyup", "mouseup", "focusin", "pointerup"].forEach((M) => {
        t.removeEventListener(M, ge, !0);
      }), document.removeEventListener("selectionchange", ge), window.removeEventListener("scroll", ge, !0), window.removeEventListener("resize", ge), t.removeEventListener("focusout", So, !0), h.remove(), h = null), z && (cancelAnimationFrame(z), z = null), B && (["keyup", "mouseup", "focusin", "pointerup", "input"].forEach((M) => {
        t.removeEventListener(M, ue, !0);
      }), window.removeEventListener("scroll", ue, !0), window.removeEventListener("resize", ue), S.forEach((M) => M.remove()), S.clear(), B.remove(), B = null), E && (cancelAnimationFrame(E), E = null), g && (["keyup", "mouseup", "focusin", "pointerup"].forEach((M) => {
        t.removeEventListener(M, xe, !0);
      }), window.removeEventListener("scroll", xe, !0), window.removeEventListener("resize", xe), g.remove(), g = null);
      for (const M of V)
        t.removeEventListener(M, D, !0);
      t.removeEventListener("keydown", q, !0), N.destroy(), t.innerHTML = "", ys.delete(t);
    }
  };
  return ys.set(t, li), li;
}
window.NutbookMarkdownEditor = {
  create: rT,
  destroy(t) {
    cg(t);
  }
};
