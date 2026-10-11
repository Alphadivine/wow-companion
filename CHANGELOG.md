# Changelog

## 2026-10 — Phase 1: foundation and live talent trees

- New Cloudflare Worker (`wow-companion-api`) that holds the Blizzard API keys, calls the Battle.net API, and caches classes, specs and talent trees for 24 hours (keeps serving the last good copy if Blizzard is down)
- Class and spec browser with live icons, roles and descriptions for every Retail spec
- Spec pages with the class, hero and spec talent trees drawn from Blizzard data, talent details on hover, tap or keyboard focus, and a "Find a talent" search
- Header with Retail, Classic Era and WoW Forever switcher; sections still to come are marked with a lock and explain what's coming and when
- WoW Forever page with zones, new class/race combos and a live launch countdown
- Home page with "Jump back" to your last spec, build progress, and quick class picks
- In-game styled dark theme from the approved mockups; phone layout with a slide-up talent details sheet
- Installable app with an offline shell
