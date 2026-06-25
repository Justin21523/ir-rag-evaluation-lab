import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BadCase } from '../../api/types';
import { irApi } from '../../api/irApi';

export function BadCaseTable({ cases }: { cases: BadCase[] }) {
  const [selected, setSelected] = useState<BadCase | null>(null);
  const [notes, setNotes] = useState('');
  const [reviewerLabel, setReviewerLabel] = useState('needs_review');
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: () => selected ? irApi.updateBadCase(selected.case_id, { notes, reviewer_label: reviewerLabel }) : Promise.reject(new Error('No case selected')),
    onSuccess: (updated) => {
      setSelected(updated);
      queryClient.invalidateQueries({ queryKey: ['bad-cases'] });
    },
  });
  const { t } = useTranslation();
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
      <table className="w-full rounded-lg border bg-white text-left text-sm">
        <thead className="bg-slate-50">
          <tr><th className="p-3">{t('common.case')}</th><th className="p-3">{t('common.query')}</th><th className="p-3">{t('common.type')}</th></tr>
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
              }}
            >
              <td className="p-3">{item.case_id}</td>
              <td className="p-3">{item.query_id}</td>
              <td className="p-3">{item.case_type}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <aside className="rounded-lg border bg-white p-4">
        {selected ? (
          <div className="grid gap-3 text-sm">
            <h3 className="font-semibold">{selected.case_id}</h3>
            <p>{selected.description}</p>
            <div>
              <strong>{t('badCases.expected')}</strong>
              <pre className="mt-1 whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs">{selected.expected_doc_ids_json}</pre>
            </div>
            <div>
              <strong>{t('badCases.retrieved')}</strong>
              <pre className="mt-1 whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs">{selected.retrieved_doc_ids_json}</pre>
            </div>
            <div>
              <strong>{t('badCases.timeline')}</strong>
              <div className="mt-2 grid gap-1">
                {JSON.parse(selected.retrieved_doc_ids_json || '[]').map((docId: string, index: number) => (
                  <div key={`${docId}-${index}`} className="grid grid-cols-[36px_1fr] items-center gap-2 text-xs">
                    <span className="rounded bg-slate-900 px-2 py-1 text-center text-white">{index + 1}</span>
                    <span className={selected.expected_doc_ids_json.includes(docId) ? 'rounded bg-teal-50 px-2 py-1 text-teal-900' : 'rounded bg-slate-50 px-2 py-1'}>{docId}</span>
                  </div>
                ))}
              </div>
            </div>
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
