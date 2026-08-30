# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

# @rific/scanner

Full-screen barcode scanner for React Native — animated scan overlays, pinch-to-zoom, a capture timeout ring, and per-value scan tracking (auto-scan or manual capture, with a disabled-value set for "already handled" items).

Part of the `@rific` package ecosystem. Published at https://www.npmjs.com/package/@rific/scanner.

## Commands

```bash
npm run lint         # ESLint
npm run fix          # ESLint --fix
npm run build        # tsup, outputs CJS + ESM + types to dist/
npm run build:watch  # tsup --watch
npm test             # Jest (64 tests)
npm run test:watch   # Jest in watch mode
npm run typecheck    # TypeScript type check (tsc --noEmit)
npm run verify       # lint + test + typecheck + build, in that order
```

Always run `npm run lint` before finishing any task.

## Release

Tag-based, using npm trusted publishing (OIDC, no token required):

```bash
npm run release:patch   # npm version patch && git push --follow-tags (or release:minor / release:major)
```

`preversion` runs `npm run verify` first. `prepublishOnly` runs `npm run build`. The `publish.yml` workflow fires on `v*` tags and delegates to the shared reusable workflow (`infinitetoken/Workflows/.github/workflows/npm-publish.yml@v1`) with `id-token: write` permission for OIDC trusted publishing. `ci.yml` runs on every PR and push to `main` via the shared `npm-ci.yml` reusable workflow, which runs `npm run verify`.

## Architecture

```
src/
  index.ts                       - all public exports
  types.ts                       - hand-written structural mirrors of expo-camera/react-native-paper/react-native-safe-area-context's types (peer-optional injection pattern, see below), plus BarcodeScanResult/ScanResult/PhotoResult/PictureOptions
  Scanner.tsx                    - main component: camera view (or plain fallback view), pinch-to-zoom gesture, permission handling, capture button (photo or scan mode), timeout ring; delegates scan/overlay state to useScanOverlays
  useScanOverlays.tsx            - hook: per-value scan animation state, auto-scan vs. manual-capture handling, disabled-value suppression, timed removal of stale overlays; returns handlePress/handleScan/resetScans/scanNodes
  Scan.tsx                       - one scan overlay: positioned Animated.View that cross-fades between a scan icon and a check icon on press; memoized
  Bounds.tsx                     - four animated corner brackets drawn around a scan target, no logic
  TimerRing.tsx                  - animated circular SVG countdown ring; calls onStop when the timer completes
  buildDisabledScanValueSet.ts   - utility: builds a Set<string> of "treat as already scanned" values from an arbitrary item list + accessor, with an optional size limit
  ScannerConfig.tsx              - module-level mutable config (camera/paper/safeArea injections) via configureScanner()/getScannerConfig(), plus a ScannerProvider wrapper that calls configureScanner() synchronously during render
  __mocks__/
    expo-camera.ts                       - jest mock: CameraView stub, useCameraPermissions returning granted
    react-native-gesture-handler.ts      - jest mock: GestureHandlerRootView/GestureDetector passthrough, no-op Gesture.Pan/Pinch chain
    react-native-svg.ts                  - jest mock: Svg/Circle/G/Defs/Rect/Stop/ClipPath stubs
    react-native-worklets.ts             - jest mock: scheduleOnRN calls its function synchronously
    react-native.ts                      - jest mock: Animated (Value/ValueXY/timing/spring/parallel), Easing, StyleSheet, Platform, View/Text/Pressable/TouchableOpacity stubs
  __tests__/
    Scan.test.tsx
    Scanner.test.tsx
    ScannerConfig.test.tsx
    TimerRing.test.tsx
    buildDisabledScanValueSet.test.ts
    useScanOverlays.test.tsx
    moduleShapes.typecheck.ts  - compile-time-only check that the real peer modules structurally satisfy types.ts's local mirrors; not a runtime test, always shows 0% in coverage (no exclude needed anymore — see Testing)
```

## Public API

From `src/index.ts`:

- `Scanner`, `ScannerProps` — the main component
- `useScanOverlays`, `UseScanOverlaysOptions`, `UseScanOverlaysResult` — the overlay/scan-state hook, for consumers who want to build their own camera UI around it
- `configureScanner`, `getScannerConfig`, `ScannerConfig`, `ScannerProvider`, `ScannerProviderProps` — one-time peer-module injection (camera/paper/safeArea)
- `buildDisabledScanValueSet`, `BuildDisabledScanValueSetOptions` — builds the `disabledScanValueSet` passed to `Scanner`
- `CameraModule`, `CameraPermissionResult`, `IconSource`, `PhotoResult`, `PictureOptions`, `SafeAreaModule`, `ScannerPaperModule`, `ScanResult` (types only)

## Peer Dependencies

- `react` >=19.0.0, `react-native` >=0.76.0 — required
- `react-native-gesture-handler` >=2.0.0 <3.0.0 — required. Pinch-to-zoom (`Gesture.Pinch()`)
- `react-native-svg` >=13.0.0 — required. `TimerRing`'s circular countdown
- `react-native-worklets` 0.10.x — required. Schedules the pinch gesture's zoom updates back onto the JS thread (`scheduleOnRN`)
- `expo-camera` >=55.0.0 — optional (`peerDependenciesMeta`). Injected via `camera` prop/config for the live camera feed and permission handling; omit to render a plain colored view with no camera
- `react-native-paper` >=5.0.0 — optional. Injected via `paper` prop/config to render scan-overlay icons as real Paper `IconButton`s instead of a plain fallback dot
- `react-native-safe-area-context` >=5.0.0 — optional. Injected via `safeArea` prop/config for real device inset handling; omit to fall back to a fixed iOS-style top padding

None of the three optional peers are auto-detected at the module level — Metro doesn't rewrite a `require()`-in-`try/catch` into its module graph inside an ESM build, so they're injected explicitly via props/config instead (see `types.ts`).

## Testing

- Framework: Jest (`@infinitetoken/jest-config/react-native`), jsdom environment
- Mocks in `src/__mocks__/` for `expo-camera`, `react-native-gesture-handler`, `react-native-svg`, `react-native-worklets`, `react-native`
- 64 tests across 6 suites (`Scan.test.tsx`, `Scanner.test.tsx`, `ScannerConfig.test.tsx`, `TimerRing.test.tsx`, `buildDisabledScanValueSet.test.ts`, `useScanOverlays.test.tsx`)
- Coverage floor meets the fleet's 70% default on all four metrics with real margin — measured 98.29/93.14/98.3/98.81% (statements/branches/functions/lines) as of 2026-08-30, including `moduleShapes.typecheck.ts`'s always-0% lines in the denominator; `Scanner.tsx` and `useScanOverlays.tsx` are the weakest-tested files (both still short of 100% branch coverage). No local `collectCoverageFrom`/`coverageThreshold` override — the shared preset's defaults are enough now that coverage has real margin.
- `moduleShapes.typecheck.ts` is a compile-only structural check (`tsc --noEmit` catches drift between `types.ts`'s local mirrors and the real peer modules) — it has no runtime assertions and doesn't match `testMatch`, so it always shows 0% in the coverage report; a local `collectCoverageFrom` exclude used to hide it from the aggregate when coverage was lower, but it's gone now — the file's permanent 0% no longer drags the aggregate below the 70% floor on any metric. (An in-file `/* istanbul ignore file */` was considered as an alternative — tested directly and confirmed it does **not** work in this fleet's setup: files transformed via `ts-jest`, not `babel-jest`, never pass through the Babel pipeline that honors istanbul directives, so the file still reports 0% either way.)

## Code Style

Enforced by ESLint + Prettier, run `npm run lint` before finishing any task.

**Prettier config:**
- Single quotes, JSX single quotes
- No semicolons
- No trailing commas
- Print width: 1000 (effectively disabled)

**ESLint rules (warnings unless noted):**
- `simple-import-sort` — imports and exports must be sorted
- `react-native/no-inline-styles` — no inline style objects
- `react-native/no-unused-styles` — no unused StyleSheet entries
- `no-console` — no console statements
- `@typescript-eslint/no-unused-vars` — `varsIgnorePattern`/`argsIgnorePattern`/`caughtErrorsIgnorePattern: '^_'` (unused vars/args/caught errors prefixed `_` are allowed)
- `@typescript-eslint/no-explicit-any` — off in `__tests__/`/`__mocks__/`; on in `src/` proper. `Scanner.tsx` and `Scan.tsx` disable it file-wide (camera ref, gesture event casts, icon resolution); `types.ts` disables it inline just for `CameraView`'s `ComponentType<any>`
- `react-hooks/rules-of-hooks` — error, not a warning
- `react-hooks/exhaustive-deps`, `react-hooks/refs`, `react-hooks/immutability`, `react-hooks/preserve-manual-memoization`, `react-hooks/set-state-in-effect`
- `package-json/order-properties`, `package-json/sort-collections` — on `package.json` itself

`tsconfig.json` sets `noUnusedLocals: false` (all other strict overrides removed) — the one genuinely load-bearing exception, needed for `moduleShapes.typecheck.ts`'s deliberately-unused `const` type-constraint declarations; TypeScript doesn't honor an eslint-style `_`-prefix exemption for `noUnusedLocals`.
