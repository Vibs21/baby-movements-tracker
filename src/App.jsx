import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'baby-movements-daily-entries';

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const humanDate = (dateStr) =>
  parseDate(dateStr).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const humanTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function App() {
  const today = useMemo(() => formatDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [entries, setEntries] = useState({});
  const [note, setNote] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw));

      // Always show today in date picker on fresh load/refresh.
      setSelectedDate(today);
    } catch {
      setEntries({});
    } finally {
      setIsHydrated(true);
    }
  }, [today]);

  useEffect(() => {
    const entry = entries[selectedDate];
    setNote(entry?.note || '');
  }, [selectedDate, entries]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, isHydrated]);

  const currentEntry = entries[selectedDate] || {
    count: 0,
    note: '',
    lastUpdated: null,
    events: [],
  };
  const currentCount = currentEntry.count;

  const updateCurrent = (diff) => {
    setEntries((prev) => {
      const existing = prev[selectedDate] || {
        count: 0,
        note: '',
        lastUpdated: null,
        events: [],
      };
      const nextCount = Math.max(0, existing.count + diff);
      const now = new Date().toISOString();
      const nextEvents = [...(existing.events || []), { diff, at: now }];
      return {
        ...prev,
        [selectedDate]: {
          ...existing,
          count: nextCount,
          lastUpdated: now,
          events: nextEvents,
        },
      };
    });
  };

  const undoLastEvent = () => {
    setEntries((prev) => {
      const existing = prev[selectedDate];
      if (!existing || !existing.events || existing.events.length === 0)
        return prev;

      const nextEvents = existing.events.slice(0, -1);
      const nextCount = nextEvents.reduce((sum, e) => sum + e.diff, 0);
      const nextLast =
        nextEvents.length > 0 ? nextEvents[nextEvents.length - 1].at : null;

      return {
        ...prev,
        [selectedDate]: {
          ...existing,
          count: nextCount,
          events: nextEvents,
          lastUpdated: nextLast,
        },
      };
    });
  };

  const deleteEvent = (date, index) => {
    setEntries((prev) => {
      const existing = prev[date];
      if (!existing || !existing.events) return prev;
      const nextEvents = existing.events.filter((_, i) => i !== index);
      const nextCount = nextEvents.reduce((acc, ev) => acc + ev.diff, 0);
      const nextLast =
        nextEvents.length > 0 ? nextEvents[nextEvents.length - 1].at : null;
      return {
        ...prev,
        [date]: {
          ...existing,
          count: nextCount,
          events: nextEvents,
          lastUpdated: nextLast,
        },
      };
    });
  };

  const saveNote = () => {
    setEntries((prev) => {
      const existing = prev[selectedDate] || {
        count: 0,
        note: '',
        lastUpdated: null,
        events: [],
      };
      return {
        ...prev,
        [selectedDate]: {
          ...existing,
          note: note.trim(),
        },
      };
    });
  };

  const changeDate = (delta) => {
    const dt = parseDate(selectedDate);
    dt.setDate(dt.getDate() + delta);
    setSelectedDate(formatDate(dt));
  };

  const sortedDates = Object.keys(entries).sort((a, b) => (a < b ? 1 : -1));

  const exportData = () => {
    const dataStr = JSON.stringify({ entries }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baby-movements-${formatDate(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed && parsed.entries && typeof parsed.entries === 'object') {
          setEntries(parsed.entries);
          setSelectedDate(today);
        } else {
          alert('Invalid import format; expected { entries: { ... } }.');
        }
      } catch (err) {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="container">
      <h1>Baby Daily Movement Tracker</h1>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div
          className="row date-nav"
          style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}
        >
          <button
            className="button button-secondary"
            onClick={() => changeDate(-1)}
            aria-label="Previous day"
            style={{ minWidth: '80px' }}
          >
            <span aria-hidden="true">‹</span> prev
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="date-picker" style={{ fontWeight: 700 }}>
              {/* Date: */}
            </label>
            <input
              id="date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <button
            className="button button-secondary"
            onClick={() => changeDate(1)}
            aria-label="Next day"
            style={{ minWidth: '80px' }}
          >
            next <span aria-hidden="true">›</span>
          </button>
        </div>

        <h2>{humanDate(selectedDate)}</h2>
        <div
          className="row"
          style={{
            alignItems: 'center',
            marginTop: '1rem',
            justifyContent: 'center',
            gap: '0.75rem',
          }}
        >
          <button
            className="button button-primary button-circle"
            onClick={() => updateCurrent(1)}
          >
            +
          </button>
          <div
            style={{
              fontSize: '1.6rem',
              fontWeight: '700',
            }}
          >
            {currentCount}
          </div>
          <button
            className="button button-secondary"
            onClick={undoLastEvent}
            style={{ marginLeft: '0.5rem' }}
            disabled={currentEntry.events.length === 0}
          >
            Undo Last
          </button>
        </div>

        <div style={{ marginTop: '0.5rem', color: '#475569', fontWeight: 600 }}>
          Last logged:{' '}
          {currentEntry.lastUpdated
            ? humanTime(currentEntry.lastUpdated)
            : 'No entries yet'}
        </div>

        <div style={{ marginTop: '0.8rem' }}>
          <p style={{ margin: '0 0 0.30rem 0', fontWeight: 700 }}>
            Movement history
          </p>
          {currentEntry.events && currentEntry.events.length > 0 ? (
            <ul style={{ paddingLeft: '1rem', margin: 0, color: '#334155' }}>
              {currentEntry.events
                .slice()
                .reverse()
                .slice(0, 10)
                .map((event, index) => {
                  const eventIndex = currentEntry.events.length - 1 - index;
                  return (
                    <li
                      key={`${event.at}-${eventIndex}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <span>
                        {event.diff > 0 ? '+' : ''}
                        {event.diff} @ {humanTime(event.at)}
                      </span>
                      <button
                        className="event-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEvent(selectedDate, eventIndex);
                        }}
                        aria-label="Delete this movement"
                        style={{ fontSize: '0.8rem' }}
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
            </ul>
          ) : (
            <p style={{ margin: 0, color: '#64748b' }}>
              No movement entries yet
            </p>
          )}
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label
            htmlFor="note-input"
            style={{ fontWeight: 700, display: 'block', marginBottom: 8 }}
          >
            Note for the day
          </label>
          <textarea
            id="note-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add any important details for today"
          />
          <button
            className="button button-primary"
            onClick={saveNote}
            style={{ marginTop: '0.75rem' }}
          >
            Save Note
          </button>
        </div>
      </div>

      <div className="card">
        <div className="history-header-row">
          <h3>History</h3>
          <div className="history-header-actions">
            <button
              className="icon-button"
              onClick={() =>
                document.getElementById('history-import-input').click()
              }
              title="Upload JSON"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M5 20h14v-2H5v2zm7-16l-5 5h3v6h4v-6h3l-5-5z" />
              </svg>
            </button>
            <button
              style={{ transform: 'rotate(180deg)' }}
              className="icon-button"
              onClick={exportData}
              title="Download JSON"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M5 18h14v2H5v-2zm7-12l5 5h-3v6h-4v-6H7l5-5z" />
              </svg>
            </button>
            <input
              id="history-import-input"
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importData(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {sortedDates.length === 0 ? (
          <p style={{ color: '#64748b' }}>No entries yet. Start counting!</p>
        ) : (
          <ul>
            {sortedDates.map((date) => {
              const entry = entries[date];
              return (
                <li
                  key={date}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedDate(date)}
                >
                  <div style={{ fontWeight: 700 }}>{humanDate(date)}</div>
                  <div className="note-preview">
                    Count: {entry.count} • Last:{' '}
                    {entry.lastUpdated ? humanTime(entry.lastUpdated) : '—'}
                  </div>
                  <div className="note-preview" style={{ marginTop: '0.1rem' }}>
                    Note: {entry.note || '—'}
                  </div>
                  {entry.events && entry.events.length > 0 && (
                    <div className="history-event-badges">
                      {entry.events.slice(-8).map((event, index, slice) => {
                        const baseIndex = entry.events.length - slice.length;
                        const eventIndex = baseIndex + index;
                        return (
                          <span
                            key={`${event.at}-${eventIndex}`}
                            className={`event-badge ${
                              event.diff > 0 ? 'event-plus' : 'event-minus'
                            }`}
                          >
                            {event.diff > 0 ? '+' : ''}
                            {event.diff} @ {humanTime(event.at)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
