import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import judiciaryService from '../services/judiciaryService';

const formatUserName = (user) => {
  if (!user) return 'N/A';
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
  return name || user.username;
};

const TrialDetailPage = () => {
  const { trialId } = useParams();
  const { user } = useSelector((state) => state.auth);
  const userRoles = (user?.roles || user?.groups || []).map((r) => String(r).toLowerCase());
  const isJudge = user?.is_staff || userRoles.includes('judge');

  const [trial, setTrial] = useState(null);
  const [fullReport, setFullReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [verdictForm, setVerdictForm] = useState({ verdict: '', notes: '' });
  const [sentenceForm, setSentenceForm] = useState({
    suspect_id: '',
    title: '',
    description: '',
    duration_days: '',
    fine_amount: '',
  });

  const fetchTrial = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await judiciaryService.getTrial(trialId);
      setTrial(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to load trial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrial();
  }, [trialId]);

  useEffect(() => {
    if (trial?.verdict === 'guilty' && !fullReport && !reportLoading) {
      fetchFullReport();
    }
  }, [trial?.id, trial?.verdict]);

  const fetchFullReport = async () => {
    try {
      setReportLoading(true);
      setError(null);
      const res = await judiciaryService.getFullReport(trialId);
      setFullReport(res.data);
      setShowReport(true);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to load report');
    } finally {
      setReportLoading(false);
    }
  };

  const handleIssueVerdict = async (e) => {
    e.preventDefault();
    if (!verdictForm.verdict) return;
    try {
      setActionLoading(true);
      setError(null);
      await judiciaryService.issueVerdict(trialId, {
        verdict: verdictForm.verdict,
        notes: verdictForm.notes || '',
      });
      setVerdictForm({ verdict: '', notes: '' });
      await fetchTrial();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to issue verdict');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddSentence = async (e) => {
    e.preventDefault();
    if (!sentenceForm.suspect_id || !sentenceForm.title?.trim() || !sentenceForm.description?.trim()) return;
    try {
      setActionLoading(true);
      setError(null);
      await judiciaryService.addSentence(trialId, {
        suspect_id: parseInt(sentenceForm.suspect_id, 10),
        title: sentenceForm.title.trim(),
        description: sentenceForm.description.trim(),
        duration_days: sentenceForm.duration_days ? parseInt(sentenceForm.duration_days, 10) : null,
        fine_amount: sentenceForm.fine_amount ? parseInt(sentenceForm.fine_amount, 10) : null,
      });
      setSentenceForm({ suspect_id: '', title: '', description: '', duration_days: '', fine_amount: '' });
      await fetchTrial();
    } catch (err)  {
      const data = err.response?.data;
      const msg =
        data?.error ||
        data?.detail ||
        (data && typeof data === 'object' ? JSON.stringify(data) : null) ||
        'Failed to add sentence';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
          <p className="mt-4 text-gray-600">Loading trial...</p>
        </div>
      </div>
    );
  }

  if (error && !trial) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <Link to="/judiciary" className="text-cyan-600 hover:text-cyan-700 font-semibold">
            &larr; Back to Trials
          </Link>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-6">{error}</div>
        </div>
      </div>
    );
  }

  const caseInfo = trial?.case;
  const verdictOptions = [
    { value: 'guilty', label: 'Guilty' },
    { value: 'not_guilty', label: 'Not Guilty' },
    { value: 'dismissed', label: 'Case Dismissed' },
    { value: 'mistrial', label: 'Mistrial' },
  ];
  const suspectsFromReport = fullReport?.report_data?.suspects ?? [];
  const canAddSentence = trial?.verdict === 'guilty' && isJudge;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/judiciary" className="text-cyan-600 hover:text-cyan-700 font-semibold">
          &larr; Back to Trials
        </Link>
        {trial?.case && (
          <Link
            to={`/cases/${trial.case.id}`}
            className="ml-4 text-gray-600 hover:text-gray-800 font-semibold"
          >
            View case
          </Link>
        )}

        <div className="mt-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Trial #{trial?.id}
              {caseInfo?.case_number && ` — ${caseInfo.case_number}`}
            </h1>
            {caseInfo?.title && (
              <p className="text-gray-600 mt-1">{caseInfo.title}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {trial?.scheduled_date && (
                <span className="inline-block px-2 py-1 rounded bg-gray-200 text-gray-800 text-sm">
                  Scheduled: {new Date(trial.scheduled_date).toLocaleString()}
                </span>
              )}
              {trial?.judge && (
                <span className="inline-block px-2 py-1 rounded bg-cyan-100 text-cyan-800 text-sm">
                  Judge: {formatUserName(trial.judge)}
                </span>
              )}
              {trial?.verdict && (
                <span className="inline-block px-2 py-1 rounded bg-cyan-200 text-cyan-900 text-sm font-semibold">
                  Verdict: {trial.verdict.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Full report */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Case report</h2>
          <p className="text-gray-600 mb-4">
            Full report includes officers involved, evidence, suspects, history, and complainants.
          </p>
          <button
            type="button"
            onClick={fetchFullReport}
            disabled={reportLoading}
            className="bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-6 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {reportLoading ? 'Loading...' : showReport ? 'Refresh report' : 'View full report'}
          </button>

          {showReport && fullReport?.report_data && (
            <div className="mt-6 space-y-6 border-t pt-6">
              <section>
                <h3 className="font-semibold text-gray-900 mb-2">Officers involved</h3>
                <div className="space-y-2">
                  {(fullReport.report_data.officers_involved || []).map((o, i) => (
                    <div key={i} className="border border-gray-200 rounded p-3 bg-gray-50">
                      <p className="font-medium text-gray-900">{o.name}</p>
                      {o.roles?.length > 0 && (
                        <p className="text-sm text-gray-600">{o.roles.join(', ')}</p>
                      )}
                      {o.role_in_case && (
                        <p className="text-sm text-cyan-700">{o.role_in_case}</p>
                      )}
                    </div>
                  ))}
                  {(!fullReport.report_data.officers_involved || fullReport.report_data.officers_involved.length === 0) && (
                    <p className="text-gray-500">None recorded.</p>
                  )}
                </div>
              </section>
              <section>
                <h3 className="font-semibold text-gray-900 mb-2">Evidence</h3>
                <div className="space-y-2">
                  {(fullReport.report_data.evidence || []).map((ev, i) => (
                    <div key={i} className="border border-gray-200 rounded p-3 bg-gray-50">
                      <p className="font-medium text-gray-900">{ev.title}</p>
                      <p className="text-sm text-gray-600">{ev.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Type: {ev.type} · Collected by: {ev.collected_by ?? '—'}
                      </p>
                    </div>
                  ))}
                  {(!fullReport.report_data.evidence || fullReport.report_data.evidence.length === 0) && (
                    <p className="text-gray-500">None recorded.</p>
                  )}
                </div>
              </section>
              <section>
                <h3 className="font-semibold text-gray-900 mb-2">Suspects</h3>
                <div className="space-y-2">
                  {(fullReport.report_data.suspects || []).map((s, i) => (
                    <div key={i} className="border border-gray-200 rounded p-3 bg-gray-50">
                      <p className="font-medium text-gray-900">{s.name}</p>
                      <p className="text-sm text-gray-600">
                        Role: {s.role} · Status: {s.status}
                      </p>
                      <p className="text-sm text-gray-600">
                        Detective score: {s.detective_score ?? '—'}/10 · Sergeant score: {s.sergeant_score ?? '—'}/10
                      </p>
                      {s.captain_decision && (
                        <p className="text-sm text-indigo-700 mt-1">Captain: {s.captain_decision}</p>
                      )}
                      {s.chief_decision && (
                        <p className="text-sm text-rose-700 mt-1">Chief: {s.chief_decision}</p>
                      )}
                    </div>
                  ))}
                  {(!fullReport.report_data.suspects || fullReport.report_data.suspects.length === 0) && (
                    <p className="text-gray-500">None recorded.</p>
                  )}
                </div>
              </section>
              <section>
                <h3 className="font-semibold text-gray-900 mb-2">Case history</h3>
                <div className="space-y-2">
                  {(fullReport.report_data.history || []).map((h, i) => (
                    <div key={i} className="border border-gray-200 rounded p-3 bg-gray-50">
                      <p className="text-sm text-gray-900">
                        {h.from} → {h.to}
                      </p>
                      <p className="text-xs text-gray-500">by {h.by} · {h.date}</p>
                      {h.notes && <p className="text-sm text-gray-600 mt-1">{h.notes}</p>}
                    </div>
                  ))}
                  {(!fullReport.report_data.history || fullReport.report_data.history.length === 0) && (
                    <p className="text-gray-500">None recorded.</p>
                  )}
                </div>
              </section>
              {(fullReport.report_data.complainants || []).length > 0 && (
                <section>
                  <h3 className="font-semibold text-gray-900 mb-2">Complainants</h3>
                  <div className="space-y-2">
                    {fullReport.report_data.complainants.map((c, i) => (
                      <div key={i} className="border border-gray-200 rounded p-3 bg-gray-50">
                        <p className="font-medium text-gray-900">{c.name}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Verdict (Judge only) */}
        {isJudge && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Verdict</h2>
            {!trial?.verdict ? (
              <form onSubmit={handleIssueVerdict}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Verdict *</label>
                    <select
                      value={verdictForm.verdict}
                      onChange={(e) => setVerdictForm({ ...verdictForm, verdict: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">Select verdict</option>
                      {verdictOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={verdictForm.notes}
                      onChange={(e) => setVerdictForm({ ...verdictForm, notes: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      rows="3"
                      placeholder="Optional notes"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-6 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {actionLoading ? 'Submitting...' : 'Issue verdict'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <p className="text-gray-700 font-medium">
                  Verdict: <span className="text-cyan-800">{trial.verdict.replace(/_/g, ' ')}</span>
                </p>
                {trial.verdict_date && (
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(trial.verdict_date).toLocaleString()}
                  </p>
                )}
                {trial.verdict_notes && (
                  <p className="text-gray-700 mt-2">{trial.verdict_notes}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sentences (Judge only, when guilty) */}
        {canAddSentence && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Sentences</h2>
            {trial?.sentences?.length > 0 && (
              <ul className="space-y-3 mb-6">
                {trial.sentences.map((s) => (
                  <li key={s.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <p className="font-semibold text-gray-900">{s.title}</p>
                    <p className="text-gray-700">{s.description}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Suspect: {s.suspect?.full_name ?? `#${s.suspect_id}`}
                      {s.duration_days != null && ` · ${s.duration_days} days`}
                      {s.fine_amount != null && ` · Fine: ${s.fine_amount.toLocaleString()} Rials`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleAddSentence}>
              <h3 className="font-medium text-gray-900 mb-3">Add sentence</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Suspect *</label>
                  <select
                    value={sentenceForm.suspect_id}
                    onChange={(e) => setSentenceForm({ ...sentenceForm, suspect_id: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="">Select suspect</option>
                    {suspectsFromReport.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                    {suspectsFromReport.length === 0 && trial?.case?.id && (
                      <option value="" disabled>Load full report to select suspect</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={sentenceForm.title}
                    onChange={(e) => setSentenceForm({ ...sentenceForm, title: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="e.g. Imprisonment"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    value={sentenceForm.description}
                    onChange={(e) => setSentenceForm({ ...sentenceForm, description: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    rows="2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                  <input
                    type="number"
                    min="0"
                    value={sentenceForm.duration_days}
                    onChange={(e) => setSentenceForm({ ...sentenceForm, duration_days: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fine (Rials)</label>
                  <input
                    type="number"
                    min="0"
                    value={sentenceForm.fine_amount}
                    onChange={(e) => setSentenceForm({ ...sentenceForm, fine_amount: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={actionLoading || suspectsFromReport.length === 0}
                className="mt-4 bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-6 rounded-lg font-semibold transition disabled:opacity-50"
              >
                {actionLoading ? 'Adding...' : 'Add sentence'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrialDetailPage;
