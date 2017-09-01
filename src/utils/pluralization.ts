import { includes } from './array';

/**
 * Contains pluralization rules that can be used.
 *
 * Some references and explanations of the CDLR plural rules:
 *  - http://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html
 *  - http://unicode.org/reports/tr35/tr35-numbers.html#Language_Plural_Rules
 *  - http://cldr.unicode.org/index/cldr-spec/plural-rules
 *
 * These rules were ported from rails-i18n:
 *  - https://github.com/svenfuchs/rails-i18n
 *
 * @preferred
 */

/**
 * Rule functions must return one of these types.
 */
export enum PluralCategory {
  Zero = 'zero',
  One = 'one',
  Two = 'two',
  Few = 'few',
  Many = 'many',
  Other = 'other',
};

export function arabic(n: number):  PluralCategory {
  const mod100: number = n % 100;
  const isInteger: boolean = Math.floor(n) === n;

  if (n === 0) {
    return PluralCategory.Zero;
  } else if (n === 1) {
    return PluralCategory.One;
  } else if (n === 2) {
    return PluralCategory.Two;
  } else if (isInteger && mod100 >= 3 && mod100 <= 10) {
    return PluralCategory.Few;
  } else if (isInteger && mod100 >= 11 && mod100 <= 99) {
    return PluralCategory.Many;
  }

  return PluralCategory.Other;
}

export function eastSlavic(n: number): PluralCategory {
  const mod10: number = n % 10;
  const mod100: number = n % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return PluralCategory.One;
  } else if (includes([2, 3, 4], mod10) && !includes([12, 13, 14], mod100)) {
    return PluralCategory.Few;
  } else if (mod10 === 0 || includes([5, 6, 7, 8, 9], mod10) || includes([11, 12, 13, 14], mod100)) {
    return PluralCategory.Many;
  }

  return PluralCategory.Other;
}

export function oneOther(n: number): PluralCategory {
  return n === 1 ? PluralCategory.One : PluralCategory.Other;
}

export function oneTwoOther(n: number): PluralCategory {
  if (n === 1) {
    return PluralCategory.One;
  } else if (n === 2) {
    return PluralCategory.Two;
  }

  return PluralCategory.Other;
}

export function oneUpToTwoOther(n: number): PluralCategory {
  return n >= 0 && n < 2 ? PluralCategory.One : PluralCategory.Other;
}

export function oneWithZeroOther(n: number): PluralCategory {
  return n === 0 || n === 1 ? PluralCategory.One : PluralCategory.Other;
}

export function other(): PluralCategory {
  return PluralCategory.Other;
}

export function polish(n: number): PluralCategory {
  const mod10: number = n % 10;
  const mod100: number = n % 100;

  if (n === 1) {
    return PluralCategory.One;
  } else if (includes([2, 3, 4], mod10) && !includes([12, 13, 14], mod100)) {
    return PluralCategory.Few;
  } else if (includes([0, 1, 5, 6, 7, 8, 9], mod10) || includes([12, 13, 14], mod100)) {
    return PluralCategory.Many;
  }

  return PluralCategory.Other;
}

export function westSlavic(n: number): PluralCategory {
  if (n === 1) {
    return PluralCategory.One;
  } else if (includes([2, 3, 4], n)) {
    return PluralCategory.Few;
  }

  return PluralCategory.Other;
}
