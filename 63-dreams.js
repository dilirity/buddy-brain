// Dream journal: buddy sleeps too, and in the morning he files a report.
// Dreams are woven from YESTERDAY'S REAL MEMORIES - the rival app, the feng
// shui score, the treasure ledger, the commute - because a subconscious this
// small has no choice but to recycle. Self-initiated once per day, mornings
// only; the test menu can demand a rerun anytime and buddy will simply claim
// he napped.
function dreamIngredients() {
  const bits = [];
  const g = buddy.memory.get("rivalGrudge") || {};
  if (g.app) bits.push("your rival app " + g.app + " (grudge heat " + (g.heat || 1) + ")");
  const f = buddy.memory.get("fengshui") || {};
  if (f.last != null) bits.push("the desktop's last feng shui score of " + f.last);
  const t = buddy.memory.get("treasureFound") || 0;
  if (t) bits.push("the " + t + " treasures you have dug up in your life");
  const trips = buddy.memory.get("tripCount") || 0;
  if (trips) bits.push("your " + trips + " commutes to the phone");
  return bits;
}

registerAct("dream", {
  minGap: 600000,
  weight: () => {
    if (buddy.memory.get("lastDreamDay") === new Date().toDateString()) return 0;
    const d = new Date();
    const h = d.getHours() + d.getMinutes() / 60;
    if (h < 5 || h >= cfg("morningEnd", 11)) return 0;
    return buddy.traits.get("weirdness") * 0.4 + buddy.traits.get("chattiness") * 0.2;
  },
  run(act) {
    buddy.memory.set("lastDreamDay", new Date().toDateString());
    buddy.memory.set("dreamCount", (buddy.memory.get("dreamCount") || 0) + 1);

    const g = buddy.memory.get("rivalGrudge") || {};
    const fillApp = (key) => (lines(key) || "i dreamed about {app}. it was too big.")
      .replace(/\{app\}/g, g.app || "some app");

    // Flavors: plain recall, a nightmare starring the rival, a smug prophecy,
    // or losing the dream mid-sentence. Weirdness feeds the weird end,
    // mischief the prophecy racket.
    const w = buddy.traits.get("weirdness");
    const flavors = [["recall", 1]];
    if (g.app) flavors.push(["nightmare", 0.5 + w * 0.4]);
    flavors.push(["prophecy", 0.3 + buddy.traits.get("mischief") * 0.5]);
    flavors.push(["forgot", 0.35 + w * 0.3]);
    let r = Math.random() * flavors.reduce((s, f) => s + f[1], 0);
    let flavor = "recall";
    for (const [name, wt] of flavors) { r -= wt; if (r <= 0) { flavor = name; break; } }

    // Openings vary: caught mid-nap in the nightcap and snorts awake, or
    // already up and the dream suddenly loads back in.
    const opening = chance(0.55)
      ? [{ anim: "sleep", prop: "nightcap", ms: 2600 }, { anim: "excited", line: "dreamWake", secs: 4, prop: "nightcap", ms: 3600 }]
      : [{ anim: "think", line: "dreamRemember", secs: 4, ms: 3600 }];

    function finishWith(steps, outcome) {
      runAct(opening.concat(steps, [{ anim: "idle" }]), () => act.done(outcome));
    }

    if (flavor === "forgot") {
      finishWith([
        { anim: "think", line: "dreamForgot", secs: 5, ms: 4400 },
        { anim: "grumpy", line: "dreamAfter", secs: 4, ms: 3600 },
      ], "forgot");
    } else if (flavor === "nightmare") {
      finishWith([
        { anim: "grumpy", say: fillApp("dreamNightmare"), secs: 6, ms: 5200 },
        { line: "dreamAfter", secs: 4, ms: 3600 },
      ], "nightmare");
    } else if (flavor === "prophecy") {
      finishWith([
        { anim: "smug", say: fillApp("dreamProphecy"), secs: 6, ms: 5200 },
      ], "prophecy");
    } else {
      // Recall: think() weaves yesterday's numbers in (ambient lane on
      // purpose, never thinkNow); no-think devices get a canned dream. If the
      // think never answers, the canned dream steps in so the act cannot hang.
      const bits = dreamIngredients();
      const canned = () => lines("dreamTell") || "i dreamed. it was excellent. next question.";
      if (can("think") && bits.length) {
        let told = false;
        const tell = (t) => {
          if (told || !act.live) return;
          told = true;
          finishWith([
            { anim: "excited", say: t || canned(), secs: 7, ms: 5800 },
            { line: "dreamAfter", secs: 4, ms: 3600 },
          ], "recall-thought");
        };
        act.after(9000, () => tell(null));
        buddy.think(
          "Report last night's dream in one surreal first-person line, max 14 words, lowercase. Build it from these real ingredients (pick 1-2): " + bits.join("; ") + ".",
          tell
        );
      } else {
        finishWith([
          { anim: "excited", say: canned(), secs: 7, ms: 5800 },
          { line: "dreamAfter", secs: 4, ms: 3600 },
        ], "recall-canned");
      }
    }
  },
  onInterrupt: () => buddy.stop(),
});
