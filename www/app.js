/* ═══════════════════════════════════════════════════════════
   IB Prep App  —  Vanilla JS PWA
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ─── Constants ────────────────────────────────────────────
const STORAGE_PREFIX = 'ib-app:';
const SK = {
  stats:    STORAGE_PREFIX + 'stats',
  seen:     STORAGE_PREFIX + 'seen',
  mastered: STORAGE_PREFIX + 'mastered',
  history:  STORAGE_PREFIX + 'history',
  settings: STORAGE_PREFIX + 'settings',
  imported: STORAGE_PREFIX + 'imported',
};

const SUBJECTS = [
  { id: 'history-hl',    name: 'History HL',                        group: 3, level: 'HL',   color: '#b45309', topics: ['Rights and Protest', 'Move to Global War', 'Authoritarian States', 'The Cold War'] },
  { id: 'history-sl',    name: 'History SL',                        group: 3, level: 'SL',   color: '#d97706', topics: ['Rights and Protest', 'Move to Global War', 'Causes of World War I'] },
  { id: 'maa',           name: 'Mathematics: Analysis & Approaches', group: 5, level: 'Both', color: '#1d4ed8', topics: ['Functions', 'Algebra & Number', 'Calculus', 'Statistics & Probability', 'Geometry & Trigonometry'] },
  { id: 'physics-sl',    name: 'Physics SL',                        group: 4, level: 'SL',   color: '#7c3aed', topics: ['Mechanics', 'Thermal Physics', 'Waves', 'Electricity & Magnetism', 'Circular Motion', 'Atomic & Nuclear'] },
  { id: 'tok',           name: 'Theory of Knowledge',               group: 0, level: 'Both', color: '#059669', topics: ['Knowledge & the Knower', 'Knowledge & Language', 'Knowledge & Technology', 'Knowledge & Politics', 'Core Theme'] },
  { id: 'english-b-hl', name: 'English B HL',                      group: 2, level: 'HL',   color: '#dc2626', topics: ['Text Analysis', 'Written Production', 'Listening Comprehension', 'Literary Works', 'Visual Stimulus'] },
  { id: 'spanish-a-lit', name: 'Literatura Española A',             group: 1, level: 'Both', color: '#ea580c', topics: ['Análisis literario', 'Prosa narrativa', 'Poesía', 'Teatro', 'Obras prescritas', 'Comentario textual'] },
];

const GROUP_NAMES = { 0: 'Core', 1: 'Group 1', 2: 'Group 2', 3: 'Group 3', 4: 'Group 4', 5: 'Group 5' };

const PAPER_TIMES = { 1: 45 * 60, 2: 75 * 60, 3: 90 * 60 }; // seconds

const COMMAND_TERM_INFO = {
  'identify':      { marks: '1–2',  type: 'low',    tip: 'Name or select a specific feature, fact, or example.' },
  'state':         { marks: '1',    type: 'low',    tip: 'Give a specific name, value, or other brief answer — no explanation needed.' },
  'define':        { marks: '1–2',  type: 'low',    tip: 'Give the precise meaning of a term.' },
  'outline':       { marks: '2–4',  type: 'medium', tip: 'Give a brief account or summary.' },
  'describe':      { marks: '2–4',  type: 'medium', tip: 'Give a detailed account.' },
  'explain':       { marks: '4–6',  type: 'medium', tip: 'Give a detailed account with reasons or causes.' },
  'examine':       { marks: '6',    type: 'medium', tip: 'Consider an argument or concept in a way that uncovers the assumptions and interrelationships.' },
  'compare':       { marks: '6',    type: 'medium', tip: 'Give an account of the similarities AND differences between two items.' },
  'analyse':       { marks: '6–9',  type: 'high',   tip: 'Break down to show how/why the components relate to each other and to the whole.' },
  'evaluate':      { marks: '9–15', type: 'high',   tip: 'Make an appraisal by weighing up strengths and limitations. Reach a reasoned conclusion.' },
  'discuss':       { marks: '10–15',type: 'high',   tip: 'Offer a considered and balanced review of different perspectives. Reach a conclusion.' },
  'to what extent':{ marks: '10–15',type: 'high',   tip: 'Consider the merits or otherwise of an argument or concept. Reach a qualified conclusion.' },
};

// ─── App State ────────────────────────────────────────────
let allQuestions = [];
let screenStack  = [];

let currentSession = null;
/* currentSession shape:
  {
    subjectId, subjectName, mode,  // 'practice' | 'paper' | 'endless'
    paper, level, topics,          // filter params
    questions: [...],              // ordered array
    currentIdx: 0,
    answers: {},                   // {questionId: {choice, correct, selfMark, submitted}}
    flags: Set,                    // flagged question IDs
    timerSecs: null,               // null = untimed
    timerInterval: null,
    startTime: Date.now(),
  }
*/

let stats   = loadJSON(SK.stats,    { answered: 0, correct: 0, streak: 0, lastDate: null, bySubject: {} });
let seenSet = new Set(loadJSON(SK.seen,     []));
let mastSet = new Set(loadJSON(SK.mastered, []));

// ─── Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  registerSW();
  applySettings();

  try {
    const res = await fetch('data/questions.json');
    const fetched = await res.json();
    const imported = loadJSON(SK.imported, []);
    allQuestions = [...fetched, ...imported];
  } catch (e) {
    console.error('Failed to load questions:', e);
    allQuestions = loadJSON(SK.imported, []);
  }

  buildHomeScreen();
  showScreen('screen-home', false);
});

// ─── Service Worker ───────────────────────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

// ─── Settings ─────────────────────────────────────────────
function applySettings() {
  const s = loadJSON(SK.settings, { theme: 'dark' });
  // currently always dark; placeholder for future theme toggle
}

// ─── LocalStorage helpers ─────────────────────────────────
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function saveSeen()     { saveJSON(SK.seen,     [...seenSet]); }
function saveMastered() { saveJSON(SK.mastered, [...mastSet]); }
function saveStats()    { saveJSON(SK.stats,    stats); }

// ─── Screen Navigation ────────────────────────────────────
function showScreen(id, pushHistory = true, slideIn = true) {
  const all = document.querySelectorAll('.screen');

  // Animate current screen out if transitioning
  const current = [...all].find(s => s.classList.contains('active'));

  if (current && current.id !== id && slideIn) {
    current.classList.remove('active');
  } else if (current) {
    current.classList.remove('active');
  }

  const next = document.getElementById(id);
  if (!next) return;

  next.classList.add('active');
  if (slideIn && current && current.id !== id) {
    next.classList.add('slide-in');
    next.addEventListener('animationend', () => next.classList.remove('slide-in'), { once: true });
  }

  if (pushHistory) {
    screenStack.push(id);
  }

  // Scroll to top
  next.scrollTop = 0;
}

function goBack() {
  if (screenStack.length <= 1) return;

  // Cleanup quiz state if leaving quiz
  const current = screenStack[screenStack.length - 1];
  if (current === 'screen-quiz') {
    stopTimer();
  }

  screenStack.pop();
  const prevId = screenStack[screenStack.length - 1];

  const allScreens = document.querySelectorAll('.screen');
  allScreens.forEach(s => s.classList.remove('active'));

  const prev = document.getElementById(prevId);
  if (prev) {
    prev.classList.add('active');
    prev.scrollTop = 0;
  }
}

// ─── Home Screen ──────────────────────────────────────────
function buildHomeScreen() {
  renderHomeStats();
  renderStreak();
  renderSubjectsGrid();
}

function renderHomeStats() {
  const pct = stats.answered > 0 ? Math.round((stats.correct / stats.answered) * 100) : 0;
  setText('home-stat-answered', stats.answered);
  setText('home-stat-accuracy', stats.answered > 0 ? pct + '%' : '—');
  setText('home-stat-mastered', mastSet.size);
}

function renderStreak() {
  const banner = document.getElementById('streak-banner');
  if (!banner) return;
  if (stats.streak > 0) {
    banner.classList.remove('hidden');
    setText('streak-value', stats.streak);
  } else {
    banner.classList.add('hidden');
  }
}

function renderSubjectsGrid() {
  const grid = document.getElementById('subjects-grid');
  if (!grid) return;
  grid.innerHTML = '';

  SUBJECTS.forEach(sub => {
    const qs = allQuestions.filter(q => q.subjectId === sub.id);
    const tile = document.createElement('button');
    tile.className = 'subject-tile';
    tile.setAttribute('aria-label', sub.name);

    const levelBadge = sub.level === 'Both'
      ? '<span class="badge">SL/HL</span>'
      : `<span class="badge ${sub.level.toLowerCase()}">${sub.level}</span>`;

    tile.innerHTML = `
      <div class="tile-color-bar" style="background:${sub.color}"></div>
      <div class="tile-body">
        <div class="tile-group">${GROUP_NAMES[sub.group] || 'Group ' + sub.group}</div>
        <div class="tile-name">${esc(sub.name)}</div>
        <div class="tile-meta">${levelBadge}</div>
        <div class="tile-qcount">${qs.length} question${qs.length !== 1 ? 's' : ''}</div>
      </div>
    `;
    tile.addEventListener('click', () => openSubjectScreen(sub.id));
    grid.appendChild(tile);
  });
}

// ─── Subject Screen ───────────────────────────────────────
function openSubjectScreen(subjectId) {
  const sub = SUBJECTS.find(s => s.id === subjectId);
  if (!sub) return;

  const subQs = allQuestions.filter(q => q.subjectId === subjectId);
  const subStats = stats.bySubject[subjectId] || { answered: 0, correct: 0 };
  const mastered = [...mastSet].filter(id => {
    const q = allQuestions.find(qq => qq.id === id);
    return q && q.subjectId === subjectId;
  }).length;

  const screen = document.getElementById('screen-subject');

  // Color bar
  const colorBar = screen.querySelector('.sub-color-bar');
  if (colorBar) colorBar.style.background = sub.color;

  // Title & badges
  screen.querySelector('.sub-title').textContent = sub.name;
  const badgesEl = screen.querySelector('.sub-badges');
  badgesEl.innerHTML = `
    <span class="badge ${sub.level === 'HL' ? 'hl' : sub.level === 'SL' ? 'sl' : ''}">
      ${sub.level === 'Both' ? 'SL / HL' : sub.level}
    </span>
    <span class="badge">${GROUP_NAMES[sub.group]}</span>
  `;

  // Stats
  const pct = subStats.answered > 0 ? Math.round((subStats.correct / subStats.answered) * 100) : 0;
  setText('sub-stat-total',    subQs.length);
  setText('sub-stat-done',     subStats.answered);
  setText('sub-stat-mastered', mastered);

  // Topic list
  const topicList = screen.querySelector('.topic-list');
  topicList.innerHTML = '';
  sub.topics.forEach(topic => {
    const count = subQs.filter(q => q.topic === topic).length;
    if (count === 0) return;
    const item = document.createElement('div');
    item.className = 'topic-item';
    item.innerHTML = `
      <span class="topic-name">${esc(topic)}</span>
      <span class="topic-count">${count} q</span>
    `;
    item.addEventListener('click', () => openSetupScreen(subjectId, { topic }));
    topicList.appendChild(item);
  });
  if (topicList.children.length === 0) {
    topicList.innerHTML = '<p class="text-muted text-sm" style="padding:12px 0">No questions yet for this subject.</p>';
  }

  // Mode buttons
  screen.querySelector('.btn-practice').onclick  = () => openSetupScreen(subjectId, { mode: 'practice' });
  screen.querySelector('.btn-exam').onclick      = () => openSetupScreen(subjectId, { mode: 'paper' });
  screen.querySelector('.btn-endless').onclick   = () => startQuiz({ subjectId, mode: 'endless' });
  screen.querySelector('.btn-request').onclick   = () => openRequestScreen(subjectId);
  screen.querySelector('.back-btn').onclick = goBack;

  showScreen('screen-subject');
}

// ─── Setup Screen ─────────────────────────────────────────
function openSetupScreen(subjectId, prefill = {}) {
  const sub = SUBJECTS.find(s => s.id === subjectId);
  if (!sub) return;

  const screen = document.getElementById('screen-setup');
  screen.querySelector('.setup-subject-name').textContent = sub.name;
  screen.querySelector('.back-btn').onclick = goBack;

  // Mode chips
  const modes = ['practice', 'paper', 'endless'];
  let selectedMode = prefill.mode || 'practice';

  // Paper chips (1, 2, 3)
  let selectedPapers = new Set([1, 2, 3]);

  // Level chips
  let selectedLevel = 'all';

  // Format chips
  let selectedFormats = new Set(['MCQ', 'ShortAnswer', 'Essay']);

  // Topic chips
  const allTopics = sub.topics;
  let selectedTopics = prefill.topic ? new Set([prefill.topic]) : new Set(allTopics);

  function renderChips() {
    // Mode
    renderChipGroup('setup-modes', modes, [selectedMode], (val) => {
      selectedMode = val;
      renderChips();
    }, (m) => m.charAt(0).toUpperCase() + m.slice(1));

    // Paper (only show if not endless)
    const paperSection = document.getElementById('setup-paper-section');
    if (selectedMode === 'endless') {
      paperSection.classList.add('hidden');
    } else {
      paperSection.classList.remove('hidden');
      renderChipGroupMulti('setup-papers', [1, 2, 3], selectedPapers, (val) => {
        if (selectedPapers.has(val)) {
          if (selectedPapers.size > 1) selectedPapers.delete(val);
        } else {
          selectedPapers.add(val);
        }
        renderChips();
      }, (p) => 'Paper ' + p);
    }

    // Level
    const levelOpts = sub.level === 'Both' ? ['all', 'SL', 'HL'] : ['all'];
    renderChipGroup('setup-levels', levelOpts, [selectedLevel], (val) => {
      selectedLevel = val;
      renderChips();
    }, (l) => l === 'all' ? 'All Levels' : l);

    // Format
    renderChipGroupMulti('setup-formats', ['MCQ', 'ShortAnswer', 'Essay'], selectedFormats, (val) => {
      if (selectedFormats.has(val)) {
        if (selectedFormats.size > 1) selectedFormats.delete(val);
      } else {
        selectedFormats.add(val);
      }
      renderChips();
    }, (f) => f === 'ShortAnswer' ? 'Short Answer' : f);

    // Topics
    renderChipGroupMulti('setup-topics', allTopics, selectedTopics, (val) => {
      if (selectedTopics.has(val)) {
        if (selectedTopics.size > 1) selectedTopics.delete(val);
      } else {
        selectedTopics.add(val);
      }
      renderChips();
    }, (t) => t);

    // Question count
    const filtered = getFilteredQuestions(subjectId, { selectedMode, selectedPapers, selectedLevel, selectedFormats, selectedTopics });
    setText('setup-q-count', `${filtered.length} question${filtered.length !== 1 ? 's' : ''} available`);
    const startBtn = document.getElementById('setup-start-btn');
    startBtn.disabled = filtered.length === 0;
  }

  renderChips();

  const startBtn = document.getElementById('setup-start-btn');
  startBtn.onclick = () => {
    const filtered = getFilteredQuestions(subjectId, { selectedMode, selectedPapers, selectedLevel, selectedFormats, selectedTopics });
    if (filtered.length === 0) return;
    startQuiz({
      subjectId,
      mode: selectedMode,
      paper: selectedMode === 'paper' ? [...selectedPapers].sort()[0] : null,
      level: selectedLevel === 'all' ? null : selectedLevel,
      topics: [...selectedTopics],
      formats: [...selectedFormats],
      questions: filtered,
    });
  };

  showScreen('screen-setup');
}

function renderChipGroup(containerId, options, selected, onSelect, labelFn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  options.forEach(opt => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (selected.includes(opt) ? ' active' : '');
    chip.textContent = labelFn(opt);
    chip.onclick = () => onSelect(opt);
    container.appendChild(chip);
  });
}

function renderChipGroupMulti(containerId, options, selectedSet, onToggle, labelFn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  options.forEach(opt => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (selectedSet.has(opt) ? ' active' : '');
    chip.textContent = labelFn(opt);
    chip.onclick = () => onToggle(opt);
    container.appendChild(chip);
  });
}

function getFilteredQuestions(subjectId, { selectedMode, selectedPapers, selectedLevel, selectedFormats, selectedTopics }) {
  let qs = allQuestions.filter(q => q.subjectId === subjectId);

  if (selectedTopics && selectedTopics.size > 0) {
    qs = qs.filter(q => selectedTopics.has(q.topic));
  }
  if (selectedFormats && selectedFormats.size > 0 && selectedFormats.size < 3) {
    qs = qs.filter(q => selectedFormats.has(q.format));
  }
  if (selectedLevel && selectedLevel !== 'all') {
    qs = qs.filter(q => q.level === selectedLevel || q.level === 'Both');
  }
  if (selectedMode !== 'endless' && selectedPapers && selectedPapers.size > 0 && selectedPapers.size < 3) {
    qs = qs.filter(q => selectedPapers.has(q.paper));
  }

  return qs;
}

// ─── Quiz Engine ──────────────────────────────────────────
function startQuiz(opts) {
  const sub = SUBJECTS.find(s => s.id === opts.subjectId);
  if (!sub) return;

  let questions = opts.questions;
  if (!questions) {
    questions = allQuestions.filter(q => q.subjectId === opts.subjectId);
  }
  if (questions.length === 0) return;

  // Shuffle for practice/endless
  if (opts.mode !== 'paper') {
    questions = shuffle([...questions]);
  }

  const timerSecs = opts.mode === 'paper' && opts.paper
    ? (PAPER_TIMES[opts.paper] || null)
    : null;

  currentSession = {
    subjectId:   opts.subjectId,
    subjectName: sub.name,
    mode:        opts.mode,
    paper:       opts.paper,
    level:       opts.level,
    topics:      opts.topics,
    questions,
    currentIdx:  0,
    answers:     {},
    flags:       new Set(),
    timerSecs,
    timerSecsLeft: timerSecs,
    timerInterval: null,
    startTime:   Date.now(),
  };

  renderQuizQuestion();
  showScreen('screen-quiz');

  if (timerSecs) {
    startTimer();
  }
}

function renderQuizQuestion() {
  if (!currentSession) return;

  const { questions, currentIdx, answers, flags, subjectName, mode, timerSecsLeft } = currentSession;
  const q = questions[currentIdx];
  if (!q) return;

  const screen = document.getElementById('screen-quiz');

  // Header
  screen.querySelector('.quiz-subject-name').textContent = subjectName.toUpperCase();

  // Progress
  const pct = Math.round(((currentIdx + 1) / questions.length) * 100);
  screen.querySelector('.quiz-progress-fill').style.width = pct + '%';
  screen.querySelector('.quiz-progress-label').textContent = `${currentIdx + 1} / ${questions.length}`;

  // Timer (handled separately by startTimer)
  const timerEl = screen.querySelector('.quiz-timer');
  if (currentSession.timerSecs) {
    timerEl.classList.remove('hidden');
  } else {
    timerEl.classList.add('hidden');
  }

  // Mark q as seen
  seenSet.add(q.id);
  saveSeen();

  // Question meta chips
  const metaEl = screen.querySelector('.question-meta');
  const ctInfo = COMMAND_TERM_INFO[q.commandTerm?.toLowerCase()] || null;
  metaEl.innerHTML = `
    ${q.topic ? `<span class="meta-chip">${esc(q.topic)}</span>` : ''}
    ${q.paper ? `<span class="meta-chip">Paper ${q.paper}</span>` : ''}
    ${q.marks ? `<span class="meta-chip">[${q.marks} mark${q.marks > 1 ? 's' : ''}]</span>` : ''}
    ${q.commandTerm ? `<span class="meta-chip command">${esc(q.commandTerm)}</span>` : ''}
  `;

  // Command term context for essay/short answer
  const essayCtx = screen.querySelector('.essay-context');
  if ((q.format === 'Essay' || q.format === 'ShortAnswer') && ctInfo) {
    essayCtx.classList.remove('hidden');
    essayCtx.innerHTML = `<strong>${esc(q.commandTerm)}:</strong> ${esc(ctInfo.tip)} Typical marks: ${ctInfo.marks}.`;
  } else {
    essayCtx.classList.add('hidden');
  }

  // Prompt
  const promptEl = screen.querySelector('.question-prompt');
  promptEl.textContent = q.prompt;
  renderMath(promptEl);

  // Answer area
  const choicesEl  = screen.querySelector('.choices-list');
  const textareaEl = screen.querySelector('.answer-textarea');
  const feedbackEl = screen.querySelector('.feedback-panel');

  feedbackEl.className = 'feedback-panel hidden';
  const prev = answers[q.id];

  if (q.format === 'MCQ') {
    choicesEl.classList.remove('hidden');
    textareaEl.classList.add('hidden');

    // Build choice buttons
    choicesEl.innerHTML = '';
    const choiceKeys = q.choices ? Object.keys(q.choices) : ['A','B','C','D'];
    choiceKeys.forEach(key => {
      const text = q.choices ? q.choices[key] : '';
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.dataset.choice = key;

      btn.innerHTML = `
        <span class="choice-letter">${key}</span>
        <span class="choice-text"></span>
      `;
      btn.querySelector('.choice-text').textContent = text;
      renderMath(btn.querySelector('.choice-text'));

      if (prev && prev.submitted) {
        btn.disabled = true;
        if (key === q.answer) btn.classList.add('correct');
        if (key === prev.choice && prev.choice !== q.answer) btn.classList.add('incorrect');
        if (key === prev.choice) btn.classList.add('selected');
      } else {
        btn.onclick = () => handleMCQChoice(q, key);
      }
      choicesEl.appendChild(btn);
    });

    if (prev && prev.submitted) {
      showMCQFeedback(q, prev.choice);
    }

  } else {
    // Short Answer / Essay
    choicesEl.classList.add('hidden');
    textareaEl.classList.remove('hidden');

    if (prev && prev.submitted) {
      textareaEl.value = prev.userAnswer || '';
      textareaEl.disabled = true;
      showSelfMarkFeedback(q, prev);
    } else {
      textareaEl.value = '';
      textareaEl.disabled = false;
    }
  }

  // Toolbar
  const flagBtn    = screen.querySelector('.btn-flag');
  const submitBtn  = screen.querySelector('.btn-submit');
  const nextBtn    = screen.querySelector('.btn-next');
  const prevBtnNav = screen.querySelector('.btn-prev');

  // Flag state
  flagBtn.classList.toggle('flag-active', flags.has(q.id));
  flagBtn.onclick = () => toggleFlag(q.id);

  // Submit / Next
  if (prev && prev.submitted) {
    submitBtn.classList.add('hidden');
    nextBtn.classList.remove('hidden');
  } else {
    submitBtn.classList.remove('hidden');
    nextBtn.classList.add('hidden');
    submitBtn.onclick = () => handleSubmit(q);
  }

  nextBtn.onclick = () => advanceQuestion(1);

  // Prev/Next navigation
  prevBtnNav.disabled = currentIdx === 0;
  prevBtnNav.onclick = () => advanceQuestion(-1);

  // Nav overlay button
  screen.querySelector('.btn-nav-overlay').onclick = openNavOverlay;
}

function handleMCQChoice(q, choiceKey) {
  if (!currentSession) return;
  const prev = currentSession.answers[q.id];
  if (prev && prev.submitted) return;

  // Deselect all, select clicked
  document.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  document.querySelector(`.choice-btn[data-choice="${choiceKey}"]`)?.classList.add('selected');

  currentSession.answers[q.id] = { choice: choiceKey, submitted: false };

  // Enable submit button
  const submitBtn = document.querySelector('#screen-quiz .btn-submit');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.onclick = () => handleSubmit(q);
  }
}

function handleSubmit(q) {
  if (!currentSession) return;
  const session = currentSession;

  if (q.format === 'MCQ') {
    const answerState = session.answers[q.id];
    if (!answerState || !answerState.choice) {
      // Nothing selected yet — flash a hint
      const choicesEl = document.querySelector('.choices-list');
      choicesEl.style.opacity = '0.5';
      setTimeout(() => { choicesEl.style.opacity = '1'; }, 300);
      return;
    }
    const correct = answerState.choice === q.answer;
    session.answers[q.id] = { ...answerState, submitted: true, correct };

    // Update stats
    recordAttempt(q, correct);

    // Disable all choice buttons, mark correct/incorrect
    document.querySelectorAll('.choice-btn').forEach(btn => {
      btn.disabled = true;
      const key = btn.dataset.choice;
      if (key === q.answer) btn.classList.add('correct');
      if (key === answerState.choice && !correct) btn.classList.add('incorrect');
    });

    showMCQFeedback(q, answerState.choice);

  } else {
    // Short answer / essay
    const textareaEl = document.querySelector('#screen-quiz .answer-textarea');
    const userAnswer = textareaEl ? textareaEl.value.trim() : '';
    session.answers[q.id] = { submitted: true, userAnswer, selfMark: null, correct: null };
    if (textareaEl) textareaEl.disabled = true;
    showSelfMarkFeedback(q, session.answers[q.id]);
  }

  // Toggle submit/next buttons
  document.querySelector('#screen-quiz .btn-submit').classList.add('hidden');
  document.querySelector('#screen-quiz .btn-next').classList.remove('hidden');
  document.querySelector('#screen-quiz .btn-next').onclick = () => advanceQuestion(1);
}

function showMCQFeedback(q, chosenKey) {
  const correct = chosenKey === q.answer;
  const feedbackEl = document.querySelector('#screen-quiz .feedback-panel');

  feedbackEl.className = 'feedback-panel ' + (correct ? 'correct' : 'incorrect');
  feedbackEl.innerHTML = `
    <div class="feedback-header ${correct ? 'correct' : 'incorrect'}">
      <span class="feedback-result-icon">${correct ? '✓' : '✗'}</span>
      <span class="feedback-result-text ${correct ? 'correct' : 'incorrect'}">${correct ? 'Correct!' : 'Incorrect'}</span>
    </div>
    <div class="feedback-body">
      ${!correct ? `<div class="feedback-section-title">Correct Answer</div>
        <div class="feedback-text">${esc(q.answer)}${q.choices && q.choices[q.answer] ? ': ' + esc(q.choices[q.answer]) : ''}</div>` : ''}
      <div class="feedback-section-title">Mark Scheme</div>
      <div class="feedback-ms-text feedback-text">${esc(q.markScheme || '')}</div>
      ${q.explanation ? `<div class="feedback-section-title">Explanation</div>
        <div class="feedback-exp-text feedback-text">${esc(q.explanation)}</div>` : ''}
    </div>
  `;

  feedbackEl.classList.remove('hidden');
  renderMath(feedbackEl);
}

function showSelfMarkFeedback(q, answerState) {
  const feedbackEl = document.querySelector('#screen-quiz .feedback-panel');

  const alreadySelfMarked = answerState.selfMark !== null && answerState.selfMark !== undefined;

  feedbackEl.className = 'feedback-panel self-mark';
  feedbackEl.innerHTML = `
    <div class="feedback-header self-mark">
      <span class="feedback-result-icon">📋</span>
      <span class="feedback-result-text self-mark">Mark Scheme</span>
    </div>
    <div class="feedback-body">
      <div class="feedback-section-title">Mark Scheme</div>
      <div class="feedback-ms-text feedback-text">${esc(q.markScheme || '')}</div>
      ${q.explanation ? `<div class="feedback-section-title">Model Notes</div>
        <div class="feedback-exp-text feedback-text">${esc(q.explanation)}</div>` : ''}
      ${!alreadySelfMarked ? `
        <div class="feedback-section-title">Self-Assessment — Mark yourself honestly</div>
        <div class="self-mark-controls">
          <button class="self-mark-btn got-it" onclick="submitSelfMark('${q.id}', true)">✓ Got it</button>
          <button class="self-mark-btn missed" onclick="submitSelfMark('${q.id}', false)">✗ Missed it</button>
        </div>
      ` : `
        <div class="feedback-section-title">Your Self-Assessment</div>
        <div class="feedback-text" style="color:${answerState.selfMark ? '#4ade80' : '#f87171'}">${answerState.selfMark ? '✓ Marked as correct' : '✗ Marked as incorrect'}</div>
      `}
    </div>
  `;

  feedbackEl.classList.remove('hidden');
  renderMath(feedbackEl);
}

function submitSelfMark(questionId, gotIt) {
  if (!currentSession) return;
  const q = currentSession.questions.find(q => q.id === questionId);
  if (!q) return;

  currentSession.answers[questionId].selfMark = gotIt;
  currentSession.answers[questionId].correct  = gotIt;

  recordAttempt(q, gotIt);
  showSelfMarkFeedback(q, currentSession.answers[questionId]);
}

function recordAttempt(q, correct) {
  stats.answered++;
  if (correct) {
    stats.correct++;
    mastSet.add(q.id);
    saveMastered();
  }

  // By-subject tracking
  if (!stats.bySubject[q.subjectId]) {
    stats.bySubject[q.subjectId] = { answered: 0, correct: 0 };
  }
  stats.bySubject[q.subjectId].answered++;
  if (correct) stats.bySubject[q.subjectId].correct++;

  // Streak
  const today = new Date().toDateString();
  if (stats.lastDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (stats.lastDate === yesterday) {
      stats.streak++;
    } else if (stats.lastDate !== today) {
      stats.streak = 1;
    }
    stats.lastDate = today;
  }

  saveStats();
}

function advanceQuestion(delta) {
  if (!currentSession) return;
  const { questions, currentIdx } = currentSession;
  const next = currentIdx + delta;

  if (next < 0) return;

  if (next >= questions.length) {
    endQuiz();
    return;
  }

  currentSession.currentIdx = next;
  renderQuizQuestion();

  // Scroll quiz body to top
  const body = document.querySelector('.quiz-body');
  if (body) body.scrollTop = 0;
}

function toggleFlag(questionId) {
  if (!currentSession) return;
  if (currentSession.flags.has(questionId)) {
    currentSession.flags.delete(questionId);
  } else {
    currentSession.flags.add(questionId);
  }
  const flagBtn = document.querySelector('#screen-quiz .btn-flag');
  if (flagBtn) flagBtn.classList.toggle('flag-active', currentSession.flags.has(questionId));
}

// ─── Question Navigator Overlay ───────────────────────────
function openNavOverlay() {
  if (!currentSession) return;
  const overlay = document.getElementById('q-nav-overlay');
  if (!overlay) return;

  const grid = overlay.querySelector('.q-nav-grid');
  grid.innerHTML = '';

  currentSession.questions.forEach((q, idx) => {
    const ans = currentSession.answers[q.id];
    const dot = document.createElement('button');
    dot.className = 'q-nav-dot';
    dot.textContent = idx + 1;

    if (idx === currentSession.currentIdx) dot.classList.add('current');
    if (ans && ans.submitted) {
      if (ans.correct === true)  dot.classList.add('correct');
      else if (ans.correct === false) dot.classList.add('incorrect');
      else dot.classList.add('answered');
    }
    if (currentSession.flags.has(q.id)) dot.classList.add('flagged');

    dot.onclick = () => {
      closeNavOverlay();
      currentSession.currentIdx = idx;
      renderQuizQuestion();
      document.querySelector('.quiz-body').scrollTop = 0;
    };
    grid.appendChild(dot);
  });

  overlay.classList.add('open');
}

function closeNavOverlay() {
  const overlay = document.getElementById('q-nav-overlay');
  if (overlay) overlay.classList.remove('open');
}

// ─── Timer ────────────────────────────────────────────────
function startTimer() {
  if (!currentSession || !currentSession.timerSecs) return;
  stopTimer();

  updateTimerDisplay();

  currentSession.timerInterval = setInterval(() => {
    currentSession.timerSecsLeft--;
    updateTimerDisplay();

    if (currentSession.timerSecsLeft <= 0) {
      stopTimer();
      // Auto-end quiz
      endQuiz(true);
    }
  }, 1000);
}

function stopTimer() {
  if (currentSession && currentSession.timerInterval) {
    clearInterval(currentSession.timerInterval);
    currentSession.timerInterval = null;
  }
}

function updateTimerDisplay() {
  if (!currentSession) return;
  const el = document.querySelector('.quiz-timer');
  if (!el) return;

  const secs = currentSession.timerSecsLeft || 0;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  el.textContent = `⏱ ${m}:${String(s).padStart(2,'0')}`;

  el.classList.remove('warning', 'critical');
  if (secs < 60)  el.classList.add('critical');
  else if (secs < 300) el.classList.add('warning');
}

// ─── End Quiz / Results ───────────────────────────────────
function endQuiz(timedOut = false) {
  stopTimer();

  if (!currentSession) return;

  const { questions, answers, subjectName, mode, timerSecs } = currentSession;

  // Tally
  let totalMCQ = 0, correctMCQ = 0;
  let totalSelfMark = 0, selfMarkCorrect = 0;

  const topicMap = {};

  questions.forEach(q => {
    const a = answers[q.id];
    const topic = q.topic || 'General';
    if (!topicMap[topic]) topicMap[topic] = { total: 0, correct: 0 };
    topicMap[topic].total++;

    if (q.format === 'MCQ') {
      totalMCQ++;
      if (a && a.correct === true) {
        correctMCQ++;
        topicMap[topic].correct++;
      }
    } else {
      totalSelfMark++;
      if (a && a.selfMark === true) {
        selfMarkCorrect++;
        topicMap[topic].correct++;
      }
    }
  });

  const totalAnswered = totalMCQ + totalSelfMark;
  const totalCorrect  = correctMCQ + selfMarkCorrect;
  const pct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  // Verdict
  let verdict = pct >= 80 ? '🎉 Excellent!' :
                pct >= 60 ? '👍 Good effort' :
                pct >= 40 ? '📚 Keep studying' :
                            '💪 Review the material';

  // Save to history
  const history = loadJSON(SK.history, []);
  history.unshift({
    date: new Date().toISOString(),
    subjectId: currentSession.subjectId,
    subjectName,
    mode,
    total: totalAnswered,
    correct: totalCorrect,
    pct,
    timedOut,
  });
  saveJSON(SK.history, history.slice(0, 50));

  // Render results screen
  const screen = document.getElementById('screen-results');
  screen.querySelector('.results-subject-name').textContent = subjectName;
  screen.querySelector('.score-pct').textContent = pct + '%';
  screen.querySelector('.score-sub').textContent = `${totalCorrect}/${totalAnswered}`;
  screen.querySelector('.results-verdict').textContent = verdict;
  screen.querySelector('.results-detail').textContent =
    `${totalMCQ} MCQ · ${totalSelfMark} written` + (timedOut ? ' · Time expired' : '');

  // Topic breakdown
  const breakdownEl = screen.querySelector('.results-breakdown');
  breakdownEl.innerHTML = '<div class="section-header">Topic Breakdown</div>';
  Object.entries(topicMap).forEach(([topic, { total, correct }]) => {
    const tp = total > 0 ? Math.round((correct / total) * 100) : 0;
    const row = document.createElement('div');
    row.className = 'breakdown-row';
    row.innerHTML = `
      <div class="breakdown-topic">${esc(topic)}</div>
      <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${tp}%"></div></div>
      <div class="breakdown-pct">${tp}%</div>
    `;
    breakdownEl.appendChild(row);
  });

  // Review list
  const reviewEl = screen.querySelector('.review-list');
  reviewEl.innerHTML = '<div class="section-header">Review</div>';
  questions.forEach((q, idx) => {
    const a = answers[q.id];
    if (!a || !a.submitted) return;
    const isCorrect = a.correct === true;
    const item = document.createElement('div');
    item.className = `review-item ${isCorrect ? 'correct' : 'incorrect'}`;
    item.innerHTML = `
      <div class="review-q">${idx + 1}. ${esc(q.prompt.slice(0, 160))}${q.prompt.length > 160 ? '…' : ''}</div>
      <div class="review-verdict">
        <span>${isCorrect ? '✓' : '✗'}</span>
        <span style="color:${isCorrect ? '#4ade80' : '#f87171'}">${q.format === 'MCQ' ? (isCorrect ? 'Correct' : `Incorrect — answer: ${q.answer}`) : (a.selfMark ? 'Self-marked correct' : 'Self-marked incorrect')}</span>
      </div>
      <div class="review-ms">${esc((q.markScheme || '').slice(0, 300))}${(q.markScheme || '').length > 300 ? '…' : ''}</div>
    `;
    reviewEl.appendChild(item);
  });

  // Buttons
  screen.querySelector('.btn-retry').onclick = () => {
    startQuiz({
      subjectId: currentSession.subjectId,
      mode: currentSession.mode,
      paper: currentSession.paper,
      questions: currentSession.questions,
    });
  };
  screen.querySelector('.btn-home').onclick = () => {
    currentSession = null;
    buildHomeScreen();
    screenStack = ['screen-home'];
    showScreen('screen-home', false, false);
  };
  screen.querySelector('.back-btn').onclick = () => {
    buildHomeScreen();
    screenStack = ['screen-home'];
    showScreen('screen-home', false, false);
    currentSession = null;
  };

  showScreen('screen-results');

  // Update home stats
  buildHomeScreen();
}

// ─── Admin Screen ─────────────────────────────────────────
function openAdminScreen() {
  const screen = document.getElementById('screen-admin');
  screen.querySelector('.back-btn').onclick = goBack;

  // Populate subject dropdown
  const subjectSelect = document.getElementById('admin-subject');
  subjectSelect.innerHTML = SUBJECTS.map(s =>
    `<option value="${s.id}">${esc(s.name)}</option>`
  ).join('');

  // Topic update on subject change
  function updateTopics() {
    const subId = subjectSelect.value;
    const sub = SUBJECTS.find(s => s.id === subId);
    const topicSelect = document.getElementById('admin-topic');
    if (sub) {
      topicSelect.innerHTML = sub.topics.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    }
  }
  subjectSelect.onchange = updateTopics;
  updateTopics();

  // Show/hide MCQ choices based on format
  const formatSelect = document.getElementById('admin-format');
  function updateFormatFields() {
    const fmt = formatSelect.value;
    const choicesSection = document.getElementById('admin-choices-section');
    const answerSection  = document.getElementById('admin-answer-section');
    if (fmt === 'MCQ') {
      choicesSection.classList.remove('hidden');
      answerSection.classList.remove('hidden');
    } else {
      choicesSection.classList.add('hidden');
      answerSection.classList.add('hidden');
    }
  }
  formatSelect.onchange = updateFormatFields;
  updateFormatFields();

  // Submit
  document.getElementById('admin-save-btn').onclick = saveAdminQuestion;

  showScreen('screen-admin');
}

function saveAdminQuestion() {
  const subjectId = document.getElementById('admin-subject').value;
  const topic     = document.getElementById('admin-topic').value;
  const paper     = parseInt(document.getElementById('admin-paper').value);
  const level     = document.getElementById('admin-level').value;
  const format    = document.getElementById('admin-format').value;
  const marks     = parseInt(document.getElementById('admin-marks').value) || 1;
  const commandTerm = document.getElementById('admin-command').value.trim();
  const prompt    = document.getElementById('admin-prompt').value.trim();
  const markScheme = document.getElementById('admin-markscheme').value.trim();
  const explanation = document.getElementById('admin-explanation').value.trim();

  if (!prompt || !markScheme) {
    alert('Prompt and mark scheme are required.');
    return;
  }

  const sub = SUBJECTS.find(s => s.id === subjectId);
  const id  = `imported-${Date.now()}`;

  const question = {
    id, subjectId, subject: sub?.name, topic, paper, level, format, marks, commandTerm, prompt, markScheme, explanation,
    difficulty: 2,
  };

  if (format === 'MCQ') {
    const choiceA = document.getElementById('admin-choice-a').value.trim();
    const choiceB = document.getElementById('admin-choice-b').value.trim();
    const choiceC = document.getElementById('admin-choice-c').value.trim();
    const choiceD = document.getElementById('admin-choice-d').value.trim();
    const answer  = document.getElementById('admin-answer').value;

    if (!choiceA || !choiceB) {
      alert('Please fill in at least choices A and B.');
      return;
    }

    question.choices = {};
    if (choiceA) question.choices.A = choiceA;
    if (choiceB) question.choices.B = choiceB;
    if (choiceC) question.choices.C = choiceC;
    if (choiceD) question.choices.D = choiceD;
    question.answer = answer;
  }

  // Save to localStorage
  const imported = loadJSON(SK.imported, []);
  imported.push(question);
  saveJSON(SK.imported, imported);

  // Add to in-memory list
  allQuestions.push(question);

  // Reset form
  document.getElementById('admin-form').reset();
  document.getElementById('admin-topic').innerHTML = '';
  document.getElementById('admin-subject').dispatchEvent(new Event('change'));
  document.getElementById('admin-format').dispatchEvent(new Event('change'));

  const toast = document.getElementById('admin-toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);

  buildHomeScreen();
}

// ─── Request Screen ───────────────────────────────────────
function openRequestScreen(subjectId) {
  const sub = SUBJECTS.find(s => s.id === subjectId);
  const screen = document.getElementById('screen-request');
  screen.querySelector('.back-btn').onclick = goBack;

  const subjectSelect = document.getElementById('req-subject');
  subjectSelect.innerHTML = SUBJECTS.map(s =>
    `<option value="${s.id}" ${s.id === subjectId ? 'selected' : ''}>${esc(s.name)}</option>`
  ).join('');

  document.getElementById('req-submit-btn').onclick = () => {
    const selSubId  = document.getElementById('req-subject').value;
    const selSub    = SUBJECTS.find(s => s.id === selSubId);
    const type      = document.getElementById('req-type').value;
    const topic     = document.getElementById('req-topic').value.trim();
    const details   = document.getElementById('req-details').value.trim();

    const title = encodeURIComponent(`[REQUEST] ${selSub?.name || selSubId} — ${type}`);
    const body  = encodeURIComponent(
      `**Subject:** ${selSub?.name}\n**Type:** ${type}\n**Topic:** ${topic || 'Not specified'}\n\n**Details:**\n${details || 'No additional details.'}`
    );

    const url = `https://github.com/sudo-nkop/ib-prep-app/issues/new?title=${title}&body=${body}&labels=content-request`;
    window.open(url, '_blank');
  };

  showScreen('screen-request');
}

// ─── Math Rendering ───────────────────────────────────────
function renderMath(el) {
  if (!el || typeof renderMathInElement === 'undefined') return;
  try {
    renderMathInElement(el, {
      delimiters: [
        { left: '$$',  right: '$$',  display: true  },
        { left: '$',   right: '$',   display: false },
        { left: '\\[', right: '\\]', display: true  },
        { left: '\\(', right: '\\)', display: false },
      ],
      throwOnError: false,
    });
  } catch (e) {}
}

// ─── Helpers ──────────────────────────────────────────────
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Global event wiring (called from HTML onclick) ───────
window.submitSelfMark    = submitSelfMark;
window.closeNavOverlay   = closeNavOverlay;
window.openAdminScreen   = openAdminScreen;
window.openRequestScreen = openRequestScreen;
window.goBack            = goBack;
window.endQuiz           = endQuiz;
window.SUBJECTS          = SUBJECTS;
