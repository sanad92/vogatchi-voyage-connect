import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { WhatsAppSOPPanel } from '@/components/whatsapp/WhatsAppSOPPanel';
import { WhatsAppIdentityReview } from '@/components/whatsapp/WhatsAppIdentityReview';
import { conversation, message, organization, photoPath } from './session';

const scenario = new URL(location.href).searchParams.get('scenario');
const queries = new QueryClient({ defaultOptions: { queries: { retry: false } } });
createRoot(document.querySelector('#root')!).render(
  <QueryClientProvider client={queries}>
    <BrowserRouter>
      {scenario === 'identity'
        ? <WhatsAppIdentityReview organizationId={organization} conversationId={conversation}
            messageId={message} path={photoPath} mime="image/png" preview="/fixture-photo.png" />
        : <WhatsAppSOPPanel conversationId={conversation}
            conversation={{ contact_name: 'عميل تجريبي', customer_phone: '00000000000' }} />}
    </BrowserRouter>
  </QueryClientProvider>,
);

const button = (text: string) => Array.from(document.querySelectorAll('button'))
  .find(element => element.textContent?.trim() === text);
const notice = (text: string) => document.querySelector('#root')?.textContent?.includes(text);
const field = (label: string) => Array.from(document.querySelectorAll('label'))
  .find(element => element.textContent?.trim() === label)?.parentElement?.querySelector('input');

async function waitFor<T>(description: string, read: () => T | undefined | null | false) {
  const deadline = performance.now() + 35_000;
  while (performance.now() < deadline) {
    const value = read();
    if (value) return value;
    const error = document.querySelector('[role="alert"]')?.textContent;
    if (error) throw new Error(error);
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function verify() {
  if (scenario === 'lead') {
    const draft = await waitFor('enabled draft action', () => {
      const action = button('مسودة من الرسائل');
      return action && !action.disabled && action;
    });
    draft.click();
    await waitFor('destination from Arabic text', () => field('الوجهة *')?.value === 'الغردقة');
    if (field('عدد البالغين *')?.value !== '2') throw new Error('Draft adult count was not retained.');
    // Use the native setter so React sees the dispatched input as a user edit.
    const destination = field('الوجهة *')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(destination, 'الجونة');
    destination.dispatchEvent(new Event('input', { bubbles: true }));
    (await waitFor('lead save button', () => button('حفظ كمسودة'))).click();
    await waitFor('saved lead', () => notice('WA-QA-0001'));
  } else if (scenario === 'repeat') {
    await waitFor('same lead after opening the conversation again', () => notice('WA-QA-0001'));
    if (button('مسودة من الرسائل')) throw new Error('An existing lead offered a second draft.');
  } else if (scenario === 'identity') {
    (await waitFor('identity review action', () => button('مراجعة مستند هوية'))).click();
    (await waitFor('local OCR action', () => button('اقرأ الاسم والجنسية من الصورة'))).click();
    await waitFor('Arabic OCR output', () =>
      field('الاسم')?.value === 'مسافر تجريبي' && field('الجنسية')?.value === 'مصري');
    const save = await waitFor('identity save action', () => button('حدّث ملف العميل'));
    if (!save.disabled) throw new Error('Unreviewed OCR fields were eligible for save.');
    document.querySelector<HTMLInputElement>('[role="dialog"] input[type="checkbox"]')!.click();
    await waitFor('confirmed save action', () => !save.disabled);
    save.click();
    await waitFor('review completion', () => !document.querySelector('[role="dialog"]'));
  } else throw new Error('Unknown test scenario.');
}

verify().then(
  () => { document.body.dataset.smoke = 'passed'; },
  (error: unknown) => { document.body.dataset.smoke = error instanceof Error ? error.message : String(error); },
);
