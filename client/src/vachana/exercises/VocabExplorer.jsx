import { useState, useEffect, useRef } from 'react';
import { VOCAB_CORPUS } from '../../vocabCorpus';

// Helper to generate a question structure for Vocab Explorer
function generateVocabQuestion(word, type, allWords) {
  const strandWords = allWords.filter(w => w.strand === word.strand && w.id !== word.id);
  const tierWords = allWords.filter(w => w.tier === word.tier && w.id !== word.id);
  const generalPool = allWords.filter(w => w.id !== word.id);
  
  const getDistractors = (pool, n) => {
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
  };

  let distPool = strandWords;
  if (distPool.length < 3) distPool = [...distPool, ...tierWords.filter(w => !distPool.some(d => d.id === w.id))];
  if (distPool.length < 3) distPool = [...distPool, ...generalPool.filter(w => !distPool.some(d => d.id === w.id))];

  const distractors = getDistractors(distPool, 3);

  if (type === 'discrimination' && word.is_confusable) {
    const isMathSentence = Math.random() < 0.5;
    
    const everydaySentences = {
      "equal": "All citizens are born free and equal in dignity and rights.",
      "second": "Hold on, I will be there in just one second!",
      "digit": "The doctor examined the injured digit on my left foot.",
      "difference": "There is a massive difference in quality between these two materials.",
      "measure": "We must take immediate measures to solve this problem.",
      "multiple": "He suffered multiple injuries after falling from the tree.",
      "divide": "A deep disagreement threatened to divide the whole family.",
      "estimate": "The mechanic gave me a written estimate for the car repairs.",
      "sum": "She received a large sum of money from her grandfather's will.",
      "odd": "It felt odd to be sitting in a completely empty classroom.",
      "even": "The table was placed on an uneven lawn, making it hard to keep it even.",
      "face": "She washed her face with cold water to wake up.",
      "row": "The two neighbors had a loud row about the fence line.",
      "product": "Our supermarket sells local dairy products and vegetables.",
      "angle": "She was trying to find a new angle to write the news article.",
      "respectively": "He spoke respectfully to the elderly teacher.",
      "quotient": "Her emotional quotient was very high, helping her relate to others.",
      "each": "Each of the children received a shiny red balloon.",
      "key": "She lost the key to her apartment and had to call a locksmith.",
      "area": "There is a designated play area for toddlers in the park.",
      "remainder": "He spent the remainder of his life traveling across Europe.",
      "volume": "Please turn down the volume of the television set.",
      "grid": "The city layout is designed as a square street grid.",
      "factor": "Hard work is a key factor in achieving personal success.",
      "prime": "This plot of land is a prime location for building a new shop.",
      "composite": "The design is a composite of modern and classical styles.",
      "translation": "He works as a professional translator translating documents.",
      "reflection": "The smooth lake surface showed a perfect reflection of the mountain.",
      "average": "An average person needs around eight hours of sleep per night.",
      "degree": "She earned a university degree in English literature.",
      "edge": "He sat carefully on the edge of the high cliff.",
      "net": "The fisherman mended his fishing net before going out to sea.",
      "proportion": "A large proportion of the city population uses public transport.",
      "mean": "It was mean of him to ignore his friend's birthday party.",
      "justify": "You cannot justify stealing under any circumstances.",
      "variable": "The weather in spring is highly variable and unpredictable.",
      "coefficient": "The two factors act as coefficients in raising productivity.",
      "expression": "A smile is a natural expression of happiness.",
      "constant": "He lived in constant fear of losing his job.",
      "expand": "Water will expand when it freezes into ice."
    };

    const everydaySent = everydaySentences[word.term] || `The term '${word.term}' was used in the discussion yesterday.`;
    const prompt = isMathSentence
      ? `Identify the sense of the word "${word.term}" in this sentence:\n\n"${word.example_sentence}"`
      : `Identify the sense of the word "${word.term}" in this sentence:\n\n"${everydaySent}"`;

    const correctAnswer = isMathSentence ? 'Mathematical meaning' : 'Everyday meaning';
    const explanation = isMathSentence
      ? `In this math context, "${word.term}" means: "${word.definition}"`
      : `In this everyday context, "${word.term}" means: "${word.everyday_meaning}"`;

    return {
      id: `${word.id}_disc_${isMathSentence ? 'math' : 'every'}`,
      wordId: word.id,
      type: 'mcq',
      variant: 'discrimination',
      prompt,
      options: ['Everyday meaning', 'Mathematical meaning'],
      answer: correctAnswer,
      explanation
    };
  }

  if (type === 'application') {
    const regex = new RegExp(`\\b${word.term}\\b`, 'gi');
    const promptText = word.example_sentence.replace(regex, '__________');
    const prompt = `Fill in the blank with the correct mathematical term:\n\n"${promptText}"`;
    
    const ansTerm = word.term.charAt(0).toUpperCase() + word.term.slice(1);
    const correctOption = ansTerm;
    
    const options = [correctOption, ...distractors.map(d => d.term.charAt(0).toUpperCase() + d.term.slice(1))];
    options.sort(() => 0.5 - Math.random());

    return {
      id: `${word.id}_app`,
      wordId: word.id,
      type: 'mcq',
      variant: 'application',
      prompt,
      options,
      answer: correctOption,
      explanation: `"${word.term}" means: "${word.definition}"`
    };
  }

  const isQuestioningDefinition = Math.random() < 0.5;
  if (isQuestioningDefinition) {
    const prompt = `What is the mathematical definition of "${word.term}"?`;
    const correctOption = word.definition;
    const options = [correctOption, ...distractors.map(d => d.definition)];
    options.sort(() => 0.5 - Math.random());

    return {
      id: `${word.id}_rec_def`,
      wordId: word.id,
      type: 'mcq',
      variant: 'recognition',
      prompt,
      options,
      answer: correctOption,
      explanation: `The definition of "${word.term}" is: "${word.definition}"`
    };
  } else {
    const prompt = `Which mathematical term matches this definition?\n\n"${word.definition}"`;
    const correctOption = word.term.charAt(0).toUpperCase() + word.term.slice(1);
    const options = [correctOption, ...distractors.map(d => d.term.charAt(0).toUpperCase() + d.term.slice(1))];
    options.sort(() => 0.5 - Math.random());

    return {
      id: `${word.id}_rec_term`,
      wordId: word.id,
      type: 'mcq',
      variant: 'recognition',
      prompt,
      options,
      answer: correctOption,
      explanation: `"${word.term}" means: "${word.definition}"`
    };
  }
}

const getLevelType = (levelIndex) => {
  if (levelIndex === 1 || levelIndex === 3) return 'teach';
  if (levelIndex === 2 || levelIndex === 4) return 'standard';
  if (levelIndex === 5) return 'review';
  if (levelIndex === 6) return 'boss';
  if (levelIndex === 7) return 'final_exam';
  return 'standard';
};

export default function VocabExplorer() {
  // --- Vocab Explorer State (Mastery-Driven) ---
  const [vocabState, setVocabState] = useState(() => {
    try {
      const stored = localStorage.getItem('tenali_vocab_progress');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore
    }
    return {
      currentTier: 1,
      currentLevelIndex: 1,
      wordStates: {},
      tierStates: { '1': 'in_progress' },
      placementCompleted: false,
      isPlacing: false,
      placementStep: 0,
      placementTier: 4,
      placementAnswers: [],
      failedLevelIndex: null,
      failedLevelType: null,
      reteachWordIds: []
    };
  });

  const saveVocabState = (newState) => {
    setVocabState(newState);
    try {
      localStorage.setItem('tenali_vocab_progress', JSON.stringify(newState));
    } catch {
      // Ignore
    }
  };

  // Active session variables
  const [selectedTerm, setSelectedTerm] = useState('zero');
  const [vocabSessionActive, setVocabSessionActive] = useState(false);
  const [vocabSessionQuestions, setVocabSessionQuestions] = useState([]);
  const [vocabSessionQIndex, setVocabSessionQIndex] = useState(0);
  const [vocabSessionAnswers, setVocabSessionAnswers] = useState([]);
  const [vocabSessionIncorrectWords, setVocabSessionIncorrectWords] = useState([]);
  const [vocabSelectedMcq, setVocabSelectedMcq] = useState(null);
  const [vocabHasAnswered, setVocabHasAnswered] = useState(false);
  const [vocabMsg, setVocabMsg] = useState('');
  const [vocabSessionFinished, setVocabSessionFinished] = useState(false);
  const autoAdvanceTimeoutRef = useRef(null);
  const clearAutoAdvance = () => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, []);

  const startVocabSession = (customType = null) => {
    const tierWords = VOCAB_CORPUS.filter(w => w.tier === vocabState.currentTier);
    let levelType = customType || (vocabState.currentLevelIndex === 7 ? 'final_exam' : getLevelType(vocabState.currentLevelIndex));
    let targetWords = [];
    let questions = [];

    if (vocabState.failedLevelIndex !== null) {
      levelType = 'reteach';
    }

    if (levelType === 'teach') {
      setVocabSessionActive(true);
      setVocabSessionQuestions([]);
      setVocabSessionQIndex(0);
      setVocabSessionAnswers([]);
      setVocabSessionIncorrectWords([]);
      setVocabSessionFinished(false);
      const chunkIndex = vocabState.currentLevelIndex === 1 ? 0 : 5;
      if (tierWords[chunkIndex]) {
        setSelectedTerm(tierWords[chunkIndex].term);
      }
      return;
    }

    if (levelType === 'standard') {
      const startIdx = vocabState.currentLevelIndex === 2 ? 0 : 5;
      targetWords = tierWords.slice(startIdx, startIdx + 5);
      
      targetWords.forEach(word => {
        questions.push(generateVocabQuestion(word, 'recognition', VOCAB_CORPUS));
        if (word.is_confusable) {
          questions.push(generateVocabQuestion(word, 'discrimination', VOCAB_CORPUS));
        } else {
          questions.push(generateVocabQuestion(word, 'application', VOCAB_CORPUS));
        }
      });
      questions.sort(() => 0.5 - Math.random());
    } else if (levelType === 'review') {
      const pool = VOCAB_CORPUS.filter(w => w.tier < vocabState.currentTier || 
        (w.tier === vocabState.currentTier && tierWords.indexOf(w) < 10));
      
      const sortedPool = [...pool].sort((a, b) => {
        const stateA = vocabState.wordStates[a.id]?.status || 'unseen';
        const stateB = vocabState.wordStates[b.id]?.status || 'unseen';
        const scoreA = stateA === 'mastered' ? 1 : 0;
        const scoreB = stateB === 'mastered' ? 1 : 0;
        return scoreA - scoreB;
      });

      const selectedWords = sortedPool.slice(0, 15);
      selectedWords.forEach(word => {
        const types = ['recognition', 'application'];
        if (word.is_confusable) types.push('discrimination');
        const randType = types[Math.floor(Math.random() * types.length)];
        questions.push(generateVocabQuestion(word, randType, VOCAB_CORPUS));
      });
      questions.sort(() => 0.5 - Math.random());
    } else if (levelType === 'boss') {
      tierWords.forEach(word => {
        questions.push(generateVocabQuestion(word, 'recognition', VOCAB_CORPUS));
        if (word.is_confusable) {
          questions.push(generateVocabQuestion(word, 'discrimination', VOCAB_CORPUS));
        } else {
          questions.push(generateVocabQuestion(word, 'application', VOCAB_CORPUS));
        }
      });
      questions.sort(() => 0.5 - Math.random());
    } else if (levelType === 'reteach') {
      const reteachWords = VOCAB_CORPUS.filter(w => vocabState.reteachWordIds.includes(w.id));
      let count = 0;
      while (questions.length < 8 && reteachWords.length > 0 && count < 3) {
        reteachWords.forEach(word => {
          if (questions.length < 8) {
            const types = ['recognition', 'application'];
            if (word.is_confusable) types.push('discrimination');
            const randType = types[Math.floor(Math.random() * types.length)];
            questions.push(generateVocabQuestion(word, randType, VOCAB_CORPUS));
          }
        });
        count++;
      }
      questions.sort(() => 0.5 - Math.random());
    } else if (levelType === 'final_exam') {
      const sortedPool = [...VOCAB_CORPUS].sort((a, b) => {
        const stateA = vocabState.wordStates[a.id]?.status || 'unseen';
        const stateB = vocabState.wordStates[b.id]?.status || 'unseen';
        const scoreA = stateA === 'mastered' ? 1 : 0;
        const scoreB = stateB === 'mastered' ? 1 : 0;
        return scoreA - scoreB;
      });
      const selectedWords = sortedPool.slice(0, 40);
      selectedWords.forEach(word => {
        const types = ['recognition', 'application'];
        if (word.is_confusable) types.push('discrimination');
        const randType = types[Math.floor(Math.random() * types.length)];
        questions.push(generateVocabQuestion(word, randType, VOCAB_CORPUS));
      });
      questions.sort(() => 0.5 - Math.random());
    }

    setVocabSessionQuestions(questions);
    setVocabSessionQIndex(0);
    setVocabSessionAnswers([]);
    setVocabSessionIncorrectWords([]);
    setVocabSelectedMcq(null);
    setVocabHasAnswered(false);
    setVocabMsg('');
    setVocabSessionFinished(false);
    clearAutoAdvance();
    setVocabSessionActive(true);
  };

  const startPlacementCheck = () => {
    const startTier = 4;
    const wordPool = VOCAB_CORPUS.filter(w => w.tier === startTier);
    const randomWord = wordPool[Math.floor(Math.random() * wordPool.length)];
    const types = ['recognition', 'application'];
    if (randomWord.is_confusable) types.push('discrimination');
    const randType = types[Math.floor(Math.random() * types.length)];
    const question = generateVocabQuestion(randomWord, randType, VOCAB_CORPUS);

    const newState = {
      ...vocabState,
      isPlacing: true,
      placementStep: 1,
      placementTier: startTier,
      placementAnswers: []
    };
    saveVocabState(newState);

    setVocabSessionQuestions([question]);
    setVocabSessionQIndex(0);
    setVocabSessionAnswers([]);
    setVocabSessionIncorrectWords([]);
    setVocabSelectedMcq(null);
    setVocabHasAnswered(false);
    setVocabMsg('');
    setVocabSessionFinished(false);
    clearAutoAdvance();
    setVocabSessionActive(true);
  };

  const handlePlacementAnswer = (isCorrect) => {
    const currentQ = vocabSessionQuestions[0];
    const newAnswers = [...vocabState.placementAnswers, {
      tier: vocabState.placementTier,
      wordId: currentQ.wordId,
      correct: isCorrect
    }];

    if (vocabState.placementStep < 15) {
      let nextTier = vocabState.placementTier;
      if (isCorrect) {
        nextTier = Math.min(8, nextTier + 1);
      } else {
        nextTier = Math.max(1, nextTier - 1);
      }

      const wordPool = VOCAB_CORPUS.filter(w => w.tier === nextTier);
      const seenWordIds = newAnswers.map(a => a.wordId);
      let availableWords = wordPool.filter(w => !seenWordIds.includes(w.id));
      if (availableWords.length === 0) availableWords = wordPool;
      const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
      
      const types = ['recognition', 'application'];
      if (randomWord.is_confusable) types.push('discrimination');
      const randType = types[Math.floor(Math.random() * types.length)];
      const nextQ = generateVocabQuestion(randomWord, randType, VOCAB_CORPUS);

      const newState = {
        ...vocabState,
        placementStep: vocabState.placementStep + 1,
        placementTier: nextTier,
        placementAnswers: newAnswers
      };
      saveVocabState(newState);

      setVocabSessionQuestions([nextQ]);
      setVocabSelectedMcq(null);
      setVocabHasAnswered(false);
      setVocabMsg('');
    } else {
      let placedTier = vocabState.placementTier;
      if (!isCorrect) {
        placedTier = Math.max(1, placedTier - 1);
      }

      const newTierStates = { ...vocabState.tierStates };
      for (let t = 1; t <= placedTier; t++) {
        newTierStates[String(t)] = t === placedTier ? 'in_progress' : 'certified';
      }

      const newWordStates = { ...vocabState.wordStates };
      VOCAB_CORPUS.forEach(word => {
        if (word.tier < placedTier) {
          newWordStates[word.id] = {
            status: 'mastered',
            correctCount: 2,
            seenCount: 2
          };
        }
      });

      const newState = {
        ...vocabState,
        currentTier: placedTier,
        currentLevelIndex: 1,
        tierStates: newTierStates,
        wordStates: newWordStates,
        placementCompleted: true,
        isPlacing: true,
        placementAnswers: newAnswers
      };
      saveVocabState(newState);
      setVocabSessionFinished(true);
    }
  };

  const handleVocabAnswerSubmit = (option) => {
    const selected = (typeof option === 'string') ? option : vocabSelectedMcq;
    if (!selected) return;

    const currentQ = vocabSessionQuestions[vocabSessionQIndex];
    const isCorrect = selected === currentQ.answer;

    setVocabSelectedMcq(selected);
    setVocabHasAnswered(true);
    const newAnswers = [...vocabSessionAnswers, isCorrect];
    setVocabSessionAnswers(newAnswers);

    autoAdvanceTimeoutRef.current = setTimeout(handleVocabNextQuestion, 1000);
    setVocabMsg(currentQ.explanation);

    if (!vocabState.isPlacing) {
      const wordId = currentQ.wordId;
      const newWordStates = { ...vocabState.wordStates };
      const currentWordState = newWordStates[wordId] || { status: 'unseen', correctCount: 0, seenCount: 0 };
      
      currentWordState.seenCount++;
      if (isCorrect) {
        currentWordState.correctCount++;
        if (currentWordState.status === 'unseen' || currentWordState.status === 'introduced') {
          currentWordState.status = 'practicing';
        } else if (currentWordState.status === 'practicing' && currentWordState.correctCount >= 2) {
          currentWordState.status = 'consolidated';
        } else if (currentWordState.status === 'consolidated' && currentWordState.correctCount >= 4) {
          currentWordState.status = 'mastered';
        }
      } else {
        if (currentWordState.status === 'mastered') {
          currentWordState.status = 'practicing';
        }
        currentWordState.correctCount = Math.max(0, currentWordState.correctCount - 1);
        
        if (!vocabSessionIncorrectWords.includes(wordId)) {
          setVocabSessionIncorrectWords([...vocabSessionIncorrectWords, wordId]);
        }
      }

      newWordStates[wordId] = currentWordState;
      saveVocabState({
        ...vocabState,
        wordStates: newWordStates
      });
    }
  };

  const handleVocabNextQuestion = () => {
    clearAutoAdvance();

    if (vocabState.isPlacing) {
      handlePlacementAnswer(vocabSessionAnswers[vocabSessionAnswers.length - 1]);
      return;
    }

    if (vocabSessionQIndex < vocabSessionQuestions.length - 1) {
      setVocabSessionQIndex(vocabSessionQIndex + 1);
      setVocabSelectedMcq(null);
      setVocabHasAnswered(false);
      setVocabMsg('');
    } else {
      const correctCount = vocabSessionAnswers.filter(Boolean).length;
      const totalCount = vocabSessionQuestions.length;
      const scorePct = (correctCount / totalCount) * 100;
      
      let levelType = vocabState.failedLevelIndex !== null ? 'reteach' : (vocabState.currentLevelIndex === 7 ? 'final_exam' : getLevelType(vocabState.currentLevelIndex));
      let threshold = (levelType === 'boss' || levelType === 'final_exam') ? 90 : 80;
      const passed = scorePct >= threshold;

      let newState = { ...vocabState };

      if (passed) {
        if (levelType === 'reteach') {
          newState.failedLevelIndex = null;
          newState.failedLevelType = null;
          newState.reteachWordIds = [];
        } else if (levelType === 'boss') {
          newState.tierStates[String(vocabState.currentTier)] = 'certified';
          if (vocabState.currentTier < 8) {
            newState.currentTier++;
            newState.currentLevelIndex = 1;
            newState.tierStates[String(newState.currentTier)] = 'in_progress';
          } else {
            newState.currentLevelIndex = 7;
          }
        } else if (levelType === 'final_exam') {
          newState.mastered = true;
        } else {
          newState.currentLevelIndex++;
        }
      } else {
        if (levelType !== 'reteach') {
          newState.failedLevelIndex = vocabState.currentLevelIndex;
          newState.failedLevelType = levelType;
          newState.reteachWordIds = [...vocabSessionIncorrectWords];
        }
      }

      saveVocabState(newState);
      setVocabSessionFinished(true);
    }
  };

  const handleResetVocab = () => {
    const defaultState = {
      currentTier: 1,
      currentLevelIndex: 1,
      wordStates: {},
      tierStates: { '1': 'in_progress' },
      placementCompleted: false,
      isPlacing: false,
      placementStep: 0,
      placementTier: 4,
      placementAnswers: [],
      failedLevelIndex: null,
      failedLevelType: null,
      reteachWordIds: []
    };
    saveVocabState(defaultState);
    setVocabSessionActive(false);
    setVocabSessionFinished(false);
    setSelectedTerm('zero');
  };



  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!vocabSessionActive || vocabSessionFinished || vocabSessionQuestions.length === 0) return;
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
      }
      const currentQ = vocabSessionQuestions[vocabSessionQIndex];
      if (!currentQ) return;
      const key = e.key.toLowerCase();

      if (!vocabHasAnswered) {
        if (key === 'a' && currentQ.options.length > 0) {
          e.preventDefault();
          handleVocabAnswerSubmit(currentQ.options[0]);
        } else if (key === 'b' && currentQ.options.length > 1) {
          e.preventDefault();
          handleVocabAnswerSubmit(currentQ.options[1]);
        } else if (key === 'c' && currentQ.options.length > 2) {
          e.preventDefault();
          handleVocabAnswerSubmit(currentQ.options[2]);
        } else if (key === 'd' && currentQ.options.length > 3) {
          e.preventDefault();
          handleVocabAnswerSubmit(currentQ.options[3]);
        }
      }

      if (key === 'enter') {
        e.preventDefault();
        if (!vocabHasAnswered) {
          if (vocabSelectedMcq) {
            handleVocabAnswerSubmit();
          }
        } else {
          handleVocabNextQuestion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [vocabSessionActive, vocabSessionFinished, vocabSessionQuestions, vocabSessionQIndex, vocabHasAnswered, vocabSelectedMcq]);

  const handleCompleteTeachLevel = () => {
    const tierWords = VOCAB_CORPUS.filter(w => w.tier === vocabState.currentTier);
    const startIdx = vocabState.currentLevelIndex === 1 ? 0 : 5;
    const chunkWords = tierWords.slice(startIdx, startIdx + 5);

    const newWordStates = { ...vocabState.wordStates };
    chunkWords.forEach(word => {
      if (!newWordStates[word.id]) {
        newWordStates[word.id] = {
          status: 'introduced',
          correctCount: 0,
          seenCount: 0
        };
      }
    });

    const newState = {
      ...vocabState,
      currentLevelIndex: vocabState.currentLevelIndex + 1,
      wordStates: newWordStates
    };
    saveVocabState(newState);
    
    setVocabSessionActive(false);
    setTimeout(() => {
      let targetWords = tierWords.slice(startIdx, startIdx + 5);
      let questions = [];
      targetWords.forEach(word => {
        questions.push(generateVocabQuestion(word, 'recognition', VOCAB_CORPUS));
        if (word.is_confusable) {
          questions.push(generateVocabQuestion(word, 'discrimination', VOCAB_CORPUS));
        } else {
          questions.push(generateVocabQuestion(word, 'application', VOCAB_CORPUS));
        }
      });
      questions.sort(() => 0.5 - Math.random());
      
      setVocabSessionQuestions(questions);
      setVocabSessionQIndex(0);
      setVocabSessionAnswers([]);
      setVocabSessionIncorrectWords([]);
      setVocabSelectedMcq(null);
      setVocabHasAnswered(false);
      setVocabMsg('');
      setVocabSessionFinished(false);
      setVocabSessionActive(true);
    }, 50);
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header section with Reset */}
      {(vocabState.placementCompleted || vocabState.isPlacing) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button
            onClick={handleResetVocab}
            style={{
              background: 'transparent',
              border: '1px solid rgba(232, 134, 74, 0.3)',
              color: 'rgba(232, 134, 74, 0.8)',
              cursor: 'pointer',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(232, 134, 74, 0.08)';
              e.currentTarget.style.borderColor = 'var(--clr-accent)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(232, 134, 74, 0.3)';
            }}
          >
            <span>🔄</span> Reset Progress
          </button>
        </div>
      )}

      {/* 1. PLACEMENT CHOOSER */}
      {!vocabState.placementCompleted && !vocabState.isPlacing && (
        <div style={{
          background: 'var(--clr-surface)',
          border: '1px solid var(--clr-border)',
          borderRadius: '20px',
          padding: '40px 24px',
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          maxWidth: '720px',
          margin: '20px auto',
          animation: 'slideUp 0.4s ease-out'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'rgba(232, 134, 74, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 20px',
            color: 'var(--clr-accent)',
            border: '1px solid rgba(232, 134, 74, 0.2)'
          }}>
            🎯
          </div>
          <h4 style={{
            fontSize: '1.6rem',
            fontWeight: '700',
            marginBottom: '16px',
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.02em',
            color: 'var(--clr-text)'
          }}>
            Welcome to Vocab Explorer
          </h4>
          <p style={{
            color: 'var(--clr-text-soft)',
            fontSize: '1rem',
            lineHeight: '1.6',
            marginBottom: '32px',
            maxWidth: '540px',
            margin: '0 auto 32px'
          }}>
            Master foundational mathematical vocabulary from Reception through Year 6 and Beyond using adaptive spaced retrieval practice.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <button
              onClick={startPlacementCheck}
              className="submit-btn"
              style={{
                width: '100%',
                maxWidth: '360px',
                padding: '14px 28px',
                background: 'var(--clr-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                boxShadow: '0 4px 15px rgba(232, 134, 74, 0.3)',
                transition: 'transform 0.15s ease, filter 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
            >
              Take Adaptive Placement Check 🎯
            </button>
            <button
              onClick={() => {
                const newState = {
                  ...vocabState,
                  placementCompleted: true,
                  isPlacing: false,
                  currentTier: 1,
                  currentLevelIndex: 1,
                  tierStates: { ...vocabState.tierStates, '1': 'in_progress' }
                };
                saveVocabState(newState);
              }}
              style={{
                background: 'transparent',
                border: '1px solid var(--clr-border)',
                color: 'var(--clr-text-soft)',
                padding: '12px 24px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '0.92rem',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                width: '100%',
                maxWidth: '360px'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--clr-hover)';
                e.currentTarget.style.color = 'var(--clr-text)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--clr-text-soft)';
              }}
            >
              Skip & Start from Tier 1 (Reception)
            </button>
          </div>
        </div>
      )}

      {/* 2. PLACEMENT / ACTIVE SESSION QUIZ SCREEN */}
      {vocabSessionActive && !vocabSessionFinished && vocabSessionQuestions.length > 0 && (
        <div style={{ maxWidth: '680px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
          {/* Progress Header */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              fontSize: '0.88rem',
              color: 'var(--clr-text-soft)',
              marginBottom: '10px'
            }}>
              <span style={{ fontWeight: '500' }}>
                {vocabState.isPlacing
                  ? `Placement Test — Question ${vocabState.placementStep} of 15`
                  : vocabState.failedLevelIndex !== null
                    ? `Reteach Micro-Level — Question ${vocabSessionQIndex + 1} of ${vocabSessionQuestions.length}`
                    : vocabState.currentLevelIndex === 7
                      ? `Final Mastery Exam — Question ${vocabSessionQIndex + 1} of ${vocabSessionQuestions.length}`
                      : `Tier ${vocabState.currentTier} Level ${vocabState.currentLevelIndex} — Question ${vocabSessionQIndex + 1} of ${vocabSessionQuestions.length}`
                }
              </span>
              <span style={{
                fontSize: '0.78rem',
                background: 'rgba(255,255,255,0.06)',
                padding: '4px 8px',
                borderRadius: '6px',
                fontWeight: '600'
              }}>
                {!vocabState.isPlacing && `Pass Target: ${vocabState.currentLevelIndex === 6 || vocabState.currentLevelIndex === 7 ? '90%' : '80%'}`}
              </span>
            </div>
            {/* Slim progress bar with glowing accent */}
            <div style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
            }}>
              <div style={{
                width: `${vocabState.isPlacing
                  ? (vocabState.placementStep / 15) * 100
                  : ((vocabSessionQIndex + (vocabHasAnswered ? 1 : 0)) / vocabSessionQuestions.length) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--clr-accent) 0%, #ffaa66 100%)',
                boxShadow: '0 0 8px var(--clr-accent)',
                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </div>
          </div>

          {/* Main Question Card (Typeform Style) */}
          <div style={{
            background: 'var(--clr-surface)',
            border: '1px solid var(--clr-border)',
            borderRadius: '24px',
            padding: '32px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
            position: 'relative'
          }}>
            {/* Strand Label */}
            {!vocabState.isPlacing && (
              <div style={{
                display: 'inline-block',
                fontSize: '0.72rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: 'var(--clr-accent)',
                background: 'rgba(232, 134, 74, 0.1)',
                border: '1px solid rgba(232, 134, 74, 0.2)',
                padding: '4px 10px',
                borderRadius: '6px',
                marginBottom: '20px',
                letterSpacing: '0.05em'
              }}>
                {VOCAB_CORPUS.find(w => w.id === vocabSessionQuestions[vocabSessionQIndex].wordId)?.strand.replace('_', ' ')}
              </div>
            )}

            {/* Question Prompt */}
            <div style={{
              fontSize: '1.28rem',
              fontWeight: '600',
              fontFamily: 'var(--font-display)',
              color: 'var(--clr-text)',
              lineHeight: '1.5',
              marginBottom: '28px',
              letterSpacing: '-0.01em'
            }}>
              {vocabSessionQuestions[vocabSessionQIndex].prompt}
            </div>

            {/* Option buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
              {vocabSessionQuestions[vocabSessionQIndex].options.map((opt, idx) => {
                const isSelected = vocabSelectedMcq === opt;
                const keyLetter = String.fromCharCode(65 + idx); // A, B, C, D
                
                return (
                  <button
                    key={idx}
                    disabled={vocabHasAnswered}
                    onClick={() => { if (!vocabHasAnswered) handleVocabAnswerSubmit(opt); }}
                    style={{
                      textAlign: 'left',
                      padding: '16px 20px',
                      borderRadius: '16px',
                      border: isSelected
                        ? '1.5px solid var(--clr-accent)'
                        : '1.5px solid var(--clr-border)',
                      background: isSelected
                        ? 'rgba(232, 134, 74, 0.08)'
                        : 'var(--clr-card)',
                      cursor: vocabHasAnswered ? 'not-allowed' : 'pointer',
                      color: 'var(--clr-text)',
                      fontSize: '1rem',
                      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: vocabHasAnswered && !isSelected ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected && !vocabHasAnswered) {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected && !vocabHasAnswered) {
                        e.currentTarget.style.borderColor = 'var(--clr-border)';
                        e.currentTarget.style.background = 'var(--clr-card)';
                      }
                    }}
                  >
                    <span style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isSelected ? 'var(--clr-accent)' : 'rgba(255, 255, 255, 0.08)',
                      color: isSelected ? '#fff' : 'var(--clr-text-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      marginRight: '14px',
                      flexShrink: 0
                    }}>
                      {keyLetter}
                    </span>
                    <span style={{ flexGrow: 1 }}>{opt}</span>
                    {!vocabHasAnswered && (
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.2)',
                        fontWeight: '500',
                        background: 'rgba(255,255,255,0.03)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}>
                        Press {keyLetter}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action buttons */}
            {!vocabHasAnswered ? (
              <button
                className="submit-btn"
                disabled={!vocabSelectedMcq}
                onClick={() => handleVocabAnswerSubmit()}
                style={{
                  padding: '14px',
                  opacity: !vocabSelectedMcq ? 0.6 : 1,
                  fontSize: '1rem',
                  fontWeight: '600',
                  borderRadius: '12px',
                  background: 'var(--clr-accent)',
                  color: '#fff',
                  border: 'none',
                  cursor: vocabSelectedMcq ? 'pointer' : 'not-allowed',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>Check Answer</span>
                {vocabSelectedMcq && (
                  <span style={{
                    fontSize: '0.8rem',
                    opacity: 0.8,
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    padding: '1px 6px',
                    borderRadius: '4px'
                  }}>
                    Enter
                  </span>
                )}
              </button>
            ) : (
              <button
                className="submit-btn"
                onClick={handleVocabNextQuestion}
                style={{
                  padding: '14px',
                  background: 'var(--clr-correct, #5cb87a)',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: '600',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>
                  {vocabState.isPlacing
                    ? (vocabState.placementStep < 15 ? 'Next Question' : 'Finish Session')
                    : (vocabSessionQIndex < vocabSessionQuestions.length - 1 ? 'Next Question' : 'Finish Session')}
                </span>
                <span style={{
                  fontSize: '0.8rem',
                  opacity: 0.8,
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  padding: '1px 6px',
                  borderRadius: '4px'
                }}>
                  Enter
                </span>
              </button>
            )}
          </div>

          {/* Feedback Reveal Card */}
          {vocabHasAnswered && vocabMsg && (
            <div style={{
              fontSize: '0.98rem',
              padding: '24px',
              borderRadius: '20px',
              marginTop: '20px',
              background: vocabSessionAnswers[vocabSessionAnswers.length - 1] ? 'rgba(92, 184, 122, 0.08)' : 'rgba(239, 83, 80, 0.08)',
              border: vocabSessionAnswers[vocabSessionAnswers.length - 1] ? '1px solid var(--clr-correct)' : '1px solid #ef5350',
              color: 'var(--clr-text)',
              lineHeight: '1.6',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              <div style={{
                fontWeight: '700',
                marginBottom: '8px',
                fontSize: '1.1rem',
                color: vocabSessionAnswers[vocabSessionAnswers.length - 1] ? 'var(--clr-correct)' : '#ef5350',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>{vocabSessionAnswers[vocabSessionAnswers.length - 1] ? '✓' : '✗'}</span>
                <span>{vocabSessionAnswers[vocabSessionAnswers.length - 1] ? 'Correct!' : 'Incorrect'}</span>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.95)' }}>{vocabMsg}</div>
            </div>
          )}
        </div>
      )}

      {/* 3. TEACH & TRY INTERACTIVE STUDY SCREEN */}
      {vocabSessionActive && vocabSessionQuestions.length === 0 && (
        <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--clr-border)',
            paddingBottom: '16px'
          }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', fontFamily: 'var(--font-display)' }}>
                Level {vocabState.currentLevelIndex}: Teach & Try 📖
              </h4>
              <span style={{ fontSize: '0.85rem', color: 'var(--clr-text-soft)' }}>
                Tier {vocabState.currentTier}: Mathematical Vocabulary
              </span>
            </div>
            <span style={{
              fontSize: '0.8rem',
              background: 'rgba(232, 134, 74, 0.1)',
              border: '1px solid rgba(232, 134, 74, 0.2)',
              padding: '6px 12px',
              borderRadius: '8px',
              color: 'var(--clr-accent)',
              fontWeight: '600'
            }}>
              Guided Exploration (No Grading)
            </span>
          </div>

          <p style={{ fontSize: '0.95rem', color: 'var(--clr-text-soft)', lineHeight: '1.5', marginBottom: '24px' }}>
            Review the active mathematical terms introduced below. Select each term to study its exact definition, sample usages, and common pitfalls.
          </p>

          {/* Study Layout Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '20px', minHeight: '340px' }}>
            {/* Left Column: Terms List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(() => {
                const tierWords = VOCAB_CORPUS.filter(w => w.tier === vocabState.currentTier);
                const startIdx = vocabState.currentLevelIndex === 1 ? 0 : 5;
                const chunkWords = tierWords.slice(startIdx, startIdx + 5);
                return chunkWords.map(word => {
                  const isSelected = selectedTerm === word.term;
                  return (
                    <button
                      key={word.id}
                      onClick={() => setSelectedTerm(word.term)}
                      style={{
                        textAlign: 'left',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: isSelected ? '1.5px solid var(--clr-accent)' : '1px solid var(--clr-border)',
                        background: isSelected ? 'rgba(232, 134, 74, 0.08)' : 'var(--clr-card)',
                        color: 'var(--clr-text)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontSize: '0.95rem',
                        fontWeight: isSelected ? '600' : '400'
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.borderColor = 'var(--clr-border)';
                      }}
                    >
                      <span style={{ marginRight: '8px' }}>{isSelected ? '📖' : '▫️'}</span>
                      {word.term}
                    </button>
                  );
                });
              })()}
            </div>

            {/* Right Column: Term Details */}
            {(() => {
              const word = VOCAB_CORPUS.find(w => w.term === selectedTerm);
              if (!word) return null;
              return (
                <div style={{
                  background: 'var(--clr-surface)',
                  border: '1px solid var(--clr-border)',
                  padding: '24px',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)',
                  animation: 'fadeIn 0.2s ease-out'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700', color: 'var(--clr-text)' }}>
                      {word.term}
                    </h3>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      color: 'var(--clr-accent)',
                      background: 'rgba(232, 134, 74, 0.08)',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      {word.strand.replace('_', ' ')}
                    </span>
                  </div>

                  <div>
                    <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--clr-correct)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>
                      Mathematical Definition
                    </strong>
                    <div style={{ fontSize: '1.05rem', fontWeight: '500', lineHeight: '1.6', color: 'var(--clr-text)' }}>
                      {word.definition}
                    </div>
                  </div>

                  {word.is_confusable && (
                    <div style={{
                      borderLeft: '4px solid #f5a623',
                      paddingLeft: '16px',
                      background: 'rgba(245, 166, 35, 0.03)',
                      padding: '12px 16px',
                      borderRadius: '0 8px 8px 0',
                      borderLeftWidth: '4px'
                    }}>
                      <strong style={{ display: 'block', fontSize: '0.75rem', color: '#f5a623', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>
                        ⚠️ Everyday English Confusion
                      </strong>
                      <div style={{ fontSize: '0.95rem', color: 'var(--clr-text-soft)', fontStyle: 'italic' }}>
                        "{word.everyday_meaning}"
                      </div>
                    </div>
                  )}

                  <div>
                    <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--clr-text-soft)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>
                      Example Context
                    </strong>
                    <div style={{
                      fontSize: '0.98rem',
                      fontStyle: 'italic',
                      color: 'rgba(255, 255, 255, 0.85)',
                      background: 'var(--clr-card)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.03)'
                    }}>
                      "{word.example_sentence}"
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Actions */}
          <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px dashed var(--clr-border)', paddingTop: '20px' }}>
            <button
              onClick={handleCompleteTeachLevel}
              className="submit-btn"
              style={{
                width: 'auto',
                padding: '14px 36px',
                background: 'var(--clr-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                boxShadow: '0 4px 15px rgba(232, 134, 74, 0.3)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
            >
              I've reviewed these terms — Let's Practice! 🚀
            </button>
          </div>
        </div>
      )}

      {/* 4. SESSION COMPLETE SCREEN */}
      {vocabSessionActive && vocabSessionFinished && (
        <div style={{
          background: 'var(--clr-surface)',
          border: '1px solid var(--clr-border)',
          borderRadius: '24px',
          padding: '36px 24px',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '20px auto',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {(() => {
            const correctCount = vocabSessionAnswers.filter(Boolean).length;
            const totalCount = vocabSessionQuestions.length;
            const scorePct = (correctCount / totalCount) * 100;
            
            let levelType = vocabState.failedLevelIndex !== null ? 'reteach' : (vocabState.currentLevelIndex === 7 ? 'final_exam' : getLevelType(vocabState.currentLevelIndex));
            let threshold = (levelType === 'boss' || levelType === 'final_exam') ? 90 : 80;
            const passed = scorePct >= threshold;

            return (
              <div>
                {vocabState.isPlacing && !vocabState.placementCompleted ? (
                  <div>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏆</div>
                    <h4 style={{
                      fontSize: '1.5rem',
                      color: 'var(--clr-correct)',
                      marginBottom: '12px',
                      fontFamily: 'var(--font-display)',
                      fontWeight: '700'
                    }}>
                      Placement Check Complete!
                    </h4>
                    <p style={{ color: 'var(--clr-text-soft)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '24px' }}>
                      We evaluated your vocabulary skills and placed you in:
                    </p>
                    <div style={{
                      display: 'inline-block',
                      padding: '14px 28px',
                      background: 'rgba(232, 134, 74, 0.1)',
                      border: '1.5px solid var(--clr-accent)',
                      borderRadius: '16px',
                      fontSize: '1.35rem',
                      fontWeight: '700',
                      color: 'var(--clr-accent)',
                      marginBottom: '24px',
                      boxShadow: '0 4px 12px rgba(232, 134, 74, 0.15)'
                    }}>
                      {vocabState.currentTier === 1
                        ? 'Reception (Tier 1)'
                        : vocabState.currentTier === 8
                          ? 'Beyond KS3 (Tier 8)'
                          : `Year ${vocabState.currentTier - 1} (Tier ${vocabState.currentTier})`
                      }
                    </div>
                    <p style={{ fontSize: '0.92rem', color: 'var(--clr-text-soft)', marginBottom: '32px' }}>
                      All foundational vocabulary tiers below this have been automatically certified.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>
                      {passed ? '🎉' : '⏳'}
                    </div>
                    <h4 style={{
                      fontSize: '1.6rem',
                      color: passed ? 'var(--clr-correct)' : '#ef5350',
                      marginBottom: '8px',
                      fontFamily: 'var(--font-display)',
                      fontWeight: '700'
                    }}>
                      {passed ? 'Level Completed!' : 'Let\'s review and retry'}
                    </h4>
                    <div style={{
                      fontSize: '3rem',
                      fontWeight: '800',
                      margin: '16px 0',
                      color: passed ? 'var(--clr-correct)' : '#ef5350',
                      fontFamily: 'var(--font-display)'
                    }}>
                      {correctCount} / {totalCount}
                    </div>
                    <p style={{
                      color: 'var(--clr-text-soft)',
                      fontSize: '0.98rem',
                      lineHeight: '1.6',
                      marginBottom: '28px',
                      maxWidth: '460px',
                      margin: '0 auto 28px'
                    }}>
                      {passed
                        ? `Superb effort! You scored ${Math.round(scorePct)}%, exceeding the ${threshold}% requirement.`
                        : `You scored ${Math.round(scorePct)}%, which is below the ${threshold}% pass target. Let's do a corrective reteach micro-level to address the missed words.`
                      }
                    </p>

                    {/* Show word updates if any passed */}
                    {passed && vocabSessionQuestions.length > 0 && (
                      <div style={{
                        maxWidth: '440px',
                        margin: '0 auto 32px',
                        textAlign: 'left',
                        background: 'var(--clr-card)',
                        border: '1px solid var(--clr-border)',
                        borderRadius: '16px',
                        padding: '20px'
                      }}>
                        <strong style={{
                          fontSize: '0.8rem',
                          textTransform: 'uppercase',
                          color: 'var(--clr-accent)',
                          display: 'block',
                          marginBottom: '12px',
                          letterSpacing: '0.05em'
                        }}>
                          Word Progress Updates
                        </strong>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {Array.from(new Set(vocabSessionQuestions.map(q => q.wordId))).map(wordId => {
                            const word = VOCAB_CORPUS.find(w => w.id === wordId);
                            const state = vocabState.wordStates[wordId];
                            if (!word || !state) return null;
                            
                            let statusColor = 'var(--clr-text-soft)';
                            if (state.status === 'mastered') statusColor = '#f5a623';
                            else if (state.status === 'consolidated') statusColor = 'var(--clr-correct)';
                            else if (state.status === 'practicing') statusColor = 'var(--clr-accent)';

                            return (
                              <div key={wordId} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.92rem',
                                borderBottom: '1px solid rgba(255,255,255,0.02)',
                                paddingBottom: '4px'
                              }}>
                                <span style={{ fontWeight: '500' }}>{word.term}</span>
                                <span style={{
                                  color: statusColor,
                                  fontSize: '0.78rem',
                                  fontWeight: '700',
                                  textTransform: 'uppercase',
                                  background: 'rgba(255,255,255,0.03)',
                                  padding: '2px 8px',
                                  borderRadius: '6px'
                                }}>
                                  {state.status}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => {
                    if (vocabState.isPlacing) {
                      saveVocabState({
                        ...vocabState,
                        isPlacing: false
                      });
                    }
                    setVocabSessionActive(false);
                    setVocabSessionFinished(false);
                  }}
                  className="submit-btn"
                  style={{
                    width: '100%',
                    maxWidth: '240px',
                    padding: '14px 28px',
                    background: 'var(--clr-accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '1rem',
                    boxShadow: '0 4px 15px rgba(232, 134, 74, 0.3)',
                    transition: 'transform 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
                >
                  Continue
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* 5. TIER DASHBOARD MAP */}
      {vocabState.placementCompleted && !vocabSessionActive && (
        <div style={{ marginTop: '20px', animation: 'fadeIn 0.3s ease-out' }}>
          {/* Pacing Panel Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            background: 'var(--clr-surface)',
            border: '1px solid var(--clr-border)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.04)'
            }}>
              <span style={{
                fontSize: '0.8rem',
                color: 'var(--clr-text-soft)',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '6px',
                letterSpacing: '0.05em'
              }}>
                Words Mastered
              </span>
              <strong style={{ fontSize: '1.6rem', color: 'var(--clr-accent)', fontFamily: 'var(--font-display)' }}>
                {Object.values(vocabState.wordStates).filter(ws => ws.status === 'mastered' || ws.status === 'consolidated').length} <span style={{ fontSize: '1rem', color: 'var(--clr-text-soft)', fontWeight: 'normal' }}>/ 80</span>
              </strong>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.04)'
            }}>
              <span style={{
                fontSize: '0.8rem',
                color: 'var(--clr-text-soft)',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '6px',
                letterSpacing: '0.05em'
              }}>
                Estimated Pacing Time
              </span>
              <span style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--clr-text)' }}>
                {(() => {
                  const remainingCount = 80 - Object.values(vocabState.wordStates).filter(ws => ws.status === 'mastered' || ws.status === 'consolidated').length;
                  const estMinutes = remainingCount * 3.5;
                  if (remainingCount === 0) return '🏆 Certified Complete!';
                  return `~${Math.ceil(estMinutes / 60)} hours left`;
                })()}
              </span>
            </div>
          </div>

          {/* Tier Map list */}
          <h4 style={{
            fontSize: '0.85rem',
            fontWeight: '700',
            color: 'var(--clr-text-soft)',
            textTransform: 'uppercase',
            marginBottom: '16px',
            letterSpacing: '0.08em'
          }}>
            Grade Band Progression Map
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(tierNum => {
              const isCurrent = vocabState.currentTier === tierNum;
              const status = vocabState.tierStates[String(tierNum)] || 'locked';
              const isCertified = status === 'certified';
              
              let tierLabel = '';
              if (tierNum === 1) tierLabel = 'Reception (Tier 1)';
              else if (tierNum === 8) tierLabel = 'Beyond KS3 Extension (Tier 8)';
              else tierLabel = `Year ${tierNum - 1} (Tier ${tierNum})`;

              let color = 'rgba(255,255,255,0.35)';
              let bg = 'rgba(255,255,255,0.01)';
              let border = '1px solid rgba(255,255,255,0.04)';
              
              if (isCurrent) {
                color = 'var(--clr-text)';
                bg = 'rgba(232, 134, 74, 0.06)';
                border = '1px solid rgba(232, 134, 74, 0.4)';
              } else if (isCertified) {
                color = 'var(--clr-text)';
                bg = 'rgba(92, 184, 122, 0.04)';
                border = '1px solid rgba(92, 184, 122, 0.25)';
              }

              return (
                <div
                  key={tierNum}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 20px',
                    borderRadius: '16px',
                    background: bg,
                    border,
                    color,
                    fontSize: '0.98rem',
                    boxShadow: isCurrent ? '0 4px 15px rgba(0,0,0,0.15)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {isCertified ? (
                      <span style={{
                        width: '24px',
                        height: '24px',
                        background: 'rgba(92, 184, 122, 0.15)',
                        color: 'var(--clr-correct)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem'
                      }}>
                        ✓
                      </span>
                    ) : isCurrent ? (
                      <span style={{
                        width: '24px',
                        height: '24px',
                        background: 'rgba(232, 134, 74, 0.2)',
                        color: 'var(--clr-accent)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        animation: 'pulse 1.8s infinite'
                      }}>
                        🎯
                      </span>
                    ) : (
                      <span style={{
                        width: '24px',
                        height: '24px',
                        background: 'rgba(255,255,255,0.03)',
                        color: 'rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem'
                      }}>
                        🔒
                      </span>
                    )}
                    <span style={{ fontWeight: isCurrent ? '600' : '500' }}>{tierLabel}</span>
                  </div>
                  
                  {isCurrent && (
                    <span style={{
                      fontSize: '0.8rem',
                      color: 'var(--clr-accent)',
                      fontWeight: '600',
                      background: 'rgba(232, 134, 74, 0.1)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em'
                    }}>
                      {vocabState.failedLevelIndex !== null
                        ? 'Reteach Challenge'
                        : vocabState.currentLevelIndex === 7
                          ? 'Final Mastery Exam'
                          : `Level ${vocabState.currentLevelIndex} / 6`
                      }
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Primary Continue Button */}
          <div style={{ textAlign: 'center' }}>
            {vocabState.mastered ? (
              <div style={{
                padding: '24px',
                background: 'rgba(92, 184, 122, 0.08)',
                border: '1.5px solid var(--clr-correct)',
                borderRadius: '16px',
                marginBottom: '20px',
                boxShadow: '0 4px 15px rgba(92, 184, 122, 0.1)',
                animation: 'fadeIn 0.3s ease-out'
              }}>
                <h5 style={{ fontSize: '1.25rem', color: 'var(--clr-correct)', margin: '0 0 8px 0', fontWeight: '700' }}>
                  🏆 Mathematical Vocabulary Master
                </h5>
                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--clr-text-soft)', lineHeight: '1.5' }}>
                  Congratulations! You have completed the entire math vocabulary checklist and passed the final cumulative exam.
                </p>
              </div>
            ) : (
              <button
                onClick={() => startVocabSession()}
                className="submit-btn"
                style={{
                  width: '100%',
                  maxWidth: '320px',
                  padding: '14px 32px',
                  background: 'var(--clr-accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1.05rem',
                  boxShadow: '0 4px 15px rgba(232, 134, 74, 0.3)',
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
              >
                {vocabState.failedLevelIndex !== null
                  ? 'Start Reteach Challenge 🚀'
                  : vocabState.currentLevelIndex === 7
                    ? 'Start Final Mastery Exam 🏆'
                    : vocabState.currentLevelIndex === 1 || vocabState.currentLevelIndex === 3
                      ? `Start Teach & Try (Tier ${vocabState.currentTier})`
                      : `Start Quiz (Tier ${vocabState.currentTier} Level ${vocabState.currentLevelIndex})`
                }
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
