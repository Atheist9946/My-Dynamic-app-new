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

// Initialize
let cards = [];
let currentUser = null;
let currentCardId = null;

// DOM Elements
const cardsContainer = document.getElementById('cardsContainer');
const commentsModal = document.getElementById('commentsModal');
const closeModalBtn = document.getElementById('closeModal');
const commentsList = document.getElementById('commentsList');
const commentInput = document.getElementById('commentInput');
const submitCommentBtn = document.getElementById('submitComment');

// Initialize with Firebase
function init() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user.uid;
        } else {
            currentUser = null;
            // Redirect to login if not authenticated
            window.location.href = "user2.html";
        }
    });

    // Real-time listener for cards
    db.collection("cards").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCards();
    });
}

// Render cards
function renderCards() {
    cardsContainer.innerHTML = '';

    if (cards.length === 0) {
        cardsContainer.innerHTML = `
            <div class="no-cards">
                <div class="card-icon">🃏</div>
                <h3>No Cards Found</h3>
                <p>Create cards in PCM to view them here</p>
            </div>
        `;
        return;
    }

    cards.forEach(card => {
        const flipContainer = document.createElement('div');
        flipContainer.className = 'flip-container';

        flipContainer.innerHTML = `
            <div class="flip-card" id="card-${card.id}">
                <div class="card-face card-front">
                    <div class="card-icon">🃏</div>
                    <h2 class="card-title ${card.fontStyle || ''}">
                        ${card.heading.replace(/\p{Emoji}/gu, '<span class="emoji">$&</span>')}
                    </h2>
                    <div class="card-content">
                        ${card.content.replace(/\p{Emoji}/gu, '<span class="emoji">$&</span>')}
                    </div>
                    <div class="card-actions">
                        <button class="action-btn like-btn ${card.likedBy?.includes(currentUser) ? 'active' : ''}" 
                            data-card-id="${card.id}" onclick="handleCardInteraction('${card.id}', 'like')">
                            <i class="fas fa-heart"></i> ${card.likes || 0}
                        </button>
                        <button class="action-btn" data-card-id="${card.id}" onclick="showComments('${card.id}')">
                            <i class="fas fa-comment"></i> ${card.comments ? card.comments.length : 0}
                        </button>
                        <button class="action-btn ${card.savedCards?.includes(currentUser) ? 'active' : ''}" 
                            data-card-id="${card.id}" onclick="handleCardInteraction('${card.id}', 'save')">
                            <i class="fas fa-bookmark"></i>
                        </button>
                    </div>
                    <div class="tap-hint">Tap to flip →</div>
                </div>
                <div class="card-face card-back">
                    <div class="card-icon">🎴</div>
                    <h2 class="card-title ${card.fontStyle || ''}">
                        ${card.heading.replace(/\p{Emoji}/gu, '<span class="emoji">$&</span>')}
                    </h2>
                    <div class="card-content">
                        ${card.secondaryContent ? 
                            card.secondaryContent.replace(/\p{Emoji}/gu, '<span class="emoji">$&</span>') : 
                            'No secondary content'}
                    </div>
                    <div class="card-actions">
                        <button class="action-btn like-btn ${card.likedBy?.includes(currentUser) ? 'active' : ''}" 
                            data-card-id="${card.id}" onclick="handleCardInteraction('${card.id}', 'like')">
                            <i class="fas fa-heart"></i> ${card.likes || 0}
                        </button>
                        <button class="action-btn" data-card-id="${card.id}" onclick="showComments('${card.id}')">
                            <i class="fas fa-comment"></i> ${card.comments ? card.comments.length : 0}
                        </button>
                        <button class="action-btn ${card.savedCards?.includes(currentUser) ? 'active' : ''}" 
                            data-card-id="${card.id}" onclick="handleCardInteraction('${card.id}', 'save')">
                            <i class="fas fa-bookmark"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        cardsContainer.appendChild(flipContainer);
    });
}

// Handle card interactions (like, save)
async function handleCardInteraction(cardId, action) {
    if (!currentUser) {
        showNotification("Please login to perform this action!", false);
        return;
    }

    const cardRef = db.collection("cards").doc(cardId);
    const card = cards.find(c => c.id === cardId);

    if (!card) return;

    try {
        if (action === 'like') {
            let updatedLikes = card.likes || 0;
            let updatedLikedBy = card.likedBy ? [...card.likedBy] : [];

            if (updatedLikedBy.includes(currentUser)) {
                updatedLikes--;
                updatedLikedBy = updatedLikedBy.filter(uid => uid !== currentUser);
            } else {
                updatedLikes++;
                updatedLikedBy.push(currentUser);
            }

            await cardRef.update({
                likes: updatedLikes,
                likedBy: updatedLikedBy
            });
            showNotification(`Card ${updatedLikedBy.includes(currentUser) ? 'liked' : 'unliked'}!`);
        } else if (action === 'save') {
            const userRef = db.collection("users").doc(currentUser);
            const userDoc = await userRef.get();
            let savedCards = userDoc.data()?.savedCards || [];

            if (savedCards.includes(cardId)) {
                savedCards = savedCards.filter(id => id !== cardId);
                showNotification("Card unsaved!");
            } else {
                savedCards.push(cardId);
                showNotification("Card saved!");
            }

            await userRef.update({
                savedCards: savedCards
            });
        }
    } catch (error) {
        console.error(`Error performing ${action}:`, error);
        showNotification(`Error performing ${action}!`, false);
    }
}

// Show comments modal
async function showComments(cardId) {
    if (!currentUser) {
        showNotification("Please login to view comments!", false);
        return;
    }

    currentCardId = cardId;
    const card = cards.find(c => c.id === cardId);

    if (!card) return;

    commentsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    commentsList.innerHTML = '';

    if (!card.allowComments) {
        commentsList.innerHTML = '<p style="text-align: center; color: #666;">Comments are disabled for this card</p>';
        commentInput.style.display = 'none';
        submitCommentBtn.style.display = 'none';
        return;
    } else {
        commentInput.style.display = 'block';
        submitCommentBtn.style.display = 'block';
    }

    const sortedComments = sortComments(card.comments);
    if (sortedComments.length === 0) {
        commentsList.innerHTML = '<p style="text-align: center; color: #666;">No comments yet</p>';
        return;
    }

    sortedComments.forEach(comment => {
        const commentItem = document.createElement('div');
        commentItem.className = `comment-item ${comment.pinned ? 'pinned' : ''}`;
        commentItem.innerHTML = `
            <div class="comment-header">
                <div class="comment-user">${comment.user}</div>
                <div class="comment-actions">
                    <span class="comment-action reply-comment ${comment.replies && comment.replies.length > 0 ? 'has-replies' : ''}" 
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
                ${comment.replies && comment.replies.length > 0 ? 
                    comment.replies.map(reply => `
                        <div class="reply-item">
                            <div class="comment-header">
                                <div class="comment-user">${reply.user}</div>
                                <div class="reply-actions">
                                    <span class="comment-action delete-comment" onclick="deleteReply('${cardId}', '${comment.id}', '${reply.id}')">
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
                    `).join('') : ''
                }
            </div>
        `;
        commentsList.appendChild(commentItem);
    });
}

// Add comment
async function addComment() {
    const text = commentInput.value.trim();
    if (!text) {
        showNotification('Please enter a comment!', false);
        return;
    }

    if (!currentCardId) return;

    const card = cards.find(c => c.id === currentCardId);
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
        await db.collection("cards").doc(currentCardId).update({
            comments: firebase.firestore.FieldValue.arrayUnion(newComment)
        });
        commentInput.value = '';
        showNotification('Comment added successfully!');
    } catch (error) {
        console.error("Error adding comment:", error);
        showNotification('Error adding comment!', false);
    }
}

// Toggle comment like
async function toggleCommentLike(cardId, commentId) {
    event.stopPropagation();

    const card = cards.find(c => c.id === cardId);
    if (!card || !card.comments) return;

    const comment = card.comments.find(c => c.id === commentId);
    if (!comment) return;

    let updatedLikes = comment.likes || 0;
    let updatedLikedBy = comment.likedBy ? [...comment.likedBy] : [];

    if (updatedLikedBy.includes(currentUser)) {
        updatedLikes--;
        updatedLikedBy = updatedLikedBy.filter(uid => uid !== currentUser);
    } else {
        updatedLikes++;
        updatedLikedBy.push(currentUser);
    }

    const updatedComments = card.comments.map(c =>
        c.id === commentId ? { ...c, likes: updatedLikes, likedBy: updatedLikedBy } : c
    );

    try {
        await db.collection("cards").doc(cardId).update({
            comments: updatedComments
        });
        showNotification(`Comment ${updatedLikedBy.includes(currentUser) ? 'liked' : 'unliked'}!`);
    } catch (error) {
        console.error("Error updating comment like:", error);
        showNotification('Error updating comment like!', false);
    }
}

// Toggle comment pin
async function toggleCommentPin(cardId, commentId) {
    const card = cards.find(c => c.id === cardId);
    if (!card || !card.comments) return;

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
        showNotification(`Comment ${newStatus ? 'pinned' : 'unpinned'}!`);
    } catch (error) {
        console.error("Error pinning comment:", error);
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
    showComments(cardId);
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
    if (!card || !card.comments) return;

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
        showComments(cardId);
    } catch (error) {
        console.error("Error adding reply:", error);
        showNotification('Error adding reply!', false);
    }
}

// Delete comment
async function deleteComment(cardId, commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    const card = cards.find(c => c.id === cardId);
    if (!card || !card.comments) return;

    const updatedComments = card.comments.filter(c => c.id !== commentId);

    try {
        await db.collection("cards").doc(cardId).update({
            comments: updatedComments
        });
        showNotification('Comment deleted successfully!');
        showComments(cardId);
    } catch (error) {
        console.error("Error deleting comment:", error);
        showNotification('Error deleting comment!', false);
    }
}

// Delete reply
async function deleteReply(cardId, commentId, replyId) {
    if (!confirm('Are you sure you want to delete this reply?')) return;

    const card = cards.find(c => c.id === cardId);
    if (!card || !card.comments) return;

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
        showComments(cardId);
    } catch (error) {
        console.error("Error deleting reply:", error);
        showNotification('Error deleting reply!', false);
    }
}

// Toggle reply section
function toggleReplySection(cardId, commentId) {
    const replyForm = document.getElementById(`reply-form-${cardId}-${commentId}`);
    const repliesList = document.getElementById(`replies-list-${cardId}-${commentId}`);

    if (replyForm && repliesList) {
        const isFormVisible = replyForm.style.display === 'block';
        replyForm.style.display = isFormVisible ? 'none' : 'block';
        repliesList.style.display = isFormVisible ? 'none' : 'block';
    }
}

// Sort comments (pinned first, then by date)
function sortComments(comments) {
    if (!comments) return [];

    return [...comments].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.date) - new Date(a.date);
    });
}

// Show notification
function showNotification(message, isSuccess = true) {
    alert(message); // Replace with a better notification system if needed
}

// Close comments modal
function closeModal() {
    commentsModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentCardId = null;
}

// Event listeners
closeModalBtn.addEventListener('click', closeModal);
commentsModal.addEventListener('click', (e) => {
    if (e.target === commentsModal) {
        closeModal();
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && commentsModal.style.display === 'flex') {
        closeModal();
    }
});
submitCommentBtn.addEventListener('click', addComment);

// Expose functions to global scope
window.handleCardInteraction = handleCardInteraction;
window.showComments = showComments;
window.toggleCommentLike = toggleCommentLike;
window.toggleCommentPin = toggleCommentPin;
window.toggleCommentExpansion = toggleCommentExpansion;
window.addReplyToComment = addReplyToComment;
window.deleteComment = deleteComment;
window.deleteReply = deleteReply;
window.toggleReplySection = toggleReplySection;

// Initialize
init();