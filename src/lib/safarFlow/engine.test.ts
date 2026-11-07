import assert from 'node:assert/strict';
import { simulateFlow, validateFlowTemplate, type FlowTemplate } from './engine';
import { SAFAR_FLOW_TEMPLATES, SAFAR_FLOW_SAMPLES } from './templates';

assert.equal(SAFAR_FLOW_TEMPLATES.length, 5);
assert.equal(new Set(SAFAR_FLOW_TEMPLATES.map(f => f.id)).size, SAFAR_FLOW_TEMPLATES.length);

for (const template of SAFAR_FLOW_TEMPLATES) {
  assert.deepEqual(validateFlowTemplate(template), [], template.id);
  const sample = SAFAR_FLOW_SAMPLES.find(s => s.type === template.trigger);
  assert.ok(sample, 'Missing sample event: ' + template.id);
  const result = simulateFlow(template, sample);
  assert.equal(result.matched, true, 'Expected match: ' + template.id);
  assert.equal(result.mode, 'preview_only');
  assert.equal(result.actions.length, template.actions.length);
}

const byId = (id: string) => SAFAR_FLOW_TEMPLATES.find(f => f.id === id)!;
const sampleById = (id: string) => SAFAR_FLOW_SAMPLES.find(s => s.id === id)!;

assert.equal(simulateFlow(byId('quote-follow-up'), sampleById('quote-answered')).matched, false);
assert.equal(simulateFlow(byId('supplier-confirmation'), sampleById('booking-confirmed')).matched, false);
assert.equal(simulateFlow(byId('supplier-payment'), sampleById('supplier-settled')).matched, false);
assert.equal(simulateFlow(byId('whatsapp-intake'), sampleById('whatsapp-other')).matched, false);
assert.equal(simulateFlow(byId('pre-travel-checklist'), sampleById('pretravel-cancelled')).matched, false);
assert.equal(simulateFlow(byId('quote-follow-up'), sampleById('booking-pending')).matched, false);

const invalid = {
  ...byId('quote-follow-up'),
  delayMinutes: -1,
  actions: [
    { id: 'dup', type: 'create_task', label: 'A' },
    { id: 'dup', type: 'send_money', label: 'B' },
  ],
  conditions: [{ path: '__proto__.admin', operator: 'eq', value: true }],
} as unknown as FlowTemplate;
assert.ok(validateFlowTemplate(invalid).length >= 3);
assert.equal(simulateFlow(invalid, sampleById('quote-unanswered')).matched, false);

console.log('Safar Flow: 5 valid templates, positive/negative matches, and safety validation passed.');
