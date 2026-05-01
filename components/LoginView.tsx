
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';
import { Dna, Lock, Mail, Loader2, ArrowRight, AlertCircle, Settings, RefreshCw, ArrowLeft, CheckCircle2, ShieldCheck, Github, UserPlus, KeyRound, Info, ExternalLink, Copy, Check, ShieldAlert, AlertTriangle, Database, PanelRightOpen, UserCheck, CloudOff, Send, HelpCircle, ChevronDown, ChevronUp, Terminal, ShieldX, Key, Globe, Move, ExternalLink as LinkIcon, Box, X } from 'lucide-react';
import CloudSettingsModal from './CloudSettingsModal';

interface LoginViewProps {
  onLoginSuccess: () => void;
  onGuestAccess: () => void;
  onBack?: () => void;
  initialMode?: 'login' | 'register';
}

type AuthMode = 'login' | 'register' | 'forgotPassword' | 'updatePassword';
type PendingAction = 'login' | 'register' | 'google' | 'github' | 'resend' | null;

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onGuestAccess, onBack, initialMode = 'login' }) => {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [showMigrationWizard, setShowMigrationWizard] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const [isConfigured, setIsConfigured] = useState(supabaseService.isConfigured());

  // Supabase Constants
  const SB_PROJECT_ID = 'icqkgepwohiuvnphywdk';
  const currentRedirectUrl = window.location.origin + window.location.pathname;
  const sbCallbackUrl = `https://${SB_PROJECT_ID}.supabase.co/auth/v1/callback`;

  useEffect(() => {
    setIsInIframe(window.self !== window.top);
    setAuthMode(initialMode);
    
    const checkConfig = async () => {
      const configured = supabaseService.isConfigured();
      setIsConfigured(configured);
      if (configured) {
        const user = await supabaseService.auth.getUser();
        if (user) setCurrentUserEmail(user.email ?? null);
      }
    };

    checkConfig();
    const interval = setInterval(checkConfig, 2000);
    return () => clearInterval(interval);
  }, [initialMode]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Handle OAuth callback
  useEffect(() => {
    let isMounted = true;
    const handleAuthCallback = async () => {
      const url = window.location.href;
      const hash = window.location.hash;
      const hasAuthData = hash.includes('access_token=') || url.includes('code=') || url.includes('error=');
      
      if (hasAuthData && !isProcessingCallback) {
        setIsProcessingCallback(true);
        
        if (url.includes('error=')) {
          const params = new URLSearchParams(window.location.hash.substring(1) || window.location.search.substring(1));
          if (isMounted) {
            setError(
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-rose-600">
                  <ShieldX className="w-5 h-5" />
                  <p className="font-bold">OAuth Project Mismatch</p>
                </div>
                <p className="text-[10px] opacity-80">{params.get('error_description') || "Credentials from the old project are invalid here."}</p>
                
                <button 
                  onClick={() => setShowMigrationWizard(true)}
                  className="w-full py-3 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking_widest flex items-center justify-center gap-2 shadow-lg"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Start Migration Wizard
                </button>
              </div>
            );
            setIsProcessingCallback(false);
          }
          return;
        }

        const { data: { subscription } } = supabaseService.auth.onAuthStateChange((event, session) => {
          if (isMounted && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
            setIsProcessingCallback(false);
            onLoginSuccess();
            subscription.unsubscribe();
          }
        });

        const timer = setInterval(async () => {
          try {
            const session = await supabaseService.auth.getSession();
            if (session && isMounted) {
              clearInterval(timer);
              setIsProcessingCallback(false);
              onLoginSuccess();
              subscription.unsubscribe();
            }
          } catch (e) {}
        }, 1000);

        const safetyTimeout = setTimeout(() => {
          clearInterval(timer);
          if (isProcessingCallback && isMounted) {
            setIsProcessingCallback(false);
            setError("Handshake timeout. Please verify GCP credentials.");
            subscription.unsubscribe();
          }
        }, 15000);

        return () => {
          isMounted = false;
          clearInterval(timer);
          clearTimeout(safetyTimeout);
          subscription.unsubscribe();
        };
      }
    };
    handleAuthCallback();
    return () => { isMounted = false; };
  }, [onLoginSuccess, isProcessingCallback]);

  const handleResendLink = async (targetEmail: string = email) => {
    if (resendCooldown > 0 || !targetEmail) return;
    setPendingAction('resend');
    setError(null);
    try {
      const { error: resendError } = await supabaseService.auth.resendVerification(targetEmail);
      if (resendError) throw resendError;
      setSuccessMsg(`Sent to ${targetEmail}. Verify your GCP Redirect URL if missing.`);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) {
      setIsSettingsOpen(true);
      return;
    }
    
    setPendingAction(authMode === 'login' ? 'login' : 'register');
    setError(null);
    setSuccessMsg(null);
    
    try {
      if (authMode === 'login') {
        const { error: signInError } = await supabaseService.auth.signIn(email, password);
        if (signInError) {
          if (signInError.message.toLowerCase().includes('email not confirmed') || signInError.message.toLowerCase().includes('confirm')) {
            setError(
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-rose-600">
                  <Mail className="w-5 h-5" />
                  <p className="font-bold">Confirmation Required</p>
                </div>
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-700 text-left">
                   <p className="text-[10px] text-slate-300 leading-relaxed mb-4">
                     Please check your email to confirm your account. If you didn't receive it, you can resend the verification email.
                   </p>
                   <button 
                     onClick={(e) => { e.preventDefault(); handleResendLink(email); }}
                     disabled={resendCooldown > 0}
                     className="w-full py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     <Send className="w-3 h-3" /> {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
                   </button>
                </div>
              </div>
            );
            setPendingAction(null);
            return;
          }
          throw signInError;
        }
        onLoginSuccess();
      } else {
        const { data, error: signUpError } = await supabaseService.auth.signUp(email, password);
        if (signUpError) throw signUpError;
        
        if (data?.user && data?.session) {
           onLoginSuccess();
        } else {
           setSuccessMsg("Success! Please check your email to confirm your account.");
           setPendingAction(null);
        }
      }
    } catch (err: any) {
      setError(err.message);
      setPendingAction(null);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isConfigured) {
      setIsSettingsOpen(true);
      return;
    }

    let authWindow: Window | null = null;
    const isInIframe = window.self !== window.top;
    
    if (isInIframe) {
      // Open window immediately in the click handler to bypass strict popup blockers
      authWindow = window.open('', '_blank', 'width=500,height=600');
      if (!authWindow) {
        setError("Popup blocked. Please enable popups for this site.");
        return;
      }
      authWindow.document.write('<div style="font-family:sans-serif;padding:20px;text-align:center;">Loading authentication...</div>');
    }

    try {
      setError(null);
      setPendingAction('google');
      await supabaseService.auth.signInWithOAuth('google', authWindow);
    } catch (err: any) {
      if (authWindow) authWindow.close();
      setError(err.message || "Failed to initialize Google login.");
    } finally {
      setPendingAction(null);
    }
  };

  const isRegister = authMode === 'register';

  return (
    <div className="flex flex-col items-center justify-center p-4 relative animate-in fade-in zoom-in-95 duration-500">
      {onBack && !isProcessingCallback && (
        <button onClick={onBack} className="mb-8 flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold text-xs uppercase tracking-widest transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-md overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Dna className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-black tracking-tighter">BioPort <span className="text-blue-500">AI</span></h1>
            </div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">{isRegister ? 'Node Registration' : 'System Authorization'}</p>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          {isProcessingCallback ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
              <p className="font-bold text-slate-900">Synchronizing OAuth Node...</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">{isRegister ? 'Create Profile' : 'Sign In'}</h2>
                 <p className="text-slate-500 text-sm font-medium">Access your biopharma intelligence node.</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in shake duration-300">
                  <div className="flex-1 w-full">{error}</div>
                </div>
              )}

              {successMsg && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl animate-in zoom-in-95">
                  <div className="flex items-start gap-3 text-emerald-700">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="text-xs font-bold leading-relaxed">{successMsg}</div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-50 outline-none text-sm font-medium transition-all bg-white text-slate-900" placeholder="name@institution.com" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-50 outline-none text-sm font-medium transition-all bg-white text-slate-900" placeholder="Enter Password" required />
                </div>
                <button type="submit" disabled={pendingAction !== null} className="w-full text-white rounded-2xl py-4 font-black uppercase tracking-widest text-xs bg-blue-600 hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-30 flex items-center justify-center gap-2 active:scale-95">
                  {pendingAction === 'login' || pendingAction === 'register' ? <Loader2 className="w-4 h-4 animate-spin" /> : isRegister ? 'Register' : 'Authorize'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button onClick={() => { setAuthMode(isRegister ? 'login' : 'register'); setError(null); setSuccessMsg(null); }} className="text-xs font-bold text-slate-500 hover:text-blue-600">
                  {isRegister ? <>Already have an account? <span className="text-blue-600">Sign In</span></> : <>New user? <span className="text-blue-600">Create Profile</span></>}
                </button>
              </div>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black"><span className="bg-white px-4 text-slate-400">Enterprise SSO</span></div>
              </div>

              <div className="space-y-3">
                <button type="button" onClick={handleGoogleLogin} disabled={pendingAction !== null} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-[11px] font-black uppercase tracking-widest text-slate-700 group active:scale-[0.98]">
                   <GoogleIcon />
                   <span>Sign In with Google</span>
                   {isInIframe && <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-30" />}
                </button>
                
                <button onClick={() => setShowTroubleshooting(!showTroubleshooting)} className="w-full py-2 flex items-center justify-center gap-2 text-[9px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors">
                   <HelpCircle className="w-3 h-3" /> Login troubleshooting
                </button>
              </div>

              {showTroubleshooting && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-[10px] text-amber-800 space-y-3 animate-in fade-in slide-in-from-top-1">
                   <p className="font-bold uppercase tracking-tight">Login failing with raw URL text?</p>
                   <p className="leading-relaxed">
                     If you see a <code className="bg-amber-100 px-1 rounded">view-source:</code> error, it means the Google OAuth redirect is being blocked by the iframe.
                   </p>
                   <ul className="list-disc pl-4 space-y-1">
                     <li>Open the app in a <strong>New Tab</strong> instead of the preview window.</li>
                     <li>Ensure your <strong>Supabase Dashboard &gt; Auth &gt; URL Configuration</strong> has <code className="bg-amber-100 px-1 rounded">{currentRedirectUrl}</code> whitelisted.</li>
                   </ul>
                   <button onClick={() => setShowMigrationWizard(true)} className="text-blue-600 font-bold hover:underline">Open Migration Wizard for full setup steps &rarr;</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showMigrationWizard && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <div className="flex items-center gap-3">
                   <RefreshCw className="w-5 h-5 text-blue-600" />
                   <h3 className="font-black text-slate-800 uppercase tracking-widest">GCP Migration Wizard</h3>
                 </div>
                 <button onClick={() => setShowMigrationWizard(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="p-8 overflow-y-auto space-y-8">
                 <section className="space-y-4">
                    <div className="flex items-center gap-3 text-blue-600">
                       <Box className="w-5 h-5" />
                       <h4 className="font-black text-sm uppercase">Step 1: Create GCP Client ID</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                       In your <strong>NEW GCP Project</strong>, go to <strong>Credentials &gt; Create OAuth Client ID (Web)</strong>. Use these exact values:
                    </p>
                    <div className="space-y-3">
                       <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Authorized Javascript Origin</label>
                          <div className="flex justify-between items-center">
                             <code className="text-[10px] font-mono text-blue-600 truncate mr-2">{`https://${SB_PROJECT_ID}.supabase.co`}</code>
                             <button onClick={() => copyToClipboard(`https://${SB_PROJECT_ID}.supabase.co`, 'origin')} className="p-1 hover:bg-white rounded border border-slate-200 transition-all">
                                {copiedUrl === 'origin' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                             </button>
                          </div>
                       </div>
                       <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Authorized Redirect URI</label>
                          <div className="flex justify-between items-center">
                             <code className="text-[10px] font-mono text-emerald-600 truncate mr-2">{sbCallbackUrl}</code>
                             <button onClick={() => copyToClipboard(sbCallbackUrl, 'callback')} className="p-1 hover:bg-white rounded border border-slate-200 transition-all">
                                {copiedUrl === 'callback' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                             </button>
                          </div>
                       </div>
                    </div>
                 </section>

                 <section className="space-y-4">
                    <div className="flex items-center gap-3 text-emerald-600">
                       <Settings className="w-5 h-5" />
                       <h4 className="font-black text-sm uppercase">Step 2: Update Supabase Providers</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                       Go to <strong>Supabase &gt; Auth &gt; Providers &gt; Google</strong> and paste the new Client ID/Secret.
                    </p>
                 </section>

                 <section className="space-y-4">
                    <div className="flex items-center gap-3 text-rose-600">
                       <Globe className="w-5 h-5" />
                       <h4 className="font-black text-sm uppercase">Step 3: Fix Email Verification</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                       Verification emails will ONLY send if your current URL is whitelisted. Go to <strong>Supabase &gt; Auth &gt; URL Configuration</strong> and add:
                    </p>
                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                       <label className="text-[9px] font-black text-rose-400 uppercase block mb-1">Additional Redirect URL</label>
                       <div className="flex justify-between items-center">
                          <code className="text-[10px] font-mono text-rose-600 truncate mr-2">{currentRedirectUrl}</code>
                          <button onClick={() => copyToClipboard(currentRedirectUrl, 'redir')} className="p-1 hover:bg-white rounded border border-slate-200 transition-all">
                             {copiedUrl === 'redir' ? <Check className="w-3 h-3 text-rose-500" /> : <Copy className="w-3 h-3 text-rose-400" />}
                          </button>
                       </div>
                    </div>
                 </section>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                 <button onClick={() => setShowMigrationWizard(false)} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg">I've Updated My Settings</button>
              </div>
           </div>
        </div>
      )}

      {isSettingsOpen && <CloudSettingsModal onClose={() => setIsSettingsOpen(false)} onConfigured={() => setIsConfigured(true)} />}
    </div>
  );
};

export default LoginView;
