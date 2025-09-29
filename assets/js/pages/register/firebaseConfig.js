import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLM9nVqqW9Pp2Efi1TtP-MeBdm9493YR0",
  authDomain: "pausaprogramada-943e2.firebaseapp.com",
  databaseURL: "https://pausaprogramada-943e2-default-rtdb.firebaseio.com",
  projectId: "pausaprogramada-943e2",
  storageBucket: "pausaprogramada-943e2.firebasestorage.app",
  messagingSenderId: "53008781152",
  appId: "1:53008781152:web:5a74f5f3186530e84bd805",
  measurementId: "G-N6F9LDQXTK"
};


const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };