import { useQuery } from '@tanstack/react-query';
import { membersApi } from '../services/api';
import { Search, Filter } from 'lucide-react';

export default function MembersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.getAll().then((res) => res.data),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mitglieder</h1>
        <button className="btn btn-primary">+ Neues Mitglied</button>
      </div>

      <div className="card mb-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Suche nach Name oder Email..."
              className="input pl-10"
            />
          </div>
          <button className="btn btn-secondary flex items-center gap-2">
            <Filter size={18} />
            Filter
          </button>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Lädt...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 font-semibold">Typ</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Handicap</th>
                </tr>
              </thead>
              <tbody>
                {data?.members?.map((member: any) => (
                  <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{member.firstName} {member.lastName}</td>
                    <td className="py-3 px-4 text-gray-600">{member.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {member.membershipType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        member.membershipStatus === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {member.membershipStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">{member.handicap || '-'}</td>
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
