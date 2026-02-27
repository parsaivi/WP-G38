import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import rewardsService from '../services/rewardsService';

const RewardLookupPage = () => {
  const { user } = useSelector((state) => state.auth);
  const [nationalId, setNationalId] = useState('');
  const [rewardCode, setRewardCode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const userRoles = (user?.roles || user?.groups || []).map((r) => String(r).toLowerCase());
  const isPolice = [
    'police officer',
    'patrol officer',
    'chief',
    'captain',
    'sergeant',
    'administrator',
  ].some((r) => userRoles.includes(r));

  const handleLookup = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!nationalId.trim() || !rewardCode.trim()) {
      setError('Please enter both National ID and Reward code.');
      return;
    }
    setLoading(true);
    try {
      const res = await rewardsService.lookupReward(nationalId.trim(), rewardCode.trim());
      setResult(res.data);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.error || data?.detail || (typeof data === 'string' ? data : 'Lookup failed.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (e) => {
    e.preventDefault();
    if (!result || !nationalId.trim() || !rewardCode.trim()) return;
    setError(null);
    setClaiming(true);
    try {
      await rewardsService.claimReward(nationalId.trim(), rewardCode.trim());
      setResult(null);
      setNationalId('');
      setRewardCode('');
      setError(null);
      setResult({ message: 'Reward claimed successfully. The citizen has been paid.' });
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.error || data?.detail || (data?.reward_code && Array.isArray(data.reward_code) ? data.reward_code.join(', ') : null) || (data?.national_id && Array.isArray(data.national_id) ? data.national_id.join(', ') : null) || 'Claim failed.';
      setError(msg);
    } finally {
      setClaiming(false);
    }
  };

  if (!isPolice) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-2xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Access restricted</h1>
          <p className="text-gray-600 mt-4">Only police personnel can access reward lookup and claim.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Reward Lookup</h1>
        <p className="text-gray-600 mb-8">
          Enter the citizen&apos;s National ID and reward code to view reward details and process payment.
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLookup} className="bg-white rounded-lg shadow p-8 space-y-6">
          <div>
            <label htmlFor="national_id" className="block text-sm font-medium text-gray-700 mb-2">
              National ID
            </label>
            <input
              id="national_id"
              type="text"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="10-digit National ID"
              maxLength={10}
            />
          </div>
          <div>
            <label htmlFor="reward_code" className="block text-sm font-medium text-gray-700 mb-2">
              Reward Code
            </label>
            <input
              id="reward_code"
              type="text"
              value={rewardCode}
              onChange={(e) => setRewardCode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
              placeholder="Unique reward code"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition ${
              loading ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? 'Looking up...' : 'Look up'}
          </button>
        </form>

        {result && result.reward && (
          <div className="mt-8 bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Reward details</h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Recipient</dt>
                <dd className="text-lg font-semibold text-gray-900">{result.recipient?.full_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">National ID</dt>
                <dd className="text-gray-900 font-mono">{result.recipient?.national_id || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Amount (Rials)</dt>
                <dd className="text-2xl font-bold text-green-700">
                  {(result.reward?.amount ?? 0).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="text-gray-900">{result.reward?.is_claimed ? 'Already claimed' : 'Not claimed'}</dd>
              </div>
            </dl>
            {!result.reward?.is_claimed && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={claiming}
                  className={`py-3 px-6 rounded-lg font-semibold transition ${
                    claiming ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {claiming ? 'Processing...' : 'Mark as claimed'}
                </button>
              </div>
            )}
          </div>
        )}

        {result && result.message && !result.reward && (
          <div className="mt-8 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardLookupPage;
