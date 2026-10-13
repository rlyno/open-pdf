/**
 * Collects every translatable Indonesian string in src/: t('...') calls,
 * outName(..., '...') suffixes (translated inside outName), and the tool and
 * category names in lib/tools.ts (translated where they are displayed).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(name) ? [p] : [];
  });
}

const unquote = (s: string) => s.replace(/\\(['\\])/g, '$1');

export function collectKeys(srcDir: string): Set<string> {
  const keys = new Set<string>();
  for (const file of walk(srcDir)) {
    const code = readFileSync(file, 'utf8');
    for (const m of code.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) keys.add(unquote(m[1]));
    for (const m of code.matchAll(/outName\([^,]+,\s*'((?:[^'\\]|\\.)*)'/g)) keys.add(unquote(m[1]));
    if (file.endsWith(join('lib', 'tools.ts'))) {
      for (const m of code.matchAll(/^\s+(?:title|description|badge|feature): '((?:[^'\\]|\\.)*)'/gm)) keys.add(unquote(m[1]));
      for (const m of code.matchAll(/title: '((?:[^'\\]|\\.)*)', color/g)) keys.add(unquote(m[1]));
    }
  }
  return keys;
}
