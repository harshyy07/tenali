const EPSILON = 0.01;
function clamp(p, lo = EPSILON, hi = 1 - EPSILON) {
  return Math.min(hi, Math.max(lo, p));
}

const DEFAULT_PARAMS = {
  pInit: 0.3,
  pTransit: 0.06,
  pGuess: 0.25,
  pSlip: 0.10,
};

function validateParams({ pGuess, pSlip }) {
  if (pGuess >= 0.5 || pSlip >= 0.5) {
    throw new Error(`Degenerate BKT params: pGuess=${pGuess}, pSlip=${pSlip} must both be < 0.5`);
  }
}

function bktUpdate(pMastery, isCorrect, params = DEFAULT_PARAMS) {
  validateParams(params);
  const { pTransit, pGuess, pSlip } = params;
  const pL = clamp(pMastery);
  let posterior;
  if (isCorrect) {
    posterior = (pL * (1 - pSlip)) / (pL * (1 - pSlip) + (1 - pL) * pGuess);
  } else {
    posterior = (pL * pSlip) / (pL * pSlip + (1 - pL) * (1 - pGuess));
  }
  posterior = clamp(posterior);
  const pMasteryNext = clamp(posterior + (1 - posterior) * pTransit);
  return { posterior, pMasteryNext };
}

export { bktUpdate, DEFAULT_PARAMS, clamp };
