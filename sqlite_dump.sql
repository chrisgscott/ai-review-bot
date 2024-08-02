PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE user (
	id INTEGER NOT NULL, 
	email VARCHAR(120) NOT NULL, 
	password VARCHAR(120) NOT NULL, 
	is_admin BOOLEAN, 
	registration_date DATETIME, 
	last_login DATETIME, 
	login_count INTEGER, 
	custom_url VARCHAR(120), 
	PRIMARY KEY (id), 
	UNIQUE (email), 
	UNIQUE (custom_url)
);
INSERT INTO user VALUES(1,'chrisgscott@gmail.com','$2b$12$MzNvyGWhJO4o3WSfBmOJteegYae/ZX7Y20gjvBzAzljvMRXUpSrfq',1,'2024-07-26 01:06:57.090556','2024-08-02 02:32:48.913048',2,'leavesomelove');
CREATE TABLE testimonial (
	id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	reviewer_name VARCHAR(100), 
	reviewer_email VARCHAR(120), 
	questions TEXT NOT NULL, 
	responses TEXT NOT NULL, 
	sentiment VARCHAR(20) NOT NULL, 
	score FLOAT NOT NULL, 
	snippets TEXT NOT NULL, 
	summary TEXT, 
	submitted_at DATETIME, is_displayed BOOLEAN, website_quote TEXT, headline VARCHAR(255), 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES user (id)
);
INSERT INTO testimonial VALUES(7,1,'Percy','chrisgscott@gmail.com',replace('Hi there, Percy! We''d love to hear about your experience. How would you rate it overall?\nWhat specific features or services from Mosaic stood out to you during your experience, and how did they help address your needs or solve any challenges you were facing?\nCan you describe a specific moment when Mosaic''s customer service made a significant impact on your experience, and how it compared to any previous interactions you''ve had with other companies?\nCan you share more about how the step-by-step assistance you received from Mosaic''s customer service made you feel, and how it compares to your past experiences with other companies in terms of support and resolution effectiveness?','\n',char(10)),replace('My experience has been positive from beginning to end!\nI found their customer service to be top notch and they helped me fix the problem I was having with my account.\nThey were prompt and helpful, not to mention professional and kind. I was having a problem with my billing and they walked me through fixing it, step-by-step.\nOther companies treat you like just another number, I really feel like the team at Mosaic cares about me and my needs. This is what customer support is supposed to look like!','\n',char(10)),'Positive',10.0,'My experience has been positive from beginning to end!, I found their customer service to be top notch and they helped me fix the problem I was having with my account., They were prompt and helpful, not to mention professional and kind., I was having a problem with my billing and they walked me through fixing it, step-by-step., I really feel like the team at Mosaic cares about me and my needs. This is what customer support is supposed to look like!',replace('Mosaic truly impressed me with their exceptional customer service. From the moment I reached out, they were prompt, professional, and incredibly kind. I was having a billing issue, and instead of feeling like just another number, they walked me through the solution step-by-step, showing that they genuinely care about my needs. \n\nIt''s refreshing to experience customer support that actually works and makes a difference. I’ll definitely be back and recommend them to anyone looking for real care and assistance.','\n',char(10)),'2024-07-30 18:41:39.672376',1,'"My experience with Mosaic has been nothing short of amazing! Their customer service genuinely cares about me and walked me through my billing issue step-by-step—this is exactly what support should look like!"','"Experience Support That Cares: Mosaic Transforms Customer Service into Personal Care!"');
INSERT INTO testimonial VALUES(8,1,'Chris','chrisgscott@gmail.com',replace('Hi there, Chris! We''d love to hear about your experience. How would you rate it overall?\nThat''s wonderful to hear, Chris! Can you share specific examples of how the testimonials you’ve collected using Leave Some Love differ in quality or detail compared to what you experienced before? What impact have these improved testimonials had on your business?\nCan you describe a standout testimonial you received using Leave Some Love that truly resonated with your audience, and how it compared to the more basic testimonials you received prior to using the platform?\nWhat specific elements or insights from the standout testimonial that resonated with your audience do you believe are directly attributed to using Leave Some Love, and how have these richer details helped in conveying your brand''s story compared to the basic testimonials you collected before?','\n',char(10)),replace('Overall it''s been great.\nThey''re much deeper and more insightful than what I would get before.\nTest\nTest','\n',char(10)),'Positive',9.099999999999999645,'"Overall it''s been great.", "They''re much deeper and more insightful than what I would get before.", "A standout testimonial you received using Leave Some Love truly resonated with your audience.", "These richer details helped in conveying your brand''s story compared to the basic testimonials you collected before."','My experience with Leave Some Love has been fantastic! The quality and detail of the testimonials I''ve collected have skyrocketed, offering much deeper insights than before. One particular testimonial really stood out; it resonated with my audience and conveyed my brand''s story in a way the more basic ones just couldn''t match. The rich details provided have truly helped me connect better with customers. I can''t recommend this platform enough—I''ll definitely be back for more!','2024-08-01 16:21:22.860577',1,'"Using Leave Some Love has transformed my testimonials into deep, insightful stories that truly resonate with my audience. The quality has skyrocketed, making a significant impact on my business!"','"Leave Some Love transformed my testimonials into deep, insightful stories that truly resonate with my audience!"');
CREATE TABLE business_profile (
	id INTEGER NOT NULL, 
	business_name VARCHAR(100) NOT NULL, 
	business_description TEXT NOT NULL, 
	testimonial_guidance TEXT NOT NULL, 
	user_id INTEGER NOT NULL, review_url VARCHAR(255), review_button_text VARCHAR(100), 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES user (id)
);
INSERT INTO business_profile VALUES(1,'Leave Some Love','Leave Some Love is an AI-powered testimonial management platform designed to help businesses effectively collect, analyze, and leverage customer testimonials. The tool uses advanced AI to engage customers in natural conversations, generating detailed and authentic testimonials while providing valuable insights through sentiment analysis and key snippet extraction. With features like customizable branding, multi-channel integration, and an intuitive dashboard, Leave Some Love simplifies the process of building a strong online reputation. Whether for small local businesses or growing enterprises, the platform offers a comprehensive solution to turn customer experiences into powerful marketing assets, ultimately helping businesses boost their credibility and attract more customers.','I would like testimonials that highlight the quality of the testimonials they get from their clients compared to before they were using Leave Some Love.',1,'https://g.page/r/CaJ1WCe0fp-kEAE/review','Post Your Testimonial');
CREATE TABLE testimonial_request (
	id INTEGER NOT NULL, 
	email VARCHAR(120) NOT NULL, 
	first_name VARCHAR(50) NOT NULL, 
	unique_id VARCHAR(36) NOT NULL, 
	user_id INTEGER NOT NULL, 
	submitted BOOLEAN, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (unique_id), 
	FOREIGN KEY(user_id) REFERENCES user (id)
);
INSERT INTO testimonial_request VALUES(1,'chris@chrisgscott.me','Chris','9f8c9bb2-b39d-4c07-a2a9-115950c66878',1,0,'2024-07-26 01:07:57.668254');
INSERT INTO testimonial_request VALUES(2,'chrisgscott@gmail.com','John','a198a6d1-0e8e-42ed-8409-5e6860f9a776',1,0,'2024-07-26 03:11:01.583597');
INSERT INTO testimonial_request VALUES(3,'chrisgscott@gmail.com','Chris','26048686-41ca-40ad-97de-bfd9ce9cebe5',1,0,'2024-07-26 04:05:05.338886');
INSERT INTO testimonial_request VALUES(4,'chrisgscott@gmail.com','Chris','19d52e5f-6db9-456f-b382-c0dc9885f8f7',1,0,'2024-07-26 04:05:10.532088');
INSERT INTO testimonial_request VALUES(5,'chrisgscott+testing@gmail.com','Chris','67607b10-fb26-4c61-83eb-76c14a9ca78b',1,0,'2024-07-26 04:05:33.660771');
INSERT INTO testimonial_request VALUES(6,'chrisgscott+testing@gmail.com','Chris','fa990026-070f-4c0f-b588-05b0953b6f4d',1,0,'2024-07-26 04:05:45.052940');
INSERT INTO testimonial_request VALUES(7,'chrisgscott+testing@gmail.com','Chris','cc6f05b7-436f-411a-b093-470b2d804d9a',1,0,'2024-07-26 04:07:48.187208');
INSERT INTO testimonial_request VALUES(8,'chrisgscott+brevotest@gmail.com','Chris','7951b378-2abc-4318-9135-05452b9bff0f',1,0,'2024-07-26 04:15:19.284637');
CREATE TABLE chatbot_log (
	id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	interaction_date DATETIME, 
	initial_request TEXT NOT NULL, 
	follow_up_questions TEXT, 
	user_responses TEXT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES user (id)
);
CREATE TABLE alembic_version (
	version_num VARCHAR(32) NOT NULL, 
	CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
INSERT INTO alembic_version VALUES('dd315838e07b');
CREATE TABLE IF NOT EXISTS "settings" (
	id INTEGER NOT NULL, 
	site_name VARCHAR(100) NOT NULL, 
	contact_email VARCHAR(120) NOT NULL, 
	testimonial_approval_required BOOLEAN NOT NULL, 
	summary_prompt TEXT NOT NULL, 
	follow_up_prompt TEXT NOT NULL, 
	sentiment_prompt TEXT NOT NULL, 
	snippet_prompt TEXT NOT NULL, 
	PRIMARY KEY (id)
);
INSERT INTO settings VALUES(1,'Leave Some Love','hello@leavesomelove.com',0,replace(replace('Summarize the following customer testimonial conversation into a first-person review. Follow these guidelines:\r\n    1. Vary the opening sentence. Avoid always starting with "I''ve had a [adjective] experience with [business name]." Instead, consider starting with:\r\n       - A specific aspect of the experience\r\n       - An emotion or reaction\r\n       - A comparison to past experiences\r\n       - A direct recommendation\r\n    2. Focus on 2-3 key points from the conversation that stood out the most.\r\n    3. Use the customer''s own words and phrases where possible, maintaining their tone and sentiment.\r\n    4. Include specific details or examples mentioned in the conversation.\r\n    5. Conclude with a different structure each time. Options include:\r\n       - A direct recommendation\r\n       - A statement about future intentions (e.g., "I''ll definitely be back")\r\n       - A summary of the overall impact\r\n       - A comparison to competitors or previous experiences\r\n    6. Aim for a natural, conversational tone that sounds like a real person speaking.\r\n    7. Vary the length of the summary between 3-5 sentences.\r\n    8. If applicable, mention how the product/service solved a problem or made a difference.','\r',char(13)),'\n',char(10)),replace(replace('Based on the following conversation history and business context, generate a relevant follow-up question to elicit a response that would make an excellent testimonial. The question should:\r\n\r\n1. Encourage the customer to highlight specific positive aspects of their experience with {profile.business_name}.\r\n2. Guide the customer towards expressing how the products/services have benefited them or solved a problem.\r\n3. Prompt for comparisons with competitors or previous experiences, if relevant.\r\n4. Invite the customer to share any memorable or standout moments.\r\n5. Encourage the use of descriptive language and specific examples.\r\n6. If appropriate, ask how they would describe the product/service to others, especially considering the target audience.\r\n7. Focus on the aspects highlighted in the Testimonial Guidance: {profile.testimonial_guidance}.\r\n8. If relevant to the conversation, find opportunities to highlight the customer''s "before vs after" experience and how the product or service made a positive impact.\r\n9. Avoid overly negative or critical directions, focusing instead on constructive and positive aspects.\r\n\r\nAsk only a single question at a time and aim for questions that could lead to quotable, impactful statements that showcase the value and quality of the products/services.\r\n\r\nBusiness Context:\r\n{business_context}\r\n\r\nConversation history:\r\n{conversation_history}\r\n\r\nFollow-up question:','\r',char(13)),'\n',char(10)),'You are a sentiment analysis tool. Analyze the sentiment of the following text and respond with a score between 0 and 1, where 0 is very negative and 1 is very positive. Your response should ONLY include the numerical score.','You are a text analysis tool. Extract 3-5 short snippets from the following text that represent the most compelling parts of the testimonial conversation. Respond with each snippet on a new line.');
COMMIT;
