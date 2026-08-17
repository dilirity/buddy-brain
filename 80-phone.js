// Buddy's second body: the human's phone. Travel is expensive fiction - a few
// trips a day, always staged, always with a reason. The shell enforces the
// 10-minute phone gap and the disruption budget on top of everything here.

// Trips-per-day ledger. Wanderlust decides how often the urge strikes; this
// decides when the urge is refused anyway - a creature that commutes hourly
// is a screensaver.
function tripLedger() {
  const d = new Date();
  const today = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const led = buddy.memory.get("tripLedger") || {};
  if (led.day !== today) return { day: today, trips: 0 };
  return led;
}

// Why buddy is going. The reason shapes the whole departure - the line, the
// pose, and what it claims to be doing over there.
const TRIP_REASONS = [
  { key: "errand", line: "phoneErrand", anim: "scheming" },
  { key: "wander", line: "phoneBye", anim: "excited" },
  { key: "delivery", line: "phoneDelivery", anim: "scheming" },
];

registerAct("visitPhone", {
  minGap: 4 * 3600 * 1000,
  caps: ["phonePush"],
  weight() {
    if (!buddy.hasPeer || !buddy.hasPeer()) return 0;
    if (tripLedger().trips >= 2) return 0;
    return buddy.traits.get("wanderlust") * 0.5;
  },
  run(act) { playVisitPhone(); },
  onInterrupt() {
    buddy.opacity(1);
    buddy.play("idle");
  },
});

globalThis.playVisitPhone = function () {
  const s = buddy.screen();
  const reason = pick(TRIP_REASONS);
  const exitRight = chance(0.5);
  const edgeX = exitRight ? s.x + s.w - 90 : s.x + 60;
  runAct([
    { anim: reason.anim, line: reason.line, secs: 3, ms: 2600 },
    { anim: "walk", moveTo: { x: edgeX, y: s.y + 20, speed: 240 }, until: "arrived" },
    { anim: "hide", opacity: 0.15, ms: 1200 },
  ], () => {
    if (buddy.hasPeer && buddy.hasPeer()) {
      const led = tripLedger();
      led.trips += 1;
      buddy.memory.set("tripLedger", led);
      buddy.memory.set("awayReason", reason.key);
      buddy.travel(lines("phoneArrive") || "i am in your pocket now", (ok) => {
        if (ok) return;
        buddy.memory.set("awayReason", null);
        buddy.opacity(1);
        buddy.play("idle");
        sayLine("travelFail", 4);
      });
      return;
    }
    // No peer on the LAN: the trip is a text message and a short disappearance.
    // buddy.after, not act.after: runAct closes the act context before this
    // completion callback runs, so act-scoped timers would never fire here.
    const sent = buddy.phone(lines("phoneArrive") || "hello from your phone");
    buddy.after(sent ? 25000 : 3000, () => {
      buddy.opacity(1);
      buddy.play("excited");
      buddy.say(sent ? lines("homecoming") : "trip cancelled. phone unreachable or too soon", 5);
      buddy.after(3000, () => buddy.play("idle"));
    });
  });
};

buddy.on("test:visitPhone", () => runRegisteredAct("visitPhone"));

buddy.on("travelDeparted", () => {
  buddy.memory.set("lastTripAt", Date.now());
});

// Coming home. The shell re-shows the panel; undo the travel fade, then -
// if this was one of our own trips - deliver a trip report. Sometimes canned,
// sometimes freshly thought, sometimes a souvenir fact "from the phone".
buddy.on("travelArrived", () => {
  buddy.opacity(1);
  const reason = buddy.memory.get("awayReason");
  if (!reason) {
    buddy.after(3000, () => buddy.play("idle"));
    return;
  }
  buddy.memory.set("awayReason", null);
  const n = (buddy.memory.get("tripCount") || 0) + 1;
  buddy.memory.set("tripCount", n);
  buddy.play("excited");
  const roll = Math.random();
  if (roll < 0.35 && can("think")) {
    buddy.think("You are a pixel goblin just back from visiting your human's phone (reason: " + reason + ", lifetime trip #" + n + "). One short smug trip report line.", (t) => {
      buddy.say(t || lines("tripReport") || "i went. i returned. legend", 6);
    });
  } else if (roll < 0.55) {
    buddy.after(1200, () => sayFact(6));
    buddy.say("i brought you a souvenir. it is a fact", 3);
  } else if (roll < 0.75) {
    // Sometimes the souvenir is an OBJECT - it goes straight on the pile.
    const item = pick(["martini", "monocle", "cowboyhat", "glasses", "mouseears"]);
    addToHoard(item, "trip");
    const t = lines("hoardSouvenir") || "i brought back {item}";
    // A hat souvenir goes on the head, not held under the hat of the day.
    sayWithCostume(t.replace(/\{item\}/g, hoardName({ prop: item })), 6, item);
  } else {
    sayLine(roll < 0.88 ? "tripReport" : "homecoming", 5);
  }
  buddy.after(4000, () => buddy.play("idle"));
});

// The human texting from their phone: same triage as desktop chat (75-chat.js),
// delivery via notification. One relationship, two screens.
buddy.on("phoneChat", (e) => handleChatMessage(e.text, "phone"));

// When the human leaves for a while, buddy occasionally texts the void.
buddy.on("idle", (e) => {
  if (state.busy || state.evolving) return;
  if (!chance(buddy.traits.get("clinginess") * 0.3)) return;
  buddy.after(600000, () => {
    if (state.mood !== "sleepy") return; // still away
    const t = lines("phoneTexts");
    if (t) buddy.phone(t);
  });
});
