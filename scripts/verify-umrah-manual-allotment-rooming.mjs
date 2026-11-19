import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createServer } from 'vite';

const server = await createServer({ appType: 'custom', server: { middlewareMode: true, hmr: false } });
try {
  const { default: UmrahRooming } = await server.ssrLoadModule('/src/components/pilgrimage/UmrahRooming.tsx');
  const props = {
    orgId: 'organization',
    programId: 'departure',
    hotels: {},
    groups: [],
    canEdit: true,
    onChange: () => {},
    onEditPassenger: () => {},
  };
  const render = (passenger, overrides = {}) => renderToStaticMarkup(
    createElement(QueryClientProvider, { client: new QueryClient() }, createElement(UmrahRooming, {
      ...props,
      passengers: [{ id: 'traveler', full_name: 'مسافر تجريبي', gender: 'female', room_type: 'quad', status: 'registered', ...passenger }],
      ...overrides,
    })),
  );

  const allotment = { inventory_booking_id: 'allotment', manual_allotment_booking: true };
  for (const traveler of [{}, allotment]) {
    const markup = render(traveler);
    assert.match(markup, /aria-label="تسكين مسافر تجريبي في مكة"/);
    assert.match(markup, /aria-label="تسكين مسافر تجريبي في المدينة"/);
    assert.match(render({ ...traveler, gender: null }), />تحديد النوع<\/button>/);
  }
  const stock = { inventory_booking_id: 'room-stock' };
  assert.doesNotMatch(render(stock), /aria-label="تسكين مسافر/);
  assert.doesNotMatch(render({ ...stock, gender: null }), />تحديد النوع<\/button>/);
  assert.doesNotMatch(render(allotment, { canEdit: false }), /aria-label="تسكين مسافر/);
  assert.doesNotMatch(render({ ...allotment, status: 'traveled' }), /aria-label="تسكين مسافر/);

  console.log('Manual allotment rooming and existing room stock controls verified.');
} finally {
  await server.close();
}
