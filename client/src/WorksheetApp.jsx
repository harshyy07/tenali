import { useState } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || '';

// Catalog of topics supported by Tenali that generate print-friendly prompts
const TOPIC_CATALOG = [
  { key: 'addition', name: 'Addition', category: 'Arithmetic', defaultCount: 5, defaultDifficulty: 'easy' },
  { key: 'basicarith', name: 'Basic Arithmetic (+, −, ×)', category: 'Arithmetic', defaultCount: 5, defaultDifficulty: 'medium' },
  { key: 'multiply', name: 'Multiplication Tables', category: 'Arithmetic', defaultCount: 5, defaultDifficulty: 'easy' },
  { key: 'decimals', name: 'Decimals Arithmetic', category: 'Arithmetic', defaultCount: 5, defaultDifficulty: 'medium' },
  { key: 'fractionadd', name: 'Fraction Addition', category: 'Fractions & Ratios', defaultCount: 5, defaultDifficulty: 'medium' },
  { key: 'ratio', name: 'Ratio & Proportion', category: 'Fractions & Ratios', defaultCount: 3, defaultDifficulty: 'medium' },
  { key: 'percent', name: 'Percentages', category: 'Fractions & Ratios', defaultCount: 3, defaultDifficulty: 'medium' },
  { key: 'hcflcm', name: 'HCF & LCM', category: 'Arithmetic', defaultCount: 3, defaultDifficulty: 'easy' },
  { key: 'sqrt', name: 'Square Roots', category: 'Algebra', defaultCount: 5, defaultDifficulty: 'medium' },
  { key: 'primefactor', name: 'Prime Factorisation', category: 'Arithmetic', defaultCount: 3, defaultDifficulty: 'medium' },
  { key: 'lineareq', name: 'Linear Equations', category: 'Algebra', defaultCount: 5, defaultDifficulty: 'medium' },
  { key: 'quadratic', name: 'Quadratic Substitution', category: 'Algebra', defaultCount: 5, defaultDifficulty: 'medium' },
  { key: 'polyfactor', name: 'Polynomial Factoring', category: 'Algebra', defaultCount: 3, defaultDifficulty: 'medium' },
  { key: 'polymul', name: 'Polynomial Expansion', category: 'Algebra', defaultCount: 3, defaultDifficulty: 'medium' },
  { key: 'simul', name: 'Simultaneous Equations', category: 'Algebra', defaultCount: 2, defaultDifficulty: 'medium' },
  { key: 'indices', name: 'Indices Laws', category: 'Algebra', defaultCount: 5, defaultDifficulty: 'medium' },
  { key: 'surds', name: 'Surds Simplification', category: 'Algebra', defaultCount: 5, defaultDifficulty: 'medium' },
  { key: 'log', name: 'Logarithms', category: 'Algebra', defaultCount: 5, defaultDifficulty: 'medium' },
  { key: 'stdform', name: 'Standard Form (Sci. Notation)', category: 'Algebra', defaultCount: 5, defaultDifficulty: 'medium' },
  { key: 'angles', name: 'Angles', category: 'Geometry', defaultCount: 3, defaultDifficulty: 'medium' },
  { key: 'pythag', name: 'Pythagoras\' Theorem', category: 'Geometry', defaultCount: 3, defaultDifficulty: 'medium' },
  { key: 'mensur', name: 'Mensuration (Area & Volume)', category: 'Geometry', defaultCount: 3, defaultDifficulty: 'medium' },
  { key: 'gk', name: 'General Knowledge', category: 'Trivia', defaultCount: 5, defaultDifficulty: 'medium' },
  { key: 'vocab', name: 'Vocabulary', category: 'Trivia', defaultCount: 5, defaultDifficulty: 'medium' },
];

function fetchQuestionForWorksheet(type, difficulty, qIndex = 0) {
  const diffMap = { easy: 1, medium: 2, hard: 3 };
  const urls = {
    basicarith: `${API}/basicarith-api/question?difficulty=${difficulty}`,
    addition: `${API}/addition-api/question?digits=${diffMap[difficulty] || 1}`,
    quadratic: `${API}/quadratic-api/question?difficulty=${difficulty}`,
    multiply: `${API}/multiply-api/question?table=${Math.floor(Math.random() * 8) + 2}`,
    sqrt: `${API}/sqrt-api/question?step=${difficulty === 'easy' ? Math.floor(Math.random() * 10) + 1 : difficulty === 'medium' ? Math.floor(Math.random() * 25) + 11 : Math.floor(Math.random() * 25) + 36}`,
    polymul: `${API}/polymul-api/question?difficulty=${difficulty}`,
    polyfactor: `${API}/polyfactor-api/question?difficulty=${difficulty}`,
    primefactor: `${API}/primefactor-api/question?difficulty=${difficulty}`,
    qformula: `${API}/qformula-api/question?difficulty=${difficulty}`,
    simul: `${API}/simul-api/question?difficulty=${difficulty}`,
    funceval: `${API}/funceval-api/question?difficulty=${difficulty}`,
    lineq: `${API}/lineq-api/question?difficulty=${difficulty}`,
    gk: `${API}/gk-api/question`,
    vocab: `${API}/vocab-api/question?difficulty=${difficulty}`,
    fractionadd: `${API}/fractionadd-api/question?difficulty=${difficulty}`,
    surds: `${API}/surds-api/question?difficulty=${difficulty}`,
    indices: `${API}/indices-api/question?difficulty=${difficulty}`,
    sequences: `${API}/sequences-api/question?difficulty=${difficulty}`,
    ratio: `${API}/ratio-api/question?difficulty=${difficulty}`,
    percent: `${API}/percent-api/question?difficulty=${difficulty}`,
    sets: `${API}/sets-api/question?difficulty=${difficulty}`,
    trig: `${API}/trig-api/question?difficulty=${difficulty}`,
    ineq: `${API}/ineq-api/question?difficulty=${difficulty}`,
    coordgeom: `${API}/coordgeom-api/question?difficulty=${difficulty}`,
    prob: `${API}/prob-api/question?difficulty=${difficulty}`,
    stats: `${API}/stats-api/question?difficulty=${difficulty}`,
    matrix: `${API}/matrix-api/question?difficulty=${difficulty}`,
    vectors: `${API}/vectors-api/question?difficulty=${difficulty}`,
    dotprod: `${API}/dotprod-api/question?difficulty=${difficulty}`,
    transform: `${API}/transform-api/question?difficulty=${difficulty}`,
    mensur: `${API}/mensur-api/question?difficulty=${difficulty}`,
    bearings: `${API}/bearings-api/question?difficulty=${difficulty}`,
    log: `${API}/log-api/question?difficulty=${difficulty}`,
    diff: `${API}/diff-api/question?difficulty=${difficulty}`,
    bases: `${API}/bases-api/question?difficulty=${difficulty}`,
    circleth: `${API}/circle-api/question?difficulty=${difficulty}`,
    integ: `${API}/integ-api/question?difficulty=${difficulty}`,
    stdform: `${API}/stdform-api/question?difficulty=${difficulty}`,
    bounds: `${API}/bounds-api/question?difficulty=${difficulty}`,
    sdt: `${API}/sdt-api/question?difficulty=${difficulty}`,
    variation: `${API}/variation-api/question?difficulty=${difficulty}`,
    hcflcm: `${API}/hcflcm-api/question?difficulty=${difficulty}`,
    profitloss: `${API}/profitloss-api/question?difficulty=${difficulty}`,
    rounding: `${API}/rounding-api/question?difficulty=${difficulty}`,
    binomial: `${API}/binomial-api/question?difficulty=${difficulty}`,
    complex: `${API}/complex-api/question?difficulty=${difficulty}`,
    angles: `${API}/angles-api/question?difficulty=${difficulty}`,
    triangles: `${API}/triangles-api/question?difficulty=${difficulty}`,
    congruence: `${API}/congruence-api/question?difficulty=${difficulty}`,
    pythag: `${API}/pythag-api/question?difficulty=${difficulty}&q=${qIndex}`,
    polygons: `${API}/polygons-api/question?difficulty=${difficulty}`,
    similarity: `${API}/similarity-api/question?difficulty=${difficulty}`,
    squaring: `${API}/squaring-api/question?difficulty=${difficulty}`,
    lineareq: `${API}/lineareq-api/question?difficulty=${difficulty}`,
    decimals: `${API}/decimals-api/question?difficulty=${difficulty}`,
  };

  const url = urls[type] || `${API}/${type}-api/question?difficulty=${difficulty}`;
  return fetch(url).then(r => r.json());
}

function getPromptText(type, q) {
  if (!q) return 'Loading…';
  const sup = (n) => String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('');
  switch (type) {
    case 'basicarith': case 'addition': return `${q.prompt} = ?`;
    case 'quadratic': return `${q.prompt}`;
    case 'multiply': return `${q.prompt} = ?`;
    case 'sqrt': return `${q.prompt} = ?`;
    case 'funceval': return `${q.formula}, evaluate at ${Object.entries(q.vars).map(([k,v]) => `${k} = ${v}`).join(', ')}`;
    case 'polymul': return q.p1Display && q.p2Display ? `Expand: (${q.p1Display})(${q.p2Display})` : `Expand polynomial expression`;
    case 'polyfactor': return q.display ? `Factorise: ${q.display}` : `Factorise polynomial`;
    case 'primefactor': return `Find all prime factors of ${q.number}`;
    case 'qformula': return `Find the roots of ${q.a}x² ${q.b >= 0 ? '+' : '−'} ${Math.abs(q.b)}x ${q.c >= 0 ? '+' : '−'} ${Math.abs(q.c)} = 0`;
    case 'simul': {
      if (!q.eqs) return `Solve system of equations`;
      const fmtEq = (eq) => {
        const parts = [];
        if (eq.a) parts.push(`${eq.a === 1 ? '' : eq.a === -1 ? '-' : eq.a}x`);
        if (eq.b) parts.push(`${eq.b > 0 && parts.length ? '+' : ''}${eq.b === 1 ? '' : eq.b === -1 ? '-' : eq.b}y`);
        if (eq.c) parts.push(`${eq.c > 0 && parts.length ? '+' : ''}${eq.c === 1 ? '' : eq.c === -1 ? '-' : eq.c}z`);
        return `${parts.join(' ')} = ${eq.d}`;
      };
      return `Solve:\n${q.eqs.map(fmtEq).join('\n')}`;
    }
    case 'lineq': return `Find slope (m) and intercept (c) for the line through (${q.x1}, ${q.y1}) and (${q.x2}, ${q.y2})`;
    case 'gk': return q.question;
    case 'vocab': return `What does "${q.question}" mean?`;
    case 'decimals': return q.prompt || 'Solve the decimal problem';
    case 'fractionadd': {
      if (q.mixed) {
        return `Solve: ${q.w1} ${q.n1}/${q.d1} ${q.op} ${q.w2} ${q.n2}/${q.d2} = ?`;
      }
      return `Solve: ${q.n1}/${q.d1} ${q.op} ${q.n2}/${q.d2} = ?`;
    }
    case 'surds': {
      if (q.type === 'simplify') {
        return `Simplify: √${q.n}`;
      } else if (q.type === 'addsub') {
        const formatCoeff = (c) => c === 1 ? '' : c === -1 ? '-' : c;
        return `Simplify: ${formatCoeff(q.a)}√${q.r} ${q.op} ${formatCoeff(q.b)}√${q.r}`;
      } else if (q.type === 'multiply') {
        const formatCoeff = (c) => c === 1 ? '' : c === -1 ? '-' : c;
        return `Simplify: (${formatCoeff(q.c1)}√${q.r1}) × (${formatCoeff(q.c2)}√${q.r2})`;
      } else if (q.type === 'rationalise') {
        if (q.subtype === 'simple') {
          return `Rationalise the denominator of: ${q.a} / (${q.b === 1 ? '' : q.b}√${q.r})`;
        } else {
          return `Rationalise the denominator of: ${q.a} / (${q.p} ${q.q >= 0 ? '+' : '−'} ${Math.abs(q.q) === 1 ? '' : Math.abs(q.q)}√${q.r})`;
        }
      }
      return 'Simplify the surd expression';
    }
    default:
      return q.prompt || q.question || 'Solve the problem';
  }
}

function getAnswerText(type, q) {
  if (!q) return '';
  if (q.answer !== undefined) return String(q.answer);
  if (q.correctAnswer !== undefined) return String(q.correctAnswer);
  if (q.solution !== undefined) {
    if (typeof q.solution === 'object') return JSON.stringify(q.solution);
    return String(q.solution);
  }
  if (type === 'surds') {
    const simpleSurd = (n) => {
      let outer = 1, inner = n;
      for (let i = Math.floor(Math.sqrt(n)); i >= 2; i--) {
        if (n % (i * i) === 0) {
          outer = i;
          inner = n / (i * i);
          break;
        }
      }
      return { outer, inner };
    };
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    
    if (q.type === 'simplify') {
      const s = simpleSurd(q.n);
      return s.inner === 1 ? String(s.outer) : `${s.outer === 1 ? '' : s.outer}√${s.inner}`;
    } else if (q.type === 'addsub') {
      const coeff = q.op === '+' ? q.a + q.b : q.a - q.b;
      return coeff === 0 ? '0' : `${coeff === 1 ? '' : coeff === -1 ? '-' : coeff}√${q.r}`;
    } else if (q.type === 'multiply') {
      const s = simpleSurd(q.r1 * q.r2);
      const coeff = q.c1 * q.c2 * s.outer;
      return s.inner === 1 ? String(coeff) : `${coeff === 1 ? '' : coeff}√${s.inner}`;
    } else if (q.type === 'rationalise') {
      if (q.subtype === 'simple') {
        const numCoeff = q.a;
        const den = q.b * q.r;
        const g = gcd(numCoeff, den);
        const finalNum = numCoeff / g;
        const finalDen = den / g;
        return finalDen === 1 ? `${finalNum === 1 ? '' : finalNum}√${q.r}` : `(${finalNum === 1 ? '' : finalNum}√${q.r})/${finalDen}`;
      } else {
        const den = q.p * q.p - q.q * q.q * q.r;
        const numRational = q.a * q.p;
        const numCoeff = -q.a * q.q;
        const g = gcd(gcd(Math.abs(numRational), Math.abs(numCoeff)), Math.abs(den));
        const sign = den < 0 ? -1 : 1;
        const finalRat = (numRational / g) * sign;
        const finalCoeff = (numCoeff / g) * sign;
        const finalDen = Math.abs(den) / g;
        const signStr = finalCoeff > 0 ? '+' : '';
        const cPart = Math.abs(finalCoeff) === 1 ? (finalCoeff > 0 ? '' : '-') : `${finalCoeff}`;
        const numStr = `${finalRat}${signStr}${cPart}√${q.r}`;
        return finalDen === 1 ? numStr : `(${numStr})/${finalDen}`;
      }
    }
  }
  return '';
}

const getAnswerValue = (checkData) => {
  if (!checkData) return '';
  if (checkData.correctAnswer !== undefined) return String(checkData.correctAnswer);
  if (checkData.correctDisplay !== undefined) return String(checkData.correctDisplay);
  if (checkData.correctFactors !== undefined) {
    return Array.isArray(checkData.correctFactors) ? checkData.correctFactors.join(', ') : String(checkData.correctFactors);
  }
  if (checkData.roots !== undefined) {
    return Array.isArray(checkData.roots) ? checkData.roots.join(', ') : String(checkData.roots);
  }
  if (checkData.solution !== undefined) {
    if (typeof checkData.solution === 'object') {
      return Object.entries(checkData.solution).map(([k, v]) => `${k} = ${v}`).join(', ');
    }
    return String(checkData.solution);
  }
  if (checkData.display !== undefined) return String(checkData.display);
  if (checkData.answer !== undefined) return String(checkData.answer);
  return '';
};

export default function WorksheetApp({ onBack }) {
  const [settings, setSettings] = useState({
    title: 'Practice Worksheet',
    subtitle: 'Tenali Adaptive Learning',
    layout: 'standard', // compact, standard, spacious
    columns: '2', // 1 or 2
    showAnswerKey: true,
  });

  const [topicSelection, setTopicSelection] = useState(
    TOPIC_CATALOG.reduce((acc, topic) => {
      acc[topic.key] = {
        selected: false,
        count: topic.defaultCount,
        difficulty: topic.defaultDifficulty,
      };
      return acc;
    }, {})
  );

  const [questions, setQuestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [viewMode, setViewMode] = useState('builder'); // builder, preview

  const handleTopicToggle = (key) => {
    setTopicSelection(prev => ({
      ...prev,
      [key]: { ...prev[key], selected: !prev[key].selected }
    }));
  };

  const handleTopicChange = (key, field, value) => {
    setTopicSelection(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const selectAll = (selected = true) => {
    setTopicSelection(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(k => {
        copy[k].selected = selected;
      });
      return copy;
    });
  };

  const generateWorksheet = async () => {
    const selected = Object.entries(topicSelection)
      .filter(([_, value]) => value.selected)
      .map(([key, value]) => ({ key, ...value }));

    if (selected.length === 0) {
      alert('Please select at least one topic first.');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setViewMode('preview');

    const totalQuestionsToFetch = selected.reduce((sum, item) => sum + Number(item.count), 0);
    let fetchedCount = 0;
    const allQuestions = [];

    try {
      for (const item of selected) {
        for (let i = 0; i < item.count; i++) {
          try {
            const qData = await fetchQuestionForWorksheet(item.key, item.difficulty, i);
            let answerVal = '';
            try {
              const checkRes = await fetch(`${API}/${item.key}-api/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...qData, solve: true })
              });
              if (checkRes.ok) {
                const checkData = await checkRes.json();
                answerVal = getAnswerValue(checkData);
              }
            } catch (err) {
              console.error(`Error solving ${item.key}:`, err);
            }

            allQuestions.push({
              id: `${item.key}-${i}-${Date.now()}-${Math.random()}`,
              type: item.key,
              topicName: TOPIC_CATALOG.find(t => t.key === item.key)?.name || item.key,
              difficulty: item.difficulty,
              data: qData,
              answer: answerVal,
            });
          } catch (e) {
            console.error(`Error fetching ${item.key}:`, e);
          }
          fetchedCount++;
          setGenerationProgress(Math.round((fetchedCount / totalQuestionsToFetch) * 100));
        }
      }
      setQuestions(allQuestions);
    } catch (err) {
      console.error('Worksheet generation failed:', err);
      alert('Worksheet generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };


  // Group selection by category
  const categories = TOPIC_CATALOG.reduce((acc, topic) => {
    if (!acc[topic.category]) acc[topic.category] = [];
    acc[topic.category].push(topic);
    return acc;
  }, {});

  return (
    <div className="worksheet-app" style={{
      color: 'var(--clr-text)',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 20px',
      boxSizing: 'border-box',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Configuration Header / Controls */}
      <div className="no-print" style={{
        marginBottom: 24,
        paddingRight: '160px', // Prevent overlap with fixed top-right toggles on screen
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={onBack}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--clr-accent, #58a6ff)',
                cursor: 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              ← Back
            </button>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Practice Worksheet Generator
            </span></h1>
          </div>
          {viewMode === 'preview' && !isGenerating && (
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-secondary"
                onClick={() => setViewMode('builder')}
                style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Edit Settings
              </button>
              <button
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: 'var(--clr-accent, #0066cc)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print Worksheet
              </button>
            </div>
          )}
        </div>

        {viewMode === 'builder' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
            {/* Left Column: General Configuration */}
            <div style={{
              background: 'var(--clr-surface, #1c1c1f)',
              padding: 20,
              borderRadius: 12,
              border: '1px solid var(--clr-border, #444)',
              height: 'fit-content'
            }}>
              <h3 style={{ marginTop: 0, borderBottom: '1px solid var(--clr-border, #444)', paddingBottom: 8 }}>Layout Settings</h3>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, opacity: 0.85 }}>Worksheet Title</label>
                <input
                  type="text"
                  value={settings.title}
                  onChange={e => setSettings(prev => ({ ...prev, title: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--clr-border, #444)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, opacity: 0.85 }}>Subtitle</label>
                <input
                  type="text"
                  value={settings.subtitle}
                  onChange={e => setSettings(prev => ({ ...prev, subtitle: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--clr-border, #444)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
                />
              </div>


              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, opacity: 0.85 }}>Layout Columns</label>
                <select
                  value={settings.columns}
                  onChange={e => setSettings(prev => ({ ...prev, columns: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--clr-border, #444)', background: 'var(--clr-surface, #1c1c1f)', color: 'inherit' }}
                >
                  <option value="1">Single Column</option>
                  <option value="2">Two Columns</option>
                </select>
              </div>

              <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="includeAnswers"
                  checked={settings.showAnswerKey}
                  onChange={e => setSettings(prev => ({ ...prev, showAnswerKey: e.target.checked }))}
                />
                <label htmlFor="includeAnswers" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Include Answer Key page</label>
              </div>

              <button
                className="btn btn-primary"
                onClick={generateWorksheet}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 8,
                  background: 'var(--clr-accent, #0066cc)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem'
                }}
              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center', width: '100%' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                  Generate Worksheet
                </span>
              </button>
            </div>

            {/* Right Column: Topic Selection Grid */}
            <div style={{
              background: 'var(--clr-surface, #1c1c1f)',
              padding: 20,
              borderRadius: 12,
              border: '1px solid var(--clr-border, #444)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--clr-border, #444)', paddingBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Topic Catalog</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      setTopicSelection(prev => {
                        const copy = { ...prev };
                        Object.keys(copy).forEach(k => {
                          if (copy[k].selected) {
                            if (val === 'random') {
                              const diffs = ['easy', 'medium', 'hard'];
                              copy[k].difficulty = diffs[Math.floor(Math.random() * diffs.length)];
                            } else {
                              copy[k].difficulty = val;
                            }
                          }
                        });
                        return copy;
                      });
                      e.target.value = ''; // Reset select
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--clr-border, #444)',
                      borderRadius: 4,
                      color: 'var(--clr-accent, #58a6ff)',
                      fontSize: '0.85rem',
                      padding: '2px 8px',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="" disabled selected hidden>Set Difficulty</option>
                    <option value="random">🎲 Shuffle / Random</option>
                    <option value="easy">🟢 Easy</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="hard">🔴 Hard</option>
                    <option value="extrahard">🔥 Extra Hard</option>
                  </select>
                  <span style={{ opacity: 0.4 }}>|</span>
                  <button onClick={() => selectAll(true)} style={{ background: 'transparent', border: 'none', color: 'var(--clr-accent, #58a6ff)', cursor: 'pointer', fontSize: '0.85rem' }}>Select All</button>
                  <span style={{ opacity: 0.4 }}>|</span>
                  <button onClick={() => selectAll(false)} style={{ background: 'transparent', border: 'none', color: 'var(--clr-accent, #58a6ff)', cursor: 'pointer', fontSize: '0.85rem' }}>Clear All</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '60vh', overflowY: 'auto', paddingRight: 8 }}>
                {Object.entries(categories).map(([category, topics]) => (
                  <div key={category}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--clr-accent, #58a6ff)', opacity: 0.9 }}>{category}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {topics.map(topic => {
                        const sel = topicSelection[topic.key];
                        return (
                          <div
                            key={topic.key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              borderRadius: 8,
                              background: sel.selected ? 'rgba(88, 166, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                              border: sel.selected ? '1px solid rgba(88, 166, 255, 0.3)' : '1px solid var(--clr-border, #444)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <input
                                type="checkbox"
                                id={`check-${topic.key}`}
                                checked={sel.selected}
                                onChange={() => handleTopicToggle(topic.key)}
                                style={{ cursor: 'pointer' }}
                              />
                              <label htmlFor={`check-${topic.key}`} style={{ fontWeight: 500, fontSize: '0.95rem', cursor: 'pointer' }}>{topic.name}</label>
                            </div>
                            
                            {sel.selected && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Qty:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={sel.count}
                                    onChange={e => handleTopicChange(topic.key, 'count', Math.max(1, parseInt(e.target.value) || 1))}
                                    style={{ width: 48, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--clr-border, #444)', background: '#000', color: '#fff', textAlign: 'center' }}
                                  />
                                </div>
                                <select
                                  value={sel.difficulty}
                                  onChange={e => handleTopicChange(topic.key, 'difficulty', e.target.value)}
                                  style={{ padding: '4px 6px', borderRadius: 4, border: '1px solid var(--clr-border, #444)', background: '#000', color: '#fff' }}
                                >
                                  <option value="easy">Easy</option>
                                  <option value="medium">Medium</option>
                                  <option value="hard">Hard</option>
                                </select>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading progress / preview mode */}
      {viewMode === 'preview' && (
        <div className="worksheet-preview-container" style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box'
        }}>
          {isGenerating ? (
            <div className="no-print" style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'var(--clr-surface, #1c1c1f)',
              borderRadius: 12,
              border: '1px solid var(--clr-border, #444)',
              width: '100%',
              maxWidth: '600px',
              boxSizing: 'border-box',
              margin: '40px auto'
            }}>
              <svg className="spin" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px auto', display: 'block' }}><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
              <h3 style={{ margin: '0 0 10px 0' }}>Generating customized questions…</h3>
              <p style={{ opacity: 0.7, margin: '0 0 20px 0' }}>Fetching live algorithmic questions from Tenali APIs</p>
              <div style={{ width: '100%', maxWidth: 400, height: 10, background: '#333', borderRadius: 5, margin: '0 auto', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${generationProgress}%`, background: 'var(--clr-accent, #58a6ff)', transition: 'width 0.2s ease-in-out' }} />
              </div>
              <span style={{ display: 'block', marginTop: 10, fontSize: '0.9rem', opacity: 0.6 }}>{generationProgress}% Complete</span>
            </div>
          ) : (
            <div>
              {/* PRINT CONTAINER (Will be styled differently in print stylesheet) */}
              <div className="worksheet-print-layout" style={{
                background: '#ffffff',
                color: '#000000',
                padding: '40px',
                borderRadius: 8,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                fontFamily: '"Lexend", "Inter", sans-serif',
                maxWidth: '800px',
                margin: '0 auto',
              }}>
                {/* Header */}
                <div style={{ borderBottom: '2px solid #000000', paddingBottom: 16, marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#000000' }}>{settings.title}</h1>
                    <span style={{ fontSize: '0.9rem', color: '#555555' }}>ID: {Math.random().toString(36).substring(2, 8).toUpperCase()}</span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '1rem', color: '#444444' }}>{settings.subtitle}</p>
                  
                  {/* Name and Date Fields */}
                  <div style={{ display: 'flex', gap: 40, marginTop: 20 }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 'bold', marginRight: 8, fontSize: '0.95rem' }}>Student Name:</span>
                      <div style={{ flex: 1, borderBottom: '1px dotted #000000', height: 18 }} />
                    </div>
                    <div style={{ width: 180, display: 'flex', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 'bold', marginRight: 8, fontSize: '0.95rem' }}>Date:</span>
                      <div style={{ flex: 1, borderBottom: '1px dotted #000000', height: 18 }} />
                    </div>
                  </div>
                </div>

                {/* Questions Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: settings.columns === '2' ? '1fr 1fr' : '1fr',
                  columnGap: 40,
                  rowGap: 24
                }}>
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="question-item"
                      style={{
                        position: 'relative',
                        padding: '10px 0',
                        breakInside: 'avoid',
                      }}
                    >


                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontWeight: 'bold', minWidth: 24 }}>{idx + 1}.</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ whiteSpace: 'pre-line', fontSize: '1.05rem', fontWeight: 500, lineHeight: 1.4 }}>
                            {getPromptText(q.type, q.data)}
                          </div>
                          
                          {/* Workspace slots depending on density */}
                          {settings.layout === 'standard' && (
                            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ borderBottom: '1px solid #e0e0e0', height: 20, width: '90%' }} />
                              <div style={{ borderBottom: '1px solid #e0e0e0', height: 20, width: '90%' }} />
                            </div>
                          )}

                          {settings.layout === 'spacious' && (
                            <div style={{
                              marginTop: 12,
                              height: 100,
                              width: '95%',
                              border: '1px dashed #cccccc',
                              borderRadius: 4,
                              background: 'repeating-linear-gradient(0deg, transparent, transparent 19px, #f5f5f5 19px, #f5f5f5 20px)',
                            }} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer (Offline explanation notice) */}
                <div style={{ marginTop: 40, borderTop: '1px solid #dddddd', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#666666' }}>
                  <span>Generated by Tenali Adaptive Learning Platform</span>
                  <span>Practice makes perfect!</span>
                </div>
              </div>

              {/* ANSWER KEY SECTION (Rendered on a separate page for print) */}
              {settings.showAnswerKey && (
                <div className="worksheet-print-layout page-break" style={{
                  background: '#ffffff',
                  color: '#000000',
                  padding: '40px',
                  borderRadius: 8,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  fontFamily: '"Lexend", "Inter", sans-serif',
                  maxWidth: '800px',
                  margin: '40px auto 0 auto',
                }}>
                  <div style={{ borderBottom: '2px solid #000000', paddingBottom: 16, marginBottom: 24 }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold' }}>Answer Key</h1>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem', color: '#555555' }}>For {settings.title}</p>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    columnGap: 40,
                    rowGap: 16
                  }}>
                    {questions.map((q, idx) => (
                      <div key={`ans-${q.id}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '1rem' }}>
                        <span style={{ fontWeight: 'bold', minWidth: 24 }}>{idx + 1}.</span>
                        <div style={{ fontWeight: 'bold', color: '#000000' }}>
                          {q.answer || getAnswerText(q.type, q.data)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
