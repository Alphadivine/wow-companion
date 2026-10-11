# WoW Companion

A personal World of Warcraft guide that puts talent trees, builds, tier lists, gear and leveling tips in one place, so there's no jumping between guide sites. It covers Retail, with Classic Era and WoW Forever sections on the way.

## What works now (phase 1)

- **Classes and specs**: every Retail class and spec, with icons and roles, loaded live from Blizzard's Battle.net API
- **Talent trees**: the class tree, both hero trees and the spec tree for every spec, drawn the way they look in game (active, passive, choice and free nodes, with the lines between them)
- **Talent details**: hover, tap or tab to any talent to read its description, cast time, range and cooldown; choice nodes show both options
- **Find a talent**: search a tree by name or effect
- **Jump back**: Home remembers the last spec you looked at
- **Version switcher**: Retail, Classic Era and WoW Forever, with a live countdown to Forever's November 4 launch
- Works on phones (talent details slide up from the bottom) and installs as an app

## Coming next

| Phase | What it adds |
|---|---|
| 2 | Top Mythic+, raid and PvP builds with import strings, stat priority, best in slot, tier lists |
| 3 | Battle.net login, your characters compared against the top build, upgrade checklist |
| 4 | Short leveling tips for every class, Mythic+ and raid boss quick notes |
| 5 | WoW Forever leveling, zones and dungeons after launch |
| 6 | Classic Era and Hardcore |
| 7 | PvP tier lists and search across the whole app |

## How the data works

The site never calls Blizzard directly. A small Cloudflare Worker (`wow-companion-api`) holds the Blizzard Client ID and Secret, calls the API, trims the answers to what the site needs, and caches them for 24 hours. The site also keeps a 6-hour copy in your browser. The Worker address is set in `config.js`; keep it filled in when re-uploading the site. Setup steps are in `Docs/Setup guide.md` in the project bundle.

## Files

- `index.html` – page structure
- `css/style.css` – the dark, in-game styled theme
- `js/data.js` – class colors, roles, sections, roadmap, WoW Forever facts
- `js/api.js` – talks to the Worker and keeps a short local copy
- `js/talents.js` – draws talent trees and talent details
- `js/app.js` – pages and navigation
- `config.js` – the Worker address
- `sw.js`, `manifest.webmanifest`, `icons/` – installable app support

Game data comes from the Blizzard Battle.net API. World of Warcraft is a trademark of Blizzard Entertainment; this personal fan app isn't affiliated with Blizzard.

---
Last updated: 2026-10-11
