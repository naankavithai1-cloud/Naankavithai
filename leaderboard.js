// =========================================================
// 15. leaderboard.js - AUTHOR RANKING LOGIC
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
const OWNER_UID = "LmTvYY2A13cuQdnUryowcTHiAD82"; 
const LEADERBOARD_LIMIT = 50; // Top 50 authors to display

// =========================================================
// 2. FIREBASE SDK IMPORTS & INITIALIZATION
// =========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =========================================================
// 3. UI Element References
// =========================================================
const leaderboardList = document.getElementById('leaderboard-list');
const userRankInfoP = document.getElementById('user-rank-info');

// Header elements (for Auth status)
const ownerAdminLink = document.getElementById('owner-admin-link');

let currentLoggedInUser = null;

// =========================================================
// 4. AUTHENTICATION LOGIC (Minimal for Header)
// =========================================================

function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(error => console.error("Login Failed:", error.message));
}

onAuthStateChanged(auth, (user) => {
    // 1. Update Header UI
    const profileLinkImg = document.getElementById('profile-link');
    const loginBtn = document.getElementById('google-login-btn');
    const logoutBtn = document.getElementById('google-logout-btn');

    if (user) {
        currentLoggedInUser = user;
        loginBtn.classList.add('hidden');
        profileLinkImg.src = user.photoURL || 'https://via.placeholder.com/35/0A0A0A/FFD700?text=P';
        profileLinkImg.classList.remove('hidden');
        profileLinkImg.onclick = () => window.location.href = `profile.html?uid=${user.uid}`;
        logoutBtn.classList.remove('hidden');
        if (user.uid === OWNER_UID) ownerAdminLink.classList.remove('hidden');
        else ownerAdminLink.classList.add('hidden');
    } else {
        currentLoggedInUser = null;
        loginBtn.classList.remove('hidden');
        profileLinkImg.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        ownerAdminLink.classList.add('hidden');
    }
    
    // 2. Load leaderboard regardless of login status
    loadLeaderboard();
});

// Event Listeners for Header
document.getElementById('google-login-btn').addEventListener('click', signInWithGoogle);
document.getElementById('google-logout-btn').addEventListener('click', () => signOut(auth).then(() => window.location.reload()));
document.getElementById('new-post-link').addEventListener('click', (e) => { 
    e.preventDefault(); 
    if (!auth.currentUser) signInWithGoogle(); 
    else window.location.href = 'index.html#quick-post-section';
});


// =========================================================
// 5. LEADERBOARD LOGIC
// =========================================================

/**
 * Renders a single leaderboard list item.
 */
function renderLeaderboardItem(author, rank) {
    const item = document.createElement('div');
    item.className = 'admin-item leaderboard-item';
    
    // Apply special styling for top 3
    let rankBadgeClass = '';
    if (rank === 1) rankBadgeClass = 'rank-gold';
    else if (rank === 2) rankBadgeClass = 'rank-silver';
    else if (rank === 3) rankBadgeClass = 'rank-bronze';

    // The rank badge (1, 2, 3...)
    const rankHtml = `<div class="rank-badge ${rankBadgeClass}">#${rank}</div>`;
    
    // Author Profile Link
    const profileLink = `profile.html?uid=${author.uid}`;
    
    item.innerHTML = `
        ${rankHtml}
        <div class="item-content">
            <img src="${author.photoURL || 'https://via.placeholder.com/40/0A0A0A/FFD700?text=P'}" alt="${author.name}" class="profile-photo leaderboard-photo">
            <div>
                <p><strong><a href="${profileLink}">${author.name}</a></strong></p>
                <p><small>${author.authorBio || 'கவிஞர் சுயவிவரச் சுருக்கம் இல்லை.'}</small></p>
            </div>
        </div>
        <div class="item-actions">
            <span class="tag-status" style="background-color: var(--color-accent); color: var(--color-secondary); font-size: 14px; font-weight: 700;">
                ${author.earningsPoints || 0} Points
            </span>
        </div>
    `;
    return item;
}

/**
 * Fetches the top authors from Firestore and renders the leaderboard.
 */
async function loadLeaderboard() {
    leaderboardList.innerHTML = '<p class="loading-message">தரவரிசைப் பட்டியல் ஏற்றப்படுகிறது...</p>';
    userRankInfoP.textContent = '';

    const q = query(
        collection(db, "users"),
        // Rank based on earningsPoints, descending order
        orderBy("earningsPoints", "desc"), 
        limit(LEADERBOARD_LIMIT)
    );

    try {
        const snapshot = await getDocs(q);
        leaderboardList.innerHTML = '';
        
        let userRank = -1; // To store the rank of the logged-in user

        if (snapshot.empty) {
            leaderboardList.innerHTML = '<p class="empty-message">தற்போது தரவரிசையில் எந்தக் கவிஞர்களும் இல்லை.</p>';
            return;
        }

        snapshot.forEach((doc, index) => {
            const authorData = doc.data();
            // Use doc.id as the UID for the author profile link
            const author = { ...authorData, uid: doc.id }; 
            
            const rank = index + 1;
            const item = renderLeaderboardItem(author, rank);
            leaderboardList.appendChild(item);
            
            // Check if the current logged-in user is in the top list
            if (currentLoggedInUser && author.uid === currentLoggedInUser.uid) {
                userRank = rank;
            }
        });
        
        // Display logged-in user's rank info
        if (currentLoggedInUser) {
            if (userRank !== -1) {
                userRankInfoP.textContent = `நீங்கள் தற்போது #${userRank} இடத்தில் உள்ளீர்கள். 👏`;
                userRankInfoP.style.color = 'var(--color-success)';
            } else {
                userRankInfoP.textContent = `நீங்கள் முதல் ${LEADERBOARD_LIMIT} தரவரிசையில் இல்லை. (தொடர்ந்து எழுதுங்கள்!)`;
                userRankInfoP.style.color = 'var(--color-text-light)';
            }
        }

    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        leaderboardList.innerHTML = '<p class="empty-message status-error">தரவரிசையை ஏற்ற முடியவில்லை. பிழை ஏற்பட்டது.</p>';
    }
}


// =========================================================
// 6. INITIALIZATION
// =========================================================

function setCurrentYear() {
    document.getElementById('current-year').textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', () => {
    setCurrentYear();
    // loadLeaderboard() is called inside onAuthStateChanged after checking user login status
});
