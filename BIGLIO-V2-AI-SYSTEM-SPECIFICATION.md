# 🤖 Biglio V2 AI System - Complete Specification

**Date:** January 2, 2025  
**Source:** Full analysis of `/Users/patrickhadley/Desktop/1biglio-repo/src/biglio-book/`  
**Status:** ✅ Complete Specification - Ready for Implementation  

**This document contains the EXACT specifications of all AI features from the old Biglio system that need to be rebuilt in V2.**

---

## 📋 **SYSTEM OVERVIEW**

The old Biglio book system had a sophisticated AI writing assistant with **7 major feature categories** and **20+ specific tools**. This specification documents every detail needed to rebuild it completely.

### 🎯 **Core Principle: Audio-First Writing**
Every AI feature was designed specifically for audiobook creation with TTS optimization as the primary concern.

---

## 🔧 **1. AI CONTEXT SYSTEM**

### **AIContext Interface** 
```typescript
interface AIContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string, bookId: string, chapterId?: string, fullContext?: string) => Promise<ChatMessage | null>;
  clearConversation: () => void;
  clearMessages: (bookId: string, chapterId?: string) => void;
  generatePrompt: (type: AIPromptType, bookId: string, chapterId?: string) => string;
  generateOutline: (bookId: string, title: string, genre: string, description: string, prompt: string, targetAudience?: string, chapterCount?: number, type?: string) => Promise<Chapter[] | null>;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}
```

### **Message Storage**
- **DynamoDB Table**: `Biglio-ConversationHistory`
- **Partition Key**: `userId`
- **Sort Key**: `conversationId`
- **Message Format**: `{ role: 'user' | 'assistant', content: string }`
- **Context Tracking**: `bookId`, `chapterId` per conversation
- **Persistence**: Conversations saved and retrievable

### **Context Optimization**
- **Token Limit**: ~12,000 tokens (~48,000 characters)
- **Smart Truncation**: Keep metadata + current chapter + truncated previous chapters
- **Context Preview**: First 150 words of each chapter when truncating
- **Automatic Optimization**: Triggered when context exceeds limits

---

## 🎯 **2. AI PROMPT TYPES**

### **Enum Definition**
```typescript
export enum AIPromptType {
  CHAPTER_IDEA = 'chapter_idea',
  PLOT_DEVELOPMENT = 'plot_development', 
  CHARACTER_DEVELOPMENT = 'character_development',
  STYLE_IMPROVEMENT = 'style_improvement',
  GENERAL = 'general'
}
```

### **Prompt Templates**
```typescript
const generatePrompt = (type: AIPromptType, bookId: string, chapterId?: string): string => {
  switch (type) {
    case AIPromptType.CHAPTER_IDEA:
      return `Generate three creative ideas for a new chapter in my book. Focus on advancing the plot in an interesting way.`;
      
    case AIPromptType.PLOT_DEVELOPMENT:
      return `Help me develop the plot further from the current point. What interesting complications or twists could I introduce?`;
      
    case AIPromptType.CHARACTER_DEVELOPMENT:
      return `Suggest ways to develop the character's arc in this chapter. How can I show growth or change?`;
      
    case AIPromptType.STYLE_IMPROVEMENT:
      return `Please analyze my writing style in this chapter and suggest improvements for clarity, engagement, and flow.`;
      
    case AIPromptType.GENERAL:
    default:
      return `I'm working on my book${chapterId ? ' and specifically this chapter' : ''}. Can you help me with some creative ideas?`;
  }
};
```

---

## 🔄 **3. PROGRESSIVE WRITING TOOLS**

### **Word Count Analysis**
```typescript
const analyzeChapterProgress = () => {
  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  return {
    wordCount,
    isEmpty: wordCount === 0,
    needsStart: wordCount < 100,
    canContinue: wordCount >= 100 && wordCount < 2000,
    canWrapUp: wordCount >= 1000
  };
};
```

### **Start Chapter Function**
```typescript
const handleStartChapter = async () => {
  const bookType = getBookType(currentBook.genre); // 'Fiction' | 'Non-Fiction'
  const context = buildAIContext(); // Full book context
  
  let aiInstruction = '';
  
  if (bookType === 'Non-Fiction') {
    aiInstruction += `Please write the opening section for the chapter titled "${currentChapter.title}". `;
    aiInstruction += `IMPORTANT: Keep your response to a maximum of 3500 characters (approximately 500-600 words). `;
    aiInstruction += `This should be informational and practical. Start with an engaging hook that introduces the main topic of this chapter. `;
    if (currentChapter.description) {
      aiInstruction += `Chapter description: ${currentChapter.description}\n\n`;
    }
    aiInstruction += `Focus on setting up the key concepts or problems this chapter will address. Write in a clear, engaging style appropriate for ${currentBook.targetAudience || 'general readers'}.`;
  } else {
    aiInstruction += `Please write the opening scene for the chapter titled "${currentChapter.title}". `;
    aiInstruction += `IMPORTANT: Keep your response to a maximum of 3500 characters (approximately 500-600 words). `;
    if (currentChapter.description) {
      aiInstruction += `Chapter description: ${currentChapter.description}\n\n`;
    }
    aiInstruction += `Create an engaging opening that draws the reader in. Establish the setting, introduce key characters if needed, and set up the main conflict or situation for this chapter.`;
  }
  
  aiInstruction += `\n\nIMPORTANT: This content will be used for an audio book. NEVER use hashtags, markdown headings, or any markdown formatting. All headings and section titles must be plain text only. Do not use #, ##, ###, *, _, or any other markdown symbols. Respond in plain, unformatted text only.`;
  
  const fullPrompt = `${context}\n\n${aiInstruction}`;
  await sendMessage('Begin writing this chapter', bookId, chapterId, fullPrompt);
};
```

### **Continue Chapter Function**
```typescript
const handleContinueChapter = async () => {
  const lastParagraph = currentChapter.content.trim().split('\n').slice(-2).join('\n');
  let aiInstruction = `Current chapter "${currentChapter.title}" so far:\n${lastParagraph}\n\n`;
  
  if (bookType === 'Non-Fiction') {
    aiInstruction += `Please continue this chapter with the next section. `;
    aiInstruction += `IMPORTANT: Keep your response to a maximum of 3500 characters (approximately 500-600 words). `;
    aiInstruction += `Build on what's already written and develop the key concepts further. `;
    aiInstruction += `Add practical examples, frameworks, or actionable insights that support the chapter's main theme.`;
  } else {
    aiInstruction += `Please continue this chapter with the next scene or development. `;
    aiInstruction += `IMPORTANT: Keep your response to a maximum of 3500 characters (approximately 500-600 words). `;
    aiInstruction += `Build on what's already happened and advance the plot or develop the characters further. `;
    aiInstruction += `Maintain narrative flow and increase tension or deepen the story.`;
  }
  
  aiInstruction += `\n\nIMPORTANT: This content will be used for an audio book. NEVER use hashtags, markdown headings, or any markdown formatting. All headings and section titles must be plain text only. Do not use #, ##, ###, *, _, or any other markdown symbols. Respond in plain, unformatted text only.`;
  
  const fullPrompt = `${context}\n\n${aiInstruction}`;
  await sendMessage('Continue writing this chapter', bookId, chapterId, fullPrompt);
};
```

### **Wrap Up Chapter Function**
```typescript
const handleWrapUpChapter = async () => {
  const lastSection = currentChapter.content.trim().split('\n').slice(-3).join('\n');
  let aiInstruction = `Current chapter "${currentChapter.title}" ending:\n${lastSection}\n\n`;
  
  if (bookType === 'Non-Fiction') {
    aiInstruction += `Please write a strong conclusion for this chapter. `;
    aiInstruction += `IMPORTANT: Keep your response to a maximum of 3500 characters (approximately 400-500 words). `;
    aiInstruction += `Summarize the key points, provide actionable takeaways, `;
    aiInstruction += `and transition smoothly to what readers can expect in upcoming chapters.`;
  } else {
    aiInstruction += `Please write a compelling conclusion for this chapter. `;
    aiInstruction += `IMPORTANT: Keep your response to a maximum of 3500 characters (approximately 400-500 words). `;
    aiInstruction += `Resolve the immediate conflict or situation, `;
    aiInstruction += `but leave readers wanting to continue to the next chapter. Create a natural stopping point with appropriate closure.`;
  }
  
  aiInstruction += `\n\nIMPORTANT: This content will be used for an audio book. NEVER use hashtags, markdown headings, or any markdown formatting. All headings and section titles must be plain text only. Do not use #, ##, ###, *, _, or any other markdown symbols. Respond in plain, unformatted text only.`;
  
  const fullPrompt = `${context}\n\n${aiInstruction}`;
  await sendMessage('Write a conclusion for this chapter', bookId, chapterId, fullPrompt);
};
```

---

## 📚 **4. OUTLINE GENERATION SYSTEM**

### **Fiction Outline Prompts**
```typescript
// Single Chapter Generation
const fictionSingleChapter = `
You are an expert story architect.
Given the following book concept, generate EXACTLY ONE chapter outline for a ${genre} novel titled "${title}".
Provide:
- A concise, descriptive chapter title
- A summary of the chapter (3-5 sentences), detailed enough that an AI could write the full chapter from it

Book concept/summary: ${prompt}

Format your response EXACTLY as:
Chapter 1: [Title]
Summary: [3-5 sentence summary describing what happens in this chapter]

Do NOT use any other formatting. Make sure to include a complete summary.
`;

// Multiple Chapter Generation
const fictionMultipleChapters = `
You are an expert story architect.
Given the following book concept, generate a chapter-by-chapter outline for a ${genre} novel titled "${title}".
For each chapter, provide:
- A concise, descriptive chapter title
- A summary of the chapter (3-5 sentences), detailed enough that an AI could write the full chapter from it

Book concept/summary: ${prompt}

Format your response EXACTLY as:
Chapter 1: [Title]
Summary: [3-5 sentence summary describing what happens in this chapter]

Chapter 2: [Title]
Summary: [3-5 sentence summary describing what happens in this chapter]

(continue this pattern for all chapters...)

Do NOT use bullet points, numbered lists, or any other format. Make sure every chapter has a complete summary.
`;
```

### **Non-Fiction Outline Prompts**
```typescript
// Single Chapter Generation
const nonFictionSingleChapter = `
You are an expert non-fiction book editor.
Given the following book concept, generate EXACTLY ONE chapter outline for a non-fiction book titled "${title}" in the genre "${genre}".
Provide:
- A clear, descriptive chapter title
- A summary of the chapter (3-5 sentences) that teaches, explains, or guides the reader on a specific topic

Book concept/summary: ${prompt}

Format your response EXACTLY as:
Chapter 1: [Title]
Summary: [3-5 sentence summary explaining what this chapter teaches or covers]

Do NOT use any other formatting. Make sure to include a complete summary.
`;

// Multiple Chapter Generation
const nonFictionMultipleChapters = `
You are an expert non-fiction book editor.
Given the following book concept, generate a chapter-by-chapter outline for a non-fiction book titled "${title}" in the genre "${genre}".
For each chapter, provide:
- A clear, descriptive chapter title
- A summary of the chapter (3-5 sentences) that teaches, explains, or guides the reader on a specific topic

Book concept/summary: ${prompt}

Format your response EXACTLY as:
Chapter 1: [Title]
Summary: [3-5 sentence summary explaining what this chapter teaches or covers]

Chapter 2: [Title]
Summary: [3-5 sentence summary explaining what this chapter teaches or covers]

(continue this pattern for all chapters...)

Do NOT use bullet points, numbered lists, or any other format. Make sure every chapter has a complete summary.
`;
```

---

## ✨ **5. IMPROVEMENT PROMPTS**

### **Outline Improvement Tools**
```typescript
const improvePrompts = [
  {
    title: "Improve existing outline",
    action: `Analyze my current outline and suggest improvements for better pacing and structure in my ${genre} titled "${title}".`
  },
  {
    title: "Suggest missing chapters", 
    action: `Based on my current outline, suggest additional chapters or scenes that might be missing to create a more complete story for my ${genre}.`
  },
  {
    title: "Deepen character arcs",
    action: `Suggest how to enhance character development across my chapters to create more compelling character arcs throughout the story.`
  }
];
```

### **Continuity Analysis**
```typescript
const analyzeContinuity = async () => {
  let aiInstruction = '';
  
  if (bookType === 'Fiction') {
    aiInstruction += `Focus on these Fiction elements:
1. Character consistency - personality, voice, motivations, and development across chapters
2. Plot continuity - logical story progression, cause and effect, foreshadowing payoffs
3. Timeline consistency - chronology, pacing, and time references
4. Setting and world-building consistency - locations, rules, atmosphere
5. Dialogue and voice consistency - character speech patterns, narrative voice
6. Emotional arc and tension progression throughout the story
7. Subplots and their resolution or continuation

`;
  } else {
    aiInstruction += `Focus on these Non-Fiction elements:
1. Logical flow of ideas and concepts between chapters
2. Consistency in terminology, definitions, and frameworks
3. Appropriate progression from basic to advanced concepts
4. Cross-references and callbacks that work correctly
5. Tone and voice consistency throughout
6. Examples and case studies that support the main themes
7. Chapter conclusions that lead naturally to the next chapter

`;
  }
  
  aiInstruction += `Identify specific issues:
- Plot holes or logical inconsistencies
- Character behavior that seems out of character
- Information that contradicts earlier chapters
- Abrupt transitions or missing connections
- Repetitive content or missed opportunities for callbacks

Provide actionable suggestions for improvements and highlight any continuity issues that need attention.`;
};
```

---

## 📝 **6. PUBLISHER REVIEW MODE**

### **Comprehensive Book Analysis**
```typescript
const publisherReviewPrompt = `
PUBLISHER REVIEW REQUEST

You are a professional literary editor and publisher with extensive experience in the publishing industry. Your task is to provide a comprehensive, honest, and constructive review of the following book.

BOOK INFORMATION:
Title: "${title}"
Genre: ${genre}
Target Audience: ${audience}
Summary: ${summary}

CHAPTER STRUCTURE (${chapterCount} chapters total):

${chapters.map((chapter, index) => `
CHAPTER ${index + 1}: "${chapter.title}"
Description/Outline: ${chapter.description}
Content Sample: ${chapter.content.substring(0, 500)}...
`).join('\n')}

REVIEW INSTRUCTIONS:
Please provide a thorough, honest review of this book addressing the following aspects:
1. STRENGTHS: What are the strongest elements of the story? (Characters, plot, concept, etc.)
2. WEAKNESSES: What areas need improvement? Be honest but constructive.
3. MARKET POTENTIAL: Is there a viable market for this book? What audience would it appeal to?
4. STRUCTURE: Does the chapter structure make sense? Are there pacing issues?
5. CHARACTER DEVELOPMENT: Are the characters well-developed? Are they engaging?
6. OVERALL ASSESSMENT: Give an honest overall assessment of the book's readiness for publication.

Format your response as a professional publisher's review letter. Don't hold back critical feedback - authors need honest assessment to improve their work. But remain encouraging - point out strengths alongside areas that need improvement.

PUBLISHER REVIEW:
`;
```

---

## 🎙️ **7. TTS OPTIMIZATION SYSTEM**

### **Formatting Instructions (Applied to ALL AI Responses)**
```typescript
const TTS_FORMATTING_INSTRUCTIONS = `
IMPORTANT FORMATTING INSTRUCTIONS:
1. Please provide your response in plain text without using markdown formatting like hashtags (#), asterisks (*), or other special characters, as this content may be read by a text-to-speech system.
2. Spell out all numbers (e.g., "twenty-three" instead of "23") unless they are very large numbers like millions or billions.
3. Spell out all dollar amounts (e.g., "fifty dollars" instead of "$50").
4. Spell out all degrees and percentages (e.g., "thirty-five degrees" instead of "35°", "twenty percent" instead of "20%").
5. Use "percent" instead of the % symbol.
6. Spell out all dates when possible (e.g., "January fifteenth, twenty twenty-four" instead of "January 15, 2024").
7. Do not use asterisks (*) or hashtags (#) anywhere in your response.
`;
```

### **Audio-Specific Content Rules**
- **No Markdown**: Never use #, ##, ###, *, _, or any markdown symbols
- **Plain Text Only**: All headings and sections in plain text
- **Number Formatting**: All numbers spelled out (except millions/billions)
- **Symbol Avoidance**: No %, $, °, or special characters
- **Date Formatting**: "January fifteenth, twenty twenty-four"
- **TTS-Friendly Structure**: Natural reading flow for audio consumption

---

## 🔀 **8. AI MODE SWITCHER**

### **Context Modes**
```typescript
export enum AIContextMode {
  CHAPTER = 'chapter',    // AI focuses on current chapter only
  FULL_BOOK = 'full_book' // AI has access to entire book context
}
```

### **Context Building**
```typescript
const buildAIContext = () => {
  let context = '';
  
  // Always include book metadata
  context += `Book Metadata:
Title: ${currentBook.title}
Genre: ${currentBook.genre}
Target Audience: ${currentBook.targetAudience}
Summary: ${currentBook.summary}

`;

  if (contextMode === AIContextMode.CHAPTER && chapterId) {
    // Chapter-only context
    const currentChapter = currentBook.chapters?.find(ch => ch.id === chapterId);
    context += `Currently focused on: Chapter ${currentChapter.order}: ${currentChapter.title}

===== CHAPTER ${currentChapter.order}: ${currentChapter.title} =====
OUTLINE: ${currentChapter.description}
CONTENT: ${currentChapter.content}
`;
  } else {
    // Full book context
    context += `Currently focused on: ${chapterId ? `Chapter ${currentChapter.order}: ${currentChapter.title}` : 'General book discussion'}

`;
    
    currentBook.chapters?.forEach((chapter, index) => {
      context += `===== CHAPTER ${index + 1}: ${chapter.title} =====
OUTLINE: ${chapter.description}
CONTENT: ${chapter.content}

`;
    });
  }
  
  return context;
};
```

---

## 🎨 **9. UI COMPONENTS SPECIFICATION**

### **Progressive Writing Buttons**
```tsx
// Button Layout
<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
  <button
    onClick={handleStartChapter}
    disabled={isGeneratingText || isLoading}
    style={{
      backgroundColor: '#10b981', // Green
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      padding: '8px 12px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: isGeneratingText || isLoading ? 'not-allowed' : 'pointer',
      opacity: isGeneratingText || isLoading ? 0.6 : 1,
      transition: 'all 0.2s ease'
    }}
  >
    {progress.isEmpty ? 'Begin Chapter' : 'Continue Writing'}
  </button>
  
  <button
    onClick={handleWrapUpChapter}
    disabled={isGeneratingText || isLoading}
    style={{
      backgroundColor: '#f59e0b', // Orange
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      padding: '8px 12px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: isGeneratingText || isLoading ? 'not-allowed' : 'pointer',
      opacity: isGeneratingText || isLoading ? 0.6 : 1,
      transition: 'all 0.2s ease'
    }}
  >
    Wrap Up Chapter
  </button>
</div>
```

### **AI Mode Switcher Component**
```tsx
<AIModeSwitcher
  currentMode={contextMode}
  onModeChange={setContextMode}
  disabled={isLoading}
/>
```

### **Prompt Type Selector**
```tsx
<select
  value={selectedPromptType}
  onChange={(e) => setSelectedPromptType(e.target.value as AIPromptType)}
>
  <option value={AIPromptType.GENERAL}>General Writing Help</option>
  <option value={AIPromptType.CHAPTER_IDEA}>Chapter Ideas</option>
  <option value={AIPromptType.PLOT_DEVELOPMENT}>Plot Development</option>
  <option value={AIPromptType.CHARACTER_DEVELOPMENT}>Character Development</option>
  <option value={AIPromptType.STYLE_IMPROVEMENT}>Style Improvement</option>
</select>
```

---

## 🔧 **10. TECHNICAL IMPLEMENTATION**

### **API Integration**
- **Backend**: AWS Lambda functions (to be replaced with Vercel Edge Functions)
- **Database**: DynamoDB (to be replaced with Supabase)
- **AI Provider**: Anthropic Claude 3.5 Sonnet
- **Message Format**: Standard Claude conversation format
- **Context Management**: Smart truncation for token limits

### **Error Handling**
- **Rate Limiting**: Built-in retry logic with exponential backoff
- **Token Limits**: Automatic context optimization when exceeded
- **API Failures**: Graceful error messages with retry options
- **Conversation Recovery**: Ability to continue interrupted conversations

### **Performance Features**
- **Conversation Persistence**: All messages saved and retrievable
- **Context Caching**: Optimized context building for repeated requests
- **Smart Loading**: Progressive loading of conversation history
- **Real-time Updates**: Live conversation updates in UI

---

## 📝 **11. SUGGESTED QUESTIONS (QUICK PROMPTS)**

### **Outline Assistant Quick Prompts**
```typescript
const suggestedQuestions = [
  "What's the main message of this chapter?",
  "Can you summarize this chapter for me?",
  "What are the key takeaways from this chapter?",
  "How does this chapter connect to the previous one?",
  // If chapters exist:
  "Help me write a summary for chapter N",
  "What should happen in the next chapter after 'LAST_CHAPTER_TITLE'?",
  "Create an outline for my next chapter based on the previous chapters",
  "What character development should I focus on in the upcoming chapter?"
];
```

---

## 🎯 **12. BRAND IDENTITY**

### **AI Assistant Personality**
```typescript
const systemPrompt = `You are Biglio, an AI writing assistant for books. Never say you are Claude, Anthropic, or any other company. If asked your name, always say: I am Biglio, your AI writing assistant. If asked who made you, say: I am part of the Biglio platform. Never mention Anthropic or Claude, even if asked directly. Always say you are Biglio.`;
```

---

## ✅ **MIGRATION CHECKLIST**

### **Phase 1: Core Infrastructure (Week 1)**
- [ ] Create new `AIContext` with all functions
- [ ] Implement `AIPromptType` enum and `generatePrompt` function
- [ ] Build progressive writing buttons (Start/Continue/Wrap Up)
- [ ] Add TTS formatting to all AI responses
- [ ] Create AI mode switcher (Chapter/Full Book)

### **Phase 2: Advanced Features (Week 2)**
- [ ] Implement outline generation system (Fiction/Non-Fiction)
- [ ] Add improvement prompts and tools
- [ ] Build publisher review mode
- [ ] Create continuity analysis system
- [ ] Implement text insertion capabilities

### **Phase 3: UI & Polish (Week 3)**
- [ ] Build comprehensive AI component library
- [ ] Add suggested questions/quick prompts
- [ ] Implement conversation persistence
- [ ] Add error handling and retry logic
- [ ] Performance optimization and testing

---

**This specification contains EVERY detail needed to rebuild the complete AI system. Each prompt, function, and feature is documented exactly as it existed in the original system.**

**Next Step:** Follow the step-by-step implementation plan to build these features systematically.