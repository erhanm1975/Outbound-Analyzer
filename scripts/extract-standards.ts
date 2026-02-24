import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extract() {
  try {
    const { DEFAULT_BUFFER_CONFIG } = await import('../src/types/index.ts');
    
    const standards = DEFAULT_BUFFER_CONFIG.engineeredStandards;
    
    const jsonPath = path.join(__dirname, '../src/data/global-engineered-standards.json');
    const customPath = path.join(__dirname, '../src/data/customized-engineered-standards.json');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(path.dirname(jsonPath))) {
      fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    }
    
    const jsonStr = JSON.stringify(standards, null, 2);
    fs.writeFileSync(jsonPath, jsonStr);
    fs.writeFileSync(customPath, jsonStr); // They start identical
    
    console.log('Successfully extracted engineered standards to src/data!');
  } catch (e) {
    console.error('Failed to extract:', e);
  }
}

extract();
