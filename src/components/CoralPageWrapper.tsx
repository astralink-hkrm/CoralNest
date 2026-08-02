import { type ReactNode } from "react";

interface CoralPageWrapperProps {
  children: ReactNode;
  pageType?: "skills" | "plugins" | "connectors" | "creators" | "mcp" | "home";
  className?: string;
}

export function CoralPageWrapper({ 
  children, 
  pageType = "home",
  className = ""
}: CoralPageWrapperProps) {
  return (
    <div className={`coral-page-wrapper ${className}`} data-coral-page={pageType}>
      {children}
    </div>
  );
}