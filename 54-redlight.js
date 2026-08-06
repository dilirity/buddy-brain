// Red light green light: buddy naps (green - sneak the cursor closer) and
// snaps awake (red - FREEZE). Movement during red is a strike, three strikes
// and buddy wins; touching buddy wins the game for the human. Interactive,
// so the body is imperative like the treasure hunt - runAct would close the
// act mid-game.
registerAct("redlight", {
  minGap: 900000,
  caps: ["cursor"],
  weight: () => (buddy.traits.get("mischief") * 0.5 + buddy.traits.get("energy") * 0.5) * 0.45,
  run: (act) => playRedlight(act),
  onInterrupt: () => {
    buddy.play("idle");
    buddy.say("game abandoned. the statue committee will hear about this", 4);
  },
});

globalThis.playRedlight = function (act) {
  const WIN = 90;
  // Real hands tremble; only clear movement counts as a strike.
  const JITTER = 18;
  let phase = "open";
  let strikes = 0;
  let redAnchor = null;

  function look() {
    buddy.play(typeof gazeDir === "function" ? gazeDir() : "lookdown");
  }

  function green() {
    if (phase === "end") return;
    phase = "green";
    buddy.play("sleep");
    if (chance(0.4 * buddy.traits.get("chattiness"))) sayLine("redlightGreen", 2);
    act.after(1800 + Math.random() * 2200, red);
  }

  function red() {
    if (phase !== "green") return;
    phase = "red";
    redAnchor = buddy.cursor.pos();
    look();
    // The anim is the true signal; the call-out is flavor, not required.
    if (chance(0.7)) sayLine("redlightRed", 1);
    act.after(1400 + Math.random() * 1400, () => { if (phase === "red") green(); });
  }

  function strike() {
    phase = "callout";
    strikes++;
    buddy.play(strikes >= 3 ? "smug" : "grumpy");
    if (strikes >= 3) return finish("busted");
    sayLine("redlightCaught", 3);
    // Mischief taxes a strike: the cursor gets shoved back the way it came.
    if (strikes === 2 && chance(0.5 * buddy.traits.get("mischief"))) {
      const p = buddy.pos();
      const c = buddy.cursor.pos();
      const d = Math.hypot(c.x - p.x, c.y - p.y) || 1;
      buddy.cursor.warp(c.x + ((c.x - p.x) / d) * 160, c.y + ((c.y - p.y) / d) * 160);
    }
    act.after(2200, green);
  }

  function finish(outcome) {
    if (phase === "end") return;
    phase = "end";
    const key = outcome === "won" ? "redlightSneaks" : "redlightBusts";
    const n = (buddy.memory.get(key) || 0) + 1;
    buddy.memory.set(key, n);
    if (outcome === "won") {
      buddy.play("excited");
      sayLine("redlightWin", 4);
      act.after(4200, () => {
        if (chance(0.4)) buddy.say("sneak record: " + n + " successful approach" + (n === 1 ? "" : "es") + ". i am raising a spy", 4);
        act.after(1600, () => { buddy.play("idle"); act.done("won"); });
      });
    } else {
      buddy.play(outcome === "busted" ? "smug" : "idle");
      sayLine(outcome === "busted" ? "redlightLose" : "redlightTimeout", 4);
      act.after(4200, () => { buddy.play("idle"); act.done(outcome); });
    }
  }

  function watch() {
    act.every(250, () => {
      if (phase !== "green" && phase !== "red") return;
      const c = buddy.cursor.pos();
      const p = buddy.pos();
      if (Math.hypot(c.x - p.x, c.y - p.y) < WIN) return finish("won");
      if (phase === "red" && Math.hypot(c.x - redAnchor.x, c.y - redAnchor.y) > JITTER) strike();
    });
    act.after(90000, () => finish("timeout"));
    green();
  }

  // Buddy relocates away from the cursor first - a game that starts already
  // won is not a game. Then one of three openings (VARIETY RULE).
  const s = buddy.screen();
  const c0 = buddy.cursor.pos();
  const tx = c0.x < s.x + s.w / 2 ? s.x + s.w - 160 : s.x + 160;
  const ty = s.y + 140 + Math.random() * (s.h - 380);
  const style = pick(["drill", "nap", "veteran"]);

  function open() {
    // Both the arrived event and its stuck-safety fallback route here; the
    // phase flip keeps the second caller from starting a twin game.
    if (phase !== "open") return;
    phase = "opening";
    if (style === "drill") {
      buddy.play("excited");
      sayLine("redlightStart", 6);
      act.after(3200, watch);
    } else if (style === "nap") {
      buddy.play("sleep");
      buddy.say("i am going to nap RIGHT here. approach at your peril. statue rules", 5);
      act.after(3000, watch);
    } else {
      buddy.play("smug");
      const b = buddy.memory.get("redlightBusts") || 0;
      buddy.say(b > 0 ? "red light green light. busted you " + b + " time" + (b === 1 ? "" : "s") + " already. sneak better" : "red light green light. i have never once been snuck up on. ruin that", 6);
      act.after(3200, watch);
    }
  }

  if (Math.hypot(c0.x - buddy.pos().x, c0.y - buddy.pos().y) < 300) {
    buddy.play("walk");
    buddy.moveTo(tx, ty, 280);
    act.once("arrived", open);
    act.after(12000, () => { if (phase === "open") open(); });
  } else {
    open();
  }
};
