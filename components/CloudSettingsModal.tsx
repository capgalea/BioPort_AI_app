import { Cloud, Save, X, AlertCircle, CheckCircle2, Trash2, Database, Copy, Check, ChevronDown, ChevronUp, Globe, Star, MessageSquare, Mail, Key, Code2, RefreshCw, Activity, ExternalLink, ShieldAlert, Terminal, Info, ExternalLink as LinkIcon, ShieldCheck, Move } from 'lucide-react';
import { supabaseService } from '../services/supabaseService.ts';
import React, { useState, useEffect, useRef } from 'react';

interface CloudSettingsModalProps {
  onClose: () => void;
  onConfigured: () => void;
}

const SETUP_SQL = `-- 1. CREATE TABLES
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_name text,
  user_email text,
  content text not null,
  images jsonb,
  recipient text,
  developer_comments text,
  comments_updated_at timestamptz,
  submitted_at timestamptz default now()
);

create table if not exists public.companies (
  id text primary key,
  name text not null,
  region text not null,
  data jsonb not null,
  last_updated timestamptz default now()
);

create table if not exists public.user_activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_email text,
  action_type text not null,
  details jsonb,
  created_at timestamptz default now()
);

-- 2. CREATE DEEP SEARCH FUNCTION
create or replace function public.search_companies(query_text text)
returns table (
  id text,
  name text,
  region text,
  data jsonb,
  last_updated timestamptz
) 
language sql
security definer
set search_path = public
as $$
  select *
  from companies
  where 
    name ilike '%' || query_text || '%' 
    or region ilike '%' || query_text || '%'
    or data->>'sector' ilike '%' || query_text || '%'
    or data::text ilike '%' || query_text || '%';
$$;

-- 3. ENABLE ROW LEVEL SECURITY
alter table public.feedback enable row level security;
alter table public.companies enable row level security;
alter table public.user_activity_logs enable row level security;

-- 4. CREATE POLICIES
create policy "Public Insert Feedback" on public.feedback for insert to anon, authenticated with check (true);
create policy "Public Select Feedback" on public.feedback for select to anon, authenticated using (true);
create policy "Public Read Access" on public.companies for select to anon, authenticated using (true);
create policy "Public Upsert Access" on public.companies for insert to anon, authenticated with check (true);
create policy "Public Update Access" on public.companies for update to anon, authenticated using (true);
create policy "Public Delete Access" on public.companies for delete to anon, authenticated using (true);
create policy "Public Insert Logs" on public.user_activity_logs for insert to anon, authenticated with check (true);

-- 5. GRANT PERMISSIONS
grant all on table public.feedback to anon, authenticated, postgres, service_role;
grant all on table public.companies to anon, authenticated, postgres, service_role;
grant all on table public.user_activity_logs to anon, authenticated, postgres, service_role;
grant execute on function public.search_companies(text) to anon, authenticated;
`;

const CloudSettingsModal: React.FC<CloudSettingsModalProps> = ({ onClose, onConfigured }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'sql' | 'diagnostics'>('config');
  const [copied, setCopied] = useState<string | null>(null);
  
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  const redirectUrl = window.location.origin + window.location.pathname;

  useEffect(() => {
    setPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    if (supabaseService.isConfigured()) {
      setIsConfigured(true);
      try {
        const storedUrl = localStorage.getItem('bioport_sb_url');
        const storedKey = localStorage.getItem('bioport_sb_key');
        if (storedUrl) setUrl(storedUrl);
        if (storedKey) setKey(storedKey);
      } catch (e) {
        console.warn("Could not read Supabase credentials from localStorage", e);
      }
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPos({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y
        });
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - (rect.left + rect.width / 2),
        y: e.clientY - (rect.top + rect.height / 2)
      };
      setIsDragging(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('testing');
    if (key.startsWith('sb_publishable_')) {
      setStatus('error');
      setErrorMsg("Error: You are using a 'Management Key'. Browser apps require the 'anon' public key found in Settings > API.");
      return;
    }
    supabaseService.configure(url, key);
    const result = await supabaseService.testConnection();
    if (result.success) {
      setStatus('success');
      onConfigured();
      setTimeout(() => onClose(), 1500);
    } else {
      setStatus('error');
      setErrorMsg(result.message || 'Connection failed.');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm pointer-events-none">
      <div 
        ref={modalRef}
        style={{ 
          left: pos.x, 
          top: pos.y, 
          transform: 'translate(-50%, -50%)',
          position: 'fixed'
        }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] select-none pointer-events-auto"
      >
        <div 
          onMouseDown={handleDragStart}
          className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center cursor-move active:cursor-grabbing hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2 pointer-events-none">
            <Cloud className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="font-black text-slate-800 uppercase tracking-tighter">Cloud Infrastructure Node</h2>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                <Move className="w-2.5 h-2.5" /> Move
              </div>
            </div>
          </div>
          <button onMouseDown={(e) => e.stopPropagation()} onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="flex border-b border-slate-100 bg-white">
          <button onClick={() => setActiveTab('config')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === 'config' ? 'text-blue-600 border-blue-600 bg-blue-50/30' : 'text-slate-400 border-transparent'}`}>Keys</button>
          <button onClick={() => setActiveTab('diagnostics')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === 'diagnostics' ? 'text-blue-600 border-blue-600 bg-blue-50/30' : 'text-slate-400 border-transparent'}`}>Auth Fix</button>
          <button onClick={() => setActiveTab('sql')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === 'sql' ? 'text-blue-600 border-blue-600 bg-blue-50/30' : 'text-slate-400 border-transparent'}`}>Database</button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar select-text">
          {activeTab === 'config' && (
            <div className="space-y-6">
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                 <div className="flex items-center gap-2 mb-4 text-amber-800">
                    <ShieldCheck className="w-5 h-5" />
                    <h4 className="font-black text-xs uppercase tracking-widest">Crucial: Selecting the Right Key</h4>
                 </div>
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-white/60 border border-rose-200 rounded-xl opacity-60">
                       <p className="text-[9px] font-black text-rose-600 uppercase mb-1 flex items-center gap-1"><X className="w-3 h-3" /> Management Key</p>
                       <p className="text-[10px] font-mono text-slate-500 truncate">sb_publishable_...</p>
                       <p className="text-[9px] mt-1 text-slate-400 leading-tight">Wrong key. Used for CLI and Project management only.</p>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl ring-2 ring-emerald-500 ring-offset-1">
                       <p className="text-[9px] font-black text-emerald-600 uppercase mb-1 flex items-center gap-1"><Check className="w-3 h-3" /> Anon Public Key</p>
                       <p className="text-[10px] font-mono text-emerald-700 truncate">eyJhbGciOiJIUzI...</p>
                       <p className="text-[9px] mt-1 text-emerald-600 font-bold leading-tight">Correct key. Found in Dashboard &gt; Settings &gt; API.</p>
                    </div>
                 </div>
                 <a href="https://supabase.com/dashboard/project/_/settings/api" target="_blank" rel="noreferrer" className="w-full inline-flex items-center justify-center gap-2 text-[10px] font-black text-white bg-amber-600 hover:bg-amber-700 py-3 rounded-xl shadow-lg shadow-amber-600/20 transition-all uppercase tracking-widest">
                   Open Your API Settings <LinkIcon className="w-3.5 h-3.5" />
                 </a>
              </div>
              <form onSubmit={handleSave} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supabase Project URL</label>
                  <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xyz.supabase.co" className="w-full p-3 rounded-xl border border-slate-200 text-sm font-mono focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all bg-white text-slate-900" required />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Anon Public Key (starts with eyJ...)</label>
                  <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJh..." className="w-full p-3 rounded-xl border border-slate-200 text-sm font-mono focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all bg-white text-slate-900" required />
                </div>
                {status === 'error' && (
                  <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-100 flex gap-3 animate-in shake duration-300">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <div className="font-bold">{errorMsg}</div>
                  </div>
                )}
                <button type="submit" disabled={status === 'testing'} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50">
                  {status === 'testing' ? 'Synchronizing Node...' : 'Validate & Save Connection'}
                </button>
              </form>
            </div>
          )}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
                 <ShieldAlert className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                 <div>
                    <h4 className="text-xs font-bold text-emerald-900 mb-1">Google Login Fix</h4>
                    <p className="text-[10px] text-emerald-800 leading-relaxed font-medium">
                      Copy these two values into your <strong>Supabase Dashboard &gt; Authentication &gt; URL Configuration</strong> to enable Google/OAuth login for this specific environment.
                    </p>
                 </div>
              </div>
              <div className="space-y-5">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                       Site URL
                       <button onClick={() => copyToClipboard(redirectUrl, 'siteurl')} className="text-blue-600 hover:underline">{copied === 'siteurl' ? 'Copied' : 'Copy'}</button>
                    </label>
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 font-mono text-[10px] text-emerald-400 break-all">{redirectUrl}</div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                       Redirect URL (Whitelist)
                       <button onClick={() => copyToClipboard(redirectUrl, 'redir')} className="text-blue-600 hover:underline">{copied === 'redir' ? 'Copied' : 'Copy'}</button>
                    </label>
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 font-mono text-[10px] text-blue-400 break-all">{redirectUrl}</div>
                 </div>
                 <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2 text-slate-600">
                       <Info className="w-4 h-4" />
                       <span className="text-[10px] font-black uppercase">Iframe Warning</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed italic">
                      If Login still fails after whitelisting, use the <strong>Standalone Tab</strong> option on the Login screen. Google prevents authentication redirects inside of nested iframes.
                    </p>
                 </div>
              </div>
            </div>
          )}
          {activeTab === 'sql' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center ml-1">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initialization Script</h3>
                 <button onClick={() => copyToClipboard(SETUP_SQL, 'sql')} className="flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-600 hover:underline">
                    {copied === 'sql' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copy SQL
                 </button>
              </div>
              <pre className="p-5 bg-slate-900 text-slate-300 rounded-2xl text-[9px] h-64 overflow-y-auto font-mono leading-relaxed custom-scrollbar border border-slate-800">{SETUP_SQL}</pre>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-8 py-3 bg-white border border-slate-300 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all active:scale-95">Dismiss</button>
        </div>
      </div>
    </div>
  );
};

export default CloudSettingsModal;