// ============ CONFIG ============
const API_URL = '/api';

// ============ CRITERIA ============
const CRITERIA = [
    { id: "impacto", name: "Impacto no negócio", weight: 0.30 },
    { id: "uso_kiro", name: "Uso efetivo do Kiro no desenvolvimento", weight: 0.25 },
    { id: "viabilidade", name: "Viabilidade de implementação", weight: 0.20 },
    { id: "inovacao", name: "Inovação e criatividade", weight: 0.15 },
    { id: "apresentacao", name: "Qualidade da apresentação", weight: 0.10 }
];

// ============ STATE ============
let currentUser = null;
let projects = [];
let evaluations = {};
let currentProjectId = null;
let currentScores = {};

// ============ API HELPERS ============
async function api(method, path, body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_URL}${path}`, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || 'Erro na requisição');
    }
    return res.json();
}

// ============ NAVIGATION ============
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if (screenId === 'screen-admin') loadAdminProjects();
}

function goToProjects() {
    loadProjects();
    showScreen('screen-projects');
}

// ============ LOGIN ============
async function login() {
    const name = document.getElementById('evaluator-name').value.trim();
    if (!name) { showToast("Por favor, digite seu nome"); return; }

    try {
        currentUser = await api('POST', '/evaluators', { name });
        document.getElementById('header-username').textContent = currentUser.name;
        await loadProjects();
        showScreen('screen-projects');
    } catch (err) {
        showToast("Erro ao entrar: " + err.message);
    }
}

document.getElementById('evaluator-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
});

// ============ PROJECTS ============
async function loadProjects() {
    try {
        projects = await api('GET', '/projects');
        const evals = await api('GET', `/evaluations/evaluator/${currentUser.id}`);
        evaluations = {};
        evals.forEach(ev => { evaluations[ev.project_id] = ev; });
        renderProjectsList('all');
    } catch (err) {
        showToast("Erro ao carregar projetos");
    }
}

function renderProjectsList(filter) {
    const container = document.getElementById('projects-list');
    container.innerHTML = '';

    let filtered = projects;
    if (filter === 'pending') filtered = projects.filter(p => !evaluations[p.id]);
    else if (filter === 'done') filtered = projects.filter(p => evaluations[p.id]);

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--text-light); padding: 40px 0;">Nenhum projeto encontrado</p>';
    }

    filtered.forEach(project => {
        const isEvaluated = !!evaluations[project.id];
        const score = isEvaluated ? parseFloat(evaluations[project.id].weighted_score) : null;

        const card = document.createElement('div');
        card.className = `project-card ${isEvaluated ? 'evaluated' : ''}`;
        card.onclick = () => openEvaluation(project.id);
        card.innerHTML = `
            <div class="project-card-header">
                <h3>${escHtml(project.title)}</h3>
                <span class="project-badge ${isEvaluated ? 'badge-done' : 'badge-pending'}">
                    ${isEvaluated ? '✓ ' + score.toFixed(1) : 'Pendente'}
                </span>
            </div>
            <p>${escHtml(project.description)}</p>
            <div class="participant">👤 ${escHtml(project.participant)}</div>
        `;
        container.appendChild(card);
    });

    updateProgress();
}

function filterProjects(filter, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderProjectsList(filter);
}

function updateProgress() {
    const total = projects.length;
    const done = projects.filter(p => evaluations[p.id]).length;
    document.getElementById('progress-text').textContent = `${done} de ${total} avaliados`;
    document.getElementById('progress-fill').style.width = total > 0 ? `${(done / total) * 100}%` : '0%';
    document.getElementById('btn-ranking').style.display = done > 0 ? 'block' : 'none';
}

// ============ EVALUATION ============
async function openEvaluation(projectId) {
    currentProjectId = projectId;
    const project = projects.find(p => p.id === projectId);

    document.getElementById('eval-project-info').innerHTML = `
        <h2>${escHtml(project.title)}</h2>
        <div class="participant">👤 ${escHtml(project.participant)}</div>
        <p style="margin-top: 8px;">${escHtml(project.description)}</p>
    `;

    // Load existing evaluation or reset
    const existing = evaluations[projectId];
    currentScores = {};
    if (existing) {
        CRITERIA.forEach(c => { currentScores[c.id] = existing[c.id]; });
    }

    renderCriteria();
    updateFinalScore();
    showScreen('screen-eval');
}

function renderCriteria() {
    const container = document.getElementById('criteria-list');
    container.innerHTML = '';

    CRITERIA.forEach(criteria => {
        const card = document.createElement('div');
        card.className = 'criteria-card';
        card.innerHTML = `
            <div class="criteria-header">
                <span class="criteria-name">${criteria.name}</span>
                <span class="criteria-weight">Peso: ${(criteria.weight * 100)}%</span>
            </div>
            <div class="criteria-score" id="score-${criteria.id}">
                ${[1,2,3,4,5,6,7,8,9,10].map(n => `
                    <button class="score-btn ${currentScores[criteria.id] === n ? 'selected' : ''}"
                            onclick="setScore('${criteria.id}', ${n})">
                        ${n}
                    </button>
                `).join('')}
            </div>
        `;
        container.appendChild(card);
    });
}

function setScore(criteriaId, value) {
    currentScores[criteriaId] = value;
    const container = document.getElementById(`score-${criteriaId}`);
    container.querySelectorAll('.score-btn').forEach((btn, idx) => {
        btn.classList.toggle('selected', idx + 1 === value);
    });
    updateFinalScore();
}

function calculateWeightedScore(scores) {
    let total = 0;
    CRITERIA.forEach(c => { total += (scores[c.id] || 0) * c.weight; });
    return total;
}

function updateFinalScore() {
    const score = calculateWeightedScore(currentScores);
    document.getElementById('final-score-value').textContent = score.toFixed(1);
}

async function submitEvaluation() {
    const allScored = CRITERIA.every(c => currentScores[c.id]);
    if (!allScored) { showToast("Avalie todos os critérios antes de salvar"); return; }

    try {
        await api('POST', '/evaluations', {
            project_id: currentProjectId,
            evaluator_id: currentUser.id,
            ...currentScores
        });
        showToast("Avaliação salva com sucesso! ✓");
        setTimeout(() => goToProjects(), 800);
    } catch (err) {
        showToast("Erro ao salvar: " + err.message);
    }
}

// ============ RANKING ============
async function showRanking() {
    try {
        const ranking = await api('GET', '/ranking');
        const container = document.getElementById('ranking-list');
        container.innerHTML = '';

        ranking.forEach((project, index) => {
            const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
            const card = document.createElement('div');
            card.className = 'summary-card';
            card.innerHTML = `
                <div class="summary-rank ${rankClass}">${index + 1}°</div>
                <div class="summary-info">
                    <h4>${escHtml(project.title)}</h4>
                    <span>${escHtml(project.participant)} • ${project.total_evaluations} avaliação(ões)</span>
                </div>
                <div class="summary-score">${parseFloat(project.avg_score).toFixed(1)}</div>
            `;
            container.appendChild(card);
        });

        showScreen('screen-ranking');
    } catch (err) {
        showToast("Erro ao carregar ranking");
    }
}

// ============ ADMIN - PROJECTS ============
async function createProject() {
    const title = document.getElementById('project-title').value.trim();
    const participant = document.getElementById('project-participant').value.trim();
    const description = document.getElementById('project-description').value.trim();

    if (!title || !participant || !description) {
        showToast("Preencha todos os campos");
        return;
    }

    try {
        await api('POST', '/projects', { title, description, participant });
        document.getElementById('project-title').value = '';
        document.getElementById('project-participant').value = '';
        document.getElementById('project-description').value = '';
        showToast("Projeto cadastrado com sucesso! ✓");
        loadAdminProjects();
    } catch (err) {
        showToast("Erro ao cadastrar: " + err.message);
    }
}

async function loadAdminProjects() {
    try {
        const list = await api('GET', '/projects');
        const container = document.getElementById('admin-projects-list');
        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = '<p style="text-align:center; color: var(--text-light); padding: 20px;">Nenhum projeto cadastrado</p>';
            return;
        }

        list.forEach(project => {
            const card = document.createElement('div');
            card.className = 'admin-project-card';
            card.innerHTML = `
                <div class="admin-project-info">
                    <h4>${escHtml(project.title)}</h4>
                    <span>👤 ${escHtml(project.participant)}</span>
                </div>
                <button class="btn btn-danger" onclick="deleteProject(${project.id})">Excluir</button>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        showToast("Erro ao carregar projetos");
    }
}

async function deleteProject(id) {
    if (!confirm("Tem certeza que deseja excluir este projeto?")) return;
    try {
        await api('DELETE', `/projects/${id}`);
        showToast("Projeto excluído");
        loadAdminProjects();
    } catch (err) {
        showToast("Erro ao excluir: " + err.message);
    }
}

// ============ UTILS ============
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
