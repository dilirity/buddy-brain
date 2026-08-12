// Treasure hunt: buddy hides loot at a secret point on screen, the human
// hunts it with the cursor while buddy calls warmer/colder from the live
// distance. Interactive game, so the body is imperative - runAct's chain-end
// would close the act mid-hunt.
registerAct("treasure", {
  minGap: 900000,
  caps: ["cursor"],
  weight: () => (buddy.traits.get("energy") * 0.4 + buddy.traits.get("mischief") * 0.6) * 0.5,
  run: (act) => playTreasure(act),
  onInterrupt: (act) => {
    buddy.stop();
    buddy.opacity(1);
    // A hunt in progress gets stashed, not cancelled - the loot keeps its
    // spot and the game resumes after the interruption (see resume below).
    if (act.hunt && act.hunt.phase === "hunt") {
      stashAct("treasure", act.hunt);
      sayLine("treasurePaused", 4);
    } else {
      buddy.say("fine. the treasure stays buried FOREVER", 4);
    }
  },
});

// The comeback: after a drag or a brain reload, a fresh stash restarts the
// hunt at the SAME spot - pete asked for mid-act state to survive
// interruptions, and the buried loot is the flagship case.
function resumeTreasure() {
  buddy.after(3000, () => {
    if (state.busy || state.evolving || buddy.isHeld() || buddy.isMoving()) return;
    if (!can("cursor")) return;
    const saved = takeStash("treasure", 600000);
    if (!saved) return;
    const ctx = beginAct("treasure", _acts.treasure);
    playTreasure(ctx, saved);
  });
}
buddy.on("dragEnd", resumeTreasure);
buddy.on("brainLoaded", resumeTreasure);

globalThis.playTreasure = function (act) {
  const s = buddy.screen();
  // Spawn well inside the edges - loot pinned to a screen border was
  // near-unfindable and the hunts kept timing out.
  const spot = {
    x: s.x + 140 + Math.random() * (s.w - 280),
    y: s.y + 140 + Math.random() * (s.h - 340),
  };
  const diag = Math.hypot(s.w, s.h);
  const loot = pick(["heart", "mug", "companioncube", "jawbreaker", "martini", "badge"]);
  let lied = false;
  let lastDist = null;
  let lastCall = 0;
  let phase = "open";
  let desperate = false;
  let lastCursor = null;
  let lastMove = 0;

  // Buddy's eyes are a hint channel: pupils point at the loot, not the cursor.
  function lookAtSpot() {
    const p = buddy.pos();
    const dx = spot.x - p.x;
    const dy = spot.y - p.y;
    buddy.play(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "lookleft" : "lookright") : (dy > 0 ? "lookup" : "lookdown"));
    act.after(1600, () => { if (phase === "hunt") buddy.play("idle"); });
  }

  // Compass word from the LIVE cursor to the loot (Cocoa: +y is up on screen).
  function dirWord(c) {
    const dx = spot.x - c.x;
    const dy = spot.y - c.y;
    const h = dx < 0 ? "left" : "right";
    const v = dy > 0 ? "up" : "down";
    if (Math.abs(dx) > Math.abs(dy) * 2.5) return h;
    if (Math.abs(dy) > Math.abs(dx) * 2.5) return v;
    return v + " and " + h;
  }

  let sinceDir = 0;
  function hint(d, c) {
    const closer = lastDist !== null && d < lastDist - 8;
    const further = lastDist !== null && d > lastDist + 8;
    // Absolute bands first, trend second - a still cursor used to earn total
    // silence, which read as buddy ignoring the game.
    let key;
    if (d < 170) key = "treasureHot";
    else if (closer) key = "treasureWarm";
    else if (further) key = "treasureCold";
    else key = d > diag * 0.4 ? "treasureFreezing" : "treasureNudge";
    // One lie per hunt, mischief's call - never in the endgame, a lie on top
    // of the mercy hints would be cruelty. The confession ships with the win.
    let lieNow = false;
    if (!lied && !desperate && (key === "treasureWarm" || key === "treasureCold") && chance(0.2 * buddy.traits.get("mischief"))) {
      lied = true;
      lieNow = true;
      key = key === "treasureWarm" ? "treasureCold" : "treasureWarm";
    }
    // Warmer/colder alone was too vague to ever converge - going the wrong way
    // (or every 3rd call) earns an explicit compass word. Never on the lie
    // call itself: a fake temperature is a prank, a fake direction is sabotage.
    sinceDir++;
    const wrongWay = key === "treasureCold" || key === "treasureFreezing";
    if (!lieNow && sinceDir >= (wrongWay || desperate ? 2 : 3)) {
      sinceDir = 0;
      const t = lines("treasureDir");
      if (t) {
        buddy.say(t.replace(/\{dir\}/g, dirWord(c)), 3);
        if (wrongWay && chance(0.6)) lookAtSpot();
        return;
      }
    }
    sayLine(key, 3);
    if (wrongWay && chance(desperate ? 0.9 : 0.45)) lookAtSpot();
  }

  function begin() {
    if (phase !== "open") return;
    phase = "hunt";
    sayLine("treasureStart", 5);
    act.every(700, () => {
      if (phase !== "hunt") return;
      const c = buddy.cursor.pos();
      const d = Math.hypot(c.x - spot.x, c.y - spot.y);
      if (d < (desperate ? 120 : 90)) return finishHunt(true);
      const now = Date.now();
      if (!lastCursor || Math.hypot(c.x - lastCursor.x, c.y - lastCursor.y) > 5) lastMove = now;
      lastCursor = c;
      // Temperatures ramp only while the cursor is actually hunting - a parked
      // cursor earned constant narration, which read as nagging, not play.
      // Cadence leaves each bubble readable before the next lands; the fast
      // stream blasted calls nobody could read.
      const idle = now - lastMove > 3000;
      const gap = idle ? 11000 + Math.random() * 4000 : 2800 + Math.random() * 1200;
      if (now - lastCall > gap) {
        lastCall = now;
        if (idle) sayLine("treasureNudge", 3);
        else hint(d, c);
      }
      lastDist = d;
    });
    // Mercy phase: openly stare at the loot and widen the dig radius.
    act.after(45000, () => {
      if (phase !== "hunt") return;
      desperate = true;
      sayLine("treasureDesperate", 4);
      lookAtSpot();
    });
    act.after(95000, () => finishHunt(false));
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
        // The reveal is the best part: dig, then the chest rises out of the
        // ground (unearth holds its last frame so the chest stays on stage
        // while buddy gloats). Sometimes no patience - straight to the chest.
        const digMs = chance(0.35) ? 0 : 2600;
        if (digMs) {
          buddy.play("dig");
          sayLine("treasureDig", 3);
        }
        act.after(digMs, () => {
          buddy.play("unearth");
          act.after(1400, () => {
            // Chest gets the stage to itself - a loot prop composited over it
            // reads as clutter. The item comes out AFTER, hoisted zelda-style.
            sayLine("treasureFound", 4);
            act.after(4600, () => {
              buddy.play("excited");
              if (lied && chance(0.7)) sayLine("treasureLie", 4);
              else if (chance(0.35)) buddy.say(n + " treasure" + (n === 1 ? "" : "s") + " sniffed out lifetime. nose of a legend, " + userName(), 4);
              else sayLine("treasureHaul", 4, loot);
              act.after(4200, () => { buddy.play("idle"); act.done("found"); });
            });
          });
        });
      } else {
        buddy.play("smug");
        sayLine("treasureTimeout", 5);
        act.after(4200, () => { buddy.play("idle"); act.done("timeout"); });
      }
    });
    // Walk resolves within 10s natively; belt to its braces (the dig-and-
    // reveal chain alone runs ~10s after arrival).
    act.after(26000, () => { buddy.play("idle"); act.done(found ? "found" : "timeout"); });
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
