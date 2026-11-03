// Produce a Vendetta-loader adapter without modifying the original Snow bundle.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const original = await readFile(new URL('NightyTab/index.js', root), 'utf8');
const source = JSON.parse(await readFile(new URL('NightyTab/manifest.json', root), 'utf8'));
const bundle = `(() => {
  const bunny = { ...window.bunny,
    React: window.bunny?.metro?.common?.React ?? vendetta.metro.common.React,
    ReactNative: window.bunny?.metro?.common?.ReactNative ?? vendetta.metro.common.ReactNative,
    plugin: { ...window.bunny?.plugin,
    createStorage(defaults) {
      const storage = vendetta.plugin.storage;
      for (const [key, value] of Object.entries(defaults)) if (storage[key] === undefined) storage[key] = value;
      return storage;
    }
  } };
  const definePlugin = instance => instance;
${original}
  const instance = plugin.default ?? plugin;
  return { onLoad: () => instance.start?.(), onUnload: () => instance.stop?.(), settings: instance.SettingsComponent };
})()`;
const manifest = {
  name: source.display.name,
  description: source.display.description,
  authors: source.display.authors,
  main: 'index.js',
  hash: createHash('sha256').update(bundle).digest('hex'),
  vendetta: { icon: 'ic_settings_24px' }
};
await mkdir(new URL('KettuNightyTab/', root), { recursive: true });
await writeFile(new URL('KettuNightyTab/index.js', root), bundle);
await writeFile(new URL('KettuNightyTab/manifest.json', root), JSON.stringify(manifest, null, 2) + '\n');
