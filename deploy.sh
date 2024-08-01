#!/bin/bash

cd /home/master/application_folder
source venv/bin/activate  # Activate virtual environment
git pull origin main  # Pull latest changes
pip install -r requirements.txt  # Install dependencies
flask db upgrade  # Apply database migrations
sudo systemctl restart ai-review-bot  # Restart Gunicorn service

