// Challenge rows live in each app's own Supabase project, so their count is data,
// not copy. Surfaces that name the count read it from the loaded rows.

const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve']

export function countWord(count: number): string {
  return NUMBER_WORDS[count] ?? String(count)
}

export function challengeListHeading(count: number): string {
  if (count === 1) return 'One shot.'
  return count > 0 ? `${countWord(count)} shots.` : 'The shots.'
}
