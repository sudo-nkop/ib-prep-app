/* ============================================================
   IB Prep App — Full Application Logic
   Vanilla JS, no build step, offline-capable via service worker
   Dark theme, localStorage persistence
   ============================================================ */

'use strict';

// ── Subjects ────────────────────────────────────────────────
const SUBJECTS = [
  { id: 'history-hl',    name: 'History HL',            group: 3, level: 'HL',   color: '#b45309' },
  { id: 'history-sl',    name: 'History SL',            group: 3, level: 'SL',   color: '#d97706' },
  { id: 'maa',           name: 'Mathematics AA',         group: 5, level: 'Both', color: '#1d4ed8' },
  { id: 'physics-sl',    name: 'Physics SL',            group: 4, level: 'SL',   color: '#7c3aed' },
  { id: 'tok',           name: 'Theory of Knowledge',   group: 0, level: 'Both', color: '#059669' },
  { id: 'english-b-hl', name: 'English B HL',           group: 2, level: 'HL',   color: '#dc2626' },
  { id: 'spanish-a-lit', name: 'Literatura Española A', group: 1, level: 'Both', color: '#ea580c' },
];

// ── Constants ────────────────────────────────────────────────
const STORAGE_KEYS = {
  PROGRESS:       'ib_progress',       // { questionId: { correct: n, attempts: n } }
  CUSTOM_QS:      'ib_custom_qs',      // array of custom questions added by user
  STATS:          'ib_stats',          // global stats object
  FLAGGED:        'ib_flagged',        // set of flagged question ids
  SESSION_RESULT: 'ib_session_result', // last session result for display
};

const MASTERY_THRESHOLD = 3;    // correct answers needed to master a question
const PRACTICE_LIMIT    = 15;   // max questions in practice mode
const TIMED_LIMIT       = 10;   // max questions in timed mode
const TIMED_SECS_PER_Q  = 90;   // seconds per question in timed mode

// ── Application State ────────────────────────────────────────
let allQuestions = [];          // all loaded questions (remote + custom)
let screenStack  = [];          // navigation stack of screen IDs

// Current quiz session
let session = null;
/*
  session shape:
  {
    subjectId: string,
    mode: 'practice' | 'timed' | 'endless',
    questions: Question[],
    currentIdx: number,
    answers: { [qId]: { chosen: string|null, correct: boolean } },
    flags: Set<string>,
    timerSecs: number|null,
    timerInterval: number|null,
    startTime: number,
  }
*/

// Subject screen transient state
let subjectState = {
  subjectId:      null,
  mode:           'practice',
  selectedTopics: new Set(),
};

// ── Storage Helpers ──────────────────────────────────────────
function loadStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('loadStore error:', key, e);
    return fallback;
  }
}

function saveStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('saveStore error (storage full?):', key, e);
  }
}

// ── Progress (per-question) ──────────────────────────────────
function getProgress() {
  return loadStore(STORAGE_KEYS.PROGRESS, {});
}

function saveProgress(prog) {
  saveStore(STORAGE_KEYS.PROGRESS, prog);
}

function getQuestionRecord(qId) {
  const prog = getProgress();
  return prog[qId] || { correct: 0, attempts: 0 };
}

function recordQuestionAnswer(qId, wasCorrect) {
  const prog = getProgress();
  if (!prog[qId]) prog[qId] = { correct: 0, attempts: 0 };
  prog[qId].attempts++;
  if (wasCorrect) prog[qId].correct++;
  saveProgress(prog);
}

function isMastered(qId) {
  const rec = getQuestionRecord(qId);
  return rec.correct >= MASTERY_THRESHOLD;
}

function getMasteryLevel(qId) {
  const rec = getQuestionRecord(qId);
  return Math.min(rec.correct, MASTERY_THRESHOLD);
}

// ── Global Stats ─────────────────────────────────────────────
function getStats() {
  return loadStore(STORAGE_KEYS.STATS, {
    totalAnswered: 0,
    totalCorrect:  0,
    streak:        0,
    lastDate:      null,
    sessionsCompleted: 0,
  });
}

function saveStats(s) {
  saveStore(STORAGE_KEYS.STATS, s);
}

function recordGlobalAnswer(wasCorrect) {
  const stats = getStats();
  stats.totalAnswered = (stats.totalAnswered || 0) + 1;
  if (wasCorrect) stats.totalCorrect = (stats.totalCorrect || 0) + 1;
  saveStats(stats);
}

function recordSessionCompleted() {
  const stats = getStats();
  stats.sessionsCompleted = (stats.sessionsCompleted || 0) + 1;
  saveStats(stats);
}

// ── Streak Logic ─────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function updateStreak() {
  const stats = getStats();
  const today = todayISO();
  if (stats.lastDate === today) return; // already counted today

  if (stats.lastDate === yesterdayISO()) {
    stats.streak = (stats.streak || 0) + 1;
  } else {
    // Streak broken or first day
    stats.streak = 1;
  }
  stats.lastDate = today;
  saveStats(stats);
}

function ensureStreakUpdated() {
  const stats = getStats();
  if (stats.lastDate !== todayISO()) {
    updateStreak();
  }
}

// ── Flagged Questions ────────────────────────────────────────
function getFlagged() {
  return new Set(loadStore(STORAGE_KEYS.FLAGGED, []));
}

function saveFlagged(set) {
  saveStore(STORAGE_KEYS.FLAGGED, [...set]);
}

function toggleFlagged(qId) {
  const flagged = getFlagged();
  if (flagged.has(qId)) {
    flagged.delete(qId);
  } else {
    flagged.add(qId);
  }
  saveFlagged(flagged);
  return flagged.has(qId);
}

// ── Custom Questions ─────────────────────────────────────────
function getCustomQuestions() {
  return loadStore(STORAGE_KEYS.CUSTOM_QS, []);
}

function saveCustomQuestions(qs) {
  saveStore(STORAGE_KEYS.CUSTOM_QS, qs);
}

function addCustomQuestion(q) {
  const custom = getCustomQuestions();
  custom.push(q);
  saveCustomQuestions(custom);
  mergeCustomIntoPool();
}

// ── Data Loading ─────────────────────────────────────────────
async function loadQuestions() {
  try {
    const res = await fetch('data/questions.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Invalid format');
    allQuestions = data;
    console.log(`Loaded ${allQuestions.length} questions from server`);
  } catch (e) {
    console.error('Failed to load questions.json:', e);
    allQuestions = [];
    showDataLoadError();
  }
  mergeCustomIntoPool();
}

function mergeCustomIntoPool() {
  // Remove previously-merged custom questions
  allQuestions = allQuestions.filter(q => !q._custom);
  // Add current custom questions
  const custom = getCustomQuestions();
  allQuestions = allQuestions.concat(
    custom.map(q => ({ ...q, _custom: true }))
  );
}

function showDataLoadError() {
  const grid = document.getElementById('subjects-grid');
  if (grid) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <span class="empty-state-icon">⚠️</span>
        <p>Could not load questions.<br>Check your connection and reload.</p>
      </div>
    `;
  }
}

// ── Subject Helpers ──────────────────────────────────────────
function getSubjectById(id) {
  return SUBJECTS.find(s => s.id === id) || null;
}

function getQuestionsForSubject(subjectId, topicFilter = null) {
  let qs = allQuestions.filter(q => q.subjectId === subjectId);

  // Filter by prescribed works if user has selected specific texts
  if (PRESCRIBED_TEXTS[subjectId]) {
    const selectedIds = getSelectedWorks(subjectId);
    if (selectedIds.length > 0) {
      const texts = PRESCRIBED_TEXTS[subjectId];
      const selectedTitles  = selectedIds.map(id => texts.find(t => t.id === id)?.title  || '').filter(Boolean);
      const selectedAuthors = selectedIds.map(id => texts.find(t => t.id === id)?.author || '').filter(Boolean);
      // Keep a question if its prompt or markScheme mentions any selected author/title
      qs = qs.filter(q => {
        const haystack = ((q.prompt || '') + ' ' + (q.markScheme || '') + ' ' + (q.topic || '')).toLowerCase();
        return selectedTitles.some(t => haystack.includes(t.toLowerCase()))
          || selectedAuthors.some(a => haystack.includes(a.split(' ').pop().toLowerCase()));
      });
      // Fallback: if filter yields nothing, return all questions (don't leave user stranded)
      if (qs.length === 0) {
        qs = allQuestions.filter(q => q.subjectId === subjectId);
      }
    }
  }

  if (topicFilter && topicFilter.size > 0) {
    qs = qs.filter(q => topicFilter.has(q.topic));
  }
  return qs;
}

function getTopicsForSubject(subjectId) {
  const qs = allQuestions.filter(q => q.subjectId === subjectId);
  return [...new Set(qs.map(q => q.topic))].sort();
}

function getSubjectStats(subjectId) {
  const qs   = allQuestions.filter(q => q.subjectId === subjectId);
  const prog = getProgress();
  let answered = 0, correctTotal = 0, mastered = 0;

  for (const q of qs) {
    const rec = prog[q.id] || { correct: 0, attempts: 0 };
    if (rec.attempts > 0) {
      answered++;
      correctTotal += rec.correct;
    }
    if (rec.correct >= MASTERY_THRESHOLD) mastered++;
  }

  const accuracy = answered > 0
    ? Math.round((correctTotal / answered) * 100)
    : 0;

  return {
    total:    qs.length,
    answered,
    mastered,
    accuracy,
    correct:  correctTotal,
  };
}

// ── Navigation (Screen Stack) ────────────────────────────────
function showScreen(id, pushToStack = true) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + id);
  if (!target) {
    console.error('Screen not found:', id);
    return;
  }
  target.classList.add('active');

  if (pushToStack) {
    // Avoid duplicate top of stack
    if (screenStack[screenStack.length - 1] !== id) {
      screenStack.push(id);
    }
  }

  // Scroll to top
  target.scrollTop = 0;
  window.scrollTo(0, 0);
}

function goBack() {
  if (screenStack.length <= 1) {
    navigateHome();
    return;
  }
  screenStack.pop();
  const prev = screenStack[screenStack.length - 1];
  showScreen(prev, false);

  // Re-render destination screen when navigating back
  if (prev === 'home')    renderHome();
  if (prev === 'subject') renderSubjectScreen();
}

function navigateHome() {
  screenStack = ['home'];
  showScreen('home', false);
  renderHome();
}

// ── HOME SCREEN ──────────────────────────────────────────────
function renderHome() {
  const stats = getStats();

  // Stats row
  document.getElementById('stat-answered').textContent =
    formatNumber(stats.totalAnswered || 0);

  const acc = (stats.totalAnswered && stats.totalAnswered > 0)
    ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
    : 0;
  document.getElementById('stat-accuracy').textContent = acc + '%';

  const streak = stats.streak || 0;
  document.getElementById('stat-streak').textContent = streak + '🔥';

  // Subject tiles — only show subjects the user is taking
  const grid = document.getElementById('subjects-grid');
  grid.innerHTML = '';

  const activeSubjects = getActiveSubjects();
  for (const subj of activeSubjects) {
    const sstats = getSubjectStats(subj.id);
    const tile = buildSubjectTile(subj, sstats);
    grid.appendChild(tile);
  }
}

function buildSubjectTile(subj, sstats) {
  const tile = document.createElement('button');
  tile.className = 'subject-tile';
  tile.style.setProperty('--subject-color', subj.color);
  tile.setAttribute('role', 'listitem');
  tile.setAttribute('aria-label', subj.name);

  const progressPct = sstats.total > 0
    ? Math.round((sstats.answered / sstats.total) * 100)
    : 0;

  tile.innerHTML = `
    <span class="subject-tile-badge">${escHtml(subj.level)}</span>
    <div class="subject-tile-name">${escHtml(subj.name)}</div>
    <div class="subject-tile-meta">Group ${subj.group} &middot; ${sstats.total} questions</div>
    <div class="subject-tile-stats">
      ${sstats.answered}/${sstats.total} answered &middot; ${sstats.accuracy}% accuracy
    </div>
  `;

  tile.addEventListener('click', () => openSubjectScreen(subj.id));
  return tile;
}

// ── SUBJECT SCREEN ───────────────────────────────────────────
function openSubjectScreen(subjectId) {
  subjectState.subjectId      = subjectId;
  subjectState.mode           = 'practice';
  subjectState.selectedTopics = new Set();
  renderSubjectScreen();
  showScreen('subject');
}

function renderSubjectScreen() {
  const subj = getSubjectById(subjectState.subjectId);
  if (!subj) return;

  const sstats = getSubjectStats(subj.id);

  // Sticky top bar
  document.getElementById('subject-name-text').textContent   = subj.name;
  document.getElementById('subject-level-badge').textContent = subj.level;

  // Accent line
  const accentLine = document.getElementById('subject-accent-line');
  if (accentLine) accentLine.style.background = subj.color;

  // Meta row: "SL/HL · Group N"
  const metaRow = document.getElementById('subject-meta-row');
  if (metaRow) {
    const levelText = subj.level === 'Both' ? 'SL / HL' : subj.level;
    const groupText = subj.group > 0 ? ` · Group ${subj.group}` : '';
    metaRow.textContent = levelText + groupText;
  }

  // Stats
  document.getElementById('sub-stat-total').textContent    = sstats.total;
  document.getElementById('sub-stat-answered').textContent = sstats.answered;
  document.getElementById('sub-stat-accuracy').textContent = sstats.accuracy + '%';

  // Mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.mode === subjectState.mode);
  });

  // Prescribed works info (for lit subjects)
  renderWorksInfo(subj.id);

  // Topic chips
  renderTopicChips();

  // Update start button label
  updateStartButton();
}

function renderWorksInfo(subjectId) {
  // Show selected prescribed works as a subtle strip (or nothing)
  let strip = document.getElementById('works-strip');
  const texts = PRESCRIBED_TEXTS[subjectId];
  if (!texts) {
    if (strip) strip.remove();
    return;
  }

  const selectedIds = getSelectedWorks(subjectId);
  if (!strip) {
    strip = document.createElement('div');
    strip.id = 'works-strip';
    strip.style.cssText = 'padding:8px 16px;font-size:0.78rem;color:var(--text-muted);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px;flex-wrap:wrap;';
    // Insert after subject-meta-row
    const meta = document.getElementById('subject-meta-row');
    if (meta) meta.insertAdjacentElement('afterend', strip);
  }

  if (selectedIds.length === 0) {
    strip.innerHTML = `<span>📚 All works</span><button style="margin-left:auto;font-size:0.75rem;color:var(--primary);background:none;border:none;cursor:pointer;" onclick="openSetup(true)">Edit</button>`;
  } else {
    const names = selectedIds.map(id => texts.find(t => t.id === id)?.title || id);
    strip.innerHTML = `<span>📚 ${escHtml(names.join(' · '))}</span><button style="margin-left:auto;font-size:0.75rem;color:var(--primary);background:none;border:none;cursor:pointer;" onclick="openSetup(true)">Edit</button>`;
  }
}

function renderTopicChips() {
  const topics  = getTopicsForSubject(subjectState.subjectId);
  const chipsEl = document.getElementById('topic-chips');
  chipsEl.innerHTML = '';

  // "All Topics" chip
  const allChip = document.createElement('button');
  allChip.type      = 'button';
  allChip.className = 'chip' + (subjectState.selectedTopics.size === 0 ? ' selected' : '');
  allChip.textContent = 'All Topics';
  allChip.addEventListener('click', () => {
    subjectState.selectedTopics = new Set();
    renderTopicChips();
    updateStartButton();
  });
  chipsEl.appendChild(allChip);

  for (const topic of topics) {
    const chip = document.createElement('button');
    chip.type      = 'button';
    chip.className = 'chip' + (subjectState.selectedTopics.has(topic) ? ' selected' : '');
    chip.textContent = topic;
    chip.addEventListener('click', () => {
      if (subjectState.selectedTopics.has(topic)) {
        subjectState.selectedTopics.delete(topic);
      } else {
        subjectState.selectedTopics.add(topic);
      }
      // If all topics manually selected, treat as "All"
      const allTopics = getTopicsForSubject(subjectState.subjectId);
      if (subjectState.selectedTopics.size === allTopics.length) {
        subjectState.selectedTopics = new Set();
      }
      renderTopicChips();
      updateStartButton();
    });
    chipsEl.appendChild(chip);
  }
}

function updateStartButton() {
  let qs = getQuestionsForSubject(subjectState.subjectId, subjectState.selectedTopics);
  const startBtn = document.getElementById('start-btn');
  let count = qs.length;

  // Apply mode-based limits for display
  if (subjectState.mode === 'practice') count = Math.min(count, PRACTICE_LIMIT);
  if (subjectState.mode === 'timed')    count = Math.min(count, TIMED_LIMIT);
  if (subjectState.mode === 'mastery')  count = Math.min(qs.filter(q => !isMastered(q.id)).length, PRACTICE_LIMIT);

  startBtn.textContent = `Start ${count} Question${count !== 1 ? 's' : ''}`;
  startBtn.disabled    = count === 0;
}

// ── QUIZ ENGINE ──────────────────────────────────────────────
function startQuiz(subjectId, mode, topicFilter) {
  let qs = getQuestionsForSubject(subjectId, topicFilter);

  if (qs.length === 0) {
    showToast('No questions available for the selected filters.', 'warn');
    return;
  }

  // Shuffle the pool
  qs = shuffle(qs);

  // Apply mode limits
  let timerSecs = null;
  if (mode === 'timed') {
    qs        = qs.slice(0, TIMED_LIMIT);
    timerSecs = qs.length * TIMED_SECS_PER_Q;
  } else if (mode === 'practice') {
    qs = qs.slice(0, PRACTICE_LIMIT);
  } else if (mode === 'mastery') {
    // Filter to only non-mastered questions, then cap at practice limit
    qs = qs.filter(q => !isMastered(q.id)).slice(0, PRACTICE_LIMIT);
  }
  // 'endless' = all shuffled questions

  // Build session object
  session = {
    subjectId,
    mode,
    questions:    qs,
    currentIdx:   0,
    answers:      {},
    flags:        getFlagged(), // pre-populate from persistent flags
    timerSecs,
    timerInterval: null,
    startTime:    Date.now(),
  };

  showScreen('quiz');
  renderQuizQuestion();

  if (timerSecs !== null) {
    startSessionTimer();
  }
}

function startMixedPractice() {
  // Pick up to 20 random questions from all subjects
  if (allQuestions.length === 0) {
    showToast('Questions are still loading…', 'warn');
    return;
  }

  const activeIds = new Set(getActiveSubjects().map(s => s.id));
  const qs = shuffle(allQuestions.filter(q => activeIds.has(q.subjectId))).slice(0, 20);

  session = {
    subjectId:     'mixed',
    mode:          'practice',
    questions:     qs,
    currentIdx:    0,
    answers:       {},
    flags:         getFlagged(),
    timerSecs:     null,
    timerInterval: null,
    startTime:     Date.now(),
  };

  showScreen('quiz');
  renderQuizQuestion();
}

// ── Question Rendering ────────────────────────────────────────
function renderQuizQuestion() {
  if (!session) return;

  const q     = session.questions[session.currentIdx];
  const total = session.questions.length;
  const idx   = session.currentIdx;

  // ── Header ──
  const subj = getSubjectById(session.subjectId);
  document.getElementById('quiz-subject-name').textContent =
    subj ? subj.name : (session.subjectId === 'mixed' ? 'Mixed Practice' : 'Quiz');

  document.getElementById('quiz-counter').textContent = `${idx + 1} / ${total}`;

  // Timer display
  const timerEl = document.getElementById('quiz-timer');
  if (session.timerSecs !== null) {
    timerEl.style.display = 'block';
    renderTimerDisplay();
  } else {
    timerEl.style.display = 'none';
  }

  // ── Progress bar ──
  const pct = total > 1 ? (idx / (total - 1)) * 100 : 0;
  document.getElementById('quiz-progress').style.width = pct + '%';

  // ── Flag button state ──
  const qIsFlagged = session.flags.has(q.id);
  document.getElementById('flag-btn').classList.toggle('flagged', qIsFlagged);

  // ── Question metadata ──
  renderQuestionMeta(q);

  // ── Question prompt ──
  const promptEl = document.getElementById('question-prompt');
  promptEl.textContent = q.prompt;
  renderMath(promptEl);

  // ── Reset answer UI sections ──
  const mcqSection  = document.getElementById('mcq-section');
  const saSection   = document.getElementById('sa-section');
  const msBox       = document.getElementById('mark-scheme-box');
  const selfMarkBtns = document.getElementById('self-mark-buttons');
  const nextRow     = document.getElementById('next-btn-row');

  msBox.classList.remove('visible');
  selfMarkBtns.classList.remove('visible');
  nextRow.classList.remove('visible');

  // ── Format-specific UI ──
  if (q.format === 'MCQ') {
    mcqSection.style.display = 'flex';
    saSection.style.display  = 'none';
    renderMCQOptions(q);
  } else {
    mcqSection.style.display = 'none';
    saSection.style.display  = 'flex';
    renderShortAnswerSection(q);
  }

  // If this question was already answered (e.g. browsing back in endless mode),
  // immediately show the result state
  if (session.answers[q.id] !== undefined) {
    restoreAnsweredState(q);
  }
}

function renderQuestionMeta(q) {
  const formatDisplay = {
    MCQ:         'MCQ',
    ShortAnswer: 'Short Answer',
    Essay:       'Essay',
  };
  const formatClass = {
    MCQ:         'format-mcq',
    ShortAnswer: 'format-short',
    Essay:       'format-essay',
  };

  const metaEl = document.getElementById('question-meta');
  metaEl.innerHTML = `
    <span class="meta-tag">${escHtml(q.topic)}</span>
    <span class="meta-tag ${formatClass[q.format] || ''}">${formatDisplay[q.format] || q.format}</span>
    <span class="meta-tag command">${escHtml(q.commandTerm)}</span>
    <span class="meta-tag">${q.marks} mark${q.marks !== 1 ? 's' : ''}</span>
    ${q._custom ? '<span class="local-badge">local</span>' : ''}
  `;
}

function renderMCQOptions(q) {
  const container = document.getElementById('mcq-options');
  container.innerHTML = '';

  const labels = Object.keys(q.choices || {}).sort();
  for (const label of labels) {
    const text = q.choices[label];

    const btn = document.createElement('button');
    btn.type         = 'button';
    btn.className    = 'option-btn';
    btn.dataset.label = label;

    btn.innerHTML = `
      <span class="option-label">${escHtml(label)}</span>
      <span class="option-text">${escHtml(text)}</span>
    `;

    btn.addEventListener('click', () => handleMCQChoice(q, label));
    container.appendChild(btn);
  }

  renderMath(container);
}

function renderShortAnswerSection(q) {
  const ta = document.getElementById('sa-textarea');
  ta.value = '';
  ta.disabled = false;

  if (q.format === 'Essay') {
    ta.placeholder = 'Write your essay plan or full response here (optional)…';
    ta.style.minHeight = '160px';
  } else {
    ta.placeholder = 'Write your answer here…';
    ta.style.minHeight = '100px';
  }

  const showAnsBtn = document.getElementById('show-answer-btn');
  showAnsBtn.disabled = false;
  showAnsBtn.textContent = '👁 Show Mark Scheme';
}

// ── Answer Handling ──────────────────────────────────────────
function handleMCQChoice(q, chosen) {
  // Prevent double-answering
  if (session.answers[q.id] !== undefined) return;

  const correct = (chosen === q.answer);
  session.answers[q.id] = { chosen, correct };

  // Record to persistent storage
  recordQuestionAnswer(q.id, correct);
  recordGlobalAnswer(correct);
  ensureStreakUpdated();

  // Animate option buttons
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.disabled = true;
    const lbl = btn.dataset.label;
    if (lbl === q.answer) {
      btn.classList.add('correct');
    } else if (lbl === chosen && !correct) {
      btn.classList.add('wrong');
    }
  });

  // Reveal mark scheme
  revealMarkScheme(q);

  // Show next button
  showNextButton();
}

function handleShowAnswer(q) {
  revealMarkScheme(q);
  // Show self-mark buttons
  document.getElementById('self-mark-buttons').classList.add('visible');
  // Disable show answer button
  document.getElementById('show-answer-btn').disabled = true;
  document.getElementById('show-answer-btn').textContent = '✓ Answer revealed';
}

function handleSelfMark(q, correct) {
  // Prevent double-submission
  if (session.answers[q.id] !== undefined) return;

  session.answers[q.id] = { chosen: null, correct };
  recordQuestionAnswer(q.id, correct);
  recordGlobalAnswer(correct);
  ensureStreakUpdated();

  // Hide self-mark buttons, show next
  document.getElementById('self-mark-buttons').classList.remove('visible');
  showNextButton();

  // Disable textarea
  const ta = document.getElementById('sa-textarea');
  ta.disabled = true;
}

function revealMarkScheme(q) {
  const box = document.getElementById('mark-scheme-box');
  const textEl = document.getElementById('mark-scheme-text');

  box.classList.add('visible');
  textEl.textContent = q.markScheme || 'No mark scheme provided.';
  renderMath(box);
}

function showNextButton() {
  const nextRow = document.getElementById('next-btn-row');
  nextRow.classList.add('visible');

  // Update button label if last question
  const nextBtn = document.getElementById('next-btn');
  const isLast = session.currentIdx >= session.questions.length - 1;
  nextBtn.textContent = isLast ? 'Finish Session →' : 'Next Question →';
}

// Restore answer state when re-rendering a question that's already been answered
function restoreAnsweredState(q) {
  const ans = session.answers[q.id];
  if (!ans) return;

  revealMarkScheme(q);

  if (q.format === 'MCQ') {
    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.disabled = true;
      const lbl = btn.dataset.label;
      if (lbl === q.answer) {
        btn.classList.add('correct');
      } else if (lbl === ans.chosen && !ans.correct) {
        btn.classList.add('wrong');
      }
    });
  } else {
    document.getElementById('show-answer-btn').disabled = true;
    document.getElementById('show-answer-btn').textContent = '✓ Answer revealed';
    document.getElementById('sa-textarea').disabled = true;
  }

  showNextButton();
}

// ── Quiz Navigation ──────────────────────────────────────────
function nextQuestion() {
  if (!session) return;

  if (session.currentIdx < session.questions.length - 1) {
    session.currentIdx++;
    renderQuizQuestion();
  } else {
    finishSession();
  }
}

function finishSession() {
  // Stop timer if running
  if (session && session.timerInterval) {
    clearInterval(session.timerInterval);
    session.timerInterval = null;
  }

  ensureStreakUpdated();
  recordSessionCompleted();

  showScreen('results');
  renderResultsScreen();
}

function abortSession() {
  if (session && session.timerInterval) {
    clearInterval(session.timerInterval);
    session.timerInterval = null;
  }
  session = null;
}

// ── Timer ────────────────────────────────────────────────────
function startSessionTimer() {
  if (!session || session.timerSecs === null) return;

  renderTimerDisplay();

  session.timerInterval = setInterval(() => {
    if (!session) return;

    session.timerSecs = Math.max(0, session.timerSecs - 1);
    renderTimerDisplay();

    if (session.timerSecs <= 0) {
      clearInterval(session.timerInterval);
      session.timerInterval = null;
      // Auto-finish when time is up
      showToast("Time's up!", 'warn');
      setTimeout(finishSession, 1200);
    }
  }, 1000);
}

function renderTimerDisplay() {
  if (!session || session.timerSecs === null) return;

  const el   = document.getElementById('quiz-timer');
  const secs = Math.max(0, session.timerSecs);
  const m    = Math.floor(secs / 60);
  const s    = secs % 60;

  el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  el.classList.remove('warning', 'danger');
  if (secs <= 30) {
    el.classList.add('danger');
  } else if (secs <= 60) {
    el.classList.add('warning');
  }
}

// ── RESULTS SCREEN ───────────────────────────────────────────
function renderResultsScreen() {
  if (!session) return;

  const answers   = session.answers;
  const questions = session.questions;

  // Tally correct / total
  let correct  = 0;
  let answered = 0;
  for (const q of questions) {
    const ans = answers[q.id];
    if (ans !== undefined) {
      answered++;
      if (ans.correct) correct++;
    }
  }

  const total = questions.length;
  const pct   = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  // Score circle: CSS conic-gradient
  const circle = document.getElementById('score-circle');
  // Use requestAnimationFrame to allow CSS transition to trigger
  requestAnimationFrame(() => {
    circle.style.setProperty('--pct', pct + '%');
  });

  document.getElementById('score-pct').textContent      = pct + '%';
  document.getElementById('score-fraction').textContent  = `${correct} / ${answered}`;

  // Verdict text
  const { verdict, verdictSub } = getVerdict(pct, answered, total);
  document.getElementById('verdict-text').textContent = verdict;
  document.getElementById('verdict-sub').textContent  = verdictSub;

  // Subject name
  const subj = getSubjectById(session.subjectId);
  const subjName = subj ? subj.name
    : (session.subjectId === 'mixed' ? 'Mixed Practice' : 'Quiz');
  document.getElementById('results-subject-name').textContent = subjName;

  // Mode label
  const modeLabels = { practice: 'Practice', timed: 'Timed Paper', endless: 'Endless' };
  document.getElementById('results-mode-label').textContent =
    modeLabels[session.mode] || session.mode;

  // Duration
  const durationSecs = Math.round((Date.now() - session.startTime) / 1000);
  document.getElementById('results-duration').textContent = formatDuration(durationSecs);

  // Topic breakdown
  renderTopicBreakdown(questions, answers);

  // Mastered count
  let newMastered = 0;
  for (const q of questions) {
    if (isMastered(q.id)) newMastered++;
  }
  document.getElementById('results-mastered').textContent = newMastered;
}

function getVerdict(pct, answered, total) {
  if (answered === 0) {
    return { verdict: '—', verdictSub: 'No questions answered.' };
  }
  if (pct >= 90) return { verdict: '🏆 Outstanding!', verdictSub: 'Exceptional performance — you\'re exam-ready.' };
  if (pct >= 75) return { verdict: '🎯 Excellent work!', verdictSub: 'Strong command of the material.' };
  if (pct >= 60) return { verdict: '✅ Good progress!', verdictSub: 'Keep reviewing the topics you missed.' };
  if (pct >= 45) return { verdict: '📚 Needs practice', verdictSub: 'Focus on the weak topics in the breakdown below.' };
  return { verdict: '💪 Keep going!', verdictSub: 'Review the mark schemes and practice again.' };
}

function renderTopicBreakdown(questions, answers) {
  // Aggregate per-topic stats
  const topicMap = {};  // topic -> { correct: n, total: n }
  for (const q of questions) {
    if (!topicMap[q.topic]) topicMap[q.topic] = { correct: 0, total: 0 };
    topicMap[q.topic].total++;
    const ans = answers[q.id];
    if (ans && ans.correct) topicMap[q.topic].correct++;
  }

  const breakdownEl = document.getElementById('topic-breakdown');
  breakdownEl.innerHTML = '';

  if (Object.keys(topicMap).length === 0) {
    breakdownEl.innerHTML = '<div class="text-muted" style="font-size:0.85rem;text-align:center;">No topic data.</div>';
    return;
  }

  for (const [topic, data] of Object.entries(topicMap)) {
    const p = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
    const barColor = p >= 70 ? 'var(--correct)' : p >= 40 ? 'var(--warn)' : 'var(--wrong)';

    const row = document.createElement('div');
    row.className = 'topic-row';
    row.innerHTML = `
      <div class="topic-row-header">
        <span class="topic-row-name">${escHtml(topic)}</span>
        <span class="topic-row-score">${data.correct}/${data.total} (${p}%)</span>
      </div>
      <div class="topic-bar-bg">
        <div class="topic-bar-fill" style="width:0%;background:${barColor}"
             data-target="${p}"></div>
      </div>
    `;
    breakdownEl.appendChild(row);
  }

  // Animate bars in
  requestAnimationFrame(() => {
    breakdownEl.querySelectorAll('.topic-bar-fill').forEach(fill => {
      fill.style.width = fill.dataset.target + '%';
    });
  });
}

// ── ADMIN SCREEN ─────────────────────────────────────────────
function renderAdminScreen() {
  // Populate subject dropdown
  const sel = document.getElementById('admin-subject');
  sel.innerHTML = SUBJECTS.map(s =>
    `<option value="${escAttr(s.id)}">${escHtml(s.name)}</option>`
  ).join('');

  // Reset form
  const form = document.getElementById('admin-form');
  if (form) form.reset();

  updateAdminMCQVisibility();
  hideAdminToast();
}

function updateAdminMCQVisibility() {
  const format    = document.getElementById('admin-format').value;
  const mcqSec    = document.getElementById('admin-mcq-section');
  mcqSec.classList.toggle('visible', format === 'MCQ');
}

function submitAdminForm() {
  // Gather values
  const subjectId   = document.getElementById('admin-subject').value;
  const topic       = document.getElementById('admin-topic').value.trim();
  const format      = document.getElementById('admin-format').value;
  const prompt      = document.getElementById('admin-prompt').value.trim();
  const markScheme  = document.getElementById('admin-markscheme').value.trim();
  const commandTerm = document.getElementById('admin-command').value.trim() || 'explain';
  const marks       = parseInt(document.getElementById('admin-marks').value, 10) || 1;

  // Basic validation
  if (!topic) {
    highlightInvalid('admin-topic');
    return;
  }
  if (!prompt) {
    highlightInvalid('admin-prompt');
    return;
  }
  if (!markScheme) {
    highlightInvalid('admin-markscheme');
    return;
  }

  const subj = getSubjectById(subjectId);
  const q = {
    id:          'custom-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    subjectId,
    subject:     subj ? subj.name : subjectId,
    topic,
    paper:       1,
    level:       subj ? subj.level : 'Both',
    format,
    commandTerm,
    marks,
    prompt,
    markScheme,
    _custom:     true,
    createdAt:   new Date().toISOString(),
  };

  // MCQ-specific fields
  if (format === 'MCQ') {
    const optA   = document.getElementById('admin-opt-a').value.trim();
    const optB   = document.getElementById('admin-opt-b').value.trim();
    const optC   = document.getElementById('admin-opt-c').value.trim();
    const optD   = document.getElementById('admin-opt-d').value.trim();
    const answer = document.getElementById('admin-answer').value;

    if (!optA || !optB || !optC || !optD) {
      showToast('Please fill in all four MCQ options.', 'warn');
      return;
    }

    q.choices = { A: optA, B: optB, C: optC, D: optD };
    q.answer  = answer;
  }

  // Save
  addCustomQuestion(q);

  // Clear form
  document.getElementById('admin-form').reset();
  updateAdminMCQVisibility();

  // Show success toast
  showAdminToast(`Question saved! "${topic}" added to ${subj ? subj.name : subjectId}.`);
}

function highlightInvalid(fieldId) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.style.borderColor = 'var(--wrong)';
  el.focus();
  setTimeout(() => { el.style.borderColor = ''; }, 2000);
}

function showAdminToast(message) {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  toast.textContent = '✅ ' + message;
  toast.classList.add('visible');
  setTimeout(hideAdminToast, 3000);
}

function hideAdminToast() {
  const toast = document.getElementById('admin-toast');
  if (toast) toast.classList.remove('visible');
}

// ── REQUEST SCREEN ───────────────────────────────────────────
function renderRequestScreen() {
  const sel = document.getElementById('request-subject');
  if (!sel) return;
  sel.innerHTML = SUBJECTS.map(s =>
    `<option value="${escAttr(s.id)}">${escHtml(s.name)}</option>`
  ).join('');
}

function openGithubIssue() {
  const subjectId   = document.getElementById('request-subject').value;
  const reqType     = document.getElementById('request-type').value;
  const description = document.getElementById('request-description').value.trim();
  const subj        = getSubjectById(subjectId);
  const subjName    = subj ? subj.name : subjectId;

  const title = `[Content Request] ${subjName} — ${reqType}`;

  const bodyLines = [
    `**Subject:** ${subjName}`,
    `**Request Type:** ${reqType}`,
    '',
    '**Description:**',
    description || '*(No description provided)*',
    '',
    '---',
    '*Submitted via IB Prep App*',
  ];

  const issueUrl = 'https://github.com/sudo-nkop/ib-prep-app/issues/new'
    + '?title='  + encodeURIComponent(title)
    + '&body='   + encodeURIComponent(bodyLines.join('\n'))
    + '&labels=' + encodeURIComponent('content-request');

  window.open(issueUrl, '_blank', 'noopener,noreferrer');
}

// ── Math Rendering (KaTeX) ───────────────────────────────────
function renderMath(element) {
  if (!window.renderMathInElement) return;
  try {
    renderMathInElement(element, {
      delimiters: [
        { left: '$$', right: '$$', display: true  },
        { left: '$',  right: '$',  display: false },
        { left: '\\[', right: '\\]', display: true  },
        { left: '\\(', right: '\\)', display: false },
      ],
      throwOnError: false,
      errorColor:   'var(--wrong)',
    });
  } catch (e) {
    // KaTeX errors are non-fatal
  }
}

// ── Toast Notifications ──────────────────────────────────────
let toastTimeout = null;

function showToast(message, type = 'info') {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      max-width: 320px;
      width: calc(100% - 48px);
      background: var(--surface-2);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 0.875rem;
      z-index: 9999;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      transition: opacity 0.25s ease;
    `;
    document.body.appendChild(toast);
  }

  if (type === 'warn') {
    toast.style.borderColor = 'rgba(245,158,11,0.4)';
    toast.style.color = 'var(--warn)';
  } else {
    toast.style.borderColor = 'var(--border)';
    toast.style.color = 'var(--text)';
  }

  toast.textContent = message;
  toast.style.opacity = '1';

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
  }, 2800);
}

// ── Utility Functions ────────────────────────────────────────
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(str) {
  return escHtml(str);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function formatDuration(secs) {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ── Event Wiring ─────────────────────────────────────────────
function wireEvents() {

  // ── Setup wizard ──────────────────────────────────────────
  document.getElementById('setup-next-btn').addEventListener('click', setupNext);
  document.getElementById('setup-back-btn').addEventListener('click', setupBack);
  document.getElementById('settings-next-btn').addEventListener('click', setupNext);
  document.getElementById('settings-back-btn').addEventListener('click', setupBack);
  document.getElementById('back-from-settings').addEventListener('click', () => {
    navigateHome();
  });

  // ── Home ──────────────────────────────────────────────────
  document.getElementById('btn-settings').addEventListener('click', () => {
    openSetup(true);
  });

  document.getElementById('btn-practice-all').addEventListener('click', () => {
    startMixedPractice();
  });

  document.getElementById('btn-add-question').addEventListener('click', () => {
    renderAdminScreen();
    showScreen('admin');
  });

  document.getElementById('btn-request').addEventListener('click', () => {
    renderRequestScreen();
    showScreen('request');
  });

  // ── Subject ───────────────────────────────────────────────
  document.getElementById('back-from-subject').addEventListener('click', goBack);

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      subjectState.mode = btn.dataset.mode;
      renderSubjectScreen();
    });
  });

  document.getElementById('start-btn').addEventListener('click', () => {
    startQuiz(
      subjectState.subjectId,
      subjectState.mode,
      subjectState.selectedTopics,
    );
  });

  // ── Quiz ──────────────────────────────────────────────────
  document.getElementById('back-from-quiz').addEventListener('click', () => {
    if (!session) { goBack(); return; }

    const hasAnswers = Object.keys(session.answers).length > 0;
    if (hasAnswers && session.timerInterval) {
      if (!confirm('End this timed session? Your progress will be lost.')) return;
    }

    abortSession();
    goBack();
  });

  document.getElementById('flag-btn').addEventListener('click', () => {
    if (!session) return;
    const q = session.questions[session.currentIdx];
    const nowFlagged = toggleFlagged(q.id);
    // Sync flag into session's local flag set
    if (nowFlagged) {
      session.flags.add(q.id);
    } else {
      session.flags.delete(q.id);
    }
    document.getElementById('flag-btn').classList.toggle('flagged', nowFlagged);
  });

  document.getElementById('show-answer-btn').addEventListener('click', () => {
    if (!session) return;
    const q = session.questions[session.currentIdx];
    handleShowAnswer(q);
  });

  document.getElementById('self-mark-got').addEventListener('click', () => {
    if (!session) return;
    const q = session.questions[session.currentIdx];
    handleSelfMark(q, true);
  });

  document.getElementById('self-mark-missed').addEventListener('click', () => {
    if (!session) return;
    const q = session.questions[session.currentIdx];
    handleSelfMark(q, false);
  });

  document.getElementById('next-btn').addEventListener('click', nextQuestion);

  // ── Results ───────────────────────────────────────────────
  document.getElementById('btn-practice-again').addEventListener('click', () => {
    if (!session) { navigateHome(); return; }
    const { subjectId, mode } = session;
    if (subjectId === 'mixed') {
      startMixedPractice();
    } else {
      startQuiz(subjectId, mode, subjectState.selectedTopics);
    }
  });

  document.getElementById('btn-back-subjects').addEventListener('click', () => {
    navigateHome();
  });

  // ── Admin ─────────────────────────────────────────────────
  document.getElementById('back-from-admin').addEventListener('click', goBack);

  document.getElementById('admin-format').addEventListener('change', updateAdminMCQVisibility);

  document.getElementById('admin-submit').addEventListener('click', submitAdminForm);

  // ── Request ───────────────────────────────────────────────
  document.getElementById('back-from-request').addEventListener('click', goBack);

  document.getElementById('btn-open-issue').addEventListener('click', openGithubIssue);

  // ── Keyboard shortcuts ─────────────────────────────────────
  document.addEventListener('keydown', handleKeydown);
}

function handleKeydown(e) {
  // Skip if typing in a form field
  if (e.target.matches('input, textarea, select')) return;

  // Quiz screen shortcuts
  const activeScreen = screenStack[screenStack.length - 1];
  if (activeScreen === 'quiz' && session) {
    const q = session.questions[session.currentIdx];

    // A/B/C/D = select MCQ option
    if (q.format === 'MCQ' && session.answers[q.id] === undefined) {
      const key = e.key.toUpperCase();
      if (['A','B','C','D'].includes(key)) {
        const btn = document.querySelector(`.option-btn[data-label="${key}"]`);
        if (btn && !btn.disabled) btn.click();
        return;
      }
    }

    // Space / Enter = next question (when next is visible)
    if ((e.key === ' ' || e.key === 'Enter') &&
        document.getElementById('next-btn-row').classList.contains('visible')) {
      e.preventDefault();
      nextQuestion();
      return;
    }

    // F = flag
    if (e.key === 'f' || e.key === 'F') {
      document.getElementById('flag-btn').click();
      return;
    }
  }

  // Escape = go back
  if (e.key === 'Escape') {
    if (activeScreen !== 'home') {
      // Use the back button logic for quiz to confirm abort
      const backBtnId = {
        subject: 'back-from-subject',
        quiz:    'back-from-quiz',
        results: null,
        admin:   'back-from-admin',
        request: 'back-from-request',
      }[activeScreen];
      if (backBtnId) {
        document.getElementById(backBtnId).click();
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════
// PERSONALISATION — Profile, Setup Wizard, Settings
// ══════════════════════════════════════════════════════════════

// Prescribed works per subject (for Literature / Language B subjects)
const PRESCRIBED_TEXTS = {
  'spanish-a-lit': [
    { id: 'lorca-bernarda',  title: 'La casa de Bernarda Alba',        author: 'Federico García Lorca' },
    { id: 'lorca-bodas',     title: 'Bodas de sangre',                 author: 'Federico García Lorca' },
    { id: 'marquez-cronica', title: 'Crónica de una muerte anunciada', author: 'Gabriel García Márquez' },
    { id: 'marquez-soledad', title: 'Cien años de soledad',            author: 'Gabriel García Márquez' },
    { id: 'allende-casa',    title: 'La casa de los espíritus',        author: 'Isabel Allende' },
    { id: 'borges-ficciones',title: 'Ficciones',                       author: 'Jorge Luis Borges' },
    { id: 'neruda-veinte',   title: 'Veinte poemas de amor',           author: 'Pablo Neruda' },
  ],
  'english-b-hl': [
    { id: '1984',            title: 'Nineteen Eighty-Four',            author: 'George Orwell' },
    { id: 'kite-runner',     title: 'The Kite Runner',                 author: 'Khaled Hosseini' },
    { id: 'great-exp',       title: 'Great Expectations',              author: 'Charles Dickens' },
    { id: 'handmaid',        title: "The Handmaid's Tale",             author: 'Margaret Atwood' },
    { id: 'things-fall',     title: 'Things Fall Apart',               author: 'Chinua Achebe' },
  ],
};

// Subjects where level matters (has both SL and HL variants or questions differ by level)
const LEVEL_SUBJECTS = ['history-hl', 'history-sl', 'maa', 'physics-sl'];

// ── Profile ──────────────────────────────────────────────────
// profile shape:
// {
//   configured: bool,
//   subjects: {
//     [subjectId]: {
//       active: bool,
//       level: 'SL' | 'HL' | 'Both',
//       selectedWorkIds: string[]   // for lit subjects
//     }
//   }
// }

const PROFILE_KEY = 'ib_profile';

function loadProfile() {
  return loadStore(PROFILE_KEY, null);
}

function saveProfile(profile) {
  saveStore(PROFILE_KEY, profile);
}

function getDefaultProfile() {
  const subjects = {};
  for (const s of SUBJECTS) {
    subjects[s.id] = {
      active: true,
      level: s.level,
      selectedWorkIds: [],
    };
  }
  return { configured: false, subjects };
}

function getActiveSubjects() {
  const profile = loadProfile();
  if (!profile || !profile.configured) return SUBJECTS;
  return SUBJECTS.filter(s => profile.subjects[s.id]?.active);
}

function getSubjectLevel(subjectId) {
  const profile = loadProfile();
  if (!profile) return SUBJECTS.find(s => s.id === subjectId)?.level || 'Both';
  return profile.subjects[subjectId]?.level || 'Both';
}

function getSelectedWorks(subjectId) {
  const profile = loadProfile();
  if (!profile) return [];
  return profile.subjects[subjectId]?.selectedWorkIds || [];
}

// ── Setup Wizard State ───────────────────────────────────────
let setupState = {
  step: 1,          // 1 = subjects, 2 = levels, 3 = works
  totalSteps: 3,
  isSettings: false, // true when editing from settings
  draft: null,       // draft profile being built
};

function openSetup(isSettings = false) {
  const existing = loadProfile();
  setupState.isSettings = isSettings;
  setupState.draft = existing
    ? JSON.parse(JSON.stringify(existing))
    : getDefaultProfile();

  // Determine total steps
  setupState.totalSteps = computeSetupSteps(setupState.draft);
  setupState.step = 1;

  if (isSettings) {
    renderSettingsStep();
    showScreen('settings');
  } else {
    renderSetupStep();
    showScreen('setup', false);
  }
}

function computeSetupSteps(draft) {
  // Always: subjects (1) + levels (2)
  // + works step if any lit subject is active
  const hasLit = SUBJECTS.some(s =>
    PRESCRIBED_TEXTS[s.id] && draft.subjects[s.id]?.active
  );
  return hasLit ? 3 : 2;
}

// ── Setup Wizard Rendering ───────────────────────────────────
function setDots(prefix, current, total) {
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`${prefix}-${i}`);
    if (!dot) continue;
    dot.classList.toggle('active', i === current);
    dot.style.display = i <= total ? '' : 'none';
  }
}

function renderSetupStep() {
  const body    = document.getElementById('setup-body');
  const backBtn = document.getElementById('setup-back-btn');
  const nextBtn = document.getElementById('setup-next-btn');
  const { step, totalSteps } = setupState;

  setDots('dot', step, totalSteps);

  backBtn.style.display = step > 1 ? '' : 'none';
  nextBtn.textContent   = step === totalSteps ? (setupState.isSettings ? 'Save' : 'Start!') : 'Next →';

  if (step === 1) renderSubjectSelectionStep(body);
  else if (step === 2) renderLevelStep(body);
  else if (step === 3) renderWorksStep(body);
}

function renderSettingsStep() {
  const body    = document.getElementById('settings-body');
  const backBtn = document.getElementById('settings-back-btn');
  const nextBtn = document.getElementById('settings-next-btn');
  const { step, totalSteps } = setupState;

  setDots('settings-dot', step, totalSteps);

  backBtn.style.display = step > 1 ? '' : 'none';
  nextBtn.textContent   = step === totalSteps ? 'Save' : 'Next →';

  if (step === 1) renderSubjectSelectionStep(body);
  else if (step === 2) renderLevelStep(body);
  else if (step === 3) renderWorksStep(body);
}

function renderSubjectSelectionStep(container) {
  container.innerHTML = `
    <div>
      <div class="setup-title">Your Subjects</div>
      <div class="setup-subtitle">Select the IB subjects you're studying.</div>
    </div>
    <div class="subject-select-grid" id="subject-select-grid"></div>
  `;

  const grid = container.querySelector('#subject-select-grid');
  for (const subj of SUBJECTS) {
    const isActive = setupState.draft.subjects[subj.id]?.active ?? true;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'subject-select-card' + (isActive ? ' selected' : '');
    card.style.setProperty('--subject-color', subj.color);
    card.innerHTML = `
      <div class="card-check">${isActive ? '✓' : ''}</div>
      <div class="card-name">${escHtml(subj.name)}</div>
      <div class="card-meta">Group ${subj.group} · ${subj.level === 'Both' ? 'SL/HL' : subj.level}</div>
    `;
    card.addEventListener('click', () => {
      const cur = setupState.draft.subjects[subj.id];
      cur.active = !cur.active;
      // Recompute total steps in case lit subject was toggled
      setupState.totalSteps = computeSetupSteps(setupState.draft);
      renderSubjectSelectionStep(container);
      // Update dots
      const isSettings = setupState.isSettings;
      setDots(isSettings ? 'settings-dot' : 'dot', setupState.step, setupState.totalSteps);
    });
    grid.appendChild(card);
  }
}

function renderLevelStep(container) {
  const activeSubjects = SUBJECTS.filter(s => setupState.draft.subjects[s.id]?.active);
  const levelled = activeSubjects.filter(s => s.level === 'Both' || s.id.startsWith('history'));

  // For history-hl and history-sl they already have fixed levels,
  // but MAA can be SL or HL
  const adjustable = activeSubjects.filter(s => s.level === 'Both');

  if (adjustable.length === 0) {
    // Skip this step automatically
    container.innerHTML = `
      <div>
        <div class="setup-title">Levels</div>
        <div class="setup-subtitle">Your selected subjects have fixed levels — nothing to configure here.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div>
      <div class="setup-title">Your Levels</div>
      <div class="setup-subtitle">Choose SL or HL for each subject where it applies.</div>
    </div>
    <div id="level-sections" class="level-section" style="gap:20px;display:flex;flex-direction:column;"></div>
  `;

  const wrapper = container.querySelector('#level-sections');
  for (const subj of adjustable) {
    const cur = setupState.draft.subjects[subj.id];
    const currentLevel = cur.level || 'SL';

    const sec = document.createElement('div');
    sec.className = 'level-section';
    sec.innerHTML = `
      <div class="level-subject-name" style="border-left:3px solid ${subj.color};padding-left:8px;">
        ${escHtml(subj.name)}
      </div>
      <div class="level-chips">
        <button type="button" class="level-chip${currentLevel === 'SL' ? ' selected' : ''}" data-level="SL" data-subject="${subj.id}">SL</button>
        <button type="button" class="level-chip${currentLevel === 'HL' ? ' selected' : ''}" data-level="HL" data-subject="${subj.id}">HL</button>
      </div>
    `;
    sec.querySelectorAll('.level-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        setupState.draft.subjects[chip.dataset.subject].level = chip.dataset.level;
        renderLevelStep(container);
      });
    });
    wrapper.appendChild(sec);
  }
}

function renderWorksStep(container) {
  const litSubjects = SUBJECTS.filter(s =>
    PRESCRIBED_TEXTS[s.id] && setupState.draft.subjects[s.id]?.active
  );

  if (litSubjects.length === 0) {
    container.innerHTML = `<div><div class="setup-title">Prescribed Works</div><div class="setup-subtitle">No literature subjects selected.</div></div>`;
    return;
  }

  container.innerHTML = `
    <div>
      <div class="setup-title">Prescribed Works</div>
      <div class="setup-subtitle">Select the texts you're studying. Questions will be filtered to your choices.</div>
    </div>
    <div id="works-wrapper" style="display:flex;flex-direction:column;gap:24px;"></div>
  `;

  const wrapper = container.querySelector('#works-wrapper');
  for (const subj of litSubjects) {
    const texts = PRESCRIBED_TEXTS[subj.id];
    const selectedIds = new Set(setupState.draft.subjects[subj.id]?.selectedWorkIds || []);

    const sec = document.createElement('div');
    sec.innerHTML = `<div class="level-subject-name" style="border-left:3px solid ${subj.color};padding-left:8px;margin-bottom:8px;">${escHtml(subj.name)}</div>`;

    const list = document.createElement('div');
    list.className = 'work-list';

    for (const text of texts) {
      const isSelected = selectedIds.has(text.id);
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'work-item' + (isSelected ? ' selected' : '');
      item.innerHTML = `
        <div class="work-check">${isSelected ? '✓' : ''}</div>
        <div>
          <div class="work-title">${escHtml(text.title)}</div>
          <div class="work-author">${escHtml(text.author)}</div>
        </div>
      `;
      item.addEventListener('click', () => {
        const cur = setupState.draft.subjects[subj.id];
        const ids = new Set(cur.selectedWorkIds);
        if (ids.has(text.id)) ids.delete(text.id);
        else ids.add(text.id);
        cur.selectedWorkIds = [...ids];
        renderWorksStep(container);
      });
      list.appendChild(item);
    }

    sec.appendChild(list);
    wrapper.appendChild(sec);
  }
}

// ── Setup Navigation ─────────────────────────────────────────
function setupNext() {
  const { step, totalSteps } = setupState;

  // Validate: at least one subject selected
  if (step === 1) {
    const anyActive = SUBJECTS.some(s => setupState.draft.subjects[s.id]?.active);
    if (!anyActive) {
      showToast('Please select at least one subject.', 'warn');
      return;
    }
  }

  if (step < totalSteps) {
    setupState.step++;
    if (setupState.isSettings) renderSettingsStep();
    else renderSetupStep();
  } else {
    // Save and finish
    setupState.draft.configured = true;
    saveProfile(setupState.draft);
    finishSetup();
  }
}

function setupBack() {
  if (setupState.step > 1) {
    setupState.step--;
    if (setupState.isSettings) renderSettingsStep();
    else renderSetupStep();
  }
}

function finishSetup() {
  if (setupState.isSettings) {
    // Return to home and re-render
    navigateHome();
  } else {
    // First time setup complete — go home
    screenStack = ['home'];
    showScreen('home', false);
    renderHome();
  }
}

// ── Service Worker Registration ──────────────────────────────
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('sw.js').then(reg => {
    console.log('SW registered, scope:', reg.scope);
    reg.addEventListener('updatefound', () => {
      console.log('SW update found');
    });
  }).catch(err => {
    console.warn('SW registration failed:', err);
  });
}

// ── App Initialisation ───────────────────────────────────────
async function init() {
  registerServiceWorker();
  wireEvents();
  await loadQuestions();

  const profile = loadProfile();
  if (!profile || !profile.configured) {
    // First launch — run onboarding
    openSetup(false);
  } else {
    screenStack = ['home'];
    showScreen('home', false);
    renderHome();
  }
}

// Boot
document.addEventListener('DOMContentLoaded', init);
