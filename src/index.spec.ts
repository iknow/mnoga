import { expect } from 'chai';
import { spy } from 'sinon';
import Mnoga, { PluralCategory } from './index';

describe('Mnoga', () => {
  let mnoga: Mnoga;

  const EN_TRANSLATIONS = {
    app: {
      pluralize: {
        one: '%{count} cat',
        other: '%{count} cats',
      },
      interpolate: '%{field1} %{field2}',
      label: 'App String',
    },
  };

  const JA_TRANSLATIONS = {
    app: {
      pluralize: '%{count}匹',
      label: 'アップストリング',
    },
  };

  const INVALID_LOCALE = 'bogus-language-tag';

  function callsSubscribers(callback: () => void, expected: boolean): void {
    const handler = spy();
    mnoga.subscribe(handler);

    callback();

    if (expected) {
      expect(handler.calledOnce, 'callSubscribers calls handler once').to.be.true;
    } else {
      expect(handler.called, 'callSubscribers does not call handler').to.be.false;
    }
  };

  beforeEach(() => {
    mnoga = new Mnoga();
    mnoga.setTranslations('en', EN_TRANSLATIONS);
    mnoga.setTranslations('ja', JA_TRANSLATIONS);
  });

  describe('deleteAlias', () => {
    it('calls subscriber', () => {
      mnoga.setAlias('zh-yue', 'zh');
      callsSubscribers(() => mnoga.deleteAlias('zh-yue'), true);
    });

    it('does not call subscriber', () => {
      callsSubscribers(() => mnoga.deleteAlias('zh-yue'), false);
    });
  });

  describe('deleteRule', () => {
    it('deletes the rule', () => {
      const before = mnoga.t('app.pluralize', { count: 1 });
      mnoga.deleteRule('en');
      const after = mnoga.t('app.pluralize', { count: 1 });

      expect(before).to.equal('1 cat');
      expect(after).to.equal('1 cats');
    });

    it('calls subscriber', () => {
      callsSubscribers(() => mnoga.deleteRule('en'), true);
    });

    it('does not call subscriber', () => {
      callsSubscribers(() => mnoga.deleteRule('zh-yue'), false);
    });
  });

  describe('deleteTranslations', () => {
    it('deletes the translations', () => {
      const before = mnoga.t('app.pluralize', { count: 1 });
      mnoga.deleteTranslations('en');
      const after = mnoga.t('app.pluralize', { count: 1 });

      expect(before).to.equal('1 cat');
      expect(after).to.equal('app.pluralize');
    });

    it('calls subscriber', () => {
      callsSubscribers(() => mnoga.deleteTranslations('en'), true);
    });

    it('does not call subscriber', () => {
      callsSubscribers(() => mnoga.deleteTranslations('zh-yue'), false);
    });
  });

  describe('getFallback', () => {
    it('returns en by default', () => {
      expect(mnoga.getFallback()).to.equal('en');
    });

    it('returns value from setFallback', () => {
      mnoga.setFallback('zh-yue');
      expect(mnoga.getFallback()).to.equal('zh-yue');
    });
  });

  describe('getKeyMode', () => {
    it('returns false by default', () => {
      expect(mnoga.getKeyMode()).to.equal(false);
    });

    it('returns true', () => {
      mnoga.setKeyMode(true);
      expect(mnoga.getKeyMode()).to.equal(true);
    });

    it('returns false', () => {
      mnoga.setKeyMode(true);
      mnoga.setKeyMode(false);
      expect(mnoga.getKeyMode()).to.equal(false);
    });
  });

  describe('getLocale', () => {
    it('returns single locale', () => {
      expect(mnoga.getLocale()).to.equal('en');
    });
  });

  describe('hasTranslationsForLocale', () => {
    it('returns true', () => {
      expect(mnoga.hasTranslationsForLocale('en')).to.equal(true);
    });

    it('returns true after setting a translation', () => {
      mnoga.setTranslations('zh-yue', {});
      expect(mnoga.hasTranslationsForLocale('zh-yue')).to.equal(true);
    });

    it('returns false', () => {
      expect(mnoga.hasTranslationsForLocale('zh-yue')).to.equal(false);
    });

    it('returns false after removing translation', () => {
      mnoga.deleteTranslations('en');
      expect(mnoga.hasTranslationsForLocale('en')).to.equal(false);
    });
  });

  describe('setAlias', () => {
    it('fails with non valid aliases', () => {
      expect(() => mnoga.setAlias(INVALID_LOCALE, 'zh-yue')).to.throw();
    });

    it('fails with a non valid locale', () => {
      expect(() => mnoga.setAlias('zh-yue', INVALID_LOCALE)).to.throw();
    });

    it('fails when alias equals the locale', () => {
      expect(() => mnoga.setAlias('zh-yue', 'zh-yue')).to.throw();
    });

    it('calls subscribers', () => {
      callsSubscribers(() => mnoga.setAlias('en-AU', 'en'), true);
    });

    it('does not call subscribers', () => {
      mnoga.setAlias('en-AU', 'en');
      callsSubscribers(() => mnoga.setAlias('en-AU', 'en'), false);
    });
  });

  describe('setFallback', () => {
    it('fails if passed a non valid locale', () => {
      expect(() => mnoga.setFallback(INVALID_LOCALE)).to.throw();
    });

    it('normalizes locale', () => {
      mnoga.setFallback('ZH-hANT-hk');
      expect(mnoga.getFallback()).to.equal('zh-Hant-HK');
    });

    it('calls subscriber', () => {
      callsSubscribers(() => mnoga.setFallback('zh-yue'), true);
    });

    it('does not call subscriber', () => {
      callsSubscribers(() => mnoga.setFallback('en'), false);
    });
  });

  describe('setKeyMode', () => {
    it('calls subscriber', () => {
      callsSubscribers(() => mnoga.setKeyMode(true), true);
    });

    it('does not call subscriber', () => {
      callsSubscribers(() => mnoga.setKeyMode(false), false);
    });
  });

  describe('setLocale', () => {
    it('fails if passed a non valid locale', () => {
      expect(() => mnoga.setLocale(INVALID_LOCALE)).to.throw();
    });

    it('normalizes locale', () => {
      mnoga.setTranslations('zh-Hant-HK', {});
      mnoga.setLocale('ZH-hANT-hk');
      expect(mnoga.getLocale()).to.equal('zh-Hant-HK');
    });

    it('falls back to script when given a tag containing script and region', () => {
      mnoga.setTranslations('zh-Hant', {});
      mnoga.setTranslations('zh', {});
      mnoga.setLocale('zh-Hant-HK');
      expect(mnoga.getLocale()).to.equal('zh-Hant');
    });

    it('falls back to language when given a tag containing script and region', () => {
      mnoga.setTranslations('zh', {});
      mnoga.setLocale('zh-Hant-HK');
      expect(mnoga.getLocale()).to.equal('zh');
    });

    it('falls back to language when given a tag containing script', () => {
      mnoga.setTranslations('zh', {});
      mnoga.setLocale('zh-Hant');
      expect(mnoga.getLocale()).to.equal('zh');
    });

    it('falls back to language when given a tag containing region', () => {
      mnoga.setTranslations('zh', {});
      mnoga.setLocale('zh-HK');
      expect(mnoga.getLocale()).to.equal('zh');
    });

    it('does not change order of preferences', () => {
      mnoga.setTranslations('pt', {});
      mnoga.setTranslations('zh', {});
      mnoga.setLocale(['zh-Hant-HK', 'pt', 'zh']);
      expect(mnoga.getLocale()).to.equal('pt');
    });

    it('tries more specific locale before attempting fallbacks', () => {
      mnoga.setTranslations('zh-Hant', {});
      mnoga.setTranslations('zh-Hant-TW', {});
      mnoga.setLocale(['zh-Hant-HK', 'zh-Hant-TW']);
      expect(mnoga.getLocale()).to.equal('zh-Hant-TW');
    })

    it('does not use the locale if no match is found', () => {
      mnoga.setLocale('zh-yue');
      expect(mnoga.getLocale()).to.equal('en');
    });

    it('uses alias when setting the locale', () => {
      mnoga.setTranslations('zh-yue', {});
      mnoga.setAlias('zh-Hant', 'zh-yue');
      mnoga.setLocale('zh-Hant-HK');
      expect(mnoga.getLocale()).to.equal('zh-yue');
    });

    it('calls subscriber', () => {
      callsSubscribers(() => mnoga.setLocale('ja'), true);
    });

    it('does not call subscriber', () => {
      mnoga.setLocale('en');
      callsSubscribers(() => mnoga.setLocale('en'), false);
    });
  });

  describe('setRule', () => {
    it('fails if passed a non valid locale', () => {
      expect(() => mnoga.setRule(INVALID_LOCALE, () => PluralCategory.Other)).to.throw();
    });

    it('calls subscriber', () => {
      const rule = () => PluralCategory.Other;
      callsSubscribers(() => mnoga.setRule('en', rule), true);
    });

    it('does not call subscriber', () => {
      const rule = () => PluralCategory.Other;
      mnoga.setRule('en', rule);
      callsSubscribers(() => mnoga.setRule('en', rule), false);
    });
  });

  describe('setTranslations', () => {
    it('fails if passed a non valid locale', () => {
      expect(() => mnoga.setTranslations(INVALID_LOCALE, {})).to.throw();
    });
  });

  describe('subscribe', () => {
    // Mostly covered by other tests.
  });

  describe('t', () => {
    beforeEach(() => {
      mnoga.setLocale('ja');
    });

    it('throws an error when given a weird string format', () => {
      '%<>|!@#$%^&*()[]{};"\''
        .split('')
        .forEach((key) => {
          expect(() => mnoga.t(key), `for ${key}`).to.throw();
        });
    });

    it('returns key in keyMode', () => {
      mnoga.setKeyMode(true);
      expect(mnoga.t('app.label')).to.equal('app.label');
    });

    it('gets appropriate string for key', () => {
      expect(mnoga.t('app.label')).to.equal('アップストリング');
    });

    it('pluralizes string for appropriate key', () => {
      expect(mnoga.t('app.pluralize', { count: 0 })).to.equal('0匹');
      expect(mnoga.t('app.pluralize', { count: 1 })).to.equal('1匹');
    });

    it('uses fallback string for label', () => {
      mnoga.setLocale('zh-yue');
      expect(mnoga.t('app.label')).to.equal('App String');
    });

    it('pluralizes fallback locale', () => {
      mnoga.setLocale('zh-yue');
      expect(mnoga.t('app.pluralize', { count: 0 })).to.equal('0 cats');
      expect(mnoga.t('app.pluralize', { count: 1 })).to.equal('1 cat');
    });

    it('interpolates string', () => {
      const data = { field1: 5, field2: 'value2' };
      expect(mnoga.t('app.interpolate', data)).to.equal('5 value2');
      expect(mnoga.t('app.interpolate', { field2: 'value2' })).to.equal('%{field1} value2');
    });

    it('falls back on key when no string is available', () => {
      expect(mnoga.t('app.no.string')).to.equal('app.no.string');
    });

    it('uses custom locale if provided', () => {
      expect(mnoga.t('app.label', {}, { locale: 'en' })).to.equal('App String');
    });

    it('normalizes custom locale', () => {
      expect(mnoga.t('app.label', {}, { locale: 'EN' })).to.equal('App String');
    });

    it('uses custom fallback if provided', () => {
      mnoga.setTranslations('zh-yue', { app: { no: { string: 'test' } } });
      expect(mnoga.t('app.no.string', {}, { fallback: 'zh-yue' }));
    });

    it('normalizes custom fallback', () => {
      mnoga.setTranslations('zh-yue', { app: { no: { string: 'test' } } });
      expect(mnoga.t('app.no.string', {}, { fallback: 'ZH-YUE' }));
    });

    it('works without delimiters', () => {
      mnoga.setTranslations('en', { key: 'string' });
      expect(mnoga.t('key')).to.equal('string');
    });

    it('works with delimiters', () => {
      mnoga.setTranslations('en', { key: { context: 'string' } });
      expect(mnoga.t('key.context')).to.equal('string');
    });
  });

  describe('callSubscribers', () => {
    it('calls subscribers', () => {
      const subscriberOne = spy();
      const subscriberTwo = spy();

      mnoga.subscribe(subscriberOne);
      mnoga.subscribe(subscriberTwo);

      // Just do something to trigger callSubscribers.
      mnoga.setRule('en', () => PluralCategory.Other);

      expect(subscriberOne.calledOnce).to.be.true;
      expect(subscriberTwo.calledOnce).to.be.true;
    });

    it('does not call subscribers added by subscriber', () => {
      const subscriberAddedBySubscriber = spy();

      mnoga.subscribe(() => {
        mnoga.subscribe(subscriberAddedBySubscriber);
      });

      // Just do something to trigger callSubscribers.
      mnoga.setRule('en', () => PluralCategory.Other);

      expect(subscriberAddedBySubscriber.called).to.be.false;
    });

    it('calls subscribers added by subscriber the next time callSubscribers is triggered', () => {
      const subscriberAddedBySubscriber = spy();

      const unsubscribe = mnoga.subscribe(() => {
        mnoga.subscribe(subscriberAddedBySubscriber);
      });

      // Just do something to trigger callSubscribers.
      mnoga.setRule('en', () => PluralCategory.Other);
      unsubscribe();
      mnoga.setRule('en', () => PluralCategory.Other);

      expect(subscriberAddedBySubscriber.calledOnce).to.be.true;
    });
  });
});
