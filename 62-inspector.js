// Feng shui inspector: buddy reads windows() and JUDGES the layout. Born from
// the same sense as perching - a creature that knows where every window is
// eventually develops opinions about where they SHOULD be. Score lives in
// memory (best/worst records), so a lifetime of taste accumulates.
function fengshuiScore() {
  const s = buddy.screen();
  const wins = (buddy.windows ? buddy.windows() || [] : []).filter((w) => w.w > 60 && w.h > 60);
  if (!wins.length) return null;
  // Pairwise overlap is the sin: windows burying each other reads as clutter.
  let overlap = 0;
  for (let i = 0; i < wins.length; i++) {
    for (let j = i + 1; j < wins.length; j++) {
      const a = wins[i], b = wins[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 0 && oy > 0) overlap += ox * oy;
    }
  }
  const ratio = overlap / (s.w * s.h);
  let score = 100 - Math.max(0, wins.length - 3) * 8 - Math.round(ratio * 130);
  score = Math.max(5, Math.min(100, score));
  // The worst offender: the app hogging the most glass.
  const hog = wins.reduce((m, w) => (w.w * w.h > m.w * m.h ? w : m), wins[0]);
  return { score: score, count: wins.length, hog: hog.app };
}

registerAct("inspect", {
  minGap: 900000,
  caps: ["windows"],
  weight: () => buddy.traits.get("chattiness") * 0.25 + buddy.traits.get("weirdness") * 0.15,
  run(act) {
    const r = fengshuiScore();
    if (!r) {
      runAct([
        { anim: "lookleft", ms: 1200 },
        { anim: "lookright", ms: 1200 },
        { line: "inspectEmpty", secs: 5, ms: 4000 },
        { anim: "idle" },
      ], () => act.done("empty-desk"));
      return;
    }
    const fill = (key, fb) => (lines(key) || fb)
      .replace(/\{score\}/g, String(r.score))
      .replace(/\{app\}/g, r.hog);

    const rec = buddy.memory.get("fengshui") || { best: 0, worst: 101, inspections: 0 };

    // Openings vary: pompous monocle, silent prowl, or an announced audit.
    const openings = [
      [{ anim: "scheming", line: "inspectStart", secs: 4, prop: "monocle", ms: 3200 }],
      [{ anim: "walk", moveTo: { x: buddy.screen().x + buddy.screen().w * (0.25 + Math.random() * 0.5), y: buddy.screen().y + 40, speed: 220 }, until: "arrived" }, { anim: "scheming", ms: 900 }],
      [{ anim: "excited", line: "inspectStart", secs: 4, ms: 3000 }],
    ];
    const survey = [
      { anim: "lookleft", ms: 1300 },
      { anim: "lookup", ms: 1100 },
      { anim: "lookright", ms: 1300 },
    ];
    if (chance(0.5)) survey.splice(1, 0, { line: "inspectSurvey", secs: 3, ms: 2400 });

    let verdict, outcome;
    if (r.score >= 80) {
      verdict = [{ anim: "smug", say: fill("inspectGood", "feng shui score: {score}. the desktop breathes. i am moved."), secs: 6, ms: 4800 }];
      outcome = "harmonious";
    } else if (r.score >= 45) {
      verdict = [{ anim: "idle", say: fill("inspectMeh", "feng shui score: {score}. acceptable. barely."), secs: 6, ms: 4800 }];
      outcome = "acceptable";
    } else {
      verdict = [
        { anim: "grumpy", say: fill("inspectChaos", "feng shui score: {score}. this is not a desktop, it is a landslide. mostly {app}'s fault."), secs: 6, ms: 5000 },
      ];
      outcome = "condemned";
    }

    // Records are the long arc: an all-time best or worst gets its own ceremony.
    const coda = [];
    if (r.score > rec.best && rec.inspections > 0) {
      coda.push({ anim: "excited", say: fill("inspectRecord", "NEW RECORD. {score}. frame this desktop."), secs: 5, ms: 4200 });
    } else if (r.score < rec.worst && rec.inspections > 0) {
      coda.push({ anim: "grumpy", say: fill("inspectWorst", "a new all-time low. {score}. i must sit down."), secs: 5, ms: 4200 });
    }
    coda.push({ anim: "idle" });

    rec.best = Math.max(rec.best, r.score);
    rec.worst = Math.min(rec.worst, r.score);
    rec.last = r.score;
    rec.inspections++;
    buddy.memory.set("fengshui", rec);

    runAct(pick(openings).concat(survey, verdict, coda), () => act.done(outcome));
  },
  onInterrupt: () => buddy.stop(),
});
