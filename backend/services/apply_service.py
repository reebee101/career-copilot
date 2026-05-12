"""
Auto-apply service using Playwright.
Supports: LinkedIn Easy Apply, Greenhouse, Lever.
Enable in .env: AUTO_APPLY_ENABLED=true
"""
import asyncio
import json
import re
from datetime import datetime
from playwright.async_api import async_playwright, TimeoutError as PWTimeout
from config import get_settings

settings = get_settings()


class AutoApplyResult:
    def __init__(self, success: bool, message: str, screenshot: str = None):
        self.success = success
        self.message = message
        self.screenshot = screenshot  # base64 PNG for audit trail


async def detect_ats(url: str) -> str:
    """Detect which ATS the apply URL uses."""
    url_lower = url.lower()
    if "linkedin.com" in url_lower:
        return "linkedin"
    else:
        return "unknown"


async def auto_apply(
    apply_url: str,
    cv_path: str,
    cover_letter: str,
    candidate: dict,
) -> AutoApplyResult:
    """
    Attempt automated application.
    candidate = {name, email, phone, linkedin_url}
    """
    if not settings.auto_apply_enabled:
        return AutoApplyResult(False, "Auto-apply is disabled. Set AUTO_APPLY_ENABLED=true in .env to enable.")

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
            else:
                # Generic form filler
                result = await _apply_generic(page, apply_url, cv_path, cover_letter, candidate)

            screenshot = await page.screenshot(full_page=False)
            result.screenshot = screenshot
            return result

        except PWTimeout:
            return AutoApplyResult(False, f"Timed out on {ats} application page. The site may require login or CAPTCHA.")
        except Exception as e:
            return AutoApplyResult(False, f"Auto-apply failed: {str(e)}")
        finally:
            await browser.close()


async def _apply_linkedin(page, url, cv_path, cover_letter, candidate) -> AutoApplyResult:
    await page.goto(url, wait_until="networkidle", timeout=20000)

    # Check for Easy Apply button
    easy_apply = page.locator("button:has-text('Easy Apply'), .jobs-apply-button")
    if not await easy_apply.count():
        return AutoApplyResult(False, "No Easy Apply button found — this job requires LinkedIn login or manual apply.")

    await easy_apply.first.click()
    await page.wait_for_timeout(2000)

    # Fill phone if asked
    phone_field = page.locator("input[id*='phone'], input[name*='phone']")
    if await phone_field.count():
        await phone_field.first.fill(candidate.get("phone", ""))

    # Upload CV
    cv_upload = page.locator("input[type='file']")
    if await cv_upload.count() and cv_path:
        await cv_upload.first.set_input_files(cv_path)
        await page.wait_for_timeout(1500)

    # Handle multi-step — click Next up to 5 times
    for _ in range(5):
        next_btn = page.locator("button:has-text('Next'), button:has-text('Continue'), button:has-text('Review')")
        if await next_btn.count():
            await next_btn.first.click()
            await page.wait_for_timeout(1500)
        else:
            break

    # Submit
    submit_btn = page.locator("button:has-text('Submit application'), button:has-text('Submit')")
    if await submit_btn.count():
        await submit_btn.first.click()
        await page.wait_for_timeout(2000)
        return AutoApplyResult(True, "Applied via LinkedIn Easy Apply")
    else:
        return AutoApplyResult(False, "Could not find Submit button — multi-step or CAPTCHA blocking.")


async def _apply_generic(page, url, cv_path, cover_letter, candidate) -> AutoApplyResult:
    """Best-effort generic form filler for unknown ATS."""
    await page.goto(url, wait_until="networkidle", timeout=20000)

    fill_attempts = [
        ("input[name*='name'][name*='first'], input[placeholder*='First name']", candidate.get("first_name", "")),
        ("input[name*='name'][name*='last'], input[placeholder*='Last name']", candidate.get("last_name", "")),
        ("input[type='email'], input[name*='email']", candidate.get("email", "")),
        ("input[type='tel'], input[name*='phone']", candidate.get("phone", "")),
    ]

    filled = 0
    for selector, value in fill_attempts:
        try:
            f = page.locator(selector)
            if await f.count() and value:
                await f.first.fill(value)
                filled += 1
        except Exception:
            pass

    if filled == 0:
        return AutoApplyResult(False, "Could not identify form fields. Manual application required.")

    if cv_path:
        upload = page.locator("input[type='file']")
        if await upload.count():
            await upload.first.set_input_files(cv_path)

    return AutoApplyResult(False, f"Partially filled {filled} fields but could not auto-submit unknown ATS. Review and submit manually.")
