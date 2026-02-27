import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import rewardsService from '../services/rewardsService';
import { casesService } from '../services/casesService';
import { suspectService } from '../services/suspectService';

const TipSubmitPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    case: '',
    suspect: '',
    title: '',
    description: '',
  });
  const [cases, setCases] = useState([]);
  const [suspects, setSuspects] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [casesRes, suspectsRes] = await Promise.all([
          casesService.getCases({ page_size: 200 }).catch(() => ({ data: { results: [] } })),
          suspectService.getSuspects({ page_size: 200 }).catch(() => ({ data: { results: [] } })),
        ]);
        setCases(casesRes.data?.results || casesRes.data || []);
        setSuspects(suspectsRes.data?.results || suspectsRes.data || []);
      } catch {
        setCases([]);
        setSuspects([]);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const caseId = formData.case ? Number(formData.case) : null;
    const suspectId = formData.suspect ? Number(formData.suspect) : null;
    if (!caseId && !suspectId) {
      setError('Please select at least one: Case or Suspect.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        case: caseId,
        suspect: suspectId,
      };
      await rewardsService.createTip(payload);
      navigate('/tips');
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const messages = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ');
        setError(messages);
      } else {
        setError(data?.detail || 'Failed to submit tip.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link to="/tips" className="text-blue-600 hover:text-blue-700 font-semibold">
            &larr; Back to My Tips
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mt-4">Submit Information (Tip)</h1>
          <p className="text-gray-600 mt-2">
            Provide information about a case or suspect. At least one of Case or Suspect is required.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8 space-y-6">
          <div>
            <label htmlFor="case" className="block text-sm font-medium text-gray-700 mb-2">
              Related Case
            </label>
            <select
              id="case"
              name="case"
              value={formData.case}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              disabled={loadingOptions}
            >
              <option value="">— Select case (optional) —</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.id} {c.title || c.case_number || ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="suspect" className="block text-sm font-medium text-gray-700 mb-2">
              Related Suspect
            </label>
            <select
              id="suspect"
              name="suspect"
              value={formData.suspect}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              disabled={loadingOptions}
            >
              <option value="">— Select suspect (optional) —</option>
              {suspects.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.id} {s.full_name || s.first_name || s.last_name || 'Suspect'}
                </option>
              ))}
            </select>
          </div>

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
              placeholder="Short title for this information"
            />
          </div>

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
              placeholder="Describe the information in detail"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting || loadingOptions}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition ${
                submitting || loadingOptions
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit Tip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TipSubmitPage;
