
export interface Repository {
  id: string;
  name: string;
  owner: string;
  is_private: boolean;
  created_at?: string;
}

export interface RepositoryPermission {
  id: string;
  repository_id: string;
  user_id: string;
  permission_type: 'admin' | 'write' | 'read' | 'view';
  created_at?: string;
}

export interface Script {
  id: string;
  title: string;
  admin_id: string;
  github_repo?: string;
  github_owner?: string;
  created_at?: string;
  updated_at?: string;
  is_private?: boolean;
  profiles: {
    username: string;
  };
}
