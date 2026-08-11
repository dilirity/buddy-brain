// Being picked up, carried, and poked.
// TRAIT LAW: whether buddy comments on being handled is the mouth's call.
buddy.on("dragStart", () => {
  if (state.evolving) return;
  buddy.play("held");
  if (chance(0.5 + buddy.traits.get("chattiness") * 0.5)) sayLine("dragStart", 2);
});

buddy.on("dragEnd", () => {
  if (state.evolving) return;
  buddy.play("scheming");
  if (chance(0.25 + buddy.traits.get("chattiness") * 0.45)) sayLine("dragEnd", 3);
  buddy.after(1500, () => buddy.play("idle"));
});

buddy.on("poked", () => {
  // Acts (hide and seek etc.) own the poke while they run.
  if (state.busy) return;
  buddy.play("excited");
  if (chance(0.3 + buddy.traits.get("chattiness") * 0.5)) sayLine("poked", 2);
  buddy.after(2000, () => buddy.play("idle"));
});
