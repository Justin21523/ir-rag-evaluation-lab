import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CitationCoveragePanel } from '../components/rag/CitationCoveragePanel';
import { EvidenceList } from '../components/rag/EvidenceList';
import { FaithfulnessChecklist } from '../components/rag/FaithfulnessChecklist';
import { RagAnswerPanel } from '../components/rag/RagAnswerPanel';
import { ClaimSupportPanel } from '../components/rag/ClaimSupportPanel';
import { SearchBox } from '../components/search/SearchBox';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { useRagEvaluation } from '../hooks/useRagEvaluation';

export function RagCitationCheckerPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('rag citation coverage unsupported claims');
  const rag = useRagEvaluation();
  const submit = () => rag.mutate(query);
  const coverage = Number(rag.data?.metrics.citation_coverage ?? 0);
  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">{t('navigation.ragCitationChecker')}</h2>
      <SearchBox value={query} onChange={setQuery} onSubmit={submit} />
      {rag.isPending && <LoadingState />}
      {rag.isError && <ErrorState />}
      {rag.data && (
        <div className="grid gap-4">
          <CitationCoveragePanel value={coverage} />
          {(rag.data.metrics.unsupported_claims as string[] | undefined)?.length ? (
            <section className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <h3 className="font-semibold text-amber-900">{t('rag.warningPanel')}</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
                {(rag.data.metrics.unsupported_claims as string[]).map((claim) => <li key={claim}>{claim}</li>)}
              </ul>
            </section>
          ) : null}
          <RagAnswerPanel answer={rag.data.answer_text} citations={rag.data.cited_doc_ids} />
          <section className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold">{t('rag.evidence')}</h3>
              <EvidenceList evidence={rag.data.evidence} />
            </div>
            <div>
              <h3 className="mb-2 font-semibold">{t('rag.claimEvidence')}</h3>
              <ClaimSupportPanel claims={rag.data.claims} />
            </div>
          </section>
          <FaithfulnessChecklist items={rag.data.faithfulness_checklist} />
        </div>
      )}
    </div>
  );
}
