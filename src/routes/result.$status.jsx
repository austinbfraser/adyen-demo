import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/result/$status')({
  component: ResultPage,
})

const STATUS_CONFIG = {
  success: { title: 'Payment Authorised', message: 'Your payment was successful.' },
  pending: { title: 'Payment Pending', message: 'Your payment is being processed.' },
  failed:  { title: 'Payment Failed', message: 'Your payment was refused or cancelled.' },
  error:   { title: 'Something Went Wrong', message: 'An unexpected error occurred.' },
}

function ResultPage() {
  const { status } = Route.useParams()
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.error

  return (
    <div className="dropinContainer">
      <h2>{config.title}</h2>
      <p>{config.message}</p>
      <Link to="/">Try again</Link>
    </div>
  )
}
