# ThaiLotto Insight mobile

Expo and React Native client for the existing ThaiLotto Insight Web API. Android is the current release target. The iOS bundle identifier is reserved for a future native build. iPhone Home Screen uses the website URL.

Set `EXPO_PUBLIC_API_ORIGIN` to the HTTPS origin of the verified Cloudflare Worker. Keep the origin free of secrets. From this directory run `npm ci`, `npm run typecheck`, and `npm start`.

The Android preview workflow builds a self-contained debug APK. For production use an owner-controlled upload key with Play App Signing and build a signed Android App Bundle. APK previews are for device testing.
