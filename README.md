# Basket Math

A private browser calculator for comparing grocery pack sizes and promotions for the amount you need. [Open Basket Math](https://coolcode.ca/basketmath/).

<!-- coolcode:guide -->
Compare two sizes of the same product using your own shelf prices. Basket Math calculates whole packs, checkout cost, unit price and extra quantity, including complete-bundle offers, qualifying per-pack prices and buy-X-get-Y-free deals. Lowest unit price can require a larger purchase. Enter coupon and tax assumptions explicitly; save or export only when you choose. The starting prices are invented examples, not live store prices.
You can also transcribe actual receipts into a private dated price/package ledger, compare compatible unit prices over time, and export/import the same history in Basket Math or Label Compare. History is saved only on request.
<!-- /coolcode:guide -->

## Use it

1. Enter how much you need, such as 1 kg, 3 L or 12 items. Weight, volume and item counts remain separate; no density is invented.
2. Add any number of alternatives (up to 100 per comparison), with their regular retail-pack price. For a six-pack of 355 mL cans, enter **6 inner units**, **355 content**, **mL**. The entered price is for the entire six-pack.
3. Select a promotion and enter its terms, if any. Add an eligible coupon if it can be combined with that offer.
4. Compare checkout cost, unit price and extra quantity. The same comparison can have different winners for lowest cash outlay and lowest unit price.
5. Save locally or export a JSON file to return to the comparison. Saving is explicit, not automatic. Importing a file does not overwrite the saved browser copy until you select Save.

The initial example is a fictional 500 g bag at $3.49 versus a 750 g bag at $4.49, with a two-for-$8 offer. For a 1 kg target, the smaller bags cost less at checkout; the larger bags cost less per 100 g but require buying 1.5 kg. Replace every example price with your own.

## Exact rules and limitations

- **Regular price:** each retail pack costs the entered price.
- **X packs for a total:** every complete group gets the entered total; remaining packs use the regular price. This is not the same rule as a discounted per-pack price that requires a minimum purchase.
- **Each when buying X or more:** every pack gets the qualifying per-pack price once the total pack count reaches the threshold.
- **Buy X, get Y free:** each complete group has X paid and Y free packs. Incomplete groups charge for up to X packs. All packs must be the same size and regular price. Mixed products, cheapest-item-free deals and store-specific discount allocation are not supported.
- **Extra packs:** an enabled option tries the next complete bundle or qualifying threshold when it lowers the checkout total. An independent option includes additional BOGO free packs at the same total (enabled initially). The result labels what to take, free packs and surplus. Turning it off shows the available free extras without including them in unit-price ranking.
- **Per-pack coupon:** applies to each paid pack, excluding free BOGO packs. A coupon cannot exceed that pack's price. Complete bundles cap their combined coupons at the bundle total; leftover packs are capped independently, so unused coupon value does not transfer. A qualifying per-pack promotion caps coupons at that qualifying price.
- **Purchase coupon:** applied once to this alternative's purchase, up to the promotion subtotal. The app does not infer minimum spend, store limits, membership requirements or whether stacking is permitted. It does not compare mixed baskets from multiple stores.
- **Tax:** you enter one rate and choose a basis before or after coupons. It is rounded half-up once on the alternative's total. This is an estimate, not a determination of taxable products or legally payable tax. Actual receipts can differ through tax allocation, store rounding, deposits, fees and coupon treatment. The default is 0%; no province is assumed.
- **Money:** exact integer cents and rational arithmetic avoid binary floating-point drift. Prices and dollar coupons allow at most two decimals. Tax rates allow three decimals. Quantities allow six decimals. Counts must be positive whole numbers. Need and package quantities must be positive; a zero price is allowed.
- **Units:** kg/g and mL/L conversions are exact. Weight ounces and pounds use exact avoirdupois definitions. `oz` means weight, never fluid ounces. Item counts cannot be fractional. Unit prices include the selected coupon and tax assumptions, divided by the total purchased quantity; they display to four decimal places and compare using the unrounded values.
- **Limits:** at most 1,000,000 retail packs in a calculation; at most 1,000 packs per entered promotion count; imported JSON limited to 500 KiB. These are practical processing limits, not limits derived from the starter examples.
- **Extra is not automatically waste:** consider shelf life, freezer space and how much you will really use. No unsupported freshness or quality comparison is inferred from a price.

All amounts use one currency consistently. The dollar symbol is a display convention; there is no exchange-rate conversion. Each option compares an alternative purchase sufficient for the target, not a combined cart containing every option.

## Privacy

The calculator makes no price lookup or upload. Inputs stay in page memory unless you select **Save on this device** or export a file. Local storage is namespaced as `coolcode:basketmath:comparison`. **Load saved** is explicit; page load does not automatically open private saved inputs. **Forget saved** removes the saved copy without clearing the current page. Browser storage can be cleared by the browser, so export a file for a portable backup.

The standard CoolCode page counter can record the public tool ID; it does not receive prices, names, quantities, promotions or uploaded files. The issue-report link also contains only the tool ID. There are no third-party fonts or calculation libraries. Labels and imported strings are rendered as text, not HTML.

## Expand or customize

Visitors can add alternatives with **Add an option**, change every price/quantity/promotion field and export/reopen comparisons. No fixed store or product list exists. JSON uses schema version `1`, `goal` for settings and `options` for rows; import validates allowed fields, count and size before replacing the current inputs. Incomplete drafts may be saved and restored, but are visibly excluded from results until valid.

For source changes, units and calculation rules are in `web/model.mjs`; input controls are in `web/app.mjs`, layout in `web/index.html` and styling in `web/style.css`. Add an exact rational unit factor and keep its dimension (`mass`, `volume`, `count`) accurate. Add arithmetic regression cases for any new promotion type, including partial groups, coupons and thresholds. Do not silently change saved version-1 semantics; introduce a new schema/migration when needed. Tests include an additional option beyond the two demonstration rows.

## Build and publish

No runtime dependencies or data/API registrations are required. This is a local-input tool, so there is **no scheduled collector**, freshness probe or inactivity guard. The central operations registry should explicitly record an empty workflow list; no independent watchdog target is appropriate.

```sh
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -v
python3 scripts/build.py
python3 -m http.server 8000 --directory dist
```

Open `http://127.0.0.1:8000/`. The offline builder validates metadata and the guide excerpt, emits canonical/Open Graph/WebApplication metadata, and publishes only `web/`. It does not copy tests, configuration secrets or the repository into the site. `dist/` is generated and ignored.

Browser verification (test dependency only):

```sh
python3 -m pip install -r tests/browser-requirements.txt
CHROMIUM_PATH=/path/to/chromium python3 tests/browser_smoke.py
```

GitHub Actions uses Ubuntu 24.04's Google Chrome, checks arithmetic/build/browser flows for pushes and PRs, and publishes successful `main` builds to GitHub Pages. PRs do not deploy. `workflow_dispatch` permits a manual rebuild, but does not claim to update source prices.

Follow the central [tool lifecycle](https://github.com/jsdyer/jsdyer.github.io/blob/main/docs/tool-lifecycle.md) for catalogue/README, repository accounting, generated Worker IDs, schedule inventory and sitemap. The generated Worker registration is independent of whether this app has a public collector. Shared issue reports and visitor counts need its ID registered in the deployed Worker.

MIT licensed. Part of [CoolCode](https://coolcode.ca/).

## Receipt-backed price and package history

Use the new history form to transcribe actual purchase records: comparison group, optional barcode, date, store, package quantity, purchased pack count, total paid, tax basis and optional evidence/promotion reference. Confirm the entry came from an actual receipt. No receipt images or personal payment data are uploaded. The tool normalizes compatible mass/volume/count units and compares the earliest/latest observations within the same group and tax basis. Smaller packages are labelled as recorded observations, not proof of a manufacturer-wide change; flavours, formats, stores and promotions can differ. Zero-price records do not produce misleading percentage increases.

History is retained only on explicit Save, using `coolcode:basketmath:receipt-history:v1`. Load, remove, clear, export and import are separate actions; removal from the current session does not overwrite stored history until saved. The JSON schema `coolcode-receipt-history-v1` is interoperable between Basket Math and Label Compare, validates up to 5,000 records and merges by record ID. This local history requires no API, key, schedule or Worker change.

## Ready-to-use example

[Is Buy Two, Get One Free the Better Grocery Deal?](https://coolcode.ca/basketmath/buy-two-get-one-free.html) opens this scenario in the same tool. Compare a 500 g pack for $3.90 with a 400 g pack for $3 on a buy-two-get-one-free offer. The example calls for 1.2 kg. Check both the amount paid at checkout and the amount left over, then change the prices on the shelf.
