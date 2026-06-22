import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app import app, load_users, save_users


class AuthFlowTests(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.users_file = Path(self.tmpdir.name) / "users.json"
        self.users_patch = patch("app.USERS_FILE", self.users_file)
        self.users_patch.start()
        app.config.update(TESTING=True, SECRET_KEY="test-secret")
        self.client = app.test_client()

    def tearDown(self):
        self.users_patch.stop()
        self.tmpdir.cleanup()

    def test_register_login_logout_flow(self):
        response = self.client.post(
            "/register",
            data={"username": "piloto", "password": "laser"},
            follow_redirects=True,
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("Hola, piloto".encode(), response.data)
        self.assertIn("¡Cuenta creada!".encode(), response.data)

        self.client.post("/logout", follow_redirects=True)
        response = self.client.post(
            "/login",
            data={"username": "piloto", "password": "laser"},
            follow_redirects=True,
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("Hola, piloto".encode(), response.data)

        response = self.client.post("/logout", follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn("Sesión cerrada.".encode(), response.data)

    def test_malformed_users_file_is_ignored(self):
        self.users_file.write_text("{not-json", encoding="utf-8")
        self.assertEqual(load_users(), {})

    def test_non_string_user_records_are_ignored(self):
        self.users_file.write_text(
            json.dumps({"users": {"ok": "hash", "bad": 123}}),
            encoding="utf-8",
        )
        self.assertEqual(load_users(), {"ok": "hash"})

    def test_save_users_writes_utf8_json(self):
        save_users({"ñandú": "hash"})
        payload = json.loads(self.users_file.read_text(encoding="utf-8"))
        self.assertEqual(payload, {"users": {"ñandú": "hash"}})


if __name__ == "__main__":
    unittest.main()
