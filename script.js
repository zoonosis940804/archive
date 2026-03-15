const ADMIN_SESSION_KEY = 'builder_archive_admin_session';
const ADMIN_PASSWORD_HASH_KEY = 'builder_archive_admin_password_hash';
const DEFAULT_ADMIN_PASSWORD_HASH = 'ee315c20b11c393aa0ced4107650acd106bf6a2c414c9e59b34fbe53af99a988';
const DRAFT_KEY = 'builder_archive_admin_draft_v1';
const DATA_FILE_PATH = './data.json';

const defaultState = {
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
    blueprintTitle: '사이트 운영 기준',
    blueprintSubtitle: '방문자 경험을 우선하기 위한 핵심 기준',
    footerNote: '© 2026 Builder Archive · 교육/투자/도구개발 공개 아카이브',
  },
  blueprints: [
    {
      title: '1) 문제 먼저 안내',
      description: '각 프로젝트는 무엇을 해결하는 도구인지부터 명확하게 보여드립니다.',
    },
    {
      title: '2) 즉시 활용 가능',
      description: '탐색 후 바로 실행하실 수 있도록 링크와 핵심 정보 중심으로 구성합니다.',
    },
    {
      title: '3) 검증 기반 업데이트',
      description: '현장 적용 결과와 피드백을 반영해 지속적으로 내용을 개선합니다.',
    },
    {
      title: '4) 탐색 동선 단순화',
      description: '카테고리와 검색 기능으로 필요한 프로젝트를 빠르게 찾으실 수 있습니다.',
    },
    {
      title: '5) 과장 없는 설명',
      description: '실제로 확인 가능한 정보만 정리해 신뢰도 높은 아카이브를 유지합니다.',
    },
  ],
  projects: [],
};

let state = deepClone(defaultState);
let activeCategory = '전체';
let searchTerm = '';

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function isValidState(parsed) {
  return Boolean(parsed && parsed.content && Array.isArray(parsed.projects) && Array.isArray(parsed.blueprints));
}

async function loadDataFileState() {
  try {
    const response = await fetch(DATA_FILE_PATH, { cache: 'no-store' });
    if (!response.ok) return deepClone(defaultState);
    const parsed = await response.json();
    if (!isValidState(parsed)) return deepClone(defaultState);
    return parsed;
  } catch {
    return deepClone(defaultState);
  }
}

function getAdminPasswordHash() {
  return localStorage.getItem(ADMIN_PASSWORD_HASH_KEY) || DEFAULT_ADMIN_PASSWORD_HASH;
}

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getEl(id) {
  return document.getElementById(id);
}

function renderPublicPage() {
  const heroEyebrow = getEl('hero-eyebrow');
  if (!heroEyebrow) return;

  const content = state.content;

  heroEyebrow.textContent = content.heroEyebrow;
  const heroTitle = getEl('hero-title');
  heroTitle.innerHTML = content.heroTitle
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
  getEl('blueprint-title').textContent = content.blueprintTitle;
  getEl('blueprint-subtitle').textContent = content.blueprintSubtitle;
  getEl('footer-note').textContent = content.footerNote;

  getEl('blueprint-grid').innerHTML = state.blueprints
    .map(
      (item) => `
        <article>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </article>
      `
    )
    .join('');

  setupPublicProjects();
}

function getCategories() {
  return ['전체', ...new Set(state.projects.map((item) => item.category))];
}

function filteredProjects() {
  const keyword = searchTerm.trim().toLowerCase();

  return state.projects.filter((project) => {
    const categoryPass = activeCategory === '전체' || project.category === activeCategory;
    if (!categoryPass) return false;
    if (!keyword) return true;

    const target = [project.title, project.description, project.tags.join(' ')].join(' ').toLowerCase();
    return target.includes(keyword);
  });
}

function setupPublicProjects() {
  const searchInput = getEl('search-input');
  const filterWrap = getEl('filter-wrap');
  const projectGrid = getEl('project-grid');
  const projectCount = getEl('project-count');

  if (!searchInput || !filterWrap || !projectGrid || !projectCount) return;

  function renderFilterButtons() {
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
    const list = filteredProjects();
    projectCount.textContent = `총 ${state.projects.length}개 중 ${list.length}개 표시`;

    if (!state.projects.length) {
      projectGrid.innerHTML = '<p class="empty-state">아직 공개된 프로젝트가 없습니다.</p>';
      return;
    }

    if (!list.length) {
      projectGrid.innerHTML = '<p class="empty-state">조건에 맞는 프로젝트가 없습니다.</p>';
      return;
    }

    projectGrid.innerHTML = list
      .map(
        (project) => `
          <article class="project-card" data-id="${project.id}">
            <span class="category">${escapeHtml(project.category)}</span>
            <h3>${escapeHtml(project.title)}</h3>
            <p>${escapeHtml(project.description)}</p>
            <div class="tag-list">${project.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
          </article>
        `
      )
      .join('');

    projectGrid.querySelectorAll('.project-card').forEach((card) => {
      card.addEventListener('click', () => openProjectModal(Number(card.dataset.id)));
    });
  }

  searchInput.addEventListener('input', (event) => {
    searchTerm = event.target.value;
    renderProjects();
  });

  renderFilterButtons();
  renderProjects();
  setupProjectModal();
}

function setupProjectModal() {
  const modal = getEl('project-modal');
  const modalCard = getEl('modal-card');
  const modalClose = getEl('modal-close');
  if (!modal || !modalCard || !modalClose) return;

  modalClose.onclick = () => {
    if (modal.open) modal.close();
  };

  modal.onclick = (event) => {
    const bounds = modalCard.getBoundingClientRect();
    const isOutside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;

    if (isOutside && modal.open) modal.close();
  };
}

function openProjectModal(id) {
  const modal = getEl('project-modal');
  if (!modal) return;

  const project = state.projects.find((item) => item.id === id);
  if (!project) return;

  getEl('modal-category').textContent = project.category;
  getEl('modal-title').textContent = project.title;
  getEl('modal-desc').textContent = project.description;
  getEl('modal-tags').innerHTML = project.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  getEl('modal-link').href = project.link || '#';

  if (typeof modal.showModal === 'function') modal.showModal();
}

async function sha256(text) {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function setupAdminPage() {
  const adminLogin = getEl('admin-login');
  if (!adminLogin) return;

  const adminApp = getEl('admin-app');
  const loginInput = getEl('admin-password');
  const loginButton = getEl('admin-login-btn');
  const loginError = getEl('admin-login-error');
  const logoutButton = getEl('admin-logout');

  function showAdminApp() {
    adminLogin.classList.add('hidden');
    adminApp.classList.remove('hidden');
    fillAdminContentForm();
    renderProjectAdminList();
  }

  function hideAdminApp() {
    adminApp.classList.add('hidden');
    adminLogin.classList.remove('hidden');
    loginInput.value = '';
  }

  if (sessionStorage.getItem(ADMIN_SESSION_KEY) === 'ok') {
    showAdminApp();
  }

  loginButton.addEventListener('click', async () => {
    loginError.textContent = '';
    const entered = loginInput.value.trim();
    if (!entered) {
      loginError.textContent = '비밀번호를 입력해 주세요.';
      return;
    }

    const hash = await sha256(entered);
    if (hash !== getAdminPasswordHash()) {
      loginError.textContent = '비밀번호가 일치하지 않습니다.';
      return;
    }

    sessionStorage.setItem(ADMIN_SESSION_KEY, 'ok');
    showAdminApp();
  });

  logoutButton.addEventListener('click', () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    hideAdminApp();
  });

  setupAdminActions();
}

function fillAdminContentForm() {
  const c = state.content;
  getEl('f-hero-eyebrow').value = c.heroEyebrow;
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
  getEl('f-blueprint-title').value = c.blueprintTitle;
  getEl('f-blueprint-subtitle').value = c.blueprintSubtitle;
  getEl('f-footer-note').value = c.footerNote;
  getEl('f-blueprints').value = state.blueprints.map((item) => `${item.title}|${item.description}`).join('\n');
}

function clearProjectForm() {
  getEl('p-id').value = '';
  getEl('p-category').value = '';
  getEl('p-title').value = '';
  getEl('p-description').value = '';
  getEl('p-tags').value = '';
  getEl('p-link').value = '';
}

function renderProjectAdminList() {
  const projectList = getEl('project-list');
  if (!projectList) return;

  if (!state.projects.length) {
    projectList.innerHTML = '<p class="admin-tip">등록된 프로젝트가 없습니다.</p>';
    return;
  }

  projectList.innerHTML = state.projects
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

  projectList.querySelectorAll('.project-admin-item').forEach((row) => {
    const id = Number(row.dataset.id);

    row.querySelector('[data-action="edit"]').addEventListener('click', () => {
      const project = state.projects.find((item) => item.id === id);
      if (!project) return;
      getEl('p-id').value = String(project.id);
      getEl('p-category').value = project.category;
      getEl('p-title').value = project.title;
      getEl('p-description').value = project.description;
      getEl('p-tags').value = project.tags.join(', ');
      getEl('p-link').value = project.link;
    });

    row.querySelector('[data-action="delete"]').addEventListener('click', () => {
      if (!confirm('이 프로젝트를 삭제하시겠습니까?')) return;
      state.projects = state.projects.filter((item) => item.id !== id);
      saveDraft();
      renderProjectAdminList();
    });
  });
}

function readBlueprintText(value) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, ...rest] = line.split('|');
      return {
        title: title?.trim() || '제목 없음',
        description: rest.join('|').trim() || '설명 없음',
      };
    });
}

function saveContentFromAdmin() {
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
    blueprintTitle: getEl('f-blueprint-title').value.trim(),
    blueprintSubtitle: getEl('f-blueprint-subtitle').value.trim(),
    footerNote: getEl('f-footer-note').value.trim(),
  };

  const parsedBlueprints = readBlueprintText(getEl('f-blueprints').value);
  state.blueprints = parsedBlueprints.length ? parsedBlueprints : deepClone(defaultState.blueprints);

  saveDraft();
  alert('문구 작업본이 저장되었습니다. 완료 후 data.json 다운로드를 진행해 주세요.');
}

function saveProjectFromAdmin() {
  const category = getEl('p-category').value.trim();
  const title = getEl('p-title').value.trim();
  const description = getEl('p-description').value.trim();
  const link = getEl('p-link').value.trim();
  const tags = getEl('p-tags')
    .value.split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (!category || !title || !description) {
    alert('카테고리, 제목, 설명은 필수입니다.');
    return;
  }

  const editingId = Number(getEl('p-id').value);

  if (editingId) {
    const idx = state.projects.findIndex((item) => item.id === editingId);
    if (idx > -1) {
      state.projects[idx] = { ...state.projects[idx], category, title, description, tags, link };
    }
  } else {
    const nextId = state.projects.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    state.projects.unshift({ id: nextId, category, title, description, tags, link });
  }

  saveDraft();
  clearProjectForm();
  renderProjectAdminList();
}

function exportStateJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'data.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

function importStateJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!isValidState(parsed)) {
        alert('올바른 형식의 JSON이 아닙니다.');
        return;
      }

      state = parsed;
      saveDraft();
      fillAdminContentForm();
      renderProjectAdminList();
      alert('JSON 작업본을 가져왔습니다.');
    } catch {
      alert('JSON 파싱에 실패했습니다.');
    }
  };
  reader.readAsText(file);
}

function setupAdminActions() {
  const contentSave = getEl('content-save');
  if (!contentSave) return;

  contentSave.addEventListener('click', saveContentFromAdmin);
  getEl('project-save').addEventListener('click', saveProjectFromAdmin);
  getEl('project-clear').addEventListener('click', clearProjectForm);
  getEl('export-json').addEventListener('click', exportStateJson);

  getEl('import-json').addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    importStateJson(file);
    event.target.value = '';
  });

  getEl('reset-data').addEventListener('click', async () => {
    if (!confirm('기준 data.json 상태로 되돌리시겠습니까?')) return;
    state = await loadDataFileState();
    clearDraft();
    fillAdminContentForm();
    renderProjectAdminList();
  });

  getEl('pwd-save').addEventListener('click', async () => {
    const current = getEl('pwd-current').value.trim();
    const next = getEl('pwd-new').value.trim();
    const confirmText = getEl('pwd-confirm').value.trim();

    if (!current || !next || !confirmText) {
      alert('현재/새 비밀번호를 모두 입력해 주세요.');
      return;
    }

    const currentHash = await sha256(current);
    if (currentHash !== getAdminPasswordHash()) {
      alert('현재 비밀번호가 올바르지 않습니다.');
      return;
    }

    if (next.length < 8) {
      alert('새 비밀번호는 8자 이상으로 설정해 주세요.');
      return;
    }

    if (next !== confirmText) {
      alert('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    const nextHash = await sha256(next);
    localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, nextHash);
    getEl('pwd-current').value = '';
    getEl('pwd-new').value = '';
    getEl('pwd-confirm').value = '';
    alert('비밀번호가 변경되었습니다.');
  });
}

async function initializeState() {
  state = await loadDataFileState();

  const adminLogin = getEl('admin-login');
  if (adminLogin) {
    const draft = loadDraft();
    if (draft) {
      const useDraft = confirm('임시 작업본이 있습니다. 작업본을 불러오시겠습니까?');
      if (useDraft) state = draft;
    }
  }
}

async function main() {
  await initializeState();
  renderPublicPage();
  setupAdminPage();
}

main();
