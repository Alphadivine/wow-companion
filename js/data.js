/* WoW Companion — static app data: class colors, sections, versions, roadmap, WoW Forever facts. */
window.WOW_DATA = (() => {
  // Class colors, lightened slightly where the official color is too dark to read on the dark theme.
  const CLASS_COLORS = {
    1: "#C69B6D",  // Warrior
    2: "#F48CBA",  // Paladin
    3: "#AAD372",  // Hunter
    4: "#FFF468",  // Rogue
    5: "#FFFFFF",  // Priest
    6: "#E0485F",  // Death Knight
    7: "#3F9BFF",  // Shaman
    8: "#3FC7EB",  // Mage
    9: "#8788EE",  // Warlock
    10: "#00FF98", // Monk
    11: "#FF7C0A", // Druid
    12: "#C77DE8", // Demon Hunter
    13: "#4FC3A8"  // Evoker
  };

  const ROLES = {
    TANK: { label: "Tank", color: "#9fb7d8", icon: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" },
    HEALER: { label: "Healer", color: "#9fe3ad", icon: "M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" },
    DAMAGE: { label: "Damage", color: "#ffb19c", icon: "M14.5 3H21v6.5L10 20.5 3.5 14zM3 21l4-4M7 13l4 4" }
  };

  const VERSIONS = [
    { id: "retail", label: "Retail", href: "#/" },
    { id: "classic", label: "Classic Era", href: "#/classic" },
    { id: "forever", label: "Forever", href: "#/forever" }
  ];

  // Retail sections. "ready" ones work now; the rest show what's coming and in which build phase.
  const SECTIONS = [
    { id: "home", label: "Home", href: "#/", ready: true },
    { id: "tiers", label: "Tier Lists", href: "#/tiers", ready: true, phase: 2,
      blurb: "Tank, healer and DPS rankings for Mythic+ and raid, built from Warcraft Logs and Raider.IO, with the sample size shown.",
      bullets: ["S, A and B tiers for each role", "Switch between Mythic+ and Raid", "See which specs moved since the last patch"] },
    { id: "specs", label: "Specs", href: "#/specs", ready: true },
    { id: "characters", label: "My Characters", href: "#/characters", ready: true, phase: 3,
      blurb: "Log in with Battle.net once and every US character loads, compared against the top build.",
      bullets: ["Gear vs best in slot, with missing enchants and gems", "Talents that differ from the top build", "An upgrade checklist, M+ score and raid progress"] },
    { id: "leveling", label: "Leveling", href: "#/leveling", phase: 4,
      blurb: "Short leveling tips for all 13 classes: which spec to level as, key abilities, and the one tip that matters.",
      bullets: ["Leveling talent builds to copy", "Fastest path to the level cap", "Hardcore safety tips for Classic Era"] },
    { id: "dungeons", label: "M+ & Raid", href: "#/dungeons", phase: 4,
      blurb: "The current Mythic+ dungeon pool and raid bosses, with quick notes for interrupts, tanks, healers and everyone.",
      bullets: ["Must-kick casts and dangerous packs", "Tank and healer cooldown moments", "Specs that shine in each dungeon"] },
    { id: "pvp", label: "PvP", href: "#/pvp", phase: 7,
      blurb: "Arena and battleground tier lists and the most-picked PvP talents, kept lighter than the PvE sections.",
      bullets: ["Solo Shuffle, 2v2, 3v3 and Battlegrounds", "PvP talent pick rates per spec"] }
  ];

  const ROADMAP = [
    { phase: 1, title: "Foundation", text: "Class and spec pages with live talent trees", done: true },
    { phase: 2, title: "Builds & tier lists", text: "Top builds, stats and best in slot from logs", done: true },
    { phase: 3, title: "My Characters", text: "Battle.net login and character compare", done: true },
    { phase: 4, title: "Leveling & dungeons", text: "Leveling tips and boss quick notes" },
    { phase: 5, title: "WoW Forever", text: "Zones, dungeons and leveling after launch" },
    { phase: 6, title: "Classic Era", text: "Talents, pre-raid gear, Hardcore tips" },
    { phase: 7, title: "PvP & polish", text: "PvP tier lists, search everywhere" }
  ];

  // WoW Forever facts from Blizzard's BlizzCon 2026 announcement.
  const FOREVER = {
    launch: "2026-11-04",
    zones: [
      { name: "Mount Hyjal", note: "New zone", color: "#7fd88f", icon: "M3 20l6-10 4 6 3-4 5 8zM15 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" },
      { name: "Riverglades", note: "New zone", color: "#5aa8ff", icon: "M3 8c3-2 6 2 9 0s6 2 9 0M3 13c3-2 6 2 9 0s6 2 9 0M3 18c3-2 6 2 9 0s6 2 9 0" },
      { name: "Zephras Isle", note: "Skyborne starting zone", color: "#f3e3b5", icon: "M12 6c-4 1-7 3-9 7 3-2 6-2 9-2M12 6c4 1 7 3 9 7-3-2-6-2-9-2M12 6v12M8 18h8" },
      { name: "Shen'dralas", note: "New zone", color: "#c27cf5", icon: "M5 21V10l7-6 7 6v11M9 21v-6h6v6M12 4V2" }
    ],
    combos: [
      { name: "Dwarf Shaman", color: "#3F9BFF" },
      { name: "Forsaken Paladin", color: "#F48CBA" },
      { name: "Skyborne (new race)", color: "#e6c46a" }
    ],
    facts: ["Level cap 60", "1,000+ new quests", "9 new dungeons, including Hall of Thanes (Ironforge, levels 13–18)", "2 new raids for 10 and 20 players", "Included with a WoW subscription"]
  };

  return { CLASS_COLORS, ROLES, VERSIONS, SECTIONS, ROADMAP, FOREVER };
})();
