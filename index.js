import express from "express"
import path from "path";
import dotenv from "dotenv";
import { v4 as uuid } from "uuid";
// const { hmacValidator } = require('@adyen/api-library');
import pkg from '@adyen/api-library';
const { Client, Config, CheckoutAPI } = pkg;

// enables environment variables by
// parsing the .env file and assigning it to process.env
dotenv.config({
  path: "./.env",
});

// init app
const app = express();
// Parse JSON bodies
app.use(express.json());
// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));
// Serve client from build folder
// app.use(express.static(path.join(__dirname, "/public")));
app.use(express.static(path.join(import.meta.dirname, "/public")));


// Adyen Node.js API library boilerplate (configuration, etc.)
const config = new Config();
config.apiKey = process.env.ADYEN_API_KEY;
config.environment = "TEST";
const client = new Client(config);
const checkout = new CheckoutAPI(client);


/* ################# API ENDPOINTS ###################### */

// Get payment methods
app.post("/api/paymentMethods", async (req, res) => {
  try {
    const response = await checkout.PaymentsApi.paymentMethods({
      channel: "Web",
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
      /*
      TODO:
      pass in amount obj (incl. currency) and countryCode, having assigned
      these using controls to be built into the UI, i.e. 'Select your country" drop-down')
      */
    });
    res.json(response);
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.status(err.statusCode).json(err.message);
  }
});

// submitting a payment
app.post("/api/payments", async (req, res) => {

  /**
   * TODO:
   * replace this with dynamic currency, controlled by the country-select UI element
   */
  const currency = findCurrency(req.body.paymentMethod.type);
  
  // find shopper IP from request
  const shopperIP = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  try {
    // unique ref for the transaction
    const orderRef = uuid();
    // allows for gitpod support
    const localhost = req.get('host');
    // const isHttps = req.connection.encrypted;
    const protocol = req.socket.encrypted? 'https' : 'http';

    // ideally the data passed here should be computed based on business logic
    const response = await checkout.PaymentsApi.payments({
      amount: { currency, value: 10000 }, // value is 100€ in minor units
      reference: orderRef, // required
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT, // required
      channel: "Web", // required
      origin: `${protocol}://${localhost}`, // required for 3ds2 native flow
      browserInfo: req.body.browserInfo, // required for 3ds2
      shopperIP, // required by some issuers for 3ds2
      authenticationData: {
        attemptAuthentication: "always",
        // add the following line for Native 3DS2 > see also 3ds2-example folder
        //threeDSRequestData: {
        //  nativeThreeDS: "preferred"
        //}
      },
      returnUrl: `${protocol}://${localhost}/handleShopperRedirect?orderRef=${orderRef}`, // required for 3ds2 redirect flow
      paymentMethod : req.body.paymentMethod,
      // we strongly recommend that you the billingAddress in your request. 
      // card schemes require this for channel web, iOS, and Android implementations.
      billingAddress:
        typeof req.body.billingAddress === "undefined" || Object.keys(req.body.billingAddress).length === 0
          ? null
          : req.body.billingAddress,
      // below fields are required for Klarna, line items included

      /**
       * TODO:
       * populate countryCode below using the UI control
       */
      countryCode: req.body.paymentMethod.type.includes("klarna") ? "DE" : null,
      shopperReference: "12345",
      shopperEmail: "youremail@email.com",
      /**
       * TODO:
       * dynamically populate shopperLocale
       */
      shopperLocale: "en_US",
      lineItems: [
        {quantity: 1, amountIncludingTax: 5000 , description: "Sunglasses"},
        {quantity: 1, amountIncludingTax: 5000 , description: "Headphones"}
      ],
    });

    res.json(response);
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.status(err.statusCode).json(err.message);
  }
});

app.post("/api/payments/details", async (req, res) => {
  // Create the payload for submitting payment details
  const payload = {
    details: req.body.details,
    paymentData: req.body.paymentData,
  };

  try {
    // Return the response back to client
    // (for further action handling or presenting result to shopper)
    const response = await checkout.PaymentsApi.paymentsDetails(payload);

    res.json(response);
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.status(err.statusCode).json(err.message);
  }
});


/* ################# end API ENDPOINTS ###################### */

/* ################# CLIENT SIDE ENDPOINTS ###################### */

// Handle all redirects from payment type
app.all("/handleShopperRedirect", async (req, res) => {
  // Create the payload for submitting payment details
  const redirect = req.method === "GET" ? req.query : req.body;
  const details = {};
  if (redirect.redirectResult) {
    details.redirectResult = redirect.redirectResult;
  } else if (redirect.payload) {
    details.payload = redirect.payload;
  }

  try {
    const response = await checkout.PaymentsApi.paymentsDetails({ details });
    // Conditionally handle different result codes for the shopper
    switch (response.resultCode) {
      case "Authorised":
        res.redirect("/result/success");
        break;
      case "Pending":
      case "Received":
        res.redirect("/result/pending");
        break;
      case "Refused":
        res.redirect("/result/failed");
        break;
      default:
        res.redirect("/result/error");
        break;
    }
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.redirect("/result/error");
  }
});

/* ################# end CLIENT SIDE ENDPOINTS ###################### */

/* ################# WEBHOOK ###################### */

// // Process incoming Webhook: get NotificationRequestItem, validate HMAC signature,
// // consume the event asynchronously, send response status code 202
// app.post("/api/webhooks/notifications", async (req, res) => {

//   // YOUR_HMAC_KEY from the Customer Area
//   const hmacKey = process.env.ADYEN_HMAC_KEY;
//   const validator = new hmacValidator()
//   // Notification Request JSON
//   const notificationRequest = req.body;
//   const notificationRequestItems = notificationRequest.notificationItems

//   // fetch first (and only) NotificationRequestItem
//   const notification = notificationRequestItems[0].NotificationRequestItem
//   console.log(notification)
  
//   // Handle the notification
//   if( validator.validateHMAC(notification, hmacKey) ) {
//     // valid hmac: process event
//     const merchantReference = notification.merchantReference;
//     const eventCode = notification.eventCode;
//     console.log("merchantReference:" + merchantReference + " eventCode:" + eventCode);

//     // consume event asynchronously
//     consumeEvent(notification);

//     // acknowledge event has been consumed
//     res.status(202).send(); // Send a 202 response with an empty body

//   } else {
//     // invalid hmac
//     console.log("Invalid HMAC signature: " + notification);
//     res.status(401).send('Invalid HMAC signature');
//   }

// });

// // process payload asynchronously
// function consumeEvent(notification) {
//   // add item to DB, queue or different thread
  
// }



/* ################# UTILS ###################### */

function findCurrency(type) {
  switch (type) {
    case "ach":
      return "USD";
    case "wechatpayqr":
    case "alipay":
      return "CNY";
    case "dotpay":
      return "PLN";
    case "boletobancario":
    case "boletobancario_santander":
      return "BRL";
    default:
      return "EUR";
  }
}

/* ################# end UTILS ###################### */

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server started -> http://localhost:${PORT}`));
