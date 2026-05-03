import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const SEARCH_HOOKS_PATH = '@/hooks/search/';
const PROJECT_ROOT = process.cwd();

function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let hasError = false;

  lines.forEach((line, index) => {
    // Look for imports from ./ or ../ that should be using the alias for search hooks
    // but only if they are targeting search hooks specifically
    const relativeHookImport = /from\s+['"](\.\/|\.\.\/)+(usePopularSearchItems|useVoiceSearchAction)['"]/.exec(line);
    
    if (relativeHookImport) {
      console.error(`Error in ${filePath}:${index + 1}: Relative import found for search hook: "${line.trim()}". Use "${SEARCH_HOOKS_PATH}" instead.`);
      hasError = true;
    }
  });

  return hasError;
}

function walkDir(dir) {
  let hasErrors = false;
  const files = readdirSync(dir);

  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        if (walkDir(fullPath)) hasErrors = true;
      }
    } else if (['.ts', '.tsx', '.js', '.jsx'].includes(extname(file))) {
      if (checkFile(fullPath)) hasErrors = true;
    }
  }
  return hasErrors;
}

console.log('Checking for relative search hook imports...');
const srcPath = join(PROJECT_ROOT, 'src');
const hasErrors = walkDir(srcPath);

if (hasErrors) {
  console.error('\nFound relative imports that should be replaced with "@/hooks/search/".');
  process.exit(1);
} else {
  console.log('No relative search hook imports found. All good!');
  process.exit(0);
}
