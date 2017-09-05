# Mnoga [![Build Status](https://travis-ci.org/iknow/mnoga.svg?branch=master)](https://travis-ci.org/iknow/mnoga)

Simple and easy-to-use internationalization library for javascript or typescript.

Mnoga (/ˈmnɔɡa/) is the Polish word for "plural."

## Features
  - Uses a nested JSON format and interpolation style similar to [Rails I18n YAML](http://guides.rubyonrails.org/i18n.html).
  - Strings are written in a format that is easy to use by content editors.
  - Normalizes [BCP 47](https://tools.ietf.org/html/rfc5646) language tags.
  - Includes [CLDR pluralization rules](http://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html) for a lot common languages.
    - Rules are extensible.
  - Fallback solutions for when a highly specific locale is not found.
  - Customizable fallback locale for when content is not found.
  - Typed definitions for those using typescript.
  - No dependencies.

## Installation

If you are using npm:

```
npm install @engoo/mnoga
```

If you are using yarn:

```
yarn install --add @engoo/mnoga
```

## Basic Usage

Let's say our site supports Japanese and English. We'll store our translations in two separate files
that are in a nested JSON format.

The keys must consist of alphanumeric characters (with hyphen and underscore also being allowed).
If the string has multiple plural versions, the keys `zero`, `one`, `two`, `many`, `few`, and `other`
can be used, depending on the language. Please look at the [CLDR pluralization rules](http://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html) to see
keys apply to which language.

Strings can contain variables by using the wrapper `%{variableName}`, where `variableName` is a
variable name of your choosing. There is a magic variable called `count`, which is used primarily
for pluralization.

### `en.json`

```
{
  "admin": {
    "header": {
      "logged-in-as": "You are logged in as %{username}.",
    }
  },
  "animals": {
    "dog": "dog",
    "cat": {
      "one": "%{count} cat",
      "other": "%{count} cats"
    }
  }
}
```

### `ja.json`

```
{
  "animals": {
    "dog": "犬",
    "cat": "%{count}匹の猫"
  }
}
```

Let's use the library to print a few strings.

### `index.js`

```
import Mnoga from 'mnoga';
import ja from './ja';
import en from './en';

// Instantiate an instance of Mnoga.
const mnoga = new Mnoga();

// Set translations for japanese and english.
mnoga.setPhrases('ja', ja);
mnoga.setPhrases('en', en);

// Set the fallback locale. `en` is already the default.
mnoga.setFallback('en');

// Use 'ja' as the primary locale.
mnoga.setLocale('ja');

// When looking up a string, we use the keys delimited by a period.
mnoga.t('animals.cat', { count: 1 }); // 1匹の猫
mnoga.t('animals.cat', { count: 5 }); // 5匹の猫
mnoga.t('animals.dog');               // 犬

// This falls back to english, since that is our fallback and there is no Japanese translation.
mnoga.t('admin.header.logged-in-as', { username: 'Mnoga' }); // You are logged in as Mnoga.

// Keys that are not found in the fallback simply print the key.
mnoga.t('this.key.does.not.exist'); // this.key.does.not.exist

// Switching to english and running the same strings.
mnoga.setLocale('en');

mnoga.t('animals.cat', { count: 1 });                         // 1 cat
mnoga.t('animals.cat', { count: 5 });                         // 5 cats
mnoga.t('animals.dog');                                       // dog
mnoga.t('admin.header.logout');                               // Click here to sign out
mnoga.t('this.key.does.not.exist');                           // this.key.does.not.exist
mnoga.t('admin.header.logged-in-as', { username: 'Mnoga' });  // You are logged in as Mnoga.
```

## Supporting Language Scripts and Regions

Languages like Chinese can be difficult to support, since the language tags an environment provides
may contain script, region or both. `setLocale` will try removing the region tag, then the script
tag to see if there are any reasonable matches to fallback on.

```
const mnoga = new Mnoga();

mnoga.setPhrases('zh', {});

// If the locale contains script and region, it will fallback and choose zh.
mnoga.setLocale('zh-Hant-HK');
mnoga.getLocale();              // zh

// If the locale contains only region, it will fallback and choose zh.
mnoga.setLocale('zh-HK');
mnoga.getLocale();              // zh

// If the locale contains only script, it will fallback and choose zh.
mnoga.setLocale('zh-Hant');
mnoga.getLocale();              // zh
```

Let's say you support simplified and traditional Chinese. It's advised that instead of setting
translations for all possible regions, it's better to use `setAlias` so that regions will get set
as the officially supported locale.

```
const mnoga = new Mnoga();

mnoga.setPhrases('zh-Hans', {});
mnoga.setPhrases('zh-Hant', {});

// Mainland china should use simplified Chinese.
mnoga.setAlias(['zh', 'zh-CN'], 'zh-Hans');

// Other regions like Hong Kong, Macau and Taiwan should support traditional Chinese.
mnoga.setAlias(['zh-TW', 'zh-HK', 'zh-MO'], 'zh-Hant');

// Using an aliased locale will result in the primary locale being zh-Hant.
mnoga.setLocale('zh-TW');
mnoga.getLocale();  // zh-Hant

// Languages containing region and script will fallback to the language script.
mnoga.setLocale('zh-Hant-HK');
mnoga.getLocale();  // zh-Hant
```

Aliasing also works for regions. For example, let's say we officially support US English and
British English, but also want users from Australia to use British English.

```
const mnoga = new Mnoga();

mnoga.setPhrases('en-US', {});
mnoga.setPhrases('en-GB', {});

mnoga.setAlias('en-AU', 'en-GB');

mnoga.setLocale('en-AU');
mnoga.getLocale();  // en-GB
```

## Need to re-render content

The library has a `subscribe` method. A handler can be passed to that will be triggered when any
significant changes occur. For example, changing the primary locale or setting new translations will
cause the method to be executed.

```
const mnoga = new Mnoga();

// Will update the title whenever locale or phrases change.
const render = () => {
  document.head.title = mnoga.t('title');
};

// Set some translations.
mnoga.setPhrases('en', { title: 'English Homepage' });
mnoga.setPhrases('ja', { title: '日本語ホムページ' });

// Returns an unsubscribe method that can be called if we want to stop listening for changes.
const unsubscribe = mnoga.subscribe(update);

// Changing the locale will call subscribe.
mnoga.setLocale('ja');
console.log(document.head.title); // '日本語ホムページ'

// Changing the translations will call subscribe.
mnoga.setPhrases('ja', { title: '新しい日本語ホムページ' });
console.log(document.head.title); // '新しい日本語ホムページ'
```

## Supported Languages and Extending Support

The following locales are supported out of the box: _af_, _ar_, _be_, _cs_, _de_, _el_, _en_, _es_,
_fi_, _fr_, _hi_, _id_, _it_, _iu_, _ja_, _ko_, _ms_, _my_,  _ne_, _nl_, _pl_, _pt_, _sk_, _sw_,
_th_, _tr_, _ru_, _uk_, _vi_, _zh_.

Support for additional locales can be added by using the `setRule` method.

```
const mnoga = new Mnoga();

// A rule method is a method that takes a number and returns one of the following
// string values: zero, one, two, few, many, and other.
const rulesForEnglish = (count) => {
  if (count === 1) {
    return 'one';
  } else {
    return 'other';
  }
}

// Sets this rule for English.
mnoga.setRule('en', rulesForEnglish);
```

## Utilities

Utility methods are also provided if you want to maintain your own state.

```
import { getCanonicalLocales, lookupLocale, lookupPhrase } from 'mnoga/utils/i18n';

// Returns a canonical format of a locale or multiple locales.
getCanonicalLocales('EN-US');                       // ['en-US']
getCanonicalLocales(['EN-US', 'ZH-HANT-TW', 'Fr']); // ['en-US', 'zh-Hant-TW', 'fr']

// Gets a preferred locale.
const supportedLocales = ['zh-Hant', 'zh-Hans', 'pt', 'en'];
lookupLocale('zh-Hant-TW', supportedLocales);            // zh-Hant
lookupLocale('zh-Hans-CN', supportedLocales);            // zh-Hans
lookupLocale(['pt-BR', 'en'], supportedLocales);         // pt
lookupLocale('zh', supportedLocales, { zh: 'zh-Hans' }); // zh-Hans

// Lookup a phrase. Be sure to canonicalize the locales.
const phrases = {
  en: {
    context_1: {
      context_2: 'English Phrase',
    },
  },
  ja: {
    context_1: {
      context_2: 'Japanese Phrase',
    },
  },
};

lookupPhrase({ key: 'context_1.context_2', locales: ['ja'], phrases });       // Japanese Phrase
lookupPhrase({ key: 'context_1.context_2', locales: ['fr', 'en'], phrases }); // English Phrase
lookupPhrase({ key: 'context_1.context_2', locales: ['pt'], phrases });       // context_1.context_2
```

## Further Reading

To find out more about the functionality available, please check out the [API documentation](https://iknow.github.io/mnoga/classes/_index_.mnoga.html).
