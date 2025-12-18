const cl = console.log;

import { onDisconnect, auth, onAuthStateChanged, db, ref, set, onValue } from "./firebase.js";
import { game } from "./script.js";

// DOM Elements
const createGameBtn = document.getElementById("create-game");
let gameCode;

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

onAuthStateChanged(auth, (user) => {
  createGameBtn.addEventListener("click", () => {
    cl("clicked");
    createGame(user);
  });
});

function createGame(user) {
  if (user) {
    const hostId = user.uid;
    cl("User UID:", hostId);

    gameCode = generateCode();
    cl("Game code:", gameCode);

    document.getElementById("game-code").textContent = gameCode;

    const gameRef = ref(db, `games/${gameCode}`);

    const disconnectHandler = onDisconnect(gameRef);
    disconnectHandler
      .remove()
      .then(() => console.log("onDisconnect remove scheduled"))
      .catch((err) => console.error("Failed to schedule onDisconnect", err));

    set(gameRef, {
      hostId: hostId,
      createdAt: Date.now(),
      buzzes: null,
    });

    const playersRef = ref(db, `games/${gameCode}/players`);

    onValue(playersRef, (snapshot) => {
      const players = snapshot.val();
      if (!players) return;

      const uids = Object.keys(players);
      const latestPlayerUid = uids[uids.length - 1];
      const latestPlayerName = players[latestPlayerUid].name;
      game.addPlayer(latestPlayerName, latestPlayerUid);
    });
  } else {
    cl("No user signed in");
  }
}

function updateScoreInBackend(playerUid, newScore) {
  const playerScoreRef = ref(db, `games/${gameCode}/players/${playerUid}/score`);
  set(playerScoreRef, newScore);
}

export { updateScoreInBackend };
