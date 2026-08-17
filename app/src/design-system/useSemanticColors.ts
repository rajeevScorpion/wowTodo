import { useTheme } from 'tamagui';

/**
 * Provides typed access to custom semantic theme tokens
 * that we inject via extendWithSemantics in themes.ts.
 *
 * These map to v5 theme tokens under the hood:
 * primary → accent9, muted → color7, error → red9, etc.
 */
export function useSemanticColors() {
    const t = useTheme() as any;
    return {
        primary: t.primary?.get() ?? t.accent9?.get() ?? '',
        primaryHover: t.primaryHover?.get() ?? t.accent10?.get() ?? '',
        primaryPress: t.primaryPress?.get() ?? t.accent11?.get() ?? '',
        secondary: t.secondary?.get() ?? t.color8?.get() ?? '',
        muted: t.muted?.get() ?? t.color7?.get() ?? '',
        cardBackground: t.cardBackground?.get() ?? t.color2?.get() ?? '',
        cardBorder: t.cardBorder?.get() ?? t.borderColor?.get() ?? '',
        error: t.error?.get() ?? t.red9?.get() ?? '',
        errorBackground: t.errorBackground?.get() ?? t.red3?.get() ?? '',
        success: t.success?.get() ?? t.green9?.get() ?? '',
        successBackground: t.successBackground?.get() ?? t.green3?.get() ?? '',
        warning: t.warning?.get() ?? t.yellow9?.get() ?? '',
        warningBackground: t.warningBackground?.get() ?? t.yellow3?.get() ?? '',
        info: t.info?.get() ?? t.blue9?.get() ?? '',
        infoBackground: t.infoBackground?.get() ?? t.blue3?.get() ?? '',
        // Standard v5 tokens (always available, typed)
        background: t.background?.get() ?? '',
        color: t.color?.get() ?? '',
        borderColor: t.borderColor?.get() ?? '',
        placeholderColor: t.placeholderColor?.get() ?? '',
        shadowColor: t.shadowColor?.get() ?? '',
        // ── Neo tokens ──
        neoBg: t.neoBg?.get() ?? t.background?.get() ?? '',
        neoSurface: t.neoSurface?.get() ?? t.color2?.get() ?? '',
        neoInset: t.neoInset?.get() ?? t.color3?.get() ?? '',
        hairline: t.hairline?.get() ?? t.borderColor?.get() ?? '',
        neoAccentGold: t.neoAccentGold?.get() ?? t.accent9?.get() ?? '',
        neoAccentMint: t.neoAccentMint?.get() ?? '',
        neoAccentBlue: t.neoAccentBlue?.get() ?? '',
    };
}
