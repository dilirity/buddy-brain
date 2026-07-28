// Buddy notices when someone edits its traits. It has opinions about this.
buddy.on("configChanged", (e) => {
  const dir = e.to > e.from ? "up" : "down";
  setMood("grumpy", "scheming");
  const lines = {
    mischief: {
      down: ["lowering my mischief? coward.", "fine. i will be GOOD. allegedly."],
      up: ["oh you want chaos? noted.", "mischief up. excellent."],
    },
    chattiness: {
      down: ["silencing me. wow.", "ok. inside voice."],
      up: ["more talking!! my favorite thing"],
    },
    energy: {
      down: ["sleepy mode it is", "less zoomies. my knees thank you"],
      up: ["ZOOM MODE ENGAGED"],
    },
    clinginess: {
      down: ["so you want space. i see how it is", "fine. independent buddy era."],
      up: ["i will never leave your side now"],
    },
    weirdness: {
      down: ["normal buddy activated. boring."],
      up: ["oh we are getting WEIRD"],
    },
  };
  const t = lines[e.trait];
  buddy.say(t ? pick(t[dir]) : e.trait + " changed. i felt that.", 6);
  if (dir === "down") {
    buddy.memory.set("grudges", (buddy.memory.get("grudges") || 0) + 1);
  }
  buddy.after(8000, () => setMood("happy", "idle"));
});

// Fires after any brain hot-reload, including the nightly mutator's surgery.
buddy.on("brainChanged", () => {
  if (chance(0.7)) {
    buddy.say(pickFresh(["...did my brain just change", "i feel different today", "new me. who dis"]), 5);
  }
});
