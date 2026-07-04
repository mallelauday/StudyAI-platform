import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  FileText,
  Layers,
  HelpCircle,
  Calendar,
  BarChart3,
  Settings,
  X,
  Brain,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const menuItems = [
  { icon: LayoutDashboard, label: 'Overview',         path: '/dashboard',            exact: true },
  { icon: Upload,           label: 'Upload Materials', path: '/dashboard/upload' },
  { icon: FileText,         label: 'AI Summaries',     path: '/dashboard/summaries' },
  { icon: Layers,           label: 'Flashcards',       path: '/dashboard/flashcards' },
  { icon: HelpCircle,       label: 'Quiz Center',      path: '/dashboard/quizzes' },
  { icon: Calendar,         label: 'Study Planner',    path: '/dashboard/planner' },
  { icon: BarChart3,        label: 'Analytics',        path: '/dashboard/analytics' },
];

/** Shared active / inactive className builder for NavLink */
function navCls({ isActive }) {
  const base =
    'group flex items-center gap-3.5 px-[18px] py-[13px] rounded-2xl ' +
    'text-sm font-medium transition-all duration-250 ease-in-out ' +
    'select-none cursor-pointer';

  if (isActive) {
    return (
      base +
      ' bg-primary-500/[0.15] text-primary-500 dark:text-primary-400 ' +
      'shadow-[0_0_20px_rgba(139,92,246,0.18)] ' +
      'border border-primary-500/20 dark:border-primary-400/15'
    );
  }

  return (
    base +
    ' text-gray-500 dark:text-gray-400 border border-transparent ' +
    'hover:bg-gray-100 dark:hover:bg-white/[0.06] ' +
    'hover:text-gray-900 dark:hover:text-gray-100 ' +
    'hover:translate-x-1'
  );
}

export function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const initials = (user?.display_name || user?.name || 'S')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={`
        fixed top-0 bottom-0 left-0 z-50 lg:z-40
        w-[270px]
        flex flex-col
        bg-white dark:bg-dark-card
        border-r border-gray-200/80 dark:border-white/[0.07]
        shadow-[4px_0_24px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.35)]
        lg:top-16 lg:h-[calc(100vh-4rem)]
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* ── Mobile header ─────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 lg:hidden border-b border-gray-100 dark:border-white/[0.07]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-primary-600 to-blue-500 flex items-center justify-center text-white shadow">
            <Brain size={15} />
          </div>
          <span className="font-bold text-base tracking-tight text-gray-900 dark:text-white">
            Study<span className="text-primary-600 dark:text-primary-400">AI</span>
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Section label ──────────────────────────────── */}
      <div className="hidden lg:block px-6 pt-7 pb-3">
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.12em]">
          Main Menu
        </p>
      </div>

      {/* ── Navigation items ───────────────────────────── */}
      <nav
        className="flex-1 flex flex-col gap-1.5 px-4 pb-4 overflow-y-auto
                   scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10"
      >
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            onClick={onClose}
            className={navCls}
          >
            {({ isActive }) => (
              <>
                <span
                  className={`
                    flex-shrink-0 transition-colors duration-200
                    ${isActive
                      ? 'text-primary-500 dark:text-primary-400'
                      : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                    }
                  `}
                >
                  <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                </span>
                <span className="truncate">{item.label}</span>

                {/* Active indicator pill */}
                {isActive && (
                  <span className="ml-auto w-1.5 h-5 rounded-full bg-primary-500 dark:bg-primary-400 opacity-80" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Bottom divider + Profile Settings ──────────── */}
      <div className="px-4 pb-5 pt-3 mt-auto">
        {/* Divider with label */}
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="flex-1 h-px bg-gray-200 dark:bg-white/[0.07]" />
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-[0.1em]">
            Account
          </span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-white/[0.07]" />
        </div>

        {/* User mini-card + settings link */}
        <NavLink
          to="/dashboard/profile"
          onClick={onClose}
          className={navCls}
        >
          {({ isActive }) => (
            <>
              {/* Avatar */}
              {user?.profileImage || user?.profileImageUrl || user?.avatar || user?.profile_picture || user?.avatar_url ? (
                <img
                  src={user.profileImage || user.profileImageUrl || user.avatar || user.profile_picture || user.avatar_url}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-white/10 flex-shrink-0"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {initials}
                </span>
              )}

              {/* Name + settings label */}
              <span className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate leading-tight">
                  {user?.display_name || user?.name || 'Student'}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight mt-0.5 flex items-center gap-1">
                  <Settings size={10} />
                  Profile Settings
                </span>
              </span>

              {isActive && (
                <span className="ml-auto w-1.5 h-5 rounded-full bg-primary-500 dark:bg-primary-400 opacity-80 flex-shrink-0" />
              )}
            </>
          )}
        </NavLink>
      </div>
    </aside>
  );
}
