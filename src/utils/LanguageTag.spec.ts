import { expect } from 'chai';
import LanguageTag from './LanguageTag';

describe('LanguageTag', () => {
  it('throws when passed invalid locales', () => {
    [
      'bogus-language',
      'random text',
      'Hant-HK',
      '',
    ].forEach((invalidLocale) => {
      expect(() => new LanguageTag(invalidLocale), `for ${invalidLocale}`).to.throw();
    });
  });

  describe('.language', () => {
    it('parses and normalizes locale language', () => {
      [
        ['ZH-Hant-HK', 'zh'],
        ['zh-Hant-HK', 'zh'],
        ['ZH-HK', 'zh'],
        ['zh-HK', 'zh'],
        ['ZH', 'zh'],
        ['zh', 'zh'],
        ['ZH-YUE-Hant-HK', 'zh-yue'],
        ['zh-yue-Hant-HK', 'zh-yue'],
        ['ZH-YUE', 'zh-yue'],
        ['zh-yue', 'zh-yue'],
      ].forEach(([locale, language]) => {
        const languageTag = new LanguageTag(locale);
        expect(languageTag.language, `for ${locale}`).to.equal(language);
      });
    });
  });

  describe('.script', () => {
    it('parses and normalizes locale script', () => {
      [
        ['zh-Hant-HK', 'Hant'],
        ['zh-HANT', 'Hant'],
        ['zh-hant', 'Hant'],
      ].forEach(([locale, script]) => {
        const languageTag = new LanguageTag(locale);
        expect(languageTag.script, `for ${locale}`).to.equal(script);
      });
    });

    it('is undefined', () => {
      const languageTag = new LanguageTag('zh');
      expect(languageTag.script).to.equal(undefined);
    });
  });

  describe('.region', () => {
    it('parses and normalizes locale region', () => {
      [
        ['zh-HK', 'HK'],
        ['zh-hk', 'HK'],
      ].forEach(([locale, region]) => {
        const languageTag = new LanguageTag(locale);
        expect(languageTag.region, `for ${locale}`).to.equal(region);
      });
    });

    it('is undefined', () => {
      const languageTag = new LanguageTag('zh');
      expect(languageTag.region).to.equal(undefined);
    });
  });

  describe('hasScript', () => {
    it('returns true', () => {
      [
        'zh-Hant-HK',
        'zh-Hant',
        'zh-yue-Hant',
      ].forEach((locale) => {
        const languageTag = new LanguageTag(locale);
        expect(languageTag.hasScript(), `for ${locale}`).to.equal(true);
      });
    });

    it('returns false', () => {
      [
        'zh-HK',
        'zh',
        'zh-yue',
      ].forEach((locale) => {
        const languageTag = new LanguageTag(locale);
        expect(languageTag.hasScript(), `for ${locale}`).to.equal(false);
      });
    });
  });

  describe('hasRegion', () => {
    it('returns true', () => {
      [
        'zh-Hant-HK',
        'zh-HK',
      ].forEach((locale) => {
        const languageTag = new LanguageTag(locale);
        expect(languageTag.hasRegion(), `for ${locale}`).to.equal(true);
      });
    });

    it('returns false', () => {
      [
        'zh-Hant',
        'zh',
        'zh-yue',
      ].forEach((locale) => {
        const languageTag = new LanguageTag(locale);
        expect(languageTag.hasRegion(), `for ${locale}`).to.equal(false);
      });
    });
  });

  describe('toString', () => {
    const locales = [
      ['zh-Hant-HK', 'zh-Hant-HK'],
      ['zh-HANT-hk', 'zh-Hant-HK'],
      ['zh-hant-HK', 'zh-Hant-HK'],
      ['ZH-hant-hk', 'zh-Hant-HK'],
      ['zh-HK', 'zh-HK'],
      ['zh-hk', 'zh-HK'],
      ['zh-hant', 'zh-Hant'],
      ['zh-HANT', 'zh-Hant'],
      ['ZH', 'zh'],
      ['zh', 'zh'],
    ];

    it('parses and normalizes tags', () => {
      locales.forEach(([locale, normalizedLocale]) => {
        const languageTag = new LanguageTag(locale);
        expect(languageTag.toString(), `for ${locale}`).to.equal(normalizedLocale);
      });
    });

    it('equals LanguageTag.toString', () => {
      locales.forEach(([locale]) => {
        const languageTag = new LanguageTag(locale);
        expect(languageTag.toString(), `for ${locale}`).to.equal(LanguageTag.toString(locale));
      });
    });
  });
});
