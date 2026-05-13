// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBR1QwkeTjrwSQFE6Jm9RweNdKK2sz7hyA",
  authDomain: "gater-15268.firebaseapp.com",
  projectId: "gater-15268",
  storageBucket: "gater-15268.firebasestorage.app",
  messagingSenderId: "228451199879",
  appId: "1:228451199879:web:ffc4374bf816327bde8122",
  measurementId: "G-ZCVWRGQQVR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { app, auth, analytics };