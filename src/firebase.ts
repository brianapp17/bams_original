import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDAUo6DmIeAcoyDMhTqIwS6we0tne5yg9g",
  authDomain: "prototipado-ia-robotica.firebaseapp.com",
  databaseURL: "https://prototipado-ia-robotica-default-rtdb.firebaseio.com",
  projectId: "prototipado-ia-robotica",
  storageBucket: "prototipado-ia-robotica.firebasestorage.app",
  messagingSenderId: "127465468754",
  appId: "1:127465468754:web:eef7764a1f1a579800c08b",
  measurementId: "G-3QRMTB0ETE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };