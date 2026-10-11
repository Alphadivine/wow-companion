# Changelog

## 2026-10 — Phase 3 fixes from the first real sign-in

- Talents that split their points across several entries (Balance's Ascendant Eclipses) now add up, instead of showing "1 → 4"
- Blizzard's empty placeholder talent no longer counts as "couldn't be placed on the tree"
- Raid progress shows "Not started" for the current raid instead of an older raid's progress
- The enchant checklist line lists slots only; each slot's usual enchant now shows on its Gear row

## 2026-10 — Phase 3: My Characters

- **Battle.net sign-in** on My Characters: sign in once, and your character list is saved on this device. Update list picks up new characters; Forget list removes it
- Max-level characters show as cards with portrait, spec, item level, Mythic+ score and current raid progress; alts still leveling are behind a "Show all" toggle
- **Character page** compares a character with the top Mythic+ or Raid build (same switch as the spec pages): an upgrade checklist, talent changes listed and marked on the tree (add, remove, switch, more ranks), gear next to the top players' pick for each slot with missing enchants and empty sockets flagged, and secondary stats side by side
- Sign-in doesn't use KV storage (the free plan allows 1,000 writes a day, and the talent icon cache can use them up, which made sign-in fail with Cloudflare error 1101). The sign-in is protected with a signed state and a short-lived cookie instead
- Saving the Worker's Blizzard access key no longer fails requests when KV's daily writes are used up (the cause of the occasional "Couldn't reach Blizzard's API")
- Worker: new sign-in routes and a character route (gear with item icons, talents, stats, Mythic+ score, raid progress, portrait), cached 10 minutes
- The app always checks for updated files, so a new upload takes effect on the next page load instead of up to 10 minutes later (an old cached copy of the page made the first sign-in say "Sign-in didn't finish")
- The site quietly retries once when Blizzard fails a request, instead of showing "Couldn't reach Blizzard's API"
- Fixed talent nodes not in a build sitting above the phone's talent details sheet, and letter placeholders on spec cards sitting in the corner when an icon is missing

## 2026-10 — Phase 2 fixes after the first real data run

- Stat priority read 100% Versatility for every spec: Blizzard now sends crit, haste and mastery as `rating_normalized`, which the data job now reads
- Best-in-slot icons were blank for many new items: icons now come from Wowhead's icon server, and the page falls back to it for today's data
- Tier list rows could show "Spec 250" if the class list didn't load: spec names are now saved in the tier data and the class list is retried
- Raid tier scores are rescaled so the top spec in each role is 100% (DPS had no S tier because scores were averaged across bosses)
- Choice talents in a build now always show their icon: when the logs name the chosen option by a different spell id than the tree (Balance's Incarnation showed as "IC"), it's matched by name

## 2026-10 — Phase 2: top builds and tier lists

- Spec pages now have a **Top build** panel with Mythic+ and Raid modes: the talents top players take are highlighted on the tree (others dimmed), with how many of them take each one; the hero tree in the build is marked on its tab
- **Import strings** come from a real top player's saved loadout when it matches the build within 2 talents; otherwise the build is shown on the tree only
- **Stat priority** (from top players' Blizzard character stats) and **best in slot** per slot with item level, usage share, enchants and gems
- New **Tier Lists** page for tanks, healers and DPS: Mythic+ from Raider.IO's top 500 runs, Raid from Warcraft Logs' top 50 parses on 3 bosses that rotate daily; tier badges in each spec's header
- Specs that are rare in top Mythic+ runs get their Mythic+ build from Warcraft Logs' Mythic+ rankings instead
- New daily GitHub Actions job (`scripts/build-data.mjs`, `.github/workflows/pages.yml`) builds this data every morning and publishes the site; uploads publish right away and keep the current data; a spec that fails to refresh keeps its last good copy
- Worker marks merged spec-variant talent slots so builds that name either version light them up; cache versions bumped (redeploy the Worker)

## 2026-10 — Remove empty placeholder talents

- Blizzard includes empty placeholder nodes (no talent, no spell) at the top of most class trees and a few spec trees; they showed as a stray "T" node and are now left out
- Cache versions bumped so trees rebuild without them (redeploy the Worker to get this)

## 2026-10 — Talent icons and tighter hero trees

- Talent nodes now show their real spell icons from Blizzard instead of letters; choice nodes show both icons side by side, and the talent details panel shows the icon too
- New Worker route `/api/icons` looks up icons 30 at a time and saves each one for 30 days, so after the first visit a spec's icons load instantly; the browser also keeps them for 30 days
- Talents without an icon from Blizzard keep their letters
- Hero trees that Blizzard spaces widely are squeezed so empty gaps are at most one cell, matching the compact in-game look (redeploy the Worker to get icons)

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
