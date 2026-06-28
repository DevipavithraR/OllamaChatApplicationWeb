import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Calendar, 
  Utensils, 
  Users, 
  Send, 
  Plus, 
  RefreshCw, 
  Clock, 
  User, 
  Sparkles, 
  BookOpen,
  Heart
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

function App() {
  // Chat state
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [sessionList, setSessionList] = useState([]);

  // Database lists
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState(null);

  // Filter/Search states
  const [activeTab, setActiveTab] = useState('appointments'); // appointments, doctors, departments, patients
  const [selectedDoctorDept, setSelectedDoctorDept] = useState('all');
  const [doctorSearchText, setDoctorSearchText] = useState('');

  const messagesEndRef = useRef(null);

  // Initialize first session
  useEffect(() => {
    // Load existing sessions from localStorage or create new
    const savedSessions = JSON.parse(localStorage.getItem('hospital_chat_sessions') || '[]');
    if (savedSessions.length > 0) {
      setSessionList(savedSessions);
      selectSession(savedSessions[0]);
    } else {
      createNewSession();
    }
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingChat]);

  // Real-time polling for appointments, doctors, departments, patients
  useEffect(() => {
    fetchDatabaseData();
    const interval = setInterval(() => {
      fetchDatabaseData();
    }, 4000); // Poll database lists every 4 seconds

    return () => clearInterval(interval);
  }, []);

  // Fetch all lists from backend
  const fetchDatabaseData = async () => {
    try {
      // Parallel fetches for speed
      const [resAppointments, resDoctors, resDepartments, resPatients] = await Promise.all([
        fetch(`${API_BASE}/appointments/`),
        fetch(`${API_BASE}/doctors/`),
        fetch(`${API_BASE}/departments/`),
        fetch(`${API_BASE}/patients/`)
      ]);

      if (resAppointments.ok) {
        const data = await resAppointments.json();
        // Sort appointments by created_at or appointment_datetime descending
        setAppointments(data.sort((a, b) => b.appointment_id - a.appointment_id));
      }
      if (resDoctors.ok) {
        setDoctors(await resDoctors.json());
      }
      if (resDepartments.ok) {
        setDepartments(await resDepartments.json());
      }
      if (resPatients.ok) {
        const data = await resPatients.json();
        setPatients(data.sort((a, b) => b.patient_id - a.patient_id));
      }
      setDataError(null);
    } catch (err) {
      console.error('Error polling backend APIs:', err);
      setDataError('Backend connection offline. Make sure the FastAPI app is running on port 8000.');
    }
  };

  // Create a brand new chat session
  const createNewSession = () => {
    const newId = `session_${Math.floor(100000 + Math.random() * 900000)}`;
    setSessionId(newId);
    setMessages([
      {
        sender: 'assistant',
        message: "Hello! I am your Hope Hospital AI Receptionist. 🏥\nHow can I help you today? I can help you find doctors, explain our departments, register you as a patient, or book, reschedule, or cancel appointments!",
        created_at: new Date().toISOString()
      }
    ]);
    
    // Save to list
    const updatedSessions = [newId, ...sessionList.filter(s => s !== newId)];
    setSessionList(updatedSessions);
    localStorage.setItem('hospital_chat_sessions', JSON.stringify(updatedSessions));
  };

  // Switch to an existing session and fetch its history
  const selectSession = async (sid) => {
    setSessionId(sid);
    setIsLoadingChat(true);
    try {
      const res = await fetch(`${API_BASE}/chatbot/history/${sid}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          setDefaultGreeting();
        }
      } else {
        setDefaultGreeting();
      }
    } catch (err) {
      console.warn('Could not retrieve history, resetting to default greeting:', err);
      setDefaultGreeting();
    } finally {
      setIsLoadingChat(false);
    }
  };

  const setDefaultGreeting = () => {
    setMessages([
      {
        sender: 'assistant',
        message: "Hello! Welcome back. 🏥\nHow can I assist you with appointments or doctors today?",
        created_at: new Date().toISOString()
      }
    ]);
  };

  // Send message to chatbot
  const handleSendMessage = async (e, customText = null) => {
    if (e) e.preventDefault();
    const textToSend = customText || userInput;
    if (!textToSend.trim() || isLoadingChat) return;

    if (!customText) setUserInput('');

    // Append user message
    const userMsg = {
      sender: 'user',
      message: textToSend,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoadingChat(true);

    try {
      const res = await fetch(`${API_BASE}/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: textToSend
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Append bot reply
        setMessages(prev => [...prev, {
          sender: 'assistant',
          message: data.response,
          created_at: new Date().toISOString()
        }]);

        // Trigger immediate pull of appointments/patients to reflect updates
        fetchDatabaseData();
      } else {
        throw new Error('API Error');
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        sender: 'assistant',
        message: 'I encountered a network error. Please verify the backend service is running.',
        created_at: new Date().toISOString()
      }]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Cancel appointment
  const handleCancelAppointment = async (id) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const res = await fetch(`${API_BASE}/appointments/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchDatabaseData();
      } else {
        alert('Failed to cancel appointment.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend.');
    }
  };

  // Quick Reply Suggestion Chips
  const suggestionChips = [
    "Who are the cardiologists?",
    "Register me as a patient",
    "Book an appointment with Dr. Priya",
    "View my upcoming appointments"
  ];

  // Helper to format date strings
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDateDisplay = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  // Filter doctors by department and search term
  const filteredDoctors = doctors.filter(doc => {
    const matchesDept = selectedDoctorDept === 'all' || doc.department.toLowerCase() === selectedDoctorDept.toLowerCase();
    const matchesSearch = doc.name.toLowerCase().includes(doctorSearchText.toLowerCase()) || 
                          doc.specialization.toLowerCase().includes(doctorSearchText.toLowerCase()) ||
                          doc.department.toLowerCase().includes(doctorSearchText.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <div className="app-container">
      {/* 1. Left Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Heart size={20} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <span className="brand-name">Hope AI Receptionist</span>
        </div>

        <div className="sidebar-content">
          <button className="btn-new-chat" onClick={createNewSession}>
            <Plus size={16} /> New Chat
          </button>

          <div>
            <div className="section-title">Active Conversations</div>
            <div className="session-list">
              {sessionList.map(sid => (
                <div 
                  key={sid} 
                  className={`session-item ${sid === sessionId ? 'active' : ''}`}
                  onClick={() => selectSession(sid)}
                >
                  <MessageSquare size={14} />
                  <span>{sid.substring(0, 15)}...</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <div className="sidebar-nav">
              <div 
                className={`nav-item ${activeTab === 'appointments' ? 'active' : ''}`}
                onClick={() => setActiveTab('appointments')}
              >
                <Calendar size={18} />
                <span>Appointments Log</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'doctors' ? 'active' : ''}`}
                onClick={() => setActiveTab('doctors')}
              >
                <User size={18} />
                <span>Doctors Directory</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'departments' ? 'active' : ''}`}
                onClick={() => setActiveTab('departments')}
              >
                <BookOpen size={18} />
                <span>Departments</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'patients' ? 'active' : ''}`}
                onClick={() => setActiveTab('patients')}
              >
                <Users size={18} />
                <span>Patients Log</span>
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div>Status: Connected to Local Host</div>
          <div style={{ color: dataError ? 'var(--status-danger)' : 'var(--status-success)' }}>
            ● {dataError ? 'Offline' : 'API Online'}
          </div>
        </div>
      </aside>

      {/* 2. Main Workspace */}
      <main className="main-workspace">
        {/* Center: Chat Application */}
        <section className="chat-container">
          <header className="chat-header">
            <div className="chat-header-info">
              <h2>Hospital AI Receptionist</h2>
              <p>Assistant active • Session ID: {sessionId}</p>
            </div>
            {dataError && (
              <div style={{ color: 'var(--status-danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Backend Offline
              </div>
            )}
          </header>

          <div className="messages-area">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`message-wrapper ${msg.sender === 'user' ? 'user' : 'assistant'}`}
              >
                <div className="avatar">
                  {msg.sender === 'user' ? 'U' : 'B'}
                </div>
                <div>
                  <div className="message-bubble">
                    {msg.message}
                  </div>
                  <div className="message-time">
                    {msg.created_at ? formatTime(msg.created_at) : formatTime(new Date())}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoadingChat && (
              <div className="message-wrapper assistant">
                <div className="avatar">B</div>
                <div className="message-bubble" style={{ padding: '12px' }}>
                  <div className="typing-indicator">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Preset Chip Suggestions */}
          <div className="suggestions-container">
            {suggestionChips.map((chip, index) => (
              <button 
                key={index} 
                className="chip"
                onClick={() => handleSendMessage(null, chip)}
                disabled={isLoadingChat}
              >
                {chip}
              </button>
            ))}
          </div>

          <footer className="chat-input-area">
            <form onSubmit={handleSendMessage} className="chat-input-form">
              <input 
                type="text" 
                className="chat-input"
                placeholder="Ask about doctors, explain departments, book appointments..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={isLoadingChat}
              />
              <button type="submit" className="btn-send" disabled={isLoadingChat}>
                <Send size={18} />
              </button>
            </form>
          </footer>
        </section>

        {/* Right Pane: Database Inspector */}
        <section className="inspector-panel">
          <header className="inspector-header">
            <div className="inspector-title">
              {activeTab === 'appointments' && (
                <>
                  <Calendar className="inspector-icon" size={18} />
                  <span>Appointments Log</span>
                </>
              )}
              {activeTab === 'doctors' && (
                <>
                  <User className="inspector-icon" size={18} />
                  <span>Doctors Directory</span>
                </>
              )}
              {activeTab === 'departments' && (
                <>
                  <BookOpen className="inspector-icon" size={18} />
                  <span>Departments Catalog</span>
                </>
              )}
              {activeTab === 'patients' && (
                <>
                  <Users className="inspector-icon" size={18} />
                  <span>Patients Directory</span>
                </>
              )}
            </div>
            <button className="btn-refresh" onClick={fetchDatabaseData} title="Refresh lists">
              <RefreshCw size={16} />
            </button>
          </header>

          <div className="inspector-content">
            {dataError && (
              <div className="form-container" style={{ borderColor: 'var(--status-danger)', background: 'var(--status-danger-bg)' }}>
                <div style={{ color: 'var(--status-danger)', fontSize: '0.85rem', fontWeight: 500 }}>
                  Connection Issue
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                  {dataError}
                </div>
              </div>
            )}

            {/* TAB CONTENT: APPOINTMENTS */}
            {activeTab === 'appointments' && (
              <div>
                {appointments.length === 0 ? (
                  <div className="empty-state">
                    <Calendar className="empty-icon" />
                    <p className="empty-text">No appointments found in database.</p>
                  </div>
                ) : (
                  appointments.map(app => (
                    <div key={app.appointment_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">Appointment #{app.appointment_id}</span>
                        <span className={`badge ${app.status.toLowerCase()}`}>
                          {app.status}
                        </span>
                      </div>
                      <div className="data-card-grid">
                        <div className="data-item">
                          <span className="data-label">Patient ID</span>
                          <span className="data-value">{app.patient_id}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Doctor</span>
                          <span className="data-value">{app.doctor ? app.doctor.name : `Doctor ID ${app.doctor_id}`}</span>
                        </div>
                        <div className="data-item" style={{ gridColumn: 'span 2' }}>
                          <span className="data-label">Date & Time</span>
                          <span className="data-value">{formatDateDisplay(app.appointment_datetime)}</span>
                        </div>
                        {app.special_notes && (
                          <div className="data-item" style={{ gridColumn: 'span 2' }}>
                            <span className="data-label">Notes/Symptoms</span>
                            <span className="data-value" style={{ fontStyle: 'italic' }}>
                              "{app.special_notes}"
                            </span>
                          </div>
                        )}
                      </div>
                      {app.status.toLowerCase() !== 'cancelled' && (
                        <div className="data-card-actions">
                          <button 
                            className="btn-action-small danger"
                            onClick={() => handleCancelAppointment(app.appointment_id)}
                          >
                            Cancel Appointment
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: DOCTORS DIRECTORY */}
            {activeTab === 'doctors' && (
              <div>
                {/* Search Bar */}
                <div className="search-container">
                  <input 
                    type="text" 
                    className="form-input search-input" 
                    placeholder="Search doctor or specialization..." 
                    value={doctorSearchText}
                    onChange={(e) => setDoctorSearchText(e.target.value)}
                  />
                </div>

                {/* Department Filters */}
                <div className="category-tabs">
                  {['all', 'Cardiology', 'Pediatrics', 'Orthopedics', 'Neurology', 'General Medicine'].map(dept => (
                    <span 
                      key={dept} 
                      className={`cat-tab ${selectedDoctorDept === dept ? 'active' : ''}`}
                      onClick={() => setSelectedDoctorDept(dept)}
                    >
                      {dept}
                    </span>
                  ))}
                </div>

                {filteredDoctors.length === 0 ? (
                  <div className="empty-state">
                    <User className="empty-icon" />
                    <p className="empty-text">No doctors match your selection.</p>
                  </div>
                ) : (
                  filteredDoctors.map(doc => (
                    <div key={doc.doctor_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">{doc.name}</span>
                        <span className="data-value" style={{ color: 'var(--accent-secondary)', fontWeight: 'bold' }}>
                          ₹{doc.consultation_fee}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        {doc.specialization} • {doc.experience} Years Experience
                      </div>
                      <div className="data-card-grid">
                        <div className="data-item">
                          <span className="data-label">Available Days</span>
                          <span className="data-value">{doc.available_days}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Available Time</span>
                          <span className="data-value">{doc.available_time}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: DEPARTMENTS */}
            {activeTab === 'departments' && (
              <div>
                {departments.length === 0 ? (
                  <div className="empty-state">
                    <BookOpen className="empty-icon" />
                    <p className="empty-text">No departments found.</p>
                  </div>
                ) : (
                  departments.map(dept => (
                    <div key={dept.department_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">{dept.department_name}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {dept.description}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: PATIENTS */}
            {activeTab === 'patients' && (
              <div>
                {patients.length === 0 ? (
                  <div className="empty-state">
                    <Users className="empty-icon" />
                    <p className="empty-text">No registered patients yet.</p>
                  </div>
                ) : (
                  patients.map(p => (
                    <div key={p.patient_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} style={{ color: 'var(--accent-primary)' }} />
                          {p.name} (ID: {p.patient_id})
                        </span>
                      </div>
                      <div className="data-card-grid" style={{ gridTemplateColumns: '1fr' }}>
                        <div className="data-item">
                          <span className="data-label">Phone</span>
                          <span className="data-value">{p.phone_number}</span>
                        </div>
                        {p.email && (
                          <div className="data-item">
                            <span className="data-label">Email</span>
                            <span className="data-value">{p.email}</span>
                          </div>
                        )}
                        <div className="data-item" style={{ display: 'flex', gap: '15px' }}>
                          <div>
                            <span className="data-label">Age</span>
                            <span className="data-value">{p.age || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="data-label">Gender</span>
                            <span className="data-value">{p.gender || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Registered Date</span>
                          <span className="data-value">{new Date(p.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
