// Hide and seek: buddy sneaks off to a screen corner and waits to be found
// (poked). Found in time = delighted. Ignored = emerges smug about winning.
let hideRound = 0;

globalThis.playHideSeek = function () {
  const s = buddy.screen();
  const corners = [
    { x: s.x + 30, y: s.y + 30 },
    { x: s.x + s.w - 130, y: s.y + 30 },
    { x: s.x + 30, y: s.y + s.h - 220 },
    { x: s.x + s.w - 130, y: s.y + s.h - 220 },
  ];
  const spot = pick(corners);
  const round = ++hideRound;
  let found = false;
  // Round guard: a stale listener from a timed-out game must not score a win.
  buddy.once("poked", () => { if (round === hideRound) found = true; });
  // Vary the opening: a dare, a giggle, or a silent sneak.
  const roll = Math.random();
  const opening =
    roll < 0.35 ? { anim: "scheming", line: "hideStart", secs: 3, ms: 1600 }
    : roll < 0.6 ? { anim: "scheming", say: "hehehe", secs: 2, ms: 1400 }
    : { anim: "scheming", ms: 900 };
  const win = chance(0.5)
    ? { anim: "excited", line: "hideFound", secs: 3, prop: "heart", ms: 2600 }
    : { anim: "excited", line: "hideFound", secs: 3, ms: 2600 };
  runAct([
    opening,
    { anim: "walk", moveTo: { x: spot.x, y: spot.y, speed: 260 }, until: "arrived" },
    { anim: "hide", until: { poked: [win, { anim: "idle" }] }, timeout: 60000 },
  ], () => {
    if (found || round !== hideRound) return;
    runAct([
      { anim: "scheming", line: "hideTimeout", secs: 4, ms: 2800 },
      { anim: "idle" },
    ]);
  });
};

buddy.every(240000, () => {
  if (buddy.isHeld() || buddy.isFrozen() || state.mood === "sleepy") return;
  if (buddy.isMoving() || state.busy) return;
  if (!chance(buddy.traits.get("mischief") * 0.2)) return;
  playHideSeek();
});
