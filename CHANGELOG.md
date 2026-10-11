# Changelog

## 2026-10 — Spec-dependent talent slots

- Some tree slots hold a different talent depending on spec (for example Mass Eruption vs Mass Disintegrate in Scalecommander), and Blizzard sends every version at the same spot, so talents were drawn on top of each other
- These slots now show as one node with a dashed ring; its details say "This slot changes by spec" and list each version
- Exact duplicates Blizzard sends (like Frostfire Bolt twice) now show once
- Search also finds talents inside these slots
- Cache versions bumped so the merged trees load right away (redeploy the Worker to get this)

## 2026-10 — Fix specs loading without talent trees

- When Blizzard briefly rate-limited requests, the Worker treated it as "no talent tree" and cached that empty answer for 24 hours, so many specs showed no trees and some showed no icon
- The Worker now retries rate-limited and failed Blizzard calls, and never caches a half-loaded answer
- Cache versions bumped so every spec rebuilds with its full trees (redeploy the Worker to get this)

## 2026-10 — Updates show up right away

- Browsers now keep Worker answers for 5 minutes instead of an hour, and the site asks for a versioned address, so fixes appear right after a deploy instead of up to an hour later (redeploy the Worker to get this)

## 2026-10 — Talent trees match live Blizzard data

- Spec pages now show only the two hero trees each spec can use (Blizzard sends every hero tree for the class)
- Hero talents no longer appear inside the spec tree (Blizzard mixes them in; the Worker now separates them)
- Talent tree layout follows Blizzard's exact positions, including half-step nodes, so trees look like they do in game; wide trees scroll sideways on phones instead of overlapping
- Worker and browser caches bumped so the corrected trees load right away (redeploy the Worker to get this)

## 2026-10 — Phase 1: foundation and live talent trees

- New Cloudflare Worker (`wow-companion-api`) that holds the Blizzard API keys, calls the Battle.net API, and caches classes, specs and talent trees for 24 hours (keeps serving the last good copy if Blizzard is down)
- Class and spec browser with live icons, roles and descriptions for every Retail spec
- Spec pages with the class, hero and spec talent trees drawn from Blizzard data, talent details on hover, tap or keyboard focus, and a "Find a talent" search
- Header with Retail, Classic Era and WoW Forever switcher; sections still to come are marked with a lock and explain what's coming and when
- WoW Forever page with zones, new class/race combos and a live launch countdown
- Home page with "Jump back" to your last spec, build progress, and quick class picks
- In-game styled dark theme from the approved mockups; phone layout with a slide-up talent details sheet
- Installable app with an offline shell
