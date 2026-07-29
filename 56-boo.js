// Ghost ambush: fade to a shimmer, drift up next to the cursor, lurk just
// long enough to be forgotten, then snap solid with a BOO.
globalThis.playBoo = function () {
  const s = buddy.screen();
  const c = buddy.cursor.pos();
  const x = Math.min(Math.max(c.x + (chance(0.5) ? -170 : 90), s.x + 10), s.x + s.w - 140);
  const y = Math.min(Math.max(c.y - 130, s.y + 10), s.y + s.h - 220);
  const roll = Math.random();
  const pop =
    roll < 0.45 ? { anim: "boo", opacity: 1, line: "boo", secs: 2, ms: 2000 }
    : roll < 0.8 ? { anim: "boo", opacity: 1, say: "BOO!!", secs: 2, ms: 2000 }
    : { anim: "boo", opacity: 1, line: "boo", secs: 2, prop: "heart", ms: 2000 };
  runAct([
    { anim: "scheming", opacity: 0.15, ms: 800 },
    { anim: "walk", approach: { speed: 300, dx: x - c.x, dy: y - c.y }, until: "arrived" },
    { anim: "hide", ms: 600 + Math.random() * 1500 },
    pop,
    chance(0.5) ? { anim: "excited", line: "booAfter", secs: 3, ms: 2400 } : { ms: 300 },
    { anim: "idle" },
  ], () => buddy.opacity(1));
};

buddy.every(420000, () => {
  if (buddy.isHeld() || buddy.isFrozen() || state.mood === "sleepy") return;
  if (buddy.isMoving() || state.busy) return;
  if (!chance(buddy.traits.get("mischief") * 0.25)) return;
  playBoo();
});
