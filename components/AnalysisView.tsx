import React from 'react';
import { Loader2 } from 'lucide-react';

export const AnalysisView: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-96 w-full bg-neutral-900/50 backdrop-blur-md rounded-3xl border border-neutral-800 p-8 animate-in fade-in zoom-in duration-500">
      <div className="relative">
        <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="relative z-10 bg-neutral-950 p-4 rounded-full border border-amber-500/30 shadow-lg shadow-amber-900/20">
          <Loader2 className="h-12 w-12 text-amber-500 animate-spin" />
        </div>
      </div>
      <h3 className="mt-8 text-2xl font-bold text-white">Analyzing Blueprints</h3>
      <p className="mt-3 text-neutral-400 text-center max-w-md text-sm">
        DziVan Smart is processing your files and calculating material costs based on Ghana market rates...
      </p>
      
      <div className="mt-8 w-full max-w-xs bg-neutral-800 rounded-full h-1 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 h-1 rounded-full w-2/3 animate-[shimmer_2s_infinite]"></div>
      </div>
      <div className="mt-2 text-xs text-amber-500/80 font-mono tracking-wide">QUERYING ACCRA MARKETS...</div>
    </div>
  );
};