/**
 * Compiles SCSS source to plain CSS. The `sass` package is heavy (~hundreds of
 * KB), so it is loaded lazily and code-split out of the main UI bundle.
 */
export async function compileScss(source: string): Promise<string> {
  const sass = await import('sass');
  const result = sass.compileString(source);
  return result.css;
}