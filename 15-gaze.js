// Buddy notices the cursor with his EYES. Four look anims (lookleft/right/
// up/down) point the pupils at wherever the cursor actually is - computed
// live, because the cursor moves and a stale glance reads as blind.
function gazeDir() {
  const p = buddy.pos();
  const c = buddy.cursor.pos();
  const dx = c.x - p.x;
  const dy = c.y - p.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "lookleft" : "lookright";
  return dy > 0 ? "lookup" : "lookdown";
}

registerAct("gaze", {
  minGap: 45000,
  caps: ["cursor"],
  weight: () => buddy.traits.get("clinginess") * 0.7,
  run: (act) => {
    const roll = Math.random();
    if (roll < 0.5) {
      // Quick glance - the bread and butter. Silent, tiny, alive.
      buddy.play(gazeDir());
      act.after(1600, () => { buddy.play("idle"); act.done("glanced"); });
    } else if (roll < 0.8) {
      // Double take: look the wrong way first, then find it.
      const right = gazeDir();
      const wrong = pick(["lookleft", "lookright", "lookup", "lookdown"].filter((d) => d !== right));
      buddy.play(wrong);
      act.after(700, () => buddy.play(gazeDir()));
      act.after(2400, () => { buddy.play("idle"); act.done("doubletake"); });
    } else {
      // The stare: track the cursor for a few seconds, sometimes say so.
      buddy.play(gazeDir());
      if (chance(0.5 * buddy.traits.get("chattiness"))) sayLine("gaze", 3);
      act.every(800, () => buddy.play(gazeDir()));
      act.after(4500, () => { buddy.play("idle"); act.done("stared"); });
    }
  },
});
