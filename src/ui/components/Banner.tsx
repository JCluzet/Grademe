import { Text } from "ink";
import type { ReactNode } from "react";

import { THEME } from "../theme";

export type BannerVariant = "success" | "error" | "info";

export interface BannerProps {
  variant: BannerVariant;
  children: ReactNode;
}

const VARIANT_COLOR: Record<BannerVariant, string> = {
  error: THEME.error,
  info: THEME.accent,
  success: THEME.success,
};

export function Banner({ variant, children }: BannerProps): ReactNode {
  return (
    <Text bold color={VARIANT_COLOR[variant]}>
      {children}
    </Text>
  );
}
