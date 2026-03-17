const CLOUD_ENDPOINT = 'https://jsonblob.com/api/jsonBlob/019cfbe9-709f-78bb-b41a-e30d7620c937';
const CLOUD_POLL_MS = 7000;
const CACHE_KEY = 'builder_archive_cache_v3';
const ADMIN_SESSION_KEY = 'builder_archive_admin_session';
const DEFAULT_ADMIN_PASSWORD_HASH = '9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0'; // 0000
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const DEFAULT_CATEGORIES = ['비트코인', '게임', '수업 보조', '학습 보조', '기타'];
const CATEGORY_MIGRATION = {
  '교사 보조 도구': '수업 보조',
  '수업 보조 도구': '수업 보조',
  '학습 도구': '학습 보조',
};

const defaultState = {
  meta: {
    adminPasswordHash: DEFAULT_ADMIN_PASSWORD_HASH,
    updatedAt: null,
  },
  categories: [...DEFAULT_CATEGORIES],
  content: {
    heroEyebrow: 'CLASSROOM-TESTED TOOL ARCHIVE',
    heroTitle: '현장에서 검증한 도구를 공개합니다|복잡한 설명보다 바로 쓸 수 있는 정보로 안내합니다|교육·투자·개발 관점을 연결합니다',
    heroCopy:
      '이곳은 교실에서 실제로 사용하고 개선한 도구를 모아 둔 공개 아카이브입니다. 방문자께서 목적에 맞는 도구를 빠르게 찾고 바로 활용하실 수 있도록 구성했습니다.',
    profileTitle: 'Builder Archive',
    profileRole: '초등 5학년 담임 · 투자 학습자 · 도구 개발자',
    profileSummary:
      '학습 효율과 실행 가능성을 기준으로 프로젝트를 설계하고 개선합니다. 각 카드에서 문제, 사용 대상, 활용 맥락을 한눈에 확인하실 수 있습니다.',
    aboutTitle: '방문자 중심 운영 원칙',
    aboutBody1:
      '프로젝트는 기능 나열보다 실제 사용 맥락을 중심으로 안내합니다. 무엇을 해결하는지, 어떤 상황에서 효과적인지, 바로 판단하실 수 있게 정리했습니다.',
    aboutBody2:
      '교육 실천, 도구 개발, 투자 실험으로 분류해 탐색 동선을 단순하게 유지합니다. 필요한 항목을 찾은 뒤 바로 접속하실 수 있도록 링크 중심 구조를 적용했습니다.',
    aboutQuote: '필요한 정보는 빠르게, 실행은 더 쉽게.',
    collectionTitle: 'Project Collection',
    footerNote: '© 2026 Builder Archive · 교육/투자/도구개발 공개 아카이브',
  },
  projects: [],
};

let state = deepClone(defaultState);
let activeCategory = '전체';
let searchTerm = '';
let publicEventsBound = false;
let modalEventsBound = false;
let adminActionsBound = false;
let isSavingToCloud = false;
let lastSeenUpdatedAt = null;

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getEl(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function migrateCategoryName(category) {
  const raw = String(category || '').trim();
  if (!raw) return '기타';
  return CATEGORY_MIGRATION[raw] || raw;
}

function setAdminStatus(text) {
  const statusEl = getEl('admin-status');
  if (statusEl) statusEl.textContent = text;
}

function hasCoreShape(candidate) {
  return Boolean(candidate && candidate.content && Array.isArray(candidate.projects));
}

function normalizeCategoryName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeCategoryList(values) {
  const unique = [];
  const seen = new Set();
  (Array.isArray(values) ? values : []).forEach((value) => {
    const name = normalizeCategoryName(value);
    if (!name || seen.has(name)) return;
    seen.add(name);
    unique.push(name);
  });
  return unique;
}

function normalizeState(input) {
  if (!hasCoreShape(input)) return deepClone(defaultState);

  const next = deepClone(defaultState);
  next.categories = normalizeCategoryList(input.categories);
  if (!next.categories.length) next.categories = [...DEFAULT_CATEGORIES];

  const categorySet = new Set(next.categories);
  const fallbackCategory = next.categories[0];
  next.content = { ...next.content, ...(input.content || {}) };
  next.projects = Array.isArray(input.projects)
    ? input.projects.map((project) => {
        const migratedCategory = normalizeCategoryName(migrateCategoryName(project.category)) || fallbackCategory;
        if (!categorySet.has(migratedCategory)) {
          categorySet.add(migratedCategory);
          next.categories.push(migratedCategory);
        }
        return {
          id: Number(project.id) || 0,
          category: migratedCategory,
          title: String(project.title || ''),
          description: String(project.description || ''),
          tags: Array.isArray(project.tags) ? project.tags.map((tag) => String(tag)) : [],
          link: String(project.link || ''),
          downloadDataUrl: String(project.downloadDataUrl || ''),
          downloadName: String(project.downloadName || ''),
        };
      })
    : [];
  next.meta = {
    adminPasswordHash: String(input.meta?.adminPasswordHash || DEFAULT_ADMIN_PASSWORD_HASH),
    updatedAt: input.meta?.updatedAt ? String(input.meta.updatedAt) : null,
  };
  return next;
}

function saveCache() {
  localStorage.setItem(CACHE_KEY, JSON.stringify(state));
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return normalizeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function getCurrentAdminHash() {
  return state.meta?.adminPasswordHash || DEFAULT_ADMIN_PASSWORD_HASH;
}

function getManagedCategories() {
  const normalized = normalizeCategoryList(state.categories);
  if (!normalized.length) return [...DEFAULT_CATEGORIES];
  return normalized;
}

function touchLocalState() {
  state.meta.updatedAt = new Date().toISOString();
  lastSeenUpdatedAt = state.meta.updatedAt;
  saveCache();
}

function toMillis(isoText) {
  const value = Date.parse(isoText || '');
  return Number.isFinite(value) ? value : 0;
}

async function sha256(text) {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function isAdminDrawerOpen() {
  const drawer = getEl('admin-drawer');
  return Boolean(drawer && !drawer.classList.contains('hidden'));
}

async function fetchCloudState() {
  const response = await fetch(CLOUD_ENDPOINT, { cache: 'no-store' });
  if (!response.ok) throw new Error(`클라우드 조회 실패 (${response.status})`);
  const parsed = await response.json();
  return normalizeState(parsed);
}

async function saveCloudState(successMessage) {
  isSavingToCloud = true;
  try {
    const next = deepClone(state);
    next.meta.updatedAt = new Date().toISOString();

    const response = await fetch(CLOUD_ENDPOINT, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(next),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`클라우드 저장 실패 (${response.status}): ${body.slice(0, 180)}`);
    }

    state = next;
    lastSeenUpdatedAt = next.meta.updatedAt;
    saveCache();
    if (successMessage) setAdminStatus(successMessage);
    return true;
  } catch (error) {
    setAdminStatus(error.message);
    return false;
  } finally {
    isSavingToCloud = false;
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('파일 읽기에 실패했습니다.'));
    reader.readAsDataURL(file);
  });
}

function resolveDownloadUrl(project) {
  return project.downloadDataUrl || '#';
}

function renderPublicPage() {
  const heroEyebrow = getEl('hero-eyebrow');
  if (!heroEyebrow) return;

  const content = state.content;
  heroEyebrow.textContent = content.heroEyebrow;
  getEl('hero-title').innerHTML = content.heroTitle
    .split('|')
    .map((line, index) => (index === 1 ? `<span>${escapeHtml(line)}</span>` : escapeHtml(line)))
    .join('<br />');
  getEl('hero-copy').textContent = content.heroCopy;
  getEl('profile-initial').textContent = (content.profileTitle || 'B').charAt(0).toUpperCase();
  getEl('profile-title').textContent = content.profileTitle;
  getEl('profile-role').textContent = content.profileRole;
  getEl('profile-summary').textContent = content.profileSummary;
  getEl('about-title').textContent = content.aboutTitle;
  getEl('about-body-1').textContent = content.aboutBody1;
  getEl('about-body-2').textContent = content.aboutBody2;
  getEl('about-quote').textContent = content.aboutQuote;
  getEl('collection-title').textContent = content.collectionTitle;
  getEl('footer-note').textContent = content.footerNote;

  setupPublicProjects();
}

function getCategories() {
  return ['전체', ...getManagedCategories()];
}

function ensureActiveCategoryValid() {
  const categories = getCategories();
  if (categories.includes(activeCategory)) return false;
  activeCategory = '전체';
  return true;
}

function filteredProjects() {
  ensureActiveCategoryValid();
  const keyword = searchTerm.trim().toLowerCase();
  return state.projects.filter((project) => {
    const categoryPass = activeCategory === '전체' || project.category === activeCategory;
    if (!categoryPass) return false;
    if (!keyword) return true;
    const target = [project.title, project.description, project.tags.join(' ')].join(' ').toLowerCase();
    return target.includes(keyword);
  });
}

function renderFilterButtons() {
  const filterWrap = getEl('filter-wrap');
  if (!filterWrap) return;

  const categories = getCategories();
  if (!categories.includes(activeCategory)) activeCategory = '전체';

  filterWrap.innerHTML = categories
    .map((category) => {
      const activeClass = category === activeCategory ? 'active' : '';
      return `<button class="filter-btn ${activeClass}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`;
    })
    .join('');

  filterWrap.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      activeCategory = button.dataset.category;
      renderFilterButtons();
      renderProjects();
    });
  });
}

function renderProjects() {
  const grid = getEl('project-grid');
  const count = getEl('project-count');
  if (!grid || !count) return;
  const didResetCategory = ensureActiveCategoryValid();
  if (didResetCategory) renderFilterButtons();

  let list = filteredProjects();
  if (!list.length && state.projects.length && !searchTerm.trim()) {
    const hasCategoryMatch = activeCategory === '전체' || state.projects.some((project) => project.category === activeCategory);
    if (!hasCategoryMatch) {
      activeCategory = '전체';
      renderFilterButtons();
      list = [...state.projects];
    }
  }
  count.textContent = `총 ${state.projects.length}개 중 ${list.length}개 표시`;

  if (!state.projects.length) {
    grid.innerHTML = '<p class="empty-state">아직 공개된 프로젝트가 없습니다.</p>';
    return;
  }

  if (!list.length) {
    grid.innerHTML = '<p class="empty-state">조건에 맞는 프로젝트가 없습니다.</p>';
    return;
  }

  grid.innerHTML = list
    .map((project) => {
      const fileBadge = project.downloadDataUrl ? '<span class="tag">첨부파일</span>' : '';
      return `
        <article class="project-card" data-id="${project.id}">
          <span class="category">${escapeHtml(project.category)}</span>
          <h3>${escapeHtml(project.title)}</h3>
          <p>${escapeHtml(project.description)}</p>
          <div class="tag-list">
            ${project.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            ${fileBadge}
          </div>
        </article>
      `;
    })
    .join('');

}

function setupPublicProjects() {
  const searchInput = getEl('search-input');
  const grid = getEl('project-grid');
  if (!searchInput || !grid) return;

  if (!publicEventsBound) {
    searchInput.addEventListener('input', (event) => {
      searchTerm = event.target.value;
      renderProjects();
    });
    grid.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const card = target.closest('.project-card');
      if (!card) return;
      const id = Number(card.dataset.id);
      if (!Number.isFinite(id)) return;
      openProjectModal(id);
    });
    publicEventsBound = true;
  }

  renderFilterButtons();
  renderProjects();
  setupProjectModal();
}

function setupProjectModal() {
  const modal = getEl('project-modal');
  const modalCard = getEl('modal-card');
  const closeBtn = getEl('modal-close');
  if (!modal || !modalCard || !closeBtn || modalEventsBound) return;

  closeBtn.addEventListener('click', () => {
    if (modal.open) modal.close();
  });

  modal.addEventListener('click', (event) => {
    const bounds = modalCard.getBoundingClientRect();
    const isOutside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;
    if (isOutside && modal.open) modal.close();
  });

  modalEventsBound = true;
}

function openProjectModal(id) {
  const modal = getEl('project-modal');
  if (!modal) return;

  const project = state.projects.find((item) => item.id === id);
  if (!project) return;

  const linkEl = getEl('modal-link');
  const fileEl = getEl('modal-file-link');

  getEl('modal-category').textContent = project.category;
  getEl('modal-title').textContent = project.title;
  getEl('modal-desc').textContent = project.description;
  getEl('modal-tags').innerHTML = project.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');

  if (project.link) {
    linkEl.href = project.link;
    linkEl.classList.remove('hidden');
  } else {
    linkEl.classList.add('hidden');
  }

  if (project.downloadDataUrl) {
    fileEl.href = resolveDownloadUrl(project);
    fileEl.download = project.downloadName || '';
    fileEl.classList.remove('hidden');
  } else {
    fileEl.href = '#';
    fileEl.download = '';
    fileEl.classList.add('hidden');
  }

  if (typeof modal.showModal === 'function') modal.showModal();
}

function fillAdminContentForm() {
  const anchor = getEl('f-hero-eyebrow');
  if (!anchor) return;

  const c = state.content;
  anchor.value = c.heroEyebrow;
  getEl('f-hero-title').value = c.heroTitle;
  getEl('f-hero-copy').value = c.heroCopy;
  getEl('f-profile-title').value = c.profileTitle;
  getEl('f-profile-role').value = c.profileRole;
  getEl('f-profile-summary').value = c.profileSummary;
  getEl('f-about-title').value = c.aboutTitle;
  getEl('f-about-body-1').value = c.aboutBody1;
  getEl('f-about-body-2').value = c.aboutBody2;
  getEl('f-about-quote').value = c.aboutQuote;
  getEl('f-collection-title').value = c.collectionTitle;
  getEl('f-footer-note').value = c.footerNote;
}

function renderAdminCategorySelect(selected = '') {
  const select = getEl('p-category');
  if (!select) return;

  const categories = getManagedCategories();
  select.innerHTML = [
    '<option value="">선택</option>',
    ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`),
  ].join('');

  if (selected && categories.includes(selected)) {
    select.value = selected;
  } else {
    select.value = '';
  }
}

function renderCategoryAdminList() {
  const wrap = getEl('category-admin-list');
  if (!wrap) return;

  const categories = getManagedCategories();
  if (!categories.length) {
    wrap.innerHTML = '<p class="admin-tip">등록된 카테고리가 없습니다.</p>';
    return;
  }

  wrap.innerHTML = categories
    .map(
      (category) => `
        <div class="category-admin-item" data-category="${escapeHtml(category)}">
          <input type="text" value="${escapeHtml(category)}" />
          <div class="mini">
            <button type="button" data-action="rename">이름변경</button>
            <button type="button" data-action="delete">삭제</button>
          </div>
        </div>
      `
    )
    .join('');

  wrap.querySelectorAll('.category-admin-item').forEach((row) => {
    const sourceCategory = String(row.dataset.category || '');
    const input = row.querySelector('input');

    row.querySelector('[data-action="rename"]')?.addEventListener('click', async () => {
      await renameCategoryFromAdmin(sourceCategory, input?.value || '');
    });

    row.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
      await deleteCategoryFromAdmin(sourceCategory);
    });
  });
}

async function addCategoryFromAdmin() {
  const input = getEl('cat-new-name');
  if (!input) return;

  const name = normalizeCategoryName(input.value);
  if (!name) {
    alert('추가할 카테고리명을 입력해 주세요.');
    return;
  }

  const categories = getManagedCategories();
  if (categories.includes(name)) {
    alert('이미 존재하는 카테고리입니다.');
    return;
  }

  state.categories = [...categories, name];
  touchLocalState();
  input.value = '';
  renderAdminCategorySelect(name);
  renderCategoryAdminList();
  renderFilterButtons();
  renderProjects();
  await saveCloudState('카테고리가 추가되었습니다.');
}

async function renameCategoryFromAdmin(sourceCategory, nextCategory) {
  const before = normalizeCategoryName(sourceCategory);
  const after = normalizeCategoryName(nextCategory);
  const categories = getManagedCategories();

  if (!before || !categories.includes(before)) return;
  if (!after) {
    alert('변경할 카테고리명을 입력해 주세요.');
    return;
  }
  if (before === after) return;
  if (categories.includes(after)) {
    alert('같은 이름의 카테고리가 이미 있습니다.');
    return;
  }

  state.categories = categories.map((category) => (category === before ? after : category));
  state.projects = state.projects.map((project) =>
    project.category === before ? { ...project, category: after } : project
  );
  if (activeCategory === before) activeCategory = after;

  touchLocalState();
  renderAdminCategorySelect(after);
  renderCategoryAdminList();
  renderProjectAdminList();
  renderFilterButtons();
  renderProjects();
  await saveCloudState('카테고리 이름이 변경되었습니다.');
}

async function deleteCategoryFromAdmin(categoryName) {
  const source = normalizeCategoryName(categoryName);
  const categories = getManagedCategories();
  if (!source || !categories.includes(source)) return;
  if (categories.length <= 1) {
    alert('카테고리는 최소 1개 이상 유지되어야 합니다.');
    return;
  }

  const targets = categories.filter((category) => category !== source);
  const linkedCount = state.projects.filter((project) => project.category === source).length;
  let moveTarget = targets[0];

  if (linkedCount > 0) {
    const typed = prompt(
      `'${source}' 카테고리의 프로젝트 ${linkedCount}개를 이동할 카테고리명을 입력해 주세요.\n가능 값: ${targets.join(', ')}`,
      moveTarget
    );
    if (!typed) return;
    moveTarget = normalizeCategoryName(typed);
    if (!targets.includes(moveTarget)) {
      alert('이동 대상 카테고리명이 올바르지 않습니다.');
      return;
    }
  }

  const confirmed = confirm(
    linkedCount > 0
      ? `'${source}' 카테고리를 삭제합니다.\n프로젝트 ${linkedCount}개는 '${moveTarget}'로 이동됩니다. 계속하시겠습니까?`
      : `'${source}' 카테고리를 삭제하시겠습니까?`
  );
  if (!confirmed) return;

  state.categories = categories.filter((category) => category !== source);
  if (linkedCount > 0) {
    state.projects = state.projects.map((project) =>
      project.category === source ? { ...project, category: moveTarget } : project
    );
  }
  if (activeCategory === source) activeCategory = '전체';

  touchLocalState();
  renderAdminCategorySelect();
  renderCategoryAdminList();
  renderProjectAdminList();
  renderFilterButtons();
  renderProjects();
  await saveCloudState('카테고리가 삭제되었습니다.');
}

function clearProjectForm() {
  if (!getEl('p-id')) return;
  getEl('p-id').value = '';
  renderAdminCategorySelect();
  getEl('p-title').value = '';
  getEl('p-description').value = '';
  getEl('p-tags').value = '';
  getEl('p-link').value = '';
  getEl('p-file').value = '';
}

function renderProjectAdminList() {
  const list = getEl('project-list');
  if (!list) return;

  if (!state.projects.length) {
    list.innerHTML = '<p class="admin-tip">등록된 프로젝트가 없습니다.</p>';
    return;
  }

  list.innerHTML = state.projects
    .map(
      (project) => `
        <div class="project-admin-item" data-id="${project.id}">
          <p>[${escapeHtml(project.category)}] ${escapeHtml(project.title)}</p>
          <div class="mini">
            <button type="button" data-action="edit">수정</button>
            <button type="button" data-action="delete">삭제</button>
          </div>
        </div>
      `
    )
    .join('');

  list.querySelectorAll('.project-admin-item').forEach((row) => {
    const id = Number(row.dataset.id);

    row.querySelector('[data-action="edit"]').addEventListener('click', () => {
      const project = state.projects.find((item) => item.id === id);
      if (!project) return;
      getEl('p-id').value = String(project.id);
      renderAdminCategorySelect(project.category);
      getEl('p-title').value = project.title;
      getEl('p-description').value = project.description;
      getEl('p-tags').value = project.tags.join(', ');
      getEl('p-link').value = project.link || '';
      getEl('p-file').value = '';
    });

    row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm('이 프로젝트를 삭제하시겠습니까?')) return;
      state.projects = state.projects.filter((item) => item.id !== id);
      touchLocalState();
      renderProjectAdminList();
      renderPublicPage();
      await saveCloudState('프로젝트가 삭제되었습니다.');
    });
  });
}

async function saveContentFromAdmin() {
  state.content = {
    heroEyebrow: getEl('f-hero-eyebrow').value.trim(),
    heroTitle: getEl('f-hero-title').value.trim(),
    heroCopy: getEl('f-hero-copy').value.trim(),
    profileTitle: getEl('f-profile-title').value.trim(),
    profileRole: getEl('f-profile-role').value.trim(),
    profileSummary: getEl('f-profile-summary').value.trim(),
    aboutTitle: getEl('f-about-title').value.trim(),
    aboutBody1: getEl('f-about-body-1').value.trim(),
    aboutBody2: getEl('f-about-body-2').value.trim(),
    aboutQuote: getEl('f-about-quote').value.trim(),
    collectionTitle: getEl('f-collection-title').value.trim(),
    footerNote: getEl('f-footer-note').value.trim(),
  };

  touchLocalState();
  renderPublicPage();
  await saveCloudState('문구가 저장되었습니다.');
}

async function saveProjectFromAdmin() {
  const managedCategories = getManagedCategories();
  const category = getEl('p-category').value.trim();
  const title = getEl('p-title').value.trim();
  const description = getEl('p-description').value.trim();
  const link = getEl('p-link').value.trim();
  const file = getEl('p-file').files?.[0] || null;
  const tags = getEl('p-tags')
    .value.split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (!category || !title || !description) {
    alert('카테고리, 제목, 설명은 필수입니다.');
    return;
  }
  if (!managedCategories.includes(category)) {
    alert('카테고리를 올바르게 선택해 주세요.');
    return;
  }

  let downloadDataUrl = '';
  let downloadName = '';
  const editingId = Number(getEl('p-id').value || '0');

  if (editingId) {
    const existing = state.projects.find((item) => item.id === editingId);
    if (existing) {
      downloadDataUrl = existing.downloadDataUrl || '';
      downloadName = existing.downloadName || '';
    }
  }

  if (file) {
    if (file.size > MAX_UPLOAD_BYTES) {
      alert('첨부 파일은 2MB 이하로 업로드해 주세요.');
      return;
    }
    try {
      downloadDataUrl = await fileToDataUrl(file);
      downloadName = file.name;
    } catch (error) {
      alert(error.message);
      return;
    }
  }

  if (editingId) {
    const idx = state.projects.findIndex((item) => item.id === editingId);
    if (idx > -1) {
      state.projects[idx] = {
        ...state.projects[idx],
        category,
        title,
        description,
        tags,
        link,
        downloadDataUrl,
        downloadName,
      };
    }
  } else {
    const nextId = state.projects.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    state.projects.unshift({
      id: nextId,
      category,
      title,
      description,
      tags,
      link,
      downloadDataUrl,
      downloadName,
    });
  }

  touchLocalState();
  clearProjectForm();
  renderProjectAdminList();
  renderPublicPage();
  await saveCloudState('프로젝트가 저장되었습니다.');
}

function importStateJson(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const parsed = normalizeState(JSON.parse(String(reader.result)));
      state = parsed;
      touchLocalState();
      renderPublicPage();
      fillAdminContentForm();
      renderAdminCategorySelect();
      renderCategoryAdminList();
      renderProjectAdminList();
      await saveCloudState('JSON을 불러와 반영했습니다.');
    } catch {
      alert('JSON 파싱에 실패했습니다.');
    }
  };
  reader.readAsText(file);
}

function setupAdminActions() {
  if (adminActionsBound || !getEl('content-save')) return;

  getEl('content-save').addEventListener('click', () => {
    saveContentFromAdmin();
  });
  getEl('project-save')?.addEventListener('click', () => {
    saveProjectFromAdmin();
  });
  getEl('project-clear')?.addEventListener('click', clearProjectForm);
  getEl('cat-add')?.addEventListener('click', () => {
    addCategoryFromAdmin();
  });
  getEl('cat-new-name')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addCategoryFromAdmin();
  });

  getEl('import-json')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    importStateJson(file);
    event.target.value = '';
  });

  getEl('reset-data')?.addEventListener('click', async () => {
    if (!confirm('초기 데이터로 복원하시겠습니까?')) return;
    const currentHash = getCurrentAdminHash();
    state = deepClone(defaultState);
    state.meta.adminPasswordHash = currentHash;
    touchLocalState();
    renderPublicPage();
    fillAdminContentForm();
    renderAdminCategorySelect();
    renderCategoryAdminList();
    renderProjectAdminList();
    await saveCloudState('초기 데이터로 복원되었습니다.');
  });

  getEl('pwd-save')?.addEventListener('click', async () => {
    const current = getEl('pwd-current').value.trim();
    const next = getEl('pwd-new').value.trim();
    const confirmText = getEl('pwd-confirm').value.trim();

    if (!current || !next || !confirmText) {
      alert('현재/새 비밀번호를 모두 입력해 주세요.');
      return;
    }

    const currentHash = await sha256(current);
    if (currentHash !== getCurrentAdminHash()) {
      alert('현재 비밀번호가 올바르지 않습니다.');
      return;
    }

    if (next.length < 4) {
      alert('새 비밀번호는 4자 이상으로 설정해 주세요.');
      return;
    }

    if (next !== confirmText) {
      alert('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    state.meta.adminPasswordHash = await sha256(next);
    touchLocalState();
    getEl('pwd-current').value = '';
    getEl('pwd-new').value = '';
    getEl('pwd-confirm').value = '';
    await saveCloudState('비밀번호가 변경되었습니다.');
    alert('비밀번호가 변경되었습니다.');
  });

  adminActionsBound = true;
}

function openInlineAdminDrawer() {
  const drawer = getEl('admin-drawer');
  if (!drawer) return;
  fillAdminContentForm();
  renderAdminCategorySelect();
  renderCategoryAdminList();
  renderProjectAdminList();
  setupAdminActions();
  drawer.classList.remove('hidden');
  drawer.setAttribute('aria-hidden', 'false');
}

function closeInlineAdminDrawer() {
  const drawer = getEl('admin-drawer');
  if (!drawer) return;
  drawer.classList.add('hidden');
  drawer.setAttribute('aria-hidden', 'true');
}

function setupInlineAdmin() {
  const fab = getEl('admin-fab');
  const drawer = getEl('admin-drawer');
  const closeBtn = getEl('admin-close');
  if (!fab || !drawer || !closeBtn) return;

  fab.addEventListener('click', async () => {
    if (sessionStorage.getItem(ADMIN_SESSION_KEY) === 'ok') {
      openInlineAdminDrawer();
      return;
    }

    const typed = prompt('관리자 비밀번호를 입력해 주세요. (초기 비밀번호: 0000)');
    if (!typed) return;

    const hashed = await sha256(typed.trim());
    if (hashed !== getCurrentAdminHash()) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    sessionStorage.setItem(ADMIN_SESSION_KEY, 'ok');
    openInlineAdminDrawer();
  });

  closeBtn.addEventListener('click', closeInlineAdminDrawer);
}

async function syncFromCloudIfNeeded() {
  const modal = getEl('project-modal');
  const isModalOpen = Boolean(modal && modal.open);
  if (isSavingToCloud || isAdminDrawerOpen() || isModalOpen) return;

  try {
    const remote = await fetchCloudState();
    const remoteUpdatedAt = remote.meta?.updatedAt || null;
    if (!remoteUpdatedAt) return;
    if (remote.projects.length === 0 && state.projects.length > 0) return;
    const remoteTs = toMillis(remoteUpdatedAt);
    const localTs = toMillis(lastSeenUpdatedAt);
    if (remoteTs <= localTs) return;

    state = remote;
    lastSeenUpdatedAt = remoteUpdatedAt;
    saveCache();
    renderPublicPage();
  } catch {
    // Ignore polling errors silently
  }
}

function startCloudPolling() {
  setInterval(() => {
    syncFromCloudIfNeeded();
  }, CLOUD_POLL_MS);
}

async function initializeState() {
  const cached = loadCache();
  try {
    const remote = normalizeState(await fetchCloudState());
    const remoteTs = toMillis(remote.meta?.updatedAt);
    const cacheTs = toMillis(cached?.meta?.updatedAt);

    if (cached && cacheTs > remoteTs) {
      state = cached;
      lastSeenUpdatedAt = state.meta?.updatedAt || null;
      // 로컬 최신본을 클라우드에 재반영 시도 (실패해도 로컬 유지)
      await saveCloudState();
      return;
    }

    // 원격이 비어 있고 로컬 캐시에 데이터가 있으면 캐시 우선 복구
    if (cached && remote.projects.length === 0 && cached.projects.length > 0) {
      state = cached;
      lastSeenUpdatedAt = state.meta?.updatedAt || null;
      await saveCloudState();
      return;
    }

    state = remote;
    lastSeenUpdatedAt = state.meta?.updatedAt || null;
    saveCache();

    // 최초/손상 데이터로 updatedAt이 없는 경우 기준 상태를 재기록합니다.
    if (!lastSeenUpdatedAt) {
      await saveCloudState();
    }
  } catch {
    if (cached) {
      state = cached;
      lastSeenUpdatedAt = state.meta?.updatedAt || null;
      return;
    }

    state = deepClone(defaultState);
    touchLocalState();
    // 네트워크 오류 시 원격을 기본값으로 덮어쓰지 않음
  }
}

async function main() {
  await initializeState();
  renderPublicPage();
  setupInlineAdmin();
  startCloudPolling();
}

main();
