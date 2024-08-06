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

const questions = [
    "First, what's the name of your business?",
    "Great, now tell me a bit about {business_name} so I can get you even better testimonials from your customers and clients.",
    "So, do you want testimonials that highlight your service? Your value? How amazing your product quality is? Tell me a bit about the kinds of things you'd like your testimonials to highlight and I'll be sure to ask questions that will focus on those things.",
    "Almost done! We've created a custom URL for you: {custom_url}. Is this okay, or would you like to change it? (Reply 'OK' to keep it, or type a new slug to change it)",
    "Finally, do you have an external website where you'd like to collect reviews? If so, please provide the URL. If not, just type 'skip'."
];

function initializeOnboarding() {
    console.log("Initializing onboarding");
    const chatbotElement = document.getElementById('chatbot');
    if (chatbotElement) {
        personalInfo.email = chatbotElement.dataset.email;
        baseUrl = new URL(chatbotElement.dataset.baseUrl);
        baseUrl.protocol = 'https:';  // Force HTTPS
        console.log("Email:", personalInfo.email);
        console.log("Base URL:", baseUrl.toString());
        startConversation();
    } else {
        console.error("Chatbot element not found");
    }
}

function startConversation() {
    console.log("Starting conversation");
    addMessage(`Welcome! Let's set up your business profile.`, true);
    askNextQuestion();
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
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;

    if (isBot) {
        document.getElementById('input-area').style.display = 'flex';
    }
}

function askNextQuestion() {
    console.log("Asking next question, current question:", currentQuestion);
    if (currentQuestion < questions.length) {
        let question = questions[currentQuestion].replace('{business_name}', businessProfile.business_name || 'your business');
        if (currentQuestion === 3) {
            // Generate and store the initial custom URL
            businessProfile.custom_url = generateCustomUrl(businessProfile.business_name || personalInfo.email.split('@')[0]);
            question = question.replace('{custom_url}', `${baseUrl}review/${businessProfile.custom_url}`);
        }
        addMessage(question, true);
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
            break;
        case 1:
            businessProfile.business_description = message;
            break;
        case 2:
            businessProfile.testimonial_guidance = message;
            break;
        case 3:
            if (message.toLowerCase() === 'ok') {
                // User is happy with the auto-generated URL
                addMessage(`Great! We'll keep your custom URL as: ${baseUrl}review/${businessProfile.custom_url}`, true);
                currentQuestion++;
                askNextQuestion();
            } else if (message.toLowerCase() !== 'no') {
                // User wants to change the URL
                checkCustomUrlAvailability(message);
                return;
            }
            break;
        case 4:
            businessProfile.review_url = message.toLowerCase() !== 'skip' ? message : '';
            break;
    }

    currentQuestion++;
    askNextQuestion();
}

function checkCustomUrlAvailability(url) {
    fetch(`${baseUrl}api/check_custom_url/${url}`)
        .then(response => response.json())
        .then(data => {
            if (data.available) {
                businessProfile.custom_url = url;
                addMessage(`Great! Your custom URL has been updated to: ${baseUrl}review/${url}`, true);
                currentQuestion++;
                askNextQuestion();
            } else {
                addMessage("I'm sorry, that URL is not available. Please try another one.", true);
            }
        })
        .catch(error => {
            console.error('Error checking custom URL availability:', error);
            addMessage("There was an error checking the URL availability. Please try again.", true);
        });
}

function finishOnboarding() {
    addMessage("Great! We've collected all the information we need. Let's save your profile and head to your dashboard!", true);
    saveProfile();
}

function saveProfile() {
    fetch(`${baseUrl}api/onboarding/save`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(businessProfile),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            addMessage("Your profile has been saved successfully. Redirecting to your dashboard...", true);
            setTimeout(() => {
                window.location.href = `${baseUrl}dashboard`;
            }, 3000);
        } else {
            throw new Error(data.message || 'Unknown error occurred');
        }
    })
    .catch(error => {
        console.error('Error saving profile:', error);
        addMessage("There was an error saving your profile. Please try again or contact support.", true);
    });
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