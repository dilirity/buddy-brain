// The evolution ritual. Native emits evolveStart when the mutator begins
// (nightly or via Evolve Now) and evolveEnd {changed} when it finishes.
// The brain hot-reloads before evolveEnd, so the NEW brain handles the ending.
buddy.on("evolveStart", () => {
  state.busy = true;
  buddy.stop();
  buddy.play("evolve");
  sayLine("evolveStart", 6);
});

buddy.on("evolveEnd", (e) => {
  state.busy = false;
  buddy.play("excited");
  sayLine(e.changed ? "evolveChanged" : "evolveSame", 6);
  buddy.after(3500, () => buddy.play("idle"));
});
