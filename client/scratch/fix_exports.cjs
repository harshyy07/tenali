const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

code = code.replace('const API = import.meta.env.VITE_API_BASE_URL', 'export const API = import.meta.env.VITE_API_BASE_URL');

const xpFuncs = `
export function getLocalXp() {
  try {
    const val = localStorage.getItem('tenali_xp');
    return val ? parseInt(val, 10) : 0;
  } catch { return 0; }
}
export function setLocalXp(val) {
  try { localStorage.setItem('tenali_xp', val.toString()); } catch {}
}
export function changeXp(delta) {
  const current = getLocalXp();
  const next = Math.max(0, current + delta);
  setLocalXp(next);
  return next;
}
`;

if (!code.includes('export function getLocalXp')) {
  code = code.replace(/export default App/, xpFuncs + '\nexport default App');
}

fs.writeFileSync('src/App.jsx', code);
console.log('Fixed exports');
