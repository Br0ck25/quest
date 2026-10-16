// scripts/build.js — Bundler for Cloudflare Worker copy-paste artifact
// Assembles modular files from src/ into the standalone worker.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const outputFile = path.join(rootDir, 'worker.js');
const MAX_LINES = 2000;

function ensureDirectories() {
  const dirs = [
    path.join(srcDir, 'client'),
    path.join(srcDir, 'server'),
    path.join(srcDir, 'data'),
    path.join(rootDir, 'tests', 'unit'),
    path.join(rootDir, 'tests', 'contract'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Strips import and export keywords from code to allow clean inlining in a single script scope.
 */
function stripModules(code) {
  return code
    .replace(/\r\n/g, '\n')
    // Remove import lines: import ... from '...';
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\n?/gm, '')
    // Replace "export const / let / var / function / class" with declaration
    .replace(/^export\s+(const|let|var|function|class)\s+/gm, '$1 ')
    // Replace "export default" if any
    .replace(/^export\s+default\s+/gm, '')
    // Remove isolated named export blocks: export { ... };
    .replace(/^export\s*\{[\s\S]*?\};?\n?/gm, '')
    // Strip block comments for line economy in generated artifact
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Strip both standalone and inline comments (preserving http:// or data: urls)
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    // Collapse consecutive empty lines
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

function condenseObjects(code) {
  return stripModules(code)
    .replace(/,\n\s*/g, ', ')
    .replace(/\{\n\s*/g, '{ ')
    .replace(/\n\s*\}/g, ' }')
    .replace(/\[\n\s*/g, '[ ')
    .replace(/\n\s*\]/g, ' ]');
}

function build() {
  console.log('[Build] Verifying directory structure...');
  ensureDirectories();

  // Read modular source files
  const constantsCode = fs.readFileSync(path.join(srcDir, 'data', 'constants.js'), 'utf8');
  const gameDataCode = fs.readFileSync(path.join(srcDir, 'data', 'game-data.js'), 'utf8');
  const progressionCode = fs.readFileSync(path.join(srcDir, 'data', 'progression.js'), 'utf8');
  const questionsCode = fs.readFileSync(path.join(srcDir, 'data', 'questions.js'), 'utf8');
  const questionSchemaCode = fs.readFileSync(path.join(srcDir, 'data', 'question-schema.js'), 'utf8');
  const spacedRepetitionCode = fs.readFileSync(path.join(srcDir, 'data', 'spaced-repetition.js'), 'utf8');
  const dbCode = fs.readFileSync(path.join(srcDir, 'server', 'db.js'), 'utf8');
  const roomsCode = fs.readFileSync(path.join(srcDir, 'server', 'rooms.js'), 'utf8');
  const duelsCode = fs.readFileSync(path.join(srcDir, 'server', 'duels.js'), 'utf8');
  const contentReviewCode = fs.readFileSync(path.join(srcDir, 'server', 'content-review.js'), 'utf8');
  const workerCode = fs.readFileSync(path.join(srcDir, 'server', 'worker.js'), 'utf8');
  const spritesCode = fs.readFileSync(path.join(srcDir, 'client', 'sprites.js'), 'utf8');
  const audioCode = fs.readFileSync(path.join(srcDir, 'client', 'audio.js'), 'utf8');
  const inputCode = fs.readFileSync(path.join(srcDir, 'client', 'input.js'), 'utf8');
  const encounterCode = fs.readFileSync(path.join(srcDir, 'client', 'encounter.js'), 'utf8');
  const rendererCode = fs.readFileSync(path.join(srcDir, 'client', 'renderer.js'), 'utf8');
  const uiCode = fs.readFileSync(path.join(srcDir, 'client', 'ui.js'), 'utf8');
  const appCode = fs.readFileSync(path.join(srcDir, 'client', 'app.js'), 'utf8');
  const stylesCode = fs.readFileSync(path.join(srcDir, 'client', 'styles.js'), 'utf8');

  // Verify no source file exceeds MAX_LINES
  const sourceFiles = [
    { name: 'constants.js', code: constantsCode },
    { name: 'game-data.js', code: gameDataCode },
    { name: 'progression.js', code: progressionCode },
    { name: 'questions.js', code: questionsCode },
    { name: 'question-schema.js', code: questionSchemaCode },
    { name: 'spaced-repetition.js', code: spacedRepetitionCode },
    { name: 'db.js', code: dbCode },
    { name: 'rooms.js', code: roomsCode },
    { name: 'duels.js', code: duelsCode },
    { name: 'content-review.js', code: contentReviewCode },
    { name: 'worker.js', code: workerCode },
    { name: 'sprites.js', code: spritesCode },
    { name: 'audio.js', code: audioCode },
    { name: 'input.js', code: inputCode },
    { name: 'encounter.js', code: encounterCode },
    { name: 'renderer.js', code: rendererCode },
    { name: 'ui.js', code: uiCode },
    { name: 'app.js', code: appCode },
    { name: 'styles.js', code: stylesCode },
  ];

  for (const file of sourceFiles) {
    const lines = file.code.split('\n').length;
    if (lines > MAX_LINES) {
      throw new Error(`[Build Error] Source file ${file.name} exceeds ${MAX_LINES} lines (${lines} lines)!`);
    }
  }

  // Minify CSS cleanly for artifact line budget preservation
  const matchCss = stylesCode.match(/export const GAME_CSS = `([\s\S]*?)`;/);
  const rawCss = matchCss ? matchCss[1] : '';
  const minifiedCss = rawCss
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([\{\};:,>])\s*/g, '$1')
    .trim();

  // Assemble the inlined browser client script
  const clientBundle = [
    stripModules(constantsCode),
    stripModules(gameDataCode),
    stripModules(progressionCode),
    stripModules(questionsCode),
    stripModules(questionSchemaCode),
    stripModules(spacedRepetitionCode),
    stripModules(spritesCode),
    stripModules(audioCode),
    stripModules(inputCode),
    stripModules(encounterCode),
    stripModules(rendererCode),
    stripModules(uiCode),
    stripModules(appCode),
  ].join('\n');

  // Process workerCode: keep export default and function exports, inject clientBundle into createHtmlShell call
  const processedWorker = workerCode
    .replace(/\r\n/g, '\n')
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\n?/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\n\s*\n+/g, '\n')
    .replace('const html = createHtmlShell();', `const html = createHtmlShell(${JSON.stringify(clientBundle)});`)
    .trim();

  // Compile standalone worker.js
  const workerTemplate = `// QUEST: Kentucky — Standalone Cloudflare Worker
// GENERATED ARTIFACT — DO NOT EDIT DIRECTLY. Source files are in src/
// Target: Copy-paste to Cloudflare Workers Quick Edit or deploy via Wrangler.

${condenseObjects(constantsCode)}

${condenseObjects(gameDataCode)}

${condenseObjects(progressionCode)}

${condenseObjects(questionsCode)}

${condenseObjects(questionSchemaCode)}

${condenseObjects(spacedRepetitionCode)}

${condenseObjects(dbCode)}

${condenseObjects(roomsCode)}

${condenseObjects(duelsCode)}

${condenseObjects(contentReviewCode)}

const GAME_CSS = ${JSON.stringify(minifiedCss)};

${processedWorker}
`;

  const banner = `/**
 * QUEST: Kentucky — Cloudflare Worker Deployment Artifact
 * GENERATED: ${new Date().toISOString()}
 * 
 * NOTICE: DO NOT EDIT THIS FILE DIRECTLY.
 * Source code lives under /src. Edit in src/ and run "npm run build".
 */\n\n`;

  let finalOutput = (banner + workerTemplate)
    .replace(/\r\n/g, '\n')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\n\s*\n+/g, '\n')
    .trim() + '\n';
  const totalLines = finalOutput.split('\n').length;

  if (totalLines > MAX_LINES) {
    throw new Error(`[Build Error] Generated worker.js exceeds ${MAX_LINES} lines (${totalLines} lines)!`);
  }

  fs.writeFileSync(outputFile, finalOutput, 'utf8');
  console.log(`[Build] Successfully generated: ${outputFile} (${totalLines} lines, well within ${MAX_LINES} budget)`);
}

build();
