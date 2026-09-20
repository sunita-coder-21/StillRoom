const fs = require('node:fs');
const path = require('node:path');

const contractPath = path.join(__dirname, '..', 'contracts', 'managed', 'stillroom', 'contract', 'index.js');
if (!fs.existsSync(contractPath)) process.exit(0);
const source = fs.readFileSync(contractPath, 'utf8');
// The generated bindings already declare and check their runtime version.
if (source.includes('checkRuntimeVersion')) {
  console.log('Generated Stillroom bindings are ready.');
  process.exit(0);
}
throw new Error('Stillroom bindings are missing the Compact runtime compatibility check.');
