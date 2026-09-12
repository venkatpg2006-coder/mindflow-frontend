import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';

/* =========================
   AUTH CONTEXT
========================= */

const AuthContext = createContext();

function AuthProvider({ children }) {
  const [token, setToken] = useState(
    localStorage.getItem('mindflow_token')
  );

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mindflow_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (newToken, userData) => {
    localStorage.setItem('mindflow_token', newToken);
    localStorage.setItem(
      'mindflow_user',
      JSON.stringify(userData)
    );

    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('mindflow_token');
    localStorage.removeItem('mindflow_user');

    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ token, user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return useContext(AuthContext);
}

/* =========================
   LOGIN PAGE
========================= */

function LoginPage({ switchToSignup }) {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/auth/login`,
        {
          email,
          password
        }
      );

      login(response.data.token, {
        id: response.data.userId,
        plan: response.data.plan || 'free'
      });
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Invalid email or password'
      );
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-background-circle circle-one"></div>
      <div className="auth-background-circle circle-two"></div>

      <div className="auth-card">

        <div className="brand-icon">
          ✦
        </div>

        <h1>MindFlow</h1>

        <p className="auth-subtitle">
          Your personal space for better habits,
          focus and wellbeing.
        </p>

        <form onSubmit={handleLogin}>

          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            className="primary-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

        </form>

        <p className="switch-text">
          Don't have an account?
          <button
            className="link-button"
            onClick={switchToSignup}
          >
            Create account
          </button>
        </p>

      </div>
    </div>
  );
}

/* =========================
   SIGNUP PAGE
========================= */

function SignupPage({ switchToLogin }) {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/auth/signup`,
        {
          email,
          password
        }
      );

      login(response.data.token, {
        id: response.data.userId,
        plan: 'free'
      });

    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Unable to create account'
      );
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">

      <div className="auth-background-circle circle-one"></div>
      <div className="auth-background-circle circle-two"></div>

      <div className="auth-card">

        <div className="brand-icon">
          ✦
        </div>

        <h1>Create your MindFlow</h1>

        <p className="auth-subtitle">
          Build better habits. Understand yourself.
          Grow every day.
        </p>

        <form onSubmit={handleSignup}>

          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? 'Creating account...'
              : 'Create Account'}
          </button>

        </form>

        <p className="switch-text">
          Already have an account?

          <button
            className="link-button"
            onClick={switchToLogin}
          >
            Sign in
          </button>
        </p>

      </div>
    </div>
  );
}

/* =========================
   DASHBOARD
========================= */

function Dashboard() {
  const { token, user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');

  const [habits, setHabits] = useState([]);
  const [moodData, setMoodData] = useState([]);
  const [streakData, setStreakData] = useState([]);

  const [showModal, setShowModal] = useState(false);

  const [loading, setLoading] = useState(true);

  const headers = {
    Authorization: `Bearer ${token}`
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const [habitsResponse, moodResponse, streakResponse] =
        await Promise.all([
          axios.get(`${API_URL}/habits`, { headers }),
          axios.get(`${API_URL}/analytics/mood`, { headers }),
          axios.get(`${API_URL}/analytics/streaks`, { headers })
        ]);

      setHabits(habitsResponse.data || []);
      setMoodData(moodResponse.data || []);
      setStreakData(streakResponse.data || []);

    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const completedHabits = habits.filter(
    habit => habit.completed
  ).length;

  const averageMood =
    moodData.length > 0
      ? (
          moodData.reduce(
            (sum, item) => sum + Number(item.mood || 0),
            0
          ) / moodData.length
        ).toFixed(1)
      : '—';

  return (
    <div className="dashboard-page">

      {/* HEADER */}

      <header className="top-header">

        <div className="brand">

          <div className="small-brand-icon">
            ✦
          </div>

          <div>
            <h2>MindFlow</h2>
            <span>Personal wellbeing</span>
          </div>

        </div>

        <div className="header-right">

          <div className="user-info">
            <div className="avatar">
              {user?.id
                ? String(user.id).slice(-2)
                : 'MF'}
            </div>

            <div>
              <strong>
                Welcome back
              </strong>

              <span>
                {user?.plan || 'Free'} plan
              </span>
            </div>
          </div>

          <button
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>

        </div>

      </header>

      {/* MAIN */}

      <main className="dashboard-container">

        <div className="welcome-section">

          <div>
            <p className="eyebrow">
              YOUR PERSONAL DASHBOARD
            </p>

            <h1>
              Good to see you again 👋
            </h1>

            <p>
              Small improvements every day create
              meaningful change over time.
            </p>
          </div>

          <button
            className="primary-button add-button"
            onClick={() => setShowModal(true)}
          >
            + Log Today
          </button>

        </div>

        {/* NAVIGATION */}

        <div className="dashboard-tabs">

          <button
            className={
              activeTab === 'dashboard'
                ? 'tab active'
                : 'tab'
            }
            onClick={() => setActiveTab('dashboard')}
          >
            Overview
          </button>

          <button
            className={
              activeTab === 'analytics'
                ? 'tab active'
                : 'tab'
            }
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>

          <button
            className={
              activeTab === 'insights'
                ? 'tab active'
                : 'tab'
            }
            onClick={() => setActiveTab('insights')}
          >
            Insights
          </button>

        </div>

        {loading ? (

          <div className="loading-card">
            Loading your MindFlow...
          </div>

        ) : activeTab === 'dashboard' ? (

          <DashboardTab
            habits={habits}
            completedHabits={completedHabits}
            averageMood={averageMood}
            streakData={streakData}
            onLog={() => setShowModal(true)}
          />

        ) : activeTab === 'analytics' ? (

          <AnalyticsTab
            moodData={moodData}
            streakData={streakData}
          />

        ) : (

          <InsightsTab
            habits={habits}
            averageMood={averageMood}
          />

        )}

      </main>

      {showModal && (
        <LogModal
          token={token}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            loadData();
          }}
        />
      )}

    </div>
  );
}

/* =========================
   DASHBOARD TAB
========================= */

function DashboardTab({
  habits,
  completedHabits,
  averageMood,
  streakData,
  onLog
}) {
  const totalStreak =
    streakData.length > 0
      ? Math.max(
          ...streakData.map(
            item => Number(item.streak || 0)
          )
        )
      : 0;

  return (
    <div>

      {/* STAT CARDS */}

      <div className="stats-grid">

        <div className="stat-card">

          <div className="stat-icon purple">
            ✓
          </div>

          <div>
            <span>Habits Completed</span>
            <strong>
              {completedHabits}
            </strong>
          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon green">
            🔥
          </div>

          <div>
            <span>Current Streak</span>
            <strong>
              {totalStreak}
              <small> days</small>
            </strong>
          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon orange">
            ☀
          </div>

          <div>
            <span>Average Mood</span>
            <strong>
              {averageMood}
              {averageMood !== '—' && (
                <small>/5</small>
              )}
            </strong>
          </div>

        </div>

      </div>

      {/* HABITS */}

      <div className="content-card">

        <div className="card-header">

          <div>
            <p className="eyebrow">
              TODAY
            </p>

            <h2>
              Your Habits
            </h2>
          </div>

          <button
            className="secondary-button"
            onClick={onLog}
          >
            + Add Log
          </button>

        </div>

        {habits.length === 0 ? (

          <div className="empty-state">

            <div className="empty-icon">
              ✦
            </div>

            <h3>
              Start your journey
            </h3>

            <p>
              Begin logging your habits and daily
              wellbeing to see your progress here.
            </p>

            <button
              className="primary-button"
              onClick={onLog}
            >
              Log Your First Day
            </button>

          </div>

        ) : (

          <div className="habit-list">

            {habits.map((habit, index) => (

              <div
                className="habit-item"
                key={habit.id || index}
              >

                <div className="habit-check">
                  {habit.completed ? '✓' : ''}
                </div>

                <div className="habit-details">

                  <strong>
                    {habit.name ||
                      habit.habit_name ||
                      `Habit ${index + 1}`}
                  </strong>

                  <span>
                    {habit.completed
                      ? 'Completed today'
                      : 'Not completed yet'}
                  </span>

                </div>

                <div
                  className={
                    habit.completed
                      ? 'status completed'
                      : 'status pending'
                  }
                >
                  {habit.completed
                    ? 'Done'
                    : 'Pending'}
                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>
  );
}

/* =========================
   ANALYTICS
========================= */

function AnalyticsTab({
  moodData,
  streakData
}) {
  return (
    <div className="analytics-grid">

      <div className="content-card chart-card">

        <div className="card-header">

          <div>
            <p className="eyebrow">
              WELLBEING
            </p>

            <h2>
              Mood Trends
            </h2>
          </div>

          <span className="chart-label">
            Last entries
          </span>

        </div>

        <div className="chart-container">

          {moodData.length === 0 ? (

            <div className="empty-chart">
              No mood data available yet.
            </div>

          ) : (

            <ResponsiveContainer
              width="100%"
              height={300}
            >
              <LineChart data={moodData}>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                />

                <XAxis dataKey="date" />

                <YAxis
                  domain={[0, 5]}
                />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{
                    r: 5
                  }}
                />

              </LineChart>
            </ResponsiveContainer>

          )}

        </div>

      </div>

      <div className="content-card chart-card">

        <div className="card-header">

          <div>
            <p className="eyebrow">
              CONSISTENCY
            </p>

            <h2>
              Streak Progress
            </h2>
          </div>

        </div>

        <div className="streak-display">

          <div className="big-streak">
            🔥
          </div>

          <strong>
            {streakData.length > 0
              ? Math.max(
                  ...streakData.map(
                    item =>
                      Number(item.streak || 0)
                  )
                )
              : 0}
          </strong>

          <span>
            day best streak
          </span>

        </div>

      </div>

    </div>
  );
}

/* =========================
   INSIGHTS
========================= */

function InsightsTab({
  habits,
  averageMood
}) {
  return (
    <div className="insights-grid">

      <div className="content-card insight-card">

        <div className="insight-icon">
          🧠
        </div>

        <h2>
          Your MindFlow Insight
        </h2>

        <p>
          Consistency matters more than perfection.
          Focus on completing small habits regularly
          rather than trying to change everything at once.
        </p>

      </div>

      <div className="content-card insight-card">

        <div className="insight-icon">
          📊
        </div>

        <h2>
          Your Progress
        </h2>

        <p>
          You currently have{' '}
          <strong>{habits.length}</strong>{' '}
          tracked habits.
        </p>

        <p>
          Your average recorded mood is{' '}
          <strong>{averageMood}</strong>.
        </p>

      </div>

      <div className="content-card insight-card">

        <div className="insight-icon">
          🌱
        </div>

        <h2>
          Keep Growing
        </h2>

        <p>
          Every completed habit is a small vote for
          the person you want to become.
        </p>

      </div>

    </div>
  );
}

/* =========================
   LOG MODAL
========================= */

function LogModal({
  token,
  onClose,
  onSaved
}) {
  const [mood, setMood] = useState(3);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const saveLog = async () => {

    setLoading(true);

    try {

      await axios.post(
        `${API_URL}/logs`,
        {
          mood,
          notes
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      onSaved();

    } catch (error) {

      console.error(error);
      alert(
        error.response?.data?.error ||
        'Unable to save log'
      );

    }

    setLoading(false);
  };

  return (
    <div className="modal-overlay">

      <div className="modal-card">

        <div className="modal-header">

          <div>
            <p className="eyebrow">
              DAILY CHECK-IN
            </p>

            <h2>
              How are you feeling?
            </h2>
          </div>

          <button
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>

        </div>

        <div className="mood-section">

          <div className="mood-number">
            {mood}
            <span>/5</span>
          </div>

          <input
            type="range"
            min="1"
            max="5"
            value={mood}
            onChange={(e) =>
              setMood(Number(e.target.value))
            }
          />

          <div className="mood-labels">
            <span>Low</span>
            <span>Okay</span>
            <span>Great</span>
          </div>

        </div>

        <label>
          Notes
        </label>

        <textarea
  rows="4"
  placeholder="Write something about your day..."
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
/>
<div className="modal-actions">

  <button
    className="secondary-button"
    onClick={onClose}
  >
    Cancel
  </button>

  <button
    className="primary-button"
    onClick={saveLog}
    disabled={loading}
  >
    {loading ? 'Saving...' : 'Save Check-in'}
  </button>

</div>

</div>
</div>
);
}

function App() {

  const { token } = useAuth();

  const [showSignup, setShowSignup] = useState(true);

  if (token) {
    return <Dashboard />;
  }

  if (showSignup) {
    return (
      <SignupPage
        switchToLogin={() => setShowSignup(false)}
      />
    );
  }

  return (
    <LoginPage
      switchToSignup={() => setShowSignup(true)}
    />
  );
}

export { AuthProvider };

export default App;