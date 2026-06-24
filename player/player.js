import { db, auth, onAuthStateChanged, ref, set, child, get, onValue, serverTimestamp } from "../firebase.js";

// DOM Elements
const form = document.getElementById("join-game-page");
const finalJeopardyPage = document.getElementById("final-jeopardy-page");
const scoreWrappers = document.querySelectorAll(".score-wrapper");
const nameWrapper = document.getElementById("player-name");
const btn = document.getElementById("btn");
const inner = btn.querySelector(".btn-inner");
const wagerForm = document.getElementById("wager-amount-form");
const wagerInput = document.getElementById("wager-amount");
const finalAnswerForm = document.getElementById("final-answer-form");
const finalInput = document.getElementById("answer-input");

let playerId;
let gameCode;
let playerCanBuzzIn = false;
let hasAlreadyBuzzed = false;
let currentQuestionId = null;
let currentBuzzWinner = null;

onAuthStateChanged(auth, (user) => {
  setUserId(user.uid);
});

function setUserId(id) {
  playerId = id;
}

// write data
function createPlayerInDB({ code, playerId, name }) {
  get(ref(db, `games/${code}`)).then((ss) => {
    if (!ss.exists()) {
      form.querySelector("p").innerText = "Game does not exist. Please check the code.";
      return;
    }

    gameCode = code;
    renderPlayerName(name);
    form.classList.add("hidden");

    const playerRef = ref(db, `games/${gameCode}/players/${playerId}`);
    get(playerRef).then((playerSnapshot) => {
      const existing = playerSnapshot.val();
      const initialScore = existing && typeof existing.score === "number" ? existing.score : 0;
      set(playerRef, {
        name: name,
        score: initialScore,
      });
    });

    // On score value change
    onValue(ref(db, `games/${gameCode}/players/${playerId}/score`), (snapshot) => {
      const score = snapshot.val();
      scoreWrappers.forEach((el) => (el.innerText = score));
    });

    // on question showing state change - reset buzz when question becomes active
    onValue(ref(db, `games/${gameCode}/questionActive`), (ss) => {
      const state = ss.val();
      playerCanBuzzIn = state;
      if (state) hasAlreadyBuzzed = false;
      updatePlayerStatus();
    });

    // on buzz in winner change
    onValue(ref(db, `games/${gameCode}/buzzInWinner`), (ss) => {
      currentBuzzWinner = ss.val();
      updatePlayerStatus();
    });

    // On final jeopardy state change
    onValue(ref(db, `games/${gameCode}/finalJeopardy`), (ss) => {
      const state = ss.val();
      if (state) controlFinalJeopardy(state);
    });
  });
}

// MAIN STUFF

form.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!playerId) {
    const errorText = form.querySelector("p");
    if (errorText) {
      errorText.innerText = "Connecting to server... Please try again in a moment.";
    } else {
      alert("Connecting to server... Please try again in a moment.");
    }
    return;
  }

  const data = getPlayerData();
  createPlayerInDB(data);
});

function getPlayerData() {
  let code = form.querySelector("#game-id-input").value;
  code = code.replace(/\s/g, "");
  const name = form.querySelector("#name-input").value;
  return { code, playerId, name };
}

function renderPlayerName(name) {
  nameWrapper.innerText = name;
}

function buzzIn() {
  set(ref(db, `games/${gameCode}/buzzes/${playerId}`), {
    timestamp: serverTimestamp(),
    playerId,
  });
}

// MAIN PAGE

btn.addEventListener("pointerdown", (e) => {
  if (!playerCanBuzzIn || hasAlreadyBuzzed || currentBuzzWinner) return;
  hasAlreadyBuzzed = true;
  updatePlayerStatus();
  animateRipple(e.x, e.y);
  playSound();
  buzzIn();
});

function updatePlayerStatus() {
  const statusMsg = document.getElementById("status-msg");
  if (!statusMsg) return;

  if (!playerCanBuzzIn) {
    btn.classList.remove("buzz-winner", "buzz-loser");
    btn.classList.remove("can-buzz");
    statusMsg.innerText = "Waiting for next question...";
    return;
  }

  // Active question state
  const isClickable = !hasAlreadyBuzzed && !currentBuzzWinner;
  btn.classList.toggle("can-buzz", isClickable);

  if (currentBuzzWinner) {
    if (currentBuzzWinner.uid === playerId) {
      btn.classList.add("buzz-winner");
      btn.classList.remove("buzz-loser");
      statusMsg.innerText = "YOUR TURN!";
    } else {
      btn.classList.add("buzz-loser");
      btn.classList.remove("buzz-winner");
      statusMsg.innerText = `${currentBuzzWinner.name} buzzed in!`;
    }
  } else {
    btn.classList.remove("buzz-winner", "buzz-loser");
    if (hasAlreadyBuzzed) {
      statusMsg.innerText = "Buzzed in! Waiting...";
    } else {
      statusMsg.innerText = "BUZZ IN!";
    }
  }
}

function animateRipple(x, y) {
  const ripple = Object.assign(document.createElement("div"), { className: "ripple" });
  inner.append(ripple);
  const xOff = x - inner.getBoundingClientRect().left;
  const yOff = y - inner.getBoundingClientRect().top;
  ripple.style.setProperty("--xOff", `${xOff}px`);
  ripple.style.setProperty("--yOff", `${yOff}px`);
  setTimeout(() => ripple.remove(), 500);
}

function playSound() {
  const sound = new Audio("../assets/sfx/duolingo-sfx.mp3");
  sound.play();
}

// FINAL JEOPARDY

function controlFinalJeopardy(state) {
  if (state) {
    finalJeopardyPage.classList.add("show");
    const score = parseInt(scoreWrappers[0].innerText, 10) || 0;
    if (score <= 0) {
      wagerInput.setAttribute("max", "0");
      wagerInput.value = "0";
      wagerForm.classList.add("hidden");
      setFinalJeopardyBackendData("wager", 0);
    } else {
      wagerInput.setAttribute("max", score);
    }
  } else {
    closeFinalJeopardy();
  }
}

wagerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = wagerInput.value;
  wagerForm.classList.add("hidden");
  setTimeout(() => wagerForm.remove(), 500);

  setFinalJeopardyBackendData("wager", amount);
});

finalAnswerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const answer = finalInput.value;
  setFinalJeopardyBackendData("answer", answer);
  closeFinalJeopardy();
});

function closeFinalJeopardy() {
  finalJeopardyPage.classList.add("closed-answer");
  const playerFinalRef = ref(db, `games/${gameCode}/players/${playerId}/finalize`);
  onValue(playerFinalRef, (ss) => {
    const state = ss.val();
    const finalScorePage = document.getElementById("final-score-page");
    if (state) finalScorePage.classList.add("show");
  });
}

// final jeopardy backend stuff

function setFinalJeopardyBackendData(dataType, data) {
  const dataRef = ref(db, `games/${gameCode}/players/${playerId}/finalJeopardy/${dataType}/`);
  set(dataRef, data);
}
