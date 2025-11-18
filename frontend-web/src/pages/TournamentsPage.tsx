import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tournamentApi } from '../services/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Trophy, Users, Clock, Target, TrendingUp, Medal } from 'lucide-react';

export default function TournamentsPage() {
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [scoreEntry, setScoreEntry] = useState({ hole: 1, strokes: 4 });

  const queryClient = useQueryClient();

  const { data: tournaments, isLoading } = useQuery({
    queryKey: ['active-tournaments'],
    queryFn: () => tournamentApi.getActiveTournaments().then((res) => res.data),
    refetchInterval: 30000, // Refresh every 30s
  });

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['tournament-leaderboard', selectedTournament],
    queryFn: () =>
      selectedTournament
        ? tournamentApi.getLeaderboard(selectedTournament).then((res) => res.data)
        : Promise.resolve(null),
    enabled: !!selectedTournament,
    refetchInterval: 10000, // Refresh every 10s for live updates
  });

  const { data: myScore } = useQuery({
    queryKey: ['my-tournament-score', selectedTournament],
    queryFn: () =>
      selectedTournament
        ? tournamentApi.getMyScore(selectedTournament).then((res) => res.data)
        : Promise.resolve(null),
    enabled: !!selectedTournament,
  });

  const submitScoreMutation = useMutation({
    mutationFn: (data: { hole: number; strokes: number }) =>
      tournamentApi.submitScore(selectedTournament!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['my-tournament-score'] });
      setScoreEntry({ hole: scoreEntry.hole + 1, strokes: 4 });
      alert('Score erfolgreich eingetragen!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Fehler beim Eintragen des Scores');
    },
  });

  const handleSubmitScore = () => {
    if (!selectedTournament) return;
    submitScoreMutation.mutate(scoreEntry);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return <Medal className="text-yellow-500" size={24} />;
    }
    if (rank === 2) {
      return <Medal className="text-gray-400" size={24} />;
    }
    if (rank === 3) {
      return <Medal className="text-orange-600" size={24} />;
    }
    return <span className="text-gray-600 font-bold">{rank}.</span>;
  };

  const getFormatLabel = (format: string) => {
    const labels: Record<string, string> = {
      STROKE_PLAY: 'Zählspiel',
      STABLEFORD: 'Stableford',
      MATCH_PLAY: 'Lochspiel',
    };
    return labels[format] || format;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 animate-pulse">● Live</span>;
      case 'SCHEDULED':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Geplant</span>;
      case 'COMPLETED':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Beendet</span>;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Trophy className="text-yellow-600" size={36} />
          Turniere
        </h1>
        <p className="text-gray-600">Live-Scoring und Ranglisten</p>
      </div>

      {/* Active Tournaments */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Lädt...</div>
      ) : !tournaments || tournaments.length === 0 ? (
        <div className="card text-center py-12">
          <Trophy size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Keine aktiven Turniere</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {tournaments.map((tournament: any) => (
            <button
              key={tournament.id}
              onClick={() => setSelectedTournament(tournament.id)}
              className={`card text-left hover:shadow-lg transition-all ${
                selectedTournament === tournament.id ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg mb-1">{tournament.event?.title}</h3>
                  <p className="text-sm text-gray-600">{getFormatLabel(tournament.format)}</p>
                </div>
                {getStatusBadge(tournament.status)}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={16} />
                  {format(new Date(tournament.startTime), 'dd.MM.yyyy HH:mm', { locale: de })}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Target size={16} />
                  {tournament.holes} Löcher
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users size={16} />
                  {tournament.scores?.length || 0} Teilnehmer
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Tournament Details */}
      {selectedTournament && leaderboard && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leaderboard */}
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="text-primary-600" size={24} />
                Live Rangliste
              </h2>

              {leaderboardLoading ? (
                <div className="text-center py-8 text-gray-500">Lädt...</div>
              ) : !leaderboard.leaderboard || leaderboard.leaderboard.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Noch keine Scores eingetragen</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rang</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">HCP</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Löcher</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Schläge</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">+/-</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {leaderboard.leaderboard.map((player: any, index: number) => (
                        <tr
                          key={player.memberId}
                          className={`hover:bg-gray-50 ${
                            index < 3 ? 'bg-yellow-50' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center w-8">
                              {getRankBadge(player.rank)}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold">{player.memberName}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-600">
                            {player.handicap?.toFixed(1) || '-'}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">
                            {player.holesCompleted}/{leaderboard.tournament.holes}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-lg">
                            {player.totalStrokes}
                          </td>
                          <td className={`px-4 py-3 text-center font-semibold ${
                            player.toPar > 0 ? 'text-red-600' : player.toPar < 0 ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {player.toPar > 0 ? '+' : ''}{player.toPar}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Score Entry */}
          <div className="space-y-6">
            {/* My Current Score */}
            {myScore && (
              <div className="card">
                <h3 className="font-bold mb-4">Mein Score</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Schläge gesamt:</span>
                    <span className="text-2xl font-bold">{myScore.totalStrokes || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Löcher gespielt:</span>
                    <span className="font-semibold">{myScore.holesCompleted || 0}/{leaderboard.tournament.holes}</span>
                  </div>
                  {myScore.stablefordPoints !== null && (
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-gray-600">Stableford Punkte:</span>
                      <span className="text-xl font-bold text-primary-600">{myScore.stablefordPoints}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Score Entry Form */}
            {leaderboard.tournament.status === 'IN_PROGRESS' && (
              <div className="card">
                <h3 className="font-bold mb-4">Score eintragen</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Loch</label>
                    <select
                      value={scoreEntry.hole}
                      onChange={(e) => setScoreEntry({ ...scoreEntry, hole: parseInt(e.target.value) })}
                      className="input w-full"
                    >
                      {Array.from({ length: leaderboard.tournament.holes }, (_, i) => i + 1).map((hole) => (
                        <option key={hole} value={hole}>
                          Loch {hole}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Schläge</label>
                    <input
                      type="number"
                      value={scoreEntry.strokes}
                      onChange={(e) => setScoreEntry({ ...scoreEntry, strokes: parseInt(e.target.value) })}
                      className="input w-full"
                      min="1"
                      max="20"
                    />
                  </div>

                  <button
                    onClick={handleSubmitScore}
                    disabled={submitScoreMutation.isPending}
                    className="btn btn-primary w-full"
                  >
                    {submitScoreMutation.isPending ? 'Speichert...' : 'Score eintragen'}
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    Ihre Scores werden in Echtzeit aktualisiert
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
