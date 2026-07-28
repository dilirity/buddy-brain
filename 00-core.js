// Buddy brain core. Files load in filename order; this one first.
// Coordinates are Cocoa: origin at bottom-left. buddy.screen() = visible frame {x,y,w,h}.
globalThis.state = { mood: "happy" };

globalThis.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
globalThis.chance = (p) => Math.random() < p;

// pick, but avoids the last few lines actually said - buddy repeating itself
// verbatim breaks the illusion of it being alive.
globalThis._recentSays = [];
globalThis.pickFresh = (arr) => {
  for (let i = 0; i < 6; i++) {
    const c = pick(arr);
    if (!_recentSays.includes(c)) {
      _recentSays.push(c);
      if (_recentSays.length > 8) _recentSays.shift();
      return c;
    }
  }
  return pick(arr);
};

globalThis.setMood = function (mood, anim) {
  state.mood = mood;
  if (anim) buddy.play(anim);
};

buddy.on("brainDamaged", (e) => {
  buddy.say("ow. part of my brain did not load. check buddy.log", 6);
});

buddy.on("unfrozen", () => {
  buddy.say(pickFresh(["im awake!! what did i miss", "that nap was not voluntary", "back online"]), 4);
});
