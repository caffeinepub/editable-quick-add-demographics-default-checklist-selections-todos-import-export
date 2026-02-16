import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve to project root (two levels up from scripts/)
const projectRoot = path.resolve(__dirname, '..', '..');
const outputPath = path.join(projectRoot, 'frontend', 'public', 'assets', 'project-files-manifest.json');

// Directories and files to exclude
const excludePatterns = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /\.dfx/,
  /\.next/,
  /\.cache/,
  /coverage/,
  /\.DS_Store/,
  /\.env/,
  /\.vscode/,
  /\.idea/,
  /\.turbo/,
  /\.vercel/,
  /\.swc/,
  /\.parcel-cache/,
  /\.output/,
  /\.nuxt/,
  /\.astro/,
  /\.svelte-kit/,
  /\.solid/,
  /\.angular/,
  /\.vite/,
  /\.rollup\.cache/,
  /\.webpack/,
  /\.esbuild/,
  /\.tsbuildinfo/,
  /\.eslintcache/,
  /\.stylelintcache/,
  /\.prettiercache/,
  /\.yarn/,
  /\.pnp/,
  /\.pnpm-store/,
  /\.npm/,
  /\.rush/,
  /\.lerna/,
  /\.nx/,
  /\.turbo/,
  /\.gradle/,
  /\.m2/,
  /\.cargo/,
  /target/,
  /out/,
  /tmp/,
  /temp/,
  /logs/,
  /\.log$/,
  /\.lock$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
];

function shouldExclude(filePath) {
  return excludePatterns.some(pattern => pattern.test(filePath));
}

function scanDirectory(dir, baseDir = dir) {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      
      if (shouldExclude(relativePath)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        files.push(...scanDirectory(fullPath, baseDir));
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error.message);
  }
  
  return files;
}

function generateManifest() {
  console.log('Scanning project files...');
  console.log('Project root:', projectRoot);
  
  const files = scanDirectory(projectRoot);
  
  // Sort files alphabetically
  files.sort((a, b) => a.localeCompare(b));
  
  const manifest = {
    generatedAt: new Date().toISOString(),
    fileCount: files.length,
    files: files,
  };
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write manifest
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
  
  console.log(`✓ Generated manifest with ${files.length} files`);
  console.log(`✓ Written to: ${outputPath}`);
}

// Run the generator
try {
  generateManifest();
} catch (error) {
  console.error('Failed to generate project files manifest:', error);
  process.exit(1);
}
