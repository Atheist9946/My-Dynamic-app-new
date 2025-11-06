// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD6YOr_Ic5n1tdl_wvUZLYs8zUxtGdn9t4",
    authDomain: "love2play-e2c54.firebaseapp.com",
    projectId: "love2play-e2c54",
    storageBucket: "love2play-e2c54.appspot.com",
    messagingSenderId: "935840264201",
    appId: "1:935840264201:web:edbfd2e95535cce6b948d8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// User Data
let currentUser = null;

// Default instructional cards
const INSTRUCTION_CARDS = [
    { name: "Welcome! Scratch to reveal prizes", isInstruction: true },
    { name: "Use mouse/touch to scratch the silver layer", isInstruction: true },
    { name: "Scratch 50% to see what you won", isInstruction: true },
    { name: "Add your own prizes in Settings", isInstruction: true }
];

// Scratch Card Data
let results = [];
let cardColorBefore = "#F06292";
let cardColorAfter = "#FFC1E3";
let revealedTextColor = "#B71C1C";
let revealedFontSize = 14;
let revealedPosition = "middle-center";
let usedResults = [];

// Color schemes for revealed cards and fullscreen
const colorSchemes = [
    { bg: "#000000", text: "#FFFFFF" }, // White on Black
    { bg: "#0D47A1", text: "#FFFFFF" }, // White on Navy
    { bg: "#E3F2FD", text: "#0D47A1" }, // Dark on Light Blue
    { bg: "#FFF9C4", text: "#000000" }, // Black on Light Yellow
    { bg: "#121212", text: "#E0E0E0" }, // Light Gray on Dark
    { bg: "#2E7D32", text: "#FFFFFF" }, // White on Dark Green
    { bg: "#CD5C5C", text: "#FFFFFF" }, // IndianRed
    { bg: "#F08080", text: "#000000" }, // LightCoral
    { bg: "#FF8C00", text: "#000000" }, // DarkOrange
    { bg: "#F0E68C", text: "#000000" }, // Khaki
    { bg: "#2E8B57", text: "#FFFFFF" }, // SeaGreen
    { bg: "#4682B4", text: "#FFFFFF" }, // SteelBlue
    { bg: "#4169E1", text: "#FFFFFF" }, // RoyalBlue
    { bg: "#BA55D3", text: "#000000" }, // MediumOrchid
    { bg: "#663399", text: "#FFFFFF" }, // RebeccaPurple
    { bg: "#BC8F8F", text: "#000000" }, // RosyBrown
    { bg: "#A0522D", text: "#FFFFFF" }, // Sienna
    { bg: "#D3D3D3", text: "#000000" }, // LightGray
    { bg: "#696969", text: "#FFFFFF" }, // DimGray
    { bg: "#6A0DAD", text: "#FFFFFF" }, // Deep Purple
    { bg: "#000080", text: "#F5F5F5" }, // Navy Blue
    { bg: "#36454F", text: "#FFFFFF" }, // Charcoal
    { bg: "#708090", text: "#FFFFFF" }, // Slate Gray
    { bg: "#FFFFF0", text: "#333333" }, // Ivory
    { bg: "#F5FFFA", text: "#2E8B57" }, // Mint Cream
    { bg: "#E6E6FA", text: "#4B0082" }, // Lavender
    { bg: "#FFDAB9", text: "#8B4513" }, // Peach Puff
    { bg: "#B0E0E6", text: "#00008B" }, // Powder Blue
    { bg: "#2F4F4F", text: "#E0FFFF" }, // Dark Slate
    { bg: "#010203", text: "#F8F8FF" }, // Rich Black
    { bg: "#191970", text: "#ADD8E6" }, // Midnight Blue
    { bg: "#556B2F", text: "#FFEBCD" }, // Dark Olive
    { bg: "#FFFF99", text: "#FF0000" }, // Canary Yellow
    { bg: "#DC143C", text: "#FFFFFF" }, // Crimson
    { bg: "#228B22", text: "#FFD700" }, // Forest Green
    { bg: "#7851A9", text: "#FFE5B4" }, // Royal Purple
    { bg: "#E2725B", text: "#3D2B1F" }, // Terracotta
    { bg: "#9DC183", text: "#2F4F4F" }, // Sage Green
    { bg: "#C2B280", text: "#654321" }, // Sandstone
    { bg: "#008080", text: "#FFE4C4" }, // Deep Teal
    { bg: "#58427C", text: "#FFD1DC" }, // Cyber Grape
    { bg: "#FF8243", text: "#000080" }, // Mango Tango
    { bg: "#A50B5E", text: "#FFD700" }, // Jazzberry Jam
    { bg: "#7FFFD4", text: "#8B0000" }, // Aquamarine
    { bg: "#005A9C", text: "#FFFFFF" }, // WCAG Blue
    { bg: "#FFC000", text: "#000000" }, // WCAG Yellow
    { bg: "#4B830D", text: "#FFFFFF" }, // WCAG Green
    { bg: "#E81123", text: "#FFFFFF" }  // WCAG Red
];

// DOM Elements
const container = document.getElementById("container");
const userPanel = document.getElementById("user-panel");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const gameControls = document.getElementById("game-controls");
const userNickname = document.getElementById("user-nickname");
const deleteTextSelect = document.getElementById("deleteTextSelect");
const refreshButton = document.getElementById("refresh-button");
const userIcon = document.querySelector(".user-icon");
const logoutIcon = document.querySelector(".logout-icon");
const exitIcon = document.querySelector(".exit-icon");
const fullscreenOverlay = document.getElementById("fullscreen-overlay");
const fullscreenText = document.getElementById("fullscreen-text");
const closeFullscreen = document.querySelector(".close-fullscreen");
const instructionsModal = document.getElementById("instructions-modal");
const scrollUpBtn = document.getElementById("scroll-up-btn");
const scrollDownBtn = document.getElementById("scroll-down-btn");

// ================= AUTHENTICATION FUNCTIONS =================

// 1. Sign Up Function
async function handleSignUp(e) {
    e.preventDefault();
    const nickname = document.getElementById("signup-nickname").value.trim();
    const username = document.getElementById("signup-username").value.trim().toLowerCase();
    const password = document.getElementById("signup-password").value;

    if (!validateNickname() || !validateUsername() || !validatePassword()) {
        showNotification("कृपया सभी फील्ड्स को सही से भरें", false);
        return;
    }

    try {
        // Convert username to a safe email format
        const email = `${encodeURIComponent(username)}@scratchwin.com`;

        // Create Firebase account
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);

        // Save user data to Firestore
        await db.collection("users").doc(userCredential.user.uid).set({
            nickname: nickname,
            originalUsername: username, // Store original username
            email: email, // Store generated email
            savedCards: [],
            scratchCards: [...INSTRUCTION_CARDS],
            settings: {
                cardColorBefore: "#F06292",
                cardColorAfter: "#FFC1E3",
                revealedTextColor: "#B71C1C",
                revealedFontSize: 14,
                revealedPosition: "middle-center"
            },
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification("रजिस्ट्रेशन सफल! कृपया लॉगिन करें");
        showLogin();
    } catch (error) {
        console.error("रजिस्ट्रेशन में त्रुटि:", error);
        let errorMessage = error.message;
        if (error.code === "auth/email-already-in-use") {
            errorMessage = "यह यूजरनेम पहले से उपयोग में है";
        } else if (error.code === "auth/invalid-email") {
            errorMessage = "अमान्य यूजरनेम प्रारूप";
        } else if (error.code === "auth/weak-password") {
            errorMessage = "पासवर्ड बहुत कमजोर है";
        }
        showNotification(`रजिस्ट्रेशन असफल: ${errorMessage}`, false);
    }
}

// 2. Login Function
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;

    try {
        // Convert username to the same email format as used in signup
        const email = `${encodeURIComponent(username)}@scratchwin.com`;

        // Sign in with Firebase
        const userCredential = await auth.signInWithEmailAndPassword(email, password);

        // Load user data from Firestore
        const userDoc = await db.collection("users").doc(userCredential.user.uid).get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            currentUser = {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                nickname: userData.nickname,
                username: userData.originalUsername // Set original username
            };

            loginForm.style.display = "none";
            userPanel.style.display = "block";
            logoutIcon.style.display = "block";
            userIcon.style.display = "none";
            gameControls.style.display = "none";

            await loadUserSettings();
            showNotification("लॉगिन सफल!");
        }
    } catch (error) {
        console.error("लॉगिन त्रुटि:", error);
        let errorMessage = error.message;
        if (error.code === "auth/invalid-email") {
            errorMessage = "अमान्य यूजरनेम या पासवर्ड";
        } else if (error.code === "auth/user-not-found") {
            errorMessage = "यूजर नहीं मिला";
        } else if (error.code === "auth/wrong-password") {
            errorMessage = "गलत पासवर्ड";
        } else if (error.code === "auth/too-many-requests") {
            errorMessage = "बहुत अधिक प्रयास, कृपया बाद में पुनः प्रयास करें";
        }
        showNotification(`लॉगिन असफल: ${errorMessage}`, false);
    }
}

// 3. Logout
function userLogout() {
    auth.signOut();
    currentUser = null;

    userPanel.style.display = "none";
    loginForm.style.display = "block";
    signupForm.style.display = "none";
    container.innerHTML = "";
    container.style.display = "none";
    gameControls.style.display = "none";
    userIcon.style.display = "block";
    logoutIcon.style.display = "none";
    exitIcon.style.display = "none";
    showNotification("लॉगआउट सफल!");
}

// 4. Load User Settings
async function loadUserSettings() {
    if (!auth.currentUser) return;

    try {
        const doc = await db.collection("users").doc(auth.currentUser.uid).get();
        if (doc.exists) {
            const userData = doc.data();
            currentUser.nickname = userData.nickname || "User";
            currentUser.username = userData.originalUsername || "";
            userNickname.textContent = currentUser.nickname;

            results = userData.scratchCards || [];
            updateDeleteTextDropdown();

            if (userData.settings) {
                cardColorBefore = userData.settings.cardColorBefore || "#F06292";
                cardColorAfter = userData.settings.cardColorAfter || "#FFC1E3";
                revealedTextColor = userData.settings.revealedTextColor || "#B71C1C";
                revealedFontSize = userData.settings.revealedFontSize || 14;
                revealedPosition = userData.settings.revealedPosition || "middle-center";

                document.getElementById("cardColorBefore").value = cardColorBefore;
                document.getElementById("cardColorAfter").value = cardColorAfter;
                document.getElementById("revealedTextColor").value = revealedTextColor;
                document.getElementById("revealedTextSize").value = revealedFontSize;
                document.getElementById("revealedPosition").value = revealedPosition;

                document.getElementById("cardColorBeforeValue").textContent = cardColorBefore;
                document.getElementById("cardColorAfterValue").textContent = cardColorAfter;
                document.getElementById("revealedTextColorValue").textContent = revealedTextColor;
            }
        }
    } catch (error) {
        console.error("सेटिंग्स लोड करने में त्रुटि:", error);
        showNotification("सेटिंग्स लोड करने में त्रुटि", false);
    }

    document.getElementById("cardColorBefore").addEventListener("input", function() {
        document.getElementById("cardColorBeforeValue").textContent = this.value;
    });
    document.getElementById("cardColorAfter").addEventListener("input", function() {
        document.getElementById("cardColorAfterValue").textContent = this.value;
    });
    document.getElementById("revealedTextColor").addEventListener("input", function() {
        document.getElementById("revealedTextColorValue").textContent = this.value;
    });
}

// ================= UI/UX AND VALIDATION FUNCTIONS =================

function redirectToAdminPage() {
    window.location.href = "admin.html";
}

function redirectToPCM() {
    console.log("Redirecting to PCM...");
    applySettings().then(() => {
        console.log("Settings saved, redirecting to /pcm");
        window.location.href = "/pcm";
    }).catch(error => {
        console.error("Error applying settings:", error);
        showNotification("सेटिंग्स सहेजने में विफल, फिर भी रीडायरेक्ट कर रहे हैं", false);
        window.location.href = "/pcm";
    });
}

function showInstructions() {
    instructionsModal.style.display = "block";
    document.body.style.overflow = "hidden";
}

function closeInstructions() {
    instructionsModal.style.display = "none";
    document.body.style.overflow = "auto";
}

function validateNickname() {
    const nicknameInput = document.getElementById("signup-nickname");
    const nickname = nicknameInput.value;
    const errorElement = document.getElementById("nickname-error");

    const regex = /^[a-zA-Z\s]+$/;
    if (!regex.test(nickname)) {
        nicknameInput.value = nickname.replace(/[^a-zA-Z\s]/g, '');
        errorElement.textContent = "निकनेम में केवल अक्षर और स्पेस हो सकते हैं";
        errorElement.style.display = "block";
        return false;
    }
    errorElement.style.display = "none";
    return true;
}

function validateUsername() {
    const usernameInput = document.getElementById("signup-username");
    const username = usernameInput.value.toLowerCase();
    const errorElement = document.getElementById("username-error");

    usernameInput.value = username;

    if (username.length < 6 || username.length > 15) {
        errorElement.textContent = "यूजरनेम 6 से 15 अक्षरों का होना चाहिए";
        errorElement.style.display = "block";
        return false;
    }

    const specialChars = /[@#$%_-]/;
    if (!specialChars.test(username)) {
        errorElement.textContent = "कम से कम एक विशेष कैरेक्टर (@, #, $, %, -, _) होना चाहिए";
        errorElement.style.display = "block";
        return false;
    }

    const numbers = /[0-9]/;
    if (!numbers.test(username)) {
        errorElement.textContent = "कम से कम एक नंबर (0-9) होना चाहिए";
        errorElement.style.display = "block";
        return false;
    }

    const validChars = /^[a-z0-9@#$%_-]+$/;
    if (!validChars.test(username)) {
        errorElement.textContent = "केवल लोअरकेस अक्षर, नंबर और @, #, $, %, -, _ अनुमति है";
        errorElement.style.display = "block";
        return false;
    }

    errorElement.style.display = "none";
    return true;
}

function validatePassword() {
    const passwordInput = document.getElementById("signup-password");
    const password = passwordInput.value;
    const errorElement = document.getElementById("password-error");

    if (password.length < 8 || password.length > 15) {
        errorElement.textContent = "पासवर्ड 8 से 15 अक्षरों का होना चाहिए";
        errorElement.style.display = "block";
        return false;
    }

    const specialChars = /[!@#$%^&*-_+=+\\|/?><.]/;
    if (!specialChars.test(password)) {
        errorElement.textContent = "कम से कम एक विशेष कैरेक्टर (!@#$%^&*+-_=+\\|/?><.) होना चाहिए";
        errorElement.style.display = "block";
        return false;
    }

    const numbers = /[0-9]/;
    if (!numbers.test(password)) {
        errorElement.textContent = "कम से कम एक नंबर (0-9) होना चाहिए";
        errorElement.style.display = "block";
        return false;
    }

    const upperCase = /[A-Z]/;
    const lowerCase = /[a-z]/;
    if (!upperCase.test(password) || !lowerCase.test(password)) {
        errorElement.textContent = "ऊपरी और निचले दोनों अक्षर होने चाहिए";
        errorElement.style.display = "block";
        return false;
    }

    if (/\s/.test(password)) {
        errorElement.textContent = "स्पेस की अनुमति नहीं है";
        errorElement.style.display = "block";
        return false;
    }

    errorElement.style.display = "none";
    return true;
}

function showNotification(message, success = true) {
    const notification = document.createElement("div");
    notification.className = `notification ${success ? '' : 'error'}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add("show");
    }, 100);

    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showSignup(e) {
    e.preventDefault();
    console.log("showSignup called"); // Debugging log
    if (!signupForm || !loginForm) {
        console.error("signupForm or loginForm is not defined");
        showNotification("आंतरिक त्रुटि: साइनअप फॉर्म लोड नहीं हुआ", false);
        return;
    }
    signupForm.style.display = "block";
    loginForm.style.display = "none";
    gameControls.style.display = "none";
    logoutIcon.style.display = "none";
    exitIcon.style.display = "none";
    userPanel.style.display = "none";
    showNotification("साइनअप फॉर्म खोला गया");
}

function showLogin() {
    console.log("showLogin called"); // Debugging log
    loginForm.style.display = "block";
    signupForm.style.display = "none";
    gameControls.style.display = "none";
    logoutIcon.style.display = "none";
    exitIcon.style.display = "none";
    userPanel.style.display = "none";
}

function showFullScreen(text, bgColor, textColor) {
    fullscreenText.textContent = text;
    fullscreenText.style.backgroundColor = bgColor;
    fullscreenText.style.color = textColor;
    fullscreenOverlay.classList.add('fullscreen');

    if (bgColor === "#121212" || bgColor === "#1A237E" || 
        bgColor === "#333333" || bgColor === "#000000") {
        fullscreenOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.95)";
    } else {
        fullscreenOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.85)";
    }

    document.body.style.overflow = 'hidden';
}

function closeFullscreenView() {
    fullscreenOverlay.classList.remove('fullscreen');
    document.body.style.overflow = 'auto';
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
    } else {
        input.type = "password";
    }
}

function continueWithFacebook() {
    showNotification("Facebook लॉगिन यहाँ लागू किया जाएगा");
}

function forgotPassword() {
    showNotification("पासवर्ड रीसेट कार्यक्षमता यहाँ लागू की जाएगी");
}

function goToUserPanel() {
    userPanel.style.display = "block";
    container.innerHTML = "";
    container.style.display = "none";
    gameControls.style.display = "none";
    logoutIcon.style.display = "none";
    exitIcon.style.display = "none";
}

async function saveUserSettings() {
    if (!currentUser) return;

    const settings = {
        cardColorBefore,
        cardColorAfter,
        revealedTextColor,
        revealedFontSize,
        revealedPosition
    };

    try {
        await db.collection("users").doc(currentUser.uid).update({
            settings,
            scratchCards: results
        });
    } catch (error) {
        console.error("सेटिंग्स सहेजने में त्रुटि:", error);
        showNotification("सेटिंग्स सहेजने में त्रुटि", false);
    }
}

async function resetSettings() {
    if (!currentUser) return;

    try {
        await db.collection("users").doc(currentUser.uid).update({
            settings: {
                cardColorBefore: "#F06292",
                cardColorAfter: "#FFC1E3",
                revealedTextColor: "#B71C1C",
                revealedFontSize: 14,
                revealedPosition: "middle-center"
            }
        });

        cardColorBefore = "#F06292";
        cardColorAfter = "#FFC1E3";
        revealedTextColor = "#B71C1C";
        revealedFontSize = 14;
        revealedPosition = "middle-center";

        document.getElementById("cardColorBefore").value = cardColorBefore;
        document.getElementById("cardColorAfter").value = cardColorAfter;
        document.getElementById("revealedTextColor").value = revealedTextColor;
        document.getElementById("revealedTextSize").value = revealedFontSize;
        document.getElementById("revealedPosition").value = revealedPosition;

        document.getElementById("cardColorBeforeValue").textContent = cardColorBefore;
        document.getElementById("cardColorAfterValue").textContent = cardColorAfter;
        document.getElementById("revealedTextColorValue").textContent = revealedTextColor;

        showNotification("सेटिंग्स डिफ़ॉल्ट पर रीसेट की गईं!");
    } catch (error) {
        console.error("सेटिंग्स रीसेट करने में त्रुटि:", error);
        showNotification("सेटिंग्स रीसेट करने में त्रुटि। कृपया पुनः प्रयास करें।", false);
    }
}

async function applySettings() {
    console.log("Applying settings...");
    cardColorBefore = document.getElementById("cardColorBefore").value;
    cardColorAfter = document.getElementById("cardColorAfter").value;
    revealedTextColor = document.getElementById("revealedTextColor").value;
    revealedFontSize = parseInt(document.getElementById("revealedTextSize").value);
    revealedPosition = document.getElementById("revealedPosition").value;

    await saveUserSettings();
    console.log("Settings applied:", { cardColorBefore, cardColorAfter, revealedTextColor, revealedFontSize, revealedPosition });
    showNotification("सेटिंग्स सफलतापूर्वक लागू की गईं!");
}

async function addText() {
    const addTextInput = document.getElementById("addText");
    const text = addTextInput.value.trim();
    if (!text) {
        showNotification("कृपया टेक्स्ट दर्ज करें!", false);
        return;
    }

    results.push({ name: text });
    await saveUserSettings();
    updateDeleteTextDropdown();
    addTextInput.value = "";
    showNotification(`"${text}" पुरस्कार सूची में जोड़ा गया!`);
}

async function deleteText() {
    const selectedText = deleteTextSelect.value;
    if (!selectedText) {
        showNotification("हटाने के लिए कोई पुरस्कार चयनित नहीं!", false);
        return;
    }

    if (confirm(`क्या आप "${selectedText}" को हटाना चाहते हैं?`)) {
        results = results.filter(item => item.name !== selectedText);
        await saveUserSettings();
        updateDeleteTextDropdown();
        showNotification(`"${selectedText}" पुरस्कार सूची से हटा दिया गया!`);
    }
}

function updateDeleteTextDropdown() {
    deleteTextSelect.innerHTML = "";

    if (results.length === 0) {
        const option = document.createElement("option");
        option.textContent = "कोई पुरस्कार उपलब्ध नहीं";
        option.disabled = true;
        option.selected = true;
        deleteTextSelect.appendChild(option);
        return;
    }

    results.forEach(item => {
        if (item.name) {
            const option = document.createElement("option");
            option.value = item.name;
            option.textContent = item.name.length > 20 ? item.name.substring(0, 20) + "..." : item.name;
            option.title = item.name;
            deleteTextSelect.appendChild(option);
        }
    });
}

async function playGame() {
    if (!currentUser) {
        showNotification("खेलने के लिए कृपया लॉगिन करें!");
        return;
    }

    if (results.length === 0) {
        showNotification("खेलने से पहले कुछ पुरस्कार टेक्स्ट जोड़ें!");
        return;
    }

    await saveUserSettings();
    userPanel.style.display = "none";
    gameControls.style.display = "flex";
    logoutIcon.style.display = "none";
    exitIcon.style.display = "block";
    userIcon.style.display = "none";
    container.style.display = "grid";
    createScratchCards();
}

function createScratchCards() {
    container.innerHTML = "";
    usedResults = [];

    const shuffledResults = [...results].sort(() => Math.random() - 0.5);
    const cardsToShow = Math.min(30, shuffledResults.length);

    for (let i = 0; i < cardsToShow; i++) {
        const result = shuffledResults[i];
        const card = document.createElement("div");
        card.classList.add("scratch-card");
        card.style.backgroundColor = cardColorBefore;

        const cardInner = document.createElement("div");
        cardInner.className = "card-inner";
        card.appendChild(cardInner);

        const cardFront = document.createElement("div");
        cardFront.className = "card-front";
        cardFront.style.backgroundColor = cardColorBefore;

        const defaultImage = document.createElement("img");
        defaultImage.src = "/images/xyz.png";
        defaultImage.alt = "Click to reveal";
        defaultImage.style.width = "80%";
        defaultImage.style.height = "80%";
        defaultImage.style.objectFit = "contain";
        cardFront.appendChild(defaultImage);

        cardInner.appendChild(cardFront);

        const cardBack = document.createElement("div");
        cardBack.className = "card-back";

        const scheme = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];
        cardBack.style.backgroundColor = scheme.bg;

        const resultText = document.createElement("div");
        resultText.className = "result-text";
        resultText.textContent = result.name;
        resultText.style.color = scheme.text;
        resultText.style.fontSize = revealedFontSize + "px";

        switch (revealedPosition) {
            case "top-center":
                cardBack.style.justifyContent = "flex-start";
                cardBack.style.alignItems = "center";
                break;
            case "middle-center":
                cardBack.style.justifyContent = "center";
                cardBack.style.alignItems = "center";
                break;
            case "bottom-center":
                cardBack.style.justifyContent = "flex-end";
                cardBack.style.alignItems = "center";
                break;
        }

        const fullscreenBtn = document.createElement("div");
        fullscreenBtn.className = "fullscreen-btn";
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        fullscreenBtn.onclick = function(e) {
            e.stopPropagation();
            showFullScreen(result.name, scheme.bg, scheme.text);
        };

        cardBack.appendChild(resultText);
        cardBack.appendChild(fullscreenBtn);
        cardInner.appendChild(cardBack);

        card.addEventListener("click", function() {
            if (!card.classList.contains("flipped")) {
                card.classList.add("flipped");
                cardInner.style.transform = "rotateY(180deg)";
                usedResults.push(result);
            }
        });

        let lastClick = 0;
        resultText.addEventListener("click", function(e) {
            const now = new Date().getTime();
            if (now - lastClick < 300) {
                e.stopPropagation();
                this.classList.add("expanded");
                document.body.style.overflow = "hidden";
            }
            lastClick = now;
        });

        resultText.addEventListener("click", function(e) {
            if (this.classList.contains("expanded")) {
                const rect = this.getBoundingClientRect();
                const isCloseClick = e.clientX >= rect.right - 40 && e.clientY <= rect.top + 40;
                if (isCloseClick) {
                    this.classList.remove("expanded");
                    document.body.style.overflow = "auto";
                }
            }
        });

        container.appendChild(card);
    }
}

function resetCards() {
    createScratchCards();
    showNotification("कार्ड्स रीफ्रेश किए गए!");
}

let scrollInterval;
function startScrolling(direction) {
    clearInterval(scrollInterval);
    scrollInterval = setInterval(() => {
        if (direction === "up") {
            container.scrollTop -= 10;
        } else {
            container.scrollTop += 10;
        }
    }, 50);
}

function stopScrolling() {
    clearInterval(scrollInterval);
}

// Event Listeners
closeFullscreen.addEventListener("click", closeFullscreenView);

// Initialize
function init() {
    auth.onAuthStateChanged(async user => {
        if (user) {
            const userDoc = await db.collection("users").doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                currentUser = {
                    uid: user.uid,
                    email: user.email,
                    nickname: userData.nickname,
                    username: userData.originalUsername
                };
                loginForm.style.display = "none";
                signupForm.style.display = "none";
                userPanel.style.display = "block";
                logoutIcon.style.display = "block";
                userIcon.style.display = "none";
                await loadUserSettings();
            }
        } else {
            loginForm.style.display = "block";
            signupForm.style.display = "none";
            userPanel.style.display = "none";
            logoutIcon.style.display = "none";
            userIcon.style.display = "block";
        }
    });
}

init();