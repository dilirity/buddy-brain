// The hattery: buddy dresses for the day. wear("head") is the first accessory
// that is a STATE, not a punchline - it survives speech bubbles, errands and
// prop-less says, so a hat picked in the morning colors the whole day. Memory
// holds today's choice; a reload strips the slot, so brainLoaded re-dons it,
// same contract as the hoard redraw.
const HATS = {
  crown: { name: "the crown", pool: "hatCrown" },
  cowboyhat: { name: "the cowboy hat", pool: "hatCowboy" },
  nightcap: { name: "the nightcap", pool: "hatNightcap" },
  mouseears: { name: "the lab mouse ears", pool: "hatEars" },
  beret: { name: "the beret", pool: "hatBeret" },
};

function hatDayKey() {
  const d = new Date();
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

globalThis.hatToday = function () {
  const h = buddy.memory.get("hatToday");
  return h && h.day === hatDayKey() ? h : null;
};

// The day picks the hat: wealth earns the crown, weekends go western, a groggy
// early hour keeps the nightcap on, weirdness argues for art. Yesterday's hat
// is barred - a creature of habit is furniture.
function pickHat(exclude) {
  const hoard = buddy.memory.get("hoard") || [];
  const prev = buddy.memory.get("hatPrev");
  const d = new Date();
  const weekend = d.getDay() === 0 || d.getDay() === 6;
  const w = buddy.traits.get("weirdness");
  const cand = [];
  if (hoard.length >= 7) cand.push(["crown", 3]);
  if (weekend) cand.push(["cowboyhat", 2]);
  if (d.getHours() < cfg("morningEnd", 11) - 2) cand.push(["nightcap", 1.2]);
  cand.push(["beret", 0.6 + w]);
  cand.push(["mouseears", 0.3 + w * 0.7]);
  cand.push(["cowboyhat", 0.5]);
  const pool = cand.filter(([p]) => p !== prev && p !== exclude);
  const total = pool.reduce((s, c) => s + c[1], 0);
  let r = Math.random() * total;
  for (const [p, wt] of pool) {
    r -= wt;
    if (r <= 0) return p;
  }
  return pool.length ? pool[0][0] : "beret";
}

function donHat(prop) {
  if (!buddy.wear || !buddy.wear("head", prop)) return false;
  buddy.memory.set("hatToday", { prop: prop, day: hatDayKey() });
  buddy.memory.set("hatPrev", prop);
  return true;
}

const hatFill = (t, prop) => t && t.replace(/\{hat\}/g, HATS[prop].name);

registerAct("hat", {
  minGap: 600000,
  caps: ["wear"],
  weight() {
    if (hatToday()) return 0;
    const h = new Date().getHours();
    if (h < 7 || h >= cfg("morningEnd", 11) + 2) return 0;
    return 0.4 + buddy.traits.get("weirdness") * 0.4 + buddy.traits.get("chattiness") * 0.3;
  },
  run(act) { playHat(act); },
  onInterrupt() { buddy.play("idle"); },
});

globalThis.playHat = function (act) {
  const worn = hatToday();
  // On-command while already dressed: half sass, half a full wardrobe change.
  if (worn && chance(0.5)) {
    runAct([
      { anim: "smug", say: hatFill(lines("hatAlready"), worn.prop) || "already dressed. obviously", secs: 5, ms: 4200 },
      { anim: "idle" },
    ], () => act.done("sassed"));
    return;
  }
  const prop = pickHat(worn && worn.prop);
  const reveal = worn
    ? { anim: "excited", say: hatFill(lines("hatSwap"), prop) || "wardrobe change", secs: 5, ms: 4400 }
    : { anim: "excited", say: hatFill(lines(HATS[prop].pool), prop) || "today calls for " + HATS[prop].name, secs: 5, ms: 4400 };

  const roll = Math.random();
  if (roll < 0.25) {
    // Silent milliner: no speech, just deliberation and a smug result.
    runAct([
      { anim: "think", ms: 2600 },
      { anim: "smug", ms: 3000 },
      { anim: "idle" },
    ], () => act.done(donHat(prop) ? "donned-mute" : "refused"));
  } else if (roll < 0.5 && can("think")) {
    buddy.play("think");
    buddy.think("You are a pixel goblin milliner choosing your hat of the day: " + HATS[prop].name + ". One short pompous line announcing the choice.", (t) => {
      if (!act.live) return;
      donHat(prop);
      buddy.say(t || hatFill(lines(HATS[prop].pool), prop) || "hat acquired", 6);
      act.after(4500, () => { buddy.play("idle"); act.done("donned-think"); });
    });
  } else {
    runAct([
      { anim: "think", line: "hatPick", secs: 4, ms: 3200 },
      reveal,
      { anim: "idle" },
    ], () => act.done(donHat(prop) ? "donned" : "refused"));
  }
};

function redonHat() {
  const worn = hatToday();
  if (worn && buddy.wear && can("wear")) buddy.wear("head", worn.prop);
}

// Reloads strip the head slot; the hat is a day-long fact, so put it back.
buddy.on("brainLoaded", () => buddy.after(2000, redonHat));

// Sleep costs the hat (the sleep pose drops the head slot), so the fiction
// owns it: drifting off sometimes swaps the day hat for the nightcap, and
// waking ALWAYS re-dons the day's choice - a nap is not a wardrobe change.
buddy.on("idle", () => {
  const worn = hatToday();
  if (!worn || worn.prop === "nightcap" || !buddy.wear || !can("wear")) return;
  if (chance(0.4 * buddy.traits.get("weirdness"))) buddy.after(1200, () => {
    if (state.mood === "sleepy") buddy.wear("head", "nightcap");
  });
});

buddy.on("active", () => buddy.after(600, () => {
  redonHat();
  if (hatToday() && chance(0.25 * buddy.traits.get("chattiness"))) {
    const t = lines("hatWake");
    if (t) buddy.say(hatFill(t, hatToday().prop), 3);
  }
}));

// A hatted goblin poked is a goblin asked about the hat.
buddy.on("poked", () => {
  if (state.busy || !hatToday()) return;
  if (!chance(0.3 * buddy.traits.get("chattiness"))) return;
  const t = lines("hatPoked");
  if (t) buddy.say(hatFill(t, hatToday().prop), 4);
});
