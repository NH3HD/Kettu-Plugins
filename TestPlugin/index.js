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

  // TestPlugin.entry.js
  var TestPlugin_entry_exports = {};
  __export(TestPlugin_entry_exports, {
    default: () => TestPlugin_entry_default
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

  // project:src/test-math.js
  function add(a, b) {
    return Number(a) + Number(b);
  }

  // project:src/plugins/test-plugin.js
  function TestPlugin(r) {
    const { h, React, RN, C, D } = r, { Page, Text, Button } = ui(r);
    let report = ["Bunny spec 3", "Bundled sibling module: 2 + 3 = " + add(2, 3)], busy = false;
    async function run() {
      if (busy) return;
      busy = true;
      r.changed();
      const lines = [`${r.meta.name} ${r.meta.version} \xB7 Snow`, `Bundled module import: ${add(2, 3) === 5 ? "PASS" : "FAIL"}`];
      try {
        r.set("runs", (Number(r.store.runs) || 0) + 1);
        await r.api.storage.flush();
        lines.push("Storage flush: PASS \xB7 run " + r.store.runs);
        const target = { add(a, b) {
          return a + b;
        } };
        const unpatch = r.api.patcher.after("add", target, (_args, value) => value + 1);
        try {
          lines.push("Scoped patch: " + (target.add(2, 3) === 6 ? "PASS" : "FAIL"));
        } finally {
          unpatch();
        }
        lines.push("Patch cleanup: " + (target.add(2, 3) === 5 ? "PASS" : "FAIL"));
        for (const file of ["data.json", "extra.js", "lib/math.js"]) {
          try {
            const data = await r.request("https://raw.githubusercontent.com/xMimiez/Snow-Plugins/main/TestPlugin/" + file);
            if (file === "data.json") data.json();
            lines.push(`${file}: fetched ${data.text.length} characters (not evaluated)`);
          } catch (e) {
            lines.push(`${file}: ${e.message}`);
          }
        }
        for (const name of ["UserStore", "ChannelStore", "PresenceStore", "ReadStateStore"]) lines.push(`${name}: ${r.byStore(name) ? "available" : "unavailable"}`);
        lines.push("Native CSS injection: unavailable in React Native. Use the isolated WebView CSS test.");
      } catch (e) {
        lines.push("Test error: " + e.message);
      } finally {
        report = lines;
        busy = false;
        if (r.active) r.changed();
      }
    }
    function CssTest({ close }) {
      const WebView = r.find("WebView")?.WebView || r.byName("WebView");
      return h(Page, { title: "Isolated CSS test", close }, WebView ? h(WebView, { originWhitelist: ["about:blank"], javaScriptEnabled: false, onShouldStartLoadWithRequest: (req) => req.url === "about:blank", source: { html: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#202127;color:#eee;font:18px system-ui;padding:24px}.card{border:2px solid #8892ff;border-radius:16px;padding:24px}</style><div class="card">Snow WebView CSS works. This style is isolated from Discord.</div>' }, style: { height: 240 } }) : h(Text, null, "WebView unavailable"));
    }
    function alert() {
      const AlertModal = D.AlertModal || C.AlertModal;
      const AlertActions = D.AlertActions || C.AlertActions;
      const AlertActionButton = D.AlertActionButton || C.AlertActionButton;
      if (!AlertModal || !AlertActions || !AlertActionButton) return r.toast("Alert components unavailable");
      r.api.ui.openAlert("test", h(AlertModal, { title: "Snow alert test", content: "This alert is owned by TestPlugin and is dismissed when the plugin stops.", actions: h(AlertActions, null, h(AlertActionButton, { text: "Close", onPress: () => r.api.ui.dismissAlert("test") })) }));
    }
    function Settings({ close }) {
      r.useRefresh();
      return h(Page, { title: "TestPlugin \xB7 Snow", close }, h(Button, { text: busy ? "Running\u2026" : "Run compatibility checks", disabled: busy, onPress: run }), h(Button, { text: "Test native alert", variant: "secondary", onPress: alert }), h(Button, { text: "Test sheet and WebView CSS", variant: "secondary", onPress: () => {
        try {
          r.open("css", CssTest);
        } catch (e) {
          r.error("CSS test", e);
        }
      } }), h(Button, { text: "Copy report", variant: "secondary", onPress: () => r.copy(report.join("\n")) }), h(Text, { selectable: true }, report.join("\n")));
    }
    return { start() {
      r.command({ name: "testplugin", description: "Open Snow compatibility checks", execute() {
        r.open("diagnostics", Settings);
      } });
    }, Settings, run };
  }
  TestPlugin.defaults = { runs: 0 };

  // TestPlugin.entry.js
  var TestPlugin_entry_default = register({ "id": "mime.testplugin", "name": "TestPlugin", "description": "Native Snow compatibility checks, sibling files, popups and isolated WebView CSS.", "version": "2.2.2", "authors": [{ "name": "Mime | N0_.q3", "id": "957164619061932045" }], "license": "MIT", "source": "https://github.com/xMimiez/Snow-Plugins/tree/main/TestPlugin" }, TestPlugin);
  return __toCommonJS(TestPlugin_entry_exports);
})();
