let businessProfile = {};
let initialQuestion = "Hi there! We'd love to hear about your experience with our business. How would you rate it overall?";
const INITIAL_QUESTIONS = 1;
const FOLLOW_UP_QUESTIONS = 3;
let currentQuestion = 0;
let responses = [];
let askedQuestions = [];
let conversationHistory = "";

function initializeChatbot(submitEndpoint) {
    // Fetch business profile and start conversation
    fetch('/get_business_profile')
        .then(response => response.json())
        .then(data => {
            businessProfile = data;
            if (businessProfile.business_name) {
                initialQuestion = `Hi there! We'd love to hear about your experience with ${businessProfile.business_name}. How would you rate it overall?`;
            }
            startConversation();
        });

    document.getElementById('submit-testimonial').addEventListener('click', () => submitTestimonial(submitEndpoint));
}

function startConversation() {
    addMessage(initialQuestion, true);
    askedQuestions.push(initialQuestion);
}

function addMessage(message, isBot = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = isBot ? 'bot-message' : 'user-message';
    messageDiv.textContent = message;
    document.getElementById('messages').appendChild(messageDiv);
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    document.getElementById('messages').appendChild(typingDiv);
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function sendMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    if (message) {
        addMessage(message);
        responses.push(message);
        userInput.value = '';

        conversationHistory += `Q: ${askedQuestions[askedQuestions.length - 1]}\nA: ${message}\n`;

        if (askedQuestions.length < INITIAL_QUESTIONS + FOLLOW_UP_QUESTIONS) {
            getNextQuestion();
        } else {
            showSubmitOption();
        }
    }
}

function getNextQuestion() {
    document.getElementById('input-area').style.display = 'none';
    document.getElementById('action-buttons').style.display = 'none';
    addTypingIndicator();

    fetch('/get_next_question', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversation_history: conversationHistory }),
    })
    .then(response => response.json())
    .then(data => {
        const nextQuestion = data.question;
        setTimeout(() => {
            removeTypingIndicator();
            addMessage(nextQuestion, true);
            askedQuestions.push(nextQuestion);
            document.getElementById('input-area').style.display = 'flex';
        }, 1000);
    });
}

function showSubmitOption() {
    addMessage("Thank you for your feedback. Feel free to submit this now, or we can keep chatting if you'd like to share more.", true);
    document.getElementById('input-area').style.display = 'none';
    document.getElementById('action-buttons').style.display = 'flex';
    document.getElementById('submit-testimonial').style.display = 'block';
}

function submitTestimonial(submitEndpoint) {
    document.getElementById('submit-testimonial').disabled = true;
    document.getElementById('submit-testimonial').textContent = 'Submitting...';
    document.getElementById('action-buttons').style.display = 'none';

    fetch(submitEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            questions: askedQuestions,
            responses: responses 
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            window.location.href = data.redirect;
        } else {
            alert('There was an error submitting your testimonial. Please try again.');
            document.getElementById('submit-testimonial').disabled = false;
            document.getElementById('submit-testimonial').textContent = 'Submit Testimonial';
            document.getElementById('action-buttons').style.display = 'flex';
        }
    });
}