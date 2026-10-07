import React from 'react';

// Ekrani i gabimit: përdoret nga ErrorBoundary dhe nga main.jsx (kur dështon ngarkimi i App-it).
// Përdor stile inline që të shfaqet edhe nëse CSS-ja nuk është ngarkuar.
export function FatalErrorScreen({ title = 'Diçka shkoi keq', message, details }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: '#f8fafc', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#fff', border: '1px solid #fecaca', borderRadius: 24, padding: 28, boxShadow: '0 10px 30px rgba(15,23,42,.08)', color: '#334155' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 8px' }}>{title}</h1>
        {message && <p style={{ fontSize: 14, lineHeight: 1.5, margin: '0 0 12px' }}>{message}</p>}
        {details && (
          <pre style={{ fontSize: 11, background: '#f1f5f9', borderRadius: 12, padding: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#64748b', margin: '0 0 16px', maxHeight: 160, overflow: 'auto' }}>
            {details}
          </pre>
        )}
        <button
          onClick={() => window.location.reload()}
          style={{ width: '100%', background: '#4f46e5', color: '#fff', border: 0, borderRadius: 14, padding: '12px 16px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          Rifresko faqen
        </button>
      </div>
    </div>
  );
}

// Kap çdo gabim gjatë render-it në pemën e React-it dhe shfaq FatalErrorScreen në vend të ekranit të bardhë
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Gabim i pakapur në aplikacion:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <FatalErrorScreen
          message="Aplikacioni hasi në një gabim të papritur. Provoni ta rifreskoni faqen. Nëse problemi vazhdon, dërgojani zhvilluesit mesazhin më poshtë."
          details={String(this.state.error?.message || this.state.error)}
        />
      );
    }
    return this.props.children;
  }
}
