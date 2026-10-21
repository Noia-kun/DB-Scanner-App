# DBScan deliverables

## 0. Doha Bank-inspired scanner identity
- [x] Replace the current DBScan corner-bracket logo with a Doha Bank-inspired deep-blue and sand D sail mark.
- [x] Add a sand-beige scanner border/reticle around the mark and a `Smart Scanner` qualifier after `DOHA BANK SCAN` so the app logo is distinct from the plain Doha Bank logo.

## 1. Camera scanner and onboarding
- [x] First-run onboarding requests camera permission and presents a concise 10-second scanning tutorial, including a clear re-request path when permission is denied.
- [x] Camera screen keeps a persistent QR/Barcode segmented control visible; switching changes the active decoder and on-screen guidance without leaving the viewfinder.
- [x] Scanner covers camera warm-up, high-contrast framing guidance, local/offline decoding, optional gallery image import, and the company light theme.
- [x] Scanner exposes clear successful-decode feedback plus unrecognized-code, poor-lighting, retry, and try-other-mode recovery states.

## 2. Decoded result actions
- [x] Successful decode leads to a result screen/card that identifies the decoded content.
- [x] Result actions support one-tap copy, share, opening URLs, and product lookup when applicable, with visible action-error feedback when a device action is unavailable.
- [x] Result controls and decoded content expose screen-reader labels and hints.

## 3. Scan history
- [x] History stores decoded scans on-device and has an informative no-history-yet state.
- [x] History supports text search and filters by QR/barcode type and date using calendar-day boundaries.
- [x] History items can be reopened as results and remain usable offline.

## 4. Settings and feedback
- [x] Settings expose default mode, haptic feedback, sound feedback, auto-copy, the company theme, and clear-history controls.
- [x] Large touch targets, accessible labels, responsive portrait layout, and smooth mode-toggle animation are applied throughout.

## 5. Doha Bank-inspired visual theme
- [x] Replace the existing green control-room palette with a Doha Bank-inspired palette using deep blue for primary app anchors and sand beige for active scan states and primary actions.
- [x] Carry the revised palette through the scanner, result, history, settings, tab bar, native splash, and adaptive icon background while preserving readable contrast for text, warnings, offline state, and destructive actions.

## 6. Doha Bank-inspired light balance
- [x] Rebalance the app to a mostly white and soft-ivory foundation, using deep blue as the primary company color and sand beige as the signature highlight rather than treating the interface as a two-color dark theme.
- [x] Preserve clear supporting neutrals and distinct utility colors for muted text, borders, warnings, offline state, and destructive actions across scanner, result, history, settings, navigation, splash, and adaptive icon surfaces.

## 7. Company authentication and roles
- [x] Provide a swappable company API/auth layer because the real API base URL and auth method are not yet supplied; default Preview to a mock adapter with viewer, staff, and admin employee fixtures.
- [x] Let employees sign in with existing-account credentials, store tokens securely, detect expiry, support logout, and attribute every cloud action to the signed-in employee.
- [x] Enforce viewer, staff, and admin permissions in both the client action gates and the API adapter: viewers can read, staff can add/update locations, and admins can edit item information.

## 8. Company lookup and item actions
- [x] After each local decode, look up the code through the company API and show found item name, SKU, location, status, and last-updated data.
- [x] Found items provide role-gated Update location and Edit info actions; unknown codes offer Add new item with the scanned code pre-filled or Scan again.
- [x] Confirm overwrites, reject or surface duplicate codes, and show conflict/error feedback without losing the user’s pending change.

## 9. Offline integrity and sync
- [x] Keep scanning and local history fully functional when the API is unavailable; cloud lookup degrades to cached data or an explicit offline state.
- [x] Queue add/update actions while offline, sync automatically when connectivity returns, show queued/syncing/synced/error state, and never silently drop a queued action.
- [x] Every cloud mutation records employee, timestamp, old values, and new values, including queued mutations that later sync.
