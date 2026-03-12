#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');
const { program } = require('commander');
const { chromium } = require('playwright');
const { readUrls } = require('./src/readUrls');
const { extractArticle } = require('./src/extractArticle');
const { buildPrintableHtml } = require('./src/renderTemplate');
const { savePdf } = require('./src/savePdf');

program
  .requiredOption('-i, --input <path>', 'Path to text file with one URL per line')
  .requiredOption('-o, --output <path>', 'Path to output folder for PDFs')
  .parse(process.argv);

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function main() {
  const options = program.opts();
  const inputPath = path.resolve(process.cwd(), options.input);
  const outputDir = path.resolve(process.cwd(), options.output);

  await ensureDir(outputDir);

  const urls = await readUrls(inputPath);
  if (urls.length === 0) {
    console.error('No URLs found in input file.');
    process.exitCode = 1;
    return;
  }

  const browser = await chromium.launch({ headless: false });
  let success = 0;
  let failed = 0;

  try {
    for (let i = 0; i < urls.length; i += 1) {
      const url = urls[i];
      const ordinal = i + 1;

      try {
        const article = await extractArticle(browser, url, ordinal);
        const html = buildPrintableHtml(article);
        const filename = await savePdf(browser, {
          html,
          outputDir,
          preferredName: article.filenameTitle,
          fallbackName: article.fallbackName
        });

        success += 1;
        console.log(`[OK] (${ordinal}/${urls.length}) ${url} -> ${filename}`);
      } catch (error) {
        failed += 1;
        console.log(`[FAIL] (${ordinal}/${urls.length}) ${url} -> ${error.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\nDone. total=${urls.length} success=${success} failed=${failed}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
