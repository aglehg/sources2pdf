const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const META_DATE_RULES = [
  { selector: 'meta[property="article:published_time"]', kind: 'published' },
  { selector: 'meta[property="og:published_time"]', kind: 'published' },
  { selector: 'meta[name="article:published_time"]', kind: 'published' },
  { selector: 'meta[name="pubdate"]', kind: 'published' },
  { selector: 'meta[name="publish-date"]', kind: 'published' },
  { selector: 'meta[name="date"]', kind: 'published' },
  { selector: 'meta[name="dc.date"]', kind: 'published' },
  { selector: 'meta[name="dcterms.created"]', kind: 'published' },
  { selector: 'meta[name="parsely-pub-date"]', kind: 'published' },
  { selector: 'meta[itemprop="datePublished"]', kind: 'published' },
  { selector: 'meta[property="article:modified_time"]', kind: 'updated' },
  { selector: 'meta[property="og:updated_time"]', kind: 'updated' },
  { selector: 'meta[name="article:modified_time"]', kind: 'updated' },
  { selector: 'meta[name="lastmod"]', kind: 'updated' },
  { selector: 'meta[name="last-modified"]', kind: 'updated' },
  { selector: 'meta[name="dcterms.modified"]', kind: 'updated' },
  { selector: 'meta[itemprop="dateModified"]', kind: 'updated' }
];

function normalizeText(value) {
  if (!value || typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized || null;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function parseJsonLdObjects(doc) {
  const objects = [];
  const ldJsonNodes = doc.querySelectorAll('script[type="application/ld+json"]');

  for (const node of ldJsonNodes) {
    const raw = normalizeText(node.textContent);
    if (!raw) continue;

    try {
      const data = JSON.parse(raw);
      const queue = Array.isArray(data) ? [...data] : [data];
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current || typeof current !== 'object') continue;
        objects.push(current);

        for (const value of Object.values(current)) {
          if (Array.isArray(value)) queue.push(...value);
          else if (value && typeof value === 'object') queue.push(value);
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return objects;
}

function isWhitelistedDateContext(node) {
  if (!node || !node.closest) return false;
  return Boolean(
    node.closest(
      'article, main, [role="main"], header, [itemprop="articleBody"], [class*="article"], [class*="post"], [data-component-name*="blog"]'
    )
  );
}

function inferDateKind(text) {
  const normalized = normalizeText(text);
  if (!normalized) return null;
  if (/\b(last\s*updated|updated|modified|revised)\b/i.test(normalized)) return 'updated';
  if (/\b(published|posted|originally published)\b/i.test(normalized)) return 'published';
  return null;
}

function pushDateCandidate(candidates, candidate) {
  const rawValue = normalizeText(candidate.rawValue);
  const valueIso = normalizeDate(rawValue);
  if (!rawValue || !valueIso) return;

  candidates.push({
    kind: candidate.kind,
    source: candidate.source,
    rawValue,
    valueIso
  });
}

function extractDateCandidates(doc) {
  const candidates = [];

  for (const rule of META_DATE_RULES) {
    const value = normalizeText(doc.querySelector(rule.selector)?.getAttribute('content'));
    if (!value) continue;
    pushDateCandidate(candidates, { kind: rule.kind, source: `meta:${rule.selector}`, rawValue: value });
  }

  const jsonLdObjects = parseJsonLdObjects(doc);
  for (const current of jsonLdObjects) {
    if (typeof current.datePublished === 'string') {
      pushDateCandidate(candidates, { kind: 'published', source: 'jsonld:datePublished', rawValue: current.datePublished });
    }
    if (typeof current.dateModified === 'string') {
      pushDateCandidate(candidates, { kind: 'updated', source: 'jsonld:dateModified', rawValue: current.dateModified });
    }
  }

  const datetimeNodes = doc.querySelectorAll('time[datetime], [itemprop="datePublished"][datetime], [itemprop="dateModified"][datetime]');
  for (const node of datetimeNodes) {
    if (!isWhitelistedDateContext(node)) continue;

    const itemprop = normalizeText(node.getAttribute('itemprop'));
    const contextText = normalizeText(node.parentElement?.textContent);
    const kind =
      itemprop === 'dateModified'
        ? 'updated'
        : itemprop === 'datePublished'
          ? 'published'
          : inferDateKind(contextText);

    if (!kind) continue;
    pushDateCandidate(candidates, { kind, source: 'time-datetime', rawValue: node.getAttribute('datetime') });
  }

  const labeledTimeNodes = doc.querySelectorAll('time, [itemprop="datePublished"], [itemprop="dateModified"]');
  for (const node of labeledTimeNodes) {
    if (!isWhitelistedDateContext(node)) continue;

    const itemprop = normalizeText(node.getAttribute('itemprop'));
    const contextText = normalizeText(node.parentElement?.textContent);
    const kind =
      itemprop === 'dateModified'
        ? 'updated'
        : itemprop === 'datePublished'
          ? 'published'
          : inferDateKind(contextText);

    if (!kind) continue;
    const rawValue = normalizeText(node.getAttribute('datetime')) || normalizeText(node.textContent);
    pushDateCandidate(candidates, { kind, source: 'labeled-time', rawValue });
  }

  const deduped = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const key = `${candidate.kind}|${candidate.source}|${candidate.valueIso}|${candidate.rawValue}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
}

function selectArticleDate(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const kindWeight = { updated: 2, published: 1 };
  const ranked = [...candidates].sort((a, b) => {
    if (a.valueIso !== b.valueIso) return b.valueIso.localeCompare(a.valueIso);
    return (kindWeight[b.kind] || 0) - (kindWeight[a.kind] || 0);
  });
  return ranked[0] || null;
}

function extractAuthor(doc) {
  const metaSelectors = [
    'meta[name="author"]',
    'meta[property="author"]',
    'meta[property="article:author"]',
    'meta[name="parsely-author"]',
    'meta[name="dc.creator"]',
    'meta[itemprop="author"]'
  ];

  for (const selector of metaSelectors) {
    const value = normalizeText(doc.querySelector(selector)?.getAttribute('content'));
    if (value) return value;
  }

  const jsonLdObjects = parseJsonLdObjects(doc);
  for (const current of jsonLdObjects) {
    const author = current.author;
    if (typeof author === 'string') {
      const authorName = normalizeText(author);
      if (authorName) return authorName;
    }

    if (author && typeof author === 'object') {
      const authorName = normalizeText(author.name);
      if (authorName) return authorName;
    }
  }

  return null;
}

function extractArticleDataFromHtml(html, { url, pageTitle, fallbackTitle } = {}) {
  const resolvedUrl = url || 'https://example.com';
  const document = new JSDOM(html, { url: resolvedUrl }).window.document;

  const docTitle = normalizeText(document.querySelector('title')?.textContent);
  const metaSource =
    normalizeText(document.querySelector('meta[property="og:site_name"]')?.getAttribute('content')) ||
    normalizeText(document.querySelector('meta[name="application-name"]')?.getAttribute('content'));
  const fallbackAuthor = extractAuthor(document);
  const dateCandidates = extractDateCandidates(document);
  const selectedDate = selectArticleDate(dateCandidates);

  const parsed = new Readability(document).parse();

  const readabilityTitle = normalizeText(parsed?.title);
  const title = readabilityTitle || normalizeText(pageTitle) || docTitle || normalizeText(fallbackTitle) || 'Untitled article';

  const byline = normalizeText(parsed?.byline) || fallbackAuthor;
  const source = normalizeText(parsed?.siteName) || metaSource || new URL(resolvedUrl).hostname;
  const articleDate = selectedDate?.valueIso || null;

  return {
    title,
    byline,
    author: byline,
    source,
    siteName: source,
    articleDate,
    contentHtml: parsed?.content || null,
    excerpt: normalizeText(parsed?.excerpt),
    dateResolution: {
      selected: selectedDate,
      candidates: dateCandidates
    }
  };
}

function extractMetadataFromHtml(html, options = {}) {
  const article = extractArticleDataFromHtml(html, options);
  return {
    author: article.author,
    title: article.title,
    articleDate: article.articleDate,
    source: article.source
  };
}

module.exports = {
  extractArticleDataFromHtml,
  extractMetadataFromHtml,
  normalizeDate
};
