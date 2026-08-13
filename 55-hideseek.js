// Hide and seek v2: buddy picks a hiding STYLE, not just a spot.
//   corner - the classic: shifty eyes in a screen corner
//   window - duck BEHIND a real app window (layer behind), half peeking out
//   ghost  - go translucent and hide in plain sight
// Found in time (poked) = delighted. Ignored = emerges smug about winning.
// The shell force-restores layer/opacity on drag, freeze, or timeout, so a
// broken round can never leave buddy lost back there.
let hideRound = 0;

function unhide() {
  buddy.layer("front");
  buddy.opacity(1);
}

function clampSpot(p) {
  const s = buddy.screen();
  return {
    x: Math.min(Math.max(p.x, s.x + 10), s.x + s.w - 140),
    y: Math.min(Math.max(p.y, s.y + 10), s.y + s.h - 220),
  };
}

function cornerSpot() {
  const s = buddy.screen();
  return pick([
    { x: s.x + 30, y: s.y + 30 },
    { x: s.x + s.w - 130, y: s.y + 30 },
    { x: s.x + 30, y: s.y + s.h - 220 },
    { x: s.x + s.w - 130, y: s.y + s.h - 220 },
  ]);
}

// Straddle a window edge so a sliver of buddy stays visible (and pokable) -
// fully covered would make the round unwinnable.
function windowSpot() {
  const wins = (buddy.windows() || []).filter((w) => w.w > 240 && w.h > 180);
  if (!wins.length) return null;
  const w = pick(wins);
  return clampSpot(pick([
    { x: w.x - 60, y: w.y + 20 + Math.random() * Math.max(1, w.h - 260) },
    { x: w.x + w.w - 60, y: w.y + 20 + Math.random() * Math.max(1, w.h - 260) },
    { x: w.x + 30 + Math.random() * Math.max(1, w.w - 180), y: w.y + w.h - 70 },
  ]));
}

globalThis.playHideSeek = function (style) {
  if (style === "window" && !buddy.windows) style = "corner";
  const s = buddy.screen();
  style = style || pick(["corner", "window", "window", "ghost"]);
  let spot = null;
  if (style === "window") {
    spot = windowSpot();
    if (!spot) style = "corner";
  }
  if (style === "ghost") {
    spot = clampSpot({ x: s.x + 60 + Math.random() * (s.w - 260), y: s.y + 60 + Math.random() * (s.h - 320) });
  }
  if (!spot) spot = cornerSpot();

  const round = ++hideRound;
  let found = false;
  // Round guard: a stale listener from a timed-out game must not score a win.
  buddy.once("poked", () => { if (round === hideRound) found = true; });

  // Trash-talk from the hiding spot. Every whisper is a free position hint,
  // which is exactly the overconfidence that loses games - so it stays a
  // chattiness roll, never a guarantee.
  if (chance(0.8 * buddy.traits.get("chattiness"))) {
    buddy.after(12000 + Math.random() * 10000, () => {
      if (round !== hideRound || found) return;
      sayLine("hideTaunt", 2);
      if (chance(0.5 * buddy.traits.get("chattiness"))) {
        buddy.after(12000 + Math.random() * 8000, () => {
          if (round === hideRound && !found) sayLine("hideTaunt", 2);
        });
      }
    });
  }

  // Vary the opening: a dare, a giggle, a style-specific boast, or silence.
  const openings = [
    { anim: "scheming", line: "hideStart", secs: 3, ms: 1600 },
    { anim: "scheming", say: "hehehe", secs: 2, ms: 1400 },
    { anim: "scheming", ms: 900 },
  ];
  if (style === "ghost") openings.push({ anim: "scheming", line: "hideGhostStart", secs: 3, ms: 1600 });
  if (style === "window") openings.push({ anim: "scheming", line: "hideWindowStart", secs: 3, ms: 1600 });

  const win = chance(0.5)
    ? { layer: "front", opacity: 1, anim: "excited", line: "hideFound", secs: 3, prop: "heart", ms: 2600 }
    : { layer: "front", opacity: 1, anim: "excited", line: "hideFound", secs: 3, ms: 2600 };

  const hideStep = { anim: "hide", until: { poked: [win, { anim: "idle" }] }, timeout: 60000 };
  if (style === "window") hideStep.layer = "behind";
  if (style === "ghost") hideStep.opacity = 0.15;

  runAct([
    pick(openings),
    { anim: "walk", moveTo: { x: spot.x, y: spot.y, speed: 260 }, until: "arrived" },
    hideStep,
  ], () => {
    unhide();
    if (found || round !== hideRound) return;
    runAct([
      { anim: "scheming", line: "hideTimeout", secs: 4, ms: 2800 },
      { anim: "idle" },
    ]);
  });
};

registerAct("hideSeek", {
  minGap: 300000,
  weight: () => buddy.traits.get("mischief") * 0.5,
  run(act) { playHideSeek(); },
});
