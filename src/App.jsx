import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Calendar, 
  Users, 
  Send, 
  Plus, 
  RefreshCw, 
  User, 
  BookOpen,
  GraduationCap,
  Sparkles,
  Percent,
  MapPin,
  Mail,
  Phone
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
  const [admissions, setAdmissions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [students, setStudents] = useState([]);
  const [dataError, setDataError] = useState(null);

  // Filter/Search states
  const [activeTab, setActiveTab] = useState('admissions'); // admissions, courses, departments, students
  const [selectedCourseDept, setSelectedCourseDept] = useState('all');
  const [courseSearchText, setCourseSearchText] = useState('');

  const messagesEndRef = useRef(null);

  // Initialize first session
  useEffect(() => {
    // Load existing sessions from localStorage or create new
    const savedSessions = JSON.parse(localStorage.getItem('college_chat_sessions') || '[]');
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

  // Real-time polling for admissions, courses, departments, students
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
      const [resAdmissions, resCourses, resDepartments, resStudents] = await Promise.all([
        fetch(`${API_BASE}/admissions/`),
        fetch(`${API_BASE}/courses/`),
        fetch(`${API_BASE}/departments/`),
        fetch(`${API_BASE}/students/`)
      ]);

      if (resAdmissions.ok) {
        const data = await resAdmissions.json();
        // Sort admissions by ID descending
        setAdmissions(data.sort((a, b) => b.admission_id - a.admission_id));
      }
      if (resCourses.ok) {
        setCourses(await resCourses.json());
      }
      if (resDepartments.ok) {
        setDepartments(await resDepartments.json());
      }
      if (resStudents.ok) {
        const data = await resStudents.json();
        setStudents(data.sort((a, b) => b.student_id - a.student_id));
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
        message: "Hello! I am your AI College Admission Assistant. 🎓\nHow can I help you today? I can answer questions about B.Tech/M.Tech courses, explain departments, display eligibility and fees, check seat availability, or register and submit your admission application!",
        created_at: new Date().toISOString()
      }
    ]);
    
    // Save to list
    const updatedSessions = [newId, ...sessionList.filter(s => s !== newId)];
    setSessionList(updatedSessions);
    localStorage.setItem('college_chat_sessions', JSON.stringify(updatedSessions));
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
        message: "Hello! Welcome back. 🎓\nHow can I assist you with college admissions or course details today?",
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

        // Trigger immediate pull to reflect database updates
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

  // Cancel admission application
  const handleCancelAdmission = async (id) => {
    if (!confirm('Are you sure you want to cancel this admission application?')) return;
    try {
      const res = await fetch(`${API_BASE}/admissions/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchDatabaseData();
      } else {
        alert('Failed to cancel admission application.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend.');
    }
  };

  // Quick Reply Suggestion Chips
  const suggestionChips = [
    "What B.Tech courses are available?",
    "Tell me about the CS Department",
    "Show course fees and eligibility",
    "Check seat availability in CS"
  ];

  // Helper to format date/time
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
      return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Filter courses by department and search term
  const filteredCourses = courses.filter(course => {
    const matchesDept = selectedCourseDept === 'all' || 
                        course.department_id.toString() === selectedCourseDept ||
                        (course.department && course.department.department_name.toLowerCase().includes(selectedCourseDept.toLowerCase()));
    const matchesSearch = course.course_name.toLowerCase().includes(courseSearchText.toLowerCase()) || 
                          course.eligibility.toLowerCase().includes(courseSearchText.toLowerCase()) ||
                          (course.description && course.description.toLowerCase().includes(courseSearchText.toLowerCase()));
    return matchesDept && matchesSearch;
  });

  return (
    <div className="app-container">
      {/* 1. Left Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <GraduationCap size={20} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <span className="brand-name">College AI Counselor</span>
        </div>

        <div className="sidebar-content">
          <button className="btn-new-chat" onClick={createNewSession}>
            <Plus size={16} /> New Chat
          </button>

          <div>
            <div className="section-title">Admission Sessions</div>
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
                className={`nav-item ${activeTab === 'admissions' ? 'active' : ''}`}
                onClick={() => setActiveTab('admissions')}
              >
                <Calendar size={18} />
                <span>Admissions Log</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'courses' ? 'active' : ''}`}
                onClick={() => setActiveTab('courses')}
              >
                <GraduationCap size={18} />
                <span>Courses Offered</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'departments' ? 'active' : ''}`}
                onClick={() => setActiveTab('departments')}
              >
                <BookOpen size={18} />
                <span>Departments</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'students' ? 'active' : ''}`}
                onClick={() => setActiveTab('students')}
              >
                <Users size={18} />
                <span>Students Database</span>
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
              <h2>College Admission Counselor</h2>
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
                  {msg.sender === 'user' ? 'U' : 'C'}
                </div>
                <div>
                  <div className="message-bubble" style={{ whiteSpace: 'pre-wrap' }}>
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
                <div className="avatar">C</div>
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
                placeholder="Ask about courses, fees, available seats, register and apply for admission..."
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
              {activeTab === 'admissions' && (
                <>
                  <Calendar className="inspector-icon" size={18} />
                  <span>Admissions Log</span>
                </>
              )}
              {activeTab === 'courses' && (
                <>
                  <GraduationCap className="inspector-icon" size={18} />
                  <span>Courses Offered</span>
                </>
              )}
              {activeTab === 'departments' && (
                <>
                  <BookOpen className="inspector-icon" size={18} />
                  <span>Departments Catalog</span>
                </>
              )}
              {activeTab === 'students' && (
                <>
                  <Users className="inspector-icon" size={18} />
                  <span>Students Directory</span>
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

            {/* TAB CONTENT: ADMISSIONS */}
            {activeTab === 'admissions' && (
              <div>
                {admissions.length === 0 ? (
                  <div className="empty-state">
                    <Calendar className="empty-icon" />
                    <p className="empty-text">No admission applications found.</p>
                  </div>
                ) : (
                  admissions.map(adm => (
                    <div key={adm.admission_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">Application #{adm.admission_id}</span>
                        <span className={`badge ${adm.status === 'Cancelled' ? 'cancelled' : 'confirmed'}`}>
                          {adm.status}
                        </span>
                      </div>
                      <div className="data-card-grid">
                        <div className="data-item">
                          <span className="data-label">Student ID</span>
                          <span className="data-value">{adm.student_id}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Student Name</span>
                          <span className="data-value">{adm.student ? adm.student.name : 'N/A'}</span>
                        </div>
                        <div className="data-item" style={{ gridColumn: 'span 2' }}>
                          <span className="data-label">Course Applied</span>
                          <span className="data-value">{adm.course ? adm.course.course_name : `Course ID ${adm.course_id}`}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Application Date</span>
                          <span className="data-value">{formatDateDisplay(adm.application_date)}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Marks Percentage</span>
                          <span className="data-value">{adm.student && adm.student.marks_percentage ? `${adm.student.marks_percentage}%` : 'N/A'}</span>
                        </div>
                        {adm.remarks && (
                          <div className="data-item" style={{ gridColumn: 'span 2' }}>
                            <span className="data-label">Remarks</span>
                            <span className="data-value" style={{ fontStyle: 'italic' }}>
                              "{adm.remarks}"
                            </span>
                          </div>
                        )}
                      </div>
                      {adm.status !== 'Cancelled' && (
                        <div className="data-card-actions">
                          <button 
                            className="btn-action-small danger"
                            onClick={() => handleCancelAdmission(adm.admission_id)}
                          >
                            Cancel Application
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: COURSES */}
            {activeTab === 'courses' && (
              <div>
                {/* Search Bar */}
                <div className="search-container">
                  <input 
                    type="text" 
                    className="form-input search-input" 
                    placeholder="Search courses or criteria..." 
                    value={courseSearchText}
                    onChange={(e) => setCourseSearchText(e.target.value)}
                  />
                </div>

                {/* Department Filters */}
                <div className="category-tabs">
                  <span 
                    className={`cat-tab ${selectedCourseDept === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedCourseDept('all')}
                  >
                    All
                  </span>
                  {departments.map(dept => (
                    <span 
                      key={dept.department_id} 
                      className={`cat-tab ${selectedCourseDept === dept.department_id.toString() ? 'active' : ''}`}
                      onClick={() => setSelectedCourseDept(dept.department_id.toString())}
                    >
                      {dept.department_name.replace(' Department', '')}
                    </span>
                  ))}
                </div>

                {filteredCourses.length === 0 ? (
                  <div className="empty-state">
                    <GraduationCap className="empty-icon" />
                    <p className="empty-text">No courses match your selection.</p>
                  </div>
                ) : (
                  filteredCourses.map(c => (
                    <div key={c.course_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">{c.course_name}</span>
                        <span className="data-value" style={{ color: 'var(--accent-secondary)', fontWeight: 'bold' }}>
                          ₹{parseInt(c.fees).toLocaleString()} / yr
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        Duration: {c.duration} • Seats: {c.available_seats} available (of {c.total_seats})
                      </div>
                      <div className="data-card-grid">
                        <div className="data-item" style={{ gridColumn: 'span 2' }}>
                          <span className="data-label">Eligibility Criteria</span>
                          <span className="data-value" style={{ color: 'var(--status-warning)', fontWeight: 500 }}>{c.eligibility}</span>
                        </div>
                        {c.description && (
                          <div className="data-item" style={{ gridColumn: 'span 2' }}>
                            <span className="data-label">Course Focus</span>
                            <span className="data-value">{c.description}</span>
                          </div>
                        )}
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
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '6px', fontWeight: 500 }}>
                        Head: {dept.head_of_department || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {dept.description}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: STUDENTS */}
            {activeTab === 'students' && (
              <div>
                {students.length === 0 ? (
                  <div className="empty-state">
                    <Users className="empty-icon" />
                    <p className="empty-text">No registered students yet.</p>
                  </div>
                ) : (
                  students.map(s => (
                    <div key={s.student_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} style={{ color: 'var(--accent-primary)' }} />
                          {s.name} (ID: {s.student_id})
                        </span>
                        {s.marks_percentage && (
                          <span className="badge confirmed" style={{ background: 'var(--accent-secondary-glow)', color: 'var(--accent-secondary)' }}>
                            {s.marks_percentage}%
                          </span>
                        )}
                      </div>
                      <div className="data-card-grid" style={{ gridTemplateColumns: '1fr' }}>
                        <div className="data-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Phone size={12} className="data-label" />
                          <span className="data-value">{s.phone_number}</span>
                        </div>
                        {s.email && (
                          <div className="data-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Mail size={12} className="data-label" />
                            <span className="data-value">{s.email}</span>
                          </div>
                        )}
                        <div className="data-item" style={{ display: 'flex', gap: '15px' }}>
                          <div>
                            <span className="data-label">DOB</span>
                            <span className="data-value">{s.date_of_birth ? formatDateDisplay(s.date_of_birth) : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="data-label">Gender</span>
                            <span className="data-value">{s.gender || 'N/A'}</span>
                          </div>
                        </div>
                        {s.address && (
                          <div className="data-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <MapPin size={12} className="data-label" style={{ marginTop: '2px' }} />
                            <span className="data-value">{s.address}</span>
                          </div>
                        )}
                        <div className="data-item">
                          <span className="data-label">Registered Date</span>
                          <span className="data-value">{new Date(s.created_at).toLocaleDateString()}</span>
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
