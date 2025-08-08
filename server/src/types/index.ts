// User types
export interface User {
  id: number;
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  email_verified: boolean;
  reset_token?: string;
  reset_token_expires?: Date;
  created_at: Date;
  updated_at: Date;
}

export type UserRole = 'admin' | 'family_member' | 'visitor';

// Family types
export interface Family {
  id: number;
  name: string;
  description?: string;
  is_public: boolean;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
  created_by_user?: User;
  member_count?: number;
}

// Person types
export interface Person {
  id: number;
  first_name: string;
  last_name: string;
  maiden_name?: string;
  gender: Gender;
  birth_date?: Date;
  death_date?: Date;
  birth_place?: string;
  death_place?: string;
  photo_url?: string;
  biography?: string;
  is_deceased: boolean;
  family_id?: number;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
  family?: Family;
  created_by_user?: User;
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
  marriage_date?: Date;
  divorce_date?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  person1?: Person;
  person2?: Person;
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
  created_at: Date;
  updated_at: Date;
  author?: User;
  family?: Family;
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
  created_at: Date;
  updated_at: Date;
  author?: User;
  post?: Post;
  parent_comment?: Comment;
  replies?: Comment[];
}

// User Family Permission types
export interface UserFamilyPermission {
  id: number;
  user_id: number;
  family_id: number;
  permission_level: PermissionLevel;
  created_at: Date;
  updated_at: Date;
  user?: User;
  family?: Family;
}

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
  root: TreeNode;
  nodes: TreeNode[];
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

// Email types
export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// JWT payload
export interface JWTPayload {
  userId: number;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}
