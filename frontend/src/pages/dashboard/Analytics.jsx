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
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Loader2, AlertCircle } from 'lucide-react';
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

const BAR_COLORS = [
  'rgba(139, 92, 246, 0.8)',
  'rgba(59, 130, 246, 0.8)',
  'rgba(249, 115, 22, 0.8)',
  'rgba(34, 197, 94, 0.8)',
  'rgba(236, 72, 153, 0.8)',
  'rgba(14, 165, 233, 0.8)',
];

const GRADE_COLORS = ['#22c55e', '#3b82f6', '#eab308', '#f97316', '#ef4444'];

function EmptyChart({ message }) {
  return (
    <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm text-center px-4">
      {message}
    </div>
  );
}

export function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/analytics');
        setData(res.data?.data ?? null);
      } catch (err) {
        setError(err.response?.data?.error ?? 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, max: 100 } },
  };

  const trend = data?.performance_trend ?? [];
  const performanceData = {
    labels: trend.map((p) => p.date || ''),
    datasets: [
      {
        fill: true,
        label: 'Quiz Score (%)',
        data: trend.map((p) => p.score ?? 0),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const weakTopics = data?.weak_topics ?? [];
  const topicData = {
    labels: weakTopics.map((t) => t.topic),
    datasets: [
      {
        label: 'Mastery (%)',
        data: weakTopics.map((t) => t.average_mastery ?? 0),
        backgroundColor: weakTopics.map((_, i) => BAR_COLORS[i % BAR_COLORS.length]),
      },
    ],
  };

  const distribution = data?.score_distribution ?? { A: 0, B: 0, C: 0, D: 0, F: 0 };
  const gradeLabels = ['A', 'B', 'C', 'D', 'F'];
  const gradeValues = gradeLabels.map((g) => distribution[g] ?? 0);
  const hasGrades = gradeValues.some((v) => v > 0);

  const completionData = {
    labels: gradeLabels,
    datasets: [
      {
        data: gradeValues,
        backgroundColor: GRADE_COLORS,
        borderWidth: 0,
      },
    ],
  };

  const avgScore = data?.average_score ?? 0;
  const velocityPct = Math.min(100, Math.round(avgScore));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-400">
        <Loader2 className="animate-spin mr-2" size={24} /> Loading analytics…
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
        <AlertCircle size={18} /> {error}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {data?.insight ?? 'Track your learning progress over time.'}
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Documents', value: data?.documents_uploaded ?? 0 },
          { label: 'Summaries', value: data?.summaries_generated ?? 0 },
          { label: 'Quizzes Taken', value: data?.quizzes_taken ?? 0 },
          { label: 'Study Streak', value: `${data?.study_streak ?? 0} days` },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-4">Quiz Performance Trends</h2>
          <div className="h-[300px] w-full">
            {trend.length > 0 ? (
              <Line options={lineOptions} data={performanceData} />
            ) : (
              <EmptyChart message="Take quizzes to see your score trends over time." />
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-4">Weak Topics (Mastery %)</h2>
          <div className="h-[300px] w-full">
            {weakTopics.length > 0 ? (
              <Bar
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, max: 100 } },
                }}
                data={topicData}
              />
            ) : (
              <EmptyChart message="Complete quizzes to identify topics that need more practice." />
            )}
          </div>
        </div>

        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex flex-col md:flex-row gap-8 items-center justify-around">
            <div className="w-full md:w-1/3">
              <h2 className="text-lg font-bold mb-4">Quiz Grade Distribution</h2>
              <div className="h-[250px] flex items-center justify-center">
                {hasGrades ? (
                  <Doughnut data={completionData} options={{ cutout: '70%' }} />
                ) : (
                  <EmptyChart message="No quiz grades yet." />
                )}
              </div>
            </div>

            <div className="w-full md:w-1/2 space-y-6">
              <div>
                <h3 className="font-bold text-xl mb-1 text-gray-900 dark:text-white">Average Score</h3>
                <p className="text-sm text-gray-500 mb-2">
                  {avgScore > 0
                    ? `Your current average quiz score is ${avgScore}%.`
                    : 'Start taking quizzes to track your performance.'}
                </p>
                <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full transition-all"
                    style={{ width: `${velocityPct}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Flashcards Mastered</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                    {data?.flashcards_mastered ?? 0}
                    <span className="text-sm font-normal text-gray-400"> / {data?.flashcards_total ?? 0}</span>
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Materials Uploaded</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                    {data?.documents_uploaded ?? 0}
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
