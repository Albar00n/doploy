export default {
  routes: [
    {
      method: "GET",
      path: "/order/:id",
      handler: "order.retrieve",
      config: {
        auth: false,
      },
    },
  ],
};
