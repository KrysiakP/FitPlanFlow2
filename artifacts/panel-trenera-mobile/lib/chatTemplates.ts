// Quick replies for trainers in the chat (pure, unit-tested with node)

export const DEFAULT_TEMPLATES = [
  "Świetna robota! Tak trzymać.",
  "Pamiętaj o raporcie tygodniowym do niedzieli.",
  "Jak się czujesz po ostatnim treningu?",
  "Jeśli coś boli albo coś jest za trudne, daj znać, dostosujemy plan.",
  "Dziś trening zgodnie z planem. Powodzenia!",
];

/** Inserts a template into what is already typed: replaces an empty box, otherwise appends after it. */
export function insertTemplate(current: string, template: string): string {
  const trimmed = current.trimEnd();
  return trimmed ? `${trimmed} ${template}` : template;
}
