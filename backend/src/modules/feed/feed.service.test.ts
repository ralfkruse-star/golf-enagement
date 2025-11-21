import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedService } from './feed.service';
import { prisma } from '../../database/prisma';

// Mock dependencies
vi.mock('../../database/prisma', () => ({
  prisma: {
    feedPost: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    feedComment: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    feedLike: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../../shared/services/websocket.service', () => ({
  websocketService: {
    broadcastGlobal: vi.fn(),
  },
  WebSocketEvents: {
    FEED_POST_CREATED: 'feed:post:created',
    FEED_COMMENT_ADDED: 'feed:comment:added',
    FEED_POST_LIKED: 'feed:post:liked',
  },
}));

vi.mock('../../modules/gamification/gamification.service', () => ({
  gamificationService: {
    checkAchievements: vi.fn(),
  },
}));

vi.mock('../../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('FeedService', () => {
  let service: FeedService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FeedService();
  });

  describe('createPost', () => {
    it('should successfully create a feed post', async () => {
      const postInput = {
        content: 'Great day at the golf course!',
        type: 'GENERAL' as const,
      };

      const mockPost = {
        id: '1',
        authorId: 'member1',
        content: 'Great day at the golf course!',
        type: 'GENERAL',
        isPinned: false,
        isPublished: true,
        createdAt: new Date(),
        author: {
          id: 'member1',
          firstName: 'John',
          lastName: 'Doe',
        },
        _count: {
          likes: 0,
          comments: 0,
        },
      };

      (prisma.feedPost.create as any).mockResolvedValue(mockPost);

      const result = await service.createPost(postInput, 'member1');

      expect(result).toEqual(mockPost);
      expect(prisma.feedPost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: 'Great day at the golf course!',
            type: 'GENERAL',
            authorId: 'member1',
          }),
        })
      );
    });

    it('should create announcement post with media', async () => {
      const postInput = {
        content: 'New tournament announced!',
        type: 'ANNOUNCEMENT' as const,
        mediaUrls: ['https://example.com/image.jpg'],
      };

      const mockPost = {
        id: '1',
        authorId: 'admin1',
        content: 'New tournament announced!',
        type: 'ANNOUNCEMENT',
        mediaUrls: ['https://example.com/image.jpg'],
        isPinned: false,
        isPublished: true,
        createdAt: new Date(),
        author: {
          id: 'admin1',
          firstName: 'Admin',
          lastName: 'User',
        },
        _count: {
          likes: 0,
          comments: 0,
        },
      };

      (prisma.feedPost.create as any).mockResolvedValue(mockPost);

      const result = await service.createPost(postInput, 'admin1');

      expect(result.mediaUrls).toEqual(['https://example.com/image.jpg']);
    });
  });

  describe('likePost', () => {
    it('should successfully like a post', async () => {
      const mockPost = {
        id: 'post1',
        authorId: 'member2',
        content: 'Test post',
      };

      const mockLike = {
        postId: 'post1',
        memberId: 'member1',
        createdAt: new Date(),
      };

      (prisma.feedPost.findUnique as any).mockResolvedValue(mockPost);
      (prisma.feedLike.findUnique as any).mockResolvedValue(null);
      (prisma.feedLike.create as any).mockResolvedValue(mockLike);

      await service.likePost('post1', 'member1');

      expect(prisma.feedLike.create).toHaveBeenCalledWith({
        data: {
          postId: 'post1',
          memberId: 'member1',
        },
      });
    });

    it('should throw error if post not found', async () => {
      (prisma.feedPost.findUnique as any).mockResolvedValue(null);

      await expect(service.likePost('nonexistent', 'member1')).rejects.toThrow('Post not found');
    });

    it('should throw error if already liked', async () => {
      const mockPost = {
        id: 'post1',
        authorId: 'member2',
        content: 'Test post',
      };

      (prisma.feedPost.findUnique as any).mockResolvedValue(mockPost);
      (prisma.feedLike.findUnique as any).mockResolvedValue({
        postId: 'post1',
        memberId: 'member1',
      });

      await expect(service.likePost('post1', 'member1')).rejects.toThrow('Already liked');
    });
  });

  describe('unlikePost', () => {
    it('should successfully unlike a post', async () => {
      const mockLike = {
        postId: 'post1',
        memberId: 'member1',
      };

      (prisma.feedLike.findUnique as any).mockResolvedValue(mockLike);
      (prisma.feedLike.delete as any).mockResolvedValue(mockLike);

      await service.unlikePost('post1', 'member1');

      expect(prisma.feedLike.delete).toHaveBeenCalledWith({
        where: {
          postId_memberId: {
            postId: 'post1',
            memberId: 'member1',
          },
        },
      });
    });

    it('should throw error if like not found', async () => {
      (prisma.feedLike.findUnique as any).mockResolvedValue(null);

      await expect(service.unlikePost('post1', 'member1')).rejects.toThrow('Like not found');
    });
  });

  describe('addComment', () => {
    it('should successfully add a comment', async () => {
      const mockPost = {
        id: 'post1',
        authorId: 'member2',
        content: 'Test post',
      };

      const mockComment = {
        id: 'comment1',
        postId: 'post1',
        memberId: 'member1',
        content: 'Great post!',
        createdAt: new Date(),
        author: {
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      (prisma.feedPost.findUnique as any).mockResolvedValue(mockPost);
      (prisma.feedComment.create as any).mockResolvedValue(mockComment);

      const result = await service.addComment('post1', 'member1', 'Great post!');

      expect(result).toEqual(mockComment);
      expect(prisma.feedComment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            postId: 'post1',
            memberId: 'member1',
            content: 'Great post!',
          },
        })
      );
    });

    it('should throw error if post not found', async () => {
      (prisma.feedPost.findUnique as any).mockResolvedValue(null);

      await expect(service.addComment('nonexistent', 'member1', 'Comment')).rejects.toThrow(
        'Post not found'
      );
    });
  });

  describe('getFeedPosts', () => {
    it('should return paginated feed posts', async () => {
      const mockPosts = [
        {
          id: '1',
          content: 'Post 1',
          createdAt: new Date('2025-01-20'),
        },
        {
          id: '2',
          content: 'Post 2',
          createdAt: new Date('2025-01-19'),
        },
      ];

      (prisma.feedPost.findMany as any).mockResolvedValue(mockPosts);
      (prisma.feedPost.count as any).mockResolvedValue(2);

      const result = await service.getFeedPosts({ page: 1, limit: 10 });

      expect(result.posts).toEqual(mockPosts);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });
});
