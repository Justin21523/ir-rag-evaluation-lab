import { describe, expect, it } from 'vitest';
import i18n from '../i18n';

describe('i18n', () => {
  it('defaults to zh-TW resources', () => {
    expect(i18n.t('navigation.overview')).toBe('總覽');
  });

  it('contains en-US resources', async () => {
    await i18n.changeLanguage('en-US');
    expect(i18n.t('navigation.overview')).toBe('Overview');
    await i18n.changeLanguage('zh-TW');
  });
});
