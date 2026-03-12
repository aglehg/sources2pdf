const { extractArticleDataFromHtml } = require('./extractMetadata');

const NAVIGATION_TIMEOUT_MS = 45000;

async function extractArticle(browser, url, index) {
  const loadContext = await browser.newContext();
  const page = await loadContext.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1200);

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
