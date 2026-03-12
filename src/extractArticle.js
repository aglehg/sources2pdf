const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const NAVIGATION_TIMEOUT_MS = 45000;

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

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
    const document = new JSDOM(html, { url: finalUrl }).window.document;

    const readability = new Readability(document);
    const parsed = readability.parse();

    if (!parsed || !parsed.content) {
      throw new Error('Readability extraction failed');
    }

    const doc = document;
    const metadataPublished =
      doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
      doc.querySelector('meta[name="pubdate"]')?.getAttribute('content') ||
      doc.querySelector('meta[name="publish-date"]')?.getAttribute('content') ||
      doc.querySelector('time')?.getAttribute('datetime') ||
      null;

    const siteName =
      parsed.siteName ||
      doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
      new URL(finalUrl).hostname;

    const readabilityTitle = (parsed.title || '').trim();
    const fallbackName = `${new URL(finalUrl).hostname}-${index}`;
    const title = readabilityTitle || pageTitle || fallbackName;
    const filenameTitle = pageTitle || readabilityTitle || fallbackName;

    return {
      title,
      filenameTitle,
      byline: parsed.byline || null,
      siteName,
      publishedDate: normalizeDate(metadataPublished),
      contentHtml: parsed.content,
      excerpt: parsed.excerpt || null,
      url: finalUrl,
      fallbackName
    };
  } finally {
    await page.close().catch(() => {});
    await loadContext.close().catch(() => {});
  }
}

module.exports = { extractArticle };
