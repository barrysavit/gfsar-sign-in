/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// --- TYPE DEFINITIONS ---
interface Member {
  name: string;
}

interface ActiveSession {
  name: string;
  signInTime: Date;
}

interface LogEntry {
  name: string;
  signInTime: Date;
  signOutTime: Date;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

// --- CONSTANTS ---
const PREDEFINED_MEMBERS = [
  'Andres Dean', 'Barry Savitskoff', 'Ben Peach', 'Bill Sperling', 'Brad Siemens',
  'Brennan Zorn', 'Cavan Gates', 'Chris Williams', 'Christina Mavinic', 'Clayton Marr',
  'Connie Bielert', 'David Bryan', 'Derek Pankoff', 'Duke Enns', 'Duncan Redfearn',
  'Erik Skaaning', 'Erin Peach', 'Graham Watt', 'Grant Burnard', 'Jackie Schott',
  'Jason Hall', 'Jason Hugh', 'Jennifer Erlendson', 'John Wheeler', 'John Younk',
  'Jon Wilson', 'Justin Darbyshire', 'Ken Lazeroff', 'Kristina Anderson', 'Madeline Williams',
  'Michael Slatnik', 'Nathan Hein', 'Nicky Winn', 'Rebecca Massey', 'Rocky Olsen',
  'Scott Lamont', 'Skye Fletcher', 'Spencer Novokshonoff', 'Steve Danshin', 'Trevor Carson',
  'Tyrell Polzin'
];
const sortedPredefinedMembers = PREDEFINED_MEMBERS.map(name => ({ name })).sort((a, b) => a.name.localeCompare(b.name));

// --- CUSTOM HOOK for LocalStorage Persistence ---
function usePersistentState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState(() => {
    try {
      const storedValue = window.localStorage.getItem(key);
      if (storedValue) {
        return JSON.parse(storedValue, (k, v) => {
          if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(v)) {
            return new Date(v);
          }
          return v;
        });
      }
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, state]);

  return [state, setState];
}

// --- MAIN APP COMPONENT ---
const App = () => {
  // --- STATE MANAGEMENT ---
  const [members, setMembers] = usePersistentState<Member[]>('gfsar-members', sortedPredefinedMembers);
  const [activeSessions, setActiveSessions] = usePersistentState<ActiveSession[]>('gfsar-activeSessions', []);
  const [attendanceLog, setAttendanceLog] = usePersistentState<LogEntry[]>('gfsar-attendanceLog', []);
  const [taskNumber, setTaskNumber] = usePersistentState<string>('gfsar-taskNumber', '');
  
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [memberNameInput, setMemberNameInput] = useState('');
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [error, setError] = useState('');
  
  const [isListEditModalOpen, setIsListEditModalOpen] = useState(false);
  const [editingMemberList, setEditingMemberList] = useState<Member[]>([]);

  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [signInMemberName, setSignInMemberName] = useState('');

  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskNumberInput, setNewTaskNumberInput] = useState('');

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState<{message: string, onConfirm: () => void}>({
    message: '',
    onConfirm: () => {},
  });

  const [toasts, setToasts] = useState<Toast[]>([]);

  // --- UTILITY & HELPER FUNCTIONS ---
  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Date.now();
    setToasts(currentToasts => [...currentToasts, { id, message, type }]);
    setTimeout(() => {
      setToasts(currentToasts => currentToasts.filter(t => t.id !== id));
    }, 3000);
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
    });
  }

  const generateDefaultTaskNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}-01`;
  };

  // --- MODAL CONTROLS ---
  const openConfirmModal = (message: string, onConfirm: () => void) => {
    setConfirmModalProps({ message, onConfirm });
    setIsConfirmModalOpen(true);
  };
  const closeConfirmModal = () => setIsConfirmModalOpen(false);
  const handleConfirm = () => {
    confirmModalProps.onConfirm();
    closeConfirmModal();
  };
  
  const openAddEditModal = (mode: 'add' | 'edit', member?: Member) => {
    setModalMode(mode);
    setIsAddEditModalOpen(true);
    setError('');
    if (mode === 'edit' && member) {
      setMemberToEdit(member);
      setMemberNameInput(member.name);
    } else {
      setMemberNameInput('');
      setMemberToEdit(null);
    }
  };
  const closeAddEditModal = () => {
    setIsAddEditModalOpen(false); setModalMode(null); setMemberNameInput('');
    setError(''); setMemberToEdit(null);
  };

  const openListEditModal = () => {
    setEditingMemberList([...members]);
    setIsListEditModalOpen(true);
  };
  const closeListEditModal = () => {
    setIsListEditModalOpen(false); setEditingMemberList([]);
  };

  const openSignInModal = () => {
    const availableMembers = members.filter(m => !activeSessions.some(s => s.name === m.name));
    setSignInMemberName(availableMembers.length > 0 ? availableMembers[0].name : '');
    setIsSignInModalOpen(true);
  };
  const closeSignInModal = () => {
    setIsSignInModalOpen(false); setSignInMemberName('');
  };

  const openNewTaskModal = () => {
    const startNewTaskFlow = () => {
      setNewTaskNumberInput(generateDefaultTaskNumber());
      setIsNewTaskModalOpen(true);
    };
    if (activeSessions.length > 0 || attendanceLog.length > 0) {
      openConfirmModal(
        "Starting a new task will clear all current attendance records. Are you sure?",
        startNewTaskFlow
      );
    } else { startNewTaskFlow(); }
  };
  const closeNewTaskModal = () => {
    setIsNewTaskModalOpen(false); setNewTaskNumberInput('');
  };

  // --- CORE LOGIC HANDLERS ---
  const handleSignIn = () => {
    if (!signInMemberName) return;
    const newSession: ActiveSession = { name: signInMemberName, signInTime: new Date() };
    setActiveSessions(current => [...current, newSession].sort((a, b) => a.name.localeCompare(b.name)));
    addToast(`${signInMemberName} signed in.`, 'success');
    closeSignInModal();
  };

  const handleSignOut = (memberName: string) => {
    const sessionToEnd = activeSessions.find(s => s.name === memberName);
    if (!sessionToEnd) return;

    const newLogEntry: LogEntry = {
      name: sessionToEnd.name,
      signInTime: sessionToEnd.signInTime,
      signOutTime: new Date()
    };
    
    setAttendanceLog(currentLog => [newLogEntry, ...currentLog]);
    setActiveSessions(currentSessions => currentSessions.filter(s => s.name !== memberName));
    addToast(`${memberName} signed out.`, 'info');
  };
  
  const handleSaveMember = () => {
    const trimmedName = memberNameInput.trim();
    if (!trimmedName) {
      setError('Member name cannot be empty.'); return;
    }
    const isDuplicate = members.some(
      (member) => member.name.toLowerCase() === trimmedName.toLowerCase() && 
      (modalMode === 'add' || (modalMode === 'edit' && member.name !== memberToEdit?.name))
    );
    if (isDuplicate) {
      setError('A member with this name already exists.'); return;
    }

    if (modalMode === 'add') {
      const newMember: Member = { name: trimmedName };
      setMembers(currentMembers => [...currentMembers, newMember].sort((a, b) => a.name.localeCompare(b.name)));
      addToast('New member added.', 'success');
    } else if (modalMode === 'edit' && memberToEdit) {
      const oldName = memberToEdit.name;
      const newName = trimmedName;
      
      setMembers(currentMembers => currentMembers.map(m => m.name === oldName ? { ...m, name: newName } : m).sort((a, b) => a.name.localeCompare(b.name)));
      setActiveSessions(currentSessions => currentSessions.map(s => s.name === oldName ? { ...s, name: newName } : s).sort((a, b) => a.name.localeCompare(b.name)));
      setAttendanceLog(currentLog => currentLog.map(e => e.name === oldName ? { ...e, name: newName } : e));
      addToast('Member updated.', 'success');
    }
    closeAddEditModal();
  };

  const handleDeleteMember = () => {
    if (!memberToEdit) return;
    const memberNameToDelete = memberToEdit.name;
    const deleteAction = () => {
      setMembers(currentMembers => currentMembers.filter(m => m.name !== memberNameToDelete));
      setActiveSessions(currentSessions => currentSessions.filter(s => s.name !== memberNameToDelete));
      setAttendanceLog(currentLogs => currentLogs.filter(l => l.name !== memberNameToDelete));
      addToast(`${memberNameToDelete} has been deleted.`, 'error');
      closeAddEditModal();
    };
    openConfirmModal(
      `Delete ${memberNameToDelete}? This removes them from all records and cannot be undone.`,
      deleteAction
    );
  };

  const handleRemoveMemberFromEditList = (memberName: string) => {
    setEditingMemberList(currentList => currentList.filter(m => m.name !== memberName));
  };

  const handleSaveMemberList = () => {
    const updatedMembers = editingMemberList.map(member => ({ name: member.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setMembers(updatedMembers);
    setActiveSessions([]);
    setAttendanceLog([]);
    addToast('Member list has been reset.', 'success');
    closeListEditModal();
  };

  const handleStartNewTask = () => {
    const trimmedTaskNumber = newTaskNumberInput.trim();
    if (!trimmedTaskNumber) return;
    setTaskNumber(trimmedTaskNumber);
    setActiveSessions([]);
    setAttendanceLog([]);
    addToast(`New task session started: ${trimmedTaskNumber}`, 'success');
    closeNewTaskModal();
  };

  const handleClearLog = () => {
    if (activeSessions.length === 0 && attendanceLog.length === 0) return;
    const clearLogAction = () => {
      setActiveSessions([]);
      setAttendanceLog([]);
      addToast('Attendance log has been cleared.', 'info');
    };
    openConfirmModal(
      "Clear the attendance log for this task? This cannot be undone.",
      clearLogAction
    );
  };
  
  // --- LOG TRANSFORMATION ---
  const sessionLog = (() => {
    const allActiveSessions = activeSessions.map(session => ({
      ...session,
      signOutTime: null,
      status: 'Signed In' as const,
    }));

    const allPastSessions = attendanceLog.map(log => ({
      ...log,
      status: 'Signed Out' as const,
    }));

    const combinedLog = [...allActiveSessions, ...allPastSessions];

    return combinedLog.sort((a, b) => {
      if (a.status === 'Signed In' && b.status !== 'Signed In') return -1;
      if (b.status === 'Signed In' && a.status !== 'Signed In') return 1;
      return b.signInTime.getTime() - a.signInTime.getTime();
    });
  })();

  const handleDownloadLog = () => {
    const now = new Date();
    const dateString = now.toISOString().split('T')[0];
    const sanitizedTaskNumber = taskNumber.replace(/[^a-z0-9]/gi, '_');
    const fileName = taskNumber ? `task_${sanitizedTaskNumber}_log_${dateString}.txt` : `attendance_log_${dateString}.txt`;

    let content = `Grand Forks Search and Rescue - Attendance Log\n`;
    if (taskNumber) content += `Task #: ${taskNumber}\n`;
    content += `Generated on: ${new Date().toLocaleString()}\n`;
    content += "==================================================================================\n\n";

    if (sessionLog.length > 0) {
      const maxNameLength = Math.max(...sessionLog.map(e => e.name.length), 'Member'.length);
      const nameHeader = 'Member'.padEnd(maxNameLength, ' ');
      const statusHeader = 'Status'.padEnd(12, ' ');
      const signInHeader = 'Signed In'.padEnd(22, ' ');
      const signOutHeader = 'Signed Out';

      content += `${nameHeader} | ${statusHeader} | ${signInHeader} | ${signOutHeader}\n`;
      content += `${'-'.repeat(maxNameLength)}-+-${'-'.repeat(12)}-+-${'-'.repeat(22)}-+-${'-'.repeat(22)}\n`;

      sessionLog.forEach(session => {
        const name = session.name.padEnd(maxNameLength, ' ');
        const status = session.status.padEnd(12, ' ');
        const signIn = formatDateTime(session.signInTime).padEnd(22, ' ');
        const signOut = session.signOutTime ? formatDateTime(session.signOutTime) : '...';
        content += `${name} | ${status} | ${signIn} | ${signOut}\n`;
      });
    } else {
      content += "\nNo attendance records found.\n";
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('Log downloaded.', 'info');
  };

  const availableMembersForSignIn = members.filter(m => !activeSessions.some(s => s.name === m.name));

  // --- JSX RENDER ---
  return (
    <div className="app-container">
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`} role="status">
            {toast.message}
          </div>
        ))}
      </div>

      <header>
        <svg className="header-logo" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
        <h1>Grand Forks Search and Rescue</h1>
        {taskNumber && <h2 className="task-number">Task #: {taskNumber}</h2>}
        <p>Sign members in and out to track attendance.</p>
      </header>
      
      <div className="header-controls">
        <div className="header-actions-group">
          <button onClick={openSignInModal} className="primary-action-btn" disabled={availableMembersForSignIn.length === 0}>
            Sign In
          </button>
        </div>
         <div className="header-actions-group">
           <button onClick={openNewTaskModal} className="new-task-btn" aria-label="Start a new task session">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/></svg>
            New Task #
          </button>
           <button onClick={openListEditModal} className="edit-list-btn">
             <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
               <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/>
             </svg>
             Edit List
           </button>
           <button onClick={() => openAddEditModal('add')} className="add-member-btn">
             <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
               <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
             </svg>
             Add Member
           </button>
         </div>
      </div>

      <main className="main-content">
        <section className="card" aria-labelledby="log-heading">
          <div className="card-header">
            <div className="card-header-title">
              <h2 id="log-heading">Attendance Log</h2>
              {activeSessions.length > 0 && <span className="active-member-count">{activeSessions.length} Active</span>}
            </div>
          </div>
          <div className="log-container">
            {sessionLog.length > 0 ? (
              <ul className="log-list">
                {sessionLog.map((session) => (
                  <li key={`${session.name}-${session.signInTime.toISOString()}`} className={`log-list-item status-${session.status === 'Signed In' ? 'signedin' : 'signedout'}`}>
                    <div className="member-details">
                      <span className="status-dot"></span>
                      <span className="member-name">{session.name}</span>
                    </div>
                    <div className="session-details">
                      <span className="timestamp">In: {formatDateTime(session.signInTime)}</span>
                      {session.signOutTime ? (
                        <span className="timestamp">Out: {formatDateTime(session.signOutTime)}</span>
                      ) : (
                        <button onClick={() => handleSignOut(session.name)} className="signout-btn">Sign Out</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
               <div className="empty-state">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                  <p>No members have signed in yet.</p>
               </div>
            )}
          </div>
        </section>
      </main>

      {isAddEditModalOpen && (
        <div className="modal-overlay" onClick={closeAddEditModal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 id="modal-title">{modalMode === 'add' ? 'Add New Member' : 'Edit Member Name'}</h3>
            <div className="form-group">
              <label htmlFor="memberNameInput">Member Name</label>
              <input type="text" id="memberNameInput" className="modal-input" value={memberNameInput} onChange={(e) => setMemberNameInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveMember()} autoFocus/>
              {error && <p className="error-message">{error}</p>}
            </div>
            <div className="modal-actions">
              {modalMode === 'edit' && <button onClick={handleDeleteMember} className="delete-btn">Delete Member</button>}
              <button onClick={closeAddEditModal} className="cancel-btn">Cancel</button>
              <button onClick={handleSaveMember} className="save-btn">Save</button>
            </div>
          </div>
        </div>
      )}

      {isListEditModalOpen && (
        <div className="modal-overlay" onClick={closeListEditModal} role="dialog" aria-modal="true" aria-labelledby="list-modal-title">
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 id="list-modal-title">Edit Member List</h3>
            <p className="modal-instructions">Remove members from the list. Saving will replace the entire member list and clear all existing sign-in data.</p>
            <div className="modal-member-list-container">
              {editingMemberList.length > 0 ? (
                <ul className="modal-member-list">
                  {editingMemberList.map(member => (
                    <li key={member.name} className="modal-member-item">
                      <span>{member.name}</span>
                      <button onClick={() => handleRemoveMemberFromEditList(member.name)} className="modal-member-delete-btn" aria-label={`Remove ${member.name}`}>
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="empty-state-modal">No members to display.</p>}
            </div>
            <div className="modal-actions">
              <button onClick={closeListEditModal} className="cancel-btn">Cancel</button>
              <button onClick={handleSaveMemberList} className="save-btn">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {isSignInModalOpen && (
        <div className="modal-overlay" onClick={closeSignInModal} role="dialog" aria-modal="true" aria-labelledby="signin-modal-title">
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 id="signin-modal-title">Sign In a Member</h3>
             <div className="form-group">
              <label htmlFor="member-signin-select">Select Member</label>
               <select id="member-signin-select" className="modal-input" value={signInMemberName} onChange={(e) => setSignInMemberName(e.target.value)} autoFocus>
                 {availableMembersForSignIn.map(member => (
                   <option key={member.name} value={member.name}>{member.name}</option>
                 ))}
               </select>
            </div>
            <div className="modal-actions">
              <button onClick={closeSignInModal} className="cancel-btn">Cancel</button>
              <button onClick={handleSignIn} className="save-btn" disabled={!signInMemberName}>Sign In</button>
            </div>
          </div>
        </div>
      )}

      {isNewTaskModalOpen && (
        <div className="modal-overlay" onClick={closeNewTaskModal} role="dialog" aria-modal="true" aria-labelledby="new-task-modal-title">
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 id="new-task-modal-title">Start New Task Session</h3>
            <div className="form-group">
              <label htmlFor="taskNumberInput">Task Number</label>
              <input type="text" id="taskNumberInput" className="modal-input" value={newTaskNumberInput} onChange={(e) => setNewTaskNumberInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleStartNewTask()} placeholder="e.g., 20240101-01" autoFocus />
            </div>
            <div className="modal-actions">
              <button onClick={closeNewTaskModal} className="cancel-btn">Cancel</button>
              <button onClick={handleStartNewTask} className="save-btn">Start Task</button>
            </div>
          </div>
        </div>
      )}

      {isConfirmModalOpen && (
        <div className="modal-overlay" onClick={closeConfirmModal} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
          <div className="modal-content modal-content-confirm" onClick={e => e.stopPropagation()}>
            <h3 id="confirm-modal-title">Are you sure?</h3>
            <p className="confirm-modal-message">{confirmModalProps.message}</p>
            <div className="modal-actions">
              <button onClick={closeConfirmModal} className="cancel-btn">Cancel</button>
              <button onClick={handleConfirm} className="confirm-action-btn">Confirm</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-actions">
        <button onClick={handleClearLog} className="clear-log-btn" aria-label="Clear all attendance records for the current task" disabled={activeSessions.length === 0 && attendanceLog.length === 0}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
          Clear Log
        </button>
        <button onClick={handleDownloadLog} className="download-btn" aria-label="Download attendance log as a text file" disabled={activeSessions.length === 0 && attendanceLog.length === 0}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
          Download Log (.txt)
        </button>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<React.StrictMode><App /></React.StrictMode>);