// ============================================
// MINDFLOW - Frontend Starter (React)
// ============================================

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ============================================
// CONTEXT FOR AUTH STATE
// ============================================

const AuthContext = React.createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const login = (newToken, userId, plan) => {
    setToken(newToken);
    setUser({ id: userId, plan });
    localStorage.setItem('token', newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================
// SIGNUP PAGE
// ============================================

const SignupPage = ({ onSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await axios.post(`${API_URL}/auth/signup`, {
        email,
        password,
      });

      onSignup(data.token, data.userId);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2">MindFlow</h1>
        <p className="text-gray-600 mb-6">Your personal wellness companion</p>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ============================================
// DASHBOARD (MAIN PAGE)
// ============================================

const Dashboard = () => {
  const { user, token, logout } = React.useContext(AuthContext);
  const [habits, setHabits] = useState([]);
  const [moodData, setMoodData] = useState([]);
  const [streaks, setStreaks] = useState([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'analytics', 'insights'
  const [loading, setLoading] = useState(true);

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [habitsRes, moodRes, streaksRes] = await Promise.all([
        axios.get(`${API_URL}/habits`, axiosConfig),
        axios.get(`${API_URL}/analytics/mood`, axiosConfig),
        axios.get(`${API_URL}/analytics/streaks`, axiosConfig),
      ]);

      setHabits(habitsRes.data);
      setMoodData(moodRes.data);
      setStreaks(streaksRes.data);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">🏃 MindFlow</h1>
          <button
            onClick={logout}
            className="text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </header>

      {/* TABS */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-4">
            {['dashboard', 'analytics', 'insights'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-4 border-b-2 capitalize font-medium ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && (
          <DashboardTab
            habits={habits}
            onLogClick={() => setShowLogModal(true)}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab moodData={moodData} streaks={streaks} />
        )}

        {activeTab === 'insights' && (
          <InsightsTab isPremium={user?.plan === 'premium'} />
        )}
      </main>

      {/* LOG MODAL */}
      {showLogModal && (
        <LogModal
          habits={habits}
          onClose={() => setShowLogModal(false)}
          onLogSubmit={() => {
            setShowLogModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};

// ============================================
// DASHBOARD TAB
// ============================================

const DashboardTab = ({ habits, onLogClick, onRefresh }) => {
  return (
    <div className="space-y-6">
      {/* QUICK LOG SECTION */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">📊 Today's Check-in</h2>
        <button
          onClick={onLogClick}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          + Log Habit
        </button>
      </div>

      {/* HABIT LIST */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">My Habits</h2>
        <div className="space-y-3">
          {habits.length === 0 ? (
            <p className="text-gray-500">No habits yet. Create one to get started!</p>
          ) : (
            habits.map((habit) => (
              <div key={habit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">{habit.name}</span>
                <span className="text-sm text-gray-500">{habit.category}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// ANALYTICS TAB
// ============================================

const AnalyticsTab = ({ moodData, streaks }) => {
  return (
    <div className="space-y-6">
      {/* MOOD CHART */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">📈 Mood Trend (7 Days)</h2>
        {moodData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={moodData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[1, 10]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="avg_mood"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500">No mood data yet. Log some entries to see trends!</p>
        )}
      </div>

      {/* STREAKS */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">🔥 Streaks</h2>
        <div className="space-y-3">
          {streaks.length === 0 ? (
            <p className="text-gray-500">No streaks yet.</p>
          ) : (
            streaks.map((streak, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">{streak.habit}</span>
                <span className="text-lg font-bold text-orange-500">{streak.streak} 🔥</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// INSIGHTS TAB
// ============================================

const InsightsTab = ({ isPremium }) => {
  if (!isPremium) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <h2 className="text-xl font-bold mb-4">🤖 AI Insights</h2>
        <p className="text-gray-600 mb-4">
          Unlock AI-powered insights about what affects your mood and health.
        </p>
        <button className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-6 rounded">
          Upgrade to Premium - $9.99/month
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">🤖 AI Insights</h2>
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="font-medium">🎯 Sleep & Mood Correlation</p>
          <p className="text-sm text-gray-600 mt-1">
            You tend to have 0.23 points higher mood on days you sleep 7+ hours.
          </p>
        </div>
        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
          <p className="font-medium">💪 Exercise Impact</p>
          <p className="text-sm text-gray-600 mt-1">
            Exercise correlates strongly (0.54) with mood improvement the next day.
          </p>
        </div>
        <div className="p-4 bg-purple-50 border-l-4 border-purple-500 rounded">
          <p className="font-medium">🧘 Meditation Consistency</p>
          <p className="text-sm text-gray-600 mt-1">
            Your best weeks include 4+ meditation sessions. Consider a daily routine.
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// LOG MODAL
// ============================================

const LogModal = ({ habits, onClose, onLogSubmit }) => {
  const { token } = React.useContext(AuthContext);
  const [formData, setFormData] = useState({
    sleep: 7,
    mood: 5,
    exercise: false,
    meditation: 0,
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Log sleep
      const sleepHabit = habits.find((h) => h.name === 'Sleep');
      if (sleepHabit) {
        await axios.post(
          `${API_URL}/logs`,
          { habit_id: sleepHabit.id, value: formData.sleep, notes: formData.notes },
          axiosConfig
        );
      }

      // Log mood
      const moodHabit = habits.find((h) => h.name === 'Mood');
      if (moodHabit) {
        await axios.post(
          `${API_URL}/logs`,
          { habit_id: moodHabit.id, value: formData.mood },
          axiosConfig
        );
      }

      // Log exercise
      const exerciseHabit = habits.find((h) => h.name === 'Exercise');
      if (exerciseHabit && formData.exercise) {
        await axios.post(
          `${API_URL}/logs`,
          { habit_id: exerciseHabit.id, value: 1 },
          axiosConfig
        );
      }

      // Log meditation
      const meditationHabit = habits.find((h) => h.name === 'Meditation');
      if (meditationHabit && formData.meditation > 0) {
        await axios.post(
          `${API_URL}/logs`,
          { habit_id: meditationHabit.id, value: formData.meditation },
          axiosConfig
        );
      }

      onLogSubmit();
    } catch (err) {
      console.error('Failed to log', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Log Your Day</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* SLEEP */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Sleep: {formData.sleep} hours
            </label>
            <input
              type="range"
              min="0"
              max="12"
              step="0.5"
              value={formData.sleep}
              onChange={(e) => setFormData({ ...formData, sleep: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* MOOD */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Mood: {formData.mood}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={formData.mood}
              onChange={(e) => setFormData({ ...formData, mood: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* EXERCISE */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="exercise"
              checked={formData.exercise}
              onChange={(e) => setFormData({ ...formData, exercise: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="exercise" className="text-sm font-medium">
              I exercised today
            </label>
          </div>

          {/* MEDITATION */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Meditation: {formData.meditation} minutes
            </label>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={formData.meditation}
              onChange={(e) => setFormData({ ...formData, meditation: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* NOTES */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              rows="3"
              placeholder="How are you feeling?"
            />
          </div>

          {/* BUTTONS */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-bold py-2 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Log Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// MAIN APP COMPONENT
// ============================================

export default function App() {
  const { user, login } = React.useContext(AuthContext) || { user: null, login: () => {} };

  if (!user) {
    return <SignupPage onSignup={login} />;
  }

  return <Dashboard />;
}

// ============================================
// ROOT RENDER
// ============================================

// In your main.jsx or index.js:
/*
import React from 'react'
import ReactDOM from 'react-dom/client'
import App, { AuthProvider } from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
*/