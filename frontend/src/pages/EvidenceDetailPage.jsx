import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import evidenceService from '../services/evidenceService';

const EvidenceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const userRoles = (user?.roles || user?.groups || []).map(r => r.toLowerCase());
  
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
  
  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [attachmentDescription, setAttachmentDescription] = useState('');
  const [attachmentType, setAttachmentType] = useState('document');

  // Role checks
  const isCoroner = userRoles.includes('coroner') || userRoles.includes('coronary');
  const isDetective = userRoles.includes('detective');
  const isSergeant = userRoles.includes('sergeant');
  const isCaptain = userRoles.includes('captain');
  const isOfficer = userRoles.includes('police officer');
  const isStaff = user?.is_staff || false;

  // Combined permission checks
  const canVerifyEvidence = isCoroner || isSergeant || isCaptain || isStaff || isOfficer;
  const canAddLabResults = isCoroner || isStaff;
  const canUploadAttachments = isDetective || isSergeant || isCaptain || isStaff;

  useEffect(() => {
    fetchEvidenceDetails();
  }, [id]);

  const fetchEvidenceDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching evidence with ID:', id);
      const response = await evidenceService.getEvidenceById(id);
      console.log('Evidence response:', response.data);
      setEvidence(response.data);

      // Fetch attachments
      try {
        console.log('Fetching attachments for evidence:', id);
        const attachmentsResponse = await evidenceService.getAttachments(id);
        console.log('Attachments response:', attachmentsResponse.data);
        setAttachments(attachmentsResponse.data || []);
      } catch (err) {
        console.error('Error fetching attachments:', err);
        setAttachments([]);
      }
    } catch (err) {
      console.error('Failed to fetch evidence details:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch evidence details');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    
    // Auto-detect attachment type
    if (file.type.startsWith('image/')) {
      setAttachmentType('image');
    } else if (file.type.startsWith('audio/')) {
      setAttachmentType('audio');
    } else if (file.type.startsWith('video/')) {
      setAttachmentType('video');
    } else {
      setAttachmentType('document');
    }
    
    // Set default description to filename without extension
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    setAttachmentDescription(fileNameWithoutExt);
    
    setShowUploadModal(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadLoading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      console.log('Uploading file:', {
        id,
        file: selectedFile.name,
        type: attachmentType,
        description: attachmentDescription
      });

      await evidenceService.uploadAttachment(id, selectedFile, attachmentType, attachmentDescription);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Refresh attachments
      const attachmentsResponse = await evidenceService.getAttachments(id);
      setAttachments(attachmentsResponse.data || []);
      
      // Close modal after success
      setTimeout(() => {
        setShowUploadModal(false);
        setSelectedFile(null);
        setAttachmentDescription('');
        setAttachmentType('document');
        setUploadProgress(0);
      }, 1000);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to upload file');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      // If the file URL is already a full URL, open it directly
      if (attachment.file && attachment.file.startsWith('http')) {
        window.open(attachment.file, '_blank');
        return;
      }
      
      // Otherwise, try to construct the URL
      // This assumes your files are served from the media URL
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
      const fileUrl = attachment.file?.startsWith('/') 
        ? `${baseUrl}${attachment.file}`
        : `${baseUrl}/media/${attachment.file}`;
      
      window.open(fileUrl, '_blank');
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download attachment');
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    
    try {
      // You'll need to add this method to your service
      // await evidenceService.deleteAttachment(attachmentId);
      
      // For now, just filter it out locally
      setAttachments(attachments.filter(a => a.id !== attachmentId));
      alert('Delete functionality needs to be implemented in evidenceService');
    } catch (err) {
      console.error('Failed to delete attachment:', err);
      alert('Failed to delete attachment');
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

  // Helper function to get user display name
  const getUserDisplayName = (user) => {
    if (!user) return 'Unknown';
    if (typeof user === 'string') return user;
    if (typeof user === 'object') {
      return user.first_name && user.last_name 
        ? `${user.first_name} ${user.last_name}`
        : user.username || user.email || 'Unknown';
    }
    return 'Unknown';
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
            <p className="font-bold">Error</p>
            <p>{error || 'Evidence not found'}</p>
            <p className="text-sm mt-2">Evidence ID: {id}</p>
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
          
          {/* Action Buttons based on evidence type and user roles */}
          <div className="flex space-x-3">
            {/* Verify/Reject - Only for Coroner (biological) or Sergeants/Captains/Staff (other evidence) */}
            {evidence.status === 'pending' && (
              <>
                {/* For biological evidence, only coroner can verify */}
                {evidence.evidence_type === 'biological' ? (
                  isCoroner && (
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
                  )
                ) : (
                  /* For non-biological evidence, sergeants/captains/staff can verify */
                  (isSergeant || isCaptain || isStaff || isOfficer) && (
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
                  )
                )}
              </>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

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

        {/* Upload Modal */}
        {showUploadModal && selectedFile && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-lg bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Upload Attachment</h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">File:</p>
                <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mt-1">Size: {formatFileSize(selectedFile.size)}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={attachmentDescription}
                  onChange={(e) => setAttachmentDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Enter file description"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachment Type
                </label>
                <select
                  value={attachmentType}
                  onChange={(e) => setAttachmentType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="document">Document</option>
                  <option value="image">Image</option>
                  <option value="audio">Audio</option>
                  <option value="video">Video</option>
                </select>
              </div>

              {/* Upload Progress */}
              {uploadLoading && (
                <div className="mb-4">
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

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setAttachmentDescription('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  disabled={uploadLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploadLoading || !attachmentDescription.trim()}
                  className={`px-4 py-2 text-white rounded-lg ${
                    uploadLoading || !attachmentDescription.trim()
                      ? 'bg-blue-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {uploadLoading ? 'Uploading...' : 'Upload'}
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
                      {getUserDisplayName(evidence.collected_by)}
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
                            <dd className="mt-1 text-sm text-gray-900">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value || '-')}
                            </dd>
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
                          Verified by {getUserDisplayName(evidence.verified_by)} on{' '}
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
                      Verified by {getUserDisplayName(evidence.verified_by)} on{' '}
                      {new Date(evidence.verified_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Attachments Tab */}
            {activeTab === 'attachments' && (
              <div>
                {/* Upload Button - Only show for users with permission */}
                {canUploadAttachments && (
                  <div className="mb-6">
                    <button
                      onClick={() => document.getElementById('file-input').click()}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Upload Attachment
                    </button>
                    <input
                      id="file-input"
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                )}

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
                      {canUploadAttachments && (
                        <p className="text-xs text-gray-400 mt-1">Click the Upload button to add files</p>
                      )}
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
                                {attachment.uploaded_by && (
                                  <>
                                    <span>•</span>
                                    <span>By {getUserDisplayName(attachment.uploaded_by)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {attachment.file && (
                              <button
                                onClick={() => handleDownloadAttachment(attachment)}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full"
                                title="Download/View"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </button>
                            )}
                            {/* Only show delete button for users with permission */}
                            {canUploadAttachments && (
                              <button
                                onClick={() => handleDeleteAttachment(attachment.id)}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full"
                                title="Delete"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
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
