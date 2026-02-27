import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import judiciaryService from '../services/judiciaryService';

const formatUserName = (user) => {
  if (!user) return 'N/A';
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
  return name || user.username;
};

const TrialsListPage = () => {
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrials = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await judiciaryService.getTrials();
        const data = res.data?.results ?? res.data;
        setTrials(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to load trials');
      } finally {
        setLoading(false);
      }
    };
    fetchTrials();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
          <p className="mt-4 text-gray-600">Loading trials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Trials</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {trials.length === 0 && !error ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            <p>No trials found. Trials are created from case detail when a case is in trial status.</p>
            <Link to="/cases" className="mt-4 inline-block text-cyan-600 hover:text-cyan-700 font-semibold">
              View cases
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Case</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Judge</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Scheduled</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Verdict</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {trials.map((trial) => (
                  <tr key={trial.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">#{trial.id}</td>
                    <td className="px-6 py-4 text-sm">
                      {trial.case ? (
                        <Link
                          to={`/cases/${trial.case.id}`}
                          className="text-cyan-600 hover:text-cyan-700 font-medium"
                        >
                          {trial.case.case_number || `Case #${trial.case.id}`}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {trial.judge ? formatUserName(trial.judge) : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {trial.scheduled_date
                        ? new Date(trial.scheduled_date).toLocaleString()
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {trial.verdict ? (
                        <span className="inline-block px-2 py-1 rounded bg-cyan-100 text-cyan-800 font-medium">
                          {trial.verdict.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-gray-500">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/trials/${trial.id}`}
                        className="text-cyan-600 hover:text-cyan-700 font-semibold text-sm"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrialsListPage;
