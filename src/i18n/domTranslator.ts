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
type Translation = { original: string; translated: string };
const textOriginals = new Map<Text, Translation>();
const attrOriginals = new Map<Element, Map<string, Translation>>();

const lookup = (raw: string): string | null => {
  const key = raw.trim();
  if (!key || !ARABIC.test(key)) return null;
  let hit = dict[key];
  if (!hit) {
    // "3 فواتير" / "متبقي 13" — translate the label part, keep the numbers.
    const m = key.match(/^([\d٠-٩.,%\s]*)(.*?[\u0600-\u06FF].*?)([\d٠-٩.,%\s:]*)$/);
    const label = m?.[2]?.trim();
    if (m && label && dict[label] && (m[1].trim() || m[3].trim())) {
      hit = `${m[1]}${dict[label]}${m[3]}`;
    } else {
      // Mixed text such as "الإيرادات (EGP)": translate each known Arabic phrase.
      let changed = false;
      const replaced = key.replace(/[\u0600-\u06FF][\u0600-\u06FF\s]*[\u0600-\u06FF]|[\u0600-\u06FF]/g, (phrase) => {
        const en = dict[phrase.trim()];
        if (!en) return phrase;
        changed = true;
        return en;
      });
      if (!changed) return null;
      hit = replaced;
    }
  }
  const lead = raw.slice(0, raw.indexOf(key));
  const tail = raw.slice(raw.indexOf(key) + key.length);
  return lead + hit + tail;
};

const skipped = (el: Element | null, text: boolean): boolean => {
  for (let node = el; node; node = node.parentElement) {
    if (node.hasAttribute('data-no-translate') || (node as HTMLElement).isContentEditable) return true;
    if (SKIP_TAGS.has(node.tagName) && (text || !['INPUT', 'TEXTAREA'].includes(node.tagName))) return true;
  }
  return false;
};

const translateText = (node: Text) => {
  const current = node.nodeValue ?? '';
  const saved = textOriginals.get(node);
  if (skipped(node.parentElement, true)) {
    if (saved?.translated === current) node.nodeValue = saved.original;
    textOriginals.delete(node);
    return;
  }
  // The observer also sees our own replacements, so keep the application's source for those.
  if (saved?.translated === current) return;
  const next = lookup(current);
  if (next === null || next === current) {
    textOriginals.delete(node);
    return;
  }
  textOriginals.set(node, { original: current, translated: next });
  node.nodeValue = next;
};

const translateElement = (el: Element) => {
  const ignore = skipped(el, false);
  const originals = attrOriginals.get(el) ?? new Map<string, Translation>();
  for (const attr of [...ATTRS, 'dir']) {
    const current = el.getAttribute(attr);
    const saved = originals.get(attr);
    if (ignore) {
      if (saved?.translated === current) el.setAttribute(attr, saved.original);
      originals.delete(attr);
      continue;
    }
    if (current === saved?.translated) continue;
    const next = attr === 'dir' ? (current === 'rtl' ? 'ltr' : null) : current && lookup(current);
    if (!current || !next || next === current) {
      originals.delete(attr);
      continue;
    }
    originals.set(attr, { original: current, translated: next });
    el.setAttribute(attr, next);
  }
  if (originals.size) attrOriginals.set(el, originals);
  else attrOriginals.delete(el);
};

const walk = (root: Node) => {
  if (root.nodeType === Node.TEXT_NODE) return translateText(root as Text);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  translateElement(el);
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) translateText(node as Text);
    else translateElement(node as Element);
    node = walker.nextNode();
  }
};

export const startDomTranslation = (dictionary: Record<string, string>) => {
  dict = dictionary;
  observer?.disconnect();
  walk(document.body);
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'characterData') translateText(m.target as Text);
      else if (m.type === 'attributes') {
        if (m.attributeName === 'data-no-translate' || m.attributeName === 'contenteditable') walk(m.target);
        else translateElement(m.target as Element);
      }
      else m.addedNodes.forEach(walk);
    }
  });
  observer.observe(document.body, {
    subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: [...ATTRS, 'dir', 'data-no-translate', 'contenteditable'],
  });
};

export const stopDomTranslation = () => {
  observer?.disconnect();
  observer = null;
  textOriginals.forEach(({ original, translated }, node) => {
    if (node.nodeValue === translated) node.nodeValue = original;
  });
  attrOriginals.forEach((saved, el) => {
    saved.forEach(({ original, translated }, attr) => {
      if (el.getAttribute(attr) === translated) el.setAttribute(attr, original);
    });
  });
  textOriginals.clear();
  attrOriginals.clear();
};
