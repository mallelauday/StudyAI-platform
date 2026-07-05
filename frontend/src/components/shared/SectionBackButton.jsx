import { ArrowLeft } from 'lucide-react';

/**
 * Consistent back/exit control for dashboard sub-views.
 */
export function SectionBackButton({
  label = 'Back',
  onClick,
  variant = 'text',
  className = '',
}) {
  const base =
    variant === 'button'
      ? 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors'
      : 'inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors';

  return (
    <button type="button" onClick={onClick} className={`${base} ${className}`}>
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}
