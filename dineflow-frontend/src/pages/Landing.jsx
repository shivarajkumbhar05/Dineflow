import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChefHat, ConciergeBell, QrCode, Wallet } from 'lucide-react';
import { Button, Logo, StatusPill } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ROLE_HOME } from '../lib/format';

const DISHES = [
  ['2× Paneer Tikka', '1× Dal Makhani', '3× Butter Naan'],
  ['1× Butter Chicken', '2× Jeera Rice'],
  ['4× Masala Chai', '1× Chicken 65'],
  ['2× Veg Biryani', '2× Raita', '1× Gulab Jamun'],
  ['1× Tandoori Platter', '2× Fresh Lime Soda'],
];
const FLOW = ['placed', 'accepted', 'preparing', 'ready'];
let uid = 0;
const mk = (n) => ({ id: ++uid, table: [4, 7, 12, 3, 9, 15][n % 6], items: DISHES[n % DISHES.length], step: 0 });

/** The hero: a live ticket rail that behaves like the real kitchen board. */
function TicketRail() {
  const still = useReducedMotion();
  const [tickets, setTickets] = useState(() => [mk(2), mk(1), mk(0)].map((t, i) => ({ ...t, step: i === 2 ? 2 : i === 1 ? 1 : 0 })));
  const [n, setN] = useState(3);
  useEffect(() => {
    if (still) return undefined;
    const t = setInterval(() => {
      setTickets((cur) => {
        const next = cur.map((x) => ({ ...x, step: Math.min(x.step + 1, 4) }));
        const trimmed = next.filter((x) => x.step < 4);
        if (trimmed.length < 3 || trimmed.every((x) => x.step > 0)) { setN((c) => c + 1); return [{ ...mk(n), step: 0 }, ...trimmed].slice(0, 3); }
        return trimmed;
      });
    }, 2200);
    return () => clearInterval(t);
  }, [still, n]);

  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
      <div className="absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-br from-saffron/25 via-chili/15 to-transparent blur-2xl" />
      <div className="mb-3 h-2 rounded-full bg-gradient-to-r from-plum-line via-warm-faint to-plum-line" />
      <ul className="space-y-3">
        <AnimatePresence initial={false}>
          {tickets.map((t) => (
            <motion.li
              key={t.id} layout
              initial={{ y: -90, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ x: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="ticket shadow-lift" style={{ '--notch': '58px' }}
            >
              <div className="flex items-center justify-between px-5 pb-4 pt-5">
                <p className="font-display text-2xl font-extrabold">Table {t.table}</p>
                <StatusPill status={FLOW[Math.min(t.step, 3)]} />
              </div>
              <div className="tear mx-4" />
              <ul className="space-y-1 px-5 py-4 text-sm text-warm-dim">{t.items.map((i) => <li key={i}>{i}</li>)}</ul>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

const FEATURES = [
  { icon: QrCode, title: 'A QR menu with no app to install', body: 'Guests scan the sticker on their table, build an order and send it. Prices come from your menu, so nobody can change them.' },
  { icon: ChefHat, title: 'A kitchen board that updates itself', body: 'Tickets land the moment they are placed, with a chime and a running timer. One tap moves each one from new to ready.' },
  { icon: ConciergeBell, title: 'Waiters know before guests wave', body: 'Ready-to-serve alerts and water, help or bill requests arrive on every waiter’s phone as they happen.' },
  { icon: Wallet, title: 'Bills settled by UPI, card or cash', body: 'Merge a table’s orders into one bill, apply a discount, and take payment at the table or on the guest’s own phone.' },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          {user ? <Link to={ROLE_HOME[user.role]}><Button>Open dashboard</Button></Link> : (<>
            <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/register" className="hidden sm:block"><Button>Start free</Button></Link>
          </>)}
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-10 lg:grid-cols-[1.15fr_.85fr] lg:pt-20">
        <div>
          <h1 className="font-display text-[clamp(2.8rem,8vw,6.2rem)] font-extrabold leading-[.95]">
            The table orders.<br />The kitchen already knows.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-warm-dim">
            DineFlow turns a QR sticker into a live order ticket. Guests order from their phone, cooks see it instantly, waiters get the alert, and the bill closes without anyone chasing a card machine.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/register"><Button size="lg">Set up your restaurant</Button></Link>
            <Link to="/login"><Button size="lg" variant="soft">Sign in</Button></Link>
          </div>
          <p className="mt-5 text-sm text-warm-faint">Works for restaurants, cafés and hotels. Free to start.</p>
        </div>
        <TicketRail />
      </section>

      <section className="border-y border-plum-line/70 bg-plum/40">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[.8fr_1.2fr]">
          <h2 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">Everything between “we’d like to order” and “keep the change”.</h2>
          <ul className="divide-y divide-plum-line/70">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-5 py-6 first:pt-0">
                <span className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-saffron/15 text-saffron ring-1 ring-saffron/30"><Icon className="h-5 w-5" /></span>
                <div><h3 className="font-display text-xl font-bold">{title}</h3><p className="mt-1.5 max-w-prose text-warm-dim">{body}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24 text-center">
        <h2 className="font-display text-4xl font-extrabold sm:text-6xl">Print the QR codes tonight.</h2>
        <p className="mx-auto mt-4 max-w-lg text-warm-dim">Add your menu, create your tables, and every table gets its own printable code in minutes.</p>
        <Link to="/register" className="mt-8 inline-block"><Button size="lg">Create your account</Button></Link>
      </section>
      <footer className="border-t border-plum-line/70 px-5 py-8 text-center text-sm text-warm-faint">© {new Date().getFullYear()} DineFlow</footer>
    </div>
  );
}
