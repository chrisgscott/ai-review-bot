from flask import Flask, render_template, request, jsonify, url_for, redirect, flash, Blueprint
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
from datetime import datetime, timedelta
import hashlib
from sqlalchemy import func
import logging
from flask.cli import with_appcontext
import click
from werkzeug.security import generate_password_hash
import string
import random
from sqlalchemy.exc import IntegrityError
from flask_migrate import Migrate

logging.basicConfig(level=logging.INFO)

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

migrate = Migrate(app, db)

# Configure Brevo API client
configuration = sib_api_v3_sdk.Configuration()
configuration.api_key['api-key'] = app.config['BREVO_API_KEY']
api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))

# Models
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    registration_date = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    login_count = db.Column(db.Integer, default=0)
    custom_url = db.Column(db.String(120), unique=True, nullable=True)

    testimonials = db.relationship('Testimonial', backref='user', lazy=True)
    business_profile = db.relationship('BusinessProfile', uselist=False, back_populates='user')

    def __repr__(self):
        return f'<User {self.email}>'
    
class Testimonial(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    reviewer_name = db.Column(db.String(100), nullable=True)
    reviewer_email = db.Column(db.String(120), nullable=True)
    questions = db.Column(db.Text, nullable=False)
    responses = db.Column(db.Text, nullable=False)
    sentiment = db.Column(db.String(20), nullable=False)
    score = db.Column(db.Float, nullable=False)
    snippets = db.Column(db.Text, nullable=False)
    summary = db.Column(db.Text, nullable=True)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_displayed = db.Column(db.Boolean, default=False)

class BusinessProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    business_name = db.Column(db.String(100), nullable=False)
    business_description = db.Column(db.Text, nullable=False)
    testimonial_guidance = db.Column(db.Text, nullable=False)
    review_url = db.Column(db.String(255), nullable=True)
    review_button_text = db.Column(db.String(100), nullable=True, default="Post Your Review")
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', back_populates='business_profile')

class TestimonialRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    unique_id = db.Column(db.String(36), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    submitted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # Add this line

class ChatbotLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    interaction_date = db.Column(db.DateTime, default=datetime.utcnow)
    initial_request = db.Column(db.Text, nullable=False)
    follow_up_questions = db.Column(db.Text, nullable=True)
    user_responses = db.Column(db.Text, nullable=True)

class Settings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    site_name = db.Column(db.String(100), nullable=False, default="Leave Some Love")
    contact_email = db.Column(db.String(120), nullable=False, default="contact@leavesomelove.com")
    testimonial_approval_required = db.Column(db.Boolean, nullable=False, default=False)
    summary_prompt = db.Column(db.Text, nullable=False, default="Summarize the testimonial.")
    follow_up_prompt = db.Column(db.Text, nullable=False, default="Generate a follow-up question.")
    sentiment_prompt = db.Column(db.Text, nullable=False, default="Analyze the sentiment.")
    snippet_prompt = db.Column(db.Text, nullable=False, default="Extract snippets.")

    @classmethod
    def get(cls):
        return cls.query.first()

# Admin Blueprint
admin = Blueprint('admin', __name__, url_prefix='/admin')

@admin.before_request
@login_required
def require_admin():
    if not current_user.is_admin:
        flash('You do not have permission to access the admin area.', 'danger')
        return redirect(url_for('index'))

@admin.route('/')
def index():
    total_users = User.query.count()
    total_testimonials = Testimonial.query.count()
    avg_sentiment = db.session.query(func.avg(Testimonial.score)).scalar() or 0
    recent_users = User.query.order_by(User.id.desc()).limit(5).all()
    recent_testimonials = Testimonial.query.order_by(Testimonial.id.desc()).limit(5).all()
    
    return render_template('admin/dashboard.html', 
                           total_users=total_users,
                           total_testimonials=total_testimonials,
                           avg_sentiment=avg_sentiment,
                           recent_users=recent_users,
                           recent_testimonials=recent_testimonials)

@admin.route('/users')
def users():
    users = User.query.all()
    return render_template('admin/users.html', users=users)

@admin.route('/user/<int:user_id>')
def user_detail(user_id):
    user = User.query.get_or_404(user_id)
    testimonials = Testimonial.query.filter_by(user_id=user_id).all()
    return render_template('admin/user_detail.html', user=user, testimonials=testimonials)

@admin.route('/testimonials')
def testimonials():
    page = request.args.get('page', 1, type=int)
    per_page = 20
    query = Testimonial.query

    # Filtering
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    user_id = request.args.get('user_id')
    min_score = request.args.get('min_score', type=float)

    if start_date:
        query = query.filter(Testimonial.submitted_at >= datetime.strptime(start_date, '%Y-%m-%d'))
    if end_date:
        query = query.filter(Testimonial.submitted_at <= datetime.strptime(end_date, '%Y-%m-%d'))
    if user_id:
        query = query.filter(Testimonial.user_id == user_id)
    if min_score is not None:
        query = query.filter(Testimonial.score >= min_score)

    # Sorting
    sort = request.args.get('sort', 'submitted_at')
    direction = request.args.get('direction', 'desc')
    if direction == 'desc':
        query = query.order_by(getattr(Testimonial, sort).desc())
    else:
        query = query.order_by(getattr(Testimonial, sort).asc())

    testimonials = query.paginate(page=page, per_page=per_page, error_out=False)
    return render_template('admin/testimonials.html', testimonials=testimonials)

@admin.route('/chatbot-logs')
def chatbot_logs():
    logs = ChatbotLog.query.order_by(ChatbotLog.interaction_date.desc()).all()
    return render_template('admin/chatbot_logs.html', logs=logs)

@admin.route('/user/<int:user_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_user(user_id):
    user = User.query.get_or_404(user_id)
    if request.method == 'POST':
        user.email = request.form['email']
        user.is_admin = 'is_admin' in request.form
        db.session.commit()
        flash('User updated successfully', 'success')
        return redirect(url_for('admin.users'))
    return render_template('admin/edit_user.html', user=user)

@admin.route('/user/create', methods=['GET', 'POST'])
@login_required
def create_user():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        is_admin = 'is_admin' in request.form
        
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash('Email already exists', 'danger')
        else:
            hashed_password = generate_password_hash(password)
            new_user = User(email=email, password=hashed_password, is_admin=is_admin)
            db.session.add(new_user)
            db.session.commit()
            flash('User created successfully', 'success')
            return redirect(url_for('admin.users'))
    return render_template('admin/create_user.html')

@admin.route('/testimonial/<int:testimonial_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_testimonial(testimonial_id):
    testimonial = Testimonial.query.get_or_404(testimonial_id)
    if request.method == 'POST':
        testimonial.reviewer_name = request.form['reviewer_name']
        testimonial.reviewer_email = request.form['reviewer_email']
        testimonial.sentiment = request.form['sentiment']
        testimonial.score = float(request.form['score'])
        testimonial.summary = request.form['summary']
        db.session.commit()
        flash('Testimonial updated successfully', 'success')
        return redirect(url_for('admin.testimonials'))
    return render_template('admin/edit_testimonial.html', testimonial=testimonial)

@admin.route('/delete/<string:item_type>/<int:item_id>', methods=['GET', 'POST'])
@login_required
def delete_confirmation(item_type, item_id):
    if item_type == 'user':
        item = User.query.get_or_404(item_id)
        cancel_url = url_for('admin.users')
    elif item_type == 'testimonial':
        item = Testimonial.query.get_or_404(item_id)
        cancel_url = url_for('admin.testimonials')
    else:
        flash('Invalid item type', 'danger')
        return redirect(url_for('admin.index'))
    
    if request.method == 'POST':
        db.session.delete(item)
        db.session.commit()
        flash(f'{item_type.capitalize()} deleted successfully', 'success')
        return redirect(cancel_url)
    
    return render_template('admin/delete_confirmation.html', 
                           item_type=item_type, 
                           cancel_url=cancel_url, 
                           confirm_url=url_for('admin.delete_confirmation', item_type=item_type, item_id=item_id))

@admin.route('/settings', methods=['GET', 'POST'])
@login_required
def settings():
    settings = Settings.query.first()
    if not settings:
        settings = Settings()
        db.session.add(settings)
    
    if request.method == 'POST':
        settings.site_name = request.form['site_name']
        settings.contact_email = request.form['contact_email']
        settings.testimonial_approval_required = 'testimonial_approval_required' in request.form
        settings.summary_prompt = request.form['summary_prompt']
        settings.follow_up_prompt = request.form['follow_up_prompt']
        settings.sentiment_prompt = request.form['sentiment_prompt']
        settings.snippet_prompt = request.form['snippet_prompt']
        db.session.commit()
        flash('Settings updated successfully', 'success')
        return redirect(url_for('admin.settings'))
    
    return render_template('admin/settings.html', settings=settings)

# Register admin blueprint
app.register_blueprint(admin)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

with app.app_context():
    db.create_all()

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        business_name = request.form['business_name']
        existing_user = User.query.filter_by(email=email).first()
        if existing_user is None:
            hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
            custom_url = generate_custom_url(business_name)
            new_user = User(email=email, password=hashed_password, custom_url=custom_url)
            new_profile = BusinessProfile(
                business_name=business_name,
                business_description="Tell us about your business",  # Default value
                testimonial_guidance="What would you like customers to focus on?",  # Default value
                user=new_user
            )
            db.session.add(new_user)
            db.session.add(new_profile)
            try:
                db.session.commit()
                flash('Registration successful. Please log in.', 'success')
                return redirect(url_for('login'))
            except IntegrityError:
                db.session.rollback()
                flash('An error occurred. Please try again.', 'danger')
        else:
            flash('Email already exists.', 'danger')
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        user = User.query.filter_by(email=email).first()
        if user and bcrypt.check_password_hash(user.password, password):
            login_user(user)
            user.last_login = datetime.utcnow()
            user.login_count += 1
            db.session.commit()
            flash('Logged in successfully.', 'success')
            return redirect(url_for('dashboard'))
        flash('Invalid email or password.', 'danger')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Logged out successfully.', 'success')
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    total_testimonials = Testimonial.query.count()
    pending_requests = TestimonialRequest.query.filter_by(submitted=False).count()
    average_sentiment = db.session.query(db.func.avg(Testimonial.score)).scalar() or 0
    recent_testimonials = Testimonial.query.order_by(Testimonial.id.desc()).limit(5).all()
    
    return render_template('dashboard.html', 
                           total_testimonials=total_testimonials,
                           pending_requests=pending_requests,
                           average_sentiment=average_sentiment,
                           recent_testimonials=recent_testimonials,
                           current_user=current_user)


@app.route('/new_testimonial')
@login_required
def new_testimonial():
    return render_template('new_testimonial.html')

from sqlalchemy import desc

@app.route('/all_testimonials')
@login_required
def all_testimonials():
    sort = request.args.get('sort', 'submitted_at')
    order = request.args.get('order', 'desc')
    search = request.args.get('search', '')

    query = Testimonial.query.filter_by(user_id=current_user.id)

    if search:
        query = query.filter(
            (Testimonial.reviewer_name.ilike(f'%{search}%')) |
            (Testimonial.reviewer_email.ilike(f'%{search}%'))
        )

    if sort == 'submitted_at':
        query = query.order_by(desc(Testimonial.submitted_at) if order == 'desc' else Testimonial.submitted_at)
    elif sort == 'sentiment_score':
        query = query.order_by(desc(Testimonial.score) if order == 'desc' else Testimonial.score)

    testimonials = query.all()
    return render_template('all_testimonials.html', testimonials=testimonials, current_sort=sort, current_order=order, search=search)

@app.route('/update_testimonial_display', methods=['POST'])
@login_required
def update_testimonial_display():
    data = request.json
    testimonial_id = data.get('testimonial_id')
    is_displayed = data.get('is_displayed')
    
    testimonial = Testimonial.query.get(testimonial_id)
    if testimonial and testimonial.user_id == current_user.id:
        testimonial.is_displayed = is_displayed
        db.session.commit()
        return jsonify({'status': 'success'})
    else:
        return jsonify({'status': 'error', 'message': 'Testimonial not found or access denied'}), 403
    
@app.route('/update_testimonial_summary/<int:id>', methods=['POST'])
@login_required
def update_testimonial_summary(id):
    testimonial = Testimonial.query.get_or_404(id)
    
    # Ensure the current user owns this testimonial
    if testimonial.user_id != current_user.id:
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403

    data = request.json
    new_summary = data.get('summary')

    if new_summary:
        testimonial.summary = new_summary
        db.session.commit()
        return jsonify({'status': 'success'})
    else:
        return jsonify({'status': 'error', 'message': 'No summary provided'}), 400

@app.route('/embed_code')
@login_required
def embed_code():
    return render_template('embed_code.html', user_id=current_user.id)

@app.route('/api/testimonials/<int:user_id>')
def get_displayed_testimonials(user_id):
    testimonials = Testimonial.query.filter_by(user_id=user_id, is_displayed=True).all()
    return jsonify([{
        'id': t.id,
        'summary': t.summary,
        'reviewer_name': t.reviewer_name,
        'reviewer_email': t.reviewer_email,
        'score': t.score
    } for t in testimonials])

@app.route('/testimonial-widget/<int:user_id>')
def testimonial_widget(user_id):
    user = User.query.get_or_404(user_id)
    
    # This is where you'll implement the logic to determine if the attribution should be shown
    # For now, we'll always show it, but you can easily change this later
    show_attribution = True
    
    # Example of how you might implement this in the future:
    # show_attribution = not user.has_paid_subscription()
    
    return render_template('testimonial_widget.html', 
        user_id=user_id, 
        show_attribution=show_attribution)

@app.route('/pending_requests')
@login_required
def pending_requests():
    requests = TestimonialRequest.query.filter_by(user_id=current_user.id, submitted=False).all()
    return render_template('pending_requests.html', requests=requests)

@app.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    profile = BusinessProfile.query.filter_by(user_id=current_user.id).first()
    if request.method == 'POST':
        if profile:
            profile.business_name = request.form['business_name']
            profile.business_description = request.form['business_description']
            profile.testimonial_guidance = request.form['testimonial_guidance']
            profile.review_url = request.form['review_url']
            profile.review_button_text = request.form['review_button_text']
        else:
            profile = BusinessProfile(
                business_name=request.form['business_name'],
                business_description=request.form['business_description'],
                testimonial_guidance=request.form['testimonial_guidance'],
                review_url=request.form['review_url'],
                review_button_text=request.form['review_button_text'],
                user_id=current_user.id
            )
            db.session.add(profile)
        
        # Update custom URL
        new_custom_url = request.form['custom_url']
        if new_custom_url != current_user.custom_url:
            existing_user = User.query.filter(User.custom_url == new_custom_url, User.id != current_user.id).first()
            if existing_user:
                flash('This custom URL is already in use. Please choose a different one.', 'danger')
                return render_template('profile.html', profile=profile)
            current_user.custom_url = new_custom_url
        
        # Update email
        new_email = request.form['email']
        if new_email != current_user.email:
            if User.query.filter_by(email=new_email).first():
                flash('Email already exists.', 'danger')
                return redirect(url_for('profile'))
            current_user.email = new_email
        
        # Update password if provided
        new_password = request.form['new_password']
        if new_password:
            if new_password == request.form['confirm_password']:
                current_user.password = bcrypt.generate_password_hash(new_password).decode('utf-8')
            else:
                flash('Passwords do not match.', 'danger')
                return redirect(url_for('profile'))
        
        try:
            db.session.commit()
            flash('Profile updated successfully.', 'success')
            return redirect(url_for('profile'))
        except IntegrityError:
            db.session.rollback()
            flash('An error occurred. The custom URL might already be in use.', 'danger')
        
    return render_template('profile.html', profile=profile)

@app.route('/check_custom_url')
@login_required
def check_custom_url():
    custom_url = request.args.get('url')
    existing_user = User.query.filter(User.custom_url == custom_url, User.id != current_user.id).first()
    return jsonify({'available': existing_user is None})

@app.route('/review/<custom_url>', methods=['GET', 'POST'])
def custom_review(custom_url):
    user = User.query.filter_by(custom_url=custom_url).first_or_404()
    if request.method == 'POST':
        # Handle testimonial submission
        data = request.json
        testimonial = Testimonial(
            user_id=user.id,
            reviewer_name=data.get('reviewer_name'),
            reviewer_email=data.get('reviewer_email'),
            questions='\n'.join(data['questions']),
            responses='\n'.join(data['responses']),
            sentiment=analyze_sentiment(data['responses'])['sentiment'],
            score=analyze_sentiment(data['responses'])['score'],
            snippets=', '.join(extract_snippets(' '.join(data['responses']))),
            summary=generate_summary(' '.join(data['responses']))
        )
        db.session.add(testimonial)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Testimonial submitted successfully'})
    
    return render_template('index.html', business_name=user.business_profile.business_name, business_id=user.id)

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
            reviewer_name=testimonial_request.first_name,
            reviewer_email=testimonial_request.email,
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
    
    return render_template('submit_testimonial.html', 
                           first_name=testimonial_request.first_name,
                           email=testimonial_request.email)

@app.route('/submit_testimonial', methods=['POST'])
def submit_testimonial():
    try:
        data = request.get_json()
        questions = data['questions']
        responses = data['responses']
        first_name = data.get('firstName')
        email = data.get('email')
        business_id = data.get('business_id')

        full_text = " ".join([f"Q: {q} A: {r}" for q, r in zip(questions, responses)])
        
        analysis = analyze_sentiment(full_text)
        snippets = extract_snippets(full_text)
        summary = generate_summary(full_text)
        
        # Find the user associated with the business_id or use the current user
        if business_id:
            user = User.query.get(business_id)
            if not user:
                raise ValueError(f"Invalid business_id: {business_id}")
        else:
            # If no business_id is provided, use the current logged-in user
            user = current_user
            if not user.is_authenticated:
                raise ValueError("No valid user found for this testimonial")

        testimonial = Testimonial(
            user_id=user.id,
            reviewer_name=first_name,
            reviewer_email=email,
            questions='\n'.join(questions),
            responses='\n'.join(responses),
            sentiment=analysis['sentiment'],
            score=analysis['score'],
            snippets=', '.join(snippets),
            summary=summary
        )
        
        db.session.add(testimonial)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'redirect': url_for('confirmation', testimonial_id=testimonial.id)
        })
    except ValueError as e:
        db.session.rollback()
        app.logger.error(f"Value Error in submit_testimonial: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error in submit_testimonial: {str(e)}")
        return jsonify({'status': 'error', 'message': 'An unexpected error occurred while submitting the testimonial'}), 500
    
@app.route('/testimonial_requests')
@login_required
def testimonial_requests():
    # Get pending requests
    requests = TestimonialRequest.query.filter_by(user_id=current_user.id, submitted=False).all()
    return render_template('testimonial_requests.html', requests=requests)

@app.route('/send_testimonial_request', methods=['POST'])
@login_required
def send_testimonial_request():
    try:
        email = request.form['email']
        first_name = request.form['first_name']
        unique_id = str(uuid.uuid4())
        
        # Fetch the business name
        business_profile = BusinessProfile.query.filter_by(user_id=current_user.id).first()
        if not business_profile:
            app.logger.warning(f"No business profile found for user {current_user.id}")
            business_name = "Our Business"
        else:
            business_name = business_profile.business_name
        
        new_request = TestimonialRequest(
            email=email,
            first_name=first_name,
            unique_id=unique_id,
            user_id=current_user.id
        )
        db.session.add(new_request)
        db.session.commit()
        
        testimonial_link = url_for('submit_testimonial_by_link', unique_id=unique_id, _external=True)
        
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": email, "name": first_name}],
            template_id=1,  # Replace with your actual template ID from Brevo
            params={
                "first_name": first_name,
                "testimonial_link": testimonial_link,
                "business_name": business_name
            }
        )

        api_response = api_instance.send_transac_email(send_smtp_email)
        return jsonify({'status': 'success', 'message': 'Testimonial request sent successfully!'})
    except ApiException as e:
        app.logger.error(f"Brevo API error: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Error sending email. Please try again later.'}), 500
    except Exception as e:
        app.logger.error(f"Unexpected error in send_testimonial_request: {str(e)}")
        db.session.rollback()
        return jsonify({'status': 'error', 'message': 'An unexpected error occurred. Please try again later.'}), 500

@app.route('/resend_request/<int:id>', methods=['POST'])
@login_required
def resend_request(id):
    testimonial_request = TestimonialRequest.query.get_or_404(id)
    
    testimonial_request.unique_id = str(uuid.uuid4())
    db.session.commit()

    testimonial_link = url_for('submit_testimonial_by_link', unique_id=testimonial_request.unique_id, _external=True)
    
    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": testimonial_request.email, "name": testimonial_request.first_name}],
        template_id=1,  # Make sure this is the correct template ID
        params={
            "first_name": testimonial_request.first_name,
            "testimonial_link": testimonial_link
        }
    )

    try:
        api_response = api_instance.send_transac_email(send_smtp_email)
        return jsonify({'status': 'success'})
    except ApiException as e:
        print(f"Exception when calling SMTPApi->send_transac_email: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
    
@app.route('/pending_requests_list')
@login_required
def pending_requests_list():
    requests = TestimonialRequest.query.filter_by(user_id=current_user.id, submitted=False).all()
    return render_template('pending_requests_list.html', requests=requests)

@app.route('/get_business_profile', methods=['GET'])
def get_business_profile():
    try:
        profile = BusinessProfile.query.first()
        if profile:
            return jsonify({
                'business_name': profile.business_name,
                'business_description': profile.business_description,
                'testimonial_guidance': profile.testimonial_guidance
            }), 200
        else:
            return jsonify({'message': 'No business profile found'}), 404
    except Exception as e:
        app.logger.error(f"Error in get_business_profile: {str(e)}")
        return jsonify({'error': 'An error occurred while fetching the business profile'}), 500

@app.route('/get_next_question', methods=['POST'])
def get_next_question():
    try:
        data = request.get_json()
        conversation_history = data['conversation_history']
        
        profile = BusinessProfile.query.first()
        next_question = generate_follow_up_question(conversation_history, profile)
        
        return jsonify({'question': next_question})
    except Exception as e:
        app.logger.error(f"Error in get_next_question: {str(e)}")
        return jsonify({'status': 'error', 'message': 'An error occurred while getting the next question'}), 500

@app.route('/confirmation/<int:testimonial_id>')
def confirmation(testimonial_id):
    testimonial = Testimonial.query.get_or_404(testimonial_id)
    business_profile = BusinessProfile.query.filter_by(user_id=testimonial.user_id).first()
    return render_template('confirmation.html', 
                           testimonial=testimonial, 
                           business_profile=business_profile)

@app.route('/delete_testimonial/<int:id>', methods=['POST'])
@login_required
def delete_testimonial(id):
    testimonial = Testimonial.query.get_or_404(id)
    db.session.delete(testimonial)
    db.session.commit()
    return jsonify({'status': 'success'})

@app.route('/testimonial/<int:id>')
@login_required
def testimonial_detail(id):
    testimonial = Testimonial.query.get_or_404(id)
    gravatar_url = get_gravatar_url(testimonial.reviewer_email) if testimonial.reviewer_email else None
    return render_template('testimonial_detail.html', testimonial=testimonial, gravatar_url=gravatar_url, zip=zip)

@app.route('/make_admin/<int:user_id>')
@login_required
def make_admin(user_id):
    if not current_user.is_admin:
        flash('You do not have permission to perform this action.', 'danger')
        return redirect(url_for('dashboard'))
    
    user = User.query.get_or_404(user_id)
    user.is_admin = True
    db.session.commit()
    flash(f'User {user.email} is now an admin.', 'success')
    return redirect(url_for('admin.index'))

# Helper functions
def generate_custom_url(business_name):
    # Convert business name to URL-friendly format
    base_url = ''.join(e for e in business_name if e.isalnum()).lower()
    
    while True:
        # Add random string to ensure uniqueness
        random_string = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        custom_url = f"{base_url}-{random_string}"
        
        # Check if this URL is already in use
        if User.query.filter_by(custom_url=custom_url).first() is None:
            return custom_url
        
def get_gravatar_url(email, size=100):
    """Generate Gravatar URL for the given email."""
    email = email.lower().encode('utf-8')
    email_hash = hashlib.md5(email).hexdigest()
    return f"https://www.gravatar.com/avatar/{email_hash}?s={size}&d=identicon"

def generate_summary(conversation):
    settings = Settings.get()
    prompt = f"""
    {settings.summary_prompt}

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

def generate_follow_up_question(conversation_history, profile):
    settings = Settings.get()
    if profile:
        business_context = f"""
        Business Name: {profile.business_name}
        Business Description: {profile.business_description}
        Testimonial Guidance: {profile.testimonial_guidance}
        """
    else:
        business_context = "No specific business information provided."

    # Replace placeholders in the prompt
    prompt = settings.follow_up_prompt.format(
        profile=profile,
        business_context=business_context,
        conversation_history=conversation_history
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are an AI assistant designed to generate follow-up questions for customer testimonials. Your goal is to elicit responses that would make compelling, positive, and specific testimonials for marketing purposes."},
            {"role": "user", "content": prompt}
        ]
    )

    return response.choices[0].message.content.strip()

def analyze_sentiment(text):
    settings = Settings.get()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": settings.sentiment_prompt},
            {"role": "user", "content": text}
        ]
    )
    content = response.choices[0].message.content.strip()
    
    match = re.search(r'\d+(\.\d+)?', content)
    if match:
        score = float(match.group())
    else:
        score = 0.5
    
    # Convert the score to a 1-10 scale
    score_1_10 = round(score * 9 + 1, 1)
    
    return {'sentiment': 'Positive' if score > 0.5 else 'Negative', 'score': score_1_10}

def extract_snippets(text):
    settings = Settings.get()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": settings.snippet_prompt},
            {"role": "user", "content": text}
        ]
    )
    snippets = response.choices[0].message.content.strip().split('\n')
    return [snippet.strip('- ') for snippet in snippets if snippet.strip()]

@app.cli.command("create-admin")
@click.argument("email")
@with_appcontext
def create_admin(email):
    user = User.query.filter_by(email=email).first()
    if user:
        user.is_admin = True
        db.session.commit()
        click.echo(f"User with email {email} has been promoted to admin.")
    else:
        click.echo(f"User with email {email} not found.")

if __name__ == '__main__':
    app.run(debug=True)