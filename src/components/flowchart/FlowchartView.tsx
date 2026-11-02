import React from 'react';
import { Workflow } from 'lucide-react';
import { useMandi } from '../../context/MandiContext';

export const FlowchartView: React.FC = () => {
  const { setPortalMode } = useMandi();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-2xl mx-auto my-8 shadow-xs">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-4">
        <Workflow className="w-8 h-8 opacity-60" />
      </div>
      <h3 className="text-xl font-black text-slate-800 mb-2">
        System Architecture Map Disabled
      </h3>
      <p className="text-sm text-slate-600 mb-6 leading-relaxed">
        The System Architecture Map and Operational Flowchart feature has been disabled. Please return to the main dashboard or farmer portal.
      </p>
      <button
        type="button"
        onClick={() => setPortalMode('merchant')}
        className="px-5 py-2.5 rounded-xl bg-[#1a3a52] text-white font-bold text-xs hover:bg-[#132d42] transition cursor-pointer"
      >
        Return to Dashboard
      </button>
    </div>
  );
};
