import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '../services/api';
import { Calendar, Users, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function EventsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll({ status: 'PUBLISHED' }).then((res) => res.data),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Events</h1>
        <button className="btn btn-primary">+ Neues Event</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-gray-500">Lädt...</div>
        ) : data?.events?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            Keine Events gefunden
          </div>
        ) : (
          data?.events?.map((event: any) => (
            <div key={event.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  event.type === 'TOURNAMENT' ? 'bg-purple-100 text-purple-700' :
                  event.type === 'TRAINING' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {event.type}
                </span>
                <span className="text-xs text-gray-500">
                  {event.currentParticipants}/{event.maxParticipants || '∞'}
                </span>
              </div>

              <h3 className="text-lg font-semibold mb-2">{event.title}</h3>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  {format(new Date(event.startDate), 'PPp', { locale: de })}
                </div>
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    {event.location}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  {event.currentParticipants} Anmeldungen
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                <button className="btn btn-secondary flex-1 text-sm">Bearbeiten</button>
                <button className="btn btn-primary flex-1 text-sm">Details</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
