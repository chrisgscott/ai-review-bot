console.log("Onboarding script loaded");

let businessProfile = {};
let currentQuestion = 0;
let responses = [];
let askedQuestions = [];
let conversationHistory = "";
let personalInfo = {
    email: ''
};
let baseUrl = '';
let dashboardButtonAdded = false;

const questions = [
    "First, what's the name of your business?",
    "Great, now tell me a bit about {business_name} so I can get you even better testimonials from your customers and clients.",
    "Ok, let's talk about the kinds of testimonials you'd like to get. Do you want testimonials that highlight your service? Your value? How amazing your product quality is? Tell me a bit about the kinds of things you'd like your testimonials to highlight and I'll be sure to ask questions that will focus on those things.",
    "Almost done! We've created a custom URL for you: {custom_url}. Is this okay, or would you like to change it? (Reply 'OK' to keep it, or type a new slug to change it)",
    "Finally, do you have an external website like Google or Yelp where you'd like to collect reviews? If so, please provide the URL. If not, just type 'skip'."
];

function initializeOnboarding() {
    console.log("Initializing onboarding");
    const chatbotElement = document.getElementById('chatbot');
    if (chatbotElement) {
        personalInfo.email = chatbotElement.dataset.email;
        baseUrl = new URL(chatbotElement.dataset.baseUrl);
        baseUrl.protocol = window.location.protocol; // Use the current protocol
        console.log("Email:", personalInfo.email);
        console.log("Base URL:", baseUrl.toString());
        startConversation();
    } else {
        console.error("Chatbot element not found");
    }
}

function startConversation() {
    console.log("Starting conversation");
    document.getElementById('input-area').style.display = 'flex';
    addMessageWithDelay(`Welcome! Let's set up your business profile.`, true)
        .then(() => askNextQuestion());
}

function addMessageWithDelay(message, isBot = false, delay = 1000) {
    return new Promise((resolve) => {
        setTimeout(() => {
            removeTypingIndicator();
            addMessage(message, isBot);
            if (isBot) {
                scrollToBottom();
            }
            resolve();
        }, delay);
    });
}

function addMessage(message, isBot = false) {
    console.log("Adding message:", message, "isBot:", isBot);
    const messageDiv = document.createElement('div');
    messageDiv.className = isBot ? 'chat chat-start' : 'chat chat-end';
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = isBot ? 'chat-bubble bg-base-300' : 'chat-bubble bg-accent text-accent-content';
    bubbleDiv.textContent = message;
    messageDiv.appendChild(bubbleDiv);
    document.getElementById('messages').appendChild(messageDiv);
    scrollToBottom();
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat chat-start';
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'chat-bubble bg-base-300';
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'typing-indicator';
    indicatorDiv.innerHTML = '<span></span><span></span><span></span>';
    bubbleDiv.appendChild(indicatorDiv);
    typingDiv.appendChild(bubbleDiv);
    document.getElementById('messages').appendChild(typingDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
    const typingIndicator = document.querySelector('.chat-start:last-child');
    if (typingIndicator && typingIndicator.querySelector('.typing-indicator')) {
        typingIndicator.remove();
    }
}

function askNextQuestion() {
    console.log("Asking next question, current question:", currentQuestion);
    if (currentQuestion < questions.length) {
        let question = questions[currentQuestion].replace('{business_name}', businessProfile.business_name || 'your business');
        if (currentQuestion === 3) {
            businessProfile.custom_url = generateCustomUrl(businessProfile.business_name || personalInfo.email.split('@')[0]);
            question = question.replace('{custom_url}', `${baseUrl}for/${businessProfile.custom_url}`);
        }
        addTypingIndicator();
        scrollToBottom();
        setTimeout(() => {
            addMessageWithDelay(question, true);
        }, 1500);
        askedQuestions.push(question);
    } else {
        finishOnboarding();
    }
}

function sendMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    if (message) {
        addMessage(message);
        userInput.value = '';
        handleResponse(message);
    }
}

function handleResponse(message) {
    responses.push(message);
    conversationHistory += `Q: ${askedQuestions[currentQuestion]}\nA: ${message}\n`;

    switch (currentQuestion) {
        case 0:
            businessProfile.business_name = message;
            currentQuestion++;
            askNextQuestion();
            break;
        case 1:
            businessProfile.business_description = message;
            currentQuestion++;
            askNextQuestion();
            break;
        case 2:
            businessProfile.testimonial_guidance = message;
            currentQuestion++;
            askNextQuestion();
            break;
        case 3:
            if (message.toLowerCase() === 'ok') {
                addTypingIndicator();
                setTimeout(() => {
                    removeTypingIndicator();
                    addMessageWithDelay(`Great! We'll keep your custom URL as: ${baseUrl}for/${businessProfile.custom_url}`, true)
                        .then(() => {
                            currentQuestion++;
                            askNextQuestion();
                        });
                }, 1500);
            } else if (message.toLowerCase() !== 'no') {
                checkCustomUrlAvailability(message);
            }
            break;
        case 4:
            businessProfile.review_url = message.toLowerCase() !== 'skip' ? message : '';
            finishOnboarding();
            break;
    }
}

function checkCustomUrlAvailability(url) {
    addTypingIndicator();
    fetch(`${baseUrl}api/check_custom_url/${url}`)
        .then(response => response.json())
        .then(data => {
            removeTypingIndicator();
            if (data.available) {
                businessProfile.custom_url = url;
                addMessageWithDelay(`Great! Your custom URL has been updated to: ${baseUrl}for/${url}`, true)
                    .then(() => {
                        currentQuestion++;
                        askNextQuestion();
                    });
            } else {
                addMessageWithDelay("I'm sorry, that URL is not available. Please try another one.", true);
            }
        })
        .catch(error => {
            removeTypingIndicator();
            console.error('Error checking custom URL availability:', error);
            addMessageWithDelay("There was an error checking the URL availability. Please try again.", true);
        });
}

function finishOnboarding() {
    addTypingIndicator();
    setTimeout(() => {
        removeTypingIndicator();
        addMessageWithDelay("Great! We've collected all the information we need. Let's save your profile.", true)
            .then(() => saveProfile());
    }, 1500);
}

function saveProfile() {
    addTypingIndicator();
    fetch(`${baseUrl}api/onboarding/save`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(businessProfile),
    })
    .then(response => response.json())
    .then(data => {
        removeTypingIndicator();
        if (data.status === 'success') {
            addMessageWithDelay("Your profile has been saved successfully!", true)
                .then(() => addMessageWithDelay("When you're ready, click the button below to go to your dashboard.", true))
                .then(() => showDashboardButton());
        } else {
            throw new Error(data.message || 'Unknown error occurred');
        }
    })
    .catch(error => {
        removeTypingIndicator();
        console.error('Error saving profile:', error);
        addMessageWithDelay("There was an error saving your profile. Please try again or contact support.", true);
    });
}

function showDashboardButton() {
    if (!dashboardButtonAdded) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'mt-4';
        const dashboardButton = document.createElement('button');
        dashboardButton.textContent = 'Go to Dashboard';
        dashboardButton.className = 'btn btn-primary';
        dashboardButton.addEventListener('click', goToDashboard);
        buttonContainer.appendChild(dashboardButton);
        document.getElementById('chatbot').appendChild(buttonContainer);
        
        // Remove the input area
        document.getElementById('input-area').style.display = 'none';
        
        dashboardButtonAdded = true;
    }
}

function goToDashboard() {
    window.location.href = `${baseUrl}dashboard`;
}

function generateCustomUrl(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

document.addEventListener('DOMContentLoaded', initializeOnboarding);

document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});