// Shell game: three cups placed on the actual screen, a prize under one,
// buddy shuffles them and the human POKES a cup to guess. First placement-
// native casino act - the cups are real, draggable, and poke is the whole
// controller. Mischief may run a classic con: the prize was never under any
// cup, and buddy produces it from behind his back with zero remorse.
registerAct("shellGame", {
  minGap: 1200000,
  caps: ["place"],
  weight: () => (buddy.traits.get("mischief") * 0.55 + buddy.traits.get("showmanship") * 0.45) * 0.45,
  run: (act) => playShellGame(act),
  onInterrupt: (act) => {
    buddy.stop();
    if (buddy.wear) buddy.wear("hand", null);
    if (act.cleanupCups) act.cleanupCups();
    // A revealed prize survives the interruption - won loot is won loot.
    if (act.bankPrize) act.bankPrize();
    if (act.restoreMuseum) act.restoreMuseum();
  },
});

globalThis.playShellGame = function (act) {
  const s = buddy.screen();
  const baseY = s.y + 90;
  const cx = s.x + s.w * 0.5;
  const loot = pick(["heart", "mug", "companioncube", "jawbreaker", "martini", "badge"]);
  // The con is decided before the first shuffle, so the whole performance is
  // honest theater or dishonest theater - never a mid-game mind change.
  const conned = chance(0.3 * buddy.traits.get("mischief"));
  let cups = [];
  let winner = -1;
  let phase = "open";
  let banked = false;
  let prizeEarned = false;
  let clearedFloor = false;

  act.cleanupCups = function () {
    cups.forEach((c) => { if (c.id) buddy.unplace(c.id); });
    cups = [];
  };
  act.bankPrize = function () {
    if (banked || !prizeEarned) return;
    banked = true;
    addToHoard(loot, conned ? "palmed" : "won");
  };
  // The museum wing the casino borrowed reopens after the table clears -
  // drawHoard redraws the whole pile from memory, stashed pieces included.
  act.restoreMuseum = function () {
    if (!clearedFloor) return;
    clearedFloor = false;
    drawHoard();
  };

  // A full hoard used to eat the whole 12-placement cap and the casino could
  // never open - the goblin's own treasure crowding out his own table. Now
  // the museum closes a wing for casino night: stash enough pile pieces to
  // fit three cups, one time per game.
  function makeRoom() {
    if (clearedFloor || typeof hoardStash !== "function") return false;
    if (!hoardStash(4)) return false;
    clearedFloor = true;
    return true;
  }

  // Banking happens only after the table clears - a prize on the pile while
  // still visibly under a cup (or in hand) is the duplicate-item bug again.
  function finish(outcome) {
    act.after(3200, () => {
      act.cleanupCups();
      if (buddy.wear) buddy.wear("hand", null);
      else buddy.prop(null);
      act.bankPrize();
      if (clearedFloor && chance(0.5 * buddy.traits.get("chattiness"))) sayLine("shellReopen", 4);
      act.restoreMuseum();
      buddy.play("idle");
      act.done(outcome);
    });
  }

  // placeMove keeps the id; the unplace+place fallback mints a new one, and
  // the winner marker must follow it or the reveal lifts the wrong cup.
  function moveCup(i, x) {
    const c = cups[i];
    c.x = x;
    if (buddy.placeMove && buddy.placeMove(c.id, x, c.y)) return;
    buddy.unplace(c.id);
    c.id = buddy.place("cup", x, c.y);
  }

  function shuffle(n) {
    if (n <= 0) {
      phase = "pick";
      buddy.play("excited");
      sayLine("shellPick", 5);
      // Bored-croupier clock: nobody plays, buddy lifts the cup himself and
      // the prize stays house property.
      act.after(45000, () => {
        if (phase !== "pick") return;
        phase = "over";
        buddy.play("smug");
        sayLine("shellBored", 5);
        if (!conned && winner >= 0 && cups[winner].id) {
          if (!(buddy.placeSwap && buddy.placeSwap(cups[winner].id, loot))) {
            buddy.unplace(cups[winner].id);
            cups[winner].id = buddy.place(loot, cups[winner].x, cups[winner].y);
          }
        }
        prizeEarned = true;
        finish("bored");
      });
      return;
    }
    const a = Math.floor(Math.random() * cups.length);
    let b = Math.floor(Math.random() * cups.length);
    if (b === a) b = (a + 1) % cups.length;
    const ax = cups[a].x;
    moveCup(a, cups[b].x);
    moveCup(b, ax);
    if (n === 2 && chance(0.5 * buddy.traits.get("chattiness"))) sayLine("shellShuffle", 3);
    act.after(650 + Math.random() * 350, () => shuffle(n - 1));
  }

  function reveal(guessIdx) {
    phase = "over";
    const hit = !conned && guessIdx === winner;
    const key = hit ? "shellWins" : conned ? "shellCons" : "shellMisses";
    buddy.memory.set(key, (buddy.memory.get(key) || 0) + 1);
    if (hit) {
      const c = cups[guessIdx];
      if (!(buddy.placeSwap && buddy.placeSwap(c.id, loot))) {
        buddy.unplace(c.id);
        c.id = buddy.place(loot, c.x, c.y);
      }
      sfx("cha-ching");
      buddy.play("excited");
      const wins = buddy.memory.get("shellWins");
      if (chance(0.25 + buddy.traits.get("showmanship") * 0.3)) buddy.say(wins + " win" + (wins === 1 ? "" : "s") + " off the house now, " + userName() + ". the casino fears you", 5);
      else sayLine("shellWin", 5);
      prizeEarned = true;
      finish("humanWon");
      return;
    }
    if (conned) {
      // Every cup comes up empty, then the prize appears from behind the
      // back. A confession is part of the act - the con IS the show.
      cups.forEach((c) => { if (c.id && can("placeAnim")) buddy.placeBounce(c.id); });
      act.after(900, () => {
        act.cleanupCups();
        buddy.play("smug");
        if (buddy.wear && can("wear")) buddy.wear("hand", loot);
        else buddy.prop(loot);
        sayLine("shellCon", 6);
        prizeEarned = true;
        finish("conned");
      });
      return;
    }
    // Honest miss: the guessed cup bounces empty, the real cup fesses up.
    const g = cups[guessIdx];
    if (g.id && can("placeAnim")) buddy.placeBounce(g.id);
    act.after(700, () => {
      const w = cups[winner];
      if (w && w.id && !(buddy.placeSwap && buddy.placeSwap(w.id, loot))) {
        buddy.unplace(w.id);
        w.id = buddy.place(loot, w.x, w.y);
      }
      buddy.play("smug");
      sayLine("shellWrong", 5);
      prizeEarned = true;
      finish("houseWon");
    });
  }

  act.on("placementPoked", (e) => {
    const idx = cups.findIndex((c) => c.id === e.id);
    if (idx < 0) return;
    if (phase === "shuffle" || phase === "show") {
      sayLine("shellNoTouch", 3);
      return;
    }
    if (phase !== "pick") return;
    reveal(idx);
  });

  // The human rearranging the table mid-game is tampering, and the house
  // notices - but the cup's new spot is honored, not snapped back.
  act.on("placementMoved", (e) => {
    const c = cups.find((k) => k.id === e.id);
    if (!c) return;
    c.x = e.x;
    c.y = e.y;
    if (phase === "pick" && chance(0.6 * buddy.traits.get("chattiness"))) sayLine("shellTamper", 4);
  });

  function setTable() {
    phase = "show";
    const spots = [cx - 140, cx, cx + 140];
    winner = Math.floor(Math.random() * 3);
    // The prize is SHOWN at its cup's spot first - watch it or lose it.
    const showId = buddy.place(conned ? "cup" : loot, spots[winner], baseY);
    if (!showId) {
      if (makeRoom()) {
        buddy.play("scheming");
        sayLine("shellClearFloor", 5);
        act.after(2600, setTable);
        return;
      }
      // Floor still full after closing the wing (or no pile to close): fold.
      sayLine("shellNoRoom", 4);
      buddy.play("idle");
      act.done("noRoom");
      return;
    }
    if (!conned) sayLine("shellWatch", 4);
    act.after(conned ? 400 : 2400, () => {
      if (!conned && !(buddy.placeSwap && buddy.placeSwap(showId, "cup"))) {
        buddy.unplace(showId);
        cups.push({ id: buddy.place("cup", spots[winner], baseY), x: spots[winner], y: baseY });
      } else {
        cups.push({ id: showId, x: spots[winner], y: baseY });
      }
      for (let i = 0; i < 3; i++) {
        if (i === winner) continue;
        cups.push({ id: buddy.place("cup", spots[i], baseY), x: spots[i], y: baseY });
      }
      // A partial table (cap hit mid-deal): close a museum wing and re-deal
      // once. A two-cup shell game is just theft with extra steps.
      if (cups.some((c) => !c.id)) {
        act.cleanupCups();
        if (makeRoom()) {
          buddy.play("scheming");
          sayLine("shellClearFloor", 5);
          act.after(2600, setTable);
          return;
        }
        sayLine("shellNoRoom", 4);
        buddy.play("idle");
        act.done("noRoom");
        return;
      }
      // cups[] order is placement order, not screen order - winner is index 0
      // when honest. Re-map winner to its cups[] index for the reveal logic.
      winner = conned ? -1 : 0;
      phase = "shuffle";
      act.after(700, () => shuffle(4 + Math.floor(Math.random() * 4)));
    });
  }

  // Openings vary: carnival barker, sketchy back-alley whisper, or dead
  // silence and a table that just appears.
  const style = pick(["barker", "alley", "silent"]);
  buddy.play("scheming");
  if (style === "barker") {
    buddy.play("excited");
    sayLine("shellStart", 5);
  } else if (style === "alley") {
    sayLine("shellStartShady", 5);
  }
  buddy.play("walk");
  buddy.moveTo(cx, baseY + 120, 260);
  act.once("arrived", () => {
    buddy.play("scheming");
    setTable();
  });
  act.after(15000, () => { if (phase === "open") setTable(); });
};
