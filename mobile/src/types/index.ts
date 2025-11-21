/**
 * Shared Types for Golf Engagement Mobile App
 */

export type MembershipType = 'FULL' | 'JUNIOR' | 'SENIOR' | 'GUEST' | 'HONORARY' | 'TRIAL';
export type MembershipStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
export type UserRole = 'MEMBER' | 'ADMIN' | 'SUPER_ADMIN';
export type EventType = 'TOURNAMENT' | 'TRAINING' | 'SOCIAL' | 'MEETING' | 'OTHER';
export type EventRegistrationStatus = 'CONFIRMED' | 'PENDING' | 'WAITLIST' | 'CANCELLED';
export type FeedPostType = 'GENERAL' | 'ANNOUNCEMENT' | 'EVENT' | 'ACHIEVEMENT';

export interface Member {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  membershipType: MembershipType;
  membershipStatus: MembershipStatus;
  membershipNumber: string;
  role: UserRole;
  handicap?: number;
  phone?: string;
  birthDate?: string;
  profileImage?: string;
  joinDate?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  membershipType: MembershipType;
  birthDate?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  type: EventType;
  startDate: string;
  endDate: string;
  location?: string;
  maxParticipants: number;
  currentParticipants: number;
  registrationDeadline?: string;
  isPublic: boolean;
  requiresApproval: boolean;
  isPublished: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  memberId: string;
  status: EventRegistrationStatus;
  registeredAt: string;
  event?: Event;
  member?: Member;
}

export interface FeedPost {
  id: string;
  authorId: string;
  content: string;
  type: FeedPostType;
  mediaUrls?: string[];
  isPinned: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  _count: {
    likes: number;
    comments: number;
  };
  isLiked?: boolean;
}

export interface FeedComment {
  id: string;
  postId: string;
  memberId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserPersona {
  type: 'member' | 'beginner';
  label: string;
  description: string;
  features: string[];
}
