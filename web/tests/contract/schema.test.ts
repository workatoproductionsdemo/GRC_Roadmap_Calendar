import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../../schema');
const load = (p: string) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(load('calendar.schema.json'));

describe('calendar.json contract', () => {
  it('accepts the valid fixture', () => {
    expect(validate(load('fixtures/valid.calendar.json')), JSON.stringify(validate.errors)).toBe(true);
  });
  it('rejects findings fields', () => {
    expect(validate(load('fixtures/invalid.finding-field.json'))).toBe(false);
  });
  it('rejects bad window ids and unknown cadences', () => {
    const d = load('fixtures/valid.calendar.json');
    d.windows[0].window_id = 'uar-2026-Q2';
    expect(validate(d)).toBe(false);
    const e = load('fixtures/valid.calendar.json');
    e.activities[0].cadence = 'weekly';
    expect(validate(e)).toBe(false);
  });
});
