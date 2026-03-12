# sources2pdf

Convert web articles into clean, paper-friendly PDFs for e-ink reading devices (for example, reMarkable).

`sources2pdf` takes a text file with one URL per line, extracts the main article content with Mozilla Readability, renders a minimal print template, and exports one PDF per article.

## Why this exists

!!I want to go read in the sun, with my e-reader!!
Most webpages print poorly: navigation, ads, sidebars, comment blocks, and visual clutter make long-form reading unpleasant on e-ink devices.

This tool focuses on a simple local pipeline:
- render the page in a real browser
- extract the article body
- re-render into a clean layout
- export an A4-style PDF

## Features

- CLI input: `-i` links file, `-o` output folder
- Handles blank lines and invalid URLs
- Uses Playwright for JS-heavy sites
- Uses `@mozilla/readability` + `jsdom` for main-content extraction
- Generates safe PDF filenames from page title
- Avoids filename collisions (`-2`, `-3`, ...)
- Continues when one URL fails
- Prints per-URL status and final summary
- Runs Playwright with visible UI by default (`headless: false`)

## Requirements

- Node.js 18+ (recommended)
- macOS/Linux/Windows

## Installation

```bash
npm install
npx playwright install chromium
```

Optional: install as a local command in your shell:

```bash
npm link
```

Then you can run `sources2pdf` directly.

## Usage

### 1. Create an input file

Create `links.txt` with one URL per line:

```txt
https://example.com/article-1
https://example.com/article-2
```

Blank lines are ignored.

### 2. Run the CLI

Using Node directly:

```bash
node cli.js -i links.txt -o ./pdfs
```

Or (after `npm link`):

```bash
sources2pdf -i links.txt -o ./pdfs
```

## CLI options

- `-i, --input <path>`: path to text file with one URL per line
- `-o, --output <path>`: output folder for generated PDFs

Both are required.

## Output behavior

For each URL, the tool:
1. opens the source page in Playwright
2. waits for render/network idle (best-effort)
3. extracts article metadata and body with Readability
4. injects content into a minimal print template
5. exports one PDF into the output folder

Terminal output is concise, e.g.:

```text
[OK] (1/3) https://site.com/post -> article-title.pdf
[FAIL] (2/3) https://site.com/bad -> Readability extraction failed
[OK] (3/3) https://site.com/another -> another-title.pdf

Done. total=3 success=2 failed=1
```

## Filename rules

- Primary source: browser page title
- Fallbacks: Readability title, then `hostname-index`
- Name is sanitized to filesystem-safe kebab-case
- If file exists, suffix is appended: `name-2.pdf`, `name-3.pdf`, ...

## Notes and limitations

- Some pages block automation or require authentication/paywalls.
- Readability may fail on non-article pages.
- Embedded interactive media may not translate well to print.
- Current implementation processes URLs sequentially for stability.


## License

Apache-2.0
