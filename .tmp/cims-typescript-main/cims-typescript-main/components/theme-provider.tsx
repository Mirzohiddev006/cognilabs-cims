  "use client";
  import { ThemeProvider as NextThemesProvider } from "next-themes";
  import { ReactNode } from "react";
  
  export function ThemeProvider({ children }: { children: ReactNode }) {
    return (
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem={true}
        enableColorScheme={true} // This helps with system detection
        disableTransitionOnChange={false}
        storageKey="theme-preference"
        forcedTheme={undefined} // Ensure no forced theme
      >
        {children}
      </NextThemesProvider>
    );
  }