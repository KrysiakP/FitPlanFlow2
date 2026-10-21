/** Title, description and structured data for a trainer's public page, so a shared link looks right and search engines understand it. */

export interface TrainerSeoInput {
  id: string;
  firstName: string;
  lastName: string;
  bio: string | null;
  specialization: string | null;
  averageRating: number | null;
  reviewCount: number;
}

const DESCRIPTION_MAX = 155;

function clip(text: string, max: number): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max - 1).trimEnd()}…`;
}

export function trainerPageMeta(trainer: TrainerSeoInput, origin: string) {
  const name = `${trainer.firstName} ${trainer.lastName}`.trim();
  const role = trainer.specialization?.trim() ? `trener personalny, ${trainer.specialization.trim()}` : "trener personalny";
  const title = `${name} – ${role} | Panel Trenera`;
  const fallback = `${name} – ${role}. Zobacz profil i opinie podopiecznych w Panelu Trenera.`;
  const description = trainer.bio?.trim() ? clip(trainer.bio, DESCRIPTION_MAX) : clip(fallback, DESCRIPTION_MAX);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    jobTitle: "Trener personalny",
    description,
    url: `${origin}/t/${trainer.id}`,
  };
  if (trainer.specialization?.trim()) jsonLd.knowsAbout = trainer.specialization.trim();
  // Only real ratings: a rating without any review is not published
  if (trainer.averageRating !== null && trainer.reviewCount > 0) {
    jsonLd.aggregateRating = { "@type": "AggregateRating", ratingValue: trainer.averageRating, reviewCount: trainer.reviewCount, bestRating: 5, worstRating: 1 };
  }
  return { title, description, jsonLd };
}
