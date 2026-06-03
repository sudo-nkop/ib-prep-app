#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const subjectNames = {
  'history-hl': 'History HL',
  'history-sl': 'History SL',
  'maa': 'Mathematics: Analysis & Approaches',
  'physics-sl': 'Physics SL',
  'tok': 'Theory of Knowledge',
  'english-b-hl': 'English B HL',
  'spanish-a-lit': 'Literatura Española A',
};

const files = [
  'history-hl.json',
  'history-sl.json',
  'maa.json',
  'physics-sl.json',
  'tok.json',
  'english-b-hl.json',
  'spanish-a-lit.json',
];

const inputDir = path.join(__dirname, '../data/questions');
const outputPath = path.join(__dirname, '../www/data/questions.json');

const allQuestions = [];
const counts = {};

for (const file of files) {
  const filePath = path.join(inputDir, file);
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const subjectId = path.basename(file, '.json');
  const subject = subjectNames[subjectId] || subjectId;

  for (const q of raw) {
    const out = {
      id: q.id,
      subjectId: q.subjectId || subjectId,
      subject: subject,
      topic: q.topic,
      paper: q.paper,
      level: q.level,
      difficulty: q.difficulty !== undefined ? q.difficulty : 2,
      format: q.format,
      commandTerm: q.commandTerm,
      marks: q.marks,
      prompt: q.prompt,
    };

    // Convert options array to choices object for MCQ questions
    if (q.options && Array.isArray(q.options)) {
      const choices = {};
      for (const opt of q.options) {
        choices[opt.label] = opt.text;
      }
      out.choices = choices;
    }

    // Rename correctOption -> answer
    if (q.correctOption !== undefined) {
      out.answer = q.correctOption;
    }

    out.markScheme = q.markScheme || '';

    // explanation: use existing or fall back to markScheme
    out.explanation = q.explanation || q.markScheme || '';

    allQuestions.push(out);
  }

  counts[subjectId] = raw.length;
}

fs.writeFileSync(outputPath, JSON.stringify(allQuestions, null, 2));

console.log('Questions per subject:');
let total = 0;
for (const [subjectId, count] of Object.entries(counts)) {
  console.log(`  ${subjectId}: ${count}`);
  total += count;
}
console.log(`Total: ${total}`);
console.log(`Written to: ${outputPath}`);
