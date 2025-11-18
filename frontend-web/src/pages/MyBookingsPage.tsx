import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teeTimeApi, qrApi } from '../services/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Clock, Users, X, QrCode, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export default function MyBookingsPage() {
  const queryClient = useQueryClient();
  const [qrCodeModal, setQrCodeModal] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState('');

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => teeTimeApi.getMyBookings({ upcoming: true }).then((res) => res.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => teeTimeApi.cancelBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['tee-times'] });
      alert('Buchung erfolgreich storniert');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Fehler beim Stornieren');
    },
  });

  const qrMutation = useMutation({
    mutationFn: (bookingId: string) => teeTimeApi.generateTeeTimeQR(bookingId),
    onSuccess: (data: any) => {
      setQrCodeImage(data.data.qrCode);
      setQrCodeModal(true);
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Fehler beim Generieren des QR-Codes');
    },
  });

  const handleCancel = (bookingId: string, slotDate: string) => {
    const confirmed = confirm(
      `Möchten Sie diese Tee-Time Buchung wirklich stornieren?\n\nDatum: ${slotDate}`
    );

    if (confirmed) {
      cancelMutation.mutate(bookingId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Bestätigt</span>;
      case 'WAITLIST':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Warteliste</span>;
      case 'COMPLETED':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">Gespielt</span>;
      case 'CANCELLED':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">Storniert</span>;
      case 'NO_SHOW':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">Nicht erschienen</span>;
      default:
        return <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Meine Tee-Time Buchungen</h1>
        <p className="text-gray-600">Übersicht über Ihre gebuchten Abschlagszeiten</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Lädt...</div>
      ) : !bookings || bookings.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">Sie haben noch keine Tee-Times gebucht</p>
          <a href="/tee-times" className="btn btn-primary inline-flex items-center gap-2">
            <Clock size={18} />
            Jetzt Tee-Time buchen
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking: any) => (
            <div key={booking.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                {getStatusBadge(booking.status)}
                <div className="text-sm text-gray-500">
                  Gebucht am {format(new Date(booking.bookedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                    <Calendar size={24} className="text-primary-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Datum</div>
                    <div className="font-semibold">
                      {format(new Date(booking.slot.date), 'EEEE, dd. MMM yyyy', { locale: de })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Clock size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Abschlagszeit</div>
                    <div className="font-semibold text-xl">{booking.slot.time} Uhr</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <Users size={24} className="text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Spieler</div>
                    <div className="font-semibold">{booking.players} Personen</div>
                  </div>
                </div>
              </div>

              {booking.notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Anmerkungen:</div>
                  <div className="text-sm">{booking.notes}</div>
                </div>
              )}

              {booking.status === 'WAITLIST' && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                  <AlertCircle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    Sie befinden sich auf der Warteliste. Sie werden benachrichtigt, sobald ein Platz frei wird.
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                {booking.status === 'CONFIRMED' && (
                  <>
                    <button
                      onClick={() => qrMutation.mutate(booking.id)}
                      disabled={qrMutation.isPending}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <QrCode size={18} />
                      {qrMutation.isPending ? 'Generiere...' : 'QR-Code'}
                    </button>
                    <button
                      onClick={() =>
                        handleCancel(
                          booking.id,
                          format(new Date(booking.slot.date), 'dd.MM.yyyy HH:mm', { locale: de })
                        )
                      }
                      disabled={cancelMutation.isPending}
                      className="btn btn-danger flex items-center gap-2"
                    >
                      <X size={18} />
                      Stornieren
                    </button>
                  </>
                )}
                {booking.status === 'WAITLIST' && (
                  <button
                    onClick={() =>
                      handleCancel(
                        booking.id,
                        format(new Date(booking.slot.date), 'dd.MM.yyyy HH:mm', { locale: de })
                      )
                    }
                    disabled={cancelMutation.isPending}
                    className="btn btn-danger flex items-center gap-2"
                  >
                    <X size={18} />
                    Von Warteliste entfernen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      {qrCodeModal && qrCodeImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">Check-In QR-Code</h3>
              <button
                onClick={() => {
                  setQrCodeModal(false);
                  setQrCodeImage('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="text-center">
              <img src={qrCodeImage} alt="QR Code" className="mx-auto mb-4 w-64 h-64" />
              <p className="text-sm text-gray-600 mb-4">
                Zeigen Sie diesen QR-Code beim Check-In am Starthaus vor
              </p>
              <p className="text-xs text-gray-500">
                Der QR-Code ist 24 Stunden gültig
              </p>
            </div>

            <button
              onClick={() => {
                setQrCodeModal(false);
                setQrCodeImage('');
              }}
              className="btn btn-primary w-full mt-4"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
