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

Run the TV app in development mode:

```sh
pnpm dev-tv
```

Run the Expo app in development mode:

```sh
pnpm dev-m
```

Build the TV app:

```sh
pnpm build-tv
```

Build the Expo app:

```sh
pnpm build-m
```

Use the root default dev command when you want the TV app:

```sh
pnpm dev
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
