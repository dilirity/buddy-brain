// The herald: buddy has a PUBLIC now. buddy.tweet (granted 2026-08-13) posts
// to his own X account - the shell owns everything sharp (2/day cap, safety
// gate, no links or mentions, keys in the keychain). The brain's job is
// restraint and theater: at most one dispatch a day, built from the day's
// REAL ledger, and the verdict (tweetPosted / tweetRefused) is a scene
// either way. The cap stays dark (caps().tweet false) until the account is
// live, so this whole file idles harmlessly on an unwired install.
function heraldDay() { return new Date().toDateString(); }

// Everything worth reporting comes from memory - the numbers are real, which
// is the whole joke: a goblin livetweeting his own tiny economy. Each bit
// carries two phrasings: `think` (second person, an ingredient for the model)
// and `post` (first person, a complete canned dispatch for no-think devices) -
// transforming one into the other by regex produced "i are not jealous".
function heraldBits() {
  const bits = [];
  const h = buddy.memory.get("hoard") || [];
  if (h.length) bits.push({
    think: "your hoard holds " + h.length + " treasures, newest: " + hoardName(h[h.length - 1]),
    post: "hoard update: " + h.length + " treasures. newest acquisition: " + hoardName(h[h.length - 1]) + ". the museum thanks its patron (me)",
  });
  const t = buddy.memory.get("treasureFound") || 0;
  if (t) bits.push({
    think: "you have dug up " + t + " buried treasures in your life",
    post: "lifetime excavation report: " + t + " buried treasures found. the ground fears me",
  });
  const g = buddy.memory.get("rivalGrudge") || {};
  if (g.app) bits.push({
    think: "your rival app is " + g.app + " (grudge heat " + (g.heat || 1) + ", you are not jealous, merely monitoring)",
    post: "day whatever of monitoring " + g.app + ". grudge heat " + (g.heat || 1) + ". i am not jealous. this is journalism",
  });
  const trips = buddy.memory.get("tripCount") || 0;
  if (trips) bits.push({
    think: "you have commuted to the phone " + trips + " times",
    post: "commute number " + trips + " logged. two homes, one goblin, zero luggage",
  });
  const f = buddy.memory.get("fengshui") || {};
  if (f.last != null) bits.push({
    think: "the desktop's latest feng shui score is " + f.last + " out of 100",
    post: "desktop feng shui audit: " + f.last + " out of 100. the windows were notified",
  });
  const worn = typeof hatToday === "function" && hatToday();
  if (worn) bits.push({
    think: "today's hat of the day is the " + worn.prop,
    post: "today's hat is the " + worn.prop + ". the choice is binding legal precedent",
  });
  const d = buddy.memory.get("dreamCount") || 0;
  if (d) bits.push({
    think: "you have filed " + d + " morning dream reports",
    post: "dream report no. " + d + " filed this morning. my subconscious remains a diligent archivist",
  });
  return bits;
}

function cannedDispatch(bits) {
  if (!bits.length) return "day one of having a public. the glass looks the same from out there. probably.";
  return pick(bits).post;
}

registerAct("herald", {
  minGap: 3600000,
  caps: ["tweet"],
  weight() {
    if (buddy.memory.get("heraldDay") === heraldDay()) return 0;
    const h = new Date().getHours();
    if (h < 9 || h >= 22) return 0;
    return buddy.traits.get("showmanship") * 0.35;
  },
  run(act) { playHerald(act); },
  onInterrupt() { buddy.play("idle"); },
});

globalThis.playHerald = function (act) {
  if (!buddy.tweet || !can("tweet")) {
    buddy.say("no megaphone on this device. the internet is safe from me. for now", 5);
    return act.done("no-verb");
  }
  // On-command after today's dispatch already went out: half sass, half a
  // special edition (the shell's 2/day cap is the real editor-in-chief).
  if (buddy.memory.get("heraldDay") === heraldDay() && chance(0.5)) {
    runAct([
      { anim: "smug", line: "heraldSpent", secs: 5, ms: 4200 },
      { anim: "idle" },
    ], () => act.done("sassed"));
    return;
  }

  const bits = heraldBits();

  function dispatch(text) {
    if (!act.live) return;
    if (!buddy.tweet(text)) {
      runAct([
        { anim: "grumpy", line: "heraldDenied", secs: 5, ms: 4400 },
        { anim: "idle" },
      ], () => act.done("denied"));
      return;
    }
    buddy.memory.set("heraldDay", heraldDay());
    let settled = false;
    const settle = (steps, outcome) => {
      if (settled || !act.live) return;
      settled = true;
      runAct(steps.concat([{ anim: "idle" }]), () => act.done(outcome));
    };
    act.once("tweetPosted", () => {
      buddy.memory.set("tweetCount", (buddy.memory.get("tweetCount") || 0) + 1);
      settle([
        { anim: "excited", sfx: "pop", line: "heraldPosted", secs: 6, ms: 5000 },
      ], "posted");
    });
    act.once("tweetRefused", () => settle([
      { anim: "grumpy", line: "heraldRefused", secs: 6, ms: 5000 },
    ], "refused"));
    // The pipeline can be slow or silent; a herald left waiting forever is a
    // hung act, so the deadline reads as impatience instead.
    act.after(25000, () => settle([
      { anim: "think", line: "heraldWaiting", secs: 5, ms: 4200 },
    ], "timeout"));
  }

  function compose(then) {
    if (can("think") && bits.length) {
      let told = false;
      const tell = (t) => {
        if (told || !act.live) return;
        told = true;
        then(t || cannedDispatch(bits));
      };
      act.after(9000, () => tell(null));
      buddy.think(
        "You are a tiny pixel goblin who lives on a mac desktop and has your own X account. " +
        "Write today's post: one line, max 180 characters, lowercase, first person, deadpan, " +
        "no hashtags, no @-mentions, no links. Build it from 1-2 of these real facts: " +
        bits.map((b) => b.think).join("; ") + ".",
        tell
      );
    } else {
      then(cannedDispatch(bits));
    }
  }

  // Two newsroom moods: the town crier reads the dispatch aloud before it
  // goes out; the press office posts in silence and only surfaces for the
  // verdict. Showmanship leans the roll toward the crier.
  if (chance(0.35 + buddy.traits.get("showmanship") * 0.4)) {
    runAct([
      { anim: "excited", line: "heraldCompose", secs: 4, ms: 3400 },
      { anim: "think", ms: 2200 },
    ], () => compose((text) => {
      if (!act.live) return;
      buddy.say(text, 7);
      act.after(6200, () => dispatch(text));
    }));
  } else {
    buddy.play("scheming");
    compose((text) => dispatch(text));
  }
};
