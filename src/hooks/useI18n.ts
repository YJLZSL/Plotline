import { useTranslation } from 'react-i18next';

/** 简化 useTranslation 调用。 */
export function useI18n() {
  const { t, i18n } = useTranslation();
  return { t, i18n, lng: i18n.language };
}
