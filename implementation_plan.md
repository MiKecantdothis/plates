# Implementation Plan: Price Tracking on Shopping List Tab

## 1. Overview & Objectives
Enhance the existing Shopping List tab in Plates to track item prices, calculate estimated grocery totals, and dynamically compute the total spend for in-cart (checked) vs remaining items. This helps lifters budget for high-protein meal preps, supplements, and gym groceries.

---

## 2. Data Model Changes
Each item in `plates_shopping` will be updated to include an optional or formatted price field:

```typescript
interface ShoppingItem {
  id: string;
  name: string;
  category: 'protein' | 'supplements' | 'carbs' | 'fruits-veg' | 'dairy' | 'other';
  checked: boolean;
  price?: number;        // e.g. 19.99 (USD/default currency)
  quantity?: number;     // default 1
}
```

### Migration Strategy:
- Existing items in `localStorage` without a `price` property will default to `0` or `null` without breaking backward compatibility.

---

## 3. UI / UX Design & Components

### A. Input Bar Enhancement
- Add a numeric price input field next to the category dropdown:
  - Input: `<input type="number" id="shopping-price" placeholder="$0.00" min="0" step="0.5" />`
  - Optional quantity stepper or multiplier (e.g., `Qty: 1`).

### B. Summary Budget Bar (Top of Shopping Tab)
Display a sleek, 3-card or banner metric overview matching the deep black + blue outline design:
1. **Total Budget / Estimated Total**: Sum of all items in list (`price * quantity`).
2. **In Cart (Checked)**: Sum of already purchased items.
3. **Remaining**: Outstanding grocery spend.

### C. Shopping Item Row Updates
- Display formatted unit price and total price next to item name:
  - e.g. `Chicken Breast 2.5 lbs` — `$14.99`
- Checked items will strikethrough both the name and price with muted styling.
- Inline quick-edit for price without needing to delete and recreate the item.

---

## 4. Technical Implementation Steps

1. **`index.html`**:
   - Update `.shopping-input-row` to include `#shopping-price` and `#shopping-qty`.
   - Add `#shopping-budget-summary` grid above the shopping list for live financial totals.

2. **`index.css`**:
   - Style `#shopping-price` input with currency indicator styling.
   - Style `.shopping-budget-card` metrics matching `--bg-elevated` and `--border-accent`.
   - Add `.shopping-item-price` layout rules aligned with the checkbox and delete button.

3. **`app.js`**:
   - Update `addShoppingItem()` to parse and store `price` (`parseFloat(shoppingPrice.value) || 0`).
   - Implement `renderShoppingBudget()` to calculate totals:
     ```javascript
     const totalSpend = shoppingList.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 1)), 0);
     const checkedSpend = shoppingList.filter(i => i.checked).reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 1)), 0);
     ```
   - Re-calculate and animate summary numbers whenever items are checked, deleted, or added.

4. **`sw.js`**:
   - Increment cache version when deployed.

---

## 5. Verification & Test Plan
- **Blank / Free Items**: Verify adding items with no price entered defaults gracefully ($0.00).
- **Decimal Precision**: Verify two-decimal rounding (e.g., `$12.49 + $3.50 = $15.99`).
- **Interactive Checkboxes**: Verify toggling checkmarks instantly recalculates "In Cart" vs "Remaining".
- **Delete / Clear**: Verify deleting an item updates the total spend.
- **Theme Consistency**: Verify dark and light modes preserve clear contrast on currency amounts.
