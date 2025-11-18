import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teeTimeApi } from '../services/api';
import { format, addDays, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Clock, Users, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function TeeTimePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [bookingModal, setBookingModal] = useState(false);
  const [players, setPlayers] = useState(1);
  const [notes, setNotes] = useState('');

  const queryClient = useQueryClient();

  const { data: slots, isLoading } = useQuery({
    queryKey: ['tee-times', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () => teeTimeApi.getSlots({ date: format(selectedDate, 'yyyy-MM-dd') }).then((res) => res.data),
  });

  const bookMutation = useMutation({
    mutationFn: ({ slotId, data }: any) => teeTimeApi.bookSlot(slotId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tee-times'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setBookingModal(false);
      setSelectedSlot(null);
      setPlayers(1);
      setNotes('');
      alert('Tee-Time erfolgreich gebucht!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Fehler beim Buchen');
    },
  });

  const handleBook = () => {
    if (!selectedSlot) return;

    bookMutation.mutate({
      slotId: selectedSlot.id,
      data: { players, notes },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'PARTIAL':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'FULL':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'BLOCKED':
        return 'bg-gray-100 text-gray-500 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'Verfügbar';
      case 'PARTIAL':
        return 'Teilweise belegt';
      case 'FULL':
        return 'Ausgebucht';
      case 'BLOCKED':
        return 'Gesperrt';
      default:
        return status;
    }
  };

  // Generate week view
  const weekStart = startOfWeek(selectedDate, { locale: de });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Tee-Time Buchung</h1>
        <p className="text-gray-600">Wählen Sie Ihre gewünschte Abschlagszeit</p>
      </div>

      {/* Date Navigation */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="btn btn-secondary"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-center">
            <div className="text-2xl font-bold">
              {format(selectedDate, 'dd. MMMM yyyy', { locale: de })}
            </div>
            <div className="text-sm text-gray-600">
              {format(selectedDate, 'EEEE', { locale: de })}
            </div>
          </div>

          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="btn btn-secondary"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Week View */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={`p-2 text-center rounded-lg border-2 transition-colors ${
                  isSelected
                    ? 'bg-primary-600 text-white border-primary-600'
                    : isToday
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-xs text-gray-600 mb-1">
                  {format(day, 'EEE', { locale: de })}
                </div>
                <div className="text-lg font-semibold">
                  {format(day, 'd')}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tee-Time Slots */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Clock size={24} />
          Verfügbare Zeiten
        </h2>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Lädt...</div>
        ) : !slots || slots.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Keine Tee-Times für diesen Tag verfügbar
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {slots.map((slot: any) => {
              const isBookable = slot.status === 'AVAILABLE' || slot.status === 'PARTIAL';
              const availableSpots = slot.maxPlayers - slot.currentPlayers;

              return (
                <button
                  key={slot.id}
                  onClick={() => {
                    if (isBookable) {
                      setSelectedSlot(slot);
                      setBookingModal(true);
                    }
                  }}
                  disabled={!isBookable}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    getStatusColor(slot.status)
                  } ${
                    isBookable
                      ? 'hover:scale-105 cursor-pointer'
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="font-bold text-lg mb-1">{slot.time}</div>
                  <div className="text-xs mb-2">{getStatusLabel(slot.status)}</div>
                  {isBookable && (
                    <div className="flex items-center gap-1 text-xs">
                      <Users size={12} />
                      <span>{availableSpots} frei</span>
                    </div>
                  )}
                  {slot.isBlocked && (
                    <div className="text-xs mt-1 italic">{slot.blockReason}</div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {bookingModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">Tee-Time buchen</h3>
              <button
                onClick={() => {
                  setBookingModal(false);
                  setSelectedSlot(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={18} className="text-gray-600" />
                  <span className="font-semibold">
                    {format(selectedDate, 'dd. MMMM yyyy', { locale: de })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-gray-600" />
                  <span className="font-semibold text-xl">{selectedSlot.time} Uhr</span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                  <Users size={16} />
                  <span>
                    {selectedSlot.maxPlayers - selectedSlot.currentPlayers} von{' '}
                    {selectedSlot.maxPlayers} Plätzen frei
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Anzahl Spieler *
                </label>
                <select
                  value={players}
                  onChange={(e) => setPlayers(parseInt(e.target.value))}
                  className="input w-full"
                >
                  {Array.from({ length: Math.min(4, selectedSlot.maxPlayers - selectedSlot.currentPlayers) }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num} Spieler
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Anmerkungen (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input w-full"
                  rows={3}
                  placeholder="z.B. Mitspielerwünsche, besondere Anforderungen..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setBookingModal(false);
                    setSelectedSlot(null);
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleBook}
                  disabled={bookMutation.isPending}
                  className="btn btn-primary flex-1"
                >
                  {bookMutation.isPending ? 'Buche...' : 'Jetzt buchen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
