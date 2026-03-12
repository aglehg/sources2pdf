## Future ideas

- add safe bounded concurrency
- optional `--debug-html` output for extraction debugging
- optional multi-article merge mode



## Development

Quick syntax check:

```bash
node --check cli.js
node --check src/readUrls.js
node --check src/extractArticle.js
node --check src/renderTemplate.js
node --check src/savePdf.js
```