'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { FaQuestion, FaTimes, FaPaperPlane, FaRobot, FaUser, FaMicrophone, FaStop } from 'react-icons/fa';

interface Message {
  id: number;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

interface ContactForm {
  name: string;
  email: string;
  company: string;
  message: string;
  priority: string;
}

const SmartContactWidget = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'contact' | 'success'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'ai',
      content: "Hi! I'm Biglio's AI assistant. I can help you with biglio creation, audio generation, AI writing tools, and platform features. Ask me about creating biglios, using the AI assistant, generating audio, or anything else about Biglio V2!",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [contactForm, setContactForm] = useState<ContactForm>({
    name: '',
    email: '',
    company: '',
    message: '',
    priority: 'normal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Smart responses for Biglio V2
  const getSmartResponse = (userMessage: string) => {
    const message = userMessage.toLowerCase();
    
    // Biglio Creation and Editing Questions
    if (message.includes('biglio') || message.includes('book') || message.includes('write') || message.includes('create')) {
      return "To create a new biglio, go to your Dashboard and click 'New Biglio'. Our unified 3-panel editor lets you work in Outline mode for structure and Write mode for detailed content. The AI assistant is always available on the right to help with writing!";
    }
    
    if (message.includes('chapter') || message.includes('add chapter') || message.includes('new chapter')) {
      return "To add chapters: 1) Go to your biglio project, 2) In the left panel, click 'Add Chapter', 3) Switch between Outline and Write modes using the toggle buttons at the top. The editor auto-saves your work!";
    }
    
    if (message.includes('outline') || message.includes('write mode') || message.includes('3-panel') || message.includes('editor')) {
      return "Our new 3-panel editor is awesome! Use Outline mode for chapter structure and summaries, Write mode for detailed content. The AI assistant on the right provides contextual help. Toggle between modes with the buttons at the top - no more separate pages!";
    }
    
    if (message.includes('ai assistant') || message.includes('ai help') || message.includes('writing help')) {
      return "The AI assistant is built right into the editor! It provides mode-aware help (research prompts in Outline, writing prompts in Write mode). Try the quick prompt buttons or ask questions naturally. Use Insert to add AI responses directly to your biglio!";
    }
    
    if (message.includes('audio') || message.includes('generate audio') || message.includes('voice') || message.includes('narration')) {
      return "Audio generation is super easy! Each chapter has a 🎵 button when it contains text. Choose between male/female voices, then click generate. Audio is stored in Supabase and plays instantly. Keep chapters under 7,500 characters for best quality!";
    }
    
    if (message.includes('character limit') || message.includes('7500') || message.includes('limit')) {
      return "We recommend keeping chapters under 7,500 characters for optimal audio quality and generation speed. The editor shows your character count and warns when approaching the limit. Longer content can be split into multiple chapters!";
    }
    
    if (message.includes('save') || message.includes('autosave') || message.includes('saving')) {
      return "Everything auto-saves! The editor uses debounced saving - your changes are automatically saved 1 second after you stop typing. No more worry about losing work. You'll see saving indicators when content is being saved.";
    }
    
    if (message.includes('dashboard') || message.includes('my biglios') || message.includes('manage')) {
      return "Your Dashboard shows all your biglios with creation feedback and management options. Access it via the side navigation (hamburger menu) or the back arrow from any biglio editor. Create new biglios or edit existing ones!";
    }
    
    if (message.includes('channel') || message.includes('profile') || message.includes('username')) {
      return "Channels are your public profile on Biglio! Each user can create multiple channels with unique @handles. Set up your channel during onboarding or via account settings. Your published biglios appear on your channel page.";
    }
    
    if (message.includes('publish') || message.includes('published') || message.includes('public')) {
      return "Publishing workflow: Create your biglio → Generate audio for all chapters → Review and publish. Published biglios appear on the main feed and your channel. You can publish with or without audio, but audio makes them much more engaging!";
    }
    
    // Technical and Navigation Questions
    if (message.includes('navigation') || message.includes('menu') || message.includes('how to navigate')) {
      return "Navigation is modern and clean! Use the top navbar for main actions, the hamburger menu (top-left) for the slide-out navigation panel. All pages account for the fixed navbar with proper spacing. Mobile-first design!";
    }
    
    if (message.includes('mobile') || message.includes('responsive') || message.includes('phone')) {
      return "Biglio V2 is fully mobile-responsive! The editor works great on phones and tablets. We use a PWA (Progressive Web App) approach for fast loading and app-like experience. You can even 'install' it on your phone!";
    }
    
    if (message.includes('pwa') || message.includes('install') || message.includes('app')) {
      return "Biglio V2 is a Progressive Web App! You can install it on your device for an app-like experience. Look for the 'Install' prompt in your browser or 'Add to Home Screen' on mobile. It works offline for basic features!";
    }
    
    // Account and Authentication
    if (message.includes('sign up') || message.includes('account') || message.includes('register')) {
      return "Creating an account is simple! Use the sign-in modal that appears when you try to access features. We support email/password authentication via Supabase. You'll need to verify your email address.";
    }
    
    if (message.includes('sign in') || message.includes('login') || message.includes('authenticate')) {
      return "Sign in using the auth modal - no more page redirects! The modal appears when needed and keeps you on the same page. We use Supabase Auth for secure, reliable authentication.";
    }
    
    // Technical Features
    if (message.includes('supabase') || message.includes('database') || message.includes('backend')) {
      return "Biglio V2 runs on Supabase for everything - database, auth, storage, and real-time features! Much faster and more reliable than the old AWS setup. All your biglios, chapters, and audio are securely stored.";
    }
    
    if (message.includes('vercel') || message.includes('deployment') || message.includes('fast')) {
      return "We deployed on Vercel for lightning-fast performance! Edge functions, global CDN, and instant deployments. Combined with Next.js 14, the platform loads incredibly quickly compared to the old system.";
    }
    
    if (message.includes('next.js') || message.includes('nextjs') || message.includes('react')) {
      return "Biglio V2 is built with Next.js 14, TypeScript, and Tailwind CSS! Much more modern and maintainable than the old system. Server-side rendering, optimized builds, and great developer experience.";
    }
    
    // Comparison with Old System
    if (message.includes('old system') || message.includes('v1') || message.includes('compared to') || message.includes('difference')) {
      return "Biglio V2 is a complete rebuild! Key improvements: unified 3-panel editor, better AI integration, faster audio generation (Google TTS + Supabase), no more AWS complexity, mobile-first PWA, real-time features, and much cleaner UI/UX.";
    }
    
    if (message.includes('aws') || message.includes('lambda') || message.includes('mediaconvert')) {
      return "We moved away from AWS! The old system used Lambda, MediaConvert, S3, and DynamoDB. V2 uses Supabase + Vercel for everything - simpler, faster, more reliable, and cost-effective. Audio generation is much quicker now!";
    }
    
    // Support and Help
    if (message.includes('support') || message.includes('help') || message.includes('problem') || message.includes('bug')) {
      return "I'm here to help! For technical issues, try refreshing the page or clearing browser cache first. For account issues, I can connect you with our team. What specific problem are you experiencing?";
    }
    
    if (message.includes('feedback') || message.includes('suggestion') || message.includes('feature request')) {
      return "We love feedback! Biglio V2 is actively being developed based on user input. I can connect you with our team to share suggestions, or you can use the contact form to send detailed feedback.";
    }
    
    // Default response
    return "That's a great question about Biglio V2! While I can help with basic platform information, our team would be best equipped to give you a detailed answer. Would you like me to connect you with someone who can help?";
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const aiResponse: Message = {
        id: messages.length + 2,
        type: 'ai',
        content: getSmartResponse(inputMessage),
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // For now, just simulate submission
      // TODO: Integrate with EmailJS or contact form service
      console.log('Contact form submitted:', {
        ...contactForm,
        conversation: messages.map(m => `${m.type.toUpperCase()}: ${m.content}`).join('\n\n'),
        timestamp: new Date().toLocaleString(),
        page: pathname
      });
      
      setCurrentView('success');
      setTimeout(() => {
        setIsOpen(false);
        setCurrentView('chat');
        setContactForm({ name: '', email: '', company: '', message: '', priority: 'normal' });
      }, 3000);

    } catch (error) {
      console.error('Error submitting contact form:', error);
      alert('Failed to submit contact form. Please try again or email us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const voiceMessage: Message = {
          id: messages.length + 1,
          type: 'user',
          content: '🎵 Voice message recorded',
          audioUrl: audioUrl,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, voiceMessage]);
        
        // AI response for voice message
        setTimeout(() => {
          const aiResponse: Message = {
            id: messages.length + 2,
            type: 'ai',
            content: "Thanks for the voice message! I can see you sent audio, but I'll need our team to listen to it properly. Let me connect you with someone who can help with your request.",
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiResponse]);
        }, 1000);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Unable to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    }
  };

  const handleConnectToTeam = () => {
    setCurrentView('contact');
    setContactForm(prev => ({
      ...prev,
      message: `Hi! I was chatting with your AI assistant and would like to speak with your team about: ${messages[messages.length - 1]?.content || 'general inquiry'}`
    }));
  };

  // Hide on main feed page
  if (pathname === '/') {
    return null;
  }

  if (!isOpen) {
    return (
      <div className="smart-contact-trigger" onClick={() => setIsOpen(true)}>
        <FaQuestion />
        <span className="pulse-ring"></span>
      </div>
    );
  }

  return (
    <div className="smart-contact-widget">
      <div className="widget-header">
        <div className="header-info">
          <FaRobot className="header-icon" />
          <div>
            <h3>Biglio Assistant</h3>
            <span className="status-online">Online</span>
          </div>
        </div>
        <button className="close-btn" onClick={() => setIsOpen(false)}>
          <FaTimes />
        </button>
      </div>

      <div className="widget-content">
        {currentView === 'chat' && (
          <>
            <div className="messages-container">
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.type}`}>
                  <div className="message-avatar">
                    {message.type === 'ai' ? <FaRobot /> : <FaUser />}
                  </div>
                  <div className="message-content">
                    <p>{message.content}</p>
                    {message.audioUrl && (
                      <audio controls className="voice-message">
                        <source src={message.audioUrl} type="audio/wav" />
                      </audio>
                    )}
                    <span className="message-time">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="message ai">
                  <div className="message-avatar">
                    <FaRobot />
                  </div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div className="quick-actions">
              <button onClick={handleConnectToTeam} className="quick-action-btn">
                Connect with Team
              </button>
            </div>

            <div className="input-container">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything about Biglio..."
                className="message-input"
              />
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`voice-btn ${isRecording ? 'recording' : ''}`}
              >
                {isRecording ? <FaStop /> : <FaMicrophone />}
              </button>
              <button onClick={handleSendMessage} className="send-btn">
                <FaPaperPlane />
              </button>
            </div>
          </>
        )}

        {currentView === 'contact' && (
          <div className="contact-form-container">
            <h3>Connect with Our Team</h3>
            <p>Let us know how we can help you!</p>
            
            <form onSubmit={handleContactSubmit} className="contact-form">
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              
              <input
                type="text"
                placeholder="Company (optional)"
                value={contactForm.company}
                onChange={(e) => setContactForm(prev => ({ ...prev, company: e.target.value }))}
              />
              
              <textarea
                placeholder="How can we help you?"
                value={contactForm.message}
                onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
                required
              />
              
              <select
                value={contactForm.priority}
                onChange={(e) => setContactForm(prev => ({ ...prev, priority: e.target.value }))}
                className="priority-select"
              >
                <option value="normal">General Inquiry</option>
                <option value="sales">Sales Question</option>
                <option value="support">Technical Support</option>
                <option value="urgent">Urgent</option>
              </select>
              
              <button type="submit" disabled={isSubmitting} className="submit-btn">
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
            
            <button onClick={() => setCurrentView('chat')} className="back-btn">
              ← Back to Chat
            </button>
          </div>
        )}

        {currentView === 'success' && (
          <div className="success-container">
            <div className="success-icon">✅</div>
            <h3>Message Sent!</h3>
            <p>Thanks for reaching out! Our team will get back to you within 24 hours.</p>
            <p className="success-note">
              In the meantime, feel free to explore Biglio V2 and create your first biglio!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartContactWidget;