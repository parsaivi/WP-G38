import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import complaintService from '../services/complaintService';

const ComplaintDetailPage = () => {
  const { complaintId } = useParams();
  const { user } = useSelector((state) => state.auth);
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [returnMessage, setReturnMessage] = useState('');
  const [cadetUserId, setCadetUserId] = useState('');

  const userRoles = (user?.roles || []).map((r) => r.toLowerCase());
  const isCadet = userRoles.includes('cadet');
  const isOfficer = userRoles.includes('police officer');
  const isComplainant = userRoles.includes('complainant');
  const isAdmin = user?.is_staff;

  useEffect(() => {
    fetchComplaint();
  }, [complaintId]);

  const fetchComplaint = async () => {
    try {
      setLoading(true);
      const response = await complaintService.getComplaint(complaintId);
      setComplaint(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch complaint details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      cadet_review: 'bg-yellow-100 text-yellow-800',
      officer_review: 'bg-purple-100 text-purple-800',
      approved: 'bg-green-100 text-green-800',
      returned_to_complainant: 'bg-orange-100 text-orange-800',
      returned_to_cadet: 'bg-orange-100 text-orange-800',
      invalidated: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getSeverityLabel = (severity) => {
    const labels = {
      0: 'Critical',
      1: 'Level 1 - Severe',
      2: 'Level 2 - Major',
      3: 'Level 3 - Minor',
    };
    return labels[severity] ?? 'Unknown';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      0: 'bg-red-100 text-red-800',
      1: 'bg-orange-100 text-orange-800',
      2: 'bg-yellow-100 text-yellow-800',
      3: 'bg-green-100 text-green-800',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const handleAction = async (actionFn) => {
    try {
      setActionLoading(true);
      setActionError(null);
      await actionFn();
      setReturnMessage('');
      await fetchComplaint();
    } catch (err) {
      setActionError(err.response?.data?.error || err.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const formatUserName = (user) => {
    if (!user) return 'N/A';
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    return fullName || user.username;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading complaint details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/complaints"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            &larr; Back to Complaints
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/complaints"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            &larr; Back to Complaints
          </Link>
          <div className="flex items-center justify-between mt-4">
            <h1 className="text-4xl font-bold text-gray-900">
              #{complaint.id} — {complaint.title}
            </h1>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(
                complaint.status
              )}`}
            >
              {complaint.status?.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Last Rejection Message */}
        {complaint.last_rejection_message && (
          <div className="bg-yellow-50 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-6">
            <p className="font-semibold">Last Rejection Message</p>
            <p className="mt-1">{complaint.last_rejection_message}</p>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm font-medium text-gray-500">Severity</p>
            <span
              className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${getSeverityColor(
                complaint.crime_severity
              )}`}
            >
              {getSeverityLabel(complaint.crime_severity)}
            </span>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm font-medium text-gray-500">Location</p>
            <p className="mt-1 text-gray-900 font-semibold">
              {complaint.location || 'Not specified'}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm font-medium text-gray-500">Incident Date</p>
            <p className="mt-1 text-gray-900 font-semibold">
              {complaint.incident_date
                ? new Date(complaint.incident_date).toLocaleDateString()
                : 'Not specified'}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm font-medium text-gray-500">Rejection Count</p>
            <p className="mt-1 text-gray-900 font-semibold">
              {complaint.rejection_count ?? 0}
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{complaint.description}</p>
        </div>

        {/* People */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Created By */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Created By</h2>
            {complaint.created_by ? (
              <div>
                <p className="text-gray-900 font-semibold">
                  {formatUserName(complaint.created_by)}
                </p>
                <p className="text-sm text-gray-500">@{complaint.created_by.username}</p>
                {complaint.created_by.roles && complaint.created_by.roles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {complaint.created_by.roles.map((role, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800"
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

          {/* Assigned Cadet */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Assigned Cadet</h2>
            {complaint.assigned_cadet ? (
              <div>
                <p className="text-gray-900 font-semibold">
                  {formatUserName(complaint.assigned_cadet)}
                </p>
                <p className="text-sm text-gray-500">@{complaint.assigned_cadet.username}</p>
              </div>
            ) : (
              <p className="text-gray-500">Not assigned</p>
            )}
          </div>

          {/* Assigned Officer */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Assigned Officer</h2>
            {complaint.assigned_officer ? (
              <div>
                <p className="text-gray-900 font-semibold">
                  {formatUserName(complaint.assigned_officer)}
                </p>
                <p className="text-sm text-gray-500">@{complaint.assigned_officer.username}</p>
              </div>
            ) : (
              <p className="text-gray-500">Not assigned</p>
            )}
          </div>
        </div>

        {/* Complainants */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Complainants</h2>
          {complaint.complainants && complaint.complainants.length > 0 ? (
            <div className="space-y-3">
              {complaint.complainants.map((user, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                >
                  <div>
                    <p className="text-gray-900 font-semibold">{formatUserName(user)}</p>
                    <p className="text-sm text-gray-500">@{user.username}</p>
                  </div>
                  {user.roles && user.roles.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role, rIdx) => (
                        <span
                          key={rIdx}
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No complainants listed.</p>
          )}
        </div>

        {/* History Timeline */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">History</h2>
          {complaint.history && complaint.history.length > 0 ? (
            <div className="relative border-l-2 border-blue-200 ml-4">
              {complaint.history.map((entry, idx) => (
                <div key={idx} className="mb-6 ml-6 relative">
                  <span className="absolute -left-9 top-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-white"></span>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(
                            entry.from_status
                          )}`}
                        >
                          {entry.from_status?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className="text-gray-400">&rarr;</span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(
                            entry.to_status
                          )}`}
                        >
                          {entry.to_status?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {entry.created_at
                          ? new Date(entry.created_at).toLocaleString()
                          : ''}
                      </span>
                    </div>
                    {entry.changed_by && (
                      <p className="text-sm text-gray-600">
                        Changed by: <span className="font-semibold">{formatUserName(entry.changed_by)}</span>
                      </p>
                    )}
                    {entry.message && (
                      <p className="text-sm text-gray-700 mt-1">{entry.message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No history available.</p>
          )}
        </div>

        {/* Action Buttons */}
        {complaint && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Actions</h2>

            {actionError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {actionError}
              </div>
            )}

            {/* Complainant: Draft → Submit */}
            {isComplainant && complaint.status === 'draft' && (
              <button
                onClick={() => handleAction(() => complaintService.submitComplaint(complaintId))}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-semibold transition disabled:opacity-50"
              >
                {actionLoading ? 'Submitting...' : 'Submit Complaint'}
              </button>
            )}

            {/* Complainant: Returned → Resubmit */}
            {isComplainant && complaint.status === 'returned' && (
              <button
                onClick={() => handleAction(() => complaintService.resubmitComplaint(complaintId))}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-semibold transition disabled:opacity-50"
              >
                {actionLoading ? 'Resubmitting...' : 'Resubmit Complaint'}
              </button>
            )}

            {/* Officer/Admin: submitted → Assign Cadet */}
            {(isOfficer || isAdmin) && complaint.status === 'submitted' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Assign to Cadet (User ID)
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={cadetUserId}
                    onChange={(e) => setCadetUserId(e.target.value)}
                    placeholder="Cadet user ID"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() =>
                      handleAction(() =>
                        complaintService.assignToCadet(complaintId, { target_user_id: parseInt(cadetUserId) })
                      )
                    }
                    disabled={actionLoading || !cadetUserId}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {actionLoading ? 'Assigning...' : 'Assign Cadet'}
                  </button>
                </div>
              </div>
            )}

            {/* Cadet: cadet_review OR returned_to_cadet → Escalate or Return to Complainant */}
            {isCadet && (complaint.status === 'cadet_review' || complaint.status === 'returned_to_cadet') && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction(() => complaintService.escalateToOfficer(complaintId))}
                    disabled={actionLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {actionLoading ? 'Escalating...' : 'Escalate to Officer'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Return Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={returnMessage}
                    onChange={(e) => setReturnMessage(e.target.value)}
                    placeholder="Enter reason for returning to complainant (required)..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    rows={3}
                  />
                  <button
                    onClick={() =>
                      handleAction(() =>
                        complaintService.returnToComplainant(complaintId, { message: returnMessage })
                      )
                    }
                    disabled={actionLoading || !returnMessage.trim()}
                    className="mt-2 bg-orange-500 hover:bg-orange-600 text-white py-2 px-6 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {actionLoading ? 'Returning...' : 'Return to Complainant'}
                  </button>
                </div>
              </div>
            )}

            {/* Officer: officer_review → Approve (create case), Return to Cadet, Reject */}
            {isOfficer && complaint.status === 'officer_review' && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction(() => complaintService.approveComplaint(complaintId))}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {actionLoading ? 'Approving...' : 'Approve & Create Case'}
                  </button>
                  <button
                    onClick={() =>
                      handleAction(() =>
                        complaintService.rejectComplaint(complaintId, { message: returnMessage })
                      )
                    }
                    disabled={actionLoading}
                    className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {actionLoading ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Return Reason
                  </label>
                  <textarea
                    value={returnMessage}
                    onChange={(e) => setReturnMessage(e.target.value)}
                    placeholder="Enter reason for returning to cadet..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    rows={3}
                  />
                  <button
                    onClick={() =>
                      handleAction(() =>
                        complaintService.returnToCadet(complaintId, { message: returnMessage })
                      )
                    }
                    disabled={actionLoading || !returnMessage.trim()}
                    className="mt-2 bg-orange-500 hover:bg-orange-600 text-white py-2 px-6 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {actionLoading ? 'Returning...' : 'Return to Cadet'}
                  </button>
                </div>
              </div>
            )}

            {/* No actions available */}
            {!(
              (isComplainant && (complaint.status === 'draft' || complaint.status === 'returned')) ||
              ((isOfficer || isAdmin) && complaint.status === 'submitted') ||
              (isCadet && (complaint.status === 'cadet_review' || complaint.status === 'returned_to_cadet')) ||
              (isOfficer && complaint.status === 'officer_review')
            ) && (
              <p className="text-gray-500">No actions available for your role on this complaint.</p>
            )}
          </div>
        )}

        {/* Timestamps */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between text-sm text-gray-500">
            <span>
              Created: {complaint.created_at ? new Date(complaint.created_at).toLocaleString() : 'N/A'}
            </span>
            <span>
              Updated: {complaint.updated_at ? new Date(complaint.updated_at).toLocaleString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetailPage;
