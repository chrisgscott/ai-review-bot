from app import db, User, bcrypt, app  # Import your existing Flask app instance

def rehash_passwords():
    # Create an application context
    with app.app_context():
        # Get all users from the database
        users = User.query.all()

        for user in users:
            try:
                # Check if the password is already hashed
                if not user.password.startswith('bcrypt:'):
                    # Rehash the password
                    new_hashed_password = bcrypt.generate_password_hash(user.password).decode('utf-8')
                    
                    # Update the user's password
                    user.password = new_hashed_password
                    db.session.add(user)
                    print(f"Rehashed password for user {user.email}")
        
            except Exception as e:
                print(f"Error rehashing password for user {user.email}: {str(e)}")
        
        # Commit the changes to the database
        db.session.commit()
        print("Password rehashing complete.")

if __name__ == "__main__":
    rehash_passwords()
