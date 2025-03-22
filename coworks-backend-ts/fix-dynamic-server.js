#!/usr/bin/env node

/**
 * Fix Dynamic Server Usage Script
 * 
 * This script addresses common "Dynamic server usage" errors in Next.js when deploying to Vercel.
 * It adds explicit runtime directives to API routes that use dynamic features like request.headers
 * or request.url, preventing build-time static rendering attempts.
 */

const fs = require('fs');
const path = require('path');

console.log('\x1b[33m%s\x1b[0m', '🔧 Fixing Dynamic Server Usage errors in API routes...');

// Find all route.ts files
function findRouteFiles(dir, routeFiles = []) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory()) {
      findRouteFiles(filePath, routeFiles);
    } else if (file.name === 'route.ts' || file.name === 'route.tsx') {
      routeFiles.push(filePath);
    }
  }

  return routeFiles;
}

// Common patterns that cause dynamic server usage errors
const DYNAMIC_PATTERNS = [
  'request.headers',
  'request.url',
  'req.headers',
  'req.url',
  'headers.get',
  'searchParams',
  'new URL(',
  'NextRequest',
  'createContext'
];

// Process a file to add the runtime directive
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Check if the file has dynamic usage patterns
    const hasDynamicUsage = DYNAMIC_PATTERNS.some(pattern => content.includes(pattern));
    
    if (!hasDynamicUsage) {
      return false;
    }
    
    console.log(`🔍 Found dynamic usage in ${filePath}`);
    
    // Check if file already has a runtime directive
    if (content.includes('export const runtime = "nodejs"') || 
        content.includes("export const runtime = 'nodejs'")) {
      console.log(`✓ ${filePath} already has Node.js runtime directive`);
      return false;
    }
    
    // Remove any other runtime directives if they exist
    if (content.includes('export const runtime')) {
      content = content.replace(/export const runtime.*?\n/g, '');
      modified = true;
    }
    
    // Add runtime directive for Node.js at the top of the file
    const runtimeDirective = 'export const runtime = "nodejs";\n\n';
    content = runtimeDirective + content;
    modified = true;
    
    // Write back to the file
    fs.writeFileSync(filePath, content);
    console.log(`✅ Added Node.js runtime directive to ${filePath}`);
    
    return modified;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
}

// Main execution
try {
  // Find all API route files
  const apiDir = path.join('src', 'app', 'api');

  if (fs.existsSync(apiDir)) {
    const routeFiles = findRouteFiles(apiDir);
    console.log(`🔍 Found ${routeFiles.length} API route files`);
    
    let modifiedCount = 0;
    for (const routeFile of routeFiles) {
      if (processFile(routeFile)) {
        modifiedCount++;
      }
    }

    console.log(`✅ Modified ${modifiedCount} API route files`);
    
    if (modifiedCount === 0) {
      console.log('All dynamic API routes already have the correct runtime directive.');
    }
  } else {
    console.log('⚠️ API directory not found');
  }

  console.log('\n✅ Dynamic server usage fixes completed successfully!');
} catch (error) {
  console.error('❌ Error during dynamic server usage fixes:', error.message);
  process.exit(1);
} 