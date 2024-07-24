let businessProfile = {};
let initialQuestion = "Hi there! We'd love to hear about your experience with our business. How would you rate it overall?";
const INITIAL_QUESTIONS = 1;
const FOLLOW_UP_QUESTIONS = 3;
let currentQuestion = 0;
let responses = [];
let askedQuestions = [];
let conversationHistory = "";

const PERSONAL_INFO_QUESTIONS = [
    "Before we submit your testimonial, could you please tell us your first name?",
    "Great, thank you! And lastly, what's your email address?"
];
let collectingPersonalInfo = false;
let personalInfo = {
    firstName: '',
    email: ''
};

function initializeChatbot() {
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

    document.getElementById('submit-testimonial').addEventListener('click', submitTestimonial);
}

function startConversation() {
    addMessage(initialQuestion, true);
    askedQuestions.push(initialQuestion);
}

function addMessage(message, isBot = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = isBot ? 'chat chat-start' : 'chat chat-end';
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'chat-bubble' + (isBot ? '' : ' chat-bubble-primary');
    bubbleDiv.textContent = message;
    messageDiv.appendChild(bubbleDiv);
    document.getElementById('messages').appendChild(messageDiv);
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat chat-start';
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'chat-bubble typing-indicator';
    bubbleDiv.innerHTML = '<span></span><span></span><span></span>';
    typingDiv.appendChild(bubbleDiv);
    document.getElementById('messages').appendChild(typingDiv);
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.closest('.chat').remove();
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
    addMessage("Thank you for your feedback. We just need a couple more details before submitting.", true);
    collectingPersonalInfo = true;
    getNextQuestion();
}

function getNextQuestion() {
    document.getElementById('input-area').style.display = 'none';
    document.getElementById('action-buttons').style.display = 'none';
    addTypingIndicator();

    if (collectingPersonalInfo) {
        const nextQuestion = PERSONAL_INFO_QUESTIONS[personalInfo.firstName ? 1 : 0];
        setTimeout(() => {
            removeTypingIndicator();
            addMessage(nextQuestion, true);
            askedQuestions.push(nextQuestion);
            document.getElementById('input-area').style.display = 'flex';
        }, 1000);
    } else {
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
}

function sendMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    if (message) {
        addMessage(message);
        responses.push(message);
        userInput.value = '';

        if (collectingPersonalInfo) {
            if (!personalInfo.firstName) {
                personalInfo.firstName = message;
                getNextQuestion();
            } else if (!personalInfo.email) {
                personalInfo.email = message;
                finalizeSubmission();
            }
        } else {
            conversationHistory += `Q: ${askedQuestions[askedQuestions.length - 1]}\nA: ${message}\n`;

            if (askedQuestions.length < INITIAL_QUESTIONS + FOLLOW_UP_QUESTIONS) {
                getNextQuestion();
            } else {
                showSubmitOption();
            }
        }
    }
}

function finalizeSubmission() {
    addMessage("Thank you! Your testimonial is ready to be submitted.", true);
    document.getElementById('input-area').style.display = 'none';
    document.getElementById('submit-testimonial').style.display = 'block';
}

function submitTestimonial() {
    document.getElementById('submit-testimonial').disabled = true;
    document.getElementById('submit-testimonial').textContent = 'Submitting...';

    fetch('/submit_testimonial', {  // Changed this line
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            questions: askedQuestions,
            responses: responses,
            firstName: personalInfo.firstName,
            email: personalInfo.email
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
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('There was an error submitting your testimonial. Please try again.');
        document.getElementById('submit-testimonial').disabled = false;
        document.getElementById('submit-testimonial').textContent = 'Submit Testimonial';
    });
}

// Make sure initializeChatbot is available globally
window.initializeChatbot = initializeChatbot;