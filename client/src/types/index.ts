// User types
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'family_member' | 'visitor';

// Family types
export interface Family {
  id: number;
  name: string;
  description?: string;
  is_public: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  member_count?: number;
  members?: FamilyMember[];
}

export interface FamilyMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  permission_level: PermissionLevel;
  joined_at: string;
}

// Person types
export interface Person {
  id: number;
  first_name: string;
  last_name: string;
  maiden_name?: string;
  gender: Gender;
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  death_place?: string;
  photo_url?: string;
  biography?: string;
  is_deceased: boolean;
  family_id?: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
  family_name?: string;
  created_by_name?: string;
  relationships?: Relationship[];
  parents?: Person[];
  children?: Person[];
  spouses?: Person[];
  siblings?: Person[];
}

export type Gender = 'male' | 'female' | 'other';

// Relationship types
export interface Relationship {
  id: number;
  person1_id: number;
  person2_id: number;
  relationship_type: RelationshipType;
  relationship_subtype: RelationshipSubtype;
  marriage_date?: string;
  divorce_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  person1_first_name?: string;
  person1_last_name?: string;
  person2_first_name?: string;
  person2_last_name?: string;
}

export type RelationshipType = 'parent_child' | 'spouse' | 'sibling';
export type RelationshipSubtype = 'mother' | 'father' | 'husband' | 'wife' | 'ex_husband' | 'ex_wife' | 'brother' | 'sister';

// Post types
export interface Post {
  id: number;
  title: string;
  content: string;
  image_url?: string;
  visibility: PostVisibility;
  author_id: number;
  family_id?: number;
  likes_count: number;
  created_at: string;
  updated_at: string;
  author_first_name?: string;
  author_last_name?: string;
  family_name?: string;
  comment_count?: number;
  comments?: Comment[];
}

export type PostVisibility = 'public' | 'family' | 'admin';

// Comment types
export interface Comment {
  id: number;
  content: string;
  post_id: number;
  author_id: number;
  parent_comment_id?: number;
  created_at: string;
  updated_at: string;
  author_first_name?: string;
  author_last_name?: string;
  replies?: Comment[];
}

// Permission types
export type PermissionLevel = 'view' | 'edit' | 'admin';

// API Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CreatePersonRequest {
  first_name: string;
  last_name: string;
  maiden_name?: string;
  gender: Gender;
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  death_place?: string;
  biography?: string;
  family_id?: number;
  photo?: File;
}

export interface CreateRelationshipRequest {
  person1_id: number;
  person2_id: number;
  relationship_type: RelationshipType;
  relationship_subtype: RelationshipSubtype;
  marriage_date?: string;
  divorce_date?: string;
}

export interface CreatePostRequest {
  title: string;
  content: string;
  visibility: PostVisibility;
  family_id?: number;
  image?: File;
}

export interface CreateCommentRequest {
  content: string;
  post_id: number;
  parent_comment_id?: number;
}

// Tree visualization types
export interface TreeNode {
  id: number;
  person: Person;
  children: TreeNode[];
  spouses: TreeNode[];
  parents: TreeNode[];
  x?: number;
  y?: number;
  level?: number;
}

export interface TreeData {
  rootPerson: Person;
  familyMembers: Person[];
  relationships: Relationship[];
}

// Search and filter types
export interface PersonSearchFilters {
  name?: string;
  family_id?: number;
  gender?: Gender;
  birth_year_from?: number;
  birth_year_to?: number;
  is_deceased?: boolean;
}

export interface FamilySearchFilters {
  name?: string;
  is_public?: boolean;
  created_by?: number;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// File upload types
export interface FileUploadResponse {
  filename: string;
  url: string;
  size: number;
  mimetype: string;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

export interface PersonFormData {
  first_name: string;
  last_name: string;
  maiden_name?: string;
  gender: Gender;
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  death_place?: string;
  biography?: string;
  family_id?: number;
  photo?: File;
}

export interface FamilyFormData {
  name: string;
  description?: string;
  is_public: boolean;
}

export interface PostFormData {
  title: string;
  content: string;
  visibility: PostVisibility;
  family_id?: number;
  image?: File;
}

// Dashboard types
export interface DashboardStats {
  totalFamilies: number;
  totalPersons: number;
  totalPosts: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: number;
  type: 'person_added' | 'relationship_created' | 'post_created' | 'comment_added';
  description: string;
  created_at: string;
  user_name?: string;
}

// Admin types
export interface UserStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  admin_users: number;
  family_member_users: number;
  visitor_users: number;
  verified_users: number;
  unverified_users: number;
}

export interface RecentUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  created_at: string;
}
