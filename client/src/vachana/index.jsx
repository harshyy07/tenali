/**
 * @fileoverview Vachana Mathematical Literacy Lab — Main Orchestrator
 *
 * This module is the entry point for the Vachana section of Tenali.
 * It:
 *   - Reads window.location.pathname to pre-select a tab on load
 *   - Uses history.pushState to update the URL when a tab is selected
 *   - Renders the dashboard grid or the active exercise workspace
 *   - Imports all 21 exercise components from ./exercises/
 *
 * URL scheme (no router library — matches the existing App.jsx pattern):
 *   /vachana          → Vachana dashboard (activeTab = null)
 *   /vachana/vocab    → Vocab Explorer
 *   /vachana/dissector → Sentence Dissector
 *   ... etc.
 *
 * Adding a new exercise:
 *   1. Create client/src/vachana/exercises/MyExercise.jsx
 *   2. Add an entry to TABS below
 *   3. Import and register the component in EXERCISE_COMPONENTS
 *   That's it. App.jsx does not need to change.
 */

import { useState, useEffect } from 'react';
import VachanaIcons from './VachanaIcons';

// Exercise components
import VocabExplorer from './exercises/VocabExplorer';
import SentenceDissector from './exercises/SentenceDissector';
import TranslateEnglishMath from './exercises/TranslateEnglishMath';
import InversionDetector from './exercises/InversionDetector';
import StoryWeaver from './exercises/StoryWeaver';
import DependencyGraph from './exercises/DependencyGraph';
import ReadabilityAnalyzer from './exercises/ReadabilityAnalyzer';
import PronounResolver from './exercises/PronounResolver';
import NoiseFilter from './exercises/NoiseFilter';
import ReadingTraps from './exercises/ReadingTraps';
import JumbledWords from './exercises/JumbledWords';
import ParaphraseMatcher from './exercises/ParaphraseMatcher';
import LogicalModifiers from './exercises/LogicalModifiers';
import NumberlessProblems from './exercises/NumberlessProblems';
import SchemaClassifier from './exercises/SchemaClassifier';
import GoalStatePredictor from './exercises/GoalStatePredictor';
import SyntacticRewriter from './exercises/SyntacticRewriter';
import EquationToStory from './exercises/EquationToStory';
import VisualToNarrative from './exercises/VisualToNarrative';
import RootDecoder from './exercises/RootDecoder';
import ConceptSimplification from './exercises/ConceptSimplification';

// ─── Tab registry ─────────────────────────────────────────────────────────────
// To add a new exercise: append an entry here + create the component file.
const TABS = [
  { id: 'vocab',      label: 'Vocab Explorer',           icon: VachanaIcons.vocab,      desc: 'Build meaning for mathematical words' },
  { id: 'dissector',  label: 'Sentence Dissector',       icon: VachanaIcons.dissector,  desc: 'Parse math sentences into components' },
  { id: 'trans',      label: 'Translate English ➔ Math', icon: VachanaIcons.trans,      desc: 'Convert words into algebraic expressions' },
  { id: 'order',      label: 'Inversion Detector',       icon: VachanaIcons.order,      desc: 'Avoid subtraction order errors' },
  { id: 'story',      label: 'Story Weaver',             icon: VachanaIcons.story,      desc: 'Arrange sentences in logical order' },
  { id: 'graph',      label: 'Dependency Graph',         icon: VachanaIcons.graph,      desc: 'Visualize prerequisite terminology' },
  { id: 'read',       label: 'Readability Analyzer',     icon: VachanaIcons.read,       desc: 'Calculate reading ease and grade levels' },
  { id: 'pronoun',    label: 'Pronoun Resolver',         icon: VachanaIcons.pronoun,    desc: 'Identify subjects and references' },
  { id: 'noise',      label: 'Noise Filter',             icon: VachanaIcons.noise,      desc: 'Separate critical data from text fluff' },
  { id: 'traps',      label: 'Reading Traps',            icon: VachanaIcons.traps,      desc: 'Learn to avoid linguistic math traps' },
  { id: 'jumbled',    label: 'Jumbled Words',            icon: VachanaIcons.jumbled,    desc: 'Arrange words to match equations' },
  { id: 'paraphrase', label: 'Paraphrase Matcher',       icon: VachanaIcons.paraphrase, desc: 'Identify equivalent verbal representations' },
  { id: 'modifiers',  label: 'Logical Modifiers',        icon: VachanaIcons.modifiers,  desc: 'Practice precise math prepositions' },
  { id: 'numberless', label: 'Numberless Problems',      icon: VachanaIcons.numberless, desc: 'Visualize relationships without numeric distractions' },
  { id: 'schema',     label: 'Schema Classifier',        icon: VachanaIcons.schema,     desc: 'Categorize word problems by arithmetic schema' },
  { id: 'goal',       label: 'Goal-State Predictor',     icon: VachanaIcons.goal,       desc: 'Identify the exact target question requirements' },
  { id: 'rewrite',    label: 'Syntactic Rewriter',       icon: VachanaIcons.rewrite,    desc: 'Translate passive word problems to chronological active voice' },
  { id: 'storymatch', label: 'Equation-to-Story',        icon: VachanaIcons.storymatch, desc: 'Connect abstract algebra with real-world scenarios' },
  { id: 'graphstory', label: 'Visual-to-Narrative',      icon: VachanaIcons.graphstory, desc: 'Translate visual function graphs into descriptive stories' },
  { id: 'etymology',  label: 'Root Decoder',             icon: VachanaIcons.etymology,  desc: 'Break down mathematical terms into Greek/Latin roots' },
  { id: 'simplify',   label: 'Concept Simplification',   icon: VachanaIcons.simplify,   desc: 'Explain complex math definitions simply to beginners' },
];

// Map tab id → component
const EXERCISE_COMPONENTS = {
  vocab:      VocabExplorer,
  dissector:  SentenceDissector,
  trans:      TranslateEnglishMath,
  order:      InversionDetector,
  story:      StoryWeaver,
  graph:      DependencyGraph,
  read:       ReadabilityAnalyzer,
  pronoun:    PronounResolver,
  noise:      NoiseFilter,
  traps:      ReadingTraps,
  jumbled:    JumbledWords,
  paraphrase: ParaphraseMatcher,
  modifiers:  LogicalModifiers,
  numberless: NumberlessProblems,
  schema:     SchemaClassifier,
  goal:       GoalStatePredictor,
  rewrite:    SyntacticRewriter,
  storymatch: EquationToStory,
  graphstory: VisualToNarrative,
  etymology:  RootDecoder,
  simplify:   ConceptSimplification,
};

// ─── URL helpers ──────────────────────────────────────────────────────────────

function getTabFromUrl() {
  const path = window.location.pathname; // e.g. "/vachana/vocab"
  const match = path.match(/^\/vachana\/([^/]+)/);
  const id = match ? match[1] : null;
  return id && EXERCISE_COMPONENTS[id] ? id : null;
}

function pushTabUrl(tabId) {
  const url = tabId ? `/vachana/${tabId}` : '/vachana';
  window.history.pushState({ tabId }, '', url);
}

// ─── Vachana Shell ────────────────────────────────────────────────────────────

export default function Vachana({ onBack }) {
  // Pre-select tab based on URL (e.g. /vachana/vocab → 'vocab')
  const [activeTab, setActiveTab] = useState(getTabFromUrl);

  // Keep URL in sync when tab changes programmatically
  const selectTab = (id) => {
    setActiveTab(id);
    pushTabUrl(id);
  };

  const goBack = () => {
    selectTab(null);
  };

  // Handle browser Back/Forward navigation
  useEffect(() => {
    const onPopState = () => setActiveTab(getTabFromUrl());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const activeTabMeta = activeTab ? TABS.find(t => t.id === activeTab) : null;
  const ExerciseComponent = activeTab ? EXERCISE_COMPONENTS[activeTab] : null;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1rem', color: 'var(--clr-text)' }}>

      {/* Vachana Header — shown on dashboard */}
      {activeTab === null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--clr-border)', paddingBottom: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {VachanaIcons.header} Vachana Literary Lab
            </h1>
            <p className="subtitle" style={{ margin: '4px 0 0 0' }}>Learn to parse, translate, and communicate in the language of mathematics</p>
          </div>
          <button className="back-button" onClick={onBack}>← Back to Home</button>
        </div>
      )}

      {activeTab === null ? (
        /* ── Dashboard Grid ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '10px' }}>
          {TABS.map(tab => (
            <div
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              style={{
                background: 'var(--clr-surface)',
                border: '1px solid var(--clr-border)',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
                minHeight: '160px',
                justifyContent: 'center'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = 'var(--clr-accent)';
                e.currentTarget.style.boxShadow = 'var(--shadow-card, 0 4px 12px rgba(0,0,0,0.15))';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.borderColor = 'var(--clr-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'var(--clr-accent-bg, rgba(108,206,255,0.1))',
                color: 'var(--clr-accent)', marginBottom: '14px'
              }}>
                {tab.icon}
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 600, color: 'var(--clr-accent)', textAlign: 'center' }}>
                {tab.label}
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--clr-text-soft)', textAlign: 'center', lineHeight: '1.4' }}>
                {tab.desc}
              </p>
            </div>
          ))}
        </div>
      ) : (
        /* ── Active Exercise Workspace ── */
        <div style={{ background: 'var(--clr-card, #1e1e24)', border: '1px solid var(--clr-border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-card)' }}>
          {/* Active Tab Header */}
          <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--clr-border)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--clr-accent)' }}>
                {activeTabMeta?.label}
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.92rem', color: 'var(--clr-text-soft)' }}>
                {activeTabMeta?.desc}
              </p>
            </div>
            <button
              onClick={goBack}
              style={{
                background: 'transparent', border: '1px solid var(--clr-border)',
                color: 'var(--clr-text-soft)', cursor: 'pointer',
                padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem'
              }}
            >
              ← All Modules
            </button>
          </div>

          {/* Render the active exercise */}
          {ExerciseComponent && <ExerciseComponent />}
        </div>
      )}
    </div>
  );
}
