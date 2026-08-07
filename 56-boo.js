// Ghost ambush: fade to a shimmer, drift up next to the cursor, lurk just
// long enough to be forgotten, then snap solid with a BOO. If the cursor
// wandered off mid-lurk, the ambush WHIFFS - a scare needs an audience.
globalThis.playBoo = function () {
  if (!can("cursor")) { buddy.say("nobody to ambush here. spooky in a sad way", 4); return; }
  const s = buddy.screen();
  const c = buddy.cursor.pos();
  const x = Math.min(Math.max(c.x + (chance(0.5) ? -170 : 90), s.x + 10), s.x + s.w - 140);
  const y = Math.min(Math.max(c.y - 130, s.y + 10), s.y + s.h - 220);
  const roll = Math.random();
  const pop =
    roll < 0.45 ? { anim: "boo", opacity: 1, line: "boo", secs: 2, ms: 2000 }
    : roll < 0.8 ? { anim: "boo", opacity: 1, say: "BOO!!", secs: 2, ms: 2000 }
    : { anim: "boo", opacity: 1, line: "boo", secs: 2, prop: "heart", ms: 2000 };
  // Gloating is talk - it answers to the chattiness slider, not a coin.
  const gloat = chance(0.3 + buddy.traits.get("chattiness") * 0.5)
    ? { anim: chance(0.5) ? "smug" : "excited", line: "booAfter", secs: 3, ms: 2400 }
    : { ms: 300 };
  runAct([
    { anim: "scheming", opacity: 0.15, ms: 800 },
    { anim: "walk", approach: { speed: 300, dx: x - c.x, dy: y - c.y }, until: "arrived" },
    { anim: "hide", ms: 600 + Math.random() * 1500 },
  ], () => {
    const here = buddy.pos();
    const now = buddy.cursor.pos();
    const gone = Math.hypot(now.x - here.x, now.y - here.y) > 380;
    runAct(gone
      ? [
          { anim: "boo", opacity: 1, ms: 1200 },
          { anim: "grumpy", line: "booWhiff", secs: 4, ms: 3200 },
          { anim: "idle" },
        ]
      : [pop, gloat, { anim: "idle" }],
      () => buddy.opacity(1));
  });
};

registerAct("boo", {
  minGap: 420000,
  caps: ["cursor"],
  weight: () => buddy.traits.get("mischief") * 0.45,
  run(act) {
    if (!can("cursor")) return act.done("no cursor");
    playBoo();
  },
});
