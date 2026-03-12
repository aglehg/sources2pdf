function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPrintableHtml(article) {
  const title = escapeHtml(article.title || 'Untitled article');
  const byline = article.byline ? `<p class="meta-line"><strong>By:</strong> ${escapeHtml(article.byline)}</p>` : '';
  const articleDate = article.articleDate
    ? `<p class="meta-line"><strong>Date:</strong> ${escapeHtml(article.articleDate)}</p>`
    : '';
  const excerpt = article.excerpt ? `<p class="excerpt">${escapeHtml(article.excerpt)}</p>` : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      @page {
        size: A4;
        margin: 20mm 16mm 20mm 16mm;
      }

      html, body {
        padding: 0;
        margin: 0;
        color: #111;
        background: #fff;
        font-family: Georgia, "Times New Roman", serif;
        line-height: 1.55;
        font-size: 12pt;
      }

      main {
        max-width: 760px;
        margin: 0 auto;
      }

      h1, h2, h3, h4 {
        page-break-after: avoid;
        break-after: avoid-page;
        line-height: 1.25;
        margin-top: 1.2em;
        margin-bottom: 0.45em;
      }

      h1 {
        font-size: 1.9em;
        margin-top: 0;
      }

      p, ul, ol {
        orphans: 3;
        widows: 3;
      }

      .article-meta {
        border-top: 1px solid #aaa;
        border-bottom: 1px solid #aaa;
        padding: 0.7em 0;
        margin: 1em 0 1.5em;
        font-size: 0.92em;
      }

      .meta-line {
        margin: 0.2em 0;
      }

      .excerpt {
        font-style: italic;
        margin: 0.8em 0 0;
      }

      a {
        color: #111;
        text-decoration: underline;
        word-break: break-word;
      }

      blockquote {
        border-left: 3px solid #777;
        margin: 1em 0;
        padding: 0.2em 0 0.2em 1em;
        color: #222;
      }

      img, figure {
        max-width: 100%;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      pre, code {
        white-space: pre-wrap;
        word-break: break-word;
      }

      nav, aside, footer, .ad, .advertisement, .comments, .related, .share {
        display: none !important;
      }
    </style>
  </head>
  <body>
    <main>
      <article>
        <header>
          <h1>${title}</h1>
          <section class="article-meta">
            ${byline}
            <p class="meta-line"><strong>Source:</strong> ${escapeHtml(article.siteName || '')}</p>
            <p class="meta-line"><strong>URL:</strong> <a href="${escapeHtml(article.url)}">${escapeHtml(article.url)}</a></p>
            ${articleDate}
            ${excerpt}
          </section>
        </header>
        <section>
          ${article.contentHtml}
        </section>
      </article>
    </main>
  </body>
</html>`;
}

module.exports = { buildPrintableHtml };
