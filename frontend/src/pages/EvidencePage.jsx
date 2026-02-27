import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import evidenceService from '../services/evidenceService';

const EVIDENCE_TYPES = [
  { value: 'testimony', label: 'Testimony' },
  { value: 'biological', label: 'Biological' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'id_document', label: 'ID Document' },
  { value: 'other', label: 'Other' },
];

const EvidencePage = () => {
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    case: '',
    evidence_type: 'testimony',
    title: '',
    description: '',
    // Testimony
    transcription: '',
    // Vehicle
    model: '',
    color: '',
    plate_number: '',
    serial_number: '',
    // ID Document
    owner_name: '',
    metadata_pairs: [{ key: '', value: '' }],
  });

  useEffect(() => {
    fetchEvidence();
  }, [filterType, page]);

  const fetchEvidence = async () => {
    try {
      setLoading(true);
      const params = { page, page_size: 10 };
      if (filterType !== 'all') {
        params.evidence_type = filterType;
      }
      const response = await evidenceService.getEvidence(params);
      setEvidenceList(response.data.results || response.data || []);
      const total = response.data.count || 0;
      setTotalPages(Math.ceil(total / 10));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch evidence');
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      testimony: 'bg-blue-100 text-blue-800',
      biological: 'bg-red-100 text-red-800',
      vehicle: 'bg-yellow-100 text-yellow-800',
      id_document: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMetadataChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      metadata_pairs: prev.metadata_pairs.map((pair, i) =>
        i === index ? { ...pair, [field]: value } : pair
      ),
    }));
  };

  const addMetadataPair = () => {
    setFormData((prev) => ({
      ...prev,
      metadata_pairs: [...prev.metadata_pairs, { key: '', value: '' }],
    }));
  };

  const removeMetadataPair = (index) => {
    setFormData((prev) => ({
      ...prev,
      metadata_pairs: prev.metadata_pairs.filter((_, i) => i !== index),
    }));
  };

  const resetForm = () => {
    setFormData({
      case: '',
      evidence_type: 'testimony',
      title: '',
      description: '',
      transcription: '',
      model: '',
      color: '',
      plate_number: '',
      serial_number: '',
      owner_name: '',
      metadata_pairs: [{ key: '', value: '' }],
    });
    setFormError(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      const { evidence_type } = formData;

      if (evidence_type === 'testimony') {
        await evidenceService.createTestimony({
          case: parseInt(formData.case),
          title: formData.title,
          description: formData.description,
          transcription: formData.transcription,
        });
      } else {
        const payload = {
          case: parseInt(formData.case),
          evidence_type,
          title: formData.title,
          description: formData.description,
        };

        if (evidence_type === 'vehicle') {
          const metadata = {};
          if (formData.model) metadata.model = formData.model;
          if (formData.color) metadata.color = formData.color;
          if (formData.plate_number) metadata.plate = formData.plate_number;
          if (formData.serial_number) metadata.serial_number = formData.serial_number;
          payload.metadata = metadata;
        } else if (evidence_type === 'id_document') {
          const metadata = { owner_name: formData.owner_name };
          formData.metadata_pairs.forEach((pair) => {
            if (pair.key.trim()) {
              metadata[pair.key.trim()] = pair.value;
            }
          });
          payload.metadata = metadata;
        }

        await evidenceService.createEvidence(payload);
      }

      resetForm();
      setShowForm(false);
      fetchEvidence();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const messages = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ');
        setFormError(messages);
      } else {
        setFormError(data?.detail || 'Failed to create evidence');
      }
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading evidence...</p>
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
            <h1 className="text-4xl font-bold text-gray-900">Evidence</h1>
            <p className="text-gray-600 mt-2">Total: {evidenceList.length} items</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition"
          >
            {showForm ? 'Cancel' : 'Create Evidence'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Create Evidence Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Evidence</h2>

            {formError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Case ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Case ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="case"
                  value={formData.case}
                  onChange={handleFormChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Enter case ID"
                />
              </div>

              {/* Evidence Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Evidence Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="evidence_type"
                  value={formData.evidence_type}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  {EVIDENCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Enter evidence title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Enter description"
                />
              </div>

              {/* Testimony Fields */}
              {formData.evidence_type === 'testimony' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transcription <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="transcription"
                    value={formData.transcription}
                    onChange={handleFormChange}
                    required
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="Enter testimony transcription"
                  />
                </div>
              )}

              {/* Vehicle Fields */}
              {formData.evidence_type === 'vehicle' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">Vehicle Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Model
                      </label>
                      <input
                        type="text"
                        name="model"
                        value={formData.model}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                        placeholder="Vehicle model"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Color
                      </label>
                      <input
                        type="text"
                        name="color"
                        value={formData.color}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                        placeholder="Vehicle color"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Plate Number
                      </label>
                      <input
                        type="text"
                        name="plate_number"
                        value={formData.plate_number}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                        placeholder="Plate number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Serial Number
                      </label>
                      <input
                        type="text"
                        name="serial_number"
                        value={formData.serial_number}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                        placeholder="Serial number"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 italic">
                    Provide either plate number or serial number (not both).
                  </p>
                </div>
              )}

              {/* ID Document Fields */}
              {formData.evidence_type === 'id_document' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">ID Document Details</h3>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Owner Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="owner_name"
                      value={formData.owner_name}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                      placeholder="Document owner name"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-medium text-gray-600">
                        Metadata
                      </label>
                      <button
                        type="button"
                        onClick={addMetadataPair}
                        className="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-xs font-semibold transition"
                      >
                        Add Field
                      </button>
                    </div>
                    {formData.metadata_pairs.map((pair, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={pair.key}
                          onChange={(e) =>
                            handleMetadataChange(index, 'key', e.target.value)
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                          placeholder="Key"
                        />
                        <input
                          type="text"
                          value={pair.value}
                          onChange={(e) =>
                            handleMetadataChange(index, 'value', e.target.value)
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                          placeholder="Value"
                        />
                        <button
                          type="button"
                          onClick={() => removeMetadataPair(index)}
                          className="text-red-600 hover:text-red-700 text-sm font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={formLoading}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition ${
                    formLoading
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {formLoading ? 'Creating...' : 'Create Evidence'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Type
            </label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Evidence</option>
              {EVIDENCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Evidence Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {evidenceList.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 text-lg">No evidence found.</p>
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
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Case
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Created Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {evidenceList.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                        <Link to={`/evidence/${item.id}`} className="hover:underline">
                          #{item.id}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <Link to={`/evidence/${item.id}`} className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                          {item.title || 'Untitled'}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getTypeColor(
                            item.evidence_type
                          )}`}
                        >
                          {item.evidence_type?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <Link
                          to={`/cases/${item.case}`}
                          className="text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          Case #{item.case}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {new Date(item.created_at).toLocaleDateString()}
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

export default EvidencePage;
