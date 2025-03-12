from database import mongo

class Merchant:
    @staticmethod
    def find_by_email(email):
        return mongo.db.merchants.find_one({"email": email})

    @staticmethod
    def create_merchant(data):
        mongo.db.merchants.insert_one(data)
