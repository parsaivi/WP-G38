import React from 'react';

export const SkeletonLoader = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-12 bg-gray-300 rounded"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-300 rounded"></div>
      <div className="h-4 bg-gray-300 rounded w-5/6"></div>
      <div className="h-4 bg-gray-300 rounded w-4/6"></div>
    </div>
  </div>
);

export const CardSkeleton = () => (
  <div className="animate-pulse bg-white rounded-lg shadow p-6 space-y-4">
    <div className="h-6 bg-gray-300 rounded w-1/2"></div>
    <div className="h-8 bg-gray-300 rounded w-1/3"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-300 rounded"></div>
      <div className="h-4 bg-gray-300 rounded w-5/6"></div>
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="bg-white rounded-lg shadow overflow-hidden">
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          {[...Array(4)].map((_, i) => (
            <th key={i} className="px-6 py-3">
              <div className="h-4 bg-gray-300 rounded animate-pulse"></div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y">
        {[...Array(rows)].map((_, rowIdx) => (
          <tr key={rowIdx}>
            {[...Array(4)].map((_, colIdx) => (
              <td key={colIdx} className="px-6 py-4">
                <div className="h-4 bg-gray-300 rounded animate-pulse"></div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const GridSkeleton = ({ columns = 3, items = 6 }) => (
  <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-6`}>
    {[...Array(items)].map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export default SkeletonLoader;
