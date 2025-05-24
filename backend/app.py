import os
from flask import Flask, request, jsonify
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import timedelta
from dotenv import load_dotenv
from bson import ObjectId 
from flask_cors import CORS
from flask import  Response
from cv_gen import generate_cv
import os
import io
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
import PyPDF2 

load_dotenv()

app = Flask(__name__)
CORS(app) 
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=2)

mongo = PyMongo(app)
jwt = JWTManager(app)

@app.route("/protected", methods=["GET"])
@jwt_required()
def protected():
    current_user = get_jwt_identity()
    print(current_user)
    return jsonify({"msg": "You are logged in", "user_id": current_user}), 200


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    if mongo.db.users.find_one({"email": data["email"]}):
        return jsonify({"msg": "Email already exists"}), 400

    hashed_pw = generate_password_hash(data["password"])
    result = mongo.db.users.insert_one({
        "email": data["email"],
        "password": hashed_pw
    })

    user_id = str(result.inserted_id)  
    access_token = create_access_token(identity=user_id)

    return jsonify({
        "msg": "User registered successfully",
        "access_token": access_token,
    }), 201


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    user = mongo.db.users.find_one({"email": data["email"]})
    print(data)
    if not user or not check_password_hash(user["password"], data["password"]):
        return jsonify({"msg": "Invalid credentials"}), 401
    access_token = create_access_token(identity=str(user["_id"]))
    return jsonify(access_token=access_token), 200


@app.route("/resume/upload", methods=["POST"])
@jwt_required()
def upload_resume():
    current_user_id = get_jwt_identity()
    if "file" not in request.files:
        return jsonify({"message": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"message": "No selected file"}), 400

    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"message": "Only PDF files are allowed"}), 400

    try:
        filename = secure_filename(file.filename)
        file_data = file.read()

        # Validate PDF
        try:
            PyPDF2.PdfReader(io.BytesIO(file_data))
        except:
            return jsonify({"message": "Invalid PDF file"}), 400

        mongo.db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {
                "$set": {
                    "resume": file_data,
                    "resume_filename": filename
                }
            }
        )

        return jsonify({
            "message": "Resume uploaded successfully",
            "filename": filename
        }), 200
    except Exception as e:
        return jsonify({"message": f"Failed to upload resume: {str(e)}"}), 500

@app.route("/resume/status", methods=["GET"])
@jwt_required()
def get_resume_status():
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.users.find_one(
            {"_id": ObjectId(current_user_id)}, 
            {"resume_filename": 1}
        )
        
        if not user or "resume_filename" not in user:
            return jsonify({"filename": None}), 200
            
        return jsonify({"filename": user["resume_filename"]}), 200
    except Exception as e:
        return jsonify({"message": f"Failed to check resume status: {str(e)}"}), 500

@app.route("/resume/delete", methods=["DELETE"])
@jwt_required()
def delete_resume():
    try:
        current_user_id = get_jwt_identity()
        result = mongo.db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$unset": {"resume": "", "resume_filename": ""}}
        )
        
        if result.modified_count > 0:
            return jsonify({"message": "Resume deleted successfully"}), 200
        else:
            return jsonify({"message": "No resume found to delete"}), 404
    except Exception as e:
        return jsonify({"message": f"Failed to delete resume: {str(e)}"}), 500


def get_user_resume_pdf(user_id):
    user_data = mongo.db.users.find_one({"_id": ObjectId(user_id)}, {"resume": 1})
    if not user_data or "resume" not in user_data:
        raise FileNotFoundError("Resume not found for the user")
    return user_data["resume"]


def save_cover_letter_to_user(user_id, cover_letter_path):
    with open(cover_letter_path, "rb") as f:
        cover_letter_data = f.read()
    mongo.db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "cover_letter": cover_letter_data,
            "cover_letter_filename": cover_letter_path
        }}
    )


def extract_text_from_pdf_bytes(pdf_bytes):
    pdf_stream = io.BytesIO(pdf_bytes)
    try:
        reader = PyPDF2.PdfReader(pdf_stream)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        raise RuntimeError(f"Failed to extract text from PDF: {str(e)}")


def generate_cover_letter_document(link, job_description, resume_text, user_id):

    generate_cv(
        link=link,
        job_description=job_description,
        resume_content=resume_text,
        user_id=user_id
    )

    filename = f"cover_letter_{user_id}.docx"
    if not os.path.exists(filename):
        raise FileNotFoundError("Cover letter was not generated")
    return filename


@app.route("/coverletter/generate", methods=["POST"])
@jwt_required()
def generate_cover_letter_route():
    data = request.get_json()
    job_link = data.get("link")
    job_description = data.get("job_description")

    if not job_link and not job_description:
        return jsonify({"error": "Either job link or job description is required"}), 400

    current_user_id = get_jwt_identity()

    try:
        resume_pdf = get_user_resume_pdf(current_user_id)
        resume_text = extract_text_from_pdf_bytes(resume_pdf)
        cover_letter_path = generate_cover_letter_document(job_link, job_description, resume_text, current_user_id)
        save_cover_letter_to_user(current_user_id, cover_letter_path)

    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": f"Failed to generate cover letter: {str(e)}"}), 500

    return jsonify({"msg": "Cover letter generated and saved successfully"}), 200


@app.route("/coverletter/download", methods=["GET"])
@jwt_required()
def download_cover_letter():
    current_user_id = get_jwt_identity()
    user = mongo.db.users.find_one(
        {"_id": ObjectId(current_user_id)},
        {"cover_letter": 1, "cover_letter_filename": 1}
    )

    if not user or "cover_letter" not in user:
        return jsonify({"error": "Cover letter not found"}), 404

    file_data = user["cover_letter"]
    filename = "_".join(user.get("cover_letter_filename", "cover_letter.docx").split("_")[:-1])

    return Response(
        file_data,
        mimetype="application/docx",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.route("/resume/download", methods=["GET"])
@jwt_required()
def download_resume():
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.users.find_one(
            {"_id": ObjectId(current_user_id)},
            {"resume": 1, "resume_filename": 1}
        )

        if not user or "resume" not in user:
            return jsonify({"error": "Resume not found"}), 404

        file_data = user["resume"]
        filename = user.get("resume_filename", "resume.pdf")

        return Response(
            file_data,
            mimetype="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        return jsonify({"error": f"Failed to download resume: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', 
            port=5000, 
            debug=True,
            use_reloader=True,
            threaded=True)
