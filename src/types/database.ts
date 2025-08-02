export interface User {
  id: string;
  email: string;
  phone?: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Channel {
  id: string;
  user_id: string;
  handle: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  cover_url?: string;
  follower_count: number;
  following_count: number;
  biglio_count: number;
  is_primary: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Biglio {
  id: string;
  channel_id: string;
  title: string;
  description?: string;
  cover_url?: string;
  total_chapters: number;
  total_duration_seconds: number;
  genre?: string;
  tags: string[];
  play_count: number;
  like_count: number;
  comment_count: number;
  save_count: number;
  share_count: number;
  is_published: boolean;
  is_featured: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  biglio_id: string;
  title: string;
  content?: string;
  chapter_number: number;
  order_index: number;
  audio_url?: string;
  duration_seconds: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Like {
  id: string;
  user_id: string;
  biglio_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  biglio_id: string;
  chapter_id?: string;
  parent_comment_id?: string;
  content: string;
  like_count: number;
  reply_count: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface Save {
  id: string;
  user_id: string;
  biglio_id: string;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface ListeningHistory {
  id: string;
  user_id: string;
  biglio_id: string;
  chapter_id?: string;
  position_seconds: number;
  completed: boolean;
  last_listened_at: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  usage_count: number;
  created_at: string;
}

export interface BiglioTag {
  biglio_id: string;
  tag_id: string;
  created_at: string;
}

export interface AudioJob {
  id: string;
  chapter_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audio_url?: string;
  duration_seconds?: number;
  error_message?: string;
  voice_type?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// Helper types for API responses
export interface BookWithChannel extends Biglio {
  channel: Channel;
}

export interface ChapterWithAudioJob extends Chapter {
  audio_job?: AudioJob;
}

export interface CommentWithUser extends Comment {
  user: Pick<User, 'id' | 'display_name' | 'avatar_url'>;
  replies?: CommentWithUser[];
}

// Form types
export interface CreateBiglioData {
  title: string;
  description?: string;
  genre?: string;
  tags?: string[];
  cover_url?: string;
}

export interface UpdateBiglioData extends Partial<CreateBiglioData> {
  is_published?: boolean;
}

export interface CreateChapterData {
  title: string;
  content?: string;
  chapter_number: number;
  order_index: number;
}

export interface UpdateChapterData extends Partial<CreateChapterData> {
  is_published?: boolean;
}