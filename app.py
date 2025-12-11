from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Dict

from flask import (
    Flask,
    flash,
    get_flashed_messages,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key")

BASE_DIR = Path(__file__).resolve().parent
USERS_FILE = BASE_DIR / "users.json"


def load_users() -> Dict[str, str]:
    if not USERS_FILE.exists():
        return {}
    try:
        data = json.loads(USERS_FILE.read_text())
        return data.get("users", {}) if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def save_users(users: Dict[str, str]) -> None:
    USERS_FILE.write_text(json.dumps({"users": users}, indent=2))


@app.route("/")
def index():
    logged_user = session.get("username")
    flash_texts = get_flashed_messages()
    return render_template("index.html", username=logged_user, flashes=flash_texts)


@app.route("/register", methods=["POST"])
def register():
    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")

    if not username or not password:
        flash("Completá usuario y contraseña para registrarte.")
        return redirect(url_for("index"))

    users = load_users()
    if username in users:
        flash("Ese usuario ya existe. Probá con otro nombre.")
        return redirect(url_for("index"))

    users[username] = generate_password_hash(password)
    save_users(users)
    session["username"] = username
    flash("¡Cuenta creada! Ya podés jugar.")
    return redirect(url_for("index"))


@app.route("/login", methods=["POST"])
def login():
    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")
    users = load_users()

    if username not in users or not check_password_hash(users[username], password):
        flash("Usuario o contraseña incorrectos.")
        return redirect(url_for("index"))

    session["username"] = username
    flash("Sesión iniciada. ¡A jugar!")
    return redirect(url_for("index"))


@app.route("/logout", methods=["POST"])
def logout():
    session.pop("username", None)
    flash("Sesión cerrada.")
    return redirect(url_for("index"))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
