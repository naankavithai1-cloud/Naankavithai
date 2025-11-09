// =========================================================
// 14. settings.js - USER CUSTOMIZATION LOGIC
// =========================================================

// =========================================================
// 1. CONFIGURATION (Firebase & Owner UID)
// =========================================================
const firebaseConfig = {
    apiKey: "AIzaSyDvO6u6srQuwIRHB0n3FajjYT1GdACrDEw",
    authDomain: "naankavithai-nk.firebaseapp.com",
    projectId: "naankavithai-nk",
    storageBucket: "naankavithai-nk.firebasestorage.app",
    messagingSenderId: "805424161171",
    appId: "1:805424161171:web:ffde12b945e8378baf8866"
};
const CLOUDINARY_CONFIG = {
    cloudName: "dir99skeg",
    uploadPreset: "poem_images" // Reusing the poem upload preset for profile pics
};
const OWNER_UID = "LmTvYY2A13cuQdnUryowcTHiAD82"; 

// =========================================================
// 2. FIREBASE SDK IMPORTS & INITIALIZATION
// =========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =========================================================
// 3. UI Element References
// =========================================================
const authCheckMessage = document.getElementById('auth-check-message');
const settingsContent = document.getElementById('settings-content');
const currentProfilePhoto = document.getElementById('current-profile-photo');
const newProfilePhotoInput = document.getElementById('new-profile-photo');
const photoUploadStatus = document.getElementById('photo-upload-status');
const authorBioInput = document.getElementById('author-bio-input');
const saveProfileBtn = document.getElementById('save-profile-btn');
const profileSaveStatus = document.getElementById('profile-save-status');

const themeOptionsDiv = document.querySelector('.theme-options');
const fontSwitcher = document.getElementById('font-switcher');
const fontSizeRange = document.getElementById('font-size-range');
const fontSizeValueSpan = document.getElementById('font-size-value');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const settingsSaveStatus = document.getElementById('settings-save-status');

// Header elements
const loginBtn = document.getElementById('google-login-btn');
const ownerAdminLink = document.getElementById('owner-admin-link');

let currentLoggedInUser = null;
let currentSettings = {}; // To store the user's current settings

// =========================================================
// 4. AUTH GUARD & INITIALIZATION
// =========================================================

function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(error => console.error("Login Failed:", error.message));
}
function handleSignOut() {
    signOut(auth).then(() => window.location.href = 'index.html');
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentLoggedInUser = user;
        // Header UI is handled globally, but ensuring Admin link for owner:
        if (user.uid === OWNER_UID) ownerAdminLink.classList.remove('hidden');
        else ownerAdminLink.classList.add('hidden');

        // Access Granted
        authCheckMessage.classList.add('hidden');
        settingsContent.classList.remove('hidden');
        
        loadUserProfileData(user.uid);
        loadUserSettings(user.uid);
        
    } else {
        // Access Denied / Logged Out
        settingsContent.classList.add('hidden');
        authCheckMessage.classList.remove('hidden');
        authCheckMessage.querySelector('p').textContent = "⚠️ அமைப்புகளை மாற்ற Login செய்யவும்.";
        // Simple login button redirect (assuming user knows to use Google login)
        authCheckMessage.querySelector('#guard-login-btn').textContent = "Login";
        authCheckMessage.querySelector('#guard-login-btn').onclick = signInWithGoogle;
    }
});
loginBtn.addEventListener('click', signInWithGoogle); // Assuming login button is available in header

// =========================================================
// 5. PROFILE DATA LOAD & SAVE (Bio, Photo)
// =========================================================

/**
 * Loads current user profile data (Bio, Photo) into the form.
 */
async function loadUserProfileData(uid) {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data();
        authorBioInput.value = data.authorBio || '';
        currentProfilePhoto.src = data.photoURL || 'https://via.placeholder.com/100/0A0A0A/FFD700?text=P';
    }
}

/**
 * Uploads file to Cloudinary (reused logic).
 */
async function uploadImageToCloudinary(file) {
    if (!file) return null;

    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

    try {
        photoUploadStatus.textContent = "படம் அப்லோட் ஆகிறது...";
        photoUploadStatus.className = 'status-loading';
        
        const response = await fetch(url, { method: 'POST', body: formData });

        if (response.ok) {
            const data = await response.json();
            photoUploadStatus.textContent = "✅ படம் வெற்றிகரமாக அப்லோட் செய்யப்பட்டது.";
            photoUploadStatus.className = 'status-success';
            return data.secure_url; 
        } else {
            photoUploadStatus.textContent = "❌ Cloudinary அப்லோட் தோல்வி.";
            photoUploadStatus.className = 'status-error';
            return null;
        }
    } catch (error) {
        console.error("Cloudinary Upload failed:", error);
        photoUploadStatus.textContent = "❌ அப்லோடில் பிழை.";
        photoUploadStatus.className = 'status-error';
        return null;
    }
}

/**
 * Handles saving the profile data (Bio and Photo URL).
 */
async function handleSaveProfile() {
    const user = currentLoggedInUser;
    if (!user) return;

    saveProfileBtn.disabled = true;
    profileSaveStatus.textContent = "சுயவிவரம் சேமிக்கப்படுகிறது...";
    profileSaveStatus.className = 'status-loading';

    const newBio = authorBioInput.value.trim();
    const newPhotoFile = newProfilePhotoInput.files[0];
    let photoURLToSave = currentProfilePhoto.src; // Default to existing URL

    try {
        // 1. Handle Photo Upload (if a new file is selected)
        if (newPhotoFile) {
            const uploadedURL = await uploadImageToCloudinary(newPhotoFile);
            if (uploadedURL) {
                photoURLToSave = uploadedURL;
            } else {
                throw new Error("புதிய படம் அப்லோடில் பிழை.");
            }
        }

        // 2. Update Firestore
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            authorBio: newBio,
            photoURL: photoURLToSave,
            // We also update name and email here, but assuming they don't change often from Google Auth source
        });

        // 3. Update UI (photo thumbnail)
        currentProfilePhoto.src = photoURLToSave;
        
        profileSaveStatus.textContent = "✅ சுயவிவரம் வெற்றிகரமாக சேமிக்கப்பட்டது!";
        profileSaveStatus.className = 'status-success';
        
    } catch (error) {
        console.error("Profile Save failed:", error);
        profileSaveStatus.textContent = `❌ சுயவிவரம் சேமிப்பில் பிழை: ${error.message}`;
        profileSaveStatus.className = 'status-error';
    } finally {
        saveProfileBtn.disabled = false;
        setTimeout(() => profileSaveStatus.textContent = '', 5000);
        setTimeout(() => photoUploadStatus.textContent = '', 5000);
    }
}

// =========================================================
// 6. CUSTOMIZATION SETTINGS LOAD & SAVE
// =========================================================

/**
 * Loads user-specific settings (Theme, Font) from Firestore.
 * Settings are stored in a separate 'settings' subcollection for simplicity.
 */
async function loadUserSettings(uid) {
    const settingsRef = doc(db, "users", uid, "appSettings", "customization");
    const settingsSnap = await getDoc(settingsRef);

    currentSettings = {
        theme: 'dark', // Default
        font: "'Noto Sans Tamil', sans-serif", // Default
        fontSize: 16, // Default
    };

    if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        currentSettings = { ...currentSettings, ...data };
    }
    
    // Apply and update UI controls
    applySettings(currentSettings);
    updateSettingsUI(currentSettings);
}

/**
 * Applies the loaded settings to the HTML/CSS variables.
 */
function applySettings(settings) {
    const root = document.documentElement;
    
    // Apply Theme (Simple Dark/Light toggle logic based on CSS variables)
    // Future: We would reload CSS variables here if Light theme had different variable values.
    root.setAttribute('data-theme', settings.theme); 

    // Apply Font
    root.style.setProperty('--font-family-primary', settings.font);
    
    // Apply Font Size
    root.style.setProperty('font-size', `${settings.fontSize}px`);
}

/**
 * Updates the UI controls (select, range, buttons) to reflect the current settings.
 */
function updateSettingsUI(settings) {
    // Theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        if (btn.dataset.theme === settings.theme) {
            btn.classList.add('active');
            btn.style.backgroundColor = 'var(--color-accent)';
        } else {
            btn.classList.remove('active');
            btn.style.backgroundColor = 'var(--color-primary)';
        }
    });

    // Font switcher
    fontSwitcher.value = settings.font;
    
    // Font size range
    fontSizeRange.value = settings.fontSize;
    fontSizeValueSpan.textContent = `${settings.fontSize}px`;
}

/**
 * Handles saving customization settings to Firestore.
 */
async function handleSaveSettings() {
    const user = currentLoggedInUser;
    if (!user) return;

    saveSettingsBtn.disabled = true;
    settingsSaveStatus.textContent = "அமைப்புகள் சேமிக்கப்படுகிறது...";
    settingsSaveStatus.className = 'status-loading';

    const newSettings = {
        theme: document.querySelector('.theme-btn.active').dataset.theme,
        font: fontSwitcher.value,
        fontSize: parseInt(fontSizeRange.value),
        lastUpdated: serverTimestamp()
    };
    
    try {
        const settingsRef = doc(db, "users", user.uid, "appSettings", "customization");
        await setDoc(settingsRef, newSettings, { merge: true });

        // Apply new settings immediately
        applySettings(newSettings);
        
        settingsSaveStatus.textContent = "✅ அமைப்புகள் வெற்றிகரமாக சேமிக்கப்பட்டது!";
        settingsSaveStatus.className = 'status-success';
        
    } catch (error) {
        console.error("Settings Save failed:", error);
        settingsSaveStatus.textContent = `❌ அமைப்புகள் சேமிப்பில் பிழை: ${error.message}`;
        settingsSaveStatus.className = 'status-error';
    } finally {
        saveSettingsBtn.disabled = false;
        setTimeout(() => settingsSaveStatus.textContent = '', 5000);
    }
}

// =========================================================
// 7. EVENT LISTENERS & INITIALIZATION
// =========================================================

// Event listeners for UI interaction
saveProfileBtn.addEventListener('click', handleSaveProfile);
saveSettingsBtn.addEventListener('click', handleSaveSettings);

// Theme button handler
themeOptionsDiv.addEventListener('click', (e) => {
    if (e.target.classList.contains('theme-btn')) {
        document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        // Temporary UI feedback change (real application happens on Save)
        e.target.style.backgroundColor = 'var(--color-accent)';
    }
});

// Font Size Range handler
fontSizeRange.addEventListener('input', (e) => {
    const size = e.target.value;
    fontSizeValueSpan.textContent = `${size}px`;
    // Apply temporary font size change for immediate feedback
    document.documentElement.style.setProperty('font-size', `${size}px`);
});

// Font Switcher handler
fontSwitcher.addEventListener('change', (e) => {
    const font = e.target.value;
    // Apply temporary font change for immediate feedback
    document.documentElement.style.setProperty('--font-family-primary', font);
});


function setCurrentYear() {
    document.getElementById('current-year').textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', () => {
    setCurrentYear();
});
