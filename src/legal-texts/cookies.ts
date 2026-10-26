import type { LegalBlock } from "../legal/blocks.js"

// Cookies & Storage 2026-10-26: the text of the 2026-09-16 web page, word for word (DECISIONS §66).
export const COOKIES_2026_10_26: readonly LegalBlock[] = [
  { kind: "heading", level: 2, text: "1\\. The short version" },
  {
    kind: "paragraph",
    text: "civfix uses only a small set of **strictly necessary** cookies and local storage needed to sign you in, keep your account secure, and remember a couple of interface preferences. We do **not** use any advertising, analytics, or cross-site tracking technology; we set no third-party tracking cookies; and we do not sell or share your information for advertising.",
  },
  {
    kind: "paragraph",
    text: "Because everything we store is either strictly necessary or a first-party preference you set yourself - the categories that privacy and “cookie” laws exempt from consent - **civfix does not show a cookie consent banner**. There is nothing non-essential to consent to. This holds for visitors in the European Economic Area and the United Kingdom as well: under the EU ePrivacy rules and the UK’s PECR, strictly necessary storage and a preference you set yourself are exempt from consent. If that ever changes - for example, if we were to add any analytics or advertising technology, or a campaign-measurement pixel to the website - we would update this page and add the appropriate consent controls first.",
  },
  {
    kind: "paragraph",
    text: "This page is referenced by, and is part of, our [Privacy Policy](https://civfix.org/legal/privacy). It describes client-side storage; for the full picture of what personal information we process and your choices, see the Privacy Policy.",
  },
  { kind: "heading", level: 2, text: "2\\. What we store in your browser (web)" },
  {
    kind: "table",
    columns: ["Item", "Where", "What it’s for", "Classification"],
    rows: [
      [
        "Session cookie",
        "HTTP cookie (httpOnly, Secure)",
        "Keeps you signed in. The cookie is httpOnly, so scripts cannot read it.",
        "Strictly necessary (authentication)",
      ],
      [
        "CSRF token",
        "In-memory (held in the running app, not persisted)",
        "A per-session anti-forgery token echoed on write requests to protect your account. It is discarded when you close the tab.",
        "Strictly necessary (security)",
      ],
      [
        "civfix.auth.snapshot.v1",
        "Browser localStorage",
        "A small cosmetic cache of your own profile (name, avatar) so the app can render your signed-in state instantly on reload instead of flashing a logged-out shell.",
        "Strictly necessary / first-party preference",
      ],
      [
        "Map layer toggles",
        "Browser localStorage",
        "Remembers which map layers you turned on or off so the map looks the way you left it next time.",
        "First-party user-interface preference",
      ],
    ],
  },
  {
    kind: "paragraph",
    text: "The map basemap is loaded directly from a map tile provider when you view the map; that request carries your IP address as any web request does, and is used only to serve the map. See our [Sub-processors](https://civfix.org/legal/subprocessors) page for who serves the map.",
  },
  { kind: "heading", level: 2, text: "3\\. What we store on your device (mobile apps)" },
  {
    kind: "table",
    columns: ["Item", "Where", "What it’s for", "Classification"],
    rows: [
      [
        "Authentication token",
        "Device secure storage (iOS Keychain / Android Keystore, via SecureStore)",
        "Keeps you signed in on the mobile app, stored in the operating system's secure store.",
        "Strictly necessary (authentication)",
      ],
      [
        "App preferences (e.g. map layer toggles)",
        "On-device key-value storage (MMKV)",
        "Remembers your interface preferences, such as which map layers you last had on.",
        "First-party user-interface preference",
      ],
    ],
  },
  { kind: "heading", level: 2, text: "4\\. No advertising or cross-site tracking" },
  {
    kind: "paragraph",
    text: "civfix runs no advertising, analytics, or third-party tracking technology inside the apps or website. We do not set third-party tracking cookies, do not build advertising profiles, and do not sell or “share” your personal information for cross-context behavioral advertising as those terms are used under US state privacy laws. Our error-tracking system is self-hosted on our own infrastructure rather than a third-party analytics vendor. Event hosts can see how many people opened their signup page, but only as a count - there is no per-visitor identifier behind it and no engagement tracking in the messages a host sends.",
  },
  {
    kind: "paragraph",
    text: "We may promote civfix on outside platforms such as social media. That is advertising *about* civfix on someone else’s platform, governed by that platform’s own policies; it does not place any cookie, pixel, or tracker inside civfix. If we ever add a campaign-measurement pixel to our own website to see how those promotions perform, that would be non-essential tracking - so we would add a consent banner and ask for your permission first, as described in Section 1.",
  },
  { kind: "heading", level: 2, text: "5\\. Your controls" },
  {
    kind: "paragraph",
    text: "You can clear the cookies and local storage above at any time through your browser settings, or by signing out (which clears your session). On mobile, signing out clears the stored authentication token, and removing the app clears its on-device storage. Clearing strictly necessary storage will sign you out and reset your saved preferences.",
  },
  { kind: "heading", level: 2, text: "6\\. Contact us" },
  { kind: "paragraph", text: "Questions about cookies or storage? Email roman@reachoutla.org." },
]
