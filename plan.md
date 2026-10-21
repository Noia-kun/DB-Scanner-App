# DBScan — implementation plan

## Product approach

DBScan is a one-handed, local-first scanner app for QR and 1D/2D barcodes. The primary experience stays on a single camera surface: a persistent segmented control changes the active decoder and the guidance copy without navigating away. Results become a focused action sheet with copy, share, URL open, and product lookup actions. History and settings are reachable from the bottom tab bar and use on-device state so offline scanning remains useful.

The first implementation uses Expo Router + React Native + TypeScript + NativeWind-compatible React Native primitives. `expo-camera` supplies native permission, camera preview, and barcode callbacks; `expo-image-picker` supplies the optional gallery import. A small in-memory/local storage model keeps the prototype deterministic in Preview and provides a clear seam for persistence. The UI includes simulated warm-up, offline, denied, poor-lighting, unrecognized, success, retry, and alternate-mode states so the product can be reviewed without a physical camera.

## Project structure

- `app/(tabs)/index.tsx`: scanner screen, onboarding/tutorial, camera permission state, mode segmented control, viewfinder, gallery import, and decode/recovery flows.
- `app/(tabs)/history.tsx`: searchable, filterable history with empty and offline-aware states.
- `app/(tabs)/settings.tsx`: default mode, haptic/sound, auto-copy, company theme, and clear-history controls.
- `app/(tabs)/_layout.tsx`: accessible bottom tab navigation and light company-theme shell.
- `lib/scan-store.ts`: shared scan types, sample state, and local persistence helpers.
- `components/scan-ui.tsx`: reusable buttons, segmented control, result cards, state badges, and the shared Doha Bank scanner mark.
- `assets/images/*`: Doha Bank-inspired scanner brand icon set used by Expo native configuration.

## Design direction

Three possible directions were considered: “Doha Bank editorial banking” (0.08), “Soft glass wellness utility” (0.06), and “Night transit control room” (0.03). The selected direction is **Doha Bank editorial banking**.

- **Design Movement:** editorial banking interface with a mostly white canvas, deep-blue typography, and warm sand-beige highlight surfaces.
- **Core Principles:** calm clarity, confident affordances, visible system state, and generous one-handed touch targets.
- **Color Philosophy:** white and soft ivory create the open, trustworthy base seen in Doha Bank’s web presence; deep blue anchors headings, navigation, and scan structure; sand beige highlights active controls and branded moments; restrained utility colors preserve meaning for warnings, offline state, and destructive actions.
- **Layout Paradigm:** a portrait “service panel”: slim top utility rail, central scan chamber, bottom action dock, and short vertical sheets for results/settings rather than dense grids.
- **Signature Elements:** sand-beige scanner reticle, a Doha Bank-inspired blue-and-sand D sail inside the logo mark, small uppercase state labels, and a soft “signal pulse” dot beside live status.
- **Interaction Philosophy:** each action confirms itself through a visible state change, tactile-sized controls, and short explanatory microcopy; mode changes keep the user in context.
- **Animation:** mode switch uses a quick 180ms slide/fade; live status dots pulse subtly; result feedback uses a single sand-beige flash and never blocks the next action.
- **Typography System:** system sans for navigation and labels, with bold condensed-feeling weight hierarchy created through letter spacing and uppercase metadata; readable 16–18px body copy.
- **Brand Essence:** “The scanner that stays out of your way.” Precise, calm, ready.
- **Brand Voice:** concise and reassuring. Example lines: “Hold steady. DBScan is watching for a code.” / “Readable signal. Choose what happens next.”
- **Wordmark & Logo:** a deep-blue and sand D sail mark inspired by Doha Bank’s current identity, enclosed by a sand-beige scanner reticle; the wordmark reads `DOHA BANK SCAN` with a small `Smart Scanner` qualifier so it is not a plain bank logo.
- **Signature Brand Color:** deep blue `#123B5A`, paired with Doha sand `#D6C5B0` and a brighter bank blue `#0B4F93` for the adapted mark.

## Functional decisions

- Local scanning is the default and does not depend on network connectivity.
- Preview/web uses a clearly labeled simulated camera surface with quick demo scan actions; native builds use the real camera callbacks when `expo-camera` is available.
- Onboarding is dismissible after a short tutorial but returns if camera permission is denied; the permission CTA is explicit and repeatable.
- History filters are independent: all/QR/barcode plus all/today/this week. Search matches decoded payload or type.
- Product lookup appears only for product-like numeric barcode values and opens a URL-shaped lookup action rather than silently leaving the app.
- Accessibility labels and hints are attached to the segmented control, scan actions, result actions, settings rows, and history items.

## Company-system extension

The company integration uses a swappable `CompanyApi` contract in `lib/company-api.ts`. Because the real API base URL and auth method are not supplied yet, Preview defaults to a deterministic mock adapter with viewer, staff, and admin employee fixtures. A future HTTP adapter uses `EXPO_PUBLIC_COMPANY_API_BASE_URL` and `EXPO_PUBLIC_COMPANY_AUTH_METHOD` without changing screens or state management; expected routes are isolated in that adapter so the production endpoint mapping can be replaced in one file.

`lib/company-store.tsx` owns secure session persistence, expiry/logout, employee attribution, cached item details, pending mutations, sync status, and automatic retry. Native tokens use `expo-secure-store`; Preview uses a local fallback so the mock flow remains reviewable. Every queued mutation contains employee ID/name/role, timestamp, old values, new values, and an expected version timestamp. Conflict and duplicate errors remain visible and never silently discard a queued action.

The result route performs company lookup after local decoding. Found items render name, SKU, location, status, and last-updated metadata with role-gated Update location and Edit info actions. Unknown codes offer Add new item with the scanned code prefilled or Scan again. Offline lookup returns cached data only; unknown offline codes show an offline state rather than claiming the item does not exist. Add/edit forms require confirmation for overwrites and preserve pending sync state.

New project modules are `lib/company-api.ts` for the adapter contract/mock/HTTP seam, `lib/company-store.tsx` for auth/cache/queue/sync state, and `app/login.tsx` for employee sign-in. The existing scanner, history, settings, light theme, accessibility labels, and large touch targets remain the primary shell.
