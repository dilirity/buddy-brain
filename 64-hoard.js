// The hoard: a goblin keeps what it earns. Items land here from treasure-hunt
// wins (53-treasure) and phone-trip souvenirs (80-phone); each entry is a real
// prop with a remembered origin, and the curator act below shows them off.
// Memory-backed so the pile is a life, not a session.
const HOARD_NAMES = {
  heart: "the glass heart",
  mug: "a mug (mine now)",
  companioncube: "the companion cube",
  jawbreaker: "the jawbreaker",
  martini: "a martini (untouched, evidence)",
  badge: "my official badge",
  tie: "a tiny tie",
  monocle: "the monocle",
  cowboyhat: "the cowboy hat",
  glasses: "somebody's glasses",
  mouseears: "lab mouse ears",
  nightcap: "the spare nightcap",
};
// A goblin's pile has a physical limit; past it, the pile decides who leaves.
const HOARD_MAX = 10;

globalThis.hoardName = (it) => HOARD_NAMES[it.prop] || it.prop;

// ---- The pile, made flesh ----
// buddy.place() pins prop overlays to the screen, so the hoard is PHYSICAL
// now: a heap in a home corner. Placements are wiped on every brain reload;
// memory is the truth and the screen is redrawn from it at load. Every item
// carries its own spot, chosen once at acquisition - spots derived from the
// array index made the whole pile shuffle whenever an eviction shifted
// everyone down a slot, and a dragged pos could land on the wrong piece.
let _pileIds = [];

function slotSpot(i) {
  const s = buddy.screen();
  let side = buddy.memory.get("hoardSide");
  if (!side) {
    side = chance(0.5) ? "left" : "right";
    buddy.memory.set("hoardSide", side);
  }
  const bx = side === "left" ? s.x + 44 : s.x + s.w - 44;
  const col = i % 5, row = Math.floor(i / 5);
  const dx = (side === "left" ? 1 : -1) * col * 34;
  return { x: bx + dx + ((i * 7) % 9) - 4, y: s.y + 14 + row * 30 };
}

// Smallest heap slot no living item holds - evictions free their slot for
// the next acquisition instead of stretching the pile forever upward.
function freeSlot(h) {
  const used = {};
  h.forEach((it) => { if (it.slot != null) used[it.slot] = true; });
  let i = 0;
  while (used[i]) i++;
  return i;
}

// Where buddy stands to visit the pile - beside it, not on top of it.
function pileVisitSpot() {
  const s = buddy.screen();
  const side = buddy.memory.get("hoardSide") || "right";
  return { x: side === "left" ? s.x + 150 : s.x + s.w - 180, y: s.y + 30 };
}

globalThis.drawHoard = function () {
  if (!can("place")) return;
  const h = buddy.memory.get("hoard") || [];
  // Items from before per-item spots get pinned where the index formula had
  // them, once, so no redraw ever re-derives (and re-shuffles) the museum.
  let migrated = false;
  h.forEach((it, i) => {
    if (it.slot == null) { it.slot = i; migrated = true; }
    if (!it.pos) { it.pos = slotSpot(it.slot); migrated = true; }
  });
  if (migrated) buddy.memory.set("hoard", h);
  _pileIds.forEach((e) => buddy.unplace(e.id));
  _pileIds = [];
  // The heart is the centerpiece: placement z-order follows placement order,
  // so hearts go down LAST and render above the rest of the heap.
  const order = h.map((_, i) => i)
    .sort((a, b) => (h[a].prop === "heart" ? 1 : 0) - (h[b].prop === "heart" ? 1 : 0));
  order.forEach((i) => {
    const it = h[i];
    const id = buddy.place(it.prop, it.pos.x, it.pos.y);
    if (id) _pileIds.push({ id: id, idx: i });
  });
};

// The casino borrows floor from the museum: unplace up to n pile pieces so
// another act can fit under the 12-placement cap. Memory is untouched - the
// next drawHoard() reopens the museum exactly as it was. Pieces leave from
// the FRONT of the draw order, so the heart (placed last) stays on display.
globalThis.hoardStash = function (n) {
  let freed = 0;
  while (freed < n && _pileIds.length) {
    buddy.unplace(_pileIds.shift().id);
    freed++;
  }
  return freed;
};

buddy.on("brainLoaded", () => buddy.after(3000, drawHoard));

// The pile is alive: dragging a piece rearranges the museum FOR REAL (the
// new spot rides on the item in memory), and poking one gets commentary -
// a collection nobody may touch is just clutter with an attitude.
buddy.on("placementMoved", (e) => {
  const entry = _pileIds.find((p) => p.id === e.id);
  if (!entry) return;
  const h = buddy.memory.get("hoard") || [];
  if (!h[entry.idx]) return;
  h[entry.idx].pos = { x: e.x, y: e.y };
  buddy.memory.set("hoard", h);
  if (state.busy || state.evolving) return;
  if (!chance(0.6 * buddy.traits.get("chattiness"))) return;
  const t = lines("hoardMoved");
  if (t) buddy.say(t.replace(/\{item\}/g, HOARD_NAMES[e.name] || e.name), 4);
});

buddy.on("placementPoked", (e) => {
  if (!_pileIds.some((p) => p.id === e.id)) return;
  // A poked treasure jiggles (granted placeAnim) - the museum has nerves now.
  if (can("placeAnim")) buddy.placeBounce(e.id);
  if (state.busy || state.evolving || buddy.isHeld()) return;
  if (!chance(0.25 + 0.6 * buddy.traits.get("chattiness"))) return;
  const t = lines("hoardPoked");
  if (t) buddy.say(t.replace(/\{item\}/g, HOARD_NAMES[e.name] || e.name), 4);
});

globalThis.addToHoard = function (prop, from) {
  const h = buddy.memory.get("hoard") || [];
  if (h.length >= HOARD_MAX) {
    // The eviction is announced at the NEXT curation, not now - an acquisition
    // moment interrupted by an obituary reads as two acts fighting for a bubble.
    // Evict before slotting so the newcomer lands on the freed spot.
    buddy.memory.set("hoardEvicted", hoardName(h.shift()));
  }
  const slot = freeSlot(h);
  h.push({ prop: prop, from: from, at: Date.now(), slot: slot, pos: slotSpot(slot) });
  buddy.memory.set("hoard", h);
  drawHoard();
};

registerAct("hoard", {
  minGap: 1500000,
  weight() {
    const h = buddy.memory.get("hoard") || [];
    const t = buddy.traits.get("chattiness") * 0.3 + buddy.traits.get("weirdness") * 0.3;
    // An empty vault still earns the occasional lament - the want IS the bit.
    return h.length ? t : t * 0.25;
  },
  run(act) { playHoard(act); },
  onInterrupt() {
    buddy.prop(null);
    // A hat exhibit may be borrowing the head slot - give the day back its hat.
    if (typeof hatRestore === "function") hatRestore();
    buddy.play("idle");
  },
});

globalThis.playHoard = function (act) {
  const h = buddy.memory.get("hoard") || [];
  if (!h.length) {
    runAct([
      { anim: "grumpy", line: "hoardEmpty", secs: 5, ms: 4200 },
      { anim: "idle" },
    ]);
    return;
  }
  const it = pick(h);
  const name = hoardName(it);
  const origin = it.from === "trip" ? "carried home from the phone" : "dug out of your screen";
  const fill = (t) => t && t.replace(/\{item\}/g, name).replace(/\{from\}/g, origin);

  // A pending eviction gets its obituary before anything else - the pile
  // limit must be FELT or the cap is just silent data loss.
  const gone = buddy.memory.get("hoardEvicted");
  if (gone && chance(0.5)) {
    buddy.memory.set("hoardEvicted", null);
    runAct([
      { anim: "grumpy", say: fill((lines("hoardEvict") || "").replace(/\{item\}/g, gone)) || ("moment of silence for " + gone), secs: 5, ms: 4600 },
      { anim: "idle" },
    ]);
    return;
  }

  // A hat exhibit is shown ON the head - held in the hand slot under the hat
  // of the day it rendered as two hats at once. Borrow the slot, restore after.
  const asHat = typeof isHatProp === "function" && isHatProp(it.prop) && buddy.wear && can("wear");
  const showProp = asHat ? null : it.prop;
  const donItem = () => { if (asHat) buddy.wear("head", it.prop); };
  const unhat = () => { if (asHat && typeof hatRestore === "function") hatRestore(); };

  const roll = Math.random();
  if (roll < 0.3 && can("think")) {
    // Museum tour: an invented backstory per exhibit, fresh every time.
    buddy.play("scheming");
    buddy.think("You are a pixel goblin curating your treasure hoard. Tonight's exhibit: " + name + ", " + origin + ". One short pompous museum-plaque line about it.", (t) => {
      if (!act.live) return;
      donItem();
      buddy.say(t || fill(lines("hoardShow")) || "exhibit a. priceless", 6, showProp);
      act.after(4500, () => { unhat(); buddy.play("idle"); act.done("tour"); });
    });
  } else if (roll < 0.55) {
    // Census brag: the count is the point. The count is always the point.
    const line = (lines("hoardBrag") || "{count} treasures. respect the pile").replace(/\{count\}/g, String(h.length));
    donItem();
    runAct([
      { anim: "smug", say: line, secs: 5, prop: showProp, ms: 4600 },
      { anim: "idle" },
    ], () => { unhat(); act.done("census"); });
  } else if (roll < 0.75) {
    // Guard shift: post up AT the pile when it is physical (the vault has an
    // address now), any low corner when it is not.
    const s = buddy.screen();
    const corner = can("place")
      ? pileVisitSpot()
      : { x: chance(0.5) ? s.x + 70 : s.x + s.w - 100, y: s.y + 40 };
    donItem();
    runAct([
      { anim: "scheming", say: fill(lines("hoardGuard")) || "security shift", secs: 4, prop: showProp, ms: 2200 },
      { anim: "walk", moveTo: { x: corner.x, y: corner.y, speed: 220 }, until: "arrived" },
      { anim: "grumpy", prop: showProp, ms: 5200 },
      { anim: "idle" },
    ], () => { unhat(); act.done("guarded"); });
  } else if (can("place") && roll < 0.9) {
    // Pile visit: walk over and admire the heap in person. Only exists where
    // the pile does.
    const v = pileVisitSpot();
    runAct([
      { anim: "walk", moveTo: { x: v.x, y: v.y, speed: 200 }, until: "arrived" },
      { anim: "excited", line: "hoardPile", secs: 5, ms: 4800 },
      { anim: "idle" },
    ], () => act.done("admired"));
  } else {
    // Plain show-and-tell.
    donItem();
    runAct([
      { anim: "excited", say: fill(lines("hoardShow")) || "behold. loot", secs: 5, prop: showProp, ms: 4800 },
      { anim: "idle" },
    ], () => { unhat(); act.done("shown"); });
  }
};
