from database import mongo

class User:
    @staticmethod
    def find_by_email(email):
        return mongo.db.users.find_one({"email": email})

    @staticmethod
    def create_user(email, password):
        user = {
            "email": email,
            "password": password
        }
        mongo.db.users.insert_one(user)
