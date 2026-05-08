import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useStrataStore } from "../store/useStrataStore";
import { selectFilteredItems } from "../store/selectors";

export function DashboardRoot(props: {
  onSaveSelected: () => Promise<void>;
  onOpenOriginal: () => void;
  onToggleStar: () => void;
  onToggleRead: () => void;
  loadPreview: (url: string, feedContent?: string, summary?: string) => Promise<{ html: string; source: string }>;
}) {
  const feeds = useStrataStore((s) => s.feeds);
  const items = useStrataStore((s) => s.items);
  const selectedItemId = useStrataStore((s) => s.selectedItemId);
  const searchQuery = useStrataStore((s) => s.searchQuery);
  const selectItem = useStrataStore((s) => s.selectItem);
  const setSearchQuery = useStrataStore((s) => s.setSearchQuery);
  const activeView = useStrataStore((s) => s.activeView);
  const activeFeedId = useStrataStore((s) => s.activeFeedId);
  const setActiveView = useStrataStore((s) => s.setActiveView);
  const setActiveFeedId = useStrataStore((s) => s.setActiveFeedId);
  const compactMode = useStrataStore((s) => s.compactMode);
  const distractionFree = useStrataStore((s) => s.distractionFree);
  const toggleCompactMode = useStrataStore((s) => s.toggleCompactMode);
  const toggleDistractionFree = useStrataStore((s) => s.toggleDistractionFree);
  const isRefreshing = useStrataStore((s) => s.isRefreshing);
  const refreshingFeedIds = useStrataStore((s) => s.refreshingFeedIds);
  const feedErrors = useStrataStore((s) => s.feedErrors);
  const readIds = useStrataStore((s) => s.userState.readIds);
  const starredIds = useStrataStore((s) => s.userState.starredIds);
  const markRead = useStrataStore((s) => s.markRead);
  const markUnread = useStrataStore((s) => s.markUnread);
  const selectNextIn = useStrataStore((s) => s.selectNextIn);
  const selectPrevIn = useStrataStore((s) => s.selectPrevIn);
  const selectFirstIn = useStrataStore((s) => s.selectFirstIn);
  const selectLastIn = useStrataStore((s) => s.selectLastIn);
  const toggleSaved = useStrataStore((s) => s.toggleSaved);
  const toggleIgnored = useStrataStore((s) => s.toggleIgnored);
  const [pendingG, setPendingG] = useState<number | null>(null);

  const [previewHtml, setPreviewHtml] = useState("<p>Select an item to preview.</p>");
  const [previewSource, setPreviewSource] = useState("empty");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [playInlineVideo, setPlayInlineVideo] = useState(false);

  const filtered = useMemo(() => selectFilteredItems(), [items, searchQuery, activeView, activeFeedId, readIds, starredIds]);
  const selected = filtered.find((it) => it.id === selectedItemId) ?? filtered[0];
  const visibleIds = filtered.map((f) => f.id);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({ count: filtered.length, getScrollElement: () => parentRef.current, estimateSize: () => (compactMode ? 44 : 64), overscan: 8 });

  useEffect(() => {
    if (filtered.length > 0 && !selectedItemId) selectItem(filtered[0].id);
  }, [filtered, selectedItemId, selectItem]);

  useEffect(() => {
    let cancelled = false;
    if (!selected) {
      setPreviewHtml("<p>Select an item to preview.</p>");
      setPreviewSource("empty");
      setPlayInlineVideo(false);
      return;
    }
    setPlayInlineVideo(false);
    setPreviewLoading(true);
    void props.loadPreview(selected.url, selected.summary, selected.summary).then((result) => {
      if (cancelled) return;
      setPreviewHtml(result.html);
      setPreviewSource(result.source);
      setPreviewLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [props, selected]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      if (event.key === "j" || event.key === "n") {
        event.preventDefault();
        selectNextIn(visibleIds);
      } else if (event.key === "k" || event.key === "p") {
        event.preventDefault();
        selectPrevIn(visibleIds);
      } else if (event.key === "m" && selected) {
        event.preventDefault();
        if (readIds.has(selected.id)) markUnread(selected.id);
        else markRead(selected.id);
      } else if (event.key === "*") {
        event.preventDefault();
        props.onToggleStar();
      } else if (event.key === "/") {
        event.preventDefault();
        const el = document.getElementById("smd-search-input");
        if (el instanceof HTMLInputElement) el.focus();
      } else if (event.key === "o") {
        event.preventDefault();
        props.onOpenOriginal();
      } else if (event.key === "s") {
        event.preventDefault();
        void props.onSaveSelected();
      } else if (event.key === "g") {
        const now = Date.now();
        if (pendingG && now - pendingG < 500) {
          event.preventDefault();
          selectFirstIn(visibleIds);
          setPendingG(null);
        } else {
          setPendingG(now);
        }
      } else if (event.key === "G") {
        event.preventDefault();
        selectLastIn(visibleIds);
      } else if (event.key === "i" && selected) {
        event.preventDefault();
        toggleIgnored(selected.id);
      } else if (event.key === "S" && selected) {
        event.preventDefault();
        toggleSaved(selected.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [markRead, markUnread, pendingG, props, readIds, selectFirstIn, selectLastIn, selectNextIn, selectPrevIn, selected, toggleIgnored, toggleSaved, visibleIds]);

  return (
    <div style={{ display: "grid", gridTemplateRows: "36px 1fr", height: "100%", gap: 8, padding: 8 }}>
      <div className="smd-pane" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={toggleCompactMode}>{compactMode ? "Comfortable" : "Compact"}</button>
        <button onClick={toggleDistractionFree}>{distractionFree ? "Exit Focus" : "Focus Mode"}</button>
        <div style={{ marginLeft: "auto", color: "var(--text-muted)" }}>{isRefreshing ? "Refreshing..." : "Idle"} | {filtered.length} items</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: distractionFree ? "minmax(420px, 1fr)" : "260px minmax(360px, 1fr) minmax(420px, 1.1fr)", height: "100%", gap: 8 }}>
        {!distractionFree && (
          <aside className="smd-pane">
            <h3>Feeds</h3>
            <div style={{ marginBottom: 8, display: "grid", gap: 4 }}>
              <button onClick={() => setActiveView("all")} style={{ textAlign: "left", fontWeight: activeView === "all" ? 700 : 400 }}>All</button>
              <button onClick={() => setActiveView("unread")} style={{ textAlign: "left", fontWeight: activeView === "unread" ? 700 : 400 }}>Unread</button>
              <button onClick={() => setActiveView("starred")} style={{ textAlign: "left", fontWeight: activeView === "starred" ? 700 : 400 }}>Starred</button>
              <button onClick={() => setActiveView("videos")} style={{ textAlign: "left", fontWeight: activeView === "videos" ? 700 : 400 }}>Videos</button>
              <button onClick={() => setActiveView("articles")} style={{ textAlign: "left", fontWeight: activeView === "articles" ? 700 : 400 }}>Articles</button>
            </div>
            <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
              {feeds.map((f) => {
                const unread = items.filter((it) => it.feedId === f.id && !readIds.has(it.id)).length;
                return <button key={`btn-${f.id}`} onClick={() => setActiveFeedId(f.id)} style={{ textAlign: "left", fontWeight: activeFeedId === f.id ? 700 : 400 }}>{f.displayName} ({unread}){refreshingFeedIds.has(f.id) ? " ⟳" : ""}{feedErrors[f.id] ? " !" : ""}</button>;
              })}
              <button onClick={() => setActiveFeedId(null)} style={{ textAlign: "left" }}>Clear Feed Filter</button>
            </div>
          </aside>
        )}
        <main className="smd-pane">
          <input id="smd-search-input" placeholder="Search items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: "100%", marginBottom: 8 }} />
          <div ref={parentRef} style={{ overflowY: "auto", height: "calc(100% - 40px)" }}>
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const it = filtered[virtualRow.index];
                if (!it) return null;
                const isSelected = it.id === selected?.id;
                return <button key={it.id} style={{ position: "absolute", top: 0, left: 0, transform: `translateY(${virtualRow.start}px)`, height: `${virtualRow.size - 6}px`, display: "block", width: "100%", textAlign: "left", marginBottom: 6, border: isSelected ? "1px solid var(--interactive-accent)" : "1px solid var(--background-modifier-border)", background: isSelected ? "var(--background-secondary)" : "var(--background-primary)", fontWeight: readIds.has(it.id) ? 400 : 700 }} onClick={() => selectItem(it.id)}>{starredIds.has(it.id) ? "★ " : ""}{it.title}</button>;
              })}
            </div>
          </div>
        </main>
        {!distractionFree && (
          <section className="smd-pane">
            <h3>{selected?.title ?? "No item selected"}</h3>
            {selected && <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}><button onClick={() => void props.onSaveSelected()}>Save Note</button><button onClick={props.onOpenOriginal}>Open Original</button><button onClick={props.onToggleStar}>{starredIds.has(selected.id) ? "Unstar" : "Star"}</button><button onClick={props.onToggleRead}>{readIds.has(selected.id) ? "Mark Unread" : "Mark Read"}</button></div>}
            <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>{selected ? `${selected.mediaType.toUpperCase()} | ${new Date(selected.published).toLocaleString()} | ${previewSource}` : ""}</div>
            {selected?.mediaType === "video" && getYouTubeId(selected.url) ? (
              <div className="smd-preview">
                {!playInlineVideo ? (
                  <div>
                    {selected.thumbnailUrl ? <img src={selected.thumbnailUrl} alt={selected.title} style={{ width: "100%", maxHeight: 260, objectFit: "cover" }} /> : null}
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button onClick={() => setPlayInlineVideo(true)}>Play Inline</button>
                      <button onClick={props.onOpenOriginal}>Open in Browser</button>
                    </div>
                  </div>
                ) : (
                  <iframe
                    title={selected.title}
                    src={`https://www.youtube.com/embed/${getYouTubeId(selected.url)}`}
                    style={{ width: "100%", minHeight: 320, border: 0 }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                )}
              </div>
            ) : previewLoading ? <p>Loading preview...</p> : <div className="smd-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />}
          </section>
        )}
      </div>
    </div>
  );
}

function getYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.replace("/", "") || null;
    const v = parsed.searchParams.get("v");
    if (v) return v;
    const pathMatch = parsed.pathname.match(/\/embed\/([^/?]+)/i);
    if (pathMatch?.[1]) return pathMatch[1];
    return null;
  } catch {
    return null;
  }
}
