import { useQuery } from '@tanstack/react-query';
import { membersApi, eventsApi, notificationsApi, feedApi } from '../services/api';
import { Users, Calendar, Bell, MessageSquare } from 'lucide-react';

export default function DashboardPage() {
  const { data: memberStats } = useQuery({
    queryKey: ['members', 'statistics'],
    queryFn: () => membersApi.getStatistics().then((res) => res.data),
  });

  const { data: eventStats } = useQuery({
    queryKey: ['events', 'statistics'],
    queryFn: () => eventsApi.getStatistics().then((res) => res.data),
  });

  const { data: notificationStats } = useQuery({
    queryKey: ['notifications', 'statistics'],
    queryFn: () => notificationsApi.getStatistics().then((res) => res.data),
  });

  const { data: feedStats } = useQuery({
    queryKey: ['feed', 'statistics'],
    queryFn: () => feedApi.getStatistics().then((res) => res.data),
  });

  const stats = [
    {
      label: 'Mitglieder',
      value: memberStats?.active || 0,
      total: memberStats?.total || 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Events',
      value: eventStats?.upcoming || 0,
      total: eventStats?.total || 0,
      icon: Calendar,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Push Notifications',
      value: notificationStats?.sent || 0,
      total: notificationStats?.total || 0,
      icon: Bell,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Feed Posts',
      value: feedStats?.totalPosts || 0,
      total: feedStats?.totalComments || 0,
      icon: MessageSquare,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">
                  von {stat.total} gesamt
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={stat.color} size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Mitgliederverteilung</h3>
          {memberStats && (
            <div className="space-y-2">
              {Object.entries(memberStats.byType || {}).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-gray-700">{type}</span>
                  <span className="font-semibold">{count as number}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Letzte Aktivität</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• {memberStats?.recentLogins || 0} Logins (30 Tage)</p>
            <p>• {eventStats?.upcoming || 0} anstehende Events</p>
            <p>• {notificationStats?.scheduled || 0} geplante Benachrichtigungen</p>
            <p>• {feedStats?.totalLikes || 0} Feed Likes gesamt</p>
          </div>
        </div>
      </div>
    </div>
  );
}
