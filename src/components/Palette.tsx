const colors = [
  { name: 'Deep Navy', value: '#10233D', className: 'palette-swatch--navy', use: 'Type, borders, structure' },
  { name: 'Clear Sky', value: '#8FD7F3', className: 'palette-swatch--sky', use: 'Primary light-blue accent' },
  { name: 'Pool Water', value: '#B7E6F7', className: 'palette-swatch--pool', use: 'Cards, banners, highlights' },
  { name: 'Powder Blue', value: '#D5F0FA', className: 'palette-swatch--powder', use: 'Soft panels, notices' },
  { name: 'Morning Ice', value: '#EAF8FC', className: 'palette-swatch--ice', use: 'Quiet backgrounds' },
  { name: 'Cloud', value: '#F5F8F7', className: 'palette-swatch--cloud', use: 'Main canvas' },
  { name: 'Flash Lime', value: '#E9FF45', className: 'palette-swatch--lime', use: 'Calls to action, winners' },
]

export function Palette({ onBack }: { onBack?: () => void }) {
  return (
    <div className="palette-page">
      {onBack && <button className="tutorial-back" onClick={onBack}>← Back to setup</button>}
      <header className="palette-hero">
        <span className="eyebrow">House Photo Hunt / visual system</span>
        <h1>Cool colors.<br /><i>Bright night.</i></h1>
        <p>A crisp party palette built around light blues, grounded navy, and one electric lime accent.</p>
      </header>

      <section className="palette-grid" aria-label="Website color palette">
        {colors.map((color, index) => (
          <article className={`palette-swatch ${color.className}`} key={color.value}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h2>{color.name}</h2>
              <code>{color.value}</code>
              <p>{color.use}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="palette-combinations">
        <span className="eyebrow">Approved combinations</span>
        <div>
          <article className="palette-combo palette-combo--sky"><b>SKY / NAVY</b><span>Everyday energy</span></article>
          <article className="palette-combo palette-combo--navy"><b>NAVY / ICE</b><span>Big-screen drama</span></article>
          <article className="palette-combo palette-combo--lime"><b>LIME / NAVY</b><span>Action and winning</span></article>
        </div>
      </section>
    </div>
  )
}
