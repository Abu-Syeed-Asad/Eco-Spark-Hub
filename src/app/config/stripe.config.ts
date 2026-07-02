import Stripe from "stripe";
import { envVars } from "./env.config";

export const stripe = new Stripe(envVars.STRIPE.STRIPE_SECRET_KEY);