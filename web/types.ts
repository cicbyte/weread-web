// WeRead Web 类型定义

export interface HealthDetail {
  status: string;
  message: string;
  checks?: Array<{
    name: string;
    status: string;
    error?: string;
  }>;
  uptime?: string;
  version?: string;
}

export interface User {
  vid: string;
  nickname: string;
  avatarUrl: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  vid: string;
  expire: number;
}

export interface ApiKeyItem {
  id: number;
  isActive: number;
  createdAt: string;
  lastUsed?: string;
}

export interface SyncStatus {
  id: number;
  syncType: string;
  status: string;
  startedAt: string;
  finishedAt: string;
  itemsCount: number;
  errorMsg?: string;
}

export interface SyncConfig {
  enabled: number;
  frequency: string;
  syncScope: string;
  syncTime: string;
}

export interface SyncHistory {
  total: number;
  page: number;
  size: number;
  list: SyncStatus[];
}

export interface BookInfo {
  bookId: string;
  title: string;
  author: string;
  cover: string;
  intro?: string;
  category?: string;
  publisher?: string;
  isbn?: string;
  wordCount?: number;
  newRating?: number;
  newRatingCount?: number;
}

export interface ShelfBook {
  id: number;
  bookId: string;
  title: string;
  author: string;
  cover: string;
  category: string;
  isAlbum: number;
  secret: number;
  isTop: number;
  finishReading: number;
  readUpdateTime: number;
}

export interface Note {
  id: number;
  noteType: 'highlight' | 'review';
  sourceId: string;
  chapterUid: number;
  content: string;
  rangePos?: string;
  createdAt?: string;
}

export interface ReadLongestItem {
  book: BookInfo;
  readTime: number;
}

export interface CategoryPreference {
  categoryTitle: string;
  val: number;
  readingTime: number;
  readingCount: number;
}

export interface SearchResult {
  bookId: string;
  title: string;
  author: string;
  cover: string;
  intro?: string;
  newRating?: number;
  readingCount?: number;
}
