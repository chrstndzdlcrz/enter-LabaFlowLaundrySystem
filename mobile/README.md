# LabaFlow mobile app (Flutter)

Customer-facing companion app for Lab-a-Day Laundry Shop. It talks to exactly the
same backend as the web app: the same tables, the same row level security, and the
same validated functions (`create_booking`, `cancel_my_order`,
`get_or_create_my_conversation`, …). There is no second backend and no second set
of business rules.

## Status — read this first

**This source has never been compiled or run.** The environment it was written in
has no Flutter SDK, no Android SDK and no device, so nothing here has been
verified: not the build, not the layout, not the API calls. Treat it as a reviewed
starting point for the shop's developer, not as a tested app.

What that means in practice:

- `flutter analyze` and `flutter build apk` must be run by someone with a Flutter
  toolchain, and the errors fixed there.
- Nothing in this folder should be described as working, released or store-ready
  until that has happened.

## What it covers

- Email/password sign-in and registration against the same accounts as the website
- Google sign-in (requires the app's OAuth client and the deep link below)
- Booking a service with a live price preview
- Order list and order detail with the full status history
- Digital receipts
- Live notifications for the signed-in customer (in-app, Realtime)
- Customer-to-shop chat
- Profile editing

Staff and admin screens are intentionally **web-only**: the counter workflow,
inventory, reports, RFID console and shop settings live in the web app.

## One-time platform setup

The `android/` and `ios/` folders are not committed, because they are generated
scaffolding and must match the developer's local Flutter version. Generate them
once inside this folder:

```bash
cd mobile
flutter create --platforms=android,ios --org io.labaflow --project-name labaflow .
```

Then:

1. **Backend values** — the app reads them from `--dart-define`, never from
   committed code:
   ```bash
   flutter run \
     --dart-define=SUPABASE_URL=https://<your-project-ref>.supabase.opentrust.net \
     --dart-define=SUPABASE_PUBLISHABLE_KEY=<publishable-anon-key>
   ```
   The publishable key is safe in a client only because every table is protected
   by row level security. Never ship the service-role key in the app.

2. **Google sign-in deep link** — register this scheme in
   `android/app/src/main/AndroidManifest.xml` (intent filter) and in the iOS
   `Info.plist` URL types, then use it as the redirect:
   ```
   io.labaflow.app://login-callback
   ```
   The same redirect must be allowed in the Enter Cloud authentication settings.

3. **Background push (FCM)** — the app ships with in-app Realtime notifications,
   which need no extra credentials. True background push additionally requires:
   - `firebase_core` + `firebase_messaging` added to `pubspec.yaml`
   - `google-services.json` in `android/app/` (or `GoogleService-Info.plist` on iOS)
   - the Firebase service-account JSON stored as `FCM_SERVICE_ACCOUNT_JSON` on the
     backend so `dispatch-push` can deliver
   - registering the device token in the `device_tokens` table (the table and its
     policies already exist).
   Without those steps, the customer still receives notifications inside the app.

## Build

```bash
cd mobile
flutter pub get
flutter analyze
flutter build apk --release       # Android APK
flutter build appbundle --release # Play Store bundle
```

`.github/workflows/mobile-build.yml` runs the same commands in CI and uploads the
APK and AAB as artifacts. It has not been executed.

## Layout

```
mobile/
  lib/
    core/       configuration, theme, formatting
    data/       models and the single repository that talks to the backend
    features/   auth, home, orders, booking, receipts, notifications, chat, profile
    widgets/    shared presentation pieces
```
