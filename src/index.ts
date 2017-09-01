import { includes } from './utils/array';
import LanguageTag from './utils/LanguageTag';
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
} from './utils/pluralization';

// Define some variables for validating keys and key context.
const CONTEXT_CHARACTERS = '[A-Za-z0-9-_]+';
const DELIMITER = '.';

const VALID_KEY_CONTEXT = new RegExp(`^${CONTEXT_CHARACTERS}$`);
const VALID_KEY = new RegExp(`^${CONTEXT_CHARACTERS}(${DELIMITER}${CONTEXT_CHARACTERS})*$`);

// Used to find variable names inside the output string.
const INTERPOLATION_REGEX = /%{([^}]*)}/g;

// Default locale is english.
const DEFAULT_LOCALE = 'en';

// Export PluralCategory so it is easy for others to create rules.
export { PluralCategory };

interface Aliases {
  [propName: string]: string | undefined;
}

export interface Translations {
  [propName: string]: Translations | string | undefined;
}

interface Set {
  [propName: string]: boolean | undefined;
};

export interface Rule {
  (n: number): PluralCategory;
}

interface Rules {
  [propName: string]: Rule | undefined;
}

export interface TDataObject {
  count?: number;
  [propName: string]: string | number | undefined;
}

export interface TOptions {
  fallback?: string;
  locale?: string;
}

export interface Unsubscribe {
  (): void;
}

export default class Mnoga {
  private aliases: Aliases = {};
  private fallback: string = DEFAULT_LOCALE;
  private keyMode: boolean = false;
  private locale?: string;
  private rules: Rules = {};
  private subscribers: Function[] = [];
  private translations: Translations = {};

  // For warnings.
  private pluralWarning: Set = {};

  constructor() {
    // Set the default rules.
    this.setRule('ar', arabic);
    this.setRule(['be', 'uk', 'ru'], eastSlavic);
    this.setRule(['af', 'de', 'el', 'en', 'es', 'fi', 'it', 'ne', 'nl', 'pt', 'sw'], oneOther);
    this.setRule(['id', 'ja', 'ko', 'ms', 'my', 'th', 'tr', 'vi', 'zh'], other);
    this.setRule('hi', oneWithZeroOther);
    this.setRule('iu', oneTwoOther);
    this.setRule('fr', oneUpToTwoOther);
    this.setRule('pl', polish);
    this.setRule(['cs', 'sk'], westSlavic);
  }

  /**
   * Remove an alias to a locale.
   * @param locale  Locale or list of locales that are already aliased.
   */
  public deleteAlias(locale: string | string[]) {
    this.deleteFrom(locale, this.aliases);
  }

  /**
   * Remove a pluralization rule for a locale.
   * @param locale  Locale or list of locales that have pluralization rules.
   */
  public deleteRule(locale: string | string[]) {
    this.deleteFrom(locale, this.rules);
  }

  /**
   * Remove a set of translation for a locale.
   * @param locale  Locale or list of locales that have a set of translations.
   */
  public deleteTranslations(locale: string | string[]) {
    this.deleteFrom(locale, this.translations);
  }

  /**
   * @returns The locale that will be used if the primary locale could not be found.
   */
  public getFallback(): string {
    return this.fallback;
  }

  /**
   * @returns True if in key mode, false if not.
   */
  public getKeyMode(): boolean {
    return this.keyMode;
  }

  /**
   * @returns The locale that is primarily being used to look up translations. This may actually be
   *          the fallback locale if no suitable locales have been passed to setLocale.
   */
  public getLocale(): string {
    return this.locale || this.fallback;
  }

  public hasTranslationsForLocale(locale: string): boolean {
    const normalizedLocale = this.normalizeLocale(locale);
    return this.isTranslations(this.translations[normalizedLocale]);
  }

  /**
   * Creates an alias for a locale.
   *
   * This method makes it so a locale will be substituted when looking for an optimal locale using
   * setLocale. An ideal use for this method is when you don't technically support a region/locale,
   * but have a decent fallback for it.
   *
   * For example, let's say you have translations for `['en-US', 'en-GB']`. You might prefer a user
   * with locale `en-AU` to fallback to `en-GB`, even though it's not technically supported.
   *
   * ```
   * const mnoga = new Mnoga();
   *
   * mnoga.setTranslations('en-GB', { ... });
   * mnoga.setAlias('en-AU', 'en-GB');
   * mnoga.setLocale('en-AU');
   * mnoga.getLocale(); // will print 'en-GB'
   * ```
   *
   * @param alias   Locale or locales that should be substituted for.
   * @param locale  The locale that should be used in the place of the alias.
   */
  public setAlias(alias: string | string[], locale: string): void {
    // Normalize locales.
    const aliases = this.normalizeLocales(alias);
    const normalizedLocale = this.normalizeLocale(locale);

    // Prevent recursive behavior.
    if (normalizedLocale in this.aliases || includes(aliases, normalizedLocale)) {
      throw new Error(`${locale} cannot already be an alias.`);
    }

    // Make sure no aliases have a translation.
    aliases
      .forEach((a) => {
        if (this.hasTranslationsForLocale(a)) {
          throw new Error(`${a} has translations set and should not be used as an alias.`);
        }
      });

    const mapper = (a: string) => {
      if (this.aliases[a] !== normalizedLocale) {
        this.aliases[a] = normalizedLocale;
        return true;
      } else {
        return false;
      }
    };

    const hasChanges = includes(aliases.map(mapper), true);

    if (hasChanges) {
      this.callSubscribers();
    }
  }

  /**
   * Sets a locale to fallback to when a string is unavailable for the main locale. Ideally, the
   * fallback locale has a translation for every key.
   *
   * @param fallback  Locale that should be used when primary locale can't be found.
   */
  public setFallback(fallback: string): void {
    const normalized = this.normalizeLocale(fallback);

    if (this.fallback !== normalized) {
      this.fallback = normalized;
      this.callSubscribers();
    }
  }

  /**
   * Having key mode on will cause the `t` method to always return the key. This may be useful for
   * debugging.
   */
  public setKeyMode(toggle: boolean): void {
    if (this.keyMode !== toggle) {
      this.keyMode = toggle;
      this.callSubscribers();
    }
  }

  /**
   * Sets the locales to use when calling t(). By default, the method tries to find an ideal
   * fallback sequence for the provided locale. For example, `['zh-Hant-HK', 'zh-Hant-TW']`
   * would try to match: `['zh-Hant-HK', 'zh-Hant-TW', 'zh-Hant', 'zh']`.
   *
   * If passed an array of locales in order of preferences, the first locale that has translations
   * will be chosen. If no translations are found, then locale will be unset and fallback will be
   * used.
   *
   * This method should be called after setting up all rules and translations. If called before, a
   * locale might be considered unavailable and will not be chosen.
   */
  public setLocale(locale: string | string[]): void {
    // Normalize all the locales.
    const locales: string[] = this.normalizeLocales(locale);

    // If there is no match found while iterating through the list, use this one.
    const possibleLocales: string[] = [];

    // Create a new list of locales that will increase the odds of matching.
    const baseSet: Set = {};

    // Add locales to the base set.
    locales.forEach((l) => (baseSet[l] = true));

    // Create list of possible locales.
    for (let i = 0; i < locales.length; i++) {
      const current = locales[i];

      possibleLocales.push(current);

      // Create subsets of current and add them to the list of possible locales.
      // Only add them if they aren't subsets of the next locale or if they appear later in the
      // preference list.
      const next = locales[i + 1] || '';
      const subsets = this.makeSubsets(current).filter((s) => !baseSet[s] && next.search(s) === -1);

      possibleLocales.push(...subsets);
    }

    const matchedLocale =
      possibleLocales
        // Swap any locales that have aliases with their alias.
        .map((l) => this.aliases[l] || l)
        .filter((l) => this.hasTranslationsForLocale(l))[0];

    if (matchedLocale !== this.locale) {
      this.locale = matchedLocale;
      this.callSubscribers();
    }
  }

  /**
   * Sets a rule for pluralizing a locale.
   *
   * @param locale  Locale or array of locales to set the rule for.
   * @param rule    Callback that takes a number and returns a PluralCategory. Will be used whenever
   *                pluralization is required for a key that is using the specified locale.
   */
  public setRule(locale: string | string[], rule: Rule): void {
    const locales: string[] = this.normalizeLocales(locale);
    const mapper = (l: string) => {
      if (rule !== this.rules[l]) {
        this.rules[l] = rule;
        return true;
      } else {
        return false;
      }
    };

    const hasChanges = includes(locales.map(mapper), true);

    if (hasChanges) {
      this.callSubscribers();
    }
  }

  /**
   * Sets the translations for a particular locale or locales.
   *
   * @param locale        Locale or list of locales that the translations should be linked to.
   * @param translations  Nested JSON object, where object values are treated as additional context
   *                      and string values are treated as translations. Other values are not valid.
   */
  public setTranslations(locale: string | string[], translations: Translations): void {
    const locales = this.normalizeLocales(locale);
    const clonedTranslations = this.cloneTranslations(translations);

    locales.forEach((l) => {
      this.translations[l] = clonedTranslations;
    });

    this.callSubscribers();
  }

  /**
   * Subscribers are called when any of the internal state changes.
   *
   * @param handler Callback method for whenever a change occurs in the code.
   * @returns       A method that when called, will unsubscribe the handler.
   */
  public subscribe(handler: Function): Unsubscribe {
    this.subscribers.push(handler);

    return () => {
      const index: number = this.subscribers.indexOf(handler);
      this.subscribers.splice(index, 1);
    };
  }

  /**
   * Find an appropriate string for a given key. This function will attempt to find the string
   * using the primary locale, then will use the fallback if there is no match. If there are no
   * matches, then the key will be returned.
   *
   * @param key   The key for looking up the string. Context should be delimited with a period.
   * @param data  Contains data to be interpolated. `count` is a magic value for pluralization.
   * @returns     Best string match for key given.
   */
  public t(key: string, data: TDataObject = {}, options: TOptions = {}): string {
    // If we're not in production mode, be sure the people testing
    if (process.env.NODE_ENV !== 'production') {
      if (!key.match(VALID_KEY)) {
        throw new Error(
          `${key} is not a valid key format. ` +
          `Valid keys are of the format ${VALID_KEY.toString()}`);
      }
    }

    // If key mode is enabled, simply return the key.
    if (this.getKeyMode()) {
      return key;
    }

    const locales: string[] = [];

    // If options has a locale, normalize it and use that instead of locale. Otherwise, check
    // if locale is even set and add that to possible locales.
    if (options.locale !== undefined) {
      locales.push(this.normalizeLocale(options.locale));
    } else if (this.locale !== undefined) {
      locales.push(this.locale);
    }

    if (options.fallback !== undefined) {
      locales.push(this.normalizeLocale(options.fallback));
    } else {
      locales.push(this.fallback);
    }

    // Loop through the locales and try to find an appropriate translation.
    for (let i = 0; i < locales.length; i++) {
      const locale = locales[i];
      const contexts = key.split('.');

      let translation: Translations[string] = this.translations[locale];

      // Iterate through the contexts, getting the next value in the translations.
      for (let j = 0; j < contexts.length; j++) {
        const context = contexts[j];
        translation = this.isTranslations(translation) ? translation[context] : undefined;
      }

      // If there is a count and an object comes back, check if this key is a plural context.
      if (this.isTranslations(translation) && typeof data.count === 'number') {
        const pluralContext: string = this.getPluralContext(locale, data.count);
        translation = translation[pluralContext];
      }

      // If the translation is equal to string, interpolate and return.
      if (typeof translation === 'string') {
        return translation
          .replace(INTERPOLATION_REGEX, (exp, arg) => {
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

  protected callSubscribers(): void {
    this.subscribers.map((subscriber) => subscriber());
  }

  /**
   * Clones the translations object passed in. However, it will also verify that each context
   * of a key is valid.
   */
  private cloneTranslations(translations: Translations): Translations {
    const newTranslations = { ...translations };

    for(const context in newTranslations) {
      if (process.env.NODE_ENV !== 'production') {
        if (!context.match(VALID_KEY_CONTEXT)) {
          throw new Error(
            `${context} is not a valid key context. ` +
            `Valid keys should be of the format ${VALID_KEY_CONTEXT.toString()}.`);
        }
      }

      const value = newTranslations[context];

      if (this.isTranslations(value)) {
        newTranslations[context] = this.cloneTranslations(value);
      }
    }

    return newTranslations;
  }

  private deleteFrom(locale: string | string[], lookup: Aliases | Rules | Translations): void {
    const locales = this.normalizeLocales(locale);
    const mapper = (l: string) => {
      if (l in lookup) {
        delete lookup[l];
        return true;
      } else {
        return false;
      }
    };

    const hasChanges = includes(locales.map(mapper), true);

    if (hasChanges) {
      this.callSubscribers();
    }
  }

  /**
   * Looks up the appropriate key context for the locale and number.
   */
  private getPluralContext(locale: string, count: number): PluralCategory {
    const { language } = new LanguageTag(locale);
    const rule = this.rules[locale] || this.rules[language];

    // Since the locale may be determined by the end user's environment, do not throw an error. For
    // better debugging purposes, though, print a warning stating that there is no rule for this
    // locale.
    if (rule === undefined) {
      if (!this.pluralWarning[language]) {
        this.pluralWarning[language] = true;
        console.warn(`No pluralization rule found for ${locale}.`);
      }
    }

    return rule !== undefined ? rule(count) : other();
  }

  private isTranslations(translations: Translations[string]): translations is Translations {
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
  private makeSubsets(locale: string): string[] {
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

  private normalizeLocale(locale: string): string {
    return new LanguageTag(locale).toString();
  }

  private normalizeLocales(locale: string | string[]): string[] {
    if (Array.isArray(locale)) {
      return locale.map(this.normalizeLocale);
    } else if (!!locale) {
      return [this.normalizeLocale(locale)];
    } else {
      return [];
    }
  }
}
