"""Browser test: an inbound WhatsApp message updates the unread badge and chimes
only for the signed-in organization.

Run:  lovable auth-session --json   (or rely on injected LOVABLE_BROWSER_* vars)
      python3 scripts/verify-whatsapp-unread-sound.py
Env:  TEST_CONVERSATION_ID (default: internal test conversation), APP_URL.
The test inserts inbound rows into the chosen conversation and deletes them afterwards.
"""
import asyncio, json, os, sys, uuid
import requests
from playwright.async_api import async_playwright

APP = os.environ.get("APP_URL", "http://localhost:8080")
SUPA = "https://gvozalurfthzxpuasplo.supabase.co"
ANON = open(".env").read().split("VITE_SUPABASE_PUBLISHABLE_KEY=")[1].split("\n")[0].strip('"')
CONV = os.environ.get("TEST_CONVERSATION_ID", "dea26d8d-fe56-491d-895b-2a26e9280386")


def load_session():
    key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    sess = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    if key and sess:
        return key, json.loads(sess)
    with open(os.path.expanduser("~/.cache/lovable-auth/session.json")) as f:
        m = json.load(f)
    return m["storage_key"], m["session"]


def rest(token, method, path, **kw):
    h = {"apikey": ANON, "Authorization": f"Bearer {token}", "Content-Type": "application/json",
         "Prefer": "return=representation"}
    r = requests.request(method, f"{SUPA}/rest/v1/{path}", headers=h, timeout=20, **kw)
    r.raise_for_status()
    return r.json() if r.text else None


# Counts every alert chime instead of playing audio.
AUDIO_STUB = """
window.__chimes = 0;
const Real = window.AudioContext;
window.AudioContext = class extends Real {
  createOscillator() { const o = super.createOscillator(); const s = o.start.bind(o);
    o.start = (t) => { window.__chimeTones = (window.__chimeTones||0)+1; if (window.__chimeTones % 2 === 1) window.__chimes++; return s(t); }; return o; }
};
"""


async def main():
    storage_key, session = load_session()
    token = session["access_token"]
    conv = rest(token, "GET", f"whatsapp_conversations?id=eq.{CONV}&select=id,organization_id&limit=1")
    assert conv, "test conversation not found"
    conv_id, org_id = conv[0]["id"], conv[0]["organization_id"]
    inserted, failures = [], []

    def insert_inbound(text):
        row = rest(token, "POST", "whatsapp_messages", json={
            "id": str(uuid.uuid4()), "organization_id": org_id, "conversation_id": conv_id,
            "direction": "inbound", "message_type": "text", "content": text,
            "message_id": f"test-{uuid.uuid4()}", "status": "received"})
        inserted.append(row[0]["id"])

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        frames = []
        page.on("websocket", lambda ws: ws.on("framesent", lambda f: frames.append(str(f))))
        await page.goto(APP)
        await page.evaluate(f"localStorage.setItem({json.dumps(storage_key)}, {json.dumps(json.dumps(session))})")
        await page.add_init_script(AUDIO_STUB)
        try:
            # 1) Conversation NOT open: one chime + unread badge.
            await page.goto(f"{APP}/whatsapp-inbox", wait_until="networkidle")
            await page.mouse.click(5, 5)  # unlock audio
            await page.wait_for_timeout(3000)
            insert_inbound("اختبار آلي 1")
            insert_inbound("اختبار آلي 2")
            await page.wait_for_timeout(8000)
            chimes = await page.evaluate("window.__chimes")
            badge = await page.locator("[aria-label$='رسائل غير مقروءة']").count()
            if chimes < 1: failures.append(f"expected chime for closed conversation, got {chimes}")
            if badge < 1: failures.append("unread badge not shown")

            # 2) Realtime subscription is scoped to this organization only.
            joined = [f for f in frames if "whatsapp-inbound-sound" in f]
            if not joined or f"organization_id=eq.{org_id}" not in joined[0]:
                failures.append("sound channel is not filtered by organization_id")

            # 3) Conversation open on screen: no chime, no unread.
            await page.goto(f"{APP}/whatsapp-inbox/{conv_id}", wait_until="networkidle")
            await page.mouse.click(5, 5)
            await page.wait_for_timeout(3000)
            before = await page.evaluate("window.__chimes")
            insert_inbound("اختبار آلي 3")
            await page.wait_for_timeout(8000)
            after = await page.evaluate("window.__chimes")
            if after != before: failures.append(f"chimed for the open conversation ({after - before})")
        finally:
            for mid in inserted:
                rest(token, "DELETE", f"whatsapp_messages?id=eq.{mid}")
            await browser.close()

    if failures:
        print("FAIL\n- " + "\n- ".join(failures)); sys.exit(1)
    print("PASS: badge + chime for own org, filtered channel, silent when open")

asyncio.run(main())
