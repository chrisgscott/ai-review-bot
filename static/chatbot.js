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

function submitTestimonial() {
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