type P = { className?: string };
const base = "h-5 w-5";
const S = ({ className, children }: P & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className ?? base}>
    {children}
  </svg>
);
export const Check = (p: P) => <S {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></S>;
export const School = (p: P) => <S {...p}><path d="M2 9l10-5 10 5-10 5-10-5z" /><path d="M6 11v5c3 2 9 2 12 0v-5" /></S>;
export const Hospital = (p: P) => <S {...p}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 8v8M8 12h8" /></S>;
export const Home = (p: P) => <S {...p}><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /><path d="M10 20v-5h4v5" /></S>;
export const Shield = (p: P) => <S {...p}><path d="M12 3l8 3v6c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6l8-3z" /><path d="M8.5 12l2.5 2.5 4.5-4.5" /></S>;
export const Clock = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>;
export const External = (p: P) => <S {...p}><path d="M14 4h6v6M20 4l-9 9" /><path d="M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5" /></S>;
export const Copy = (p: P) => <S {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" /></S>;
export const ChevronLeft = (p: P) => <S {...p}><path d="M15 6l-6 6 6 6" /></S>;

export const CategoryIcon = ({ category, className }: { category: string; className?: string }) =>
  category === "Hospital" ? <Hospital className={className} /> : category === "Landlord" ? <Home className={className} /> : <School className={className} />;
