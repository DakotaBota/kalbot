"""KalBot app page: strict CSP, no inline script, and only well-formed commands sent through sendData."""
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
CMD = re.compile(r"/[a-z]+(?: [A-Za-z0-9]+){0,2}")


class AppContract(unittest.TestCase):
    def setUp(self):
        self.html = (ROOT / "app.html").read_text()
        self.js = (ROOT / "app.js").read_text()

    def test_csp_allows_only_self_and_the_telegram_sdk(self):
        csp = re.search(r'http-equiv="Content-Security-Policy" content="([^"]+)"', self.html).group(1)
        self.assertIn("script-src 'self' https://telegram.org/js/telegram-web-app.js;", csp)
        self.assertIn("connect-src 'self'", csp)
        self.assertNotIn("unsafe-eval", csp)

    def test_no_inline_script_or_handlers(self):
        scripts = re.findall(r"<script([^>]*)>(.*?)</script>", self.html, re.S)
        self.assertTrue(all("src=" in attrs and not body.strip() for attrs, body in scripts))
        self.assertIsNone(re.search(r"\son[a-z]+=", self.html))

    def test_every_button_command_is_well_formed(self):
        cmds = re.findall(r'data-cmd="([^"]+)"', self.html)
        cmds += [t.replace("{coin}", "BTC") for t in re.findall(r'data-cmd-template="([^"]+)"', self.html)]
        cmds += [f"/sellall {k}" for k in re.findall(r'\["([a-z]+)", "', self.js)]
        self.assertGreater(len(cmds), 30)
        bad = [c for c in cmds if not CMD.fullmatch(c) or len(c) > 64]
        self.assertEqual(bad, [])

    def test_sends_only_through_the_native_bridge_and_never_stores_data(self):
        self.assertIn("TelegramWebviewProxy", self.js)
        self.assertIn("tg.sendData(JSON.stringify({ cmd }))", self.js)
        for banned in ("localStorage", "sessionStorage", "fetch(", "XMLHttpRequest", "document.cookie"):
            self.assertNotIn(banned, self.js)


if __name__ == "__main__":
    unittest.main()
