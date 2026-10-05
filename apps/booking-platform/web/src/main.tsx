import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
type Slot = { id: string; startsAt: string; endsAt: string };
const customerId = '00000000-0000-4000-8000-000000000001';
const time = new Intl.DateTimeFormat('en-AU', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'Australia/Brisbane',
});
function App() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function load() {
    const response = await fetch('/api/slots');
    if (!response.ok)
      throw new Error(
        'Unable to load slots. Check that the API and database are running.',
      );
    const data = await response.json();
    setSlots(data.slots);
  }
  useEffect(() => {
    load()
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, []);
  async function book(slotId: string) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId, customerId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error.message);
        await load();
        return;
      }
      setMessage(`Booking confirmed. Reference: ${data.booking.id}`);
      setSlots((previous) => previous.filter((slot) => slot.id !== slotId));
    } catch {
      setMessage(
        'Unable to confirm the outcome. Refresh slots before trying again; the booking may have been saved.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main>
      <h1>QE Booking Lab</h1>
      <p>
        Local demonstration — booking as seeded Customer A. Login is planned.
      </p>
      <h2>Available appointments</h2>
      <p>All times shown in Australia/Brisbane.</p>
      <p role="status">{message}</p>
      {loading ? (
        <p>Loading appointments…</p>
      ) : (
        <>
          <button
            disabled={busy}
            onClick={() => {
              setLoading(true);
              load()
                .catch((error) => setMessage(error.message))
                .finally(() => setLoading(false));
            }}
          >
            Refresh slots
          </button>
          {slots.length === 0 ? (
            <p>No available appointments.</p>
          ) : (
            <ul>
              {slots.map((slot) => (
                <li key={slot.id}>
                  <span>
                    {time.format(new Date(slot.startsAt))} (30 minutes)
                  </span>
                  <button disabled={busy} onClick={() => void book(slot.id)}>
                    Book appointment
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
