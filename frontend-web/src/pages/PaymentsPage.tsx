import { useQuery } from '@tanstack/react-query';
import { paymentsApi } from '../services/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CreditCard, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function PaymentsPage() {
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['my-payments'],
    queryFn: () => paymentsApi.getMyPayments({ limit: 50 }).then((res) => res.data),
  });

  const { data: subscriptions, isLoading: subsLoading } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: () => paymentsApi.getMySubscriptions().then((res) => res.data),
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return <CheckCircle size={18} className="text-green-600" />;
      case 'FAILED':
        return <XCircle size={18} className="text-red-600" />;
      case 'PENDING':
      case 'PROCESSING':
        return <Clock size={18} className="text-yellow-600" />;
      default:
        return <Clock size={18} className="text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Erfolgreich</span>;
      case 'FAILED':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">Fehlgeschlagen</span>;
      case 'PENDING':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Ausstehend</span>;
      case 'PROCESSING':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">In Bearbeitung</span>;
      case 'REFUNDED':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">Erstattet</span>;
      default:
        return <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      EVENT_FEE: 'Event-Gebühr',
      MEMBERSHIP: 'Mitgliedsbeitrag',
      MERCHANDISE: 'Merchandise',
      SERVICE: 'Service',
      TEE_TIME: 'Tee-Time',
      OTHER: 'Sonstiges',
    };
    return labels[type] || type;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Zahlungen & Abonnements</h1>
        <p className="text-gray-600">Übersicht über Ihre Transaktionen</p>
      </div>

      {/* Active Subscriptions */}
      {!subsLoading && subscriptions && subscriptions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Aktive Abonnements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions.map((sub: any) => (
              <div key={sub.id} className="card border-2 border-primary-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{sub.plan?.name || 'Mitgliedschaft'}</h3>
                    <p className="text-sm text-gray-600">{sub.plan?.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    sub.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {sub.status === 'ACTIVE' ? 'Aktiv' : sub.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Betrag:</span>
                    <span className="font-semibold">
                      {formatAmount(sub.plan?.amount || 0, sub.plan?.currency || 'EUR')} /{' '}
                      {sub.plan?.interval === 'MONTHLY' ? 'Monat' : 'Jahr'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nächste Zahlung:</span>
                    <span className="font-semibold">
                      {format(new Date(sub.currentPeriodEnd), 'dd.MM.yyyy', { locale: de })}
                    </span>
                  </div>
                  {sub.cancelAtPeriodEnd && (
                    <div className="text-xs text-red-600 mt-2">
                      Wird am Ende der Laufzeit gekündigt
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Zahlungshistorie</h2>
        {paymentsLoading ? (
          <div className="text-center py-12 text-gray-500">Lädt...</div>
        ) : !payments?.payments || payments.payments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Noch keine Zahlungen vorhanden
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beschreibung</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Typ</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Betrag</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.payments.map((payment: any) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        {format(new Date(payment.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {payment.description || 'Zahlung'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {getPaymentTypeLabel(payment.type)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold">
                      {formatAmount(payment.amount, payment.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(payment.status)}
                        {getStatusBadge(payment.status)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
