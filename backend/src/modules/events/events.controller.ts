import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { eventsService } from './events.service';

export class EventsController {
  async createEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const event = await eventsService.createEvent(req.body, req.user!.userId);
      res.status(201).json(event);
    } catch (error) {
      next(error);
    }
  }

  async updateEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const event = await eventsService.updateEvent(id, req.body);
      res.json(event);
    } catch (error) {
      next(error);
    }
  }

  async publishEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const event = await eventsService.publishEvent(id);
      res.json(event);
    } catch (error) {
      next(error);
    }
  }

  async getEvents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        type: req.query.type as any,
        status: req.query.status as any,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = await eventsService.getEvents(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getEventById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const event = await eventsService.getEventById(id);
      res.json(event);
    } catch (error) {
      next(error);
    }
  }

  async registerForEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { comment } = req.body;
      const registration = await eventsService.registerForEvent(
        id,
        req.user!.userId,
        comment
      );
      res.status(201).json(registration);
    } catch (error) {
      next(error);
    }
  }

  async cancelRegistration(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await eventsService.cancelRegistration(id, req.user!.userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await eventsService.deleteEvent(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await eventsService.getStatistics();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
}

export const eventsController = new EventsController();
