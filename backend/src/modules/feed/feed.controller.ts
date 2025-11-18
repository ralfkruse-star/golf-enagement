import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { feedService } from './feed.service';

export class FeedController {
  async createPost(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const post = await feedService.createPost(req.body, req.user!.userId);
      res.status(201).json(post);
    } catch (error) {
      next(error);
    }
  }

  async updatePost(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const post = await feedService.updatePost(id, req.body, req.user!.userId);
      res.json(post);
    } catch (error) {
      next(error);
    }
  }

  async deletePost(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await feedService.deletePost(id, req.user!.userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getPosts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        type: req.query.type as any,
        authorId: req.query.authorId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = await feedService.getPosts(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getPostById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const post = await feedService.getPostById(id);
      res.json(post);
    } catch (error) {
      next(error);
    }
  }

  async likePost(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await feedService.likePost(id, req.user!.userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async unlikePost(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await feedService.unlikePost(id, req.user!.userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async addComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const comment = await feedService.addComment(id, content, req.user!.userId);
      res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  }

  async deleteComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { commentId } = req.params;
      const result = await feedService.deleteComment(commentId, req.user!.userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await feedService.getStatistics();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
}

export const feedController = new FeedController();
