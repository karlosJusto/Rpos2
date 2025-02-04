// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";  // Importar el servicio de almacenamiento

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC7hCQINDgxTz4CR-MnOsKxRfIo78QVgBk",
  authDomain: "superpollorpos.firebaseapp.com",
  projectId: "superpollorpos",
  storageBucket: "superpollorpos.firebasestorage.app",
  messagingSenderId: "31953569271",
  appId: "1:31953569271:web:1db91e1a69c804e4bc5af2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Inicializa Firestore y Firebase Storage
export const db = getFirestore(app);
export const storage = getStorage(app);  // Exportar el storage
