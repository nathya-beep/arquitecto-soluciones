"use client";

import { CommercialSummary as CommercialSummaryType } from "@/lib/types";
import { useLang } from "./LangProvider";

interface Props {
  summary: CommercialSummaryType;
  projectTitle: string;
  emailSent: boolean;
  loading: boolean;
  ownerEmail: string;
}

export default function CommercialSummary({ summary, projectTitle, emailSent, loading, ownerEmail }: Props) {
  const { t } = useLang();
  return (
    <div className="mt-6 rounded-2xl overflow-hidden border border-indigo-100 shadow-lg">

      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-8 text-white text-center">
        <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 text-xs font-semibold mb-3 uppercase tracking-wider">
          {t.csBadge}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-2">{summary.headline}</h2>
        <p className="text-indigo-200 text-sm">{projectTitle}</p>
      </div>

      {/* Problem */}
      <div className="bg-white px-6 py-5 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.csProblem}</h3>
        <p className="text-slate-700 leading-relaxed">{summary.problem}</p>
      </div>

      {/* Benefits */}
      <div className="bg-slate-50 px-6 py-5 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t.csBenefits}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {summary.benefits.map((benefit, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-slate-700">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white px-6 py-5 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t.csHowItWorks}</h3>
        <div className="space-y-3">
          {summary.howItWorks.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                {i + 1}
              </div>
              <p className="text-sm text-slate-700 pt-1">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ROI */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-5 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.csRoi}</h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-slate-700 font-medium">{summary.roiEstimate}</p>
        </div>
      </div>

      {/* CTA + Email status */}
      <div className="bg-indigo-600 px-6 py-5">
        <p className="text-white font-semibold text-center mb-4">{summary.callToAction}</p>

        <div className="flex items-center justify-center">
          {loading ? (
            <div className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-xl text-sm">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t.csSending}
            </div>
          ) : emailSent ? (
            <div className="flex items-center gap-2 bg-green-400/30 text-white px-4 py-2 rounded-xl text-sm border border-green-300/40">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t.csSentTo.replace("{email}", ownerEmail)}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-yellow-400/30 text-white px-4 py-2 rounded-xl text-sm border border-yellow-300/40">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.csPending.replace("{email}", ownerEmail)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
