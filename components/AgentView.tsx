import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CompanyData, ChatSession, ChatMessage } from '../types.ts';
import { 
  Bot, Send, Sparkles, BookOpen, Database, 
  Settings2, Loader2, Globe, GraduationCap, XCircle, Workflow, History, MessageSquare, Plus, Trash2, Calendar, ShieldCheck
} from 'lucide-react';
import { chatWithAgent } from '../services/geminiService.ts';
import { cacheService } from '../services/cacheService.ts';
import HelpPopup from './HelpPopup.tsx';
import SchematicModal from './SchematicModal.tsx';
import MultiSelect from './MultiSelect.tsx';

interface AgentViewProps {
  companies: CompanyData[];
}

const MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro (Reasoning)' }
];

const AgentView: React.FC<AgentViewProps> = ({ companies }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showSchematic, setShowSchematic] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // Sidebar State
  const [sidebarTab, setSidebarTab] = useState<'config' | 'history'>('config');
  const [pastSessions, setPastSessions] = useState<ChatSession[]>([]);

  // Settings
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [useGoogleSearch, setUseGoogleSearch] = useState(false);
  const [academicFocus, setAcademicFocus] = useState(false);
  const [useDatabase, setUseDatabase] = useState(false);
  const [usePatentSearch, setUsePatentSearch] = useState(false);
  const [useUSPatentSearch, setUseUSPatentSearch] = useState(false);
  
  // Persistent Chat Session Ref
  const chatInstanceRef = useRef<any>(null);
  const lastContextHashRef = useRef<string>('');

  // Filters
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);

  const diseaseOptions = useMemo(() => {
    const diseases = new Set<string>();
    companies.forEach(c => {
      if (c.pipeline) {
        c.pipeline.forEach(p => {
          if (p.indication && p.indication.trim() !== '' && p.indication.toLowerCase() !== 'n/a') {
            diseases.add(p.indication.trim());
          }
        });
      }
    });
    return Array.from(diseases).sort().map(d => ({ id: d, label: d }));
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    if (selectedDiseases.length === 0) return companies;
    return companies.filter(c => 
      c.pipeline?.some(p => selectedDiseases.includes(p.indication.trim()))
    );
  }, [companies, selectedDiseases]);

  // Auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detect preview mode (iframe)
    setIsPreviewMode(window.self !== window.top);
    
    // Initial Load of History
    refreshHistory();
    
    // Start fresh or load last? Let's start fresh.
    initializeSession();
  }, []);

  const refreshHistory = async () => {
    const sessions = await cacheService.getChatSessions();
    setPastSessions(sessions);
  };

  const initializeSession = () => {
    const newId = Date.now().toString();
    setCurrentSessionId(newId);
    setMessages([
      { 
        role: 'model', 
        content: "Hello! I'm the BioPort AI Agent. I can help you analyze your data, search for academic literature, retrieve patent data from USPTO, IP Australia, and chemical data from PubChem, or generate comprehensive disease reviews. How can I assist you today?",
        timestamp: Date.now()
      }
    ]);
    chatInstanceRef.current = null;
    lastContextHashRef.current = '';
  };

  const loadSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    chatInstanceRef.current = null; // Reset instance when switching sessions
    lastContextHashRef.current = '';
  };

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await cacheService.deleteChatSession(id);
    refreshHistory();
    if (currentSessionId === id) {
      initializeSession();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const saveCurrentSession = async (currentMessages: ChatMessage[]) => {
    if (!currentSessionId) return;
    
    // Generate a title if it's new (based on first user message)
    let title = "New Conversation";
    const firstUserMsg = currentMessages.find(m => m.role === 'user');
    if (firstUserMsg) {
      title = firstUserMsg.content.slice(0, 40) + (firstUserMsg.content.length > 40 ? '...' : '');
    }

    const session: ChatSession = {
      id: currentSessionId,
      title,
      lastUpdated: Date.now(),
      messages: currentMessages
    };

    await cacheService.saveChatSession(session);
    refreshHistory();
  };

  const handleSendMessage = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    const controller = new AbortController();
    setAbortController(controller);

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    
    // Optimistically save user message
    saveCurrentSession(updatedMessages);

    try {
      // Prepare Context
      let contextData = '';
      if (useDatabase && filteredCompanies.length > 0) {
        const summary = filteredCompanies.map(c => ({
          name: c.name,
          sector: c.sector,
          pipeline: (c.pipeline || []).map(p => `${p.drugName} (${p.phase})`),
          approved: c.keyApprovedDrugs || [],
          description: c.description
        }));
        contextData = JSON.stringify(summary);
      }

      // Context Caching Logic: If context or key settings changed, reset the chat instance
      const currentContextHash = `${selectedModel}-${useGoogleSearch}-${academicFocus}-${usePatentSearch}-${useUSPatentSearch}-${contextData}`;
      if (currentContextHash !== lastContextHashRef.current) {
        chatInstanceRef.current = null;
        lastContextHashRef.current = currentContextHash;
      }

      const historyForApi = updatedMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const result = await Promise.race([
        chatWithAgent(
          historyForApi,
          text,
          {
            model: selectedModel,
            useGoogleSearch,
            academicFocus,
            useAACT: true, 
            useBioMCP: true,
            usePatentSearch,
            useUSPatentSearch,
            contextData
          },
          chatInstanceRef.current
        ),
        new Promise<never>((_, reject) => {
           controller.signal.addEventListener('abort', () => reject(new Error("Aborted")));
        })
      ]);
      
      // Update persistent chat instance
      if (result.chatInstance) {
        chatInstanceRef.current = result.chatInstance;
      }
      
      const sources = result.groundingMetadata?.groundingChunks?.map((c: any) => c.web).filter(Boolean);

      const botMsg: ChatMessage = { 
        role: 'model', 
        content: result.text || "I'm sorry, I couldn't generate a response.",
        sources,
        timestamp: Date.now()
      };

      const finalMessages = [...updatedMessages, botMsg];
      setMessages(finalMessages);
      saveCurrentSession(finalMessages);

    } catch (error: any) {
      if (error.message === 'Aborted') {
        const abortedMsg: ChatMessage = { role: 'model', content: "Generation stopped by user.", timestamp: Date.now() };
        const finalMessages = [...updatedMessages, abortedMsg];
        setMessages(finalMessages);
        saveCurrentSession(finalMessages);
      } else {
        console.error("Agent Error:", error);
        const errorMsg: ChatMessage = { 
          role: 'model', 
          content: `Error: ${error.message || "I encountered an error processing your request."} Please try again.`, 
          timestamp: Date.now() 
        };
        setMessages([...updatedMessages, errorMsg]);
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleStopGenerating = () => {
    if (abortController) {
      abortController.abort();
      setIsLoading(false);
    }
  };

  // Helper for inline formatting
  const formatInline = (text: string) => {
    let s = text;
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(?<!\*)\*(?![*])(.*?[^\\])\*(?![*])/g, '<em>$1</em>');
    s = s.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g, 
      (match, label, url) => {
        let cleanUrl = url.trim();
        if (cleanUrl && !cleanUrl.startsWith('http') && !cleanUrl.startsWith('mailto:') && !cleanUrl.startsWith('tel:')) {
          cleanUrl = 'https://' + cleanUrl;
        }
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 hover:underline font-medium inline-flex items-center gap-0.5">${label}<svg class="w-3 h-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>`;
      }
    );
    s = s.replace(
      /(?<!href="|">)(https?:\/\/[^\s<]+)/g, 
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all">$1</a>'
    );
    return s;
  };

  const MarkdownTable: React.FC<{ rows: string[] }> = ({ rows }) => {
    if (rows.length < 2) return null;
    
    // Parse Headers
    const headerLine = rows[0];
    const headers = headerLine.split('|').filter(c => c.trim() !== '').map(c => c.trim());
    
    // Parse Body (skip separator line if present)
    const bodyRows = rows.slice(1).filter(r => !r.includes('---'));
    
    return (
      <div className="overflow-x-auto my-4 rounded-lg border border-slate-200">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-xs">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="p-3 border-b border-r border-slate-200 last:border-r-0 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((rowStr, i) => {
              const cells = rowStr.split('|').filter((c, idx) => idx !== 0 && idx !== rowStr.split('|').length - 1).map(c => c.trim());
              // Fallback if split logic is imperfect for edge cases
              const finalCells = cells.length > 0 ? cells : rowStr.split('|').filter(Boolean).map(c => c.trim());
              
              return (
                <tr key={i} className="even:bg-slate-50 hover:bg-slate-100/50">
                  {finalCells.map((cell, j) => (
                    <td key={j} className="p-3 border-b border-r border-slate-200 last:border-r-0 text-slate-600">
                      <span dangerouslySetInnerHTML={{ __html: formatInline(cell) }} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTextContent = (textPart: string, baseIndex: number) => {
    const lines = textPart.split('\n');
    const nodes: React.ReactNode[] = [];
    let tableBuffer: string[] = [];
    let inTable = false;

    const flushTable = (idx: number) => {
        if (tableBuffer.length > 0) {
            nodes.push(<MarkdownTable key={`tbl-${baseIndex}-${idx}`} rows={tableBuffer} />);
            tableBuffer = [];
            inTable = false;
        }
    };

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      const key = `${baseIndex}-${i}`;

      // Detect Table Line (starts and ends with |)
      if (trimmed.startsWith('|') && (trimmed.endsWith('|') || trimmed.split('|').length > 2)) {
         tableBuffer.push(trimmed);
         inTable = true;
         return; 
      } else if (inTable) {
         flushTable(i);
      }

      if (trimmed.startsWith('### ')) {
        nodes.push(<h3 key={key} className="text-sm font-bold mt-4 mb-2 text-slate-900" dangerouslySetInnerHTML={{ __html: formatInline(trimmed.replace(/^###\s+/, '')) }} />);
      } else if (trimmed.startsWith('## ')) {
        nodes.push(<h2 key={key} className="font-bold mt-6 border-b border-slate-200 pb-2 mb-3 text-lg text-slate-900" dangerouslySetInnerHTML={{ __html: formatInline(trimmed.replace(/^##\s+/, '')) }} />);
      } else if (trimmed.startsWith('- ')) {
        nodes.push(<div key={key} className="flex gap-2 ml-1 mb-1 items-start"><span className="text-slate-400 mt-1.5 text-xs">•</span><span className="flex-1 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(trimmed.replace(/^- /, '')) }} /></div>);
      } else {
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          nodes.push(<div key={key} className="flex gap-2 ml-1 mb-1 items-start"><span className="text-slate-500 font-mono text-xs mt-0.5 min-w-[20px] text-right shrink-0 select-none">{numberedMatch[1]}.</span><span className="flex-1 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(numberedMatch[2]) }} /></div>);
        } else if (trimmed !== '') {
          nodes.push(<p key={key} className="mb-2 text-sm leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />);
        } else {
          nodes.push(<div key={key} className="h-2" />);
        }
      }
    });
    
    flushTable(lines.length); // Flush remaining table if ends with one
    return nodes;
  };

  const renderMessageContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(\`\`\`[\s\S]*?\`\`\`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const match = part.match(/\`\`\`(\w*)\n?([\s\S]*?)\`\`\`/);
        const lang = match ? match[1] : '';
        const code = match ? match[2] : part.replace(/\`\`\`/g, '');
        return (
          <div key={index} className="my-4 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
             <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 text-xs font-mono text-slate-500 uppercase flex justify-between items-center">
                <span className="font-bold">{lang || 'CODE'}</span>
                <button onClick={() => navigator.clipboard.writeText(code)} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded hover:text-blue-600 transition-colors">Copy</button>
             </div>
             <pre className="p-4 text-xs font-mono text-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed">{code.trim()}</pre>
          </div>
        );
      }
      return <div key={index}>{renderTextContent(part, index)}</div>;
    });
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* Sidebar - Settings & History */}
      <div className="w-80 shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hidden md:flex">
        <div className="flex border-b border-slate-200 bg-slate-50">
           <button 
             onClick={() => setSidebarTab('config')}
             className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-center transition-colors ${sidebarTab === 'config' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
           >
             Configuration
           </button>
           <button 
             onClick={() => setSidebarTab('history')}
             className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-center transition-colors ${sidebarTab === 'history' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
           >
             History
           </button>
        </div>
        
        {sidebarTab === 'config' && (
          <div className="p-5 space-y-6 overflow-y-auto flex-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Model</label>
                <HelpPopup title="Model Selection" content="Choose 'Flash' for speed or 'Pro' for complex reasoning tasks." placement="right" />
              </div>
              <div className="space-y-2">
                {MODELS.map(m => (
                  <label key={m.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="radio" name="model" checked={selectedModel === m.id} onChange={() => setSelectedModel(m.id)} className="text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm font-medium text-slate-700">{m.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Capabilities</label>
                <HelpPopup title="Agent Capabilities" content="Enable specific tools for the agent to use during its reasoning process." placement="right" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${useGoogleSearch ? 'bg-blue-600' : 'bg-slate-200'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${useGoogleSearch ? 'translate-x-4' : 'translate-x-0'}`} />
                  <input type="checkbox" className="hidden" checked={useGoogleSearch} onChange={(e) => setUseGoogleSearch(e.target.checked)} />
                </div>
                <span className="text-sm text-slate-700 flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Google Search</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${academicFocus ? 'bg-purple-600' : 'bg-slate-200'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${academicFocus ? 'translate-x-4' : 'translate-x-0'}`} />
                  <input type="checkbox" className="hidden" checked={academicFocus} onChange={(e) => setAcademicFocus(e.target.checked)} />
                </div>
                <span className="text-sm text-slate-700 flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5" /> Academic Focus (PubMed)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${usePatentSearch ? 'bg-amber-500' : 'bg-slate-200'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${usePatentSearch ? 'translate-x-4' : 'translate-x-0'}`} />
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={usePatentSearch} 
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setUsePatentSearch(isChecked);
                      if (isChecked) {
                        setSelectedModel('gemini-3-pro-preview');
                      }
                    }} 
                  />
                </div>
                <span className="text-sm text-slate-700 flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5" /> Patent Intelligence (Google Patent Search)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${useUSPatentSearch ? 'bg-blue-500' : 'bg-slate-200'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${useUSPatentSearch ? 'translate-x-4' : 'translate-x-0'}`} />
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={useUSPatentSearch} 
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setUseUSPatentSearch(isChecked);
                      if (isChecked) {
                        setSelectedModel('gemini-3-pro-preview');
                      }
                    }} 
                  />
                </div>
                <span className="text-sm text-slate-700 flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5" /> US Patent Intelligence (Google Patents)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${useDatabase ? 'bg-emerald-600' : 'bg-slate-200'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${useDatabase ? 'translate-x-4' : 'translate-x-0'}`} />
                  <input type="checkbox" className="hidden" checked={useDatabase} onChange={(e) => setUseDatabase(e.target.checked)} />
                </div>
                <span className="text-sm text-slate-700 flex items-center gap-2"><Database className="w-3.5 h-3.5" /> Use Database Context</span>
              </label>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 mt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filters</label>
              </div>
              <MultiSelect 
                label="Disease Area" 
                options={diseaseOptions} 
                selectedIds={selectedDiseases} 
                onChange={setSelectedDiseases} 
                placeholder="All Diseases" 
              />
            </div>

            <div className="text-xs text-slate-400 pt-4 border-t border-slate-100 mt-4">
               Current Database Context: <strong>{filteredCompanies.length}</strong> entities loaded.
            </div>

            {isPreviewMode && (
              <button 
                onClick={() => setShowSchematic(true)}
                className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-100 transition-colors border border-indigo-100 shadow-sm"
              >
                <Workflow className="w-4 h-4" /> View Agent Schematic
              </button>
            )}
          </div>
        )}

        {sidebarTab === 'history' && (
          <div className="flex-1 flex flex-col min-h-0">
             <div className="p-4 border-b border-slate-100">
                <button 
                  onClick={initializeSession}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                >
                  <Plus className="w-4 h-4" /> New Conversation
                </button>
             </div>
             <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {pastSessions.map(session => (
                  <div 
                    key={session.id}
                    onClick={() => loadSession(session)}
                    className={`group relative p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${currentSessionId === session.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:border-blue-200'}`}
                  >
                     <h4 className={`text-xs font-bold mb-1 truncate pr-6 ${currentSessionId === session.id ? 'text-indigo-900' : 'text-slate-700'}`}>{session.title}</h4>
                     <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(session.lastUpdated).toLocaleDateString()}
                        <span>•</span>
                        {new Date(session.lastUpdated).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                     </div>
                     <button 
                       onClick={(e) => deleteSession(e, session.id)}
                       className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                     >
                       <Trash2 className="w-3.5 h-3.5" />
                     </button>
                  </div>
                ))}
                {pastSessions.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-xs italic">
                    No history yet.
                  </div>
                )}
             </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                <Bot className="w-6 h-6" />
             </div>
             <div>
               <h2 className="font-bold text-slate-800">BioPort AI Agent</h2>
               <div className="flex items-center gap-2 text-xs text-slate-500">
                 <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-green-400'}`}></span>
                 {isLoading ? 'Thinking...' : 'Online'}
                 <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-semibold text-[10px] uppercase">
                   Memory Active
                 </span>
               </div>
             </div>
           </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
               <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-indigo-600'}`}>
                 {msg.role === 'user' ? <div className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
               </div>
               
               <div className={`max-w-[90%] sm:max-w-[80%] space-y-2`}>
                 <div className={`p-4 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'}`}>
                   {msg.role === 'user' ? (
                     <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                   ) : (
                     <div className="text-sm">{renderMessageContent(msg.content)}</div>
                   )}
                 </div>

                 {msg.sources && msg.sources.length > 0 && (
                   <div className="flex flex-wrap gap-2 mt-2">
                     {msg.sources.slice(0, 3).map((source: any, i: number) => (
                       <a key={i} href={source.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm">
                         <BookOpen className="w-3 h-3" />
                         <span className="truncate max-w-[150px]">{source.title}</span>
                       </a>
                     ))}
                   </div>
                 )}
               </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-200 text-sm text-slate-500 shadow-sm flex items-center gap-2">
                Analyzing data streams...
                <button onClick={handleStopGenerating} className="ml-2 text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded hover:bg-red-50 transition-colors border border-red-100">Stop</button>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100">
           <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative flex items-center gap-2">
             <input
               type="text"
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder="Type a message or request a specific analysis..."
               style={{ backgroundColor: 'white', color: '#0f172a' }}
               className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm outline-none"
               disabled={isLoading}
             />
             
             {isLoading ? (
               <div className="absolute right-2 flex items-center gap-2">
                 <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                 <button type="button" onClick={handleStopGenerating} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm" title="Stop Generating"><XCircle className="w-4 h-4" /></button>
               </div>
             ) : (
               <button type="submit" disabled={!input.trim()} className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-sm"><Send className="w-4 h-4" /></button>
             )}
           </form>
           <div className="flex justify-center mt-2 text-[10px] text-slate-400">
             AI may produce inaccurate information. Verify important data.
           </div>
        </div>

      </div>

      {showSchematic && <SchematicModal onClose={() => setShowSchematic(false)} />}
    </div>
  );
};

export default AgentView;