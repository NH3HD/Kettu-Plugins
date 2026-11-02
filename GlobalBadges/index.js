var plugin = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // GlobalBadges.entry.js
  var GlobalBadges_entry_exports = {};
  __export(GlobalBadges_entry_exports, {
    default: () => GlobalBadges_entry_default
  });

  // project:src/runtime.js
  function createRuntime(B, meta, defaults = {}) {
    const React = B.React;
    const RN = B.ReactNative;
    if (!React?.createElement || !RN?.View) throw new Error(`${meta.name}: host React/React Native unavailable`);
    const D = B.metro?.common?.components || {};
    const C = B.ui?.components || D;
    const cleanups = [];
    const listeners = /* @__PURE__ */ new Set();
    const requests = /* @__PURE__ */ new Set();
    const openSheets = /* @__PURE__ */ new Map();
    const control = new AbortController();
    let active = true;
    const initial = JSON.parse(JSON.stringify(defaults));
    const store = B.plugin?.createStorage ? B.plugin.createStorage(initial) : initial;
    for (const [key, value] of Object.entries(initial)) if (store[key] === void 0) store[key] = value;
    const alerts = /* @__PURE__ */ new Set();
    const r = {
      B,
      meta,
      React,
      RN,
      C,
      D,
      h: React.createElement,
      store,
      metro: B.metro,
      common: B.metro?.common || {},
      host: B,
      context: { signal: control.signal },
      get active() {
        return active && !control.signal.aborted;
      },
      status: {},
      api: {
        commands: B.commands || B.api?.commands,
        flux: B.flux || B.api?.flux,
        patcher: B.patcher || B.api?.patcher,
        storage: {
          createStorage: () => store,
          get value() {
            return store;
          },
          flush: () => B.plugin?.flushStorage?.() || Promise.resolve()
        },
        ui: {
          ...B.ui,
          openAlert(id, element) {
            if (!r.active) return;
            alerts.add(id);
            return B.ui.openAlert(id, element);
          },
          dismissAlert(id) {
            alerts.delete(id);
            return B.ui.dismissAlert(id);
          }
        }
      },
      own(fn) {
        if (typeof fn === "function") cleanups.push(fn);
        return fn;
      },
      changed() {
        for (const fn of listeners) fn();
      },
      useRefresh() {
        B.plugin?.useProxy?.(store);
        const [, bump] = React.useState(0);
        React.useEffect(() => {
          if (!r.active) return;
          const fn = () => bump((n) => n + 1);
          listeners.add(fn);
          return () => listeners.delete(fn);
        }, []);
        return () => r.changed();
      },
      set(key, value) {
        if (!r.active) return;
        store[key] = value;
        r.changed();
        Promise.resolve(B.plugin?.flushStorage?.()).catch((e) => r.error("Save settings", e));
      },
      find(...props) {
        try {
          return B.metro.findByProps?.(...props);
        } catch {
          return void 0;
        }
      },
      byName(name, raw = false) {
        try {
          return B.metro.findByName?.(name, !raw) || B.metro.findByDisplayName?.(name, !raw);
        } catch {
          return void 0;
        }
      },
      byStore(name) {
        try {
          return B.metro.findByStoreName?.(name);
        } catch {
          return void 0;
        }
      },
      toast(message, icon) {
        if (!r.active) return;
        const text = String(message);
        const show = B.ui?.showToast || B.ui?.toasts?.showToast;
        if (typeof show !== "function") return;
        if (icon) {
          try {
            show(text, icon);
            return;
          } catch {
          }
          try {
            show({ content: text, icon });
            return;
          } catch {
          }
        }
        show(text);
      },
      error(label, error) {
        const text = `${label}: ${error?.message || error}`;
        console.error(`[${meta.name}]`, text);
        r.status.lastError = text;
        r.changed();
        r.toast(text);
      },
      patch(kind, parent, key, callback) {
        const patcher = r.api.patcher;
        if (typeof parent?.[key] !== "function" || typeof patcher?.[kind] !== "function") return false;
        r.own(patcher[kind](key, parent, callback));
        return true;
      },
      subscribe(type, callback) {
        const flux = r.api.flux;
        if (typeof flux?.subscribe !== "function") throw new Error(`${meta.name}: flux.subscribe unavailable`);
        return r.own(flux.subscribe(type, (payload) => {
          if (r.active) callback(payload);
        }));
      },
      channelId(ctx) {
        if (typeof ctx === "string" && /^\d{5,}$/.test(ctx)) return ctx;
        if (ctx && !Array.isArray(ctx)) {
          const id = ctx.channel?.id || ctx.channel?.channelId || ctx.channelId || ctx.channel_id;
          if (id) return id;
        }
        const selected = r.byStore("SelectedChannelStore");
        return selected?.getChannelId?.() || selected?.getCurrentlySelectedChannelId?.() || selected?.getLastSelectedChannelId?.() || null;
      },
      local(channelId, content) {
        if (!r.active) return false;
        const util = r.find("sendBotMessage");
        if (typeof util?.sendBotMessage === "function") {
          try {
            util.sendBotMessage(channelId, content);
            return true;
          } catch {
          }
        }
        r.toast(String(content));
        return false;
      },
      command(command) {
        const register2 = r.api.commands?.registerCommand;
        if (typeof register2 !== "function") throw new Error(`${meta.name}: commands.registerCommand unavailable`);
        const name = command.name;
        const execute = command.execute;
        const prepared = {
          ...command,
          name,
          options: (command.options || []).map((opt) => ({ ...opt })),
          async execute(args, ctx) {
            if (!r.active) return;
            try {
              const result = await execute(args, ctx);
              if (!r.active) return;
              return result;
            } catch (error) {
              if (r.active) r.error(`/${name}`, error);
            }
          }
        };
        return r.own(register2(prepared));
      },
      wait(ms) {
        if (!r.active) return Promise.reject(new Error("Plugin stopped"));
        return new Promise((resolve, reject) => {
          const finish = () => {
            clearTimeout(timer);
            control.signal.removeEventListener("abort", abort);
          };
          const abort = () => {
            finish();
            reject(new Error("Plugin stopped"));
          };
          const timer = setTimeout(() => {
            finish();
            resolve();
          }, ms);
          control.signal.addEventListener("abort", abort, { once: true });
        });
      },
      async request(url, options = {}, timeout = 15e3, maxBytes = Infinity) {
        if (!r.active) throw new Error("Plugin stopped");
        const controller = new AbortController();
        let rejectDeadline;
        const deadline = new Promise((_, reject) => {
          rejectDeadline = reject;
        });
        const abort = () => {
          controller.abort();
          rejectDeadline(new Error(r.active ? "Request timed out" : "Plugin stopped"));
        };
        requests.add(abort);
        control.signal.addEventListener("abort", abort, { once: true });
        const timer = setTimeout(abort, timeout);
        try {
          const response = await Promise.race([fetch(url, { ...options, signal: controller.signal }), deadline]);
          if (Number(response.headers?.get("content-length")) > maxBytes) {
            controller.abort();
            throw new Error("Response exceeds the preview size limit");
          }
          const text = await Promise.race([response.text(), deadline]);
          if (text.length > maxBytes) throw new Error("Response exceeds the preview size limit");
          if (!r.active) throw new Error("Plugin stopped");
          if (!response.ok) {
            let body;
            try {
              body = JSON.parse(text);
            } catch {
              body = {};
            }
            const error = new Error(body.message || `HTTP ${response.status}`);
            error.status = response.status;
            error.retryAfter = Number(body.retry_after) || 0;
            throw error;
          }
          return { response, text, json() {
            return text ? JSON.parse(text) : null;
          } };
        } finally {
          clearTimeout(timer);
          requests.delete(abort);
          control.signal.removeEventListener("abort", abort);
        }
      },
      async discord(path, options = {}) {
        if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid Discord API path");
        if (!r.active) throw new Error("Plugin stopped");
        const found = r.find("HTTP", "get", "post", "put", "patch", "del") || r.find("get", "post", "put", "del");
        const client = found?.HTTP || found;
        const method = (options.method || "GET").toLowerCase().replace(/^delete$/, "del");
        if (typeof client?.[method] !== "function") throw new Error("Discord HTTP client unavailable");
        try {
          const response = await client[method]({ url: path, ...options.body != null ? { body: typeof options.body === "string" ? JSON.parse(options.body) : options.body } : {} });
          if (!r.active) throw new Error("Plugin stopped");
          if (response?.status >= 400) throw Object.assign(new Error(response.body?.message || `HTTP ${response.status}`), { status: response.status, body: response.body });
          return { response, json() {
            return response?.body ?? null;
          } };
        } catch (cause) {
          const error = new Error(cause?.body?.message || cause?.message || "Discord request failed");
          error.status = cause?.status;
          error.retryAfter = Number(cause?.body?.retry_after) || 0;
          throw error;
        }
      },
      hook(names, transform) {
        const set = new Set(names);
        const jsx = B.api?.react?.jsx;
        if (jsx?.onJsxCreate && jsx?.deleteJsxCreate) {
          for (const name of names) {
            const callback = (_Component, element) => {
              if (!r.active) return;
              r.status[name] = (r.status[name] || 0) + 1;
              try {
                return transform(element, name);
              } catch (error) {
                r.error(`JSX ${name}`, error);
              }
            };
            jsx.onJsxCreate(name, callback);
            r.own(() => jsx.deleteJsxCreate(name, callback));
          }
        }
        r.patch("after", React, "createElement", (args, result) => {
          if (!r.active || !result) return;
          const type = args[0];
          const name = typeof type === "string" ? type : type?.displayName || type?.name || type?.type?.name;
          if (!name || !set.has(name)) return;
          r.status[name] = (r.status[name] || 0) + 1;
          try {
            return transform(result, name) ?? result;
          } catch (error) {
            r.error(`createElement ${name}`, error);
          }
        });
      },
      patchRows(transform) {
        const apply = (value) => {
          try {
            const wasString = typeof value === "string";
            const rows = wasString ? JSON.parse(value) : value;
            const next = transform(rows);
            if (next == null) return value;
            return wasString ? typeof next === "string" ? next : JSON.stringify(next) : next;
          } catch {
            return value;
          }
        };
        const modules = r.RN.NativeModules || {};
        for (const key of Object.keys(modules)) {
          if (typeof modules[key]?.updateRows === "function") {
            r.patch("before", modules[key], "updateRows", (args) => {
              if (args && args[1] != null) args[1] = apply(args[1]);
            });
          }
        }
        const manager = r.byName("RowManager");
        const proto = manager?.prototype || manager;
        if (typeof proto?.generate === "function") {
          r.patch("after", proto, "generate", (_args, row) => apply(row));
        }
      },
      hideSheets() {
        for (const close of [...openSheets.values()]) {
          try {
            close();
          } catch {
          }
        }
        openSheets.clear();
      },
      open(key, Component, props = {}, options = {}) {
        if (!r.active) throw new Error("Plugin stopped");
        const sheets = B.ui?.sheets;
        const ActionSheet = D.ActionSheet || C.ActionSheet;
        if (!sheets?.showSheet || !sheets?.hideSheet || !ActionSheet) throw new Error("Snow bottom-sheet components unavailable");
        const id = `${meta.id}.${key}`;
        openSheets.get(id)?.();
        let closed = false;
        const close = () => {
          if (closed) return;
          closed = true;
          if (openSheets.get(id) === close) openSheets.delete(id);
          sheets.hideSheet(id);
        };
        class Boundary extends React.Component {
          state = { error: null };
          static getDerivedStateFromError(error) {
            return { error };
          }
          componentDidCatch(error) {
            r.error("Sheet rendering", error);
          }
          render() {
            if (!this.state.error) return this.props.children;
            const U = ui(r);
            return r.h(U.Page, { title: "Could not display this page", close }, r.h(U.Text, null, this.state.error.message));
          }
        }
        function Page() {
          React.useEffect(() => () => {
            if (openSheets.get(id) === close) openSheets.delete(id);
            closed = true;
          }, []);
          return r.h(ActionSheet, { scrollable: options.scrollable ?? true }, r.h(Boundary, null, r.h(Component, { ...props, close })));
        }
        openSheets.set(id, close);
        try {
          sheets.showSheet(id, Page);
        } catch (error) {
          close();
          throw error;
        }
        return close;
      },
      copy(text) {
        if (!r.active) return;
        const clip = r.common.clipboard || r.find("setString");
        if (!clip?.setString) throw new Error("Clipboard unavailable");
        clip.setString(String(text));
        r.toast("Copied");
      },
      dispose() {
        active = false;
        control.abort();
        for (const id of alerts) {
          try {
            B.ui?.dismissAlert?.(id);
          } catch (e) {
            console.error(`[${meta.name}] alert cleanup`, e?.message);
          }
        }
        alerts.clear();
        for (const abort of requests) abort();
        requests.clear();
        for (const close of [...openSheets.values()]) {
          try {
            close();
          } catch {
          }
        }
        openSheets.clear();
        while (cleanups.length) {
          try {
            cleanups.pop()();
          } catch (e) {
            console.error(`[${meta.name}] cleanup`, e?.message);
          }
        }
        r.changed();
        listeners.clear();
        return r.api.storage.flush();
      }
    };
    return r;
  }
  function ui(r) {
    const { h, RN, store } = r;
    const colors = { background: "#111214", surface: "#1E1F22", surfacePressed: "#26272B", border: "#2B2D31", text: "#F2F3F5", muted: "#B5BAC1", accent: "#5865F2", danger: "#F23F43" };
    const palette = { "text-danger": colors.danger, "text-warning": "#FEE75C", "text-muted": colors.muted, "text-normal": colors.text };
    function Text({ children, muted = false, heading = false, color, style, ...props }) {
        const resolved = palette[color] || (muted ? colors.muted : colors.text);
        const base = heading
            ? { color: colors.muted, fontSize: 13, lineHeight: 18, fontWeight: "600", marginLeft: 4, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }
            : { color: resolved, fontSize: muted ? 13 : 16, lineHeight: muted ? 18 : 21, fontWeight: muted ? "400" : "600" };
        return h(RN.Text, { ...props, style: [base, style] }, children);
    }
    function Button({ text, onPress, disabled, variant = "primary", ...props }) {
        const primary = variant !== "secondary";
        return h(RN.Pressable || RN.TouchableOpacity, {
            ...props,
            accessibilityRole: "button",
            accessibilityLabel: text,
            accessibilityState: { disabled: !!disabled },
            disabled: !!disabled,
            onPress,
            style: ({ pressed } = {}) => ({
                minHeight: 48,
                borderRadius: 12,
                paddingHorizontal: 16,
                backgroundColor: primary ? (pressed ? "#4752C4" : colors.accent) : (pressed ? colors.surfacePressed : colors.surface),
                borderWidth: primary ? 0 : 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
                opacity: disabled ? 0.5 : 1,
            }),
        }, h(RN.Text, { style: { color: primary ? "#FFFFFF" : colors.muted, fontSize: 16, lineHeight: 20, fontWeight: "700" } }, text));
    }
    function Input({ value, onChange, label, secureTextEntry, style, ...props }) {
        const field = h(RN.TextInput, {
            ...props,
            value: value == null ? "" : String(value),
            onChangeText: onChange,
            secureTextEntry: !!secureTextEntry,
            placeholderTextColor: "#6D6F78",
            autoCorrect: false,
            selectionColor: colors.accent,
            style: [{ minHeight: 50, color: colors.text, fontSize: 16, lineHeight: 21, backgroundColor: "#151619", borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12 }, style],
        });
        if (!label) return field;
        return h(RN.View, { style: { gap: 8 } },
            h(RN.Text, { style: { color: colors.muted, fontSize: 13, lineHeight: 18, fontWeight: "600", marginLeft: 4 } }, label),
            field);
    }
    function Toggle({ setting, label, subLabel }) {
        r.useRefresh();
        return h(RN.View, { style: { minHeight: 72, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 } },
            h(RN.View, { style: { flex: 1 } },
                h(RN.Text, { style: { color: colors.text, fontSize: 16, lineHeight: 21, fontWeight: "600", marginBottom: subLabel ? 3 : 0 } }, label),
                subLabel ? h(RN.Text, { style: { color: colors.muted, fontSize: 14, lineHeight: 19 } }, subLabel) : null),
            h(RN.Switch, {
                accessibilityLabel: label,
                value: !!store[setting],
                onValueChange: value => r.set(setting, value),
                trackColor: { false: "#3F4147", true: colors.accent },
                thumbColor: "#FFFFFF",
                ios_backgroundColor: "#3F4147",
            }));
    }
    function Slider({ value, onValueChange, ...props }) {
        return h(Input, {
            ...props,
            value: String(value),
            onChange: text => {
                const next = Number(text);
                onValueChange(Number.isFinite(next) ? next : 0);
            },
            keyboardType: "numeric",
        });
    }
    function card(rows) {
        return h(RN.View, { style: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden" } }, ...rows);
    }
    function Page({ title, children, close }) {
        const items = [];
        const walk = value => {
            if (value == null || value === false) return;
            if (Array.isArray(value)) { value.forEach(walk); return; }
            items.push(value);
        };
        walk(children);
        const blocks = [];
        let toggles = [];
        const flush = () => {
            if (!toggles.length) return;
            const rows = [];
            toggles.forEach((node, index) => {
                if (index) rows.push(h(RN.View, { key: "divider-" + index, style: { height: 1, backgroundColor: colors.border, marginLeft: 16 } }));
                rows.push(node);
            });
            blocks.push(card(rows));
            toggles = [];
        };
        for (const child of items) {
            if (child.type === Toggle) { toggles.push(child); continue; }
            flush();
            if (child.type === Input) {
                blocks.push(card([h(RN.View, { key: "field", style: { padding: 14 } }, child)]));
                continue;
            }
            blocks.push(child);
        }
        flush();
        const body = [];
        if (title) body.push(h(RN.Text, { key: "title", accessibilityRole: "header", style: { color: colors.muted, fontSize: 13, lineHeight: 18, fontWeight: "600", marginLeft: 4, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 } }, title));
        blocks.forEach((block, index) => {
            if (body.length && !(title && index === 0)) body.push(h(RN.View, { key: "gap-" + index, style: { height: 22 } }));
            body.push(block);
        });
        if (close) {
            if (body.length) body.push(h(RN.View, { key: "gap-close", style: { height: 22 } }));
            body.push(h(Button, { key: "close", text: "Close", variant: "secondary", onPress: close }));
        }
        return h(RN.ScrollView, {
            style: { flex: 1, backgroundColor: colors.background },
            contentContainerStyle: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 36 },
            keyboardShouldPersistTaps: "handled",
            showsVerticalScrollIndicator: false,
        }, ...body);
    }
    return { Text, Button, Page, Input, Toggle, Slider };
}
  function register(meta, factory) {
    const B = bunny;
    let runtime;
    let instance;
    return definePlugin({
      async start() {
        if (runtime) {
          try {
            await instance?.stop?.();
          } finally {
            await runtime.dispose();
          }
        }
        runtime = createRuntime(B, meta, factory.defaults || {});
        try {
          instance = factory(runtime);
          await instance.start?.();
        } catch (error) {
          runtime.error("Start failed", error);
          await runtime.dispose();
          throw error;
        }
      },
      async stop() {
        try {
          await instance?.stop?.();
        } finally {
          await runtime?.dispose();
          instance = null;
          runtime = null;
        }
      },
      SettingsComponent() {
        return instance?.Settings ? runtime.h(instance.Settings) : null;
      }
    });
  }

  // project:src/plugins/global-badges.js
  var EQUI_USERS = "https://badges.equicord.org/users";
  var EQUI_USER = "https://badges.equicord.org";
  var VAULT_USER = "https://plugins.obamabot.me/BadgeVault/User";
  var REFRESH = 1e3 * 60 * 30;
  var serviceMap = {
    badgevault: "BadgeVault",
    nekocord: "Nekocord",
    reviewdb: "ReviewDB",
    aero: "Aero",
    aliucord: "Aliucord",
    raincord: "Raincord",
    velocity: "Velocity",
    enmity: "Enmity",
    paicord: "Paicord",
    bunny: "Bunny",
    goosemod: "GooseMod",
    replugged: "Replugged",
    betterdiscord: "BetterDiscord",
    vendroidenhanced: "VendroidEnhanced",
    revenge: "Revenge",
    record: "ReCord",
    vencord: "Vencord",
    equicord: "Equicord",
    discord: "Discord"
  };
  var byUser = {};
  var badgeProps = {};
  var refreshTimer;
  function flattenEquiUser(entries, showPrefix) {
    if (!Array.isArray(entries)) return [];
    return entries.map((b, idx) => {
      const url = b.badge || b.url;
      const mod = b.mod || "custom";
      if (!url || !String(url).startsWith("https://")) return null;
      const modName = serviceMap[String(mod).toLowerCase()] || mod;
      const tip = b.tooltip || b.name || b.label || modName;
      const label = showPrefix ? `${modName} \u2014 ${tip}` : tip;
      return { mod, badge: url, tooltip: label, key: `${mod}-${idx}-${url}` };
    }).filter(Boolean);
  }
  function mergeUser(id, list) {
    const existing = byUser[id] || [];
    const urls = new Set(existing.map((b) => b.badge));
    for (const badge of list) if (!urls.has(badge.badge)) {
      existing.push(badge);
      urls.add(badge.badge);
    }
    if (existing.length) byUser[id] = existing;
  }
  async function loadBadges(r, showPrefix) {
    try {
      const data = (await r.request(EQUI_USERS, {}, 2e4, 2 * 1024 * 1024)).json();
      const users = data?.users || data || {};
      const next = {};
      for (const [id, entries] of Object.entries(users)) {
        const list = flattenEquiUser(entries, showPrefix);
        if (list.length) next[id] = list;
      }
      byUser = next;
    } catch (error) {
      r.B?.logger?.warn?.("GlobalBadges EquiBadges bulk load failed", error);
    }
  }
  async function loadUser(r, id, showPrefix) {
    const results = await Promise.allSettled([
      r.request(`${EQUI_USER}/${id}?separated=true`, {}, 1e4).then((d) => d.json()),
      r.request(`${VAULT_USER}/${id}.json`, {}, 1e4).then((d) => d.json())
    ]);
    if (results[0].status === "fulfilled") {
      const body = results[0].value;
      const groups = body?.badges && typeof body.badges === "object" && !Array.isArray(body.badges) ? body.badges : null;
      if (groups) {
        const list = [];
        for (const [mod, entries] of Object.entries(groups)) {
          for (const item of flattenEquiUser((entries || []).map((e) => ({ ...e, mod })), showPrefix)) list.push(item);
        }
        mergeUser(id, list);
      } else if (Array.isArray(body)) mergeUser(id, flattenEquiUser(body, showPrefix));
    }
    if (results[1].status === "fulfilled") {
      const vault = results[1].value;
      if (!vault?.blocked) {
        mergeUser(id, asVault(vault?.badges, showPrefix));
      }
    }
  }
  function asVault(badges, showPrefix) {
    if (!Array.isArray(badges)) return [];
    return badges.filter((b) => b && !b.pending && String(b.badge || "").startsWith("https://")).map((b, idx) => ({
      mod: "badgevault",
      badge: b.badge,
      tooltip: showPrefix ? `BadgeVault \u2014 ${b.name}` : b.name,
      key: `vault-${idx}-${b.badge}`
    }));
  }
  function GlobalBadges(r) {
    const { h, React } = r, { Page, Text, Toggle } = ui(r);
    function applyBadgeProps(element) {
      const id = element?.props?.id;
      if (typeof id !== "string" || !id.startsWith("gb-")) return;
      const cached = badgeProps[id];
      if (!cached) return;
      return React.cloneElement(element, {
        source: cached.source,
        label: cached.label,
        id: cached.id
      });
    }
    return {
      async start() {
        await loadBadges(r, r.store.showPrefix);
        refreshTimer = setInterval(() => {
          loadBadges(r, r.store.showPrefix).catch(() => {
          });
        }, REFRESH);
        r.own(() => {
          clearInterval(refreshTimer);
          refreshTimer = null;
        });
        r.hook(["ProfileBadge", "RenderBadge"], applyBadgeProps);
        const badgeModule = r.B.metro.findByName?.("useBadges", false);
        if (!badgeModule || typeof badgeModule.default !== "function") {
          r.B.logger?.warn?.("GlobalBadges: useBadges was not found");
          return;
        }
        r.patch("after", badgeModule, "default", (args, result) => {
          const userId = args?.[0]?.userId || args?.[0]?.id || args?.[0]?.user?.id;
          if (!userId || !Array.isArray(result)) return result;
          if (!byUser[userId]) loadUser(r, userId, r.store.showPrefix).catch(() => {
          });
          const extras = byUser[userId];
          if (!extras?.length) return result;
          const seen = new Set(result.map((b) => b?.id).filter(Boolean));
          const next = result.slice();
          extras.forEach((badge, idx) => {
            if (!r.store.showCustom && String(badge.mod).toLowerCase() === "badgevault") return;
            const id = `gb-${userId}-${idx}`;
            if (seen.has(id)) return;
            badgeProps[id] = { id, source: { uri: badge.badge }, label: badge.tooltip, userId };
            const item = { id, description: badge.tooltip, icon: "dummy" };
            if (r.store.placeLeft) next.unshift(item);
            else next.push(item);
            seen.add(id);
          });
          return next;
        });
      },
      Settings() {
        r.useRefresh();
        return h(
          Page,
          { title: "GlobalBadges" },
          h(Toggle, { setting: "showPrefix", label: "Prefix", subLabel: "Show the client mod name in the badge label" }),
          h(Toggle, { setting: "placeLeft", label: "Place on the left", subLabel: "Insert badges at the start of the Discord badge bar" }),
          h(Toggle, { setting: "showCustom", label: "Custom / BadgeVault", subLabel: "Include ObaWorkshop BadgeVault and custom URLs" }),
          h(Text, { muted: true }, "Uses Discord\u2019s useBadges list plus ProfileBadge/RenderBadge JSX hooks (Rain/Bunny). Data from badges.equicord.org and plugins.obamabot.me/BadgeVault.")
        );
      }
    };
  }
  GlobalBadges.defaults = { showPrefix: true, showCustom: true, placeLeft: false };

  // GlobalBadges.entry.js
  var GlobalBadges_entry_default = register({ "id": "mime.globalbadges", "name": "GlobalBadges", "description": "Profile badges from EquiBadges (all client mods) and ObaWorkshop BadgeVault.", "version": "1.1.2", "authors": [{ "name": "domi.btnr", "id": "354191516979429376" }, { "name": "Wolfie", "id": "347096063569559553" }, { "name": "Mime | N0_.q3", "id": "957164619061932045" }], "license": "MIT", "source": "https://github.com/xMimiez/Snow-Plugins/tree/main/GlobalBadges" }, GlobalBadges);
  return __toCommonJS(GlobalBadges_entry_exports);
})();
