import {createHash} from 'node:crypto';
import {readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const buildDirectory = path.resolve('build');

async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(filename));
    else if (entry.name.endsWith('.html')) files.push(filename);
  }
  return files;
}

// Docusaurus emits small inline bootstrap scripts. Permit only their exact hashes,
// not arbitrary inline JavaScript or eval(). Recalculate after every full build.
const hashes = new Set();
const files = await htmlFiles(buildDirectory);
if (files.length === 0) throw new Error('No HTML files found in build/');
for (const filename of files) {
  const html = await readFile(filename, 'utf8');
  for (const [, attributes, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(attributes) || !body.trim()) continue;
    // Structured data is inert JSON, not JavaScript. It varies on each page.
    if (/\btype\s*=\s*["']application\/(?:ld\+)?json["']/i.test(attributes)) continue;
    if (/\beth_call\b|beweiseimmunize\.com|stop watching us|\beval\s*\(|\bnew\s+Function\s*\(/i.test(body)) {
      throw new Error(`Unexpected executable code found in ${filename}`);
    }
    hashes.add(`'sha256-${createHash('sha256').update(body).digest('base64')}'`);
  }
}

const policy = [
  "default-src 'self'",
  `script-src 'self' ${[...hashes].sort().join(' ')}`,
  "connect-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

const headers = [
  '/*',
  `  Content-Security-Policy: ${policy}`,
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '  X-Frame-Options: DENY',
  '  Permissions-Policy: camera=(), microphone=(), geolocation=(), clipboard-read=()',
];
// Cloudflare Pages limits each _headers line to 2,000 characters.
if (headers.some(line => line.length > 2000)) {
  throw new Error('Generated security header exceeds Cloudflare Pages line limit');
}
await writeFile(path.join(buildDirectory, '_headers'), headers.join('\n') + '\n');
console.log(`Generated CSP for ${files.length} HTML files with ${hashes.size} inline-script hashes`);
