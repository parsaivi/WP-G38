import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import complaintService from '../services/complaintService';

const ComplaintCreatePage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    incident_date: '',
    crime_severity: 3,
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'crime_severity' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        crime_severity: formData.crime_severity,
      };
      if (formData.location) {
        payload.location = formData.location;
      }
      if (formData.incident_date) {
        payload.incident_date = formData.incident_date;
      }

      await complaintService.createComplaint(payload);
      navigate('/complaints');
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const messages = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ');
        setError(messages);
      } else {
        setError(data?.detail || 'Failed to create complaint');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/complaints"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            &larr; Back to Complaints
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mt-4">File a Complaint</h1>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Enter complaint title"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={5}
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Describe the incident in detail"
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Where did the incident occur?"
            />
          </div>

          {/* Incident Date */}
          <div>
            <label htmlFor="incident_date" className="block text-sm font-medium text-gray-700 mb-2">
              Incident Date
            </label>
            <input
              type="datetime-local"
              id="incident_date"
              name="incident_date"
              value={formData.incident_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Crime Severity */}
          <div>
            <label htmlFor="crime_severity" className="block text-sm font-medium text-gray-700 mb-2">
              Crime Severity <span className="text-red-500">*</span>
            </label>
            <select
              id="crime_severity"
              name="crime_severity"
              required
              value={formData.crime_severity}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="3">Level 3 - Minor (petty theft, minor fraud)</option>
              <option value="2">Level 2 - Major (car theft)</option>
              <option value="1">Level 1 - Severe (murder)</option>
              <option value="0">Critical (serial murder, terrorism)</option>
            </select>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition ${
                submitting
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComplaintCreatePage;
