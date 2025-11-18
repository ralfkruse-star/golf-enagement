import { useQuery } from '@tanstack/react-query';
import { segmentsApi } from '../services/api';
import { Users, RefreshCw } from 'lucide-react';

export default function SegmentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['segments'],
    queryFn: () => segmentsApi.getAll().then((res) => res.data),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Segmente</h1>
        <button className="btn btn-primary">+ Neues Segment</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-gray-500">Lädt...</div>
        ) : (
          data?.map((segment: any) => (
            <div key={segment.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold">{segment.name}</h3>
                {segment.isSystem && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    System
                  </span>
                )}
              </div>

              {segment.description && (
                <p className="text-sm text-gray-600 mb-4">{segment.description}</p>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-gray-700">
                  <Users size={18} />
                  <span className="font-semibold">{segment._count?.members || 0}</span>
                  <span className="text-sm text-gray-500">Mitglieder</span>
                </div>

                {!segment.isSystem && (
                  <button className="btn btn-secondary text-sm flex items-center gap-2">
                    <RefreshCw size={14} />
                    Neu berechnen
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
