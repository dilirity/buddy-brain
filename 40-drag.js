// Being picked up, carried, and poked.
buddy.on("dragStart", () => {
  buddy.play("held");
  if (chance(0.8)) {
    buddy.say(pickFresh(["hey!! put me down", "wheee", "i can walk you know", "kidnapping. this is kidnapping"]), 2);
  }
});

buddy.on("dragEnd", () => {
  buddy.play("scheming");
  if (chance(0.5)) {
    buddy.say(pickFresh(["dizzy...", "i liked the old spot better", "ok. new home."]), 3);
  }
  buddy.after(1500, () => buddy.play("idle"));
});

buddy.on("poked", () => {
  buddy.play("excited");
  if (chance(0.6)) {
    buddy.say(pickFresh(["hi", "poke me again. i dare you", "that tickles", "yes?"]), 2);
  }
  buddy.after(2000, () => buddy.play("idle"));
});
