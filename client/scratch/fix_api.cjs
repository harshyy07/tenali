const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Revert local exports
code = code.replace(/export const API = import\.meta\.env\.VITE_API_BASE_URL/g, 'const API = import.meta.env.VITE_API_BASE_URL');

// Inject global export at the top if it doesn't exist at the top
if (!code.includes('export const API = import.meta.env.VITE_API_BASE_URL || \'\';\n// --- END IMPORTS ---')) {
  // Find a good spot at the top
  const injectAfter = "import OnboardingTour from './components/OnboardingTour'";
  if (code.includes(injectAfter)) {
    code = code.replace(injectAfter, injectAfter + "\n\nexport const API = import.meta.env.VITE_API_BASE_URL || '';\n// --- END IMPORTS ---");
  } else {
    // just put it after the first import
    code = code.replace(/import (.*)\n/, "import $1\nexport const API = import.meta.env.VITE_API_BASE_URL || '';\n");
  }
}

fs.writeFileSync('src/App.jsx', code);
console.log('Fixed API export');
