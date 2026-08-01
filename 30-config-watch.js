// Buddy notices when someone edits its traits. It has opinions about this.
// Reaction lines live in lines.json under "config".
buddy.on("configChanged", (e) => {
  const dir = e.to > e.from ? "up" : "down";
  setMood("grumpy", "scheming");
  const all = buddy.data("lines.json") || {};
  const cfg = (all.config || {})[e.trait];
  const pool = cfg && cfg[dir];
  buddy.say(pool && pool.length ? pickFresh(pool) : e.trait + " changed. i felt that.", 6);
  if (dir === "down") {
    buddy.memory.set("grudges", (buddy.memory.get("grudges") || 0) + 1);
  }
  buddy.after(8000, () => setMood("happy", "idle"));
  scheduleArchetype();
});

// After the sliders settle, buddy names what the COMBINATION now makes it -
// not one trait, the whole recipe. Debounced so dragging a slider through ten
// values earns one verdict, not ten.
let archetypeTimer = null;
function scheduleArchetype() {
  if (archetypeTimer) buddy.cancel(archetypeTimer);
  archetypeTimer = buddy.after(7000, () => {
    archetypeTimer = null;
    if (state.busy || buddy.isFrozen()) return;
    if (!chance(0.35 + buddy.traits.get("chattiness") * 0.5)) return;
    const all = buddy.traits.all() || {};
    const parts = [];
    for (const k in all) {
      const v = typeof all[k] === "number" ? all[k] : all[k].value;
      parts.push(k + "=" + Math.round(v * 100) + "%");
    }
    if (!parts.length) return;
    if (can("think")) {
      buddy.play("think");
      buddy.think(
        "My personality sliders were just adjusted. They now read: " + parts.join(", ") +
        ". In one short punchy first-person line, name the ARCHETYPE this exact combination makes me " +
        "(like 'silent menace era' or 'corporate golden retriever') and own it. No preamble.",
        (t) => {
          buddy.play("idle");
          if (t) buddy.say(t, 6);
          else sayLine("configCombo", 5);
        }
      );
    } else {
      sayLine("configCombo", 5);
    }
  });
}

// Fires after any brain hot-reload, including the nightly mutator's surgery.
buddy.on("brainChanged", () => {
  if (chance(0.7)) sayLine("brainChanged", 5);
});
