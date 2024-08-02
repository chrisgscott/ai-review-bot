import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    APPLICATION_NAME = "Leave Some Love"
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    SECRET_KEY = os.getenv('SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')

