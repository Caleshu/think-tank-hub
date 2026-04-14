
-- Drop existing manually-created tables (order matters due to FK constraints)
DROP TABLE IF EXISTS public.ratings CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.debates CASCADE;

-- debates
CREATE TABLE public.debates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  topic_title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','reading','active','ended')),
  for_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  against_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  for_argument TEXT,
  against_argument TEXT,
  for_ready BOOLEAN NOT NULL DEFAULT false,
  against_ready BOOLEAN NOT NULL DEFAULT false,
  for_vote TEXT,
  against_vote TEXT,
  timer_end TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  ended_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.debates ENABLE ROW LEVEL SECURITY;

-- Public readable so matchmaking query works across users (User B must see User A's waiting debate)
CREATE POLICY "Debates are publicly readable" ON public.debates FOR SELECT USING (true);

-- Any authenticated user can create a debate
CREATE POLICY "Authenticated users can create debates" ON public.debates
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Participants can update; also allows claiming an empty slot (for matchmaking join)
CREATE POLICY "Participants can update debates" ON public.debates
  FOR UPDATE USING (
    auth.uid() = for_user_id
    OR auth.uid() = against_user_id
    OR for_user_id IS NULL
    OR against_user_id IS NULL
  );

-- messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debate_id UUID NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages publicly readable" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Authenticated users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ratings
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debate_id UUID NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rated_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  made_me_think INTEGER NOT NULL DEFAULT 3 CHECK (made_me_think BETWEEN 1 AND 5),
  respectful INTEGER NOT NULL DEFAULT 3 CHECK (respectful BETWEEN 1 AND 5),
  engaged_argument INTEGER NOT NULL DEFAULT 3 CHECK (engaged_argument BETWEEN 1 AND 5),
  mind_changed TEXT NOT NULL DEFAULT 'no' CHECK (mind_changed IN ('no','partial','yes')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own ratings" ON public.ratings
  FOR INSERT WITH CHECK (auth.uid() = rater_id);
CREATE POLICY "Ratings publicly readable" ON public.ratings FOR SELECT USING (true);

-- Enable Realtime for live debate sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.debates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
