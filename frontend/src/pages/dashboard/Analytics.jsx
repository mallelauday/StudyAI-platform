import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Loader2,
  AlertCircle,
  BookOpen,
  Target,
  TrendingUp,
  Flame,
  BarChart3,
  Info
} from 'lucide-react';
import api from '../../api/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ── Chart colour palette ─────────────────────────────────
const PURPLE   = '#8b5cf6';
const PURPLE_A = 'rgba(139, 92, 246, 0.15)';
const BLUE     = 'rgba(59, 130, 246, 0.8)';
const ORANGE   = 'rgba(249, 115, 22, 0.8)';
const GREEN    = '#22c55e';
const RED      = '#ef4444';
const YELLOW   = '#f59e0b';
const INDIGO   = 'rgba(99, 102, 241, 0.8)';
const TEAL     = 'rgba(20, 184, 166, 0.8)';

const GRADE_COLOURS = {
  A: GREEN,
  B: BLUE,
  C: YELLOW,
  D: ORANGE,
  F: RED,
};

// ── Empty state card ─────────────────────────────────────
function EmptyChart({ message }) {
  return (
    <div className="h-[300px] flex flex-col items-center justify-center gap-3 text-gray-400">
      <Info size={32} className="opacity-40" />
      <p className="text-sm text-center max-w-xs">{message}</p>
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, color, bg }) {
  return (
    <div className="glass-card p-6 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${bg} ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{value}</h3>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────
export function Analytics() {
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError('');
      try {
        console.log('[Analytics] Fetching /api/analytics …');
        const res = await api.get('/analytics');
        const data = res.data?.data ?? res.data;
        console.log('[Analytics] API response:', data);
        setAnalytics(data);
      } catch (err) {
        console.error('[Analytics] Fetch failed:', err);
        setError('Failed to load analytics. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // ── Loading ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-400">
        <Loader2 className="animate-spin mr-2" size={24} />
        Loading analytics…
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────
  if (error) {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm"
      >
        <AlertCircle size={18} /> {error}
      </div>
    );
  }

  // ── Destructure API response ──────────────────────────
  const {
    documents_uploaded   = 0,
    quizzes_taken        = 0,
    average_score        = 0,
    study_streak         = 0,
    performance_trend    = [],
    weak_topics          = [],
    score_distribution   = {},
    insight              = '',
    message              = '',
  } = analytics ?? {};

  const hasData = quizzes_taken > 0 || documents_uploaded > 0;

  // ── Performance trend chart data ──────────────────────
  const trendLabels  = performance_trend.map((p) => p.date || '');
  const trendScores  = performance_trend.map((p) => p.score ?? 0);

  const performanceData = {
    labels: trendLabels,
    datasets: [
      {
        fill: true,
        label: 'Quiz Score (%)',
        data: trendScores,
        borderColor: PURPLE,
        backgroundColor: PURPLE_A,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: PURPLE,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (v) => `${v}%` },
      },
    },
  };

  // ── Topic mastery chart data (weak topics, avg mastery) ─
  const topicLabels  = weak_topics.map((t) => t.topic);
  const topicScores  = weak_topics.map((t) => t.average_mastery ?? 0);

  const topicData = {
    labels: topicLabels,
    datasets: [
      {
        label: 'Avg. Mastery (%)',
        data: topicScores,
        backgroundColor: [PURPLE, BLUE, ORANGE, TEAL, INDIGO, GREEN, RED, YELLOW],
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (v) => `${v}%` },
      },
    },
  };

  // ── Score distribution doughnut ───────────────────────
  const gradeKeys    = ['A', 'B', 'C', 'D', 'F'];
  const gradeValues  = gradeKeys.map((g) => score_distribution[g] ?? 0);
  const hasGradeData = gradeValues.some((v) => v > 0);

  const distributionData = {
    labels: gradeKeys,
    datasets: [
      {
        data: gradeValues,
        backgroundColor: gradeKeys.map((g) => GRADE_COLOURS[g]),
        borderWidth: 0,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: { legend: { position: 'bottom' } },
  };

  // ── Stat cards ─────────────────────────────────────────
  const statItems = [
    {
      title: 'Documents Uploaded',
      value: documents_uploaded,
      icon: BookOpen,
      color: 'text-primary-500',
      bg: 'bg-primary-100 dark:bg-primary-900/30',
    },
    {
      title: 'Quizzes Taken',
      value: quizzes_taken,
      icon: Target,
      color: 'text-blue-500',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Average Score',
      value: quizzes_taken > 0 ? `${average_score}%` : '—',
      icon: TrendingUp,
      color: 'text-green-500',
      bg: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Study Streak',
      value: `${study_streak} ${study_streak === 1 ? 'day' : 'days'}`,
      icon: Flame,
      color: 'text-orange-500',
      bg: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Analytics Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track your learning progress over time.
        </p>
      </div>

      {/* Insight banner */}
      {insight && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 text-sm">
          <Info size={18} className="mt-0.5 flex-shrink-0" />
          <span>{insight}</span>
        </div>
      )}

      {/* No-data banner */}
      {!hasData && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 text-sm">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <span>
            {message || 'No data yet. Upload study materials and take quizzes to see your analytics.'}
          </span>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
            Quiz Performance Trend
          </h2>
          <div className="h-[300px] w-full">
            {performance_trend.length > 0 ? (
              <Line options={lineOptions} data={performanceData} />
            ) : (
              <EmptyChart message="No quiz results yet. Take a quiz to see your performance trend." />
            )}
          </div>
        </div>

        {/* Weak Topic Mastery */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
            Weak Topic Mastery
          </h2>
          <div className="h-[300px] w-full">
            {weak_topics.length > 0 ? (
              <Bar options={barOptions} data={topicData} />
            ) : (
              <EmptyChart message="No weak topics detected yet. Complete quizzes to see areas that need improvement." />
            )}
          </div>
        </div>

        {/* Score Distribution */}
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex flex-col md:flex-row gap-8 items-center justify-around">
            <div className="w-full md:w-1/3">
              <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                Score Distribution
              </h2>
              <div className="h-[250px] flex items-center justify-center">
                {hasGradeData ? (
                  <Doughnut data={distributionData} options={doughnutOptions} />
                ) : (
                  <EmptyChart message="Complete quizzes to see your grade distribution." />
                )}
              </div>
            </div>

            <div className="w-full md:w-1/2 space-y-6">
              {/* Grade breakdown table */}
              <div>
                <h3 className="font-bold text-lg mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 size={20} className="text-primary-500" />
                  Grade Breakdown
                </h3>
                <div className="space-y-2">
                  {gradeKeys.map((g) => {
                    const count = score_distribution[g] ?? 0;
                    const pct   = quizzes_taken > 0 ? Math.round((count / quizzes_taken) * 100) : 0;
                    return (
                      <div key={g} className="flex items-center gap-3">
                        <span
                          className="w-6 text-xs font-bold text-center"
                          style={{ color: GRADE_COLOURS[g] }}
                        >
                          {g}
                        </span>
                        <div className="flex-1 bg-gray-200 dark:bg-dark-border rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: GRADE_COLOURS[g] }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Avg. Score
                  </p>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                    {quizzes_taken > 0 ? `${average_score}%` : '—'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Materials Uploaded
                  </p>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                    {documents_uploaded}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
