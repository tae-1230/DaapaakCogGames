// stats.js
import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export function saveGameSession(gameName, session) {
  onAuthStateChanged(auth, async (user) => {
    if (!user || !session) return;

    try {
      // ✅ ENSURE user document exists
      await setDoc(
        doc(db, "users", user.uid),
        {
          createdAt: serverTimestamp(),
          email: user.email || null
        },
        { merge: true }
      );

      // ✅ NOW save session
      const ref = await addDoc(
        collection(db, "users", user.uid, "games", gameName, "sessions"),
        {
          ...session,
          createdAt: serverTimestamp()
        }
      );

      console.log("✅ SAVED SESSION:", gameName, ref.id);
    } catch (e) {
      console.error("❌ SAVE FAILED:", e);
    }
  });
}
