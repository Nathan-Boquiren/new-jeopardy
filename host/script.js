import {
  updateScoreInBackend,
  setQuestionActiveState,
  setFinalJeopardyState,
  finalizeScore,
  removePlayerFromBackend,
  buzzPermissionToggle,
} from "./host.js";

// ========== DOM Elements ==========
const createGameBtn = document.getElementById("create-game");
const startBtn = document.getElementById("start-btn");
const questionSelector = document.getElementById("question-selector");
const topicNameWrappers = document.querySelectorAll(".topic-name");
const categoriesContainer = document.getElementById("game-board");
const popUp = document.getElementById("question-answer");
const questionWrapper = document.getElementById("question-wrapper");
const showAnswerBtn = document.getElementById("show-answer-btn");
const returnBtn = document.getElementById("return-btn");
const timerBar = document.getElementById("timer-bar");

const playersContainer = document.getElementById("players-container");
const timeMsg = document.getElementById("time-msg");
const finalJeopardyBtn = document.getElementById("final-jeopardy-btn");
const winnerContainer = document.getElementById("winner-container");
const endPageHeader = document.getElementById("winner-header");
const cl = console.log;

const jeopardyTheme = new Audio("../assets/sfx/final-jeopardy-theme.mp3");

// ========== Variables ==========
let game;

// Get selected category path from dropdown
function getCategoryPath() {
  cl(questionSelector.value);
  return questionSelector.value;
}

// ========== Classes ==========
class Game {
  constructor(categoryPath) {
    this.categoryPath = categoryPath;
    this.players = [];
    this.questions = {};
    this.currentPrice = 0;
    this.topicName = "";
  }

  buildQuestions() {
    this.getQuestions()
      .then((questions) => {
        this.questions = questions;
        this.topicName = this.questions.topicName;
        topicNameWrappers.forEach((wpr) => (wpr.innerText = this.topicName));
      })
      .catch((err) => console.error("Failed to load questions:", err));
  }

  initialize() {
    document.getElementById("start-page").classList.add("hidden");
    this.renderBoard();
  }

  renderBoard() {
    populateCategories(this.questions.mainCategories);
    renderPlayers();
  }

  async getQuestions() {
    return fetch(this.categoryPath)
      .then((res) => res.json())
      .then((data) => {
        return {
          topicName: data.topicName,
          mainCategories: data.mainCategories.map((category) => new Category(category)),
          finalJeopardy: new FinalJeopardy(data.finalJeopardy.question, data.finalJeopardy.answer),
        };
      })
      .catch((error) => console.error("JSON fetch error:", error));
  }

  addPlayer(name, uid) {
    const player = new Player(name, uid);
    this.players.push(player);
    player.renderNameTag(document.getElementById("name-list"));
  }

  getHighestScore() {
    return Math.max(...this.players.map((p) => p.score));
  }

  updateWinners() {
    this.players.forEach((player) => player.scoreWrapper.classList.toggle("highest-score", player.score === this.getHighestScore()));
  }

  end() {
    document.body.classList.add("show-end-screen");
    const winners = this.players.filter((p) => p.score === this.getHighestScore());

    if (!winners.length) {
      endPageHeader.textContent = "There are no winners. Y'all are a bunch of";
      winnerContainer.innerHTML = '<img src="../assets/imgs/dum-dums.jpg">';
    } else {
      const isTie = winners.length > 1;
      endPageHeader.textContent = `The Winner${isTie ? "s are" : " is"}:`;

      winnerContainer.innerHTML = winners
        .map((p) => `<span class="winner-name accent-font depth">${p.name}</span>`)
        .join(isTie ? '<p class="accent-font">,</p> ' : "");
    }
  }

  // helper function
  fetchQuestionData() {
    fetch(this.categoryPath)
      .then((res) => res.json())
      .then((data) => {
        return data;
      })
      .catch((error) => console.error("JSON fetch error:", error));
  }
}

class Player {
  constructor(name, uid) {
    this.name = name;
    this.uid = uid;
    this.score = 0;
    this.el = this.renderElement();
    this.scoreWrapper = this.el.querySelector(".player-score");
  }

  renderNameTag(parentContainer) {
    const nameElement = document.createElement("li");
    nameElement.classList.add("depth");
    nameElement.innerText = this.name;
    parentContainer.append(nameElement);
  }

  renderElement() {
    const el = document.createElement("div");
    el.classList.add("player-container", "depth");
    const nameWrapper = createElement("div", ["player-name-wrapper", "accent-font"], this.name);
    const scoreWrapper = this.renderScoreWrapper();
    const moreBtn = this.renderMoreBtn();
    const moreMenu = createElement("ul", ["more-menu", "depth"]);
    const deleteBtn = createElement("li", "delete-player", "delete");
    moreMenu.append(deleteBtn);
    deleteBtn.addEventListener("click", () => this.delete());

    el.append(nameWrapper, scoreWrapper, moreBtn, moreMenu);
    return el;
  }

  renderScoreWrapper() {
    const el = document.createElement("span");
    el.classList.add("player-score", "accent-font");
    el.innerText = this.score;

    el.addEventListener("click", (e) => {
      const multiplier = e.shiftKey ? -1 : 1;
      this.updateScore(multiplier * game.currentPrice);
    });

    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.updateScore(-game.currentPrice);
    });

    return el;
  }

  renderMoreBtn() {
    const el = createElement("label", "more-btn");
    const ghostCheckBox = document.createElement("input");
    ghostCheckBox.type = "checkbox";
    ghostCheckBox.id = `more-btn-${this.name.replace(/\s+/g, "-")}`;
    el.setAttribute("for", ghostCheckBox.id);
    el.append(ghostCheckBox, document.createElement("span"), document.createElement("span"), document.createElement("span"));
    return el;
  }

  updateScore(points) {
    this.score += points;
    this.scoreWrapper.innerText = this.score;
    game.updateWinners();
    updateScoreInBackend(this.uid, this.score);
  }

  addFinalScoreBtns() {
    this.scoreWrapper.classList.add("disabled");

    const btnsContainer = createElement("div", "final-answer-status");
    const answerRightBtn = createElement("span", "answer-right");
    answerRightBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#fff"><path d="m424-408-86-86q-11-11-28-11t-28 11q-11 11-11 28t11 28l114 114q12 12 28 12t28-12l226-226q11-11 11-28t-11-28q-11-11-28-11t-28 11L424-408Zm56 328q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>';

    const answerWrongBtn = createElement("span", "answer-wrong");
    answerWrongBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#fff"><path d="m480-424 116 116q11 11 28 11t28-11q11-11 11-28t-11-28L536-480l116-116q11-11 11-28t-11-28q-11-11-28-11t-28 11L480-536 364-652q-11-11-28-11t-28 11q-11 11-11 28t11 28l116 116-116 116q-11 11-11 28t11 28q11 11 28 11t28-11l116-116Zm0 344q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>';

    const btns = [answerRightBtn, answerWrongBtn];
    btnsContainer.append(answerRightBtn, answerWrongBtn);
    this.el.append(btnsContainer);

    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.finalizeScore(btn.classList.contains("answer-right"));
        if (this.el === playersContainer.lastElementChild) game.end();
      });
    });
  }

  finalizeScore(answeredRight = false) {
    this.wagerAmount = Number(this.wagerAmount);
    this.score += answeredRight ? this.wagerAmount : -this.wagerAmount;
    this.scoreWrapper.innerText = this.score;
    updateScoreInBackend(this.uid, this.score);
    finalizeScore(this.uid);
    this.el.querySelector(".final-answer-status").remove();
  }

  delete() {
    if (confirm(`Remove player "${this.name}"?`)) {
      const idx = game.players.indexOf(this);
      if (idx !== -1) {
        game.players.splice(idx, 1);
        renderPlayers();
        removePlayerFromBackend(this.uid);
      }
    }
  }
}

class Category {
  constructor(category) {
    this.name = category.name;
    this.questions = this.getQuestions(category.questions);
    this.el = this.renderElement();
  }

  getQuestions(itemData) {
    return Object.fromEntries(
      Object.entries(itemData).map(([points, data]) => [points, new JeopardyItem(this.name, data, parseInt(points, 10))]),
    );
  }

  renderElement() {
    const el = document.createElement("div");
    el.classList.add("category-column");
    const header = document.createElement("div");
    header.classList.add("category-header", "txt-shadow", "depth", "accent-font");
    header.innerHTML = this.name;
    el.append(header);
    for (let i = 200; i <= 1000; i += 200) {
      el.append(this.questions[`${i}`].el);
    }
    return el;
  }
}

class JeopardyItem {
  constructor(catName, { question, answer }, price) {
    this.categoryName = catName;
    this.question = question;
    this.answer = answer;
    this.price = price;
    this.el = this.renderElement();
  }

  renderElement() {
    const el = document.createElement("div");
    el.classList.add("prblm-btn", "depth", "txt-shadow", "accent-font");
    el.innerText = this.price;
    el.addEventListener("click", () => this.showQuestion());
    return el;
  }

  showQuestion() {
    this.el.classList.add("clicked");
    popUp.classList.add("show-question");
    popUp.querySelector(".price").innerText = this.price;

    timerBar.style.setProperty("--width", "100%");

    game.currentPrice = this.price;

    const category = game.questions.mainCategories.find((cat) => cat.name === this.categoryName);
    const question = category.questions[this.price].question;
    const answer = category.questions[this.price].answer;

    popUp.querySelector(".category").innerHTML = this.categoryName;
    popUp.querySelector("#question-txt").innerHTML = question;
    popUp.querySelector("#answer-txt").innerHTML = answer;

    // Log question and answer in console for host
    logQA(this.categoryName, this.price, question, answer);

    // Add event listener to Buzz Permission Toggle
    buzzPermissionToggle.addEventListener("click", activateBuzzPermission);
  }
}

// Helper function to set question active state in backend
function activateBuzzPermission() {
  console.log("Players can buzz in!");
  buzzPermissionToggle.classList.toggle("enabled");
  setQuestionActiveState(true);
}

function logQA(category, price, question, answer) {
  const clean = answer.replace(/<img[^>]*>/gi, "");
  console.group(`${category} - $${price}`);
  console.log("%cQ:", "font-weight: bold; color: #4FC3F7", question);
  console.log("%cA:", "font-weight: bold; color: #81C784", clean);
  console.groupEnd();
}

class FinalJeopardy {
  constructor(question, answer) {
    this.categoryName = "Final Jeopardy";
    this.question = question;
    this.answer = answer;
    this.audio = document.getElementById("jeopardy-theme");
  }

  showWager() {
    popUp.classList.add("show-wager");
    timerBar.style.width = "100%";
    // Enable final jeopardy mode in backend
    setFinalJeopardyState(true);
  }

  showQuestion() {
    this.enableFinalJeopardyControl();

    popUp.classList.replace("show-wager", "show-question");

    popUp.querySelector(".price").innerText = "D.O.N.";

    popUp.querySelector(".category").innerHTML = this.categoryName;
    popUp.querySelector("#question-txt").innerHTML = this.question;
    popUp.querySelector("#answer-txt").innerHTML = this.answer;

    game.players.forEach((p) => p.addFinalScoreBtns());
  }

  enableFinalJeopardyControl() {
    const handler = async (e) => {
      if (e.key === " ") {
        e.preventDefault();
        if (this.audio.paused) {
          this.audio.play();
          startCountdown(90);
          await delay(90000);
          setFinalJeopardyState(false);
        }
      } else if (e.key === "p") {
        this.audio.paused ? this.audio.play() : this.audio.pause();
      }
    };
    document.addEventListener("keydown", handler);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

createGameBtn.addEventListener("click", () => {
  game = new Game(getCategoryPath());
  game.buildQuestions();
});

// ========== Start Page ==========

startBtn.addEventListener("click", () => game.initialize());

// populate category elements
function populateCategories(categories) {
  categories.forEach((category) => categoriesContainer.append(category.el));
}

showAnswerBtn.addEventListener("click", () => {
  popUp.classList.add("show-answer");
  game.questions.finalJeopardy.audio.pause();
});

returnBtn.addEventListener("click", () => {
  popUp.className = "";
  setQuestionActiveState(false);
  if (document.querySelector(".buzz-winner-wrapper")) document.querySelector(".buzz-winner-wrapper").remove();
});

// ===== Display Player Buzz in Winner =====
function displayBuzzWinner(playerName) {
  const winnerNameWrapper = createElement("div", ["buzz-winner-wrapper", "pill-btn"], `Buzz In Winner: ${playerName}`);
  popUp.append(winnerNameWrapper);
}

// ===== player elements =====

function renderPlayers() {
  playersContainer.innerHTML = "";
  game.players.forEach((player) => playersContainer.append(player.el));
}

// ===== TIMER =====
function startCountdown(duration) {
  const start = performance.now();

  function update(now) {
    const elapsed = (now - start) / 1000;
    const remaining = Math.max(0, duration - elapsed);
    const percent = (remaining / duration) * 100;
    timerBar.style.setProperty("--width", `${percent}%`);

    const isVisible = getComputedStyle(questionWrapper).display !== "none";

    if (remaining > 0 && isVisible) {
      requestAnimationFrame(update);
    } else if (remaining <= 0 && isVisible) {
      timerBar.style.setProperty("--width", "100%");
      timeMsg.classList.add("show");
      setTimeout(() => {
        timeMsg.classList.remove("show");
      }, 2000);
    } else if (remaining <= 0 && !isVisible) {
      timerBar.style.setProperty("--width", "100%");
    }
  }

  requestAnimationFrame(update);
}

// ===== FINAL JEOPARDY =====
finalJeopardyBtn.addEventListener("click", () => game.questions.finalJeopardy.showWager());

function createElement(tag, classes = [], text = "") {
  const element = document.createElement(tag);

  if (typeof classes === "string") {
    element.classList.add(classes);
  } else if (Array.isArray(classes)) {
    element.classList.add(...classes);
  }

  if (text) element.innerText = text;
  return element;
}

export { game, startCountdown, displayBuzzWinner, activateBuzzPermission };
