import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../services/api';
import { Send, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function NotificationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll().then((res) => res.data),
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'SCHEDULED':
        return <Clock className="text-blue-600" size={20} />;
      case 'FAILED':
        return <XCircle className="text-red-600" size={20} />;
      default:
        return <Send className="text-gray-600" size={20} />;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Push-Benachrichtigungen</h1>
        <button className="btn btn-primary">+ Neue Benachrichtigung</button>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Lädt...</div>
        ) : (
          <div className="space-y-3">
            {data?.notifications?.map((notification: any) => (
              <div
                key={notification.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(notification.status)}
                    <div className="flex-1">
                      <h4 className="font-semibold">{notification.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{notification.body}</p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>{notification.totalRecipients} Empfänger</span>
                        {notification.sentAt && (
                          <span>
                            Gesendet: {new Date(notification.sentAt).toLocaleString('de-DE')}
                          </span>
                        )}
                        {notification.successCount > 0 && (
                          <span className="text-green-600">
                            ✓ {notification.successCount} erfolgreich
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    notification.status === 'SENT' ? 'bg-green-100 text-green-700' :
                    notification.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                    notification.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {notification.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
