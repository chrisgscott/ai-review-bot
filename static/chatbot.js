console.log("Chatbot script loaded");

// Initialize all variables at the top
let businessProfile = {};
let initialQuestion = "";
const INITIAL_QUESTIONS = 1;
const FOLLOW_UP_QUESTIONS = 3;
let currentQuestion = 0;
let responses = [];
let askedQuestions = [];
let conversationHistory = "";
let collectingPersonalInfo = true;
let personalInfo = {
    firstName: '',
    email: ''
};
let personalInfoCollected = false;
let submitOptionShown = false;
let conversationStarted = false;

function initializeChatbot(firstName = null, email = null) {
    console.log("Initializing chatbot with:", firstName, email);
    
    if (firstName && email) {
        personalInfo.firstName = firstName;
        personalInfo.email = email;
        collectingPersonalInfo = false;
        personalInfoCollected = true;
    }

    console.log("Personal info:", personalInfo);
    console.log("Collecting personal info:", collectingPersonalInfo);

    if (typeof businessId !== 'undefined') {
        console.log("Business ID defined:", businessId);
        collectingPersonalInfo = !(personalInfo.firstName && personalInfo.email);
        startConversation();
    } else {
        console.log("Fetching business profile");
        fetch('/get_business_profile')
            .then(response => response.json())
            .then(data => {
                console.log("Business profile fetched:", data);
                businessProfile = data;
                startConversation();
            })
            .catch(error => {
                console.error('Error fetching business profile:', error);
                startConversation();
            });
    }
}

function startConversation() {
    console.log("Starting conversation");
    if (conversationStarted) return;
    conversationStarted = true;

    console.log("Collecting personal info:", collectingPersonalInfo);
    if (collectingPersonalInfo) {
        askPersonalInfoQuestion();
    } else {
        startMainConversation();
    }
}

function askPersonalInfoQuestion() {
    const question = personalInfo.firstName ? "Great! What's your email address?" : "Before we begin, could you please tell us your first name?";
    addMessage(question, true);
}

function startMainConversation() {
    console.log("Starting main conversation");
    personalInfoCollected = true;
    let greeting = `Hi there, ${personalInfo.firstName}`;
    let businessName = typeof businessId !== 'undefined' ? '' : ` with ${businessProfile.business_name || 'our business'}`;
    initialQuestion = `${greeting}! We'd love to hear about your experience${businessName}. How would you rate it overall?`;
    console.log("Initial question:", initialQuestion);
    addMessage(initialQuestion, true);
    askedQuestions.push(initialQuestion);
    
    document.getElementById('input-area').style.display = 'flex';
}

function addMessage(message, isBot = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = isBot ? 'chat chat-start' : 'chat chat-end';
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = isBot ? 'chat-bubble bg-base-300' : 'chat-bubble bg-accent text-accent-content';
    bubbleDiv.textContent = message;
    messageDiv.appendChild(bubbleDiv);
    document.getElementById('messages').appendChild(messageDiv);
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

function sendMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    if (message) {
        addMessage(message);
        userInput.value = '';
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
            } else if (!submitOptionShown) {
                showSubmitOption();
            } else {
                getNextQuestion();
            }
        }
    }
}

function getNextQuestion() {
    document.getElementById('input-area').style.display = 'none';
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
            if (submitOptionShown) {
                document.getElementById('action-buttons').style.display = 'flex';
            }
        }, 1000);
    });
}

function showSubmitOption() {
    addMessage("Thank you for your feedback. Your testimonial is ready to be submitted, or you can continue chatting for more detailed feedback.", true);
    submitOptionShown = true;
    
    document.getElementById('input-area').style.display = 'flex';
    document.getElementById('submit-testimonial').style.display = 'block';
    const actionButtons = document.getElementById('action-buttons');
    actionButtons.innerHTML = `
        <button onclick="getNextQuestion()" class="btn btn-primary mr-2">Keep Chatting</button>
    `;
    actionButtons.style.display = 'flex';
}

ffunction submitTestimonial() {
    const submitButton = document.getElementById('submit-testimonial');
    const actionButtons = document.getElementById('action-buttons');

    submitButton.disabled = true;
    submitButton.textContent = 'Submitting Your Testimonial...';
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

    // Only add uniqueId if it's defined
    if (typeof uniqueId !== 'undefined') {
        testimonialData.unique_id = uniqueId;
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
            return response.json().then(err => { throw err; });
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
        } else {
            errorMessage += 'Please try again later.';
        }
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

function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat chat-start';
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'chat-bubble bg-base-300 typing-indicator';
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

// Initialize the chatbot when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const chatbotElement = document.getElementById('chatbot');
    if (chatbotElement) {
        const firstName = chatbotElement.dataset.firstName;
        const email = chatbotElement.dataset.email;
        initializeChatbot(firstName, email);
    } else {
        console.error('Chatbot element not found');
    }
});