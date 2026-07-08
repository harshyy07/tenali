import React, { useState } from 'react';
import './PercentExplanationApp.css';

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ HELPER UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function gcd(a, b) {
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function randInt(lo, hi) {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function pickFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Replace any distractor that collides with `correct` or with a prior distractor.
 * Falls back to a pool of mathematically-plausible alternatives (×2, ×1.5, ÷2 …).
 */
function avoidCollisions(correct, rawDistractors) {
  const used = new Set([correct]);
  const fallbacks = [
    Math.round(correct * 2),
    Math.round(correct * 3),
    Math.round(correct * 1.5),
    Math.round(correct / 2),
    Math.round(correct * 4),
    correct + 10,
    correct - 10,
    correct + 5,
    correct - 5,
    correct + 1,
  ].filter(v => v > 0 && Number.isFinite(v) && Number.isInteger(v));

  let fbIdx = 0;
  return rawDistractors.map(d => {
    if (Number.isFinite(d) && d > 0 && !used.has(d)) {
      used.add(d);
      return d;
    }
    while (fbIdx < fallbacks.length && used.has(fallbacks[fbIdx])) fbIdx++;
    const rep = fbIdx < fallbacks.length ? fallbacks[fbIdx] : correct + 100 + fbIdx;
    used.add(rep);
    fbIdx++;
    return rep;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION TEMPLATES  (20 real-life scenarios)
//
// Per-template:
//   percents   – plausible percent values for this context  (no 75% restaurant tip!)
//   totalRange – [lo, hi] for the "whole" quantity          (realistic for the scenario)
//   generate(percent, total) → { question, correct, d1, d2, d3, fmt }
//     d1  = "just write the percent number" mistake
//     d2  = context-specific distractor (leftover, bill+tip, etc.)
//     d3  = 10%-benchmark mistake  (total / 10)
//     fmt = v → display string shown in option button
//
// Whole-number guarantee:  total = step × k,  step = 100 / gcd(percent, 100)
// → (percent × total) / 100 is always an exact integer.
// ─────────────────────────────────────────────────────────────────────────────

const TEMPLATES = [
  /* 0 ── DISCOUNT ─────────────────────────────────────────────────────────── */
  {
    percents: [10, 15, 20, 25, 30, 35, 40, 50],
    totalRange: [100, 2000],
    generate(percent, total) {
      const item = pickFrom(['shirt', 'bag', 'watch', 'book', 'jacket', 'shoes', 'cap', 'belt']);
      const correct = (percent * total) / 100;
      return {
        question: `A ${item} costs ₹${total}. There's a ${percent}% discount. How much is the discount in ₹?`,
        correct,
        d1: percent,            // "the answer is just the % number"
        d2: total - correct,    // final price after discount (wrong: confusing discount with final price)
        d3: total / 10,         // 10% benchmark
        fmt: v => `₹${v}`,
      };
    },
  },

  /* 1 ── EXAM MARKS ────────────────────────────────────────────────────────── */
  {
    percents: [10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75],
    totalRange: [20, 500],
    generate(percent, total) {
      const correct = (percent * total) / 100;
      return {
        question: `A test is out of ${total} marks. You need ${percent}% to pass. How many marks is that?`,
        correct,
        d1: percent,
        d2: total - correct,    // marks above pass threshold (wrong: "remaining" marks)
        d3: total / 10,
        fmt: v => `${v} marks`,
      };
    },
  },

  /* 2 ── SPORTS STAT ───────────────────────────────────────────────────────── */
  {
    percents: [10, 15, 20, 25, 30, 35, 40, 45, 50],
    totalRange: [40, 600],
    generate(percent, total) {
      const name = pickFrom(['Priya', 'Arjun', 'Ravi', 'Meera', 'Kiran', 'Sahil', 'Ananya', 'Dev']);
      const sport = pickFrom(['runs', 'points', 'goals']);
      const correct = (percent * total) / 100;
      return {
        question: `${name} scored ${percent}% of the team's total of ${total} ${sport}. How many ${sport} did ${name} score?`,
        correct,
        d1: percent,
        d2: total - correct,    // rest of team's contribution
        d3: total / 10,
        fmt: v => `${v} ${sport}`,
      };
    },
  },

  /* 3 ── RESTAURANT TIP  (percents capped at 25% — realistic tip range) ───── */
  {
    percents: [5, 10, 12, 15, 18, 20, 25],
    totalRange: [80, 3000],
    generate(percent, total) {
      const correct = (percent * total) / 100;
      return {
        question: `A restaurant bill is ₹${total}. You leave a ${percent}% tip. How much is the tip in ₹?`,
        correct,
        d1: percent,
        d2: total + correct,    // bill + tip (wrong: confusing tip with total paid)
        d3: total / 10,
        fmt: v => `₹${v}`,
      };
    },
  },

  /* 4 ── RECIPE (ingredient scaling) ──────────────────────────────────────── */
  {
    percents: [10, 15, 20, 25, 30, 40, 50],
    totalRange: [100, 2000],
    generate(percent, total) {
      const ingredient = pickFrom(['flour', 'rice', 'sugar', 'oats', 'lentils', 'wheat']);
      const correct = (percent * total) / 100;
      return {
        question: `A full recipe uses ${total}g of ${ingredient}. You want to make only ${percent}% of the full batch. How many grams of ${ingredient} do you need?`,
        correct,
        d1: percent,
        d2: total - correct,    // remaining ingredient (wrong: confusing portion with remainder)
        d3: total / 10,
        fmt: v => `${v}g`,
      };
    },
  },

  /* 5 ── LIBRARY ───────────────────────────────────────────────────────────── */
  {
    percents: [5, 10, 15, 20, 25, 30, 40, 50],
    totalRange: [50, 1000],
    generate(percent, total) {
      const genre = pickFrom(['fiction', 'science', 'history', 'biography', "children's"]);
      const correct = (percent * total) / 100;
      return {
        question: `A library has ${total} books. ${percent}% of them are ${genre} books. How many ${genre} books are there?`,
        correct,
        d1: percent,
        d2: total - correct,    // non-genre books
        d3: total / 10,
        fmt: v => `${v} books`,
      };
    },
  },

  /* 6 ── ELECTION ──────────────────────────────────────────────────────────── */
  {
    percents: [10, 15, 20, 25, 30, 35, 40, 45, 50, 60],
    totalRange: [200, 5000],
    generate(percent, total) {
      const name = pickFrom(['Candidate A', 'Candidate B', 'Party X', 'Party Y', 'Candidate C']);
      const correct = (percent * total) / 100;
      return {
        question: `There are ${total} votes cast in total. ${name} receives ${percent}% of the votes. How many votes did ${name} get?`,
        correct,
        d1: percent,
        d2: total - correct,    // votes for all other candidates combined
        d3: total / 10,
        fmt: v => `${v} votes`,
      };
    },
  },

  /* 7 ── INTERNET DATA (MB per day)  (percents ≤ 75%, realistic usage) ────── */
  {
    percents: [10, 20, 25, 30, 40, 50, 60, 75],
    totalRange: [100, 2000],
    generate(percent, total) {
      const correct = (percent * total) / 100;
      return {
        question: `Your daily internet plan gives you ${total} MB of data. You have used ${percent}% of it. How many MB have you used?`,
        correct,
        d1: percent,
        d2: total - correct,    // remaining data
        d3: total / 10,
        fmt: v => `${v} MB`,
      };
    },
  },

  /* 8 ── PHONE BATTERY (mAh)  (percents across full 5–75% range) ──────────── */
  {
    percents: [5, 10, 15, 20, 25, 30, 40, 50, 60, 75],
    totalRange: [1000, 6000],
    generate(percent, total) {
      const correct = (percent * total) / 100;
      return {
        question: `A phone battery has a full capacity of ${total} mAh. It is currently charged to ${percent}%. How many mAh is that?`,
        correct,
        d1: percent,
        d2: total - correct,    // remaining charge
        d3: total / 10,
        fmt: v => `${v} mAh`,
      };
    },
  },

  /* 9 ── GARDEN AREA (sq m) ────────────────────────────────────────────────── */
  {
    percents: [10, 15, 20, 25, 30, 40, 50],
    totalRange: [40, 800],
    generate(percent, total) {
      const plant = pickFrom(['flowers', 'vegetables', 'herbs', 'grass', 'fruit trees']);
      const correct = (percent * total) / 100;
      return {
        question: `A garden covers ${total} square metres. ${percent}% of it is used for ${plant}. How many square metres is used for ${plant}?`,
        correct,
        d1: percent,
        d2: total - correct,    // rest of the garden
        d3: total / 10,
        fmt: v => `${v} sq m`,
      };
    },
  },

  /* 10 ── TRAIN SEATS ──────────────────────────────────────────────────────── */
  {
    percents: [10, 15, 20, 25, 30, 40, 50, 60],
    totalRange: [50, 500],
    generate(percent, total) {
      const correct = (percent * total) / 100;
      return {
        question: `A train has ${total} seats in total. ${percent}% of the seats are occupied. How many seats are taken?`,
        correct,
        d1: percent,
        d2: total - correct,    // empty seats
        d3: total / 10,
        fmt: v => `${v} seats`,
      };
    },
  },

  /* 11 ── EXAM PASS RATE (students) ────────────────────────────────────────── */
  {
    percents: [10, 20, 25, 30, 40, 50, 60, 75],
    totalRange: [20, 200],
    generate(percent, total) {
      const correct = (percent * total) / 100;
      return {
        question: `${total} students sat an exam. ${percent}% of them passed. How many students passed?`,
        correct,
        d1: percent,
        d2: total - correct,    // students who failed
        d3: total / 10,
        fmt: v => `${v} students`,
      };
    },
  },

  /* 12 ── CRICKET RUNS ─────────────────────────────────────────────────────── */
  {
    percents: [10, 15, 20, 25, 30, 35, 40, 45, 50],
    totalRange: [50, 400],
    generate(percent, total) {
      const name = pickFrom(['Rohit', 'Virat', 'Dhoni', 'Jadeja', 'Rahul', 'Hardik', 'Shami']);
      const correct = (percent * total) / 100;
      return {
        question: `India scored ${total} runs in total. ${name} scored ${percent}% of those runs. How many runs did ${name} score?`,
        correct,
        d1: percent,
        d2: total - correct,    // runs scored by the rest of the team
        d3: total / 10,
        fmt: v => `${v} runs`,
      };
    },
  },

  /* 13 ── SHOPPING CART COUPON  (discount ≤ 30% — realistic) ──────────────── */
  {
    percents: [5, 10, 12, 15, 20, 25, 30],
    totalRange: [200, 5000],
    generate(percent, total) {
      const correct = (percent * total) / 100;
      return {
        question: `Your shopping cart total is ₹${total}. You apply a ${percent}% coupon. How much do you save in ₹?`,
        correct,
        d1: percent,
        d2: total - correct,    // price after coupon (wrong: confusing discount with final price)
        d3: total / 10,
        fmt: v => `₹${v}`,
      };
    },
  },

  /* 14 ── PLAYLIST ─────────────────────────────────────────────────────────── */
  {
    percents: [10, 15, 20, 25, 30, 40, 50],
    totalRange: [20, 200],
    generate(percent, total) {
      const genre = pickFrom(['pop', 'rock', 'classical', 'jazz', 'hip-hop', 'folk']);
      const correct = (percent * total) / 100;
      return {
        question: `A playlist has ${total} songs. ${percent}% of them are ${genre}. How many ${genre} songs are there?`,
        correct,
        d1: percent,
        d2: total - correct,    // songs of other genres
        d3: total / 10,
        fmt: v => `${v} songs`,
      };
    },
  },

  /* 15 ── EVENT ATTENDANCE ─────────────────────────────────────────────────── */
  {
    percents: [10, 15, 20, 25, 30, 40, 50, 60, 75],
    totalRange: [100, 2000],
    generate(percent, total) {
      const event = pickFrom(['concert', 'sports match', 'conference', 'festival', 'theatre show']);
      const correct = (percent * total) / 100;
      return {
        question: `A ${event} venue has a capacity of ${total} people. ${percent}% of the seats are filled. How many people attended?`,
        correct,
        d1: percent,
        d2: total - correct,    // empty seats
        d3: total / 10,
        fmt: v => `${v} people`,
      };
    },
  },

  /* 16 ── MONTHLY DATA PLAN (GB)  (realistic 10–100 GB plan range) ─────────── */
  {
    percents: [10, 15, 20, 25, 30, 40, 50, 60, 75],
    totalRange: [10, 100],
    generate(percent, total) {
      const correct = (percent * total) / 100;
      return {
        question: `Your monthly data plan is ${total} GB. You have already used ${percent}% of it. How many GB have you used?`,
        correct,
        d1: percent,
        d2: total - correct,    // remaining data
        d3: total / 10,
        fmt: v => `${v} GB`,
      };
    },
  },

  /* 17 ── SCHOOL CLUB ──────────────────────────────────────────────────────── */
  {
    percents: [10, 15, 20, 25, 30, 40, 50],
    totalRange: [20, 400],
    generate(percent, total) {
      const activity = pickFrom(['football', 'basketball', 'chess', 'debate', 'swimming', 'art', 'coding']);
      const correct = (percent * total) / 100;
      return {
        question: `A school has ${total} students. ${percent}% of them joined the ${activity} club. How many students is that?`,
        correct,
        d1: percent,
        d2: total - correct,    // students not in the club
        d3: total / 10,
        fmt: v => `${v} students`,
      };
    },
  },

  /* 18 ── FUEL TANK (litres)  (realistic 20–100 L tank range) ─────────────── */
  {
    percents: [10, 20, 25, 30, 40, 50, 60, 75],
    totalRange: [20, 100],
    generate(percent, total) {
      const correct = (percent * total) / 100;
      return {
        question: `A car's fuel tank holds ${total} litres when full. The tank is currently ${percent}% full. How many litres of fuel are in the tank?`,
        correct,
        d1: percent,
        d2: total - correct,    // empty portion of the tank
        d3: total / 10,
        fmt: v => `${v} litres`,
      };
    },
  },

  /* 19 ── POCKET MONEY  (savings ≤ 50% — believable range) ────────────────── */
  {
    percents: [5, 10, 15, 20, 25, 30, 40, 50],
    totalRange: [50, 2000],
    generate(percent, total) {
      const name = pickFrom(['Priya', 'Ravi', 'Meera', 'Arjun', 'Sahil', 'Neha', 'Dev']);
      const action = pickFrom(['saved', 'spent on snacks', 'donated to charity', 'used for stationery', 'spent at the bookstore']);
      const correct = (percent * total) / 100;
      return {
        question: `${name} gets ₹${total} as pocket money each week. ${name} ${action} ${percent}% of it. How much is that in ₹?`,
        correct,
        d1: percent,
        d2: total - correct,    // remaining pocket money
        d3: total / 10,
        fmt: v => `₹${v}`,
      };
    },
  },
];

/**
 * Generate a fresh question, excluding the template used last time.
 * Uses GCD-based step to guarantee a whole-number answer.
 * Applies collision avoidance so no distractor equals the correct answer.
 *
 * @param {number} lastTemplateIdx  index of the previous template (-1 = none)
 * @param {number} attempt          recursion-depth guard
 */
function generateQuestion(lastTemplateIdx = -1, attempt = 0) {
  if (attempt > 30) lastTemplateIdx = -1; // safety: stop excluding after many retries

  const available = TEMPLATES.reduce((acc, _, i) => {
    if (i !== lastTemplateIdx) acc.push(i);
    return acc;
  }, []);

  const templateIdx = pickFrom(available);
  const template = TEMPLATES[templateIdx];

  const percent = pickFrom(template.percents);
  const step = 100 / gcd(percent, 100); // smallest total that gives whole answer

  const [lo, hi] = template.totalRange;
  const kLo = Math.ceil(lo / step);
  const kHi = Math.floor(hi / step);

  if (kLo > kHi) {
    // This percent × range combo has no valid integer multiple — try again
    return generateQuestion(lastTemplateIdx, attempt + 1);
  }

  const total = step * randInt(kLo, kHi);
  const { question, correct, d1, d2, d3, fmt } = template.generate(percent, total);

  // Collision avoidance: replace any distractor that equals `correct` or a sibling
  const [safe1, safe2, safe3] = avoidCollisions(correct, [d1, d2, d3]);

  const options = shuffle([correct, safe1, safe2, safe3]).map(v => ({
    value: v,
    label: fmt(v),
  }));

  return { templateIdx, question, correct, options };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export default function PercentExplanationApp({ onBack, PercentApp }) {
  // Views: 'LEVELS' | 'EXPLANATION_L1' | 'QUIZ'
  const [view, setView] = useState('LEVELS');
  const [initialStep, setInitialStep] = useState(null);
  const [percentQuizSession, setPercentQuizSession] = useState(null);
  const [pendingEscalationSkill, setPendingEscalationSkill] = useState(null);
  const [mistakeHistory, setMistakeHistory] = useState({
    convert_percent_to_decimal: { questionIds: [], escalatedQuestionIds: [] },
    multiply_by_whole: { questionIds: [], escalatedQuestionIds: [] },
  });

  if (view === 'QUIZ') {
    return (
      <PercentApp
        onBack={() => setView('LEVELS')}
        onRedirectToExplanation={(step) => {
          setInitialStep(step);
          setView('EXPLANATION_L1');
        }}
        quizSession={percentQuizSession}
        setQuizSession={setPercentQuizSession}
        mistakeHistory={mistakeHistory}
        setMistakeHistory={setMistakeHistory}
        pendingEscalationSkill={pendingEscalationSkill}
        setPendingEscalationSkill={setPendingEscalationSkill}
      />
    );
  }

  return (
    <div className="percent-exp-container">
      {view === 'LEVELS' ? (
        <LevelsSelectView
          onBack={onBack}
          onSelectLevel={(lvl) => setView(`EXPLANATION_L${lvl}`)}
        />
      ) : (
        <Level1ExplanationView
          onBack={() => setView('LEVELS')}
          onContinueToQuiz={() => setView('QUIZ')}
          initialStep={initialStep}
          clearInitialStep={() => setInitialStep(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. LEVELS SELECTION VIEW  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function LevelsSelectView({ onBack, onSelectLevel }) {
  const levels = [
    { id: 1, title: 'Level 1: Find a Percentage',   desc: 'Learn how to calculate a basic part of a whole (e.g., 20% of 80).', active: true },
    { id: 2, title: 'Level 2: Increase / Decrease', desc: 'Understand percentages as markups, discounts, or growth.',           active: false },
    { id: 3, title: 'Level 3: Reverse Percentage',  desc: 'Find the original quantity when given the percentage result.',        active: false },
    { id: 4, title: 'Level 4: Compound Percentage', desc: 'Apply successive percentage changes over multiple intervals.',        active: false },
  ];

  return (
    <div className="levels-layout">
      <div className="header-row">
        <button className="back-button" onClick={onBack}>← Home</button>
      </div>

      <h1 className="title-serif">Percentages</h1>
      <p className="subtitle-body">Master percentage concepts step-by-step through interactive explanations.</p>

      <div className="levels-grid">
        {levels.map((lvl) => (
          <div
            key={lvl.id}
            className={`level-card ${lvl.active ? 'active' : 'locked'}`}
            onClick={() => lvl.active && onSelectLevel(lvl.id)}
          >
            <div className="level-badge">{lvl.active ? 'Ready' : 'Locked'}</div>
            <h3>{lvl.title}</h3>
            <p>{lvl.desc}</p>
            {lvl.active
              ? <button className="learn-btn">Start Learning →</button>
              : <span className="coming-soon">Coming Soon</span>
            }
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. LEVEL 1 EXPLANATION VIEW
// ─────────────────────────────────────────────────────────────────────────────

function Level1ExplanationView({ onBack, onContinueToQuiz, initialStep, clearInitialStep }) {
  React.useEffect(() => {
    if (initialStep) {
      setTimeout(() => {
        let el = null;
        if (initialStep === 'convert') {
          el = document.querySelector('.theory-card');
        } else if (initialStep === 'multiply') {
          el = document.querySelector('.example-card');
        }
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.transition = 'background-color 0.5s ease, border-color 0.5s ease';
          el.style.backgroundColor = 'rgba(232, 134, 74, 0.25)';
          el.style.borderColor = 'var(--clr-accent)';
          setTimeout(() => {
            el.style.backgroundColor = '';
            el.style.borderColor = '';
          }, 2500);
        }
        if (clearInitialStep) clearInitialStep();
      }, 300);
    }
  }, [initialStep, clearInitialStep]);

  // ── Interactive visual ──
  const [percent, setPercent]         = useState(25);
  const [whole, setWhole]             = useState(200);
  const [customWhole, setCustomWhole] = useState('200');

  // ── Theory reveal ──
  const [theoryStep, setTheoryStep]   = useState(1);
  const totalTheorySteps              = 4;

  // ── Worked example reveal ──
  const [exampleStep, setExampleStep] = useState(1);
  const totalExampleSteps             = 4;

  // ── Clipboard ──
  const [copied, setCopied]           = useState(false);

  // ── Quiz gate ──
  const [quizPassed, setQuizPassed]   = useState(false);

  const handleWholeChange = (e) => {
    const val = e.target.value;
    setCustomWhole(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 10000) setWhole(parsed);
  };

  const setWholePreset = (val) => {
    setWhole(val);
    setCustomWhole(String(val));
  };

  const calculatedPart = ((percent / 100) * whole).toFixed(1).replace(/\.0$/, '');

  const aiPromptText = `Explain the concept of 'finding a percentage of a whole number' using a simple real-life analogy. Detail the step-by-step method, and explain why dividing the percentage by 100 works. Keep the explanation general without using specific numerical values.`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(aiPromptText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Both theory AND example must be fully revealed before the quiz gate appears
  const isExplanationFinished =
    theoryStep === totalTheorySteps && exampleStep === totalExampleSteps;

  return (
    <div className="explanation-layout">
      <div className="header-row">
        <button className="back-button" onClick={onBack}>← Levels</button>
      </div>

      <h1 className="title-serif">Level 1: Find a Percentage</h1>
      <p className="subtitle-body">
        Interact with the visual model below to build your intuition, then check
        the theory and worked example.
      </p>

      {/* ── SECTION A: INTERACTIVE VISUAL ── */}
      <div className="explanation-card interactive-card">
        <h2 className="section-title">1. Interactive Visual Model</h2>
        <p className="section-subtitle">
          Drag the slider and select different wholes to see how percentages
          represent parts of a quantity.
        </p>

        <div className="equation-banner">
          <div className="math-display">
            Find <span className="highlight-accent">{percent}%</span> of{' '}
            <span className="highlight-purple">{whole}</span>
            <span className="equals"> = </span>
            <span className="highlight-green">{calculatedPart}</span>
          </div>
          <div className="math-breakdown">
            ({percent} / 100) × {whole} = {(percent / 100).toFixed(2)} × {whole} = {calculatedPart}
          </div>
        </div>

        <div className="percent-bar-wrapper">
          <div className="percent-bar-labels">
            <span>0</span>
            <span>{whole / 4}</span>
            <span>{whole / 2}</span>
            <span>{(3 * whole) / 4}</span>
            <span>{whole}</span>
          </div>
          <div className="percent-bar-container">
            <div className="percent-bar-track"></div>
            <div className="percent-bar-fill" style={{ width: `${percent}%` }}>
              <span className="percent-fill-label">{percent}%</span>
            </div>
          </div>
        </div>

        <div className="controls-row">
          <div className="control-group slider-group">
            <label>Percentage: <strong>{percent}%</strong></label>
            <input
              type="range" min="0" max="100" step="1" value={percent}
              onChange={(e) => setPercent(parseInt(e.target.value, 10))}
              className="accent-slider"
            />
          </div>

          <div className="control-group whole-group">
            <label>Whole Amount: <strong>{whole}</strong></label>
            <div className="presets-row">
              {[50, 100, 200, 500].map((preset) => (
                <button
                  key={preset}
                  className={`preset-btn ${whole === preset ? 'active' : ''}`}
                  onClick={() => setWholePreset(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="custom-input-wrapper">
              <span className="input-prefix">Custom:</span>
              <input
                type="text"
                value={customWhole}
                onChange={handleWholeChange}
                placeholder="E.g., 80"
                className="whole-text-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION B: CONCEPT THEORY ── */}
      <div className="explanation-card theory-card">
        <h2 className="section-title">2. Concept Theory</h2>

        <div className="theory-steps-list">
          {theoryStep >= 1 && (
            <div className="step-item fade-in">
              <div className="step-num">1</div>
              <div className="step-content">
                <strong>What is a percentage?</strong> A percentage is a way of
                expressing a quantity as a fraction of 100. The term comes from
                the Latin <em>per centum</em>, meaning "by the hundred."
              </div>
            </div>
          )}
          {theoryStep >= 2 && (
            <div className="step-item fade-in">
              <div className="step-num">2</div>
              <div className="step-content">
                <strong>Visualize the grid:</strong> Imagine the whole amount
                (e.g., {whole}) is divided into 100 equal parts. Each part
                contains 1% of the total. For {whole}, each 1% is equal to{' '}
                {whole / 100}.
              </div>
            </div>
          )}
          {theoryStep >= 3 && (
            <div className="step-item fade-in">
              <div className="step-content">
                <strong>Converting the Percent:</strong> To make it ready for
                calculation, we convert the percentage sign into a divisor of
                100. So {percent}% is written as{' '}
                <span className="monospace">({percent} / 100)</span> or{' '}
                <span className="monospace">{(percent / 100).toFixed(2)}</span>.
              </div>
            </div>
          )}
          {theoryStep >= 4 && (
            <div className="step-item fade-in">
              <div className="step-num">4</div>
              <div className="step-content">
                <strong>The General Formula:</strong> To calculate the part,
                scale the whole amount by this fraction:
                <div className="formula-block">Part = (Percent / 100) × Whole</div>
              </div>
            </div>
          )}
        </div>

        {theoryStep < totalTheorySteps ? (
          <button
            className="next-reveal-btn"
            onClick={() => setTheoryStep(prev => prev + 1)}
          >
            Next Idea
          </button>
        ) : (
          <div className="completion-badge">✓ Theory Completed</div>
        )}
      </div>

      {/* ── SECTION C: WORKED EXAMPLE ── */}
      <div className="explanation-card example-card">
        <h2 className="section-title">3. Step-by-Step Worked Example</h2>
        <p className="section-subtitle">Problem: Find 15% of 80.</p>

        <div className="example-steps-list">
          {exampleStep >= 1 && (
            <div className="step-item fade-in">
              <div className="step-indicator">Step 1</div>
              <div className="step-content">
                Convert the percentage to a fraction over 100:
                <div className="math-equation">15% = 15 / 100</div>
              </div>
            </div>
          )}
          {exampleStep >= 2 && (
            <div className="step-item fade-in">
              <div className="step-indicator">Step 2</div>
              <div className="step-content">
                Set up the multiplication equation by scaling the whole amount:
                <div className="math-equation">(15 / 100) × 80</div>
              </div>
            </div>
          )}
          {exampleStep >= 3 && (
            <div className="step-item fade-in">
              <div className="step-indicator">Step 3</div>
              <div className="step-content">
                Convert the fraction to a decimal to simplify the math:
                <div className="math-equation">0.15 × 80</div>
              </div>
            </div>
          )}
          {exampleStep >= 4 && (
            <div className="step-item fade-in">
              <div className="step-indicator">Step 4</div>
              <div className="step-content">
                Multiply to get the final answer:
                <div className="math-equation">0.15 × 80 = 12</div>
                <p style={{ marginTop: '8px', color: 'var(--clr-correct)' }}>
                  So, <strong>15% of 80 is 12</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {exampleStep < totalExampleSteps ? (
          <button
            className="next-reveal-btn"
            onClick={() => setExampleStep(prev => prev + 1)}
          >
            Next Step
          </button>
        ) : (
          <div className="completion-badge">✓ Example Completed</div>
        )}
      </div>

      {/* ── SECTION D: AI STUDY ASSISTANT PROMPT ── */}
      <div className="explanation-card prompt-card">
        <h2 className="section-title">4. AI Study Assistant Prompt</h2>
        <p className="section-subtitle">
          Copy this generic prompt and paste it into any AI chat tool (like
          Gemini or ChatGPT) for further personalised analogies and drills.
        </p>

        <div className="prompt-box">
          <p className="prompt-content-text">{aiPromptText}</p>
          <button
            className={`copy-btn ${copied ? 'copied' : ''}`}
            onClick={copyToClipboard}
          >
            {copied ? '✓ Copied!' : '📋 Copy Prompt'}
          </button>
        </div>
      </div>

      {/* ── SECTION E: MICRO-QUIZ GATE (appears only after theory + example done) ── */}
      {isExplanationFinished && (
        <div className="explanation-card quiz-gate-card fade-in">
          <h2 className="section-title">
            5. Quick Check Quiz
            <span className="ungraded-badge">Ungraded</span>
          </h2>
          <p className="section-subtitle">
            Answer <strong>3 out of 4</strong> questions correctly to unlock
            "Continue to Practice". Questions are freshly generated every
            time — no two will ever be the same.
          </p>

          <MicroQuiz onPass={() => setQuizPassed(true)} />
        </div>
      )}

      {/* ── FINISH BLOCK (always visible once explanation done; button locked until quiz passed) ── */}
      {isExplanationFinished && (
        <div
          className={`finish-action-block fade-in ${
            quizPassed ? 'quiz-unlocked' : 'quiz-locked'
          }`}
        >
          {quizPassed ? (
            <p>🎉 Well done! You have passed the quiz and are ready to practise.</p>
          ) : (
            <p>Complete the Quick Check Quiz above to unlock practice.</p>
          )}
          <button
            className="continue-practice-btn"
            onClick={onContinueToQuiz}
            disabled={!quizPassed}
            aria-disabled={!quizPassed}
          >
            {quizPassed ? 'Continue to Practice Quiz →' : '🔒 Complete Quiz to Unlock'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MICRO QUIZ COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function MicroQuiz({ onPass }) {
  // phase: 'question' | 'feedback' | 'passed'
  const [phase,        setPhase]        = useState('question');
  const [currentQ,     setCurrentQ]     = useState(() => generateQuestion(-1));
  const [roundResults, setRoundResults] = useState([]); // booleans for current 4-question round
  const [failedRounds, setFailedRounds] = useState(0);
  const [lastFeedback, setLastFeedback] = useState(null); // 'correct' | 'wrong'

  const questionNumInRound = roundResults.length + 1; // 1–4

  const handleSelect = (optionValue) => {
    if (phase !== 'question') return;

    const isCorrect     = optionValue === currentQ.correct;
    const newResults    = [...roundResults, isCorrect];

    setLastFeedback(isCorrect ? 'correct' : 'wrong');
    setPhase('feedback');

    setTimeout(() => {
      if (newResults.length === 4) {
        // End of round — evaluate pass threshold
        const correctCount = newResults.filter(Boolean).length;
        if (correctCount >= 3) {
          setPhase('passed');
          onPass();
        } else {
          // Failed round → start a new one
          setFailedRounds(prev => prev + 1);
          setRoundResults([]);
          setCurrentQ(generateQuestion(currentQ.templateIdx));
          setLastFeedback(null);
          setPhase('question');
        }
      } else {
        // Continue this round with next question from a different template
        setRoundResults(newResults);
        setCurrentQ(generateQuestion(currentQ.templateIdx));
        setLastFeedback(null);
        setPhase('question');
      }
    }, 1400);
  };

  /* ── PASSED STATE ─────────────────────────────────────────────────── */
  if (phase === 'passed') {
    return (
      <div className="quiz-success-state fade-in">
        <div className="quiz-success-icon">🎉</div>
        <h3 className="quiz-success-title">Quiz Passed!</h3>
        <p className="quiz-success-body">
          You answered at least 3 out of 4 correctly — you're ready to practise!
        </p>
      </div>
    );
  }

  /* ── ACTIVE QUIZ ──────────────────────────────────────────────────── */
  return (
    <div className="micro-quiz-inner">

      {/* Round label + 4 progress dots */}
      <div className="quiz-round-header">
        <span className="quiz-round-label">
          Round {failedRounds + 1} · Question {questionNumInRound} of 4
        </span>
        <div className="quiz-dots">
          {[0, 1, 2, 3].map(i => {
            const cls =
              i < roundResults.length
                ? roundResults[i] ? 'correct' : 'wrong'
                : i === roundResults.length
                ? 'current'
                : 'pending';
            return <span key={i} className={`quiz-dot ${cls}`} />;
          })}
        </div>
      </div>

      {/* Question */}
      <p className="quiz-question-text">{currentQ.question}</p>

      {/* 2 × 2 options grid */}
      <div className="quiz-options-grid">
        {currentQ.options.map((opt, i) => (
          <button
            key={i}
            className="quiz-option-btn"
            onClick={() => handleSelect(opt.value)}
            disabled={phase === 'feedback'}
          >
            <span className="opt-letter">{['A', 'B', 'C', 'D'][i]}</span>
            <span className="opt-label">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Inline feedback (disappears with next question load) */}
      {phase === 'feedback' && (
        <div className={`quiz-feedback-msg ${lastFeedback} fade-in`}>
          {lastFeedback === 'correct'
            ? '✓ Correct! Loading next question…'
            : 'Not quite — revisit the theory above and try the next one.'}
        </div>
      )}

      {/* Nudge banner: shown permanently after 2 failed rounds */}
      {failedRounds >= 2 && (
        <div className="quiz-nudge fade-in">
          <span className="nudge-icon">💡</span>
          <span>
            Still finding this tricky? Try the copy-paste prompt above in any
            AI chat tool for more real-life examples.
          </span>
        </div>
      )}
    </div>
  );
}
