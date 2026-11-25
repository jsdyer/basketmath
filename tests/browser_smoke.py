"""Check real purchase calculations, private save/import and mobile UI at a project path."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import shutil
import tempfile
import threading
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

def main():
    screenshots = ROOT / 'browser-checks'
    screenshots.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as temporary:
        shutil.copytree(ROOT / 'dist', Path(temporary) / 'basketmath')
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=temporary))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            with sync_playwright() as p:
                executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
                browser = p.chromium.launch(executable_path=executable) if executable else p.chromium.launch()
                page = browser.new_page(viewport={'width':1280,'height':1000})
                errors, requests = [], []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('request', lambda request: requests.append(request.url))
                page.goto(f'http://127.0.0.1:{server.server_port}/basketmath/')
                assert page.locator('[data-result="0"] .total').inner_text().startswith('$6.98')
                assert page.locator('[data-result="1"] .total').inner_text().startswith('$8.00')
                assert 'Lowest checkout' in page.locator('[data-result="0"]').inner_text()
                assert 'Lowest unit price' in page.locator('[data-result="1"]').inner_text()
                assert page.evaluate('localStorage.length') == 0
                first=page.locator('[data-option="0"]')
                first.locator('[data-field="price"]').fill('')
                assert page.locator('[data-result="0"]').count()==0
                assert '1 of 2' in page.locator('#result-count').inner_text()
                first.locator('[data-field="price"]').fill('3.49')
                page.locator('#need-unit').select_option('L')
                assert page.locator('[data-result]').count()==0
                page.locator('#need-unit').select_option('kg')
                page.locator('#add').click()
                third=page.locator('[data-option="2"]')
                third.locator('[data-field="name"]').fill('<img src=x onerror=alert(1)>')
                third.locator('[data-field="price"]').fill('3.00')
                third.locator('[data-field="quantity"]').fill('1')
                third.locator('[data-field="deal"]').select_option('bogo')
                result=page.locator('[data-result="2"]')
                assert result.locator('.total').inner_text().startswith('$3.00')
                assert '1 paid + 1 free' in result.inner_text()
                assert page.locator('img').count()==0
                page.locator('#take-free').uncheck()
                assert 'more free pack' in result.inner_text()
                page.locator('#save').click()
                assert 'Saved on this device' in page.locator('#storage-status').inner_text()
                page.locator('#sample').click()
                assert page.locator('[data-option]').count()==2
                page.locator('#load').click()
                assert page.locator('[data-option]').count()==3
                assert page.locator('[data-option="2"] [data-field="name"]').input_value().startswith('<img')
                with page.expect_download() as download_info:
                    page.locator('#export').click()
                exported=json.loads(Path(download_info.value.path()).read_text())
                assert len(exported['options'])==3
                page.locator('#import').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{}'})
                expect(page.locator('#storage-status')).to_contain_text('Import failed')
                assert page.locator('[data-option]').count()==3
                page.locator('#blank').click()
                page.locator('#import').set_input_files({'name':'comparison.json','mimeType':'application/json','buffer':json.dumps(exported).encode()})
                expect(page.locator('#storage-status')).to_contain_text('Imported 3 options.')
                expect(page.locator('[data-option]')).to_have_count(3)
                page.locator('#forget').click()
                assert page.evaluate('localStorage.length')==0
                page.locator('#sample').click()
                page.screenshot(path=str(screenshots/'desktop.png'),full_page=True)
                page.set_viewport_size({'width':390,'height':844})
                assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
                assert page.locator('[data-result="0"] .total').inner_text().startswith('$6.98')
                page.screenshot(path=str(screenshots/'mobile.png'),full_page=True)
                assert not errors, errors
                assert all(url.startswith(f'http://127.0.0.1:{server.server_port}/') or url.startswith('blob:') for url in requests), requests
                browser.close()
            print('Browser checks passed: exact totals, promotions, stale-result removal, safe labels, private save/import/export, extra options and mobile layout')
        finally: server.shutdown()

if __name__ == '__main__': main()
