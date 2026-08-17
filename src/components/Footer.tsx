export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer style={{
      textAlign: 'center',
      padding: '40px 24px 32px',
      borderTop: '1px solid rgba(201,168,76,0.1)',
      background: 'linear-gradient(180deg, transparent 0%, #080614 100%)',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, marginBottom: 12, letterSpacing: '0.03em' }}>
        Loved this experience? Want one just like it for your birthday — or any custom website?
      </p>
      <p style={{ color: 'rgba(201,168,76,0.6)', fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
        DM me — I can handle it in the blink of an eye&nbsp;😉✨
      </p>
      <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12, letterSpacing: '0.05em' }}>
        © {year} · Rawaà Bha 🤍
      </p>
    </footer>
  )
}
