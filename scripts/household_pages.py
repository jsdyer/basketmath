"""Generate private cost-per-use tools and readable examples for visitors with scripts disabled."""
from html import escape
import json

from search_metadata import add_search_metadata

UNIT_NAMES = {"g": "g", "kg": "kg", "oz": "oz (weight)", "lb": "lb", "mL": "mL", "L": "L", "each": "pieces"}

def option_card(number, row, case):
    units = "".join(
        f'<option value="{unit}"{" selected" if unit == row["unit"] else ""}>{UNIT_NAMES[unit]}</option>'
        for unit in case["units"])
    dose_unit = {"mL":"mL", "L":"mL", "each":"pieces"}.get(row["unit"], "g")
    def field(key, label):
        return (f'<label>{label}<input name="{key}" value="{escape(row[key], quote=True)}" '
                'maxlength="24" inputmode="decimal" autocomplete="off"></label>')
    return (f'<fieldset class="panel"><legend>Option {number} · {escape(row["name"])}</legend>'
            '<div class="use-fields">'+field("price", escape(case["price_label"]))+field("size","Package size")
            +f'<label>Package unit<select name="unit">{units}</select></label>'
            +field("dose",f'Amount used (<span data-dose-unit>{dose_unit} per {case["use"]}</span>)')
            +'</div><output aria-live="polite"></output></fieldset>')

def write_household_pages(stage, tool, reporting):
    cases = json.loads((stage / "household-examples.json").read_text())
    for case in cases:
        title, desc = escape(case["title"]), escape(case["description"])
        use, target = case["use"], case["target"]
        cards = "".join(option_card(i, row, case) for i, row in enumerate(case["options"], 1))
        related = "".join(f'<a href="./{other["slug"]}.html">{escape(other["title"])}</a>'
                          for other in cases if other != case)
        case_tool = {**tool, "title": case["title"], "description": case["description"],
                     "url": tool["url"] + case["slug"] + ".html"}
        issue = reporting.get("{{ISSUE_LINK}}", "")
        counter = reporting.get("{{VISIT_COUNTER}}", "")
        page = f'''<!doctype html><html lang="en-CA"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>{title} · Basket Math</title>
<meta name="description" content="{desc}"><link rel="stylesheet" href="./style.css"></head>
<body data-tool="{escape(tool["id"])}"><header><a class="brand" href="./">Basket Math</a>
<a href="https://coolcode.ca/">CoolCode.ca</a></header><main class="use-page">
<h1>{title}</h1><p class="lead">{desc}</p>
<form id="use-comparison" data-use="{use}" hidden>
<label class="use-target">How many {use}s?<input name="target" value="{target}" inputmode="numeric" maxlength="7"></label>
<p>{escape(case["dose_hint"])}</p><p class="hint">Edit the example prices and sizes. Your figures stay in this tab. Enter comparable prices including any taxes you want to count.</p>
<div class="use-options">{cards}</div><button type="reset">Reset example</button></form>
<section class="panel"><h2>Worked example with invented prices</h2><p>{escape(case["example"])}</p>
<noscript><p>Enable JavaScript to change the example.</p></noscript></section>
<nav aria-label="Related calculators" class="task-links"><a href="./">Compare grocery offers and multipacks</a>{related}</nav></main>
<footer><nav><a href="https://coolcode.ca/">CoolCode.ca</a>{issue}</nav></footer>
<script type="module" src="./household.mjs"></script>{counter}</body></html>'''
        (stage / (case["slug"] + ".html")).write_text(add_search_metadata(page, case_tool), encoding="utf-8")
    return ''.join(f'<a href="./{case["slug"]}.html">{escape(case["title"])}</a>' for case in cases)
