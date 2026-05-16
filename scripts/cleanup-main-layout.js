import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const pagesDir = path.join(process.cwd(), 'src/pages');

walkDir(pagesDir, (filePath) => {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Replace MainLayout tag with fragments
    if (content.includes('<MainLayout>')) {
      content = content.replace(/<MainLayout>/g, '<>');
      content = content.replace(/<\/MainLayout>/g, '</>');
      changed = true;
    }
    
    // Handle cases where MainLayout might have props (even if we think it doesn't)
    // Looking for <MainLayout ...>
    if (content.match(/<MainLayout\s+[^>]*>/)) {
       content = content.replace(/<MainLayout\s+[^>]*>/g, '<>');
       content = content.replace(/<\/MainLayout>/g, '</>');
       changed = true;
    }

    // Comment out the import
    if (content.includes('import { MainLayout } from')) {
      content = content.replace(/import { MainLayout } from ["']@\/components\/layout\/MainLayout["'];/g, '// import { MainLayout } from "@/components/layout/MainLayout";');
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log(`Processed: ${filePath}`);
    }
  }
});
