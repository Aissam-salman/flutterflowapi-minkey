const express = require("express");
const stripe = require("stripe")("sk_test_51QVWQ8IcY2LL5iPD7ROuiG6nBwAGVRKWydIpyruuCLEq22yEE1PbwWK3ta9be5Y5eZwdVnXwbCRh8iKpgC5HxACa00q3o8JSXC");

const cors = require("cors");


const app = express();
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());


app.get("/", async (_, res) => {
	res.json("api mk for call stripe");
})

app.post("/create-customer", async (req, res) => {
	let { name, email } = req.body;


	const customer = await stripe.customers.create({
		name: name,
		email: email,
	});

	const ephemeralKey = await stripe.ephemeralKeys.create(
		{ customer: customer.id },
		{ apiVersion: '2024-11-20.acacia' }
	);


	const setupIntent = await stripe.setupIntents.create({
		customer: customer.id,
		automatic_payment_methods: {
			enabled: true,
		}
	});



	res.json({
		clientSecret: setupIntent.client_secret,
		ephemeralKey: ephemeralKey.secret,
		customer: customer.id,
	});
})


app.post("/create-subscribtion", async (req, res) => {

	const { customerId, paymentMethodId } = req.body;

	// Récupérer le premier prix de l'abonnement
	const prices = await stripe.prices.list({
		limit: 1,
		active: true
	});

	await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });

	// Définir le moyen de paiement par défaut pour les factures
	await stripe.customers.update(customerId, {
		invoice_settings: {
			default_payment_method: paymentMethodId,
		},
	});

	const subscription = await stripe.subscriptions.create({
		customer: customerId,
		items: [{ price: prices.data[0].id }],
		payment_behavior: 'default_incomplete',
		expand: ['latest_invoice.payment_intent'],
		payment_settings: {
			save_default_payment_method: 'on_subscription'
		},
	});

	const invoiceId = subscription.latest_invoice.id;
	const paidInvoice = await stripe.invoices.pay(invoiceId);


	res.send({
		subscriptionId: subscription.id,
		clientSecret: subscription.latest_invoice.payment_intent.client_secret,
	});
})


app.listen(4242, '0.0.0.0', () => console.log('Running on port 4242'));
