const fs = require('node:fs/promises');
const path = require('node:path');

function sanitizeFilename(input) {
  return String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 120);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function chooseUniqueFilePath(outputDir, baseName) {
  const safeBase = sanitizeFilename(baseName) || 'article';
  let candidate = `${safeBase}.pdf`;
  let counter = 2;

  while (await fileExists(path.join(outputDir, candidate))) {
    candidate = `${safeBase}-${counter}.pdf`;
    counter += 1;
  }

  return candidate;
}

async function savePdf(browser, { html, outputDir, preferredName, fallbackName }) {
  const fileName = await chooseUniqueFilePath(outputDir, preferredName || fallbackName);
  const outputPath = path.join(outputDir, fileName);

  const renderContext = await browser.newContext();
  const page = await renderContext.newPage();

  try {
    await page.setContent(html, { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '14mm',
        right: '12mm',
        bottom: '14mm',
        left: '12mm'
      }
    });

    return fileName;
  } finally {
    await page.close().catch(() => {});
    await renderContext.close().catch(() => {});
  }
}

module.exports = { savePdf, sanitizeFilename };
