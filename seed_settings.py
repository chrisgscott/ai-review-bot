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

        # Update or set values from your local database
        existing_settings.site_name = "Leave Some Love"  # Update if different
        existing_settings.contact_email = "hello@leavesomelove.com"  # Update if different
        existing_settings.testimonial_approval_required = False  # Update if different

        # Update these with your detailed prompts from the local database
        existing_settings.summary_prompt = """
        Summarize the following customer testimonial conversation in a way that sounds like it was written by the customer. 
    Use their own words and phrases where possible, and maintain their tone and sentiment. 
    The summary should be concise but comprehensive, highlighting the key points of their experience.
    Make it suitable for posting as a review, written in the first person. ONLY summarize the user responses, not the questions.
        """

        existing_settings.follow_up_prompt = """
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

        existing_settings.sentiment_prompt = """
        You are a sentiment analysis tool. Analyze the sentiment of the following text and respond with a score between 0 and 1, where 0 is very negative and 1 is very positive. Your response should ONLY include the numerical score. ONLY analyze the sentiment of the user responses, not the questions.
        """

        existing_settings.snippet_prompt = """
        You are a text analysis tool. Extract 2-3 short, positive snippets from the following text. Respond with each snippet on a new line. ONLY extract snippets from the user responses, not the questions.
        """

        db.session.commit()
        print("Settings seeded successfully!")

if __name__ == "__main__":
    seed_settings()