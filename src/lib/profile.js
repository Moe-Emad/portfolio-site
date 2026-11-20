// How the site says what the developer does and where (tracker F36). The line above the name, the description of
// the home page and the picture of link previews (tools/build/og-image.mjs) all use it, so they never differ.

/**
 * "Software engineer based in Egypt", from the role and the country in content/profile.json.
 * @param {string} role
 * @param {string} location
 * @returns {string}
 */
export function roleLine(role, location) {
  return `${role} based in ${location}`;
}
