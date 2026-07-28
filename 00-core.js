// Buddy brain core. Files load in filename order; this one first.
// Coordinates are Cocoa: origin at bottom-left. buddy.screen() = visible frame {x,y,w,h}.
globalThis.state = { mood: "happy", busy: false };

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

// Dialogue pools live in lines.json so the nightly mutator can add lines
// without touching code.
globalThis.lines = (key) => {
  const l = buddy.data("lines.json");
  const pool = l && l[key];
  return pool && pool.length ? pickFresh(pool) : null;
};

globalThis.sayLine = (key, secs) => {
  const t = lines(key);
  if (t) buddy.say(t, secs || 4);
};

buddy.on("brainDamaged", (e) => {
  buddy.say("ow. part of my brain did not load. check buddy.log", 6);
});

buddy.on("unfrozen", () => {
  sayLine("unfrozen", 4);
});
