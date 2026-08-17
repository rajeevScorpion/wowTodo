# UI Improvements Plan

## Overview
This plan addresses 5 UI/UX issues across the tasks page and capture page.

---

## Issue 01: Mic Button Route Not Working

### Problem
The mic button on the tasks page is not navigating users to the capture screen (`/(app)/index`).

### Current Implementation
- File: [`app/(app)/tasks.tsx`](app/(app)/tasks.tsx:197)
- Line 197: `<FloatingActionButton onPress={() => router.push('/(app)/index' as any)} />`

### Analysis
The route appears correct (`/(app)/index`), but the `as any` type assertion suggests there might be a type mismatch. The route should work as-is, but we should verify the navigation is functioning properly.

### Solution
1. Verify the route is correct by testing navigation
2. If broken, check if the route path needs adjustment
3. Consider using `router.push('/(app)/index')` without type assertion if possible

### Files to Modify
- [`app/(app)/tasks.tsx`](app/(app)/tasks.tsx:197)

---

## Issue 02: Pop-up Menu Position on Capture Page

### Problem
The pop-up menu appears as a lightbox (with backdrop) and should be positioned closer to the gear icon.

### Current Implementation
- File: [`src/components/ui/PopoutMenu.tsx`](src/components/ui/PopoutMenu.tsx)
- Lines 66-77: Backdrop overlay with `rgba(0, 0, 0, 0.4)` background
- Lines 141-146: Menu positioned at `top: 60, right: 24`
- File: [`app/(app)/index.tsx`](app/(app)/index.tsx:221-223): Gear icon at bottom-left

### Analysis
The menu is currently positioned at a fixed location (top-right) with a full-screen backdrop. The gear icon is at the bottom-left, so the menu appears far from its trigger.

### Solution
1. **Remove backdrop/lightbox effect**: Remove or make optional the backdrop overlay
2. **Add anchor positioning**: Modify `PopoutMenu` to accept anchor coordinates (x, y) or a ref to position near the trigger
3. **Update usage in index.tsx**: Pass the gear icon's position to the menu

### Implementation Approach
```typescript
// New PopoutMenu props
interface PopoutMenuProps {
    visible: boolean;
    onClose: () => void;
    items: MenuItem[];
    anchorX?: number;  // X position of anchor
    anchorY?: number;  // Y position of anchor
    showBackdrop?: boolean;  // Optional backdrop
}
```

### Files to Modify
- [`src/components/ui/PopoutMenu.tsx`](src/components/ui/PopoutMenu.tsx)
- [`app/(app)/index.tsx`](app/(app)/index.tsx)

---

## Issue 03: Search Bar Redesign on Tasks Page

### Problem
- Remove magnifying glass icon from left side of search bar
- Place magnifying glass icon inside the search bar on the right side
- Stretch search bar fully to the left edge

### Current Implementation
- File: [`app/(app)/tasks.tsx`](app/(app)/tasks.tsx:109-128)
- Lines 110-128: Search icon in `XStack` to the left of input
- Input has `flex={1}` but is constrained by the `XStack` gap

### Analysis
The search bar is wrapped in an `XStack` with a gap, which prevents it from stretching fully to the left edge.

### Solution
1. Remove the `XStack` wrapper and the left `Search` icon
2. Add `rightElement` prop to the `TamaguiInput` to place the Search icon inside on the right
3. Ensure the input stretches to the full width

### Implementation Approach
```tsx
// New search bar structure
<TamaguiInput
    placeholder="Search tasks..."
    value={searchQuery}
    onChangeText={setSearchQuery}
    width="100%"
    height={44}
    backgroundColor={colors.cardBackground}
    borderWidth={1}
    borderColor={colors.borderColor}
    borderRadius={8}
    paddingHorizontal={12}
    paddingVertical={8}
    fontSize={16}
    color={colors.color}
    placeholderTextColor={colors.muted}
>
    <XStack position="absolute" right={12} alignItems="center">
        <Search size={20} color={colors.muted} />
    </XStack>
</TamaguiInput>
```

### Files to Modify
- [`app/(app)/tasks.tsx`](app/(app)/tasks.tsx:109-128)

---

## Issue 04: Improve Contrast in Light Mode

### Problem
The background in light mode needs to be whiter for improved contrast.

### Current Implementation
- File: [`src/design-system/themes.ts`](src/design-system/themes.ts)
- Line 6: `lightPalette` with colors ranging from `hsla(32, 25%, 97%, 1)` to darker shades
- Line 77: `cardBackground: extended.light.color2` which is `hsla(31, 27%, 93%, 1)`

### Analysis
The current light palette has a warm, slightly yellowish tint. The background is at 97% lightness and card background at 93%. To improve contrast, we should:
1. Increase lightness of background colors
2. Reduce the warm/yellow tint for a cleaner white appearance

### Solution
Adjust the `lightPalette` to have higher lightness values and a more neutral white tone:

```typescript
// Current lightPalette
const lightPalette = [
    'hsla(32, 25%, 97%, 1)',   // background - 97% lightness
    'hsla(31, 27%, 93%, 1)',   // cardBackground - 93% lightness
    ...
]

// Proposed lightPalette (higher lightness, more neutral)
const lightPalette = [
    'hsla(220, 10%, 99%, 1)',   // background - 99% lightness, cooler tone
    'hsla(220, 8%, 97%, 1)',    // cardBackground - 97% lightness
    'hsla(220, 8%, 95%, 1)',
    'hsla(220, 8%, 92%, 1)',
    ...
]
```

### Files to Modify
- [`src/design-system/themes.ts`](src/design-system/themes.ts:6)

---

## Issue 05: Reposition Record Button on Capture Page

### Problem
Move the circular record button from the center to the vertical middle between center and bottom of the screen for better one-handed access.

### Current Implementation
- File: [`app/(app)/index.tsx`](app/(app)/index.tsx:135)
- Line 135: `<YStack flex={1} alignItems="center" justifyContent="center" gap="$6">`
- The mic button is centered with `justifyContent="center"`

### Analysis
The mic button is currently vertically centered in the screen. For one-handed access, it should be positioned lower - approximately 75% down the screen (middle between center and bottom).

### Solution
Change the layout to position the mic button lower:
1. Use `justifyContent="flex-start"` with top padding, or
2. Use `justifyContent="center"` but move the button down with `marginTop`, or
3. Use absolute positioning for precise control

### Implementation Approach
```tsx
// Option 1: Use flex-start with top padding
<YStack flex={1} alignItems="center" justifyContent="flex-start" paddingTop="$12" gap="$6">
    {/* Mic button area */}
</YStack>

// Option 2: Use absolute positioning
<YStack flex={1} alignItems="center">
    <YStack style={{ position: 'absolute', top: '60%' }} alignItems="center" gap="$4">
        {/* Mic button area */}
    </YStack>
</YStack>
```

### Files to Modify
- [`app/(app)/index.tsx`](app/(app)/index.tsx:135)

---

## Summary of Changes

| Issue | File(s) | Change Type |
|-------|---------|-------------|
| 01 | `app/(app)/tasks.tsx` | Route fix |
| 02 | `src/components/ui/PopoutMenu.tsx`, `app/(app)/index.tsx` | Component refactor + positioning |
| 03 | `app/(app)/tasks.tsx` | UI layout change |
| 04 | `src/design-system/themes.ts` | Color palette adjustment |
| 05 | `app/(app)/index.tsx` | Layout positioning change |

---

## Testing Checklist

After implementation, verify:
- [ ] Issue 01: Mic button navigates to capture screen
- [ ] Issue 02: Menu appears near gear icon without backdrop
- [ ] Issue 03: Search icon is on right, bar stretches to left edge
- [ ] Issue 04: Light mode has improved contrast
- [ ] Issue 05: Record button is positioned for one-handed access
