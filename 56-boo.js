// Ghost ambush: fade to a shimmer, drift up next to the cursor, lurk just
// long enough to be forgotten, then snap solid with a BOO. Outcomes vary:
// a cursor that wandered off mid-lurk WHIFFS the scare, a cursor that crept
// right up to the shimmer BACKFIRES it (the hunter, hunted), and a timid
// roll loses its nerve mid-lurk and confesses instead.
globalThis.playBoo = function () {
  if (!can("cursor")) { buddy.say("nobody to ambush here. spooky in a sad way", 4); return; }
  const s = buddy.screen();
  const c = buddy.cursor.pos();
  const x = Math.min(Math.max(c.x + (chance(0.5) ? -170 : 90), s.x + 10), s.x + s.w - 140);
  const y = Math.min(Math.max(c.y - 130, s.y + 10), s.y + s.h - 220);
  const roll = Math.random();
  const pop =
    roll < 0.45 ? { anim: "boo", opacity: 1, sfx: "pop", line: "boo", secs: 2, ms: 2000 }
    : roll < 0.8 ? { anim: "boo", opacity: 1, sfx: "pop", say: "BOO!!", secs: 2, ms: 2000 }
    : { anim: "boo", opacity: 1, sfx: "pop", line: "boo", secs: 2, prop: "heart", ms: 2000 };
  // Gloating is talk - it answers to the chattiness slider, not a coin.
  const gloat = chance(0.3 + buddy.traits.get("chattiness") * 0.5)
    ? { anim: chance(0.5) ? "smug" : "excited", line: "booAfter", secs: 3, ms: 2400 }
    : { ms: 300 };
  // Cold feet scale with the mischief slider's ABSENCE - a gentled buddy
  // sometimes cannot go through with the scare. Rolled up front so the lurk
  // itself plays identically and gives nothing away.
  const chicken = chance((1 - buddy.traits.get("mischief")) * 0.3);
  runAct([
    { anim: "scheming", opacity: 0.15, ms: 800 },
    { anim: "walk", approach: { speed: 300, dx: x - c.x, dy: y - c.y }, until: "arrived" },
    { anim: "hide", ms: 600 + Math.random() * 1500 },
  ], () => {
    const here = buddy.pos();
    const now = buddy.cursor.pos();
    const dist = Math.hypot(now.x - here.x, now.y - here.y);
    let finale;
    if (dist > 380) {
      finale = [
        { anim: "boo", opacity: 1, ms: 1200 },
        { anim: "grumpy", line: "booWhiff", secs: 4, ms: 3200 },
        { anim: "idle" },
      ];
    } else if (dist < 110) {
      // The cursor snuck up on the shimmer: the ambusher gets ambushed.
      finale = [
        { anim: "boo", opacity: 1, say: "AAH!!", secs: 2, ms: 1400 },
        { anim: "grumpy", line: "booBackfire", secs: 4, ms: 3400 },
        { anim: "idle" },
      ];
    } else if (chicken) {
      finale = [
        { anim: "think", opacity: 1, ms: 1000 },
        { anim: "idle", line: "booChicken", secs: 4, ms: 3400 },
      ];
    } else {
      finale = [pop, gloat, { anim: "idle" }];
    }
    runAct(finale, () => buddy.opacity(1));
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
