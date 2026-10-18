# Budget Tracker

A mobile budgeting app — monthly budgets, daily spending categories, expense
logging, and reminders — built with **Expo** and **Expo Router**.

The app talks to a separate FastAPI backend — source at
**[sherrytelli/budgeting-app-backend](https://github.com/sherrytelli/budgeting-app-backend)**.
See [API_INTEGRATION.md](./API_INTEGRATION.md) for the full route-by-route
breakdown of how the app talks to it.

---

## Table of contents

- [Tech stack](#tech-stack)
- [Requirements](#requirements)
- [1. Install dependencies](#1-install-dependencies)
- [2. Environment variables](#2-environment-variables)
- [3. Run the Android dev server](#3-run-the-android-dev-server)
- [4. Everyday workflow](#4-everyday-workflow)
- [5. Clean build & cache reset commands](#5-clean-build--cache-reset-commands)
- [6. Linting & type-checking](#6-linting--type-checking)
- [7. Building a production / distributable APK](#7-building-a-production--distributable-apk)
- [8. Versioning & app identity](#8-versioning--app-identity)
- [9. Project structure](#9-project-structure)
- [10. Troubleshooting](#10-troubleshooting)
- [Learn more](#learn-more)

---

## Tech stack

| Piece | Version |
| --- | --- |
| Expo SDK | 57 (`expo ~57.0.29`) |
| React Native | 0.86.3 (New Architecture enabled) |
| React | 19.2.3 |
| Routing | Expo Router 57 — file-based routes in `src/app/` |
| JS engine | Hermes |
| Data / server state | TanStack Query v5, axios |
| UI | React Native Paper, `@expo/ui`, Reanimated, `react-native-svg` |
| Auth storage | `expo-secure-store` (native) / `localStorage` (web) |
| Language | TypeScript (strict) |
| Package manager | **npm** (`package-lock.json`) |

Platforms: **Android is the primary target** (the `android/` folder is
generated). The project also builds for web (`web.output: "static"`). There is
no committed `ios/` project.

> **Expo Go is not supported.** The app depends on native modules that Expo Go
> does not bundle (`@expo/ui`, `expo-glass-effect`, …). You must run a
> development build (`npx expo run:android`) as described below.

---

## Requirements

- **Node.js 20+** (developed against Node 24) and npm.
- **JDK 17** (required by the Android Gradle build). Check with `java -version`.
- **Android Studio / Android SDK** with:
  - Platform & Build-Tools matching the SDK used by Expo SDK 57 (this machine
    uses `android-36`, build-tools `36.0.0`),
  - NDK `27.1.12297006` and CMake `3.22.1` (required to build native modules),
  - `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) pointing at your SDK, and
    `platform-tools` on your `PATH` for `adb`.
- A **device or emulator**. For a physical phone: enable Developer Options →
  USB debugging.
- (iOS only, macOS) Xcode.

Verify your toolchain at any time with:

```bash
npx expo-doctor
```

---

## 1. Install dependencies

```bash
npm install
```

> Always install new packages with Expo so you get SDK-compatible versions —
> never edit `package.json` versions by hand:
>
> ```bash
> npx expo install <package>
> ```
>
> To repair incompatible versions:
>
> ```bash
> npx expo install --fix
> ```

---

## 2. Environment variables

The backend base URL is **never hardcoded** — it is read from the
`EXPO_PUBLIC_BACKEND_URL` environment variable.

### Files

| File | Purpose | Committed? |
| --- | --- | --- |
| `.env.example` | Template with safe defaults | ✅ yes |
| `.env` | Your real config | ❌ git-ignored |
| `.env.local` / `.env*.local` | Machine-specific overrides (e.g. your LAN IP) | ❌ git-ignored |
| `.env.production` | Variables used by production builds | optional |

Create your local file:

```bash
cp .env.example .env
```

Then set the value. It must point at the API and **include the `/api/v1` prefix**:

```bash
# .env
# Production backend
EXPO_PUBLIC_BACKEND_URL=you.example.com/api/v1
```

```bash
# Local backend over USB (paired with `adb reverse tcp:8000 tcp:8000`)
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000/api/v1
```

```bash
# Local backend from a physical device on the same Wi-Fi
EXPO_PUBLIC_BACKEND_URL=http://your_ipv4:8000/api/v1
```

### How they load

Only variables prefixed with `EXPO_PUBLIC_` are inlined into the client bundle.
Each Expo command runs in development or production mode, and files listed first
take priority:

| Mode | Files (highest priority first) |
| --- | --- |
| Development (`expo start`, `run:android` debug) | `.env.development.local`, `.env.local`, `.env.development`, `.env` |
| Production (`expo export`, release builds, EAS) | `.env.production.local`, `.env.local`, `.env.production`, `.env` |

### Rules & gotchas

- **They are inlined at build time, not read at runtime.** After editing `.env`,
  restart the dev server and do a full reload of the app. For a *release/APK*
  build you must **rebuild** the APK — the old URL is baked into the bundle.
- **Never put secrets in `EXPO_PUBLIC_*` variables.** They are visible in
  plain text inside the shipped app.
- Access must be a static `process.env.EXPO_PUBLIC_XXX` reference — destructuring
  or `process.env['EXPO_PUBLIC_XXX']` will **not** be inlined.
- To temporarily disable env loading, prefix any command with
  `EXPO_NO_DOTENV=1` (and/or `EXPO_NO_CLIENT_ENV_VARS=1` to stop the bundler
  from inlining them).
- **Release builds block cleartext HTTP.** Only the debug/debugOptimized
  manifests set `android:usesCleartextTraffic="true"`. A distributable release
  APK can therefore **only** talk to an `https://` backend. Keep the production
  URL on `https://`.

---

## 3. Run the Android dev server

### First run (compiles native code)

This generates the `android/` project, compiles the debug app, installs it on
your device/emulator, and starts Metro:

```bash
npm run android
# equivalent to:
npx expo run:android
```

Pick a specific target, or change the build variant:

```bash
npx expo run:android --device                 # choose a device/emulator
npx expo run:android --variant debug          # default debug build
npx expo run:android --variant debugOptimized # faster iteration (SDK 54+)
```

### Every run after that (JavaScript only)

Once the app is installed, you only need Metro — no native recompile:

```bash
npm start            # npx expo start
npm start -- --android   # start Metro and open on Android directly
```

Then press **`a`** in the terminal to launch the installed app. Metro serves
updated JS in seconds.

| Command | What it does | When to use |
| --- | --- | --- |
| `npx expo run:android` | Compiles native code, installs, starts Metro | First build; after adding a native library; after changing `app.json`/config plugins |
| `npx expo start` | Starts only Metro | Daily JS/TS development |

Useful `expo start` flags:

```bash
npx expo start --clear      # wipe the Metro cache, then start
npx expo start --tunnel     # device can't reach your LAN (different network)
npx expo start --no-dev     # bundle without dev tooling (perf testing)
npx expo start --port 8082  # if 8081 is taken
```

### Connecting a physical device

- **USB:** `npx expo run:android` sets up `adb reverse` for you. To reach a
  backend running on your computer, also forward its port:
  ```bash
  adb reverse tcp:8081 tcp:8081   # Metro
  adb reverse tcp:8000 tcp:8000   # backend, then use http://localhost:8000/api/v1
  ```
- **Wi-Fi:** put the phone and computer on the same network and use your
  machine's LAN IP in `.env` (or `--tunnel` for Metro).
- A debug build connects to Metro via `adb reverse tcp:8081 tcp:8081`.

### Optional: nicer development build

Add the dev-client UI (a launcher screen with your loaded projects, build info,
and logs):

```bash
npx expo install expo-dev-client
npx expo run:android          # rebuild to pick it up
```

---

## 4. Everyday workflow

```bash
# 1. Start Metro
npm start

# 2. Press "a" to open the app
# 3. Edit files in src/ — Fast Refresh applies changes instantly

# 4. Before committing
npx tsc --noEmit
npx expo lint
```

To install a fresh copy on a new emulator without touching your source:

```bash
npx expo run:android --device
```

To build the static web bundle:

```bash
npx expo export --platform web   # output in dist/
```

---

## 5. Clean build & cache reset commands

Run these from the project root unless noted. Escalate only as far as you need.

**Metro / JavaScript bundle issues** (stale cache, weird runtime errors):

```bash
npx expo start --clear
```

**Regenerate the native Android project** (after changing `app.json`, plugins,
or when native config drifts). `--clean` deletes and rebuilds `android/`:

```bash
npx expo prebuild --clean --platform android
```

**Gradle clean** (native build artifacts only, keeps config):

```bash
cd android && ./gradlew clean && cd ..
```

**Remove build outputs manually** (the nuclear Gradle option):

```bash
rm -rf android/app/build android/build android/.gradle android/.kotlin
```

**Full reset** (node_modules + Expo caches + native + Metro):

```bash
rm -rf node_modules .expo android dist
npm install
npx expo run:android
```

**One-shot clean rebuild of the Android app:**

```bash
cd android && ./gradlew clean && cd .. && npx expo run:android
```

**Reset the starter template** (⚠️ destructive — only if you want a blank app).
`scripts/reset-project.js` moves `src/` and `scripts/` to `example/` and creates
a fresh `src/app/` with a placeholder screen, then drops the `reset-project`
script from `package.json`:

```bash
npm run reset-project
```

> Tip: `android/` and `ios/` are generated (Continuous Native Generation) and
> git-ignored. **Never hand-edit generated native files** as your source of
> truth — change `app.json` or a config plugin instead, otherwise your edits are
> lost on the next `prebuild --clean`.

---

## 6. Linting & type-checking

```bash
npx tsc --noEmit     # TypeScript, strict mode
npx expo lint        # ESLint (eslint-config-expo) — also `npm run lint`
npx expo-doctor      # dependency + config health check
npx expo install --fix  # align packages with the SDK
```

---

## 7. Building a production / distributable APK

You have two options. **EAS Build (Option B) is recommended** — it handles
keystore generation/management for you and does not depend on editing
git-ignored native files. Use Option A if you must build entirely locally.

> Note: by default the generated `android/app/build.gradle` signs **release**
> builds with the *debug* keystore. Such an APK installs, but it is **not
> suitable for distribution** (it can't be updated by a properly-signed version
> and shouldn't be published). You must use your own upload/release key.

### Option A — local Gradle release build

**A1. Prerequisites:** JDK 17 (`keytool`) and a generated `android/` folder:

```bash
npx expo prebuild --clean --platform android
```

**A2. Create an upload/release keystore** (once — keep it safe and backed up;
never commit it):

```bash
keytool -genkey -v \
  -keystore budgettracker-release.keystore \
  -alias budgettracker \
  -keyalg RSA -keysize 2048 -validity 10000
```

Move it into `android/app/`:

```bash
mv budgettracker-release.keystore android/app/
```

**A3. Provide the credentials to Gradle.** Prefer `~/.gradle/gradle.properties`
(keeps secrets out of the repo). This project's generated dirs are git-ignored,
so editing `android/gradle.properties` also works locally — but is lost on
`prebuild --clean`.

```properties
# ~/.gradle/gradle.properties  (or android/gradle.properties, locally)
BUDGETTRACKER_UPLOAD_STORE_FILE=budgettracker-release.keystore
BUDGETTRACKER_UPLOAD_KEY_ALIAS=budgettracker
BUDGETTRACKER_UPLOAD_STORE_PASSWORD=********
BUDGETTRACKER_UPLOAD_KEY_PASSWORD=********
```

**A4. Point the release build type at that key.** In `android/app/build.gradle`,
add a `release` signing config and reference it (re-apply after any
`prebuild --clean`):

```gradle
signingConfigs {
    debug { /* … */ }
    release {
        storeFile file(BUDGETTRACKER_UPLOAD_STORE_FILE)
        storePassword BUDGETTRACKER_UPLOAD_STORE_PASSWORD
        keyAlias BUDGETTRACKER_UPLOAD_KEY_ALIAS
        keyPassword BUDGETTRACKER_UPLOAD_KEY_PASSWORD
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        // …
    }
}
```

**A5. Build the artifact.** An **APK** for direct install / distribution:

```bash
cd android
./gradlew :app:assembleRelease
```

An **AAB** for the Google Play Store:

```bash
cd android
./gradlew :app:bundleRelease
```

Artifacts:

| Artifact | Path |
| --- | --- |
| Release APK | `android/app/build/outputs/apk/release/app-release.apk` |
| Release AAB | `android/app/build/outputs/bundle/release/app-release.aab` |
| Debug APK | `android/app/build/outputs/apk/debug/app-debug.apk` |

**A6. Install / share the APK:**

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

To hand out an APK, copy it somewhere descriptive, e.g.
`cp android/app/build/outputs/apk/release/app-release.apk ~/BudgetTracker-2.0.0.apk`,
and send that file — the recipient enables "Install unknown apps" and taps it.

**Shortcut (debug-signed, not for distribution):** `npx expo run:android --variant release`
builds and installs a release variant signed with the debug key — handy for
smoke-testing release behaviour, but not for publishing.

### Option B — EAS Build (recommended)

EAS builds, signs, and stores the binary in the cloud — no local Xcode/Android
SDK needed. This project does not yet have an **`eas.json`**; create one.

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure   # creates eas.json
```

`eas.json` with an installable-APK `preview` profile and a Play-Store
`production` profile:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

Then:

```bash
# Installable APK (internal testing / hand-out)
npx eas-cli@latest build -p android --profile preview

# AAB for Google Play
npx eas-cli@latest build -p android --profile production

# Build on your own machine instead of the cloud
npx eas-cli@latest build -p android --profile preview --local
```

Other EAS commands:

```bash
npx eas-cli@latest build:list -p android         # list builds
npx eas-cli@latest build:run -p android --latest # download + install on emulator
npx eas-cli@latest credentials -p android        # manage the release keystore
npx eas-cli@latest submit -p android             # upload an AAB to Google Play
```

> Set `EXPO_PUBLIC_BACKEND_URL` for cloud builds with EAS environment variables
> (`npx eas-cli@latest env:create`), not by committing `.env`. Builds also read
> the `.env` files uploaded with the project.

---

## 8. Versioning & app identity

Configured in **`app.json`** — edit it there, not in the generated
`android/` folder:

| Setting | Value |
| --- | --- |
| Display name | `Budget Tracker` (`expo.name`) |
| Slug | `budgeting-app` (`expo.slug`) |
| Android package | `com.example.budgettracker` (`expo.android.package`) — set to your own reverse-DNS ID before shipping |
| Deep-link scheme | `budgetingapp` |
| App version | `expo.version` = `2.0.0` (→ `versionName`) |
| Android version code | not set → prebuild defaults to `1` |

Bump the Android `versionCode` before each store upload. Add it to `app.json`
so it survives `prebuild --clean` (or let EAS do it with `"autoIncrement": true`):

```json
{
  "expo": {
    "version": "2.0.1",
    "android": { "versionCode": 3 }
  }
}
```

---

## 9. Project structure

```
src/
  app/                 Expo Router routes — every file here is a screen
    _layout.tsx        Root layout: providers, theme, splash
    index.tsx          Entry route
    main.tsx           Main (post-login) screen
  screens/             Screen implementations (login, main)
  components/          Reusable UI (sheets, pickers, overlays, budget form)
  constants/theme.ts   Design tokens (colors, spacing)
  lib/
    api/               axios client, endpoints, mappers, env, token storage
    auth.tsx           AuthProvider: hydrate/sign-in/sign-out, 401 handling
    dates.ts, format.ts, icons.tsx, reminders.ts(x)
  store.tsx            TanStack Query store for budgets/categories/expenses
assets/                Icons, splash, adaptive icon
scripts/               Project scripts (reset-project)
android/               Generated native project (git-ignored, CNG)
app.json               Expo app config (source of truth for native config)
API_INTEGRATION.md     Backend routes & data-mapping reference
```

Notes:

- Keep non-route code **out of `src/app/`** — everything in there becomes a
  screen.
- The `@/*` path alias maps to `./src/*` (`@/assets/*` → `./assets/*`).
- `react-native-reanimated/plugin` must stay **last** in `babel.config.js`.
- Typed routes and the React Compiler are enabled
  (`expo.experiments.typedRoutes`, `reactCompiler`).

---

## 10. Troubleshooting

**`EXPO_PUBLIC_BACKEND_URL is not set`**
Create `.env` (`cp .env.example .env`) and set the value, then restart Metro.

**Changed `.env` but the app still uses the old URL**
Variables are inlined at build time. Restart the dev server and fully reload the
app (dev menu → Reload), or rebuild the APK for release builds.

**Release APK can't reach the backend (`http://` URLs fail)**
Release builds block cleartext HTTP. Use an `https://` backend URL.

**`adb devices` shows nothing**
Enable USB debugging on the phone, accept the authorization prompt, and check
`adb kill-server && adb start-server`. On Linux you may need to add udev rules.

**Device can't connect to Metro**
`adb reverse tcp:8081 tcp:8081`, keep the phone on the same Wi-Fi, or use
`npx expo start --tunnel`.

**Port 8081 already in use**
`npx expo start --port 8082`, or kill the stale process
(`lsof -ti:8081 | xargs kill`).

**Gradle out-of-memory / slow builds**
Raise the heap in `android/gradle.properties`:
`org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m`.

**Java version errors from Gradle**
Install and select **JDK 17** (`JAVA_HOME` / `org.gradle.java.home`). Other JDKs
are not supported by this Expo SDK's Android build.

**Native changes (new library, `app.json` change) have no effect**
Rebuild: `npx expo run:android`. JS-only changes never need this.

**Native config looks corrupted / build fails after a config change**
```bash
npx expo prebuild --clean --platform android
```

**Weird bundler errors or stale modules**
```bash
npx expo start --clear
# or the full reset in section 5
```

**Dependency or config warnings**
```bash
npx expo-doctor
npx expo install --fix
```

---

## Learn more

- Expo docs (SDK 57): https://docs.expo.dev/versions/v57.0.0/
- Expo Router: https://docs.expo.dev/router/introduction/
- Environment variables: https://docs.expo.dev/guides/environment-variables/
- Local app development: https://docs.expo.dev/guides/local-app-development/
- Release builds locally: https://docs.expo.dev/guides/local-app-production/
- Build APKs with EAS: https://docs.expo.dev/build-reference/apk/
- Continuous Native Generation: https://docs.expo.dev/workflow/continuous-native-generation/
- Backend source code: https://github.com/sherrytelli/budgeting-app-backend
- Backend API reference (routes used by this app): [API_INTEGRATION.md](./API_INTEGRATION.md)
