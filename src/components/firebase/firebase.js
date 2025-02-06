// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, doc, deleteDoc } from "firebase/firestore"; // Firestore functions
import { getStorage } from "firebase/storage";  // Firebase Storage functions

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC7hCQINDgxTz4CR-MnOsKxRfIo78QVgBk",
  authDomain: "superpollorpos.firebaseapp.com",
  projectId: "superpollorpos",
  storageBucket: "superpollorpos.firebasestorage.app",
  messagingSenderId: "31953569271",
  appId: "1:31953569271:web:1db91e1a69c804e4bc5af2"
};

// Inicializar Firebase


const app = initializeApp(firebaseConfig);

// Inicializar Firestore y Firebase Storage
export const db = getFirestore(app);
export const storage = getStorage(app);

// Exportar las funciones necesarias de Firestore para interactuar con los documentos
export { doc, deleteDoc };


