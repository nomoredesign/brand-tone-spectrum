/**
 * The studio's mark, set as type rather than shipped as an image so it stays
 * sharp at any size and prints cleanly. The studio name is written out in the
 * block beside it, so the mark itself is decorative.
 */
export function StudioMark() {
  return (
    <span className="studio-mark" aria-hidden="true">
      (no)
    </span>
  );
}
