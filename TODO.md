# DBScan deliverables

## 0. Doha Bank-inspired scanner identity
- [x] Replace the current DBScan corner-bracket logo with a Doha Bank-inspired deep-blue and sand D sail mark.
- [x] Add a sand-beige scanner border/reticle around the mark and a `Smart Scanner` qualifier after `DOHA BANK SCAN` so the app logo is distinct from the plain Doha Bank logo.

## 1. Camera scanner and onboarding
- [x] First-run onboarding requests camera permission and presents a concise 10-second scanning tutorial, including a clear re-request path when permission is denied.
- [x] Camera screen keeps a persistent QR/Barcode segmented control visible; switching changes the active decoder and on-screen guidance without leaving the viewfinder.
- [x] Scanner covers camera warm-up, high-contrast framing guidance, local/offline decoding, optional gallery image import, and dark mode.
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
- [x] Settings expose default mode, haptic feedback, sound feedback, auto-copy, dark mode, and clear-history controls.
- [x] Large touch targets, accessible labels, responsive portrait layout, and smooth mode-toggle animation are applied throughout.

## 5. Doha Bank-inspired visual theme
- [x] Replace the existing green control-room palette with a Doha Bank-inspired palette using deep blue for the app canvas and structural surfaces and sand beige for active scan states and primary actions.
- [x] Carry the revised palette through the scanner, result, history, settings, tab bar, native splash, and adaptive icon background while preserving readable contrast for text, warnings, offline state, and destructive actions.
