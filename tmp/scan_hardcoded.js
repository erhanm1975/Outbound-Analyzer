import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve(process.cwd(), 'src');

const findings = {
    urls: [],
    magicNumbers: [],
    stringConditions: [],
    timeConstants: []
};

// Extremely noisy files to ignore for magic numbers
const ignoreFiles = ['metric-definitions.ts'];

function scanFile(filePath) {
    if (ignoreFiles.some(f => filePath.endsWith(f))) return;

    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(process.cwd(), filePath);

    // 1. URLs
    const urlRegex = /(https?:\/\/[^\s'"`]+)/g;
    let match;
    while ((match = urlRegex.exec(content)) !== null) {
        if (!match[1].includes('localhost') && !match[1].includes('w3.org')) {
            findings.urls.push(`[${relPath}] URL found: ${match[1]}`);
        }
    }

    // 2. Magic Numbers in Conditions or Logic (ignoring 0, 1, and index checks)
    // Matches expressions like `height > 500` or `* 100` or `== 404`
    const magicNumberRegex = /([=!><]=?|[\+\-\*\/])\s*(\d{2,}(\.\d+)?)/g;
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        let m;
        // Also look for time multiplications like 1000 * 60
        if (line.includes('1000 * 60')) {
            findings.timeConstants.push(`[${relPath}:${i + 1}] ${line.trim()}`);
        }

        while ((m = magicNumberRegex.exec(line)) !== null) {
            const num = parseFloat(m[2]);
            // Ignore 100 (percentages), small numbers, dimension numbers in UI
            if (num > 1 && num !== 100) {
                // Check context: if it's inside a className or SVG, skip it
                if (!line.includes('className=') && !line.includes('<path') && !line.includes('<svg')) {
                    findings.magicNumbers.push(`[${relPath}:${i + 1}] Magic number ${num}: ${line.trim()}`);
                }
            }
        }

        // 3. Hardcoded string literal checks (e.g. === 'PICKING')
        const stringLiteralRegex = /===\s*['"]([A-Z_]{3,})['"]/g;
        while ((m = stringLiteralRegex.exec(line)) !== null) {
            findings.stringConditions.push(`[${relPath}:${i + 1}] Hardcoded type string '${m[1]}': ${line.trim()}`);
        }

        // Let's also find hardcoded ID checks or user emails
        const hardcodedUserRegex = /===\s*['"]([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})['"]/ig;
        while ((m = hardcodedUserRegex.exec(line)) !== null) {
            findings.stringConditions.push(`[${relPath}:${i + 1}] Hardcoded Email '${m[1]}': ${line.trim()}`);
        }
    });
}

function walk(dir) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walk(dirPath);
        } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
            // Exclude test files
            if (!f.includes('.test.') && !f.includes('.spec.')) {
                scanFile(dirPath);
            }
        }
    });
}

walk(SRC_DIR);

fs.writeFileSync('tmp/hardcoded-scan.json', JSON.stringify(findings, null, 2));
console.log(`Scan complete. Found ${findings.urls.length} urls, ${findings.magicNumbers.length} numbers, ${findings.stringConditions.length} strings, ${findings.timeConstants.length} times.`);
