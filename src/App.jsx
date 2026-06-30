import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Calendar, 
  Utensils, 
  Users, 
  Send, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Clock, 
  User, 
  Sparkles, 
  Search, 
  BookOpen 
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
  const [reservations, setReservations] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState(null);

  // Filter/Search states
  const [activeTab, setActiveTab] = useState('reservations'); // reservations, menu, customers
  const [selectedMenuCategory, setSelectedMenuCategory] = useState('all');
  const [menuSearchText, setMenuSearchText] = useState('');

  const messagesEndRef = useRef(null);

  // Initialize first session
  useEffect(() => {
    // Load existing sessions from localStorage or create new
    const savedSessions = JSON.parse(localStorage.getItem('restaurant_chat_sessions') || '[]');
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

  // Real-time polling for reservations, menu, customers
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
      const [resReservations, resMenu, resCustomers] = await Promise.all([
        fetch(`${API_BASE}/reservations/`),
        fetch(`${API_BASE}/menu/`),
        fetch(`${API_BASE}/customers/`)
      ]);

      if (resReservations.ok) {
        const data = await resReservations.json();
        // Sort reservations by created_at or reservation_time descending
        setReservations(data.sort((a, b) => b.id - a.id));
      }
      if (resMenu.ok) {
        setMenuItems(await resMenu.json());
      }
      if (resCustomers.ok) {
        const data = await resCustomers.json();
        setCustomers(data.sort((a, b) => b.id - a.id));
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
        content: "Namaste! I am your Spice Symphony AI Receptionist. 🍛\nHow can I help you today? I can tell you about our premium Indian menu, register you as a customer, or book a table reservation!",
        created_at: new Date().toISOString()
      }
    ]);
    
    // Save to list
    const updatedSessions = [newId, ...sessionList.filter(s => s !== newId)];
    setSessionList(updatedSessions);
    localStorage.setItem('restaurant_chat_sessions', JSON.stringify(updatedSessions));
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
        content: "Namaste! Welcome back to Spice Symphony. 🍛\nHow can I assist you with reservations or the menu today?",
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
        // Append bot reply
        setMessages(prev => [...prev, {
          sender: 'assistant',
          content: data.response,
          created_at: new Date().toISOString()
        }]);

        // Trigger immediate pull of reservations/customers to reflect updates
        fetchDatabaseData();
      } else {
        throw new Error('API Error');
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        sender: 'assistant',
        content: 'Scusate! I encountered a network error. Please verify the backend service is running.',
        created_at: new Date().toISOString()
      }]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Cancel reservation
  const handleCancelReservation = async (id) => {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    try {
      const res = await fetch(`${API_BASE}/reservations/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchDatabaseData();
      } else {
        alert('Failed to cancel reservation.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend.');
    }
  };

  // Quick Reply Suggestion Chips
  const suggestionChips = [
    "What's on the menu?",
    "Book a table for 4",
    "List my reservations",
    "Show drinks and desserts"
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

  // Filter menu items by category and search term
  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = selectedMenuCategory === 'all' || item.category.toLowerCase() === selectedMenuCategory.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(menuSearchText.toLowerCase()) || 
                          item.description.toLowerCase().includes(menuSearchText.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="app-container">
      {/* 1. Left Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={20} />
          </div>
          <span className="brand-name">Restaurant AI Receptionist</span>
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
                className={`nav-item ${activeTab === 'reservations' ? 'active' : ''}`}
                onClick={() => setActiveTab('reservations')}
              >
                <Calendar size={18} />
                <span>Reservations</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'menu' ? 'active' : ''}`}
                onClick={() => setActiveTab('menu')}
              >
                <Utensils size={18} />
                <span>Menu Explorer</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`}
                onClick={() => setActiveTab('customers')}
              >
                <Users size={18} />
                <span>Customers</span>
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
              <h2>Restaurant AI Receptionist</h2>
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
                placeholder="Ask about the menu, check bookings, or make a reservation..."
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
              {activeTab === 'reservations' && (
                <>
                  <Calendar className="inspector-icon" size={18} />
                  <span>Reservations Log</span>
                </>
              )}
              {activeTab === 'menu' && (
                <>
                  <Utensils className="inspector-icon" size={18} />
                  <span>Menu Catalog</span>
                </>
              )}
              {activeTab === 'customers' && (
                <>
                  <Users className="inspector-icon" size={18} />
                  <span>Registered Customers</span>
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

            {/* TAB CONTENT: RESERVATIONS */}
            {activeTab === 'reservations' && (
              <div>
                {reservations.length === 0 ? (
                  <div className="empty-state">
                    <Calendar className="empty-icon" />
                    <p className="empty-text">No reservations found in database.</p>
                  </div>
                ) : (
                  reservations.map(res => (
                    <div key={res.id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">Booking #{res.id}</span>
                        <span className={`badge ${res.status.toLowerCase()}`}>
                          {res.status}
                        </span>
                      </div>
                      <div className="data-card-grid">
                        <div className="data-item">
                          <span className="data-label">Customer ID</span>
                          <span className="data-value">{res.customer_id}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Party Size</span>
                          <span className="data-value">{res.party_size} People</span>
                        </div>
                        <div className="data-item" style={{ gridColumn: 'span 2' }}>
                          <span className="data-label">Time</span>
                          <span className="data-value">{formatDateDisplay(res.reservation_time)}</span>
                        </div>
                        {res.special_requests && (
                          <div className="data-item" style={{ gridColumn: 'span 2' }}>
                            <span className="data-label">Special Requests</span>
                            <span className="data-value" style={{ fontStyle: 'italic' }}>
                              "{res.special_requests}"
                            </span>
                          </div>
                        )}
                      </div>
                      {res.status.toLowerCase() !== 'cancelled' && (
                        <div className="data-card-actions">
                          <button 
                            className="btn-action-small danger"
                            onClick={() => handleCancelReservation(res.id)}
                          >
                            Cancel Table
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: MENU EXPLORER */}
            {activeTab === 'menu' && (
              <div>
                {/* Search Bar */}
                <div className="search-container">
                  <input 
                    type="text" 
                    className="form-input search-input" 
                    placeholder="Search menu dishes..." 
                    value={menuSearchText}
                    onChange={(e) => setMenuSearchText(e.target.value)}
                  />
                </div>

                {/* Category Filters */}
                <div className="category-tabs">
                  {['all', 'Appetizers', 'Entrees', 'Desserts', 'Drinks'].map(cat => (
                    <span 
                      key={cat} 
                      className={`cat-tab ${selectedMenuCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedMenuCategory(cat)}
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                {filteredMenuItems.length === 0 ? (
                  <div className="empty-state">
                    <BookOpen className="empty-icon" />
                    <p className="empty-text">No menu items match your selection.</p>
                  </div>
                ) : (
                  filteredMenuItems.map(item => (
                    <div key={item.id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">{item.name}</span>
                        <span className="data-value" style={{ color: 'var(--accent-secondary)', fontWeight: 'bold' }}>
                          ${(Number(item.price) || 0).toFixed(2)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        {item.description}
                      </div>
                      <div className="data-card-grid">
                        <div className="data-item">
                          <span className="data-label">Category</span>
                          <span className="data-value">{item.category}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Status</span>
                          <span className={`badge ${item.is_available ? 'available' : 'cancelled'}`} style={{ alignSelf: 'flex-start' }}>
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: CUSTOMERS */}
            {activeTab === 'customers' && (
              <div>
                {customers.length === 0 ? (
                  <div className="empty-state">
                    <Users className="empty-icon" />
                    <p className="empty-text">No registered customers yet.</p>
                  </div>
                ) : (
                  customers.map(c => (
                    <div key={c.id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} style={{ color: 'var(--accent-primary)' }} />
                          {c.name} (ID: {c.id})
                        </span>
                      </div>
                      <div className="data-card-grid" style={{ gridTemplateColumns: '1fr' }}>
                        <div className="data-item">
                          <span className="data-label">Phone</span>
                          <span className="data-value">{c.phone}</span>
                        </div>
                        {c.email && (
                          <div className="data-item">
                            <span className="data-label">Email</span>
                            <span className="data-value">{c.email}</span>
                          </div>
                        )}
                        <div className="data-item">
                          <span className="data-label">Registered Date</span>
                          <span className="data-value">{new Date(c.created_at).toLocaleDateString()}</span>
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
