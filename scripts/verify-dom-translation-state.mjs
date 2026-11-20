import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

class TextNode {
  nodeType = 3;
  constructor(value, parentElement) {
    this.nodeValue = value;
    this.parentElement = parentElement;
  }
}

class ElementNode {
  nodeType = 1;
  attributes = new Map();
  children = [];
  constructor(tagName, parentElement = null) {
    this.tagName = tagName;
    this.parentElement = parentElement;
    parentElement?.children.push(this);
  }
  hasAttribute(name) { return this.attributes.has(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  text(value) {
    const node = new TextNode(value, this);
    this.children.push(node);
    return node;
  }
}

const body = new ElementNode('BODY');
let dispatch;
globalThis.Node = { TEXT_NODE: 3, ELEMENT_NODE: 1 };
globalThis.NodeFilter = { SHOW_TEXT: 4, SHOW_ELEMENT: 1 };
globalThis.MutationObserver = class {
  constructor(callback) { this.callback = callback; }
  observe() { dispatch = (...mutations) => this.callback(mutations); }
  disconnect() { dispatch = undefined; }
};
globalThis.document = {
  body,
  createTreeWalker(root) {
    const pending = root.children.slice();
    return {
      nextNode() {
        const node = pending.shift();
        if (node?.children) pending.unshift(...node.children);
        return node;
      },
    };
  },
};

const translatorSource = await readFile(new URL('../src/i18n/domTranslator.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(translatorSource, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { startDomTranslation, stopDomTranslation } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const open = 'تسوية مفتوحة';
const complete = 'مكتمل ماليًا';
const dictionary = { [open]: 'Open settlement', [complete]: 'Financially complete' };
const badge = new ElementNode('SPAN', body);
badge.setAttribute('title', open);
badge.setAttribute('aria-label', open);
badge.setAttribute('dir', 'rtl');
const text = badge.text(open);
const protectedParent = new ElementNode('DIV', body);
protectedParent.setAttribute('data-no-translate', '');
const protectedInput = new ElementNode('INPUT', protectedParent);
protectedInput.setAttribute('placeholder', open);
protectedInput.setAttribute('title', open);
protectedInput.setAttribute('dir', 'rtl');
const protectedCopy = new ElementNode('SPAN', protectedParent).text(open);
const input = new ElementNode('INPUT', body);
input.setAttribute('placeholder', open);

startDomTranslation(dictionary);
assert.equal(text.nodeValue, 'Open settlement');
assert.equal(badge.getAttribute('dir'), 'ltr');
assert.equal(input.getAttribute('placeholder'), 'Open settlement');
assert.equal(protectedCopy.nodeValue, open);
assert.equal(protectedInput.getAttribute('title'), open);
assert.equal(protectedInput.getAttribute('placeholder'), open);
assert.equal(protectedInput.getAttribute('dir'), 'rtl');

text.nodeValue = complete;
badge.setAttribute('title', complete);
badge.setAttribute('aria-label', complete);
dispatch({ type: 'characterData', target: text }, { type: 'attributes', target: badge, attributeName: 'title' });
assert.equal(text.nodeValue, 'Financially complete');
assert.equal(badge.getAttribute('title'), 'Financially complete');
dispatch({ type: 'characterData', target: text }, { type: 'attributes', target: badge, attributeName: 'title' });

badge.setAttribute('dir', 'auto');
badge.setAttribute('aria-label', 'Updated by application');
stopDomTranslation();
assert.equal(text.nodeValue, complete);
assert.equal(badge.getAttribute('title'), complete);
assert.equal(badge.getAttribute('aria-label'), 'Updated by application');
assert.equal(badge.getAttribute('dir'), 'auto');

startDomTranslation(dictionary);
badge.setAttribute('data-no-translate', '');
dispatch({ type: 'attributes', target: badge, attributeName: 'data-no-translate' });
assert.equal(text.nodeValue, complete);
assert.equal(badge.getAttribute('title'), complete);
stopDomTranslation();
console.log('DOM translation preserves updated text and accessibility labels, and respects nested opt-out.');
