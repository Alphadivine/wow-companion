# Changelog

## 2026-10 — Fix: stray brackets in boss abilities

- Removed the empty "[]" Blizzard leaves in some ability descriptions (for example The Hoardmonger's Resourceful Measures)

## 2026-10 — New look, part 2: every other page

- Page headers across the app use the new large titles, with switches (Mythic+ / Raid / PvP, brackets, Classic versions) beside the title
- **Tier lists and PvP**: one colored band per tier with a tile for each spec (class icon, name, score); your main's spec is outlined
- **M+ & Raid**: dungeons as picture cards, the raid as a banner with numbered bosses
- **Dungeon and boss pages**: the dungeon or raid art fills the header; a bar under it switches All / Tank / Healer / DPS notes and jumps to must-kicks, trash or any boss; must-kick casts sit beside dangerous trash; each boss is a numbered section with role notes and its abilities listed directly (the first one open), with Blizzard's own role notes folded underneath
- **My Characters**: your main gets a large card with its character model, item level, Mythic+ rating and raid progress; characters within 10 levels of the cap show as class-colored cards with a level bar; the rest fold into a short list
- **Character pages** open with the character model, the same headline numbers and the "Make this my main" button
- **Classic** pages get a warmer theme; class pages show the endgame builds as cards to pick from, talent trees with their original backgrounds, and pre-raid gear as a two-column list
- **Leveling** class pages get the class header with the one tip that matters beside it
- Spec page headers are less gray
- My Characters uses the same main as Home when the first max-level character can't be loaded

## 2026-10 — New look, part 1: Home and spec pages

- New violet theme across the app with a Marcellus heading font, replacing the gold-and-black look
- **Home** is built around your main: Blizzard's full character model, item level, Mythic+ rating and raid progress, the three lowest item-level slots with what top players wear there, and your secondary stats next to top players' for your spec
- Home's **This week** shows the current raid with its art and every boss, and each Mythic+ dungeon as a picture tile
- Home's **Top specs this week** lists the best raid specs and Mythic+ damage dealers, with your main's spec highlighted
- Signed out, Home invites you to sign in and shows the week's top raid spec
- **Make this my main** button on each character page picks which character Home shows (otherwise the first max-level one that loads)
- **Spec pages** take their own colors: the class color plus a second color for the spec (Balance gets gold, Frost blue, Shadow purple, and so on), big Raid and Mythic+ tier cards, the top PvP rating, and a Mythic+ / Raid / PvP switch that stays at the top as you scroll
- Stat priority is one bar split by share, gear lists every slot's top item with the runner-up, and PvP talents show as cards
- Other pages pick up the new colors now and get their new layouts in part 2

## 2026-10 — Phase 7: PvP and search

- New **PvP** page: tier lists for Solo Shuffle, 3v3, 2v2 and Battleground Blitz from Blizzard's US leaderboards. Shuffle and Blitz count each spec's players above a shared rating cutoff; 2v2 and 3v3 use the current specs of the top 300 players
- **PvP mode** on spec pages (replacing "PvP soon"): the talents and hero tree most top Solo Shuffle players run (Blitz or arena for tanks), their PvP talent picks, secondary stats, and an import string when a top player's loadout is a near match
- **Search** in the header (or press `/`): specs, classes, every Retail talent (opens the right tree with the talent highlighted), dungeons, raid bosses, boss abilities, Classic talents and your characters, with keyboard navigation
- The data job adds PvP leaderboards, PvP builds and a search index
- PvP tier lists hide a role when fewer than 5 players of any spec made the cut (tanks in Solo Shuffle and arena), with a pointer to Blitz

## 2026-10 — Phase 6: Classic Era and TBC Anniversary

- New **Classic** section with a switch between Classic Era (level 60) and TBC Anniversary (level 70, Phase 3)
- Every class's three talent trees drawn with the points for each build; tap a talent for its name, rank and description
- Endgame builds per class: Classic Era from Warcraft Tavern and Wowhead calculator links in current guides, each checked against the tree rules (point totals, ranks, prerequisites, 5 points per row); TBC raid builds from the wowsims simulator presets. Builds without a link show their point split and notes
- Leveling: spec, key abilities, talent order notes and, where available, the leveling build with a level-by-level point order
- Pre-raid best in slot (TBC: pre-raid and catch-up gear) with Wowhead item links and where each item comes from
- The data job fetches Classic and TBC talent names, icons and descriptions from Wowhead once
- The version button now says "Classic"
- Fixed 38 Classic and TBC talents with no description (text after a "Requires …" line was dropped); the next upload re-fetches talent details

## 2026-10 — Phase 4 fixes from the first real Adventure Guide data

- Ability entries now show their description, cast time and icon. Blizzard's guide only links each ability to its spell, and Blizzard's web API has no text or icons for boss spells, so the data job reads them from Wowhead's public tooltip service (credited on the page)
- Removed ability groups Blizzard lists twice
- Raid bosses follow the Adventure Guide's order (Lost Explorers before Vashnik)
- Ability names in Blizzard's text show in bold instead of [brackets]
- An upload rebuilds the Adventure Guide files when their format changes

## 2026-10 — Phase 4: Leveling and M+ & Raid

- New **Leveling** section: the route to 90, and for each class the best spec to level (plus an alternative), key abilities with icons, the one tip that matters, and a Midnight leveling talent import string (11 of 13 classes; Hunter and Death Knight link to the top build instead)
- New **M+ & Raid** section: the 8 dungeons in Midnight Season 2 with must-kick casts and dangerous trash, and all 8 bosses of The Venomous Abyss with Heroic and Mythic changes and phases
- Every boss has tank, healer, DPS and everyone notes, and Blizzard's full ability breakdown and role notes from the Adventure Guide. A role switch (All / Tank / Healer / DPS) shows just your notes and is remembered
- The daily data job now pulls the Adventure Guide for the current raid and this season's dungeons into `data/guide/`; an upload builds it once if it's missing
- Hand-written notes live in `notes/` with their sources and the date they were checked

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
