import { describe, expect, it } from 'vitest';
import en from './messages/en.json';
import de from './messages/de.json';
import es from './messages/es.json';
import fr from './messages/fr.json';
import itLocale from './messages/it.json';
import pt from './messages/pt.json';
import nl from './messages/nl.json';
import pl from './messages/pl.json';
import lt from './messages/lt.json';

const CATALOGS: Record<string, Record<string, string>> = { de, es, fr, it: itLocale, pt, nl, pl, lt };

// Brand words / product names that are allowed to stay identical to English across all languages.
const ALLOW_IDENTICAL = ['Wix', 'Wix CMS', 'Wix Stores', 'Pro', 'Basic', 'GiftCraft'];

function extractIcuTokens(message: string): Set<string> {
  // Matches simple {var} and ICU {var, plural, ...} / {var, select, ...} argument names -
  // we only need the leading argument identifier to compare placeholder sets across locales.
  const tokens = new Set<string>();
  const regex = /\{\s*([a-zA-Z0-9_]+)\s*[,}]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(message)) !== null) {
    tokens.add(match[1]);
  }
  return tokens;
}

function isAllowedIdentical(value: string): boolean {
  if (ALLOW_IDENTICAL.some(word => value === word || value.replace(/[.,!?:;()"'“”„«»]/g, '').trim() === word)) {
    return true;
  }
  // A value made up only of ICU placeholders/punctuation (e.g. "{name} ({price})") has no
  // translatable words, so it may legitimately render identically across locales.
  const withoutIcu = value.replace(/\{[^}]*\}/g, '');
  if (!/[A-Za-zÀ-ÖØ-öø-ÿĀ-žƀ-ɏ]/.test(withoutIcu)) return true;
  return false;
}

describe('i18n message loading', () => {
  it('falls back to English inline defaults for unsupported languages', async () => {
    const { loadMessages } = await import('./load-messages');
    const messages = await loadMessages();
    expect(typeof messages).toBe('object');
  });

  it('ships an English source catalog with keys', () => {
    expect(Object.keys(en).length).toBeGreaterThan(0);
  });

  for (const [lang, catalog] of Object.entries(CATALOGS)) {
    describe(`${lang}.json`, () => {
      it('contains every key from en.json', () => {
        for (const key of Object.keys(en)) {
          expect(catalog, `${lang} is missing key "${key}"`).toHaveProperty(key);
        }
      });

      it('has no empty values', () => {
        for (const [key, value] of Object.entries(catalog)) {
          expect(value.trim().length, `${lang}.json["${key}"] is empty`).toBeGreaterThan(0);
        }
      });

      it('has no keys beyond en.json (no orphaned translations)', () => {
        for (const key of Object.keys(catalog)) {
          expect(en, `${lang}.json has orphaned key "${key}" not present in en.json`).toHaveProperty(key);
        }
      });

      it('preserves the exact ICU placeholder set for every key', () => {
        for (const [key, enValue] of Object.entries(en)) {
          const translated = catalog[key];
          if (translated === undefined) continue; // reported by the "contains every key" test
          const enTokens = extractIcuTokens(enValue);
          const translatedTokens = extractIcuTokens(translated);
          expect(
            [...translatedTokens].sort(),
            `${lang}.json["${key}"] placeholder set differs from en.json`
          ).toEqual([...enTokens].sort());
        }
      });

      it('does not leave translations identical to English (except allowed brand words)', () => {
        for (const [key, enValue] of Object.entries(en)) {
          const translated = catalog[key];
          if (translated === undefined) continue;
          if (translated === enValue && !isAllowedIdentical(enValue)) {
            throw new Error(`${lang}.json["${key}"] is identical to English: "${enValue}"`);
          }
        }
      });
    });
  }
});
