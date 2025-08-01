-- AI System Database Setup (MINIMAL VERSION)
-- This version creates tables without ANY foreign key references
-- Copy and paste THIS ENTIRE CONTENT into Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_outlines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  genre TEXT,
  target_audience TEXT,
  outline_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_outlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations" ON ai_conversations FOR ALL USING (true);
CREATE POLICY "Users can manage own messages" ON ai_messages FOR ALL USING (true);
CREATE POLICY "Users can manage own outlines" ON ai_outlines FOR ALL USING (true);

SELECT 'AI tables created successfully!' as message;