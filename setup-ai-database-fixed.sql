-- AI System Database Setup (FIXED VERSION)
-- Run this in your Supabase SQL Editor
-- This version makes biglio_id and chapter_id optional to avoid errors

-- Create ai_conversations table for chat history
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  biglio_id UUID, -- Made optional for now - will add constraint later
  chapter_id UUID, -- Made optional for now - will add constraint later  
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_messages table for individual messages
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_outlines table for generated outlines
CREATE TABLE IF NOT EXISTS ai_outlines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  biglio_id UUID, -- Made optional for now - will add constraint later
  title TEXT NOT NULL,
  genre TEXT,
  target_audience TEXT,
  outline_data JSONB NOT NULL, -- Stores the structured outline
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security)
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_outlines ENABLE ROW LEVEL SECURITY;

-- Policies for ai_conversations
CREATE POLICY "Users can view own conversations" ON ai_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON ai_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON ai_conversations
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for ai_messages
CREATE POLICY "Users can view messages in own conversations" ON ai_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ai_conversations 
      WHERE ai_conversations.id = ai_messages.conversation_id 
      AND ai_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations" ON ai_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations 
      WHERE ai_conversations.id = ai_messages.conversation_id 
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- Policies for ai_outlines
CREATE POLICY "Users can view own outlines" ON ai_outlines
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own outlines" ON ai_outlines
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own outlines" ON ai_outlines
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_biglio_id ON ai_conversations(biglio_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_outlines_user_id ON ai_outlines(user_id);

-- Update timestamp triggers (assumes update_updated_at_column function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_ai_conversations_updated_at 
        BEFORE UPDATE ON ai_conversations 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
        
    CREATE TRIGGER update_ai_outlines_updated_at 
        BEFORE UPDATE ON ai_outlines 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

SELECT 'AI system tables created successfully!' as message;