
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { CompanyData } from '../types.ts';

const TABLE_NAME = 'companies';
const LOGS_TABLE = 'user_activity_logs';
const FEEDBACK_TABLE = 'feedback'; 

const SUPABASE_DEFAULT_URL = 'https://icqkgepwohiuvnphywdk.supabase.co';
const SUPABASE_DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljcWtnZXB3b2hpdXZucGh5d2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDMxODQsImV4cCI6MjA4MTA3OTE4NH0.A5kYX_M1pW4Z5DSCimwNMRpnzyNuMDYTS0t7vRAiO_A';

const getEnvVar = (key: string, altKey: string) => {
  try {
    // 1. Check window.process.env (explicitly set in index.html)
    if (typeof window !== 'undefined' && (window as any).process?.env) {
      const val = (window as any).process.env[key] || (window as any).process.env[altKey];
      if (val) return val;
    }
    // 2. Check global process.env (common in many environments)
    if (typeof process !== 'undefined' && process.env) {
      const val = process.env[key] || process.env[altKey];
      if (val) return val;
    }
    // 3. Last resort: check if it's a global variable
    if (typeof window !== 'undefined' && (window as any)[key]) return (window as any)[key];
  } catch (e) {
    console.warn(`Error reading env var ${key}:`, e);
  }
  
  // 4. Hardcoded defaults for this project
  if (key === 'SUPABASE_URL' || altKey === 'SUPABASE_URL') return SUPABASE_DEFAULT_URL;
  if (key === 'SUPABASE_KEY' || altKey === 'SUPABASE_KEY' || key === 'SUPABASE_ANON_KEY' || altKey === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') return SUPABASE_DEFAULT_KEY;
  
  return "";
};

const envUrl = getEnvVar('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
const envKey = getEnvVar('SUPABASE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY');

console.log("Supabase Env Init:", { 
  hasUrl: !!envUrl, 
  hasKey: !!envKey, 
  urlPrefix: envUrl ? envUrl.substring(0, 15) : 'none',
  keyPrefix: envKey ? envKey.substring(0, 15) : 'none',
  typeofProcess: typeof process,
  hasProcessEnv: typeof process !== 'undefined' ? !!process.env : false
});

let supabase: SupabaseClient | null = null;
let isConfiguredViaCode = false;
let configError: string | null = null;
let isOffline = false;

const isValidAnonKey = (key: string) => {
  if (!key) return false;
  const k = key.trim();
  return (k.startsWith('eyJ') && k.split('.').length === 3) || k.startsWith('sb_publishable_');
};

const initClient = (url: string, key: string) => {
  if (!url || !key) return null;
  
  const trimmedUrl = url.trim();
  const trimmedKey = key.trim();
  
  if (!isValidAnonKey(trimmedKey)) {
    configError = "Invalid Key Format: Please use the 'anon' public key from Supabase Settings > API.";
    return null;
  }

  try {
    const client = createClient(trimmedUrl, trimmedKey, {
      auth: { 
        autoRefreshToken: true, 
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'implicit'
      }
    });
    configError = null;
    return client;
  } catch (err: any) {
    configError = err.message;
    return null;
  }
};

if (envUrl && envKey) {
  supabase = initClient(envUrl, envKey);
  isConfiguredViaCode = !!supabase; 
}

export const supabaseService = {
  isConfigured: () => {
    if (!supabase) {
      // Try lazy-init if missing (helps with timing issues in published builds)
      const url = getEnvVar('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
      const key = getEnvVar('SUPABASE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
      if (url && key) {
        supabase = initClient(url, key);
        if (supabase) isConfiguredViaCode = true;
      }
    }
    return !!supabase && !isOffline;
  },
  isHardcoded: () => isConfiguredViaCode,
  getConfigError: () => configError,
  isValidAnonKey: (key: string) => isValidAnonKey(key),

  configure: (url: string, key: string) => {
    configError = null;
    isOffline = false;
    if (!url || !key) {
      configError = "URL and Key are required.";
      return;
    }
    supabase = initClient(url, key);
    if (typeof window !== 'undefined' && supabase) {
      window.localStorage.setItem('bioport_sb_url', url.trim());
      window.localStorage.setItem('bioport_sb_key', key.trim());
    }
  },

  loadFromStorage: () => {
    if (isConfiguredViaCode) return;
    try {
      if (typeof window !== 'undefined') {
        const storedUrl = window.localStorage.getItem('bioport_sb_url');
        const storedKey = window.localStorage.getItem('bioport_sb_key');
        if (storedUrl && storedKey && isValidAnonKey(storedKey)) {
          supabase = initClient(storedUrl, storedKey);
        }
      }
    } catch (e) {}
  },

  disconnect: () => {
    if (isConfiguredViaCode) return;
    supabase = null;
    configError = "Database disconnected.";
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('bioport_sb_url');
      window.localStorage.removeItem('bioport_sb_key');
    }
  },

  auth: {
    signInWithOAuth: async (provider: 'google' | 'github', providedWindow?: Window | null) => {
      // Lazy-init if supabase is missing (helps if env vars were set late)
      if (!supabase) {
        const url = getEnvVar('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
        const key = getEnvVar('SUPABASE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
        if (url && key) {
          supabase = initClient(url, key);
          if (supabase) isConfiguredViaCode = true;
        }
      }

      if (!supabase) throw new Error(configError || "Database connection missing.");
      
      const isInIframe = window.self !== window.top;
      let authWindow = providedWindow;
      
      if (isInIframe && !authWindow) {
        // Fallback if not provided
        authWindow = window.open('', '_blank', 'width=500,height=600');
        if (!authWindow) throw new Error("Popup blocked. Please enable popups.");
        authWindow.document.write('<div style="font-family:sans-serif;padding:20px;text-align:center;">Loading authentication...</div>');
      }

      try {
        const currentUrl = new URL(window.location.href);
        const redirectTo = currentUrl.origin + currentUrl.pathname;
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            skipBrowserRedirect: true,
            queryParams: { access_type: 'offline', prompt: 'consent' },
          }
        });
        if (error) throw error;
        if (data?.url) {
          if (isInIframe && authWindow) {
             authWindow.location.href = data.url;
          } else {
             window.location.href = data.url;
          }
        } else {
          if (authWindow) authWindow.close();
          throw new Error("Failed to get authentication URL from Supabase.");
        }
      } catch (err: any) {
        if (authWindow) authWindow.close();
        if (err.message?.includes('fetch')) isOffline = true;
        throw err;
      }
    },
    setSession: async (access_token: string, refresh_token: string) => {
      if (!supabase) return { data: null, error: new Error("Database not connected") };
      return await supabase.auth.setSession({ access_token, refresh_token });
    },
    signIn: async (email: string, pass: string) => {
      if (!supabase) throw new Error(configError || "Database connection missing.");
      try {
        return await supabase.auth.signInWithPassword({ email, password: pass });
      } catch (err: any) {
        if (err.message?.includes('fetch')) isOffline = true;
        throw err;
      }
    },
    signUp: async (email: string, pass: string) => {
      if (!supabase) throw new Error(configError || "Database connection missing.");
      try {
        const redirectTo = window.location.origin + window.location.pathname;
        return await supabase.auth.signUp({ 
          email, password: pass, options: { emailRedirectTo: redirectTo }
        });
      } catch (err: any) {
        if (err.message?.includes('fetch')) isOffline = true;
        throw err;
      }
    },
    resendVerification: async (email: string) => {
      if (!supabase) throw new Error("Database not connected.");
      try {
        const redirectTo = window.location.origin + window.location.pathname;
        return await supabase.auth.resend({
          type: 'signup', email: email, options: { emailRedirectTo: redirectTo }
        });
      } catch (err: any) {
        if (err.message?.includes('fetch')) isOffline = true;
        throw err;
      }
    },
    signOut: async () => {
      try { await supabase?.auth.signOut(); } catch (e) {}
    },
    getUser: async () => {
      if (!supabase || isOffline) return null;
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) return null;
        return data.user;
      } catch (err) {
        if (err instanceof TypeError && err.message.includes('fetch')) isOffline = true;
        return null;
      }
    },
    getSession: async () => {
      if (!supabase || isOffline) return null;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) return null;
        return data.session;
      } catch (err) {
        if (err instanceof TypeError && err.message.includes('fetch')) isOffline = true;
        return null;
      }
    },
    onAuthStateChange: (callback: any) => {
      if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
      return supabase.auth.onAuthStateChange(callback);
    }
  },

  logActivity: async (actionType: string, details?: any, userOverride?: User | null) => {
    if (!supabase || isOffline) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let activeUser = userOverride || user;
      await supabase.from(LOGS_TABLE).insert({
        user_id: activeUser?.id || null, 
        user_email: activeUser?.email || 'Guest',
        action_type: actionType,
        details: details || {}
      });
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) isOffline = true;
    }
  },

  submitFeedback: async (content: string, images: string[]) => {
    if (!supabase || isOffline) throw new Error("Cloud not connected or unreachable.");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from(FEEDBACK_TABLE).insert({
        content, images, user_email: user?.email || 'Guest', user_name: user?.email || 'Anonymous', recipient: 'galea.charlesa@gmail.com'
      });
      if (error) throw error;
      return true;
    } catch (err: any) {
      if (err.message?.includes('fetch')) isOffline = true;
      throw err;
    }
  },

  getChangelog: async () => {
    if (!supabase || isOffline) return [];
    try {
      const { data, error } = await supabase
        .from(FEEDBACK_TABLE)
        .select('developer_comments, comments_updated_at')
        .not('developer_comments', 'is', null)
        .order('comments_updated_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) isOffline = true;
      console.error("Changelog fetch failure", err);
      return [];
    }
  },

  getRecordCount: async (): Promise<number> => {
    if (!supabase || isOffline) return 0;
    try {
      const { count, error } = await supabase
        .from(TABLE_NAME)
        .select('*', { count: 'exact', head: true });
      if (error) return 0;
      return count || 0;
    } catch (err) {
      return 0;
    }
  },

  getUsageAnalytics: async () => {
    if (!supabase || isOffline) return null;
    try {
      // 1. Get Top 5 Actions
      const { data: actions, error: actionsError } = await supabase
        .from(LOGS_TABLE)
        .select('action_type');
      
      if (actionsError) throw actionsError;

      const actionCounts: Record<string, number> = {};
      actions.forEach((row: any) => {
        actionCounts[row.action_type] = (actionCounts[row.action_type] || 0) + 1;
      });

      const topActions = Object.entries(actionCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));

      // 2. Get Recent Logs (Last 20)
      const { data: recentLogs, error: logsError } = await supabase
        .from(LOGS_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (logsError) throw logsError;

      // 3. Unique Users (approximate based on emails in logs, since auth users table is restricted)
      const uniqueEmails = new Set(actions.map((row: any) => row.user_email || 'Guest'));

      return {
        topActions,
        recentLogs,
        totalLogs: actions.length,
        uniqueUsers: uniqueEmails.size
      };
    } catch (err) {
      console.error("Analytics fetch error:", err);
      return null;
    }
  },

  // Optimized: Parallelized Fetch with Promise Pool for massive datasets
  getCompaniesByIds: async (ids: string[], onProgress?: (current: number, total: number) => void): Promise<CompanyData[]> => {
    if (!supabase || isOffline || ids.length === 0) return [];
    try {
      // FAST PATH: For small batches (single import or small selection), fetch directly
      // This bypasses the overhead of Promise pool logic
      if (ids.length <= 50) {
         const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('id, data, last_updated')
            .in('id', ids);
         if (error) throw error;
         return (data || []).map((row: any) => ({ ...row.data, id: row.id, lastUpdated: row.last_updated }));
      }

      // HEAVY PATH: Massive concurrency for bulk loads
      const CHUNK_SIZE = 1000; 
      const CONCURRENCY_LIMIT = 20;
      
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        chunks.push(ids.slice(i, i + CHUNK_SIZE));
      }

      const allRows: any[] = [];
      let processedCount = 0;
      
      const fetchChunk = async (chunkIds: string[]) => {
         try {
           const { data, error } = await supabase!
              .from(TABLE_NAME)
              .select('id, data, last_updated')
              .in('id', chunkIds);
           if (error) throw error;
           return data || [];
         } catch (err) {
           // Simple retry logic with jitter
           await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
           try {
              const { data: retryData, error: retryError } = await supabase!
                  .from(TABLE_NAME)
                  .select('id, data, last_updated')
                  .in('id', chunkIds);
              if (retryError) throw retryError;
              return retryData || [];
           } catch (finalErr) {
              console.error("Batch failed permanently:", finalErr);
              return []; 
           }
         }
      };

      // Promise Pool Implementation (Fixed Logic)
      const executing: Promise<void>[] = [];
      for (const chunk of chunks) {
        const p = fetchChunk(chunk).then(rows => {
           if (rows.length > 0) allRows.push(...rows);
           processedCount += chunk.length;
           if (onProgress) onProgress(Math.min(processedCount, ids.length), ids.length);
        });
        
        executing.push(p);
        
        // Remove promise from executing array when it finishes
        p.then(() => {
           executing.splice(executing.indexOf(p), 1);
        });

        if (executing.length >= CONCURRENCY_LIMIT) {
           await Promise.race(executing);
        }
      }
      
      await Promise.all(executing);

      return allRows.map((row: any) => ({ ...row.data, id: row.id, lastUpdated: row.last_updated }));
    } catch (err) {
      console.error("Critical failure in getCompaniesByIds", err);
      return [];
    }
  },

  getAllCompanies: async (limit: number = 10000): Promise<CompanyData[]> => {
    if (!supabase || isOffline) return [];
    try {
      let allRows: any[] = [];
      let from = 0;
      const batchSize = 1000;
      
      while (true) {
        const remaining = limit - allRows.length;
        if (remaining <= 0) break;
        
        const currentBatchSize = Math.min(batchSize, remaining);

        console.log(`Fetching batch from ${from} to ${from + currentBatchSize - 1}`);
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .select('id, data, last_updated')
          .range(from, from + currentBatchSize - 1);
          
        if (error) {
            console.error("Supabase fetch error:", error);
            break;
        }
        if (!data || data.length === 0) break;
        
        allRows.push(...data);
        
        if (data.length < currentBatchSize) break;
        
        from += currentBatchSize;
      }
      
      return allRows.map(row => ({ ...row.data, id: row.id, lastUpdated: row.last_updated }));
    } catch (err) {
      console.error("Supabase getAllCompanies error:", err);
      if (err instanceof TypeError && err.message.includes('fetch')) isOffline = true;
      return [];
    }
  },

  searchCompanies: async (query: string, limit: number = 10000): Promise<CompanyData[]> => {
    if (!supabase || isOffline || !query.trim()) return [];
    try {
      const { data, error } = await supabase.rpc('search_companies', { query_text: query.trim() }).limit(limit);
      if (error || !data) return [];
      return data.map((row: any) => ({ ...row.data, id: row.id, lastUpdated: row.last_updated }));
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) isOffline = true;
      return [];
    }
  },

  searchCompanyMetadata: async (query: string, limit: number = 10000, onProgress?: (current: number, total: number) => void): Promise<any[]> => {
    if (!supabase || isOffline) return [];
    try {
      const cleanQuery = query.trim();
      let filterColumn = 'name'; 
      let filterValue = cleanQuery;
      
      const lower = cleanQuery.toLowerCase();
      
      if (lower.startsWith('sector:')) {
        filterColumn = 'sector';
        filterValue = cleanQuery.substring(7).trim();
      } else if (lower.startsWith('country:')) {
        filterColumn = 'country';
        filterValue = cleanQuery.substring(8).trim();
      } else if (lower.startsWith('region:')) {
        filterColumn = 'country';
        filterValue = cleanQuery.substring(7).trim();
      } else if (lower.startsWith('name:')) {
        filterColumn = 'name';
        filterValue = cleanQuery.substring(5).trim();
      }

      const BATCH_SIZE = 1000;
      const CONCURRENCY = 10;
      
      const totalBatches = Math.ceil(limit / BATCH_SIZE);
      const offsets = Array.from({length: totalBatches}, (_, k) => k * BATCH_SIZE);
      const allRows: any[] = [];
      
      const fetchBatch = async (from: number) => {
          const to = from + BATCH_SIZE - 1;
          let builder = supabase!
            .from(TABLE_NAME)
            .select('id, name, region, last_updated, sector:data->>sector, type:data->>entityType, hqAddress:data->contact->>hqAddress, fullData:data')
            .order('last_updated', { ascending: false })
            .range(from, to);

          if (filterValue) {
              if (filterColumn === 'sector') {
                builder = builder.ilike('data->>sector', `%${filterValue}%`);
              } else if (filterColumn === 'country') {
                builder = builder.or(`region.ilike.%${filterValue}%,data->contact->>hqAddress.ilike.%${filterValue}%`);
              } else {
                builder = builder.ilike('name', `%${filterValue}%`);
              }
          }
          const { data, error } = await builder;
          if (error) throw error;
          return data || [];
      };

      const executing: Promise<void>[] = [];
      
      for (const from of offsets) {
         const p = fetchBatch(from).then(data => {
             allRows.push(...data);
             if (onProgress) onProgress(allRows.length, limit);
         }).catch(e => console.warn(e));

         executing.push(p);
         const clean = p.then(() => executing.splice(executing.indexOf(clean), 1));
         
         if (executing.length >= CONCURRENCY) {
            await Promise.race(executing);
         }
      }
      
      await Promise.all(executing);
      
      return allRows.map((row: any) => ({
        id: row.id,
        name: row.name,
        region: row.region,
        sector: row.sector || 'Uncategorized',
        type: row.type || 'Corporate',
        hqAddress: row.hqAddress,
        lastUpdated: row.last_updated,
        fullData: row.fullData
      }));
    } catch (err: any) {
      if (err.message?.includes('fetch')) isOffline = true;
      return [];
    }
  },

  getBatchCompanies: async (names: string[], region: string): Promise<CompanyData[]> => {
    if (!supabase || isOffline) return [];
    const slugify = (text: string): string => text.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const ids = names.map(n => `glob__${slugify(n)}`);
    try {
      const { data, error } = await supabase.from(TABLE_NAME).select('data, last_updated').in('id', ids);
      if (error || !data) return [];
      return data.map(row => ({ ...row.data, lastUpdated: row.last_updated }));
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) isOffline = true;
      return [];
    }
  },

  saveBatchCompanies: async (companies: CompanyData[], region: string): Promise<void> => {
    if (!supabase || isOffline) return;
    const slugify = (text: string): string => text.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const rows = companies.map(c => ({ id: `glob__${slugify(c.name)}`, name: c.name, region, data: c, last_updated: new Date().toISOString() }));
    try {
      await supabase.from(TABLE_NAME).upsert(rows);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) isOffline = true;
    }
  },

  deleteCompanyById: async (id: string): Promise<{ error: any }> => {
    if (!supabase || isOffline) return { error: "Not connected" };
    try {
      return await supabase.from(TABLE_NAME).delete().eq('id', id);
    } catch (err: any) {
      if (err.message?.includes('fetch')) isOffline = true;
      return { error: err.message };
    }
  },

  testConnection: async () => {
    if (!supabase) return { success: false, message: configError || "Not configured" };
    try {
      const { error } = await supabase.from(TABLE_NAME).select('*', { count: 'exact', head: true });
      if (error) return { success: false, message: error.message };
      isOffline = false;
      return { success: true };
    } catch (err: any) {
      if (err.message?.includes('fetch')) isOffline = true;
      return { success: false, message: err.message };
    }
  },

  verifyTable: async (tableName: string) => {
    if (!supabase || isOffline) return false;
    try {
      const { error } = await supabase.from(tableName).select('*').limit(0);
      return !error;
    } catch (e) {
      return false;
    }
  }
};

supabaseService.loadFromStorage();
