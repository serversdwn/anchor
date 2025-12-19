import { useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:7085'

type Links = {
  tesseract?: string
  repo?: string
  logs?: string
  docs?: string
}

type Project = {
  id: number
  name: string
  status: 'active' | 'parked' | 'dormant'
  current_objective: string
  next_action: string
  links: Links
  last_updated: string
}

type Proposal = {
  id: number
  project_id: number
  patch: Partial<Project>
  reason?: string
  source: string
  status: string
  created_at: string
  reviewed_at?: string
}

type View = 'dashboard' | 'proposals' | 'settings'

const statusOrder: Array<Project['status']> = ['active', 'parked', 'dormant']

function App() {
  const [token, setToken] = useState(localStorage.getItem('anchor_token') || '')
  const [projects, setProjects] = useState<Project[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [view, setView] = useState<View>('dashboard')
  const [loginState, setLoginState] = useState({ username: '', password: '', error: '' })
  const [editing, setEditing] = useState<Project | null>(null)
  const [formState, setFormState] = useState<Project | null>(null)
  const [alwaysOnTop, setAlwaysOnTop] = useState(localStorage.getItem('anchor_always_on_top') === 'true')
  const [autoLaunch, setAutoLaunch] = useState(localStorage.getItem('anchor_auto_launch') === 'true')

  const tauri = (window as any).__TAURI__

  const grouped = useMemo(() => {
    const map: Record<Project['status'], Project[]> = {
      active: [],
      parked: [],
      dormant: []
    }
    projects.forEach((project) => map[project.status].push(project))
    return map
  }, [projects])

  useEffect(() => {
    fetch(`${API_BASE}/api/projects`)
      .then((res) => res.json())
      .then(setProjects)
      .catch(() => setProjects([]))
  }, [])

  const loadProposals = () => {
    if (!token) return
    fetch(`${API_BASE}/api/proposals`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then(setProposals)
  }

  const handleLogin = async () => {
    setLoginState((prev) => ({ ...prev, error: '' }))
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: loginState.username,
        password: loginState.password
      })
    })
    if (!res.ok) {
      setLoginState((prev) => ({ ...prev, error: 'Invalid credentials' }))
      return
    }
    const data = await res.json()
    localStorage.setItem('anchor_token', data.access_token)
    setToken(data.access_token)
  }

  const startEdit = (project: Project) => {
    setEditing(project)
    setFormState({ ...project })
  }

  const saveEdit = async () => {
    if (!formState || !editing) return
    const res = await fetch(`${API_BASE}/api/projects/${editing.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: formState.name,
        status: formState.status,
        current_objective: formState.current_objective,
        next_action: formState.next_action,
        links: formState.links
      })
    })
    if (!res.ok) return
    const updated = await res.json()
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setEditing(null)
  }

  const reviewProposal = async (id: number, action: 'approve' | 'reject') => {
    const res = await fetch(`${API_BASE}/api/proposals/${id}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      loadProposals()
      fetch(`${API_BASE}/api/projects`)
        .then((r) => r.json())
        .then(setProjects)
    }
  }

  useEffect(() => {
    if (view === 'proposals') {
      loadProposals()
    }
  }, [view])

  const logout = () => {
    localStorage.removeItem('anchor_token')
    setToken('')
  }

  const toggleAlwaysOnTop = async (value: boolean) => {
    setAlwaysOnTop(value)
    localStorage.setItem('anchor_always_on_top', String(value))
    if (tauri?.invoke) {
      await tauri.invoke('set_always_on_top', { alwaysOnTop: value })
    }
  }

  const toggleAutoLaunch = async (value: boolean) => {
    setAutoLaunch(value)
    localStorage.setItem('anchor_auto_launch', String(value))
    if (tauri?.invoke) {
      await tauri.invoke('set_autostart', { enabled: value })
    }
  }

  return (
    <div className="min-h-screen px-6 py-4">
      <header className="flex items-center justify-between">
        <div className="text-2xl font-semibold tracking-[0.4em]">ANCHOR</div>
        <nav className="flex items-center gap-4 text-sm uppercase">
          <button className={view === 'dashboard' ? 'text-white' : 'text-anchor-600'} onClick={() => setView('dashboard')}>
            Dashboard
          </button>
          <button className={view === 'proposals' ? 'text-white' : 'text-anchor-600'} onClick={() => setView('proposals')}>
            Proposals
          </button>
          <button className={view === 'settings' ? 'text-white' : 'text-anchor-600'} onClick={() => setView('settings')}>
            Settings
          </button>
          {token ? (
            <button onClick={logout} className="text-anchor-600">Logout</button>
          ) : null}
        </nav>
      </header>

      {view === 'dashboard' && (
        <main className="mt-4 grid gap-4 lg:grid-cols-3">
          {statusOrder.map((status) => (
            <section key={status} className="rounded-lg border border-anchor-700 bg-anchor-800/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm uppercase tracking-[0.2em] text-anchor-200">
                  {status} ({grouped[status].length})
                </h2>
              </div>
              <div className="space-y-3">
                {grouped[status].map((project) => (
                  <div key={project.id} className="rounded border border-anchor-700 bg-anchor-900/40 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-base font-semibold text-white">{project.name}</div>
                        <div className="text-xs uppercase text-anchor-600">Last updated {new Date(project.last_updated).toLocaleString()}</div>
                      </div>
                      {token && (
                        <button onClick={() => startEdit(project)} className="text-xs text-anchor-600 hover:text-white">
                          Edit
                        </button>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-anchor-200">Objective: {project.current_objective}</div>
                    <div className="text-sm text-anchor-200">Next: {project.next_action}</div>
                    <div className="mt-2 flex gap-2 text-xs text-anchor-600">
                      {project.links?.tesseract && <a href={project.links.tesseract} target="_blank">Tesseract</a>}
                      {project.links?.repo && <a href={project.links.repo} target="_blank">Repo</a>}
                      {project.links?.logs && <a href={project.links.logs} target="_blank">Logs</a>}
                      {project.links?.docs && <a href={project.links.docs} target="_blank">Docs</a>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </main>
      )}

      {view === 'proposals' && (
        <main className="mt-6">
          {!token && (
            <div className="rounded border border-anchor-700 bg-anchor-800/60 p-4">
              <h3 className="text-lg text-white">Admin Login</h3>
              <div className="mt-2 flex flex-col gap-2 text-sm">
                <input
                  className="rounded border border-anchor-700 bg-anchor-900 p-2"
                  placeholder="Username"
                  value={loginState.username}
                  onChange={(e) => setLoginState({ ...loginState, username: e.target.value })}
                />
                <input
                  className="rounded border border-anchor-700 bg-anchor-900 p-2"
                  type="password"
                  placeholder="Password"
                  value={loginState.password}
                  onChange={(e) => setLoginState({ ...loginState, password: e.target.value })}
                />
                <button onClick={handleLogin} className="rounded bg-white px-4 py-2 text-anchor-900">Login</button>
                {loginState.error && <div className="text-xs text-red-300">{loginState.error}</div>}
              </div>
            </div>
          )}
          {token && (
            <div className="rounded border border-anchor-700 bg-anchor-800/60 p-4">
              <h3 className="text-lg text-white">Pending Proposals</h3>
              <div className="mt-4 space-y-3">
                {proposals.length === 0 && <div className="text-sm text-anchor-600">No proposals yet.</div>}
                {proposals.map((proposal) => {
                  const project = projects.find((item) => item.id === proposal.project_id)
                  return (
                  <div key={proposal.id} className="rounded border border-anchor-700 bg-anchor-900/50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-anchor-200">#{proposal.id} {proposal.status}</div>
                      <div className="text-xs text-anchor-600">{new Date(proposal.created_at).toLocaleString()}</div>
                    </div>
                    <div className="mt-2 text-sm">
                      <div>Project ID: {proposal.project_id}</div>
                      <div>Reason: {proposal.reason || '—'}</div>
                      <div className="mt-2 text-xs text-anchor-600">Patch</div>
                      <div className="grid gap-2 text-xs text-anchor-200 md:grid-cols-2">
                        <div className="rounded border border-anchor-700 p-2">
                          <div className="text-anchor-600">Current</div>
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(project ?? {}, null, 2)}
                          </pre>
                        </div>
                        <div className="rounded border border-anchor-700 p-2">
                          <div className="text-anchor-600">Proposed</div>
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(proposal.patch, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                    {proposal.status === 'pending' && (
                      <div className="mt-2 flex gap-2">
                        <button
                          className="rounded bg-white px-3 py-1 text-xs text-anchor-900"
                          onClick={() => reviewProposal(proposal.id, 'approve')}
                        >
                          Approve
                        </button>
                        <button
                          className="rounded border border-anchor-600 px-3 py-1 text-xs text-anchor-200"
                          onClick={() => reviewProposal(proposal.id, 'reject')}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            </div>
          )}
        </main>
      )}

      {view === 'settings' && (
        <main className="mt-6 grid gap-4">
          <div className="rounded border border-anchor-700 bg-anchor-800/60 p-4">
            <h3 className="text-lg text-white">Admin Session</h3>
            {token ? (
              <div className="text-sm text-anchor-200">Logged in as {loginState.username || 'admin'}.</div>
            ) : (
              <div className="mt-2 flex flex-col gap-2 text-sm">
                <input
                  className="rounded border border-anchor-700 bg-anchor-900 p-2"
                  placeholder="Username"
                  value={loginState.username}
                  onChange={(e) => setLoginState({ ...loginState, username: e.target.value })}
                />
                <input
                  className="rounded border border-anchor-700 bg-anchor-900 p-2"
                  type="password"
                  placeholder="Password"
                  value={loginState.password}
                  onChange={(e) => setLoginState({ ...loginState, password: e.target.value })}
                />
                <button onClick={handleLogin} className="rounded bg-white px-4 py-2 text-anchor-900">Login</button>
                {loginState.error && <div className="text-xs text-red-300">{loginState.error}</div>}
              </div>
            )}
          </div>
          <div className="rounded border border-anchor-700 bg-anchor-800/60 p-4">
            <h3 className="text-lg text-white">Desktop Controls</h3>
            <div className="mt-2 flex flex-col gap-3 text-sm text-anchor-200">
              <label className="flex items-center justify-between">
                <span>Always on top</span>
                <input
                  type="checkbox"
                  checked={alwaysOnTop}
                  onChange={(e) => toggleAlwaysOnTop(e.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between">
                <span>Auto-launch on login</span>
                <input
                  type="checkbox"
                  checked={autoLaunch}
                  onChange={(e) => toggleAutoLaunch(e.target.checked)}
                />
              </label>
              {!tauri && <div className="text-xs text-anchor-600">Available in the desktop app.</div>}
            </div>
          </div>
          <div className="rounded border border-anchor-700 bg-anchor-800/60 p-4">
            <h3 className="text-lg text-white">Lyra Proposal Token</h3>
            <div className="text-sm text-anchor-200">Configured on backend: check <code>.env</code>.</div>
            <div className="text-xs text-anchor-600">The UI never reveals the token value.</div>
          </div>
        </main>
      )}

      {editing && formState && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="w-full max-w-lg rounded border border-anchor-700 bg-anchor-900 p-4">
            <h3 className="text-lg text-white">Edit Project</h3>
            <div className="mt-3 grid gap-2 text-sm">
              <input
                className="rounded border border-anchor-700 bg-anchor-800 p-2"
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              />
              <select
                className="rounded border border-anchor-700 bg-anchor-800 p-2"
                value={formState.status}
                onChange={(e) => setFormState({ ...formState, status: e.target.value as Project['status'] })}
              >
                <option value="active">active</option>
                <option value="parked">parked</option>
                <option value="dormant">dormant</option>
              </select>
              <input
                className="rounded border border-anchor-700 bg-anchor-800 p-2"
                value={formState.current_objective}
                onChange={(e) => setFormState({ ...formState, current_objective: e.target.value })}
              />
              <input
                className="rounded border border-anchor-700 bg-anchor-800 p-2"
                value={formState.next_action}
                onChange={(e) => setFormState({ ...formState, next_action: e.target.value })}
              />
              <input
                className="rounded border border-anchor-700 bg-anchor-800 p-2"
                placeholder="Repo URL"
                value={formState.links?.repo || ''}
                onChange={(e) => setFormState({
                  ...formState,
                  links: { ...formState.links, repo: e.target.value }
                })}
              />
              <input
                className="rounded border border-anchor-700 bg-anchor-800 p-2"
                placeholder="Docs URL"
                value={formState.links?.docs || ''}
                onChange={(e) => setFormState({
                  ...formState,
                  links: { ...formState.links, docs: e.target.value }
                })}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded border border-anchor-600 px-3 py-1 text-sm" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="rounded bg-white px-3 py-1 text-sm text-anchor-900" onClick={saveEdit}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
