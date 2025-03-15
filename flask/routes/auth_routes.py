from flask import Flask, request, jsonify, Blueprint
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, JWTManager
from flask_mail import Mail, Message
from flask_pymongo import PyMongo
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId
import datetime
import random
import os
from pymongo.errors import ConnectionFailure
from flask import render_template_string

app = Flask(__name__)

# 🔥 MongoDB Configuration
MONGO_URI = "mongodb+srv://oliviaoguelina:olivia@bluecode.17a3e.mongodb.net/?retryWrites=true&w=majority&appName=Bluecode"
client = MongoClient(MONGO_URI)

try:
    # Check if MongoDB is connected
    client.admin.command("ping")
    print("✅ MongoDB connection successful!")
    db = client.get_database("Bluecode")
except ConnectionFailure:
    print("❌ MongoDB connection failed!")
    db = None  

app.config["JWT_SECRET_KEY"] = "asbajbjksbkwbkjbwkbjjbj"
jwt = JWTManager(app)

app.config.update(
    MAIL_SERVER="smtp.gmail.com",
    MAIL_PORT=587,
    MAIL_USE_TLS=True,
    MAIL_USERNAME="webwizards211@gmail.com",
    MAIL_PASSWORD="mwkq svdk aflv pwhh",
    MAIL_DEFAULT_SENDER="webwizards211@gmail.com",
)

mail = Mail(app)

auth_bp = Blueprint("auth", __name__)

DEFAULT_PROFILE_IMAGE = "https://yourcdn.com/default-profile.png"

def generate_otp():
    return str(random.randint(100000, 999999))


def send_email(subject, recipient, otp, email_type="verification"):
    """ Sends email with an OTP using an HTML template """
    
    email_templates = {
        "verification": f"""
        <html>
        <body>
            <h2>Welcome to Bluecode!</h2>
            <p>Thank you for signing up. Use the OTP below to verify your email:</p>
            <h3 style="color: #2d89ef;">{otp}</h3>
            <p>If you didn’t request this, please ignore this email.</p>
            <br>
            <p>Best regards,</p>
            <p><strong>Bluecode Team</strong></p>
        </body>
        </html>
        """,
        "password_reset": f"""
        <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Use the OTP below to proceed:</p>
            <h3 style="color: #ff5733;">{otp}</h3>
            <p>If you didn’t request this, please ignore this email.</p>
            <br>
            <p>Best regards,</p>
            <p><strong>Bluecode Support</strong></p>
        </body>
        </html>
        """
    }

    msg = Message(
        subject=subject,
        sender="webwizards211@gmail.com",  
        recipients=[recipient],
        html=email_templates.get(email_type, "Your OTP is: " + otp)
    )
    
    try:
        mail.send(msg)
        print(f"✅ Email sent successfully to {recipient}")
    except Exception as e:
        print(f"❌ Error sending email: {e}")



@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    name, username, email, password = data.get("name"), data.get("username"), data.get("email"), data.get("password")
    
    if not all([name, username, email, password]):
        return jsonify({"error": "All fields are required"}), 400
    
    users_collection = db.users
    existing_user = users_collection.find_one({"$or": [{"email": email}, {"username": username}]})
    if existing_user:
        return jsonify({"error": "Email or Username already exists"}), 409
    
    hashed_password = generate_password_hash(password)
    otp = generate_otp()

    user = {
        "name": name,
        "username": username,
        "email": email,
        "password": hashed_password,
        "profile_image": DEFAULT_PROFILE_IMAGE,
        "verified": False,
        "verification_otp": otp,
        "created_at": datetime.datetime.utcnow()
    }
    users_collection.insert_one(user)
    
    send_email("Verify Your Account", email, otp, email_type="verification")
    return jsonify({"message": "User registered successfully. Check your email for OTP."}), 201

# 🔹 Email Verification
@auth_bp.route("/verify-email", methods=["POST"])
def verify_email():
    data = request.get_json()
    email, otp = data.get("email"), data.get("otp")

    user = db.users.find_one({"email": email})
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user["verified"]:
        return jsonify({"message": "User is already verified"}), 200
    if user["verification_otp"] != otp:
        return jsonify({"error": "Invalid OTP"}), 400
    
    db.users.update_one({"email": email}, {"$set": {"verified": True}, "$unset": {"verification_otp": 1}})
    return jsonify({"message": "Email verified successfully!"}), 200

# 🔹 Forgot Password
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    email = data.get("email")
    
    user = db.users.find_one({"email": email})
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    otp = generate_otp()
    db.users.update_one({"email": email}, {"$set": {"reset_otp": otp}})
    send_email("Reset Your Password", email, otp, email_type="password_reset")

    return jsonify({"message": "Password reset OTP sent to your email."}), 200

# 🔹 Reset Password
@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()
    email, otp, new_password = data.get("email"), data.get("otp"), data.get("new_password")

    user = db.users.find_one({"email": email})
    if not user or user.get("reset_otp") != otp:
        return jsonify({"error": "Invalid email or OTP"}), 400
    
    hashed_password = generate_password_hash(new_password)
    db.users.update_one({"email": email}, {"$set": {"password": hashed_password}, "$unset": {"reset_otp": 1}})
    
    return jsonify({"message": "Password reset successfully."}), 200

# 🔹 Login
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email, password = data.get("email"), data.get("password")

    user = db.users.find_one({"email": email})
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid email or password"}), 401
    if not user["verified"]:
        return jsonify({"error": "Please verify your email first."}), 403
    
    access_token = create_access_token(identity=str(user["_id"]), expires_delta=datetime.timedelta(days=1))
    return jsonify({"token": access_token, "message": "Login successful"}), 200

# 🔹 Update Profile
@auth_bp.route("/update-profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()

    try:
        user_id = ObjectId(user_id)  # Convert user_id to MongoDB ObjectId
    except:
        return jsonify({"error": "Invalid user ID"}), 400
    
    data = request.get_json()
    update_data = {}

    for field in ["name", "username", "email", "password", "profile_image"]:
        if field in data:
            if field == "password":
                update_data[field] = generate_password_hash(data[field])
            else:
                existing_user = db.users.find_one(
                    {"_id": {"$ne": user_id}, field: data[field]}
                )
                if existing_user:
                    return jsonify({"error": f"{field.capitalize()} already in use"}), 409
                update_data[field] = data[field]

    if update_data:
        db.users.update_one({"_id": user_id}, {"$set": update_data})
        return jsonify({"message": "Profile updated successfully"}), 200

    return jsonify({"error": "No data to update"}), 400

# 🔹 Register Blueprint
app.register_blueprint(auth_bp, url_prefix="/auth")

# 🔹 Run the App
if __name__ == "__main__":
    app.run(debug=True, port=4000)
