import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import rewardsService from '../services/rewardsService';

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

const formatUserName = (u) => {
  if (!u) return 'N/A';
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
  return name || u.username || 'N/A';
};

const TipDetailPage = () => {
  const { tipId } = useParams();
  const { user } = useSelector((state) => state.auth);
  const [tip, setTip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [pendingAction, setPendingAction] = useState(null); // 'officer' | 'detective'
  const [showRejectNotes, setShowRejectNotes] = useState(false);

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
  const isPolice = isOfficer || isDetective;
  const isSubmitter = tip?.submitted_by?.id === user?.id;

  const caseId = tip?.case != null ? (typeof tip.case === 'object' ? tip.case?.id : tip.case) : null;
  const suspectId = tip?.suspect != null ? (typeof tip.suspect === 'object' ? tip.suspect?.id : tip.suspect) : null;

  const canOfficerReview =
    isOfficer &&
    tip &&
    !isSubmitter &&
    (tip.status === 'submitted' || tip.status === 'officer_review') &&
    !tip.reviewed_by_officer;

  const canDetectiveReview =
    isDetective && 
    tip && 
    tip.status === 'detective_review' &&
    !tip.reviewed_by_detective;

  useEffect(() => {
    fetchTip();
  }, [tipId]);

  const fetchTip = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await rewardsService.getTip(tipId);
      setTip(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load tip.');
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (actionFn) => {
    try {
      setActionLoading(true);
      setActionError(null);
      await actionFn();
      setPendingAction(null);
      setReviewNotes('');
      setShowRejectNotes(false);
      await fetchTip();
    } catch (err) {
      setActionError(err.response?.data?.error || err.response?.data?.detail || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOfficerApprove = () => {
    if (!reviewNotes.trim() && showRejectNotes) {
      setActionError('Please provide notes for rejection.');
      return;
    }
    runAction(() => 
      rewardsService.officerReview(tip.id, { 
        approved: true, 
        notes: reviewNotes || null 
      })
    );
  };

  const handleOfficerReject = () => {
    if (!reviewNotes.trim()) {
      setActionError('Please provide notes explaining the rejection.');
      return;
    }
    runAction(() => 
      rewardsService.officerReview(tip.id, { 
        approved: false, 
        notes: reviewNotes 
      })
    );
  };

  const handleDetectiveApprove = () => {
    runAction(() => 
      rewardsService.detectiveReview(tip.id, { 
        approved: true, 
        notes: reviewNotes || null 
      })
    );
  };

  const handleDetectiveReject = () => {
    if (!reviewNotes.trim()) {
      setActionError('Please provide notes explaining the rejection.');
      return;
    }
    runAction(() => 
      rewardsService.detectiveReview(tip.id, { 
        approved: false, 
        notes: reviewNotes 
      })
    );
  };

  const resetAction = () => {
    setPendingAction(null);
    setReviewNotes('');
    setShowRejectNotes(false);
    setActionError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading tip...</p>
        </div>
      </div>
    );
  }

  if (error || !tip) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <Link to="/tips" className="text-blue-600 hover:text-blue-700 font-semibold">
            &larr; Back to Tips
          </Link>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-6">
            {error || 'Tip not found.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/tips" className="text-blue-600 hover:text-blue-700 font-semibold">
            &larr; Back to Tips
          </Link>
          <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
            <h1 className="text-4xl font-bold text-gray-900">
              #{tip.id} — {tip.title}
            </h1>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${tipStatusColor(tip.status)}`}>
              {tipStatusLabel(tip.status)}
            </span>
          </div>
          <p className="text-gray-500 mt-2">
            Submitted {tip.created_at ? new Date(tip.created_at).toLocaleString() : '—'}
          </p>
        </div>

        {actionError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {actionError}
          </div>
        )}

        {/* Description */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{tip.description || '—'}</p>
        </div>

        {/* Related case / suspect */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Related</h2>
          <div className="flex flex-wrap gap-4">
            {caseId && (
              <Link
                to={`/cases/${caseId}`}
                className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold hover:bg-blue-200"
              >
                Case #{caseId}
              </Link>
            )}
            {suspectId && (
              <Link
                to={`/suspects/${suspectId}`}
                className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-800 rounded-lg font-semibold hover:bg-purple-200"
              >
                Suspect #{suspectId}
              </Link>
            )}
            {!caseId && !suspectId && <p className="text-gray-500">No case or suspect linked.</p>}
          </div>
        </div>

        {/* Submitted by */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Submitted by</h2>
          {tip.submitted_by ? (
            <div>
              <p className="text-gray-900 font-semibold">{formatUserName(tip.submitted_by)}</p>
              <p className="text-sm text-gray-500">@{tip.submitted_by.username}</p>
              {tip.submitted_by.roles?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tip.submitted_by.roles.map((role, idx) => (
                    <span
                      key={idx}
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">N/A</p>
          )}
        </div>

        {/* Officer review */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Officer review</h2>
          {tip.reviewed_by_officer ? (
            <div>
              <p className="text-gray-900 font-semibold">{formatUserName(tip.reviewed_by_officer)}</p>
              <p className="text-sm text-gray-500">
                {tip.officer_review_date
                  ? new Date(tip.officer_review_date).toLocaleString()
                  : '—'}
              </p>
              {tip.officer_notes && (
                <p className="mt-2 text-gray-700 bg-gray-50 p-3 rounded">{tip.officer_notes}</p>
              )}
              {tip.status === 'officer_rejected' && (
                <p className="mt-2 text-red-600 font-semibold">This tip was rejected by officer</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Not yet reviewed by an officer.</p>
          )}
        </div>

        {/* Detective review */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Detective review</h2>
          {tip.reviewed_by_detective ? (
            <div>
              <p className="text-gray-900 font-semibold">{formatUserName(tip.reviewed_by_detective)}</p>
              <p className="text-sm text-gray-500">
                {tip.detective_review_date
                  ? new Date(tip.detective_review_date).toLocaleString()
                  : '—'}
              </p>
              {tip.detective_notes && (
                <p className="mt-2 text-gray-700 bg-gray-50 p-3 rounded">{tip.detective_notes}</p>
              )}
              {tip.status === 'detective_rejected' && (
                <p className="mt-2 text-red-600 font-semibold">This tip was rejected by detective</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Not yet reviewed by a detective.</p>
          )}
        </div>

        {/* Reward code (when approved) */}
        {tip.reward_code && (
          <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-green-200">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Reward</h2>
            <p className="text-gray-700">
              <span className="font-semibold">Code:</span>{' '}
              <span className="font-mono text-lg font-bold text-green-700">{tip.reward_code.code}</span>
            </p>
            <p className="text-gray-700 mt-1">
              <span className="font-semibold">Amount:</span>{' '}
              {(tip.reward_code.amount ?? 0).toLocaleString()} Rials
            </p>
            {tip.reward_code.is_claimed ? (
              <p className="mt-2 text-amber-700 font-semibold">This reward has been claimed.</p>
            ) : (
              <p className="mt-2 text-gray-600 text-sm">
                Bring this code and your National ID to the police department to receive the reward.
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Actions</h2>

          {canOfficerReview && (
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600">Initial review: forward to detective or reject.</p>
              {pendingAction === 'officer' ? (
                <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                  <div className="flex gap-4 mb-3">
                    <button
                      type="button"
                      onClick={() => setShowRejectNotes(false)}
                      className={`px-4 py-2 rounded-lg font-semibold ${
                        !showRejectNotes 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRejectNotes(true)}
                      className={`px-4 py-2 rounded-lg font-semibold ${
                        showRejectNotes 
                          ? 'bg-red-600 text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Reject
                    </button>
                  </div>

                  <textarea
                    placeholder={showRejectNotes 
                      ? "Please provide reason for rejection (required)..." 
                      : "Notes (optional)"}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    rows={3}
                    required={showRejectNotes}
                  />
                  
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={showRejectNotes ? handleOfficerReject : handleOfficerApprove}
                      className={`px-4 py-2 text-white rounded-lg font-semibold disabled:opacity-50 ${
                        showRejectNotes 
                          ? 'bg-red-600 hover:bg-red-700' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {actionLoading ? 'Processing...' : (showRejectNotes ? 'Reject Tip' : 'Forward to Detective')}
                    </button>
                    <button
                      type="button"
                      onClick={resetAction}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPendingAction('officer')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Review (Forward or Reject)
                </button>
              )}
            </div>
          )}

          {canDetectiveReview && (
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600">Approve to generate reward code, or reject.</p>
              {pendingAction === 'detective' ? (
                <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                  <div className="flex gap-4 mb-3">
                    <button
                      type="button"
                      onClick={() => setShowRejectNotes(false)}
                      className={`px-4 py-2 rounded-lg font-semibold ${
                        !showRejectNotes 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRejectNotes(true)}
                      className={`px-4 py-2 rounded-lg font-semibold ${
                        showRejectNotes 
                          ? 'bg-red-600 text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Reject
                    </button>
                  </div>

                  <textarea
                    placeholder={showRejectNotes 
                      ? "Please provide reason for rejection (required)..." 
                      : "Notes (optional)"}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    rows={3}
                    required={showRejectNotes}
                  />
                  
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={showRejectNotes ? handleDetectiveReject : handleDetectiveApprove}
                      className={`px-4 py-2 text-white rounded-lg font-semibold disabled:opacity-50 ${
                        showRejectNotes 
                          ? 'bg-red-600 hover:bg-red-700' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {actionLoading ? 'Processing...' : (showRejectNotes ? 'Reject Tip' : 'Approve & Generate Reward')}
                    </button>
                    <button
                      type="button"
                      onClick={resetAction}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPendingAction('detective')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Review (Approve or Reject)
                </button>
              )}
            </div>
          )}

          {!canOfficerReview && !canDetectiveReview && (
            <p className="text-gray-500">No actions available for your role on this tip.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TipDetailPage;