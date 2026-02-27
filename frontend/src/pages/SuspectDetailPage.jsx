import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import suspectService from '../services/suspectService';
import bailService from '../services/bailService';
import { useSelector } from 'react-redux';

const SuspectDetailPage = () => {
  const { suspectId } = useParams();
  const [suspect, setSuspect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bailAmount, setBailAmount] = useState('');
  const [bailFine, setBailFine] = useState('');
  const [bailSubmitting, setBailSubmitting] = useState(false);

  useEffect(() => {
    fetchSuspect();
  }, [suspectId]);

  const fetchSuspect = async () => {
    try {
      setLoading(true);
      const response = await suspectService.getSuspect(suspectId);
      setSuspect(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch suspect details');
    } finally {
      setLoading(false);
    }
  };

  const handleArrest = async () => {
    try {
      setError(null);
      await suspectService.arrest(suspectId);
      fetchSuspect();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to arrest suspect');
    }
  };

  const handleCreateBail = async (e) => {
    e.preventDefault();
    const amount = parseInt(bailAmount, 10);
    if (!amount || amount <= 0) {
      setError('Enter a valid bail amount (positive number).');
      return;
    }
    try {
      setError(null);
      setBailSubmitting(true);
      await bailService.createBail({
        suspect: parseInt(suspectId, 10),
        amount,
        fine_amount: parseInt(bailFine, 10) || 0,
      });
      setBailAmount('');
      setBailFine('');
      fetchSuspect();
      setBailSubmitting(false);
    } catch (err) {
      const msg = err.response?.data?.suspect?.[0]
        || err.response?.data?.amount?.[0]
        || err.response?.data?.error
        || err.response?.data?.detail
        || 'Failed to create bail';
      setError(Array.isArray(msg) ? msg[0] : msg);
      setBailSubmitting(false);
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
      released_on_bail: 'bg-green-100 text-green-800',
      cleared: 'bg-green-100 text-green-800',
      convicted: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading suspect details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Link
            to="/suspects"
           className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← Back to Suspects
          </Link>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-6">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Link */}
        <Link
          to="/suspects"
          className="text-blue-600 hover:text-blue-700 font-semibold"
        >
          ← Back to Suspects
        </Link>

        {/* Header */}
        <div className="mt-6 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              {suspect.full_name}
            </h1>
            <span
              className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(
                suspect.status
              )}`}
            >
              {suspect.status?.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
          {suspect.photo && (
            <img
              src={suspect.photo}
              alt={suspect.full_name}
              className="w-32 h-32 rounded-lg object-cover shadow"
            />
          )}
        </div>

        {/* Description */}
        {suspect.description && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-gray-700">{suspect.description}</p>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-semibold text-gray-600">ALIASES</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {suspect.aliases || 'None'}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-semibold text-gray-600">LAST KNOWN LOCATION</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {suspect.last_known_location || 'Unknown'}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-semibold text-gray-600">DAYS WANTED</p>
            <p className="text-lg font-bold text-orange-600 mt-1">
              {suspect.days_wanted || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-semibold text-gray-600">REWARD (RIALS)</p>
            <p className="text-lg font-bold text-green-600 mt-1">
              {suspect.reward_amount
                ? suspect.reward_amount.toLocaleString()
                : '0'}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-semibold text-gray-600">Wanted Score</p>
            <p className="text-lg font-bold text-red-600 mt-1">
              {suspect.most_wanted_rank
                ? `${suspect.most_wanted_rank}`
                : 'N/A'}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-semibold text-gray-600">MAX CRIME SEVERITY</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {suspect.max_crime_severity != null
                ? `Level ${suspect.max_crime_severity}`
                : 'N/A'}
            </p>
          </div>
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {suspect.wanted_since && (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-semibold text-gray-600">WANTED SINCE</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {new Date(suspect.wanted_since).toLocaleDateString()}
              </p>
            </div>
          )}
          {suspect.arrested_at ? (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-semibold text-gray-600">ARRESTED AT</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {new Date(suspect.arrested_at).toLocaleDateString()}
              </p>
            </div>
          ) : (
            isSergeant && suspect.status !== 'arrested' && (
              <button
                onClick={handleArrest}
                className="ml-4 bg-gray-900 text-white px-4 py-2 rounded"
              >
                Arrest
              </button>
            )
          )}
        </div>

        {/* Create Bail (Sergeant only) */}
        {isSergeant && (suspect.status === 'arrested' || suspect.status === 'convicted') && (
          <div className="bg-white rounded-lg shadow p-6 mt-6 border-2 border-blue-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Bail</h2>
            <form onSubmit={handleCreateBail} className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (Rials)</label>
                <input
                  type="number"
                  min="1"
                  value={bailAmount}
                  onChange={(e) => setBailAmount(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 w-40"
                  placeholder="e.g. 4000000"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Fine (Rials, optional)</label>
                <input
                  type="number"
                  min="0"
                  value={bailFine}
                  onChange={(e) => setBailFine(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 w-40"
                  placeholder="0"
                />
              </div>
              <button
                type="submit"
                disabled={bailSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded"
              >
                {bailSubmitting ? 'Creating...' : 'Create Bail'}
              </button>
            </form>
            <p className="text-sm text-gray-500 mt-2">
              Eligible: ARRESTED (crime level 2 or 3) or CONVICTED (level 3). One pending bail per suspect.
            </p>
          </div>
        )}

        {/* Guilt Scores */}
        {(suspect.detective_guilt_score != null ||
          suspect.sergeant_guilt_score != null) && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Guilt Scores
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-gray-600">
                  DETECTIVE SCORE
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {suspect.detective_guilt_score != null
                    ? `${suspect.detective_guilt_score} / 10`
                    : 'Not scored'}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">
                  SERGEANT SCORE
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {suspect.sergeant_guilt_score != null
                    ? `${suspect.sergeant_guilt_score} / 10`
                    : 'Not scored'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Captain / Chief Decisions */}
        {(suspect.captain_decision || suspect.chief_decision) && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Decisions
            </h2>
            <div className="space-y-4">
              {suspect.captain_decision && (
                <div>
                  <p className="text-sm font-semibold text-gray-600">
                    CAPTAIN DECISION
                  </p>
                  <p className="text-gray-700 mt-1">
                    {suspect.captain_decision}
                  </p>
                </div>
              )}
              {suspect.chief_decision && (
                <div>
                  <p className="text-sm font-semibold text-gray-600">
                    CHIEF DECISION
                  </p>
                  <p className="text-gray-700 mt-1">
                    {suspect.chief_decision}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Linked Cases */}
        <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Linked Cases
            </h2>
          </div>
          {suspect.case_links && suspect.case_links.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Case
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Added By
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {suspect.case_links.map((link) => (
                    <tr key={link.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm">
                        <Link
                          to={`/cases/${link.case}`}
                          className="text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          Case #{link.case}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {link.role || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {link.notes || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {link.added_by?.username || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {link.created_at
                          ? new Date(link.created_at).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-gray-600 text-lg">No linked cases.</p>
            </div>
          )}
        </div>

        {/* Interrogations */}
        <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Interrogations
            </h2>
          </div>
          {suspect.interrogations && suspect.interrogations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Case
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Conducted By
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Started
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Ended
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {suspect.interrogations.map((interr) => (
                    <tr key={interr.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                        #{interr.id}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          to={`/cases/${interr.case}`}
                          className="text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          Case #{interr.case}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {interr.conducted_by?.username || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {interr.location || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {interr.started_at
                          ? new Date(interr.started_at).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {interr.ended_at
                          ? new Date(interr.ended_at).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {interr.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-gray-600 text-lg">No interrogations recorded.</p>
            </div>
          )}
        </div>

        {/* Footer Timestamps */}
        <div className="mt-6 text-sm text-gray-500">
          <p>Created: {new Date(suspect.created_at).toLocaleString()}</p>
          <p>Updated: {new Date(suspect.updated_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default SuspectDetailPage;
