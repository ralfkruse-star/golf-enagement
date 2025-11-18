import { useQuery } from '@tanstack/react-query';
import { feedApi } from '../services/api';
import { Heart, MessageCircle, Pin } from 'lucide-react';

export default function FeedPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['feed'],
    queryFn: () => feedApi.getAll().then((res) => res.data),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Social Feed</h1>
        <button className="btn btn-primary">+ Neuer Post</button>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {isLoading ? (
          <div className="card text-center py-12 text-gray-500">Lädt...</div>
        ) : (
          data?.posts?.map((post: any) => (
            <div key={post.id} className="card">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">
                  {post.author.firstName[0]}{post.author.lastName[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">
                      {post.author.firstName} {post.author.lastName}
                    </h4>
                    {post.isPinned && (
                      <Pin size={16} className="text-primary-600" />
                    )}
                    <span className="text-xs text-gray-500">
                      • {new Date(post.createdAt).toLocaleDateString('de-DE')}
                    </span>
                  </div>

                  <p className="mt-2 text-gray-700 whitespace-pre-wrap">{post.content}</p>

                  <div className="flex gap-6 mt-4 text-sm text-gray-600">
                    <button className="flex items-center gap-2 hover:text-primary-600">
                      <Heart size={18} />
                      {post._count?.likes || 0}
                    </button>
                    <button className="flex items-center gap-2 hover:text-primary-600">
                      <MessageCircle size={18} />
                      {post._count?.comments || 0}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
