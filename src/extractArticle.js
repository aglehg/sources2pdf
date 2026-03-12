const { extractArticleDataFromHtml } = require('./extractMetadata');

const NAVIGATION_TIMEOUT_MS = 45000;
const RENDER_GUARD_TIMEOUT_MS = 12000;

async function waitForRenderablePage(page, timeoutMs = RENDER_GUARD_TIMEOUT_MS) {
  await page.waitForLoadState('domcontentloaded', { timeout: timeoutMs }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {});

  await page.evaluate(async ({ timeout }) => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const withTimeout = (promise, ms) =>
      Promise.race([
        promise,
        new Promise((resolve) => setTimeout(resolve, ms))
      ]);

    // Trigger common lazy-loading behavior by crossing viewport intersections.
    try {
      window.scrollTo(0, document.body.scrollHeight);
      await delay(250);
      window.scrollTo(0, 0);
    } catch {
      // Ignore scroll failures.
    }

    const fontsReady = document.fonts?.ready || Promise.resolve();
    await withTimeout(fontsReady, Math.min(timeout, 5000));

    const images = Array.from(document.images || []).filter((img) => img.currentSrc || img.src);
    if (images.length === 0) return;

    const imageWaits = images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
    });

    await withTimeout(Promise.all(imageWaits), timeout);
  }, { timeout: timeoutMs });
}

async function extractArticle(browser, url, index) {
  const loadContext = await browser.newContext();
  const page = await loadContext.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
    await waitForRenderablePage(page);

    const pageTitle = (await page.title()).trim();
    const html = await page.content();
    const finalUrl = page.url();
    const fallbackName = `${new URL(finalUrl).hostname}-${index}`;

    const article = extractArticleDataFromHtml(html, {
      url: finalUrl,
      pageTitle,
      fallbackTitle: fallbackName
    });

    if (!article.contentHtml) {
      throw new Error('Readability extraction failed');
    }

    const filenameTitle = pageTitle || article.title || fallbackName;

    return {
      title: article.title,
      filenameTitle,
      byline: article.byline,
      siteName: article.siteName,
      articleDate: article.articleDate,
      contentHtml: article.contentHtml,
      excerpt: article.excerpt,
      url: finalUrl,
      fallbackName
    };
  } finally {
    await page.close().catch(() => {});
    await loadContext.close().catch(() => {});
  }
}

module.exports = { extractArticle };
