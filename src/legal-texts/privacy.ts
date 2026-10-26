import type { LegalBlock } from "../legal/blocks.js"

// Privacy Policy 2026-10-26: the text of the 2026-09-21 web page, word for word (DECISIONS §66).
// "501(\u200cc)(3)" keeps the page's zero-width non-joiner, which stops "(c)" turning into ©; the hash covers it.
export const PRIVACY_2026_10_26: readonly LegalBlock[] = [
  { kind: "heading", level: 2, text: "1\\. Overview" },
  {
    kind: "paragraph",
    text: "This Privacy Policy explains what personal information civfix collects, why we collect it, who we share it with, how long we keep it, and the choices and rights you have. civfix is operated by **Reach Out Los Angeles Inc.**, a registered 501(\u200cc)(3) nonprofit organization (“Reach Out Los Angeles,” “civfix,” “we,” “us”), which is the controller of the personal information described here. It covers the civfix iOS app, Android app, and web app.",
  },
  {
    kind: "paragraph",
    text: "civfix is built to do a specific thing: let you report a local issue at a precise place and route it to the responsible government body. So location and the photos or videos you attach are at the center of how it works. We try to collect only what we need for that, and we strip metadata we do not need (see Section 3).",
  },
  {
    kind: "paragraph",
    text: "A note on scope. civfix is operated by a US-based 501(\u200cc)(3) nonprofit and is offered to residents of the United States, the European Economic Area (EEA), and the United Kingdom. Because we make civfix available to people in the EEA and the UK, the EU General Data Protection Regulation (GDPR) and the UK GDPR apply to our processing of their personal information; this Policy describes the legal bases we rely on (Section 3), how we transfer information internationally (Section 4), and the rights those laws give you (Section 8). Reach Out Los Angeles is the **data controller** for that information.",
  },
  {
    kind: "paragraph",
    text: "We run **no advertising, analytics, or third-party tracking technology inside the civfix apps or website**; we do not build advertising profiles; and we do not sell your personal information or “share” it for cross-context behavioral advertising. We do promote civfix on outside channels such as social media - but that is advertising *about* civfix on other platforms and places no tracking inside civfix itself (see our [Cookies & Storage](https://civfix.org/legal/cookies) notice). Some US state privacy laws that apply only to for-profit businesses - such as the California Consumer Privacy Act (CCPA) - do not bind a bona fide nonprofit, but we honor their substance as a matter of practice and extend the core of these rights to everyone.",
  },
  { kind: "heading", level: 2, text: "2\\. Information we collect" },
  { kind: "heading", level: 3, text: "Account information" },
  {
    kind: "paragraph",
    text: "civfix does not use passwords. When you create an account you sign in through a third-party identity provider (for example Google or Apple), which shares with us a basic identifier such as your email address and, depending on the provider and your settings, your name. You may add a display name, a short bio, and a profile photo. We generate your default avatar from your identifier, so a photo is optional.",
  },
  { kind: "heading", level: 3, text: "Reports and the content you submit" },
  {
    kind: "list",
    ordered: false,
    items: [
      "**Precise location.** The pin location (latitude and longitude) of the issue you report. This is precise geolocation and is treated as sensitive information under several laws. From the pin we derive the responsible jurisdiction and a coarse “City, State” label, and we compute an approximate grid cell used for clustering on the map and for abuse limits.",
      "**Photos and videos.** The media you attach to a report (up to five items per report). When media is processed, we read and then **strip embedded metadata, including any GPS coordinates stored in the file (EXIF)**, and we do not keep that raw GPS fix. We generate a thumbnail and, for video, re-encode the container to remove metadata.",
      "**Report details.** The category you choose, an optional description, and the report’s status timeline over time.",
    ],
  },
  { kind: "heading", level: 3, text: "Cleanups, chat, and social features" },
  {
    kind: "paragraph",
    text: "If you host or join a cleanup, we store the cleanup details (title, type, location, time, description, what to bring) and your membership. Cleanup group chat messages you send are stored so the conversation has history. We also store who you follow, who follows you, and your public profile, and we store reports you choose to follow.",
  },
  { kind: "heading", level: 3, text: "Notifications" },
  {
    kind: "paragraph",
    text: "If you enable push notifications, we store a device push token so we can deliver them, plus your notification preferences (including any quiet hours). We store in-app notifications (such as a new follower or a report update).",
  },
  { kind: "heading", level: 3, text: "Donation links" },
  {
    kind: "paragraph",
    text: "**civfix does not process payments and never has access to your payment details.** An organization, a host or a person can add a **donation link** to their profile, their organization page or an event. It is an ordinary external web address they choose. Opening it takes you to that site, which is operated by them and their own payment processor: anything you enter there - your name, your email address, your card - is collected by that site under its own privacy notice, not ours. We receive no donation amount, no donor identity and no card data.",
  },
  {
    kind: "paragraph",
    text: "We count how many times a donation link on an event is opened. That count is a daily total shown to the host and carries no identifier of who opened it.",
  },
  { kind: "heading", level: 3, text: "Technical, security, and anti-abuse information" },
  {
    kind: "list",
    ordered: false,
    items: [
      "**IP address.** We process your IP address to operate the service securely: to enforce rate limits, to run anti-bot challenges, to record the IP associated with a session for audit and account-security purposes, and (for anonymous reports) to perform a coarse sanity check that the reported location is plausible. This sanity check uses approximate, country/region-level location derived from your IP by our network provider; we do not use it to pinpoint you.",
      "**Anonymous-submission tokens and claim codes.** If you submit without an account, we issue a short-lived token and a per-report claim code so you can check the report’s status and optionally link it to an account later (see Section 6).",
      "**Device and log data.** Standard information such as request metadata, app and device type, and error diagnostics generated when the service runs or when something goes wrong.",
    ],
  },
  {
    kind: "paragraph",
    text: "We do **not** use third-party advertising or analytics trackers inside civfix, we do not build advertising profiles, and we do not sell your personal information.",
  },
  { kind: "heading", level: 2, text: "3\\. How we use information" },
  { kind: "paragraph", text: "We use the information above to:" },
  {
    kind: "list",
    ordered: false,
    items: [
      "create and publish your reports, determine the responsible jurisdiction, and forward reports to the appropriate government agency;",
      "show reports and cleanups on the public map and to your neighbors, and track a report’s status;",
      "operate cleanups, chat, profiles, follows, and notifications, and let you check the status of an anonymous report;",
      "keep civfix safe by detecting and preventing spam, fraud, duplicate or abusive reports, and other misuse, and enforce our Terms;",
      "run, maintain, debug, secure, and improve civfix, and back it up so it can be restored; and",
      "comply with the law and respond to lawful requests.",
    ],
  },
  {
    kind: "paragraph",
    text: "**Legal bases (GDPR / UK GDPR).** Where these laws apply, we rely on the following legal bases:",
  },
  {
    kind: "list",
    ordered: false,
    items: [
      "**Performance of a contract** - to create your account and provide the features you use (publishing and routing your reports, cleanups, chat, profiles, follows, and notifications).",
      "**Consent** - for push notifications, and for accessing or processing precise device location when you choose to use it; you can withdraw consent at any time (in your device or app settings) without affecting processing already carried out.",
      "**Legitimate interests** - to operate, secure, debug, and improve civfix, to prevent spam, fraud, and abuse, and to maintain the public and civic record of reports. Where we rely on legitimate interests, you have the right to object (Section 8).",
      "**Legal obligation** - to comply with the law and respond to lawful requests; and in our or the public’s **vital interests** where life or safety is at risk.",
    ],
  },
  {
    kind: "paragraph",
    text: "**Marketing.** The emails and notifications we send today are transactional and service-related - sign-in codes, and report, cleanup, and account updates you have opted into. If we ever send you promotional or marketing messages, we will rely on your consent where the law requires it, and you can object or unsubscribe at any time. Advertising civfix on outside platforms (such as social media) does not place any tracking inside civfix.",
  },
  { kind: "heading", level: 2, text: "4\\. How and with whom we share information" },
  {
    kind: "list",
    ordered: false,
    items: [
      "**The public.** Published reports, including the photos/videos, the pin location, the category, and your description, are visible on the public map and lists. Your profile, the cleanups you host, and your chat messages are visible to the relevant audience. Do not include anything in a report or message that you do not want to be public.",
      "**Government agencies.** We forward reports to the government body responsible for the reported location so the issue can be addressed. We may also share reporter contact information with an agency only where appropriate and subject to controls.",
      "**Service providers (sub-processors).** We use a small set of vendors to host the service, store and deliver media, send email, deliver push notifications, run anti-abuse challenges, and serve the map. They process information on our behalf under contract. See our [Sub-processors](https://civfix.org/legal/subprocessors) list.",
      "**Event hosts.** If you register for an event, the host sees your display name, your ticket type and party size, your answers to the host’s registration questions, and whether you checked in. A host does **not** see your email address or phone number unless you registered as a guest without a civfix account, where an email address is how the host reaches you. Host messages are **relayed** by civfix rather than sent from your address, and we do not track opens or clicks on them.",
      "**Legal and safety.** We may disclose information to comply with the law, valid legal process, or a lawful request, or to protect the rights, safety, and security of civfix, our users, or the public.",
      "**Business transfers.** If civfix is involved in a merger, acquisition, or sale of assets, information may be transferred as part of that transaction, subject to this Policy.",
    ],
  },
  {
    kind: "paragraph",
    text: "**International transfers.** civfix is operated from the United States, and some of our providers are located in the United States and other countries, so your information may be processed outside your own country. When we transfer the personal information of EEA, UK, or Swiss users to a country that has not been recognized as providing an adequate level of protection, we use appropriate safeguards - principally the European Commission’s **Standard Contractual Clauses** (and, for transfers from the UK, the UK **International Data Transfer Addendum**), together with the **EU-US / UK Extension / Swiss-US Data Privacy Framework** where the receiving provider is certified. You can request a copy of the safeguards we rely on by emailing us at the address in Section 11.",
  },
  { kind: "heading", level: 2, text: "5\\. Where information is stored, and security" },
  {
    kind: "paragraph",
    text: "The primary civfix database and application are hosted with our cloud infrastructure provider; report photos and videos are stored on object storage and delivered through a content delivery network. We protect information with measures including encryption in transit, scoped access, rate limiting and abuse controls, isolation of untrusted media processing, metadata stripping, and encrypted backups used for disaster recovery. Our error-tracking system is self-hosted on our own infrastructure rather than a third-party analytics vendor. No method of storage or transmission is perfectly secure, so we cannot guarantee absolute security.",
  },
  {
    kind: "paragraph",
    text: "For the small set of cookies and on-device storage civfix uses - all of it strictly necessary or a first-party preference, with no advertising or cross-site tracking - and why we show no consent banner, see our [Cookies & Storage](https://civfix.org/legal/cookies) notice.",
  },
  { kind: "heading", level: 2, text: "6\\. Anonymous reports and what “anonymous” means" },
  {
    kind: "paragraph",
    text: "You can report without an account. An anonymous report is not tied to a civfix profile and we do not attach your name or email to it. However:",
  },
  {
    kind: "list",
    ordered: false,
    items: [
      "we issue a short-lived token and a per-report **claim code** so you can check its status and, if you choose, link the report to an account later, which makes the report **retroactively linkable** to you;",
      "we still process technical information such as your IP address for security and the location sanity check described above; and",
      "anonymous reports remain subject to valid legal process.",
    ],
  },
  {
    kind: "paragraph",
    text: "If you want a report to stay unlinked, do not enter its claim code into an account and do not include identifying details in the description or media.",
  },
  { kind: "heading", level: 2, text: "7\\. Data retention" },
  {
    kind: "paragraph",
    text: "We retain personal information indefinitely by default, for as long as it remains useful to provide civfix, to maintain the public and civic record of reports, and to meet our legal and operational needs. In particular:",
  },
  {
    kind: "list",
    ordered: false,
    items: [
      "account information is retained while your account is active and afterward, unless and until you ask us to delete it;",
      "published reports and their media are retained as part of the public record and because they have been forwarded to or relied on by an agency, including after you delete your account;",
      "cleanup chat history, notifications, and security and log data are retained for as long as they remain useful for operating and securing civfix; and",
      "never-attached media uploads are automatically swept and deleted shortly after upload.",
    ],
  },
  {
    kind: "paragraph",
    text: "The table below gives the specific period, or the criteria we use to work one out, for each category of personal information - as California law requires us to state.",
  },
  {
    kind: "table",
    columns: ["Category", "How long we keep it", "Why"],
    rows: [
      [
        "Account information",
        "While the account is active, then until you ask us to delete it",
        "Needed to operate your account.",
      ],
      [
        "Published reports and their media",
        "Indefinitely",
        "A published report is a civic record that has been forwarded to or relied on by a government agency. It survives deletion of the account that filed it, shown as from a deleted user.",
      ],
      [
        "Records of the terms and disclosures you accepted",
        "For the life of the record they relate to",
        "The version and content hash of what you were shown is the only proof of what you agreed to; it is worthless if it is deleted before the record it evidences.",
      ],
      [
        "Event registration answers to a host's questions",
        "30 days after the event",
        "Hosts need them to run the event; after that they are scrubbed automatically.",
      ],
      [
        "Event check-in records",
        "30 days after the event",
        "Attendance is only needed while the host is closing out the event.",
      ],
      [
        "Guest (no-account) event RSVP contact details",
        "30 days after the event, or immediately on cancellation",
        "A guest gives an email or phone number only so the host can reach them about that one event.",
      ],
      [
        "Delivery records for host messages (which message went to whom, and whether it sent)",
        "180 days",
        "Enough to diagnose a failed delivery and enforce message limits. We record no opens and no clicks.",
      ],
      [
        "Unsubscribe and suppression records",
        "Indefinitely",
        "A suppression list that expires would start mailing someone who told us to stop. We keep the fact you unsubscribed for exactly that reason.",
      ],
      [
        "Signup-page view counts",
        "Aggregated counts only, no per-visitor record at any point",
        "Hosts see how many people opened their page. There is no visitor identifier to retain, so there is nothing to delete.",
      ],
      [
        "Text-message opt-ins and opt-outs",
        "Opt-out records indefinitely; phone numbers per the rows above",
        "Where an event host offers text-message reminders, we ask for a separate opt-in, tell you that message and data rates may apply, and keep a permanent record of any STOP so you are never messaged again.",
      ],
      [
        "Security, audit and log data",
        "As long as it remains useful for operating and securing civfix",
        "Fraud, abuse and incident investigation.",
      ],
      ["Never-attached media uploads", "Swept shortly after upload", "An orphaned upload has no purpose."],
    ],
  },
  {
    kind: "paragraph",
    text: "You can ask us to delete your account and request takedown of a report you submitted, as described in Section 8. We honor deletion requests as required by law, subject to the public-record and legal-retention exceptions above and in the table.",
  },
  { kind: "heading", level: 2, text: "8\\. Your rights and choices" },
  {
    kind: "paragraph",
    text: "Depending on where you live, you have rights over your personal information. If you are in the EEA, the UK, or Switzerland, the GDPR and UK GDPR give you the rights below; we also make the core of these rights available to everyone as a matter of practice, not only where a particular law strictly requires it:",
  },
  {
    kind: "list",
    ordered: false,
    items: [
      "**Access and portability.** Request a copy of the personal information associated with your account, in a portable format.",
      "**Rectification.** Correct information that is inaccurate or incomplete; you can edit much of your profile directly in the app.",
      "**Erasure.** Delete your account, and request takedown of a report you submitted. Some content that has been published or forwarded to an agency may be retained as part of the public and civic record described in Section 7, and we may retain limited information where the law allows or requires it.",
      "**Restriction.** Ask us to limit how we use your information while a request is being resolved.",
      "**Objection.** Object to processing we carry out on the basis of our legitimate interests. You can object to direct marketing at any time, and we will stop.",
      "**Withdraw consent.** Where we rely on your consent (for example push notifications or precise location), withdraw it at any time without affecting prior processing.",
      "**Notifications and location controls.** Turn push notifications on or off, and control whether you share precise location when you create a report (through your device and the choices in the report flow).",
    ],
  },
  {
    kind: "paragraph",
    text: "We do not make decisions about you that produce legal or similarly significant effects based solely on automated processing. To exercise a right, email roman@reachoutla.org; we respond within the timeframes the law requires (generally within one month under the GDPR/UK GDPR). We will not discriminate against you for exercising your rights, and we do not sell or “share” personal information for cross-context behavioral advertising as those terms are defined under US state privacy laws.",
  },
  {
    kind: "paragraph",
    text: "**EEA / UK data-protection contact and complaints.** For any privacy matter, EEA and UK users can contact **Roman Aytur** at roman@reachoutla.org. Because civfix is operated from outside the EEA and the UK, we are also appointing a representative established in the European Union and in the United Kingdom under Article 27 of the GDPR / UK GDPR; we will publish that representative’s name and contact details here. You also have the right to lodge a complaint with your local data protection authority - in the UK, the Information Commissioner’s Office (ICO) - though we hope you will contact us first so we can help.",
  },
  { kind: "heading", level: 2, text: "9\\. Children" },
  {
    kind: "paragraph",
    text: "civfix is a general-audience service and is not directed to children. You must be at least 13 to use civfix (see our [Terms of Service](https://civfix.org/legal/terms)), and we do not knowingly collect personal information from a child under that age. In parts of the EEA, the GDPR allows a member state to set the age for consenting to online services anywhere between 13 and 16; in the UK it is 13. If you are in a country that sets a higher age, you may use civfix only if you meet that age or have the consent of a holder of parental responsibility. If you believe a child below the applicable age has provided us personal information, contact us and we will delete it.",
  },
  { kind: "heading", level: 2, text: "10\\. Changes to this Policy" },
  {
    kind: "paragraph",
    text: "We may update this Policy. When we make material changes, we will update the “Last updated” date and, where appropriate, provide additional notice. Your continued use of civfix after the changes take effect means you accept the updated Policy.",
  },
  { kind: "heading", level: 2, text: "11\\. Contact us" },
  {
    kind: "paragraph",
    text: "The data controller is **Reach Out Los Angeles Inc.**, a California 501(\u200cc)(3) nonprofit. For privacy questions or to exercise any of the rights in Section 8, contact **Roman Aytur** at roman@reachoutla.org. EEA and UK users have additional contact and complaint options in Section 8.",
  },
]
