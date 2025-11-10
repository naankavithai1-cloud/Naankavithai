// main.js - loadPoemFeed ஃபங்ஷனில் உள்ள CRITICAL FIX

async function loadPoemFeed(searchQuery = '') {
    const poemFeedContainer = document.getElementById('poem-feed');
    const poemFeedSectionTitle = document.querySelector('#poem-feed-section h2');
    poemFeedContainer.innerHTML = '<p class="loading-message" style="grid-column: 1 / -1; text-align: center;">கவிதைகள் ஏற்றப்படுகிறது...</p>';

    // 1. Base Query: Start with Status and Ordering
    let q = query(collection(db, "poems"), where("status", "==", "APPROVED"));
    
    // 2. Apply Search Filter ONLY IF query is NOT empty
    if (searchQuery) { // <--- CRITICAL FIX: Check if search query exists
        const searchUpper = searchQuery.toLowerCase();
        // Since we cannot filter by both 'title' and 'authorName' simultaneously in Firestore, 
        // we will only search by 'title' for this simplified implementation.
        // NOTE: For 'Author Name', a separate index/query is needed.
        
        // This is a simple prefix search (required for index compatibility)
        const searchEnd = searchUpper.substring(0, searchUpper.length - 1) + String.fromCharCode(searchUpper.charCodeAt(searchUpper.length - 1) + 1);

        q = query(q, 
            where("title", ">=", searchUpper), 
            where("title", "<", searchEnd)
        );
        poemFeedSectionTitle.textContent = `தேடல் முடிவுகள்: "${searchQuery}"`;
    }
    
    // 3. Apply Sorting based on currentSortOrder (applied to the current 'q')
    if (currentSortOrder === 'latest') {
        q = query(q, orderBy("createdAt", "desc")); 
        if (!searchQuery) poemFeedSectionTitle.textContent = "சமீபத்திய கவிதைகள்"; // Change title only if no search
    } else if (currentSortOrder === 'trending') {
        q = query(q, orderBy("views", "desc")); 
        if (!searchQuery) poemFeedSectionTitle.textContent = "🔥 Trending கவிதைகள்";
    }

    // 4. Final Limit
    q = query(q, limit(30));

    // ... (rest of the try/catch block remains the same) ...
      }
