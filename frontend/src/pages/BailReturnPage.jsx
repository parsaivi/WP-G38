import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import bailService from '../services/bailService';

const BailReturnPage = () => {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const bailId = searchParams.get('bail_id') || searchParams.get('payment_id');
    const statusParam = searchParams.get('status');
    const errorParam = searchParams.get('error');
    if (!bailId && statusParam !== 'success') {
      if (errorParam) {
        setError(errorParam);
      } else {
        setError('Missing bail_id in URL');
      }
      setLoading(false);
      return;
    }
    if (statusParam === 'failed' && errorParam) {
      setError(errorParam);
      setLoading(false);
      return;
    }
    if (!bailId) {
      setLoading(false);
      return;
    }
    const confirm = async () => {
      try {
        const response = await bailService.confirmPayment(bailId);
        setResult(response.data);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            err.response?.data?.error ||
            err.message ||
            'Payment confirmation failed'
        );
      } finally {
        setLoading(false);
      }
    };
    confirm();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Confirming payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {error ? (
          <>
            <div className="text-red-600 text-5xl mb-4">✕</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment failed</h1>
            <p className="text-gray-600 mb-6">{error}</p>
          </>
        ) : (
          <>
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment successful</h1>
            <p className="text-gray-600 mb-6">
              {result?.detail || 'Suspect has been released on bail.'}
            </p>
          </>
        )}
        <Link
          to="/bail"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
        >
          Back to Bail list
        </Link>
      </div>
    </div>
  );
};

export default BailReturnPage;
