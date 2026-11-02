# Nighty Tab

Nighty Tab adds Nighty to Discord's mobile settings and profile action bar. The shortcut uses Discord's control layout, spacing, label, touch target, and alignment.

## Install on KettuTweak, Snowcord, or another compatible mobile client

You need a client that supports Bunny/Snow **spec 3** plugins and installation from a manifest URL.

1. Open your modded Discord client.
2. Go to **Settings → Plugins**.
3. Tap **Install from URL** or the **+** button.
4. Paste this manifest URL:

   ```text
   https://raw.githubusercontent.com/xMimiez/Snow-Plugins/main/NightyTab/manifest.json
   ```

5. Install and enable **Nighty Tab**.
6. Reload or fully restart Discord if the new profile-bar button does not appear immediately.

For a fork, replace `xMimiez/Snow-Plugins` and `main` with your GitHub username, repository, and branch. Keep `manifest.json` and `index.js` together in the `NightyTab` folder.

## Set up Nighty Tab

1. Open **Settings → Plugins → Nighty Tab**.
2. Enter the full `https://` URL of the Nighty page you want the tab to open.
3. Leave **Profile Nighty button** enabled to show it beside Discord's Settings action.
4. Choose **White logo** to match Discord's native bar icons, or **Blue logo** for Nighty's brand color. A custom HTTPS image URL is also supported.
5. Tap **Open Nighty** to test the page.

Inside the Nighty page, pull down from the top to reload. Pinch zoom and horizontal page movement are disabled so the embedded page stays fixed in place.

After you sign in, Nighty Tab saves Nighty's access token on your device for the configured host. The plugin restores the cookie after you close the tab or restart Discord. Nighty handles your username and password. The server may ask you to sign in after it expires or revokes the token.

## Updating

Remove the older copy first if your client does not replace plugins cleanly, then install the same manifest URL again. Reload Discord after updating.

## Troubleshooting

- **The button is missing:** enable **Profile shortcut**, then reload Discord. A Discord UI update may break the injected control.
- **The old oversized logo remains:** remove the old plugin, restart Discord, reinstall from the manifest URL, and reload once more.
- **Nighty does not load:** verify that the configured address begins with `http://` or `https://` and does not contain embedded credentials.
- **Install from URL fails:** open the manifest URL in your browser to confirm it is reachable, then copy it again without spaces.
- **KettuTweak/Snowcord has no Plugins page:** that build may not include a compatible plugin loader. Update the client or use a build that supports spec-3 plugins.

## Notes

Nighty Tab has no affiliation with Discord or Nighty. Discord may prohibit modified clients under its Terms of Service. Use one at your own risk.
