import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { segmentsService } from './segments.service';

export class SegmentsController {
  async createSegment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const segment = await segmentsService.createSegment(req.body);
      res.status(201).json(segment);
    } catch (error) {
      next(error);
    }
  }

  async updateSegment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const segment = await segmentsService.updateSegment(id, req.body);
      res.json(segment);
    } catch (error) {
      next(error);
    }
  }

  async deleteSegment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await segmentsService.deleteSegment(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getSegments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const segments = await segmentsService.getSegments();
      res.json(segments);
    } catch (error) {
      next(error);
    }
  }

  async getSegmentById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const segment = await segmentsService.getSegmentById(id);
      res.json(segment);
    } catch (error) {
      next(error);
    }
  }

  async recalculateSegment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await segmentsService.recalculateSegment(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async recalculateAllSegments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const results = await segmentsService.recalculateAllSegments();
      res.json({ results });
    } catch (error) {
      next(error);
    }
  }

  async getMemberSegments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const segments = await segmentsService.getMemberSegments(req.user!.userId);
      res.json(segments);
    } catch (error) {
      next(error);
    }
  }
}

export const segmentsController = new SegmentsController();
