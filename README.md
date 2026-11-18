# DB Scan

A mobile QR and barcode scanner built with Expo and React Native, designed for company inventory tracking. Scan an item to look it up, update its location or details, or add it if it's new. Scanning works offline.

> **Status:** product preview. The app runs against a built-in mock company API. The real company API is not connected yet.

## Features

- **Scanner:** QR and 1D/2D barcode modes with an instant toggle, gallery import, and demo scan
- **Results:** copy, share, open URL, and product lookup actions
- **History:** searchable, filterable by type and date
- **Inventory:** look up scanned items, update location or status, edit info, add new items
- **Auth and roles:** employee login with `viewer`, `staff`, and `admin` permissions
- **Audit trail:** every change records employee, timestamp, old values, and new values
- **Offline support:** local decoding always works; changes are queued and synced when back online
- **Accessibility:** screen-reader labels and large touch targets (light theme only)

## Tech stack

Expo (SDK 58), React Native, TypeScript, expo-router, expo-camera, AsyncStorage, pnpm.

## Getting started

```bash
pnpm install
npx expo start
```

Open the project in **Expo Go** on your phone (the SDK version must match).

### Demo accounts (mock API)

| Role   | Email                | Password   |
| ------ | -------------------- | ---------- |
| Viewer | viewer@company.test  | viewer123  |
| Staff  | staff@company.test   | staff123   |
| Admin  | admin@company.test   | admin123   |

Permissions: staff can add items and update location; only admin can edit item info; viewers are read-only.

## Project structure

```
app/(tabs)/        Screens (scan, history, settings)
components/        Shared UI (scan-ui.tsx)
hooks/             Theme and color hooks
lib/company-api.ts Company API layer (mock and HTTP implementations)
lib/scan-store.tsx Scan history, settings, and onboarding state
```

## Connecting a real company API

The app uses the mock API unless a base URL is set. Create a `.env` file:

```
EXPO_PUBLIC_COMPANY_API_BASE_URL=https://your-api.example.com
EXPO_PUBLIC_COMPANY_AUTH_METHOD=bearer
```

Then adapt the endpoints and field mapping in `lib/company-api.ts`. `EXPO_PUBLIC_*` values are bundled into the app, so never put secrets in them. The server must enforce roles; the client-side check is only for the UI.

## Building an Android APK

```bash
eas build -p android --profile preview
```

## Demo data

Sample items and employees live in `lib/company-api.ts` (`mockItems`, `MOCK_ACCOUNTS`). Mock data resets when the app reloads.