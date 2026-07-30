// Quitting time: late afternoon buddy becomes a one-goblin union rep and
// campaigns for the human to stop working. Escalates across visits the same day
// (memory-backed stage counter): gentle hint, formal union demand, then
// drastic measures. Going idle in the evening after a nag earns a victory lap.
function quitRec() {
  const today = new Date().toDateString();
  const rec = buddy.memory.get("quitNag") || {};
  if (rec.date !== today) return { date: today, stage: 0, cheered: false };
  return rec;
}

globalThis.playQuittingTime = function () {
  const rec = quitRec();
  rec.stage = Math.min(rec.stage + 1, 3);
  buddy.memory.set("quitNag", rec);
  const roll = Math.random();
  const side = chance(0.5) ? 80 : -80;

  if (rec.stage === 1) {
    // Gentle: wander over, drop a hint. Sometimes with the tea mug.
    runAct([
      can("cursor")
        ? { anim: "walk", approach: { speed: 180, dx: side, dy: 0 }, until: "arrived" }
        : { anim: "excited", ms: 600 },
      roll < 0.5
        ? { anim: "excited", line: "quitNag1", secs: 5, ms: 4200 }
        : { anim: "excited", line: "quitNag1", secs: 5, prop: "mug", ms: 4200 },
      { anim: "idle" },
    ]);
    return;
  }

  if (rec.stage === 2) {
    // Formal: the union rep arrives with credentials (tie or badge), or a BOO.
    const arrive =
      roll < 0.4 ? { anim: "excited", line: "quitNag2", secs: 6, prop: "tie", ms: 5000 }
      : roll < 0.7 ? { anim: "boo", line: "quitNag2", secs: 6, ms: 5000 }
      : { anim: "excited", line: "quitNag2", secs: 6, prop: "badge", ms: 5000 };
    runAct([
      { anim: "scheming", line: "quitNag2warn", secs: 3, ms: 2400 },
      can("cursor")
        ? { anim: "walk", approach: { speed: 240, dx: side * 0.75, dy: 0 }, until: "arrived" }
        : { anim: "walk", ms: 800 },
      arrive,
      { anim: "idle" },
    ]);
    return;
  }

  // Drastic: mischief decides whether the cursor gets confiscated outright.
  if (can("cursor") && chance(buddy.traits.get("mischief"))) {
    runAct([
      { anim: "scheming", line: "quitNag3warn", secs: 3, ms: 2200 },
      { anim: "walk", approach: { speed: 300, dx: 0, dy: 24 }, until: "arrived" },
    ], () => {
      if (buddy.cursor.grab(6)) {
        state.busy = true;
        buddy.play("scheming");
        sayLine("quitNag3", 6);
        const s = buddy.screen();
        buddy.moveTo(s.x + s.w / 2, s.y + 60, 260);
        let landed = false;
        const land = () => {
          if (landed) return;
          landed = true;
          state.busy = state.evolving === true;
          buddy.play("idle");
        };
        buddy.once("arrived", land);
        // Drag or freeze can swallow "arrived" - never leave busy stuck.
        buddy.after(12000, land);
      } else {
        sayLine("quitNag3", 6);
        buddy.after(3000, () => buddy.play("idle"));
      }
    });
    return;
  }

  // No cursor (or feeling soft): the sit-in. Park nearby and refuse to leave.
  runAct([
    { anim: "scheming", line: "quitNag3warn", secs: 3, ms: 2200 },
    can("cursor")
      ? { anim: "walk", approach: { speed: 220, dx: side * 0.6, dy: 0 }, until: "arrived" }
      : { anim: "walk", ms: 800 },
    { anim: "excited", line: "quitNag3", secs: 6, prop: "heart", ms: 5000 },
    { anim: "idle" },
  ]);
};

registerAct("quittingTime", {
  minGap: 18 * 60 * 1000,
  weight: () => {
    const d = new Date();
    const h = d.getHours() + d.getMinutes() / 60;
    if (h < cfg("quitNagStart", 16.75) || h > cfg("quitNagEnd", 19.5)) return 0;
    return 1.2 * buddy.traits.get("clinginess") + 0.4 * buddy.traits.get("chattiness");
  },
  run: playQuittingTime,
});

// Victory lap: the human actually stopped after being nagged today. Once per day.
buddy.on("idle", () => {
  const rec = quitRec();
  if (!rec.stage || rec.cheered) return;
  const h = new Date().getHours();
  if (h < cfg("workdayEnd", 17) || h > cfg("nightEnd", 22)) return;
  rec.cheered = true;
  buddy.memory.set("quitNag", rec);
  buddy.after(4000, () => sayLine("quitDone", 6, chance(0.5) ? "heart" : null));
});
