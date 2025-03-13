
export interface Repository {
  id: string;
  name: string;
  owner: string;
  is_private: boolean;
  created_at?: string;
}

export interface User {
  id: string;
  email?: string;
  username?: string;
}

export interface Permission {
  id: string;
  user_id: string;
  repository_id: string;
  permission_type: 'view' | 'edit' | 'admin';
  user?: User;
}
