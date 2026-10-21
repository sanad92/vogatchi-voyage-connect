/**
 * Runtime UI translator: while English is active, swaps known Arabic interface
 * strings in the rendered page for English and flips fixed right-to-left blocks.
 * Originals are remembered so switching back to Arabic restores them exactly.
 * Customer data is untouched unless it exactly equals an interface label.
 */
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE']);
const ARABIC = /[\u0600-\u06FF]/;

let dict: Record<string, string> = {};
let observer: MutationObserver | null = null;
const textOriginals = new Map<Text, string>();
const attrOriginals = new Map<Element, Record<string, string>>();
const dirOriginals = new Set<Element>();

const lookup = (raw: string): string | null => {
  const key = raw.trim();
  if (!key || !ARABIC.test(key)) return null;
  const hit = dict[key];
  if (!hit) return null;
  const lead = raw.slice(0, raw.indexOf(key));
  const tail = raw.slice(raw.indexOf(key) + key.length);
  return lead + hit + tail;
};

const skipped = (el: Element | null): boolean => {
  for (let n = el; n; n = n.parentElement) {
    if (SKIP_TAGS.has(n.tagName) || n.hasAttribute('data-no-translate') || (n as HTMLElement).isContentEditable) return true;
  }
  return false;
};

const translateText = (node: Text) => {
  const value = node.nodeValue ?? '';
  const next = lookup(value);
  if (next === null || next === value || skipped(node.parentElement)) return;
  if (!textOriginals.has(node)) textOriginals.set(node, value);
  node.nodeValue = next;
};

const translateElement = (el: Element) => {
  if (el.getAttribute('dir') === 'rtl') {
    el.setAttribute('dir', 'ltr');
    dirOriginals.add(el);
  }
  for (const attr of ATTRS) {
    const value = el.getAttribute(attr);
    if (!value) continue;
    const next = lookup(value);
    if (next === null || next === value) continue;
    const saved = attrOriginals.get(el) ?? {};
    if (!(attr in saved)) saved[attr] = value;
    attrOriginals.set(el, saved);
    el.setAttribute(attr, next);
  }
};

const walk = (root: Node) => {
  if (root.nodeType === Node.TEXT_NODE) return translateText(root as Text);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (SKIP_TAGS.has(el.tagName)) {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') translateElement(el); // placeholders only
    return;
  }
  translateElement(el);
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n = walker.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) translateText(n as Text);
    else translateElement(n as Element);
    n = walker.nextNode();
  }
};

export const startDomTranslation = (dictionary: Record<string, string>) => {
  dict = dictionary;
  walk(document.body);
  observer?.disconnect();
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'characterData') translateText(m.target as Text);
      else if (m.type === 'attributes') translateElement(m.target as Element);
      else m.addedNodes.forEach(walk);
    }
  });
  observer.observe(document.body, {
    subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: [...ATTRS, 'dir'],
  });
};

export const stopDomTranslation = () => {
  observer?.disconnect();
  observer = null;
  textOriginals.forEach((value, node) => { if (node.isConnected) node.nodeValue = value; });
  attrOriginals.forEach((saved, el) => { Object.entries(saved).forEach(([k, v]) => el.setAttribute(k, v)); });
  dirOriginals.forEach((el) => el.setAttribute('dir', 'rtl'));
  textOriginals.clear(); attrOriginals.clear(); dirOriginals.clear();
};
