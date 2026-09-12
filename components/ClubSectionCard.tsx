import type { ReactNode } from "react";
export default function ClubSectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return <section className="club-v34-section"><header><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div></header><div className="club-v34-section-body">{children}</div></section>;
}
