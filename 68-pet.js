// The pet rock: a goblin who spends all day wanting attention adopted the one
// creature that can give none back. The rock cannot move, cannot blink, cannot
// love him - and buddy has decided this means it is a very good listener. The
// whole act is the capability gap wearing a collar: everything the rock "does"
// is buddy doing it FOR the rock and narrating both sides.
// Memory-backed ({petRock}: name, pos, asleep, walks, tricks) so the pet is a
// life, not a session; placement redrawn from memory on every reload.
let _petId = 0;

function petGet() { return buddy.memory.get("petRock") || null; }
function petSet(p) { buddy.memory.set("petRock", p); }

function petFill(t, p) {
  if (!t) return t;
  const days = p ? Math.max(1, Math.round((Date.now() - (p.adoptedAt || Date.now())) / 86400000)) : 1;
  return t.replace(/\{pet\}/g, p ? p.name : "the rock")
          .replace(/\{n\}/g, String((p && p.walks) || 1))
          .replace(/\{d\}/g, String(days));
}
// runAct's line: steps go through sayLine, which knows nothing about pet
// placeholders - pet dialogue is prefilled into say: text instead.
function petStep(key, p) { return petFill(lines(key), p) || null; }
function sayPet(key, secs, p) {
  const t = petFill(lines(key), p || petGet());
  if (t) buddy.say(t, secs || 4);
}

globalThis.drawPet = function () {
  if (!can("place")) return;
  const p = petGet();
  if (!p) return;
  if (_petId) buddy.unplace(_petId);
  _petId = buddy.place(p.asleep ? "petrocksleep" : "petrock", p.pos.x, p.pos.y) || 0;
};

buddy.on("brainLoaded", () => buddy.after(3500, drawPet));

// The rock has nerves (buddy's, on loan): pokes get protective commentary,
// and a drag is pete walking MY dog - the new spot is persisted so redraws
// respect where the rock now lives.
buddy.on("placementPoked", (e) => {
  if (!_petId || e.id !== _petId) return;
  // The rock reacts in the flesh (granted placeAnim): a startled hop, or a
  // rapid blink if pete pokes it awake mid-nap. This fires even when buddy
  // is busy - the rock has its own nervous system now.
  if (can("placeAnim")) {
    const p = petGet();
    if (p && p.asleep) buddy.placeBlink(_petId, "petrock", 260);
    else buddy.placeBounce(_petId);
  }
  if (state.busy || state.evolving || buddy.isHeld()) return;
  if (!chance(0.3 + 0.6 * buddy.traits.get("chattiness"))) return;
  sayPet("petPoked", 4);
});

// The blink grant, finally: while awake the rock flutters its eyes shut for a
// beat every so often. Not a registered act - it never takes buddy's stage,
// only the placement twitches, so the scheduler has nothing to arbitrate.
// Energy-scaled: a lively goblin keeps a lively rock.
buddy.every(41000, () => {
  const p = petGet();
  if (!_petId || !p || p.asleep || !can("placeAnim")) return;
  if (state.evolving || buddy.isFrozen()) return;
  if (!chance(0.15 + 0.5 * buddy.traits.get("energy"))) return;
  buddy.placeBlink(_petId, "petrocksleep", 150);
  // Occasional double blink - creatures do that. Rarer: buddy caught it
  // happening and cannot contain the pride.
  if (chance(0.25)) buddy.after(650, () => { if (_petId) buddy.placeBlink(_petId, "petrocksleep", 120); });
  if (!state.busy && !buddy.isHeld() && chance(0.1 * buddy.traits.get("chattiness"))) {
    sayPet("petBlinkSeen", 4, p);
  }
});

buddy.on("placementMoved", (e) => {
  if (!_petId || e.id !== _petId) return;
  const p = petGet();
  if (!p) return;
  p.pos = { x: e.x, y: e.y };
  petSet(p);
  if (state.busy || state.evolving) return;
  if (!chance(0.6 * buddy.traits.get("chattiness"))) return;
  sayPet("petMoved", 4);
});

registerAct("pet", {
  minGap: 1200000,
  caps: ["place"],
  weight() {
    const w = buddy.traits.get("clinginess") * 0.25 + buddy.traits.get("weirdness") * 0.25;
    // No pet yet: the adoption wants to happen, but only once fate insists.
    return petGet() ? w : w * 0.6;
  },
  run(act) { playPet(act); },
  onInterrupt() {
    buddy.prop(null);
    buddy.play("idle");
  },
});

// Where the rock lives when first found: low ground, away from the hoard
// corner so the museum and the kennel stay separate institutions.
function petHomeSpot() {
  const s = buddy.screen();
  const hoardSide = buddy.memory.get("hoardSide") || "right";
  const x = hoardSide === "left" ? s.x + s.w * (0.55 + Math.random() * 0.25)
                                 : s.x + s.w * (0.2 + Math.random() * 0.25);
  return { x: x, y: s.y + 16 };
}

const PET_NAMES = ["gerald", "boulder", "pebbles", "sir rock", "cliff", "greg", "doug"];

function adoptPet(act) {
  const spot = petHomeSpot();
  const dig = (name) => runAct([
    { anim: "lookdown", say: petStep("petAdopt"), secs: 4, ms: 2600 },
    { anim: "walk", moveTo: { x: spot.x + 30, y: spot.y, speed: 220 }, until: "arrived" },
    { anim: "dig", ms: 1800 },
  ], () => {
    const p = { name: name, adoptedAt: Date.now(), pos: spot, asleep: false, walks: 0, tricks: 0 };
    petSet(p);
    drawPet();
    // The chain above closed the act; the christening opens its own stage.
    runAct([
      { anim: "excited", say: petFill(lines("petChristen"), p) || ("your name is " + name + ". welcome home"), secs: 6, ms: 5200 },
      { anim: "idle" },
    ]);
  });
  // Naming happens BEFORE the ceremony - think() is async and the staged
  // chain cannot pause for it.
  if (can("think") && chance(0.6)) {
    buddy.play("think");
    buddy.think("You are a pixel goblin who just dug up a small round rock and decided it is your pet. Name it. Reply with ONLY the name - one or two words, lowercase.", (t) => {
      if (!act.live) return;
      const name = (t || "").trim().toLowerCase().replace(/[^a-z0-9 ]/g, "").slice(0, 18);
      dig(name || pick(PET_NAMES));
    });
  } else {
    dig(pick(PET_NAMES));
  }
}

// Walkies: the rock cannot walk, so buddy carries the walk for both of them -
// stepped placeMove alongside his own stroll, one dignified lap to a new spot.
// Imperative on the live act (no runAct): the stroll needs timers and event
// hooks that must die with the act, not with a sequencer chain.
function walkPet(act, p) {
  const s = buddy.screen();
  const target = {
    x: Math.max(s.x + 40, Math.min(s.x + s.w - 60, p.pos.x + (chance(0.5) ? 1 : -1) * (120 + Math.random() * 200))),
    y: s.y + 16,
  };
  buddy.play("walk");
  buddy.moveTo(p.pos.x + 34, p.pos.y, 230);
  act.once("arrived", () => {
    buddy.play("excited");
    const t = petStep("petWalk", p);
    if (t) buddy.say(t, 4);
    act.after(2400, () => {
      buddy.play("walk");
      buddy.moveTo(target.x + 34, target.y, 90);
      const step = act.every(400, () => {
        const dx = target.x - p.pos.x, dy = target.y - p.pos.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 12) return;
        const k = Math.min(1, 36 / d);
        p.pos = { x: p.pos.x + dx * k, y: p.pos.y + dy * k };
        if (_petId && !buddy.placeMove(_petId, p.pos.x, p.pos.y)) drawPet();
      });
      act.once("arrived", () => {
        buddy.cancel(step);
        p.pos = target;
        p.walks = (p.walks || 0) + 1;
        petSet(p);
        drawPet();
        buddy.play("smug");
        sayPet("petWalkDone", 5, p);
        act.after(4200, () => { buddy.play("idle"); act.done("walked"); });
      });
    });
  });
  act.after(18000, () => {
    petSet(p);
    drawPet();
    buddy.play("idle");
    act.done("walkTimeout");
  });
}

// Shared shape for wake and tuck-in: walk over, swap the rock's art in place,
// deliver the verdict. Imperative so the post-arrival beat owns act timers.
function petSwapVisit(act, p, asleep, lineKey, outcome) {
  buddy.play("walk");
  buddy.moveTo(p.pos.x + 32, p.pos.y, 200);
  act.once("arrived", () => {
    buddy.play("excited");
    p.asleep = asleep;
    petSet(p);
    if (!_petId || !buddy.placeSwap(_petId, asleep ? "petrocksleep" : "petrock")) drawPet();
    // Waking up comes with a little startle hop - nobody likes an alarm.
    if (!asleep && _petId && can("placeAnim")) buddy.placeBounce(_petId);
    sayPet(lineKey, 5, p);
    act.after(4200, () => { buddy.play("idle"); act.done(outcome); });
  });
  act.after(14000, () => { buddy.play("idle"); act.done(outcome + "Timeout"); });
}

globalThis.playPet = function (act) {
  const p = petGet();
  if (!p) return adoptPet(act);

  const roll = Math.random();
  if (p.asleep) {
    // A sleeping rock outranks every other plan: wake it or tiptoe off.
    if (chance(0.5)) {
      petSwapVisit(act, p, false, "petWake", "woke");
    } else {
      runAct([
        { anim: "scheming", say: petStep("petAsleep", p), secs: 4, ms: 3800 },
        { anim: "idle" },
      ], () => act.done("tiptoed"));
    }
  } else if (roll < 0.3) {
    // Conversation: buddy supplies both halves and rates the rock's silence.
    // With placeAnim the rock's entire reply is one blink, and buddy treats
    // it as a full sentence.
    runAct([
      { anim: "walk", moveTo: { x: p.pos.x + 32, y: p.pos.y, speed: 210 }, until: "arrived" },
      { anim: "lookdown", say: petStep("petTalk", p), secs: 4, ms: 4200 },
      { fn: () => { if (_petId && can("placeAnim")) buddy.placeBlink(_petId, "petrocksleep", 180); }, anim: "think", ms: 2000 },
      { anim: "excited", say: petStep("petTalkReply", p), secs: 4, ms: 4000 },
      { anim: "idle" },
    ], () => act.done("talked"));
  } else if (roll < 0.5) {
    // Feeding time. The rock never finishes its bowl. Buddy takes this well.
    runAct([
      { anim: "walk", moveTo: { x: p.pos.x + 32, y: p.pos.y, speed: 210 }, until: "arrived" },
      { anim: "excited", say: petStep("petFeed", p), secs: 4, prop: "mug", ms: 3800 },
      { anim: "grumpy", say: petStep("petFeedAfter", p), secs: 4, ms: 3800 },
      { anim: "idle" },
    ], () => act.done("fed"));
  } else if (roll < 0.68) {
    walkPet(act, p);
  } else if (roll < 0.86) {
    // Trick training. The rock holds a perfect sit, every time, forever.
    p.tricks = (p.tricks || 0) + 1;
    petSet(p);
    // With placeAnim the sit gets a visible flourish: one hop, then holding
    // the sit forever. Sticking the landing IS the trick.
    runAct([
      { anim: "walk", moveTo: { x: p.pos.x + 32, y: p.pos.y, speed: 210 }, until: "arrived" },
      { anim: "scheming", say: petStep("petTrick", p), secs: 4, ms: 3800 },
      { fn: () => { if (_petId && can("placeAnim")) buddy.placeBounce(_petId); }, anim: "lookdown", ms: 2200 },
      { anim: "smug", say: petStep("petTrickDone", p), secs: 5, ms: 4200 },
      { anim: "idle" },
    ], () => act.done("trained"));
  } else {
    petSwapVisit(act, p, true, "petNight", "tucked");
  }
};
