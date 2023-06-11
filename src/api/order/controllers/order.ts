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
            },
            // unit_amount: product.price * 100,
            unit_amount: Math.round(product.price * 100),
          },
          quantity: product.quantity,
        }
      })
     

      const session = await stripe.checkout.sessions.create({
        // shipping_address_collection: { allowed_countries: ["US", "UAE"] },
        payment_method_types: ['card'],
        mode: 'payment',
        success_url: process.env.CLIENT_URL + '/success',
        cancel_url: process.env.CLIENT_URL + '?success=false',
        line_items: lineItems,
      })

      await strapi
        .service('api::order.order')
        .create({ data: { products, stripeId: session.id } })

      return { stripeSession: session }
    } catch (error) {
      //   console.log(error);
      return { error }
    }
  },
}))

// quantity: product.quantity,
