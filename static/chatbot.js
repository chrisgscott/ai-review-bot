let businessProfile = {};
let initialQuestion = "Hi there! We'd love to hear about your experience with our business. How would you rate it overall?";
const INITIAL_QUESTIONS = 1;
const FOLLOW_UP_QUESTIONS = 3;
let currentQuestion = 0;
let responses = [];
let askedQuestions = [];
let conversationHistory = "";

const PERSONAL_INFO_QUESTIONS = [
    "Before we begin, could you please tell us your first name?",
    "Great, thank you! And what's your email address?"
];
let collectingPersonalInfo = true;
let personalInfo = {
    firstName: '',
    email: ''
};

function initializeChatbot(firstName = null, email = null) {
    if (firstName && email) {
        personalInfo.firstName = firstName;
        personalInfo.email = email;
        collectingPersonalInfo = false;
    }

    // Fetch business profile and start conversation
    fetch('/get_business_profile')
        .then(response => response.json())
        .then(data => {
            businessProfile = data;
            startConversation();
        });

    document.getElementById('submit-testimonial').addEventListener('click', submitTestimonial);
}

function startConversation() {
    if (collectingPersonalInfo) {
        askPersonalInfoQuestion();
    } else {
        startMainConversation();
    }
}

function askPersonalInfoQuestion() {
    const question = personalInfo.firstName ? PERSONAL_INFO_QUESTIONS[1] : PERSONAL_INFO_QUESTIONS[0];
    addMessage(question, true);
}

function startMainConversation() {
    initialQuestion = `Hi there, ${personalInfo.firstName}! We'd love to hear about your experience with ${businessProfile.business_name || 'our business'}. How would you rate it overall?`;
    addMessage(initialQuestion, true);
    askedQuestions.push(initialQuestion);
}

function addMessage(message, isBot = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = isBot ? 'chat chat-start' : 'chat chat-end';
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'chat-bubble chat-bubble-accent' + (isBot ? '' : ' chat-bubble-secondary');
    bubbleDiv.textContent = message;
    messageDiv.appendChild(bubbleDiv);
    document.getElementById('messages').appendChild(messageDiv);
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat chat-start';
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'chat-bubble chat-bubble-accent typing-indicator';
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
        userInput.value = '';

        if (collectingPersonalInfo) {
            if (!personalInfo.firstName) {
                personalInfo.firstName = message;
                askPersonalInfoQuestion();
            } else {
                personalInfo.email = message;
                collectingPersonalInfo = false;
                startMainConversation();
            }
        } else {
            responses.push(message);
            conversationHistory += `Q: ${askedQuestions[askedQuestions.length - 1]}\nA: ${message}\n`;

            if (askedQuestions.length < INITIAL_QUESTIONS + FOLLOW_UP_QUESTIONS) {
                getNextQuestion();
            } else {
                showSubmitOption();
            }
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
    addMessage("Thank you for your feedback. Your testimonial is ready to be submitted.", true);
    document.getElementById('input-area').style.display = 'none';
    document.getElementById('action-buttons').style.display = 'flex';
    document.getElementById('submit-testimonial').style.display = 'block';
}

function submitTestimonial() {
    document.getElementById('submit-testimonial').disabled = true;
    document.getElementById('submit-testimonial').textContent = 'Submitting...';
    document.getElementById('action-buttons').style.display = 'none';

    fetch('/submit_testimonial', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            questions: askedQuestions,
            responses: responses,
            firstName: personalInfo.firstName,
            email: personalInfo.email,
            business_id: businessId  // Add this line
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
    })
    .catch(error => {
        console.error('Error:', error);
        alert('There was an error submitting your testimonial. Please try again.');
        document.getElementById('submit-testimonial').disabled = false;
        document.getElementById('submit-testimonial').textContent = 'Submit Testimonial';
        document.getElementById('action-buttons').style.display = 'flex';
    });
}



// Make sure initializeChatbot is available globally
window.initializeChatbot = initializeChatbot;