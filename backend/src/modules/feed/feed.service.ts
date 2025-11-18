import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/middleware/error.middleware';
import { FeedPostType } from '@prisma/client';
import { logger } from '../../config/logger';

interface CreatePostInput {
  content: string;
  type?: FeedPostType;
  mediaUrls?: string[];
  isPinned?: boolean;
  targetSegmentIds?: string[];
}

interface UpdatePostInput {
  content?: string;
  type?: FeedPostType;
  mediaUrls?: string[];
  isPinned?: boolean;
  isPublished?: boolean;
}

export class FeedService {
  /**
   * Create a new feed post
   */
  async createPost(input: CreatePostInput, authorId: string) {
    const post = await prisma.feedPost.create({
      data: {
        content: input.content,
        type: input.type || 'GENERAL',
        mediaUrls: input.mediaUrls || [],
        isPinned: input.isPinned || false,
        targetSegmentIds: input.targetSegmentIds || [],
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            membershipType: true,
          },
        },
      },
    });

    logger.info(`Feed post created: ${post.id} by ${authorId}`);

    return post;
  }

  /**
   * Update a feed post
   */
  async updatePost(postId: string, input: UpdatePostInput, userId: string) {
    const existingPost = await prisma.feedPost.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      throw new AppError(404, 'Post not found');
    }

    // Only author can update (unless admin - TODO: add role check)
    if (existingPost.authorId !== userId) {
      throw new AppError(403, 'You can only edit your own posts');
    }

    const post = await prisma.feedPost.update({
      where: { id: postId },
      data: input,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(`Feed post updated: ${post.id}`);

    return post;
  }

  /**
   * Delete a feed post (soft delete)
   */
  async deletePost(postId: string, userId: string) {
    const post = await prisma.feedPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new AppError(404, 'Post not found');
    }

    // Only author can delete (unless admin)
    if (post.authorId !== userId) {
      throw new AppError(403, 'You can only delete your own posts');
    }

    await prisma.feedPost.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });

    logger.info(`Feed post deleted: ${postId}`);

    return { message: 'Post deleted successfully' };
  }

  /**
   * Get feed posts with pagination
   */
  async getPosts(filters?: {
    type?: FeedPostType;
    authorId?: string;
    limit?: number;
    offset?: number;
  }) {
    const { type, authorId, limit = 20, offset = 0 } = filters || {};

    const where: any = {
      deletedAt: null,
      isPublished: true,
    };

    if (type) where.type = type;
    if (authorId) where.authorId = authorId;

    const [posts, total] = await Promise.all([
      prisma.feedPost.findMany({
        where,
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              membershipType: true,
            },
          },
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
      }),
      prisma.feedPost.count({ where }),
    ]);

    return {
      posts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get a single post by ID with comments
   */
  async getPostById(postId: string) {
    const post = await prisma.feedPost.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            membershipType: true,
          },
        },
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        likes: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!post || post.deletedAt) {
      throw new AppError(404, 'Post not found');
    }

    return post;
  }

  /**
   * Like a post
   */
  async likePost(postId: string, memberId: string) {
    const post = await prisma.feedPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new AppError(404, 'Post not found');
    }

    // Check if already liked
    const existingLike = await prisma.feedLike.findUnique({
      where: {
        postId_memberId: { postId, memberId },
      },
    });

    if (existingLike) {
      throw new AppError(400, 'Post already liked');
    }

    // Create like
    await prisma.feedLike.create({
      data: {
        postId,
        memberId,
      },
    });

    // Increment like count
    await prisma.feedPost.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 } },
    });

    logger.info(`Post ${postId} liked by ${memberId}`);

    return { message: 'Post liked successfully' };
  }

  /**
   * Unlike a post
   */
  async unlikePost(postId: string, memberId: string) {
    const like = await prisma.feedLike.findUnique({
      where: {
        postId_memberId: { postId, memberId },
      },
    });

    if (!like) {
      throw new AppError(404, 'Like not found');
    }

    // Delete like
    await prisma.feedLike.delete({
      where: {
        postId_memberId: { postId, memberId },
      },
    });

    // Decrement like count
    await prisma.feedPost.update({
      where: { id: postId },
      data: { likeCount: { decrement: 1 } },
    });

    logger.info(`Post ${postId} unliked by ${memberId}`);

    return { message: 'Post unliked successfully' };
  }

  /**
   * Add a comment to a post
   */
  async addComment(postId: string, content: string, authorId: string) {
    const post = await prisma.feedPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new AppError(404, 'Post not found');
    }

    const comment = await prisma.feedComment.create({
      data: {
        postId,
        content,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Increment comment count
    await prisma.feedPost.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    });

    logger.info(`Comment added to post ${postId} by ${authorId}`);

    return comment;
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.feedComment.findUnique({
      where: { id: commentId },
      include: { post: true },
    });

    if (!comment || comment.deletedAt) {
      throw new AppError(404, 'Comment not found');
    }

    // Only author can delete
    if (comment.authorId !== userId) {
      throw new AppError(403, 'You can only delete your own comments');
    }

    await prisma.feedComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    // Decrement comment count
    await prisma.feedPost.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    });

    logger.info(`Comment ${commentId} deleted`);

    return { message: 'Comment deleted successfully' };
  }

  /**
   * Get feed statistics
   */
  async getStatistics() {
    const [totalPosts, totalComments, totalLikes] = await Promise.all([
      prisma.feedPost.count({ where: { deletedAt: null } }),
      prisma.feedComment.count({ where: { deletedAt: null } }),
      prisma.feedLike.count(),
    ]);

    // Most active posters
    const topPosters = await prisma.feedPost.groupBy({
      by: ['authorId'],
      where: { deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Get author details
    const authorIds = topPosters.map(p => p.authorId);
    const authors = await prisma.member.findMany({
      where: { id: { in: authorIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    const topPostersWithDetails = topPosters.map(poster => ({
      author: authors.find(a => a.id === poster.authorId),
      postCount: poster._count.id,
    }));

    return {
      totalPosts,
      totalComments,
      totalLikes,
      topPosters: topPostersWithDetails,
    };
  }
}

export const feedService = new FeedService();
