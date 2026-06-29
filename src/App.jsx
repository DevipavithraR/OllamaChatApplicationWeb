import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Calendar, 
  Film, 
  Building, 
  Users, 
  Send, 
  Plus, 
  RefreshCw, 
  Clock, 
  User, 
  Sparkles, 
  Search, 
  Ticket 
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
  const [shows, setShows] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState(null);

  // Filter/Search states
  const [activeTab, setActiveTab] = useState('bookings'); // bookings, movies, theatres, customers
  const [selectedMovieGenre, setSelectedMovieGenre] = useState('all');
  const [movieSearchText, setMovieSearchText] = useState('');

  const messagesEndRef = useRef(null);

  // Initialize first session
  useEffect(() => {
    const savedSessions = JSON.parse(localStorage.getItem('cinema_chat_sessions') || '[]');
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

  // Real-time polling for bookings, shows, theatres, customers
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
      const [resBookings, resShows, resTheatres, resCustomers] = await Promise.all([
        fetch(`${API_BASE}/bookings`),
        fetch(`${API_BASE}/shows`),
        fetch(`${API_BASE}/theatres`),
        fetch(`${API_BASE}/customers`)
      ]);

      if (resBookings.ok) {
        const data = await resBookings.json();
        setBookings(data.sort((a, b) => b.booking_id - a.booking_id));
      }
      if (resShows.ok) {
        setShows(await resShows.json());
      }
      if (resTheatres.ok) {
        setTheatres(await resTheatres.json());
      }
      if (resCustomers.ok) {
        const data = await resCustomers.json();
        setCustomers(data.sort((a, b) => b.customer_id - a.customer_id));
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
        message: "Hello! I am your Cinema AI Receptionist. 🎬\nHow can I help you today? I can tell you about movie show schedules, register you as a customer, book tickets, or modify/cancel your bookings!",
        created_at: new Date().toISOString()
      }
    ]);
    
    const updatedSessions = [newId, ...sessionList.filter(s => s !== newId)];
    setSessionList(updatedSessions);
    localStorage.setItem('cinema_chat_sessions', JSON.stringify(updatedSessions));
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
        message: "Hello! Welcome back. 🎬\nHow can I assist you with shows or ticket bookings today?",
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
        setMessages(prev => [...prev, {
          sender: 'assistant',
          message: data.response,
          created_at: new Date().toISOString()
        }]);

        fetchDatabaseData();
      } else {
        throw new Error('API Error');
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        sender: 'assistant',
        message: 'Oops! I encountered a network error. Please verify the backend service is running.',
        created_at: new Date().toISOString()
      }]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Cancel booking
  const handleCancelBooking = async (id) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await fetch(`${API_BASE}/bookings/${id}/cancel`, {
        method: 'POST'
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

  const suggestionChips = [
    "What movies are playing?",
    "Register me as a customer",
    "Book tickets for Interstellar",
    "View my bookings"
  ];

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

  // Filter shows by movie genre and search term
  const filteredShows = shows.filter(show => {
    const genre = show.movie?.genre || '';
    const title = show.movie?.title || '';
    const theatreName = show.theatre?.theatre_name || '';

    const matchesGenre = selectedMovieGenre === 'all' || genre.toLowerCase() === selectedMovieGenre.toLowerCase();
    const matchesSearch = title.toLowerCase().includes(movieSearchText.toLowerCase()) || 
                          theatreName.toLowerCase().includes(movieSearchText.toLowerCase());
    return matchesGenre && matchesSearch;
  });

  // Extract unique genres for filter tabs
  const genres = ['all', ...new Set(shows.map(s => s.movie?.genre).filter(Boolean))];

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={20} />
          </div>
          <span className="brand-name">Cinema AI Receptionist</span>
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
                <Ticket size={18} />
                <span>Bookings Log</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'movies' ? 'active' : ''}`}
                onClick={() => setActiveTab('movies')}
              >
                <Film size={18} />
                <span>Movies & Shows</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'theatres' ? 'active' : ''}`}
                onClick={() => setActiveTab('theatres')}
              >
                <Building size={18} />
                <span>Theatres Directory</span>
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

      {/* Main Workspace */}
      <main className="main-workspace">
        {/* Center: Chat Application */}
        <section className="chat-container">
          <header className="chat-header">
            <div className="chat-header-info">
              <h2>Cinema AI Receptionist</h2>
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
                placeholder="Ask about movies, list showtimes, or book tickets..."
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
                  <Ticket className="inspector-icon" size={18} />
                  <span>Bookings Log</span>
                </>
              )}
              {activeTab === 'movies' && (
                <>
                  <Film className="inspector-icon" size={18} />
                  <span>Movies & Shows Directory</span>
                </>
              )}
              {activeTab === 'theatres' && (
                <>
                  <Building className="inspector-icon" size={18} />
                  <span>Theatres Directory</span>
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

            {/* TAB CONTENT: BOOKINGS */}
            {activeTab === 'bookings' && (
              <div>
                {bookings.length === 0 ? (
                  <div className="empty-state">
                    <Ticket className="empty-icon" />
                    <p className="empty-text">No bookings found in database.</p>
                  </div>
                ) : (
                  bookings.map(b => (
                    <div key={b.booking_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">Booking #{b.booking_id}</span>
                        <span className={`badge ${b.booking_status.toLowerCase()}`}>
                          {b.booking_status}
                        </span>
                      </div>
                      <div className="data-card-grid">
                        <div className="data-item">
                          <span className="data-label">Customer ID</span>
                          <span className="data-value">{b.customer_id} ({b.customer?.name || 'Loading...'})</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Tickets Count</span>
                          <span className="data-value">{b.number_of_tickets} tickets</span>
                        </div>
                        <div className="data-item" style={{ gridColumn: 'span 2' }}>
                          <span className="data-label">Movie / Show</span>
                          <span className="data-value">
                            "{b.show?.movie?.title || 'Unknown Movie'}" at {b.show?.theatre?.theatre_name || 'Unknown Theatre'} (Screen {b.show?.screen_number})
                          </span>
                        </div>
                        <div className="data-item" style={{ gridColumn: 'span 2' }}>
                          <span className="data-label">Time</span>
                          <span className="data-value">{b.show?.show_datetime ? formatDateDisplay(b.show.show_datetime) : 'N/A'}</span>
                        </div>
                        <div className="data-item" style={{ gridColumn: 'span 2' }}>
                          <span className="data-label">Seats Booked</span>
                          <span className="data-value font-mono">{b.seat_numbers}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Total Amount</span>
                          <span className="data-value font-bold" style={{ color: 'var(--accent-secondary)' }}>
                            ${parseFloat(b.total_amount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      {b.booking_status.toLowerCase() === 'confirmed' && (
                        <div className="data-card-actions">
                          <button 
                            className="btn-action-small danger"
                            onClick={() => handleCancelBooking(b.booking_id)}
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

            {/* TAB CONTENT: MOVIES & SHOWS */}
            {activeTab === 'movies' && (
              <div>
                {/* Search Bar */}
                <div className="search-container">
                  <input 
                    type="text" 
                    className="form-input search-input" 
                    placeholder="Search by movie or theatre..." 
                    value={movieSearchText}
                    onChange={(e) => setMovieSearchText(e.target.value)}
                  />
                </div>

                {/* Genre Filters */}
                <div className="category-tabs">
                  {genres.map(g => (
                    <span 
                      key={g} 
                      className={`cat-tab ${selectedMovieGenre === g ? 'active' : ''}`}
                      onClick={() => setSelectedMovieGenre(g)}
                    >
                      {g}
                    </span>
                  ))}
                </div>

                {filteredShows.length === 0 ? (
                  <div className="empty-state">
                    <Film className="empty-icon" />
                    <p className="empty-text">No shows found matching selection.</p>
                  </div>
                ) : (
                  filteredShows.map(show => (
                    <div key={show.show_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">{show.movie?.title}</span>
                        <span className="data-value font-bold" style={{ color: 'var(--accent-secondary)' }}>
                          ${parseFloat(show.ticket_price).toFixed(2)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        Genre: {show.movie?.genre} • Duration: {show.movie?.duration} • Rating: {show.movie?.rating}
                      </div>
                      <div className="data-card-grid">
                        <div className="data-item" style={{ gridColumn: 'span 2' }}>
                          <span className="data-label">Theatre / Screen</span>
                          <span className="data-value">{show.theatre?.theatre_name} (Screen {show.screen_number})</span>
                        </div>
                        <div className="data-item" style={{ gridColumn: 'span 2' }}>
                          <span className="data-label">Showtime</span>
                          <span className="data-value">{formatDateDisplay(show.show_datetime)}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Available Seats</span>
                          <span className="data-value">{show.available_seats} / {show.total_seats}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Show ID</span>
                          <span className="data-value">#{show.show_id}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: THEATRES */}
            {activeTab === 'theatres' && (
              <div>
                {theatres.length === 0 ? (
                  <div className="empty-state">
                    <Building className="empty-icon" />
                    <p className="empty-text">No theatres registered.</p>
                  </div>
                ) : (
                  theatres.map(t => (
                    <div key={t.theatre_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">{t.theatre_name}</span>
                      </div>
                      <div className="data-card-grid" style={{ gridTemplateColumns: '1fr' }}>
                        <div className="data-item">
                          <span className="data-label">Location</span>
                          <span className="data-value">{t.location}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Total Screens</span>
                          <span className="data-value">{t.screens} Screens</span>
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
