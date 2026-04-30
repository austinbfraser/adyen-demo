import { useEffect, useRef } from 'react'
import { AdyenCheckout, Dropin } from '@adyen/adyen-web/auto'
import '@adyen/adyen-web/styles/adyen.css'
import './App.css'

function App() {
  const containerRef = useRef(null)
  const dropinRef = useRef(null)

  useEffect(() => {
    if (dropinRef.current) return

    async function initAdyen() {
      const pmRes = await fetch('/api/paymentMethods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const paymentMethodsResponse = await pmRes.json()

      const checkout = await AdyenCheckout({
        clientKey: import.meta.env.VITE_ADYEN_CLIENT_KEY,
        environment: 'test',
        paymentMethodsResponse,
        countryCode: "US",
        locale: "en-US",
        onSubmit: async (state, dropin) => {
          const res = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.data),
          })
          const result = await res.json()
          if (result.action) {
            dropin.handleAction(result.action)
          } else {
            window.location.href = `/result/${result.resultCode.toLowerCase()}`
          }
        },
        onAdditionalDetails: async (state, dropin) => {
          const res = await fetch('/api/payments/details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.data),
          })
          const result = await res.json()
          if (result.action) {
            dropin.handleAction(result.action)
          } else {
            window.location.href = `/result/${result.resultCode.toLowerCase()}`
          }
        },
        onError: (error) => console.error('Adyen error', error),
      })

      dropinRef.current = new Dropin(checkout).mount(containerRef.current)
    }

    initAdyen().catch((err) => console.error('Drop-in init failed:', err))

    return () => {
      dropinRef.current?.unmount()
      dropinRef.current = null
    }
  }, [])

  return (
    <div className="dropinContainer">
      <div ref={containerRef} />
    </div>
  )
}

export default App
