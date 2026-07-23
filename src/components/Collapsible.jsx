import { useState } from 'react'

// Обвивка за "историја" секции — по default затворена, се отвора со клик на насловот,
// за секоја страница да не е претрупана со огромна секогаш-отворена листа.
export default function Collapsible({ title, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card">
      <button className="collapsible-header" onClick={() => setOpen(o => !o)}>
        <span className="card-title" style={{ marginBottom: 0 }}>
          {title}{count != null && <span className="collapsible-count"> ({count})</span>}
        </span>
        <span className={`collapsible-chevron ${open ? 'open' : ''}`}>▾</span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  )
}
