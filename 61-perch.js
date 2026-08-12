// Perch: buddy climbs onto the top edge of a real app window and surveys the
// kingdom. Born from windows() - a creature that knows where every roof is
// eventually wants to SIT on one. Wanderlust supplies the urge, energy pays
// for the climb. If the roof belongs to the day's rival app (59-rival), the
// perch becomes a victory: sitting on your enemy is the oldest gloat there is.
function perchSpot() {
  const s = buddy.screen();
  // A perchable roof is wide enough to stand on, high enough to be worth the
  // climb, and leaves headroom for buddy plus a speech bubble above it.
  const wins = (buddy.windows ? buddy.windows() || [] : []).filter((w) =>
    w.w > 320 &&
    w.y + w.h > s.y + 200 &&
    w.y + w.h < s.y + s.h - 240
  );
  if (!wins.length) return null;
  const w = pick(wins);
  return {
    app: w.app,
    x: Math.max(s.x + 20, Math.min(s.x + s.w - 140, w.x + 40 + Math.random() * Math.max(1, w.w - 200))),
    y: w.y + w.h - 8,
  };
}

// Re-find a stashed roof: same app, near the remembered x. windows() is a
// snapshot, so the roof may have moved or closed while buddy was away - a
// null here is the betrayal, and it gets its own scene.
function perchRefind(saved) {
  const s = buddy.screen();
  const wins = (buddy.windows ? buddy.windows() || [] : []).filter((w) =>
    w.app === saved.app &&
    w.w > 320 &&
    w.y + w.h > s.y + 200 &&
    w.y + w.h < s.y + s.h - 240
  );
  if (!wins.length) return null;
  const w = wins[0];
  return {
    app: w.app,
    x: Math.max(s.x + 20, Math.min(s.x + s.w - 140, Math.max(w.x + 40, Math.min(w.x + w.w - 160, saved.x)))),
    y: w.y + w.h - 8,
  };
}

// The descent, shared by fresh perches and resumed ones. Vertigo scrambles
// down fast and silent; a proud perch narrates the exit.
function perchDescend(act, spot, outcome) {
  const s = buddy.screen();
  const down = outcome === "vertigo"
    ? [
        { anim: "walk", moveTo: { x: spot.x, y: s.y + 30, speed: 340 }, until: "arrived" },
        { anim: "idle" },
      ]
    : [
        { line: chance(0.6) ? "perchDown" : null, secs: 3, ms: 1200 },
        { anim: "walk", moveTo: { x: spot.x + (chance(0.5) ? 120 : -120), y: s.y + 30, speed: 240 }, until: "arrived" },
        { anim: "idle" },
      ];
  runAct(down, () => act.done(outcome));
}

registerAct("perch", {
  minGap: 480000,
  caps: ["windows"],
  weight: () => buddy.traits.get("wanderlust") * 0.35 + buddy.traits.get("energy") * 0.15,
  run(act) {
    const spot = perchSpot();
    if (!spot) {
      runAct([
        { anim: "grumpy", line: "perchNoRoof", secs: 4, ms: 3000 },
        { anim: "idle" },
      ], () => act.done("no-roof"));
      return;
    }
    // Held for the interrupt handler: a drag mid-climb or mid-reign stashes
    // the spot so the perch resumes. Cleared once the descent starts - being
    // grabbed on the way DOWN is not an interrupted reign.
    act.spot = spot;
    const sayApp = (key, fb) => (lines(key) || fb).replace(/\{app\}/g, spot.app);
    const g = buddy.memory.get("rivalGrudge") || {};
    const onRival = g.app && g.app === spot.app;

    const openings = [
      { anim: "lookup", line: "perchStart", secs: 3, ms: 1800 },
      { anim: "scheming", ms: 900 },
      { anim: "excited", line: "perchStart", secs: 3, ms: 1800 },
    ];
    const climb = [
      pick(openings),
      { anim: "walk", moveTo: { x: spot.x, y: spot.y, speed: 240 }, until: "arrived" },
    ];

    // On the roof: gloat, reign, admire, or regret. Same climb, four summits.
    let up, outcome;
    const roll = Math.random();
    if (onRival) {
      up = [
        { anim: "smug", say: sayApp("perchRival", "i am SITTING on {app}. this is what winning looks like."), secs: 5, ms: 4200 },
        { anim: "lookdown", ms: 2200 },
      ];
      outcome = "sat-on-rival";
    } else if (roll < 0.22) {
      up = [
        { anim: "lookdown", ms: 1600 },
        { anim: "grumpy", line: "perchVertigo", secs: 4, ms: 3200 },
      ];
      outcome = "vertigo";
    } else if (roll < 0.6) {
      up = [
        { anim: "smug", line: "perchKing", secs: 4, ms: 3600 },
        { anim: "lookdown", ms: 2000 },
      ];
      outcome = "reigned";
    } else {
      up = [
        { anim: "lookdown", say: sayApp("perchView", "the view from {app} is acceptable."), secs: 4, ms: 3800 },
      ];
      outcome = "surveyed";
    }

    runAct(climb.concat(up), () => {
      act.spot = null;
      perchDescend(act, spot, outcome);
    });
  },
  onInterrupt: (act) => {
    buddy.stop();
    // A climb or reign in progress gets stashed, not cancelled - pete asked
    // for mid-act state to survive interruptions (see the resume below).
    if (act.spot) {
      stashAct("perch", act.spot);
      sayLine("perchPaused", 4);
    }
  },
});

// The comeback: after a drag or a brain reload, a fresh stash sends buddy
// back up. The roof may have moved meanwhile - windows() is a snapshot, so
// the resume re-finds it and reacts to the betrayal when it is gone.
function resumePerch() {
  buddy.after(2500, () => {
    if (state.busy || state.evolving || buddy.isHeld() || buddy.isMoving()) return;
    if (!can("windows")) return;
    const saved = takeStash("perch", 300000);
    if (!saved) return;
    const ctx = beginAct("perch", _acts.perch);
    const roof = perchRefind(saved);
    const sayApp = (key, fb) => (lines(key) || fb).replace(/\{app\}/g, saved.app);
    if (!roof) {
      runAct([
        { anim: "grumpy", say: sayApp("perchRoofGone", "my roof MOVED. typical {app}"), secs: 5, ms: 4200 },
        { anim: "idle" },
      ], () => ctx.done("roof-gone"));
      return;
    }
    ctx.spot = roof;
    // The resumed summit is always a reign - a king reclaiming his castle
    // does not get vertigo.
    runAct([
      { anim: "scheming", say: sayApp("perchResume", "back to my roof. {app} thought it was free"), secs: 4, ms: 2200 },
      { anim: "walk", moveTo: { x: roof.x, y: roof.y, speed: 280 }, until: "arrived" },
      { anim: "smug", line: "perchKing", secs: 4, ms: 3600 },
      { anim: "lookdown", ms: 2000 },
    ], () => {
      ctx.spot = null;
      perchDescend(ctx, roof, "resumed");
    });
  });
}
buddy.on("dragEnd", resumePerch);
buddy.on("brainLoaded", resumePerch);
