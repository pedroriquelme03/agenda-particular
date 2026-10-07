import webpush from "web-push";
import { supabase } from "@/lib/supabase";

export interface PushPayload {
  title: string;
  body: string;
  // Notifications with the same tag replace each other on the device.
  tag?: string;
  url?: string;
}

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

let configured = false;

// False when the VAPID keys are missing from the environment.
export function isPushConfigured() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "https://agenda-particular.vercel.app",
      publicKey,
      privateKey
    );
    configured = true;
  }
  return true;
}

export async function sendPush(
  subscription: StoredSubscription,
  payload: PushPayload
) {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      // The device dropped the subscription (app removed or permission revoked).
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", subscription.endpoint);
    } else {
      console.error("Error sending push notification:", status, error);
    }
    return false;
  }
}

export async function sendPushToAll(payload: PushPayload) {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");
  if (error) {
    console.error("Error loading push subscriptions:", error);
    return 0;
  }
  const results = await Promise.all(
    (data ?? []).map((subscription) => sendPush(subscription, payload))
  );
  return results.filter(Boolean).length;
}
