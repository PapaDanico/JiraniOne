export type UserRole = "resident" | "admin" | "security" | "vendor";
export type VisitorStatus = "pending" | "checked_in" | "checked_out" | "expired" | "cancelled";
export type TicketStatus = "open" | "assigned" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "plumbing" | "electrical" | "roads" | "landscaping" | "security" | "cleaning" | "other";
export type AnnouncementPriority = "info" | "warning" | "urgent";
export type EmergencyType = "medical" | "fire" | "security" | "accident" | "other";
export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled" | "completed";

export interface AuthUser {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  estateId: string | null;
  unitNumber: string | null;
  avatarUrl: string | null;
}

export interface Estate {
  id: string;
  name: string;
  location: string;
  adminId: string | null;
  subscriptionTier: "starter" | "growth" | "enterprise";
  totalUnits: number | null;
  createdAt: string;
}

export interface Visitor {
  id: string;
  residentId: string;
  estateId: string;
  name: string;
  phone: string;
  purpose: string | null;
  qrCode: string;
  status: VisitorStatus;
  expectedAt: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  checkedInById: string | null;
  smsSent: boolean;
  createdAt: string;
  updatedAt: string;
  resident?: { name: string; unitNumber: string | null };
}

export interface MaintenanceTicket {
  id: string;
  residentId: string;
  estateId: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedToId: string | null;
  photoUrls: string[];
  adminNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  resident?: { name: string; unitNumber: string | null };
  assignedTo?: { name: string } | null;
  comments?: TicketComment[];
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author?: { name: string; role: UserRole };
}

export interface Announcement {
  id: string;
  estateId: string;
  authorId: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  createdAt: string;
  author?: { name: string };
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  linkTo: string | null;
  createdAt: string;
}

export interface EmergencyAlert {
  id: string;
  userId: string;
  estateId: string;
  type: EmergencyType;
  description: string | null;
  locationLat: string | null;
  locationLng: string | null;
  status: "active" | "responding" | "resolved";
  createdAt: string;
  user?: { name: string; phone: string };
}

export interface Payment {
  id: string;
  userId: string;
  estateId: string;
  amount: string;
  mpesaRef: string | null;
  phoneUsed: string | null;
  type: string;
  status: string;
  checkoutRequestId: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FundraisingCampaign {
  id: string;
  estateId: string;
  title: string;
  description: string | null;
  goalAmount: string;
  currentAmount: string;
  deadline: string | null;
  status: "active" | "completed" | "cancelled";
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  estateId: string;
  createdById: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  recurring: boolean;
  createdAt: string;
  rsvpCount?: number;
  myRsvp?: boolean | null;
}

export interface Poll {
  id: string;
  estateId: string;
  createdById: string;
  title: string;
  description: string | null;
  anonymous: boolean;
  closesAt: string | null;
  createdAt: string;
  options?: PollOption[];
  myVoteOptionId?: string | null;
  totalVotes?: number;
}

export interface PollOption {
  id: string;
  pollId: string;
  label: string;
  voteCount: number;
}

export interface Facility {
  id: string;
  estateId: string;
  name: string;
  description: string | null;
  requiresApproval: boolean;
  maxBookingHours: number;
  createdAt: string;
}

export interface Booking {
  id: string;
  facilityId: string;
  userId: string;
  estateId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  notes: string | null;
  createdAt: string;
  facilityName?: string;
  userName?: string;
  unitNumber?: string | null;
}

export interface ServiceProvider {
  id: string;
  estateId: string;
  userId: string | null;
  name: string;
  category: string;
  phone: string;
  description: string | null;
  rating: string | null;
  ratingCount: number;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

// WebSocket event types
export type WsEventType =
  | "visitor:checked_in"
  | "visitor:checked_out"
  | "ticket:updated"
  | "ticket:created"
  | "announcement:new"
  | "emergency:alert"
  | "notification:new"
  | "payment:confirmed";

export interface WsEvent<T = unknown> {
  type: WsEventType;
  payload: T;
  estateId: string;
}

// API response wrapper
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
