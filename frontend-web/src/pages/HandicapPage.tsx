import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handicapApi } from '../services/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Trophy, TrendingUp, TrendingDown, Calendar, Flag, Target } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function HandicapPage() {
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    strokes: 72,
    coursePar: 72,
    courseRating: 72.0,
    slopeRating: 113,
  });

  const queryClient = useQueryClient();

  const { data: rounds } = useQuery({
    queryKey: ['my-rounds'],
    queryFn: () => handicapApi.getMyRounds({ limit: 20 }).then((res) => res.data),
  });

  const { data: history } = useQuery({
    queryKey: ['handicap-history'],
    queryFn: () => handicapApi.getMyHistory({ limit: 50 }).then((res) => res.data),
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => handicapApi.submitRound(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['my-rounds'] });
      queryClient.invalidateQueries({ queryKey: ['handicap-history'] });
      setShowRoundForm(false);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        strokes: 72,
        coursePar: 72,
        courseRating: 72.0,
        slopeRating: 113,
      });
      alert(
        `Runde erfolgreich eingereicht!\nHandicap: ${response.data.handicapBefore} → ${response.data.handicapAfter}`
      );
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Fehler beim Einreichen der Runde');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate(formData);
  };

  const currentHandicap = history?.[0]?.handicap || null;
  const previousHandicap = history?.[1]?.handicap || null;
  const handicapChange = currentHandicap && previousHandicap ? currentHandicap - previousHandicap : 0;

  // Chart data
  const chartData = {
    labels: history?.slice(0, 10).reverse().map((h: any) => format(new Date(h.date), 'dd.MM', { locale: de })) || [],
    datasets: [
      {
        label: 'Handicap',
        data: history?.slice(0, 10).reverse().map((h: any) => h.handicap) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        reverse: true, // Lower handicap is better
        title: {
          display: true,
          text: 'Handicap',
        },
      },
    },
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mein Handicap</h1>
          <p className="text-gray-600">Rundenverwaltung & Handicap-Verlauf</p>
        </div>
        <button
          onClick={() => setShowRoundForm(!showRoundForm)}
          className="btn btn-primary"
        >
          + Runde eintragen
        </button>
      </div>

      {/* Current Handicap Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <Trophy size={24} className="text-primary-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Aktuelles Handicap</div>
              <div className="text-3xl font-bold">{currentHandicap !== null ? currentHandicap.toFixed(1) : '-'}</div>
            </div>
          </div>
          {handicapChange !== 0 && (
            <div className={`flex items-center gap-1 text-sm ${handicapChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
              {handicapChange < 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
              <span>{Math.abs(handicapChange).toFixed(1)} seit letzter Runde</span>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Flag size={24} className="text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Gespielte Runden</div>
              <div className="text-3xl font-bold">{rounds?.length || 0}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Target size={24} className="text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Beste Runde</div>
              <div className="text-3xl font-bold">
                {rounds && rounds.length > 0
                  ? Math.min(...rounds.map((r: any) => r.strokes))
                  : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Round Entry Form */}
      {showRoundForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Neue Runde eintragen</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Datum *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Schläge *</label>
                <input
                  type="number"
                  value={formData.strokes}
                  onChange={(e) => setFormData({ ...formData, strokes: parseInt(e.target.value) })}
                  className="input w-full"
                  min="18"
                  max="200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Course Par</label>
                <input
                  type="number"
                  value={formData.coursePar}
                  onChange={(e) => setFormData({ ...formData, coursePar: parseInt(e.target.value) })}
                  className="input w-full"
                  min="54"
                  max="90"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Course Rating</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.courseRating}
                  onChange={(e) => setFormData({ ...formData, courseRating: parseFloat(e.target.value) })}
                  className="input w-full"
                  min="54"
                  max="90"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Slope Rating</label>
                <input
                  type="number"
                  value={formData.slopeRating}
                  onChange={(e) => setFormData({ ...formData, slopeRating: parseInt(e.target.value) })}
                  className="input w-full"
                  min="55"
                  max="155"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowRoundForm(false)}
                className="btn btn-secondary"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="btn btn-primary"
              >
                {submitMutation.isPending ? 'Speichert...' : 'Runde speichern'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Handicap Chart */}
      {history && history.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Handicap-Verlauf</h2>
          <Line data={chartData} options={chartOptions} />
        </div>
      )}

      {/* Recent Rounds */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Letzte Runden</h2>
        {!rounds || rounds.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Noch keine Runden eingetragen
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schläge</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Par</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">+/-</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Handicap</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rounds.map((round: any) => {
                  const toPar = round.strokes - round.coursePar;
                  return (
                    <tr key={round.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" />
                          {format(new Date(round.date), 'dd.MM.yyyy', { locale: de })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">{round.strokes}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{round.coursePar}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${
                        toPar > 0 ? 'text-red-600' : toPar < 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {toPar > 0 ? '+' : ''}{toPar}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          {round.handicapBefore.toFixed(1)}
                          {round.handicapAfter && (
                            <>
                              <span className="text-gray-400">→</span>
                              <span className="font-semibold">{round.handicapAfter.toFixed(1)}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {round.verified ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                            Verifiziert
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                            Ausstehend
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
