const path = require('path');

const DEFAULT_LANG = 'he';
const SUPPORTED_LANGS = ['he', 'en'];

const locales = {};

function loadLocale(lang) {
  if (locales[lang]) return locales[lang];
  if (!SUPPORTED_LANGS.includes(lang)) {
    return loadLocale(DEFAULT_LANG);
  }
  try {
    const filePath = path.join(__dirname, '..', 'locales', `${lang}.json`);
    locales[lang] = require(filePath);
    return locales[lang];
  } catch (err) {
    console.error(`Failed to load locale ${lang}:`, err.message);
    return {};
  }
}

function t(key, lang, replacements = {}) {
  const locale = loadLocale(lang);
  let value = locale[key];
  if (value === undefined || value === null) {
    value = key;
  }
  if (typeof value === 'string') {
    return value.replace(/\{([^}]+)\}/g, (match, token) => {
      return Object.prototype.hasOwnProperty.call(replacements, token)
        ? replacements[token]
        : match;
    });
  }
  return value;
}

function getTranslator(lang) {
  return {
    t: (key, replacements) => t(key, lang, replacements)
  };
}

module.exports = {
  t,
  getTranslator,
  DEFAULT_LANG,
  SUPPORTED_LANGS
};
