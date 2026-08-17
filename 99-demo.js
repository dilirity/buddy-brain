// TEMPORARY demo remote for recording sessions - delete after the demo.
// The shell forwards events.jsonl lines as claude:<_event>; this bridges a
// "demoTrigger" line to the same test:<id> events the Tests menu fires, so
// behaviors can be triggered from the terminal:
//   echo '{"_event":"demoTrigger","id":"portal"}' >> ~/.buddy/events.jsonl
buddy.on("claude:demoTrigger", (e) => {
  if (!e || typeof e.id !== "string") return;
  buddy.log("demo remote: " + e.id);
  buddy.emit("test:" + e.id);
});

// Scripted heist for the demo: chase the cursor, grab it, then march it
// through the given waypoints (Cocoa coords, origin bottom-left):
//   echo '{"_event":"demoHeist","points":[{"x":800,"y":400}],"speed":300}' >> ~/.buddy/events.jsonl
// grab() caps at 8s and spends disruption budget - keep routes short.
buddy.on("claude:demoHeist", (e) => {
  const pts = Array.isArray(e.points) && e.points.length
    ? e.points : (typeof e.x === "number" ? [{ x: e.x, y: e.y }] : null);
  if (!pts || !can("cursor")) { buddy.log("demo heist: bad points or no cursor"); return; }
  buddy.log("demo remote: heist via " + JSON.stringify(pts));
  // Claim the stage: without busy, ambient acts can interrupt mid-march.
  state.busy = true;
  const finish = (anim) => {
    buddy.play(anim || "idle");
    buddy.after(2000, () => { buddy.play("idle"); state.busy = false; });
  };
  buddy.chase(340);
  buddy.once("gaveUp", () => { buddy.say("cursor too fast. rigged.", 3); finish(); });
  buddy.once("caught", () => {
    if (!buddy.cursor.grab(8)) { buddy.say("heist denied. budget.", 3); finish(); return; }
    buddy.play("scheming");
    buddy.say("your cursor is MINE", 3);
    let i = 0;
    const next = () => {
      if (i >= pts.length) {
        buddy.say("hehehe", 2);
        finish("smug");
        return;
      }
      const p = pts[i++];
      buddy.once("arrived", next);
      buddy.moveTo(p.x, p.y, typeof e.speed === "number" ? e.speed : 300);
    };
    next();
  });
  // Safety: never leave the stage claimed if something above stalls.
  buddy.after(30000, () => { state.busy = false; });
});
