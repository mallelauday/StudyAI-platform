import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle2, BookOpen, Target, Sparkles, Loader2 } from 'lucide-react';
import api from '../../api/api';

const READ_KEY = 'studyai_read_notifications';

function getReadIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveReadIds(ids) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

function timeAgo(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function buildNotifications(docs, results, summaries) {
  const items = [];

  results.slice(0, 5).forEach((r) => {
    const score = r.score ?? r.percentage ?? 0;
    items.push({
      id: `quiz-${r.result_id ?? r.id ?? r.quiz_id}-${r.created_at}`,
      type: 'quiz',
      title: score >= 70 ? 'Quiz completed' : 'Quiz needs review',
      message: `${r.document_title ?? 'Quiz'} — ${Math.round(score)}%`,
      link: '/dashboard/quizzes',
      created_at: r.created_at,
      icon: Target,
    });
  });

  docs.slice(0, 3).forEach((d) => {
    items.push({
      id: `doc-${d.document_id}-${d.created_at}`,
      type: 'upload',
      title: 'Document uploaded',
      message: d.title ?? 'New study material',
      link: '/dashboard/upload',
      created_at: d.created_at,
      icon: BookOpen,
    });
  });

  summaries.slice(0, 2).forEach((s) => {
    items.push({
      id: `summary-${s.id ?? s.summary_id}-${s.created_at}`,
      type: 'summary',
      title: 'Summary ready',
      message: s.document_title ?? 'AI summary generated',
      link: '/dashboard/summaries',
      created_at: s.created_at,
      icon: Sparkles,
    });
  });

  return items
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(getReadIds);
  const ref = useRef(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [docsRes, resultsRes, summariesRes] = await Promise.all([
        api.get('/upload').catch(() => ({ data: {} })),
        api.get('/quiz/results').catch(() => ({ data: {} })),
        api.get('/summary').catch(() => ({ data: {} })),
      ]);

      const docs = docsRes.data?.data?.documents ?? [];
      const results = resultsRes.data?.data?.results ?? [];
      const summaries = summariesRes.data?.data?.summaries ?? [];

      setNotifications(buildNotifications(docs, results, summaries));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAllRead = () => {
    const all = new Set(notifications.map((n) => n.id));
    setReadIds(all);
    saveReadIds(all);
  };

  const markRead = (id) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    saveReadIds(next);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-border rounded-xl transition-colors"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[420px] overflow-hidden bg-white dark:bg-dark-card rounded-xl shadow-xl border border-gray-200 dark:border-dark-border z-50 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-border flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                <Loader2 size={16} className="animate-spin mr-2" /> Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm px-4">
                <Bell size={28} className="mx-auto mb-2 opacity-30" />
                No notifications yet. Upload materials or take quizzes to get updates.
              </div>
            ) : (
              notifications.map((n) => {
                const unread = !readIds.has(n.id);
                const Icon = n.icon;
                return (
                  <Link
                    key={n.id}
                    to={n.link}
                    onClick={() => { markRead(n.id); setOpen(false); }}
                    className={`flex gap-3 px-4 py-3 border-b border-gray-50 dark:border-dark-border/50 hover:bg-gray-50 dark:hover:bg-dark-border/30 transition-colors ${
                      unread ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      unread ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'bg-gray-100 dark:bg-dark-border text-gray-500'
                    }`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${unread ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                    {unread && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />}
                  </Link>
                );
              })
            )}
          </div>

          <div className="px-4 py-2 border-t border-gray-100 dark:border-dark-border">
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
            >
              <CheckCircle2 size={12} /> View dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
