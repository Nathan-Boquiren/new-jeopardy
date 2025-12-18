import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import { getDatabase, ref, set, child, get, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCq_Zik5IKd4xbiI2a-48BbwJXrvmui46g",
  authDomain: "jeopardy-2025.firebaseapp.com",
  projectId: "jeopardy-2025",
  storageBucket: "jeopardy-2025.firebasestorage.app",
  messagingSenderId: "15291614982",
  appId: "1:15291614982:web:dd601ba3944caaf50f8087",
  databaseURL: "https://jeopardy-2025-default-rtdb.firebaseio.com",
  measurementId: "G-5YHZVRVNK9",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const db = getDatabase(app);

// Sign in anonymously on app load
signInAnonymously(auth)
  .then(() => console.log("Signed in anonymously"))
  .catch((error) => console.error(error));

export { onDisconnect, app, auth, onAuthStateChanged, analytics, db, ref, set, child, get, onValue };
