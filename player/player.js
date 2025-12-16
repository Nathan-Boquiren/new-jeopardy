const cl = console.log;

const btn = document.getElementById("btn");
const inner = btn.querySelector(".btn-inner");

btn.addEventListener("pointerdown", (e) => {
  animateRipple(e.x, e.y);
  playSound();
});

function animateRipple(x, y) {
  const ripple = document.createElement("div");
  ripple.className = "ripple";
  inner.append(ripple);
  const xOff = x - inner.getBoundingClientRect().left;
  const yOff = y - inner.getBoundingClientRect().top;
  ripple.style.setProperty("--xOff", `${xOff}px`);
  ripple.style.setProperty("--yOff", `${yOff}px`);
  setTimeout(() => {
    ripple.remove();
  }, 500);
}

function playSound() {
  const sound = new Audio("../assets/sfx/duolingo-sfx.mp3");
  sound.play();
}
