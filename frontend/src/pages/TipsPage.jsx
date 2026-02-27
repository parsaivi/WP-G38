import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import rewardsService from '../services/rewardsService';

const TABS = { my: 'my', officer: 'officer', detective: 'detective' };

const tipStatusLabel = (status) => {
  const map = {
    submitted: 'Submitted',
    officer_review: 'Under Officer Review',
    officer_rejected: 'Rejected by Officer',
    detective_review: 'Under Detective Review',
    detective_rejected: 'Rejected by Detective',
    approved: 'Approved',
    reward_claimed: 'Reward Claimed',
  };
  return map[status] || (status || '').replace(/_/g, ' ');
};

const tipStatusColor = (status) => {
  const colors = {
    submitted: 'bg-blue-100 text-blue-800',
    officer_review: 'bg-yellow-100 text-yellow-800',
    officer_rejected: 'bg-red-100 text-red-800',
    detective_review: 'bg-purple-100 text-purple-800',
    detective_rejected: 'bg-red-100 text-red-800',
    approved: 'bg-green-100 text-green-800',
    reward_claimed: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const TipsPage = () => {
  const [searchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth);
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reviewParam = searchParams.get('review');
  const initialTab = reviewParam === 'officer' ? TABS.officer : reviewParam === 'detective' ? TABS.detective : TABS.my;
  const [activeTab, setActiveTab] = useState(initialTab);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionError, setActionError] = useState(null);

  const userRoles = (user?.roles || user?.groups || []).map((r) => String(r).toLowerCase());
  const isOfficer = [
    'police officer',
    'patrol officer',
    'chief',
    'captain',
    'sergeant',
    'administrator',
  ].some((r) => userRoles.includes(r));
  const isDetective = userRoles.includes('detective') || userRoles.includes('administrator');

  useEffect(() => {
    fetchTips();
  }, []);

  const fetchTips = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await rewardsService.getTips();
      setTips(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load tips.');
    } finally {
      setLoading(false);
    }
  };

  const myTips = tips.filter((t) => t.submitted_by?.id === user?.id);
  const officerReviewTips = tips.filter(
    (t) => (t.status === 'submitted' || t.status === 'officer_review') && t.submitted_by?.id !== user?.id
  );
  const detectiveReviewTips = tips.filter((t) => t.status === 'detective_review');

  const handleOfficerReview = async (tipId, approved) => {
    setActionError(null);
    try {
      await rewardsService.officerReview(tipId, { approved, notes: reviewNotes });
      setReviewingId(null);
      setReviewNotes('');
      fetchTips();
    } catch (err) {
      setActionError(err.response?.data?.error || err.response?.data?.detail || 'Action failed.');
    }
  };

  const handleDetectiveReview = async (tipId, approved) => {
    setActionError(null);
    try {
      await rewardsService.detectiveReview(tipId, { approved, notes: reviewNotes });
      setReviewingId(null);
      setReviewNotes('');
      fetchTips();
    } catch (err) {
      setActionError(err.response?.data?.error || err.response?.data?.detail || 'Action failed.');
    }
  };

  const openReviewModal = (tip) => {
    setReviewingId(tip.id);
    setReviewNotes('');
    setActionError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading tips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Tips &amp; Rewards</h1>
            <p className="text-gray-600 mt-2">Submit or review information about cases and suspects.</p>
          </div>
<div className="flex gap-3">
  <Link
    to="/tips/new"
    className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition"
  >
    Submit New Tip
  </Link>

  {isOfficer && (
    <Link
      to="/reward-lookup"
      className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition"
    >
      Check Reward Code
    </Link>
  )}
</div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab(TABS.my)}
            className={`px-4 py-2 font-semibold rounded-t transition ${
              activeTab === TABS.my ? 'bg-white border border-b-0 border-gray-200 text-blue-600' : 'text-gray-600'
            }`}
          >
            My Tips
          </button>
          {isOfficer && (
            <button
              type="button"
              onClick={() => setActiveTab(TABS.officer)}
              className={`px-4 py-2 font-semibold rounded-t transition ${
                activeTab === TABS.officer ? 'bg-white border border-b-0 border-gray-200 text-blue-600' : 'text-gray-600'
              }`}
            >
              Officer Review {officerReviewTips.length ? `(${officerReviewTips.length})` : ''}
            </button>
          )}
          {isDetective && (
            <button
              type="button"
              onClick={() => setActiveTab(TABS.detective)}
              className={`px-4 py-2 font-semibold rounded-t transition ${
                activeTab === TABS.detective ? 'bg-white border border-b-0 border-gray-200 text-blue-600' : 'text-gray-600'
              }`}
            >
              Detective Review {detectiveReviewTips.length ? `(${detectiveReviewTips.length})` : ''}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {activeTab === TABS.my && (
            <>
              {myTips.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-600 text-lg">You have not submitted any tips.</p>
                  <Link to="/tips/new" className="mt-4 inline-block text-blue-600 font-semibold">
                    Submit your first tip
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Title</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Reward Code</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {myTips.map((tip) => (
                        <tr key={tip.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-semibold">
                            <Link to={`/tips/${tip.id}`} className="text-blue-600 hover:text-blue-700">#{tip.id}</Link>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            <Link to={`/tips/${tip.id}`} className="hover:underline">{tip.title}</Link>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${tipStatusColor(tip.status)}`}>
                              {tipStatusLabel(tip.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {tip.reward_code ? (
                              <span className="font-mono font-bold text-green-700" title="Use this code with your National ID at the police department to receive your reward.">
                                {tip.reward_code.code}
                              </span>
                            ) : (
                              '—'
                            )}
                            {tip.reward_code && (
                              <p className="text-xs text-gray-500 mt-1">Bring this code + National ID to claim reward.</p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {tip.created_at ? new Date(tip.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <Link to={`/tips/${tip.id}`} className="text-blue-600 hover:text-blue-700 font-semibold">
                              View details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === TABS.officer && (
            <>
              {officerReviewTips.length === 0 ? (
                <div className="p-12 text-center text-gray-600">No tips pending officer review.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Title</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Case / Suspect</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {officerReviewTips.map((tip) => (
                        <tr key={tip.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-semibold">
                            <Link to={`/tips/${tip.id}`} className="text-blue-600 hover:text-blue-700">#{tip.id}</Link>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            <Link to={`/tips/${tip.id}`} className="hover:underline">{tip.title}</Link>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {tip.case && `Case #${tip.case}`}
                            {tip.case && tip.suspect && ' · '}
                            {tip.suspect && `Suspect #${tip.suspect}`}
                            {!tip.case && !tip.suspect && '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${tipStatusColor(tip.status)}`}>
                              {tipStatusLabel(tip.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {reviewingId === tip.id ? (
                              <div className="space-y-2">
                                <textarea
                                  placeholder="Notes (optional)"
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                  rows={2}
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOfficerReview(tip.id, true)}
                                    className="px-3 py-1 bg-green-600 text-white rounded text-sm font-semibold"
                                  >
                                    Forward to Detective
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOfficerReview(tip.id, false)}
                                    className="px-3 py-1 bg-red-600 text-white rounded text-sm font-semibold"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setReviewingId(null); setReviewNotes(''); setActionError(null); }}
                                    className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                {actionError && <p className="text-red-600 text-xs">{actionError}</p>}
                              </div>
                            ) : (
                              <span className="flex gap-2">
                                <Link to={`/tips/${tip.id}`} className="text-blue-600 hover:text-blue-700 font-semibold">
                                  View
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => openReviewModal(tip)}
                                  className="text-green-600 hover:text-green-700 font-semibold"
                                >
                                  Review
                                </button>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === TABS.detective && (
            <>
              {detectiveReviewTips.length === 0 ? (
                <div className="p-12 text-center text-gray-600">No tips pending detective review.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Title</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Case / Suspect</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {detectiveReviewTips.map((tip) => (
                        <tr key={tip.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-semibold">
                            <Link to={`/tips/${tip.id}`} className="text-blue-600 hover:text-blue-700">#{tip.id}</Link>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            <Link to={`/tips/${tip.id}`} className="hover:underline">{tip.title}</Link>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {tip.case && `Case #${tip.case}`}
                            {tip.case && tip.suspect && ' · '}
                            {tip.suspect && `Suspect #${tip.suspect}`}
                            {!tip.case && !tip.suspect && '—'}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {reviewingId === tip.id ? (
                              <div className="space-y-2">
                                <textarea
                                  placeholder="Notes (optional)"
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                  rows={2}
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleDetectiveReview(tip.id, true)}
                                    className="px-3 py-1 bg-green-600 text-white rounded text-sm font-semibold"
                                  >
                                    Approve (generate reward code)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDetectiveReview(tip.id, false)}
                                    className="px-3 py-1 bg-red-600 text-white rounded text-sm font-semibold"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setReviewingId(null); setReviewNotes(''); setActionError(null); }}
                                    className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                {actionError && <p className="text-red-600 text-xs">{actionError}</p>}
                              </div>
                            ) : (
                              <span className="flex gap-2">
                                <Link to={`/tips/${tip.id}`} className="text-blue-600 hover:text-blue-700 font-semibold">
                                  View
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => openReviewModal(tip)}
                                  className="text-green-600 hover:text-green-700 font-semibold"
                                >
                                  Review
                                </button>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TipsPage;
