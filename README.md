# IFC Viewer — minimal web launcher with shareable 3D links

Upload an `.ifc` file, get a link like `http://host:8080/view/<id>` that opens a
3D view in any modern browser. Rotate (drag), zoom (wheel), pan (right-drag).
No registration, no external services — the IFC is parsed in the browser with
[IFC.js](https://github.com/IFCjs) (web-ifc WASM + three.js).

## Run

```bash
npm install
npm start          # listens on PORT (default 8080)
```

Open `http://localhost:8080/`, upload an IFC file (or drag & drop), and copy the
generated link. Send the link to anyone who can reach the server.

## How it works

- `server.js` (Express): stores uploads in `models/<uuid>.ifc` with metadata in
  `models/index.json`. Links are unguessable UUIDs.
  - `POST /api/models` — raw IFC body, filename in `X-Filename` header → returns `{ id, url }`
  - `GET /api/models` — list of models with absolute share URLs
  - `DELETE /api/models/:id` — remove a model (link stops working)
  - `GET /models/:id` — the raw IFC file (UUID-validated, no path traversal)
  - `GET /view/:id` — the viewer page; `GET /` — the launcher page
- `public/viewer.html` + `public/js/viewer.js` — three.js scene, `IFCLoader`
  from web-ifc-three, OrbitControls, auto camera fit, reset-view and copy-link
  buttons, load progress + error overlay.
- `public/vendor/` — self-hosted three.js r160, web-ifc 0.0.39 (browser bundle +
  `web-ifc.wasm`), web-ifc-three `IFCLoader.js`, and an ESM shim so the UMD
  web-ifc bundle works with the import map. No CDN needed at runtime.

## Notes

- Max upload size: 500 MB (raw body limit in `server.js`).
- IFC4 and IFC2X3 are supported by web-ifc; large real-world models work but
  parse time grows with file size (progress bar shown while downloading).
- Put the server behind a reverse proxy and set `X-Forwarded-Proto` /
  `X-Forwarded-Host` so generated links use the public URL.
- `npm run verify` parses `sample/sample.ifc` with web-ifc in Node to sanity-
  check the bundled WASM.

## Layout

```
server.js            Express API + static hosting
public/index.html    launcher: upload, list, copy link, delete
public/viewer.html   3D viewer page
public/js/viewer.js  three.js + IFCLoader bootstrap
public/vendor/       three.module.js, OrbitControls, BufferGeometryUtils,
                     IFCLoader.js, web-ifc-api-browser.js, web-ifc-shim.js,
                     wasm/web-ifc.wasm
models/              uploaded .ifc files + index.json (runtime data)
sample/sample.ifc    tiny hand-written IFC4 model used for testing
verify-ifc.js        Node script that parses an IFC file with web-ifc
```
