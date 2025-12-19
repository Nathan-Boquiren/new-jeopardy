let cl = console.log;

import { updateScoreInBackend, listenToBuzzes, setQuestionActiveState } from "./host.js";

// ========== DOM Elements ==========
const addPlayerBtn = document.getElementById("add-player-btn");
const formModal = document.getElementById("form-modal");
const playerNameForm = document.getElementById("players-form");
const nameInput = playerNameForm.querySelector("input");
const closeBtns = document.querySelectorAll(".close-btn");
const startBtn = document.getElementById("start-btn");
const topicNameWrappers = document.querySelectorAll(".topic-name");
const categoriesContainer = document.getElementById("game-board");
const popUp = document.getElementById("question-answer");
const questionWrapper = document.getElementById("question-wrapper");
const showAnswerBtn = document.getElementById("show-answer-btn");
const returnBtn = document.getElementById("return-btn");
const playersContainer = document.getElementById("players-container");
const timeMsg = document.getElementById("time-msg");
const finalJeopardyBtn = document.getElementById("final-jeopardy-btn");
const winnerContainer = document.getElementById("winner-container");
const endPageHeader = document.getElementById("winner-header");

// =============== CHANGE ACCORDING TO EVENT ================
const categoryPath = "../questions/thanksgiving-questions.json";
// ==========================================================

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
    cl("Initializing game...");
    document.getElementById("start-page").classList.add("hidden");
    this.renderBoard();
    cl("Game initialized successfully");

    // listen for player buzz-ins in backend database
    listenToBuzzes();
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
      winnerContainer.innerHTML = '<img src="dum-dums.jpg">';
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
        cl(data);
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
    el.addEventListener("click", () => this.updateScore(game.currentPrice));
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
    const answerRightBtn = createElement("span", ["material-symbols-rounded", "answer-right"], "check_circle");
    const answerWrongBtn = createElement("span", ["material-symbols-rounded", "answer-wrong"], "cancel");

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
    this.score *= answeredRight ? 2 : 0;
    this.scoreWrapper.innerText = this.score;
    this.el.querySelector(".final-answer-status").remove();
  }

  delete() {
    const idx = game.players.indexOf(this);
    game.players.splice(idx, 1);
    renderPlayers();
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
      Object.entries(itemData).map(([points, data]) => [points, new JeopardyItem(this.name, data, parseInt(points, 10))])
    );
  }

  renderElement() {
    const el = document.createElement("div");
    el.classList.add("category-column");
    const header = document.createElement("div");
    header.classList.add("category-header", "txt-shadow", "depth", "accent-font");
    header.innerText = this.name;
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

    game.currentPrice = this.price;

    const category = game.questions.mainCategories.find((cat) => cat.name === this.categoryName);
    const question = category.questions[this.price].question;
    const answer = category.questions[this.price].answer;

    cl(`Q: ${question}\nA:${answer.split("<br>")[0]}\n`);

    popUp.querySelector(".category").innerHTML = this.categoryName;
    popUp.querySelector("#question-txt").innerHTML = question;
    popUp.querySelector("#answer-txt").innerHTML = answer;

    //
    // Set Question Active State in backend
    setQuestionActiveState(true);
    //
    //
    // startCountdown(30);
  }
}

class FinalJeopardy {
  constructor(question, answer) {
    this.categoryName = "Final Jeopardy";
    this.question = question;
    this.answer = answer;
  }

  showQuestion() {
    popUp.classList.add("show-question");
    popUp.querySelector(".price").innerText = "D.O.N.";

    cl(`Q: ${this.question}\nA:${this.answer.split("<br>")[0]}\n`);

    popUp.querySelector(".category").innerHTML = this.categoryName;
    popUp.querySelector("#question-txt").innerHTML = this.question;
    popUp.querySelector("#answer-txt").innerHTML = this.answer;

    startCountdown(60);
    game.players.forEach((p) => p.addFinalScoreBtns());
  }
}

// ========== Variables ==========
const game = new Game(categoryPath);
game.buildQuestions();

// ========== Start Page ==========
{
  // Modal Functionality
  addPlayerBtn.addEventListener("click", () => formModal.showModal());
  addPlayerBtn.addEventListener("keypress", (e) => (e.key === "Enter" ? formModal.showModal() : null));
  closeBtns.forEach((btn) => btn.addEventListener("click", () => formModal.close()));

  // Add players
  playerNameForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const playerName = nameInput.value;
    if (playerName.replace(/\s+/g, "") !== "") game.addPlayer(playerName);
    nameInput.value = "";
  });

  // Start Game
  startBtn.addEventListener("click", () => {
    game.initialize();
  });
}

// populate category elements
function populateCategories(categories) {
  categories.forEach((category) => categoriesContainer.append(category.el));
}

showAnswerBtn.addEventListener("click", () => popUp.classList.add("show-answer"));

returnBtn.addEventListener("click", () => {
  popUp.className = "";

  //
  // Set Question Active State in backend
  setQuestionActiveState(false);
  //
  //

  // game.advancePlayer();
});

// ===== player elements =====

function renderPlayers() {
  playersContainer.innerHTML = "";
  game.players.forEach((player) => playersContainer.append(player.el));
}

// ===== TIMER =====
function startCountdown(duration) {
  const timerBar = document.getElementById("timer-bar");
  timerBar.style.width = "100%";
  const start = performance.now();

  function update(now) {
    const elapsed = (now - start) / 1000;
    const remaining = Math.max(0, duration - elapsed);
    const percent = (remaining / duration) * 100;
    timerBar.style.width = `${percent}%`;

    const isVisible = getComputedStyle(questionWrapper).display !== "none";

    if (remaining > 0 && isVisible) {
      requestAnimationFrame(update);
    } else if (remaining <= 0 && isVisible) {
      timerBar.style.width = "100%";
      timeMsg.classList.add("show");
      setTimeout(() => {
        timeMsg.classList.remove("show");
      }, 2000);
    } else if (remaining <= 0 && !isVisible) {
      timerBar.style.width = "100%";
    }
  }

  requestAnimationFrame(update);
}

// ===== FINAL JEOPARDY =====
finalJeopardyBtn.addEventListener("click", () => game.questions.finalJeopardy.showQuestion());

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

export { game, startCountdown };
