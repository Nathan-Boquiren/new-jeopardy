const cl = console.log;

import { onDisconnect, auth, onAuthStateChanged, db, ref, set, onValue } from "./firebase.js";
import { game, startCountdown } from "./script.js";

// DOM Elements
const createGameBtn = document.getElementById("create-game");
const gameCodeWrapper = document.getElementById("game-code");

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
  createGameBtn.addEventListener("click", () => createGame(user));
});

function createGame(host) {
  if (!host) {
    alert("No user signed in");
    return;
  }

  // get host id
  const hostId = host.uid;
  cl("User UID:", hostId);

  // generate game code
  gameCode = generateCode();
  gameCodeWrapper.textContent = gameCode;

  const gameRef = ref(db, `games/${gameCode}`);
  createDisconnect(gameRef);

  // create game in database
  set(gameRef, {
    hostId: hostId,
    createdAt: Date.now(),
    questionActive: false,
    buzzes: {},
  });

  // listen for and add players
  const playersRef = ref(db, `games/${gameCode}/players`);

  onValue(playersRef, (snapshot) => {
    const players = snapshot.val();
    if (!players) return;

    const uids = Object.keys(players);
    const latestPlayerUid = uids[uids.length - 1];
    const latestPlayerName = players[latestPlayerUid].name;
    game.addPlayer(latestPlayerName, latestPlayerUid);
  });
}

function createDisconnect(gameRef) {
  onDisconnect(gameRef)
    .remove()
    .then(() => cl("onDisconnect remove scheduled"))
    .catch((err) => console.error("Failed to schedule onDisconnect", err));
}

function updateScoreInBackend(playerUid, newScore) {
  const playerScoreRef = ref(db, `games/${gameCode}/players/${playerUid}/score`);
  set(playerScoreRef, newScore);
}

function listenToBuzzes() {
  const buzzesRef = ref(db, `games/${gameCode}/buzzes`);
  onValue(buzzesRef, (ss) => {
    const playerBuzzIns = ss.val();
    const buzzInWinner = getEarliestBuzz(playerBuzzIns);
    startCountdown(30);
  });
}

function getEarliestBuzz(buzzIns) {
  const buzzIns = buzzesSnapshot.val();
  if (!buzzIns) return null;

  let earliest = null;
  let earliestTimestamp = Infinity;

  Object.keys(buzzIns).forEach((playerId) => {
    const buzz = buzzIns[playerId];
    if (buzz.timestamp < earliestTimestamp) {
      earliestTimestamp = buzz.timestamp;
      earliest = { playerId, timestamp: buzz.timestamp };
    }
  });

  return earliest;
}

function setQuestionActiveState(state) {
  cl("question active:" + state);
  const stateRef = ref(db, `games/${gameCode}/questionActive`);
  const buzzesRef = ref(db, `games/${gameCode}/buzzes`);
  set(stateRef, state);
  set(buzzesRef, {});
}

export { updateScoreInBackend, listenToBuzzes, setQuestionActiveState };
