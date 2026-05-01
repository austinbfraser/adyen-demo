import { useEffect, useRef } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AdyenCheckout, Dropin } from '@adyen/adyen-web/auto';
import '@adyen/adyen-web/styles/adyen.css';
import '../App.css';

export const Route = createFileRoute('/')({
  component: CheckoutPage,
});

function handleOnPaymentCompleted(resultCode, navigate) {
  switch (resultCode) {
    case 'Authorised':
      return navigate({ to: '/result/$status', params: { status: 'success' } });
    case 'Pending':
    case 'Received':
      return navigate({ to: '/result/$status', params: { status: 'pending' } });
    default:
      return navigate({ to: '/result/$status', params: { status: 'error' } });
  }
}

function handleOnPaymentFailed(resultCode, navigate) {
  switch (resultCode) {
    case 'Cancelled':
    case 'Refused':
      return navigate({ to: '/result/$status', params: { status: 'failed' } });
    default:
      return navigate({ to: '/result/$status', params: { status: 'error' } });
  }
}

function CheckoutPage() {
  const containerRef = useRef(null);
  const dropinRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (dropinRef.current) return;

    async function initAdyen() {
      const pmRes = await fetch('/api/paymentMethods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const paymentMethodsResponse = await pmRes.json();

      const checkout = await AdyenCheckout({
        clientKey: import.meta.env.VITE_ADYEN_CLIENT_KEY,
        environment: 'test',
        paymentMethodsResponse,
        /**
         * TODO:
         * dynamic control over countryCode and locale
         */
        countryCode: 'US',
        locale: 'en-US',

        onSubmit: async (state, component, actions) => {
          console.info('onSubmit', state, component, actions);
          try {
            if (state.isValid) {
              const { action, order, resultCode } = await fetch(
                '/api/payments',
                {
                  method: 'POST',
                  body: state.data ? JSON.stringify(state.data) : '',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                },
              ).then((response) => response.json());

              if (!resultCode) {
                console.warn('reject');
                actions.reject();
              }

              actions.resolve({
                resultCode,
                action,
                order,
              });
            }
          } catch (error) {
            console.error(error);
            actions.reject();
          }
        },
        onPaymentCompleted: (result, component) => {
          console.info('onPaymentCompleted', result, component);
          handleOnPaymentCompleted(result.resultCode, navigate);
        },
        onPaymentFailed: (result, component) => {
          console.info('onPaymentFailed', result, component);
          handleOnPaymentFailed(result.resultCode, navigate);
        },
        onError: (error, component) => {
          console.error(
            'onError',
            error.name,
            error.message,
            error.stack,
            component,
          );
          navigate({ to: '/result/$status', params: { status: 'error' } });
        },
        
        // Used for the Native 3DS2 Authentication flow, see: https://docs.adyen.com/online-payments/3d-secure/native-3ds2/
        onAdditionalDetails: async (state, component, actions) => {
          console.info('onAdditionalDetails', state, component);
          try {
            const { resultCode } = await fetch('/api/payments/details', {
              method: 'POST',
              body: state.data ? JSON.stringify(state.data) : '',
              headers: {
                'Content-Type': 'application/json',
              },
            }).then((response) => response.json());

            if (!resultCode) {
              console.warn('reject');
              actions.reject();
            }

            actions.resolve({ resultCode });
          } catch (error) {
            console.error(error);
            actions.reject();
          }
        },
      });

      dropinRef.current = new Dropin(checkout).mount(containerRef.current);
    }

    initAdyen().catch((err) => console.error('Drop-in init failed:', err));

    return () => {
      dropinRef.current?.unmount();
      dropinRef.current = null;
    };
  }, [navigate]);

  return (
    <div className="dropinContainer">
      <div ref={containerRef} />
    </div>
  );
}
