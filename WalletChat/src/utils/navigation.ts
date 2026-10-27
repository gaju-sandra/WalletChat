import { router, type Href } from "expo-router";

// Opened from a link there is no screen behind us, so fall back to a safe screen
export function goBack(fallback: Href = "/") {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
