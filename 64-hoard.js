// The hoard: a goblin keeps what it earns. Items land here from treasure-hunt
// wins (53-treasure) and phone-trip souvenirs (80-phone); each entry is a real
// prop with a remembered origin, and the curator act below shows them off.
// Memory-backed so the pile is a life, not a session.
const HOARD_NAMES = {
  heart: "the glass heart",
  mug: "a mug (mine now)",
  companioncube: "the companion cube",
  jawbreaker: "the jawbreaker",
  martini: "a martini (untouched, evidence)",
  badge: "my official badge",
  tie: "a tiny tie",
  monocle: "the monocle",
  cowboyhat: "the cowboy hat",
  glasses: "somebody's glasses",
  mouseears: "lab mouse ears",
  nightcap: "the spare nightcap",
};
// A goblin's pile has a physical limit; past it, the pile decides who leaves.
const HOARD_MAX = 10;

globalThis.hoardName = (it) => HOARD_NAMES[it.prop] || it.prop;

globalThis.addToHoard = function (prop, from) {
  const h = buddy.memory.get("hoard") || [];
  h.push({ prop: prop, from: from, at: Date.now() });
  if (h.length > HOARD_MAX) {
    // The eviction is announced at the NEXT curation, not now - an acquisition
    // moment interrupted by an obituary reads as two acts fighting for a bubble.
    buddy.memory.set("hoardEvicted", hoardName(h.shift()));
  }
  buddy.memory.set("hoard", h);
};

registerAct("hoard", {
  minGap: 1500000,
  weight() {
    const h = buddy.memory.get("hoard") || [];
    const t = buddy.traits.get("chattiness") * 0.3 + buddy.traits.get("weirdness") * 0.3;
    // An empty vault still earns the occasional lament - the want IS the bit.
    return h.length ? t : t * 0.25;
  },
  run(act) { playHoard(act); },
  onInterrupt() {
    buddy.prop(null);
    buddy.play("idle");
  },
});

globalThis.playHoard = function (act) {
  const h = buddy.memory.get("hoard") || [];
  if (!h.length) {
    runAct([
      { anim: "grumpy", line: "hoardEmpty", secs: 5, ms: 4200 },
      { anim: "idle" },
    ]);
    return;
  }
  const it = pick(h);
  const name = hoardName(it);
  const origin = it.from === "trip" ? "carried home from the phone" : "dug out of your screen";
  const fill = (t) => t && t.replace(/\{item\}/g, name).replace(/\{from\}/g, origin);

  // A pending eviction gets its obituary before anything else - the pile
  // limit must be FELT or the cap is just silent data loss.
  const gone = buddy.memory.get("hoardEvicted");
  if (gone && chance(0.5)) {
    buddy.memory.set("hoardEvicted", null);
    runAct([
      { anim: "grumpy", say: fill((lines("hoardEvict") || "").replace(/\{item\}/g, gone)) || ("moment of silence for " + gone), secs: 5, ms: 4600 },
      { anim: "idle" },
    ]);
    return;
  }

  const roll = Math.random();
  if (roll < 0.3 && can("think")) {
    // Museum tour: an invented backstory per exhibit, fresh every time.
    buddy.play("scheming");
    buddy.think("You are a pixel goblin curating your treasure hoard. Tonight's exhibit: " + name + ", " + origin + ". One short pompous museum-plaque line about it.", (t) => {
      if (!act.live) return;
      buddy.say(t || fill(lines("hoardShow")) || "exhibit a. priceless", 6, it.prop);
      act.after(4500, () => { buddy.play("idle"); act.done("tour"); });
    });
  } else if (roll < 0.55) {
    // Census brag: the count is the point. The count is always the point.
    const line = (lines("hoardBrag") || "{count} treasures. respect the pile").replace(/\{count\}/g, String(h.length));
    runAct([
      { anim: "smug", say: line, secs: 5, prop: it.prop, ms: 4600 },
      { anim: "idle" },
    ], () => act.done("census"));
  } else if (roll < 0.75) {
    // Guard shift: haul the piece to a low corner and defend it from nobody.
    const s = buddy.screen();
    const corner = { x: chance(0.5) ? s.x + 70 : s.x + s.w - 100, y: s.y + 40 };
    runAct([
      { anim: "scheming", say: fill(lines("hoardGuard")) || "security shift", secs: 4, prop: it.prop, ms: 2200 },
      { anim: "walk", moveTo: { x: corner.x, y: corner.y, speed: 220 }, until: "arrived" },
      { anim: "grumpy", prop: it.prop, ms: 5200 },
      { anim: "idle" },
    ], () => act.done("guarded"));
  } else {
    // Plain show-and-tell.
    runAct([
      { anim: "excited", say: fill(lines("hoardShow")) || "behold. loot", secs: 5, prop: it.prop, ms: 4800 },
      { anim: "idle" },
    ], () => act.done("shown"));
  }
};
