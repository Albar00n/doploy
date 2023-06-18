"use strict";

import Stripe from "stripe";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY) as Stripe;
const frontEndUrl = process.env.FRONTEND_URL;
/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    try {
      const { products, samples, user } = ctx.request.body;
      const lineItems = products.map((product) => {
        return {
          price_data: {
            currency: "aed",
            product_data: {
              name: product.title,
              images: [product.img],
            },
            unit_amount: product.price * 100,
          },
          quantity: product.quantity,
        };
      });
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        shipping_address_collection: {
          allowed_countries: ["AE"],
        },
        phone_number_collection: {
          enabled: true,
        },
        mode: "payment",
        payment_method_options: {
          card: {
            setup_future_usage: "off_session",
          },
        },
        customer_email: user.email,
        success_url: `${frontEndUrl}/order?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontEndUrl}/cart`,
        line_items:
          samples.length > 0
            ? [
                ...lineItems,
                {
                  price_data: {
                    currency: "aed",
                    product_data: {
                      name: "Samples",
                      description:
                        "The samples you opted for in your cart " +
                        samples.map((sample: any) => sample.title + " x1 \n"),
                    },
                    unit_amount: 350 * 100,
                  },
                  quantity: 1,
                },
              ]
            : [...lineItems],
      });

      await strapi.service("api::order.order").create({
        data: {
          total: checkoutSession.amount_total / 100,
          customer_email: checkoutSession.customer_email,
          checkout_session_id: checkoutSession.id,
          checkout_session_url: checkoutSession.url,
          status: checkoutSession.payment_status,
          products: products.map((product) => {
            return {
              id: product.id,
              title: product.title,
              price: product.price,
              image: product.img,
              quantity: product.quantity,
              selectedSize: product.selectedSize,
              category: product.category,
            };
          }),
          samples,
        },
      });
      return { checkoutUrl: checkoutSession.url };
    } catch (error) {
      console.log(error);
    }
  },

  async updateOrderStatus(data: Stripe.Checkout.Session) {
    try {
      const {
        id,
        payment_status,
        shipping_details,
        customer_details,
        currency,
      } = data;
      if (payment_status === "paid") {
        const foundOrder = await strapi.query("api::order.order").findOne({
          where: { checkout_session_id: id },
        });
        await strapi.service("api::order.order").update(foundOrder.id, {
          data: {
            status: "paid",
            shipping_address: shipping_details.address,
            customer_name: customer_details.name,
            customer_phone_number: customer_details.phone,
            currency,
            estimated_delivery_date: new Date().setDate(
              new Date().getDate() + 1
            ),
            shipping_status: "processing",
          },
        });
      }
    } catch (error) {}
  },

  async webhook(ctx) {
    const raw = ctx.request.body[Symbol.for("unparsedBody")];
    const signature = ctx.request.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    event = stripe.webhooks.constructEvent(raw, signature, endpointSecret);

    try {
      event = stripe.webhooks.constructEvent(raw, signature, endpointSecret);
      await this.processEvent(event);
    } catch (err) {
      return ctx.badRequest(`Webhook Error: ${err.message}`);
    }
    return { received: true };
  },

  async processEvent(event: Stripe.Event) {
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        await this.updateOrderStatus(session);
        break;
      default:
        break;
    }
  },
}));
