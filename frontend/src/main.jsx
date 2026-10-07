import React from 'react'
import ReactDOM from 'react-dom/client'
import ErrorBoundary, { FatalErrorScreen } from './components/ErrorBoundary.jsx'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root'))

// App ngarkohet në mënyrë dinamike: nëse ndonjë modul hedh gabim gjatë ngarkimit
// (p.sh. konfigurim i gabuar), shfaqet një mesazh në vend të një faqeje të bardhë.
import('./App.jsx')
  .then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>,
    )
  })
  .catch((error) => {
    console.error('Dështoi ngarkimi i aplikacionit:', error)
    const isStaleDeploy = /Failed to fetch dynamically imported module|Importing a module script failed/i.test(error?.message || '')
    root.render(
      <FatalErrorScreen
        title={isStaleDeploy ? 'Ka një version të ri të aplikacionit' : 'Aplikacioni nuk u nis'}
        message={
          isStaleDeploy
            ? 'Faqja u përditësua ndërkohë. Rifreskojeni për të marrë versionin e fundit.'
            : 'Ndodhi një gabim gjatë nisjes. Kontrolloni variablat e ambientit në Vercel dhe bëni Redeploy.'
        }
        details={String(error?.message || error)}
      />,
    )
  })
