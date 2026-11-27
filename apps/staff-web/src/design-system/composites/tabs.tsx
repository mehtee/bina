import React, { useRef } from "react";

export interface TabItem<T extends string> {
  key: T;
  label: string;
  disabled?: boolean;
}

export function getTabId(idPrefix: string, key: string): string {
  return `${idPrefix}-tab-${key}`;
}

export function getTabPanelId(idPrefix: string, key: string): string {
  return `${idPrefix}-panel-${key}`;
}

export function TabList<T extends string>({
  idPrefix,
  ariaLabel,
  items,
  activeKey,
  onChange,
  buttonStyle,
}: {
  idPrefix: string;
  ariaLabel: string;
  items: ReadonlyArray<TabItem<T>>;
  activeKey: T;
  onChange: (nextKey: T) => void;
  buttonStyle?: React.CSSProperties;
}) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  function resolveIsRtl(): boolean {
    const explicitDir = listRef.current?.closest("[dir]")?.getAttribute("dir")?.toLowerCase();
    const docDir =
      typeof document !== "undefined"
        ? document.documentElement.getAttribute("dir")?.toLowerCase()
        : null;
    return (explicitDir ?? docDir ?? "rtl") !== "ltr";
  }

  function findNextEnabledIndex(startIndex: number, step: 1 | -1): number {
    const count = items.length;
    if (count === 0) return -1;
    for (let offset = 1; offset <= count; offset += 1) {
      const idx = (startIndex + step * offset + count) % count;
      if (!items[idx]?.disabled) return idx;
    }
    return startIndex;
  }

  function findBoundaryEnabledIndex(fromStart: boolean): number {
    if (fromStart) {
      return items.findIndex((item) => !item.disabled);
    }
    for (let i = items.length - 1; i >= 0; i -= 1) {
      if (!items[i]?.disabled) return i;
    }
    return -1;
  }

  function handleKeyDown(ev: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const isRtl = resolveIsRtl();
    let targetIndex = -1;

    if (ev.key === "ArrowLeft") {
      targetIndex = findNextEnabledIndex(index, isRtl ? 1 : -1);
    } else if (ev.key === "ArrowRight") {
      targetIndex = findNextEnabledIndex(index, isRtl ? -1 : 1);
    } else if (ev.key === "Home") {
      targetIndex = findBoundaryEnabledIndex(true);
    } else if (ev.key === "End") {
      targetIndex = findBoundaryEnabledIndex(false);
    } else {
      return;
    }

    if (targetIndex < 0) return;
    ev.preventDefault();
    const nextItem = items[targetIndex];
    if (!nextItem || nextItem.disabled) return;
    onChange(nextItem.key);
    tabRefs.current[targetIndex]?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
    >
      {items.map((item, idx) => {
        const isSelected = activeKey === item.key;
        return (
          <button
            key={item.key}
            ref={(el) => {
              tabRefs.current[idx] = el;
            }}
            id={getTabId(idPrefix, item.key)}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={getTabPanelId(idPrefix, item.key)}
            tabIndex={isSelected ? 0 : -1}
            disabled={Boolean(item.disabled)}
            className="bina-button"
            data-variant={isSelected ? "primary" : "secondary"}
            style={buttonStyle}
            onClick={() => onChange(item.key)}
            onKeyDown={(ev) => handleKeyDown(ev, idx)}
          >
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel<T extends string>({
  idPrefix,
  tabKey,
  activeKey,
  children,
}: {
  idPrefix: string;
  tabKey: T;
  activeKey: T;
  children: React.ReactNode;
}) {
  if (tabKey !== activeKey) return null;
  return (
    <div
      id={getTabPanelId(idPrefix, tabKey)}
      role="tabpanel"
      aria-labelledby={getTabId(idPrefix, tabKey)}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
