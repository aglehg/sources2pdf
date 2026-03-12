const fs = require('node:fs/promises');
const path = require('node:path');

const PDF_RENDER_GUARD_TIMEOUT_MS = 12000;

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

async function waitForPdfRenderReady(page, timeoutMs = PDF_RENDER_GUARD_TIMEOUT_MS) {
  await page.waitForLoadState('load', { timeout: timeoutMs }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {});

  await page.evaluate(async ({ timeout }) => {
    const withTimeout = (promise, ms) =>
      Promise.race([
        promise,
        new Promise((resolve) => setTimeout(resolve, ms))
      ]);

    const fontsReady = document.fonts?.ready || Promise.resolve();
    await withTimeout(fontsReady, Math.min(timeout, 5000));

    const images = Array.from(document.images || []).filter((img) => img.currentSrc || img.src);
    if (images.length === 0) return;

    const waits = images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
    });

    await withTimeout(Promise.all(waits), timeout);
  }, { timeout: timeoutMs });
}

async function savePdf(browser, { html, outputDir, preferredName, fallbackName }) {
  const fileName = await chooseUniqueFilePath(outputDir, preferredName || fallbackName);
  const outputPath = path.join(outputDir, fileName);

  const renderContext = await browser.newContext();
  const page = await renderContext.newPage();

  try {
    await page.setContent(html, { waitUntil: 'load' });
    await waitForPdfRenderReady(page);
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
