# Real-time Jeopardy Web Game

A modern, real-time multiplayer Jeopardy game built using **HTML, CSS, JavaScript, and Firebase**. One person hosts the game on a main screen (like a TV or projector), and players connect using their smartphones as buzzers and controllers!

---

## 🎮 How it Works

1. **The Host** launches the game, selects a question category, and displays the game board on a shared screen.
2. **The Players** join using a 6-digit Game ID on their own devices.
3. **The Game Loop**:
   - The host clicks a point value on the board to reveal a question.
   - The buzzer buttons on the players' phones activate.
   - The fastest player to buzz in locks out the others and gets to answer the question.
   - The host updates the player's score depending on whether they got the answer right or wrong.
   - Once all questions are cleared, the game enters **Final Jeopardy** where players wager their points on a final clue!

---

## 🖥️ How to Host the Game

### 1. Launch the Game
- Open `index.html` in your browser and click the **Host** button.
- Select a question pack from the dropdown menu (e.g., Christmas, Father's Day, Thanksgiving, etc.).
- Click **Create Game**. A unique 6-digit **Game Code** will appear on the screen.

### 2. Wait for Players
- Share the **Game Code** with your players.
- As players join, their usernames will appear on the lobby list.
- Click **Start Game** once everyone is in.

### 3. Manage the Board & Scores
- **Select Clues**: Click on any point value (e.g., $200, $400) to display the question.
- **Answer Timer**: Once a player buzzes in, a 30-second timer begins.
- **Reveal Answer**: Click **See Answer** once the player has spoken.
- **Score Controls**:
  - **Left-Click** on a player's score to **add** the current clue points.
  - **Right-Click** (or **Shift + Left-Click**) on a player's score to **subtract** the clue points if they answered incorrectly.
- **Return to Board**: Click **Game Board** to close the question popup and choose the next clue.
- **Remove Players**: If a player leaves early, hover over their card, click the options menu (`...`), and select **delete** to safely remove them from the database.

---

## 📱 How to Play (Player Guide)

### 1. Join the Game
- Go to the landing page and click **Player** (or open the `/player/player.html` link).
- Enter the 6-digit **Game ID** shown on the Host screen, choose a unique nickname, and click **Join**.

### 2. Buzzing In
- When the Host selects a question, your screen will light up with a large golden **BUZZ IN!** button.
- Tap the button as quickly as possible.
- If you are the fastest:
  - Your buzzer will turn **Green** and say **YOUR TURN!**
  - Say your answer out loud for the Host to hear.
- If another player beats you:
  - Your button will fade to **Gray** and display who buzzed in first.

### 3. Final Jeopardy
- If you have points when Final Jeopardy starts, enter the amount you want to risk in the wager form and tap **Wager**.
- Once the clue is revealed, type your answer in the text box and tap **Submit**.
- If your score is `$0` or negative, you will be automatically checked in with a `$0` wager.

---

## ⚙️ Technical Details

- **Database**: Uses Firebase Real-time Database to sync game state instantly.
- **Authentication**: Uses Firebase Anonymous Auth to assign unique player IDs (prevents cross-talk and preserves score on browser reloads).
- **Audio**: Includes sound effects for buzzers and the classic Jeopardy theme song.
