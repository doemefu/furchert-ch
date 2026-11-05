// Pure helpers for the admin drawers (#140): the Tab-cycle decision of the
// focus trap and the ARIA attributes that tie a field error to its input.
// No DOM access, so both are unit-tested in the node environment.

/**
 * Where focus must go when Tab/Shift+Tab is pressed inside a focus trap.
 * `count` is the number of focusable elements in the dialog, `activeIndex`
 * the index of the focused one (-1 = focus is on the dialog itself or outside
 * the list). Returns the index to focus, `-1` to focus the dialog itself (no
 * focusable element at all), or `null` to let the browser move focus.
 */
export function nextTrapTarget(count: number, activeIndex: number, shift: boolean): number | null {
  if (count === 0) return -1;
  if (shift) return activeIndex <= 0 ? count - 1 : null;
  return activeIndex === -1 || activeIndex === count - 1 ? 0 : null;
}

/**
 * Id of the element `FieldError` renders for `field`. Assumes one error element
 * per field name on a page (true today: no field name repeats across forms).
 */
export function fieldErrorId(field: string): string {
  return `err-${field}`;
}

/**
 * ARIA attributes for an input whose error is currently shown: the field is
 * invalid and its description is the error text, so a screen reader announces
 * both together. Empty when there is no error, so the input stays untouched.
 */
export function fieldAria(hasError: boolean, field: string): { 'aria-invalid'?: true; 'aria-describedby'?: string } {
  return hasError ? { 'aria-invalid': true, 'aria-describedby': fieldErrorId(field) } : {};
}
