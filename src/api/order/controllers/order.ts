;('use strict')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
/**
 * order controller
 */

const { createCoreController } = require('@strapi/strapi').factories

module.exports = createCoreController('api::order.order', ({ strapi }) => ({
  async create(ctx) {
    const { products } = ctx.request.body
    console.log(products)

    try {
      const lineItems = products.map((product) => {
        return {
          price_data: {
            currency: 'aed',
            product_data: {
              name: product.title,
              // img:product.img,
              // subscription:product.subscription,
              // size:product.size
            },
            unit_amount: product.price * 100,
          },
          quantity: 1,
        }
      })

      const session = await stripe.checkout.sessions.create({
        // shipping_address_collection: { allowed_countries: ["US", "UAE"] },
        payment_method_types: ['card'],
        mode: 'payment',
        success_url: process.env.CLIENT_URL + '/success',
        cancel_url: process.env.CLIENT_URL + '?success=false',
        line_items: lineItems,
        // [
        //   {
        //     price_data: {
        //       currency: "aed",
        //       product_data: {
        //         name: "Hello Kitty",
        //       },
        //       unit_amount: 1000,
        //     },
        //     quantity: 1,
        //   },
        // ],
      })

      await strapi
        .service('api::order.order')
        .create({
          data: {
            products,
            stripeId: session.id,
            // size: session.selectedSize,
            // img: session.img,
          },
        })

      return { stripeSession: session }
    } catch (error) {
      //   console.log(error);
      return { error }
    }
  },
}))
