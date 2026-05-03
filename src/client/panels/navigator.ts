import { PipelineTree, PipelineTreeNode } from "../graph/neighborhood.js";

export interface NavigatorHandle {
  setActive: (pipelineId: string) => void;
}

export function initNavigator(
  container: HTMLElement,
  tree: PipelineTree,
  onSelect: (pipelineId: string) => void,
): NavigatorHandle {
  const searchInput = container.querySelector<HTMLInputElement>("#nav-search")!;
  const listEl = container.querySelector<HTMLElement>("#nav-list")!;

  function renderTree(filter: string): void {
    const lc = filter.toLowerCase();
    listEl.innerHTML = "";

    for (const root of tree.roots) {
      const group = renderGroup(root, lc, true);
      if (group) listEl.appendChild(group);
    }

    if (tree.orphans.length > 0) {
      const filtered = lc
        ? tree.orphans.filter((o) => matchesFilter(o, lc))
        : tree.orphans;
      if (filtered.length > 0) {
        const header = document.createElement("div");
        header.className = "nav-group-header";
        header.textContent = `Other (${filtered.length})`;
        header.classList.add("collapsed");
        header.addEventListener("click", () => {
          header.classList.toggle("collapsed");
          const list = header.nextElementSibling as HTMLElement;
          if (list) list.style.display = header.classList.contains("collapsed") ? "none" : "";
        });
        listEl.appendChild(header);

        const list = document.createElement("div");
        list.className = "nav-group-children";
        list.style.display = "none";
        for (const orphan of filtered) {
          appendItems(list, orphan, 0, lc);
        }
        listEl.appendChild(list);
      }
    }
  }

  function renderGroup(node: PipelineTreeNode, filter: string, startExpanded: boolean): HTMLElement | null {
    if (filter && !matchesFilter(node, filter)) return null;

    const wrapper = document.createElement("div");
    wrapper.className = "nav-group";

    const header = document.createElement("div");
    header.className = "nav-group-header";
    header.textContent = node.name;
    if (!startExpanded) header.classList.add("collapsed");
    header.addEventListener("click", (e) => {
      e.stopPropagation();
      header.classList.toggle("collapsed");
      const list = header.nextElementSibling as HTMLElement;
      if (list) list.style.display = header.classList.contains("collapsed") ? "none" : "";
    });

    const headerClick = document.createElement("span");
    headerClick.className = "nav-group-select";
    headerClick.textContent = "→";
    headerClick.title = "View this pipeline";
    headerClick.addEventListener("click", (e) => {
      e.stopPropagation();
      onSelect(node.id);
    });
    header.appendChild(headerClick);

    wrapper.appendChild(header);

    const childList = document.createElement("div");
    childList.className = "nav-group-children";
    if (!startExpanded) childList.style.display = "none";

    for (const child of node.children) {
      appendItems(childList, child, 0, filter);
    }

    wrapper.appendChild(childList);
    return wrapper;
  }

  function appendItems(parent: HTMLElement, node: PipelineTreeNode, depth: number, filter: string): void {
    if (filter && !matchesFilter(node, filter)) return;

    const item = document.createElement("div");
    item.className = "nav-item";
    item.dataset.id = node.id;
    item.style.paddingLeft = `${12 + depth * 14}px`;
    item.textContent = node.name;
    item.addEventListener("click", () => onSelect(node.id));
    parent.appendChild(item);

    for (const child of node.children) {
      appendItems(parent, child, depth + 1, filter);
    }
  }

  function matchesFilter(node: PipelineTreeNode, filter: string): boolean {
    if (node.name.toLowerCase().includes(filter)) return true;
    return node.children.some((c) => matchesFilter(c, filter));
  }

  searchInput.addEventListener("input", () => {
    renderTree(searchInput.value.trim());
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      searchInput.value = "";
      renderTree("");
    }
  });

  renderTree("");

  return {
    setActive(pipelineId: string) {
      container.querySelectorAll(".nav-item.active").forEach((el) => el.classList.remove("active"));
      const item = container.querySelector(`.nav-item[data-id="${CSS.escape(pipelineId)}"]`);
      if (item) {
        item.classList.add("active");
        item.scrollIntoView({ block: "nearest" });
      }
    },
  };
}
