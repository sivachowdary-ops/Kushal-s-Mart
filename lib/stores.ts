export interface StoreBranch {
  id: string;
  name: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  gstin: string;
  cashierSecretPin: string; // 2FA Cashier PIN or TOTP key
  isMainFlagship?: boolean;
  mapsUrl?: string;
  coordinates?: string;
}

export const STORE_BRANCHES: StoreBranch[] = [
  {
    id: "prathipadu-flagship",
    name: "Kushal's Mart Main Store",
    tagline: "RC Cars · Diecast Models · Hobby Superstore",
    address: "Prathipadu, Kakinada District",
    city: "Prathipadu",
    state: "Andhra Pradesh",
    pincode: "533432",
    phone: "+91 7288 907 757",
    gstin: "37BAOPJ6159C2ZH",
    cashierSecretPin: "",
    isMainFlagship: true,
    mapsUrl: "https://www.google.com/maps?q=17.234193801879883,82.19078063964844&z=17&hl=en",
    coordinates: "17°14'03.1\"N 82°11'26.8\"E",
  },
];

export function getStoreBranch(id?: string): StoreBranch {
  if (!id) return STORE_BRANCHES[0];
  const found = STORE_BRANCHES.find((s) => s.id === id);
  return found || STORE_BRANCHES[0];
}

export function verifyStoreCashierPin(branchId: string, enteredPin: string): boolean {
  // TODO: PIN verification should be done server-side via API
  // by checking a hashed PIN stored in the database.
  return false;
}
