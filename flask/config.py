import os

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "wekkekwrnlwnnklwl")
    
    # MongoDB Config
    MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://oliviaoguelina:olivia@bluecode.17a3e.mongodb.net/?retryWrites=true&w=majority&appName=Bluecode")

    # JWT Config
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jkskikcwjbjkwbkjdbsk")
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # Token expires in 1 day

    # Flask-Mail Config
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "webwizards211@gmail.com")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "mwkq svdk aflv pwhh")

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig
}
