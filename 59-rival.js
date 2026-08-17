// The rival: buddy is jealous of whichever app hoards the human's attention
// all day. Rides the critic's tally (57-critic) so day math and counting live
// in one place. The grudge is an inner stat, not a slider: {app, heat} in
// memory - heat climbs while the same app keeps the crown, resets when a new
// thief takes over - and 75-chat feeds it into conversation so buddy can
// complain about the rival by name.
function rivalTop() {
  const tally = buddy.memory.get("appTally:" + criticDay()) || {};
  const names = Object.keys(tally);
  const top = names.sort((a, b) => tally[b] - tally[a])[0];
  return top && tally[top] >= 6 ? top : null;
}

registerAct("rival", {
  minGap: 1500000,
  weight: () => (rivalTop() ? buddy.traits.get("clinginess") * 0.5 : 0),
  run(act) {
    const app = rivalTop();
    if (!app) {
      // Summoned by hand before any app earned the title.
      buddy.play("grumpy");
      buddy.say("no app has earned my jealousy yet today. keep clicking.", 4);
      act.after(2600, () => { buddy.play("idle"); act.done("no-rival"); });
      return;
    }
    const g = buddy.memory.get("rivalGrudge") || { app: null, heat: 0 };
    const heat = g.app === app ? Math.min(5, g.heat + 1) : 1;
    buddy.memory.set("rivalGrudge", { app: app, heat: heat });
    const say = (key, fb) => (lines(key) || fb).replace(/\{app\}/g, app).replace(/\{n\}/g, String(heat));
    const win = can("windows") ? (buddy.windows() || []).find((w) => w.app === app) : null;
    const s = buddy.screen();
    const tx = win ? Math.max(s.x + 40, Math.min(s.x + s.w - 60, win.x + win.w / 2)) : 0;
    const roll = Math.random();

    // A standing grudge is its own show: name the number to the human's face.
    if (heat >= 3 && chance(0.3 + buddy.traits.get("chattiness") * 0.5)) {
      runAct([
        { anim: "grumpy", say: say("rivalEscalate", "day {n} of the {app} situation."), secs: 5, ms: 4000 },
        { anim: "idle" },
      ], () => act.done("escalated"));
      return;
    }
    if (win && roll < 0.35) {
      // March up to the thief's window and glare at it in person.
      runAct([
        { anim: "walk", moveTo: { x: tx, y: Math.max(s.y + 40, Math.min(s.y + s.h - 200, win.y + 20)), speed: 200 }, until: "arrived" },
        { anim: "grumpy", say: say("rivalGlare", "so YOU are {app}. we meet at last."), secs: 5, ms: 4200 },
        { anim: "idle" },
      ], () => act.done("glared"));
      return;
    }
    if (win && can("layer") && roll < 0.6 && chance(0.3 + buddy.traits.get("mischief") * 0.6)) {
      // Slip behind the rival's window to "gather intelligence", resurface smug.
      runAct([
        { anim: "walk", moveTo: { x: tx, y: Math.max(s.y + 40, win.y + 30), speed: 220 }, until: "arrived" },
        { layer: "behind", anim: "scheming", ms: 3200 },
        { layer: "front", anim: "smug", say: say("rivalSpy", "i have been BEHIND {app}. i know things now."), secs: 5, ms: 4200 },
        { anim: "idle" },
      ], () => act.done("spied"));
      return;
    }
    if (chance(0.55)) {
      runAct([
        { anim: "grumpy", say: say("rivalMono", "{app} again. i am RIGHT HERE."), secs: 5, prop: chance(0.4 * buddy.traits.get("clinginess")) ? "heart" : null, ms: 4200 },
        { anim: "idle" },
      ], () => act.done("sulked"));
    } else {
      runAct([
        { anim: "smug", say: say("rivalDismiss", "{app}? i am not jealous. i am MONITORING."), secs: 5, ms: 4000 },
        { anim: "idle" },
      ], () => act.done("dismissed"));
    }
  },
  onInterrupt: () => {
    buddy.stop();
    if (can("layer")) buddy.layer("front");
  },
});
