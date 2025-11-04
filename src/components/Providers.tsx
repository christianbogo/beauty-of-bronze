import { ThemeProvider } from "../providers/ThemeProvider";
import { I18nProvider } from "../providers/I18nProvider";
import { OverlayProvider } from "../providers/OverlayProvider";
import { AuthProvider } from "../providers/AuthProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <OverlayProvider>{children}</OverlayProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
