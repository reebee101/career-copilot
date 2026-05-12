"""
Auto-apply service — supports LinkedIn Easy Apply, Wuzzuf, and generic forms.
Enable in .env: AUTO_APPLY_ENABLED=true
"""
from playwright.async_api import async_playwright, TimeoutError as PWTimeout
from config import get_settings

settings = get_settings()


class AutoApplyResult:
    def __init__(self, success: bool, message: str, screenshot: bytes = None):
        self.success = success
        self.message = message
        self.screenshot = screenshot


async def detect_ats(url: str) -> str:
    u = url.lower()
    if "linkedin.com" in u:
        return "linkedin"
    if "wuzzuf.net" in u:
        return "wuzzuf"
    return "generic"


async def auto_apply(apply_url: str, cv_path: str, cover_letter: str, candidate: dict) -> AutoApplyResult:
    if not settings.auto_apply_enabled:
        return AutoApplyResult(False, "Auto-apply is disabled. Set AUTO_APPLY_ENABLED=true in .env.")

    ats = await detect_ats(apply_url)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = await context.new_page()
        try:
            if ats == "linkedin":
                result = await _apply_linkedin(page, apply_url, cv_path, cover_letter, candidate)
            elif ats == "wuzzuf":
                result = await _apply_wuzzuf(page, apply_url, cv_path, cover_letter, candidate)
            else:
                result = await _apply_generic(page, apply_url, cv_path, cover_letter, candidate)

            result.screenshot = await page.screenshot(full_page=False)
            return result
        except PWTimeout:
            return AutoApplyResult(False, "Timed out — site may require login or has a CAPTCHA.")
        except Exception as e:
            return AutoApplyResult(False, f"Auto-apply failed: {e}")
        finally:
            await browser.close()


async def _apply_linkedin(page, url, cv_path, cover_letter, candidate) -> AutoApplyResult:
    await page.goto(url, wait_until="networkidle", timeout=20000)

    easy_apply = page.locator("button:has-text('Easy Apply'), .jobs-apply-button")
    if not await easy_apply.count():
        return AutoApplyResult(False, "No Easy Apply button — job requires LinkedIn login or manual apply.")

    await easy_apply.first.click()
    await page.wait_for_timeout(2000)

    phone_field = page.locator("input[id*='phone'], input[name*='phone']")
    if await phone_field.count():
        await phone_field.first.fill(candidate.get("phone", ""))

    if cv_path:
        cv_upload = page.locator("input[type='file']")
        if await cv_upload.count():
            await cv_upload.first.set_input_files(cv_path)
            await page.wait_for_timeout(1500)

    for _ in range(5):
        next_btn = page.locator("button:has-text('Next'), button:has-text('Continue'), button:has-text('Review')")
        if await next_btn.count():
            await next_btn.first.click()
            await page.wait_for_timeout(1500)
        else:
            break

    submit_btn = page.locator("button:has-text('Submit application'), button:has-text('Submit')")
    if await submit_btn.count():
        await submit_btn.first.click()
        await page.wait_for_timeout(2000)
        return AutoApplyResult(True, "Applied via LinkedIn Easy Apply")
    return AutoApplyResult(False, "Could not find Submit — multi-step form or CAPTCHA.")


async def _apply_wuzzuf(page, url, cv_path, cover_letter, candidate) -> AutoApplyResult:
    await page.goto(url, wait_until="networkidle", timeout=20000)

    # Click apply button
    apply_btn = page.locator("a:has-text('Apply Now'), button:has-text('Apply'), a:has-text('Apply')")
    if await apply_btn.count():
        await apply_btn.first.click()
        await page.wait_for_timeout(2000)

    # Fill fields
    fields = {
        "input[name='name'], input[placeholder*='name']": candidate.get("name", ""),
        "input[type='email'], input[name*='email']": candidate.get("email", ""),
        "input[type='tel'], input[name*='phone']": candidate.get("phone", ""),
    }
    for selector, value in fields.items():
        try:
            f = page.locator(selector)
            if await f.count() and value:
                await f.first.fill(value)
        except Exception:
            pass

    if cover_letter:
        cl = page.locator("textarea[name*='cover'], textarea[placeholder*='cover'], textarea[name*='message']")
        if await cl.count():
            await cl.first.fill(cover_letter)

    if cv_path:
        upload = page.locator("input[type='file']")
        if await upload.count():
            await upload.first.set_input_files(cv_path)
            await page.wait_for_timeout(1500)

    submit = page.locator("button[type='submit'], input[type='submit'], button:has-text('Send'), button:has-text('Submit')")
    if await submit.count():
        await submit.first.click()
        await page.wait_for_timeout(2000)
        return AutoApplyResult(True, "Applied via Wuzzuf")
    return AutoApplyResult(False, "Could not submit — Wuzzuf may require login.")


async def _apply_generic(page, url, cv_path, cover_letter, candidate) -> AutoApplyResult:
    await page.goto(url, wait_until="networkidle", timeout=20000)

    fields = [
        ("input[name*='first'], input[placeholder*='First name']", candidate.get("first_name", "")),
        ("input[name*='last'], input[placeholder*='Last name']", candidate.get("last_name", "")),
        ("input[type='email'], input[name*='email']", candidate.get("email", "")),
        ("input[type='tel'], input[name*='phone']", candidate.get("phone", "")),
    ]
    filled = 0
    for selector, value in fields:
        try:
            f = page.locator(selector)
            if await f.count() and value:
                await f.first.fill(value)
                filled += 1
        except Exception:
            pass

    if cv_path:
        upload = page.locator("input[type='file']")
        if await upload.count():
            await upload.first.set_input_files(cv_path)

    if filled == 0:
        return AutoApplyResult(False, "Could not identify form fields. Manual application required.")

    return AutoApplyResult(False, f"Filled {filled} fields — review and submit manually.")
