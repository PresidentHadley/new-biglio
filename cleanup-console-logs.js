#!/usr/bin/env node

// Script to clean up development console.log statements for production
// Keeps only essential error logging

const fs = require('fs');
const path = require('path');

// Files to clean up
const filesToClean = [
  'src/hooks/useBooks.ts',
  'src/components/AudioPlayerModal.tsx', 
  'src/app/page.tsx',
  'src/app/book/[id]/page.tsx',
  'src/components/channel/AudioBookList.tsx',
  'src/hooks/useRealtime.ts',
  'src/context/RealtimeContext.tsx'
];

// Console statements to remove (debug/status logs)
const patternsToRemove = [
  /^\s*console\.log\(.*\[BOOKS\].*\);?\s*$/gm,
  /^\s*console\.log\(.*\[AUDIO\].*\);?\s*$/gm,
  /^\s*console\.log\(.*📚.*\);?\s*$/gm,
  /^\s*console\.log\(.*📖.*\);?\s*$/gm,
  /^\s*console\.log\(.*📋.*\);?\s*$/gm,
  /^\s*console\.log\(.*🎵.*\);?\s*$/gm,
  /^\s*console\.log\(.*🔍.*\);?\s*$/gm,
  /^\s*console\.log\(.*📊.*\);?\s*$/gm,
  /^\s*console\.log\(.*📡.*\);?\s*$/gm,
  /^\s*console\.log\(.*🔄.*\);?\s*$/gm,
  /^\s*console\.log\(.*🎯.*\);?\s*$/gm,
  /^\s*console\.log\(.*🚀.*\);?\s*$/gm,
  /^\s*console\.log\(.*✅.*\);?\s*$/gm,
  /^\s*console\.log\(.*🎉.*\);?\s*$/gm,
  /^\s*console\.log\(.*📝.*\);?\s*$/gm,
  /^\s*console\.log\(.*🐛.*\);?\s*$/gm,
  /^\s*console\.log\(.*DEBUG.*\);?\s*$/gm
];

filesToClean.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalLength = content.length;
    
    patternsToRemove.forEach(pattern => {
      content = content.replace(pattern, '');
    });
    
    // Clean up empty lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (content.length !== originalLength) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Cleaned ${filePath}`);
    }
  }
});

console.log('🎉 Console cleanup complete!');