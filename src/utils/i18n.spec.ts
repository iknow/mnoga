import { expect } from 'chai';
import { getCanonicalLocales, lookupLocale, lookupPhrase } from './i18n';
import { PluralCategory } from './pluralization';

describe('getCanonicalLocales', () => {
  it('takes a single argument', () => {
    expect(getCanonicalLocales('EN-US')).to.eql(['en-US']);
  });

  it('canonicalizes all locales', () => {
    expect(getCanonicalLocales(['EN-US', 'ZH-HANT-TW', 'Fr'])).to.eql(['en-US', 'zh-Hant-TW', 'fr']);
  });
});

describe('lookupLocale', () => {
  const supportedLocales = ['zh-Hant', 'zh-Hans', 'pt', 'en'];

  it('normalizes locale', () => {
    expect(lookupLocale('ZH-hANT-hk', ['zh-Hant-HK'])).to.equal('zh-Hant-HK');
  });

  it('looks up the appropriate locale', () => {
    expect(lookupLocale('zh-Hant-TW', supportedLocales)).to.equal('zh-Hant');
    expect(lookupLocale('zh-Hans-CN', supportedLocales)).to.equal('zh-Hans');
    expect(lookupLocale(['pt-BR', 'en'], supportedLocales)).to.equal('pt');
  });

  it('uses alias parameter', () => {
    expect(lookupLocale(['zh'], supportedLocales, { zh: 'zh-Hans' })).to.equal('zh-Hans');
  });

  it('returns undefined', () => {
    expect(lookupLocale('ja', supportedLocales)).to.equal(undefined);
  });
});

describe('lookupPhrase', () => {
  const phrases = {
    en: {
      context1: {
        context2: 'English Phrase',
      },
      interpolate: '%{field1} %{field2}',
      plural: {
        one: 'one',
        other: 'other',
      },
    },
    ja: {
      context1: {
        context2: 'Japanese Phrase',
      },
    },
  };

  it('falls back to key', () => {
    expect(lookupPhrase({ key: 'no-key', locales: ['pt'], phrases })).to.equal('no-key');
  });

  it('prints japanese phrase', () => {
    const options = { key: 'context1.context2', locales: ['ja', 'en'], phrases };
    expect(lookupPhrase(options)).to.equal('Japanese Phrase');
  });

  it('falls back to english phrase', () => {
    const options = { key: 'context1.context2', locales: ['pt','en'], phrases };
    expect(lookupPhrase(options)).to.equal('English Phrase');
  });

  it('uses default rules', () => {
    const options = { data: { count: 1 }, key: 'plural', locales: ['en'], phrases };
    expect(lookupPhrase(options)).to.equal('one');
  });

  it('uses custom rules', () => {
    const rules = { en: () => PluralCategory.Other };
    const options = { data: { count: 1 }, key: 'plural', locales: ['en'], phrases, rules };
    expect(lookupPhrase(options)).to.equal('other');
  });

  it('interpolate phrase', () => {
    const options = {
      data: {
        field1: 'value1',
        field2: 'value2'
      },
      key: 'interpolate',
      locales: ['en'],
      phrases,
    };
    expect(lookupPhrase(options)).to.equal('value1 value2');
  });

  it('throws error when key does not match keyFormat', () => {
    const key = 'n';
    const keyFormat = /[^n]+/;
    expect(() => lookupPhrase({ key, keyFormat, locales: [], phrases })).to.throw();
  });

  it('uses custom delimiter', () => {
    const delimiter = '|';
    const key = 'context1|context2';
    const keyFormat = /[a-z0-9|]+/;
    expect(lookupPhrase({ delimiter, key, keyFormat, locales: ['en'], phrases })).to.equal('English Phrase');
  });
});
