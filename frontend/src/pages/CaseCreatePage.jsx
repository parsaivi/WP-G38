import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import casesService from '../services/casesService';

const CaseCreatePage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const userRoles = (user?.roles || []).map(r => r.toLowerCase());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    origin: 'complaint',
    crime_severity: '',
    crime_scene_time: '',
    crime_scene_location: '',
  });
  const [witnesses, setWitnesses] = useState([]);

  const addWitness = () => {
    setWitnesses((prev) => [...prev, { full_name: '', phone: '', national_id: '' }]);
  };

  const removeWitness = (index) => {
    setWitnesses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleWitnessChange = (index, field, value) => {
    setWitnesses((prev) =>
      prev.map((w, i) => (i === index ? { ...w, [field]: value } : w))
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const ALLOWED_ROLES = ['chief', 'captain', 'sergeant', 'detective', 'police officer', 'patrol officer', 'administrator'];
  const canCreateCase = user?.is_staff || userRoles.some(r => ALLOWED_ROLES.includes(r));

  if (!canCreateCase) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-4">You do not have permission to create cases.</p>
          <Link to="/cases" className="text-blue-600 hover:text-blue-700 mt-4 inline-block font-semibold">
            &larr; Back to Cases
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = { ...formData };
      if (!payload.summary) delete payload.summary;
      if (!payload.crime_scene_time) delete payload.crime_scene_time;
      if (!payload.crime_scene_location) delete payload.crime_scene_location;

      if (payload.origin === 'crime_scene') {
        if (witnesses.length > 0) {
          payload.witnesses = witnesses;
        }
        await casesService.createFromCrimeScene(payload);
      } else {
        await casesService.createCase(payload);
      }

      navigate('/cases');
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const messages = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ');
        setError(messages);
      } else {
        setError(data?.detail || 'Failed to create case');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/cases"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            &larr; Back to Cases
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mt-4">Create New Case</h1>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Enter case title"
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Summary
            </label>
            <textarea
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Enter case summary"
            />
          </div>

          {/* Origin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Origin
            </label>
            <select
              name="origin"
              value={formData.origin}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="complaint">Complaint</option>
              <option value="crime_scene">Crime Scene</option>
            </select>
          </div>

          {/* Crime Severity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Crime Severity <span className="text-red-500">*</span>
            </label>
            <select
              name="crime_severity"
              value={formData.crime_severity}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">Select severity...</option>
              <option value="3">Level 3 - Minor (petty theft, minor fraud)</option>
              <option value="2">Level 2 - Major (car theft)</option>
              <option value="1">Level 1 - Severe (murder)</option>
              <option value="0">Critical (serial murder, terrorism)</option>
            </select>
          </div>

          {/* Crime Scene Fields (only when origin is crime_scene) */}
          {formData.origin === 'crime_scene' && (
            <>
              {/* Crime Scene Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Crime Scene Time
                </label>
                <input
                  type="datetime-local"
                  name="crime_scene_time"
                  value={formData.crime_scene_time}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Crime Scene Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Crime Scene Location
                </label>
                <input
                  type="text"
                  name="crime_scene_location"
                  value={formData.crime_scene_location}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Enter location"
                />
              </div>

              {/* Witnesses */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Witnesses
                  </label>
                  <button
                    type="button"
                    onClick={addWitness}
                    className="bg-green-600 hover:bg-green-700 text-white py-1 px-4 rounded-lg text-sm font-semibold transition"
                  >
                    Add Witness
                  </button>
                </div>
                {witnesses.map((witness, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 mb-3 bg-gray-50"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-semibold text-gray-700">
                        Witness #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeWitness(index)}
                        className="text-red-600 hover:text-red-700 text-sm font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={witness.full_name}
                          onChange={(e) =>
                            handleWitnessChange(index, 'full_name', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                          placeholder="Full name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Phone
                        </label>
                        <input
                          type="text"
                          value={witness.phone}
                          onChange={(e) =>
                            handleWitnessChange(index, 'phone', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                          placeholder="Phone number"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          National ID
                        </label>
                        <input
                          type="text"
                          value={witness.national_id}
                          onChange={(e) =>
                            handleWitnessChange(index, 'national_id', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                          placeholder="National ID"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {witnesses.length === 0 && (
                  <p className="text-sm text-gray-500 italic">
                    No witnesses added yet.
                  </p>
                )}
              </div>
            </>
          )}

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition ${
                loading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? 'Creating...' : 'Create Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaseCreatePage;
