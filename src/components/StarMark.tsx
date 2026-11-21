/**
 * The star of the first screen as a small mark (tracker F63): the outline of its two squares, one turned by 45
 * degrees over the other, filled saffron and drawn in the colour of the title. It stands before the title of a
 * section, so the sign is carried down the page. Decoration only: screen readers skip it.
 */
export default function StarMark() {
  return (
    <svg className="mark" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        className="mark__star"
        d="M10 2.22 12.28 4.5H15.5V7.72L17.78 10 15.5 12.28V15.5H12.28L10 17.78 7.72 15.5H4.5V12.28L2.22 10 4.5 7.72V4.5H7.72Z"
      />
    </svg>
  );
}
