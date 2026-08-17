// TV/movie references and random facts, from quips.json.
// The nightly mutator is expected to keep expanding that file.
// References carry a show tag; buddy dons a matching prop from sprites.json.
// The show -> prop mapping lives in quips.json ("showProps") so adding a show
// is pure data: quotes + prop pixels + one mapping entry.
function showProps() {
  const q = buddy.data("quips.json");
  return (q && q.showProps) || {};
}

// Props that are themselves hats must not ride the hand slot - under a
// hat of the day that renders as two hats at once. sayWithCostume borrows
// the HEAD slot for the line instead, and the day's hat comes back after.
const HAT_COSTUMES = { cowboyhat: 1, mouseears: 1, nightcap: 1, crown: 1, beret: 1 };
globalThis.isHatProp = (p) => !!HAT_COSTUMES[p];

globalThis.sayWithCostume = function (text, secs, prop) {
  const s = secs || 5;
  if (prop && HAT_COSTUMES[prop] && buddy.wear && can("wear")) {
    buddy.wear("head", prop);
    buddy.say(text, s);
    buddy.after(s * 1000 + 400, () => { if (typeof hatRestore === "function") hatRestore(); });
  } else {
    // Prop rides along with the line - the shell strips it when the bubble goes.
    buddy.say(text, s, prop);
  }
};

globalThis.sayRef = function (secs) {
  const q = buddy.data("quips.json");
  if (!q || !q.references || !q.references.length) return false;
  const texts = q.references.map((r) => (typeof r === "string" ? r : r.text));
  const t = pickFresh(texts);
  const entry = q.references.find((r) => (typeof r === "string" ? r : r.text) === t);
  const show = entry && typeof entry === "object" ? entry.show : null;
  sayWithCostume(t, secs || 5, show ? showProps()[show] : null);
  return true;
};

// Glasses on, fact out. Looking smart is half the fact.
globalThis.sayFact = function (secs) {
  const q = buddy.data("quips.json");
  if (!q || !q.facts || !q.facts.length) return false;
  buddy.say(pickFresh(q.facts), secs || 7, "glasses");
  return true;
};

// References sneak into celebrations.
buddy.on("claude:Stop", () => {
  if (state.busy) return;
  if (chance(0.2 * buddy.traits.get("weirdness"))) {
    buddy.after(2000, () => sayRef(5));
  }
});

// Facts when bored.
registerAct("fact", {
  minGap: 300000,
  weight: () => buddy.traits.get("chattiness") * 0.5,
  run: (act) => {
    buddy.play("scheming");
    const ok = sayFact(7);
    act.after(4000, () => { buddy.play("idle"); act.done(ok ? "said" : "no-facts"); });
  },
});

// Poke it enough times, get a reference. Weirdness decides whether a poke
// shakes a quote loose.
buddy.on("poked", () => {
  if (state.busy) return;
  if (chance(0.4 * buddy.traits.get("weirdness"))) sayRef(4);
});
