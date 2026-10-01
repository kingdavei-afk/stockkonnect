type MainSiteLinkProps = {
  className?: string;
};

export function MainSiteLink({ className = "" }: MainSiteLinkProps) {
  return (
    <a
      href="https://stockkonnect.vercel.app/"
      aria-label="Ouvrir le site principal StockKonect"
      className={`mt-1 text-xs font-medium underline decoration-current/40 underline-offset-2 transition hover:decoration-current ${className}`}
    >
      https://stockkonnect.vercel.app/
    </a>
  );
}
