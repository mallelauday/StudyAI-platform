import { useNavigate } from 'react-router-dom';
import { Sparkles, Layers, HelpCircle } from 'lucide-react';

/**
 * Quick-action buttons to generate AI content from an uploaded document.
 */
export function DocumentActions({ documentId, size = 'md', className = '' }) {
  const navigate = useNavigate();

  if (!documentId) return null;

  const go = (path) => navigate(`${path}?doc=${documentId}`);

  const btnClass =
    size === 'sm'
      ? 'px-2.5 py-1.5 text-xs gap-1'
      : 'px-4 py-2.5 text-sm gap-2';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => go('/dashboard/summaries')}
        className={`inline-flex items-center ${btnClass} bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors`}
      >
        <Sparkles size={size === 'sm' ? 14 : 16} /> Summary
      </button>
      <button
        type="button"
        onClick={() => go('/dashboard/flashcards')}
        className={`inline-flex items-center ${btnClass} bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors`}
      >
        <Layers size={size === 'sm' ? 14 : 16} /> Flashcards
      </button>
      <button
        type="button"
        onClick={() => go('/dashboard/quizzes')}
        className={`inline-flex items-center ${btnClass} bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors`}
      >
        <HelpCircle size={size === 'sm' ? 14 : 16} /> Quiz
      </button>
    </div>
  );
}
