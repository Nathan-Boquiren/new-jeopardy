import { db, auth, onAuthStateChanged, ref, set, child, get, onValue } from "../firebase.js";

const cl = console.log;
// DOM Elements
const btn = document.getElementById("btn");
const inner = btn.querySelector(".btn-inner");
const form = document.getElementById("join-game-form");
const scoreWrapper = document.getElementById("score-wrapper");
const nameWrapper = document.getElementById("player-name");

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
function createPlayerInDB({ gameCode, playerId, name }) {
  set(ref(db, `games/${gameCode}/players/${playerId}`), {
    name: name,
    score: 0,
  });

  // On score value change
  onValue(ref(db, `games/${gameCode}/players/${playerId}/score`), (snapshot) => {
    const score = snapshot.val();
    scoreWrapper.innerText = score;
  });

  // on question showing state change
  onValue(ref(db, `games/${gameCode}/questionActive`), (ss) => {
    const state = ss.val();
    playerCanBuzzIn = state;
  });
}

// MAIN STUFF

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = getPlayerData();
  createPlayerInDB(data);
  renderPlayerName(data.name);
  form.classList.add("hidden");
});

function getPlayerData() {
  const code = form.querySelector("#game-id-input").value;
  gameCode = code;
  const name = form.querySelector("#name-input").value;
  return { gameCode, playerId, name };
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
