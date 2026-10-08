import { test, expect, login, apiLogin, apiBook, origin } from './fixtures.js';

test('login survives reload and logout revokes the session', async ({
  page,
  data,
}) => {
  await login(page, data.a);
  await page.reload();
  await expect(
    page.getByText(`Logged in as ${data.a.email}`, { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Customer login' }),
  ).toBeVisible();
  expect((await page.request.get('/api/auth/me')).status()).toBe(401);
  const rows = await data.db.query(
    'SELECT COUNT(*)::int AS count FROM sessions WHERE user_id = $1',
    [data.a.id],
  );
  expect(rows.rows[0].count).toBe(0);
});

test('wrong password gives a generic failure and no session', async ({
  page,
  data,
}) => {
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(data.a.email);
  await page.getByLabel('Password', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Email or password is incorrect.',
  );
  expect((await page.request.get('/api/auth/me')).status()).toBe(401);
});

test('logged-out booking is disabled and bypassing the UI returns 401', async ({
  page,
  data,
}) => {
  await page.goto('/');
  await expect(
    page.getByTestId(`slot-${data.slotId}`).getByRole('button'),
  ).toBeDisabled();
  expect(
    (
      await page.request.post('/api/bookings', {
        headers: { Origin: origin },
        data: { slotId: data.slotId },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await data.db.query('SELECT id FROM bookings WHERE slot_id = $1', [
        data.slotId,
      ])
    ).rowCount,
  ).toBe(0);
});

test('successful booking appears in My bookings and is persisted for the session owner', async ({
  page,
  data,
}) => {
  await login(page, data.a);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/bookings') &&
      response.request().method() === 'POST',
  );
  await page.getByTestId(`slot-${data.slotId}`).getByRole('button').click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const { booking } = await response.json();
  await expect(page.getByTestId(`booking-${booking.id}`)).toContainText(
    'confirmed',
  );
  await expect(page.getByTestId(`slot-${data.slotId}`)).toHaveCount(0);
  const row = (
    await data.db.query(
      'SELECT customer_id,status FROM bookings WHERE id = $1',
      [booking.id],
    )
  ).rows[0];
  expect(row.customer_id).toBe(data.a.id);
  expect(row.status).toBe('confirmed');
  await page.reload();
  await expect(page.getByTestId(`booking-${booking.id}`)).toContainText(
    'confirmed',
  );
});

test('stale available slot returns 409 and refreshes capacity', async ({
  page,
  request,
  data,
}) => {
  await login(page, data.a);
  await expect(page.getByTestId(`slot-${data.slotId}`)).toBeVisible();
  await apiLogin(request, data.b);
  await apiBook(request, data.slotId);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/bookings') &&
      response.request().method() === 'POST',
  );
  await page.getByTestId(`slot-${data.slotId}`).getByRole('button').click();
  expect((await responsePromise).status()).toBe(409);
  await expect(page.getByRole('status')).toHaveText(
    'This slot has already been booked.',
  );
  await expect(page.getByTestId(`slot-${data.slotId}`)).toHaveCount(0);
  const rows = await data.db.query(
    "SELECT customer_id FROM bookings WHERE slot_id = $1 AND status = 'confirmed'",
    [data.slotId],
  );
  expect(rows.rows.map((row) => row.customer_id)).toEqual([data.b.id]);
});

test('owner cancellation restores availability and another customer can book', async ({
  page,
  request,
  data,
}) => {
  await login(page, data.a);
  const id = await apiBook(page.request, data.slotId);
  await page.reload();
  await page
    .getByTestId(`booking-${id}`)
    .getByRole('button', { name: 'Cancel booking' })
    .click();
  await expect(page.getByTestId(`booking-${id}`)).toContainText('cancelled');
  await expect(
    page.getByTestId(`slot-${data.slotId}`).getByRole('button'),
  ).toBeEnabled();
  await apiLogin(request, data.b);
  await apiBook(request, data.slotId);
  const rows = await data.db.query(
    'SELECT customer_id,status FROM bookings WHERE slot_id = $1 ORDER BY status',
    [data.slotId],
  );
  expect(rows.rows).toEqual([
    { customer_id: data.a.id, status: 'cancelled' },
    { customer_id: data.b.id, status: 'confirmed' },
  ]);
});

test('repeated cancellation returns the same cancelled booking', async ({
  page,
  data,
}) => {
  await login(page, data.a);
  const id = await apiBook(page.request, data.slotId);
  const cancel = () =>
    page.request.post(`/api/bookings/${id}/cancel`, {
      headers: { Origin: origin },
      data: {},
    });
  const first = await cancel(),
    second = await cancel();
  expect(first.status()).toBe(200);
  expect(second.status()).toBe(200);
  expect((await second.json()).booking).toEqual((await first.json()).booking);
  const rows = await data.db.query(
    'SELECT status FROM bookings WHERE slot_id = $1',
    [data.slotId],
  );
  expect(rows.rows).toEqual([{ status: 'cancelled' }]);
});

test('another customer cannot list, read or cancel the owner booking', async ({
  page,
  request,
  data,
}) => {
  await apiLogin(request, data.a);
  const id = await apiBook(request, data.slotId);
  await login(page, data.b);
  await expect(page.getByRole('region', { name: 'My bookings' })).toContainText(
    'You have no bookings.',
  );
  expect((await page.request.get('/api/bookings')).status()).toBe(200);
  expect(
    (await (await page.request.get('/api/bookings')).json()).bookings,
  ).toEqual([]);
  expect((await page.request.get(`/api/bookings/${id}`)).status()).toBe(404);
  expect(
    (
      await page.request.post(`/api/bookings/${id}/cancel`, {
        headers: { Origin: origin },
        data: {},
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await data.db.query(
        'SELECT customer_id,status FROM bookings WHERE id = $1',
        [id],
      )
    ).rows,
  ).toEqual([{ customer_id: data.a.id, status: 'confirmed' }]);
});
