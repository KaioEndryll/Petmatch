// Import the functions you need from the SDKs you need

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import { getFirestore, collection } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js';




// TODO: Add SDKs for Firebase products that you want to use

// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration

const firebaseConfig = {

  apiKey: "AIzaSyANMSS4hKvUwZlFQiyago_jg5cbBIu9A8k",

  authDomain: "petmatch-2a355.firebaseapp.com",

  projectId: "petmatch-2a355",

  storageBucket: "petmatch-2a355.firebasestorage.app",

  messagingSenderId: "549398485191",

  appId: "1:549398485191:web:1e11fb8c10865eae4246e2"

};



// Initialize Firebase

const app = initializeApp(firebaseConfig);


// Initialize Cloud Firestore and get a reference to the service

export const db = getFirestore(app);


// Initialize Cloud Storage and get a reference to the service

export const storage = getStorage(app);


// Reference to the 'pets' collection

export const petsCollection = collection(db, "pets");
export const chatCollection = collection(db, "chat");
