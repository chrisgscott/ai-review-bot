## About

Leave Some Love is an AI-powered testimonial management platform designed to help businesses effectively collect, analyze, and leverage customer testimonials. The tool uses advanced AI to engage customers in natural conversations, generating detailed and authentic testimonials while providing valuable insights through sentiment analysis and key snippet extraction. With features like customizable branding, multi-channel integration, and an intuitive dashboard, Leave Some Love simplifies the process of building a strong online reputation. Whether for small local businesses or growing enterprises, the platform offers a comprehensive solution to turn customer experiences into powerful marketing assets, ultimately helping businesses boost their credibility and attract more customers.

## To-Do List

### Features
- [ ] Add a bulk testimonial request feature (upload a list of first name and email address, send all requests at once)
- [ ] Create a public profile page of testimonials and user details to capture google juice.
- [X] ~~Add a notification email to the business owner when a testimonial is submitted.~~
- [X] ~~Add a way for the reviewer to copy their review summary and paste in the review site of the business owners' choice~~
- [X] ~~Implement user authentication~~
- [X] ~~Add profile management~~
- [X] ~~Create admin dashboard~~
- [X] ~~Add a way to send a review link to a client/customer from the owner dashboard and personalize the initial question with the client name.~~
- [X] ~~Create a custom index.html URL for each registered user so their testimonials are associated with (and imported into ) their account.~~


### Enhancements
- [ ] Filter and sort reviews within the owner dashboard
- [ ] Collect business logo and ~~send business name~~ + logo to Brevo for template customization.
- [ ] Modify the chatbot interface to expand vertically as the chat length increases.
- [ ] Add Logout link to My Profile?
- [ ] Add onboarding flow for setting Business Details + Customizing Review URL
- [ ] Create a seed file for LSL Business Details/Profile Setup
- [ ] Add a headshot upload step to testimonial collection if sentiment is 9+ and no profile picture available from Gravatar?
- [ ] Add an approval step between submission and review site ask ("Here's your review. Approve it or edit it." (Save + Approve btn after editing?))
- [ ] Add an "Automatically add approved reviews with XX sentiment or greater to review widget" toggle.
- [ ] Add "Remove Leave Some Love branding" option to My Profile page. (one time fee?)
- [ ] Testimonial widget design options (one-time fee?)
    - [ ] Background color
    - [ ] Text color
    - [ ] Font face
    - [ ] Font sizes
    - [ ] Show/hide avatar
    - [ ] Show/hide rating
    - [ ] Remove branding
- [ ] Enhance Admin dashboard
    - [ ]Monthly Active Users (MAU) and Daily Active Users (DAU): Tracks user engagement over time.
    - [ ]Churn Rate: The percentage of users who stop using the tool over a period.
    - [ ]User Retention Rate: Measures how many users continue using the tool over time.
    - [ ]Signups by Day, Week, Month, Year: To identify trends in user acquisition.
    - [ ]Conversion Rate: Percentage of users who move from free to paid versions or take specific actions like adding the widget to their site.
    - [ ]Average Session Duration: Insight into how long users spend on your platform.
    - [ ]Feature Usage: Tracks which features are most and least used, helping prioritize development efforts.
    - [ ]Feedback or NPS Score: Measures user satisfaction and identifies areas for improvement.
    - [ ]Revenue Metrics: If applicable, track revenue per user, lifetime value, and monthly recurring revenue.
    - [ ]Support Ticket Volume: A gauge of user issues or confusion that might need addressing.
- [X] ~~Modify the chatbot text input field to expand vertically and the text to wrap as the text input length increases.~~
- [X] ~~Show a visualization of the sentiment score for each review~~
- [X] ~~Visually separate reviews on the dashboard~~
- [X] ~~Update the layout to a sidebar + main content layout~~
- [X] ~~Improve UI/UX for the main dashboard~~


### Bug Fixes

- [X] ~~/submit_testimonial via request link doesn't start the chatbot conversation.~~
- [X] ~~Fix UndefinedError when requesting a testimonial.~~
- [X] ~~Fix duplicate initial question when on the submit_testimonial/<customlink> chat bot.~~
- [X] ~~Submit testimonial button doesn't function on the /submit_testimonial/<customlink> page.~~
- [X] ~~Not collecting first name or email address up front on the customized user URL (ex: /leavesomelove)~~
- [X] ~~Fix testimonial submission error (see above issue related to custom URLs for the index.html form)~~

### Testing

- [ ] Register as new user
- [ ] Log in as new user
- [ ] Set Business Details
- [ ] Set custom url
- [ ] Change, save and test a new custom URL
- [ ] Send a testimonial request
- [ ] Leave a testimonial via testimonial request
- [ ] Resend a testimonial request
- [ ] Delete a testimonial request
- [ ] Confirm testimonial request is removed from pending after testimonial is submitted via request URL.
- [ ] Leave a testimonial via custom URL
- [ ] Follow external review site link
- [ ] Change Review Button Text
- [ ] Paste copied testimonial
- [ ] Test embedded testimonial widget
- [ ] Admin: Create a user
- [ ] Admin: Edit a user
- [ ] Admin: Delete a user
- [ ] Admin: Edit a testimonial
- [ ] Admin: Reset a password
- [ ] 

