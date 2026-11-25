import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth, useClerk, useUser } from "@clerk/expo";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import type { Contact, Message, Profile, Transaction } from "@/types/wallet";
import { ApiError, setTokenGetter } from "@/api/client";
import { connectLive } from "@/api/live";
import {
  createContact,
  createProfile,
  fetchWallet,
  forgetPushToken,
  lookupPhone,
  markChatRead,
  sendRequest,
  sendTextMessage,
  sendTopUp,
  sendContactCard,
  sendPhotoMessage,
  syncProfilePicture,
  syncEmail,
  savePushToken,
  sendTransfer,
  updateSettings,
  type WalletData,
} from "@/api/wallet";
import { ServerStatus } from "@/components/server-status";
import { ProfileSetup } from "@/components/profile-setup";
import { buildNotifications, type AppNotification } from "@/utils/notifications";
import { describeClerkError } from "@/utils/clerk-errors";
import { chatIdOf, getPushToken } from "@/utils/push";

type WalletContextValue = {
  balance: number;
  transactions: Transaction[];
  messages: Message[];
  contacts: Contact[];
  unread: Record<string, number>;
  // These talk to the server, so they take time and can fail: screens `await` them and show the error
  sendMoney: (contactId: string, amount: number) => Promise<void>;
  sendMessage: (contactId: string, text: string) => Promise<void>;
  topUp: (amount: number, source: string) => Promise<void>;
  requestMoney: (contactId: string, amount: number) => Promise<void>;
  shareContact: (contactId: string, name: string, phone: string) => Promise<void>;
  sendPhoto: (contactId: string, photo: string) => Promise<void>;
  addContact: (name: string, phone: string) => Promise<Contact>;
  isOnWalletChat: (phone: string) => Promise<boolean>; // does an account use this number?
  markRead: (contactId: string) => void;
  reload: () => Promise<void>; // fetch the newest data from the server (pull to refresh)
  notifications: AppNotification[];
  seenNotificationIds: string[];
  markNotificationsSeen: () => void;
  profile: Profile;
  updateName: (name: string) => void;
  monthlyBudget: number;
  setMonthlyBudget: (amount: number) => void;
  hideBalance: boolean;
  setHideBalance: (hide: boolean) => Promise<void>; // finishes once the server has saved it
  // A picture as a "data:image/jpeg;base64,…" text, or null to remove it
  changePicture: (picture: string | null) => Promise<void>;
  emailChanged: () => Promise<void>; // the email was changed on Clerk: save it on our server too
  signOut: () => Promise<void>; // stops notifications on this phone, then ends the Clerk session
  typing: Record<string, boolean>; // contact id → they are typing to me right now
  tellTyping: (contactId: string, typing: boolean) => void; // I'm typing to them (or stopped)
};

const TYPING_SHOWN_MS = 4_000; // "typing…" goes away 4 s after the last sign of typing
const TYPING_SEND_EVERY_MS = 3_000; // while I type, say so at most every 3 s (not on every key)

const WalletContext = createContext<WalletContextValue | null>(null);

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function WalletProvider({ children }: { children: ReactNode }) {
  // Everything from the server, or null until the first load finishes
  const [data, setData] = useState<WalletData | null>(null);
  const [loadError, setLoadError] = useState("");
  // Signed in with Clerk, but no wallet in our database yet, and creating it automatically didn't work
  // → show "Create your wallet" (with the reason in profileError)
  const [needsProfile, setNeedsProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const { getToken } = useAuth(); // gives a fresh sign-in ticket each time it's called
  const clerk = useClerk();
  const { user } = useUser();
  // The name and phone typed on the Create account screen, saved with the Clerk account
  const signUpDetails = user?.unsafeMetadata as { name?: string; phone?: string } | undefined;
  // Only this phone needs to remember which notifications you've seen, so this stays local
  const [seenNotificationIds, setSeenNotificationIds] = useState<string[]>([]);

  // Goes up by one each time "Try again" is pressed, which makes the effect below run again
  const [attempt, setAttempt] = useState(0);

  // Settings are saved one after another, in the order you tapped. Without this, tapping the eye quickly
  // sends two saves at once, and they can reach the server in the wrong order (the screen says "shown",
  // the database says "hidden").
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  // Load when the app opens (and on every retry)
  useEffect(() => {
    // From now on every request to our server carries the Clerk ticket (see api/client.ts)
    setTokenGetter(getToken);

    let cancelled = false; // set if the provider goes away before the server answers
    fetchWallet().then(
      (wallet) => !cancelled && setData(wallet),
      (error) => {
        if (cancelled) return;
        if (!(error instanceof ApiError && error.code === "profile_missing")) return setLoadError(messageOf(error));

        // No wallet yet (first sign-in). Create it from the Create account form's details, then load it.
        const name = signUpDetails?.name;
        const phone = signUpDetails?.phone;
        if (!name || !phone) return setNeedsProfile(true); // nothing saved: ask on the Create your wallet screen
        createProfile(name, phone).then(
          () => !cancelled && setAttempt((n) => n + 1),
          (createError) => {
            if (cancelled) return;
            setProfileError(messageOf(createError)); // e.g. "This phone number is already used by another wallet."
            setNeedsProfile(true);
          },
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt, getToken, signUpDetails?.name, signUpDetails?.phone]);

  // Your picture lives in two places: Clerk (the image itself) and our database (its address, so your
  // contacts see it). If a change stopped halfway, they differ: then copy Clerk's address over, once.
  const clerkImage = user?.hasImage ? user.imageUrl : undefined;
  const savedImage = data?.profile.imageUrl;
  const syncedImage = useRef<string | null>(null); // the Clerk picture we already tried to copy
  useEffect(() => {
    if (!data || clerkImage === savedImage || syncedImage.current === (clerkImage ?? "")) return;
    syncedImage.current = clerkImage ?? "";
    syncProfilePicture()
      .then(() => fetchWallet())
      .then(setData, (error) => console.warn("Couldn't copy the profile picture:", messageOf(error)));
  }, [data, clerkImage, savedImage]);

  // From here on, things that start once the wallet has loaded
  const ready = data !== null;

  // Live updates: the server says "changed" when someone messages you or sends you money, and we reload.
  // Several pings close together (e.g. a payment = balance + message) become one reload.
  // The same line says who is typing to you.
  const live = useRef<ReturnType<typeof connectLive> | null>(null);
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    if (!ready) return;
    let reloadTimer: ReturnType<typeof setTimeout> | undefined;
    const timers = typingTimers.current;
    live.current = connectLive(getToken, {
      onChange() {
        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
          fetchWallet().then(setData, (error) => console.warn("Couldn't load the new data:", messageOf(error)));
        }, 300);
      },
      onTyping(from, isTyping) {
        clearTimeout(timers[from]);
        setTyping((prev) => (prev[from] === isTyping ? prev : { ...prev, [from]: isTyping }));
        // No news for a few seconds (they stopped, or lost signal): stop showing it
        if (isTyping) timers[from] = setTimeout(() => setTyping((prev) => ({ ...prev, [from]: false })), TYPING_SHOWN_MS);
      },
    });
    return () => {
      clearTimeout(reloadTimer);
      Object.values(timers).forEach(clearTimeout);
      live.current?.close();
      live.current = null;
    };
  }, [ready, getToken]);

  // When I last told each contact "typing", so a fast typist doesn't send a message per key
  const lastTypingSent = useRef<Record<string, number>>({});

  // Push notifications: ask once for permission, then tell the server where to send yours
  const pushToken = useRef<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    getPushToken()
      .then((token) => {
        if (!token) return;
        pushToken.current = token;
        return savePushToken(token);
      })
      .catch((error) => console.warn("Couldn't save the push token:", messageOf(error)));
  }, [ready]);

  // Tapping a notification opens that chat: either while the app runs (the listener), or when the tap
  // started the app (the last response). Both can report the same tap, so each one is handled once.
  const handledTap = useRef("");
  useEffect(() => {
    if (!ready) return;
    function openChat(response: Notifications.NotificationResponse | null) {
      const chatId = chatIdOf(response);
      const tapId = response?.notification.request.identifier ?? "";
      if (!chatId || tapId === handledTap.current) return;
      handledTap.current = tapId;
      router.push({ pathname: "/chat/[id]", params: { id: chatId } });
    }
    Notifications.getLastNotificationResponseAsync().then(openChat, () => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(openChat);
    return () => subscription.remove();
  }, [ready]);

  // No wallet yet and it couldn't be created automatically: ask for the details, then load it
  if (needsProfile) {
    return (
      <ProfileSetup
        initialName={signUpDetails?.name}
        initialPhone={signUpDetails?.phone}
        initialError={profileError}
        onCreated={() => {
          setNeedsProfile(false);
          setProfileError("");
          setAttempt((n) => n + 1);
        }}
        onSignOut={() => clerk.signOut()}
      />
    );
  }

  // Until the first load works, show a spinner or the error instead of the app
  if (!data) {
    return (
      <ServerStatus
        error={loadError}
        onRetry={() => {
          setLoadError("");
          setAttempt((n) => n + 1);
        }}
      />
    );
  }

  // After every change: ask the server for the fresh data, so the screen always matches the database
  async function refresh() {
    setData(await fetchWallet());
  }

  async function sendMoney(contactId: string, amount: number) {
    await sendTransfer(contactId, amount); // throws "Not enough balance" etc., which the Send screen shows
    await refresh();
  }

  function tellTyping(contactId: string, isTyping: boolean) {
    const last = lastTypingSent.current[contactId] ?? 0;
    if (isTyping && Date.now() - last < TYPING_SEND_EVERY_MS) return; // told them a moment ago
    if (!isTyping && last === 0) return; // never said I was typing: nothing to take back
    lastTypingSent.current[contactId] = isTyping ? Date.now() : 0;
    live.current?.sendTyping(contactId, isTyping);
  }

  async function sendMessage(contactId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return; // don't send empty messages
    tellTyping(contactId, false); // the message itself is on its way: stop "typing…" on their side
    await sendTextMessage(contactId, trimmed);
    await refresh();
  }

  async function topUp(amount: number, source: string) {
    await sendTopUp(amount, source);
    await refresh();
  }

  // A request moves no money, so it is only a chat message, not a transaction
  async function requestMoney(contactId: string, amount: number) {
    await sendRequest(contactId, amount);
    await refresh();
  }

  // Sends a contact card (someone's name and number) into the chat with contactId
  async function shareContact(contactId: string, name: string, phone: string) {
    await sendContactCard(contactId, name.trim(), phone);
    await refresh();
  }

  async function sendPhoto(contactId: string, photo: string) {
    await sendPhotoMessage(contactId, photo);
    await refresh();
  }

  // Returns the new contact so the caller can open a chat with them straight away
  async function addContact(name: string, phone: string) {
    const contact = await createContact(name, phone);
    await refresh();
    return contact;
  }

  function markRead(contactId: string) {
    // Nothing to clear: stop here (this also stops the chat screen asking the server again on every render)
    if (!data?.unread[contactId]) return;
    // Clear the badge on screen straight away, then tell the server
    setData((prev) => prev && { ...prev, unread: { ...prev.unread, [contactId]: 0 } });
    markChatRead(contactId).catch((error) => console.warn("Couldn't mark the chat as read:", messageOf(error)));
  }

  // Settings change on screen straight away ("optimistic update") and are saved in the background.
  // If saving fails, reload, so the screen goes back to what the server really has.
  // Returns a promise that finishes when this save is done, so a screen can show it's saving.
  function saveSettings(changes: Parameters<typeof updateSettings>[0], update: (prev: WalletData) => WalletData) {
    setData((prev) => prev && update(prev));
    saveQueue.current = saveQueue.current.then(() =>
      updateSettings(changes).then(
        () => {},
        (error) => {
          console.warn("Couldn't save the setting:", messageOf(error));
          return refresh().catch(() => {});
        },
      ),
    );
    return saveQueue.current;
  }

  function updateName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveSettings({ name: trimmed }, (prev) => ({ ...prev, profile: { ...prev.profile, name: trimmed } }));
  }

  function setMonthlyBudget(amount: number) {
    saveSettings({ monthlyBudget: amount }, (prev) => ({ ...prev, monthlyBudget: amount }));
  }

  function setHideBalance(hide: boolean) {
    return saveSettings({ hideBalance: hide }, (prev) => ({ ...prev, hideBalance: hide }));
  }

  // The picture itself is uploaded to Clerk (which stores and serves images); then our server copies
  // its address so contacts can see it, and we reload to show it
  async function changePicture(picture: string | null) {
    if (!user) throw new Error("You're not signed in.");
    // Each step says what failed, so the message shows where it stopped
    try {
      await user.setProfileImage({ file: picture });
    } catch (error) {
      throw new Error(`Clerk didn't accept the picture: ${describeClerkError(error).message}`);
    }
    try {
      await syncProfilePicture();
    } catch (error) {
      throw new Error(`The picture was uploaded, but our server couldn't save it: ${messageOf(error)}`);
    }
    await refresh();
  }

  async function emailChanged() {
    await syncEmail();
    await refresh();
  }

  // Before signing out, tell the server to stop sending this account's notifications to this phone.
  // If that fails (server off), sign out anyway: the next person to sign in here takes the token over.
  async function signOut() {
    if (pushToken.current) await forgetPushToken(pushToken.current).catch(() => {});
    await clerk.signOut();
  }

  // Worked out fresh on every render from the data above, never stored
  const notifications = buildNotifications({
    contacts: data.contacts,
    messages: data.messages,
    transactions: data.transactions,
    unread: data.unread,
    monthlyBudget: data.monthlyBudget,
  });

  function markNotificationsSeen() {
    setSeenNotificationIds((prev) => {
      const unseen = notifications.filter((n) => !prev.includes(n.id));
      // Same array back when nothing changed, so React skips the re-render
      return unseen.length === 0 ? prev : [...prev, ...unseen.map((n) => n.id)];
    });
  }

  return (
    <WalletContext.Provider
      value={{
        balance: data.balance,
        transactions: data.transactions,
        messages: data.messages,
        contacts: data.contacts,
        unread: data.unread,
        sendMoney,
        sendMessage,
        topUp,
        requestMoney,
        shareContact,
        sendPhoto,
        addContact,
        isOnWalletChat: lookupPhone, // only asks, changes nothing, so no refresh needed
        markRead,
        reload: refresh,
        notifications,
        seenNotificationIds,
        markNotificationsSeen,
        profile: data.profile,
        updateName,
        monthlyBudget: data.monthlyBudget,
        setMonthlyBudget,
        hideBalance: data.hideBalance,
        setHideBalance,
        changePicture,
        emailChanged,
        signOut,
        typing,
        tellTyping,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const wallet = useContext(WalletContext);
  if (!wallet) throw new Error("useWallet must be used inside WalletProvider");
  return wallet;
}
