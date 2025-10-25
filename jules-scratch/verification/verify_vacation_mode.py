from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the login page
        page.goto("http://localhost:5173/auth")

        # Fill in the login form
        page.get_by_label("Email").fill("testuser@example.com")
        page.get_by_label("Password").fill("password")
        page.get_by_role("button", name="Sign In").click()

        # Wait for navigation to the board
        page.wait_for_url("http://localhost:5173/")
        page.wait_for_timeout(2000)

        # Take a screenshot of the board
        page.screenshot(path="jules-scratch/verification/vacation_mode.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)