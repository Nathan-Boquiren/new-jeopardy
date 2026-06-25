import {
  onDisconnect,
  auth,
  onAuthStateChanged,
  db,
  ref,
  set,
  onValue,
  get,
  child,
  runTransaction,
  onChildAdded,
  serverTimestamp,
} from "../firebase.js";
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

  const hostId = host.uid;

  gameCode = generateCode();
  const codeHtml = generateCodeHtml(gameCode);
  gameCodeWrapper.innerHTML = codeHtml;

  const gameRef = ref(db, `games/${gameCode}`);
  createDisconnect(gameRef);

  set(gameRef, {
    hostId: hostId,
    createdAt: Date.now(),
    questionActive: false,
    buzzes: {},
  });

  const playersRef = ref(db, `games/${gameCode}/players`);

  onChildAdded(playersRef, (ss) => {
    const player = ss.val();
    const uid = ss.key;
    const existingPlayer = game.players.find((p) => p.uid === uid);
    if (!existingPlayer) {
      game.addPlayer(player.name, uid);
    }
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
    .catch((err) => console.error("Failed to schedule onDisconnect", err));
}

function updateScoreInBackend(playerUid, newScore) {
  const playerScoreRef = ref(db, `games/${gameCode}/players/${playerUid}/score`);
  set(playerScoreRef, newScore);
}

let buzzListenerUnsubscribe = null;
let isProcessingBuzz = false;

function startBuzzListener() {
  isProcessingBuzz = false;
  const buzzesRef = ref(db, `games/${gameCode}/buzzes`);

  buzzListenerUnsubscribe = onValue(buzzesRef, (ss) => {
    if (isProcessingBuzz) return;
    const buzzIns = ss.val();
    if (!buzzIns || Object.keys(buzzIns).length === 0) return;

    const earliestPlayerId = getEarliestPlayerId(buzzIns);
    if (!earliestPlayerId) return;

    const winnerPlayer = game.players.find((p) => p.uid === earliestPlayerId);
    if (!winnerPlayer) return;

    const buzzInWinnerRef = ref(db, `games/${gameCode}/buzzInWinner`);

    isProcessingBuzz = true;
    runTransaction(buzzInWinnerRef, (currentValue) => {
      if (currentValue === null) {
        return {
          uid: winnerPlayer.uid,
          name: winnerPlayer.name,
        };
      }
      return;
    })
      .then((result) => {
        if (!result.committed) return;
        displayBuzzWinner(winnerPlayer.name);
        startCountdown(30);
        stopBuzzListener();
      })
      .catch((error) => {
        console.error(error);
        isProcessingBuzz = false;
      });
  });
}

function stopBuzzListener() {
  if (buzzListenerUnsubscribe) {
    buzzListenerUnsubscribe();
    buzzListenerUnsubscribe = null;
  }
}

function setFinalJeopardyState(state) {
  const finalJeopardyRef = ref(db, `games/${gameCode}/finalJeopardy`);
  set(finalJeopardyRef, state);

  const playersRef = ref(db, `games/${gameCode}/players`);

  onValue(playersRef, (ss) => {
    const players = ss.val();
    if (!players) return;

    const allHaveWager = Object.values(players).every((player) => player.finalJeopardy && "wager" in player.finalJeopardy);

    if (allHaveWager) {
      setWagerAmounts(players);
      game.questions.finalJeopardy.showQuestion();
    }
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
  if (state) {
    resetBuzzIns().then(() => {
      const stateRef = ref(db, `games/${gameCode}/questionActive`);
      set(stateRef, true);
      startBuzzListener();
    });
  } else {
    const stateRef = ref(db, `games/${gameCode}/questionActive`);
    set(stateRef, false);
    stopBuzzListener();
    resetBuzzIns();
  }
}

function resetBuzzIns() {
  const buzzesRef = ref(db, `games/${gameCode}/buzzes`);
  const buzzInWinnerRef = ref(db, `games/${gameCode}/buzzInWinner`);
  return Promise.all([set(buzzesRef, {}), set(buzzInWinnerRef, null)]);
}

function setWagerAmounts(players) {
  Object.keys(players).forEach((uid) => {
    const fj = players[uid]?.finalJeopardy;
    if (!fj || !("wager" in fj)) return;

    const player = game.players.find((p) => p.uid === uid);
    if (player) player.wagerAmount = fj.wager;
  });
}

function finalizeScore(uid) {
  const playerFinalRef = ref(db, `games/${gameCode}/players/${uid}/finalize`);
  set(playerFinalRef, true);
}

function removePlayerFromBackend(playerUid) {
  const playerRef = ref(db, `games/${gameCode}/players/${playerUid}`);
  set(playerRef, null);
}

export { updateScoreInBackend, setQuestionActiveState, setFinalJeopardyState, finalizeScore, removePlayerFromBackend };
