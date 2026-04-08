# meditation.surf

This repository now uses a practical two-app layout:

- `apps/tv-lightning`: the existing Lightning.js TV experience
- `apps/mobile-expo`: the Expo scaffold for mobile and desktop-class UX
- `packages/core`: shared domain, catalog, API, analytics, and preference models
- `packages/player-core`: shared playback contracts and state/event types

The split is intentionally strict:

- UI, focus, navigation, layout, and lifecycle code stay app-specific
- Only domain and playback contracts are shared
- The current DOM video plus Shaka path remains inside the Lightning app

## Getting started

Install dependencies:

```sh
pnpm install
```

Check for dependency vulnerabilities:

```sh
pnpm audit-ci
```

Run the TV app in development mode:

```sh
pnpm dev:tv
```

Run the Expo app in development mode:

```sh
pnpm dev:mobile
```

Run the web app in development mode:

```sh
pnpm dev:web
```

Run the repository checks:

```sh
pnpm lint
pnpm build
pnpm test
```

Auto-fix formatting and lint issues:

```sh
pnpm format
```
