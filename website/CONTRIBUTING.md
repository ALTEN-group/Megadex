# Contributing to the Documentation

## Local Development

```bash
cd website
npm install
npm run dev
```

Or via Docker Compose (`scripts/start-dev.sh`): available at `http://localhost:8100/docs/`.

## Recording Admin UI Demo Clips

The home page embeds short `<video>` loops of the Angular admin UI located in
`docs/public/videos/`. They are recorded deterministically from the live dev
stack using Playwright + ffmpeg in `admin/demos/` — see
[`admin/README.md`](../admin/README.md#recording-website-demos) for the command
and how to add a new clip.
