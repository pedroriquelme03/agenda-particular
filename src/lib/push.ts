import webpush from "web-push";

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

// "gone" means the device dropped the subscription (app removed or permission
// revoked) and the caller should delete it.
export async function sendPush(
  subscription: StoredSubscription,
  payload: PushPayload
): Promise<"sent" | "gone" | "failed"> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error("Error sending push notification:", status, error);
    return "failed";
  }
}
