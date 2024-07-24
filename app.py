from flask import Flask, render_template, request, jsonify, url_for, redirect, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_bcrypt import Bcrypt
from config import Config
from openai import OpenAI
import re
import uuid
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.config.from_object(Config)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///testimonials.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY')
app.config['BREVO_API_KEY'] = os.getenv('BREVO_API_KEY')

# Ensure that the secret key is set
if not app.config['SECRET_KEY']:
    raise ValueError("No SECRET_KEY set for Flask application")

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

client = OpenAI(api_key=app.config['OPENAI_API_KEY'])

# Configure Brevo API client
configuration = sib_api_v3_sdk.Configuration()
configuration.api_key['api-key'] = app.config['BREVO_API_KEY']
api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)

class Testimonial(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    questions = db.Column(db.Text, nullable=False)
    responses = db.Column(db.Text, nullable=False)
    sentiment = db.Column(db.String(20), nullable=False)
    score = db.Column(db.Float, nullable=False)
    snippets = db.Column(db.Text, nullable=False)
    summary = db.Column(db.Text, nullable=True)

class BusinessProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    business_name = db.Column(db.String(100), nullable=False)
    business_description = db.Column(db.Text, nullable=False)
    testimonial_guidance = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class TestimonialRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    unique_id = db.Column(db.String(36), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    submitted = db.Column(db.Boolean, default=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

with app.app_context():
    db.create_all()

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        existing_user = User.query.filter_by(username=username).first()
        if existing_user is None:
            hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
            new_user = User(username=username, password=hashed_password)
            db.session.add(new_user)
            db.session.commit()
            flash('Registration successful. Please log in.', 'success')
            return redirect(url_for('login'))
        flash('Username already exists.', 'danger')
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and bcrypt.check_password_hash(user.password, password):
            login_user(user)
            flash('Logged in successfully.', 'success')
            return redirect(url_for('dashboard'))
        flash('Invalid username or password.', 'danger')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Logged out successfully.', 'success')
    return redirect(url_for('login'))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/submit_testimonial/<unique_id>', methods=['GET', 'POST'])
def submit_testimonial_by_link(unique_id):
    testimonial_request = TestimonialRequest.query.filter_by(unique_id=unique_id).first_or_404()
    
    if testimonial_request.submitted:
        flash('This testimonial has already been submitted.', 'info')
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        data = request.json
        questions = data['questions']
        responses = data['responses']
        
        full_text = " ".join([f"Q: {q} A: {r}" for q, r in zip(questions, responses)])
        
        analysis = analyze_sentiment(full_text)
        snippets = extract_snippets(full_text)
        summary = generate_summary(full_text)
        
        testimonial = Testimonial(
            questions='\n'.join(questions),
            responses='\n'.join(responses),
            sentiment=analysis['sentiment'],
            score=analysis['score'],
            snippets=', '.join(snippets),
            summary=summary
        )
        
        db.session.add(testimonial)
        testimonial_request.submitted = True
        db.session.commit()
        
        return jsonify({'status': 'success', 'redirect': url_for('confirmation')})
    
    return render_template('submit_testimonial.html', first_name=testimonial_request.first_name)

@app.route('/submit_testimonial', methods=['POST'])
def submit_testimonial():
    data = request.json
    questions = data['questions']
    responses = data['responses']
    
    # Combine questions and responses for analysis
    full_text = " ".join([f"Q: {q} A: {r}" for q, r in zip(questions, responses)])
    
    # Perform sentiment analysis and snippet extraction
    analysis = analyze_sentiment(full_text)
    snippets = extract_snippets(full_text)
    
    # Generate summary
    summary = generate_summary(full_text)
    
    # Create a new Testimonial object
    testimonial = Testimonial(
        questions='\n'.join(questions),
        responses='\n'.join(responses),
        sentiment=analysis['sentiment'],
        score=analysis['score'],
        snippets=', '.join(snippets),
        summary=summary
    )
    
    # Add the new testimonial to the database
    db.session.add(testimonial)
    db.session.commit()
    
    return jsonify({'status': 'success', 'redirect': url_for('confirmation')})

@app.route('/send_testimonial_request', methods=['POST'])
@login_required
def send_testimonial_request():
    email = request.form['email']
    first_name = request.form['first_name']
    unique_id = str(uuid.uuid4())
    
    new_request = TestimonialRequest(
        email=email,
        first_name=first_name,
        unique_id=unique_id,
        user_id=current_user.id
    )
    db.session.add(new_request)
    db.session.commit()
    
    # Send email using Brevo
    testimonial_link = url_for('submit_testimonial_by_link', unique_id=unique_id, _external=True)
    
    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": email, "name": first_name}],
        template_id=1,  # Replace 1 with your actual template ID from Brevo
        params={
            "first_name": first_name,
            "testimonial_link": testimonial_link
        }
    )

    try:
        api_response = api_instance.send_transac_email(send_smtp_email)
        flash('Testimonial request sent successfully!', 'success')
    except ApiException as e:
        flash(f'Error sending testimonial request: {str(e)}', 'error')
    
    return redirect(url_for('dashboard'))

def generate_summary(conversation):
    prompt = f"""
    Summarize the following customer testimonial conversation in a way that sounds like it was written by the customer. 
    Use their own words and phrases where possible, and maintain their tone and sentiment. 
    The summary should be concise but comprehensive, highlighting the key points of their experience.
    Make it suitable for posting as a review, written in the first person.

    Conversation:
    {conversation}

    Summary:
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are an AI assistant that summarizes customer testimonials in the customer's own voice."},
            {"role": "user", "content": prompt}
        ]
    )

    return response.choices[0].message.content.strip()

@app.route('/confirmation')
def confirmation():
    return render_template('confirmation.html')

@app.route('/dashboard')
@login_required
def dashboard():
    testimonials = Testimonial.query.all()
    testimonial_requests = TestimonialRequest.query.filter_by(user_id=current_user.id).all()
    return render_template('dashboard.html', testimonials=testimonials, testimonial_requests=testimonial_requests, zip=zip)

@app.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    profile = BusinessProfile.query.filter_by(user_id=current_user.id).first()
    if request.method == 'POST':
        if profile:
            profile.business_name = request.form['business_name']
            profile.business_description = request.form['business_description']
            profile.testimonial_guidance = request.form['testimonial_guidance']
        else:
            profile = BusinessProfile(
                business_name=request.form['business_name'],
                business_description=request.form['business_description'],
                testimonial_guidance=request.form['testimonial_guidance'],
                user_id=current_user.id
            )
            db.session.add(profile)
        db.session.commit()
        flash('Profile updated successfully.', 'success')
        return redirect(url_for('dashboard'))
    return render_template('profile.html', profile=profile)

@app.route('/get_business_profile', methods=['GET'])
def get_business_profile():
    profile = BusinessProfile.query.first()
    if profile:
        return jsonify({
            'business_name': profile.business_name,
            'business_description': profile.business_description,
            'testimonial_guidance': profile.testimonial_guidance
        })
    else:
        return jsonify({})

@app.route('/get_next_question', methods=['POST'])
def get_next_question():
    data = request.json
    conversation_history = data['conversation_history']
    
    profile = BusinessProfile.query.first()
    next_question = generate_follow_up_question(conversation_history, profile)
    
    return jsonify({'question': next_question})

def generate_follow_up_question(conversation_history, profile):
    if profile:
        business_context = f"""
        Business Name: {profile.business_name}
        Business Description: {profile.business_description}
        Testimonial Guidance: {profile.testimonial_guidance}
        """
    else:
        business_context = "No specific business information provided."

    prompt = f"""
    Based on the following conversation history and business context, generate a relevant follow-up question to elicit a response that would make an excellent testimonial. The question should:

    1. Encourage the customer to highlight specific positive aspects of their experience with {profile.business_name if profile else 'the business'}.
    2. Guide the customer towards expressing how the products/services have benefited them or solved a problem.
    3. Prompt for comparisons with competitors or previous experiences, if relevant.
    4. Invite the customer to share any memorable or standout moments.
    5. Encourage the use of descriptive language and specific examples.
    6. If appropriate, ask how they would describe the product/service to others, especially considering the target audience.
    7. Focus on the aspects highlighted in the Testimonial Guidance: {profile.testimonial_guidance if profile else 'the business strengths'}.
    8. If relevant to the conversation, find opportunities to highlight the customer's "before vs after" experience and how the product or service made a positive impact.
    9. Avoid overly negative or critical directions, focusing instead on constructive and positive aspects.

    Ask only a single question at a time and aim for questions that could lead to quotable, impactful statements that showcase the value and quality of the products/services.

    Business Context:
    {business_context}

    Conversation history:
    {conversation_history}

    Follow-up question:
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are an AI assistant designed to generate follow-up questions for customer testimonials. Your goal is to elicit responses that would make compelling, positive, and specific testimonials for marketing purposes."},
            {"role": "user", "content": prompt}
        ]
    )

    return response.choices[0].message.content.strip()

def analyze_sentiment(text):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a sentiment analysis tool. Analyze the sentiment of the following text and respond with a score between 0 and 1, where 0 is very negative and 1 is very positive. Your response should ONLY include the numerical score."},
            {"role": "user", "content": text}
        ]
    )
    content = response.choices[0].message.content.strip()
    
    match = re.search(r'\d+(\.\d+)?', content)
    if match:
        score = float(match.group())
    else:
        score = 0.5
    
    return {'sentiment': 'Positive' if score > 0.5 else 'Negative', 'score': score}

def extract_snippets(text):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a text analysis tool. Extract 2-3 short, positive snippets from the following text. Respond with each snippet on a new line."},
            {"role": "user", "content": text}
        ]
    )
    snippets = response.choices[0].message.content.strip().split('\n')
    return [snippet.strip('- ') for snippet in snippets if snippet.strip()]

if __name__ == '__main__':
    app.run(debug=True)