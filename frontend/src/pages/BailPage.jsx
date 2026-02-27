import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import bailService from '../services/bailService';

const BailPage = () => {
  const [bails, setBails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBails();
  }, []);

  const fetchBails = async () => {
    try {
      setLoading(true);
      const response = await bailService.getBails({ status: 'pending' });
      const data = response.data;
      setBails(data.results ?? (Array.isArray(data) ? data : []));
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch bails');
    } finally {
      setLoading(false);
    }
  };

  const handlePayBail = async (bailId) => {
    const returnUrl = `${window.location.origin}/bail/return`;
    try {
      const response = await bailService.initiatePayment(bailId, { return_url: returnUrl });
      const paymentUrl = response.data?.payment_url;
      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        setError(response.data?.error || 'No payment URL received');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to start payment');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading bails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Bail</h1>
          <p className="text-gray-600 mt-2">List of bails for release from detention. Pay to release the suspect.</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {bails.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg">No pending bails.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bails.map((bail) => (
              <div
                key={bail.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200"
              >
                <div className="bg-blue-700 text-white p-4">
                  <p className="text-sm font-semibold">Bail #{bail.id}</p>
                  <p className="text-2xl font-bold">
                    {(bail.amount || 0).toLocaleString()} Rials
                  </p>
                  {bail.fine_amount > 0 && (
                    <p className="text-sm mt-1">
                      + Fine: {(bail.fine_amount).toLocaleString()} Rials
                    </p>
                  )}
                </div>
                <div className="p-6 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Suspect</p>
                    <p className="text-lg font-bold text-gray-900">
                      {bail.suspect_detail?.full_name ?? `#${bail.suspect}`}
                    </p>
                    {bail.suspect_detail?.aliases && (
                      <p className="text-sm text-gray-500">{bail.suspect_detail.aliases}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePayBail(bail.id)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition"
                  >
                    Pay Bail
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BailPage;
