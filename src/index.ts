import { LanguageTag } from './utils/LanguageTag';
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
const INTERPOLATION_REGEX = /%\{([^}]*)\}/g;

// Default locale is english.
const DEFAULT_LOCALE = 'en';

// Export PluralCategory so it is easy for others to create rules.
export { PluralCategory };

interface Aliases {
  [propName: string]: string;
};

export interface Translations {
  [propName: string]: Translations | string;
};

export interface Rule {
  (n: number): PluralCategory;
};

interface Rules {
  [propName: string]: Rule;
}

interface SetLocaleOptions {
  ignorePreferenceChain?: boolean;
}

export interface TDataObject {
  count?: number;
  [propName: string]: string | number | undefined;
};

export interface TOptions {
  fallback?: string;
  locale?: string;
}

export interface Unsubscribe {
  (): void;
}

type TranslationLookup = Translations | string | undefined;

export class Mnoga {
  private aliases: Aliases = {};
  private fallback: string = DEFAULT_LOCALE;
  private keyMode: boolean = false;
  private locale: string = DEFAULT_LOCALE;
  private rules: Rules = {};
  private subscribers: Function[] = [];
  private translations: Translations = {};

  // For warnings.
  private pluralWarning: Set<string>;

  constructor() {
    // Set the default rules.
    // TODO: Add 30 most common languages.
    this.setRule('ar', arabic);
    this.setRule('ru', eastSlavic);
    this.setRule(['en', 'es', 'it', 'pt'], oneOther);
    this.setRule(['id', 'ja', 'ko', 'th', 'tr', 'vi', 'zh'], other);
    this.setRule('hi', oneWithZeroOther);
    this.setRule('iu', oneTwoOther);
    this.setRule('fr', oneUpToTwoOther);
    this.setRule('pl', polish);
    this.setRule('cs', westSlavic);
  }

  public deleteAlias(locale: string | string[]) {
    this.deleteFrom(locale, this.aliases);
  }

  public deleteRule(locale: string | string[]) {
    this.deleteFrom(locale, this.rules);
  }

  public deleteTranslations(locale: string | string[]) {
    this.deleteFrom(locale, this.translations);
  }

  public getFallback(): string {
    return this.fallback;
  }

  public getKeyMode(): boolean {
    return !!this.keyMode;
  }

  public getLocale(): string {
    return this.locale.toString();
  }

  public hasTranslationsForLocale(locale: string): boolean {
    const normalized = this.normalizeLocale(locale);
    return normalized in this.translations;
  }

  /**
   * Creates an alias for a locale.
   *
   * This method makes it so a locale will be substituted when looking for an optimal locale using
   * setLocale. An ideal use for this method is when you don't technically support a region/locale,
   * but have a decent fallback for it.
   *
   * For example, let's say you have translations for ['en-US', 'en-GB']. You might prefer a user
   * with locale 'en-AU' to fallback to 'en-GB', even though it's not technically supported.
   *
   * mnoga.setTranslations('en-GB', { ... });
   * mnoga.setAlias('en-AU', 'en-GB');
   * mnoga.setLocale('en-AU');
   * mnoga.getLocale(); // will print 'en-GB'
   */
  public setAlias(alias: string | string[], locale: string): void {
    // Normalize locales.
    const aliases = this.normalizeLocales(alias);
    const normalizedLocale = this.normalizeLocale(locale);

    // Prevent recursive behavior.
    if (normalizedLocale in this.aliases || aliases.includes(normalizedLocale)) {
      throw new Error(`${locale} cannot already be an alias.`);
    }

    // Make sure no aliases have a translation.
    aliases
      .forEach((a) => {
        if (this.hasTranslationsForLocale(a)) {
          throw new Error(`${a} has translations set and should not be used as an alias.`);
        }
      });

    const hasChanges =
      aliases
        .map((a) => {
          if (this.aliases[a] !== normalizedLocale) {
            this.aliases[a] = normalizedLocale;
            return true;
          } else {
            return false;
          }
        })
        .includes(true);

    if (hasChanges) {
      this.callSubscribers();
    }
  }

  /**
   * Sets a locale to fallback to when a string is unavailable for the main locale. Ideally, the
   * fallback locale has a translation for every key.
   */
  public setFallback(fallback: string) {
    const normalized = this.normalizeLocale(fallback);

    if (this.fallback !== normalized) {
      this.fallback = normalized;
      this.callSubscribers();
    }
  }

  public setKeyMode(toggle: boolean): void {
    if (this.keyMode !== toggle) {
      this.keyMode = toggle;
      this.callSubscribers();
    }
  }

  /**
   * Sets the locales to use when calling t(). By default, the method tries to find an ideal
   * fallback sequence for the provided locale. For example, ['zh-Hant-HK', 'zh-Hant-TW']
   * would try to match: ['zh-Hant-HK', 'zh-Hant-TW', 'zh-Hant', 'zh'].
   *
   * If passed an array of locales in order of preferences, the first locale that has translations
   * will be chosen. If no translations are found, then the first locale will be set.
   *
   * This method should be called after setting up all rules and translations.
   */
  public setLocale(locale: string | string[]): void {
    // Normalize all the locales.
    const locales: string[] = this.normalizeLocales(locale);

    // If there is no match found while iterating through the list, use this one.
    const possibleLocales: string[] = [];

    // Create a new list of locales that will increase the odds of matching.
    const baseSet: Set<string> = new Set(locales);

    for (let i = 0; i < locales.length; i++) {
      const current = locales[i];

      possibleLocales.push(current);

      // Create subsets of current and add them to the list of possible locales.
      // Only add them if they aren't subsets of the next locale or if they appear later in the
      // preference list.
      const next = locales[i + 1] || '';
      const subsets = this.makeSubsets(current).filter((s) => !baseSet.has(s) && !next.includes(s));

      possibleLocales.push(...subsets);
    }

    const matchedLocale =
      possibleLocales
        // Swap any locales that have aliases with their alias.
        .map((l) => this.aliases[l] || l)
        .find((l) => this.hasTranslationsForLocale(l)) || locales[0];

    if (matchedLocale !== this.locale) {
      this.locale = matchedLocale;
      this.callSubscribers();
    }
  }

  /**
   * Sets a rule for pluralizing a locale.
   *
   * If provided an array, will set the rule for all locales in the array.
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

    const hasChanges = locales.map(mapper).includes(true);

    if (hasChanges) {
      this.callSubscribers();
    }
  }

  /**
   * Sets the translations for a particular locale or locales.
   *
   * Since different environments offer different varieties of language tags, it is suggested
   * that languages that may have script tags list all possiblities.
   *
   * For example, when listing all the possible locales for chinese:
   *
   * const mnoga = new Mnoga();
   *
   * // For traditional chinese language tags.
   * mnoga.setTranslations(['zh-Hant', 'zh-HK', 'zh-TW'], ...);
   *
   * // Fallback for all other chinese language tags.
   * mnoga.setTranslations('zh', ...);
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
   */
  public subscribe(handler: Function): Unsubscribe {
    this.subscribers.push(handler);

    return () => {
      const index: number = this.subscribers.indexOf(handler);
      this.subscribers.splice(index, 1);
    };
  }

  /**
   * Find an appropriate translation for a given key.
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

    const { fallback = this.fallback, locale = this.locale } = options;
    const locales: string[] = [locale, fallback];

    // Loop through the locales and try to find an appropriate translation.
    for (let i = 0; i < locales.length; i++) {
      const locale = locales[i];
      const contexts = key.split('.');

      let translation: TranslationLookup =
        contexts.reduce(this.translationReducer, this.translations[locale]);

      // If there is a count and an object comes back, check if this key is a plural context.
      if (typeof translation === 'object' && typeof data.count === 'number') {
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

  private callSubscribers(): void {
    this.subscribers.map((subscriber) => subscriber());
  }

  /**
   * Clones the translations object passed in. However, it will also verify that each context
   * of a key is valid.
   */
  private cloneTranslations(translations: Translations): Translations {
    const newTranslations = { ...translations };

    Object
      .keys(newTranslations)
      .forEach((context) => {
        if (process.env.NODE_ENV !== 'production') {
          if (!context.match(VALID_KEY_CONTEXT)) {
            throw new Error(
              `${context} is not a valid key context. ` +
              `Valid keys should be of the format ${VALID_KEY_CONTEXT.toString()}.`);
          }
        }

        if (typeof newTranslations[context] === 'object') {
          newTranslations[context] =
            this.cloneTranslations(<Translations>newTranslations[context]);
        }
      });

    return newTranslations;
  }

  private deleteFrom(locale: string | string[], lookup: Rules | Translations): void {
    const locales = this.normalizeLocales(locale);
    const mapper = (l: string) => {
      if (l in lookup) {
        delete lookup[l];
        return true;
      } else {
        return false;
      }
    };

    const hasChanges = locales.map(mapper).includes(true);

    if (hasChanges) {
      this.callSubscribers();
    }
  }

  /**
   * Looks up the appropriate key context for the locale and number.
   */
  private getPluralContext(locale: string, count: number): PluralCategory {
    const { language } = new LanguageTag(locale);
    const rule: Rule = this.rules[locale] || this.rules[language];

    // Since the locale may be determined by the end user's environment, do not throw an error. For
    // better debugging purposes, though, print a warning stating that there is no rule for this
    // locale.
    if (rule === undefined) {
      if (this.pluralWarning === undefined) {
        this.pluralWarning = new Set();
      }

      if (!this.pluralWarning.has(language)) {
        this.pluralWarning.add(language);
        console.warn(`No pluralization rule found for ${locale}.`);
      }
    }

    return rule !== undefined ? rule(count) : other();
  }

  /**
   * Generates all possible subsets from a language tag.
   *
   * Examples:
   * new LanguageTag('zh-Hant-HK').makeSubsets()    // ['zh-Hant', 'zh']
   * new LanguageTag('zh-HK').makeSubsets()         // ['zh']
   * new LanguageTag('zh-Hant').makeSubsets()       // ['zh']
   * new LanguageTag('zh').makeSubsets()            // []
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

  private translationReducer(translations: Translations, context: string): TranslationLookup {
    return typeof translations === 'object' ? translations[context] : undefined;
  }
}
