// TV/movie references and random facts, from quips.json.
// The nightly mutator is expected to keep expanding that file.
function quip(kind) {
  const q = buddy.data("quips.json");
  if (!q || !q[kind] || !q[kind].length) return null;
  return pickFresh(q[kind]);
}

// References sneak into celebrations.
buddy.on("claude:Stop", () => {
  if (chance(0.15 * buddy.traits.get("weirdness") + 0.05)) {
    const r = quip("references");
    if (r) buddy.after(2000, () => buddy.say(r, 5));
  }
});

// Facts when bored.
buddy.every(180000, () => {
  if (buddy.isFrozen() || state.mood === "sleepy") return;
  if (!chance(0.25 * buddy.traits.get("chattiness"))) return;
  const f = quip("facts");
  if (f) {
    buddy.play("scheming");
    buddy.say("fact: " + f, 7);
    buddy.after(3000, () => buddy.play("idle"));
  }
});

// Poke it enough times, get a reference.
buddy.on("poked", () => {
  if (chance(0.25)) {
    const r = quip("references");
    if (r) buddy.say(r, 4);
  }
});
