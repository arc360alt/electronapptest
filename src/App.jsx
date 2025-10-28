import React, { useState, useEffect, useRef } from 'react';
import { Check, Plus, Trash2, GripVertical, Edit3, Eye, Image as ImageIcon, Settings, Download, Upload, Moon, Sun, X, Save } from 'lucide-react';
import { marked } from 'marked';

// Configure marked for safe HTML rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Persistent Storage Hook
// Simple localStorage Hook
const useLocalStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage failed:', e);
    }
  }, [key, value]);

  return [value, setValue];
  
};



// Custom Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

const NoteCard = ({ note, index, onUpdate, onDelete, workspaceTransform, containerRef }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState({ x: note.x, y: note.y });
  const [size, setSize] = useState({ width: note.width, height: note.height });
  const [isEditing, setIsEditing] = useState(note.viewMode === 'edit');
  const dragStart = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

const handleMouseDown = (e) => {
  if (e.target.closest('.note-controls') || e.target.closest('textarea') || e.target.closest('input')) {
    return;
  }
  e.stopPropagation(); // Prevent workspace panning
  setIsDragging(true);
  dragStart.current = {
    x: e.clientX,
    y: e.clientY,
    startX: position.x,
    startY: position.y
  };
  console.log('Note drag started:', dragStart.current);
};

  const handleResizeMouseDown = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    };
  };

  useEffect(() => {
const handleMouseMove = (e) => {
  if (isDragging && containerRef?.current) {
    const deltaX = (e.clientX - dragStart.current.x) / workspaceTransform.scale;
    const deltaY = (e.clientY - dragStart.current.y) / workspaceTransform.scale;
    const newX = dragStart.current.startX + deltaX;
    const newY = dragStart.current.startY + deltaY;
    
    // Constrain to workspace bounds (5000x5000)
    const maxX = 5000 - size.width;
    const maxY = 5000 - size.height;
    
    setPosition({ 
      x: Math.max(0, Math.min(newX, maxX)), 
      y: Math.max(0, Math.min(newY, maxY))
    });
  }
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.current.x;
        const deltaY = e.clientY - resizeStart.current.y;
        setSize({
          width: Math.max(380, resizeStart.current.width + deltaX),
          height: Math.max(280, resizeStart.current.height + deltaY)
        });
      }
    };


    const handleMouseUp = () => {
      if (isDragging || isResizing) {
        onUpdate(index, {
          ...note,
          x: position.x,
          y: position.y,
          width: size.width,
          height: size.height
        });
      }
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, position, size, note, index, onUpdate, containerRef]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageMarkdown = `\n![${file.name}](${event.target.result})\n`;
        onUpdate(index, {
          ...note,
          content: note.content + imageMarkdown
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      className={`note-card ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: note.zIndex || 1,
        userSelect: isResizing ? 'none' : 'auto'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="note-header">
        <input
          type="text"
          className="note-title-input"
          value={note.title}
          onChange={(e) => onUpdate(index, { ...note, title: e.target.value })}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="note-controls">
          <label className="note-btn" title="Upload Image">
            <ImageIcon size={14} />
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
          </label>
          <button
            className={`note-btn ${isEditing ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(!isEditing);
              onUpdate(index, { ...note, viewMode: isEditing ? 'preview' : 'edit' });
            }}
            title={isEditing ? 'Preview' : 'Edit'}
          >
            {isEditing ? <Eye size={14} /> : <Edit3 size={14} />}
          </button>
          <button
            className="note-btn delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(index);
            }}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="note-content-container">
        {isEditing ? (
          <textarea
            className="note-content-textarea"
            value={note.content}
            onChange={(e) => onUpdate(index, { ...note, content: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            placeholder="Write in Markdown or HTML..."
          />
        ) : (
          <div
            className="note-content-preview"
            dangerouslySetInnerHTML={{ __html: marked(note.content || '*Empty note*') }}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          />
        )}
      </div>
<div className="resize-handle" onMouseDown={handleResizeMouseDown} />
    </div>
  );
};  // <-- ADD THIS if it's missing! This closes the NoteCard component


// Main App Component
export default function App() {
  const [currentMode, setCurrentMode] = useState('todo');
  const [currentList, setCurrentList] = useState('default');

  const [showSettings, setShowSettings] = useState(false);
  const [promptDialog, setPromptDialog] = useState({ isOpen: false, title: '', placeholder: '', defaultValue: '', onConfirm: null });
const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [workspaceScale, setWorkspaceScale] = useState(1);
  const [workspaceTransform, setWorkspaceTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [editingKanbanCard, setEditingKanbanCard] = useState(null);
  const [draggedTodo, setDraggedTodo] = useState(null);
  const [draggedKanbanCard, setDraggedKanbanCard] = useState(null);
  const panStart = useRef({ x: 0, y: 0 });
  const workspaceRef = useRef(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
const [sessionToken, setSessionToken] = useState(null);
const [username, setUsername] = useState('');
const [showAuthModal, setShowAuthModal] = useState(false);
const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
const [isSyncing, setIsSyncing] = useState(false);
const [statusMessage, setStatusMessage] = useState('');
const API_BASE = 'https://loginapinote.arc360hub.com';


  const [data, setData] = useLocalStorage('ark-notes-data', {
    todo: {
      default: { name: 'My ToDo List', items: [] }
    },
    notes: {
      default: { name: 'My Notes', items: [] }
    },
    kanban: {
      default: {
        name: 'My Project',
        columns: {
          todo: { name: 'To Do', items: [] },
          doing: { name: 'In Progress', items: [] },
          done: { name: 'Done', items: [] }
        }
      }
    }
  });

const [settings, setSettings] = useLocalStorage('ark-notes-settings', {
  gridSize: 50,
  fontSize: 14,
  accentColor: '#6750a4',
  darkMode: false
});


useEffect(() => {
  document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
}, [settings.darkMode]);


  // Workspace pan & zoom - Changed to Alt key instead of Ctrl
  const handleWheel = (e) => {
    if (currentMode !== 'notes') return;
    
    if (e.altKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(workspaceTransform.scale * delta, 0.1), 5);
      setWorkspaceTransform(prev => ({ ...prev, scale: newScale }));
    }
  };

// Custom Prompt Dialog
const PromptDialog = ({ isOpen, onClose, onConfirm, title, placeholder, defaultValue = '' }) => {
  const [inputValue, setInputValue] = useState(defaultValue);
  
  useEffect(() => {
    setInputValue(defaultValue);
  }, [defaultValue, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onConfirm(inputValue);
    setInputValue('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <input
            type="text"
            className="setting-input"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
              if (e.key === 'Escape') onClose();
            }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button
              className="button-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              className="button-primary"
              onClick={handleSubmit}
              style={{ flex: 1 }}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom Confirm Dialog
const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '16px' }}>{message}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="button-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              className="button-danger"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              style={{ flex: 1 }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const handleMouseDown = (e) => {
  if (currentMode !== 'notes' || e.target.closest('.note-card')) return;
  e.preventDefault();
  setIsPanning(true);
  const container = workspaceRef.current;
  panStart.current = {
    x: e.clientX + container.scrollLeft,
    y: e.clientY + container.scrollTop
  };
};

const handleMouseMove = (e) => {
  if (!isPanning || !workspaceRef.current) return;
  const container = workspaceRef.current;
  container.scrollLeft = panStart.current.x - e.clientX;
  container.scrollTop = panStart.current.y - e.clientY;
};

const handleMouseUp = () => {
  setIsPanning(false);
};


const addItem = () => {
  if (currentMode === 'todo') {
    setPromptDialog({
      isOpen: true,
      title: 'Add Task',
      placeholder: 'Enter task...', defaultValue: '',
      onConfirm: (text) => {
        if (text.trim()) {
          const newData = { ...data };
          newData.todo[currentList].items.push({
            id: Date.now(),
            text,
            completed: false
          });
          setData(newData);
          setPromptDialog({ isOpen: false, title: '', placeholder: '', defaultValue: '', onConfirm: null });
        }
      }
    });
  } else if (currentMode === 'notes') {
    setPromptDialog({
      isOpen: true,
      title: 'Add Note',
      placeholder: 'Note title...', defaultValue: '',
      onConfirm: (title) => {
        if (title.trim()) {
          const newData = { ...data };
          const container = workspaceRef.current;
          const containerRect = container?.getBoundingClientRect();
          const centerX = containerRect ? (containerRect.width / 2 - 200) : 100;
          const centerY = containerRect ? (containerRect.height / 2 - 150) : 100;
          
          newData.notes[currentList].items.push({
            id: Date.now(),
            title: title || 'Untitled',
            content: '# ' + (title || 'Untitled') + '\n\nStart writing...',
            x: centerX + newData.notes[currentList].items.length * 40,
            y: centerY + newData.notes[currentList].items.length * 40,
            width: 400,
            height: 300,
            zIndex: newData.notes[currentList].items.length + 1,
            viewMode: 'edit'
          });
          setData(newData);
          setPromptDialog({ isOpen: false, title: '', placeholder: '', defaultValue: '', onConfirm: null });
        }
      }
    });
  } else if (currentMode === 'kanban') {
    setPromptDialog({
      isOpen: true,
      title: 'Add Column',
      placeholder: 'Column name...', defaultValue: '',
      onConfirm: (name) => {
        if (name.trim()) {
          const newData = { ...data };
          const id = Date.now().toString();
          newData.kanban[currentList].columns[id] = { name, items: [] };
          setData(newData);
          setPromptDialog({ isOpen: false, title: '', placeholder: '', defaultValue: '', onConfirm: null });
        }
      }
    });
  }
};


const addList = () => {
  setPromptDialog({
    isOpen: true,
    title: currentMode === 'todo' ? 'Add Todo List' : currentMode === 'notes' ? 'Add Notebook' : 'Add Board',
    placeholder: 'List name...', defaultValue: '',
    onConfirm: (name) => {
      if (name.trim()) {
        const newData = { ...data };
        const id = Date.now().toString();
        
        if (currentMode === 'todo') {
          newData.todo[id] = { name, items: [] };
        } else if (currentMode === 'notes') {
          newData.notes[id] = { name, items: [] };
        } else {
          newData.kanban[id] = {
            name,
            columns: {
              todo: { name: 'To Do', items: [] },
              doing: { name: 'In Progress', items: [] },
              done: { name: 'Done', items: [] }
            }
          };
        }
        
        setData(newData);
        setCurrentList(id);
        setPromptDialog({ isOpen: false, title: '', placeholder: '', defaultValue: '', onConfirm: null });
      }
    }
  });
};

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ data, settings }, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ark-notes-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.data) setData(imported.data);
        if (imported.settings) setSettings(imported.settings);
      } catch (error) {
        alert('Invalid file format');
      }
    };
    reader.readAsText(file);
  };

  // Todo drag and drop handlers
  const handleTodoDragStart = (e, index) => {
    setDraggedTodo(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTodoDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTodoDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedTodo === null || draggedTodo === dropIndex) return;

    const newData = { ...data };
    const items = [...newData.todo[currentList].items];
    const [movedItem] = items.splice(draggedTodo, 1);
    items.splice(dropIndex, 0, movedItem);
    newData.todo[currentList].items = items;
    
    setData(newData);
    setDraggedTodo(null);
  };

  // Kanban drag and drop handlers
  const handleKanbanDragStart = (e, columnId, cardIndex) => {
    setDraggedKanbanCard({ columnId, cardIndex });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleKanbanDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleKanbanDrop = (e, targetColumnId) => {
    e.preventDefault();
    if (!draggedKanbanCard) return;

    const { columnId: sourceColumnId, cardIndex } = draggedKanbanCard;
    
    const newData = { ...data };
    const sourceColumn = newData.kanban[currentList].columns[sourceColumnId];
    const targetColumn = newData.kanban[currentList].columns[targetColumnId];
    
    const [movedCard] = sourceColumn.items.splice(cardIndex, 1);
    targetColumn.items.push(movedCard);
    
    setData(newData);
    setDraggedKanbanCard(null);
  };

  const currentListData = data[currentMode][currentList];

// Check for existing session on load
useEffect(() => {
  const token = localStorage.getItem('session_token');
  const savedUsername = localStorage.getItem('username');
  if (token && savedUsername) {
    setSessionToken(token);
    setUsername(savedUsername);
    setIsLoggedIn(true);
    syncDownload(token); // Auto-load data on startup
  }
}, []);

// Auto-sync every 30 seconds when logged in
useEffect(() => {
  if (!isLoggedIn || !sessionToken) return;
  
  const interval = setInterval(() => {
    syncUpload(sessionToken, true); // silent sync
  }, 30000);
  
  return () => clearInterval(interval);
}, [isLoggedIn, sessionToken, data, settings]);

const handleAuth = async (username, password) => {
  try {
    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const result = await response.json();
    
    if (result.success) {
      if (authMode === 'register') {
        alert('Account created! Please login.');
        setAuthMode('login');
      } else {
        setSessionToken(result.session_token);
        setUsername(result.username);
        setIsLoggedIn(true);
        localStorage.setItem('session_token', result.session_token);
        localStorage.setItem('username', result.username);
        setShowAuthModal(false);
        await syncDownload(result.session_token);
      }
    } else {
      alert(result.error || 'Authentication failed');
    }
  } catch (error) {
    alert('Connection error');
  }
};

const handleLogout = async () => {
  try {
    await fetch(`${API_BASE}/api/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  setIsLoggedIn(false);
  setSessionToken(null);
  setUsername('');
  localStorage.removeItem('session_token');
  localStorage.removeItem('username');
};

const syncUpload = async (token = sessionToken, silent = false) => {
  if (!token) return;
  
  setIsSyncing(true);
  try {
    const response = await fetch(`${API_BASE}/api/sync/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: { data, settings } })
    });
    
    const result = await response.json();
if (!silent) {
  if (result.success) {
    setStatusMessage('✅ Synced to cloud');
    setTimeout(() => setStatusMessage(''), 3000);
  } else {
    setStatusMessage('❌ Sync failed');
    setTimeout(() => setStatusMessage(''), 3000);
  }
}

  } catch (error) {
    if (!silent) alert('Sync error');
  }
  setIsSyncing(false);
};

const syncDownload = async (token = sessionToken) => {
  if (!token) return;

  setIsSyncing(true);
  try {
    const response = await fetch(`${API_BASE}/api/sync/download`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const result = await response.json();
    console.log('Cloud download result:', result);

    if (result.success && result.data) {
      if (result.data.data) setData(result.data.data);
      if (result.data.settings) setSettings(result.data.settings);
      setStatusMessage('☁️ Data loaded from cloud');
    } else {
      setStatusMessage('⚠️ Failed to load cloud data');
      console.warn('Download failed:', result);
    }
  } catch (error) {
    console.error('Sync download error:', error);
    setStatusMessage('❌ Load error');
  } finally {
    setTimeout(() => setStatusMessage(''), 3000);
    setIsSyncing(false);
  }
};


  return (
    <div className="app-container">
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .button-secondary {
  width: 100%;
  padding: 12px;
  background: var(--surface-variant);
  color: var(--on-surface);
  border: 1px solid var(--outline);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: opacity 0.2s;
}

.button-secondary:hover {
  opacity: 0.9;
}

        :root {
          --primary: ${settings.accentColor};
          --primary-light: ${settings.accentColor}33;
          --surface: #fef7ff;
          --surface-variant: #e7e0ec;
          --on-surface: #1d1b20;
          --outline: #79747e;
          --error: #ba1a1a;
            --primary-rgb: ${parseInt(settings.accentColor.slice(1,3), 16)}, ${parseInt(settings.accentColor.slice(3,5), 16)}, ${parseInt(settings.accentColor.slice(5,7), 16)};
        }

        [data-theme="dark"] {
        --primary: ${settings.accentColor};
        --primary-light: ${settings.accentColor}33;
          --surface: #141218;
          --surface-variant: #49454f;
          --on-surface: #e6e0e9;
          --outline: #938f96;
          --error: #ffb4ab;
        }

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: var(--surface);
  color: var(--on-surface);
  font-size: ${settings.fontSize}px;
  overflow: hidden;
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100vh;
}

html, #root {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

.app-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
  width: 100%;
}

        .sidebar {
          width: 280px;
          background: var(--surface);
          border-right: 1px solid var(--outline);
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex-shrink: 0;
        }

        .sidebar h1 {
          font-size: 24px;
          color: var(--primary);
          margin-bottom: 8px;
        }

.mode-button {
          width: 100%;
          padding: 12px 16px;
          background: transparent;
          border: 1px solid var(--outline);
          border-radius: 12px;
          color: var(--on-surface);
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 8px;
          outline: none; /* Add this to remove the purple ring */
        }

        .mode-button:hover {
          background: var(--primary-light);
          border-color: var(--primary); /* Add this for the hover border */
        }

        .mode-button.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .list-item {
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: background 0.2s;
        }

        .list-item:hover {
          background: var(--surface-variant);
        }

        .list-item.active {
          background: var(--primary-light);
          color: var(--primary);
        }

        .add-button {
          width: 100%;
          padding: 8px;
          background: transparent;
          border: 1px dashed var(--outline);
          border-radius: 8px;
          cursor: pointer;
          color: var(--on-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .controls {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

.control-button {
          width: 100%;
          padding: 8px 12px;
          background: transparent;
          border: 1px solid var(--outline);
          border-radius: 12px;
          cursor: pointer;
          color: var(--on-surface);
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-start;
          transition: all 0.2s;
          outline: none; /* Add this to remove the purple ring */
        }

        .control-button:hover {
          background: var(--primary-light); /* This already matches */
          border-color: var(--primary); /* Add this for the hover border */
        }

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  width: 100%;
  min-width: 0;
}

        .header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--outline);
          flex-shrink: 0;
        }

        .header h2 {
          font-size: 28px;
          font-weight: 400;
        }

        .fab {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: var(--primary);
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          transition: transform 0.2s;
        }

        .fab:hover {
          transform: scale(1.05);
        }

.content-area {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.todo-list-container {
  padding: 24px;
  width: 100%;
  box-sizing: border-box;
}

        .kanban-board-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          width: 100%;
          height: 100%;
        }

        .todo-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--surface);
          border: 1px solid var(--outline);
          border-radius: 12px;
          margin-bottom: 8px;
          cursor: grab;
          transition: all 0.2s;
        }

        .todo-item:active {
          cursor: grabbing;
        }

        .todo-item.dragging {
          opacity: 1;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }

        .todo-item:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .drag-handle {
          cursor: grab;
          color: var(--outline);
        }

        .drag-handle:active {
          cursor: grabbing;
        }

        .todo-checkbox {
          width: 20px;
          height: 20px;
          accent-color: var(--primary);
          flex-shrink: 0;
        }

        .todo-text {
          flex: 1;
        }

        .todo-text.completed {
          text-decoration: line-through;
          opacity: 0.6;
        }

        .todo-text-input {
          flex: 1;
          padding: 4px 8px;
          background: var(--surface-variant);
          border: 1px solid var(--primary);
          border-radius: 4px;
          color: var(--on-surface);
          font-size: inherit;
        }

        .icon-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: var(--on-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.2s;
          flex-shrink: 0;
        }

        .icon-button:hover {
          background: var(--surface-variant);
        }

        .icon-button.delete {
          color: var(--error);
        }

        .notes-container {
          width: 100%;
          height: 100%;
          overflow: auto;
          border: 1px solid var(--outline);
          border: 1px solid var(--outline);
          border-radius: 12px;
          background: var(--surface-variant);
          position: relative;
          cursor: ${isPanning ? 'grabbing' : 'grab'};
        }

        .notes-workspace {
  width: 5000px;
  height: 5000px;
  position: relative;
          background-image: 
            linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(0,0,0,0.05) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.05) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.05) 75%);
          background-size: ${settings.gridSize}px ${settings.gridSize}px;
          background-position: 0 0, 0 ${settings.gridSize/2}px, ${settings.gridSize/2}px -${settings.gridSize/2}px, -${settings.gridSize/2}px 0;
        }

        .note-card {
          position: absolute;
          background: var(--surface);
          border: 1px solid var(--outline);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          cursor: move;
        }

        .note-card.dragging {
          opacity: 0.8;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }

        .note-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          gap: 8px;
        }

        .note-title-input {
          flex: 1;
          background: transparent;
          border: none;
          font-size: 18px;
          font-weight: 500;
          color: var(--on-surface);
          padding: 4px 8px;
          border-radius: 4px;
          cursor: text;
        }

        .note-title-input:focus {
          outline: none;
          background: var(--surface-variant);
        }

        .note-controls {
          display: flex;
          gap: 4px;
        }

        .note-btn {
          background: transparent;
          border: none;
          padding: 4px 6px;
          border-radius: 4px;
          cursor: pointer;
          color: var(--on-surface);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .note-btn:hover {
          background: var(--surface-variant);
        }

        .note-btn.active {
          background: var(--primary);
          color: white;
        }

        .note-btn.delete {
          color: var(--error);
        }

        .note-content-container {
          flex: 1;
          min-height: 150px;
        }

        .note-content-textarea {
          width: 100%;
          height: 100%;
          padding: 12px;
          border: 1px solid var(--outline);
          border-radius: 8px;
          background: var(--surface);
          color: var(--on-surface);
          font-family: 'Consolas', monospace;
          font-size: 14px;
          resize: none;
        }

        .note-content-textarea:focus {
          outline: none;
          border-color: var(--primary);
        }

        .note-content-preview {
          height: 100%;
          padding: 12px;
          border: 1px solid transparent;
          border-radius: 8px;
          overflow-y: auto;
          cursor: text;
        }

        .note-content-preview:hover {
          border-color: var(--outline);
          background: var(--surface-variant);
        }

        .note-content-preview img {
          max-width: 100%;
          border-radius: 8px;
          margin: 8px 0;
        }

        .resize-handle {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 16px;
          height: 16px;
          cursor: se-resize;
          background: linear-gradient(135deg, transparent 50%, var(--outline) 50%);
        }

        .kanban-board {
          display: flex;
          gap: 16px;
          height: 100%;
          width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 24px;
          box-sizing: border-box;
        }

        .kanban-column {
          min-width: 300px;
          max-width: 350px;
          flex-shrink: 0;
          background: var(--surface-variant);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          height: calc(100% - 48px);
        }

        .kanban-column-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .kanban-column-title {
          font-size: 16px;
          font-weight: 500;
        }

        .kanban-cards {
          flex: 1;
          overflow-y: auto;
          margin-bottom: 12px;
          min-height: 100px;
          padding: 4px;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .kanban-cards.drag-over {
          background: var(--primary-light);
        }

        .kanban-card {
          background: var(--surface);
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 8px;
          border: 1px solid var(--outline);
          cursor: grab;
          transition: all 0.2s;
          position: relative;
        }

        .kanban-card:active {
          cursor: grabbing;
        }

        .kanban-card.dragging {
          opacity: 0.5;
        }

        .kanban-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .kanban-card-content {
          word-wrap: break-word;
          margin-bottom: 8px;
        }

        .kanban-card-input {
          width: 100%;
          padding: 4px 8px;
          background: var(--surface-variant);
          border: 1px solid var(--primary);
          border-radius: 4px;
          color: var(--on-surface);
          font-size: inherit;
          margin-bottom: 8px;
        }

        .kanban-card-actions {
          display: flex;
          gap: 4px;
          justify-content: flex-end;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content {
          background: var(--surface);
          border-radius: 16px;
          padding: 0;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--outline);
        }

        .modal-header h3 {
          font-size: 20px;
          font-weight: 500;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          color: var(--on-surface);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          background: var(--surface-variant);
        }

        .modal-body {
          padding: 24px;
          overflow-y: auto;
          max-height: calc(80vh - 80px);
        }

        .setting-group {
          margin-bottom: 20px;
        }

        .setting-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          font-size: 14px;
        }

        .setting-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--outline);
          border-radius: 8px;
          background: var(--surface);
          color: var(--on-surface);
          font-size: 14px;
        }

        .setting-input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .button-primary {
          width: 100%;
          padding: 12px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: opacity 0.2s;
        }

        .button-primary:hover {
          opacity: 0.9;
        }

        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-size: 24px;
          color: var(--primary);
        }

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: var(--outline);
}

        .empty-state h3 {
          font-size: 20px;
          margin-bottom: 8px;
        }

        .zoom-hint {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--surface);
          border: 1px solid var(--outline);
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 12px;
          color: var(--outline);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          z-index: 100;
        }
      `}</style>

      {/* Sidebar */}
      <div className="sidebar">
        <h1>A Notes App</h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            className={`mode-button ${currentMode === 'todo' ? 'active' : ''}`}
            onClick={() => setCurrentMode('todo')}
          >
            <Check size={18} />
            ToDo Lists
          </button>
          <button
            className={`mode-button ${currentMode === 'notes' ? 'active' : ''}`}
            onClick={() => setCurrentMode('notes')}
          >
            <Edit3 size={18} />
            Notes
          </button>
          <button
            className={`mode-button ${currentMode === 'kanban' ? 'active' : ''}`}
            onClick={() => setCurrentMode('kanban')}
          >
            <GripVertical size={18} />
            Kanban
          </button>
        </div>

        <div style={{ flex: 1, marginTop: '16px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>
            {currentMode === 'todo' ? 'Lists' : currentMode === 'notes' ? 'Notebooks' : 'Boards'}
          </h3>
          {Object.entries(data[currentMode]).map(([id, list]) => (
            <div
              key={id}
              className={`list-item ${id === currentList ? 'active' : ''}`}
              onClick={() => setCurrentList(id)}
            >
              <span>{list.name}</span>
<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Edit3
              size={16}
              onClick={(e) => {
                e.stopPropagation();
                setPromptDialog({
                  isOpen: true,
                  title: 'Rename Workspace',
                  placeholder: 'Enter new name...',
                  defaultValue: list.name, // Pre-fill with current name
                  onConfirm: (newName) => {
                    if (newName.trim()) {
                      const newData = { ...data };
                      newData[currentMode][id].name = newName.trim();
                      setData(newData);
                    }
                    setPromptDialog({ isOpen: false, title: '', placeholder: '', defaultValue: '', onConfirm: null });
                  },
                });
              }}
              style={{ cursor: 'pointer', flexShrink: 0 }}
              className="icon-button"
            />
            {Object.keys(data[currentMode]).length > 1 && (
              <Trash2
                size={16}
                onClick={(e) => {
                  e.stopPropagation();
                  // This is your existing delete logic
                  const newData = { ...data };
                  delete newData[currentMode][id];
                  setData(newData);
                  if (id === currentList) {
                    setCurrentList(Object.keys(newData[currentMode])[0]);
                  }
                }}
                style={{ cursor: 'pointer', flexShrink: 0, color: 'var(--error)' }}
                className="icon-button"
              />
            )}
          </div>
            </div>
          ))}
          <button className="add-button" onClick={addList} style={{ marginTop: '8px' }}>
            <Plus size={16} /> Add New
          </button>
        </div>

<div className="controls">
  {isLoggedIn ? (
    <>
      <div style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: 'var(--primary)' }}>
        Logged in as: {username}
      </div>
      <button 
        className="control-button" 
        onClick={() => syncUpload()}
        disabled={isSyncing}
      >
        <Upload size={18} />
        {isSyncing ? 'Syncing...' : 'Force Sync'}
      </button>
      <button 
        className="control-button" 
        onClick={() => syncDownload()}
        disabled={isSyncing}
      >
        <Download size={18} />
        Load from Cloud
      </button>
      <button className="control-button" onClick={handleLogout}>
        Logout
      </button>
    </>
  ) : (
    <button className="control-button" onClick={() => setShowAuthModal(true)}>
      Login / Register
    </button>
  )}
  <button className="control-button" onClick={() => setShowSettings(true)}>
    <Settings size={18} />
    Settings
  </button>
</div>
      </div>

      {/* Main Content */}
      <div className="main-content">
<div className="header">
  <h2>{currentListData?.name || 'Untitled'}</h2>
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    {/* Zoom controls - only show in Notes mode */}
    {currentMode === 'notes' && (
      <>
        <button
          className="control-button"
          onClick={() =>
            setWorkspaceTransform((prev) => ({
              ...prev,
              scale: Math.min(prev.scale * 1.1, 5),
            }))
          }
          title="Zoom In"
        >
          +
        </button>
        <button
          className="control-button"
          onClick={() =>
            setWorkspaceTransform((prev) => ({
              ...prev,
              scale: Math.max(prev.scale * 0.9, 0.1),
            }))
          }
          title="Zoom Out"
        >
          –
        </button>
      </>
    )}

    {/* Existing Add Button */}
    <button className="fab" onClick={addItem}>
      <Plus size={24} />
    </button>
  </div>
</div>


        <div className="content-area">
          {/* Todo View */}
          {currentMode === 'todo' && (
            <div className="todo-list-container">
              {currentListData?.items?.length === 0 ? (
                <div className="empty-state">
                  <h3>No tasks yet</h3>
                  <p>Click + to add your first task!</p>
                </div>
              ) : (
                currentListData?.items?.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`todo-item ${draggedTodo === idx ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleTodoDragStart(e, idx)}
                    onDragOver={handleTodoDragOver}
                    onDrop={(e) => handleTodoDrop(e, idx)}
                  >
                    <div className="drag-handle">
                      <GripVertical size={18} />
                    </div>
                    <input
                      type="checkbox"
                      className="todo-checkbox"
                      checked={item.completed}
                      onChange={() => {
                        const newData = { ...data };
                        newData.todo[currentList].items[idx].completed = !item.completed;
                        setData(newData);
                      }}
                    />
                    {editingTodo === idx ? (
                      <>
                        <input
                          type="text"
                          className="todo-text-input"
                          value={item.text}
                          onChange={(e) => {
                            const newData = { ...data };
                            newData.todo[currentList].items[idx].text = e.target.value;
                            setData(newData);
                          }}
                          onBlur={() => setEditingTodo(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingTodo(null);
                          }}
                          autoFocus
                        />
                        <button className="icon-button" onClick={() => setEditingTodo(null)}>
                          <Save size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={`todo-text ${item.completed ? 'completed' : ''}`}>
                          {item.text}
                        </span>
                        <button className="icon-button" onClick={() => setEditingTodo(idx)}>
                          <Edit3 size={18} />
                        </button>
                        <button
                          className="icon-button delete"
                          onClick={() => {
                            const newData = { ...data };
                            newData.todo[currentList].items.splice(idx, 1);
                            setData(newData);
                          }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Notes View */}
          {currentMode === 'notes' && (
            <div style={{ width: '100%', height: '100%', padding: '24px', boxSizing: 'border-box', position: 'relative' }}>
              <div
                className="notes-container"
                ref={workspaceRef}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <div 
                  className="notes-workspace"
                  style={{
                    transform: `translate(${workspaceTransform.x}px, ${workspaceTransform.y}px) scale(${workspaceTransform.scale})`,
                    transformOrigin: '0 0'
                  }}
                >
                  {currentListData?.items?.length === 0 ? (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', opacity: 0.6 }}>
                      <h3>No notes yet</h3>
                      <p>Click + to create your first note</p>
                    </div>
                  ) : (
                    currentListData?.items?.map((note, idx) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        index={idx}
                        workspaceTransform={workspaceTransform}
                        containerRef={workspaceRef}
                        onUpdate={(index, updatedNote) => {
                          const newData = { ...data };
                          newData.notes[currentList].items[index] = updatedNote;
                          setData(newData);
                        }}
                        onDelete={(index) => {
                          const newData = { ...data };
                          newData.notes[currentList].items.splice(index, 1);
                          setData(newData);
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
              <div className="zoom-hint">
                💡 Hold Alt + Scroll to zoom | Click & drag to pan
              </div>
            </div>
          )}

          {/* Kanban View */}
          {currentMode === 'kanban' && (
            <div className="kanban-board-container">
              <div className="kanban-board">
                {Object.entries(currentListData?.columns || {})
                .sort(([a], [b]) => {
                  const order = ['todo', 'doing', 'done'];
                  const ai = order.indexOf(a);
                  const bi = order.indexOf(b);
                  if (ai === -1 && bi === -1) return a.localeCompare(b);
                  if (ai === -1) return 1;
                  if (bi === -1) return -1;
                  return ai - bi;
                })
                .map(([colId, column]) => (

                <div key={colId} className="kanban-column">
                  <div className="kanban-column-header">
                    <h3 className="kanban-column-title">{column.name}</h3>
                    <button
                      className="icon-button delete"
                      onClick={() => {
                        const newData = { ...data };
                        delete newData.kanban[currentList].columns[colId];
                        setData(newData);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div
                    className={`kanban-cards ${draggedKanbanCard && 'drag-over'}`}
                    onDragOver={handleKanbanDragOver}
                    onDrop={(e) => handleKanbanDrop(e, colId)}
                  >
                    {column.items?.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`kanban-card ${draggedKanbanCard?.columnId === colId && draggedKanbanCard?.cardIndex === idx ? 'dragging' : ''}`}
                        draggable
                        onDragStart={(e) => handleKanbanDragStart(e, colId, idx)}
                      >
                        {editingKanbanCard?.columnId === colId && editingKanbanCard?.cardIndex === idx ? (
                          <>
                            <input
                              type="text"
                              className="kanban-card-input"
                              value={item.text}
                              onChange={(e) => {
                                const newData = { ...data };
                                newData.kanban[currentList].columns[colId].items[idx].text = e.target.value;
                                setData(newData);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setEditingKanbanCard(null);
                                if (e.key === 'Escape') setEditingKanbanCard(null);
                              }}
                              autoFocus
                            />
                            <div className="kanban-card-actions">
                              <button
                                className="icon-button"
                                onClick={() => setEditingKanbanCard(null)}
                              >
                                <Save size={14} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="kanban-card-content">{item.text}</div>
                            <div className="kanban-card-actions">
                              <button
                                className="icon-button"
                                onClick={() => setEditingKanbanCard({ columnId: colId, cardIndex: idx })}
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                className="icon-button delete"
                                onClick={() => {
                                  const newData = { ...data };
                                  newData.kanban[currentList].columns[colId].items.splice(idx, 1);
                                  setData(newData);
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    className="add-button"
                    onClick={() => {
                      const text = prompt('Card text:');
                      if (text) {
                        const newData = { ...data };
                        if (!newData.kanban[currentList].columns[colId].items) {
                          newData.kanban[currentList].columns[colId].items = [];
                        }
                        newData.kanban[currentList].columns[colId].items.push({
                          id: Date.now(),
                          text
                        });
                        setData(newData);
                      }
                    }}
                  >
                    + Add Card
                  </button>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
      </div>

{/* Auth Modal */}
<Modal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} title={authMode === 'login' ? 'Login' : 'Register'}>
  <form onSubmit={(e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    handleAuth(formData.get('username'), formData.get('password'));
  }}>
    <div className="setting-group">
      <label className="setting-label">Username</label>
      <input
        type="text"
        name="username"
        className="setting-input"
        placeholder="Enter username"
        required
        minLength="3"
      />
    </div>
    
    <div className="setting-group">
      <label className="setting-label">Password</label>
      <input
        type="password"
        name="password"
        className="setting-input"
        placeholder="Enter password"
        required
        minLength="6"
      />
    </div>
    
    <button type="submit" className="button-primary">
      {authMode === 'login' ? 'Login' : 'Register'}
    </button>
    
    <button
      type="button"
      className="button-secondary"
      onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
      style={{ marginTop: '8px' }}
    >
      {authMode === 'login' ? 'Need an account? Register' : 'Have an account? Login'}
    </button>
  </form>
</Modal>

      {/* Settings Modal */}
{/* Settings Modal */}
<Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Settings">
  <div className="setting-group">
    <label className="setting-label">Theme</label>
    <button
      className="control-button"
      onClick={() => setSettings({ ...settings, darkMode: !settings.darkMode })}
      style={{ width: '100%' }}
    >
      {settings.darkMode ? <Sun size={18} /> : <Moon size={18} />}
      {settings.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    </button>
  </div>

  <div className="setting-group">
    <label className="setting-label">Accent Color</label>
    <input
      type="color"
      className="setting-input"
      value={settings.accentColor}
      onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
    />
  </div>

  <div className="setting-group">
    <label className="setting-label">Font Size: {settings.fontSize}px</label>
    <input
      type="range"
      className="setting-input"
      min="12"
      max="20"
      value={settings.fontSize}
      onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value) })}
    />
  </div>

  <div className="setting-group">
    <label className="setting-label">Grid Size: {settings.gridSize}px</label>
    <input
      type="range"
      className="setting-input"
      min="20"
      max="100"
      value={settings.gridSize}
      onChange={(e) => setSettings({ ...settings, gridSize: parseInt(e.target.value) })}
    />
  </div>

  <div className="setting-group">
    <label className="setting-label">Data Management</label>
    <div style={{ display: 'flex', gap: '8px' }}>
      <button className="control-button" onClick={exportData} style={{ flex: 1 }}>
        <Download size={18} />
        Export
      </button>
      <label className="control-button" style={{ flex: 1 }}>
        <Upload size={18} />
        Import
        <input type="file" accept=".json" style={{ display: 'none' }} onChange={importData} />
      </label>
    </div>
  </div>

  <button
    className="button-primary"
    onClick={() => setShowSettings(false)}
  >
    Close
  </button>
</Modal>
      
{/* Prompt and Confirm Dialogs */}
<PromptDialog
    isOpen={promptDialog.isOpen}
    onClose={() => setPromptDialog({ isOpen: false, title: '', placeholder: '', defaultValue: '', onConfirm: null })}
    onConfirm={promptDialog.onConfirm}
    title={promptDialog.title}
    placeholder={promptDialog.placeholder}
    defaultValue={promptDialog.defaultValue}
  />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />

      {/* Bottom-left status message */}
      {statusMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            left: '16px',
            background: 'var(--surface-variant)',
            color: 'var(--on-surface)',
            padding: '8px 12px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: '13px',
            opacity: 0.95,
            transition: 'opacity 0.3s ease',
            zIndex: 2000
          }}
        >
          {statusMessage}
        </div>
      )}

    </div>
  );
}