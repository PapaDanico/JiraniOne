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
  smsSent: boolean;
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
  iHaveVoted?: boolean;
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

export type ParcelStatus = "expected" | "at_gate" | "collected" | "returned";
export type ClassifiedCategory = "sell" | "buy" | "give" | "service";

export interface Parcel {
  id: string;
  estateId: string;
  residentId: string;
  description: string;
  trackingRef: string | null;
  sender: string | null;
  status: ParcelStatus;
  receivedAt: string | null;
  collectedAt: string | null;
  receivedById: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  resident?: { name: string; unitNumber: string | null };
  receivedBy?: { name: string } | null;
}

export interface EstateDocument {
  id: string;
  estateId: string;
  uploadedById: string;
  title: string;
  fileUrl: string;
  fileType: string | null;
  createdAt: string;
}

export interface Classified {
  id: string;
  estateId: string;
  userId: string;
  title: string;
  description: string;
  price: string | null;
  category: ClassifiedCategory;
  status: "active" | "sold" | "closed";
  contactPhone: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { name: string; unitNumber: string | null };
}

export interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  description: string;
  code: number;
  windSpeed: number;
  rainProb: number;
  high: number;
  low: number;
  location: string;
}

export interface TrafficData {
  durationMins: number;
  normalMins: number;
  distanceKm: number;
  status: "clear" | "moderate" | "heavy";
  updatedAt: string;
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

// ─── Carpooling ───────────────────────────────────────────────────────────────

export interface CarpoolOffer {
  id: string;
  estateId: string;
  driverId: string;
  origin: string;
  destination: string;
  departureTime: string;
  seatsTotal: number;
  seatsAvailable: number;
  fare: string | null;
  notes: string | null;
  status: "active" | "full" | "cancelled" | "completed";
  createdAt: string;
  updatedAt: string;
  driver?: { name: string; unitNumber: string | null };
  myBooking?: { id: string; status: string } | null;
}

export interface CarpoolBooking {
  id: string;
  offerId: string;
  passengerId: string;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
  passenger?: { name: string; unitNumber: string | null };
}

// ─── Chama ────────────────────────────────────────────────────────────────────

export interface Chama {
  id: string;
  estateId: string;
  adminId: string;
  name: string;
  description: string | null;
  contributionAmount: string;
  frequency: "weekly" | "monthly";
  status: "active" | "paused" | "dissolved";
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  totalContributed?: number;
  myMembership?: { id: string; role: string } | null;
  myContributions?: ChamaContribution[];
}

export interface ChamaContribution {
  id: string;
  chamaId: string;
  userId: string;
  amount: string;
  periodLabel: string;
  mpesaRef: string | null;
  paidAt: string;
  createdAt: string;
  user?: { name: string; unitNumber: string | null };
}

// ─── Admin Analytics ──────────────────────────────────────────────────────────

export interface EstateAnalytics {
  residents: { total: number; byRole: Record<string, number> };
  payments: {
    totalCollected: number;
    monthlyTotals: { month: string; total: number }[];
    byType: Record<string, number>;
    levyStatus: {
      paidCount: number;
      totalResidents: number;
      unpaidResidents: { id: string; name: string; unitNumber: string | null }[];
    };
  };
  maintenance: { total: number; open: number; inProgress: number; resolved: number; byCategory: Record<string, number> };
  visitors: { total: number; thisMonth: number };
  parcels: { atGate: number; thisMonth: number };
  emergency: { active: number; thisMonth: number };
}
