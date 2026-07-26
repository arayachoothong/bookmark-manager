import MuiButton from "@mui/material/Button";
import MuiMenu from "@mui/material/Menu";
import MuiMenuItem from "@mui/material/MenuItem";
import { useState, type ReactNode } from "react";

export type MenuButtonItem = {
  key: string;
  label: ReactNode;
  onSelect: () => void;
};

export type MenuButtonProps = {
  label: ReactNode;
  items: MenuButtonItem[];
  variant?: "text" | "outlined" | "contained";
};

export function MenuButton({ label, items, variant = "contained" }: MenuButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <MuiButton variant={variant} onClick={(e) => setAnchorEl(e.currentTarget)}>
        {label}
      </MuiButton>
      <MuiMenu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        {items.map((item) => (
          <MuiMenuItem
            key={item.key}
            onClick={() => {
              setAnchorEl(null);
              item.onSelect();
            }}
          >
            {item.label}
          </MuiMenuItem>
        ))}
      </MuiMenu>
    </>
  );
}
