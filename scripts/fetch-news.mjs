#!/usr/bin/env node
// Fetches the firm's curated RSS feeds and writes data/news.json for the
// site's "Notícias" section. Zero runtime dependencies — uses the global
// fetch available in Node 18+ and a small regex-based RSS/Atom parser.
//
// Usage: node scripts/fetch-news.mjs
// Runs on a schedule via .github/workflows/update-news.yml

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'news.json');

const SOURCES = [
  { id: 'contabeis', name: 'Contábeis', feedUrl: 'https://www.contabeis.com.br/rss/' },
  { id: 'valor', name: 'Valor Econômico', feedUrl: 'https://pox.globo.com/rss/valor' },
  {
    id: 'bcb',
    name: 'Banco Central do Brasil',
    feedUrl: 'https://www.bcb.gov.br/api/feed/sitebcb/sitefeeds/noticias?ano=2024',
  },
];

const ITEMS_PER_SOURCE = 8;
const REQUEST_TIMEOUT_MS = 15000;

function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, '')
    .trim();
}

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = block.match(re);
  return match ? decodeEntities(match[1]) : '';
}

function extractLink(block) {
  // RSS: <link>https://...</link>  |  Atom: <link href="https://..."/>
  const rssLink = block.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i);
  if (rssLink && rssLink[1].trim()) return decodeEntities(rssLink[1]);
  const atomLink = block.match(/<link[^>]*\shref=["']([^"']+)["'][^>]*\/?>/i);
  if (atomLink) return atomLink[1];
  return '';
}

function extractDate(block) {
  const pubDate = extractTag(block, 'pubDate');
  if (pubDate) return normalizeDate(pubDate);
  const updated = extractTag(block, 'updated') || extractTag(block, 'published') || extractTag(block, 'dc:date');
  if (updated) return normalizeDate(updated);
  return null;
}

function normalizeDate(raw) {
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function summarize(text, maxLen = 180) {
  const clean = decodeEntities(text || '');
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
}

function parseFeed(xml) {
  const blocks = [];
  const itemRe = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi;
  const entryRe = /<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi;
  let m;
  while ((m = itemRe.exec(xml))) blocks.push(m[1]);
  if (!blocks.length) {
    while ((m = entryRe.exec(xml))) blocks.push(m[1]);
  }

  return blocks.map((block) => {
    const title = extractTag(block, 'title');
    const link = extractLink(block);
    const date = extractDate(block);
    const description =
      extractTag(block, 'content:encoded') ||
      extractTag(block, 'description') ||
      extractTag(block, 'summary') ||
      extractTag(block, 'content');
    return { title, link, date, summary: summarize(description) };
  });
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EscritorioJuniorNewsBot/1.0; +https://escritoriojunior.com.br)',
        Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSource(source) {
  try {
    const xml = await fetchWithTimeout(source.feedUrl, REQUEST_TIMEOUT_MS);
    const parsed = parseFeed(xml)
      .filter((it) => it.title && it.link)
      .slice(0, ITEMS_PER_SOURCE)
      .map((it) => ({ ...it, source: source.id, sourceName: source.name }));
    console.log(`[fetch-news] ${source.name}: ${parsed.length} itens`);
    return parsed;
  } catch (err) {
    console.error(`[fetch-news] Falha ao buscar ${source.name} (${source.feedUrl}): ${err.message}`);
    return [];
  }
}

async function main() {
  const results = await Promise.all(SOURCES.map(fetchSource));
  const items = results
    .flat()
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const payload = {
    generatedAt: new Date().toISOString(),
    sources: SOURCES.map(({ id, name, feedUrl }) => ({ id, name, feedUrl })),
    items,
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`[fetch-news] ${items.length} notícias salvas em ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('[fetch-news] Erro inesperado:', err);
  process.exitCode = 1;
});
