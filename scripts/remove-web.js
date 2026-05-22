const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '..', 'web');

if (!fs.existsSync(target)) {
  console.log('No web folder found at', target);
  process.exit(0);
}

console.log('About to remove folder:', target);

// Safety: require an environment variable to allow deletion
if (process.env.CONFIRM_REMOVE_WEB !== '1') {
  console.error('\nSafety: To actually delete the folder set environment variable CONFIRM_REMOVE_WEB=1 and re-run this script.');
  process.exit(2);
}

try {
  fs.rmSync(target, { recursive: true, force: true });
  console.log('Removed', target);
} catch (err) {
  console.error('Failed to remove', target, err);
  process.exit(1);
}
