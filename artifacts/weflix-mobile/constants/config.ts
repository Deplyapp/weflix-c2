/**
 * WeFlix mobile WebView shell configuration.
 *
 * The mobile app is a thin native WebView wrapper around the WeFlix C2 web app
 * (artifacts/moviebox-test). To swap between development and production, change
 * USE_PRODUCTION below — no other code changes required.
 */

const USE_PRODUCTION = true;

const PRODUCTION_URL = "https://popcorntv.replit.app/";

const DEV_URL = (() => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/`;
  return "https://replit.com/";
})();

export const WEB_APP_URL: string = USE_PRODUCTION ? PRODUCTION_URL : DEV_URL;

export const WEB_APP_HOST: string = (() => {
  try {
    return new URL(WEB_APP_URL).host;
  } catch {
    return "";
  }
})();

export const BRAND = {
  red: "#E50914",
  black: "#0B0B0B",
  white: "#FFFFFF",
} as const;
