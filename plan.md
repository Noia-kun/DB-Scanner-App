# Scanly — implementation plan

## Product approach

Scanly is a one-handed, local-first scanner app for QR and 1D/2D barcodes. The primary experience stays on a single camera surface: a persistent segmented control changes the active decoder and the guidance copy without navigating away. Results become a focused action sheet with copy, share, URL open, and product lookup actions. History and settings are reachable from the bottom tab bar and use on-device state so offline scanning remains useful.

The first implementation uses Expo Router + React Native + TypeScript + NativeWind-compatible React Native primitives. `expo-camera` supplies native permission, camera preview, and barcode callbacks; `expo-image-picker` supplies the optional gallery import. A small in-memory/local storage model keeps the prototype deterministic in Preview and provides a clear seam for persistence. The UI includes simulated warm-up, offline, denied, poor-lighting, unrecognized, success, retry, and alternate-mode states so the product can be reviewed without a physical camera.

## Project structure

- `app/(tabs)/index.tsx`: scanner screen, onboarding/tutorial, camera permission state, mode segmented control, viewfinder, gallery import, and decode/recovery flows.
- `app/(tabs)/history.tsx`: searchable, filterable history with empty and offline-aware states.
- `app/(tabs)/settings.tsx`: default mode, haptic/sound, auto-copy, theme, and clear-history controls.
- `app/(tabs)/_layout.tsx`: accessible bottom tab navigation and dark theme shell.
- `lib/scan-store.ts`: shared scan types, sample state, and local persistence helpers.
- `components/scan-ui.tsx`: reusable buttons, segmented control, result cards, and state badges.
- `assets/images/*`: Scanly brand icon set used by Expo native configuration.

## Design direction

Three possible directions were considered: “Night transit control room” (0.08), “Soft glass wellness utility” (0.06), and “Editorial paper archive” (0.03). The selected direction is **Night transit control room**.

- **Design Movement:** contemporary dark-mode control-room UI with crisp editorial typography and instrument-panel contrast.
- **Core Principles:** glanceable hierarchy, confident affordances, visible system state, and generous one-handed touch targets.
- **Color Philosophy:** near-black navy gives the camera surface depth; electric mint marks the active scan path; warm amber is reserved for caution and recovery; cool slate separates structure without flattening the dark canvas.
- **Layout Paradigm:** a portrait “instrument stack”: top utility rail, central scan chamber, bottom action dock, and short vertical sheets for results/settings rather than dense grids.
- **Signature Elements:** mint corner brackets around the viewfinder, small uppercase state labels, and a soft “signal pulse” dot beside live status.
- **Interaction Philosophy:** each action confirms itself through a visible state change, tactile-sized controls, and short explanatory microcopy; mode changes keep the user in context.
- **Animation:** mode switch uses a quick 180ms slide/fade; live status dots pulse subtly; result feedback uses a single mint flash and never blocks the next action.
- **Typography System:** system sans for navigation and labels, with bold condensed-feeling weight hierarchy created through letter spacing and uppercase metadata; readable 16–18px body copy.
- **Brand Essence:** “The scanner that stays out of your way.” Precise, calm, ready.
- **Brand Voice:** concise and reassuring. Example lines: “Hold steady. Scanly is watching for a code.” / “Readable signal. Choose what happens next.”
- **Wordmark & Logo:** a compact mint square with two offset corner brackets, suggesting both a scan frame and a forward-moving route marker; the wordmark is set as `SCANLY` with generous tracking.
- **Signature Brand Color:** signal mint `#B8F36B`.

## Functional decisions

- Local scanning is the default and does not depend on network connectivity.
- Preview/web uses a clearly labeled simulated camera surface with quick demo scan actions; native builds use the real camera callbacks when `expo-camera` is available.
- Onboarding is dismissible after a short tutorial but returns if camera permission is denied; the permission CTA is explicit and repeatable.
- History filters are independent: all/QR/barcode plus all/today/this week. Search matches decoded payload or type.
- Product lookup appears only for product-like numeric barcode values and opens a URL-shaped lookup action rather than silently leaving the app.
- Accessibility labels and hints are attached to the segmented control, scan actions, result actions, settings rows, and history items.
