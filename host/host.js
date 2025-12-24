const cl = console.log;

import { onDisconnect, auth, onAuthStateChanged, db, ref, set, onValue, get, child, runTransaction, onChildAdded } from "../firebase.js";
import { game, startCountdown, displayBuzzWinner } from "./script.js";

// DOM Elements
const startPage = document.getElementById("start-page");
const createGameBtn = document.getElementById("create-game");
const gameCodeWrapper = document.getElementById("game-code");

let gameCode;

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000);
}

onAuthStateChanged(auth, (user) => {
  createGameBtn.addEventListener("click", () => {
    createGame(user);
    startPage.classList.add("game-created");
    setTimeout(() => createGameBtn.remove(), 1100);
  });
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
  const codeHtml = generateCodeHtml(gameCode);
  gameCodeWrapper.innerHTML = codeHtml;

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

  onChildAdded(playersRef, (ss) => {
    const player = ss.val();
    const uid = ss.key;
    game.addPlayer(player.name, uid);
  });
}

function generateCodeHtml(code) {
  const codeArr = code.toString().split("").map(Number);
  const html = codeArr
    .map((ch, i) => {
      const el = document.createElement("span");
      el.innerText = ch;
      el.style.setProperty("--delay", `${i * 100}ms`);
      return el.outerHTML;
    })
    .join("");
  return html;
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
    const buzzIns = ss.val();
    if (!buzzIns) return;

    const earliestPlayerId = getEarliestPlayerId(buzzIns);
    if (!earliestPlayerId) return;

    const winnerPlayer = game.players.find((p) => p.uid === earliestPlayerId);
    if (!winnerPlayer) return;

    const buzzInWinnerRef = ref(db, `games/${gameCode}/buzzInWinner`);

    runTransaction(buzzInWinnerRef, (currentValue) => {
      if (currentValue === null) return winnerPlayer;
      return;
    })
      .then((result) => {
        if (!result.committed) return;

        displayBuzzWinner(winnerPlayer.name);
        startCountdown(30);
      })
      .catch((error) => console.error(error));
  });
}

function setFinalJeopardyState(state) {
  cl("Final Jeopardy");
  const finalJeopardyRef = ref(db, `games/${gameCode}/finalJeopardy`);
  set(finalJeopardyRef, state);

  const playersRef = ref(db, `games/${gameCode}/players`);

  onValue(playersRef, (ss) => {
    const players = ss.val();
    if (!players) return;

    const allHaveWager = Object.values(players).every((player) => player.finalJeopardy && "wager" in player.finalJeopardy);
    cl("all have wager: " + allHaveWager);

    // ========== WORK ON THIS ==========
    // ========== WORK ON THIS ==========
    // ========== WORK ON THIS ==========
    if (allHaveWager && game.finalJeopardy) game.finalJeopardy.showQuestion();
    // ========== WORK ON THIS ==========
    // ========== WORK ON THIS ==========
    // ========== WORK ON THIS ==========
    // ========== WORK ON THIS ==========
    // ========== WORK ON THIS ==========
  });
}

function getEarliestPlayerId(buzzIns) {
  let earliestTimestamp = Infinity;
  let earliestPlayerId = null;
  Object.keys(buzzIns).forEach((playerId) => {
    const buzz = buzzIns[playerId];
    if (buzz.timestamp < earliestTimestamp) {
      earliestTimestamp = buzz.timestamp;
      earliestPlayerId = playerId;
    }
  });

  return earliestPlayerId;
}

function setQuestionActiveState(state) {
  cl("question active:" + state);
  const stateRef = ref(db, `games/${gameCode}/questionActive`);
  set(stateRef, state);
  resetBuzzIns();
}
function resetBuzzIns() {
  const buzzesRef = ref(db, `games/${gameCode}/buzzes`);
  const buzzInWinnerRef = ref(db, `games/${gameCode}/buzzInWinner`);
  set(buzzesRef, {});
  set(buzzInWinnerRef, null);
}

export { updateScoreInBackend, listenToBuzzes, setQuestionActiveState, setFinalJeopardyState };
