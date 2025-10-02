// check-lambda-deps.js
// Run this script in your Lambda source directory (e.g., backend/extracted-lambda)
// It will attempt to require all main Lambda handler files and report missing modules.

const handlers = [
  './dist/services/auth-service.js',
  './dist/functions/auth-middleware.js',
  './dist/functions/plan-trip.js',
  // Add more handler files as needed
];

let allOk = true;

for (const handler of handlers) {
  try {
    require(handler);
    console.log(`✅ Loaded: ${handler}`);
  } catch (err) {
    allOk = false;
    console.error(`❌ Error loading ${handler}:`, err.message);
  }
}

if (allOk) {
  console.log('All Lambda handlers loaded successfully. No missing dependencies.');
  process.exit(0);
} else {
  console.error('Some handlers failed to load. Check errors above for missing modules.');
  process.exit(1);
}
