import React, { useEffect, useState } from 'react';
import statsService from '../services/statsService';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const [stats, setStats] = useState({
    total_solved_cases: 0,
    total_staff: 0,
    active_cases: 0,
    wanted_suspects: 0,
    pending_complaints: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await statsService.getDashboardStats();
      setStats({
        total_solved_cases: response.data.total_solved_cases || 0,
        total_staff: response.data.total_staff || 0,
        active_cases: response.data.active_cases || 0,
        wanted_suspects: response.data.wanted_suspects || 0,
        pending_complaints: response.data.pending_complaints || 0,
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-4xl font-bold mb-4">Error</h1>
          <p className="text-xl">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-white">
          <h1 className="text-5xl font-bold mb-2">Police Department Management</h1>
          <p className="text-xl text-blue-200">System Overview & Statistics</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
          {/* Active Cases Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 transform hover:scale-105 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase">Active Cases</p>
                <p className="text-4xl font-bold text-blue-900 mt-2">
                  {loading ? '...' : stats.active_cases}
                </p>
              </div>
              <div className="text-5xl text-yellow-500 opacity-20">📋</div>
            </div>
          </div>

          {/* Solved Cases Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 transform hover:scale-105 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase">Solved Cases</p>
                <p className="text-4xl font-bold text-green-900 mt-2">
                  {loading ? '...' : stats.total_solved_cases}
                </p>
              </div>
              <div className="text-5xl text-green-500 opacity-20">✓</div>
            </div>
          </div>

          {/* Total Personnel Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 transform hover:scale-105 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase">Total Personnel</p>
                <p className="text-4xl font-bold text-purple-900 mt-2">
                  {loading ? '...' : stats.total_staff}
                </p>
              </div>
              <div className="text-5xl text-blue-500 opacity-20">👥</div>
            </div>
          </div>

          {/* Wanted Suspects Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 transform hover:scale-105 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase">Wanted Suspects</p>
                <p className="text-4xl font-bold text-red-900 mt-2">
                  {loading ? '...' : stats.wanted_suspects}
                </p>
              </div>
              <div className="text-5xl text-red-500 opacity-20">🚨</div>
            </div>
          </div>

          {/* Pending Complaints Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 transform hover:scale-105 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase">Pending Complaints</p>
                <p className="text-4xl font-bold text-yellow-900 mt-2">
                  {loading ? '...' : stats.pending_complaints}
                </p>
              </div>
              <div className="text-5xl text-yellow-500 opacity-20">📝</div>
            </div>
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              to="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg text-center font-semibold transition"
            >
              Login
            </Link>
            <Link
              to="/dashboard"
              className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg text-center font-semibold transition"
            >
              Dashboard
            </Link>
            <Link
              to="/cases"
              className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg text-center font-semibold transition"
            >
              Cases
            </Link>
            <Link
              to="/most-wanted"
              className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg text-center font-semibold transition"
            >
              Most Wanted
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
