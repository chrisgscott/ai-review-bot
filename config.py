import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')