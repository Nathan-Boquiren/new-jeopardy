import { db, auth, onAuthStateChanged, ref, set, child, get, onValue } from "../firebase.js";

const cl = console.log;
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

onAuthStateChanged(auth, (user) => {
  setUserId(user.uid);
  if (user) cl("User UID:", user.uid);
});

function setUserId(id) {
  playerId = id;
}

// write data
function createPlayerInDB({ code, playerId, name }) {
  get(ref(db, `games/${code}`)).then((ss) => {
    if (!ss.exists()) {
      console.error("Game does not exist", code);
      return;
    }

    gameCode = code;
    renderPlayerName(name);
    form.classList.add("hidden");

    set(ref(db, `games/${gameCode}/players/${playerId}`), {
      name: name,
      score: 0,
    });

    // On score value change
    onValue(ref(db, `games/${gameCode}/players/${playerId}/score`), (snapshot) => {
      const score = snapshot.val();
      scoreWrappers.forEach((el) => (el.innerText = score));
    });

    // on question showing state change
    onValue(ref(db, `games/${gameCode}/questionActive`), (ss) => {
      const state = ss.val();
      playerCanBuzzIn = state;
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
  cl("pressed");
  set(ref(db, `games/${gameCode}/buzzes/${playerId}`), {
    timestamp: Date.now(),
    playerId,
  });
}

// MAIN PAGE

btn.addEventListener("pointerdown", (e) => {
  if (!playerCanBuzzIn) return;
  animateRipple(e.x, e.y);
  playSound();
  buzzIn();
});

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
    const score = scoreWrappers[0].innerText;
    wagerInput.setAttribute("max", score);
  } else {
    cl("Final jeopardy closed");
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
