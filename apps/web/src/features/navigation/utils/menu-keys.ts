/**
 * Index of the menu item to focus after a key press inside an open menu, or `null`
 * when the key does not move focus. Arrows wrap around; Home/End jump to the ends.
 * `current` is -1 when focus is still on the trigger.
 */
export function nextFocusIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) return null;
  switch (key) {
    case "ArrowDown":
      return current < 0 ? 0 : (current + 1) % count;
    case "ArrowUp":
      return current < 0 ? count - 1 : (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

/** Keys that open a closed menu from its trigger and where focus lands first. */
export function openingFocusIndex(key: string, count: number): number | null {
  if (count <= 0) return null;
  if (key === "ArrowDown") return 0;
  if (key === "ArrowUp") return count - 1;
  return null;
}
