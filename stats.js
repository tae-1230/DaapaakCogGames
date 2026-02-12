// stats.js

/* ================= IMPORTS ================= */

// Firebase authentication + Firestore database instance
import { auth, db } from "./firebase.js";

// Firestore functions
import {
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase auth state listener
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


/* =========================================================
   saveGameSession(gameName, session)

   Saves a completed game session to Firestore under:

   users/{uid}/games/{gameName}/sessions/{autoDocId}

   It also ensures the main user document exists.
========================================================= */

export function saveGameSession(gameName, session) {

  // Wait for authentication state to confirm user
  onAuthStateChanged(auth, async (user) => {

    // Exit early if not logged in or session data missing
    if (!user || !session) return;

    try {

      /* =============================
         1️⃣ Ensure user document exists
         Path: users/{uid}
         - Creates document if it doesn't exist
         - merge: true prevents overwriting existing fields
      ============================== */
      await setDoc(
        doc(db, "users", user.uid),
        {
          createdAt: serverTimestamp(),   // First creation time
          email: user.email || null       // Store user email
        },
        { merge: true }                   // Merge with existing document
      );


      /* =============================
         2️⃣ Save game session
         Path:
         users/{uid}/games/{gameName}/sessions/{autoId}
      ============================== */
      const ref = await addDoc(
        collection(db, "users", user.uid, "games", gameName, "sessions"),
        {
          ...session,                     // Spread session object fields
          createdAt: serverTimestamp()    // Add server timestamp
        }
      );

      // Success log
      console.log("✅ SAVED SESSION:", gameName, ref.id);

    } catch (e) {

      // Error handling
      console.error("❌ SAVE FAILED:", e);

    }
  });
}
