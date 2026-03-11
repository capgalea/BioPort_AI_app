import React from 'react';
import { 
  Target, Eye, BookOpen, GraduationCap, 
  Award, Linkedin, Mail, Microscope, 
  Database, Cpu, Sparkles, Quote
} from 'lucide-react';

const AboutUsView: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-24">
        {/* Vision Statement */}
        <div className="bg-white rounded-[2.5rem] p-10 sm:p-14 border border-slate-200 shadow-xl relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Eye className="w-24 h-24 text-blue-600" />
          </div>
          <div className="relative z-10">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
              <Eye className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
              Vision Statement
            </h2>
            <div className="relative mb-8">
              <Quote className="absolute -top-4 -left-4 w-8 h-8 text-blue-100 -z-10" />
              <p className="text-xl font-bold text-slate-800 leading-tight italic">
                "A world where every biotech researcher, strategist, and entrepreneur has equal access to the intelligence they need to turn scientific discovery into life-changing therapies."
              </p>
            </div>
            <p className="text-slate-600 leading-relaxed">
              BioPort AI envisions a future where the barriers between academic breakthroughs, clinical pipelines, and commercial strategy are dissolved — enabling the global biotech ecosystem to move faster, collaborate smarter, and deliver innovation that meaningfully improves human health.
            </p>
          </div>
        </div>

        {/* Mission Statement */}
        <div className="bg-white rounded-[2.5rem] p-10 sm:p-14 border border-slate-200 shadow-xl relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Target className="w-24 h-24 text-emerald-600" />
          </div>
          <div className="relative z-10">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600">
              <Target className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
              Mission Statement
            </h2>
            <div className="relative mb-8">
              <Quote className="absolute -top-4 -left-4 w-8 h-8 text-emerald-100 -z-10" />
              <p className="text-xl font-bold text-slate-800 leading-tight italic">
                "To accelerate biotechnology intelligence by providing an AI-powered research engine that unifies clinical trial data, drug discovery insights, market analytics, and scientific knowledge — empowering biotech professionals to make faster, evidence-driven decisions."
              </p>
            </div>
            <p className="text-slate-600 leading-relaxed">
              BioPort AI is built on the conviction that the right intelligence, delivered at the right moment, is the catalyst that transforms promising research into real-world impact. We connect the dots across 150,000+ clinical trials and global academic output.
            </p>
          </div>
        </div>
      </div>

      {/* The Story Section */}
      <section className="mb-24">
        <div className="bg-slate-50 rounded-[3rem] p-10 sm:p-16 border border-slate-100">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-blue-600">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">The BioPort AI Story</h2>
            </div>
            <div className="space-y-6 text-slate-600 text-lg leading-relaxed">
              <p>
                Founded in July 2024 by Charles Galea, BioPort AI was born from a simple but powerful observation: the biotechnology sector generates an extraordinary volume of research, clinical data, and competitive intelligence — yet most professionals lack the tools to synthesise it quickly and act on it confidently.
              </p>
              <p>
                Drawing on his rare dual background — more than a decade as a publishing biomedical researcher and five years as a data scientist delivering AI solutions at global scale — Charles built BioPort AI to be the intelligence layer the biotech industry has been missing. 
              </p>
              <p>
                Grounded in real-time data, driven by Agentic AI, and designed for the needs of both academic and corporate users, BioPort AI is the bridge between discovery and decision.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Profile Section */}
      <section className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Photo Column */}
          <div className="lg:col-span-5 bg-slate-100 relative min-h-[400px]">
            <img 
              src="https://storage.googleapis.com/bioport_ai_gcs_public/bioport_ai_gsc_public_folder/headshot1.jpg" 
              alt="Charles Galea" 
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-900/80 to-transparent text-white">
              <h3 className="text-2xl font-black tracking-tight">Charles Galea, PhD</h3>
              <p className="text-blue-300 font-bold text-sm uppercase tracking-widest">CEO & Founder</p>
            </div>
          </div>

          {/* Content Column */}
          <div className="lg:col-span-7 p-10 sm:p-14">
            <div className="mb-10">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Founder Profile</h3>
              <p className="text-slate-700 text-lg leading-relaxed font-medium mb-8">
                Charles Galea is the Founder of BioPort AI and a Senior Data Scientist whose career sits at a rare and powerful intersection: over a decade of hands-on biomedical research and five years of applied machine learning at scale in one of the world's most data-driven manufacturing organisations.
              </p>
              <p className="text-slate-600 leading-relaxed mb-8">
                His professional journey spans the laboratory, the corporate data floor, and now the frontier of AI-powered biotechnology intelligence. Charles channels his dual expertise in biomedical science and enterprise-grade AI engineering to build an intelligence platform purpose-built for the biotechnology sector, bridging the gap between academic discovery and corporate strategy.
              </p>
              
              <div className="flex gap-4">
                <a 
                  href="https://www.linkedin.com/in/charles-galea-data-scientist/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <Linkedin className="w-4 h-4 text-blue-600" /> LinkedIn Profile
                </a>

              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Education */}
              <div>
                <h4 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600" /> Education
                </h4>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">RMIT University</p>
                    <p className="text-sm font-bold text-slate-800">Master of Data Science</p>
                    <p className="text-xs text-slate-500 font-medium">Result: Distinction</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">University of Queensland</p>
                    <p className="text-sm font-bold text-slate-800">PhD, Biochemistry</p>
                  </div>
                </div>
              </div>

              {/* Expertise */}
              <div>
                <h4 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" /> Core Expertise
                </h4>
                <div className="flex flex-wrap gap-2">
                  <ExpertiseTag icon={<Microscope />} label="Biomedical Research" />
                  <ExpertiseTag icon={<Database />} label="Data Science" />
                  <ExpertiseTag icon={<Cpu />} label="Agentic AI" />
                  <ExpertiseTag icon={<Sparkles />} label="RAG-LLM" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const ExpertiseTag = ({ icon, label }: { icon: React.ReactNode, label: string }) => (
  <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 flex items-center gap-2">
    {React.cloneElement(icon as React.ReactElement, { className: 'w-3 h-3' })}
    {label}
  </div>
);

export default AboutUsView;
