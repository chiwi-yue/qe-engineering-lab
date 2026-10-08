import { useEffect, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
type Slot = { id: string; startsAt: string; endsAt: string };
type Booking = Slot & { slotId: string; status: 'confirmed' | 'cancelled' };
type User = { id: string; email: string; role: 'customer' | 'staff' };
const time = new Intl.DateTimeFormat('en-AU', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'Australia/Brisbane',
});
function App() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function load() {
    const response = await fetch('/api/slots');
    if (!response.ok)
      throw new Error('Unable to load slots. Check the API and database.');
    setSlots((await response.json()).slots);
  }
  async function loadBookings() {
    const response = await fetch('/api/bookings');
    if (response.status === 401) {
      setUser(null);
      setBookings([]);
      throw new Error('Your session has ended. Please log in again.');
    }
    if (!response.ok) throw new Error('Unable to load your bookings.');
    setBookings((await response.json()).bookings);
  }
  async function refreshAfterChange(outcome: string) {
    setMessage(outcome);
    try {
      await Promise.all([load(), loadBookings()]);
    } catch {
      setMessage(
        `${outcome} Refresh failed; reload the page to check the latest state.`,
      );
    }
  }
  useEffect(() => {
    async function initialise() {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        setUser((await response.json()).user);
        await loadBookings();
      } else if (response.status !== 401)
        throw new Error('Unable to check your session.');
      await load();
    }
    initialise()
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, []);
  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error.message);
        return;
      }
      setUser(data.user);
      setPassword('');
      await refreshAfterChange('Logged in. Choose an appointment.');
    } catch {
      setMessage('Unable to log in. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error();
      setUser(null);
      setBookings([]);
      setPassword('');
      setMessage('Logged out.');
    } catch {
      setMessage('Unable to log out. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function book(slotId: string) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          setUser(null);
          setBookings([]);
          setMessage('Your session has ended. Please log in again.');
        } else setMessage(data.error.message);
        try {
          await load();
        } catch {
          setMessage(`${data.error.message} Slots could not be refreshed.`);
        }
        return;
      }
      setSlots((previous) => previous.filter((slot) => slot.id !== slotId));
      await refreshAfterChange(
        `Booking confirmed. Reference: ${data.booking.id}`,
      );
    } catch {
      setMessage(
        'Unable to confirm the outcome. Refresh slots before trying again; the booking may have been saved.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function cancel(id: string) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/bookings/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          setUser(null);
          setBookings([]);
        }
        setMessage(data.error.message);
        return;
      }
      setBookings((previous) =>
        previous.map((booking) => (booking.id === id ? data.booking : booking)),
      );
      await refreshAfterChange('Booking cancelled.');
    } catch {
      setMessage(
        'Unable to confirm cancellation. Reload your bookings before trying again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main>
      <h1>QE Booking Lab</h1>
      <p>Local appointment-booking demonstration.</p>
      <p role="status">{message}</p>
      {loading ? (
        <p>Loading appointments…</p>
      ) : (
        <>
          {user ? (
            <div>
              <p>Logged in as {user.email}</p>
              <button disabled={busy} onClick={() => void logout()}>
                Log out
              </button>
            </div>
          ) : (
            <form onSubmit={(event) => void login(event)}>
              <h2>Customer login</h2>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  disabled={busy}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  value={password}
                  disabled={busy}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <button type="submit" disabled={busy}>
                Log in
              </button>
              <p>
                Use a seeded customer account and the demo password configured
                locally.
              </p>
            </form>
          )}
          {user && (
            <section aria-label="My bookings">
              <h2>My bookings</h2>
              {bookings.length === 0 ? (
                <p>You have no bookings.</p>
              ) : (
                <ul>
                  {bookings.map((booking) => (
                    <li key={booking.id} data-testid={`booking-${booking.id}`}>
                      <span>
                        {time.format(new Date(booking.startsAt))} —{' '}
                        <strong>{booking.status}</strong>
                        <br />
                        Reference: {booking.id}
                      </span>
                      {booking.status === 'confirmed' && (
                        <button
                          disabled={busy}
                          onClick={() => void cancel(booking.id)}
                        >
                          Cancel booking
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          <h2>Available appointments</h2>
          <p>All times shown in Australia/Brisbane.</p>
          {!user && <p>Log in to book an appointment.</p>}
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
                <li key={slot.id} data-testid={`slot-${slot.id}`}>
                  <span>
                    {time.format(new Date(slot.startsAt))} (
                    {(new Date(slot.endsAt).getTime() -
                      new Date(slot.startsAt).getTime()) /
                      60000}{' '}
                    minutes)
                  </span>
                  <button
                    disabled={busy || !user}
                    onClick={() => void book(slot.id)}
                  >
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
