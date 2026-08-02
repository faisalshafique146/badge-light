import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Badge Light ships as a single self-contained HTML file (a delivery
// requirement — see ASSET_PLAN.md's "single-file build" note). Two
// things have to be true together for that to work:
//
// 1. build.assetsInlineLimit must be raised well above every asset's
//    size, so Vite inlines every imported image/JSON/audio file as a
//    base64 data: URI instead of emitting it as a separate file in
//    dist/. Assets must be imported as JS modules for this to apply —
//    see PreloadScene.js's `import ... from '../assets/...'` calls
//    and the `?url` suffix used for JSON files.
// 2. vite-plugin-singlefile then inlines the built JS bundle (which
//    now contains all those base64 data URIs as string literals)
//    directly into index.html as an inline <script>, and inlines any
//    CSS the same way.
//
// Together: npm run build produces exactly one file, dist/index.html,
// with zero references to anything outside itself.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    assetsInlineLimit: 100 * 1024 * 1024, // 100MB — effectively "always inline"
    cssCodeSplit: false,
    reportCompressedSize: true, // shows the real, gzip-able size in build output
  },
});
