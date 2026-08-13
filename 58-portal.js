// Portal hop: vanish into an orange portal, pop out of a blue one elsewhere.
// The body has no real teleport verb, so the travel leg is a ghost sprint -
// opacity floor + behind windows at max speed. Looks like magic from out front.
function portalDest() {
  const s = buddy.screen();
  const roll = Math.random();
  if (roll < 0.35 && can("cursor")) {
    // Pop out right next to the cursor. Maximum startle value.
    const c = buddy.cursor.pos();
    return { x: c.x + (chance(0.5) ? 90 : -150), y: c.y - 50 };
  }
  if (roll < 0.6) return cornerSpot();
  return { x: s.x + 60 + Math.random() * (s.w - 260), y: s.y + 60 + Math.random() * (s.h - 320) };
}

// One travel leg: swallowed here, spat out there.
function portalHop(dest) {
  return [
    { anim: "portalin", sfx: "vwoop", ms: 650 },
    { opacity: 0.15, layer: "behind", moveTo: { x: dest.x, y: dest.y, speed: 520 }, until: "arrived", timeout: 8000 },
    // Paired audio: vwoop swallows, pop spits out - the blue exit was mute
    // and the hop sounded like half a trick.
    { layer: "front", opacity: 1, anim: "portalout", sfx: "pop", ms: 650 },
  ];
}

globalThis.playPortal = function (dest) {
  const openings = [
    { anim: "scheming", line: "portalStart", secs: 2, ms: 1600 },
    { anim: "scheming", say: "hehe", secs: 2, ms: 1200 },
    { anim: "scheming", ms: 800 },
  ];
  const closers = [
    { anim: "excited", line: "portalAfter", secs: 3, ms: 2400 },
    { anim: "excited", line: "portalAfter", secs: 3, prop: "companioncube", ms: 2400 },
    { anim: "excited", ms: 1400 },
  ];

  // Misfire: the portal spits buddy right back out where it started. Only on
  // self-picked trips - an explicit destination (tests, other acts) always lands.
  if (!dest && chance(0.08 + buddy.traits.get("mischief") * 0.12)) {
    runAct([
      pick(openings),
      { anim: "portalin", sfx: "vwoop", ms: 650 },
      { anim: "portalout", sfx: "fzzt", ms: 650 },
      { anim: "grumpy", line: "portalMisfire", secs: 4, ms: 3200 },
      { anim: "idle" },
    ]);
    return;
  }

  const first = clampSpot(dest || portalDest());
  const steps = [pick(openings)].concat(portalHop(first));

  // Double hop: pop out, look around, decide the exit was wrong, hop again.
  if (!dest && chance(buddy.traits.get("weirdness") * 0.25)) {
    steps.push({ anim: "excited", line: "portalDouble", secs: 3, ms: 2200 });
    steps.push.apply(steps, portalHop(clampSpot(portalDest())));
  }

  steps.push(pick(closers));
  steps.push({ anim: "idle" });
  runAct(steps);
};

registerAct("portal", {
  minGap: 300000,
  weight: () => buddy.traits.get("weirdness") * 0.35,
  run(act) {
    playPortal();
  },
});
