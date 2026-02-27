import React, { useEffect, useState } from 'react';
import suspectService from '../services/suspectService';

const MostWantedPage = () => {
  const [suspects, setSuspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetchMostWanted();
  }, []);

  const fetchMostWanted = async () => {
    try {
      setLoading(true);
      const response = await suspectService.getMostWanted();
      setSuspects(response.data.results || response.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch most wanted list');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <p className="mt-4 text-gray-600">Loading most wanted list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-white">
          <h1 className="text-5xl font-bold mb-2">Most Wanted</h1>
          <p className="text-xl text-red-200">Dangerous Criminals</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Suspects Grid */}
        {suspects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg">No suspects in most wanted list.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suspects.map((suspect, idx) => (
              <div
                key={suspect.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-2xl transition transform hover:scale-105"
              >
                {/* Rank Badge */}
                <div className="bg-red-600 text-white p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold">Rank {idx + 1}</p>
                    <p className="text-2xl font-bold">Rials {(suspect.reward_amount || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-4xl">⚠️</div>
                </div>

                {/* Suspect Info */}
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">NAME</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {suspect.full_name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-600">DAYS WANTED</p>
                      <p className="text-lg font-bold text-orange-600">
                        {suspect.days_wanted || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Score</p>
                      <div className="text-lg font-bold text-red-600">
                        #{suspect.most_wanted_rank || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {suspect.last_known_location && (
                    <div>
                      <p className="text-sm font-semibold text-gray-600">LAST KNOWN LOCATION</p>
                      <p className="text-gray-700">
                        {suspect.last_known_location}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MostWantedPage;
