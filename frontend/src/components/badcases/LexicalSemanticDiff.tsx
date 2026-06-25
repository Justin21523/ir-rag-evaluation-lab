import { useTranslation } from 'react-i18next';

export function LexicalSemanticDiff() {
  const { t } = useTranslation();
  return <section className="rounded-lg border bg-white p-4 text-sm">{t('badCases.diffView')}</section>;
}
