// Build validation: syntax-check every .js file (used by CI).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const skip = new Set(['node_modules', '.git']);
let failed = false;
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    if (skip.has(f)) continue;
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js')) {
      try { execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' }); }
      catch (e) { failed = true; console.error('Syntax error in', p, '\n', e.stderr.toString()); }
    }
  }
})(root);
if (failed) process.exit(1);
console.log('All files passed syntax check');
