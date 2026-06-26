import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BadCase } from '../../api/types';
import { irApi } from '../../api/irApi';
import { useAcceptBadCaseSuggestion, useBadCaseSuggestion, useRejectBadCaseSuggestion } from '../../hooks/useLlm';

function parseDocIds(raw: string) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function BadCaseTable({ cases }: { cases: BadCase[] }) {
  const [selected, setSelected] = useState<BadCase | null>(null);
  const [notes, setNotes] = useState('');
  const [reviewerLabel, setReviewerLabel] = useState('needs_review');
  const [rootCause, setRootCause] = useState('unknown');
  const [severity, setSeverity] = useState('medium');
  const [owner, setOwner] = useState('');
  const [reviewStatus, setReviewStatus] = useState('open');
  const suggestion = useBadCaseSuggestion();
  const acceptSuggestion = useAcceptBadCaseSuggestion();
  const rejectSuggestion = useRejectBadCaseSuggestion();
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: () => selected ? irApi.updateBadCase(selected.case_id, { notes, reviewer_label: reviewerLabel, root_cause: rootCause, severity, owner, review_status: reviewStatus }) : Promise.reject(new Error('No case selected')),
    onSuccess: (updated) => {
      setSelected(updated);
      queryClient.invalidateQueries({ queryKey: ['bad-cases'] });
    },
  });
  const acceptAi = () => {
    if (!selected) return;
    acceptSuggestion.mutate(selected.case_id, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bad-cases'] }),
    });
  };
  const rejectAi = () => {
    if (!selected) return;
    rejectSuggestion.mutate(selected.case_id, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bad-cases'] }),
    });
  };
  const { t } = useTranslation();
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
      <table className="w-full rounded-lg border bg-white text-left text-sm">
        <thead className="bg-slate-50">
          <tr><th className="p-3">{t('common.case')}</th><th className="p-3">{t('common.query')}</th><th className="p-3">{t('common.type')}</th><th className="p-3">{t('badCases.severity')}</th><th className="p-3">{t('badCases.reviewStatus')}</th></tr>
        </thead>
        <tbody>
          {cases.map((item) => (
            <tr
              key={item.case_id}
              className="cursor-pointer border-t"
              onClick={() => {
                setSelected(item);
                setNotes(item.notes || '');
                setReviewerLabel(item.reviewer_label || 'needs_review');
                setRootCause(item.root_cause || 'unknown');
                setSeverity(item.severity || 'medium');
                setOwner(item.owner || '');
                setReviewStatus(item.review_status || 'open');
              }}
            >
              <td className="p-3">{item.case_id}</td>
              <td className="p-3">{item.query_id}</td>
              <td className="p-3">{item.case_type}</td>
              <td className="p-3">{item.severity}</td>
              <td className="p-3">{item.review_status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <aside className="rounded-lg border bg-white p-4">
        {selected ? (
          <div className="grid gap-3 text-sm">
            <h3 className="font-semibold">{selected.case_id}</h3>
            <p>{selected.description}</p>
            <section className="rounded border border-indigo-200 bg-indigo-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <strong>{t('llm.aiSuggestion')}</strong>
                <button type="button" className="rounded bg-indigo-600 px-2 py-1 text-xs text-white" onClick={() => suggestion.mutate(selected.case_id)}>{t('llm.suggest')}</button>
              </div>
              <p className="mt-1 text-xs text-indigo-900">{t('llm.assistiveNotice')}</p>
              {suggestion.data && (
                <div className="mt-3 grid gap-2 text-xs">
                  <div className="flex justify-between"><span>{t('badCases.rootCause')}</span><span>{suggestion.data.suggested_root_cause}</span></div>
                  <div className="flex justify-between"><span>{t('badCases.severity')}</span><span>{suggestion.data.suggested_severity}</span></div>
                  <p><strong>{t('llm.whyFailed')}</strong>: {suggestion.data.why_failed}</p>
                  <p><strong>{t('llm.possibleFix')}</strong>: {suggestion.data.possible_fix}</p>
                  <div>
                    <div className="flex justify-between"><strong>{t('llm.confidence')}</strong><span>{Math.round((suggestion.data.confidence || 0) * 100)}%</span></div>
                    <div className="mt-1 h-2 rounded bg-white"><div className="h-2 rounded bg-indigo-600" style={{ width: `${Math.round((suggestion.data.confidence || 0) * 100)}%` }} /></div>
                  </div>
                  <div className="rounded bg-white p-2">
                    <strong>{t('llm.rationale')}</strong>
                    <p className="mt-1 text-indigo-950">{suggestion.data.rationale}</p>
                  </div>
                  <details>
                    <summary>{t('llm.promptPreview')}</summary>
                    <pre className="mt-1 whitespace-pre-wrap rounded bg-white p-2">{suggestion.data.prompt_preview || suggestion.data.rationale}</pre>
                  </details>
                  <div className="flex gap-2">
                    <button type="button" className="rounded bg-teal-600 px-2 py-1 text-white" onClick={acceptAi}>{t('llm.accept')}</button>
                    <button type="button" className="rounded border bg-white px-2 py-1" onClick={rejectAi}>{t('llm.reject')}</button>
                  </div>
                </div>
              )}
            </section>
            <div>
              <strong>{t('badCases.expected')}</strong>
              <div className="mt-2 flex flex-wrap gap-2">
                {parseDocIds(selected.expected_doc_ids_json).map((docId) => (
                  <span key={docId} className="rounded bg-teal-50 px-2 py-1 text-xs text-teal-900">{docId}</span>
                ))}
              </div>
            </div>
            <div>
              <strong>{t('badCases.retrieved')}</strong>
              <div className="mt-2 flex flex-wrap gap-2">
                {parseDocIds(selected.retrieved_doc_ids_json).map((docId) => {
                  const expected = parseDocIds(selected.expected_doc_ids_json).includes(docId);
                  return <span key={docId} className={expected ? 'rounded bg-teal-50 px-2 py-1 text-xs text-teal-900' : 'rounded bg-slate-100 px-2 py-1 text-xs text-slate-700'}>{docId}</span>;
                })}
              </div>
            </div>
            <div>
              <strong>{t('badCases.timeline')}</strong>
              <div className="mt-2 grid gap-1">
                {parseDocIds(selected.retrieved_doc_ids_json).map((docId: string, index: number) => (
                  <div key={`${docId}-${index}`} className="grid grid-cols-[36px_1fr] items-center gap-2 text-xs">
                    <span className="rounded bg-slate-900 px-2 py-1 text-center text-white">{index + 1}</span>
                    <span className={parseDocIds(selected.expected_doc_ids_json).includes(docId) ? 'rounded bg-teal-50 px-2 py-1 text-teal-900' : 'rounded bg-slate-50 px-2 py-1'}>{docId}</span>
                  </div>
                ))}
              </div>
            </div>
            <details className="rounded border bg-slate-50 p-2">
              <summary className="cursor-pointer text-xs font-medium">{t('llm.debugJson')}</summary>
              <pre className="mt-2 max-h-60 overflow-auto rounded bg-white p-2 text-xs">{JSON.stringify({ expected: parseDocIds(selected.expected_doc_ids_json), retrieved: parseDocIds(selected.retrieved_doc_ids_json) }, null, 2)}</pre>
            </details>
            <label className="grid gap-1">
              {t('badCases.reviewerLabel')}
              <select className="rounded border px-2 py-1" value={reviewerLabel} onChange={(event) => setReviewerLabel(event.target.value)}>
                <option value="needs_review">needs_review</option>
                <option value="accepted">accepted</option>
                <option value="dismissed">dismissed</option>
                <option value="needs_followup">needs_followup</option>
              </select>
            </label>
            <label className="grid gap-1">
              {t('badCases.rootCause')}
              <select className="rounded border px-2 py-1" value={rootCause} onChange={(event) => setRootCause(event.target.value)}>
                {['unknown', 'tokenization', 'entity_mismatch', 'semantic_drift', 'missing_corpus', 'poor_qrels', 'reranker_issue'].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              {t('badCases.severity')}
              <select className="rounded border px-2 py-1" value={severity} onChange={(event) => setSeverity(event.target.value)}>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </label>
            <label className="grid gap-1">
              {t('badCases.reviewStatus')}
              <select className="rounded border px-2 py-1" value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value)}>
                <option value="open">open</option>
                <option value="reviewed">reviewed</option>
                <option value="fixed">fixed</option>
              </select>
            </label>
            <label className="grid gap-1">
              {t('badCases.owner')}
              <input className="rounded border px-2 py-1" value={owner} onChange={(event) => setOwner(event.target.value)} />
            </label>
            <label className="grid gap-1">
              {t('badCases.notes')}
              <textarea className="min-h-28 rounded border px-2 py-1" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
            <button type="button" className="rounded bg-accent px-3 py-2 text-white" onClick={() => update.mutate()}>{t('common.save')}</button>
          </div>
        ) : <p className="text-sm text-slate-500">{t('badCases.selectCase')}</p>}
      </aside>
    </div>
  );
}
