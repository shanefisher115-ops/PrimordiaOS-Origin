import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import { moneyPlugHub } from "../moneyplughub/index.js";
import { provisioningEngine } from "../provisioning/index.js";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-01-22",
});

const router = express.Router();

router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error(`[Webhook Error] Signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;   // ⭐ FIXED — no TypeScript annotation

        console.log(`[Revenue] Stripe checkout completed: ${session.id}`);

        await provisioningEngine.provision({
          sessionId: session.id,
          customerEmail: session.customer_details?.email,
          productId: session.metadata?.product_id,
          metadata: session.metadata ?? {},
        });

        await moneyPlugHub.emit({
          channel: "affiliate",
          type: "payment.succeeded",
          payload: session,
        });

        break;
      }

      default:
        console.log(`[Unhandled Event Type] ${event.type}`);
    }

    res.json({ received: true });
  }
);

export default router;
