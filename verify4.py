from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 2000})

        # We need a local server. I'll use a simple file:// protocol for verification.
        import os
        file_url = f"file://{os.path.abspath('index.html')}?lang=en"

        page.goto(file_url)
        page.wait_for_timeout(2000) # Wait for JS scripts like language setup to execute

        # Take full page screenshot
        page.screenshot(path="full_page_en.png", full_page=True)

        # Test Turkish
        file_url_tr = f"file://{os.path.abspath('index.html')}?lang=tr"
        page.goto(file_url_tr)
        page.wait_for_timeout(2000)
        page.screenshot(path="full_page_tr.png", full_page=True)

        browser.close()

if __name__ == "__main__":
    verify()
