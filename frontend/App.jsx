// =============================================
// Pas d'import ES module : globals React/ReactDOM
// injectés par index.html (UMD). Babel transpile le JSX.
// =============================================
const { useState, useEffect, useRef } = React;

// =============================================
// Configuration centralisée des URLs APIs
// =============================================
const API = {
    AUTH:           '/api/auth',
    ADMIN:          '/api/admin',
    FICHIERS:       '/api/fichiers',
    TELECHARGEMENT: '/api/telechargement',
    IA:             '/api/ia',
};

// =============================================
// Utilitaires JWT (décodage côté client)
// La vérification de signature reste côté backend.
// =============================================
function decodeJwt(token) {
    try {
        const payload = token.split('.')[1];
        const padded  = payload + '=='.slice(0, (4 - payload.length % 4) % 4);
        return JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
        return {};
    }
}

function getRolesFromToken(token) {
    const decoded = decodeJwt(token);
    return decoded?.realm_access?.roles || [];
}

function getPrimaryRole(roles) {
    if (roles.includes('admin'))      return 'admin';
    if (roles.includes('enseignant')) return 'enseignant';
    if (roles.includes('etudiant'))   return 'etudiant';
    return 'inconnu';
}

// =============================================
// Composant Login
// =============================================
function Login({ onLogin, onForgot }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const form = new URLSearchParams();
            form.append('username', username);
            form.append('password', password);
            const res = await fetch(`${API.AUTH}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: form
            });
            if (res.ok) {
                const data = await res.json();
                onLogin(data.access_token);
            } else {
                const err = await res.json().catch(() => ({}));
                setError(err.detail || "Identifiants incorrects.");
            }
        } catch {
            setError("Impossible de joindre le serveur d'authentification.");
        }
        setLoading(false);
    };

    return (
        <div className="login-container">
            <div className="login-header">
                <img src="https://upload.wikimedia.org/wikipedia/fr/0/07/Logo_EST_Sal%C3%A9.png"
                     alt="EST Salé"
                     style={{height:"80px", marginBottom:"1rem", filter:"brightness(0) invert(1)"}} />
                <h1>جامعة محمد الخامس بالرباط</h1>
                <h2>المدرسة العليا للتكنولوجيا بسلا</h2>
            </div>
            <div className="login-tabs">
                <div className="login-tab active">CONNEXION ENT</div>
                <div className="login-tab">BESOIN D'AIDE ?</div>
            </div>
            <div className="login-card">
                <div className="login-info">
                    <i className="fas fa-user-circle fa-2x"></i>
                    <span>Connectez-vous avec vos identifiants universitaires</span>
                </div>
                {error && <div className="error-message"><i className="fas fa-exclamation-triangle"></i> {error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Identifiant :</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                               placeholder="Votre identifiant" required disabled={loading} />
                    </div>
                    <div className="input-group">
                        <label>Mot de passe :</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                               placeholder="••••••••" required disabled={loading} />
                    </div>
                    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"2rem"}}>
                        <button type="submit" className="login-btn" style={{width:"48%"}} disabled={loading}>
                            {loading ? <span><i className="fas fa-spinner fa-spin"></i> Connexion...</span> : 'CONNEXION'}
                        </button>
                        <a href="#" onClick={(e) => { e.preventDefault(); console.log('Click Forgot'); alert('Click détecté !'); onForgot(); }}
                           style={{color:"var(--primary-blue)", textDecoration:"none", fontWeight:"500", display:"flex", alignItems:"center", gap:"5px"}}>
                            <i className="fas fa-question-circle"></i> Mot de passe oublié ?
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
}

// =============================================
// Composant ForgotPasswordForm – Réinitialisation publique
// =============================================
function ForgotPasswordForm({ onBack }) {
    const [email, setEmail] = useState('');
    const [nom, setNom]     = useState('');
    const [prenom, setPrenom] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true); setMsg(''); setErr('');
        try {
            const res = await fetch(`${API.ADMIN}/public/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, nom, prenom, new_password: newPassword })
            });
            if (res.ok) {
                setMsg("Mot de passe réinitialisé ! Redirection vers la connexion...");
                setTimeout(onBack, 2500);
            } else {
                const data = await res.json().catch(() => ({}));
                setErr(data.detail || "Vérification échouée. Vérifiez vos informations.");
            }
        } catch { setErr("Serveur d'administration indisponible."); }
        setLoading(false);
    };

    return (
        <div style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg-page)", padding:"1rem"}}>
            <div className="login-card" style={{maxWidth:"450px", width:"100%", animation:"slideUp 0.3s ease-out"}}>
                <div className="login-header" style={{background:"none", padding:0, marginBottom:"1.5rem"}}>
                    <h1 style={{color:"var(--primary-blue)", fontSize:"1.5rem"}}>Mot de passe oublié</h1>
                    <p style={{color:"var(--text-light)", fontSize:"0.875rem", marginTop:"0.5rem"}}>
                        Veuillez confirmer votre identité pour réinitialiser votre accès.
                    </p>
                </div>
                
                {msg && <div style={{background:"#f0fdf4", color:"#16a34a", border:"1px solid #bbf7d0", padding:"0.75rem", borderRadius:"8px", marginBottom:"1rem", fontSize:"0.875rem"}}>
                    <i className="fas fa-check-circle"></i> {msg}
                </div>}
                {err && <div className="error-message" style={{marginBottom:"1rem"}}>
                    <i className="fas fa-exclamation-triangle"></i> {err}
                </div>}

                <form onSubmit={handleReset}>
                    <div className="input-group">
                        <label>Email universitaire :</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="m.alaoui@est.ac.ma" required disabled={loading} />
                    </div>
                    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem"}}>
                        <div className="input-group" style={{marginBottom:0}}>
                            <label>Nom :</label>
                            <input type="text" value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom" required disabled={loading} />
                        </div>
                        <div className="input-group" style={{marginBottom:0}}>
                            <label>Prénom :</label>
                            <input type="text" value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Prénom" required disabled={loading} />
                        </div>
                    </div>
                    <div className="input-group" style={{marginTop:"0.75rem"}}>
                        <label>Nouveau mot de passe :</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" required disabled={loading} />
                    </div>
                    <div style={{display:"flex", gap:"1rem", marginTop:"1.5rem"}}>
                        <button type="submit" className="login-btn" style={{flex:1}} disabled={loading}>
                            {loading ? <i className="fas fa-spinner fa-spin"></i> : "RÉINITIALISER"}
                        </button>
                        <button type="button" onClick={onBack} className="login-btn" style={{flex:1, background:"#64748b"}} disabled={loading}>
                            ANNULER
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// =============================================
// Composant Chatbot IA (commun à tous les rôles)
// =============================================
function Chatbot({ token }) {
    const [isOpen, setIsOpen]   = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput]     = useState('');
    const [mode, setMode]       = useState('menu');
    const [loading, setLoading] = useState(false);
    const endRef = useRef(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const msg = input;
        setMessages(prev => [...prev, { text: msg, sender:'user' }]);
        setInput('');
        setLoading(true);
        try {
            const headers = { 'Content-Type':'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${API.IA}/chat/`, {
                method:'POST', headers,
                body: JSON.stringify({ prompt: msg })
            });
            const data = await res.json();
            setMessages(prev => [...prev, { text: data.reponse || "Réponse reçue.", sender:'bot' }]);
        } catch {
            setMessages(prev => [...prev, { text:"Service IA indisponible.", sender:'bot' }]);
        }
        setLoading(false);
    };

    return (
        <React.Fragment>
            <div className="chatbot-fab" onClick={() => setIsOpen(!isOpen)}>
                <i className={`fas ${isOpen ? 'fa-times' : 'fa-comment-dots'}`}></i>
            </div>
            {isOpen && (
                <div className="chatbot-window">
                    <div className="chat-header">
                        <h3>Assistant IA</h3>
                        <p>EST Salé – Propulsé par Llama 3</p>
                        <button className="chat-close" onClick={() => setIsOpen(false)}>
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    {mode === 'menu' ? (
                        <div className="chat-body">
                            <div className="chat-option">
                                <h4>Lancer une conversation</h4>
                                <button className="chat-btn" onClick={() => setMode('chat')}>
                                    <i className="fas fa-paper-plane"></i> Démarrer
                                </button>
                            </div>
                            <div className="chat-option">
                                <h4>Que recherchez-vous ?</h4>
                                <div className="chat-input-wrapper">
                                    <i className="fas fa-search"></i>
                                    <input type="text" placeholder="Rechercher un sujet..." />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <React.Fragment>
                            <div className="chat-body">
                                <div className="messages-container">
                                    <div className="message bot">Bonjour ! Je suis l'assistant IA de l'EST Salé. Comment puis-je vous aider ?</div>
                                    {messages.map((m, i) => (
                                        <div key={i} className={`message ${m.sender}`}>{m.text}</div>
                                    ))}
                                    {loading && <div className="message bot"><i className="fas fa-spinner fa-spin"></i> Réflexion en cours...</div>}
                                    <div ref={endRef} />
                                </div>
                            </div>
                            <div className="chat-footer">
                                <button className="chat-send" style={{background:"#cbd5e1"}} onClick={() => setMode('menu')}>
                                    <i className="fas fa-arrow-left"></i>
                                </button>
                                <input type="text" placeholder="Écrivez un message..."
                                       value={input} onChange={e => setInput(e.target.value)}
                                       onKeyDown={e => e.key === 'Enter' && handleSend()} />
                                <button className="chat-send" onClick={handleSend} disabled={loading}>
                                    <i className="fas fa-paper-plane"></i>
                                </button>
                            </div>
                        </React.Fragment>
                    )}
                </div>
            )}
        </React.Fragment>
    );
}

// =============================================
// Composant CoursPanel – liste + téléchargement
// canUpload=true → affiche aussi le formulaire d'upload (enseignant)
// =============================================
function CoursPanel({ token, canUpload }) {
    const [cours, setCours]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState('');
    const [showUpload, setShowUpload] = useState(false);

    // Upload state
    const [titre, setTitre]           = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile]             = useState(null);
    const [uploading, setUploading]   = useState(false);
    const [uploadMsg, setUploadMsg]   = useState('');
    const [uploadErr, setUploadErr]   = useState('');

    const fetchCours = async () => {
        setLoading(true); setError('');
        try {
            const res = await fetch(`${API.TELECHARGEMENT}/cours/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCours(data.cours || data);
            } else {
                const e = await res.json().catch(() => ({}));
                setError(e.detail || "Erreur de chargement.");
            }
        } catch { setError("Service de téléchargement indisponible."); }
        setLoading(false);
    };

    useEffect(() => { fetchCours(); }, []);

    const handleDownload = async (id) => {
        try {
            const res = await fetch(`${API.TELECHARGEMENT}/cours/download/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Création d'un lien invisible pour déclencher le téléchargement
                const link = document.createElement('a');
                link.href = data.url_telechargement;
                link.setAttribute('download', ''); // L'attribut download suggère au navigateur de télécharger
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                const e = await res.json().catch(() => ({}));
                alert(e.detail || "Erreur de téléchargement.");
            }
        } catch { alert("Service de téléchargement indisponible."); }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        setUploadMsg(''); setUploadErr(''); setUploading(true);
        const form = new FormData();
        form.append("titre", titre);
        form.append("description", description);
        form.append("fichier", file);
        try {
            const res = await fetch(`${API.FICHIERS}/cours/upload/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: form
            });
            if (res.ok) {
                setUploadMsg("Cours ajouté avec succès !");
                setTitre(''); setDescription(''); setFile(null);
                setTimeout(() => { setShowUpload(false); setUploadMsg(''); fetchCours(); }, 2000);
            } else {
                const e = await res.json().catch(() => ({}));
                setUploadErr(e.detail || "Erreur lors de l'upload.");
            }
        } catch { setUploadErr("Service de fichiers indisponible."); }
        setUploading(false);
    };

    return (
        <div style={{padding:"2rem", maxWidth:"1000px", margin:"0 auto"}}>
            {/* En-tête */}
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem",
                         borderBottom:"2px solid var(--border)", paddingBottom:"1rem"}}>
                <div>
                    <h2 style={{color:"var(--primary-blue)", fontSize:"1.4rem"}}>
                        <i className="fas fa-graduation-cap"></i> Cours en ligne
                    </h2>
                    <p style={{color:"var(--text-light)", fontSize:"0.85rem", marginTop:"0.25rem"}}>
                        {cours.length} cours disponible{cours.length !== 1 ? 's' : ''}
                    </p>
                </div>
                {canUpload && !showUpload && (
                    <button onClick={() => setShowUpload(true)} className="login-btn"
                            style={{width:"auto", padding:"0.6rem 1.25rem"}}>
                        <i className="fas fa-plus"></i> Ajouter un cours
                    </button>
                )}
                {canUpload && showUpload && (
                    <button onClick={() => { setShowUpload(false); setUploadErr(''); setUploadMsg(''); }}
                            className="login-btn" style={{width:"auto", padding:"0.6rem 1.25rem", background:"#64748b"}}>
                        <i className="fas fa-list"></i> Voir la liste
                    </button>
                )}
            </div>

            {/* Formulaire upload */}
            {canUpload && showUpload && (
                <div style={{background:"white", borderRadius:"12px", padding:"1.75rem",
                             boxShadow:"0 2px 12px rgba(0,0,0,0.08)", border:"1px solid var(--border)", marginBottom:"1.5rem"}}>
                    <h3 style={{marginBottom:"1.25rem", color:"var(--text-dark)"}}>
                        <i className="fas fa-upload" style={{color:"var(--primary-blue)"}}></i> Ajouter un cours
                    </h3>
                    {uploadMsg && <div style={{background:"#f0fdf4", color:"#16a34a", border:"1px solid #bbf7d0",
                                              borderRadius:"8px", padding:"0.75rem", marginBottom:"1rem"}}>
                        <i className="fas fa-check-circle"></i> {uploadMsg}
                    </div>}
                    {uploadErr && <div className="error-message" style={{marginBottom:"1rem"}}>
                        <i className="fas fa-exclamation-triangle"></i> {uploadErr}
                    </div>}
                    <form onSubmit={handleUpload}>
                        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem"}}>
                            <div className="input-group" style={{marginBottom:0}}>
                                <label>Titre :</label>
                                <input type="text" value={titre} onChange={e => setTitre(e.target.value)}
                                       placeholder="Titre du cours" required disabled={uploading} />
                            </div>
                            <div className="input-group" style={{marginBottom:0}}>
                                <label>Description :</label>
                                <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                                       placeholder="Brève description" required disabled={uploading} />
                            </div>
                        </div>
                        <div className="input-group" style={{marginTop:"0.75rem"}}>
                            <label>Fichier :</label>
                            <input type="file" onChange={e => setFile(e.target.files[0])}
                                   required style={{background:"white"}} disabled={uploading} />
                        </div>
                        <button type="submit" className="login-btn"
                                style={{width:"auto", padding:"0.75rem 2rem", marginTop:"0.5rem"}} disabled={uploading}>
                            {uploading
                                ? <span><i className="fas fa-spinner fa-spin"></i> Upload...</span>
                                : <span><i className="fas fa-save"></i> Enregistrer</span>}
                        </button>
                    </form>
                </div>
            )}

            {/* Liste des cours */}
            {!showUpload && (
                <div>
                    {error && <div className="error-message" style={{marginBottom:"1rem"}}>
                        <i className="fas fa-exclamation-triangle"></i> {error}
                        <button onClick={fetchCours} style={{marginLeft:"10px", background:"none",
                                border:"1px solid currentColor", borderRadius:"4px", padding:"2px 8px", cursor:"pointer"}}>
                            Réessayer
                        </button>
                    </div>}
                    {loading ? (
                        <div style={{textAlign:"center", padding:"4rem", color:"#94a3b8"}}>
                            <i className="fas fa-spinner fa-spin fa-2x"></i>
                            <p style={{marginTop:"1rem"}}>Chargement des cours...</p>
                        </div>
                    ) : cours.length === 0 ? (
                        <div style={{textAlign:"center", padding:"4rem", color:"#94a3b8"}}>
                            <i className="fas fa-folder-open fa-3x" style={{marginBottom:"1rem", display:"block"}}></i>
                            <p>Aucun cours disponible pour le moment.</p>
                            {canUpload && <p style={{marginTop:"0.5rem", fontSize:"0.85rem"}}>
                                Cliquez sur "Ajouter un cours" pour publier le premier cours.
                            </p>}
                        </div>
                    ) : (
                        <div style={{display:"flex", flexDirection:"column", gap:"0.75rem"}}>
                            {cours.map(c => (
                                <div key={c.id} style={{background:"white", border:"1px solid var(--border)",
                                     padding:"1.25rem 1.5rem", borderRadius:"10px",
                                     display:"flex", justifyContent:"space-between", alignItems:"center",
                                     boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                                    <div style={{flex:1, minWidth:0}}>
                                        <h4 style={{fontSize:"1rem", fontWeight:"700", color:"var(--text-dark)", marginBottom:"0.3rem"}}>
                                            {c.titre}
                                        </h4>
                                        <p style={{color:"var(--text-light)", fontSize:"0.875rem"}}>{c.description}</p>
                                        <p style={{color:"#94a3b8", fontSize:"0.78rem", marginTop:"0.25rem"}}>
                                            <i className="fas fa-file-alt"></i> {c.nom_fichier}
                                        </p>
                                    </div>
                                    <button onClick={() => handleDownload(c.id)} className="login-btn"
                                            style={{width:"auto", padding:"0.5rem 1.1rem", background:"var(--orange)", flexShrink:0, marginLeft:"1rem"}}>
                                        <i className="fas fa-download"></i> Télécharger
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// =============================================
// Composant AdminPanel – Gestion des utilisateurs
// =============================================
function AdminPanel({ token, onBack }) {
    // ---- Onglets ----
    const [tab, setTab] = useState('create'); // 'create' | 'list'

    // ---- Création ----
    const [nom, setNom]           = useState('');
    const [prenom, setPrenom]     = useState('');
    const [email, setEmail]       = useState('');
    const [role, setRole]         = useState('etudiant');
    const [loading, setLoading]   = useState(false);
    const [success, setSuccess]   = useState('');
    const [error, setError]       = useState('');

    // ---- Liste + Recherche ----
    const [users, setUsers]       = useState([]);
    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError]     = useState('');
    const [search, setSearch]     = useState('');

    // ---- Modal Modification ----
    const [editUser, setEditUser] = useState(null); // { email, nom, prenom, role }
    const [editNom, setEditNom]   = useState('');
    const [editPrenom, setEditPrenom] = useState('');
    const [editRole, setEditRole] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editLoading, setEditLoading]   = useState(false);
    const [editSuccess, setEditSuccess]   = useState('');
    const [editError, setEditError]       = useState('');

    // ---- Confirmation Suppression ----
    const [deleteConfirm, setDeleteConfirm] = useState(null); // email à supprimer
    const [deleteLoading, setDeleteLoading] = useState(false);

    const ROLES = {
        etudiant:   { label:'Étudiant',    color:'#3b82f6', icon:'fa-user-graduate' },
        enseignant: { label:'Enseignant',  color:'#10b981', icon:'fa-chalkboard-teacher' },
        admin:      { label:'Admin',       color:'#f59e0b', icon:'fa-user-shield' },
    };

    const authHdr = { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` };

    // ---- Création ----
    const handleCreate = async (e) => {
        e.preventDefault();
        setSuccess(''); setError(''); setLoading(true);
        try {
            const res = await fetch(`${API.ADMIN}/users/`, {
                method:'POST', headers: authHdr,
                body: JSON.stringify({ nom, prenom, email, role })
            });
            if (res.ok) {
                setSuccess(`Compte "${prenom} ${nom}" créé avec succès !`);
                setNom(''); setPrenom(''); setEmail(''); setRole('etudiant');
                if (tab === 'list') fetchUsers();
            } else {
                const e2 = await res.json().catch(() => ({}));
                setError(res.status === 403 ? "Accès refusé : rôle 'admin' requis." : e2.detail || `Erreur ${res.status}`);
            }
        } catch { setError("Service d'administration indisponible."); }
        setLoading(false);
    };

    // ---- Liste ----
    const fetchUsers = async () => {
        setListLoading(true); setListError('');
        try {
            const res = await fetch(`${API.ADMIN}/users/`, { headers: authHdr });
            if (res.ok) {
                const data = await res.json();
                setUsers(data.utilisateurs || []);
            } else {
                const e2 = await res.json().catch(() => ({}));
                setListError(e2.detail || "Erreur de chargement.");
            }
        } catch { setListError("Service indisponible."); }
        setListLoading(false);
    };

    useEffect(() => { if (tab === 'list') fetchUsers(); }, [tab]);

    const filteredUsers = users.filter(u => {
        const q = search.toLowerCase();
        return !q || u.nom?.toLowerCase().includes(q) || u.prenom?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    });

    // ---- Modification ----
    const openEdit = (u) => {
        setEditUser(u);
        setEditNom(u.nom || '');
        setEditPrenom(u.prenom || '');
        setEditRole(u.role || 'etudiant');
        setEditPassword('');
        setEditSuccess(''); setEditError('');
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        setEditLoading(true); setEditSuccess(''); setEditError('');
        const body = { nom: editNom, prenom: editPrenom, role: editRole };
        if (editPassword.trim()) body.password = editPassword.trim();
        try {
            const res = await fetch(`${API.ADMIN}/users/${encodeURIComponent(editUser.email)}`, {
                method:'PUT', headers: authHdr, body: JSON.stringify(body)
            });
            if (res.ok) {
                setEditSuccess("Compte modifié avec succès !");
                setUsers(prev => prev.map(u => u.email === editUser.email
                    ? { ...u, nom: editNom, prenom: editPrenom, role: editRole }
                    : u));
                setTimeout(() => setEditUser(null), 1500);
            } else {
                const e2 = await res.json().catch(() => ({}));
                setEditError(e2.detail || `Erreur ${res.status}`);
            }
        } catch { setEditError("Service indisponible."); }
        setEditLoading(false);
    };

    // ---- Suppression ----
    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setDeleteLoading(true);
        try {
            const res = await fetch(`${API.ADMIN}/users/${encodeURIComponent(deleteConfirm)}`, {
                method:'DELETE', headers: authHdr
            });
            if (res.ok) {
                setUsers(prev => prev.filter(u => u.email !== deleteConfirm));
                setDeleteConfirm(null);
            } else {
                const e2 = await res.json().catch(() => ({}));
                alert(e2.detail || "Erreur suppression.");
            }
        } catch { alert("Service indisponible."); }
        setDeleteLoading(false);
    };

    // ---- Sélecteur de rôle réutilisable ----
    const RoleSelector = ({ value, onChange, name }) => (
        <div style={{display:"flex", gap:"0.6rem"}}>
            {Object.entries(ROLES).map(([r, info]) => (
                <label key={r} style={{
                    flex:1, display:"flex", flexDirection:"column", alignItems:"center",
                    gap:"0.3rem", padding:"0.6rem",
                    border:`2px solid ${value === r ? info.color : '#e2e8f0'}`,
                    borderRadius:"10px", cursor:"pointer",
                    background: value === r ? `${info.color}18` : 'white',
                    transition:"all 0.2s"
                }}>
                    <input type="radio" name={name} value={r} checked={value === r}
                           onChange={() => onChange(r)} style={{display:"none"}} />
                    <i className={`fas ${info.icon}`} style={{fontSize:"1.1rem", color:info.color}}></i>
                    <span style={{fontSize:"0.73rem", fontWeight:"700", color: value === r ? info.color : '#64748b'}}>
                        {info.label}
                    </span>
                </label>
            ))}
        </div>
    );

    return (
        <div style={{padding:"2rem", maxWidth:"1200px", margin:"0 auto"}}>

            {/* En-tête */}
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.5rem"}}>
                <div>
                    <h2 style={{color:"var(--primary-blue)", fontSize:"1.4rem", marginBottom:"0.25rem"}}>
                        <i className="fas fa-users-cog"></i> Administration – Gestion des Utilisateurs
                    </h2>
                    <p style={{color:"var(--text-light)", fontSize:"0.875rem"}}>
                        Créez, modifiez et supprimez des comptes. Synchronisé avec Keycloak + Cassandra.
                    </p>
                </div>
                <button onClick={onBack} className="login-btn"
                        style={{background:"#64748b", padding:"0.5rem 1.25rem", width:"auto", flexShrink:0}}>
                    <i className="fas fa-arrow-left"></i> Retour
                </button>
            </div>

            {/* Onglets */}
            <div style={{display:"flex", gap:"0", marginBottom:"1.5rem", background:"#f1f5f9",
                         borderRadius:"10px", padding:"4px"}}>
                {[
                    { key:'create', icon:'fa-user-plus', label:'Créer un compte' },
                    { key:'list',   icon:'fa-users',     label:'Liste des utilisateurs' },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        flex:1, padding:"0.6rem 1rem", border:"none", borderRadius:"8px", cursor:"pointer",
                        background: tab === t.key ? "white" : "transparent",
                        color: tab === t.key ? "var(--primary-blue)" : "var(--text-light)",
                        fontWeight: tab === t.key ? "700" : "500",
                        fontSize:"0.875rem",
                        boxShadow: tab === t.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                        transition:"all 0.2s"
                    }}>
                        <i className={`fas ${t.icon}`}></i> {t.label}
                    </button>
                ))}
            </div>

            {/* ===== ONGLET CRÉATION ===== */}
            {tab === 'create' && (
                <div style={{background:"white", borderRadius:"12px", padding:"1.75rem",
                             boxShadow:"0 2px 12px rgba(0,0,0,0.08)", border:"1px solid var(--border)",
                             maxWidth:"580px"}}>
                    <h3 style={{marginBottom:"1.25rem", color:"var(--text-dark)",
                                borderBottom:"1px solid var(--border)", paddingBottom:"0.75rem"}}>
                        <i className="fas fa-user-plus" style={{color:"var(--primary-blue)"}}></i> Nouveau compte
                    </h3>
                    {success && <div style={{background:"#f0fdf4", color:"#16a34a", border:"1px solid #bbf7d0",
                                            borderRadius:"8px", padding:"0.75rem", marginBottom:"1rem", fontSize:"0.875rem"}}>
                        <i className="fas fa-check-circle"></i> {success}
                    </div>}
                    {error && <div className="error-message" style={{marginBottom:"1rem"}}>
                        <i className="fas fa-exclamation-triangle"></i> {error}
                    </div>}
                    <form onSubmit={handleCreate}>
                        <div style={{marginBottom:"1.25rem"}}>
                            <label style={{display:"block", fontWeight:"600", fontSize:"0.85rem",
                                           marginBottom:"0.5rem", color:"var(--text-dark)"}}>
                                Type d'utilisateur :
                            </label>
                            <RoleSelector value={role} onChange={setRole} name="create-role" />
                        </div>
                        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem"}}>
                            <div className="input-group" style={{marginBottom:0}}>
                                <label>Nom :</label>
                                <input type="text" value={nom} onChange={e => setNom(e.target.value)}
                                       placeholder="Ex: Alaoui" required disabled={loading} />
                            </div>
                            <div className="input-group" style={{marginBottom:0}}>
                                <label>Prénom :</label>
                                <input type="text" value={prenom} onChange={e => setPrenom(e.target.value)}
                                       placeholder="Ex: Mohammed" required disabled={loading} />
                            </div>
                        </div>
                        <div className="input-group" style={{marginTop:"0.75rem"}}>
                            <label>Email (= identifiant de connexion) :</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                   placeholder="m.alaoui@est.ac.ma" required disabled={loading} />
                        </div>
                        <div style={{background:"#fefce8", border:"1px solid #fde68a", borderRadius:"8px",
                                     padding:"0.65rem 0.9rem", fontSize:"0.82rem", color:"#92400e", marginBottom:"1.25rem"}}>
                            <i className="fas fa-key"></i> Mot de passe par défaut : <strong>azerty123</strong>
                        </div>
                        <button type="submit" className="login-btn" disabled={loading} style={{width:"100%"}}>
                            {loading
                                ? <span><i className="fas fa-spinner fa-spin"></i> Création...</span>
                                : <span><i className="fas fa-user-plus"></i> Créer le compte</span>}
                        </button>
                    </form>
                </div>
            )}

            {/* ===== ONGLET LISTE ===== */}
            {tab === 'list' && (
                <div>
                    {/* Barre de recherche */}
                    <div style={{display:"flex", gap:"0.75rem", marginBottom:"1.25rem", alignItems:"center"}}>
                        <div style={{flex:1, display:"flex", alignItems:"center", gap:"0.5rem",
                                     background:"white", border:"1.5px solid var(--border)", borderRadius:"10px",
                                     padding:"0.6rem 1rem"}}>
                            <i className="fas fa-search" style={{color:"#94a3b8"}}></i>
                            <input type="text" placeholder="Rechercher par nom, prénom ou email..."
                                   value={search} onChange={e => setSearch(e.target.value)}
                                   style={{border:"none", outline:"none", flex:1, fontSize:"0.9rem",
                                           fontFamily:"inherit", color:"var(--text-dark)"}} />
                            {search && <button onClick={() => setSearch('')}
                                               style={{background:"none", border:"none", cursor:"pointer", color:"#94a3b8"}}>
                                <i className="fas fa-times"></i>
                            </button>}
                        </div>
                        <button onClick={fetchUsers} className="login-btn"
                                style={{width:"auto", padding:"0.6rem 1.25rem"}} disabled={listLoading}>
                            <i className={`fas fa-sync-alt ${listLoading ? 'fa-spin' : ''}`}></i> Actualiser
                        </button>
                    </div>

                    {listError && <div className="error-message" style={{marginBottom:"1rem"}}>
                        <i className="fas fa-exclamation-triangle"></i> {listError}
                    </div>}

                    {listLoading ? (
                        <div style={{textAlign:"center", padding:"3rem", color:"#94a3b8"}}>
                            <i className="fas fa-spinner fa-spin fa-2x"></i>
                            <p style={{marginTop:"1rem"}}>Chargement depuis Cassandra...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div style={{textAlign:"center", padding:"3rem", color:"#94a3b8", background:"white",
                                     borderRadius:"12px", border:"1px solid var(--border)"}}>
                            <i className="fas fa-users-slash fa-2x" style={{marginBottom:"0.75rem", display:"block"}}></i>
                            <p>{search ? `Aucun résultat pour "${search}"` : "Aucun utilisateur dans Cassandra."}</p>
                        </div>
                    ) : (
                        <div>
                            <p style={{color:"var(--text-light)", fontSize:"0.82rem", marginBottom:"0.75rem"}}>
                                {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} trouvé{filteredUsers.length > 1 ? 's' : ''}
                            </p>
                            <div style={{display:"flex", flexDirection:"column", gap:"0.6rem"}}>
                                {filteredUsers.map(u => (
                                    <div key={u.email} style={{
                                        background:"white", border:"1px solid var(--border)", borderRadius:"10px",
                                        padding:"1rem 1.25rem", display:"flex", alignItems:"center", gap:"0.75rem",
                                        boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                                        {/* Avatar */}
                                        <div style={{width:"42px", height:"42px", borderRadius:"50%",
                                                     background: ROLES[u.role]?.color || '#64748b',
                                                     display:"flex", alignItems:"center", justifyContent:"center",
                                                     color:"white", fontSize:"1.1rem", flexShrink:0}}>
                                            <i className={`fas ${ROLES[u.role]?.icon || 'fa-user'}`}></i>
                                        </div>
                                        {/* Infos */}
                                        <div style={{flex:1, minWidth:0}}>
                                            <div style={{fontWeight:"700", fontSize:"0.95rem", color:"var(--text-dark)"}}>
                                                {u.prenom} {u.nom}
                                            </div>
                                            <div style={{fontSize:"0.8rem", color:"var(--text-light)",
                                                         overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                                                {u.email}
                                            </div>
                                        </div>
                                        {/* Badge rôle */}
                                        <span style={{
                                            background:`${ROLES[u.role]?.color || '#64748b'}18`,
                                            color: ROLES[u.role]?.color || '#64748b',
                                            padding:"0.2rem 0.6rem", borderRadius:"20px",
                                            fontSize:"0.75rem", fontWeight:"700", flexShrink:0
                                        }}>
                                            {ROLES[u.role]?.label || u.role}
                                        </span>
                                        {/* Actions */}
                                        <div style={{display:"flex", gap:"0.4rem", flexShrink:0}}>
                                            <button onClick={() => openEdit(u)} style={{
                                                background:"#eff6ff", color:"#3b82f6",
                                                border:"1px solid #bfdbfe", borderRadius:"8px",
                                                padding:"0.4rem 0.75rem", cursor:"pointer", fontSize:"0.8rem",
                                                fontWeight:"600", transition:"all 0.2s"
                                            }}>
                                                <i className="fas fa-edit"></i> Modifier
                                            </button>
                                            <button onClick={() => setDeleteConfirm(u.email)} style={{
                                                background:"#fef2f2", color:"#ef4444",
                                                border:"1px solid #fecaca", borderRadius:"8px",
                                                padding:"0.4rem 0.75rem", cursor:"pointer", fontSize:"0.8rem",
                                                fontWeight:"600", transition:"all 0.2s"
                                            }}>
                                                <i className="fas fa-trash-alt"></i> Supprimer
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ===== MODAL MODIFICATION ===== */}
            {editUser && (
                <div style={{
                    position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
                    display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000,
                    padding:"1rem"
                }}>
                    <div style={{background:"white", borderRadius:"16px", padding:"2rem",
                                 width:"100%", maxWidth:"500px", boxShadow:"0 24px 60px rgba(0,0,0,0.25)",
                                 animation:"slideUp 0.25s ease-out"}}>
                        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem"}}>
                            <h3 style={{color:"var(--text-dark)", fontSize:"1.1rem"}}>
                                <i className="fas fa-user-edit" style={{color:"var(--primary-blue)"}}></i> Modifier le compte
                            </h3>
                            <button onClick={() => setEditUser(null)} style={{
                                background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:"1.2rem"
                            }}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div style={{background:"#f8fafc", borderRadius:"8px", padding:"0.6rem 0.9rem",
                                     fontSize:"0.82rem", color:"var(--text-light)", marginBottom:"1.25rem"}}>
                            <i className="fas fa-envelope"></i> {editUser.email}
                        </div>

                        {editSuccess && <div style={{background:"#f0fdf4", color:"#16a34a", border:"1px solid #bbf7d0",
                                                     borderRadius:"8px", padding:"0.75rem", marginBottom:"1rem", fontSize:"0.875rem"}}>
                            <i className="fas fa-check-circle"></i> {editSuccess}
                        </div>}
                        {editError && <div className="error-message" style={{marginBottom:"1rem"}}>
                            <i className="fas fa-exclamation-triangle"></i> {editError}
                        </div>}

                        <form onSubmit={handleEdit}>
                            <div style={{marginBottom:"1rem"}}>
                                <label style={{display:"block", fontWeight:"600", fontSize:"0.85rem",
                                               marginBottom:"0.5rem", color:"var(--text-dark)"}}>
                                    Rôle :
                                </label>
                                <RoleSelector value={editRole} onChange={setEditRole} name="edit-role" />
                            </div>
                            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem"}}>
                                <div className="input-group" style={{marginBottom:0}}>
                                    <label>Nom :</label>
                                    <input type="text" value={editNom} onChange={e => setEditNom(e.target.value)}
                                           required disabled={editLoading} />
                                </div>
                                <div className="input-group" style={{marginBottom:0}}>
                                    <label>Prénom :</label>
                                    <input type="text" value={editPrenom} onChange={e => setEditPrenom(e.target.value)}
                                           required disabled={editLoading} />
                                </div>
                            </div>
                            <div className="input-group" style={{marginTop:"0.75rem"}}>
                                <label>Nouveau mot de passe (laisser vide = inchangé) :</label>
                                <input type="password" value={editPassword}
                                       onChange={e => setEditPassword(e.target.value)}
                                       placeholder="••••••••  (optionnel)"
                                       disabled={editLoading} />
                            </div>
                            <div style={{display:"flex", gap:"0.75rem", marginTop:"1.25rem"}}>
                                <button type="submit" className="login-btn" disabled={editLoading} style={{flex:1}}>
                                    {editLoading
                                        ? <span><i className="fas fa-spinner fa-spin"></i> Enregistrement...</span>
                                        : <span><i className="fas fa-save"></i> Enregistrer</span>}
                                </button>
                                <button type="button" onClick={() => setEditUser(null)} className="login-btn"
                                        style={{flex:1, background:"#64748b"}} disabled={editLoading}>
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== MODAL CONFIRMATION SUPPRESSION ===== */}
            {deleteConfirm && (
                <div style={{
                    position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
                    display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, padding:"1rem"
                }}>
                    <div style={{background:"white", borderRadius:"16px", padding:"2rem",
                                 width:"100%", maxWidth:"420px", boxShadow:"0 24px 60px rgba(0,0,0,0.25)",
                                 textAlign:"center"}}>
                        <i className="fas fa-exclamation-triangle" style={{fontSize:"2.5rem", color:"#ef4444", marginBottom:"1rem"}}></i>
                        <h3 style={{marginBottom:"0.75rem", color:"var(--text-dark)"}}>Confirmer la suppression</h3>
                        <p style={{color:"var(--text-light)", marginBottom:"0.5rem", fontSize:"0.9rem"}}>
                            Vous allez supprimer définitivement le compte :
                        </p>
                        <p style={{fontWeight:"700", color:"#ef4444", marginBottom:"1.5rem", wordBreak:"break-all"}}>
                            {deleteConfirm}
                        </p>
                        <p style={{color:"#94a3b8", fontSize:"0.82rem", marginBottom:"1.5rem"}}>
                            Cette action supprime l'utilisateur de <strong>Keycloak</strong> et de <strong>Cassandra</strong>. Irréversible.
                        </p>
                        <div style={{display:"flex", gap:"0.75rem"}}>
                            <button onClick={() => setDeleteConfirm(null)} className="login-btn"
                                    style={{flex:1, background:"#64748b"}} disabled={deleteLoading}>
                                Annuler
                            </button>
                            <button onClick={handleDelete} className="login-btn"
                                    style={{flex:1, background:"#ef4444"}} disabled={deleteLoading}>
                                {deleteLoading
                                    ? <span><i className="fas fa-spinner fa-spin"></i> Suppression...</span>
                                    : <span><i className="fas fa-trash-alt"></i> Confirmer</span>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================
// Composant ProfileModal – Changer son mot de passe
// =============================================
function ProfileModal({ token, onClose }) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true); setMsg(''); setErr('');
        try {
            const res = await fetch(`${API.ADMIN}/profile/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password })
            });
            if (res.ok) {
                setMsg("Mot de passe mis à jour avec succès !");
                setTimeout(onClose, 2000);
            } else {
                const e2 = await res.json().catch(() => ({}));
                setErr(e2.detail || "Erreur lors de la mise à jour.");
            }
        } catch { setErr("Service indisponible."); }
        setLoading(false);
    };

    return (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
                     display:"flex", alignItems:"center", justifyContent:"center", zIndex:3000}}>
            <div style={{background:"white", borderRadius:"16px", padding:"2rem", width:"100%", maxWidth:"400px",
                         boxShadow:"0 20px 50px rgba(0,0,0,0.3)", animation:"slideUp 0.2s ease-out"}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem"}}>
                    <h3 style={{color:"var(--text-dark)"}}>Mon Profil</h3>
                    <button onClick={onClose} style={{background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:"1.2rem"}}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <p style={{fontSize:"0.875rem", color:"var(--text-light)", marginBottom:"1.25rem"}}>
                    Modifiez votre mot de passe pour sécuriser votre compte.
                </p>

                {msg && <div style={{background:"#f0fdf4", color:"#16a34a", border:"1px solid #bbf7d0",
                                     borderRadius:"8px", padding:"0.75rem", marginBottom:"1rem", fontSize:"0.875rem"}}>
                    <i className="fas fa-check-circle"></i> {msg}
                </div>}
                {err && <div className="error-message" style={{marginBottom:"1rem"}}>
                    <i className="fas fa-exclamation-triangle"></i> {err}
                </div>}

                <form onSubmit={handleUpdate}>
                    <div className="input-group">
                        <label>Nouveau mot de passe :</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                               placeholder="••••••••" required disabled={loading} />
                    </div>
                    <button type="submit" className="login-btn" style={{marginTop:"0.5rem"}} disabled={loading}>
                        {loading ? <i className="fas fa-spinner fa-spin"></i> : "Mettre à jour"}
                    </button>
                </form>
            </div>
        </div>
    );
}

// =============================================
// VUE ÉTUDIANT
// Uniquement : liste des cours + chatbot
// =============================================
function EtudiantView({ token, onLogout }) {
    const [showProfile, setShowProfile] = useState(false);
    return (
        <div style={{minHeight:"100vh", background:"var(--bg-page)"}}>
            {showProfile && <ProfileModal token={token} onClose={() => setShowProfile(false)} />}
            <div className="dashboard-navbar">
                <div className="nav-item active"><i className="fas fa-graduation-cap"></i> Mes Cours</div>
                <div className="nav-item" onClick={() => setShowProfile(true)} style={{marginLeft:"auto"}}>
                    <i className="fas fa-user-circle"></i> Profil
                </div>
                <div className="nav-item" onClick={onLogout} style={{color:"#ef4444", cursor:"pointer"}}>
                    <i className="fas fa-sign-out-alt"></i> Déconnexion
                </div>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:"0.5rem",
                         padding:"1rem 2rem", background:"#eff6ff", borderBottom:"1px solid #dbeafe"}}>
                <span style={{background:"#3b82f6", color:"white", padding:"0.2rem 0.75rem",
                              borderRadius:"20px", fontSize:"0.78rem", fontWeight:"700"}}>
                    <i className="fas fa-user-graduate"></i> ÉTUDIANT
                </span>
                <span style={{color:"var(--text-light)", fontSize:"0.85rem"}}>
                    Vous avez accès à la liste des cours disponibles.
                </span>
            </div>
            <CoursPanel token={token} canUpload={false} />
            <Chatbot token={token} />
        </div>
    );
}

// =============================================
// VUE ENSEIGNANT
// Liste des cours + upload + chatbot
// =============================================
function EnseignantView({ token, onLogout }) {
    const [showProfile, setShowProfile] = useState(false);
    return (
        <div style={{minHeight:"100vh", background:"var(--bg-page)"}}>
            {showProfile && <ProfileModal token={token} onClose={() => setShowProfile(false)} />}
            <div className="dashboard-navbar">
                <div className="nav-item active"><i className="fas fa-chalkboard-teacher"></i> Mes Cours</div>
                <div className="nav-item" onClick={() => setShowProfile(true)} style={{marginLeft:"auto"}}>
                    <i className="fas fa-user-circle"></i> Profil
                </div>
                <div className="nav-item" onClick={onLogout} style={{color:"#ef4444", cursor:"pointer"}}>
                    <i className="fas fa-sign-out-alt"></i> Déconnexion
                </div>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:"0.5rem",
                         padding:"1rem 2rem", background:"#f0fdf4", borderBottom:"1px solid #bbf7d0"}}>
                <span style={{background:"#10b981", color:"white", padding:"0.2rem 0.75rem",
                              borderRadius:"20px", fontSize:"0.78rem", fontWeight:"700"}}>
                    <i className="fas fa-chalkboard-teacher"></i> ENSEIGNANT
                </span>
                <span style={{color:"var(--text-light)", fontSize:"0.85rem"}}>
                    Vous pouvez consulter et publier des cours.
                </span>
            </div>
            <CoursPanel token={token} canUpload={true} />
            <Chatbot token={token} />
        </div>
    );
}

// =============================================
// VUE ADMIN – Dashboard complet
// Tous les modules + Pannel Admin + chatbot
// =============================================

function PlaceholderPanel({ title, subtitle, icon, color, onBack }) {
    return (
        <div style={{padding:"2rem", maxWidth:"1200px", margin:"0 auto"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem"}}>
                <div>
                    <h1 style={{fontSize:"2rem", fontWeight:"800", color:"var(--primary)", display:"flex", alignItems:"center", gap:"0.75rem"}}>
                        <i className={`fas ${icon}`}></i> {title}
                    </h1>
                    <p style={{color:"var(--text-light)", marginTop:"0.35rem"}}>
                        {subtitle}
                    </p>
                </div>

                <button
                    onClick={onBack}
                    style={{
                        background:"#64748b",
                        color:"white",
                        border:"none",
                        borderRadius:"12px",
                        padding:"0.9rem 1.4rem",
                        fontWeight:"700",
                        cursor:"pointer"
                    }}
                >
                    <i className="fas fa-arrow-left"></i> Retour
                </button>
            </div>

            <div style={{
                background:"white",
                border:"1px solid var(--border)",
                borderRadius:"16px",
                padding:"2rem",
                boxShadow:"0 2px 10px rgba(0,0,0,0.06)"
            }}>
                <div style={{
                    display:"flex",
                    alignItems:"center",
                    gap:"1rem",
                    marginBottom:"1rem"
                }}>
                    <div style={{
                        width:"64px",
                        height:"64px",
                        borderRadius:"50%",
                        background:color,
                        color:"white",
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"center",
                        fontSize:"1.5rem"
                    }}>
                        <i className={`fas ${icon}`}></i>
                    </div>

                    <div>
                        <h2 style={{margin:0, fontSize:"1.35rem", color:"var(--text-dark)"}}>
                            Module accessible
                        </h2>
                        <p style={{margin:"0.35rem 0 0 0", color:"var(--text-light)"}}>
                            Cette page est un écran rapide de démonstration.
                        </p>
                    </div>
                </div>

                <div style={{
                    marginTop:"1.5rem",
                    background:"#f8fafc",
                    border:"1px dashed #cbd5e1",
                    borderRadius:"12px",
                    padding:"1.25rem",
                    color:"#475569"
                }}>
                    <strong>{title}</strong> fonctionne côté interface.
                    <br />
                    Le backend complet de ce module n'est pas encore développé.
                </div>
            </div>
        </div>
    );
}

function AdminView({ token, onLogout }) {
    const [currentView, setCurrentView] = useState('dashboard');
    const [showProfile, setShowProfile] = useState(false);

    const modules = [
        { title:"Messagerie",             desc:"Messagerie électronique des étudiants.",      icon:"fa-envelope",       color:"#3b82f6", view:"messagerie" },
        { title:"Notes",                  desc:"Consulter vos notes aux épreuves.",            icon:"fa-file-alt",       color:"#8b5cf6", view:"notes" },
        { title:"Calendrier des examens", desc:"Consulter le calendrier des examens.",         icon:"fa-calendar-alt",   color:"#06b6d4", view:"calendrier" },
        { title:"Demande d'intervention", desc:"Assistance aux utilisateurs.",                 icon:"fa-tools",          color:"#f59e0b", view:"intervention" },
        { title:"Cours en ligne",         desc:"Accéder à la plateforme pédagogique.",         icon:"fa-graduation-cap", color:"#10b981", view:"cours" },
        { title:"Assistance ENT",         desc:"FAQ sur l'Environnement Numérique de Travail.",icon:"fa-life-ring",     color:"#ef4444", view:"assistance" },
        { title:"Administration",         desc:"Gérer les comptes étudiants et enseignants.",  icon:"fa-users-cog",      color:"#f97316", view:"admin" },
    ];

    const openModule = (view) => {
        setCurrentView(view);
    };

    return (
        <div style={{minHeight:"100vh", background:"var(--bg-page)"}}>
            {showProfile && <ProfileModal token={token} onClose={() => setShowProfile(false)} />}

            <div className="dashboard-navbar">
                <div
                    className={`nav-item ${currentView==='dashboard'?'active':''}`}
                    onClick={() => setCurrentView('dashboard')}
                >
                    <i className="fas fa-home"></i> Accueil
                </div>

                <div
                    className={`nav-item ${currentView==='inscriptions'?'active':''}`}
                    onClick={() => setCurrentView('inscriptions')}
                >
                    <i className="fas fa-user-edit"></i> Inscriptions
                </div>

                <div
                    className={`nav-item ${currentView==='scolarite'?'active':''}`}
                    onClick={() => setCurrentView('scolarite')}
                >
                    <i className="fas fa-book"></i> Scolarité
                </div>

                <div
                    className={`nav-item ${currentView==='cours'?'active':''}`}
                    onClick={() => setCurrentView('cours')}
                >
                    <i className="fas fa-laptop-code"></i> Cours
                </div>

                <div
                    className={`nav-item ${currentView==='admin'?'active':''}`}
                    onClick={() => setCurrentView('admin')}
                >
                    <i className="fas fa-users-cog"></i> Administration
                </div>

                <div className="nav-item" onClick={() => setShowProfile(true)} style={{marginLeft:"auto"}}>
                    <i className="fas fa-user-circle"></i> Profil
                </div>

                <div className="nav-item" onClick={onLogout} style={{color:"#ef4444", cursor:"pointer"}}>
                    <i className="fas fa-sign-out-alt"></i> Déconnexion
                </div>
            </div>

            <div style={{
                display:"flex",
                alignItems:"center",
                gap:"0.5rem",
                padding:"1rem 2rem",
                background:"#fff7ed",
                borderBottom:"1px solid #fed7aa"
            }}>
                <span style={{
                    background:"#f97316",
                    color:"white",
                    padding:"0.2rem 0.75rem",
                    borderRadius:"20px",
                    fontSize:"0.78rem",
                    fontWeight:"700"
                }}>
                    <i className="fas fa-user-shield"></i> ADMINISTRATEUR
                </span>
                <span style={{color:"var(--text-light)", fontSize:"0.85rem"}}>
                    Accès complet à tous les modules de l'ENT.
                </span>
            </div>

            {currentView === 'dashboard' && (
                <div className="dashboard-container">
                    <div className="cards-grid">
                        {modules.map((mod, idx) => (
                            <div
                                key={idx}
                                className="module-card"
                                onClick={() => openModule(mod.view)}
                                style={{cursor:'pointer'}}
                            >
                                <div className="card-header">
                                    <span>{mod.title}</span>
                                    <span>Options <i className="fas fa-caret-down"></i></span>
                                </div>

                                <div
                                    className="card-banner"
                                    style={{background:`linear-gradient(135deg, ${mod.color}18, ${mod.color}30)`}}
                                >
                                    <div className="icon-circle" style={{background:mod.color}}>
                                        <i className={`fas ${mod.icon}`}></i>
                                    </div>
                                </div>

                                <div className="card-content">
                                    <h3>{mod.title}</h3>
                                    <p>{mod.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {currentView === 'cours' && (
                <CoursPanel token={token} canUpload={true} />
            )}

            {currentView === 'admin' && (
                <AdminPanel token={token} onBack={() => setCurrentView('dashboard')} />
            )}

            {currentView === 'messagerie' && (
                <PlaceholderPanel
                    title="Messagerie"
                    subtitle="Messagerie électronique des étudiants."
                    icon="fa-envelope"
                    color="#3b82f6"
                    onBack={() => setCurrentView('dashboard')}
                />
            )}

            {currentView === 'notes' && (
                <PlaceholderPanel
                    title="Notes"
                    subtitle="Consultation des notes et résultats."
                    icon="fa-file-alt"
                    color="#8b5cf6"
                    onBack={() => setCurrentView('dashboard')}
                />
            )}

            {currentView === 'calendrier' && (
                <PlaceholderPanel
                    title="Calendrier des examens"
                    subtitle="Consultation du calendrier des examens."
                    icon="fa-calendar-alt"
                    color="#06b6d4"
                    onBack={() => setCurrentView('dashboard')}
                />
            )}

            {currentView === 'intervention' && (
                <PlaceholderPanel
                    title="Demande d'intervention"
                    subtitle="Suivi des demandes d'assistance."
                    icon="fa-tools"
                    color="#f59e0b"
                    onBack={() => setCurrentView('dashboard')}
                />
            )}

            {currentView === 'assistance' && (
                <PlaceholderPanel
                    title="Assistance ENT"
                    subtitle="FAQ et aide rapide pour l'ENT."
                    icon="fa-life-ring"
                    color="#ef4444"
                    onBack={() => setCurrentView('dashboard')}
                />
            )}

            {currentView === 'inscriptions' && (
                <PlaceholderPanel
                    title="Inscriptions"
                    subtitle="Gestion rapide des inscriptions."
                    icon="fa-user-edit"
                    color="#2563eb"
                    onBack={() => setCurrentView('dashboard')}
                />
            )}

            {currentView === 'scolarite' && (
                <PlaceholderPanel
                    title="Scolarité"
                    subtitle="Informations de scolarité."
                    icon="fa-book"
                    color="#4f46e5"
                    onBack={() => setCurrentView('dashboard')}
                />
            )}

            <Chatbot token={token} />
        </div>
    );
}

// =============================================
// Composant racine App – routage par rôle
// =============================================
function App() {
    const [token, setToken] = useState(() => sessionStorage.getItem('ent_token') || null);
    const [view, setView]   = useState('login'); // 'login' | 'forgot'

    const handleLogin = (accessToken) => {
        sessionStorage.setItem('ent_token', accessToken);
        setToken(accessToken);
    };

    const handleLogout = () => {
        sessionStorage.removeItem('ent_token');
        setToken(null);
    };

    // Décodage du JWT pour extraire les rôles (côté client, lecture seulement)
    const roles       = token ? getRolesFromToken(token) : [];
    const primaryRole = getPrimaryRole(roles);

    if (!token) {
        return view === 'login' 
            ? <Login onLogin={handleLogin} onForgot={() => setView('forgot')} />
            : <ForgotPasswordForm onBack={() => setView('login')} />;
    }

    switch (primaryRole) {
        case 'admin':
            return <AdminView token={token} onLogout={handleLogout} />;
        case 'enseignant':
            return <EnseignantView token={token} onLogout={handleLogout} />;
        case 'etudiant':
            return <EtudiantView token={token} onLogout={handleLogout} />;
        default:
            // Rôle inconnu ou non assigné dans ent-realm
            return (
                <div style={{minHeight:"100vh", display:"flex", alignItems:"center",
                             justifyContent:"center", background:"var(--bg-page)", flexDirection:"column", gap:"1rem"}}>
                    <div style={{background:"white", padding:"2.5rem", borderRadius:"16px",
                                 boxShadow:"0 4px 24px rgba(0,0,0,0.1)", textAlign:"center", maxWidth:"480px"}}>
                        <i className="fas fa-exclamation-circle" style={{fontSize:"3rem", color:"#f59e0b", marginBottom:"1rem"}}></i>
                        <h2 style={{marginBottom:"0.75rem"}}>Aucun rôle assigné</h2>
                        <p style={{color:"var(--text-light)", marginBottom:"1.5rem", lineHeight:"1.6"}}>
                            Votre compte n'a pas encore de rôle attribué dans <strong>ent-realm</strong>.
                            Contactez l'administrateur pour qu'il vous assigne le rôle
                            <strong> etudiant</strong>, <strong>enseignant</strong> ou <strong>admin</strong>.
                        </p>
                        <p style={{fontSize:"0.82rem", color:"#94a3b8", marginBottom:"1.5rem"}}>
                            Rôles détectés dans votre token : [{roles.join(', ') || 'aucun'}]
                        </p>
                        <button onClick={handleLogout} className="login-btn">
                            <i className="fas fa-sign-out-alt"></i> Se déconnecter
                        </button>
                    </div>
                </div>
            );
    }
}

// =============================================
// Point d'entrée React 18
// =============================================
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
