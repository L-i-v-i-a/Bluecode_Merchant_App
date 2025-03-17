from flask import Flask, request, jsonify, Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from pymongo import MongoClient
import string
import random
import datetime
from bson import ObjectId

# Create Blueprint
wallet_bp = Blueprint("wallet", __name__)

# Database connection
MONGO_URI = "mongodb+srv://oliviaoguelina:olivia@bluecode.17a3e.mongodb.net/?retryWrites=true&w=majority&appName=Bluecode"
client = MongoClient(MONGO_URI)
db = client["Bluecode"]
merchants = db["merchants"]  
transactions = db["payment_transactions"]  
users_collection = db["users"]  
branches = db["branches"]  
wallets = db["wallets"]
registered_merchants = db["registered_merchants"]

@wallet_bp.route('/wallets', methods=['GET'])
@jwt_required()
def get_wallet():
    user_id = get_jwt_identity()
    user = users_collection.find_one({"_id": ObjectId(user_id)})

    if not user or not user.get("is_merchant", False):
        return jsonify({"error": "Merchant not found"}), 404

    wallet = wallets.find_one({"user_id": str(user["_id"])})

    if not wallet:
        return jsonify({"error": "Wallet not found"}), 404

    return jsonify({"wallet": wallet}), 200

@wallet_bp.route('/deposit', methods=['POST'])
@jwt_required()
def deposit_money():
    data = request.json
    amount = data.get("amount")
    description = data.get("description")

    if not amount or amount <= 0:
        return jsonify({"error": "Amount must be greater than zero"}), 400

    user_id = get_jwt_identity()
    user = users_collection.find_one({"_id": ObjectId(user_id)})

    if not user or not user.get("is_merchant", False):
        return jsonify({"error": "Merchant not found"}), 404

    wallet = wallets.find_one({"merchant_id": ObjectId(user["_id"])})

    if not wallet:
        return jsonify({"error": "Wallet not found"}), 404

    wallet["balance"] += amount
    transaction = {
        "amount": amount,
        "type": "deposit",
        "description": description,
        "created_at": datetime.now()
    }

    wallet["transactions"].append(transaction)
    wallets.update_one({"_id": wallet["_id"]}, {"$set": {"balance": wallet["balance"], "transactions": wallet["transactions"]}})

    return jsonify({"message": "Deposit successful", "balance": wallet["balance"], "wallet": wallet}), 200

@wallet_bp.route('/create_virtual_card', methods=['POST'])
@jwt_required()
def create_virtual_card():
    user_id = get_jwt_identity()
    user = users_collection.find_one({"_id": ObjectId(user_id)})

    if not user or not user.get("is_merchant", False):
        return jsonify({"error": "Merchant not found"}), 404

    wallet = wallets.find_one({"merchant_id": ObjectId(user["_id"])})

    if not wallet:
        return jsonify({"error": "Wallet not found"}), 404

    card_number = ''.join(random.choices(string.digits, k=16))
    expiration_date = "12/25"
    card = {
        "card_number": card_number,
        "expiration_date": expiration_date,
        "status": "active",
        "created_at": datetime.now(),
        "last_used": None
    }

    wallet["virtual_cards"].append(card)
    wallets.update_one({"_id": wallet["_id"]}, {"$set": {"virtual_cards": wallet["virtual_cards"]}})

    return jsonify({"message": "Virtual card created successfully", "card": card}), 200
