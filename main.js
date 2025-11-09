// =========================================================
// 9. main.js - CORE LOGIC (Full Firebase Auth & Firestore Setup)
// =========================================================

// =========================================================
// 1. CONFIGURATION (Firebase & Cloudinary)
// =========================================================

// Cloudinary Configuration (Image Hosting)
const cloudinaryConfig = {
    cloudName: "dir99skeg",
    uploadPreset: "poem_images" // Unsigned Upload Preset
};

// Owner/Admin UID (This is a crucial security detail for the dashboard link)
// IMPORTANT: You MUST replace this with Sahan's actual UID once he logs in for the first time.
// For now, use a placeholder or his actual Google UID if known.
const OWNER_UID = "LmTvYY2A13cuQdnUryowcTHiAD82"; // *** REPLACE THIS ***

// =========================================================
// 2. FIREBASE SDK IMPORTS (Already done in index.html, but re-import for module structure)
// =========================================================
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Assume window.auth and window.db are available from the script tag in index.html

// =========================================================
// 3. UI ELEMENT REFERENCES
// =========================================================
const loginBtn = document.getElementById('google-login-btn');
const profileLinkImg = document.getElementById('profile-link');
const authControls = document.getElementById('auth-controls');
const ownerAdminLink = document.getElementById('owner-admin-link');
const newPostLink = document.getElementById('new-post-link');

// =========================================================
// 4. AUTHENTICATION LOGIC (Login, Logout, State Change)
// =========================================================

/**
 * Handles Google Sign-In using a Popup.
 */
async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(window.auth, provider);
        const user = result.user;
        console.log("Google Login Successful:", user.displayName);
        
        // 4.1. Save/Update Atomic User Details to Firestore
        await saveAtomicUserDetails(user);

    } catch (error) {
        console.error("Google Login Failed:", error.message);
        alert("Login failed! Please try again.");
    }
}

/**
 * Saves/Updates essential user details in the Firestore 'users' collection.
 * This is the 'Atomic User Details' feature.
 * @param {firebase.User} user - The logged-in Firebase User object.
 */
async function saveAtomicUserDetails(user) {
    const userRef = doc(window.db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    const userDetails = {
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        uid: user.uid,
        lastLogin: serverTimestamp(),
        isAdmin: (user.uid === OWNER_UID), // Initial check for admin status
    };

    if (userDoc.exists()) {
        // User exists, just update last login and other mutable details
        await setDoc(userRef, { 
            ...userDetails
        }, { merge: true }); // Use merge to avoid overwriting existing data (like bio, totalPosts, earnings)
        console.log("User details updated in Firestore.");
    } else {
        // New user, set createdAt
        await setDoc(userRef, {
            ...userDetails,
            createdAt: serverTimestamp(),
            totalPosts: 0,
            earningsPoints: 0,
            isBanned: false,
        });
        console.log("New user details saved to Firestore.");
        // Optional: Trigger Automated Welcome Email (Future Firebase Function)
    }
}

/**
 * Handles user sign-out.
 */
function handleSignOut() {
    signOut(window.auth).then(() => {
        console.log("User signed out.");
    }).catch((error) => {
        console.error("Logout failed:", error.message);
    });
}

/**
 * Listens for user's sign-in/sign-out state changes and updates UI.
 */
onAuthStateChanged(window.auth, (user) => {
    if (user) {
        // User is signed in
        
        // UI Update: Hide Login, Show Profile/Logout
        loginBtn.classList.add('hidden');
        profileLinkImg.src = user.photoURL || 'https://via.placeholder.com/35/0A0A0A/FFD700?text=P'; // Default image if no photoURL
        profileLinkImg.classList.remove('hidden');

        // Set Profile Link to user's profile page
        profileLinkImg.onclick = () => window.location.href = `profile.html?uid=${user.uid}`;
        
        // Create a temporary Logout button for the profile section
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'google-logout-btn';
        logoutBtn.classList.add('btn-primary');
        logoutBtn.textContent = 'Logout';
        logoutBtn.onclick = handleSignOut;
        authControls.appendChild(logoutBtn);

        // Feature: Profile & Admin Link (Check for Owner Status)
        if (user.uid === OWNER_UID) {
            ownerAdminLink.classList.remove('hidden');
            ownerAdminLink.href = 'admin.html';
            console.log("Admin User Detected. Admin link shown.");
        } else {
            ownerAdminLink.classList.add('hidden');
        }

        // Re-run save/update details to ensure lastLogin is current (non-blocking)
        saveAtomicUserDetails(user).catch(err => console.error("Error updating user details:", err));

    } else {
        // User is signed out

        // UI Update: Show Login, Hide Profile/Logout
        loginBtn.classList.remove('hidden');
        profileLinkImg.classList.add('hidden');
        ownerAdminLink.classList.add('hidden');
        
        // Remove Logout button if it exists
        const logoutBtn = document.getElementById('google-logout-btn');
        if (logoutBtn) {
            logoutBtn.remove();
        }
    }
});

// =========================================================
// 5. EVENT LISTENERS
// =========================================================

// Event Listener for the Login Button
loginBtn.addEventListener('click', signInWithGoogle);

// Event Listener for New Post Link (Initial Functionality)
newPostLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.auth.currentUser) {
        // Redirect to the full posting page or show the quick form
        alert("புதிய கவிதை சமர்ப்பிக்க form இங்கு திறக்கப்படும்/Redirect செய்யப்படும்.");
        // window.location.href = 'post.html'; // Future state
    } else {
        alert("கவிதை சமர்ப்பிக்க Google Login செய்யுங்கள்.");
    }
});


// =========================================================
// 6. INITIAL SETUP & UTILITIES
// =========================================================

// Function to set the current year in the footer
function setCurrentYear() {
    document.getElementById('current-year').textContent = new Date().getFullYear();
}

// Initialization on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    setCurrentYear();
    console.log("Website Initialized. Waiting for Auth State.");
    
    // Feature: Sticky Header implementation (Simple class toggle)
    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (window.scrollY > 0) {
            header.classList.add('sticky-header-active'); // A class for additional effects if needed
        } else {
            header.classList.remove('sticky-header-active');
        }
    });
});
