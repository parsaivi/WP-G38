import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import suspectService from '../services/suspectService';
import { useSelector } from 'react-redux';

const SuspectPage = () => {
  const [suspects, setSuspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchSuspects();
  }, [filterStatus, page]);

  const fetchSuspects = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: 10,
      };
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      const response = await suspectService.getSuspects(params);
      setSuspects(response.data.results || response.data || []);
      const total = response.data.count || 0;
      setTotalPages(Math.ceil(total / 10));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch suspects');
    } finally {
      setLoading(false);
    }
  };

  const handleArrest = async (id) => {
    try {
      setError(null);
      await suspectService.arrest(id);
      fetchSuspects();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to arrest suspect');
    }
  };
  const { user } = useSelector((state) => state.auth);
  const userRoles = (user?.roles || user?.groups || []).map(r => String(r).toLowerCase());
  const isSergeant = user?.is_staff || userRoles.includes('sergeant');

  const getStatusColor = (status) => {
    const colors = {
      under_investigation: 'bg-blue-100 text-blue-800',
      under_pursuit: 'bg-orange-100 text-orange-800',
      most_wanted: 'bg-red-100 text-red-800',
      arrested: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading suspects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Suspects</h1>
            <p className="text-gray-600 mt-2">Total: {suspects.length} suspects</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Filter */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Suspects</option>
              <option value="under_investigation">Under Investigation</option>
              <option value="under_pursuit">Under Pursuit</option>
              <option value="most_wanted">Most Wanted</option>
              <option value="arrested">Arrested</option>
            </select>
          </div>
        </div>

        {/* Suspects Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {suspects.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 text-lg">No suspects found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Days Wanted
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Crime Severity
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Reward (Rials)
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {suspects.map((suspect) => (
                    <tr key={suspect.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {suspect.full_name}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(
                            suspect.status
                          )}`}
                        >
                          {suspect.status?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {suspect.days_wanted || '0'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Level {suspect.max_crime_severity || '0'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600">
                        {suspect.reward_amount
                          ? (suspect.reward_amount).toLocaleString()
                          : '0'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          to={`/suspects/${suspect.id}`}
                          className="text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          View Details
                        </Link>
                         {isSergeant && suspect.status !== 'arrested' && (
                          <button
                            onClick={() => handleArrest(suspect.id)}
                            className="text-white bg-gray-800 hover:bg-gray-900 px-3 py-1 rounded font-semibold"
                          >
                            Arrest
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center space-x-4">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className={`px-4 py-2 rounded-lg font-semibold ${
                page === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Previous
            </button>
            <span className="text-gray-700 font-semibold">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className={`px-4 py-2 rounded-lg font-semibold ${
                page === totalPages
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuspectPage;
