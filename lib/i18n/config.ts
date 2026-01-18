export const defaultLocale = 'ar';
export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];

const dictionaries = {
    ar: () => import('@/locales/ar.json').then((module) => module.default),
    en: () => import('@/locales/en.json').then((module) => module.default),
};

export const getDictionary = async (locale: Locale) => {
    return dictionaries[locale]();
};
