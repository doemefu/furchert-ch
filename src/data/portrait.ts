// Portrait for the home hero form head (redesign PR 9). There is no portrait
// yet, so this is `null` and the hero renders no photo slot at all (an empty
// slot would look like a broken image). To add one: put the 4:5 file in
// `public/` (e.g. `/portrait.jpg`, shown at 64 x 80 px, so ~256 x 320 is
// enough) and set the path here; the slot and the image then appear.
export const PORTRAIT_SRC: string | null = null;
