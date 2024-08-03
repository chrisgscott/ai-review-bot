from app import app, db, Settings

def seed_settings():
    with app.app_context():
        # Check if settings already exist
        existing_settings = Settings.query.first()
        if existing_settings:
            print("Settings already exist. Updating...")
        else:
            existing_settings = Settings()
            db.session.add(existing_settings)
            print("Creating new settings...")

        # Update or set default values
        existing_settings.site_name = "Leave Some Love"
        existing_settings.contact_email = "contact@leavesomelove.com"
        existing_settings.testimonial_approval_required = False
        existing_settings.summary_prompt = "Summarize the testimonial in a concise and engaging manner."
        existing_settings.follow_up_prompt = "Based on the previous response, what follow-up question would elicit more specific details about the customer's experience?"
        existing_settings.sentiment_prompt = "Analyze the sentiment of this testimonial. Provide a score between 0 and 1, where 0 is very negative and 1 is very positive."
        existing_settings.snippet_prompt = "Extract 3-5 short, impactful quotes from this testimonial that highlight the most positive aspects of the customer's experience."

        db.session.commit()
        print("Settings seeded successfully!")

if __name__ == "__main__":
    seed_settings()