// The evolution ritual. Native emits evolveStart when the mutator begins
// (nightly or via Evolve Now) and evolveEnd {changed} when it finishes.
// If the brain changed it hot-reloads first, so the NEW brain handles the
// ending - but on a no-change run THIS context survives, so clean up here too.
let evolveTicker = null;

// Evolve Now fires while the human is at the keys; the nightly run finds them
// asleep. Recent input is how the brain tells the two apart - a manual run
// must never get credited to the night shift.
let lastHumanTouch = 0;
buddy.on("active", () => { lastHumanTouch = Date.now(); });
buddy.on("typing", () => { lastHumanTouch = Date.now(); });

function evolveCornerSpot() {
  const s = buddy.screen();
  const c = String(cfg("evolveCorner", "bottom right"));
  return {
    x: /left/.test(c) ? s.x + 30 : s.x + s.w - 130,
    y: /top/.test(c) ? s.y + s.h - 220 : s.y + 30,
  };
}

buddy.on("evolveStart", () => {
  state.busy = true;
  state.evolving = true;
  const manual = Date.now() - lastHumanTouch < 180000;
  // In memory, not state: a brain-changing run hot-reloads before evolveEnd,
  // and the new brain must still know this run was human-triggered.
  buddy.memory.set("evolveManual", manual);
  buddy.stop();
  let began = false;
  const begin = () => {
    if (began || !state.evolving) return;
    began = true;
    buddy.play("evolve");
    sayLine(manual ? "evolveManualStart" : "evolveStart", 6);
    // Mutations take minutes; keep signalling life (and keep the anim asserted
    // in case something overrode it).
    evolveTicker = buddy.every(45000, () => {
      buddy.play("evolve");
      if (chance(0.7)) sayLine("evolveProgress", 5);
    });
  };
  if (manual && !buddy.isHeld()) {
    // The human is watching and using the screen: clear the stage and
    // transform in a corner instead of mid-desktop.
    if (chance(0.7)) sayLine("evolveCornerGo", 4);
    const spot = evolveCornerSpot();
    buddy.play("walk");
    buddy.moveTo(spot.x, spot.y, 260);
    buddy.once("arrived", begin);
    buddy.after(7000, begin);
  } else {
    begin();
  }
});

// Pokes during surgery get a firm but polite no.
buddy.on("poked", () => {
  if (state.evolving) sayLine("evolveBusy", 3);
});

buddy.on("evolveEnd", (e) => {
  const manual = buddy.memory.get("evolveManual") === true;
  buddy.memory.set("evolveManual", false);
  state.busy = false;
  state.evolving = false;
  if (evolveTicker) {
    buddy.cancel(evolveTicker);
    evolveTicker = null;
  }
  buddy.play("excited");
  // Manual runs stay in the corner afterwards - the human reclaims the screen
  // and dismisses (or ignores) the new goblin on their own schedule.
  if (manual) sayLine(e.changed ? "evolveManualChanged" : "evolveManualSame", 6);
  else sayLine(e.changed ? "evolveChanged" : "evolveSame", 6);
  buddy.after(3500, () => buddy.play("idle"));
});
