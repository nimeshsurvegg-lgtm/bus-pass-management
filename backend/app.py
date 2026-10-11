import os
import re
import secrets
import sqlite3
from datetime import date, timedelta

import requests
from dotenv import load_dotenv
from flask import Flask, g, jsonify, request

load_dotenv()

MINIMOTH_API_KEY = os.getenv("MINIMOTH_API_KEY")
MINIMOTH_URL = "https://api.minimoth.dev/v1/otp"
DB_FILE = os.path.join(os.path.dirname(__file__), "buspass.db")

# Allowed values (the frontend shows the same lists)
ROUTES = [
    "Central Station to Tech Park",
    "Airport to City Centre",
    "University to Old Town",
    "Harbour to Market Square",
]
PLANS = {"weekly": {"days": 7, "price": 250}, "monthly": {"days": 30, "price": 800}}

app = Flask(__name__)


# ---------- errors ----------
class ApiError(Exception):
    def __init__(self, message, status=400):
        self.message = message
        self.status = status


@app.errorhandler(ApiError)
def handle_api_error(err):
    return jsonify(error=err.message), err.status


@app.errorhandler(Exception)
def handle_unexpected(err):
    app.logger.exception(err)
    return jsonify(error="Something went wrong on the server"), 500


# ---------- database (3 models: users, sessions, passes) ----------
def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_FILE)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_):
    conn = g.pop("db", None)
    if conn:
        conn.close()


def init_db():
    with sqlite3.connect(DB_FILE) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS passes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                code TEXT NOT NULL,
                route TEXT NOT NULL,
                plan TEXT NOT NULL,
                price INTEGER NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                cancelled INTEGER NOT NULL DEFAULT 0
            );
            """
        )


# ---------- helpers ----------
def clean_phone(raw):
    digits = re.sub(r"[\s+\-]", "", str(raw or ""))
    if not digits.isdigit() or not 10 <= len(digits) <= 15:
        raise ApiError("Enter a valid phone number")
    # 10 digits with no country code: assume India (+91)
    return "91" + digits if len(digits) == 10 else digits


def minimoth(action, payload):
    """Call the Minimoth OTP API. action is 'send' or 'verify'."""
    if not MINIMOTH_API_KEY:
        raise ApiError("MINIMOTH_API_KEY is missing in backend/.env", 500)
    try:
        res = requests.post(
            f"{MINIMOTH_URL}/{action}",
            json=payload,
            headers={"X-Api-Key": MINIMOTH_API_KEY},
            timeout=10,
        )
    except requests.RequestException:
        raise ApiError("Could not reach Minimoth. Try again.", 502)
    try:
        data = res.json()
    except ValueError:
        data = {}
    if not res.ok:
        message = data.get("error") or data.get("message") or "OTP request failed"
        raise ApiError(message, 502 if res.status_code >= 500 else 400)
    return data


def current_user():
    token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    user = db().execute(
        "SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id "
        "WHERE sessions.token = ?",
        (token,),
    ).fetchone()
    if not user:
        raise ApiError("Please log in again", 401)
    return user


def pass_to_dict(row):
    status = "active"
    if row["cancelled"]:
        status = "cancelled"
    elif row["end_date"] < date.today().isoformat():
        status = "expired"
    return {
        "id": row["id"],
        "code": row["code"],
        "route": row["route"],
        "plan": row["plan"],
        "price": row["price"],
        "start_date": row["start_date"],
        "end_date": row["end_date"],
        "status": status,
    }


# ---------- endpoints ----------
@app.post("/api/otp/send")
def send_otp():
    body = request.get_json(silent=True) or {}
    phone = clean_phone(body.get("phone"))
    name = str(body.get("name") or "").strip()

    known = db().execute("SELECT id FROM users WHERE phone = ?", (phone,)).fetchone()
    if not known and not name:
        raise ApiError("New here? Enter your name to register")

    minimoth("send", {"phone": phone})
    return jsonify(ok=True)


@app.post("/api/otp/verify")
def verify_otp():
    body = request.get_json(silent=True) or {}
    phone = clean_phone(body.get("phone"))
    code = str(body.get("code") or "").strip()
    name = str(body.get("name") or "").strip()
    if not re.fullmatch(r"\d{4,8}", code):
        raise ApiError("Enter the OTP code you received")

    minimoth("verify", {"phone": phone, "code": code})

    # OTP is valid: log in, or register on first login
    user = db().execute("SELECT * FROM users WHERE phone = ?", (phone,)).fetchone()
    if not user:
        if not name:
            raise ApiError("Name is required to register")
        cur = db().execute("INSERT INTO users (phone, name) VALUES (?, ?)", (phone, name))
        user = db().execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()

    token = secrets.token_hex(16)
    db().execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user["id"]))
    db().commit()
    return jsonify(token=token, user={"name": user["name"], "phone": user["phone"]})


@app.get("/api/passes")
def list_passes():
    user = current_user()
    rows = db().execute(
        "SELECT * FROM passes WHERE user_id = ? ORDER BY id DESC", (user["id"],)
    ).fetchall()
    return jsonify(passes=[pass_to_dict(r) for r in rows])


@app.post("/api/passes")
def buy_pass():
    user = current_user()
    body = request.get_json(silent=True) or {}
    route = body.get("route")
    plan = body.get("plan")
    if route not in ROUTES:
        raise ApiError("Choose a valid route")
    if plan not in PLANS:
        raise ApiError("Choose a valid plan")

    start = date.today()
    end = start + timedelta(days=PLANS[plan]["days"] - 1)
    code = "BP-" + secrets.token_hex(3).upper()
    cur = db().execute(
        "INSERT INTO passes (user_id, code, route, plan, price, start_date, end_date) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user["id"], code, route, plan, PLANS[plan]["price"], start.isoformat(), end.isoformat()),
    )
    db().commit()
    row = db().execute("SELECT * FROM passes WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify({"pass": pass_to_dict(row)}), 201


@app.delete("/api/passes/<int:pass_id>")
def cancel_pass(pass_id):
    user = current_user()
    row = db().execute(
        "SELECT * FROM passes WHERE id = ? AND user_id = ?", (pass_id, user["id"])
    ).fetchone()
    if not row:
        raise ApiError("Pass not found", 404)
    db().execute("UPDATE passes SET cancelled = 1 WHERE id = ?", (pass_id,))
    db().commit()
    row = db().execute("SELECT * FROM passes WHERE id = ?", (pass_id,)).fetchone()
    return jsonify({"pass": pass_to_dict(row)})


init_db()

if __name__ == "__main__":
    app.run(port=int(os.getenv("PORT", 5001)), debug=True)
  
