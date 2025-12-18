import { db, auth, onAuthStateChanged, ref, set, child, get, onValue } from "../firebase.js";

const cl = console.log;

let playerId;

onAuthStateChanged(auth, (user) => {
  setUserId(user.uid);
  if (user) cl("User UID:", user.uid);
});

function setUserId(id) {
  playerId = id;
}

// write data
function writeUserData({ gameCode, playerId, name }) {
  set(ref(db, `games/${gameCode}/players/${playerId}`), {
    name: name,
    score: 0,
  });

  // On value change
  onValue(ref(db, `games/${gameCode}/players/${playerId}/score`), (snapshot) => {
    const score = snapshot.val();
    cl(score);
    document.getElementById("score-wrapper").innerText = score;
  });
}

// MAIN STUFF

const btn = document.getElementById("btn");
const inner = btn.querySelector(".btn-inner");
const form = document.getElementById("join-game-form");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = getPlayerData();
  writeUserData(data);

  form.classList.add("hidden");
});

function getPlayerData() {
  const gameCode = form.querySelector("#game-id-input").value;
  const name = form.querySelector("#name-input").value;
  return { gameCode, playerId, name };
}

// MAIN PAGE

btn.addEventListener("pointerdown", (e) => {
  animateRipple(e.x, e.y);
  playSound();
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
