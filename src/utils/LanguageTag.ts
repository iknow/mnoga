// Build a regular expression that can be used to parse BCP47 Language Tags.
// Spec: https://www.ietf.org/rfc/bcp/bcp47.txt
const IETF_LANG_TAG: RegExp = /[A-Za-z]{2,3}(?:(?:-[A-Za-z]{3}){1,3})?|[[A-Za-z]{4,8}]/;
const IETF_SCRIPT_TAG: RegExp = /[A-Za-z]{4}/;
const IETF_REGION_TAG: RegExp = /[A-Za-z]{2}|[0-9]{3}/;

// Will only capture the language, script and region. Other sections of the language tag
// will be ignored.
const IETF_LANGUAGE: RegExp = new RegExp(
  '^' +
  `(${IETF_LANG_TAG.source})` +

  // The hyphens are undesired, so don't capture them. Only capture the inner contents.
  `(?:-(${IETF_SCRIPT_TAG.source}))?` +
  `(?:-(${IETF_REGION_TAG.source}))?` +

  // Should either be a hyphen (for other subtags we don't care about) or the end of the string
  '(?:-|$)'
);

/**
 * Class for parsing BCP47 language tags.
 */
export default class LanguageTag {
  readonly language: string;
  readonly region: string | undefined;
  readonly script: string | undefined;

  // Keep a copy of the normalized string.
  private normalizedString: string;

  constructor(languageTag: string) {
    const matches: string[] | null = IETF_LANGUAGE.exec(languageTag);

    if (matches === null) {
      throw new Error(`${languageTag} is not a valid language tag.`);
    }

    // Standardize the format.
    this.language = matches[1].toLowerCase();
    this.script =
      matches[2] ? matches[2].toLowerCase().replace(/^[a-z]/, (c) => c.toUpperCase()) : undefined;
    this.region = matches[3] ? matches[3].toUpperCase() : undefined;

    const region = this.hasRegion() ? `-${this.region}` : '';
    const script = this.hasScript() ? `-${this.script}` : '';
    this.normalizedString = `${this.language}${script}${region}`;
  }

  public hasRegion(): boolean {
    return !!this.region;
  }

  public hasScript(): boolean {
    return !!this.script;
  }

  public toString(): string {
    return this.normalizedString;
  }

  public static toString(languageTag: string): string {
    return new LanguageTag(languageTag).toString();
  }
}
