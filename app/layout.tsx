export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          padding: 0,
          height: '100vh',
          width: '100vw',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {children}
        </div>
      </body>
    </html>
  )
}
