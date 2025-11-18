import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { membersService } from './members.service';

export class MembersController {
  async getMembers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        membershipType: req.query.membershipType as any,
        membershipStatus: req.query.membershipStatus as any,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = await membersService.getMembers(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getMemberById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const member = await membersService.getMemberById(id);
      res.json(member);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const member = await membersService.getMemberById(req.user!.userId);
      res.json(member);
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const member = await membersService.updateMember(req.user!.userId, req.body);
      res.json(member);
    } catch (error) {
      next(error);
    }
  }

  async updateMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const member = await membersService.updateMember(id, req.body);
      res.json(member);
    } catch (error) {
      next(error);
    }
  }

  async updateMemberStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const member = await membersService.updateMemberStatus(id, status);
      res.json(member);
    } catch (error) {
      next(error);
    }
  }

  async deleteMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await membersService.deleteMember(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await membersService.getStatistics();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
}

export const membersController = new MembersController();
