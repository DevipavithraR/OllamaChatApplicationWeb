import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Calendar, 
  Dumbbell, 
  Users, 
  Send, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Clock, 
  User, 
  Sparkles, 
  Search, 
  Award 
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
  const [trainerBookings, setTrainerBookings] = useState([]);
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [members, setMembers] = useState([]);
  const [dataError, setDataError] = useState(null);

  // Filter/Search states
  const [activeTab, setActiveTab] = useState('bookings'); // bookings, plans, trainers, members
  const [planSearchText, setPlanSearchText] = useState('');
  const [trainerSearchText, setTrainerSearchText] = useState('');

  const messagesEndRef = useRef(null);

  // Initialize first session
  useEffect(() => {
    const savedSessions = JSON.parse(localStorage.getItem('gym_chat_sessions') || '[]');
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

  // Real-time polling for database inspector lists
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
      const [resBookings, resPlans, resTrainers, resMembers] = await Promise.all([
        fetch(`${API_BASE}/trainer_bookings/`),
        fetch(`${API_BASE}/plans/`),
        fetch(`${API_BASE}/trainers/`),
        fetch(`${API_BASE}/members/`)
      ]);

      if (resBookings.ok) {
        const data = await resBookings.json();
        setTrainerBookings(data.sort((a, b) => b.booking_id - a.booking_id));
      }
      if (resPlans.ok) {
        setMembershipPlans(await resPlans.json());
      }
      if (resTrainers.ok) {
        setTrainers(await resTrainers.json());
      }
      if (resMembers.ok) {
        const data = await resMembers.json();
        setMembers(data.sort((a, b) => b.member_id - a.member_id));
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
        content: "Hello! I am your Gym AI Receptionist. 🏋️\nHow can I help you today? I can answer membership questions, show you our plans, give trainer details, register your gym membership, or book a trainer session!",
        created_at: new Date().toISOString()
      }
    ]);
    
    const updatedSessions = [newId, ...sessionList.filter(s => s !== newId)];
    setSessionList(updatedSessions);
    localStorage.setItem('gym_chat_sessions', JSON.stringify(updatedSessions));
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
          // Format messages for fronted
          const formatted = data.messages.map(msg => ({
            sender: msg.sender,
            content: msg.message,
            created_at: msg.created_at
          }));
          setMessages(formatted);
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
        content: "Hello! Welcome back. 🏋️\nHow can I assist you with memberships, trainers, or bookings today?",
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

    const userMsg = {
      sender: 'user',
      content: textToSend,
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
        setMessages(prev => [...prev, {
          sender: 'assistant',
          content: data.response,
          created_at: new Date().toISOString()
        }]);

        // Trigger immediate pull of data to reflect updates
        fetchDatabaseData();
      } else {
        throw new Error('API Error');
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        sender: 'assistant',
        content: 'I encountered a network error. Please verify the backend service is running.',
        created_at: new Date().toISOString()
      }]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Cancel trainer booking
  const handleCancelBooking = async (id) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await fetch(`${API_BASE}/trainer_bookings/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchDatabaseData();
      } else {
        alert('Failed to cancel booking.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend.');
    }
  };

  // Quick Reply Suggestion Chips
  const suggestionChips = [
    "What membership plans do you have?",
    "Show me trainers and specializations",
    "Book a session with Rahul Sharma",
    "List my upcoming sessions"
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

  // Filter plans by search term
  const filteredPlans = membershipPlans.filter(item => {
    return item.plan_name.toLowerCase().includes(planSearchText.toLowerCase()) || 
           (item.description && item.description.toLowerCase().includes(planSearchText.toLowerCase())) ||
           (item.benefits && item.benefits.toLowerCase().includes(planSearchText.toLowerCase()));
  });

  // Filter trainers by search term
  const filteredTrainers = trainers.filter(item => {
    return item.trainer_name.toLowerCase().includes(trainerSearchText.toLowerCase()) ||
           item.specialization.toLowerCase().includes(trainerSearchText.toLowerCase());
  });

  return (
    <div className="app-container">
      {/* 1. Left Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Dumbbell size={20} />
          </div>
          <span className="brand-name">Gym Receptionist AI</span>
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
                className={`nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
                onClick={() => setActiveTab('bookings')}
              >
                <Calendar size={18} />
                <span>Trainer Bookings</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'plans' ? 'active' : ''}`}
                onClick={() => setActiveTab('plans')}
              >
                <Award size={18} />
                <span>Membership Plans</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'trainers' ? 'active' : ''}`}
                onClick={() => setActiveTab('trainers')}
              >
                <Dumbbell size={18} />
                <span>Personal Trainers</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'members' ? 'active' : ''}`}
                onClick={() => setActiveTab('members')}
              >
                <Users size={18} />
                <span>Gym Members</span>
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
              <h2>Gym Receptionist Assistant</h2>
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
                    {msg.content}
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
                placeholder="Ask about membership plans, trainers, or book a workout session..."
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
              {activeTab === 'bookings' && (
                <>
                  <Calendar className="inspector-icon" size={18} />
                  <span>Trainer Bookings Log</span>
                </>
              )}
              {activeTab === 'plans' && (
                <>
                  <Award className="inspector-icon" size={18} />
                  <span>Membership Plans Catalog</span>
                </>
              )}
              {activeTab === 'trainers' && (
                <>
                  <Dumbbell className="inspector-icon" size={18} />
                  <span>Personal Trainers Directory</span>
                </>
              )}
              {activeTab === 'members' && (
                <>
                  <Users className="inspector-icon" size={18} />
                  <span>Registered Members Directory</span>
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

            {/* TAB CONTENT: BOOKINGS */}
            {activeTab === 'bookings' && (
              <div>
                {trainerBookings.length === 0 ? (
                  <div className="empty-state">
                    <Calendar className="empty-icon" />
                    <p className="empty-text">No trainer bookings found in database.</p>
                  </div>
                ) : (
                  trainerBookings.map(res => (
                    <div key={res.booking_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">Booking #{res.booking_id}</span>
                        <span className={`badge ${res.status.toLowerCase()}`}>
                          {res.status}
                        </span>
                      </div>
                      <div className="data-card-grid">
                        <div className="data-item">
                          <span className="data-label">Member ID</span>
                          <span className="data-value">{res.member_id}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Trainer ID</span>
                          <span className="data-value">{res.trainer_id}</span>
                        </div>
                        <div className="data-item" style={{ gridColumn: 'span 2' }}>
                          <span className="data-label">Time</span>
                          <span className="data-value">{formatDateDisplay(res.booking_datetime)}</span>
                        </div>
                        {res.training_goal && (
                          <div className="data-item" style={{ gridColumn: 'span 2' }}>
                            <span className="data-label">Training Goal</span>
                            <span className="data-value" style={{ fontStyle: 'italic' }}>
                              "{res.training_goal}"
                            </span>
                          </div>
                        )}
                      </div>
                      {res.status.toLowerCase() !== 'cancelled' && (
                        <div className="data-card-actions">
                          <button 
                            className="btn-action-small danger"
                            onClick={() => handleCancelBooking(res.booking_id)}
                          >
                            Cancel Booking
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: MEMBERSHIP PLANS */}
            {activeTab === 'plans' && (
              <div>
                <div className="search-container">
                  <input 
                    type="text" 
                    className="form-input search-input" 
                    placeholder="Search membership plans..." 
                    value={planSearchText}
                    onChange={(e) => setPlanSearchText(e.target.value)}
                  />
                </div>

                {filteredPlans.length === 0 ? (
                  <div className="empty-state">
                    <Award className="empty-icon" />
                    <p className="empty-text">No plans match your search.</p>
                  </div>
                ) : (
                  filteredPlans.map(item => (
                    <div key={item.plan_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">{item.plan_name}</span>
                        <span className="data-value" style={{ color: 'var(--accent-secondary)', fontWeight: 'bold' }}>
                          ₹{Number(item.price).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        {item.description}
                      </div>
                      <div className="data-card-grid" style={{ gridTemplateColumns: '1fr' }}>
                        <div className="data-item">
                          <span className="data-label">Duration</span>
                          <span className="data-value">{item.duration}</span>
                        </div>
                        {item.benefits && (
                          <div className="data-item" style={{ marginTop: '4px' }}>
                            <span className="data-label">Benefits</span>
                            <span className="data-value" style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
                              {item.benefits.split(',').map((b, idx) => (
                                <span key={idx} style={{ display: 'block', paddingLeft: '8px', position: 'relative' }}>
                                  • {b.trim()}
                                </span>
                              ))}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: TRAINERS */}
            {activeTab === 'trainers' && (
              <div>
                <div className="search-container">
                  <input 
                    type="text" 
                    className="form-input search-input" 
                    placeholder="Search by name or specialization..." 
                    value={trainerSearchText}
                    onChange={(e) => setTrainerSearchText(e.target.value)}
                  />
                </div>

                {filteredTrainers.length === 0 ? (
                  <div className="empty-state">
                    <Dumbbell className="empty-icon" />
                    <p className="empty-text">No trainers match your search.</p>
                  </div>
                ) : (
                  filteredTrainers.map(t => (
                    <div key={t.trainer_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">{t.trainer_name}</span>
                        <span className={`badge ${t.status.toLowerCase() === 'active' ? 'available' : 'cancelled'}`}>
                          {t.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', fontWeight: 500, marginBottom: '6px' }}>
                        {t.specialization}
                      </div>
                      <div className="data-card-grid">
                        <div className="data-item">
                          <span className="data-label">Experience</span>
                          <span className="data-value">{t.experience}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Session Fee</span>
                          <span className="data-value">₹{Number(t.session_fee).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="data-item" style={{ gridColumn: 'span 2' }}>
                          <span className="data-label">Availability</span>
                          <span className="data-value">{t.available_days} ({t.available_time})</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: MEMBERS */}
            {activeTab === 'members' && (
              <div>
                {members.length === 0 ? (
                  <div className="empty-state">
                    <Users className="empty-icon" />
                    <p className="empty-text">No registered gym members yet.</p>
                  </div>
                ) : (
                  members.map(m => (
                    <div key={m.member_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} style={{ color: 'var(--accent-primary)' }} />
                          {m.name} (ID: {m.member_id})
                        </span>
                        <span className={`badge ${m.membership_status.toLowerCase() === 'active' ? 'available' : 'cancelled'}`}>
                          {m.membership_status}
                        </span>
                      </div>
                      <div className="data-card-grid">
                        <div className="data-item">
                          <span className="data-label">Phone</span>
                          <span className="data-value">{m.phone_number}</span>
                        </div>
                        {m.email && (
                          <div className="data-item">
                            <span className="data-label">Email</span>
                            <span className="data-value" style={{ wordBreak: 'break-all' }}>{m.email}</span>
                          </div>
                        )}
                        {m.age && (
                          <div className="data-item">
                            <span className="data-label">Age</span>
                            <span className="data-value">{m.age}</span>
                          </div>
                        )}
                        {m.gender && (
                          <div className="data-item">
                            <span className="data-label">Gender</span>
                            <span className="data-value">{m.gender}</span>
                          </div>
                        )}
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
