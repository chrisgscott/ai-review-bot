let businessProfile = {};
let initialQuestion = "Hi there! We'd love to hear about your experience. How would you rate it overall?";
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
    // Check if the chatbot has already been initialized
    if (document.querySelector('#messages').children.length > 0) {
        return;
    }

    if (firstName && email) {
        personalInfo.firstName = firstName;
        personalInfo.email = email;
        collectingPersonalInfo = false;
    }

    // Check if we're on the custom review page
    if (typeof businessId !== 'undefined') {
        // For custom review page, we still want to collect info if not provided
        collectingPersonalInfo = !(personalInfo.firstName && personalInfo.email);
        startConversation();
    } else {
        // Fetch business profile and start conversation
        fetch('/get_business_profile')
            .then(response => response.json())
            .then(data => {
                businessProfile = data;
                startConversation();
            })
            .catch(error => {
                console.error('Error fetching business profile:', error);
                startConversation(); // Start conversation even if profile fetch fails
            });
    }
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
    // Clear any existing messages to prevent duplication
    document.querySelector('#messages').innerHTML = '';

    if (typeof businessId !== 'undefined' && (!personalInfo.firstName || !personalInfo.email)) {
        // Custom review flow, but personal info not collected
        collectingPersonalInfo = true;
        askPersonalInfoQuestion();
    } else {
        // Original testimonial request flow or custom review flow with personal info
        let greeting = typeof businessId !== 'undefined' ? 'Hi there' : `Hi there, ${personalInfo.firstName}`;
        let businessName = businessProfile ? businessProfile.business_name : 'our business';
        initialQuestion = `${greeting}! We'd love to hear about your experience${typeof businessId !== 'undefined' ? '' : ` with ${businessName}`}. How would you rate it overall?`;
        addMessage(initialQuestion, true);
        askedQuestions = [initialQuestion]; // Reset askedQuestions to only include the initial question
    }
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
        
        // Reset the height of the textarea
        userInput.style.height = 'auto';

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
    const submitButton = document.getElementById('submit-testimonial');
    const actionButtons = document.getElementById('action-buttons');

    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    actionButtons.style.display = 'none';

    const testimonialData = {
        questions: askedQuestions,
        responses: responses,
        firstName: personalInfo.firstName,
        email: personalInfo.email
    };

    if (typeof businessId !== 'undefined') {
        testimonialData.business_id = businessId;
    }

    fetch('/submit_testimonial', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(testimonialData),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            window.location.href = data.redirect;
        } else {
            throw new Error(data.message || 'Unknown error occurred');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        let errorMessage = 'There was an error submitting your testimonial. ';
        if (error.message) {
            errorMessage += error.message;
        }
        errorMessage += ' Please try again.';
        showErrorMessage(errorMessage);
    })
    .finally(() => {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Testimonial';
        actionButtons.style.display = 'flex';
    });
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.textContent = message;
    document.getElementById('chatbot').prepend(errorDiv);

    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}


// Make sure initializeChatbot is called when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeChatbot();
});