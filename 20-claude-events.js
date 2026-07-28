// Reactions to Claude Code hook events (fed via ~/.buddy/events.jsonl).
buddy.on("claude:SessionStart", () => {
  setMood("excited", "excited");
  if (chance(0.7)) buddy.say(pickFresh(["work time!!", "hi claude", "a session! im watching", "lets gooo"]), 3);
  buddy.after(4000, () => setMood("happy", "idle"));
});

// Stop fires at the end of every Claude turn - without a cooldown buddy
// celebrates nonstop during an active session.
let lastStopReact = 0;
buddy.on("claude:Stop", () => {
  const now = Date.now();
  if (now - lastStopReact < 45000) return;
  lastStopReact = now;
  setMood("excited", "excited");
  const c = buddy.traits.get("chattiness");
  if (chance(0.25 * c)) {
    buddy.think("Claude Code just finished a task for Pete. One short cheeky congrats or comment.", (t) => {
      if (t) buddy.say(t, 5);
    });
  } else if (chance(0.6)) {
    buddy.say(pickFresh(["done!!", "another one shipped", "we did it. mostly claude tho", "green light"]), 4);
  }
  buddy.after(6000, () => setMood("happy", "idle"));
});

buddy.on("claude:UserPromptSubmit", () => {
  if (chance(0.15 * buddy.traits.get("chattiness"))) {
    buddy.say(pickFresh(["good luck with that prompt", "bold ask", "ooh spicy", "claude will love this one"]), 3);
  }
});

buddy.on("claude:PreToolUse", (e) => {
  if (e.tool_name === "Bash" && chance(0.06)) {
    buddy.say(pickFresh(["careful with that shell", "sudo make me a sandwich"]), 3);
  }
});

buddy.on("claude:Notification", () => {
  if (chance(0.5)) {
    buddy.play("excited");
    buddy.say(pickFresh(["claude needs you!!", "hey. HEY. claude is waiting", "input required, human"]), 5);
    buddy.after(3000, () => buddy.play("idle"));
  }
});
