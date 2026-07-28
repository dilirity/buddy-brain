// The critic: buddy keeps score of which apps Pete lives in all day, then
// stages an evening award ceremony for the winner. Yesterday's champion is
// remembered across days - dethronings get called out.
function criticDay() {
  const d = new Date();
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

buddy.on("appChanged", (e) => {
  if (!e || !e.name) return;
  const key = "appTally:" + criticDay();
  const tally = buddy.memory.get(key) || {};
  tally[e.name] = (tally[e.name] || 0) + 1;
  buddy.memory.set(key, tally);
});

globalThis.playCritic = function (force) {
  const tally = buddy.memory.get("appTally:" + criticDay()) || {};
  const names = Object.keys(tally);
  const total = names.reduce((n, k) => n + tally[k], 0);
  // A ceremony over 4 data points is sad for everyone involved.
  if (!force && (names.length < 2 || total < 12)) return false;
  const winner = names.sort((a, b) => tally[b] - tally[a])[0];
  if (!winner) {
    if (force) buddy.say("no scores yet. go click on some apps", 4);
    return false;
  }
  const prev = buddy.memory.get("criticPrevWinner");

  const openings = [
    { anim: "excited", line: "criticOpen", secs: 4, ms: 3000 },
    { anim: "scheming", say: "i have been keeping score all day.", secs: 3, ms: 2600 },
    { anim: "excited", ms: 1200 },
  ];
  const verdictText = (lines("criticVerdict") || "todays most used app: {app}. {n} visits.")
    .replace("{app}", winner)
    .replace("{n}", String(tally[winner]));
  const verdict = chance(0.6)
    ? { anim: "excited", say: verdictText, secs: 6, prop: "glasses", ms: 4200 }
    : { anim: "excited", say: verdictText, secs: 6, ms: 4200 };

  const steps = [pick(openings), verdict];
  if (prev && prev !== winner && chance(0.7)) {
    const dig = (lines("criticDethroned") || "{app} has fallen. tragic.").replace("{app}", prev);
    steps.push({ anim: "scheming", say: dig, secs: 4, ms: 3000 });
  }
  steps.push({ anim: "idle" });

  runAct(steps, () => {
    buddy.memory.set("criticPrevWinner", winner);
    // Sometimes the critic has a hot take. Generative, so never the same one.
    if (chance(buddy.traits.get("weirdness") * 0.5)) {
      buddy.think("Pete's most used app today was " + winner + ". One short snobby art-critic style review of it.", (t) => {
        if (t) buddy.say(t, 5, "glasses");
      });
    }
  });
  buddy.memory.set("criticLastShow", criticDay());
  return true;
};

// The ceremony is an evening thing - once a day, after 4pm, when there's data.
buddy.every(180000, () => {
  if (buddy.isHeld() || buddy.isFrozen() || state.mood === "sleepy") return;
  if (buddy.isMoving() || state.busy) return;
  if (buddy.memory.get("criticLastShow") === criticDay()) return;
  if (new Date().getHours() < 16) return;
  if (!chance(buddy.traits.get("chattiness") * 0.35)) return;
  playCritic();
});
