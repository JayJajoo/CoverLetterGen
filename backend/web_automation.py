from playwright.async_api import async_playwright
import asyncio
import os

import os

current_file_path = os.path.abspath(__file__)          
current_dir = os.path.dirname(current_file_path)       

async def login_NUWorks():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)  
        context = await browser.new_context()
        page = await context.new_page()

        await page.goto("https://northeastern-csm.symplicity.com/students/?")
        await page.locator('input[value="Current Students and Alumni"]').click()

        await page.wait_for_selector('a[href^="/students/app/resources"]', timeout=0)
        await context.storage_state(path=f"{current_dir}/nuworks_state.json")
        await browser.close()

async def login_linkedIn():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        await page.goto("https://www.linkedin.com/login")
        await page.wait_for_selector('a[href^="https://www.linkedin.com/jobs"]', timeout=0)
        await context.storage_state(path=f"{current_dir}/linkedin_state.json")
        await browser.close()

async def scrape_NUworks(link):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(storage_state=f"{current_dir}/nuworks_state.json")
        page = await context.new_page()
        await page.goto(link)
        
        await page.wait_for_selector('a[href^="/students/app/jobs/detail"]')
        content = await page.locator('a[href^="/students/app/jobs/detail"]').all_inner_texts()

        await page.wait_for_selector('a[href^="/students/app/employers"]')
        content += await page.locator('a[href^="/students/app/employers"]').all_inner_texts()

        await page.wait_for_selector('span[class="body-small text-truncate block"]')
        content += await page.locator('span[class="body-small text-truncate block"]').all_inner_texts()

        await page.wait_for_selector('div[class="form-col no-padding"]')
        content += await page.locator('div[class="form-col no-padding"]').all_inner_texts()
        content = "\n\n".join(content)
        await browser.close()
        return content

async def scrape_linkedIn(link):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(storage_state=f"{current_dir}/linkedin_state.json")
        page = await context.new_page()
        await page.goto(link)
        jd = await page.locator("div.jobs-search__job-details--wrapper").all_inner_texts()
        await browser.close()
        return jd[0]
    
# asyncio.run(login_NUWorks())