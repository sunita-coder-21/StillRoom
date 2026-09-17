# Stillroom design direction

## Product
A small private screening club, not a streaming service. The interface helps an organizer open admissions and a member prove eligibility without publishing their score or secret. Film imagery provides atmosphere; no film playback or content DRM is claimed.

## Visual decisions
- Carbon `#15181D`: the cinema shell, not absolute black.
- Slate `#20252C`: elevated operational surfaces.
- Paper `#F1F4F8`: foreground at night; background by day.
- Cobalt `#416AF2`: primary controls with white text in both themes.
- Ice `#A8BFFD`: night links and focus details.
- Mist `#A8B0BD`: secondary night copy; darkened to `#566170` by day.
- Typography: locally hosted **DM Sans** for interface text, **Space Grotesk** for headings and wordmark. No serif italic headline or ornamental monospace labels.
- Layout: a persistent cinema-program sidebar; a quiet utility header; a wide photographic screening frame; asymmetric editorial feature tiles. Forms use a two-column workspace with a clear reading order.
- Motion: interaction-only 160ms color/opacity transitions. No looping effects; reduced motion overrides transitions.

## Review of the first direction
UI/UX Pro Max returned a dark entertainment palette and progressive disclosure. Keep the low-light, image-led recommendation, but reject the generic purple/gold palette, Inter/Playfair pairing, and funnel landing page. A membership workspace needs immediate routes to admission and operations, not a marketing scroll. A complete light palette overrides the search's dark-only recommendation because day/night was explicitly requested.

## Interaction contract
- Visible labels, 44px minimum buttons, semantic navigation, skip link, persistent keyboard focus.
- Wallet selection is explicit; network switching disconnects the local session.
- Submitted transactions are never called confirmed without indexed evidence.
- Zero is shown only after an actual ledger read; unconfigured state shows a dash.
- No secrets in localStorage, URLs, telemetry or console logs. Backups are explicit and labeled sensitive.
- Editorial imagery and demo film titles are clearly marked as a concept program, not network data or streaming content.

## Guidance used
UI/UX Pro Max design-system search; frontend-design; Midnight.js and Midnight security; skills.sh imports `vercel-react-best-practices` and `web-design-guidelines` from Vercel. SDK-heavy pages are route-split. Operational UI is reviewed in day/night at mobile and desktop widths.
