import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, CircleHelp } from 'lucide-react';
import { FaithfulnessChecklist } from '../components/rag/FaithfulnessChecklist';
import { SearchBox } from '../components/search/SearchBox';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { useRagEvaluation } from '../hooks/useRagEvaluation';

function judgmentClass(judgment?: string) {
  if (judgment === 'supported') return 'border-teal-200 bg-teal-50 text-teal-900';
  if (judgment === 'partially_supported') return 'border-amber-200 bg-amber-50 text-amber-900';
  if (judgment === 'contradictory' || judgment === 'unsupported') return 'border-red-200 bg-red-50 text-red-900';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function confidencePct(value?: number) {
  return `${Math.round((value || 0) * 100)}%`;
}

export function RagCitationCheckerPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('rag citation coverage unsupported claims');
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const rag = useRagEvaluation();
  const submit = () => rag.mutate(query);
  const coverage = Number(rag.data?.metrics.citation_coverage ?? 0);
  const llmByClaim = useMemo(
    () => new Map((rag.data?.llm_faithfulness?.claims || []).map((claim) => [claim.claim_id, claim])),
    [rag.data?.llm_faithfulness?.claims],
  );
  const activeClaim = activeClaimId ? rag.data?.claims.find((claim) => claim.claim_id === activeClaimId) : rag.data?.claims[0];
  const activeJudgment = activeClaim ? llmByClaim.get(activeClaim.claim_id) : undefined;
  const evidenceById = new Map((rag.data?.evidence || []).map((item) => [item.doc_id, item]));
  const citedEvidence = activeJudgment?.evidence_doc_ids?.map((docId) => evidenceById.get(docId)).filter(Boolean) || [];

  return (
    <div data-tour-id="rag-workbench" className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-teal-700">{t('rag.workbench')}</p>
          <h2 className="text-2xl font-semibold">{t('navigation.ragCitationChecker')}</h2>
        </div>
        {rag.data && (
          <div className="min-w-56 rounded-lg border bg-white p-3">
            <div className="flex justify-between text-xs text-slate-500"><span>{t('metrics.citationCoverage')}</span><span>{Math.round(coverage * 100)}%</span></div>
            <div className="mt-2 h-2 rounded bg-slate-100">
              <div className="h-2 rounded bg-teal-600" style={{ width: `${Math.round(coverage * 100)}%` }} />
            </div>
          </div>
        )}
      </div>
      <SearchBox value={query} onChange={setQuery} onSubmit={submit} />
      {rag.isPending && <LoadingState />}
      {rag.isError && <ErrorState />}
      {rag.data && (
        <div className="grid gap-4">
          <section className="rounded-lg border bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{t('rag.answer')}</h3>
              <div className="flex flex-wrap gap-1">
                {rag.data.cited_doc_ids.map((docId) => <span key={docId} className="rounded bg-slate-100 px-2 py-1 text-xs">{docId}</span>)}
              </div>
            </div>
            <p className="text-sm leading-6 text-slate-700">{rag.data.answer_text}</p>
          </section>
          {(rag.data.metrics.unsupported_claims as string[] | undefined)?.length ? (
            <section className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <div className="flex items-center gap-2 font-semibold text-amber-900"><AlertTriangle size={18} />{t('rag.warningPanel')}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(rag.data.metrics.unsupported_claims as string[]).map((claim) => <span key={claim} className="rounded bg-white px-2 py-1 text-xs text-amber-900">{claim}</span>)}
              </div>
            </section>
          ) : null}
          <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr_0.9fr]">
            <div className="rounded-lg border bg-white p-4">
              <h3 className="mb-3 font-semibold">{t('rag.claims')}</h3>
              <div className="grid gap-2">
                {rag.data.claims.map((claim) => {
                  const judgment = llmByClaim.get(claim.claim_id);
                  const active = (activeClaim?.claim_id || rag.data.claims[0]?.claim_id) === claim.claim_id;
                  return (
                    <button
                      key={claim.claim_id}
                      type="button"
                      className={`rounded border p-3 text-left text-sm ${active ? 'ring-2 ring-teal-500' : ''} ${judgmentClass(judgment?.judgment)}`}
                      onClick={() => setActiveClaimId(claim.claim_id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{claim.claim_id}</span>
                        <span className="rounded bg-white/70 px-2 py-1 text-xs">{judgment?.judgment || (claim.supported ? t('rag.supported') : t('rag.unsupported'))}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5">{claim.text}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <h3 className="mb-3 font-semibold">{t('rag.evidence')}</h3>
              <div className="grid gap-3">
                {rag.data.evidence.map((item) => {
                  const highlighted = activeJudgment?.evidence_doc_ids?.includes(item.doc_id);
                  return (
                    <article key={item.doc_id} className={`rounded border p-3 ${highlighted ? 'border-teal-300 bg-teal-50' : 'bg-slate-50'}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-sm">{item.title}</strong>
                        <span className="rounded bg-white px-2 py-1 text-xs">{item.doc_id}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.snippet}</p>
                    </article>
                  );
                })}
              </div>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{t('llm.faithfulnessJudge')}</h3>
                <span className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">{t('llm.assistiveSignal')}</span>
              </div>
              {activeClaim ? (
                <div className="mt-3 grid gap-3">
                  <div className={`rounded border p-3 ${judgmentClass(activeJudgment?.judgment)}`}>
                    <div className="flex items-center gap-2 font-medium">
                      {activeJudgment?.judgment === 'supported' ? <CheckCircle2 size={18} /> : activeJudgment ? <AlertTriangle size={18} /> : <CircleHelp size={18} />}
                      {activeJudgment?.judgment || t('common.empty')}
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs"><span>{t('llm.confidence')}</span><span>{confidencePct(activeJudgment?.confidence)}</span></div>
                      <div className="mt-1 h-2 rounded bg-white">
                        <div className="h-2 rounded bg-current" style={{ width: confidencePct(activeJudgment?.confidence) }} />
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6">{activeJudgment?.rationale || activeClaim.unsupported_reason || t('common.empty')}</p>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">{t('rag.citations')}</h4>
                    <div className="flex flex-wrap gap-2">
                      {(activeJudgment?.evidence_doc_ids || activeClaim.evidence_doc_ids || []).map((docId) => (
                        <span key={docId} className="rounded bg-slate-100 px-2 py-1 text-xs">{docId}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">{t('rag.claimEvidence')}</h4>
                    <div className="grid gap-2">
                      {citedEvidence.map((item) => (
                        <div key={item?.doc_id} className="rounded bg-slate-50 p-2 text-xs">{item?.title}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : <p className="mt-3 text-sm text-slate-500">{t('common.empty')}</p>}
            </div>
          </section>
          <FaithfulnessChecklist items={rag.data.faithfulness_checklist} />
        </div>
      )}
    </div>
  );
}
