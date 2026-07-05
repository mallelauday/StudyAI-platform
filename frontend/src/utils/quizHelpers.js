/**
 * Helpers for quiz answer matching and review display.
 */

/** Check whether an MCQ / true-false option is the correct one. */
export function isOptionCorrect(question, option, optionIdx) {
  const correct = question?.correct_answer ?? question?.correct;
  if (correct === undefined || correct === null) return false;

  const optStr = String(option ?? '').trim();
  const correctStr = String(correct).trim();

  if (/^[A-D]$/i.test(correctStr)) {
    return optStr.toUpperCase().startsWith(correctStr.toUpperCase());
  }

  if (typeof correct === 'number') {
    return optionIdx === correct;
  }

  return optStr.toLowerCase() === correctStr.toLowerCase();
}

/** Find graded result for a question from submit response. */
export function getGradedForQuestion(result, questionId) {
  const graded = result?.graded_answers ?? [];
  return graded.find(
    (g) => String(g.question_id) === String(questionId)
  );
}

/** Format the student's submitted answer for display. */
export function formatStudentAnswer(question, answersMap, textAnswers) {
  const qId = question.id;
  if (question.type === 'short_answer') {
    return textAnswers?.[qId] ?? answersMap?.[qId] ?? '—';
  }
  const idx = answersMap?.[qId];
  if (idx === undefined) return '—';
  return question.options?.[idx] ?? String(idx);
}

export const QUIZ_TYPE_OPTIONS = [
  { value: 'mcq', label: 'Multiple Choice (MCQ)' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'mixed', label: 'Mixed (All Types)' },
];
