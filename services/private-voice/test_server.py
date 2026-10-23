import importlib.util
import os
import unittest

from fastapi.testclient import TestClient

spec = importlib.util.spec_from_file_location("voice_server", __file__.replace("test_server.py", "server.py"))
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


class VoiceTests(unittest.TestCase):
    def setUp(self):
        os.environ["PRIVATE_VOICE_TOKEN"] = "test-" + "x" * 40
        self.seen = []
        def synth(text):
            self.seen.append(text)
            return b"RIFF-test-only", 1.0
        self.client = TestClient(server.create_app(synth))
        self.headers = {"Authorization": "Bearer " + os.environ["PRIVATE_VOICE_TOKEN"]}

    def test_denies_other_users_before_inference(self):
        for path, body in [("/status", {}), ("/speech", {"text": "خبر"})]:
            self.assertEqual(self.client.post(path, json=body).status_code, 401)
        self.assertEqual(self.seen, [])

    def test_verbatim_text_and_audio_contract(self):
        text = "العراق، بصوت واضح."
        r = self.client.post("/speech", headers=self.headers, json={"text": text})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.seen, [text])
        self.assertEqual(r.json()["voice"], "private-owner")
        self.assertEqual(r.json()["mimeType"], "audio/wav")

    def test_rejects_empty_and_overlong(self):
        for text in [" ", "أ" * 6001]:
            self.assertEqual(self.client.post("/speech", headers=self.headers, json={"text": text}).status_code, 422)
        self.assertEqual(self.seen, [])

    def test_other_origins_cannot_read_responses(self):
        r = self.client.post("/status", headers={**self.headers, "Origin": "https://example.com"}, json={})
        self.assertNotIn("access-control-allow-origin", r.headers)

    def test_no_insecure_default_secret(self):
        os.environ["PRIVATE_VOICE_TOKEN"] = "short"
        with self.assertRaises(RuntimeError):
            server.create_app(lambda _: None)


if __name__ == "__main__":
    unittest.main()
