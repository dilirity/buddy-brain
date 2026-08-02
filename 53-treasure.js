// Treasure hunt: buddy hides loot at a secret point on screen, the human
// hunts it with the cursor while buddy calls warmer/colder from the live
// distance. Interactive game, so the body is imperative - runAct's chain-end
// would close the act mid-hunt.
registerAct("treasure", {
  minGap: 900000,
  caps: ["cursor"],
  weight: () => (buddy.traits.get("energy") * 0.4 + buddy.traits.get("mischief") * 0.6) * 0.5,
  run: (act) => playTreasure(act),
  onInterrupt: () => {
    buddy.stop();
    buddy.opacity(1);
    buddy.say("fine. the treasure stays buried FOREVER", 4);
  },
});

globalThis.playTreasure = function (act) {
  const s = buddy.screen();
  const spot = {
    x: s.x + 80 + Math.random() * (s.w - 160),
    y: s.y + 80 + Math.random() * (s.h - 260),
  };
  const loot = pick(["heart", "mug", "companioncube", "jawbreaker", "martini", "badge"]);
  let lied = false;
  let lastDist = null;
  let lastCall = 0;
  let phase = "open";

  function hint(d) {
    const closer = lastDist !== null && d < lastDist - 14;
    const further = lastDist !== null && d > lastDist + 14;
    let key = d < 160 ? "treasureHot" : closer ? "treasureWarm" : further ? "treasureCold" : null;
    if (!key) return;
    // One lie per hunt, mischief's call. The confession ships with the win.
    if (!lied && key !== "treasureHot" && chance(0.25 * buddy.traits.get("mischief"))) {
      lied = true;
      key = key === "treasureWarm" ? "treasureCold" : "treasureWarm";
    }
    sayLine(key, 2);
  }

  function begin() {
    if (phase !== "open") return;
    phase = "hunt";
    sayLine("treasureStart", 5);
    act.every(800, () => {
      if (phase !== "hunt") return;
      const c = buddy.cursor.pos();
      const d = Math.hypot(c.x - spot.x, c.y - spot.y);
      if (d < 70) return finishHunt(true);
      const now = Date.now();
      if (now - lastCall > 2600 + Math.random() * 1400) {
        lastCall = now;
        hint(d);
      }
      lastDist = d;
    });
    act.after(75000, () => finishHunt(false));
  }

  function finishHunt(found) {
    if (phase !== "hunt") return;
    phase = "dig";
    // Lifetime scoreboard lives in memory so chat can brag about it.
    const key = found ? "treasureFound" : "treasureLost";
    const n = (buddy.memory.get(key) || 0) + 1;
    buddy.memory.set(key, n);
    buddy.play("walk");
    buddy.moveTo(spot.x, spot.y, found ? 300 : 220);
    act.once("arrived", () => {
      if (found) {
        buddy.play("excited");
        sayLine("treasureFound", 4, loot);
        act.after(4200, () => {
          if (lied && chance(0.7)) sayLine("treasureLie", 4);
          else if (chance(0.4)) buddy.say(n + " treasure" + (n === 1 ? "" : "s") + " sniffed out lifetime. nose of a legend, " + userName(), 4);
          act.after(1800, () => { buddy.play("idle"); act.done("found"); });
        });
      } else {
        buddy.play("scheming");
        sayLine("treasureTimeout", 5);
        act.after(4200, () => { buddy.play("idle"); act.done("timeout"); });
      }
    });
    // Walk resolves within 10s natively; belt to its braces.
    act.after(14000, () => { buddy.play("idle"); act.done(found ? "found" : "timeout"); });
  }

  // Openings vary: sneak out and visibly bury it, bounce like a gameshow
  // host, or claim the loot has been there for ages and never move at all.
  const style = pick(["bury", "host", "ancient"]);
  if (style === "bury") {
    buddy.play("scheming");
    if (chance(0.6)) buddy.say("do not look. i am doing crimes", 3);
    act.after(1400, () => {
      buddy.opacity(0.3);
      buddy.play("walk");
      buddy.moveTo(spot.x, spot.y, 340);
      act.once("arrived", () => {
        buddy.play("scheming");
        act.after(1300, () => {
          buddy.play("walk");
          buddy.moveTo(s.x + 80 + Math.random() * (s.w - 240), s.y + 60, 320);
          act.once("arrived", () => {
            buddy.opacity(1);
            buddy.play("idle");
            begin();
          });
        });
      });
    });
    // If a walk event gets swallowed, start the hunt anyway.
    act.after(20000, () => { buddy.opacity(1); begin(); });
  } else if (style === "host") {
    buddy.play("excited");
    act.after(900, begin);
  } else {
    buddy.play("scheming");
    buddy.say("i buried something on this screen ages ago. find it before it hatches", 5);
    act.after(2600, begin);
  }
};
