/**
 * StoreKit purchase service — RR-01 (JS side).
 *
 * The native bridge is cordova-plugin-purchase (the maintained upstream the
 * old @capacitor-community/in-app-purchases package wrapped; that package
 * now 404s on npm — verified 2026-10-14 — so the dependency is the upstream
 * itself). Its plugin.xml clobbers a `CdvPurchase` global into the native
 * webview; this module reaches it lazily through `window` and imports
 * NOTHING, so the web bundle never carries or executes plugin code. On web
 * every entry point is an inert no-op and the paywall keeps its honest
 * unlocked placeholder.
 *
 * Entitlement posture (v1, no backend exists): entitlement is derived from
 * the store's own owned-state (`store.owned(productId)`) on device, re-read
 * at every app start and after every purchase/restore event. The app store
 * mirrors the derived status as runtime-only state — it is deliberately NOT
 * persisted, so a stale or edited local flag can never manufacture Pro.
 * Server-side receipt validation is the known hardening step if a backend
 * ever exists; it is recorded in the findings register under RR-01.
 */

export const PRO_PRODUCT_ID = "hirecraft_pro_yearly";

/** Entitlement status for the native build. "unknown" until the store
 *  plugin has initialized and reported; web never leaves "unknown". */
export type ProStatus = "unknown" | "pro" | "free";

export interface ProProductInfo {
  title: string;
  description: string;
  /** Localized price string from the store (e.g. "$25.00"); "" if unknown. */
  price: string;
  /** Set when the product's first pricing phase is a free trial. */
  trialNote: string | null;
}

/* ------------------------------------------------------------------ */
/* Pure logic — exercised directly by hc-tools/rr01-check.mjs          */
/* ------------------------------------------------------------------ */

export function deriveProStatus(input: {
  native: boolean;
  initialized: boolean;
  owned: boolean;
}): ProStatus {
  if (!input.native) return "unknown";
  if (!input.initialized) return "unknown";
  return input.owned ? "pro" : "free";
}

interface RawPricingPhase {
  price?: string;
  paymentMode?: string;
}

interface RawProduct {
  title?: string;
  description?: string;
  pricing?: { price?: string };
  offers?: { pricingPhases?: RawPricingPhase[] }[];
}

export function shapeProductInfo(raw: RawProduct | null | undefined): ProProductInfo | null {
  if (!raw) return null;
  const phases = raw.offers?.[0]?.pricingPhases ?? [];
  const trial = phases.length > 0 && phases[0].paymentMode === "FreeTrial";
  // The headline price is the ongoing subscription price: the last
  // non-trial phase (phases are sequential — an intro trial comes first),
  // falling back to the product's pricing shortcut.
  const regular = [...phases].reverse().find((p) => p.paymentMode !== "FreeTrial");
  return {
    title: typeof raw.title === "string" ? raw.title : "",
    description: typeof raw.description === "string" ? raw.description : "",
    price: regular?.price ?? (typeof raw.pricing?.price === "string" ? raw.pricing.price : ""),
    trialNote: trial ? "Includes a free trial for new subscribers (set in App Store Connect)." : null,
  };
}

/* ------------------------------------------------------------------ */
/* Native bridge — structural types mirroring the plugin's shipped     */
/* www/store.d.ts (v13). Only the surface this app uses.               */
/* ------------------------------------------------------------------ */

interface CdvError {
  code?: number;
  message?: string;
}

interface CdvTransaction {
  finish(): Promise<void>;
}

interface CdvOffer {
  pricingPhases?: RawPricingPhase[];
}

interface CdvProduct extends RawProduct {
  id: string;
  owned?: boolean;
  getOffer(id?: string): CdvOffer | undefined;
  offers?: { pricingPhases?: RawPricingPhase[] }[];
}

interface CdvStore {
  register(product: { id: string; platform: string; type: string }): void;
  initialize(platforms?: string[]): Promise<CdvError[]>;
  when(): {
    approved(cb: (t: CdvTransaction) => void): unknown;
    receiptUpdated(cb: () => void): unknown;
    productUpdated(cb: () => void): unknown;
  };
  get(productId: string): CdvProduct | undefined;
  owned(productId: string): boolean;
  order(offer: CdvOffer): Promise<CdvError | undefined>;
  restorePurchases(): Promise<CdvError | undefined>;
  update(): Promise<unknown>;
}

interface CdvPurchaseGlobal {
  store: CdvStore;
  Platform: { APPLE_APPSTORE: string };
  ProductType: { AUTO_RENEWABLE_SUBSCRIPTION: string };
}

interface ShellWindow {
  Capacitor?: { isNativePlatform?: () => boolean };
  CdvPurchase?: CdvPurchaseGlobal;
}

export function isNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as ShellWindow;
  try {
    return !!w.Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

function bridge(): CdvPurchaseGlobal | null {
  if (!isNativeShell()) return null;
  const w = window as unknown as ShellWindow;
  return w.CdvPurchase ?? null;
}

/* ------------------------------------------------------------------ */
/* Service                                                             */
/* ------------------------------------------------------------------ */

let initStarted = false;
let initCompleted = false;
let statusListener: ((s: ProStatus) => void) | null = null;

function publishStatus(cdv: CdvPurchaseGlobal, initialized: boolean) {
  if (!statusListener) return;
  let owned = false;
  try {
    owned = !!cdv.store.owned(PRO_PRODUCT_ID);
  } catch {
    owned = false;
  }
  statusListener(deriveProStatus({ native: true, initialized, owned }));
}

/**
 * Initialize the store bridge (native only, idempotent). Registers the Pro
 * product, finishes approved transactions, and republishes entitlement on
 * every store event. Calls the listener with "unknown" on web or when the
 * plugin is absent from the shell (the paywall then shows its unavailable
 * state rather than breaking).
 */
export async function initPurchases(onStatus: (s: ProStatus) => void): Promise<void> {
  statusListener = onStatus;
  const cdv = bridge();
  if (!cdv) {
    onStatus("unknown");
    return;
  }
  if (initStarted) {
    publishStatus(cdv, true);
    return;
  }
  initStarted = true;
  try {
    cdv.store.register({
      id: PRO_PRODUCT_ID,
      platform: cdv.Platform.APPLE_APPSTORE,
      type: cdv.ProductType.AUTO_RENEWABLE_SUBSCRIPTION,
    });
    cdv.store.when().approved((t) => {
      // No receipt validator is configured in v1 (no backend): finish the
      // transaction so StoreKit clears it, then re-derive entitlement from
      // the store's owned state.
      t.finish().catch(() => {});
      publishStatus(cdv, true);
    });
    cdv.store.when().receiptUpdated(() => publishStatus(cdv, true));
    cdv.store.when().productUpdated(() => publishStatus(cdv, true));
    await cdv.store.initialize([cdv.Platform.APPLE_APPSTORE]);
    initCompleted = true;
    publishStatus(cdv, true);
  } catch {
    // Initialization failed (e.g. product not yet created in App Store
    // Connect): stay "unknown" so the paywall shows its retry state.
    onStatus("unknown");
  }
}

/**
 * Re-check entitlement — the paywall's retry for the "unknown" state
 * (RR-27). If initialization never completed (the first-native-build
 * case: product missing in App Store Connect, store unreachable), run
 * it again from scratch; otherwise ask the store to refresh and
 * republish through the registered listener. No-op on web.
 */
export async function refreshProStatus(): Promise<void> {
  const cdv = bridge();
  if (!cdv || !statusListener) return;
  if (!initCompleted) {
    initStarted = false;
    await initPurchases(statusListener);
    return;
  }
  try {
    await cdv.store.update();
  } catch {
    // Keep the last published state; the publish below re-derives it.
  }
  publishStatus(cdv, true);
}

/** The store product's display info, once loaded; null before that. */
export function currentProductInfo(): ProProductInfo | null {
  const cdv = bridge();
  if (!cdv) return null;
  try {
    return shapeProductInfo(cdv.store.get(PRO_PRODUCT_ID));
  } catch {
    return null;
  }
}

function errorMessage(e: CdvError | undefined, fallback: string): string {
  const msg = typeof e?.message === "string" ? e.message : "";
  if (/cancel/i.test(msg)) return "Purchase cancelled — nothing was charged.";
  return msg || fallback;
}

/** Start the StoreKit purchase sheet for Pro. */
export async function purchasePro(): Promise<{ ok: boolean; message: string }> {
  const cdv = bridge();
  if (!cdv) return { ok: false, message: "Purchases aren't available in this build." };
  try {
    const product = cdv.store.get(PRO_PRODUCT_ID);
    const offer = product?.getOffer();
    if (!product || !offer) {
      return { ok: false, message: "The Pro product isn't loaded yet — check your connection and try again." };
    }
    const err = await cdv.store.order(offer);
    if (err) return { ok: false, message: errorMessage(err, "The purchase didn't complete. Please try again.") };
    publishStatus(cdv, true);
    return { ok: true, message: "" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? errorMessage({ message: e.message }, "The purchase didn't complete. Please try again.") : "The purchase didn't complete. Please try again." };
  }
}

/** Restore previous purchases for the signed-in Apple ID. */
export async function restorePro(): Promise<{ ok: boolean; message: string }> {
  const cdv = bridge();
  if (!cdv) return { ok: false, message: "Restore isn't available in this build." };
  try {
    const err = await cdv.store.restorePurchases();
    if (err) return { ok: false, message: errorMessage(err, "Restore didn't complete. Please try again.") };
    publishStatus(cdv, true);
    let owned = false;
    try {
      owned = !!cdv.store.owned(PRO_PRODUCT_ID);
    } catch {
      owned = false;
    }
    return owned
      ? { ok: true, message: "Your Pro subscription was restored." }
      : { ok: true, message: "No previous Pro purchase was found for this Apple ID." };
  } catch {
    return { ok: false, message: "Restore didn't complete. Please try again." };
  }
}
