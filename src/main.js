import { addDays, dueMeta, toISODate, uid } from "./lib/date.js";

const STORAGE_KEY = "flowboard-v1";
const COLUMN_DEFS = [
  { id: "todo", name: "To-do", status: "할일" },
  { id: "doing", name: "Doing", status: "진행 중" },
  { id: "done", name: "Done", status: "완료" },
];

function sampleState() {
  const t = new Date();
  return {
    columns: {
      todo: [
        { id: uid(), title: "아이디어 브레인스토밍", desc: "다음 스프린트 기능 목록 정리하기", due: toISODate(t) },
        { id: uid(), title: "디자인 시안 그리기", desc: "컬러 팔레트와 폰트 결정", due: toISODate(addDays(t, 3)) },
      ],
      doing: [
        { id: uid(), title: "드래그 앤 드롭 구현", desc: "포인터 이벤트로 모바일까지 지원", due: toISODate(addDays(t, 1)) },
        { id: uid(), title: "로그인 버그 수정", desc: "세션 만료 후 리다이렉트가 안 됨", due: toISODate(addDays(t, -2)) },
      ],
      done: [
        { id: uid(), title: "프로젝트 환경 셋업", desc: "배포 파이프라인 점검 완료", due: toISODate(addDays(t, -5)) },
      ],
    },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return sampleState();
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.columns) return sampleState();
    COLUMN_DEFS.forEach((c) => {
      if (!Array.isArray(parsed.columns[c.id])) parsed.columns[c.id] = [];
    });
    return parsed;
  } catch {
    return sampleState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota/availability errors */
  }
}

let state = loadState();
let currentFilter = "all";

const boardEl = document.getElementById("board");
const overlay = document.getElementById("overlay");
const form = document.getElementById("cardForm");
const modalTitle = document.getElementById("modalTitle");
const fTitle = document.getElementById("fTitle");
const fDesc = document.getElementById("fDesc");
const fDue = document.getElementById("fDue");
const deleteBtn = document.getElementById("deleteBtn");
const cancelBtn = document.getElementById("cancelBtn");
const filterTabs = document.getElementById("filterTabs");
const countAllEl = document.getElementById("countAll");
const countOverdueEl = document.getElementById("countOverdue");
const progressLabelEl = document.getElementById("progressLabel");
const progressFillEl = document.getElementById("progressFill");
const progressPctEl = document.getElementById("progressPct");
const hintLeftEl = document.getElementById("hintLeft");
const HINT_DEFAULT = "💡 카드를 드래그해 상태를 바꿔보세요";
const HINT_DRAGGING = "💡 원하는 칸에 놓으면 상태가 변경돼요";

let editing = null;

function resetArmedMenus() {
  document.querySelectorAll(".col-menu-item").forEach((item) => {
    item.dataset.armed = "0";
    item.textContent = "비우기";
    item.classList.remove("danger");
  });
}

function render() {
  boardEl.innerHTML = "";
  let totalCards = 0;
  let overdueTotal = 0;
  const doneCount = state.columns.done.length;

  COLUMN_DEFS.forEach((def) => {
    const arr = state.columns[def.id];
    totalCards += arr.length;
    arr.forEach((card) => {
      const m = dueMeta(card.due, def.id);
      if (m && m.cls === "overdue") overdueTotal++;
    });
  });

  countAllEl.textContent = totalCards;
  countOverdueEl.textContent = overdueTotal;
  const pct = totalCards ? Math.round((doneCount / totalCards) * 100) : 0;
  progressLabelEl.textContent = "완료 " + doneCount + "/" + totalCards;
  progressFillEl.style.width = pct + "%";
  progressPctEl.textContent = pct + "%";

  COLUMN_DEFS.forEach((def) => {
    const allCards = state.columns[def.id];
    const cards =
      currentFilter === "overdue"
        ? allCards.filter((c) => {
            const m = dueMeta(c.due, def.id);
            return m && m.cls === "overdue";
          })
        : allCards;

    const col = document.createElement("div");
    col.className = "column";
    col.dataset.col = def.id;

    const head = document.createElement("div");
    head.className = "column-head";

    const label = document.createElement("span");
    label.className = "label";
    const icon = document.createElement("span");
    icon.className = "col-icon " + def.id;
    if (def.id === "done") icon.textContent = "✓";
    label.appendChild(icon);
    const nameSpan = document.createElement("span");
    nameSpan.textContent = def.name;
    label.appendChild(nameSpan);
    const statusSpan = document.createElement("span");
    statusSpan.className = "col-status";
    statusSpan.textContent = def.status;
    label.appendChild(statusSpan);
    const countSpan = document.createElement("span");
    countSpan.className = "count";
    countSpan.textContent = allCards.length;
    label.appendChild(countSpan);
    head.appendChild(label);

    const menuWrap = document.createElement("div");
    menuWrap.className = "col-menu-wrap";
    const menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = "icon-btn small col-menu-btn";
    menuBtn.textContent = "⋯";
    menuBtn.setAttribute("aria-label", def.name + " 옵션");
    const menu = document.createElement("div");
    menu.className = "col-menu";
    menu.hidden = true;
    const clearItem = document.createElement("button");
    clearItem.type = "button";
    clearItem.className = "col-menu-item";
    clearItem.textContent = "비우기";
    clearItem.dataset.armed = "0";
    menu.appendChild(clearItem);
    menuWrap.appendChild(menuBtn);
    menuWrap.appendChild(menu);
    head.appendChild(menuWrap);

    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const wasHidden = menu.hidden;
      document.querySelectorAll(".col-menu").forEach((m) => { m.hidden = true; });
      resetArmedMenus();
      menu.hidden = !wasHidden;
    });
    clearItem.addEventListener("click", (e) => {
      e.stopPropagation();
      if (clearItem.dataset.armed === "0") {
        clearItem.dataset.armed = "1";
        clearItem.textContent = "정말 비우기?";
        clearItem.classList.add("danger");
        return;
      }
      state.columns[def.id] = [];
      saveState();
      render();
    });

    col.appendChild(head);

    const list = document.createElement("div");
    list.className = "cards-list";
    list.dataset.col = def.id;

    if (cards.length === 0) {
      const hint = document.createElement("div");
      hint.className = "empty-hint";
      hint.textContent = allCards.length === 0 ? "카드가 없어요. 아래에서 추가해보세요" : "조건에 맞는 카드가 없어요";
      list.appendChild(hint);
    }

    cards.forEach((card) => {
      const meta = dueMeta(card.due, def.id);

      const el = document.createElement("div");
      el.className = "card";
      el.dataset.id = card.id;

      const top = document.createElement("div");
      top.className = "card-top";
      const handle = document.createElement("span");
      handle.className = "handle";
      handle.textContent = "⠿";
      if (currentFilter === "all") {
        handle.addEventListener("pointerdown", onHandleDown);
      } else {
        handle.classList.add("disabled");
      }
      top.appendChild(handle);
      el.appendChild(top);

      const body = document.createElement("div");
      body.className = "card-body";
      const titleEl = document.createElement("div");
      titleEl.className = "card-title";
      titleEl.textContent = card.title;
      body.appendChild(titleEl);
      if (card.desc) {
        const descEl = document.createElement("p");
        descEl.className = "card-desc";
        descEl.textContent = card.desc;
        body.appendChild(descEl);
      }
      if (meta) {
        const pill = document.createElement("span");
        pill.className = "pill " + meta.cls;
        const iconChar = meta.cls === "overdue" ? "⚠ " : meta.cls === "done" ? "✓ " : "📅 ";
        pill.textContent = iconChar + meta.label;
        body.appendChild(pill);
      }
      body.addEventListener("click", () => openModal({ columnId: def.id, cardId: card.id }));
      el.appendChild(body);

      list.appendChild(el);
    });

    col.appendChild(list);

    if (def.id === "done") {
      const note = document.createElement("div");
      note.className = "done-note";
      note.innerHTML = "<strong>하나씩, 차근차근.</strong><span>완료한 일들이 이곳에 쌓여요.</span>";
      col.appendChild(note);
    }

    const addRow = document.createElement("button");
    addRow.type = "button";
    addRow.className = "add-row-btn";
    addRow.textContent = "+ 할일 추가";
    addRow.addEventListener("click", () => openModal({ columnId: def.id }));
    col.appendChild(addRow);

    boardEl.appendChild(col);
  });
}

function openModal(ctx) {
  editing = ctx;
  if (ctx.cardId) {
    const card = findCard(ctx.columnId, ctx.cardId);
    modalTitle.textContent = "카드 수정";
    fTitle.value = card.title;
    fDesc.value = card.desc || "";
    fDue.value = card.due || "";
    deleteBtn.hidden = false;
  } else {
    modalTitle.textContent = "카드 추가";
    fTitle.value = "";
    fDesc.value = "";
    fDue.value = "";
    deleteBtn.hidden = true;
  }
  overlay.hidden = false;
  setTimeout(() => fTitle.focus(), 0);
}

function closeModal() {
  overlay.hidden = true;
  editing = null;
}

function findCard(columnId, cardId) {
  return state.columns[columnId].find((c) => c.id === cardId);
}

fTitle.addEventListener("input", () => fTitle.setCustomValidity(""));

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!editing) return;
  const title = fTitle.value.trim();
  if (!title) {
    fTitle.setCustomValidity("제목을 입력해주세요");
    fTitle.reportValidity();
    fTitle.focus();
    return;
  }
  fTitle.setCustomValidity("");
  if (editing.cardId) {
    const card = findCard(editing.columnId, editing.cardId);
    card.title = title;
    card.desc = fDesc.value.trim();
    card.due = fDue.value || null;
  } else {
    state.columns[editing.columnId].push({
      id: uid(),
      title,
      desc: fDesc.value.trim(),
      due: fDue.value || null,
    });
  }
  saveState();
  render();
  closeModal();
});

deleteBtn.addEventListener("click", () => {
  if (!editing || !editing.cardId) return;
  const arr = state.columns[editing.columnId];
  const idx = arr.findIndex((c) => c.id === editing.cardId);
  if (idx > -1) arr.splice(idx, 1);
  saveState();
  render();
  closeModal();
});

cancelBtn.addEventListener("click", closeModal);
overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });

document.getElementById("newTaskBtn").addEventListener("click", () => openModal({ columnId: "todo" }));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlay.hidden) { closeModal(); return; }
  if ((e.key === "n" || e.key === "N") && overlay.hidden) {
    const t = document.activeElement;
    const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    if (!typing) { e.preventDefault(); openModal({ columnId: "todo" }); }
  }
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".col-menu-wrap")) {
    document.querySelectorAll(".col-menu").forEach((m) => { m.hidden = true; });
    resetArmedMenus();
  }
});

filterTabs.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    filterTabs.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });
});

// --- drag & drop: ghost slot + floating clone (mouse + touch via Pointer Events) ---
let drag = null;

function nextCardId(cardEl) {
  const next = cardEl.nextElementSibling;
  return next ? next.dataset.id : null;
}

function onHandleDown(e) {
  if (drag) return;
  const cardEl = e.currentTarget.closest(".card");
  if (!cardEl) return;
  e.preventDefault();
  const fromCol = cardEl.closest(".cards-list").dataset.col;
  const rect = cardEl.getBoundingClientRect();
  const resolvedAccent = getComputedStyle(cardEl).borderLeftColor;

  const wrap = document.createElement("div");
  wrap.className = "drag-ghost-wrap";
  const hintPill = document.createElement("div");
  hintPill.className = "drop-hint";
  hintPill.hidden = true;
  const cardBox = document.createElement("div");
  cardBox.className = "ghost-card-box";
  const clone = cardEl.cloneNode(true);
  clone.classList.add("ghost-card");
  clone.classList.remove("ghost-slot");
  clone.style.width = rect.width + "px";
  clone.style.borderLeftColor = resolvedAccent;
  const badge = document.createElement("div");
  badge.className = "moving-badge";
  badge.textContent = "이동 중";
  cardBox.appendChild(clone);
  cardBox.appendChild(badge);
  wrap.appendChild(hintPill);
  wrap.appendChild(cardBox);
  document.body.appendChild(wrap);

  function place(x, y) {
    wrap.style.left = x + 14 + "px";
    wrap.style.top = y + 10 + "px";
  }
  place(e.clientX, e.clientY);

  cardEl.classList.add("ghost-slot");

  drag = {
    pointerId: e.pointerId,
    cardId: cardEl.dataset.id,
    cardEl,
    wrap,
    hintPill,
    place,
    toCol: fromCol,
    insertBeforeId: nextCardId(cardEl),
    lastKey: null,
  };

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);
  hintLeftEl.textContent = HINT_DRAGGING;
}

function onPointerMove(e) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  drag.place(e.clientX, e.clientY);

  const target = document.elementFromPoint(e.clientX, e.clientY);
  if (!target) { drag.hintPill.hidden = true; return; }

  const colEl = target.closest(".column");
  document.querySelectorAll(".column.drop-target").forEach((c) => { if (c !== colEl) c.classList.remove("drop-target"); });

  if (!colEl) { drag.hintPill.hidden = true; return; }
  colEl.classList.add("drop-target");

  const colId = colEl.dataset.col;
  const listEl = colEl.querySelector(".cards-list");
  const siblingCard = target.closest(".card");

  if (siblingCard === drag.cardEl) {
    showHint(colId);
    return;
  }

  let insertBeforeEl = null;
  if (siblingCard && listEl.contains(siblingCard)) {
    const r = siblingCard.getBoundingClientRect();
    const before = e.clientY < r.top + r.height / 2;
    insertBeforeEl = before ? siblingCard : siblingCard.nextElementSibling;
  }

  const key = colId + "|" + (insertBeforeEl ? insertBeforeEl.dataset.id : "END");
  if (key !== drag.lastKey) {
    drag.lastKey = key;
    if (insertBeforeEl) listEl.insertBefore(drag.cardEl, insertBeforeEl);
    else listEl.appendChild(drag.cardEl);
    drag.toCol = colId;
    drag.insertBeforeId = insertBeforeEl ? insertBeforeEl.dataset.id : null;
  }
  showHint(colId);
}

function showHint(colId) {
  const msg = colId === "done" ? "완료돼요" : colId === "doing" ? "진행 중으로 이동돼요" : "할 일로 이동돼요";
  drag.hintPill.textContent = "여기에 놓으면 " + msg;
  drag.hintPill.hidden = false;
}

function onPointerUp(e) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  document.removeEventListener("pointermove", onPointerMove);
  document.removeEventListener("pointerup", onPointerUp);
  document.removeEventListener("pointercancel", onPointerUp);
  document.querySelectorAll(".column.drop-target").forEach((c) => c.classList.remove("drop-target"));
  drag.wrap.remove();

  moveCardCommit(drag.cardId, drag.toCol, drag.insertBeforeId);
  hintLeftEl.textContent = HINT_DEFAULT;
  drag = null;
}

function moveCardCommit(cardId, toCol, insertBeforeId) {
  let fromArr = null;
  let card = null;
  COLUMN_DEFS.forEach((def) => {
    const arr = state.columns[def.id];
    const idx = arr.findIndex((c) => c.id === cardId);
    if (idx > -1) { fromArr = arr; card = arr[idx]; }
  });
  if (!card) return;
  fromArr.splice(fromArr.indexOf(card), 1);
  const toArr = state.columns[toCol];
  let insertIdx = toArr.length;
  if (insertBeforeId) {
    const bIdx = toArr.findIndex((c) => c.id === insertBeforeId);
    if (bIdx > -1) insertIdx = bIdx;
  }
  toArr.splice(insertIdx, 0, card);
  saveState();
  render();
}

render();
