/** Study-themed avatar presets and fallback helper. */

export const STUDY_AVATARS = [
  { id: 'bookworm',   label: 'Bookworm',   url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=bookworm' },
  { id: 'scholar',    label: 'Scholar',    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=scholar' },
  { id: 'graduate',   label: 'Graduate',   url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=graduate' },
  { id: 'researcher', label: 'Researcher', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=researcher' },
  { id: 'notes',      label: 'Notes',      url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=notes' },
  { id: 'library',    label: 'Library',    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=library' },
  { id: 'exam',       label: 'Exam Prep',  url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=exam-prep' },
  { id: 'flashcards', label: 'Flashcards', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=flashcards' },
  { id: 'quiz',       label: 'Quiz Master', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=quiz-master' },
  { id: 'study',      label: 'Study Buddy', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=study-buddy' },
  { id: 'brain',      label: 'Brainiac',   url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=brainiac' },
  { id: 'tutor',      label: 'Tutor',      url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=tutor' },
];

/**
 * Resolve the best avatar URL for a user object.
 * Falls back to a deterministic study-themed emoji avatar.
 */
export function getAvatarUrl(user) {
  const custom = user?.avatar_url || user?.avatar || user?.photoURL;
  if (custom) return custom;

  const seed = user?.email || user?.uid || user?.id || 'student';
  return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(seed)}`;
}
