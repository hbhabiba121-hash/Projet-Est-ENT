import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, coursService } from '../services/api';
import { getUsers, createUser, deleteUser } from '../services/adminService';
import './Dashboard.css';

const MINIO = 'http://localhost:9000/courses/';
const GDOCS = 'https://docs.google.com/viewer?embedded=true&url=';

function getMinioUrl(fileUrl) {
  var fileName = fileUrl ? fileUrl.split('/').pop() : '';
  return MINIO + encodeURIComponent(fileName);
}

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', nom: '', prenom: '', role: 'etudiant' });
  const [viewingCourse, setViewingCourse] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [editMsg, setEditMsg] = useState('');

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) { navigate('/login'); return; }
    setUser(currentUser);
    setLoading(false);
    const roles = currentUser.roles || [];
    if (roles.includes('etudiant')) loadCourses('etudiant');
    if (roles.includes('enseignant')) loadCourses('enseignant');
    if (roles.includes('admin')) loadUsers(currentUser);
  }, [navigate]);

  const loadCourses = async (role) => {
    setCoursesLoading(true);
    try {
      const data = await coursService.listCourses(role);
      setCourses(data.courses || []);
    } catch (e) {
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  const loadUsers = async (currentUser) => {
    setUsersLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const data = await getUsers('Bearer ' + token);
      setUsers(data.users || []);
    } catch (e) {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadMsg('Envoi en cours...');
    try {
      await coursService.uploadCourse(uploadTitle, uploadDesc, uploadFile);
      setUploadMsg('Cours uploade avec succes !');
      setUploadTitle('');
      setUploadDesc('');
      setUploadFile(null);
      loadCourses('enseignant');
    } catch (err) {
      setUploadMsg('Erreur upload');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    await createUser(newUser, 'Bearer ' + token);
    setShowAddForm(false);
    setNewUser({ username: '', email: '', nom: '', prenom: '', role: 'etudiant' });
    loadUsers(user);
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Supprimer ce cours ?')) return;
    try {
      await coursService.deleteCourse(courseId);
      loadCourses('enseignant');
    } catch (err) {
      alert('Erreur suppression');
    }
  };
  
  const handleEditCourse = (c) => {
    console.log('Editing course:', c);
    setEditingCourse(c);
    setEditTitle(c.title);
    setEditDesc(c.description);
    setEditFile(null);
    setEditMsg('');
  };

  const handleUpdateCourse = async (e, courseId) => {
    e.preventDefault();
    console.log('Update button clicked');
    console.log('Edit File:', editFile);
    
    if (!editTitle || !editDesc) {
      setEditMsg('Le titre et la description sont requis');
      return;
    }
    
    setEditMsg('Mise à jour en cours...');
    
    try {
      const token = localStorage.getItem('access_token');
      
      // Create FormData
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('description', editDesc);
      
      // Only append file if one is selected
      if (editFile) {
        console.log('Adding file to formData:', editFile.name, editFile.type, editFile.size);
        formData.append('file', editFile);
      } else {
        console.log('No new file selected');
        // Send an empty file to indicate no change
        // formData.append('file', '');
      }
      
      // Log FormData contents for debugging
      for (let pair of formData.entries()) {
        console.log('FormData entry:', pair[0], pair[1]);
      }
      
      // Send request
      const response = await fetch(`http://localhost:8002/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      console.log('Response status:', response.status);
      
      const result = await response.json();
      console.log('Response data:', result);
      
      if (!response.ok) {
        throw new Error(result.detail || 'Erreur lors de la mise à jour');
      }
      
      if (result.file_updated) {
        setEditMsg('✓ Cours mis à jour avec succès (fichier inclus)!');
      } else {
        setEditMsg('✓ Cours mis à jour avec succès!');
      }
      
      setTimeout(() => {
        setEditingCourse(null);
        setEditMsg('');
        loadCourses('enseignant');
      }, 1500);
      
    } catch (err) {
      console.error('Update error:', err);
      setEditMsg(`✗ Erreur: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return;
    try {
      const token = localStorage.getItem('access_token');
      await deleteUser(userId, 'Bearer ' + token);
      loadUsers(user);
    } catch (err) {
      alert('Erreur suppression');
    }
  };
  
  const handleLire = async (c) => {
    var url = getMinioUrl(c.file_url);
    var response = await fetch(url);
    var blob = await response.blob();
    var blobUrl = URL.createObjectURL(blob);
    setViewingCourse({...c, blobUrl: blobUrl});
  };

  const handleLogout = () => { authService.logout(); navigate('/login'); };

  if (loading) return <div className="loading">Chargement...</div>;

  const roles = user ? (user.roles || []) : [];
  const isAdmin = roles.includes('admin');
  const isEnseignant = roles.includes('enseignant');
  const isEtudiant = roles.includes('etudiant');
  const roleLabel = isAdmin ? 'Administrateur' : isEnseignant ? 'Enseignant' : 'Etudiant';

  return (
    <div className="dashboard">
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo">EST</div>
          <div>
            <h1>ENT EST Sale</h1>
            <p>Espace Numerique de Travail</p>
          </div>
        </div>
        <div className="navbar-user">
          <div className="user-info">
            <div className="user-name">{user ? (user.name || user.username) : ''}</div>
            <div className="user-role">{roleLabel}</div>
          </div>
          <button onClick={handleLogout} className="logout-btn">Deconnexion</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-card fade-in">
          <h1>Bienvenue !</h1>
          <p>Bienvenue sur votre Espace Numerique de Travail de l EST Sale.</p>
          <div className="role-badge">{roleLabel}</div>
        </div>

        {viewingCourse && (
          <div className="welcome-card fade-in" style={{marginTop:20}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
              <h2>{viewingCourse.title}</h2>
              <button
                onClick={() => setViewingCourse(null)}
                style={{background:'#ff4444', color:'white', border:'none', padding:'6px 16px', borderRadius:4, cursor:'pointer'}}>
                Fermer
              </button>
            </div>
            <iframe
              src={viewingCourse.blobUrl}
              title={viewingCourse.title}
              style={{width:'100%', height:'700px', border:'1px solid #ddd', borderRadius:8}}
            />
          </div>
        )}

        {(isEtudiant || isEnseignant) && (
          <div className="welcome-card fade-in" style={{marginTop:20}}>
            <h2>Cours disponibles</h2>
            {coursesLoading ? (
              <p>Chargement des cours...</p>
            ) : courses.length === 0 ? (
              <p style={{color:'#888'}}>Aucun cours disponible pour le moment.</p>
            ) : (
              <table style={{width:'100%', borderCollapse:'collapse', marginTop:12}}>
                <thead>
                  <tr style={{background:'#f0f0f0'}}>
                    <th style={{padding:8, textAlign:'left'}}>Titre</th>
                    <th style={{padding:8, textAlign:'left'}}>Description</th>
                    {isEtudiant && <th style={{padding:8, textAlign:'left'}}>Professeur</th>}
                    <th style={{padding:8, textAlign:'center'}}>Actions</th>
                   </tr>
                </thead>
                <tbody>
                  {courses.map((c) => {
                    var minioUrl = getMinioUrl(c.file_url);
                    return (
                      <tr key={c.id} style={{borderBottom:'1px solid #eee'}}>
                        <td style={{padding:8}}>{c.title}</td>
                        <td style={{padding:8}}>{c.description}</td>
                        {isEtudiant && <td style={{padding:8}}>{c.teacher || 'Inconnu'}</td>}
                        <td style={{padding:8, textAlign:'center'}}>
                          <div style={{display:'flex', gap:6, justifyContent:'center'}}>
                            <a href={minioUrl} download style={{background:'#4CAF50', color:'white', padding:'6px 14px', borderRadius:4, textDecoration:'none', fontSize:13}}>Telecharger</a>
                            {isEnseignant && (
                              <>
                                <button
                                  onClick={() => handleEditCourse(c)}
                                  style={{background:'#ff9800', color:'white', border:'none', padding:'6px 14px', borderRadius:4, cursor:'pointer', fontSize:13}}>
                                  Modifier
                                </button>
                                <button
                                  onClick={() => handleDeleteCourse(c.id)}
                                  style={{background:'#ff4444', color:'white', border:'none', padding:'6px 14px', borderRadius:4, cursor:'pointer', fontSize:13}}>
                                  Supprimer
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {isEnseignant && editingCourse && (
          <div className="welcome-card fade-in" style={{marginTop:20}}>
            <h2>Modifier le cours</h2>
            <form onSubmit={(e) => handleUpdateCourse(e, editingCourse.id)} style={{display:'grid', gap:12, maxWidth:500}}>
              <input 
                value={editTitle} 
                onChange={e => setEditTitle(e.target.value)} 
                placeholder="Titre du cours" 
                required 
                style={{padding:8, border:'1px solid #ddd', borderRadius:4}} 
              />
              <input 
                value={editDesc} 
                onChange={e => setEditDesc(e.target.value)} 
                placeholder="Description" 
                required 
                style={{padding:8, border:'1px solid #ddd', borderRadius:4}} 
              />
              <div>
                <label style={{display:'block', marginBottom:8, fontWeight:'bold', color: '#333'}}>
                  Nouveau fichier (optionnel):
                </label>
                <input 
                  type="file" 
                  onChange={e => {
                    const selectedFile = e.target.files[0];
                    console.log('File selected:', selectedFile);
                    setEditFile(selectedFile);
                  }} 
                  style={{padding:8, border:'1px solid #ddd', borderRadius:4, width:'100%'}} 
                />
                {editingCourse.file_url && (
                  <p style={{fontSize:12, color:'#666', marginTop:5}}>
                    📄 Fichier actuel: {editingCourse.file_url.split('/').pop()}
                    <br />💡 Sélectionnez un nouveau fichier pour le remplacer
                  </p>
                )}
              </div>
              <div style={{display:'flex', gap:8}}>
                <button type="submit" style={{background:'#2196F3', color:'white', border:'none', padding:'10px 20px', borderRadius:4, cursor:'pointer'}}>
                  Enregistrer
                </button>
                <button type="button" onClick={() => setEditingCourse(null)} style={{background:'#888', color:'white', border:'none', padding:'10px 20px', borderRadius:4, cursor:'pointer'}}>
                  Annuler
                </button>
              </div>
              {editMsg && <p style={{marginTop:10, fontWeight:'bold', color: editMsg.includes('✓') ? 'green' : 'red'}}>{editMsg}</p>}
            </form>
          </div>
        )}

        {isEnseignant && (
          <div className="welcome-card fade-in" style={{marginTop:20}}>
            <h2>Ajouter un cours</h2>
            <form onSubmit={handleUpload} style={{display:'grid', gap:12, maxWidth:500}}>
              <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="Titre du cours" required style={{padding:8, border:'1px solid #ddd', borderRadius:4}} />
              <input value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} placeholder="Description" required style={{padding:8, border:'1px solid #ddd', borderRadius:4}} />
              <input type="file" onChange={e => setUploadFile(e.target.files[0])} required style={{padding:8}} />
              <button type="submit" style={{background:'#2196F3', color:'white', border:'none', padding:'10px', borderRadius:4, cursor:'pointer'}}>Envoyer</button>
              {uploadMsg && <p>{uploadMsg}</p>}
            </form>
          </div>
        )}

        {isAdmin && (
          <div className="welcome-card fade-in" style={{marginTop:20}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <h2>Gestion des utilisateurs</h2>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                style={{background:'#4CAF50', color:'white', border:'none', padding:'8px 16px', borderRadius:4, cursor:'pointer'}}>
                {showAddForm ? 'Fermer' : '+ Ajouter'}
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleCreateUser} style={{display:'grid', gap:10, maxWidth:400, marginTop:12, padding:16, background:'#f5f5f5', borderRadius:8}}>
                <input placeholder="Nom utilisateur" value={newUser.username} onChange={e => setNewUser({...newUser, username:e.target.value})} required style={{padding:8, border:'1px solid #ddd', borderRadius:4}} />
                <input placeholder="Email" type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email:e.target.value})} required style={{padding:8, border:'1px solid #ddd', borderRadius:4}} />
                <input placeholder="Nom" value={newUser.nom} onChange={e => setNewUser({...newUser, nom:e.target.value})} required style={{padding:8, border:'1px solid #ddd', borderRadius:4}} />
                <input placeholder="Prenom" value={newUser.prenom} onChange={e => setNewUser({...newUser, prenom:e.target.value})} required style={{padding:8, border:'1px solid #ddd', borderRadius:4}} />
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role:e.target.value})} style={{padding:8, border:'1px solid #ddd', borderRadius:4}}>
                  <option value="etudiant">Etudiant</option>
                  <option value="enseignant">Enseignant</option>
                  <option value="admin">Administrateur</option>
                </select>
                <button type="submit" style={{background:'#4CAF50', color:'white', border:'none', padding:10, borderRadius:4, cursor:'pointer'}}>Creer</button>
              </form>
            )}

            {usersLoading ? <p>Chargement...</p> : (
              <table style={{width:'100%', borderCollapse:'collapse', marginTop:12}}>
                <thead>
                  <tr style={{background:'#f0f0f0'}}>
                    <th style={{padding:8, textAlign:'left'}}>Nom</th>
                    <th style={{padding:8, textAlign:'left'}}>Prenom</th>
                    <th style={{padding:8, textAlign:'left'}}>Email</th>
                    <th style={{padding:8, textAlign:'left'}}>Role</th>
                    <th style={{padding:8, textAlign:'center'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    return (
                      <tr key={u.id} style={{borderBottom:'1px solid #eee'}}>
                        <td style={{padding:8}}>{u.nom}</td>
                        <td style={{padding:8}}>{u.prenom}</td>
                        <td style={{padding:8}}>{u.email}</td>
                        <td style={{padding:8}}>
                          <span style={{padding:'3px 8px', borderRadius:4, fontSize:12, fontWeight:'bold', background:u.role==='admin'?'#ff4444':u.role==='enseignant'?'#ffbb33':'#00C851', color:u.role==='enseignant'?'black':'white'}}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{padding:8, textAlign:'center'}}>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            style={{background:'#ff4444', color:'white', border:'none', padding:'5px 10px', borderRadius:4, cursor:'pointer'}}>
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;