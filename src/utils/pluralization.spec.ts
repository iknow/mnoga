/**
 * Jacked some of the tests from rails-i18n:
 *  - https://github.com/svenfuchs/rails-i18n
 *
 * Remaining tests compiled from:
 *  - http://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html
 */
import { expect } from 'chai';
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

function testRule(count: number[], rule: (n: number) => PluralCategory, expected: PluralCategory) {
  count.forEach((n) => {
    expect(rule(n), `for ${n}`).to.equal(expected);
  });
}

describe('arabic', () => {
  it('returns PluralCategory.Zero', () => {
    testRule([0], arabic, PluralCategory.Zero);
  });

  it('returns PluralCategory.One', () => {
    testRule([1], arabic, PluralCategory.One);
  });

  it('returns PluralCategory.Two', () => {
    testRule([2], arabic, PluralCategory.Two);
  });

  it('returns PluralCategory.Few', () => {
    const count = [3, 4, 5, 6, 7, 8, 9, 10, 103, 104, 105, 106, 107, 108, 109, 1003, 1009, 10003];
    testRule(count, arabic, PluralCategory.Few);
  });

  it('returns PluralCategory.Many', () => {
    const count = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 1011, 1026];
    testRule(count, arabic, PluralCategory.Many);
  });

  it('returns PluralCategory.Other', () => {
    const count = [0.1, 0.5, 0.9, 1.1, 1.5, 1.9, 100, 101, 102, 200, 201, 202, 1000, 1001, 1002];
    testRule(count, arabic, PluralCategory.Other);
  });
});

describe('eastSlavic', () => {
  it('returns PluralCategory.One', () => {
    testRule([1, 21, 51, 71, 101, 1031], eastSlavic, PluralCategory.One);
  });

  it('returns PluralCategory.Few', () => {
    testRule([2, 3, 4, 22, 23, 24, 92, 93, 94], eastSlavic, PluralCategory.Few);
  });

  it('returns PluralCategory.Many', () => {
    testRule([0, 5, 8, 10, 11, 18, 20, 25, 27, 30, 35, 38, 40], eastSlavic, PluralCategory.Many);
  });

  it('returns PluralCategory.Other', () => {
    testRule([1.2, 3.7, 11.5, 20.8, 1004.3], eastSlavic, PluralCategory.Other);
  });
});

describe('oneOther', () => {
  it('returns PluralCategory.One', () => {
    testRule([1], oneOther, PluralCategory.One);
  });

  it('returns PluralCategory.Other', () => {
    testRule([0, 0.4, 1.2, 2, 5, 11, 21, 22, 27, 99, 1000], oneOther, PluralCategory.Other);
  });
});

describe('oneTwoOther', () => {
  it('returns PluralCategory.One', () => {
    testRule([1], oneTwoOther, PluralCategory.One);
  });

  it('returns PluralCategory.Two', () => {
    testRule([2], oneTwoOther, PluralCategory.Two);
  });

  it('returns PluralCategory.Other', () => {
    testRule(
      [0, 0.3, 1.2, 3, 5, 10, 11, 21, 23, 31, 50, 81, 99, 100], oneTwoOther, PluralCategory.Other);
  });
});

describe('oneUpToTwoOther', () => {
  it('returns PluralCategory.One', () => {
    testRule([0, 0.5, 1, 1.2, 1.8], oneUpToTwoOther, PluralCategory.One);
  });

  it('returns PluralCategory.Other', () => {
    testRule([2, 2.1, 5, 11, 21, 22, 37, 40, 900.5], oneUpToTwoOther, PluralCategory.Other);
  });
});

describe('oneWithZeroOther', () => {
  it('returns PluralCategory.One', () => {
    testRule([0, 1], oneWithZeroOther, PluralCategory.One);
  });

  it('returns PluralCategory.Other', () => {
    testRule([0.4, 1.2, 2, 5, 11, 21, 22, 27, 99, 1000], oneWithZeroOther, PluralCategory.Other);
  });
});

describe('other', () => {
  it('returns PluralCategory.Other', () => {
    testRule([0, 1, 1.2, 2, 5, 11, 21, 22, 27, 99, 1000], other, PluralCategory.Other);
  });
});

describe('polish', () => {
  it('returns PluralCategory.One', () => {
    testRule([1], polish, PluralCategory.One);
  });

  it('returns PluralCategory.Few', () => {
    const count = [2, 3, 4, 22, 23, 24, 32, 33, 34, 42, 43, 44, 52, 53, 54, 62, 102, 1002];
    testRule(count, polish, PluralCategory.Few);
  });

  it('returns PluralCategory.Many', () => {
    const count =
      [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 100, 1000];
    testRule(count, polish, PluralCategory.Many);
  });

  it('returns PluralCategory.Other', () => {
    const count = [0.1, 0.5, 0.9, 1.1, 1.5, 1.9, 10.1, 10.5, 10.9, 100.1, 100.5, 1000.1, 1000.5];
    testRule(count, polish, PluralCategory.Other);
  });
});

describe('westSlavic', () => {
  it('returns PluralCategory.One', () => {
    testRule([1], westSlavic, PluralCategory.One);
  });

  it('returns PluralCategory.Few', () => {
    testRule([2, 3, 4], westSlavic, PluralCategory.Few);
  });

  it('returns PluralCategory.Other', () => {
    testRule([0, 0.5, 1.7, 2.1, 5, 7.8, 10, 875], westSlavic, PluralCategory.Other);
  });
});
