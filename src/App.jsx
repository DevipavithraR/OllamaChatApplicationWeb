import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Calendar, 
  Users, 
  Send, 
  Plus, 
  RefreshCw, 
  Clock, 
  User, 
  Sparkles, 
  Search, 
  BookOpen,
  Car,
  Wrench
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
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState(null);

  // Filter/Search states
  const [activeTab, setActiveTab] = useState('bookings'); // bookings, vehicles, mechanics, services, customers
  const [serviceSearchText, setServiceSearchText] = useState('');

  const messagesEndRef = useRef(null);

  // Initialize first session
  useEffect(() => {
    const savedSessions = JSON.parse(localStorage.getItem('vehicle_chat_sessions') || '[]');
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

  // Real-time polling for bookings, services, mechanics, vehicles, customers
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
      setIsLoadingData(true);
      const [resBookings, resServices, resMechanics, resVehicles, resCustomers] = await Promise.all([
        fetch(`${API_BASE}/service_bookings/`),
        fetch(`${API_BASE}/services/`),
        fetch(`${API_BASE}/mechanics/`),
        fetch(`${API_BASE}/vehicles/`),
        fetch(`${API_BASE}/customers/`)
      ]);

      if (resBookings.ok) {
        const data = await resBookings.json();
        setBookings(data.sort((a, b) => b.booking_id - a.booking_id));
      }
      if (resServices.ok) {
        setServices(await resServices.json());
      }
      if (resMechanics.ok) {
        setMechanics(await resMechanics.json());
      }
      if (resVehicles.ok) {
        setVehicles(await resVehicles.json());
      }
      if (resCustomers.ok) {
        const data = await resCustomers.json();
        setCustomers(data.sort((a, b) => b.customer_id - a.customer_id));
      }
      setDataError(null);
    } catch (err) {
      console.error('Error polling backend APIs:', err);
      setDataError('Backend connection offline. Make sure the FastAPI app is running on port 8000.');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Create a brand new chat session
  const createNewSession = () => {
    const newId = `session_${Math.floor(100000 + Math.random() * 900000)}`;
    setSessionId(newId);
    setMessages([
      {
        sender: 'assistant',
        message: "Hello! I am your AI Vehicle Service Center Assistant. 🚗\nHow can I help you today? I can explain our maintenance packages, register you and your vehicle, check available mechanics, or book a service appointment!",
        created_at: new Date().toISOString()
      }
    ]);
    
    const updatedSessions = [newId, ...sessionList.filter(s => s !== newId)];
    setSessionList(updatedSessions);
    localStorage.setItem('vehicle_chat_sessions', JSON.stringify(updatedSessions));
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
        message: "Hello! Welcome back. 🚗\nHow can I assist you with vehicle service bookings or mechanic inquiries today?",
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

        // Trigger immediate pull of data to reflect updates
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

  // Cancel booking
  const handleCancelBooking = async (id) => {
    if (!confirm('Are you sure you want to cancel this service booking?')) return;
    try {
      const res = await fetch(`${API_BASE}/service_bookings/${id}`, {
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
    "What services are available?",
    "Book a General Service for TN69AB1234",
    "Show available mechanics",
    "Track status of booking 1"
  ];

  // Helper to format time
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

  // Filter services by search term
  const filteredServices = services.filter(item => {
    return item.service_name.toLowerCase().includes(serviceSearchText.toLowerCase()) || 
           (item.description && item.description.toLowerCase().includes(serviceSearchText.toLowerCase()));
  });

  return (
    <div className="app-container">
      {/* 1. Left Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Wrench size={20} />
          </div>
          <span className="brand-name">AutoCare AI Assistant</span>
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
                <span>Service Bookings</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'vehicles' ? 'active' : ''}`}
                onClick={() => setActiveTab('vehicles')}
              >
                <Car size={18} />
                <span>Vehicles</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'mechanics' ? 'active' : ''}`}
                onClick={() => setActiveTab('mechanics')}
              >
                <Wrench size={18} />
                <span>Mechanics</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'services' ? 'active' : ''}`}
                onClick={() => setActiveTab('services')}
              >
                <BookOpen size={18} />
                <span>Service Catalog</span>
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
              <h2>Vehicle Service Advisor</h2>
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
                  {msg.sender === 'user' ? 'U' : 'A'}
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
                <div className="avatar">A</div>
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
                placeholder="Ask about services, book repair, track status or register your car..."
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
                  <span>Service Bookings</span>
                </>
              )}
              {activeTab === 'vehicles' && (
                <>
                  <Car className="inspector-icon" size={18} />
                  <span>Vehicles List</span>
                </>
              )}
              {activeTab === 'mechanics' && (
                <>
                  <Wrench className="inspector-icon" size={18} />
                  <span>Mechanic Directory</span>
                </>
              )}
              {activeTab === 'services' && (
                <>
                  <BookOpen className="inspector-icon" size={18} />
                  <span>Service Catalog</span>
                </>
              )}
              {activeTab === 'customers' && (
                <>
                  <Users className="inspector-icon" size={18} />
                  <span>Customer Index</span>
                </>
              )}
            </div>
            <button className="btn-refresh" onClick={fetchDatabaseData} title="Refresh lists" disabled={isLoadingData}>
              <RefreshCw size={16} className={isLoadingData ? "spin" : ""} />
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

            {/* TAB CONTENT: SERVICE BOOKINGS */}
            {activeTab === 'bookings' && (
              <div>
                {bookings.length === 0 ? (
                  <div className="empty-state">
                    <Calendar className="empty-icon" />
                    <p className="empty-text">No service bookings found in database.</p>
                  </div>
                ) : (
                  bookings.map(res => (
                    <div key={res.booking_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">Booking ID #{res.booking_id}</span>
                        <span className={`badge ${res.booking_status.toLowerCase()}`}>
                          {res.booking_status}
                        </span>
                      </div>
                      <div className="data-card-grid">
                        <div className="data-item">
                          <span className="data-label">Customer ID</span>
                          <span className="data-value">{res.customer_id}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Vehicle ID</span>
                          <span className="data-value">{res.vehicle_id}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Service ID</span>
                          <span className="data-value">{res.service_id}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Mechanic ID</span>
                          <span className="data-value">{res.mechanic_id || 'Not Assigned'}</span>
                        </div>
                        <div className="data-item" style={{ gridColumn: 'span 2' }}>
                          <span className="data-label">Service Date & Time</span>
                          <span className="data-value">{formatDateDisplay(res.service_date)}</span>
                        </div>
                        {res.estimated_completion && (
                          <div className="data-item" style={{ gridColumn: 'span 2' }}>
                            <span className="data-label">Est. Completion</span>
                            <span className="data-value">{formatDateDisplay(res.estimated_completion)}</span>
                          </div>
                        )}
                        {res.customer_notes && (
                          <div className="data-item" style={{ gridColumn: 'span 2' }}>
                            <span className="data-label">Customer Notes</span>
                            <span className="data-value" style={{ fontStyle: 'italic' }}>
                              "{res.customer_notes}"
                            </span>
                          </div>
                        )}
                      </div>
                      {res.booking_status.toLowerCase() !== 'cancelled' && (
                        <div className="data-card-actions">
                          <button 
                            className="btn-action-small danger"
                            onClick={() => handleCancelBooking(res.booking_id)}
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

            {/* TAB CONTENT: VEHICLES */}
            {activeTab === 'vehicles' && (
              <div>
                {vehicles.length === 0 ? (
                  <div className="empty-state">
                    <Car className="empty-icon" />
                    <p className="empty-text">No vehicles registered in database.</p>
                  </div>
                ) : (
                  vehicles.map(v => (
                    <div key={v.vehicle_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">{v.vehicle_brand} {v.vehicle_model}</span>
                        <span className="badge available">
                          {v.vehicle_number}
                        </span>
                      </div>
                      <div className="data-card-grid">
                        <div className="data-item">
                          <span className="data-label">Vehicle ID</span>
                          <span className="data-value">{v.vehicle_id}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Customer ID</span>
                          <span className="data-value">{v.customer_id}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Fuel Type</span>
                          <span className="data-value">{v.fuel_type}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Mfg. Year</span>
                          <span className="data-value">{v.manufacturing_year}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: MECHANICS */}
            {activeTab === 'mechanics' && (
              <div>
                {mechanics.length === 0 ? (
                  <div className="empty-state">
                    <Wrench className="empty-icon" />
                    <p className="empty-text">No mechanics recorded in database.</p>
                  </div>
                ) : (
                  mechanics.map(m => (
                    <div key={m.mechanic_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">{m.name}</span>
                        <span className={`badge ${m.available_status.toLowerCase() === 'available' ? 'available' : 'cancelled'}`}>
                          {m.available_status}
                        </span>
                      </div>
                      <div className="data-card-grid">
                        <div className="data-item">
                          <span className="data-label">Mechanic ID</span>
                          <span className="data-value">{m.mechanic_id}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Experience</span>
                          <span className="data-value">{m.experience} Years</span>
                        </div>
                        <div className="data-item" style={{ gridColumn: 'span 2' }}>
                          <span className="data-label">Specialization</span>
                          <span className="data-value">{m.specialization}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: SERVICE CATALOG */}
            {activeTab === 'services' && (
              <div>
                <div className="search-container">
                  <input 
                    type="text" 
                    className="form-input search-input" 
                    placeholder="Search service packages..." 
                    value={serviceSearchText}
                    onChange={(e) => setServiceSearchText(e.target.value)}
                  />
                </div>

                {filteredServices.length === 0 ? (
                  <div className="empty-state">
                    <BookOpen className="empty-icon" />
                    <p className="empty-text">No services match your selection.</p>
                  </div>
                ) : (
                  filteredServices.map(item => (
                    <div key={item.service_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">{item.service_name}</span>
                        <span className="data-value" style={{ color: 'var(--accent-secondary)', fontWeight: 'bold' }}>
                          ₹{parseInt(item.service_cost).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        {item.description}
                      </div>
                      <div className="data-card-grid">
                        <div className="data-item">
                          <span className="data-label">Service ID</span>
                          <span className="data-value">{item.service_id}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Est. Duration</span>
                          <span className="data-value">{item.estimated_duration}</span>
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
                    <div key={c.customer_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} style={{ color: 'var(--accent-primary)' }} />
                          {c.name} (ID: {c.customer_id})
                        </span>
                      </div>
                      <div className="data-card-grid" style={{ gridTemplateColumns: '1fr' }}>
                        <div className="data-item">
                          <span className="data-label">Phone</span>
                          <span className="data-value">{c.phone_number}</span>
                        </div>
                        {c.email && (
                          <div className="data-item">
                            <span className="data-label">Email</span>
                            <span className="data-value">{c.email}</span>
                          </div>
                        )}
                        {c.address && (
                          <div className="data-item">
                            <span className="data-label">Address</span>
                            <span className="data-value">{c.address}</span>
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
