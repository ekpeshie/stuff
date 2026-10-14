# Hue — web app

A React + TypeScript (Vite) build of the Claude Design prototype in `design/Hue.dc.html`. The design handoff notes, chat transcript and prototype runtime are also in `design/`.

```sh
npm install
npm run dev      # local dev server
npm run build    # typecheck + production build
```

## Structure

- `src/data.ts`: placeholder catalogue, palettes, copy constants
- `src/lib.ts`: scoring, styling reasons, in-browser photo analysis, local storage
- `src/styles.css`: design tokens (CSS variables), keyframes, shared button and chip classes
- `src/App.tsx`: app state, feed assembly (filters, personalization ranking, endless pages, curated rows)
- `src/components/`: Header and filter panel, Feed (masonry, tiles, carousels), ProductDrawer, UploadModal, Studio (analysis and preferences), PaletteExplorer, reset dialog and toast

## Privacy model

- The photo is read with `URL.createObjectURL` and analysed on a canvas in the page. It is never sent anywhere.
- The object URL is revoked as soon as the palette estimate exists.
- `localStorage` (`hue.v1`) holds only saved item IDs, preferences, the palette key and the sampled tone hex. Reset clears everything except saved items.

## Still placeholder

- Products, brands, retailers and URLs (`example.com`) in `data.ts` are stand-ins. Every price, availability flag and retailer link has to come from real product feeds.
- Imagery is striped color blocks, each labelled with the shot it stands for.
- The palette estimate is a simple warm/cool and light/deep heuristic over the central region of the photo. The UI presents it as an estimate.
