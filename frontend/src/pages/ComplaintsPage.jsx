import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import complaintService from '../services/complaintService';

const ComplaintsPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchComplaints();
  }, [filterStatus, page]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: 10,
      };
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      const response = await complaintService.getComplaints(params);
      setComplaints(response.data.results || response.data || []);
      const total = response.data.count || 0;
      setTotalPages(Math.ceil(total / 10));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch complaints');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading complaints...</p>
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
            <h1 className="text-4xl font-bold text-gray-900">Complaints</h1>
            <p className="text-gray-600 mt-2">Total: {complaints.length} complaints</p>
          </div>
          <Link
            to="/complaints/new"
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition"
          >
            File Complaint
          </Link>
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
              <option value="all">All Complaints</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="cadet_review">Cadet Review</option>
              <option value="officer_review">Officer Review</option>
              <option value="approved">Approved</option>
              <option value="returned">Returned to Complainant</option>
              <option value="returned_to_cadet">Returned to Cadet</option>
              <option value="rejected">Rejected</option>
              <option value="invalidated">Invalidated</option>
            </select>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {complaints.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 text-lg">No complaints found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Submitted Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {complaints.map((complaint) => (
                    <tr key={complaint.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                        #{complaint.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {complaint.title || 'No subject'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(
                            complaint.status
                          )}`}
                        >
                          {complaint.status?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {complaint.created_at
                          ? new Date(complaint.created_at).toLocaleDateString()
                          : 'Not submitted'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          to={`/complaints/${complaint.id}`}
                          className="text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          View Details
                        </Link>
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

export default ComplaintsPage;
