import axios from 'axios';

// Create axios instance for API calls
export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create axios instance for auth calls (without auth header)
export const authApi = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API response interceptor
authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Auth
  login: (email: string, password: string) =>
    authApi.post('/auth/login', { email, password }),
  
  register: (userData: any) =>
    authApi.post('/auth/register', userData),
  
  forgotPassword: (email: string) =>
    authApi.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) =>
    authApi.post('/auth/reset-password', { token, password }),
  
  getCurrentUser: () =>
    api.get('/auth/me'),
  
  refreshToken: () =>
    api.post('/auth/refresh'),

  // Users
  getUsers: (params?: any) =>
    api.get('/users', { params }),
  
  getUser: (id: number) =>
    api.get(`/users/${id}`),
  
  updateProfile: (userData: any) =>
    api.put('/users/profile', userData),
  
  updatePassword: (passwordData: any) =>
    api.put('/users/password', passwordData),
  
  updateUser: (id: number, userData: any) =>
    api.put(`/users/${id}`, userData),
  
  deleteUser: (id: number) =>
    api.delete(`/users/${id}`),
  
  activateUser: (id: number, isActive: boolean) =>
    api.post(`/users/${id}/activate`, { is_active: isActive }),
  
  getUserStats: () =>
    api.get('/users/stats'),

  // Families
  getFamilies: () =>
    api.get('/families'),
  
  getFamily: (id: number) =>
    api.get(`/families/${id}`),
  
  createFamily: (familyData: any) =>
    api.post('/families', familyData),
  
  updateFamily: (id: number, familyData: any) =>
    api.put(`/families/${id}`, familyData),
  
  deleteFamily: (id: number) =>
    api.delete(`/families/${id}`),
  
  addFamilyMember: (familyId: number, memberData: any) =>
    api.post(`/families/${familyId}/members`, memberData),
  
  removeFamilyMember: (familyId: number, userId: number) =>
    api.delete(`/families/${familyId}/members/${userId}`),
  
  updateMemberPermission: (familyId: number, userId: number, permission: string) =>
    api.put(`/families/${familyId}/members/${userId}/permission`, { permission_level: permission }),

  // Persons
  getPersons: (params?: any) =>
    api.get('/persons', { params }),
  
  getPerson: (id: number) =>
    api.get(`/persons/${id}`),
  
  createPerson: (personData: any) =>
    api.post('/persons', personData),
  
  updatePerson: (id: number, personData: any) =>
    api.put(`/persons/${id}`, personData),
  
  deletePerson: (id: number) =>
    api.delete(`/persons/${id}`),
  
  getPersonTree: (id: number) =>
    api.get(`/persons/${id}/tree`),

  // Relationships
  getRelationships: (params?: any) =>
    api.get('/relationships', { params }),
  
  getRelationship: (id: number) =>
    api.get(`/relationships/${id}`),
  
  createRelationship: (relationshipData: any) =>
    api.post('/relationships', relationshipData),
  
  updateRelationship: (id: number, relationshipData: any) =>
    api.put(`/relationships/${id}`, relationshipData),
  
  deleteRelationship: (id: number) =>
    api.delete(`/relationships/${id}`),
  
  createBulkRelationships: (relationships: any[]) =>
    api.post('/relationships/bulk', { relationships }),

  // Posts
  getPosts: (params?: any) =>
    api.get('/posts', { params }),
  
  getPost: (id: number) =>
    api.get(`/posts/${id}`),
  
  createPost: (postData: any) =>
    api.post('/posts', postData),
  
  updatePost: (id: number, postData: any) =>
    api.put(`/posts/${id}`, postData),
  
  deletePost: (id: number) =>
    api.delete(`/posts/${id}`),
  
  addComment: (postId: number, commentData: any) =>
    api.post(`/posts/${postId}/comments`, commentData),
  
  deleteComment: (postId: number, commentId: number) =>
    api.delete(`/posts/${postId}/comments/${commentId}`),

  // Uploads
  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post('/uploads/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  uploadPersonPhoto: (personId: number, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post(`/uploads/person-photo/${personId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  deleteFile: (filename: string) =>
    api.delete(`/uploads/${filename}`),
  
  listFiles: () =>
    api.get('/uploads/list'),
};
