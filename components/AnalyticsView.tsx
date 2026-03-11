import React, { useState } from 'react';
import { Building2, GraduationCap, Bot, ArrowRight, HelpCircle, Network } from 'lucide-react';
import Dashboard from './Dashboard.tsx';
import AcademicDashboard from './AcademicDashboard.tsx';
import NetworkGraph from './NetworkGraph.tsx';
import { CompanyData, isAcademicEntity } from '../types.ts';
import Tooltip from './Tooltip.tsx';

interface AnalyticsViewProps {
  companies: CompanyData[];
  onNavigateToAgent: () => void;
  onHelpClick?: () => void;
  onCompanyClick?: (company: CompanyData) => void;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ companies, onNavigateToAgent, onHelpClick, onCompanyClick }) => {
  const [activeSubView, setActiveSubView] = useState<'corp' | 'academic' | 'network'>('corp');

  const corpCompanies = companies.filter(c => !isAcademicEntity(c));
  const academicInstitutes = companies.filter(c => isAcademicEntity(c));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <Tooltip content="Switch to Corporate and Biopharma analytics.">
              <button
                onClick={() => setActiveSubView('corp')}
                className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeSubView === 'corp' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Corp
              </button>
            </Tooltip>
            
            <Tooltip content="Switch to University and Research Institute analytics.">
              <button
                onClick={() => setActiveSubView('academic')}
                className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeSubView === 'academic' 
                    ? 'bg-white text-emerald-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                Academic
              </button>
            </Tooltip>

            <Tooltip content="Visualize connections between companies, sectors, and technologies.">
              <button
                onClick={() => setActiveSubView('network')}
                className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeSubView === 'network' 
                    ? 'bg-white text-violet-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Network className="w-4 h-4" />
                Graph
              </button>
            </Tooltip>
          </div>

          {onHelpClick && (
            <button 
              onClick={onHelpClick}
              className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-100 transition-all active:scale-95 shadow-sm"
            >
              <HelpCircle className="w-3 h-3" /> help me
            </button>
          )}
        </div>

        <Tooltip content="Hand over these insights to the AI Agent for deep strategic review.">
          <button 
            onClick={onNavigateToAgent}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold border border-indigo-100 hover:bg-indigo-100 transition-all group"
          >
            <Bot className="w-4 h-4" />
            Analyze with AI Agent
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </Tooltip>
      </div>

      <div className="animate-in fade-in duration-500">
        {activeSubView === 'corp' && <Dashboard companies={corpCompanies} />}
        {activeSubView === 'academic' && <AcademicDashboard institutes={academicInstitutes} />}
        {activeSubView === 'network' && <NetworkGraph companies={companies} onCompanyClick={onCompanyClick} />}
      </div>
    </div>
  );
};

export default AnalyticsView;