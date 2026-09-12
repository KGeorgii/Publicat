import { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale,
  BarElement, Title, PointElement, LineElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import styles from '../styles/Home.module.css';
import Nav from '../components/Nav';
import { useJournalData } from '../lib/useJournalData';
import {
  QUERY_SPECS, LIMITATIONS, runQuery,
  type Chart as ChartSpec, type QueryResult, type QueryFailure,
} from '../lib/queries';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement);

type Turn =
  | { role: 'user'; text: string }
  | { role: 'result'; result: QueryResult | QueryFailure };

const PALETTE = [
  '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949',
  '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab', '#1f77b4', '#ff7f0e',
];

const SHOWN_BY_DEFAULT = 3;
const DIVIDER = '1px solid rgba(255, 255, 255, 0.12)';

function ChartView({ spec }: { spec: ChartSpec }) {
  const data = {
    labels: spec.labels,
    datasets: [{
      label: spec.label,
      data: spec.values,
      backgroundColor: spec.type === 'pie' ? PALETTE : 'rgba(75, 192, 192, 0.7)',
      borderColor: spec.type === 'line' ? '#b98c54' : 'rgba(75, 192, 192, 1)',
      borderWidth: 1,
    }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: 'white' }, display: spec.type === 'pie' } },
    scales: spec.type === 'pie' ? undefined : {
      y: { beginAtZero: true, ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } },
      x: { ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } },
    },
  } as const;

  return (
    <div style={{ height: 240, marginTop: '0.9rem' }}>
      {spec.type === 'bar' && <Bar data={data} options={options as never} />}
      {spec.type === 'pie' && <Pie data={data} options={options as never} />}
      {spec.type === 'line' && <Line data={data} options={options as never} />}
    </div>
  );
}

export default function AiChat() {
  const { rows, loading, error } = useJournalData();
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [modal, setModal] = useState<null | 'all' | 'limits'>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ask = (text: string) => {
    if (!text.trim()) return;
    // Synchronous: a scan over an array already in memory. Nothing is in
    // flight, so there is nothing to wait for and nothing to simulate.
    setTurns((prev) => [...prev, { role: 'user', text }, { role: 'result', result: runQuery(text, rows) }]);
    setInput('');
  };

  const visible = QUERY_SPECS.slice(0, SHOWN_BY_DEFAULT);

  return (
    <div className={styles.container}>
      <Nav title="AI chat" />

      <main
        className={styles.main}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          backgroundColor: '#303841', padding: '2rem', width: '100%', boxSizing: 'border-box',
        }}
      >
        {/* ---------- one panel: description, picker, transcript, input ---------- */}
        <div
          style={{
            width: '85%', maxWidth: '100%', color: 'white', boxSizing: 'border-box',
            backgroundColor: '#3A444E', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            height: 'calc(100vh - 220px)', minHeight: 520,
          }}
        >
          {/* --- description + query picker --- */}
          <header style={{ padding: '1.25rem 1.5rem', borderBottom: DIVIDER, flexShrink: 0 }}>
            <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem' }}>Query assistant</h2>
            <p style={{ margin: 0, lineHeight: 1.5, fontSize: '0.9rem', opacity: 0.65 }}>
              Answers are computed directly from the data. Your wording is matched against{' '}
              {QUERY_SPECS.length} question types rather than interpreted, so the same question always
              returns the same answer, and every answer shows what was computed.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.9rem' }}>
              {visible.map((s) => (
                <button
                  key={s.id}
                  onClick={() => ask(s.example)}
                  title={s.takes ? `${s.label} · filters: ${s.takes}` : s.label}
                  style={chipStyle}
                >
                  {s.example}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1.1rem', marginTop: '0.7rem', flexWrap: 'wrap' }}>
              <button onClick={() => setModal('all')} style={linkStyle}>
                Show all {QUERY_SPECS.length}
              </button>
              <button onClick={() => setModal('limits')} style={linkStyle}>
                What it cannot do
              </button>
            </div>
          </header>

          {/* --- transcript --- */}
          <div
            ref={scrollRef}
            style={{
              flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem',
              display: 'flex', flexDirection: 'column', gap: '1rem',
            }}
          >
            {loading && <p style={{ margin: 0, opacity: 0.6 }}>Loading data…</p>}
            {!loading && error && <p style={{ margin: 0 }}>Could not load the dataset: {error}</p>}
            {!loading && !error && turns.length === 0 && (
              <p style={{ margin: 'auto 0', textAlign: 'center', opacity: 0.4, fontSize: '0.88rem' }}>
                {rows.length.toLocaleString()} rows loaded. Pick a question above, or type one below.
              </p>
            )}

            {turns.map((t, i) =>
              t.role === 'user' ? (
                <div key={i} style={{ ...bubble, backgroundColor: '#2C3440', alignSelf: 'flex-end', maxWidth: '80%' }}>
                  {t.text}
                </div>
              ) : (
                <div key={i} style={{ ...bubble, backgroundColor: '#4A5964' }}>
                  {t.result.ok ? (
                    <>
                      <h3 style={{ margin: '0 0 0.45rem', fontSize: '1rem' }}>{t.result.title}</h3>
                      <p style={{ margin: 0, lineHeight: 1.5 }}>{t.result.prose}</p>
                      {t.result.chart && <ChartView spec={t.result.chart} />}
                      {t.result.list && (
                        <ol style={{ margin: '0.9rem 0 0', paddingLeft: '1.4rem', lineHeight: 1.6, fontSize: '0.9rem' }}>
                          {t.result.list.map((line, k) => <li key={k}>{line}</li>)}
                        </ol>
                      )}
                      <p style={{
                        margin: '0.9rem 0 0', paddingTop: '0.55rem', borderTop: DIVIDER,
                        fontSize: '0.75rem', opacity: 0.55, fontFamily: 'Consolas, monospace',
                      }}>
                        {t.result.provenance.handler}() · filter: {t.result.provenance.filter} ·{' '}
                        {t.result.provenance.rowsConsidered.toLocaleString()} rows considered
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: 0, lineHeight: 1.5 }}>{t.result.reason}</p>
                      {t.result.suggestions.length > 0 && (
                        <div style={{ marginTop: '0.7rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {t.result.suggestions.map((s) => (
                            <button key={s} onClick={() => ask(s)} style={chipStyle}>{s}</button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            )}
          </div>

          {/* --- input --- */}
          <footer style={{ padding: '1rem 1.5rem', borderTop: DIVIDER, display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') ask(input); }}
              placeholder="Ask about the collection…"
              disabled={loading || !!error}
              style={{
                flex: 1, padding: '0.7rem 1rem', backgroundColor: '#2C3440', color: 'white',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '0.95rem',
              }}
            />
            <button
              onClick={() => ask(input)}
              disabled={loading || !!error}
              style={{
                padding: '0.7rem 1.35rem', backgroundColor: '#b98c54', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.95rem',
              }}
            >
              Ask
            </button>
          </footer>
        </div>

        {modal && (
          <Modal
            title={modal === 'all' ? `All ${QUERY_SPECS.length} question types` : 'What it cannot do'}
            onClose={() => setModal(null)}
          >
            {modal === 'all' ? (
              <>
                <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', opacity: 0.65, lineHeight: 1.5 }}>
                  This list is generated from the handlers themselves, so it cannot describe
                  something the tool does not do. Click any question to run it.
                </p>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  {QUERY_SPECS.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => { setModal(null); ask(s.example); }}
                        style={{ ...chipStyle, borderRadius: '6px', textAlign: 'left', width: '100%' }}
                      >
                        {s.example}
                      </button>
                      <div style={{ fontSize: '0.74rem', opacity: 0.55, marginTop: '0.25rem', paddingLeft: '0.2rem' }}>
                        {s.label}{s.takes ? ` · filters: ${s.takes}` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.88rem', opacity: 0.8, lineHeight: 1.6 }}>
                {LIMITATIONS.map((l, i) => <li key={i} style={{ marginBottom: '0.6rem' }}>{l}</li>)}
              </ul>
            )}
          </Modal>
        )}
      </main>
    </div>
  );
}

function Modal({
  title, onClose, children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#3A444E', color: 'white', borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
          width: 'min(560px, 100%)', maxHeight: '70vh', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          padding: '1rem 1.25rem', borderBottom: DIVIDER, display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <strong style={{ fontSize: '0.98rem' }}>{title}</strong>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', color: 'white', opacity: 0.6, cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '1.25rem', overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

const bubble: React.CSSProperties = {
  borderRadius: '8px',
  padding: '0.9rem 1rem',
  boxSizing: 'border-box',
  lineHeight: 1.5,
};

const chipStyle: React.CSSProperties = {
  backgroundColor: '#303841',
  color: '#e8c89a',
  border: '1px solid rgba(185, 140, 84, 0.4)',
  borderRadius: '999px',
  padding: '0.4rem 0.8rem',
  cursor: 'pointer',
  fontSize: '0.82rem',
  lineHeight: 1.3,
};

const linkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#b98c54',
  cursor: 'pointer',
  padding: 0,
  fontSize: '0.8rem',
};
