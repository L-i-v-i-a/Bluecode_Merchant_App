from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_mail import Mail
from dotenv import load_dotenv
from database import mongo
import os

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure App
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")

# Flask-Mail Configuration
app.config["MAIL_SERVER"] = "smtp.gmail.com"  # Update with your SMTP provider
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")
app.config["MAIL_DEFAULT_SENDER"] = os.getenv("MAIL_DEFAULT_SENDER")

# Initialize Extensions
mongo.init_app(app)
jwt = JWTManager(app)
CORS(app)  
mail = Mail(app)  


from routes.auth_routes import auth_bp
from routes.merchant_routes import merchant_bp
from routes.payment_routes import payment_bp
from routes.dms_routes import dms_bp

app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(payment_bp, url_prefix="/payment")
app.register_blueprint(merchant_bp, url_prefix="/merchant")
app.register_blueprint(dms_bp, url_prefix="/dms")

# Run the app
if __name__ == "__main__":
    app.run(debug=True, port=4000)
