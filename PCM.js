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

// Global variables
let cards = [];
let savedCards = [];
let currentUser = null;
let currentlyOpenCommentId = null;
let currentlyOpenReplyFormId = null;
let currentlyOpenCardId = null;

// Initialize the app
async function initApp() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user.uid;
            loadSavedCards(); // Load user's saved cards
        } else {
            currentUser = null;
            window.location.href = "user2.html"; // Redirect to login if not authenticated
        }
    });

    // Real-time listener for cards
    db.collection("cards").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        loadCards();
    });
}

// Load user's saved cards
async function loadSavedCards() {
    if (!currentUser) return;
    try {
        const userDoc = await db.collection("users").doc(currentUser).get();
        savedCards = userDoc.exists && userDoc.data().savedCards ? userDoc.data().savedCards : [];
    } catch (error) {
        console.error("Error loading saved cards: ", error);
        showNotification("Error loading saved cards!", false);
    }
}

// Load and render cards
function loadCards() {
    const cardsList = document.getElementById('cardsList');
    cardsList.innerHTML = '';

    if (cards.length === 0) {
        cardsList.innerHTML = '<div class="no-cards">No cards created yet</div>';
        return;
    }

    cards.forEach(card => {
        const sortedComments = sortComments(card.comments || []);
        const cardItem = document.createElement('div');
        cardItem.className = 'card-item';
        cardItem.innerHTML = `
            <div class="card-heading ${card.fontStyle || ''}">
                ${card.heading.replace(/\p{Emoji}/gu, '<span class="emoji">$&</span>') || ''}
            </div>
            <div class="card-item-content ${card.expanded ? '' : 'collapsed'} ${card.fontStyle || ''}">
                ${card.showSecondary && card.secondaryContent ? 
                    card.secondaryContent.replace(/\p{Emoji}/gu, '<span class="emoji">$&</span>') : 
                    card.content.replace(/\p{Emoji}/gu, '<span class="emoji">$&</span>')}
            </div>
            ${card.secondaryContent ? `
                <div class="language-toggle" onclick="toggleLanguage('${card.id}')">
                    ${card.showSecondary ? 'Show Original' : 'Show Translation'}
                </div>
            ` : ''}
            ${(card.content.length > 150 || (card.secondaryContent && card.secondaryContent.length > 150)) ? `
                <div class="show-more" onclick="toggleCardExpansion('${card.id}')">
                    ${card.expanded ? 'Show less' : 'Show more'}
                </div>
            ` : ''}
            <div class="card-item-meta">
                <span>${card.createdAt ? new Date(card.createdAt.toDate()).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                <div class="card-item-actions">
                    <button class="action-btn like ${card.likedBy?.includes(currentUser) ? 'active' : ''}" onclick="toggleCardLike('${card.id}')">
                        <span class="action-icon">${card.likedBy?.includes(currentUser) ? '❤️' : '🤍'}</span>
                        <span>${card.likes || 0}</span>
                    </button>
                    <button class="action-btn ${card.commentsExpanded ? 'active' : ''}" onclick="toggleCommentsSection('${card.id}')">
                        <span class="action-icon">💬</span>
                        <span>${card.comments ? card.comments.length : 0}</span>
                    </button>
                    <button class="action-btn ${savedCards.includes(card.id) ? 'active' : ''}" onclick="toggleSave('${card.id}')">
                        <span class="action-icon">🔖</span>
                    </button>
                    <button class="action-btn delete" onclick="deleteCard('${card.id}')">
                        <span class="action-icon">🗑️</span>
                    </button>
                    <button class="action-btn ${card.allowComments ? 'active' : ''}" onclick="toggleCardComments('${card.id}')">
                        <span class="comment-toggle-icon ${card.allowComments ? '' : 'locked'}">
                            <i class="fa-solid fa-comment"></i>
                        </span>
                    </button>
                </div>
            </div>
            <div class="comments-section" id="comments-section-${card.id}" ${card.commentsExpanded ? 'style="display: block;"' : ''}>
                <div class="comments-list" id="comments-list-${card.id}">
                    ${sortedComments.length > 0 ? 
                        sortedComments.map(comment => renderComment(card.id, comment)).join('') : 
                        '<p style="text-align: center; color: #666;">No comments yet</p>'
                    }
                </div>
                ${card.allowComments ? `
                    <div class="comment-form">
                        <input type="text" class="comment-input" id="comment-input-${card.id}" placeholder="Add a comment...">
                        <button class="comment-submit" onclick="addCommentToCard('${card.id}', 'comment-input-${card.id}')">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                ` : '<p class="comments-disabled">Comments are disabled for this card</p>'}
            </div>
        `;
        cardsList.appendChild(cardItem);
    });
}

// Render a single comment
function renderComment(cardId, comment) {
    return `
        <div class="comment-item ${comment.pinned ? 'pinned' : ''}">
            <div class="comment-header">
                <div class="comment-user">${comment.user || 'Anonymous'}</div>
                <div class="comment-actions">
                    <span class="comment-action reply-comment ${comment.replies?.length > 0 ? 'has-replies' : ''}" 
                          onclick="toggleReplySection('${cardId}', '${comment.id}')">
                        <i class="fas fa-reply"></i>
                    </span>
                    <span class="comment-action pin-comment" onclick="toggleCommentPin('${cardId}', '${comment.id}')">
                        <i class="fas fa-thumbtack"></i>
                    </span>
                    <span class="comment-action delete-comment" onclick="deleteComment('${cardId}', '${comment.id}')">
                        <i class="fas fa-trash"></i>
                    </span>
                </div>
            </div>
            <div class="comment-text ${comment.expanded || comment.text.length < 100 ? '' : 'collapsed'}">
                ${comment.text.replace(/\p{Emoji}/gu, '<span class="emoji">$&</span>')}
            </div>
            ${comment.text.length > 100 ? `
                <div class="comment-show-more" onclick="toggleCommentExpansion('${cardId}', '${comment.id}')">
                    ${comment.expanded ? 'Show less' : 'Show more'}
                </div>
            ` : ''}
            <div class="comment-footer">
                <div class="comment-likes" onclick="toggleCommentLike('${cardId}', '${comment.id}')">
                    <span class="action-icon">${comment.likedBy?.includes(currentUser) ? '❤️' : '🤍'}</span>
                    <span>${comment.likes || 0}</span>
                </div>
                <div>${new Date(comment.date).toLocaleString()}</div>
            </div>
            <div class="reply-form" id="reply-form-${cardId}-${comment.id}" style="display: none;">
                <input type="text" class="reply-input" id="reply-input-${cardId}-${comment.id}" placeholder="Write a reply...">
                <button class="reply-submit" onclick="addReplyToComment('${cardId}', '${comment.id}', 'reply-input-${cardId}-${comment.id}')">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
            <div class="replies-list" id="replies-list-${cardId}-${comment.id}" style="display: none;">
                ${comment.replies?.length > 0 ? 
                    comment.replies.map(reply => renderReply(cardId, comment.id, reply)).join('') : ''
                }
            </div>
        </div>
    `;
}

// Render a single reply
function renderReply(cardId, commentId, reply) {
    return `
        <div class="reply-item">
            <div class="comment-header">
                <div class="comment-user">${reply.user || 'Anonymous'}</div>
                <div class="reply-actions">
                    <span class="comment-action delete-comment" onclick="deleteReply('${cardId}', '${commentId}', '${reply.id}')">
                        <i class="fas fa-trash"></i>
                    </span>
                </div>
            </div>
            <div class="comment-text">
                ${reply.text.replace(/\p{Emoji}/gu, '<span class="emoji">$&</span>')}
            </div>
            <div class="comment-footer">
                <div>${new Date(reply.date).toLocaleString()}</div>
            </div>
        </div>
    `;
}

// Create a new card
async function createNewCard(e) {
    e.preventDefault();
    const heading = document.getElementById('cardHeading').value.trim();
    const content = document.getElementById('cardContent').value.trim();
    const secondaryContent = document.getElementById('secondaryLanguage').value.trim();
    const fontStyle = document.getElementById('fontStyle').value;
    const allowComments = document.getElementById('allowComments').checked;

    if (!heading || !content) {
        showNotification('Please enter card heading and content!', false);
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        showNotification("Please login to create a card!", false);
        return;
    }

    try {
        await db.collection("cards").add({
            heading,
            content,
            secondaryContent: secondaryContent || null,
            fontStyle,
            createdBy: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            likes: 0,
            likedBy: [],
            comments: [],
            allowComments,
            expanded: false,
            commentsExpanded: false,
            showSecondary: false
        });
        document.getElementById('cardHeading').value = '';
        document.getElementById('cardContent').value = '';
        document.getElementById('secondaryLanguage').value = '';
        document.getElementById('allowComments').checked = true;
        showNotification('Card created successfully!');
    } catch (error) {
        console.error("Error adding card: ", error);
        showNotification('Error creating card!', false);
    }
}

// Delete a card
async function deleteCard(cardId) {
    if (!confirm('Are you sure you want to delete this card?')) return;

    const user = auth.currentUser;
    if (!user) {
        showNotification("Please login to delete a card!", false);
        return;
    }

    const cardRef = db.collection("cards").doc(cardId);
    const card = await cardRef.get();

    if (card.data().createdBy === user.uid) {
        await cardRef.delete();
        showNotification('Card deleted successfully!');
    } else {
        showNotification("You don't have permission to delete this card!", false);
    }
}

// Toggle card like
async function toggleCardLike(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (!card || !currentUser) {
        showNotification("Please login to like a card!", false);
        return;
    }

    const userIndex = card.likedBy?.indexOf(currentUser) ?? -1;
    let updatedLikes = card.likes || 0;
    let updatedLikedBy = card.likedBy ? [...card.likedBy] : [];

    if (userIndex === -1) {
        updatedLikes++;
        updatedLikedBy.push(currentUser);
    } else {
        updatedLikes--;
        updatedLikedBy.splice(userIndex, 1);
    }

    try {
        await db.collection("cards").doc(cardId).update({
            likes: updatedLikes,
            likedBy: updatedLikedBy
        });
    } catch (error) {
        console.error("Error updating likes: ", error);
        showNotification('Error updating likes!', false);
    }
}

// Toggle save card
async function toggleSave(cardId) {
    if (!currentUser) {
        showNotification("Please login to save a card!", false);
        return;
    }

    try {
        await db.collection("users").doc(currentUser).update({
            savedCards: savedCards.includes(cardId) ?
                firebase.firestore.FieldValue.arrayRemove(cardId) :
                firebase.firestore.FieldValue.arrayUnion(cardId)
        });
        if (savedCards.includes(cardId)) {
            savedCards = savedCards.filter(id => id !== cardId);
        } else {
            savedCards.push(cardId);
        }
        showNotification('Card save status updated!');
    } catch (error) {
        console.error("Error updating save status: ", error);
        showNotification('Error updating save status!', false);
    }
}

// Toggle comments enabled/disabled
async function toggleCardComments(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (!card || !currentUser) {
        showNotification("Please login to toggle comments!", false);
        return;
    }

    const newStatus = !card.allowComments;

    try {
        await db.collection("cards").doc(cardId).update({
            allowComments: newStatus
        });
        showNotification(`Comments ${newStatus ? 'enabled' : 'disabled'} for this card`);
    } catch (error) {
        console.error("Error updating comments status: ", error);
        showNotification('Error updating comments status!', false);
    }
}

// Toggle card expansion
function toggleCardExpansion(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    card.expanded = !card.expanded;
    loadCards();
}

// Add comment to card
async function addCommentToCard(cardId, inputId) {
    const input = document.getElementById(inputId);
    const text = input.value.trim();
    if (!text) {
        showNotification('Please enter a comment!', false);
        return;
    }

    const card = cards.find(c => c.id === cardId);
    if (!card || !card.allowComments) {
        showNotification('Comments are disabled for this card!', false);
        return;
    }

    const newComment = {
        id: Date.now().toString(),
        user: currentUser,
        text,
        date: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        pinned: false,
        expanded: false,
        replies: []
    };

    try {
        await db.collection("cards").doc(cardId).update({
            comments: firebase.firestore.FieldValue.arrayUnion(newComment)
        });
        input.value = '';
        showNotification('Comment added successfully!');
    } catch (error) {
        console.error("Error adding comment: ", error);
        showNotification('Error adding comment!', false);
    }
}

// Toggle comment like
async function toggleCommentLike(cardId, commentId) {
    event.stopPropagation();
    const card = cards.find(c => c.id === cardId);
    if (!card || !card.comments || !currentUser) return;

    const comment = card.comments.find(c => c.id === commentId);
    if (!comment) return;

    const userIndex = comment.likedBy?.indexOf(currentUser) ?? -1;
    let updatedLikes = comment.likes || 0;
    let updatedLikedBy = comment.likedBy ? [...comment.likedBy] : [];

    if (userIndex === -1) {
        updatedLikes++;
        updatedLikedBy.push(currentUser);
    } else {
        updatedLikes--;
        updatedLikedBy.splice(userIndex, 1);
    }

    const updatedComments = card.comments.map(c =>
        c.id === commentId ? { ...c, likes: updatedLikes, likedBy: updatedLikedBy } : c
    );

    try {
        await db.collection("cards").doc(cardId).update({
            comments: updatedComments
        });
    } catch (error) {
        console.error("Error updating comment like: ", error);
        showNotification('Error updating comment like!', false);
    }
}

// Toggle comment pin
async function toggleCommentPin(cardId, commentId) {
    const card = cards.find(c => c.id === cardId);
    if (!card || !card.comments || !currentUser) return;

    const comment = card.comments.find(c => c.id === commentId);
    if (!comment) return;

    const newStatus = !comment.pinned;
    const updatedComments = card.comments.map(c =>
        c.id === commentId ? { ...c, pinned: newStatus } : c
    );

    try {
        await db.collection("cards").doc(cardId).update({
            comments: updatedComments
        });
        showNotification(`Comment ${newStatus ? 'pinned' : 'unpinned'}`);
    } catch (error) {
        console.error("Error pinning comment: ", error);
        showNotification('Error pinning comment!', false);
    }
}

// Toggle comment expansion
function toggleCommentExpansion(cardId, commentId) {
    const card = cards.find(c => c.id === cardId);
    if (!card || !card.comments) return;

    const comment = card.comments.find(c => c.id === commentId);
    if (!comment) return;

    comment.expanded = !comment.expanded;
    loadCards();
}

// Add reply to comment
async function addReplyToComment(cardId, commentId, inputId) {
    const input = document.getElementById(inputId);
    const text = input.value.trim();
    if (!text) {
        showNotification('Please enter a reply!', false);
        return;
    }

    const card = cards.find(c => c.id === cardId);
    if (!card || !card.comments || !currentUser) return;

    const comment = card.comments.find(c => c.id === commentId);
    if (!comment) return;

    const newReply = {
        id: Date.now().toString(),
        user: currentUser,
        text,
        date: new Date().toISOString()
    };

    const updatedComments = card.comments.map(c => {
        if (c.id === commentId) {
            const replies = c.replies ? [...c.replies, newReply] : [newReply];
            return { ...c, replies };
        }
        return c;
    });

    try {
        await db.collection("cards").doc(cardId).update({
            comments: updatedComments
        });
        input.value = '';
        showNotification('Reply added successfully!');
        const repliesList = document.getElementById(`replies-list-${cardId}-${commentId}`);
        if (repliesList) {
            repliesList.style.display = 'block';
        }
    } catch (error) {
        console.error("Error adding reply: ", error);
        showNotification('Error adding reply!', false);
    }
}

// Delete comment
async function deleteComment(cardId, commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    const card = cards.find(c => c.id === cardId);
    if (!card || !card.comments || !currentUser) return;

    const updatedComments = card.comments.filter(c => c.id !== commentId);

    try {
        await db.collection("cards").doc(cardId).update({
            comments: updatedComments
        });
        showNotification('Comment deleted successfully!');
    } catch (error) {
        console.error("Error deleting comment: ", error);
        showNotification('Error deleting comment!', false);
    }
}

// Delete reply
async function deleteReply(cardId, commentId, replyId) {
    if (!confirm('Are you sure you want to delete this reply?')) return;

    const card = cards.find(c => c.id === cardId);
    if (!card || !card.comments || !currentUser) return;

    const updatedComments = card.comments.map(comment => {
        if (comment.id === commentId && comment.replies) {
            const updatedReplies = comment.replies.filter(reply => reply.id !== replyId);
            return { ...comment, replies: updatedReplies };
        }
        return comment;
    });

    try {
        await db.collection("cards").doc(cardId).update({
            comments: updatedComments
        });
        showNotification('Reply deleted successfully!');
    } catch (error) {
        console.error("Error deleting reply: ", error);
        showNotification('Error deleting reply!', false);
    }
}

// Toggle language
function toggleLanguage(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    card.showSecondary = !card.showSecondary;
    loadCards();
}

// Toggle comments section
function toggleCommentsSection(cardId) {
    if (currentlyOpenCardId && currentlyOpenCardId !== cardId) {
        const prevCommentsSection = document.getElementById(`comments-section-${currentlyOpenCardId}`);
        if (prevCommentsSection) {
            prevCommentsSection.style.display = 'none';
        }
    }

    const commentsSection = document.getElementById(`comments-section-${cardId}`);
    if (commentsSection) {
        commentsSection.style.display = commentsSection.style.display === 'block' ? 'none' : 'block';
        currentlyOpenCardId = commentsSection.style.display === 'block' ? cardId : null;
    }

    const card = cards.find(c => c.id === cardId);
    if (card) {
        card.commentsExpanded = commentsSection.style.display === 'block';
    }
}

// Toggle reply section
function toggleReplySection(cardId, commentId) {
    if (currentlyOpenCommentId && currentlyOpenCommentId !== commentId) {
        const prevRepliesList = document.getElementById(`replies-list-${cardId}-${currentlyOpenCommentId}`);
        if (prevRepliesList) {
            prevRepliesList.style.display = 'none';
        }
    }

    if (currentlyOpenReplyFormId && currentlyOpenReplyFormId !== commentId) {
        const prevReplyForm = document.getElementById(`reply-form-${cardId}-${currentlyOpenReplyFormId}`);
        if (prevReplyForm) {
            prevReplyForm.style.display = 'none';
        }
    }

    const repliesList = document.getElementById(`replies-list-${cardId}-${commentId}`);
    if (repliesList) {
        repliesList.style.display = repliesList.style.display === 'block' ? 'none' : 'block';
        currentlyOpenCommentId = repliesList.style.display === 'block' ? commentId : null;
    }

    const replyForm = document.getElementById(`reply-form-${cardId}-${commentId}`);
    if (replyForm) {
        replyForm.style.display = replyForm.style.display === 'block' ? 'none' : 'block';
        currentlyOpenReplyFormId = replyForm.style.display === 'block' ? commentId : null;
    }
}

// Sort comments (pinned first, then by date descending)
function sortComments(comments) {
    if (!comments) return [];
    return [...comments].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!b.pinned && a.pinned) return 1;
        return new Date(b.date) - new Date(a.date);
    });
}

// Show notification
function showNotification(message, isSuccess = true) {
    const notification = document.getElementById('notification');
    const notificationMsg = document.getElementById('notification-message');

    notificationMsg.textContent = message;
    notification.className = `notification ${isSuccess ? '' : 'error'} show`;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.classList.remove('show');
        notification.style.display = 'none';
    }, 3000);
}

// Expose functions to global scope
window.toggleCardLike = toggleCardLike;
window.toggleSave = toggleSave;
window.deleteCard = deleteCard;
window.toggleCardComments = toggleCardComments;
window.toggleCardExpansion = toggleCardExpansion;
window.toggleCommentsSection = toggleCommentsSection;
window.addCommentToCard = addCommentToCard;
window.toggleCommentLike = toggleCommentLike;
window.toggleCommentPin = toggleCommentPin;
window.toggleCommentExpansion = toggleCommentExpansion;
window.toggleReplySection = toggleReplySection;
window.addReplyToComment = addReplyToComment;
window.deleteComment = deleteComment;
window.deleteReply = deleteReply;
window.toggleLanguage = toggleLanguage;

// Initialize the app
initApp();