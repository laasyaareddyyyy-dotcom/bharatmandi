import React, { useState } from 'react';
import { MANDI_FAQS } from '../../data/initialData';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Printer,
  FileText,
  Calculator,
  Wifi,
  PhoneCall,
  MessageCircle,
  ExternalLink,
  PlusCircle,
} from 'lucide-react';

export const MandiKnowledgeBase: React.FC<{
  onRaiseTicket: () => void;
}> = ({ onRaiseTicket }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');

  const categories = ['All', 'Printing & Parchis', 'Farmer Khata & Ledger', '15-Day Settlements', 'Offline & Backups'];

  const filteredFaqs = MANDI_FAQS.filter((faq) => {
    if (selectedCategory !== 'All' && faq.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchQ = faq.question.toLowerCase().includes(q);
      const matchA = faq.answer.toLowerCase().includes(q);
      return matchQ || matchA;
    }
    return true;
  });

  const toggleFaq = (id: string) => {
    setExpandedFaqId(expandedFaqId === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {/* Search & Category Pills */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#64748b]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guides, printing rules, settlements, Form C..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#e2e8f0] text-xs font-medium bg-white focus:outline-none focus:border-[#1a3a52] focus:ring-1 focus:ring-[#1a3a52]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#1a3a52] text-white shadow-2xs'
                  : 'bg-white border border-[#e2e8f0] text-[#1e293b] hover:bg-[#f1f5f9]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* FAQs List */}
      <div className="space-y-2">
        {filteredFaqs.length === 0 ? (
          <div className="py-8 text-center bg-white rounded-xl border border-[#e2e8f0] text-xs text-[#64748b]">
            No FAQ entries found for "{searchQuery}".
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isExpanded = expandedFaqId === faq.id;

            return (
              <div
                key={faq.id}
                className="rounded-xl border border-[#e2e8f0] bg-white overflow-hidden shadow-2xs transition"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 hover:bg-[#f8fafc] transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-[#eef3f7] text-[#1a3a52] flex items-center justify-center font-bold text-xs shrink-0">
                      ?
                    </span>
                    <div>
                      <span className="text-[10px] font-bold text-[#1a3a52] uppercase tracking-wider block">
                        {faq.category}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-[#1e293b] leading-snug">
                        {faq.question}
                      </h4>
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#1a3a52] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#64748b] shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 text-xs text-[#64748b] leading-relaxed border-t border-[#e2e8f0]/50 bg-[#f8fafc]/60">
                    <p className="whitespace-pre-line">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Still need help callout */}
      <div className="p-4 rounded-xl bg-[#eef3f7] border border-[#1a3a52]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-[#1a3a52]">
            Didn't find an answer to your query?
          </h4>
          <p className="text-xs text-[#1a3a52]/80 mt-0.5">
            Our Mandi Support Desk team is ready to assist you.
          </p>
        </div>

        <button
          type="button"
          onClick={onRaiseTicket}
          className="px-4 py-2 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Raise Support Ticket</span>
        </button>
      </div>
    </div>
  );
};
