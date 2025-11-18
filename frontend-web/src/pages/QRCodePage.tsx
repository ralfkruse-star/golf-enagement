import { useQuery } from '@tanstack/react-query';
import { qrApi } from '../services/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { QrCode, Calendar, Clock, Info } from 'lucide-react';

export default function QRCodePage() {
  const { data: nextEvent, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['next-event-qr'],
    queryFn: () => qrApi.getNextEventQR().then((res) => res.data),
    retry: false,
  });

  const { data: nextTeeTime, isLoading: teeTimeLoading, error: teeTimeError } = useQuery({
    queryKey: ['next-teetime-qr'],
    queryFn: () => qrApi.getNextTeeTimeQR().then((res) => res.data),
    retry: false,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Meine QR-Codes</h1>
        <p className="text-gray-600">Check-In Codes für Events und Tee-Times</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Event QR */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar size={24} className="text-primary-600" />
            Nächstes Event
          </h2>

          {eventLoading ? (
            <div className="text-center py-12 text-gray-500">Lädt...</div>
          ) : eventError ? (
            <div className="text-center py-12">
              <Info size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Kein bevorstehendes Event gefunden</p>
            </div>
          ) : nextEvent ? (
            <div>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="font-bold mb-2">{nextEvent.event?.title}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    {format(new Date(nextEvent.event?.startDate), 'EEEE, dd. MMMM yyyy', { locale: de })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    {format(new Date(nextEvent.event?.startDate), 'HH:mm', { locale: de })} Uhr
                  </div>
                </div>
              </div>

              <div className="text-center">
                <img
                  src={nextEvent.qrCode}
                  alt="Event QR Code"
                  className="mx-auto mb-4 w-64 h-64 border-4 border-gray-200 rounded-lg"
                />
                <p className="text-sm text-gray-600 mb-2">
                  Zeigen Sie diesen QR-Code beim Check-In vor
                </p>
                <p className="text-xs text-gray-500">
                  Gültig für 24 Stunden
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Next Tee-Time QR */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock size={24} className="text-blue-600" />
            Nächste Tee-Time
          </h2>

          {teeTimeLoading ? (
            <div className="text-center py-12 text-gray-500">Lädt...</div>
          ) : teeTimeError ? (
            <div className="text-center py-12">
              <Info size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Keine bevorstehende Tee-Time gefunden</p>
            </div>
          ) : nextTeeTime ? (
            <div>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    {format(new Date(nextTeeTime.slot?.date), 'EEEE, dd. MMMM yyyy', { locale: de })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span className="text-2xl font-bold text-gray-900">{nextTeeTime.slot?.time}</span> Uhr
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {nextTeeTime.booking?.players} Spieler gebucht
                  </div>
                </div>
              </div>

              <div className="text-center">
                <img
                  src={nextTeeTime.qrCode}
                  alt="Tee-Time QR Code"
                  className="mx-auto mb-4 w-64 h-64 border-4 border-gray-200 rounded-lg"
                />
                <p className="text-sm text-gray-600 mb-2">
                  Zeigen Sie diesen QR-Code am Starthaus vor
                </p>
                <p className="text-xs text-gray-500">
                  Gültig für 24 Stunden
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Info Box */}
      <div className="card mt-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info size={24} className="text-blue-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold mb-2">So funktioniert's</h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Zeigen Sie Ihren QR-Code beim Check-In vor</li>
              <li>Der Code wird vom Personal gescannt</li>
              <li>Ihre Anwesenheit wird automatisch bestätigt</li>
              <li>QR-Codes sind aus Sicherheitsgründen 24 Stunden gültig</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
