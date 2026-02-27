import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import evidenceService from '../services/evidenceService';

const EvidenceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [evidence, setEvidence] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('details');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationAction, setVerificationAction] = useState(null);

  useEffect(() => {
    fetchEvidenceDetails();
  }, [id]);

  const fetchEvidenceDetails = async () => {
    try {
      setLoading(true);
      // Use getEvidenceById from your service
      const response = await evidenceService.getEvidenceById(id);
      setEvidence(response.data);

      // Fetch attachments - you'll need to add this method to your service
      // For now, we'll assume there's a way to get attachments
      try {
        // You might need to create this method in evidenceService
        const attachmentsResponse = await evidenceService.getAttachments(id);
        setAttachments(attachmentsResponse.data || []);
      } catch (err) {
        // If the endpoint doesn't exist yet, just set empty array
        setAttachments([]);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch evidence details');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Determine attachment type based on file MIME type
    let attachmentType = 'document';
    if (file.type.startsWith('image/')) {
      attachmentType = 'image';
    } else if (file.type.startsWith('audio/')) {
      attachmentType = 'audio';
    } else if (file.type.startsWith('video/')) {
      attachmentType = 'video';
    }

    const description = prompt('Enter a description for this file:', file.name) || file.name;

    setUploadLoading(true);
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Use uploadAttachment from your service
      await evidenceService.uploadAttachment(id, file, attachmentType, description);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Refresh attachments - you'll need to implement getAttachments
      try {
        const attachmentsResponse = await evidenceService.getAttachments(id);
        setAttachments(attachmentsResponse.data || []);
      } catch (err) {
        // If we can't fetch attachments, at least show success
        console.log('Upload successful');
      }
      
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload file');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleVerifyEvidence = async () => {
    if (!verificationAction) return;
    
    try {
      await evidenceService.verifyEvidence(id, {
        status: verificationAction,
        notes: verificationNotes
      });
      
      // Refresh evidence data
      const response = await evidenceService.getEvidenceById(id);
      setEvidence(response.data);
      
      setShowVerificationModal(false);
      setVerificationNotes('');
      setVerificationAction(null);
    } catch (err) {
      alert('Failed to update evidence status');
    }
  };

  const handleAddLabResult = async () => {
    const labResult = prompt('Enter lab analysis result:');
    if (!labResult) return;
    
    try {
      await evidenceService.addLabResult(id, { lab_result: labResult });
      
      // Refresh evidence data
      const response = await evidenceService.getEvidenceById(id);
      setEvidence(response.data);
    } catch (err) {
      alert('Failed to add lab result');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      processing: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type) => {
    const icons = {
      testimony: '🎙️',
      biological: '🧬',
      vehicle: '🚗',
      id_document: '🆔',
      other: '📦',
    };
    return icons[type] || '📄';
  };

  const getAttachmentIcon = (type) => {
    const icons = {
      image: '🖼️',
      audio: '🎵',
      video: '🎥',
      document: '📄',
    };
    return icons[type] || '📎';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading evidence details...</p>
        </div>
      </div>
    );
  }

  if (error || !evidence) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error || 'Evidence not found'}
          </div>
          <button
            onClick={() => navigate('/evidence')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
          >
            Back to Evidence List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with back button */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/evidence')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Evidence List
          </button>
          
          {/* Action Buttons based on evidence type and status */}
          <div className="flex space-x-3">
            {evidence.evidence_type === 'biological' && (
              <button
                onClick={handleAddLabResult}
                className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-semibold"
              >
                Add Lab Result
              </button>
            )}
            {evidence.status === 'pending' && (
              <>
                <button
                  onClick={() => {
                    setVerificationAction('verified');
                    setShowVerificationModal(true);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-semibold"
                >
                  Verify Evidence
                </button>
                <button
                  onClick={() => {
                    setVerificationAction('rejected');
                    setShowVerificationModal(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-semibold"
                >
                  Reject
                </button>
              </>
            )}
          </div>
        </div>

        {/* Verification Modal */}
        {showVerificationModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-lg bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {verificationAction === 'verified' ? 'Verify Evidence' : 'Reject Evidence'}
              </h3>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Add notes (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
                rows="3"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowVerificationModal(false);
                    setVerificationNotes('');
                    setVerificationAction(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyEvidence}
                  className={`px-4 py-2 text-white rounded-lg ${
                    verificationAction === 'verified' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Evidence Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-4xl">{getTypeIcon(evidence.evidence_type)}</span>
                  <h1 className="text-3xl font-bold text-white">{evidence.title}</h1>
                </div>
                <p className="text-blue-100">
                  Evidence #{evidence.id} • Case #{evidence.case}
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(evidence.status)}`}>
                  {evidence.status?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b px-8">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('attachments')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'attachments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Attachments
                {attachments.length > 0 && (
                  <span className="ml-2 bg-gray-200 text-gray-700 py-0.5 px-2 rounded-full text-xs">
                    {attachments.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Evidence Type</h3>
                    <p className="text-lg text-gray-900">
                      {evidence.evidence_type?.replace(/_/g, ' ').toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Collection Date</h3>
                    <p className="text-lg text-gray-900">
                      {evidence.collection_date 
                        ? new Date(evidence.collection_date).toLocaleString()
                        : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Collected By</h3>
                    <p className="text-lg text-gray-900">
                      {evidence.collected_by || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Location Found</h3>
                    <p className="text-lg text-gray-900">
                      {evidence.location_found || 'Not specified'}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                  <p className="text-gray-900 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                    {evidence.description || 'No description provided'}
                  </p>
                </div>

                {/* Type-specific metadata */}
                {evidence.metadata && Object.keys(evidence.metadata).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Additional Details</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <dl className="grid grid-cols-2 gap-4">
                        {Object.entries(evidence.metadata).map(([key, value]) => (
                          <div key={key}>
                            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {key.replace(/_/g, ' ')}
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">{value || '-'}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                )}

                {/* Lab Results (for biological evidence) */}
                {evidence.evidence_type === 'biological' && evidence.lab_result && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Lab Results</h3>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-gray-900 whitespace-pre-wrap">{evidence.lab_result}</p>
                      {evidence.verified_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          Verified by {evidence.verified_by || 'Unknown'} on{' '}
                          {new Date(evidence.verified_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Verification Info */}
                {evidence.verified_at && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Verification</h3>
                    <p className="text-sm text-gray-600">
                      Verified by {evidence.verified_by || 'Unknown'} on{' '}
                      {new Date(evidence.verified_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Attachments Tab */}
            {activeTab === 'attachments' && (
              <div>
                {/* Upload Section */}
                <div className="mb-8 p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition">
                  <label className="block text-center cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploadLoading}
                      className="hidden"
                    />
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600">
                      {uploadLoading ? 'Uploading...' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Images, Audio, Video, Documents (Max 10MB)
                    </p>
                  </label>

                  {/* Upload Progress */}
                  {uploadLoading && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Attachments List */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Attachments ({attachments.length})
                  </h3>
                  
                  {attachments.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">No attachments yet</p>
                      <p className="text-xs text-gray-400 mt-1">Upload files using the area above</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                        >
                          <div className="flex items-center flex-1 min-w-0">
                            <span className="text-2xl mr-3">
                              {getAttachmentIcon(attachment.attachment_type)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {attachment.description || attachment.file_name || 'Unnamed file'}
                              </p>
                              <div className="flex items-center text-xs text-gray-500 space-x-2">
                                <span>{formatFileSize(attachment.file_size)}</span>
                                <span>•</span>
                                <span>{attachment.attachment_type}</span>
                                {attachment.uploaded_at && (
                                  <>
                                    <span>•</span>
                                    <span>Uploaded {new Date(attachment.uploaded_at).toLocaleDateString()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {attachment.file && (
                              <a
                                href={attachment.file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full"
                                title="Download/View"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </a>
                            )}
                            {/* Delete functionality - you'll need to implement this in your service */}
                            <button
                              onClick={() => {
                                if (window.confirm('Delete this attachment?')) {
                                  // Implement deleteAttachment in your service
                                  alert('Delete functionality needs to be implemented in evidenceService');
                                }
                              }}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvidenceDetailPage;
