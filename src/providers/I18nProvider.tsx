import { createContext, useContext, useMemo, useState } from "react";

type Lang = "en" | "es";

type I18nContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof (typeof messages)["en"]) => string;
};

const messages = {
  en: {
    openMenu: "Open menu",
    donate: "Donate",
    theme: "Theme",
    language: "Language",
    light: "Light",
    dark: "Dark",
    system: "System",
    english: "English",
    spanish: "Español",
    readMore: "Read more",
    viewAll: "View all",
  },
  es: {
    openMenu: "Abrir menú",
    donate: "Donar",
    theme: "Tema",
    language: "Idioma",
    light: "Claro",
    dark: "Oscuro",
    system: "Sistema",
    english: "Inglés",
    spanish: "Español",
    readMore: "Leer más",
    viewAll: "Ver todo",
  },
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("bob:lang") as Lang | null;
    return saved ?? "en";
  });

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang(next) {
        localStorage.setItem("bob:lang", next);
        setLang(next);
      },
      t(key) {
        return messages[lang][key];
      },
    }),
    [lang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

