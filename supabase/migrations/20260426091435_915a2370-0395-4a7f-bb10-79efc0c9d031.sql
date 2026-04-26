-- 1) ANNOUNCEMENT EVENTS (delivered/opened/clicked)
CREATE TABLE IF NOT EXISTS public.announcement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('delivered','opened','clicked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_ann_events_ann ON public.announcement_events(announcement_id);
CREATE INDEX IF NOT EXISTS idx_ann_events_user ON public.announcement_events(user_id);

ALTER TABLE public.announcement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can record own announcement events"
  ON public.announcement_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own announcement events"
  ON public.announcement_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all announcement events"
  ON public.announcement_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_events;

-- 2) SUPPORT CHATS
CREATE TABLE IF NOT EXISTS public.support_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unread_for_user INT NOT NULL DEFAULT 0,
  unread_for_admin INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own chat"
  ON public.support_chats FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own chat"
  ON public.support_chats FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own chat"
  ON public.support_chats FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all chats"
  ON public.support_chats FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chats;

-- 3) SUPPORT MESSAGES
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.support_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user','support')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_messages_chat ON public.support_messages(chat_id, created_at);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view messages in own chat"
  ON public.support_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_chats c
                 WHERE c.id = chat_id AND c.user_id = auth.uid()));

CREATE POLICY "Users send messages in own chat"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'user'
    AND EXISTS (SELECT 1 FROM public.support_chats c
                WHERE c.id = chat_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Admins manage all messages"
  ON public.support_messages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- Trigger to bump chat updated_at + last_message_at + unread counters
CREATE OR REPLACE FUNCTION public.support_message_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_chats
  SET last_message_at = now(),
      updated_at = now(),
      unread_for_user = CASE WHEN NEW.sender_role = 'support' THEN unread_for_user + 1 ELSE unread_for_user END,
      unread_for_admin = CASE WHEN NEW.sender_role = 'user' THEN unread_for_admin + 1 ELSE unread_for_admin END
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_msg_after_insert ON public.support_messages;
CREATE TRIGGER trg_support_msg_after_insert
  AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.support_message_after_insert();

-- 4) Allow users to delete their own review + admins to delete review reactions
CREATE POLICY "Users delete own review"
  ON public.app_reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins delete review reactions"
  ON public.review_reactions FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));