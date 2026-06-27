/**
 * Shared types for Website Recovery Tool
 */

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // hashed, omitted in responses
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export type DomainStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'blocked';

export interface Domain {
  id: string;
  domain: string; // normalized hostname (e.g. google.com)
  status: DomainStatus;
  processedBy?: string; // User ID
  isBulk: boolean;
  bulkBatchId?: string; // Grouping ID for bulk imports
  retryCount: number;
  errorMessage?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialLinks {
  facebook?: string;
  linkedin?: string;
  instagram?: string;
}

export interface RecoveredContact {
  id: string;
  domainId: string; // references Domain
  companyName?: string;
  phones: string[];
  emails: string[];
  whatsappNumbers: string[];
  address?: string;
  websiteUrl: string;
  socialLinks: SocialLinks;
  source: string;
  status?: 'ACTIVE' | 'ARCHIVED' | 'PUBLIC_RECOVERY' | 'NO_DATA' | 'FAILED' | 'BLOCKED';
  confidence: number; // 0 to 100
  recoveryTimeMs?: number;
  sourcesChecked?: string[];
  snapshotsVisited?: number;
  pagesCrawled?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchHistory {
  id: string;
  userId: string;
  domain: string;
  resultId?: string; // references RecoveredContact if found
  searchedAt: string;
}

export interface DashboardStats {
  totalDomains: number;
  totalContacts: number;
  successRate: number; // percentage
  statusCounts: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    blocked: number;
  };
}
