// Which section of the dashboard each food appears in. ONE small config.
// Most foods follow their category in data/items.json; a few are moved by name
// (eggs sit with dairy in a store, beans and peanut butter on the pantry shelf).
export const GROUPS = [
  { id: "produce", label: "Produce" },
  { id: "dairy", label: "Dairy and eggs" },
  { id: "meat", label: "Meat and poultry" },
  { id: "pantry", label: "Pantry staples" },
  { id: "other", label: "Drinks and other" },
];

const BY_CATEGORY = {
  produce: "produce", dairy: "dairy", protein: "meat",
  grains: "pantry", canned_goods: "pantry", oils: "pantry", pantry: "pantry",
};
const BY_FOOD = { eggs: "dairy", dried_beans: "pantry", peanut_butter: "pantry", coffee: "other" };

// food = {key, category, ...} from /api/items. Anything unknown lands in "Drinks and other".
export const groupFor = (food) => BY_FOOD[food.key] ?? BY_CATEGORY[food.category] ?? "other";
