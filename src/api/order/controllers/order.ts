"use strict";

import Stripe from "stripe";
import product from "../../product/controllers/product";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY) as Stripe;
const frontEndUrl = process.env.FRONTEND_URL;
/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    try {
      const { products, user } = ctx.request.body;
      console.log(products);
      const lineItems = products.map((product) => {
        return {
          price_data: {
            currency: "aed",
            product_data: {
              name: product.title,
              // images: [product.img],
            },
            unit_amount: product.price * 100,
          },
          quantity: product.quantity,
        };
      });
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: "salih.codes@gmail.com",
        success_url: `${frontEndUrl}/order`,
        cancel_url: `${frontEndUrl}/order`,
        line_items: [...lineItems],
      });
      console.log(checkoutSession);

      await strapi.service("api::order.order").create({
        data: {
          total: checkoutSession.amount_total,
          customer_email: checkoutSession.customer_email,
          checkout_session_id: checkoutSession.id,
          checkout_session_url: checkoutSession.url,
          status: checkoutSession.payment_status,
        },
      });
      return { checkoutUrl: checkoutSession.url };
    } catch (error) {
      console.log(error);
    }
  },

  async retrieve(ctx) {
    console.log("retrieve", ctx.params);
  },
}));

// quantity: product.quantity,
