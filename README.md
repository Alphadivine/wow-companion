# WoW Companion

A personal World of Warcraft guide that puts talent trees, builds, tier lists, gear and leveling tips in one place, so there's no jumping between guide sites. It covers Retail, with Classic Era and WoW Forever sections on the way.

## What works now

- **Home** built around your main character: full character model, the three slots to upgrade first, your stats next to top players', this week's raid and Mythic+ dungeons with their art, and the top specs this week
- **Spec pages** in each spec's own colors, with big tier cards and a Mythic+ / Raid / PvP switch that stays in view
- **Tier lists** drawn as colored tier bands with a tile per spec, and dungeon and boss pages with full-width art and a role switch that stays in view
- **PvP**: tier lists for Solo Shuffle, 3v3, 2v2 and Battleground Blitz from Blizzard's US leaderboards, and a PvP mode on every spec page with top players' talents, PvP talents and stats
- **Search** (press `/` or the search button): specs, classes, every Retail talent (opens its tree with the talent highlighted), dungeons, raid bosses, boss abilities, Classic talents and your own characters
- **Classic**: Classic Era (level 60) and TBC Anniversary (level 70) for all nine classes. Each class has endgame talent builds drawn on the class's three trees with points on every talent, a leveling build with its level-by-level point order where the source has one, key abilities and talent order notes, and pre-raid best in slot (TBC: pre-raid and catch-up gear) with Wowhead item links
- **Leveling** for all 13 classes: the best spec to level and an alternative, key abilities, the one tip that matters, a leveling talent import string where a current one exists, and the fastest route to 90
- **M+ & Raid**: every dungeon in this season's Mythic+ rotation and every boss in the current raid, with must-kick casts, dangerous trash, tank / healer / DPS / everyone notes, Heroic and Mythic changes and phases, plus the full ability breakdown from Blizzard's Adventure Guide. A role switch shows just your role's notes
- **My Characters**: sign in once with Battle.net to load your characters. Max-level characters show spec, item level, Mythic+ score and raid progress, with a toggle for alts still leveling
- **Character compare** against the top Mythic+ or Raid build: an upgrade checklist (missing enchants, empty sockets, talents to change, lowest item levels, stat gaps), the talent tree marked with what to add, remove or switch, gear next to top players' picks, and secondary stats side by side
- **Top builds** for every Retail spec, for Mythic+ and Raid: the talents top players take, highlighted on the tree with how many of them take each one
- **Import strings** copied from a real top player whose saved loadout matches the build (within 2 talents); paste it in game under Talents → Import
- **Stat priority** from top players' secondary stats, and **best in slot** per slot with item level, enchants and gems
- **Tier lists** for tanks, healers and DPS: Mythic+ from Raider.IO's top 500 runs, Raid from Warcraft Logs' top 50 parses on 3 rotating bosses
- **Talent trees** for every spec: class tree, the spec's two hero trees and the spec tree, drawn the way they look in game with real spell icons
- **Talent details** on hover, tap or keyboard, plus "Find a talent" search; slots that change by spec (dashed ring) list every version
- **Version switcher** for Retail, Classic Era and WoW Forever, with a live countdown to Forever's November 4 launch
- Works on phones and installs as an app

## Coming next

| Phase | What it adds |
|---|---|
| 5 | WoW Forever leveling, zones and dungeons after launch |

## How the data works

The site never calls Blizzard directly. A small Cloudflare Worker (`wow-companion-api`) holds the Blizzard Client ID and Secret, calls the API, trims the answers to what the site needs, and caches them for 24 hours. The site also keeps a 6-hour copy in your browser. The Worker address is set in `config.js`; keep it filled in when re-uploading the site. Setup steps are in `Docs/Setup guide.md` in the project bundle.

Battle.net sign-in goes through the Worker too (`/auth/login` and `/auth/callback`). The Worker uses the sign-in once to read your character list and sends it back in the page address after the `#` (which browsers never send to a server). It doesn't keep your Battle.net token, and sign-in doesn't use the Worker's KV storage. The list is saved in your browser; character gear and talents are public Blizzard data the Worker reads with its own key and caches for 10 minutes.

Dungeon and raid ability details come from Blizzard's Adventure Guide, pulled by the same daily job into `data/guide/`. Blizzard's web API has no text or icons for boss spells, so each ability's description, cast time and icon come from Wowhead's public tooltip service. The hand-written leveling, dungeon and raid notes live in `notes/` (researched from Icy Veins, Method, Wowhead and Raider.IO, with sources listed on each page) and need a refresh each season.

Classic tree layouts come from the wowsims Classic and TBC projects (`notes/trees-era.json`, `notes/trees-tbc.json`). Talent names, icons and descriptions come from Wowhead's Classic and TBC tooltips, fetched once by the data job into `data/classic/`. Classic Era builds are Warcraft Tavern and Wowhead calculator links from current guides; TBC raid builds are the wowsims simulator presets.

PvP tier lists and builds also come from the daily job, using Blizzard's PvP leaderboards (US). The job writes `data/search.json` for the search box too.

Builds and tier lists come from a GitHub Actions job (`.github/workflows/pages.yml` runs `scripts/build-data.mjs`) every morning. It reads Raider.IO, Warcraft Logs and Blizzard, writes `data/builds/{spec}.json`, `data/tiers.json` and `data/meta.json`, and publishes them with the site. Uploads publish right away and keep the current data.

## Files

- `index.html` – page structure
- `css/style.css` – the dark, in-game styled theme
- `js/data.js` – class colors, roles, sections, roadmap, WoW Forever facts
- `js/api.js` – talks to the Worker and keeps a short local copy
- `js/talents.js` – draws talent trees and talent details
- `js/app.js` – pages and navigation
- `notes/` – hand-written leveling, dungeon, raid and Classic notes (refresh each season), plus the Classic talent tree layouts
- `config.js` – the Worker address
- `scripts/build-data.mjs` – the daily builds and tier lists job
- `.github/workflows/pages.yml` – runs that job and publishes the site
- `sw.js`, `manifest.webmanifest`, `icons/` – installable app support

Game data comes from the Blizzard Battle.net API. World of Warcraft is a trademark of Blizzard Entertainment; this personal fan app isn't affiliated with Blizzard.

---
Last updated: 2026-10-11
