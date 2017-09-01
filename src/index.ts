import { includes } from './utils/array';
import {
  Aliases,
  DEFAULT_RULES,
  getCanonicalLocale,
  getCanonicalLocales,
  localeLookup,
  Rule,
  Rules,
  t,
  Translations,
  TData,
  VALID_KEY_CONTEXT,
} from './utils/i18n';

// Default locale is english.
const DEFAULT_LOCALE = 'en';

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
  private rules: Rules = { ...DEFAULT_RULES };
  private subscribers: Function[] = [];
  private translations: Translations = {};

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
    const normalizedLocale = getCanonicalLocale(locale);
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
    const aliases = getCanonicalLocales(alias);
    const normalizedLocale = getCanonicalLocale(locale);

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
    const normalized = getCanonicalLocale(fallback);

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
    const supportedLocales = Object.keys(this.translations);
    const matchedLocale = localeLookup(locale, supportedLocales, this.aliases);

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
    const locales: string[] = getCanonicalLocales(locale);
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
    const locales = getCanonicalLocales(locale);
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
  public t(key: string, data: TData = {}, options: TOptions = {}): string {
    // If key mode is enabled, simply return the key.
    if (this.getKeyMode()) {
      return key;
    }

    const locales: string[] = [];

    // If options has a locale, normalize it and use that instead of locale. Otherwise, check
    // if locale is even set and add that to possible locales.
    if (options.locale !== undefined) {
      locales.push(getCanonicalLocale(options.locale));
    } else if (this.locale !== undefined) {
      locales.push(this.locale);
    }

    if (options.fallback !== undefined) {
      locales.push(getCanonicalLocale(options.fallback));
    } else {
      locales.push(this.fallback);
    }

    return t({ data, key, locales, rules: this.rules, translations: this.translations });
  }

  protected callSubscribers(): void {
    // Make a copy of the subscribers before iterating over them in case one of the subscribers
    // triggers a call to `this.subscribe`.
    const currentSubscribers = this.subscribers.slice();
    currentSubscribers.forEach((subscriber) => subscriber());
  }

  /**
   * Clones the translations object passed in. However, it will also verify that each context
   * of a key is valid.
   */
  private cloneTranslations(translations: Translations): Translations {
    const newTranslations = { ...translations };

    for(const context in newTranslations) {
      if (!context.match(VALID_KEY_CONTEXT)) {
        throw new Error(
          `${context} is not a valid key context. ` +
          `Valid keys should be of the format ${VALID_KEY_CONTEXT.toString()}.`);
      }

      const value = newTranslations[context];

      if (this.isTranslations(value)) {
        newTranslations[context] = this.cloneTranslations(value);
      }
    }

    return newTranslations;
  }

  private deleteFrom(locale: string | string[], lookup: Aliases | Rules | Translations): void {
    const locales = getCanonicalLocales(locale);
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

  private isTranslations(translations: Translations[string]): translations is Translations {
    return typeof translations === 'object';
  }
}
