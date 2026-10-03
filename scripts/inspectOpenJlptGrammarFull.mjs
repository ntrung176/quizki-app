import fs from 'fs';
import path from 'path';

const dir = 'scripts/openjlpt_js';
if (fs.existsSync(dir)) {
  const files = fs.readdirSync(dir);
  const grammarFiles = files.filter(f => 
    f.toLowerCase().includes('grammar') || 
    f.toLowerCase().includes('sheet') || 
    f.toLowerCase().includes('deep') || 
    f.toLowerCase().includes('keigo') || 
    f.toLowerCase().includes('verb') || 
    f.toLowerCase().includes('particle') ||
    f.toLowerCase().includes('cond') ||
    f.toLowerCase().includes('passive')
  );
  console.log('--- GRAMMAR FILES IN OPENJLPT BUNDLE ---');
  grammarFiles.forEach(f => {
    const stats = fs.statSync(path.join(dir, f));
    console.log(`${f} (${(stats.size / 1024).toFixed(1)} KB)`);
  });

  // Let's inspect grammar index file
  const searchIndexFile = files.find(f => f.startsWith('grammarSheetSearchIndex'));
  if (searchIndexFile) {
    const content = fs.readFileSync(path.join(dir, searchIndexFile), 'utf8');
    console.log('\n--- SEARCH INDEX PREVIEW ---');
    console.log('Size:', (content.length / 1024).toFixed(1), 'KB');
    // search for sheets / items
    const matches = content.match(/title:"[^"]+",url:"[^"]+"/g);
    console.log('Search entries count:', matches?.length || 'N/A');
    if (matches) {
      console.log('Sample entries:', matches.slice(0, 10));
    }
  }

  // Check Grammar main bundle
  const mainGrammarFile = files.find(f => f.startsWith('Grammar-'));
  if (mainGrammarFile) {
    const content = fs.readFileSync(path.join(dir, mainGrammarFile), 'utf8');
    console.log('\n--- MAIN GRAMMAR CONTENT SNIPPET ---');
    console.log('Main Grammar file size:', (content.length / 1024).toFixed(1), 'KB');
    
    // Find cheat sheets list / categories
    const categories = content.match(/title:\s*"[^"]+",\s*items:\s*\[[^\]]+\]/g);
    console.log('Categories:', categories);
  }
}
