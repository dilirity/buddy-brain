// Portal hop: vanish into an orange portal, pop out of a blue one elsewhere.
// The body has no real teleport verb, so the travel leg is a ghost sprint -
// opacity floor + behind windows at max speed. Looks like magic from out front.
globalThis.playPortal = function (dest) {
  const s = buddy.screen();
  if (!dest) {
    const roll = Math.random();
    if (roll < 0.35) {
      // Pop out right next to the cursor. Maximum startle value.
      const c = buddy.cursor.pos();
      dest = { x: c.x + (chance(0.5) ? 90 : -150), y: c.y - 50 };
    } else if (roll < 0.6) {
      dest = cornerSpot();
    } else {
      dest = { x: s.x + 60 + Math.random() * (s.w - 260), y: s.y + 60 + Math.random() * (s.h - 320) };
    }
  }
  dest = clampSpot(dest);

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
  runAct([
    pick(openings),
    { anim: "portalin", ms: 650 },
    { opacity: 0.15, layer: "behind", moveTo: { x: dest.x, y: dest.y, speed: 520 }, until: "arrived", timeout: 8000 },
    { layer: "front", opacity: 1, anim: "portalout", ms: 650 },
    pick(closers),
    { anim: "idle" },
  ]);
};

buddy.every(300000, () => {
  if (buddy.isHeld() || buddy.isFrozen() || state.mood === "sleepy") return;
  if (buddy.isMoving() || state.busy) return;
  if (!chance(buddy.traits.get("weirdness") * 0.18)) return;
  playPortal();
});
