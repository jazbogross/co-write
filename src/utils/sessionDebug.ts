
export const checkSessionStorage = () => {
  const storageKeys = [];
  
  // Check localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      storageKeys.push({
        type: 'localStorage',
        key,
        value: key.includes('supabase') ? 'REDACTED (SENSITIVE)' : localStorage.getItem(key)
      });
    }
  }
  
  // Check sessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key) {
      storageKeys.push({
        type: 'sessionStorage',
        key,
        value: key.includes('supabase') ? 'REDACTED (SENSITIVE)' : sessionStorage.getItem(key)
      });
    }
  }
  
  console.log('🔑 Session Debug: Storage keys found:', storageKeys);
  
  // Specifically check for Supabase auth token
  const supabaseToken = localStorage.getItem('supabase.auth.token');
  console.log('🔑 Session Debug: Supabase auth token exists:', !!supabaseToken);
  
  return {
    storageKeys,
    hasSupabaseToken: !!supabaseToken
  };
};
