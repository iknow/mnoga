import {
  PluralCategory,
  arabic,
  eastSlavic,
  oneOther,
  oneTwoOther,
  oneUpToTwoOther,
  oneWithZeroOther,
  other,
  polish,
  westSlavic,
} from './pluralization';
import LanguageTag from './LanguageTag';

/**
 * Utility methods and interfaces that are used by Mnoga and can be used in applications that want
 * to handle their own localization state.
 */

// Define some variables for validating keys and key context.
const CONTEXT_CHARACTERS = '[A-Za-z0-9-_]+';
const DELIMITER = '.';

// Used to find variable names inside the output string.
const INTERPOLATION_REGEX = /%{([^}]*)}/g;

export const VALID_KEY_CONTEXT = new RegExp(`^${CONTEXT_CHARACTERS}$`);
const VALID_KEY = new RegExp(`^${CONTEXT_CHARACTERS}(${DELIMITER}${CONTEXT_CHARACTERS})*$`);

/**
 * Aliases are a way of saying that one locale should be substituted for another locale. These
 * should be used when a locale is not officially supported, but is preferred to fallback on a
 * different locale. For example, `en-AU` could point to `en-GB` if we wanted Australians to see
 * British English translations, instead of falling back to `en`.
 */
export interface Aliases {
 [propName: string]: string | undefined;
}

interface Set {
  [propName: string]: boolean | undefined;
}

export interface Translations {
  [propName: string]: Translations | string | undefined;
}

export interface TData {
  count?: number;
  [propName: string]: string | number | undefined;
}

/**
 * @param data
 * @param delimiter
 * @param interpolationFormat
 * @param key
 * @param keyFormat
 * @param locales
 * @param rules
 * @param translations
 */
export interface TOptions {
  data: TData;
  delimiter?: string;
  interpolationFormat?: RegExp;
  key: string;
  keyFormat?: RegExp;
  locales: string[];
  rules?: Rules;
  translations: Translations;
}

export interface Rule {
  (n: number): PluralCategory;
}

export interface Rules {
  [propName: string]: Rule | undefined;
}

// The rules that will be used if no rules are specified.
export const DEFAULT_RULES: Rules = Object.freeze({
  af: oneOther,
  ar: arabic,
  be: eastSlavic,
  cs: westSlavic,
  de: oneOther,
  el: oneOther,
  en: oneOther,
  es: oneOther,
  fi: oneOther,
  fr: oneUpToTwoOther,
  hi: oneWithZeroOther,
  id: other,
  it: oneOther,
  iu: oneTwoOther,
  ja: other,
  ko: other,
  ms: other,
  my: other,
  ne: oneOther,
  nl: oneOther,
  pl: polish,
  pt: oneOther,
  th: other,
  tr: other,
  sk: westSlavic,
  sw: oneOther,
  uk: eastSlavic,
  ru: eastSlavic,
  vi: other,
  zh: other,
});

/**
 * Performs a locale lookup for a single best locale. This performs quite similarly to
 * RFC documentation on looking up locales: https://tools.ietf.org/html/rfc4647#section-3.4.
 *
 * @param preferredLocales  User locales or environment locales, ordered by preference.
 * @param supportedLocales  Locales that the application supports.
 * @param aliases           Locales that are not officially supported, but can be substituted if
 *                          available.
 * @returns                 The first locale that exactly matches or has a subset that matches.
 *                          Results can be undefined if no match is found.
 */
export function localeLookup(
  preferredLocales: string | string[],
  supportedLocales: string[],
  aliases?: Aliases
): string | undefined {
  // Normalize all the locales.
  const normalizedPreferredlocales = getCanonicalLocales(preferredLocales);
  const supportedSet: Set = {};

  getCanonicalLocales(supportedLocales).forEach((l) => (supportedSet[l] = true));

  // Normalize aliases.
  const normalizedAliases: Aliases = {};

  if (isAlias(aliases)) {
    for (let key in aliases) {
      const value = aliases[key];

      if (typeof value === 'string') {
        const canonicalLocale = getCanonicalLocale(key);
        normalizedAliases[canonicalLocale] = getCanonicalLocale(value);
      }
    }
  }

  // Since aliases may or may not be normalized,
  // If there is no match found while iterating through the list, use this one.
  const possibleLocales: string[] = [];

  // Create a new list of locales that will increase the odds of matching.
  const baseSet: Set = {};

  // Add locales to the base set.
  normalizedPreferredlocales.forEach((l) => (baseSet[l] = true));

  // Create list of possible locales.
  for (let i = 0; i < normalizedPreferredlocales.length; i++) {
    const current = normalizedPreferredlocales[i];

    possibleLocales.push(current);

    // Create subsets of current and add them to the list of possible locales.
    // Only add them if they aren't subsets of the next locale or if they appear later in the
    // preference list.
    const next = normalizedPreferredlocales[i + 1] || '';
    const subsets = makeSubsets(current).filter((s) => !baseSet[s] && next.search(s) === -1);

    possibleLocales.push(...subsets);
  }

  const matchedLocales =
    possibleLocales
      // Swap any locales that have aliases with their alias.
      .map((l) => {
        const alias = normalizedAliases[l];
        return typeof alias === 'string' ? alias : l;
      })
      // Filter for a locale that is in the supported set.
      .filter((l) => supportedSet[l] === true);

  // Return the first locale that matched (or undefined if it is not available).
  return matchedLocales[0];
}

function isAlias(aliases: Aliases | undefined): aliases is Aliases {
  return typeof aliases === 'object';
}

function isTranslations(translations: Translations[string]): translations is Translations {
  return typeof translations === 'object';
}

/**
 * Generates viable subsets from a given locale.
 *
 * Examples:
 * ```
 * new LanguageTag('zh-Hant-HK').makeSubsets()    // ['zh-Hant', 'zh']
 * new LanguageTag('zh-HK').makeSubsets()         // ['zh']
 * new LanguageTag('zh-Hant').makeSubsets()       // ['zh']
 * new LanguageTag('zh').makeSubsets()            // []
 * ```
 */
function makeSubsets(locale: string): string[] {
  const subsets: string[] = [];
  const languageTag = new LanguageTag(locale);

  if (languageTag.hasRegion() && languageTag.hasScript()) {
    subsets.push(`${languageTag.language}-${languageTag.script}`);
  }

  if (languageTag.language !== languageTag.toString()) {
    subsets.push(languageTag.language);
  }

  return subsets;
}

/**
 * Canonicalize a single locale.
 */
export function getCanonicalLocale(locale: string): string {
  return LanguageTag.toString(locale);
}

/**
 * Returns an array of canonicalized locales. This method does what the specification for
 * Intl.getCanonicalLocales does.
 *
 * ```
 * getCanonicalLocales('EN-US'); // ["en-US"]
 * getCanonicalLocales(['EN-US', 'Fr']); // ["en-US", "fr"]
 * ```
 */
export function getCanonicalLocales(locales: string | string[]): string[] {
  if (typeof locales === 'string') {
    return [getCanonicalLocale(locales)];
  } else {
    return locales.map(getCanonicalLocale);
  }
}

/**
 * Look up a translation with the given key and locales.
 *
 * NOTE: Locales that are passed into this method are not normalized. It is important do this if
 * the list of locales are arbitrary (for example, an end users browser). Look into using
 * `getCanonicalLocales` on locales, rule keys and translation keys.
 */
export function t(options: TOptions): string {
  const {
    data = {},
    delimiter = DELIMITER,
    interpolationFormat = INTERPOLATION_REGEX,
    key = '',
    keyFormat = VALID_KEY,
    locales = [],
    rules = DEFAULT_RULES,
    translations = {},
  } = options;

  // If the key is a not valid (or not even a string), throw an error.
  if (!key.match(keyFormat)) {
    throw new Error(
      `${key} is not a valid key format. ` +
      `Valid keys are of the format ${keyFormat.toString()}`);
  }

  // Loop through the locales and try to find an appropriate translation.
  for (let i = 0; i < locales.length; i++) {
    const locale = locales[i];
    const contexts = key.split(delimiter);

    let translation: Translations[string] = translations[locale];

    // Iterate through the contexts, getting the next value in the translations.
    for (let j = 0; j < contexts.length; j++) {
      const context = contexts[j];
      translation = isTranslations(translation) ? translation[context] : undefined;
    }

    // If there is a count and an object comes back, check if this key is a plural context.
    if (isTranslations(translation) && typeof data.count === 'number') {
      const rule: Rule = rules[locale] || other;
      const context = rule(data.count);
      translation = translation[context];
    }

    // If the translation is equal to string, interpolate and return.
    if (typeof translation === 'string') {
      return translation
        .replace(interpolationFormat, (exp, arg) => {
          const result = data[arg];
          return typeof result === 'string' ? result :
                 typeof result === 'number' ? `${result}` :
                 exp;
        });
    }
  }

  // Fallback to the key.
  return key;
}
